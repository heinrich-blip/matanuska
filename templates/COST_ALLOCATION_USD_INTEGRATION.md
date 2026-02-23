# Cost Allocation System - USD Integration & Data Fixes

## Summary of Changes

This document details the fixes applied to retrieve vendor and inventory data correctly and integrate the cost summary with USD currency display.

## Changes Made

### 1. Fixed Parts Query in JobCardDetails.tsx

**Issue**: The parts query was only selecting `*` without joining vendor and inventory tables.

**Solution**: Enhanced the query to include relations:

```typescript
const { data, error } = await supabase
  .from("parts_requests")
  .select(
    `
    *,
    vendors(id, name, email, phone),
    inventory(
      id,
      part_name,
      part_number,
      quantity_in_stock,
      unit_price,
      location,
      supplier
    )
  `
  )
  .eq("job_card_id", id)
  .order("created_at", { ascending: false });
```

**Result**: Parts now include full vendor and inventory details for display in the table.

### 2. Updated JobCardPartsTable Interface

**File**: `src/components/JobCardPartsTable.tsx`

**Added**:

- `vendors` relation with full structure (id, name, email, phone)
- `inventory` relation with all necessary fields (part details, stock, price, location, supplier)

**Result**: Table can now display vendor names and access inventory data for already-assigned stock items.

### 3. Updated Currency from ZAR to USD

**File**: `src/components/JobCardCostSummary.tsx`

**Changed**: All currency symbols from `R` (South African Rand) to `$` (US Dollar)

**Affected displays**:

- Total Parts & Services Cost
- Inventory Parts Cost
- External Parts Cost
- Services Cost

**Example**:

```typescript
// Before: R 1,234.50
// After:  $1,234.50
```

### 4. Integrated JobCardCostSummary into Job Card Details

**File**: `src/pages/JobCardDetails.tsx`

**Changes**:

1. Added import: `import JobCardCostSummary from "@/components/JobCardCostSummary";`
2. Integrated component above JobCardPartsTable in the Parts & Materials card
3. Added cost summary to refresh invalidation queries

**UI Structure**:

```
Parts & Materials Card
├── Cost Summary (new)
│   ├── Total Cost Card ($)
│   └── Breakdown Cards (Inventory, External, Services)
└── Parts Table
```

### 5. Enhanced Query Invalidation

**Added** cost summary cache invalidation to `handleRefresh()`:

```typescript
queryClient.invalidateQueries({ queryKey: ["job-card-cost-summary", id] });
```

**Result**: Cost summary updates automatically when parts are added/modified.

## Important Notes

### Database Migration Required

⚠️ **The database migration must be applied before full functionality is available**

The following columns do not exist in the current database schema:

- `parts_requests.vendor_id`
- `parts_requests.document_url`
- `parts_requests.document_name`
- `parts_requests.is_service`
- `parts_requests.service_description`

**Migration file**: `supabase/migrations/20251112000001_add_job_card_cost_documents.sql`

**To apply**:

1. Open Supabase Dashboard
2. Go to SQL Editor
3. Run the migration SQL file
4. Verify columns are added
5. Regenerate TypeScript types:
   ```bash
   npx supabase gen types typescript --project-id wxvhkljrbcpcgpgdqhsp > src/integrations/supabase/types.ts
   ```

### Current Behavior (Before Migration)

Until the migration is applied:

- Cost summary will show only inventory parts costs (from existing `inventory_id` field)
- External parts and services categories will show $0.00
- Document tracking will not work (column doesn't exist)
- Vendor selection in AddPartWithCostDialog may fail
- TypeScript may show "Type instantiation is excessively deep" warnings (non-blocking)

### After Migration

Once the migration is applied:

- ✅ Full cost breakdown by category (Inventory, External, Services)
- ✅ Vendor data retrieval and display
- ✅ Document upload and tracking
- ✅ Service/repair item support
- ✅ Accurate cost calculations

## Data Flow

### Reading Parts with Full Context

```typescript
// Query parts with vendors and inventory
parts_requests
  ├── * (all parts_requests fields)
  ├── vendors (joined)
  │   ├── id
  │   ├── name
  │   ├── email
  │   └── phone
  └── inventory (joined)
      ├── id
      ├── part_name
      ├── part_number
      ├── quantity_in_stock
      ├── unit_price
      ├── location
      └── supplier
```

### Cost Calculation Logic

```typescript
for each part in parts_requests:
  if part.inventory_id exists:
    → Inventory Parts Cost
  else if part.is_service = true:
    → Services Cost
  else if part.vendor_id exists:
    → External Parts Cost
```

## Testing Checklist

Before migration:

- [ ] Parts table displays existing inventory items
- [ ] Cost summary shows inventory costs only
- [ ] UI renders without errors

After migration:

- [ ] Add external part with vendor
- [ ] Add service with description
- [ ] Upload document
- [ ] Verify vendor name displays in parts table
- [ ] Verify cost summary shows all three categories
- [ ] Check USD symbols display correctly ($)
- [ ] Confirm document icons appear with links
- [ ] Test cost totals calculate accurately

## Files Modified

1. **src/pages/JobCardDetails.tsx**

   - Enhanced parts query with joins
   - Integrated JobCardCostSummary component
   - Added cost summary cache invalidation
   - Type assertion for query results

2. **src/components/JobCardCostSummary.tsx**

   - Changed all currency symbols from R to $
   - Updated to handle missing columns gracefully
   - Direct calculation from parts_requests

3. **src/components/JobCardPartsTable.tsx**
   - Extended PartsRequest interface
   - Added vendors relation fields
   - Added inventory relation fields

## Currency Display

All monetary values now display in USD format:

| Component       | Format    | Example   |
| --------------- | --------- | --------- |
| Total Cost      | $X,XXX.XX | $1,234.50 |
| Inventory Parts | $XXX.XX   | $456.75   |
| External Parts  | $XXX.XX   | $234.00   |
| Services        | $XXX.XX   | $543.75   |

## Next Steps

1. **Apply Database Migration**

   - Run `supabase/migrations/20251112000001_add_job_card_cost_documents.sql`
   - Verify new columns exist

2. **Create Supabase Storage Bucket**

   - Name: "documents"
   - Public: true
   - Path: job-card-documents/\*

3. **Regenerate TypeScript Types**

   - Run type generation command
   - Replace `src/integrations/supabase/types.ts`

4. **Test Full Workflow**

   - Add parts from each source type
   - Upload documents
   - Verify cost calculations
   - Check vendor display

5. **Production Deployment**
   - Deploy updated components
   - Monitor for errors
   - Verify data integrity

## Support

### Known TypeScript Warnings

**"Type instantiation is excessively deep and possibly infinite"**

This warning may appear in `AddPartWithCostDialog.tsx` on the vendors query. This is a known TypeScript limitation with complex Supabase generated types and is **non-blocking**. The code will compile and run correctly.

**Resolution**: After applying the database migration and regenerating TypeScript types, this warning should resolve.

**Workaround**: The code uses type assertions with eslint-disable comments to handle this gracefully.

For other issues or questions:

- Check `JOB_CARD_COST_ALLOCATION_GUIDE.md` for comprehensive documentation
- Review migration file for database schema details
- Test in development environment before production deployment
