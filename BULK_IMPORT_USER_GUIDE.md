# Bulk Load Import - User Guide

## Quick Start

1. **Download Template**

   - Click "Bulk Import" button in Load Management
   - Click "Download Template" to get the CSV file
   - Template includes all supported columns with sample data

2. **Prepare Your Data**

   - Open template in Excel, Google Sheets, or any CSV editor
   - Fill in your load data
   - **Required columns**: dispatch_date, arrival_date, farm, destination, channel, packaging
   - **Optional columns**: pallets, notes, customer_name, contact_person, contact_phone, weight_kg, volume_m3, quoted_price

3. **Import**
   - Click "Choose File" and select your CSV
   - System will auto-detect column mappings
   - Review and adjust mappings if needed
   - Preview first 10 rows
   - Click "Import" to create loads

## CSV Column Reference

### Required Columns

| Column          | Format                  | Example                 | Notes                |
| --------------- | ----------------------- | ----------------------- | -------------------- |
| `dispatch_date` | YYYY-MM-DD or DD-Mon-YY | 2025-11-10 or 10-Nov-25 | Pickup date          |
| `arrival_date`  | YYYY-MM-DD or DD-Mon-YY | 2025-11-11 or 11-Nov-25 | Delivery date        |
| `farm`          | Text                    | CBC, BV                 | Origin point         |
| `destination`   | Text                    | Harare, Bulawayo        | Delivery point       |
| `channel`       | Text                    | retail, vendor, direct  | Distribution channel |
| `packaging`     | Text                    | crates, bins, boxes     | Package type         |

### Optional Columns

| Column           | Format | Example               | Purpose                                      |
| ---------------- | ------ | --------------------- | -------------------------------------------- |
| `pallets`        | Number | 20                    | Used to calculate weight (1200kg per pallet) |
| `notes`          | Text   | Vansales/Retail       | Special instructions                         |
| `customer_name`  | Text   | Harare Central Market | Overrides destination as customer            |
| `contact_person` | Text   | John Doe              | Customer contact name                        |
| `contact_phone`  | Text   | +263 71 234 5678      | Customer phone number                        |
| `weight_kg`      | Number | 24000                 | Overrides pallet calculation                 |
| `volume_m3`      | Number | 15.5                  | Cargo volume                                 |
| `quoted_price`   | Number | 5500                  | Price in ZAR                                 |

## Auto-Calculated Fields

The system automatically calculates:

- **Load Number**: Format `LD-YYYYMMDD-XXX` (auto-increments daily)
- **Expected Arrival at Pickup**: dispatch_date at 6:00 AM
- **Expected Departure from Pickup**: 2 hours after arrival (8:00 AM)
- **Expected Arrival at Delivery**: arrival_date at 6:00 AM
- **Expected Departure from Delivery**: 2 hours after arrival (8:00 AM)
- **GPS Coordinates**: Looked up from farm/destination database
- **Weight**: From weight_kg column OR pallets × 1200kg OR 1000kg default
- **Status**: Always starts as "pending"
- **Priority**: Always starts as "medium"
- **Currency**: ZAR (South African Rand)

## Known Locations

### Farms (Origins)

- **CBC**: CBC Farm, Zimbabwe (-17.8252, 31.0335)
- **BV**: BV Farm, Zimbabwe (-17.7500, 31.1000)

### Destinations

- **Harare**: Harare Central, Zimbabwe (-17.8292, 31.0522)
- **Bulawayo**: Bulawayo, Zimbabwe (-20.1496, 28.5833)
- **Mutare**: Mutare, Zimbabwe (-18.9707, 32.6704)
- **Freshmark Polokwane**: Polokwane, South Africa (-23.9045, 29.4689)
- **Freshmark Centurion**: Centurion, South Africa (-25.8601, 28.1878)
- **Farmer's Trust**: South Africa (-26.2041, 28.0473)
- **Fresh Approach**: South Africa (-25.7461, 28.1881)

_Unknown locations will be added with zero coordinates - you can update them manually after import_

## Sample CSV

```csv
dispatch_date,arrival_date,farm,destination,channel,packaging,pallets,notes,customer_name,contact_person,contact_phone,weight_kg,volume_m3,quoted_price
2025-11-11,2025-11-12,BV,Harare,Retail,Crates,20,Vansales/Retail,Harare Central Market,John Doe,+263 71 234 5678,24000,15.5,5500
2025-11-10,2025-11-11,CBC,Harare,Vendor,Bins,15,,Vendor Corp,Jane Smith,+263 71 987 6543,18000,12.0,4200
2025-11-10,2025-11-11,CBC,Bulawayo,Vendor,Bins,20,Vansales/Vendor,,,,,
2025-11-12,2025-11-12,BV,Mutare,Retail,Crates,0,Retail/Vendor,,,,,
2025-11-10,2025-11-12,CBC,Freshmark Polokwane,Direct,Crates,0,,Freshmark,Mike Johnson,+27 11 234 5678,1000,,3500
```

## Tips for Success

✅ **DO:**

- Use the template as a starting point
- Fill in contact details for important customers
- Specify weight if you know exact cargo weight
- Use customer_name column for specific client names
- Leave optional columns empty if data not available

❌ **DON'T:**

- Change column header names (system won't auto-detect)
- Use commas within cell values (breaks CSV format)
- Leave required columns empty
- Mix date formats in same column

## After Import

Once imported, loads will:

- ✅ Appear in the Loads table with "pending" status
- ✅ Show on the Planning Calendar
- ✅ Be available for vehicle assignment
- ✅ Have complete route plotting data for GPS tracking
- ✅ Include all contact information in load details
- ✅ Support route optimization and planning features

Import is **identical** to manual entry - all features work the same way!

## Troubleshooting

**Import failed with validation errors:**

- Check that required columns are not empty
- Verify date format is consistent
- Ensure numeric columns contain valid numbers

**Loads not appearing on map:**

- Verify farm/destination names match known locations
- Check that coordinates were set (view load details)
- Unknown locations get 0,0 coordinates - update manually

**Contact details not showing:**

- Ensure column mapping included contact_person and contact_phone
- Check CSV has data in those columns (not just headers)

**Wrong customer name:**

- Use customer_name column to override destination
- Or update customer after import in load details

## Need Help?

- Check `BULK_IMPORT_ENHANCEMENT.md` for technical details
- Review sample data in downloaded template
- Test with small CSV first (2-3 rows)
