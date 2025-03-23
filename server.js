
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createProxyMiddleware } from 'http-proxy-middleware';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

// Proxy middleware for Claude API in production
app.use('/api/claude', createProxyMiddleware({
  target: 'https://api.anthropic.com',
  changeOrigin: true,
  pathRewrite: {
    '^/api/claude': ''
  },
  onProxyReq: (proxyReq, req, res) => {
    // Copy headers from original request to proxy request
    if (req.headers['x-api-key']) {
      proxyReq.setHeader('x-api-key', req.headers['x-api-key']);
    }
    
    if (req.headers['anthropic-version']) {
      proxyReq.setHeader('anthropic-version', req.headers['anthropic-version']);
    }
    
    if (req.headers['anthropic-dangerous-direct-browser-access']) {
      proxyReq.setHeader('anthropic-dangerous-direct-browser-access', req.headers['anthropic-dangerous-direct-browser-access']);
    }
    
    if (req.headers['content-type']) {
      proxyReq.setHeader('content-type', req.headers['content-type']);
    }
  },
  onProxyRes: (proxyRes, req, res) => {
    // Add CORS headers
    proxyRes.headers['Access-Control-Allow-Origin'] = '*';
    proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
    proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type, x-api-key, anthropic-version, anthropic-dangerous-direct-browser-access';
  },
  onError: (err, req, res) => {
    console.error('Proxy error:', err);
    res.status(500).send('Proxy error');
  }
}));

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// Handle all routes by serving the index.html file
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
