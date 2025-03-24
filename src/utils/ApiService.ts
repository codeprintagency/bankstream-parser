
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
  
  // Make an API request directly to Claude API with the proper headers
  static async callClaudeApi(
    apiKey: string,
    options: ClaudeRequestOptions
  ): Promise<any> {
    try {
      console.log("Making API request to Claude");
      console.log("Request details:", JSON.stringify({
        model: options.model,
        message_count: options.messages.length,
        has_documents: isPdfRequest(options)
      }));
      
      // Add a timestamp to prevent caching
      const timestamp = new Date().getTime();
      
      // Use the proxy URL for all requests - crucial for CORS
      const apiUrl = `/api/claude/v1/messages?_t=${timestamp}`;
      
      console.log("API URL:", apiUrl);
      console.log("Using model:", options.model);
      
      // Check if we're dealing with PDF documents
      const hasPdfDocuments = isPdfRequest(options);
      if (hasPdfDocuments) {
        console.log("Detected PDF document in request. Using PDF-compatible model.");
        console.log("PDF document size:", estimatePdfSize(options));
      }
      
      const controller = new AbortController();
      // Set a timeout of 45 seconds for PDF processing (it can take longer)
      const timeoutId = setTimeout(() => controller.abort(), hasPdfDocuments ? 45000 : 30000);
      
      // Headers according to Claude's documentation
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      };
      
      // Add the PDF beta header if we're dealing with documents
      if (hasPdfDocuments) {
        headers["anthropic-beta"] = "pdfs-2023-01-01"; // Updated to match their supported version
        console.log("Adding PDF beta header for document processing");
      }
      
      const requestPayload = JSON.stringify(options);
      console.log("Request payload size:", requestPayload.length, "bytes");
      console.log("Request headers:", JSON.stringify(headers, null, 2));
      
      try {
        // Make the request through our proxy
        console.log("Sending request to proxy...");
        const response = await fetch(apiUrl, {
          method: "POST",
          headers,
          body: requestPayload,
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        // Log the response status and headers
        console.log("API response status:", response.status);
        console.log("API response headers:", JSON.stringify(Object.fromEntries([...response.headers.entries()]), null, 2));
        
        // Get the raw text response for debugging
        const responseText = await response.text();
        this.lastRawResponse = responseText;
        
        console.log("Response content type:", response.headers.get('content-type'));
        console.log("Response text (first 200 chars):", responseText.substring(0, 200));
        
        // Check if the response is HTML
        const isHtml = 
          responseText.trim().startsWith('<!DOCTYPE') || 
          responseText.trim().startsWith('<html') ||
          responseText.includes('<head>') || 
          responseText.includes('<body>');
        
        if (isHtml) {
          console.error("Received HTML instead of JSON from API:", responseText.substring(0, 500));
          throw new Error("Received HTML instead of JSON. Make sure you're running the app with 'node server.js' to use the proxy server correctly.");
        }
        
        if (!response.ok) {
          const errorMsg = `API error: ${response.status} - ${responseText}`;
          console.error(errorMsg);
          throw new Error(errorMsg);
        }
        
        // Try to parse the response as JSON
        try {
          const jsonData = JSON.parse(responseText);
          console.log("Successfully parsed JSON response");
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

// Helper function to estimate PDF size for logging
function estimatePdfSize(options: ClaudeRequestOptions): string {
  let totalSize = 0;
  
  options.messages.forEach(message => {
    if (Array.isArray(message.content)) {
      message.content.forEach(item => {
        if (item.type === 'document' && item.source?.type === 'base64' && item.source?.data) {
          totalSize += item.source.data.length * 0.75; // Base64 is ~4/3 times the size of binary
        }
      });
    }
  });
  
  // Convert to KB or MB for readability
  if (totalSize > 1024 * 1024) {
    return (totalSize / (1024 * 1024)).toFixed(2) + " MB";
  } else if (totalSize > 1024) {
    return (totalSize / 1024).toFixed(2) + " KB";
  }
  return totalSize + " bytes";
}
