# Project Changelog

## Format
Each entry follows: `[DATE] [TIME] - Change #[NUMBER]: [DESCRIPTION]`

---

## 2025-01-28

### Change #001 - 15:30 UTC
**Type:** Feature - Dual Inspection Type Support
**Files Created:**
- `src/components/inspections/InspectionTypeSelector.tsx`

**Files Modified:**
- `src/components/inspections/MobileInspectionStart.tsx`
- `src/components/VehicleInspection.tsx`
- `src/pages/Inspections.tsx`
- `src/App.tsx`

**Changes:**
- Added inspection type selection screen after QR scan
- Users can now choose between Tyre Inspection or Routine Vehicle Inspection
- Pre-fills vehicle data from QR scan into both inspection types
- Added new route `/inspections/type-selector`
- Updated MobileInspectionStart to navigate to type selector
- Modified VehicleInspection to accept pre-filled inspection data via location.state
- Auto-starts inspection when initiated via QR scan

**Reason:** Enable mobile QR scanning to activate both tyre and routine inspections, giving users choice after scanning

**Status:** ✅ Verified

---

### Change #002 - 16:15 UTC
**Type:** Refactor - Navigation Cleanup
**Files Deleted:**
- `src/pages/QRCodes.tsx`
- `src/components/QRCodeManager.tsx`

**Files Modified:**
- `src/components/Layout.tsx`
- `src/App.tsx`

**Changes:**
- Removed duplicate "QR Codes" menu item from Workshop sidebar (non-functional mock)
- Removed `/qr-codes` route from routing configuration
- Cleaned up unused QRCodeManager component
- Kept functional "Vehicle QR Codes" as the single QR management interface
- Updated workshopPaths array to remove `/qr-codes`

**Reason:** Eliminate duplicate non-functional menu items, consolidate QR functionality into working Vehicle QR system

**Status:** ✅ Verified

---

### Change #003 - 16:15 UTC
**Type:** Documentation - Change Tracking System
**Files Created:**
- `CHANGELOG.md`
- `PRE_CHANGE_CHECKLIST.md`

**Changes:**
- Created structured changelog with date, time, change number format
- Documented all changes from current session
- Created pre-change review checklist for future modifications
- Established workflow for documenting changes before and after implementation

**Reason:** Enable systematic tracking of codebase evolution for managing large-scale projects

**Status:** ✅ Verified

---

### Change #004 - 18:45 UTC
**Type:** Feature - Deep Link QR Code System
**Files Modified:**
- `src/components/admin/VehicleQRGenerator.tsx`
- `src/components/inspections/MobileInspectionStart.tsx`
- `src/components/tyres/PositionQRScanner.tsx`
- `src/components/tyres/TyreQRCodeSystem.tsx`

**Changes:**
- Updated vehicle QR codes to generate URLs instead of plain text (e.g., `https://domain.com/inspections/mobile?vehicle=33H-JFK963FS`)
- Added URL parameter parsing to MobileInspectionStart for deep link support
- Updated PositionQRScanner to handle both URL-based (new) and text-based (legacy) QR formats
- Updated position QR generation to use URL format with vehicle and position parameters
- QR codes now work when scanned with phone cameras, automatically opening the web app
- Maintained backward compatibility with old text-based QR codes

**Reason:** Enable native phone camera scanning of QR codes, which previously showed "app not available" error because they contained plain text instead of URLs

**Status:** ✅ Verified

---
