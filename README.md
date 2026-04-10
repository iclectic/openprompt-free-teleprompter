<div align="center">

# Cuevora

**Professional-grade teleprompter for iOS, Android, and the web.**

*Teleprompter features, actually free.*

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Capacitor](https://img.shields.io/badge/Capacitor-7-119EFF?logo=capacitor&logoColor=white)](https://capacitorjs.com)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

<br />

[Features](#features) · [Screenshots](#screenshots) · [Architecture](#architecture) · [Getting Started](#getting-started) · [Deployment](#deployment)

</div>

---

## Overview

Cuevora is a cross-platform teleprompter application engineered to deliver a native-quality experience on every device from a single TypeScript codebase. It targets content creators, public speakers, journalists, and media professionals who need reliable, low-latency script scrolling with integrated camera recording — without subscription paywalls.

### Design Goals

| Principle | Implementation |
|-----------|---------------|
| **Single codebase, three platforms** | React + Capacitor compiles to iOS, Android, and PWA from one source tree |
| **60 fps scroll performance** | `requestAnimationFrame`-driven animation loop with delta-time interpolation |
| **Offline-first** | All data persisted in `localStorage`; service worker caches static assets for full offline use |
| **Accessibility-first input** | Voice commands (Web Speech API), touch gestures, and keyboard shortcuts — all first-class |
| **Zero vendor lock-in** | Firebase Auth is optional; the app is fully functional in guest mode with no backend dependency |

---

## Screenshots

<div align="center">
<table>
<tr>
<td align="center"><img src="docs/screenshots/splash-screen.png" width="200" /><br /><b>Splash Screen</b></td>
<td align="center"><img src="docs/screenshots/home-screen.png" width="200" /><br /><b>Home</b></td>
<td align="center"><img src="docs/screenshots/player-playback.png" width="200" /><br /><b>Teleprompter</b></td>
</tr>
<tr>
<td align="center"><img src="docs/screenshots/player-teleprompter.png" width="200" /><br /><b>Scrolling</b></td>
<td align="center"><img src="docs/screenshots/player-mirror-mode.png" width="200" /><br /><b>Mirror Mode</b></td>
<td align="center"><img src="docs/screenshots/camera-permission.png" width="200" /><br /><b>Camera Access</b></td>
</tr>
<tr>
<td align="center"><img src="docs/screenshots/record-mode-camera.png" width="200" /><br /><b>Record Mode</b></td>
<td align="center"><img src="docs/screenshots/recording-preview.png" width="200" /><br /><b>Recording Preview</b></td>
<td align="center"><img src="docs/screenshots/recording-share.png" width="200" /><br /><b>Share / Export</b></td>
</tr>
</table>
</div>

---

## Features

### Teleprompter Engine

- **Frame-perfect scrolling** — `requestAnimationFrame` loop with delta-time calculation guarantees smooth 60 fps playback regardless of device refresh rate
- **Speed control** — Continuous range (1–10×) with named presets (Slow / Medium / Fast / Turbo)
- **Mirror mode** — CSS `scaleX(-1)` transform for beam-splitter and reflective glass setups
- **Focus line** — Semi-transparent gradient highlight anchored at 40% viewport height to guide the reader's eye
- **Countdown timer** — Configurable pre-roll (3 / 5 / 10 seconds) with spring-animated digits
- **4 player themes** — Dark, Light, Studio, High Contrast — selectable during playback
- **Typography controls** — Font size (16–72 px), line spacing (1.0–3.0×), real-time adjustment via slider or pinch gesture
- **Progress telemetry** — Scroll progress bar, elapsed timer, percentage, and estimated time remaining — all computed from word count and WPM setting

### Multi-Modal Input

| Mode | Controls |
|------|----------|
| **Voice** | Web Speech API — "play", "pause", "faster", "slower", "reset" with live transcript indicator |
| **Gesture** | Tap zones (left = rewind, right = forward, center = toggle UI), swipe up/down = speed, pinch = font size, double-tap = play/pause |
| **Keyboard** | Space (play/pause), ↑↓ (speed), ←→ (seek), M (mirror), F (focus), R (reset), Esc (back) |

### Camera & Recording

- **Live camera overlay** — Front-facing camera rendered behind semi-transparent script text, toggleable from the player toolbar
- **Record mode** — Dedicated recording view with camera + teleprompter, `MediaRecorder` API capturing video+audio in MP4/WebM
- **Camera switching** — Toggle between front and rear cameras without stopping playback
- **Split view** — Side-by-side camera and script layout as an alternative to overlay
- **Native export** — Recordings saved via Capacitor `Filesystem` + `Share` plugins on Android/iOS; standard download on web

### Script Management

- **Create, edit, organise** — Tag-based organisation, search, and quick-resume for recent scripts
- **Auto-save** — Debounced persistence on every keystroke with visual confirmation
- **Version history** — Up to 10 revisions per script with full content snapshots
- **Import / Export** — `.txt` file import/export and full JSON backup/restore for cross-device migration
- **Analytics** — Word count, character count, and estimated read time (configurable WPM) displayed in the editor

### Authentication

- **Firebase Auth** — Google Sign-In and Apple Sign-In via `firebase/auth` with conditional initialisation
- **Guest mode** — Fully functional without any account; data stored locally on-device
- **Graceful degradation** — If Firebase credentials are not configured, the auth UI adapts to show guest-only flow

### Theming

- **System-aware dark mode** — `colorMode` setting (`system` / `light` / `dark`) with `matchMedia` listener for real-time system theme changes
- **Tailwind `class` strategy** — Dark mode toggled via root `<div>` class, enabling per-component dark variants
- **CSS custom properties** — All brand colours defined as HSL tokens in `:root` and `.dark`, ensuring consistent theming across 60+ components

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Presentation                         │
│  React 18 · TypeScript · TailwindCSS · shadcn/ui · Motion  │
├─────────────────────────────────────────────────────────────┤
│                      Application Logic                      │
│  React Router v6 · Auth Context · Settings Context          │
│  Voice Control Hook · Gesture Control Hook                  │
├─────────────────────────────────────────────────────────────┤
│                       Data & Storage                        │
│  localStorage (scripts, revisions, settings)                │
│  Service Worker (offline cache)                             │
│  Firebase Auth (optional)                                   │
├─────────────────────────────────────────────────────────────┤
│                     Platform Abstraction                    │
│  Capacitor.js · StatusBar · Keyboard · SplashScreen         │
│  Filesystem · Share · WakeLock API                          │
├──────────────────┬──────────────────┬───────────────────────┤
│    iOS (Swift)   │ Android (Kotlin) │   Web (PWA + SW)      │
└──────────────────┴──────────────────┴───────────────────────┘
```

### Key Design Decisions

1. **`requestAnimationFrame` over CSS animations** — Scroll speed must be dynamically adjustable mid-playback. A JS animation loop with delta-time interpolation provides frame-accurate speed changes without layout thrashing.

2. **Capacitor over React Native** — The teleprompter UI is text-heavy and scroll-driven — a WebView performs identically to native for this use case while sharing 100% of the React codebase. Capacitor bridges only the native APIs that matter: camera permissions, filesystem, share sheet, status bar.

3. **localStorage over SQLite** — Script data is small (< 1 MB typical). `localStorage` is synchronous, zero-dependency, and works identically on web and Capacitor WebView. This eliminates an entire database layer and its associated migration complexity.

4. **Conditional Firebase** — Auth is behind a feature flag (`firebaseConfigured`). The app initialises Firebase only when all six environment variables are present, allowing fully offline operation by default.

5. **CSS custom properties for theming** — Rather than Tailwind's `dark:` modifier alone, HSL tokens in `:root` / `.dark` allow the player's four themes (which are independent of app-level dark mode) to coexist without class name conflicts.

---

## Project Structure

```
cuevora/
├── src/
│   ├── components/           # Reusable UI (shadcn/ui primitives + custom)
│   │   ├── ui/               # Button, Slider, Switch, Input, Badge, etc.
│   │   └── ProtectedRoute.tsx
│   ├── hooks/                # Custom React hooks
│   │   ├── use-voice-control.ts      # Web Speech API integration
│   │   ├── use-gesture-controls.ts   # Multi-touch gesture recognition
│   │   ├── use-mobile.tsx
│   │   └── use-toast.ts
│   ├── lib/                  # Core services
│   │   ├── auth-context.tsx  # Firebase Auth provider + guest mode
│   │   ├── capacitor.ts      # Native plugin initialisation
│   │   ├── firebase.ts       # Conditional Firebase setup
│   │   ├── storage.ts        # localStorage CRUD + backup/restore
│   │   └── utils.ts
│   ├── pages/                # Route-level components
│   │   ├── SplashScreen.tsx  # Animated brand splash
│   │   ├── Login.tsx         # OAuth + guest authentication
│   │   ├── Onboarding.tsx    # First-run experience
│   │   ├── Home.tsx          # Script list + search + quick-resume
│   │   ├── Editor.tsx        # Script editor with auto-save
│   │   ├── Player.tsx        # Teleprompter with camera overlay
│   │   ├── RecordMode.tsx    # Camera + recording + teleprompter
│   │   └── Settings.tsx      # App preferences + appearance toggle
│   ├── types/
│   │   └── script.ts         # TypeScript interfaces + defaults
│   ├── App.tsx               # Root component + dynamic theme
│   └── main.tsx              # Entry point
├── public/
│   ├── icons/                # SVG app icons (192, 512)
│   ├── manifest.json         # PWA manifest
│   ├── sw.js                 # Service worker (offline cache)
│   ├── privacy.html          # Privacy policy (self-hosted)
│   └── terms.html            # Terms of service (self-hosted)
├── android/                  # Capacitor Android project
├── ios/                      # Capacitor iOS project
├── capacitor.config.ts       # Native platform configuration
├── tailwind.config.ts        # Tailwind + shadcn/ui theme
├── vite.config.ts            # Build configuration
└── package.json
```

---

## Getting Started

### Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| **Node.js** | 18+ | Runtime (or [Bun](https://bun.sh/)) |
| **Xcode** | 15+ | iOS builds (macOS only) |
| **Android Studio** | Narwhal+ | Android builds |
| **Java** | 17+ | Android Gradle toolchain |

### Installation

```bash
# Clone the repository
git clone https://github.com/iclectic/cuevora.git
cd cuevora

# Install dependencies
npm install    # or: bun install

# Copy environment template
cp .env.example .env
```

### Development Server

```bash
npm run dev
# → http://localhost:5173
```

### Production Build

```bash
npm run build
# Output: dist/
```

---

## Firebase Setup (Optional)

Firebase Auth enables Google and Apple Sign-In for cross-device sync. **This is entirely optional** — the app is fully functional in guest mode.

1. Create a project at [Firebase Console](https://console.firebase.google.com)
2. Enable **Authentication** → **Google** and **Apple** sign-in methods
3. Register a **Web app** and copy the config values into `.env`:

```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

For Android native builds, download `google-services.json` from Firebase Console and place it in `android/app/`.

---

## Deployment

### Web (PWA)

The production build outputs a static site to `dist/`. Deploy to any static host:

```bash
npm run build
# Deploy dist/ to Netlify, Vercel, Cloudflare Pages, etc.
```

### iOS

```bash
npm run build:ios
# Opens Xcode → select device → ⌘R to run
```

Requires a valid Apple Developer certificate for device deployment. Free Apple IDs work for personal testing (7-day expiry).

### Android

```bash
npm run build:android
# Opens Android Studio → select device → ▶ Run
```

#### Signed Release Build (Play Store)

```bash
npm run build
npx cap sync android
# In Android Studio: Build → Generate Signed Bundle (AAB)
```

### Legal Pages

Self-hosted privacy policy and terms of service are included at `public/privacy.html` and `public/terms.html`. Configure the URLs in `.env` for store submissions:

```env
VITE_TERMS_URL=https://your-domain.com/terms.html
VITE_PRIVACY_URL=https://your-domain.com/privacy.html
```

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite development server with HMR |
| `npm run build` | Production build with tree-shaking and minification |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint across the codebase |
| `npm run test` | Run Vitest test suite |
| `npm run test:watch` | Run tests in watch mode |
| `npm run build:ios` | Build web → sync → open Xcode |
| `npm run build:android` | Build web → sync → open Android Studio |
| `npm run build:mobile` | Build web → sync iOS and Android |
| `npm run cap:sync` | Sync web assets to native platforms |

---

## Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **UI Framework** | React 18 | Concurrent rendering, hooks-based architecture, vast ecosystem |
| **Language** | TypeScript 5 | Type safety across components, hooks, and storage layer |
| **Build Tool** | Vite 5 | Sub-second HMR, optimised production bundles with Rollup |
| **Styling** | TailwindCSS 3 + shadcn/ui | Utility-first CSS with accessible, composable component primitives |
| **Animation** | Framer Motion | Declarative spring animations for splash, controls, and transitions |
| **Auth** | Firebase Auth | Battle-tested OAuth for Google/Apple with minimal configuration |
| **Native Runtime** | Capacitor 7 | Thin native bridge — WebView for UI, native APIs for platform integration |
| **Testing** | Vitest | Vite-native test runner with Jest-compatible API |
| **Offline** | Service Worker | Precaches static assets for full offline functionality |

---

## Performance

- **Bundle size**: ~217 KB gzipped (total JS)
- **Build time**: < 3 seconds (Vite production build)
- **Scroll rendering**: 60 fps `requestAnimationFrame` loop with delta-time interpolation
- **Camera latency**: Direct `getUserMedia` → `<video srcObject>` pipeline — zero intermediate processing
- **Offline startup**: Service worker serves cached assets; app loads without network

---

## Trademark Notice

The source code is open under the Apache-2.0 license. The **Cuevora** name, logo, and brand assets are proprietary. See `TRADEMARKS.md` for details.

---

## License

```
Copyright 2025 Tubo-Ibim Braide

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```

---

<div align="center">

**Built with precision by [Tubo-Ibim Braide](https://github.com/iclectic)**

</div>
