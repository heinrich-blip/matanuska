# ⚛️ Phase 2: Component Creation

**Phase:** 2 of 5  
**Timeline:** Day 2-3 (6-8 hours)  
**Prerequisites:** Phase 1 complete, types regenerated  
**Completion Criteria:** All components created, no TypeScript errors

---

## 📋 Phase Overview

This phase focuses on **building React components** for the inventory selection feature. We'll create two main dialogs and supporting utilities to enable searching, selecting, and requesting parts from inventory.

**What This Phase Delivers:**

- ✅ InventorySearchDialog - Browse and search inventory
- ✅ EnhancedRequestPartsDialog - Request parts with inventory integration
- ✅ useInventoryAvailability hook - Check stock availability
- ✅ Full TypeScript type safety
- ✅ Responsive UI with Shadcn components

---

## 🎯 Objectives

1. Create searchable inventory dialog with filters
2. Integrate inventory selection into parts request flow
3. Add real-time stock validation
4. Implement automatic price population
5. Maintain backward compatibility (manual entry still works)

---

## 📊 Pre-Implementation Checklist

### ✅ Before You Start:

- [ ] Phase 1 completed successfully
- [ ] TypeScript types regenerated
- [ ] Development server running (`npm run dev`)
- [ ] No compilation errors
- [ ] Supabase connected
- [ ] Sample inventory data exists

### 🔍 Quick Verification:

```bash
# Check types file updated
grep -n "inventory_id" src/integrations/supabase/types.ts

# Check development server
curl http://localhost:5173

# Check no TypeScript errors
npx tsc --noEmit
```

---

## 🚀 Component 1: InventorySearchDialog

### Purpose:

A modal dialog that allows users to search and select parts from existing inventory.

### Features:

- Real-time search
- Category filtering
- Stock level filtering (All, In Stock, Low Stock)
- Displays quantity, price, location, supplier
- Visual stock indicators
- Responsive grid layout

### File Location:

`src/components/dialogs/InventorySearchDialog.tsx`

### Implementation:

