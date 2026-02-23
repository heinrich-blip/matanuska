# Hook Verification Guide: useLoadRealtime.ts

This guide provides methods to verify that `useLoadRealtime.ts` and related hooks are functioning correctly in components.

## 1. Browser DevTools Console Verification

### Check Real-time Subscriptions

```javascript
// In Browser Console (F12):

// 1. Check if Supabase channels are active
console.log("Active channels:", window.supabaseClient?.getChannels());

// 2. Monitor all console logs for real-time updates
// Look for: "Load realtime update:" messages from useLoadRealtime.ts
```

### Expected Console Output

When `useLoadRealtime` is working:

```
✅ Load realtime update: { eventType: 'UPDATE', new: {...}, old: {...} }
✅ GPS position updated: { load: 'xxx', lat: -26.xxx, lng: 28.xxx, speed: 60, distance: 120 }
```

## 2. Component-Level Verification

### LiveDeliveryTracking.tsx

**What to verify:**

1. Real-time subscription is established on mount
2. Toast notifications appear on load status changes
3. Query cache invalidates when data updates
4. Custom `onUpdate` callback fires

**Manual Testing Steps:**

```bash
# 1. Open LiveDeliveryTracking component
# 2. Open Browser Console (F12)
# 3. Update a load in another browser tab or via Supabase Dashboard:

UPDATE loads
SET status = 'In Transit'
WHERE id = '<your-load-id>';

# 4. Expected results:
# ✅ Console log: "Load updated in real-time: {...}"
# ✅ Toast notification: "🚛 Load Status Updated"
# ✅ UI updates without page refresh
```

### LoadRealtimeIndicator.tsx

**What to verify:**

1. Shows "Live" badge when connected
2. Shows "Disconnected" badge when offline
3. Updates last connection timestamp

**Testing Steps:**

```bash
# 1. Check indicator shows "Live" with pulsing wifi icon
# 2. Test disconnection:
#    - Open DevTools Network tab
#    - Set throttling to "Offline"
#    - Badge should change to "Disconnected"
# 3. Restore connection
#    - Set throttling back to "Online"
#    - Badge should change to "Live"
```

## 3. Automated Testing Strategies

### Unit Test Template

Create `src/hooks/__tests__/useLoadRealtime.test.ts`:

```typescript
import { renderHook, waitFor } from "@testing-library/react";
import { useLoadRealtime } from "../useLoadRealtime";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

const wrapper = ({ children }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe("useLoadRealtime", () => {
  it("should subscribe to real-time updates on mount", () => {
    const { result } = renderHook(
      () => useLoadRealtime({ loadId: "test-id" }),
      { wrapper }
    );

    // Verify subscription is active
    expect(supabase.channel).toHaveBeenCalledWith("load-test-id");
  });

  it("should call onUpdate callback when data changes", async () => {
    const onUpdate = jest.fn();

    renderHook(
      () =>
        useLoadRealtime({
          loadId: "test-id",
          onUpdate,
        }),
      { wrapper }
    );

    // Simulate real-time update
    // (requires mocking Supabase realtime)

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalled();
    });
  });
});
```

## 4. Network Tab Verification

### Check WebSocket Connection

1. Open DevTools → Network Tab
2. Filter by "WS" (WebSocket)
3. Look for Supabase realtime connection:
   ```
   wss://wxvhkljrbcpcgpgdqhsp.supabase.co/realtime/v1/websocket
   ```

**Healthy Connection Indicators:**

- Status: `101 Switching Protocols`
- Messages tab shows ping/pong frames
- Channel subscription messages appear

### Monitor Real-time Messages

```javascript
// In Messages tab of WebSocket connection, look for:

// 1. Channel join
{
  "event": "phx_join",
  "topic": "realtime:public:loads",
  "payload": { "config": {...} }
}

// 2. Subscription confirmation
{
  "event": "phx_reply",
  "payload": { "status": "ok" }
}

// 3. Data updates
{
  "event": "postgres_changes",
  "payload": {
    "data": {
      "type": "UPDATE",
      "record": { /* load data */ }
    }
  }
}
```

## 5. Integration Testing with Supabase Dashboard

### Test Scenario 1: Status Change

```sql
-- Run in Supabase SQL Editor:

-- 1. Find an active load
SELECT id, load_number, status FROM loads LIMIT 1;

-- 2. Update the status
UPDATE loads
SET status = 'In Transit',
    updated_at = NOW()
WHERE id = '<load-id>';

-- 3. Verify in app:
-- ✅ Toast appears with status change
-- ✅ LoadCard updates without refresh
-- ✅ Console shows "Load realtime update"
```

### Test Scenario 2: Vehicle Assignment

```sql
-- Assign a vehicle to a load
UPDATE loads
SET assigned_vehicle_id = '<vehicle-id>',
    updated_at = NOW()
WHERE id = '<load-id>';

-- Expected:
-- ✅ Toast: "🚚 Vehicle Assigned"
-- ✅ Vehicle info appears in UI
-- ✅ Query cache invalidated
```

### Test Scenario 3: GPS Update (Silent)

```sql
-- Update GPS coordinates
UPDATE loads
SET current_latitude = -26.2041,
    current_longitude = 28.0473,
    current_speed_kmh = 65,
    last_gps_update = NOW()
WHERE id = '<load-id>';

-- Expected:
-- ✅ Console log: "GPS position updated"
-- ✅ Map marker updates
-- ✅ NO toast notification (silent update)
```

## 6. Performance Monitoring

