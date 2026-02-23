#!/bin/bash
# Apply vehicle type enum extension migration

echo "🚀 Applying vehicle type enum extension..."
echo "📋 This migration adds 'reefer' and 'interlink' to the vehicle_type enum"
echo ""

# Path to the migration file
MIGRATION_FILE="supabase/migrations/20250114000000_add_reefer_interlink_vehicle_types.sql"

if [ ! -f "$MIGRATION_FILE" ]; then
  echo "❌ Error: Migration file not found: $MIGRATION_FILE"
  exit 1
fi

echo "📄 Migration file: $MIGRATION_FILE"
echo ""
echo "Contents:"
cat "$MIGRATION_FILE"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "To apply this migration:"
echo ""
echo "1. Go to Supabase Dashboard: https://supabase.com/dashboard/project/wxvhkljrbcpcgpgdqhsp/editor"
echo "2. Click 'SQL Editor' in the left sidebar"
echo "3. Click 'New Query'"
echo "4. Copy and paste the entire migration file content above"
echo "5. Click 'Run' to execute"
echo ""
echo "After applying the migration:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Regenerate TypeScript types:"
echo "   npx supabase gen types typescript --project-id wxvhkljrbcpcgpgdqhsp > src/integrations/supabase/types.ts"
echo ""
echo "2. Create vehicles with the new types if needed (example):"
echo "   INSERT INTO vehicles (registration_number, vehicle_type, make, model, fleet_number, active)"
echo "   VALUES ('ABC123GP', 'reefer', 'Volvo', 'FH16', 'RF001', true);"
echo ""
echo "3. The job card dialog will now show reefer and interlink vehicles in the dropdown"
echo ""
