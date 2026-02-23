# QR Code System Documentation

## Overview

The QR Code System enables rapid mobile tyre inspections through two types of QR codes:
1. **Vehicle QR Codes** - Link to vehicle inspection start page
2. **Position QR Codes** - Link directly to specific tyre position inspection

## Features

### 1. Vehicle QR Codes

**Purpose:** Quick access to start a vehicle inspection
**URL Format:** `/inspections/mobile?vehicle={FLEET}-{REGISTRATION}`

**Use Cases:**
- General vehicle inspections
- Pre-trip inspections
- Comprehensive tyre checks
- When inspector needs to select positions manually

**Generation:**
- Navigate to **Admin > Vehicle QR Codes**
- Select vehicles from the grid
- Choose export option:
  - **Print Selected** - Browser print dialog for immediate printing
  - **Export to PDF** - Download professional PDF with multiple codes (2x3 grid, 6 per page)

**PDF Layout:**
- A4/Letter paper size
- 2 columns x 3 rows per page
- 60mm x 60mm QR code size
- Includes: Vehicle registration, Fleet number, Scan instructions
- Auto-generated filename: `vehicle-qr-codes-YYYY-MM-DD.pdf`

---

### 2. Position QR Codes

**Purpose:** Direct access to inspect a specific tyre position
**URL Format:** `/inspections/mobile?vehicle={FLEET}-{REGISTRATION}&position={POSITION}`

**Use Cases:**
- Ultra-fast single position inspection
- Tyre replacement verification
- Position-specific damage reporting
- Focused maintenance checks

**Generation:**
1. Navigate to **Admin > Vehicle QR Codes**
2. Switch to **Position QR Codes** tab
3. Select a vehicle
4. System auto-generates QR codes for ALL configured positions
5. Click **Export All to PDF** to download

**PDF Features:**
- One PDF per vehicle
- All tyre positions included (e.g., 11 codes for 33H fleet: V1-V10 + SP)
- 2x3 grid layout, 50mm x 50mm QR codes
- Each card shows: Position code (V1, V2), Position label (Front Left), Axle info, Vehicle registration
- Filename: `position-qr-{VEHICLE_REG}-YYYY-MM-DD.pdf`

---

## Fleet Configuration

### Supported Fleet Types

**Horse Fleets (10-tyre + spare):**
- 33H, 21H, 22H, 23H, 24H, 26H, 28H, 29H, 30H, 31H, 32H
- Positions: V1-V10 (front, rear axles) + SP (spare)

**Horse Fleets (6-tyre + spare):**
- 1H, 4H, 6H, UD
- Positions: V1-V6 (front, rear axle) + SP

**Light Vehicle Fleets (4-tyre + spare):**
- 14L, 15L
- Positions: V1-V4 + SP

**Interlink Trailer Fleets (16-tyre + spare):**
- 1T, 2T, 3T, 4T, 5T
- Positions: T1-T16 (4 axles) + SP

**Reefer Trailer Fleets (8-tyre + spare):**
- 5F, 6F, 7F, 8F
- Positions: R1-R8 (2 axles) + SP

---

## Mobile Inspection Flow

### Scanning Vehicle QR Code

1. User scans vehicle QR code
2. Redirected to `/inspections/mobile?vehicle={FLEET}-{REG}`
3. Mobile form loads with vehicle pre-selected
4. Inspector selects tyre position from dropdown
5. Completes inspection form
6. Submits data

### Scanning Position QR Code

1. User scans position QR code
2. Redirected to `/inspections/mobile?vehicle={FLEET}-{REG}&position={POS}`
3. Mobile form loads with **both vehicle AND position pre-selected**
4. Inspector immediately starts inspection (no selection needed)
5. Faster workflow - saves 2 interaction steps

---

## QR Code URL Deep Linking

### Query Parameters

| Parameter | Required | Example | Description |
|-----------|----------|---------|-------------|
| `vehicle` | Yes | `33H-ABC123GP` | Fleet number + registration |
| `position` | No | `V3` | Specific tyre position code |

### Valid Position Codes

**Horse Fleets:** `V1` to `V10`, `SP`  
**Trailers:** `T1` to `T16`, `SP`  
**Reefers:** `R1` to `R8`, `SP`  
**Light Vehicles:** `V1` to `V4`, `SP`

### URL Validation

The system validates:
- Vehicle exists in database
- Fleet configuration is defined
- Position code is valid for the fleet type
- QR code format matches expected pattern

Invalid scans display error toast with specific reason.

---

## Printing Guidelines

### Material Recommendations

**Vehicle QR Codes:**
- **Paper:** Weatherproof vinyl labels or laminated card stock
- **Size:** 100mm x 100mm minimum (QR code should be at least 60mm)
- **Placement:** Inside windshield, side door panel, or dashboard

