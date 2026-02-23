-- ============================================================================
-- REGISTRATION NUMBER MATCHING DIAGNOSTIC
-- ============================================================================
-- This checks if there's a mismatch between how registration numbers
-- are stored in vehicles table vs fleet_*_tyres tables

-- STEP 1: Check vehicles table registration format
SELECT
  'VEHICLES TABLE' as source,
  registration_number as full_registration,
  -- Simulate extractRegistrationNumber() logic
  regexp_replace(registration_number, '^\d+[A-Z]+\s+', '') as extracted_registration,
  fleet_number
FROM vehicles
WHERE registration_number ILIKE '%ADS4865%'
   OR registration_number ILIKE '%ABA%';

-- STEP 2: Check fleet_14l_tyres registration format
SELECT DISTINCT
  'FLEET_14L_TYRES TABLE' as source,
  registration_no as stored_registration,
  -- Check if it has fleet prefix or not
  CASE
    WHEN registration_no ~ '^\d+[A-Z]+\s+' THEN 'Has fleet prefix (e.g., 33H XXX)'
    ELSE 'No fleet prefix (just registration)'
  END as format_type
FROM fleet_14l_tyres
LIMIT 10;

-- STEP 3: Try to find matching vehicles
-- This compares both formats
WITH vehicle_regs AS (
  SELECT
    registration_number as full_reg,
    regexp_replace(registration_number, '^\d+[A-Z]+\s+', '') as extracted_reg
  FROM vehicles
  WHERE fleet_number = '14L' OR registration_number ~ '^14L\s+'
),
tyre_regs AS (
  SELECT DISTINCT registration_no
  FROM fleet_14l_tyres
)
SELECT
  v.full_reg as vehicle_full_registration,
  v.extracted_reg as vehicle_extracted_registration,
  t.registration_no as tyres_table_registration,
  CASE
    WHEN v.extracted_reg = t.registration_no THEN '✓ MATCH (extracted)'
    WHEN v.full_reg = t.registration_no THEN '✓ MATCH (full)'
    ELSE '✗ NO MATCH'
  END as match_status
FROM vehicle_regs v
FULL OUTER JOIN tyre_regs t
  ON v.extracted_reg = t.registration_no
  OR v.full_reg = t.registration_no
ORDER BY match_status, v.full_reg;

-- STEP 4: Show sample of what's actually in both tables
SELECT
  'Sample Comparison' as info,
  (SELECT string_agg(DISTINCT registration_number, ', ')
   FROM vehicles WHERE fleet_number = '14L' LIMIT 5) as vehicles_table_samples,
  (SELECT string_agg(DISTINCT registration_no, ', ')
   FROM fleet_14l_tyres LIMIT 5) as tyres_table_samples;

-- ============================================================================
-- EXPECTED RESULTS & FIX
-- ============================================================================
-- If vehicles table has: "14L ADS4865" or "14L ABA3918"
-- And extractRegistrationNumber() returns: "ADS4865" or "ABA3918"
-- Then fleet_14l_tyres.registration_no should contain: "ADS4865" or "ABA3918"
-- (NOT "14L ADS4865" - without the fleet prefix)
--
-- If there's a mismatch, we need to either:
-- 1. Update the data in fleet_14l_tyres to use extracted format
-- 2. Update the extractRegistrationNumber() function logic
-- 3. Change the query to compare full registration numbers
