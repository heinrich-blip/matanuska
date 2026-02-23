# Route Planning & Load Management - COMPLETED ✅

## ✅ What's Been Implemented

### 1. **Database Schema** (Migration Applied)

- ✅ `loads` table - Complete cargo management
- ✅ `route_waypoints` table - Multi-stop routing
- ✅ `route_optimizations` table - Calculated routes storage
- ✅ `vehicle_availability` table - Real-time GPS positions
- ✅ `load_assignment_history` table - Audit trail
- ✅ Helper functions: `calculate_distance_km()`, `find_nearest_vehicles()`
- ✅ Auto-triggers for assignment history
- ✅ RLS policies for all tables

### 2. **React Hooks** (Created & Ready)

- ✅ `/src/hooks/useLoads.ts` - Complete load management

  - Create, update, delete loads
  - Assign loads to vehicles
  - Find nearest vehicles
  - Load statistics

- ✅ `/src/hooks/useRouteOptimization.ts` - Route planning
  - Nearest neighbor optimization algorithm
  - Distance calculations (Haversine formula)
  - Fuel cost estimates
  - Save optimized routes

### 3. **TypeScript Types** (Regenerated)

- ✅ All new database types available
- ✅ Type-safe queries and mutations

---

## 🚀 Ready to Use Immediately

### **useLoads Hook**

```typescript
import { useLoads } from "@/hooks/useLoads";

function MyComponent() {
  const {
    loads, // All loads
    isLoading, // Loading state
    createLoad, // Create new load
    assignLoad, // Assign to vehicle
    findNearestVehicles, // Find nearby vehicles
  } = useLoads();

  // Create a load
  const handleCreate = () => {
    createLoad({
      load_number: "LD-001",
      customer_name: "ABC Corp",
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
      priority: "high",
      status: "pending",
    });
  };

  // Find nearest vehicles
  const handleFindVehicles = async (loadId: string) => {
    const vehicles = await findNearestVehicles(loadId, 500); // Within 500km
    console.log(vehicles);
  };
}
```

### **useRouteOptimization Hook**

```typescript
import { useRouteOptimization } from "@/hooks/useRouteOptimization";

function RoutePlanner() {
  const { optimizeRoute, saveOptimization } = useRouteOptimization();

  const handleOptimize = async () => {
    const waypoints = [
      { lat: -26.2041, lng: 28.0473, name: "Johannesburg" },
      { lat: -29.8587, lng: 31.0218, name: "Durban" },
      { lat: -33.9249, lng: 18.4241, name: "Cape Town" },
    ];

    const result = await optimizeRoute(waypoints, {
      avgSpeed: 80, // km/h
      fuelConsumption: 30, // L/100km
      fuelPrice: 22, // R/litre
      currency: "ZAR",
    });

    console.log(`Distance: ${result.total_distance_km}km`);
    console.log(`Duration: ${result.estimated_duration_mins} mins`);
    console.log(`Fuel Cost: R${result.estimated_fuel_cost}`);
    console.log(`Optimized sequence:`, result.optimized_sequence);

    // Save to database
    await saveOptimization(tripId, result, "current-user");
  };
}
```

---

## 📦 Next: Create UI Components

### **Priority 1: Load Management Dashboard**

Create `/src/pages/LoadManagement.tsx`:

```typescript
import { useLoads, useLoadStats } from "@/hooks/useLoads";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function LoadManagement() {
  const { loads, isLoading } = useLoads();
  const { data: stats } = useLoadStats();

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Load Management</h1>
          <Button onClick={() => setShowCreateDialog(true)}>Create Load</Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="text-sm text-gray-500">Total Loads</div>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-500">Pending</div>
            <div className="text-2xl font-bold text-yellow-600">
              {stats?.pending || 0}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-500">In Transit</div>
            <div className="text-2xl font-bold text-blue-600">
              {stats?.in_transit || 0}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-500">Delivered</div>
            <div className="text-2xl font-bold text-green-600">
              {stats?.delivered || 0}
            </div>
          </Card>
        </div>

        {/* Loads Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Load #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Origin → Destination</TableHead>
                <TableHead>Pickup Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loads.map((load) => (
                <TableRow key={load.id}>
                  <TableCell>{load.load_number}</TableCell>
                  <TableCell>{load.customer_name}</TableCell>
                  <TableCell>
                    {load.origin} → {load.destination}
                  </TableCell>
                  <TableCell>
                    {new Date(load.pickup_datetime).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(load.status)}>
                      {load.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getPriorityVariant(load.priority)}>
                      {load.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button size="sm" onClick={() => handleAssign(load)}>
                      Assign
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </Layout>
  );
}
```

### **Priority 2: Smart Load Assignment Dialog**

Create `/src/components/LoadAssignmentDialog.tsx`:

```typescript
import { useWialonContext } from "@/integrations/wialon";
import { useRouteOptimization } from "@/hooks/useRouteOptimization";
import { useLoads } from "@/hooks/useLoads";

export function LoadAssignmentDialog({ load, open, onClose }) {
  const { vehicleLocations } = useWialonContext();
  const { calculateDistance } = useRouteOptimization();
  const { assignLoad } = useLoads();

  // Calculate distances to each vehicle
  const vehiclesWithDistance = vehicleLocations
    .map((vehicle) => ({
      ...vehicle,
      distance: calculateDistance(
        load.origin_lat,
        load.origin_lng,
        vehicle.latitude,
        vehicle.longitude
      ),
      // Score: closer = better, capacity match, etc.
      score: calculateScore(vehicle, load),
    }))
    .sort((a, b) => b.score - a.score);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Assign Load: {load.load_number}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {vehiclesWithDistance.map((vehicle) => (
            <Card key={vehicle.vehicleId} className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-bold">{vehicle.registrationNumber}</div>
                  <div className="text-sm text-gray-500">
                    {vehicle.distance.toFixed(1)}km away
                    {vehicle.isMoving ? " • Moving" : " • Stopped"}
                  </div>
                  <div className="text-sm">
                    Speed: {vehicle.speed} km/h | Location: {vehicle.location}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600">
                    Score: {vehicle.score}
                  </div>
                  <Button onClick={() => handleAssign(vehicle)}>
                    Assign Vehicle
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function calculateScore(vehicle, load) {
  const distanceScore = Math.max(0, 1000 - vehicle.distance);
  const priorityWeight = { low: 10, medium: 20, high: 40, urgent: 80 }[
    load.priority
  ];
  return distanceScore + priorityWeight;
}
```

