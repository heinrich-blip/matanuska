# Wialon GPS Tracking Integration - Usage Guide

## Overview

This integration connects your Car Craft Co fleet management system with Wialon GPS tracking platform to enable real-time vehicle location monitoring and future route planning capabilities.

## Setup Instructions

### 1. Generate Wialon API Token

1. Visit the Wialon token generation URL in your browser:

   ```
   https://hosting.wialon.com/login.html?client_id=CarCraftCo&access_type=0x100&activation_time=0&duration=2592000&flags=0x1&redirect_uri=http://localhost:5173
   ```

2. Log in with your Wialon account credentials

3. After authorization, you'll be redirected to:

   ```
   http://localhost:5173/#access_token=YOUR_TOKEN_HERE&...
   ```

4. Copy the `access_token` value from the URL

### 2. Configure Environment Variables

Create or update your `.env` file in the project root:

```env
# Wialon GPS Tracking Configuration
VITE_WIALON_HOST=https://hst-api.wialon.com
VITE_WIALON_TOKEN=your_token_here
VITE_WIALON_APP_NAME=CarCraftCo
```

### 3. Restart Development Server

Stop and restart your development server to load the new environment variables:

```bash
npm run dev
```

## Accessing GPS Tracking

### Via Navigation Menu

1. Log in to the application
2. Navigate to **Operations → GPS Tracking**
3. Click "Connect to Wialon" button
4. View real-time vehicle locations

### Route

Direct URL: `http://localhost:5173/gps-tracking`

## Features

### Current Features

- **Real-time Connection**: Live connection to Wialon GPS tracking system
- **Vehicle Location Monitoring**: View current position of all tracked vehicles
- **Live Statistics**:
  - Total vehicles tracked
  - Vehicles currently moving
  - Vehicles currently stationary
  - Average fleet speed
- **Detailed Vehicle Table**:
  - Vehicle name
  - Movement status (moving/stopped)
  - GPS coordinates (latitude/longitude)
  - Current speed with visual badges
  - Heading/direction
  - Satellite count
  - Last update timestamp
- **Real-time Updates**: Automatic updates when vehicles move
- **Manual Refresh**: Refresh button to update data on demand

### Planned Features (Future Development)

- Interactive map visualization
- Route planning and optimization
- Geofencing and alerts
- Trip history and analytics
- Driver behavior monitoring
- Integration with maintenance scheduling

## Using in Your Components

### Option 1: Using the Hook Directly

```typescript
import { useWialon } from "@/integrations/wialon";

const MyComponent = () => {
  const {
    isConnected,
    isLoading,
    error,
    vehicleLocations,
    connect,
    disconnect,
    refreshUnits,
  } = useWialon({
    autoConnect: false,
    enableRealtimeUpdates: true,
  });

  return (
    <div>
      {!isConnected && (
        <button onClick={connect} disabled={isLoading}>
          Connect to Wialon
        </button>
      )}

      {isConnected && (
        <>
          <button onClick={disconnect}>Disconnect</button>
          <button onClick={refreshUnits}>Refresh</button>

          <div>
            {vehicleLocations.map((vehicle) => (
              <div key={vehicle.vehicleId}>
                {vehicle.vehicleName}: {vehicle.latitude}, {vehicle.longitude}
                {vehicle.isMoving ? " (Moving)" : " (Stopped)"}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
```

### Option 2: Using Context (Already Configured)

The app is already wrapped with `WialonProvider` in `main.tsx`, so you can use the context hook anywhere:

```typescript
import { useWialonContext } from "@/integrations/wialon";

const MyComponent = () => {
  const { isConnected, vehicleLocations, connect } = useWialonContext();

  // Same usage as above
};
```

## API Reference

### useWialon Hook

#### Parameters

```typescript
interface UseWialonOptions {
  autoConnect?: boolean; // Auto-connect on mount (default: false)
  enableRealtimeUpdates?: boolean; // Subscribe to real-time updates (default: true)
}
```

#### Return Value

