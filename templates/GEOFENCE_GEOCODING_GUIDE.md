# Geofence Geocoding Guide

## Problem

Your geofences have **names and descriptions** (e.g., "Harare Central Hospital, Birmingham Road, Harare, Zimbabwe") but **no coordinates** (latitude/longitude). Without coordinates, they cannot be plotted on the map.

## Solution Options

### Option 1: Automated Geocoding (Recommended)

Use the provided script to automatically geocode all geofences using OpenStreetMap's free Nominatim service.

```bash
# Run the geocoding script
npx tsx scripts/geocode-geofences.ts
```

**Pros:**

- Automatic, processes all geofences
- Free (OpenStreetMap Nominatim)
- Respects rate limits (1 request/second)

**Cons:**

- Takes time (1+ second per geofence)
- Accuracy depends on address quality
- Some locations may not be found

**Expected Output:**

```
🔍 Fetching geofences without coordinates...
📍 Found 137 geofences to geocode

🔎 Geocoding: 24 Hour Medical Centre (+263776008387)
   Query: Bulawayo, Zimbabwe
   ✅ Coordinates: -20.123456, 28.567890

🔎 Geocoding: A4 Toll Gate
   Query: Beitbridge, Zimbabwe
   ✅ Coordinates: -22.234567, 29.987654

...

==================================================
✅ Success: 125
❌ Failed: 12
==================================================
```

### Option 2: Manual Coordinate Entry

For geofences that failed geocoding or need precise locations:

```sql
-- Update individual geofence
UPDATE geofences
SET
  center_lat = -17.825166,
  center_lng = 31.033510,
  radius = 1000
WHERE name = 'Harare Central Hospital';

-- For circles, set center and radius (in meters)
-- For polygons/lines, set coordinates as JSONB array
UPDATE geofences
SET coordinates = '[
  {"lat": -17.825, "lng": 31.033},
  {"lat": -17.826, "lng": 31.034},
  {"lat": -17.827, "lng": 31.033}
]'::jsonb
WHERE name = 'My Polygon Geofence';
```

### Option 3: Google Maps / Manual Lookup

1. Go to [Google Maps](https://maps.google.com)
2. Search for the location (e.g., "Harare Central Hospital")
3. Right-click → "What's here?"
4. Copy coordinates (format: -17.825166, 31.033510)
5. Update in database:

```sql
UPDATE geofences
SET center_lat = -17.825166, center_lng = 31.033510
WHERE name = 'Harare Central Hospital';
```

## Understanding Geofence Types

### Circle Geofences

- **center_lat, center_lng**: Center point
- **radius**: Radius in meters (default: 500m)
- Example: Hospital coverage area

```sql
INSERT INTO geofences (name, type, center_lat, center_lng, radius)
VALUES ('Hospital Zone', 'circle', -17.825166, 31.033510, 2000);
```

### Polygon Geofences

- **coordinates**: Array of lat/lng points forming a closed shape
- Example: Warehouse compound, industrial park

```sql
INSERT INTO geofences (name, type, coordinates)
VALUES (
  'Warehouse Perimeter',
  'polygon',
  '[
    {"lat": -17.825, "lng": 31.033},
    {"lat": -17.826, "lng": 31.034},
    {"lat": -17.827, "lng": 31.035},
    {"lat": -17.826, "lng": 31.036}
  ]'::jsonb
);
```

### Line Geofences

- **coordinates**: Array of lat/lng points forming a route/path
- Example: Highway routes, delivery corridors

```sql
INSERT INTO geofences (name, type, coordinates)
VALUES (
  'JHB-Harare Route',
  'line',
  '[
    {"lat": -26.204103, "lng": 28.047305},
    {"lat": -25.746111, "lng": 28.188056},
    {"lat": -23.900000, "lng": 29.450000},
    {"lat": -17.829167, "lng": 31.054167}
  ]'::jsonb
);
```

## Visualization

Once geofences have coordinates, they will automatically appear on the **GPS Tracking > Geofences** tab:

- **Circles**: Blue circles with radius
- **Polygons**: Outlined areas
- **Lines**: Route paths
- **Click**: Show details in popup
- **List**: Click to zoom to geofence

## Troubleshooting

### Script fails to run

```bash
# Install tsx if missing
npm install -D tsx

# Check environment variables
echo $VITE_SUPABASE_URL
echo $VITE_SUPABASE_ANON_KEY
```

### Geocoding returns wrong locations

- Improve address quality in `description` field
- Add more context (city, country always helps)
- Manually correct using Google Maps coordinates

### No geofences showing on map

1. Check coordinates exist:

```sql
SELECT name, center_lat, center_lng
FROM geofences
WHERE center_lat IS NOT NULL
LIMIT 10;
```

2. Check console for errors in browser DevTools
3. Verify `is_active = true`

### Rate limit errors

Nominatim limits to 1 request/second. The script already handles this, but if you see errors:

- Increase delay in script (line with `setTimeout`)
- Use alternative geocoding service (Google Maps API - requires key)

## Alternative Geocoding Services

If Nominatim doesn't work well, you can use:

### Google Geocoding API

```typescript
// Requires API key (paid, but has free tier)
const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${address}&key=YOUR_API_KEY`;
```

### MapBox Geocoding

```typescript
// Requires token (free tier available)
const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${address}.json?access_token=YOUR_TOKEN`;
```

## Next Steps

1. ✅ Run geocoding script: `npx tsx scripts/geocode-geofences.ts`
2. ✅ Check results in database
3. ✅ View geofences on GPS Tracking page
4. ✅ Manually fix any failed geocoding
5. ✅ Test by clicking geofences on map

---

**Pro Tip:** For Zimbabwe-specific locations, consider using local GIS data or manually verifying important locations (hospitals, borders, major cities) for accuracy.
