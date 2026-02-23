# 🧪 Phase 3: Integration & Testing

**Phase:** 3 of 5  
**Timeline:** Day 4 (4-6 hours)  
**Prerequisites:** Phases 1 & 2 complete  
**Completion Criteria:** All flows tested, no critical bugs

---

## 📋 Phase Overview

This phase focuses on **comprehensive testing** of the inventory selection feature. We'll test all user flows, verify database operations, check edge cases, and ensure the system works correctly end-to-end.

**What This Phase Delivers:**

- ✅ All user flows tested and documented
- ✅ Database operations verified
- ✅ Edge cases handled
- ✅ Performance validated
- ✅ Bug fixes applied
- ✅ Test report generated

---

## 🎯 Objectives

1. Test complete user workflows
2. Verify database integrity
3. Check inventory reservation logic
4. Test error handling
5. Validate data consistency
6. Performance testing
7. Document any issues found

---

## 📊 Pre-Testing Checklist

### ✅ Before You Start:

- [ ] Phase 1 completed (database setup)
- [ ] Phase 2 completed (components created)
- [ ] Development server running
- [ ] Sample data exists in inventory table
- [ ] Browser dev tools open (Console, Network, Database)
- [ ] Notepad ready for documenting issues

### 🔍 Environment Check:

```bash
# Check server running
curl http://localhost:5173

# Check Supabase connection
psql $DATABASE_URL -c "SELECT COUNT(*) FROM inventory;"

# Check sample data
psql $DATABASE_URL -c "SELECT name, quantity FROM inventory LIMIT 5;"
```

---

## 🧪 Test Suite 1: Core User Flows

### Test 1.1: Select from Inventory - Happy Path

**Objective:** Verify basic flow works end-to-end

**Steps:**

1. Navigate to any job card page
2. Click "Request Parts" button
3. Click "Browse Inventory" button
4. Search for "brake"
5. Select "Brake Pads - Front"
6. Verify form auto-populated:
   - Part Name: "Brake Pads - Front"
   - Part Number: "BP-FRONT-001"
   - Unit Price: Visible
   - Stock: "X units available"
7. Enter quantity: 2
8. Verify total price calculated: (2 × unit_price)
9. Add notes: "For routine maintenance"
10. Click "Submit Request"
11. Verify success toast appears
12. Verify dialog closes
13. Verify parts table refreshes
14. Verify new request appears in table

**Expected Result:** ✅ Parts request created with inventory link

**Database Verification:**

```sql
-- Check parts_request created
SELECT
  part_name,
  quantity,
  inventory_id,
  unit_price,
  total_price,
  is_from_inventory
FROM parts_requests
ORDER BY created_at DESC
LIMIT 1;

-- Check inventory_transactions logged
SELECT
  transaction_type,
  quantity_change,
  quantity_before,
  quantity_after,
  performed_by
FROM inventory_transactions
ORDER BY created_at DESC
LIMIT 1;
```

**Expected Database State:**

