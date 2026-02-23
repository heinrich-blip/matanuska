-- Debug queries to check dropdown data availability
-- Run these in Supabase SQL Editor to diagnose dropdown issues

-- 1. Check Clients/Customers table
SELECT
  'clients' as table_name,
  COUNT(*) as total_records,
  COUNT(*) FILTER
(WHERE active = true) as active_records,
  COUNT
(*) FILTER
(WHERE active = false) as inactive_records
FROM clients;



[
  {
    "table_name": "clients",
    "total_records": 30,
    "active_records": 30,
    "inactive_records": 0
  }
]

-- 2. List all clients
SELECT id, name, active, created_at, updated_at
FROM clients
ORDER BY name
LIMIT 20;
[
  {
    "id": "68671a47-6dca-4689-a872-821db57f76c2",
    "name": "APL",
    "active": true,
    "created_at": "2025-10-28 03:01:52.880379+00",
    "updated_at": "2025-10-28 03:01:52.880379+00"
  },
  {
    "id": "7636080f-317c-472f-8f93-70c37c92feaf",
    "name": "Aspen",
    "active": true,
    "created_at": "2025-10-28 03:01:52.880379+00",
    "updated_at": "2025-10-28 03:01:52.880379+00"
  },
  {
    "id": "14474da2-6247-4799-a816-6679be9395d5",
    "name": "Aspen Logistics",
    "active": true,
    "created_at": "2025-10-28 03:01:52.880379+00",
    "updated_at": "2025-10-28 03:01:52.880379+00"
  },
  {
    "id": "3cc305e8-1189-4686-8699-284d5c39bc2a",
    "name": "Bulawayo Depot",
    "active": true,
    "created_at": "2025-10-28 03:01:52.880379+00",
    "updated_at": "2025-10-28 03:01:52.880379+00"
  },
  {
    "id": "f58c5723-cce3-45c6-ad4b-cc17715e77fb",
    "name": "Burma Valley",
    "active": true,
    "created_at": "2025-10-28 03:01:52.880379+00",
    "updated_at": "2025-10-28 03:01:52.880379+00"
  },
  {
    "id": "b41d0f66-6759-4a0d-81a7-d6568f1f4002",
    "name": "C. Steinweg Bridge",
    "active": true,
    "created_at": "2025-10-28 03:01:52.880379+00",
    "updated_at": "2025-10-28 03:01:52.880379+00"
  },
  {
    "id": "ccdae1e1-c85f-429d-8a31-78ae05d0ae50",
    "name": "Chipinge Banana Company",
    "active": true,
    "created_at": "2025-10-28 03:01:52.880379+00",
    "updated_at": "2025-10-28 03:01:52.880379+00"
  },
  {
    "id": "be4be7c4-98aa-4e07-8fad-9dea4aec0e83",
    "name": "Crake Valley",
    "active": true,
    "created_at": "2025-10-28 03:01:52.880379+00",
    "updated_at": "2025-10-28 03:01:52.880379+00"
  },
  {
    "id": "28ae7738-3fad-4432-ac52-da05ff3134c1",
    "name": "Crystal Candy",
    "active": true,
    "created_at": "2025-10-28 03:01:52.880379+00",
    "updated_at": "2025-10-28 03:01:52.880379+00"
  },
  {
    "id": "0e758d62-8238-4bfd-8988-126432584488",
    "name": "Deep Catch",
    "active": true,
    "created_at": "2025-10-28 03:01:52.880379+00",
    "updated_at": "2025-10-28 03:01:52.880379+00"
  },
  {
    "id": "0bd5c238-fdd6-456b-863f-a523c8bc8394",
    "name": "Dp World",
    "active": true,
    "created_at": "2025-10-28 03:01:52.880379+00",
    "updated_at": "2025-10-28 03:01:52.880379+00"
  },
  {
    "id": "b60aa8f0-6cca-4b46-a3a4-f6079fc65da0",
    "name": "FrightCO",
    "active": true,
    "created_at": "2025-10-28 03:01:52.880379+00",
    "updated_at": "2025-10-28 03:01:52.880379+00"
  },
  {
    "id": "da72f67c-b34c-46e1-b645-94f883567e4a",
    "name": "FX Logistics",
    "active": true,
    "created_at": "2025-10-28 03:01:52.880379+00",
    "updated_at": "2025-10-28 03:01:52.880379+00"
  },
  {
    "id": "1dcb15a8-b4d1-4cc9-aabc-986876188f2d",
    "name": "Gundo Frieght",
    "active": true,
    "created_at": "2025-10-28 03:01:52.880379+00",
    "updated_at": "2025-10-28 03:01:52.880379+00"
  },
  {
    "id": "b949ae6a-5fbe-40f0-a5c2-dab261087487",
    "name": "Healthcare Distribution Solutions",
    "active": true,
    "created_at": "2025-10-28 03:01:52.880379+00",
    "updated_at": "2025-10-28 03:01:52.880379+00"
  },
  {
    "id": "d3e8ed94-01af-4a2a-a1a9-d43c284ae932",
    "name": "HFR",
    "active": true,
    "created_at": "2025-10-28 03:01:52.880379+00",
    "updated_at": "2025-10-28 03:01:52.880379+00"
  },
  {
    "id": "35f98ee1-9b37-4c12-8270-a5928e20fdc0",
    "name": "Jacksons Transport",
    "active": true,
    "created_at": "2025-10-28 03:01:52.880379+00",
    "updated_at": "2025-10-28 03:01:52.880379+00"
  },
  {
    "id": "26d752b9-458f-4136-ad2a-e38a782d6561",
    "name": "Kroots",
    "active": true,
    "created_at": "2025-10-28 03:01:52.880379+00",
    "updated_at": "2025-10-28 03:01:52.880379+00"
  },
  {
    "id": "418c1d28-0702-4ab7-8945-e29cd8a536e6",
    "name": "Lloyds",
    "active": true,
    "created_at": "2025-10-28 03:01:52.880379+00",
    "updated_at": "2025-10-28 03:01:52.880379+00"
  },
  {
    "id": "d97ba69f-fd72-4e89-b982-58c20f118554",
    "name": "Marketing",
    "active": true,
    "created_at": "2025-10-28 03:01:52.880379+00",
    "updated_at": "2025-10-28 03:01:52.880379+00"
  }
]
-- 3. Check Wialon Vehicles (for trips and loads)
SELECT
  'wialon_vehicles' as table_name
