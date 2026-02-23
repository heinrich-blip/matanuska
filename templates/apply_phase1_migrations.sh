#!/bin/bash

# Phase 1 Database Migration Script
# Applies inventory selection feature migrations
# Date: 2025-10-31

echo "🚀 Phase 1: Database Setup for Inventory Selection Feature"
echo "============================================================"
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ Error: DATABASE_URL environment variable not set."
  echo ""
  echo "Please set it with your Supabase connection string:"
  echo "export DATABASE_URL='postgresql://postgres.wxvhkljrbcpcgpgdqhsp:YOUR_PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres'"
  echo ""
  echo "Or run the migrations manually through Supabase SQL Editor:"
  echo "1. Go to https://supabase.com/dashboard/project/wxvhkljrbcpcgpgdqhsp/sql"
  echo "2. Copy and paste the SQL from each migration file"
  echo "3. Execute them in order:"
  echo "   - 20251031000001_extend_parts_requests_for_inventory.sql"
  echo "   - 20251031000002_create_inventory_transactions_table.sql"
  echo "   - 20251031000003_create_inventory_management_functions.sql"
  exit 1
fi

# Migration files in order
migrations=(
  "20251031000001_extend_parts_requests_for_inventory.sql"
  "20251031000002_create_inventory_transactions_table.sql"
  "20251031000003_create_inventory_management_functions.sql"
)

echo "📋 Found ${#migrations[@]} migrations to apply"
echo ""

# Apply each migration
for migration in "${migrations[@]}"; do
  migration_file="supabase/migrations/$migration"
  
  if [ ! -f "$migration_file" ]; then
    echo "❌ Error: Migration file not found: $migration_file"
    exit 1
  fi
  
  echo "📝 Applying: $migration"
  
  # Apply migration using psql
  if psql "$DATABASE_URL" -f "$migration_file" 2>&1 | tee /tmp/migration_output.log; then
    # Check if there were any errors in output
    if grep -i "error\|fatal" /tmp/migration_output.log > /dev/null; then
      echo "❌ Migration failed: $migration"
      echo ""
      echo "Error details:"
      cat /tmp/migration_output.log
      exit 1
    else
      echo "✅ Successfully applied: $migration"
      echo ""
    fi
  else
    echo "❌ Failed to apply: $migration"
    exit 1
  fi
done

echo ""
echo "🎉 Phase 1 migrations completed successfully!"
echo ""
echo "Next steps:"
echo "1. Verify the changes using DATABASE_VERIFICATION_GUIDE.md"
echo "2. Regenerate TypeScript types: npx supabase gen types typescript --project-id wxvhkljrbcpcgpgdqhsp > src/integrations/supabase/types.ts"
echo "3. Proceed to Phase 2: Component Creation"
