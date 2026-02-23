# Wialon Advanced Features Implementation Guide

## Overview

This guide covers the implementation of two advanced Wialon features:

1. **Track Visualization** - Display historical vehicle movement tracks
2. **Geofence Management** - Browse and create circular geofences

## Architecture

### Components

```
src/components/wialon/
├── TrackVisualization.tsx    # Track generation and display
├── GeofenceManagement.tsx    # Geofence browsing and creation
└── index.ts                  # Barrel export

src/pages/
└── WialonAdvanced.tsx        # Demo page with map and tabs

src/integrations/wialon/
└── wialonAdvanced.ts         # Advanced Wialon service
```

### Technologies Used

- **Wialon SDK**: Remote API for GPS tracking
- **Leaflet**: Open-source map library
- **React Query**: Data fetching and caching
- **shadcn/ui**: UI components
- **Tailwind CSS**: Styling

## Track Visualization

### Features

#### 1. Track Generation

- **Time Range**: Full day's movement (00:00 - 23:59)
- **Custom Colors**: User-selectable track colors
- **Renderer API**: Uses Wialon's tile-based rendering system
- **Track Parameters**:
  - Width: 5 pixels
  - Points at message locations
  - Configurable colors for tracks and points

#### 2. Multi-Unit Support

- Display multiple unit tracks simultaneously
- Each track gets:
  - Different color (user-defined)
  - Own marker at last position
  - Row in information table

#### 3. Track Management Table

Displays:

- Unit name and icon
- Last known position (lat/lng)
- Total mileage for the day
- Color indicator
- Delete button (×)

#### 4. Interactive Features

- **Click unit row**: Zoom to that track's bounds
- **Delete track**: Removes layer from renderer and map
- **Duplicate prevention**: Won't create same track twice

### Usage Example

```typescript
import { TrackVisualization } from "@/components/wialon/TrackVisualization";

// In your component
<TrackVisualization map={mapInstance} defaultColor="#FF0000" />;
```

### Code Structure

```typescript
// Load messages for track generation
unit.loadMessages(
  {
    timeFrom: fromTimestamp,
    timeTo: toTimestamp,
    flags: 0x0000,
    flagsMask: 0xff00,
    loadCount: 0xffffffff, // Load all messages
  },
  (code: number, data: any) => {
    // Process messages
  }
);

// Add track layer to renderer
const layer = rendererRef.current.addTileLayer({
  type: "track",
  unitId: selectedUnitId,
  from: fromTimestamp,
  to: toTimestamp,
  trackColor: trackColor,
  trackWidth: 5,
  points: 1, // Show message points
});
```

### Track Parameters

| Parameter    | Type   | Default   | Description               |
| ------------ | ------ | --------- | ------------------------- |
| `type`       | string | "track"   | Layer type                |
| `unitId`     | number | -         | Wialon unit ID            |
| `from`       | number | -         | Start timestamp (unix)    |
| `to`         | number | -         | End timestamp (unix)      |
| `trackColor` | string | "#FF0000" | Hex color code            |
| `trackWidth` | number | 5         | Track width in pixels     |
| `points`     | number | 1         | Show message points (0/1) |

## Geofence Management

### Features

#### 1. Browse Geofences (Get Geofences)

**Purpose**: Browse existing geofences organized by resource.

**Features**:

- **Resource Selection**: Dropdown of all resources containing geofences
- **Geofence List**: Second dropdown populated with geofences from selected resource
- **Count Display**: Shows how many geofences exist per resource
- **Type Display**: Shows geofence type (Polygon/Line/Circle)
- **Visual Indicators**: Color swatches for each geofence

**Data Flags**:

```typescript
const flags =
  wialon.item.Item.dataFlag.base | wialon.item.Resource.dataFlag.zones;
```

#### 2. Create Circle Geofences

**Purpose**: Interactive creation of circular geofences on map.

**Workflow**:

1. Click "New" button to enable placement mode
2. Click map to set circle center
3. Adjust radius using input field (default: 500m)
4. Click to reposition circle center
5. Enter geofence name
6. Select target resource
7. Click "Save" to create geofence

**Features**:

- **Visual Preview**: Red circle overlay shows geofence before saving
- **Dynamic Radius**: Real-time radius adjustment with visual feedback
- **Validation**: Checks for resource selection, name, and circle existence
- **Access Control**: Only shows resources where user has `editZones` permission

### Geofence Object Structure

```typescript
{
  n: "Geofence Name",           // Name
  t: 3,                          // Type: 1=polygon, 2=line, 3=circle
  f: 0,                          // Flags
  w: 500,                        // Radius in meters (for circles)
  c: 2566914048,                 // Color (ARGB format)
  p: [{                          // Points array
    x: lng,                      // Longitude
    y: lat,                      // Latitude
    r: radius                    // Radius (for circles)
  }]
}
```

### Usage Example

```typescript
import { GeofenceManagement } from "@/components/wialon/GeofenceManagement";

// In your component
<GeofenceManagement map={mapInstance} />;
```

### Color Conversion

Wialon uses ARGB format (Alpha, Red, Green, Blue):

```typescript
// Hex to ARGB
const hexToArgb = (hex: string): number => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const a = 255; // Full opacity

  // ARGB format: (A << 24) | (R << 16) | (G << 8) | B
  return (a << 24) | (r << 16) | (g << 8) | b;
};

// ARGB to Hex
const argbToHex = (argb: number): string => {
  const r = (argb >> 16) & 0xff;
  const g = (argb >> 8) & 0xff;
  const b = argb & 0xff;
  return `#${r.toString(16).padStart(2, "0")}${g
    .toString(16)
    .padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
};
```

## Demo Page Setup

The `WialonAdvanced.tsx` page demonstrates both features:

```typescript
import { TrackVisualization } from "@/components/wialon/TrackVisualization";
import { GeofenceManagement } from "@/components/wialon/GeofenceManagement";
import { useWialonContext } from "@/integrations/wialon";

