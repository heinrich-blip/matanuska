# Geofence Integration Guide

## Overview

You now have **131 geofences** in your database covering Zimbabwe, South Africa, and Zambia. Here's how to use them for route planning and load management.

---

## 1. **Viewing Geofences on the Map**

### Already Working ✅

Navigate to: **GPS Tracking → Geofences Tab**

```
http://localhost:8081/gps-tracking
```

**What you'll see:**

- List of 131 geofences with names, types, and descriptions
- All geofences plotted on the map (circles for hospitals/toll gates, polygons for warehouses)
- Click any geofence in the list → map zooms to that location
- Click geofence on map → popup with details

---

## 2. **Using Geofences in Load Management**

### A. Use LocationSelector for Quick Pickup/Delivery

Your `LocationSelector` component (already in `CreateLoadDialog.tsx`) uses the `predefined_locations` table. You should:

**Option 1: Import geofences as predefined locations**

Run this SQL in Supabase:

```sql
-- Add geofences to predefined_locations for easy selection
INSERT INTO predefined_locations (
  name,
  short_code,
  address,
  latitude,
  longitude,
  location_type,
  country,
  is_active,
  is_favorite
)
SELECT
  name,
  UPPER(LEFT(name, 3)) as short_code,
  description as address,
  center_lat as latitude,
  center_lng as longitude,
  CASE
    WHEN type = 'circle' AND description ILIKE '%hospital%' THEN 'customer'
    WHEN type = 'circle' AND description ILIKE '%toll%' THEN 'toll_gate'
    WHEN type = 'polygon' AND description ILIKE '%warehouse%' THEN 'depot'
    WHEN description ILIKE '%border%' THEN 'border_post'
    ELSE 'market'
  END::location_type as location_type,
  CASE
    WHEN description ILIKE '%Zimbabwe%' THEN 'Zimbabwe'
    WHEN description ILIKE '%South Africa%' THEN 'South Africa'
    WHEN description ILIKE '%Zambia%' THEN 'Zambia'
    ELSE 'South Africa'
  END as country,
  true as is_active,
  (description ILIKE '%harare%' OR description ILIKE '%johannesburg%') as is_favorite
FROM geofences
WHERE center_lat IS NOT NULL
  AND center_lng IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM predefined_locations pl
    WHERE pl.name = geofences.name
  );
```

**Result:** All 131 geofences appear in the LocationSelector dropdown when creating loads!

---

## 3. **Route Planning with Geofences**

### A. Enhanced RoutePlanner Component

I'll create an enhanced version that shows:

- **Geofences along the route** (warehouses, toll gates, border posts)
- **Suggested rest stops** (every 4 hours driving)
- **Toll gates to pass through**
- **Border posts for customs clearance**
- **Estimated costs** (tolls + fuel)

### B. How to Use (After Enhancement)

1. **Create a Load** with origin/destination
2. **Click "Plan Route"** on the load
3. **RoutePlanner will:**
   - Show geofences between origin and destination
   - Suggest waypoints (toll gates, border posts, rest stops)
   - Calculate distance, time, and costs
   - Allow you to add/remove waypoints
   - Optimize the sequence

---

## 4. **Geofence-Based Features**

### A. Automatic Toll Gate Detection

When planning a route from Harare → Johannesburg, the system will:

1. Fetch geofences along the route (within 50km buffer)
2. Filter for `type = 'circle'` AND `description ILIKE '%toll%'`
3. Add them as mandatory waypoints
4. Calculate toll costs

### B. Border Post Alerts

Routes crossing countries will:

1. Detect border post geofences
2. Add customs clearance time (2-4 hours)
3. Alert driver about required documents

### C. Rest Stop Suggestions

System calculates:

- Driving time between stops
- Suggests truck stops or warehouses every 4 hours
- Uses geofences marked as `truck_stop` or `rest_area`

### D. Geofence Entry/Exit Tracking

When GPS tracking is active:

1. System detects vehicle entering geofence
2. Creates `delivery_event` with `event_type = 'arrived_destination'`
3. Sends notification to dispatcher
4. Updates ETA based on actual arrival

---

## 5. **Practical Workflow**

### **Scenario: Harare to Johannesburg Shipment**

1. **Create Load:**

   - Origin: Harare Depot (use LocationSelector)
   - Destination: Johannesburg Warehouse (use LocationSelector)
   - Pickup: Tomorrow 06:00
   - Cargo: 15 tons produce

