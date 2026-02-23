# Wialon GPS Integration for Load Management & Tracking

## Overview

Your load management system now integrates seamlessly with Wialon GPS tracking to select vehicles and track deliveries in real-time. This allows dispatchers to see live vehicle locations, assign loads to nearby vehicles, and monitor delivery progress.

## Key Components Created

### 1. **VehicleSelector Component** (`/src/components/loads/VehicleSelector.tsx`)

A reusable component that shows all vehicles with live GPS data from Wialon.

**Features:**

- ✅ Lists all active vehicles from your database
- ✅ Merges real-time GPS data from Wialon (lat/lng, speed, last update)
- ✅ Calculates distance from load origin using Haversine formula
- ✅ Filters by GPS availability (show only vehicles with active tracking)
- ✅ Searches by fleet number, registration, make, model
- ✅ Auto-sorts by distance (nearest first)
- ✅ Shows live speed, location coordinates, last update time
- ✅ Connect/refresh GPS data with one click

**Props:**

```typescript
interface VehicleSelectorProps {
  onSelect: (vehicleId: string, vehicleName: string) => void;
  selectedVehicleId?: string;
  showGPSOnly?: boolean; // Only show vehicles with GPS
  originLat?: number; // Calculate distance from this point
  originLng?: number;
}
```

**Example Usage:**

```tsx
<VehicleSelector
  onSelect={(vehicleId, vehicleName) => {
    console.log(`Selected: ${vehicleName}`);
  }}
  showGPSOnly={true}
  originLat={-26.2041}
  originLng={28.0473}
/>
```

### 2. **Enhanced CreateLoadDialog** (`/src/components/loads/CreateLoadDialog.tsx`)

The load creation dialog now includes optional vehicle assignment with GPS integration.

**New Features:**

- ✅ Checkbox: "Assign vehicle now"
- ✅ Embedded VehicleSelector with live GPS data
- ✅ Shows only vehicles with active GPS tracking
- ✅ Auto-calculates distance from load origin
- ✅ Immediately assigns vehicle when load is created
- ✅ Sets load status to "assigned" automatically

**How It Works:**

1. Dispatcher fills in load details (origin, destination, cargo, etc.)
2. Enters origin GPS coordinates (if known)
3. Checks "Assign vehicle now"
4. VehicleSelector appears showing nearby vehicles with GPS
5. Vehicles are sorted by distance (closest first)
6. Dispatcher clicks a vehicle to select
7. "Create Load" button creates the load AND assigns it to the vehicle in one step

### 3. **LoadAssignmentDialog** (`/src/components/loads/LoadAssignmentDialog.tsx`)

Already enhanced with GPS-based vehicle selection:

- Shows vehicles sorted by proximity to load origin
- Displays real-time GPS distance
- Calculates assignment scores (distance + capacity + priority)
- Shows live vehicle speed and location

## How Wialon Integration Works

### Data Flow

```
Wialon API
    ↓
useWialon() hook
    ↓
vehicleLocations array (real-time GPS data)
    ↓
Merged with database vehicles
    ↓
Displayed in VehicleSelector / LoadAssignmentDialog
```

### GPS Data Structure

```typescript
interface VehicleLocation {
  vehicleId: string; // Unit ID from Wialon
  vehicleName: string; // Unit name
  latitude: number; // Current GPS latitude
  longitude: number; // Current GPS longitude
  speed: number; // Speed in km/h
  timestamp: Date; // Last GPS update time
  heading?: number; // Direction (0-360°)
  altitude?: number; // Elevation in meters
}
```

### Matching Wialon Units to Database Vehicles

The system matches Wialon units to your vehicles table by:

1. **Fleet Number**: `vehicleName === vehicle.fleet_number`
2. **Registration**: `vehicleId === vehicle.registration_number`

**Important**: Ensure your Wialon unit names match your fleet numbers or registration numbers for proper integration.

## Usage Examples

### 1. Create Load with Immediate Vehicle Assignment

