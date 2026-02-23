# Geofence Naming Conventions for Auto Status Updates

## Overview

The advanced Wialon-Load integration includes automatic load status updates based on geofence events. This guide explains how to configure your geofences to enable this functionality.

## How It Works

When a vehicle enters or exits a geofence, the system:
1. Detects the geofence event via real-time subscription
2. Matches the geofence name against configured patterns
3. Checks if the current load status matches the rule
4. Either automatically updates the status or prompts for confirmation

## Geofence Naming Conventions

To enable automatic status updates, include these keywords in your geofence names:

### Pickup Locations
**Keywords**: `pickup`, `origin`, `loading point`, `collection`

**Auto Status Rules**:
- **Entry** → Changes status from `in_transit` to `arrived_pickup` (automatic)
- **Exit** → Changes status from `arrived_pickup` to `loaded` (requires confirmation)

**Examples**:
- "Customer ABC Pickup Point"
- "Origin Warehouse - Cape Town"
- "Main Loading Bay Pickup"

### Delivery Locations
**Keywords**: `delivery`, `destination`, `drop-off`, `unloading`

**Auto Status Rules**:
- **Entry** → Changes status from `in_transit` to `arrived_delivery` (automatic)
- **Exit** → Changes status from `arrived_delivery` to `delivered` (requires confirmation)

**Examples**:
- "XYZ Company Delivery Address"
- "Final Destination - Johannesburg"
- "Drop-off Point 123"

### Border Crossings
**Keywords**: `border`, `checkpoint`, `customs point`

**Auto Status Rules**:
- **Entry** → Changes status from `in_transit` to `border_crossing` (automatic)

**Examples**:
- "Beitbridge Border Crossing"
- "South Africa - Zimbabwe Border"
- "Lebombo Customs Checkpoint"

### Warehouses
**Keywords**: `warehouse`, `depot`, `hub`, `distribution center`

**Auto Status Rules**:
- **Entry** → Changes status from `in_transit` to `at_warehouse` (automatic)

**Examples**:
- "Main Distribution Warehouse"
- "Regional Depot - Durban"
- "Logistics Hub North"

### Rest Stops
**Keywords**: `rest`, `stop`, `break area`

**Auto Status Rules**:
- Currently tracked for reporting only (no status changes)

**Examples**:
- "Highway Rest Stop 45"
- "Driver Break Area - N1"

## Configuration in Wialon

### Step 1: Create Geofences in Wialon
1. Log into your Wialon account
2. Navigate to **Monitoring** → **Geofences**
3. Click **Create Geofence**
4. Draw the geofence area on the map
5. **Important**: Name the geofence using the keywords above

### Step 2: Enable Geofence Notifications
1. Go to **Notifications** in Wialon
2. Create a new notification for **Geofence In** and **Geofence Out**
3. Select the appropriate geofences
4. Configure to send events to your system

### Step 3: Verify Geofence Events
Events are automatically tracked in the `geofence_events` table with these fields:
```sql
- load_id
- vehicle_id
- geofence_id
- geofence_name
- event_type ('entry' or 'exit')
- timestamp
- location (geography point)
```

## Custom Rules Configuration

You can customize the auto-status rules in the code by modifying `useWialonLoadIntegration.ts`:

```typescript
const customAutoStatusRules: AutoStatusUpdateRule[] = [
  {
    geofenceType: 'pickup',
    eventType: 'entry',
    currentStatus: 'dispatched',  // Change from status
    newStatus: 'arrived_pickup',   // Change to status
    requiresConfirmation: false,   // Auto or manual
  },
  // Add more custom rules...
];
```

### Rule Properties

| Property | Description | Values |
|----------|-------------|--------|
| `geofenceType` | Type of location | `pickup`, `delivery`, `waypoint`, `border`, `warehouse` |
| `eventType` | Trigger event | `entry`, `exit` |
| `currentStatus` | Required current load status | Any valid load status |
| `newStatus` | Target status | Any valid load status |
| `requiresConfirmation` | Require user confirmation | `true`, `false` |

## Confirmation vs Automatic Updates

### Automatic Updates (requiresConfirmation: false)
- Status changes immediately upon geofence event
- Best for: Arrival events, border crossings, warehouse entries
- Example: Vehicle enters delivery geofence → Status changes to "arrived_delivery"

