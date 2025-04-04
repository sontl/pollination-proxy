const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

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
    const modelCode = model || 'stable-diffusion';
    const imageWidth = width || 512;
    const imageHeight = height || 512;
    const imageSeed = seed || Math.floor(Math.random() * 1000000);
    
    // Construct the Pollinations URL with parameters
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?model=${modelCode}&width=${imageWidth}&height=${imageHeight}&seed=${imageSeed}&nologo=true`;
    
    // Forward the request to Pollinations API
    const response = await axios({
      method: 'get',
      url: pollinationsUrl,
      responseType: 'stream'
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

// Default route to serve the main HTML page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});