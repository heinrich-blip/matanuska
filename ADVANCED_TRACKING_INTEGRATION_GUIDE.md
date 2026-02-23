# Advanced Track Visualization & Wialon Integration Guide

## Overview

This implementation provides **advanced real-time load tracking**, **dynamic route adjustments**, **predictive ETA**, and **seamless Wialon-Load integration** with automated status management.

## Key Features Implemented

### 1. Advanced Route Tracking Service (`advancedRouteTracking.ts`)

**Capabilities:**

- ✅ Real-time route deviation detection with severity levels (low/medium/high/critical)
- ✅ Automatic alternative route generation when deviations occur
- ✅ Predictive ETA calculation using multiple factors:
  - Historical speed patterns
  - Current traffic conditions (API integration ready)
  - Weather impact (API integration ready)
  - Driver behavior analysis
  - Route complexity assessment
- ✅ Confidence scoring for ETA predictions
- ✅ Enhanced track visualization with heatmaps
- ✅ Comprehensive track analytics:
  - Distance, duration, speed profiles
  - Idle time tracking
  - Harsh braking/acceleration detection
  - Efficiency scoring (0-100)
- ✅ Intelligent stop analysis (planned vs unplanned)
- ✅ Speed-based performance monitoring

### 2. Enhanced Track Visualization Component (`EnhancedTrackVisualization.tsx`)

**Capabilities:**

- ✅ **Interactive Track Playback:**
  - Play/pause/skip controls
  - Variable playback speeds (0.5x to 10x)
  - Timeline scrubber for precise navigation
  - Real-time position indicator
- ✅ **Speed-Based Color Coding:**
  - Red: < 20 km/h (stopped/very slow)
  - Orange: 20-40 km/h (slow)
  - Yellow: 40-60 km/h (moderate)
  - Green: 60-80 km/h (good)
  - Blue: 80-100 km/h (fast)
  - Purple: > 100 km/h (very fast)
- ✅ **Heatmap Visualization:**
  - Shows areas where vehicle spent most time
  - 100m grid resolution
  - Intensity-based rendering
- ✅ **Stop Markers:**
  - Planned stops (green) vs unplanned stops (orange)
  - Duration and location details
  - Geofence association
- ✅ **Analytics Dashboard:**
  - Trip summary (distance, duration, speeds)
  - Efficiency score with progress indicator
  - Driving events (harsh braking, acceleration)
- ✅ **Speed Profile Chart:**
  - Visual representation of speed over time
  - Comparison with speed limits

### 3. Seamless Wialon-Load Integration Hook (`useWialonLoadIntegration.ts`)

**Capabilities:**

- ✅ **Real-time Data Synchronization:**
  - Automatic matching of Wialon vehicles to loads
  - Continuous GPS position updates (10-second intervals)
  - Enhanced vehicle data (fuel, temperature, odometer, engine hours)
- ✅ **Intelligent Route Deviation Monitoring:**
  - Continuous deviation checks (30-second intervals)
  - Severity classification (500m/1km/2km/5km thresholds)
  - Automatic notifications for significant deviations
  - Alternative route suggestions
- ✅ **Predictive ETA Updates:**
  - Automatic recalculation (1-minute intervals)
  - Multi-factor analysis
  - Optimistic/pessimistic scenarios
  - Database persistence
- ✅ **Geofence-Based Automation:**
  - Real-time geofence entry/exit detection
  - Automatic status updates based on configurable rules
  - Confirmation requirements for critical status changes
  - Event logging for audit trail
