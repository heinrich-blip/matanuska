-- Check if geofences table exists and has data
SELECT COUNT(*) as total_geofences
FROM geofences;
SELECT COUNT(*) as geofences_with_coords
FROM geofences
WHERE center_lat IS NOT NULL;
SELECT name, center_lat, center_lng
FROM geofences LIMIT
5;
[
  {
    "name": "Chirumanzu - St Theresa's Hospital (+263 54 221 315)",
    "center_lat": "-19.72044050",
    "center_lng": "30.63155370"
  },
  {
    "name": "Harare Central Hospital (+263242621100)",
    "center_lat": "-17.85321650",
    "center_lng": "31.02511340"
  },
  {
    "name": "BV Farm - Loading Zone",
    "center_lat": "-17.82520000",
    "center_lng": "31.03350000"
  },
  {
    "name": "Harare Distribution Center",
    "center_lat": "-17.82920000",
    "center_lng": "31.05220000"
  },
  {
    "name": "Skyline Tollgate",
    "center_lat": "-17.92102770",
    "center_lng": "30.98461860"
  }
]
-- Check geofences table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'geofences'
ORDER BY ordinal_position;
[
  {
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "column_name": "name",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "column_name": "description",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "column_name": "type",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "column_name": "groups",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "column_name": "center_lat",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "column_name": "center_lng",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "column_name": "radius",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "column_name": "coordinates",
    "data_type": "jsonb",
    "is_nullable": "YES"
  },
  {
    "column_name": "color",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "column_name": "is_active",
    "data_type": "boolean",
    "is_nullable": "YES"
  },
  {
    "column_name": "metadata",
    "data_type": "jsonb",
    "is_nullable": "YES"
  },
  {
    "column_name": "wialon_zone_id",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "column_name": "wialon_resource_id",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  }
]
-- Check the constraint on geofence_events.event_type
SELECT
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'geofence_events'
::regclass
  AND contype = 'c'  -- Check constraints
  AND conname LIKE '%event_type%';
[
  {
    "constraint_name": "geofence_events_event_type_check",
    "constraint_definition": "CHECK ((event_type = ANY (ARRAY['entry'::text, 'exit'::text]
)))"
  }
]
-- Also check the column definition
SELECT
  column_name,
  data_type,
  udt_name,
  column_default
FROM information_schema.columns
WHERE table_name = 'geofence_events'
  AND column_name = 'event_type';

[
  {
    "column_name": "event_type",
    "data_type": "text",
    "udt_name": "text",
    "column_default": null
  }
]
