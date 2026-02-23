# Wialon Unit ID Reference

## ⚠️ IMPORTANT: Correct Unit IDs

The Wialon API uses **large integer IDs** (600000000+ range), NOT fleet numbers!

### Common Mistake

```typescript
// ❌ WRONG - Using fleet number
unitId: 29; // This is the fleet number, not the Wialon ID!

// ✅ CORRECT - Using actual Wialon unit ID
unitId: 600695231; // Wialon's internal ID for unit "29H - AGJ 3466"
```

---

## Complete Fleet Mapping

| Fleet Name                        | Registration | Wialon Unit ID | Database UUID                        |
| --------------------------------- | ------------ | -------------- | ------------------------------------ |
| **21H - ADS 4865**                | ADS 4865     | `600665449`    | bded03ee-491f-421e-b0d8-fdeb27d2b57f |
| **22H - AGZ 3812 (ADS 4866)**     | AGZ 3812     | `600702514`    | f5a12fbe-366b-40ba-9021-18d162006e24 |
| **23H - AFQ 1324 (Int Sim)**      | AFQ 1324     | `600590053`    | 2ddaa5b6-6be9-490e-beb3-f24b5caa85f4 |
| **24H - AFQ 1325 (Int Sim)**      | AFQ 1325     | `24979429`     | 9b5e5c0d-30ec-4ad3-bf06-3e7d5e71e3ec |
| **26H - AFQ 1327 (Int Sim)**      | AFQ 1327     | `600541672`    | a1e96e77-f7b7-4c60-be4e-d5a0e4d5e098 |
| **28H - AFQ 1329 (Int Sim)**      | AFQ 1329     | `600610518`    | 9efcca9d-0347-45c3-af72-29b14763c585 |
| **29H - AGJ 3466**                | AGJ 3466     | `600695231`    | 7f890cae-72f8-4b7b-bdca-e5ee72d8b192 |
| **30H - AGL 4216**                | AGL 4216     | `600614258`    | 2cacb433-634c-40c4-aca1-55cda76aa57d |
| **31H - AGZ 1963 (Int sim)**      | AGZ 1963     | `600672382`    | 39e204d6-2f20-4f29-b934-cf878a199639 |
| **32H - JF964 FS (Int sim)**      | JF964 FS     | `600754126`    | 29c42a5c-9800-44b6-b279-71e11f0ffe6e |
| **33H - JFK 963 FS (Int sim)**    | JFK 963 FS   | `600769948`    | bf7194a7-2c42-4403-b133-ac243486d781 |
| **BVTR 25 - DEMO TO BE RETURNED** | BVTR 25      | `600614226`    | 6afe1b13-4f0c-428e-9195-26bdc2600566 |

---

## Usage in Code

### ✅ Correct Usage

```typescript
import { useWialonSensors } from "@/hooks/useWialonSensors";

// Method 1: Use actual Wialon unit ID from database
const { sensorValues } = useWialonSensors({
  unitId: 600695231, // ✅ Correct - this is the actual Wialon ID for 29H
});

// Method 2: Fetch from database first
const { data: vehicle } = useQuery({
  queryKey: ["vehicle", vehicleId],
  queryFn: async () => {
    const { data } = await supabase
      .from("wialon_vehicles")
      .select("wialon_unit_id")
      .eq("id", vehicleId)
      .single();
    return data;
  },
});

const { sensorValues } = useWialonSensors({
  unitId: vehicle?.wialon_unit_id, // ✅ Dynamic - fetched from DB
});
```

### ❌ Common Errors

```typescript
// ❌ WRONG - Using fleet number as unit ID
const { sensorValues } = useWialonSensors({ unitId: 29 });
// Result: "No unit found with ID 29" ⚠️

// ❌ WRONG - Parsing fleet name incorrectly
const fleetNumber = parseInt("29H - AGJ 3466"); // Returns 29
const { sensorValues } = useWialonSensors({ unitId: fleetNumber });
// Result: "No unit found with ID 29" ⚠️
```

---

## Database Queries

### Get Wialon Unit ID by Fleet Name

```sql
SELECT
  name,
  wialon_unit_id,
  registration
FROM wialon_vehicles
WHERE name LIKE '29H%';
```

**Result:**

```
name              | wialon_unit_id | registration
------------------|----------------|-------------
29H - AGJ 3466    | 600695231      | AGJ 3466
```

### Get All Wialon Mappings

```sql
SELECT
  id,
  name,
  registration,
  wialon_unit_id,
  created_at
FROM wialon_vehicles
ORDER BY name;
```

---

## TypeScript Types

