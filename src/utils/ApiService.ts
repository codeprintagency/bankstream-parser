
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
  
  // Make a direct API request to Claude - with fetch directly (not recommended due to CORS)
  static async callClaudeApi(
    apiKey: string,
    options: ClaudeRequestOptions
  ): Promise<any> {
    try {
      console.log("Making direct API request to Claude with fetch API");
      
      const controller = new AbortController();
      // Set a timeout of 30 seconds
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      try {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
            "anthropic-dangerous-direct-browser-access": "true"
          },
          body: JSON.stringify(options),
          mode: 'cors', // Standard CORS mode
          credentials: 'omit',
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        console.log("Direct API response status:", response.status);
        console.log("Direct API response type:", response.type);
        
        if (!response.ok) {
          const errorText = await response.text();
          this.lastRawResponse = errorText;
          throw new Error(`Direct API error: ${response.status} - ${errorText}`);
        }
        
        const responseData = await response.json();
        this.lastRawResponse = JSON.stringify(responseData, null, 2);
        return responseData;
      } catch (error) {
        clearTimeout(timeoutId);
        
        if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
          console.error("CORS error with direct API call:", error);
          this.lastRawResponse = "CORS error with direct API call: " + (error as Error).message;
          throw new Error("CORS error: The browser blocked the direct API request due to cross-origin restrictions.");
        }
        
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
      const proxyUrl = `/api/claude/v1/messages?_t=${timestamp}`;
      
      console.log("Proxy URL:", proxyUrl);
      
      const controller = new AbortController();
      // Set a timeout of 30 seconds
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      // Try making the request to our backend proxy
      const response = await fetch(proxyUrl, {
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
        credentials: 'same-origin',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      // Log the response status
      console.log("Proxy response status:", response.status);
      console.log("Response headers:", Object.fromEntries([...response.headers.entries()]));
      
      // Get the content type header
      const contentType = response.headers.get('content-type') || '';
      console.log("Content-Type:", contentType);
      
      // Get the raw text response for debugging
      const responseText = await response.text();
      this.lastRawResponse = responseText;
      
      // Check if the response contains HTML
      if (contentType.includes('text/html') || 
          responseText.trim().startsWith('<!DOCTYPE') || 
          responseText.trim().startsWith('<html') ||
          responseText.includes('<head>') || 
          responseText.includes('<body>')) {
        console.error("Received HTML instead of JSON from proxy:", responseText.substring(0, 200));
        
        // Let's try the direct API as a fallback
        console.log("Falling back to direct API call");
        return this.callClaudeApi(apiKey, options);
      }
      
      if (!response.ok) {
        const errorMsg = `Proxy error: ${response.status}`;
        console.error(errorMsg, responseText);
        throw new Error(errorMsg);
      }
      
      // Try to parse the response as JSON
      try {
        const jsonData = JSON.parse(responseText);
        return jsonData;
      } catch (error) {
        console.error("Failed to parse response as JSON:", error);
        
        // If we can't parse JSON and it's not HTML, try the direct API as a fallback
        console.log("Response is not valid JSON, falling back to direct API call");
        return this.callClaudeApi(apiKey, options);
      }
    } catch (error) {
      console.error("Error calling Claude API via proxy:", error);
      
      // As a last resort, try direct API call with standard CORS mode
      console.log("Proxy failed, falling back to direct API call");
      return this.callClaudeApi(apiKey, options);
    }
  }
  
  // Get the last raw response for debugging
  static getLastRawResponse(): string {
    return this.lastRawResponse;
  }
}
