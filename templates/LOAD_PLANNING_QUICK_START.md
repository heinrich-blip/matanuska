# 🚀 QUICK START: Load Planning Integration

## Immediate Use (TODAY)

### Option 1: Use the New Bulk Import Feature ✅

1. **Navigate to Load Management**

   ```
   Dashboard → Load Management → Create Load (dropdown) → Bulk Import
   ```

2. **Download Template**

   - Click "Download Template" button
   - Opens a CSV with correct format

3. **Fill in Your Schedule**

   ```csv
   dispatch_date,arrival_date,farm,destination,channel,packaging,pallets,notes
   2025-11-11,2025-11-12,BV,Harare,Retail,Crates,0,Vansales/Retail
   2025-11-10,2025-11-11,CBC,Harare,Vendor,Bins,0,
   2025-11-10,2025-11-11,CBC,Bulawayo,Vendor,Bins,20,Vansales/Vendor
   ```

4. **Upload & Map Columns**

   - Upload your CSV
   - System auto-detects columns
   - Map to required fields
   - Preview before importing

5. **Import**
   - Click "Import" button
   - Creates all loads in "pending" status
   - Shows success/error report

### Option 2: Convert Your Data Manually

Use this Python script to convert your schedule:

```python
import csv
from datetime import datetime

# Your data
schedule = """
Tuesday, 11-Nov-25 | Wednesday, 12-Nov-25 | BV | Harare | Vansales/Retail | Crates
Monday, 10-Nov-25 | Tuesday, 11-Nov-25 | CBC | Harare | Vendor | Bins
"""

# Parse and convert
output = []
for line in schedule.strip().split('\n'):
    parts = [p.strip() for p in line.split('|')]

    # Parse dates (Day, DD-MMM-YY format)
    dispatch = datetime.strptime(parts[0].split(', ')[1], '%d-%b-%y').strftime('%Y-%m-%d')
    arrival = datetime.strptime(parts[1].split(', ')[1], '%d-%b-%y').strftime('%Y-%m-%d')

    output.append({
        'dispatch_date': dispatch,
        'arrival_date': arrival,
        'farm': parts[2],
        'destination': parts[3],
        'channel': parts[4],
        'packaging': parts[5],
        'pallets': '20' if '20 pallets' in line else '0',
        'notes': ''
    })

# Write CSV
with open('load_schedule.csv', 'w', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=output[0].keys())
    writer.writeheader()
    writer.writerows(output)

print(f"Created load_schedule.csv with {len(output)} loads")
```

## What Was Built

### ✅ New Components

1. **`BulkLoadImport.tsx`** - Full-featured CSV import with:

   - File upload
   - Column mapping interface
   - Preview before import
   - Error reporting
   - Success metrics

2. **`loadPlanningUtils.ts`** - Utility functions:

   - CSV parsing
   - Data validation
   - Load number generation
   - Farm/destination geocoding
   - Bulk database insertion

3. **`loadPlanning.ts`** - Type definitions:
   - Distribution schedule entry types
   - Import mappings
   - Farm/destination databases

### 📦 Pre-Configured Data

**Farms (with GPS coordinates)**:

- CBC Farm: -17.8252, 31.0335
- BV Farm: -17.7500, 31.1000

**Destinations (with GPS coordinates)**:

- Harare: -17.8292, 31.0522
- Bulawayo: -20.1496, 28.5833
- Mutare: -18.9707, 32.6704
- Freshmark Polokwane: -23.9045, 29.4689
- Fresh Approach: -25.7461, 28.1881
- Freshmark Centurion: -25.8601, 28.1878
- Farmer's Trust: -26.2041, 28.0473

## How It Works

### Data Flow

```
Your Schedule CSV
      ↓
Parse & Validate
      ↓
Map to Load Format
      ↓
Generate Load Numbers (LD-YYYYMMDD-XXX)
      ↓
Insert into Database
      ↓
Show in Load Management
      ↓
Assign Vehicles
      ↓
Track with GPS
```

### What Happens When You Import

For each line in your schedule:

```
Input:
Tuesday, 11-Nov-25 | Wednesday, 12-Nov-25 | BV | Harare | Retail | Crates

Becomes:
{
  load_number: 'LD-20251111-001',
  customer_name: 'BV Farm',
  origin: 'BV Farm, Zimbabwe',
  origin_lat: -17.7500,
  origin_lng: 31.1000,
  destination_address: 'Harare, Zimbabwe',
  destination_lat: -17.8292,
  destination_lng: 31.0522,
  pickup_time_window_start: '2025-11-11T06:00:00Z',
  pickup_time_window_end: '2025-11-11T18:00:00Z',
  delivery_time_window_start: '2025-11-12T06:00:00Z',
  delivery_time_window_end: '2025-11-12T18:00:00Z',
  cargo_type: 'retail - crates',
  special_requirements: ['crates'],
  status: 'pending',
  priority: 'medium'
}
```

## Integration Steps (If Not Already Done)

### 1. Update LoadManagement Page

Add bulk import button:

```tsx
// In LoadManagement.tsx, add import:
import { BulkLoadImport } from '@/components/loads/BulkLoadImport';

// Add state:
const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);

// Add button in header:
<Button onClick={() => setIsBulkImportOpen(true)}>
  <Upload className="w-4 h-4 mr-2" />
  Bulk Import
</Button>

// Add component:
<BulkLoadImport
  isOpen={isBulkImportOpen}
  onClose={() => setIsBulkImportOpen(false)}
  onSuccess={() => {
    refetch(); // Refresh loads list
  }}
/>
```

### 2. Test with Sample Data

1. Download template
2. Add 2-3 test rows
3. Upload
4. Map columns
5. Preview
6. Import
7. Check Load Management - should see new pending loads

## Workflow After Import

1. **Loads Created** (Status: pending)

   - All your schedule entries now exist as loads
   - Each has unique load number
   - GPS coordinates assigned

2. **Assign Vehicles**

   - Go to pending loads
   - Click "Assign Vehicle"
   - Select vehicle from fleet
   - Status → assigned

3. **Track Progress**

   - Status automatically updates via workflow
   - GPS tracking when in transit
   - Real-time updates on map

4. **Complete Delivery**
   - Driver updates status
   - Timestamps recorded
   - Status → completed

## Next Steps

### This Week

- ✅ Test bulk import with sample data
- ✅ Import your full November schedule
- 📝 Create recurring templates for frequent routes

### Next Week

- 📅 Add calendar view for planning
- 🔄 Setup recurring schedules (auto-generate weekly)
- 📊 Analytics dashboard for route efficiency

### Future Enhancements

- 🤖 AI route optimization
- 📱 Mobile app for drivers
- 🔔 Customer delivery notifications
- 📈 Predictive scheduling

## Support Files

All implementation files created:

- `/src/components/loads/BulkLoadImport.tsx` - Main import component
- `/src/lib/loadPlanningUtils.ts` - Business logic
- `/src/types/loadPlanning.ts` - TypeScript types
- `LOAD_PLANNING_INTEGRATION_GUIDE.md` - Full documentation

## Need Help?

The system is ready to use! If you encounter issues:

1. Check browser console for errors
2. Verify CSV format matches template
3. Ensure date format is YYYY-MM-DD
4. Check that farm/destination names match database

Let me know if you need any adjustments or have questions!
