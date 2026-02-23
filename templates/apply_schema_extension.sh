#!/bin/bash

# Migration Application Script
# This script applies the missing fields migration to your Supabase database

echo "=================================================="
echo "Car Craft Co - Database Schema Extension"
echo "=================================================="
echo ""
echo "This migration will add the following fields:"
echo ""
echo "📋 maintenance_schedules table:"
echo "  - title, description, notes"
echo "  - schedule_type, frequency, frequency_value"
echo "  - start_date, end_date, last_completed_date"
echo "  - priority, category, maintenance_type"
echo "  - assigned_to, assigned_team, created_by"
echo "  - notification settings"
echo "  - automation settings"
echo "  - odometer-based scheduling"
echo ""
echo "📊 maintenance_schedule_history table:"
echo "  - job_card_id, inspection_id"
echo "  - scheduled_date, updated_at"
echo "  - completed_by, odometer_reading"
echo "  - parts_used, linked_faults"
echo ""
echo "🚗 tyres table:"
echo "  - current_fleet_position, position"
echo ""
echo "=================================================="
echo ""

# Check if migration file exists
MIGRATION_FILE="supabase/migrations/20251031000000_add_missing_schema_fields.sql"

if [ ! -f "$MIGRATION_FILE" ]; then
    echo "❌ Error: Migration file not found at $MIGRATION_FILE"
    exit 1
fi

echo "✅ Migration file found"
echo ""

# Method 1: Using Supabase CLI (recommended)
echo "Method 1: Apply via Supabase CLI"
echo "=================================="
echo "Run the following command:"
echo ""
echo "  supabase db push"
echo ""
echo "Or to apply remotely:"
echo "  supabase db push --db-url 'your-database-url'"
echo ""

# Method 2: Using Supabase Dashboard
echo "Method 2: Apply via Supabase Dashboard"
echo "======================================="
echo "1. Go to your Supabase project dashboard"
echo "2. Navigate to: SQL Editor"
echo "3. Click: 'New Query'"
echo "4. Copy the contents of: $MIGRATION_FILE"
echo "5. Paste into the SQL editor"
echo "6. Click: 'Run'"
echo ""

# Method 3: Using psql
echo "Method 3: Apply via psql"
echo "========================"
echo "Run the following command:"
echo ""
echo "  psql 'your-connection-string' < $MIGRATION_FILE"
echo ""

echo "=================================================="
echo "After applying the migration:"
echo "=================================================="
echo ""
echo "1. Regenerate TypeScript types:"
echo "   npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/integrations/supabase/types.ts"
echo ""
echo "2. Restart your development server:"
echo "   npm run dev"
echo ""
echo "3. Verify the changes in your database"
echo ""
echo "=================================================="
echo ""

read -p "Would you like to view the migration SQL? (y/n): " view_sql

if [[ $view_sql == "y" || $view_sql == "Y" ]]; then
    echo ""
    echo "Migration SQL:"
    echo "=============="
    cat "$MIGRATION_FILE"
    echo ""
fi

echo "Done! Please apply the migration using one of the methods above."
