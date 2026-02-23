# Third-Party Integration Compatibility Evaluation

**Document Version:** 1.0
**Last Updated:** November 18, 2025
**System:** Car Craft Co Fleet Management System

---

## Executive Summary

This document evaluates all third-party integrations used in the Car Craft Co Fleet Management System for compatibility, potential issues, and mitigation strategies. The system relies on 7 major third-party services and 40+ npm packages.

### Risk Assessment Summary

| Integration    | Status        | Risk Level | Critical Issues               | Mitigation Priority |
| -------------- | ------------- | ---------- | ----------------------------- | ------------------- |
| Supabase       | ✅ Compatible | **LOW**    | None                          | Maintain            |
| Wialon GPS     | ⚠️ Compatible | **MEDIUM** | CORS, Rate limits             | High                |
| React Leaflet  | ⚠️ Compatible | **MEDIUM** | SSR issues, Version conflicts | High                |
| Radix UI       | ✅ Compatible | **LOW**    | None                          | Maintain            |
| TanStack Query | ✅ Compatible | **LOW**    | None                          | Maintain            |
| AWS SDK (S3)   | ⚠️ Not Used   | **LOW**    | Unused dependency             | Medium              |
| Deno Runtime   | ✅ Compatible | **LOW**    | Version pinning needed        | Medium              |

---

## 1. SUPABASE INTEGRATION

### 1.1 Overview

**Package:** `@supabase/supabase-js@^2.79.0`
**Purpose:** Database, Authentication, Real-time subscriptions, Edge Functions
**Usage:** Core backend infrastructure

### 1.2 Compatibility Assessment

✅ **COMPATIBLE** - No major issues

**Version Analysis:**

- Current: `2.79.0`
- Latest Stable: `2.83.x` (as of Nov 2025)
- Breaking Changes: None in 2.x series
- Long-term Support: Active maintenance

**Dependencies:**

```json
{
  "@supabase/supabase-js": "^2.79.0",
  "@supabase/auth-ui-react": "^0.4.7",
  "@supabase/auth-ui-shared": "^0.1.8"
}
```

### 1.3 Current Implementation

```typescript
// src/integrations/supabase/client.ts
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);
```

### 1.4 Potential Issues

#### Issue 1.4.1: Version Mismatch in Edge Functions

**Severity:** MEDIUM
**Impact:** Edge Functions use different Supabase version

**Current State:**

```typescript
// Edge Functions import different versions
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0"; // quick-task
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0"; // maintenance-scheduler
```

**Problem:**

- Frontend: `v2.79.0`
- Edge Functions: `v2.38.0` to `v2.58.0`
- API inconsistencies possible
- Type mismatches between environments

**Mitigation:**

```typescript
// RECOMMENDED: Standardize all Edge Functions to same version
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.79.0";

// Update all Edge Functions:
// - quick-task/index.ts
// - maintenance-scheduler/index.ts
// - import-trips-from-webhook/index.ts
// - wialon-alerts/wialon-alert.ts
```

**Action Required:** HIGH PRIORITY

- [ ] Update all Edge Functions to use `@supabase/supabase-js@2.79.0`
- [ ] Test auth flows after upgrade
- [ ] Verify real-time subscriptions work correctly
- [ ] Update TypeScript types

#### Issue 1.4.2: PostgreSQL Version Dependency

**Severity:** LOW
**Impact:** Database features tied to PostgreSQL version

**Current Config:**

```toml
[db]
major_version = 17
```

**Considerations:**

- PostgreSQL 17 is latest (released Sept 2024)
- Supabase cloud uses PostgreSQL 15 by default (as of Nov 2025)
- Version mismatch between local (17) and production (15) could cause issues

**Mitigation:**

```toml
# Align with Supabase cloud version
[db]
major_version = 15  # Match production environment
```

**Action Required:** MEDIUM PRIORITY

- [ ] Check current Supabase project PostgreSQL version
- [ ] Update config.toml to match
- [ ] Test migrations on matching version
- [ ] Document version requirements

#### Issue 1.4.3: Real-time Subscription Scalability

**Severity:** MEDIUM
**Impact:** Performance degradation with many concurrent users

**Current Implementation:**

- Multiple components subscribe to same tables
- No subscription pooling or deduplication
- Potential WebSocket connection limits

**Example from codebase:**

```typescript
// useLoadRealtime.ts - Each component creates its own subscription
const channel = supabase
  .channel(`load-changes-${loadId}`)
  .on('postgres_changes', { ... })
  .subscribe();
```

**Problem:**

- 100 users × 5 subscriptions = 500 WebSocket connections
- Supabase limits: 200 concurrent connections per project (free tier)
- 500 concurrent connections per project (pro tier)

**Mitigation:**

```typescript
// Implement subscription pooling via Context
// src/contexts/RealtimeContext.tsx

import { createContext, useContext, useEffect, useRef } from "react";

interface RealtimeContextValue {
  subscribeToTable: (table: string, callback: Function) => () => void;
}

export const RealtimeContext = createContext<RealtimeContextValue>(null!);

export const RealtimeProvider = ({ children }) => {
  const subscriptions = useRef(new Map());

  const subscribeToTable = (table: string, callback: Function) => {
    // Reuse existing channel or create new one
    if (!subscriptions.current.has(table)) {
      const channel = supabase
        .channel(`${table}-changes`)
        .on("postgres_changes", { schema: "public", table }, (payload) => {
          // Broadcast to all callbacks
          subscriptions.current.get(table)?.forEach((cb) => cb(payload));
        })
        .subscribe();

      subscriptions.current.set(table, { channel, callbacks: new Set() });
    }

    const sub = subscriptions.current.get(table);
    sub.callbacks.add(callback);

    // Return cleanup function
    return () => {
      sub.callbacks.delete(callback);
      if (sub.callbacks.size === 0) {
        supabase.removeChannel(sub.channel);
        subscriptions.current.delete(table);
      }
    };
  };

  return (
    <RealtimeContext.Provider value={{ subscribeToTable }}>
      {children}
    </RealtimeContext.Provider>
  );
};
```

**Action Required:** MEDIUM PRIORITY

- [ ] Implement RealtimeContext for subscription pooling
- [ ] Refactor hooks to use shared subscriptions
- [ ] Monitor WebSocket connection count
- [ ] Add connection limit alerts

### 1.5 Row Level Security (RLS) Considerations

**Current State:** RLS enabled on all tables

**Potential Issues:**

- Complex RLS policies can slow queries
- Policy changes require database migrations
- Testing policies locally vs production

**Best Practices:**

```sql
-- Add indexes to columns used in RLS policies
CREATE INDEX idx_loads_user_id ON loads(created_by);
CREATE INDEX idx_vehicles_active ON vehicles(active);

-- Monitor slow queries
EXPLAIN ANALYZE
SELECT * FROM loads WHERE created_by = auth.uid();
```

**Action Required:** LOW PRIORITY

- [ ] Review and optimize RLS policies
- [ ] Add indexes for RLS predicate columns
- [ ] Monitor query performance in production

### 1.6 Migration Strategy

**Recommendations:**

1. Stay on Supabase JS v2.x (stable, LTS)
2. Update to v2.83.x for latest bug fixes
3. Monitor breaking changes in v3.x (future)
4. Keep Edge Functions in sync with frontend version

---

## 2. WIALON GPS INTEGRATION

### 2.1 Overview

**API:** Wialon Remote API (REST)
**Purpose:** GPS tracking, vehicle telematics, sensor data
**Host:** `https://hst-api.wialon.eu`
**Usage:** Real-time vehicle location, driver behavior, geofencing

### 2.2 Compatibility Assessment

⚠️ **COMPATIBLE WITH CONCERNS** - Multiple issues identified

### 2.3 Current Implementation

```typescript
// Vite proxy configuration
proxy: {
  '/wialon-api': {
    target: 'https://hst-api.wialon.com',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/wialon-api/, ''),
    secure: true,
  },
}

// Edge Function proxy
const WIALON_HOST = Deno.env.get("WIALON_HOST") || "https://hst-api.wialon.eu";
```

### 2.4 Critical Issues

#### Issue 2.4.1: **HOST URL INCONSISTENCY**

**Severity:** HIGH
**Impact:** API calls may fail due to incorrect host

**Problem:**

- Vite config: `https://hst-api.wialon.com`
- Edge Function: `https://hst-api.wialon.eu`
- Different regional servers, different data

**Root Cause:**
Geographic region mismatch. Wialon has regional APIs:

- `.com` - Global/US region
- `.eu` - European region
- `.by` - Belarus region

**Mitigation:**

```typescript
// Standardize on ONE host across all environments

// 1. Update vite.config.ts
proxy: {
  '/wialon-api': {
    target: 'https://hst-api.wialon.eu',  // Match Edge Function
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/wialon-api/, ''),
    secure: true,
  },
}

// 2. Verify environment variables
WIALON_HOST=https://hst-api.wialon.eu

// 3. Update Edge Function fallback
const WIALON_HOST = Deno.env.get("WIALON_HOST") || "https://hst-api.wialon.eu";
```

**Action Required:** 🚨 CRITICAL PRIORITY

- [ ] Determine correct Wialon region for your fleet
- [ ] Update vite.config.ts to match Edge Function
- [ ] Set WIALON_HOST environment variable consistently
- [ ] Test GPS tracking after change
- [ ] Document region choice in .env.example

