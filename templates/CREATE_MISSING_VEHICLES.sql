-- Create missing vehicles from wialon_vehicles
-- This will create vehicle records for all unmapped wialon_vehicles

DO $
$
DECLARE
  v_wialon RECORD;
  v_created_count INT := 0;
  v_new_vehicle_id UUID;
  v_fleet_pattern TEXT;
BEGIN
  RAISE NOTICE '🚀 Creating missing vehicle records...';

  -- Loop through wialon_vehicles that don't have a mapping
  FOR v_wialon IN
SELECT
  wv.wialon_unit_id,
  wv.name,
  wv.registration,
  SUBSTRING(wv.name FROM '^[0-9]+H') as fleet_number_pattern
FROM wialon_vehicles wv
WHERE wv.wialon_unit_id IS NOT NULL
  AND NOT EXISTS (
        SELECT 1
  FROM vehicles v
  WHERE v.wialon_id = wv.wialon_unit_id
      )
LOOP
    -- Extract fleet number (e.g., "21H" from "21H - ADS 4865")
    v_fleet_pattern := v_wialon.fleet_number_pattern;

-- Create the vehicle record
INSERT INTO vehicles
  (
  fleet_number,
  registration_number,
  wialon_id,
  vehicle_type,
  created_at,
  updated_at
  )
VALUES
  (
    COALESCE(v_fleet_pattern, 'W' || v_wialon.wialon_unit_id::text), -- Use pattern or W{id}
    v_wialon.registration, -- Registration from Wialon
    v_wialon.wialon_unit_id, -- Link to Wialon
    'truck', -- Default type
    NOW(),
    NOW()
    )
RETURNING id INTO v_new_vehicle_id;

    v_created_count := v_created_count + 1;

    RAISE NOTICE '✅ Created vehicle % for Wialon unit % (%)',
      v_new_vehicle_id, v_wialon.wialon_unit_id, v_wialon.name;
END LOOP;

  RAISE NOTICE '🎉 Complete! Created % new vehicle records', v_created_count;
END $$;

-- Verify all vehicles are now mapped
SELECT
  wv.name as wialon_name,
  wv.wialon_unit_id,
  v.fleet_number,
  v.id as vehicle_id,
  CASE
    WHEN v.id IS NOT NULL THEN '✅ Mapped'
    ELSE '❌ Not mapped'
  END as mapping_status
FROM wialon_vehicles wv
  LEFT JOIN vehicles v ON v.wialon_id = wv.wialon_unit_id
ORDER BY wv.name;