const WialonAdvancedDemo = () => {
  const { isConnected } = useWialonContext();
  const [mapInstance, setMapInstance] = useState<any>(null);

  // Initialize Leaflet map
  useEffect(() => {
    const L = (window as any).L;
    const map = L.map(mapRef.current).setView([-26.2041, 28.0473], 6);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
    }).addTo(map);

    setMapInstance(map);
  }, []);

  return (
    <Tabs defaultValue="tracks">
      <TabsContent value="tracks">
        <TrackVisualization map={mapInstance} />
      </TabsContent>
      <TabsContent value="geofences">
        <GeofenceManagement map={mapInstance} />
      </TabsContent>
    </Tabs>
  );
};
```

## Integration Checklist

### Prerequisites

- ✅ Wialon SDK loaded (`window.wialon`)
- ✅ Leaflet library loaded (`window.L`)
- ✅ Wialon session initialized and authenticated
- ✅ Map instance created and ready

### Component Setup

- ✅ `TrackVisualization` component created
- ✅ `GeofenceManagement` component created
- ✅ Demo page with map and tabs
- ✅ Route added to App.tsx (`/wialon-advanced`)
- ✅ Navigation link added to Layout

### Testing Steps

1. **Track Visualization**:

   ```bash
   # Navigate to /wialon-advanced
   # Click "Track Generation" tab
   # Select a unit from dropdown
   # Choose a color
   # Click "Generate Track"
   # Verify track displays on map
   # Click unit row to zoom
   # Click delete button to remove
   ```

2. **Geofence Management - Browse**:

   ```bash
   # Click "Geofence Management" tab
   # Click "Browse Geofences" sub-tab
   # Select a resource from dropdown
   # Verify geofences list appears
   # Check type badges (Polygon/Circle/Line)
   # Verify color swatches display correctly
   ```

3. **Geofence Management - Create**:
   ```bash
   # Click "Create Circle" sub-tab
   # Click "New Circle Geofence" button
   # Click on map to place center
   # Adjust radius (500m default)
   # Enter geofence name
   # Select target resource
   # Click "Save Geofence"
   # Verify geofence created in Wialon
   ```

## Performance Considerations

### Track Rendering

- **Tile-based rendering**: Efficient for large datasets
- **Message loading**: Limited to 24 hours (configurable)
- **Multiple tracks**: Each track is independent layer
- **Memory management**: Cleanup on component unmount

### Geofence Creation

- **Visual preview**: Lightweight Leaflet circle overlay
- **Real-time updates**: Radius changes update overlay immediately
- **Validation**: Prevents invalid submissions
- **Error handling**: Comprehensive error messages

## Error Handling

### Common Issues

1. **"Wialon SDK not initialized"**

   - Ensure Wialon session is connected
   - Check `isConnected` state from `useWialonContext`

2. **"Unit not found"**

   - Verify unit ID is valid
   - Check user has access to unit

3. **"No tracking data for today"**

   - Unit may not have GPS messages today
   - Check unit is online and transmitting

4. **"Resource not found" (geofences)**
   - Verify resource ID is valid
   - Check user has `editZones` permission

### Debug Tips

```typescript
// Enable Wialon SDK debugging
window.wialon_debug = true;

// Check session state
const session = window.wialon.core.Session.getInstance();
console.log("Session:", session.getId());
console.log("User:", session.getCurrUser());

// Check renderer state
console.log("Renderer:", rendererRef.current);

// Check unit data
const unit = session.getItem(unitId);
console.log("Unit:", unit.getName(), unit.getLastMessage());
```

## API Reference

### TrackVisualization Props

| Prop           | Type   | Default   | Description          |
| -------------- | ------ | --------- | -------------------- |
| `map`          | any    | undefined | Leaflet map instance |
| `defaultColor` | string | "#FF0000" | Default track color  |

### GeofenceManagement Props

| Prop  | Type | Default   | Description          |
| ----- | ---- | --------- | -------------------- |
| `map` | any  | undefined | Leaflet map instance |

## Best Practices

### Track Visualization

1. **Limit time range**: Don't load more than 7 days at once
2. **Color coding**: Use distinct colors for different units
3. **Cleanup**: Always remove layers on component unmount
4. **User feedback**: Show loading states during track generation

### Geofence Management

1. **Permissions**: Check `editZones` before showing create UI
2. **Validation**: Validate name, radius, and center before saving
3. **Visual feedback**: Show preview before committing to Wialon
4. **Error messages**: Clear, actionable error messages

## Future Enhancements

### Track Visualization

- [ ] Date range picker (custom time range)
- [ ] Export tracks to GPX/KML
- [ ] Speed color coding
- [ ] Stop detection and visualization
- [ ] Track playback animation

### Geofence Management

- [ ] Polygon geofence creation
- [ ] Line geofence creation
- [ ] Edit existing geofences
- [ ] Geofence triggering rules
- [ ] Import geofences from file

## Resources

- [Wialon Remote API Documentation](https://sdk.wialon.com/wiki/en/sidebar/remoteapi/apiref/apiref)
- [Wialon Renderer API](https://sdk.wialon.com/playground/demo/renderer)
- [Leaflet Documentation](https://leafletjs.com/reference.html)
- [Project Codebase: Explain.COde](../Explain.COde)

## Support

For issues or questions:

1. Check error console for detailed messages
2. Review this documentation
3. Check Wialon SDK documentation
4. Verify permissions in Wialon account
