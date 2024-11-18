
import { RealtimeClient } from '@openai/realtime-api-beta';
import { WavRecorder, WavStreamPlayer } from './lib/wavtools/index.js';

import {
  Participant,
  Tracks,
  Transport,
  TransportStartError,
  TransportState,
  RTVIClientOptions,
  RTVIMessage,
  RTVIError,
} from "realtime-ai";

export class OpenAIWebSocketTransport extends Transport {
  private declare _openai: RealtimeClient;

  // Use openai's utilities for audio. daily-js utilities are more full-featured; we could
  // use them here, at the cost of requiring a daily-js dependency.
  private _wavRecorder;
  private _wavStreamPlayer;

  private _botIsSpeaking = false;

  constructor() {
    console.log('-- OpenAIWebSocketTransport constructor --');
    super();
  }

    public initialize(
      options: RTVIClientOptions,
      messageHandler: (ev: RTVIMessage) => void
    ): void {
      this._options = options;
      this._callbacks = options.callbacks ?? {};
      this._onMessage = messageHandler;

      this.state = "initializing";
      this._callbacks.onTransportStateChanged?.(this.state);

      this._wavRecorder = new WavRecorder({ sampleRate: 24000 })
      this._wavStreamPlayer = new WavStreamPlayer({ sampleRate: 24000 });
      this._openai = new RealtimeClient({
        apiKey: import.meta.env.VITE_DANGEROUS_OPENAI_API_KEY,
        dangerouslyAllowAPIKeyInBrowser: true,
      });
      this.attachEventListeners();

      this.state = "initialized";
      this._callbacks.onTransportStateChanged?.(this.state);
    }

    async initDevices() {
      console.log('-- OpenAIWebSocketTransport initDevices --');
      await this._wavRecorder.begin();
      await this._wavStreamPlayer.connect();
    }

    async connect(
      authBundle: unknown,
      abortController: AbortController
    ) {
      console.log('-- OpenAIWebSocketTransport connect --');

      this.state = "connecting";
      this._callbacks.onTransportStateChanged?.(this.state);
      await this._openai.connect();

      // Support only OpenAI's built-in phrase endpointing for now
      this._openai.updateSession({
        turn_detection: { type: 'server_vad', silence_duration_ms: 700 },
        input_audio_transcription: { model: 'whisper-1' }
      });

      // For this bare-bones prototype, let's just see if we have any initial_messages in the params
      // we were constructed with.
      let messages = this._options.params?.requestData?.initial_messages;
      if (messages) {
        if (messages[0].role === 'system') {
          let systemMessage = messages.shift();
          this._openai.updateSession({ instructions: systemMessage.content})
        }
        let user_message = messages.shift();
        if (user_message && user_message.role === 'user') {
          this._openai.sendUserMessageContent([
            {
              type: `input_text`,
              text: user_message.content,
            },
          ]);
        }
        if (messages.length > 0) {
          console.warn('Can only send a single message to initialize the context. (See bug reports.)');
        }
      }

      // Kick off async audio input using the OpenAI WavRecorder utility
      this.startInputAudioWorker();
      this.state = "connected";
      this._callbacks.onTransportStateChanged?.(this.state);
      this._callbacks.onConnected?.();
    }

    async sendReadyMessage(): Promise<void> {
      this.state = "ready";
      this._callbacks.onTransportStateChanged?.(this.state);
    }


    private attachEventListeners() {
      const client = this._openai;

      client.on('realtime.event', async ({time, event}) => {
        switch(event.type) {
          case 'input_audio_buffer.speech_started':
            // Handle interruption
            const trackSampleOffset = await this._wavStreamPlayer.interrupt();
            if (trackSampleOffset?.trackId) {
              const { trackId, offset } = trackSampleOffset;
              // This helper method send both the cancel and truncate events. Note that
              // truncate applies only to audio. There is no easy way to truncate the text
              // we've received and displayed in the UI.
              client.cancelResponse(trackId, offset);
            }
            this._callbacks.onUserStartedSpeaking()
            break;
          case 'input_audio_buffer.speech_stopped':
            this._callbacks.onUserStoppedSpeaking()
            break;
          case 'conversation.item.input_audio_transcription.completed':
            // User transcripts usually arrive after the bot has started speaking again
            this._callbacks.onUserTranscript({
              text: event.transcript,
              final: true,
              timestamp: time,
              user_id: "user",
            })
            break;
          case 'response.content_part.added':
            if (event?.part?.type === 'audio' && !this._botIsSpeaking) {
              this._botIsSpeaking = true;
              this._callbacks.onBotStartedSpeaking()
            }
            break;
          case 'response.audio.done':
            this._callbacks.onBotStoppedSpeaking()
            this._botIsSpeaking = false;
            break;
          case 'response.audio_transcript.delta':
            // There does not seem to be a way to align bot text output with audio. Text
            // streams faster than audio and all events, and all events are streamed at
            // LLM output speed.
            this._callbacks.onBotTtsText({ text: event.delta })
            break;
          default:
            break;
        }

        // Uncomment the return to debug incoming events
        return
        if (event.type === 'input_audio_buffer.append') {
          // These events are very frequent.
          // console.debug('input_audio_buffer.append', event);
          return;
        }
        console.log('realtime.event', event);

      })

      client.on('conversation.item.completed', ({ item }) => {
        console.log('--> conversation item completed', item);
      });

      client.on('input_audio_buffer.speech_started', (event: any) => {
        console.log('--> speech started', event);
        this._callbacks.onUserStartedSpeaking()
      })

      // Audio playout
      client.on('conversation.updated', async ({ item, delta }: any) => {
        const items = client.conversation.getItems();
        console.log("conversation transport state", this.state);
        if (delta?.audio) {
          this._wavStreamPlayer.add16BitPCM(delta.audio, item.id);
        }
      })

      client.on('error', (error: Error) => {
        console.error('error', error);
      })
    }

    private async startInputAudioWorker() {
      await this._wavRecorder.record((data) => {
        if (this.state === "ready") {
          try {
            this._openai.appendInputAudio(data.mono);
          } catch (error) {
            console.error('Error adding audio to stream player', error);
            this.state = "error";
            this._callbacks.onTransportStateChanged?.(this.state);
            // todo: should check this error more carefully, implement disconnect, implement
            // ping/ack connection monitoring and reconnection logic, etc.
          }
        }
      });
  }
}