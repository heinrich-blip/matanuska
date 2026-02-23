# ✅ Phase 4: Approval Workflow & Inventory Deduction

**Phase:** 4 of 5  
**Timeline:** Day 5 (4-6 hours)  
**Prerequisites:** Phase 3 complete and tested  
**Completion Criteria:** Approval workflow functional, inventory deducted correctly

---

## 📋 Phase Overview

This phase implements the **approval workflow** for parts requests. When a manager approves a request, the system automatically deducts inventory using the `deduct_inventory()` function. Rejections release reservations.

**What This Phase Delivers:**

- ✅ Approval UI in JobCardPartsTable
- ✅ Rejection UI with reason input
- ✅ Automatic inventory deduction on approval
- ✅ Reservation release on rejection
- ✅ Status badges and visual indicators
- ✅ Audit trail for all actions

---

## 🎯 Objectives

1. Add approval/rejection buttons to parts table
2. Call `deduct_inventory()` when approved
3. Call `release_inventory_reservation()` when rejected
4. Update status badges
5. Track who approved/rejected and when
6. Prevent duplicate approvals

---

## 📊 Pre-Implementation Checklist

### ✅ Before You Start:

- [ ] Phase 3 completed and tested
- [ ] Database functions verified working
- [ ] TypeScript types up to date
- [ ] User authentication working
- [ ] Test data available (pending parts requests)

### 🔍 Verification:

```bash
# Check database functions exist
psql $DATABASE_URL -c "SELECT routine_name FROM information_schema.routines WHERE routine_name IN ('deduct_inventory', 'release_inventory_reservation');"

# Check test data
psql $DATABASE_URL -c "SELECT id, part_name, status FROM parts_requests WHERE status = 'pending' LIMIT 5;"
```

---

## 🚀 Implementation Step 1: Add Approval Status to Types

### Purpose:

Ensure TypeScript knows about approval/rejection fields.

### Verification:

```bash
# Check types file
grep -A 10 "parts_requests" src/integrations/supabase/types.ts | grep "approved_by\|rejected_by"
```

**If missing:** Regenerate types from Phase 1.

---

## 🚀 Implementation Step 2: Create Approval Dialog Component

### Purpose:

Confirmation dialog with rejection reason input.

### File Location:

`src/components/dialogs/ApproveRejectPartsDialog.tsx`

### Implementation:

