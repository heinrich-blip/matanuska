# Quick Start: Using Geofences for Route Planning

## 🎯 What You Have Now

✅ **131 geofences** with coordinates in your database
✅ **GeofenceDisplay** component showing them on GPS Tracking map
✅ **GeofenceRoutePlanner** component for route planning
✅ **LocationSelector** component for picking locations

---

## 📍 Step 1: Import Geofences as Locations (One-Time Setup)

Run this in **Supabase SQL Editor**:

```sql
-- Copy from: supabase/migrations/20251106094000_import_geofences_to_locations.sql
-- This makes all 131 geofences available in LocationSelector dropdowns
```

**Result:** All geofences appear in load creation forms!

---

## 🚛 Step 2: Create a Load with Locations

### In the UI:

1. Go to **Load Management** page
2. Click **"Create New Load"**
3. Use **LocationSelector** dropdowns:
   - **Origin:** Select "Harare Depot" (from geofences)
   - **Destination:** Select "Johannesburg Warehouse" (from geofences)
4. Fill in cargo details
5. Click **"Create Load"**

### What Happens:

- Load gets `origin_lat`, `origin_lng`, `destination_lat`, `destination_lng`
- These coordinates come from your geofences
- System can now calculate routes!

---

## 🗺️ Step 3: Plan the Route

### Option A: Use GeofenceRoutePlanner Component

```tsx
import { GeofenceRoutePlanner } from "@/components/loads/GeofenceRoutePlanner";

// In your load details page:
<GeofenceRoutePlanner
  loadId={load.id}
  originLat={load.origin_lat}
  originLng={load.origin_lng}
  destinationLat={load.destination_lat}
  destinationLng={load.destination_lng}
  onGeofencesFound={(geofences) => {
    console.log(`Found ${geofences.length} geofences along route`);
  }}
/>;
```

**What You See:**

- **Statistics Cards:**

  - Distance: 1,100 km (direct: 950 km)
  - Time: 15.2h (driving: 13.2h)
  - Fuel: 330L (R7,260)
  - Total Cost: R7,710

- **Critical Waypoints Section:**

  - ✅ Harare Toll Gate (50 km from origin)
  - ✅ Beitbridge Border Post ZIM (~2h delay)
  - ✅ Beitbridge Border Post SA (~2h delay)
  - ✅ Polokwane Toll Gate

- **Optional Stops Section:**

  - ⬜ Musina Truck Stop (rest area)
  - ⬜ Louis Trichardt Depot

- **Summary:**
  - 4 waypoints selected
  - 1,100 km total
  - 15.2h travel time
  - R7,710 estimated cost
  - ⚠️ Route crosses international border

### Option B: Integrate into Existing RoutePlanner

Add geofence fetching to `src/components/loads/RoutePlanner.tsx`:

```tsx
// Add geofence query
const { data: nearbyGeofences = [] } = useQuery({
  queryKey: ["nearby-geofences", originLat, originLng, destLat, destLng],
  queryFn: async () => {
    const minLat = Math.min(originLat, destLat) - 0.5;
    const maxLat = Math.max(originLat, destLat) + 0.5;
    const minLng = Math.min(originLng, destLng) - 0.5;
    const maxLng = Math.max(originLng, destLng) + 0.5;

    const { data } = await supabase
      .from("geofences")
      .select("*")
      .not("center_lat", "is", null)
      .gte("center_lat", minLat)
      .lte("center_lat", maxLat)
      .gte("center_lng", minLng)
      .lte("center_lng", maxLng);

    return data || [];
  },
  enabled: !!originLat && !!destLat,
});

// Auto-add toll gates and borders as waypoints
useEffect(() => {
  const criticalWaypoints = nearbyGeofences.filter((gf) => {
    const desc = gf.description?.toLowerCase() || "";
    return desc.includes("toll") || desc.includes("border");
  });

  // Convert to waypoint format and add to route
  criticalWaypoints.forEach((gf) => {
    addWaypoint({
      address: gf.name,
      latitude: gf.center_lat,
      longitude: gf.center_lng,
      type: gf.description?.includes("border") ? "customs" : "weigh_station",
    });
  });
}, [nearbyGeofences]);
```

---

## 🎨 Step 4: View Geofences on Map

### Already Working!

Go to: **GPS Tracking → Geofences Tab**

```
http://localhost:8081/gps-tracking
```

**Features:**

- See all 131 geofences on map
- Click list item → map zooms to location
- Click map marker → see details
- Circles for hospitals/toll gates
- Polygons for warehouses/depots
- Real-time updates

---

## 💡 Practical Example: Harare → Johannesburg

### Scenario

**Load Details:**

- Customer: ABC Trading
- Origin: Harare Main Depot (-17.8216, 31.0492)
- Destination: Johannesburg Central Warehouse (-26.2041, 28.0473)
- Cargo: 15 tons agricultural produce
- Pickup: Tomorrow 06:00

