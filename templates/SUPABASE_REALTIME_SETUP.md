# Supabase Real-time Subscriptions Setup Guide

## Overview

This guide explains how to enable real-time subscriptions for the advanced tracking features in Car Craft Co. Real-time subscriptions allow the frontend to receive instant updates when database records change.

## Prerequisites

- Supabase project with admin access
- Tables created from `ADVANCED_TRACKING_INTEGRATION_GUIDE.md`
- Supabase JavaScript client configured in your app

## Step 1: Enable Replication for Tables

### Via Supabase Dashboard

1. **Log into Supabase Dashboard**

   - Go to https://supabase.com/dashboard
   - Select your project

2. **Navigate to Database → Replication**

   - Click on "Database" in the left sidebar
   - Select "Replication" tab

3. **Enable Replication for These Tables**:

   #### Core Tracking Tables

   - ✅ `delivery_tracking` - Real-time GPS position updates
   - ✅ `delivery_events` - Status changes, geofence events
   - ✅ `delivery_eta` - ETA calculations and updates
   - ✅ `geofence_events` - Geofence entry/exit notifications
   - ✅ `route_waypoints` - Route planning updates
   - ✅ `loads` - Load status and details changes

4. **For Each Table**:
   - Find the table in the list
   - Toggle the switch to "Enable"
   - Check all events: INSERT, UPDATE, DELETE
   - Click "Save"

### Via SQL (Alternative Method)

```sql
-- Enable replication for all tracking tables
ALTER TABLE delivery_tracking REPLICA IDENTITY FULL;
ALTER TABLE delivery_events REPLICA IDENTITY FULL;
ALTER TABLE delivery_eta REPLICA IDENTITY FULL;
ALTER TABLE geofence_events REPLICA IDENTITY FULL;
ALTER TABLE route_waypoints REPLICA IDENTITY FULL;
ALTER TABLE loads REPLICA IDENTITY FULL;

-- Create publications for real-time
CREATE PUBLICATION supabase_realtime FOR TABLE
  delivery_tracking,
  delivery_events,
  delivery_eta,
  geofence_events,
  route_waypoints,
  loads;
```

## Step 2: Configure Row Level Security (RLS)

Real-time subscriptions respect RLS policies. Ensure authenticated users can read data:

```sql
-- Enable RLS on all tables
ALTER TABLE delivery_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_eta ENABLE ROW LEVEL SECURITY;
ALTER TABLE geofence_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_waypoints ENABLE ROW LEVEL SECURITY;

-- Create read policies for authenticated users
CREATE POLICY "Authenticated users can read delivery_tracking"
  ON delivery_tracking FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read delivery_events"
  ON delivery_events FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read delivery_eta"
  ON delivery_eta FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read geofence_events"
  ON geofence_events FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read route_waypoints"
  ON route_waypoints FOR SELECT
  TO authenticated
  USING (true);
```

## Step 3: Verify Real-time Configuration

### Check Replication Status

```sql
-- View all publications
SELECT * FROM pg_publication;

-- View tables in supabase_realtime publication
SELECT
  schemaname,
  tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime';
```

Expected output should include all tracking tables.

### Test Real-time Connection

Open browser console and run:

```javascript
// Test basic connection
const channel = supabase
  .channel("test")
  .on(
    "postgres_changes",
    { event: "*", schema: "public", table: "delivery_tracking" },
    (payload) => console.log("Received:", payload)
  )
  .subscribe((status) => console.log("Status:", status));

// Should log: Status: SUBSCRIBED
```

## Step 4: Active Subscriptions in the App

The following components already have real-time subscriptions configured:

### 1. LiveDeliveryTracking Component

```typescript
// Subscribes to delivery tracking updates
useEffect(() => {
  const channel = supabase
    .channel(`delivery-${loadId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "delivery_tracking",
        filter: `load_id=eq.${loadId}`,
      },
      () => {
        refetchTracking();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [loadId, refetchTracking]);
