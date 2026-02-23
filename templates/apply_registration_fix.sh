#!/bin/bash
# Apply migration to fix registration_no column length in fleet tyres tables

echo "🔧 Applying migration to fix registration_no VARCHAR(12) constraint..."
echo "This will change registration_no columns from VARCHAR(12) to TEXT"
echo "to accommodate longer registration numbers like 'ADZ9011/ADZ9010'"
echo ""

# Check if we're in the right directory
if [ ! -d "supabase/migrations" ]; then
    echo "❌ Error: supabase/migrations directory not found"
    echo "Please run this script from the project root directory"
    exit 1
fi

# Get the migration file
MIGRATION_FILE="supabase/migrations/20260116000000_fix_registration_no_length.sql"

if [ ! -f "$MIGRATION_FILE" ]; then
    echo "❌ Error: Migration file not found: $MIGRATION_FILE"
    exit 1
fi

echo "📄 Migration file found: $MIGRATION_FILE"
echo ""
echo "⚠️  IMPORTANT: This migration will alter the following tables:"
echo "   - All fleet_*_tyres tables (26 tables)"
echo "   - Column: registration_no"
echo "   - Change: VARCHAR(12) → TEXT"
echo ""
read -p "Do you want to proceed? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Migration cancelled"
    exit 0
fi

echo ""
echo "🚀 Applying migration..."
echo ""

# Read and execute the SQL file
cat "$MIGRATION_FILE"

echo ""
echo "📋 To apply this migration to your Supabase database:"
echo "1. Go to your Supabase project dashboard"
echo "2. Navigate to SQL Editor"
echo "3. Copy and paste the migration SQL from $MIGRATION_FILE"
echo "4. Click 'Run' to execute"
echo ""
echo "Or use the Supabase CLI:"
echo "  supabase db push"
echo ""
echo "✅ Migration script prepared successfully"
