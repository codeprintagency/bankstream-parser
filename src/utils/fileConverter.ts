
import { Transaction } from './transactions/types';
import { extractTextFromPdf } from './pdf/pdfProcessor';
import { determineCategory } from './transactions/categoryDetector';
import { generateExcelFile, downloadExcelFile } from './excel/excelExporter';

// Re-export all the types and functions needed for public use
export { extractTextFromPdf, determineCategory, generateExcelFile, downloadExcelFile };
// Use 'export type' for re-exporting types when 'isolatedModules' is enabled
export type { Transaction };

// Function to convert extracted PDF text to a format suitable for AI processing
export const prepareExtractedTextForAI = (extractedItems: any[]): string[] => {
  // Convert extracted items to simple text strings
  return extractedItems.map(page => 
    page.map((item: any) => item.str).join(' ')
  );
};