```

**Triggers on**: New GPS position inserted for the load
**Action**: Refreshes tracking query to show latest position

### 2. useWialonLoadIntegration Hook

```typescript
// Subscribes to geofence events
useEffect(() => {
  const channel = supabase
    .channel(`geofence-events-${loadId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "geofence_events",
        filter: `load_id=eq.${loadId}`,
      },
      (payload) => {
        const event: GeofenceEvent = {
          type: payload.new.event_type,
          geofenceId: payload.new.geofence_id,
          geofenceName: payload.new.geofence_name,
          timestamp: new Date(payload.new.timestamp),
          loadId: payload.new.load_id,
          vehicleId: payload.new.vehicle_id,
        };
        handleGeofenceEvent(event);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [loadId, handleGeofenceEvent]);
```

**Triggers on**: Vehicle enters or exits a geofence
**Action**: Checks auto-status rules and updates load status

### 3. useSingleLoadRealtime Hook

```typescript
// Subscribes to load status changes
useSingleLoadRealtime(loadId, {
  enableNotifications: true,
  onUpdate: (payload) => {
    console.log("Load updated:", payload);
    // Refresh all load-related queries
  },
});
```

**Triggers on**: Any change to the load record
**Action**: Shows real-time indicator and refreshes UI

## Step 5: Monitor Real-time Activity

### Via Supabase Dashboard

1. Go to **Database → Replication**
2. Check "Active Connections" section
3. Should see active subscriptions from your app

### Via SQL

```sql
-- View active real-time connections
SELECT
  pid,
  usename,
  application_name,
  client_addr,
  state,
  query_start
FROM pg_stat_activity
WHERE application_name LIKE '%supabase%';
```

### Via Browser DevTools

1. Open browser DevTools (F12)
2. Go to **Network** tab
3. Filter by "WS" (WebSocket)
4. Look for `realtime/v1/websocket` connection
5. Click to see WebSocket frames with real-time messages

## Step 6: Performance Optimization

### Limit Subscription Scope

Always use filters to reduce payload size:

```typescript
// ✅ Good - filtered by load_id
.on('postgres_changes', {
  event: 'INSERT',
  schema: 'public',
  table: 'delivery_tracking',
  filter: `load_id=eq.${loadId}`,  // Only this load
}, handler)

// ❌ Bad - receives ALL inserts
.on('postgres_changes', {
  event: 'INSERT',
  schema: 'public',
  table: 'delivery_tracking',
}, handler)
```

### Throttle Updates

For high-frequency updates (like GPS), add throttling:

```typescript
const throttledRefetch = useMemo(
  () => throttle(refetchTracking, 5000), // Max once per 5 seconds
  [refetchTracking]
);

useEffect(() => {
  const channel = supabase
    .channel(`delivery-${loadId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "delivery_tracking",
        filter: `load_id=eq.${loadId}`,
      },
      throttledRefetch
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}, [loadId, throttledRefetch]);
```

### Cleanup Subscriptions

Always unsubscribe when components unmount:

```typescript
useEffect(() => {
  const channel = supabase.channel("my-channel").on(/* ... */).subscribe();

  // Cleanup function
  return () => {
    supabase.removeChannel(channel);
  };
}, [dependencies]);
```

## Troubleshooting

### Issue: Real-time not working

**Check 1: Is replication enabled?**

```sql
SELECT * FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
AND tablename = 'delivery_tracking';
```

**Check 2: Are RLS policies correct?**

```sql
-- Test SELECT permission
SELECT * FROM delivery_tracking LIMIT 1;
-- Should return data, not permission error
```

**Check 3: Is WebSocket connected?**

- Open DevTools → Network → WS tab
- Look for `realtime/v1/websocket` with status 101

### Issue: Updates delayed

**Possible causes**:

1. Network latency
2. Too many subscriptions (split into separate channels)
3. Heavy database load (check pg_stat_activity)

**Solution**: Add connection quality indicator:

```typescript
const [connectionStatus, setConnectionStatus] = useState("connecting");

useEffect(() => {
  const channel = supabase
    .channel("status-check")
    .on(
      "postgres_changes",
      {
        /* ... */
      },
      handler
    )
    .subscribe((status) => {
      setConnectionStatus(status); // 'SUBSCRIBED', 'CLOSED', etc.
    });

  return () => supabase.removeChannel(channel);
}, []);
```

### Issue: Too many connections

**Solution**: Use channel multiplexing:

```typescript
// ✅ Good - one channel, multiple subscriptions
const channel = supabase.channel(`load-${loadId}`)
  .on('postgres_changes', { table: 'delivery_tracking', ... }, handler1)
  .on('postgres_changes', { table: 'delivery_events', ... }, handler2)
  .on('postgres_changes', { table: 'geofence_events', ... }, handler3)
  .subscribe();

// ❌ Bad - three separate channels
const channel1 = supabase.channel('tracking').on(/* ... */).subscribe();
const channel2 = supabase.channel('events').on(/* ... */).subscribe();
const channel3 = supabase.channel('geofences').on(/* ... */).subscribe();
```

## Security Considerations

### 1. Filter by User Context

For multi-tenant apps, filter by user/company:

```typescript
const {
  data: { user },
} = await supabase.auth.getUser();

const channel = supabase
  .channel(`user-${user.id}`)
  .on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "loads",
      filter: `created_by=eq.${user.id}`, // Only user's loads
    },
    handler
  )
  .subscribe();
