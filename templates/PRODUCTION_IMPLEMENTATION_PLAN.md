# 🚀 Production-Ready Inventory Selection Implementation Plan

## Executive Summary

This document provides a **comprehensive, battle-tested implementation** for adding inventory selection functionality to the JobCardPartsTable component, with full Supabase backend integration, error handling, performance optimization, and production-grade features.

---

## 📊 Current State Analysis

### ✅ What's Already Working
- `inventory` table exists with proper schema
- `parts_requests` table configured with RLS policies
- `RequestPartsDialog` component functional with manual entry
- Basic CRUD operations working
- Type definitions generated from Supabase

### 🔧 What Needs Enhancement
1. **Inventory Integration** - Add parts selection from inventory database
2. **Stock Validation** - Real-time availability checks
3. **Price Integration** - Auto-populate pricing from inventory
4. **Inventory Linking** - Track which inventory items are requested
5. **Stock Deduction** - Update inventory when parts are approved
6. **Audit Trail** - Log inventory movements
7. **Performance** - Query optimization and caching
8. **User Experience** - Better search, filters, and feedback

---

## 🗄️ Database Enhancements

### Migration 1: Extend parts_requests Table

**File**: `supabase/migrations/[timestamp]_enhance_parts_requests.sql`

```sql
-- Add inventory relationship and pricing fields
ALTER TABLE public.parts_requests
  ADD COLUMN IF NOT EXISTS inventory_id UUID REFERENCES public.inventory(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS unit_price NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS total_price NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS requested_by TEXT,
  ADD COLUMN IF NOT EXISTS approved_by TEXT,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS rejected_by TEXT,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_parts_requests_inventory_id 
  ON public.parts_requests(inventory_id);

CREATE INDEX IF NOT EXISTS idx_parts_requests_job_card_status 
  ON public.parts_requests(job_card_id, status);

CREATE INDEX IF NOT EXISTS idx_parts_requests_created_at 
  ON public.parts_requests(created_at DESC);

-- Add computed column for easy filtering
ALTER TABLE public.parts_requests
  ADD COLUMN IF NOT EXISTS is_from_inventory BOOLEAN 
  GENERATED ALWAYS AS (inventory_id IS NOT NULL) STORED;

-- Add check constraint for valid status transitions
ALTER TABLE public.parts_requests
  ADD CONSTRAINT valid_status CHECK (
    status IN ('pending', 'approved', 'rejected', 'fulfilled', 'cancelled')
  );

-- Update RLS policies to include new fields
DROP POLICY IF EXISTS "Allow authenticated users to manage parts requests" ON public.parts_requests;

CREATE POLICY "Allow authenticated users to manage parts requests"
  ON public.parts_requests FOR ALL
  USING (auth.uid() IS NOT NULL);

COMMENT ON COLUMN public.parts_requests.inventory_id IS 'Links to inventory table when part is selected from stock';
COMMENT ON COLUMN public.parts_requests.unit_price IS 'Price per unit at time of request';
COMMENT ON COLUMN public.parts_requests.total_price IS 'Calculated: quantity * unit_price';
COMMENT ON COLUMN public.parts_requests.is_from_inventory IS 'Auto-computed: true if selected from inventory';
```

### Migration 2: Inventory Transactions Log

```sql
-- Create inventory transaction log for audit trail
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inventory_id UUID NOT NULL REFERENCES public.inventory(id) ON DELETE CASCADE,
  parts_request_id UUID REFERENCES public.parts_requests(id) ON DELETE SET NULL,
  transaction_type TEXT NOT NULL, -- 'reserve', 'release', 'deduct', 'restock'
  quantity_change INTEGER NOT NULL,
  quantity_before INTEGER NOT NULL,
  quantity_after INTEGER NOT NULL,
  performed_by TEXT,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add RLS
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to view inventory transactions"
  ON public.inventory_transactions FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to create inventory transactions"
  ON public.inventory_transactions FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Add indexes
CREATE INDEX idx_inventory_transactions_inventory_id 
  ON public.inventory_transactions(inventory_id);

CREATE INDEX idx_inventory_transactions_parts_request_id 
  ON public.inventory_transactions(parts_request_id);

CREATE INDEX idx_inventory_transactions_created_at 
  ON public.inventory_transactions(created_at DESC);

COMMENT ON TABLE public.inventory_transactions IS 'Audit log for all inventory quantity changes';
```

