# Adding Missing Fleet Vehicles (4H, 6H, UD)

## Problem

Trucks 4H, 6H, and UD cannot be selected for trip creation because they don't have Wialon GPS tracking units, so they don't exist in the `wialon_vehicles` table.

## Solution

A migration has been created to add these vehicles to the database with placeholder wialon_unit_ids (negative numbers to distinguish from real GPS-tracked vehicles).

## Apply the Migration

### Option 1: Via Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard → SQL Editor
2. Run the following SQL:

```sql
-- Insert missing fleet vehicles with negative wialon_unit_ids
INSERT INTO public.wialon_vehicles (wialon_unit_id, name, fleet_number, registration, vehicle_type)
VALUES
  (-4, '4H', '4H', NULL, 'Horse'),
  (-6, '6H', '6H', NULL, 'Horse'),
  (-999, 'UD', 'UD', NULL, 'Horse')
ON CONFLICT (wialon_unit_id) DO NOTHING;
```

### Option 2: Via Supabase CLI

```bash
npx supabase db push
```

## Files Changed

1. **Migration file**: `supabase/migrations/20260112200000_add_missing_fleet_vehicles.sql`
2. **useWialonVehicles hook**: `src/hooks/useWialonVehicles.ts` - Improved sorting to order by fleet number naturally
3. **AddTripDialog**: `src/components/trips/AddTripDialog.tsx` - Updated vehicle display to show fleet_number prominently
4. **EditTripDialog**: `src/components/trips/EditTripDialog.tsx` - Same display update for consistency

## Vehicle Display

After this change, vehicles will display as:

- `4H` (for vehicles without registration)
- `6H (ABC123GP)` (for vehicles with registration)
- `21H - ADS 4865 (ABC 123 GP)` (existing GPS-tracked vehicles)

This maintains consistency with the diesel records naming convention.
