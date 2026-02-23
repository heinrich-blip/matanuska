/**
 * PWA Icon Generator Script
 * Generates PNG icons from SVG for PWA manifest
 *
 * Usage: node scripts/generate-pwa-icons.js
 *
 * Requirements: npm install sharp
 */

import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PUBLIC_DIR = join(__dirname, '../public');
const SVG_SOURCE = join(PUBLIC_DIR, 'app-icon.svg');

// Icon sizes to generate
const ICON_SIZES = [
  { size: 16, name: 'favicon-16.png' },
  { size: 32, name: 'favicon-32.png' },
  { size: 48, name: 'icon-48.png' },
  { size: 72, name: 'icon-72.png' },
  { size: 96, name: 'icon-96.png' },
  { size: 128, name: 'icon-128.png' },
  { size: 144, name: 'icon-144.png' },
  { size: 152, name: 'icon-152.png' },
  { size: 180, name: 'apple-touch-icon.png' }, // Apple touch icon
  { size: 192, name: 'icon-192.png' },
  { size: 256, name: 'icon-256.png' },
  { size: 384, name: 'icon-384.png' },
  { size: 512, name: 'icon-512.png' },
];

// Maskable icon sizes (with extra padding for safe area)
const MASKABLE_SIZES = [
  { size: 192, name: 'icon-192-maskable.png' },
  { size: 512, name: 'icon-512-maskable.png' },
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

async function generateMaskableIcon(svgBuffer, size, outputPath) {
  // Maskable icons need 10% padding on each side for the safe zone
  const iconSize = Math.floor(size * 0.8);
  const padding = Math.floor((size - iconSize) / 2);

  try {
    const resizedIcon = await sharp(svgBuffer)
      .resize(iconSize, iconSize, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .toBuffer();

    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 30, g: 64, b: 175, alpha: 1 } // #1e40af
      }
    })
      .composite([{
        input: resizedIcon,
        top: padding,
        left: padding
      }])
      .png()
      .toFile(outputPath);

    console.log(`✓ Generated maskable: ${outputPath} (${size}x${size})`);
  } catch (error) {
    console.error(`✗ Failed to generate maskable ${outputPath}:`, error.message);
  }
}

async function main() {
  console.log('🎨 PWA Icon Generator\n');

  if (!existsSync(SVG_SOURCE)) {
    console.error(`Error: SVG source file not found at ${SVG_SOURCE}`);
    process.exit(1);
  }

  const svgBuffer = readFileSync(SVG_SOURCE);
  console.log(`📁 Source: ${SVG_SOURCE}\n`);

  // Generate standard icons
  console.log('Generating standard icons...');
  for (const { size, name } of ICON_SIZES) {
    const outputPath = join(PUBLIC_DIR, name);
    await generateIcon(svgBuffer, size, outputPath);
  }

  // Generate maskable icons
  console.log('\nGenerating maskable icons...');
  for (const { size, name } of MASKABLE_SIZES) {
    const outputPath = join(PUBLIC_DIR, name);
    await generateMaskableIcon(svgBuffer, size, outputPath);
  }

  console.log('\n✅ Icon generation complete!');
  console.log('\nGenerated files:');
  [...ICON_SIZES, ...MASKABLE_SIZES].forEach(({ name }) => {
    console.log(`  - public/${name}`);
  });
}

main().catch(console.error);