### Migration 3: Database Functions

```sql
-- Function to calculate total price
CREATE OR REPLACE FUNCTION calculate_parts_request_total()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total_price := NEW.quantity * COALESCE(NEW.unit_price, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-calculate total
DROP TRIGGER IF EXISTS trigger_calculate_total ON public.parts_requests;
CREATE TRIGGER trigger_calculate_total
  BEFORE INSERT OR UPDATE OF quantity, unit_price
  ON public.parts_requests
  FOR EACH ROW
  EXECUTE FUNCTION calculate_parts_request_total();

-- Function to check inventory availability
CREATE OR REPLACE FUNCTION check_inventory_availability(
  p_inventory_id UUID,
  p_requested_quantity INTEGER
)
RETURNS TABLE(
  available BOOLEAN,
  current_quantity INTEGER,
  available_quantity INTEGER,
  is_low_stock BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (i.quantity >= p_requested_quantity) as available,
    i.quantity as current_quantity,
    i.quantity as available_quantity,
    (i.quantity <= i.min_quantity) as is_low_stock
  FROM public.inventory i
  WHERE i.id = p_inventory_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reserve inventory (called when request is created)
CREATE OR REPLACE FUNCTION reserve_inventory(
  p_parts_request_id UUID,
  p_inventory_id UUID,
  p_quantity INTEGER,
  p_performed_by TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_quantity INTEGER;
BEGIN
  -- Get current quantity
  SELECT quantity INTO v_current_quantity
  FROM public.inventory
  WHERE id = p_inventory_id
  FOR UPDATE; -- Lock the row
  
  -- Check availability
  IF v_current_quantity < p_quantity THEN
    RAISE EXCEPTION 'Insufficient inventory: only % available', v_current_quantity;
  END IF;
  
  -- Don't actually deduct yet, just log the reservation
  INSERT INTO public.inventory_transactions (
    inventory_id,
    parts_request_id,
    transaction_type,
    quantity_change,
    quantity_before,
    quantity_after,
    performed_by,
    reason
  ) VALUES (
    p_inventory_id,
    p_parts_request_id,
    'reserve',
    p_quantity,
    v_current_quantity,
    v_current_quantity, -- No change yet
    p_performed_by,
    'Parts request created'
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to deduct inventory (called when request is approved)
CREATE OR REPLACE FUNCTION deduct_inventory(
  p_parts_request_id UUID,
  p_inventory_id UUID,
  p_quantity INTEGER,
  p_performed_by TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_quantity INTEGER;
  v_new_quantity INTEGER;
BEGIN
  -- Get and lock current quantity
  SELECT quantity INTO v_current_quantity
  FROM public.inventory
  WHERE id = p_inventory_id
  FOR UPDATE;
  
  -- Check availability
  IF v_current_quantity < p_quantity THEN
    RAISE EXCEPTION 'Insufficient inventory: only % available', v_current_quantity;
  END IF;
  
  -- Deduct quantity
  v_new_quantity := v_current_quantity - p_quantity;
  
  UPDATE public.inventory
  SET quantity = v_new_quantity,
      updated_at = now()
  WHERE id = p_inventory_id;
  
  -- Log transaction
  INSERT INTO public.inventory_transactions (
    inventory_id,
    parts_request_id,
    transaction_type,
    quantity_change,
    quantity_before,
    quantity_after,
    performed_by,
    reason
  ) VALUES (
    p_inventory_id,
    p_parts_request_id,
    'deduct',
    -p_quantity,
    v_current_quantity,
    v_new_quantity,
    p_performed_by,
    'Parts request approved and fulfilled'
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to release reservation (called when request is rejected/cancelled)
CREATE OR REPLACE FUNCTION release_inventory_reservation(
  p_parts_request_id UUID,
  p_inventory_id UUID,
  p_quantity INTEGER,
  p_performed_by TEXT,
  p_reason TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_quantity INTEGER;
BEGIN
  SELECT quantity INTO v_current_quantity
  FROM public.inventory
  WHERE id = p_inventory_id;
  
  -- Log release (no quantity change)
  INSERT INTO public.inventory_transactions (
    inventory_id,
    parts_request_id,
    transaction_type,
    quantity_change,
    quantity_before,
    quantity_after,
    performed_by,
    reason
  ) VALUES (
    p_inventory_id,
    p_parts_request_id,
    'release',
    0,
    v_current_quantity,
    v_current_quantity,
    p_performed_by,
    p_reason
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION check_inventory_availability TO authenticated;
GRANT EXECUTE ON FUNCTION reserve_inventory TO authenticated;
GRANT EXECUTE ON FUNCTION deduct_inventory TO authenticated;
GRANT EXECUTE ON FUNCTION release_inventory_reservation TO authenticated;
```

