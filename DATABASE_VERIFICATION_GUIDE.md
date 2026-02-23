# 🔍 Database Verification & Testing Guide

**Last Updated:** October 31, 2025  
**Phase 1 Status:** ✅ COMPLETE

---

## 📊 Current Status

✅ **Phase 1 Complete** - All database migrations successfully applied  
✅ **TypeScript Types** - Regenerated from updated schema  
✅ **Verification** - All checks passed

---

## 🎉 Post-Migration Verification (October 31, 2025)

### ✅ Phase 1 Migrations Applied Successfully

**Migration Results:**

```sql
-- New columns in parts_requests
SELECT COUNT(*) as new_columns_added
FROM information_schema.columns
WHERE table_name = 'parts_requests'
  AND column_name IN (
    'inventory_id', 'unit_price', 'total_price',
    'requested_by', 'approved_by', 'approved_at',
    'rejected_by', 'rejected_at', 'rejection_reason',
    'is_from_inventory'
  );
```

**Result:** ✅ 10 columns added

```sql
-- inventory_transactions table created
SELECT COUNT(*) as column_count
FROM information_schema.columns
WHERE table_name = 'inventory_transactions';
```

**Result:** ✅ 10 columns in inventory_transactions

```sql
-- Database functions created
SELECT COUNT(*) as functions_created
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'check_inventory_availability',
    'reserve_inventory',
    'deduct_inventory',
    'release_inventory_reservation'
  );
```

**Result:** ✅ 4 functions created

### Current Database State (Post-Migration)

**Tables:**

- ✅ `inventory` - 20 items across 7 categories
- ✅ `parts_requests` - Extended with 10 new columns
- ✅ `job_cards` - Unchanged
- ✅ `inventory_transactions` - **NEW** audit trail table

**Functions:**

- ✅ `check_inventory_availability()` - Check stock
- ✅ `reserve_inventory()` - Reserve stock
- ✅ `deduct_inventory()` - Deduct stock
- ✅ `release_inventory_reservation()` - Release reservation

**TypeScript Types:**

- ✅ `src/integrations/supabase/types.ts` - Regenerated
- ✅ No compilation errors

---

## Pre-Implementation Database Checks (COMPLETED)

These checks were run before Phase 1 implementation to ensure the database was ready.

---

## ✅ Step 1: Verify Existing Tables

```sql
-- Check if required tables exist
SELECT
  table_name,
  CASE
    WHEN table_name IN ('inventory', 'parts_requests', 'job_cards') THEN '✓ EXISTS'
    ELSE '✗ MISSING'
  END as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('inventory', 'parts_requests', 'job_cards', 'inventory_transactions')
ORDER BY table_name;
```

## Results:

[
{
"table_name": "inventory",
"status": "✓ EXISTS"
},
{
"table_name": "job_cards",
"status": "✓ EXISTS"
},
{
"table_name": "parts_requests",
"status": "✓ EXISTS"
}
]
**Expected Output:**

```
table_name           | status
---------------------|----------
inventory            | ✓ EXISTS
job_cards            | ✓ EXISTS
parts_requests       | ✓ EXISTS
inventory_transactions| ✗ MISSING (will create)
```

---

## ✅ Step 2: Check Current Schema

### Check `inventory` table structure

```sql
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'inventory'
ORDER BY ordinal_position;
```

## Results:

