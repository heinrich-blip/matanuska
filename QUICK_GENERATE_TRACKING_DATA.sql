-- Quick Sample Data Generator
-- Run this in Supabase SQL Editor to generate tracking data for your vehicle

DO $$
DECLARE
  v_vehicle_id UUID := '9efcca9d-0347-45c3-af72-29b14763c585'; -- Your vehicle ID
  v_load_id UUID;
  v_start_lat NUMERIC := -26.2041; -- Johannesburg
  v_start_lng NUMERIC := 28.0473;
  v_end_lat NUMERIC := -25.7479; -- Pretoria (shorter route for testing)
  v_end_lng NUMERIC := 28.2293;
  v_points INT := 50;
  v_current_time TIMESTAMPTZ := NOW() - INTERVAL '1 hour'; -- Start 1 hour ago
  i INT;
  v_lat NUMERIC;
  v_lng NUMERIC;
  v_speed NUMERIC;
BEGIN
  -- Find a load for this vehicle (or create a dummy load reference)
  SELECT id INTO v_load_id
  FROM loads
  WHERE assigned_vehicle_id = v_vehicle_id
  ORDER BY created_at DESC
  LIMIT 1;

  -- If no load found, use first available load or create placeholder
  IF v_load_id IS NULL THEN
    SELECT id INTO v_load_id FROM loads ORDER BY created_at DESC LIMIT 1;
  END IF;

  IF v_load_id IS NULL THEN
    RAISE EXCEPTION 'No loads found in database. Please create at least one load first.';
  END IF;

  RAISE NOTICE 'Generating tracking data for vehicle: %', v_vehicle_id;
  RAISE NOTICE 'Using load: %', v_load_id;

  -- Generate tracking points
  FOR i IN 0..v_points LOOP
    v_lat := v_start_lat + (v_end_lat - v_start_lat) * (i::NUMERIC / v_points);
    v_lng := v_start_lng + (v_end_lng - v_start_lng) * (i::NUMERIC / v_points);
    v_speed := 60 + (RANDOM() * 40 - 20);

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
      DEGREES(ATAN2(v_end_lng - v_start_lng, v_end_lat - v_start_lat)),
      500 + RANDOM() * 1000,
      RANDOM() * 10 + 5,
      v_current_time + (i * INTERVAL '1 minute'),
      v_speed > 5,
      'test_data'
    );
  END LOOP;

  RAISE NOTICE '✅ Successfully generated % tracking points', v_points + 1;
END $$;

-- Verify the data
SELECT
  vehicle_id,
  load_id,
  COUNT(*) as points,
  MIN(recorded_at) as first_point,
  MAX(recorded_at) as last_point,
  ROUND(AVG(speed)::numeric, 2) as avg_speed_kmh
FROM delivery_tracking
WHERE vehicle_id = '9efcca9d-0347-45c3-af72-29b14763c585'
  AND data_source = 'test_data'
GROUP BY vehicle_id, load_id;
