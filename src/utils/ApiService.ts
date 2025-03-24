
/**
 * Service for making API requests to Claude AI
 */

interface ClaudeRequestOptions {
  model: string;
  max_tokens: number;
  messages: {
    role: string;
    content: string | Array<{type: string, text?: string, source?: any}>;
  }[];
}

export class ApiService {
  // Storage for raw responses for debugging
  static lastRawResponse: string = '';
  
  // Make an API request directly to Claude API with the new header
  static async callClaudeApi(
    apiKey: string,
    options: ClaudeRequestOptions
  ): Promise<any> {
    try {
      console.log("Making API request to Claude");
      
      // Add a timestamp to prevent caching
      const timestamp = new Date().getTime();
      const apiUrl = `/api/claude/v1/messages?_t=${timestamp}`;
      
      console.log("API URL:", apiUrl);
      
      const controller = new AbortController();
      // Set a timeout of 30 seconds
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      // Prepare headers with the PDF beta support and CORS access
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
      };
      
      // Add the PDF beta header if we're dealing with documents
      if (isPdfRequest(options)) {
        headers["anthropic-beta"] = "pdfs-2024-09-25";
        console.log("Adding PDF beta header for document processing");
      }
      
      // Make the request through our proxy
      const response = await fetch(apiUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(options),
        credentials: 'same-origin',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      // Log the response status
      console.log("API response status:", response.status);
      console.log("Response headers:", Object.fromEntries([...response.headers.entries()]));
      
      // Get the content type header
      const contentType = response.headers.get('content-type') || '';
      console.log("Content-Type:", contentType);
      
      // Get the raw text response for debugging
      const responseText = await response.text();
      this.lastRawResponse = responseText;
      
      // More comprehensive check for HTML responses
      const isHtml = 
        contentType.includes('text/html') || 
        responseText.trim().startsWith('<!DOCTYPE') || 
        responseText.trim().startsWith('<html') ||
        responseText.includes('<head>') || 
        responseText.includes('<body>') ||
        responseText.includes('<script') || 
        responseText.includes('<div');
      
      if (isHtml) {
        console.error("Received HTML instead of JSON from API:", responseText.substring(0, 500));
        throw new Error("Received HTML instead of JSON. The server is likely returning an error page. Check the debug modal for details.");
      }
      
      if (!response.ok) {
        const errorMsg = `API error: ${response.status} - ${responseText}`;
        console.error(errorMsg);
        throw new Error(errorMsg);
      }
      
      // Try to parse the response as JSON
      try {
        const jsonData = JSON.parse(responseText);
        return jsonData;
      } catch (error) {
        console.error("Failed to parse response as JSON:", error);
        throw new Error(`Failed to parse response as JSON: ${responseText.substring(0, 100)}...`);
      }
    } catch (error: any) {
      console.error("Error calling Claude API:", error);
      this.lastRawResponse = error.message || `Error: ${error}`;
      throw error;
    }
  }
  
  // Helper to check if we're sending a PDF document
  static isPdfDocument(content: any): boolean {
    if (Array.isArray(content)) {
      return content.some(item => 
        item.type === 'document' && 
        item.source?.type === 'base64' && 
        item.source?.media_type === 'application/pdf'
      );
    }
    return false;
  }
  
  // Get the last raw response for debugging
  static getLastRawResponse(): string {
    return this.lastRawResponse;
  }
}

// Helper function to check if the request contains PDF documents
function isPdfRequest(options: ClaudeRequestOptions): boolean {
  return options.messages.some(message => {
    if (typeof message.content === 'string') {
      return false;
    }
    return Array.isArray(message.content) && 
      message.content.some(item => 
        item.type === 'document' && 
        item.source?.type === 'base64' && 
        item.source?.media_type === 'application/pdf'
      );
  });
}