### Manual Confirmation (requiresConfirmation: true)
- System shows alert with confirmation button
- User must click "Confirm" to apply status change
- Best for: Critical state changes, departure events
- Example: Vehicle exits pickup geofence → Alert shows "Change to 'loaded'?" → User confirms

## Best Practices

### 1. Use Clear, Descriptive Names
✅ Good: "Customer ABC Pickup - Warehouse 3"
❌ Bad: "Location 123"

### 2. Include Location Details
✅ Good: "Border Crossing - Beitbridge Zimbabwe"
❌ Bad: "Border"

### 3. Be Consistent
Use the same naming pattern across similar geofences:
- "Pickup - [Customer Name] - [City]"
- "Delivery - [Customer Name] - [City]"

### 4. Use Standard Keywords
Always include at least one keyword from the lists above to ensure pattern matching works.

### 5. Test Your Geofences
After creating geofences:
1. Create a test load
2. Simulate vehicle movement through Wialon
3. Verify status updates in LiveDeliveryTracking component
4. Check the `geofence_events` table for logged events

## Monitoring & Troubleshooting

### View Geofence Events
Query the database to see all geofence events:

```sql
SELECT
  ge.*,
  l.load_number,
  v.registration_number,
  g.name as geofence_name
FROM geofence_events ge
JOIN loads l ON l.id = ge.load_id
JOIN vehicles v ON v.id = ge.vehicle_id
LEFT JOIN geofences g ON g.id = ge.geofence_id
ORDER BY ge.timestamp DESC
LIMIT 50;
```

### Check Pending Status Updates
In the LiveDeliveryTracking UI, pending status updates will appear as alerts with:
- Recommended new status
- Geofence that triggered the event
- "Confirm" button to accept the change

### Debug Mode
Enable debug logging in browser console:
```javascript
localStorage.setItem('debug-geofence-tracking', 'true');
```

Then check console for messages like:
- "Geofence event detected: [event details]"
- "Status rule matched: [rule details]"
- "Auto-updating status to: [new status]"

## Load Status Workflow

The system supports these load statuses:

1. **pending** → Initial state
2. **dispatched** → Load assigned to vehicle
3. **in_transit** → Vehicle en route
4. **arrived_pickup** → At pickup location (auto via geofence)
5. **loaded** → Cargo loaded (confirm via geofence exit)
6. **arrived_delivery** → At delivery location (auto via geofence)
7. **delivered** → Cargo delivered (confirm via geofence exit)
8. **border_crossing** → At border checkpoint (auto via geofence)
9. **at_warehouse** → At warehouse/depot (auto via geofence)
10. **completed** → Load fully completed

## Integration with Real-time Tracking

Geofence events work seamlessly with:
- **Route Deviation Detection**: Alerts when vehicle strays from planned route
- **Predictive ETA**: Adjusts arrival estimates based on geofence entries/exits
- **Enhanced Track Visualization**: Shows geofence boundaries and events on map
- **Delivery Events Log**: All geofence events logged for audit trail

## Support & Customization

For custom geofence rules or integration requirements:
1. Review the `AutoStatusUpdateRule` interface in `useWialonLoadIntegration.ts`
2. Add custom rules to the `defaultAutoStatusRules` array
3. Test thoroughly with simulated geofence events
4. Monitor the `geofence_events` and `delivery_events` tables

## Example Complete Setup

### 1. Create Geofences in Wialon
```
- "Pickup - ABC Warehouse - Johannesburg"
- "Delivery - XYZ Factory - Durban"
- "Border Crossing - Beitbridge"
- "Rest Stop - N1 Highway KM 450"
```

### 2. Configure Load
```
Load #12345
Origin: ABC Warehouse, Johannesburg
Destination: XYZ Factory, Durban
Assigned Vehicle: Fleet-001
Status: dispatched
```

### 3. Expected Auto Updates
1. Vehicle enters "Pickup - ABC Warehouse" → Status changes to `arrived_pickup`
2. Vehicle exits "Pickup - ABC Warehouse" → Alert shows "Change to loaded?" → User confirms
3. Vehicle enters "Border Crossing - Beitbridge" → Status changes to `border_crossing`
4. Vehicle enters "Delivery - XYZ Factory" → Status changes to `arrived_delivery`
5. Vehicle exits "Delivery - XYZ Factory" → Alert shows "Change to delivered?" → User confirms

Each status change is logged in `delivery_events` with:
- Timestamp
- Geofence name
- GPS coordinates
- User who confirmed (if manual)

---

**Last Updated**: November 17, 2025
**Version**: 1.0
