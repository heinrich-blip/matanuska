# 🚀 Phase 5: Deployment & Documentation

**Phase:** 5 of 5 (Final Phase)  
**Timeline:** Day 6-7 (6-8 hours)  
**Prerequisites:** Phases 1-4 complete and tested  
**Completion Criteria:** Production deployment successful, documentation complete

---

## 📋 Phase Overview

This final phase focuses on **production deployment**, **user documentation**, and **knowledge transfer**. We'll prepare the system for production use, create comprehensive documentation, and establish monitoring and support procedures.

**What This Phase Delivers:**

- ✅ Production-ready deployment
- ✅ User guide and training materials
- ✅ Technical documentation
- ✅ Rollback plan
- ✅ Monitoring setup
- ✅ Support procedures

---

## 🎯 Objectives

1. Deploy to production safely
2. Create comprehensive user documentation
3. Develop training materials
4. Establish monitoring and alerting
5. Create rollback procedures
6. Plan knowledge transfer
7. Set success metrics

---

## 📊 Pre-Deployment Checklist

### ✅ Technical Readiness:

- [ ] All phases 1-4 completed
- [ ] All tests passing
- [ ] No critical bugs
- [ ] Code reviewed
- [ ] Performance tested
- [ ] Security reviewed
- [ ] Backup procedures verified
- [ ] Rollback plan documented

### ✅ Business Readiness:

- [ ] Stakeholder sign-off
- [ ] User acceptance testing complete
- [ ] Training scheduled
- [ ] Support team briefed
- [ ] Communication plan ready
- [ ] Maintenance window scheduled

### ✅ Data Readiness:

- [ ] Production database backed up
- [ ] Sample data prepared
- [ ] Data migration tested
- [ ] Rollback tested

---

## 🚀 Deployment Plan

### Step 1: Pre-Deployment Backup

**Objective:** Ensure we can rollback if needed

```bash
# 1. Backup Supabase database
# Via Supabase Dashboard:
# Settings → Database → Database Backups → Create Backup

# 2. Tag current production code
git tag -a v1.0.0-before-inventory-feature -m "Before inventory selection feature"
git push origin v1.0.0-before-inventory-feature

# 3. Export current inventory data
psql $PROD_DATABASE_URL -c "\COPY inventory TO 'inventory_backup.csv' CSV HEADER;"
psql $PROD_DATABASE_URL -c "\COPY parts_requests TO 'parts_requests_backup.csv' CSV HEADER;"

# 4. Document current state
echo "Backup completed at: $(date)" >> deployment_log.txt
echo "Database size: $(psql $PROD_DATABASE_URL -t -c 'SELECT pg_size_pretty(pg_database_size(current_database()));')" >> deployment_log.txt
```

---

### Step 2: Deploy Database Migrations

**Objective:** Apply database changes to production

**⚠️ IMPORTANT:** Run during low-traffic period (e.g., 2 AM - 4 AM)

