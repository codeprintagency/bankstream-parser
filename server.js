import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createProxyMiddleware } from 'http-proxy-middleware';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;
const FALLBACK_PORTS = [8081, 8082, 8083, 8084, 8085];

// Debug middleware to log requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  if (req.url.includes('/api/claude')) {
    console.log('Claude API request headers:', JSON.stringify(req.headers, null, 2));
  }
  next();
});

// Body parser middleware - configure before CORS and other middleware
// Increase limit for handling larger requests
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// CORS middleware for all requests
app.use((req, res, next) => {
  // Set CORS headers for all responses
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, x-api-key, anthropic-version, anthropic-beta, anthropic-dangerous-direct-browser-access');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400');
  
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    console.log('Responding to OPTIONS preflight request');
    return res.status(200).end();
  }
  
  next();
});

// Detect if we're running in a cloud environment (like Render.com or DigitalOcean)
const isCloudEnvironment = !!process.env.CLOUD_ENVIRONMENT || 
                           !!process.env.RENDER || 
                           !!process.env.DIGITALOCEAN_APP || 
                           !!process.env.VERCEL || 
                           process.env.NODE_ENV === 'production';

console.log('Environment detection:', {
  isRender: !!process.env.RENDER,
  isDigitalOcean: !!process.env.DIGITALOCEAN_APP,
  isVercel: !!process.env.VERCEL,
  isCloudEnvironment,
  nodeEnv: process.env.NODE_ENV
});

// Add environment variables for Claude API
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY || '';
if (!CLAUDE_API_KEY && !process.env.CI) {
  console.warn('⚠️  WARNING: No CLAUDE_API_KEY environment variable found. API requests will fail.');
}

// Add direct route handling for Claude API messages endpoint
app.post('/api/claude/v1/messages', async (req, res) => {
  console.log('=== DIRECT CLAUDE API REQUEST ===');
  console.log('Request URL:', req.url);
  console.log('Request Method:', req.method);
  
  // Log the request body - crucial for debugging
  console.log('Request Body:', JSON.stringify(req.body, null, 2));
  
  // Verify that we have required fields
  if (!req.body || !req.body.messages || !req.body.model) {
    console.error('Missing required fields in request body');
    return res.status(400).json({
      error: {
        type: 'invalid_request',
        message: 'Request body must contain model and messages fields'
      }
    });
  }
  
  console.log('Message count:', req.body.messages.length);
  console.log('Model:', req.body.model);
  
  // Use server-side API key instead of client-provided key
  if (!CLAUDE_API_KEY) {
    console.error('Missing Claude API key in server environment');
    return res.status(500).json({
      error: {
        type: 'api_key_error',
        message: 'Claude API key is not configured on the server'
      }
    });
  }
  
  try {
    // Forward the request to Claude API with our API key
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': req.headers['anthropic-version'] || '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
        ...(req.headers['anthropic-beta'] && {'anthropic-beta': req.headers['anthropic-beta']})
      },
      body: JSON.stringify(req.body),
    });
    
    console.log('Claude API response status:', claudeResponse.status);
    
    // Get the response as text first (to debug any issues)
    const responseText = await claudeResponse.text();
    console.log('Response text sample:', responseText.substring(0, 200) + '...');
    
    // Set the response headers and status
    res.status(claudeResponse.status);
    res.setHeader('Content-Type', 'application/json');
    
    // Return the response
    res.send(responseText);
    
  } catch (error) {
    console.error('Error forwarding request to Claude:', error);
    res.status(502).json({
      error: {
        type: 'proxy_error',
        message: error.message,
        stack: error.stack
      }
    });
  }
});

