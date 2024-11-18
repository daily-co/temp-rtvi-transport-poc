import { RTVIClient } from "realtime-ai";
import { setupJoinButton, setupEventHandlers } from "./events";

import { DailyTransport } from "@daily-co/realtime-ai-daily";
import { OpenAIWebSocketTransport } from "./openai-websocket-transport";

document.addEventListener('DOMContentLoaded', () => {
  setupJoinButton(startBot);
});

async function startBot() {
  console.log('-- starting bot --');

  const rtviClient = new RTVIClient({
    transport: new DailyTransport(),
    // transport: new OpenAIWebSocketTransport(),
    params: {
      baseUrl: "api", // not currently used for OpenAI transport
      requestData: {
        initial_messages: [
          {
            role: "system",
            content:
              "You are a helpful assistant. Your name is ExampleBot. Keep responses brief and legible. Your responses will be converted to audio, so avoid using special characters or formatting. Please do use normal punctuation at the end of a sentence.",
          },
          { role: "user", content: "Hello, ExampleBot!" },
        ]
      }
    },
    enableMic: true,
    enableCam: false,
    timeout: 30 * 1000,
  });

  setupEventHandlers(rtviClient);  
  
  try {
    await rtviClient.initDevices();
    await rtviClient.connect();
  } catch (e) {
    console.log('Error connecting', e);
  }
}
