-- Fix check_geofence_entry to handle vehicle table mapping
-- The function receives vehicles.id but needs to find loads via wialon_vehicles

-- Drop existing function first (can't change return type with CREATE OR REPLACE)
DROP FUNCTION IF EXISTS check_geofence_entry
(UUID, NUMERIC, NUMERIC);

CREATE OR REPLACE FUNCTION check_geofence_entry
(
  p_vehicle_id UUID,
  p_latitude NUMERIC,
  p_longitude NUMERIC
) RETURNS BOOLEAN AS $$
DECLARE
  v_zone RECORD;
  v_load_id UUID;
  v_existing_event UUID;
BEGIN
  -- Find the load_id by mapping vehicles -> wialon_vehicles -> loads
  -- This handles the case where delivery_tracking uses vehicles table
  -- but loads references wialon_vehicles table
  SELECT l.id
  INTO v_load_id
  FROM loads l
    INNER JOIN wialon_vehicles wv ON l.assigned_vehicle_id = wv.id
    INNER JOIN vehicles v ON (
    v.wialon_id = wv.wialon_unit_id
      OR v.registration_number = wv.registration
      OR v.fleet_number = SUBSTRING(wv.name FROM '^[0-9]+H')
  )
  WHERE v.id = p_vehicle_id
    AND l.status IN ('in_transit', 'assigned')
  ORDER BY l.created_at DESC
  LIMIT 1;

  -- If no load found, skip geofence check (test data scenario)
  IF v_load_id
  IS NULL THEN
  RETURN FALSE;
END
IF;

  -- Check if vehicle entered any geofence zone using radius-based detection
  FOR v_zone IN
SELECT id, name, center_lat, center_lng, radius
FROM geofences
WHERE is_active = true
LOOP
-- Calculate distance using simple formula (good enough for small distances)
-- Distance in meters between two lat/lng points
IF (
      6371000 * ACOS(
        COS(RADIANS(p_latitude)) * COS(RADIANS(v_zone.center_lat)) *
        COS(RADIANS(v_zone.center_lng) - RADIANS(p_longitude)) +
        SIN(RADIANS(p_latitude)) * SIN(RADIANS(v_zone.center_lat))
      )
    ) <= v_zone.radius THEN
-- Vehicle is inside zone - check if this is a new entry
SELECT id
INTO v_existing_event
FROM geofence_events
WHERE vehicle_id = p_vehicle_id
  AND geofence_zone_id = v_zone.id
  AND load_id = v_load_id
  AND event_type = 'entry'
  AND NOT EXISTS (
          SELECT 1
  FROM geofence_events ge2
  WHERE ge2.vehicle_id = p_vehicle_id
    AND ge2.geofence_zone_id = v_zone.id
    AND ge2.load_id = v_load_id
    AND ge2.event_type = 'exit'
    AND ge2.event_timestamp > geofence_events.event_timestamp
        )
LIMIT 1;

-- Only insert if no existing active entry
IF v_existing_event IS NULL THEN
INSERT INTO public.geofence_events
  (
  geofence_zone_id,
  vehicle_id,
  load_id,
  event_type,
  latitude,
  longitude
  )
VALUES
  (
    v_zone.id,
    p_vehicle_id,
    v_load_id, -- Now guaranteed to be NOT NULL
    'entry',
    p_latitude,
    p_longitude
        );

RAISE NOTICE 'Vehicle entered geofence: %', v_zone.name;
END
IF;
    END
IF;
  END LOOP;

RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
