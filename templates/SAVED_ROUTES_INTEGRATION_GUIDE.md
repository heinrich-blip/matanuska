# Saved Routes Integration Guide

## Overview

The **Saved Routes** feature enables route planning with geofences, saving optimized routes as reusable templates, and integrating them into the load management workflow for efficient delivery planning, driver assignment, and progress tracking.

## Components Created

### 1. Database Migration (`supabase/migrations/20250131000001_create_saved_routes_table.sql`)

Creates the `saved_routes` table with:

- **Columns**: name, description, waypoints (JSONB), total_distance_km, estimated_duration_mins, is_template, usage_count, created_by, timestamps
- **RLS Policies**: Authenticated users can view all routes, create their own, update their own or templates, delete their own
- **Indexes**: Optimized for filtering by created_by, is_template, created_at, usage_count, and JSONB waypoints
- **RPC Function**: `increment_route_usage(route_id UUID)` for tracking template usage
- **Sample Data**: Two demo routes (JHB to Cape Town, Durban to PE)

#### To Apply Migration:

```bash
# Option 1: Via Supabase Dashboard SQL Editor
# 1. Go to https://supabase.com/dashboard/project/wxvhkljrbcpcgpgdqhsp/sql/new
# 2. Copy and paste the entire migration SQL
# 3. Click "Run"

# Option 2: Via Supabase CLI (if configured)
supabase db push

# After applying, regenerate types:
npx supabase gen types typescript --project-id wxvhkljrbcpcgpgdqhsp > src/integrations/supabase/types.ts
```

### 2. Custom Hook (`src/hooks/useSavedRoutes.ts`)

Provides complete CRUD operations for saved routes:

```typescript
const {
  routes, // SavedRoute[] - all saved routes
  isLoading, // boolean - loading state
  error, // Error | null
  createRoute, // Mutation to save new route
  updateRoute, // Mutation to update existing route
  deleteRoute, // Mutation to delete route
  isCreating, // boolean - creating state
  isUpdating, // boolean - updating state
  isDeleting, // boolean - deleting state
  loadRouteTemplate, // Function to load and increment usage count
} = useSavedRoutes();
```

**Key Features:**

- Uses React Query for caching and optimistic updates
- Automatically tracks `created_by` (current user ID)
- Toast notifications for success/error states
- Query key: `['saved-routes']` for cache invalidation

### 3. Save Route Dialog (`src/components/loads/SaveRouteDialog.tsx`)

Modal dialog for saving routes from Unified Map View:

- **Inputs**: Route name (required), description (optional)
- **Checkbox**: Mark as reusable template
- **Preview**: Shows waypoint count, total distance, estimated duration
- **Validation**: Requires route name before saving

### 4. Unified Map View Integration (`src/components/UnifiedMapView.tsx`)

**Enhanced Routes Tab with:**

#### Save Route Functionality

- **Save Button**: Green button appears when route has waypoints
- Opens `SaveRouteDialog` with current route data
- Calculates estimated duration (assumes 60 km/h average speed)

#### Load Saved Templates Section

- **Card displaying all saved routes** with:
  - Route name
  - Waypoint count
  - Total distance
  - Usage count (if > 0)
  - "Load" button for each route
- **Loading template** increments usage count via RPC
- **Auto-fits map bounds** to loaded route waypoints

#### Route Planning Metrics

- Total Distance (calculated via Haversine formula)
- Estimated Duration (distance ÷ 60 km/h)
- Waypoint count

## Complete Workflow

### 1. **Create Route from Geofences**

```
1. Go to Unified Map View (Tracking page)
2. Select "Geofences" tab
3. Click "Create Route" button
4. Click geofence markers to add waypoints:
   - 📦 Pickup button - adds as pickup point
   - 🚚 Delivery button - adds as delivery point
   - Default click - adds as stop
5. Switch to "Routes" tab to view route
```

### 2. **Optimize Route**

```
1. In Routes tab with 3+ waypoints
2. Click "Optimize" button
3. Uses nearest-neighbor algorithm to minimize distance
4. Updates waypoint sequence automatically
```

### 3. **Save Route as Template**

```
1. With active route in Routes tab
2. Click green "Save" button
3. In dialog:
   - Enter route name (required)
   - Add description (optional)
   - Check "Save as reusable template" for frequent routes
4. Click "Save Route"
5. Route is stored in database
```

