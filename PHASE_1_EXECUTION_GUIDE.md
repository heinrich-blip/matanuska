# 🚀 Phase 1 Implementation Guide - READY TO EXECUTE

## ✅ Pre-Flight Check Complete

Based on your verification results, your database is **READY** for Phase 1 migrations:

- ✅ `inventory` table exists with proper schema
- ✅ `parts_requests` table exists (will be extended)
- ✅ `job_cards` table exists
- ✅ RLS policies are in place
- ✅ 20 inventory items with real data
- ⚠️ `inventory_transactions` table does NOT exist (will be created)
- ⚠️ New columns in `parts_requests` do NOT exist (will be added)
- ⚠️ Database functions do NOT exist (will be created)

---

## 🎯 What Phase 1 Will Do

### Migration 1: Extend parts_requests Table

**Adds 10 new columns:**

- `inventory_id` - Links to inventory table
- `unit_price` - Price at time of request
- `total_price` - Auto-calculated (quantity × unit_price)
- `requested_by` - Who created the request
- `approved_by` - Who approved it
- `approved_at` - When approved
- `rejected_by` - Who rejected it
- `rejected_at` - When rejected
- `rejection_reason` - Why rejected
- `is_from_inventory` - Auto-computed (true if inventory_id set)

**Creates:**

- 3 indexes for performance
- 1 check constraint for valid status
- 1 trigger to auto-calculate total_price
- 1 function (calculate_parts_request_total)

### Migration 2: Create inventory_transactions Table

**New audit log table with:**

- Transaction tracking (reserve, deduct, release, restock, adjustment)
- Quantity before/after snapshots
- User tracking (who performed the action)
- Notes field for context
- 4 indexes for performance
- RLS policies for security

### Migration 3: Create 4 Database Functions

