#!/bin/bash

# Script to apply the expected timestamps and calendar sync migration
# This adds expected arrival/departure times and ensures loads show on calendar

echo "🚀 Applying expected timestamps and calendar sync migration..."
echo ""
echo "This migration will:"
echo "  1. Add 4 new expected timestamp fields to loads table"
echo "  2. Create bidirectional sync between loads and calendar_events"
echo "  3. Backfill calendar events for existing loads"
echo "  4. Create a helpful view for calendar display"
echo "  5. Ensure loads automatically appear on the calendar"
echo ""

# Run the migration
cat supabase/migrations/20251112000001_add_expected_timestamps_and_calendar_sync.sql | \
  psql "postgresql://postgres.wxvhkljrbcpcgpgdqhsp:${SUPABASE_DB_PASSWORD}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Migration applied successfully!"
  echo ""
  echo "📝 What was added:"
  echo "  - expected_arrival_at_pickup: Scheduled arrival at loading point"
  echo "  - expected_departure_from_pickup: Scheduled departure after loading"
  echo "  - expected_arrival_at_delivery: Scheduled arrival at delivery point"
  echo "  - expected_departure_from_delivery: Scheduled departure after offloading"
  echo ""
  echo "🔄 Automatic syncing enabled:"
  echo "  - New loads automatically create calendar events"
  echo "  - Updating load dates automatically updates calendar"
  echo "  - Deleting loads automatically removes calendar events"
  echo ""
  echo "📅 All existing loads have been synced to the calendar!"
  echo ""
  echo "Next steps:"
  echo "  1. Regenerate TypeScript types: npm run generate-types"
  echo "  2. Test creating a new load with expected times"
  echo "  3. Check that it appears on the Load Planning Calendar"
else
  echo ""
  echo "❌ Migration failed. Please check the error above."
  exit 1
fi
