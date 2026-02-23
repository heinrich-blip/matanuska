# 🗄️ Phase 1: Database Setup & Migration

**Phase:** 1 of 5  
**Timeline:** Day 1 (2-3 hours)  
**Prerequisites:** Supabase access, SQL editor access  
**Completion Criteria:** All migrations applied successfully, types regenerated

---

## 📋 Phase Overview

This phase focuses on **database schema changes** required to support inventory selection in the parts request system. We'll extend existing tables, create new audit logging, and add PostgreSQL functions for inventory management.

**What This Phase Delivers:**

- ✅ Extended `parts_requests` table with inventory linking
- ✅ New `inventory_transactions` audit log table
- ✅ PostgreSQL functions for inventory operations
- ✅ Sample test data (development only)
- ✅ Regenerated TypeScript types

---

## 🎯 Objectives

1. Link parts requests to inventory items
2. Track pricing at time of request
3. Log all inventory movements
4. Provide transactional inventory functions
5. Ensure data integrity with constraints

---

## 📊 Pre-Implementation Checklist

### ✅ Before You Start:

- [ ] Backup production database (if applicable)
- [ ] Confirm Supabase access credentials
- [ ] Open SQL Editor in Supabase dashboard
- [ ] Have `DATABASE_VERIFICATION_GUIDE.md` open
- [ ] Notify team of database changes
- [ ] Set maintenance window (if production)

### 🔍 Verification Queries:

Run these queries **BEFORE** starting to document current state:

```sql
-- 1. Check existing parts_requests structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'parts_requests'
ORDER BY ordinal_position;


[
  {
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "column_name": "part_name",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "column_name": "part_number",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "column_name": "quantity",
    "data_type": "integer",
    "is_nullable": "NO"
  },
  {
    "column_name": "job_card_id",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "column_name": "notes",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "column_name": "status",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  }
]
-- 2. Check existing inventory structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'inventory'
ORDER BY ordinal_position;
[
  {
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "column_name": "name",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "column_name": "part_number",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "column_name": "category",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "column_name": "quantity",
    "data_type": "integer",
    "is_nullable": "NO"
  },
  {
    "column_name": "min_quantity",
    "data_type": "integer",
    "is_nullable": "NO"
  },
  {
    "column_name": "unit_price",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "column_name": "location",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "column_name": "supplier",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  }
]
-- 3. Count existing records
SELECT
  'parts_requests' as table_name,
  COUNT(*) as record_count
FROM parts_requests
UNION ALL
SELECT
  'inventory' as table_name,
  COUNT(*) as record_count
FROM inventory;
[
  {
    "table_name": "parts_requests",
    "record_count": 0
  },
  {
    "table_name": "inventory",
    "record_count": 20
  }
]
-- 4. Check for existing inventory_transactions table
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_name = 'inventory_transactions'
);
```
[
  {
    "exists": false
  }
]
**📝 Document Results:** Save output to a file for rollback reference.

---

## 🚀 Migration 1: Extend parts_requests Table

### Purpose:

Add columns to link parts requests with inventory items and track pricing.

### Changes:

- Add `inventory_id` - Foreign key to inventory table
- Add `unit_price` - Price per unit at time of request
- Add `total_price` - Calculated field (quantity × unit_price)
- Add `requested_by` - Who created the request
- Add approval tracking fields

### SQL Script:

