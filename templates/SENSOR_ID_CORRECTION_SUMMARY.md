# Sensor ID Correction Summary

## 🐛 Bug Fixed

### Issue

The `UnifiedMapView` component was incorrectly parsing vehicle IDs to use as Wialon unit IDs for sensor monitoring, resulting in console warnings like:

```
⚠️ No Wialon unit found with internal ID: 29
```

### Root Cause

```typescript
// ❌ WRONG - Line 1453 in UnifiedMapView.tsx
const unitId = parseInt(vehicle.vehicleId);
// This parsed UUID strings or vehicle names, resulting in incorrect IDs like 29
```

The code was using `parseInt(vehicle.vehicleId)` which would:

- Parse a UUID like "7f890cae-72f8-4b7b-bdca-e5ee72d8b192" → `NaN`
- Parse a vehicle name like "29H - AGJ 3466" → `29` (fleet number, not Wialon ID!)

### Correct Wialon Unit IDs

Wialon uses **large integer IDs** in the 600000000+ range:

- ❌ Fleet number: `29`
- ✅ Actual Wialon unit ID: `600695231`

---

## ✅ Changes Applied

### 1. Fixed UnifiedMapView.tsx (Line ~1453)

**Before:**

```typescript
const unitId = parseInt(vehicle.vehicleId);
```

**After:**

```typescript
// Use the wialonUnitId from the vehicle object (large integer ID from Wialon API)
const unitId = vehicle.wialonUnitId;

// Don't render if no valid Wialon unit ID
if (!unitId) return null;
```

**File:** `/workspaces/car-craft-co/src/components/UnifiedMapView.tsx`

---

### 2. Added wialonUnitId to VehicleLocation Interface

**Before:**

```typescript
export interface VehicleLocation {
  vehicleId: string;
  vehicleName: string;
  unitId?: string;
  // ... other fields
}
```

**After:**

```typescript
export interface VehicleLocation {
  vehicleId: string;
  vehicleName: string;
  unitId?: string;
  wialonUnitId?: number; // Wialon's internal unit ID (large integer, e.g., 600695231)
  // ... other fields
}
```

**File:** `/workspaces/car-craft-co/src/integrations/wialon/useWialon.ts`

---

### 3. Populated wialonUnitId in Vehicle Location Mapping

**Before:**

```typescript
return {
  vehicleId,
  vehicleName: vehicleMapping?.name || unit.nm,
  unitId: unit.id.toString(),
  latitude: pos.y,
  // ... other fields
};
```

**After:**

```typescript
return {
  vehicleId,
  vehicleName: vehicleMapping?.name || unit.nm,
  unitId: unit.id.toString(),
  wialonUnitId: unit.id, // Wialon's internal unit ID (e.g., 600695231)
  latitude: pos.y,
  // ... other fields
};
```

**File:** `/workspaces/car-craft-co/src/integrations/wialon/useWialon.ts` (Line ~328)

---

### 4. Updated useWialonSensors Documentation

Updated JSDoc examples to use realistic Wialon unit IDs:

**Before:**

```typescript
 * @example
 * const { sensorValues } = useWialonSensors({ unitId: 12345 });
```

**After:**

```typescript
 * @example
 * const { sensorValues } = useWialonSensors({ unitId: 600695231 }); // For vehicle "29H - AGJ 3466"
```

**File:** `/workspaces/car-craft-co/src/hooks/useWialonSensors.ts`

---

## 📚 Documentation Created

### WIALON_UNIT_ID_REFERENCE.md

Comprehensive reference document with:

- ✅ Complete fleet mapping table (all 12 vehicles)
- ✅ Correct usage examples
- ✅ Common mistakes to avoid
- ✅ Database queries for verification
- ✅ TypeScript type definitions
- ✅ Debugging tips
- ✅ Quick reference card

**File:** `/workspaces/car-craft-co/WIALON_UNIT_ID_REFERENCE.md`

---

## 🔍 Testing

### Verify the Fix

1. **Check TypeScript compilation:**

   ```bash
   npm run build
   ```

   ✅ No errors

2. **Check vehicle locations in console:**

   ```javascript
   // In browser console when UnifiedMapView is open
   vehicleLocations.forEach((v) => {
     console.log(`${v.vehicleName}: wialonUnitId=${v.wialonUnitId}`);
   });
   ```

   Expected output:

   ```
   29H - AGJ 3466: wialonUnitId=600695231
   21H - ADS 4865: wialonUnitId=600665449
   // etc.
   ```

3. **Test sensor widget:**
   - Open UnifiedMapView
   - Select vehicle "29H - AGJ 3466"
   - Sensor widget should load without warnings
   - Console should show: `✓ Found unit "29H - AGJ 3466" (ID: 600695231) with X sensors`

