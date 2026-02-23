-- Generate Sample GPS Tracking Data for Testing
-- Run this to populate delivery_tracking with sample data for a specific load

-- First, let's check if you have any loads with assigned vehicles
SELECT
  l.id as load_id,
  l.load_number,
  l.assigned_vehicle_id,
  v.name as vehicle_name,
  v.wialon_unit_id,
  l.origin_lat,
  l.origin_lng,
  l.destination_lat,
  l.destination_lng
FROM loads l
LEFT JOIN wialon_vehicles v ON l.assigned_vehicle_id = v.id
WHERE l.assigned_vehicle_id IS NOT NULL
  AND l.origin_lat IS NOT NULL
  AND l.destination_lat IS NOT NULL
ORDER BY l.created_at DESC
LIMIT 5;

-- After identifying a load, generate sample tracking points
-- This version AUTOMATICALLY finds the most recent assigned load and generates data

DO $$
DECLARE
  v_load_id UUID;
  v_vehicle_id UUID;
  v_start_lat NUMERIC;
  v_start_lng NUMERIC;
  v_end_lat NUMERIC;
  v_end_lng NUMERIC;
  v_load_number TEXT;
  v_points INT := 50; -- Number of tracking points to generate
  v_current_time TIMESTAMPTZ := NOW() - INTERVAL '2 hours'; -- Start 2 hours ago
  i INT;
  v_lat NUMERIC;
  v_lng NUMERIC;
  v_speed NUMERIC;
BEGIN
  -- Automatically find the most recent load with assigned vehicle and coordinates
  SELECT
    l.id,
    l.assigned_vehicle_id,
    COALESCE(l.origin_lat, -26.2041),
    COALESCE(l.origin_lng, 28.0473),
    COALESCE(l.destination_lat, -33.9249),
    COALESCE(l.destination_lng, 18.4241),
    l.load_number
  INTO
    v_load_id,
    v_vehicle_id,
    v_start_lat,
    v_start_lng,
    v_end_lat,
    v_end_lng,
    v_load_number
  FROM loads l
  WHERE l.assigned_vehicle_id IS NOT NULL
  ORDER BY l.created_at DESC
  LIMIT 1;

  -- Check if we found a suitable load
  IF v_load_id IS NULL THEN
    RAISE EXCEPTION 'No loads found with assigned vehicles. Please assign a vehicle to a load first.';
  END IF;

  RAISE NOTICE 'Using Load: % (ID: %)', v_load_number, v_load_id;
  RAISE NOTICE 'Vehicle ID: %', v_vehicle_id;
  RAISE NOTICE 'Route: (%, %) -> (%, %)', v_start_lat, v_start_lng, v_end_lat, v_end_lng;

  -- Generate tracking points along a linear path
  FOR i IN 0..v_points LOOP
    v_lat := v_start_lat + (v_end_lat - v_start_lat) * (i::NUMERIC / v_points);
    v_lng := v_start_lng + (v_end_lng - v_start_lng) * (i::NUMERIC / v_points);
    v_speed := 60 + (RANDOM() * 40 - 20); -- Random speed 40-100 km/h

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
      v_vehicle_id,
      v_lat,
      v_lng,
      v_speed,
      DEGREES(ATAN2(v_end_lng - v_start_lng, v_end_lat - v_start_lat)), -- Calculate bearing
      500 + RANDOM() * 1000, -- Random altitude 500-1500m
      RANDOM() * 10 + 5, -- Accuracy 5-15m
      v_current_time + (i * INTERVAL '2 minutes'), -- One point every 2 minutes
      v_speed > 5,
      'test_data'
    );
  END LOOP;

  RAISE NOTICE 'Successfully generated % tracking points for load %', v_points + 1, v_load_number;
END $$;

-- Verify the data was inserted
SELECT
  load_id,
  vehicle_id,
  COUNT(*) as point_count,
  MIN(recorded_at) as first_point,
  MAX(recorded_at) as last_point,
  AVG(speed) as avg_speed
FROM delivery_tracking
WHERE data_source = 'test_data'
GROUP BY load_id, vehicle_id
ORDER BY first_point DESC;
