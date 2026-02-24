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
import
  {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
  } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
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
import
  {
    type CreateBunkerData,
    type DailyDipRecord,
    type DipRecordEditEntry,
    type FuelBunker,
    useAdjustBunkerLevel,
    useCloseDipRecord,
    useCreateDipRecord,
    useCreateFuelBunker,
    useDailyDipRecords,
    useDeleteDipRecord,
    useDeleteFuelBunker,
    useDispenseFuel,
    useEditDipRecord,
    useFuelBunkers,
    useFuelTransactions,
    useRefillBunker,
    useUpdateFuelBunker
  } from "@/hooks/useFuelBunkers";
import { useVehicles } from "@/hooks/useVehicles";
import { generateDipRecordsExcel, generateDipRecordsPDF } from "@/lib/dipRecordExport";
import { formatDate } from "@/lib/formatters";
import
  {
    AlertTriangle,
    ArrowDownCircle,
    ArrowUpCircle,
    Calendar,
    CheckCircle2,
    ClipboardList,
    Droplets,
    Edit,
    FileSpreadsheet,
    FileText,
    Fuel,
    History,
    Loader2,
    Minus,
    Plus,
    Settings,
    Sliders,
    Trash2,
    XCircle
  } from "lucide-react";
import { useState } from "react";
import Layout from "./Layout";
import { DatePicker } from "./ui/date-picker";

const FUEL_TYPES = ["Diesel", "Petrol", "LPG", "CNG", "Electric"];

