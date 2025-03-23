
import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Upload, FileText, Check, AlertCircle, Zap } from "lucide-react";
import { convertPdfToExcel, generateExcelFile, downloadExcelFile, Transaction } from "@/utils/fileConverter";
import { parseTransactionsWithAI, hasPremiumAccess, togglePremiumAccess } from "@/utils/aiParser";
import TransactionTable from "./TransactionTable";
import { extractTextFromPdf } from "@/utils/fileConverter";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const FileUpload: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [isConverted, setIsConverted] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [useAI, setUseAI] = useState(false);
  const [isPremium, setIsPremium] = useState(() => hasPremiumAccess());
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

  const togglePremium = useCallback(() => {
    const status = togglePremiumAccess();
    setIsPremium(status);
    toast({
      title: status ? "Premium Activated" : "Premium Deactivated",
      description: status 
        ? "You now have access to AI parsing features" 
        : "AI parsing features are now disabled",
    });
  }, [toast]);

  const handleConvert = useCallback(async () => {
    if (!file) return;
    
    setIsConverting(true);
    
    try {
      if (useAI) {
        // Check if premium access is available
        if (!isPremium) {
          toast({
            title: "Premium Feature",
            description: "AI parsing requires premium access. Enable it in settings.",
            variant: "destructive",
          });
          setIsConverting(false);
          return;
        }
        
        // Extract text from PDF for AI processing
        const extractedText = await extractTextFromPdf(file);
        
        try {
          toast({
            title: "AI Processing",
            description: "Sending to Claude AI for analysis (this may take a moment)...",
          });
          
          // Use AI parsing with the default API key (already set in aiParser.ts)
          const aiExtractedTransactions = await parseTransactionsWithAI(extractedText);
          setTransactions(aiExtractedTransactions);
          
          toast({
            title: "AI Conversion Successful",
            description: `${aiExtractedTransactions.length} transactions have been extracted from your statement`,
          });
        } catch (aiError) {
          console.error("AI parsing failed:", aiError);
          
          // Fallback to traditional parsing if AI fails
          toast({
            title: "AI Parsing Failed",
            description: "Falling back to standard parsing method",
            variant: "destructive",
          });
          
          const extractedTransactions = await convertPdfToExcel(file);
          setTransactions(extractedTransactions);
        }
      } else {
        // Use traditional parsing
        const extractedTransactions = await convertPdfToExcel(file);
        setTransactions(extractedTransactions);
        
        toast({
          title: "Conversion Successful",
          description: `${extractedTransactions.length} transactions have been extracted from your statement`,
        });
      }
      
      setIsConverted(true);
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
  }, [file, toast, useAI, isPremium]);

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
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <Switch 
              id="parsing-mode" 
              checked={useAI} 
              onCheckedChange={setUseAI} 
              disabled={isConverting}
            />
            <Label htmlFor="parsing-mode" className="flex items-center">
              <span>AI Parsing</span>
              {useAI && <Zap className="w-4 h-4 ml-1 text-yellow-500" />}
            </Label>
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            className={isPremium ? "bg-gradient-to-r from-yellow-400 to-yellow-600 text-white hover:from-yellow-500 hover:to-yellow-700" : ""}
            onClick={togglePremium}
          >
            {isPremium ? "Premium Active" : "Enable Premium"}
          </Button>
        </div>
        
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
              ? `${transactions.length} transactions have been extracted from your statement` 
              : file 
                ? `Selected file: ${file.name}${useAI ? " (AI Mode)" : ""}` 
                : `Drag and drop your PDF bank statement here, or click to browse files${useAI ? ". Using AI mode" : ""}`
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
              {isConverting ? "Converting..." : useAI ? "Convert with Claude AI" : "Convert to Excel"}
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
        
        {isConverted && transactions.length > 0 && (
          <TransactionTable transactions={transactions} />
        )}
        
        <div className="mt-4 flex items-center justify-center text-xs text-muted-foreground">
          <AlertCircle className="w-3 h-3 mr-1" />
          <span>Bank statements are processed securely and never stored on our servers</span>
        </div>
      </div>
    </section>
  );
};

export default FileUpload;