```sql
-- Run these in order in Supabase Production SQL Editor

-- ========================================
-- MIGRATION 1: Extend parts_requests table
-- ========================================
BEGIN;

-- Add columns
ALTER TABLE parts_requests
  ADD COLUMN IF NOT EXISTS inventory_id UUID REFERENCES inventory(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS unit_price DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS total_price DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS requested_by TEXT,
  ADD COLUMN IF NOT EXISTS approved_by TEXT,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS rejected_by TEXT,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS is_from_inventory BOOLEAN
    GENERATED ALWAYS AS (inventory_id IS NOT NULL) STORED;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_parts_requests_inventory_id ON parts_requests(inventory_id);
CREATE INDEX IF NOT EXISTS idx_parts_requests_status ON parts_requests(status);

-- Add constraints
ALTER TABLE parts_requests
  DROP CONSTRAINT IF EXISTS check_valid_status;
ALTER TABLE parts_requests
  ADD CONSTRAINT check_valid_status
  CHECK (status IN ('pending', 'approved', 'rejected', 'fulfilled', 'cancelled'));

-- Add trigger
CREATE OR REPLACE FUNCTION calculate_parts_request_total()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.unit_price IS NOT NULL AND NEW.quantity IS NOT NULL THEN
    NEW.total_price := NEW.quantity * NEW.unit_price;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calculate_parts_request_total ON parts_requests;
CREATE TRIGGER trigger_calculate_parts_request_total
  BEFORE INSERT OR UPDATE OF quantity, unit_price
  ON parts_requests
  FOR EACH ROW
  EXECUTE FUNCTION calculate_parts_request_total();

COMMIT;

-- Verify
SELECT column_name FROM information_schema.columns
WHERE table_name = 'parts_requests' AND column_name = 'inventory_id';

-- ========================================
-- MIGRATION 2: Create inventory_transactions
-- ========================================
BEGIN;

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

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_inventory_id
  ON inventory_transactions(inventory_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_parts_request_id
  ON inventory_transactions(parts_request_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_created_at
  ON inventory_transactions(created_at DESC);

ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view inventory transactions"
  ON inventory_transactions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert inventory transactions"
  ON inventory_transactions FOR INSERT TO authenticated WITH CHECK (true);

COMMIT;

-- Verify
SELECT table_name FROM information_schema.tables
WHERE table_name = 'inventory_transactions';

-- ========================================
-- MIGRATION 3: Create database functions
-- ========================================
BEGIN;

-- Function 1: Check availability
CREATE OR REPLACE FUNCTION check_inventory_availability(
  p_inventory_id UUID,
  p_quantity INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  v_current_quantity INTEGER;
BEGIN
  SELECT quantity INTO v_current_quantity
  FROM inventory WHERE id = p_inventory_id;

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
) RETURNS BOOLEAN AS $$
DECLARE
  v_current_quantity INTEGER;
BEGIN
  SELECT quantity INTO v_current_quantity
  FROM inventory WHERE id = p_inventory_id FOR UPDATE;

  IF v_current_quantity < p_quantity THEN
    RAISE EXCEPTION 'Insufficient inventory. Required: %, Available: %',
      p_quantity, v_current_quantity;
  END IF;

  INSERT INTO inventory_transactions (
    inventory_id, parts_request_id, transaction_type,
    quantity_change, quantity_before, quantity_after,
    performed_by, notes
  ) VALUES (
    p_inventory_id, p_parts_request_id, 'reserve',
    -p_quantity, v_current_quantity, v_current_quantity,
    p_performed_by, 'Inventory reserved for parts request'
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
) RETURNS BOOLEAN AS $$
DECLARE
  v_current_quantity INTEGER;
BEGIN
  SELECT quantity INTO v_current_quantity
  FROM inventory WHERE id = p_inventory_id FOR UPDATE;

  IF v_current_quantity < p_quantity THEN
    RAISE EXCEPTION 'Insufficient inventory. Required: %, Available: %',
      p_quantity, v_current_quantity;
  END IF;

  UPDATE inventory
  SET quantity = quantity - p_quantity
  WHERE id = p_inventory_id;

  INSERT INTO inventory_transactions (
    inventory_id, parts_request_id, transaction_type,
    quantity_change, quantity_before, quantity_after,
    performed_by, notes
  ) VALUES (
    p_inventory_id, p_parts_request_id, 'deduct',
    -p_quantity, v_current_quantity, v_current_quantity - p_quantity,
    p_performed_by, 'Inventory deducted for approved parts request'
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function 4: Release reservation
CREATE OR REPLACE FUNCTION release_inventory_reservation(
  p_parts_request_id UUID,
  p_inventory_id UUID,
  p_quantity INTEGER,
  p_performed_by TEXT,
  p_reason TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_current_quantity INTEGER;
BEGIN
  SELECT quantity INTO v_current_quantity
  FROM inventory WHERE id = p_inventory_id;

  INSERT INTO inventory_transactions (
    inventory_id, parts_request_id, transaction_type,
    quantity_change, quantity_before, quantity_after,
    performed_by, notes
  ) VALUES (
    p_inventory_id, p_parts_request_id, 'release',
    p_quantity, v_current_quantity, v_current_quantity,
    p_performed_by, COALESCE(p_reason, 'Reservation released')
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION check_inventory_availability TO authenticated;
GRANT EXECUTE ON FUNCTION reserve_inventory TO authenticated;
GRANT EXECUTE ON FUNCTION deduct_inventory TO authenticated;
GRANT EXECUTE ON FUNCTION release_inventory_reservation TO authenticated;

COMMIT;

-- Verify
SELECT routine_name FROM information_schema.routines
WHERE routine_name IN (
  'check_inventory_availability',
  'reserve_inventory',
  'deduct_inventory',
  'release_inventory_reservation'
);
```