2. **System Automatically:**

   - Finds route via Beitbridge Border
   - Adds waypoints:
     - Harare Toll Gate
     - Beitbridge Border Post (ZIM side)
     - Beitbridge Border Post (SA side)
     - Musina Truck Stop (rest)
     - Polokwane Toll Gate
     - Johannesburg Warehouse
   - Calculates:
     - Distance: 1,100 km
     - Time: 15 hours (including 3h border clearance)
     - Fuel: 330 liters @ R22/L = R7,260
     - Tolls: R450
     - **Total Cost: R7,710**

3. **Assign Vehicle:**

   - Click "Assign Vehicle"
   - System ranks vehicles by:
     - Distance from Harare (closest first)
     - GPS availability
     - Vehicle type (matching cargo requirements)
   - Assign to "21H - ADS 4865"

4. **Track Delivery:**
   - Vehicle departs → Creates `delivery_event` (departed_origin)
   - Passes Harare Toll → Event logged
   - Arrives Beitbridge → Alert sent
   - Crosses border → Customs clearance logged
   - Rest stop at Musina → 30 min break logged
   - Arrives Johannesburg → Delivery complete

---

## 6. **Database Queries for Integration**

### Find Geofences Near a Point

```sql
-- Find geofences within 50km of a location
SELECT
  id,
  name,
  type,
  description,
  center_lat,
  center_lng,
  (
    6371 * acos(
      cos(radians(-17.8216)) * cos(radians(center_lat)) *
      cos(radians(center_lng) - radians(31.0492)) +
      sin(radians(-17.8216)) * sin(radians(center_lat))
    )
  ) AS distance_km
FROM geofences
WHERE center_lat IS NOT NULL
  AND center_lng IS NOT NULL
HAVING distance_km < 50
ORDER BY distance_km;
```

### Find Geofences Along a Route

```sql
-- Find geofences between two points (rectangular bounding box)
SELECT *
FROM geofences
WHERE center_lat IS NOT NULL
  AND center_lng IS NOT NULL
  AND center_lat BETWEEN -26.2041 AND -17.8216  -- Min/Max lat
  AND center_lng BETWEEN 28.0473 AND 31.0492    -- Min/Max lng
  AND is_active = true
ORDER BY center_lat;
```

### Get Toll Gates Only

```sql
SELECT *
FROM geofences
WHERE type = 'circle'
  AND (
    description ILIKE '%toll%' OR
    name ILIKE '%toll%'
  )
  AND center_lat IS NOT NULL
ORDER BY name;
```

---

## 7. **Next Steps**

### Immediate (No Code Required):

1. ✅ **View geofences** on GPS Tracking page
2. ✅ **Import geofences** to predefined_locations (run SQL above)
3. ✅ **Use LocationSelector** in load creation (already works!)

### With Code Enhancements (I'll create):

1. 📝 **Enhanced RoutePlanner** - Shows geofences along route
2. 📝 **Geofence-aware route optimization** - Auto-add toll gates/borders
3. 📝 **Cost calculator** - Estimate tolls + fuel based on geofences
4. 📝 **Live tracking integration** - Entry/exit notifications

---

## 8. **Manual Geocoding for Failed Locations**

Only 2 geofences need manual fixes:

### "SA SIDE BB BORDER"

Google Maps: `-22.21667, 30.00000` (Beitbridge Border, South Africa side)

```sql
UPDATE geofences
SET center_lat = -22.21667, center_lng = 30.00000
WHERE name = 'SA SIDE BB BORDER';
```

### "Two Oceans Commercial Cold Store"

Google Maps: `-33.9897, 18.6818` (Kuils River, Cape Town)

```sql
UPDATE geofences
SET center_lat = -33.9897, center_lng = 18.6818
WHERE name = 'Two Oceans Commercial Cold Store';
```

---

## Summary

**You already have:**

- ✅ 131 geofences with coordinates
- ✅ GeofenceDisplay component (working)
- ✅ LocationSelector component (working)
- ✅ RoutePlanner component (basic)
- ✅ GPS Tracking with Wialon integration

**Ready to use now:**

1. View geofences on GPS Tracking → Geofences tab
2. Create loads using LocationSelector
3. Assign vehicles based on GPS location

**Next enhancements (I can create):**

1. Geofence-aware route planning
2. Automatic toll gate detection
3. Border post alerts
4. Cost estimation with geofences
5. Entry/exit notifications

**Let me know which feature you want to implement first!**
