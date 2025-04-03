import React, { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Upload, FileText, Check, AlertCircle, Zap } from "lucide-react";
import { downloadExcelFile, Transaction, extractTextFromPdf, prepareExtractedTextForAI } from "@/utils/fileConverter";
import { parseTransactionsWithAI } from "@/utils/aiParser";
import TransactionTable from "./TransactionTable";
import { Badge } from "@/components/ui/badge";
import PricingPlans from "./PricingPlans";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const FREE_PAGE_LIMIT = 1;

const FileUpload: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [isConverted, setIsConverted] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pricingDialogOpen, setPricingDialogOpen] = useState(false);
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
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
      // Non-admins need to be logged in for more than FREE_PAGE_LIMIT pages
      else if (numPages > FREE_PAGE_LIMIT && !user) {
        setLoginDialogOpen(true);
        setIsConverting(false);
        return;
      } 
      // Logged in users with more than FREE_PAGE_LIMIT pages need a subscription
      else if (numPages > FREE_PAGE_LIMIT && user && !isAdmin) {
        // Check if user has a paid subscription
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('plan_type, status')
          .eq('user_id', user.id)
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
      console.log("Using text extraction method");
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
      // Check if user is logged in for downloads
      if (!user) {
        setLoginDialogOpen(true);
        return;
      }
      
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
  }, [transactions, toast, user]);

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
        
        {error && (
          <div className="mb-4 p-4 border border-red-300 bg-red-50 rounded-md text-red-800 flex items-start">
            <AlertCircle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold">Error</p>
              <p className="text-sm">{error}</p>
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
                ? "An error occurred while processing your file. Try again with a different file."
                : file 
                  ? `Selected file: ${file.name}`
                  : "Drag and drop your PDF bank statement here, or click to browse files"
            }
          </p>
          
          {!isAdmin && !file && !isConverted && !error && (
            <p className="text-xs text-muted-foreground mb-4">
              {user ? 'Free tier: Process up to 1 page only. For larger documents, please subscribe.' : 'Please sign in to process your documents.'}
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

      {/* Login Dialog */}
      <Dialog open={loginDialogOpen} onOpenChange={setLoginDialogOpen}>
        <DialogContent>
          <div className="py-4">
            <h2 className="text-2xl font-bold text-center mb-6">
              Create an Account
            </h2>
            <p className="text-center mb-8">
              Please create an account or log in to continue.
            </p>
            <div className="flex justify-center">
              <Button asChild>
                <Link to="/auth">
                  Sign In / Sign Up
                </Link>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default FileUpload;
