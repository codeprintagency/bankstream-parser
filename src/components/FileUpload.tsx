import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Upload, FileText, Check, AlertCircle } from "lucide-react";
import { convertPdfToExcel, generateExcelFile, downloadExcelFile, Transaction } from "@/utils/fileConverter";

const FileUpload: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [isConverted, setIsConverted] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const { toast } = useToast();

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === "application/pdf") {
      setFile(droppedFile);
    } else {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF file",
        variant: "destructive",
      });
    }
  }, [toast]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === "application/pdf") {
      setFile(selectedFile);
    } else {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF file",
        variant: "destructive",
      });
    }
  }, [toast]);

  const handleConvert = useCallback(async () => {
    if (!file) return;
    
    setIsConverting(true);
    
    try {
      // Use the actual conversion function
      const extractedTransactions = await convertPdfToExcel(file);
      setTransactions(extractedTransactions);
      setIsConverted(true);
      
      toast({
        title: "Conversion Successful",
        description: "Your bank statement has been converted to Excel format",
      });
    } catch (error) {
      console.error("Conversion error:", error);
      toast({
        title: "Conversion Failed",
        description: "There was an error converting your file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsConverting(false);
    }
  }, [file, toast]);

  const handleDownload = useCallback(() => {
    if (transactions.length === 0) return;
    
    try {
      // Generate and download the Excel file
      const excelData = generateExcelFile(transactions);
      downloadExcelFile(excelData, `bank-statement-${new Date().toISOString().slice(0, 10)}.xlsx`);
      
      toast({
        title: "Download Started",
        description: "Your Excel file is being downloaded",
      });
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: "Download Failed",
        description: "There was an error downloading your file. Please try again.",
        variant: "destructive",
      });
    }
  }, [transactions, toast]);

  return (
    <section id="file-upload-section" className="container mx-auto px-4 md:px-8 py-16 md:py-24">
      <div className="max-w-4xl mx-auto">
        <div
          className={`
            border-2 border-dashed rounded-2xl p-8 md:p-12 transition-all duration-300
            ${isDragging ? "border-primary bg-primary/5" : "border-gray-200 bg-white/50"}
            ${isConverted ? "border-green-500 bg-green-50/50" : ""}
            glass-card backdrop-blur-sm flex flex-col items-center text-center
            animate-scale-in
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="w-16 h-16 mb-6 rounded-full bg-primary/10 flex items-center justify-center text-primary animate-float">
            {isConverted ? (
              <Check className="w-8 h-8 text-green-500" />
            ) : file ? (
              <FileText className="w-8 h-8" />
            ) : (
              <Upload className="w-8 h-8" />
            )}
          </div>
          
          <h2 className="text-2xl md:text-3xl font-semibold mb-3">
            {isConverted 
              ? "Conversion Complete" 
              : file 
                ? "Ready to Convert" 
                : "Upload Your Bank Statement"
            }
          </h2>
          
          <p className="text-muted-foreground mb-6 max-w-lg">
            {isConverted 
              ? "Your bank statement has been successfully converted to Excel format." 
              : file 
                ? `Selected file: ${file.name}` 
                : "Drag and drop your PDF bank statement here, or click to browse files"
            }
          </p>
          
          {!file && !isConverted && (
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
          
          {file && !isConverted && (
            <Button 
              onClick={handleConvert} 
              disabled={isConverting}
              className="relative"
            >
              {isConverting ? "Converting..." : "Convert to Excel"}
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
                onClick={() => {
                  setFile(null);
                  setIsConverted(false);
                  setTransactions([]);
                }}
              >
                Convert Another File
              </Button>
            </div>
          )}
        </div>
        
        <div className="mt-4 flex items-center justify-center text-xs text-muted-foreground">
          <AlertCircle className="w-3 h-3 mr-1" />
          <span>Bank statements are processed securely and never stored on our servers</span>
        </div>
      </div>
    </section>
  );
};

export default FileUpload;
