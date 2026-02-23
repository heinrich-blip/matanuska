#!/bin/bash

echo "🚀 Applying new migrations to Supabase..."
echo ""

# Check if using local or remote
ENVIRONMENT="${1:-remote}"

if [ "$ENVIRONMENT" = "remote" ]; then
  echo "📡 Applying to REMOTE Supabase database..."
  echo ""
  echo "🔐 Please run these SQL files in your Supabase Dashboard → SQL Editor:"
  echo ""
  echo "1️⃣  supabase/migrations/20251104000001_enable_loads_realtime.sql"
  echo "2️⃣  supabase/migrations/20251104000002_predefined_locations.sql"
  echo "3️⃣  supabase/migrations/20251104000003_import_predefined_locations.sql"
  echo ""
  echo "OR use psql with your connection string:"
  echo ""
  echo "psql \"postgresql://postgres.wxvhkljrbcpcgpgdqhsp:YOUR_PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres\" \\"
  echo "  -f supabase/migrations/20251104000001_enable_loads_realtime.sql"
  echo ""
  echo "psql \"postgresql://postgres.wxvhkljrbcpcgpgdqhsp:YOUR_PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres\" \\"
  echo "  -f supabase/migrations/20251104000002_predefined_locations.sql"
  echo ""
  echo "psql \"postgresql://postgres.wxvhkljrbcpcgpgdqhsp:YOUR_PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres\" \\"
  echo "  -f supabase/migrations/20251104000003_import_predefined_locations.sql"
  echo ""
else
  echo "🏠 Applying to LOCAL Supabase database..."

  # Get DB container
  DB_CONTAINER=$(docker ps --format "{{.Names}}" | grep -E "supabase.*db|db.*supabase" | head -n 1)

  if [ -z "$DB_CONTAINER" ]; then
    echo "❌ Error: Could not find Supabase DB container."
    echo "Make sure Supabase is running: npx supabase start"
    exit 1
  fi

  echo "✅ Found container: $DB_CONTAINER"
  echo ""

  # Apply migrations
  echo "1️⃣  Enabling realtime for loads table..."
  docker exec -i "$DB_CONTAINER" psql -U postgres -d postgres < supabase/migrations/20251104000001_enable_loads_realtime.sql

  echo ""
  echo "2️⃣  Creating predefined_locations table..."
  docker exec -i "$DB_CONTAINER" psql -U postgres -d postgres < supabase/migrations/20251104000002_predefined_locations.sql

  echo ""
  echo "3️⃣  Importing location data..."
  docker exec -i "$DB_CONTAINER" psql -U postgres -d postgres < supabase/migrations/20251104000003_import_predefined_locations.sql

  echo ""
  echo "✅ All migrations applied successfully!"
fi

echo ""
echo "🎉 Done! Your route waypoints are now available in the database."
echo ""
echo "📊 To verify, run this query:"
echo "   SELECT country, location_type, COUNT(*) "
echo "   FROM predefined_locations "
echo "   GROUP BY country, location_type "
echo "   ORDER BY country, location_type;"
