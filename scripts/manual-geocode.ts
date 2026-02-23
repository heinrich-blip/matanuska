
// scripts/check-geofences.ts

/**
 * Diagnostic script to check geofences status
 * Run with: npx tsx scripts/check-geofences.ts
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    `Missing Supabase credentials! Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.`
  );
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkGeofences() {
  console.log('🔍 Fetching all geofences...\n');

  const { data: geofences, error } = await supabase
    .from('geofences')
    .select('id, name, description, center_lat, center_lng')
    .order('name');

  if (error) {
    console.error('❌ Failed to fetch geofences:', error);
    return;
  }

  if (!geofences || geofences.length === 0) {
    console.log('⚠️  No geofences found in database!');
    return;
  }

  console.log(`📊 Total geofences: ${geofences.length}\n`);

  // Categorize geofences
  const withCoords = geofences.filter(g => g.center_lat !== null && g.center_lng !== null);
  const withoutCoords = geofences.filter(g => g.center_lat === null || g.center_lng === null);
  const withZeroCoords = geofences.filter(g =>
    (g.center_lat === 0 && g.center_lng === 0) ||
    (g.center_lat === 0 || g.center_lng === 0)
  );

  console.log('📈 Summary:');
  console.log(`   ✅ With coordinates: ${withCoords.length}`);
  console.log(`   ❌ Without coordinates (null): ${withoutCoords.length}`);
  console.log(`   ⚠️  With zero coordinates: ${withZeroCoords.length}`);
  console.log('\n' + '='.repeat(70));

  // Show geofences without coordinates
  if (withoutCoords.length > 0) {
    console.log('\n🔴 Geofences WITHOUT coordinates:');
    withoutCoords.forEach(g => {
      console.log(`   • ${g.name} (${g.id})`);
      console.log(`     Description: ${g.description || 'N/A'}`);
      console.log(`     Coords: ${g.center_lat}, ${g.center_lng}\n`);
    });
  }

  // Show geofences with zero coordinates (likely need fixing)
  if (withZeroCoords.length > 0) {
    console.log('\n⚠️  Geofences with ZERO coordinates (might need geocoding):');
    withZeroCoords.forEach(g => {
      console.log(`   • ${g.name} (${g.id})`);
      console.log(`     Description: ${g.description || 'N/A'}`);
      console.log(`     Coords: ${g.center_lat}, ${g.center_lng}\n`);
    });
  }

  // Show sample of geofences WITH coordinates
  if (withCoords.length > 0) {
    console.log('\n✅ Sample geofences WITH coordinates:');
    withCoords.slice(0, 5).forEach(g => {
      console.log(`   • ${g.name}`);
      console.log(`     Coords: ${g.center_lat}, ${g.center_lng}\n`);
    });
    if (withCoords.length > 5) {
      console.log(`   ... and ${withCoords.length - 5} more\n`);
    }
  }
}

checkGeofences().catch(console.error);