- ✅ **Auto Status Update Rules:**
  - Pickup location entry → `arrived_pickup`
  - Pickup location exit → `loaded` (requires confirmation)
  - Delivery location entry → `arrived_delivery`
  - Delivery location exit → `delivered` (requires confirmation)
  - Border crossing entry → `border_crossing`
  - Warehouse entry → `at_warehouse`

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     User Interface Layer                         │
├─────────────────────────────────────────────────────────────────┤
│  EnhancedTrackVisualization  │  LiveDeliveryTracking (Enhanced) │
│  - Playback Controls          │  - Real-time Updates             │
│  - Heatmaps                   │  - Status Management             │
│  - Speed Profiles             │  - ETA Display                   │
│  - Analytics Dashboard        │  - Deviation Alerts              │
└──────────────┬──────────────────────────────┬───────────────────┘
               │                              │
┌──────────────▼──────────────┐  ┌───────────▼────────────────────┐
│  useWialonLoadIntegration   │  │  advancedRouteTrackingService  │
│  - GPS Sync                 │  │  - Deviation Detection         │
│  - Status Automation        │  │  - Predictive ETA              │
│  - Geofence Monitoring      │  │  - Track Analytics             │
│  - ETA Updates              │  │  - Heatmap Generation          │
└──────────────┬──────────────┘  └───────────┬────────────────────┘
               │                              │
┌──────────────▼──────────────────────────────▼───────────────────┐
│                    Integration Layer                             │
├──────────────────────────────────────────────────────────────────┤
│  useWialon (Existing)    │  Supabase Real-time  │  React Query  │
│  - Vehicle Locations     │  - Load Updates      │  - Caching    │
│  - Unit Management       │  - Geofence Events   │  - Mutations  │
│  - Historical Tracks     │  - Status Changes    │  - Queries    │
└──────────────┬──────────────────────────────┬───────────────────┘
               │                              │
┌──────────────▼──────────────────────────────▼───────────────────┐
│                        Data Layer                                │
├──────────────────────────────────────────────────────────────────┤
│  Wialon API          │  Supabase PostgreSQL  │  Browser Cache   │
│  - GPS Data          │  - loads              │  - Track Points  │
│  - Vehicle State     │  - delivery_tracking  │  - Analytics     │
│  - Historical Data   │  - delivery_eta       │  - Visualizations│
│                      │  - geofence_events    │                  │
└──────────────────────────────────────────────────────────────────┘
```

## Database Schema Requirements

### New/Modified Tables

```sql
-- Enhanced delivery_tracking table
ALTER TABLE delivery_tracking ADD COLUMN IF NOT EXISTS fuel_level NUMERIC;
ALTER TABLE delivery_tracking ADD COLUMN IF NOT EXISTS temperature NUMERIC;
ALTER TABLE delivery_tracking ADD COLUMN IF NOT EXISTS odometer NUMERIC;
ALTER TABLE delivery_tracking ADD COLUMN IF NOT EXISTS engine_hours NUMERIC;

-- Enhanced delivery_eta table (already exists in database)
-- Note: Table already exists from phase2_live_tracking.sql migration
-- Schema differs - uses separate delay columns instead of factors JSONB
-- Actual schema:
-- CREATE TABLE IF NOT EXISTS delivery_eta (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   load_id UUID NOT NULL REFERENCES loads(id) ON DELETE CASCADE,
--   estimated_arrival TIMESTAMPTZ NOT NULL,
--   actual_arrival TIMESTAMPTZ,
--   calculation_method TEXT DEFAULT 'gps_based',
--   remaining_distance_km NUMERIC(10, 2),
--   average_speed_kmh NUMERIC(6, 2),
--   estimated_duration_minutes INTEGER,
--   confidence_level NUMERIC(3, 2),
--   traffic_delay_minutes INTEGER DEFAULT 0,
--   weather_delay_minutes INTEGER DEFAULT 0,
--   rest_stop_minutes INTEGER DEFAULT 0,
--   calculated_at TIMESTAMPTZ DEFAULT NOW(),
--   ...
-- );
--
-- To use with advancedRouteTracking service, you may want to add these columns:
ALTER TABLE delivery_eta ADD COLUMN IF NOT EXISTS factors JSONB;
ALTER TABLE delivery_eta ADD COLUMN IF NOT EXISTS optimistic_eta TIMESTAMPTZ;
ALTER TABLE delivery_eta ADD COLUMN IF NOT EXISTS pessimistic_eta TIMESTAMPTZ;

