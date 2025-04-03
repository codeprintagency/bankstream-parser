
import React, { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Upload, FileText, Check, AlertCircle, Zap, Bug } from "lucide-react";
import { downloadExcelFile, Transaction, extractTextFromPdf, prepareExtractedTextForAI } from "@/utils/fileConverter";
import { parseTransactionsWithAI } from "@/utils/aiParser";
import TransactionTable from "./TransactionTable";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import DebugModal from "./DebugModal";
import { Badge } from "@/components/ui/badge";
import PricingPlans from "./PricingPlans";
import { Dialog, DialogContent } from "@/components/ui/dialog";

const FREE_PAGE_LIMIT = 1;

const FileUpload: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [isConverted, setIsConverted] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [directPdfUpload, setDirectPdfUpload] = useState(false);
  const [debugModalOpen, setDebugModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pricingDialogOpen, setPricingDialogOpen] = useState(false);
  const [pageCount, setPageCount] = useState(0);
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

  const checkPageCount = async (file: File): Promise<number> => {
    try {
      const extractedItems = await extractTextFromPdf(file);
      return extractedItems.length;
    } catch (error) {
      console.error("Failed to count pages:", error);
      return 0;
    }
  };

  const handleConvert = useCallback(async () => {
    if (!file) return;
    
    setIsConverting(true);
    setError(null);
    
    try {
      // Check page count
      const numPages = await checkPageCount(file);
      setPageCount(numPages);
      
      if (numPages > FREE_PAGE_LIMIT) {
        setPricingDialogOpen(true);
        setIsConverting(false);
        return;
      }
      
      toast({
        title: "AI Processing",
        description: `Sending to AI for analysis${directPdfUpload ? " using direct PDF upload" : " using text extraction"}...`,
      });
      
      let aiExtractedTransactions;
      
      if (directPdfUpload) {
        // Direct PDF upload approach - send the raw PDF data
        const arrayBuffer = await file.arrayBuffer();
        console.log("Using direct PDF upload method, file size:", arrayBuffer.byteLength);
        
        // Use AI parsing with the raw PDF data
        aiExtractedTransactions = await parseTransactionsWithAI(arrayBuffer);
      } else {
        // Text extraction approach
        console.log("Using text extraction method");
        const extractedItems = await extractTextFromPdf(file);
        const extractedText = prepareExtractedTextForAI(extractedItems);
        console.log("Extracted text from PDF, total pages:", extractedText.length);
        
        // Use AI parsing with the extracted text
        aiExtractedTransactions = await parseTransactionsWithAI(extractedText, false);
      }
      
      setTransactions(aiExtractedTransactions);
      
      toast({
        title: "AI Conversion Successful",
        description: `${aiExtractedTransactions.length} transactions have been extracted from your statement`,
      });
      
      setIsConverted(true);
    } catch (error: any) {
      console.error("Conversion error:", error);
      setError(error.message || "Unknown error occurred");
      
      toast({
        title: "Conversion Failed",
        description: error.message || "There was an error converting your file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsConverting(false);
    }
  }, [file, toast, directPdfUpload]);

  const handleDownload = useCallback(() => {
    if (transactions.length === 0) return;
    
    try {
      // Generate and download the Excel file
      import("@/utils/excel/excelExporter").then(({ generateExcelFile }) => {
        const excelData = generateExcelFile(transactions);
        downloadExcelFile(excelData, `bank-statement-${new Date().toISOString().slice(0, 10)}.xlsx`);
        
        toast({
          title: "Download Started",
          description: "Your Excel file is being downloaded",
        });
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
        <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:items-center sm:justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Badge variant="outline" className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-3 py-1">
              AI Powered
            </Badge>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-2">
              <Switch 
                id="pdf-upload-mode" 
                checked={directPdfUpload} 
                onCheckedChange={setDirectPdfUpload} 
                disabled={isConverting}
              />
              <Label htmlFor="pdf-upload-mode" className="flex items-center">
                <span>Direct PDF Upload</span>
                {directPdfUpload && <FileText className="w-4 h-4 ml-1 text-blue-500" />}
              </Label>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDebugModalOpen(true)}
              className="flex items-center gap-1"
            >
              <Bug className="w-4 h-4" />
              <span>Debug</span>
            </Button>
          </div>
        </div>
        
        {error && (
          <div className="mb-4 p-4 border border-red-300 bg-red-50 rounded-md text-red-800 flex items-start">
            <AlertCircle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold">Error</p>
              <p className="text-sm">{error}</p>
              <Button 
                variant="outline" 
                size="sm"
                className="mt-2 text-red-800 border-red-300 hover:bg-red-100"
                onClick={() => setDebugModalOpen(true)}
              >
                View Debug Info
              </Button>
            </div>
          </div>
        )}
        
        <div
          className={`
            border-2 border-dashed rounded-2xl p-8 md:p-12 transition-all duration-300
            ${isDragging ? "border-primary bg-primary/5" : "border-gray-200 bg-white/50"}
            ${isConverted ? "border-green-500 bg-green-50/50" : ""}
            ${error ? "border-red-300 bg-red-50/10" : ""}
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
              ? `${transactions.length} transactions have been extracted from your statement using AI` 
              : error
                ? "An error occurred while processing your file. Check the debug information."
                : file 
                  ? `Selected file: ${file.name} (${directPdfUpload ? "Direct PDF Upload" : "Text Extraction"})`
                  : "Drag and drop your PDF bank statement here, or click to browse files"
            }
          </p>
          
          <p className="text-xs text-muted-foreground mb-4">
            Free tier: Process up to {FREE_PAGE_LIMIT} page only. For larger documents, please subscribe.
          </p>
          
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
              {isConverting ? "Processing with AI..." : 
                (directPdfUpload ? "Analyze with Direct PDF Upload" : "Analyze with Text Extraction")}
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
                  setError(null);
                }}
              >
                Convert Another File
              </Button>
            </div>
          )}
          
          {error && (
            <Button 
              variant="outline" 
              onClick={() => {
                setError(null);
              }}
            >
              Try Again
            </Button>
          )}
        </div>
        
        {isConverted && transactions.length > 0 && (
          <TransactionTable transactions={transactions} />
        )}
        
        <div className="mt-4 flex items-center justify-center text-xs text-muted-foreground">
          <AlertCircle className="w-3 h-3 mr-1" />
          <span>Bank statements are processed securely with AI and never stored on our servers</span>
        </div>
      </div>
      
      {/* Debug Modal */}
      <DebugModal open={debugModalOpen} onOpenChange={setDebugModalOpen} />
      
      {/* Pricing Plans Dialog */}
      <Dialog open={pricingDialogOpen} onOpenChange={setPricingDialogOpen}>
        <DialogContent className="sm:max-w-4xl">
          <div className="py-4">
            <h2 className="text-2xl font-bold text-center mb-6">
              Your document has {pageCount} pages
            </h2>
            <p className="text-center mb-8">
              The free tier supports only {FREE_PAGE_LIMIT} page. Please subscribe to a plan to process larger documents.
            </p>
            <PricingPlans onSelectPlan={() => setPricingDialogOpen(false)} />
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default FileUpload;
