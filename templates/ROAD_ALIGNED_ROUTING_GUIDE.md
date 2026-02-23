# Road-Aligned Routing & Real-Time Tracking Guide

## Overview

This guide explains how to implement **road-aligned routing** (following actual roads, not straight lines) and **real-time truck tracking with route replay** for the Car Craft Co fleet management system.

## Current State

### What's Implemented ✅

1. **Route Planning with Geofences** - Create routes by selecting pickup/delivery points
2. **Saved Route Templates** - Save and reuse optimized routes
3. **Load Creation with Routes** - Select saved routes when creating loads
4. **Manual Route Adjustment** - Reorder waypoints with up/down arrows
5. **Route Visualization** - Display routes on map with polylines
6. **Real-Time GPS Tracking** - Wialon integration for live vehicle positions

### What Needs Enhancement 🔄

1. **Road Network Routing** - Currently shows straight lines between waypoints
2. **Route Deviation Detection** - Compare actual path vs. planned route
3. **Historical Route Replay** - Playback past trips with timeline scrubber

---

## Solution Architecture

### 1. Road-Aligned Routing (Integration Options)

To get routes that follow actual roads, you need a **routing engine**. Here are the recommended options:

#### Option A: OpenRouteService (Recommended - FREE)

```typescript
// Install: npm install openrouteservice-js

import Openrouteservice from "openrouteservice-js";

const orsDirections = new Openrouteservice.Directions({
  api_key: process.env.VITE_OPENROUTESERVICE_API_KEY, // Free at https://openrouteservice.org/
});

async function getRoadRoute(waypoints: Array<[number, number]>) {
  try {
    const response = await orsDirections.calculate({
      coordinates: waypoints.map((wp) => [wp[1], wp[0]]), // [lng, lat] format
      profile: "driving-hgv", // Heavy goods vehicle (truck) profile
      format: "geojson",
      instructions: true,
      elevation: true,
    });

    return {
      geometry: response.features[0].geometry.coordinates, // Road-aligned coordinates
      distance: response.features[0].properties.summary.distance / 1000, // km
      duration: response.features[0].properties.summary.duration / 60, // minutes
      segments: response.features[0].properties.segments, // Turn-by-turn instructions
    };
  } catch (error) {
    console.error("Routing failed:", error);
    throw error;
  }
}
```

**Features:**

- ✅ FREE up to 40 requests/minute
- ✅ Truck-specific routing (avoid low bridges, weight limits)
- ✅ Avoids highways/toll roads (configurable)
- ✅ Turn-by-turn navigation
- ✅ Elevation profile
- ✅ Works in Africa

#### Option B: MapBox Directions API

```typescript
// Install: npm install @mapbox/mapbox-sdk

import mapboxSdk from "@mapbox/mapbox-sdk/services/directions";

const directionsClient = mapboxSdk({
  accessToken: process.env.VITE_MAPBOX_TOKEN,
});

async function getMapboxRoute(waypoints: Array<[number, number]>) {
  const response = await directionsClient
    .getDirections({
      profile: "driving",
      waypoints: waypoints.map((wp) => ({
        coordinates: [wp[1], wp[0]], // [lng, lat]
      })),
      geometries: "geojson",
      overview: "full",
      steps: true,
    })
    .send();

  const route = response.body.routes[0];
  return {
    geometry: route.geometry.coordinates,
    distance: route.distance / 1000, // km
    duration: route.duration / 60, // minutes
    legs: route.legs,
  };
}
```

**Pricing:** 100,000 free requests/month, then $0.50 per 1,000

#### Option C: Google Routes API (Most Accurate, Paid)

```typescript
// Requires server-side implementation (not exposed in browser)

// In Supabase Edge Function:
const response = await fetch(
  "https://routes.googleapis.com/directions/v2:computeRoutes",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY,
      "X-Goog-FieldMask":
        "routes.duration,routes.distanceMeters,routes.polyline",
    },
    body: JSON.stringify({
      origin: {
        location: { latLng: { latitude: -26.2041, longitude: 28.0473 } },
      },
      destination: {
        location: { latLng: { latitude: -33.9249, longitude: 18.4241 } },
      },
      travelMode: "DRIVE",
      routingPreference: "TRAFFIC_AWARE",
      computeAlternativeRoutes: false,
    }),
  }
);
```

