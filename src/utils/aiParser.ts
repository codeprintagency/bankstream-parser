
import { Transaction } from "./fileConverter";

// Default API key for Claude (for demo purposes)
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
      ${fullText}
    `;

    console.log("Sending request to Claude through proxy with prompt length:", prompt.length);
    
    // Make the request directly to Claude AI API (no proxy)
    const apiUrl = '/api/claude/v1/messages';
    console.log(`Making request to: ${apiUrl}`);
    
    const requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
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
    
    const response = await fetch(apiUrl, requestOptions);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API error status:', response.status);
      console.error('Claude API error response:', errorText);
      throw new Error(`Claude API error: ${response.status} - ${errorText}`);
    }
    
    // Log the raw response for debugging
    const responseText = await response.text();
    console.log("Raw API response:", responseText.substring(0, 500) + "...");
    
    try {
      // Try to parse the response as JSON
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
      
      // Check if the response looks like HTML
      if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
        throw new Error('Received HTML instead of JSON. The proxy configuration may be incorrect.');
      }
      
      throw new Error(`Failed to parse Claude response: ${jsonError.message}`);
    }
  } catch (error) {
    console.error('Error parsing with AI:', error);
    throw error;
  }
};