#### Issue 2.4.2: CORS Configuration

**Severity:** MEDIUM
**Impact:** Direct API calls blocked by browser

**Current Solution:**

- Development: Vite proxy at `/wialon-api`
- Production: Supabase Edge Function `wialon-proxy`

**Problem:**

- Development uses proxy (works)
- Production might not use Edge Function (depending on implementation)
- Inconsistent behavior between environments

**Code Analysis:**

```typescript
// src/integrations/wialon/useWialon.ts
// Does it detect environment and use correct endpoint?

// Expected behavior:
const WIALON_ENDPOINT = import.meta.env.DEV
  ? "/wialon-api" // Vite proxy
  : `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/wialon-proxy`; // Edge Function
```

**Mitigation:**

```typescript
// Create environment-aware API client
// src/integrations/wialon/client.ts

const WIALON_PROXY_URL =
  import.meta.env.VITE_WIALON_PROXY_URL ||
  (import.meta.env.DEV
    ? "/wialon-api"
    : `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/wialon-proxy`);

export async function callWialonAPI(
  service: string,
  params: any,
  sid?: string
) {
  const response = await fetch(WIALON_PROXY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ service, params, sid }),
  });

  if (!response.ok) {
    throw new Error(`Wialon API error: ${response.statusText}`);
  }

  return response.json();
}
```

**Action Required:** HIGH PRIORITY

- [ ] Verify production uses Edge Function, not direct calls
- [ ] Add VITE_WIALON_PROXY_URL environment variable
- [ ] Test in both dev and production environments
- [ ] Add error handling for CORS failures

#### Issue 2.4.3: Rate Limiting

**Severity:** HIGH
**Impact:** API quota exhaustion, service disruption

**Wialon API Limits:**

- Free accounts: 300 requests/day
- Standard: 10,000 requests/day
- Enterprise: Unlimited (with fair use)

**Current Usage Pattern:**

```typescript
// useWialon.ts - Auto-refresh every 30-60 seconds
useEffect(() => {
  const interval = setInterval(() => {
    refreshUnits(); // Fetches ALL vehicles
  }, 30000); // Every 30 seconds
}, []);
```

**Calculation:**

- 10 vehicles × 2 requests per vehicle (position + sensors) = 20 requests/refresh
- 20 requests × 2 refreshes/minute = 40 requests/minute
- 40 × 60 minutes = 2,400 requests/hour
- 2,400 × 24 hours = **57,600 requests/day**

**Problem:** Exceeds standard tier limits (10,000/day)

**Mitigation Strategies:**

**Option 1: Implement Request Batching**

```typescript
// Fetch multiple vehicles in single API call
async function fetchAllVehicleData(unitIds: number[]) {
  // Use Wialon batch API
  return callAPI("core/batch", {
    params: unitIds.map((id) => ({
      svc: "unit/get_location",
      params: { itemId: id },
    })),
  });
}
```

**Option 2: Adaptive Polling**

```typescript
// Reduce refresh rate when vehicles are idle
function getRefreshInterval(vehicle: VehicleLocation) {
  if (!vehicle.isMoving) return 300000; // 5 minutes for stopped vehicles
  if (vehicle.speed < 10) return 120000; // 2 minutes for slow moving
  return 30000; // 30 seconds for moving vehicles
}
```

**Option 3: WebSocket Alternative**

```typescript
// Use Wialon WebSocket API for real-time updates
// Reduces polling, instant updates
const ws = new WebSocket("wss://hst-api.wialon.eu/wialon/websocket");
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === "position_update") {
    updateVehicleLocation(data);
  }
};
```

**Option 4: Cache Aggressively**

```typescript
// Implement request deduplication
const requestCache = new Map<string, { data: any; timestamp: number }>();

async function cachedWialonRequest(service: string, params: any, ttl = 30000) {
  const key = `${service}-${JSON.stringify(params)}`;
  const cached = requestCache.get(key);

  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data;
  }

  const data = await callAPI(service, params);
  requestCache.set(key, { data, timestamp: Date.now() });
  return data;
}
```

**Action Required:** 🚨 CRITICAL PRIORITY

- [ ] Audit current API request volume in production
- [ ] Implement request batching for multi-vehicle queries
- [ ] Add adaptive polling based on vehicle state
- [ ] Implement request caching layer
- [ ] Monitor API quota usage
- [ ] Set up alerts for quota thresholds (80%, 90%)
- [ ] Consider upgrading Wialon account tier

#### Issue 2.4.4: Session Management

**Severity:** MEDIUM
**Impact:** Session expiration causes API failures

**Current Implementation:**

```typescript
// useWialon.ts - Token-based authentication
const connect = async () => {
  const response = await callAPI("token/login", {
    token: WIALON_TOKEN,
  });

  setSid(response.eid); // Session ID
};
```

**Problems:**

- Session IDs expire (default: 1 hour)
- No automatic re-authentication
- Failed requests not retried with new session

**Mitigation:**

```typescript
// Implement session refresh with retry logic
class WialonSession {
  private sid: string | null = null;
  private lastRefresh: number = 0;
  private readonly SESSION_TTL = 3600000; // 1 hour

  async ensureValidSession(): Promise<string> {
    const now = Date.now();

    if (!this.sid || now - this.lastRefresh > this.SESSION_TTL * 0.9) {
      await this.refresh();
    }

    return this.sid!;
  }

  private async refresh() {
    const response = await callAPI("token/login", {
      token: import.meta.env.VITE_WIALON_TOKEN,
    });

    this.sid = response.eid;
    this.lastRefresh = Date.now();

    console.log("Wialon session refreshed:", this.sid);
  }

  async callWithRetry(service: string, params: any, retries = 1) {
    const sid = await this.ensureValidSession();

    try {
      return await callAPI(service, { ...params, sid });
    } catch (error) {
      // If session expired (error code 1), retry once
      if (error.error === 1 && retries > 0) {
        this.sid = null; // Force refresh
        return this.callWithRetry(service, params, retries - 1);
      }
      throw error;
    }
  }
}
```

**Action Required:** HIGH PRIORITY

- [ ] Implement WialonSession class with auto-refresh
- [ ] Add session expiration monitoring
- [ ] Implement retry logic for expired sessions
- [ ] Log session lifecycle events
- [ ] Add session health checks

#### Issue 2.4.5: Error Handling

**Severity:** MEDIUM
**Impact:** Poor error recovery, unclear failure modes

**Wialon Error Codes:**

```
1  = Invalid session
2  = Invalid service
4  = Item not found
7  = Access denied
1001 = Request limit exceeded
```

**Current Handling:**

```typescript
// Minimal error handling
if (error) throw error;
```

**Mitigation:**

```typescript
// Comprehensive error handler
class WialonError extends Error {
  constructor(
    public code: number,
    message: string,
    public service: string,
    public params: any
  ) {
    super(message);
    this.name = "WialonError";
  }

  isRetryable(): boolean {
    return [1, 1001].includes(this.code); // Session expired or rate limit
  }

  getUserMessage(): string {
    switch (this.code) {
      case 1:
        return "GPS connection lost. Reconnecting...";
      case 2:
        return "GPS service unavailable";
      case 4:
        return "Vehicle not found in GPS system";
      case 7:
        return "Access denied to GPS data";
      case 1001:
        return "GPS request limit reached. Please try again later.";
      default:
        return "GPS tracking temporarily unavailable";
    }
  }
}

async function handleWialonRequest(service: string, params: any) {
  try {
    return await callAPI(service, params);
  } catch (error: any) {
    const wialonError = new WialonError(
      error.error || 0,
      error.reason || "Unknown error",
      service,
      params
    );

    // Log for debugging
    console.error("Wialon API Error:", {
      code: wialonError.code,
      service: wialonError.service,
      message: wialonError.message,
    });

    // Show user-friendly message
    toast({
      title: "GPS Tracking Error",
      description: wialonError.getUserMessage(),
      variant: "destructive",
    });

    // Retry if appropriate
    if (wialonError.isRetryable()) {
      return retryWithBackoff(() => callAPI(service, params));
    }

    throw wialonError;
  }
}
```

**Action Required:** MEDIUM PRIORITY

- [ ] Create WialonError class
- [ ] Implement comprehensive error handling
- [ ] Add error code mapping
- [ ] Implement retry with exponential backoff
- [ ] Add error monitoring/alerting

### 2.5 Data Consistency Issues

#### Issue 2.5.1: Vehicle ID Mapping

**Severity:** HIGH
**Impact:** Incorrect vehicle data association

**Current System:**

- Database uses UUIDs: `123e4567-e89b-12d3-a456-426614174000`
- Wialon uses unit IDs: `12345` (integers)
- Mapping table: `wialon_vehicles`

**Problem:**

```typescript
// Previous implementation used incorrect format
vehicleId: `wialon-${unitId}`; // ❌ Not a valid UUID

// Current implementation fetches mapping
const mapping = await fetchWialonVehicleMapping(); // ✅ Correct
```

**Verification Needed:**

```sql
-- Check for orphaned records
SELECT v.*
FROM vehicles v
LEFT JOIN wialon_vehicles wv ON v.id = wv.vehicle_id
WHERE wv.wialon_unit_id IS NULL;

-- Check for invalid mappings
SELECT * FROM wialon_vehicles
WHERE wialon_unit_id IS NULL OR vehicle_id IS NULL;
```

