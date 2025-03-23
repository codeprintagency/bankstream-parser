
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
  
  // Primary patterns for Chase statements
  const chaseTransactionPattern1 = /(\d{2}\/\d{2})\s+(\d{2}\/\d{2})?\s+([\w\s\.\-\&\,\'\/]+)\s+([\-\+]?\$?\s?\d+,?\d*\.\d{2})/;
  const chaseTransactionPattern2 = /(\d{2}\/\d{2})\s+([\w\s\.\-\&\,\'\/]+)\s+([\-\+]?\$?\s?\d+,?\d*\.\d{2})/;
  const chaseTransactionPattern3 = /(\d{2}\/\d{2})\s+(.*?)(?:\s{2,}|\t)([\-\+]?\$?\s?\d+,?\d*\.\d{2})$/;
  
  // Additional patterns for different date formats and transaction layouts
  const datePattern = /\b(\d{1,2}[\/\-\.]\d{1,2}(?:[\/\-\.]\d{2,4})?)\b/;
  const amountPattern = /([\-\+]?\$?\s?\d+,?\d*\.\d{2})/;
  
  // Pattern for typical transaction sections in Chase statements
  const sectionPattern = /TRANSACTION\s+DETAIL|PAYMENTS\s+AND\s+OTHER\s+CREDITS|PURCHASE\s+DETAIL|TRANSACTION\s+ACTIVITY/i;
  
  let lastFoundDate = '';
  let foundTransactions = 0;
  let inTransactionSection = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    if (!line) continue;
    
    // Check if we're entering a transaction section
    if (sectionPattern.test(line)) {
      inTransactionSection = true;
      console.log(`Entered transaction section at line ${i}: ${line}`);
      continue;
    }
    
    // Skip lines that are likely headers or footers
    if (line.includes('Page') && line.includes('of') && /Page\s+\d+\s+of\s+\d+/.test(line)) continue;
    if (line.includes('Statement Date') && line.includes('Account Number')) continue;
    
    console.log(`Processing line ${i}: ${line.substring(0, 50)}${line.length > 50 ? '...' : ''}`);
    
    // Try Chase specific patterns first
    let match = line.match(chaseTransactionPattern1) || line.match(chaseTransactionPattern2) || line.match(chaseTransactionPattern3);
    
    if (match) {
      // Extract date (first date in the match)
      const dateIndex = match.findIndex((val, idx) => idx > 0 && /^\d{2}\/\d{2}$/.test(val));
      const date = dateIndex > 0 ? match[dateIndex] : '';
      
      // For pattern 1, description is index 3 and amount is index 4
      // For pattern 2, description is index 2 and amount is index 3
      // For pattern 3, description is index 2 and amount is index 3
      let description = '';
      let amount = '';
      
      if (match === line.match(chaseTransactionPattern1)) {
        description = match[3];
        amount = match[4];
      } else {
        description = match[2];
        amount = match[3];
      }
      
      if (date && description && amount) {
        lastFoundDate = date;
        const category = determineCategory(description);
        
        // Clean up the amount to remove any non-numeric characters except for decimal point and minus sign
        const cleanAmount = amount.replace(/[^0-9\.\-]/g, '');
        
        transactions.push({
          date,
          description: description.trim(),
          amount: cleanAmount.startsWith('-') ? cleanAmount : (description.toLowerCase().includes('payment') ? '-' + cleanAmount : cleanAmount),
          category
        });
        
        foundTransactions++;
        console.log(`Found transaction with Chase pattern: ${date} | ${description.trim()} | ${amount} | ${category}`);
      }
    } else {
      // Try additional pattern matching for transactions
      // Look for date and amount combinations
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
        
        // Clean up the amount
        const cleanAmount = amount.replace(/[^0-9\.\-]/g, '');
        
        transactions.push({
          date,
          description,
          amount: cleanAmount.startsWith('-') ? cleanAmount : (description.toLowerCase().includes('payment') ? '-' + cleanAmount : cleanAmount),
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
          
          // Clean up the amount
          const cleanAmount = amount.replace(/[^0-9\.\-]/g, '');
          
          transactions.push({
            date: lastFoundDate,
            description,
            amount: cleanAmount.startsWith('-') ? cleanAmount : (description.toLowerCase().includes('payment') ? '-' + cleanAmount : cleanAmount),
            category
          });
          
          foundTransactions++;
          console.log(`Found transaction with description+amount: ${lastFoundDate} | ${description} | ${amount} | ${category}`);
        }
      }
      // Last attempt: Use a multi-line approach for transactions that might span multiple lines
      else if (i + 1 < lines.length) {
        const currentLine = line;
        const nextLine = lines[i + 1].trim();
        
        const currentDateMatch = currentLine.match(datePattern);
        const nextLineAmountMatch = nextLine.match(amountPattern);
        
        if (currentDateMatch && nextLineAmountMatch && !nextLine.match(datePattern)) {
          const date = currentDateMatch[1];
          const amount = nextLineAmountMatch[1];
          const description = currentLine.substring(currentLine.indexOf(currentDateMatch[0]) + currentDateMatch[0].length).trim();
          
          lastFoundDate = date;
          const category = determineCategory(description);
          
          // Clean up the amount
          const cleanAmount = amount.replace(/[^0-9\.\-]/g, '');
          
          transactions.push({
            date,
            description,
            amount: cleanAmount.startsWith('-') ? cleanAmount : (description.toLowerCase().includes('payment') ? '-' + cleanAmount : cleanAmount),
            category
          });
          
          foundTransactions++;
          console.log(`Found multi-line transaction: ${date} | ${description} | ${amount} | ${category}`);
          i++; // Skip the next line
        }
      }
    }
  }
  
  console.log(`Total transactions found: ${foundTransactions}`);
  
  // If we still couldn't extract transactions properly, try a more aggressive approach
  if (transactions.length < 3) {
    console.warn("Few transactions found. Trying more aggressive extraction...");
    
    // Second pass: look for any lines with dates and amounts, or multi-line patterns
    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const dateMatch = line.match(/\b\d{1,2}\/\d{1,2}\b/);
      if (dateMatch) {
        // Check current line for amount
        const amountMatch = line.match(/([\-\+]?\$?\s?\d+,?\d*\.\d{2})/);
        if (amountMatch) {
          const description = line
            .replace(dateMatch[0], '')
            .replace(amountMatch[0], '')
            .trim();
          
          transactions.push({
            date: dateMatch[0],
            description: description || 'Unknown transaction',
            amount: amountMatch[1].replace(/[^0-9\.\-]/g, ''),
            category: determineCategory(description) || 'Other'
          });
          continue;
        }
        
        // Check next line for amount
        const nextLine = lines[i + 1].trim();
        const nextLineAmountMatch = nextLine.match(/([\-\+]?\$?\s?\d+,?\d*\.\d{2})/);
        
        if (nextLineAmountMatch && !nextLine.match(/\b\d{1,2}\/\d{1,2}\b/)) {
          transactions.push({
            date: dateMatch[0],
            description: line.replace(dateMatch[0], '').trim() || nextLine.replace(nextLineAmountMatch[0], '').trim() || 'Unknown transaction',
            amount: nextLineAmountMatch[1].replace(/[^0-9\.\-]/g, ''),
            category: 'Other'
          });
          i++; // Skip the next line
        }
      }
    }
    
    console.log(`After aggressive extraction, total transactions: ${transactions.length}`);
  }
  
  // Search specifically for payment entries which often have specific formats
  const paymentLines = lines.filter(line => 
    line.toLowerCase().includes('payment') || 
    line.toLowerCase().includes('deposit') || 
    line.toLowerCase().includes('credit')
  );
  
  for (const line of paymentLines) {
    const dateMatch = line.match(datePattern);
    const amountMatch = line.match(amountPattern);
    
    if (dateMatch && amountMatch) {
      const existingTransaction = transactions.find(t => 
        t.date === dateMatch[1] && 
        t.amount === amountMatch[1].replace(/[^0-9\.\-]/g, '')
      );
      
      if (!existingTransaction) {
        transactions.push({
          date: dateMatch[1],
          description: line.replace(dateMatch[0], '').replace(amountMatch[0], '').trim() || 'Payment',
          amount: '-' + amountMatch[1].replace(/[^0-9\.]/g, ''), // Payments are typically negative
          category: 'Payment'
        });
      }
    }
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

// Enhanced function to determine transaction category based on keywords
function determineCategory(description: string): string {
  const lowerDesc = description.toLowerCase();
  
  // Dining/Restaurants
  if (lowerDesc.includes('restaurant') || lowerDesc.includes('cafe') || lowerDesc.includes('coffee') || 
      lowerDesc.includes('pizza') || lowerDesc.includes('mcdonalds') || lowerDesc.includes('starbucks') ||
      lowerDesc.includes('dining') || lowerDesc.includes('doordash') || lowerDesc.includes('grubhub') ||
      lowerDesc.includes('uber eat') || lowerDesc.includes('taco') || lowerDesc.includes('burger') ||
      lowerDesc.includes('ihop') || lowerDesc.includes('subway') || lowerDesc.includes('steakhouse') ||
      lowerDesc.includes('diner') || lowerDesc.includes('chipotle') || lowerDesc.includes('bbq') ||
      lowerDesc.includes('sushi') || lowerDesc.includes('food') || lowerDesc.includes('bakery')) {
    return 'Dining';
  }
  
  // Groceries
  if (lowerDesc.includes('grocery') || lowerDesc.includes('market') || lowerDesc.includes('supermarket') || 
      lowerDesc.includes('walmart') || lowerDesc.includes('target') || lowerDesc.includes('safeway') ||
      lowerDesc.includes('kroger') || lowerDesc.includes('trader') || lowerDesc.includes('whole foods') ||
      lowerDesc.includes('aldi') || lowerDesc.includes('heb') || lowerDesc.includes('publix') ||
      lowerDesc.includes('costco') || lowerDesc.includes('sam\'s club') || lowerDesc.includes('food lion')) {
    return 'Groceries';
  }
  
  // Transportation
  if (lowerDesc.includes('gas') || lowerDesc.includes('fuel') || lowerDesc.includes('uber') || 
      lowerDesc.includes('lyft') || lowerDesc.includes('transit') || lowerDesc.includes('parking') ||
      lowerDesc.includes('taxi') || lowerDesc.includes('toll') || lowerDesc.includes('metro') ||
      lowerDesc.includes('train') || lowerDesc.includes('airline') || lowerDesc.includes('air') ||
      lowerDesc.includes('flight') || lowerDesc.includes('delta') || lowerDesc.includes('united') ||
      lowerDesc.includes('american air') || lowerDesc.includes('southwest') || lowerDesc.includes('exxon') ||
      lowerDesc.includes('shell') || lowerDesc.includes('chevron') || lowerDesc.includes('76') ||
      lowerDesc.includes('marathon') || lowerDesc.includes('speedway') || lowerDesc.includes('bp')) {
    return 'Transportation';
  }
  
  // Income
  if (lowerDesc.includes('salary') || lowerDesc.includes('direct dep') || lowerDesc.includes('payroll') ||
      lowerDesc.includes('deposit from') || lowerDesc.includes('ach deposit') || lowerDesc.includes('income') ||
      lowerDesc.includes('tax refund') || lowerDesc.includes('interest paid') || lowerDesc.includes('dividend')) {
    return 'Income';
  }
  
  // Bills & Utilities
  if (lowerDesc.includes('bill') || lowerDesc.includes('utility') || lowerDesc.includes('phone') || 
      lowerDesc.includes('cable') || lowerDesc.includes('electric') || lowerDesc.includes('water') ||
      lowerDesc.includes('gas bill') || lowerDesc.includes('internet') || lowerDesc.includes('wireless') ||
      lowerDesc.includes('netflix') || lowerDesc.includes('spotify') || lowerDesc.includes('hulu') ||
      lowerDesc.includes('insurance') || lowerDesc.includes('at&t') || lowerDesc.includes('verizon') ||
      lowerDesc.includes('t-mobile') || lowerDesc.includes('comcast') || lowerDesc.includes('xfinity')) {
    return 'Bills';
  }
  
  // Shopping
  if (lowerDesc.includes('amazon') || lowerDesc.includes('online') || lowerDesc.includes('shop') || 
      lowerDesc.includes('store') || lowerDesc.includes('best buy') || lowerDesc.includes('purchase') ||
      lowerDesc.includes('ebay') || lowerDesc.includes('etsy') || lowerDesc.includes('wayfair') ||
      lowerDesc.includes('home depot') || lowerDesc.includes('lowe\'s') || lowerDesc.includes('ikea') ||
      lowerDesc.includes('apple') || lowerDesc.includes('clothing') || lowerDesc.includes('shoes') ||
      lowerDesc.includes('fashion') || lowerDesc.includes('mall') || lowerDesc.includes('retail')) {
    return 'Shopping';
  }
  
  // Cash & ATM
  if (lowerDesc.includes('withdraw') || lowerDesc.includes('atm') || lowerDesc.includes('cash') ||
      lowerDesc.includes('withdrawal')) {
    return 'Cash';
  }
  
  // Transfers
  if (lowerDesc.includes('transfer') || lowerDesc.includes('zelle') || lowerDesc.includes('venmo') ||
      lowerDesc.includes('paypal') || lowerDesc.includes('send money') || lowerDesc.includes('wire') ||
      lowerDesc.includes('chase quickpay') || lowerDesc.includes('cashapp') || lowerDesc.includes('square cash')) {
    return 'Transfer';
  }
  
  // Fees & Interest
  if (lowerDesc.includes('fee') || lowerDesc.includes('interest') || lowerDesc.includes('service charge') ||
      lowerDesc.includes('membership fee') || lowerDesc.includes('annual fee') || lowerDesc.includes('late fee') ||
      lowerDesc.includes('finance charge') || lowerDesc.includes('balance transfer fee')) {
    return 'Fees';
  }
  
  // Health
  if (lowerDesc.includes('doctor') || lowerDesc.includes('hospital') || lowerDesc.includes('clinic') ||
      lowerDesc.includes('pharmacy') || lowerDesc.includes('medical') || lowerDesc.includes('dental') ||
      lowerDesc.includes('healthcare') || lowerDesc.includes('vision') || lowerDesc.includes('cvs') ||
      lowerDesc.includes('walgreens') || lowerDesc.includes('rite aid')) {
    return 'Health';
  }
  
  // Entertainment
  if (lowerDesc.includes('movie') || lowerDesc.includes('theater') || lowerDesc.includes('cinema') ||
      lowerDesc.includes('ticket') || lowerDesc.includes('event') || lowerDesc.includes('concert') ||
      lowerDesc.includes('disney') || lowerDesc.includes('netflix') || lowerDesc.includes('hulu') ||
      lowerDesc.includes('spotify') || lowerDesc.includes('amazon prime') || lowerDesc.includes('hbo')) {
    return 'Entertainment';
  }
  
  // Payments
  if (lowerDesc.includes('payment thank') || lowerDesc.includes('autopay') || lowerDesc.includes('bill pay') ||
      lowerDesc.includes('payment - thank') || lowerDesc.includes('automatic payment')) {
    return 'Payment';
  }
  
  // Return 'Other' for any unmatched descriptions
  return 'Other';
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
