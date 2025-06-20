const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all routes
app.use(cors());

// Parse JSON bodies
app.use(express.json());

// Configure server timeout (10 minutes)
app.use((req, res, next) => {
  res.setTimeout(600000, () => {
    console.error(`[${new Date().toISOString()}] Request timeout: ${req.url}`);
    res.status(504).json({ error: 'Request timeout' });
  });
  next();
});

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Route to get server IP
app.get('/api/ip', (req, res) => {
  // Get the server's IP address
  const serverIP = req.headers['x-forwarded-for'] || 
                   req.socket.remoteAddress || 
                   'Unknown';
  console.log(`[${new Date().toISOString()}] /api/ip requested. Responding with IP: ${serverIP}`);
  res.json({ ip: serverIP });
});

// Proxy route for Pollinations API
app.get('/api/pollinations', async (req, res) => {
  try {
    const { prompt, model, width, height, seed } = req.query;
    console.log(`[${new Date().toISOString()}] /api/pollinations called with params:`, req.query);

    if (!prompt) {
      console.warn(`[${new Date().toISOString()}] /api/pollinations missing prompt`);
      return res.status(400).json({ error: 'Prompt is required' });
    }
    
    // Default values
    const modelCode = model || 'flux';
    const imageWidth = width || 1024;
    const imageHeight = height || 1024;
    const imageSeed = seed || Math.floor(Math.random() * 1000000);
    
    // Construct the Pollinations URL with parameters
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?model=${modelCode}&width=${imageWidth}&height=${imageHeight}&seed=${imageSeed}&nologo=true&token=${process.env.POLLINATIONS_API_TOKEN}&referrer=singmesong.com`;
    console.log(`[${new Date().toISOString()}] Forwarding to Pollinations API: ${pollinationsUrl}`);
    
    // Forward the request to Pollinations API
    const response = await axios({
      method: 'get',
      url: pollinationsUrl,
      responseType: 'stream',
      headers: {
        'Referer': 'https://singmesong.com/'
      }
    });
    
    // Set the appropriate headers
    res.set('Content-Type', response.headers['content-type']);
    console.log(`[${new Date().toISOString()}] Pollinations API responded with content-type: ${response.headers['content-type']}`);
    
    // Pipe the response from Pollinations to our response
    response.data.pipe(res);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error proxying to Pollinations:`, error.message);
    if (error.response) {
      console.error(`[${new Date().toISOString()}] Pollinations API error response:`, error.response.status, error.response.data);
    }
    res.status(500).json({ error: 'Failed to proxy request to Pollinations API' });
  }
});

// Proxy route for image editing with gptimage
app.get('/api/edit-image', async (req, res) => {
  try {
    const { prompt, image, width, height } = req.query;
    console.log(`[${new Date().toISOString()}] /api/edit-image called with params:`, req.query);

    if (!prompt) {
      console.warn(`[${new Date().toISOString()}] /api/edit-image missing prompt`);
      return res.status(400).json({ error: 'Prompt is required' });
    }
    
    if (!image) {
      console.warn(`[${new Date().toISOString()}] /api/edit-image missing image`);
      return res.status(400).json({ error: 'Image URL is required' });
    }

    // Handle multiple images - they will be comma separated
    const imageUrls = image.split(',').map(url => url.trim());
    console.log(`[${new Date().toISOString()}] Reference images:`, imageUrls);
    
    // Default values for width and height if not provided
    const imageWidth = width || 512;
    const imageHeight = height || 512;
    
    // Construct the Pollinations URL for image editing with all reference images
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?model=gptimage&image=${imageUrls.map(url => encodeURIComponent(url)).join(',')}&width=${imageWidth}&height=${imageHeight}&token=${process.env.POLLINATIONS_API_TOKEN}&referrer=singmesong.com&nologo=true`;
    console.log(`[${new Date().toISOString()}] Forwarding to Pollinations API (edit-image): ${pollinationsUrl}`);
    
    // Forward the request to Pollinations API with increased timeout
    const response = await axios({
      method: 'get',
      url: pollinationsUrl,
      responseType: 'stream',
      timeout: 600000, // 10 minutes timeout
      headers: {
        'Referer': 'https://singmesong.com/'
      }
    });
    
    // Set the appropriate headers
    res.set('Content-Type', response.headers['content-type']);
    console.log(`[${new Date().toISOString()}] Pollinations API (edit-image) responded with content-type: ${response.headers['content-type']}`);
    
    // Pipe the response from Pollinations to our response
    response.data.pipe(res);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error proxying to image editing:`, error.message);
    if (error.response) {
      console.error(`[${new Date().toISOString()}] Pollinations API error response:`, error.response.status, error.response.data);
    }
    res.status(500).json({ error: 'Failed to proxy request to Pollinations API' });
  }
});

// Default route to serve the main HTML page
app.get('/', (req, res) => {
  console.log(`[${new Date().toISOString()}] Serving index.html`);
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Pollinations API Token present: ${!!process.env.POLLINATIONS_API_TOKEN}`);
});