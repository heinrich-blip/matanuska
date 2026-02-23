# Job Card Cost Allocation Implementation Guide

## Overview

This guide documents the implementation of comprehensive cost allocation features for job cards, including:

- Document upload for proof of costs
- Inventory parts selection with stock validation
- Non-inventory (external vendor) parts
- Service/repair items
- Vendor selection and tracking
- Automatic cost calculations and summaries

## Database Changes

### Migration File

`supabase/migrations/20251112000001_add_job_card_cost_documents.sql`

### New Columns Added to `parts_requests` Table

| Column                | Type    | Purpose                                            |
| --------------------- | ------- | -------------------------------------------------- |
| `vendor_id`           | UUID    | Links to vendors table for external parts/services |
| `document_url`        | TEXT    | URL to uploaded cost proof document                |
| `document_name`       | TEXT    | Original filename of uploaded document             |
| `is_service`          | BOOLEAN | Flags service/repair items vs physical parts       |
| `service_description` | TEXT    | Detailed description for service items             |

### New Database View

**`job_card_cost_summary`** - Provides aggregated cost data per job card:

- `inventory_parts_cost` - Total cost from stock items
- `external_parts_cost` - Total cost from vendor parts
- `services_cost` - Total cost for services/repairs
- `total_parts_cost` - Grand total
- Item counts for each category
- Document coverage tracking

### Validation Function

`validate_parts_request()` - Enforces business rules:

- Non-service parts must have either inventory_id or vendor_id
- Parts cannot be from both inventory and external vendor
- Service items require service_description

## New Components

### 1. AddPartWithCostDialog

**Location**: `src/components/dialogs/AddPartWithCostDialog.tsx`

**Purpose**: Unified dialog for adding all types of parts/services to job cards

**Features**:

- Three source type tabs: Inventory, External Part, Service
- Inventory search integration with stock validation
- Vendor selection dropdown
- Document upload (PDF, JPG, PNG up to 5MB)
- Real-time cost calculation
- Validation and error handling

**Usage**:

```typescript
<AddPartWithCostDialog
  open={isOpen}
  onOpenChange={setIsOpen}
  jobCardId="uuid"
  onSuccess={handleRefresh}
/>
```

### 2. JobCardCostSummary

**Location**: `src/components/JobCardCostSummary.tsx`

**Purpose**: Displays cost breakdown and statistics

**Features**:

- Total cost with grand total card
- Cost breakdown by category (Inventory, External, Services)
- Document coverage percentage
- Visual status indicators
- Warning for missing documentation

**Usage**:

```typescript
<JobCardCostSummary jobCardId="uuid" />
```

### 3. Enhanced JobCardPartsTable

**Location**: `src/components/JobCardPartsTable.tsx`

**Enhancements**:

- Color-coded source indicators (Green=Inventory, Orange=External, Purple=Service)
- Document icon with link to uploaded files
- Vendor name display
- Service description in italic
- Simplified column layout
- Improved mobile responsiveness

## Document Upload System

### Storage Setup

Documents are stored in Supabase Storage bucket: `documents`

**Path structure**: `job-card-documents/{jobCardId}-{timestamp}.{ext}`

### Upload Process

1. File validation (size, type)
2. Generate unique filename
3. Upload to Supabase Storage
4. Get public URL
5. Store URL in `parts_requests.document_url`

### Supported Formats

- PDF (.pdf)
- Images (.jpg, .jpeg, .png)
- Maximum size: 5MB

## Cost Calculation Logic

### Unit and Total Price

- **Manual Entry**: For external parts and services
- **Auto-populated**: From inventory for stock items
- **Automatic Calculation**: `total_price = quantity × unit_price`

### Category Totals

Calculated in `job_card_cost_summary` view:

```sql
-- Inventory parts cost
SUM(CASE WHEN inventory_id IS NOT NULL THEN total_price ELSE 0 END)

-- External parts cost
SUM(CASE WHEN inventory_id IS NULL AND is_service = FALSE THEN total_price ELSE 0 END)

-- Services cost
SUM(CASE WHEN is_service = TRUE THEN total_price ELSE 0 END)
```

## Integration with Existing System

### Job Card Details Page

Add to `src/pages/JobCardDetails.tsx`:

```typescript
import JobCardCostSummary from "@/components/JobCardCostSummary";

// In the component:
<Tabs>
  <TabsContent value="parts">
    <JobCardCostSummary jobCardId={jobCard.id} />
    <JobCardPartsTable
      jobCardId={jobCard.id}
      parts={parts}
      onRefresh={refetch}
    />
  </TabsContent>
</Tabs>;
```

### Parts Request Query Enhancement

Update query to include vendor data:

```typescript
const { data: parts } = useQuery({
  queryKey: ["parts-requests", jobCardId],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("parts_requests")
      .select(
        `
        *,
        vendors(name)
      `
      )
      .eq("job_card_id", jobCardId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  },
});
```

## User Workflows

### Adding an Inventory Part

1. Click "Add Part/Service"
2. Select "Inventory" tab (default)
3. Click "Search" to browse inventory
4. Select item (auto-fills name, price, stock levels)
5. Enter quantity
6. Optionally upload invoice/receipt
7. Add notes if needed
8. Click "Add to Job Card"

