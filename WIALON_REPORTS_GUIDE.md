# Wialon Reports Integration Guide

## Overview

The Wialon Reports system allows you to generate detailed tracking and performance reports from your fleet's Wialon GPS data. This guide covers how to use the report templates from your Wialon account.

## Available Resources & Templates

Based on your Wialon configuration (see `wialon_data/reports.json`):

### Resource: Matanuska (ID: 25138250)

| Template ID | Name                                | Type        | Tables Available                                                                                                                                                                            |
| ----------- | ----------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1           | MATANUSKA DAILY SUMMARY- ALL VALUES | Unit Report | Parkings, Video, Images, Events, Fuel fillings and battery charges, Speedings, Fuel drains, Statistics, Trip Report, Fuel fillings, Fuel thefts, Speedings, Summary, FUEL LEVEL/SPEED CHART |
| 2           | Matanuska Fuel report               | Unit Report | Statistics, Fuel fillings, Fuel thefts, Summary                                                                                                                                             |
| 3           | New report (Statistics & Stops)     | Unit Report | Statistics, Stops                                                                                                                                                                           |
| 4           | New report (Comprehensive)          | Unit Report | Statistics, Video, Stops, Speedings, Parkings, Images, Events, Fuel drains, Fuel fillings and battery charges, Unit latest data, Render geofences, Trips, Trips between geofences           |

## How to Use

### 1. Access Wialon Reports

Navigate to **Wialon Reports** from the main menu or sidebar.

### 2. Execute a Report

**Step-by-Step:**

1. **Select Resource**

   - Choose "Matanuska" (currently the only resource with templates)
   - The system will load all available report templates for this resource

2. **Choose Report Template**

   - Select from 4 available templates:
     - **Daily Summary** - Comprehensive overview (recommended for daily operations)
     - **Fuel Report** - Focused on fuel consumption and theft detection
     - **Statistics & Stops** - Basic trip statistics with stop analysis
     - **Comprehensive** - Full data dump with all available metrics

3. **Select Vehicle Unit**

   - Choose which vehicle you want to analyze
   - All GPS-tracked vehicles from your Wialon account will be available

4. **Choose Time Period**

   - **Today** - Current day from midnight
   - **Yesterday** - Previous 24-hour period
   - **Last 7 Days** - Rolling week
   - **Last 30 Days** - Rolling month
   - **Custom Range** - Specify exact start/end dates (coming soon)

5. **Execute Report**
   - Click "Execute Report" button
   - Report generation typically takes 5-30 seconds depending on data volume
   - Results automatically display in the "View Results" tab

### 3. View Results

Reports are displayed in table format with the following features:

- **Multiple Tables**: If a report has multiple tables (e.g., Statistics + Trips), tabs allow switching between them
- **Export to CSV**: Download any table as CSV for Excel/spreadsheet analysis
- **Formatted Data**: Timestamps, distances, speeds, and durations are auto-formatted for readability

### 4. System Info (Debug)

The "System Info" tab shows:

- Connected resources and template count
- All available report templates with IDs and types
- List of vehicle units available for reporting
- Raw JSON data for troubleshooting

## Report Template Details

### Template #1: MATANUSKA DAILY SUMMARY

**Use Case**: Daily operational review and comprehensive analysis

**Tables Included**:

- **Statistics** - Overall distance, time, fuel consumption
- **Trip Report** - All trips with start/end times and locations
- **Parkings** - Where vehicles were parked and for how long
- **Speedings** - Speed violations with location and time
- **Fuel Fillings** - Refueling events detected
- **Fuel Drains** - Potential fuel theft detection
- **Events** - System events (engine on/off, inputs, etc.)
- **FUEL LEVEL/SPEED CHART** - Visual chart data
- **Video** - Video recording metadata (if camera installed)
- **Images** - Photo metadata (if camera installed)

**Best For**: End-of-day operations review, fleet management overview

---

### Template #2: Matanuska Fuel Report

**Use Case**: Fuel management and theft detection

**Tables Included**:

- **Statistics** - Summary of fuel consumed vs distance
- **Fuel Fillings** - All refueling events with amounts
- **Fuel Thefts** - Suspicious fuel level drops
- **Summary** - Consolidated fuel metrics