---

## 📊 Complete Fleet Mapping

| Fleet Name                    | Registration | Wialon Unit ID | Database UUID                        |
| ----------------------------- | ------------ | -------------- | ------------------------------------ |
| 21H - ADS 4865                | ADS 4865     | `600665449`    | bded03ee-491f-421e-b0d8-fdeb27d2b57f |
| 22H - AGZ 3812 (ADS 4866)     | AGZ 3812     | `600702514`    | f5a12fbe-366b-40ba-9021-18d162006e24 |
| 23H - AFQ 1324 (Int Sim)      | AFQ 1324     | `600590053`    | 2ddaa5b6-6be9-490e-beb3-f24b5caa85f4 |
| 24H - AFQ 1325 (Int Sim)      | AFQ 1325     | `24979429`     | 9b5e5c0d-30ec-4ad3-bf06-3e7d5e71e3ec |
| 26H - AFQ 1327 (Int Sim)      | AFQ 1327     | `600541672`    | a1e96e77-f7b7-4c60-be4e-d5a0e4d5e098 |
| 28H - AFQ 1329 (Int Sim)      | AFQ 1329     | `600610518`    | 9efcca9d-0347-45c3-af72-29b14763c585 |
| 29H - AGJ 3466                | AGJ 3466     | `600695231`    | 7f890cae-72f8-4b7b-bdca-e5ee72d8b192 |
| 30H - AGL 4216                | AGL 4216     | `600614258`    | 2cacb433-634c-40c4-aca1-55cda76aa57d |
| 31H - AGZ 1963 (Int sim)      | AGZ 1963     | `600672382`    | 39e204d6-2f20-4f29-b934-cf878a199639 |
| 32H - JF964 FS (Int sim)      | JF964 FS     | `600754126`    | 29c42a5c-9800-44b6-b279-71e11f0ffe6e |
| 33H - JFK 963 FS (Int sim)    | JFK 963 FS   | `600769948`    | bf7194a7-2c42-4403-b133-ac243486d781 |
| BVTR 25 - DEMO TO BE RETURNED | BVTR 25      | `600614226`    | 6afe1b13-4f0c-428e-9195-26bdc2600566 |

---

## 🎯 Key Takeaways

### Always Use Actual Wialon Unit IDs

✅ **Correct:** `unitId: 600695231`
❌ **Wrong:** `unitId: 29` (fleet number)
❌ **Wrong:** `parseInt(vehicle.vehicleId)` (parses UUID)

### How to Get Correct IDs

#### Option 1: From Database

```typescript
const { data: vehicle } = await supabase
  .from("wialon_vehicles")
  .select("wialon_unit_id")
  .eq("name", "29H - AGJ 3466")
  .single();

const unitId = vehicle?.wialon_unit_id; // 600695231
```

#### Option 2: From VehicleLocation Object

```typescript
const vehicle = vehicleLocations.find(
  (v) => v.vehicleName === "29H - AGJ 3466"
);
const unitId = vehicle?.wialonUnitId; // 600695231
```

#### Option 3: From units.json

```json
{
  "nm": "29H - AGJ 3466",
  "id": 600695231
}
```

---

## 🔧 Future Improvements

1. **Add TypeScript validation:**

   ```typescript
   type WialonUnitId = number & { readonly __brand: "WialonUnitId" };
   ```

2. **Add runtime checks:**

   ```typescript
   if (unitId < 1000000) {
     console.error(
       `Invalid Wialon unit ID: ${unitId}. IDs should be in the 600000000+ range.`
     );
   }
   ```

3. **Add database constraint:**
   ```sql
   ALTER TABLE wialon_vehicles
   ADD CONSTRAINT chk_wialon_unit_id_range
   CHECK (wialon_unit_id > 100000);
   ```

---

## 📝 Related Files

- ✅ `/workspaces/car-craft-co/src/components/UnifiedMapView.tsx` - Fixed sensor widget unit ID
- ✅ `/workspaces/car-craft-co/src/integrations/wialon/useWialon.ts` - Added wialonUnitId field
- ✅ `/workspaces/car-craft-co/src/hooks/useWialonSensors.ts` - Updated documentation
- 📚 `/workspaces/car-craft-co/WIALON_UNIT_ID_REFERENCE.md` - Complete reference guide
- 📊 `/workspaces/car-craft-co/wialon_data/units.json` - Raw Wialon API data
- 📊 `/workspaces/car-craft-co/debug_dropdowns.sql` - Database mapping data

---

_Last Updated: January 2025_
_Fix Applied By: GitHub Copilot_
