
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      // Proxy API requests to avoid CORS issues
      '/api/claude': {
        target: 'https://api.anthropic.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/claude/, ''),
        secure: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.error('Proxy error:', err);
          });
          
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Proxying request to Claude API with method:', req.method);
            
            // Copy all original request headers to the proxy request
            if (req.headers) {
              Object.keys(req.headers).forEach(key => {
                if (key !== 'host') { // Skip the host header
                  const headerValue = req.headers[key];
                  if (headerValue) {
                    proxyReq.setHeader(key, headerValue);
                    console.log(`Setting header: ${key}`);
                  }
                }
              });
            }
            
            // Explicitly pass important headers
            if (req.headers && req.headers['x-api-key']) {
              proxyReq.setHeader('x-api-key', req.headers['x-api-key']);
            }
            
            if (req.headers && req.headers['anthropic-version']) {
              proxyReq.setHeader('anthropic-version', req.headers['anthropic-version']);
            }
            
            if (req.headers && req.headers['anthropic-dangerous-direct-browser-access']) {
              proxyReq.setHeader('anthropic-dangerous-direct-browser-access', req.headers['anthropic-dangerous-direct-browser-access']);
            }
            
            if (req.headers && req.headers['content-type']) {
              proxyReq.setHeader('content-type', req.headers['content-type']);
            }
            
            // We can't access req.body directly in the proxy middleware
            // If debugging is needed, you would need to use a body parser middleware
          });
          
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log(`Proxy response status: ${proxyRes.statusCode}`);
            
            // Add CORS headers to response
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key, anthropic-version, anthropic-dangerous-direct-browser-access');
            
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
          });
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
