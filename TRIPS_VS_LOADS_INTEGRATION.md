# Trips vs Loads Integration Guide

## 🚨 Critical Fix Applied: Webhook Now Imports to LOADS Table

### The Problem

**Before:** Webhook was importing `loadRef` data into the `trips` table, causing:

- ❌ Data in wrong table (loads stored as trips)
- ❌ Missing relationships (`assigned_trip_id` link broken)
- ❌ UI confusion (trip components showed load data, load components found nothing)
- ❌ Broken dropdowns in EditTripDialog and CompletedTrips (schema mismatch)
- ❌ "Selection options not available" errors

**Root Cause:** The webhook variable was named `trips` but contained load data with `loadRef` identifiers.

### The Solution ✅

**Webhook now correctly imports to the `loads` table** (commit: 3d67562)

## Database Architecture

### Relationship Pattern

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Vehicle   │────────>│     Trip     │<────────│    Load     │
│  (Wialon)   │         │  (Journey)   │         │  (Cargo)    │
└─────────────┘         └──────────────┘         └─────────────┘
       │                       │                         │
    One vehicle          One trip can have        Each load links
    makes trips          multiple loads           to one trip via
                         assigned to it           assigned_trip_id
```

### Key Concepts

| Entity   | Purpose                     | Key Fields                                                                    | UI Components                                                          |
| -------- | --------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| **Trip** | Vehicle journey from A to B | `trip_number`, `vehicle_id`, `departure_date`, `arrival_date`                 | `ActiveTrips.tsx`, `CompletedTrips.tsx`, `EditTripDialog.tsx`          |
| **Load** | Cargo/freight shipment      | `load_number`, `customer_name`, `cargo_type`, `weight_kg`, `assigned_trip_id` | `CreateLoadDialog.tsx`, `EditLoadDialog.tsx`, `LoadStatusWorkflow.tsx` |

### Foreign Key Relationships

```sql
-- Loads reference trips
loads.assigned_trip_id → trips.id

-- Both reference vehicles
trips.vehicle_id → wialon_vehicles.id
loads.assigned_vehicle_id → wialon_vehicles.id

-- Loads can have saved routes
loads.route_id → saved_routes.id

-- Waypoints belong to trips AND loads
route_waypoints.trip_id → trips.id
route_waypoints.load_id → loads.id
```

## Webhook Import Workflow

### Current Behavior (After Fix)

1. **Webhook receives data** with `loadRef` field
2. **Creates entry in `loads` table** with:

   - `load_number = loadRef`
   - `customer_name`, `cargo_type`, `weight_kg`, etc.
   - `assigned_trip_id = NULL` (not assigned yet)
   - `assigned_vehicle_id = NULL` (not assigned yet)
   - `status = 'active'` (default)
   - `currency = 'ZAR'` (default)

3. **User workflow:**
   - Open **Loads** page (uses `CreateLoadDialog.tsx`, `EditLoadDialog.tsx`)
   - See imported loads in "Pending" or "Active" status
   - Use **LoadAssignmentDialog** to assign load to a trip
   - System links: `load.assigned_trip_id = trip.id`

### Webhook Payload Example

```json
{
  "trips": [
    {
      "loadRef": "LOAD-12345",
      "customer": "ABC Transport Ltd",
      "origin": "Johannesburg Depot",
      "destination": "Cape Town Warehouse",
      "cargoType": "Palletized Goods",
      "weightKg": 5000,
      "volumeM3": 12.5,
      "shippedDate": "2025-11-10T08:00:00Z",
      "deliveredDate": "2025-11-12T16:00:00Z",
      "status": "delivered",
      "currency": "ZAR",
      "quotedPrice": 15000,
      "finalPrice": 15000,
      "channel": "retail",
      "packagingType": "pallets",
      "palletCount": 20,
      "priority": "medium",
      "contactPerson": "John Smith",
      "contactPhone": "+27821234567"
    }
  ]
}
```

**Note:** Variable is still named `trips` in webhook for backward compatibility, but data represents loads.

## UI Components Integration

### Loads Management

**Location:** `/src/components/loads/`

- **CreateLoadDialog.tsx** - Create new load manually
- **EditLoadDialog.tsx** - Edit existing load
- **LoadAssignmentDialog.tsx** - Assign loads to trips and vehicles
- **LoadStatusWorkflow.tsx** - Update load status
- **BulkLoadImport.tsx** - CSV import for loads
- **LiveDeliveryTracking.tsx** - Track load delivery progress

### Trips Management

**Location:** `/src/components/trips/`

- **AddTripDialog.tsx** - Create trip manually
- **EditTripDialog.tsx** - Edit trip details
- **TripDetailsModal.tsx** - View trip with assigned loads
- **ActiveTrips.tsx** - List active trips
- **CompletedTrips.tsx** - List completed trips
- **LoadImportModal.tsx** - Import trip data (separate from webhook)

## Querying Trips with Loads

### Fetch Trip with All Assigned Loads

```typescript
const { data: trip } = await supabase
  .from("trips")
  .select(
    `
    *,
    vehicle:wialon_vehicles(id, name, registration),
    loads:loads!assigned_trip_id(*)
  `
  )
  .eq("id", tripId)
  .single();

