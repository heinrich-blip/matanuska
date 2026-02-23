# Load Calendar and Timestamp Enhancement

## Overview

This guide explains the new **expected timestamp fields** and **automatic calendar synchronization** for the load management system.

## What Was Added

### 1. New Timestamp Fields

Four new fields have been added to the `loads` table to track expected/scheduled times:

| Field                              | Purpose                                    | When to Use                                                        |
| ---------------------------------- | ------------------------------------------ | ------------------------------------------------------------------ |
| `expected_arrival_at_pickup`       | Scheduled time to arrive at loading point  | Set when planning the load - when driver should arrive for loading |
| `expected_departure_from_pickup`   | Scheduled time to depart after loading     | Set after loading time estimate - when loaded truck should depart  |
| `expected_arrival_at_delivery`     | Scheduled time to arrive at delivery point | Set based on travel time - when truck should arrive for offloading |
| `expected_departure_from_delivery` | Scheduled time to depart after offloading  | Set after offload estimate - when empty truck should leave         |

These fields are **different from** the existing actual timestamp fields (`arrived_at_pickup`, `departure_time`, `arrived_at_delivery`, etc.) which are set automatically during workflow progression.

### 2. Automatic Calendar Synchronization

**Before:** Loads and calendar events were separate. Creating a load didn't automatically show it on the calendar.

**After:** Loads automatically sync to the calendar:

- ✅ Create a load → Calendar events created automatically
- ✅ Update load dates/vehicle → Calendar events updated
- ✅ Delete a load → Calendar events removed
- ✅ Existing loads backfilled to calendar

## How It Works

### Database Triggers

Two new triggers handle bidirectional sync:

1. **`trigger_sync_load_to_calendar`** (loads → calendar_events)

   - Fires on: INSERT or UPDATE of loads
   - Creates/updates pickup and delivery calendar events
   - Uses `expected_arrival_at_pickup` or falls back to `pickup_datetime`
   - Adds load details to event notes

2. **`trigger_delete_load_calendar_events`** (cleanup)
   - Fires on: DELETE of loads
   - Removes associated calendar events

### Event Creation Logic

When a load is created/updated:

**Pickup Event:**

- **Start time:** `expected_arrival_at_pickup` (or `pickup_datetime` if not set)
- **End time:** `expected_departure_from_pickup` (or start + 2 hours)
- **Type:** `pickup`
- **Notes:** Load number, origin, customer, weight

**Delivery Event:**

- **Start time:** `expected_arrival_at_delivery` (or `delivery_datetime` if not set)
- **End time:** `expected_departure_from_delivery` (or start + 2 hours)
- **Type:** `delivery`
- **Notes:** Load number, destination, customer, weight

### Calendar View

A new view `v_calendar_load_events` combines all relevant data:

```sql
SELECT * FROM v_calendar_load_events
WHERE start_time >= '2025-11-12'
ORDER BY start_time;
```

Returns: event details + load data + vehicle info in one query.

## Usage in Frontend

### CreateLoadDialog Enhancement

The **Create Load** dialog now includes additional timing fields:

```tsx
// Basic times (existing)
- Pickup Date & Time *           // Required - when loading should happen
- Delivery Date & Time            // Optional - when delivery should happen

// Expected times (NEW)
- Expected Arrival at Loading Point     // When driver should arrive
- Expected Departure from Loading Point // When loaded truck should leave
- Expected Arrival at Delivery Point    // When truck should arrive at destination
- Expected Departure from Delivery Point // When empty truck should leave
```

**Recommended workflow:**

1. Set **Pickup Date & Time** (start of loading window)
2. Set **Expected Arrival at Pickup** (when driver arrives, usually 30min-1hr before pickup time)
3. Set **Expected Departure from Pickup** (after loading, usually 2-3 hours after arrival)
4. Set **Delivery Date & Time** (delivery window)
5. Set **Expected Arrival at Delivery** (based on travel time + buffer)
6. Set **Expected Departure from Delivery** (after offloading, usually 1-2 hours after arrival)

### LoadPlanningCalendar Display

The calendar now shows:

- **Pickup events** (blue) - at loading locations
- **Delivery events** (green) - at delivery locations
- All events display load number, customer, route info
- Clicking an event shows full load details

## Migration Application

### Step 1: Apply the Migration

```bash
./apply_calendar_timestamps.sh
```

Or manually:

```bash
psql "postgresql://postgres.wxvhkljrbcpcgpgdqhsp:${SUPABASE_DB_PASSWORD}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres" \
  < supabase/migrations/20251112000001_add_expected_timestamps_and_calendar_sync.sql
```

### Step 2: Regenerate TypeScript Types

```bash
npx supabase gen types typescript \
  --project-id wxvhkljrbcpcgpgdqhsp \
  > src/integrations/supabase/types.ts
```

### Step 3: Rebuild Frontend

```bash
npm run build
```

## Verification

### 1. Check Database Schema

```sql
-- Verify new columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'loads'
  AND column_name LIKE 'expected_%';
```

Should return 4 rows:

- `expected_arrival_at_pickup` (TIMESTAMPTZ)
- `expected_departure_from_pickup` (TIMESTAMPTZ)
- `expected_arrival_at_delivery` (TIMESTAMPTZ)
- `expected_departure_from_delivery` (TIMESTAMPTZ)

### 2. Check Calendar Events Created

```sql
-- Check that existing loads have calendar events
SELECT
  l.load_number,
  COUNT(ce.id) as event_count,
  STRING_AGG(ce.event_type, ', ') as event_types
FROM loads l
LEFT JOIN calendar_events ce ON ce.load_id = l.id
GROUP BY l.load_number
HAVING COUNT(ce.id) > 0
LIMIT 10;
```

Should show loads with 1-2 events (pickup and/or delivery).

### 3. Test in UI

1. Navigate to **Loads** → **Create Load**
2. Fill in basic details (customer, origin, destination)
3. Set **Pickup Date & Time** (required)
4. Set **Expected Arrival at Loading Point** (e.g., 1 hour before pickup)
5. Set **Expected Departure from Loading Point** (e.g., 2 hours after arrival)
6. Submit the load
7. Navigate to **Load Planning** → **Calendar**
8. Verify the load appears on the calendar on the correct dates

## Troubleshooting

### Loads Not Appearing on Calendar

**Check:**

1. Does the load have a `pickup_datetime` or `expected_arrival_at_pickup`?
2. Are there calendar events in the database?
   ```sql
   SELECT * FROM calendar_events WHERE load_id = 'YOUR_LOAD_ID';
   ```
3. Check the date range - calendar only shows events in the visible period

**Fix:** Manually trigger sync for a specific load:

```sql
UPDATE loads
SET pickup_datetime = pickup_datetime
WHERE id = '033eb373-df04-43b3-a455-66e30031e62d';
```

### Calendar Events Have Wrong Times

The sync uses this priority order:

1. **Expected times** (if set)
2. **Pickup/Delivery datetime** (fallback)
3. **Auto-calculated** (datetime + 2 hours for end time)

Update the expected times in the load:

```sql
UPDATE loads
SET
  expected_arrival_at_pickup = '2025-11-12 08:00:00+02',
  expected_departure_from_pickup = '2025-11-12 10:00:00+02'
WHERE load_number = 'LD-20251112-001';
```

### Trigger Not Firing

Check trigger is enabled:

```sql
SELECT tgname, tgenabled
FROM pg_trigger
WHERE tgname = 'trigger_sync_load_to_calendar';
```

If disabled (tgenabled = 'D'), re-enable:

```sql
ALTER TABLE loads ENABLE TRIGGER trigger_sync_load_to_calendar;
```

## Benefits

### For Dispatchers

- Visual timeline of all pickups and deliveries
- Easy to spot scheduling conflicts
- See which vehicles are allocated when
- Plan routes based on loading/delivery windows

### For Drivers

- Clear arrival and departure expectations
- Know exactly when to be at loading point
- Understand the full timeline for the load

### For Operations

- Better capacity planning
- Identify bottlenecks at loading/delivery points
- Track actual vs expected times for improvements

### For Customers

- More accurate ETAs
- Better communication about pickup/delivery windows
- Improved reliability tracking

## Technical Details

### Files Modified

1. **Migration:**

   - `supabase/migrations/20251112000001_add_expected_timestamps_and_calendar_sync.sql`

2. **Frontend:**

   - `src/components/loads/CreateLoadDialog.tsx` - Added timestamp fields to form
   - `src/integrations/supabase/types.ts` - Will need regeneration

3. **Scripts:**
   - `apply_calendar_timestamps.sh` - Migration application script

### Database Objects Created

- **Columns:** 4 new TIMESTAMPTZ columns on `loads` table
- **Indexes:** 3 partial indexes for performance
- **Functions:**
  - `sync_load_to_calendar_events()` - Creates/updates calendar events
  - `delete_load_calendar_events()` - Cleanup on deletion
- **Triggers:**
  - `trigger_sync_load_to_calendar` - On loads INSERT/UPDATE
  - `trigger_delete_load_calendar_events` - On loads DELETE
- **Views:**
  - `v_calendar_load_events` - Combined load + calendar + vehicle data

### Performance Considerations

- Indexes created on expected timestamp fields for fast calendar queries
- Triggers use `SECURITY DEFINER` for RLS bypass (system operations)
- View is non-materialized, queries real-time data
- Calendar queries are optimized with date range filters

## Future Enhancements

Potential improvements:

- [ ] Auto-calculate expected times based on distance/traffic
- [ ] Send notifications when expected times are approaching
- [ ] Compare actual vs expected times for analytics
- [ ] Add buffer time configuration per customer/route
- [ ] Integration with Wialon ETA calculations
- [ ] Automatic rescheduling on delays

## Summary

✅ **4 new timestamp fields** for scheduling and planning
✅ **Automatic calendar sync** - loads appear on calendar instantly
✅ **Bidirectional updates** - changes sync both ways
✅ **Backfilled existing loads** - all loads now on calendar
✅ **Enhanced UI** - timing section expanded with expected times
✅ **New database view** - easy querying of calendar data

Loads now have complete visibility from planning through execution!
