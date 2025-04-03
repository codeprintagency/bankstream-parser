
import { useState, useCallback } from "react";
import { useToast } from "@/components/ui/use-toast";
import { extractTextFromPdf } from "@/utils/fileConverter";

export function useFileUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [pageCount, setPageCount] = useState(0);
  const { toast } = useToast();

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === "application/pdf") {
      setFile(droppedFile);
    } else {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF file",
        variant: "destructive",
      });
    }
  }, [toast]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === "application/pdf") {
      setFile(selectedFile);
    } else {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF file",
        variant: "destructive",
      });
    }
  }, [toast]);

  const checkPageCount = async (file: File): Promise<number> => {
    try {
      const extractedItems = await extractTextFromPdf(file);
      const count = extractedItems.length;
      setPageCount(count);
      return count;
    } catch (error) {
      console.error("Failed to count pages:", error);
      return 0;
    }
  };

  const resetFile = () => {
    setFile(null);
    setPageCount(0);
  };

  return {
    file,
    setFile,
    isDragging,
    pageCount,
    checkPageCount,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileChange,
    resetFile
  };
}
