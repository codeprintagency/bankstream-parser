
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
        headers: {
          'Origin': 'https://api.anthropic.com'
        },
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.error('Proxy error:', err);
          });
          
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            // Pass through all the headers as-is
            const headerNames = Object.keys(req.headers);
            
            // Log all headers for debugging
            console.log('Proxying request with headers:', JSON.stringify(headerNames));
            
            // Explicitly pass the dangerous-direct-browser-access header
            if (req.headers['anthropic-dangerous-direct-browser-access']) {
              proxyReq.setHeader('anthropic-dangerous-direct-browser-access', req.headers['anthropic-dangerous-direct-browser-access']);
              console.log('Setting anthropic-dangerous-direct-browser-access header');
            }
            
            // Explicitly pass the API key header
            if (req.headers['x-api-key']) {
              proxyReq.setHeader('x-api-key', req.headers['x-api-key']);
              console.log('Setting x-api-key header');
            }
            
            // Explicitly pass the anthropic-version header
            if (req.headers['anthropic-version']) {
              proxyReq.setHeader('anthropic-version', req.headers['anthropic-version']);
              console.log('Setting anthropic-version header');
            }
          });
          
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received proxy response with status:', proxyRes.statusCode);
            console.log('Proxy response headers:', JSON.stringify(Object.keys(proxyRes.headers)));
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
