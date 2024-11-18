
# WebSocket Transport Pipecat JavaScript Client SDK Example

## Install and run locally

```
npm i
npm run dev
```

Open [http://localhost:5173/](http://localhost:5173/)

## Demo code

This is bare-bones LLM voice chat that can use either a Daily WebRTC Transport or a WebSocket transport connecting directly to the OpenAI Realtime API servers.

The application code is all in a single JavaScript file: [src/app.ts](./src/app.ts). 

A very basic (not production-ready) transport implementation for the OpenAI Realtime API is in [src/openai-websocket-transport.ts](./src/openai-websocket-transport.ts)