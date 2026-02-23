# Load Planning Integration Guide

## Overview

This guide explains how to integrate your distribution schedule data into the Car Craft Co Load Management System.

## Data Structure Mapping

### Your Current Format → System Fields

| Your Field            | System Field               | Notes                       |
| --------------------- | -------------------------- | --------------------------- |
| Dispatch Date         | `pickup_datetime`          | Converted to ISO timestamp  |
|                       | `pickup_window_start`      | 06:00 on dispatch date      |
|                       | `pickup_window_end`        | 18:00 on dispatch date      |
| Expected Arrival Date | `delivery_datetime`        | Converted to ISO timestamp  |
|                       | `delivery_window_start`    | 06:00 on arrival date       |
|                       | `delivery_window_end`      | 18:00 on arrival date       |
| Farm (CBC/BV)         | `origin` + `customer_name` | Farm becomes origin         |
| Destination           | `destination`              | City/location               |
|                       | `destination_address`      | Full address                |
| Channel               | `cargo_type`               | Retail/Vendor/Direct        |
| Packaging             | `special_requirements`     | Crates/Bins/Boxes           |
| Pallets               | `weight_kg`                | Calculated (pallets × 1200) |

## Integration Methods

### Method 1: Excel/CSV Bulk Import ✅ **LIVE NOW**

**Status**: ✅ **FULLY IMPLEMENTED & INTEGRATED**

The bulk import system is now live in the LoadManagement page!

**How to Use**:

1. Navigate to **Load Management** page
2. Click **"Bulk Import"** button (next to "Create Load")
3. Download the CSV template
4. Fill in your distribution schedule
5. Upload the CSV file
6. Map your CSV columns to load fields
7. Preview the first 10 entries
8. Click "Import" - all loads created in "pending" status

**Template Structure**:

```csv
dispatch_date,arrival_date,farm,destination,channel,packaging,pallets,notes
2025-11-11,2025-11-12,BV,Harare,Retail,Crates,0,Vansales/Retail
2025-11-10,2025-11-11,CBC,Harare,Vendor,Bins,0,
2025-11-10,2025-11-11,CBC,Bulawayo,Vendor,Bins,20,Vansales/Vendor
```

**Steps**:

1. ✅ Click "Bulk Import" button in Load Management
2. ✅ Download template (or use your own CSV)
3. ✅ Map columns to load fields via dropdown selects
4. ✅ Preview first 10 rows before import
5. ✅ Bulk create loads in "pending" status
6. ✅ Auto-generates load numbers (LD-YYYYMMDD-XXX)
7. ✅ Auto-assigns GPS coordinates from location database
8. ✅ Creates 6AM-6PM time windows automatically

**What You Get**:

### Method 2: Customer Template System ✅ (For Recurring Routes)

Create templates for frequent routes:

- **Harare Retail Route** (BV → Harare, Daily)
- **Bulawayo Vendor Route** (CBC → Bulawayo, 3x per week)
- **Mutare Route** (BV → Mutare, Mon/Wed/Fri)
- **SA Export Route** (CBC/BV → Polokwane/Centurion)

### Method 3: Weekly Planning Calendar 🆕 (Need to implement)

Visual calendar view showing:

- Week-by-week dispatch schedule
- Color-coded by destination
- Drag-and-drop to reschedule
- Auto-assign vehicles based on availability

## Implementation Plan

### Phase 1: Bulk Import Enhancement ✅ **COMPLETE**

✅ Template download feature
✅ CSV parser for your format
✅ Column mapping interface
✅ Preview before import (first 10 rows)
✅ Validation rules
✅ Error reporting with row numbers
✅ Batch database insertion
✅ Integration into LoadManagement page
✅ Auto-generate load numbers
✅ GPS coordinate assignment from location database

### Phase 2: Customer Templates ✅ **COMPLETE**

✅ Route template CRUD (recurring_schedules table)
✅ Recurring schedule setup (daily, weekly, monthly)
✅ Auto-generate loads from templates (PostgreSQL function)
✅ Template library with usage stats (RecurringScheduleManager UI)
✅ Quick templates (4 pre-configured routes)
✅ Integration into LoadManagement page
✅ Schedule activation/pause controls
✅ Manual "Generate Now" button
✅ Next runs preview

**See**: `PHASE_2_RECURRING_SCHEDULES_COMPLETE.md` for full documentation

### Phase 3: Planning Calendar (3-5 days)