```typescript
interface UseWialonResult {
  isConnected: boolean; // Connection status
  isLoading: boolean; // Loading state
  error: Error | null; // Error state
  units: WialonUnit[]; // Raw Wialon unit data
  vehicleLocations: VehicleLocation[]; // Normalized vehicle locations
  connect: () => Promise<void>; // Connect to Wialon
  disconnect: () => Promise<void>; // Disconnect from Wialon
  refreshUnits: () => Promise<void>; // Refresh vehicle data
  getUnitById: (id: number) => WialonUnit | null; // Get specific unit
}
```

### VehicleLocation Type

```typescript
interface VehicleLocation {
  vehicleId: string; // Unique vehicle identifier
  vehicleName: string; // Vehicle name/registration
  wialonUnitId?: number; // Wialon internal unit ID
  latitude: number; // GPS latitude
  longitude: number; // GPS longitude
  altitude: number; // Altitude in meters
  speed: number; // Speed in km/h
  heading: number; // Direction (0-360 degrees)
  timestamp: Date; // Last position update time
  satelliteCount: number; // Number of GPS satellites
  isMoving: boolean; // Whether vehicle is currently moving
}
```

## Troubleshooting

### "Connection Error" Message

**Problem**: Cannot connect to Wialon API

**Solutions**:

1. Verify `VITE_WIALON_TOKEN` is set in `.env` file
2. Check token is valid (tokens expire after 30 days)
3. Regenerate token if expired
4. Ensure `.env` file is in project root (not `src/`)
5. Restart development server after changing `.env`

### "No vehicle locations available"

**Problem**: Connected but no vehicles showing

**Solutions**:

1. Verify units are registered in your Wialon account
2. Check units have GPS tracking devices installed and active
3. Ensure units are sending position data
4. Try clicking "Refresh" button
5. Check Wialon web interface to confirm units are visible there

### Token Expired

**Problem**: Token stops working after 30 days

**Solution**: Generate a new token using the URL in Step 1 above. The URL is configured for 30-day tokens. You can adjust `duration` parameter for longer expiry (in seconds).

### Real-time Updates Not Working

**Problem**: Positions not updating automatically

**Solutions**:

1. Verify `enableRealtimeUpdates` is set to `true`
2. Check browser console for WebSocket errors
3. Try disconnecting and reconnecting
4. Use manual refresh button as workaround

## Architecture

### Files Created

```
src/integrations/wialon/
├── index.ts                  # Main export file
├── types.ts                  # TypeScript definitions
├── service.ts                # Core WialonService class
├── useWialon.ts              # React hook
├── WialonContext.ts          # React Context
├── WialonProvider.tsx        # Context Provider
└── useWialonContext.ts       # Context hook

src/components/
└── WialonTrackingDemo.tsx    # Demo/main GPS tracking component

src/pages/
└── GPSTracking.tsx           # GPS tracking page
```

### Design Patterns

- **Singleton Pattern**: Single `WialonService` instance across the app
- **Context Provider Pattern**: App-wide access via React Context
- **Custom Hooks**: Component-level integration
- **Dynamic Script Loading**: Wialon SDK loaded on demand (no npm package)
- **Type Safety**: Full TypeScript support for Wialon API

## Security Notes

1. **Token Security**: Keep your Wialon token secret
2. **Environment Variables**: Never commit `.env` file to version control
3. **Token Permissions**: Generate tokens with minimum required permissions
4. **Token Rotation**: Regenerate tokens periodically
5. **HTTPS Only**: Always use HTTPS in production

## Next Steps

1. **Map Integration**: Add Leaflet or Google Maps for visual tracking
2. **Route Planning**: Build route creation and optimization features
3. **Alerts System**: Implement geofencing and speed alerts
4. **Historical Data**: Add trip history and reporting
5. **Database Integration**: Store vehicle positions in Supabase for analytics

## Support

For Wialon API documentation:

- https://sdk.wialon.com/wiki/en/sidebar/remoteapi/apiref/apiref
- https://hosting.wialon.com

For application support:

- Check project documentation
- Review console logs for detailed error messages
- Contact development team

## Additional Notes

- Wialon SDK is loaded dynamically via CDN (no npm package required)
- Real-time updates use Wialon's event system (not WebSockets)
- All times are in UTC and converted to local timezone in UI
- Speed is always in km/h (convert if needed)
- Coordinates are in decimal degrees format