-- Geofence events tracking (already exists in database)
-- Note: This table already exists from phase2_live_tracking.sql migration
-- Column name is 'event_timestamp' not 'timestamp'
-- Actual schema:
-- CREATE TABLE IF NOT EXISTS geofence_events (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   geofence_zone_id UUID NOT NULL REFERENCES geofence_zones(id) ON DELETE CASCADE,
--   vehicle_id UUID NOT NULL REFERENCES vehicles(id),
--   load_id UUID REFERENCES loads(id),
--   event_type TEXT NOT NULL,
--   latitude NUMERIC(10, 7),
--   longitude NUMERIC(10, 7),
--   event_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
--   dwell_duration_minutes INTEGER,
--   notification_sent BOOLEAN DEFAULT false,
--   notification_sent_at TIMESTAMPTZ,
--   created_at TIMESTAMPTZ DEFAULT NOW()
-- );

-- Route waypoints (already exists in database)
-- Note: This table already exists from route_planning_loads.sql migration
-- Column names differ from the guide:
-- - 'location_name' not 'name'
-- - 'waypoint_type' not 'type'
-- - has 'trip_id' as primary reference
-- Actual schema:
-- CREATE TABLE IF NOT EXISTS route_waypoints (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   trip_id UUID REFERENCES trips(id) ON DELETE CASCADE NOT NULL,
--   load_id UUID REFERENCES loads(id) ON DELETE SET NULL,
--   sequence INTEGER NOT NULL,
--   waypoint_type waypoint_type NOT NULL,
--   location_name TEXT NOT NULL,
--   address TEXT,
--   lat NUMERIC(10, 7) NOT NULL,
--   lng NUMERIC(10, 7) NOT NULL,
--   planned_arrival TIMESTAMPTZ,
--   planned_departure TIMESTAMPTZ,
--   actual_arrival TIMESTAMPTZ,
--   actual_departure TIMESTAMPTZ,
--   estimated_duration_mins INTEGER,
--   completed BOOLEAN DEFAULT false,
--   completed_at TIMESTAMPTZ,
--   created_at TIMESTAMPTZ DEFAULT NOW(),
--   updated_at TIMESTAMPTZ DEFAULT NOW()
-- );

