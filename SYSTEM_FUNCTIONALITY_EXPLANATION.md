# Car Craft Co - Fleet Management System Functionality

## 📋 Overview

This document explains the core functionality of the **Scheduled Maintenance**, **Job Cards**, and **Inspections** systems and how they interconnect in the fleet management workflow.

---

## 🗓️ **1. SCHEDULED MAINTENANCE SYSTEM**

### Core Purpose

Automated preventive maintenance tracking for the entire vehicle fleet based on time intervals, mileage, or custom schedules.

### Key Components

#### **1.1 Maintenance Schedules** (`maintenance_schedules` table)

**Location**: `/src/pages/MaintenanceScheduling.tsx`

**Database Schema**:

```sql
CREATE TABLE maintenance_schedules (
  id UUID PRIMARY KEY,
  vehicle_id UUID REFERENCES vehicles(id),
  title TEXT NOT NULL,
  description TEXT,
  schedule_type maintenance_schedule_type,  -- 'one_time' | 'recurring'
  frequency maintenance_frequency,           -- 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  frequency_value INTEGER,
  next_due_date DATE,
  last_completed_date DATE,
  priority maintenance_priority,             -- 'low' | 'medium' | 'high' | 'critical'
  category maintenance_category,             -- 'inspection' | 'service' | 'repair' | 'replacement' | 'calibration'
  auto_create_job_card BOOLEAN DEFAULT false,
  related_template_id UUID REFERENCES job_card_templates(id),
  odometer_based BOOLEAN DEFAULT false,
  odometer_interval_km INTEGER,
  is_active BOOLEAN DEFAULT true,
  alert_before_hours INTEGER[],
  notification_recipients JSONB,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

**Key Features**:

- ✅ **Automatic Job Card Creation**: When `auto_create_job_card = true`, the system automatically creates a job card when maintenance becomes due
- ✅ **Template Integration**: Links to job card templates for pre-configured tasks and parts
- ✅ **Flexible Scheduling**: Supports time-based OR odometer-based intervals
- ✅ **Priority Levels**: Critical, High, Medium, Low
- ✅ **Automated Alerts**: Configurable notifications before due dates

### **1.2 Scheduled Maintenance Statistics**

**Location**: `/src/pages/MaintenanceScheduling.tsx` (lines 36-62)

The system tracks:

```typescript
{
  total: number,              // Total active schedules
  dueToday: number,           // Schedules due today
  overdue: number,            // Overdue schedules
  completedThisMonth: number  // Completed this month
}
```

**Query Logic**:

```typescript
// Due Today
.eq("is_active", true)
.eq("next_due_date", today)

// Overdue
.eq("is_active", true)
.lt("next_due_date", today)