**Pricing:** $5 per 1,000 requests

---

### 2. Implementation Plan

#### Step 1: Create Road Routing Hook

```typescript
// src/hooks/useRoadRouting.ts

import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import Openrouteservice from "openrouteservice-js";

interface RouteSegment {
  coordinates: [number, number][]; // [lng, lat][]
  distance: number; // km
  duration: number; // minutes
  instructions?: string[];
}

export const useRoadRouting = () => {
  const { toast } = useToast();
  const [isCalculating, setIsCalculating] = useState(false);

  const calculateRoadRoute = useCallback(
    async (
      waypoints: Array<{ latitude: number; longitude: number }>,
      options?: {
        profile?: "driving-car" | "driving-hgv"; // hgv = Heavy Goods Vehicle
        avoidTolls?: boolean;
        avoidHighways?: boolean;
      }
    ): Promise<RouteSegment | null> => {
      if (waypoints.length < 2) {
        toast({
          title: "Not Enough Waypoints",
          description: "Need at least 2 points to calculate route",
          variant: "destructive",
        });
        return null;
      }

      setIsCalculating(true);

      try {
        const orsDirections = new Openrouteservice.Directions({
          api_key: import.meta.env.VITE_OPENROUTESERVICE_API_KEY,
        });

        const coordinates = waypoints.map((wp) => [wp.longitude, wp.latitude]);

        const response = await orsDirections.calculate({
          coordinates,
          profile: options?.profile || "driving-hgv",
          format: "geojson",
          instructions: true,
          elevation: false,
          options: {
            avoid_features: [
              ...(options?.avoidTolls ? ["tollways"] : []),
              ...(options?.avoidHighways ? ["highways"] : []),
            ],
          },
        });

        const route = response.features[0];
        const properties = route.properties;

        return {
          coordinates: route.geometry.coordinates,
          distance: properties.summary.distance / 1000, // convert to km
          duration: properties.summary.duration / 60, // convert to minutes
          instructions: properties.segments.flatMap((seg: any) =>
            seg.steps.map((step: any) => step.instruction)
          ),
        };
      } catch (error) {
        console.error("Road routing failed:", error);
        toast({
          title: "Routing Error",
          description: "Failed to calculate road route. Using straight line.",
          variant: "destructive",
        });
        return null;
      } finally {
        setIsCalculating(false);
      }
    },
    [toast]
  );

  return {
    calculateRoadRoute,
    isCalculating,
  };
};
```

#### Step 2: Update UnifiedMapView to Use Road Routes

```typescript
// In UnifiedMapView.tsx

import { useRoadRouting } from "@/hooks/useRoadRouting";

const UnifiedMapView: React.FC = () => {
  const { calculateRoadRoute, isCalculating } = useRoadRouting();
  const [roadRouteCoordinates, setRoadRouteCoordinates] = useState<
    [number, number][]
  >([]);

  // Calculate road route when waypoints change
  useEffect(() => {
    if (routeWaypoints.length >= 2) {
      calculateRoadRoute(routeWaypoints, {
        profile: "driving-hgv",
        avoidTolls: false,
      }).then((route) => {
        if (route) {
          // Convert [lng, lat] to [lat, lng] for Leaflet
          setRoadRouteCoordinates(
            route.coordinates.map((coord) => [coord[1], coord[0]])
          );
        }
      });
    } else {
      setRoadRouteCoordinates([]);
    }
  }, [routeWaypoints, calculateRoadRoute]);

  // In map rendering:
  return (
    <MapContainer>
      {/* Replace straight-line polyline with road-aligned route */}
      {roadRouteCoordinates.length > 0 ? (
        <Polyline
          positions={roadRouteCoordinates}
          color="#8B5CF6"
          weight={4}
          opacity={1}
        />
      ) : routeWaypoints.length > 1 ? (
        // Fallback to straight line if routing fails
        <Polyline
          positions={routeWaypoints.map((wp) => [wp.latitude, wp.longitude])}
          color="#8B5CF6"
          weight={4}
          opacity={0.5}
          dashArray="10, 10"
        />
      ) : null}
    </MapContainer>
  );
};
```