-- Indexes for performance (check if already exist before creating)
CREATE INDEX IF NOT EXISTS idx_delivery_eta_load_id ON delivery_eta(load_id);
CREATE INDEX IF NOT EXISTS idx_geofence_events_load_id ON geofence_events(load_id);
CREATE INDEX IF NOT EXISTS idx_geofence_events_event_timestamp ON geofence_events(event_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_route_waypoints_load_id ON route_waypoints(load_id);
CREATE INDEX IF NOT EXISTS idx_route_waypoints_sequence ON route_waypoints(load_id, sequence);
```

## Integration Steps

### Step 1: Apply Database Migrations

```bash
# Save the SQL schema above to a migration file
cat > supabase/migrations/$(date +%Y%m%d%H%M%S)_advanced_tracking.sql << 'EOF'
-- [Insert schema from above]
EOF

# Apply via Supabase Dashboard SQL Editor or CLI
```

### Step 2: Update Existing Components

#### LiveDeliveryTracking.tsx Enhancement

```typescript
import { useWialonLoadIntegration } from '@/hooks/useWialonLoadIntegration';
import { EnhancedTrackVisualization } from '@/components/loads/EnhancedTrackVisualization';

// Inside LiveDeliveryTracking component:
const {
  syncState,
  isTracking,
  pendingStatusUpdates,
  toggleAutoSync,
  updateStatus,
} = useWialonLoadIntegration(loadId);

// Display route deviation alert
{syncState?.routeDeviation && (
  <Alert variant="destructive">
    <AlertTriangle className="h-4 w-4" />
    <AlertTitle>Route Deviation Detected</AlertTitle>
    <AlertDescription>
      Vehicle is {syncState.routeDeviation.deviationDistance.toFixed(0)}m off route
      (Severity: {syncState.routeDeviation.severity})
      {syncState.routeDeviation.alternativeRoute && (
        <Button onClick={() => /* Accept alternative route */}>
          View Alternative Route
        </Button>
      )}
    </AlertDescription>
  </Alert>
)}

// Display predictive ETA
{syncState?.predictiveETA && (
  <Card>
    <CardHeader>
      <CardTitle>Predictive ETA</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-2xl font-bold">
        {syncState.predictiveETA.estimatedArrival.toLocaleTimeString()}
      </p>
      <p className="text-sm text-muted-foreground">
        Confidence: {(syncState.predictiveETA.confidence * 100).toFixed(0)}%
      </p>
      <div className="mt-2 text-xs">
        <p>Optimistic: {syncState.predictiveETA.alternativeETAs.optimistic.toLocaleTimeString()}</p>
        <p>Pessimistic: {syncState.predictiveETA.alternativeETAs.pessimistic.toLocaleTimeString()}</p>
      </div>
    </CardContent>
  </Card>
)}

// Handle pending status updates
{pendingStatusUpdates.map(update => (
  <Alert key={update.geofenceEvent.timestamp.toISOString()}>
    <AlertTitle>Status Update Recommended</AlertTitle>
    <AlertDescription>
      Change status to "{update.newStatus}" based on geofence event
      <Button onClick={() => updateStatus({ newStatus: update.newStatus })}>
        Confirm
      </Button>
    </AlertDescription>
  </Alert>
))}
```

#### Add Enhanced Visualization to Load Details Page

```typescript
// In LoadDetails.tsx or similar
import { EnhancedTrackVisualization } from "@/components/loads/EnhancedTrackVisualization";

<EnhancedTrackVisualization
  vehicleId={load.vehicle.id}
  vehicleName={load.vehicle.name}
  startTime={load.pickup_time}
  endTime={load.delivery_time || new Date()}
  plannedRoute={routeWaypoints}
  showHeatmap={true}
  showSpeedProfile={true}
  showAnalytics={true}
/>;
```

### Step 3: Configure Auto Status Rules (Optional)

Customize the auto-status update rules in `useWialonLoadIntegration.ts`:

```typescript
const customAutoStatusRules: AutoStatusUpdateRule[] = [
  {
    geofenceType: "pickup",
    eventType: "entry",
    currentStatus: "dispatched",
    newStatus: "arrived_pickup",
    requiresConfirmation: false,
  },
  // Add more custom rules...
];
```

### Step 4: Enable Real-time Subscriptions

Ensure Supabase Real-time is enabled for:

- `delivery_tracking` table
- `delivery_eta` table
- `geofence_events` table
- `loads` table

In Supabase Dashboard:

1. Go to Database → Replication
2. Enable replication for these tables
3. Set publications to include all operations (INSERT, UPDATE, DELETE)

### Step 5: Configure Wialon Geofences

Map your existing geofences to the types used by auto-status rules:

- Pickup locations: Include "pickup" in geofence name
- Delivery locations: Include "delivery" in geofence name
- Border crossings: Include "border" in geofence name
- Warehouses: Include "warehouse" in geofence name

## Usage Examples

### Example 1: Monitor Active Load with Live Tracking

```typescript
import { useWialonLoadIntegration } from "@/hooks/useWialonLoadIntegration";

function ActiveLoadMonitor({ loadId }: { loadId: string }) {
  const { syncState, isTracking, toggleAutoSync, manualRefresh } =
    useWialonLoadIntegration(loadId);

  return (
    <div>
      <div className="flex items-center gap-2">
        <Badge variant={isTracking ? "success" : "secondary"}>
          {isTracking ? "Tracking Active" : "Not Tracking"}
        </Badge>
        <Button onClick={toggleAutoSync}>
          {syncState?.autoSyncEnabled ? "Disable" : "Enable"} Auto-Sync
        </Button>
        <Button onClick={manualRefresh}>Refresh</Button>
      </div>

      {syncState?.currentLocation && (
        <div className="mt-4">
          <p>Speed: {syncState.currentLocation.speed.toFixed(1)} km/h</p>
          <p>Heading: {syncState.currentLocation.heading.toFixed(0)}°</p>
          <p>
            Last Update: {syncState.currentLocation.timestamp.toLocaleString()}
          </p>
        </div>
      )}

      {syncState?.routeDeviation && (
        <Alert variant="destructive">
          Route deviation:{" "}
          {syncState.routeDeviation.deviationDistance.toFixed(0)}m (
          {syncState.routeDeviation.severity})
        </Alert>
      )}
    </div>
  );
}
```

### Example 2: Historical Track Analysis

```typescript
import { EnhancedTrackVisualization } from "@/components/loads/EnhancedTrackVisualization";

function TripAnalysis({ vehicleId }: { vehicleId: string }) {
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
    end: new Date(),
  });

  return (
    <EnhancedTrackVisualization
      vehicleId={vehicleId}
      vehicleName="Fleet-001"
      startTime={dateRange.start}
      endTime={dateRange.end}
      showHeatmap={true}
      showSpeedProfile={true}
      showAnalytics={true}
    />
  );
}
```

### Example 3: Route Deviation Alerts

```typescript
import { advancedRouteTrackingService } from "@/services/advancedRouteTracking";

