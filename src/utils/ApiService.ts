
/**
 * Service for making API requests to Claude AI
 */

interface ClaudeRequestOptions {
  model: string;
  max_tokens: number;
  messages: {
    role: string;
    content: string;
  }[];
}

export class ApiService {
  // Storage for raw responses for debugging
  static lastRawResponse: string = '';
  
  // Make a direct API request to Claude - with no-cors mode to bypass CORS restrictions
  static async callClaudeApi(
    apiKey: string,
    options: ClaudeRequestOptions
  ): Promise<any> {
    try {
      console.log("Making direct API request to Claude in no-cors mode");
      
      try {
        // Use no-cors mode to bypass CORS restrictions
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
            "anthropic-dangerous-direct-browser-access": "true"
          },
          body: JSON.stringify(options),
          mode: 'no-cors', // This is the key change - use no-cors mode
          credentials: 'omit'
        });
        
        // When using no-cors, response will be opaque - we can't read its content
        console.log("Response status with no-cors:", response.status, response.type);
        
        // Store info about the opaque response for debugging
        this.lastRawResponse = "No-cors response: opaque response, cannot read content. Status: " + 
                               response.status + ", Type: " + response.type;
        
        // Since we can't read the response with no-cors, we'll return a placeholder
        // that indicates we should use the proxy instead
        return { 
          _opaque_response: true,
          message: "No-cors mode used - opaque response received. Use proxy instead."
        };
      } catch (error) {
        console.error("Error with direct API call:", error);
        this.lastRawResponse = "Error with direct API call: " + (error as Error).message;
        throw error;
      }
    } catch (error) {
      console.error("Error calling Claude API directly:", error);
      this.lastRawResponse = "Error calling Claude API directly: " + (error as Error).message;
      throw error;
    }
  }
  
  // Make an API request through the proxy
  static async callClaudeApiViaProxy(
    apiKey: string,
    options: ClaudeRequestOptions
  ): Promise<any> {
    try {
      console.log("Making API request to Claude through proxy");
      
      // Add a timestamp to prevent caching
      const timestamp = new Date().getTime();
      
      // Try making the request to our backend proxy
      const response = await fetch(`/api/claude/v1/messages?_t=${timestamp}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
          "Expires": "0"
        },
        body: JSON.stringify(options),
        mode: 'cors',
        credentials: 'same-origin'
      });
      
      // Get the raw text response for debugging
      const responseText = await response.text();
      this.lastRawResponse = responseText;
      
      // Log the response for debugging
      console.log("Proxy response status:", response.status);
      console.log("Response headers:", response.headers);
      
      // Check if the response contains HTML
      if (responseText.trim().startsWith('<!DOCTYPE') || 
          responseText.trim().startsWith('<html') ||
          responseText.includes('<head>') || 
          responseText.includes('<body>')) {
        console.error("Received HTML instead of JSON from proxy:", responseText.substring(0, 200));
        throw new Error('Received HTML instead of JSON');
      }
      
      if (!response.ok) {
        const errorMsg = `Proxy error: ${response.status}`;
        console.error(errorMsg, responseText);
        throw new Error(errorMsg);
      }
      
      // Try to parse the response as JSON
      try {
        return JSON.parse(responseText);
      } catch (error) {
        console.error("Failed to parse response as JSON:", error);
        throw new Error('Invalid JSON response');
      }
    } catch (error) {
      console.error("Error calling Claude API via proxy:", error);
      throw error;
    }
  }
  
  // Get the last raw response for debugging
  static getLastRawResponse(): string {
    return this.lastRawResponse;
  }
}
