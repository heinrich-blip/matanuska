# Route Planning & Load Management System

## Overview

This system integrates **GPS tracking** (Wialon), **load management**, and **intelligent route planning** to optimize fleet operations. It enables:

- 📦 **Load Management**: Create, track, and assign cargo to vehicles
- 🗺️ **Route Planning**: Visual route planning with multiple waypoints
- 🚚 **Smart Assignment**: AI-powered vehicle assignment based on GPS location, capacity, and deadlines
- 📍 **Real-time Tracking**: Monitor vehicle positions and update ETAs dynamically
- 💰 **Cost Optimization**: Calculate fuel-efficient routes and estimate costs

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     LOAD MANAGEMENT                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Create Loads │→ │ Assign       │→ │ Track        │     │
│  │              │  │ to Vehicles  │  │ Delivery     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  INTELLIGENT ASSIGNMENT                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Get Vehicle  │→ │ Calculate    │→ │ Rank by      │     │
│  │ GPS Locations│  │ Distances    │  │ Score        │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│         ↑                                      │            │
│         │         WIALON GPS API               ↓            │
│         └──────────────────────────────────────────────────┐│
│                                                             ││
│  Score = f(distance, capacity, delivery_deadline, priority)││
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    ROUTE OPTIMIZATION                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Add          │→ │ Optimize     │→ │ Generate     │     │
│  │ Waypoints    │  │ Sequence     │  │ Route        │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│         │                 │                   │            │
│         └─────────────────┴───────────────────┘            │
│                  LEAFLET ROUTING MACHINE                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   TRIP EXECUTION                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Start Trip   │→ │ Track        │→ │ Complete &   │     │
│  │              │  │ Progress     │  │ Confirm      │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### **1. loads** - Cargo Management

```sql
Key Columns:
- load_number: Unique identifier
- origin/destination: Location names + GPS coordinates
- pickup_datetime/delivery_datetime: Scheduling
- weight_kg, volume_m3: Capacity requirements
- assigned_trip_id, assigned_vehicle_id: Assignment
- status: pending → assigned → in_transit → delivered
- priority: low | medium | high | urgent
```

### **2. route_waypoints** - Route Planning

```sql
Key Columns:
- trip_id: Link to trip
- sequence: Order of waypoint (1, 2, 3...)
- waypoint_type: pickup | delivery | rest_stop | customs
- lat, lng: GPS coordinates
- planned_arrival, actual_arrival: Timing
- completed: Waypoint completion status
```

### **3. route_optimizations** - Calculated Routes

```sql
Key Columns:
- waypoints: JSON array of stops
- optimized_sequence: Best order [2, 1, 3, 5, 4]
- total_distance_km: Total route distance
- estimated_duration_mins: Travel time
- estimated_fuel_cost: Cost prediction
```

### **4. vehicle_availability** - Realtime Availability

```sql
Key Columns:
- vehicle_id: Reference to vehicle
- current_lat, current_lng: GPS position (from Wialon)
- available_capacity_kg: Remaining capacity
- is_available: Availability flag
```

---

## Key Functions

### **1. calculate_distance_km(lat1, lng1, lat2, lng2)**

```sql
-- Haversine formula for great-circle distance
SELECT calculate_distance_km(
  -26.2041, 28.0473,  -- Johannesburg
  -33.9249, 18.4241   -- Cape Town
); -- Returns ~1270 km
```

### **2. find_nearest_vehicles(load_id, max_distance_km, limit)**

```sql
-- Find vehicles within 500km that can carry the load
SELECT * FROM find_nearest_vehicles(
  'load-uuid-here'::uuid,
  500,  -- max distance
  10    -- limit results
);

Returns:
- vehicle_id, registration_number
- distance_km (from load origin)
- available_capacity_kg
- current_location
```

---

## Implementation Steps

### **Phase 1: Database Setup** ✅

```bash
# Apply migration
psql -h your-db-host -U postgres -d your-database -f supabase/migrations/20251104000000_route_planning_loads.sql

# Or via Supabase Dashboard
# → SQL Editor → Paste migration → Run
```

### **Phase 2: TypeScript Types**

```typescript
// Regenerate types after migration
npx supabase gen types typescript --project-id wxvhkljrbcpcgpgdqhsp > src/integrations/supabase/types.ts
```

### **Phase 3: Components** (To Be Created)

#### **A. LoadManagement.tsx** - Main load dashboard

```typescript
Features:
- List all loads (pending, assigned, in-transit, delivered)
- Create new load with origin/destination autocomplete
- Assign loads to trips/vehicles
- Search and filter by status, priority, customer
- Real-time status updates
```

#### **B. LoadAssignmentDialog.tsx** - Smart assignment UI

```typescript
Features:
- Show nearest vehicles (from Wialon GPS)
- Display distance, ETA, available capacity
- Scoring algorithm:
  score = (1000 - distance_km) + capacity_match + priority_weight
- One-click assignment with confirmation
```

