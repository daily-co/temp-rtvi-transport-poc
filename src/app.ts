import { RTVIClient } from "realtime-ai";
import { DailyTransport } from "@daily-co/realtime-ai-daily";
import { setupJoinButton, setupEventHandlers } from "./events";

document.addEventListener('DOMContentLoaded', () => {
  setupJoinButton(startBot);
});

async function startBot() {
  console.log('-- starting bot --');

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
  } catch (e) {
    console.log('!!! error connecting');
  }
}
