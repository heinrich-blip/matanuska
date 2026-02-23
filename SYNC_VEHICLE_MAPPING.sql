-- Sync wialon_vehicles to vehicles table by updating wialon_id
-- This will enable tracking visualization for all loads

DO $
$
DECLARE
  v_wialon RECORD;
  v_updated_count INT := 0;
  v_vehicle_id UUID;
BEGIN
  RAISE NOTICE '🔄 Starting vehicle mapping sync...';

  -- Loop through all wialon_vehicles
  FOR v_wialon IN
SELECT
  wv.wialon_unit_id,
  wv.name,
  wv.registration,
  SUBSTRING(wv.name FROM '^[0-9]+H') as fleet_pattern
FROM wialon_vehicles wv
WHERE wv.wialon_unit_id IS NOT NULL
LOOP
-- Try to find matching vehicle in vehicles table
-- Method 1: Match by fleet_number pattern (e.g., "21H" from "21H - ADS 4865")
-- Method 2: Match by registration
-- Method 3: Match by fleet_number = W{wialon_unit_id} pattern

SELECT id
INTO v_vehicle_id
FROM vehicles v
WHERE
      v.fleet_number = v_wialon.fleet_pattern
  OR v.registration_number = v_wialon.registration
  OR v.fleet_number = 'W' || v_wialon.wialon_unit_id::text
LIMIT 1;

IF v_vehicle_id IS NOT NULL THEN
-- Update the vehicle with wialon_id if not already set
UPDATE vehicles
      SET
        wialon_id = v_wialon.wialon_unit_id,
        updated_at = NOW()
      WHERE id = v_vehicle_id
  AND (wialon_id IS NULL OR wialon_id != v_wialon.wialon_unit_id);

IF FOUND THEN
        v_updated_count := v_updated_count + 1;
        RAISE NOTICE '✅ Mapped % (wialon_id: %) to vehicle %',
          v_wialon.name, v_wialon.wialon_unit_id, v_vehicle_id;
END
IF;
    ELSE
      -- No matching vehicle found - could create one or just log
      RAISE NOTICE '⚠️ No vehicle found for % (wialon_id: %)',
        v_wialon.name, v_wialon.wialon_unit_id;
END
IF;
  END LOOP;

  RAISE NOTICE '🎉 Mapping complete! Updated % vehicles', v_updated_count;
END $$;

-- Verify the mapping
SELECT
  wv.name as wialon_name,
  wv.wialon_unit_id,
  v.fleet_number,
  v.registration_number,
  v.id as vehicle_id,
  CASE
    WHEN v.id IS NOT NULL THEN '✅ Mapped'
    ELSE '❌ Not mapped'
  END as status
FROM wialon_vehicles wv
  LEFT JOIN vehicles v ON v.wialon_id = wv.wialon_unit_id
ORDER BY wv.name;
