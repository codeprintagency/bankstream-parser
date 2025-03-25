
import React, { useState } from 'react';
import { toast } from "@/hooks/use-toast";
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { Button } from "@/components/ui/button";

interface FileUploadProps {
  setExtractionProgress?: (progress: number) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ setExtractionProgress = () => {} }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStep, setUploadStep] = useState<'idle' | 'upload' | 'processing' | 'complete' | 'error'>('idle');
  const navigate = useNavigate();

  // Function to upload file via the proxy server
  const uploadFileToClaudeProxy = async (file: File, apiKey: string, onProgress?: (progress: number) => void) => {
    // Create FormData with the file
    const formData = new FormData();
    formData.append('file', file);
    formData.append('purpose', 'attachments');

    // Set up the request
    const url = '/api/claude/v1/files';
    
    try {
      // Make the request to our proxy server
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to upload file: ${errorData.error?.message || response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error uploading file to Claude:', error);
      throw error;
    }
  };

  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setSelectedFile(file);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop, 
    multiple: false,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    }
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setExtractionProgress(0);

    try {
      // Get the API key from localStorage
      const apiKey = localStorage.getItem('claude-api-key') || '';
      if (!apiKey) {
        toast({
          title: "API Key Missing",
          description: "Please enter your Claude API key in the settings",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }

      if (!selectedFile) {
        toast({
          title: "File Missing",
          description: "Please select a file first",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }

      // Create a toast notification for the upload process
      toast({
        title: "Processing",
        description: "Uploading file to Claude...",
      });
      setUploadStep('upload');

      // Upload the file to Claude via our proxy server
      const fileUploadResponse = await uploadFileToClaudeProxy(selectedFile, apiKey, (progress) => {
        setUploadProgress(progress);
      });

      if (!fileUploadResponse.id) {
        throw new Error('Failed to upload file: No file ID received');
      }

      toast({
        title: "Success",
        description: "File uploaded successfully!",
      });
      setUploadStep('processing');
      const fileId = fileUploadResponse.id;
      
      // Now use the file ID to send to Claude for processing
      const aiResponse = await fetch('/api/claude/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: "claude-3-opus-20240229",
          max_tokens: 4000,
          system: "You are a financial assistant specializing in extracting transaction data from bank statements. Extract all transactions with their date, description, and amount. Format your response as a JSON array with objects having date, description, and amount fields.",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text", 
                  text: "Here's my bank statement. Please extract all transactions with their date, description, and amount. Format your response as a JSON array."
                },
                {
                  type: "file_attachment",
                  file_id: fileId
                }
              ]
            }
          ]
        })
      });

      if (!aiResponse.ok) {
        const errorData = await aiResponse.json();
        throw new Error(`Failed to process file: ${errorData.error?.message || aiResponse.statusText}`);
      }

      const aiResponseData = await aiResponse.json();
      const extractedContent = aiResponseData.content[0].text;
      
      // Parse the JSON response
      const jsonMatch = extractedContent.match(/\[\s*\{.*\}\s*\]/s);
      if (!jsonMatch) {
        throw new Error('Failed to extract JSON data from Claude response');
      }
      
      try {
        const transactionsData = JSON.parse(jsonMatch[0]);
        
        // Store transactions in localStorage
        localStorage.setItem('transactions', JSON.stringify(transactionsData));
        
        // Update processing state
        setUploadStep('complete');
        toast({
          title: "Extraction Complete", 
          description: `Successfully extracted ${transactionsData.length} transactions`
        });
        
        // Navigate to preview page
        navigate('/preview');
      } catch (parseError) {
        console.error('Error parsing JSON:', parseError);
        throw new Error('Failed to parse transaction data');
      }
      
    } catch (error) {
      console.error('Error processing file:', error);
      toast({
        title: "Error",
        description: `Error processing file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
      setUploadStep('error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <form onSubmit={handleSubmit} className="w-full max-w-md p-6 border rounded-lg shadow-sm">
        <div 
          {...getRootProps()} 
          className={`border-2 border-dashed rounded-lg p-8 mb-4 text-center cursor-pointer ${
            isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary'
          }`}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="rounded-full bg-primary/10 p-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"></path>
                <path d="M12 12v9"></path>
                <path d="m16 16-4-4-4 4"></path>
              </svg>
            </div>
            <h3 className="text-lg font-medium">Drag and drop your file here</h3>
            <p className="text-sm text-muted-foreground">
              or click to browse
            </p>
            <p className="text-xs text-muted-foreground">
              Support for PDF or DOCX files
            </p>
          </div>
        </div>

        {selectedFile && (
          <div className="mb-4 p-3 bg-muted rounded-md">
            <p className="font-medium">Selected File:</p>
            <p className="text-sm text-muted-foreground">{selectedFile.name}</p>
            <p className="text-xs text-muted-foreground">
              {(selectedFile.size / 1024).toFixed(2)} KB
            </p>
          </div>
        )}

        <Button
          type="submit"
          disabled={!selectedFile || isLoading}
          className="w-full"
          variant="default"
        >
          {isLoading
            ? `Processing... ${uploadProgress.toFixed(0)}%`
            : 'Upload and Extract Transactions'}
        </Button>
      </form>
    </div>
  );
};

export default FileUpload;
