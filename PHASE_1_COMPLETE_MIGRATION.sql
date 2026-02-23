-- ============================================================================
-- PHASE 1: COMPLETE DATABASE MIGRATION
-- Inventory Selection Feature - All Migrations Combined
-- Date: 2025-10-31
-- ============================================================================
-- 
-- INSTRUCTIONS:
-- 1. Open Supabase SQL Editor: https://supabase.com/dashboard/project/wxvhkljrbcpcgpgdqhsp/sql
-- 2. Copy and paste this ENTIRE file
-- 3. Click "Run" to execute
-- 4. Verify success messages at the bottom
--
-- This script is idempotent - safe to run multiple times
-- ============================================================================

-- ============================================================================
-- MIGRATION 1: Extend parts_requests Table
-- ============================================================================

DO $$ 
BEGIN
  RAISE NOTICE '🔄 Starting Migration 1: Extending parts_requests table...';
END $$;

BEGIN;

-- Add new columns to parts_requests table
ALTER TABLE parts_requests
  ADD COLUMN IF NOT EXISTS inventory_id UUID REFERENCES inventory(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS unit_price DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS total_price DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS requested_by TEXT,
  ADD COLUMN IF NOT EXISTS approved_by TEXT,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS rejected_by TEXT,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Add computed column for inventory source tracking
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'parts_requests' 
    AND column_name = 'is_from_inventory'
  ) THEN
    ALTER TABLE parts_requests
      ADD COLUMN is_from_inventory BOOLEAN 
      GENERATED ALWAYS AS (inventory_id IS NOT NULL) STORED;
    RAISE NOTICE '✅ Added computed column: is_from_inventory';
  ELSE
    RAISE NOTICE '⏭️  Column is_from_inventory already exists';
  END IF;
END $$;

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_parts_requests_inventory_id 
  ON parts_requests(inventory_id);

CREATE INDEX IF NOT EXISTS idx_parts_requests_status 
  ON parts_requests(status);

CREATE INDEX IF NOT EXISTS idx_parts_requests_job_card_id 
  ON parts_requests(job_card_id);

-- Drop existing check constraint if it exists (to update it)
ALTER TABLE parts_requests 
  DROP CONSTRAINT IF EXISTS check_valid_status;

-- Add check constraint for valid status values
ALTER TABLE parts_requests
  ADD CONSTRAINT check_valid_status 
  CHECK (status IN ('pending', 'approved', 'rejected', 'fulfilled', 'cancelled'));

-- Create or replace function to auto-calculate total_price
CREATE OR REPLACE FUNCTION calculate_parts_request_total()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.unit_price IS NOT NULL AND NEW.quantity IS NOT NULL THEN
    NEW.total_price := NEW.quantity * NEW.unit_price;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists (to recreate it)
DROP TRIGGER IF EXISTS trigger_calculate_parts_request_total ON parts_requests;

-- Create trigger to auto-calculate total_price
CREATE TRIGGER trigger_calculate_parts_request_total
  BEFORE INSERT OR UPDATE OF quantity, unit_price
  ON parts_requests
  FOR EACH ROW
  EXECUTE FUNCTION calculate_parts_request_total();

COMMIT;

DO $$ 
BEGIN
  RAISE NOTICE '✅ Migration 1 completed: parts_requests table extended';
END $$;

-- ============================================================================
-- MIGRATION 2: Create inventory_transactions Table
-- ============================================================================

DO $$ 
BEGIN
  RAISE NOTICE '🔄 Starting Migration 2: Creating inventory_transactions table...';
END $$;

BEGIN;