**Best For**: Fuel expense tracking, detecting unauthorized fuel drainage

---

### Template #3: Statistics & Stops

**Use Case**: Basic trip analysis

**Tables Included**:

- **Statistics** - Distance, time, avg speed
- **Stops** - All stops with duration and location

**Best For**: Simple trip verification, stop time analysis

---

### Template #4: Comprehensive Report

**Use Case**: Complete data export for advanced analysis

**Tables Included**: Everything from all other templates plus:

- **Unit Latest Data** - Current vehicle status
- **Render Geofences** - Geofence entry/exit events
- **Trips Between Geofences** - Geofence-to-geofence routing

**Best For**: Custom analysis, regulatory compliance, detailed investigations

## Technical Implementation

### Code Structure

```
src/
├── hooks/
│   └── useWialonReports.ts          # Core report API logic
├── components/reports/
│   ├── WialonReportExecutor.tsx     # Report execution UI
│   ├── WialonReportViewer.tsx       # Table display and CSV export
│   └── WialonReportDebug.tsx        # System diagnostics
└── pages/
    └── WialonReports.tsx             # Main page with tabs
```

### Key Functions

**`useWialonReports` Hook:**

- `resources` - List of Wialon resources with templates
- `units` - Available vehicles
- `getTemplates(resourceId, type)` - Get templates for resource
- `executeReport(params)` - Generate report
- `fetchTableRows(result, tableIndex)` - Retrieve table data
- `formatCellValue(cell)` - Format cell for display

### API Integration

Reports use the Wialon Remote API:

- **Endpoint**: `report/exec_report`
- **Authentication**: Token-based (via environment variable or edge function)
- **Data Format**: JSON with nested table structures

### Recent Fixes

**Problem**: Report templates were not loading from Wialon API.

**Root Cause**: Templates are stored in Wialon's API response as an object with numeric keys (e.g., `{ "1": {...}, "2": {...} }`), but code was trying to use `Object.values()` directly which didn't preserve IDs.

**Solution**: Updated `useWialonReports.ts` to properly map template IDs from object keys:

```typescript
Object.entries(item.rep).forEach(([key, template]) => {
  reports.push({
    id: Number(key), // Use the key as the template ID
    n: template.n,
    ct: template.ct,
    // ...
  });
});
```

**Result**: All 4 report templates now load correctly with proper IDs (1, 2, 3, 4).

## Troubleshooting

### "No templates available"

**Check**:

1. Go to "System Info" tab
2. Verify resource is loaded and shows template count > 0
3. Check that templates are configured in Wialon account
4. Verify `VITE_WIALON_TOKEN` is set in environment

### "Report execution failed"

**Common Causes**:

- Invalid time range (e.g., future dates)
- Unit has no data for selected period
- Wialon API token expired
- Network connectivity issue

**Solutions**:

- Try "Today" or "Yesterday" first (guaranteed to work if vehicle is active)
- Check vehicle has GPS data in Wialon web interface
- Refresh page to re-authenticate
- Check browser console for detailed error messages

### "Empty tables in report"

**This is normal if**:

- Vehicle was inactive during time period
- Specific events didn't occur (e.g., no speeding = empty Speedings table)

### Template IDs don't match

If you see template IDs like 1, 2, 3, 4 but names don't match, your Wialon account templates may have been updated. Re-check `wialon_data/reports.json` or run the System Info tab to see current templates.

## Export & Integration

### CSV Export

- Click "Export CSV" button on any table
- File downloads with template name as filename
- Import into Excel, Google Sheets, or analytics tools

### Programmatic Access

Report data is available via the `ReportResult` object:

```typescript
const tables = reportResult.getTables();
const rows = await fetchTableRows(reportResult, 0);
```

## Future Enhancements

- [ ] Custom date range picker
- [ ] Scheduled reports (daily/weekly email)
- [ ] Report templates from other resources
- [ ] Multi-unit comparison reports
- [ ] Save favorite template/unit combinations
- [ ] Real-time report streaming
- [ ] PDF export with charts
- [ ] Anomaly detection (auto-flag issues)

## Support

For issues or questions:

1. Check "System Info" tab for diagnostic data
2. Review browser console for errors
3. Verify Wialon token is valid
4. Contact fleet administrator for access issues
