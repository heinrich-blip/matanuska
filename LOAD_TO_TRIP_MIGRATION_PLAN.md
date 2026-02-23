# Load Management → Trip Management Migration Plan

## Current State Analysis

### LoadManagement Page Features

| Feature                    | Description                                     | Component/Hook                                     |
| -------------------------- | ----------------------------------------------- | -------------------------------------------------- |
| **Loads CRUD**             | Create, edit, delete loads                      | `CreateLoadDialog`, `EditLoadDialog`, `LoadsTable` |
| **Bulk Import**            | Import multiple loads from CSV/Excel            | `BulkLoadImport`                                   |
| **Recurring Schedules**    | Create recurring load schedules (daily/weekly)  | `RecurringScheduleManager`                         |
| **Load Planning Calendar** | Visual calendar view of scheduled loads         | `LoadPlanningCalendar`                             |
| **Route Planner**          | Plan & optimize delivery routes                 | `RoutePlanner`                                     |
| **Live GPS Tracking**      | Real-time vehicle tracking on map               | `LiveDeliveryTracking`                             |
| **Customer Retention**     | Analytics dashboard for customer metrics        | `CustomerRetentionDashboard`                       |
| **Real-Time KPIs**         | Live KPI monitoring widget                      | `RealTimeKPIMonitor`                               |
| **Status Filtering**       | Filter by 12 different statuses                 | Tabs (pending → completed)                         |
| **Load Assignment**        | Assign vehicles to loads                        | `LoadAssignmentDialog`                             |
| **Stats Cards**            | Quick stats (total, pending, in-transit, value) | Inline component                                   |
| **Realtime Updates**       | Supabase subscription for live changes          | `supabase.channel()`                               |

### TripManagement Page Features

| Feature              | Description                            | Component/Hook                    |
| -------------------- | -------------------------------------- | --------------------------------- |
| **Trips CRUD**       | Create, edit, delete trips             | `AddTripDialog`, `EditTripDialog` |
| **Load Import**      | Import loads into the system           | `LoadImportModal`                 |
| **Active Trips**     | View and manage active trips           | `ActiveTrips`                     |
| **Completed Trips**  | View completed trip history            | `CompletedTrips`                  |
| **Trip Details**     | Detailed view with costs, notes        | `TripDetailsModal`                |
| **Reports**          | Generate trip reports                  | `TripReportsSection`              |
| **Invoices**         | Manage trip invoices                   | `InvoiceManager`                  |
| **Analytics**        | Customer retention analytics           | `CustomerRetentionDashboard`      |
| **Missed Loads**     | Track missed/lost loads                | `MissedLoadsTracker`              |
| **Realtime Updates** | Supabase subscription for live changes | `supabase.channel()`              |

---

## Overlap Analysis

### ✅ Already Duplicated (Remove from LoadManagement)

- **Customer Retention Dashboard** - Already exists in TripManagement as "Analytics" tab
- **Load Import** - TripManagement has `LoadImportModal`, LoadManagement has `BulkLoadImport`

### ⚠️ Unique to LoadManagement (Consider Migrating)

- **Recurring Schedules** - Useful for planning
- **Load Planning Calendar** - Visual planning tool
- **Route Planner** - Route optimization
- **Live GPS Tracking** - Real-time delivery monitoring
- **Real-Time KPI Monitor** - Live KPIs
- **Load Assignment Dialog** - Assign vehicles to loads
- **12-Status Workflow** - Granular status tracking

### ⚠️ Different Data Models

- **Loads** use `loads` table with fields: `load_number`, `origin`, `destination`, `cargo_type`, `weight_kg`, `assigned_vehicle_id`, `status` (12 states)
- **Trips** use `trips` table with fields: `trip_number`, `origin`, `destination`, `vehicle_id`, `driver_name`, `revenue`, `status` (active/completed)

---

## Recommended Migration Strategy

### Phase 1: Add Missing Features to TripManagement (Safe)

These features enhance TripManagement without breaking existing functionality:

```
TripManagement Tabs (New Structure):
├── Active Trips          ← Existing
├── Completed Trips       ← Existing
├── Calendar              ← NEW (from LoadPlanningCalendar)
├── Live Tracking         ← NEW (from LiveDeliveryTracking)
├── Routes                ← NEW (from RoutePlanner)
├── Reports               ← Existing
├── Invoices              ← Existing
├── Analytics             ← Existing (consolidate with Load's CustomerRetentionDashboard)
└── Missed Loads          ← Existing
```

### Phase 2: Enhance Trip Status Workflow (Medium Risk)

Current Trip statuses: `active`, `completed`

Proposed expanded statuses (optional migration):

```
active → in_transit → arrived → offloading → delivered → completed
```

**Risk**: Requires database migration and updating all trip-related components.

### Phase 3: Merge Load Assignment (Medium Risk)

Option A: Keep loads/trips as separate entities, link via `load_id` on trips
Option B: Deprecate loads entirely, enhance trips to include load data

---

## Step 1: Deprecate Loads & Enhance Trips (Full Implementation)

This section details the complete migration to consolidate `loads` into `trips`.

### 1.1 Schema Comparison

#### Fields in `loads` NOT in `trips` (need to add):

| Load Field                  | Purpose               | Migration Action            |
| --------------------------- | --------------------- | --------------------------- |
| `cargo_type`                | Type of cargo         | Use existing `load_type` ✅ |
| `weight_kg`                 | Cargo weight          | **ADD to trips**            |
| `volume_m3`                 | Cargo volume          | **ADD to trips**            |
| `pallet_count`              | Number of pallets     | **ADD to trips**            |
| `packaging_type`            | Packaging description | **ADD to trips**            |
| `customer_name`             | Customer name         | Use `client_name` ✅        |
| `contact_person`            | Contact at customer   | **ADD to trips**            |
| `contact_phone`             | Contact phone         | **ADD to trips**            |
| `origin_lat/lng`            | GPS coordinates       | **ADD to trips**            |
| `destination_lat/lng`       | GPS coordinates       | **ADD to trips**            |
| `origin_address`            | Full address          | **ADD to trips**            |
| `destination_address`       | Full address          | **ADD to trips**            |
| `pickup_datetime`           | Scheduled pickup      | Use `departure_date` ✅     |
| `delivery_datetime`         | Scheduled delivery    | Use `arrival_date` ✅       |
| `pickup_window_start/end`   | Time windows          | **ADD to trips**            |
| `delivery_window_start/end` | Time windows          | **ADD to trips**            |
| `quoted_price`              | Initial quote         | **ADD to trips**            |
| `final_price`               | Final agreed price    | Use `base_revenue` ✅       |
| `priority`                  | Load priority enum    | **ADD to trips**            |
| `assigned_by`               | Who assigned vehicle  | **ADD to trips**            |
| `assigned_at`               | When assigned         | **ADD to trips**            |
| `channel`                   | Sales channel         | **ADD to trips**            |
| `route_id`                  | Linked route          | **ADD to trips**            |
| `loading_started_at`        | Timestamp             | **ADD to trips**            |
| `loading_completed_at`      | Timestamp             | **ADD to trips**            |
| `offloading_started_at`     | Timestamp             | **ADD to trips**            |
| `offloading_completed_at`   | Timestamp             | **ADD to trips**            |
| `arrived_at_pickup`         | Timestamp             | **ADD to trips**            |
| `arrived_at_delivery`       | Timestamp             | **ADD to trips**            |
| `delivered_at`              | Timestamp             | **ADD to trips**            |
| `attachments`               | File attachments JSON | **ADD to trips**            |

#### Fields `trips` already has (reuse):

- `origin`, `destination` ✅
- `vehicle_id` ✅
- `driver_name` ✅
- `client_name`, `client_id`, `client_type` ✅
- `load_type` (same as cargo_type) ✅
- `special_requirements` ✅
- `external_load_ref` (for legacy load numbers) ✅
- `base_revenue`, `invoice_amount` ✅
- All invoice/payment fields ✅

### 1.2 Database Migration SQL

