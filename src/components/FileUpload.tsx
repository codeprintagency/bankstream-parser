import React, { useState } from 'react';
import { toast } from "@/hooks/use-toast";
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { InboxOutlined } from '@ant-design/icons';
import { Button, Upload } from 'antd';
import ApiService from '../utils/ApiService';
import { setUploadProgress } from '../store/actions';

const { Dragger } = Upload;

interface FileUploadProps {
  setExtractionProgress: (progress: number) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ setExtractionProgress }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStep, setUploadStep] = useState<'idle' | 'upload' | 'processing' | 'complete' | 'error'>('idle');
  const dispatch = useDispatch();
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

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, multiple: false });

  const handleFileChange = (info: any) => {
    if (Array.isArray(info)) {
      return info;
    }
    return info && info.fileList;
  };

  const beforeUpload = (file: File) => {
    setSelectedFile(file);
    return false; // Prevent default upload
  };

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
      const aiResponse = await ApiService.sendPdfToClaudeWithFileId(fileId, apiKey, setExtractionProgress);
      
      if (!aiResponse) {
        throw new Error('Failed to process file: No response from Claude');
      }

      // Parse the response for transactions 
      const extractedTransactions = await ApiService.parseResponse(aiResponse, selectedFile.name, (progress) => {
        setExtractionProgress(progress);
      });

      // Update global state with the transactions
      dispatch({
        type: 'SET_TRANSACTIONS',
        payload: extractedTransactions,
      });

      // Update processing state
      setUploadStep('complete');
      toast({
        title: "Extraction Complete", 
        description: `Successfully extracted ${extractedTransactions.length} transactions`
      });
      
      // Navigate to preview page
      navigate('/preview');
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
      <form onSubmit={handleSubmit} className="w-full max-w-md">
        <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>
          <input {...getInputProps()} />
          <Dragger
            name="file"
            beforeUpload={beforeUpload}
            onChange={handleFileChange}
            showUploadList={false}
            className="dropzone-content"
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">Click or drag file to this area to upload</p>
            <p className="ant-upload-hint">
              Support for a single PDF or DOCX file.
            </p>
          </Dragger>
        </div>

        {selectedFile && (
          <div className="mt-4">
            <p>Selected File: {selectedFile.name}</p>
            <p>File Size: {(selectedFile.size / 1024).toFixed(2)} KB</p>
          </div>
        )}

        <Button
          type="primary"
          htmlType="submit"
          disabled={!selectedFile || isLoading}
          loading={isLoading}
          className="mt-6 w-full"
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