// Modify the proxy middleware to use server-side API key
app.use('/api/claude', createProxyMiddleware({
  target: 'https://api.anthropic.com',
  changeOrigin: true,
  pathRewrite: {
    '^/api/claude': ''
  },
  logLevel: 'debug',
  // Increase timeouts for PDF processing - critical fix for cloud environments
  timeout: isCloudEnvironment ? 120000 : 60000,
  proxyTimeout: isCloudEnvironment ? 120000 : 60000,
  onProxyReq: (proxyReq, req, res) => {
    console.log('=== PROXY REQUEST START ===');
    console.log('Original request URL:', req.url);
    console.log('Method:', req.method);
    console.log('Target URL:', 'https://api.anthropic.com' + req.url.replace(/^\/api\/claude/, ''));
    
    // Clean up existing headers that might be causing issues
    proxyReq.removeHeader('host');
    proxyReq.removeHeader('origin');
    proxyReq.removeHeader('referer');
    
    // Always use server-side API key
    if (CLAUDE_API_KEY) {
      proxyReq.setHeader('x-api-key', CLAUDE_API_KEY);
      console.log('Setting x-api-key header from server environment');
    } else {
      console.warn('WARNING: No Claude API key available in server environment');
    }
    
    // Set required Anthropic headers
    proxyReq.setHeader('anthropic-version', req.headers['anthropic-version'] || '2023-06-01');
    console.log('Setting anthropic-version header:', req.headers['anthropic-version'] || '2023-06-01');
    
    // Add the PDF beta header if present in the original request
    if (req.headers['anthropic-beta']) {
      proxyReq.setHeader('anthropic-beta', req.headers['anthropic-beta']);
      console.log('Setting anthropic-beta header for PDF support:', req.headers['anthropic-beta']);
    }
    
    // Add the direct browser access header
    if (req.headers['anthropic-dangerous-direct-browser-access']) {
      proxyReq.setHeader('anthropic-dangerous-direct-browser-access', 'true');
      console.log('Setting anthropic-dangerous-direct-browser-access header');
    } else {
      proxyReq.setHeader('anthropic-dangerous-direct-browser-access', 'true');
      console.log('Setting default anthropic-dangerous-direct-browser-access header');
    }
    
    // Content type is critical
    proxyReq.setHeader('content-type', 'application/json');
    console.log('Setting content-type header: application/json');
    
    // Log the modified headers
    console.log('Forwarded proxy request headers:', JSON.stringify(Object.fromEntries(
      Object.entries(proxyReq.getHeaders())
    ), null, 2));
    
    // Log the request body if it exists - CRITICAL for debugging
    if (req.body && Object.keys(req.body).length > 0) {
      const bodyData = JSON.stringify(req.body);
      console.log('Request body size:', bodyData.length, 'bytes');
      console.log('Request model:', req.body.model || 'not specified');
      
      // Add detailed logging of the messages structure without showing the entire content
      if (req.body.messages) {
        console.log('Messages structure:', req.body.messages.map(m => ({
          role: m.role,
          content_type: Array.isArray(m.content) 
            ? m.content.map(c => c.type).join(', ') 
            : typeof m.content,
          content_length: typeof m.content === 'string' 
            ? m.content.length 
            : Array.isArray(m.content) ? m.content.length : 0
        })));
      } else {
        console.warn('No messages array in request body');
      }
      
      // Check if the request contains PDF document content
      const hasPdfContent = isPdfRequest(req.body);
      if (hasPdfContent) {
        console.log('Detected PDF content in the request');
        // Log the size of the PDF if present
        try {
          let pdfSize = 0;
          req.body.messages.forEach(message => {
            if (Array.isArray(message.content)) {
              message.content.forEach(item => {
                if (item.type === 'document' && item.source?.type === 'base64' && item.source?.data) {
                  pdfSize += item.source.data.length * 0.75; // Base64 is ~4/3 times the size of binary
                }
              });
            }
          });
          
          if (pdfSize > 1024 * 1024) {
            console.log('PDF size:', (pdfSize / (1024 * 1024)).toFixed(2), 'MB');
          } else {
            console.log('PDF size:', (pdfSize / 1024).toFixed(2), 'KB');
          }
        } catch (err) {
          console.log('Could not determine PDF size:', err.message);
        }
      }
      
      // Update content-length to match the body length
      proxyReq.setHeader('content-length', Buffer.byteLength(bodyData));
      console.log('Setting content-length header:', Buffer.byteLength(bodyData));
      
      // Write the body data
      proxyReq.write(bodyData);
      proxyReq.end();
    } else {
      console.error('REQUEST BODY IS EMPTY OR UNDEFINED - THIS IS LIKELY THE CAUSE OF THE 502 ERROR');
    }
    
    console.log('=== PROXY REQUEST END ===');
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log('=== PROXY RESPONSE START ===');
    console.log('Claude API response status:', proxyRes.statusCode);
    console.log('Claude API response headers:', JSON.stringify(proxyRes.headers, null, 2));
    
    // Add CORS headers to response
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, x-api-key, anthropic-version, anthropic-beta, anthropic-dangerous-direct-browser-access');
    
    // Make sure we're setting the right content type
    if (proxyRes.headers['content-type']) {
      res.setHeader('Content-Type', proxyRes.headers['content-type']);
      console.log('Setting Content-Type header in response:', proxyRes.headers['content-type']);
    }
    
    // For gateway errors (502, 503, 504), provide more detailed error information
    if (proxyRes.statusCode === 502 || proxyRes.statusCode === 503 || proxyRes.statusCode === 504) {
      console.log(`Received ${proxyRes.statusCode} from upstream server`);
      res.setHeader('Content-Type', 'application/json');
      
      // Replace the error response with more helpful information
      const errorJson = JSON.stringify({
        error: {
          type: 'gateway_error',
          message: `Received ${proxyRes.statusCode} Gateway Error from upstream server. This usually indicates a temporary issue with the API service. Please try again in a few moments.`,
          status: proxyRes.statusCode,
          cloud_environment: isCloudEnvironment ? 'yes' : 'no',
          platform: process.env.RENDER ? 'Render.com' : (process.env.DIGITALOCEAN_APP ? 'DigitalOcean' : 'Unknown')
        }
      });
      
      res.end(errorJson);
      console.log('Returning custom error response:', errorJson);
      return;
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
          console.error('Received HTML response from Claude API instead of JSON');
          // Don't send HTML to the client, send a clear JSON error instead
          res.statusCode = 502;
          res.setHeader('Content-Type', 'application/json');
          
          const errorResponseJson = JSON.stringify({
            error: {
              type: 'html_response',
              message: 'Received HTML instead of JSON from the API server. This likely indicates a CORS or authentication issue.',
              statusCode: proxyRes.statusCode,
              htmlPreview: responseBody.substring(0, 500) + '...'
            }
          });
          
          console.log('Replacing HTML response with JSON error:', errorResponseJson);
          res.end(errorResponseJson);
          return;
        }
      } else {
        // For successful JSON responses
        console.log('Response appears to be valid JSON');
        console.log('Response body preview (first 100 chars):', responseBody.substring(0, 100) + '...');
        
        // Validate that the response can be parsed as JSON
        try {
          if (responseBody.trim() === '') {
            console.error('Response is empty despite content-type');
            
            // Replace the empty response with a clear error
            res.statusCode = 502;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              error: {
                type: 'empty_response',
                message: 'The API returned an empty response',
                statusCode: proxyRes.statusCode
              }
            }));
            return;
          }
          
          JSON.parse(responseBody);
          console.log('Successfully validated response as JSON');
        } catch (e) {
          console.error('Response is not valid JSON despite content-type:', e.message);
          
          // Replace the invalid response with a clear error
          res.statusCode = 502;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            error: {
              type: 'invalid_json',
              message: 'The API returned an invalid JSON response',
              details: e.message,
              responsePreview: responseBody.substring(0, 500) + '...'
            }
          }));
          return;
        }
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
      error: {
        type: 'proxy_error',
        message: err.message,
        stack: err.stack,
        timestamp: new Date().toISOString(),
        cloud_environment: isCloudEnvironment ? 'yes' : 'no',
        platform: process.env.RENDER ? 'Render.com' : (process.env.DIGITALOCEAN_APP ? 'DigitalOcean' : 'Unknown')
      }
    });
    
    console.error('=== PROXY ERROR END ===');
  }
}));

