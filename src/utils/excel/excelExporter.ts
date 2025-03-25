
import * as XLSX from 'xlsx';
import { Transaction } from '../transactions/types';

/**
 * Generates an Excel file from transaction data
 */
export function generateExcelFile(transactions: Transaction[]): Blob {
  // Create workbook and add worksheet
  const wb = XLSX.utils.book_new();
  
  // Convert transactions to worksheet data
  const worksheetData = [
    ['Date', 'Description', 'Amount', 'Category'], // Header row
    ...transactions.map(t => [t.date, t.description, t.amount, t.category || 'Uncategorized'])
  ];
  
  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(worksheetData);
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
  
  // Generate Excel file as buffer
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  
  // Convert buffer to Blob
  return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

/**
 * Downloads the Excel file to the user's device
 */
export function downloadExcelFile(excelData: Blob, filename: string): void {
  // Create download link
  const url = window.URL.createObjectURL(excelData);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  
  // Trigger download
  document.body.appendChild(link);
  link.click();
  
  // Cleanup
  setTimeout(() => {
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }, 100);
}