,
  COUNT
(*) as total_records
FROM wialon_vehicles;
[
  {
    "table_name": "wialon_vehicles",
    "total_records": 12
  }
]
-- 4. List wialon vehicles
SELECT id, name, registration, fleet_number, make, model, vehicle_type, wialon_unit_id
FROM wialon_vehicles
ORDER BY name
LIMIT 20;
[
  {
    "id": "bded03ee-491f-421e-b0d8-fdeb27d2b57f",
    "name": "21H - ADS 4865",
    "registration": "ADS 4865",
    "fleet_number": null,
    "make": null,
    "model": null,
    "vehicle_type": null,
    "wialon_unit_id": 600665449
  },
  {
    "id": "f5a12fbe-366b-40ba-9021-18d162006e24",
    "name": "22H - AGZ 3812 (ADS 4866)",
    "registration": "AGZ 3812",
    "fleet_number": null,
    "make": null,
    "model": null,
    "vehicle_type": null,
    "wialon_unit_id": 600702514
  },
  {
    "id": "1918691b-e494-4a35-a60c-f8a83629a7a9",
    "name": "23H - AFQ 1324 (Int Sim)",
    "registration": "AFQ 1324",
    "fleet_number": null,
    "make": null,
    "model": null,
    "vehicle_type": null,
    "wialon_unit_id": 600590053
  },
  {
    "id": "af704ac8-ef1c-4d35-884f-c40c336de750",
    "name": "24H - AFQ 1325 (Int Sim)",
    "registration": "AFQ 1325",
    "fleet_number": null,
    "make": null,
    "model": null,
    "vehicle_type": null,
    "wialon_unit_id": 24979429
  },
  {
    "id": "f14ba07f-cff5-4e34-946d-d8df50ebe8f4",
    "name": "26H - AFQ 1327 (Int Sim)",
    "registration": "AFQ 1327",
    "fleet_number": null,
    "make": null,
    "model": null,
    "vehicle_type": null,
    "wialon_unit_id": 600541672
  },
  {
    "id": "9efcca9d-0347-45c3-af72-29b14763c585",
    "name": "28H - AFQ 1329 (Int Sim)",
    "registration": "AFQ 1329",
    "fleet_number": null,
    "make": null,
    "model": null,
    "vehicle_type": null,
    "wialon_unit_id": 600610518
  },
  {
    "id": "7f890cae-72f8-4b7b-bdca-e5ee72d8b192",
    "name": "29H - AGJ 3466",
    "registration": "AGJ 3466",
    "fleet_number": null,
    "make": null,
    "model": null,
    "vehicle_type": null,
    "wialon_unit_id": 600695231
  },
  {
    "id": "2cacb433-634c-40c4-aca1-55cda76aa57d",
    "name": "30H - AGL 4216",
    "registration": "AGL 4216",
    "fleet_number": null,
    "make": null,
    "model": null,
    "vehicle_type": null,
    "wialon_unit_id": 600614258
  },
  {
    "id": "39e204d6-2f20-4f29-b934-cf878a199639",
    "name": "31H - AGZ 1963 (Int sim)",
    "registration": "AGZ 1963",
    "fleet_number": null,
    "make": null,
    "model": null,
    "vehicle_type": null,
    "wialon_unit_id": 600672382
  },
  {
    "id": "29c42a5c-9800-44b6-b279-71e11f0ffe6e",
    "name": "32H - JF964 FS (Int sim)",
    "registration": "JF964 FS",
    "fleet_number": null,
    "make": null,
    "model": null,
    "vehicle_type": null,
    "wialon_unit_id": 600754126
  },
  {
    "id": "bf7194a7-2c42-4403-b133-ac243486d781",
    "name": "33H - JFK 963 FS (Int sim)",
    "registration": "JFK 963 FS",
    "fleet_number": null,
    "make": null,
    "model": null,
    "vehicle_type": null,
    "wialon_unit_id": 600769948
  },
  {
    "id": "6afe1b13-4f0c-428e-9195-26bdc2600566",
    "name": "BVTR 25 - DEMO TO BE RETURNED",
    "registration": "BVTR 25",
    "fleet_number": null,
    "make": null,
    "model": null,
    "vehicle_type": null,
    "wialon_unit_id": 600614226
  }
]
-- 5. Check generic Vehicles table (old system)
SELECT
  'vehicles' as table_name