**Position QR Codes:**
- **Paper:** Durable label stock with strong adhesive
- **Size:** 50mm x 50mm (sufficient for close-range scanning)
- **Placement:** Directly on mudguard, wheel arch, or chassis near tyre position

### Best Practices

1. **Contrast:** Always use dark QR on white/light background
2. **Protection:** Laminate or use weatherproof material for outdoor use
3. **Test Scans:** Verify all printed codes scan correctly before deployment
4. **Backup:** Keep PDF files archived for reprinting
5. **Lighting:** Position codes where adequate lighting is available

### Print Settings

- **Quality:** 300 DPI minimum
- **Color Mode:** Black & White (grayscale acceptable)
- **Paper Size:** A4 or Letter
- **Margins:** 15mm all sides (pre-configured in PDF)
- **Scaling:** 100% (do not scale to fit)

---

## Technical Implementation

### Code Location

**Component:** `src/components/admin/VehicleQRGenerator.tsx`  
**Config:** `src/constants/fleetTyreConfig.ts`  
**Hooks:** `src/hooks/useFleetTyrePositions.ts`

### QR Generation Library

- **Package:** `react-qr-code` (v2.0.18)
- **Error Correction:** Medium (default)
- **Encoding:** UTF-8

### PDF Generation

- **Library:** `jsPDF` (v3.0.3)
- **Canvas Rendering:** SVG → Canvas → PNG → PDF
- **Resolution:** 256x256px QR code rendered, scaled to mm

### Deep Link Parsing

```typescript
// Example implementation in MobileTyreInspectionForm.tsx
const searchParams = new URLSearchParams(window.location.search);
const vehicleParam = searchParams.get('vehicle');
const positionParam = searchParams.get('position');

// Auto-populate form fields if parameters present
if (vehicleParam) setVehicleId(vehicleParam);
if (positionParam) setPosition(positionParam);
```

---

## Troubleshooting

### QR Code Won't Scan

**Causes:**
- Insufficient contrast (faded print, dirty label)
- QR code too small (<30mm)
- Damaged or wrinkled label
- Poor lighting conditions

**Solutions:**
- Reprint with higher quality settings
- Clean label surface
- Use flashlight or better lighting
- Replace damaged labels

### Wrong Vehicle/Position Loaded

**Causes:**
- Typo in vehicle registration during QR generation
- Label applied to wrong vehicle/position
- Database record mismatch

**Solutions:**
- Verify vehicle exists in system
- Check fleet configuration is current
- Regenerate QR codes after vehicle updates
- Re-label with correct codes

### PDF Won't Generate

**Causes:**
- Browser blocking downloads
- Insufficient memory for large batches
- Popup blocker active

**Solutions:**
- Allow downloads from the site
- Generate smaller batches (<20 vehicles at a time)
- Disable popup blockers
- Use modern browser (Chrome, Edge, Firefox)

---

## Future Enhancements

### Phase 3: Mobile Performance (Planned)
- QR scanner lazy loading
- Offline caching of vehicle data
- Image compression for faster uploads
- Swipe gesture optimization

### Phase 4: Analytics Dashboard (Planned)
- QR scan event tracking
- Inspector performance metrics
- Most inspected positions
- Scan success/failure rates
- Weekly usage reports

---

## Migration Notes

### Database Requirements

**No database changes required for QR system**

All functionality uses existing tables:
- `vehicles` - Vehicle registration data
- `fleet_*_tyres` - Position tracking tables
- `vehicle_inspections` - Inspection records
- `inspector_profiles` - Inspector data

### Configuration Updates

If adding new fleet types:
1. Update `FLEET_CONFIGURATIONS` in `fleetTyreConfig.ts`
2. Define positions array with `position`, `label`, and `axle`
3. Ensure corresponding `fleet_XX_tyres` table exists
4. Restart application (no DB migration needed)

---

## Support & Maintenance

### Regular Tasks

**Monthly:**
- Review QR code print inventory
- Replace damaged/faded labels
- Archive old PDF files (>6 months)

**Quarterly:**
- Audit label placement accuracy
- Verify all vehicles have QR codes
- Check for new fleet additions

**Annually:**
- Review fleet configuration for accuracy
- Update documentation with new features
- Assess QR code system effectiveness

---

## Contact & Resources

**QR Code Format Specifications:** ISO/IEC 18004  
**PDF Generation Library:** [jsPDF Documentation](https://github.com/parallax/jsPDF)  
**QR React Component:** [react-qr-code](https://www.npmjs.com/package/react-qr-code)

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-28  
**System Version:** Phase 2 Complete
