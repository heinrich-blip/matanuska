-- QUICK FIX: Apply this immediately in Supabase SQL Editor
-- This will stop the calendar_events FK constraint error

-- Step 1: Add FK constraint to loads table (prevents bad data from entering)
DO $$
BEGIN
  -- Clean up any invalid assigned_vehicle_id first
  UPDATE loads
  SET assigned_vehicle_id = NULL
  WHERE assigned_vehicle_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM wialon_vehicles WHERE id = loads.assigned_vehicle_id
    );

  -- Add FK constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'loads_assigned_vehicle_id_fkey'
  ) THEN
    ALTER TABLE loads
      ADD CONSTRAINT loads_assigned_vehicle_id_fkey
      FOREIGN KEY (assigned_vehicle_id)
      REFERENCES wialon_vehicles(id)
      ON DELETE SET NULL;
    RAISE NOTICE 'Added FK constraint to loads.assigned_vehicle_id';
  ELSE
    RAISE NOTICE 'FK constraint already exists';
  END IF;
END $$;

-- Step 2: Update the trigger function to validate vehicle IDs
CREATE OR REPLACE FUNCTION sync_load_to_calendar_events()
RETURNS TRIGGER AS $$
DECLARE
  v_pickup_event_id UUID;
  v_delivery_event_id UUID;
  v_validated_vehicle_id UUID;
BEGIN
  -- Validate assigned_vehicle_id exists in wialon_vehicles
  IF NEW.assigned_vehicle_id IS NOT NULL THEN
    SELECT id INTO v_validated_vehicle_id
    FROM wialon_vehicles
    WHERE id = NEW.assigned_vehicle_id;

    IF v_validated_vehicle_id IS NULL THEN
      v_validated_vehicle_id := NULL;
      RAISE NOTICE 'Invalid assigned_vehicle_id %, setting to NULL', NEW.assigned_vehicle_id;
    END IF;
  ELSE
    v_validated_vehicle_id := NULL;
  END IF;

  -- Pickup event handling
  IF NEW.pickup_datetime IS NOT NULL OR NEW.expected_arrival_at_pickup IS NOT NULL THEN
    SELECT id INTO v_pickup_event_id
    FROM calendar_events
    WHERE load_id = NEW.id AND event_type = 'pickup'
    LIMIT 1;

    IF v_pickup_event_id IS NOT NULL THEN
      UPDATE calendar_events
      SET
        start_time = COALESCE(NEW.expected_arrival_at_pickup, NEW.pickup_datetime),
        end_time = COALESCE(NEW.expected_departure_from_pickup, NEW.pickup_datetime + INTERVAL '2 hours'),
        assigned_vehicle_id = v_validated_vehicle_id,
        notes = CONCAT('Load: ', NEW.load_number, ' | Origin: ', NEW.origin, ' | Customer: ', COALESCE(NEW.customer_name, 'N/A'), ' | Weight: ', NEW.weight_kg, 'kg', CASE WHEN NEW.notes IS NOT NULL THEN ' | Notes: ' || NEW.notes ELSE '' END),
        updated_at = NOW()
      WHERE id = v_pickup_event_id;
    ELSE
      INSERT INTO calendar_events (load_id, event_type, start_time, end_time, assigned_vehicle_id, notes)
      VALUES (NEW.id, 'pickup', COALESCE(NEW.expected_arrival_at_pickup, NEW.pickup_datetime), COALESCE(NEW.expected_departure_from_pickup, NEW.pickup_datetime + INTERVAL '2 hours'), v_validated_vehicle_id, CONCAT('Load: ', NEW.load_number, ' | Origin: ', NEW.origin, ' | Customer: ', COALESCE(NEW.customer_name, 'N/A'), ' | Weight: ', NEW.weight_kg, 'kg', CASE WHEN NEW.notes IS NOT NULL THEN ' | Notes: ' || NEW.notes ELSE '' END));
    END IF;
  END IF;

  -- Delivery event handling
  IF NEW.delivery_datetime IS NOT NULL OR NEW.expected_arrival_at_delivery IS NOT NULL THEN
    SELECT id INTO v_delivery_event_id
    FROM calendar_events
    WHERE load_id = NEW.id AND event_type = 'delivery'
    LIMIT 1;

    IF v_delivery_event_id IS NOT NULL THEN
      UPDATE calendar_events
      SET
        start_time = COALESCE(NEW.expected_arrival_at_delivery, NEW.delivery_datetime),
        end_time = COALESCE(NEW.expected_departure_from_delivery, NEW.delivery_datetime + INTERVAL '2 hours'),
        assigned_vehicle_id = v_validated_vehicle_id,
        notes = CONCAT('Load: ', NEW.load_number, ' | Destination: ', NEW.destination, ' | Customer: ', COALESCE(NEW.customer_name, 'N/A'), ' | Weight: ', NEW.weight_kg, 'kg', CASE WHEN NEW.notes IS NOT NULL THEN ' | Notes: ' || NEW.notes ELSE '' END),
        updated_at = NOW()
      WHERE id = v_delivery_event_id;
    ELSE
      INSERT INTO calendar_events (load_id, event_type, start_time, end_time, assigned_vehicle_id, notes)
      VALUES (NEW.id, 'delivery', COALESCE(NEW.expected_arrival_at_delivery, NEW.delivery_datetime), COALESCE(NEW.expected_departure_from_delivery, NEW.delivery_datetime + INTERVAL '2 hours'), v_validated_vehicle_id, CONCAT('Load: ', NEW.load_number, ' | Destination: ', NEW.destination, ' | Customer: ', COALESCE(NEW.customer_name, 'N/A'), ' | Weight: ', NEW.weight_kg, 'kg', CASE WHEN NEW.notes IS NOT NULL THEN ' | Notes: ' || NEW.notes ELSE '' END));
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Clean up any existing invalid calendar_events
UPDATE calendar_events
SET assigned_vehicle_id = NULL
WHERE assigned_vehicle_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM wialon_vehicles WHERE id = calendar_events.assigned_vehicle_id
  );

-- Verification
DO $$
DECLARE
  v_loads_count INTEGER;
  v_events_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_loads_count
  FROM loads
  WHERE assigned_vehicle_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM wialon_vehicles WHERE id = loads.assigned_vehicle_id);

  SELECT COUNT(*) INTO v_events_count
  FROM calendar_events
  WHERE assigned_vehicle_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM wialon_vehicles WHERE id = calendar_events.assigned_vehicle_id);

  RAISE NOTICE 'Quick fix completed!';
  RAISE NOTICE 'Invalid loads: % (should be 0)', v_loads_count;
  RAISE NOTICE 'Invalid calendar_events: % (should be 0)', v_events_count;
END $$;