[
{
"column_name": "id",
"data_type": "uuid",
"is_nullable": "NO",
"column_default": "gen_random_uuid()"
},
{
"column_name": "name",
"data_type": "text",
"is_nullable": "NO",
"column_default": null
},
{
"column_name": "part_number",
"data_type": "text",
"is_nullable": "NO",
"column_default": null
},
{
"column_name": "category",
"data_type": "text",
"is_nullable": "NO",
"column_default": null
},
{
"column_name": "quantity",
"data_type": "integer",
"is_nullable": "NO",
"column_default": "0"
},
{
"column_name": "min_quantity",
"data_type": "integer",
"is_nullable": "NO",
"column_default": "5"
},
{
"column_name": "unit_price",
"data_type": "numeric",
"is_nullable": "YES",
"column_default": null
},
{
"column_name": "location",
"data_type": "text",
"is_nullable": "YES",
"column_default": null
},
{
"column_name": "supplier",
"data_type": "text",
"is_nullable": "YES",
"column_default": null
},
{
"column_name": "created_at",
"data_type": "timestamp with time zone",
"is_nullable": "YES",
"column_default": "now()"
},
{
"column_name": "updated_at",
"data_type": "timestamp with time zone",
"is_nullable": "YES",
"column_default": "now()"
}
]
**Expected Columns:**

- id (uuid)
- name (text)
- part_number (text)
- category (text)
- quantity (integer)
- min_quantity (integer)
- unit_price (numeric)
- location (text)
- supplier (text)
- created_at (timestamp)
- updated_at (timestamp)

### Check `parts_requests` table structure

```sql
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'parts_requests'
ORDER BY ordinal_position;
```

## Results:

[
{
"column_name": "id",
"data_type": "uuid",
"is_nullable": "NO",
"column_default": "gen_random_uuid()"
},
{
"column_name": "part_name",
"data_type": "text",
"is_nullable": "NO",
"column_default": null
},
{
"column_name": "part_number",
"data_type": "text",
"is_nullable": "YES",
"column_default": null
},
{
"column_name": "quantity",
"data_type": "integer",
"is_nullable": "NO",
"column_default": null
},
{
"column_name": "job_card_id",
"data_type": "uuid",
"is_nullable": "YES",
"column_default": null
},
{
"column_name": "notes",
"data_type": "text",
"is_nullable": "YES",
"column_default": null
},
{
"column_name": "status",
"data_type": "text",
"is_nullable": "NO",
"column_default": "'pending'::text"
},
{
"column_name": "created_at",
"data_type": "timestamp with time zone",
"is_nullable": "YES",
"column_default": "now()"
},
{
"column_name": "updated_at",
"data_type": "timestamp with time zone",
"is_nullable": "YES",
"column_default": "now()"
}
]
**Current Columns (before migration):**

- id (uuid)
- part_name (text)
- part_number (text)
- quantity (integer)
- job_card_id (uuid)
- notes (text)
- status (text)
- created_at (timestamp)
- updated_at (timestamp)

**After Migration (new columns):**

- inventory_id (uuid) → NEW
- unit_price (numeric) → NEW
- total_price (numeric) → NEW
- requested_by (text) → NEW
- approved_by (text) → NEW
- approved_at (timestamp) → NEW
- rejected_by (text) → NEW
- rejected_at (timestamp) → NEW
- rejection_reason (text) → NEW
- is_from_inventory (boolean) → NEW (computed)

---

## ✅ Step 3: Check RLS Policies

```sql
-- Check existing policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('inventory', 'parts_requests', 'job_cards')
ORDER BY tablename, policyname;
```

## Results:

[
{
"schemaname": "public",
"tablename": "inventory",
"policyname": "Allow authenticated users to manage inventory",
"permissive": "PERMISSIVE",
"roles": "{public}",
"cmd": "ALL",
"qual": "true"
},
{
"schemaname": "public",
"tablename": "inventory",
"policyname": "Allow authenticated users to view inventory",
"permissive": "PERMISSIVE",
"roles": "{public}",
"cmd": "SELECT",
"qual": "true"
},
{
"schemaname": "public",
"tablename": "job_cards",
"policyname": "Allow authenticated users to manage job cards",
"permissive": "PERMISSIVE",
"roles": "{public}",
"cmd": "ALL",
"qual": "true"
},
{
"schemaname": "public",
"tablename": "job_cards",
"policyname": "Allow authenticated users to view job cards",
"permissive": "PERMISSIVE",
"roles": "{public}",
"cmd": "SELECT",
"qual": "true"
},
{
"schemaname": "public",
"tablename": "job_cards",
"policyname": "Users can view job cards linked to inspections",
"permissive": "PERMISSIVE",
"roles": "{authenticated}",
"cmd": "SELECT",
"qual": "true"
},
{
"schemaname": "public",
"tablename": "parts_requests",
"policyname": "Allow authenticated users to manage parts requests",
"permissive": "PERMISSIVE",
"roles": "{public}",
"cmd": "ALL",
"qual": "true"
},
{
"schemaname": "public",
"tablename": "parts_requests",
"policyname": "Allow authenticated users to view parts requests",
"permissive": "PERMISSIVE",
"roles": "{public}",
"cmd": "SELECT",
"qual": "true"
}
]