**Mitigation:**

```typescript
// Strict type checking for vehicle IDs
interface VehicleMapping {
  vehicleId: string; // UUID from database
  wialonUnitId: number; // Integer from Wialon
  registration: string;
  name: string;
}

function validateVehicleMapping(mapping: any): mapping is VehicleMapping {
  return (
    typeof mapping.vehicleId === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      mapping.vehicleId
    ) &&
    typeof mapping.wialonUnitId === "number" &&
    mapping.wialonUnitId > 0
  );
}
```

**Action Required:** HIGH PRIORITY

- [ ] Audit wialon_vehicles table for data integrity
- [ ] Add database constraints (NOT NULL, CHECK)
- [ ] Implement validation in mapping fetch logic
- [ ] Add monitoring for unmapped vehicles
- [ ] Create migration script to fix existing data

### 2.6 Recommendations

**Immediate Actions (Next Sprint):**

1. ✅ Fix host URL inconsistency between Vite and Edge Function
2. ✅ Implement rate limit mitigation (batching + adaptive polling)
3. ✅ Add session management with auto-refresh
4. ✅ Implement comprehensive error handling

**Short-term Actions (Next Month):**

1. ✅ Audit and optimize API request patterns
2. ✅ Implement request caching layer
3. ✅ Add monitoring for API quota usage
4. ✅ Verify vehicle ID mapping data integrity

**Long-term Actions (Next Quarter):**

1. ✅ Evaluate Wialon WebSocket API for real-time updates
2. ✅ Consider Wialon SDK instead of raw API calls
3. ✅ Implement fallback GPS provider (redundancy)
4. ✅ Upgrade Wialon account tier if needed

---

## 3. REACT LEAFLET INTEGRATION

### 3.1 Overview

**Package:** `react-leaflet@^4.2.1`
**Dependencies:** `leaflet@1.9.4`, `@react-leaflet/core@^2.1.0`
**Purpose:** Interactive maps, vehicle tracking visualization
**Usage:** Core UI component for fleet tracking

### 3.2 Compatibility Assessment

⚠️ **COMPATIBLE WITH CONCERNS** - Version conflicts and SSR issues

### 3.3 Current Implementation

```typescript
// vite.config.ts
resolve: {
  alias: {
    'leaflet$': path.resolve(__dirname, 'node_modules/leaflet/dist/leaflet.js'),
  },
},
optimizeDeps: {
  exclude: ['react-leaflet'],
  include: ['leaflet'],
}
```

### 3.4 Identified Issues

#### Issue 3.4.1: Dependency Version Conflicts

**Severity:** MEDIUM
**Impact:** Build warnings, potential runtime errors

**Problem:**

```json
{
  "@types/leaflet": "1.9.21", // dependencies
  "@types/leaflet": "^1.9.21" // devDependencies (caret)
}
```

**Duplicate @types/leaflet Declaration:**

- Listed in both `dependencies` and `devDependencies`
- Different version specifiers (exact vs caret)
- Can cause TypeScript type resolution issues

**Mitigation:**

```json
// Remove from dependencies, keep in devDependencies only
{
  "dependencies": {
    // Remove: "@types/leaflet": "1.9.21",
  },
  "devDependencies": {
    "@types/leaflet": "^1.9.21" // Keep only here
  }
}
```

**Action Required:** LOW PRIORITY

- [ ] Remove duplicate @types/leaflet from dependencies
- [ ] Verify TypeScript compilation still works
- [ ] Check no runtime errors in map components

#### Issue 3.4.2: Server-Side Rendering (SSR) Issues

**Severity:** LOW (Not using SSR currently)
**Impact:** Future migration to Next.js/Remix blocked

**Problem:**
Leaflet requires `window` and `document` objects (browser-only)

**Current State:**

- Using Vite (client-side only) - No issue
- If migrating to SSR framework - Will break

**Mitigation for Future:**

```typescript
// Dynamic import for SSR compatibility
import dynamic from "next/dynamic";

const MapComponent = dynamic(
  () => import("@/components/UnifiedMapView"),
  { ssr: false } // Disable SSR for this component
);
```

**Action Required:** NO ACTION (Document for future reference)

- [ ] Add note to architecture docs about SSR limitation
- [ ] If migrating to SSR, use dynamic imports

#### Issue 3.4.3: Leaflet Routing Machine Compatibility

**Severity:** LOW
**Impact:** Routing features may have bugs

**Package:** `leaflet-routing-machine@^3.2.12`

**Known Issues:**

- TypeScript types incomplete
- Not actively maintained (last update 2 years ago)
- May conflict with Leaflet 2.x (when released)

**Alternatives:**

1. **OpenRouteService** (Currently using for optimization)
2. **MapBox Directions API**
3. **Google Maps Directions API**

**Current Usage:**

```typescript
// src/components/loads/RoutePlanner.tsx
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-routing-machine"; // May cause issues
```

**Mitigation:**

```typescript
// Replace with direct OpenRouteService API calls
async function getRoute(start: [number, number], end: [number, number]) {
  const response = await fetch(
    `https://api.openrouteservice.org/v2/directions/driving-car?` +
      `start=${start[1]},${start[0]}&end=${end[1]},${end[0]}`,
    {
      headers: {
        Authorization: import.meta.env.VITE_OPENROUTE_API_KEY,
      },
    }
  );

  return response.json();
}
```

**Replacement Strategy: NEW LEAFLET PLUGINS**

**Installed Packages:**

- `leaflet-geometryutil@^0.10.3` - Advanced geometry calculations
- `leaflet-geosearch@^4.0.0` - Address search and geocoding
- `leaflet-measure@^3.1.0` - Distance/area measurement tools
- `esri-leaflet-geocoder@^3.1.4` - ESRI geocoding services

**Implementation Phases:**

### Phase 1: Core Geometry Utilities (Week 1) - HIGH PRIORITY

**Goal:** Replace leaflet-routing-machine with leaflet-geometryutil

**Package:** `leaflet-geometryutil`

**Implementation:**

```typescript
// src/utils/routeGeometry.ts
import GeometryUtil from "leaflet-geometryutil";
import { LatLng, Polyline } from "leaflet";

export class RouteGeometryService {
  /**
   * Calculate accurate route distance
   */
  calculateRouteDistance(route: LatLng[] | Polyline): number {
    return GeometryUtil.length(route);
  }

  /**
   * Get human-readable distance
   */
  formatDistance(distance: number, useMetric: boolean = true): string {
    return GeometryUtil.readableDistance(
      distance,
      useMetric ? "metric" : "imperial"
    );
  }

  /**
   * Calculate vehicle progress along route (0 to 1)
   */
  calculateProgress(vehiclePosition: LatLng, route: Polyline): number {
    return GeometryUtil.locateOnLine(map, route, vehiclePosition);
  }

  /**
   * Find closest point on route to vehicle
   */
  findClosestPointOnRoute(
    vehiclePosition: LatLng,
    route: LatLng[]
  ): {
    point: LatLng;
    distance: number;
  } | null {
    const closest = GeometryUtil.closest(map, route, vehiclePosition, false);
    return closest ? { point: closest, distance: closest.distance } : null;
  }

  /**
   * Calculate deviation from planned route
   */
  calculateRouteDeviation(
    vehiclePosition: LatLng,
    route: LatLng[]
  ): {
    deviation: number;
    closestPoint: LatLng;
    isOffRoute: boolean;
  } {
    const closest = this.findClosestPointOnRoute(vehiclePosition, route);
    if (!closest) {
      return {
        deviation: Infinity,
        closestPoint: vehiclePosition,
        isOffRoute: true,
      };
    }

    const MAX_DEVIATION_METERS = 500;
    return {
      deviation: closest.distance,
      closestPoint: closest.point,
      isOffRoute: closest.distance > MAX_DEVIATION_METERS,
    };
  }

  /**
   * Get position at specific progress along route
   */
  getPositionAtProgress(
    route: LatLng[] | Polyline,
    progress: number
  ): LatLng | null {
    const result = GeometryUtil.interpolateOnLine(map, route, progress);
    return result?.latLng || null;
  }

  /**
   * Calculate bearing between two points
   */
  calculateBearing(from: LatLng, to: LatLng): number {
    return GeometryUtil.bearing(from, to);
  }

  /**
   * Extract route segment between two progress points
   */
  extractRouteSegment(
    route: Polyline,
    startProgress: number,
    endProgress: number
  ): LatLng[] {
    return GeometryUtil.extract(map, route, startProgress, endProgress);
  }

  /**
   * Calculate accumulated distances along route
   */
  getDistanceMarkers(route: LatLng[] | Polyline): number[] {
    return GeometryUtil.accumulatedLengths(route);
  }
}

export const routeGeometry = new RouteGeometryService();
```

**Integration Points:**

**1. Update `LiveDeliveryTracking.tsx`:**

```typescript
// src/components/loads/LiveDeliveryTracking.tsx
import { routeGeometry } from "@/utils/routeGeometry";