#### **C. RoutePlanner.tsx** - Visual route planning

```typescript
Features:
- Interactive map with Leaflet
- Drag-and-drop waypoint markers
- Automatic route calculation (Leaflet Routing Machine)
- Display distance, duration, fuel estimate
- Save optimized route to route_optimizations
```

#### **D. TripRouteView.tsx** - Active trip monitoring

```typescript
Features:
- Show trip route on map
- Display waypoints with completion status
- Real-time vehicle GPS position (from Wialon)
- Update actual arrival times
- Mark waypoints as completed
```

---

## Integration with Existing System

### **1. Wialon GPS Integration**

```typescript
// In LoadAssignmentDialog.tsx
import { useWialonContext } from "@/integrations/wialon";

const { vehicleLocations } = useWialonContext();

// Calculate distances to each vehicle
const vehiclesWithDistance = vehicleLocations.map((vehicle) => ({
  ...vehicle,
  distance_km: calculateDistance(
    load.origin_lat,
    load.origin_lng,
    vehicle.latitude,
    vehicle.longitude
  ),
}));

// Sort by distance
const nearestVehicles = vehiclesWithDistance
  .sort((a, b) => a.distance_km - b.distance_km)
  .slice(0, 10);
```

### **2. Trip Creation Integration**

```typescript
// In AddTripDialog.tsx - add load selection
const [selectedLoads, setSelectedLoads] = useState<string[]>([]);

// After trip created, assign loads
await Promise.all(
  selectedLoads.map((loadId) =>
    supabase
      .from("loads")
      .update({
        assigned_trip_id: newTripId,
        assigned_vehicle_id: vehicleId,
        status: "assigned",
      })
      .eq("id", loadId)
  )
);

// Create waypoints from loads
await Promise.all(
  selectedLoads.map((loadId, index) =>
    supabase.from("route_waypoints").insert({
      trip_id: newTripId,
      load_id: loadId,
      sequence: index * 2 + 1, // Pickup waypoint
      waypoint_type: "pickup",
      // ... coordinates from load
    })
  )
);
```

### **3. Missed Loads Integration**

```typescript
// Convert missed_load to actual load opportunity
const handleRecoverMissedLoad = async (missedLoad: MissedLoad) => {
  const newLoad = await supabase
    .from("loads")
    .insert({
      load_number: `LD-${Date.now()}`,
      customer_name: missedLoad.customer_name,
      origin: missedLoad.route.split(" - ")[0],
      destination: missedLoad.route.split(" - ")[1],
      pickup_datetime: missedLoad.requestedPickupDate,
      delivery_datetime: missedLoad.requestedDeliveryDate,
      quoted_price: missedLoad.estimatedRevenue,
      priority: "high", // Recovered opportunities are high priority
      status: "pending",
    })
    .select()
    .single();

  // Auto-suggest nearest vehicles
  const nearestVehicles = await supabase.rpc("find_nearest_vehicles", {
    p_load_id: newLoad.data.id,
    p_max_distance_km: 500,
  });

  // Show assignment dialog
  setAssignmentDialog({ load: newLoad.data, vehicles: nearestVehicles.data });
};
```

---

## Route Optimization Algorithm

### **Nearest Neighbor Algorithm** (Simple, Fast)

```typescript
function optimizeRoute(waypoints: Waypoint[]): number[] {
  const unvisited = new Set(waypoints.map((_, i) => i));
  const route: number[] = [0]; // Start at first waypoint
  unvisited.delete(0);

  while (unvisited.size > 0) {
    const current = route[route.length - 1];
    let nearest = -1;
    let minDistance = Infinity;

    for (const index of unvisited) {
      const distance = calculateDistance(
        waypoints[current].lat,
        waypoints[current].lng,
        waypoints[index].lat,
        waypoints[index].lng
      );

      if (distance < minDistance) {
        minDistance = distance;
        nearest = index;
      }
    }

    route.push(nearest);
    unvisited.delete(nearest);
  }

  return route;
}
```

### **Scoring Algorithm for Vehicle Assignment**

```typescript
function calculateAssignmentScore(
  vehicle: VehicleLocation,
  load: Load
): number {
  // Distance factor (closer is better)
  const distance = calculateDistance(
    load.origin_lat,
    load.origin_lng,
    vehicle.latitude,
    vehicle.longitude
  );
  const distanceScore = Math.max(0, 1000 - distance);

  // Capacity factor (exact match is best)
  const capacityMatch =
    vehicle.available_capacity_kg >= load.weight_kg ? 100 : 0;
  const capacityEfficiency =
    (load.weight_kg / vehicle.available_capacity_kg) * 50;

  // Priority factor
  const priorityWeight = {
    low: 10,
    medium: 20,
    high: 40,
    urgent: 80,
  }[load.priority];

  // Deadline urgency
  const hoursUntilPickup =
    (new Date(load.pickup_datetime).getTime() - Date.now()) / (1000 * 60 * 60);
  const urgencyScore =
    hoursUntilPickup < 24 ? 100 : hoursUntilPickup < 48 ? 50 : 20;

  return (
    distanceScore +
    capacityMatch +
    capacityEfficiency +
    priorityWeight +
    urgencyScore
  );
}
```

