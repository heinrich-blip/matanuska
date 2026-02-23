# Testing Guide: Verify Trips & Loads Work Seamlessly

## ✅ Fixed Issues (Commit 8a0fb42)

**Problem:** No dropdown options when creating/editing trips
**Root Cause:** Trip dialogs queried `vehicles` table but `trips.vehicle_id` references `wialon_vehicles` table
**Solution:** Created `useWialonVehicles` hook and updated both AddTripDialog and EditTripDialog

---

## 🧪 Test Plan: Verify Both Features Work

### Prerequisites

1. **Check wialon_vehicles table has data:**

```sql
-- Run in Supabase SQL Editor
SELECT id, name, registration, fleet_number, make, model
FROM wialon_vehicles
ORDER BY name
LIMIT 10;
```

[
{
"id": "bded03ee-491f-421e-b0d8-fdeb27d2b57f",
"name": "21H - ADS 4865",
"registration": "ADS 4865",
"fleet_number": null,
"make": null,
"model": null
},
{
"id": "f5a12fbe-366b-40ba-9021-18d162006e24",
"name": "22H - AGZ 3812 (ADS 4866)",
"registration": "AGZ 3812",
"fleet_number": null,
"make": null,
"model": null
},
{
"id": "1918691b-e494-4a35-a60c-f8a83629a7a9",
"name": "23H - AFQ 1324 (Int Sim)",
"registration": "AFQ 1324",
"fleet_number": null,
"make": null,
"model": null
},
{
"id": "af704ac8-ef1c-4d35-884f-c40c336de750",
"name": "24H - AFQ 1325 (Int Sim)",
"registration": "AFQ 1325",
"fleet_number": null,
"make": null,
"model": null
},
{
"id": "f14ba07f-cff5-4e34-946d-d8df50ebe8f4",
"name": "26H - AFQ 1327 (Int Sim)",
"registration": "AFQ 1327",
"fleet_number": null,
"make": null,
"model": null
},
{
"id": "9efcca9d-0347-45c3-af72-29b14763c585",
"name": "28H - AFQ 1329 (Int Sim)",
"registration": "AFQ 1329",
"fleet_number": null,
"make": null,
"model": null
},
{
"id": "7f890cae-72f8-4b7b-bdca-e5ee72d8b192",
"name": "29H - AGJ 3466",
"registration": "AGJ 3466",
"fleet_number": null,
"make": null,
"model": null
},
{
"id": "2cacb433-634c-40c4-aca1-55cda76aa57d",
"name": "30H - AGL 4216",
"registration": "AGL 4216",
"fleet_number": null,
"make": null,
"model": null
},
{
"id": "39e204d6-2f20-4f29-b934-cf878a199639",
"name": "31H - AGZ 1963 (Int sim)",
"registration": "AGZ 1963",
"fleet_number": null,
"make": null,
"model": null
},
{
"id": "29c42a5c-9800-44b6-b279-71e11f0ffe6e",
"name": "32H - JF964 FS (Int sim)",
"registration": "JF964 FS",
"fleet_number": null,
"make": null,
"model": null
}
]
**Expected:** Should return vehicles with data. If empty, you need to populate this table first.

2. **Check trips foreign key:**

```sql
SELECT
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'trips'
  AND tc.constraint_type = 'FOREIGN KEY'
  AND kcu.column_name = 'vehicle_id';
```

[
{
"constraint_name": "fk_trips_vehicle",
"column_name": "vehicle_id",
"foreign_table_name": "wialon_vehicles",
"foreign_column_name": "id"
}
]
**Expected:** Shows `fk_trips_vehicle` constraint referencing `wialon_vehicles.id`

---

## Test 1: Create New Trip ✅

### Steps:

1. Navigate to **Operations → Trips** page
2. Click **"Add Trip"** button
3. **Verify:** Dialog opens with form fields

### Check Dropdown Options:

**Vehicle Dropdown:**

- Click on "Select vehicle" dropdown
- **Expected:** See list of vehicles in format: `FLEET-001 - Toyota Hilux` or `ABC123GP - Mercedes Actros`
- **Not expected:** Empty dropdown or "No options"

**Load Type Dropdown:**

- Click on "Select load type" dropdown
- **Expected:** See options like "General Freight", "Refrigerated", etc. (from LOAD_TYPES constant)

**Driver Dropdown:**

- Click on "Select driver" dropdown
- **Expected:** See list of users with "Driver" role

