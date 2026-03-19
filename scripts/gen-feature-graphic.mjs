import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const svg = `<svg width="1024" height="500" viewBox="0 0 1024 500" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="50%" stop-color="#1a1a2e"/>
      <stop offset="100%" stop-color="#16213e"/>
    </linearGradient>
    <linearGradient id="glow" x1="0.5" y1="0" x2="0.5" y2="1">
      <stop offset="0%" stop-color="#10b981" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#10b981" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1024" height="500" fill="url(#bg)"/>

  <!-- Subtle glow behind icon -->
  <ellipse cx="300" cy="250" rx="180" ry="180" fill="url(#glow)"/>

  <!-- Play triangle (larger, centered left) -->
  <path d="M230 150 L400 250 L230 350 Z" fill="#10b981" opacity="0.95"/>

  <!-- Scroll lines under triangle -->
  <rect x="220" y="370" width="160" height="8" rx="4" fill="white" opacity="0.4"/>
  <rect x="240" y="390" width="120" height="8" rx="4" fill="white" opacity="0.25"/>
  <rect x="260" y="410" width="80" height="8" rx="4" fill="white" opacity="0.15"/>

  <!-- App name text -->
  <text x="520" y="220" font-family="Arial, Helvetica, sans-serif" font-size="72" font-weight="bold" fill="white" letter-spacing="-1">Cuevora</text>

  <!-- Tagline -->
  <text x="520" y="275" font-family="Arial, Helvetica, sans-serif" font-size="28" fill="#10b981" font-weight="600">Free Teleprompter</text>

  <!-- Feature bullets -->
  <text x="520" y="330" font-family="Arial, Helvetica, sans-serif" font-size="20" fill="white" opacity="0.6">Video Recording  •  Mirror Mode  •  Voice Control</text>
  <text x="520" y="365" font-family="Arial, Helvetica, sans-serif" font-size="20" fill="white" opacity="0.6">Multiple Themes  •  Adjustable Speed  •  Offline</text>

  <!-- Decorative dots -->
  <circle cx="950" cy="80" r="40" fill="#10b981" opacity="0.08"/>
  <circle cx="980" cy="420" r="60" fill="#10b981" opacity="0.06"/>
  <circle cx="80" cy="60" r="30" fill="#10b981" opacity="0.06"/>
</svg>`;

const outPath = path.join(projectRoot, 'feature-graphic-1024x500.png');

sharp(Buffer.from(svg))
  .resize(1024, 500)
  .png()
  .toFile(outPath)
  .then(() => console.log('Feature graphic generated:', outPath))
  .catch(err => console.error(err));
