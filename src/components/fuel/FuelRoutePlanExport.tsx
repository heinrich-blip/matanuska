import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Textarea } from "@/components/ui/textarea";
import { DieselSupplier } from "@/hooks/useDieselSuppliers";
import { FuelRoute, RouteNote, RouteWaypoint } from "@/hooks/useFuelRoutes";
import
  {
    AlertTriangle,
    ArrowDown,
    ArrowUp,
    CheckCircle2,
    Circle,
    Download,
    Edit2,
    FileText,
    Fuel,
    GripVertical,
    Lightbulb,
    MapPin,
    MessageSquarePlus,
    Navigation,
    Printer,
    Trash2,
    TrendingDown,
    TrendingUp
  } from "lucide-react";
import { useRef, useState } from "react";

// Types for fuel stop planning
interface FuelStop {
  id: string;
  name: string;
  type: "start" | "stop" | "finish";
  status: "completed" | "avoid" | "optimize" | "recommended" | "pending";
  price: number | null;
  avgPrice: number;
  instruction: string;
  volume: number | null;
  reason: string;
  location: string;
  savings?: number;
  distance_from_origin_km?: number;
  supplier?: DieselSupplier;
  waypointNotes?: string | null;
  waypointId?: string;
}

interface FuelRoutePlanExportProps {
  route: FuelRoute;
  waypoints: (RouteWaypoint & { diesel_suppliers?: unknown })[];
  suppliers: DieselSupplier[];
  avgPrice: number;
  notes?: RouteNote[];
  onUpdateWaypointNotes?: (waypointId: string, notes: string) => Promise<void>;
  onRemoveWaypoint?: (waypointId: string) => Promise<void>;
  onReorderWaypoints?: (waypointOrders: { id: string; sequence_order: number }[]) => Promise<void>;
  onPrint?: () => void;
  onDownload?: () => void;
}

// Calculate optimal fueling strategy
const calculateFuelStrategy = (
  route: FuelRoute,
  waypoints: (RouteWaypoint & { diesel_suppliers?: unknown })[],
  _suppliers: DieselSupplier[],
  avgPrice: number
): FuelStop[] => {
  const stops: FuelStop[] = [];
  const tankCapacity = 600; // Assume 600L tank capacity for trucks

  // Add start point
  stops.push({
    id: "start",
    name: route.origin,
    type: "start",
    status: "completed",
    price: null,
    avgPrice,
    instruction: "Depart",
    volume: null,
    reason: "Starting point - check current fuel level",
    location: route.origin,
  });

  // Get suppliers on this route (fuel stops from waypoints)
  const fuelStops = waypoints.filter((wp) => wp.is_fuel_stop && wp.diesel_suppliers);

  // Sort by sequence_order (user-defined order) instead of distance
  // This allows manual reordering to take effect
  const sortedStops = [...fuelStops].sort(
    (a, b) => (a.sequence_order || 0) - (b.sequence_order || 0)
  );

  // Find cheapest and most expensive on route
  const stopsWithPrices = sortedStops
    .filter((s) => {
      const supplier = s.diesel_suppliers as DieselSupplier | undefined;
      return supplier?.current_price_per_liter;
    })
    .map((s) => ({
      ...s,
      price: (s.diesel_suppliers as DieselSupplier).current_price_per_liter,
    }));

  const cheapestOnRoute = stopsWithPrices.length > 0
    ? Math.min(...stopsWithPrices.map((s) => s.price))
    : avgPrice;

  // Most expensive on route can be used for future analysis
  const _mostExpensiveOnRoute = stopsWithPrices.length > 0
    ? Math.max(...stopsWithPrices.map((s) => s.price))
    : avgPrice;

  // Calculate fueling instructions for each stop
  let cumulativeDistance = 0;
  let estimatedFuelLevel = tankCapacity * 0.5; // Assume starting at 50%
  const consumptionPerKm = route.avg_fuel_consumption_per_km;

  sortedStops.forEach((waypoint, _index) => {
    const supplier = waypoint.diesel_suppliers as DieselSupplier | undefined;
    const price = supplier?.current_price_per_liter || avgPrice;
    const distanceFromOrigin = waypoint.distance_from_origin_km || 0;
    const distanceToNext = waypoint.distance_to_next_km || 0;

    // Calculate fuel consumed to reach this point
    const fuelConsumed = (distanceFromOrigin - cumulativeDistance) * consumptionPerKm;
    estimatedFuelLevel -= fuelConsumed;
    cumulativeDistance = distanceFromOrigin;

    // Determine status and instruction
    let status: FuelStop["status"] = "pending";
    let instruction = "";
    let reason = "";
    let volume: number | null = null;

    // Check if supplier is avoided
    if (supplier?.is_avoided) {
      status = "avoid";
      instruction = "SKIP STATION";
      reason = supplier.avoid_reason || "Station marked as avoided";
    }
    // Check if price is significantly higher than cheapest
    else if (price > cheapestOnRoute * 1.05) {
      // More than 5% above cheapest
      status = "optimize";
      instruction = "BRIDGE FILL ONLY";
      // Calculate minimum fuel needed to reach next stop
      const fuelToNextStop = distanceToNext * consumptionPerKm * 1.2; // 20% buffer
      volume = Math.max(0, fuelToNextStop - estimatedFuelLevel);
      reason = `Price R${price.toFixed(2)} is ${((price / cheapestOnRoute - 1) * 100).toFixed(0)}% above cheapest (R${cheapestOnRoute.toFixed(2)})`;
    }
    // Check if this is the cheapest or near-cheapest option
    else if (price <= cheapestOnRoute * 1.02) {
      // Within 2% of cheapest
      status = "recommended";
      instruction = "FILL TO MAX";
      volume = Math.max(0, tankCapacity - estimatedFuelLevel);
      reason = `Best price on route - R${price.toFixed(2)}/L`;
    }
    // Otherwise, it's a neutral stop
    else {
      status = "pending";
      instruction = "PARTIAL FILL";
      volume = tankCapacity * 0.5; // Fill to 50%
      reason = `Average pricing at R${price.toFixed(2)}/L`;
    }

    // Calculate potential savings vs average
    const savings = volume ? (avgPrice - price) * volume : 0;

    stops.push({
      id: waypoint.id,
      name: supplier?.name || waypoint.name,
      type: "stop",
      status,
      price,
      avgPrice,
      instruction,
      volume,
      reason,
      location: supplier?.location || waypoint.name,
      savings,
      distance_from_origin_km: distanceFromOrigin,
      supplier,
      waypointNotes: waypoint.notes,
      waypointId: waypoint.id,
    });

    // Update fuel level based on fill
    if (volume && status !== "avoid") {
      estimatedFuelLevel += volume;
    }
  });

  // Add destination
  stops.push({
    id: "finish",
    name: route.destination,
    type: "finish",
    status: "pending",
    price: null,
    avgPrice,
    instruction: "Arrival",
    volume: null,
    reason: "End of route - refuel at destination if needed",
    location: route.destination,
  });

  return stops;
};

