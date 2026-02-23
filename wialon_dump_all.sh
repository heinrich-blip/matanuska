#!/bin/bash

set -euo pipefail

TOKEN="${WIALON_TOKEN:-c1099bc37c906fd0832d8e783b60ae0dCC3725501AE92D98C6E0C1E4A49C23614B0246E7}"

# Create output directory with timestamp
STAMP=$(date '+%Y-%m-%d_%H-%M-%S')
OUTDIR="wialon_dumps/$STAMP"
mkdir -p "$OUTDIR"
echo "[${STAMP}] 📁 Output folder: $OUTDIR"

# 1. Authenticate
echo "[${STAMP}] 🔐 Logging in with token…"
LOGIN_RESP="$OUTDIR/login.json"
curl -s -X POST 'https://hst-api.wialon.com/wialon/ajax.html' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode "svc=token/login" \
  --data-urlencode "params={\"token\":\"$TOKEN\"}" \
  -o "$LOGIN_RESP"

SID=$(jq -r '.eid // empty' "$LOGIN_RESP")
if [ -z "$SID" ]; then
  echo "[${STAMP}] ❌ Login failed! See $LOGIN_RESP"
  exit 1
fi
echo "[${STAMP}] ✅ Logged in. SID: $SID"

# 2. Dump units
echo "[${STAMP}] 🔎 Fetching all units…"
UNITS_RESP="$OUTDIR/units_raw.json"
curl -s -X POST 'https://hst-api.wialon.com/wialon/ajax.html' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode "svc=core/search_items" \
  --data-urlencode 'params={"spec":{"itemsType":"avl_unit","propName":"sys_name","propValueMask":"*","sortType":"sys_name"},"force":1,"flags":1,"from":0,"to":0}' \
  --data-urlencode "sid=$SID" \
  -o "$UNITS_RESP"

UNITS_COUNT=$(jq '.totalItems // 0' "$UNITS_RESP" 2>/dev/null || echo 0)
echo "[${STAMP}] 📦 Units totalItems: $UNITS_COUNT"
if (( UNITS_COUNT > 0 )); then
  jq -c '.items[]?' "$UNITS_RESP" | nl -nln -w2 -s: | while IFS=: read -r idx line; do
    echo "$line" > "$OUTDIR/unit_${idx}.json"
  done
fi

# 3. Dump resources
echo "[${STAMP}] 🔎 Fetching all resources…"
RESOURCES_RESP="$OUTDIR/resources_raw.json"
curl -s -X POST 'https://hst-api.wialon.com/wialon/ajax.html' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode "svc=core/search_items" \
  --data-urlencode 'params={"spec":{"itemsType":"avl_resource","propName":"sys_name","propValueMask":"*","sortType":"sys_name"},"force":1,"flags":1,"from":0,"to":0}' \
  --data-urlencode "sid=$SID" \
  -o "$RESOURCES_RESP"

RES_COUNT=$(jq '.totalItems // 0' "$RESOURCES_RESP" 2>/dev/null || echo 0)
echo "[${STAMP}] 📦 Resources totalItems: $RES_COUNT"
if (( RES_COUNT > 0 )); then
  jq -c '.items[]?' "$RESOURCES_RESP" | nl -nln -w2 -s: | while IFS=: read -r idx line; do
    echo "$line" > "$OUTDIR/resource_${idx}.json"
  done
fi

# 4. Dump geofences per resource
echo "[${STAMP}] 🗺️  Fetching geofences per resource…"
for file in "$OUTDIR"/resource_*.json; do
  [ -e "$file" ] || continue
  RES_ID=$(jq '.id' "$file")
  GEOFENCE_RESP="$OUTDIR/geofences_resource_${RES_ID}.json"
  curl -s -X POST 'https://hst-api.wialon.com/wialon/ajax.html' \
    -H 'Content-Type: application/x-www-form-urlencoded' \
    --data-urlencode "svc=resource/get_zone_data" \
    --data-urlencode "params={\"itemId\":${RES_ID},\"flags\":1}" \
    --data-urlencode "sid=$SID" \
    -o "$GEOFENCE_RESP"
done

# 5. Fetch last messages for each unit (last 1 day)
T_NOW=$(date +%s)
T_FROM=$((T_NOW - 24 * 3600))
echo "[${STAMP}] 💬 Fetching last messages per unit (range: $T_FROM → $T_NOW)…"
for file in "$OUTDIR"/unit_*.json; do
  [ -e "$file" ] || continue
  UNIT_ID=$(jq '.id' "$file")
  MSG_RESP="$OUTDIR/lastmsg_unit_${UNIT_ID}.json"
  curl -s -X POST 'https://hst-api.wialon.com/wialon/ajax.html' \
    -H 'Content-Type: application/x-www-form-urlencoded' \
    --data-urlencode "svc=messages/load_last" \
    --data-urlencode "params={\"unitId\":${UNIT_ID},\"from\":$T_FROM,\"to\":$T_NOW,\"flags\":1}" \
    --data-urlencode "sid=$SID" \
    -o "$MSG_RESP"
done

# 6. Build manifest
echo "[${STAMP}] 🧾 Building manifest…"
find "$OUTDIR" -maxdepth 1 -type f -name '*.json' ! -name 'manifest.json' \
  | jq -R -s -c 'split("\n")[:-1] | map({file: ., size: (input_filename | (try (inputs | stat | .size) // 0))})' > "$OUTDIR/manifest.json"
echo "[${STAMP}] ✅ All done. See $OUTDIR"
