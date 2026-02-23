-- Check if driver_candidates table exists and has data
SELECT COUNT(*) as total_candidates FROM driver_candidates;

-- Show all candidates
SELECT id, candidate_number, first_name, last_name, status, created_at 
FROM driver_candidates 
ORDER BY created_at DESC 
LIMIT 10;
