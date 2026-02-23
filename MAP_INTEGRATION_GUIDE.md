# Leaflet Map Integration for Wialon GPS Tracking

## Overview

The GPS tracking system now includes **Leaflet map visualization** with real-time vehicle tracking capabilities.

## Components Created

### 1. `VehicleMap.tsx`

Core map component using React-Leaflet that displays vehicle locations on an interactive map.

**Features:**

- 🗺️ OpenStreetMap tile layer
- 📍 Custom vehicle markers (color-coded by status)
  - 🟢 Green = Moving
  - 🔴 Red = Stopped
- 🧭 Directional indicators showing vehicle heading
- 📊 Detailed vehicle popups with:
  - Speed, heading, altitude
  - GPS coordinates
  - Satellite count
  - Last update timestamp
- 🎯 Auto-fit bounds to show all vehicles
- 📈 Live vehicle count badge

### 2. `WialonMapView.tsx`

Full-featured GPS tracking dashboard with map integration.

**Features:**

- 🔌 Connect/Disconnect controls
- 🔄 Refresh button for manual updates
- 📊 Statistics cards (total, moving, stopped, avg speed)
- 🗺️ Full-screen map view
- 📋 Selected vehicle detail panel
- ⚠️ Error handling and loading states
- 🟢 Connection status indicator

### 3. Updated `GPSTracking` Page

Enhanced page with tabbed interface.

**Features:**

- 🗺️ **Map View** tab - Visual map with markers
- 📊 **Table View** tab - Detailed data table (original WialonTrackingDemo)
- Easy switching between views

## Usage

### Navigate to GPS Tracking

```
http://localhost:5173/gps-tracking
```

### Steps to Use:

1. Click **"Connect to Wialon"** button
2. Wait for authentication (check console for details)
3. Switch between **Map View** and **Table View** tabs
4. Click on vehicle markers for details
5. Use **Refresh** button to manually update positions
6. Real-time updates happen automatically (when enabled)

## Map Features

### Vehicle Markers

- **Color**: Green (moving) or Red (stopped)
- **Arrow**: Points in vehicle's heading direction
- **Click**: Opens popup with detailed information

### Auto-Centering

- When vehicles load, map automatically fits bounds
- Shows all vehicles with optimal zoom level
- Smart padding for better visibility

### Popup Information

Each vehicle popup shows:

- Vehicle name and ID
- Movement status (🟢 Moving / 🔴 Stopped)
- Current speed (km/h)
- Heading direction (degrees + compass direction)
- Altitude (meters)
- Satellite count
- GPS coordinates (latitude, longitude)
- Last update timestamp

## Libraries Used

```json
{
  "leaflet": "^1.9.4",
  "react-leaflet": "^5.0.0",
  "leaflet-routing-machine": "^3.2.12",
  "@types/leaflet": "^1.9.21"
}
```

## Technical Details

### Leaflet Icon Fix

The `VehicleMap.tsx` includes a fix for default Leaflet icons not loading correctly in Vite:

```typescript
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});
```

### Custom Icon Generation

```typescript
const createVehicleIcon = (isMoving: boolean, heading: number) => {
  const color = isMoving ? "#10b981" : "#ef4444";
  // SVG icon with rotation based on heading
  // Arrow points in direction of travel
};
```

### Real-time Updates

The map automatically updates when `vehicleLocations` prop changes:

- Markers update positions
- Colors update based on movement status
- Headings rotate to show direction
- Statistics recalculate

## Future Enhancements

### Route Planning (Already Installed!)

The `leaflet-routing-machine` package is installed and ready for:

- **Route creation** between multiple waypoints
- **Turn-by-turn directions**
- **Distance calculations**
- **ETA estimates**
- **Route optimization**

### Potential Features

1. **Historical Tracking**

   - Show vehicle trails/breadcrumbs
   - Replay past routes
   - Geofence alerts

2. **Clustering**

   - Group nearby vehicles when zoomed out
   - Improve performance with many vehicles

3. **Heatmaps**

   - Show frequent vehicle locations
   - Identify common routes

4. **Custom Layers**

   - Traffic layer
   - Satellite imagery
   - Custom overlays (depots, service stations)

5. **Geofencing**
   - Define geographical boundaries
   - Alert when vehicles enter/exit zones

## Troubleshooting

### Map Not Loading

- Check browser console for Leaflet CSS import
- Verify `import 'leaflet/dist/leaflet.css'` in `main.tsx`
- Check network tab for tile loading

### Markers Not Appearing

- Verify vehicles have valid lat/lng coordinates
- Check `vehicleLocations` array is populated
- Look for console warnings about position data

### Icons Not Displaying

- Check Leaflet icon fix is present
- Verify marker image assets are loading
- Check browser console for image load errors

### Performance Issues

- Consider implementing marker clustering for 50+ vehicles
- Use `maxZoom` restriction to prevent excessive tile loading
- Implement virtual scrolling if showing many vehicles

## Code Example: Using VehicleMap

```tsx
import VehicleMap from '@/components/VehicleMap';
import type { VehicleLocation } from '@/integrations/wialon/types';

function MyComponent() {
  const vehicles: VehicleLocation[] = [...]; // From Wialon

  return (
    <VehicleMap
      vehicles={vehicles}
      center={[-1.286389, 36.817223]} // Nairobi, Kenya
      zoom={13}
      className="h-[600px] w-full"
      onVehicleClick={(vehicle) => {
        console.log('Clicked:', vehicle.vehicleName);
      }}
    />
  );
}
```

## Integration with Wialon

The map integrates seamlessly with your Wialon service:

```typescript
const { vehicleLocations } = useWialonContext();

// vehicleLocations automatically updates from:
// 1. Initial getUnits() call
// 2. Real-time subscribeToUpdates() events
// 3. Manual refreshUnits() calls
```

## Map Controls

### OpenStreetMap Tiles

- Free and open-source
- No API key required
- Global coverage
- Regular updates

### Zoom Controls

- `+` / `-` buttons (top-left)
- Mouse wheel
- Double-click to zoom in
- Shift + drag to zoom to area

### Pan Controls

- Click and drag
- Arrow keys (when map focused)
- Touch gestures on mobile

---

**Map system is fully functional and ready for route planning features!** 🚀