**✅ Verification:**

```sql
-- Test functions work
SELECT check_inventory_availability(
  (SELECT id FROM inventory LIMIT 1),
  1
);
-- Should return TRUE or FALSE

-- Check all migrations applied
SELECT COUNT(*) as new_columns
FROM information_schema.columns
WHERE table_name = 'parts_requests'
  AND column_name IN ('inventory_id', 'unit_price', 'total_price');
-- Should return 3
```

---

### Step 3: Deploy Frontend Code

**Objective:** Deploy React components to production

```bash
# 1. Regenerate types for production
npx supabase gen types typescript --project-id YOUR_PROD_PROJECT_ID > src/integrations/supabase/types.ts

# 2. Run final checks
npm run lint
npm run typecheck
npm run build

# 3. Test production build locally
npm run preview

# 4. Commit and push
git add .
git commit -m "feat: Add inventory selection feature

- Add inventory search dialog
- Implement parts request with inventory linking
- Add approval/rejection workflow
- Implement inventory deduction on approval
- Add transaction audit logging

Closes #XXX"

git push origin main

# 5. Deploy (depends on your hosting)
# For Vercel:
vercel --prod

# For Netlify:
netlify deploy --prod

# For custom server:
# Copy dist/ folder to production server
```

---

### Step 4: Post-Deployment Verification

**Objective:** Ensure everything works in production

```bash
# 1. Check deployment status
curl https://your-app.com/health

# 2. Test critical paths
# - Login
# - View job card
# - Request parts (inventory selection)
# - Approve parts request
# - Check inventory deducted

# 3. Monitor logs
# Check Supabase Logs: Dashboard → Logs
# Check Application Logs: Your hosting provider

# 4. Verify database
psql $PROD_DATABASE_URL -c "
SELECT
  (SELECT COUNT(*) FROM inventory) as inventory_count,
  (SELECT COUNT(*) FROM parts_requests WHERE inventory_id IS NOT NULL) as linked_requests,
  (SELECT COUNT(*) FROM inventory_transactions) as transaction_count;
"
```

**✅ Success Criteria:**

- [ ] Application loads
- [ ] Inventory search works
- [ ] Parts requests can be created
- [ ] Approval workflow functional
- [ ] Inventory updates correctly
- [ ] No console errors
- [ ] No database errors

---

## 📚 User Documentation

### Document 1: User Guide

**File:** `INVENTORY_SELECTION_USER_GUIDE.md`

```markdown
# Inventory Selection User Guide

## Overview

The inventory selection feature allows you to request parts from existing inventory with real-time stock validation and automatic price calculation.

## How to Request Parts

### Method 1: Select from Inventory (Recommended)

1. Open a job card
2. Click **"Request Parts"** button
3. Click **"Browse Inventory"** button
4. **Search** for the part you need:
   - Type part name, part number, or supplier
   - Use category filter to narrow results
   - Use stock filter to see availability
5. **Select** the part from the list
6. The form will auto-populate:
   - Part Name
   - Part Number
   - Unit Price
   - Available Stock
7. **Enter quantity** needed
8. System shows:
   - Total price calculation
   - Stock availability status
   - ⚠️ Warning if stock is low
   - ❌ Error if insufficient stock
9. **Add notes** (optional)
10. Click **"Submit Request"**

### Method 2: Manual Entry

1. Open a job card
2. Click **"Request Parts"**
3. **Don't** click "Browse Inventory"
4. Manually type:
   - Part Name (required)
   - Part Number (optional)
   - Quantity (required)
   - Notes (optional)
5. Click **"Submit Request"**

_Note: Manual entry is useful for custom parts not in inventory_

## Approving Parts Requests (Managers Only)

1. Open job card with pending parts requests
2. Review request details:
   - Part name and quantity
   - Price (if from inventory)
   - Availability
3. Click **"Approve"** or **"Reject"**
4. For approvals:
   - Confirm the action
   - Inventory will be automatically deducted
5. For rejections:
   - Enter a reason (required)
   - Reservation will be released

## Stock Status Indicators

| Indicator       | Meaning                       |
| --------------- | ----------------------------- |
| 🟢 In Stock     | Plenty of stock available     |
| 🟡 Low Stock    | Stock below minimum threshold |
| 🔴 Out of Stock | No stock available            |

## Tips & Best Practices

✅ **DO:**

- Search inventory before manual entry
- Check stock availability before requesting
- Add notes to explain special requirements
- Approve requests promptly

❌ **DON'T:**

- Request more than available stock
- Create duplicate requests
- Approve without verifying part details

## Troubleshooting

**Problem:** Can't find part in inventory
**Solution:** Try different search terms or use manual entry

**Problem:** "Insufficient stock" error
**Solution:** Reduce quantity or wait for restock

**Problem:** Approval button disabled
**Solution:** Ensure stock is available

## Need Help?

Contact IT support: support@carcraft.co
```

