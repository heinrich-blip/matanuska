# System Integration Points Documentation

## Overview

This document details all integration points within the Car Craft Co Fleet Management System, including data flows, involved components, and API interactions.

---

## 1. SUPABASE INTEGRATION

### 1.1 Core Database Integration

**Entry Point:** `src/integrations/supabase/client.ts`

**Configuration:**

- Environment Variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- Authentication: Local storage persistence, auto-refresh tokens
- Type Safety: Auto-generated types from `types.ts`

**Data Flow:**

```
Frontend Component
    ↓
Custom Hook (useLoads, useVehicles, etc.)
    ↓
Supabase Client
    ↓
PostgreSQL Database (via REST API)
    ↓
Row Level Security (RLS) Policies
    ↓
Return Data to Hook
    ↓
React Query Cache
    ↓
Component Re-render
```

**Key Tables:**

- `loads` - Load/shipment management
- `vehicles` - Fleet vehicle records
- `wialon_vehicles` - Wialon GPS unit mappings
- `trips` - Trip planning and execution
- `tyres` - Tyre inventory and tracking
- `fleet_tyre_positions` - Vehicle-specific tyre configurations
- `driver_behavior_events` - Driver performance tracking
- `vehicle_faults` - Maintenance and fault tracking
- `geofences` - Geographic boundary definitions
- `geofence_events` - Entry/exit tracking
- `calendar_events` - Maintenance scheduling
- `users` - User authentication and profiles

### 1.2 Real-time Subscriptions

**Implementation:** `src/hooks/useLoadRealtime.ts`, `src/hooks/useRealtimeVehicles.ts`

**Data Flow:**

```
Database Change (INSERT/UPDATE/DELETE)
    ↓
PostgreSQL Triggers
    ↓
Supabase Realtime (WebSocket)
    ↓
Frontend Subscription Channel
    ↓
useLoadRealtime Hook
    ↓
Event Handler (handleInsert/Update/Delete)
    ↓
React Query Cache Invalidation
    ↓
Toast Notification (if enabled)
    ↓
Component Re-render with Fresh Data
```

**Monitored Tables:**

- `loads` - Real-time load status updates
- `vehicles` - Vehicle status changes
- `tyres` - Tyre position/status changes
- `vehicle_faults` - New fault entries
- `driver_behavior_events` - Driver event alerts
- `geofence_events` - Geofence boundary crossings

**Key Features:**

- Automatic query cache invalidation
- Toast notifications for status changes
- GPS position updates (silent logging)
- Vehicle assignment alerts
- Pickup/delivery completion notifications

### 1.3 Authentication Integration

**Entry Point:** `src/contexts/AuthContext.tsx`

**Data Flow:**

```
User Login (Email/Password)
    ↓
supabase.auth.signInWithPassword()
    ↓
Supabase Auth API
    ↓
JWT Token Generation
    ↓
Local Storage Persistence
    ↓
AuthContext State Update
    ↓
Protected Route Access Granted
    ↓
onAuthStateChange Listener
    ↓
Session Refresh (Auto)
```

**Components Using Auth:**

- All protected routes via `<ProtectedRoute>`
- User profile data in `Layout.tsx`
- Access control via `useUserAccess.ts`

---

## 2. WIALON GPS INTEGRATION

### 2.1 Wialon API Proxy

**Entry Point:** `supabase/functions/wialon-proxy/index.ts`

**Purpose:** Server-side proxy to avoid CORS and secure token management

**Data Flow:**

```
Frontend (useWialon hook)
    ↓
callAPI('service_name', params)
    ↓
Supabase Edge Function (wialon-proxy)
    ↓
Wialon API (hst-api.wialon.eu)
    ↓
Response Processing
    ↓
Error Handling (codes 1,2,4,7)
    ↓
Return to Frontend
    ↓
useWialon State Update
```

**Configuration:**

- Environment: `VITE_WIALON_TOKEN`, `VITE_WIALON_HOST`
- Proxy URL: `/wialon-api` (dev), direct in production
- Session Management: Token-based authentication

### 2.2 Wialon Context Provider

**Entry Point:** `src/integrations/wialon/WialonProvider.tsx`

**Architecture:**

