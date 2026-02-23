/**
 * Extract coordinates from Google Maps URLs and generate SQL UPDATE statements
 * Run with: node scripts/extract_coordinates.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the FillingStations.md file
const filePath = path.join(__dirname, '..', 'FillingStations.md');
const content = fs.readFileSync(filePath, 'utf8');

// Parse the data
const lines = content.trim().split('\n');
const header = lines[0];
const dataLines = lines.slice(1);

// Function to extract coordinates from various Google Maps URL formats
function extractCoordinates(url) {
  if (!url) return null;

  // Try different patterns

  // Pattern 1: @lat,lng in URL
  const atPattern = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
  let match = url.match(atPattern);
  if (match) {
    return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
  }

  // Pattern 2: ll=lat,lng (Apple Maps style)
  const llPattern = /ll=(-?\d+\.\d+),(-?\d+\.\d+)/;
  match = url.match(llPattern);
  if (match) {
    return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
  }

  // Pattern 3: q=lat,lng
  const qPattern = /q=(-?\d+\.\d+),(-?\d+\.\d+)/;
  match = url.match(qPattern);
  if (match) {
    return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
  }

  // Pattern 4: coordinate=lat,lng
  const coordPattern = /coordinate=(-?\d+\.\d+),(-?\d+\.\d+)/;
  match = url.match(coordPattern);
  if (match) {
    return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
  }

  // Pattern 5: Plus codes or place IDs - need geocoding API (skip for now)

  return null;
}

// Function to clean price string
function cleanPrice(priceStr) {
  if (!priceStr) return null;
  const cleaned = priceStr.replace(/[Rr\s]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

// Parse each line
const suppliers = [];
const urlsToGeocode = [];

for (const line of dataLines) {
  if (!line.trim()) continue;

  // Split by tab
  const parts = line.split('\t');
  if (parts.length < 4) continue;

  const name = parts[0]?.trim();
  const locationUrl = parts[1]?.trim();
  const address = parts[2]?.trim();
  const price = parts[3]?.trim();

  if (!name) continue;

  const coords = extractCoordinates(locationUrl);

  // Extract location from address (first part before comma usually)
  const addressParts = address?.split(',') || [];
  const location = addressParts[1]?.trim() || addressParts[0]?.trim() || name;

  // Extract province
  let province = null;
  const provinceKeywords = [
    'Gauteng', 'Limpopo', 'Mpumalanga', 'KwaZulu-Natal', 'Kwa-Zulu Natal', 'KZN',
    'Western Cape', 'Eastern Cape', 'Northern Cape', 'North West', 'Free State'
  ];
  for (const p of provinceKeywords) {
    if (address?.toLowerCase().includes(p.toLowerCase())) {
      province = p.replace('KZN', 'KwaZulu-Natal').replace('Kwa-Zulu Natal', 'KwaZulu-Natal');
      break;
    }
  }

  // Determine country
  let country = 'South Africa';
  if (address?.includes('Botswana')) country = 'Botswana';
  else if (address?.includes('Zimbabwe')) country = 'Zimbabwe';
  else if (address?.includes('Zambia')) country = 'Zambia';
  else if (address?.includes('Mozambique') || address?.includes('MZ')) country = 'Mozambique';
  else if (address?.includes('Namibia')) country = 'Namibia';
  else if (address?.includes('DRC') || address?.includes('Congo')) country = 'DRC';
  else if (address?.includes('Malawi')) country = 'Malawi';
  else if (address?.includes('Rwanda')) country = 'Rwanda';

  suppliers.push({
    name,
    location,
    address,
    province,
    country,
    price: cleanPrice(price),
    google_maps_url: locationUrl,
    latitude: coords?.lat || null,
    longitude: coords?.lng || null,
    hasCoords: !!coords
  });

  if (!coords && locationUrl) {
    urlsToGeocode.push({ name, url: locationUrl });
  }
}

// Generate SQL
console.log('-- Diesel Suppliers Coordinate Update Script');
console.log('-- Generated on:', new Date().toISOString());
console.log('-- Total suppliers:', suppliers.length);
console.log('-- Suppliers with coordinates:', suppliers.filter(s => s.hasCoords).length);
console.log('-- Suppliers needing geocoding:', urlsToGeocode.length);
console.log('');

// First, generate INSERT statements for new suppliers (or UPDATE for existing)
console.log('-- UPSERT suppliers with coordinates');
console.log('');

for (const s of suppliers) {
  if (!s.name || !s.price) continue;

  const escapedName = s.name.replace(/'/g, "''");
  const escapedLocation = (s.location || '').replace(/'/g, "''");
  const escapedAddress = (s.address || '').replace(/'/g, "''");
  const escapedProvince = s.province ? `'${s.province.replace(/'/g, "''")}'` : 'NULL';
  const escapedUrl = s.google_maps_url ? `'${s.google_maps_url.replace(/'/g, "''")}'` : 'NULL';
  const lat = s.latitude !== null ? s.latitude : 'NULL';
  const lng = s.longitude !== null ? s.longitude : 'NULL';

  console.log(`-- ${s.name} ${s.hasCoords ? '✓' : '(needs geocoding)'}`);
  console.log(`INSERT INTO diesel_suppliers (name, location, address, province, country, google_maps_url, latitude, longitude, current_price_per_liter, is_active)
VALUES ('${escapedName}', '${escapedLocation}', '${escapedAddress}', ${escapedProvince}, '${s.country}', ${escapedUrl}, ${lat}, ${lng}, ${s.price}, true)
ON CONFLICT (name) DO UPDATE SET
  location = EXCLUDED.location,
  address = EXCLUDED.address,
  province = EXCLUDED.province,
  country = EXCLUDED.country,
  google_maps_url = EXCLUDED.google_maps_url,
  latitude = COALESCE(EXCLUDED.latitude, diesel_suppliers.latitude),
  longitude = COALESCE(EXCLUDED.longitude, diesel_suppliers.longitude),
  current_price_per_liter = EXCLUDED.current_price_per_liter,
  updated_at = now();
`);
}

// Summary of URLs that need manual geocoding
console.log('');
console.log('-- ============================================');
console.log('-- URLs that need manual geocoding (Google Maps short links):');
console.log('-- ============================================');
for (const u of urlsToGeocode.slice(0, 50)) {
  console.log(`-- ${u.name}: ${u.url}`);
}
if (urlsToGeocode.length > 50) {
  console.log(`-- ... and ${urlsToGeocode.length - 50} more`);
}

// Write to SQL file
const sqlContent = [];
sqlContent.push('-- Diesel Suppliers Data Import');
sqlContent.push('-- Generated on: ' + new Date().toISOString());
sqlContent.push('-- Total suppliers: ' + suppliers.length);
sqlContent.push('');
sqlContent.push('-- First, add a unique constraint on name if not exists');
sqlContent.push('-- ALTER TABLE diesel_suppliers ADD CONSTRAINT diesel_suppliers_name_unique UNIQUE (name);');
sqlContent.push('');

for (const s of suppliers) {
  if (!s.name || !s.price) continue;

  const escapedName = s.name.replace(/'/g, "''");
  const escapedLocation = (s.location || '').replace(/'/g, "''");
  const escapedAddress = (s.address || '').replace(/'/g, "''");
  const escapedProvince = s.province ? `'${s.province.replace(/'/g, "''")}'` : 'NULL';
  const escapedUrl = s.google_maps_url ? `'${s.google_maps_url.replace(/'/g, "''")}'` : 'NULL';
  const lat = s.latitude !== null ? s.latitude : 'NULL';
  const lng = s.longitude !== null ? s.longitude : 'NULL';

  sqlContent.push(`-- ${s.name} ${s.hasCoords ? '✓ has coords' : '⚠ needs geocoding'}`);
  sqlContent.push(`INSERT INTO diesel_suppliers (name, location, address, province, country, google_maps_url, latitude, longitude, current_price_per_liter, is_active)
VALUES ('${escapedName}', '${escapedLocation}', '${escapedAddress}', ${escapedProvince}, '${s.country}', ${escapedUrl}, ${lat}, ${lng}, ${s.price}, true)
ON CONFLICT (name) DO UPDATE SET
  location = EXCLUDED.location,
  address = EXCLUDED.address,
  province = EXCLUDED.province,
  country = EXCLUDED.country,
  google_maps_url = EXCLUDED.google_maps_url,
  latitude = COALESCE(EXCLUDED.latitude, diesel_suppliers.latitude),
  longitude = COALESCE(EXCLUDED.longitude, diesel_suppliers.longitude),
  current_price_per_liter = EXCLUDED.current_price_per_liter,
  updated_at = now();
`);
}

// Write to file
const outputPath = path.join(__dirname, '..', 'supabase', 'migrations', '20251209_import_suppliers.sql');
fs.writeFileSync(outputPath, sqlContent.join('\n'));
console.log('');
console.log('SQL file written to:', outputPath);
