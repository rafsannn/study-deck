const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Exact optical and geometric center of the cards & artwork is (136, 135)
// Total artwork bounds: X ~ [5, 267] (width ~262), Y ~ [12, 258] (height ~246)
// Using a balanced square viewBox [-6, -7, 284, 284] centers the artwork with equal margins on all sides.
const svgContent = `<svg width="512" height="512" viewBox="-6 -7 284 284" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="backCardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#312e81" />
      <stop offset="100%" stop-color="#1e1b4b" />
    </linearGradient>
    <linearGradient id="midCardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#6366f1" />
      <stop offset="100%" stop-color="#4338ca" />
    </linearGradient>
    <linearGradient id="frontCardBorder" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#34d399" />
      <stop offset="50%" stop-color="#10b981" />
      <stop offset="100%" stop-color="#059669" />
    </linearGradient>
    <linearGradient id="rGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#34d399" />
      <stop offset="100%" stop-color="#10b981" />
    </linearGradient>
  </defs>

  <!-- 1st Card (Back - Dark Purple) -->
  <rect
    x="32"
    y="28"
    width="160"
    height="225"
    rx="32"
    fill="url(#backCardGrad)"
    transform="rotate(-13 112 140)"
  />

  <!-- 2nd Card (Middle - Indigo Blue) -->
  <rect
    x="58"
    y="22"
    width="160"
    height="225"
    rx="32"
    fill="url(#midCardGrad)"
    transform="rotate(-6 138 135)"
  />

  <!-- 3rd Card (Front - Dark Card with Neon Green Border) -->
  <rect
    x="92"
    y="22"
    width="170"
    height="230"
    rx="36"
    fill="#09090b"
    stroke="url(#frontCardBorder)"
    stroke-width="10"
  />

  <!-- Stylized 'R' Logo with Play Cutout -->
  <g transform="translate(102, 42)">
    <!-- Main 'R' Shape -->
    <path
      d="M 20 12 H 76 C 108 12, 122 30, 122 55 C 122 80, 106 98, 74 98 H 48 V 108 L 112 174 H 78 L 20 112 Z"
      fill="url(#rGrad)"
    />

    <!-- Play Icon Triangle Cutout in top loop of 'R' -->
    <polygon points="50,34 50,74 84,54" fill="#09090b" />

    <!-- Code symbol </ > -->
    <g transform="translate(24, 126)" stroke="#818cf8" stroke-width="7.5" stroke-linecap="round" stroke-linejoin="round" fill="none">
      <path d="M 20 14 L 6 25 L 20 36" />
      <path d="M 36 10 L 26 40" />
      <path d="M 42 14 L 56 25 L 42 36" />
    </g>
  </g>
</svg>`;

async function generate() {
  const publicDir = path.join(__dirname, '..', 'public');
  
  // 1. Write public/logo.svg
  fs.writeFileSync(path.join(publicDir, 'logo.svg'), svgContent.trim());
  console.log('Wrote public/logo.svg');

  const svgBuffer = Buffer.from(svgContent);

  // 2. Generate 512x512 PNG
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'icon-512.png'));
  console.log('Wrote public/icon-512.png');

  // 3. Generate 192x192 PNG
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'icon-192.png'));
  console.log('Wrote public/icon-192.png');

  // 4. Generate 180x180 Apple Touch Icon
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('Wrote public/apple-touch-icon.png');

  // 5. Generate 32x32 Favicon PNG
  await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toFile(path.join(publicDir, 'favicon.png'));
  console.log('Wrote public/favicon.png');

  console.log('All icons generated successfully!');
}

generate().catch(err => {
  console.error(err);
  process.exit(1);
});