```
App.tsx
    ↓
WialonProvider (Global State)
    ├─ useWialon() Hook
    ├─ Connection Management
    ├─ Session Storage
    └─ Unit Fetching
        ↓
    WialonContext
        ↓
    useWialonContext() (Consumer Hook)
        ↓
    Component Access to:
        - vehicleLocations[]
        - units[]
        - isConnected
        - callAPI()
        - connect()
        - refreshUnits()
```

**Key Methods:**

- `connect()` - Establish Wialon session
- `callAPI()` - Make Wialon API calls
- `refreshUnits()` - Update vehicle positions
- `getUnitById()` - Find specific unit
- `searchUnits()` - Filter units by criteria

### 2.3 Vehicle Location Tracking

**Implementation:** `src/integrations/wialon/useWialon.ts`

**Data Flow:**

```
Wialon API (core/search_items)
    ↓
Units with Position Data
    ↓
fetchWialonVehicleMapping() (Database lookup)
    ↓
Map Wialon Unit ID → Database Vehicle ID
    ↓
Process Vehicle Locations:
        - latitude/longitude
        - speed, heading
        - timestamp
        - fuel, temperature (sensors)
        - status (online/offline/moving/stopped)
    ↓
setVehicleLocations[] State
    ↓
Components Consume:
        - UnifiedMapView
        - GPSTracking
        - LiveDeliveryTracking
```

**Refresh Strategy:**

- Auto-refresh every 30-60 seconds (configurable)
- Manual refresh on user action
- Real-time position updates via polling

### 2.4 Sensor Data Integration

**Entry Point:** `src/hooks/useWialonSensors.ts`

**Data Flow:**

```
Component (WialonSensorWidget)
    ↓
useWialonSensors({ unitId })
    ↓
Fetch Sensors:
    callAPI('core/search_items', { flags: 0x1000 })
    ↓
Fetch Last Message:
    callAPI('core/search_items', { flags: 0x400 })
    ↓
Calculate Sensor Values:
    - Raw parameter value from message.p[sensor.p]
    - Apply calibration table (for fuel sensors)
    - Format by type (fuel, temp, speed, etc.)
    ↓
Return SensorValue[]:
    - sensorId, sensorName, sensorType
    - value, formattedValue, unit
    - timestamp, isValid
    ↓
Display in Widget
```

**Sensor Types:**

- Fuel level (with calibration)
- Temperature
- Speed
- Odometer/Mileage
- Engine hours
- Ignition status
- Voltage

### 2.5 Wialon-Load Integration

**Entry Point:** `src/hooks/useWialonLoadIntegration.ts`

**Data Flow:**

```
Load Assignment
    ↓
Load has assigned_vehicle_id
    ↓
Lookup in wialon_vehicles table
    ↓
Get wialon_unit_id
    ↓
useWialonLoadIntegration(loadId)
    ↓
Subscribe to Vehicle GPS Updates
    ↓
On Position Change:
        ├─ Update load.current_latitude/longitude
        ├─ Update load.current_speed_kmh
        ├─ Calculate total_km_traveled
        └─ Update last_gps_update timestamp
    ↓
Auto-Status Updates:
    ├─ If near pickup location → "At Pickup"
    ├─ If near delivery location → "At Delivery"
    └─ If moving → "In Transit"
    ↓
Database Update (loads table)
    ↓
Real-time Notification (useLoadRealtime)
```

**Integration Rules:**

- Distance threshold: 500m for location proximity
- Speed threshold: 5 km/h for "moving" status
- Update frequency: 30 seconds

---

## 3. GEOFENCE INTEGRATION

### 3.1 Geofence Management

**Entry Point:** `src/hooks/useGeofences.ts`

**Data Flow:**

```
Create Geofence
    ↓
Save to geofences table:
    - name, type (circular/polygon)
    - center_lat, center_lng, radius
    - polygon_coordinates (JSON)
    - associated_load_id
    ↓
useGeofences() Hook
    ↓
Fetch Active Geofences
    ↓
Display on Map (UnifiedMapView)
```

### 3.2 Geofence Tracking

**Entry Point:** `src/hooks/useGeofenceTracking.ts`

**Data Flow:**

