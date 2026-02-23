#!/bin/bash

# Configuration
TOKEN="c1099bc37c906fd0832d8e783b60ae0dCC3725501AE92D98C6E0C1E4A49C23614B0246E7"
HOST="https://hst-api.wialon.com"
OUTPUT_DIR="./wialon_data"

# Create output directory
mkdir -p "$OUTPUT_DIR"

echo "🔐 Step 1: Logging in to Wialon..."
# Login and get session ID
curl -s -G "$HOST/wialon/ajax.html" \
  --data-urlencode "svc=token/login" \
  --data-urlencode "params={\"token\":\"$TOKEN\"}" \
  -o "$OUTPUT_DIR/login_response.json"

# Extract session ID (eid)
SID=$(jq -r '.eid' "$OUTPUT_DIR/login_response.json")

if [ -z "$SID" ] || [ "$SID" == "null" ]; then
  echo "❌ Login failed! Check $OUTPUT_DIR/login_response.json"
  cat "$OUTPUT_DIR/login_response.json"
  exit 1
fi

echo "✅ Login successful! Session ID: $SID"

# Helper function to make API calls
make_api_call() {
  local svc=$1
  local params=$2
  local output_file=$3

  echo "📡 Fetching $output_file..."
  curl -s -G "$HOST/wialon/ajax.html" \
    --data-urlencode "svc=$svc" \
    --data-urlencode "sid=$SID" \
    --data-urlencode "params=$params" \
    -o "$OUTPUT_DIR/$output_file"

  # Check for errors in the response
  if [[ $(jq -r '.error' "$OUTPUT_DIR/$output_file") != "null" ]]; then
    echo "❌ Failed to fetch $output_file! Error: $(jq -r '.error' "$OUTPUT_DIR/$output_file")"
  else
    echo "✅ Saved to $OUTPUT_DIR/$output_file"
  fi
}

# Fetch Units (Vehicles)
echo ""
echo "🚗 Fetching Units..."
make_api_call "core/search_items" \
  '{"spec":{"itemsType":"avl_unit","propName":"sys_name","propValueMask":"*","sortType":"sys_name"},"force":1,"flags":3,"from":0,"to":0}' \
  "units.json"

# Fetch Geofences
echo ""
echo "🗺️  Fetching Geofences..."
make_api_call "core/search_items" \
  '{"spec":{"itemsType":"geofence","propName":"sys_name","propValueMask":"*","sortType":"sys_name"},"force":1,"flags":1,"from":0,"to":0}' \
  "geofences.json"

# Fetch Drivers
echo ""
echo "👤 Fetching Drivers..."
make_api_call "core/search_items" \
  '{"spec":{"itemsType":"driver","propName":"sys_name","propValueMask":"*","sortType":"sys_name"},"force":1,"flags":1,"from":0,"to":0}' \
  "drivers.json"

# Fetch Reports
echo ""
echo "📊 Fetching Reports..."
make_api_call "report/list" \
  '{}' \
  "reports.json"

# Fetch Report Templates
echo ""
echo "📋 Fetching Report Templates..."
make_api_call "report/template/list" \
  '{}' \
  "report_templates.json"

# Fetch Orders
echo ""
echo "📦 Fetching Orders..."
make_api_call "DriverDispatching/orders/list" \
  '{"request":{}}' \
  "orders.json"

# Fetch Zones (Another type of geofence)
echo ""
echo "📍 Fetching Zones..."
make_api_call "core/search_items" \
  '{"spec":{"itemsType":"zone","propName":"sys_name","propValueMask":"*","sortType":"sys_name"},"force":1,"flags":1,"from":0,"to":0}' \
  "zones.json"

# Fetch Trailers
echo ""
echo "🛞 Fetching Trailers..."
make_api_call "core/search_items" \
  '{"spec":{"itemsType":"avl_trailer","propName":"sys_name","propValueMask":"*","sortType":"sys_name"},"force":1,"flags":1,"from":0,"to":0}' \
  "trailers.json"

# Summary
echo ""
echo "═══════════════════════════════════════"
echo "✅ All data fetched successfully!"
echo "═══════════════════════════════════════"
echo ""
echo "📂 Files saved in: $OUTPUT_DIR/"
echo ""
ls -lh "$OUTPUT_DIR/"
echo ""
echo "📊 Quick Preview:"
echo ""
echo "Units count: $(jq '.items | length' "$OUTPUT_DIR/units.json" 2>/dev/null || echo 0)"
echo "Geofences count: $(jq '.items | length' "$OUTPUT_DIR/geofences.json" 2>/dev/null || echo 0)"
echo "Drivers count: $(jq '.items | length' "$OUTPUT_DIR/drivers.json" 2>/dev/null || echo 0)"
echo "Reports count: $(jq '.items | length' "$OUTPUT_DIR/reports.json" 2>/dev/null || echo 0)"
echo ""
