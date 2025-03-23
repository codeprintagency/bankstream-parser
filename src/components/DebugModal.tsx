
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getLastHtmlResponse } from "@/utils/aiParser";

interface DebugModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DebugModal: React.FC<DebugModalProps> = ({ open, onOpenChange }) => {
  const htmlResponse = getLastHtmlResponse();
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(htmlResponse);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh]">
        <DialogHeader>
          <DialogTitle>Claude API Response</DialogTitle>
          <DialogDescription>
            Showing the raw response from the Claude API
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex justify-end mb-2">
          <Button onClick={copyToClipboard} variant="outline" size="sm">
            Copy to Clipboard
          </Button>
        </div>
        
        <ScrollArea className="h-[60vh] border rounded-md p-4">
          <pre className="text-xs whitespace-pre-wrap break-words">
            {htmlResponse || "No response available yet. Try making a request first."}
          </pre>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default DebugModal;
