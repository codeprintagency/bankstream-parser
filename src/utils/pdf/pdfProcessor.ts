
import * as pdfjsLib from 'pdfjs-dist';

// Set worker source for pdf.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

/**
 * Extracts text content from a PDF file with position information
 */
export async function extractTextFromPdf(file: File): Promise<any[]> {
  return new Promise(async (resolve, reject) => {
    try {
      // Convert the file to ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      
      // Load the PDF document
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      
      console.log(`PDF loaded successfully with ${pdf.numPages} pages`);
      
      const pageItemsPromises = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent({ normalizeWhitespace: true });
        pageItemsPromises.push(textContent.items);
      }
      
      resolve(pageItemsPromises);
    } catch (error) {
      console.error("Error extracting text from PDF:", error);
      reject(error);
    }
  });
}

/**
 * Reconstructs table rows from PDF text items based on positions
 */
export function reconstructTableRows(pageItems: any[]): string[][] {
  const rows: string[][] = [];
  const yPositionMap = new Map<number, { texts: string[], xPositions: number[] }>();
  
  // Process all pages
  for (const pageContent of pageItems) {
    // Group text by y-position (rows)
    for (const item of pageContent) {
      if (!item.str.trim()) continue; // Skip empty items
      
      const y = Math.round(item.transform[5]); // Round y to handle small variations
      const x = item.transform[4];
      
      if (!yPositionMap.has(y)) {
        yPositionMap.set(y, { texts: [], xPositions: [] });
      }
      
      const row = yPositionMap.get(y)!;
      row.texts.push(item.str);
      row.xPositions.push(x);
    }
  }
  
  // Convert map to sorted array of rows
  const sortedYPositions = Array.from(yPositionMap.keys()).sort((a, b) => b - a); // Sort by y position (top to bottom)
  
  for (const y of sortedYPositions) {
    const rowData = yPositionMap.get(y)!;
    
    // Sort the text items by x position (left to right)
    const sortedTexts = rowData.texts
      .map((text, index) => ({ text, x: rowData.xPositions[index] }))
      .sort((a, b) => a.x - b.x)
      .map(item => item.text);
    
    rows.push(sortedTexts);
  }
  
  return rows;
}