,
  COUNT
(*) as total_records
FROM vehicles;
[
  {
    "table_name": "vehicles",
    "total_records": 18
  }
]
-- 6. Check Users (for driver selection)
SELECT
  'users' as table_name,
  COUNT(*) as total_records,
  COUNT(*) FILTER
(WHERE status = 'Active') as active_users
FROM users;
[
  {
    "table_name": "users",
    "total_records": 22,
    "active_users": 22
  }
]
-- 7. List active users with roles
SELECT u.user_id, u.name, u.username, u.status, r.role_name
FROM users u
  LEFT JOIN roles r ON u.role_id = r.role_id
WHERE u.status = 'Active'
ORDER BY u.name
LIMIT 20;
[
  {
    "user_id": 2,
    "name": "Adrian Moyo",
    "username": "AdrianMoyo",
    "status": "Active",
    "role_name": "Operator"
  },
  {
    "user_id": 20,
    "name": "Alec Maocha",
    "username": "AlecMaocha",
    "status": "Active",
    "role_name": "Employee"
  },
  {
    "user_id": 5,
    "name": "Biggie Mugwa",
    "username": "BiggieMugwa",
    "status": "Active",
    "role_name": "Operator"
  },
  {
    "user_id": 10,
    "name": "Bradley Milner",
    "username": "Bradley",
    "status": "Active",
    "role_name": "Technician"
  },
  {
    "user_id": 22,
    "name": "Cain Jeche",
    "username": "CainJeche",
    "status": "Active",
    "role_name": "Sub Admin"
  },
  {
    "user_id": 15,
    "name": "Canaan Chipfurutse",
    "username": "CanaanChipfurutse",
    "status": "Active",
    "role_name": "Operator"
  },
  {
    "user_id": 7,
    "name": "Decide Murahwa",
    "username": "DecideMurahwa",
    "status": "Active",
    "role_name": "Operator"
  },
  {
    "user_id": 13,
    "name": "Doctor Kondwani",
    "username": "DoctorKondwani",
    "status": "Active",
    "role_name": "Operator"
  },
  {
    "user_id": 18,
    "name": "Enock Mukonyerwa",
    "username": "EnockMukonyerwa",
    "status": "Active",
    "role_name": "Operator"
  },
  {
    "user_id": 1,
    "name": "Hein Nel",
    "username": "HeinNel",
    "status": "Active",
    "role_name": "Operator"
  },
  {
    "user_id": 16,
    "name": "Jonathan Bepete",
    "username": "JonathanBepete",
    "status": "Active",
    "role_name": "Operator"
  },
  {
    "user_id": 9,
    "name": "Joshua",
    "username": "Joshua",
    "status": "Active",
    "role_name": "Operator"
  },
  {
    "user_id": 12,
    "name": "Kenneth Rukweza",
    "username": "Kenneth",
    "status": "Active",
    "role_name": "Technician"
  },
  {
    "user_id": 19,
    "name": "Lovemore Qochiwe",
    "username": "LovemoreQochiwe",
    "status": "Active",
    "role_name": "Operator"
  },
  {
    "user_id": 4,
    "name": "Luckson Tanyanyiwa",
    "username": "LucksonTanyanyiwa",
    "status": "Active",
    "role_name": "Operator"
  },
  {
    "user_id": 21,
    "name": "Paul Mwanyadza",
    "username": "PaulMwanyadza",
    "status": "Active",
    "role_name": "Technician"
  },
  {
    "user_id": 17,
    "name": "Peter Farai",
    "username": "PeterFarai",
    "status": "Active",
    "role_name": "Operator"
  },
  {
    "user_id": 3,
    "name": "Phillimon Kwarire",
    "username": "PhillimonKwarire",
    "status": "Active",
    "role_name": "Operator"
  },
  {
    "user_id": 14,
    "name": "Taurayi Vherenaisi",
    "username": "TaurayiVherenaisi",
    "status": "Active",
    "role_name": "Operator"
  },
  {
    "user_id": 6,
    "name": "Wellington Musumbu",
    "username": "WellingtonMusumbu",
    "status": "Active",
    "role_name": "Operator"
  }
]
-- 8. Check if Driver role exists
SELECT role_id
, role_name
FROM roles
WHERE role_name
ILIKE '%driver%';

