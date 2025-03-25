
import { Transaction } from './transactions/types';
import { extractTextFromPdf, reconstructTableRows } from './pdf/pdfProcessor';
import { 
  extractTransactionRows, 
  normalizeTransactions, 
  parseTransactionsFromText,
  extractChaseTransactions,
  extractGenericTransactions
} from './transactions/transactionParser';
import { determineCategory } from './transactions/categoryDetector';
import { generateExcelFile, downloadExcelFile } from './excel/excelExporter';

// Re-export all the types and functions needed for public use
export { extractTextFromPdf, determineCategory, generateExcelFile, downloadExcelFile };
// Use 'export type' for re-exporting types when 'isolatedModules' is enabled
export type { Transaction };

/**
 * Main function that converts a PDF file to transaction data
 */
export const convertPdfToExcel = async (file: File): Promise<Transaction[]> => {
  try {
    console.log("Converting file:", file.name);
    
    // Extract text items with position information from PDF
    const extractedItems = await extractTextFromPdf(file);
    console.log("Extracted text items from PDF, total pages:", extractedItems.length);
    
    // Reconstruct table rows based on text positions
    const tableRows = reconstructTableRows(extractedItems);
    console.log("Reconstructed table rows:", tableRows.length);
    
    // Extract potential transaction rows
    const transactionRows = extractTransactionRows(tableRows);
    console.log("Identified transaction rows:", transactionRows.length);
    
    // Normalize into transaction objects
    const transactions = normalizeTransactions(transactionRows);
    console.log("Normalized transactions:", transactions.length);
    
    // If we have too few transactions, try to use the previous method as fallback
    if (transactions.length < 5) {
      console.log("Falling back to simpler extraction method...");
      // Convert extractedItems to text array for compatibility with parseTransactionsFromText
      const textPages = extractedItems.map(page => 
        page.map((item: any) => item.str).join(' ')
      );
      
      return parseTransactionsFromText(textPages);
    }
    
    return transactions;
  } catch (error) {
    console.error("Error in PDF to Excel conversion:", error);
    throw error;
  }
};

// Function to convert extracted PDF text to a format suitable for AI processing
export const prepareExtractedTextForAI = (extractedItems: any[]): string[] => {
  // Convert extracted items to simple text strings
  return extractedItems.map(page => 
    page.map((item: any) => item.str).join(' ')
  );
};