### 4. **Load Saved Route Template**

```
1. In Routes tab, scroll to "Saved Route Templates" section
2. Browse available templates
3. Click "Load" button on desired route
4. Route waypoints populate the map
5. Usage count increments (tracks popularity)
6. Map auto-fits to route bounds
```

### 5. **Use Route for Load Planning** (Next Step - See Below)

```
1. Load route template in Unified Map View
2. Navigate to Loads page
3. Create new load
4. Select "Load from Saved Route" option
5. Origin/destination auto-fill from route waypoints
6. Assign vehicle and driver
7. Track delivery progress using route waypoints
```

## Database Schema

### `saved_routes` Table

| Column                    | Type          | Description                              |
| ------------------------- | ------------- | ---------------------------------------- |
| `id`                      | UUID          | Primary key                              |
| `name`                    | TEXT          | Route name (required)                    |
| `description`             | TEXT          | Optional route description               |
| `waypoints`               | JSONB         | Array of waypoint objects                |
| `total_distance_km`       | NUMERIC(10,2) | Total route distance in kilometers       |
| `estimated_duration_mins` | INTEGER       | Estimated travel time in minutes         |
| `is_template`             | BOOLEAN       | Whether route is reusable template       |
| `usage_count`             | INTEGER       | Number of times template has been loaded |
| `created_by`              | UUID          | User who created the route               |
| `created_at`              | TIMESTAMPTZ   | Creation timestamp                       |
| `updated_at`              | TIMESTAMPTZ   | Last update timestamp                    |

### Waypoint JSONB Structure

```json
{
  "sequence": 0,
  "name": "Johannesburg Depot",
  "address": "Johannesburg Depot",
  "latitude": -26.2041,
  "longitude": 28.0473,
  "type": "pickup",
  "geofence_id": "uuid-or-null"
}
```

**Waypoint Types:**

- `pickup` - Pickup location (📦)
- `delivery` - Delivery location (🚚)
- `stop` - Intermediate stop (🛑)

## Integration with Load Management (Next Phase)

### Required: Enhance CreateLoadDialog

Add route selection to load creation:

```typescript
// In CreateLoadDialog.tsx
import { useSavedRoutes } from "@/hooks/useSavedRoutes";

const CreateLoadDialog = () => {
  const { routes } = useSavedRoutes();
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);

  // Handler to populate origin/destination from route
  const handleLoadRoute = (routeId: string) => {
    const route = routes.find((r) => r.id === routeId);
    if (!route || route.waypoints.length < 2) return;

    const pickupWaypoint =
      route.waypoints.find((wp) => wp.type === "pickup") || route.waypoints[0];
    const deliveryWaypoint =
      route.waypoints.find((wp) => wp.type === "delivery") ||
      route.waypoints[route.waypoints.length - 1];

    // Set form values
    setOriginLatitude(pickupWaypoint.latitude);
    setOriginLongitude(pickupWaypoint.longitude);
    setDestinationLatitude(deliveryWaypoint.latitude);
    setDestinationLongitude(deliveryWaypoint.longitude);
  };

  // Add to form UI:
  // <Select onValueChange={handleLoadRoute}>
  //   <SelectTrigger>
  //     <SelectValue placeholder="Load from saved route" />
  //   </SelectTrigger>
  //   <SelectContent>
  //     {routes.map(route => (
  //       <SelectItem key={route.id} value={route.id}>
  //         {route.name} ({route.total_distance_km} km)
  //       </SelectItem>
  //     ))}
  //   </SelectContent>
  // </Select>
};
```

### Required: Enhance loads Table

Add optional route reference to loads:

```sql
-- Migration: Add route_id to loads table
ALTER TABLE public.loads
ADD COLUMN route_id UUID REFERENCES public.saved_routes(id) ON DELETE SET NULL;

CREATE INDEX idx_loads_route_id ON public.loads(route_id);
```

### Required: Driver Assignment with Recommended Routes

When assigning driver to load with route_id:

```typescript
// In LoadAssignmentDialog.tsx
const { routes } = useSavedRoutes();

const load = useQuery(["load", loadId]);
const recommendedRoute = routes.find((r) => r.id === load.route_id);

// Display recommended route to driver:
// - Total distance
// - Estimated duration
// - Waypoint list
// - Map preview
```

### Required: Delivery Progress Tracking

