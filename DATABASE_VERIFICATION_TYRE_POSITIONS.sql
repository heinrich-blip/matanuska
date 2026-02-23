-- ============================================================================
-- TYRE POSITION DATABASE VERIFICATION
-- Run these queries in Supabase SQL Editor to diagnose position availability
-- ============================================================================

-- Replace 'ADS4865' with your actual registration number if different
-- For fleet 33H vehicles, the table is: fleet_14l_tyres

-- ============================================================================
-- STEP 1: Check what data exists for the vehicle
-- ============================================================================
SELECT
  registration_no,
  position,
  tyre_code,
  CASE
    WHEN tyre_code IS NULL THEN 'NULL'
    WHEN tyre_code = '' THEN 'EMPTY STRING'
    WHEN TRIM(tyre_code) = '' THEN 'WHITESPACE ONLY'
    ELSE 'HAS VALUE: ' || tyre_code
  END as tyre_code_status,
  LENGTH(tyre_code) as code_length,
  current_condition,
  hours,
  brand_name,
  tyre_size
FROM fleet_14l_tyres
WHERE registration_no = 'ADS4865'
ORDER BY position;

-- ============================================================================
-- STEP 2: Count available vs occupied positions
-- ============================================================================
SELECT
  COUNT(*) as total_positions,
  COUNT(CASE WHEN tyre_code IS NULL OR TRIM(tyre_code) = '' THEN 1 END) as available_positions,
  COUNT(CASE WHEN tyre_code IS NOT NULL AND TRIM(tyre_code) != '' THEN 1 END) as occupied_positions
FROM fleet_14l_tyres
WHERE registration_no = 'ADS4865';

-- ============================================================================
-- STEP 3: Show all available positions (empty tyre_code)
-- ============================================================================
SELECT position, tyre_code
FROM fleet_14l_tyres
WHERE registration_no = 'ADS4865'
  AND (tyre_code IS NULL OR TRIM(tyre_code) = '')
ORDER BY position;

-- ============================================================================
-- STEP 4: Show all occupied positions (non-empty tyre_code)
-- ============================================================================
SELECT position, tyre_code, current_condition, brand_name
FROM fleet_14l_tyres
WHERE registration_no = 'ADS4865'
  AND tyre_code IS NOT NULL
  AND TRIM(tyre_code) != ''
ORDER BY position;

-- ============================================================================
-- STEP 5: Check if positions table exists and what it contains
-- ============================================================================
SELECT position, COUNT(*) as count
FROM fleet_14l_positions
GROUP BY position
ORDER BY position;

-- ============================================================================
-- STEP 6: List all unique registration numbers in fleet_14l_tyres
-- (to verify the correct registration format)
-- ============================================================================
SELECT DISTINCT registration_no
FROM fleet_14l_tyres
ORDER BY registration_no
LIMIT 20;

-- ============================================================================
-- OPTIONAL: If above queries show all positions are occupied,
-- you may want to clear some positions for testing:
-- ============================================================================
-- UNCOMMENT ONLY IF YOU WANT TO CLEAR POSITIONS FOR TESTING!
-- This will set tyre_code to NULL for specific positions

-- UPDATE fleet_14l_tyres
-- SET tyre_code = NULL,
--     current_condition = NULL,
--     hours = NULL,
--     brand_name = NULL
-- WHERE registration_no = 'ADS4865'
--   AND position IN ('V1', 'V2', 'V3');  -- Clear first 3 positions as example

-- ============================================================================
-- VERIFICATION CHECKLIST:
-- ============================================================================
-- [ ] STEP 1: Do you see the vehicle registration 'ADS4865'?
--            - If NO: Check if registration format is different (e.g., with spaces)
--            - If YES: Continue to next step
--
-- [ ] STEP 2: Check tyre_code_status column
--            - NULL = Position is available
--            - EMPTY STRING = Position is available
--            - WHITESPACE ONLY = Position is available
--            - HAS VALUE = Position is occupied with that tyre code
--
-- [ ] STEP 3: How many positions show as available in STEP 2 count?
--            - If 0: All positions are occupied (may need to clear some)
--            - If >0: Positions should be selectable in UI
--
-- [ ] STEP 4: Check STEP 6 results
--            - Does 'ADS4865' appear in the list?
--            - Is the format exactly 'ADS4865' or different (spaces, case)?
--
-- ============================================================================
-- TROUBLESHOOTING SCENARIOS:
-- ============================================================================
-- Scenario A: Registration not found in STEP 6
--   Solution: Check vehicles table for correct registration format
--   Query: SELECT id, fleet_number, registration_number FROM vehicles
--          WHERE registration_number LIKE '%ADS4865%';
--
-- Scenario B: All positions occupied (STEP 3 shows 0 available)
--   Solution: Clear some positions using the UPDATE query above
--   Or: Insert new empty positions if none exist
--
-- Scenario C: Positions exist but still not showing in UI
--   Solution: Check browser console for JavaScript errors
--   Check: Does extractRegistrationNumber() function return correct value?
--
-- ============================================================================