// Calculate route savings
const calculateSavings = (stops: FuelStop[], avgPrice: number): { savings: number; optimizedCost: number; avgCost: number } => {
  let totalVolume = 0;
  let optimizedCost = 0;

  stops.forEach((stop) => {
    if (stop.volume && stop.status !== "avoid" && stop.price) {
      totalVolume += stop.volume;
      optimizedCost += stop.volume * stop.price;
    }
  });

  const avgCost = totalVolume * avgPrice;
  const savings = avgCost - optimizedCost;

  return { savings: Math.max(0, savings), optimizedCost, avgCost };
};

// Get status styling
const getStatusStyle = (status: FuelStop["status"]) => {
  switch (status) {
    case "completed":
      return {
        bg: "bg-slate-100 dark:bg-slate-800",
        border: "border-slate-300 dark:border-slate-600",
        text: "text-slate-700 dark:text-slate-300",
        badge: "bg-slate-500",
        icon: CheckCircle2,
      };
    case "avoid":
      return {
        bg: "bg-red-50 dark:bg-red-950",
        border: "border-red-200 dark:border-red-800",
        text: "text-red-700 dark:text-red-300",
        badge: "bg-red-500",
        icon: AlertTriangle,
      };
    case "optimize":
      return {
        bg: "bg-amber-50 dark:bg-amber-950",
        border: "border-amber-200 dark:border-amber-800",
        text: "text-amber-700 dark:text-amber-300",
        badge: "bg-amber-500",
        icon: TrendingUp,
      };
    case "recommended":
      return {
        bg: "bg-green-50 dark:bg-green-950",
        border: "border-green-200 dark:border-green-800",
        text: "text-green-700 dark:text-green-300",
        badge: "bg-green-500",
        icon: TrendingDown,
      };
    default:
      return {
        bg: "bg-slate-50 dark:bg-slate-900",
        border: "border-slate-200 dark:border-slate-700",
        text: "text-slate-600 dark:text-slate-400",
        badge: "bg-slate-400",
        icon: Circle,
      };
  }
};

// Note type icons mapping
const NOTE_TYPE_CONFIG: Record<string, { icon: string; label: string }> = {
  general: { icon: "📝", label: "General" },
  fuel: { icon: "⛽", label: "Fuel" },
  road_condition: { icon: "🛣️", label: "Road Condition" },
  hazard: { icon: "⚠️", label: "Hazard" },
  tip: { icon: "💡", label: "Tip" },
};