```tsx
// In CreateLoadDialog:
1. Fill in customer details
2. Enter origin: "Johannesburg, Gauteng"
3. Enter origin GPS: Lat -26.2041, Lng 28.0473
4. Enter destination details
5. Check "Assign vehicle now"
6. VehicleSelector shows nearby vehicles:
   - FL-001 (ABC-123) - 2.5 km away - GPS Active - 45 km/h
   - FL-005 (XYZ-789) - 8.1 km away - GPS Active - 0 km/h
7. Click FL-001
8. Click "Create Load"
9. Load created AND assigned to FL-001 automatically
```

### 2. Assign Vehicle to Existing Load

```tsx
// In LoadManagement page:
1. Click "Assign" button on pending load
2. LoadAssignmentDialog opens
3. Shows load details (origin, weight, priority)
4. Lists vehicles sorted by GPS distance:
   - Nearest vehicles at top
   - Shows distance from load origin
   - Displays current speed and location
   - Highlights insufficient capacity in red
5. Click vehicle to select
6. Click "Assign Vehicle"
7. Load status → "assigned"
8. Vehicle can now be tracked on GPS Tracking page
```

### 3. Track Active Delivery

Once a load is assigned to a vehicle with GPS:

**On Load Management Page:**

- Load status shows "in_transit"
- Can see assigned vehicle details
- Real-time status updates via Supabase Realtime

**On GPS Tracking Page:**

- Vehicle marker on map with load information
- Live route tracking
- ETA calculations (coming soon)
- Delivery proof of completion (coming soon)

## Database Schema Integration

### Updated `loads` Table

```sql
loads (
  ...existing fields...
  assigned_vehicle_id UUID REFERENCES vehicles(id),
  status load_status DEFAULT 'pending',
  -- Status values: pending, assigned, in_transit, delivered, cancelled, failed_delivery
)
```

### Vehicle Availability Tracking

```sql
vehicle_availability (
  vehicle_id UUID REFERENCES vehicles(id),
  current_lat NUMERIC(10, 7),
  current_lng NUMERIC(10, 7),
  available_capacity_kg NUMERIC(10, 2),
  last_gps_update TIMESTAMPTZ,
  is_available BOOLEAN DEFAULT true
)
```

This table is automatically synced with Wialon GPS data.

## Real-Time Updates

### Supabase Realtime Integration

The system listens for changes to loads in real-time:

```typescript
// In LoadManagement.tsx
useEffect(() => {
  const channel = supabase
    .channel("loads-changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "loads" },
      (payload) => {
        // Update UI automatically when:
        // - Load is assigned to vehicle
        // - Status changes (in_transit, delivered)
        // - Driver updates from mobile app
      }
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}, []);
```

**Benefits:**

- Dispatchers see instant updates when drivers accept loads
- Status changes reflected across all open tabs
- No manual refresh needed
- Multi-user collaboration support

## Mobile Driver App Integration (Future)

The system is designed to support a mobile driver app:

### Driver Workflow:

1. Driver logs into mobile app
2. Sees assigned loads for their vehicle
3. Taps "Start Delivery" → status: `in_transit`
4. GPS tracks route automatically
5. Arrives at destination
6. Taps "Complete Delivery"
7. Takes photo proof
8. Collects signature
9. Status → `delivered`
10. Dispatcher sees update instantly

## Configuration

### Wialon API Setup

Your Wialon integration is configured in:

- **Token**: Stored in environment variables
- **Base URL**: `https://hst-api.wialon.com/wialon/ajax.html`
- **Connection**: Handled by `useWialon()` hook

### Environment Variables

```env
VITE_WIALON_TOKEN=your_token_here
VITE_WIALON_BASE_URL=https://hst-api.wialon.com/wialon/ajax.html
```

## Troubleshooting

### GPS Data Not Showing

**Problem**: VehicleSelector shows "No vehicles with GPS tracking found"

**Solutions:**

1. Check Wialon connection status (look for "GPS Connected" badge)
2. Click "Connect GPS" button
3. Verify Wialon unit names match fleet numbers in database
4. Check Wialon API token in environment variables
5. Ensure units are transmitting data in Wialon

### Vehicle Distance Not Calculating

**Problem**: Distance shows "N/A" or not calculated