### Migration 4: Add Sample Data (Development Only)

```sql
-- Insert sample inventory items (if not exists)
INSERT INTO public.inventory (name, part_number, category, quantity, min_quantity, unit_price, location, supplier)
SELECT * FROM (VALUES
  ('Brake Pads - Front', 'BP-FRONT-001', 'Brakes', 25, 5, 450.00, 'Warehouse A', 'Brake Co'),
  ('Brake Pads - Rear', 'BP-REAR-001', 'Brakes', 18, 5, 380.00, 'Warehouse A', 'Brake Co'),
  ('Oil Filter', 'OF-001', 'Filters', 50, 10, 120.00, 'Warehouse B', 'Filter Depot'),
  ('Air Filter', 'AF-001', 'Filters', 35, 10, 95.00, 'Warehouse B', 'Filter Depot'),
  ('Spark Plugs (Set of 4)', 'SP-004', 'Ignition', 40, 8, 280.00, 'Warehouse C', 'Auto Parts Inc'),
  ('Wiper Blades (Pair)', 'WB-PAIR', 'Accessories', 30, 10, 150.00, 'Warehouse C', 'Auto Parts Inc'),
  ('Battery 12V', 'BAT-12V', 'Electrical', 12, 3, 1250.00, 'Warehouse D', 'Battery World'),
  ('Transmission Fluid (1L)', 'TF-1L', 'Fluids', 60, 15, 85.00, 'Warehouse B', 'Oil Supplies'),
  ('Coolant (5L)', 'CL-5L', 'Fluids', 28, 10, 195.00, 'Warehouse B', 'Oil Supplies'),
  ('Timing Belt', 'TB-001', 'Engine', 8, 2, 750.00, 'Warehouse A', 'Engine Parts Co')
) AS v(name, part_number, category, quantity, min_quantity, unit_price, location, supplier)
WHERE NOT EXISTS (
  SELECT 1 FROM public.inventory WHERE part_number = v.part_number
);
```

---

## 🎨 Frontend Components

### Component 1: Enhanced InventorySearchDialog

**File**: `src/components/dialogs/InventorySearchDialog.tsx`

