# OpenPrompt — Free Teleprompter

A full-featured, free teleprompter app for iOS, Android, and the web. Built with React, Vite, TailwindCSS, and Capacitor.

## Features

### Teleprompter
- **Smooth auto-scroll** with adjustable speed (1–10x) and speed presets (Slow/Medium/Fast/Turbo)
- **Mirror mode** for reflective glass setups
- **Focus line** indicator to track your reading position
- **Countdown timer** (3s, 5s, 10s) before playback starts
- **4 themes**: Dark, Light, Studio, High Contrast
- **Font size** (16–72px) and **line spacing** (1.0–3.0) controls
- **Scroll progress bar** with percentage and time remaining
- **Auto-hide controls** during playback (tap to show)

### Pro Controls
- **Voice control**: Say "play", "pause", "faster", "slower", "reset" to control hands-free
- **Gesture controls**: Swipe up/down to adjust speed, pinch to zoom font, tap zones (left=rewind, right=forward, center=toggle controls), double-tap to play/pause
- **Keyboard shortcuts**: Space (play/pause), arrows (speed/seek), M (mirror), F (focus), R (reset), Esc (back)

### Script Management
- Create, edit, and organize scripts with tags
- Auto-save with version history (up to 10 revisions per script)
- Import/export scripts as `.txt` files
- Full backup & restore as JSON
- Word count, character count, and estimated read time

### Camera/Record Mode
- Live camera preview with teleprompter overlay
- Front/back camera switching
- Split view or overlay mode

### Auth & Account
- **Google Sign-In** and **Apple Sign-In** via Firebase
- **Guest mode** — no account required, all data stored locally
- Sign out from Settings

### Mobile (iOS & Android)
- **Capacitor.js** wrapper for native app builds
- Native splash screen
- Status bar integration
- Keyboard handling
- PWA installable on any device

---

## Getting Started

### Prerequisites
- [Bun](https://bun.sh/) (or Node.js 18+)
- For iOS builds: macOS + Xcode 15+
- For Android builds: Android Studio + Java 17+

### Install
```bash
bun install
```

### Development
```bash
bun run dev
# Opens at http://localhost:8080
```

### Build
```bash
bun run build
```

---

## Firebase Setup (Auth)

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project (or use existing)
3. Enable **Authentication** → Sign-in methods → **Google** and **Apple**
4. Go to Project Settings → General → Your apps → Add a **Web app**
5. Copy the config values into `.env`:

```bash
cp .env.example .env
```

Then fill in your values:
```
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

> **Note:** Auth is optional. Users can always use Guest mode without Firebase configured.

---

## Legal Links (Recommended for Store Release)

Terms of Service and Privacy Policy URLs to enable in-app links:
```
VITE_TERMS_URL=https://example.com/terms
VITE_PRIVACY_URL=https://example.com/privacy
```

---

## Mobile Builds (Capacitor)

### iOS
```bash
bun run build:ios
# Opens Xcode — select a simulator or device and run
```

### Android
```bash
bun run build:android
# Opens Android Studio — select a device and run
```

### Sync after code changes
```bash
bun run build:mobile
```

---

## Project Structure

```
src/
├── components/       # UI components (shadcn/ui + custom)
│   └── ProtectedRoute.tsx
├── hooks/            # Custom React hooks
│   ├── use-voice-control.ts    # Web Speech API voice commands
│   ├── use-gesture-controls.ts # Touch gesture detection
│   ├── use-mobile.tsx
│   └── use-toast.ts
├── lib/              # Utilities & services
│   ├── auth-context.tsx  # Firebase auth provider
│   ├── capacitor.ts      # Native plugin init
│   ├── firebase.ts       # Firebase config
│   └── storage.ts        # localStorage CRUD
├── pages/            # Route pages
│   ├── SplashScreen.tsx
│   ├── Login.tsx
│   ├── Onboarding.tsx
│   ├── Home.tsx
│   ├── Editor.tsx
│   ├── Player.tsx        # Main teleprompter
│   ├── RecordMode.tsx    # Camera + teleprompter
│   └── Settings.tsx
├── types/
│   └── script.ts     # TypeScript interfaces
├── App.tsx
└── main.tsx
```

---

## Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start dev server |
| `bun run build` | Production build |
| `bun run test` | Run tests |
| `bun run test:watch` | Run tests in watch mode |
| `bun run build:ios` | Build + open in Xcode |
| `bun run build:android` | Build + open in Android Studio |
| `bun run build:mobile` | Build + sync both platforms |

---

## Tech Stack

- **React 18** + **TypeScript**
- **Vite** (build tool)
- **TailwindCSS** + **shadcn/ui** (styling)
- **Framer Motion** (animations)
- **Firebase Auth** (Google/Apple sign-in)
- **Capacitor.js** (iOS/Android native wrapper)
- **Vitest** (testing)

---

## License

Free and open source. Built for creators, speakers, and professionals.