// Helper function to check if the request contains PDF documents
function isPdfRequest(body) {
  if (!body || !body.messages) return false;
  
  return body.messages.some(message => {
    if (typeof message.content === 'string') return false;
    if (!Array.isArray(message.content)) return false;
    
    return message.content.some(item => 
      item.type === 'document' && 
      item.source?.type === 'base64' && 
      item.source?.media_type === 'application/pdf'
    );
  });
}

// Add environment information to response headers when in the cloud
if (isCloudEnvironment) {
  app.use((req, res, next) => {
    res.header('X-Powered-By', 'Bank Statement Parser');
    if (process.env.RENDER) {
      res.header('X-Environment', 'Render.com');
    } else if (process.env.DIGITALOCEAN_APP) {
      res.header('X-Environment', 'DigitalOcean App Platform');
    } else {
      res.header('X-Environment', 'Cloud');
    }
    next();
  });
  
  if (process.env.RENDER) {
    console.log('Running on Render.com');
    console.log('App URL: https://bankstream-parser.onrender.com');
  } else if (process.env.DIGITALOCEAN_APP) {
    console.log('Running on DigitalOcean App Platform');
  } else {
    console.log('Running in generic cloud environment');
  }
  console.log('Using PORT from environment:', PORT);
}

// Define all possible dist directory locations - IMPORTANT FOR RENDER.COM
const possibleDistDirs = [
  path.join(__dirname, 'dist'),                 // Standard location
  path.join(__dirname, '..', 'dist'),           // One level up
  path.join(__dirname, '../..', 'dist'),        // Two levels up
  path.join(__dirname, 'build'),                // Alternative build folder name
  path.join(__dirname, '..', 'build'),          // Alternative in parent
  '/opt/render/project/src/dist',               // Render-specific location
  '/opt/render/project/dist',                   // Alternative Render location
  '/var/task/dist',                             // Another possible Render location
  process.env.RENDER_PROJECT_DIR ? path.join(process.env.RENDER_PROJECT_DIR, 'dist') : null,
  process.env.RENDER_PROJECT_ROOT ? path.join(process.env.RENDER_PROJECT_ROOT, 'dist') : null,
  '/app/dist',                                  // Docker-style location
].filter(Boolean); // Filter out null/undefined paths

