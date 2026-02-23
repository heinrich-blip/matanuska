#!/bin/bash

# Quick deployment script for calendar and timestamp enhancements
# Run this after applying the migration

echo "🚀 Quick Deployment - Calendar & Timestamp Enhancements"
echo ""
echo "Step 1/3: Regenerating TypeScript types..."

npx supabase gen types typescript \
  --project-id wxvhkljrbcpcgpgdqhsp \
  > src/integrations/supabase/types.ts

if [ $? -eq 0 ]; then
  echo "✅ Types regenerated successfully"
else
  echo "❌ Type regeneration failed"
  exit 1
fi

echo ""
echo "Step 2/3: Building application..."

npm run build

if [ $? -eq 0 ]; then
  echo "✅ Build completed successfully"
else
  echo "❌ Build failed"
  exit 1
fi

echo ""
echo "Step 3/3: Checking for errors..."

npm run lint 2>&1 | grep -i "error" && echo "⚠️  Linting errors found" || echo "✅ No linting errors"

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "✨ What's new:"
echo "  • 4 new expected timestamp fields in load creation"
echo "  • Loads automatically appear on calendar"
echo "  • Calendar updates when loads change"
echo "  • All existing loads now visible on calendar"
echo ""
echo "📝 Test it now:"
echo "  1. Create a new load with expected arrival/departure times"
echo "  2. Navigate to Load Planning Calendar"
echo "  3. Verify the load appears with correct dates"
echo ""
echo "📚 Full documentation: LOAD_CALENDAR_TIMESTAMPS_GUIDE.md"
