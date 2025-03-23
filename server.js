
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

// Improved proxy middleware for Claude API with better error handling
app.use('/api/claude', createProxyMiddleware({
  target: 'https://api.anthropic.com',
  changeOrigin: true,
  pathRewrite: {
    '^/api/claude': ''
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log('=== PROXY REQUEST START ===');
    console.log('Original request URL:', req.url);
    console.log('Method:', req.method);
    console.log('Original request headers:', req.headers);
    
    // Clean up existing headers that might be causing issues
    proxyReq.removeHeader('host');
    proxyReq.removeHeader('origin');
    proxyReq.removeHeader('referer');
    
    // Always include essential headers
    if (req.headers['x-api-key']) {
      proxyReq.setHeader('x-api-key', req.headers['x-api-key']);
      console.log('Setting x-api-key header');
    } else {
      console.warn('Warning: No x-api-key header found in request');
    }
    
    // Set required Anthropic headers
    proxyReq.setHeader('anthropic-version', req.headers['anthropic-version'] || '2023-06-01');
    console.log('Setting anthropic-version header');
    
    // Add the direct browser access header that allows CORS
    proxyReq.setHeader('anthropic-dangerous-direct-browser-access', 'true');
    console.log('Setting anthropic-dangerous-direct-browser-access header');
    
    // Content type is critical
    proxyReq.setHeader('content-type', 'application/json');
    console.log('Setting content-type header');
    
    // Log the modified headers
    console.log('Forwarded proxy request headers:', proxyReq.getHeaders());
    
    // Log the request body if it exists
    if (req.body && Object.keys(req.body).length > 0) {
      const bodyData = JSON.stringify(req.body);
      console.log('Request body (first 200 chars):', bodyData.substring(0, 200) + '...');
      
      // Update content-length to match the body length
      proxyReq.setHeader('content-length', Buffer.byteLength(bodyData));
      
      // Write the body data
      proxyReq.write(bodyData);
      proxyReq.end();
    }
    
    console.log('=== PROXY REQUEST END ===');
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log('=== PROXY RESPONSE START ===');
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
    
    // Collect the response body for logging, especially on errors
    let responseBody = '';
    
    proxyRes.on('data', (chunk) => {
      responseBody += chunk.toString();
    });
    
    proxyRes.on('end', () => {
      // Check if the response doesn't look like JSON
      const contentType = proxyRes.headers['content-type'] || '';
      const isHtml = contentType.includes('text/html') || 
              responseBody.trim().startsWith('<!DOCTYPE') || 
              responseBody.trim().startsWith('<html') ||
              responseBody.includes('<head>') || 
              responseBody.includes('<body>');
      
      // Log response body on errors or when it's HTML
      if (proxyRes.statusCode !== 200 || isHtml) {
        console.log(`Response body from Claude API (${proxyRes.statusCode}):`, responseBody.substring(0, 500) + '...');
        
        // For HTML responses, we need to replace it with a clearer JSON error
        if (isHtml) {
          // Don't send HTML to the client, send a clear JSON error instead
          // Clear any previous headers
          res.statusCode = 502;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            error: 'CORS error',
            message: 'Received HTML instead of JSON from the API server. This likely indicates a CORS or authentication issue.',
            statusCode: proxyRes.statusCode
          }));
          console.log('Replaced HTML response with JSON error');
          return;
        }
      } else {
        console.log('Response body preview (first 100 chars):', responseBody.substring(0, 100) + '...');
      }
      
      console.log('=== PROXY RESPONSE END ===');
    });
  },
  onError: (err, req, res) => {
    console.error('=== PROXY ERROR ===');
    console.error('Proxy error:', err);
    
    // Respond with JSON error instead of HTML
    res.setHeader('Content-Type', 'application/json');
    res.status(502).json({ 
      error: 'Proxy error', 
      message: err.message,
      timestamp: new Date().toISOString()
    });
    
    console.error('=== PROXY ERROR END ===');
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
