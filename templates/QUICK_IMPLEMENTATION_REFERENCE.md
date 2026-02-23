# Quick Implementation Reference - Inventory Selection

## 🎯 Goal

Add inventory selection to `JobCardPartsTable` without breaking existing functionality.

---

## ⚡ Quick Start (5 Minutes)

### Option A: Minimal Implementation

Create only: `/src/components/dialogs/InventorySearchDialog.tsx`

Copy the complete component from the main guide and test independently.

---

## 📋 Modification Points in RequestPartsDialog.tsx

### 1. Imports (Line ~8)

```tsx
import InventorySearchDialog from "./InventorySearchDialog";
import { Package } from "lucide-react";
```

### 2. State (Line ~18)

```tsx
const [showInventorySearch, setShowInventorySearch] = useState(false);
```

### 3. Handler (Line ~73)

```tsx
const handleSelectFromInventory = (part) => {
  setFormData({
    ...formData,
    partName: part.partName,
    partNumber: part.partNumber,
  });
  setShowInventorySearch(false);
};
```

### 4. UI Button (Line ~90)

```tsx
<div className="flex items-center justify-between">
  <Label htmlFor="partName">Part Name *</Label>
  <Button
    type="button"
    variant="link"
    size="sm"
    onClick={() => setShowInventorySearch(true)}
  >
    <Package className="h-3 w-3 mr-1" />
    Select from Inventory
  </Button>
</div>
```

### 5. Dialog Component (Line ~155)

```tsx
<InventorySearchDialog
  open={showInventorySearch}
  onOpenChange={setShowInventorySearch}
  onSelectPart={handleSelectFromInventory}
/>
```

---

## ✅ Testing Steps

1. **Smoke Test**

   ```bash
   npm run dev
   ```

   - Open any job card
   - Click "Request Parts"
   - Verify dialog opens

2. **Inventory Selection Test**

   - Click "Select from Inventory"
   - Search for a part
   - Click "Select"
   - Verify part name populates

3. **Manual Entry Test**
   - Clear part name
   - Type manually
   - Submit form
   - Verify still works

---

## 🔄 Rollback (If Needed)

```bash
# Restore original file
git checkout HEAD -- src/components/dialogs/RequestPartsDialog.tsx

# Or delete the new component
rm src/components/dialogs/InventorySearchDialog.tsx
```

---

## 📊 Database Schema Reference

```typescript
interface InventoryItem {
  id: string;
  name: string; // Display name
  part_number: string; // Part identifier
  category: string; // Part category
  quantity: number; // Available stock
  min_quantity: number; // Reorder level
  unit_price: number | null; // Price per unit
  location: string | null; // Storage location
  supplier: string | null; // Vendor info
}
```

---

## 🎨 UI Preview

```
┌─────────────────────────────────────┐
│  Request Parts                  ×   │
├─────────────────────────────────────┤
│                                     │
│  Part Name *   Select from Inventory│
│  ┌─────────────────────────────┐   │
│  │ Brake Pads                  │   │
│  └─────────────────────────────┘   │
│                                     │
│  [Existing form fields...]          │
│                                     │
│            [Cancel] [Submit]        │
└─────────────────────────────────────┘
```

When "Select from Inventory" clicked:

```
┌─────────────────────────────────────┐
│  Select Part from Inventory     ×   │
├─────────────────────────────────────┤
│  🔍 [Search by name, part #...]     │
├─────────────────────────────────────┤
│  📦 Brake Pads - Front       [OEM]  │
│     Part #: BP-123                  │
│     Available: 15 | Price: R450.00  │
│                          [Select]   │
│  ─────────────────────────────────  │
│  📦 Oil Filter                [OEM]  │
│     Part #: OF-456                  │
│     Available: 23 | Price: R120.00  │
│                          [Select]   │
└─────────────────────────────────────┘
```

---

## 💡 Tips

- **Start with Phase 1** - Create component, test independently
- **Keep backup** - Copy RequestPartsDialog.tsx before editing
- **Test inventory data** - Verify parts exist in database
- **Check permissions** - Ensure user can read inventory table
- **Gradual rollout** - Test in dev before production

---

## 📚 Full Guide

See `INVENTORY_SELECTION_IMPLEMENTATION_GUIDE.md` for:

- Complete code samples
- Enhanced version with stock validation
- Troubleshooting guide
- Future enhancement ideas

---

## 🚀 Implementation Time

- **Phase 1**: 15 minutes (new component only)
- **Phase 2**: 10 minutes (add inventory selection)
- **Phase 3**: 20 minutes (enhanced with validation)

**Total**: ~45 minutes for full implementation