---

## ✅ Step 4: Check Inventory Data

```sql
-- Check if inventory has data
SELECT
  category,
  COUNT(*) as part_count,
  SUM(quantity) as total_quantity,
  AVG(unit_price) as avg_price,
  MIN(quantity) as min_quantity,
  MAX(quantity) as max_quantity
FROM inventory
GROUP BY category
ORDER BY part_count DESC;
```

## Results:

[
{
"category": "Engine",
"part_count": 6,
"total_quantity": 7,
"avg_price": "79.6666666666666667",
"min_quantity": 0,
"max_quantity": 6
},
{
"category": "Tyres",
"part_count": 5,
"total_quantity": 6,
"avg_price": "201.3000000000000000",
"min_quantity": 0,
"max_quantity": 4
},
{
"category": "Accessories",
"part_count": 3,
"total_quantity": 0,
"avg_price": "33.3333333333333333",
"min_quantity": 0,
"max_quantity": 0
},
{
"category": "Suspension",
"part_count": 2,
"total_quantity": 0,
"avg_price": "250.0000000000000000",
"min_quantity": 0,
"max_quantity": 0
},
{
"category": "SUSPENSION",
"part_count": 2,
"total_quantity": 9,
"avg_price": "4.5000000000000000",
"min_quantity": 4,
"max_quantity": 5
},
{
"category": "Alignment",
"part_count": 1,
"total_quantity": 0,
"avg_price": "0.00000000000000000000",
"min_quantity": 0,
"max_quantity": 0
},
{
"category": "No Stock Itms",
"part_count": 1,
"total_quantity": 0,
"avg_price": "0.00000000000000000000",
"min_quantity": 0,
"max_quantity": 0
}
]
**If no data exists, run the sample data migration.**

---

## ✅ Step 5: Check Parts Requests

```sql
-- Check existing parts requests

## Results:

[
  {
    "category": "Engine",
    "part_count": 6,
    "total_quantity": 7,
    "avg_price": "79.6666666666666667",
    "min_quantity": 0,
    "max_quantity": 6
  },
  {
    "category": "Tyres",
    "part_count": 5,
    "total_quantity": 6,
    "avg_price": "201.3000000000000000",
    "min_quantity": 0,
    "max_quantity": 4
  },
  {
    "category": "Accessories",
    "part_count": 3,
    "total_quantity": 0,
    "avg_price": "33.3333333333333333",
    "min_quantity": 0,
    "max_quantity": 0
  },
  {
    "category": "Suspension",
    "part_count": 2,
    "total_quantity": 0,
    "avg_price": "250.0000000000000000",
    "min_quantity": 0,
    "max_quantity": 0
  },
  {
    "category": "SUSPENSION",
    "part_count": 2,
    "total_quantity": 9,
    "avg_price": "4.5000000000000000",
    "min_quantity": 4,
    "max_quantity": 5
  },
  {
    "category": "Alignment",
    "part_count": 1,
    "total_quantity": 0,
    "avg_price": "0.00000000000000000000",
    "min_quantity": 0,
    "max_quantity": 0
  },
  {
    "category": "No Stock Itms",
    "part_count": 1,
    "total_quantity": 0,
    "avg_price": "0.00000000000000000000",
    "min_quantity": 0,
    "max_quantity": 0
  }
]
```

