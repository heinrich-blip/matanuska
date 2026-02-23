# Load Status Workflow Migration - Step-by-Step Guide

## ⚠️ PostgreSQL Enum Constraint

PostgreSQL requires enum values to be **committed** before they can be used in the same session. This means we need to apply migrations in two separate steps.

---

## 📋 Migration Steps (IN ORDER)

### Step 1: Add Enum Values FIRST

**File:** `supabase/migrations/20251111_001_add_enum_values.sql`

**In Supabase SQL Editor, run:**

```sql
ALTER TYPE load_status ADD VALUE IF NOT EXISTS 'arrived_at_loading';
ALTER TYPE load_status ADD VALUE IF NOT EXISTS 'loading';
ALTER TYPE load_status ADD VALUE IF NOT EXISTS 'loading_completed';
ALTER TYPE load_status ADD VALUE IF NOT EXISTS 'arrived_at_delivery';
ALTER TYPE load_status ADD VALUE IF NOT EXISTS 'offloading';
ALTER TYPE load_status ADD VALUE IF NOT EXISTS 'offloading_completed';
ALTER TYPE load_status ADD VALUE IF NOT EXISTS 'completed';
ALTER TYPE load_status ADD VALUE IF NOT EXISTS 'on_hold';
```

✅ **Expected Result:** "ALTER TYPE" for each line

---

### Step 2: Add Columns and Functions SECOND

**File:** `supabase/migrations/20251111_002_add_workflow_columns.sql`

**In Supabase SQL Editor, run the entire file** (or copy-paste from the file)

✅ **Expected Results:**

- 9 new timestamp columns added to `loads` table
- 2 indexes created
- 3 duration calculation functions created
- 1 analytics view created
- 1 trigger created
- Column comments added

---

## 🧪 Verify Installation

After running both migrations, verify with:

```sql
-- Check enum values
SELECT enumlabel
FROM pg_enum
WHERE enumtypid = 'load_status'::regtype
ORDER BY enumsortorder;

-- Should show all values including:
-- pending, assigned, in_transit, delivered, cancelled, failed_delivery
-- + NEW: arrived_at_loading, loading, loading_completed, arrived_at_delivery,
--        offloading, offloading_completed, completed, on_hold

-- Check new columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'loads'
  AND column_name IN (
    'arrived_at_pickup',
    'loading_started_at',
    'loading_completed_at',
    'departure_time',
    'arrived_at_delivery',
    'offloading_started_at',
    'offloading_completed_at',
    'delivered_at',
    'completed_at'
  );

-- Check view exists
SELECT COUNT(*) FROM load_workflow_analytics;

-- Check functions exist
SELECT routine_name
FROM information_schema.routines
WHERE routine_name IN (
  'calculate_loading_duration',
  'calculate_offloading_duration',
  'calculate_transit_time'
);
```

---

## 🚀 After Migration

1. **Regenerate TypeScript Types:**

   ```bash
   npx supabase gen types typescript --project-id wxvhkljrbcpcgpgdqhsp > src/integrations/supabase/types.ts
   ```

2. **Test Status Update:**

   ```sql
   -- Find a test load
   SELECT id, load_number, status FROM loads WHERE status = 'assigned' LIMIT 1;

   -- Update to new status (use actual ID)
   UPDATE loads
   SET status = 'arrived_at_loading', arrived_at_pickup = NOW()
   WHERE id = 'YOUR-LOAD-ID-HERE';
   ```

3. **Check UI:**
   - Open any load in LiveDeliveryTracking
   - You should see the LoadStatusWorkflow component
   - Click "Update" button to progress through statuses

---

## ❌ Troubleshooting

### Error: "unsafe use of new value"

**Cause:** Trying to use enum value before it's committed
**Solution:** Run Step 1 first, wait for commit, then run Step 2

### Error: "type load_status already has value"

**Cause:** Enum value already exists
**Solution:** Ignore - the `IF NOT EXISTS` clause handles this

### Error: "column already exists"

**Cause:** Columns already added
**Solution:** Ignore - the `IF NOT EXISTS` clause handles this

---

## 📁 Files Created

1. ✅ `20251111_001_add_enum_values.sql` - Enum additions (run FIRST)
2. ✅ `20251111_002_add_workflow_columns.sql` - Columns/functions (run SECOND)
3. ✅ `test_workflow_status_updates.sql` - Test queries
4. ✅ `LOAD_STATUS_ENUM_MAPPING.md` - Status reference
5. ✅ `src/constants/loadStatusWorkflow.ts` - TypeScript constants
6. ✅ `src/components/loads/LoadStatusWorkflow.tsx` - UI component

---

## 🎯 Quick Start Command (Copy-Paste)

**Open Supabase SQL Editor and run these in order:**

```sql
-- PART 1: Add enum values (run this block first)
ALTER TYPE load_status ADD VALUE IF NOT EXISTS 'arrived_at_loading';
ALTER TYPE load_status ADD VALUE IF NOT EXISTS 'loading';
ALTER TYPE load_status ADD VALUE IF NOT EXISTS 'loading_completed';
ALTER TYPE load_status ADD VALUE IF NOT EXISTS 'arrived_at_delivery';
ALTER TYPE load_status ADD VALUE IF NOT EXISTS 'offloading';
ALTER TYPE load_status ADD VALUE IF NOT EXISTS 'offloading_completed';
ALTER TYPE load_status ADD VALUE IF NOT EXISTS 'completed';
ALTER TYPE load_status ADD VALUE IF NOT EXISTS 'on_hold';
```

**Wait for success, then run Part 2:**

Open `20251111_002_add_workflow_columns.sql` and run the entire file contents.

---

## ✅ Success Indicators

After completing both steps:

- ✅ No SQL errors
- ✅ 8 new enum values exist
- ✅ 9 new timestamp columns in `loads` table
- ✅ `load_workflow_analytics` view contains data
- ✅ UI shows LoadStatusWorkflow component
- ✅ Status updates work without errors

---

## 📊 Complete Status Flow

```
pending
  ↓
assigned
  ↓
arrived_at_loading (NEW - auto from geofence)
  ↓
loading (NEW - manual confirmation)
  ↓
loading_completed (NEW - manual confirmation)
  ↓
in_transit (existing)
  ↓
arrived_at_delivery (NEW - auto from geofence)
  ↓
offloading (NEW - manual confirmation)
  ↓
offloading_completed (NEW - manual confirmation)
  ↓
delivered (existing)
  ↓
completed (NEW - final state)
```