---

### Document 2: Quick Reference Card

**File:** `QUICK_REFERENCE.md`

```markdown
# Quick Reference: Inventory Selection

## Request Parts Flow
```

Job Card → Request Parts → Browse Inventory → Search → Select → Enter Qty → Submit

```

## Keyboard Shortcuts

- `Ctrl+K`: Open search (when in inventory dialog)
- `Enter`: Select highlighted item
- `Esc`: Close dialog

## Status Badges

- **Pending** ⏱️ - Awaiting approval
- **Approved** ✅ - Inventory deducted
- **Rejected** ❌ - Request denied
- **Fulfilled** 📦 - Parts delivered

## Search Tips

| Want to find... | Search for... |
|----------------|---------------|
| Brake parts | "brake" |
| Specific part number | "BP-FRONT-001" |
| All fluids | Category: Fluids |
| Low stock items | Stock Filter: Low Stock |

## Common Actions

### Request from Inventory
`Job Card → Request Parts → Browse → Select → Qty → Submit`

### Manual Request
`Job Card → Request Parts → Type Details → Submit`

### Approve Request
`Job Card → Pending Request → Approve → Confirm`

### Reject Request
`Job Card → Pending Request → Reject → Enter Reason → Confirm`
```

---

## 🎓 Training Plan

### Session 1: Technicians (1 hour)

**Topics:**

1. Overview of new feature (10 min)
2. Demo: Requesting parts from inventory (15 min)
3. Hands-on practice (20 min)
4. Q&A (15 min)

**Materials Needed:**

- Projector/screen
- Test environment access
- Sample job cards
- Handout: Quick Reference Card

---

### Session 2: Managers (30 min)

**Topics:**

1. Approval workflow overview (10 min)
2. Demo: Approving/rejecting requests (10 min)
3. Q&A and best practices (10 min)

---

### Session 3: Inventory Managers (45 min)

**Topics:**

1. Inventory management integration (15 min)
2. Transaction history and reporting (15 min)
3. Stock reconciliation (15 min)

---

## 📊 Monitoring & Alerting

### Key Metrics to Monitor

```sql
-- Daily Parts Request Volume
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_requests,
  COUNT(CASE WHEN inventory_id IS NOT NULL THEN 1 END) as from_inventory,
  COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved
FROM parts_requests
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Inventory Turnover
SELECT
  i.category,
  COUNT(DISTINCT pr.id) as requests,
  SUM(pr.quantity) as total_quantity_requested,
  AVG(i.quantity) as avg_stock_level
FROM inventory i
LEFT JOIN parts_requests pr ON i.id = pr.inventory_id
WHERE pr.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY i.category;

-- Low Stock Alerts
SELECT
  name,
  part_number,
  quantity,
  min_quantity,
  (quantity - min_quantity) as shortage
FROM inventory
WHERE quantity <= min_quantity
ORDER BY shortage;

-- Failed Reservations (errors)
SELECT
  DATE(created_at) as date,
  COUNT(*) as failed_reservations
FROM parts_requests
WHERE status = 'pending'
  AND inventory_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM inventory_transactions
    WHERE parts_request_id = parts_requests.id
  )
GROUP BY DATE(created_at);
```

### Set Up Alerts

**Via Supabase:**

1. Go to Dashboard → Database → Webhooks
2. Create webhook for low stock:

