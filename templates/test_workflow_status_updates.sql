-- Test Load Status Workflow
-- Run these queries in Supabase SQL Editor to test status progression

-- 1. First, find your test load ID
SELECT id, load_number, status, customer_name, origin, destination
FROM public.loads
WHERE status IN ('pending', 'assigned', 'arrived_at_loading')
ORDER BY created_at DESC
LIMIT 5;

-- Copy a load ID from above results and use it below
-- Replace 'YOUR-LOAD-ID-HERE' with actual load ID

-- 2. Test Status Progression (run these one at a time)

-- Step 1: Arrived at Loading Point
UPDATE public.loads
SET 
  status = 'arrived_at_loading',
  arrived_at_pickup = NOW(),
  updated_at = NOW()
WHERE id = 'YOUR-LOAD-ID-HERE';

-- Step 2: Start Loading
UPDATE public.loads
SET 
  status = 'loading',
  loading_started_at = NOW(),
  updated_at = NOW()
WHERE id = 'YOUR-LOAD-ID-HERE';

-- Step 3: Loading Completed
UPDATE public.loads
SET 
  status = 'loading_completed',
  loading_completed_at = NOW(),
  actual_pickup_datetime = NOW(),
  updated_at = NOW()
WHERE id = 'YOUR-LOAD-ID-HERE';

-- Step 4: In Transit (Departed)
UPDATE public.loads
SET 
  status = 'in_transit',
  departure_time = NOW(),
  updated_at = NOW()
WHERE id = 'YOUR-LOAD-ID-HERE';

-- Step 5: Arrived at Offloading Point
UPDATE public.loads
SET 
  status = 'arrived_at_delivery',
  arrived_at_delivery = NOW(),
  updated_at = NOW()
WHERE id = 'YOUR-LOAD-ID-HERE';

-- Step 6: Start Offloading
UPDATE public.loads
SET 
  status = 'offloading',
  offloading_started_at = NOW(),
  updated_at = NOW()
WHERE id = 'YOUR-LOAD-ID-HERE';

-- Step 7: Offloading Completed
UPDATE public.loads
SET 
  status = 'offloading_completed',
  offloading_completed_at = NOW(),
  actual_delivery_datetime = NOW(),
  updated_at = NOW()
WHERE id = 'YOUR-LOAD-ID-HERE';

-- Step 8: Delivered
UPDATE public.loads
SET 
  status = 'delivered',
  delivered_at = NOW(),
  updated_at = NOW()
WHERE id = 'YOUR-LOAD-ID-HERE';

-- Step 9: Completed
UPDATE public.loads
SET 
  status = 'completed',
  completed_at = NOW(),
  updated_at = NOW()
WHERE id = 'YOUR-LOAD-ID-HERE';

-- 3. Check all timestamps after completion
SELECT 
  load_number,
  status,
  created_at,
  assigned_at,
  arrived_at_pickup,
  loading_started_at,
  loading_completed_at,
  departure_time,
  arrived_at_delivery,
  offloading_started_at,
  offloading_completed_at,
  delivered_at,
  completed_at,
  -- Calculate durations
  EXTRACT(EPOCH FROM (loading_completed_at - loading_started_at)) / 60 AS loading_minutes,
  EXTRACT(EPOCH FROM (arrived_at_delivery - departure_time)) / 60 AS transit_minutes,
  EXTRACT(EPOCH FROM (offloading_completed_at - offloading_started_at)) / 60 AS offloading_minutes,
  EXTRACT(EPOCH FROM (completed_at - created_at)) / 60 AS total_minutes
FROM public.loads
WHERE id = 'YOUR-LOAD-ID-HERE';

-- 4. Check workflow analytics view
SELECT *
FROM load_workflow_analytics
WHERE id = 'YOUR-LOAD-ID-HERE';

-- 5. Test duration calculation functions
SELECT 
  calculate_loading_duration('YOUR-LOAD-ID-HERE') AS loading_duration,
  calculate_offloading_duration('YOUR-LOAD-ID-HERE') AS offloading_duration,
  calculate_transit_time('YOUR-LOAD-ID-HERE') AS transit_duration;

-- 6. Reset a load for re-testing (optional)
UPDATE public.loads
SET 
  status = 'assigned',
  arrived_at_pickup = NULL,
  loading_started_at = NULL,
  loading_completed_at = NULL,
  departure_time = NULL,
  arrived_at_delivery = NULL,
  offloading_started_at = NULL,
  offloading_completed_at = NULL,
  delivered_at = NULL,
  completed_at = NULL,
  updated_at = NOW()
WHERE id = 'YOUR-LOAD-ID-HERE';

-- 7. Simulate realistic timing (run each block with delay)
-- This simulates a realistic load journey with proper time gaps

-- Arrived at pickup (vehicle arrives)
UPDATE public.loads
SET 
  status = 'arrived_at_loading',
  arrived_at_pickup = NOW(),
  updated_at = NOW()
WHERE id = 'YOUR-LOAD-ID-HERE';

-- Start loading after 10 minutes
UPDATE public.loads
SET 
  status = 'loading',
  loading_started_at = NOW() + INTERVAL '10 minutes',
  updated_at = NOW()
WHERE id = 'YOUR-LOAD-ID-HERE';

-- Complete loading after 45 minutes
UPDATE public.loads
SET 
  status = 'loading_completed',
  loading_completed_at = NOW() + INTERVAL '55 minutes',
  actual_pickup_datetime = NOW() + INTERVAL '55 minutes',
  updated_at = NOW()
WHERE id = 'YOUR-LOAD-ID-HERE';

-- Depart (in transit) after 1 hour
UPDATE public.loads
SET 
  status = 'in_transit',
  departure_time = NOW() + INTERVAL '1 hour',
  updated_at = NOW()
WHERE id = 'YOUR-LOAD-ID-HERE';

-- Arrive at delivery after 3 hours transit
UPDATE public.loads
SET 
  status = 'arrived_at_delivery',
  arrived_at_delivery = NOW() + INTERVAL '4 hours',
  updated_at = NOW()
WHERE id = 'YOUR-LOAD-ID-HERE';

-- Start offloading after 15 minutes wait
UPDATE public.loads
SET 
  status = 'offloading',
  offloading_started_at = NOW() + INTERVAL '4 hours 15 minutes',
  updated_at = NOW()
WHERE id = 'YOUR-LOAD-ID-HERE';

-- Complete offloading after 30 minutes
UPDATE public.loads
SET 
  status = 'offloading_completed',
  offloading_completed_at = NOW() + INTERVAL '4 hours 45 minutes',
  actual_delivery_datetime = NOW() + INTERVAL '4 hours 45 minutes',
  updated_at = NOW()
WHERE id = 'YOUR-LOAD-ID-HERE';

-- Mark as delivered
UPDATE public.loads
SET 
  status = 'delivered',
  delivered_at = NOW() + INTERVAL '4 hours 50 minutes',
  updated_at = NOW()
WHERE id = 'YOUR-LOAD-ID-HERE';

-- Mark as completed
UPDATE public.loads
SET 
  status = 'completed',
  completed_at = NOW() + INTERVAL '5 hours',
  updated_at = NOW()
WHERE id = 'YOUR-LOAD-ID-HERE';
