
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
  
  // Make a direct API request to Claude
  static async callClaudeApi(
    apiKey: string,
    options: ClaudeRequestOptions
  ): Promise<any> {
    try {
      console.log("Making direct API request to Claude");
      
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify(options)
      });
      
      // Store raw response for debugging
      const responseText = await response.text();
      this.lastRawResponse = responseText;
      
      // Log full response for debugging
      console.log("Full Claude API response:", responseText);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      // Check if the response is HTML
      if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
        throw new Error('Received HTML instead of JSON');
      }
      
      // Parse JSON response
      try {
        return JSON.parse(responseText);
      } catch (error) {
        console.error("Failed to parse response as JSON:", error);
        throw new Error('Invalid JSON response');
      }
    } catch (error) {
      console.error("Error calling Claude API directly:", error);
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
      const url = `/api/claude/v1/messages?_t=${timestamp}`;
      
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
          "Expires": "0"
        },
        body: JSON.stringify(options)
      });
      
      // Store raw response for debugging
      const responseText = await response.text();
      this.lastRawResponse = responseText;
      
      // Log full response for debugging
      console.log("Full proxy response:", responseText);
      
      if (!response.ok) {
        throw new Error(`Proxy error: ${response.status}`);
      }
      
      // Check if the response is HTML
      if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
        throw new Error('Received HTML instead of JSON');
      }
      
      // Parse JSON response
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
  
  // Try both direct API and proxy, with fallback logic
  static async callClaudeWithFallback(
    apiKey: string,
    options: ClaudeRequestOptions
  ): Promise<any> {
    try {
      // First try direct API
      return await this.callClaudeApi(apiKey, options);
    } catch (error) {
      console.log("Direct API call failed, falling back to proxy:", error);
      
      // Then try proxy
      return await this.callClaudeApiViaProxy(apiKey, options);
    }
  }
  
  // Get the last raw response for debugging
  static getLastRawResponse(): string {
    return this.lastRawResponse;
  }
}
