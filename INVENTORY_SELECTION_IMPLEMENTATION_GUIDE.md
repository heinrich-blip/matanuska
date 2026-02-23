# Inventory Selection Implementation Guide for JobCardPartsTable

## Overview

This guide provides safe, non-disruptive implementation points for adding inventory selection functionality to the JobCardPartsTable component. The changes will allow users to select parts from the existing inventory database instead of manually typing part names.

---

## Current System Analysis

### Existing Components

1. **`JobCardPartsTable.tsx`** - Displays parts for a job card
2. **`RequestPartsDialog.tsx`** - Manual entry dialog for requesting parts
3. **`InventoryPanel.tsx`** - Existing inventory management interface
4. **Database Table**: `inventory` - Contains all available parts

### Database Schema (Confirmed)

```typescript
interface InventoryItem {
  id: string;
  name: string;
  part_number: string;
  category: string;
  quantity: number;
  min_quantity: number;
  unit_price: number | null;
  location: string | null;
  supplier: string | null;
  created_at: string;
  updated_at: string;
}
```

---

## Implementation Strategy

### Phase 1: Create Inventory Selector Component (NEW FILE)

**Safe to implement**: Create a new component without modifying existing code.

#### File: `/src/components/dialogs/InventorySearchDialog.tsx`

```tsx
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Search, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface InventorySearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectPart: (part: {
    partName: string;
    partNumber: string;
    unitPrice: number;
    availableQuantity: number;
    category: string;
  }) => void;
}

const InventorySearchDialog = ({
  open,
  onOpenChange,
  onSelectPart,
}: InventorySearchDialogProps) => {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: inventory = [], isLoading } = useQuery({
    queryKey: ["inventory"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory")
        .select("*")
        .order("name");

      if (error) throw error;
      return data;
    },
    enabled: open, // Only fetch when dialog is open
  });

  const filteredInventory = inventory.filter(
    (item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.part_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectPart = (item: any) => {
    onSelectPart({
      partName: item.name,
      partNumber: item.part_number,
      unitPrice: item.unit_price || 0,
      availableQuantity: item.quantity,
      category: item.category,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Select Part from Inventory</DialogTitle>
          <DialogDescription>
            Search and select a part from the available inventory
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, part number, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <ScrollArea className="h-[400px] rounded-md border p-4">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading inventory...
              </div>
            ) : filteredInventory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm
                  ? "No parts found matching your search"
                  : "No inventory items available"}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredInventory.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => handleSelectPart(item)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{item.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {item.category}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Part #: {item.part_number}
                      </div>
                      <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                        <span>Available: {item.quantity}</span>
                        {item.unit_price && (
                          <span>Price: R{item.unit_price.toFixed(2)}</span>
                        )}
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      Select
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InventorySearchDialog;
```

**Why this is safe:**

- ✅ New file, no existing code modified
- ✅ Independent component
- ✅ Uses existing database schema
- ✅ Reusable across the application

---

### Phase 2: Update RequestPartsDialog (MODIFY EXISTING)

**Safe modification**: Add optional inventory selection mode.

#### File: `/src/components/dialogs/RequestPartsDialog.tsx`

**Implementation Points:**

#### **Point 1: Add imports (Lines 1-9)**

```tsx
// ADD these imports after existing imports
import InventorySearchDialog from "./InventorySearchDialog";
import { Package } from "lucide-react";
```

#### **Point 2: Add state for inventory dialog (Line 18, after existing state)**

```tsx
const [showInventorySearch, setShowInventorySearch] = useState(false);
```

#### **Point 3: Add handler function (After handleSubmit function, around line 73)**

```tsx
const handleSelectFromInventory = (part: {
  partName: string;
  partNumber: string;
  unitPrice: number;
  availableQuantity: number;
  category: string;
}) => {
  setFormData({
    ...formData,
    partName: part.partName,
    partNumber: part.partNumber,
  });
  setShowInventorySearch(false);
};
```

#### **Point 4: Add inventory search button (After Part Name Label, around line 92)**

```tsx
<div className="space-y-2">
  <div className="flex items-center justify-between">
    <Label htmlFor="partName">Part Name *</Label>
    <Button
      type="button"
      variant="link"
      size="sm"
      onClick={() => setShowInventorySearch(true)}
      className="h-auto p-0"
    >
      <Package className="h-3 w-3 mr-1" />
      Select from Inventory
    </Button>
  </div>
  <Input
    id="partName"
    placeholder="e.g., Brake Pads"
    value={formData.partName}
    onChange={(e) => setFormData({ ...formData, partName: e.target.value })}
    required
  />
</div>
```

