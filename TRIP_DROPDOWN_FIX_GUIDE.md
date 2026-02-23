# Trip Dropdown Fix Guide - Complete Solution

## 🚨 Problems Identified

### 1. **Wrong Vehicle Table** ❌

- **AddTripDialog** and **EditTripDialog** use `useVehicles()` hook
- `useVehicles()` queries `vehicles` table
- BUT `trips.vehicle_id` references `wialon_vehicles.id` (NOT `vehicles.id`)
- **Result**: Vehicle dropdown shows nothing or wrong vehicles

### 2. **Empty String Values Break Dropdowns** ❌

- Select components use `value={field.value}`
- When field.value is `""` (empty string), Radix UI Select breaks
- **Result**: "No options available" even though data exists

### 3. **Loads vs Trips Confusion** ❌

- Webhook was importing to `trips` table with load data
- Now fixed to import to `loads` table (commit 3d67562)
- BUT trips functionality is now completely broken

## ✅ Complete Solution

### Fix 1: Create useWialonVehicles Hook

**File**: `/src/hooks/useWialonVehicles.ts`

```typescript
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook to fetch Wialon vehicles for trip assignment
 * Trips table references wialon_vehicles.id (not vehicles.id)
 */
export const useWialonVehicles = () => {
  return useQuery({
    queryKey: ["wialon-vehicles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wialon_vehicles")
        .select("*")
        .order("name");

      if (error) throw error;
      return data || [];
    },
  });
};

export type WialonVehicle = {
  id: string;
  wialon_unit_id: number;
  name: string;
  registration: string | null;
  created_at: string | null;
  updated_at: string | null;
};
```

### Fix 2: Update AddTripDialog

**File**: `/src/components/trips/AddTripDialog.tsx`

**Changes needed:**

1. Import new hook:

```typescript
import { useWialonVehicles } from "@/hooks/useWialonVehicles";
```

2. Replace useVehicles:

```typescript
// OLD ❌
const { data: vehicles, isLoading: vehiclesLoading } = useVehicles();

// NEW ✅
const { data: vehicles, isLoading: vehiclesLoading } = useWialonVehicles();
```

3. Fix all Select value props:

```typescript
// OLD ❌
<Select onValueChange={field.onChange} value={field.value}>

// NEW ✅
<Select onValueChange={field.onChange} value={field.value || undefined}>
```

4. Update vehicle rendering:

```typescript
// OLD ❌
{
  vehicles?.map((vehicle) => (
    <SelectItem key={vehicle.id} value={vehicle.id}>
      {vehicle.registration_number} - {vehicle.make} {vehicle.model}
    </SelectItem>
  ));
}

// NEW ✅
{
  vehicles?.map((vehicle) => (
    <SelectItem key={vehicle.id} value={vehicle.id}>
      {vehicle.registration || vehicle.name} - {vehicle.name}
    </SelectItem>
  ));
}
```

### Fix 3: Update EditTripDialog

**Already fixed** in commit 9f722d3, but verify it uses wialon_vehicles:

```typescript
// Check the Select query - should fetch from wialon_vehicles
const { data: vehicles } = useQuery({
  queryKey: ['wialon-vehicles-for-edit'],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('wialon_vehicles')  // ✅ CORRECT
      .select('*')
      .order('name');
    if (error) throw error;
    return data || [];
  }
});

// All Select components should use:
<Select onValueChange={field.onChange} value={field.value || undefined}>
```

### Fix 4: Verify Database Constraints

**Run this SQL to check foreign keys:**