```
useWialonContext() - Get Vehicle Locations
    ↓
useGeofenceTracking() - Monitor Active Loads
    ↓
Every 30 seconds:
    ├─ Fetch loads with status: assigned/in_transit/arrived
    ├─ Match load.assigned_vehicle_id with vehicleLocations
    └─ For each load:
        ↓
    Call check_geofence_entry() RPC:
        - p_vehicle_id
        - p_latitude
        - p_longitude
        ↓
    Database Function Checks:
        - Point-in-circle (circular geofences)
        - Point-in-polygon (polygon geofences)
        ↓
    If Entry Detected:
        - Insert geofence_events record
        - Update load status (if configured)
        - Trigger notification
        ↓
    If Exit Detected:
        - Update exit_time in geofence_events
        - Calculate dwell_time_minutes
```

### 3.3 Geofence Notifications

**Entry Point:** `src/hooks/useGeofenceNotifications.ts`

**Data Flow:**

```
Geofence Event Created (entry/exit)
    ↓
Real-time Subscription on geofence_events table
    ↓
useGeofenceNotifications() Hook
    ↓
On Event:
    ├─ Determine event type (entry/exit)
    ├─ Fetch geofence details
    ├─ Fetch load details
    └─ Create notification record
        ↓
    Display Toast:
        "🚛 Vehicle entered [Geofence Name]"
        "📍 Vehicle exited [Geofence Name]"
```

---

## 4. WEBHOOK INTEGRATIONS

### 4.1 Trip Import Webhook

**Entry Point:** `supabase/functions/import-trips-from-webhook/index.ts`

**Data Flow:**

```
External System (Web-Book, TMS)
    ↓
POST /functions/v1/import-trips-from-webhook
    ↓
Payload: { trips: [...] }
    ↓
For each trip:
    ├─ Map to loads table schema
    ├─ Check if load_number exists
    ├─ INSERT (new) or UPDATE (existing)
    └─ Set default status, currency
    ↓
Return Response:
    - success[], failed[]
    - created[], updated[]
    - total counts
```

**Payload Example:**

```json
{
  "trips": [
    {
      "loadRef": "LD-2025-001",
      "customer": "ABC Corp",
      "origin": "Johannesburg",
      "destination": "Cape Town",
      "cargoType": "General Freight",
      "weightKg": 5000,
      "shippedDate": "2025-11-18T08:00:00Z",
      "deliveredDate": "2025-11-20T16:00:00Z"
    }
  ]
}
```

### 4.2 Driver Behavior Webhook

**Entry Point:** `supabase/functions/import-driver-behavior-webhook/index.ts`

**Data Flow:**

```
Wialon Alerts / External Monitoring
    ↓
POST /functions/v1/import-driver-behavior-webhook
    ↓
Payload: { events: [...] }
    ↓
For each event:
    ├─ Parse event data (harsh braking, speeding, etc.)
    ├─ INSERT into driver_behavior_events
    ├─ Calculate severity score
    └─ Link to vehicle_id
    ↓
Real-time Update:
    ↓
useRealtimeDriverBehaviorEvents()
    ↓
Display in Driver Coaching Dashboard
```

**Event Types:**

- Harsh braking
- Harsh acceleration
- Speeding
- Harsh cornering
- Idling
- Night driving

### 4.3 Quick Task Webhook

**Entry Point:** `supabase/functions/quick-task/index.ts`

**Purpose:** General-purpose load import endpoint

**Similar to Trip Import but with additional flexibility for custom fields**

---

## 5. ROUTE OPTIMIZATION INTEGRATION

### 5.1 Route Planning

**Entry Point:** `src/hooks/useRouteOptimization.ts`

**Data Flow:**

```
User Selects:
    - origin, destination
    - waypoints[]
    - vehicle constraints
    ↓
optimizeRoute():
    ├─ Validate inputs
    ├─ Calculate distances (Haversine formula)
    ├─ Apply vehicle restrictions
    ├─ Order waypoints optimally
    └─ Calculate total distance/time
    ↓
Generate Route:
    ├─ Fetch from OpenRouteService API
    ├─ Or use saved_routes table
    └─ Return route geometry
    ↓
Display on Map
```

### 5.2 Saved Routes

**Entry Point:** `src/hooks/useSavedRoutes.ts`

**Data Flow:**

```
Create Route:
    ↓
Save to saved_routes table:
    - name, origin, destination
    - total_distance_km, estimated_duration_minutes
    - route_geometry (GeoJSON)
    - waypoints (JSON array)
    ↓
Reuse Route:
    ↓
Fetch from saved_routes
    ↓
Apply to new trip/load
```

---

## 6. MAINTENANCE INTEGRATION

### 6.1 Maintenance Scheduler

