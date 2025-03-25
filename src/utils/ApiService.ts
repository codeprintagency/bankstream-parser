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
      // This will work both on localhost and when deployed to cloud providers
      // Get the current URL's port if we're in a browser environment
      let apiUrl = `/api/claude/v1/messages?_t=${timestamp}`;
      
      console.log("API URL:", apiUrl);
      console.log("Using model:", options.model);
      
      // Check if we're dealing with PDF documents
      const hasPdfDocuments = isPdfRequest(options);
      if (hasPdfDocuments) {
        console.log("Detected PDF document in request. Using PDF-compatible model.");
        console.log("PDF document size:", estimatePdfSize(options));
      }
      
      // Set longer timeout for PDF processing - increased for cloud environments
      const isRenderEnvironment = window.location.hostname.includes('.onrender.com');
      const isDigitalOceanEnvironment = window.location.hostname.includes('.digitalocean.app');
      const isCloudEnvironment = isRenderEnvironment || isDigitalOceanEnvironment || 
                                window.location.hostname !== 'localhost';
      
      console.log("Environment detection:", {
        isRenderEnvironment,
        isDigitalOceanEnvironment,
        isCloudEnvironment,
        hostname: window.location.hostname
      });
      
      const pdfTimeout = isCloudEnvironment ? 240000 : 90000; // 4 minutes for cloud, 1.5 minutes for local
      const regularTimeout = isCloudEnvironment ? 90000 : 45000; // 1.5 minutes for cloud, 45s for local
      
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(), 
        hasPdfDocuments ? pdfTimeout : regularTimeout
      );
      console.log(`Setting request timeout to ${hasPdfDocuments ? (pdfTimeout/1000) : (regularTimeout/1000)}s`);
      
      // Headers according to Claude's documentation
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true" // Add this header for direct browser access
      };
      
      // Add the PDF beta header if we're dealing with documents
      if (hasPdfDocuments) {
        headers["anthropic-beta"] = "pdfs-2023-01-01"; // Updated to match their supported version
        console.log("Adding PDF beta header for document processing");
      }
      
      const requestPayload = JSON.stringify(options);
      console.log("Request payload size:", requestPayload.length, "bytes");
      
      // Only log headers without the API key for security
      const sanitizedHeaders = {...headers};
      if (sanitizedHeaders["x-api-key"]) {
        sanitizedHeaders["x-api-key"] = sanitizedHeaders["x-api-key"].substring(0, 10) + "...";
      }
      console.log("Request headers:", JSON.stringify(sanitizedHeaders, null, 2));
      
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
          // Check if it's a cloud provider timeout page
          if (responseText.includes('upstream_reset_before_response_started') || 
              responseText.includes('upstream_connect_timeout') ||
              responseText.includes('Request Timeout') ||
              responseText.includes('Gateway Timeout') ||
              response.status === 504 || 
              response.status === 503 || 
              response.status === 502) {
            console.error("Gateway timeout from cloud provider. The PDF processing request took too long.");
            throw new Error("Gateway timeout. PDF processing is taking too long. Please use text extraction instead of direct PDF upload.");
          } else {
            console.error("Received HTML instead of JSON from API:", responseText.substring(0, 500));
            throw new Error("Received HTML instead of JSON. This usually happens due to CORS issues or server misconfiguration.");
          }
        }
        
        // Error handling and response parsing
        if (!response.ok) {
          let errorMessage = `API error: ${response.status}`;
          
          // Try to parse error message from response if possible
          try {
            const errorObj = JSON.parse(responseText);
            if (errorObj.error) {
              errorMessage += ` - ${errorObj.error.type || ''}: ${errorObj.error.message || 'Unknown error'}`;
            }
          } catch (e) {
            errorMessage += ` - ${responseText.substring(0, 200)}`;
          }
          
          console.error(errorMessage);
          throw new Error(errorMessage);
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
          throw new Error("Request timed out. Please try again with text extraction instead of direct PDF upload.");
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

  // Prepare Claude API options for text-only requests (no PDF documents)
  static prepareTextRequestOptions(extractedText: string[], model: string = "claude-3-opus-20240229"): ClaudeRequestOptions {
    // Join the text from different pages with page markers
    const formattedText = extractedText.map((pageText, index) => 
      `--- PAGE ${index + 1} ---\n${pageText}`
    ).join('\n\n');
    
    // Create a standard text request (no PDF documents)
    return {
      model: model,
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Please extract all financial transactions from this bank statement. Format each transaction with date, description, and amount. The statement text is:\n\n${formattedText}`
            }
          ]
        }
      ]
    };
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
