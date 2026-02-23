# QUICK FIX GUIDE - Tyre Installation & Inspection Issues

## Problem

- Tyre installation fails with "value too long for type character varying(12)" error
- OR tyres don't appear in fleet inspection even though they're installed

## Root Cause

Fleet tables have VARCHAR(12) constraint on `registration_no` column, but some registrations are longer (e.g., "ADZ9011/ADZ9010" = 15 chars)

## ⚠️ SOLUTION - MUST RUN TWO MIGRATIONS SEPARATELY

**The combined migration approach doesn't work due to PostgreSQL transaction behavior.**

### 📋 Full Instructions with Copy/Paste SQL:

**👉 [APPLY_MIGRATIONS_IN_ORDER.md](APPLY_MIGRATIONS_IN_ORDER.md)** ← **START HERE**

This file contains:
- Step-by-step instructions
- Ready-to-copy SQL for both steps
- Explanation of why two steps are needed

### Quick Summary:

1. **STEP 1**: Run constraint fix SQL (changes VARCHAR(12) → TEXT)
2. **Wait for Step 1 to complete successfully**
3. **STEP 2**: Run repair script SQL (re-links orphaned tyres)
4. ✅ Done!

### Why Two Separate Steps?

PostgreSQL executes each migration in a single transaction. Schema changes (ALTER TABLE) aren't visible to code within the same transaction. 

By running them separately, the schema changes are committed to the database before the repair script runs.

## Verification

After both steps complete:

- ✅ Try installing a tyre on a vehicle with long registration → Should work
- ✅ Go to fleet inspection and select a vehicle → Installed tyres should appear

## Important Notes

- ⚠️ **Do NOT** try to run both in one migration file
- ⚠️ **Must wait** for Step 1 to complete before running Step 2
- ✅ Follow [APPLY_MIGRATIONS_IN_ORDER.md](APPLY_MIGRATIONS_IN_ORDER.md) exactly

## Detailed Documentation

- Installation error details: [TYRE_INSTALLATION_ERROR_FIX.md](TYRE_INSTALLATION_ERROR_FIX.md)
- Inspection issue details: [FLEET_INSPECTION_MISSING_TYRES_FIX.md](FLEET_INSPECTION_MISSING_TYRES_FIX.md)
