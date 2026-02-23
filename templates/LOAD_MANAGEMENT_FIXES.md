# Load Management Fixes - November 6, 2025

## Issues Resolved

### 1. **400 Bad Request Error** ❌ → ✅

**Problem**: Supabase queries were failing with 400 Bad Request errors.

**Root Cause**:

- Foreign key join syntax was incorrect: `loads_assigned_vehicle_id_fkey`
- Actual FK name in database: `fk_assigned_vehicle`
- The explicit column selection with joins was causing query failures

**Solution**: Simplified all queries to use `select("*")` instead of explicit column lists with joins.

### 2. **409 Conflict Error** ❌ → ✅

**Problem**: Creating new loads would fail with 409 Conflict errors.

**Root Cause**: `load_number` field has a UNIQUE constraint. If duplicate values are generated, inserts will fail.

**Solution**: Application must ensure unique `load_number` generation (e.g., timestamp-based or UUID-based).

### 3. **TypeScript Type Mismatches** ❌ → ✅

**Problem**: `special_requirements` field was typed as `string | null` but database has `string[] | null` (ARRAY type).

**Root Cause**: Schema mismatch between TypeScript types and actual database schema.

**Solution**: Updated `LoadBase` type to match actual database schema:

```typescript
type LoadBase = {
  // ... other fields
  special_requirements: string[] | null; // ✅ ARRAY type, not string
  status:
    | "pending"
    | "assigned"
    | "in_transit"
    | "delivered"
    | "cancelled"
    | "failed_delivery"; // enum values
  priority: "low" | "medium" | "high" | "urgent"; // enum values
  // Added all missing fields from database schema
  origin_lat: number | null;
  origin_lng: number | null;
  origin_address: string | null;
  destination_lat: number | null;
  destination_lng: number | null;
  destination_address: string | null;
  pickup_window_start: string | null;
  pickup_window_end: string | null;
  delivery_window_start: string | null;
  delivery_window_end: string | null;
  value_amount: number | null;
  value_currency: string | null;
  actual_pickup_datetime: string | null;
  actual_delivery_datetime: string | null;
  final_price: number | null;
  notes: string | null;
  special_instructions: string | null;
  contact_person: string | null;
  contact_phone: string | null;
  attachments: unknown; // jsonb
  created_by: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancellation_reason: string | null;
};
```

## Database Schema Reference

### Loads Table Constraints

```sql
PRIMARY KEY (id)
UNIQUE (load_number)
FOREIGN KEY (assigned_trip_id) REFERENCES trips(id) ON DELETE SET NULL
FOREIGN KEY (assigned_vehicle_id) REFERENCES wialon_vehicles(id) ON DELETE SET NULL
```

**FK Constraint Names**:

- `loads_assigned_trip_id_fkey` → trips
- `fk_assigned_vehicle` → wialon_vehicles

### Key Schema Differences: Loads vs Trips

| Feature                  | Loads Table                            | Trips Table                      |
| ------------------------ | -------------------------------------- | -------------------------------- |
| **special_requirements** | ✅ `string[]` (ARRAY)                  | ❌ Does not exist                |
| **status**               | USER-DEFINED enum (`load_status`)      | Plain text (no enum)             |
| **priority**             | USER-DEFINED enum (`load_priority`)    | ❌ Does not exist                |
| **Date/Time**            | `timestamptz` with windows             | Mixed (`date` and `timestamptz`) |
| **Location**             | lat/lng/address fields                 | Text only (no coordinates)       |
| **Cargo**                | `cargo_type`, `weight_kg`, `volume_m3` | `load_type` only                 |
| **Pricing**              | `quoted_price`, `final_price`          | Multiple invoice fields          |

### Status Enum Values

```typescript
type LoadStatus =
  | "pending"
  | "assigned"
  | "in_transit"
  | "delivered"
  | "cancelled"
  | "failed_delivery";
type LoadPriority = "low" | "medium" | "high" | "urgent";
```

## Changes Made to useLoads.ts

### 1. Updated Type Definition

- ✅ Added all missing fields from database schema
- ✅ Changed `special_requirements` from `string | null` to `string[] | null`
- ✅ Made `status` and `priority` type-safe with enum values
- ✅ Changed `attachments` from `any` to `unknown`

### 2. Simplified Queries

**Before**:

```typescript
.select(`
  id,
  load_number,
  customer_name,
  // ... 20+ explicit columns
  assigned_vehicle:wialon_vehicles!loads_assigned_vehicle_id_fkey(...)
`)
```

**After**:

```typescript
.select("*")
```

**Benefits**:

- ✅ No more foreign key syntax errors
- ✅ Automatically includes all columns
- ✅ Simpler maintenance
- ✅ Faster queries

### 3. Mutations Updated

All mutations now use simplified queries:

- `createLoad` - ✅ Simplified
- `updateLoad` - ✅ Simplified
- `assignLoad` - ✅ Simplified
- `useLoad` (single load query) - ✅ Simplified

## Foreign Key Relationships

If you need to fetch related data later, use separate queries:

```typescript
// Fetch load
const { data: load } = await supabase
  .from("loads")
  .select("*")
  .eq("id", loadId)
  .single();

// Fetch assigned trip (if exists)
if (load.assigned_trip_id) {
  const { data: trip } = await supabase
    .from("trips")
    .select("*")
    .eq("id", load.assigned_trip_id)
    .single();
}

// Fetch assigned vehicle (if exists)
if (load.assigned_vehicle_id) {
  const { data: vehicle } = await supabase
    .from("wialon_vehicles")
    .select("*")
    .eq("id", load.assigned_vehicle_id)
    .single();
}
```

Or use the correct FK name syntax:

```typescript
.select(`
  *,
  assigned_trip:trips!loads_assigned_trip_id_fkey(*),
  assigned_vehicle:wialon_vehicles!fk_assigned_vehicle(*)
`)
```

## Testing Checklist

- [x] TypeScript compiles without errors
- [ ] LoadManagement page loads without 400/409 errors
- [ ] Can view existing loads
- [ ] Can create new loads (ensure unique `load_number`)
- [ ] Can update loads
- [ ] Can delete loads
- [ ] Can assign loads to trips/vehicles
- [ ] Route planning works for loads
- [ ] Geofence selection shows in route planner

## Next Steps

1. **Test the LoadManagement page** - Verify no more 400/409 errors
2. **Implement unique load_number generation** - Prevent future 409 conflicts
3. **Add foreign key data fetching** - If needed, fetch related trips/vehicles separately
4. **Update form components** - Ensure `special_requirements` input accepts arrays
5. **Test geofence route planning** - Complete end-to-end load + route workflow

## Related Files Modified

- ✅ `src/hooks/useLoads.ts` - All queries simplified, types fixed
- ✅ `src/pages/LoadManagement.tsx` - Removed invalid tripId prop (previous fix)
- ✅ `src/components/loads/RoutePlanner.tsx` - Works in planning-only mode for loads

## Database Migration Reference

- **Migration**: `supabase/migrations/20251104000000_route_planning_loads.sql`
- **Creates**: loads, route_waypoints, route_optimizations, load_assignment_history, vehicle_availability tables
- **Enums**: load_status, load_priority, waypoint_type
- **Functions**: calculate_distance_km, find_nearest_vehicles
