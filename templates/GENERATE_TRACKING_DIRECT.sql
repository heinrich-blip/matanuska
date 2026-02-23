-- DIRECT INSERT - Bypass all triggers by inserting with session_replication_role
-- This is the most reliable way to insert test data without triggers firing

DO $
$
DECLARE
  v_load RECORD;
  v_points INT := 50;
  v_current_time TIMESTAMPTZ := NOW
() - INTERVAL '1 hour';
  i INT;
  v_lat NUMERIC;
  v_lng NUMERIC;
  v_speed NUMERIC;
  v_total_loads INT := 0;
  v_total_points INT := 0;
  v_old_role TEXT;
BEGIN
  RAISE NOTICE '🚀 Starting tracking data generation with trigger bypass...';

  -- Save current replication role and set to replica (disables triggers)
  v_old_role := current_setting
('session_replication_role');
  PERFORM set_config
('session_replication_role', 'replica', true);
  RAISE NOTICE '⚙️ Set session_replication_role to replica (triggers disabled)';

  FOR v_load IN
SELECT
  l.id as load_id,
  l.load_number,
  wv.name as vehicle_name,
  COALESCE(l.origin_lat, -26.2041) as start_lat,
  COALESCE(l.origin_lng, 28.0473) as start_lng,
  COALESCE(l.destination_lat, -25.7479) as end_lat,
  COALESCE(l.destination_lng, 28.2293) as end_lng,
  v.id as main_vehicle_id,
  v.fleet_number
FROM loads l
  INNER JOIN wialon_vehicles wv ON l.assigned_vehicle_id = wv.id
  LEFT JOIN vehicles v ON v.wialon_id = wv.wialon_unit_id
    OR v.registration_number = wv.registration
    OR v.fleet_number = SUBSTRING(wv.name FROM '^[0-9]+H')
WHERE l.assigned_vehicle_id IS NOT NULL
  AND v.id IS NOT NULL
-- Only process if we found a matching vehicle
ORDER BY l.created_at DESC
    LIMIT 20
  LOOP
v_total_loads := v_total_loads + 1;

    RAISE NOTICE '📍 Generating tracking for: Load % -> Vehicle % (Fleet: %)',
      v_load.load_number, v_load.vehicle_name, v_load.fleet_number;

    FOR i IN 0..v_points LOOP
      v_lat := v_load.start_lat +
(v_load.end_lat - v_load.start_lat) *
(i::NUMERIC / v_points);
      v_lng := v_load.start_lng +
(v_load.end_lng - v_load.start_lng) *
(i::NUMERIC / v_points);
      v_speed := 60 +
(RANDOM
() * 40 - 20);

INSERT INTO delivery_tracking
  (
  load_id,
  vehicle_id,
  latitude,
  longitude,
  speed,
  heading,
  altitude,
  accuracy,
  recorded_at,
  is_moving,
  data_source
  )
VALUES
  (
    v_load.load_id,
    v_load.main_vehicle_id,
    v_lat,
    v_lng,
    v_speed,
    DEGREES(ATAN2(v_load.end_lng - v_load.start_lng, v_load.end_lat - v_load.start_lat)),
    500 + RANDOM() * 1000,
    RANDOM() * 10 + 5,
    v_current_time + (i * INTERVAL
'1 minute'),
        v_speed > 5,
        'test_data_direct'
      );

      v_total_points := v_total_points + 1;
END LOOP;
END LOOP;

  -- Restore original replication role
  PERFORM set_config
('session_replication_role', v_old_role, true);
  RAISE NOTICE '⚙️ Restored session_replication_role to %', v_old_role;

IF v_total_loads = 0 THEN
    RAISE NOTICE '❌ No loads processed. Your wialon_vehicles may not have matching entries in the vehicles table.';
    RAISE NOTICE '   Run this query to check the mapping:';
    RAISE NOTICE '   SELECT wv.name, wv.wialon_unit_id, wv.registration,';
    RAISE NOTICE '          v.fleet_number, v.wialon_id, v.registration_number';
    RAISE NOTICE '   FROM wialon_vehicles wv';
    RAISE NOTICE '   LEFT JOIN vehicles v ON v.wialon_id = wv.wialon_unit_id';
    RAISE NOTICE '   ORDER BY wv.created_at DESC;';
  ELSE
    RAISE NOTICE '✅ Successfully generated tracking data:';
    RAISE NOTICE '   - % loads processed', v_total_loads;
    RAISE NOTICE '   - % total GPS points created', v_total_points;
END
IF;
END $$;

-- Verify the data
SELECT
  l.load_number,
  v.fleet_number,
  v.registration_number,
  COUNT(*) as gps_points,
  MIN(dt.recorded_at) as first_point,
  MAX(dt.recorded_at) as last_point,
  ROUND(AVG(dt.speed)::numeric, 2) as avg_speed_kmh
FROM delivery_tracking dt
  INNER JOIN loads l ON dt.load_id = l.id
  INNER JOIN vehicles v ON dt.vehicle_id = v.id
WHERE dt.data_source = 'test_data_direct'
GROUP BY l.load_number, v.fleet_number, v.registration_number
ORDER BY gps_points DESC;
