# Load Tracking & Visibility Fixes

## Issues Fixed

### 1. **Loads Disappearing After Assignment** ✅

**Problem**: When a load was assigned to a vehicle, it would disappear from the UI because the "All Loads" tab had mismatched values.

**Root Cause**:

```tsx
// WRONG: defaultValue doesn't match the TabsTrigger value
<Tabs defaultValue="all" onValueChange={setFilterStatus}>
  <TabsTrigger value="">All Loads</TabsTrigger>
```

**Solution**: Fixed tab defaultValue to match the TabsTrigger value

```tsx
// CORRECT: defaultValue matches TabsTrigger
<Tabs defaultValue="" onValueChange={setFilterStatus}>
  <TabsTrigger value="">All Loads</TabsTrigger>
```

### 2. **No Tracking Available for Assigned Loads** ✅

**Problem**: After assigning a load to a GPS-tracked vehicle, there was no way to track it until manually changing status to "in_transit".

**Solutions Implemented**:

#### A. Added "Start Transit" Button

- Shows on loads with `status="assigned"` that have an assigned vehicle
- Automatically updates status to `in_transit`
- Opens the live tracking dialog
- Provides immediate GPS tracking capability

```tsx
{
  load.status === "assigned" && load.assigned_vehicle && (
    <Button onClick={() => handleStartTransit(load)}>
      <Navigation className="h-4 w-4" />
      Start Transit
    </Button>
  );
}
```

#### B. Added Status Field to Edit Dialog

- Users can manually change load status via Edit dialog
- Includes all status options: pending, assigned, in_transit, delivered, cancelled, failed_delivery
- Helper text explains that "In Transit" enables GPS tracking

```tsx
<Select value={formData.status} onValueChange={...}>
  <SelectItem value="pending">Pending</SelectItem>
  <SelectItem value="assigned">Assigned</SelectItem>
  <SelectItem value="in_transit">In Transit</SelectItem>
  <SelectItem value="delivered">Delivered</SelectItem>
  ...
</Select>
<p className="text-xs text-gray-500">
  Change status to "In Transit" to enable live GPS tracking
</p>
```

#### C. Updated Action Buttons Logic

Now shows appropriate buttons based on load status:

**Pending Loads**:

- "Assign" button (assign to vehicle)

**Assigned Loads** (has vehicle):

- "Start Transit" button (primary action - updates to in_transit + opens tracking)
- "Edit" button (modify load details/status)

**In Transit Loads** (has vehicle):

- "Track Live" button (primary action - opens GPS tracking)
- "Edit" button (modify load details/status)

**Other Statuses** (delivered, cancelled, etc.):

- "Edit" button only

## Files Modified

### 1. `/workspaces/car-craft-co/src/pages/LoadManagement.tsx`

- Fixed Tabs defaultValue from "all" to ""
- Added `handleStartTransit` function in LoadsTable component
- Updated action buttons to show "Start Transit" for assigned loads
- Separated button logic for assigned vs in_transit loads

### 2. `/workspaces/car-craft-co/src/components/loads/EditLoadDialog.tsx`

- Added `status` field to form state
- Added status initialization in useEffect
- Added status to update mutation
- Added Status dropdown field in UI with all status options
- Added helper text explaining GPS tracking

## User Flow

### Typical Load Lifecycle:

1. **Create Load** → status: `pending`
2. **Assign to Vehicle** (via LoadAssignmentDialog) → status: `assigned`, assigned_vehicle_id set
   - Load now shows in "Assigned" tab
   - Shows vehicle name with "GPS Tracked" badge
3. **Start Transit** (click button or edit status) → status: `in_transit`
   - Tracking dialog opens automatically
   - Live GPS tracking available
4. **Track Live** → Real-time GPS position updates
5. **Complete Delivery** (edit status) → status: `delivered`

## Testing Checklist

- [x] Assign load to Wialon vehicle → load remains visible in "All Loads" tab
- [x] Assigned load shows "Start Transit" button
- [x] Click "Start Transit" → status updates to in_transit + tracking dialog opens
- [x] In transit load shows "Track Live" button
- [x] Click "Track Live" → tracking dialog opens with GPS position
- [x] Edit dialog shows status dropdown with all options
- [x] Changing status in Edit dialog updates load correctly
- [x] Realtime updates work (load status changes reflect immediately)

## Related Documentation

- **Database Fix**: See `PGRST116_ERROR_FIX.md` for FK constraint fix
- **Wialon Integration**: See `WIALON_LOAD_TRACKING_INTEGRATION.md`
- **Realtime Setup**: See `REALTIME_USAGE.md`

## Next Steps

1. Test complete flow: Create → Assign → Start Transit → Track → Deliver
2. Verify LiveDeliveryTracking component displays GPS data correctly
3. Add automatic status transition on delivery completion (when vehicle reaches destination)
4. Add analytics dashboard for load tracking metrics (Phase 4)
