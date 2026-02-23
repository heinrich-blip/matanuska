# Trip Allocation Upload Template

## Download Instructions

You can download the template directly from the application by clicking **"Import Trips"** button on the Trips page and then selecting **"Download Template"**.

Alternatively, create an Excel file with the following structure:

---

## Sheet 1: Trip Data

| Column | Header                   | Required | Format/Values         | Description                                                 |
| ------ | ------------------------ | -------- | --------------------- | ----------------------------------------------------------- |
| A      | **Trip Number**          | Optional | Text (e.g., TRIP-001) | Unique trip identifier. Auto-generated if left empty.       |
| B      | **Driver Name**          | Yes      | Text                  | Full name of the assigned driver                            |
| C      | **Vehicle Fleet Number** | Yes      | Text                  | Fleet number of the assigned vehicle (must exist in system) |
| D      | **Client Name**          | Yes      | Text                  | Customer/client name                                        |
| E      | **Client Type**          | Optional | internal / external   | Type of client (defaults to external)                       |
| F      | **Load Type**            | Yes      | Text                  | Type of cargo (e.g., General Freight, Refrigerated, Hazmat) |
| G      | **Origin**               | Yes      | Text                  | Pickup location/city                                        |
| H      | **Destination**          | Yes      | Text                  | Delivery location/city                                      |
| I      | **Route**                | Optional | Text                  | Route description or route code                             |
| J      | **Departure Date**       | Yes      | YYYY-MM-DD            | Planned departure date                                      |
| K      | **Arrival Date**         | Yes      | YYYY-MM-DD            | Expected arrival date                                       |
| L      | **Starting KM**          | Optional | Number                | Vehicle odometer at start                                   |
| M      | **Ending KM**            | Optional | Number                | Vehicle odometer at end                                     |
| N      | **Distance KM**          | Optional | Number                | Total trip distance (auto-calculated if KM provided)        |
| O      | **Empty KM**             | Optional | Number                | Empty running kilometers                                    |
| P      | **Empty KM Reason**      | Optional | Text                  | Reason for empty kilometers                                 |
| Q      | **Base Revenue**         | Optional | Number                | Trip revenue amount                                         |
| R      | **Revenue Currency**     | Optional | ZAR / USD             | Currency for revenue (defaults to ZAR)                      |
| S      | **Special Requirements** | Optional | Text                  | Any special handling instructions                           |
| T      | **External Load Ref**    | Optional | Text                  | External reference number (from customer)                   |

---

## Sheet 2: Instructions

### Required Fields

The following fields are **mandatory** for each trip:

- Driver Name
- Vehicle Fleet Number
- Client Name
- Load Type
- Origin
- Destination
- Departure Date
- Arrival Date

### Date Format

All dates must be in **YYYY-MM-DD** format (e.g., 2026-01-20)

### Currency Options

- **ZAR** - South African Rand (default)
- **USD** - United States Dollar

### Client Type Options

- **internal** - Internal company transfers
- **external** - External customer loads (default)

### Status

All imported trips will be created with status **"active"** and payment status **"unpaid"**

### Vehicle Matching

The **Vehicle Fleet Number** must match an existing vehicle in the system. The system will look up the vehicle by fleet number.

---

## Sample Data Row

| Trip Number | Driver Name | Vehicle Fleet Number | Client Name       | Client Type | Load Type       | Origin       | Destination | Route      | Departure Date | Arrival Date | Starting KM | Ending KM | Distance KM | Empty KM | Empty KM Reason      | Base Revenue | Revenue Currency | Special Requirements | External Load Ref |
| ----------- | ----------- | -------------------- | ----------------- | ----------- | --------------- | ------------ | ----------- | ---------- | -------------- | ------------ | ----------- | --------- | ----------- | -------- | -------------------- | ------------ | ---------------- | -------------------- | ----------------- |
| TRIP-001    | John Smith  | FL-001               | ABC Logistics     | external    | General Freight | Johannesburg | Cape Town   | N1 Highway | 2026-01-20     | 2026-01-21   | 150000      | 151500    | 1500        | 50       | Returning from depot | 25000        | ZAR              | Handle with care     | PO-12345          |
| TRIP-002    | Jane Doe    | FL-002               | Internal Transfer | internal    | Equipment       | Pretoria     | Durban      | N3 Route   | 2026-01-22     | 2026-01-23   | 85000       | 85600     | 600         | 0        |                      | 15000        | ZAR              |                      |                   |

---

## Tips for Successful Import

1. **Remove any empty rows** between data entries
2. **Don't modify the header row** - column names must match exactly
3. **Save as .xlsx format** for best compatibility
4. **Verify vehicle fleet numbers** exist in the system before importing
5. **Check date formats** - incorrect dates will cause import failures
6. **Numbers should not contain** currency symbols, commas, or units (e.g., use `25000` not `R25,000`)

---

## Post-Import Actions

After importing trips, you can:

1. Assign additional costs to each trip
2. Update trip status (active → completed → paid)
3. Generate invoices
4. Track payments
5. Add supporting documents