**Entry Point:** `supabase/functions/maintenance-scheduler/index.ts`

**Data Flow:**

```
Cron Job (Daily)
    ↓
Supabase Edge Function
    ↓
Query vehicles:
    - Check odometer vs last_service_km
    - Check days since last service
    ↓
If Maintenance Due:
    ├─ Create calendar_events record
    ├─ Set type: "maintenance"
    ├─ Set priority based on urgency
    └─ Call send-maintenance-notification
    ↓
Display in Calendar View
```

### 6.2 Maintenance Notifications

**Entry Point:** `supabase/functions/send-maintenance-notification/index.ts`

**Data Flow:**

```
Maintenance Due Event
    ↓
Generate Notification:
    - Vehicle identification
    - Service type required
    - Urgency level
    ↓
Store in notifications table
    ↓
Real-time push to users
```

### 6.3 Fault Tracking Integration

**Entry Point:** `src/hooks/useVehicleFaults.ts`

**Data Flow:**

```
Fault Detected:
    - From driver behavior events
    - From sensor data anomalies
    - From manual entry
    ↓
usePromoteToVehicleFault():
    ├─ Create vehicle_faults record
    ├─ Link to vehicle_id
    ├─ Set severity, category
    └─ Set status: "reported"
    ↓
Real-time Update:
    ↓
useRealtimeVehicleFaults()
    ↓
Display in Fault Tracking Dashboard
    ↓
Create Maintenance Job Card (if needed)
```

---

## 7. CALENDAR INTEGRATION

### 7.1 Event Management

**Entry Point:** `src/components/scheduling/CalendarView.tsx`

**Data Flow:**

```
User Creates Event:
    - trip, maintenance, inspection, etc.
    ↓
Save to calendar_events table:
    - title, description
    - start_time, end_time
    - event_type
    - assigned_vehicle_id
    - assigned_user_id
    ↓
useCalendarEvents() Hook
    ↓
Display in Calendar Grid
    ↓
Real-time Updates via Subscription
```

### 7.2 Trip Scheduling

**Integration with trips table:**

```
Trip Created
    ↓
Auto-create calendar_events:
    - event_type: "trip"
    - link to trip_id
    - start_time: scheduled_departure
    - end_time: estimated_arrival
    ↓
Display Trip on Calendar
    ↓
Sync with Load Assignment
```

---

## 8. TYRE MANAGEMENT INTEGRATION

### 8.1 Fleet Tyre Positions

**Entry Point:** `src/hooks/useFleetTyrePositions.ts`

**Data Flow:**

```
Vehicle Registration Selected
    ↓
Fetch from fleet_tyre_positions:
    - vehicle_registration
    - position (FL, FR, RL1, RR1, etc.)
    - tyre_id (FK to tyres table)
    ↓
Join with tyres table:
    - TIN (Tyre Identification Number)
    - brand, size, tread_depth
    - condition, mileage
    ↓
Display in FleetTyrePositionManager
    ↓
QR Code Scanning:
    ↓
Update tyre position
    ↓
Real-time sync via useRealtimeTyres()
```

### 8.2 Tyre Inspection Integration

**Data Flow:**

```
Inspection Process:
    ↓
Scan Vehicle QR Code
    ↓
Fetch Vehicle Tyre Layout (from constants/fleetTyreConfig.ts)
    ↓
For each position:
    ├─ Scan Tyre QR Code
    ├─ Measure tread depth
    ├─ Record condition
    └─ Update tyres table
    ↓
Generate Inspection Report
    ↓
Link to vehicle_id and timestamp
```

---

## 9. ANALYTICS INTEGRATION

### 9.1 Driver Performance Analytics

**Entry Point:** `src/hooks/useDriverCoaching.ts`

**Data Flow:**

```
Aggregate driver_behavior_events:
    ↓
Calculate Metrics:
    - Total events by type
    - Severity scores
    - Frequency over time
    - Trends (improving/declining)
    ↓
useDriverCoaching() Hook
    ↓
Display in Driver Coaching Dashboard:
    - Charts (performance over time)
    - Event breakdown
    - Coaching recommendations
```

### 9.2 Vehicle Analytics

**Entry Point:** `src/components/analytics/GPSAnalyticsDashboard.tsx`

**Data Flow:**

