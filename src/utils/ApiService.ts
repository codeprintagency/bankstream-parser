
// Update the ApiService to use a server-side API key
export class ApiService {
  /**
   * Prepares the request options for a text-based API call
   */
  static prepareTextRequestOptions(extractedText: string[]) {
    return {
      model: "claude-3-haiku-20240307",
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Please extract all financial transactions from this bank statement text. Include date, description, and amount for each transaction.\n\nStatement content:\n${extractedText.join('\n\n--- PAGE BREAK ---\n\n')}`
            }
          ]
        }
      ]
    };
  }
  
  /**
   * Prepares the request options for a direct PDF API call
   */
  static preparePdfRequestOptions(pdfBase64: string) {
    return {
      model: "claude-3-haiku-20240307",
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
                data: pdfBase64
              }
            }
          ]
        }
      ]
    };
  }

  /**
   * Makes an API call to Claude
   */
  static async callClaudeApi(requestOptions: any) {
    // Use our server's API endpoint which will include the API key
    const response = await fetch('/api/claude/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'documentation-fix-2023-08-14'
      },
      body: JSON.stringify(requestOptions)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("API Error:", errorText);
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }
}