function LiveDeliveryTracking({ loadId }: { loadId: string }) {
  const [routeProgress, setRouteProgress] = useState(0);
  const [deviation, setDeviation] = useState(0);

  useEffect(() => {
    if (!vehiclePosition || !plannedRoute) return;

    // Calculate progress
    const progress = routeGeometry.calculateProgress(
      vehiclePosition,
      plannedRoute
    );
    setRouteProgress(progress);

    // Calculate deviation
    const deviationData = routeGeometry.calculateRouteDeviation(
      vehiclePosition,
      plannedRoute.getLatLngs() as LatLng[]
    );
    setDeviation(deviationData.deviation);

    // Alert if off route
    if (deviationData.isOffRoute) {
      toast({
        title: "Route Deviation Alert",
        description: `Vehicle is ${Math.round(
          deviationData.deviation
        )}m off planned route`,
        variant: "destructive",
      });
    }
  }, [vehiclePosition, plannedRoute]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trip Progress</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between mb-2">
              <span>Progress</span>
              <span className="font-bold">
                {(routeProgress * 100).toFixed(1)}%
              </span>
            </div>
            <Progress value={routeProgress * 100} />
          </div>

          <div className="flex justify-between text-sm">
            <span>Route Deviation:</span>
            <span className={deviation > 500 ? "text-red-500 font-bold" : ""}>
              {routeGeometry.formatDistance(deviation)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

**2. Update `RoutePlanner.tsx`:**

```typescript
// src/components/loads/RoutePlanner.tsx
import { routeGeometry } from "@/utils/routeGeometry";

function RoutePlanner() {
  const [totalDistance, setTotalDistance] = useState<string>("");

  const handleRouteCalculated = (route: LatLng[]) => {
    const distance = routeGeometry.calculateRouteDistance(route);
    setTotalDistance(routeGeometry.formatDistance(distance));

    // Calculate bearing for each segment
    const bearings = route
      .slice(0, -1)
      .map((point, i) => routeGeometry.calculateBearing(point, route[i + 1]));

    // Get waypoint at 50% of route
    const midpoint = routeGeometry.getPositionAtProgress(route, 0.5);
  };
}
```

**3. Update `useWialonLoadIntegration.ts`:**

```typescript
// src/hooks/useWialonLoadIntegration.ts
import { routeGeometry } from "@/utils/routeGeometry";

export function useWialonLoadIntegration(loadId: string) {
  useEffect(() => {
    if (!vehicleLocation || !plannedRoute) return;

    const vehiclePos = new LatLng(
      vehicleLocation.latitude,
      vehicleLocation.longitude
    );

    // Calculate progress
    const progress = routeGeometry.calculateProgress(vehiclePos, plannedRoute);

    // Calculate total and remaining distance
    const totalDistance = routeGeometry.calculateRouteDistance(plannedRoute);
    const remainingDistance = totalDistance * (1 - progress);

    // Update load with progress data
    updateLoad({
      progress_percentage: Math.round(progress * 100),
      remaining_distance_km: remainingDistance / 1000,
    });
  }, [vehicleLocation, plannedRoute]);
}
```

**Testing Checklist:**

- [ ] Distance calculations match Google Maps within 5%
- [ ] Progress percentage updates correctly
- [ ] Route deviation alerts trigger at 500m
- [ ] Works with 100+ point routes without lag
- [ ] Bearing calculations are accurate

---

### Phase 2: Geocoding Integration (Week 2) - HIGH PRIORITY

**Goal:** Add address search and reverse geocoding

**Packages:** `leaflet-geosearch`, `esri-leaflet-geocoder`

**Implementation:**

```typescript
// src/utils/geocoding.ts
import { GeoSearchControl, OpenStreetMapProvider } from "leaflet-geosearch";
import { GeocodeService } from "esri-leaflet-geocoder";
import "leaflet-geosearch/dist/geosearch.css";

export class GeocodingService {
  private osmProvider = new OpenStreetMapProvider();
  private esriGeocoder = GeocodeService.geocodeService({
    apikey: import.meta.env.VITE_ESRI_API_KEY,
  });

  /**
   * Search for address using OpenStreetMap
   */
  async searchAddress(query: string): Promise<
    Array<{
      label: string;
      x: number;
      y: number;
      bounds: [[number, number], [number, number]];
    }>
  > {
    const results = await this.osmProvider.search({ query });
    return results;
  }

  /**
   * Reverse geocode coordinates to address
   */
  async reverseGeocode(lat: number, lng: number): Promise<string> {
    return new Promise((resolve, reject) => {
      this.esriGeocoder
        .reverse()
        .latlng([lat, lng])
        .run((error, result) => {
          if (error) {
            reject(error);
            return;
          }
          resolve(result.address?.Match_addr || "Unknown location");
        });
    });
  }

  /**
   * Batch reverse geocode multiple coordinates
   */
  async batchReverseGeocode(
    coordinates: Array<{ lat: number; lng: number }>
  ): Promise<Array<{ lat: number; lng: number; address: string }>> {
    const results = await Promise.allSettled(
      coordinates.map((coord) => this.reverseGeocode(coord.lat, coord.lng))
    );

    return results.map((result, index) => ({
      ...coordinates[index],
      address: result.status === "fulfilled" ? result.value : "Unknown",
    }));
  }

  /**
   * Create search control for map
   */
  createSearchControl(): GeoSearchControl {
    return new GeoSearchControl({
      provider: this.osmProvider,
      style: "bar",
      showMarker: true,
      showPopup: false,
      autoClose: true,
      retainZoomLevel: false,
      animateZoom: true,
      keepResult: false,
      searchLabel: "Enter address",
    });
  }
}

export const geocoding = new GeocodingService();
```

**Integration Points:**

**1. Update `LocationSelector.tsx`:**

```typescript
// src/components/loads/LocationSelector.tsx
import { geocoding } from "@/utils/geocoding";
import { useState } from "react";

export function LocationSelector({
  onLocationSelect,
}: {
  onLocationSelect: (location: {
    lat: number;
    lng: number;
    address: string;
  }) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<Array<any>>([]);

  const handleSearch = async () => {
    const searchResults = await geocoding.searchAddress(searchQuery);
    setResults(searchResults);
  };

  const handleSelect = async (result: any) => {
    onLocationSelect({
      lat: result.y,
      lng: result.x,
      address: result.label,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search address..."
        />
        <Button onClick={handleSearch}>Search</Button>
      </div>

      {results.length > 0 && (
        <div className="border rounded-md p-2 max-h-60 overflow-y-auto">
          {results.map((result, index) => (
            <button
              key={index}
              className="w-full text-left p-2 hover:bg-gray-100"
              onClick={() => handleSelect(result)}
            >
              {result.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

**2. Update `UnifiedMapView.tsx`:**

```typescript
// src/components/UnifiedMapView.tsx
import { geocoding } from "@/utils/geocoding";
import { useMap } from "react-leaflet";

function MapSearchControl() {
  const map = useMap();

  useEffect(() => {
    const searchControl = geocoding.createSearchControl();
    map.addControl(searchControl);

    return () => {
      map.removeControl(searchControl);
    };
  }, [map]);

  return null;
}

// In UnifiedMapView component:
<MapContainer>
  <MapSearchControl />
  {/* other components */}
</MapContainer>;
```

**3. Add reverse geocoding for geofence events:**

```typescript
// src/hooks/useGeofenceNotifications.ts
import { geocoding } from "@/utils/geocoding";

export function useGeofenceNotifications() {
  const handleGeofenceEntry = async (event: GeofenceEvent) => {
    // Get address for event location
    const address = await geocoding.reverseGeocode(
      event.latitude,
      event.longitude
    );

    toast({
      title: "Geofence Entry",
      description: `Vehicle entered ${event.geofence_name} at ${address}`,
    });
  };
}
```

**Testing Checklist:**

- [ ] Address search returns relevant results
- [ ] Reverse geocoding works for SA locations
- [ ] Map search control displays correctly
- [ ] Batch geocoding handles 50+ coordinates
- [ ] ESRI API quota not exceeded

---

### Phase 3: Measurement Tools (Week 3) - MEDIUM PRIORITY

**Goal:** Add distance/area measurement tools to maps

**Package:** `leaflet-measure`

**Implementation:**

```typescript
// src/components/map/MeasurementControl.tsx
import "leaflet-measure";
import "leaflet-measure/dist/leaflet-measure.css";
import { useMap } from "react-leaflet";
import { useEffect } from "react";
import L from "leaflet";

export function MeasurementControl() {
  const map = useMap();

  useEffect(() => {
    const measureControl = (L.control as any).measure({
      position: "topleft",
      primaryLengthUnit: "kilometers",
      secondaryLengthUnit: "meters",
      primaryAreaUnit: "sqmeters",
      activeColor: "#ff0000",
      completedColor: "#00ff00",
    });

    measureControl.addTo(map);

    return () => {
      map.removeControl(measureControl);
    };
  }, [map]);

  return null;
}
```

**Integration:**

```typescript
// Add to UnifiedMapView.tsx, GPSTracking.tsx
import { MeasurementControl } from "@/components/map/MeasurementControl";

<MapContainer>
  <MeasurementControl />
  {/* other components */}
</MapContainer>;
```

**Testing Checklist:**

- [ ] Distance measurement tool works
- [ ] Area measurement tool works
- [ ] Units display correctly (km, m)
- [ ] Control doesn't interfere with other map interactions

---

### Phase 4: Advanced Geofencing (Week 4) - MEDIUM PRIORITY

**Goal:** Enhanced geofence features using geometryutil

**Implementation:**

```typescript
// src/utils/advancedGeofencing.ts
import GeometryUtil from "leaflet-geometryutil";
import { LatLng, Layer } from "leaflet";

export class AdvancedGeofencingService {
  /**
   * Find all geofences within radius of vehicle
   */
  findNearbyGeofences(
    vehiclePosition: LatLng,
    geofences: Layer[],
    radiusMeters: number = 5000
  ): Array<{ geofence: Layer; distance: number }> {
    return GeometryUtil.layersWithin(
      map,
      geofences,
      vehiclePosition,
      radiusMeters
    );
  }

  /**
   * Get N closest geofences to vehicle
   */
  getClosestGeofences(
    vehiclePosition: LatLng,
    geofences: Layer[],
    count: number = 5
  ): Array<{ geofence: Layer; distance: number }> | null {
    return GeometryUtil.nClosestLayers(map, geofences, vehiclePosition, count);
  }

  /**
   * Calculate ETA to geofence
   */
  calculateGeofenceETA(
    vehiclePosition: LatLng,
    geofencePosition: LatLng,
    currentSpeed: number // km/h
  ): { distance: number; eta: number; readableETA: string } {
    const distance = GeometryUtil.distance(
      map,
      vehiclePosition,
      geofencePosition
    );
    const etaHours = distance / (currentSpeed * 1000); // Convert to hours
    const etaMinutes = Math.round(etaHours * 60);

    return {
      distance,
      eta: etaMinutes,
      readableETA:
        etaMinutes < 60
          ? `${etaMinutes} min`
          : `${(etaMinutes / 60).toFixed(1)} hrs`,
    };
  }

  /**
   * Predict if vehicle will enter geofence based on heading
   */
  predictGeofenceEntry(
    vehiclePosition: LatLng,
    vehicleHeading: number,
    vehicleSpeed: number, // km/h
    geofenceCenter: LatLng,
    geofenceRadius: number
  ): { willEnter: boolean; eta: number | null } {
    // Calculate destination in 1 hour at current heading
    const futurePosition = GeometryUtil.destination(
      vehiclePosition,
      vehicleHeading,
      vehicleSpeed * 1000 // Convert to meters
    );

    // Check if future position is within geofence
    const distanceToGeofence = GeometryUtil.distance(
      map,
      futurePosition,
      geofenceCenter
    );

    if (distanceToGeofence <= geofenceRadius) {
      const currentDistance = GeometryUtil.distance(
        map,
        vehiclePosition,
        geofenceCenter
      );
      const eta = (currentDistance / (vehicleSpeed * 1000)) * 60; // minutes
      return { willEnter: true, eta: Math.round(eta) };
    }

    return { willEnter: false, eta: null };
  }
}

export const advancedGeofencing = new AdvancedGeofencingService();
```

**Integration with `useGeofenceTracking.ts`:**

```typescript
// src/hooks/useGeofenceTracking.ts
import { advancedGeofencing } from "@/utils/advancedGeofencing";

export function useGeofenceTracking() {
  useEffect(() => {
    if (!vehicleLocation) return;

    const vehiclePos = new LatLng(
      vehicleLocation.latitude,
      vehicleLocation.longitude
    );

    // Find nearby geofences
    const nearby = advancedGeofencing.findNearbyGeofences(
      vehiclePos,
      activeGeofences,
      5000 // 5km
    );

    // Calculate ETA to each nearby geofence
    nearby.forEach(({ geofence, distance }) => {
      const eta = advancedGeofencing.calculateGeofenceETA(
        vehiclePos,
        geofence.getLatLng(),
        vehicleLocation.speed
      );

      if (eta.eta <= 10) {
        toast({
          title: "Approaching Geofence",
          description: `${geofence.options.name} - ETA: ${eta.readableETA}`,
        });
      }
    });

    // Predict geofence entries
    const prediction = advancedGeofencing.predictGeofenceEntry(
      vehiclePos,
      vehicleLocation.heading,
      vehicleLocation.speed,
      deliveryGeofence.getLatLng(),
      deliveryGeofence.getRadius()
    );

    if (prediction.willEnter && prediction.eta) {
      console.log(
        `Vehicle will enter delivery area in ${prediction.eta} minutes`
      );
    }
  }, [vehicleLocation]);
}
```

**Testing Checklist:**

- [ ] Nearby geofence detection works
- [ ] ETA calculations are accurate
- [ ] Geofence entry prediction works
- [ ] Notifications don't spam user

---

### Phase 5: Driver Behavior Analysis (Week 5-6) - LOW PRIORITY

**Goal:** Analyze driving patterns using geometry calculations

**Implementation:**

```typescript
// src/utils/driverBehaviorAnalysis.ts
import GeometryUtil from "leaflet-geometryutil";
import { LatLng } from "leaflet";

interface TrackPoint extends LatLng {
  timestamp: number;
  speed: number;
}

export class DriverBehaviorAnalyzer {
  /**
   * Analyze route for harsh cornering
   */
  detectHarshCorners(trackPoints: TrackPoint[]): Array<{
    position: LatLng;
    angle: number;
    severity: "mild" | "moderate" | "harsh";
    timestamp: number;
  }> {
    const corners = [];

    for (let i = 1; i < trackPoints.length - 1; i++) {
      const angle = GeometryUtil.angle(
        map,
        trackPoints[i - 1],
        trackPoints[i + 1]
      );

      const absDegrees = Math.abs(angle);

      if (absDegrees > 30) {
        corners.push({
          position: trackPoints[i],
          angle: absDegrees,
          severity:
            absDegrees > 60 ? "harsh" : absDegrees > 45 ? "moderate" : "mild",
          timestamp: trackPoints[i].timestamp,
        });
      }
    }

    return corners;
  }

  /**
   * Calculate route smoothness score (0-100)
   */
  calculateSmoothness(trackPoints: TrackPoint[]): number {
    if (trackPoints.length < 3) return 100;

    const angles = [];
    for (let i = 1; i < trackPoints.length - 1; i++) {
      const angle = Math.abs(
        GeometryUtil.angle(map, trackPoints[i - 1], trackPoints[i + 1])
      );
      angles.push(angle);
    }

    const avgAngle = angles.reduce((sum, a) => sum + a, 0) / angles.length;
    const smoothness = Math.max(0, 100 - avgAngle);

    return Math.round(smoothness);
  }

  /**
   * Detect speeding events
   */
  detectSpeedingEvents(
    trackPoints: TrackPoint[],
    speedLimit: number
  ): Array<{
    start: LatLng;
    end: LatLng;
    maxSpeed: number;
    duration: number;
  }> {
    const events = [];
    let currentEvent: any = null;

    trackPoints.forEach((point, index) => {
      if (point.speed > speedLimit) {
        if (!currentEvent) {
          currentEvent = {
            start: point,
            startIndex: index,
            maxSpeed: point.speed,
          };
        } else {
          currentEvent.maxSpeed = Math.max(currentEvent.maxSpeed, point.speed);
        }
      } else if (currentEvent) {
        events.push({
          start: currentEvent.start,
          end: trackPoints[index - 1],
          maxSpeed: currentEvent.maxSpeed,
          duration:
            trackPoints[index - 1].timestamp - currentEvent.start.timestamp,
        });
        currentEvent = null;
      }
    });

    return events;
  }

  /**
   * Calculate overall driver score
   */
  calculateDriverScore(
    trackPoints: TrackPoint[],
    speedLimit: number
  ): {
    score: number;
    smoothness: number;
    harshCorners: number;
    speedingEvents: number;
    breakdown: { category: string; points: number }[];
  } {
    const smoothness = this.calculateSmoothness(trackPoints);
    const corners = this.detectHarshCorners(trackPoints);
    const speeding = this.detectSpeedingEvents(trackPoints, speedLimit);

    // Scoring system
    let score = 100;
    const breakdown = [];

    // Smoothness (40 points max)
    const smoothnessPoints = (smoothness / 100) * 40;
    breakdown.push({ category: "Route Smoothness", points: smoothnessPoints });

    // Harsh corners penalty (30 points max)
    const cornerPenalty = Math.min(30, corners.length * 5);
    breakdown.push({ category: "Cornering", points: 30 - cornerPenalty });

    // Speeding penalty (30 points max)
    const speedingPenalty = Math.min(30, speeding.length * 10);
    breakdown.push({
      category: "Speed Compliance",
      points: 30 - speedingPenalty,
    });

    score = smoothnessPoints + (30 - cornerPenalty) + (30 - speedingPenalty);

    return {
      score: Math.round(score),
      smoothness,
      harshCorners: corners.length,
      speedingEvents: speeding.length,
      breakdown,
    };
  }
}

export const driverAnalyzer = new DriverBehaviorAnalyzer();
```

**Integration with `useDriverBehaviorEvents.ts`:**

```typescript
// src/hooks/useDriverBehaviorEvents.ts
import { driverAnalyzer } from "@/utils/driverBehaviorAnalysis";

export function useDriverBehaviorAnalysis(tripId: string) {
  const analyzeTrip = async () => {
    // Fetch trip track points
    const { data: trackPoints } = await supabase
      .from("trip_tracking")
      .select("*")
      .eq("trip_id", tripId)
      .order("timestamp");

    if (!trackPoints) return;

    // Analyze driving behavior
    const analysis = driverAnalyzer.calculateDriverScore(
      trackPoints as TrackPoint[],
      120 // 120 km/h speed limit
    );

    // Save analysis results
    await supabase.from("driver_behavior_analysis").insert({
      trip_id: tripId,
      driver_score: analysis.score,
      smoothness_score: analysis.smoothness,
      harsh_corners_count: analysis.harshCorners,
      speeding_events_count: analysis.speedingEvents,
      breakdown: analysis.breakdown,
    });

    return analysis;
  };

  return { analyzeTrip };
}
```

**Testing Checklist:**

- [ ] Harsh corner detection is accurate
- [ ] Smoothness calculation is consistent
- [ ] Speeding events detected correctly
- [ ] Driver score is fair and motivating

---

## Summary of All Leaflet Enhancements

### Installed Packages:

```json
{
  "leaflet": "1.9.4",
  "react-leaflet": "^4.2.1",
  "leaflet-geometryutil": "^0.10.3",
  "leaflet-geosearch": "^4.0.0",
  "leaflet-measure": "^3.1.0",
  "leaflet-routing-machine": "^3.2.12", // TO BE REMOVED
  "esri-leaflet-geocoder": "^3.1.4"
}
```

### Implementation Timeline:

| Phase | Week     | Priority | Features                                    | Status     |
| ----- | -------- | -------- | ------------------------------------------- | ---------- |
| 1     | Week 1   | HIGH     | Route geometry utilities, progress tracking | ⏳ Pending |
| 2     | Week 2   | HIGH     | Geocoding, address search                   | ⏳ Pending |
| 3     | Week 3   | MEDIUM   | Measurement tools                           | ⏳ Pending |
| 4     | Week 4   | MEDIUM   | Advanced geofencing                         | ⏳ Pending |
| 5     | Week 5-6 | LOW      | Driver behavior analysis                    | ⏳ Pending |

### Benefits After Full Implementation:

**Route Management:**

- ✅ Accurate distance calculations
- ✅ Real-time progress tracking (percentage complete)
- ✅ Route deviation monitoring and alerts
- ✅ Bearing and heading calculations
- ✅ Route segment extraction

**Location Services:**

- ✅ Address search functionality
- ✅ Reverse geocoding for coordinates
- ✅ Batch geocoding for reports
- ✅ Map search control integration

**Geofencing:**

- ✅ Proximity detection (vehicles near geofences)
- ✅ ETA calculations to geofence
- ✅ Predictive entry detection
- ✅ Multi-geofence monitoring

**Analytics:**

- ✅ Driver behavior scoring
- ✅ Harsh cornering detection
- ✅ Route smoothness analysis
- ✅ Speeding event tracking

**User Experience:**

- ✅ Interactive measurement tools
- ✅ Search-as-you-type address lookup
- ✅ Visual progress indicators
- ✅ Real-time deviation alerts

### Migration from leaflet-routing-machine:

**Before (OLD):**

```typescript
import "leaflet-routing-machine";

L.Routing.control({
  waypoints: [start, end],
}).addTo(map);
```

**After (NEW):**

```typescript
import { routeGeometry } from "@/utils/routeGeometry";

// Fetch route from OpenRouteService
const route = await fetchRoute(start, end);

// Calculate distance
const distance = routeGeometry.calculateRouteDistance(route);

// Track progress
const progress = routeGeometry.calculateProgress(vehiclePos, route);
```

**Action Required:** HIGH PRIORITY

- [ ] Phase 1: Implement RouteGeometryService (Week 1)
- [ ] Phase 1: Update LiveDeliveryTracking with progress tracking
- [ ] Phase 1: Update RoutePlanner with distance calculations
- [ ] Phase 2: Implement GeocodingService (Week 2)
- [ ] Phase 2: Add address search to LocationSelector
- [ ] Phase 2: Add reverse geocoding to geofence events
- [ ] Phase 3: Add measurement control to maps (Week 3)
- [ ] Phase 4: Implement advanced geofencing (Week 4)
- [ ] Phase 5: Implement driver behavior analysis (Week 5-6)
- [ ] Remove leaflet-routing-machine dependency after Phase 1 complete
- [ ] Update documentation with new patterns

#### Issue 3.4.4: Map Marker Performance

**Severity:** MEDIUM
**Impact:** Slow rendering with 100+ vehicles

**Current Implementation:**

```typescript
// UnifiedMapView.tsx - Renders all vehicles
{
  vehicleLocations.map((vehicle) => (
    <Marker
      key={vehicle.vehicleId}
      position={[vehicle.latitude, vehicle.longitude]}
    >
      <Popup>{vehicle.vehicleName}</Popup>
    </Marker>
  ));
}
```

**Problem:**

- 100 vehicles = 100 DOM elements
- Each marker has popup (200 elements)
- Re-renders on every position update

**Performance Metrics:**

- < 50 markers: No issue
- 50-100 markers: Slight lag
- 100+ markers: Noticeable delay

**Mitigation Strategies:**

**Option 1: Marker Clustering**

```typescript
import MarkerClusterGroup from "react-leaflet-cluster";

<MarkerClusterGroup>
  {vehicleLocations.map((vehicle) => (
    <Marker
      key={vehicle.vehicleId}
      position={[vehicle.latitude, vehicle.longitude]}
    />
  ))}
</MarkerClusterGroup>;
```

**Option 2: Virtualization**

```typescript
// Only render markers in viewport
const bounds = map.getBounds();
const visibleVehicles = vehicleLocations.filter((v) =>
  bounds.contains([v.latitude, v.longitude])
);
```

**Option 3: Canvas Renderer**

```typescript
// Use Canvas instead of SVG for better performance
import L from "leaflet";

const canvasRenderer = L.canvas();

<Marker position={[lat, lng]} renderer={canvasRenderer} />;
```

**Action Required:** MEDIUM PRIORITY

- [ ] Install react-leaflet-cluster
- [ ] Implement marker clustering for 50+ vehicles
- [ ] Add viewport-based filtering
- [ ] Test performance with 500+ vehicles
- [ ] Monitor frame rate during tracking

### 3.5 CSS Import Issues

**Severity:** LOW
**Impact:** Inconsistent map styling

**Problem:**

```typescript
// Leaflet CSS imported in multiple files
import "leaflet/dist/leaflet.css"; // main.tsx
import "leaflet/dist/leaflet.css"; // RoutePlanner.tsx
import "leaflet/dist/leaflet.css"; // EnhancedTrackVisualization.tsx
import "leaflet/dist/leaflet.css"; // VehicleMap.tsx
```

**Issues:**

- Duplicate CSS imports
- Increases bundle size
- Potential style conflicts

**Mitigation:**

```typescript
// Import once in main.tsx only
// Remove from all other component files

// main.tsx
import "leaflet/dist/leaflet.css";

// Other components - remove import
// import 'leaflet/dist/leaflet.css';  // ❌ Remove
```

**Action Required:** LOW PRIORITY

- [ ] Remove duplicate Leaflet CSS imports
- [ ] Keep import in main.tsx only
- [ ] Verify map styles still work

### 3.6 Recommendations

**Immediate Actions:**

1. ✅ Remove duplicate @types/leaflet
2. ✅ Remove duplicate CSS imports
3. ✅ Test map performance with 100+ markers

**Short-term Actions:**

1. ✅ Implement marker clustering
2. ✅ Evaluate leaflet-routing-machine replacement
3. ✅ Add performance monitoring

**Long-term Actions:**

1. ✅ Consider migration to MapBox GL JS (better performance)
2. ✅ Document SSR limitations for future reference

---

## 4. RADIX UI INTEGRATION

### 4.1 Overview

**Packages:** 20+ Radix UI primitives
**Purpose:** Accessible, unstyled UI components
**Usage:** Entire shadcn/ui component library

### 4.2 Compatibility Assessment

✅ **FULLY COMPATIBLE** - No issues identified

**Current Versions:**
All Radix packages using latest stable (v1.x, v2.x)

**Benefits:**

- Excellent TypeScript support
- Regular updates
- No breaking changes in minor versions
- Well-maintained by Modulz team

### 4.3 Potential Future Issues

**Issue 4.3.1: Major Version Upgrades**

**Severity:** LOW (Future risk)
**Impact:** Breaking changes in v3.x (when released)

**Current State:**

```json
{
  "@radix-ui/react-dialog": "^1.1.14",
  "@radix-ui/react-dropdown-menu": "^2.1.15",
  "@radix-ui/react-popover": "^1.1.14"
}
```

**Note:** Some packages on v1.x, some on v2.x (intentional)

**Mitigation:**

- Use caret ranges (^) to get patch/minor updates
- Test before upgrading to major versions
- Review shadcn/ui changelogs before upgrading

**Action Required:** NO IMMEDIATE ACTION

- [ ] Subscribe to Radix UI changelog
- [ ] Test shadcn/ui updates in staging first

### 4.4 Recommendations

**Best Practices:**

1. ✅ Keep Radix packages updated (minor/patch)
2. ✅ Don't edit shadcn/ui components directly
3. ✅ Create custom components by composing Radix primitives
4. ✅ Test accessibility with screen readers

---

## 5. TANSTACK QUERY (REACT QUERY) INTEGRATION

### 5.1 Overview

**Package:** `@tanstack/react-query@^5.83.0`
**Purpose:** Data fetching, caching, synchronization
**Usage:** All API calls, real-time data management

### 5.2 Compatibility Assessment

✅ **FULLY COMPATIBLE** - Excellent implementation

### 5.3 Current Implementation

```typescript
// Standard pattern
const { data, isLoading, refetch } = useQuery({
  queryKey: ["vehicles", filter],
  queryFn: async () => {
    const { data, error } = await supabase.from("vehicles").select("*");
    if (error) throw error;
    return data;
  },
});
```

### 5.4 Best Practices Verification

✅ **Query Keys:** Properly structured with dependencies
✅ **Error Handling:** Errors thrown correctly
✅ **Cache Invalidation:** Using invalidateQueries
✅ **Mutations:** Properly implemented with optimistic updates

### 5.5 Potential Optimization

**Issue 5.5.1: Global Query Configuration**

**Severity:** LOW
**Impact:** Inconsistent retry/refetch behavior

**Current State:**
No global QueryClient configuration found

**Recommended:**

```typescript
// src/App.tsx or main.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false, // Disable for GPS data (too frequent)
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
    },
  },
});