```
Fetch from Multiple Sources:
    ├─ vehicleLocations (Wialon)
    ├─ trips table
    ├─ loads table
    └─ driver_behavior_events
    ↓
Calculate Metrics:
    - Distance traveled
    - Fuel consumption
    - Utilization rates
    - Idle time
    - Speed averages
    ↓
Display in Dashboard:
    - Real-time vehicle status
    - Historical trends
    - Performance comparisons
```

### 9.3 Export Integration

**Entry Point:** `src/hooks/useAnalyticsExport.ts`

**Data Flow:**

```
User Requests Export:
    - Date range selection
    - Report type selection
    ↓
Aggregate Data:
    ├─ Driver performance
    ├─ Vehicle performance
    ├─ Route efficiency
    └─ Summary statistics
    ↓
Format as CSV:
    - Headers
    - Data rows
    - Calculations
    ↓
exportToCSV():
    - Generate CSV string
    - Create Blob
    - Trigger download
    ↓
User Downloads File
```

---

## 10. MAP INTEGRATION

### 10.1 Unified Map View

**Entry Point:** `src/components/UnifiedMapView.tsx`

**Integrations:**

```
Leaflet Map
    ├─ Vehicle Markers:
    │   - Data from useWialonContext().vehicleLocations
    │   - Real-time position updates
    │   - Status colors (online/offline/moving)
    │   - Popup with vehicle details
    │
    ├─ Geofence Overlays:
    │   - Data from useGeofences()
    │   - Circle/Polygon shapes
    │   - Entry/exit detection
    │
    ├─ Route Polylines:
    │   - Data from useSavedRoutes()
    │   - Trip routes
    │   - Optimized paths
    │
    ├─ Load Markers:
    │   - Pickup locations
    │   - Delivery locations
    │   - Current position for in-transit loads
    │
    └─ Sensor Widget (overlay):
        - WialonSensorWidget
        - Shows when vehicle selected
        - Real-time sensor data
```

### 10.2 Live Tracking

**Entry Point:** `src/components/loads/LiveDeliveryTracking.tsx`

**Real-time Integration:**

```
Load Selected
    ↓
useSingleLoadRealtime(loadId):
    - Subscribe to load updates
    ↓
useWialonLoadIntegration(loadId):
    - Link to vehicle GPS
    - Update position every 30s
    ↓
useGeofenceTracking():
    - Monitor geofence entry/exit
    ↓
Map Display:
    ├─ Vehicle current position
    ├─ Route to destination
    ├─ ETA calculation
    ├─ Geofence boundaries
    └─ Event markers (pickup/delivery points)
    ↓
Auto-refresh every 30 seconds
```

---

## 11. DATA FLOW SUMMARY

### 11.1 Load Lifecycle Integration

```
1. Load Creation:
   External Webhook → import-trips-from-webhook → loads table

2. Load Assignment:
   User Action → Update load.assigned_vehicle_id → Real-time notification

3. GPS Tracking Start:
   useWialonLoadIntegration → Subscribe to vehicle GPS → Update load position

4. Geofence Monitoring:
   useGeofenceTracking → check_geofence_entry → geofence_events table

5. Status Updates:
   Auto-status rules → Update load.status → Real-time notification

6. Delivery Completion:
   User marks delivered → Update actual_delivery_datetime → Toast notification

7. Analytics:
   Completed loads → Aggregate metrics → Dashboard display
```

### 11.2 Vehicle Data Integration

```
1. Vehicle Position:
   Wialon API → useWialon → vehicleLocations[] → UnifiedMapView

2. Sensor Data:
   Wialon API → useWialonSensors → WialonSensorWidget

3. Fault Detection:
   Driver behavior events → usePromoteToVehicleFault → vehicle_faults table

4. Maintenance Scheduling:
   Odometer check → maintenance-scheduler → calendar_events

5. Tyre Management:
   QR scan → fleet_tyre_positions → Real-time update
```

---

## 12. CRITICAL INTEGRATION POINTS

### 12.1 Authentication Flow

```
Login → Supabase Auth → JWT Token → RLS Policies → Data Access
```

### 12.2 Real-time Data Flow

```
Database Change → PostgreSQL → Supabase Realtime → WebSocket →
Frontend Hook → Query Invalidation → Component Re-render
```

### 12.3 GPS Data Flow

```
Wialon GPS → Wialon API → Proxy Function → useWialon Hook →
Vehicle Location State → Map Component
```

### 12.4 Geofence Integration