1. **check_inventory_availability()** - Check if enough stock
2. **reserve_inventory()** - Log reservation (doesn't deduct yet)
3. **deduct_inventory()** - Actually remove from stock (with row locking)
4. **release_inventory_reservation()** - Cancel reservation

---

## 📝 TWO WAYS TO EXECUTE

### Option 1: Supabase SQL Editor (RECOMMENDED - Easiest)

1. **Open Supabase SQL Editor:**

   - Go to: https://supabase.com/dashboard/project/wxvhkljrbcpcgpgdqhsp/sql
   - Or: Supabase Dashboard → SQL Editor → "+ New query"

2. **Copy the complete migration:**

   - Open file: `PHASE_1_COMPLETE_MIGRATION.sql`
   - Copy **ALL** content (Ctrl+A, Ctrl+C)

3. **Paste and execute:**

   - Paste into SQL Editor
   - Click **"Run"** button (or Ctrl+Enter)

4. **Verify success:**

   - Look for green checkmark ✅
   - Should see messages like:
     - "✅ Migration 1 completed"
     - "✅ Migration 2 completed"
     - "✅ Migration 3 completed"
     - Verification tables showing counts

5. **Check for errors:**
   - If any red error appears, copy the error message
   - Don't panic - migrations are idempotent (safe to re-run)

### Option 2: Command Line (Alternative)

**Prerequisites:**

- `psql` installed
- DATABASE_URL environment variable set

```bash
# Set your database URL (replace YOUR_PASSWORD)
export DATABASE_URL='postgresql://postgres.wxvhkljrbcpcgpgdqhsp:YOUR_PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres'

# Run the migration script
./apply_phase1_migrations.sh
```

---

## 🔍 Post-Migration Verification

After running the migrations, verify everything worked:

### 1. Check New Columns

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'parts_requests'
  AND column_name IN (
    'inventory_id', 'unit_price', 'total_price',
    'requested_by', 'approved_by', 'is_from_inventory'
  )
ORDER BY column_name;
```

**Expected:** 10 rows returned

### 2. Check New Table

```sql
SELECT COUNT(*) as column_count
FROM information_schema.columns
WHERE table_name = 'inventory_transactions';
```

**Expected:** 10 (the number of columns in inventory_transactions)

### 3. Test Functions

```sql
-- Test availability check (use actual inventory ID)
SELECT check_inventory_availability(
  (SELECT id FROM inventory WHERE quantity > 0 LIMIT 1),
  1
);
```

**Expected:** `true`

### 4. Test Trigger

```sql
-- Create test record to verify trigger
BEGIN;
INSERT INTO parts_requests (
  part_name,
  quantity,
  unit_price,
  job_card_id,
  status
) VALUES (
  'TEST - Phase 1 Verification',
  5,
  100.00,
  (SELECT id FROM job_cards LIMIT 1),
  'pending'
) RETURNING part_name, quantity, unit_price, total_price;

-- Should show total_price = 500.00
-- Then rollback to not clutter data
ROLLBACK;
```

**Expected:** `total_price = 500.00`

---

## 🔄 Next: Regenerate TypeScript Types

After successful migration, update your frontend types:

```bash
# Navigate to project root
cd /workspaces/car-craft-co

# Regenerate types from Supabase
npx supabase gen types typescript --project-id wxvhkljrbcpcgpgdqhsp > src/integrations/supabase/types.ts

# Verify no TypeScript errors
npm run typecheck
```

---

## 🎉 Phase 1 Completion Checklist

- [ ] **Migration executed** via Supabase SQL Editor or command line
- [ ] **No errors** in migration output
- [ ] **Verification queries** all passed
- [ ] **TypeScript types** regenerated
- [ ] **No TypeScript errors** in project
- [ ] **Documentation updated** (mark results in DATABASE_VERIFICATION_GUIDE.md)

---

## ⚠️ Rollback Plan (If Something Goes Wrong)

If migrations fail or cause issues, you can rollback:

```sql
BEGIN;

-- Remove new table
DROP TABLE IF EXISTS inventory_transactions CASCADE;

-- Remove new columns
ALTER TABLE parts_requests
  DROP COLUMN IF EXISTS inventory_id CASCADE,
  DROP COLUMN IF EXISTS unit_price CASCADE,
  DROP COLUMN IF EXISTS total_price CASCADE,
  DROP COLUMN IF EXISTS requested_by CASCADE,
  DROP COLUMN IF EXISTS approved_by CASCADE,
  DROP COLUMN IF EXISTS approved_at CASCADE,
  DROP COLUMN IF EXISTS rejected_by CASCADE,
  DROP COLUMN IF EXISTS rejected_at CASCADE,
  DROP COLUMN IF EXISTS rejection_reason CASCADE,
  DROP COLUMN IF EXISTS is_from_inventory CASCADE;

-- Remove functions
DROP FUNCTION IF EXISTS check_inventory_availability CASCADE;
DROP FUNCTION IF EXISTS reserve_inventory CASCADE;
DROP FUNCTION IF EXISTS deduct_inventory CASCADE;
DROP FUNCTION IF EXISTS release_inventory_reservation CASCADE;
DROP FUNCTION IF EXISTS calculate_parts_request_total CASCADE;

COMMIT;
```

**Note:** Only use this if absolutely necessary. Migrations are designed to be safe.

---

## 🆘 Troubleshooting

### Issue: "relation already exists"

**Cause:** Migration already partially applied  
**Solution:** Safe to ignore - migrations are idempotent

### Issue: "column already exists"

**Cause:** Column was already added  
**Solution:** Safe to ignore - uses IF NOT EXISTS

### Issue: "permission denied"

**Cause:** Insufficient database permissions  
**Solution:** Verify you're using the correct DATABASE_URL with proper credentials

### Issue: "foreign key constraint"

**Cause:** Referenced table doesn't exist  
**Solution:** Verify inventory and parts_requests tables exist first

---

## 📋 Migration Files Created

All files are in `/workspaces/car-craft-co/supabase/migrations/`:

1. **20251031000001_extend_parts_requests_for_inventory.sql**
2. **20251031000002_create_inventory_transactions_table.sql**
3. **20251031000003_create_inventory_management_functions.sql**

Plus combined file:

- **PHASE_1_COMPLETE_MIGRATION.sql** (all-in-one)

---

## ✅ Ready to Execute?

**Recommended approach:**

1. Open `PHASE_1_COMPLETE_MIGRATION.sql`
2. Copy all content
3. Go to Supabase SQL Editor
4. Paste and click "Run"
5. Verify success messages
6. Run verification queries
7. Regenerate TypeScript types
8. Mark Phase 1 complete! 🎉

---

**Questions? Issues?** Check troubleshooting section above or review individual migration files.

**After Phase 1:** Proceed to `PHASE_2_COMPONENT_CREATION.md`
