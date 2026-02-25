import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getFleetConfig } from "@/constants/fleetTyreConfig";
import { useFleetTyrePositions } from "@/hooks/useFleetTyrePositions";
import { useRealtimeTyres } from "@/hooks/useRealtimeTyres";
import { useVehicles } from "@/hooks/useVehicles";
import type { LucideIcon } from "lucide-react";
import
  {
    AlertTriangle,
    CheckCircle2,
    ChevronRight,
    Circle,
    ClipboardCheck,
    History,
    MoreHorizontal,
    Pencil,
    Plus,
    Search,
    Trash2,
    XCircle
  } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import TyreInspectionDialog from "./tyres/TyreInspectionDialog";
import TyreLifecycleDialog from "./tyres/TyreLifecycleDialog";
import TyreManagementDialog from "./tyres/TyreManagementDialog";

type TyreCondition = "excellent" | "good" | "fair" | "poor" | "needs_replacement" | "critical";

interface PositionData {
  position: string;
  positionLabel: string;
  tyreCode: string | null;
  tyreId: string | null;
  dotCode: string | null;
  serialNumber: string | null;
  brand: string | null;
  model: string | null;
  size: string | null;
  condition: TyreCondition | null;
  currentTreadDepth: number | null;
  initialTreadDepth: number | null;
  kmTravelled: number | null;
  installationKm: number | null;
  type: string | null;
  nextInspectionDate: string | null;
  lastInspectionDate: string | null;
}

// Helper to check inspection status
// const getInspectionStatus = (nextInspectionDate: string | null): { status: "ok" | "due-soon" | "overdue" | "none"; daysUntil: number | null } => {
//   if (!nextInspectionDate) return { status: "none", daysUntil: null };

//   const now = new Date();
//   const dueDate = new Date(nextInspectionDate);
//   const diffTime = dueDate.getTime() - now.getTime();
//   const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

//   if (diffDays < 0) return { status: "overdue", daysUntil: diffDays };
//   if (diffDays <= 7) return { status: "due-soon", daysUntil: diffDays };
//   return { status: "ok", daysUntil: diffDays };
// };

