
import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { FileText, Upload, Check, AlertCircle, Download, RefreshCw, Zap } from "lucide-react";
import { downloadExcelFile, Transaction, extractTextFromPdf, prepareExtractedTextForAI } from "@/utils/fileConverter";
import { parseTransactionsWithAI } from "@/utils/aiParser";
import TransactionTable from "@/components/TransactionTable";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import PricingPlans from "@/components/PricingPlans";

const FREE_PAGE_LIMIT = 1;

export const UserUpload: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [isConverted, setIsConverted] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
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
      
      // Admins can upload any number of pages
      if (isAdmin) {
        // Skip page limit checks for admins
      }
      // Non-admins with more than FREE_PAGE_LIMIT pages need a subscription
      else if (numPages > FREE_PAGE_LIMIT) {
        // Check if user has a paid subscription
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('plan_type, status')
          .eq('user_id', user?.id || '')
          .eq('status', 'active')
          .single();
          
        if (!subscription || subscription.plan_type === 'free') {
          setPricingDialogOpen(true);
          setIsConverting(false);
          return;
        }
      }
      
      toast({
        title: "AI Processing",
        description: `Sending to AI for analysis...`,
      });
      
      // Text extraction approach
      const extractedItems = await extractTextFromPdf(file);
      const extractedText = prepareExtractedTextForAI(extractedItems);
      console.log("Extracted text from PDF, total pages:", extractedText.length);
      
      // Use AI parsing with the extracted text
      const aiExtractedTransactions = await parseTransactionsWithAI(extractedText, false);
      
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
  }, [file, toast, user, isAdmin]);

  const handleDownload = useCallback(async () => {
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

              <div
                className={`
                  border-2 border-dashed rounded-xl p-8 transition-all duration-300 h-[300px] flex flex-col items-center justify-center text-center
                  ${isDragging ? "border-primary bg-primary/5" : "border-gray-200"}
                  ${isConverted ? "border-green-500 bg-green-50/50" : ""}
                  ${error ? "border-red-300 bg-red-50/10" : ""}
                `}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="w-16 h-16 mb-4 rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center text-purple-600">
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
                
                <h3 className="text-xl font-semibold mb-2">
                  {isConverted 
                    ? "Conversion Complete" 
                    : error
                      ? "Conversion Failed"
                      : file 
                        ? file.name
                        : "Drop PDF Statement Here"
                  }
                </h3>
                
                <p className="text-sm text-gray-500 mb-6">
                  {isConverted 
                    ? `${transactions.length} transactions extracted` 
                    : error
                      ? "Please try again with a different file"
                      : file 
                        ? "Ready to process with AI"
                        : "or click to browse files"
                  }
                </p>
                
                {!isAdmin && !isConverted && !error && (
                  <p className="text-xs text-gray-400 mb-4">
                    Free tier: Process up to {FREE_PAGE_LIMIT} page. For larger documents, please subscribe.
                  </p>
                )}
                
                {!file && !isConverted && !error && (
                  <div className="relative">
                    <Button 
                      variant="outline" 
                      className="px-6"
                    >
                      Select PDF
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
                    className="relative bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                  >
                    {isConverting ? "Processing..." : "Convert with AI"}
                    {isConverting && (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      </span>
                    )}
                  </Button>
                )}
                
                {isConverted && (
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button 
                      className="bg-green-500 hover:bg-green-600"
                      onClick={handleDownload}
                      size="sm"
                    >
                      <Download className="h-4 w-4 mr-1" /> Download Excel
                    </Button>
                    <Button 
                      variant="outline"
                      size="sm" 
                      onClick={() => {
                        setFile(null);
                        setIsConverted(false);
                        setTransactions([]);
                        setError(null);
                      }}
                    >
                      <RefreshCw className="h-4 w-4 mr-1" /> New Conversion
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
    </div>
  );
};
