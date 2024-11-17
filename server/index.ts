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
  max_duration: 1800,
  api_keys: {
  },
  services: {
    stt: "deepgram",
    llm: "together",
    tts: "cartesia",
  },
  config: [
    {
      service: "tts",
      options: [
        { name: "voice", value: "79a125e8-cd45-4c13-8a67-188112f4dd22" }
      ]
    },
    {
      service: "llm",
      options: [
        { name: "model", value: "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo" },
        {
          name: "messages",
          value: [
            {
              role: "system",
              content:
                "You are a assistant called ExampleBot. You can ask me anything. Keep responses brief and legible. Your responses will be converted to audio, so please avoid using any special characters except '!' or '?'.",
            }
          ]
        }
      ]
    }
  ]
};

app.post('/api/connect', async (req, res) => {
  try {
    console.log('POST /api/connect', process.env.DAILY_BOTS_KEY);
    
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