```typescript
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Package, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Database } from "@/integrations/supabase/types";

type InventoryItem = Database["public"]["Tables"]["inventory"]["Row"];

interface InventorySearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (item: InventoryItem) => void;
}

export default function InventorySearchDialog({
  open,
  onOpenChange,
  onSelect,
}: InventorySearchDialogProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [stockFilter, setStockFilter] = useState<string>("all");

  // Fetch inventory items
  const { data: inventoryItems = [], isLoading } = useQuery({
    queryKey: ["inventory", "search"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory")
        .select("*")
        .order("name");

      if (error) throw error;
      return data as InventoryItem[];
    },
    enabled: open,
  });

  // Get unique categories
  const categories = Array.from(
    new Set(inventoryItems.map((item) => item.category).filter(Boolean))
  ).sort();

  // Filter inventory based on search, category, and stock level
  const filteredItems = inventoryItems.filter((item) => {
    // Search filter
    const matchesSearch =
      searchTerm === "" ||
      item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.part_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.supplier?.toLowerCase().includes(searchTerm.toLowerCase());

    // Category filter
    const matchesCategory =
      selectedCategory === "all" || item.category === selectedCategory;

    // Stock filter
    const matchesStock =
      stockFilter === "all" ||
      (stockFilter === "in-stock" &&
        (item.quantity || 0) > (item.min_quantity || 0)) ||
      (stockFilter === "low-stock" &&
        (item.quantity || 0) > 0 &&
        (item.quantity || 0) <= (item.min_quantity || 0));

    return matchesSearch && matchesCategory && matchesStock;
  });

  const handleSelectItem = (item: InventoryItem) => {
    onSelect(item);
    onOpenChange(false);
    // Reset filters
    setSearchTerm("");
    setSelectedCategory("all");
    setStockFilter("all");
  };

  const getStockStatus = (quantity: number, minQuantity: number) => {
    if (quantity === 0) {
      return {
        label: "Out of Stock",
        color: "destructive",
        icon: AlertTriangle,
      };
    } else if (quantity <= minQuantity) {
      return { label: "Low Stock", color: "warning", icon: AlertTriangle };
    } else {
      return { label: "In Stock", color: "success", icon: CheckCircle2 };
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Select from Inventory
          </DialogTitle>
        </DialogHeader>

        {/* Search and Filters */}
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, part number, or supplier..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filter Row */}
          <div className="flex gap-4">
            {/* Category Filter */}
            <Select
              value={selectedCategory}
              onValueChange={setSelectedCategory}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Stock Level Filter */}
            <Select value={stockFilter} onValueChange={setStockFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Stock Levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stock Levels</SelectItem>
                <SelectItem value="in-stock">In Stock</SelectItem>
                <SelectItem value="low-stock">Low Stock</SelectItem>
              </SelectContent>
            </Select>

            {/* Results Count */}
            <div className="ml-auto flex items-center text-sm text-muted-foreground">
              {filteredItems.length}{" "}
              {filteredItems.length === 1 ? "item" : "items"} found
            </div>
          </div>
        </div>

        {/* Results */}
        <ScrollArea className="h-[400px] pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <div className="text-muted-foreground">Loading inventory...</div>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <Package className="h-12 w-12 text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No items found</p>
              <p className="text-sm text-muted-foreground">
                Try adjusting your search or filters
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredItems.map((item) => {
                const stockStatus = getStockStatus(
                  item.quantity || 0,
                  item.min_quantity || 0
                );
                const StockIcon = stockStatus.icon;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectItem(item)}
                    className="w-full p-4 border rounded-lg hover:bg-accent hover:border-primary transition-colors text-left"
                  >
                    <div className="flex items-start justify-between gap-4">
                      {/* Left: Item Info */}
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{item.name}</h4>
                          <Badge variant="outline">{item.category}</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Part #: {item.part_number}
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-muted-foreground">
                            Location: {item.location || "N/A"}
                          </span>
                          <span className="text-muted-foreground">
                            Supplier: {item.supplier || "N/A"}
                          </span>
                        </div>
                      </div>

                      {/* Right: Stock & Price */}
                      <div className="text-right space-y-2">
                        <div className="text-lg font-semibold text-primary">
                          R{item.unit_price?.toFixed(2) || "0.00"}
                        </div>
                        <div className="flex items-center gap-2 justify-end">
                          <StockIcon className="h-4 w-4" />
                          <span className="text-sm font-medium">
                            {item.quantity} units
                          </span>
                        </div>
                        <Badge
                          variant={
                            stockStatus.color === "destructive"
                              ? "destructive"
                              : stockStatus.color === "warning"
                              ? "outline"
                              : "default"
                          }
                        >
                          {stockStatus.label}
                        </Badge>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### ✅ Create the File:

```bash
# Create the component file
cat > src/components/dialogs/InventorySearchDialog.tsx << 'EOF'
[Paste the code above]
EOF
```

---

## 🚀 Component 2: EnhancedRequestPartsDialog

### Purpose:

Enhanced version of RequestPartsDialog with inventory integration.

### Features:

- "Select from Inventory" button
- Integrates InventorySearchDialog
- Auto-populates fields when inventory selected
- Displays stock availability alerts
- Calculates total price automatically
- Falls back to manual entry if no inventory selected
- Calls reserve_inventory() on submission

### File Location:

`src/components/dialogs/EnhancedRequestPartsDialog.tsx`

### Implementation:

```typescript
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Package, AlertTriangle, CheckCircle2, Search } from "lucide-react";
import { Database } from "@/integrations/supabase/types";
import InventorySearchDialog from "./InventorySearchDialog";

type InventoryItem = Database["public"]["Tables"]["inventory"]["Row"];

interface EnhancedRequestPartsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobCardId: string;
  onSuccess: () => void;
}