#### **Point 5: Add InventorySearchDialog (Before closing Dialog tag, around line 155)**

```tsx
        </form>

        {/* ADD THIS BEFORE </DialogContent> */}
        <InventorySearchDialog
          open={showInventorySearch}
          onOpenChange={setShowInventorySearch}
          onSelectPart={handleSelectFromInventory}
        />
      </DialogContent>
    </Dialog>
```

**Why this is safe:**

- ✅ Existing functionality preserved
- ✅ Inventory selection is optional
- ✅ Manual entry still works
- ✅ No breaking changes to props or interface

---

### Phase 3: Enhanced Version with Stock Validation (OPTIONAL)

#### File: Create `/src/components/dialogs/EnhancedRequestPartsDialog.tsx`

This is a completely new component that adds:

- Real-time stock validation
- Low stock warnings
- Automatic price calculation
- Visual stock indicators

```tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import InventorySearchDialog from "./InventorySearchDialog";
import { Package, AlertTriangle, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface EnhancedRequestPartsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobCardId?: string;
  onSuccess?: () => void;
}

const EnhancedRequestPartsDialog = ({
  open,
  onOpenChange,
  jobCardId,
  onSuccess,
}: EnhancedRequestPartsDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [showInventorySearch, setShowInventorySearch] = useState(false);
  const [formData, setFormData] = useState({
    partName: "",
    partNumber: "",
    quantity: "",
    jobCardId: jobCardId || "",
    notes: "",
    availableStock: 0,
    unitPrice: 0,
  });

  const handleSelectFromInventory = (part: {
    partName: string;
    partNumber: string;
    unitPrice: number;
    availableQuantity: number;
    category: string;
  }) => {
    setFormData({
      ...formData,
      partName: part.partName,
      partNumber: part.partNumber,
      availableStock: part.availableQuantity,
      unitPrice: part.unitPrice,
    });
    setShowInventorySearch(false);
  };

  const requestedQuantity = parseInt(formData.quantity) || 0;
  const isStockInsufficient =
    requestedQuantity > formData.availableStock && formData.availableStock > 0;
  const isStockAvailable =
    requestedQuantity <= formData.availableStock && formData.availableStock > 0;
  const estimatedCost = requestedQuantity * formData.unitPrice;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.partName || !formData.quantity) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (isStockInsufficient) {
      toast({
        title: "Warning",
        description: `Only ${formData.availableStock} units available in stock`,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from("parts_requests").insert({
        part_name: formData.partName,
        part_number: formData.partNumber || null,
        quantity: parseInt(formData.quantity),
        job_card_id: formData.jobCardId || null,
        notes: formData.notes || null,
        status: "pending",
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Parts request submitted successfully!",
      });
      onOpenChange(false);
      setFormData({
        partName: "",
        partNumber: "",
        quantity: "",
        jobCardId: jobCardId || "",
        notes: "",
        availableStock: 0,
        unitPrice: 0,
      });
      if (onSuccess) onSuccess();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit parts request",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Request Parts</DialogTitle>
            <DialogDescription>
              Submit a request for workshop parts
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="partName">Part Name *</Label>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={() => setShowInventorySearch(true)}
                  className="h-auto p-0 text-primary hover:text-primary/80"
                >
                  <Package className="h-3 w-3 mr-1" />
                  Select from Inventory
                </Button>
              </div>
              <Input
                id="partName"
                placeholder="e.g., Brake Pads"
                value={formData.partName}
                onChange={(e) =>
                  setFormData({ ...formData, partName: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="partNumber">Part Number</Label>
              <Input
                id="partNumber"
                placeholder="e.g., BP-123"
                value={formData.partNumber}
                onChange={(e) =>
                  setFormData({ ...formData, partNumber: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                placeholder="e.g., 2"
                value={formData.quantity}
                onChange={(e) =>
                  setFormData({ ...formData, quantity: e.target.value })
                }
                required
              />

              {/* Stock Status Alerts */}
              {formData.availableStock > 0 && (
                <>
                  {isStockAvailable && (
                    <Alert className="border-green-500 bg-green-50">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-700">
                        {formData.availableStock} units available in stock
                      </AlertDescription>
                    </Alert>
                  )}

                  {isStockInsufficient && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        Insufficient stock! Only {formData.availableStock} units
                        available
                      </AlertDescription>
                    </Alert>
                  )}
                </>
              )}

              {/* Estimated Cost */}
              {estimatedCost > 0 && (
                <div className="text-sm text-muted-foreground">
                  Estimated cost: R{estimatedCost.toFixed(2)}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="jobCardId">Job Card ID</Label>
              <Input
                id="jobCardId"
                placeholder="Optional - Link to job card"
                value={formData.jobCardId}
                onChange={(e) =>
                  setFormData({ ...formData, jobCardId: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Additional information..."
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading || isStockInsufficient}>
                {loading ? "Submitting..." : "Submit Request"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <InventorySearchDialog
        open={showInventorySearch}
        onOpenChange={setShowInventorySearch}
        onSelectPart={handleSelectFromInventory}
      />
    </>
  );
};

export default EnhancedRequestPartsDialog;
```

