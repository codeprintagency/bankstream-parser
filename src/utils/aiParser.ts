
import { Transaction } from "./fileConverter";
import { ApiService } from "./ApiService";

// Default API key for Claude (provided by the user)
const DEFAULT_CLAUDE_API_KEY = "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";

// Check if a user has premium access
export const hasPremiumAccess = (): boolean => {
  // In a production app, this would check server-side subscription status
  // For demonstration, we'll use localStorage
  return localStorage.getItem('premium_access') === 'true';
};

// Toggle premium access (for demo purposes)
export const togglePremiumAccess = (): boolean => {
  const currentStatus = localStorage.getItem('premium_access') === 'true';
  const newStatus = !currentStatus;
  localStorage.setItem('premium_access', newStatus.toString());
  return newStatus;
};

// Get the last HTML response for debugging
export const getLastHtmlResponse = (): string => {
  return ApiService.getLastRawResponse();
};

// This function attempts to extract JSON from various formats (including malformed responses)
function extractJsonFromResponse(responseText: string): any {
  try {
    // First try direct JSON parsing
    return JSON.parse(responseText);
  } catch (e) {
    console.log("Failed direct JSON parsing, trying regex extraction");
    
    // If that fails, try to extract JSON using regex patterns
    try {
      // Try to find an array of objects
      const jsonMatch = responseText.match(/\[\s*\{.*\}\s*\]/s);
      if (jsonMatch) {
        console.log("Found JSON array match using regex");
        return JSON.parse(jsonMatch[0]);
      }
      
      // Try to find a single JSON object
      const objectMatch = responseText.match(/\{\s*".*"\s*:.+\}/s);
      if (objectMatch) {
        console.log("Found JSON object match using regex");
        return JSON.parse(objectMatch[0]);
      }
      
      // Try to look for markdown code blocks with JSON
      const markdownMatch = responseText.match(/```(?:json)?\s*(\[.+\])\s*```/s);
      if (markdownMatch && markdownMatch[1]) {
        console.log("Found JSON in markdown code block");
        return JSON.parse(markdownMatch[1]);
      }
    } catch (regexError) {
      console.error("Failed to extract JSON using regex", regexError);
    }
    
    // If all parsing attempts fail, throw error
    throw new Error("Could not extract valid JSON from response. Response begins with: " + responseText.substring(0, 100));
  }
}

// Convert PDF content to base64 for Claude API
export const pdfToBase64 = (pdfBuffer: ArrayBuffer): string => {
  // Convert ArrayBuffer to Base64
  const binary = new Uint8Array(pdfBuffer);
  const bytes: string[] = [];
  for (let i = 0; i < binary.byteLength; i++) {
    bytes.push(String.fromCharCode(binary[i]));
  }
  return btoa(bytes.join(''));
};

// Parse transactions using Claude AI with support for PDF documents
export const parseTransactionsWithAI = async (
  pdfData: string[] | ArrayBuffer,
  apiKey: string = DEFAULT_CLAUDE_API_KEY
): Promise<Transaction[]> => {
  try {
    console.log("Starting AI parsing process");
    
    let messages;
    let modelToUse = "claude-3-haiku-20240307"; // Default model
    
    // Check if we're receiving raw PDF data (ArrayBuffer) or extracted text
    if (pdfData instanceof ArrayBuffer) {
      console.log("Received raw PDF data, using document-based API call");
      const base64Data = pdfToBase64(pdfData);
      console.log("PDF converted to base64, size:", base64Data.length);
      
      // When sending PDFs directly, we need to use the newer model that supports PDFs
      modelToUse = "claude-3-5-sonnet-20241022";
      
      messages = [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: base64Data
              }
            },
            {
              type: "text",
              text: `
                You are a financial data extraction specialist. I need you to extract ALL transactions from this bank statement PDF.
                
                Instructions:
                1. Identify every transaction including the date, description, and amount
                2. For descriptions with multiple lines, combine them into a single coherent description
                3. Categorize each transaction (categories: Dining, Groceries, Transportation, Shopping, Bills, Entertainment, Health, Income, Transfer, Other)
                4. Format amounts as numeric values (e.g., "51.60" not "$51.60")
                5. Use MM/DD format for dates (e.g., "12/25")
                6. Be thorough - capture EVERY transaction, even if the format is irregular
                7. If amounts appear to be deposits or credits, include them with the correct sign
                
                VERY IMPORTANT: Format your response as a clean JSON array with NO explanations or other text before or after the JSON.
                Each transaction should have these fields:
                {
                  "date": "MM/DD",
                  "description": "Merchant name and details",
                  "amount": "XX.XX",
                  "category": "Category name"
                }
              `
            }
          ]
        }
      ];
    } else {
      // The full text from the PDF (text-based approach)
      const fullText = pdfData.join('\n');
      
      // Prepare the prompt for Claude (text-based approach)
      messages = [
        {
          role: "user",
          content: `
            You are a financial data extraction specialist. I need you to extract ALL transactions from the following bank statement text.
            
            Instructions:
            1. Identify every transaction including the date, description, and amount
            2. For descriptions with multiple lines, combine them into a single coherent description
            3. Categorize each transaction (categories: Dining, Groceries, Transportation, Shopping, Bills, Entertainment, Health, Income, Transfer, Other)
            4. Format amounts as numeric values (e.g., "51.60" not "$51.60")
            5. Use MM/DD format for dates (e.g., "12/25")
            6. Be thorough - capture EVERY transaction, even if the format is irregular
            7. If amounts appear to be deposits or credits, include them with the correct sign
            
            VERY IMPORTANT: Format your response as a clean JSON array with NO explanations or other text before or after the JSON.
            Each transaction should have these fields:
            {
              "date": "MM/DD",
              "description": "Merchant name and details",
              "amount": "XX.XX",
              "category": "Category name"
            }
            
            Here is the bank statement:
            ${fullText.substring(0, 12000)}
          `
        }
      ];
    }

    console.log("Sending request to Claude with API key:", apiKey.substring(0, 8) + "...");
    console.log("Using model:", modelToUse);
    
    // Prepare request options
    const options = {
      model: modelToUse,
      max_tokens: 4000,
      messages
    };
    
    // Call the Claude API
    const data = await ApiService.callClaudeApi(apiKey, options);
    
    console.log("Claude API response received");
    
    if (data && data.content && data.content[0] && data.content[0].text) {
      const content = data.content[0].text;
      console.log("Claude content preview:", content.substring(0, 200) + "...");
      
      // Try to parse the content as JSON or extract JSON from it
      try {
        const transactions: Transaction[] = extractJsonFromResponse(content);
        console.log(`Parsed ${transactions.length} transactions from Claude response`);
        return transactions;
      } catch (jsonError) {
        console.error('Could not parse JSON in Claude response', jsonError);
        console.error('Claude response content:', content);
        
        throw new Error('Failed to parse JSON from Claude response. Check the debug info for details.');
      }
    } else {
      console.error('Invalid Claude response structure:', data);
      throw new Error('Invalid Claude response structure. Check the debug info for details.');
    }
  } catch (error: any) {
    console.error('Error parsing with AI:', error);
    
    // Throw with a better error message
    throw new Error(`${error.message || 'Unknown error occurred while parsing with AI'}`);
  }
};
