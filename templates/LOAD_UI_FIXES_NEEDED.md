# Load Management UI Components - Quick Fix Guide

## Database Schema vs UI Mismatches (CRITICAL FIXES NEEDED)

### ❌ Loads Table - Field Name Mismatches

**Schema has:** `volume_m3`
**UI uses:** `volume_cbm`
**Fix:** Change all `volume_cbm` → `volume_m3` in CreateLoadDialog.tsx

**Schema has:** `customer_id UUID` (reference to future customers table)
**UI uses:** `customer_phone`, `customer_email` (strings)
**Schema has:** `contact_person`, `contact_phone` (for delivery contacts)
**Fix:** Remove customer_phone/customer_email from form, use contact_person/contact_phone instead

**Schema has:** `special_requirements TEXT[]` (array)
**UI uses:** `special_requirements` as string
**Fix:** Convert string to array when saving, or use `special_instructions TEXT` instead

**Schema has:** `cargo_type TEXT` (single field)
**UI uses:** `cargo_description TEXT`
**Schema has:** `notes TEXT`, `special_instructions TEXT`
**Fix:** Use `special_instructions` for detailed cargo description

### ❌ Route Waypoints Table - Field Name Mismatches

**Schema has:** `lat NUMERIC(10, 7)`, `lng NUMERIC(10, 7)`
**UI uses:** `latitude`, `longitude`
**Fix:** Change all references in RoutePlanner.tsx to use `lat`/`lng`

### ❌ useLoads Hook Issues

**Hook returns:** `{ loads, createLoad, assignLoad, ... }`
**UI expects:** `{ data: loads, isLoading }`
**Fix:** Change LoadManagement.tsx line 31:

```typescript
const { loads, isLoading } = useLoads(
  filterStatus ? { status: filterStatus } : undefined
);
```

**Hook createLoad returns:** Function, not mutation object
**UI uses:** `createLoad.mutateAsync()`
**Fix:** Change to `createLoad(loadData)`

**Hook assignLoad returns:** Function, not mutation object
**UI uses:** `assignLoad.mutateAsync()`
**Fix:** Change to `assignLoad({ loadId, vehicleId, assignedBy })`

### ❌ findNearestVehicles Function Issues

**Hook returns:** Async function
**UI uses:** `.mutateAsync()` method
**Fix:** Call directly: `await findNearestVehicles(loadId, maxDistance, limit)`

### ❌ TypeScript 'any' Type Violations

1. **LoadManagement.tsx line 316, 318:**

```typescript
getStatusVariant: (status: string) => any;
getPriorityVariant: (status: string) => any;
```

**Fix:** Change to proper variant type:

```typescript
getStatusVariant: (status: string) =>
  "default" | "destructive" | "outline" | "secondary";
getPriorityVariant: (status: string) =>
  "default" | "destructive" | "outline" | "secondary";
```

2. **RoutePlanner.tsx line 35:**

```typescript
delete (L.Icon.Default.prototype as any)._getIconUrl;
```

**Fix:** Add type suppression comment:

```typescript
// @ts-expect-error - Leaflet internal fix for default icons
delete L.Icon.Default.prototype._getIconUrl;
```

3. **RoutePlanner.tsx line 64:**

```typescript
const [routeStats, setRouteStats] = useState<any>(null);
```

**Fix:** Create proper interface:

```typescript
interface RouteStats {
  total_distance_km: number;
  estimated_duration_mins: number;
  estimated_fuel_litres: number;
  estimated_fuel_cost: number;
  optimized_sequence: number[];
}
const [routeStats, setRouteStats] = useState<RouteStats | null>(null);
```

4. **RoutePlanner.tsx line 353:**

```typescript
onValueChange={(value: any) => ...}
```

**Fix:**

```typescript
onValueChange={(value: string) => ...}
```

### ❌ Vehicle Schema Issues

**LoadAssignmentDialog expects:** `vehicle.registration`
**Schema has:** `vehicle.registration_number`
**Fix:** Change line 311 to use `vehicle.registration_number`

