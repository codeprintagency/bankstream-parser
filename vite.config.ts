
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { IncomingMessage, ServerResponse } from "http";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    allowedHosts: [
      "2f1eb924-50e1-4078-8836-1c0d85049071.lovableproject.com",
      "localhost"
    ],
    proxy: {
      // Proxy API requests to avoid CORS issues
      '/api/claude': {
        target: 'https://api.anthropic.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/claude/, ''),
        secure: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res, _target) => {
            console.error('Proxy error:', err);
          });
          
          proxy.on('proxyReq', (proxyReq, req, _res, _options) => {
            console.log('Proxying request to Claude API with method:', req.method);
            console.log('Original URL:', req.url);
            console.log('Target URL:', proxyReq.path);
            
            // Remove problematic headers
            proxyReq.removeHeader('host');
            proxyReq.removeHeader('origin');
            proxyReq.removeHeader('referer');
            
            // Copy important headers from the original request
            if (req.headers && req.headers['x-api-key']) {
              proxyReq.setHeader('x-api-key', req.headers['x-api-key']);
              console.log('Setting x-api-key header');
            }
            
            if (req.headers && req.headers['anthropic-version']) {
              proxyReq.setHeader('anthropic-version', req.headers['anthropic-version']);
              console.log('Setting anthropic-version header');
            }
            
            if (req.headers && req.headers['content-type']) {
              proxyReq.setHeader('content-type', req.headers['content-type']);
              console.log('Setting content-type header');
            }
            
            // Add the PDF beta header if present in the original request
            if (req.headers && req.headers['anthropic-beta']) {
              proxyReq.setHeader('anthropic-beta', req.headers['anthropic-beta']);
              console.log('Setting anthropic-beta header for PDF support');
            }
            
            // Add the new direct browser access header
            proxyReq.setHeader('anthropic-dangerous-direct-browser-access', 'true');
            console.log('Setting anthropic-dangerous-direct-browser-access header');
            
            // Log the modified headers
            console.log('Proxy request headers:', Object.fromEntries(
              Object.entries(proxyReq.getHeaders())
            ));
          });
          
          // Fix TypeScript errors by providing proper type definitions
          type ProxyResCallback = (proxyRes: IncomingMessage, req: IncomingMessage, res: ServerResponse) => void;
          
          const onProxyRes: ProxyResCallback = function(proxyRes, req, res) {
            console.log(`Proxy response status: ${proxyRes.statusCode}`);
            
            // Add CORS headers to response
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key, anthropic-version, anthropic-beta, anthropic-dangerous-direct-browser-access');
            
            // Handle preflight OPTIONS request
            if (req.method === 'OPTIONS') {
              res.statusCode = 200;
              res.end();
              return;
            }
            
            // Log response headers for debugging
            console.log('Response headers:', JSON.stringify(Object.fromEntries(
              Object.entries(proxyRes.headers)
            )));
            
            // Check if the response is HTML instead of JSON
            if (proxyRes.headers['content-type'] && proxyRes.headers['content-type'].includes('text/html')) {
              console.log('WARNING: Received HTML instead of JSON from Claude API');
              
              // We want to collect the response to log it for debugging
              let responseBody = '';
              
              // Override write and end methods
              const originalWrite = res.write;
              const originalEnd = res.end;
              
              // Safely override write method
              res.write = function(chunk: any) {
                if (chunk) {
                  responseBody += Buffer.isBuffer(chunk) ? chunk.toString('utf8') : chunk;
                }
                // Call original with properly typed arguments
                return originalWrite.apply(res, arguments as any);
              };
              
              // Safely override end method
              res.end = function(chunk: any) {
                if (chunk) {
                  responseBody += Buffer.isBuffer(chunk) ? chunk.toString('utf8') : chunk;
                }
                
                console.log('HTML response preview:', responseBody.substring(0, 1000) + '...');
                
                // Call original with properly typed arguments
                return originalEnd.apply(res, arguments as any);
              };
            }
          };
          
          proxy.on('proxyRes', onProxyRes);
        }
      }
    }
  },
  build: {
    outDir: "dist"
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