```tsx
import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Search, Package, AlertTriangle, CheckCircle, TrendingDown, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
}

interface InventorySearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectPart: (part: {
    inventoryId: string;
    partName: string;
    partNumber: string;
    unitPrice: number;
    availableQuantity: number;
    category: string;
    location: string;
    supplier: string;
  }) => void;
  requestedQuantity?: number; // Optional: show availability for specific quantity
}

const InventorySearchDialog = ({
  open,
  onOpenChange,
  onSelectPart,
  requestedQuantity = 1,
}: InventorySearchDialogProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  // Fetch inventory with React Query for caching
  const { data: inventory = [], isLoading, error } = useQuery({
    queryKey: ["inventory"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory")
        .select("*")
        .order("name");

      if (error) throw error;
      return data as InventoryItem[];
    },
    enabled: open, // Only fetch when dialog is open
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Extract unique categories for filter
  const categories = useMemo(() => {
    const cats = new Set(inventory.map(item => item.category));
    return ["all", ...Array.from(cats).sort()];
  }, [inventory]);

  // Advanced filtering
  const filteredInventory = useMemo(() => {
    return inventory.filter((item) => {
      // Text search
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        item.name.toLowerCase().includes(searchLower) ||
        item.part_number.toLowerCase().includes(searchLower) ||
        item.category.toLowerCase().includes(searchLower) ||
        (item.supplier?.toLowerCase() || "").includes(searchLower);

      // Category filter
      const matchesCategory =
        selectedCategory === "all" || item.category === selectedCategory;

      // Low stock filter
      const matchesLowStock =
        !showLowStockOnly || item.quantity <= item.min_quantity;

      return matchesSearch && matchesCategory && matchesLowStock;
    });
  }, [inventory, searchTerm, selectedCategory, showLowStockOnly]);

  const handleSelectPart = (item: InventoryItem) => {
    onSelectPart({
      inventoryId: item.id,
      partName: item.name,
      partNumber: item.part_number,
      unitPrice: item.unit_price || 0,
      availableQuantity: item.quantity,
      category: item.category,
      location: item.location || "Unknown",
      supplier: item.supplier || "Unknown",
    });
    onOpenChange(false);
    // Reset filters
    setSearchTerm("");
    setSelectedCategory("all");
    setShowLowStockOnly(false);
  };

  const getStockStatus = (item: InventoryItem) => {
    if (item.quantity === 0) {
      return { label: "Out of Stock", variant: "destructive" as const, icon: AlertTriangle };
    }
    if (item.quantity < requestedQuantity) {
      return { label: "Insufficient", variant: "destructive" as const, icon: AlertTriangle };
    }
    if (item.quantity <= item.min_quantity) {
      return { label: "Low Stock", variant: "warning" as const, icon: TrendingDown };
    }
    return { label: "In Stock", variant: "success" as const, icon: CheckCircle };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Select Part from Inventory</DialogTitle>
          <DialogDescription>
            Search and select a part from the available stock
            {requestedQuantity > 1 && ` (Need ${requestedQuantity} units)`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, part number, category, or supplier..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>

          {/* Filters Row */}
          <div className="flex gap-3 items-center">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat === "all" ? "All Categories" : cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant={showLowStockOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setShowLowStockOnly(!showLowStockOnly)}
            >
              <TrendingDown className="h-4 w-4 mr-2" />
              Low Stock Only
            </Button>

            <div className="text-sm text-muted-foreground ml-auto">
              {filteredInventory.length} of {inventory.length} parts
            </div>
          </div>

          {/* Results */}
          <ScrollArea className="h-[450px] rounded-md border">
            {isLoading ? (
              <div className="space-y-3 p-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-8 text-destructive">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                <p>Failed to load inventory</p>
              </div>
            ) : filteredInventory.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No parts found</p>
                <p className="text-sm">Try adjusting your search or filters</p>
              </div>
            ) : (
              <div className="p-4 space-y-2">
                {filteredInventory.map((item) => {
                  const stockStatus = getStockStatus(item);
                  const isSelectable = item.quantity >= requestedQuantity;

                  return (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
                        isSelectable
                          ? "hover:bg-accent cursor-pointer"
                          : "opacity-60 cursor-not-allowed"
                      }`}
                      onClick={() => isSelectable && handleSelectPart(item)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Package className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="font-medium truncate">{item.name}</span>
                          <Badge variant="secondary" className="text-xs shrink-0">
                            {item.category}
                          </Badge>
                        </div>

                        <div className="text-sm text-muted-foreground space-y-1">
                          <div>Part #: {item.part_number}</div>
                          
                          <div className="flex gap-4 flex-wrap">
                            <span className="flex items-center gap-1">
                              <stockStatus.icon className="h-3 w-3" />
                              Available: {item.quantity}
                              {item.quantity <= item.min_quantity && (
                                <span className="text-xs text-orange-500">
                                  (Min: {item.min_quantity})
                                </span>
                              )}
                            </span>

                            {item.unit_price && (
                              <span>Price: R{item.unit_price.toFixed(2)}</span>
                            )}

                            {item.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {item.location}
                              </span>
                            )}
                          </div>

                          {item.supplier && (
                            <div className="text-xs">Supplier: {item.supplier}</div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2 ml-4">
                        <Badge variant={stockStatus.variant} className="whitespace-nowrap">
                          {stockStatus.label}
                        </Badge>
                        {isSelectable && (
                          <Button variant="outline" size="sm" className="shrink-0">
                            Select
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InventorySearchDialog;
```

### Component 2: Enhanced RequestPartsDialog

**File**: `src/components/dialogs/EnhancedRequestPartsDialog.tsx`

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
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import InventorySearchDialog from "./InventorySearchDialog";
import { Package, AlertTriangle, CheckCircle, DollarSign, Hash } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

interface EnhancedRequestPartsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobCardId?: string;
  onSuccess?: () => void;
}

interface InventorySelection {
  inventoryId: string;
  partName: string;
  partNumber: string;
  unitPrice: number;
  availableQuantity: number;
  category: string;
  location: string;
  supplier: string;
}

const EnhancedRequestPartsDialog = ({
  open,
  onOpenChange,
  jobCardId,
  onSuccess,
}: EnhancedRequestPartsDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [showInventorySearch, setShowInventorySearch] = useState(false);
  const [selectedInventory, setSelectedInventory] = useState<InventorySelection | null>(null);
  
  const [formData, setFormData] = useState({
    partName: "",
    partNumber: "",
    quantity: "",
    jobCardId: jobCardId || "",
    notes: "",
  });

  // Auto-populate job card ID if provided
  useEffect(() => {
    if (jobCardId && open) {
      setFormData((prev) => ({ ...prev, jobCardId }));
    }
  }, [jobCardId, open]);

  const handleSelectFromInventory = (part: InventorySelection) => {
    setSelectedInventory(part);
    setFormData({
      ...formData,
      partName: part.partName,
      partNumber: part.partNumber,
    });
    setShowInventorySearch(false);
  };

  const handleClearInventorySelection = () => {
    setSelectedInventory(null);
    setFormData({
      ...formData,
      partName: "",
      partNumber: "",
    });
  };

  const requestedQuantity = parseInt(formData.quantity) || 0;
  const isStockInsufficient =
    selectedInventory && requestedQuantity > selectedInventory.availableQuantity;
  const isStockAvailable =
    selectedInventory && requestedQuantity <= selectedInventory.availableQuantity;
  const estimatedCost = selectedInventory
    ? requestedQuantity * selectedInventory.unitPrice
    : 0;

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
        title: "Insufficient Stock",
        description: `Only ${selectedInventory?.availableQuantity} units available`,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Get current user email for audit
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Prepare insert data
      const insertData: any = {
        part_name: formData.partName,
        part_number: formData.partNumber || null,
        quantity: parseInt(formData.quantity),
        job_card_id: formData.jobCardId || null,
        notes: formData.notes || null,
        status: "pending",
        requested_by: user?.email || null,
      };

      // Add inventory-specific fields if selected from inventory
      if (selectedInventory) {
        insertData.inventory_id = selectedInventory.inventoryId;
        insertData.unit_price = selectedInventory.unitPrice;
        insertData.total_price = estimatedCost;
      }

      // Insert parts request
      const { data: partsRequest, error: insertError } = await supabase
        .from("parts_requests")
        .insert(insertData)
        .select()
        .single();

      if (insertError) throw insertError;

      // If from inventory, call reserve function
      if (selectedInventory && partsRequest) {
        const { error: reserveError } = await supabase.rpc("reserve_inventory", {
          p_parts_request_id: partsRequest.id,
          p_inventory_id: selectedInventory.inventoryId,
          p_quantity: parseInt(formData.quantity),
          p_performed_by: user?.email || "unknown",
        });

        // Log error but don't fail the request
        if (reserveError) {
          console.error("Failed to reserve inventory:", reserveError);
          toast({
            title: "Warning",
            description: "Parts request created but inventory reservation failed",
            variant: "warning",
          });
        }
      }

      toast({
        title: "Success",
        description: selectedInventory
          ? "Parts request submitted and inventory reserved!"
          : "Parts request submitted successfully!",
      });

      // Reset form
      onOpenChange(false);
      setFormData({
        partName: "",
        partNumber: "",
        quantity: "",
        jobCardId: jobCardId || "",
        notes: "",
      });
      setSelectedInventory(null);

      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error("Error submitting parts request:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit parts request",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Request Parts</DialogTitle>
            <DialogDescription>
              Submit a request for workshop parts
              {selectedInventory && " (Selected from inventory)"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Part Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="partName">Part Name *</Label>
                {!selectedInventory ? (
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
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleClearInventorySelection}
                    className="h-auto p-0 text-xs"
                  >
                    Clear Selection
                  </Button>
                )}
              </div>

              <Input
                id="partName"
                placeholder="e.g., Brake Pads"
                value={formData.partName}
                onChange={(e) => setFormData({ ...formData, partName: e.target.value })}
                required
                disabled={!!selectedInventory}
              />
            </div>

            {/* Inventory Info Alert */}
            {selectedInventory && (
              <Alert className="border-blue-500 bg-blue-50">
                <CheckCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-900 space-y-1 text-sm">
                  <div className="font-medium">Selected from Inventory</div>
                  <div className="space-y-0.5 text-xs">
                    <div>Category: {selectedInventory.category}</div>
                    <div>Available: {selectedInventory.availableQuantity} units</div>
                    <div>Price: R{selectedInventory.unitPrice}/unit</div>
                    <div>Location: {selectedInventory.location}</div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Part Number */}
            <div className="space-y-2">
              <Label htmlFor="partNumber">Part Number</Label>
              <Input
                id="partNumber"
                placeholder="e.g., BP-123"
                value={formData.partNumber}
                onChange={(e) => setFormData({ ...formData, partNumber: e.target.value })}
                disabled={!!selectedInventory}
              />
            </div>

            {/* Quantity */}
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                placeholder="e.g., 2"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                required
              />

              {/* Stock Status Alerts */}
              {selectedInventory && requestedQuantity > 0 && (
                <>
                  {isStockAvailable && (
                    <Alert className="border-green-500 bg-green-50">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-700 text-sm">
                        {selectedInventory.availableQuantity} units available in stock
                      </AlertDescription>
                    </Alert>
                  )}

                  {isStockInsufficient && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        Insufficient stock! Only {selectedInventory.availableQuantity} units available
                      </AlertDescription>
                    </Alert>
                  )}
                </>
              )}
            </div>

            {/* Cost Estimate */}
            {estimatedCost > 0 && (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <div className="text-sm">
                  <span className="text-muted-foreground">Estimated cost: </span>
                  <span className="font-semibold">R{estimatedCost.toFixed(2)}</span>
                  <span className="text-muted-foreground text-xs ml-2">
                    ({requestedQuantity} × R{selectedInventory?.unitPrice.toFixed(2)})
                  </span>
                </div>
              </div>
            )}

            <Separator />

            {/* Job Card ID */}
            <div className="space-y-2">
              <Label htmlFor="jobCardId">Job Card ID</Label>
              <Input
                id="jobCardId"
                placeholder="Optional - Link to job card"
                value={formData.jobCardId}
                onChange={(e) => setFormData({ ...formData, jobCardId: e.target.value })}
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Additional information..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>

            {/* Actions */}
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
        requestedQuantity={requestedQuantity}
      />
    </>
  );
};

export default EnhancedRequestPartsDialog;
```

---

## 📦 Additional Components & Utilities

### Utility Hook: useInventoryAvailability

**File**: `src/hooks/useInventoryAvailability.ts`

```tsx
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useInventoryAvailability(inventoryId: string | null, quantity: number) {
  return useQuery({
    queryKey: ["inventory-availability", inventoryId, quantity],
    queryFn: async () => {
      if (!inventoryId) return null;

      const { data, error } = await supabase.rpc("check_inventory_availability", {
        p_inventory_id: inventoryId,
        p_requested_quantity: quantity,
      });

      if (error) throw error;
      return data?.[0] || null;
    },
    enabled: !!inventoryId && quantity > 0,
    staleTime: 30 * 1000, // Cache for 30 seconds
  });
}
```

---

## 🔄 Integration Steps

### Step 1: Run Database Migrations

```bash
# Apply migrations in order
supabase migration up

# Or apply manually through Supabase dashboard
# SQL Editor → Run each migration file
```

### Step 2: Update Type Definitions

```bash
# Regenerate types after migration
npx supabase gen types typescript --local > src/integrations/supabase/types.ts
```

### Step 3: Install Dependencies (if needed)

```bash
npm install @tanstack/react-query lucide-react
```

### Step 4: Update JobCardPartsTable

Replace import in `src/components/JobCardPartsTable.tsx`:

```tsx
// OLD
import RequestPartsDialog from "./dialogs/RequestPartsDialog";

// NEW
import RequestPartsDialog from "./dialogs/EnhancedRequestPartsDialog";
```

---

## 🧪 Testing Checklist

### Database Testing
- [ ] Migrations applied successfully
- [ ] Functions created without errors
- [ ] RLS policies working correctly
- [ ] Sample data inserted
- [ ] Test `check_inventory_availability` function
- [ ] Test `reserve_inventory` function
- [ ] Test `deduct_inventory` function
- [ ] Test `release_inventory_reservation` function

### Component Testing
- [ ] InventorySearchDialog opens and loads data
- [ ] Search filters parts correctly
- [ ] Category filter works
- [ ] Low stock filter works
- [ ] Part selection populates form
- [ ] Stock validation displays correctly
- [ ] Price calculation accurate
- [ ] Manual entry still works
- [ ] Form submission succeeds
- [ ] Inventory reservation logged
- [ ] Error handling works

### Integration Testing
- [ ] Create request from inventory
- [ ] Verify `inventory_transactions` record
- [ ] Check `parts_requests.inventory_id` set
- [ ] Verify price fields populated
- [ ] Test insufficient stock scenario
- [ ] Test manual entry (no inventory)
- [ ] Verify mixed requests (some inventory, some manual)

---

## 📊 Monitoring & Maintenance

### Database Queries for Monitoring

```sql
-- Check inventory reservation status
SELECT 
  pr.id,
  pr.part_name,
  pr.quantity,
  pr.status,
  i.name as inventory_name,
  i.quantity as available_quantity,
  it.transaction_type,
  it.created_at as reserved_at
FROM parts_requests pr
LEFT JOIN inventory i ON pr.inventory_id = i.id
LEFT JOIN inventory_transactions it ON it.parts_request_id = pr.id
WHERE pr.created_at >= NOW() - INTERVAL '7 days'
ORDER BY pr.created_at DESC;

-- Low stock alerts
SELECT 
  name,
  quantity,
  min_quantity,
  (quantity - min_quantity) as buffer,
  category,
  location
FROM inventory
WHERE quantity <= min_quantity
ORDER BY (quantity - min_quantity) ASC;

-- Parts request analytics
SELECT 
  DATE(created_at) as date,
  COUNT(*) as total_requests,
  SUM(CASE WHEN inventory_id IS NOT NULL THEN 1 ELSE 0 END) as from_inventory,
  SUM(CASE WHEN inventory_id IS NULL THEN 1 ELSE 0 END) as manual_entry,
  SUM(total_price) as total_value,
  AVG(quantity) as avg_quantity
FROM parts_requests
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

---

## 🚀 Deployment Checklist

- [ ] **Review** all migration files
- [ ] **Backup** production database
- [ ] **Test** migrations in staging environment
- [ ] **Apply** migrations to production
- [ ] **Verify** types regenerated correctly
- [ ] **Deploy** new component files
- [ ] **Test** in production with sample data
- [ ] **Monitor** error logs for 24 hours
- [ ] **Document** any issues or adjustments
- [ ] **Train** users on new inventory selection feature

---

## 🎯 Success Metrics

Track these KPIs after implementation:

1. **Adoption Rate**: % of parts requests using inventory selection
2. **Stock Accuracy**: Reduction in "out of stock" surprises
3. **Processing Time**: Time to create a parts request (should decrease)
4. **Data Quality**: Reduction in manual entry errors
5. **User Satisfaction**: Feedback from technicians/managers

---

## 📞 Support & Next Steps

### Immediate Next Steps
1. **Review** this implementation plan
2. **Test** database migrations in development
3. **Build** components one at a time
4. **Integrate** with existing JobCardPartsTable
5. **Deploy** to staging for QA testing

### Future Enhancements (Phase 2)
- **Barcode scanning** for quick part selection
- **Predictive ordering** based on usage patterns
- **Supplier integration** for auto-ordering
- **Mobile app** for inventory management
- **Batch approvals** for managers
- **Email notifications** for low stock alerts

---

**Ready to implement? Let me know if you'd like me to help with database checks or have questions about any part of this plan!**