const FuelBunkerManagement = () => {
  const { data: bunkers = [], isLoading } = useFuelBunkers();
  const { data: transactions = [] } = useFuelTransactions();
  const { data: dipRecords = [] } = useDailyDipRecords();
  const { data: vehicles = [] } = useVehicles();
  const createBunker = useCreateFuelBunker();
  const updateBunker = useUpdateFuelBunker();
  const deleteBunker = useDeleteFuelBunker();
  const dispenseFuel = useDispenseFuel();
  const refillBunker = useRefillBunker();
  const adjustBunkerLevel = useAdjustBunkerLevel();
  const createDipRecord = useCreateDipRecord();
  const closeDipRecord = useCloseDipRecord();
  const editDipRecord = useEditDipRecord();
  const deleteDipRecord = useDeleteDipRecord();

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [dispenseDialogOpen, setDispenseDialogOpen] = useState(false);
  const [refillDialogOpen, setRefillDialogOpen] = useState(false);
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [openDipDialogOpen, setOpenDipDialogOpen] = useState(false);
  const [closeDipDialogOpen, setCloseDipDialogOpen] = useState(false);
  const [editDipDialogOpen, setEditDipDialogOpen] = useState(false);
  const [deleteDipDialogOpen, setDeleteDipDialogOpen] = useState(false);
  const [viewDipHistoryDialogOpen, setViewDipHistoryDialogOpen] = useState(false);
  const [selectedBunker, setSelectedBunker] = useState<FuelBunker | null>(null);
  const [selectedDipRecord, setSelectedDipRecord] = useState<DailyDipRecord | null>(null);

  // Form states
  const [formData, setFormData] = useState<Partial<CreateBunkerData>>({
    fuel_type: "Diesel",
  });
  const [dispenseData, setDispenseData] = useState({
    quantity_liters: "",
    vehicle_id: "",
    vehicle_fleet_number: "",
    odometer_reading: "",
    driver_name: "",
    notes: "",
  });
  const [refillData, setRefillData] = useState({
    quantity_liters: "",
    unit_cost: "",
    reference_number: "",
    notes: "",
  });
  const [openDipData, setOpenDipData] = useState({
    bunker_id: "",
    record_date: new Date().toISOString().split("T")[0],
    opening_dip_cm: "",
    opening_volume_liters: "",
    opening_pump_reading: "",
    recorded_by: "",
    notes: "",
  });
  const [closeDipData, setCloseDipData] = useState({
    closing_dip_cm: "",
    closing_volume_liters: "",
    closing_pump_reading: "",
    notes: "",
  });
  const [editDipData, setEditDipData] = useState({
    opening_dip_cm: "",
    opening_volume_liters: "",
    opening_pump_reading: "",
    closing_dip_cm: "",
    closing_volume_liters: "",
    closing_pump_reading: "",
    recorded_by: "",
    notes: "",
    edit_reason: "",
    edited_by: "",
  });
  const [deleteDipReason, setDeleteDipReason] = useState("");
  const [deleteDipBy, setDeleteDipBy] = useState("");
  
  // Adjust level form state
  const [adjustData, setAdjustData] = useState({
    new_level: "",
    reason: "",
    adjusted_by: "",
  });

  // Handlers
  const handleCreateBunker = async () => {
    if (!formData.name || !formData.capacity_liters) return;
    await createBunker.mutateAsync(formData as CreateBunkerData);
    setCreateDialogOpen(false);
    setFormData({ fuel_type: "Diesel" });
  };

  const handleUpdateBunker = async () => {
    if (!selectedBunker) return;
    await updateBunker.mutateAsync({
      id: selectedBunker.id,
      ...formData,
    });
    setEditDialogOpen(false);
    setSelectedBunker(null);
    setFormData({ fuel_type: "Diesel" });
  };

  const handleDeleteBunker = async () => {
    if (!selectedBunker) return;
    await deleteBunker.mutateAsync(selectedBunker.id);
    setDeleteDialogOpen(false);
    setSelectedBunker(null);
  };

  const handleDispenseFuel = async () => {
    if (!selectedBunker || !dispenseData.quantity_liters) return;
    await dispenseFuel.mutateAsync({
      bunker_id: selectedBunker.id,
      quantity_liters: parseFloat(dispenseData.quantity_liters),
      vehicle_id: dispenseData.vehicle_id || undefined,
      vehicle_fleet_number: dispenseData.vehicle_fleet_number || undefined,
      odometer_reading: dispenseData.odometer_reading ? parseFloat(dispenseData.odometer_reading) : undefined,
      driver_name: dispenseData.driver_name || undefined,
      notes: dispenseData.notes || undefined,
    });
    setDispenseDialogOpen(false);
    setSelectedBunker(null);
    setDispenseData({
      quantity_liters: "",
      vehicle_id: "",
      vehicle_fleet_number: "",
      odometer_reading: "",
      driver_name: "",
      notes: "",
    });
  };

  const handleRefillBunker = async () => {
    if (!selectedBunker || !refillData.quantity_liters) return;
    await refillBunker.mutateAsync({
      bunker_id: selectedBunker.id,
      quantity_liters: parseFloat(refillData.quantity_liters),
      unit_cost: refillData.unit_cost ? parseFloat(refillData.unit_cost) : undefined,
      reference_number: refillData.reference_number || undefined,
      notes: refillData.notes || undefined,
    });
    setRefillDialogOpen(false);
    setSelectedBunker(null);
    setRefillData({
      quantity_liters: "",
      unit_cost: "",
      reference_number: "",
      notes: "",
    });
  };

  const openEditDialog = (bunker: FuelBunker) => {
    setSelectedBunker(bunker);
    setFormData({
      name: bunker.name,
      location: bunker.location || "",
      fuel_type: bunker.fuel_type,
      capacity_liters: bunker.capacity_liters,
      current_level_liters: bunker.current_level_liters,
      unit_cost: bunker.unit_cost || 0,
      min_level_alert: bunker.min_level_alert || 0,
      notes: bunker.notes || "",
    });
    setEditDialogOpen(true);
  };

  const openDispenseDialog = (bunker: FuelBunker) => {
    setSelectedBunker(bunker);
    setDispenseDialogOpen(true);
  };

  const openRefillDialog = (bunker: FuelBunker) => {
    setSelectedBunker(bunker);
    setRefillData((prev) => ({
      ...prev,
      unit_cost: bunker.unit_cost?.toString() || "",
    }));
    setRefillDialogOpen(true);
  };

  // Adjust Level Dialog
  const openAdjustDialog = (bunker: FuelBunker) => {
    setSelectedBunker(bunker);
    setAdjustData({
      new_level: bunker.current_level_liters.toString(),
      reason: "",
      adjusted_by: "",
    });
    setAdjustDialogOpen(true);
  };

  const handleAdjustLevel = async () => {
    if (!selectedBunker || !adjustData.new_level || !adjustData.reason) return;
    if (!adjustData.adjusted_by) {
      return; // Mandatory field
    }
    await adjustBunkerLevel.mutateAsync({
      bunker_id: selectedBunker.id,
      new_level: parseFloat(adjustData.new_level),
      reason: adjustData.reason,
      adjusted_by: adjustData.adjusted_by,
    });
    setAdjustDialogOpen(false);
    setSelectedBunker(null);
    setAdjustData({
      new_level: "",
      reason: "",
      adjusted_by: "",
    });
  };

  // Helper: Check if vehicle is a diesel bowser
  const isBowserVehicle = (vehicleId: string) => {
    const vehicle = vehicles.find((v) => v.id === vehicleId);
    if (!vehicle) return false;
    const vehicleType = (vehicle.vehicle_type || "").toLowerCase();
    return vehicleType.includes("bowser") || vehicleType.includes("tanker") || vehicleType.includes("fuel");
  };

  // Helper: Calculate dip discrepancy for a bunker
  const getDipDiscrepancy = (bunker: FuelBunker) => {
    // Find the most recent open dip record for this bunker
    const recentDip = dipRecords.find(
      (dip) => dip.bunker_id === bunker.id && dip.status === "open"
    );
    if (!recentDip) return null;
    
    // Compare opening volume with bunker's current level
    const discrepancy = bunker.current_level_liters - recentDip.opening_volume_liters;
    const percentDiscrepancy = Math.abs(discrepancy) / bunker.current_level_liters * 100;
    
    // Flag if discrepancy is more than 2% or 50 liters
    if (Math.abs(discrepancy) > 50 || percentDiscrepancy > 2) {
      return {
        discrepancy,
        percentDiscrepancy,
        dipVolume: recentDip.opening_volume_liters,
        bunkerLevel: bunker.current_level_liters,
      };
    }
    return null;
  };

  // Dip Record Handlers
  const handleOpenDipRecord = async () => {
    if (!openDipData.bunker_id || !openDipData.opening_volume_liters) return;
    await createDipRecord.mutateAsync({
      bunker_id: openDipData.bunker_id,
      record_date: openDipData.record_date,
      opening_dip_cm: openDipData.opening_dip_cm ? parseFloat(openDipData.opening_dip_cm) : undefined,
      opening_volume_liters: parseFloat(openDipData.opening_volume_liters),
      opening_pump_reading: openDipData.opening_pump_reading ? parseFloat(openDipData.opening_pump_reading) : undefined,
      recorded_by: openDipData.recorded_by || undefined,
      notes: openDipData.notes || undefined,
    });
    setOpenDipDialogOpen(false);
    setOpenDipData({
      bunker_id: "",
      record_date: new Date().toISOString().split("T")[0],
      opening_dip_cm: "",
      opening_volume_liters: "",
      opening_pump_reading: "",
      recorded_by: "",
      notes: "",
    });
  };

  const handleCloseDipRecord = async () => {
    if (!selectedDipRecord || !closeDipData.closing_volume_liters) return;
    await closeDipRecord.mutateAsync({
      id: selectedDipRecord.id,
      closing_dip_cm: closeDipData.closing_dip_cm ? parseFloat(closeDipData.closing_dip_cm) : undefined,
      closing_volume_liters: parseFloat(closeDipData.closing_volume_liters),
      closing_pump_reading: closeDipData.closing_pump_reading ? parseFloat(closeDipData.closing_pump_reading) : undefined,
      notes: closeDipData.notes || undefined,
    });
    setCloseDipDialogOpen(false);
    setSelectedDipRecord(null);
    setCloseDipData({
      closing_dip_cm: "",
      closing_volume_liters: "",
      closing_pump_reading: "",
      notes: "",
    });
  };

  const openCloseDipDialog = (record: DailyDipRecord) => {
    setSelectedDipRecord(record);
    setCloseDipDialogOpen(true);
  };

  // Edit Dip Record handlers
  const openEditDipDialog = (record: DailyDipRecord) => {
    setSelectedDipRecord(record);
    setEditDipData({
      opening_dip_cm: record.opening_dip_cm?.toString() || "",
      opening_volume_liters: record.opening_volume_liters.toString(),
      opening_pump_reading: record.opening_pump_reading?.toString() || "",
      closing_dip_cm: record.closing_dip_cm?.toString() || "",
      closing_volume_liters: record.closing_volume_liters?.toString() || "",
      closing_pump_reading: record.closing_pump_reading?.toString() || "",
      recorded_by: record.recorded_by || "",
      notes: record.notes || "",
      edit_reason: "",
      edited_by: "",
    });
    setEditDipDialogOpen(true);
  };

  const handleEditDipRecord = async () => {
    if (!selectedDipRecord || !editDipData.edit_reason || !editDipData.edited_by) return;

    await editDipRecord.mutateAsync({
      id: selectedDipRecord.id,
      opening_dip_cm: editDipData.opening_dip_cm ? parseFloat(editDipData.opening_dip_cm) : null,
      opening_volume_liters: editDipData.opening_volume_liters ? parseFloat(editDipData.opening_volume_liters) : undefined,
      opening_pump_reading: editDipData.opening_pump_reading ? parseFloat(editDipData.opening_pump_reading) : null,
      closing_dip_cm: editDipData.closing_dip_cm ? parseFloat(editDipData.closing_dip_cm) : null,
      closing_volume_liters: editDipData.closing_volume_liters ? parseFloat(editDipData.closing_volume_liters) : null,
      closing_pump_reading: editDipData.closing_pump_reading ? parseFloat(editDipData.closing_pump_reading) : null,
      recorded_by: editDipData.recorded_by || null,
      notes: editDipData.notes || null,
      edit_reason: editDipData.edit_reason,
      edited_by: editDipData.edited_by,
    });

    setEditDipDialogOpen(false);
    setSelectedDipRecord(null);
    setEditDipData({
      opening_dip_cm: "",
      opening_volume_liters: "",
      opening_pump_reading: "",
      closing_dip_cm: "",
      closing_volume_liters: "",
      closing_pump_reading: "",
      recorded_by: "",
      notes: "",
      edit_reason: "",
      edited_by: "",
    });
  };

  // Delete Dip Record handlers
  const openDeleteDipDialog = (record: DailyDipRecord) => {
    setSelectedDipRecord(record);
    setDeleteDipReason("");
    setDeleteDipBy("");
    setDeleteDipDialogOpen(true);
  };

  const handleDeleteDipRecord = async () => {
    if (!selectedDipRecord || !deleteDipReason || !deleteDipBy) return;

    await deleteDipRecord.mutateAsync({
      id: selectedDipRecord.id,
      deleted_by: deleteDipBy,
      reason: deleteDipReason,
    });

    setDeleteDipDialogOpen(false);
    setSelectedDipRecord(null);
    setDeleteDipReason("");
    setDeleteDipBy("");
  };

  // View edit history
  const openViewHistoryDialog = (record: DailyDipRecord) => {
    setSelectedDipRecord(record);
    setViewDipHistoryDialogOpen(true);
  };

  // Export functions
  const handleExportPDF = () => {
    generateDipRecordsPDF({
      records: dipRecords,
      bunkers,
      includeEditHistory: true,
    });
  };

  const handleExportExcel = () => {
    generateDipRecordsExcel({
      records: dipRecords,
      bunkers,
      includeEditHistory: true,
    });
  };

  // Helper function for variance styling (kept for potential future use)
  const _getVarianceColor = (variance: number | null) => {
    if (variance === null) return "text-muted-foreground";
    const absVariance = Math.abs(variance);
    if (absVariance <= 10) return "text-green-600";
    if (variance > 0) return "text-red-600"; // Tank lost more than pump recorded
    return "text-orange-500"; // Negative variance (thermal expansion)
  };

  const getVarianceStatus = (variance: number | null) => {
    if (variance === null) return { label: "Pending", color: "bg-gray-500" };
    const absVariance = Math.abs(variance);
    if (absVariance <= 10) return { label: "OK", color: "bg-green-500" };
    if (variance > 0) return { label: "Loss", color: "bg-red-500" };
    return { label: "Gain", color: "bg-orange-500" };
  };

  const getLevelPercentage = (bunker: FuelBunker) => {
    if (!bunker.capacity_liters) return 0;
    return Math.round((bunker.current_level_liters / bunker.capacity_liters) * 100);
  };

  const getLevelColor = (bunker: FuelBunker) => {
    const percentage = getLevelPercentage(bunker);
    if (percentage < 20) return "bg-red-500";
    if (percentage < 40) return "bg-orange-500";
    return "bg-green-500";
  };

  const isLowLevel = (bunker: FuelBunker) => {
    return bunker.min_level_alert && bunker.current_level_liters < bunker.min_level_alert;
  };

  // Stats
  const totalCapacity = bunkers.reduce((sum, b) => sum + b.capacity_liters, 0);
  const totalFuel = bunkers.reduce((sum, b) => sum + b.current_level_liters, 0);
  const lowLevelBunkers = bunkers.filter(isLowLevel);
  const activeBunkers = bunkers.filter((b) => b.is_active);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Bulk Diesel Management</h1>
            <p className="text-muted-foreground mt-1">
              Manage fuel storage tanks, monitor inventory levels, and track daily reconciliation
            </p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)} className="bg-primary hover:bg-primary/90">
            <Plus className="h-4 w-4 mr-2" />
            Add New Tank
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Inventory</CardTitle>
              <Droplets className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{totalFuel.toLocaleString()} L</div>
              <p className="text-xs text-muted-foreground mt-1">
                of {totalCapacity.toLocaleString()} L total capacity
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Tanks</CardTitle>
              <Fuel className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{activeBunkers.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {bunkers.length} total tanks registered
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Activity</CardTitle>
              <History className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">
                {
                  transactions.filter(
                    (t) => new Date(t.transaction_date).toDateString() === new Date().toDateString()
                  ).length
                }
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {transactions.length} total transactions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Level Alerts</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">
                {lowLevelBunkers.length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {lowLevelBunkers.length > 0 ? "tanks require immediate refilling" : "all tanks at healthy levels"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="bunkers" className="space-y-4">
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="bunkers" className="gap-2 data-[state=active]:bg-background">
              <Fuel className="h-4 w-4" />
              Storage Tanks
            </TabsTrigger>
            <TabsTrigger value="dip-records" className="gap-2 data-[state=active]:bg-background">
              <ClipboardList className="h-4 w-4" />
              Daily Reconciliation
            </TabsTrigger>
            <TabsTrigger value="transactions" className="gap-2 data-[state=active]:bg-background">
              <History className="h-4 w-4" />
              Transaction History
            </TabsTrigger>
          </TabsList>

          {/* Bunkers Tab */}
          <TabsContent value="bunkers">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {bunkers.map((bunker) => (
                <Card key={bunker.id} className={isLowLevel(bunker) ? "border-red-500" : ""}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {bunker.name}
                          {isLowLevel(bunker) && <AlertTriangle className="h-4 w-4 text-red-500" />}
                        </CardTitle>
                        <CardDescription>{bunker.location || "No location"}</CardDescription>
                      </div>
                      <Badge variant={bunker.is_active ? "default" : "secondary"}>
                        {bunker.fuel_type}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Level Progress */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">
                          {bunker.current_level_liters.toLocaleString()} L
                        </span>
                        <span className="text-muted-foreground">{getLevelPercentage(bunker)}%</span>
                      </div>
                      <Progress value={getLevelPercentage(bunker)} className={getLevelColor(bunker)} />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>0 L</span>
                        <span>{bunker.capacity_liters.toLocaleString()} L</span>
                      </div>
                    </div>

                    {/* Unit Cost */}
                    {bunker.unit_cost && (
                      <div className="text-sm text-muted-foreground">
                        Unit cost: ${bunker.unit_cost.toFixed(2)}/L
                      </div>
                    )}

                    {/* Dip Discrepancy Alert */}
                    {(() => {
                      const discrepancy = getDipDiscrepancy(bunker);
                      if (discrepancy) {
                        return (
                          <div className="p-2 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-md">
                            <div className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
                              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                              <div className="text-xs">
                                <span className="font-medium">Dip Discrepancy Detected!</span>
                                <br />
                                <span>
                                  Bunker: {discrepancy.bunkerLevel.toLocaleString()}L | 
                                  Dip: {discrepancy.dipVolume.toLocaleString()}L |
                                  Variance: {discrepancy.discrepancy > 0 ? '+' : ''}{discrepancy.discrepancy.toFixed(1)}L
                                  ({discrepancy.percentDiscrepancy.toFixed(1)}%)
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {/* Actions */}
                    <div className="flex gap-2 flex-wrap">
                      <Button size="sm" variant="secondary" onClick={() => openRefillDialog(bunker)}>
                        <ArrowUpCircle className="h-4 w-4 mr-1" />
                        Refill
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => openDispenseDialog(bunker)}>
                        <ArrowDownCircle className="h-4 w-4 mr-1" />
                        Dispense
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openAdjustDialog(bunker)}>
                        <Sliders className="h-4 w-4 mr-1" />
                        Adjust
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => openEditDialog(bunker)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-500"
                        onClick={() => {
                          setSelectedBunker(bunker);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      <ArrowDownCircle className="h-3 w-3 inline mr-1" />
                      Fuel dispensing is handled via the Fuel Management page
                    </p>
                  </CardContent>
                </Card>
              ))}

              {bunkers.length === 0 && (
                <Card className="col-span-full">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Fuel className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No fuel bunkers yet</p>
                    <Button className="mt-4" onClick={() => setCreateDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Your First Bunker
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Daily Dip Records Tab */}
          <TabsContent value="dip-records">
            <Card className="border-0 shadow-sm">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-t-lg border-b">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                        <ClipboardList className="h-5 w-5 text-blue-600" />
                      </div>
                      Daily Dip Reconciliation
                    </CardTitle>
                    <CardDescription className="mt-2 text-sm">
                      Monitor tank levels, pump meter readings, and identify discrepancies for accurate fuel inventory management
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={handleExportPDF} className="bg-white dark:bg-background">
                      <FileText className="h-4 w-4 mr-2" />
                      PDF Report
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleExportExcel} className="bg-white dark:bg-background">
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Excel Export
                    </Button>
                    <Button onClick={() => setOpenDipDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                      <Plus className="h-4 w-4 mr-2" />
                      Start New Day
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {/* Reconciliation Formula Reference - Modern Card Design */}
                <div className="grid md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 rounded-xl p-4 border border-amber-200/50">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-8 w-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                        <Minus className="h-4 w-4 text-amber-600" />
                      </div>
                      <span className="font-semibold text-amber-800 dark:text-amber-300">Tank Usage</span>
                    </div>
                    <div className="text-xs space-y-1 text-amber-700 dark:text-amber-400">
                      <div className="font-mono bg-white/50 dark:bg-black/20 px-2 py-1 rounded">C = Opening − Closing</div>
                      <div className="text-muted-foreground">Volume consumed from tank</div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-xl p-4 border border-blue-200/50">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-8 w-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                        <ArrowUpCircle className="h-4 w-4 text-blue-600" />
                      </div>
                      <span className="font-semibold text-blue-800 dark:text-blue-300">Pump Issued</span>
                    </div>
                    <div className="text-xs space-y-1 text-blue-700 dark:text-blue-400">
                      <div className="font-mono bg-white/50 dark:bg-black/20 px-2 py-1 rounded">F = Closing Pump − Opening Pump</div>
                      <div className="text-muted-foreground">Fuel dispensed per meter</div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 rounded-xl p-4 border border-purple-200/50">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-8 w-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                        <AlertTriangle className="h-4 w-4 text-purple-600" />
                      </div>
                      <span className="font-semibold text-purple-800 dark:text-purple-300">Variance</span>
                    </div>
                    <div className="text-xs space-y-1 text-purple-700 dark:text-purple-400">
                      <div className="font-mono bg-white/50 dark:bg-black/20 px-2 py-1 rounded">G = Tank Usage − Pump Issued</div>
                      <div className="flex gap-2 flex-wrap mt-1">
                        <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300 text-[10px]">0 = OK</Badge>
                        <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300 text-[10px]">− = Expansion</Badge>
                        <Badge variant="outline" className="bg-red-100 text-red-700 border-red-300 text-[10px]">+ = Loss</Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modern Table Design */}
                <div className="rounded-xl border bg-card overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableHead className="font-semibold">Date</TableHead>
                        <TableHead className="font-semibold">Tank</TableHead>
                        <TableHead className="text-right font-semibold">Opening Volume</TableHead>
                        <TableHead className="text-right font-semibold">Closing Volume</TableHead>
                        <TableHead className="text-right font-semibold">Tank Usage</TableHead>
                        <TableHead className="text-right font-semibold">Pump Issued</TableHead>
                        <TableHead className="text-right font-semibold">Variance</TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                        <TableHead className="text-right font-semibold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                    {dipRecords.map((record) => {
                      const varianceStatus = getVarianceStatus(record.variance_liters);
                      return (
                        <TableRow key={record.id} className="hover:bg-muted/30 transition-colors">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                <Calendar className="h-4 w-4 text-blue-600" />
                              </div>
                              <span className="font-medium">{formatDate(record.record_date)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Fuel className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{(record.bunker as { name: string })?.name || "Unknown"}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="font-mono font-medium text-green-600">
                              {record.opening_volume_liters.toLocaleString()} L
                            </div>
                            {record.opening_dip_cm && (
                              <div className="text-xs text-muted-foreground">
                                Dip: {record.opening_dip_cm} cm
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {record.closing_volume_liters !== null ? (
                              <>
                                <div className="font-mono font-medium text-orange-600">
                                  {record.closing_volume_liters.toLocaleString()} L
                                </div>
                                {record.closing_dip_cm && (
                                  <div className="text-xs text-muted-foreground">
                                    Dip: {record.closing_dip_cm} cm
                                  </div>
                                )}
                              </>
                            ) : (
                              <span className="text-muted-foreground italic">Pending</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {record.tank_usage_liters !== null ? (
                              <div className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-100 dark:bg-amber-900/30">
                                <Minus className="h-3 w-3 text-amber-600" />
                                <span className="font-mono font-medium text-amber-700 dark:text-amber-400">
                                  {Math.abs(record.tank_usage_liters).toLocaleString()} L
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground italic">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {record.pump_issued_liters !== null ? (
                              <div className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-100 dark:bg-blue-900/30">
                                <span className="font-mono font-medium text-blue-700 dark:text-blue-400">
                                  {record.pump_issued_liters.toLocaleString()} L
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground italic">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {record.variance_liters !== null ? (
                              <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-md font-mono font-bold ${
                                record.variance_liters === 0
                                  ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                                  : record.variance_liters < 0
                                    ? "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400"
                                    : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                              }`}>
                                {record.variance_liters > 0 ? "+" : ""}
                                {record.variance_liters.toLocaleString()} L
                              </div>
                            ) : (
                              <span className="text-muted-foreground italic">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className={`${varianceStatus.color} font-medium`}>
                              {record.status === "open" ? (
                                <>
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Open
                                </>
                              ) : record.status === "closed" ? (
                                <>
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  {varianceStatus.label}
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Reconciled
                                </>
                              )}
                            </Badge>
                            {record.last_edited_at && (
                              <div className="text-xs text-muted-foreground mt-1">
                                Edited
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {record.status === "open" && (
                                <Button
                                  size="sm"
                                  onClick={() => openCloseDipDialog(record)}
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                >
                                  <CheckCircle2 className="h-4 w-4 mr-1" />
                                  Close Day
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openEditDipDialog(record)}
                                title="Edit record"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              {record.edit_history && (record.edit_history as DipRecordEditEntry[]).length > 0 && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openViewHistoryDialog(record)}
                                  title="View edit history"
                                >
                                  <History className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={() => openDeleteDipDialog(record)}
                                title="Delete record"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {dipRecords.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground py-12">
                          <div className="flex flex-col items-center">
                            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                              <ClipboardList className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <p className="text-lg font-medium mb-1">No Records Found</p>
                            <p className="text-sm text-muted-foreground">Start your day by recording opening tank levels</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions">
            <Card>
              <CardHeader>
                <CardTitle>Transaction History</CardTitle>
                <CardDescription>All fuel dispensing and refilling activities</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Bunker</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Driver</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell>{formatDate(tx.transaction_date)}</TableCell>
                        <TableCell>{(tx.bunker as { name: string })?.name || "Unknown"}</TableCell>
                        <TableCell>
                          <Badge
                            variant={tx.transaction_type === "dispense" ? "destructive" : "default"}
                          >
                            {tx.transaction_type === "dispense" ? (
                              <ArrowDownCircle className="h-3 w-3 mr-1" />
                            ) : (
                              <ArrowUpCircle className="h-3 w-3 mr-1" />
                            )}
                            {tx.transaction_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {tx.transaction_type === "dispense" ? "-" : "+"}
                          {tx.quantity_liters.toLocaleString()} L
                        </TableCell>
                        <TableCell>{tx.vehicle_fleet_number || "-"}</TableCell>
                        <TableCell>{tx.driver_name || "-"}</TableCell>
                        <TableCell className="text-right">
                          {tx.total_cost ? `$${tx.total_cost.toFixed(2)}` : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                    {transactions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          No transactions yet
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Create Bunker Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Fuel Bunker</DialogTitle>
            <DialogDescription>Create a new fuel storage tank or depot</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="Main Diesel Tank"
                value={formData.name || ""}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                placeholder="Depot A"
                value={formData.location || ""}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="fuel_type">Fuel Type</Label>
                <Select
                  value={formData.fuel_type || "Diesel"}
                  onValueChange={(value) => setFormData({ ...formData, fuel_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FUEL_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="capacity">Capacity (L) *</Label>
                <Input
                  id="capacity"
                  type="number"
                  placeholder="10000"
                  value={formData.capacity_liters || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, capacity_liters: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="initial_level">Initial Level (L)</Label>
                <Input
                  id="initial_level"
                  type="number"
                  placeholder="5000"
                  value={formData.current_level_liters || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      current_level_liters: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="unit_cost">Unit Cost ($/L)</Label>
                <Input
                  id="unit_cost"
                  type="number"
                  step="0.01"
                  placeholder="1.50"
                  value={formData.unit_cost || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, unit_cost: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="min_alert">Low Level Alert (L)</Label>
              <Input
                id="min_alert"
                type="number"
                placeholder="1000"
                value={formData.min_level_alert || ""}
                onChange={(e) =>
                  setFormData({ ...formData, min_level_alert: parseFloat(e.target.value) || 0 })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateBunker} disabled={createBunker.isPending}>
              {createBunker.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Bunker
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Bunker Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <Settings className="h-5 w-5 inline mr-2" />
              Edit Bunker
            </DialogTitle>
            <DialogDescription>Update bunker settings</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit_name">Name</Label>
              <Input
                id="edit_name"
                value={formData.name || ""}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit_location">Location</Label>
              <Input
                id="edit_location"
                value={formData.location || ""}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit_fuel_type">Fuel Type</Label>
                <Select
                  value={formData.fuel_type || "Diesel"}
                  onValueChange={(value) => setFormData({ ...formData, fuel_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FUEL_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit_capacity">Capacity (L)</Label>
                <Input
                  id="edit_capacity"
                  type="number"
                  value={formData.capacity_liters || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, capacity_liters: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit_unit_cost">Unit Cost ($/L)</Label>
                <Input
                  id="edit_unit_cost"
                  type="number"
                  step="0.01"
                  value={formData.unit_cost || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, unit_cost: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit_min_alert">Low Level Alert (L)</Label>
                <Input
                  id="edit_min_alert"
                  type="number"
                  value={formData.min_level_alert || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, min_level_alert: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateBunker} disabled={updateBunker.isPending}>
              {updateBunker.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjust Level Dialog */}
      <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <Sliders className="h-5 w-5 inline mr-2 text-blue-500" />
              Adjust Fuel Level
            </DialogTitle>
            <DialogDescription>
              Manually adjust the current fuel level for <strong>{selectedBunker?.name}</strong>
              <br />
              Current Level: {selectedBunker?.current_level_liters.toLocaleString()} L
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-sm">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span>
                  This will directly update the bunker level. A reason is required for audit purposes.
                </span>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="adjust_level">New Level (Liters) *</Label>
              <Input
                id="adjust_level"
                type="number"
                placeholder="Enter new level"
                value={adjustData.new_level}
                onChange={(e) =>
                  setAdjustData({ ...adjustData, new_level: e.target.value })
                }
              />
              {selectedBunker && adjustData.new_level && (
                <p className="text-xs text-muted-foreground">
                  Difference: {(parseFloat(adjustData.new_level) - selectedBunker.current_level_liters) > 0 ? '+' : ''}
                  {(parseFloat(adjustData.new_level) - selectedBunker.current_level_liters).toLocaleString()} L
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="adjust_reason">Reason for Adjustment *</Label>
              <Textarea
                id="adjust_reason"
                placeholder="e.g., Physical stock count correction, Spillage, Meter recalibration..."
                value={adjustData.reason}
                onChange={(e) =>
                  setAdjustData({ ...adjustData, reason: e.target.value })
                }
                className="min-h-[80px]"
              />
              {!adjustData.reason.trim() && (
                <p className="text-xs text-red-500">A reason is required</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="adjust_by">Adjusted By *</Label>
              <Input
                id="adjust_by"
                type="text"
                placeholder="Enter your name"
                value={adjustData.adjusted_by}
                onChange={(e) =>
                  setAdjustData({ ...adjustData, adjusted_by: e.target.value })
                }
              />
              {!adjustData.adjusted_by.trim() && (
                <p className="text-xs text-red-500">Name is required</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAdjustLevel}
              disabled={
                adjustBunkerLevel.isPending ||
                !adjustData.new_level ||
                !adjustData.reason.trim() ||
                !adjustData.adjusted_by.trim()
              }
            >
              {adjustBunkerLevel.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm Adjustment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dispense Fuel Dialog */}
      <Dialog open={dispenseDialogOpen} onOpenChange={setDispenseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <ArrowDownCircle className="h-5 w-5 inline mr-2 text-red-500" />
              Dispense Fuel
            </DialogTitle>
            <DialogDescription>
              Dispense fuel from <strong>{selectedBunker?.name}</strong>
              <br />
              Available: {selectedBunker?.current_level_liters.toLocaleString()} L
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="dispense_qty">Quantity (L) *</Label>
              <Input
                id="dispense_qty"
                type="number"
                placeholder="100"
                value={dispenseData.quantity_liters}
                onChange={(e) => setDispenseData({ ...dispenseData, quantity_liters: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dispense_vehicle">Vehicle</Label>
              <Select
                value={dispenseData.vehicle_id}
                onValueChange={(value) => {
                  const vehicle = vehicles.find((v) => v.id === value);
                  setDispenseData({
                    ...dispenseData,
                    vehicle_id: value,
                    vehicle_fleet_number: vehicle?.fleet_number || "",
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.fleet_number} - {v.make} {v.model}
                      {isBowserVehicle(v.id) && " 🚿 (Bowser)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* Bowser detection warning */}
              {dispenseData.vehicle_id && isBowserVehicle(dispenseData.vehicle_id) && (
                <div className="p-2 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-md">
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 text-sm">
                    <Fuel className="h-4 w-4 flex-shrink-0" />
                    <span>
                      <strong>Diesel Bowser Detected:</strong> This fuel will be transferred to the bowser for field distribution.
                    </span>
                  </div>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="dispense_odometer">Odometer (km)</Label>
                <Input
                  id="dispense_odometer"
                  type="number"
                  placeholder="125000"
                  value={dispenseData.odometer_reading}
                  onChange={(e) =>
                    setDispenseData({ ...dispenseData, odometer_reading: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="dispense_driver">Driver</Label>
                <Input
                  id="dispense_driver"
                  placeholder="John Doe"
                  value={dispenseData.driver_name}
                  onChange={(e) => setDispenseData({ ...dispenseData, driver_name: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dispense_notes">Notes</Label>
              <Textarea
                id="dispense_notes"
                placeholder="Additional notes..."
                value={dispenseData.notes}
                onChange={(e) => setDispenseData({ ...dispenseData, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDispenseDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleDispenseFuel}
              disabled={dispenseFuel.isPending || !dispenseData.quantity_liters}
              variant="destructive"
            >
              {dispenseFuel.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Dispense Fuel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Refill Bunker Dialog */}
      <Dialog open={refillDialogOpen} onOpenChange={setRefillDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <ArrowUpCircle className="h-5 w-5 inline mr-2 text-green-500" />
              Refill Bunker
            </DialogTitle>
            <DialogDescription>
              Add fuel to <strong>{selectedBunker?.name}</strong>
              <br />
              Current: {selectedBunker?.current_level_liters.toLocaleString()} L / Capacity:{" "}
              {selectedBunker?.capacity_liters.toLocaleString()} L
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="refill_qty">Quantity (L) *</Label>
              <Input
                id="refill_qty"
                type="number"
                placeholder="5000"
                value={refillData.quantity_liters}
                onChange={(e) => setRefillData({ ...refillData, quantity_liters: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="refill_cost">Unit Cost ($/L)</Label>
                <Input
                  id="refill_cost"
                  type="number"
                  step="0.01"
                  placeholder="1.50"
                  value={refillData.unit_cost}
                  onChange={(e) => setRefillData({ ...refillData, unit_cost: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="refill_ref">Reference/Invoice #</Label>
                <Input
                  id="refill_ref"
                  placeholder="INV-12345"
                  value={refillData.reference_number}
                  onChange={(e) => setRefillData({ ...refillData, reference_number: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="refill_notes">Notes</Label>
              <Textarea
                id="refill_notes"
                placeholder="Supplier details, delivery notes..."
                value={refillData.notes}
                onChange={(e) => setRefillData({ ...refillData, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefillDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleRefillBunker}
              disabled={refillBunker.isPending || !refillData.quantity_liters}
            >
              {refillBunker.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Refill Bunker
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Fuel Bunker</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{selectedBunker?.name}</strong>? This will also
              delete all transaction history for this bunker. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBunker}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Open Daily Dip Record Dialog */}
      <Dialog open={openDipDialogOpen} onOpenChange={setOpenDipDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Open Daily Dip Record
            </DialogTitle>
            <DialogDescription>
              Record the opening tank level and pump meter reading for today
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="dip_bunker">Bunker *</Label>
              <Select
                value={openDipData.bunker_id}
                onValueChange={(value) => {
                  const bunker = bunkers.find((b) => b.id === value);
                  setOpenDipData({
                    ...openDipData,
                    bunker_id: value,
                    opening_volume_liters: bunker?.current_level_liters.toString() || "",
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select bunker" />
                </SelectTrigger>
                <SelectContent>
                  {bunkers.filter((b) => b.is_active).map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name} ({b.fuel_type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dip_date">Date</Label>
              <DatePicker
                id="dip_date"
                value={openDipData.record_date}
                onChange={(date) => setOpenDipData({ ...openDipData, record_date: date ? date.toISOString().split('T')[0] : '' })}
                placeholder="Select date"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="opening_dip">Opening Dip (cm)</Label>
                <Input
                  id="opening_dip"
                  type="number"
                  step="0.1"
                  placeholder="e.g., 120.5"
                  value={openDipData.opening_dip_cm}
                  onChange={(e) => setOpenDipData({ ...openDipData, opening_dip_cm: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="opening_volume">Opening Volume (L) *</Label>
                <Input
                  id="opening_volume"
                  type="number"
                  placeholder="e.g., 7021"
                  value={openDipData.opening_volume_liters}
                  onChange={(e) =>
                    setOpenDipData({ ...openDipData, opening_volume_liters: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="opening_pump">Opening Pump Reading</Label>
              <Input
                id="opening_pump"
                type="number"
                step="0.001"
                placeholder="e.g., 4169822"
                value={openDipData.opening_pump_reading}
                onChange={(e) =>
                  setOpenDipData({ ...openDipData, opening_pump_reading: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dip_recorded_by">Recorded By</Label>
              <Input
                id="dip_recorded_by"
                placeholder="Your name"
                value={openDipData.recorded_by}
                onChange={(e) => setOpenDipData({ ...openDipData, recorded_by: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dip_notes">Notes</Label>
              <Textarea
                id="dip_notes"
                placeholder="Any observations..."
                value={openDipData.notes}
                onChange={(e) => setOpenDipData({ ...openDipData, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDipDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleOpenDipRecord}
              disabled={createDipRecord.isPending || !openDipData.bunker_id || !openDipData.opening_volume_liters}
            >
              {createDipRecord.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Open Day
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Daily Dip Record Dialog */}
      <Dialog open={closeDipDialogOpen} onOpenChange={setCloseDipDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Close Daily Dip Record
            </DialogTitle>
            <DialogDescription>
              Record the closing tank level and pump meter reading to calculate reconciliation
            </DialogDescription>
          </DialogHeader>
          {selectedDipRecord && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Bunker:</span>
                <span className="font-medium">
                  {(selectedDipRecord.bunker as { name: string })?.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date:</span>
                <span className="font-medium">{formatDate(selectedDipRecord.record_date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Opening Volume (A):</span>
                <span className="font-mono font-medium">
                  {selectedDipRecord.opening_volume_liters.toLocaleString()} L
                </span>
              </div>
              {selectedDipRecord.opening_pump_reading && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Opening Pump (D):</span>
                  <span className="font-mono font-medium">
                    {selectedDipRecord.opening_pump_reading.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          )}
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="closing_dip">Closing Dip (cm)</Label>
                <Input
                  id="closing_dip"
                  type="number"
                  step="0.1"
                  placeholder="e.g., 110.2"
                  value={closeDipData.closing_dip_cm}
                  onChange={(e) =>
                    setCloseDipData({ ...closeDipData, closing_dip_cm: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="closing_volume">Closing Volume (B) *</Label>
                <Input
                  id="closing_volume"
                  type="number"
                  placeholder="e.g., 6304"
                  value={closeDipData.closing_volume_liters}
                  onChange={(e) =>
                    setCloseDipData({ ...closeDipData, closing_volume_liters: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="closing_pump">Closing Pump Reading (E)</Label>
              <Input
                id="closing_pump"
                type="number"
                step="0.001"
                placeholder="e.g., 4170544"
                value={closeDipData.closing_pump_reading}
                onChange={(e) =>
                  setCloseDipData({ ...closeDipData, closing_pump_reading: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="close_notes">Notes</Label>
              <Textarea
                id="close_notes"
                placeholder="Any observations..."
                value={closeDipData.notes}
                onChange={(e) => setCloseDipData({ ...closeDipData, notes: e.target.value })}
              />
            </div>

            {/* Live Calculation Preview */}
            {closeDipData.closing_volume_liters && selectedDipRecord && (
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-2">
                <h4 className="font-semibold text-sm text-blue-800 dark:text-blue-200">
                  Reconciliation Preview
                </h4>
                <div className="grid grid-cols-3 gap-4 text-xs">
                  <div>
                    <div className="text-muted-foreground">Tank Usage (C)</div>
                    <div className="font-mono font-bold">
                      {(
                        selectedDipRecord.opening_volume_liters -
                        parseFloat(closeDipData.closing_volume_liters)
                      ).toLocaleString()}{" "}
                      L
                    </div>
                  </div>
                  {closeDipData.closing_pump_reading && selectedDipRecord.opening_pump_reading && (
                    <>
                      <div>
                        <div className="text-muted-foreground">Pump Issued (F)</div>
                        <div className="font-mono font-bold">
                          {(
                            parseFloat(closeDipData.closing_pump_reading) -
                            selectedDipRecord.opening_pump_reading
                          ).toLocaleString()}{" "}
                          L
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Variance (G)</div>
                        <div
                          className={`font-mono font-bold ${
                            Math.abs(
                              selectedDipRecord.opening_volume_liters -
                                parseFloat(closeDipData.closing_volume_liters) -
                                (parseFloat(closeDipData.closing_pump_reading) -
                                  selectedDipRecord.opening_pump_reading)
                            ) <= 10
                              ? "text-green-600"
                              : selectedDipRecord.opening_volume_liters -
                                  parseFloat(closeDipData.closing_volume_liters) -
                                  (parseFloat(closeDipData.closing_pump_reading) -
                                    selectedDipRecord.opening_pump_reading) >
                                0
                              ? "text-red-600"
                              : "text-orange-500"
                          }`}
                        >
                          {(
                            selectedDipRecord.opening_volume_liters -
                            parseFloat(closeDipData.closing_volume_liters) -
                            (parseFloat(closeDipData.closing_pump_reading) -
                              selectedDipRecord.opening_pump_reading)
                          ).toLocaleString()}{" "}
                          L
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseDipDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCloseDipRecord}
              disabled={closeDipRecord.isPending || !closeDipData.closing_volume_liters}
            >
              {closeDipRecord.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Close & Reconcile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dip Record Dialog */}
      <Dialog open={editDipDialogOpen} onOpenChange={setEditDipDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Edit Dip Record
            </DialogTitle>
            <DialogDescription>
              Make corrections to this dip record. All changes will be tracked with an audit trail.
            </DialogDescription>
          </DialogHeader>
          {selectedDipRecord && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm mb-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Bunker:</span>
                <span className="font-medium">
                  {(selectedDipRecord.bunker as { name: string })?.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date:</span>
                <span className="font-medium">{formatDate(selectedDipRecord.record_date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <Badge variant="outline">{selectedDipRecord.status}</Badge>
              </div>
            </div>
          )}
          <div className="grid gap-4 py-4 max-h-[400px] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit_opening_dip">Opening Dip (cm)</Label>
                <Input
                  id="edit_opening_dip"
                  type="number"
                  step="0.1"
                  value={editDipData.opening_dip_cm}
                  onChange={(e) => setEditDipData({ ...editDipData, opening_dip_cm: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit_opening_volume">Opening Volume (L) *</Label>
                <Input
                  id="edit_opening_volume"
                  type="number"
                  value={editDipData.opening_volume_liters}
                  onChange={(e) => setEditDipData({ ...editDipData, opening_volume_liters: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit_opening_pump">Opening Pump Reading</Label>
              <Input
                id="edit_opening_pump"
                type="number"
                step="0.001"
                value={editDipData.opening_pump_reading}
                onChange={(e) => setEditDipData({ ...editDipData, opening_pump_reading: e.target.value })}
              />
            </div>
            <div className="border-t pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit_closing_dip">Closing Dip (cm)</Label>
                  <Input
                    id="edit_closing_dip"
                    type="number"
                    step="0.1"
                    value={editDipData.closing_dip_cm}
                    onChange={(e) => setEditDipData({ ...editDipData, closing_dip_cm: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit_closing_volume">Closing Volume (L)</Label>
                  <Input
                    id="edit_closing_volume"
                    type="number"
                    value={editDipData.closing_volume_liters}
                    onChange={(e) => setEditDipData({ ...editDipData, closing_volume_liters: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid gap-2 mt-4">
                <Label htmlFor="edit_closing_pump">Closing Pump Reading</Label>
                <Input
                  id="edit_closing_pump"
                  type="number"
                  step="0.001"
                  value={editDipData.closing_pump_reading}
                  onChange={(e) => setEditDipData({ ...editDipData, closing_pump_reading: e.target.value })}
                />
              </div>
            </div>
            <div className="border-t pt-4">
              <div className="grid gap-2">
                <Label htmlFor="edit_recorded_by">Recorded By</Label>
                <Input
                  id="edit_recorded_by"
                  value={editDipData.recorded_by}
                  onChange={(e) => setEditDipData({ ...editDipData, recorded_by: e.target.value })}
                />
              </div>
              <div className="grid gap-2 mt-4">
                <Label htmlFor="edit_notes">Notes</Label>
                <Textarea
                  id="edit_notes"
                  value={editDipData.notes}
                  onChange={(e) => setEditDipData({ ...editDipData, notes: e.target.value })}
                />
              </div>
            </div>
            <div className="border-t pt-4 bg-amber-50 dark:bg-amber-950 -mx-4 px-4 pb-2">
              <div className="grid gap-2">
                <Label htmlFor="edit_edited_by" className="text-amber-800 dark:text-amber-200">
                  Your Name (for audit trail) *
                </Label>
                <Input
                  id="edit_edited_by"
                  placeholder="Enter your name"
                  value={editDipData.edited_by}
                  onChange={(e) => setEditDipData({ ...editDipData, edited_by: e.target.value })}
                />
              </div>
              <div className="grid gap-2 mt-4">
                <Label htmlFor="edit_reason" className="text-amber-800 dark:text-amber-200">
                  Reason for Edit *
                </Label>
                <Textarea
                  id="edit_reason"
                  placeholder="Explain why you are making this change..."
                  value={editDipData.edit_reason}
                  onChange={(e) => setEditDipData({ ...editDipData, edit_reason: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDipDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleEditDipRecord}
              disabled={editDipRecord.isPending || !editDipData.edit_reason || !editDipData.edited_by}
            >
              {editDipRecord.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dip Record Confirmation */}
      <AlertDialog open={deleteDipDialogOpen} onOpenChange={setDeleteDipDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Delete Dip Record
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this dip record? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {selectedDipRecord && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm my-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Bunker:</span>
                <span className="font-medium">
                  {(selectedDipRecord.bunker as { name: string })?.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date:</span>
                <span className="font-medium">{formatDate(selectedDipRecord.record_date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Opening Volume:</span>
                <span className="font-mono">{selectedDipRecord.opening_volume_liters.toLocaleString()} L</span>
              </div>
            </div>
          )}
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="delete_by">Your Name *</Label>
              <Input
                id="delete_by"
                placeholder="Enter your name"
                value={deleteDipBy}
                onChange={(e) => setDeleteDipBy(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="delete_reason">Reason for Deletion *</Label>
              <Textarea
                id="delete_reason"
                placeholder="Why is this record being deleted?"
                value={deleteDipReason}
                onChange={(e) => setDeleteDipReason(e.target.value)}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDipRecord}
              disabled={deleteDipRecord.isPending || !deleteDipReason || !deleteDipBy}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteDipRecord.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete Record
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Edit History Dialog */}
      <Dialog open={viewDipHistoryDialogOpen} onOpenChange={setViewDipHistoryDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Edit History
            </DialogTitle>
            <DialogDescription>
              Complete audit trail of all changes made to this dip record
            </DialogDescription>
          </DialogHeader>
          {selectedDipRecord && (
            <>
              <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bunker:</span>
                  <span className="font-medium">
                    {(selectedDipRecord.bunker as { name: string })?.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date:</span>
                  <span className="font-medium">{formatDate(selectedDipRecord.record_date)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Edited:</span>
                  <span className="font-medium">
                    {selectedDipRecord.last_edited_at
                      ? `${formatDate(selectedDipRecord.last_edited_at)} by ${selectedDipRecord.last_edited_by}`
                      : "Never edited"}
                  </span>
                </div>
              </div>
              <ScrollArea className="h-[400px] mt-4">
                <div className="space-y-4">
                  {((selectedDipRecord.edit_history || []) as DipRecordEditEntry[])
                    .slice()
                    .reverse()
                    .map((entry, index) => (
                      <div key={index} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{entry.edited_by}</Badge>
                            <span className="text-sm text-muted-foreground">
                              {formatDate(entry.timestamp)}
                            </span>
                          </div>
                        </div>
                        {entry.reason && (
                          <div className="text-sm bg-muted/50 rounded p-2">
                            <span className="font-medium">Reason:</span> {entry.reason}
                          </div>
                        )}
                        <div className="space-y-2">
                          <div className="text-sm font-medium">Changes:</div>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-[150px]">Field</TableHead>
                                <TableHead>Old Value</TableHead>
                                <TableHead>New Value</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {entry.changes.map((change, changeIdx) => (
                                <TableRow key={changeIdx}>
                                  <TableCell className="font-medium">
                                    {change.field.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                                  </TableCell>
                                  <TableCell className="font-mono text-red-600">
                                    {change.old_value ?? "—"}
                                  </TableCell>
                                  <TableCell className="font-mono text-green-600">
                                    {change.new_value ?? "—"}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    ))}
                  {(!selectedDipRecord.edit_history ||
                    (selectedDipRecord.edit_history as DipRecordEditEntry[]).length === 0) && (
                    <div className="text-center text-muted-foreground py-8">
                      <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      No edit history for this record
                    </div>
                  )}
                </div>
              </ScrollArea>
            </>
          )}
          <DialogFooter>
            <Button onClick={() => setViewDipHistoryDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default FuelBunkerManagement;