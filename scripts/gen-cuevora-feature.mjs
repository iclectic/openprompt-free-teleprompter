import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const svg = `<svg width="1024" height="500" viewBox="0 0 1024 500" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f0a2e"/>
      <stop offset="50%" stop-color="#1e1b4b"/>
      <stop offset="100%" stop-color="#312e81"/>
    </linearGradient>
    <linearGradient id="glow" x1="0.5" y1="0" x2="0.5" y2="1">
      <stop offset="0%" stop-color="#7c3aed" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#7c3aed" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="cGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#a78bfa"/>
      <stop offset="100%" stop-color="#7c3aed"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#d97706"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1024" height="500" fill="url(#bg)"/>

  <!-- Subtle glow behind icon -->
  <ellipse cx="280" cy="250" rx="170" ry="170" fill="url(#glow)"/>

  <!-- Stylized C shape -->
  <path d="M340 120 C230 120, 150 180, 150 250 C150 320, 230 380, 340 380"
        stroke="url(#cGrad)" stroke-width="42" fill="none" stroke-linecap="round"/>

  <!-- Scroll lines inside C -->
  <rect x="230" y="218" width="120" height="10" rx="5" fill="url(#accent)" opacity="0.9"/>
  <rect x="230" y="246" width="95" height="10" rx="5" fill="url(#accent)" opacity="0.65"/>
  <rect x="230" y="274" width="70" height="10" rx="5" fill="url(#accent)" opacity="0.4"/>

  <!-- Play triangle -->
  <path d="M380 225 L410 250 L380 275 Z" fill="#f59e0b" opacity="0.85"/>

  <!-- App name -->
  <text x="500" y="220" font-family="Arial, Helvetica, sans-serif" font-size="72" font-weight="bold" fill="white" letter-spacing="-1">Cuevora</text>

  <!-- Tagline -->
  <text x="500" y="275" font-family="Arial, Helvetica, sans-serif" font-size="28" fill="#a78bfa" font-weight="600">Free Teleprompter</text>

  <!-- Feature bullets -->
  <text x="500" y="330" font-family="Arial, Helvetica, sans-serif" font-size="20" fill="white" opacity="0.6">Video Recording  ·  Mirror Mode  ·  Voice Control</text>
  <text x="500" y="365" font-family="Arial, Helvetica, sans-serif" font-size="20" fill="white" opacity="0.6">Multiple Themes  ·  Adjustable Speed  ·  Offline</text>

  <!-- Decorative dots -->
  <circle cx="950" cy="80" r="40" fill="#7c3aed" opacity="0.08"/>
  <circle cx="980" cy="420" r="60" fill="#7c3aed" opacity="0.06"/>
  <circle cx="80" cy="60" r="30" fill="#a78bfa" opacity="0.06"/>
</svg>`;

const outPath = path.join(projectRoot, 'feature-graphic-1024x500.png');

sharp(Buffer.from(svg))
  .resize(1024, 500)
  .png()
  .toFile(outPath)
  .then(() => console.log('Feature graphic generated:', outPath))
  .catch(err => console.error(err));