```sql
CREATE OR REPLACE FUNCTION notify_low_stock()
RETURNS trigger AS $$
BEGIN
  IF NEW.quantity <= NEW.min_quantity THEN
    -- Send notification (implement with your notification service)
    PERFORM pg_notify('low_stock', json_build_object(
      'item_id', NEW.id,
      'name', NEW.name,
      'quantity', NEW.quantity,
      'min_quantity', NEW.min_quantity
    )::text);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_low_stock
  AFTER UPDATE OF quantity ON inventory
  FOR EACH ROW
  EXECUTE FUNCTION notify_low_stock();
```

---

## 🔄 Rollback Plan

### If deployment fails:

```bash
# 1. Revert code deployment
git revert HEAD
git push origin main
# Redeploy previous version

# 2. Rollback database (if needed)
# ⚠️ CAUTION: This will lose new data
psql $PROD_DATABASE_URL << 'EOF'
BEGIN;

-- Drop new tables
DROP TABLE IF EXISTS inventory_transactions CASCADE;

-- Remove new columns
ALTER TABLE parts_requests
  DROP COLUMN IF EXISTS inventory_id CASCADE,
  DROP COLUMN IF EXISTS unit_price CASCADE,
  DROP COLUMN IF EXISTS total_price CASCADE,
  DROP COLUMN IF EXISTS requested_by CASCADE,
  DROP COLUMN IF EXISTS approved_by CASCADE,
  DROP COLUMN IF EXISTS approved_at CASCADE,
  DROP COLUMN IF EXISTS rejected_by CASCADE,
  DROP COLUMN IF EXISTS rejected_at CASCADE,
  DROP COLUMN IF EXISTS rejection_reason CASCADE,
  DROP COLUMN IF EXISTS is_from_inventory CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS check_inventory_availability CASCADE;
DROP FUNCTION IF EXISTS reserve_inventory CASCADE;
DROP FUNCTION IF EXISTS deduct_inventory CASCADE;
DROP FUNCTION IF EXISTS release_inventory_reservation CASCADE;
DROP FUNCTION IF EXISTS calculate_parts_request_total CASCADE;

COMMIT;
EOF

# 3. Restore from backup (if rollback not sufficient)
# Use Supabase Dashboard → Database → Backups → Restore
```

---

## 📋 Phase 5 Completion Checklist

### Deployment:

- [ ] Database backup created
- [ ] Code tagged in git
- [ ] Migrations applied to production
- [ ] Frontend deployed
- [ ] Post-deployment verification passed
- [ ] No critical errors in logs

### Documentation:

- [ ] User guide created
- [ ] Quick reference created
- [ ] Technical docs updated
- [ ] Training materials prepared

### Training:

- [ ] Technician training scheduled
- [ ] Manager training scheduled
- [ ] Inventory manager training scheduled
- [ ] Training materials distributed

### Monitoring:

- [ ] Metrics dashboard created
- [ ] Alerts configured
- [ ] Log monitoring active
- [ ] Performance baseline established

### Support:

- [ ] Support team briefed
- [ ] Rollback plan tested
- [ ] Emergency contacts updated
- [ ] Incident response plan ready

---

## 🎉 Project Complete!

**Congratulations!** You've successfully implemented the inventory selection feature from database to deployment.

### Final Review:

**What We Built:**

- ✅ Database schema with audit logging
- ✅ Inventory search with real-time filtering
- ✅ Parts request with stock validation
- ✅ Approval workflow with automatic inventory deduction
- ✅ Transaction history and reporting
- ✅ Comprehensive documentation and training

**Impact:**

- ⚡ Faster parts request processing
- 💰 Accurate cost tracking
- 📊 Better inventory visibility
- 🎯 Reduced errors
- 📈 Improved efficiency

### Success Metrics (Track for 30 days):

| Metric            | Target | Actual |
| ----------------- | ------ | ------ |
| Adoption Rate     | >80%   | \_\_\_ |
| Time Saved        | -50%   | \_\_\_ |
| Error Reduction   | -70%   | \_\_\_ |
| User Satisfaction | >4.5/5 | \_\_\_ |

---

**Project Status:** ✅ **COMPLETE**  
**Deployment Date:** ****\_\_\_****  
**Team:** ****\_\_\_****  
**Next Review:** ****\_\_\_****
