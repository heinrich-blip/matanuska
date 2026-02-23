-- Generate Sample Tracking Data for ALL Fleet Vehicles
-- This will create GPS tracking data for every vehicle in vehicles table (main fleet table)

DO $$
DECLARE
  v_vehicle RECORD;
  v_load_id UUID;
  v_start_lat NUMERIC;
  v_start_lng NUMERIC;
  v_end_lat NUMERIC;
  v_end_lng NUMERIC;
  v_points INT := 50;
  v_current_time TIMESTAMPTZ := NOW() - INTERVAL '1 hour';
  i INT;
  v_lat NUMERIC;
  v_lng NUMERIC;
  v_speed NUMERIC;
  v_total_vehicles INT := 0;
  v_total_points INT := 0;
BEGIN
  -- Loop through ALL vehicles in vehicles table (main fleet table)
  FOR v_vehicle IN
    SELECT id, fleet_number, registration
    FROM vehicles
    WHERE active = true
    ORDER BY created_at DESC
  LOOP
    v_total_vehicles := v_total_vehicles + 1;

    -- Find a load for this vehicle
    SELECT l.id, l.origin_lat, l.origin_lng, l.destination_lat, l.destination_lng
    INTO v_load_id, v_start_lat, v_start_lng, v_end_lat, v_end_lng
    FROM loads l
    WHERE l.assigned_vehicle_id = v_vehicle.id
    ORDER BY l.created_at DESC
    LIMIT 1;

    -- If no assigned load, use any recent load and default coordinates
    IF v_load_id IS NULL THEN
      SELECT id INTO v_load_id FROM loads ORDER BY created_at DESC LIMIT 1;

      -- Use different starting points for variety (South African cities)
      v_start_lat := -26.2041 + (RANDOM() * 2 - 1); -- Johannesburg area
      v_start_lng := 28.0473 + (RANDOM() * 2 - 1);
      v_end_lat := -25.7479 + (RANDOM() * 2 - 1); -- Pretoria area
      v_end_lng := 28.2293 + (RANDOM() * 2 - 1);
    ELSE
      -- Use load coordinates or defaults
      v_start_lat := COALESCE(v_start_lat, -26.2041);
      v_start_lng := COALESCE(v_start_lng, 28.0473);
      v_end_lat := COALESCE(v_end_lat, -25.7479);
      v_end_lng := COALESCE(v_end_lng, 28.2293);
    END IF;

    IF v_load_id IS NULL THEN
      RAISE NOTICE '⚠️ No loads found in database. Skipping vehicle %', v_vehicle.fleet_number;
      CONTINUE;
    END IF;

    RAISE NOTICE '📍 Generating tracking for vehicle: % (%)', v_vehicle.fleet_number, v_vehicle.registration;

    -- Generate tracking points for this vehicle
    FOR i IN 0..v_points LOOP
      v_lat := v_start_lat + (v_end_lat - v_start_lat) * (i::NUMERIC / v_points);
      v_lng := v_start_lng + (v_end_lng - v_start_lng) * (i::NUMERIC / v_points);
      v_speed := 60 + (RANDOM() * 40 - 20); -- 40-100 km/h

      INSERT INTO delivery_tracking (
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
      ) VALUES (
        v_load_id,
        v_vehicle.id,
        v_lat,
        v_lng,
        v_speed,
        DEGREES(ATAN2(v_end_lng - v_start_lng, v_end_lat - v_start_lat)),
        500 + RANDOM() * 1000,
        RANDOM() * 10 + 5,
        v_current_time + (i * INTERVAL '1 minute'),
        v_speed > 5,
        'test_data_all_vehicles'
      );

      v_total_points := v_total_points + 1;
    END LOOP;

  END LOOP;

  RAISE NOTICE '✅ Successfully generated tracking data:';
  RAISE NOTICE '   - % vehicles processed', v_total_vehicles;
  RAISE NOTICE '   - % total GPS points created', v_total_points;
END $$;

-- Verify the data for all vehicles
SELECT
  v.fleet_number,
  v.registration,
  COUNT(dt.*) as gps_points,
  MIN(dt.recorded_at) as first_point,
  MAX(dt.recorded_at) as last_point,
  ROUND(AVG(dt.speed)::numeric, 2) as avg_speed_kmh
FROM vehicles v
LEFT JOIN delivery_tracking dt ON dt.vehicle_id = v.id AND dt.data_source = 'test_data_all_vehicles'
WHERE v.active = true
GROUP BY v.id, v.fleet_number, v.registration
ORDER BY gps_points DESC;
