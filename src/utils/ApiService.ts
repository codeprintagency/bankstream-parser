import { Transaction } from '../types/Transaction';

export class ApiService {
  // Parse Claude's response to extract transactions
  static async parseResponse(
    response: string,
    filename: string,
    onProgress?: (progress: number) => void
  ): Promise<Transaction[]> {
    try {
      if (onProgress) onProgress(50);

      // Basic parsing logic (customize as needed)
      const lines = response.split('\n');
      const transactions: Transaction[] = [];

      for (const line of lines) {
        if (line.includes('|')) {
          const parts = line.split('|').map(p => p.trim());
          if (parts.length === 4) {
            const [date, description, amount, type] = parts;
            if (date !== 'Date') { // Skip header row
              transactions.push({
                date,
                description,
                amount: parseFloat(amount),
                type,
                filename,
              });
            }
          }
        }
      }

      if (onProgress) onProgress(100);
      return transactions;
    } catch (error) {
      console.error("Error parsing Claude's response:", error);
      throw error;
    }
  }

  // Send PDF file ID to Claude for processing
  static async sendPdfToClaudeWithFileId(
    fileId: string, 
    apiKey: string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    try {
      if (onProgress) onProgress(10);
      
      const requestBody = {
        model: "claude-3-haiku-20240307",
        max_tokens: 4000,
        messages: [
          {
            role: "user",
            content: [
              { 
                type: "text", 
                text: "Please extract all banking transactions from this PDF statement. Format them as a table with headers for date, description, amount, and transaction type (credit/debit). If specific categories are present in the statement, include those as well. Make the response structured so it's easy to parse programmatically." 
              },
              { 
                type: "file", 
                file_id: fileId 
              }
            ]
          }
        ]
      };

      if (onProgress) onProgress(20);
      
      // Use the proxy server endpoint
      const response = await fetch('/api/claude/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(requestBody)
      });

      if (onProgress) onProgress(70);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to process PDF: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      
      if (onProgress) onProgress(90);
      
      // Extract the content from Claude's response
      const content = data.content?.[0]?.text || '';
      
      if (onProgress) onProgress(100);
      
      return content;
    } catch (error) {
      console.error("Error sending PDF to Claude:", error);
      throw error;
    }
  }
}