---

### 3. Real-Time Tracking with Route Comparison

#### Track Vehicle Against Planned Route

```typescript
// src/hooks/useRouteDeviation.ts

import { useEffect, useState } from "react";
import { useWialonContext } from "@/integrations/wialon";

interface DeviationStatus {
  isOnRoute: boolean;
  deviationDistance: number; // meters
  nearestPointOnRoute: [number, number];
  progressPercent: number;
}

export const useRouteDeviation = (
  vehicleId: string,
  routeCoordinates: [number, number][]
) => {
  const { vehicleLocations } = useWialonContext();
  const [deviation, setDeviation] = useState<DeviationStatus | null>(null);

  useEffect(() => {
    const vehicle = vehicleLocations.find((v) => v.vehicleId === vehicleId);
    if (!vehicle || routeCoordinates.length < 2) return;

    const vehiclePos: [number, number] = [vehicle.latitude, vehicle.longitude];

    // Find nearest point on route using perpendicular distance
    let minDistance = Infinity;
    let nearestPoint: [number, number] = routeCoordinates[0];
    let progressPercent = 0;

    for (let i = 0; i < routeCoordinates.length - 1; i++) {
      const segmentStart = routeCoordinates[i];
      const segmentEnd = routeCoordinates[i + 1];

      const { distance, nearestPoint: nearest } = pointToSegmentDistance(
        vehiclePos,
        segmentStart,
        segmentEnd
      );

      if (distance < minDistance) {
        minDistance = distance;
        nearestPoint = nearest;
        progressPercent = (i / (routeCoordinates.length - 1)) * 100;
      }
    }

    setDeviation({
      isOnRoute: minDistance < 500, // Within 500m = on route
      deviationDistance: minDistance,
      nearestPointOnRoute: nearestPoint,
      progressPercent,
    });
  }, [vehicleLocations, vehicleId, routeCoordinates]);

  return deviation;
};

// Haversine distance helper
function pointToSegmentDistance(
  point: [number, number],
  segmentStart: [number, number],
  segmentEnd: [number, number]
): { distance: number; nearestPoint: [number, number] } {
  // Project point onto line segment and calculate distance
  // (Implementation using Haversine formula - see existing calculateDistance)
  // Returns distance in meters and nearest point coordinates
}
```

#### Display in LiveDeliveryTracking

```typescript
// In LiveDeliveryTracking.tsx

const deviation = useRouteDeviation(
  load.assigned_vehicle.wialon_unit_id,
  roadRouteCoordinates
);

return (
  <div>
    {deviation && (
      <Card
        className={
          deviation.isOnRoute ? "border-green-500" : "border-yellow-500"
        }
      >
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">
                {deviation.isOnRoute ? "✅ On Route" : "⚠️ Off Route"}
              </p>
              <p className="text-sm text-muted-foreground">
                {deviation.deviationDistance < 1000
                  ? `${Math.round(deviation.deviationDistance)}m from route`
                  : `${(deviation.deviationDistance / 1000).toFixed(
                      1
                    )}km from route`}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">
                {Math.round(deviation.progressPercent)}%
              </p>
              <p className="text-xs text-muted-foreground">Complete</p>
            </div>
          </div>
          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${deviation.progressPercent}%` }}
            />
          </div>
        </CardContent>
      </Card>
    )}
  </div>
);
```

---

### 4. Historical Route Replay

#### Store GPS Breadcrumbs

```sql
-- Migration: Add GPS tracking table

