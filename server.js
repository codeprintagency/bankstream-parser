
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createProxyMiddleware } from 'http-proxy-middleware';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

// Debug middleware to log requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Body parser middleware - configure before CORS and other middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// CORS middleware for all requests
app.use((req, res, next) => {
  // Set CORS headers for all responses
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, x-api-key, anthropic-version, anthropic-dangerous-direct-browser-access, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400');
  
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

// Proxy middleware for Claude API with improved error handling
app.use('/api/claude', createProxyMiddleware({
  target: 'https://api.anthropic.com',
  changeOrigin: true,
  pathRewrite: {
    '^/api/claude': ''
  },
  onProxyReq: (proxyReq, req, res) => {
    // Log the original request
    console.log('Original request headers:', req.headers);
    
    // Clean up existing headers that might be causing issues
    proxyReq.removeHeader('host');
    proxyReq.removeHeader('origin');
    proxyReq.removeHeader('referer');
    
    // Always include essential headers
    if (req.headers['x-api-key']) {
      proxyReq.setHeader('x-api-key', req.headers['x-api-key']);
      console.log('Setting x-api-key header');
    }
    
    proxyReq.setHeader('anthropic-version', req.headers['anthropic-version'] || '2023-06-01');
    console.log('Setting anthropic-version header');
    
    // Add the new direct browser access header
    proxyReq.setHeader('anthropic-dangerous-direct-browser-access', 'true');
    console.log('Setting anthropic-dangerous-direct-browser-access header');
    
    // Content type is critical
    proxyReq.setHeader('content-type', 'application/json');
    console.log('Setting content-type header');
    
    // Log the modified headers
    console.log('Production proxy request headers:', proxyReq.getHeaders());
    
    // Log the request body if it exists
    if (req.body && Object.keys(req.body).length > 0) {
      const bodyData = JSON.stringify(req.body);
      console.log('Request body:', bodyData);
      
      // Update content-length to match the body length
      proxyReq.setHeader('content-length', Buffer.byteLength(bodyData));
      
      // Write the body data
      proxyReq.write(bodyData);
      proxyReq.end();
    }
  },
  onProxyRes: (proxyRes, req, res) => {
    // Log response details for debugging
    console.log('Claude API response status:', proxyRes.statusCode);
    console.log('Claude API response headers:', proxyRes.headers);
    
    // Add CORS headers to response
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, x-api-key, anthropic-version, anthropic-dangerous-direct-browser-access, Authorization');
    
    // Make sure we're setting the right content type
    if (proxyRes.headers['content-type']) {
      res.setHeader('Content-Type', proxyRes.headers['content-type']);
    }
    
    // If the status is not 200, log the response body
    if (proxyRes.statusCode !== 200) {
      let responseBody = '';
      proxyRes.on('data', (chunk) => {
        responseBody += chunk.toString();
      });
      
      proxyRes.on('end', () => {
        console.log(`Error response from Claude API (${proxyRes.statusCode}):`, responseBody);
      });
    }
  },
  onError: (err, req, res) => {
    console.error('Proxy error:', err);
    
    // Respond with JSON error instead of HTML
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ 
      error: 'Proxy error', 
      message: err.message,
      timestamp: new Date().toISOString()
    });
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