// Find the first existing dist directory
let distDir = null;
for (const dir of possibleDistDirs) {
  console.log(`Checking for dist directory at: ${dir}`);
  try {
    if (fs.existsSync(dir)) {
      distDir = dir;
      console.log(`✅ Found dist directory at: ${dir}`);
      try {
        console.log(`Contents: ${fs.readdirSync(dir).join(', ')}`);
      } catch (err) {
        console.log(`Error reading directory contents: ${err.message}`);
      }
      break;
    }
  } catch (err) {
    console.log(`Error checking dir ${dir}: ${err.message}`);
  }
}

// Emergency build process if no dist directory is found
if (!distDir) {
  console.log('⚠️ No dist directory found! Attempting emergency build...');
  try {
    // Check if we can access npm and package.json
    if (fs.existsSync(path.join(__dirname, 'package.json'))) {
      console.log('Found package.json, attempting build...');
      const { execSync } = require('child_process');
      execSync('npm install && npx vite build', {  // Use npx vite instead of npm run build
        stdio: 'inherit',
        cwd: __dirname
      });
      
      // Check if build created a dist directory
      if (fs.existsSync(path.join(__dirname, 'dist'))) {
        distDir = path.join(__dirname, 'dist');
        console.log(`✅ Emergency build succeeded! Dist directory: ${distDir}`);
        try {
          console.log(`Contents: ${fs.readdirSync(distDir).join(', ')}`);
        } catch (err) {
          console.log(`Error reading directory contents: ${err.message}`);
        }
      }
    }
  } catch (error) {
    console.error('❌ Emergency build failed:', error.message);
  }
}