// Completed This Month
.from("maintenance_schedule_history")
.eq("status", "completed")
.gte("completed_date", firstDayOfMonth)
```

### **1.3 Maintenance Scheduler Edge Function**

**Location**: `/supabase/functions/maintenance-scheduler/index.ts`

**Automated Daily Tasks**:

1. **Check Overdue Schedules**

   ```typescript
   .lt('next_due_date', today)
   .eq('is_active', true)
   ```

2. **Generate Alerts**

   - For schedules with `alert_before_hours` configured
   - Sends notifications to `notification_recipients`
   - Creates records in `maintenance_alerts` table

3. **Auto-Create Job Cards**

   ```typescript
   const { data: dueSchedules } = await supabase
     .from("maintenance_schedules")
     .eq("auto_create_job_card", true)
     .lte("next_due_date", today);

   // Creates job card with:
   // - title: `Scheduled: ${schedule.title}`
   // - status: 'open'
   // - priority: from schedule
   // - vehicle_id: from schedule
   ```

**Returns Summary**:

```json
{
  "success": true,
  "overdueCount": 5,
  "alertsGenerated": 12,
  "alertsSent": 12,
  "jobCardsCreated": 3
}
```

---

## 🔧 **2. JOB CARDS SYSTEM**

### Core Purpose

Work order management for actual maintenance, repairs, and inspections performed on vehicles.

### Key Components

#### **2.1 Job Card Structure** (`job_cards` table)

**Database Schema**:

```sql
CREATE TABLE job_cards (
  id UUID PRIMARY KEY,
  job_number TEXT UNIQUE NOT NULL,
  vehicle_id UUID REFERENCES vehicles(id),
  title TEXT NOT NULL,
  description TEXT,
  status job_card_status,  -- 'open' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled'
  priority TEXT,           -- 'low' | 'medium' | 'high' | 'urgent'
  category TEXT,
  assignee TEXT,
  scheduled_date DATE,
  completed_date TIMESTAMP,
  estimated_hours DECIMAL,
  actual_hours DECIMAL,
  maintenance_schedule_id UUID REFERENCES maintenance_schedules(id),
  inspection_id UUID REFERENCES vehicle_inspections(id),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

#### **2.2 Job Card Kanban Board**

**Location**: `/src/components/JobCardKanban.tsx`

**Visual Workflow**:

```
┌─────────────┬──────────────┬─────────────┬─────────────┐
│   PENDING   │ IN PROGRESS  │  ON HOLD    │  COMPLETED  │
├─────────────┼──────────────┼─────────────┼─────────────┤
│  Status:    │  Status:     │  Status:    │  Status:    │
│  'pending'  │  'in_progress'│  'on_hold'  │ 'completed' │
│             │              │             │             │
│  Color:     │  Color:      │  Color:     │  Color:     │
│  Gray       │  Blue        │  Yellow     │  Green      │
└─────────────┴──────────────┴─────────────┴─────────────┘
```

**Real-time Query**:

```typescript
const { data: jobCards } = useQuery({
  queryKey: ["job_cards"],
  queryFn: async () => {
    return await supabase
      .from("job_cards")
      .select("*")
      .order("created_at", { ascending: false });
  },
});
```

**Filters Available**:

- 🔍 Search (by title)
- 📊 Status (pending, in_progress, on_hold, completed)
- ⚡ Priority (low, medium, high, urgent)
- 👤 Assignee

#### **2.3 Job Card Creation Sources**

Job cards are created from **3 different sources**:

##### **A. From Maintenance Schedules**

**Location**: `/src/components/dialogs/CreateJobCardFromScheduleDialog.tsx`

**Process**:

1. User clicks "Create Job Card" button in schedule details
2. Dialog opens with pre-filled data:
   - Title: `Scheduled: ${schedule.title}`
   - Priority: Inherited from schedule
   - Vehicle: From schedule
3. If `related_template_id` exists:
   - Copies default tasks from template
   - Copies default parts from template
4. Creates history record linking schedule → job card

**Code Example**:

```typescript
const { data: jobCard } = await supabase.from("job_cards").insert({
  job_number: `JOB-${Date.now()}`,
  vehicle_id: schedule.vehicle_id,
  title: `Scheduled: ${schedule.title}`,
  description: schedule.description,
  priority: schedule.priority,
  status: "open",
});

// Link to maintenance history
await supabase.from("maintenance_schedule_history").insert({
  schedule_id: schedule.id,
  job_card_id: jobCard.id,
  scheduled_date: schedule.next_due_date,
  status: "scheduled",
});
```

##### **B. From Vehicle Inspections**

**Location**: `/src/components/dialogs/CreateJobCardFromInspectionDialog.tsx`

**Process**:

1. Inspector completes vehicle inspection
2. System identifies faults requiring attention
3. User selects faults to include in job card
4. Job card created with:
   - Title: Auto-generated from fault count
   - Description: Lists all selected faults
   - Priority: Based on fault severity
   - Tasks: One task per fault

**Fault Severity Mapping**:

```typescript
'critical' → priority: 'urgent'
'high'     → priority: 'high'
'medium'   → priority: 'medium'
'low'      → priority: 'low'
```

**Code Example**:

```typescript
const selectedFaults = faults.filter((f) => f.requires_immediate_attention);

const { data: jobCard } = await supabase.from("job_cards").insert({
  job_number: `JOB-${Date.now()}`,
  vehicle_id: vehicleId,
  inspection_id: inspectionId,
  title: `Inspection Faults: ${selectedFaults.length} items`,
  description: selectedFaults.map((f) => f.fault_description).join("\n"),
  status: "open",
  priority: determinePriority(selectedFaults),
});
```

##### **C. Manual Creation**

**Location**: `/src/components/dialogs/AddJobCardDialog.tsx`

Users can manually create job cards for:

- Ad-hoc repairs
- Customer requests
- Emergency breakdowns
- Preventive maintenance not in schedule

#### **2.4 Job Card Tracking & Components**

**Associated Data**:

```
job_cards
  ├── job_card_tasks        (checklist items)
  ├── job_card_labor        (technician time entries)
  ├── job_card_parts        (parts used/requested)
  └── job_card_notes        (communication log)
```

**Stats Tracked** (`JobCardStats.tsx`):

- ✅ Tasks: Completed / Total
- ⏱️ Labor Hours: Actual vs Estimated
- 💰 Parts Cost: Total value
- 📊 Overall Progress: Percentage

---

## 🔍 **3. INSPECTIONS SYSTEM**

### Core Purpose

Regular vehicle condition assessments that can trigger maintenance schedules or job cards.

### Key Components

#### **3.1 Vehicle Inspections** (`vehicle_inspections` table)

**Database Schema**:

```sql
CREATE TABLE vehicle_inspections (
  id UUID PRIMARY KEY,
  vehicle_id UUID REFERENCES vehicles(id),
  inspection_date TIMESTAMP NOT NULL,
  inspector_name TEXT NOT NULL,
  inspection_type TEXT,  -- 'pre_trip' | 'post_trip' | 'scheduled' | 'random'
  status inspection_status,  -- 'pending' | 'in_progress' | 'completed' | 'cancelled'
  odometer_reading INTEGER,
  overall_condition TEXT,
  notes TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE inspection_items (
  id UUID PRIMARY KEY,
  inspection_id UUID REFERENCES vehicle_inspections(id),
  category TEXT,  -- 'braking' | 'electrical' | 'engine' | 'tyre'
  item_name TEXT,
  status inspection_item_status,  -- 'pass' | 'fail' | 'attention' | 'not_applicable'
  notes TEXT,
  photo_urls TEXT[],
  requires_immediate_attention BOOLEAN
);
```

#### **3.2 Inspection Workflow**

**Location**: `/src/components/VehicleInspection.tsx`

**Step-by-Step Process**:

1. **Start Inspection**

   ```typescript
   const { data: inspection } = await supabase
     .from("vehicle_inspections")
     .insert({
       vehicle_id: selectedVehicle,
       inspector_name: userName,
       inspection_date: new Date().toISOString(),
       status: "in_progress",
     });
   ```

2. **Assess Categories**

   - Braking System
   - Electrical System
   - Engine & Mechanical
   - Tyre Condition
   - Body & Lights
   - Safety Equipment

3. **Mark Items**

   - ✅ **Pass**: Item in good condition
   - ❌ **Fail**: Item needs repair
   - ⚠️ **Attention**: Monitor closely
   - ➖ **N/A**: Not applicable

4. **Identify Faults**

   ```typescript
   if (item.status === "fail" || item.requires_immediate_attention) {
     // Add to faults list
     faults.push({
       fault_description: item.notes,
       severity: determineSeverity(item),
       category: item.category,
     });
   }
   ```

5. **Complete Inspection**
   - Updates status to `completed`
   - Calculates overall condition
   - Triggers fault processing

#### **3.3 Inspection → Maintenance Schedule Link**

**Location**: `/src/components/inspections/MaintenanceInspectionLink.tsx`

**Automatic Detection**:

```typescript
// System shows related maintenance schedules for the vehicle
const { data: relatedSchedules } = await supabase
  .from("maintenance_schedules")
  .select("*")
  .eq("vehicle_id", vehicleId)
  .eq("is_active", true)
  .order("next_due_date", { ascending: true });
```

**User Actions**:

- **Link Inspection**: Associates inspection with maintenance schedule
- **Mark as Complete**: Updates schedule history
- **Create Job Card**: If repairs needed

**Linking Process**:

```typescript
const linkInspectionToSchedule = async (scheduleId: string) => {
  await supabase.from("maintenance_schedule_history").insert({
    schedule_id: scheduleId,
    inspection_id: inspectionId,
    scheduled_date: new Date().toISOString().split("T")[0],
    completed_date: new Date().toISOString(),
    status: "completed",
  });
};
```

#### **3.4 Inspection → Job Card Creation**

**When Faults Detected**:

```typescript
const faultsWithoutJobCard = faults.filter((f) => !f.job_card_id);

if (faultsWithoutJobCard.length > 0) {
  // Show button: "Create Job Card from Faults"
  handleCreateJobCard();
}
```

**Fault Promotion**:

- Inspector marks fault as "Requires Immediate Attention"
- Fault is promoted to `vehicle_faults` table
- Job card auto-created for critical items
- Optional: Link fault to existing job card

---

## 🔗 **4. SYSTEM INTEGRATION & WORKFLOW**

### **4.1 Complete Maintenance Lifecycle**

```
┌─────────────────────────────────────────────────────────────┐
│                    MAINTENANCE LIFECYCLE                     │
└─────────────────────────────────────────────────────────────┘

1. SCHEDULE CREATION
   └─> maintenance_schedules (is_active = true)
        ├─> next_due_date calculated
        └─> auto_create_job_card configured

2. AUTOMATED MONITORING
   └─> Edge Function runs daily
        ├─> Checks overdue schedules
        ├─> Sends alerts (email/sms/in-app)
        └─> Auto-creates job cards when due

3. JOB CARD EXECUTION
   └─> job_cards (status = 'open')
        ├─> Assigned to technician
        ├─> Tasks added/completed
        ├─> Labor hours tracked
        ├─> Parts requested/used
        └─> Status → 'completed'

4. COMPLETION & HISTORY
   └─> maintenance_schedule_history
        ├─> Links schedule → job_card → inspection
        ├─> Records actual costs & duration
        └─> Updates next_due_date for recurring schedules

5. INSPECTION TRIGGER
   └─> vehicle_inspections
        ├─> Identifies new faults
        ├─> Links to maintenance schedules
        └─> Creates job cards for repairs
```

### **4.2 Data Flow Diagram**

```
MAINTENANCE SCHEDULES          JOB CARDS              INSPECTIONS
┌──────────────────┐          ┌─────────┐          ┌──────────────┐
│  Due: 2025-11-01 │          │  OPEN   │          │  Inspector   │
│  Auto-Create: ✓  │──────────>│ Status  │<─────────│  Findings    │
│  Alert: 24hrs    │  Creates  │ Kanban  │ Creates  │  Faults: 3   │
└──────────────────┘          └─────────┘          └──────────────┘
         │                         │                        │
         │                         │                        │
         v                         v                        v
┌──────────────────────────────────────────────────────────────┐
│           MAINTENANCE SCHEDULE HISTORY                        │
│  - Links all three entities                                  │
│  - Tracks completion                                         │
│  - Records costs & duration                                  │
│  - Updates next due date                                     │
└──────────────────────────────────────────────────────────────┘
```

### **4.3 Key Statistics & Metrics**

#### **Dashboard Stats** (MaintenanceScheduling page)

**Total Active Schedules**:

```sql
SELECT COUNT(*) FROM maintenance_schedules WHERE is_active = true;
```

**Due Today**:

```sql
SELECT COUNT(*) FROM maintenance_schedules
WHERE is_active = true
  AND next_due_date = CURRENT_DATE;
```

**Overdue**:

```sql
SELECT COUNT(*) FROM maintenance_schedules
WHERE is_active = true
  AND next_due_date < CURRENT_DATE;
```

**Completed This Month**:

```sql
SELECT COUNT(*) FROM maintenance_schedule_history
WHERE status = 'completed'
  AND completed_date >= DATE_TRUNC('month', CURRENT_DATE);
```

#### **Job Card Stats** (Kanban Board)

**By Status**:

- Pending (gray)
- In Progress (blue)
- On Hold (yellow)
- Completed (green)

**By Priority**:

- Urgent (red badge)
- High (red badge)
- Medium (default)
- Low (secondary)

#### **Inspection Metrics**

**Overall Condition**:

- ✅ Excellent: All items pass
- 🟢 Good: Minor attention items
- 🟡 Fair: Multiple attention items
- 🔴 Poor: Fail items present
- ❌ Critical: Immediate attention required

---

## 📱 **5. MOBILE-FIRST FEATURES**

### **5.1 Mobile Quick Complete**

**Location**: `/src/components/maintenance/MobileQuickComplete.tsx`

**Features**:

- 📸 Photo capture for evidence
- 🎤 Audio notes recording
- 📍 GPS location tracking
- 📊 Quick status updates
- ⏱️ Timer for labor hours
- 🔢 Odometer reading input

**Usage**: Field technicians can complete maintenance schedules directly from mobile devices without full job card workflow.

### **5.2 QR Code Integration**

**Location**: `/src/components/tyres/TyreQRCodeSystem.tsx`

- Vehicle QR codes for quick identification
- Tyre TIN QR codes for tracking
- Position QR codes for inspection workflows

---

## 🎯 **6. BUSINESS LOGIC SUMMARY**

### **When to Use Each System**

| Scenario                          | System                                  | Trigger                                |
| --------------------------------- | --------------------------------------- | -------------------------------------- |
| Regular oil change every 3 months | **Maintenance Schedule**                | Auto-creates job card when due         |
| Annual safety inspection          | **Maintenance Schedule**                | Sends alert, creates inspection record |
| Driver reports brake noise        | **Manual Job Card**                     | Created directly, no schedule          |
| Pre-trip inspection finds fault   | **Inspection → Job Card**               | Fault promoted to job card             |
| Recurring tyre rotations          | **Maintenance Schedule** + **Template** | Uses template for consistent tasks     |

### **Open Job Cards**

**Definition**: Job cards with `status = 'open'` or `status = 'in_progress'`

**Tracked Metrics**:

- Total open job cards
- Average age (days since creation)
- By priority distribution
- By vehicle distribution
- Blocked/on-hold reasons

**Query**:

```typescript
const openJobCards = await supabase
  .from("job_cards")
  .select("*")
  .in("status", ["open", "in_progress"])
  .order("priority", { ascending: true })
  .order("created_at", { ascending: true });
```

### **Inspections Done**

**Tracking**:

```sql
SELECT COUNT(*), status
FROM vehicle_inspections
WHERE inspection_date >= DATE_TRUNC('month', CURRENT_DATE)
GROUP BY status;
```

**Results**:

- Total inspections this month
- Completed vs in-progress
- Faults identified
- Job cards created from inspections
- Pass/fail rate by category

---

## 🔄 **7. EDGE FUNCTION AUTOMATION**

**File**: `/supabase/functions/maintenance-scheduler/index.ts`

**Runs**: Daily (via cron job or manual trigger)

**Actions**:

1. ✅ Identifies overdue schedules
2. 📧 Generates and sends alerts
3. 🔧 Auto-creates job cards for due maintenance
4. 📊 Updates statistics
5. 🔔 Notifies recipients via configured channels

**Response Example**:

```json
{
  "success": true,
  "overdueCount": 5,
  "alertsGenerated": 12,
  "alertsSent": 12,
  "jobCardsCreated": 3,
  "timestamp": "2025-10-31T10:00:00Z"
}
```

---

## 📊 **8. REPORTING & ANALYTICS**

**Location**: `/src/components/maintenance/MaintenanceAnalytics.tsx`

**Available Reports**:

- Maintenance compliance rate
- Average completion time
- Cost trends by vehicle
- Overdue maintenance summary
- Technician productivity
- Parts usage analysis

---

## 🚀 **SUMMARY**

The system provides a **complete maintenance lifecycle**:

1. **📅 Schedule** → Define recurring/one-time maintenance
2. **🔔 Alert** → Automated notifications before due dates
3. **🔧 Execute** → Job cards with tasks, labor, and parts tracking
4. **🔍 Inspect** → Regular vehicle condition assessments
5. **📈 Track** → History, costs, and performance metrics
6. **🔄 Repeat** → Auto-recalculate next due dates

**Key Integration Points**:

- Maintenance Schedules → Auto-create Job Cards
- Inspections → Create Job Cards from Faults
- Job Cards → Link to Maintenance History
- All systems → Track in maintenance_schedule_history

This creates a **closed-loop** preventive maintenance system that reduces downtime, tracks costs, and ensures fleet safety compliance.
