# Database Schema Extension - Missing Fields Fix

## Overview

This migration adds missing database fields that the application components expect but were not present in the original schema.

## Affected Tables

### 1. maintenance_schedules

**New Fields Added:**

| Field                      | Type          | Description                                           |
| -------------------------- | ------------- | ----------------------------------------------------- |
| `title`                    | TEXT          | Human-readable title for the maintenance schedule     |
| `description`              | TEXT          | Detailed description of the maintenance work          |
| `notes`                    | TEXT          | Additional notes or comments                          |
| `schedule_type`            | TEXT          | 'one_time' or 'recurring'                             |
| `frequency`                | TEXT          | How often (hourly, daily, weekly, monthly, etc.)      |
| `frequency_value`          | INTEGER       | Frequency multiplier (default: 1)                     |
| `start_date`               | DATE          | When the schedule starts                              |
| `end_date`                 | DATE          | When the schedule ends (if applicable)                |
| `last_completed_date`      | TIMESTAMP     | Last time this maintenance was completed              |
| `estimated_duration_hours` | NUMERIC(10,2) | Expected duration of work                             |
| `priority`                 | TEXT          | low, medium, high, or critical                        |
| `category`                 | TEXT          | inspection, service, repair, replacement, calibration |
| `maintenance_type`         | TEXT          | Custom maintenance type description                   |
| `assigned_to`              | TEXT          | Person assigned to this maintenance                   |
| `assigned_team`            | TEXT          | Team responsible for this maintenance                 |
| `created_by`               | TEXT          | Who created this schedule                             |
| `alert_before_hours`       | INTEGER[]     | Array of hours before due date to send alerts         |
| `notification_channels`    | JSONB         | Notification channel configuration                    |
| `notification_recipients`  | JSONB         | List of notification recipients                       |
| `auto_create_job_card`     | BOOLEAN       | Auto-create job card when due                         |
| `related_template_id`      | UUID          | Reference to job_card_templates                       |
| `odometer_based`           | BOOLEAN       | Whether scheduling is odometer-based                  |
| `odometer_interval_km`     | INTEGER       | Kilometer interval for odometer-based scheduling      |
| `last_odometer_reading`    | INTEGER       | Last recorded odometer reading                        |

### 2. maintenance_schedule_history

**New Fields Added:**

| Field              | Type          | Description                             |
| ------------------ | ------------- | --------------------------------------- |
| `job_card_id`      | UUID          | Reference to job_cards table            |
| `inspection_id`    | UUID          | Reference to inspection_reports table   |
| `scheduled_date`   | DATE          | Original scheduled date                 |
| `updated_at`       | TIMESTAMP     | Auto-updated timestamp                  |
| `completed_by`     | TEXT          | Who completed the maintenance           |
| `odometer_reading` | INTEGER       | Odometer reading at time of maintenance |
| `labor_hours`      | NUMERIC(10,2) | Total labor hours                       |
| `parts_used`       | JSONB         | JSON array of parts used                |
| `linked_faults`    | JSONB         | JSON array of fault IDs addressed       |

### 3. tyres

**New Fields Added:**

| Field                    | Type | Description                       |
| ------------------------ | ---- | --------------------------------- |
| `current_fleet_position` | TEXT | Current position (e.g., "10T FL") |
| `position`               | TEXT | Simplified position code          |

## Migration Files

- **Migration SQL**: `supabase/migrations/20251031000000_add_missing_schema_fields.sql`
- **Application Script**: `apply_schema_extension.sh`

## How to Apply

### Option 1: Using Supabase CLI (Recommended)

```bash
# Apply locally
supabase db push

# Or apply to remote database
supabase db push --db-url 'your-database-url'
```

### Option 2: Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy contents of `supabase/migrations/20251031000000_add_missing_schema_fields.sql`
5. Paste into editor
6. Click **Run**

### Option 3: Using the Helper Script

```bash
./apply_schema_extension.sh
```

This will display all options and guide you through the process.

### Option 4: Using psql

```bash
psql 'your-connection-string' < supabase/migrations/20251031000000_add_missing_schema_fields.sql
```

## Post-Migration Steps

### 1. Regenerate TypeScript Types

After applying the migration, regenerate the TypeScript types to reflect the new schema:

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/integrations/supabase/types.ts
```

Replace `YOUR_PROJECT_ID` with your actual Supabase project ID.

### 2. Restart Development Server

```bash
npm run dev
```

### 3. Verify Changes

Check that the new fields are available in your application:

1. Open Supabase Dashboard → Table Editor
2. Navigate to `maintenance_schedules`, `maintenance_schedule_history`, and `tyres` tables
3. Verify all new columns are present

## Default Values

The migration sets sensible defaults for existing records:

- `title` → Set to `service_type` if not already set
- `schedule_type` → Set to 'recurring'
- `priority` → Set to 'medium'
- `notification_channels` → `{"email": true, "in_app": true}`
- `notification_recipients` → `[]`
- `alert_before_hours` → `[24, 48, 168]` (1 day, 2 days, 1 week)
- `frequency_value` → `1`
- `auto_create_job_card` → `false`
- `odometer_based` → `false`

## Indexes Created

For optimal query performance, the following indexes are created:

**maintenance_schedules:**

- `idx_maintenance_schedules_priority` - For filtering by priority
- `idx_maintenance_schedules_category` - For filtering by category
- `idx_maintenance_schedules_assigned_to` - For filtering by assignee
- `idx_maintenance_schedules_next_due` - For due date queries

**maintenance_schedule_history:**

- `idx_maintenance_history_job_card` - For job card relationships
- `idx_maintenance_history_inspection` - For inspection relationships
- `idx_maintenance_history_completed_date` - For date-based queries

**tyres:**

- `idx_tyres_current_fleet_position` - For position-based queries
- `idx_tyres_position` - For simplified position queries

## Row Level Security (RLS)

The migration ensures RLS remains enabled on all affected tables. Existing RLS policies will continue to work with the new columns.

## Rollback

If you need to rollback this migration, you can remove the added columns:

```sql
-- Rollback maintenance_schedules
ALTER TABLE maintenance_schedules
  DROP COLUMN IF EXISTS title,
  DROP COLUMN IF EXISTS description,
  -- ... (drop all added columns)

-- Rollback maintenance_schedule_history
ALTER TABLE maintenance_schedule_history
  DROP COLUMN IF EXISTS job_card_id,
  -- ... (drop all added columns)

-- Rollback tyres
ALTER TABLE tyres
  DROP COLUMN IF EXISTS current_fleet_position,
  DROP COLUMN IF EXISTS position;
```

## Impact on Application

After applying this migration, the following components will function correctly:

- ✅ Maintenance scheduling with full details
- ✅ Maintenance history tracking with job card linking
- ✅ Tyre position tracking and analytics
- ✅ Notification system for maintenance alerts
- ✅ Odometer-based maintenance scheduling
- ✅ Template-based job card creation

## Support

If you encounter any issues:

1. Check the Supabase dashboard logs
2. Verify your database connection
3. Ensure you have proper permissions to alter tables
4. Review the migration SQL for any syntax errors

## Notes

- All new columns use `ADD COLUMN IF NOT EXISTS` to prevent errors if partially applied
- The migration is idempotent - safe to run multiple times
- Existing data is preserved and updated with sensible defaults
- Foreign key constraints are added for referential integrity