-- 9. Check Trips table structure and data
SELECT
  'trips' as table_name,
  COUNT(*) as total_records,
  COUNT(*) FILTER
(WHERE status = 'active') as active_trips,
  COUNT
(*) FILTER
(WHERE status = 'completed') as completed_trips,
  COUNT
(*) FILTER
(WHERE vehicle_id IS NOT NULL) as trips_with_vehicle,
  COUNT
(*) FILTER
(WHERE client_name IS NOT NULL) as trips_with_client,
  COUNT
(*) FILTER
(WHERE driver_name IS NOT NULL) as trips_with_driver
FROM trips;
[
  {
    "table_name": "trips",
    "total_records": 0,
    "active_trips": 0,
    "completed_trips": 0,
    "trips_with_vehicle": 0,
    "trips_with_client": 0,
    "trips_with_driver": 0
  }
]
-- 10. Check Loads table structure and data
SELECT
  'loads' as table_name,
  COUNT(*) as total_records,
  COUNT(*) FILTER
(WHERE status = 'pending') as pending_loads,
  COUNT
(*) FILTER
(WHERE status = 'assigned') as assigned_loads,
  COUNT
(*) FILTER
(WHERE status = 'in_transit') as in_transit_loads,
  COUNT
(*) FILTER
(WHERE status = 'delivered') as delivered_loads,
  COUNT
(*) FILTER
(WHERE assigned_vehicle_id IS NOT NULL) as loads_with_vehicle,
  COUNT
(*) FILTER
(WHERE customer_name IS NOT NULL) as loads_with_customer
FROM loads;
[
  {
    "table_name": "loads",
    "total_records": 37,
    "pending_loads": 18,
    "assigned_loads": 0,
    "in_transit_loads": 3,
    "delivered_loads": 0,
    "loads_with_vehicle": 3,
    "loads_with_customer": 37
  }
]
-- 11. Sample trip data (first 5)
SELECT trip_number, vehicle_id, client_name, driver_name, load_type, status, revenue_currency
FROM trips
ORDER BY created_at DESC
LIMIT 5;

-- 12. Sample load data (first 5)
SELECT load_number
, assigned_vehicle_id, customer_name, cargo_type, status, currency, priority
FROM loads
ORDER BY created_at DESC
LIMIT 5;
[
  {
    "load_number": "LD-20251116-001",
    "assigned_vehicle_id": null,
    "customer_name": "CBC Farm",
    "cargo_type": "municipal - boxes",
    "status": "pending",
    "currency": "USD",
    "priority": "medium"
  },
  {
    "load_number": "LD-20251115-001",
    "assigned_vehicle_id": null,
    "customer_name": "CBC Farm",
    "cargo_type": "direct - crates",
    "status": "pending",
    "currency": "USD",
    "priority": "medium"
  },
  {
    "load_number": "LD-20251114-002",
    "assigned_vehicle_id": null,
    "customer_name": "BV Farm",
    "cargo_type": "retail/vansales - crates",
    "status": "pending",
    "currency": "USD",
    "priority": "medium"
  },
  {
    "load_number": "LD-20251114-001",
    "assigned_vehicle_id": null,
    "customer_name": "CBC Farm",
    "cargo_type": "vendor - bins",
    "status": "pending",
    "currency": "USD",
    "priority": "medium"
  },
  {
    "load_number": "LD-20251113-002",
    "assigned_vehicle_id": null,
    "customer_name": "CBC Farm",
    "cargo_type": "retail/vansales - crates",
    "status": "pending",
    "currency": "USD",
    "priority": "medium"
  }
]
-- 13. Check LOAD_TYPES usage in trips
SELECT load_type, COUNT(*) as count
FROM trips
WHERE load_type IS NOT NULL
GROUP BY load_type
ORDER BY count DESC;

