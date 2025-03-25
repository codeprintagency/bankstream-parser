import React, { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Upload, FileText, Check, AlertCircle, Zap, Bug, Key } from "lucide-react";
import { convertPdfToExcel, generateExcelFile, downloadExcelFile, Transaction } from "@/utils/fileConverter";
import { parseTransactionsWithAI, hasPremiumAccess, togglePremiumAccess, getClaudeApiKey, setClaudeApiKey } from "@/utils/aiParser";
import TransactionTable from "./TransactionTable";
import { extractTextFromPdf } from "@/utils/fileConverter";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import DebugModal from "./DebugModal";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const FileUpload: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [isConverted, setIsConverted] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [useAI, setUseAI] = useState(false);
  const [directPdfUpload, setDirectPdfUpload] = useState(false); // Changed to false by default
  const [isPremium, setIsPremium] = useState(() => hasPremiumAccess());
  const [debugModalOpen, setDebugModalOpen] = useState(false);
  const [apiKeyPopoverOpen, setApiKeyPopoverOpen] = useState(false);
  const [apiKey, setApiKey] = useState(() => getClaudeApiKey() || "");
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Load API key from storage on component mount
  useEffect(() => {
    const savedKey = getClaudeApiKey();
    if (savedKey) {
      setApiKey(savedKey);
    }
  }, []);

  const handleSaveApiKey = () => {
    if (apiKey.trim()) {
      setClaudeApiKey(apiKey.trim());
      setApiKeyPopoverOpen(false);
      toast({
        title: "API Key Saved",
        description: "Your Claude API key has been saved securely.",
      });
    } else {
      toast({
        title: "API Key Required",
        description: "Please enter a valid API key.",
        variant: "destructive",
      });
    }
  };

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
    setError(null);
    
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
        
        // Check if API key is available
        const currentApiKey = getClaudeApiKey();
        if (!currentApiKey) {
          setApiKeyPopoverOpen(true);
          toast({
            title: "API Key Required",
            description: "Claude API key is required for AI parsing. Please enter your API key.",
            variant: "destructive",
          });
          setIsConverting(false);
          return;
        }
        
        toast({
          title: "AI Processing",
          description: `Sending to Claude AI for analysis${directPdfUpload ? " using direct PDF upload" : ""}...`,
        });
        
        let aiExtractedTransactions;
        
        if (directPdfUpload) {
          // Direct PDF upload approach - send the raw PDF data
          const arrayBuffer = await file.arrayBuffer();
          console.log("Using direct PDF upload method, file size:", arrayBuffer.byteLength);
          
          // Use AI parsing with the raw PDF data
          aiExtractedTransactions = await parseTransactionsWithAI(arrayBuffer, currentApiKey);
        } else {
          // Text extraction approach
          const extractedText = await extractTextFromPdf(file);
          console.log("Using text extraction method, text length:", 
            extractedText.reduce((sum, text) => sum + text.length, 0));
          
          // Use AI parsing with the extracted text
          aiExtractedTransactions = await parseTransactionsWithAI(extractedText, currentApiKey);
        }
        
        setTransactions(aiExtractedTransactions);
        
        toast({
          title: "AI Conversion Successful",
          description: `${aiExtractedTransactions.length} transactions have been extracted from your statement`,
        });
        
        setIsConverted(true);
      } else {
        // Use traditional parsing
        const extractedTransactions = await convertPdfToExcel(file);
        setTransactions(extractedTransactions);
        
        toast({
          title: "Conversion Successful",
          description: `${extractedTransactions.length} transactions have been extracted from your statement`,
        });
        
        setIsConverted(true);
      }
    } catch (error: any) {
      console.error("Conversion error:", error);
      setError(error.message || "Unknown error occurred");
      
      // Check if error is related to API key
      if (error.message?.includes("API key") || error.message?.includes("authorization") || 
          error.message?.includes("auth") || error.message?.includes("unauthorized") ||
          error.message?.toLowerCase().includes("token")) {
        setApiKeyPopoverOpen(true);
      }
      
      toast({
        title: "Conversion Failed",
        description: error.message || "There was an error converting your file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsConverting(false);
    }
  }, [file, toast, useAI, isPremium, directPdfUpload]);

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
          <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-6">
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
            
            {useAI && (
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
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <Popover open={apiKeyPopoverOpen} onOpenChange={setApiKeyPopoverOpen}>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="flex items-center gap-1"
                >
                  <Key className="w-4 h-4" />
                  <span>API Key</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-4">
                <div className="space-y-4">
                  <h4 className="font-medium">Claude API Key</h4>
                  <p className="text-sm text-muted-foreground">
                    Enter your Claude API key to use AI parsing features.
                    Keys are stored locally in your browser.
                  </p>
                  <div className="flex flex-col gap-2">
                    <Input
                      type="password"
                      placeholder="sk-ant-api03-..."
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                    />
                    <Button size="sm" onClick={handleSaveApiKey}>
                      Save API Key
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    Need a key? <a href="https://console.anthropic.com/account/keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Get it from Anthropic Console</a>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            
            <Button 
              variant="outline" 
              size="sm" 
              className={isPremium ? "bg-gradient-to-r from-yellow-400 to-yellow-600 text-white hover:from-yellow-500 hover:to-yellow-700" : ""}
              onClick={togglePremium}
            >
              {isPremium ? "Premium Active" : "Enable Premium"}
            </Button>
            
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
              ? "Conversion Complete" 
              : error
                ? "Conversion Failed"
                : file 
                  ? "Ready to Convert" 
                  : "Upload Your Bank Statement"
            }
          </h2>
          
          <p className="text-muted-foreground mb-6 max-w-lg">
            {isConverted 
              ? `${transactions.length} transactions have been extracted from your statement` 
              : error
                ? "An error occurred while processing your file. Check the debug information."
                : file 
                  ? `Selected file: ${file.name}${useAI ? (directPdfUpload ? " (AI with Direct PDF Upload)" : " (AI with Text Extraction)") : ""}`
                  : `Drag and drop your PDF bank statement here, or click to browse files${useAI ? ". Using AI mode" : ""}`
            }
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
              className="relative"
            >
              {isConverting ? "Converting..." : useAI ? 
                (directPdfUpload ? "Convert with Direct PDF Upload" : "Convert with Text Extraction") 
                : "Convert to Excel"}
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
          <span>Bank statements are processed securely and never stored on our servers</span>
        </div>
      </div>
      
      {/* Debug Modal for showing the HTML response */}
      <DebugModal open={debugModalOpen} onOpenChange={setDebugModalOpen} />
    </section>
  );
};

export default FileUpload;
