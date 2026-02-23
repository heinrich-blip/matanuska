-- TEMPORARY WORKAROUND: Disable the problematic trigger
-- This allows load assignments to work while you apply the proper fix later

-- Drop the trigger that's causing the FK constraint error
DROP TRIGGER IF EXISTS trigger_sync_load_to_calendar
ON loads;

-- NOTE: This means calendar events will NOT be automatically created when you assign loads
-- You'll need to create calendar events manually or re-apply the proper fix from FIX_FK_CONSTRAINT.sql

-- To verify the trigger is dropped, run:
-- SELECT tgname FROM pg_trigger WHERE tgname = 'trigger_sync_load_to_calendar';
-- (should return 0 rows)