-- 14. Check cargo_type usage in loads
SELECT cargo_type, COUNT(*) as count
FROM loads
WHERE cargo_type IS NOT NULL
GROUP BY cargo_type
ORDER BY count DESC;
[
  {
    "cargo_type": "General Freight",
    "count": 16
  },
  {
    "cargo_type": "vendor - bins",
    "count": 6
  },
  {
    "cargo_type": "direct - crates",
    "count": 4
  },
  {
    "cargo_type": "retail/vansales - crates",
    "count": 3
  },
  {
    "cargo_type": "Retail ",
    "count": 2
  },
  {
    "cargo_type": "vansales/vendor - bins (20 pallets)",
    "count": 1
  },
  {
    "cargo_type": "vansales/retail - crates",
    "count": 1
  },
  {
    "cargo_type": "vansales/vendor - bins/crates (20 pallets)",
    "count": 1
  },
  {
    "cargo_type": "Beverages - Pallets",
    "count": 1
  },
  {
    "cargo_type": "retail/vendor - crates",
    "count": 1
  },
  {
    "cargo_type": "municipal - boxes",
    "count": 1
  }
]
-- 15. Check currency usage in trips
SELECT revenue_currency, COUNT(*) as count
FROM trips
WHERE revenue_currency IS NOT NULL
GROUP BY revenue_currency
ORDER BY count DESC;

-- 16. Check currency usage in loads
SELECT currency, COUNT(*) as count
FROM loads
WHERE currency IS NOT NULL
GROUP BY currency
ORDER BY count DESC;
[
  {
    "currency": "USD",
    "count": 19
  },
  {
    "currency": "ZAR",
    "count": 18
  }
]
-- 17. Check if any clients were created today
SELECT id, name, active, created_at
FROM clients
WHERE created_at::date = CURRENT_DATE
ORDER BY created_at DESC;

-- 18. Check RLS policies on clients table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'clients';
[
  {
    "schemaname": "public",
    "tablename": "clients",
    "policyname": "Allow authenticated users to manage clients",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "ALL",
    "qual": "true"
  },
  {
    "schemaname": "public",
    "tablename": "clients",
    "policyname": "Allow authenticated users to view clients",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "true"
  }
]
-- 19. Check RLS policies on wialon_vehicles table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'wialon_vehicles';
[
  {
    "schemaname": "public",
    "tablename": "wialon_vehicles",
    "policyname": "Enable insert for anon users",
    "permissive": "PERMISSIVE",
    "roles": "{anon}",
    "cmd": "INSERT",
    "qual": null
  },
  {
    "schemaname": "public",
    "tablename": "wialon_vehicles",
    "policyname": "Enable insert for authenticated users",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "INSERT",
    "qual": null
  },
  {
    "schemaname": "public",
    "tablename": "wialon_vehicles",
    "policyname": "Enable insert for service role",
    "permissive": "PERMISSIVE",
    "roles": "{service_role}",
    "cmd": "INSERT",
    "qual": null
  },
  {
    "schemaname": "public",
    "tablename": "wialon_vehicles",
    "policyname": "Enable read access for authenticated users",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "true"
  },
  {
    "schemaname": "public",
    "tablename": "wialon_vehicles",
    "policyname": "Enable read for anon users",
    "permissive": "PERMISSIVE",
    "roles": "{anon}",
    "cmd": "SELECT",
    "qual": "true"
  },
  {
    "schemaname": "public",
    "tablename": "wialon_vehicles",
    "policyname": "Enable read for service role",
    "permissive": "PERMISSIVE",
    "roles": "{service_role}",
    "cmd": "SELECT",
    "qual": "true"
  },
  {
    "schemaname": "public",
    "tablename": "wialon_vehicles",
    "policyname": "Enable update for authenticated users",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "UPDATE",
    "qual": "true"
  },
  {
    "schemaname": "public",
    "tablename": "wialon_vehicles",
    "policyname": "auth_all",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "ALL",
    "qual": "true"
  }
]
-- 20. Check RLS policies on users table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'users';
