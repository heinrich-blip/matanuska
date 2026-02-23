-- Check vehicle mapping between wialon_vehicles and vehicles tables

-- 1. Show all wialon_vehicles with their potential matches
SELECT
  wv.id as wialon_id,
  wv.name as wialon_name,
  wv.wialon_unit_id,
  wv.registration as wialon_registration,
  v.id as vehicle_id,
  v.fleet_number,
  v.wialon_id as vehicle_wialon_id,
  v.registration_number as vehicle_registration,
  CASE
    WHEN v.wialon_id = wv.wialon_unit_id THEN 'Matched by wialon_id'
    WHEN v.registration_number = wv.registration THEN 'Matched by registration'
    WHEN v.fleet_number = SUBSTRING(wv.name FROM '^[0-9]+H') THEN 'Matched by fleet number'
    ELSE 'No match'
  END as match_type
FROM wialon_vehicles wv
LEFT JOIN vehicles v ON (
  v.wialon_id = wv.wialon_unit_id
  OR v.registration_number = wv.registration
  OR v.fleet_number = SUBSTRING(wv.name FROM '^[0-9]+H')
)
ORDER BY wv.created_at DESC
LIMIT 20;

-- 2. Show vehicles that have wialon_id set
SELECT id, fleet_number, registration_number, wialon_id
FROM vehicles
WHERE wialon_id IS NOT NULL
ORDER BY created_at DESC;

-- 3. Show vehicles without wialon_id
SELECT id, fleet_number, registration_number, wialon_id
FROM vehicles
WHERE wialon_id IS NULL
ORDER BY created_at DESC
LIMIT 10;

-- 4. Show loads with their vehicle assignments
SELECT
  l.load_number,
  l.status,
  wv.name as assigned_wialon_vehicle,
  wv.wialon_unit_id,
  wv.registration as wialon_reg,
  v.fleet_number as mapped_fleet,
  v.id as mapped_vehicle_id
FROM loads l
INNER JOIN wialon_vehicles wv ON l.assigned_vehicle_id = wv.id
LEFT JOIN vehicles v ON v.wialon_id = wv.wialon_unit_id
WHERE l.assigned_vehicle_id IS NOT NULL
ORDER BY l.created_at DESC
LIMIT 10;