const FuelRoutePlanExport = ({
  route,
  waypoints,
  suppliers,
  avgPrice,
  notes = [],
  onUpdateWaypointNotes,
  onRemoveWaypoint,
  onReorderWaypoints,
  onPrint,
  onDownload,
}: FuelRoutePlanExportProps) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [editingStopId, setEditingStopId] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<string>("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [removingWaypointId, setRemovingWaypointId] = useState<string | null>(null);
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);
  const [waypointToRemove, setWaypointToRemove] = useState<{ id: string; name: string } | null>(null);
  const [reordering, setReordering] = useState(false);

  const stops = calculateFuelStrategy(route, waypoints, suppliers, avgPrice);
  const { savings, optimizedCost, avgCost: _avgCost } = calculateSavings(stops, avgPrice);

  const handleEditNotes = (stopId: string, currentNotes: string | null | undefined) => {
    setEditingStopId(stopId);
    setEditingNotes(currentNotes || "");
  };

  const handleSaveNotes = async (waypointId: string) => {
    if (!onUpdateWaypointNotes) return;

    setSavingNotes(true);
    try {
      await onUpdateWaypointNotes(waypointId, editingNotes);
      setEditingStopId(null);
      setEditingNotes("");
    } catch (error) {
      console.error("Failed to save notes:", error);
    } finally {
      setSavingNotes(false);
    }
  };

  const handleRemoveWaypoint = (waypointId: string, name: string) => {
    setWaypointToRemove({ id: waypointId, name });
    setConfirmRemoveOpen(true);
  };

  const confirmRemoveWaypoint = async () => {
    if (!onRemoveWaypoint || !waypointToRemove) return;

    setRemovingWaypointId(waypointToRemove.id);
    try {
      await onRemoveWaypoint(waypointToRemove.id);
    } catch (error) {
      console.error("Failed to remove waypoint:", error);
    } finally {
      setRemovingWaypointId(null);
      setConfirmRemoveOpen(false);
      setWaypointToRemove(null);
    }
  };

  // Get fuel stop waypoints for reordering (excludes start/finish)
  const fuelStopWaypoints = waypoints.filter((wp) => wp.is_fuel_stop);

  // Handle moving a fuel stop up in the sequence
  const handleMoveUp = async (waypointId: string) => {
    if (!onReorderWaypoints || reordering) return;

    const currentIndex = fuelStopWaypoints.findIndex((wp) => wp.id === waypointId);
    if (currentIndex <= 0) return; // Already at top

    setReordering(true);
    try {
      // Swap sequence_order with the previous waypoint
      const currentWaypoint = fuelStopWaypoints[currentIndex];
      const prevWaypoint = fuelStopWaypoints[currentIndex - 1];

      const newOrders = fuelStopWaypoints.map((wp) => {
        if (wp.id === currentWaypoint.id) {
          return { id: wp.id, sequence_order: prevWaypoint.sequence_order };
        }
        if (wp.id === prevWaypoint.id) {
          return { id: wp.id, sequence_order: currentWaypoint.sequence_order };
        }
        return { id: wp.id, sequence_order: wp.sequence_order };
      });

      await onReorderWaypoints(newOrders);
    } catch (error) {
      console.error("Failed to reorder waypoints:", error);
    } finally {
      setReordering(false);
    }
  };

  // Handle moving a fuel stop down in the sequence
  const handleMoveDown = async (waypointId: string) => {
    if (!onReorderWaypoints || reordering) return;

    const currentIndex = fuelStopWaypoints.findIndex((wp) => wp.id === waypointId);
    if (currentIndex < 0 || currentIndex >= fuelStopWaypoints.length - 1) return; // Already at bottom

    setReordering(true);
    try {
      // Swap sequence_order with the next waypoint
      const currentWaypoint = fuelStopWaypoints[currentIndex];
      const nextWaypoint = fuelStopWaypoints[currentIndex + 1];

      const newOrders = fuelStopWaypoints.map((wp) => {
        if (wp.id === currentWaypoint.id) {
          return { id: wp.id, sequence_order: nextWaypoint.sequence_order };
        }
        if (wp.id === nextWaypoint.id) {
          return { id: wp.id, sequence_order: currentWaypoint.sequence_order };
        }
        return { id: wp.id, sequence_order: wp.sequence_order };
      });

      await onReorderWaypoints(newOrders);
    } catch (error) {
      console.error("Failed to reorder waypoints:", error);
    } finally {
      setReordering(false);
    }
  };

  // Get the index of a fuel stop in the sorted list
  const getFuelStopIndex = (waypointId: string): number => {
    return fuelStopWaypoints.findIndex((wp) => wp.id === waypointId);
  };

  const handleCancelEdit = () => {
    setEditingStopId(null);
    setEditingNotes("");
  };

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  const handleDownload = () => {
    if (onDownload) {
      onDownload();
    } else {
      // Create a professional styled HTML document for download
      const stopsHtml = stops.map((stop, index) => {
        let statusColor = '#64748b';
        let statusBg = '#f8fafc';
        let statusBorder = '#e2e8f0';
        let statusLabel = '';

        if (stop.status === 'recommended') {
          statusColor = '#16a34a';
          statusBg = '#f0fdf4';
          statusBorder = '#86efac';
          statusLabel = '✓ RECOMMENDED';
        } else if (stop.status === 'avoid') {
          statusColor = '#dc2626';
          statusBg = '#fef2f2';
          statusBorder = '#fecaca';
          statusLabel = '✗ AVOID';
        } else if (stop.status === 'optimize') {
          statusColor = '#d97706';
          statusBg = '#fffbeb';
          statusBorder = '#fcd34d';
          statusLabel = '⚡ BRIDGE FILL';
        } else if (stop.type === 'start') {
          statusColor = '#059669';
          statusBg = '#ecfdf5';
          statusBorder = '#6ee7b7';
          statusLabel = '🚀 START';
        } else if (stop.type === 'finish') {
          statusColor = '#7c3aed';
          statusBg = '#f5f3ff';
          statusBorder = '#c4b5fd';
          statusLabel = '🏁 FINISH';
        }

        return `
          <div class="stop" style="background: ${statusBg}; border: 2px solid ${statusBorder}; border-left: 5px solid ${statusColor};">
            <div class="stop-header">
              <div class="stop-number" style="background: ${statusColor};">${index + 1}</div>
              <div class="stop-info">
                <div class="stop-name">${stop.name}</div>
                <div class="stop-location">📍 ${stop.location}</div>
              </div>
              ${stop.price ? `<div class="stop-price">R${stop.price.toFixed(2)}<span>/L</span></div>` : ''}
            </div>
            <div class="stop-details">
              <div class="stop-instruction" style="background: ${statusColor};">${statusLabel || stop.instruction}</div>
              ${stop.volume ? `<span class="stop-volume">🛢️ ${stop.volume.toFixed(0)}L</span>` : ''}
              ${stop.savings && stop.savings > 0 ? `<span class="stop-savings">💰 Save R${stop.savings.toFixed(0)}</span>` : ''}
            </div>
            <div class="stop-reason">${stop.reason}</div>
            ${stop.waypointNotes ? `<div class="stop-notes">📝 ${stop.waypointNotes}</div>` : ''}
          </div>
        `;
      }).join('');

      const notesHtml = notes.length > 0 ? `
        <div class="section">
          <h2>📋 Route Notes</h2>
          ${notes.map(note => {
            const noteType = NOTE_TYPE_CONFIG[note.note_type] || { icon: '📝', label: 'General' };
            return `
              <div class="note ${note.is_important ? 'important' : ''}">
                <div class="note-header">
                  <span class="note-type">${noteType.icon} ${noteType.label}</span>
                  ${note.is_important ? '<span class="note-important">⚠️ Important</span>' : ''}
                </div>
                ${note.title ? `<div class="note-title">${note.title}</div>` : ''}
                <div class="note-content">${note.content}</div>
                ${note.location_description ? `<div class="note-location">📍 ${note.location_description}</div>` : ''}
              </div>
            `;
          }).join('')}
        </div>
      ` : '';

      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Fuel Route Plan - ${route.name}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 32px;
      max-width: 900px;
      margin: 0 auto;
      background: #ffffff;
      color: #1e293b;
      line-height: 1.5;
    }

    /* Header */
    .header {
      text-align: center;
      padding: 24px;
      margin-bottom: 32px;
      background: linear-gradient(135deg, #059669, #10b981);
      color: white;
      border-radius: 16px;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
    }
    .header h1 { font-size: 28px; margin-bottom: 8px; }
    .header .route-name { font-size: 20px; opacity: 0.95; margin-bottom: 8px; }
    .header .route-path { font-size: 16px; opacity: 0.9; margin-bottom: 4px; }
    .header .route-stats { font-size: 14px; opacity: 0.85; }

    /* Stats Grid */
    .stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-bottom: 32px;
    }
    .stat-card {
      background: #f8fafc;
      padding: 20px;
      border-radius: 12px;
      text-align: center;
      border: 1px solid #e2e8f0;
    }
    .stat-card.savings {
      background: linear-gradient(135deg, #f0fdf4, #dcfce7);
      border-color: #86efac;
    }
    .stat-label { font-size: 13px; color: #64748b; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
    .stat-value { font-size: 28px; font-weight: 700; color: #1e293b; }
    .stat-card.savings .stat-value { color: #16a34a; }
    .stat-sub { font-size: 12px; color: #94a3b8; margin-top: 4px; }

    /* Legend */
    .legend {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      margin-bottom: 24px;
      padding: 16px;
      background: #f8fafc;
      border-radius: 8px;
    }
    .legend-item { display: flex; align-items: center; gap: 8px; font-size: 13px; }
    .legend-dot { width: 12px; height: 12px; border-radius: 50%; }
    .legend-dot.green { background: #16a34a; }
    .legend-dot.amber { background: #d97706; }
    .legend-dot.red { background: #dc2626; }
    .legend-dot.slate { background: #64748b; }

    /* Section */
    .section { margin-bottom: 32px; }
    .section h2 {
      font-size: 18px;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 2px solid #e2e8f0;
      color: #1e293b;
    }

    /* Stops */
    .stops { display: flex; flex-direction: column; gap: 12px; }
    .stop {
      padding: 16px;
      border-radius: 12px;
      page-break-inside: avoid;
    }
    .stop-header { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 12px; }
    .stop-number {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      color: white;
      font-weight: 700;
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .stop-info { flex: 1; }
    .stop-name { font-weight: 600; font-size: 16px; color: #1e293b; }
    .stop-location { font-size: 13px; color: #64748b; margin-top: 2px; }
    .stop-price {
      font-size: 20px;
      font-weight: 700;
      color: #1e293b;
      font-family: 'SF Mono', Monaco, monospace;
    }
    .stop-price span { font-size: 12px; font-weight: 400; color: #64748b; }
    .stop-details { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; flex-wrap: wrap; }
    .stop-instruction {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      color: white;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .stop-volume { font-size: 13px; color: #3b82f6; font-weight: 500; }
    .stop-savings { font-size: 13px; color: #16a34a; font-weight: 500; }
    .stop-reason { font-size: 13px; color: #64748b; font-style: italic; }
    .stop-notes {
      margin-top: 8px;
      padding: 8px 12px;
      background: rgba(0,0,0,0.03);
      border-radius: 6px;
      font-size: 13px;
      color: #475569;
    }

    /* Notes */
    .note {
      padding: 16px;
      background: #f8fafc;
      border-radius: 8px;
      margin-bottom: 12px;
      border: 1px solid #e2e8f0;
    }
    .note.important {
      background: #fffbeb;
      border-color: #fcd34d;
    }
    .note-header { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
    .note-type { font-size: 13px; color: #64748b; }
    .note-important { font-size: 12px; color: #d97706; font-weight: 600; }
    .note-title { font-weight: 600; margin-bottom: 4px; }
    .note-content { font-size: 14px; color: #475569; }
    .note-location { font-size: 12px; color: #64748b; margin-top: 8px; }

    /* Footer */
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #e2e8f0;
      text-align: center;
      color: #94a3b8;
      font-size: 12px;
    }

    /* Print styles */
    @media print {
      body { padding: 16px; }
      .stop { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>⛽ Fuel Route Plan</h1>
    <div class="route-name">${route.name}</div>
    <div class="route-path">📍 ${route.origin} → ${route.destination}</div>
    <div class="route-stats">${route.total_distance_km?.toLocaleString() || '—'} km • Est. ${fuelNeeded.toFixed(0)} liters required</div>
  </div>

  <div class="stats">
    <div class="stat-card savings">
      <div class="stat-label">Route Savings</div>
      <div class="stat-value">R${savings.toFixed(2)}</div>
      <div class="stat-sub">vs. regional average</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Optimized Cost</div>
      <div class="stat-value">R${optimizedCost.toFixed(2)}</div>
      <div class="stat-sub">following this plan</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Strategy</div>
      <div class="stat-value">${stops.filter((s) => s.status === "recommended").length}</div>
      <div class="stat-sub">recommended stops</div>
    </div>
  </div>

  <div class="legend">
    <div class="legend-item"><div class="legend-dot green"></div> Recommended (Best Price)</div>
    <div class="legend-item"><div class="legend-dot amber"></div> Bridge Fill (Higher Price)</div>
    <div class="legend-item"><div class="legend-dot red"></div> Avoid (Marked)</div>
    <div class="legend-item"><div class="legend-dot slate"></div> Start/Finish</div>
  </div>

  <div class="section">
    <h2>🧭 Driver Instructions</h2>
    <div class="stops">
      ${stopsHtml}
    </div>
  </div>

  ${notesHtml}

  <div class="footer">
    <p>Generated on ${new Date().toLocaleDateString('en-ZA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at ${new Date().toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}</p>
    <p style="margin-top: 4px;">Matanuska Fleet Management System</p>
  </div>
</body>
</html>`;

      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fuel-route-plan-${route.name.toLowerCase().replace(/\s+/g, "-")}.html`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const fuelNeeded = (route.total_distance_km || 0) * route.avg_fuel_consumption_per_km;

  // Get only the fuel stops (not start/finish) for the management section
  const fuelStopsForManagement = stops.filter((s) => s.type === "stop");

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex justify-end gap-2 print:hidden">
        <Button variant="outline" size="sm" onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" />
          Print
        </Button>
        <Button variant="outline" size="sm" onClick={handleDownload}>
          <Download className="h-4 w-4 mr-2" />
          Download
        </Button>
      </div>

      {/* Fuel Stops Management Section - Only show if there are stops to manage */}
      {fuelStopsForManagement.length > 0 && (onReorderWaypoints || onRemoveWaypoint) && (
        <Card className="print:hidden border-blue-200 dark:border-blue-800 shadow-lg overflow-hidden">
          <CardHeader className="pb-3 border-b bg-gradient-to-r from-blue-500/10 to-cyan-500/5">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2 text-blue-700 dark:text-blue-400">
                  <GripVertical className="h-4 w-4" />
                  Manage Fuel Stops Order
                </CardTitle>
                <CardDescription>
                  Reorder or remove fuel stops to match your actual route sequence
                </CardDescription>
              </div>
              <Badge className="px-3 py-1 bg-gradient-to-r from-blue-500 to-cyan-400 text-white shadow-sm">
                {fuelStopsForManagement.length} stops
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-2">
              {/* Origin indicator */}
              <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/20 rounded-xl border border-emerald-200 dark:border-emerald-800/50">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-green-400 flex items-center justify-center text-white shadow-sm">
                  <MapPin className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">Start: {route.origin}</span>
                </div>
              </div>

              {/* Connector */}
              <div className="flex justify-center">
                <div className="w-0.5 h-3 bg-gradient-to-b from-emerald-300 to-blue-300 dark:from-emerald-700 dark:to-blue-700" />
              </div>

              {/* Fuel stops list */}
              {fuelStopsForManagement.map((stop, index) => {
                const isFirst = index === 0;
                const isLast = index === fuelStopsForManagement.length - 1;
                const statusStyle = getStatusStyle(stop.status);

                return (
                  <div key={stop.id}>
                    <div
                      className={`group flex items-stretch rounded-xl border overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 ${statusStyle.border} ${statusStyle.bg}`}
                    >
                      {/* Reorder Controls */}
                      <div className="flex flex-col items-center justify-center w-10 bg-muted/30 border-r">
                        {onReorderWaypoints && fuelStopsForManagement.length > 1 && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-8 p-0 rounded-none hover:bg-blue-100 dark:hover:bg-blue-900/30"
                              onClick={() => stop.waypointId && handleMoveUp(stop.waypointId)}
                              disabled={reordering || isFirst || !stop.waypointId}
                              title="Move up"
                            >
                              <ArrowUp className={`h-3.5 w-3.5 ${isFirst ? 'text-muted-foreground/30' : 'text-blue-600'}`} />
                            </Button>
                          </>
                        )}
                        <span className="w-6 h-6 flex items-center justify-center bg-gradient-to-br from-blue-500 to-cyan-400 text-white rounded-full text-xs font-bold shadow-sm">
                          {index + 1}
                        </span>
                        {onReorderWaypoints && fuelStopsForManagement.length > 1 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-8 p-0 rounded-none hover:bg-blue-100 dark:hover:bg-blue-900/30"
                            onClick={() => stop.waypointId && handleMoveDown(stop.waypointId)}
                            disabled={reordering || isLast || !stop.waypointId}
                            title="Move down"
                          >
                            <ArrowDown className={`h-3.5 w-3.5 ${isLast ? 'text-muted-foreground/30' : 'text-blue-600'}`} />
                          </Button>
                        )}
                      </div>

                      {/* Stop Content */}
                      <div className="flex-1 px-4 py-3 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm truncate">{stop.name}</div>
                            <div className="text-xs text-muted-foreground truncate flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {stop.location}
                            </div>
                          </div>
                          {stop.price && (
                            <div className="text-right flex-shrink-0">
                              <Badge variant="outline" className="font-mono text-xs">
                                R{stop.price.toFixed(2)}/L
                              </Badge>
                            </div>
                          )}
                        </div>

                        {/* Instruction Badge */}
                        <div className="mt-2 flex items-center gap-2">
                          <Badge className={`${statusStyle.badge} text-white text-xs`}>
                            {stop.instruction}
                          </Badge>
                          {stop.savings && stop.savings > 0 && (
                            <span className="text-xs text-emerald-600 dark:text-emerald-400">
                              Save R{stop.savings.toFixed(0)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Remove Button */}
                      {onRemoveWaypoint && stop.waypointId && (
                        <div className="flex items-center justify-center w-10 bg-muted/20 border-l opacity-60 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-full w-full rounded-none text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                            onClick={() => handleRemoveWaypoint(stop.waypointId!, stop.name)}
                            disabled={removingWaypointId === stop.waypointId}
                            title="Remove from route"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Connector to next */}
                    {!isLast && (
                      <div className="flex justify-center">
                        <div className="w-0.5 h-3 bg-blue-200 dark:bg-blue-800" />
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Connector to destination */}
              <div className="flex justify-center">
                <div className="w-0.5 h-3 bg-gradient-to-b from-blue-300 to-red-300 dark:from-blue-700 dark:to-red-700" />
              </div>

              {/* Destination indicator */}
              <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/20 rounded-xl border border-red-200 dark:border-red-800/50">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-rose-400 flex items-center justify-center text-white shadow-sm">
                  <MapPin className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <span className="font-semibold text-red-700 dark:text-red-400">End: {route.destination}</span>
                </div>
              </div>
            </div>

            {reordering && (
              <div className="mt-3 text-center text-sm text-blue-600 dark:text-blue-400 flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                Updating order...
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div ref={printRef}>
        {/* Header */}
        <div className="text-center pb-4 mb-6 border-b-2 border-green-600">
          <h1 className="text-2xl font-bold text-green-700 dark:text-green-400 flex items-center justify-center gap-2">
            <Fuel className="h-6 w-6" />
            Fuel Route Plan
          </h1>
          <p className="text-lg font-medium mt-2">{route.name}</p>
          <p className="text-muted-foreground flex items-center justify-center gap-2 mt-1">
            <MapPin className="h-4 w-4" />
            {route.origin} → {route.destination}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {route.total_distance_km?.toLocaleString()} km • Est. {fuelNeeded.toFixed(0)} liters required
          </p>
        </div>

        {/* Savings Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
            <CardContent className="pt-4 text-center">
              <div className="text-sm text-green-600 dark:text-green-400 mb-1">Route Savings</div>
              <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                R{savings.toFixed(2)}
              </div>
              <div className="text-xs text-green-600 dark:text-green-400">
                vs. regional average
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 text-center">
              <div className="text-sm text-muted-foreground mb-1">Optimized Cost</div>
              <div className="text-2xl font-bold">R{optimizedCost.toFixed(2)}</div>
              <div className="text-xs text-muted-foreground">
                following this plan
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 text-center">
              <div className="text-sm text-muted-foreground mb-1">Strategy</div>
              <div className="text-lg font-semibold">Smart Fueling</div>
              <div className="text-xs text-muted-foreground">
                {stops.filter((s) => s.status === "recommended").length} recommended stops
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mb-4 text-sm">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span>Recommended (Best Price)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <span>Bridge Fill (Higher Price)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span>Avoid (Marked)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-slate-500" />
            <span>Start/Finish</span>
          </div>
        </div>

        {/* Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Navigation className="h-5 w-5" />
              Driver Instructions
            </CardTitle>
            <CardDescription>
              Follow this fuel plan to minimize costs on your route.
              {onReorderWaypoints && fuelStopWaypoints.length > 1 && (
                <span className="block mt-1 text-xs text-blue-600 dark:text-blue-400 print:hidden">
                  💡 Use the arrow buttons to reorder fuel stops based on your actual route.
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative pl-6">
              {/* Timeline line */}
              <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700" />

              {stops.map((stop, _index) => {
                const style = getStatusStyle(stop.status);
                const StatusIcon = style.icon;

                return (
                  <div key={stop.id} className="relative pb-6 last:pb-0">
                    {/* Timeline dot */}
                    <div
                      className={`absolute -left-4 w-4 h-4 rounded-full ${style.badge} flex items-center justify-center`}
                    >
                      <StatusIcon className="h-2.5 w-2.5 text-white" />
                    </div>

                    {/* Stop card */}
                    <div className={`ml-4 p-4 rounded-lg border ${style.bg} ${style.border}`}>
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {stop.type === "start" && (
                              <Badge variant="secondary" className="text-xs">START</Badge>
                            )}
                            {stop.type === "finish" && (
                              <Badge variant="secondary" className="text-xs">FINISH</Badge>
                            )}
                            <span className="font-semibold">{stop.name}</span>
                            {stop.distance_from_origin_km !== undefined && (
                              <span className="text-xs text-muted-foreground">
                                ({stop.distance_from_origin_km.toFixed(0)} km)
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{stop.location}</p>

                          {stop.type === "stop" && (
                            <div className="space-y-1">
                              <div className={`font-bold text-sm ${style.text}`}>
                                {stop.instruction}
                              </div>
                              <p className="text-xs text-muted-foreground">{stop.reason}</p>
                            </div>
                          )}

                          {stop.type !== "stop" && (
                            <div className={`text-sm ${style.text}`}>
                              {stop.instruction}
                            </div>
                          )}

                          {/* Waypoint Notes Section - only for fuel stops */}
                          {stop.type === "stop" && stop.waypointId && (
                            <div className="mt-3 pt-3 border-t border-dashed print:border-solid">
                              {editingStopId === stop.waypointId ? (
                                <div className="space-y-2">
                                  <Textarea
                                    value={editingNotes}
                                    onChange={(e) => setEditingNotes(e.target.value)}
                                    placeholder="Add driver instructions for this stop (e.g., 'Use pump 3', 'Card payment only', 'Ask for fleet discount')..."
                                    rows={3}
                                    className="text-sm"
                                  />
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() => handleSaveNotes(stop.waypointId!)}
                                      disabled={savingNotes}
                                    >
                                      {savingNotes ? "Saving..." : "Save"}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={handleCancelEdit}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="print:block">
                                  {stop.waypointNotes ? (
                                    <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md p-2">
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1">
                                          <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">📋 Driver Notes:</p>
                                          <p className="text-sm text-blue-800 dark:text-blue-200">{stop.waypointNotes}</p>
                                        </div>
                                        {onUpdateWaypointNotes && (
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-6 w-6 p-0 print:hidden"
                                            onClick={() => handleEditNotes(stop.waypointId!, stop.waypointNotes)}
                                          >
                                            <Edit2 className="h-3 w-3" />
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  ) : (
                                    onUpdateWaypointNotes && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="text-xs text-muted-foreground print:hidden"
                                        onClick={() => handleEditNotes(stop.waypointId!, "")}
                                      >
                                        <MessageSquarePlus className="h-3 w-3 mr-1" />
                                        Add driver notes for this stop
                                      </Button>
                                    )
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col items-end gap-1">
                          {stop.price && (
                            <div className="text-right">
                              <div className="font-mono font-bold">
                                R{stop.price.toFixed(2)}/L
                              </div>
                              {stop.price < stop.avgPrice && (
                                <div className="text-xs text-green-600 dark:text-green-400">
                                  R{(stop.avgPrice - stop.price).toFixed(2)} below avg
                                </div>
                              )}
                              {stop.price > stop.avgPrice && (
                                <div className="text-xs text-red-600 dark:text-red-400">
                                  R{(stop.price - stop.avgPrice).toFixed(2)} above avg
                                </div>
                              )}
                            </div>
                          )}
                          {stop.volume && stop.status !== "avoid" && (
                            <Badge
                              variant="outline"
                              className={`${style.text} border-current`}
                            >
                              Fill: {stop.volume.toFixed(0)}L
                            </Badge>
                          )}
                          {/* Reorder Buttons - only for fuel stops with multiple stops */}
                          {stop.type === "stop" && stop.waypointId && onReorderWaypoints && fuelStopWaypoints.length > 1 && (
                            <div className="flex items-center gap-1 print:hidden">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0"
                                onClick={() => handleMoveUp(stop.waypointId!)}
                                disabled={reordering || getFuelStopIndex(stop.waypointId!) === 0}
                                title="Move up in sequence"
                              >
                                <ArrowUp className="h-4 w-4" />
                              </Button>
                              <GripVertical className="h-4 w-4 text-muted-foreground" />
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0"
                                onClick={() => handleMoveDown(stop.waypointId!)}
                                disabled={reordering || getFuelStopIndex(stop.waypointId!) === fuelStopWaypoints.length - 1}
                                title="Move down in sequence"
                              >
                                <ArrowDown className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                          {/* Remove Waypoint Button - only for fuel stops */}
                          {stop.type === "stop" && stop.waypointId && onRemoveWaypoint && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950 print:hidden"
                              onClick={() => handleRemoveWaypoint(stop.waypointId!, stop.name)}
                              disabled={removingWaypointId === stop.waypointId}
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              {removingWaypointId === stop.waypointId ? "Removing..." : "Remove"}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Driver Tips */}
        {route.driver_tips && (
          <Card className="mt-6 border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-yellow-700 dark:text-yellow-300">
                <Lightbulb className="h-4 w-4" />
                Driver Tips
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                {route.driver_tips}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Route Notes */}
        {notes.length > 0 && (
          <Card className="mt-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Route Notes ({notes.length})
              </CardTitle>
              <CardDescription>
                Important information for this route
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {notes
                  .sort((a, b) => (b.is_important ? 1 : 0) - (a.is_important ? 1 : 0))
                  .map((note) => {
                    const noteConfig = NOTE_TYPE_CONFIG[note.note_type] || NOTE_TYPE_CONFIG.general;
                    return (
                      <div
                        key={note.id}
                        className={`p-3 rounded-lg border ${
                          note.is_important
                            ? "border-yellow-300 bg-yellow-50 dark:border-yellow-700 dark:bg-yellow-950"
                            : "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-lg">{noteConfig.icon}</span>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="secondary" className="text-xs">
                                {noteConfig.label}
                              </Badge>
                              {note.is_important && (
                                <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-400">
                                  Important
                                </Badge>
                              )}
                            </div>
                            {note.title && (
                              <h4 className="font-medium text-sm mb-1">{note.title}</h4>
                            )}
                            <p className="text-sm text-muted-foreground">{note.content}</p>
                            {note.location_description && (
                              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {note.location_description}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary Alert */}
        <Alert className="mt-6 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
          <Fuel className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-700 dark:text-green-300">
            Fuel Plan Summary
          </AlertTitle>
          <AlertDescription className="text-green-600 dark:text-green-400">
            By following this plan, you can save approximately{" "}
            <strong>R{savings.toFixed(2)}</strong> compared to fueling at average prices.
            Focus on filling up at the recommended (green) stations and only take minimum
            fuel at higher-priced locations.
          </AlertDescription>
        </Alert>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t text-center text-xs text-muted-foreground">
          <p>
            Generated on {new Date().toLocaleDateString()} at{" "}
            {new Date().toLocaleTimeString()}
          </p>
          <p className="mt-1">
            Prices are based on current data and may vary. Always confirm prices at
            the pump.
          </p>
        </div>
      </div>

      {/* Confirmation Dialog for Removing Waypoint */}
      <AlertDialog open={confirmRemoveOpen} onOpenChange={setConfirmRemoveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Fuel Station</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{waypointToRemove?.name}</strong> from this route?
              This action cannot be undone and will recalculate your fuel plan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRemoveWaypoint}
              className="bg-red-600 hover:bg-red-700"
            >
              Remove Station
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FuelRoutePlanExport;