import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
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
    Trash2,
    XCircle
  } from "lucide-react";
import { useEffect, useState } from "react";
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
    Horse: { label: "HORSE (TRUCKS)", tyreCount: "10+SP tyres" },
    Reefer: { label: "REEFER (REFRIGERATED)", tyreCount: "12 tyres" },
    Trailer: { label: "INTERLINKS", tyreCount: "12 tyres" },
    LMV: { label: "LMV (LIGHT VEHICLES)", tyreCount: "4-6 tyres" },
    Other: { label: "OTHER", tyreCount: "Varies" },
    Unassigned: { label: "UNASSIGNED", tyreCount: "-" },
  };

  const sortedCategories = ["Horse", "Reefer", "Trailer", "LMV", "Other", "Unassigned"]
    .filter(cat => vehiclesByCategory[cat] && Object.keys(vehiclesByCategory[cat]).length > 0);

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
    <div className="space-y-4 p-4">
      {/* Vehicle Selection by Fleet */}
      <Card className="shadow-lg border-0 bg-gradient-to-br from-background to-muted/20">
        <CardContent className="space-y-3 pt-4">
          {sortedCategories.length === 0 ? (
            <p className="text-muted-foreground text-sm">No vehicles found</p>
          ) : (
            sortedCategories.map((category) => {
              const categoryData = categoryConfig[category];
              const fleetsInCategory = vehiclesByCategory[category] || {};
              const fleetNumbers = Object.keys(fleetsInCategory).sort((a, b) => {
                const numA = parseInt(a);
                const numB = parseInt(b);
                if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                return a.localeCompare(b);
              });
              const totalVehicles = fleetNumbers.reduce((sum, fn) => sum + (fleetsInCategory[fn]?.length || 0), 0);
              const isExpanded = expandedCategories.has(category);
              
              // Category-specific colors
              const categoryColors: Record<string, string> = {
                Horse: "from-blue-500/10 to-blue-600/5 border-blue-500/30 hover:border-blue-500/50",
                Reefer: "from-cyan-500/10 to-cyan-600/5 border-cyan-500/30 hover:border-cyan-500/50",
                Trailer: "from-purple-500/10 to-purple-600/5 border-purple-500/30 hover:border-purple-500/50",
                LMV: "from-green-500/10 to-green-600/5 border-green-500/30 hover:border-green-500/50",
                Other: "from-gray-500/10 to-gray-600/5 border-gray-500/30 hover:border-gray-500/50",
                Unassigned: "from-orange-500/10 to-orange-600/5 border-orange-500/30 hover:border-orange-500/50",
              };
              
              return (
                <Collapsible
                  key={category}
                  open={isExpanded}
                  onOpenChange={() => toggleCategory(category)}
                >
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className={`w-full justify-between px-4 py-3 h-auto rounded-lg border bg-gradient-to-r transition-all duration-200 ${categoryColors[category] || categoryColors.Other}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded flex items-center justify-center transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
                          <ChevronRight className="w-4 h-4" />
                        </div>
                        <span className="font-bold tracking-wide text-sm">{categoryData?.label || category}</span>
                        <span className="text-xs text-muted-foreground font-normal">({categoryData?.tyreCount || "-"})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full bg-background/80 text-xs font-medium border">
                          {fleetNumbers.length} fleets
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                          {totalVehicles} vehicles
                        </span>
                      </div>
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="ml-4 mt-2 space-y-1 border-l-2 border-primary/20 pl-4">
                      {fleetNumbers.flatMap((fleetNumber) => {
                        const fleetVehicles = fleetsInCategory[fleetNumber] || [];
                        
                        return fleetVehicles.map((vehicle) => {
                          const isSelected = vehicleId === vehicle.id;
                          const fleetConf = fleetNumber !== "Unassigned" ? getFleetConfig(fleetNumber) : null;
                          
                          return (
                            <div key={vehicle.id}>
                              <Button
                                variant={isSelected ? "default" : "ghost"}
                                size="sm"
                                className={`w-full justify-start gap-3 h-10 text-sm transition-all duration-150 ${isSelected ? 'shadow-md' : 'hover:bg-muted/80 hover:translate-x-1'}`}
                                onClick={() => setVehicleId(isSelected ? "" : vehicle.id)}
                              >
                                <div className={`transition-transform duration-200 ${isSelected ? 'rotate-90' : ''}`}>
                                  <ChevronRight className="w-3 h-3" />
                                </div>
                                <span className="font-semibold">Fleet {fleetNumber}</span>
                                <span className="text-muted-foreground font-light">|</span>
                                <span className="font-medium">{vehicle.registration_number}</span>
                                {fleetConf && (
                                  <span className={`ml-auto px-2 py-0.5 rounded text-xs font-medium ${isSelected ? 'bg-background/20' : 'bg-muted'}`}>
                                    {fleetConf.positions.length} positions
                                  </span>
                                )}
                              </Button>
                                    
                                    {/* Inline Tyre Table - appears directly under selected vehicle */}
                                    {isSelected && positions.length > 0 && (
                                      <div className="mt-3 mb-4 border rounded-xl overflow-hidden shadow-sm bg-background">
                                        <Table>
                                          <TableHeader>
                                            <TableRow className="bg-gradient-to-r from-muted to-muted/50 border-b-2">
                                              <TableHead className="text-sm py-3 font-bold tracking-wider">POSITION</TableHead>
                                              <TableHead className="text-sm py-3 font-bold tracking-wider">DOT / SERIAL</TableHead>
                                              <TableHead className="text-sm py-3 font-bold tracking-wider">BRAND / MODEL</TableHead>
                                              <TableHead className="text-sm py-3 font-bold tracking-wider">SIZE</TableHead>
                                              <TableHead className="text-sm py-3 font-bold tracking-wider">KM TRAVELED</TableHead>
                                              <TableHead className="text-sm py-3 font-bold tracking-wider">TREAD (mm)</TableHead>
                                              <TableHead className="text-sm py-3 font-bold tracking-wider">CONDITION</TableHead>
                                              <TableHead className="text-sm py-3 font-bold tracking-wider text-right">ACTIONS</TableHead>
                                            </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                            {positions.map((pos, index) => (
                                              <TableRow key={pos.position} className={`text-sm transition-colors hover:bg-muted/50 ${index % 2 === 0 ? 'bg-background' : 'bg-muted/20'}`}>
                                                <TableCell className="py-3">
                                                  <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary font-bold">{pos.position}</span>
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
                                                      <span className={`font-bold px-3 py-1 rounded inline-block w-fit ${
                                                        pos.currentTreadDepth <= 3 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                                        pos.currentTreadDepth <= 5 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                                                        pos.currentTreadDepth <= 7 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                                        'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
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
                                                      <Button variant="outline" size="sm" className="h-7 w-7 p-0 hover:bg-primary/10 transition-colors">
                                                        <MoreHorizontal className="w-4 h-4" />
                                                      </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-48">
                                                      {pos.tyreCode ? (
                                                        <>
                                                          <DropdownMenuItem onClick={() => handleInspect(pos)} className="gap-2">
                                                            <ClipboardCheck className="w-4 h-4 text-blue-500" />
                                                            Inspect Tyre
                                                          </DropdownMenuItem>
                                                          <DropdownMenuItem onClick={() => handleEdit(pos)} className="gap-2">
                                                            <Pencil className="w-4 h-4 text-amber-500" />
                                                            Edit Details
                                                          </DropdownMenuItem>
                                                          <DropdownMenuItem onClick={() => handleViewLifecycle(pos)} className="gap-2">
                                                            <History className="w-4 h-4 text-purple-500" />
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
                                                          <Plus className="w-4 h-4 text-green-500" />
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
                                      <div className="mt-3 mb-4 p-4 border rounded-xl text-sm text-muted-foreground bg-muted/30 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center animate-pulse">
                                          <ChevronRight className="w-4 h-4" />
                                        </div>
                                        Loading tyre positions...
                                      </div>
                                    )}
                                    
                                    {/* No fleet config warning inline */}
                                    {isSelected && !fleetConfig && (
                                      <div className="mt-3 mb-4 p-4 border-2 border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-orange-500/5 rounded-xl text-sm text-amber-700 dark:text-amber-400">
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