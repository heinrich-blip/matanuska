#!/bin/bash

# Apply Wialon Vehicles Migration
# This creates the wialon_vehicles table and fixes the foreign key constraint

echo "🔄 Applying Wialon Vehicles migration..."

# Read the SQL file
SQL_FILE="supabase/migrations/20251104120000_create_wialon_vehicles.sql"

if [ ! -f "$SQL_FILE" ]; then
    echo "❌ Migration file not found: $SQL_FILE"
    exit 1
fi

echo "📄 Found migration file: $SQL_FILE"
echo ""
echo "⚠️  This migration will:"
echo "   1. Create wialon_vehicles table"
echo "   2. Drop and recreate fk_assigned_vehicle constraint on loads table"
echo "   3. Point loads.assigned_vehicle_id to wialon_vehicles(id)"
echo ""
echo "🔧 Please run this SQL in your Supabase Dashboard SQL Editor:"
echo "   https://supabase.com/dashboard/project/wxvhkljrbcpcgpgdqhsp/sql"
echo ""
echo "----------------------------------------"
cat "$SQL_FILE"
echo "----------------------------------------"
echo ""
echo "After running the SQL, press Enter to continue..."
read

echo "✅ Migration should now be applied!"
echo ""
echo "Next steps:"
echo "1. Deploy the Edge Function with CORS fix:"
echo "   npx supabase functions deploy get-wialon-token"
echo ""
echo "2. Regenerate TypeScript types:"
echo "   npx supabase gen types typescript --project-id wxvhkljrbcpcgpgdqhsp > src/integrations/supabase/types.ts"
echo ""
echo "3. Test the assignment flow in the UI"
