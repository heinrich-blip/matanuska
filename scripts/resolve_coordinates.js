/**
 * Resolve coordinates from Google Maps short URLs and generate SQL UPDATE statements
 * Run with: node scripts/resolve_coordinates.js
 *
 * This script will:
 * 1. Parse FillingStations.md
 * 2. Extract coordinates from Apple Maps URLs (contain raw coords)
 * 3. Resolve Google Maps short URLs via HTTP redirect
 * 4. Generate SQL UPDATE statements for each supplier
 */

import fs from 'fs';
import http from 'http';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Rate limiting - be nice to Google
const DELAY_MS = 500;
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Extract coordinates from various URL formats
function extractCoordinatesFromUrl(url) {
  if (!url) return null;

  // Pattern 1: @lat,lng in URL (Google Maps full URL)
  let match = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (match) {
    return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
  }

  // Pattern 2: ll=lat,lng (Apple Maps)
  match = url.match(/ll=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (match) {
    return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
  }

  // Pattern 3: q=lat,lng (Google Maps query)
  match = url.match(/\?q=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (match) {
    return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
  }

  // Pattern 4: coordinate=lat,lng (Apple Maps)
  match = url.match(/coordinate=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (match) {
    return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
  }

  // Pattern 5: 3d{lat}!4d{lng} (Google Maps embed)
  match = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (match) {
    return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
  }

  // Pattern 6: data=...!3d{lat}!4d{lng}
  match = url.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  if (match) {
    return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
  }

  return null;
}

// Resolve a short URL to get the full URL (follow redirects)
function resolveShortUrl(shortUrl) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(shortUrl);
    const client = urlObj.protocol === 'https:' ? https : http;

    const options = {
      method: 'HEAD',
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CoordinateResolver/1.0)'
      },
      timeout: 10000
    };

    const req = client.request(options, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        // Follow redirect
        const newUrl = res.headers.location;
        // Check if the redirect URL has coordinates
        const coords = extractCoordinatesFromUrl(newUrl);
        if (coords) {
          resolve({ url: newUrl, coords });
        } else if (newUrl.startsWith('http')) {
          // Try following another level of redirect
          resolveShortUrl(newUrl).then(resolve).catch(reject);
        } else {
          resolve({ url: newUrl, coords: null });
        }
      } else {
        resolve({ url: shortUrl, coords: null });
      }
    });

    req.on('error', (err) => {
      console.error(`Error resolving ${shortUrl}: ${err.message}`);
      resolve({ url: shortUrl, coords: null, error: err.message });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ url: shortUrl, coords: null, error: 'timeout' });
    });

    req.end();
  });
}

// Parse a line from FillingStations.md
function parseSupplierLine(line) {
  // Format: Name Location URL Address Price
  // The challenge is that fields are space-separated but contain spaces

  // Find the URL (starts with http)
  const urlMatch = line.match(/(https?:\/\/[^\s]+)/);
  if (!urlMatch) return null;

  const url = urlMatch[1];
  const urlIndex = line.indexOf(url);

  // Everything before the URL is name + location
  const beforeUrl = line.substring(0, urlIndex).trim();

  // Everything after URL is address + price
  const afterUrl = line.substring(urlIndex + url.length).trim();

  // Extract price (starts with R followed by number)
  const priceMatch = afterUrl.match(/R(\d+\.?\d*)\s*$/);
  const price = priceMatch ? parseFloat(priceMatch[1]) : null;

  // Address is everything between URL and price
  const address = priceMatch
    ? afterUrl.substring(0, afterUrl.lastIndexOf('R')).trim()
    : afterUrl.trim();

  // Name is the first part before the location hint
  // Location is usually a city/town name at the end of the first part
  const name = beforeUrl;

  return {
    name,
    url,
    address,
    price
  };
}

// Extract location/city from address
function extractLocation(address) {
  if (!address) return null;

  // Common pattern: Street, Suburb, City, Province, Country, PostCode
  const parts = address.split(',').map(p => p.trim());

  // Usually city is the 3rd or 4th element
  if (parts.length >= 4) {
    // Filter out common non-city words
    const nonCityWords = ['South Africa', 'Zimbabwe', 'Botswana', 'Mozambique', 'Zambia', 'DRC', 'Namibia', 'Malawi', 'Rwanda'];
    for (let i = 2; i < Math.min(parts.length - 1, 5); i++) {
      const part = parts[i];
      if (!nonCityWords.some(w => part.toLowerCase().includes(w.toLowerCase())) &&
          !part.match(/^\d+$/) &&
          part.length > 2) {
        return part;
      }
    }
  }

  return parts.length > 2 ? parts[2] : null;
}