```sql
-- Migration 1: Extend parts_requests table
-- Run this in Supabase SQL Editor

BEGIN;

-- Add new columns to parts_requests
ALTER TABLE parts_requests
  ADD COLUMN IF NOT EXISTS inventory_id UUID REFERENCES inventory(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS unit_price DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS total_price DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS requested_by TEXT,
  ADD COLUMN IF NOT EXISTS approved_by TEXT,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS rejected_by TEXT,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Add computed column for inventory source tracking
ALTER TABLE parts_requests
  ADD COLUMN IF NOT EXISTS is_from_inventory BOOLEAN
  GENERATED ALWAYS AS (inventory_id IS NOT NULL) STORED;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_parts_requests_inventory_id
  ON parts_requests(inventory_id);

CREATE INDEX IF NOT EXISTS idx_parts_requests_status
  ON parts_requests(status);

CREATE INDEX IF NOT EXISTS idx_parts_requests_job_card_id
  ON parts_requests(job_card_id);

-- Add check constraint for valid status
ALTER TABLE parts_requests
  DROP CONSTRAINT IF EXISTS check_valid_status;

ALTER TABLE parts_requests
  ADD CONSTRAINT check_valid_status
  CHECK (status IN ('pending', 'approved', 'rejected', 'fulfilled', 'cancelled'));

-- Add trigger to auto-calculate total_price
CREATE OR REPLACE FUNCTION calculate_parts_request_total()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.unit_price IS NOT NULL AND NEW.quantity IS NOT NULL THEN
    NEW.total_price := NEW.quantity * NEW.unit_price;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calculate_parts_request_total ON parts_requests;

CREATE TRIGGER trigger_calculate_parts_request_total
  BEFORE INSERT OR UPDATE OF quantity, unit_price
  ON parts_requests
  FOR EACH ROW
  EXECUTE FUNCTION calculate_parts_request_total();

COMMIT;

-- Verify changes
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'parts_requests'
  AND column_name IN (
    'inventory_id',
    'unit_price',
    'total_price',
    'requested_by',
    'is_from_inventory'
  );
```

### ✅ Verification:

```sql
-- Test the trigger
INSERT INTO parts_requests (
  part_name,
  part_number,
  quantity,
  unit_price,
  job_card_id,
  status
) VALUES (
  'TEST PART',
  'TEST-001',
  5,
  100.00,
  (SELECT id FROM job_cards LIMIT 1),
  'pending'
);

-- Check if total_price was auto-calculated (should be 500.00)
SELECT part_name, quantity, unit_price, total_price, is_from_inventory
FROM parts_requests
WHERE part_name = 'TEST PART';

-- Clean up test data
DELETE FROM parts_requests WHERE part_name = 'TEST PART';
```

**Expected Result:** `total_price = 500.00`, `is_from_inventory = false`

---

## 🚀 Migration 2: Create inventory_transactions Table

### Purpose:

Create an audit log for all inventory movements (reservations, deductions, releases).

### Changes:

- New table: `inventory_transactions`
- Tracks all quantity changes
- Stores who, what, when, why

### SQL Script:

```sql
-- Migration 2: Create inventory_transactions table
-- Run this in Supabase SQL Editor

BEGIN;

-- Create inventory_transactions table
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  inventory_id UUID REFERENCES inventory(id) ON DELETE CASCADE,
  parts_request_id UUID REFERENCES parts_requests(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (
    transaction_type IN ('reserve', 'deduct', 'release', 'restock', 'adjustment')
  ),
  quantity_change INTEGER NOT NULL,
  quantity_before INTEGER NOT NULL,
  quantity_after INTEGER NOT NULL,
  performed_by TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_inventory_transactions_inventory_id
  ON inventory_transactions(inventory_id);

CREATE INDEX idx_inventory_transactions_parts_request_id
  ON inventory_transactions(parts_request_id);

CREATE INDEX idx_inventory_transactions_created_at
  ON inventory_transactions(created_at DESC);

-- Add RLS (Row Level Security)
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can read all transactions
CREATE POLICY "Users can view inventory transactions"
  ON inventory_transactions FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can insert transactions
CREATE POLICY "Users can insert inventory transactions"
  ON inventory_transactions FOR INSERT
  TO authenticated
  WITH CHECK (true);

COMMIT;

-- Verify table creation
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'inventory_transactions'
ORDER BY ordinal_position;
```

### ✅ Verification:

```sql
-- Test insert
INSERT INTO inventory_transactions (
  inventory_id,
  transaction_type,
  quantity_change,
  quantity_before,
  quantity_after,
  performed_by,
  notes
) VALUES (
  (SELECT id FROM inventory LIMIT 1),
  'adjustment',
  10,
  50,
  60,
  'system@test.com',
  'Test transaction'
);

-- Verify insertion
SELECT * FROM inventory_transactions
WHERE notes = 'Test transaction';

-- Clean up
DELETE FROM inventory_transactions
WHERE notes = 'Test transaction';
```