### Adding an External Part

1. Click "Add Part/Service"
2. Select "External Part" tab
3. Enter part name and number
4. Select vendor from dropdown
5. Enter quantity and unit price
6. Upload cost document (required for audit)
7. Click "Add to Job Card"

### Adding a Service

1. Click "Add Part/Service"
2. Select "Service/Repair" tab
3. Enter service name (e.g., "Engine Repair")
4. Enter detailed service description
5. Select service provider from vendor list
6. Enter quantity (hours/units) and rate
7. Upload invoice/quote
8. Click "Add to Job Card"

## Validation Rules

### Client-Side

- Part/service name required
- Quantity must be > 0
- Unit price must be > 0
- Service description required for services
- Vendor required for external items/services
- Stock validation for inventory items

### Server-Side (Database Triggers)

- Inventory items cannot have vendor_id
- External/service items must have vendor_id
- Service items must have service_description
- Automatic total_price calculation

## Reporting & Analytics

### Cost Summary Data

Query the `job_card_cost_summary` view:

```sql
SELECT * FROM job_card_cost_summary
WHERE job_card_id = 'uuid';
```

### Document Compliance

Track documentation coverage:

```sql
SELECT
  job_card_id,
  total_items,
  items_with_documents,
  ROUND((items_with_documents::numeric / total_items * 100), 2) as coverage_pct
FROM job_card_cost_summary
WHERE total_items > 0;
```

### Cost Breakdown Reports

```sql
SELECT
  jc.job_number,
  v.registration,
  jcs.inventory_parts_cost,
  jcs.external_parts_cost,
  jcs.services_cost,
  jcs.total_parts_cost
FROM job_cards jc
JOIN job_card_cost_summary jcs ON jc.id = jcs.job_card_id
JOIN vehicles v ON jc.vehicle_id = v.id
ORDER BY jcs.total_parts_cost DESC;
```

## Testing Checklist

### Functional Testing

- [ ] Add inventory part with stock validation
- [ ] Add external part with vendor
- [ ] Add service with description
- [ ] Upload document (PDF, JPG, PNG)
- [ ] Verify file size limit (5MB)
- [ ] Test cost calculations
- [ ] View cost summary
- [ ] Check document links work
- [ ] Verify vendor dropdown populated
- [ ] Test low stock warnings

### Database Testing

- [ ] Apply migration successfully
- [ ] Verify new columns created
- [ ] Test validation triggers
- [ ] Query cost summary view
- [ ] Test RLS policies

### Edge Cases

- [ ] Missing vendor for external part (should fail)
- [ ] Inventory item with vendor_id (should fail)
- [ ] Service without description (should fail)
- [ ] Duplicate document uploads
- [ ] Very long service descriptions
- [ ] Special characters in filenames

## Migration Steps

1. **Apply Database Migration**

   ```bash
   # Run migration via Supabase Dashboard SQL Editor
   # Or via CLI:
   supabase db push
   ```

2. **Create Storage Bucket** (if not exists)

   - Name: `documents`
   - Public: true
   - File size limit: 5MB
   - Allowed MIME types: application/pdf, image/jpeg, image/png

3. **Update TypeScript Types**

   ```bash
   npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/integrations/supabase/types.ts
   ```

4. **Deploy Components**

   - Add `AddPartWithCostDialog.tsx`
   - Add `JobCardCostSummary.tsx`
   - Update `JobCardPartsTable.tsx`

5. **Update Job Card Pages**

   - Integrate cost summary into details view
   - Update parts queries to include vendor data

6. **Test & Verify**
   - Run all test scenarios
   - Verify document uploads work
   - Check cost calculations
   - Test with real data

## Future Enhancements

### Potential Additions

- PDF invoice preview in modal
- Bulk document upload
- Cost approval workflow
- Budget vs actual tracking
- Vendor performance metrics
- Cost history graphs
- Export cost reports
- Integration with accounting systems

### Performance Optimizations

- Cache cost summaries
- Lazy load document previews
- Paginate large parts lists
- Index vendor_id column

## Support & Troubleshooting

### Common Issues

**Document upload fails**

- Check storage bucket permissions
- Verify file size < 5MB
- Confirm MIME type is allowed

**Cost summary not updating**

- Refresh the view: `REFRESH MATERIALIZED VIEW job_card_cost_summary;` (if converted to materialized)
- Check parts_requests status (cancelled items excluded)

**Validation errors**

- Review trigger function logs
- Verify all required fields populated
- Check foreign key constraints

**Missing vendor in dropdown**

- Ensure vendor has `active = true`
- Check vendors table RLS policies

## Conclusion

This implementation provides comprehensive cost tracking for job cards with:
✅ Multiple source types (inventory, external, service)
✅ Document upload for proof of costs
✅ Vendor tracking and selection
✅ Automatic cost calculations
✅ Real-time stock validation
✅ Cost summaries and breakdowns
✅ Audit trail with documentation coverage

The system is designed to be extensible and integrates seamlessly with the existing job card workflow.
