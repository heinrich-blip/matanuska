# Load Status Workflow - Database Enum Mapping

## ✅ CORRECTED: Database Enum Format

The `load_status` enum in the database uses **lowercase with underscores** format.

### Status Mapping Table

| Database Value (enum)  | UI Display Label            | Step |
| ---------------------- | --------------------------- | ---- |
| `pending`              | Pending                     | 1    |
| `assigned`             | Assigned                    | 2    |
| `arrived_at_loading`   | Arrived at Loading Point    | 3    |
| `loading`              | Start Loading               | 4    |
| `loading_completed`    | Loading Completed           | 5    |
| `in_transit`           | In Transit                  | 6    |
| `arrived_at_delivery`  | Arrived at Offloading Point | 7    |
| `offloading`           | Offloading                  | 8    |
| `offloading_completed` | Offloading Completed        | 9    |
| `delivered`            | Delivered                   | 10   |
| `completed`            | Completed                   | 11   |

### Migration Applied

The migration adds these new enum values to the existing `load_status` enum:

- ✅ `arrived_at_loading`
- ✅ `loading`
- ✅ `loading_completed`
- ✅ `arrived_at_delivery`
- ✅ `offloading`
- ✅ `offloading_completed`
- ✅ `completed`
- ✅ `on_hold`

**Existing values retained:**

- `pending`
- `assigned`
- `in_transit`
- `delivered`
- `cancelled`
- `failed_delivery`

---

## Testing with Correct Values

### Quick Test - Single Load Progression

```sql
-- Find a test load
SELECT id, load_number, status FROM loads WHERE status = 'assigned' LIMIT 1;

-- Progress through workflow (use actual load ID)
UPDATE loads SET status = 'arrived_at_loading', arrived_at_pickup = NOW() WHERE id = 'YOUR-LOAD-ID';
UPDATE loads SET status = 'loading', loading_started_at = NOW() WHERE id = 'YOUR-LOAD-ID';
UPDATE loads SET status = 'loading_completed', loading_completed_at = NOW() WHERE id = 'YOUR-LOAD-ID';
UPDATE loads SET status = 'in_transit', departure_time = NOW() WHERE id = 'YOUR-LOAD-ID';
UPDATE loads SET status = 'arrived_at_delivery', arrived_at_delivery = NOW() WHERE id = 'YOUR-LOAD-ID';
UPDATE loads SET status = 'offloading', offloading_started_at = NOW() WHERE id = 'YOUR-LOAD-ID';
UPDATE loads SET status = 'offloading_completed', offloading_completed_at = NOW() WHERE id = 'YOUR-LOAD-ID';
UPDATE loads SET status = 'delivered', delivered_at = NOW() WHERE id = 'YOUR-LOAD-ID';
UPDATE loads SET status = 'completed', completed_at = NOW() WHERE id = 'YOUR-LOAD-ID';
```

---

## Code Implementation

### TypeScript Constants

```typescript
// Database enum values (lowercase_with_underscores)
export const LOAD_STATUS_WORKFLOW = [
  "pending",
  "assigned",
  "arrived_at_loading",
  "loading",
  "loading_completed",
  "in_transit",
  "arrived_at_delivery",
  "offloading",
  "offloading_completed",
  "delivered",
  "completed",
] as const;

// Display labels (user-friendly Title Case)
export const STATUS_LABELS: Record<LoadStatus, string> = {
  pending: "Pending",
  assigned: "Assigned",
  arrived_at_loading: "Arrived at Loading Point",
  loading: "Start Loading",
  loading_completed: "Loading Completed",
  in_transit: "In Transit",
  arrived_at_delivery: "Arrived at Offloading Point",
  offloading: "Offloading",
  offloading_completed: "Offloading Completed",
  delivered: "Delivered",
  completed: "Completed",
};
```

### Usage in Components

```typescript
// Component receives database value
const load = { status: "loading_completed" }; // from database

// Display with label
<Badge>{STATUS_STEPS[load.status].label}</Badge>;
// Shows: "Loading Completed"

// Update to next status
const nextStatus = "in_transit"; // database value
await supabase.from("loads").update({ status: nextStatus });
```

---

## Migration Checklist

- [x] Update migration file to use correct enum format
- [x] Add new enum values using `ALTER TYPE ... ADD VALUE`
- [x] Update view WHERE clause to use lowercase values
- [x] Update TypeScript constants to match database
- [x] Update component to display labels correctly
- [x] Update test SQL with correct enum values
- [ ] **→ Apply migration in Supabase SQL Editor**
- [ ] **→ Regenerate TypeScript types**
- [ ] **→ Test UI workflow progression**

---

## Common Errors Avoided

❌ **WRONG (will cause error):**

```sql
UPDATE loads SET status = 'Loading Completed' WHERE id = '...';
-- ERROR: invalid input value for enum load_status: "Loading Completed"
```

✅ **CORRECT:**

```sql
UPDATE loads SET status = 'loading_completed' WHERE id = '...';
-- Success!
```

---

## Files Updated

1. ✅ `/supabase/migrations/20251111_load_workflow_timestamps.sql`

   - Uses correct enum format
   - Adds new values safely with IF NOT EXISTS

2. ✅ `/src/constants/loadStatusWorkflow.ts`

   - Database enum values in LOAD_STATUS_WORKFLOW
   - Display labels in STATUS_LABELS
   - Full StatusStep definitions with icons/colors

3. ✅ `/src/components/loads/LoadStatusWorkflow.tsx`

   - Uses STATUS_STEPS[status].label for display
   - Sends database enum value in mutations

4. ✅ `/test_workflow_status_updates.sql`
   - All queries use lowercase_with_underscores format