// Log directory structure for debugging
if (!distDir) {
  console.error('❌ CRITICAL: No dist directory found after all attempts');
  console.log('Current directory structure:');
  
  // Log current directory contents
  try {
    console.log(`Contents of ${__dirname}:`, fs.readdirSync(__dirname));
  } catch (err) {
    console.log(`Error reading ${__dirname}: ${err.message}`);
  }
  
  // Try to log parent directory if possible
  const parentDir = path.join(__dirname, '..');
  try {
    if (fs.existsSync(parentDir)) {
      console.log(`Contents of parent (${parentDir}):`, fs.readdirSync(parentDir));
    }
  } catch (err) {
    console.log(`Error reading parent dir: ${err.message}`);
  }
  
  // Set a fallback directory to avoid crashing, even though it won't work properly
  distDir = path.join(__dirname, 'dist');
  console.warn('⚠️ Using fallback dist directory path, app will likely not function correctly');
  
  // Check for Render.com specific paths
  if (process.env.RENDER) {
    try {
      console.log('Checking Render.com specific paths:');
      const renderPaths = [
        '/opt/render/project', 
        '/opt/render', 
        process.env.RENDER_PROJECT_DIR,
        process.env.RENDER_PROJECT_ROOT
      ].filter(Boolean);
      
      for (const rPath of renderPaths) {
        if (fs.existsSync(rPath)) {
          console.log(`Contents of ${rPath}:`, fs.readdirSync(rPath));
        }
      }
    } catch (err) {
      console.log('Error checking Render.com paths:', err.message);
    }
  }
}

// Serve static files from the dist directory
app.use(express.static(distDir));

// Handle all routes by serving the index.html file
app.get('*', (req, res) => {
  const indexPath = path.join(distDir, 'index.html');
  
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    console.error('Could not find index.html at', indexPath);
    res.status(404).send(`
      <html>
        <head><title>Build Files Not Found</title></head>
        <body style="font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
          <h1>Application Error: Build Files Not Found</h1>
          <p>The application could not find the built files. This usually happens when the build process doesn't complete successfully or when the files are stored in an unexpected location.</p>
          
          <h2>Troubleshooting Information</h2>
          <ul>
            <li>Looking for: ${indexPath}</li>
            <li>Current directory: ${__dirname}</li>
            <li>Files in current directory: ${JSON.stringify(fs.readdirSync(__dirname))}</li>
            <li>Environment: ${process.env.RENDER ? 'Render.com' : 'Unknown'}</li>
            <li>Node version: ${process.version}</li>
            <li>PORT: ${PORT}</li>
            <li>All possible dist locations checked: ${JSON.stringify(possibleDistDirs)}</li>
          </ul>
          
          <h2>Possible Solutions</h2>
          <ol>
            <li>Make sure your build command in the Render.com dashboard is set to <code>npm run build</code></li>
            <li>Ensure the start command is set to <code>node server.js</code></li>
            <li>Check that the build is completing successfully in the build logs</li>
            <li>Verify that all dependencies are installed properly</li>
          </ol>
          
          <hr />
          <p><em>This error page was generated by the Node.js server at ${new Date().toISOString()}</em></p>
        </body>
      </html>
    `);
  }
});

// Universal server startup for both cloud and local environments
const startServer = (port, fallbackPorts = []) => {
  const server = app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    if (isCloudEnvironment) {
      if (process.env.RENDER) {
        console.log(`App is deployed to: https://bankstream-parser.onrender.com`);
      } else {
        console.log(`App is deployed to: ${process.env.APP_URL || 'https://lobster-app-ngj4w.ondigitalocean.app/'}`);
      }
    } else {
      console.log(`To access the app, open: http://localhost:${port}`);
      console.log('Make sure to run this server with "node server.js" instead of using "npm run dev" separately');
    }
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.log(`Port ${port} is already in use. Trying another port...`);
      
      if (fallbackPorts.length > 0) {
        const nextPort = fallbackPorts.shift();
        startServer(nextPort, fallbackPorts);
      } else {
        console.error('All ports are in use. Please close other applications or specify a different port.');
        console.error('You can set a custom port with the PORT environment variable:');
        console.error('PORT=9000 node server.js');
        process.exit(1);
      }
    } else {
      console.error('Server error:', error);
      process.exit(1);
    }
  });
};

// Start the server with fallback ports for both environments
startServer(PORT, FALLBACK_PORTS);