### ❌ Waypoint Type Mismatch in useRouteOptimization

**useRouteOptimization expects:**

```typescript
interface Waypoint {
  lat: number;
  lng: number;
  name?: string;
  sequence: number;
}
```

**RoutePlanner provides:**

```typescript
{
  sequence: number;
  latitude: number;
  longitude: number;
}
```

**Fix:** Update RoutePlanner.tsx line 166:

```typescript
waypoints.map((wp) => ({
  sequence: wp.sequence,
  lat: wp.latitude,
  lng: wp.longitude,
  name: wp.address,
}));
```

## Quick Fixes in Order

### 1. Fix LoadManagement.tsx

```typescript
// Line 31 - Fix useLoads return structure
const { loads, isLoading } = useLoads(
  filterStatus ? { status: filterStatus } : undefined
);

// Lines 316-318 - Fix any types
interface LoadsTableProps {
  loads: Load[];
  onAssign: (load: Load) => void;
  getStatusVariant: (
    status: string
  ) => "default" | "destructive" | "outline" | "secondary";
  getStatusColor: (status: string) => string;
  getPriorityVariant: (
    status: string
  ) => "default" | "destructive" | "outline" | "secondary";
}
```

### 2. Fix CreateLoadDialog.tsx

```typescript
// Remove customer_phone, customer_email
// Change volume_cbm → volume_m3
// Change cargo_description → special_instructions
// Fix createLoad call

const [formData, setFormData] = useState<Partial<LoadInsert>>({
  customer_name: "",
  origin: "",
  destination: "",
  cargo_type: "",
  weight_kg: 0,
  volume_m3: 0, // CHANGED
  priority: "medium",
  status: "pending",
  currency: "ZAR",
});

// Remove customer_phone/email fields from form
// Add contact_person/contact_phone instead

// Line 90 - Fix mutation call
await createLoad(loadData);
```

### 3. Fix LoadAssignmentDialog.tsx

```typescript
// Line 133 - Fix findNearestVehicles call
const result = await findNearestVehicles(load.id, 500, 10);

// Line 157 - Fix assignLoad call
await assignLoad({
  loadId: load.id,
  vehicleId: selectedVehicle,
  assignedBy: "current-user",
});

// Line 311 - Fix vehicle property
{
  vehicle.registration_number;
}
```

### 4. Fix RoutePlanner.tsx

```typescript
// Line 35 - Fix Leaflet icon type
// @ts-expect-error - Leaflet internal fix for default icons
delete L.Icon.Default.prototype._getIconUrl;

// Line 64 - Fix routeStats type
interface RouteStats {
  total_distance_km: number;
  estimated_duration_mins: number;
  estimated_fuel_litres: number;
  estimated_fuel_cost: number;
  optimized_sequence: number[];
}
const [routeStats, setRouteStats] = useState<RouteStats | null>(null);

// Line 94-95, 166-170 - Fix waypoint field names
const orderedWaypoints =
  optimizedSequence.length > 0
    ? optimizedSequence.map((index) => waypoints[index])
    : waypoints;

// Line 166 - Fix optimizeRoute call
await optimizeRoute(
  waypoints.map((wp) => ({
    sequence: wp.sequence,
    lat: wp.latitude,
    lng: wp.longitude,
    name: wp.address
  })),
  { avgSpeed: 80, fuelConsumption: 30, fuelPrice: 22 }
);

// Line 353 - Fix onValueChange type
onValueChange={(value: string) =>
  setNewWaypoint({ ...newWaypoint, type: value as typeof newWaypoint.type })
}
```

## Summary of Changes Needed

1. **LoadManagement.tsx**: 3 changes (useLoads destructure, 2 type fixes)
2. **CreateLoadDialog.tsx**: ~15 changes (field name fixes, mutation call fix)
3. **LoadAssignmentDialog.tsx**: 3 changes (mutation calls, vehicle property)
4. **RoutePlanner.tsx**: ~8 changes (types, field names, mutation calls)

Total: ~29 fixes needed to make components production-ready.