Track completion of route waypoints:

```typescript
// Create load_waypoint_progress table
CREATE TABLE public.load_waypoint_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  load_id UUID NOT NULL REFERENCES public.loads(id) ON DELETE CASCADE,
  waypoint_sequence INTEGER NOT NULL,
  status TEXT NOT NULL, -- 'pending', 'reached', 'completed'
  reached_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  UNIQUE(load_id, waypoint_sequence)
);

// Update progress in LiveDeliveryTracking component:
// - Show waypoints on map
// - Mark completed waypoints with checkmarks
// - Calculate % complete based on waypoints reached
```

## API Reference

### RPC Functions

#### `increment_route_usage(route_id UUID)`

Increments usage count for a saved route template.

**Usage:**

```typescript
const { error } = await supabase.rpc("increment_route_usage", {
  route_id: "uuid-here",
});
```

**Returns:** void (updates usage_count in saved_routes table)

## Testing Checklist

- [ ] Apply database migration successfully
- [ ] Create route with geofences in Unified Map View
- [ ] Optimize route (3+ waypoints)
- [ ] Save route as template
- [ ] Load saved route template
- [ ] Verify usage count increments
- [ ] Delete own route (success)
- [ ] Attempt to delete other user's route (should fail per RLS)
- [ ] Update own route description
- [ ] Mark route as template
- [ ] View route in Saved Route Templates section
- [ ] Map auto-fits to loaded route bounds

## Troubleshooting

### Route Not Saving

- Check browser console for Supabase errors
- Verify user is authenticated
- Confirm migration was applied
- Check RLS policies allow INSERT for authenticated users

### Usage Count Not Incrementing

- Verify `increment_route_usage` RPC function exists
- Check function has GRANT EXECUTE to authenticated role
- Confirm route ID is valid UUID

### Templates Not Loading

- Check query is returning data: `await supabase.from('saved_routes').select('*')`
- Verify RLS policy allows SELECT for authenticated users
- Confirm routes exist in database

### TypeScript Errors

- Regenerate types after migration:
  ```bash
  npx supabase gen types typescript --project-id wxvhkljrbcpcgpgdqhsp > src/integrations/supabase/types.ts
  ```
- If `saved_routes` table not in types, use type assertion:
  ```typescript
  const { data } = await(supabase as any)
    .from("saved_routes")
    .select("*");
  ```

## Next Steps

1. **Apply Migration**: Run SQL migration to create `saved_routes` table
2. **Test Route Saving**: Create and save a route in Unified Map View
3. **Integrate with Loads**: Add route selection to CreateLoadDialog
4. **Driver Assignment**: Show recommended route when assigning drivers
5. **Progress Tracking**: Implement waypoint completion tracking
6. **Reporting**: Add route usage analytics to dashboards

## File References

- **Migration**: `/workspaces/car-craft-co/supabase/migrations/20250131000001_create_saved_routes_table.sql`
- **Hook**: `/workspaces/car-craft-co/src/hooks/useSavedRoutes.ts`
- **Dialog**: `/workspaces/car-craft-co/src/components/loads/SaveRouteDialog.tsx`
- **Map View**: `/workspaces/car-craft-co/src/components/UnifiedMapView.tsx` (Routes tab)
- **Types**: `/workspaces/car-craft-co/src/integrations/supabase/types.ts` (regenerate after migration)

## Key Architectural Decisions

1. **JSONB for Waypoints**: Flexible schema, allows efficient querying with GIN index
2. **RPC for Usage Count**: Prevents race conditions with atomic increment
3. **RLS Policies**: Users can view all routes but only modify their own (templates can be updated by anyone)
4. **React Query Integration**: Automatic caching, optimistic updates, background refetching
5. **Separation of Concerns**: RouteWaypoint type differs between UnifiedMapView (internal) and useSavedRoutes (database)
6. **Template System**: `is_template` flag enables reusable routes vs. one-time routes

## Performance Considerations

- **GIN Index on waypoints**: Enables fast JSONB queries
- **Indexed Foreign Keys**: route_id in loads table (when added)
- **Query Caching**: React Query caches routes, reduces database calls
- **Lazy Loading**: Only load route templates when Routes tab is active
- **Pagination**: If route count grows large, implement pagination (currently loads all)

---

**Status**: ✅ Database migration ready, components created, integration with Unified Map View complete, load management integration pending
