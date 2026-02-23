-- Check which tables have vehicle data
SELECT 'vehicles table' as source, COUNT(*) as count FROM vehicles WHERE active = true;
SELECT 'wialon_vehicles table' as source, COUNT(*) as count FROM wialon_vehicles;
