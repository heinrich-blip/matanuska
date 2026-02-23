-- ============================================================================
-- COMPREHENSIVE TYRE POSITION DEBUG SCRIPT
-- Copy this entire script and run in Supabase SQL Editor
-- ============================================================================

-- This script will help you understand why positions aren't showing as available

DO $$
DECLARE
  v_registration TEXT := 'ADS4865';  -- Change this to your vehicle registration
  v_fleet_table TEXT := 'fleet_14l_tyres';  -- Change if using different fleet
  v_positions_table TEXT := 'fleet_14l_positions';
  v_position_count INT;
  v_occupied_count INT;
  v_available_count INT;
BEGIN
  RAISE NOTICE '════════════════════════════════════════════════════════════════';
  RAISE NOTICE 'TYRE POSITION AVAILABILITY DEBUG';
  RAISE NOTICE '════════════════════════════════════════════════════════════════';
  RAISE NOTICE 'Vehicle: %', v_registration;
  RAISE NOTICE 'Fleet Table: %', v_fleet_table;
  RAISE NOTICE '';

  -- Check if vehicle exists in fleet table
  EXECUTE format('SELECT COUNT(*) FROM %I WHERE registration_no = $1', v_fleet_table)
    INTO v_position_count
    USING v_registration;

  IF v_position_count = 0 THEN
    RAISE NOTICE '❌ PROBLEM FOUND: Vehicle % not found in %', v_registration, v_fleet_table;
    RAISE NOTICE '';
    RAISE NOTICE 'Possible causes:';
    RAISE NOTICE '1. Registration number format mismatch';
    RAISE NOTICE '2. Vehicle not added to fleet table yet';
    RAISE NOTICE '3. Wrong fleet table selected';
    RAISE NOTICE '';
    RAISE NOTICE 'Checking for similar registrations...';

    -- Show similar registration numbers
    EXECUTE format(
      'SELECT DISTINCT registration_no FROM %I WHERE registration_no LIKE $1 LIMIT 10',
      v_fleet_table
    ) USING '%' || SUBSTRING(v_registration FROM 4) || '%';

    RETURN;
  END IF;

  RAISE NOTICE '✅ Found % position records for vehicle %', v_position_count, v_registration;
  RAISE NOTICE '';

  -- Count occupied vs available
  EXECUTE format(
    'SELECT
      COUNT(CASE WHEN tyre_code IS NOT NULL AND TRIM(tyre_code) != '''' THEN 1 END),
      COUNT(CASE WHEN tyre_code IS NULL OR TRIM(tyre_code) = '''' THEN 1 END)
    FROM %I WHERE registration_no = $1',
    v_fleet_table
  ) INTO v_occupied_count, v_available_count
  USING v_registration;

  RAISE NOTICE '📊 Position Summary:';
  RAISE NOTICE '   Total positions: %', v_position_count;
  RAISE NOTICE '   Occupied (has tyre_code): %', v_occupied_count;
  RAISE NOTICE '   Available (empty tyre_code): %', v_available_count;
  RAISE NOTICE '';

  IF v_available_count = 0 THEN
    RAISE NOTICE '⚠️  PROBLEM FOUND: All % positions are occupied!', v_position_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Showing occupied positions:';
    RAISE NOTICE '────────────────────────────────────────────────────────────────';

    -- Show all occupied positions in a loop
    FOR i IN
      EXECUTE format(
        'SELECT position, tyre_code, current_condition, brand_name
         FROM %I
         WHERE registration_no = $1
           AND tyre_code IS NOT NULL
           AND TRIM(tyre_code) != ''''
         ORDER BY position',
        v_fleet_table
      ) USING v_registration
    LOOP
      RAISE NOTICE '   Position %: tyre_code=%, condition=%, brand=%',
        i.position, i.tyre_code, i.current_condition, i.brand_name;
    END LOOP;

    RAISE NOTICE '';
    RAISE NOTICE '💡 Solutions:';
    RAISE NOTICE '   Option A: Clear specific positions (see UPDATE query below)';
    RAISE NOTICE '   Option B: Remove tyres from positions using the app';
    RAISE NOTICE '   Option C: Check if tyre_code values are incorrect/stale data';

  ELSE
    RAISE NOTICE '✅ Found % available position(s)!', v_available_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Available positions:';
    RAISE NOTICE '────────────────────────────────────────────────────────────────';

    -- Show available positions
    FOR i IN
      EXECUTE format(
        'SELECT position FROM %I
         WHERE registration_no = $1
           AND (tyre_code IS NULL OR TRIM(tyre_code) = '''')
         ORDER BY position',
        v_fleet_table
      ) USING v_registration
    LOOP
      RAISE NOTICE '   ✓ %', i.position;
    END LOOP;

    RAISE NOTICE '';
    RAISE NOTICE '💡 If these positions still don''t show in UI:';
    RAISE NOTICE '   1. Check browser console for JavaScript errors';
    RAISE NOTICE '   2. Verify extractRegistrationNumber() returns: %', v_registration;
    RAISE NOTICE '   3. Check network tab for API call to: %', v_fleet_table;
    RAISE NOTICE '   4. Ensure RLS policies allow SELECT on %', v_fleet_table;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════════════════════';

END $$;

-- ============================================================================
-- QUICK FIX: Clear positions to make them available (OPTIONAL)
-- ============================================================================
-- Uncomment and run this ONLY if you want to clear ALL positions for testing

-- UPDATE fleet_14l_tyres
-- SET tyre_code = NULL,
--     current_condition = NULL,
--     hours = NULL,
--     brand_name = NULL,
--     tyre_size = NULL,
--     date_installed = NULL
-- WHERE registration_no = 'ADS4865';

-- Or clear just specific positions:
-- UPDATE fleet_14l_tyres
-- SET tyre_code = NULL
-- WHERE registration_no = 'ADS4865'
--   AND position IN ('V1', 'V2', 'V3');

-- ============================================================================
-- Manual inspection queries (run these separately)
-- ============================================================================

-- 1. Show exact tyre_code values (including hidden characters)
-- SELECT
--   position,
--   tyre_code,
--   LENGTH(tyre_code) as code_length,
--   ASCII(SUBSTRING(tyre_code FROM 1 FOR 1)) as first_char_ascii,
--   ENCODE(tyre_code::bytea, 'hex') as hex_value
-- FROM fleet_14l_tyres
-- WHERE registration_no = 'ADS4865'
-- ORDER BY position;

-- 2. Check all registrations in fleet table (to find format issues)
-- SELECT DISTINCT registration_no
-- FROM fleet_14l_tyres
-- ORDER BY registration_no
-- LIMIT 50;

-- 3. Check if RLS is blocking queries
-- SELECT has_table_privilege('fleet_14l_tyres', 'SELECT') as can_select;
