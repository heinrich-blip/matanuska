-- ============================================================================
-- CORRECTED TYRE POSITION DEBUGGING QUERIES
-- Run these in Supabase SQL Editor to diagnose position availability issues
-- ============================================================================

-- 1. Check what's in the fleet_14l_tyres table for vehicle ADS4865
-- (Replace ADS4865 with your actual vehicle registration)
SELECT
  registration_no,
  position,
  tyre_code,
  CASE
    WHEN tyre_code IS NULL THEN 'NULL (Available)'
    WHEN tyre_code = '' THEN 'Empty String (Available)'
    WHEN trim(tyre_code) = '' THEN 'Whitespace Only (Available)'
    ELSE 'Has Value (Occupied): ' || tyre_code
  END as tyre_code_status,
  updated_at
FROM fleet_14l_tyres
WHERE registration_no = 'ADS4865'
ORDER BY position;

-- 2. Count available vs occupied positions for ADS4865
SELECT
  COUNT(*) as total_positions,
  COUNT(CASE WHEN tyre_code IS NULL OR trim(tyre_code) = '' THEN 1 END) as available_positions,
  COUNT(CASE WHEN tyre_code IS NOT NULL AND trim(tyre_code) != '' THEN 1 END) as occupied_positions
FROM fleet_14l_tyres
WHERE registration_no = 'ADS4865';

-- 3. List all distinct registrations in fleet_14l_tyres
SELECT DISTINCT registration_no
FROM fleet_14l_tyres
ORDER BY registration_no;

-- 4. Check if there are ANY empty positions across ALL vehicles in fleet_14l_tyres
SELECT
  registration_no,
  COUNT(*) as total_positions,
  COUNT(CASE WHEN tyre_code IS NULL OR trim(tyre_code) = '' THEN 1 END) as available_positions
FROM fleet_14l_tyres
GROUP BY registration_no
HAVING COUNT(CASE WHEN tyre_code IS NULL OR trim(tyre_code) = '' THEN 1 END) > 0
ORDER BY registration_no;

-- 5. Check vehicles table for registration matching
-- (Shows how registration numbers are stored)
SELECT
  id,
  registration_number,
  fleet_number,
  make,
  model
FROM vehicles
WHERE registration_number ILIKE '%ADS4865%'
   OR registration_number ILIKE '%33H%'
   OR fleet_number = '14L'
ORDER BY registration_number;

-- 6. Sample data from fleet_14l_tyres (first 20 rows)
SELECT *
FROM fleet_14l_tyres
ORDER BY registration_no, position
LIMIT 20;

-- 7. Check for positions that might have problematic whitespace
SELECT
  registration_no,
  position,
  tyre_code,
  length(tyre_code) as code_length,
  octet_length(tyre_code) as code_bytes
FROM fleet_14l_tyres
WHERE tyre_code IS NOT NULL
  AND tyre_code != ''
  AND registration_no = 'ADS4865'
ORDER BY position;

-- ============================================================================
-- INTERPRETATION GUIDE
-- ============================================================================
-- Query 1: Shows exact status of each position for the vehicle
-- Query 2: Summary count of available vs occupied
-- Query 3: Lists all vehicles in the 14L fleet table
-- Query 4: Shows which vehicles have ANY available positions
-- Query 5: Check how registration numbers are formatted in vehicles table
-- Query 6: See actual data structure
-- Query 7: Detect hidden characters or encoding issues in tyre_code