<QueryClientProvider client={queryClient}>
  <App />
</QueryClientProvider>;
```

**Action Required:** LOW PRIORITY

- [ ] Add global QueryClient configuration
- [ ] Set appropriate staleTime for different query types
- [ ] Configure retry logic
- [ ] Add React Query DevTools in development

### 5.6 Recommendations

**Immediate Actions:**

1. ✅ Add global QueryClient configuration
2. ✅ Install React Query DevTools for debugging

**Best Practices:**

1. ✅ Keep using structured query keys
2. ✅ Maintain proper error boundaries
3. ✅ Use mutations for writes, queries for reads

---

## 6. AWS SDK (S3) INTEGRATION

### 6.1 Overview

**Package:** `@aws-sdk/client-s3@^3.919.0`
**Purpose:** File storage (presumably for images, documents)
**Usage:** **UNKNOWN - Not found in codebase**

### 6.2 Compatibility Assessment

⚠️ **UNUSED DEPENDENCY** - Consider removing

### 6.3 Analysis

**Problem:**

```bash
# grep search for @aws-sdk usage
Result: No matches found
```

**Package installed but never imported or used**

### 6.4 Recommendations

**Option 1: Remove Unused Dependency**

```bash
npm uninstall @aws-sdk/client-s3
```

**Benefits:**

- Reduce bundle size (~200KB)
- Faster installation
- Fewer security vulnerabilities to monitor

**Option 2: Verify and Implement if Needed**

If S3 storage was planned but not implemented:

```typescript
// src/utils/s3-storage.ts
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  region: import.meta.env.VITE_SUPABASE_S3_REGION,
  credentials: {
    accessKeyId: import.meta.env.VITE_SUPABASE_S3_ACCESS_KEY_ID,
    secretAccessKey: import.meta.env.VITE_SUPABASE_S3_SECRET_ACCESS_KEY,
  },
  endpoint: import.meta.env.VITE_SUPABASE_S3_ENDPOINT,
});

