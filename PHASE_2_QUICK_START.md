# 🚀 Quick Start - Phase 2 Development

**Phase 1 Complete** ✅ | **Ready for Component Development**

---

## 🎯 What You Have Available

### Database Schema

#### `parts_requests` Table - Extended with:

```typescript
{
  // Existing fields
  id: string;
  part_name: string;
  quantity: number;
  status: 'pending' | 'approved' | 'rejected' | 'fulfilled' | 'cancelled';
  job_card_id: string;
  created_at: string;
  updated_at: string;

  // ✅ NEW - Phase 1 fields
  inventory_id?: string | null;           // Link to inventory item
  unit_price?: number | null;             // Price at time of request
  total_price?: number | null;            // Auto-calculated (quantity × unit_price)
  requested_by?: string | null;           // Who created the request
  approved_by?: string | null;            // Who approved it
  approved_at?: string | null;            // When approved
  rejected_by?: string | null;            // Who rejected it
  rejected_at?: string | null;            // When rejected
  rejection_reason?: string | null;       // Why rejected
  is_from_inventory?: boolean | null;     // Computed: true if inventory_id is set
}
```

#### `inventory_transactions` Table - New Audit Trail

```typescript
{
  id: string;
  inventory_id: string;                   // Which inventory item
  parts_request_id?: string | null;       // Related parts request
  transaction_type: 'reserve' | 'deduct' | 'release' | 'restock' | 'adjustment';
  quantity_change: number;                // +/- amount
  quantity_before: number;                // Stock before transaction
  quantity_after: number;                 // Stock after transaction
  performed_by?: string | null;           // Who did it
  notes?: string | null;                  // Why/context
  created_at: string;                     // When
}
```

### Database Functions

All functions available via Supabase RPC:

```typescript
import { supabase } from "@/integrations/supabase/client";

// 1. Check if enough stock available
const { data, error } = await supabase.rpc("check_inventory_availability", {
  p_inventory_id: "uuid-of-inventory-item",
  p_quantity: 5,
});
// Returns: boolean

// 2. Reserve inventory (doesn't deduct yet)
const { data, error } = await supabase.rpc("reserve_inventory", {
  p_parts_request_id: "uuid-of-parts-request",
  p_inventory_id: "uuid-of-inventory-item",
  p_quantity: 5,
  p_performed_by: "John Doe",
});
// Returns: boolean

// 3. Deduct inventory (actually removes stock)
const { data, error } = await supabase.rpc("deduct_inventory", {
  p_parts_request_id: "uuid-of-parts-request",
  p_inventory_id: "uuid-of-inventory-item",
  p_quantity: 5,
  p_performed_by: "Jane Manager",
});
// Returns: boolean

// 4. Release reservation (cancel)
const { data, error } = await supabase.rpc("release_inventory_reservation", {
  p_parts_request_id: "uuid-of-parts-request",
  p_inventory_id: "uuid-of-inventory-item",
  p_quantity: 5,
  p_performed_by: "Jane Manager",
  p_reason: "Request rejected - out of budget",
});
// Returns: boolean
```

---

## 🔄 Typical Workflow

### 1. Creating a Parts Request FROM INVENTORY

```typescript
// Component: InventorySelectionDialog (to be created in Phase 2)

const handleSelectFromInventory = async (inventoryItem: InventoryItem) => {
  // Check availability first
  const { data: isAvailable } = await supabase.rpc(
    "check_inventory_availability",
    {
      p_inventory_id: inventoryItem.id,
      p_quantity: requestedQuantity,
    }
  );

  if (!isAvailable) {
    toast.error("Insufficient inventory");
    return;
  }

  // Create parts request with inventory link
  const { data: partsRequest, error } = await supabase
    .from("parts_requests")
    .insert({
      part_name: inventoryItem.part_name,
      quantity: requestedQuantity,
      inventory_id: inventoryItem.id, // ✅ NEW
      unit_price: inventoryItem.unit_price, // ✅ NEW
      // total_price auto-calculated by trigger  ✅ NEW
      requested_by: currentUser.name, // ✅ NEW
      status: "pending",
      job_card_id: jobCardId,
    })
    .select()
    .single();

  if (error) {
    toast.error("Failed to create request");
    return;
  }

  // Reserve the inventory
  await supabase.rpc("reserve_inventory", {
    p_parts_request_id: partsRequest.id,
    p_inventory_id: inventoryItem.id,
    p_quantity: requestedQuantity,
    p_performed_by: currentUser.name,
  });

  toast.success("Parts request created and inventory reserved");
};
```

### 2. Approving a Parts Request

