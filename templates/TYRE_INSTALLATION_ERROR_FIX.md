# Tyre Installation Error Fix - VARCHAR(12) Constraint Issue

## Issue Summary

**Problem**: When installing a tyre from inventory onto a fleet vehicle, users see an error:

```
Failed to install due to Installation Failed.
Failed to update fleet position: value too long for type character varying(12)
```

However, after refreshing the app, the tyre appears to be successfully installed.

## Root Cause

The issue is caused by a database schema constraint mismatch:

### 1. **Database Schema Constraint**

The `fleet_*_tyres` tables (e.g., `fleet_33h_tyres`, `fleet_1t_tyres`, etc.) have a `registration_no` column with a `VARCHAR(12)` constraint in the actual database, even though the migrations show `TEXT`.

### 2. **Registration Number Lengths**

Some vehicles have registration numbers that exceed 12 characters:

- Example 1: `"ADZ9011/ADZ9010"` = **15 characters** ❌ (too long)
- Example 2: `"JFK963FS"` = **8 characters** ✅ (fits)
- Example 3: Multi-vehicle trailers often have dual registrations with slashes

### 3. **Installation Process**

The installation process in `InstallTyreDialog.tsx` performs these steps sequentially:

```typescript
// Step 1: Create tyre record in tyres table ✅
await supabase.from("tyres").insert({...})

// Step 2: Decrement inventory ✅
await supabase.from("tyre_inventory").update({quantity: quantity - 1})

// Step 3: Update fleet-specific table ❌ FAILS HERE
await supabase.from("fleet_33h_tyres").update({
  registration_no: "ADZ9011/ADZ9010",  // 15 chars > 12 char limit!
  ...
})

// Step 4: Create position history ✅ (if step 3 succeeds)
// Step 5: Create lifecycle event ✅ (if step 3 succeeds)
```

### 4. **Partial Success State**

When the error occurs:

- ✅ The tyre **IS** created in the `tyres` table with `current_fleet_position` set
- ✅ The inventory quantity **IS** decremented
- ❌ The fleet-specific table **FAILS** to update (throws error)
- ❌ History and lifecycle events **MAY NOT** be created

This is why users see the tyre as "installed" after refreshing—the system reads from the `tyres` table which shows `current_fleet_position` populated.

## Impact

### What Works:

- Tyre inventory tracking (quantity decremented)
- Tyre appears in "Installed Tyres" tab
- `current_fleet_position` is set correctly

### What Breaks:

- Fleet-specific position tables not updated correctly
- Position history may be incomplete
- Lifecycle tracking may be incomplete
- Users see confusing error messages

## Solution

### Database Migration Required

Apply the **combined migration** that fixes the VARCHAR(12) constraint AND repairs any orphaned installations:

```bash
supabase/migrations/20260116000002_combined_fix_and_repair.sql
```

This single migration:

1. Changes `registration_no` column from VARCHAR(12) to TEXT in all 26 fleet tables
2. Repairs any existing orphaned tyre installations

### How to Apply

**Option 1: Supabase Dashboard (RECOMMENDED)**

1. Go to Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy contents of `supabase/migrations/20260116000002_combined_fix_and_repair.sql`
4. Paste and click **Run**
5. Check notices for repair progress

**Option 2: Individual Migrations (Manual Order)**
If you prefer to run separately, you MUST apply in this order:

1. First: `20260116000000_fix_registration_no_length.sql`
2. Then: `20260116000001_repair_orphaned_tyre_installations.sql`

⚠️ Running repair before constraint fix will cause errors!

**Option 3: Supabase CLI**

1. Go to Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy contents of `supabase/migrations/20260116000000_fix_registration_no_length.sql`
4. Paste and click **Run**

**Option 2: Using the script**

```bash
./apply_registration_fix.sh
```

**Option 3: Supabase CLI**

```bash
supabase db push
```

## Verification

After applying the migration, test the installation:

1. Select a vehicle with a long registration (e.g., "ADZ9011/ADZ9010")
2. Install a tyre from inventory
3. Verify:
   - No error message appears
   - Tyre is installed successfully
   - Fleet-specific table is updated
   - Position history is created
   - Lifecycle event is recorded

## Technical Details

### Affected Tables (26 total)

- `fleet_1h_tyres`, `fleet_1t_tyres`, `fleet_2t_tyres`, `fleet_3t_tyres`
- `fleet_4f_tyres`, `fleet_4h_tyres`, `fleet_4t_tyres`, `fleet_5f_tyres`
- `fleet_6f_tyres`, `fleet_6h_tyres`, `fleet_7f_tyres`, `fleet_8f_tyres`
- `fleet_14l_tyres`, `fleet_15l_tyres`, `fleet_21h_tyres`, `fleet_22h_tyres`
- `fleet_23h_tyres`, `fleet_24h_tyres`, `fleet_26h_tyres`, `fleet_28h_tyres`
- `fleet_29h_tyres`, `fleet_30h_tyres`, `fleet_31h_tyres`, `fleet_32h_tyres`
- `fleet_33h_tyres`, `fleet_ud_tyres`

### Column Change

```
Before: registration_no VARCHAR(12)
After:  registration_no TEXT
```

### Code References

- Installation logic: [src/components/dialogs/InstallTyreDialog.tsx](src/components/dialogs/InstallTyreDialog.tsx#L287-L495)
- Fleet config: [src/constants/fleetTyreConfig.ts](src/constants/fleetTyreConfig.ts#L484-L495)
- Error location: Line 421-423 in InstallTyreDialog.tsx

## Prevention

To prevent similar issues in the future:

1. **Always use TEXT for registration/identifier columns** unless there's a specific business reason for length constraints
2. **Validate string lengths** in application code before database operations
3. **Add proper error handling** with rollback logic for multi-step transactions
4. **Consider using database transactions** to ensure atomicity of installations

## Related Files

- Migration: `supabase/migrations/20260116000000_fix_registration_no_length.sql`
- Apply script: `apply_registration_fix.sh`
- Component: `src/components/dialogs/InstallTyreDialog.tsx`
- Fleet config: `src/constants/fleetTyreConfig.ts`
