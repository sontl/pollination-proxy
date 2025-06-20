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

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Route to get server IP
app.get('/api/ip', (req, res) => {
  // Get the server's IP address
  const serverIP = req.headers['x-forwarded-for'] || 
                   req.socket.remoteAddress || 
                   'Unknown';
  
  res.json({ ip: serverIP });
});

// Proxy route for Pollinations API
app.get('/api/pollinations', async (req, res) => {
  try {
    const { prompt, model, width, height, seed } = req.query;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    
    // Default values
    const modelCode = model || 'flux';
    const imageWidth = width || 1024;
    const imageHeight = height || 1024;
    const imageSeed = seed || Math.floor(Math.random() * 1000000);
    
    // Construct the Pollinations URL with parameters
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?model=${modelCode}&width=${imageWidth}&height=${imageHeight}&seed=${imageSeed}&nologo=true&token=${process.env.POLLINATIONS_API_TOKEN}&referrer=singmesong.com`;
    
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
    
    // Pipe the response from Pollinations to our response
    response.data.pipe(res);
  } catch (error) {
    console.error('Error proxying to Pollinations:', error.message);
    res.status(500).json({ error: 'Failed to proxy request to Pollinations API' });
  }
});

// Proxy route for image editing with gptimage
app.get('/api/edit-image', async (req, res) => {
  try {
    const { prompt, image } = req.query;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    
    if (!image) {
      return res.status(400).json({ error: 'Image URL is required' });
    }

    // Handle multiple images - they will be comma separated
    const imageUrls = image.split(',').map(url => url.trim());
    
    // Construct the Pollinations URL for image editing with all reference images
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?model=gptimage&image=${imageUrls.map(url => encodeURIComponent(url)).join(',')}&token=${process.env.POLLINATIONS_API_TOKEN}&referrer=singmesong.com`;
    
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
    
    // Pipe the response from Pollinations to our response
    response.data.pipe(res);
  } catch (error) {
    console.error('Error proxying to image editing:', error.message);
    res.status(500).json({ error: 'Failed to proxy request to Pollinations API' });
  }
});

// Default route to serve the main HTML page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});