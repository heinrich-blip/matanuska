
// scripts/check-geofences.ts

/**
 * Diagnostic script to check geofences status
 * Run with: npx tsx scripts/check-geofences.ts [--no-coords] [--with-coords]
 *
 * Options:
 *   --no-coords     Show only geofences WITHOUT coordinates
 *   --with-coords   Show only geofences WITH coordinates
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

// Parse command line arguments
const showOnlyWithoutCoords = process.argv.includes('--no-coords');
const showOnlyWithCoords = process.argv.includes('--with-coords');

async function checkGeofences() {
  console.log('🔍 Fetching all geofences...\n');

  const { data: geofences, error } = await supabase
    .from('geofences')
    .select('id, name, description, type, center_lat, center_lng, metadata, is_active')
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
  const byType = geofences.reduce((acc: any, g) => {
    acc[g.type] = (acc[g.type] || 0) + 1;
    return acc;
  }, {});

  console.log('📈 Summary:');
  console.log(`   ✅ With coordinates: ${withCoords.length} (${((withCoords.length / geofences.length) * 100).toFixed(1)}%)`);
  console.log(`   ❌ Without coordinates: ${withoutCoords.length} (${((withoutCoords.length / geofences.length) * 100).toFixed(1)}%)`);
  console.log('\n📍 Geofence Types:');
  Object.entries(byType).forEach(([type, count]) => {
    console.log(`   • ${type}: ${count}`);
  });
  console.log('\n' + '='.repeat(70));

  // Show geofences without coordinates
  if (!showOnlyWithCoords && withoutCoords.length > 0) {
    console.log('\n🔴 Geofences WITHOUT coordinates:\n');
    withoutCoords.forEach((g, idx) => {
      console.log(`${idx + 1}. ${g.name}`);
      console.log(`   Type: ${g.type}`);
      console.log(`   Description: ${g.description || 'N/A'}`);

      // Parse and show metadata
      let metadata = g.metadata;
      if (typeof metadata === 'string') {
        try {
          metadata = JSON.parse(metadata);
        } catch (e) {
          metadata = null;
        }
      }
      if (metadata && Object.keys(metadata).length > 0) {
        console.log(`   Metadata: ${JSON.stringify(metadata)}`);
      }
      console.log('');
    });
  }

  // Show sample of geofences WITH coordinates
  if (!showOnlyWithoutCoords && withCoords.length > 0) {
    const sampleSize = Math.min(10, withCoords.length);
    console.log(`\n✅ Geofences WITH coordinates (showing ${sampleSize} of ${withCoords.length}):\n`);

    withCoords.slice(0, sampleSize).forEach((g, idx) => {
      console.log(`${idx + 1}. ${g.name}`);
      console.log(`   Type: ${g.type}`);
      console.log(`   Coordinates: ${g.center_lat}, ${g.center_lng}`);
      console.log(`   Google Maps: https://www.google.com/maps?q=${g.center_lat},${g.center_lng}`);
      console.log('');
    });

    if (withCoords.length > sampleSize) {
      console.log(`   ... and ${withCoords.length - sampleSize} more\n`);
    }
  }

  // Summary recommendation
  console.log('='.repeat(70));
  if (withoutCoords.length > 0) {
    console.log('\n💡 Next steps:');
    console.log(`   Run geocoding to add coordinates for ${withoutCoords.length} geofences:`);
    console.log('   npx tsx scripts/geocode-geofences.ts --dry-run --limit=5\n');
  } else {
    console.log('\n🎉 All geofences have coordinates!\n');
  }
}

checkGeofences().catch(console.error);