---

## ✅ Step 6: Test Database Functions (After Migration)

### Test inventory availability check

```sql
-- This will work after migration
-- Replace <inventory-id> with actual ID from your inventory table
SELECT * FROM check_inventory_availability(
  '<inventory-id>'::uuid,
  5 -- requested quantity
);
```

**Expected Output:**

```
available | current_quantity | available_quantity | is_low_stock
----------|------------------|-------------------|-------------
true      | 25               | 25                | false
```

### Test reserve inventory function

```sql
-- Test reservation (use actual IDs)
SELECT reserve_inventory(
  '<parts-request-id>'::uuid,
  '<inventory-id>'::uuid,
  2, -- quantity
  'test@example.com' -- user
);
```

## Results:

### Check inventory transactions

```sql
SELECT
  it.id,
  i.name as inventory_item,
  it.transaction_type,
  it.quantity_change,
  it.quantity_before,
  it.quantity_after,
  it.performed_by,
  it.created_at
FROM inventory_transactions it
JOIN inventory i ON it.inventory_id = i.id
ORDER BY it.created_at DESC
LIMIT 10;
```

## Results:

ERROR: 42P01: relation "inventory_transactions" does not exist
LINE 10: FROM inventory_transactions it
^

---

## 🧪 Integration Testing Queries

### Test 1: Create Parts Request with Inventory

```sql
-- Insert test request
INSERT INTO parts_requests (
  part_name,
  part_number,
  quantity,
  inventory_id,
  unit_price,
  requested_by,
  status
)
SELECT
  name,
  part_number,
  2 as quantity,
  id as inventory_id,
  unit_price,
  'test@example.com' as requested_by,
  'pending' as status
FROM inventory
WHERE part_number = 'BP-FRONT-001'
RETURNING *;
```

## Results:

ERROR: 42703: column "inventory_id" of relation "parts_requests" does not exist
LINE 5: inventory_id,
^

### Test 2: Verify Total Price Calculation

```sql
-- Check if total_price is auto-calculated
SELECT
  part_name,
  quantity,
  unit_price,
  total_price,
  (quantity * unit_price) as expected_total,
  CASE
    WHEN total_price = (quantity * unit_price) THEN '✓ CORRECT'
    ELSE '✗ INCORRECT'
  END as validation
FROM parts_requests
WHERE total_price IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;
```

## Results:

ERROR: 42703: column "unit_price" does not exist
LINE 4: unit_price,
^

### Test 3: Check Inventory Reservation

```sql
-- Verify reservation was logged
SELECT
  pr.part_name,
  pr.quantity as requested_qty,
  i.name as inventory_item,
  i.quantity as current_stock,
  it.transaction_type,
  it.quantity_change,
  it.created_at as reserved_at
FROM parts_requests pr
JOIN inventory i ON pr.inventory_id = i.id
LEFT JOIN inventory_transactions it ON it.parts_request_id = pr.id
WHERE pr.created_at >= NOW() - INTERVAL '1 hour'
ORDER BY pr.created_at DESC;
```

## Results:

ERROR: 42703: column pr.inventory_id does not exist
LINE 10: JOIN inventory i ON pr.inventory_id = i.id
^

### Test 4: Low Stock Detection

```sql
-- Find parts that need restocking
SELECT
  name,
  part_number,
  quantity as current,
  min_quantity as minimum,
  (min_quantity - quantity) as shortage,
  category,
  supplier,
  CASE
    WHEN quantity = 0 THEN 'CRITICAL - OUT OF STOCK'
    WHEN quantity < min_quantity THEN 'WARNING - BELOW MINIMUM'
    ELSE 'OK'
  END as status
FROM inventory
WHERE quantity <= min_quantity
ORDER BY (min_quantity - quantity) DESC;
```

## Results:

[
{
"name": "Mudflaps",
"part_number": "ac",
"current": 0,
"minimum": 5,
"shortage": 5,
"category": "Accessories",
"supplier": null,
"status": "CRITICAL - OUT OF STOCK"
},
{
"name": "Complete Axle (Scania G460)",
"part_number": "g460",
"current": 0,
"minimum": 5,
"shortage": 5,
"category": "Suspension",
"supplier": null,
"status": "CRITICAL - OUT OF STOCK"
},
{
"name": "Shock Absorbers (Reefers)",
"part_number": "BPW ECO",
"current": 0,
"minimum": 5,
"shortage": 5,
"category": "Alignment",
"supplier": null,
"status": "CRITICAL - OUT OF STOCK"
},
{
"name": "Clutch Master Cylinder",
"part_number": "wechai engine",
"current": 0,
"minimum": 5,
"shortage": 5,
"category": "Engine",
"supplier": null,
"status": "CRITICAL - OUT OF STOCK"
},
{
"name": "Fuel Lift Pump (UD 90)",
"part_number": "UD90",
"current": 0,
"minimum": 5,
"shortage": 5,
"category": "Engine",
"supplier": null,
"status": "CRITICAL - OUT OF STOCK"
},
{
"name": "Leaf Spring Blade (Shacman x30000)",
"part_number": "WECHAI SHACMAN",
"current": 0,
"minimum": 5,
"shortage": 5,
"category": "Suspension",
"supplier": null,
"status": "CRITICAL - OUT OF STOCK"
},
{
"name": "FIREMAX FM166.",
"part_number": "MAT0527",
"current": 0,
"minimum": 5,
"shortage": 5,
"category": "Tyres",
"supplier": null,
"status": "CRITICAL - OUT OF STOCK"
},
{
"name": "FIREMAX F166",
"part_number": "MAT0528",
"current": 0,
"minimum": 5,
"shortage": 5,
"category": "Tyres",
"supplier": null,
"status": "CRITICAL - OUT OF STOCK"
},
{
"name": "Radiator (Scania G460)",
"part_number": "G460",
"current": 0,
"minimum": 5,
"shortage": 5,
"category": "Engine",
"supplier": null,
"status": "CRITICAL - OUT OF STOCK"
},
{
"name": "TECHSHIELD TYRES",
"part_number": "315/80R22.5.",
"current": 0,
"minimum": 5,
"shortage": 5,
"category": "Tyres",
"supplier": null,
"status": "CRITICAL - OUT OF STOCK"
},
{
"name": "Intercooler Flexible Hose",
"part_number": "01",
"current": 0,
"minimum": 5,
"shortage": 5,
"category": "Engine",
"supplier": null,
"status": "CRITICAL - OUT OF STOCK"
},
{
"name": "Pressure Washer 1500psi",
"part_number": "1500psi",
"current": 0,
"minimum": 5,
"shortage": 5,
"category": "No Stock Itms",
"supplier": null,
"status": "CRITICAL - OUT OF STOCK"
},
{
"name": "Exhaust elbow (Scania 93H)",
"part_number": "H93",
"current": 0,
"minimum": 5,
"shortage": 5,
"category": "Accessories",
"supplier": null,
"status": "CRITICAL - OUT OF STOCK"
},
{
"name": "Air filter (Serco)",
"part_number": "30-00430-23",
"current": 0,
"minimum": 5,
"shortage": 5,
"category": "Accessories",
"supplier": null,
"status": "CRITICAL - OUT OF STOCK"
},
{
"name": "Turbo Charger (Isuzu KB 250)",
"part_number": "kb250",
"current": 1,
"minimum": 5,
"shortage": 4,
"category": "Engine",
"supplier": null,
"status": "WARNING - BELOW MINIMUM"
},
{
"name": "Tyre Rim 385/65r22.5",
"part_number": "385",
"current": 2,
"minimum": 5,
"shortage": 3,
"category": "Tyres",
"supplier": null,
"status": "WARNING - BELOW MINIMUM"
},
{
"name": "Torque Arm Bushes",
"part_number": "Trailers",
"current": 4,
"minimum": 5,
"shortage": 1,
"category": "SUSPENSION",
"supplier": null,
"status": "WARNING - BELOW MINIMUM"
},
{
"name": "Tyres 215/80R15C",
"part_number": "R15C",
"current": 4,
"minimum": 5,
"shortage": 1,
"category": "Tyres",
"supplier": null,
"status": "WARNING - BELOW MINIMUM"
},
{
"name": "Equalizer bushes",
"part_number": "Trailer",
"current": 5,
"minimum": 5,
"shortage": 0,
"category": "SUSPENSION",
"supplier": null,
"status": "OK"
}
]

