# Integration Example: Adding Geofence Route Planner to Load Management

## Quick Integration Guide

### Step 1: Import the Component

In `src/pages/LoadManagement.tsx`, add:

```tsx
import GeofenceRoutePlanner from "@/components/loads/GeofenceRoutePlanner";
```

### Step 2: Add to Dialog Content

Find the "Plan Route" dialog section (around line 440) and replace with:

```tsx
{
  /* Route Planning Dialog */
}
<Dialog open={!!planningLoadId} onOpenChange={() => setPlanningLoadId(null)}>
  <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle>Plan Route</DialogTitle>
      <DialogDescription>
        Optimize route with geofences, toll gates, and border posts
      </DialogDescription>
    </DialogHeader>

    {planningLoadId &&
      (() => {
        const load = loads.find((l) => l.id === planningLoadId);
        if (!load) return null;

        // Check if load has coordinates
        const hasCoordinates =
          load.origin_lat &&
          load.origin_lng &&
          load.destination_lat &&
          load.destination_lng;

        if (!hasCoordinates) {
          return (
            <div className="p-6 text-center">
              <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                Missing Location Coordinates
              </h3>
              <p className="text-gray-600 mb-4">
                This load doesn't have GPS coordinates for origin or
                destination. Please edit the load and select locations from the
                dropdown.
              </p>
              <Button
                onClick={() => {
                  setPlanningLoadId(null);
                  // Open edit dialog for this load
                }}
              >
                Edit Load
              </Button>
            </div>
          );
        }

        return (
          <div className="space-y-6">
            {/* Load Summary */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-blue-600 font-medium">FROM</p>
                    <p className="font-semibold">{load.origin}</p>
                    <p className="text-sm text-gray-600">
                      {load.origin_lat?.toFixed(4)},{" "}
                      {load.origin_lng?.toFixed(4)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-600 font-medium">TO</p>
                    <p className="font-semibold">{load.destination}</p>
                    <p className="text-sm text-gray-600">
                      {load.destination_lat?.toFixed(4)},{" "}
                      {load.destination_lng?.toFixed(4)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Geofence Route Planner */}
            <GeofenceRoutePlanner
              loadId={load.id}
              originLat={load.origin_lat}
              originLng={load.origin_lng}
              destinationLat={load.destination_lat}
              destinationLng={load.destination_lng}
              onGeofencesFound={(geofences) => {
                console.log(`Found ${geofences.length} geofences for route`);
              }}
            />

            {/* Traditional Route Planner (Optional) */}
            <details className="border rounded-lg p-4">
              <summary className="font-semibold cursor-pointer">
                Advanced Route Planning (Manual Waypoints)
              </summary>
              <div className="mt-4">
                <RoutePlanner tripId={load.id} />
              </div>
            </details>
          </div>
        );
      })()}
  </DialogContent>
</Dialog>;
```

### Step 3: Test the Integration

1. **Start your dev server:**

   ```bash
   npm run dev
   ```

2. **Import geofences to locations** (one-time):

   - Open Supabase SQL Editor
   - Run: `supabase/migrations/20251106094000_import_geofences_to_locations.sql`

3. **Create a test load:**

   - Go to Load Management
   - Click "Create New Load"
   - **Origin:** Select "Harare Main Depot" from dropdown
   - **Destination:** Select "Johannesburg Warehouse" from dropdown
   - Fill in other details
   - Click "Create Load"

4. **Plan the route:**
   - Find your new load in the list
   - Click **"Plan Route"** button
   - See the geofence-based route planner!

---

## What You'll See

### Statistics Cards (Top Row):

```
┌─────────────┬─────────────┬─────────────┬─────────────┐
│ 📍 Distance │ ⏱️ Time     │ ⛽ Fuel     │ 💰 Total   │
│ 1,100 km    │ 15.2h       │ 330L        │ R 7,710     │
│ Direct:     │ Driving:    │ R 7,260     │ Tolls:      │
│ 950 km      │ 13.2h       │             │ R 450       │
└─────────────┴─────────────┴─────────────┴─────────────┘
```

### Geofences List:

**Critical Waypoints** (auto-selected):

- ✅ 💰 Harare Toll Gate (50 km from origin • 5 km off route)
- ✅ 🛂 Beitbridge Border Post ZIM (~2h delay)
- ✅ 🛂 Beitbridge Border Post SA (~2h delay)
- ✅ 💰 Polokwane Toll Gate (850 km from origin)