```typescript
// From src/integrations/supabase/types.ts
interface WialonVehicle {
  id: string; // UUID - Database ID
  wialon_unit_id: number; // INTEGER - Wialon API ID (600000000+)
  name: string; // "29H - AGJ 3466"
  registration: string | null; // "AGJ 3466"
  fleet_number: string | null; // "29H" (if stored)
  make: string | null;
  model: string | null;
  vehicle_type: string | null;
  created_at: string;
  updated_at: string;
}
```

---

## Debugging Tips

### 1. Check if Unit Exists in Wialon

```typescript
import { useWialonContext } from "@/integrations/wialon/useWialonContext";

const { callAPI } = useWialonContext();

const checkUnit = async (unitId: number) => {
  const result = await callAPI("core/search_items", {
    spec: {
      itemsType: "avl_unit",
      propName: "sys_id",
      propValueMask: String(unitId),
      sortType: "sys_name",
    },
    force: 1,
    flags: 0x0001,
    from: 0,
    to: 0,
  });

  console.log("Found units:", result.items);
};

// ✅ This will find the unit
checkUnit(600695231);

// ❌ This will return empty
checkUnit(29);
```

### 2. Verify Database Mapping

```typescript
const verifyMapping = async (fleetName: string) => {
  const { data, error } = await supabase
    .from("wialon_vehicles")
    .select("*")
    .ilike("name", `%${fleetName}%`)
    .single();

  if (data) {
    console.log(`Fleet: ${data.name}`);
    console.log(`Wialon Unit ID: ${data.wialon_unit_id}`);
    console.log(`Database UUID: ${data.id}`);
  }
};

// Check vehicle 29H
verifyMapping("29H");
```

### 3. Console Warning Troubleshooting

If you see:

```
⚠️ No Wialon unit found with internal ID: 29
Tip: Try with useUniqueId: true option to search by IMEI/unique ID
```

**Solution:** You're using the fleet number instead of the Wialon unit ID. Use `600695231` instead of `29`.

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────┐
│  WIALON UNIT ID QUICK REFERENCE                     │
├─────────────────────────────────────────────────────┤
│  Fleet 21H → 600665449                              │
│  Fleet 22H → 600702514                              │
│  Fleet 23H → 600590053                              │
│  Fleet 24H → 24979429  (⚠️ Different range!)       │
│  Fleet 26H → 600541672                              │
│  Fleet 28H → 600610518                              │
│  Fleet 29H → 600695231  ← Most commonly confused    │
│  Fleet 30H → 600614258                              │
│  Fleet 31H → 600672382                              │
│  Fleet 32H → 600754126                              │
│  Fleet 33H → 600769948                              │
│  BVTR 25   → 600614226                              │
└─────────────────────────────────────────────────────┘
```

---

## Migration Notes

If you need to update code that's using incorrect IDs:

### Find Hardcoded Unit IDs

```bash
# Search for potential issues
grep -r "unitId.*:\s*[1-9][0-9]\s*[,}]" src/
```

### Update Pattern

```typescript
// Before
const sensors = useWialonSensors({ unitId: 29 });

// After - Option 1: Use correct ID
const sensors = useWialonSensors({ unitId: 600695231 });

// After - Option 2: Fetch from database
const { data: vehicle } = useQuery({
  queryKey: ["vehicle-by-name", "29H - AGJ 3466"],
  queryFn: async () => {
    const { data } = await supabase
      .from("wialon_vehicles")
      .select("wialon_unit_id")
      .eq("name", "29H - AGJ 3466")
      .single();
    return data;
  },
});

const sensors = useWialonSensors({
  unitId: vehicle?.wialon_unit_id,
  enabled: !!vehicle?.wialon_unit_id,
});
```

---

## Additional Resources

- **Wialon API Documentation**: https://sdk.wialon.com/wiki/en/sidebar/remoteapi/apiref/apiref
- **Supabase Schema**: `src/integrations/supabase/types.ts` → `wialon_vehicles` table
- **Hook Documentation**: `src/hooks/useWialonSensors.ts` → JSDoc comments
- **Units JSON**: `wialon_data/units.json` → Raw Wialon API response

---

## Summary

✅ **Always use the large integer Wialon unit IDs** (600000000+ range)
❌ **Never use fleet numbers** (21, 22, 29, etc.) as unit IDs
💡 **When in doubt**, query the `wialon_vehicles` table first
🔍 **Check the warning messages** - they tell you which ID type you're using

---

_Last Updated: January 2025_
_Source: units.json + debug_dropdowns.sql + wialon_vehicles table_