**To use this enhanced version:**

1. Create the file above
2. In `JobCardPartsTable.tsx`, change the import:

   ```tsx
   // OLD
   import RequestPartsDialog from "./dialogs/RequestPartsDialog";

   // NEW
   import RequestPartsDialog from "./dialogs/EnhancedRequestPartsDialog";
   ```

---

## Implementation Order (Recommended)

### Step 1: Create InventorySearchDialog ✅

- **Risk**: None (new file)
- **Time**: 15 minutes
- **Test**: Open dialog, search inventory, select part

### Step 2: Modify RequestPartsDialog ⚠️

- **Risk**: Low (optional feature addition)
- **Time**: 10 minutes
- **Test**: Ensure manual entry still works, test inventory selection

### Step 3: Deploy Enhanced Version (Optional) ⚠️

- **Risk**: Low (alternative component)
- **Time**: 20 minutes
- **Test**: Full workflow with stock validation

---

## Testing Checklist

### Before Implementation

- [ ] Backup current `RequestPartsDialog.tsx`
- [ ] Verify inventory table has data
- [ ] Check database connectivity

### After Phase 1

- [ ] InventorySearchDialog opens correctly
- [ ] Search filters parts properly
- [ ] Part selection returns correct data
- [ ] Dialog closes after selection

### After Phase 2

- [ ] "Select from Inventory" button appears
- [ ] Manual entry still works without using inventory
- [ ] Selected part data populates form
- [ ] Form submission works with both methods

### After Phase 3 (if implemented)

- [ ] Stock validation displays correctly
- [ ] Insufficient stock prevents submission
- [ ] Estimated cost calculates properly
- [ ] All original functionality preserved

---

## Rollback Plan

If issues occur:

### Phase 2 Rollback

```bash
# Restore original RequestPartsDialog.tsx
git checkout HEAD -- src/components/dialogs/RequestPartsDialog.tsx
```

### Phase 3 Rollback

```tsx
// In JobCardPartsTable.tsx, revert import
import RequestPartsDialog from "./dialogs/RequestPartsDialog";
```

---

## Database Queries Used

### Fetch Inventory

```typescript
const { data, error } = await supabase
  .from("inventory")
  .select("*")
  .order("name");
```

### Check Stock Availability (Optional Enhancement)

```typescript
const { data: stockCheck } = await supabase
  .from("inventory")
  .select("quantity")
  .eq("id", partId)
  .single();
```

---

## Future Enhancements

1. **Auto-deduct stock** when part request is approved
2. **Low stock alerts** during selection
3. **Recent parts** quick selection
4. **Part categories** filtering
5. **Price history** tracking
6. **Supplier information** display

---

## Support & Troubleshooting

### Common Issues

**Issue**: Inventory not loading

- **Check**: Database connection in Supabase
- **Fix**: Verify RLS policies allow authenticated users to read inventory

**Issue**: Part selection not populating form

- **Check**: Console for errors
- **Fix**: Verify field name mapping matches interface

**Issue**: Form validation failing

- **Check**: Required field values
- **Fix**: Ensure partName and quantity are set

---

## Contact & Questions

For implementation support:

1. Check existing `InventoryPanel.tsx` for reference patterns
2. Review Supabase types in `/src/integrations/supabase/types.ts`
3. Test with sample data before production deployment

---

## Summary

This implementation guide provides three safe implementation strategies:

1. **Conservative** (Phase 1): New component only - zero risk
2. **Standard** (Phase 2): Add inventory selection option - low risk
3. **Enhanced** (Phase 3): Full validation and UX - moderate complexity

All approaches maintain backward compatibility and can be rolled back easily.
