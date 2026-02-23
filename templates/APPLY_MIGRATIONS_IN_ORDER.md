# APPLY THESE MIGRATIONS IN ORDER

## ⚠️ CRITICAL: Run These TWO Migrations Separately

The combined migration doesn't work because PostgreSQL executes everything in one transaction.
You MUST run these migrations in separate steps:

---

## STEP 1: Fix the VARCHAR(12) Constraint

Copy and paste this SQL into Supabase SQL Editor and click **Run**:

```sql
-- Fix VARCHAR(12) constraint on all fleet tables
-- Run this FIRST, then run Step 2

ALTER TABLE IF EXISTS public.fleet_1h_tyres ALTER COLUMN registration_no TYPE TEXT;
ALTER TABLE IF EXISTS public.fleet_1t_tyres ALTER COLUMN registration_no TYPE TEXT;
ALTER TABLE IF EXISTS public.fleet_2t_tyres ALTER COLUMN registration_no TYPE TEXT;
ALTER TABLE IF EXISTS public.fleet_3t_tyres ALTER COLUMN registration_no TYPE TEXT;
ALTER TABLE IF EXISTS public.fleet_4f_tyres ALTER COLUMN registration_no TYPE TEXT;
ALTER TABLE IF EXISTS public.fleet_4h_tyres ALTER COLUMN registration_no TYPE TEXT;
ALTER TABLE IF EXISTS public.fleet_4t_tyres ALTER COLUMN registration_no TYPE TEXT;
ALTER TABLE IF EXISTS public.fleet_5f_tyres ALTER COLUMN registration_no TYPE TEXT;
ALTER TABLE IF EXISTS public.fleet_6f_tyres ALTER COLUMN registration_no TYPE TEXT;
ALTER TABLE IF EXISTS public.fleet_6h_tyres ALTER COLUMN registration_no TYPE TEXT;
ALTER TABLE IF EXISTS public.fleet_7f_tyres ALTER COLUMN registration_no TYPE TEXT;
ALTER TABLE IF EXISTS public.fleet_8f_tyres ALTER COLUMN registration_no TYPE TEXT;
ALTER TABLE IF EXISTS public.fleet_14l_tyres ALTER COLUMN registration_no TYPE TEXT;
ALTER TABLE IF EXISTS public.fleet_15l_tyres ALTER COLUMN registration_no TYPE TEXT;
ALTER TABLE IF EXISTS public.fleet_21h_tyres ALTER COLUMN registration_no TYPE TEXT;
ALTER TABLE IF EXISTS public.fleet_22h_tyres ALTER COLUMN registration_no TYPE TEXT;
ALTER TABLE IF EXISTS public.fleet_23h_tyres ALTER COLUMN registration_no TYPE TEXT;
ALTER TABLE IF EXISTS public.fleet_24h_tyres ALTER COLUMN registration_no TYPE TEXT;
ALTER TABLE IF EXISTS public.fleet_26h_tyres ALTER COLUMN registration_no TYPE TEXT;
ALTER TABLE IF EXISTS public.fleet_28h_tyres ALTER COLUMN registration_no TYPE TEXT;
ALTER TABLE IF EXISTS public.fleet_29h_tyres ALTER COLUMN registration_no TYPE TEXT;
ALTER TABLE IF EXISTS public.fleet_30h_tyres ALTER COLUMN registration_no TYPE TEXT;
ALTER TABLE IF EXISTS public.fleet_31h_tyres ALTER COLUMN registration_no TYPE TEXT;
ALTER TABLE IF EXISTS public.fleet_32h_tyres ALTER COLUMN registration_no TYPE TEXT;
ALTER TABLE IF EXISTS public.fleet_33h_tyres ALTER COLUMN registration_no TYPE TEXT;
ALTER TABLE IF EXISTS public.fleet_ud_tyres ALTER COLUMN registration_no TYPE TEXT;
```

**✅ Wait for this to complete successfully before proceeding!**

---

## STEP 1.5: VERIFY the Changes Worked

Before running Step 2, verify that the column type actually changed by running this query:

```sql
-- Check if registration_no is now TEXT type
SELECT
    table_name,
    column_name,
    data_type,
    character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name LIKE 'fleet_%_tyres'
  AND column_name = 'registration_no'
ORDER BY table_name;
```

**Expected Result:** `data_type` should be `text` (not `character varying`), and `character_maximum_length` should be `NULL`.

**If you see `character varying` with `character_maximum_length = 12`:**

- The ALTER TABLE statements didn't work
- Try running them again OR
- Run this alternative version that forces the change:

```sql
-- Force change registration_no to TEXT (alternative method)
-- Only run this if Step 1 didn't work

DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name LIKE 'fleet_%_tyres'
    LOOP
        EXECUTE format('ALTER TABLE %I ALTER COLUMN registration_no TYPE TEXT', tbl);
        RAISE NOTICE 'Updated %', tbl;
    END LOOP;
END $$;
```

---

## STEP 2: Repair Orphaned Installations

After Step 1 completes, copy and paste this SQL into Supabase SQL Editor and click **Run**:

```sql
-- Repair orphaned tyre installations
-- Run this AFTER Step 1 completes

DO $$
DECLARE
    tyre_record RECORD;
    fleet_number TEXT;
    registration TEXT;
    position_code TEXT;
    fleet_table TEXT;
    table_exists BOOLEAN;
    repair_count INTEGER := 0;
BEGIN
    RAISE NOTICE '=== Starting orphaned tyre repair ===';

    FOR tyre_record IN
        SELECT
            id,
            current_fleet_position,
            position
        FROM tyres
        WHERE current_fleet_position IS NOT NULL
          AND current_fleet_position != ''
    LOOP
        fleet_number := substring(tyre_record.current_fleet_position from '^(\d+[A-Z]+)');
        registration := trim(substring(tyre_record.current_fleet_position from '^\d+[A-Z]+\s+([^-]+)'));
        position_code := substring(tyre_record.current_fleet_position from '-([A-Z0-9]+)$');

        IF fleet_number IS NULL OR registration IS NULL OR position_code IS NULL THEN
            RAISE NOTICE 'Skipping tyre % - could not parse: %',
                tyre_record.id, tyre_record.current_fleet_position;
            CONTINUE;
        END IF;

        fleet_table := 'fleet_' || lower(fleet_number) || '_tyres';

        SELECT EXISTS (
            SELECT FROM information_schema.tables t
            WHERE t.table_schema = 'public'
            AND t.table_name = fleet_table
        ) INTO table_exists;

        IF NOT table_exists THEN
            RAISE NOTICE 'Table % does not exist', fleet_table;
            CONTINUE;
        END IF;

        EXECUTE format(
            'INSERT INTO %I (registration_no, position, tyre_code, updated_at)
             VALUES ($1, $2, $3, NOW())
             ON CONFLICT (registration_no, position)
             DO UPDATE SET
                tyre_code = EXCLUDED.tyre_code,
                updated_at = NOW()',
            fleet_table
        ) USING registration, position_code, tyre_record.id;

        repair_count := repair_count + 1;
        RAISE NOTICE 'Synced tyre % to %: % at %',
            tyre_record.id, fleet_table, registration, position_code;

    END LOOP;

    RAISE NOTICE '=== Repair completed. Fixed % installations ===', repair_count;
END $$;
```

**✅ Done! Check the output to see how many installations were repaired.**

---

## Why Two Steps?

PostgreSQL executes each migration in a single transaction. The schema changes (ALTER TABLE) don't become visible to the DO block within the same transaction, causing the VARCHAR(12) error to persist.

By running them as separate steps, the schema changes are committed before the repair script runs.

## Verification

After both steps complete:

1. Try installing a tyre on a vehicle with a long registration → Should work
2. Go to fleet inspection → Installed tyres should now appear

## Quick Reference Files

- Detailed explanation: [FLEET_INSPECTION_MISSING_TYRES_FIX.md](FLEET_INSPECTION_MISSING_TYRES_FIX.md)
- Installation error details: [TYRE_INSTALLATION_ERROR_FIX.md](TYRE_INSTALLATION_ERROR_FIX.md)