---

## Usage Examples

### **Example 1: Create a Load**

```typescript
const newLoad = await supabase
  .from("loads")
  .insert({
    load_number: "LD-2025-001",
    customer_name: "ABC Logistics",
    origin: "Johannesburg",
    origin_lat: -26.2041,
    origin_lng: 28.0473,
    destination: "Cape Town",
    destination_lat: -33.9249,
    destination_lng: 18.4241,
    pickup_datetime: "2025-11-10 08:00:00",
    delivery_datetime: "2025-11-12 17:00:00",
    cargo_type: "General Freight",
    weight_kg: 15000,
    volume_m3: 45,
    priority: "high",
    quoted_price: 35000,
    currency: "ZAR",
  })
  .select()
  .single();
```

### **Example 2: Find Nearest Vehicles**

```typescript
const nearestVehicles = await supabase.rpc("find_nearest_vehicles", {
  p_load_id: "load-uuid",
  p_max_distance_km: 300,
  p_limit: 5,
});

console.log(nearestVehicles.data);
// [
//   { vehicle_id: '...', registration_number: '24H AFQ1325', distance_km: 45.7, ... },
//   { vehicle_id: '...', registration_number: '31H AGZ1963', distance_km: 87.2, ... },
//   ...
// ]
```

### **Example 3: Create Trip with Route**

```typescript
// 1. Create trip
const trip = await supabase
  .from("trips")
  .insert({
    trip_number: "T-2025-001",
    vehicle_id: vehicleId,
    driver_name: "John Doe",
    status: "active",
  })
  .select()
  .single();

// 2. Assign load
await supabase
  .from("loads")
  .update({
    assigned_trip_id: trip.data.id,
    assigned_vehicle_id: vehicleId,
    status: "assigned",
  })
  .eq("id", loadId);

// 3. Create waypoints
await supabase.from("route_waypoints").insert([
  {
    trip_id: trip.data.id,
    load_id: loadId,
    sequence: 1,
    waypoint_type: "pickup",
    location_name: "Johannesburg Warehouse",
    lat: -26.2041,
    lng: 28.0473,
    planned_arrival: "2025-11-10 08:00:00",
  },
  {
    trip_id: trip.data.id,
    load_id: loadId,
    sequence: 2,
    waypoint_type: "delivery",
    location_name: "Cape Town Distribution Center",
    lat: -33.9249,
    lng: 18.4241,
    planned_arrival: "2025-11-12 17:00:00",
  },
]);
```

### **Example 4: Update Vehicle GPS Position**

```typescript
// This happens automatically via Wialon integration,
// but you can also manually update:

await supabase.from("vehicle_availability").upsert({
  vehicle_id: vehicleId,
  current_lat: vehicle.latitude,
  current_lng: vehicle.longitude,
  current_location: vehicle.location,
  available_capacity_kg: 20000,
  is_available: true,
  available_from: new Date().toISOString(),
  available_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
});
```

---

## Next Steps

1. **✅ Apply Database Migration**

   - Run the SQL migration file in Supabase dashboard
   - Regenerate TypeScript types

2. **🔨 Create React Components**

   - LoadManagement.tsx (main dashboard)
   - LoadAssignmentDialog.tsx (smart assignment)
   - RoutePlanner.tsx (visual route planning)
   - TripRouteView.tsx (active trip monitoring)

3. **🔗 Integration Hooks**

   - Create `useLoads()` hook for load management
   - Create `useRouteOptimization()` hook for route calculations
   - Integrate with existing `useWialon()` for GPS data

4. **🧪 Testing**

   - Test load creation flow
   - Test vehicle assignment algorithm
   - Test route optimization
   - Test real-time GPS updates

5. **📊 Analytics Dashboard**
   - Load fulfillment rate
   - Average assignment time
   - Route optimization savings
   - Vehicle utilization metrics

---

## Benefits

✅ **Intelligent Assignment** - Auto-suggest best vehicles based on GPS location
✅ **Cost Optimization** - Calculate fuel-efficient routes
✅ **Real-time Visibility** - Track all loads and vehicles on map
✅ **Faster Response** - Quick load-to-vehicle matching
✅ **Better Planning** - Visual route planning with multiple stops
✅ **Audit Trail** - Complete history of all assignments and changes
✅ **Scalability** - Handle hundreds of loads and vehicles
✅ **Integration** - Works seamlessly with existing trip management

---

## Questions & Support

Need help implementing? Review these files:

- `WIALON_GPS_TRACKING_GUIDE.md` - GPS integration
- `MAP_INTEGRATION_GUIDE.md` - Leaflet setup
- `PRE_CHANGE_CHECKLIST.md` - Before making changes