```sql
-- Migration: Add load-specific fields to trips table
-- Run in Supabase SQL Editor

-- Cargo details
ALTER TABLE trips ADD COLUMN IF NOT EXISTS weight_kg numeric;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS volume_m3 numeric;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS pallet_count integer;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS packaging_type text;

-- Contact info
ALTER TABLE trips ADD COLUMN IF NOT EXISTS contact_person text;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS contact_phone text;

-- GPS coordinates
ALTER TABLE trips ADD COLUMN IF NOT EXISTS origin_lat numeric;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS origin_lng numeric;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS destination_lat numeric;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS destination_lng numeric;

-- Addresses
ALTER TABLE trips ADD COLUMN IF NOT EXISTS origin_address text;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS destination_address text;

-- Time windows
ALTER TABLE trips ADD COLUMN IF NOT EXISTS pickup_window_start timestamptz;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS pickup_window_end timestamptz;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS delivery_window_start timestamptz;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS delivery_window_end timestamptz;

-- Pricing
ALTER TABLE trips ADD COLUMN IF NOT EXISTS quoted_price numeric;

-- Assignment tracking
ALTER TABLE trips ADD COLUMN IF NOT EXISTS assigned_by text;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS assigned_at timestamptz;

-- Additional metadata
ALTER TABLE trips ADD COLUMN IF NOT EXISTS channel text;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS route_id uuid;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium';
ALTER TABLE trips ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]'::jsonb;

-- Status timestamps (for granular tracking)
ALTER TABLE trips ADD COLUMN IF NOT EXISTS loading_started_at timestamptz;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS loading_completed_at timestamptz;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS offloading_started_at timestamptz;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS offloading_completed_at timestamptz;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS arrived_at_pickup timestamptz;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS arrived_at_delivery timestamptz;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS delivered_at timestamptz;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status);
CREATE INDEX IF NOT EXISTS idx_trips_departure_date ON trips(departure_date);
CREATE INDEX IF NOT EXISTS idx_trips_client_name ON trips(client_name);

-- Comment for documentation
COMMENT ON TABLE trips IS 'Consolidated trips table - includes all load management functionality as of migration date';
```

### 1.3 Data Migration (Optional - if you have existing loads)

```sql
-- Migrate existing loads to trips (run after schema migration)
-- This creates new trip records from load records

INSERT INTO trips (
  trip_number,
  origin,
  destination,
  client_name,
  client_id,
  load_type,
  weight_kg,
  volume_m3,
  pallet_count,
  packaging_type,
  contact_person,
  contact_phone,
  origin_lat,
  origin_lng,
  destination_lat,
  destination_lng,
  origin_address,
  destination_address,
  departure_date,
  arrival_date,
  pickup_window_start,
  pickup_window_end,
  delivery_window_start,
  delivery_window_end,
  quoted_price,
  base_revenue,
  vehicle_id,
  assigned_by,
  assigned_at,
  channel,
  route_id,
  priority,
  special_requirements,
  status,
  external_load_ref,
  created_at
)
SELECT
  load_number as trip_number,
  origin,
  destination,
  customer_name as client_name,
  customer_id as client_id,
  cargo_type as load_type,
  weight_kg,
  volume_m3,
  pallet_count,
  packaging_type,
  contact_person,
  contact_phone,
  origin_lat,
  origin_lng,
  destination_lat,
  destination_lng,
  origin_address,
  destination_address,
  pickup_datetime as departure_date,
  delivery_datetime as arrival_date,
  pickup_window_start,
  pickup_window_end,
  delivery_window_start,
  delivery_window_end,
  quoted_price,
  COALESCE(final_price, quoted_price) as base_revenue,
  assigned_vehicle_id as vehicle_id,
  assigned_by,
  assigned_at,
  channel,
  route_id,
  priority::text,
  special_requirements,
  CASE
    WHEN status IN ('completed', 'delivered') THEN 'completed'
    WHEN status = 'cancelled' THEN 'cancelled'
    ELSE 'active'
  END as status,
  load_number as external_load_ref,
  created_at
FROM loads
WHERE NOT EXISTS (
  SELECT 1 FROM trips WHERE trips.external_load_ref = loads.load_number
);
```