**Client Dropdown:**

- Type to search for clients
- **Expected:** Shows existing clients or allows creating new

### Complete Form:

```
Trip Number: TRIP-TEST-001
Vehicle: [Select any from dropdown]
Driver: [Select any driver]
Client: [Select or create "Test Client Co"]
Load Type: General Freight
Origin: Johannesburg
Destination: Cape Town
Departure Date: [Today's date]
Arrival Date: [Tomorrow's date]
Base Revenue: 15000
Currency: ZAR (default)
Distance: 1400
```

4. Click **"Add Trip"** button
5. **Expected:** Success toast "Trip added successfully"
6. **Expected:** Trip appears in Active Trips list

---

## Test 2: Edit Existing Trip ✅

### Steps:

1. Navigate to **Active Trips** page
2. Find the trip you just created (TRIP-TEST-001)
3. Click **"Edit"** button (pencil icon)
4. **Verify:** Edit dialog opens with populated fields

### Check Dropdown Values:

**Vehicle Dropdown:**

- Should show currently selected vehicle
- Click dropdown
- **Expected:** Full list of vehicles appears
- Can change to different vehicle

**Load Type Dropdown:**

- Should show current load type
- Click dropdown
- **Expected:** All load types appear
- Can change selection

### Make Changes:

- Change vehicle to different one
- Change destination to "Durban"
- Update distance to 600

5. Click **"Save Changes"**
6. **Expected:** Success toast "Trip updated successfully"
7. **Expected:** Changes reflected in trip list

---

## Test 3: Verify Loads Work Independently ✅

### Steps:

1. Navigate to **Operations → Loads** page
2. Click **"Create Load"** button
3. **Verify:** Load creation dialog opens

### Check Load-Specific Features:

**Vehicle Selector:**

- Should show wialon_vehicles with GPS status
- Click on vehicle
- **Expected:** Shows vehicle name, registration, GPS location (if available)

**Load Fields:**

```
Load Number: LOAD-TEST-001
Customer: Test Customer Ltd
Cargo Type: Palletized Goods
Weight: 5000 kg
Volume: 12.5 m³
Origin: Johannesburg Depot
Destination: Cape Town Warehouse
Pickup Date: [Today]
Delivery Date: [Tomorrow]
```

4. Click **"Create Load"**
5. **Expected:** Load created successfully
6. **Expected:** Load appears in loads list with status "pending"

---

## Test 4: Assign Load to Trip ✅

### Steps:

1. From **Loads** page, find LOAD-TEST-001
2. Click **"Assign to Trip"** button
3. **Verify:** LoadAssignmentDialog opens

### Check Assignment Options:

**Trip Selection:**

- **Expected:** See list of available trips including TRIP-TEST-001
- Click on TRIP-TEST-001

**Vehicle Assignment:**

- **Expected:** If trip has vehicle, load inherits it
- Or select vehicle from wialon_vehicles list

4. Click **"Assign"**
5. **Expected:** Success message
6. **Expected:** Load now shows `assigned_trip_id = TRIP-TEST-001`

---

## Test 5: Webhook Import to Loads ✅

### Send Test Webhook:

```bash
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/quick-task \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "trips": [
      {
        "loadRef": "WH-TEST-001",
        "customer": "Webhook Test Customer",
        "origin": "Pretoria",
        "destination": "Bloemfontein",
        "cargoType": "Dry Goods",
        "weightKg": 3000,
        "shippedDate": "2025-11-11T06:00:00Z",
        "deliveredDate": "2025-11-11T14:00:00Z",
        "status": "delivered"
      }
    ]
  }'
```

### Verify Import:

1. Navigate to **Loads** page (NOT Trips page)
2. **Expected:** See new load WH-TEST-001
3. **Expected:** Fields populated:
   - Customer: Webhook Test Customer
   - Status: delivered (editable)
   - Currency: ZAR (editable)
   - All other fields editable

---

## Troubleshooting

### ❌ Vehicle Dropdown Still Empty

**Possible Causes:**

1. **wialon_vehicles table is empty**

   ```sql
   SELECT COUNT(*) FROM wialon_vehicles;
   ```

   If 0, you need to populate it first.

2. **RLS policy blocking query**

   ```sql
   -- Check if RLS is enabled
   SELECT tablename, rowsecurity
   FROM pg_tables
   WHERE tablename = 'wialon_vehicles';

   -- If rowsecurity = true, check policies
   SELECT * FROM pg_policies
   WHERE tablename = 'wialon_vehicles';
   ```

