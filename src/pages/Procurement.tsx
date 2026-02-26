import InventoryPanel from "@/components/InventoryPanel";
import Layout from "@/components/Layout";
import
  {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
  } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import
  {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
  } from "@/components/ui/dialog";
import
  {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
  } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
/* ScrollArea used in Cash Manager tab */
import { ScrollArea } from "@/components/ui/scroll-area";
import
  {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "@/components/ui/select";
import
  {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import
  {
    type LowStockItem,
    type PartsRequest,
    useAllocateToJobCard,
    useAssignVendor,
    useCashManagerRequests,
    useCreateProcurementRequest,
    useCreateReplenishmentRequest,
    useDeleteProcurementRequest,
    useLowStockItems,
    useMarkAsOrdered,
    useMarkAsReceived,
    useOpenRequests,
    useProcurementRequests,
    useProcurementStats,
    useReceiveOrder,
    useUpdateCashManagerApproval,
    useUpdateProcurementRequest,
    useUpdateRequestStatus,
    useUpdateSageRequisition,
    useMoveBackToRequests,
    useUpdateUrgencyLevel,
    useVendors
  } from "@/hooks/useProcurement";
import StartProcurementDialog from "@/components/dialogs/StartProcurementDialog";
import EditCashManagerItemDialog from "@/components/dialogs/EditCashManagerItemDialog";
import { formatDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import
  {
    AlertOctagon,
    AlertTriangle,
    BookOpen,
    Check,
    CheckCircle,
    ChevronDown,
    ChevronRight,
    Clock,
    CreditCard,
    DollarSign,
    Download,
    Edit,
    FileDown,
    FileSpreadsheet,
    FileText,
    Loader2,
    MoreHorizontal,
    Package,
    PackagePlus,
    Plus,
    RotateCcw,
    ShoppingBag,
    ShoppingCart,
    Store,
    Trash2,
    Truck,
    Wrench,
    X
  } from "lucide-react";
import React, { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const Procurement = () => {
  const { data: allRequests = [], isLoading: loadingRequests } = useProcurementRequests();
  const { data: openRequests = [] } = useOpenRequests();
  const { data: cashManagerRequests = [] } = useCashManagerRequests();
  const { data: lowStockItems = [], isLoading: loadingLowStock } = useLowStockItems();
  const { data: vendors = [] } = useVendors();
  const { data: stats } = useProcurementStats();

  const createRequest = useCreateProcurementRequest();
  const updateStatus = useUpdateRequestStatus();
  const assignVendor = useAssignVendor();
  const receiveOrder = useReceiveOrder();
  const createReplenishment = useCreateReplenishmentRequest();
  const updateRequest = useUpdateProcurementRequest();
  const deleteRequest = useDeleteProcurementRequest();
  const updateSageRequisition = useUpdateSageRequisition();
  const updateCashManager = useUpdateCashManagerApproval();
  const markAsOrdered = useMarkAsOrdered();
  const markAsReceived = useMarkAsReceived();
  const allocateToJobCard = useAllocateToJobCard();
  const updateUrgencyLevel = useUpdateUrgencyLevel();
  const moveBackToRequests = useMoveBackToRequests();

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [assignVendorDialogOpen, setAssignVendorDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [replenishDialogOpen, setReplenishDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sageDialogOpen, setSageDialogOpen] = useState(false);
  const [startProcurementDialogOpen, setStartProcurementDialogOpen] = useState(false);
  const [expandedIRs, setExpandedIRs] = useState<Set<string>>(new Set());
  const [selectedRequestIds, setSelectedRequestIds] = useState<Set<string>>(new Set());
  const [cashManagerDialogOpen, setCashManagerDialogOpen] = useState(false);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [receiveDialogOpen, setReceiveDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [editCashManagerOpen, setEditCashManagerOpen] = useState(false);
  const [editCashManagerRequest, setEditCashManagerRequest] = useState<PartsRequest | null>(null);
  const [moveBackDialogOpen, setMoveBackDialogOpen] = useState(false);
  const [moveBackRequest, setMoveBackRequest] = useState<PartsRequest | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<PartsRequest | null>(null);
  const [selectedLowStockItem, setSelectedLowStockItem] = useState<LowStockItem | null>(null);

  // Restock selection states
  const [selectedRestockItems, setSelectedRestockItems] = useState<Set<string>>(new Set());
  const [restockPriorities, setRestockPriorities] = useState<Record<string, string>>({});

  // Status filters — separate per tab so they don't interfere with each other
  const [allRequestsFilter, setAllRequestsFilter] = useState<string>("all");
  const [cmStatusFilter, setCmStatusFilter] = useState<string>("all");

  // Priority options
  type PriorityLevel = "urgent" | "2-weeks" | "4-weeks";
  const PRIORITY_OPTIONS: { value: PriorityLevel; label: string; color: string }[] = [
    { value: "urgent", label: "Urgent", color: "bg-red-500" },
    { value: "2-weeks", label: "Within 2 weeks", color: "bg-orange-500" },
    { value: "4-weeks", label: "Within 4 weeks", color: "bg-blue-500" },
  ];

  // Form states
  const [newRequest, setNewRequest] = useState({
    part_name: "",
    part_number: "",
    quantity: "",
    vendor_id: "",
    unit_price: "",
    notes: "",
    requested_by: "",
  });
  const [editForm, setEditForm] = useState({
    part_name: "",
    part_number: "",
    quantity: "",
    vendor_id: "",
    unit_price: "",
    notes: "",
    requested_by: "",
  });
  const [vendorAssignment, setVendorAssignment] = useState({
    vendor_id: "",
    unit_price: "",
    expected_delivery_date: "",
    ordered_by: "",
  });
  const [rejectionReason, setRejectionReason] = useState("");
  const [replenishQuantity, setReplenishQuantity] = useState("");
  const [replenishVendorId, setReplenishVendorId] = useState("");
  const [sageForm, setSageForm] = useState({
    sage_requisition_number: "",
    sage_requisition_by: "",
  });
  const [cashManagerForm, setCashManagerForm] = useState({
    cash_manager_reference: "",
    cash_manager_approved_by: "",
  });
  const [receiveForm, setReceiveForm] = useState({
    received_quantity: "",
    received_by: "",
  });

  // Handlers
  const handleCreateRequest = async () => {
    if (!newRequest.part_name || !newRequest.quantity) return;

    await createRequest.mutateAsync({
      part_name: newRequest.part_name,
      part_number: newRequest.part_number || undefined,
      quantity: parseInt(newRequest.quantity),
      vendor_id: newRequest.vendor_id || undefined,
      unit_price: newRequest.unit_price ? parseFloat(newRequest.unit_price) : undefined,
      notes: newRequest.notes || undefined,
      requested_by: newRequest.requested_by || undefined,
    });

    setCreateDialogOpen(false);
    setNewRequest({
      part_name: "",
      part_number: "",
      quantity: "",
      vendor_id: "",
      unit_price: "",
      notes: "",
      requested_by: "",
    });
  };

  const _handleApprove = async (request: PartsRequest) => {
    await updateStatus.mutateAsync({
      id: request.id,
      status: "approved",
      approved_by: "System User", // In real app, get from auth context
    });
  };

  const handleReject = async () => {
    if (!selectedRequest || !rejectionReason) return;

    await updateStatus.mutateAsync({
      id: selectedRequest.id,
      status: "rejected",
      approved_by: "System User",
      rejection_reason: rejectionReason,
    });

    setRejectDialogOpen(false);
    setSelectedRequest(null);
    setRejectionReason("");
  };

  const handleAssignVendor = async () => {
    if (!selectedRequest || !vendorAssignment.vendor_id) return;

    await assignVendor.mutateAsync({
      requestId: selectedRequest.id,
      vendorId: vendorAssignment.vendor_id,
      unitPrice: vendorAssignment.unit_price ? parseFloat(vendorAssignment.unit_price) : undefined,
    });

    setAssignVendorDialogOpen(false);
    setSelectedRequest(null);
    setVendorAssignment({ vendor_id: "", unit_price: "", expected_delivery_date: "", ordered_by: "" });
  };

  const _handleReceive = async (request: PartsRequest) => {
    await receiveOrder.mutateAsync({
      requestId: request.id,
      updateInventory: true,
    });
  };

  const handleReplenish = async () => {
    if (!selectedLowStockItem) return;

    await createReplenishment.mutateAsync({
      ...selectedLowStockItem,
      quantity_to_order: replenishQuantity ? parseInt(replenishQuantity) : undefined,
      vendor_id: replenishVendorId || undefined,
    });

    setReplenishDialogOpen(false);
    setSelectedLowStockItem(null);
    setReplenishQuantity("");
    setReplenishVendorId("");
  };

  const _openRejectDialog = (request: PartsRequest) => {
    setSelectedRequest(request);
    setRejectDialogOpen(true);
  };

  const _openAssignVendorDialog = (request: PartsRequest) => {
    setSelectedRequest(request);
    setVendorAssignment({
      vendor_id: request.vendor_id || "",
      unit_price: request.unit_price?.toString() || "",
      expected_delivery_date: request.expected_delivery_date || "",
      ordered_by: "",
    });
    setAssignVendorDialogOpen(true);
  };

  const openReplenishDialog = (item: LowStockItem) => {
    setSelectedLowStockItem(item);
    setReplenishQuantity(item.shortage.toString());
    setReplenishDialogOpen(true);
  };

  // New handlers for edit, delete, and workflow
  const openEditDialog = (request: PartsRequest) => {
    setSelectedRequest(request);
    setEditForm({
      part_name: request.part_name,
      part_number: request.part_number || "",
      quantity: request.quantity.toString(),
      vendor_id: request.vendor_id || "",
      unit_price: request.unit_price?.toString() || "",
      notes: request.notes || "",
      requested_by: request.requested_by || "",
    });
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (request: PartsRequest) => {
    setSelectedRequest(request);
    setDeleteDialogOpen(true);
  };

  const openDetailDialog = (request: PartsRequest) => {
    setSelectedRequest(request);
    setDetailDialogOpen(true);
  };

  const openSageDialog = (request: PartsRequest) => {
    setSelectedRequest(request);
    setSageForm({
      sage_requisition_number: request.sage_requisition_number || "",
      sage_requisition_by: "",
    });
    setSageDialogOpen(true);
  };

  const openCashManagerDialog = (request: PartsRequest) => {
    setSelectedRequest(request);
    setCashManagerForm({
      cash_manager_reference: request.cash_manager_reference || "",
      cash_manager_approved_by: "",
    });
    setCashManagerDialogOpen(true);
  };

  const openOrderDialog = (request: PartsRequest) => {
    setSelectedRequest(request);
    setVendorAssignment({
      vendor_id: request.vendor_id || "",
      unit_price: request.unit_price?.toString() || "",
      expected_delivery_date: "",
      ordered_by: "",
    });
    setOrderDialogOpen(true);
  };

  const openReceiveDialog = (request: PartsRequest) => {
    setSelectedRequest(request);
    setReceiveForm({
      received_quantity: request.quantity.toString(),
      received_by: "",
    });
    setReceiveDialogOpen(true);
  };

  const handleEditRequest = async () => {
    if (!selectedRequest || !editForm.part_name || !editForm.quantity) return;

    await updateRequest.mutateAsync({
      id: selectedRequest.id,
      part_name: editForm.part_name,
      part_number: editForm.part_number || null,
      quantity: parseInt(editForm.quantity),
      vendor_id: editForm.vendor_id || null,
      unit_price: editForm.unit_price ? parseFloat(editForm.unit_price) : null,
      notes: editForm.notes || null,
      requested_by: editForm.requested_by || null,
    });

    setEditDialogOpen(false);
    setSelectedRequest(null);
  };

  const handleDeleteRequest = async () => {
    if (!selectedRequest) return;

    await deleteRequest.mutateAsync(selectedRequest.id);

    setDeleteDialogOpen(false);
    setSelectedRequest(null);
  };

  const handleSageRequisition = async () => {
    if (!selectedRequest || !sageForm.sage_requisition_number) return;

    await updateSageRequisition.mutateAsync({
      id: selectedRequest.id,
      sage_requisition_number: sageForm.sage_requisition_number,
      sage_requisition_by: sageForm.sage_requisition_by || undefined,
    });

    setSageDialogOpen(false);
    setSelectedRequest(null);
    setSageForm({ sage_requisition_number: "", sage_requisition_by: "" });
  };

  const handleCashManagerApproval = async () => {
    if (!selectedRequest || !cashManagerForm.cash_manager_reference) return;

    await updateCashManager.mutateAsync({
      id: selectedRequest.id,
      cash_manager_reference: cashManagerForm.cash_manager_reference,
      cash_manager_approved_by: cashManagerForm.cash_manager_approved_by || undefined,
    });

    setCashManagerDialogOpen(false);
    setSelectedRequest(null);
    setCashManagerForm({ cash_manager_reference: "", cash_manager_approved_by: "" });
  };

  const handlePlaceOrder = async () => {
    if (!selectedRequest || !vendorAssignment.vendor_id) return;

    await markAsOrdered.mutateAsync({
      id: selectedRequest.id,
      vendor_id: vendorAssignment.vendor_id,
      unit_price: vendorAssignment.unit_price ? parseFloat(vendorAssignment.unit_price) : undefined,
      expected_delivery_date: vendorAssignment.expected_delivery_date || undefined,
      ordered_by: vendorAssignment.ordered_by || undefined,
    });

    setOrderDialogOpen(false);
    setSelectedRequest(null);
    setVendorAssignment({ vendor_id: "", unit_price: "", expected_delivery_date: "", ordered_by: "" });
  };

  const handleReceiveOrder = async () => {
    if (!selectedRequest) return;

    await markAsReceived.mutateAsync({
      id: selectedRequest.id,
      received_quantity: receiveForm.received_quantity ? parseInt(receiveForm.received_quantity) : undefined,
      received_by: receiveForm.received_by || undefined,
      updateInventory: !!selectedRequest.inventory_id,
    });

    setReceiveDialogOpen(false);
    setSelectedRequest(null);
    setReceiveForm({ received_quantity: "", received_by: "" });
  };

  // Lead time calculation helper
  const calculateLeadTime = (startDate: string | null, endDate: string | null): { days: number; hours: number; formatted: string } | null => {
    if (!startDate || !endDate) return null;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffMs = end.getTime() - start.getTime();
    if (diffMs < 0) return null;

    const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;

    let formatted = '';
    if (days > 0) {
      formatted = `${days} day${days !== 1 ? 's' : ''}`;
      if (hours > 0) formatted += ` ${hours}h`;
    } else if (hours > 0) {
      formatted = `${hours} hour${hours !== 1 ? 's' : ''}`;
    } else {
      formatted = 'Less than 1 hour';
    }

    return { days, hours, formatted };
  };

  // Get lead time from order to receipt (or from request to receipt if not ordered)
  const getLeadTime = (request: PartsRequest) => {
    if (!request.received_date) return null;
    // Prefer time from order to receipt if available, otherwise from request to receipt
    const startDate = request.ordered_at || request.created_at;
    return calculateLeadTime(startDate, request.received_date);
  };

  // Get total procurement time (from request to receipt)
  const getTotalProcurementTime = (request: PartsRequest) => {
    if (!request.received_date || !request.created_at) return null;
    return calculateLeadTime(request.created_at, request.received_date);
  };

  // Workflow status helper
  const getWorkflowStatus = (request: PartsRequest) => {
    const steps = [
      { label: "Requested", date: request.created_at, completed: true },
      { label: "IR Created", date: request.sage_requisition_date, completed: !!request.sage_requisition_date || !!request.ir_number },
      { label: "Cash Manager", date: request.cash_manager_approval_date, completed: !!request.cash_manager_approval_date },
      { label: "Ordered", date: request.ordered_at, completed: !!request.ordered_at },
      { label: "Received", date: request.received_date, completed: !!request.received_date },
    ];
    return steps;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
      pending: { color: "bg-yellow-500", icon: <Clock className="h-3 w-3 mr-1" /> },
      approved: { color: "bg-blue-500", icon: <Check className="h-3 w-3 mr-1" /> },
      ordered: { color: "bg-purple-500", icon: <ShoppingCart className="h-3 w-3 mr-1" /> },
      received: { color: "bg-green-500", icon: <CheckCircle className="h-3 w-3 mr-1" /> },
      rejected: { color: "bg-red-500", icon: <X className="h-3 w-3 mr-1" /> },
      fulfilled: { color: "bg-green-500", icon: <CheckCircle className="h-3 w-3 mr-1" /> },
    };

    const config = statusConfig[status.toLowerCase()] || statusConfig.pending;

    return (
      <Badge className={config.color}>
        {config.icon}
        {status}
      </Badge>
    );
  };

  // Filter open requests by source
  const jobCardRequests = openRequests.filter(r => r.job_card_id);
  const lowStockRequests = openRequests.filter(r => !r.job_card_id && r.is_from_inventory && r.inventory_id);
  const manualRequests = openRequests.filter(r => !r.job_card_id && !(r.is_from_inventory && r.inventory_id));

  // Handle allocate to job card
  const handleAllocateToJobCard = async (request: PartsRequest) => {
    await allocateToJobCard.mutateAsync(request.id);
  };

  // Open start procurement dialog
  const openStartProcurementDialog = (request: PartsRequest) => {
    setSelectedRequest(request);
    setSelectedRequestIds(new Set());
    setStartProcurementDialogOpen(true);
  };

  // Multi-select helpers
  const toggleRequestSelection = (id: string) => {
    setSelectedRequestIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleAllInSection = (sectionRequests: PartsRequest[]) => {
    const allSelected = sectionRequests.every(r => selectedRequestIds.has(r.id));
    setSelectedRequestIds(prev => {
      const next = new Set(prev);
      sectionRequests.forEach(r => allSelected ? next.delete(r.id) : next.add(r.id));
      return next;
    });
  };
  const selectedRequests = openRequests.filter(r => selectedRequestIds.has(r.id));
  const openBulkProcurementDialog = () => {
    setSelectedRequest(null);
    setStartProcurementDialogOpen(true);
  };

  // Group cash manager requests by IR number for collapsible view
  const filteredCashManager = cmStatusFilter === "all"
    ? cashManagerRequests
    : cashManagerRequests.filter(r => r.status.toLowerCase() === cmStatusFilter);

  const irGroups = useMemo(() => {
    const groups = new Map<string, PartsRequest[]>();
    for (const req of filteredCashManager) {
      const irKey = req.ir_number || req.sage_requisition_number || `ungrouped-${req.id}`;
      if (!groups.has(irKey)) groups.set(irKey, []);
      groups.get(irKey)!.push(req);
    }
    return groups;
  }, [filteredCashManager]);

  const toggleIR = (irKey: string) => {
    setExpandedIRs(prev => {
      const next = new Set(prev);
      if (next.has(irKey)) next.delete(irKey); else next.add(irKey);
      return next;
    });
  };

  const getGroupWorkflowStep = (items: PartsRequest[]) => {
    const allAllocated = items.every(r => r.allocated_to_job_card);
    const allReceived = items.every(r => r.received_date);
    const allOrdered = items.every(r => r.ordered_at);
    const allApproved = items.every(r => r.cash_manager_approval_date);

    if (allAllocated) return { label: "Fulfilled", variant: "default" as const };
    if (allReceived) return { label: "Received", variant: "default" as const };
    if (allOrdered) return { label: "Ordered", variant: "outline" as const };
    if (allApproved) return { label: "Approved", variant: "outline" as const };
    return { label: "Awaiting Approval", variant: "secondary" as const };
  };

  // Filtered requests for All Requests tab
  const filteredRequests = allRequestsFilter === "all"
    ? allRequests
    : allRequests.filter(r => r.status.toLowerCase() === allRequestsFilter);

  // Restock item selection handlers
  const toggleRestockItem = (itemId: string) => {
    setSelectedRestockItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const toggleAllRestockItems = () => {
    if (selectedRestockItems.size === lowStockItems.length) {
      setSelectedRestockItems(new Set());
    } else {
      setSelectedRestockItems(new Set(lowStockItems.map((item) => item.id)));
    }
  };

  const setRestockPriority = (itemId: string, priority: PriorityLevel) => {
    setRestockPriorities((prev) => ({
      ...prev,
      [itemId]: priority,
    }));
  };

  const getPriorityBadge = (priority?: string) => {
    const option = PRIORITY_OPTIONS.find((p) => p.value === priority);
    if (!option) return null;
    return (
      <Badge className={`${option.color} text-white`}>
        {option.label}
      </Badge>
    );
  };

  // Export selected restock items to Excel
  const exportRestockToExcel = () => {
    const selectedItems = lowStockItems.filter((item) =>
      selectedRestockItems.has(item.id)
    );

    if (selectedItems.length === 0) return;

    const worksheetData = selectedItems.map((item) => ({
      "Item Name": item.name,
      "Part Number": item.part_number,
      "Category": item.category || "-",
      "Current Stock": item.quantity,
      "Minimum Required": item.min_quantity,
      "Shortage": item.shortage,
      "Priority": PRIORITY_OPTIONS.find((p) => p.value === restockPriorities[item.id])?.label || "Not Set",
      "Unit Price": item.unit_price ? `$${item.unit_price.toFixed(2)}` : "-",
      "Supplier": item.supplier || "-",
      "Location": item.location || "-",
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);

    // Set column widths
    worksheet["!cols"] = [
      { wch: 30 }, // Item Name
      { wch: 15 }, // Part Number
      { wch: 15 }, // Category
      { wch: 14 }, // Current Stock
      { wch: 16 }, // Minimum Required
      { wch: 10 }, // Shortage
      { wch: 16 }, // Priority
      { wch: 12 }, // Unit Price
      { wch: 20 }, // Supplier
      { wch: 15 }, // Location
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Restock Requests");
    XLSX.writeFile(
      workbook,
      `Procurement_Restock_Requests_${new Date().toISOString().split("T")[0]}.xlsx`
    );
  };

  // Export All Requests to Excel
  const exportAllRequestsToExcel = () => {
    if (filteredRequests.length === 0) return;

    const worksheetData = filteredRequests.map((request) => ({
      "Part Name": request.part_name,
      "Part Number": request.part_number || "-",
      "Quantity": request.quantity,
      "Unit Price": request.unit_price ? `$${request.unit_price.toFixed(2)}` : "-",
      "Total Price": request.total_price ? `$${request.total_price.toFixed(2)}` : "-",
      "Vendor": request.vendor?.vendor_name || "-",
      "Status": request.status,
      "Sage Req #": request.sage_requisition_number || "-",
      "Cash Manager Ref": request.cash_manager_reference || "-",
      "Ordered Date": request.ordered_at ? formatDate(request.ordered_at) : "-",
      "Received Date": request.received_date ? formatDate(request.received_date) : "-",
      "Requested By": request.requested_by || "-",
      "Job Card": request.job_card?.job_number || "-",
      "Notes": request.notes || "-",
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    worksheet["!cols"] = [
      { wch: 30 }, { wch: 15 }, { wch: 10 }, { wch: 12 }, { wch: 12 },
      { wch: 20 }, { wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 14 },
      { wch: 14 }, { wch: 15 }, { wch: 12 }, { wch: 30 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "All Requests");
    XLSX.writeFile(workbook, `Procurement_All_Requests_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  // Export All Requests to PDF
  const exportAllRequestsToPDF = () => {
    if (filteredRequests.length === 0) return;

    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(16);
    doc.text("Procurement Requests", 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);

    autoTable(doc, {
      startY: 28,
      head: [["Part Name", "Part #", "Qty", "Price", "Vendor", "Status", "Sage Ref", "Ordered", "Received"]],
      body: filteredRequests.map((r) => [
        r.part_name,
        r.part_number || "-",
        r.quantity,
        r.total_price ? `$${r.total_price.toFixed(2)}` : "-",
        r.vendor?.vendor_name || "-",
        r.status,
        r.sage_requisition_number || "-",
        r.ordered_at ? formatDate(r.ordered_at) : "-",
        r.received_date ? formatDate(r.received_date) : "-",
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    doc.save(`Procurement_All_Requests_${new Date().toISOString().split("T")[0]}.pdf`);
  };

  // Export Pending Requests to Excel
  const _exportPendingRequestsToExcel = () => {
    if (openRequests.length === 0) return;

    const worksheetData = openRequests.map((request) => ({
      "Part Name": request.part_name,
      "Part Number": request.part_number || "-",
      "Quantity": request.quantity,
      "Unit Price": request.unit_price ? `$${request.unit_price.toFixed(2)}` : "-",
      "Total Price": request.total_price ? `$${request.total_price.toFixed(2)}` : "-",
      "Vendor": request.vendor?.vendor_name || "-",
      "Status": request.status,
      "Source": request.job_card_id ? "Job Card" : "Manual",
      "Job Card": request.job_card?.job_number || "-",
      "Requested By": request.requested_by || "-",
      "Date Requested": request.created_at ? formatDate(request.created_at) : "-",
      "Notes": request.notes || "-",
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    worksheet["!cols"] = [
      { wch: 30 }, { wch: 15 }, { wch: 10 }, { wch: 12 }, { wch: 12 },
      { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 15 },
      { wch: 14 }, { wch: 30 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Pending Requests");
    XLSX.writeFile(workbook, `Procurement_Pending_Requests_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  // Export Pending Requests to PDF
  const _exportPendingRequestsToPDF = () => {
    if (openRequests.length === 0) return;

    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(16);
    doc.text("Pending Procurement Requests", 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);

    autoTable(doc, {
      startY: 28,
      head: [["Part Name", "Part #", "Qty", "Price", "Vendor", "Source", "Job Card", "Requested By", "Date"]],
      body: openRequests.map((r) => [
        r.part_name,
        r.part_number || "-",
        r.quantity,
        r.total_price ? `$${r.total_price.toFixed(2)}` : "-",
        r.vendor?.vendor_name || "-",
        r.job_card_id ? "Job Card" : "Manual",
        r.job_card?.job_number || "-",
        r.requested_by || "-",
        r.created_at ? formatDate(r.created_at) : "-",
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [234, 179, 8] },
    });

    doc.save(`Procurement_Pending_Requests_${new Date().toISOString().split("T")[0]}.pdf`);
  };

  // Export Low Stock Items to Excel
  const exportLowStockToExcel = () => {
    if (lowStockItems.length === 0) return;

    const worksheetData = lowStockItems.map((item) => ({
      "Item Name": item.name,
      "Part Number": item.part_number,
      "Category": item.category || "-",
      "Current Stock": item.quantity,
      "Minimum Required": item.min_quantity,
      "Shortage": item.shortage,
      "Unit Price": item.unit_price ? `$${item.unit_price.toFixed(2)}` : "-",
      "Supplier": item.supplier || "-",
      "Location": item.location || "-",
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    worksheet["!cols"] = [
      { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 14 },
      { wch: 16 }, { wch: 10 }, { wch: 12 }, { wch: 20 }, { wch: 15 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Low Stock Items");
    XLSX.writeFile(workbook, `Procurement_Low_Stock_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  // Export Low Stock Items to PDF
  const exportLowStockToPDF = () => {
    if (lowStockItems.length === 0) return;

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Low Stock Items Report", 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);
    doc.text(`Total Items Below Minimum: ${lowStockItems.length}`, 14, 28);

    autoTable(doc, {
      startY: 34,
      head: [["Item Name", "Part #", "Current", "Minimum", "Shortage", "Supplier"]],
      body: lowStockItems.map((item) => [
        item.name,
        item.part_number,
        item.quantity,
        item.min_quantity,
        `-${item.shortage}`,
        item.supplier || "-",
      ]),
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [239, 68, 68] },
    });

    doc.save(`Procurement_Low_Stock_${new Date().toISOString().split("T")[0]}.pdf`);
  };

  // Export Restock Items to PDF
  const exportRestockToPDF = () => {
    const selectedItems = lowStockItems.filter((item) => selectedRestockItems.has(item.id));
    if (selectedItems.length === 0) return;

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Restock Request", 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);
    doc.text(`Items Selected: ${selectedItems.length}`, 14, 28);

    autoTable(doc, {
      startY: 34,
      head: [["Item Name", "Part #", "Current", "Shortage", "Priority", "Supplier"]],
      body: selectedItems.map((item) => [
        item.name,
        item.part_number,
        item.quantity,
        `-${item.shortage}`,
        PRIORITY_OPTIONS.find((p) => p.value === restockPriorities[item.id])?.label || "Not Set",
        item.supplier || "-",
      ]),
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    doc.save(`Procurement_Restock_Requests_${new Date().toISOString().split("T")[0]}.pdf`);
  };

  // ── Cash Manager urgency helpers ────────────────────────────────────────

  type UrgencyLevel = "urgent" | "1-week" | "2-weeks" | null;

  const URGENCY_OPTIONS: { value: UrgencyLevel; label: string; color: string; bg: string }[] = [
    { value: "urgent",  label: "Urgent",   color: "text-red-700",    bg: "bg-red-100 dark:bg-red-950/30" },
    { value: "1-week",  label: "1 Week",   color: "text-orange-700", bg: "bg-orange-100 dark:bg-orange-950/30" },
    { value: "2-weeks", label: "2 Weeks",  color: "text-yellow-700", bg: "bg-yellow-100 dark:bg-yellow-950/30" },
  ];

  const isEffectivelyUrgent = (req: PartsRequest): boolean => {
    if (req.urgency_level === "urgent") return true;
    if (req.urgency_level === "1-week" && req.created_at) {
      const diffMs = Date.now() - new Date(req.created_at).getTime();
      return diffMs >= 7 * 24 * 60 * 60 * 1000;
    }
    return false;
  };

  const getEffectiveUrgencyLevel = (req: PartsRequest): UrgencyLevel => {
    if (isEffectivelyUrgent(req)) return "urgent";
    return (req.urgency_level ?? null) as UrgencyLevel;
  };

  const getUrgencyBadge = (req: PartsRequest) => {
    const level = getEffectiveUrgencyLevel(req);
    if (!level) return null;
    const opt = URGENCY_OPTIONS.find((o) => o.value === level);
    if (!opt) return null;
    const autoEscalated = level === "urgent" && req.urgency_level !== "urgent";
    return (
      <Badge className={`text-[10px] px-1.5 py-0 ${opt.bg} ${opt.color} border-0`}>
        {level === "urgent" && <AlertOctagon className="h-2.5 w-2.5 mr-1 inline" />}
        {opt.label}{autoEscalated ? " ↑" : ""}
      </Badge>
    );
  };

  // Export Cash Manager to Excel
  const exportCashManagerToExcel = (urgentOnly = false) => {
    const today = new Date().toISOString().split("T")[0];
    const source = urgentOnly
      ? cashManagerRequests.filter(isEffectivelyUrgent)
      : cashManagerRequests;
    if (source.length === 0) return;

    const rows = source.map((r) => ({
      "IR Number":        r.ir_number || "-",
      "Part Name":        r.part_name,
      "Part Number":      r.part_number || "-",
      "Quantity":         r.quantity,
      "Unit Price":       r.unit_price != null ? r.unit_price : "-",
      "Total Price":      r.total_price != null ? r.total_price : "-",
      "Vendor":           r.vendor?.vendor_name || "-",
      "Job Card":         r.job_card?.job_number || "-",
      "Fleet Number":     (r.job_card as { vehicle?: { fleet_number?: string } } | undefined)?.vehicle?.fleet_number || "-",
      "Urgency":          getEffectiveUrgencyLevel(r) ?? "Not Set",
      "Status":           r.status,
      "CM Reference":     r.cash_manager_reference || "-",
      "CM Approval Date": r.cash_manager_approval_date ? formatDate(r.cash_manager_approval_date) : "-",
      "Ordered Date":     r.ordered_at ? formatDate(r.ordered_at) : "-",
      "Received Date":    r.received_date ? formatDate(r.received_date) : "-",
      "Notes":            r.notes || "-",
    }));

    const ws = XLSX.utils.json_to_sheet([]);
    // Title rows
    XLSX.utils.sheet_add_aoa(ws, [
      ["Car Craft Co — Fleet Management System"],
      [urgentOnly ? "Cash Manager — Urgent Items Only" : "Cash Manager — All Procurement Items"],
      [`Generated: ${new Date().toLocaleString()}`],
      [],
    ]);
    XLSX.utils.sheet_add_json(ws, rows, { origin: "A5" });
    ws["!cols"] = [
      { wch: 18 }, { wch: 30 }, { wch: 15 }, { wch: 8 }, { wch: 12 }, { wch: 12 },
      { wch: 22 }, { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 12 }, { wch: 18 },
      { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 30 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, urgentOnly ? "Urgent Items" : "Cash Manager");
    XLSX.writeFile(wb, `CashManager_${urgentOnly ? "Urgent_" : ""}${today}.xlsx`);
  };

  // Export Cash Manager to PDF
  const exportCashManagerToPDF = (urgentOnly = false) => {
    const today = new Date().toISOString().split("T")[0];
    const source = urgentOnly
      ? cashManagerRequests.filter(isEffectivelyUrgent)
      : cashManagerRequests;
    if (source.length === 0) return;

    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(18);
    doc.text("Car Craft Co — Fleet Management System", 14, 14);
    doc.setFontSize(12);
    doc.text(urgentOnly ? "Cash Manager — Urgent Items Only" : "Cash Manager — All Procurement Items", 14, 22);
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleString()}    Total items: ${source.length}`, 14, 28);

    autoTable(doc, {
      startY: 34,
      head: [[
        "IR #", "Part Name", "Part #", "Qty", "Vendor",
        "Job Card", "Fleet", "Urgency", "Status", "CM Ref", "Ordered", "Received"
      ]],
      body: source.map((r) => [
        r.ir_number || "-",
        r.part_name,
        r.part_number || "-",
        r.quantity,
        r.vendor?.vendor_name || "-",
        r.job_card?.job_number || "-",
        (r.job_card as { vehicle?: { fleet_number?: string } } | undefined)?.vehicle?.fleet_number || "-",
        getEffectiveUrgencyLevel(r) ?? "-",
        r.status,
        r.cash_manager_reference || "-",
        r.ordered_at ? formatDate(r.ordered_at) : "-",
        r.received_date ? formatDate(r.received_date) : "-",
      ]),
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: urgentOnly ? [220, 38, 38] : [59, 130, 246] },
    });

    doc.save(`CashManager_${urgentOnly ? "Urgent_" : ""}${today}.pdf`);
  };

  if (loadingRequests) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Tabs defaultValue="procurement" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="procurement" className="px-5 py-2.5 text-base">
              Procurement
            </TabsTrigger>
            <TabsTrigger value="inventory" className="px-5 py-2.5 text-base">
              Inventory
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="inventory" className="mt-0">
          <InventoryPanel />
        </TabsContent>

        <TabsContent value="procurement" className="mt-0">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Request
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{stats?.pending || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">IR Pending</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{stats?.sage_pending || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cash Mgr Pending</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{stats?.cash_manager_pending || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ordered</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{stats?.ordered || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Received</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{stats?.received || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Value</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">
                ${(stats?.pendingValue || 0).toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all" className="px-5 py-2.5 text-base gap-2">
              All Requests
              {openRequests.length > 0 && (
                <Badge variant="secondary" className="ml-1">{openRequests.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="cash-manager" className="px-5 py-2.5 text-base gap-2">
              Cash Manager
              {cashManagerRequests.length > 0 && (
                <Badge variant="secondary" className="ml-1">{cashManagerRequests.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="low-stock" className="px-5 py-2.5 text-base gap-2">
              Low Stock
              {lowStockItems.length > 0 && (
                <Badge variant="destructive" className="ml-1">{lowStockItems.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="requests" className="px-5 py-2.5 text-base gap-2">
              Restock
              {lowStockItems.length > 0 && (
                <Badge variant="secondary" className="ml-1">{lowStockItems.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* All Requests Tab - Open requests grouped by source with Start Procurement */}
          <TabsContent value="all">
            <div className="space-y-6">
              {/* Export Actions */}
              {openRequests.length > 0 && (
                <div className="flex justify-end">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={exportAllRequestsToExcel} disabled={openRequests.length === 0}>
                        <FileText className="h-4 w-4 mr-2" />
                        Export to Excel
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={exportAllRequestsToPDF} disabled={openRequests.length === 0}>
                        <FileDown className="h-4 w-4 mr-2" />
                        Export to PDF
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}

              {/* Selection Bar */}
              {selectedRequestIds.size > 0 && (
                <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <Badge variant="secondary" className="text-sm">
                    {selectedRequestIds.size} selected
                  </Badge>
                  <Button size="sm" onClick={openBulkProcurementDialog}>
                    <ShoppingBag className="h-4 w-4 mr-1" />
                    Start Procurement for Selected
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setSelectedRequestIds(new Set())}>
                    Clear Selection
                  </Button>
                </div>
              )}

              {/* Job Card Requests Section */}
              {jobCardRequests.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Job Card Requests
                    </CardTitle>
                    <CardDescription>
                      Parts, external items, and services requested through job cards
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table className="min-w-[700px]">
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-10">
                              <Checkbox
                                checked={jobCardRequests.length > 0 && jobCardRequests.every(r => selectedRequestIds.has(r.id))}
                                onCheckedChange={() => toggleAllInSection(jobCardRequests)}
                              />
                            </TableHead>
                            <TableHead>Part</TableHead>
                            <TableHead>Qty</TableHead>
                            <TableHead>Job Card</TableHead>
                            <TableHead>Requested</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {jobCardRequests.map((request) => (
                            <TableRow key={request.id} className={selectedRequestIds.has(request.id) ? "bg-blue-50/50 dark:bg-blue-950/10" : ""}>
                              <TableCell>
                                <Checkbox
                                  checked={selectedRequestIds.has(request.id)}
                                  onCheckedChange={() => toggleRequestSelection(request.id)}
                                />
                              </TableCell>
                              <TableCell>
                                <div>
                                  <div className="font-medium">{request.part_name}</div>
                                  {request.part_number && (
                                    <div className="text-xs text-muted-foreground font-mono">
                                      {request.part_number}
                                    </div>
                                  )}
                                  {request.is_service ? (
                                    <>
                                      <Badge variant="outline" className="mt-1 text-[10px] px-1.5 py-0 border-purple-500 text-purple-600">
                                        <Wrench className="h-3 w-3 mr-0.5" />
                                        Service
                                      </Badge>
                                      {request.service_description && (
                                        <div className="text-xs text-muted-foreground mt-1">
                                          {request.service_description}
                                        </div>
                                      )}
                                    </>
                                  ) : !request.is_from_inventory && !request.inventory_id ? (
                                    <>
                                      <Badge variant="outline" className="mt-1 text-[10px] px-1.5 py-0 border-orange-500 text-orange-600">
                                        <DollarSign className="h-3 w-3 mr-0.5" />
                                        External
                                      </Badge>
                                      {request.vendor && (
                                        <div className="text-xs text-muted-foreground mt-1">
                                          Vendor: {request.vendor?.vendor_name || 'Unknown'}
                                        </div>
                                      )}
                                    </>
                                  ) : request.inventory_id && request.is_from_inventory ? (
                                    request.notes?.includes('[OUT OF STOCK') ? (
                                      <Badge variant="destructive" className="mt-1 text-[10px] px-1.5 py-0">
                                        <AlertTriangle className="h-3 w-3 mr-0.5" />
                                        Short — Needs Restock
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="mt-1 text-[10px] px-1.5 py-0 border-green-500 text-green-600">
                                        <Package className="h-3 w-3 mr-0.5" />
                                        From Inventory
                                      </Badge>
                                    )
                                  ) : null}
                                </div>
                              </TableCell>
                              <TableCell className="font-mono">{request.quantity}</TableCell>
                              <TableCell>
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-1">
                                    <FileText className="h-3 w-3 text-muted-foreground" />
                                    <span className="font-mono text-sm">
                                      {request.job_card?.job_number || "—"}
                                    </span>
                                  </div>
                                  {request.job_card?.vehicle?.fleet_number && (
                                    <div className="flex items-center gap-1">
                                      <Truck className="h-3 w-3 text-muted-foreground" />
                                      <span className="text-xs text-muted-foreground font-mono">
                                        {request.job_card.vehicle.fleet_number}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {request.created_at ? formatDate(request.created_at) : "—"}
                              </TableCell>
                              <TableCell>{getStatusBadge(request.status)}</TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    onClick={() => openStartProcurementDialog(request)}
                                  >
                                    <ShoppingBag className="h-4 w-4 mr-1" />
                                    Start Procurement
                                  </Button>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => openDetailDialog(request)}>
                                        <FileText className="h-4 w-4 mr-2" />
                                        View Details
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => openEditDialog(request)}>
                                        <Edit className="h-4 w-4 mr-2" />
                                        Edit
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem onClick={() => openDeleteDialog(request)} className="text-red-600">
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Low Stock / Restock Requests Section */}
              {lowStockRequests.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-orange-500" />
                      Low Stock / Restock Requests
                    </CardTitle>
                    <CardDescription>
                      Replenishment requests for inventory items below minimum levels
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table className="min-w-[700px]">
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-10">
                              <Checkbox
                                checked={lowStockRequests.length > 0 && lowStockRequests.every(r => selectedRequestIds.has(r.id))}
                                onCheckedChange={() => toggleAllInSection(lowStockRequests)}
                              />
                            </TableHead>
                            <TableHead>Part</TableHead>
                            <TableHead>Qty</TableHead>
                            <TableHead>Inventory Item</TableHead>
                            <TableHead>Requested</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {lowStockRequests.map((request) => (
                            <TableRow key={request.id} className={selectedRequestIds.has(request.id) ? "bg-blue-50/50 dark:bg-blue-950/10" : ""}>
                              <TableCell>
                                <Checkbox
                                  checked={selectedRequestIds.has(request.id)}
                                  onCheckedChange={() => toggleRequestSelection(request.id)}
                                />
                              </TableCell>
                              <TableCell>
                                <div>
                                  <div className="font-medium">{request.part_name}</div>
                                  {request.part_number && (
                                    <div className="text-xs text-muted-foreground font-mono">
                                      {request.part_number}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="font-mono">{request.quantity}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">
                                  <Package className="h-3 w-3 mr-1" />
                                  {request.inventory?.name || "Inventory"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {request.created_at ? formatDate(request.created_at) : "—"}
                              </TableCell>
                              <TableCell>{getStatusBadge(request.status)}</TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    onClick={() => openStartProcurementDialog(request)}
                                  >
                                    <ShoppingBag className="h-4 w-4 mr-1" />
                                    Start Procurement
                                  </Button>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => openDetailDialog(request)}>
                                        <FileText className="h-4 w-4 mr-2" />
                                        View Details
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => openEditDialog(request)}>
                                        <Edit className="h-4 w-4 mr-2" />
                                        Edit
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem onClick={() => openDeleteDialog(request)} className="text-red-600">
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Manual Requests Section */}
              {manualRequests.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Manual Requests
                    </CardTitle>
                    <CardDescription>
                      Procurement requests created directly
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table className="min-w-[700px]">
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-10">
                              <Checkbox
                                checked={manualRequests.length > 0 && manualRequests.every(r => selectedRequestIds.has(r.id))}
                                onCheckedChange={() => toggleAllInSection(manualRequests)}
                              />
                            </TableHead>
                            <TableHead>Part</TableHead>
                            <TableHead>Qty</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Requested By</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {manualRequests.map((request) => (
                            <TableRow key={request.id} className={selectedRequestIds.has(request.id) ? "bg-blue-50/50 dark:bg-blue-950/10" : ""}>
                              <TableCell>
                                <Checkbox
                                  checked={selectedRequestIds.has(request.id)}
                                  onCheckedChange={() => toggleRequestSelection(request.id)}
                                />
                              </TableCell>
                              <TableCell>
                                <div>
                                  <div className="font-medium">{request.part_name}</div>
                                  {request.part_number && (
                                    <div className="text-xs text-muted-foreground font-mono">
                                      {request.part_number}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="font-mono">{request.quantity}</TableCell>
                              <TableCell className="font-mono">
                                {request.total_price
                                  ? `$${request.total_price.toLocaleString()}`
                                  : "—"
                                }
                              </TableCell>
                              <TableCell>{request.requested_by || "—"}</TableCell>
                              <TableCell>{getStatusBadge(request.status)}</TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    onClick={() => openStartProcurementDialog(request)}
                                  >
                                    <ShoppingBag className="h-4 w-4 mr-1" />
                                    Start Procurement
                                  </Button>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => openDetailDialog(request)}>
                                        <FileText className="h-4 w-4 mr-2" />
                                        View Details
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => openEditDialog(request)}>
                                        <Edit className="h-4 w-4 mr-2" />
                                        Edit
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem onClick={() => openDeleteDialog(request)} className="text-red-600">
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {openRequests.length === 0 && (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
                    <p className="text-lg font-medium">All caught up!</p>
                    <p className="text-muted-foreground">No open procurement requests</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Cash Manager Tab - Procurement workflow tracking */}
          <TabsContent value="cash-manager">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      Cash Manager — Procurement Workflow
                    </CardTitle>
                    <CardDescription>
                      Track procurement through IR → Cash Manager Approval → Order → Receive → Allocate
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={cmStatusFilter}
                      onValueChange={setCmStatusFilter}
                    >
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Filter status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="pending">Pending IR</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="ordered">Ordered</SelectItem>
                        <SelectItem value="received">Received</SelectItem>
                      </SelectContent>
                    </Select>
                    {/* Export dropdown */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-2">
                          <Download className="h-4 w-4" />
                          Export
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => exportCashManagerToExcel(false)} disabled={cashManagerRequests.length === 0}>
                          <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" />Excel — All Items
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => exportCashManagerToExcel(true)} disabled={cashManagerRequests.filter(isEffectivelyUrgent).length === 0}>
                          <FileSpreadsheet className="h-4 w-4 mr-2 text-red-600" />Excel — Urgent Only
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => exportCashManagerToPDF(false)} disabled={cashManagerRequests.length === 0}>
                          <FileDown className="h-4 w-4 mr-2 text-blue-600" />PDF — All Items
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => exportCashManagerToPDF(true)} disabled={cashManagerRequests.filter(isEffectivelyUrgent).length === 0}>
                          <FileDown className="h-4 w-4 mr-2 text-red-600" />PDF — Urgent Only
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  <Table className="min-w-[1050px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Part</TableHead>
                        <TableHead>IR #</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Workflow Progress</TableHead>
                        <TableHead>Lead Time</TableHead>
                        <TableHead>Urgency</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-[180px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Array.from(irGroups.entries()).map(([irKey, items]) => {
                        const isGroup = items.length > 1;
                        const isExpanded = expandedIRs.has(irKey);
                        const groupStep = isGroup ? getGroupWorkflowStep(items) : null;
                        const totalQty = items.reduce((sum, r) => sum + r.quantity, 0);

                        if (!isGroup) {
                          // Single-item IR – render as a normal row
                          const request = items[0];
                          return (
                            <TableRow key={request.id} className="cursor-pointer hover:bg-muted/50">
                              <TableCell onClick={() => openDetailDialog(request)}>
                                <div>
                                  <div className="font-medium">{request.part_name}</div>
                                  {request.part_number && (
                                    <div className="text-xs text-muted-foreground font-mono">{request.part_number}</div>
                                  )}
                                  {request.vendor?.vendor_name && (
                                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                      <Store className="h-3 w-3" />
                                      {request.vendor.vendor_name}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="font-mono text-sm">{request.ir_number || request.sage_requisition_number || "—"}</span>
                              </TableCell>
                              <TableCell className="font-mono">{request.quantity}</TableCell>
                              <TableCell>
                                {request.job_card_id ? (
                                  <div className="space-y-0.5">
                                    <Badge variant="outline" className="text-xs">
                                      <FileText className="h-3 w-3 mr-1" />
                                      {request.job_card?.job_number || "Job Card"}
                                    </Badge>
                                    {request.job_card?.vehicle?.fleet_number && (
                                      <div className="flex items-center gap-1">
                                        <Truck className="h-3 w-3 text-muted-foreground" />
                                        <span className="text-xs text-muted-foreground font-mono">
                                          {request.job_card.vehicle.fleet_number}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                ) : request.inventory_id ? (
                                  <Badge variant="outline" className="text-xs">
                                    <Package className="h-3 w-3 mr-1" />
                                    Restock
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="text-xs">Manual</Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium", (request.ir_number || request.sage_requisition_date) ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400")}>
                                        {(request.ir_number || request.sage_requisition_date) ? <Check className="h-3 w-3" /> : "1"}
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent><p className="font-semibold">IR Created</p>{request.ir_number ? <p>✓ IR: {request.ir_number}</p> : <p className="text-muted-foreground">Not yet submitted</p>}</TooltipContent>
                                  </Tooltip>
                                  <div className="w-4 h-0.5 bg-gray-200" />
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium", request.cash_manager_approval_date ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400")}>
                                        {request.cash_manager_approval_date ? <Check className="h-3 w-3" /> : "2"}
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent><p className="font-semibold">Cash Manager</p>{request.cash_manager_approval_date ? <><p>✓ {formatDate(request.cash_manager_approval_date)}</p><p>Ref: {request.cash_manager_reference}</p></> : <p className="text-muted-foreground">Awaiting approval</p>}</TooltipContent>
                                  </Tooltip>
                                  <div className="w-4 h-0.5 bg-gray-200" />
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium", request.ordered_at ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400")}>
                                        {request.ordered_at ? <Check className="h-3 w-3" /> : "3"}
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent><p className="font-semibold">Ordered</p>{request.ordered_at ? <><p>✓ {formatDate(request.ordered_at)}</p><p>Vendor: {request.vendor?.vendor_name || "Unknown"}</p></> : <p className="text-muted-foreground">Not yet ordered</p>}</TooltipContent>
                                  </Tooltip>
                                  <div className="w-4 h-0.5 bg-gray-200" />
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium", request.received_date ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400")}>
                                        {request.received_date ? <Check className="h-3 w-3" /> : "4"}
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent><p className="font-semibold">Received</p>{request.received_date ? <><p>✓ {formatDate(request.received_date)}</p><p>Qty: {request.received_quantity ?? request.quantity}</p></> : <p className="text-muted-foreground">Awaiting delivery</p>}</TooltipContent>
                                  </Tooltip>
                                </div>
                              </TableCell>
                              <TableCell>
                                {request.received_date ? (
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <Badge variant="outline" className={cn("text-xs", (getLeadTime(request)?.days ?? 0) <= 3 && "border-green-500 text-green-600", (getLeadTime(request)?.days ?? 0) > 3 && (getLeadTime(request)?.days ?? 0) <= 7 && "border-yellow-500 text-yellow-600", (getLeadTime(request)?.days ?? 0) > 7 && "border-red-500 text-red-600")}>
                                        <Clock className="h-3 w-3 mr-1" />
                                        {getLeadTime(request)?.formatted}
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent><p className="font-semibold">Lead Time</p><p>Total: {getTotalProcurementTime(request)?.formatted}</p></TooltipContent>
                                  </Tooltip>
                                ) : request.ordered_at ? (
                                  <Badge variant="outline" className="text-xs border-blue-500 text-blue-600">
                                    <Clock className="h-3 w-3 mr-1 animate-pulse" />
                                    {calculateLeadTime(request.ordered_at, new Date().toISOString())?.formatted || 'Pending'}
                                  </Badge>
                                ) : (
                                  <span className="text-xs text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  {getUrgencyBadge(request)}
                                  <Select
                                    value={request.urgency_level ?? "__none__"}
                                    onValueChange={(v) => updateUrgencyLevel.mutate({ id: request.id, urgency_level: v === "__none__" ? null : v })}
                                  >
                                    <SelectTrigger className="h-7 text-xs w-[88px]"><SelectValue placeholder="Set…" /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="__none__"><span className="text-muted-foreground">Not set</span></SelectItem>
                                      <SelectItem value="urgent">🔴 Urgent</SelectItem>
                                      <SelectItem value="1-week">🟠 1 Week</SelectItem>
                                      <SelectItem value="2-weeks">🟡 2 Weeks</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </TableCell>
                              <TableCell>{getStatusBadge(request.status)}</TableCell>
                              <TableCell>
                                <div className="flex gap-1 flex-wrap">
                                  {(request.ir_number || request.sage_requisition_date) && !request.cash_manager_approval_date && (
                                    <Button size="sm" variant="outline" onClick={() => openCashManagerDialog(request)}><CreditCard className="h-3 w-3 mr-1" />Approve</Button>
                                  )}
                                  {request.cash_manager_approval_date && !request.ordered_at && (
                                    <Button size="sm" variant="outline" onClick={() => openOrderDialog(request)}><ShoppingCart className="h-3 w-3 mr-1" />Order</Button>
                                  )}
                                  {request.ordered_at && !request.received_date && (
                                    <Button size="sm" variant="outline" onClick={() => openReceiveDialog(request)}><Truck className="h-3 w-3 mr-1" />Receive</Button>
                                  )}
                                  {request.received_date && request.job_card_id && !request.allocated_to_job_card && (
                                    <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleAllocateToJobCard(request)} disabled={allocateToJobCard.isPending}><CheckCircle className="h-3 w-3 mr-1" />Allocate</Button>
                                  )}
                                  {request.allocated_to_job_card && (
                                    <Badge className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Fulfilled</Badge>
                                  )}
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => openDetailDialog(request)}><FileText className="h-4 w-4 mr-2" />View Details</DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => { setEditCashManagerRequest(request); setEditCashManagerOpen(true); }}><Edit className="h-4 w-4 mr-2" />Edit IR / Vendor / Quote</DropdownMenuItem>
                                      {!request.sage_requisition_date && !request.ir_number && (
                                        <><DropdownMenuSeparator /><DropdownMenuItem onClick={() => openSageDialog(request)}><BookOpen className="h-4 w-4 mr-2" />Add IR Number</DropdownMenuItem></>
                                      )}
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem onClick={() => { setMoveBackRequest(request); setMoveBackDialogOpen(true); }}><RotateCcw className="h-4 w-4 mr-2" />Move Back to Requests</DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem onClick={() => openDeleteDialog(request)} className="text-red-600"><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        }

                        // Multi-item IR group – collapsible header + child rows
                        return (
                          <React.Fragment key={irKey}>
                            {/* Group Header Row */}
                            <TableRow
                              className="cursor-pointer bg-muted/30 hover:bg-muted/50 border-b-0"
                              onClick={() => toggleIR(irKey)}
                            >
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                                  <div>
                                    <div className="font-semibold">{items.length} items</div>
                                    <div className="text-xs text-muted-foreground">
                                      {items.map(r => r.part_name).join(", ").substring(0, 60)}
                                      {items.map(r => r.part_name).join(", ").length > 60 ? "…" : ""}
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="font-mono text-sm font-semibold">{irKey.startsWith("ungrouped-") ? "—" : irKey}</span>
                              </TableCell>
                              <TableCell className="font-mono font-semibold">{totalQty}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">
                                  <Package className="h-3 w-3 mr-1" />
                                  {items.length} items
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant={groupStep!.variant}>{groupStep!.label}</Badge>
                              </TableCell>
                              <TableCell>—</TableCell>
                              <TableCell>
                                {/* Urgency summary for group */}
                                {(() => {
                                  const urgentCount = items.filter(isEffectivelyUrgent).length;
                                  const weekCount = items.filter(r => r.urgency_level === "1-week" && !isEffectivelyUrgent(r)).length;
                                  if (urgentCount > 0) return <Badge className="text-[10px] bg-red-100 text-red-700 border-0">{urgentCount} Urgent</Badge>;
                                  if (weekCount > 0) return <Badge className="text-[10px] bg-orange-100 text-orange-700 border-0">{weekCount} × 1W</Badge>;
                                  return <span className="text-xs text-muted-foreground">—</span>;
                                })()}
                              </TableCell>
                              <TableCell>
                                <Badge variant={groupStep!.variant}>{groupStep!.label}</Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-1 flex-wrap">
                                  {/* Group-level actions: show if ANY item needs the step */}
                                  {items.some(r => (r.ir_number || r.sage_requisition_date) && !r.cash_manager_approval_date) && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); toggleIR(irKey); }}>
                                          <CreditCard className="h-3 w-3 mr-1" />Approve
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Expand to approve individual items</TooltipContent>
                                    </Tooltip>
                                  )}
                                  {items.some(r => r.cash_manager_approval_date && !r.ordered_at) && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); toggleIR(irKey); }}>
                                          <ShoppingCart className="h-3 w-3 mr-1" />Order
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Expand to place orders</TooltipContent>
                                    </Tooltip>
                                  )}
                                  {items.every(r => r.allocated_to_job_card) && (
                                    <Badge className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />All Fulfilled</Badge>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>

                            {/* Expanded child rows */}
                            {isExpanded && items.map((request) => (
                              <TableRow key={request.id} className="bg-muted/10 hover:bg-muted/20">
                                <TableCell onClick={() => openDetailDialog(request)} className="cursor-pointer">
                                  <div className="pl-6">
                                    <div className="font-medium">{request.part_name}</div>
                                    {request.part_number && (
                                      <div className="text-xs text-muted-foreground font-mono">{request.part_number}</div>
                                    )}
                                    {request.vendor?.vendor_name && (
                                      <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                        <Store className="h-3 w-3" />
                                        {request.vendor.vendor_name}
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <span className="text-xs text-muted-foreground">—</span>
                                </TableCell>
                                <TableCell className="font-mono">{request.quantity}</TableCell>
                                <TableCell>
                                  {request.job_card_id ? (
                                    <div className="space-y-0.5">
                                      <Badge variant="outline" className="text-xs">
                                        <FileText className="h-3 w-3 mr-1" />
                                        {request.job_card?.job_number || "Job Card"}
                                      </Badge>
                                      {request.job_card?.vehicle?.fleet_number && (
                                        <div className="flex items-center gap-1">
                                          <Truck className="h-3 w-3 text-muted-foreground" />
                                          <span className="text-xs text-muted-foreground font-mono">
                                            {request.job_card.vehicle.fleet_number}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  ) : request.inventory_id ? (
                                    <Badge variant="outline" className="text-xs">
                                      <Package className="h-3 w-3 mr-1" />
                                      Restock
                                    </Badge>
                                  ) : (
                                    <Badge variant="secondary" className="text-xs">Manual</Badge>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium", (request.ir_number || request.sage_requisition_date) ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400")}>
                                          {(request.ir_number || request.sage_requisition_date) ? <Check className="h-3 w-3" /> : "1"}
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent><p className="font-semibold">IR Created</p></TooltipContent>
                                    </Tooltip>
                                    <div className="w-4 h-0.5 bg-gray-200" />
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium", request.cash_manager_approval_date ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400")}>
                                          {request.cash_manager_approval_date ? <Check className="h-3 w-3" /> : "2"}
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent><p className="font-semibold">Cash Manager</p></TooltipContent>
                                    </Tooltip>
                                    <div className="w-4 h-0.5 bg-gray-200" />
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium", request.ordered_at ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400")}>
                                          {request.ordered_at ? <Check className="h-3 w-3" /> : "3"}
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent><p className="font-semibold">Ordered</p></TooltipContent>
                                    </Tooltip>
                                    <div className="w-4 h-0.5 bg-gray-200" />
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium", request.received_date ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400")}>
                                          {request.received_date ? <Check className="h-3 w-3" /> : "4"}
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent><p className="font-semibold">Received</p></TooltipContent>
                                    </Tooltip>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {request.received_date ? (
                                    <Badge variant="outline" className={cn("text-xs", (getLeadTime(request)?.days ?? 0) <= 3 && "border-green-500 text-green-600", (getLeadTime(request)?.days ?? 0) > 7 && "border-red-500 text-red-600")}>
                                      <Clock className="h-3 w-3 mr-1" />
                                      {getLeadTime(request)?.formatted}
                                    </Badge>
                                  ) : request.ordered_at ? (
                                    <Badge variant="outline" className="text-xs border-blue-500 text-blue-600">
                                      <Clock className="h-3 w-3 mr-1 animate-pulse" />
                                      {calculateLeadTime(request.ordered_at, new Date().toISOString())?.formatted || 'Pending'}
                                    </Badge>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">—</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="space-y-1">
                                    {getUrgencyBadge(request)}
                                    <Select
                                      value={request.urgency_level ?? "__none__"}
                                      onValueChange={(v) => updateUrgencyLevel.mutate({ id: request.id, urgency_level: v === "__none__" ? null : v })}
                                    >
                                      <SelectTrigger className="h-7 text-xs w-[88px]"><SelectValue placeholder="Set…" /></SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="__none__"><span className="text-muted-foreground">Not set</span></SelectItem>
                                        <SelectItem value="urgent">🔴 Urgent</SelectItem>
                                        <SelectItem value="1-week">🟠 1 Week</SelectItem>
                                        <SelectItem value="2-weeks">🟡 2 Weeks</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </TableCell>
                                <TableCell>{getStatusBadge(request.status)}</TableCell>
                                <TableCell>
                                  <div className="flex gap-1 flex-wrap">
                                    {(request.ir_number || request.sage_requisition_date) && !request.cash_manager_approval_date && (
                                      <Button size="sm" variant="outline" onClick={() => openCashManagerDialog(request)}><CreditCard className="h-3 w-3 mr-1" />Approve</Button>
                                    )}
                                    {request.cash_manager_approval_date && !request.ordered_at && (
                                      <Button size="sm" variant="outline" onClick={() => openOrderDialog(request)}><ShoppingCart className="h-3 w-3 mr-1" />Order</Button>
                                    )}
                                    {request.ordered_at && !request.received_date && (
                                      <Button size="sm" variant="outline" onClick={() => openReceiveDialog(request)}><Truck className="h-3 w-3 mr-1" />Receive</Button>
                                    )}
                                    {request.received_date && request.job_card_id && !request.allocated_to_job_card && (
                                      <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleAllocateToJobCard(request)} disabled={allocateToJobCard.isPending}><CheckCircle className="h-3 w-3 mr-1" />Allocate</Button>
                                    )}
                                    {request.allocated_to_job_card && (
                                      <Badge className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Fulfilled</Badge>
                                    )}
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => openDetailDialog(request)}><FileText className="h-4 w-4 mr-2" />View Details</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => { setEditCashManagerRequest(request); setEditCashManagerOpen(true); }}><Edit className="h-4 w-4 mr-2" />Edit IR / Vendor / Quote</DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => { setMoveBackRequest(request); setMoveBackDialogOpen(true); }}><RotateCcw className="h-4 w-4 mr-2" />Move Back to Requests</DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => openDeleteDialog(request)} className="text-red-600"><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </React.Fragment>
                        );
                      })}
                      {cashManagerRequests.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                            No items in procurement workflow yet. Start procurement from the All Requests tab.
                          </TableCell>
                        </TableRow>
                      )}
                      {cashManagerRequests.length > 0 && irGroups.size === 0 && (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                            No items match the selected filter. Change the status filter to "All Statuses" to see all {cashManagerRequests.length} item{cashManagerRequests.length !== 1 ? "s" : ""}.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Low Stock Tab */}
          <TabsContent value="low-stock">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                      Items Below Minimum Stock
                    </CardTitle>
                    <CardDescription>
                      These inventory items need to be replenished
                    </CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" disabled={lowStockItems.length === 0}>
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={exportLowStockToExcel}>
                        <FileText className="h-4 w-4 mr-2" />
                        Export to Excel
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={exportLowStockToPDF}>
                        <FileDown className="h-4 w-4 mr-2" />
                        Export to PDF
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                {loadingLowStock ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : lowStockItems.length > 0 ? (
                  <div className="overflow-x-auto">
                  <Table className="min-w-[700px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Current Stock</TableHead>
                        <TableHead className="text-right">Minimum</TableHead>
                        <TableHead className="text-right">Shortage</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lowStockItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{item.name}</div>
                              <div className="text-xs text-muted-foreground font-mono">
                                {item.part_number}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{item.category}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono text-red-600">
                            {item.quantity}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {item.min_quantity}
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-red-600">
                            -{item.shortage}
                          </TableCell>
                          <TableCell>{item.supplier || "—"}</TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              onClick={() => openReplenishDialog(item)}
                            >
                              <PackagePlus className="h-4 w-4 mr-1" />
                              Replenish
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12">
                    <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
                    <p className="text-lg font-medium">Stock Levels OK</p>
                    <p className="text-muted-foreground">All items are above minimum levels</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Requests Tab - For restock items with checkboxes and priorities */}
          <TabsContent value="requests">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <ShoppingBag className="h-5 w-5 text-primary" />
                      Restock Requests
                    </CardTitle>
                    <CardDescription>
                      Select items to request restock, assign priority levels, and export for processing
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedRestockItems.size > 0 && (
                      <span className="text-sm text-muted-foreground">
                        {selectedRestockItems.size} item{selectedRestockItems.size !== 1 ? "s" : ""} selected
                      </span>
                    )}
                    <Button
                      variant="outline"
                      onClick={exportRestockToExcel}
                      disabled={selectedRestockItems.size === 0}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export Excel
                    </Button>
                    <Button
                      variant="outline"
                      onClick={exportRestockToPDF}
                      disabled={selectedRestockItems.size === 0}
                    >
                      <FileDown className="h-4 w-4 mr-2" />
                      Export PDF
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loadingLowStock ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : lowStockItems.length > 0 ? (
                  <div className="overflow-x-auto">
                  <Table className="min-w-[800px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">
                          <Checkbox
                            checked={
                              lowStockItems.length > 0 &&
                              selectedRestockItems.size === lowStockItems.length
                            }
                            onCheckedChange={toggleAllRestockItems}
                            aria-label="Select all items"
                          />
                        </TableHead>
                        <TableHead>Item</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Current Stock</TableHead>
                        <TableHead className="text-right">Shortage</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lowStockItems.map((item) => (
                        <TableRow
                          key={item.id}
                          className={cn(
                            selectedRestockItems.has(item.id) && "bg-muted/50"
                          )}
                        >
                          <TableCell>
                            <Checkbox
                              checked={selectedRestockItems.has(item.id)}
                              onCheckedChange={() => toggleRestockItem(item.id)}
                              aria-label={`Select ${item.name}`}
                            />
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{item.name}</div>
                              <div className="text-xs text-muted-foreground font-mono">
                                {item.part_number}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{item.category}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="font-mono text-red-600">{item.quantity}</span>
                            <span className="text-muted-foreground"> / {item.min_quantity}</span>
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-red-600">
                            -{item.shortage}
                          </TableCell>
                          <TableCell>
                            <Select
                              value={restockPriorities[item.id] || ""}
                              onValueChange={(value) =>
                                setRestockPriority(item.id, value as PriorityLevel)
                              }
                            >
                              <SelectTrigger className="w-[160px]">
                                <SelectValue placeholder="Set priority">
                                  {restockPriorities[item.id] ? (
                                    getPriorityBadge(restockPriorities[item.id])
                                  ) : (
                                    "Set priority"
                                  )}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {PRIORITY_OPTIONS.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    <div className="flex items-center gap-2">
                                      <div
                                        className={`w-2 h-2 rounded-full ${option.color}`}
                                      />
                                      {option.label}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>{item.supplier || "—"}</TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              onClick={() => openReplenishDialog(item)}
                            >
                              <PackagePlus className="h-4 w-4 mr-1" />
                              Replenish
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12">
                    <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
                    <p className="text-lg font-medium">No Items to Restock</p>
                    <p className="text-muted-foreground">All inventory items are at or above minimum levels</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
        </TabsContent>
      </Tabs>

      {/* Create Request Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>New Procurement Request</DialogTitle>
            <DialogDescription>
              Request parts or services from vendors
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="part_name">Part Name *</Label>
              <Input
                id="part_name"
                placeholder="e.g., Brake Pads"
                value={newRequest.part_name}
                onChange={(e) => setNewRequest({ ...newRequest, part_name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="part_number">Part Number</Label>
                <Input
                  id="part_number"
                  placeholder="e.g., BP-12345"
                  value={newRequest.part_number}
                  onChange={(e) => setNewRequest({ ...newRequest, part_number: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="quantity">Quantity *</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={newRequest.quantity}
                  onChange={(e) => setNewRequest({ ...newRequest, quantity: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="vendor">Vendor</Label>
                <Select
                  value={newRequest.vendor_id}
                  onValueChange={(value) => setNewRequest({ ...newRequest, vendor_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.map((vendor) => (
                      <SelectItem key={vendor.id} value={vendor.id}>
                        {vendor.vendor_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="unit_price">Unit Price</Label>
                <Input
                  id="unit_price"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newRequest.unit_price}
                  onChange={(e) => setNewRequest({ ...newRequest, unit_price: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="requested_by">Requested By</Label>
              <Input
                id="requested_by"
                placeholder="Your name"
                value={newRequest.requested_by}
                onChange={(e) => setNewRequest({ ...newRequest, requested_by: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Additional details..."
                value={newRequest.notes}
                onChange={(e) => setNewRequest({ ...newRequest, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateRequest}
              disabled={createRequest.isPending || !newRequest.part_name || !newRequest.quantity}
            >
              {createRequest.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Vendor Dialog */}
      <Dialog open={assignVendorDialogOpen} onOpenChange={setAssignVendorDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Vendor</DialogTitle>
            <DialogDescription>
              Select a vendor to fulfill this order
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="bg-muted/50 rounded-lg p-4 mb-4">
              <div className="font-medium">{selectedRequest.part_name}</div>
              <div className="text-sm text-muted-foreground">
                Quantity: {selectedRequest.quantity}
              </div>
            </div>
          )}
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="assign_vendor">Vendor *</Label>
              <Select
                value={vendorAssignment.vendor_id}
                onValueChange={(value) => setVendorAssignment({ ...vendorAssignment, vendor_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id}>
                      {vendor.vendor_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="assign_price">Unit Price</Label>
              <Input
                id="assign_price"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={vendorAssignment.unit_price}
                onChange={(e) => setVendorAssignment({ ...vendorAssignment, unit_price: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignVendorDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAssignVendor}
              disabled={assignVendor.isPending || !vendorAssignment.vendor_id}
            >
              {assignVendor.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Place Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Request</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide a reason for rejecting this request.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Reason for rejection..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              disabled={!rejectionReason}
              className="bg-red-600 hover:bg-red-700"
            >
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Replenish Dialog */}
      <Dialog open={replenishDialogOpen} onOpenChange={setReplenishDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Replenishment Order</DialogTitle>
            <DialogDescription>
              Order stock to bring this item above minimum level
            </DialogDescription>
          </DialogHeader>
          {selectedLowStockItem && (
            <div className="bg-muted/50 rounded-lg p-4 mb-4 space-y-2">
              <div className="font-medium">{selectedLowStockItem.name}</div>
              <div className="text-sm text-muted-foreground font-mono">
                {selectedLowStockItem.part_number}
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Current Stock:</span>
                <span className="font-mono text-red-600">{selectedLowStockItem.quantity}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Minimum Required:</span>
                <span className="font-mono">{selectedLowStockItem.min_quantity}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Recommended Order:</span>
                <span className="font-mono font-bold">{selectedLowStockItem.shortage}</span>
              </div>
            </div>
          )}
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="replenish_qty">Order Quantity</Label>
              <Input
                id="replenish_qty"
                type="number"
                min="1"
                value={replenishQuantity}
                onChange={(e) => setReplenishQuantity(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="replenish_vendor">Vendor</Label>
              <Select
                value={replenishVendorId}
                onValueChange={setReplenishVendorId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select vendor (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id}>
                      {vendor.vendor_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplenishDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleReplenish}
              disabled={createReplenishment.isPending || !replenishQuantity}
            >
              {createReplenishment.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Request Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Procurement Request</DialogTitle>
            <DialogDescription>
              Update the details of this request
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit_part_name">Part Name *</Label>
              <Input
                id="edit_part_name"
                value={editForm.part_name}
                onChange={(e) => setEditForm({ ...editForm, part_name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit_part_number">Part Number</Label>
                <Input
                  id="edit_part_number"
                  value={editForm.part_number}
                  onChange={(e) => setEditForm({ ...editForm, part_number: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit_quantity">Quantity *</Label>
                <Input
                  id="edit_quantity"
                  type="number"
                  min="1"
                  value={editForm.quantity}
                  onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit_vendor">Vendor</Label>
                <Select
                  value={editForm.vendor_id}
                  onValueChange={(value) => setEditForm({ ...editForm, vendor_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.map((vendor) => (
                      <SelectItem key={vendor.id} value={vendor.id}>
                        {vendor.vendor_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit_unit_price">Unit Price</Label>
                <Input
                  id="edit_unit_price"
                  type="number"
                  step="0.01"
                  value={editForm.unit_price}
                  onChange={(e) => setEditForm({ ...editForm, unit_price: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit_notes">Notes</Label>
              <Textarea
                id="edit_notes"
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleEditRequest}
              disabled={updateRequest.isPending || !editForm.part_name || !editForm.quantity}
            >
              {updateRequest.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Request</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this procurement request? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {selectedRequest && (
            <div className="bg-muted/50 rounded-lg p-4 my-4">
              <div className="font-medium">{selectedRequest.part_name}</div>
              <div className="text-sm text-muted-foreground">
                Quantity: {selectedRequest.quantity} • Status: {selectedRequest.status}
              </div>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRequest}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteRequest.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Move Back to Requests Confirmation */}
      <AlertDialog open={moveBackDialogOpen} onOpenChange={setMoveBackDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move Back to All Requests?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the item from the Cash Manager and clear its IR number and procurement status. It will return to the All Requests tab as a pending request.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {moveBackRequest && (
            <div className="bg-muted/50 rounded-lg p-4 my-2">
              <div className="font-medium">{moveBackRequest.part_name}</div>
              <div className="text-sm text-muted-foreground">
                IR: {moveBackRequest.ir_number ?? "None"} &nbsp;·&nbsp; Qty: {moveBackRequest.quantity}
              </div>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (moveBackRequest) moveBackToRequests.mutate(moveBackRequest.id);
                setMoveBackDialogOpen(false);
              }}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {moveBackToRequests.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Move Back
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* IR (Internal Requisition) Dialog */}
      <Dialog open={sageDialogOpen} onOpenChange={setSageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add IR Number</DialogTitle>
            <DialogDescription>
              Enter the Internal Requisition (IR) details for this request
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="bg-muted/50 rounded-lg p-4 mb-4">
              <div className="font-medium">{selectedRequest.part_name}</div>
              <div className="text-sm text-muted-foreground">
                Quantity: {selectedRequest.quantity}
              </div>
            </div>
          )}
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="sage_number">IR Number *</Label>
              <Input
                id="sage_number"
                placeholder="e.g., IR-2026-001234"
                value={sageForm.sage_requisition_number}
                onChange={(e) => setSageForm({ ...sageForm, sage_requisition_number: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sage_by">Created By</Label>
              <Input
                id="sage_by"
                placeholder="Your name"
                value={sageForm.sage_requisition_by}
                onChange={(e) => setSageForm({ ...sageForm, sage_requisition_by: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSageDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSageRequisition}
              disabled={updateSageRequisition.isPending || !sageForm.sage_requisition_number}
            >
              {updateSageRequisition.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save IR
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cash Manager Approval Dialog */}
      <Dialog open={cashManagerDialogOpen} onOpenChange={setCashManagerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cash Manager Approval</DialogTitle>
            <DialogDescription>
              Record the Cash Manager approval for this request
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="bg-muted/50 rounded-lg p-4 mb-4 space-y-1">
              <div className="font-medium">{selectedRequest.part_name}</div>
              <div className="text-sm text-muted-foreground">
                Quantity: {selectedRequest.quantity}
              </div>
              {selectedRequest.sage_requisition_number && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Sage Ref:</span>{" "}
                  <span className="font-mono">{selectedRequest.sage_requisition_number}</span>
                </div>
              )}
            </div>
          )}
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="cash_ref">Cash Manager Reference *</Label>
              <Input
                id="cash_ref"
                placeholder="e.g., CM-2026-001234"
                value={cashManagerForm.cash_manager_reference}
                onChange={(e) => setCashManagerForm({ ...cashManagerForm, cash_manager_reference: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cash_by">Approved By</Label>
              <Input
                id="cash_by"
                placeholder="Approver name"
                value={cashManagerForm.cash_manager_approved_by}
                onChange={(e) => setCashManagerForm({ ...cashManagerForm, cash_manager_approved_by: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCashManagerDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCashManagerApproval}
              disabled={updateCashManager.isPending || !cashManagerForm.cash_manager_reference}
            >
              {updateCashManager.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Record Approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Place Order Dialog */}
      <Dialog open={orderDialogOpen} onOpenChange={setOrderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Place Order with Vendor</DialogTitle>
            <DialogDescription>
              Record the order details for this procurement request
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="bg-muted/50 rounded-lg p-4 mb-4 space-y-1">
              <div className="font-medium">{selectedRequest.part_name}</div>
              <div className="text-sm text-muted-foreground">
                Quantity: {selectedRequest.quantity}
              </div>
            </div>
          )}
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="order_vendor">Vendor *</Label>
              <Select
                value={vendorAssignment.vendor_id}
                onValueChange={(value) => setVendorAssignment({ ...vendorAssignment, vendor_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id}>
                      {vendor.vendor_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="order_price">Unit Price</Label>
                <Input
                  id="order_price"
                  type="number"
                  step="0.01"
                  value={vendorAssignment.unit_price}
                  onChange={(e) => setVendorAssignment({ ...vendorAssignment, unit_price: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="order_date">Expected Delivery</Label>
                <DatePicker
                  id="order_date"
                  value={vendorAssignment.expected_delivery_date}
                  onChange={(date) => setVendorAssignment({ ...vendorAssignment, expected_delivery_date: date ? date.toISOString().split('T')[0] : '' })}
                  placeholder="Select expected delivery date"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="order_by">Ordered By</Label>
              <Input
                id="order_by"
                placeholder="Your name"
                value={vendorAssignment.ordered_by}
                onChange={(e) => setVendorAssignment({ ...vendorAssignment, ordered_by: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOrderDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handlePlaceOrder}
              disabled={markAsOrdered.isPending || !vendorAssignment.vendor_id}
            >
              {markAsOrdered.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Place Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receive Order Dialog */}
      <Dialog open={receiveDialogOpen} onOpenChange={setReceiveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Receive Order</DialogTitle>
            <DialogDescription>
              Mark this order as received and update inventory
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="bg-muted/50 rounded-lg p-4 mb-4 space-y-1">
              <div className="font-medium">{selectedRequest.part_name}</div>
              <div className="text-sm text-muted-foreground">
                Ordered Quantity: {selectedRequest.quantity}
              </div>
              {selectedRequest.vendor?.vendor_name && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Vendor:</span>{" "}
                  {selectedRequest.vendor.vendor_name}
                </div>
              )}
              {selectedRequest.inventory_id && (
                <div className="text-sm text-green-600">
                  ✓ Will auto-update inventory stock
                </div>
              )}
            </div>
          )}
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="receive_qty">Received Quantity</Label>
              <Input
                id="receive_qty"
                type="number"
                min="1"
                value={receiveForm.received_quantity}
                onChange={(e) => setReceiveForm({ ...receiveForm, received_quantity: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="receive_by">Received By</Label>
              <Input
                id="receive_by"
                placeholder="Your name"
                value={receiveForm.received_by}
                onChange={(e) => setReceiveForm({ ...receiveForm, received_by: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReceiveDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleReceiveOrder}
              disabled={markAsReceived.isPending}
            >
              {markAsReceived.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request Details Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Procurement Request Details</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-6">
              {/* Part Info */}
              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-semibold mb-2">Part Information</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Name:</span>
                    <span className="ml-2 font-medium">{selectedRequest.part_name}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Part #:</span>
                    <span className="ml-2 font-mono">{selectedRequest.part_number || "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Quantity:</span>
                    <span className="ml-2 font-mono">{selectedRequest.quantity}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Unit Price:</span>
                    <span className="ml-2 font-mono">
                      {selectedRequest.unit_price ? `$${selectedRequest.unit_price.toFixed(2)}` : "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total:</span>
                    <span className="ml-2 font-mono font-bold">
                      {selectedRequest.total_price ? `$${selectedRequest.total_price.toFixed(2)}` : "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status:</span>
                    <span className="ml-2">{getStatusBadge(selectedRequest.status)}</span>
                  </div>
                </div>
              </div>

              {/* Workflow Timeline */}
              <div>
                <h4 className="font-semibold mb-3">Workflow Timeline</h4>
                <div className="space-y-3">
                  {getWorkflowStatus(selectedRequest).map((step, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        step.completed ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"
                      }`}>
                        {step.completed ? (
                          <CheckCircle className="h-5 w-5" />
                        ) : (
                          <Clock className="h-5 w-5" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{step.label}</div>
                        {step.date && (
                          <div className="text-sm text-muted-foreground">
                            {formatDate(step.date)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Lead Time Summary (for received items) */}
              {selectedRequest.received_date && (
                <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <h4 className="font-semibold mb-2 flex items-center gap-2 text-green-700 dark:text-green-400">
                    <CheckCircle className="h-4 w-4" />
                    Procurement Complete
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {getLeadTime(selectedRequest) && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <span className="text-muted-foreground">Lead Time:</span>
                          <span className="ml-2 font-semibold text-green-700 dark:text-green-400">
                            {getLeadTime(selectedRequest)?.formatted}
                          </span>
                        </div>
                      </div>
                    )}
                    {getTotalProcurementTime(selectedRequest) && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <span className="text-muted-foreground">Total Time:</span>
                          <span className="ml-2 font-semibold">
                            {getTotalProcurementTime(selectedRequest)?.formatted}
                          </span>
                        </div>
                      </div>
                    )}
                    {selectedRequest.ordered_at && selectedRequest.received_date && (
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <span className="text-muted-foreground">Delivery Time:</span>
                          <span className="ml-2 font-semibold">
                            {calculateLeadTime(selectedRequest.ordered_at, selectedRequest.received_date)?.formatted}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Additional Details */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                {selectedRequest.sage_requisition_number && (
                  <div>
                    <span className="text-muted-foreground">IR Ref:</span>
                    <span className="ml-2 font-mono">{selectedRequest.sage_requisition_number}</span>
                  </div>
                )}
                {selectedRequest.cash_manager_reference && (
                  <div>
                    <span className="text-muted-foreground">Cash Manager Ref:</span>
                    <span className="ml-2 font-mono">{selectedRequest.cash_manager_reference}</span>
                  </div>
                )}
                {selectedRequest.vendor?.vendor_name && (
                  <div>
                    <span className="text-muted-foreground">Vendor:</span>
                    <span className="ml-2">{selectedRequest.vendor.vendor_name}</span>
                  </div>
                )}
                {selectedRequest.expected_delivery_date && (
                  <div>
                    <span className="text-muted-foreground">Expected Delivery:</span>
                    <span className="ml-2">{selectedRequest.expected_delivery_date}</span>
                  </div>
                )}
                {selectedRequest.received_quantity && (
                  <div>
                    <span className="text-muted-foreground">Received Qty:</span>
                    <span className="ml-2 font-mono">{selectedRequest.received_quantity}</span>
                  </div>
                )}
                {selectedRequest.job_card?.job_number && (
                  <div>
                    <span className="text-muted-foreground">Job Card:</span>
                    <span className="ml-2 font-mono">{selectedRequest.job_card.job_number}</span>
                  </div>
                )}
              </div>

              {/* Notes */}
              {selectedRequest.notes && (
                <div>
                  <h4 className="font-semibold mb-2">Notes</h4>
                  <div className="text-sm bg-muted/50 rounded-lg p-3">
                    {selectedRequest.notes}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>
              Close
            </Button>
            <Button onClick={() => {
              setDetailDialogOpen(false);
              if (selectedRequest) openEditDialog(selectedRequest);
            }}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Start Procurement Dialog (IR Creation + Quotes) */}
      <StartProcurementDialog
        open={startProcurementDialogOpen}
        onOpenChange={(open) => {
          setStartProcurementDialogOpen(open);
          if (!open) setSelectedRequestIds(new Set());
        }}
        requests={selectedRequestIds.size > 0 ? selectedRequests : selectedRequest ? [selectedRequest] : []}
      />

      {/* Edit Cash Manager Item Dialog */}
      <EditCashManagerItemDialog
        open={editCashManagerOpen}
        onOpenChange={setEditCashManagerOpen}
        request={editCashManagerRequest}
      />
    </Layout>
  );
};

export default Procurement;