const TyreInspection = () => {
  const [vehicleId, setVehicleId] = useState("");
  const [positions, setPositions] = useState<PositionData[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [inspectionDialogOpen, setInspectionDialogOpen] = useState(false);
  const [lifecycleDialogOpen, setLifecycleDialogOpen] = useState(false);
  const [managementDialogOpen, setManagementDialogOpen] = useState(false);
  const [managementMode, setManagementMode] = useState<"install" | "remove" | "edit">("install");
  const [selectedPosition, setSelectedPosition] = useState<PositionData | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const { data: vehicles } = useVehicles();
  useRealtimeTyres();

  // Determine vehicle category from fleet number
  const getVehicleCategory = (fleetNumber: string | null): string => {
    if (!fleetNumber) return "Unassigned";
    // LMV (Light Motor Vehicles): 14L, 15L, 16L
    if (fleetNumber.endsWith('L')) return "LMV";
    // Trailers: 1T, 2T, 3T, 4T
    if (fleetNumber.endsWith('T')) return "Trailer";
    // Reefers: 4F, 5F, 6F, etc.
    if (fleetNumber.endsWith('F')) return "Reefer";
    // Horses: Everything ending with H, or other trucks
    if (fleetNumber.endsWith('H') || fleetNumber === 'UD') return "Horse";
    return "Other";
  };

  // Group vehicles by category, then by fleet number within each category
  const vehiclesByCategory = (vehicles || []).reduce<Record<string, Record<string, typeof vehicles>>>((acc, vehicle) => {
    const category = getVehicleCategory(vehicle.fleet_number);
    const fleetNumber = vehicle.fleet_number || "Unassigned";
    
    if (!acc[category]) {
      acc[category] = {};
    }
    if (!acc[category][fleetNumber]) {
      acc[category][fleetNumber] = [];
    }
    acc[category][fleetNumber]!.push(vehicle);
    return acc;
  }, {});

  // Define category order
  const categoryConfig: Record<string, { label: string; tyreCount: string }> = {
    Horse: { label: "Horse", tyreCount: "10 + spare" },
    Reefer: { label: "Reefer", tyreCount: "12 tyres" },
    Trailer: { label: "Interlink", tyreCount: "12 tyres" },
    LMV: { label: "LMV", tyreCount: "4–6 tyres" },
    Other: { label: "Other", tyreCount: "Varies" },
    Unassigned: { label: "Unassigned", tyreCount: "-" },
  };

  const sortedCategories = ["Horse", "Reefer", "Trailer", "LMV", "Other", "Unassigned"]
    .filter(cat => vehiclesByCategory[cat] && Object.keys(vehiclesByCategory[cat]).length > 0);

  const filteredVehiclesByCategory = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return sortedCategories.reduce<Record<string, typeof vehicles>>((acc, category) => {
      if (categoryFilter !== "all" && category !== categoryFilter) return acc;

      const fleetsInCategory = vehiclesByCategory[category] || {};
      const categoryVehicles = Object.values(fleetsInCategory).flat();

      const filtered = !term
        ? categoryVehicles
        : categoryVehicles.filter((vehicle) => {
            const fleet = vehicle.fleet_number?.toLowerCase() || "";
            const reg = vehicle.registration_number?.toLowerCase() || "";
            const make = vehicle.make?.toLowerCase() || "";
            const model = vehicle.model?.toLowerCase() || "";
            return (
              fleet.includes(term) ||
              reg.includes(term) ||
              make.includes(term) ||
              model.includes(term)
            );
          });

      if (filtered.length > 0) {
        acc[category] = filtered;
      }
      return acc;
    }, {});
  }, [sortedCategories, categoryFilter, vehiclesByCategory, searchTerm]);

  const visibleCategories = sortedCategories.filter(
    (category) => (filteredVehiclesByCategory[category] || []).length > 0
  );

  const totalVisibleVehicles = visibleCategories.reduce(
    (sum, category) => sum + (filteredVehiclesByCategory[category]?.length || 0),
    0
  );

  // Toggle category expansion
  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  // Get selected vehicle
  const selectedVehicle = vehicles?.find((v) => v.id === vehicleId);
  const vehicleRegistration = selectedVehicle?.registration_number || "";
  const vehicleFleetNumber = selectedVehicle?.fleet_number || null;

  // Get fleet configuration and positions
  const fleetConfig = vehicleFleetNumber
    ? getFleetConfig(vehicleFleetNumber)
    : null;
  const { data: fleetPositions } = useFleetTyrePositions({
    vehicleRegistration,
    fleetNumber: vehicleFleetNumber,
  });

  // Build position data when vehicle or fleet positions change
  useEffect(() => {
    // Show positions from fleet config even if no tyres installed yet
    if (fleetConfig) {
      const positionData = fleetConfig.positions.map((pos) => {
        // Find existing position data if available
        const existingData = (fleetPositions || []).find(
          (fp) => fp.position === pos.position
        );
        const tyreDetails = existingData?.tyre_details;
        return {
          position: pos.position,
          positionLabel: pos.label,
          tyreCode: existingData?.tyre_code || null,
          tyreId: tyreDetails?.id || null,
          dotCode: tyreDetails?.dot_code || null,
          serialNumber: tyreDetails?.serial_number || null,
          brand: tyreDetails?.brand || null,
          model: tyreDetails?.model || null,
          size: tyreDetails?.size || null,
          condition: (tyreDetails?.condition as TyreCondition) || null,
          currentTreadDepth: tyreDetails?.current_tread_depth || null,
          initialTreadDepth: tyreDetails?.initial_tread_depth || null,
          kmTravelled: tyreDetails?.km_travelled || null,
          installationKm: tyreDetails?.installation_km || null,
          type: tyreDetails?.type || null,
          nextInspectionDate: tyreDetails?.next_inspection_date || null,
          lastInspectionDate: tyreDetails?.last_inspection_date || null,
        };
      });
      setPositions(positionData);
    } else {
      setPositions([]);
    }
  }, [fleetConfig, fleetPositions]);

  const handleInspect = (position: PositionData) => {
    setSelectedPosition(position);
    setInspectionDialogOpen(true);
  };

  const handleViewLifecycle = (position: PositionData) => {
    setSelectedPosition(position);
    setLifecycleDialogOpen(true);
  };

  const handleInstall = (position: PositionData) => {
    setSelectedPosition(position);
    setManagementMode("install");
    setManagementDialogOpen(true);
  };

  const handleRemove = (position: PositionData) => {
    setSelectedPosition(position);
    setManagementMode("remove");
    setManagementDialogOpen(true);
  };

  const handleEdit = (position: PositionData) => {
    setSelectedPosition(position);
    setManagementMode("edit");
    setManagementDialogOpen(true);
  };

  const getConditionBadge = (condition: TyreCondition | null) => {
    if (!condition) {
      return (
        <Badge variant="outline" className="text-muted-foreground">
          <Circle className="w-3 h-3 mr-1" />
          Unknown
        </Badge>
      );
    }
    type BadgeVariant = "default" | "secondary" | "outline" | "destructive";
    const variants: Record<
      TyreCondition,
      { icon: LucideIcon; variant: BadgeVariant }
    > = {
      excellent: { icon: CheckCircle2, variant: "default" },
      good: { icon: CheckCircle2, variant: "secondary" },
      fair: { icon: AlertTriangle, variant: "outline" },
      poor: { icon: AlertTriangle, variant: "destructive" },
      critical: { icon: XCircle, variant: "destructive" },
      needs_replacement: { icon: XCircle, variant: "destructive" },
    };

    const { icon: Icon, variant } = variants[condition];
    return (
      <Badge variant={variant}>
        <Icon className="w-3 h-3 mr-1" />
        {condition.replace("_", " ")}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Vehicle Selection by Fleet */}
      <Card className="shadow-card">
        <CardHeader className="pb-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <CardTitle className="text-xl">Vehicle Store</CardTitle>
              <CardDescription>
                Select a fleet vehicle and manage tyre positions, inspections, and lifecycle actions
              </CardDescription>
            </div>
            <Badge className="w-fit text-sm px-3 py-1.5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-sm shadow-blue-500/30">
              {totalVisibleVehicles} Active Vehicle{totalVisibleVehicles === 1 ? "" : "s"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by fleet, registration, make or model"
                className="pl-9"
              />
            </div>

            <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto lg:items-center">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {sortedCategories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {categoryConfig[category]?.label || category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Badge variant="outline" className="h-10 px-3 justify-center sm:justify-start bg-muted/40 border-muted">
                Showing {totalVisibleVehicles} vehicle{totalVisibleVehicles === 1 ? "" : "s"}
              </Badge>
            </div>
          </div>

          {visibleCategories.length === 0 ? (
            <p className="text-muted-foreground text-sm">No vehicles found</p>
          ) : (
            visibleCategories.map((category) => {
              const categoryData = categoryConfig[category];
              const categoryVehicles = filteredVehiclesByCategory[category] || [];
              const fleetNumbers = Array.from(
                new Set(categoryVehicles.map((vehicle) => vehicle.fleet_number || "Unassigned"))
              ).sort((a, b) => {
                const numA = parseInt(a);
                const numB = parseInt(b);
                if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                return a.localeCompare(b);
              });
              const totalVehicles = categoryVehicles.length;
              const isExpanded = expandedCategories.has(category);

              return (
                <Collapsible
                  key={category}
                  open={isExpanded}
                  onOpenChange={() => toggleCategory(category)}
                >
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-between px-4 py-3 h-auto rounded-lg border bg-gradient-to-r from-muted/70 to-muted/40 hover:from-muted/80 hover:to-muted/50 transition-all"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-5 h-5 rounded flex items-center justify-center transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
                          <ChevronRight className="w-4 h-4" />
                        </div>
                        <span className="font-semibold text-sm">{categoryData?.label || category}</span>
                        <span className="text-xs text-muted-foreground">{categoryData?.tyreCount || "-"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs font-medium bg-background/80 border-muted">
                          {fleetNumbers.length} fleets
                        </Badge>
                        <Badge className="text-xs font-medium bg-gradient-to-r from-violet-600 to-indigo-500 text-white shadow-sm">
                          {totalVehicles} vehicles
                        </Badge>
                      </div>
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="ml-2 mt-2 space-y-1 border-l border-border/70 pl-3">
                      {fleetNumbers.flatMap((fleetNumber) => {
                        const fleetVehicles = categoryVehicles.filter(
                          (vehicle) => (vehicle.fleet_number || "Unassigned") === fleetNumber
                        );
                        
                        return fleetVehicles.map((vehicle) => {
                          const isSelected = vehicleId === vehicle.id;
                          const fleetConf = fleetNumber !== "Unassigned" ? getFleetConfig(fleetNumber) : null;
                          
                          return (
                            <div key={vehicle.id}>
                              <Button
                                variant={isSelected ? "secondary" : "ghost"}
                                size="sm"
                                className={`w-full justify-start gap-3 h-10 rounded-md text-sm transition-colors ${
                                  isSelected
                                    ? "border border-primary/30 bg-primary/5 text-primary"
                                    : "hover:bg-muted/60"
                                }`}
                                onClick={() => setVehicleId(isSelected ? "" : vehicle.id)}
                              >
                                <div className={`transition-transform duration-200 ${isSelected ? 'rotate-90' : ''}`}>
                                  <ChevronRight className="w-3 h-3" />
                                </div>
                                <span className="font-semibold">Fleet {fleetNumber}</span>
                                <span className="text-muted-foreground">•</span>
                                <span className="font-medium text-muted-foreground">{vehicle.registration_number}</span>
                                {fleetConf && (
                                  <span className="ml-auto px-2 py-0.5 rounded bg-muted text-xs font-medium">
                                    {fleetConf.positions.length} positions
                                  </span>
                                )}
                              </Button>
                                    
                                    {/* Inline Tyre Table - appears directly under selected vehicle */}
                                    {isSelected && positions.length > 0 && (
                                      <div className="mt-3 mb-4 border rounded-lg overflow-hidden bg-background overflow-x-auto">
                                        <Table className="min-w-[700px]">
                                          <TableHeader>
                                            <TableRow className="bg-gradient-to-r from-muted/80 to-muted/50 hover:from-muted/80 hover:to-muted/50 border-b-2 border-muted">
                                              <TableHead className="min-w-[120px] text-xs py-3.5 font-semibold text-foreground/80 uppercase tracking-wide">Position</TableHead>
                                              <TableHead className="min-w-[160px] text-xs py-3.5 font-semibold text-foreground/80 uppercase tracking-wide">DOT / Serial</TableHead>
                                              <TableHead className="min-w-[140px] text-xs py-3.5 font-semibold text-foreground/80 uppercase tracking-wide">Brand / Model</TableHead>
                                              <TableHead className="min-w-[90px] text-xs py-3.5 font-semibold text-foreground/80 uppercase tracking-wide">Size</TableHead>
                                              <TableHead className="min-w-[120px] text-xs py-3.5 font-semibold text-foreground/80 uppercase tracking-wide">KM Traveled</TableHead>
                                              <TableHead className="min-w-[120px] text-xs py-3.5 font-semibold text-foreground/80 uppercase tracking-wide">Tread (mm)</TableHead>
                                              <TableHead className="min-w-[120px] text-xs py-3.5 font-semibold text-foreground/80 uppercase tracking-wide">Condition</TableHead>
                                              <TableHead className="min-w-[110px] text-xs py-3.5 font-semibold text-foreground/80 uppercase tracking-wide text-right">Actions</TableHead>
                                            </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                            {positions.map((pos, index) => (
                                              <TableRow
                                                key={pos.position}
                                                className={`
                                                  ${index % 2 === 0 ? "bg-background" : "bg-muted/10"}
                                                  transition-all duration-200 ease-in-out
                                                  hover:bg-primary/5 hover:shadow-[inset_4px_0_0_0_hsl(var(--primary))]
                                                  group
                                                `}
                                              >
                                                <TableCell className="py-3">
                                                  <span className="inline-flex items-center justify-center w-9 h-9 rounded-md bg-muted/70 text-foreground font-semibold">{pos.position}</span>
                                                  <span className="text-muted-foreground ml-3">{pos.positionLabel.split(' - ')[1] || ''}</span>
                                                </TableCell>
                                                <TableCell className="py-3">
                                                  {pos.tyreCode ? (
                                                    <div className="flex flex-col gap-0.5">
                                                      {pos.dotCode && <span className="font-mono font-semibold text-foreground">{pos.dotCode}</span>}
                                                      {pos.serialNumber && <span className="font-mono text-sm text-muted-foreground">{pos.serialNumber}</span>}
                                                      {!pos.dotCode && !pos.serialNumber && <span className="text-muted-foreground">-</span>}
                                                    </div>
                                                  ) : (
                                                    <span className="text-muted-foreground italic px-3 py-1.5 rounded bg-muted/50">Empty slot</span>
                                                  )}
                                                </TableCell>
                                                <TableCell className="py-3">
                                                  {pos.brand ? (
                                                    <div className="flex flex-col gap-0.5">
                                                      <span className="font-semibold text-foreground">{pos.brand}</span>
                                                      {pos.model && <span className="text-muted-foreground">{pos.model}</span>}
                                                    </div>
                                                  ) : <span className="text-muted-foreground">-</span>}
                                                </TableCell>
                                                <TableCell className="py-3">
                                                  <span className="font-medium">{pos.size || '-'}</span>
                                                </TableCell>
                                                <TableCell className="py-3">
                                                  {pos.kmTravelled !== null && pos.kmTravelled !== undefined ? (
                                                    <div className="flex flex-col gap-0.5">
                                                      <span className="font-semibold text-foreground">{pos.kmTravelled.toLocaleString()} km</span>
                                                      {pos.installationKm && (
                                                        <span className="text-muted-foreground text-sm">From {pos.installationKm.toLocaleString()}</span>
                                                      )}
                                                    </div>
                                                  ) : <span className="text-muted-foreground">-</span>}
                                                </TableCell>
                                                <TableCell className="py-3">
                                                  {pos.currentTreadDepth !== null ? (
                                                    <div className="flex flex-col gap-0.5">
                                                      <span className={`font-semibold px-2.5 py-1 rounded inline-block w-fit ${
                                                        pos.currentTreadDepth <= 3 ? 'bg-gradient-to-r from-red-600 to-rose-500 text-white shadow-sm' :
                                                        pos.currentTreadDepth <= 5 ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-white shadow-sm' :
                                                        pos.currentTreadDepth <= 7 ? 'bg-gradient-to-r from-yellow-500 to-orange-400 text-white shadow-sm' :
                                                        'bg-gradient-to-r from-emerald-500 to-green-400 text-white shadow-sm'
                                                      }`}>
                                                        {pos.currentTreadDepth} mm
                                                      </span>
                                                      {pos.initialTreadDepth && (
                                                        <span className="text-muted-foreground text-sm">of {pos.initialTreadDepth} mm</span>
                                                      )}
                                                    </div>
                                                  ) : <span className="text-muted-foreground">-</span>}
                                                </TableCell>
                                                <TableCell className="py-3">
                                                  {getConditionBadge(pos.condition)}
                                                </TableCell>
                                                <TableCell className="py-2 text-right">
                                                  <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                      <Button variant="outline" size="sm" className="h-8 w-8 p-0 opacity-70 group-hover:opacity-100 transition-opacity">
                                                        <MoreHorizontal className="w-4 h-4" />
                                                      </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-48">
                                                      {pos.tyreCode ? (
                                                        <>
                                                          <DropdownMenuItem onClick={() => handleInspect(pos)} className="gap-2">
                                                            <ClipboardCheck className="w-4 h-4" />
                                                            Inspect Tyre
                                                          </DropdownMenuItem>
                                                          <DropdownMenuItem onClick={() => handleEdit(pos)} className="gap-2">
                                                            <Pencil className="w-4 h-4" />
                                                            Edit Details
                                                          </DropdownMenuItem>
                                                          <DropdownMenuItem onClick={() => handleViewLifecycle(pos)} className="gap-2">
                                                            <History className="w-4 h-4" />
                                                            View Lifecycle
                                                          </DropdownMenuItem>
                                                          <DropdownMenuSeparator />
                                                          <DropdownMenuItem onClick={() => handleRemove(pos)} className="gap-2 text-red-600 focus:text-red-600">
                                                            <Trash2 className="w-4 h-4" />
                                                            Remove Tyre
                                                          </DropdownMenuItem>
                                                        </>
                                                      ) : (
                                                        <DropdownMenuItem onClick={() => handleInstall(pos)} className="gap-2">
                                                          <Plus className="w-4 h-4" />
                                                          Install Tyre
                                                        </DropdownMenuItem>
                                                      )}
                                                    </DropdownMenuContent>
                                                  </DropdownMenu>
                                                </TableCell>
                                              </TableRow>
                                            ))}
                                          </TableBody>
                                        </Table>
                                      </div>
                                    )}
                                    
                                    {/* Show empty positions message */}
                                    {isSelected && positions.length === 0 && fleetConfig && (
                                      <div className="mt-3 mb-4 p-4 border rounded-lg text-sm text-muted-foreground bg-muted/20 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                          <ChevronRight className="w-4 h-4" />
                                        </div>
                                        Loading tyre positions...
                                      </div>
                                    )}
                                    
                                    {/* No fleet config warning inline */}
                                    {isSelected && !fleetConfig && (
                                      <div className="mt-3 mb-4 p-4 border border-amber-500/40 bg-amber-500/10 rounded-lg text-sm text-amber-700 dark:text-amber-400">
                                        <span className="font-semibold">No fleet configuration found</span>
                                        <p className="text-xs text-muted-foreground mt-1">This vehicle doesn't have a fleet configuration assigned.</p>
                                      </div>
                                    )}
                                  </div>
                                );
                              });
                      })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Inspection Dialog */}
      {selectedPosition && (
        <TyreInspectionDialog
          open={inspectionDialogOpen}
          onOpenChange={setInspectionDialogOpen}
          vehicleId={vehicleId}
          vehicleRegistration={vehicleRegistration}
          fleetNumber={vehicleFleetNumber}
          tyreCode={selectedPosition.tyreCode}
          dotCode={selectedPosition.dotCode}
          position={selectedPosition.position}
          positionLabel={selectedPosition.positionLabel}
          existingCondition={selectedPosition.condition}
          existingTreadDepth={selectedPosition.currentTreadDepth}
          installationKm={selectedPosition.installationKm}
        />
      )}

      {/* Lifecycle Dialog */}
      {selectedPosition && (
        <TyreLifecycleDialog
          open={lifecycleDialogOpen}
          onOpenChange={setLifecycleDialogOpen}
          tyreCode={selectedPosition.tyreCode}
          dotCode={selectedPosition.dotCode}
          position={selectedPosition.position}
          positionLabel={selectedPosition.positionLabel}
        />
      )}

      {/* Tyre Management Dialog (Install/Remove/Edit) */}
      {selectedPosition && (
        <TyreManagementDialog
          open={managementDialogOpen}
          onOpenChange={setManagementDialogOpen}
          mode={managementMode}
          vehicleId={vehicleId}
          vehicleRegistration={vehicleRegistration}
          fleetNumber={vehicleFleetNumber}
          position={selectedPosition.position}
          positionLabel={selectedPosition.positionLabel}
          currentTyreCode={selectedPosition.tyreCode}
          currentDotCode={selectedPosition.dotCode}
          currentTyreId={selectedPosition.tyreId || selectedPosition.tyreCode}
        />
      )}
    </div>
  );
};

export default TyreInspection;