```
Vehicle Position + Geofence Boundaries → check_geofence_entry() →
Geofence Event → Notification → Status Update
```

---

## 13. ENVIRONMENT VARIABLES

### Required Configuration:

```bash
# Supabase
VITE_SUPABASE_URL=https://[project-id].supabase.co
VITE_SUPABASE_ANON_KEY=[anon-key]
SUPABASE_SERVICE_ROLE_KEY=[service-role-key]

# Wialon GPS
VITE_WIALON_TOKEN=[wialon-token]
VITE_WIALON_HOST=https://hst-api.wialon.eu
WIALON_TOKEN=[server-side-token]
WIALON_HOST=https://hst-api.wialon.eu

# S3 Storage (Supabase)
VITE_SUPABASE_S3_ACCESS_KEY_ID=[access-key]
VITE_SUPABASE_S3_SECRET_ACCESS_KEY=[secret-key]
VITE_SUPABASE_S3_ENDPOINT=[endpoint]
VITE_SUPABASE_S3_REGION=[region]
```

---

## 14. INTEGRATION MONITORING

### Health Check Points:

1. **Supabase Connection:**

   - Check: `supabase.auth.getSession()`
   - Indicator: AuthContext.loading = false

2. **Wialon Connection:**

   - Check: `wialonContext.isConnected`
   - Indicator: WialonProvider status

3. **Real-time Subscriptions:**

   - Check: WebSocket connection in Network tab
   - Indicator: LoadRealtimeIndicator badge

4. **GPS Updates:**

   - Check: Vehicle markers moving on map
   - Indicator: last_gps_update timestamp

5. **Geofence Tracking:**
   - Check: Console logs for geofence checks
   - Indicator: geofence_events table entries

---

## 15. TROUBLESHOOTING GUIDE

### Common Integration Issues:

**Issue:** Real-time updates not working

- Check: WebSocket connection established
- Verify: RLS policies allow user to read table
- Confirm: Realtime enabled for table in Supabase

**Issue:** Wialon data not loading

- Check: VITE_WIALON_TOKEN set correctly
- Verify: wialon-proxy function deployed
- Confirm: CORS configuration

**Issue:** Geofence detection not triggering

- Check: useGeofenceTracking() is running
- Verify: Vehicle has assigned_vehicle_id
- Confirm: Geofence has correct coordinates

**Issue:** Load position not updating

- Check: Load has assigned_vehicle_id
- Verify: Vehicle has wialon_unit_id mapping
- Confirm: useWialonLoadIntegration() subscribed

---

## 16. INTEGRATION DEPENDENCIES

### Frontend Dependencies:

- `@supabase/supabase-js` - Database client
- `@tanstack/react-query` - Data fetching/caching
- `leaflet` - Map display
- `react-leaflet` - React map components
- `lucide-react` - Icons
- `shadcn/ui` - UI components

### Backend Dependencies:

- Supabase PostgreSQL - Database
- Supabase Realtime - WebSocket subscriptions
- Supabase Edge Functions - Serverless functions
- Wialon API - GPS tracking service

---

## 17. INTEGRATION TESTING

### Test Scenarios:

1. **Load Creation via Webhook:**

   ```bash
   curl -X POST https://[project].supabase.co/functions/v1/import-trips-from-webhook \
     -H "Content-Type: application/json" \
     -d '{"trips": [{"loadRef": "TEST-001", ...}]}'
   ```

2. **Real-time Update:**

   ```sql
   UPDATE loads SET status = 'In Transit' WHERE id = '[load-id]';
   -- Should trigger toast notification
   ```

3. **Geofence Entry:**

   ```sql
   -- Manually trigger geofence check
   SELECT check_geofence_entry('[vehicle-id]', -26.2041, 28.0473);
   ```

4. **GPS Position Update:**
   ```javascript
   // Monitor console for:
   console.log('GPS position updated:', {...});
   ```

---

## SUMMARY

This system integrates multiple data sources and services:

1. **Supabase** - Core database, auth, real-time, edge functions
2. **Wialon GPS** - Vehicle tracking, sensors, telematics
3. **External Webhooks** - Trip imports, driver behavior
4. **Frontend Hooks** - State management, data fetching
5. **Real-time Subscriptions** - Live updates across components
6. **Geofencing** - Location-based automation
7. **Analytics** - Data aggregation and reporting

All integrations use typed interfaces, error handling, and follow consistent patterns for maintainability and scalability.
