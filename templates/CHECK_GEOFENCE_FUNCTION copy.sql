-- Check current implementation of check_geofence_entry function
SELECT prosrc 
FROM pg_proc 
WHERE proname = 'check_geofence_entry';