```sql
-- Check trips table foreign key
SELECT
  tc.table_name,
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

**Expected result:**

```
table_name | column_name | foreign_table_name | foreign_column_name
-----------+-------------+--------------------+--------------------
trips      | vehicle_id  | wialon_vehicles    | id
```

## Implementation Checklist

- [ ] 1. Create `src/hooks/useWialonVehicles.ts` hook
- [ ] 2. Update `AddTripDialog.tsx` to use useWialonVehicles
- [ ] 3. Fix all Select components: `value={field.value || undefined}`
- [ ] 4. Update vehicle SelectItem rendering to use wialon schema
- [ ] 5. Verify `EditTripDialog.tsx` already fixed (commit 9f722d3)
- [ ] 6. Test creating a new trip with vehicle selection
- [ ] 7. Test editing existing trip with vehicle selection
- [ ] 8. Verify loads still work independently

## Testing Steps

### Test 1: Create New Trip

1. Navigate to Trips page
2. Click "Add Trip" button
3. **Verify**: Vehicle dropdown shows wialon_vehicles
4. **Verify**: Load Type dropdown shows all options
5. Select vehicle, enter trip details
6. **Verify**: Trip creates successfully

### Test 2: Edit Existing Trip

1. Navigate to Active Trips
2. Click "Edit" on any trip
3. **Verify**: All dropdowns show options
4. **Verify**: Current values display correctly
5. Change vehicle selection
6. **Verify**: Updates save successfully

### Test 3: Loads Independence

1. Navigate to Loads page
2. Create new load
3. **Verify**: VehicleSelector shows wialon_vehicles
4. **Verify**: Can assign load to wialon_vehicle
5. **Verify**: No interference with trips

### Test 4: Webhook Integration

1. Send webhook payload to quick-task function
2. **Verify**: Creates entry in `loads` table (NOT trips)
3. Navigate to Loads page
4. **Verify**: Imported load appears
5. **Verify**: Can edit all fields
6. Use LoadAssignmentDialog to assign to trip
7. **Verify**: Link created successfully

## Database Schema Reference

### Tables Structure

```
wialon_vehicles (vehicle fleet data)
├─ id (UUID, PRIMARY KEY)
├─ wialon_unit_id (INTEGER)
├─ name (TEXT)
└─ registration (TEXT)

trips (vehicle journeys)
├─ id (UUID, PRIMARY KEY)
├─ trip_number (TEXT)
├─ vehicle_id (UUID) → wialon_vehicles.id
├─ departure_date (DATE)
└─ arrival_date (DATE)

loads (cargo shipments)
├─ id (UUID, PRIMARY KEY)
├─ load_number (TEXT)
├─ customer_name (TEXT)
├─ assigned_trip_id (UUID) → trips.id
└─ assigned_vehicle_id (UUID) → wialon_vehicles.id
```

### Key Relationships

- ✅ `trips.vehicle_id` → `wialon_vehicles.id`
- ✅ `loads.assigned_trip_id` → `trips.id`
- ✅ `loads.assigned_vehicle_id` → `wialon_vehicles.id`
- ❌ NO relationship to old `vehicles` table

## Common Errors & Solutions

### Error: "No options available" in vehicle dropdown

**Cause**: Using `useVehicles()` which queries wrong table

**Solution**: Use `useWialonVehicles()` instead

---

### Error: Empty dropdowns even after data loads

**Cause**: `value={field.value}` where field.value is empty string

**Solution**: Change to `value={field.value || undefined}`

---

### Error: Webhook creates data but UI shows nothing

**Cause**: Looking for data in wrong table

**Solution**:

- Webhook imports to `loads` → Check Loads page
- Manual trip creation → Check Trips page
- They are separate features!

---

### Error: Foreign key constraint violation

**Cause**: Trying to save `trips.vehicle_id` with UUID from `vehicles` table

**Solution**: Must use UUID from `wialon_vehicles` table

## Summary

| Feature   | Table   | Vehicle Reference    | UI Components                                     | Hook                  |
| --------- | ------- | -------------------- | ------------------------------------------------- | --------------------- |
| **Trips** | `trips` | `wialon_vehicles.id` | AddTripDialog, EditTripDialog, ActiveTrips        | `useWialonVehicles()` |
| **Loads** | `loads` | `wialon_vehicles.id` | CreateLoadDialog, EditLoadDialog, VehicleSelector | `useWialonContext()`  |

Both features use **wialon_vehicles** but have different workflows:

- **Trips**: Plan vehicle journey routes
- **Loads**: Manage cargo/freight, optionally assign to trips