export default function EnhancedRequestPartsDialog({
  open,
  onOpenChange,
  jobCardId,
  onSuccess,
}: EnhancedRequestPartsDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showInventorySearch, setShowInventorySearch] = useState(false);

  // Form state
  const [partName, setPartName] = useState("");
  const [partNumber, setPartNumber] = useState("");
  const [quantity, setQuantity] = useState<number>(1);
  const [notes, setNotes] = useState("");

  // Inventory integration state
  const [selectedInventoryId, setSelectedInventoryId] = useState<string | null>(
    null
  );
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [availableQuantity, setAvailableQuantity] = useState<number>(0);
  const [location, setLocation] = useState<string>("");
  const [supplier, setSupplier] = useState<string>("");

  // Computed values
  const totalPrice = quantity * unitPrice;
  const hasInsufficientStock =
    selectedInventoryId && quantity > availableQuantity;
  const isLowStock = availableQuantity > 0 && availableQuantity <= quantity * 2;

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setPartName("");
      setPartNumber("");
      setQuantity(1);
      setNotes("");
      setSelectedInventoryId(null);
      setUnitPrice(0);
      setAvailableQuantity(0);
      setLocation("");
      setSupplier("");
    }
  }, [open]);

  const handleInventorySelect = (item: InventoryItem) => {
    setPartName(item.name || "");
    setPartNumber(item.part_number || "");
    setSelectedInventoryId(item.id);
    setUnitPrice(item.unit_price || 0);
    setAvailableQuantity(item.quantity || 0);
    setLocation(item.location || "");
    setSupplier(item.supplier || "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!partName.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Part name is required",
      });
      return;
    }

    if (quantity <= 0) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Quantity must be greater than 0",
      });
      return;
    }

    if (hasInsufficientStock) {
      toast({
        variant: "destructive",
        title: "Insufficient Stock",
        description: `Only ${availableQuantity} units available`,
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Create parts request
      const { data: partsRequest, error: insertError } = await supabase
        .from("parts_requests")
        .insert({
          part_name: partName,
          part_number: partNumber || null,
          quantity,
          job_card_id: jobCardId,
          notes: notes || null,
          status: "pending",
          inventory_id: selectedInventoryId || null,
          unit_price: selectedInventoryId ? unitPrice : null,
          requested_by: user?.email || null,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // If from inventory, reserve the stock
      if (selectedInventoryId && partsRequest) {
        const { error: reserveError } = await supabase.rpc(
          "reserve_inventory",
          {
            p_parts_request_id: partsRequest.id,
            p_inventory_id: selectedInventoryId,
            p_quantity: quantity,
            p_performed_by: user?.email || "system",
          }
        );

        if (reserveError) {
          console.error("Failed to reserve inventory:", reserveError);
          // Don't fail the whole operation, just warn
          toast({
            variant: "destructive",
            title: "Warning",
            description:
              "Parts request created but inventory reservation failed",
          });
        }
      }

      toast({
        title: "Success",
        description: selectedInventoryId
          ? "Parts request submitted and inventory reserved!"
          : "Parts request submitted successfully!",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating parts request:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create parts request. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Request Parts
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Inventory Selection Button */}
            <div className="flex justify-between items-center p-3 bg-accent rounded-lg">
              <div className="text-sm">
                <p className="font-medium">Select from inventory</p>
                <p className="text-muted-foreground">
                  Browse existing parts or enter manually below
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowInventorySearch(true)}
              >
                <Search className="h-4 w-4 mr-2" />
                Browse Inventory
              </Button>
            </div>

            {/* Stock Alert */}
            {selectedInventoryId && (
              <Alert
                variant={
                  hasInsufficientStock
                    ? "destructive"
                    : isLowStock
                    ? "default"
                    : "default"
                }
              >
                {hasInsufficientStock ? (
                  <AlertTriangle className="h-4 w-4" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                <AlertDescription>
                  {hasInsufficientStock ? (
                    <>
                      <strong>Insufficient stock!</strong> Only{" "}
                      {availableQuantity} units available.
                    </>
                  ) : isLowStock ? (
                    <>
                      <strong>Low stock warning:</strong> {availableQuantity}{" "}
                      units available.
                    </>
                  ) : (
                    <>
                      <strong>In stock:</strong> {availableQuantity} units
                      available.
                    </>
                  )}
                  {location && ` Location: ${location}`}
                </AlertDescription>
              </Alert>
            )}

            {/* Part Name */}
            <div className="space-y-2">
              <Label htmlFor="partName">
                Part Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="partName"
                value={partName}
                onChange={(e) => setPartName(e.target.value)}
                placeholder="Enter part name"
                required
              />
            </div>

            {/* Part Number */}
            <div className="space-y-2">
              <Label htmlFor="partNumber">Part Number</Label>
              <Input
                id="partNumber"
                value={partNumber}
                onChange={(e) => setPartNumber(e.target.value)}
                placeholder="Enter part number (optional)"
              />
            </div>

            {/* Quantity and Price */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">
                  Quantity <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  required
                />
              </div>

              {selectedInventoryId && (
                <div className="space-y-2">
                  <Label>Total Price</Label>
                  <div className="h-10 flex items-center px-3 border rounded-md bg-muted">
                    <span className="font-semibold text-primary">
                      R{totalPrice.toFixed(2)}
                    </span>
                    <span className="text-sm text-muted-foreground ml-2">
                      ({quantity} × R{unitPrice.toFixed(2)})
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Supplier (if from inventory) */}
            {selectedInventoryId && supplier && (
              <div className="space-y-2">
                <Label>Supplier</Label>
                <div className="p-2 border rounded-md bg-muted text-sm">
                  {supplier}
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any additional notes or requirements..."
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || hasInsufficientStock}
              >
                {isSubmitting ? "Submitting..." : "Submit Request"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Inventory Search Dialog */}
      <InventorySearchDialog
        open={showInventorySearch}
        onOpenChange={setShowInventorySearch}
        onSelect={handleInventorySelect}
      />
    </>
  );
}
```

### ✅ Create the File:

```bash
# Create the component file
cat > src/components/dialogs/EnhancedRequestPartsDialog.tsx << 'EOF'
[Paste the code above]
EOF
```

---

## 🚀 Component 3: Custom Hook (Optional)

### Purpose:

Reusable hook for checking inventory availability.

### File Location:

`src/hooks/useInventoryAvailability.ts`

### Implementation:

```typescript
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useInventoryAvailability(inventoryId: string | null) {
  return useQuery({
    queryKey: ["inventory", "availability", inventoryId],
    queryFn: async () => {
      if (!inventoryId) return null;

      const { data, error } = await supabase
        .from("inventory")
        .select("quantity, min_quantity, name, unit_price")
        .eq("id", inventoryId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!inventoryId,
    staleTime: 30000, // 30 seconds
  });
}
```

### ✅ Create the File:

```bash
# Create the hook file
cat > src/hooks/useInventoryAvailability.ts << 'EOF'
[Paste the code above]
EOF
```

---

## 🔄 Update JobCardPartsTable.tsx

### Purpose:

Switch from old RequestPartsDialog to new EnhancedRequestPartsDialog.

### Changes:

Single import line change.

### Implementation:

```typescript
// BEFORE:
import RequestPartsDialog from "./dialogs/RequestPartsDialog";

// AFTER:
import RequestPartsDialog from "./dialogs/EnhancedRequestPartsDialog";
```

### ✅ Apply the Change:

```bash
# Open the file
# Find line with: import RequestPartsDialog from "./dialogs/RequestPartsDialog";
# Replace with: import RequestPartsDialog from "./dialogs/EnhancedRequestPartsDialog";
```

Or use sed:

```bash
sed -i 's|./dialogs/RequestPartsDialog|./dialogs/EnhancedRequestPartsDialog|g' \
  src/components/JobCardPartsTable.tsx
```

---

## 📋 Phase 2 Completion Checklist

### Components Created:

- [ ] InventorySearchDialog.tsx created
- [ ] EnhancedRequestPartsDialog.tsx created
- [ ] useInventoryAvailability.ts hook created (optional)

### Integration:

- [ ] JobCardPartsTable.tsx updated to use enhanced dialog
- [ ] Import paths correct
- [ ] No TypeScript errors

### Functionality:

- [ ] Search dialog opens
- [ ] Search filters work
- [ ] Category filter works
- [ ] Stock level filter works
- [ ] Selecting item populates form
- [ ] Stock alerts display correctly
- [ ] Price calculation automatic
- [ ] Manual entry still works
- [ ] Form submission succeeds
- [ ] Inventory reservation called

### UI/UX:

- [ ] Responsive on mobile
- [ ] Loading states show
- [ ] Empty states show
- [ ] Error messages clear
- [ ] Success toasts appear
- [ ] Dialogs close properly

### Testing:

- [ ] Select from inventory flow works
- [ ] Manual entry flow works
- [ ] Insufficient stock prevented
- [ ] Low stock warning shown
- [ ] Price calculation correct
- [ ] Search performs well
- [ ] No console errors

---

## 🧪 Manual Testing Steps

### Test 1: Inventory Selection Flow

```
1. Open a job card
2. Click "Request Parts"
3. Click "Browse Inventory"
4. Should see: Inventory search dialog
5. Search for "brake"
6. Should see: Filtered results
7. Select "Brake Pads - Front"
8. Should see: Form populated with:
   - Name: "Brake Pads - Front"
   - Part Number: "BP-FRONT-001"
   - Price: R450.00
   - Stock: "25 units available"
9. Enter quantity: 2
10. Should see: Total: R900.00
11. Click "Submit Request"
12. Should see: Success toast
13. Parts table should refresh
```

### Test 2: Insufficient Stock

```
1. Open job card
2. Request parts
3. Browse inventory
4. Select item with 5 units
5. Enter quantity: 10
6. Should see: Red alert "Insufficient stock"
7. Submit button should be disabled
8. Reduce quantity to 5
9. Alert should turn green
10. Submit should be enabled
```

### Test 3: Manual Entry (Backward Compatibility)

```
1. Open job card
2. Request parts
3. DON'T click "Browse Inventory"
4. Manually type:
   - Name: "Custom Bracket"
   - Quantity: 1
5. Should work: No price/stock info needed
6. Click Submit
7. Should succeed without inventory link
```

### Test 4: Search & Filters

```
1. Open inventory search
2. Type "oil" in search
3. Should see: Only oil-related items
4. Change category to "Filters"
5. Should see: No results (oil not in Filters)
6. Clear search
7. Should see: All filter items
8. Change stock filter to "Low Stock"
9. Should see: Only items below min quantity
```

---

## ⏭️ Next Phase

**Phase 3: Integration Testing**

- Test all user flows end-to-end
- Verify database operations
- Check inventory reservation logic
- Performance testing
- Cross-browser testing

**Prerequisites for Phase 3:**

- ✅ Phase 2 completed
- ✅ All components working
- ✅ No TypeScript errors
- ✅ Manual tests passed

---

## 🆘 Troubleshooting

### Issue: TypeScript error "Property 'rpc' does not exist"

**Solution:**

```bash
# Regenerate types
npx supabase gen types typescript --local > src/integrations/supabase/types.ts

# Restart TypeScript server in VSCode
# Ctrl+Shift+P → "TypeScript: Restart TS Server"
```

### Issue: Dialog doesn't open

**Solution:**

```typescript
// Check state in parent component
console.log("Dialog open:", showDialog);

// Verify Dialog props
<Dialog open={showDialog} onOpenChange={setShowDialog}>
```

### Issue: Search not filtering

**Solution:**

```typescript
// Add logging to filter function
console.log("Search term:", searchTerm);
console.log("Filtered items:", filteredItems.length);

// Check case sensitivity
item.name?.toLowerCase().includes(searchTerm.toLowerCase());
```

### Issue: Reserve function not found

**Solution:**

```sql
-- Check if function exists
SELECT routine_name FROM information_schema.routines
WHERE routine_name = 'reserve_inventory';

-- If not, run Phase 1 Migration 3 again
```

---

**Phase 2 Complete! 🎉**  
**Estimated Time:** 6-8 hours  
**Next:** Proceed to Phase 3 - Integration Testing