**Causes:**

- Load origin GPS coordinates not entered
- Vehicle doesn't have current GPS position
- Wialon data not syncing

**Fix:**

1. Enter origin latitude and longitude when creating load
2. Refresh GPS data (click refresh button)
3. Check if vehicle has recent GPS updates in Wialon

### Assignment Not Working

**Problem**: "Assign vehicle now" doesn't assign vehicle

**Check:**

1. Vehicle is selected (green checkmark shown)
2. Load is being created successfully (check console for errors)
3. Database `assigned_vehicle_id` column exists
4. User has permissions to update loads table

## Performance Optimization

### GPS Data Caching

- Wialon data is cached by React Query for 30 seconds
- Auto-refreshes every 60 seconds if real-time updates enabled
- Manual refresh available via button

### Database Queries

- Vehicle list cached with `react-query`
- Only active vehicles fetched (`WHERE active = true`)
- Sorted by fleet number for consistent ordering

## Next Steps

### Phase 1 - Current (Completed ✅)

- [x] VehicleSelector with Wialon GPS
- [x] Immediate assignment during load creation
- [x] Distance calculation from origin
- [x] Real-time vehicle location display

### Phase 2 - Enhanced Tracking

- [ ] Live vehicle tracking on map during delivery
- [ ] ETA calculations based on GPS route
- [ ] Geofencing alerts (when vehicle enters/exits zones)
- [ ] Route optimization with actual GPS data

### Phase 3 - Mobile App

- [ ] Driver mobile app for iOS/Android
- [ ] Push notifications for new assignments
- [ ] Offline mode with data sync
- [ ] Photo proof of delivery
- [ ] Digital signature capture

### Phase 4 - Analytics

- [ ] Delivery performance metrics
- [ ] Driver behavior analysis
- [ ] Route efficiency reports
- [ ] Cost per kilometer tracking
- [ ] Customer delivery time analytics

## API Reference

### useWialon Hook

```typescript
const {
  isConnected, // Boolean: Wialon connection status
  isLoading, // Boolean: Loading state
  vehicleLocations, // VehicleLocation[]: Live GPS data
  connect, // Function: Connect to Wialon
  disconnect, // Function: Disconnect from Wialon
  refreshUnits, // Function: Refresh GPS data
  error, // Error | null: Connection error
} = useWialon({
  autoConnect: true, // Auto-connect on mount
  enableRealtimeUpdates: true, // Enable 60s polling
});
```

### VehicleSelector Component

```typescript
<VehicleSelector
  onSelect={(vehicleId: string, vehicleName: string) => void}
  selectedVehicleId?: string
  showGPSOnly?: boolean
  originLat?: number
  originLng?: number
/>
```

### useLoads Hook (Enhanced)

```typescript
const {
  loads, // Load[]: All loads
  createLoad, // Function: Create new load
  assignLoad, // Function: Assign load to vehicle
  findNearestVehicles, // Function: Find vehicles near load origin
  isLoading, // Boolean: Loading state
} = useLoads({ status: "pending", priority: "urgent" });
```

## Support & Maintenance

### Monitoring GPS Integration

Check these areas regularly:

1. Wialon connection status (should stay "GPS Connected")
2. Vehicle GPS data freshness (timestamps should be recent)
3. Error logs in browser console
4. Supabase realtime connection (check Supabase dashboard)

### Common Maintenance Tasks

**Weekly:**

- Verify all vehicles showing in Wialon
- Check GPS data accuracy
- Review assignment success rate

**Monthly:**

- Update Wialon API token if rotating
- Review and optimize database indexes
- Clean up old load data (delivered/cancelled)

---

## Summary

Your load management system now has full GPS integration:

✅ **Create loads and assign vehicles in one step**
✅ **See live vehicle locations with distance calculations**
✅ **Track deliveries with real-time GPS data**
✅ **Automatic status updates via Supabase Realtime**
✅ **Ready for mobile driver app integration**

All vehicles with active GPS tracking in Wialon are automatically available for selection when creating or assigning loads. The system intelligently suggests the nearest available vehicles based on real-time GPS positions.
