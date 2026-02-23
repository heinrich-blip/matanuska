#!/bin/bash
# Apply Load Workflow Migrations in Correct Order
# This script helps apply the two-part migration safely

set -e  # Exit on error

echo "======================================"
echo "Load Status Workflow Migration Helper"
echo "======================================"
echo ""
echo "⚠️  IMPORTANT: This requires Supabase CLI to be configured"
echo "    Or you can run the SQL files manually in Supabase dashboard"
echo ""

# Check if supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found"
    echo ""
    echo "Please run migrations manually in Supabase SQL Editor:"
    echo ""
    echo "1. Open Supabase Dashboard → SQL Editor"
    echo "2. Run: supabase/migrations/20251111_001_add_enum_values.sql"
    echo "3. Wait for success"
    echo "4. Run: supabase/migrations/20251111_002_add_workflow_columns.sql"
    echo ""
    exit 1
fi

echo "📋 Step 1: Adding enum values..."
echo "File: 20251111_001_add_enum_values.sql"
echo ""

# Apply first migration
supabase db execute -f supabase/migrations/20251111_001_add_enum_values.sql

echo "✅ Step 1 complete"
echo ""
echo "⏳ Waiting 2 seconds for enum values to be committed..."
sleep 2
echo ""

echo "📋 Step 2: Adding columns and functions..."
echo "File: 20251111_002_add_workflow_columns.sql"
echo ""

# Apply second migration
supabase db execute -f supabase/migrations/20251111_002_add_workflow_columns.sql

echo "✅ Step 2 complete"
echo ""

echo "🎉 Migration successful!"
echo ""
echo "Next steps:"
echo "1. Regenerate types: npx supabase gen types typescript --project-id wxvhkljrbcpcgpgdqhsp > src/integrations/supabase/types.ts"
echo "2. Test in UI: Open any load in LiveDeliveryTracking"
echo "3. Verify: Run test queries from test_workflow_status_updates.sql"
echo ""
