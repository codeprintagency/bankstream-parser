// For TypeScript's benefit, declare what's available in the browser's localStorage
declare global {
  interface Window {
    localStorage: Storage;
  }
}

import { Transaction } from './transactions/types';
import { determineCategory } from './transactions/categoryDetector';
import { ApiService } from './ApiService';

// Constants for local storage keys
const PREMIUM_ACCESS_KEY = 'premium_access';
const CLAUDE_API_KEY = 'claude_api_key';

/**
 * Determines if premium access is enabled
 */
export function hasPremiumAccess(): boolean {
  try {
    return localStorage.getItem(PREMIUM_ACCESS_KEY) === 'true';
  } catch (e) {
    console.error('Error accessing localStorage:', e);
    return false;
  }
}

/**
 * Toggles premium access state
 */
export function togglePremiumAccess(): boolean {
  try {
    const currentState = hasPremiumAccess();
    const newState = !currentState;
    localStorage.setItem(PREMIUM_ACCESS_KEY, newState.toString());
    return newState;
  } catch (e) {
    console.error('Error accessing localStorage:', e);
    return false;
  }
}

/**
 * Gets the Claude API key from localStorage
 */
export function getClaudeApiKey(): string | null {
  try {
    return localStorage.getItem(CLAUDE_API_KEY);
  } catch (e) {
    console.error('Error accessing localStorage:', e);
    return null;
  }
}

/**
 * Sets the Claude API key in localStorage
 */
export function setClaudeApiKey(apiKey: string): void {
  try {
    localStorage.setItem(CLAUDE_API_KEY, apiKey);
  } catch (e) {
    console.error('Error accessing localStorage:', e);
  }
}

/**
 * Parses transactions from a bank statement using Claude AI
 * 
 * @param data - Either PDF data as ArrayBuffer or extracted text content
 * @param apiKey - Claude API key
 * @param isDirectPdfUpload - Whether we're uploading the raw PDF (true) or sending extracted text (false)
 */
export async function parseTransactionsWithAI(
  data: ArrayBuffer | string[], 
  apiKey: string,
  isDirectPdfUpload: boolean = false
): Promise<Transaction[]> {
  try {
    console.log("Starting AI parsing process");
    
    let requestOptions;
    
    if (isDirectPdfUpload && data instanceof ArrayBuffer) {
      console.log("Received raw PDF data, using document-based API call");
      
      // Convert ArrayBuffer to base64 for PDF upload
      const bytes = new Uint8Array(data);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64Data = btoa(binary);
      console.log("PDF converted to base64, size:", base64Data.length);
      
      // Create request with PDF document
      requestOptions = {
        model: "claude-3-opus-20240229",
        max_tokens: 4000,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Please extract all financial transactions from this bank statement. Include date, description, and amount for each transaction."
              },
              {
                type: "document",
                source: {
                  type: "base64",
                  media_type: "application/pdf",
                  data: base64Data
                }
              }
            ]
          }
        ]
      };
    } else {
      // Using text-only approach (either directly provided text or extraction)
      console.log("Using text extraction approach for AI parsing");
      
      if (Array.isArray(data)) {
        // Use the helper method to prepare the text-only request
        requestOptions = ApiService.prepareTextRequestOptions(data);
      } else {
        throw new Error("Invalid data format for text extraction approach");
      }
    }
    
    console.log("Sending request to Claude with API key:", apiKey.substring(0, 10) + "...");
    console.log("Using model:", requestOptions.model);
    
    // Make the API request
    const response = await ApiService.callClaudeApi(apiKey, requestOptions);
    
    if (!response || !response.content || !response.content.length) {
      throw new Error("Invalid response from Claude AI");
    }
    
    const aiResponse = response.content[0].text;
    console.log("Received response from Claude AI");
    
    // Parse the AI response to extract transaction data
    return parseAIResponseToTransactions(aiResponse);
  } catch (error) {
    console.error("Error parsing with AI:", error);
    throw error;
  }
}

/**
 * Parses Claude AI response text into transaction objects
 */
function parseAIResponseToTransactions(aiResponse: string): Transaction[] {
  const transactions: Transaction[] = [];
  const lines = aiResponse.split('\n');
  
  // Pattern to match common transaction formats in AI response
  const transactionPattern = /(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\s+(.+?)\s+\$?(\d+\.\d{2}|\d+,\d{3}\.\d{2})/i;
  
  for (const line of lines) {
    if (!line.trim()) continue;
    
    // Skip lines that are likely headers or notes
    if (line.includes('TRANSACTION') || line.includes('DATE') || line.includes('AMOUNT') ||
        line.includes('----------') || line.includes('=======') || 
        line.startsWith('#') || line.startsWith('*')) {
      continue;
    }
    
    const match = line.match(transactionPattern);
    if (match) {
      // Extract the date, description, amount
      const [, date, description, amount] = match;
      
      // Clean up the amount (remove commas and keep only numbers)
      const cleanAmount = amount.replace(/[$,]/g, '');
      
      // Create a transaction object
      const transaction: Transaction = {
        date,
        description: description.trim(),
        amount: cleanAmount,
        category: determineCategory(description)
      };
      
      transactions.push(transaction);
    }
  }
  
  // If no transactions were extracted, try with a more lenient approach
  if (transactions.length === 0) {
    console.log("No transactions found with strict pattern, trying lenient parsing");
    
    // Look for date patterns
    const datePattern = /(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/;
    const amountPattern = /\$?(\d+\.\d{2}|\d+,\d{3}\.\d{2})/;
    
    for (const line of lines) {
      if (!line.trim() || line.length < 10) continue;
      
      const dateMatch = line.match(datePattern);
      const amountMatch = line.match(amountPattern);
      
      if (dateMatch && amountMatch) {
        const date = dateMatch[1];
        const amount = amountMatch[1].replace(/[$,]/g, '');
        
        // Extract description (everything between date and amount)
        let description = line.substring(
          line.indexOf(dateMatch[0]) + dateMatch[0].length,
          line.lastIndexOf(amountMatch[0])
        ).trim();
        
        // If description is empty or too short, use the rest of the line
        if (description.length < 3) {
          description = line.replace(dateMatch[0], '').replace(amountMatch[0], '').trim();
        }
        
        // Create a transaction object
        const transaction: Transaction = {
          date,
          description: description,
          amount: amount,
          category: determineCategory(description)
        };
        
        transactions.push(transaction);
      }
    }
  }
  
  console.log(`Extracted ${transactions.length} transactions from AI response`);
  return transactions;
}