### 1.4 Components to Update

After running the migration, update these components:

| Component                  | Current                         | Update Action                |
| -------------------------- | ------------------------------- | ---------------------------- |
| `LoadPlanningCalendar`     | Uses `loads` table              | Query `trips` instead        |
| `LiveDeliveryTracking`     | Uses `load.assigned_vehicle_id` | Use `trip.vehicle_id`        |
| `RoutePlanner`             | Uses `loads`                    | Use `trips`                  |
| `CreateLoadDialog`         | Creates `loads`                 | Create `trips` or deprecate  |
| `BulkLoadImport`           | Imports to `loads`              | Import to `trips`            |
| `LoadsTable`               | Displays `loads`                | Remove, use trip components  |
| `LoadAssignmentDialog`     | Assigns vehicle to load         | Adapt for trips or remove    |
| `RecurringScheduleManager` | Creates `loads`                 | Adapt for trips              |
| `useLoads` hook            | Queries `loads`                 | Deprecate, use trips queries |

### 1.5 Status Mapping

| Load Status            | Trip Status | Notes                  |
| ---------------------- | ----------- | ---------------------- |
| `pending`              | `active`    | Awaiting assignment    |
| `assigned`             | `active`    | Vehicle assigned       |
| `arrived_at_loading`   | `active`    | At pickup point        |
| `loading`              | `active`    | Loading in progress    |
| `loading_completed`    | `active`    | Ready to depart        |
| `in_transit`           | `active`    | On the road            |
| `arrived_at_delivery`  | `active`    | At destination         |
| `offloading`           | `active`    | Offloading in progress |
| `offloading_completed` | `active`    | Offloading done        |
| `delivered`            | `completed` | POD received           |
| `completed`            | `completed` | Fully complete         |
| `cancelled`            | `cancelled` | Trip cancelled         |

**Alternative**: Keep granular status in trips by changing the `status` column to support more values, or use the timestamp columns to derive status.

### 1.6 Regenerate Types

After running the migration:

```bash
npx supabase gen types typescript --project-id wxvhkljrbcpcgpgdqhsp > src/integrations/supabase/types.ts
```

### 1.7 Navigation Updates

Remove LoadManagement from navigation:

```tsx
// In src/components/Layout.tsx or navigation config
// Remove or comment out:
// { path: "/loads", label: "Load Management", icon: Package }
```

### 1.8 Files to Delete (After Verification)

Once migration is complete and verified:

```
src/pages/LoadManagement.tsx
src/components/loads/CreateLoadDialog.tsx
src/components/loads/EditLoadDialog.tsx
src/components/loads/LoadsTable.tsx
src/components/loads/LoadAssignmentDialog.tsx
src/hooks/useLoads.ts
```

**Keep these** (adapt to use trips):

```
src/components/loads/calendar/          # Adapt to trips
src/components/loads/LiveDeliveryTracking.tsx  # Use trip.vehicle_id
src/components/loads/RoutePlanner.tsx   # Generic, works with trips
src/components/loads/RealTimeKPIMonitor.tsx    # Adapt queries
src/components/loads/BulkLoadImport.tsx # Adapt to import trips
```

---

## Safe Migration Steps

### Step 1: Add Calendar Tab to TripManagement

```tsx
// In TripManagement.tsx, add to imports:
import { LoadPlanningCalendar } from "@/components/loads/calendar";

// Add new tab:
<TabsTrigger value="calendar">Calendar</TabsTrigger>

// Add tab content:
<TabsContent value="calendar">
  <LoadPlanningCalendar />
</TabsContent>
```

### Step 2: Add Live Tracking Tab

```tsx
// In TripManagement.tsx, add to imports:
import { LiveDeliveryTracking } from "@/components/loads/LiveDeliveryTracking";

// Add state:
const [trackingTripId, setTrackingTripId] = useState<string | null>(null);

// Add tab and content (simplified view without load requirement)
```

### Step 3: Add Route Planning Tab

```tsx
// In TripManagement.tsx:
import RoutePlanner from "@/components/loads/RoutePlanner";

<TabsContent value="routes">
  <RoutePlanner />
</TabsContent>;
```