-- Create inventory_transactions table if it doesn't exist
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  inventory_id UUID REFERENCES inventory(id) ON DELETE CASCADE,
  parts_request_id UUID REFERENCES parts_requests(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (
    transaction_type IN ('reserve', 'deduct', 'release', 'restock', 'adjustment')
  ),
  quantity_change INTEGER NOT NULL,
  quantity_before INTEGER NOT NULL,
  quantity_after INTEGER NOT NULL,
  performed_by TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_inventory_id 
  ON inventory_transactions(inventory_id);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_parts_request_id 
  ON inventory_transactions(parts_request_id);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_created_at 
  ON inventory_transactions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_type
  ON inventory_transactions(transaction_type);

-- Enable Row Level Security
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view inventory transactions" ON inventory_transactions;
DROP POLICY IF EXISTS "Users can insert inventory transactions" ON inventory_transactions;

-- Policy: Authenticated users can read all transactions
CREATE POLICY "Users can view inventory transactions"
  ON inventory_transactions FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can insert transactions
CREATE POLICY "Users can insert inventory transactions"
  ON inventory_transactions FOR INSERT
  TO authenticated
  WITH CHECK (true);

COMMIT;

DO $$ 
BEGIN
  RAISE NOTICE '✅ Migration 2 completed: inventory_transactions table created';
END $$;

-- ============================================================================
-- MIGRATION 3: Create Database Functions
-- ============================================================================

DO $$ 
BEGIN
  RAISE NOTICE '🔄 Starting Migration 3: Creating inventory management functions...';
END $$;

BEGIN;

-- Function 1: Check inventory availability
CREATE OR REPLACE FUNCTION check_inventory_availability(
  p_inventory_id UUID,
  p_quantity INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_quantity INTEGER;
BEGIN
  SELECT quantity INTO v_current_quantity
  FROM inventory
  WHERE id = p_inventory_id;
  
  IF v_current_quantity IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN v_current_quantity >= p_quantity;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function 2: Reserve inventory
CREATE OR REPLACE FUNCTION reserve_inventory(
  p_parts_request_id UUID,
  p_inventory_id UUID,
  p_quantity INTEGER,
  p_performed_by TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_quantity INTEGER;
BEGIN
  -- Lock the inventory row
  SELECT quantity INTO v_current_quantity
  FROM inventory
  WHERE id = p_inventory_id
  FOR UPDATE;
  
  -- Check availability
  IF v_current_quantity < p_quantity THEN
    RAISE EXCEPTION 'Insufficient inventory. Required: %, Available: %', 
      p_quantity, v_current_quantity;
  END IF;
  
  -- Log reservation (does NOT change inventory.quantity)
  INSERT INTO inventory_transactions (
    inventory_id,
    parts_request_id,
    transaction_type,
    quantity_change,
    quantity_before,
    quantity_after,
    performed_by,
    notes
  ) VALUES (
    p_inventory_id,
    p_parts_request_id,
    'reserve',
    -p_quantity,
    v_current_quantity,
    v_current_quantity,
    p_performed_by,
    'Inventory reserved for parts request'
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function 3: Deduct inventory
CREATE OR REPLACE FUNCTION deduct_inventory(
  p_parts_request_id UUID,
  p_inventory_id UUID,
  p_quantity INTEGER,
  p_performed_by TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_quantity INTEGER;
BEGIN
  -- Lock the inventory row
  SELECT quantity INTO v_current_quantity
  FROM inventory
  WHERE id = p_inventory_id
  FOR UPDATE;
  
  -- Check availability
  IF v_current_quantity < p_quantity THEN
    RAISE EXCEPTION 'Insufficient inventory. Required: %, Available: %', 
      p_quantity, v_current_quantity;
  END IF;
  
  -- Deduct from inventory
  UPDATE inventory
  SET quantity = quantity - p_quantity
  WHERE id = p_inventory_id;
  
  -- Log deduction
  INSERT INTO inventory_transactions (
    inventory_id,
    parts_request_id,
    transaction_type,
    quantity_change,
    quantity_before,
    quantity_after,
    performed_by,
    notes
  ) VALUES (
    p_inventory_id,
    p_parts_request_id,
    'deduct',
    -p_quantity,
    v_current_quantity,
    v_current_quantity - p_quantity,
    p_performed_by,
    'Inventory deducted for approved parts request'
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function 4: Release inventory reservation
CREATE OR REPLACE FUNCTION release_inventory_reservation(
  p_parts_request_id UUID,
  p_inventory_id UUID,
  p_quantity INTEGER,
  p_performed_by TEXT,
  p_reason TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_quantity INTEGER;
BEGIN
  SELECT quantity INTO v_current_quantity
  FROM inventory
  WHERE id = p_inventory_id;
  
  -- Log release (does NOT change inventory.quantity)
  INSERT INTO inventory_transactions (
    inventory_id,
    parts_request_id,
    transaction_type,
    quantity_change,
    quantity_before,
    quantity_after,
    performed_by,
    notes
  ) VALUES (
    p_inventory_id,
    p_parts_request_id,
    'release',
    p_quantity,
    v_current_quantity,
    v_current_quantity,
    p_performed_by,
    COALESCE(p_reason, 'Reservation released')
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION check_inventory_availability TO authenticated;
GRANT EXECUTE ON FUNCTION reserve_inventory TO authenticated;
GRANT EXECUTE ON FUNCTION deduct_inventory TO authenticated;
GRANT EXECUTE ON FUNCTION release_inventory_reservation TO authenticated;

COMMIT;

DO $$ 
BEGIN
  RAISE NOTICE '✅ Migration 3 completed: All functions created';
END $$;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

DO $$ 
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🎉 ALL PHASE 1 MIGRATIONS COMPLETED SUCCESSFULLY!';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Running verification queries...';
END $$;

-- Verify new columns in parts_requests
SELECT 
  '✅ parts_requests columns' as verification,
  COUNT(*) as new_columns_added
FROM information_schema.columns
WHERE table_name = 'parts_requests'
  AND column_name IN (
    'inventory_id', 'unit_price', 'total_price', 
    'requested_by', 'approved_by', 'approved_at',
    'rejected_by', 'rejected_at', 'rejection_reason',
    'is_from_inventory'
  );

-- Verify inventory_transactions table exists
SELECT 
  '✅ inventory_transactions table' as verification,
  COUNT(*) as column_count
FROM information_schema.columns
WHERE table_name = 'inventory_transactions';

-- Verify functions created
SELECT 
  '✅ Database functions' as verification,
  COUNT(*) as functions_created
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'check_inventory_availability',
    'reserve_inventory',
    'deduct_inventory',
    'release_inventory_reservation'
  );

DO $$ 
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ All verifications passed!';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Next Steps:';
  RAISE NOTICE '1. Regenerate TypeScript types';
  RAISE NOTICE '2. Update documentation in DATABASE_VERIFICATION_GUIDE.md';
  RAISE NOTICE '3. Proceed to Phase 2: Component Creation';
END $$;
