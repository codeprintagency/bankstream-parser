
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

// Enhanced function to parse transactions from different bank statement formats
function parseTransactionsFromText(textContent: string[]): Transaction[] {
  const transactions: Transaction[] = [];
  
  // Join all pages text
  const fullText = textContent.join('\n');
  console.log("Full extracted text:", fullText.substring(0, 500) + "...");
  
  // Split text into lines for better processing
  const lines = fullText.split(/\r?\n/);
  
  // Chase specific patterns
  const chasePattern1 = /(\d{2}\/\d{2})\s+(\d{2}\/\d{2})\s+([\w\s\.\-\&\,\']+)\s+([\-\+]?\$?\s?\d+,?\d*\.\d{2})/;
  const chasePattern2 = /(\d{2}\/\d{2})\s+([\w\s\.\-\&\,\']+)\s+([\-\+]?\$?\s?\d+,?\d*\.\d{2})/;
  
  // General patterns for dates and amounts
  const datePattern = /\b(\d{1,2}[\/\-\.]\d{1,2}(?:[\/\-\.]\d{2,4})?)\b/;
  const amountPattern = /([\-\+]?\$?\s?\d+,?\d*\.\d{2})/;
  
  let lastFoundDate = '';
  let foundTransactions = 0;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    if (!line) continue;
    
    console.log(`Processing line ${i}: ${line.substring(0, 50)}${line.length > 50 ? '...' : ''}`);
    
    // Try Chase specific patterns first
    let match = line.match(chasePattern1) || line.match(chasePattern2);
    
    if (match) {
      const dateIndex = match.findIndex((val, idx) => idx > 0 && /^\d{2}\/\d{2}$/.test(val));
      const date = dateIndex > 0 ? match[dateIndex] : '';
      
      // Get the last two elements which should be description and amount
      const amount = match[match.length - 1];
      const description = match[match.length - 2];
      
      if (date && description && amount) {
        lastFoundDate = date;
        const category = determineCategory(description);
        
        transactions.push({
          date,
          description: description.trim(),
          amount,
          category
        });
        
        foundTransactions++;
        console.log(`Found transaction: ${date} | ${description.trim()} | ${amount} | ${category}`);
      }
    } else {
      // Try general pattern matching
      const dateMatch = line.match(datePattern);
      const amountMatch = line.match(amountPattern);
      
      if (dateMatch && amountMatch) {
        const date = dateMatch[1];
        const amount = amountMatch[1];
        
        // Extract description (everything between date and amount)
        let description = line
          .substring(line.indexOf(dateMatch[0]) + dateMatch[0].length, line.lastIndexOf(amountMatch[0]))
          .trim();
        
        // If description is empty or too short, try to get it from the next line
        if (description.length < 3 && i + 1 < lines.length) {
          description = lines[i + 1].trim();
          i++; // Skip the next line since we've used it
        }
        
        lastFoundDate = date;
        const category = determineCategory(description);
        
        transactions.push({
          date,
          description,
          amount,
          category
        });
        
        foundTransactions++;
        console.log(`Found transaction with general pattern: ${date} | ${description} | ${amount} | ${category}`);
      } 
      // Check for lines that might be transaction descriptions without dates
      else if (lastFoundDate && amountMatch && line.length > 10 && !line.includes('BALANCE') && !line.includes('Total')) {
        // This might be a description line with an amount
        const amount = amountMatch[1];
        const description = line.substring(0, line.lastIndexOf(amountMatch[0])).trim();
        
        if (description) {
          const category = determineCategory(description);
          
          transactions.push({
            date: lastFoundDate,
            description,
            amount,
            category
          });
          
          foundTransactions++;
          console.log(`Found transaction with description+amount: ${lastFoundDate} | ${description} | ${amount} | ${category}`);
        }
      }
      // Last attempt: try to match standalone transaction lines
      else if (line.length > 15 && !line.includes('BALANCE') && !line.includes('Total') && !line.includes('Page')) {
        const words = line.split(/\s+/);
        
        // If line has multiple words and last one looks like an amount
        if (words.length >= 3 && /^[\-\+]?\$?\s?\d+,?\d*\.\d{2}$/.test(words[words.length - 1])) {
          const amount = words[words.length - 1];
          // See if first word is a date
          const possibleDate = words[0];
          
          if (/^\d{1,2}\/\d{1,2}$/.test(possibleDate)) {
            const date = possibleDate;
            const description = words.slice(1, words.length - 1).join(' ');
            const category = determineCategory(description);
            
            transactions.push({
              date,
              description,
              amount,
              category
            });
            
            lastFoundDate = date;
            foundTransactions++;
            console.log(`Found standalone transaction: ${date} | ${description} | ${amount} | ${category}`);
          }
        }
      }
    }
  }
  
  console.log(`Total transactions found: ${foundTransactions}`);
  
  // If we still couldn't extract transactions properly, try a more aggressive approach
  if (transactions.length < 3) {
    console.warn("Few transactions found. Trying more aggressive extraction...");
    
    // Look for consecutive lines with dates and amounts
    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i].trim();
      const nextLine = lines[i + 1].trim();
      
      const dateMatch = line.match(/\b\d{1,2}\/\d{1,2}\b/);
      if (dateMatch) {
        const amountMatch = nextLine.match(/([\-\+]?\$?\s?\d+,?\d*\.\d{2})/);
        if (amountMatch) {
          transactions.push({
            date: dateMatch[0],
            description: line.replace(dateMatch[0], '').trim() || nextLine.replace(amountMatch[0], '').trim(),
            amount: amountMatch[1],
            category: 'Other'
          });
          i++; // Skip the next line
        }
      }
    }
    
    console.log(`After aggressive extraction, total transactions: ${transactions.length}`);
  }
  
  // If still no transactions found, return sample of text content
  if (transactions.length === 0) {
    console.warn("Couldn't extract transactions with any pattern matching, providing text samples");
    
    // Return some sample lines from the text as transactions
    const sampleLines = lines.filter(line => line.length > 10).slice(0, 15);
    
    sampleLines.forEach((line, index) => {
      transactions.push({
        date: new Date().toISOString().slice(0, 10),
        description: `Extracted text: ${line.substring(0, 100)}${line.length > 100 ? '...' : ''}`,
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
  
  if (lowerDesc.includes('grocery') || lowerDesc.includes('food') || lowerDesc.includes('market') || 
      lowerDesc.includes('walmart') || lowerDesc.includes('target') || lowerDesc.includes('safeway')) {
    return 'Groceries';
  } else if (lowerDesc.includes('restaurant') || lowerDesc.includes('cafe') || lowerDesc.includes('coffee') || 
             lowerDesc.includes('pizza') || lowerDesc.includes('mcdonalds') || lowerDesc.includes('starbucks')) {
    return 'Dining';
  } else if (lowerDesc.includes('gas') || lowerDesc.includes('fuel') || lowerDesc.includes('uber') || 
             lowerDesc.includes('lyft') || lowerDesc.includes('transit') || lowerDesc.includes('parking')) {
    return 'Transportation';
  } else if (lowerDesc.includes('salary') || lowerDesc.includes('deposit') || lowerDesc.includes('payment') || 
             lowerDesc.includes('direct dep') || lowerDesc.includes('payroll')) {
    return 'Income';
  } else if (lowerDesc.includes('bill') || lowerDesc.includes('utility') || lowerDesc.includes('phone') || 
             lowerDesc.includes('cable') || lowerDesc.includes('electric') || lowerDesc.includes('water')) {
    return 'Bills';
  } else if (lowerDesc.includes('amazon') || lowerDesc.includes('online') || lowerDesc.includes('shop') || 
             lowerDesc.includes('store') || lowerDesc.includes('best buy') || lowerDesc.includes('purchase')) {
    return 'Shopping';
  } else if (lowerDesc.includes('withdraw') || lowerDesc.includes('atm') || lowerDesc.includes('cash')) {
    return 'Cash';
  } else if (lowerDesc.includes('transfer') || lowerDesc.includes('zelle') || lowerDesc.includes('venmo')) {
    return 'Transfer';
  } else if (lowerDesc.includes('fee') || lowerDesc.includes('interest') || lowerDesc.includes('service charge')) {
    return 'Fees';
  } else {
    return 'Other';
  }
}

export const convertPdfToExcel = async (file: File): Promise<Transaction[]> => {
  try {
    console.log("Converting file:", file.name);
    
    // Extract text from PDF
    const extractedText = await extractTextFromPdf(file);
    console.log("Extracted text from PDF, total pages:", extractedText.length);
    
    // Parse transactions from the text
    const transactions = parseTransactionsFromText(extractedText);
    console.log("Extracted transactions count:", transactions.length);
    
    return transactions;
  } catch (error) {
    console.error("Error in PDF to Excel conversion:", error);
    throw error;
  }
};

// Function to generate Excel file from transactions
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
