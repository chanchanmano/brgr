# Intelligent Bistro

Intelligent Bistro is a voice/chat-first food ordering app for BRGR, a smash burger restaurant. Penny is the conversational assistant that helps guests build and adjust an order through natural language while the mobile client keeps the cart local and responsive.

This first scaffold checkpoint focuses on the visual shell, navigation, local cart flow, and the backend contract. The mobile UI already reflects the intended design direction and uses a lightweight local Penny parser so the experience is testable before wiring in live Groq intent parsing and native speech recognition.

## Prerequisites

- Node.js 20+
- npm 10+
- Expo CLI tooling via `npx expo`
- A Groq API key from [console.groq.com](https://console.groq.com)

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the env templates:

   ```bash
   cp apps/backend/.env.example apps/backend/.env
   cp apps/mobile/.env.example apps/mobile/.env
   ```

3. Add your Groq API key in `apps/backend/.env`.

## Running

Start both apps together:

```bash
npm run dev
```

- Backend runs on `http://localhost:3001`
- Expo starts from `apps/mobile`

## Architecture

The frontend is an Expo React Native app using Expo Router, NativeWind v4, and Zustand for cart and session state. The backend is a small Express service that exposes a Penny parsing endpoint and is prepared to call Groq with the menu injected as prompt context. The intended speech layer is on-device recognition, while the current scaffold keeps chat interaction local so the base experience can be reviewed before adding native voice plumbing.

## Why Groq

Groq is a good fit here because low-latency inference matters more than raw model size in a conversational ordering flow.

## Notes

- The current mobile scaffold works as a UI-first checkpoint with local cart interactions.
- `@react-native-voice/voice` is not wired in this first pass because it requires custom native code and should be added only after the UI direction is approved.

