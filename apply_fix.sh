#!/bin/bash

# Load environment variables
source .env

# Read the SQL file
SQL_CONTENT=$(cat FIX_FK_CONSTRAINT.sql)

# Execute via Supabase SQL endpoint
curl -X POST \
  "${SUPABASE_URL}/rest/v1/rpc/exec_sql" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY:-$SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": $(echo "$SQL_CONTENT" | jq -Rs .)}"

echo ""
echo "If you see an error above, please:"
echo "1. Open Supabase Dashboard: https://supabase.com/dashboard/project/wxvhkljrbcpcgpgdqhsp"
echo "2. Click 'SQL Editor' in the left sidebar"
echo "3. Copy and paste the contents of FIX_FK_CONSTRAINT.sql"
echo "4. Click 'Run'"