```typescript
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { Database } from "@/integrations/supabase/types";

type PartsRequest = Database["public"]["Tables"]["parts_requests"]["Row"];

interface ApproveRejectPartsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partsRequest: PartsRequest | null;
  action: "approve" | "reject";
  onSuccess: () => void;
}

export default function ApproveRejectPartsDialog({
  open,
  onOpenChange,
  partsRequest,
  action,
  onSuccess,
}: ApproveRejectPartsDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const handleSubmit = async () => {
    if (!partsRequest) return;

    // Validation for rejection
    if (action === "reject" && !rejectionReason.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please provide a reason for rejection",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (action === "approve") {
        // Update parts request status to approved
        const { error: updateError } = await supabase
          .from("parts_requests")
          .update({
            status: "approved",
            approved_by: user?.email || null,
            approved_at: new Date().toISOString(),
          })
          .eq("id", partsRequest.id);

        if (updateError) throw updateError;

        // If from inventory, deduct stock
        if (partsRequest.inventory_id) {
          const { error: deductError } = await supabase.rpc(
            "deduct_inventory",
            {
              p_parts_request_id: partsRequest.id,
              p_inventory_id: partsRequest.inventory_id,
              p_quantity: partsRequest.quantity,
              p_performed_by: user?.email || "system",
            }
          );

          if (deductError) {
            console.error("Failed to deduct inventory:", deductError);

            // Rollback approval if deduction fails
            await supabase
              .from("parts_requests")
              .update({
                status: "pending",
                approved_by: null,
                approved_at: null,
              })
              .eq("id", partsRequest.id);

            throw new Error(
              "Failed to deduct inventory. Approval rolled back."
            );
          }
        }

        toast({
          title: "Parts Request Approved",
          description: partsRequest.inventory_id
            ? "Inventory has been deducted"
            : "Request approved successfully",
        });
      } else {
        // Reject
        const { error: updateError } = await supabase
          .from("parts_requests")
          .update({
            status: "rejected",
            rejected_by: user?.email || null,
            rejected_at: new Date().toISOString(),
            rejection_reason: rejectionReason,
          })
          .eq("id", partsRequest.id);

        if (updateError) throw updateError;

        // If from inventory, release reservation
        if (partsRequest.inventory_id) {
          const { error: releaseError } = await supabase.rpc(
            "release_inventory_reservation",
            {
              p_parts_request_id: partsRequest.id,
              p_inventory_id: partsRequest.inventory_id,
              p_quantity: partsRequest.quantity,
              p_performed_by: user?.email || "system",
              p_reason: rejectionReason,
            }
          );

          if (releaseError) {
            console.error("Failed to release reservation:", releaseError);
            // Non-fatal, just log
          }
        }

        toast({
          title: "Parts Request Rejected",
          description: "Request has been rejected",
        });
      }

      onSuccess();
      onOpenChange(false);
      setRejectionReason("");
    } catch (error) {
      console.error(`Error ${action}ing parts request:`, error);
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : `Failed to ${action} request`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!partsRequest) return null;

  const isApprove = action === "approve";
  const Icon = isApprove ? CheckCircle2 : XCircle;
  const color = isApprove ? "text-green-600" : "text-red-600";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className={`h-5 w-5 ${color}`} />
            {isApprove ? "Approve" : "Reject"} Parts Request
          </DialogTitle>
          <DialogDescription>
            {isApprove
              ? "This will approve the parts request and deduct inventory (if applicable)."
              : "This will reject the parts request and release any inventory reservation."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Request Details */}
          <Alert>
            <AlertDescription>
              <div className="space-y-1">
                <p>
                  <strong>Part:</strong> {partsRequest.part_name}
                </p>
                <p>
                  <strong>Quantity:</strong> {partsRequest.quantity}
                </p>
                {partsRequest.inventory_id && (
                  <>
                    <p>
                      <strong>Unit Price:</strong> R
                      {partsRequest.unit_price?.toFixed(2) || "0.00"}
                    </p>
                    <p>
                      <strong>Total:</strong> R
                      {partsRequest.total_price?.toFixed(2) || "0.00"}
                    </p>
                  </>
                )}
              </div>
            </AlertDescription>
          </Alert>

          {/* Inventory Warning for Approval */}
          {isApprove && partsRequest.inventory_id && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Note:</strong> Approving this request will deduct{" "}
                {partsRequest.quantity} units from inventory.
              </AlertDescription>
            </Alert>
          )}

          {/* Rejection Reason */}
          {!isApprove && (
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">
                Reason for Rejection <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="rejection-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why this request is being rejected..."
                rows={4}
                required
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            variant={isApprove ? "default" : "destructive"}
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Processing..." : isApprove ? "Approve" : "Reject"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### ✅ Create the File:

```bash
cat > src/components/dialogs/ApproveRejectPartsDialog.tsx << 'EOF'
[Paste code above]
EOF
```

---

## 🚀 Implementation Step 3: Update JobCardPartsTable Component

### Purpose:

Add approval/rejection actions to the parts table.

### Changes Required:

1. Import ApproveRejectPartsDialog
2. Add state for approval dialog
3. Add action buttons for pending requests
4. Add status badges with timestamps
5. Show approval/rejection details

### File Location:

`src/components/JobCardPartsTable.tsx`

### Implementation:

**Add to imports:**

```typescript
import ApproveRejectPartsDialog from "./dialogs/ApproveRejectPartsDialog";
import { CheckCircle2, XCircle, Clock, Package } from "lucide-react";
import { Database } from "@/integrations/supabase/types";

