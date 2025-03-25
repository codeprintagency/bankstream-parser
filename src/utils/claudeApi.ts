
export async function uploadFileToClaudeProxy(file: File, apiKey: string, onProgress?: (progress: number) => void) {
  // Create FormData with the file
  const formData = new FormData();
  formData.append('file', file);
  formData.append('purpose', 'attachments');

  // Set up the request
  const url = '/api/claude/v1/files';
  
  try {
    // Make the request to our proxy server
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to upload file: ${errorData.error?.message || response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error uploading file to Claude:', error);
    throw error;
  }
}

export async function processFileWithClaude(fileId: string, apiKey: string) {
  try {
    // Now use the file ID to send to Claude for processing
    const aiResponse = await fetch('/api/claude/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: "claude-3-opus-20240229",
        max_tokens: 4000,
        system: "You are a financial assistant specializing in extracting transaction data from bank statements. Extract all transactions with their date, description, and amount. Format your response as a JSON array with objects having date, description, and amount fields.",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text", 
                text: "Here's my bank statement. Please extract all transactions with their date, description, and amount. Format your response as a JSON array."
              },
              {
                type: "file_attachment",
                file_id: fileId
              }
            ]
          }
        ]
      })
    });

    if (!aiResponse.ok) {
      const errorData = await aiResponse.json();
      throw new Error(`Failed to process file: ${errorData.error?.message || aiResponse.statusText}`);
    }

    return await aiResponse.json();
  } catch (error) {
    console.error('Error processing with Claude:', error);
    throw error;
  }
}
