
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

// Proxy middleware for Claude API in production
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
    
    // Set important headers
    if (req.headers['x-api-key']) {
      proxyReq.setHeader('x-api-key', req.headers['x-api-key']);
      console.log('Setting x-api-key header');
    }
    
    if (req.headers['anthropic-version']) {
      proxyReq.setHeader('anthropic-version', req.headers['anthropic-version']);
      console.log('Setting anthropic-version header');
    }
    
    if (req.headers['content-type']) {
      proxyReq.setHeader('content-type', req.headers['content-type']);
      console.log('Setting content-type header');
    }
    
    // Log the modified headers
    console.log('Production proxy request headers:', Array.from(Object.keys(proxyReq.getHeaders())).join(', '));
    
    // Log the request body if it exists
    if (req.body) {
      let bodyData = req.body;
      // If bodyData is a buffer or string, convert it to an object
      if (Buffer.isBuffer(bodyData)) {
        bodyData = bodyData.toString();
      }
      if (typeof bodyData === 'string') {
        try {
          bodyData = JSON.parse(bodyData);
        } catch (e) {
          console.log('Could not parse body as JSON');
        }
      }
      console.log('Request body:', typeof bodyData === 'object' ? JSON.stringify(bodyData, null, 2) : bodyData);
    }
  },
  onProxyRes: (proxyRes, req, res) => {
    // Log response details for debugging
    console.log('Claude API response status:', proxyRes.statusCode);
    console.log('Claude API response headers:', proxyRes.headers);
    
    // Add CORS headers
    proxyRes.headers['Access-Control-Allow-Origin'] = '*';
    proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
    proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type, x-api-key, anthropic-version';
    
    // Log content type for debugging
    console.log('Response content-type:', proxyRes.headers['content-type']);
    
    // If the response is HTML instead of JSON, log this information
    if (proxyRes.headers['content-type'] && proxyRes.headers['content-type'].includes('text/html')) {
      console.log('WARNING: Received HTML instead of JSON from Claude API');
      
      // Create a stream to collect the response data
      let responseBody = '';
      proxyRes.on('data', (chunk) => {
        responseBody += chunk;
      });
      
      proxyRes.on('end', () => {
        // Log a preview of the HTML response
        console.log('HTML response preview:', responseBody.substring(0, 1000) + '...');
      });
    }
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
  res.header('Access-Control-Allow-Headers', 'Content-Type, x-api-key, anthropic-version');
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
