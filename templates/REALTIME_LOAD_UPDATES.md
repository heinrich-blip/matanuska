# Real-Time Load Updates Implementation

## ✅ IMPLEMENTATION COMPLETE

All components have been created and integrated successfully with **ZERO TypeScript errors**.

## What Was Implemented

### 1. **useLoadRealtime Hook** (`src/hooks/useLoadRealtime.ts`)

Complete real-time subscription system for load changes using Supabase real-time capabilities.

**Features:**

- Subscribes to database changes (INSERT, UPDATE, DELETE)
- Automatically invalidates React Query cache
- Shows toast notifications for status changes, vehicle assignments, pickups, deliveries
- Silent GPS updates (no notifications)
- Tracks load history with timestamps
- Custom update handlers via callback

**Usage:**

```typescript
// Track single load
useSingleLoadRealtime(loadId, {
  enableNotifications: true,
  onUpdate: (payload) => {
    console.log("Update:", payload);
  },
});

// Track all loads (dashboard)
useAllLoadsRealtime({ enableNotifications: true });
```

### 2. **LoadRealtimeContext** (`src/contexts/LoadRealtimeContext.tsx`)

Context provider to store recent updates in memory for display in timeline components.

**Features:**

- Stores last 100 updates
- Query updates by load ID
- Clear update history
- Centralized update state management

### 3. **LoadRealtimeIndicator** (`src/components/loads/LoadRealtimeIndicator.tsx`)

Visual connection status indicator.

**Displays:**

- 🟢 Live (connected) - with animated pulse
- 🔴 Disconnected - when connection lost
- Last update timestamp

### 4. **LoadUpdateTimeline** (`src/components/loads/LoadUpdateTimeline.tsx`)

Timeline component showing real-time changes for a specific load.

**Displays:**

- Status changes (with icons)
- Vehicle assignments
- GPS position updates
- Speed/distance updates
- Event timestamps
- Event type badges (INSERT/UPDATE/DELETE)

### 5. **Integration with LiveDeliveryTracking**

Updated to include real-time monitoring with visual feedback.

**Changes:**

- Added `useSingleLoadRealtime` subscription
- Added `LoadRealtimeIndicator` in header
- Added `LoadUpdateTimeline` in left column
- Automatic cache invalidation on updates

---

## How It Works

### Real-Time Flow

```
Database Change → Supabase Real-time → useLoadRealtime Hook →
  ├─ Toast Notification (if enabled)
  ├─ React Query Cache Invalidation
  ├─ Context Update (LoadRealtimeContext)
  └─ UI Refresh (LiveDeliveryTracking, LoadUpdateTimeline)
```

### Event Handling

#### INSERT Event

```json
{
  "eventType": "INSERT",
  "new": { "id": "...", "status": "Pending", ... }
}
```

- Toast: "🚛 New Load Created"
- Invalidates: ['loads'] query

#### UPDATE Event

```json
{
  "eventType": "UPDATE",
  "old": { "status": "Pending", ... },
  "new": { "status": "In Transit", ... }
}
```

- Checks what changed (status, vehicle, GPS, pickup, delivery)
- Shows specific toast notification
- Invalidates relevant queries

**Status Change:**

- Toast: "{emoji} Load Status Updated: Pending → In Transit"

**Vehicle Assignment:**

- Toast: "🚚 Vehicle Assigned"

**Pickup Complete:**

- Toast: "📦 Pickup Complete at {time}"

**Delivery Complete:**

- Toast: "✅ Delivery Complete at {time}"

**GPS Update (Silent):**

- No toast (would be too noisy)
- Console log only
- Updates map in real-time

#### DELETE Event

```json
{
  "eventType": "DELETE",
  "old": { "id": "...", ... }
}
```

- Toast: "🗑️ Load Deleted"
- Removes from UI

---

## Status Emojis

| Status      | Emoji |
| ----------- | ----- |
| Pending     | ⏳    |
| Assigned    | 📋    |
| In Transit  | 🚛    |
| At Pickup   | 📦    |
| At Delivery | 🏢    |
| Delivered   | ✅    |
| Completed   | ✅    |
| Cancelled   | ❌    |
| On Hold     | ⏸️    |

---

## Notification Examples

Based on your update payload:

```javascript
// Status change: "Pending" → "In Transit"
toast({
  title: "🚛 Load Status Updated",
  description: "Load LD-20251111-797: Pending → In Transit",
});

// Vehicle assigned
toast({
  title: "🚚 Vehicle Assigned",
  description: "Load LD-20251111-797 has been assigned to a vehicle",
});

// GPS update (console only)
console.log("GPS position updated:", {
  load: "85935073-94c5-4152-9ac4-38a83eda95ea",
  lat: -20.6177688,
  lng: 32.3786847,
  speed: 65,
  distance: 245.3,
});
```

---

## Usage in Components

### Track Single Load

```typescript
import { useSingleLoadRealtime } from "@/hooks/useLoadRealtime";

const LoadDetails = ({ loadId }: { loadId: string }) => {
  // Enable real-time updates with notifications
  useSingleLoadRealtime(loadId, {
    enableNotifications: true,
    onUpdate: (payload) => {
      // Custom handling
      if (payload.new.status === "Delivered") {
        playSuccessSound();
      }
    },
  });

  return <div>Load details...</div>;
};
```

### Track All Loads (Dashboard)

