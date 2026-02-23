/**
 * Mobile App PWA Icon Generator Script
 * Generates PNG icons from SVG for the NextJS mobile app
 *
 * Usage: node scripts/generate-mobile-icons.js
 */

import { existsSync, mkdirSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ICONS_DIR = join(__dirname, '../mobile-app-nextjs/public/icons');
const SVG_SOURCE = join(ICONS_DIR, 'app-icon.svg');

// Icon sizes required by the mobile app manifest
const ICON_SIZES = [
  { size: 72, name: 'icon-72x72.png' },
  { size: 96, name: 'icon-96x96.png' },
  { size: 128, name: 'icon-128x128.png' },
  { size: 144, name: 'icon-144x144.png' },
  { size: 152, name: 'icon-152x152.png' },
  { size: 192, name: 'icon-192x192.png' },
  { size: 384, name: 'icon-384x384.png' },
  { size: 512, name: 'icon-512x512.png' },
];

async function generateIcon(svgBuffer, size, outputPath) {
  try {
    await sharp(svgBuffer)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(outputPath);
    console.log(`✓ Generated: ${outputPath} (${size}x${size})`);
  } catch (error) {
    console.error(`✗ Failed to generate ${outputPath}:`, error.message);
  }
}

async function main() {
  console.log('🎨 Mobile App PWA Icon Generator\n');

  if (!existsSync(SVG_SOURCE)) {
    console.error(`Error: SVG source file not found at ${SVG_SOURCE}`);
    console.error('Make sure to copy app-icon.svg from the main public folder');
    process.exit(1);
  }

  // Ensure icons directory exists
  if (!existsSync(ICONS_DIR)) {
    mkdirSync(ICONS_DIR, { recursive: true });
  }

  const svgBuffer = readFileSync(SVG_SOURCE);
  console.log(`📁 Source: ${SVG_SOURCE}\n`);

  // Generate icons
  console.log('Generating mobile app icons...');
  for (const { size, name } of ICON_SIZES) {
    const outputPath = join(ICONS_DIR, name);
    await generateIcon(svgBuffer, size, outputPath);
  }

  console.log('\n✅ Mobile app icon generation complete!');
}

main().catch(console.error);
