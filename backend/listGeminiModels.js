// Usage: node listGeminiModels.js
// Make sure your .env file contains GEMINI_API_KEY=your_gemini_api_key_here
require('dotenv').config();
const axios = require('axios');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY not set in .env');
  process.exit(1);
}

const url = `https://generativelanguage.googleapis.com/v1/models?key=${GEMINI_API_KEY}`;

axios.get(url)
  .then(res => {
    console.log('Available Gemini models:');
    if (res.data.models) {
      res.data.models.forEach(model => {
        console.log(`- ${model.name}`);
        if (model.supportedGenerationMethods) {
          console.log(`  Supported methods: ${model.supportedGenerationMethods.join(', ')}`);
        }
      });
    } else {
      console.log(res.data);
    }
  })
  .catch(err => {
    console.error('Error listing models:', err.response?.data || err.message);
  }); 