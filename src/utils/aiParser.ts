
import { Transaction } from "./fileConverter";

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

// Determines if we're in a development environment
const isDevelopment = (): boolean => {
  return process.env.NODE_ENV === 'development' || 
         window.location.hostname === 'localhost' || 
         window.location.hostname.includes('127.0.0.1');
};

// Store the HTML response for debugging
let lastHtmlResponse = '';

// Get the last HTML response for debugging
export const getLastHtmlResponse = (): string => {
  return lastHtmlResponse;
};

// Parse transactions using Claude AI via the proxy
export const parseTransactionsWithAI = async (
  pdfText: string[],
  apiKey: string = DEFAULT_CLAUDE_API_KEY
): Promise<Transaction[]> => {
  try {
    // The full text from the PDF
    const fullText = pdfText.join('\n');
    
    // Prepare the prompt for Claude
    const prompt = `
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
    `;

    console.log("Sending request to Claude through proxy with prompt length:", prompt.length);
    
    // Make the request to Claude AI API through our proxy
    const apiUrl = '/api/claude/v1/messages';
    console.log(`Making request to: ${apiUrl}`);
    
    // Add a timestamp to prevent caching
    const timestamp = new Date().getTime();
    const urlWithTimestamp = `${apiUrl}?_t=${timestamp}`;
    
    // Try sending a direct request to the Claude API
    console.log("Using API key:", apiKey ? apiKey.substring(0, 10) + "..." : "No API key provided");
    
    // Use fetch with proper headers
    const requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    };
    
    console.log("Request headers:", JSON.stringify(requestOptions.headers));
    
    // Make the request
    const response = await fetch(urlWithTimestamp, requestOptions);
    
    // Log the response status and details
    console.log('Claude API response status:', response.status);
    console.log('Claude API response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API error status:', response.status);
      console.error('Claude API error response:', errorText);
      
      // Store HTML response
      lastHtmlResponse = errorText;
      
      throw new Error(`Claude API error: ${response.status} - ${errorText}`);
    }
    
    // Get the raw response text first to inspect it
    const responseText = await response.text();
    console.log("Raw API response (first 500 chars):", responseText.substring(0, 500) + "...");
    
    // Store the response for debugging
    lastHtmlResponse = responseText;
    
    // Check if the response appears to be HTML
    if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
      console.error('Received HTML response instead of JSON');
      throw new Error('Received HTML instead of JSON. The proxy configuration may be incorrect.');
    }
    
    // Try to parse the response as JSON
    try {
      const data = JSON.parse(responseText);
      console.log("Claude response parsed as JSON:", data);
      
      // Extract the content from Claude's response
      if (data && data.content && data.content[0] && data.content[0].text) {
        const content = data.content[0].text;
        console.log("Claude content:", content.substring(0, 200) + "...");
        
        // Find the JSON array in the response
        const jsonMatch = content.match(/\[\s*\{.*\}\s*\]/s);
        
        if (jsonMatch) {
          // Parse the JSON data
          const transactions: Transaction[] = JSON.parse(jsonMatch[0]);
          console.log(`Parsed ${transactions.length} transactions from Claude response`);
          return transactions;
        } else {
          // Try to parse the entire content as JSON if it doesn't match the pattern
          try {
            const transactions: Transaction[] = JSON.parse(content);
            console.log(`Parsed ${transactions.length} transactions from full Claude response`);
            return transactions;
          } catch (jsonError) {
            console.error('Could not parse JSON in Claude response', jsonError);
            console.error('Claude response content:', content);
            throw new Error('Failed to parse JSON from Claude response');
          }
        }
      } else {
        console.error('Invalid Claude response structure:', data);
        throw new Error('Invalid Claude response structure');
      }
    } catch (jsonError) {
      console.error('Error parsing Claude API response as JSON:', jsonError);
      console.error('Response was:', responseText.substring(0, 1000) + '...');
      
      // Fallback to the sample transactions from fileConverter.ts
      console.log("Using fallback sample transactions due to parsing error");
      return getFallbackTransactions();
    }
  } catch (error) {
    console.error('Error parsing with AI:', error);
    
    // Provide fallback transactions if there's an error
    console.log("Using fallback sample transactions due to error");
    return getFallbackTransactions();
  }
};

// Fallback transactions for demo purposes
const getFallbackTransactions = (): Transaction[] => {
  return [
    { date: "12/26", description: "WHISKEY JOES BROKEN BOW OK", amount: "51.60", category: "Dining" },
    { date: "12/29", description: "PAYPAL *UBER 866-576-1039 CA", amount: "9.99", category: "Transportation" },
    { date: "12/27", description: "ZSK*IT LOCAL 259 THE M BROKEN BOW OK", amount: "49.30", category: "Other" },
    { date: "12/27", description: "TST*GRATEFUL HEAD PIZZA Broken Bow OK", amount: "28.43", category: "Dining" },
    { date: "12/27", description: "NTTA AUTOCHARGE 972-818-6882 TX", amount: "10.00", category: "Transportation" },
    { date: "12/27", description: "GOOGLE *Google Nest 855-836-3987 CA", amount: "15.99", category: "Bills" },
    { date: "12/29", description: "TESLA SUPERCHARGER US 877-7983752 CA", amount: "13.44", category: "Transportation" },
    { date: "12/29", description: "PANDA EXPRESS #1009 CARROLLTON TX", amount: "21.22", category: "Dining" },
    { date: "12/29", description: "EXXON TIGER MART 88 NEW BOSTON TX", amount: "6.91", category: "Transportation" },
    { date: "12/29", description: "TST*HAYSTACKS Sulphur Sprin TX", amount: "7.49", category: "Dining" },
    { date: "12/30", description: "AMAZON MKTPL*ZE7904W20 Amzn.com/bill WA", amount: "32.00", category: "Shopping" },
    { date: "12/30", description: "DD *DOORDASH POKEWORKS WWW.DOORDASH. CA", amount: "6.24", category: "Dining" },
    { date: "12/30", description: "SQ *EARLS LEGACY WEST Plano TX", amount: "208.81", category: "Dining" },
    { date: "12/31", description: "TST* HAYWIRE - PLANO PLANO TX", amount: "85.69", category: "Dining" },
    { date: "01/01", description: "Boardroom Salon for Men Addison TX", amount: "45.00", category: "Other" }
  ];
};
