# Track Visualization User Guide

## Overview

The Track Visualization feature allows you to view historical GPS routes driven by your fleet vehicles, helping you analyze past trips, verify deliveries between geofences, and audit vehicle movements.

## Quick Start Guide (3 Simple Steps!)

### Step 1: Enable Track Visualization

1. Go to **Fleet Map** → Click **Tracks Tab** (⏱️ History icon)
2. Click the **"Disabled"** button (it will turn to **"Enabled"**)

### Step 2: Set Date & Time Range

1. **Date**: Click calendar picker and select the day you want to view
2. **Time Range**: Set From/To times (e.g., `08:00` to `18:00`)

### Step 3: Click Vehicle to Load Route

1. In the **"Load Historical Route"** section, you'll see all your vehicles as buttons
2. **Click any vehicle button**
3. **The route appears instantly on the map!**

**That's it!** The colored line on the map shows exactly where that vehicle drove during your selected time period.

---

## Detailed Instructions

## How to Use Track Visualization

### Step 1: Navigate to Fleet Map

1. Go to the **Unified Map View** (Fleet Map)
2. Ensure you're connected to Wialon (you'll see a green "Live" badge)

### Step 2: Enable Track Visualization

1. Click on the **Tracks Tab** (History icon) in the sidebar
2. Click the **"Disabled"** button to change it to **"Enabled"**
3. The Track Visualization controls will appear

### Step 3: Configure Date & Time Range

1. **Select Date**: Click the date picker and choose the day you want to view
2. **Set Time Range**:
   - **From**: Start time (e.g., `00:00` for midnight)
   - **To**: End time (e.g., `23:59` for end of day)

### Step 4: Load Vehicle Tracks

**NEW IMPROVED METHOD** (stays in Tracks tab):

1. Scroll to **"Load Historical Route"** section
2. Click any vehicle button to instantly load its track
3. Buttons show ▶️ Play icon (ready to load) or ⏱️ History icon (already loaded)

**ALTERNATE METHOD** (via Vehicles tab):

1. Go to the **Vehicles Tab** (Truck icon)
2. Find the vehicle you want to track
3. Click the **Play button** (▶️) next to the vehicle name
4. The system will load GPS data from Wialon for the selected date/time range

### Step 5: View & Manage Tracks

#### Understanding Track Display

- **Solid colored line**: Real GPS track from Wialon data
- **Dashed colored line**: Demo track (when no historical data available)
- **Multiple colors**: Each vehicle gets a unique color for easy identification

#### Track Information

Each active track shows:

- **Vehicle name**
- **Total distance** (km)
- **Number of GPS points** recorded
- **Demo badge** (if using current position instead of historical data)

#### Track Controls

- **👁 Eye Icon**: Toggle track visibility on/off
- **❌ X Icon**: Remove track from view
- **Clear All**: Remove all tracks at once

### Step 6: Analyze Routes Between Geofences

1. Switch to the **Geofences Tab** to see your delivery/pickup zones
2. Vehicle tracks will show as colored lines overlaid on the map
3. Zoom in to see detailed paths between geofences
4. Click on geofences to see their details

## Tips & Best Practices

### Optimal Time Ranges

- **Full Day**: `00:00` to `23:59` for complete daily routes
- **Business Hours**: `08:00` to `18:00` for work shifts
- **Custom**: Set specific ranges to focus on particular trips

### Multiple Vehicle Comparison

- Load tracks for multiple vehicles to compare routes
- Each vehicle gets a unique color
- Use the visibility toggle to focus on specific vehicles

### Performance Considerations

- Loading very long time ranges (multiple days) may take longer
- If a vehicle has no GPS data for the selected period, you'll see an error message
- Modern browsers handle 5-10 simultaneous tracks efficiently

### Troubleshooting

#### "No GPS data available"

- **Cause**: Vehicle didn't report position during selected time
- **Solution**: Try a different date/time range when vehicle was active

#### Track shows only one point

- **Cause**: Vehicle was stationary during selected period
- **Solution**: Extend time range or choose different date

#### Demo track instead of real data

- **Cause**: No historical data available, showing current position
- **Solution**: Check Wialon connection and data retention settings

## Use Cases

### 1. Delivery Verification

- Load track for delivery date
- Verify vehicle visited all required geofences
- Check time spent at each location

### 2. Route Optimization

- Compare actual routes vs planned routes
- Identify inefficient paths
- Analyze delivery sequence

### 3. Compliance & Auditing

- Verify driver followed designated routes
- Check if restricted zones were avoided
- Document vehicle locations at specific times

### 4. Performance Analysis

- Compare routes across different days
- Identify fastest/slowest drivers
- Analyze fuel efficiency based on route choice

## Technical Notes

### Data Source

- Historical tracks use real GPS data from **Wialon API**
- Data accuracy depends on GPS device update frequency
- Typical update interval: 30-60 seconds

### Data Retention

- Check with your Wialon account for data retention period
- Most accounts retain 3-12 months of GPS history

### API Limits

- Maximum 10,000 GPS points per query
- For longer periods, data is automatically truncated
- Consider breaking very long trips into smaller time windows

## Keyboard Shortcuts

- **Esc**: Close selected vehicle sensor widget
- **Mouse wheel**: Zoom in/out on map
- **Click + Drag**: Pan map view
- **Double-click track**: Select corresponding vehicle

## Related Features

- **Live Vehicle Tracking**: See current positions in real-time
- **Geofence Events**: View entry/exit logs for detailed timing
- **Route Planning**: Create optimized routes based on historical data
- **Fleet Analytics**: Export track data for advanced analysis

## Support

For additional help:

1. Check Wialon connection status (should show "Live" green badge)
2. Verify vehicle has GPS device properly configured
3. Ensure selected date is within data retention period
4. Contact system administrator for Wialon API access issues

---

**Last Updated**: January 2026
**Feature Status**: ✅ Active & Fully Functional