```

### 2. Use RLS Policies

Real-time respects RLS. Example policy:

```sql
CREATE POLICY "Users see only their company's loads"
  ON loads FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id
      FROM user_companies
      WHERE user_id = auth.uid()
    )
  );
```

### 3. Validate Payload Data

Always validate received data:

```typescript
.on('postgres_changes', {
  event: 'INSERT',
  schema: 'public',
  table: 'delivery_tracking',
}, (payload) => {
  // Validate payload structure
  if (!payload.new?.load_id || !payload.new?.latitude) {
    console.error('Invalid payload:', payload);
    return;
  }

  // Process valid data
  handleTrackingUpdate(payload.new);
})
```

## Advanced Configuration

### Custom Event Handling

```typescript
// Handle specific events differently
const channel = supabase
  .channel("advanced-tracking")
  .on(
    "postgres_changes",
    {
      event: "INSERT",
      schema: "public",
      table: "delivery_events",
    },
    (payload) => {
      if (payload.new.event_type === "route_deviation") {
        showCriticalAlert(payload.new);
      } else {
        showStandardNotification(payload.new);
      }
    }
  )
  .subscribe();
```

### Broadcast Messages

Send custom messages between clients:

```typescript
// Client A sends
await channel.send({
  type: "broadcast",
  event: "driver-location-update",
  payload: { lat: -26.123, lng: 28.456 },
});

// Client B receives
channel.on("broadcast", { event: "driver-location-update" }, (payload) => {
  updateMapMarker(payload);
});
```

## Testing Real-time Setup

### Test Script

Run this in browser console:

```javascript
const testRealtime = async () => {
  console.log("🧪 Testing real-time subscriptions...");

  // Test 1: Subscribe to delivery_tracking
  const channel = supabase
    .channel("test-tracking")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "delivery_tracking",
      },
      (payload) => {
        console.log("✅ Received tracking update:", payload);
      }
    )
    .subscribe((status) => {
      console.log("📡 Channel status:", status);
    });

  // Wait 2 seconds for connection
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Test 2: Insert test data
  console.log("📝 Inserting test data...");
  const { data, error } = await supabase.from("delivery_tracking").insert({
    load_id: "test-load-id",
    vehicle_id: "test-vehicle-id",
    latitude: -26.1234,
    longitude: 28.5678,
    speed: 60,
    recorded_at: new Date().toISOString(),
  });

  if (error) {
    console.error("❌ Insert failed:", error);
  } else {
    console.log("✅ Insert successful, waiting for real-time update...");
  }

  // Cleanup
  setTimeout(() => {
    supabase.removeChannel(channel);
    console.log("🧹 Cleanup complete");
  }, 5000);
};

testRealtime();
```

Expected output:

```
🧪 Testing real-time subscriptions...
📡 Channel status: SUBSCRIBED
📝 Inserting test data...
✅ Insert successful, waiting for real-time update...
✅ Received tracking update: { new: {...}, old: null, ... }
🧹 Cleanup complete
```

## Summary Checklist

- [ ] Enable replication for all tracking tables in Supabase Dashboard
- [ ] Configure RLS policies for authenticated users
- [ ] Verify real-time publications in SQL
- [ ] Test WebSocket connection in browser
- [ ] Confirm subscriptions are active in app components
- [ ] Monitor real-time activity in Supabase Dashboard
- [ ] Test geofence auto-status updates
- [ ] Verify ETA updates trigger UI refreshes
- [ ] Check cleanup functions prevent memory leaks
- [ ] Configure alerts for failed subscriptions

---

**Last Updated**: November 17, 2025
**Version**: 1.0
**Related Docs**: `ADVANCED_TRACKING_INTEGRATION_GUIDE.md`, `GEOFENCE_AUTO_STATUS_CONFIG.md`
