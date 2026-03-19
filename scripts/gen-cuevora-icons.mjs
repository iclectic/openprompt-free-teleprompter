import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const resDir = path.join(projectRoot, 'android/app/src/main/res');

// Cuevora icon SVG — stylized "C" with a scroll/prompter motif
// Deep indigo/violet palette with warm amber accent
const iconSvg = (size) => `<svg width="${size}" height="${size}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1e1b4b"/>
      <stop offset="100%" stop-color="#312e81"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#d97706"/>
    </linearGradient>
    <linearGradient id="cGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#a78bfa"/>
      <stop offset="100%" stop-color="#7c3aed"/>
    </linearGradient>
  </defs>
  <!-- Background -->
  <rect width="512" height="512" rx="108" fill="url(#bg)"/>
  <!-- Stylized C shape -->
  <path d="M310 130 C200 130, 120 200, 120 256 C120 312, 200 382, 310 382" 
        stroke="url(#cGrad)" stroke-width="48" fill="none" stroke-linecap="round"/>
  <!-- Scroll/prompt lines inside the C -->
  <rect x="200" y="220" width="140" height="12" rx="6" fill="url(#accent)" opacity="0.9"/>
  <rect x="200" y="250" width="110" height="12" rx="6" fill="url(#accent)" opacity="0.65"/>
  <rect x="200" y="280" width="80" height="12" rx="6" fill="url(#accent)" opacity="0.4"/>
  <!-- Small play triangle accent -->
  <path d="M360 230 L395 256 L360 282 Z" fill="#f59e0b" opacity="0.85"/>
</svg>`;

// Foreground SVG for adaptive icons (no background, needs 108dp safe zone padding)
const foregroundSvg = (size) => `<svg width="${size}" height="${size}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="accent" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#d97706"/>
    </linearGradient>
    <linearGradient id="cGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#a78bfa"/>
      <stop offset="100%" stop-color="#7c3aed"/>
    </linearGradient>
  </defs>
  <!-- Stylized C shape -->
  <path d="M310 130 C200 130, 120 200, 120 256 C120 312, 200 382, 310 382" 
        stroke="url(#cGrad)" stroke-width="48" fill="none" stroke-linecap="round"/>
  <!-- Scroll/prompt lines -->
  <rect x="200" y="220" width="140" height="12" rx="6" fill="url(#accent)" opacity="0.9"/>
  <rect x="200" y="250" width="110" height="12" rx="6" fill="url(#accent)" opacity="0.65"/>
  <rect x="200" y="280" width="80" height="12" rx="6" fill="url(#accent)" opacity="0.4"/>
  <!-- Play triangle -->
  <path d="M360 230 L395 256 L360 282 Z" fill="#f59e0b" opacity="0.85"/>
</svg>`;

// Android mipmap sizes
const mipmapSizes = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
};

async function generate() {
  // 1. Play Store icon (512x512)
  const playStoreOut = path.join(projectRoot, 'playstore-icon-512.png');
  await sharp(Buffer.from(iconSvg(512))).resize(512, 512).png().toFile(playStoreOut);
  console.log('Generated:', playStoreOut);

  // 2. Android mipmap icons at all densities
  for (const [folder, size] of Object.entries(mipmapSizes)) {
    const dir = path.join(resDir, folder);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    // ic_launcher.png
    await sharp(Buffer.from(iconSvg(512))).resize(size, size).png().toFile(path.join(dir, 'ic_launcher.png'));
    console.log(`Generated: ${folder}/ic_launcher.png (${size}x${size})`);

    // ic_launcher_round.png (same image)
    await sharp(Buffer.from(iconSvg(512))).resize(size, size).png().toFile(path.join(dir, 'ic_launcher_round.png'));
    console.log(`Generated: ${folder}/ic_launcher_round.png (${size}x${size})`);

    // ic_launcher_foreground.png (for adaptive icons)
    await sharp(Buffer.from(foregroundSvg(512))).resize(size, size).png().toFile(path.join(dir, 'ic_launcher_foreground.png'));
    console.log(`Generated: ${folder}/ic_launcher_foreground.png (${size}x${size})`);
  }

  // 3. PWA icons
  const publicDir = path.join(projectRoot, 'public');
  for (const size of [192, 512]) {
    await sharp(Buffer.from(iconSvg(512))).resize(size, size).png().toFile(path.join(publicDir, `icon-${size}.png`));
    console.log(`Generated: public/icon-${size}.png`);
  }

  console.log('\nAll Cuevora icons generated!');
}

generate().catch(console.error);
