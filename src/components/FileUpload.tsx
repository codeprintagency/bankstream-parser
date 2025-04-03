
import React, { useState } from "react";
import { AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import TransactionTable from "./TransactionTable";
import { useFileUpload } from "@/hooks/useFileUpload";
import { useConversion } from "@/hooks/useConversion";
import { useAuth } from "@/contexts/AuthContext";
import UploadDropZone from "./dashboard/UploadDropZone";
import LoginDialog from "./dashboard/LoginDialog";
import PricingDialog from "./dashboard/PricingDialog";

const FileUpload: React.FC = () => {
  const { isAdmin } = useAuth();
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [pricingDialogOpen, setPricingDialogOpen] = useState(false);
  
  const {
    file,
    isDragging,
    pageCount,
    checkPageCount,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileChange,
    resetFile
  } = useFileUpload();
  
  const {
    isConverting,
    isConverted,
    transactions,
    error,
    setError,
    convertFile,
    handleDownload,
    reset: resetConversion
  } = useConversion({
    onLoginRequired: () => setLoginDialogOpen(true),
    onPricingRequired: () => setPricingDialogOpen(true)
  });

  const handleConvert = async () => {
    if (!file) return;
    const pages = await checkPageCount(file);
    convertFile(file, pages);
  };

  const handleReset = () => {
    resetFile();
    resetConversion();
  };

  const handleTryAgain = () => {
    setError(null);
  };

  return (
    <section id="file-upload-section" className="container mx-auto px-4 md:px-8 py-16 md:py-24">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:items-center sm:justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Badge variant="outline" className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-3 py-1">
              AI Powered
            </Badge>
            {isAdmin && (
              <Badge variant="outline" className="bg-red-500 text-white px-3 py-1">
                Admin Mode
              </Badge>
            )}
          </div>
        </div>
        
        <UploadDropZone
          file={file}
          isDragging={isDragging}
          isConverting={isConverting}
          isConverted={isConverted}
          error={error}
          transactionCount={transactions.length}
          handleDragOver={handleDragOver}
          handleDragLeave={handleDragLeave}
          handleDrop={handleDrop}
          handleFileChange={handleFileChange}
          handleConvert={handleConvert}
          handleDownload={() => handleDownload(true)}
          handleReset={handleReset}
          handleTryAgain={handleTryAgain}
        />
        
        {isConverted && transactions.length > 0 && (
          <TransactionTable transactions={transactions} />
        )}
        
        <div className="mt-4 flex items-center justify-center text-xs text-muted-foreground">
          <AlertCircle className="w-3 h-3 mr-1" />
          <span>Bank statements are processed securely with AI and never stored on our servers</span>
        </div>
      </div>
      
      {/* Dialogs */}
      <PricingDialog 
        open={pricingDialogOpen} 
        onOpenChange={setPricingDialogOpen}
        pageCount={pageCount}
      />
      
      <LoginDialog
        open={loginDialogOpen}
        onOpenChange={setLoginDialogOpen}
      />
    </section>
  );
};

export default FileUpload;