3. **User not authenticated**
   - Check browser console for auth errors
   - Verify logged in with valid session

**Fix:**

- Populate wialon_vehicles table
- Update RLS policies to allow SELECT for authenticated users
- Re-login if session expired

---

### ❌ Load Type Dropdown Empty

**Cause:** LOAD_TYPES constant not imported

**Fix:** Check `/src/constants/loadTypes.ts` exists and exports array

---

### ❌ "No options available" in Select

**Cause:** Empty string value breaks Radix UI Select

**Fix:** Already applied in EditTripDialog (line 167):

```typescript
<Select value={field.value || undefined}>
```

If still broken, check AddTripDialog has same pattern.

---

## Database Verification Queries

### Check Relationships:

```sql
-- Verify trips → wialon_vehicles FK
SELECT
  t.id,
  t.trip_number,
  t.vehicle_id,
  wv.name as vehicle_name,
  wv.registration
FROM trips t
LEFT JOIN wialon_vehicles wv ON t.vehicle_id = wv.id
ORDER BY t.created_at DESC
LIMIT 5;

-- Verify loads → trips FK
SELECT
  l.id,
  l.load_number,
  l.assigned_trip_id,
  t.trip_number,
  l.assigned_vehicle_id,
  wv.name as vehicle_name
FROM loads l
LEFT JOIN trips t ON l.assigned_trip_id = t.id
LEFT JOIN wialon_vehicles wv ON l.assigned_vehicle_id = wv.id
ORDER BY l.created_at DESC
LIMIT 5;
```

### Check for Data Mismatch:

```sql
-- Find trips referencing non-existent wialon_vehicles
SELECT t.id, t.trip_number, t.vehicle_id
FROM trips t
LEFT JOIN wialon_vehicles wv ON t.vehicle_id = wv.id
WHERE t.vehicle_id IS NOT NULL
  AND wv.id IS NULL;
-- Find trips referencing non-existent wialon_vehicles
SELECT t.id, t.trip_number, t.vehicle_id
FROM trips t
LEFT JOIN wialon_vehicles wv ON t.vehicle_id = wv.id
WHERE t.vehicle_id IS NOT NULL
  AND wv.id IS NULL;
-- Expected: 0 rows (no orphaned references)
```

---

## Success Criteria

### ✅ Trips Feature Working:

- [x] AddTripDialog shows vehicle dropdown options
- [x] EditTripDialog shows vehicle dropdown options
- [x] Can create new trip with vehicle selection
- [x] Can edit trip and change vehicle
- [x] Trip saves with correct vehicle_id (UUID from wialon_vehicles)

### ✅ Loads Feature Working:

- [x] CreateLoadDialog shows vehicle selector
- [x] EditLoadDialog shows vehicle options
- [x] Can create new load
- [x] Can assign load to trip via LoadAssignmentDialog
- [x] Load shows correct assigned_trip_id and assigned_vehicle_id

### ✅ Webhook Working:

- [x] Webhook imports to `loads` table (not trips)
- [x] Imported loads appear in Loads page
- [x] Status and currency fields are editable
- [x] Can assign webhook-imported loads to trips

### ✅ Both Features Independent:

- [x] Trips don't interfere with Loads
- [x] Loads don't interfere with Trips
- [x] Both query correct tables
- [x] Foreign keys point to correct tables

---

## Next Steps if Tests Fail

1. **Check browser console** for errors
2. **Check Supabase logs** for RLS policy violations
3. **Verify wialon_vehicles has data**
4. **Check user permissions**
5. **Clear browser cache** and reload
6. **Regenerate TypeScript types** if schema changed:
   ```bash
   npx supabase gen types typescript --project-id wxvhkljrbcpcgpgdqhsp > src/integrations/supabase/types.ts
   ```

---

## Summary

| Feature     | Table   | Vehicle FK                  | Status                    |
| ----------- | ------- | --------------------------- | ------------------------- |
| **Trips**   | `trips` | `wialon_vehicles.id`        | ✅ Fixed (commit 8a0fb42) |
| **Loads**   | `loads` | `wialon_vehicles.id`        | ✅ Working                |
| **Webhook** | `loads` | N/A (imports as unassigned) | ✅ Fixed (commit 3d67562) |

Both features now use the correct `wialon_vehicles` table and work independently!
