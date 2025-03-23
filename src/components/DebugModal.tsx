
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getLastHtmlResponse } from "@/utils/aiParser";
import { AlertCircle, Bug, Code } from "lucide-react";

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
          <DialogTitle className="flex items-center gap-2">
            <Bug className="w-5 h-5" />
            API Response Debug
          </DialogTitle>
          <DialogDescription>
            {isHtml 
              ? "Received HTML instead of JSON from the API - this is usually due to CORS issues or proxy configuration problems" 
              : "Showing the raw response from the API"}
          </DialogDescription>
        </DialogHeader>
        
        {isHtml && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-md flex items-start gap-2 text-amber-700 mb-4">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">CORS Issue Detected</p>
              <p className="text-sm">
                The API returned HTML instead of JSON, which typically happens when there are CORS (Cross-Origin Resource Sharing) issues.
                The browser is being blocked from making direct requests to the API. Try using the proxy or adding appropriate CORS headers.
              </p>
            </div>
          </div>
        )}
        
        <div className="flex justify-end mb-2">
          <Button onClick={copyToClipboard} variant="outline" size="sm" className="flex items-center gap-1">
            <Code className="w-4 h-4" />
            Copy to Clipboard
          </Button>
        </div>
        
        <Tabs defaultValue="raw">
          <TabsList className="mb-2">
            <TabsTrigger value="raw">Raw Response</TabsTrigger>
            {isHtml && <TabsTrigger value="preview">HTML Preview</TabsTrigger>}
            {isHtml && <TabsTrigger value="formatted">Formatted HTML</TabsTrigger>}
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
          
          {isHtml && (
            <TabsContent value="formatted">
              <ScrollArea className="h-[60vh] border rounded-md p-4">
                <div className="text-xs font-mono">
                  {htmlResponse ? (
                    <div dangerouslySetInnerHTML={{ 
                      __html: htmlResponse
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;')
                        .replace(/&lt;(\/?)(\w+)(.*?)&gt;/g, '<span class="text-blue-500">&lt;$1$2</span><span class="text-green-500">$3</span><span class="text-blue-500">&gt;</span>')
                    }} />
                  ) : (
                    <div className="text-muted-foreground">
                      No HTML response available yet.
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default DebugModal;
