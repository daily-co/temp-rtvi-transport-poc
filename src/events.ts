import { RTVIEvent, RTVIMessage, RTVIClient, Participant, TranscriptData, BotTTSTextData, PipecatMetricData, BotLLMTextData } from "realtime-ai";

let audioDiv: HTMLDivElement;
let chatTextDiv: HTMLDivElement;

let currentUserSpeechDiv: HTMLDivElement;
let currentBotSpeechDiv: HTMLDivElement;
let currentSpeaker = ''; // 'user' or 'bot'

export async function setupEventHandlers(rtviClient: RTVIClient) {
  audioDiv = document.getElementById('audio') as HTMLDivElement;
  chatTextDiv = document.getElementById('chat-text') as HTMLDivElement;


  rtviClient.on(RTVIEvent.Connected, () => {
    console.log("[EVENT] User connected");
  });

  rtviClient.on(RTVIEvent.Disconnected, () => {
    console.log("[EVENT] User disconnected");
  });    

  rtviClient.on(RTVIEvent.BotConnected, () => {
    console.log("[EVENT] Bot connected");
  });

  rtviClient.on(RTVIEvent.BotDisconnected, () => {
    console.log("[EVENT] Bot disconnected");
  });

  rtviClient.on(RTVIEvent.BotReady, () => {
    console.log("[EVENT] Bot ready to chat!");
  });

  rtviClient.on(RTVIEvent.TrackStarted, (track: MediaStreamTrack, participant: Participant) => {
    console.log("[EVENT] Track started", participant, track);
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

  rtviClient.on(RTVIEvent.BotTtsText, handleBotStreamedText);

  rtviClient.on(RTVIEvent.Error, (message: RTVIMessage) => {
    console.log("[EVENT] Bot error!", message);
  });

  rtviClient.on(RTVIEvent.Metrics, (data) => {
    // console.log("[EVENT] Metrics", data);
    // let's only print out ttfb for now
    if (! data.ttfb) {
      return;
    }
    data.ttfb.map((metric) => {
      console.log(`[METRICS] ${metric.processor} ttfb: ${metric.value}`);
    });
  });

  rtviClient.on(RTVIEvent.BotTranscript, (text: BotLLMTextData) => {
    console.log('bot text from llm prior to tts:', text);
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
  // noop for now. Could do UI update here.
}

async function handleUserInterimTranscription(text: string) {
  console.log('interim transcription:', text);
  // Ignore transcriptions that arrive while the bot is talking.
  if (currentSpeaker === 'bot') {
    return;
  }
  let span = currentUserSpeechDiv.querySelector('span:last-of-type');
  span.classList.add('interim');
  span.textContent = text + " ";
  window.scrollTo({
    top: document.body.scrollHeight,
    behavior: 'smooth'
});
}

async function handleUserFinalTranscription(text: string) {
  console.log('final transcription:', text);
  // Ignore transcriptions that arrive while the bot is talking.
  if (currentSpeaker === 'bot') {
    return;
  }
  let span = currentUserSpeechDiv.querySelector('span:last-of-type');
  span.classList.remove('interim');
  span.textContent = text + " ";
  let newSpan = document.createElement('span');
  currentUserSpeechDiv.appendChild(newSpan);
  window.scrollTo({
    top: document.body.scrollHeight,
    behavior: 'smooth'
  });
}

async function handleBotStreamedText(text: BotTTSTextData) {
  console.log('bot streamed text:', text);
  if (!currentBotSpeechDiv) {
    return;
  }
  currentBotSpeechDiv.textContent += text.text + " ";
  window.scrollTo({
    top: document.body.scrollHeight,
    behavior: 'smooth'
  });
}
