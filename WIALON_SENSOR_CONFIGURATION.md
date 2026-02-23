# Wialon Sensor Configuration Guide

## Overview

This document maps the Wialon sensor configurations for each fleet vehicle to ensure proper fuel probe verification and monitoring.

## Sensor Analysis by Fleet

### Fleet 23H - AFQ 1324 (Int Sim)

**Hardware**: Teltonika FMB920
**Unit ID**: 352592576285704

**Sensors Configured**:

1. **Ignition** (Sensor ID: 1)

   - Type: Engine operation
   - Parameter: `io_1`
   - Purpose: Engine on/off detection

2. **Small Tank** (Sensor ID: 2) ⚠️

   - Type: Fuel level
   - Parameter: `io_273`
   - Capacity: 0-200L (calibrated to 1780.13L max)
   - **Flags**: 64 (fuel calculation enabled)
   - Min filling: 20L
   - Min theft: 10L
   - **Status**: Active fuel monitoring

3. **Big Tank** (Sensor ID: 3) ⚠️

   - Type: Fuel level
   - Parameter: `io_270`
   - Capacity: 0-400L (calibrated to 3539.3L max)
   - **Flags**: 64 (fuel calculation enabled)
   - Min filling: 20L
   - Min theft: 10L
   - **Status**: Active fuel monitoring

4. **External Voltage** (Sensor ID: 4)

   - Parameter: `io_66/const1000`

5. **Signal Strength** (Sensor ID: 5)
   - Parameter: `gsm`

**Probe Status**: ❌ **NOT IN PROBES LIST** - Should be added if fuel sensors are calibrated

---

### Fleet 24H - AFQ 1325 (Int Sim)

**Hardware**: Teltonika FMB920
**Unit ID**: 352625693727222
**Fuel Rate Coefficient**: 51

**Sensors Configured**:

1. **Ignition** (Sensor ID: 1)
2. **Small Tank** (Sensor ID: 3) ⚠️
   - Parameter: `io_273`
   - Capacity: 0-200L
   - **Flags**: 64
3. **Big Tank** (Sensor ID: 4) ⚠️
   - Parameter: `io_270`
   - Capacity: 0-400L
   - **Flags**: 64
4. **External Voltage** (Sensor ID: 5)
5. **Battery Voltage** (Sensor ID: 1 - monitoring_battery_id)

**Probe Status**: ❌ **NOT IN PROBES LIST** - Should be added

---

### Fleet 26H - AFQ 1327 (Int Sim)

**Hardware**: Teltonika FMB140
**Unit ID**: 357544376232183
**Fuel Rate Coefficient**: 51

**Sensors Configured**:

1. **Small Tank** (Sensor ID: 1) ⚠️
   - Parameter: `io_273`
   - **Flags**: 64
2. **Big Tank** (Sensor ID: 2) ⚠️
   - Parameter: `io_270`
   - **Flags**: 64
3. **Ignition** (Sensor ID: 3)
4. **External Voltage** (Sensor ID: 4)
5. **Signal Strength** (Sensor ID: 5)

**Probe Status**: ✅ **IN PROBES LIST** - Correctly configured

---

### Fleet 28H - AFQ 1329 (Int Sim)

**Hardware**: Teltonika FMB920
**Unit ID**: 352592576816946
**Fuel Rate Coefficient**: 51

**Sensors Configured**:

1. **Small Tank** (Sensor ID: 1) ⚠️
   - Parameter: `io_273`
   - **Flags**: 64
2. **Big Tank** (Sensor ID: 2) ⚠️
   - Parameter: `io_270`
   - **Flags**: 64
3. **Ignition** (Sensor ID: 3)
4. **External Voltage** (Sensor ID: 4)
5. **Signal Strength** (Sensor ID: 5)

**Probe Status**: ✅ **IN PROBES LIST** - Correctly configured

---

### Fleet 30H - AGL 4216

**Hardware**: Teltonika FMB920
**Unit ID**: 352592576336838

**Sensors Configured**:

1. **Small Tank** (Sensor ID: 1) ⚠️
   - Parameter: `io_273`
2. **Ignition** (Sensor ID: 2)
3. **External Voltage** (Sensor ID: 3)
4. **Signal Strength** (Sensor ID: 4)

**Probe Status**: ❌ **NOT IN PROBES LIST** - Limited sensor data

---

### Fleet 31H - AGZ 1963 (Int sim)

**Hardware**: Teltonika FMC920
**Unit ID**: 864454077925646
**Fuel Rate Coefficient**: 48

**Sensors Configured**:

1. **Small Tank** (Sensor ID: 1) ⚠️
   - Parameter: `io_273`
   - **Flags**: 64
2. **Big Tank** (Sensor ID: 2) ⚠️
   - Parameter: `io_270`
   - **Flags**: 64
3. **Ignition** (Sensor ID: 3)
4. **External Voltage** (Sensor ID: 4)
5. **Signal Strength** (Sensor ID: 5)

**Probe Status**: ❌ **NOT IN PROBES LIST** - Should be added

---

### Fleet 32H - JF964 FS (Int sim)

**Hardware**: Teltonika FMC920
**Unit ID**: 867747072816653
**Fuel Rate Coefficient**: 48

**Sensors Configured**:

