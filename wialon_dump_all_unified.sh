#!/bin/bash

set -euo pipefail

TOKEN="${WIALON_TOKEN:-c1099bc37c906fd0832d8e783b60ae0dCC3725501AE92D98C6E0C1E4A49C23614B0246E7}"

# Timestamped output directory
STAMP=$(date '+%Y-%m-%d_%H-%M-%S')
OUTDIR="wialon_dumps/$STAMP"
mkdir -p "$OUTDIR"
echo "[${STAMP}] 📁 Output folder: $OUTDIR"

# --- 1. Authenticate ---
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

# --- 2. Fetch all units ---
echo "[${STAMP}] 🔎 Fetching all units…"
UNITS_RESP="$OUTDIR/units_raw.json"
curl -s -X POST 'https://hst-api.wialon.com/wialon/ajax.html' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode "svc=core/search_items" \
  --data-urlencode 'params={"spec":{"itemsType":"avl_unit","propName":"sys_name","propValueMask":"*","sortType":"sys_name"},"force":1,"flags":1,"from":0,"to":0}' \
  --data-urlencode "sid=$SID" \
  -o "$UNITS_RESP"

UNITS=$(jq '.items // []' "$UNITS_RESP")
UNITS_COUNT=$(echo "$UNITS" | jq 'length')
echo "[${STAMP}] 📦 Units count: $UNITS_COUNT"

# --- 3. Fetch all resources ---
echo "[${STAMP}] 🔎 Fetching all resources…"
RESOURCES_RESP="$OUTDIR/resources_raw.json"
curl -s -X POST 'https://hst-api.wialon.com/wialon/ajax.html' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode "svc=core/search_items" \
  --data-urlencode 'params={"spec":{"itemsType":"avl_resource","propName":"sys_name","propValueMask":"*","sortType":"sys_name"},"force":1,"flags":1,"from":0,"to":0}' \
  --data-urlencode "sid=$SID" \
  -o "$RESOURCES_RESP"

RESOURCES=$(jq '.items // []' "$RESOURCES_RESP")
RESOURCES_COUNT=$(echo "$RESOURCES" | jq 'length')
echo "[${STAMP}] 📦 Resources count: $RESOURCES_COUNT"

# --- 4. Fetch geofences for all resources ---
echo "[${STAMP}] 🗺️  Fetching geofences per resource…"
GEOFENCES="[]"
for idx in $(seq 0 $((RESOURCES_COUNT-1))); do
  RES=$(echo "$RESOURCES" | jq ".[$idx]")
  RES_ID=$(echo "$RES" | jq '.id')
  GEOF_RAW="$OUTDIR/geof_${RES_ID}.json"
  curl -s -X POST 'https://hst-api.wialon.com/wialon/ajax.html' \
    -H 'Content-Type: application/x-www-form-urlencoded' \
    --data-urlencode "svc=resource/get_zone_data" \
    --data-urlencode "params={\"itemId\":${RES_ID},\"flags\":1}" \
    --data-urlencode "sid=$SID" \
    -o "$GEOF_RAW"

  # Always aggregate as {resource, geofences}
  GEOF_RAW_CONTENT=$(cat "$GEOF_RAW")
  ZONES=$(echo "$GEOF_RAW_CONTENT" | jq '.zones // .')
  GEOF_OBJ=$(jq -n --argjson resource "$RES" --argjson geofences "$ZONES" '{resource: $resource, geofences: $geofences}')
  GEOFENCES=$(echo "$GEOFENCES" | jq ". + [$GEOF_OBJ]")
done

# --- 5. Fetch last messages per unit (last 1 day) ---
T_NOW=$(date +%s)
T_FROM=$((T_NOW - 24 * 3600))
echo "[${STAMP}] 💬 Fetching last messages per unit (range: $T_FROM → $T_NOW)…"
LAST_MSGS="[]"
for idx in $(seq 0 $((UNITS_COUNT-1))); do
  UNIT=$(echo "$UNITS" | jq ".[$idx]")
  UNIT_ID=$(echo "$UNIT" | jq '.id')
  MSG_RESP="$OUTDIR/lastmsg_unit_${UNIT_ID}.json"
  curl -s -X POST 'https://hst-api.wialon.com/wialon/ajax.html' \
    -H 'Content-Type: application/x-www-form-urlencoded' \
    --data-urlencode "svc=messages/load_last" \
    --data-urlencode "params={\"unitId\":${UNIT_ID},\"from\":$T_FROM,\"to\":$T_NOW,\"flags\":1}" \
    --data-urlencode "sid=$SID" \
    -o "$MSG_RESP"

  # Always aggregate as {unit, messages}
  MSG_RAW_CONTENT=$(cat "$MSG_RESP")
  MSG_OBJ=$(jq -n --argjson unit "$UNIT" --argjson messages "$MSG_RAW_CONTENT" '{unit: $unit, messages: $messages}')
  LAST_MSGS=$(echo "$LAST_MSGS" | jq ". + [$MSG_OBJ]")
done

# --- 6. Aggregate all results into a single file ---
echo "[${STAMP}] 🧾 Aggregating all data into one JSON file…"
jq -n \
  --argjson login "$(cat "$LOGIN_RESP")" \
  --argjson units "$UNITS" \
  --argjson resources "$RESOURCES" \
  --argjson geofences "$GEOFENCES" \
  --argjson last_messages "$LAST_MSGS" \
  '{
    login: $login,
    units: $units,
    resources: $resources,
    geofences: $geofences,
    last_messages: $last_messages
  }' > "$OUTDIR/all_data.json"

echo "[${STAMP}] ✅ All data aggregated at: $OUTDIR/all_data.json"

# Optionally clean up all the temporary .json files except all_data.json
find "$OUTDIR" -type f -name '*.json' ! -name 'all_data.json' -delete

echo "[${STAMP}] 🎉 Done!"
