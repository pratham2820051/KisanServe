# AgriConnect — Smart Farming Service Platform

Monorepo structure:

```
/backend   — Node.js + Express + TypeScript REST API
/mobile    — React Native mobile app
/web       — React web app
```

## Quick Start

### Backend
```bash
cd backend
cp .env.example .env   # fill in your keys
npm install
npm run dev
```

### Web
```bash
cd web
npm install
npm run dev
```

### Mobile
```bash
cd mobile
npm install
npx react-native start
```

## Environment Variables

See `backend/.env.example` for all required keys (OpenAI, Firebase, Twilio, Google Translate, Weather API, MongoDB, Redis, JWT).