export async function uploadFile(file: File, key: string) {
  const command = new PutObjectCommand({
    Bucket: "fleet-management-docs",
    Key: key,
    Body: file,
    ContentType: file.type,
  });

  return s3Client.send(command);
}
```

**Note:** Supabase has built-in Storage that might be better suited

**Action Required:** LOW PRIORITY

- [ ] Determine if S3 storage is needed
- [ ] If yes, implement storage utility
- [ ] If no, remove @aws-sdk/client-s3 package
- [ ] Consider using Supabase Storage instead

---

## 7. DENO RUNTIME (EDGE FUNCTIONS)

### 7.1 Overview

**Runtime:** Deno (for Supabase Edge Functions)
**Purpose:** Serverless functions for backend logic
**Usage:** 9 Edge Functions

### 7.2 Compatibility Assessment

✅ **COMPATIBLE** - Minor version pinning needed

### 7.3 Current Implementation

```typescript
// Various Edge Functions using different Deno versions
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// No consistent version across functions
```

### 7.4 Issues

**Issue 7.4.1: Inconsistent Deno Standard Library Versions**

**Severity:** LOW
**Impact:** Potential API differences between functions

**Current State:**

```typescript
// Different versions used
"https://deno.land/std@0.168.0"; // wialon-proxy
"https://esm.sh/@supabase/supabase-js@2.58.0"; // quick-task
"https://esm.sh/@supabase/supabase-js@2.38.0"; // maintenance-scheduler
```

**Mitigation:**

```typescript
// Standardize on latest stable Deno version
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

