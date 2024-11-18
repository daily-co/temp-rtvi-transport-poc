const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const morgan = require('morgan');  // Optional, but helpful for seeing API requests
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(morgan('dev'));
app.use(bodyParser.json());

// Parse JSON bodies
app.use(express.json());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

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
        { name: "initial_messages", value: [] },
        { name: "run_on_config", value: true },
      ]
    }
  ]
};

app.post('/api/connect', async (req, res) => {
  try {
    const llmService = payload.config.find(service => service.service === "llm");
    if (!llmService) {
      throw new Error('LLM service not found in payload');
    }
    Object.entries(req.body).forEach(([key, value]) => {
      const optionIndex = llmService.options.findIndex(
        option => option.name === key
      );
      if (optionIndex === -1) {
        // @ts-ignore
        llmService.options.push({ name: key, value });
      } else {
        // @ts-ignore
        llmService.options[optionIndex].value = value;
      }
    });

    console.log(
      'POST /api/connect\n', 
      // JSON.stringify(payload, null, 2)
    );


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