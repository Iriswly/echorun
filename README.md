# EchoRun

EchoRun is a high-fidelity mobile running app prototype built with React and Vite. It lets users choose an AI running coach, simulate a run, compete against previous runs in Ghost Run mode, and review running history with points, levels, and badges.

## Features

- AI coach selection with distinct coaching styles, colors, voice samples, and motivational messages.
- Standard run simulation with live time, distance, pace, route progress, pause, resume, and stop controls.
- Ghost Run mode for racing against a previous run record.
- Post-run results with points, badge unlocks, and win/loss/tie feedback.
- Run archive showing recent runs, performance stats, earned XP, levels, and badges.
- Local persistence using browser `localStorage`.
- Mobile-first interface based on a Figma high-fidelity UI design.

## Tech Stack

- React 18
- Vite 6
- TypeScript
- React Router
- Tailwind CSS
- Motion
- Lucide React icons
- Radix UI components

## Getting Started

### Prerequisites

- Node.js
- npm

### Install Dependencies

```bash
npm install
```

### Run the Development Server

```bash
npm run dev
```

Open the local URL printed by Vite in your browser.

### Build for Production

```bash
npm run build
```

The production build will be generated in the `dist` directory.

### Deploy

```bash
npm run deploy
```

This project is configured to deploy the `dist` directory with `gh-pages`.

## Project Structure

```text
src/
  app/
    App.tsx
    routes.tsx
    components/
      CoachSelection.tsx
      GhostRunTracking.tsx
      PostRunDashboard.tsx
      ui/
  styles/
  utils/
    badges.js
    coachMessages.js
    profile.js
    scoring.js
    storage.js
```

## Main Screens

- `CoachSelection`: choose and preview an AI running coach.
- `GhostRunTracking`: run simulation and Ghost Run competition screen.
- `PostRunDashboard`: history, stats, badges, and rematch entry point.

## Data Storage

EchoRun stores app data in browser `localStorage`:

- `ECHORUN_COACH`: selected coach settings.
- `ECHORUN_RUNS`: saved run history.
- `ECHORUN_PROFILE`: user points, level, totals, wins, losses, and badges.

## Notes

This is a front-end prototype. Voice coaching uses Alibaba Cloud Bailian APIs directly from the browser, while run history and profile data still live only in browser storage.

The original Figma design is available at:

https://www.figma.com/design/vuQYChIbAaSXmNcm6iAyKA/High-Fidelity-Mobile-UI-Design

## Running the project

Run `npm i` to install dependencies.

Run `npm run dev` to start the development server.

## AMap live location setup

This project uses the AMap JavaScript API on the `liverun` screen and stays fully frontend-only.

Copy `.env.example` to a local `.env.local` file in the project root and add your own demo keys:

```bash
VITE_AMAP_API_KEY=your_amap_js_api_key
VITE_AMAP_SECURITY_JS_CODE=your_amap_security_js_code
VITE_DASHSCOPE_API_KEY=your_dashscope_api_key
VITE_DASHSCOPE_MODEL=qwen-plus
```

Notes:

- `VITE_AMAP_API_KEY` is required.
- `VITE_AMAP_SECURITY_JS_CODE` is recommended for current AMap web security checks.
- `VITE_DASHSCOPE_API_KEY` enables AI-generated live coach lines through Alibaba Cloud Bailian's DashScope compatible API. If it is missing or the request fails, the app falls back to built-in scripted coach messages.
- `VITE_DASHSCOPE_MODEL` is optional. The default is `qwen-plus`.
- EchoRun now uses Bailian TTS for both default coach playback and custom voice generation. The default runtime TTS model is `cosyvoice-v3-plus`.
- This is a front-end prototype. `.env.local` is only for local demos and should not be committed with real keys.
- After editing env vars, restart `npm run dev`.
- In the browser, allow location permission, otherwise live tracking cannot work.

## Manual Test Checklist

- Open the coach selection page and confirm it does not automatically request voice previews.
- Click one default coach sample and confirm audio starts or a clear fallback/error appears.
- Disable or break the DashScope key locally and confirm the preview button recovers after failure.
- Quickly click multiple coach samples and confirm only one voice plays at a time.
- Stop a playing sample and confirm another sample can play afterward.
- Generate a custom voice and confirm its saved target model is used for later synthesis.
- Keep real keys in `.env.local`; use `.env.example` for shareable configuration.
