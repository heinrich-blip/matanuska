/**
 * Fuel Route Map Component
 * Interactive map for visualizing fuel routes with:
 * - Origin and destination markers
 * - Route waypoints (fuel stops)
 * - Nearby diesel suppliers
 * - Route line visualization
 */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { DieselSupplier } from "@/hooks/useDieselSuppliers";
import type { FuelRoute } from "@/hooks/useFuelRoutes";
import { useAddRouteWaypoint, useRouteWaypoints } from "@/hooks/useFuelRoutes";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  ExternalLink,
  Fuel,
  Layers,
  Loader2,
  MapPin,
  Navigation,
  Plus,
  RefreshCw,
  Star,
  X,
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Circle,
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";

// Fix Leaflet default markers
delete (L.Icon.Default.prototype as L.Icon.Default & { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Custom icons
const createIcon = (color: string, size: number = 32) =>
  L.divIcon({
    className: "custom-marker",
    html: `<div style="
      background-color: ${color};
      width: ${size}px;
      height: ${size}px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });

const originIcon = createIcon("#22c55e", 36); // Green for origin
const destinationIcon = createIcon("#ef4444", 36); // Red for destination
const fuelStopIcon = createIcon("#f59e0b", 28); // Amber for fuel stops
const supplierIcon = createIcon("#3b82f6", 24); // Blue for suppliers
const waypointIcon = createIcon("#8b5cf6", 24); // Purple for generic waypoints

interface FuelRouteMapProps {
  route: FuelRoute;
  suppliers?: DieselSupplier[];
  onWaypointAdded?: () => void;
  showSuppliers?: boolean;
  height?: string;
}

interface RouteWaypoint {
  id: string;
  sequence_order: number;
  name: string;
  latitude?: number;
  longitude?: number;
  is_fuel_stop: boolean;
  notes?: string;
  distance_from_origin_km?: number;
  google_maps_url?: string;
  supplier_id?: string;
}

// Helper function to calculate distance between two points (Haversine formula)
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Map event handler for adding waypoints by clicking
const MapClickHandler: React.FC<{
  isAddingWaypoint: boolean;
  onMapClick: (lat: number, lng: number) => void;
}> = ({ isAddingWaypoint, onMapClick }) => {
  useMapEvents({
    click: (e) => {
      if (isAddingWaypoint) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
};

// Fit bounds controller
const FitBoundsController: React.FC<{ bounds: L.LatLngBoundsExpression | null }> = ({
  bounds,
}) => {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [map, bounds]);
  return null;
};

// Extracted Layer Controls Component
const LayerControls: React.FC<{
  layerVisibility: Record<string, boolean>;
  toggleLayer: (layer: string) => void;
  suppliersNearRoute: DieselSupplier[];
}> = ({ layerVisibility, toggleLayer, suppliersNearRoute }) => (
  <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={layerVisibility.route ? "secondary" : "ghost"}
          size="sm"
          onClick={() => toggleLayer("route")}
        >
          <Navigation className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Toggle Route Line</TooltipContent>
    </Tooltip>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={layerVisibility.waypoints ? "secondary" : "ghost"}
          size="sm"
          onClick={() => toggleLayer("waypoints")}
        >
          <MapPin className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Toggle Waypoints</TooltipContent>
    </Tooltip>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={layerVisibility.suppliers ? "secondary" : "ghost"}
          size="sm"
          onClick={() => toggleLayer("suppliers")}
        >
          <Fuel className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Toggle Nearby Suppliers ({suppliersNearRoute.length})</TooltipContent>
    </Tooltip>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={layerVisibility.supplierRadius ? "secondary" : "ghost"}
          size="sm"
          onClick={() => toggleLayer("supplierRadius")}
        >
          <Layers className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Toggle Search Radius Circles</TooltipContent>
    </Tooltip>
  </div>
);

// Extracted Radius Selector Component
const RadiusSelector: React.FC<{
  supplierSearchRadius: number;
  showAllSuppliers: boolean;
  setSupplierSearchRadius: (value: number) => void;
  setShowAllSuppliers: (value: boolean) => void;
}> = ({ supplierSearchRadius, showAllSuppliers, setSupplierSearchRadius, setShowAllSuppliers }) => (
  <div className="flex items-center gap-2">
    <Label className="text-sm text-muted-foreground">Radius:</Label>
    <Select
      value={showAllSuppliers ? "all" : String(supplierSearchRadius)}
      onValueChange={(v) => {
        if (v === "all") {
          setShowAllSuppliers(true);
        } else {
          setShowAllSuppliers(false);
          setSupplierSearchRadius(Number(v));
        }
      }}
    >
      <SelectTrigger className="w-28 h-8">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="25">25 km</SelectItem>
        <SelectItem value="50">50 km</SelectItem>
        <SelectItem value="100">100 km</SelectItem>
        <SelectItem value="200">200 km</SelectItem>
        <SelectItem value="all">Show All</SelectItem>
      </SelectContent>
    </Select>
  </div>
);

// Extracted Add Waypoint Button
const AddWaypointButton: React.FC<{
  isAddingWaypoint: boolean;
  setIsAddingWaypoint: (value: boolean) => void;
}> = ({ isAddingWaypoint, setIsAddingWaypoint }) => (
  <Button
    variant={isAddingWaypoint ? "destructive" : "outline"}
    size="sm"
    onClick={() => setIsAddingWaypoint(!isAddingWaypoint)}
  >
    {isAddingWaypoint ? (
      <>
        <X className="h-4 w-4 mr-2" />
        Cancel
      </>
    ) : (
      <>
        <Plus className="h-4 w-4 mr-2" />
        Add Stop
      </>
    )}
  </Button>
);

// Extracted Refresh Button
const RefreshButton: React.FC<{
  waypointsLoading: boolean;
  refetchWaypoints: () => void;
}> = ({ waypointsLoading, refetchWaypoints }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button variant="ghost" size="sm" onClick={refetchWaypoints} disabled={waypointsLoading}>
        <RefreshCw className={`h-4 w-4 ${waypointsLoading ? "animate-spin" : ""}`} />
      </Button>
    </TooltipTrigger>
    <TooltipContent>Refresh Waypoints</TooltipContent>
  </Tooltip>
);

// Extracted Add Waypoint Mode Indicator
const AddWaypointIndicator: React.FC<{ isAddingWaypoint: boolean }> = ({ isAddingWaypoint }) =>
  isAddingWaypoint ? (
    <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
      <p className="text-sm text-amber-700 dark:text-amber-300 flex items-center gap-2">
        <MapPin className="h-4 w-4" />
        Click on the map to add a new waypoint/fuel stop
      </p>
    </div>
  ) : null;

// Extracted Supplier Coordinate Status
const SupplierStatus: React.FC<{
  suppliers: DieselSupplier[];
  suppliersWithCoords: DieselSupplier[];
  suppliersWithoutCoords: DieselSupplier[];
  suppliersNearRoute: DieselSupplier[];
}> = ({ suppliers, suppliersWithCoords, suppliersWithoutCoords, suppliersNearRoute }) => {
  if (suppliers.length === 0) return null;

  if (suppliersWithCoords.length === 0) {
    return (
      <div className="bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
        <p className="text-sm text-orange-700 dark:text-orange-300 flex items-center gap-2">
          <Fuel className="h-4 w-4" />
          <span>
            <strong>No suppliers have coordinates.</strong> Add latitude/longitude to your diesel
            suppliers to see them on the map. ({suppliers.length} suppliers without coordinates)
          </span>
        </p>
      </div>
    );
  }

  if (suppliersWithoutCoords.length > 0) {
    return (
      <div className="text-xs text-muted-foreground flex items-center gap-2">
        <Fuel className="h-3 w-3" />
        Showing {suppliersNearRoute.length} of {suppliersWithCoords.length} suppliers with
        coordinates ({suppliersWithoutCoords.length} suppliers missing coordinates)
      </div>
    );
  }

  return null;
};

// Extracted Waypoints List Component
const WaypointsList: React.FC<{ waypoints: RouteWaypoint[] }> = ({ waypoints }) =>
  waypoints.length > 0 ? (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Route Stops ({waypoints.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="py-2">
        <div className="space-y-2">
          {[...waypoints]
            .sort((a, b) => a.sequence_order - b.sequence_order)
            .map((wp) => (
              <div
                key={wp.id}
                className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="w-8 h-8 flex items-center justify-center p-0">
                    {wp.sequence_order}
                  </Badge>
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {wp.is_fuel_stop && <Fuel className="h-4 w-4 text-amber-500" />}
                      {wp.name}
                    </div>
                    {wp.notes && <div className="text-xs text-muted-foreground">{wp.notes}</div>}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {wp.google_maps_url && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(wp.google_maps_url!, "_blank")}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Open in Google Maps</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              </div>
            ))}
        </div>
      </CardContent>
    </Card>
  ) : null;

// Extracted Legend Component
const MapLegend: React.FC = () => (
  <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
    <div className="flex items-center gap-2">
      <div className="w-3 h-3 rounded-full bg-green-500" />
      Origin
    </div>
    <div className="flex items-center gap-2">
      <div className="w-3 h-3 rounded-full bg-red-500" />
      Destination
    </div>
    <div className="flex items-center gap-2">
      <div className="w-3 h-3 rounded-full bg-amber-500" />
      Fuel Stop
    </div>
    <div className="flex items-center gap-2">
      <div className="w-3 h-3 rounded-full bg-blue-500" />
      Nearby Supplier
    </div>
    <div className="flex items-center gap-2">
      <div className="w-3 h-3 rounded-full bg-purple-500" />
      Waypoint
    </div>
  </div>
);

// Extracted Add Waypoint Dialog
const AddWaypointDialogComponent: React.FC<{
  addWaypointDialog: boolean;
  setAddWaypointDialog: (value: boolean) => void;
  newWaypointCoords: { lat: number; lng: number } | null;
  newWaypointName: string;
  setNewWaypointName: (value: string) => void;
  newWaypointIsFuelStop: boolean;
  setNewWaypointIsFuelStop: (value: boolean) => void;
  selectedSupplierForWaypoint: string;
  setSelectedSupplierForWaypoint: (value: string) => void;
  suppliers: DieselSupplier[];
  handleAddWaypoint: () => void;
  addWaypointPending: boolean;
}> = ({
  addWaypointDialog,
  setAddWaypointDialog,
  newWaypointCoords,
  newWaypointName,
  setNewWaypointName,
  newWaypointIsFuelStop,
  setNewWaypointIsFuelStop,
  selectedSupplierForWaypoint,
  setSelectedSupplierForWaypoint,
  suppliers,
  handleAddWaypoint,
  addWaypointPending,
}) => (
  <Dialog open={addWaypointDialog} onOpenChange={setAddWaypointDialog}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Add New Stop</DialogTitle>
        <DialogDescription>Add a waypoint or fuel stop to this route</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        {newWaypointCoords && (
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Coordinates: {newWaypointCoords.lat.toFixed(6)}, {newWaypointCoords.lng.toFixed(6)}
          </div>
        )}
        <div className="space-y-2">
          <Label>Stop Name *</Label>
          <Input
            value={newWaypointName}
            onChange={(e) => setNewWaypointName(e.target.value)}
            placeholder="e.g., Shell Middelburg, Rest Stop"
          />
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="isFuelStop"
            checked={newWaypointIsFuelStop}
            onCheckedChange={(checked) => setNewWaypointIsFuelStop(checked === true)}
          />
          <Label htmlFor="isFuelStop" className="flex items-center gap-2">
            <Fuel className="h-4 w-4 text-amber-500" />
            This is a fuel stop
          </Label>
        </div>
        {newWaypointIsFuelStop && suppliers.length > 0 && (
          <div className="space-y-2">
            <Label>Link to Supplier (optional)</Label>
            <Select
              value={selectedSupplierForWaypoint}
              onValueChange={setSelectedSupplierForWaypoint}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a supplier..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No supplier</SelectItem>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} - R{s.current_price_per_liter.toFixed(2)}/L
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => setAddWaypointDialog(false)}>
          Cancel
        </Button>
        <Button
          onClick={handleAddWaypoint}
          disabled={!newWaypointName.trim() || addWaypointPending}
        >
          {addWaypointPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Add Stop
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

// Extracted Map Layers (Route, Markers, etc.)
const MapLayers: React.FC<{
  route: FuelRoute;
  waypoints: RouteWaypoint[];
  suppliersNearRoute: DieselSupplier[];
  layerVisibility: Record<string, boolean>;
  routePolyline: [number, number][];
  supplierSearchRadius: number;
  addWaypoint: ReturnType<typeof useAddRouteWaypoint>;
  onWaypointAdded?: () => void;
  refetchWaypoints: () => void;
}> = ({
  route,
  waypoints,
  suppliersNearRoute,
  layerVisibility,
  routePolyline,
  supplierSearchRadius,
  addWaypoint,
  onWaypointAdded,
  refetchWaypoints,
}) => {
  const handleAddSupplierAsWaypoint = useCallback(
    async (supplier: DieselSupplier) => {
      if (!supplier.latitude || !supplier.longitude) return;
      const maxSequence = waypoints.reduce((max, wp) => Math.max(max, wp.sequence_order), 0);
      await addWaypoint.mutateAsync({
        route_id: route.id,
        sequence_order: maxSequence + 1,
        name: supplier.name,
        latitude: supplier.latitude,
        longitude: supplier.longitude,
        is_fuel_stop: true,
        supplier_id: supplier.id,
        notes: `Price: R${supplier.current_price_per_liter.toFixed(2)}/L`,
      });
      refetchWaypoints();
      onWaypointAdded?.();
    },
    [addWaypoint, onWaypointAdded, refetchWaypoints, route.id, waypoints]
  );

  return (
    <>
      {/* Route polyline */}
      {layerVisibility.route && routePolyline.length >= 2 && (
        <Polyline positions={routePolyline} color="#3b82f6" weight={4} opacity={0.8} dashArray="10, 5" />
      )}
      {/* Origin marker */}
      {route.origin_latitude && route.origin_longitude && layerVisibility.waypoints && (
        <Marker position={[route.origin_latitude, route.origin_longitude]} icon={originIcon}>
          <Popup>
            <div className="p-2">
              <div className="font-bold text-green-600 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Origin
              </div>
              <div className="text-sm mt-1">{route.origin}</div>
            </div>
          </Popup>
        </Marker>
      )}
      {/* Destination marker */}
      {route.destination_latitude && route.destination_longitude && layerVisibility.waypoints && (
        <Marker position={[route.destination_latitude, route.destination_longitude]} icon={destinationIcon}>
          <Popup>
            <div className="p-2">
              <div className="font-bold text-red-600 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Destination
              </div>
              <div className="text-sm mt-1">{route.destination}</div>
            </div>
          </Popup>
        </Marker>
      )}
      {/* Waypoint markers */}
      {layerVisibility.waypoints &&
        waypoints.map(
          (wp) =>
            wp.latitude && wp.longitude && (
              <Marker
                key={wp.id}
                position={[wp.latitude, wp.longitude]}
                icon={wp.is_fuel_stop ? fuelStopIcon : waypointIcon}
              >
                <Popup>
                  <div className="p-2 min-w-[200px]">
                    <div className="font-bold flex items-center gap-2">
                      {wp.is_fuel_stop ? (
                        <Fuel className="h-4 w-4 text-amber-500" />
                      ) : (
                        <MapPin className="h-4 w-4 text-purple-500" />
                      )}
                      {wp.name}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">Stop #{wp.sequence_order}</div>
                    {wp.notes && <div className="text-sm mt-2 text-muted-foreground">{wp.notes}</div>}
                    {wp.distance_from_origin_km && (
                      <div className="text-xs mt-1">{wp.distance_from_origin_km.toFixed(1)} km from origin</div>
                    )}
                    {wp.google_maps_url && (
                      <a
                        href={wp.google_maps_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 flex items-center gap-1 mt-2"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Open in Google Maps
                      </a>
                    )}
                  </div>
                </Popup>
              </Marker>
            )
        )}
      {/* Search radius circles */}
      {layerVisibility.supplierRadius && (
        <>
          {route.origin_latitude && route.origin_longitude && (
            <Circle
              center={[route.origin_latitude, route.origin_longitude]}
              radius={supplierSearchRadius * 1000}
              pathOptions={{ color: "#22c55e", fillOpacity: 0.1, weight: 1 }}
            />
          )}
          {route.destination_latitude && route.destination_longitude && (
            <Circle
              center={[route.destination_latitude, route.destination_longitude]}
              radius={supplierSearchRadius * 1000}
              pathOptions={{ color: "#ef4444", fillOpacity: 0.1, weight: 1 }}
            />
          )}
          {waypoints.map(
            (wp) =>
              wp.latitude && wp.longitude && (
                <Circle
                  key={`radius-${wp.id}`}
                  center={[wp.latitude, wp.longitude]}
                  radius={supplierSearchRadius * 1000}
                  pathOptions={{ color: "#8b5cf6", fillOpacity: 0.05, weight: 1 }}
                />
              )
          )}
        </>
      )}
      {/* Supplier markers */}
      {layerVisibility.suppliers &&
        suppliersNearRoute.map(
          (supplier) =>
            supplier.latitude && supplier.longitude && (
              <Marker
                key={supplier.id}
                position={[supplier.latitude, supplier.longitude]}
                icon={supplierIcon}
              >
                <Popup>
                  <div className="p-2 min-w-[220px]">
                    <div className="font-bold flex items-center gap-2">
                      <Fuel className="h-4 w-4 text-blue-500" />
                      {supplier.name}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {supplier.location}
                      {supplier.province && `, ${supplier.province}`}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        R{supplier.current_price_per_liter.toFixed(2)}/L
                      </Badge>
                      {supplier.is_preferred && (
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      )}
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => handleAddSupplierAsWaypoint(supplier)}
                        disabled={addWaypoint.isPending}
                      >
                        {addWaypoint.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Plus className="h-4 w-4 mr-1" />
                            Add to Route
                          </>
                        )}
                      </Button>
                    </div>
                    {supplier.google_maps_url && (
                      <a
                        href={supplier.google_maps_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 flex items-center gap-1 mt-2"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Open in Google Maps
                      </a>
                    )}
                  </div>
                </Popup>
              </Marker>
            )
        )}
    </>
  );
};

export const FuelRouteMap: React.FC<FuelRouteMapProps> = ({
  route,
  suppliers = [],
  onWaypointAdded,
  showSuppliers = true,
  height = "500px",
}) => {
  const mapRef = useRef<L.Map | null>(null);

  // State
  const [layerVisibility, setLayerVisibility] = useState({
    route: true,
    waypoints: true,
    suppliers: showSuppliers,
    supplierRadius: false,
  });
  const [isAddingWaypoint, setIsAddingWaypoint] = useState(false);
  const [addWaypointDialog, setAddWaypointDialog] = useState(false);
  const [newWaypointCoords, setNewWaypointCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [newWaypointName, setNewWaypointName] = useState("");
  const [newWaypointIsFuelStop, setNewWaypointIsFuelStop] = useState(true);
  const [selectedSupplierForWaypoint, setSelectedSupplierForWaypoint] = useState("");
  const [supplierSearchRadius, setSupplierSearchRadius] = useState(50); // km
  const [showAllSuppliers, setShowAllSuppliers] = useState(false); // Show all suppliers or just nearby

  // Stats about supplier coordinates
  const suppliersWithCoords = useMemo(
    () => suppliers.filter((s) => s.latitude && s.longitude),
    [suppliers]
  );
  const suppliersWithoutCoords = useMemo(
    () => suppliers.filter((s) => !s.latitude || !s.longitude),
    [suppliers]
  );

  // Hooks
  const { data: waypoints = [], isLoading: waypointsLoading, refetch: refetchWaypoints } =
    useRouteWaypoints(route.id);
  const addWaypoint = useAddRouteWaypoint();

  // Calculate which suppliers are "near" the route (within radius of origin, destination, or waypoints)
  const suppliersNearRoute = useMemo(() => {
    if (!showSuppliers || suppliers.length === 0) return [];

    // If showing all, return all with coordinates
    if (showAllSuppliers) return suppliersWithCoords;

    const routePoints: { lat: number; lng: number }[] = [];
    // Add origin
    if (route.origin_latitude && route.origin_longitude) {
      routePoints.push({ lat: route.origin_latitude, lng: route.origin_longitude });
    }
    // Add destination
    if (route.destination_latitude && route.destination_longitude) {
      routePoints.push({ lat: route.destination_latitude, lng: route.destination_longitude });
    }
    // Add waypoints
    waypoints.forEach((wp) => {
      if (wp.latitude && wp.longitude) {
        routePoints.push({ lat: wp.latitude, lng: wp.longitude });
      }
    });

    if (routePoints.length === 0) return suppliersWithCoords; // Show all with coords if no route geo data

    // Filter suppliers within radius of any route point
    return suppliersWithCoords.filter((supplier) =>
      routePoints.some((point) => {
        const distance = calculateDistance(
          point.lat,
          point.lng,
          supplier.latitude!,
          supplier.longitude!
        );
        return distance <= supplierSearchRadius;
      })
    );
  }, [
    showSuppliers,
    suppliers.length,
    showAllSuppliers,
    suppliersWithCoords,
    route.origin_latitude,
    route.origin_longitude,
    route.destination_latitude,
    route.destination_longitude,
    waypoints,
    supplierSearchRadius,
  ]);

  // Calculate map bounds
  const bounds = useMemo(() => {
    const points: [number, number][] = [];
    if (route.origin_latitude && route.origin_longitude) {
      points.push([route.origin_latitude, route.origin_longitude]);
    }
    if (route.destination_latitude && route.destination_longitude) {
      points.push([route.destination_latitude, route.destination_longitude]);
    }
    waypoints.forEach((wp) => {
      if (wp.latitude && wp.longitude) {
        points.push([wp.latitude, wp.longitude]);
      }
    });
    if (layerVisibility.suppliers) {
      suppliersNearRoute.forEach((s) => {
        if (s.latitude && s.longitude) {
          points.push([s.latitude, s.longitude]);
        }
      });
    }
    if (points.length >= 2) {
      return L.latLngBounds(points);
    } else if (points.length === 1) {
      // Single point - create a small bounds around it
      const [lat, lng] = points[0];
      return L.latLngBounds([lat - 0.5, lng - 0.5], [lat + 0.5, lng + 0.5]);
    }
    // Default to South Africa
    return L.latLngBounds([-34.5, 16.5], [-22.0, 33.0]);
  }, [
    route.origin_latitude,
    route.origin_longitude,
    route.destination_latitude,
    route.destination_longitude,
    waypoints,
    layerVisibility.suppliers,
    suppliersNearRoute,
  ]);

  // Route polyline points
  const routePolyline = useMemo(() => {
    const points: [number, number][] = [];
    if (route.origin_latitude && route.origin_longitude) {
      points.push([route.origin_latitude, route.origin_longitude]);
    }
    // Sort waypoints by sequence and add
    [...waypoints]
      .sort((a, b) => a.sequence_order - b.sequence_order)
      .forEach((wp) => {
        if (wp.latitude && wp.longitude) {
          points.push([wp.latitude, wp.longitude]);
        }
      });
    if (route.destination_latitude && route.destination_longitude) {
      points.push([route.destination_latitude, route.destination_longitude]);
    }
    return points;
  }, [
    route.origin_latitude,
    route.origin_longitude,
    waypoints,
    route.destination_latitude,
    route.destination_longitude,
  ]);

  // Handle map click to add waypoint
  const handleMapClick = useCallback((lat: number, lng: number) => {
    setNewWaypointCoords({ lat, lng });
    setAddWaypointDialog(true);
    setIsAddingWaypoint(false);
  }, []);

  // Add waypoint from dialog
  const handleAddWaypoint = useCallback(async () => {
    if (!newWaypointCoords || !newWaypointName.trim()) return;
    const maxSequence = waypoints.reduce((max, wp) => Math.max(max, wp.sequence_order), 0);
    await addWaypoint.mutateAsync({
      route_id: route.id,
      sequence_order: maxSequence + 1,
      name: newWaypointName,
      latitude: newWaypointCoords.lat,
      longitude: newWaypointCoords.lng,
      is_fuel_stop: newWaypointIsFuelStop,
      supplier_id:
        selectedSupplierForWaypoint && selectedSupplierForWaypoint !== "none"
          ? selectedSupplierForWaypoint
          : undefined,
    });
    // Reset form
    setAddWaypointDialog(false);
    setNewWaypointCoords(null);
    setNewWaypointName("");
    setNewWaypointIsFuelStop(true);
    setSelectedSupplierForWaypoint("");
    refetchWaypoints();
    onWaypointAdded?.();
  }, [
    newWaypointCoords,
    newWaypointName,
    waypoints,
    addWaypoint,
    route.id,
    newWaypointIsFuelStop,
    selectedSupplierForWaypoint,
    refetchWaypoints,
    onWaypointAdded,
  ]);

  // Toggle layer visibility
  const toggleLayer = useCallback((layer: keyof typeof layerVisibility) => {
    setLayerVisibility((prev) => ({ ...prev, [layer]: !prev[layer] }));
  }, []);

  const hasGeoData =
    (route.origin_latitude && route.origin_longitude) ||
    (route.destination_latitude && route.destination_longitude) ||
    waypoints.some((wp) => wp.latitude && wp.longitude);

  if (!hasGeoData && suppliersNearRoute.length === 0) {
    return (
      <Card className="h-[400px] flex items-center justify-center">
        <CardContent className="text-center">
          <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="font-medium mb-2">No Geographic Data</h3>
          <p className="text-sm text-muted-foreground mb-4">
            This route doesn't have coordinates for the origin, destination, or waypoints. Add
            latitude/longitude to visualize the route on the map.
          </p>
          <Button variant="outline" size="sm" onClick={() => setIsAddingWaypoint(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Waypoint with Coordinates
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <TooltipProvider>
        <div className="flex flex-wrap items-center gap-2">
          <LayerControls
            layerVisibility={layerVisibility}
            toggleLayer={toggleLayer}
            suppliersNearRoute={suppliersNearRoute}
          />
          <RadiusSelector
            supplierSearchRadius={supplierSearchRadius}
            showAllSuppliers={showAllSuppliers}
            setSupplierSearchRadius={setSupplierSearchRadius}
            setShowAllSuppliers={setShowAllSuppliers}
          />
          <AddWaypointButton
            isAddingWaypoint={isAddingWaypoint}
            setIsAddingWaypoint={setIsAddingWaypoint}
          />
          <RefreshButton waypointsLoading={waypointsLoading} refetchWaypoints={refetchWaypoints} />
        </div>
      </TooltipProvider>

      <AddWaypointIndicator isAddingWaypoint={isAddingWaypoint} />

      <SupplierStatus
        suppliers={suppliers}
        suppliersWithCoords={suppliersWithCoords}
        suppliersWithoutCoords={suppliersWithoutCoords}
        suppliersNearRoute={suppliersNearRoute}
      />

      {/* Map */}
      <div className="rounded-lg overflow-hidden border" style={{ height }}>
        <MapContainer
          center={[-26.2, 28.0]}
          zoom={6}
          style={{ height: "100%", width: "100%" }}
          ref={mapRef}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitBoundsController bounds={bounds} />
          <MapClickHandler isAddingWaypoint={isAddingWaypoint} onMapClick={handleMapClick} />
          <MapLayers
            route={route}
            waypoints={waypoints}
            suppliersNearRoute={suppliersNearRoute}
            layerVisibility={layerVisibility}
            routePolyline={routePolyline}
            supplierSearchRadius={supplierSearchRadius}
            addWaypoint={addWaypoint}
            onWaypointAdded={onWaypointAdded}
            refetchWaypoints={refetchWaypoints}
          />
        </MapContainer>
      </div>

      <WaypointsList waypoints={waypoints} />

      <MapLegend />

      <AddWaypointDialogComponent
        addWaypointDialog={addWaypointDialog}
        setAddWaypointDialog={setAddWaypointDialog}
        newWaypointCoords={newWaypointCoords}
        newWaypointName={newWaypointName}
        setNewWaypointName={setNewWaypointName}
        newWaypointIsFuelStop={newWaypointIsFuelStop}
        setNewWaypointIsFuelStop={setNewWaypointIsFuelStop}
        selectedSupplierForWaypoint={selectedSupplierForWaypoint}
        setSelectedSupplierForWaypoint={setSelectedSupplierForWaypoint}
        suppliers={suppliers}
        handleAddWaypoint={handleAddWaypoint}
        addWaypointPending={addWaypoint.isPending}
      />
    </div>
  );
};

export default FuelRouteMap;