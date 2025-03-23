
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
  
  // Make an API request directly to Claude API with the new header
  static async callClaudeApi(
    apiKey: string,
    options: ClaudeRequestOptions
  ): Promise<any> {
    try {
      console.log("Making direct API request to Claude");
      
      // Add a timestamp to prevent caching
      const timestamp = new Date().getTime();
      const apiUrl = `https://api.anthropic.com/v1/messages?_t=${timestamp}`;
      
      console.log("API URL:", apiUrl);
      
      const controller = new AbortController();
      // Set a timeout of 30 seconds
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      // Make the direct request with the new header
      const response = await fetch(apiUrl, {
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
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      // Log the response status
      console.log("Direct API response status:", response.status);
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
        console.error("Received HTML instead of JSON from API:", responseText.substring(0, 200));
        throw new Error("Received HTML instead of JSON. The server is likely returning an error page. Check the debug modal for details.");
      }
      
      if (!response.ok) {
        const errorMsg = `Direct API error: ${response.status} - ${responseText}`;
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
      console.error("Error calling Claude API directly:", error);
      this.lastRawResponse = `Error: ${error.message}`;
      throw error;
    }
  }
  
  // Original proxy method - kept as fallback
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
        throw new Error("Received HTML instead of JSON. The server is likely returning an error page. Check the debug modal for details.");
      }
      
      if (!response.ok) {
        const errorMsg = `Proxy error: ${response.status}`;
        console.error(errorMsg, responseText);
        throw new Error(`${errorMsg} - ${responseText}`);
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
      console.error("Error calling Claude API via proxy:", error);
      this.lastRawResponse = `Error: ${error.message}`;
      throw error;
    }
  }
  
  // Get the last raw response for debugging
  static getLastRawResponse(): string {
    return this.lastRawResponse;
  }
}
