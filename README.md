
# WebSocket Transport Pipecat JavaScript Client SDK Example

## Install and run locally

```
npm i
npm run dev

cp env.example .env
# now add API keys to .env
```

Open [http://localhost:5173/](http://localhost:5173/)

## Demo code

This is bare-bones LLM voice chat app that can use either a Daily WebRTC connection or a WebSocket connection directly to the OpenAI Realtime API servers.

The code is intended as a proof-of-concept for implementing "transports" for the Pipecat RTVI (client-side) SDKs for Web, React, iOS, Android, and C++.

The application code is all in two files:

  - [index.html](./index.html)
  - [src/app.ts](./src/app.ts)

A very basic (not production-ready) transport implementation for the OpenAI Realtime API is in [src/openai-websocket-transport.ts](./src/openai-websocket-transport.ts)

The Pipecat RTVI (client-side) JavaScript SDK and the Daily WebRTC transport implementation are installed from npm.