🆕 Weekly/monthly calendar view
🆕 Load scheduling interface
🆕 Vehicle allocation view
🆕 Capacity planning

### Phase 4: Analytics & Optimization (2-3 days)

🆕 Route efficiency analysis
🆕 Farm-to-destination frequency stats
🆕 Packaging requirements forecasting
🆕 Load consolidation suggestions

## Quick Start: Manual Data Entry

Until bulk import is enhanced, use this workflow:

### 1. Create Route Templates

**Harare Retail Route**:

- Origin: BV Farm, Coordinates
- Destination: Harare Central, Coordinates
- Typical cargo: Fresh produce
- Packaging: Crates
- Duration: ~4 hours

**Bulawayo Route**:

- Origin: CBC Farm
- Destination: Bulawayo
- Typical cargo: Vendor supplies
- Packaging: Bins (20 pallets)
- Duration: ~6 hours

### 2. Create Weekly Schedule

For each entry in your schedule:

1. Go to Load Management → Create Load
2. Select route template (or enter manually)
3. Set dispatch date/time
4. Set expected arrival date/time
5. Add channel in notes (Retail/Vendor/Direct)
6. Add packaging in special requirements
7. Status: "pending" (until assigned)

### 3. Assign Vehicles

Once loads are created:

1. Filter by dispatch date
2. Group by destination
3. Assign available vehicles
4. Status changes to "assigned"

## Database Schema Extensions Needed

```sql
-- Add channel field to loads table
ALTER TABLE loads
ADD COLUMN channel TEXT CHECK (channel IN ('retail', 'vendor', 'vansales', 'direct', 'municipal'));

-- Add packaging details
ALTER TABLE loads
ADD COLUMN packaging_type TEXT,
ADD COLUMN pallet_count INTEGER DEFAULT 0;

-- Create recurring_schedules table
CREATE TABLE recurring_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  channel TEXT,
  packaging_type TEXT,
  frequency TEXT, -- 'daily', 'weekly', 'custom'
  days_of_week INTEGER[], -- [1,3,5] for Mon/Wed/Fri
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Sample Data Transformation

### Your Data:

```
Tuesday, 11-Nov-25 | Wednesday, 12-Nov-25 | BV | Harare | Vansales/Retail | Crates
```

### Transformed to Load:

```typescript
{
  load_number: 'LD-20251111-001',
  customer_name: 'BV Farm',
  origin: 'BV Farm, Zimbabwe',
  origin_lat: -17.8252, // Example coordinates
  origin_lng: 31.0335,
  destination_address: 'Harare Central, Zimbabwe',
  destination_lat: -17.8292,
  destination_lng: 31.0522,
  pickup_time_window_start: '2025-11-11T06:00:00Z',
  pickup_time_window_end: '2025-11-11T18:00:00Z',
  delivery_time_window_start: '2025-11-12T06:00:00Z',
  delivery_time_window_end: '2025-11-12T18:00:00Z',
  cargo_type: 'Fresh Produce',
  cargo_description: 'Vansales/Retail distribution',
  special_requirements: ['Refrigerated', 'Crates'],
  status: 'pending',
  priority: 'medium',
  currency: 'USD' // or 'ZAR'
}
```

## Next Steps

1. **Immediate**: Use manual load creation with route templates
2. **Week 1**: Implement enhanced CSV import
3. **Week 2**: Build recurring schedule system
4. **Week 3**: Create planning calendar view
5. **Week 4**: Add analytics and optimization

## Files to Modify

### Existing Files:

- `src/components/trips/LoadImportModal.tsx` - Enhance CSV parsing
- `src/components/loads/CreateLoadDialog.tsx` - Add channel/packaging fields
- `src/pages/LoadManagement.tsx` - Add calendar view tab
- `src/hooks/useSavedRoutes.ts` - Extend for recurring schedules

### New Files to Create:

- `src/components/loads/LoadPlanningCalendar.tsx`
- `src/components/loads/RecurringScheduleManager.tsx`
- `src/components/loads/BulkLoadImport.tsx`
- `src/lib/loadPlanningUtils.ts`
- `src/types/loadPlanning.ts`

## Support

For questions or implementation assistance, refer to:

- Load Management Guide: `LOAD_MANAGEMENT_COMPLETE_GUIDE.md`
- Load Status Workflow: `LOAD_STATUS_WORKFLOW.md`
- Saved Routes Integration: `SAVED_ROUTES_INTEGRATION_GUIDE.md`
