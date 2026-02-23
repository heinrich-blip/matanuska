# Phase 2: Recurring Load Schedules - COMPLETE ✅

## Implementation Summary

Phase 2 adds **automated load generation** from recurring schedules. Instead of manually importing your weekly distribution schedule, you can now set up templates that auto-generate loads for recurring routes.

## What Was Built

### 1. Database Infrastructure ✅

**File**: `supabase/migrations/20251111000003_recurring_schedules.sql`

- **`recurring_schedules` table**: Stores recurring schedule configurations
- **RLS policies**: Secure access control
- **`generate_loads_from_schedule()` function**: PostgreSQL function for bulk load generation
- **Automatic timestamps and tracking**: `created_at`, `updated_at`, `last_generated_date`, `total_loads_generated`

**Key Fields**:

- Schedule metadata: name, description, frequency
- Route details: origin, destination (with GPS coordinates)
- Cargo details: channel, packaging, pallet count
- Timing: frequency (daily/weekly/monthly), days_of_week, time_of_day, delivery_offset_days
- Stats: total_loads_generated, last_generated_date

### 2. TypeScript Types ✅

**File**: `src/types/recurringSchedules.ts`

- `RecurringSchedule` interface
- `CreateRecurringScheduleInput` interface
- `GenerateLoadsResult` interface
- `WEEKDAYS` constants (Mon-Sun)
- `FREQUENCY_LABELS` mapping
- `SCHEDULE_TEMPLATES` - 4 pre-configured templates:
  - Harare Retail Daily
  - Bulawayo Vendor (Mon/Wed/Fri)
  - Mutare Route (Mon/Wed/Fri)
  - SA Export Weekly

### 3. Business Logic ✅

**File**: `src/lib/recurringSchedules.ts`

**Functions**:

- `getRecurringSchedules()` - Fetch all schedules
- `createRecurringSchedule()` - Create new schedule (auto-fills GPS)
- `updateRecurringSchedule()` - Update existing schedule
- `deleteRecurringSchedule()` - Delete schedule
- `toggleScheduleActive()` - Pause/activate schedule
- `generateLoadsFromSchedule()` - Generate loads for date range
- `generateLoadsFromAllSchedules()` - Batch generate from all active schedules
- `getScheduleStats()` - Usage statistics
- `getNextGenerationDates()` - Predict next 5 generation dates
- `formatDaysOfWeek()` - Human-readable day formatting
- `validateSchedule()` - Input validation

### 4. UI Component ✅

**File**: `src/components/loads/RecurringScheduleManager.tsx`

**Features**:

- **Quick Templates**: 4 pre-configured templates with one-click setup
- **Schedule Library**: View all schedules with stats
- **Create/Edit Dialog**: Full form for custom schedules
- **Day Selection**: Visual weekday picker for weekly schedules
- **Activate/Pause**: Toggle schedules on/off
- **Generate Now**: Manual load generation for next 7 days
- **Next Runs Preview**: See upcoming generation dates
- **Usage Stats**: Track total loads generated per schedule
- **Delete**: Remove schedules with confirmation

**UI Sections**:

1. Quick template buttons (4 templates)
2. Schedule list with cards showing:
   - Name, description, active status
   - Route (origin → destination)
   - Frequency and days
   - Channel, packaging, pallets
   - Pickup time
   - Total loads generated
   - Last generated date
   - Next 3 run dates
   - Action buttons (Edit, Pause/Activate, Delete, Generate Now)
3. Create/Edit form with all fields

### 5. Integration ✅

**File**: `src/pages/LoadManagement.tsx`

- **"Schedules" button** added to header (Calendar icon)
- **RecurringScheduleManager** component integrated
- **Auto-refresh** after load generation
- **Toast notifications** for success/error

## How It Works

### Creating a Recurring Schedule

1. Click **"Schedules"** button in Load Management
2. Choose **Quick Template** or **"Create Custom"**
3. Fill in:
   - Schedule name (e.g., "Harare Retail Daily")
   - Origin farm (CBC or BV) - GPS auto-filled
   - Destination city - GPS auto-filled
   - Channel (retail, vendor, vansales, etc.)
   - Packaging type and pallet count
   - **Frequency**: Daily, Weekly, or Monthly
   - **Days of Week** (for weekly): Select Mon, Tue, Wed, etc.
   - **Pickup time** (default 06:00)
   - **Delivery offset** (days after pickup)
   - Priority and currency
4. Click **"Create Schedule"**

### Auto-Generation Logic

**Weekly Schedule Example** (Bulawayo Vendor - Mon/Wed/Fri):

- Schedule frequency: `weekly`
- Days of week: `[1, 3, 5]` (Monday, Wednesday, Friday)
- System checks each day: Is it Mon, Wed, or Fri?
- If YES: Generate load with LD-YYYYMMDD-XXX number
- If NO: Skip that day

**Load Creation**:

- Pickup datetime: Selected date + time_of_day (06:00)
- Delivery datetime: Pickup + delivery_offset_days (e.g., +1 day)
- Time windows: 12-hour windows (6AM-6PM default)
- Status: `pending` (ready for vehicle assignment)
- Weight: pallet_count × 1200 kg
- GPS: Auto-assigned from FARM_LOCATIONS/DESTINATION_LOCATIONS

### Manual Generation

Click **"Generate Now"** on any active schedule:

- Generates loads for **next 7 days**
- Only creates loads for days matching schedule pattern
- Updates schedule stats (last_generated_date, total_loads_generated)
- Returns count and list of created load IDs

### Batch Generation

Coming soon: Background job to auto-generate loads daily/weekly from all active schedules.

## Usage Examples

### Example 1: Daily Harare Retail Route

