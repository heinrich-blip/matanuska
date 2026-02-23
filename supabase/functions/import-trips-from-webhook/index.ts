import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-source, x-batch-size, x-target-collection'
};
// IMPORTANT: This function ALWAYS creates/updates trips as 'active' with 'USD' currency
// These are business requirements - all webhook imports must be active trips in USD
const REQUIRED_STATUS = 'active';
const REQUIRED_CURRENCY = 'USD';
serve(async (req)=>{
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    console.log('🚀 Webhook received - Starting ACTIVE trip import process (USD currency enforced)');
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    // Parse request body
    const { trips } = await req.json();
    if (!trips || !Array.isArray(trips)) {
      console.error('❌ Invalid payload: trips array missing or invalid');
      return new Response(JSON.stringify({
        error: 'Invalid payload: trips array required'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    console.log(`📦 Processing ${trips.length} trips from webhook - ALL will be set to '${REQUIRED_STATUS}' status with '${REQUIRED_CURRENCY}' currency`);
    const results = {
      success: [],
      failed: [],
      updated: [],
      created: []
    };
    // Process each trip
    for (const trip of trips){
      try {
        // Validate required fields
        if (!trip.loadRef) {
          results.failed.push({
            loadRef: 'unknown',
            error: 'Missing loadRef'
          });
          continue;
        }
        // Map incoming data to Supabase trips table schema
        // CRITICAL: Status is ALWAYS 'active' and currency is ALWAYS 'USD' - business requirements
        const tripData = {
          trip_number: trip.loadRef,
          client_name: trip.customer || null,
          origin: trip.origin || null,
          destination: trip.destination || null,
          route: trip.origin && trip.destination ? `${trip.origin} - ${trip.destination}` : null,
          departure_date: trip.shippedDate ? new Date(trip.shippedDate).toISOString().split('T')[0] : null,
          actual_departure_date: trip.shippedDate ? new Date(trip.shippedDate).toISOString() : null,
          arrival_date: trip.deliveredDate ? new Date(trip.deliveredDate).toISOString().split('T')[0] : null,
          actual_arrival_date: trip.deliveredDate ? new Date(trip.deliveredDate).toISOString() : null,
          // 🔒 ENFORCED REQUIREMENTS: ALL WEBHOOK TRIPS ARE ACTIVE & USD
          status: REQUIRED_STATUS,
          revenue_currency: REQUIRED_CURRENCY,
          payment_status: 'unpaid', // Required field to prevent display issues
          import_source: trip.importSource || 'web_book',
          shipped_status: trip.shippedStatus,
          delivered_status: trip.deliveredStatus,
          external_load_ref: trip.loadRef,
          trip_duration_hours: trip.tripDurationHours,
          updated_at: new Date().toISOString(),
          edit_history: {
            imported_at: new Date().toISOString(),
            imported_from: trip.importSource || 'web_book',
            delivery_acknowledged: trip.deliveredStatus,
            forced_active_status: true,
            forced_usd_currency: true,
            webhook_data: {
              shipped_date: trip.shippedDate,
              delivered_date: trip.deliveredDate,
              duration_hours: trip.tripDurationHours,
              original_currency: trip.currency || 'not_provided'
            }
          }
        };
        // Double-check enforcement (failsafes)
        if (tripData.status !== REQUIRED_STATUS) {
          console.warn(`⚠️ Status override detected for ${trip.loadRef} - forcing to '${REQUIRED_STATUS}'`);
          tripData.status = REQUIRED_STATUS;
        }
        if (tripData.revenue_currency !== REQUIRED_CURRENCY) {
          console.warn(`⚠️ Currency override detected for ${trip.loadRef} - forcing to '${REQUIRED_CURRENCY}'`);
          tripData.revenue_currency = REQUIRED_CURRENCY;
        }
        console.log(`📝 Processing trip: ${trip.loadRef} - STATUS: ${tripData.status} (ENFORCED) - CURRENCY: ${tripData.revenue_currency} (ENFORCED) - Delivered: ${trip.deliveredStatus}`);
        // Check if trip already exists
        const { data: existingTrip, error: checkError } = await supabase.from('trips').select('id, trip_number, status, revenue_currency').eq('trip_number', trip.loadRef).maybeSingle();
        if (checkError) {
          console.error(`❌ Error checking trip ${trip.loadRef}:`, checkError);
          results.failed.push({
            loadRef: trip.loadRef,
            error: checkError.message
          });
          continue;
        }
        if (existingTrip) {
          // Update existing trip - ALWAYS set to active & USD
          console.log(`🔄 Updating existing trip ${trip.loadRef} from status '${existingTrip.status}' to '${REQUIRED_STATUS}' and currency '${existingTrip.revenue_currency || 'null'}' to '${REQUIRED_CURRENCY}'`);
          const { error: updateError } = await supabase.from('trips').update(tripData).eq('id', existingTrip.id);
          if (updateError) {
            console.error(`❌ Error updating trip ${trip.loadRef}:`, updateError);
            results.failed.push({
              loadRef: trip.loadRef,
              error: updateError.message
            });
          } else {
            console.log(`✅ Updated trip: ${trip.loadRef} - STATUS: ${REQUIRED_STATUS} - CURRENCY: ${REQUIRED_CURRENCY}`);
            results.updated.push(trip.loadRef);
            results.success.push(trip.loadRef);
          }
        } else {
          // Create new trip - ALWAYS active & USD
          console.log(`🆕 Creating new trip ${trip.loadRef} with status '${REQUIRED_STATUS}' and currency '${REQUIRED_CURRENCY}'`);
          const { error: insertError } = await supabase.from('trips').insert(tripData);
          if (insertError) {
            console.error(`❌ Error creating trip ${trip.loadRef}:`, insertError);
            results.failed.push({
              loadRef: trip.loadRef,
              error: insertError.message
            });
          } else {
            console.log(`✅ Created trip: ${trip.loadRef} - STATUS: ${REQUIRED_STATUS} - CURRENCY: ${REQUIRED_CURRENCY}`);
            results.created.push(trip.loadRef);
            results.success.push(trip.loadRef);
          }
        }
      } catch (tripError) {
        console.error(`❌ Unexpected error processing trip ${trip.loadRef}:`, tripError);
        results.failed.push({
          loadRef: trip.loadRef,
          error: tripError instanceof Error ? tripError.message : 'Unknown error'
        });
      }
    }
    // Log summary with status & currency enforcement confirmation
    console.log(`\n📊 Import Summary (ALL trips set to '${REQUIRED_STATUS}' status with '${REQUIRED_CURRENCY}' currency):`);
    console.log(`   ✅ Successful: ${results.success.length}`);
    console.log(`   🆕 Created: ${results.created.length} (all active USD)`);
    console.log(`   🔄 Updated: ${results.updated.length} (all forced to active USD)`);
    console.log(`   ❌ Failed: ${results.failed.length}`);
    console.log(`💰 Currency enforcement: ALL trips set to ${REQUIRED_CURRENCY}`);
    console.log(`🏁 Webhook processing completed - Status: ACTIVE, Currency: USD\n`);
    // Return response with status & currency enforcement confirmation
    const response = {
      status: 'success',
      message: `Processed ${trips.length} trips - ALL set to '${REQUIRED_STATUS}' status with '${REQUIRED_CURRENCY}' currency`,
      results: {
        total: trips.length,
        successful: results.success.length,
        created: results.created.length,
        updated: results.updated.length,
        failed: results.failed.length,
        status_enforced: REQUIRED_STATUS,
        currency_enforced: REQUIRED_CURRENCY,
        all_trips_active: true,
        all_trips_usd: true
      },
      details: {
        success: results.success,
        failed: results.failed,
        enforcement_note: `All webhook trips are automatically set to '${REQUIRED_STATUS}' status with '${REQUIRED_CURRENCY}' currency as per business requirements`
      },
      timestamp: new Date().toISOString()
    };
    return new Response(JSON.stringify(response), {
      status: results.failed.length > 0 ? 207 : 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('❌ Unexpected error in webhook handler:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      note: 'All webhook trips should be active with USD currency - check function implementation'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
