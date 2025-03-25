
import React, { useState } from 'react';
import { toast } from "@/hooks/use-toast";
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import DropzoneArea from './DropzoneArea';
import FileInfo from './FileInfo';
import { uploadFileToClaudeProxy, processFileWithClaude } from '@/utils/claudeApi';

interface FileUploadProps {
  setExtractionProgress?: (progress: number) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ setExtractionProgress = () => {} }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStep, setUploadStep] = useState<'idle' | 'upload' | 'processing' | 'complete' | 'error'>('idle');
  const navigate = useNavigate();

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
      const fileUploadResponse = await uploadFileToClaudeProxy(selectedFile, apiKey);

      if (!fileUploadResponse.id) {
        throw new Error('Failed to upload file: No file ID received');
      }

      toast({
        title: "Success",
        description: "File uploaded successfully!",
      });
      setUploadStep('processing');
      const fileId = fileUploadResponse.id;
      
      // Process the file with Claude
      const aiResponseData = await processFileWithClaude(fileId, apiKey);
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
        <DropzoneArea onFileSelected={setSelectedFile} />

        {selectedFile && <FileInfo file={selectedFile} />}

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
