
import { Transaction } from "./fileConverter";

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

// Parse transactions using Claude AI
export const parseTransactionsWithAI = async (
  pdfText: string[],
  apiKey: string
): Promise<Transaction[]> => {
  try {
    // The full text from the PDF
    const fullText = pdfText.join('\n');
    
    // Prepare the prompt for Claude
    const prompt = `
      You are a financial data extraction assistant. Please extract ALL transactions from the following bank statement.
      Format your response as a JSON array of objects, ONLY include the JSON with no explanations or other text.
      Each transaction object should have these exact fields:
      - date: string (in the format MM/DD)
      - description: string
      - amount: string (as a numeric string with no currency symbol)
      - category: string (categorize as: Dining, Groceries, Transportation, Shopping, Bills, Entertainment, Health, Income, Transfer, Other)
      
      Here is the bank statement text:
      ${fullText}
    `;

    // Make the request to Claude AI API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
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
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Claude API error:', errorData);
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Extract the content from Claude's response
    const content = data.content[0].text;
    
    // Find the JSON array in the response
    const jsonMatch = content.match(/\[\s*\{.*\}\s*\]/s);
    
    if (jsonMatch) {
      // Parse the JSON data
      const transactions: Transaction[] = JSON.parse(jsonMatch[0]);
      return transactions;
    } else {
      console.error('Could not find JSON in Claude response');
      return [];
    }
  } catch (error) {
    console.error('Error parsing with AI:', error);
    throw error;
  }
};
