-- ============================================================================
-- FIX LOADS FOREIGN KEY CONSTRAINT
-- This script fixes the assigned_vehicle_id FK to point to wialon_vehicles
-- Run this AFTER creating the wialon_vehicles table
-- ============================================================================

-- Step 1: Drop the existing wrong FK constraint if it exists
DO $
$
BEGIN
  IF EXISTS (
    SELECT 1
  FROM information_schema.table_constraints
  WHERE constraint_name = 'loads_assigned_vehicle_id_fkey'
    AND table_name = 'loads'
  ) THEN
  ALTER TABLE public.loads DROP CONSTRAINT loads_assigned_vehicle_id_fkey;
  RAISE NOTICE 'Dropped existing FK constraint loads_assigned_vehicle_id_fkey';
END
IF;
END $$;

-- Step 2: Drop any other FK constraint on assigned_vehicle_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
  FROM information_schema.table_constraints
  WHERE constraint_name = 'fk_assigned_vehicle'
    AND table_name = 'loads'
  ) THEN
  ALTER TABLE public.loads DROP CONSTRAINT fk_assigned_vehicle;
  RAISE NOTICE 'Dropped existing FK constraint fk_assigned_vehicle';
END
IF;
END $$;

-- Step 3: Check for any other FK constraints on assigned_vehicle_id column
DO $$
DECLARE
  constraint_rec RECORD;
BEGIN
  FOR constraint_rec IN
  SELECT constraint_name
  FROM information_schema.constraint_column_usage
  WHERE table_name = 'loads'
    AND column_name = 'assigned_vehicle_id'
    AND constraint_name LIKE '%fkey%'
  LOOP
  EXECUTE 'ALTER TABLE public.loads DROP CONSTRAINT '
  || constraint_rec.constraint_name;
RAISE NOTICE 'Dropped FK constraint: %', constraint_rec.constraint_name;
END LOOP;
END $$;

-- Step 4: Set any existing assigned_vehicle_id values to NULL
-- (since they reference the wrong table)
UPDATE public.loads
SET assigned_vehicle_id = NULL
WHERE assigned_vehicle_id IS NOT NULL;

-- Step 5: Add the correct FK constraint to wialon_vehicles
ALTER TABLE public.loads
  ADD CONSTRAINT fk_assigned_vehicle
  FOREIGN KEY (assigned_vehicle_id)
  REFERENCES public.wialon_vehicles(id)
  ON DELETE SET NULL;

-- Verification
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
  FROM information_schema.table_constraints
  WHERE constraint_name = 'fk_assigned_vehicle'
    AND table_name = 'loads'
  ) THEN
    RAISE NOTICE '✅ FK constraint successfully created: fk_assigned_vehicle -> wialon_vehicles(id)';
  ELSE
    RAISE EXCEPTION '❌ Failed to create FK constraint';
END
IF;
END $$;