console.log(trip.loads); // Array of loads assigned to this trip
```

### Fetch Load with Trip Info

```typescript
const { data: load } = await supabase
  .from("loads")
  .select(
    `
    *,
    assigned_trip:trips!assigned_trip_id(*),
    assigned_vehicle:wialon_vehicles!assigned_vehicle_id(*)
  `
  )
  .eq("id", loadId)
  .single();

console.log(load.assigned_trip); // Trip this load is assigned to
```

### Find Unassigned Loads

```typescript
const { data: unassignedLoads } = await supabase
  .from("loads")
  .select("*")
  .is("assigned_trip_id", null)
  .in("status", ["pending", "active"]);
```

## Migration Path for Existing Data

If you have loads incorrectly stored in `trips` table:

### Option 1: Manual UI Migration

1. Export data from `trips` table where `external_load_ref` is populated
2. Use **BulkLoadImport** component to reimport as loads
3. Delete incorrect trip entries

### Option 2: SQL Migration Script

```sql
-- Create loads from misplaced trip entries
INSERT INTO loads (
  load_number,
  customer_name,
  cargo_type,
  weight_kg,
  origin,
  destination,
  pickup_datetime,
  delivery_datetime,
  status,
  currency
)
SELECT
  trip_number AS load_number,
  client_name AS customer_name,
  'General Freight' AS cargo_type,
  0 AS weight_kg, -- Default, update manually
  origin,
  destination,
  actual_departure_date AS pickup_datetime,
  actual_arrival_date AS delivery_datetime,
  status,
  revenue_currency AS currency
FROM trips
WHERE external_load_ref IS NOT NULL
  AND external_load_ref != '';

-- Then delete the incorrect trip entries
DELETE FROM trips
WHERE external_load_ref IS NOT NULL
  AND external_load_ref != '';
```

## Best Practices

### ✅ When to Create a Trip

- Vehicle begins a journey (e.g., "Johannesburg to Cape Town Run #142")
- One vehicle, one route, specific departure/arrival times
- Can carry multiple loads

### ✅ When to Create a Load

- Customer requests freight shipment
- Specific cargo details (type, weight, dimensions)
- Pickup and delivery locations
- May or may not be assigned to a trip yet

### ✅ Workflow Example

1. **Customer orders shipment** → Create `load` (unassigned)
2. **Plan route** → Create `trip` for vehicle
3. **Assign load to trip** → Set `load.assigned_trip_id = trip.id`
4. **Vehicle departs** → Update `trip.status = 'active'`, `load.status = 'in_transit'`
5. **Load delivered** → Update `load.status = 'delivered'`
6. **Trip completes** → Update `trip.status = 'completed'`

## Troubleshooting

### "Selection options not available" in Edit Dialogs

**Cause:** Trying to edit a load that's stored in trips table (or vice versa)

**Fix:**

1. Check which table the data is actually in
2. Use correct component (`EditLoadDialog` for loads, `EditTripDialog` for trips)
3. If needed, migrate data to correct table (see Migration Path above)

### Webhook Creates Entries but UI Shows Nothing

**Cause:** UI component looking at wrong table

**Fix:**

- Loads page should query `loads` table
- Trips page should query `trips` table
- After webhook import, check **Loads** page (not Trips page)

### Dropdown Shows No Vehicles/Customers

**Cause:** Foreign key relationships broken or RLS policies blocking

**Fix:**

1. Check RLS policies on `wialon_vehicles` and `clients` tables
2. Verify authenticated user has access
3. Check browser console for detailed error messages

## Deploy Updated Webhook

```bash
cd /workspaces/car-craft-co

# Deploy to Supabase
npx supabase functions deploy quick-task --project-ref wxvhkljrbcpcgpgdqhsp

# Test with sample payload
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/quick-task \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "trips": [
      {
        "loadRef": "TEST-001",
        "customer": "Test Customer",
        "origin": "Johannesburg",
        "destination": "Pretoria",
        "cargoType": "Test Cargo",
        "weightKg": 1000,
        "shippedDate": "2025-11-11T08:00:00Z",
        "deliveredDate": "2025-11-11T16:00:00Z"
      }
    ]
  }'
```

## Summary

- ✅ **Webhook fixed**: Now imports to `loads` table (commit 3d67562)
- ✅ **Schema correct**: Uses proper column names (`customer_name`, `cargo_type`, `weight_kg`, etc.)
- ✅ **Relationships preserved**: Loads can be assigned to trips via `assigned_trip_id`
- ✅ **UI aligned**: Load components query `loads`, trip components query `trips`
- ✅ **Editable fields**: Status, currency, and all other fields remain editable after import

**Next steps:**

1. Deploy updated webhook to Supabase
2. Test with real webhook payload
3. Verify loads appear in Loads page (not Trips page)
4. Use LoadAssignmentDialog to assign loads to trips
5. If old data exists in wrong table, run migration script
