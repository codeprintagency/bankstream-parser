
import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist';

// Set worker source for pdf.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface Transaction {
  date: string;
  description: string;
  amount: string;
  category?: string;
}

// Function to extract text content from a PDF file
async function extractTextFromPdf(file: File): Promise<string[]> {
  return new Promise(async (resolve, reject) => {
    try {
      // Convert the file to ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      
      // Load the PDF document
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      
      const pageTextPromises = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        pageTextPromises.push(pageText);
      }
      
      resolve(pageTextPromises);
    } catch (error) {
      console.error("Error extracting text from PDF:", error);
      reject(error);
    }
  });
}

// Function to parse the extracted text and identify transactions
function parseTransactionsFromText(textContent: string[]): Transaction[] {
  const transactions: Transaction[] = [];
  
  // Join all pages text
  const fullText = textContent.join(' ');
  
  // Look for common bank statement patterns using regex
  // This is a simplified approach that tries to match date patterns followed by transaction details and amounts
  
  // Pattern for dates (MM/DD/YYYY or DD/MM/YYYY)
  const datePattern = /\b\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\b/g;
  
  // Pattern for currency amounts ($XXX.XX or -$XXX.XX)
  const amountPattern = /[-+]?\$?\s?\d+,?\d*\.\d{2}/g;
  
  // Split text into lines for better processing
  const lines = fullText.split(/\r?\n| {4,}/);
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines
    if (!line) continue;
    
    // Try to identify transaction lines
    const dateMatch = line.match(datePattern);
    const amountMatch = line.match(amountPattern);
    
    if (dateMatch && amountMatch) {
      const date = dateMatch[0];
      const amount = amountMatch[0];
      
      // Extract description (everything between date and amount)
      let description = line
        .substring(line.indexOf(date) + date.length, line.indexOf(amount))
        .trim();
      
      // If description is empty or too short, try to get it from the next line
      if (description.length < 3 && i + 1 < lines.length) {
        description = lines[i + 1].trim();
        i++; // Skip the next line since we've used it
      }
      
      // Determine category based on description keywords (simplified approach)
      let category = determineCategory(description);
      
      transactions.push({
        date,
        description,
        amount,
        category
      });
    }
  }
  
  // If no transactions found with the regex approach, provide some mock data but mark it as extracted
  if (transactions.length === 0) {
    console.warn("Couldn't extract transactions with pattern matching, providing extracted text sample");
    
    // Return some sample lines from the text as transactions
    const sampleLines = lines.filter(line => line.length > 10).slice(0, 10);
    
    sampleLines.forEach((line, index) => {
      transactions.push({
        date: new Date().toISOString().slice(0, 10),
        description: `Extracted text: ${line.substring(0, 50)}...`,
        amount: "N/A",
        category: "Extracted Content"
      });
    });
  }
  
  return transactions;
}

// Simple function to determine transaction category based on keywords
function determineCategory(description: string): string {
  const lowerDesc = description.toLowerCase();
  
  if (lowerDesc.includes('grocery') || lowerDesc.includes('food') || lowerDesc.includes('market')) {
    return 'Groceries';
  } else if (lowerDesc.includes('restaurant') || lowerDesc.includes('cafe') || lowerDesc.includes('coffee')) {
    return 'Dining';
  } else if (lowerDesc.includes('gas') || lowerDesc.includes('fuel') || lowerDesc.includes('uber')) {
    return 'Transportation';
  } else if (lowerDesc.includes('salary') || lowerDesc.includes('deposit') || lowerDesc.includes('payment')) {
    return 'Income';
  } else if (lowerDesc.includes('bill') || lowerDesc.includes('utility') || lowerDesc.includes('phone')) {
    return 'Bills';
  } else if (lowerDesc.includes('amazon') || lowerDesc.includes('online') || lowerDesc.includes('shop')) {
    return 'Shopping';
  } else {
    return 'Other';
  }
}

export const convertPdfToExcel = async (file: File): Promise<Transaction[]> => {
  try {
    console.log("Converting file:", file.name);
    
    // Extract text from PDF
    const extractedText = await extractTextFromPdf(file);
    console.log("Extracted text content:", extractedText);
    
    // Parse transactions from the text
    const transactions = parseTransactionsFromText(extractedText);
    console.log("Extracted transactions:", transactions);
    
    return transactions;
  } catch (error) {
    console.error("Error in PDF to Excel conversion:", error);
    throw error;
  }
};

export const generateExcelFile = (transactions: Transaction[]): Blob => {
  // Create a new workbook
  const workbook = XLSX.utils.book_new();
  
  // Convert transactions to worksheet data
  const worksheetData = [
    ['Date', 'Description', 'Amount', 'Category'], // Header row
    ...transactions.map(t => [t.date, t.description, t.amount, t.category])
  ];
  
  // Create worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Bank Statement');
  
  // Convert workbook to binary Excel file
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  
  // Create Blob from the buffer
  return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
};

export const downloadExcelFile = (data: Blob, filename: string = "bank-statement.xlsx"): void => {
  // Create a download link and trigger it
  const url = URL.createObjectURL(data);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