**Expected Result:** Transaction logged successfully

---

## 🚀 Migration 3: Create Database Functions

### Purpose:

Provide atomic, transactional operations for inventory management.

### Functions:

1. `check_inventory_availability()` - Check if enough stock
2. `reserve_inventory()` - Log reservation (doesn't deduct)
3. `deduct_inventory()` - Actually remove from stock
4. `release_inventory_reservation()` - Cancel reservation

### SQL Script:

```sql
-- Migration 3: Create inventory management functions
-- Run this in Supabase SQL Editor

BEGIN;

-- Function 1: Check inventory availability
CREATE OR REPLACE FUNCTION check_inventory_availability(
  p_inventory_id UUID,
  p_quantity INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_quantity INTEGER;
BEGIN
  SELECT quantity INTO v_current_quantity
  FROM inventory
  WHERE id = p_inventory_id;

  IF v_current_quantity IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN v_current_quantity >= p_quantity;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function 2: Reserve inventory
CREATE OR REPLACE FUNCTION reserve_inventory(
  p_parts_request_id UUID,
  p_inventory_id UUID,
  p_quantity INTEGER,
  p_performed_by TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_quantity INTEGER;
  v_available BOOLEAN;
BEGIN
  -- Lock the inventory row
  SELECT quantity INTO v_current_quantity
  FROM inventory
  WHERE id = p_inventory_id
  FOR UPDATE;

  -- Check availability
  v_available := check_inventory_availability(p_inventory_id, p_quantity);

  IF NOT v_available THEN
    RAISE EXCEPTION 'Insufficient inventory. Required: %, Available: %',
      p_quantity, v_current_quantity;
  END IF;

  -- Log reservation (doesn't change inventory.quantity yet)
  INSERT INTO inventory_transactions (
    inventory_id,
    parts_request_id,
    transaction_type,
    quantity_change,
    quantity_before,
    quantity_after,
    performed_by,
    notes
  ) VALUES (
    p_inventory_id,
    p_parts_request_id,
    'reserve',
    -p_quantity,
    v_current_quantity,
    v_current_quantity, -- No change yet
    p_performed_by,
    'Inventory reserved for parts request'
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function 3: Deduct inventory (when request approved)
CREATE OR REPLACE FUNCTION deduct_inventory(
  p_parts_request_id UUID,
  p_inventory_id UUID,
  p_quantity INTEGER,
  p_performed_by TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_quantity INTEGER;
BEGIN
  -- Lock the inventory row
  SELECT quantity INTO v_current_quantity
  FROM inventory
  WHERE id = p_inventory_id
  FOR UPDATE;

  -- Check availability
  IF v_current_quantity < p_quantity THEN
    RAISE EXCEPTION 'Insufficient inventory. Required: %, Available: %',
      p_quantity, v_current_quantity;
  END IF;

  -- Deduct from inventory
  UPDATE inventory
  SET quantity = quantity - p_quantity
  WHERE id = p_inventory_id;

  -- Log deduction
  INSERT INTO inventory_transactions (
    inventory_id,
    parts_request_id,
    transaction_type,
    quantity_change,
    quantity_before,
    quantity_after,
    performed_by,
    notes
  ) VALUES (
    p_inventory_id,
    p_parts_request_id,
    'deduct',
    -p_quantity,
    v_current_quantity,
    v_current_quantity - p_quantity,
    p_performed_by,
    'Inventory deducted for approved parts request'
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function 4: Release reservation (when request cancelled/rejected)
CREATE OR REPLACE FUNCTION release_inventory_reservation(
  p_parts_request_id UUID,
  p_inventory_id UUID,
  p_quantity INTEGER,
  p_performed_by TEXT,
  p_reason TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_quantity INTEGER;
BEGIN
  -- Get current quantity
  SELECT quantity INTO v_current_quantity
  FROM inventory
  WHERE id = p_inventory_id;

  -- Log release (doesn't change inventory.quantity)
  INSERT INTO inventory_transactions (
    inventory_id,
    parts_request_id,
    transaction_type,
    quantity_change,
    quantity_before,
    quantity_after,
    performed_by,
    notes
  ) VALUES (
    p_inventory_id,
    p_parts_request_id,
    'release',
    p_quantity,
    v_current_quantity,
    v_current_quantity, -- No change
    p_performed_by,
    COALESCE(p_reason, 'Reservation released')
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION check_inventory_availability TO authenticated;
GRANT EXECUTE ON FUNCTION reserve_inventory TO authenticated;
GRANT EXECUTE ON FUNCTION deduct_inventory TO authenticated;
GRANT EXECUTE ON FUNCTION release_inventory_reservation TO authenticated;

COMMIT;

-- Verify functions exist
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name IN (
  'check_inventory_availability',
  'reserve_inventory',
  'deduct_inventory',
  'release_inventory_reservation'
);
```

### ✅ Verification:

```sql
-- Test availability check
SELECT check_inventory_availability(
  (SELECT id FROM inventory LIMIT 1),
  5
);

-- Expected: TRUE (if inventory has ≥5 units)

-- Test reserve function (run in transaction to rollback)
BEGIN;
  SELECT reserve_inventory(
    NULL, -- parts_request_id (NULL for test)
    (SELECT id FROM inventory WHERE quantity > 10 LIMIT 1),
    5,
    'test@example.com'
  );

  -- Check if transaction was logged
  SELECT * FROM inventory_transactions
  WHERE performed_by = 'test@example.com'
  ORDER BY created_at DESC LIMIT 1;
ROLLBACK;
```

**Expected Result:** Functions execute without errors

---

## 🚀 Migration 4: Insert Sample Data (Development Only)

### Purpose:

Provide test data for development and testing.

### ⚠️ WARNING:

**DO NOT RUN THIS IN PRODUCTION!** This is for development environments only.

### SQL Script:

```sql
-- Migration 4: Sample data for development
-- ⚠️ ONLY RUN THIS IN DEVELOPMENT ENVIRONMENT ⚠️

BEGIN;

-- Insert sample inventory items (if not exists)
INSERT INTO inventory (name, part_number, category, quantity, min_quantity, unit_price, location, supplier)
VALUES
  ('Brake Pads - Front', 'BP-FRONT-001', 'Brakes', 25, 10, 450.00, 'Warehouse A', 'Auto Parts Co'),
  ('Brake Pads - Rear', 'BP-REAR-001', 'Brakes', 30, 10, 420.00, 'Warehouse A', 'Auto Parts Co'),
  ('Engine Oil 5W-30', 'OIL-5W30-5L', 'Fluids', 50, 20, 280.00, 'Warehouse B', 'Oil Supplies Ltd'),
  ('Oil Filter', 'FILTER-001', 'Filters', 40, 15, 85.00, 'Warehouse B', 'Filter Plus'),
  ('Air Filter', 'FILTER-002', 'Filters', 35, 15, 120.00, 'Warehouse B', 'Filter Plus'),
  ('Spark Plugs (Set of 4)', 'SPARK-001', 'Ignition', 60, 20, 180.00, 'Warehouse C', 'Ignition Experts'),
  ('Battery 12V', 'BATT-12V-001', 'Electrical', 15, 5, 1200.00, 'Warehouse C', 'Power Source Inc'),
  ('Wiper Blades (Pair)', 'WIPER-001', 'Accessories', 45, 20, 150.00, 'Warehouse D', 'Auto Accessories'),
  ('Coolant 5L', 'COOL-5L-001', 'Fluids', 40, 15, 220.00, 'Warehouse B', 'Oil Supplies Ltd'),
  ('Timing Belt', 'BELT-TIMING-001', 'Engine', 20, 8, 650.00, 'Warehouse C', 'Engine Parts Pro')
ON CONFLICT (part_number) DO NOTHING;

COMMIT;

-- Verify sample data
SELECT
  name,
  part_number,
  category,
  quantity,
  unit_price,
  location
FROM inventory
WHERE part_number IN (
  'BP-FRONT-001',
  'OIL-5W30-5L',
  'BATT-12V-001'
)
ORDER BY name;
```

### ✅ Verification:

```sql
-- Count inventory items
SELECT category, COUNT(*) as item_count, SUM(quantity) as total_quantity
FROM inventory
GROUP BY category
ORDER BY category;
```

**Expected Result:** At least 10 items across multiple categories

---

## 🔄 Regenerate TypeScript Types

### Purpose:

Update frontend type definitions to match new database schema.

### Steps:

1. **Option A: Using Supabase CLI (Recommended)**

```bash
# Navigate to project root
cd /workspaces/car-craft-co

# Generate types from local Supabase instance
npx supabase gen types typescript --local > src/integrations/supabase/types.ts

# OR from remote (if deployed)
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/integrations/supabase/types.ts
```

2. **Option B: Manual Download from Dashboard**

- Go to Supabase Dashboard → Settings → API
- Scroll to "TypeScript Types"
- Click "Generate Types"
- Copy and replace content in `src/integrations/supabase/types.ts`

### ✅ Verification:

```bash
# Check if types file was updated
cat src/integrations/supabase/types.ts | grep "inventory_id"
cat src/integrations/supabase/types.ts | grep "inventory_transactions"
```

**Expected Result:** Both strings found in types file

---

## 📋 Phase 1 Completion Checklist

### Database Changes:

- [ ] Migration 1 applied (parts_requests extended)
- [ ] Migration 2 applied (inventory_transactions created)
- [ ] Migration 3 applied (functions created)
- [ ] Migration 4 applied (sample data, dev only)
- [ ] All indexes created
- [ ] All constraints added
- [ ] RLS policies active

### Verification:

- [ ] Trigger calculates total_price correctly
- [ ] inventory_id foreign key works
- [ ] is_from_inventory computes correctly
- [ ] Transactions table accepts inserts
- [ ] All 4 functions execute without errors
- [ ] check_inventory_availability returns boolean
- [ ] reserve_inventory logs transaction
- [ ] deduct_inventory updates quantity
- [ ] release_inventory_reservation logs release

### TypeScript:

- [ ] Types regenerated successfully
- [ ] `inventory_id` type exists in parts_requests
- [ ] `inventory_transactions` table types exist
- [ ] No TypeScript compilation errors

### Documentation:

- [ ] Pre-migration state documented
- [ ] All SQL scripts saved
- [ ] Verification results recorded
- [ ] Rollback plan prepared (if needed)

---

## ⏭️ Next Phase

**Phase 2: React Component Creation**

- Create InventorySearchDialog component
- Create EnhancedRequestPartsDialog component
- Build custom hooks for inventory management
- Implement search, filtering, and stock validation

**Prerequisites for Phase 2:**

- ✅ Phase 1 completed successfully
- ✅ Types regenerated
- ✅ Development server running
- ✅ No TypeScript errors

---

## 🆘 Troubleshooting

### Issue: Migration fails with "column already exists"

**Solution:**

```sql
-- Check if column exists
SELECT column_name FROM information_schema.columns
WHERE table_name = 'parts_requests' AND column_name = 'inventory_id';

-- If exists, skip ALTER TABLE or use IF NOT EXISTS clause
```

### Issue: Function creation fails

**Solution:**

```sql
-- Drop and recreate
DROP FUNCTION IF EXISTS check_inventory_availability CASCADE;
-- Then run CREATE FUNCTION again
```

### Issue: Permission denied

**Solution:**

```sql
-- Grant necessary permissions
GRANT ALL ON inventory_transactions TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
```

### Issue: Type generation fails

**Solution:**

```bash
# Check Supabase CLI version
npx supabase --version

# Update if needed
npm install supabase@latest

# Verify Supabase is running
npx supabase status
```

---

**Phase 1 Complete! 🎉**  
**Estimated Time:** 2-3 hours  
**Next:** Proceed to Phase 2 - Component Creation
