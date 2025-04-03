
import { useState, useCallback } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Transaction, extractTextFromPdf } from "@/utils/fileConverter";
import { parseTransactionsWithAI } from "@/utils/aiParser";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export const FREE_PAGE_LIMIT = 1;

type ConversionOptions = {
  onPricingRequired?: () => void;
  onLoginRequired?: () => void;
};

export function useConversion(options: ConversionOptions = {}) {
  const { user, isAdmin } = useAuth();
  const [isConverting, setIsConverting] = useState(false);
  const [isConverted, setIsConverted] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  
  const convertFile = useCallback(async (file: File, pageCount: number) => {
    if (!file) return;
    
    setIsConverting(true);
    setError(null);
    
    try {
      // Admins can upload any number of pages
      if (isAdmin) {
        // Skip page limit checks for admins
      }
      // Non-admins need to be logged in for more than FREE_PAGE_LIMIT pages
      else if (pageCount > FREE_PAGE_LIMIT && !user && options.onLoginRequired) {
        options.onLoginRequired();
        setIsConverting(false);
        return;
      } 
      // Logged in users with more than FREE_PAGE_LIMIT pages need a subscription
      else if (pageCount > FREE_PAGE_LIMIT && user && !isAdmin) {
        // Check if user has a paid subscription
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('plan_type, status')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .single();
          
        if (!subscription || subscription.plan_type === 'free') {
          if (options.onPricingRequired) {
            options.onPricingRequired();
          }
          setIsConverting(false);
          return;
        }
      }
      
      toast({
        title: "AI Processing",
        description: `Sending to AI for analysis...`,
      });
      
      // Convert the file to ArrayBuffer for direct PDF upload
      const arrayBuffer = await file.arrayBuffer();
      
      // Always use direct PDF upload 
      const aiExtractedTransactions = await parseTransactionsWithAI(arrayBuffer, true);
      
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
  }, [isAdmin, options, toast, user]);

  const handleDownload = useCallback(async (requireLogin = true) => {
    if (transactions.length === 0) return;
    
    try {
      // Check if user is logged in for downloads if required
      if (requireLogin && !user && options.onLoginRequired) {
        options.onLoginRequired();
        return;
      }
      
      // Generate and download the Excel file
      import("@/utils/excel/excelExporter").then(({ generateExcelFile, downloadExcelFile }) => {
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
  }, [transactions, toast, user, options]);

  const reset = () => {
    setIsConverted(false);
    setTransactions([]);
    setError(null);
  };
  
  return {
    isConverting,
    isConverted,
    transactions,
    error,
    setError,
    convertFile,
    handleDownload,
    reset
  };
}
