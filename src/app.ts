import { DailyTransport } from "@daily-co/realtime-ai-daily";
import { OpenAIWebSocketTransport } from "./openai-websocket-transport";

import {
  Transport,
  RTVIClient,
  RTVIEvent,
  RTVIMessage,
  Participant,
  TranscriptData,
  BotTTSTextData,
  BotLLMTextData 
} from "realtime-ai";
import { join } from "path";

//
//
//

let joinDiv;

document.addEventListener('DOMContentLoaded', () => {
  joinDiv = document.getElementById('join-div');
  document.getElementById('start-daily-transport-session').addEventListener('click', () => {
    startBot('daily');
  });
  document.getElementById('start-websocket-transport-session').addEventListener('click', () => {
    startBot('openai');
  });
});

//
//
//

async function startBot(transportChoice: string) {
  let transport: Transport;

  joinDiv.textContent = 'Joining...';


  if (transportChoice === 'daily') {
    console.log('-- starting bot with Daily transport --');
    transport = new DailyTransport();
  } else if (transportChoice === 'openai') {
    console.log('-- starting bot with OpenAI WebSocket transport --');
    transport = new OpenAIWebSocketTransport();
  } else {
    console.error('Unknown transport choice:', transportChoice);
    return;
  }

  const rtviClient = new RTVIClient({
    transport,
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

//
//
//

let audioDiv: HTMLDivElement;
let chatTextDiv: HTMLDivElement;

let currentUserSpeechDiv: HTMLDivElement;
let currentBotSpeechDiv: HTMLDivElement;
let currentSpeaker = ''; // 'user' or 'bot'

export async function setupEventHandlers(rtviClient: RTVIClient) {
  audioDiv = document.getElementById('audio') as HTMLDivElement;
  chatTextDiv = document.getElementById('chat-text') as HTMLDivElement;

  rtviClient.on(RTVIEvent.TransportStateChanged, (state: string) => {
    console.log(`-- transport state change: ${state} --`);
    joinDiv.textContent = `Transport state: ${state}`;
  });

  rtviClient.on(RTVIEvent.Connected, () => {
    console.log("-- user connected --");
  });

  rtviClient.on(RTVIEvent.Disconnected, () => {
    console.log("-- user disconnected --");
  });    

  rtviClient.on(RTVIEvent.BotConnected, () => {
    console.log("-- bot connected --");
  });

  rtviClient.on(RTVIEvent.BotDisconnected, () => {
    console.log("--bot disconnected --");
  });

  rtviClient.on(RTVIEvent.BotReady, () => {
    console.log("-- bot ready to chat! --");
  });

  rtviClient.on(RTVIEvent.TrackStarted, (track: MediaStreamTrack, participant: Participant) => {
    console.log(" --> track started", participant, track);
    if (participant.local) {
      return;
    }
    let audio = document.createElement("audio");
    audio.srcObject = new MediaStream([track]);
    audio.autoplay = true;
    audioDiv.appendChild(audio);
  });

  rtviClient.on(RTVIEvent.UserStartedSpeaking, startUserSpeechBubble);

  rtviClient.on(RTVIEvent.UserStoppedSpeaking, finishUserSpeechBubble);

  rtviClient.on(RTVIEvent.BotStartedSpeaking, startBotSpeechBubble);

  rtviClient.on(RTVIEvent.BotStoppedSpeaking, finishBotSpeechBubble);

  rtviClient.on(RTVIEvent.UserTranscript, (transcript: TranscriptData) => {
    if (transcript.final) {
      handleUserFinalTranscription(transcript.text);
    } else {
      handleUserInterimTranscription(transcript.text);
    }
  });

  rtviClient.on(RTVIEvent.BotTtsText,
    // this is a hack: need to make Pipecat pipeline setting for this configurable.
    (data) => handleBotStreamedVoiceText(data, rtviClient._transport instanceof DailyTransport)
  );

  rtviClient.on(RTVIEvent.BotTranscript, handleBotLLMText);

  rtviClient.on(RTVIEvent.Error, (message: RTVIMessage) => {
    console.log("[EVENT] RTVI Error!", message);
  });

  rtviClient.on(RTVIEvent.MessageError, (message: RTVIMessage) => {
    console.log("[EVENT] RTVI ErrorMessage error!", message);
  });

  rtviClient.on(RTVIEvent.Metrics, (data) => {
    // let's only print out ttfb for now
    if (! data.ttfb) {
      return;
    }
    data.ttfb.map((metric) => {
      console.log(`[METRICS] ${metric.processor} ttfb: ${metric.value}`);
    });
  });
}


async function startUserSpeechBubble() {
  console.log('-- user started speaking -- ');
  if (currentSpeaker === 'user') {
    if (currentUserSpeechDiv) {
      return;
    }
    // Should never get here, but, you know.
  }
  currentSpeaker = 'user';
  // First check if we need to remove an empty assistant speech bubble. This can happen
  // if there's a fast user interruption.
  if (currentBotSpeechDiv && currentBotSpeechDiv.textContent === '') {
    chatTextDiv.removeChild(currentBotSpeechDiv);
    currentBotSpeechDiv = null;
    if (!currentUserSpeechDiv) {
      currentUserSpeechDiv = document.createElement('div');
      currentUserSpeechDiv.className = 'user-message';      
    }
  } else {
    currentUserSpeechDiv = document.createElement('div');
    currentUserSpeechDiv.className = 'user-message';
  }
  let span = document.createElement('span');
  currentUserSpeechDiv.appendChild(span);
  chatTextDiv.appendChild(currentUserSpeechDiv);
}

async function finishUserSpeechBubble() {
  console.log('-- user stopped speaking -- ');
  // noop for now. Could do UI update here.
}

async function startBotSpeechBubble() {
  currentSpeaker = 'bot';
  currentBotSpeechDiv = document.createElement('div');
  currentBotSpeechDiv.className = 'assistant-message';
  chatTextDiv.appendChild(currentBotSpeechDiv);
}

async function finishBotSpeechBubble() {
  console.log('-- bot stopped speaking -- ');
}

async function handleUserInterimTranscription(text: string) {
  console.log('interim transcription:', text);
  if (currentSpeaker !== 'user') {
    return;
  }
  let span = currentUserSpeechDiv.querySelector('span:last-of-type');
  span.classList.add('interim');
  span.textContent = text + " ";
  scroll();
}

async function handleUserFinalTranscription(text: string) {
  console.log('final transcription:', text);
  // // Ignore transcriptions that arrive while the bot is talking.
  // if (currentSpeaker === 'bot') {
  //   return;
  // }
  let span = currentUserSpeechDiv.querySelector('span:last-of-type');
  span.classList.remove('interim');
  span.textContent = text + " ";
  let newSpan = document.createElement('span');
  currentUserSpeechDiv.appendChild(newSpan);
  scroll();
}

async function handleBotStreamedVoiceText(data: BotTTSTextData, addSpaces: boolean) {
  console.log('bot streamed text:', data.text);
  if (!currentBotSpeechDiv) {
    return;
  }
  currentBotSpeechDiv.textContent += data.text + (addSpaces ? " " : "");
  scroll();
}

async function handleBotLLMText(data: BotLLMTextData) {
  console.log('bot llm text:', data.text);
}

function scroll() {
  window.scrollTo({
    top: document.body.scrollHeight,
    behavior: 'smooth'
  });
}