function checkDeviation(
  currentLat: number,
  currentLng: number,
  plannedRoute: any[]
) {
  const deviation = advancedRouteTrackingService.calculateRouteDeviation(
    { latitude: currentLat, longitude: currentLng, speed: 60 },
    plannedRoute,
    loadId
  );

  if (deviation && deviation.severity !== "low") {
    // Send notification
    notifyDriver({
      title: "Route Deviation",
      message: `You are ${deviation.deviationDistance.toFixed(0)}m off route`,
      severity: deviation.severity,
    });

    if (deviation.alternativeRoute) {
      // Suggest alternative
      showAlternativeRoute(deviation.alternativeRoute);
    }
  }
}
```

## Performance Optimizations

1. **Distance Calculation Caching**: 10,000 entry LRU cache for distance calculations
2. **Throttled Updates**:
   - Route deviation: 30-second intervals
   - ETA recalculation: 1-minute intervals
   - GPS updates: 10-second intervals
3. **Heatmap Grid Resolution**: 100m for optimal performance
4. **Track Point Sampling**: Configurable sampling for long tracks
5. **React Query Caching**: Automatic caching with smart invalidation

## Advanced Features Ready for Integration

### 1. Traffic API Integration

```typescript
// In advancedRouteTracking.ts, update:
private async estimateTrafficFactor(
  currentLocation: VehicleLocation,
  destination: { lat: number; lng: number }
): Promise<number> {
  // Integrate with Google Maps Directions API
  const response = await fetch(
    `https://maps.googleapis.com/maps/api/directions/json?` +
    `origin=${currentLocation.latitude},${currentLocation.longitude}&` +
    `destination=${destination.lat},${destination.lng}&` +
    `departure_time=now&` +
    `traffic_model=best_guess&` +
    `key=${GOOGLE_MAPS_API_KEY}`
  );

  const data = await response.json();
  const durationInTraffic = data.routes[0]?.legs[0]?.duration_in_traffic?.value;
  const duration = data.routes[0]?.legs[0]?.duration?.value;

  return duration / durationInTraffic; // Returns 0.5-1.0
}
```

### 2. Weather Impact Integration

```typescript
// Integrate with OpenWeather API
private async estimateWeatherImpact(currentLocation: VehicleLocation): Promise<number> {
  const response = await fetch(
    `https://api.openweathermap.org/data/2.5/weather?` +
    `lat=${currentLocation.latitude}&lon=${currentLocation.longitude}&` +
    `appid=${OPENWEATHER_API_KEY}`
  );

  const data = await response.json();
  const weatherCode = data.weather[0]?.id;

  // Rain: 0.9, Snow: 0.7, Clear: 1.0
  if (weatherCode >= 600 && weatherCode < 700) return 0.7; // Snow
  if (weatherCode >= 500 && weatherCode < 600) return 0.9; // Rain
  return 1.0; // Clear
}
```

### 3. Machine Learning for Driver Behavior

```typescript
// Train model on historical data
class DriverBehaviorPredictor {
  async predictArrivalTime(
    driverId: string,
    route: RouteWaypoint[],
    historicalTrips: any[]
  ): Promise<Date> {
    // Use ML model to predict based on:
    // - Driver's historical speed patterns
    // - Time of day preferences
    // - Route familiarity
    // - Historical stop durations
  }
}
```

## Monitoring & Analytics

### Key Metrics to Track

1. **Route Efficiency**:

   - Deviation frequency and severity
   - Time on planned route vs off-route
   - Alternative route acceptance rate

2. **ETA Accuracy**:

   - Predicted vs actual arrival time
   - Confidence score correlation
   - Factor contribution analysis

3. **Driver Performance**:

   - Efficiency scores over time
   - Harsh event frequency
   - Idle time percentages

4. **System Performance**:
   - API response times
   - Real-time update latency
   - Cache hit rates

## Troubleshooting

### Issue: Vehicle not syncing with Wialon

**Solution**: Check vehicle name matching:

```typescript
// Ensure vehicle names match exactly or use registration fallback
const wialonVehicle = vehicleLocations.find(
  (v) =>
    v.name.toLowerCase() === loadData.vehicle.name.toLowerCase() ||
    v.name.includes(loadData.vehicle.registration)
);
```

### Issue: Route deviation alerts too frequent

**Solution**: Adjust threshold in `advancedRouteTracking.ts`:

```typescript
private deviationThresholds = {
  low: 1000, // Increase from 500m to 1000m
  medium: 2000, // Increase from 1km to 2km
  high: 3000,
  critical: 5000,
};
```

### Issue: ETA predictions inaccurate

**Solution**: Fine-tune factor weights:

```typescript
const adjustedSpeed =
  factors.historicalSpeed * 0.4 +
  factors.currentTraffic * 0.3 +
  factors.weatherImpact * 0.1 +
  factors.driverBehavior * 0.2;
```

## Future Enhancements

1. **Predictive Maintenance**: Use engine hours, fuel consumption for maintenance alerts
2. **Load Optimization**: Suggest load consolidation based on route analysis
3. **Driver Coaching**: Provide real-time feedback on driving efficiency
4. **Carbon Tracking**: Calculate CO2 emissions based on fuel consumption
5. **Customer ETA Sharing**: Automated ETA updates to customers via SMS/email
6. **Multi-Load Routing**: Optimize routes for vehicles handling multiple loads

## Summary

This implementation provides a comprehensive, production-ready system for:

- ✅ Real-time load tracking with Wialon integration
- ✅ Dynamic route monitoring and deviation detection
- ✅ Predictive ETA with confidence scoring
- ✅ Automated status updates based on geofence events
- ✅ Advanced track visualization with playback controls
- ✅ Comprehensive analytics and performance metrics
- ✅ Scalable architecture with caching and optimization
- ✅ Ready for traffic/weather API integration

The system is designed to be **extensible**, **performant**, and **user-friendly** while maintaining seamless integration with existing Car Craft Co infrastructure.