### Test 5: Parts Request Analytics

```sql
-- Summary of recent activity
SELECT
  DATE(pr.created_at) as date,
  COUNT(*) as total_requests,
  COUNT(pr.inventory_id) as from_inventory,
  COUNT(*) FILTER (WHERE pr.inventory_id IS NULL) as manual_entry,
  SUM(pr.quantity) as total_parts,
  SUM(pr.total_price) as total_value,
  COUNT(DISTINCT pr.job_card_id) as unique_jobs
FROM parts_requests pr
WHERE pr.created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(pr.created_at)
ORDER BY date DESC;
```

ERROR: 42703: column pr.inventory_id does not exist
LINE 4: COUNT(pr.inventory_id) as from_inventory,
^

---

## 🔧 Performance Testing

### Test Query Performance

```sql
-- Should be fast with indexes
EXPLAIN ANALYZE
SELECT pr.*, i.name as inventory_name, i.quantity as available
FROM parts_requests pr
LEFT JOIN inventory i ON pr.inventory_id = i.id
WHERE pr.job_card_id = '<test-job-card-id>'
  AND pr.status = 'pending'
ORDER BY pr.created_at DESC;
```

ERROR: 42703: column pr.inventory_id does not exist
LINE 3: LEFT JOIN inventory i ON pr.inventory_id = i.id
^
**Expected:** Query time < 10ms

### Check Index Usage

```sql
-- Verify indexes exist
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('parts_requests', 'inventory', 'inventory_transactions')
ORDER BY tablename, indexname;
```

[
{
"schemaname": "public",
"tablename": "inventory",
"indexname": "inventory_part_number_key",
"indexdef": "CREATE UNIQUE INDEX inventory_part_number_key ON public.inventory USING btree (part_number)"
},
{
"schemaname": "public",
"tablename": "inventory",
"indexname": "inventory_pkey",
"indexdef": "CREATE UNIQUE INDEX inventory_pkey ON public.inventory USING btree (id)"
},
{
"schemaname": "public",
"tablename": "parts_requests",
"indexname": "parts_requests_pkey",
"indexdef": "CREATE UNIQUE INDEX parts_requests_pkey ON public.parts_requests USING btree (id)"
}
]

---

## 🚨 Error Scenarios to Test

### Scenario 1: Insufficient Stock

```sql
-- Try to request more than available
DO $$
DECLARE
  v_inventory_id uuid;
  v_available_qty integer;
BEGIN
  -- Get an inventory item
  SELECT id, quantity INTO v_inventory_id, v_available_qty
  FROM inventory
  LIMIT 1;

  -- Try to request more than available
  RAISE NOTICE 'Available: %', v_available_qty;
  RAISE NOTICE 'Trying to reserve: %', v_available_qty + 10;

  -- This should fail
  PERFORM reserve_inventory(
    gen_random_uuid(),
    v_inventory_id,
    v_available_qty + 10,
    'test@example.com'
  );

  RAISE NOTICE 'ERROR: Should have failed but didn''t!';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'SUCCESS: Correctly prevented insufficient stock reservation';
    RAISE NOTICE 'Error message: %', SQLERRM;
END $$;
```

### Scenario 2: Invalid Status Transition