// Update all Edge Functions to use same version
// - wialon-proxy/index.ts
// - quick-task/index.ts
// - maintenance-scheduler/index.ts
// - get-wialon-token/index.ts
// - import-trips-from-webhook/index.ts
// - send-maintenance-notification/index.ts
// - import-driver-behavior-webhook/index.ts
// - wialon-alerts/wialon-alert.ts
// - assign-load/index.ts
```

**Action Required:** LOW PRIORITY

- [ ] Update all Edge Functions to Deno std@0.224.0
- [ ] Test each function after update
- [ ] Document Deno version in README

**Issue 7.4.2: Missing Environment Variable Validation**

**Severity:** MEDIUM
**Impact:** Runtime errors if env vars not set

**Current Implementation:**

```typescript
const WIALON_HOST = Deno.env.get("WIALON_HOST") || "https://hst-api.wialon.eu";
const WIALON_TOKEN = Deno.env.get("WIALON_TOKEN") || ""; // Empty string fallback
```

**Problem:** Silent failures when env vars missing

**Mitigation:**

```typescript
// Validate environment variables on function startup
function getRequiredEnv(key: string): string {
  const value = Deno.env.get(key);
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

// Usage
const WIALON_HOST = getRequiredEnv("WIALON_HOST");
const WIALON_TOKEN = getRequiredEnv("WIALON_TOKEN");
```

**Action Required:** MEDIUM PRIORITY

- [ ] Add environment variable validation
- [ ] Create shared validation utility
- [ ] Document required env vars per function

### 7.5 Recommendations

**Immediate Actions:**

1. ✅ Standardize Deno versions across Edge Functions
2. ✅ Add environment variable validation

**Best Practices:**

1. ✅ Pin Deno version for reproducibility
2. ✅ Use `deno.lock` for dependency locking
3. ✅ Test Edge Functions locally before deploying

---

## 8. ADDITIONAL DEPENDENCIES REVIEW

### 8.1 Date Libraries

**Packages:** `date-fns@^3.6.0`
**Status:** ✅ Compatible
**Note:** Latest stable version, tree-shakeable

### 8.2 Form Libraries

**Packages:** `react-hook-form@^7.61.1`, `zod@^3.25.76`
**Status:** ✅ Compatible
**Note:** Excellent combo, no issues

### 8.3 Chart Libraries

**Packages:** `recharts@^2.15.4`
**Status:** ✅ Compatible
**Note:** Well-maintained, React 18 compatible

### 8.4 QR Code Libraries

**Packages:**

- `html5-qrcode@^2.3.8`
- `qr-code-styling@^1.9.2`
- `qrcode.react@^4.2.0`
- `react-qr-code@^2.0.18`

**Status:** ⚠️ Too many QR libraries

**Issue:** 4 different QR code libraries installed

**Recommendation:**

```typescript
// Consolidate to 2 libraries:
// 1. react-qr-code (generation) - Keep
// 2. html5-qrcode (scanning) - Keep
// Remove: qr-code-styling, qrcode.react

npm uninstall qr-code-styling qrcode.react
```

**Action Required:** LOW PRIORITY

- [ ] Audit QR code usage in codebase
- [ ] Remove unused libraries
- [ ] Standardize on react-qr-code + html5-qrcode

### 8.5 PDF Libraries

**Packages:** `jspdf@^3.0.3`, `jspdf-autotable@^5.0.2`
**Status:** ✅ Compatible
**Note:** Latest versions, good for report generation

### 8.6 Excel Libraries

**Packages:** `xlsx@^0.18.5`
**Status:** ✅ Compatible
**Note:** Industry standard for spreadsheet export

---

## 9. SECURITY CONSIDERATIONS

### 9.1 Environment Variables

**Critical Secrets:**

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=  # Most sensitive
VITE_WIALON_TOKEN=
WIALON_TOKEN=
RESEND_API_KEY=
OPENAI_API_KEY=
```

**Issues:**

**Issue 9.1.1: Service Role Key Exposure Risk**

**Severity:** HIGH
**Impact:** Full database access if leaked

**Current Usage:**

```typescript
// Edge Functions use service role key
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
```

**Mitigation:**

1. ✅ Never commit .env files to Git
2. ✅ Use different keys per environment (dev/staging/prod)
3. ✅ Rotate keys regularly (quarterly)
4. ✅ Monitor usage in Supabase dashboard
5. ✅ Implement IP restrictions if possible

**Action Required:** HIGH PRIORITY

- [ ] Verify .env in .gitignore
- [ ] Audit Git history for exposed secrets
- [ ] Rotate all API keys
- [ ] Set up secret scanning (GitHub Secret Scanning)

**Issue 9.1.2: Frontend Environment Variable Exposure**

**Severity:** MEDIUM
**Impact:** VITE\_ prefixed vars are exposed in client bundle

**Problem:**

```typescript
VITE_WIALON_TOKEN = abc123; // ⚠️ Visible in browser
```

**Mitigation:**

```typescript
// Move sensitive operations to Edge Functions
// Frontend should call Edge Function, not use token directly

// ❌ Bad - Token in frontend
const response = await fetch(`${WIALON_HOST}?token=${VITE_WIALON_TOKEN}`);

// ✅ Good - Token in Edge Function
const response = await fetch("/functions/v1/wialon-proxy", {
  body: JSON.stringify({ service: "token/login" }),
});
```

**Action Required:** HIGH PRIORITY

- [ ] Audit all VITE\_ variables for sensitive data
- [ ] Move tokens to Edge Functions only
- [ ] Remove VITE_WIALON_TOKEN if possible

### 9.2 Dependency Vulnerabilities

**Current Practice:** npm audit

**Recommendations:**

```bash
# Run security audit
npm audit

# Fix automatically when possible
npm audit fix

# Check for outdated packages
npm outdated

# Use Snyk for continuous monitoring
npx snyk test
```

**Action Required:** LOW PRIORITY

- [ ] Run npm audit weekly
- [ ] Set up automated dependency updates (Dependabot)
- [ ] Monitor security advisories

---

## 10. COMPATIBILITY MATRIX

| Integration    | Current Version | Latest Version | Compatible | Breaking Changes | Update Priority |
| -------------- | --------------- | -------------- | ---------- | ---------------- | --------------- |
| Supabase JS    | 2.79.0          | 2.83.x         | ✅ Yes     | None in 2.x      | Low             |
| Wialon API     | N/A (REST)      | N/A            | ⚠️ Yes\*   | Host mismatch    | Critical        |
| React Leaflet  | 4.2.1           | 4.2.1          | ✅ Yes     | None             | Low             |
| Leaflet        | 1.9.4           | 1.9.4          | ✅ Yes     | None             | Low             |
| Radix UI       | Various         | Latest         | ✅ Yes     | None             | Low             |
| TanStack Query | 5.83.0          | 5.83.x         | ✅ Yes     | None             | Low             |
| React          | 18.3.1          | 18.3.1         | ✅ Yes     | None             | Low             |
| TypeScript     | (Check)         | Latest         | ✅ Yes     | None             | Low             |
| Deno Runtime   | 0.168.0         | 0.224.0        | ✅ Yes     | None             | Medium          |

\* Wialon compatible but requires configuration fixes

---

## 11. ACTION PLAN

### 11.1 Critical Priority (This Week)

- [ ] **Fix Wialon host URL inconsistency** (Issue 2.4.1)

  - Update vite.config.ts to use https://hst-api.wialon.eu
  - Verify environment variables
  - Test GPS tracking

- [ ] **Implement Wialon rate limiting mitigation** (Issue 2.4.3)

  - Audit current API request volume
  - Implement request batching
  - Add adaptive polling
  - Monitor quota usage

- [ ] **Secure environment variables** (Issue 9.1.1, 9.1.2)
  - Verify .env not in Git
  - Rotate API keys
  - Move tokens to Edge Functions

### 11.2 High Priority (Next Sprint)

- [ ] **Standardize Supabase versions** (Issue 1.4.1)

  - Update all Edge Functions to v2.79.0
  - Test authentication flows

- [ ] **Implement Wialon session management** (Issue 2.4.4)

  - Create WialonSession class
  - Add auto-refresh logic
  - Implement retry mechanism

- [ ] **Fix vehicle ID mapping** (Issue 2.5.1)

  - Audit wialon_vehicles table
  - Add validation logic
  - Fix orphaned records

- [ ] **Implement comprehensive Wialon error handling** (Issue 2.4.5)
  - Create WialonError class
  - Add error code mapping
  - Implement retry with backoff

### 11.3 Medium Priority (This Month)

- [ ] **Optimize Leaflet marker performance** (Issue 3.4.4)

  - Install react-leaflet-cluster
  - Test with 100+ markers

- [ ] **Align PostgreSQL versions** (Issue 1.4.2)

  - Check Supabase project version
  - Update config.toml

- [ ] **Add global QueryClient config** (Issue 5.5.1)

  - Configure stale time
  - Set retry logic

- [ ] **Standardize Deno versions** (Issue 7.4.1)

  - Update to std@0.224.0
  - Test all Edge Functions

- [ ] **Add Edge Function env validation** (Issue 7.4.2)
  - Create validation utility
  - Document required vars

### 11.4 Low Priority (This Quarter)

- [ ] **Remove duplicate dependencies** (Issue 3.4.1)

  - Clean up @types/leaflet
  - Remove duplicate CSS imports

- [ ] **Audit QR code libraries** (Issue 8.4)

  - Consolidate to 2 libraries

- [ ] **Evaluate AWS S3 usage** (Issue 6.4)

  - Remove if unused
  - Or implement if needed

- [ ] **Set up dependency monitoring**
  - Configure Dependabot
  - Weekly npm audit

### 11.5 Future Considerations

- [ ] **Evaluate Wialon WebSocket API**

  - Reduce polling overhead
  - Get real-time updates

- [ ] **Consider MapBox GL JS**

  - Better performance than Leaflet
  - Native vector tiles

- [ ] **Implement subscription pooling** (Issue 1.4.3)
  - Create RealtimeContext
  - Reduce WebSocket connections

---

## 12. MONITORING & MAINTENANCE

### 12.1 Ongoing Monitoring

**Weekly:**

- [ ] Check npm audit for vulnerabilities
- [ ] Review Wialon API quota usage
- [ ] Monitor Supabase connection count

**Monthly:**

- [ ] Review dependency updates
- [ ] Check for security advisories
- [ ] Audit environment variable usage

**Quarterly:**

- [ ] Rotate API keys and tokens
- [ ] Update dependencies (minor versions)
- [ ] Review and optimize API usage patterns

### 12.2 Health Checks

**Supabase:**

```sql
-- Check real-time connection count
SELECT count(*) FROM pg_stat_activity
WHERE application_name LIKE '%realtime%';

-- Check database size
SELECT pg_database_size(current_database());
```

**Wialon:**

```typescript
// Check API quota
const quota = await callAPI("core/get_quota_usage", {});
console.log("Wialon API usage:", quota);
```

**Performance:**

```typescript
// Monitor query performance
import { useQueryClient } from "@tanstack/react-query";

const queryClient = useQueryClient();
const queries = queryClient.getQueryCache().getAll();
console.log("Active queries:", queries.length);
```

---

## 13. CONCLUSION

### 13.1 Overall Assessment

The Car Craft Co Fleet Management System has a **generally compatible and well-architected** third-party integration setup. However, several critical issues require immediate attention:

**Strengths:**

- ✅ Modern, well-maintained libraries
- ✅ Good separation of concerns
- ✅ TypeScript throughout
- ✅ Proper use of React Query for data management

**Critical Issues:**

- 🚨 Wialon API host inconsistency
- 🚨 Wialon rate limiting concerns
- 🚨 Environment variable security

**Medium Concerns:**

- ⚠️ Supabase version mismatches
- ⚠️ Leaflet performance with many markers
- ⚠️ Missing global error handling

### 13.2 Risk Mitigation

By following the action plan in Section 11, all identified issues can be resolved within 4-6 weeks:

- **Week 1:** Critical priority items (Wialon fixes, security)
- **Weeks 2-3:** High priority items (session management, error handling)
- **Weeks 4-6:** Medium/low priority items (optimization, cleanup)

### 13.3 Long-term Sustainability

To maintain integration compatibility long-term:

1. ✅ Establish regular update schedule
2. ✅ Monitor security advisories
3. ✅ Test updates in staging first
4. ✅ Keep documentation current
5. ✅ Implement monitoring and alerting

---

## APPENDIX A: QUICK REFERENCE

### A.1 Critical Environment Variables

```bash
# Supabase
VITE_SUPABASE_URL=https://wxvhkljrbcpcgpgdqhsp.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # Edge Functions only

# Wialon GPS
WIALON_HOST=https://hst-api.wialon.eu  # Use .eu not .com
WIALON_TOKEN=xxx  # Edge Functions only
VITE_WIALON_TOKEN=xxx  # Consider removing

# Optional
RESEND_API_KEY=re_...
OPENAI_API_KEY=sk-...
```

### A.2 Update Commands

```bash
# Update Supabase types
npx supabase gen types typescript --project-id wxvhkljrbcpcgpgdqhsp > src/integrations/supabase/types.ts

# Security audit
npm audit
npm audit fix

# Check outdated
npm outdated

# Update minor versions
npm update

# Update major versions (careful!)
npx npm-check-updates -u
npm install
```

### A.3 Useful Monitoring Queries

```sql
-- Check Supabase connection count
SELECT count(*) FROM pg_stat_activity;

-- Check table sizes
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check RLS policies
SELECT tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public';
```

---

**Document End**

For questions or issues, refer to:

- [Supabase Documentation](https://supabase.com/docs)
- [Wialon Remote API](https://sdk.wialon.com/wiki/en/sidebar/remoteapi/apiref/apiref)
- [React Leaflet Documentation](https://react-leaflet.js.org/)
- [TanStack Query Documentation](https://tanstack.com/query/latest)
