
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getLastHtmlResponse } from "@/utils/aiParser";

interface DebugModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DebugModal: React.FC<DebugModalProps> = ({ open, onOpenChange }) => {
  const [htmlResponse, setHtmlResponse] = useState<string>("");
  const [isHtml, setIsHtml] = useState<boolean>(false);
  
  useEffect(() => {
    if (open) {
      const response = getLastHtmlResponse();
      setHtmlResponse(response);
      
      // Check if the response appears to be HTML
      setIsHtml(response.trim().startsWith('<!DOCTYPE') || 
                response.trim().startsWith('<html') || 
                response.includes('<head>') || 
                response.includes('<body>'));
    }
  }, [open]);
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(htmlResponse);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh]">
        <DialogHeader>
          <DialogTitle>Claude API Response</DialogTitle>
          <DialogDescription>
            {isHtml 
              ? "Received HTML instead of JSON from the Claude API" 
              : "Showing the raw response from the Claude API"}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex justify-end mb-2">
          <Button onClick={copyToClipboard} variant="outline" size="sm">
            Copy to Clipboard
          </Button>
        </div>
        
        <Tabs defaultValue="raw">
          <TabsList className="mb-2">
            <TabsTrigger value="raw">Raw Response</TabsTrigger>
            {isHtml && <TabsTrigger value="preview">HTML Preview</TabsTrigger>}
          </TabsList>
          
          <TabsContent value="raw">
            <ScrollArea className="h-[60vh] border rounded-md p-4">
              <pre className="text-xs whitespace-pre-wrap break-words">
                {htmlResponse || "No response available yet. Try making a request first."}
              </pre>
            </ScrollArea>
          </TabsContent>
          
          {isHtml && (
            <TabsContent value="preview">
              <div className="h-[60vh] border rounded-md overflow-auto p-0">
                {htmlResponse ? (
                  <iframe 
                    srcDoc={htmlResponse}
                    className="w-full h-full border-0"
                    title="HTML Preview"
                    sandbox="allow-same-origin allow-scripts"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    No HTML response available yet.
                  </div>
                )}
              </div>
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default DebugModal;