### Check for Memory Leaks

```javascript
// Run in console before navigation:
const channelsBefore = supabase.getChannels().length;
console.log("Channels before:", channelsBefore);

// Navigate to different page, then back

// Run again:
const channelsAfter = supabase.getChannels().length;
console.log("Channels after:", channelsAfter);

// ✅ Should be same (cleanup working)
// ❌ If increasing, channels not cleaning up
```

### Monitor Query Invalidations

```javascript
// Add to component temporarily:
useEffect(() => {
  const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
    if (event.type === "updated") {
      console.log("Query invalidated:", event.query.queryKey);
    }
  });
  return unsubscribe;
}, []);

// Expected on load update:
// Query invalidated: ['loads']
// Query invalidated: ['load', 'xxx-yyy-zzz']
```

## 7. Common Issues & Debugging

### Issue: No Real-time Updates

**Check:**

1. ✅ RLS policies allow authenticated user to read loads
2. ✅ Supabase Realtime enabled for `loads` table
3. ✅ WebSocket connection established (Network tab)
4. ✅ No console errors about subscriptions

**Debug:**

```javascript
// Add temporary logging:
useEffect(() => {
  const channel = supabase.channel("debug-channel");

  channel
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "loads" },
      (payload) => {
        console.log("📡 RAW PAYLOAD:", payload);
      }
    )
    .subscribe((status) => {
      console.log("📡 SUBSCRIPTION STATUS:", status);
    });

  return () => supabase.removeChannel(channel);
}, []);
```

### Issue: Duplicate Notifications

**Cause:** Multiple hook instances subscribing to same data

**Fix:**

```typescript
// Use single instance at top level:
// ❌ Don't do this in multiple child components:
useLoadRealtime({ loadId: "same-id" });

// ✅ Use once in parent:
const ParentComponent = () => {
  useLoadRealtime({ loadId: "same-id" });
  return <ChildComponents />;
};
```

### Issue: Stale Data After Update

**Check:**

```javascript
// Verify queryClient is invalidating:
queryClient.invalidateQueries({ queryKey: ["loads"] });

// Check if queries have proper stale time:
useQuery({
  queryKey: ["loads"],
  staleTime: 5000, // 5 seconds
  refetchOnWindowFocus: true, // Re-fetch on focus
});
```

## 8. Quick Health Check Checklist

Run this checklist to verify everything is working:

```
□ Open app in browser
□ Open DevTools Console (F12)
□ Navigate to LiveDeliveryTracking page
□ Check console for "Load realtime update" logs
□ Check Network → WS tab for WebSocket connection
□ Open Supabase Dashboard in new tab
□ Update a load status in SQL editor
□ Verify:
  □ Console shows update payload
  □ Toast notification appears
  □ UI updates without refresh
  □ LoadRealtimeIndicator shows "Live"
□ Disconnect network (Offline mode)
  □ LoadRealtimeIndicator shows "Disconnected"
□ Reconnect network
  □ LoadRealtimeIndicator shows "Live"
□ Navigate away and back
  □ No duplicate subscriptions (check console)
```

## 9. Production Monitoring

### Add to Production Dashboard

```typescript
// Create monitoring hook:
export const useRealtimeMonitoring = () => {
  useEffect(() => {
    const monitor = setInterval(() => {
      const channels = supabase.getChannels();
      const stats = {
        activeChannels: channels.length,
        channelNames: channels.map((c) => c.topic),
        timestamp: new Date().toISOString(),
      };

      // Send to monitoring service
      console.log("Realtime Health:", stats);
    }, 60000); // Every minute

    return () => clearInterval(monitor);
  }, []);
};
```

## 10. Testing Utilities

### Manual Test Helper

```typescript
// Add to src/utils/testHelpers.ts:

export const simulateLoadUpdate = async (
  loadId: string,
  updates: Partial<Load>
) => {
  const { data, error } = await supabase
    .from("loads")
    .update(updates)
    .eq("id", loadId)
    .select()
    .single();

  console.log("Test update result:", { data, error });
  return { data, error };
};

// Usage in browser console:
// simulateLoadUpdate('load-id', { status: 'In Transit' });
```

### Real-time Event Logger

```typescript
// Temporary debug component:
export const RealtimeDebugger = () => {
  const [events, setEvents] = useState([]);

  useLoadRealtime({
    onUpdate: (payload) => {
      setEvents((prev) =>
        [
          ...prev,
          {
            time: new Date().toISOString(),
            type: payload.eventType,
            data: payload.new,
          },
        ].slice(-10)
      ); // Keep last 10
    },
  });

  return (
    <div className="fixed bottom-4 right-4 bg-black text-white p-4 rounded">
      <h3>Real-time Events</h3>
      {events.map((e, i) => (
        <div key={i}>
          {e.time}: {e.type}
        </div>
      ))}
    </div>
  );
};
```

---

## Summary

**Primary Verification Methods:**

1. **Console Monitoring** - Check for "Load realtime update" logs
2. **Toast Notifications** - Visual feedback on updates
3. **Network Tab** - Verify WebSocket connection
4. **Manual DB Updates** - Trigger updates via Supabase Dashboard
5. **Component Behavior** - UI updates without refresh

**Quick Test:**

```bash
1. Open LiveDeliveryTracking
2. Open Supabase Dashboard
3. Run: UPDATE loads SET status = 'In Transit' WHERE id = '<id>'
4. Check: Toast appears + UI updates
```

If all checks pass, your hooks are functioning correctly! 🎉
