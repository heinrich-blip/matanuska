#!/bin/bash

# Database Schema Verification Script
# Checks if all expected fields are present in the database

echo "=================================================="
echo "Car Craft Co - Schema Verification"
echo "=================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if a column exists
check_column() {
    local table=$1
    local column=$2

    # This is a placeholder - in practice, you'd connect to your database
    # For now, we'll create a checklist
    echo "  [ ] $column"
}

echo "${YELLOW}Maintenance Schedules Table${NC}"
echo "Expected new columns:"
check_column "maintenance_schedules" "title"
check_column "maintenance_schedules" "description"
check_column "maintenance_schedules" "schedule_type"
check_column "maintenance_schedules" "frequency"
check_column "maintenance_schedules" "priority"
check_column "maintenance_schedules" "category"
check_column "maintenance_schedules" "assigned_to"
check_column "maintenance_schedules" "notification_channels"
check_column "maintenance_schedules" "odometer_based"
echo ""

echo "${YELLOW}Maintenance Schedule History Table${NC}"
echo "Expected new columns:"
check_column "maintenance_schedule_history" "job_card_id"
check_column "maintenance_schedule_history" "inspection_id"
check_column "maintenance_schedule_history" "scheduled_date"
check_column "maintenance_schedule_history" "completed_by"
check_column "maintenance_schedule_history" "parts_used"
echo ""

echo "${YELLOW}Tyres Table${NC}"
echo "Expected new columns:"
check_column "tyres" "current_fleet_position"
check_column "tyres" "position"
echo ""

echo "=================================================="
echo "Manual Verification Steps:"
echo "=================================================="
echo ""
echo "1. Connect to your database and run:"
echo ""
echo "   SELECT column_name, data_type"
echo "   FROM information_schema.columns"
echo "   WHERE table_name = 'maintenance_schedules'"
echo "   ORDER BY column_name;"
echo ""
echo "2. Or use Supabase Dashboard:"
echo "   - Go to Table Editor"
echo "   - Select 'maintenance_schedules' table"
echo "   - Check if new columns appear"
echo ""
echo "3. Verify indexes were created:"
echo ""
echo "   SELECT indexname, indexdef"
echo "   FROM pg_indexes"
echo "   WHERE tablename IN ('maintenance_schedules', 'maintenance_schedule_history', 'tyres');"
echo ""

echo "=================================================="
echo "Quick SQL Verification Query"
echo "=================================================="
echo ""
echo "Run this in your SQL editor to check all tables:"
echo ""
cat << 'EOF'
-- Check maintenance_schedules columns
SELECT
  'maintenance_schedules' as table_name,
  COUNT(*) as total_columns,
  COUNT(CASE WHEN column_name IN ('title', 'description', 'priority', 'category') THEN 1 END) as new_columns_found
FROM information_schema.columns
WHERE table_name = 'maintenance_schedules';

-- Check maintenance_schedule_history columns
SELECT
  'maintenance_schedule_history' as table_name,
  COUNT(*) as total_columns,
  COUNT(CASE WHEN column_name IN ('job_card_id', 'inspection_id', 'completed_by') THEN 1 END) as new_columns_found
FROM information_schema.columns
WHERE table_name = 'maintenance_schedule_history';

-- Check tyres columns
SELECT
  'tyres' as table_name,
  COUNT(*) as total_columns,
  COUNT(CASE WHEN column_name IN ('current_fleet_position', 'position') THEN 1 END) as new_columns_found
FROM information_schema.columns
WHERE table_name = 'tyres';
EOF
echo ""

echo "=================================================="
echo "Expected Results:"
echo "=================================================="
echo "maintenance_schedules: new_columns_found should be 4"
echo "maintenance_schedule_history: new_columns_found should be 3"
echo "tyres: new_columns_found should be 2"
echo ""