```typescript
import { useAllLoadsRealtime } from "@/hooks/useLoadRealtime";

const LoadsDashboard = () => {
  // Monitor all loads
  useAllLoadsRealtime({ enableNotifications: true });

  const { data: loads } = useQuery({
    queryKey: ["loads"],
    queryFn: fetchLoads,
  });

  // Loads will auto-refresh when database changes occur
  return <div>Loads list...</div>;
};
```

### Show Update Timeline

```typescript
import { LoadUpdateTimeline } from "@/components/loads/LoadUpdateTimeline";

<LoadUpdateTimeline loadId={loadId} />;
```

### Show Connection Status

```typescript
import { LoadRealtimeIndicator } from "@/components/loads/LoadRealtimeIndicator";

<LoadRealtimeIndicator />;
```

---

## Query Invalidation Strategy

The hook automatically invalidates these queries on updates:

1. **All load updates:**

   - `['loads']` - Main loads list
   - `['load', loadId]` - Specific load details

2. **Status changes:**

   - `['loads', 'status']` - Status-filtered views

3. **Vehicle assignments:**
   - `['vehicle-loads']` - Loads by vehicle

This ensures all components displaying load data stay synchronized.

---

## Testing Real-Time Updates

### Manual Test (Supabase Dashboard SQL Editor)

```sql
-- 1. Update load status
UPDATE loads
SET
  status = 'In Transit',
  updated_at = now()
WHERE id = '85935073-94c5-4152-9ac4-38a83eda95ea';

-- 2. Assign vehicle
UPDATE loads
SET
  assigned_vehicle_id = '1918691b-e494-4a35-a60c-f8a83629a7a9',
  assigned_at = now(),
  updated_at = now()
WHERE id = '85935073-94c5-4152-9ac4-38a83eda95ea';

-- 3. Complete pickup
UPDATE loads
SET
  actual_pickup_datetime = now(),
  status = 'In Transit',
  updated_at = now()
WHERE id = '85935073-94c5-4152-9ac4-38a83eda95ea';

-- 4. Update GPS tracking
UPDATE loads
SET
  current_latitude = -20.6177688,
  current_longitude = 32.3786847,
  current_speed_kmh = 75,
  total_km_traveled = 245.5,
  last_gps_update = now(),
  updated_at = now()
WHERE id = '85935073-94c5-4152-9ac4-38a83eda95ea';

-- 5. Complete delivery
UPDATE loads
SET
  actual_delivery_datetime = now(),
  status = 'Delivered',
  updated_at = now()
WHERE id = '85935073-94c5-4152-9ac4-38a83eda95ea';
```

**Expected Results:**

- Toast notifications appear immediately
- React Query cache invalidates
- UI updates automatically
- LoadUpdateTimeline shows new entry
- LiveDeliveryTracking refreshes

---

## Performance Considerations

### Connection Management

- One subscription per component using `useLoadRealtime`
- Subscriptions clean up on unmount
- Channel naming prevents duplicates

### Notification Throttling

Status changes and assignments trigger toasts, but GPS updates are silent to avoid notification spam.

### Memory Management

- LoadRealtimeContext keeps only last 100 updates
- Old updates automatically pruned
- Subscriptions properly cleaned up

### Cache Invalidation

Only invalidates relevant query keys, not entire cache.

---

## Troubleshooting

### No Real-Time Updates

1. Check Supabase Realtime is enabled in project settings
2. Verify RLS policies allow authenticated users to read loads
3. Check browser console for subscription errors
4. Verify channel subscription status

### Toast Not Showing

1. Check `enableNotifications` is true
2. Verify `useToast` hook is available
3. Check notification permissions

### Timeline Not Updating

1. Wrap app in `<LoadRealtimeProvider>`
2. Verify `useLoadRealtimeContext` is in provider tree
3. Check console for context errors

---

## Next Steps

1. **Apply Database Migrations** (from LOAD_MANAGEMENT_COMPLETE_GUIDE.md)

   - Customer templates table
   - Geofence events table
   - Load tracking fields

2. **Integrate Geofence Monitoring** (Section 2 of guide)

   - Entry/exit notifications
   - Automatic geofence detection

3. **Add KM Tracking** (Section 3 of guide)

   - GPS breadcrumb trail
   - Distance calculation

4. **Build Reports** (Section 4 of guide)

   - Load summary with timeline
   - PDF export

5. **Create Analytics Dashboard** (Section 5 of guide)
   - KPIs with real-time updates
   - Performance charts

---

## Files Created

1. `/src/hooks/useLoadRealtime.ts` - Real-time subscription hook
2. `/src/contexts/LoadRealtimeContext.tsx` - Update history context
3. `/src/components/loads/LoadRealtimeIndicator.tsx` - Connection status badge
4. `/src/components/loads/LoadUpdateTimeline.tsx` - Update timeline component

## Files Modified

1. `/src/components/loads/LiveDeliveryTracking.tsx` - Added real-time integration

---

## Summary

Your load management system now has **production-ready real-time updates** that:

- ✅ Automatically sync UI when database changes
- ✅ Show user-friendly notifications
- ✅ Maintain update history for auditing
- ✅ Display connection status
- ✅ Handle all CRUD operations (INSERT/UPDATE/DELETE)
- ✅ Optimize performance with smart cache invalidation
- ✅ Support both single-load and dashboard views

All updates happen automatically without polling or manual refresh!
