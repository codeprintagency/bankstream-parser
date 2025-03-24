
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getLastHtmlResponse } from "@/utils/aiParser";
import { AlertCircle, Bug, Code, Copy, ExternalLink, Terminal } from "lucide-react";

interface DebugModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DebugModal: React.FC<DebugModalProps> = ({ open, onOpenChange }) => {
  const [htmlResponse, setHtmlResponse] = useState<string>("");
  const [isHtml, setIsHtml] = useState<boolean>(false);
  const [copied, setCopied] = useState(false);
  
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
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
              <p className="text-sm mb-2">
                The API returned HTML instead of JSON, which typically happens when there are CORS (Cross-Origin Resource Sharing) issues.
                The browser is being blocked from making direct requests to the API.
              </p>
              <p className="text-sm">
                <strong>Solution:</strong> Make sure you're running the app with <code>node server.js</code> instead of just <code>npm run dev</code>.
                The server.js file includes a proxy that handles CORS issues for you.
              </p>
              <div className="mt-2 p-2 bg-amber-100 rounded text-xs font-mono">
                <div className="flex items-center gap-1 mb-1">
                  <Terminal className="w-3 h-3" />
                  <span className="font-semibold">Run this command:</span>
                </div>
                <code>node server.js</code>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2 text-amber-700 border-amber-200 hover:bg-amber-100 flex items-center gap-1"
                onClick={() => window.open("https://docs.anthropic.com/claude/reference/messages-create", "_blank")}
              >
                <ExternalLink className="w-4 h-4" />
                View Claude API Docs
              </Button>
            </div>
          </div>
        )}
        
        <div className="flex justify-end mb-2 gap-2">
          <Button 
            onClick={copyToClipboard} 
            variant="outline" 
            size="sm" 
            className="flex items-center gap-1"
          >
            {copied ? (
              <>
                <Copy className="w-4 h-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy to Clipboard
              </>
            )}
          </Button>
        </div>
        
        <Tabs defaultValue="raw">
          <TabsList className="mb-2">
            <TabsTrigger value="raw">Raw Response</TabsTrigger>
            {isHtml && <TabsTrigger value="preview">HTML Preview</TabsTrigger>}
            {isHtml && <TabsTrigger value="formatted">Formatted HTML</TabsTrigger>}
            <TabsTrigger value="troubleshooting">Troubleshooting</TabsTrigger>
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
          
          <TabsContent value="troubleshooting">
            <ScrollArea className="h-[60vh] border rounded-md p-4">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Common Claude API Issues & Solutions</h3>
                
                <div className="space-y-2 border-l-2 border-blue-300 pl-3">
                  <h4 className="font-medium">1. Server Not Running Correctly</h4>
                  <p className="text-sm">Make sure you start the app with <code>node server.js</code> instead of just <code>npm run dev</code>. 
                  The server.js file includes a proxy that forwards requests to Claude's API and handles CORS issues for you.</p>
                  <div className="bg-gray-100 p-2 rounded text-xs font-mono mt-1">
                    <code>node server.js</code>
                  </div>
                </div>
                
                <div className="space-y-2 border-l-2 border-blue-300 pl-3">
                  <h4 className="font-medium">2. API Key Issues</h4>
                  <p className="text-sm">Ensure your Claude API key is valid and has not expired. The API key should start with <code>sk-ant-api03-</code> for the latest Claude models.</p>
                  <p className="text-sm">The API key must have permissions to use the Claude 3.5 Sonnet model for PDF processing.</p>
                </div>
                
                <div className="space-y-2 border-l-2 border-blue-300 pl-3">
                  <h4 className="font-medium">3. PDF Size Issues</h4>
                  <p className="text-sm">Claude has a limit of 10MB per request. If your PDF is larger than this, it will be rejected.
                  Try using a smaller PDF or the text extraction method instead.</p>
                </div>
                
                <div className="space-y-2 border-l-2 border-blue-300 pl-3">
                  <h4 className="font-medium">4. Network and Firewall Issues</h4>
                  <p className="text-sm">If you're on a corporate network or using a VPN, it might block connections to external APIs.
                  Try on a different network or disable your VPN temporarily.</p>
                </div>
                
                <div className="space-y-2 border-l-2 border-blue-300 pl-3">
                  <h4 className="font-medium">5. Text Extraction Fallback</h4>
                  <p className="text-sm">If direct PDF upload isn't working, switch to the text extraction method which extracts 
                  text from the PDF first and then sends only the text to Claude. This approach is more reliable in some environments.</p>
                </div>
                
                <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-md text-blue-700">
                  <h4 className="font-medium flex items-center gap-1 mb-2">
                    <Terminal className="w-4 h-4" />
                    Check Your Terminal/Console
                  </h4>
                  <p className="text-sm">
                    The server logs detailed information about API requests and responses in the terminal.
                    Look for error messages or warnings that might indicate what's going wrong.
                  </p>
                </div>
                
                <div className="mt-4 pt-4 border-t">
                  <Button 
                    variant="outline" 
                    className="flex items-center gap-1"
                    onClick={() => window.open("https://docs.anthropic.com/claude/reference/messages-create", "_blank")}
                  >
                    <ExternalLink className="w-4 h-4" />
                    View Claude API Documentation
                  </Button>
                  <Button
                    variant="outline"
                    className="flex items-center gap-1 ml-2" 
                    onClick={() => window.open("https://docs.anthropic.com/claude/docs/pdf-support", "_blank")}
                  >
                    <ExternalLink className="w-4 h-4" />
                    Claude PDF Support Docs
                  </Button>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default DebugModal;