### What the System Does

1. **Finds Geofences:**

   - Searches database for all geofences between Harare and Johannesburg
   - Finds 12 relevant locations

2. **Categorizes:**

   - **Toll Gates:** Harare Toll, Beitbridge Toll, Polokwane Toll
   - **Border Posts:** Beitbridge ZIM, Beitbridge SA
   - **Rest Stops:** Musina Truck Stop, Louis Trichardt
   - **Depots:** Harare Depot, Johannesburg Warehouse
   - **Hospitals:** Musina Hospital (emergency)

3. **Auto-Selects Critical Points:**

   - ✅ All toll gates (mandatory)
   - ✅ Both border posts (customs clearance)
   - ⬜ Rest stops (optional - driver decides)

4. **Calculates Costs:**

   - **Direct Distance:** 950 km
   - **With Waypoints:** 1,100 km (+150 km detour)
   - **Driving Time:** 13.2 hours @ 80 km/h avg
   - **Border Delays:** 4 hours (2h each border)
   - **Toll Delays:** 30 mins (3 tolls × 10 mins)
   - **Total Time:** 17.7 hours
   - **Fuel:** 330L @ R22/L = R7,260
   - **Tolls:** R450 (3 tolls × R150)
   - **Total Cost:** R7,710

5. **Provides Estimate:**
   - Departure: Tomorrow 06:00
   - Border crossing: 13:00 (allow 2h)
   - SA entry: 15:00
   - Rest stop: 18:00 (30 min break)
   - Arrival: 23:30 (estimated)

---

## 🔄 Step 5: Track Delivery with Geofences

### Live Tracking Setup

When vehicle is assigned and starts journey:

```tsx
// In LiveDeliveryTracking component
const checkGeofenceEntry = async (vehicleLat: number, vehicleLng: number) => {
  // Find geofences within 1km
  const { data: nearbyGeofences } = await supabase
    .from("geofences")
    .select("*")
    .not("center_lat", "is", null);

  for (const gf of nearbyGeofences || []) {
    const distance = calculateDistance(
      vehicleLat,
      vehicleLng,
      gf.center_lat,
      gf.center_lng
    );

    if (distance < 1) {
      // Vehicle entered geofence!
      await supabase.from("delivery_events").insert({
        load_id: loadId,
        event_type: "geofence_entry",
        event_timestamp: new Date().toISOString(),
        latitude: vehicleLat,
        longitude: vehicleLng,
        notes: `Entered ${gf.name}`,
      });

      // Send notification
      toast({
        title: "Geofence Alert",
        description: `Vehicle entered ${gf.name}`,
      });
    }
  }
};
```

### Events Generated:

- 06:00 - Departed Harare Depot
- 09:00 - Passed Harare Toll Gate
- 12:00 - Arrived Beitbridge Border (ZIM)
- 14:00 - Departed Beitbridge Border (SA)
- 18:00 - Rest stop at Musina Truck Stop
- 21:00 - Passed Polokwane Toll Gate
- 23:30 - Arrived Johannesburg Warehouse
- 00:15 - Delivery completed

---

## 📊 Step 6: Analyze & Optimize

### View Route Performance

```sql
-- Compare estimated vs actual
SELECT
  l.load_number,
  l.origin,
  l.destination,
  l.quoted_price as estimated_cost,
  SUM(dt.distance_km) as actual_distance,
  COUNT(DISTINCT de.id) as events_count,
  MAX(de.event_timestamp) - MIN(de.event_timestamp) as actual_duration
FROM loads l
LEFT JOIN delivery_tracking dt ON l.id = dt.load_id
LEFT JOIN delivery_events de ON l.id = de.load_id
WHERE l.status = 'completed'
GROUP BY l.id;
```

### Improve Estimates

Based on actual data:

- Adjust toll delay times
- Update border crossing durations
- Refine fuel consumption rates
- Better rest stop predictions

---

## 🎉 Summary

**You can now:**

1. ✅ **View 131 geofences** on GPS Tracking map
2. ✅ **Select geofences** as pickup/delivery locations
3. ✅ **Plan routes** with automatic waypoint suggestions
4. ✅ **Calculate costs** including tolls and fuel
5. ✅ **Estimate times** with border/toll delays
6. ✅ **Track vehicles** through geofences (with Wialon)
7. ✅ **Generate events** when entering/exiting zones

**Next Level Features (To Implement):**

- 🔔 Real-time geofence alerts (SMS/email)
- 📈 Route optimization (minimize tolls vs time)
- 🗺️ Multiple route options comparison
- 💰 Dynamic pricing based on actual costs
- 📍 Geofence-based ETA updates
- 🚨 Geofence breach alerts (off-route detection)

**Let me know which feature you want to implement next!**
