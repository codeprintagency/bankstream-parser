
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
      
      // Use the server proxy instead of direct API call
      const apiUrl = `/api/claude/v1/messages?_t=${timestamp}`;
      
      console.log("API URL:", apiUrl);
      console.log("Using model:", options.model);
      
      // Check if we're dealing with PDF documents
      const hasPdfDocuments = isPdfRequest(options);
      if (hasPdfDocuments) {
        console.log("Detected PDF document in request. Using PDF-compatible model.");
      }
      
      const controller = new AbortController();
      // Set a timeout of 45 seconds for PDF processing (it can take longer)
      const timeoutId = setTimeout(() => controller.abort(), hasPdfDocuments ? 45000 : 30000);
      
      // Always use the server proxy instead of direct API calls to avoid CORS
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      };
      
      // Add the PDF beta header if we're dealing with documents
      if (hasPdfDocuments) {
        headers["anthropic-beta"] = "pdfs-2024-09-25";
        console.log("Adding PDF beta header for document processing");
      }
      
      console.log("Request payload size:", JSON.stringify(options).length);
      
      try {
        // Make the request through our proxy
        const response = await fetch(apiUrl, {
          method: "POST",
          headers,
          body: JSON.stringify(options),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        // Log the response status
        console.log("API response status:", response.status);
        
        // Get the raw text response for debugging
        const responseText = await response.text();
        this.lastRawResponse = responseText;
        
        // Check if the response is HTML
        const isHtml = 
          responseText.trim().startsWith('<!DOCTYPE') || 
          responseText.trim().startsWith('<html') ||
          responseText.includes('<head>') || 
          responseText.includes('<body>');
        
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
      } catch (fetchError: any) {
        if (fetchError.name === 'AbortError') {
          throw new Error("Request timed out. This might happen with large PDFs, try again or use text extraction instead.");
        }
        throw fetchError;
      }
    } catch (error: any) {
      console.error("Error calling Claude API:", error);
      this.lastRawResponse = error.message || `Error: ${error}`;
      throw error;
    }
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
