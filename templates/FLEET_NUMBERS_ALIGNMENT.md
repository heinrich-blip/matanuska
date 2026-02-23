# Fleet Numbers Alignment - Fixed

## Problem

The available fleet number options for inspection and tire movement did not align with those available during tire installation. The tire installation component showed ALL fleets from the database, but other components using the `FLEET_NUMBERS` constant only showed a subset.

## Root Cause

The `FLEET_NUMBERS` constant in `/src/constants/fleet.ts` was **incomplete**:

- **Before**: Only 14 fleets (4H, 6H, 21H-33H, UD)
- **Database**: 26 fleets actually in use
- **fleetTyreConfig.ts**: Had all 26 fleet configurations

This created an inconsistency where:

- ✅ Tire installation: Used ALL vehicles from database (26 fleets)
- ❌ Other components: Used incomplete `FLEET_NUMBERS` constant (14 fleets)

## Solution Applied (Two-Part Fix)

### Part 1: Updated Static Constant

Updated `FLEET_NUMBERS` constant to include **all 26 fleet numbers** that exist in the system.

### Part 2: Dynamic Fleet Number Hook (NEW)

Created `useFleetNumbers` hook in `/src/hooks/useFleetNumbers.ts` that **dynamically fetches fleet numbers from the database**.

This means when you create a new fleet, it will **automatically appear in all selection dropdowns** without any code changes!

```typescript
// Usage in components:
import { useFleetNumbers } from "@/hooks/useFleetNumbers";

// In your component:
const { data: fleetNumbers = [] } = useFleetNumbers();

// Or for options array:
import { useFleetNumberOptions } from "@/hooks/useFleetNumbers";
const { options } = useFleetNumberOptions();
// Returns: [{ label: "1H", value: "1H" }, ...]
```

### Components Updated to Use Dynamic Hook:

- ✅ `DieselNormsModal.tsx` - Now uses `useFleetNumberOptions()`
- ✅ `ManualDieselEntryModal.tsx` - Now uses `useFleetNumberOptions()`
- ✅ `DriverBehaviorEditModal.tsx` - Now uses `useFleetNumbers()`

## How It Works

The `useFleetNumbers` hook:

1. Queries all vehicles from the database
2. Extracts unique fleet numbers from both `fleet_number` column and `registration_number` pattern
3. Sorts them numerically (1H, 4H, 6H, 21H, 22H, ...)
4. Caches results for 5 minutes to avoid excessive queries

## Adding a New Fleet

When you add a new vehicle with a new fleet number:

1. Add the vehicle via the UI (with fleet number in registration like "35H JKL456FS")
2. **That's it!** The new fleet will automatically appear in:
   - Diesel entry dropdowns
   - Driver behavior modals
   - Any other component using `useFleetNumbers` hook

## Static Constant (Fallback)

The `FLEET_NUMBERS` constant in `/src/constants/fleet.ts` is still available for:
"8F",
// Low-bed fleets (L-series)
"14L",
"15L",
// Special fleets
"UD",
] as const;

```

Also corrected `REEFER_UNITS` to remove non-existent '9F' fleet.

## Impact

Now **all components** will have access to the same complete list of fleet numbers:

### Components Affected:

- ✅ `DriverBehaviorEditModal.tsx` - Uses `FLEET_NUMBERS` for fleet selection dropdown
- ✅ Any other components importing from `@/constants/fleet`

### Components Already Working:

- ✅ `InstallTyreDialog.tsx` - Already queries database directly
- ✅ `TyreInspection.tsx` - Uses vehicles from database
- ✅ All other components that query vehicles directly

## Verification

1. **Tire Installation**: All 26 fleets available ✅
2. **Tire Inspection**: All 26 fleets available ✅
3. **Driver Behavior Modal**: Now shows all 26 fleets ✅
4. **Other fleet dropdowns**: Now complete ✅

## Fleet Breakdown

### Horse Fleets (H-series): 14 total

1H, 4H, 6H, 21H, 22H, 23H, 24H, 26H, 28H, 29H, 30H, 31H, 32H, 33H

### Trailer Fleets (T-series): 4 total

1T, 2T, 3T, 4T

### Reefer Fleets (F-series): 5 total

4F, 5F, 6F, 7F, 8F

### Low-bed Fleets (L-series): 2 total

14L, 15L

### Special Fleets: 1 total

UD

**Total: 26 fleets**

## Related Work

This aligns with the recent unified `fleet_tyre_positions` table migration which consolidated 26 separate fleet tables into one unified table. See:

- `FLEET_TYRE_REFACTORING_GUIDE.md`
- Migration: `20260116100001_create_unified_fleet_table.sql`

## Date

January 16, 2026
```
