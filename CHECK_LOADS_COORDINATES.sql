-- Check loads table structure for coordinate columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'loads'
  AND column_name LIKE '%lat%' OR column_name LIKE '%lng%' OR column_name LIKE '%lon%'
ORDER BY ordinal_position;
[
  {
    "column_name": "wialon_unit_id",
    "data_type": "bigint",
    "is_nullable": "NO"
  },
  {
    "column_name": "longitude",
    "data_type": "numeric",
    "is_nullable": "NO"
  },
  {
    "column_name": "origin_lat",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "column_name": "longitude",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "column_name": "longitude",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "column_name": "center_lng",
    "data_type": "numeric",
    "is_nullable": "NO"
  },
  {
    "column_name": "origin_lng",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "column_name": "center_lng",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "column_name": "longitude",
    "data_type": "numeric",
    "is_nullable": "NO"
  },
  {
    "column_name": "current_lng",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "column_name": "origin_lng",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "column_name": "lng",
    "data_type": "numeric",
    "is_nullable": "NO"
  },
  {
    "column_name": "longitude",
    "data_type": "numeric",
    "is_nullable": "NO"
  },
  {
    "column_name": "destination_lat",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "column_name": "destination_lng",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "column_name": "destination_lng",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "column_name": "clock_in_longitude",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "column_name": "wialon_zone_id",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "column_name": "wialon_id",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "column_name": "wialon_resource_id",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "column_name": "clock_out_longitude",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "column_name": "longitude",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "column_name": "cancellation_reason",
    "data_type": "text",
    "is_nullable": "YES"
  }
]
-- Check sample data to see what coordinates exist
SELECT
  load_number,
  origin,
  destination,
  origin_lat,
  origin_lng,
  destination_lat,
  destination_lng,
  status
FROM loads
WHERE assigned_vehicle_id IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;
[
  {
    "load_number": "LD-20251116-001",
    "origin": "CBC Farm, Zimbabwe",
    "destination": "South Africa",
    "origin_lat": "-17.8252000",
    "origin_lng": "31.0335000",
    "destination_lat": "-26.2041000",
    "destination_lng": "28.0473000",
    "status": "completed"
  },
  {
    "load_number": "LD-20251115-001",
    "origin": "CBC Farm, Zimbabwe",
    "destination": "South Africa",
    "origin_lat": "-17.8252000",
    "origin_lng": "31.0335000",
    "destination_lat": "-25.7461000",
    "destination_lng": "28.1881000",
    "status": "in_transit"
  },
  {
    "load_number": "LD-20251112-004",
    "origin": "CBC Farm, Zimbabwe",
    "destination": "Centurion, South Africa",
    "origin_lat": "-17.8252000",
    "origin_lng": "31.0335000",
    "destination_lat": "-25.8601000",
    "destination_lng": "28.1878000",
    "status": "arrived_at_delivery"
  },
  {
    "load_number": "LD-20251111-802",
    "origin": "CBC Farm, Zimbabwe",
    "destination": "Bulawayo, Zimbabwe",
    "origin_lat": "-17.8252000",
    "origin_lng": "31.0335000",
    "destination_lat": "-20.1496000",
    "destination_lng": "28.5833000",
    "status": "in_transit"
  },
  {
    "load_number": "LD-20251111-800",
    "origin": "BV Farm, Zimbabwe",
    "destination": "Harare, Zimbabwe",
    "origin_lat": "-17.7500000",
    "origin_lng": "31.1000000",
    "destination_lat": "-17.8292000",
    "destination_lng": "31.0522000",
    "status": "in_transit"
  },
  {
    "load_number": "LD-TEST-001",
    "origin": "Harare Depot",
    "destination": "BV Farm",
    "origin_lat": null,
    "origin_lng": null,
    "destination_lat": null,
    "destination_lng": null,
    "status": "in_transit"
  },
  {
    "load_number": "LD-20251111-406",
    "origin": "CBC",
    "destination": "BULAWAYO DEPOT",
    "origin_lat": "-20.6177688",
    "origin_lng": "32.3786847",
    "destination_lat": "-20.1469839",
    "destination_lng": "28.5716540",
    "status": "completed"
  },
  {
    "load_number": "LD-20251111-797",
    "origin": "CBC",
    "destination": "BULAWAYO DEPOT",
    "origin_lat": "-20.6177688",
    "origin_lng": "32.3786847",
    "destination_lat": "-20.1469839",
    "destination_lng": "28.5716540",
    "status": "completed"
  }
]
