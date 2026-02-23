#!/bin/bash

# Wialon API Commands
# This script requires the WIALON_TOKEN environment variable to be set.
# Example: export WIALON_TOKEN="your_actual_token_here"
# It performs login first to obtain a session ID (sid), then uses it for subsequent calls.
# Requires 'jq' for JSON parsing. Install with: sudo apt update && sudo apt install jq

# Check if WIALON_TOKEN is set
if [ -z "$WIALON_TOKEN" ]; then
  echo "Error: WIALON_TOKEN environment variable is not set."
  echo "Set it with: export WIALON_TOKEN=\"c1099bc37c906fd0832d8e783b60ae0dCC3725501AE92D98C6E0C1E4A49C23614B0246E7\""
  exit 1
fi

# 01_token_login: Login with token authentication and extract sid (eid)
echo "Performing login..."
LOGIN_RESPONSE=$(curl -s -X POST 'https://hst-api.wialon.com/wialon/ajax.html' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data "svc=token/login&params={\"token\":\"${WIALON_TOKEN}\"}")

# Parse sid (eid) from response
SID=$(echo "$LOGIN_RESPONSE" | jq -r '.eid // empty')
if [ -z "$SID" ]; then
  echo "Error: Failed to obtain session ID (sid) from login response."
  echo "$LOGIN_RESPONSE"  # Display the full response for debugging
  exit 1
fi

echo "Session ID obtained: $SID"

# Parse current user ID from login response for account info query
USER_ID=$(echo "$LOGIN_RESPONSE" | jq -r '.user.id // empty')
if [ -z "$USER_ID" ]; then
  echo "Error: Failed to obtain user ID from login response."
  echo "$LOGIN_RESPONSE"  # Display the full response for debugging
  exit 1
fi

echo "User ID obtained: $USER_ID"

# 02_search_units: Search for all units using sid
echo "Searching for units..."
UNITS_RESPONSE=$(curl -s -X POST 'https://hst-api.wialon.com/wialon/ajax.html' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data "svc=core/search_items&params={\"spec\":{\"itemsType\":\"avl_unit\",\"propName\":\"sys_name\",\"propValueMask\":\"*\",\"sortType\":\"sys_name\"},\"force\":1,\"flags\":1,\"from\":0,\"to\":0}&sid=${SID}")

echo "$UNITS_RESPONSE"

# 03_get_account_info: Get current user/account information using core/search_item with user ID
echo "Getting account info..."
ACCOUNT_INFO_RESPONSE=$(curl -s -X POST 'https://hst-api.wialon.com/wialon/ajax.html' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data "svc=core/search_item&params={\"id\":${USER_ID},\"flags\":-1}&sid=${SID}")

echo "$ACCOUNT_INFO_RESPONSE"

# 04_logout: Logout from session using sid (added empty params for safety)
echo "Logging out..."
LOGOUT_RESPONSE=$(curl -s -X POST 'https://hst-api.wialon.com/wialon/ajax.html' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data "svc=core/logout&params={}&sid=${SID}")

# Optional: Print logout response if needed for debugging
echo "Logout response: $LOGOUT_RESPONSE"

echo "Done."