### Step 4: Add KPI Monitor (Bottom of Page)

```tsx
import { RealTimeKPIMonitor } from "@/components/loads/RealTimeKPIMonitor";

// At bottom of Layout, before closing </div>:
<RealTimeKPIMonitor />;
```

---

## What NOT to Migrate

| Feature                    | Reason                                                                    |
| -------------------------- | ------------------------------------------------------------------------- |
| `BulkLoadImport`           | Keep separate, works with loads table. TripManagement has its own import. |
| `LoadAssignmentDialog`     | Load-specific workflow, not needed if removing loads                      |
| `RecurringScheduleManager` | Complex, creates loads not trips. Needs adaptation first.                 |
| `LoadsTable`               | Will be removed along with LoadManagement page                            |
| 12-Status Workflow         | Too complex for trips unless you want full status migration               |

---

## Database Considerations

If you want to fully deprecate `loads`:

1. **Keep `loads` table** - Historical data, referenced by invoices
2. **Add fields to `trips`** if needed:
   - `cargo_type`
   - `weight_kg`
   - `volume_m3`
   - `special_requirements`
3. **Update components** that reference `loads` to use `trips`

---

## Recommended Approach

### Option A: Minimal Migration (Safest)

- Add Calendar, Routes, Live Tracking tabs to TripManagement
- Keep LoadManagement page but hide from navigation
- Gradually deprecate over time

### Option B: Full Consolidation (More Work)

- Migrate all unique features to TripManagement
- Create data migration script: loads → trips
- Update all components to use trips only
- Remove LoadManagement page and related components

---

## Quick Start: Minimal Safe Migration

Add these 3 tabs to TripManagement immediately (no breaking changes):

```tsx
// 1. Update TabsList to include new tabs
<TabsList className="grid w-full grid-cols-9">
  <TabsTrigger value="active">Active</TabsTrigger>
  <TabsTrigger value="completed">Completed</TabsTrigger>
  <TabsTrigger value="calendar">Calendar</TabsTrigger>      {/* NEW */}
  <TabsTrigger value="tracking">Tracking</TabsTrigger>      {/* NEW */}
  <TabsTrigger value="routes">Routes</TabsTrigger>          {/* NEW */}
  <TabsTrigger value="reports">Reports</TabsTrigger>
  <TabsTrigger value="invoices">Invoices</TabsTrigger>
  <TabsTrigger value="analytics">Analytics</TabsTrigger>
  <TabsTrigger value="missed-loads">Missed</TabsTrigger>
</TabsList>

// 2. Add imports at top
import { LoadPlanningCalendar } from "@/components/loads/calendar";
import { LiveDeliveryTracking } from "@/components/loads/LiveDeliveryTracking";
import RoutePlanner from "@/components/loads/RoutePlanner";

// 3. Add TabsContent for each
<TabsContent value="calendar">
  <LoadPlanningCalendar />
</TabsContent>

<TabsContent value="tracking">
  <Card>
    <CardContent className="p-6 text-center py-12">
      <p>Select a trip to view live tracking</p>
    </CardContent>
  </Card>
</TabsContent>

<TabsContent value="routes">
  <Card>
    <CardContent className="p-6">
      <RoutePlanner />
    </CardContent>
  </Card>
</TabsContent>
```

---

## Summary

| Action                | Risk      | Effort | Recommendation                 |
| --------------------- | --------- | ------ | ------------------------------ |
| Add Calendar tab      | ✅ Low    | Low    | Do it                          |
| Add Routes tab        | ✅ Low    | Low    | Do it                          |
| Add Tracking tab      | ✅ Low    | Medium | Do it                          |
| Add KPI Monitor       | ✅ Low    | Low    | Do it                          |
| Migrate statuses      | ⚠️ Medium | High   | Optional                       |
| Remove LoadManagement | ⚠️ Medium | Medium | After confirming no active use |
| Merge data models     | 🔴 High   | High   | Only if necessary              |

**Start with the safe additions, then evaluate if full removal is needed.**