- `parts_requests.inventory_id` = UUID (not null)
- `parts_requests.unit_price` = 450.00 (or actual price)
- `parts_requests.total_price` = quantity × unit_price
- `parts_requests.is_from_inventory` = true
- `inventory_transactions.transaction_type` = 'reserve'
- `inventory.quantity` = unchanged (reservation doesn't deduct)

**Status:** [ ] Pass [ ] Fail  
**Notes:**

---

### Test 1.2: Manual Entry - Backward Compatibility

**Objective:** Verify manual entry still works

**Steps:**

1. Open job card
2. Click "Request Parts"
3. Do NOT click "Browse Inventory"
4. Manually enter:
   - Part Name: "Custom Part XYZ"
   - Part Number: "CUSTOM-001"
   - Quantity: 3
   - Notes: "Special order"
5. Verify NO stock alert shown
6. Verify NO price calculation
7. Click "Submit Request"
8. Verify success toast
9. Verify request created

**Expected Result:** ✅ Parts request created without inventory link

**Database Verification:**

```sql
SELECT
  part_name,
  quantity,
  inventory_id,
  unit_price,
  is_from_inventory
FROM parts_requests
WHERE part_name = 'Custom Part XYZ';
```

**Expected Database State:**

- `parts_requests.inventory_id` = null
- `parts_requests.unit_price` = null
- `parts_requests.is_from_inventory` = false
- NO inventory_transactions record created

**Status:** [ ] Pass [ ] Fail  
**Notes:**

---

### Test 1.3: Insufficient Stock Handling

**Objective:** Verify system prevents over-requesting

**Steps:**

1. Open job card
2. Request parts
3. Browse inventory
4. Find item with low stock (e.g., 5 units)
5. Select that item
6. Enter quantity: 10 (more than available)
7. Verify RED alert appears: "Insufficient stock! Only 5 units available"
8. Verify submit button DISABLED
9. Reduce quantity to 5
10. Verify alert turns GREEN: "In stock: 5 units available"
11. Verify submit button ENABLED
12. Submit request
13. Verify success

**Expected Result:** ✅ System prevents over-requesting

**Status:** [ ] Pass [ ] Fail  
**Notes:**

---

### Test 1.4: Low Stock Warning

**Objective:** Verify low stock warning shows

**Steps:**

1. Find inventory item near min_quantity
2. Request parts using that item
3. Enter quantity that leaves stock near minimum
4. Verify YELLOW/ORANGE alert: "Low stock warning: X units available"
5. Verify submit still ENABLED
6. Submit successfully

**Expected Result:** ✅ Warning shown but submission allowed

**Status:** [ ] Pass [ ] Fail  
**Notes:**

---

## 🧪 Test Suite 2: Search & Filter

### Test 2.1: Text Search

**Objective:** Verify search finds items correctly

**Test Cases:**

| Search Term     | Should Find              | Should NOT Find   |
| --------------- | ------------------------ | ----------------- |
| "brake"         | Brake Pads               | Oil, Filters      |
| "oil"           | Engine Oil               | Brake Pads        |
| "BP-FRONT"      | Brake Pads - Front       | Brake Pads - Rear |
| "Auto Parts Co" | Items from that supplier | Other suppliers   |

**Steps for each:**

1. Open inventory search
2. Type search term
3. Verify only matching items appear
4. Verify result count updates
5. Clear search
6. Verify all items return

**Status:** [ ] Pass [ ] Fail  
**Notes:**

---

### Test 2.2: Category Filter

**Objective:** Verify category filtering works

**Steps:**

1. Open inventory search
2. Note total item count
3. Select category: "Brakes"
4. Verify only brake items shown
5. Note filtered count
6. Change to "Fluids"
7. Verify only fluid items shown
8. Change to "All Categories"
9. Verify all items return

**Expected Result:** ✅ Filtering accurate

**Status:** [ ] Pass [ ] Fail  
**Notes:**

---

### Test 2.3: Stock Level Filter

**Objective:** Verify stock filtering works

**Test Cases:**

| Filter           | Should Show                 |
| ---------------- | --------------------------- |
| All Stock Levels | Everything                  |
| In Stock         | quantity > min_quantity     |
| Low Stock        | 0 < quantity ≤ min_quantity |

**Steps for each:**

1. Select filter
2. Verify items match criteria
3. Check a few items manually in database

**Verification Query:**

```sql
-- Check stock levels
SELECT
  name,
  quantity,
  min_quantity,
  CASE
    WHEN quantity = 0 THEN 'Out of Stock'
    WHEN quantity <= min_quantity THEN 'Low Stock'
    ELSE 'In Stock'
  END as stock_status
FROM inventory
ORDER BY quantity;
```

**Status:** [ ] Pass [ ] Fail  
**Notes:**

---

### Test 2.4: Combined Filters

**Objective:** Verify filters work together

**Steps:**

1. Search for "filter"
2. Select category "Filters"
3. Select stock level "In Stock"
4. Verify results match ALL criteria
5. Change search to "brake"
6. Verify results update (should be none if brake ≠ Filters)

**Expected Result:** ✅ Filters are additive (AND logic)

**Status:** [ ] Pass [ ] Fail  
**Notes:**

---

## 🧪 Test Suite 3: Database Operations

### Test 3.1: Inventory Reservation

**Objective:** Verify reserve_inventory() function works

**Steps:**

1. Note current inventory quantity:

```sql
SELECT id, name, quantity FROM inventory WHERE name = 'Brake Pads - Front';
```

2. Create parts request for 2 units (via UI)

3. Check inventory quantity unchanged:

```sql
SELECT id, name, quantity FROM inventory WHERE name = 'Brake Pads - Front';
```

4. Check transaction logged:

```sql
SELECT * FROM inventory_transactions
WHERE transaction_type = 'reserve'
ORDER BY created_at DESC LIMIT 1;
```

**Expected Result:**

- Inventory quantity UNCHANGED
- Transaction logged with:
  - `transaction_type` = 'reserve'
  - `quantity_change` = -2
  - `quantity_before` = X
  - `quantity_after` = X (same as before)

**Status:** [ ] Pass [ ] Fail  
**Notes:**

---

### Test 3.2: Price Calculation Trigger

**Objective:** Verify total_price auto-calculated

**Steps:**

1. Insert test record:

```sql
INSERT INTO parts_requests (
  part_name,
  quantity,
  unit_price,
  job_card_id,
  status
) VALUES (
  'Test Part',
  3,
  100.50,
  (SELECT id FROM job_cards LIMIT 1),
  'pending'
) RETURNING *;
```

2. Check total_price:

```sql
SELECT quantity, unit_price, total_price
FROM parts_requests
WHERE part_name = 'Test Part';
```

**Expected Result:**

- `total_price` = 301.50 (3 × 100.50)

**Cleanup:**

```sql
DELETE FROM parts_requests WHERE part_name = 'Test Part';
```

**Status:** [ ] Pass [ ] Fail  
**Notes:**

---

### Test 3.3: Computed Column is_from_inventory

**Objective:** Verify computed column works

**Test Cases:**

| Condition                | Expected is_from_inventory |
| ------------------------ | -------------------------- |
| inventory_id IS NOT NULL | true                       |
| inventory_id IS NULL     | false                      |

**Verification:**

```sql
SELECT
  part_name,
  inventory_id,
  is_from_inventory
FROM parts_requests
ORDER BY created_at DESC
LIMIT 10;
```

**Status:** [ ] Pass [ ] Fail  
**Notes:**

---

## 🧪 Test Suite 4: Edge Cases & Error Handling

### Test 4.1: Empty Search Results

**Steps:**

1. Search for: "xyznonexistent"
2. Verify empty state shown
3. Verify message: "No items found"
4. Verify suggestion: "Try adjusting your search or filters"

**Status:** [ ] Pass [ ] Fail  
**Notes:**

---

### Test 4.2: Concurrent Requests (Race Condition)

**Objective:** Verify row locking prevents double-allocation

**Steps:**

1. Open two browser tabs
2. Both select same item with 10 units
3. Tab 1: Request 8 units
4. Tab 2: Request 8 units (before tab 1 completes)
5. Verify one succeeds, one fails (or both succeed if total ≤ 10)

**Note:** This is hard to test manually. Consider automated test later.

**Status:** [ ] Pass [ ] Fail [ ] Skipped  
**Notes:**

---

### Test 4.3: Invalid Quantity

**Steps:**

1. Request parts
2. Enter quantity: 0
3. Verify validation error
4. Enter quantity: -5
5. Verify validation error
6. Enter quantity: "abc"
7. Verify handled gracefully

**Expected Result:** ✅ Only positive integers accepted

**Status:** [ ] Pass [ ] Fail  
**Notes:**

---

### Test 4.4: Network Error During Submission

**Steps:**

1. Open browser dev tools
2. Go to Network tab
3. Enable "Offline" mode
4. Try to submit parts request
5. Verify error toast appears
6. Verify dialog stays open
7. Disable offline mode
8. Retry submission
9. Verify success

**Expected Result:** ✅ Graceful error handling

**Status:** [ ] Pass [ ] Fail  
**Notes:**

---

### Test 4.5: Missing Required Fields

**Steps:**

1. Request parts
2. Leave Part Name empty
3. Try to submit
4. Verify validation error
5. Fill Part Name
6. Leave Quantity empty
7. Try to submit
8. Verify validation error

**Expected Result:** ✅ Required field validation works

**Status:** [ ] Pass [ ] Fail  
**Notes:**

---

## 🧪 Test Suite 5: Performance

### Test 5.1: Search Performance

**Objective:** Verify search is fast with large dataset

**Steps:**

1. Add 100+ inventory items (if possible)
2. Type in search box
3. Verify results update in < 500ms
4. Check Network tab for query time
5. Check browser console for warnings

**Acceptable:** < 500ms response time

**Status:** [ ] Pass [ ] Fail [ ] N/A (insufficient data)  
**Notes:**

---

### Test 5.2: Table Rendering Performance

**Steps:**

1. Create 50+ parts requests for a job card
2. Open that job card
3. Verify table loads smoothly
4. Check for layout shifts
5. Check for memory leaks (Performance tab)

**Status:** [ ] Pass [ ] Fail  
**Notes:**

---

## 🧪 Test Suite 6: Cross-Browser Testing

### Test 6.1: Chrome

**Version:** ****\_\_****

**Tests:**

- [ ] Inventory search works
- [ ] Dialogs render correctly
- [ ] Forms submit successfully
- [ ] No console errors

---

### Test 6.2: Firefox

**Version:** ****\_\_****

**Tests:**

- [ ] Inventory search works
- [ ] Dialogs render correctly
- [ ] Forms submit successfully
- [ ] No console errors

---

### Test 6.3: Safari (if available)

**Version:** ****\_\_****

**Tests:**

- [ ] Inventory search works
- [ ] Dialogs render correctly
- [ ] Forms submit successfully
- [ ] No console errors

---

### Test 6.4: Mobile (Chrome/Safari)

**Device:** ****\_\_****

**Tests:**

- [ ] Search dialog responsive
- [ ] Forms usable on small screen
- [ ] Touch interactions work
- [ ] No layout issues

---

## 📊 Test Results Summary

### Overall Status:

- **Total Tests:** **_ / _**
- **Passed:** \_\_\_
- **Failed:** \_\_\_
- **Skipped:** \_\_\_

### Critical Issues Found:

1. ***
2. ***
3. ***

### Non-Critical Issues:

1. ***
2. ***
3. ***

### Performance Metrics:

- **Search Response Time:** \_\_\_ ms
- **Form Submission Time:** \_\_\_ ms
- **Page Load Time:** \_\_\_ ms

---

## 🐛 Bug Report Template

For each bug found, document using this template:

```markdown
### Bug #X: [Title]

**Severity:** [ ] Critical [ ] High [ ] Medium [ ] Low

**Description:**
[What happened]

**Steps to Reproduce:**

1.
2.
3.

**Expected Behavior:**
[What should happen]

**Actual Behavior:**
[What actually happened]

**Screenshots/Logs:**
[Paste relevant logs or screenshots]

**Environment:**

- Browser:
- OS:
- Date:

**Fix Priority:** [ ] Immediate [ ] This Sprint [ ] Backlog
```

---

## 📋 Phase 3 Completion Checklist

### Test Execution:

- [ ] All core user flows tested
- [ ] Search & filter functionality verified
- [ ] Database operations checked
- [ ] Edge cases tested
- [ ] Performance validated
- [ ] Cross-browser testing completed

### Results Documentation:

- [ ] Test results recorded
- [ ] Bugs documented
- [ ] Screenshots captured
- [ ] Database queries logged

### Bug Fixes (if any):

- [ ] Critical bugs fixed
- [ ] High-priority bugs fixed
- [ ] Regression tests passed

### Sign-off:

- [ ] All critical tests pass
- [ ] No blockers remain
- [ ] System ready for Phase 4

---

## ⏭️ Next Phase

**Phase 4: Workflow Integration & Approval**

- Implement approval workflow
- Add manager approval UI
- Create deduct_inventory on approval
- Build rejection handling
- Add email notifications (optional)

**Prerequisites for Phase 4:**

- ✅ Phase 3 completed
- ✅ All critical bugs fixed
- ✅ Core functionality working
- ✅ Test report approved

---

## 🆘 Common Issues & Solutions

### Issue: Tests keep failing

**Solution:**

- Reset database to known state
- Clear browser cache
- Restart development server
- Check for typos in test data

### Issue: Can't reproduce bug

**Solution:**

- Clear all filters/searches
- Try in incognito mode
- Check browser console
- Verify database state

### Issue: Performance too slow

**Solution:**

```sql
-- Add indexes if missing
CREATE INDEX IF NOT EXISTS idx_inventory_name ON inventory(name);
CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory(category);
CREATE INDEX IF NOT EXISTS idx_parts_requests_status ON parts_requests(status);

-- Analyze tables
ANALYZE inventory;
ANALYZE parts_requests;
```

---

**Phase 3 Complete! 🎉**  
**Estimated Time:** 4-6 hours  
**Next:** Proceed to Phase 4 - Workflow Integration
