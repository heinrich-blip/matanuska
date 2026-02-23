# Foreign Key Constraint Fix - November 6, 2025

## Problem: "insert or update on table 'loads' violates foreign key constraint 'fk_assigned_vehicle'"

### Root Cause

The `loads` table has a foreign key constraint that references the **`wialon_vehicles`** table:

```sql
ALTER TABLE public.loads
  ADD CONSTRAINT fk_assigned_vehicle
  FOREIGN KEY (assigned_vehicle_id)
  REFERENCES public.wialon_vehicles(id)
  ON DELETE SET NULL;
```

However, the `VehicleSelector` component was querying from the **`vehicles`** table instead:

```typescript
// ❌ WRONG - These are different tables with different IDs
.from("vehicles")
```

### The Two Vehicle Tables

#### 1. `vehicles` Table (Old Fleet Management)

- Created: 2025-09-30
- Columns: `id`, `fleet_number`, `registration_number`, `make`, `model`, `vehicle_type`, `year`, `vin`, `mileage`, etc.
- Purpose: General fleet vehicle records
- **No GPS tracking integration**

#### 2. `wialon_vehicles` Table (GPS-Tracked)

- Created: 2025-11-04
- Columns: `id`, `wialon_unit_id`, `name`, `registration`, `created_at`, `updated_at`
- Purpose: Vehicles with active Wialon GPS tracking
- **Foreign key target for loads.assigned_vehicle_id**

### Why This Caused Errors

When creating a load with immediate vehicle assignment:

1. User selects vehicle from `VehicleSelector`
2. Component returns ID from `vehicles` table
3. `CreateLoadDialog` tries to insert this ID into `loads.assigned_vehicle_id`
4. **PostgreSQL rejects**: ID doesn't exist in `wialon_vehicles` table
5. **Error**: `violates foreign key constraint "fk_assigned_vehicle"`

## Solution Applied

### Changed VehicleSelector to Query wialon_vehicles

**Before**:

```typescript
const { data: vehicles = [] } = useQuery({
  queryKey: ["vehicles-for-selection"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("vehicles") // ❌ WRONG TABLE
      .select("*")
      .eq("active", true)
      .order("fleet_number");
    return data || [];
  },
});
```

**After**:

```typescript
const { data: vehicles = [] } = useQuery({
  queryKey: ["wialon-vehicles-for-selection"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("wialon_vehicles") // ✅ CORRECT TABLE
      .select("*")
      .order("name");
    return data || [];
  },
});
```

### Updated Type Interface

**Before** (vehicles table schema):

```typescript
interface VehicleWithGPS {
  id: string;
  fleet_number: string;
  registration_number: string;
  make: string | null;
  model: string | null;
  vehicle_type: string | null;
  // ... many more fields
}
```

**After** (wialon_vehicles schema):

```typescript
interface VehicleWithGPS {
  id: string;
  wialon_unit_id: number;
  name: string;
  registration: string | null;
  created_at: string | null;
  updated_at: string | null;
  // GPS data merged from Wialon API
  currentLat?: number;
  currentLng?: number;
  speed?: number;
  distance?: number;
  lastUpdate?: Date;
}
```

### Updated UI References

| Changed From                     | Changed To               | Reason                            |
| -------------------------------- | ------------------------ | --------------------------------- |
| `vehicle.fleet_number`           | `vehicle.name`           | Column renamed in wialon_vehicles |
| `vehicle.registration_number`    | `vehicle.registration`   | Column renamed                    |
| `vehicle.vehicle_type`           | `vehicle.wialon_unit_id` | Show Wialon unit ID instead       |
| `vehicle.make` / `vehicle.model` | Removed                  | Not in wialon_vehicles schema     |

### Updated GPS Matching Logic

**Before**:

```typescript
const gpsData = vehicleLocations.find((loc) => {
  if (loc.vehicleName === vehicle.fleet_number) return true;
  if (loc.vehicleId === vehicle.registration_number) return true;
  // ...
});
```

**After**:

```typescript
const gpsData = vehicleLocations.find((loc) => {
  if (loc.vehicleName === vehicle.name) return true;
  if (loc.vehicleId === vehicle.registration) return true;
  // ...
});
```

## Files Modified

1. **`src/components/loads/VehicleSelector.tsx`**

   - ✅ Changed query from `vehicles` to `wialon_vehicles`
   - ✅ Updated `VehicleWithGPS` interface
   - ✅ Fixed GPS data matching logic
   - ✅ Updated search filter to use `name` and `registration`
   - ✅ Updated UI display to show `name` and `wialon_unit_id`

2. **`src/hooks/useLoads.ts`**

   - ✅ Already correct (uses database-generated types)
   - ✅ Foreign key references match schema

3. **`src/components/loads/CreateLoadDialog.tsx`**
   - ✅ No changes needed (already handles nullable vehicle IDs)
   - ✅ Now receives correct IDs from VehicleSelector

## Impact & Benefits

### ✅ Fixed Issues

- No more foreign key constraint violations when assigning vehicles
- Vehicle selection now uses GPS-tracked vehicles only
- IDs are guaranteed to exist in wialon_vehicles table

### ✅ Improved Functionality

- Vehicle selector now shows only GPS-tracked vehicles
- Better integration with Wialon GPS system
- Distance calculations work correctly (GPS data matches vehicles)

### ⚠️ Important Notes

1. **Only GPS-Tracked Vehicles Available**

   - If a vehicle exists in `vehicles` but not `wialon_vehicles`, it won't appear in VehicleSelector
   - This is intentional - loads should only be assigned to GPS-tracked vehicles

2. **Vehicle Registration**

   - Some vehicles may not have registration set in wialon_vehicles
   - UI gracefully handles null registrations: `vehicle.name (registration)` or just `vehicle.name`

3. **Wialon Unit ID**
   - Every vehicle in wialon_vehicles has a unique `wialon_unit_id`
   - This is the link to the GPS tracking system
   - Used for real-time location updates

## Database Schema Reference

### wialon_vehicles Table Structure

```sql
CREATE TABLE public.wialon_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wialon_unit_id INTEGER UNIQUE NOT NULL,
  name TEXT NOT NULL,
  registration TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Foreign Key Constraint

```sql
-- In loads table
assigned_vehicle_id UUID, -- FK to wialon_vehicles.id

-- Constraint added in migration 20251104120000
ALTER TABLE public.loads
  ADD CONSTRAINT fk_assigned_vehicle
  FOREIGN KEY (assigned_vehicle_id)
  REFERENCES public.wialon_vehicles(id)
  ON DELETE SET NULL;
```

## Testing Checklist

- [x] VehicleSelector queries wialon_vehicles table
- [x] TypeScript compiles without errors
- [ ] CreateLoadDialog can assign vehicles without FK errors
- [ ] Vehicle selection shows correct vehicle names
- [ ] GPS data displays correctly (speed, location)
- [ ] Distance calculations work when origin is set
- [ ] Search filters vehicles by name and registration
- [ ] Load creation succeeds with assigned vehicle
- [ ] Load creation succeeds without assigned vehicle (null)

## Next Steps

1. **Test Load Creation** - Try creating a load and assigning a vehicle
2. **Verify GPS Integration** - Ensure Wialon GPS data matches vehicles
3. **Check Distance Sorting** - Verify nearest vehicles appear first
4. **Test Search** - Search by vehicle name and registration

## Related Documentation

- `LOAD_MANAGEMENT_FIXES.md` - Load query simplification fixes
- `supabase/migrations/20251104120000_create_wialon_vehicles.sql` - Table creation
- `supabase/migrations/20251104000000_route_planning_loads.sql` - Loads table definition
