
// scripts/geocode-geofences.ts

/**
 * Enhanced geocoding script with smart address parsing
 * Run with: npx tsx scripts/geocode-geofences.ts [--force] [--limit=10]
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials!');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Parse command line arguments
const forceReGeocode = process.argv.includes('--force');
const dryRun = process.argv.includes('--dry-run');
const limitArg = process.argv.find(arg => arg.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : null;

interface Geofence {
  id: string;
  name: string;
  description: string | null;
  type: string;
  center_lat: number | null;
  center_lng: number | null;
  metadata: any;
}

interface GeocodingResult {
  lat: number;
  lng: number;
  display_name?: string;
}

// -------------- Geocode Address Function --------------
async function geocodeAddress(address: string): Promise<GeocodingResult | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'CarCraftFleetManagement/1.0',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) return null;

    const data: any = await response.json();

    if (data && Array.isArray(data) && data.length > 0) {
      const result = data[0];
      return {
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
        display_name: result.display_name
      };
    }

    return null;
  } catch (error) {
    return null;
  }
}

// -------------- Smart Address Parser --------------
function extractLocationQueries(description: string | null, name: string): string[] {
  const queries: string[] = [];

  if (!description) {
    // Just use cleaned name
    const cleanName = name.replace(/\(?\+?\d[\d\s\-()]+\)?/g, '').replace(/[()]/g, '').trim();
    if (cleanName.length > 3) queries.push(cleanName);
    return queries;
  }

  const desc = description.trim();

  // Strategy 1: Full address
  queries.push(desc);

  // Strategy 2: Extract "City, Province, Country" pattern
  const locationMatch = desc.match(/([A-Za-z\s]+),\s*([A-Za-z\s]+),\s*(Zimbabwe|South Africa|Zambia|Botswana|Namibia)/i);
  if (locationMatch) {
    const [, city, province, country] = locationMatch;
    queries.push(`${city.trim()}, ${country.trim()}`);
    queries.push(`${city.trim()}, ${province.trim()}, ${country.trim()}`);
  }

  // Strategy 3: Extract just "City, Country"
  const simpleCityMatch = desc.match(/([A-Za-z\s]+),\s*(Zimbabwe|South Africa|Zambia|Botswana)/i);
  if (simpleCityMatch) {
    queries.push(`${simpleCityMatch[1].trim()}, ${simpleCityMatch[2].trim()}`);
  }

  // Strategy 4: Extract location from "X km from [Place]"
  const distanceMatch = desc.match(/[\d.]+\s*km\s+from\s+([A-Za-z\s]+)/i);
  if (distanceMatch) {
    const place = distanceMatch[1].trim();
    // Try to find country in original description
    const countryMatch = desc.match(/(Zimbabwe|South Africa|Zambia|Botswana)/i);
    if (countryMatch) {
      queries.push(`${place}, ${countryMatch[1]}`);
    } else {
      queries.push(place);
    }
  }

  // Strategy 5: Extract major cities mentioned
  const cities = ['Harare', 'Bulawayo', 'Mutare', 'Gweru', 'Masvingo', 'Beitbridge', 'Chipinge', 'Chiredzi',
                  'Johannesburg', 'Pretoria', 'Cape Town', 'Durban', 'Polokwane', 'Musina', 'Centurion',
                  'Kempton Park', 'Germiston', 'Stellenbosch', 'Lusaka'];

  for (const city of cities) {
    if (desc.toLowerCase().includes(city.toLowerCase())) {
      const countryMatch = desc.match(/(Zimbabwe|South Africa|Zambia)/i);
      if (countryMatch) {
        queries.push(`${city}, ${countryMatch[1]}`);
      }
    }
  }

  // Strategy 6: Just the country as last resort
  const countryOnly = desc.match(/(Zimbabwe|South Africa|Zambia|Botswana)/i);
  if (countryOnly) {
    queries.push(countryOnly[1]);
  }

  // Remove duplicates while preserving order
  return [...new Set(queries)];
}

// -------------- Validate coordinates --------------
function isValidCoordinate(lat: number, lng: number): boolean {
  return (
    !isNaN(lat) && !isNaN(lng) &&
    lat >= -90 && lat <= 90 &&
    lng >= -180 && lng <= 180
  );
}

// -------------- Geocode with Fallbacks --------------
async function geocodeWithFallbacks(geofence: Geofence): Promise<GeocodingResult | null> {
  const queries = extractLocationQueries(geofence.description, geofence.name);

  for (let i = 0; i < Math.min(queries.length, 3); i++) { // Limit to 3 attempts
    const query = queries[i];

    if (i === 0) {
      console.log(`   Query: "${query}"`);
    } else {
      console.log(`   Fallback ${i}: "${query}"`);
    }

    const result = await geocodeAddress(query);

    if (result && isValidCoordinate(result.lat, result.lng)) {
      return result;
    }

    // Wait between attempts (rate limiting)
    if (i < queries.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1100));
    }
  }

  return null;
}

// -------------- Main Function --------------
async function geocodeGeofences() {
  console.log('🔍 Fetching geofences from database...');

  let query = supabase
    .from('geofences')
    .select('id, name, description, type, center_lat, center_lng, metadata')
    .order('name');

  if (forceReGeocode) {
    console.log('⚠️  FORCE MODE: Re-geocoding ALL geofences');
  } else {
    query = query.or('center_lat.is.null,center_lng.is.null');
  }

  if (limit) {
    query = query.limit(limit);
    console.log(`📊 Limiting to ${limit} geofences`);
  }

  const { data: geofences, error } = await query;

  if (error) {
    console.error('❌ Failed to fetch geofences:', error);
    return;
  }

  console.log(`📍 Found ${geofences?.length || 0} geofences to geocode\n`);

  if (!geofences || geofences.length === 0) {
    console.log('✅ No geofences need geocoding!');
    return;
  }

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < geofences.length; i++) {
    const geofence = geofences[i] as Geofence;
    const progress = `[${i + 1}/${geofences.length}]`;

    console.log(`${progress} 🔎 ${geofence.name}`);
    console.log(`   Type: ${geofence.type}`);

    const result = await geocodeWithFallbacks(geofence);

    if (result && isValidCoordinate(result.lat, result.lng)) {
      console.log(`   ✅ Found: ${result.lat.toFixed(6)}, ${result.lng.toFixed(6)}`);

      if (!dryRun) {
        const { error: updateError } = await supabase
          .from('geofences')
          .update({
            center_lat: result.lat,
            center_lng: result.lng
          })
          .eq('id', geofence.id);

        if (updateError) {
          console.error(`   ❌ Database update failed: ${updateError.message}\n`);
          failCount++;
        } else {
          console.log(`   💾 Updated in database\n`);
          successCount++;
        }
      } else {
        console.log(`   💾 Would update in database\n`);
        successCount++;
      }
    } else {
      console.log(`   ❌ No valid coordinates found\n`);
      failCount++;
    }

    // Rate limiting: 1 request per second
    if (i < geofences.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1100));
    }
  }

  console.log('='.repeat(60));
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`📊 Success rate: ${((successCount / (successCount + failCount)) * 100).toFixed(1)}%`);
  console.log('='.repeat(60));

  if (dryRun) {
    console.log('\n💡 This was a dry run. Run without --dry-run to save changes.');
  } else if (successCount > 0) {
    console.log('\n✨ Geocoding complete! Check results:');
    console.log('   npx tsx scripts/check-geofences.ts');
  }

  if (failCount > 0) {
    console.log('\n⚠️  Some failed. Run manual geocode for remaining:');
    console.log('   npx tsx scripts/manual-geocode.ts');
  }
}

geocodeGeofences().catch(console.error);