```typescript
// Component: PartsApprovalDialog (to be created in Phase 2)

const handleApprove = async (partsRequest: PartsRequest) => {
  // Update request to approved
  const { error: updateError } = await supabase
    .from("parts_requests")
    .update({
      status: "approved",
      approved_by: currentUser.name, // ✅ NEW
      approved_at: new Date().toISOString(), // ✅ NEW
    })
    .eq("id", partsRequest.id);

  if (updateError) {
    toast.error("Failed to approve request");
    return;
  }

  // If from inventory, deduct the stock
  if (partsRequest.inventory_id) {
    const { error: deductError } = await supabase.rpc("deduct_inventory", {
      p_parts_request_id: partsRequest.id,
      p_inventory_id: partsRequest.inventory_id,
      p_quantity: partsRequest.quantity,
      p_performed_by: currentUser.name,
    });

    if (deductError) {
      toast.error("Failed to deduct inventory");
      // Consider rolling back approval
      return;
    }
  }

  toast.success("Parts request approved and inventory deducted");
};
```

### 3. Rejecting a Parts Request

```typescript
// Component: PartsApprovalDialog

const handleReject = async (partsRequest: PartsRequest, reason: string) => {
  // Update request to rejected
  const { error: updateError } = await supabase
    .from("parts_requests")
    .update({
      status: "rejected",
      rejected_by: currentUser.name, // ✅ NEW
      rejected_at: new Date().toISOString(), // ✅ NEW
      rejection_reason: reason, // ✅ NEW
    })
    .eq("id", partsRequest.id);

  if (updateError) {
    toast.error("Failed to reject request");
    return;
  }

  // If from inventory, release the reservation
  if (partsRequest.inventory_id) {
    await supabase.rpc("release_inventory_reservation", {
      p_parts_request_id: partsRequest.id,
      p_inventory_id: partsRequest.inventory_id,
      p_quantity: partsRequest.quantity,
      p_performed_by: currentUser.name,
      p_reason: reason,
    });
  }

  toast.success("Parts request rejected and reservation released");
};
```

### 4. Viewing Transaction History

```typescript
// Component: InventoryTransactionHistory (to be created in Phase 2)

const { data: transactions, error } = await supabase
  .from("inventory_transactions")
  .select(
    `
    *,
    inventory:inventory_id (
      part_name,
      part_number
    ),
    parts_request:parts_request_id (
      part_name,
      job_card_id
    )
  `
  )
  .eq("inventory_id", inventoryId)
  .order("created_at", { ascending: false })
  .limit(50);
```

---

## 🎨 UI Components to Build (Phase 2)

### 1. InventorySelectionDialog

**Location:** `src/components/dialogs/InventorySelectionDialog.tsx`

**Features:**

- Search/filter inventory items
- Display available quantity
- Check availability before selection
- Create parts request with inventory link
- Reserve inventory automatically

### 2. Enhanced JobCardPartsTable

**Location:** Update `src/components/JobCardPartsTable.tsx`

**Add:**

- Visual indicator for inventory-sourced items (badge/icon)
- Show `is_from_inventory` status
- Display `requested_by`, `approved_by` info
- Show `rejection_reason` for rejected items

### 3. PartsApprovalDialog

**Location:** `src/components/dialogs/PartsApprovalDialog.tsx`

**Features:**

- Approve button → deducts inventory
- Reject button → releases reservation
- Rejection reason input field
- Shows inventory availability
- Displays who requested

### 4. InventoryTransactionHistory

**Location:** `src/components/inventory/InventoryTransactionHistory.tsx`

**Features:**

- Timeline view of all transactions
- Filter by type (reserve, deduct, release)
- Show quantity changes (before/after)
- Link to related parts requests
- Export to CSV

---

## 🔗 Real-Time Subscriptions

Monitor inventory changes in real-time:

```typescript
const subscription = supabase
  .channel("inventory-changes")
  .on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "inventory_transactions",
    },
    (payload) => {
      console.log("Inventory transaction:", payload.new);
      // Update UI
    }
  )
  .subscribe();
```

---

## 🧪 Testing Checklist

### Component Tests

- [ ] InventorySelectionDialog renders correctly
- [ ] Can search and filter inventory
- [ ] Shows availability status
- [ ] Creates request with inventory link
- [ ] Calls reserve_inventory function

### Integration Tests

- [ ] Full approve flow (pending → approved → deducted)
- [ ] Full reject flow (pending → rejected → released)
- [ ] Reservation prevents over-allocation
- [ ] Deduction uses row locking (no race conditions)
- [ ] Transaction history updates in real-time

### Edge Cases

- [ ] Insufficient inventory handling
- [ ] Concurrent requests for same inventory
- [ ] Network errors during deduction
- [ ] Approval rollback on deduction failure

---

## 📚 Documentation References

- **Phase 1 Summary:** `PHASE_1_COMPLETION_SUMMARY.md`
- **Database Schema:** `DATABASE_VERIFICATION_GUIDE.md`
- **Phase 2 Spec:** `PHASE_2_COMPONENT_CREATION.md`
- **Full Migration:** `PHASE_1_COMPLETE_MIGRATION.sql`

---

## 🚀 Ready to Build!

Phase 1 has provided the complete backend foundation. You now have:

✅ Extended database schema  
✅ Audit trail system  
✅ Business logic functions  
✅ TypeScript types  
✅ Zero compilation errors

**Start with:** Creating `InventorySelectionDialog.tsx`

Good luck! 🎉