type PartsRequest = Database["public"]["Tables"]["parts_requests"]["Row"];
```

**Add state:**

```typescript
const [approvalDialog, setApprovalDialog] = useState<{
  open: boolean;
  action: "approve" | "reject";
  request: PartsRequest | null;
}>({
  open: false,
  action: "approve",
  request: null,
});
```

**Add helper function:**

```typescript
const getStatusBadge = (request: PartsRequest) => {
  switch (request.status) {
    case "pending":
      return (
        <Badge variant="outline" className="gap-1">
          <Clock className="h-3 w-3" />
          Pending
        </Badge>
      );
    case "approved":
      return (
        <Badge variant="default" className="gap-1 bg-green-600">
          <CheckCircle2 className="h-3 w-3" />
          Approved
        </Badge>
      );
    case "rejected":
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="h-3 w-3" />
          Rejected
        </Badge>
      );
    case "fulfilled":
      return (
        <Badge variant="default" className="gap-1">
          <Package className="h-3 w-3" />
          Fulfilled
        </Badge>
      );
    default:
      return <Badge variant="outline">{request.status}</Badge>;
  }
};
```

**Update table columns to include Actions:**

```typescript
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Part Name</TableHead>
      <TableHead>Part Number</TableHead>
      <TableHead>Quantity</TableHead>
      <TableHead>Status</TableHead>
      <TableHead>Price</TableHead>
      <TableHead>Actions</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {parts.map((part) => (
      <TableRow key={part.id}>
        <TableCell className="font-medium">{part.part_name}</TableCell>
        <TableCell>{part.part_number || "N/A"}</TableCell>
        <TableCell>{part.quantity}</TableCell>
        <TableCell>{getStatusBadge(part)}</TableCell>
        <TableCell>
          {part.total_price ? (
            <span className="font-semibold">
              R{part.total_price.toFixed(2)}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </TableCell>
        <TableCell>
          {part.status === "pending" && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="default"
                onClick={() =>
                  setApprovalDialog({
                    open: true,
                    action: "approve",
                    request: part,
                  })
                }
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setApprovalDialog({
                    open: true,
                    action: "reject",
                    request: part,
                  })
                }
              >
                <XCircle className="h-4 w-4 mr-1" />
                Reject
              </Button>
            </div>
          )}
          {part.status === "approved" && part.approved_by && (
            <div className="text-sm text-muted-foreground">
              Approved by {part.approved_by}
              {part.approved_at && (
                <div className="text-xs">
                  {new Date(part.approved_at).toLocaleString()}
                </div>
              )}
            </div>
          )}
          {part.status === "rejected" && part.rejected_by && (
            <div className="text-sm text-muted-foreground">
              Rejected by {part.rejected_by}
              {part.rejection_reason && (
                <div className="text-xs italic">"{part.rejection_reason}"</div>
              )}
            </div>
          )}
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

**Add dialog at end of component:**

```typescript
<ApproveRejectPartsDialog
  open={approvalDialog.open}
  onOpenChange={(open) => setApprovalDialog({ ...approvalDialog, open })}
  partsRequest={approvalDialog.request}
  action={approvalDialog.action}
  onSuccess={onRefresh}
/>
```

---

## 🚀 Implementation Step 4: Add Inventory Transaction History View (Optional)

### Purpose:

Allow users to view transaction history for audit purposes.

### File Location:

`src/components/InventoryTransactionHistory.tsx`

### Implementation:

```typescript
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowDown, ArrowUp, AlertCircle } from "lucide-react";

interface InventoryTransactionHistoryProps {
  inventoryId: string;
}

export default function InventoryTransactionHistory({
  inventoryId,
}: InventoryTransactionHistoryProps) {
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["inventory-transactions", inventoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_transactions")
        .select("*")
        .eq("inventory_id", inventoryId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "deduct":
      case "reserve":
        return <ArrowDown className="h-4 w-4 text-red-600" />;
      case "release":
      case "restock":
        return <ArrowUp className="h-4 w-4 text-green-600" />;
      case "adjustment":
        return <AlertCircle className="h-4 w-4 text-blue-600" />;
      default:
        return null;
    }
  };

  const getTransactionBadge = (type: string) => {
    const variants: Record<string, any> = {
      reserve: "outline",
      deduct: "destructive",
      release: "default",
      restock: "default",
      adjustment: "secondary",
    };

    return (
      <Badge variant={variants[type] || "outline"}>
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transaction History</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading transactions...
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No transactions yet
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Change</TableHead>
                  <TableHead>Before</TableHead>
                  <TableHead>After</TableHead>
                  <TableHead>By</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="text-sm">
                      {new Date(tx.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getTransactionIcon(tx.transaction_type)}
                        {getTransactionBadge(tx.transaction_type)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={
                          tx.quantity_change > 0
                            ? "text-green-600"
                            : "text-red-600"
                        }
                      >
                        {tx.quantity_change > 0 ? "+" : ""}
                        {tx.quantity_change}
                      </span>
                    </TableCell>
                    <TableCell>{tx.quantity_before}</TableCell>
                    <TableCell>{tx.quantity_after}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {tx.performed_by || "System"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {tx.notes}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
```

### ✅ Create the File (Optional):

```bash
cat > src/components/InventoryTransactionHistory.tsx << 'EOF'
[Paste code above]
EOF
```

---

## 📋 Phase 4 Completion Checklist

### Components Created:

- [ ] ApproveRejectPartsDialog.tsx created
- [ ] InventoryTransactionHistory.tsx created (optional)

### Integration:

- [ ] JobCardPartsTable.tsx updated with approval buttons
- [ ] Status badges display correctly
- [ ] Approval/rejection details shown

### Functionality:

- [ ] Approve button calls deduct_inventory()
- [ ] Reject button calls release_inventory_reservation()
- [ ] Status updates correctly
- [ ] Timestamps recorded
- [ ] User email captured
- [ ] Rejection reason required

### Database Verification:

- [ ] approved_by populated
- [ ] approved_at populated
- [ ] rejected_by populated
- [ ] rejected_at populated
- [ ] rejection_reason saved
- [ ] inventory.quantity updated on approval
- [ ] inventory_transactions logged

---

## 🧪 Testing Checklist

### Test 1: Approve Request from Inventory

**Steps:**

1. Create parts request from inventory (10 units available)
2. Request 3 units
3. Note inventory quantity before approval
4. Click "Approve"
5. Confirm approval
6. Check inventory quantity decreased by 3
7. Check transaction logged

**Expected:**

- Status → "approved"
- inventory.quantity decreased by 3
- inventory_transactions.transaction_type = 'deduct'

---

### Test 2: Reject Request from Inventory

**Steps:**

1. Create parts request from inventory
2. Request 5 units
3. Click "Reject"
4. Enter reason: "Part not needed"
5. Confirm rejection
6. Check inventory unchanged
7. Check transaction logged

**Expected:**

- Status → "rejected"
- inventory.quantity unchanged
- inventory_transactions.transaction_type = 'release'
- rejection_reason saved

---

### Test 3: Approve Manual Request (No Inventory)

**Steps:**

1. Create manual parts request (no inventory link)
2. Click "Approve"
3. Confirm approval

**Expected:**

- Status → "approved"
- No inventory changes
- No transaction logged
- approved_by and approved_at populated

---

### Test 4: Insufficient Stock on Approval

**Steps:**

1. Create request for 10 units
2. Manually reduce inventory to 5 units
3. Try to approve request

**Expected:**

- Approval fails with error
- Status remains "pending"
- Inventory unchanged

---

## ⏭️ Next Phase

**Phase 5: Deployment & Documentation**

- Prepare production deployment
- Create user documentation
- Training materials
- Rollback plan
- Monitoring setup

**Prerequisites for Phase 5:**

- ✅ Phase 4 completed
- ✅ All workflows tested
- ✅ No critical bugs
- ✅ Stakeholder approval

---

**Phase 4 Complete! 🎉**  
**Estimated Time:** 4-6 hours  
**Next:** Proceed to Phase 5 - Deployment & Documentation