1. **Ignition** (Sensor ID: 1)
2. **External Voltage** (Sensor ID: 2)
3. **Signal Strength** (Sensor ID: 3)

**Probe Status**: ❌ **NOT IN PROBES LIST** - No fuel sensors configured

---

## Key Findings

### Vehicles WITH Fuel Probes (Sensors Flag 64)

These vehicles have calibrated fuel level sensors and should require probe verification:

| Fleet | Hardware | Small Tank | Big Tank  | In Probe List? | Action Required    |
| ----- | -------- | ---------- | --------- | -------------- | ------------------ |
| 23H   | FMB920   | io_273 ✅  | io_270 ✅ | ❌             | **ADD TO LIST**    |
| 24H   | FMB920   | io_273 ✅  | io_270 ✅ | ❌             | **ADD TO LIST**    |
| 26H   | FMB140   | io_273 ✅  | io_270 ✅ | ✅             | Already configured |
| 28H   | FMB920   | io_273 ✅  | io_270 ✅ | ✅             | Already configured |
| 31H   | FMC920   | io_273 ✅  | io_270 ✅ | ❌             | **ADD TO LIST**    |

### Vehicles WITHOUT Fuel Probes

| Fleet | Hardware | Status                              |
| ----- | -------- | ----------------------------------- |
| 22H   | -        | Data not analyzed                   |
| 29H   | -        | In probe list but no data file      |
| 30H   | FMB920   | Has sensor but not fully configured |
| 32H   | FMC920   | No fuel sensors                     |

## Sensor Parameter Standards

### Fuel Level Sensors

- **Small Tank Parameter**: `io_273` (standard across fleet)
- **Big Tank Parameter**: `io_270` (standard across fleet)
- **Flags**: 64 (indicates fuel calculation is enabled)
- **Min Filling Volume**: 20L (typical)
- **Min Theft Volume**: 10L (typical)

### Critical Configuration

- **calc_fuel**: 2 (fuel consumption calculation enabled)
- **engine_sensors**: [1] (linked to ignition sensor)
- **filterQuality**: 10 (noise filtering)
- **flags**: 5834 (combined calculation flags)

## Recommendations

### 1. Update TRUCKS_WITH_PROBES Constant

Add the following fleets that have calibrated fuel sensors:

```typescript
export const TRUCKS_WITH_PROBES = [
  "4H",
  "6H",
  "23H",
  "24H",
  "26H",
  "28H",
  "29H",
  "31H",
] as const;
```

### 2. Create Sensor Mapping Configuration

Store Wialon sensor IDs per fleet for API queries:

```typescript
export const FLEET_SENSOR_MAPPING = {
  "23H": { unit_id: 352592576285704, small_tank_sensor: 2, big_tank_sensor: 3 },
  "24H": { unit_id: 352625693727222, small_tank_sensor: 3, big_tank_sensor: 4 },
  "26H": { unit_id: 357544376232183, small_tank_sensor: 1, big_tank_sensor: 2 },
  "28H": { unit_id: 352592576816946, small_tank_sensor: 1, big_tank_sensor: 2 },
  "31H": { unit_id: 864454077925646, small_tank_sensor: 1, big_tank_sensor: 2 },
} as const;
```

### 3. Probe Verification Workflow

For vehicles with fuel probes:

1. **Capture diesel fill amount** from pump receipt
2. **Query Wialon API** for sensor readings before/after fill
3. **Calculate discrepancy**: `|probe_reading - actual_litres|`
4. **Flag if discrepancy > 5L**: Require probe verification
5. **Trigger debrief if > 10L**: Immediate investigation needed

### 4. Sensor Health Monitoring

- Monitor sensor data quality (filterQuality parameter)
- Alert if fuel sensor readings are stale (> 1 hour)
- Track calibration drift over time
- Schedule recalibration if consistent discrepancies

## Integration Points

### ProbeVerificationModal

- Uses `TRUCKS_WITH_PROBES` to determine if probe verification is needed
- Should validate against `FLEET_SENSOR_MAPPING` to ensure sensors exist
- Can query Wialon API using unit_id and sensor IDs

### DieselManagement

- Auto-flag records from probe-equipped trucks for verification
- Compare manual entry against Wialon sensor data
- Generate alerts for missing probe verification on equipped vehicles

## Next Steps

1. ✅ Update `TRUCKS_WITH_PROBES` constant with additional fleets (23H, 24H, 31H)
2. ⚠️ Create `FLEET_SENSOR_MAPPING` configuration
3. ⚠️ Implement Wialon sensor query integration
4. ⚠️ Add automatic probe verification requirement based on sensor data
5. ⚠️ Build sensor health dashboard
6. ⚠️ Investigate missing data for 22H, 29H

## Technical Notes

### Sensor Flags Explained

- **Flag 64**: Fuel calculation enabled - sensor actively calculating consumption
- **calc_fuel: 2**: Advanced fuel consumption calculation method
- **engine_sensors**: Array linking fuel sensors to ignition (prevents false readings when engine off)

### Calibration Table Format

Each fuel sensor has a calibration table (`tbl` array) with:

- `x`: Raw sensor value
- `a`: Linear coefficient (slope)
- `b`: Offset coefficient (intercept)
- Formula: `litres = (a × sensor_value) + b`

This ensures accurate conversion from electrical signal to actual fuel volume.