// Main function
async function main() {
  const filePath = path.join(__dirname, '..', 'FillingStations.md');

  if (!fs.existsSync(filePath)) {
    console.error('FillingStations.md not found!');
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.trim().split('\n');

  // Skip header line
  const dataLines = lines.slice(1).filter(line => line.trim());

  console.log(`Found ${dataLines.length} suppliers to process`);

  const results = [];
  let resolved = 0;
  let directExtract = 0;
  let failed = 0;

  for (let i = 0; i < dataLines.length; i++) {
    const line = dataLines[i];
    const supplier = parseSupplierLine(line);

    if (!supplier) {
      console.log(`Could not parse line ${i + 1}: ${line.substring(0, 50)}...`);
      continue;
    }

    console.log(`[${i + 1}/${dataLines.length}] Processing: ${supplier.name.substring(0, 40)}...`);

    // First try to extract coordinates directly from the URL
    let coords = extractCoordinatesFromUrl(supplier.url);

    if (coords) {
      directExtract++;
      console.log(`  ✓ Direct extract: ${coords.lat}, ${coords.lng}`);
    } else {
      // Need to resolve the short URL
      await sleep(DELAY_MS);
      const result = await resolveShortUrl(supplier.url);

      if (result.coords) {
        coords = result.coords;
        resolved++;
        console.log(`  ✓ Resolved: ${coords.lat}, ${coords.lng}`);
      } else {
        failed++;
        console.log(`  ✗ Could not resolve coordinates`);
      }
    }

    results.push({
      ...supplier,
      location: extractLocation(supplier.address),
      latitude: coords?.lat || null,
      longitude: coords?.lng || null
    });
  }

  console.log('\n========================================');
  console.log(`Total: ${results.length}`);
  console.log(`Direct extract: ${directExtract}`);
  console.log(`Resolved: ${resolved}`);
  console.log(`Failed: ${failed}`);
  console.log('========================================\n');

  // Generate SQL
  const sqlLines = [
    '-- Diesel Suppliers Coordinate Update',
    `-- Generated: ${new Date().toISOString()}`,
    `-- Total suppliers: ${results.length}`,
    `-- With coordinates: ${results.filter(r => r.latitude).length}`,
    `-- Without coordinates: ${results.filter(r => !r.latitude).length}`,
    '',
    '-- NOTE: This updates existing suppliers by matching on name',
    '-- Run this in Supabase SQL Editor',
    ''
  ];

  // Generate UPDATE statements for suppliers with coordinates
  const withCoords = results.filter(r => r.latitude && r.longitude);
  for (const s of withCoords) {
    const escapedName = s.name.replace(/'/g, "''");
    sqlLines.push(
      `UPDATE diesel_suppliers SET latitude = ${s.latitude}, longitude = ${s.longitude}`,
      `  WHERE LOWER(name) = LOWER('${escapedName}') AND latitude IS NULL;`
    );
    sqlLines.push('');
  }

  // List suppliers that need manual geocoding
  const needsManual = results.filter(r => !r.latitude);
  if (needsManual.length > 0) {
    sqlLines.push('');
    sqlLines.push('-- ============================================');
    sqlLines.push('-- SUPPLIERS NEEDING MANUAL GEOCODING:');
    sqlLines.push('-- ============================================');
    for (const s of needsManual) {
      sqlLines.push(`-- ${s.name}`);
      sqlLines.push(`--   URL: ${s.url}`);
      sqlLines.push(`--   Address: ${s.address}`);
      sqlLines.push('');
    }
  }

  // Write output
  const outputPath = path.join(__dirname, '..', 'supabase', 'migrations', '20251209_resolved_coordinates.sql');
  fs.writeFileSync(outputPath, sqlLines.join('\n'));
  console.log(`SQL written to: ${outputPath}`);

  // Also write a JSON file for reference
  const jsonPath = path.join(__dirname, 'resolved_suppliers.json');
  fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));
  console.log(`JSON written to: ${jsonPath}`);
}

main().catch(console.error);