```typescript
{
  name: "Harare Retail Daily",
  origin: "BV Farm",
  destination: "Harare",
  channel: "retail",
  packaging_type: "crates",
  frequency: "daily",
  time_of_day: "06:00:00",
  delivery_offset_days: 1, // Next-day delivery
  priority: "high"
}
```

**Result**: Generates one load every day, 7 days a week.

### Example 2: Weekly Bulawayo Vendor (Mon/Wed/Fri)

```typescript
{
  name: "Bulawayo Vendor Route",
  origin: "CBC Farm",
  destination: "Bulawayo",
  channel: "vendor",
  packaging_type: "bins",
  pallet_count: 20,
  frequency: "weekly",
  days_of_week: [1, 3, 5], // Mon, Wed, Fri
  time_of_day: "06:00:00",
  delivery_offset_days: 1,
  priority: "medium"
}
```

**Result**: Generates 3 loads per week (Monday, Wednesday, Friday).

### Example 3: Monthly SA Export (Every Monday)

```typescript
{
  name: "SA Export Weekly",
  origin: "CBC Farm",
  destination: "Freshmark Polokwane",
  channel: "direct",
  packaging_type: "crates",
  frequency: "weekly",
  days_of_week: [1], // Every Monday
  time_of_day: "04:00:00",
  delivery_offset_days: 2, // 2-day transit
  priority: "high"
}
```

**Result**: Generates 1 load every Monday (4-5 loads per month).

## Benefits

### Time Savings

- **Before**: Manually enter 30+ loads every week via CSV import
- **After**: Set up 5-10 recurring schedules once, auto-generate weekly

### Accuracy

- **Consistent formatting**: All loads follow exact template
- **No data entry errors**: GPS, times, weights auto-calculated
- **Predictable numbering**: LD-YYYYMMDD-XXX format maintained

### Flexibility

- **Pause schedules**: Temporarily disable without deleting
- **Easy editing**: Update frequency, times, routes anytime
- **Manual override**: Generate loads on-demand outside schedule
- **Template library**: Copy/clone successful patterns

### Visibility

- **Next runs preview**: See upcoming load generation dates
- **Usage stats**: Track how many loads each schedule created
- **Last generated**: Know when schedule last ran

## Database Schema

```sql
CREATE TABLE recurring_schedules (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,

  -- Route details
  origin TEXT NOT NULL,
  origin_lat NUMERIC,
  origin_lng NUMERIC,
  destination TEXT NOT NULL,
  destination_lat NUMERIC,
  destination_lng NUMERIC,

  -- Cargo details
  channel TEXT CHECK (channel IN ('retail', 'vendor', 'vansales', 'direct', 'municipal')),
  packaging_type TEXT,
  pallet_count INTEGER DEFAULT 0,
  cargo_type TEXT,
  special_requirements TEXT[],

  -- Schedule configuration
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'custom')),
  days_of_week INTEGER[] DEFAULT '{}', -- 1=Monday, 7=Sunday
  time_of_day TIME DEFAULT '06:00:00',
  delivery_offset_days INTEGER DEFAULT 1,

  -- Load defaults
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  currency TEXT DEFAULT 'USD',

  -- Status and tracking
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  last_generated_date DATE,
  total_loads_generated INTEGER DEFAULT 0
);
```

## Next Steps

1. **Test the system**:

   - Create a daily schedule for Harare
   - Create a weekly schedule for Bulawayo (Mon/Wed/Fri)
   - Click "Generate Now" to create next 7 days of loads

2. **Apply migration**:

   ```bash
   # In Supabase Dashboard > SQL Editor:
   # Paste contents of: supabase/migrations/20251111000003_recurring_schedules.sql
   # Run query
   ```

3. **Set up your routes**:

   - Use quick templates for common routes
   - Customize as needed
   - Activate schedules

4. **Weekly workflow**:

   - Click "Schedules" button
   - Review active schedules
   - Click "Generate Now" on each (or batch generate)
   - Assign vehicles to pending loads
   - Track with real-time GPS

5. **Future enhancement** (Phase 3):
   - Automated daily/weekly batch generation (cron job)
   - Email notifications when loads generated
   - Calendar view showing schedule patterns
   - Route optimization suggestions

## Files Created

- ✅ `supabase/migrations/20251111000003_recurring_schedules.sql` (187 lines)
- ✅ `src/types/recurringSchedules.ts` (122 lines)
- ✅ `src/lib/recurringSchedules.ts` (252 lines)
- ✅ `src/components/loads/RecurringScheduleManager.tsx` (723 lines)
- ✅ `src/pages/LoadManagement.tsx` (modified - added Schedules button)

**Total**: 1,284 lines of new code + database migration

## Status

✅ **Phase 2 COMPLETE**

- Database schema created
- Types defined
- Business logic implemented
- UI component built
- Integration complete
- Documentation written

**Ready to use immediately after applying database migration!**

---

## Comparison: Bulk Import vs Recurring Schedules

| Feature         | Bulk Import (Phase 1)         | Recurring Schedules (Phase 2)     |
| --------------- | ----------------------------- | --------------------------------- |
| **Use Case**    | One-time import of many loads | Automated weekly/monthly patterns |
| **Setup Time**  | CSV prep each week            | Set up once, runs forever         |
| **Flexibility** | Any date range, any route     | Predefined patterns only          |
| **Best For**    | Special events, ad-hoc loads  | Regular weekly/monthly routes     |
| **Maintenance** | Manual CSV creation           | Edit schedule anytime             |
| **Volume**      | 30+ loads in one import       | 3-7 loads per schedule per week   |

**Recommendation**: Use both!

- **Recurring schedules** for your regular routes (Harare daily, Bulawayo 3x/week)
- **Bulk import** for special orders, seasonal variations, or backfill
