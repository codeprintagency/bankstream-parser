
import React, { useState } from "react";
import { AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Zap } from "lucide-react";
import TransactionTable from "@/components/TransactionTable";
import { useFileUpload } from "@/hooks/useFileUpload";
import { useConversion } from "@/hooks/useConversion";
import { useAuth } from "@/contexts/AuthContext";
import UploadDropZone from "./UploadDropZone";
import PricingDialog from "./PricingDialog";

export const UserUpload: React.FC = () => {
  const { isAdmin } = useAuth();
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
    <div className="max-w-4xl mx-auto">
      <Card className="border-none shadow-xl bg-white/90 backdrop-blur-sm overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-purple-500 via-blue-500 to-indigo-500"></div>
        <CardContent className="p-0">
          <div className="flex flex-col md:flex-row">
            {/* Left side: Upload area */}
            <div className="w-full p-8 md:border-r border-gray-100">
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-purple-500" />
                  <h3 className="font-semibold text-lg">Convert Statement</h3>
                </div>
                
                <div className="flex items-center">
                  {isAdmin && (
                    <Badge variant="outline" className="bg-red-500 text-white">
                      Admin
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
                handleDownload={() => handleDownload(false)}
                handleReset={handleReset}
                handleTryAgain={handleTryAgain}
                className="h-[300px]"
              />
              
              <div className="mt-4 flex items-center justify-center">
                <span className="text-xs text-gray-400 flex items-center">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Your data is processed securely and never stored
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {isConverted && transactions.length > 0 && (
        <div className="mt-8">
          <TransactionTable transactions={transactions} />
        </div>
      )}

      {/* Pricing Plans Dialog */}
      <PricingDialog 
        open={pricingDialogOpen} 
        onOpenChange={setPricingDialogOpen}
        pageCount={pageCount}
      />
    </div>
  );
};