### **Priority 3: Route Planner with Map**

Create `/src/components/RoutePlanner.tsx`:

```typescript
import { MapContainer, TileLayer, Marker, Polyline } from "react-leaflet";
import { useRouteOptimization } from "@/hooks/useRouteOptimization";

export function RoutePlanner({ tripId }) {
  const [waypoints, setWaypoints] = useState([]);
  const { optimizeRoute, isOptimizing } = useRouteOptimization();
  const [optimizedRoute, setOptimizedRoute] = useState(null);

  const handleOptimize = async () => {
    const result = await optimizeRoute(waypoints);
    setOptimizedRoute(result);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <h2>Route Planning</h2>
        <Button onClick={handleOptimize} disabled={isOptimizing}>
          {isOptimizing ? "Optimizing..." : "Optimize Route"}
        </Button>
      </div>

      <MapContainer
        center={[-28.4793, 24.6727]} // South Africa center
        zoom={6}
        style={{ height: "600px" }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {/* Waypoint markers */}
        {waypoints.map((wp, idx) => (
          <Marker
            key={idx}
            position={[wp.lat, wp.lng]}
            draggable
            eventHandlers={{
              dragend: (e) => handleWaypointMove(idx, e.target.getLatLng()),
            }}
          />
        ))}

        {/* Optimized route line */}
        {optimizedRoute && (
          <Polyline
            positions={optimizedRoute.optimized_sequence.map((idx) => [
              waypoints[idx].lat,
              waypoints[idx].lng,
            ])}
            color="blue"
            weight={3}
          />
        )}
      </MapContainer>

      {optimizedRoute && (
        <Card className="p-4">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-gray-500">Distance</div>
              <div className="text-xl font-bold">
                {optimizedRoute.total_distance_km}km
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Duration</div>
              <div className="text-xl font-bold">
                {optimizedRoute.estimated_duration_mins} mins
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Fuel</div>
              <div className="text-xl font-bold">
                {optimizedRoute.estimated_fuel_litres}L
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Cost</div>
              <div className="text-xl font-bold">
                R{optimizedRoute.estimated_fuel_cost}
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
```

---

## 🔗 Integration with Existing System

### **1. Add to Routes**

In `/src/App.tsx`:

```typescript
import LoadManagement from "@/pages/LoadManagement";

// Add route:
<Route path="/loads" element={<LoadManagement />} />;
```

### **2. Add to Navigation**

In `/src/components/Layout.tsx`:

```typescript
{
  title: "Load Management",
  icon: Package,
  href: "/loads"
}
```

### **3. Link from Trip Creation**

In `/src/components/trips/AddTripDialog.tsx`:

```typescript
// Add load selection field
const { loads } = useLoads({ status: "pending" });

// Show available loads
<Select>
  {loads.map((load) => (
    <SelectItem value={load.id}>
      {load.load_number} - {load.origin} → {load.destination}
    </SelectItem>
  ))}
</Select>;

// After trip created, assign load
await assignLoad({
  loadId: selectedLoadId,
  tripId: newTrip.id,
  vehicleId: vehicleId,
  assignedBy: currentUser,
});
```

---

## 🎯 Immediate Next Steps

1. **Create Load Management Page**

   - Use the example code above
   - Add to routing
   - Test CRUD operations

2. **Create Assignment Dialog**

   - Integrate with Wialon GPS
   - Show nearest vehicles
   - Implement scoring algorithm

3. **Test Integration**

   - Create test loads
   - Assign to vehicles
   - Verify waypoints creation

4. **Add to Menu**
   - Update Layout navigation
   - Add icons and labels

---

## 📊 Database Functions Available

### **1. Find Nearest Vehicles**

```sql
SELECT * FROM find_nearest_vehicles(
  'load-uuid-here'::uuid,
  500,  -- max distance in km
  10    -- limit results
);
```

Returns: vehicle_id, registration_number, distance_km, available_capacity_kg, current_location

### **2. Calculate Distance**

```sql
SELECT calculate_distance_km(
  -26.2041, 28.0473,  -- Johannesburg
  -33.9249, 18.4241   -- Cape Town
); -- Returns ~1270
```

---

## ✅ Testing Checklist

- [ ] Create a load via UI
- [ ] Find nearest vehicles for load
- [ ] Assign load to vehicle
- [ ] Create route with waypoints
- [ ] Optimize route sequence
- [ ] View load on map
- [ ] Update load status
- [ ] View assignment history
- [ ] Test with Wialon GPS data
- [ ] Verify real-time updates

---

## 🎉 What You Can Do Now

1. **View all tables in Supabase Dashboard**

   - loads, route_waypoints, route_optimizations, etc.

2. **Test SQL functions directly**

   - Try find_nearest_vehicles()
   - Test calculate_distance_km()

3. **Create loads via SQL**

   - Insert test data
   - Verify triggers work

4. **Build UI components**
   - All hooks are ready
   - Types are generated
   - Examples provided above

Ready to start building the UI! 🚀
