import { RTVIClient } from "realtime-ai";
import { DailyTransport } from "@daily-co/realtime-ai-daily";
import { setupEventHandlers } from "./events";

async function start_bot(e) {
  console.log('starting bot');
  if (e && e.target) {
    e.target.disabled = true;
  }

  const dailyTransport = new DailyTransport();
  const rtviClient = new RTVIClient({
    transport: dailyTransport,
    params: {
      baseUrl: "api",
    },
    enableMic: true,
    enableCam: false,
    timeout: 30 * 1000,
  });

  setupEventHandlers(rtviClient);  
  
  try {
    await rtviClient.connect();
    console.log('!!! connected');
  } catch (e) {
    console.log('!!! error connecting');
    console.error(e.message);
  }
}

window.start_bot = start_bot;