CREATE TABLE IF NOT EXISTS public.gps_breadcrumbs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  load_id UUID NOT NULL REFERENCES public.loads(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.wialon_vehicles(id),

  -- Position data
  latitude NUMERIC(10, 7) NOT NULL,
  longitude NUMERIC(10, 7) NOT NULL,
  altitude NUMERIC(8, 2),

  -- Movement data
  speed_kmh NUMERIC(6, 2),
  heading_degrees NUMERIC(5, 2), -- 0-360

  -- Metadata
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  gps_accuracy_meters NUMERIC(6, 2),

  -- Indexes
  CONSTRAINT gps_breadcrumbs_valid_coords CHECK (
    latitude BETWEEN -90 AND 90 AND
    longitude BETWEEN -180 AND 180
  )
);

CREATE INDEX idx_gps_breadcrumbs_load_time ON public.gps_breadcrumbs(load_id, recorded_at DESC);
CREATE INDEX idx_gps_breadcrumbs_vehicle_time ON public.gps_breadcrumbs(vehicle_id, recorded_at DESC);

-- Enable RLS
ALTER TABLE public.gps_breadcrumbs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gps_breadcrumbs_select_policy" ON public.gps_breadcrumbs
  FOR SELECT USING (auth.role() = 'authenticated');
```

#### Capture GPS Data in Real-Time

```typescript
// src/hooks/useGPSTracking.ts

import { useEffect } from "react";
import { useWialonContext } from "@/integrations/wialon";
import { supabase } from "@/integrations/supabase/client";

