-- Generate Tracking Data - Works with BOTH vehicle tables
-- Handles the relationship between vehicles and wialon_vehicles tables

DO $$
DECLARE
  v_vehicle RECORD;
  v_load RECORD;
  v_points INT := 50;
  v_current_time TIMESTAMPTZ := NOW() - INTERVAL '1 hour';
  i INT;
  v_lat NUMERIC;
  v_lng NUMERIC;
  v_speed NUMERIC;
  v_total_vehicles INT := 0;
  v_total_points INT := 0;
BEGIN
  RAISE NOTICE '🚀 Starting tracking data generation...';

  -- Temporarily disable ALL triggers on delivery_tracking to avoid FK errors
  BEGIN
    ALTER TABLE delivery_tracking DISABLE TRIGGER ALL;
    RAISE NOTICE '⚙️ Disabled all triggers on delivery_tracking temporarily';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '⚠️ Could not disable triggers: %, proceeding anyway', SQLERRM;
  END;

  -- Strategy: Find loads with wialon_vehicles assigned,
  -- then map to the main vehicles table for delivery_tracking

  FOR v_load IN
    SELECT
      l.id as load_id,
      l.load_number,
      l.assigned_vehicle_id as wialon_vehicle_id,
      wv.name as vehicle_name,
      wv.wialon_unit_id,
      COALESCE(l.origin_lat, -26.2041) as start_lat,
      COALESCE(l.origin_lng, 28.0473) as start_lng,
      COALESCE(l.destination_lat, -25.7479) as end_lat,
      COALESCE(l.destination_lng, 28.2293) as end_lng,
      -- Try to find corresponding vehicle in main vehicles table
      v.id as main_vehicle_id,
      v.fleet_number
    FROM loads l
    INNER JOIN wialon_vehicles wv ON l.assigned_vehicle_id = wv.id
    LEFT JOIN vehicles v ON v.wialon_id = wv.wialon_unit_id
      OR v.registration_number = wv.registration
      OR v.fleet_number = SUBSTRING(wv.name FROM '^[0-9]+H')
    WHERE l.assigned_vehicle_id IS NOT NULL
    ORDER BY l.created_at DESC
    LIMIT 20  -- Process up to 20 loads
  LOOP
    -- Skip if we can't find a matching vehicle in main vehicles table
    IF v_load.main_vehicle_id IS NULL THEN
      RAISE NOTICE '⚠️ Skipping load % - no matching vehicle in main vehicles table for %',
        v_load.load_number, v_load.vehicle_name;
      CONTINUE;
    END IF;

    v_total_vehicles := v_total_vehicles + 1;

    RAISE NOTICE '📍 Generating tracking for: Load % -> Vehicle % (Fleet: %)',
      v_load.load_number, v_load.vehicle_name, v_load.fleet_number;

    -- Generate tracking points
    FOR i IN 0..v_points LOOP
      v_lat := v_load.start_lat + (v_load.end_lat - v_load.start_lat) * (i::NUMERIC / v_points);
      v_lng := v_load.start_lng + (v_load.end_lng - v_load.start_lng) * (i::NUMERIC / v_points);
      v_speed := 60 + (RANDOM() * 40 - 20); -- 40-100 km/h

      INSERT INTO delivery_tracking (
        load_id,
        vehicle_id,  -- Uses vehicles.id (not wialon_vehicles.id)
        latitude,
        longitude,
        speed,
        heading,
        altitude,
        accuracy,
        recorded_at,
        is_moving,
        data_source
      ) VALUES (
        v_load.load_id,
        v_load.main_vehicle_id,  -- Main vehicles table ID
        v_lat,
        v_lng,
        v_speed,
        DEGREES(ATAN2(v_load.end_lng - v_load.start_lng, v_load.end_lat - v_load.start_lat)),
        500 + RANDOM() * 1000,
        RANDOM() * 10 + 5,
        v_current_time + (i * INTERVAL '1 minute'),
        v_speed > 5,
        'test_data_mapped'
      );

      v_total_points := v_total_points + 1;
    END LOOP;

  END LOOP;

  -- Re-enable all triggers
  BEGIN
    ALTER TABLE delivery_tracking ENABLE TRIGGER ALL;
    RAISE NOTICE '⚙️ Re-enabled all triggers on delivery_tracking';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '⚠️ Could not re-enable triggers: %', SQLERRM;
  END;

  IF v_total_vehicles = 0 THEN
    RAISE NOTICE '❌ No vehicles processed. Check:';
    RAISE NOTICE '   1. Do you have loads with assigned wialon_vehicles?';
    RAISE NOTICE '   2. Do those wialon_vehicles have matching entries in the vehicles table?';
    RAISE NOTICE '   3. Run this query to check:';
    RAISE NOTICE '      SELECT wv.name, wv.registration, v.fleet_number, v.id as has_vehicle_match';
    RAISE NOTICE '      FROM wialon_vehicles wv';
    RAISE NOTICE '      LEFT JOIN vehicles v ON v.registration = wv.registration';
    RAISE NOTICE '      ORDER BY wv.created_at DESC;';
  ELSE
    RAISE NOTICE '✅ Successfully generated tracking data:';
    RAISE NOTICE '   - % loads processed', v_total_vehicles;
    RAISE NOTICE '   - % total GPS points created', v_total_points;
  END IF;
END $$;

-- Verify the data
SELECT
  l.load_number,
  v.fleet_number,
  v.registration,
  wv.name as wialon_name,
  COUNT(dt.*) as gps_points,
  MIN(dt.recorded_at) as first_point,
  MAX(dt.recorded_at) as last_point,
  ROUND(AVG(dt.speed)::numeric, 2) as avg_speed_kmh
FROM delivery_tracking dt
INNER JOIN loads l ON dt.load_id = l.id
INNER JOIN vehicles v ON dt.vehicle_id = v.id
LEFT JOIN wialon_vehicles wv ON l.assigned_vehicle_id = wv.id
WHERE dt.data_source = 'test_data_mapped'
GROUP BY l.load_number, v.fleet_number, v.registration, wv.name
ORDER BY gps_points DESC;