**Optional Stops**:

- ⬜ ⛽ Musina Truck Stop (rest area)
- ⬜ 🏢 Louis Trichardt Depot

**Summary**:

> 4 waypoints selected • 1,100 km • 15.2h travel time • R 7,710 estimated cost
> ⚠️ Route crosses international border - ensure customs documents are ready

---

## Alternative: Standalone Route Planner Page

If you prefer a dedicated route planning page:

```tsx
// src/pages/RoutePlanning.tsx
import Layout from "@/components/Layout";
import GeofenceRoutePlanner from "@/components/loads/GeofenceRoutePlanner";
import { useState } from "react";

const RoutePlanning = () => {
  const [origin, setOrigin] = useState({ lat: -17.8216, lng: 31.0492 });
  const [destination, setDestination] = useState({
    lat: -26.2041,
    lng: 28.0473,
  });

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Route Planning</h1>
          <p className="text-gray-500">
            Plan routes with geofences, tolls, and border posts
          </p>
        </div>

        {/* Location Inputs */}
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Origin</Label>
                <LocationSelector
                  onSelect={(loc) =>
                    setOrigin({ lat: loc.latitude, lng: loc.longitude })
                  }
                />
              </div>
              <div>
                <Label>Destination</Label>
                <LocationSelector
                  onSelect={(loc) =>
                    setDestination({ lat: loc.latitude, lng: loc.longitude })
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Geofence Route Planner */}
        <GeofenceRoutePlanner
          loadId="preview"
          originLat={origin.lat}
          originLng={origin.lng}
          destinationLat={destination.lat}
          destinationLng={destination.lng}
        />
      </div>
    </Layout>
  );
};

export default RoutePlanning;
```

Add route to `src/App.tsx`:

```tsx
<Route
  path="/route-planning"
  element={
    <ProtectedRoute>
      <RoutePlanning />
    </ProtectedRoute>
  }
/>
```

---

## Bonus: Map Visualization

To show geofences on a map alongside the route:

```tsx
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Circle,
  Popup,
} from "react-leaflet";

// Inside your component:
<MapContainer
  center={[(originLat + destinationLat) / 2, (originLng + destinationLng) / 2]}
  zoom={7}
  className="h-96 w-full rounded-lg"
>
  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

  {/* Origin */}
  <Marker position={[originLat, originLng]}>
    <Popup>Origin: {load.origin}</Popup>
  </Marker>

  {/* Destination */}
  <Marker position={[destinationLat, destinationLng]}>
    <Popup>Destination: {load.destination}</Popup>
  </Marker>

  {/* Route Line */}
  <Polyline
    positions={[
      [originLat, originLng],
      [destinationLat, destinationLng],
    ]}
    color="blue"
    weight={3}
  />

  {/* Geofences */}
  {geofences.map((gf) => (
    <Circle
      key={gf.id}
      center={[gf.center_lat, gf.center_lng]}
      radius={gf.radius || 1000}
      color={gf.color}
      fillOpacity={0.2}
    >
      <Popup>
        <strong>{gf.name}</strong>
        <br />
        {gf.description}
      </Popup>
    </Circle>
  ))}
</MapContainer>;
```

---

## Testing Checklist

- [ ] Run geofence import SQL migration
- [ ] Create load with location selector (coordinates auto-fill)
- [ ] Click "Plan Route" button
- [ ] See statistics cards with distance/time/cost
- [ ] See list of geofences along route
- [ ] See toll gates and borders auto-selected
- [ ] Toggle geofence checkboxes (stats update)
- [ ] Verify border post shows "~2h delay" badge
- [ ] Check summary shows correct totals
- [ ] Test with different origin/destination pairs

---

## Next Steps

Once this is working, you can add:

1. **Save Route Button** - Store selected waypoints to database
2. **Map Visualization** - Show route and geofences on interactive map
3. **Multiple Routes** - Compare different route options
4. **Cost Optimization** - Find cheapest vs fastest route
5. **Real-time Updates** - Adjust ETA based on vehicle progress
6. **Geofence Alerts** - Notify when vehicle enters/exits zones

**Everything is ready - just integrate and test!** 🚀
