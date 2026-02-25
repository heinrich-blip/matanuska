import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  type PartsRequest,
  type QuoteAttachment,
  useCreateInventoryAndLink,
  useStartProcurement,
} from "@/hooks/useProcurement";
import {
  FileText,
  Loader2,
  Package,
  Plus,
  Search,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import InventorySearchDialog from "./InventorySearchDialog";

interface StartProcurementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requests: PartsRequest[];
}

interface QuoteFile {
  file: File;
  vendorName: string;
  price: string;
}

export default function StartProcurementDialog({
  open,
  onOpenChange,
  requests,
}: StartProcurementDialogProps) {
  const { toast } = useToast();
  const startProcurement = useStartProcurement();
  const createInventoryAndLink = useCreateInventoryAndLink();

  const [irNumber, setIrNumber] = useState("");
  const [inventoryChoice, setInventoryChoice] = useState<"existing" | "new">("existing");
  const [showInventorySearch, setShowInventorySearch] = useState(false);
  const [selectedInventoryId, setSelectedInventoryId] = useState<string | null>(null);
  const [selectedInventoryName, setSelectedInventoryName] = useState("");
  const [quoteFiles, setQuoteFiles] = useState<QuoteFile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New inventory item fields
  const [newItemName, setNewItemName] = useState("");
  const [newItemPartNumber, setNewItemPartNumber] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("");
  const [newItemMinQty, setNewItemMinQty] = useState("1");
  const [newItemLocation, setNewItemLocation] = useState("");

  const isSingle = requests.length === 1;
  const firstRequest = requests[0] || null;

  useEffect(() => {
    if (!open) {
      setIrNumber("");
      setInventoryChoice("existing");
      setSelectedInventoryId(null);
      setSelectedInventoryName("");
      setQuoteFiles([]);
      setNewItemName("");
      setNewItemPartNumber("");
      setNewItemCategory("");
      setNewItemMinQty("1");
      setNewItemLocation("");
    } else if (isSingle && firstRequest) {
      // Pre-fill if the request already has an inventory link
      if (firstRequest.inventory_id) {
        setSelectedInventoryId(firstRequest.inventory_id);
        setSelectedInventoryName(firstRequest.inventory?.name || firstRequest.part_name);
        setInventoryChoice("existing");
      } else {
        setNewItemName(firstRequest.part_name);
        setNewItemPartNumber(firstRequest.part_number || "");
      }
    }
  }, [open, isSingle, firstRequest]);

  const handleInventorySelect = (item: { id: string; name: string; part_number?: string | null }) => {
    setSelectedInventoryId(item.id);
    setSelectedInventoryName(item.name || "");
    setShowInventorySearch(false);
  };

  const addQuoteSlot = () => {
    setQuoteFiles([...quoteFiles, { file: null as unknown as File, vendorName: "", price: "" }]);
  };

  const removeQuoteSlot = (index: number) => {
    setQuoteFiles(quoteFiles.filter((_, i) => i !== index));
  };

  const updateQuoteFile = (index: number, file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast({ variant: "destructive", title: "File Too Large", description: "Max 5MB per file" });
      return;
    }
    const allowed = ["application/pdf", "image/jpeg", "image/png"];
    if (!allowed.includes(file.type)) {
      toast({ variant: "destructive", title: "Invalid Type", description: "PDF, JPG, or PNG only" });
      return;
    }
    const updated = [...quoteFiles];
    updated[index] = { ...updated[index], file };
    setQuoteFiles(updated);
  };

  const updateQuoteVendor = (index: number, vendorName: string) => {
    const updated = [...quoteFiles];
    updated[index] = { ...updated[index], vendorName };
    setQuoteFiles(updated);
  };

  const updateQuotePrice = (index: number, price: string) => {
    const updated = [...quoteFiles];
    updated[index] = { ...updated[index], price };
    setQuoteFiles(updated);
  };

  const uploadQuotes = async (): Promise<QuoteAttachment[]> => {
    const uploaded: QuoteAttachment[] = [];

    for (const q of quoteFiles) {
      if (!q.file) continue;
      const ext = q.file.name.split(".").pop();
      const fileName = `ir-${irNumber}-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const filePath = `procurement-quotes/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, q.file);

      if (uploadError) {
        console.error("Quote upload error:", uploadError);
        continue;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("documents")
        .getPublicUrl(filePath);

      uploaded.push({
        file_url: publicUrl,
        file_name: q.file.name,
        vendor_name: q.vendorName || "Unknown",
        price: q.price ? parseFloat(q.price) : null,
        uploaded_at: new Date().toISOString(),
      });
    }

    return uploaded;
  };

  const handleSubmit = async () => {
    if (requests.length === 0) return;

    if (!irNumber.trim()) {
      toast({ variant: "destructive", title: "Required", description: "IR number is required" });
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload quotes first (shared across all items)
      const quotes = await uploadQuotes();

      // If single request and creating a new inventory item, do that first
      let inventoryId = selectedInventoryId;
      if (isSingle && firstRequest && inventoryChoice === "new" && newItemName.trim()) {
        const result = await createInventoryAndLink.mutateAsync({
          requestId: firstRequest.id,
          name: newItemName,
          part_number: newItemPartNumber || undefined,
          category: newItemCategory || undefined,
          min_quantity: parseInt(newItemMinQty) || 1,
          location: newItemLocation || undefined,
          unit_price: firstRequest.unit_price || undefined,
        });
        inventoryId = result.inventoryItem.id;
      }

      // Start procurement for ALL selected requests with the same IR
      for (const req of requests) {
        const reqInventoryId = isSingle ? inventoryId : req.inventory_id;
        await startProcurement.mutateAsync({
          id: req.id,
          ir_number: irNumber,
          quotes: quotes.length > 0 ? quotes : undefined,
          inventory_id: reqInventoryId || undefined,
          is_from_inventory: !!reqInventoryId,
        });
      }

      toast({
        title: "Success",
        description: requests.length === 1
          ? "IR created and procurement started"
          : `IR created for ${requests.length} items — moved to Cash Manager`,
      });

      onOpenChange(false);
    } catch (error) {
      console.error("Start procurement error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (requests.length === 0) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Start Procurement
              {requests.length > 1 && (
                <Badge variant="secondary">{requests.length} items</Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              {requests.length === 1
                ? "Create an Internal Requisition (IR) and upload quotes for this request"
                : `Create a single IR for ${requests.length} selected items and upload quotes`}
            </DialogDescription>
          </DialogHeader>

          {/* Request Summary */}
          {isSingle && firstRequest ? (
            <div className="bg-muted/50 rounded-lg p-4 space-y-1">
              <div className="font-medium">{firstRequest.part_name}</div>
              {firstRequest.part_number && (
                <div className="text-xs text-muted-foreground font-mono">{firstRequest.part_number}</div>
              )}
              <div className="flex gap-4 text-sm text-muted-foreground">
                <span>Qty: {firstRequest.quantity}</span>
                {firstRequest.job_card?.job_number && (
                  <span className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    Job Card: {firstRequest.job_card.job_number}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="text-sm font-medium mb-2">Selected Items:</div>
              <ScrollArea className="max-h-[200px]">
                <div className="space-y-2">
                  {requests.map((req, idx) => (
                    <div key={req.id} className="flex items-start gap-2 text-sm">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 mt-0.5 shrink-0">
                        {idx + 1}
                      </Badge>
                      <div className="min-w-0">
                        <div className="font-medium truncate">{req.part_name}</div>
                        <div className="text-xs text-muted-foreground flex gap-3">
                          <span>Qty: {req.quantity}</span>
                          {req.part_number && <span className="font-mono">{req.part_number}</span>}
                          {req.job_card?.job_number && (
                            <span className="flex items-center gap-0.5">
                              <FileText className="h-3 w-3" />
                              {req.job_card.job_number}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          <div className="space-y-6">
            {/* IR Number */}
            <div className="space-y-2">
              <Label htmlFor="ir_number">
                IR Number <span className="text-destructive">*</span>
              </Label>
              <Input
                id="ir_number"
                placeholder="e.g., IR-2026-001234"
                value={irNumber}
                onChange={(e) => setIrNumber(e.target.value)}
              />
            </div>

            {/* Inventory Link Choice - only for single request */}
            {isSingle && firstRequest && !firstRequest.inventory_id && (
              <div className="space-y-3">
                <Label>Inventory Item</Label>
                <RadioGroup
                  value={inventoryChoice}
                  onValueChange={(v) => setInventoryChoice(v as "existing" | "new")}
                  className="space-y-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="existing" id="existing" />
                    <Label htmlFor="existing" className="font-normal">
                      Link to existing inventory item (reorder)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="new" id="new" />
                    <Label htmlFor="new" className="font-normal">
                      Create new inventory item
                    </Label>
                  </div>
                </RadioGroup>

                {inventoryChoice === "existing" && (
                  <div className="space-y-2">
                    {selectedInventoryId ? (
                      <div className="flex items-center gap-2 p-2 border rounded-md bg-green-50 dark:bg-green-950/20">
                        <Package className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium">{selectedInventoryName}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedInventoryId(null);
                            setSelectedInventoryName("");
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowInventorySearch(true)}
                      >
                        <Search className="h-4 w-4 mr-2" />
                        Browse Inventory
                      </Button>
                    )}
                  </div>
                )}

                {inventoryChoice === "new" && (
                  <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                    <div className="text-sm font-medium flex items-center gap-1">
                      <Plus className="h-3 w-3" />
                      New Inventory Item Details
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Item Name *</Label>
                        <Input
                          value={newItemName}
                          onChange={(e) => setNewItemName(e.target.value)}
                          placeholder="Part name"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Part Number</Label>
                        <Input
                          value={newItemPartNumber}
                          onChange={(e) => setNewItemPartNumber(e.target.value)}
                          placeholder="Part #"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Category</Label>
                        <Input
                          value={newItemCategory}
                          onChange={(e) => setNewItemCategory(e.target.value)}
                          placeholder="e.g., Brakes"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Min Quantity</Label>
                        <Input
                          type="number"
                          min="1"
                          value={newItemMinQty}
                          onChange={(e) => setNewItemMinQty(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1 col-span-2">
                        <Label className="text-xs">Location</Label>
                        <Input
                          value={newItemLocation}
                          onChange={(e) => setNewItemLocation(e.target.value)}
                          placeholder="e.g., Shelf A3"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {isSingle && firstRequest?.inventory_id && (
              <Alert>
                <Package className="h-4 w-4" />
                <AlertDescription>
                  Linked to inventory item: <strong>{firstRequest.inventory?.name || firstRequest.part_name}</strong>
                  {firstRequest.inventory?.quantity !== undefined && (
                    <span className="ml-2 text-muted-foreground">
                      (Current stock: {firstRequest.inventory.quantity})
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Quotes Upload */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Quotes</Label>
                <Button type="button" variant="outline" size="sm" onClick={addQuoteSlot}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add Quote
                </Button>
              </div>

              {quoteFiles.length === 0 && (
                <div className="text-sm text-muted-foreground border border-dashed rounded-lg p-6 text-center">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                  <p>No quotes added yet. Click "Add Quote" to upload price quotations.</p>
                </div>
              )}

              {quoteFiles.map((q, index) => (
                <div key={index} className="border rounded-lg p-3 space-y-2 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">
                      Quote {index + 1}
                    </Badge>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeQuoteSlot(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Vendor Name</Label>
                      <Input
                        placeholder="Vendor"
                        value={q.vendorName}
                        onChange={(e) => updateQuoteVendor(index, e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Price</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={q.price}
                        onChange={(e) => updateQuotePrice(index, e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">File (PDF, JPG, PNG — max 5MB)</Label>
                    {q.file ? (
                      <div className="flex items-center gap-2 text-sm p-2 bg-green-50 dark:bg-green-950/20 rounded">
                        <FileText className="h-4 w-4 text-green-600" />
                        <span className="truncate">{q.file.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const updated = [...quoteFiles];
                            updated[index] = { ...updated[index], file: null as unknown as File };
                            setQuoteFiles(updated);
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <Input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) updateQuoteFile(index, file);
                        }}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !irNumber.trim()}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {requests.length === 1
                ? "Create IR & Start Procurement"
                : `Create IR for ${requests.length} Items`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <InventorySearchDialog
        open={showInventorySearch}
        onOpenChange={setShowInventorySearch}
        onSelect={handleInventorySelect}
      />
    </>
  );
}
