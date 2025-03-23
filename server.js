
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
    // Clean up existing headers that might be causing issues
    proxyReq.removeHeader('host');
    proxyReq.removeHeader('origin');
    proxyReq.removeHeader('referer');
    
    // Set important headers
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
    
    console.log('Production proxy request headers:', Array.from(Object.keys(proxyReq.getHeaders())).join(', '));
  },
  onProxyRes: (proxyRes, req, res) => {
    // Log response details for debugging
    console.log('Claude API response status:', proxyRes.statusCode);
    
    // Add CORS headers
    proxyRes.headers['Access-Control-Allow-Origin'] = '*';
    proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
    proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type, x-api-key, anthropic-version, anthropic-dangerous-direct-browser-access';
    
    // Log content type for debugging
    console.log('Response content-type:', proxyRes.headers['content-type']);
  },
  onError: (err, req, res) => {
    console.error('Proxy error in production:', err);
    res.status(500).json({ error: 'Proxy error', message: err.message });
  }
}));

// Options pre-flight for CORS
app.options('/api/claude*', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, x-api-key, anthropic-version, anthropic-dangerous-direct-browser-access');
  res.status(200).send();
});

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
