#!/bin/bash

# ============================================================================
# FIX WIALON INTEGRATION - COMPLETE SETUP SCRIPT
# ============================================================================
# This script:
# 1. Creates the wialon_vehicles table
# 2. Fixes the loads.assigned_vehicle_id FK constraint
# 3. Verifies the setup
# ============================================================================

set -e  # Exit on error

echo "🚀 Starting Wialon Integration Fix..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "supabase/migrations/20251104120000_create_wialon_vehicles.sql" ]; then
  echo -e "${RED}❌ Error: Migration file not found!${NC}"
  echo "Please run this script from the project root directory."
  exit 1
fi

echo -e "${YELLOW}📋 Instructions:${NC}"
echo "This script will generate SQL commands that you need to run in Supabase SQL Editor."
echo "Go to: https://supabase.com/dashboard/project/wxvhkljrbcpcgpgdqhsp/sql"
echo ""
echo -e "${YELLOW}Press Enter to continue...${NC}"
read

echo ""
echo "============================================================================"
echo "STEP 1: Create wialon_vehicles table"
echo "============================================================================"
echo ""
echo -e "${GREEN}Copy and run this SQL in Supabase SQL Editor:${NC}"
echo ""
cat supabase/migrations/20251104120000_create_wialon_vehicles.sql
echo ""
echo "============================================================================"
echo ""
echo -e "${YELLOW}Have you run the above SQL? (y/n)${NC}"
read -r response
if [ "$response" != "y" ]; then
  echo -e "${RED}❌ Aborted. Please run the SQL first.${NC}"
  exit 1
fi

echo ""
echo "============================================================================"
echo "STEP 2: Fix loads table FK constraint"
echo "============================================================================"
echo ""
echo -e "${GREEN}Copy and run this SQL in Supabase SQL Editor:${NC}"
echo ""
cat fix_loads_fk_constraint.sql
echo ""
echo "============================================================================"
echo ""
echo -e "${YELLOW}Have you run the above SQL? (y/n)${NC}"
read -r response
if [ "$response" != "y" ]; then
  echo -e "${RED}❌ Aborted. Please run the SQL first.${NC}"
  exit 1
fi

echo ""
echo "============================================================================"
echo "STEP 3: Regenerate TypeScript types"
echo "============================================================================"
echo ""
echo "Running: npx supabase gen types typescript..."
npx supabase gen types typescript \
  --project-id wxvhkljrbcpcgpgdqhsp \
  > src/integrations/supabase/types.ts

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ TypeScript types regenerated successfully!${NC}"
else
  echo -e "${RED}❌ Failed to regenerate types${NC}"
  exit 1
fi

echo ""
echo "============================================================================"
echo "STEP 4: Deploy Edge Function (Optional - if not already deployed)"
echo "============================================================================"
echo ""
echo -e "${YELLOW}Do you want to deploy the get-wialon-token Edge Function now? (y/n)${NC}"
read -r response
if [ "$response" = "y" ]; then
  echo "Deploying Edge Function..."
  npx supabase functions deploy get-wialon-token

  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Edge Function deployed successfully!${NC}"
  else
    echo -e "${RED}❌ Failed to deploy Edge Function${NC}"
    echo "You can deploy it later with: npx supabase functions deploy get-wialon-token"
  fi
else
  echo "Skipped. You can deploy it later with: npx supabase functions deploy get-wialon-token"
fi

echo ""
echo "============================================================================"
echo -e "${GREEN}✅ WIALON INTEGRATION FIX COMPLETE!${NC}"
echo "============================================================================"
echo ""
echo "Next steps:"
echo "1. Refresh your browser"
echo "2. Go to Load Management page"
echo "3. Try assigning a load to a Wialon vehicle"
echo ""
echo "The following should now work:"
echo "  ✅ No CORS errors"
echo "  ✅ No FK constraint violations (23503)"
echo "  ✅ No 400 Bad Request errors"
echo "  ✅ No PGRST116 errors"
echo "  ✅ Loads can be assigned to Wialon GPS vehicles"
echo ""
