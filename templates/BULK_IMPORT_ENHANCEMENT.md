# Bulk Load Import Enhancement - Complete Parity with Manual Entry

## Problem Identified

Bulk CSV import was creating loads without key fields that manual entry includes:

- Missing contact information (contact person, phone)
- Missing expected timing fields (arrival/departure at pickup/delivery)
- Missing route coordinates and addressing
- Inconsistent customer naming
- Default values not matching manual entry behavior

## Solution Implemented

### 1. Enhanced Data Types (`src/types/loadPlanning.ts`)

Added optional fields to `DistributionScheduleEntry`:

```typescript
contactPerson?: string;
contactPhone?: string;
weightKg?: number;
volumeM3?: number;
quotedPrice?: number;
customerName?: string;
```

Extended `BulkImportMapping` with optional column mappings:

```typescript
contactPersonColumn?: string;
contactPhoneColumn?: string;
weightKgColumn?: string;
volumeM3Column?: string;
quotedPriceColumn?: string;
customerNameColumn?: string;
```

### 2. Updated Import Logic (`src/lib/loadPlanningUtils.ts`)

#### Enhanced `parseDistributionCSV`:

- Now parses all optional fields from CSV columns
- Auto-converts numeric fields (weight, volume, price)
- Handles customer name override

#### Enhanced `convertScheduleEntryToLoad`:

- **Contact Information**: Uses `entry.contactPerson` and `entry.contactPhone`
- **Customer Naming**: Prioritizes `entry.customerName`, falls back to destination name
- **Expected Timing Fields**:
  - `expected_arrival_at_pickup`: Set to pickup datetime
  - `expected_departure_from_pickup`: Pickup time + 2 hours (loading duration)
  - `expected_arrival_at_delivery`: Set to delivery datetime
  - `expected_departure_from_delivery`: Delivery time + 2 hours (offloading duration)
- **Complete Address Data**: Both `origin_address` and `destination_address` populated
- **Weight Calculation**: Prioritizes CSV weight → pallet calculation → 1000kg default
- **Volume**: Uses CSV value if provided
- **Pricing**: Uses CSV quoted price if provided
- **Currency**: Changed from USD to ZAR to match manual entry default

### 3. Enhanced UI (`src/components/loads/BulkLoadImport.tsx`)

#### Auto-Detection Patterns:

Added regex patterns to detect optional columns:

```typescript
contactPersonColumn: /contact.*person|person.*name/i;
contactPhoneColumn: /contact.*phone|phone|tel/i;
weightKgColumn: /weight|kg/i;
volumeM3Column: /volume|m3|cubic/i;
quotedPriceColumn: /price|cost|quote/i;
customerNameColumn: /customer.*name|client.*name/i;
```

#### New Mapping Fields:

Added 6 optional field selectors in the mapping step:

1. Customer Name (overrides destination)
2. Contact Person
3. Contact Phone
4. Weight (kg) - with note "calculate from pallets" if omitted
5. Volume (m³)
6. Quoted Price

#### Updated CSV Template:

New template includes all optional columns with sample data:

```csv
dispatch_date,arrival_date,farm,destination,channel,packaging,pallets,notes,customer_name,contact_person,contact_phone,weight_kg,volume_m3,quoted_price
```

### 4. Field Mapping Summary

| Manual Entry Field                 | Bulk Import Source                        | Default/Calculation         |
| ---------------------------------- | ----------------------------------------- | --------------------------- |
| `customer_name`                    | `customerName` column or destination name | destination.name            |
| `contact_person`                   | `contactPerson` column                    | null                        |
| `contact_phone`                    | `contactPhone` column                     | null                        |
| `origin_address`                   | farm.address                              | farm location lookup        |
| `destination_address`              | destination.address                       | destination location lookup |
| `expected_arrival_at_pickup`       | Calculated from dispatch_date             | dispatch_date 6:00 AM       |
| `expected_departure_from_pickup`   | Calculated                                | dispatch_date 8:00 AM (+2h) |
| `expected_arrival_at_delivery`     | Calculated from arrival_date              | arrival_date 6:00 AM        |
| `expected_departure_from_delivery` | Calculated                                | arrival_date 8:00 AM (+2h)  |
| `weight_kg`                        | `weightKg` column → pallet calc → default | 1000 kg if no data          |
| `volume_m3`                        | `volumeM3` column                         | null                        |
| `quoted_price`                     | `quotedPrice` column                      | null                        |
| `currency`                         | Static                                    | ZAR (changed from USD)      |

## Route Plotting Impact

With these changes, bulk imported loads now have:

- ✅ Complete origin/destination coordinates (`origin_lat`, `origin_lng`, `destination_lat`, `destination_lng`)
- ✅ Both `origin_address` and `destination_address` fields populated
- ✅ Expected timing fields for calendar integration and route planning
- ✅ Proper customer information for client relationship tracking

This ensures route planning, live tracking, and calendar features work identically for bulk imported and manually created loads.

## Testing Checklist

1. **Download New Template**

   - Verify CSV has all 14 columns
   - Sample data shows proper format for optional fields

2. **Auto-Detection**

   - Test column name variations (e.g., "contact_phone" vs "phone" vs "telephone")
   - Verify auto-mapping detects most fields correctly

3. **Optional Fields**

   - Import with all fields populated → verify all data saved
   - Import with only required fields → verify defaults applied
   - Import with mix of populated/empty optional fields → verify selective usage

4. **Route Plotting**

   - Import loads and verify they appear on map with proper coordinates
   - Verify route planner can calculate routes between imported load points
   - Check that GPS tracking works for assigned imported loads

5. **Customer Data**

   - Verify customer names display correctly in load table
   - Verify contact person/phone appear in load details
   - Test filtering/searching by customer name

6. **Calendar Integration**
   - Verify imported loads appear on calendar
   - Check pickup/delivery time blocks match expected arrival/departure times
   - Verify calendar sync triggers (uses expected\_\* fields)

## Migration Notes

- **No database migration required** - all fields already exist in `loads` table
- **Backward compatible** - old CSV format still works (new fields optional)
- **Template update** - users should download new template for full feature access

## Related Files Changed

- `src/types/loadPlanning.ts` - Type definitions
- `src/lib/loadPlanningUtils.ts` - Import logic and conversion
- `src/components/loads/BulkLoadImport.tsx` - UI and mapping
