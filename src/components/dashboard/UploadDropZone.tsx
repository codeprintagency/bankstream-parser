
import React from "react";
import { Button } from "@/components/ui/button";
import { FileText, Upload, Check, AlertCircle } from "lucide-react";
import { FREE_PAGE_LIMIT } from "@/hooks/useConversion";
import { useAuth } from "@/contexts/AuthContext";

interface UploadDropZoneProps {
  file: File | null;
  isDragging: boolean;
  isConverting: boolean;
  isConverted: boolean;
  error: string | null;
  transactionCount: number;
  handleDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  handleDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
  handleDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleConvert: () => void;
  handleDownload: () => void;
  handleReset: () => void;
  handleTryAgain: () => void;
  className?: string;
}

const UploadDropZone: React.FC<UploadDropZoneProps> = ({
  file,
  isDragging,
  isConverting,
  isConverted,
  error,
  transactionCount,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  handleFileChange,
  handleConvert,
  handleDownload,
  handleReset,
  handleTryAgain,
  className = ""
}) => {
  const { user, isAdmin } = useAuth();

  return (
    <div
      className={`
        border-2 border-dashed rounded-2xl p-8 md:p-12 transition-all duration-300
        ${isDragging ? "border-primary bg-primary/5" : "border-gray-200 bg-white/50"}
        ${isConverted ? "border-green-500 bg-green-50/50" : ""}
        ${error ? "border-red-300 bg-red-50/10" : ""}
        glass-card backdrop-blur-sm flex flex-col items-center text-center
        animate-scale-in ${className}
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="w-16 h-16 mb-6 rounded-full bg-primary/10 flex items-center justify-center text-primary animate-float">
        {isConverted ? (
          <Check className="w-8 h-8 text-green-500" />
        ) : error ? (
          <AlertCircle className="w-8 h-8 text-red-500" />
        ) : file ? (
          <FileText className="w-8 h-8" />
        ) : (
          <Upload className="w-8 h-8" />
        )}
      </div>
      
      <h2 className="text-2xl md:text-3xl font-semibold mb-3">
        {isConverted 
          ? "AI Conversion Complete" 
          : error
            ? "Conversion Failed"
            : file 
              ? "Ready for AI Analysis" 
              : "Upload Your Bank Statement"
        }
      </h2>
      
      <p className="text-muted-foreground mb-6 max-w-lg">
        {isConverted 
          ? `${transactionCount} transactions have been extracted from your statement using AI` 
          : error
            ? "An error occurred while processing your file. Try again with a different file."
            : file 
              ? `Selected file: ${file.name}`
              : "Drag and drop your PDF bank statement here, or click to browse files"
        }
      </p>
      
      {!isAdmin && !file && !isConverted && !error && (
        <p className="text-xs text-muted-foreground mb-4">
          {user ? `Free tier: Process up to ${FREE_PAGE_LIMIT} page only. For larger documents, please subscribe.` : 'Please sign in to process your documents.'}
        </p>
      )}
      
      {isAdmin && !file && !isConverted && !error && (
        <p className="text-xs text-muted-foreground mb-4">
          Admin mode: No page limit restrictions.
        </p>
      )}
      
      {!file && !isConverted && !error && (
        <div className="relative">
          <Button 
            variant="outline" 
            className="relative z-10 glass-card hover:bg-white/80"
          >
            Choose File
            <input
              type="file"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={handleFileChange}
              accept=".pdf"
            />
          </Button>
        </div>
      )}
      
      {file && !isConverted && !error && (
        <Button 
          onClick={handleConvert} 
          disabled={isConverting}
          className="relative bg-purple-600 hover:bg-purple-700"
        >
          {isConverting ? "Processing with AI..." : "Analyze with AI"}
          {isConverting && (
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            </span>
          )}
        </Button>
      )}
      
      {isConverted && (
        <div className="flex flex-col sm:flex-row gap-4">
          <Button 
            className="bg-green-500 hover:bg-green-600"
            onClick={handleDownload}
          >
            Download Excel File
          </Button>
          <Button 
            variant="outline" 
            onClick={handleReset}
          >
            Convert Another File
          </Button>
        </div>
      )}
      
      {error && (
        <Button 
          variant="outline" 
          onClick={handleTryAgain}
        >
          Try Again
        </Button>
      )}
    </div>
  );
};

export default UploadDropZone;
