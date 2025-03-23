
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
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            // Pass through the dangerous-direct-browser-access header
            if (req.headers['anthropic-dangerous-direct-browser-access']) {
              proxyReq.setHeader('anthropic-dangerous-direct-browser-access', req.headers['anthropic-dangerous-direct-browser-access']);
            }
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