export const useGPSTracking = (loadId: string, vehicleId: string) => {
  const { vehicleLocations } = useWialonContext();

  useEffect(() => {
    const interval = setInterval(async () => {
      const vehicle = vehicleLocations.find((v) => v.vehicleId === vehicleId);
      if (!vehicle) return;

      // Store breadcrumb every 30 seconds
      await supabase.from("gps_breadcrumbs").insert({
        load_id: loadId,
        vehicle_id: vehicleId,
        latitude: vehicle.latitude,
        longitude: vehicle.longitude,
        speed_kmh: vehicle.speed,
        heading_degrees: vehicle.heading || 0,
        recorded_at: new Date().toISOString(),
      });
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [loadId, vehicleId, vehicleLocations]);
};
```

#### Route Replay Component

```typescript
// src/components/loads/RouteReplayPlayer.tsx

import { useState, useEffect } from "react";
import { MapContainer, Polyline, Marker } from "react-leaflet";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, SkipBack, SkipForward } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface RouteReplayPlayerProps {
  loadId: string;
}

export const RouteReplayPlayer = ({ loadId }: RouteReplayPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  // Fetch GPS breadcrumbs
  const { data: breadcrumbs = [] } = useQuery({
    queryKey: ["gps-breadcrumbs", loadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gps_breadcrumbs")
        .select("*")
        .eq("load_id", loadId)
        .order("recorded_at", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  // Auto-advance playback
  useEffect(() => {
    if (!isPlaying || currentIndex >= breadcrumbs.length - 1) {
      setIsPlaying(false);
      return;
    }

    const timeout = setTimeout(() => {
      setCurrentIndex((i) => i + 1);
    }, 1000 / playbackSpeed); // Adjust speed

    return () => clearTimeout(timeout);
  }, [isPlaying, currentIndex, breadcrumbs.length, playbackSpeed]);

  const currentPosition = breadcrumbs[currentIndex];
  const completedPath = breadcrumbs.slice(0, currentIndex + 1);

  return (
    <div className="space-y-4">
      <MapContainer
        center={[-26.2041, 28.0473]}
        zoom={10}
        style={{ height: "500px" }}
      >
        {/* Completed path */}
        {completedPath.length > 1 && (
          <Polyline
            positions={completedPath.map((b) => [b.latitude, b.longitude])}
            color="#3b82f6"
            weight={4}
          />
        )}

        {/* Remaining path (faded) */}
        {currentIndex < breadcrumbs.length - 1 && (
          <Polyline
            positions={breadcrumbs
              .slice(currentIndex)
              .map((b) => [b.latitude, b.longitude])}
            color="#94a3b8"
            weight={2}
            dashArray="5, 5"
          />
        )}

        {/* Current position marker */}
        {currentPosition && (
          <Marker
            position={[currentPosition.latitude, currentPosition.longitude]}
            icon={L.divIcon({
              html: `<div style="
                background-color: #3b82f6;
                width: 20px;
                height: 20px;
                border-radius: 50%;
                border: 3px solid white;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              "></div>`,
              iconSize: [20, 20],
              iconAnchor: [10, 10],
            })}
          />
        )}
      </MapContainer>

      {/* Playback Controls */}
      <div className="space-y-2">
        <Slider
          value={[currentIndex]}
          max={breadcrumbs.length - 1}
          step={1}
          onValueChange={([value]) => setCurrentIndex(value)}
        />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCurrentIndex(0)}
            >
              <SkipBack className="h-4 w-4" />
            </Button>
            <Button size="sm" onClick={() => setIsPlaying(!isPlaying)}>
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCurrentIndex(breadcrumbs.length - 1)}
            >
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm">Speed:</span>
            <Select
              value={playbackSpeed.toString()}
              onValueChange={(v) => setPlaybackSpeed(Number(v))}
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0.5">0.5x</SelectItem>
                <SelectItem value="1">1x</SelectItem>
                <SelectItem value="2">2x</SelectItem>
                <SelectItem value="5">5x</SelectItem>
                <SelectItem value="10">10x</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="text-sm text-muted-foreground">
            {currentIndex + 1} / {breadcrumbs.length} points
            {currentPosition && (
              <span className="ml-2">
                · {new Date(currentPosition.recorded_at).toLocaleTimeString()}· {currentPosition.speed_kmh?.toFixed(
                  1
                )} km/h
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
```

---

## Implementation Checklist

### Phase 1: Road Routing (Week 1)

- [ ] Sign up for OpenRouteService API key (free)
- [ ] Add `VITE_OPENROUTESERVICE_API_KEY` to `.env`
- [ ] Install `openrouteservice-js` package
- [ ] Create `useRoadRouting` hook
- [ ] Update UnifiedMapView to use road routes
- [ ] Test with 2+ waypoints in South Africa

### Phase 2: Route Integration (Week 1)

- [ ] Update CreateLoadDialog with route selector (✅ DONE)
- [ ] Store `route_id` reference in loads table
- [ ] Display route on load detail page
- [ ] Show estimated distance/duration from routing engine

### Phase 3: Real-Time Tracking (Week 2)

- [ ] Create GPS breadcrumbs table migration
- [ ] Implement `useGPSTracking` hook
- [ ] Add breadcrumb capture to active loads
- [ ] Create `useRouteDeviation` hook
- [ ] Display deviation status in LiveDeliveryTracking

### Phase 4: Route Replay (Week 2-3)

- [ ] Build RouteReplayPlayer component
- [ ] Add timeline scrubber UI
- [ ] Implement playback speed controls
- [ ] Add deviation highlighting on replay
- [ ] Export replay as video/GIF

---

## Cost Estimation

| Service           | Free Tier  | Paid Tier                 | Recommendation |
| ----------------- | ---------- | ------------------------- | -------------- |
| OpenRouteService  | 40 req/min | €49/month for 1M requests | **Start here** |
| MapBox Directions | 100K/month | $0.50 per 1K              | Scale option   |
| Google Routes API | None       | $5 per 1K                 | Premium option |

**Monthly estimate for 50 trucks, 10 loads/day:**

- Route calculations: ~300/day = 9,000/month
- **OpenRouteService: FREE** ✅
- GPS breadcrumbs storage: ~50 trucks × 2,880 points/day = 144K records/day (minimal DB cost)

---

## Next Steps

1. **Immediate:** Implement `useRoadRouting` hook with OpenRouteService
2. **This Week:** Update map visualization to show road-aligned routes
3. **Next Week:** Add GPS breadcrumb tracking
4. **Following Week:** Build route replay player

**Questions?** Check existing implementations in:

- `src/hooks/useRouteOptimization.ts` - Route calculation patterns
- `src/components/loads/LiveDeliveryTracking.tsx` - Real-time tracking UI
- `src/components/UnifiedMapView.tsx` - Map visualization
