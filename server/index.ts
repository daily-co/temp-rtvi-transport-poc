const express = require('express');
const path = require('path');
const morgan = require('morgan');  // Optional, but helpful for seeing API requests
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Request logging
app.use(morgan('dev'));

// Parse JSON bodies
app.use(express.json());

const payload = {
  bot_profile: "voice_2024_10",
  max_duration: 300,
  api_keys: {
    gemini: process.env.GOOGLE_API_KEY,
  },
  services: {
    stt: "deepgram",
    llm: "gemini",
    tts: "elevenlabs",
  },
  config: [
    {
      service: "vad",
      options: [
        { name: "params", value: { stop_secs: 0.7 } }
      ]
    },
    {
      service: "llm",
      options: [
        { name: "model", value: "gemini-1.5-flash-latest" },
        {
          name: "initial_messages",
          value: [
            {
              role: "system",
              content:
                "You are a helpful assistant. Your name is ExampleBot. Keep responses brief and legible. Your responses will be converted to audio, so avoid using special characters or formatting. Please do use normal punctuation at the end of a sentence.",
            },
            { role: "user", content: "Hello, ExampleBot!" },
          ]
        },
        { name: "run_on_config", value: true },
      ]
    }
  ]
};

app.post('/api/connect', async (req, res) => {
  try {
    console.log('POST /api/connect', payload);
    
    const response = await fetch("https://api.daily.co/v1/bots/start", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.DAILY_BOTS_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    console.log('--> /api/connect', data);

    if (response.status !== 200) {
      return res.status(response.status).json(data);
    }

    return res.json(data);
  } catch (error) {
    console.error('Error in /api/connect:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.listen(port, () => {
  console.log(`API server running at http://localhost:${port}`);
});