```sql
-- Try to insert invalid status
INSERT INTO parts_requests (
  part_name,
  quantity,
  status
) VALUES (
  'Test Part',
  1,
  'invalid_status' -- Should fail
);
```

**Expected:** Error due to CHECK constraint

### Scenario 3: Concurrent Reservation

```sql
-- Simulate race condition
BEGIN;
  -- Transaction 1: Reserve 5 units
  SELECT reserve_inventory(
    gen_random_uuid(),
    '<inventory-id>'::uuid,
    5,
    'user1@example.com'
  );

  -- Transaction 2 (run in separate session): Try to reserve 5 more
  -- Should succeed only if enough stock exists
COMMIT;
```

---

## 📊 Data Quality Checks

### Check for Orphaned Records

```sql
-- Parts requests without job cards
SELECT COUNT(*) as orphaned_requests
FROM parts_requests
WHERE job_card_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM job_cards jc WHERE jc.id = parts_requests.job_card_id
  );
```

[
{
"orphaned_requests": 0
}
]

### Check for Missing Prices

```sql
-- Inventory items without prices
SELECT
  name,
  part_number,
  category,
  quantity
FROM inventory
WHERE unit_price IS NULL OR unit_price = 0
ORDER BY quantity DESC;
```

[
{
"name": "Mudflaps",
"part_number": "ac",
"category": "Accessories",
"quantity": 0
},
{
"name": "Shock Absorbers (Reefers)",
"part_number": "BPW ECO",
"category": "Alignment",
"quantity": 0
},
{
"name": "Clutch Master Cylinder",
"part_number": "wechai engine",
"category": "Engine",
"quantity": 0
},
{
"name": "Leaf Spring Blade (Shacman x30000)",
"part_number": "WECHAI SHACMAN",
"category": "Suspension",
"quantity": 0
},
{
"name": "Radiator (Scania G460)",
"part_number": "G460",
"category": "Engine",
"quantity": 0
},
{
"name": "Pressure Washer 1500psi",
"part_number": "1500psi",
"category": "No Stock Itms",
"quantity": 0
},
{
"name": "Air filter (Serco)",
"part_number": "30-00430-23",
"category": "Accessories",
"quantity": 0
}
]

### Check for Negative Quantities

```sql
-- Should never happen, but check anyway
SELECT
  name,
  part_number,
  quantity,
  min_quantity
FROM inventory
WHERE quantity < 0 OR min_quantity < 0;
```

---

## 🎯 Success Criteria

After running all checks, verify:

- [ ] All required tables exist
- [ ] Schema matches expected structure
- [ ] RLS policies are configured
- [ ] Sample data is loaded (if needed)
- [ ] Database functions work correctly
- [ ] Indexes are created
- [ ] Triggers fire correctly
- [ ] Constraints are enforced
- [ ] No orphaned records
- [ ] Query performance is acceptable
- [ ] Error scenarios behave correctly

---

## 🚀 Next Steps

1. **Run all verification queries** above
2. **Document any issues** found
3. **Share results** with development team
4. **Proceed with migration** if all checks pass
5. **Monitor closely** after deployment

---

## 📝 Reporting Template

```markdown
## Database Verification Results

**Date:** YYYY-MM-DD
**Environment:** [Development/Staging/Production]
**Performed by:** [Your Name]

### Tables Status

- [x] inventory - EXISTS
- [x] parts_requests - EXISTS
- [x] job_cards - EXISTS
- [ ] inventory_transactions - PENDING MIGRATION

### Data Status

- Inventory records: XXX items
- Parts requests: XXX requests
- Categories: XXX unique categories
- Average stock: XXX units

### Performance

- Inventory query time: X ms
- Parts request query time: X ms
- Index count: X indexes

### Issues Found

1. [Issue description]
2. [Issue description]

### Recommendations

1. [Recommendation]
2. [Recommendation]

### Ready for Migration?

[YES/NO with reasoning]
```

---

**Run these checks and share the results. I'm ready to help troubleshoot any issues you find!**
