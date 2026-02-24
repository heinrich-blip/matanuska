import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { CreateSupplierData, DieselSupplier, useBulkImportSuppliers, useCheapestSuppliers, useCreateDieselSupplier, useDeleteDieselSupplier, useDieselSuppliers, usePriceStatistics, useProvinces, useSupplierPriceHistory, useToggleAvoided, useTogglePreferred, useUpdateDieselSupplier, useUpdateSupplierPrice } from "@/hooks/useDieselSuppliers";
import { CreateRouteData, FuelRoute, NOTE_TYPES, useAddRouteNote, useAddRouteWaypoint, useCreateFuelRoute, useDeleteFuelRoute, useDeleteRouteNote, useDeleteRouteWaypoint, useFuelRoutes, useReorderWaypoints, useRouteNotes, useRouteWaypoints, useToggleRouteFavorite, useUpdateFuelRoute, useUpdateRouteNote, useUpdateWaypointNotes, type CreateNoteData, type RouteNote } from "@/hooks/useFuelRoutes";
import { formatDate } from "@/lib/formatters";
import { AlertTriangle, ArrowDown, ArrowRight, ArrowUp, Ban, Building2, Calculator, Check, DollarSign, Download, Edit, ExternalLink, FileText, Filter, Fuel, Lightbulb, Loader2, MapPin, MoreHorizontal, Navigation, Plus, RefreshCw, Route, Star, Trash2, TrendingDown, TrendingUp, Upload } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Layout from "./Layout";
import FuelRouteMap from "./fuel/FuelRouteMap";
import FuelRoutePlanExport from "./fuel/FuelRoutePlanExport";

const DieselSupplierManagement = () => {
  // Data hooks
  const [filters, setFilters] = useState<{
    province?: string;
    sortBy?: "price" | "name" | "location";
    sortOrder?: "asc" | "desc";
    preferredOnly?: boolean;
    avoidedOnly?: boolean;
  }>({ sortBy: "price", sortOrder: "asc" });

  const { data: suppliers = [], isLoading: suppliersLoading } = useDieselSuppliers(filters);
  const { data: cheapestSuppliers = [] } = useCheapestSuppliers(5);
  const { data: statistics } = usePriceStatistics();
  const { data: provinces = [] } = useProvinces();

  // Route hooks
  const { data: routes = [], isLoading: routesLoading } = useFuelRoutes();

  // Supplier Mutations
  const createSupplier = useCreateDieselSupplier();
  const updateSupplier = useUpdateDieselSupplier();
  const deleteSupplier = useDeleteDieselSupplier();
  const updatePrice = useUpdateSupplierPrice();
  const togglePreferred = useTogglePreferred();
  const toggleAvoided = useToggleAvoided();
  const bulkImport = useBulkImportSuppliers();

  // Route Mutations
  const createRoute = useCreateFuelRoute();
  const updateRoute = useUpdateFuelRoute();
  const deleteRoute = useDeleteFuelRoute();
  const toggleFavorite = useToggleRouteFavorite();
  const addWaypoint = useAddRouteWaypoint();

  // Supplier Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [priceDialogOpen, setPriceDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [avoidDialogOpen, setAvoidDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<DieselSupplier | null>(null);

  // Route Dialog states
  const [createRouteDialogOpen, setCreateRouteDialogOpen] = useState(false);
  const [editRouteDialogOpen, setEditRouteDialogOpen] = useState(false);
  const [deleteRouteDialogOpen, setDeleteRouteDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<FuelRoute | null>(null);
  const [addToRouteDialogOpen, setAddToRouteDialogOpen] = useState(false);
  const [selectedRouteForSupplier, setSelectedRouteForSupplier] = useState("");

  // Supplier Form states
  const [formData, setFormData] = useState<Partial<CreateSupplierData>>({
    country: "South Africa",
    has_truck_facilities: true,
  });
  const [priceData, setPriceData] = useState({ new_price: "", notes: "" });
  const [avoidReason, setAvoidReason] = useState("");
  const [importData, setImportData] = useState("");

  // Route Form states
  const [routeFormData, setRouteFormData] = useState<Partial<CreateRouteData>>({
    avg_fuel_consumption_per_km: 0.35,
  });

  const isLoading = suppliersLoading || routesLoading;

  // Handlers
  const handleCreateSupplier = useCallback(async () => {
    if (!formData.name || !formData.location || !formData.current_price_per_liter) return;
    await createSupplier.mutateAsync(formData as CreateSupplierData);
    setCreateDialogOpen(false);
    setFormData({ country: "South Africa", has_truck_facilities: true });
  }, [createSupplier, formData]);

  const handleUpdateSupplier = useCallback(async () => {
    if (!selectedSupplier) return;
    await updateSupplier.mutateAsync({ id: selectedSupplier.id, ...formData });
    setEditDialogOpen(false);
    setSelectedSupplier(null);
    setFormData({ country: "South Africa", has_truck_facilities: true });
  }, [formData, selectedSupplier, updateSupplier]);

  const handleDeleteSupplier = useCallback(async () => {
    if (!selectedSupplier) return;
    await deleteSupplier.mutateAsync(selectedSupplier.id);
    setDeleteDialogOpen(false);
    setSelectedSupplier(null);
  }, [deleteSupplier, selectedSupplier]);

  const handleUpdatePrice = useCallback(async () => {
    if (!selectedSupplier || !priceData.new_price) return;
    await updatePrice.mutateAsync({
      supplier_id: selectedSupplier.id,
      new_price: parseFloat(priceData.new_price),
      notes: priceData.notes || undefined,
    });
    setPriceDialogOpen(false);
    setSelectedSupplier(null);
    setPriceData({ new_price: "", notes: "" });
  }, [priceData, selectedSupplier, updatePrice]);

  const handleTogglePreferred = useCallback(
    async (supplier: DieselSupplier) => {
      await togglePreferred.mutateAsync({ id: supplier.id, is_preferred: !supplier.is_preferred });
    },
    [togglePreferred]
  );

  const handleMarkAvoided = useCallback(async () => {
    if (!selectedSupplier) return;
    await toggleAvoided.mutateAsync({
      id: selectedSupplier.id,
      is_avoided: true,
      avoid_reason: avoidReason,
    });
    setAvoidDialogOpen(false);
    setSelectedSupplier(null);
    setAvoidReason("");
  }, [avoidReason, selectedSupplier, toggleAvoided]);

  const handleUnmarkAvoided = useCallback(
    async (supplier: DieselSupplier) => {
      await toggleAvoided.mutateAsync({ id: supplier.id, is_avoided: false });
    },
    [toggleAvoided]
  );

  const handleBulkImport = useCallback(async () => {
    if (!importData.trim()) return;
    // Parse tab-separated data
    const lines = importData.trim().split("\n");
    const suppliersToImport: CreateSupplierData[] = [];

    for (const line of lines) {
      const parts = line.split("\t");
      if (parts.length >= 4) {
        const name = parts[0]?.trim();
        const location = parts[1]?.trim();
        const address = parts[2]?.trim();
        const priceStr = parts[3]?.trim();
        const price = parseFloat(priceStr?.replace(/[R,]/g, "") || "0");

        if (name && price > 0) {
          suppliersToImport.push({
            name,
            location: location || name,
            address,
            current_price_per_liter: price,
            has_truck_facilities: true,
          });
        }
      }
    }

    if (suppliersToImport.length > 0) {
      await bulkImport.mutateAsync(suppliersToImport);
      setImportDialogOpen(false);
      setImportData("");
    }
  }, [bulkImport, importData]);

  const openEditDialog = useCallback((supplier: DieselSupplier) => {
    setSelectedSupplier(supplier);
    setFormData({
      name: supplier.name,
      location: supplier.location,
      address: supplier.address || undefined,
      province: supplier.province || undefined,
      country: supplier.country,
      google_maps_url: supplier.google_maps_url || undefined,
      latitude: supplier.latitude || undefined,
      longitude: supplier.longitude || undefined,
      current_price_per_liter: supplier.current_price_per_liter,
      min_purchase_liters: supplier.min_purchase_liters || undefined,
      operating_hours: supplier.operating_hours || undefined,
      has_truck_facilities: supplier.has_truck_facilities,
      notes: supplier.notes || undefined,
    });
    setEditDialogOpen(true);
  }, []);

  const openPriceDialog = useCallback((supplier: DieselSupplier) => {
    setSelectedSupplier(supplier);
    setPriceData({ new_price: supplier.current_price_per_liter.toString(), notes: "" });
    setPriceDialogOpen(true);
  }, []);

  const openHistoryDialog = useCallback((supplier: DieselSupplier) => {
    setSelectedSupplier(supplier);
    setHistoryDialogOpen(true);
  }, []);

  const openAvoidDialog = useCallback((supplier: DieselSupplier) => {
    setSelectedSupplier(supplier);
    setAvoidReason("");
    setAvoidDialogOpen(true);
  }, []);

  const openAddToRouteDialog = useCallback((supplier: DieselSupplier) => {
    setSelectedSupplier(supplier);
    setSelectedRouteForSupplier("");
    setAddToRouteDialogOpen(true);
  }, []);

  const handleAddSupplierToRoute = useCallback(async () => {
    if (!selectedSupplier || !selectedRouteForSupplier) return;

    await addWaypoint.mutateAsync({
      route_id: selectedRouteForSupplier,
      sequence_order: 1, // Will be added as first stop, user can reorder later
      name: selectedSupplier.name,
      latitude: selectedSupplier.latitude || undefined,
      longitude: selectedSupplier.longitude || undefined,
      google_maps_url: selectedSupplier.google_maps_url || undefined,
      is_fuel_stop: true,
      supplier_id: selectedSupplier.id,
      notes: `Price: R${selectedSupplier.current_price_per_liter.toFixed(2)}/L - ${selectedSupplier.location}`,
    });

    setAddToRouteDialogOpen(false);
    setSelectedSupplier(null);
    setSelectedRouteForSupplier("");
  }, [addWaypoint, selectedRouteForSupplier, selectedSupplier]);

  // Route Handlers
  const handleCreateRoute = useCallback(async () => {
    if (!routeFormData.name || !routeFormData.origin || !routeFormData.destination) return;
    await createRoute.mutateAsync(routeFormData as CreateRouteData);
    setCreateRouteDialogOpen(false);
    setRouteFormData({ avg_fuel_consumption_per_km: 0.35 });
  }, [createRoute, routeFormData]);

  const handleUpdateRoute = useCallback(async () => {
    if (!selectedRoute) return;
    await updateRoute.mutateAsync({ id: selectedRoute.id, ...routeFormData });
    setEditRouteDialogOpen(false);
    setSelectedRoute(null);
    setRouteFormData({ avg_fuel_consumption_per_km: 0.35 });
  }, [routeFormData, selectedRoute, updateRoute]);

  const handleDeleteRoute = useCallback(async () => {
    if (!selectedRoute) return;
    await deleteRoute.mutateAsync(selectedRoute.id);
    setDeleteRouteDialogOpen(false);
    setSelectedRoute(null);
  }, [deleteRoute, selectedRoute]);

  const openEditRouteDialog = useCallback((route: FuelRoute) => {
    setSelectedRoute(route);
    setRouteFormData({
      name: route.name,
      origin: route.origin,
      origin_latitude: route.origin_latitude || undefined,
      origin_longitude: route.origin_longitude || undefined,
      destination: route.destination,
      destination_latitude: route.destination_latitude || undefined,
      destination_longitude: route.destination_longitude || undefined,
      total_distance_km: route.total_distance_km || undefined,
      estimated_duration_hours: route.estimated_duration_hours || undefined,
      is_round_trip: route.is_round_trip,
      notes: route.notes || undefined,
      driver_tips: route.driver_tips || undefined,
      best_fuel_strategy: route.best_fuel_strategy || undefined,
      avg_fuel_consumption_per_km: route.avg_fuel_consumption_per_km,
    });
    setEditRouteDialogOpen(true);
  }, []);

  const openDetailsDialog = useCallback((route: FuelRoute) => {
    setSelectedRoute(route);
    setDetailsDialogOpen(true);
  }, []);

  // Calculate fuel cost estimate for routes
  const calculateFuelCost = useCallback(
    (route: FuelRoute) => {
      if (!route.total_distance_km || cheapestSuppliers.length === 0) return null;
      const fuelNeeded = route.total_distance_km * route.avg_fuel_consumption_per_km;
      const cheapestPrice = cheapestSuppliers[0].current_price_per_liter;
      return { liters: fuelNeeded, cost: fuelNeeded * cheapestPrice, price: cheapestPrice };
    },
    [cheapestSuppliers]
  );

  // Calculate price difference from average
  const getPriceDiff = useCallback(
    (price: number) => {
      if (!statistics) return null;
      const diff = price - statistics.avgPrice;
      const percent = (diff / statistics.avgPrice) * 100;
      return { diff, percent };
    },
    [statistics]
  );

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Diesel Supplier Management</h1>
            <p className="text-muted-foreground">Manage suppliers and compare fuel pricing</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Supplier
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        {statistics && (
          <StatisticsCards statistics={statistics} />
        )}

        {/* Tabs */}
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList className="flex-wrap">
            <TabsTrigger value="all">All Suppliers</TabsTrigger>
            <TabsTrigger value="cheapest">
              <TrendingDown className="h-4 w-4 mr-1" />
              Cheapest
            </TabsTrigger>
            <TabsTrigger value="preferred">
              <Star className="h-4 w-4 mr-1" />
              Preferred
            </TabsTrigger>
            <TabsTrigger value="avoided">
              <Ban className="h-4 w-4 mr-1" />
              Avoided
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <TrendingUp className="h-4 w-4 mr-1" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="routes">
              <Route className="h-4 w-4 mr-1" />
              Routes
            </TabsTrigger>
            <TabsTrigger value="favorites">
              <Navigation className="h-4 w-4 mr-1" />
              Favorite Routes
            </TabsTrigger>
          </TabsList>

          {/* All Suppliers Tab */}
          <TabsContent value="all" className="space-y-4">
            <FiltersCard
              filters={filters}
              setFilters={setFilters}
              provinces={provinces}
            />
            <SuppliersTable
              suppliers={suppliers}
              statistics={statistics}
              getPriceDiff={getPriceDiff}
              openEditDialog={openEditDialog}
              openPriceDialog={openPriceDialog}
              openHistoryDialog={openHistoryDialog}
              openAddToRouteDialog={openAddToRouteDialog}
              handleTogglePreferred={handleTogglePreferred}
              openAvoidDialog={openAvoidDialog}
              handleUnmarkAvoided={handleUnmarkAvoided}
              setSelectedSupplier={setSelectedSupplier}
              setDeleteDialogOpen={setDeleteDialogOpen}
            />
          </TabsContent>

          {/* Cheapest Suppliers Tab */}
          <TabsContent value="cheapest">
            <CheapestSuppliersCard
              cheapestSuppliers={cheapestSuppliers}
              statistics={statistics}
            />
          </TabsContent>

          {/* Preferred Tab */}
          <TabsContent value="preferred">
            <PreferredSuppliersCard
              suppliers={suppliers.filter((s) => s.is_preferred)}
            />
          </TabsContent>

          {/* Avoided Tab */}
          <TabsContent value="avoided">
            <AvoidedSuppliersCard
              suppliers={suppliers.filter((s) => s.is_avoided)}
              handleUnmarkAvoided={handleUnmarkAvoided}
            />
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <AnalyticsTab statistics={statistics} />
          </TabsContent>

          {/* Routes Tab */}
          <TabsContent value="routes">
            <RoutesCard
              routes={routes}
              calculateFuelCost={calculateFuelCost}
              setCreateRouteDialogOpen={setCreateRouteDialogOpen}
              openDetailsDialog={openDetailsDialog}
              openEditRouteDialog={openEditRouteDialog}
              toggleFavorite={toggleFavorite}
              setSelectedRoute={setSelectedRoute}
              setDeleteRouteDialogOpen={setDeleteRouteDialogOpen}
            />
          </TabsContent>

          {/* Favorite Routes Tab */}
          <TabsContent value="favorites">
            <FavoriteRoutesCard
              routes={routes.filter((r) => r.is_favorite)}
              calculateFuelCost={calculateFuelCost}
              openDetailsDialog={openDetailsDialog}
            />
          </TabsContent>
        </Tabs>

        {/* Dialogs */}
        <CreateSupplierDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          formData={formData}
          setFormData={setFormData}
          handleCreateSupplier={handleCreateSupplier}
          isPending={createSupplier.isPending}
        />

        <EditSupplierDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          formData={formData}
          setFormData={setFormData}
          handleUpdateSupplier={handleUpdateSupplier}
          isPending={updateSupplier.isPending}
        />

        <UpdatePriceDialog
          open={priceDialogOpen}
          onOpenChange={setPriceDialogOpen}
          selectedSupplier={selectedSupplier}
          priceData={priceData}
          setPriceData={setPriceData}
          handleUpdatePrice={handleUpdatePrice}
          isPending={updatePrice.isPending}
        />

        <PriceHistoryDialogComponent
          open={historyDialogOpen}
          onOpenChange={setHistoryDialogOpen}
          supplier={selectedSupplier}
        />

        <AvoidDialog
          open={avoidDialogOpen}
          onOpenChange={setAvoidDialogOpen}
          selectedSupplier={selectedSupplier}
          avoidReason={avoidReason}
          setAvoidReason={setAvoidReason}
          handleMarkAvoided={handleMarkAvoided}
          isPending={toggleAvoided.isPending}
        />

        <DeleteConfirmation
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          selectedSupplier={selectedSupplier}
          handleDeleteSupplier={handleDeleteSupplier}
        />

        <BulkImportDialog
          open={importDialogOpen}
          onOpenChange={setImportDialogOpen}
          importData={importData}
          setImportData={setImportData}
          handleBulkImport={handleBulkImport}
          isPending={bulkImport.isPending}
        />

        <AddToRouteDialog
          open={addToRouteDialogOpen}
          onOpenChange={setAddToRouteDialogOpen}
          selectedSupplier={selectedSupplier}
          routes={routes}
          selectedRouteForSupplier={selectedRouteForSupplier}
          setSelectedRouteForSupplier={setSelectedRouteForSupplier}
          handleAddSupplierToRoute={handleAddSupplierToRoute}
          isPending={addWaypoint.isPending}
        />

        <CreateRouteDialog
          open={createRouteDialogOpen}
          onOpenChange={setCreateRouteDialogOpen}
          routeFormData={routeFormData}
          setRouteFormData={setRouteFormData}
          handleCreateRoute={handleCreateRoute}
          isPending={createRoute.isPending}
        />

        <EditRouteDialog
          open={editRouteDialogOpen}
          onOpenChange={setEditRouteDialogOpen}
          routeFormData={routeFormData}
          setRouteFormData={setRouteFormData}
          handleUpdateRoute={handleUpdateRoute}
          isPending={updateRoute.isPending}
        />

        {selectedRoute && (
          <RouteDetailsDialog
            open={detailsDialogOpen}
            onOpenChange={setDetailsDialogOpen}
            route={selectedRoute}
            cheapestSuppliers={cheapestSuppliers}
            allSuppliers={suppliers}
          />
        )}

        <DeleteRouteConfirmation
          open={deleteRouteDialogOpen}
          onOpenChange={setDeleteRouteDialogOpen}
          selectedRoute={selectedRoute}
          handleDeleteRoute={handleDeleteRoute}
        />
      </div>
    </Layout>
  );
};

// Extracted Components

const StatisticsCards = ({ statistics }: { statistics: NonNullable<ReturnType<typeof usePriceStatistics>["data"]> }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Total Suppliers</CardTitle>
        <Building2 className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{statistics.totalSuppliers}</div>
        <p className="text-xs text-muted-foreground mt-1">Active suppliers</p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Average Price</CardTitle>
        <Calculator className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">R{statistics.avgPrice.toFixed(2)}</div>
        <p className="text-xs text-muted-foreground mt-1">per liter</p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Lowest Price</CardTitle>
        <TrendingDown className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">R{statistics.minPrice.toFixed(2)}</div>
        <p className="text-xs text-muted-foreground mt-1">
          Save R{(statistics.avgPrice - statistics.minPrice).toFixed(2)}/L vs avg
        </p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Highest Price</CardTitle>
        <TrendingUp className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">R{statistics.maxPrice.toFixed(2)}</div>
        <p className="text-xs text-muted-foreground mt-1">
          +R{(statistics.maxPrice - statistics.avgPrice).toFixed(2)}/L above avg
        </p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Price Range</CardTitle>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">R{(statistics.maxPrice - statistics.minPrice).toFixed(2)}</div>
        <p className="text-xs text-muted-foreground mt-1">spread across suppliers</p>
      </CardContent>
    </Card>
  </div>
);

const FiltersCard = ({
  filters,
  setFilters,
  provinces,
  searchTerm,
  setSearchTerm,
}: {
  filters: { province?: string; sortBy?: "price" | "name" | "location"; sortOrder?: "asc" | "desc"; preferredOnly?: boolean; avoidedOnly?: boolean; };
  setFilters: (filters: { province?: string; sortBy?: "price" | "name" | "location"; sortOrder?: "asc" | "desc"; preferredOnly?: boolean; avoidedOnly?: boolean; }) => void;
  provinces: string[];
  searchTerm?: string;
  setSearchTerm?: (term: string) => void;
}) => (
  <Card className="shadow-lg border bg-gradient-to-r from-muted/30 to-muted/10">
    <CardHeader className="pb-3">
      <CardTitle className="text-base flex items-center gap-2">
        <Filter className="h-4 w-4 text-primary" />
        Search & Filters
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="flex flex-wrap gap-4 items-end">
        {/* Search Input */}
        <div className="flex-1 min-w-[250px]">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Search</Label>
          <div className="relative mt-1.5">
            <Fuel className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search suppliers by name or location..."
              className="pl-10 bg-background"
              value={searchTerm || ""}
              onChange={(e) => setSearchTerm?.(e.target.value)}
            />
          </div>
        </div>

        <div className="w-44">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Province</Label>
          <Select
            value={filters.province || "all"}
            onValueChange={(val) =>
              setFilters({ ...filters, province: val === "all" ? undefined : val })
            }
          >
            <SelectTrigger className="mt-1.5 bg-background">
              <SelectValue placeholder="All provinces" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Provinces</SelectItem>
              {provinces.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-36">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sort By</Label>
          <Select
            value={filters.sortBy || "price"}
            onValueChange={(val: "price" | "name" | "location") =>
              setFilters({ ...filters, sortBy: val })
            }
          >
            <SelectTrigger className="mt-1.5 bg-background">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="price">💰 Price</SelectItem>
              <SelectItem value="name">🏢 Name</SelectItem>
              <SelectItem value="location">📍 Location</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="w-36">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Order</Label>
          <Select
            value={filters.sortOrder || "asc"}
            onValueChange={(val: "asc" | "desc") =>
              setFilters({ ...filters, sortOrder: val })
            }
          >
            <SelectTrigger className="mt-1.5 bg-background">
              <SelectValue placeholder="Order" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="asc">
                <span className="flex items-center gap-2"><ArrowUp className="h-3 w-3" /> Low to High</span>
              </SelectItem>
              <SelectItem value="desc">
                <span className="flex items-center gap-2"><ArrowDown className="h-3 w-3" /> High to Low</span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </CardContent>
  </Card>
);

const SuppliersTable = ({
  suppliers,
  statistics,
  getPriceDiff,
  openEditDialog,
  openPriceDialog,
  openHistoryDialog,
  openAddToRouteDialog,
  handleTogglePreferred,
  openAvoidDialog,
  handleUnmarkAvoided,
  setSelectedSupplier,
  setDeleteDialogOpen,
}: {
  suppliers: DieselSupplier[];
  statistics: NonNullable<ReturnType<typeof usePriceStatistics>["data"]> | undefined;
  getPriceDiff: (price: number) => { diff: number; percent: number } | null;
  openEditDialog: (supplier: DieselSupplier) => void;
  openPriceDialog: (supplier: DieselSupplier) => void;
  openHistoryDialog: (supplier: DieselSupplier) => void;
  openAddToRouteDialog: (supplier: DieselSupplier) => void;
  handleTogglePreferred: (supplier: DieselSupplier) => Promise<void>;
  openAvoidDialog: (supplier: DieselSupplier) => void;
  handleUnmarkAvoided: (supplier: DieselSupplier) => Promise<void>;
  setSelectedSupplier: (supplier: DieselSupplier | null) => void;
  setDeleteDialogOpen: (open: boolean) => void;
}) => {
  // Calculate price position for progress bar
  const getPricePosition = (price: number) => {
    if (!statistics) return 50;
    const range = statistics.maxPrice - statistics.minPrice;
    if (range === 0) return 50;
    return ((price - statistics.minPrice) / range) * 100;
  };

  const getPriceColor = (price: number) => {
    if (!statistics) return "bg-slate-500";
    const position = getPricePosition(price);
    if (position <= 25) return "bg-gradient-to-r from-emerald-500 to-green-400";
    if (position <= 50) return "bg-gradient-to-r from-green-400 to-yellow-400";
    if (position <= 75) return "bg-gradient-to-r from-yellow-400 to-orange-400";
    return "bg-gradient-to-r from-orange-400 to-red-500";
  };

  return (
    <Card className="shadow-lg">
      <CardHeader className="border-b bg-gradient-to-r from-muted/50 to-muted/20">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Fuel className="h-5 w-5 text-primary" />
              Suppliers
            </CardTitle>
            <CardDescription>
              Manage all diesel suppliers and their current prices
            </CardDescription>
          </div>
          <Badge className="text-lg px-4 py-1.5 bg-blue-50 text-blue-700 border border-blue-200">
            {suppliers.length} Suppliers
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gradient-to-r from-muted/80 to-muted/50 hover:from-muted/80 hover:to-muted/50 border-b-2 border-muted">
                <TableHead className="py-3.5 font-semibold text-foreground/80">Supplier</TableHead>
                <TableHead className="py-3.5 font-semibold text-foreground/80">Location</TableHead>
                <TableHead className="py-3.5 font-semibold text-foreground/80">Province</TableHead>
                <TableHead className="py-3.5 font-semibold text-foreground/80 min-w-[180px]">Price/L</TableHead>
                <TableHead className="py-3.5 font-semibold text-foreground/80 text-center">vs Avg</TableHead>
                <TableHead className="py-3.5 font-semibold text-foreground/80 text-center">Status</TableHead>
                <TableHead className="py-3.5 font-semibold text-foreground/80 text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    <div className="flex flex-col items-center gap-3">
                      <Fuel className="h-12 w-12 opacity-30" />
                      <p className="text-lg font-medium">No suppliers found</p>
                      <p className="text-sm">Add your first supplier to get started.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                suppliers.map((supplier, index) => {
                  const priceDiff = getPriceDiff(supplier.current_price_per_liter);
                  const pricePosition = getPricePosition(supplier.current_price_per_liter);
                  return (
                    <TableRow
                      key={supplier.id}
                      className={`
                        ${index % 2 === 0 ? "bg-background" : "bg-muted/10"}
                        ${supplier.is_avoided ? "!bg-red-50 dark:!bg-red-950/30" : ""}
                        transition-all duration-200 ease-in-out
                        hover:bg-primary/5 hover:shadow-[inset_4px_0_0_0_hsl(var(--primary))]
                        group cursor-pointer
                      `}
                    >
                      <TableCell className="py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${supplier.is_preferred ? 'bg-yellow-100 dark:bg-yellow-900/30' : 'bg-muted/50'}`}>
                            <Building2 className={`h-4 w-4 ${supplier.is_preferred ? 'text-yellow-600 dark:text-yellow-400' : 'text-muted-foreground'}`} />
                          </div>
                          <div>
                            <div className="font-semibold flex items-center gap-2 group-hover:text-primary transition-colors">
                              {supplier.name}
                              {supplier.is_preferred && (
                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              )}
                            </div>
                            {supplier.has_truck_facilities && (
                              <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                                Truck facilities
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-3.5">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{supplier.location}</span>
                          {supplier.google_maps_url && (
                            <a
                              href={supplier.google_maps_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="View on Google Maps"
                              className="text-blue-500 hover:text-blue-600 hover:scale-110 transition-all"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-3.5">
                        {supplier.province ? (
                          <Badge variant="outline" className="font-normal">{supplier.province}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="py-3.5">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-lg">
                              R{supplier.current_price_per_liter.toFixed(2)}
                            </span>
                          </div>
                          {/* Price position progress bar */}
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full ${getPriceColor(supplier.current_price_per_liter)} rounded-full transition-all duration-500`}
                                style={{ width: `${Math.max(5, pricePosition)}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground w-8">{pricePosition.toFixed(0)}%</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center py-3.5">
                        {priceDiff && (
                          <Badge
                            className={`transition-all duration-200 ${
                              priceDiff.diff < 0
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-red-50 text-red-700 border border-red-200"
                            }`}
                          >
                            {priceDiff.diff > 0 ? (
                              <ArrowUp className="h-3 w-3 mr-1" />
                            ) : (
                              <ArrowDown className="h-3 w-3 mr-1" />
                            )}
                            {Math.abs(priceDiff.percent).toFixed(1)}%
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center py-3.5">
                        {supplier.is_avoided ? (
                          <Badge className="bg-red-50 text-red-700 border border-red-200 animate-pulse">
                            <Ban className="h-3 w-3 mr-1" />
                            Avoided
                          </Badge>
                        ) : supplier.is_preferred ? (
                          <Badge className="bg-amber-50 text-amber-700 border border-amber-200">
                            <Star className="h-3 w-3 mr-1 fill-white" />
                            Preferred
                          </Badge>
                        ) : (
                          <Badge className="bg-gradient-to-r from-slate-500 to-gray-400 text-white">Active</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center py-3.5">
                        <div className="opacity-70 group-hover:opacity-100 transition-opacity">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => openPriceDialog(supplier)}>
                                <DollarSign className="h-4 w-4 mr-2 text-emerald-500" />
                                Update Price
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openHistoryDialog(supplier)}>
                                <RefreshCw className="h-4 w-4 mr-2 text-blue-500" />
                                Price History
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openAddToRouteDialog(supplier)}>
                                <Route className="h-4 w-4 mr-2 text-purple-500" />
                                Add to Route
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleTogglePreferred(supplier)}>
                                <Star className={`h-4 w-4 mr-2 ${supplier.is_preferred ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'}`} />
                                {supplier.is_preferred ? "Remove Preferred" : "Mark Preferred"}
                              </DropdownMenuItem>
                              {supplier.is_avoided ? (
                                <DropdownMenuItem onClick={() => handleUnmarkAvoided(supplier)}>
                                  <Ban className="h-4 w-4 mr-2 text-muted-foreground" />
                                  Unmark Avoided
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => openAvoidDialog(supplier)}>
                                  <AlertTriangle className="h-4 w-4 mr-2 text-orange-500" />
                                  Mark to Avoid
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => openEditDialog(supplier)}>
                                <Edit className="h-4 w-4 mr-2 text-slate-500" />
                                Edit Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => {
                                  setSelectedSupplier(supplier);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

const CheapestSuppliersCard = ({
  cheapestSuppliers,
  statistics,
}: {
  cheapestSuppliers: DieselSupplier[];
  statistics: NonNullable<ReturnType<typeof usePriceStatistics>["data"]> | undefined;
}) => (
  <Card className="shadow-lg">
    <CardHeader className="border-b bg-gradient-to-r from-emerald-500/10 to-green-500/5">
      <CardTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
        <TrendingDown className="h-5 w-5" />
        Top 5 Cheapest Suppliers
      </CardTitle>
      <CardDescription>
        Best value diesel suppliers based on current prices
      </CardDescription>
    </CardHeader>
    <CardContent className="p-4">
      <div className="grid gap-3">
        {cheapestSuppliers.map((supplier, index) => (
          <div
            key={supplier.id}
            className="flex items-center justify-between p-4 rounded-xl border bg-gradient-to-r from-background to-muted/30 hover:shadow-md hover:border-emerald-200 dark:hover:border-emerald-800 transition-all duration-200 group"
          >
            <div className="flex items-center gap-4">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-md ${
                  index === 0
                    ? "bg-gradient-to-br from-yellow-400 to-amber-500"
                    : index === 1
                    ? "bg-gradient-to-br from-gray-300 to-gray-400"
                    : index === 2
                    ? "bg-gradient-to-br from-amber-500 to-orange-600"
                    : "bg-gradient-to-br from-slate-400 to-slate-500"
                }`}
              >
                {index + 1}
              </div>
              <div>
                <div className="font-semibold flex items-center gap-2 group-hover:text-emerald-600 transition-colors">
                  {supplier.name}
                  {supplier.is_preferred && (
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  )}
                </div>
                <div className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  {supplier.location}
                  {supplier.province && `, ${supplier.province}`}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-emerald-600 font-bold">
                R{supplier.current_price_per_liter.toFixed(2)}
              </div>
              {statistics && (
                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs">
                  Save R{(statistics.avgPrice - supplier.current_price_per_liter).toFixed(2)}/L
                </Badge>
              )}
            </div>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

const PreferredSuppliersCard = ({
  suppliers,
}: {
  suppliers: DieselSupplier[];
}) => (
  <Card className="shadow-lg">
    <CardHeader className="border-b bg-gradient-to-r from-yellow-500/10 to-amber-500/5">
      <CardTitle className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
        <Star className="h-5 w-5 fill-yellow-500" />
        Preferred Suppliers
      </CardTitle>
      <CardDescription>
        Your go-to suppliers for reliable service and competitive prices
      </CardDescription>
    </CardHeader>
    <CardContent className="p-4">
      {suppliers.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Star className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No preferred suppliers yet</p>
          <p className="text-sm mt-1">Mark suppliers as preferred from the All Suppliers tab.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {suppliers.map((supplier) => (
            <Card key={supplier.id} className="border-yellow-200 dark:border-yellow-800/50 hover:shadow-md hover:border-yellow-300 dark:hover:border-yellow-700 transition-all duration-200 group overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-yellow-400 to-amber-500" />
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2 group-hover:text-yellow-600 transition-colors">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  {supplier.name}
                </CardTitle>
                <CardDescription className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  {supplier.location}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600 font-bold">
                  R{supplier.current_price_per_liter.toFixed(2)}
                  <span className="text-sm font-normal text-muted-foreground">/L</span>
                </div>
                {supplier.notes && (
                  <p className="text-sm text-muted-foreground mt-2 italic">{supplier.notes}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </CardContent>
  </Card>
);

const AvoidedSuppliersCard = ({
  suppliers,
  handleUnmarkAvoided,
}: {
  suppliers: DieselSupplier[];
  handleUnmarkAvoided: (supplier: DieselSupplier) => Promise<void>;
}) => (
  <Card className="shadow-lg border-red-200 dark:border-red-800/30">
    <CardHeader className="border-b bg-gradient-to-r from-red-500/10 to-rose-500/5">
      <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
        <Ban className="h-5 w-5" />
        Suppliers to Avoid
      </CardTitle>
      <CardDescription>
        These suppliers have been flagged to avoid due to various issues
      </CardDescription>
    </CardHeader>
    <CardContent className="p-0">
      {suppliers.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground p-4">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <p className="font-medium text-green-600 dark:text-green-400">No avoided suppliers</p>
          <p className="text-sm mt-1">That's good news!</p>
        </div>
      ) : (
        <div className="rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/20 hover:from-red-50 hover:to-rose-50">
                <TableHead className="font-semibold">Supplier</TableHead>
                <TableHead className="font-semibold">Location</TableHead>
                <TableHead className="font-semibold">Price</TableHead>
                <TableHead className="font-semibold">Reason</TableHead>
                <TableHead className="text-center font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliers.map((supplier) => (
                <TableRow key={supplier.id} className="hover:bg-red-50/50 dark:hover:bg-red-950/20 transition-colors">
                  <TableCell className="font-medium">{supplier.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                      {supplier.location}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono">R{supplier.current_price_per_liter.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant="destructive" className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800/50">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {supplier.avoid_reason || "Not specified"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="outline"
                      size="sm"
                      className="hover:bg-green-50 hover:text-green-600 hover:border-green-300"
                      onClick={() => handleUnmarkAvoided(supplier)}
                    >
                      <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                      Restore
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </CardContent>
  </Card>
);

const AnalyticsTab = ({
  statistics,
}: {
  statistics: NonNullable<ReturnType<typeof usePriceStatistics>["data"]> | undefined;
}) => {
  const provinceData = useMemo(
    () =>
      statistics
        ? Object.entries(statistics.byProvince).map(([province, data]) => ({
            province,
            avgPrice: Number(data.avgPrice.toFixed(2)),
            minPrice: Number(data.minPrice.toFixed(2)),
            count: data.count,
          }))
        : [],
    [statistics]
  );

  const sortedProvinceEntries = useMemo(
    () =>
      statistics
        ? Object.entries(statistics.byProvince).sort(([, a], [, b]) => a.avgPrice - b.avgPrice)
        : [],
    [statistics]
  );

  if (!statistics) return null;

  return (
    <div className="grid gap-6">
      {/* Price by Province */}
      {Object.keys(statistics.byProvince).length > 0 && (
        <Card className="shadow-lg">
          <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-primary/0">
            <CardTitle className="flex items-center gap-2">
              <BarChart className="h-5 w-5 text-primary" />
              Average Price by Province
            </CardTitle>
            <CardDescription>Compare diesel prices across different regions</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={provinceData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="opacity-50" />
                  <XAxis
                    dataKey="province"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number) => [`R${value.toFixed(2)}`, ""]}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }}
                  />
                  <Bar dataKey="avgPrice" fill="url(#primaryGradient)" name="Avg Price" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="minPrice" fill="url(#greenGradient)" name="Min Price" radius={[4, 4, 0, 0]} />
                  <defs>
                    <linearGradient id="primaryGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={1} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.7} />
                    </linearGradient>
                    <linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(142 76% 36%)" stopOpacity={1} />
                      <stop offset="100%" stopColor="hsl(142 76% 36%)" stopOpacity={0.7} />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Province Stats Table */}
      <Card className="shadow-lg">
        <CardHeader className="border-b bg-gradient-to-r from-muted/50 to-muted/20">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Regional Statistics
          </CardTitle>
          <CardDescription>Supplier distribution and pricing by province</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-muted/80 to-muted/50 hover:from-muted/80 hover:to-muted/50 border-b-2 border-muted">
                  <TableHead className="py-3.5 font-semibold">Province</TableHead>
                  <TableHead className="text-center py-3.5 font-semibold">Suppliers</TableHead>
                  <TableHead className="text-right py-3.5 font-semibold">Avg Price</TableHead>
                  <TableHead className="text-right py-3.5 font-semibold">Min Price</TableHead>
                  <TableHead className="text-center py-3.5 font-semibold">vs Overall Avg</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedProvinceEntries.map(([province, data], index) => {
                  const diff = data.avgPrice - statistics.avgPrice;
                  const percent = (diff / statistics.avgPrice) * 100;
                  return (
                    <TableRow
                      key={province}
                      className={`
                        ${index % 2 === 0 ? "bg-background" : "bg-muted/10"}
                        transition-all duration-200 hover:bg-primary/5 hover:shadow-[inset_4px_0_0_0_hsl(var(--primary))]
                      `}
                    >
                      <TableCell className="py-3.5 font-medium">{province}</TableCell>
                      <TableCell className="text-center py-3.5">
                        <Badge variant="outline" className="font-mono">{data.count}</Badge>
                      </TableCell>
                      <TableCell className="text-right py-3.5 font-mono font-semibold">
                        R{data.avgPrice.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right py-3.5">
                        <span className="font-mono text-emerald-600 dark:text-emerald-400">
                          R{data.minPrice.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center py-3.5">
                        <Badge
                          className={
                            diff < 0
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-red-50 text-red-700 border border-red-200"
                          }
                        >
                          {diff > 0 ? <ArrowUp className="h-3 w-3 mr-1" /> : <ArrowDown className="h-3 w-3 mr-1" />}
                          {Math.abs(percent).toFixed(1)}%
                        </Badge>
                      </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const RoutesCard = ({
  routes,
  calculateFuelCost,
  setCreateRouteDialogOpen,
  openDetailsDialog,
  openEditRouteDialog,
  toggleFavorite,
  setSelectedRoute,
  setDeleteRouteDialogOpen,
}: {
  routes: FuelRoute[];
  calculateFuelCost: (route: FuelRoute) => { liters: number; cost: number; price: number } | null;
  setCreateRouteDialogOpen: (open: boolean) => void;
  openDetailsDialog: (route: FuelRoute) => void;
  openEditRouteDialog: (route: FuelRoute) => void;
  toggleFavorite: ReturnType<typeof useToggleRouteFavorite>;
  setSelectedRoute: (route: FuelRoute | null) => void;
  setDeleteRouteDialogOpen: (open: boolean) => void;
}) => (
  <Card className="shadow-lg">
    <CardHeader className="border-b bg-gradient-to-r from-purple-500/10 to-violet-500/5">
      <div className="flex items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-400">
            <Route className="h-5 w-5" />
            Frequently Used Routes
          </CardTitle>
          <CardDescription>
            Manage routes, add notes, and view fuel cost estimates
          </CardDescription>
        </div>
        <div className="flex items-center gap-3">
          <Badge className="text-base px-3 py-1 bg-gradient-to-r from-purple-500 to-violet-400 text-white shadow-sm">
            {routes.length} Routes
          </Badge>
          <Button onClick={() => setCreateRouteDialogOpen(true)} className="bg-gradient-to-r from-purple-500 to-violet-400 hover:from-purple-600 hover:to-violet-500 text-white shadow-md">
            <Plus className="h-4 w-4 mr-2" />
            Add Route
          </Button>
        </div>
      </div>
    </CardHeader>
    <CardContent className="p-4">
      {routes.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
            <Route className="h-8 w-8 text-purple-500 opacity-70" />
          </div>
          <p className="text-lg font-medium">No routes yet</p>
          <p className="text-sm mt-1">Add your first frequently used route.</p>
          <Button className="mt-4 bg-gradient-to-r from-purple-500 to-violet-400 hover:from-purple-600 hover:to-violet-500" onClick={() => setCreateRouteDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Route
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {routes.map((route) => {
            const fuelEstimate = calculateFuelCost(route);
            return (
              <Card key={route.id} className="hover:shadow-lg transition-all duration-200 hover:border-purple-200 dark:hover:border-purple-800/50 group overflow-hidden">
                {route.is_favorite && <div className="h-1 bg-gradient-to-r from-yellow-400 to-amber-500" />}
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold group-hover:text-purple-600 transition-colors">{route.name}</h3>
                        {route.is_favorite && (
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        )}
                        {route.is_round_trip && (
                          <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">Round Trip</Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50">
                          <MapPin className="h-3.5 w-3.5 text-purple-500" />
                          <span>{route.origin}</span>
                        </div>
                        <ArrowRight className="h-4 w-4 text-purple-400" />
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50">
                          <MapPin className="h-3.5 w-3.5 text-purple-500" />
                          <span>{route.destination}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="p-2 rounded-lg bg-muted/30">
                          <span className="text-xs text-muted-foreground uppercase tracking-wide">Distance</span>
                          <p className="font-semibold mt-0.5">
                            {route.total_distance_km
                              ? `${route.total_distance_km.toLocaleString()} km`
                              : "Not set"}
                          </p>
                        </div>
                        <div className="p-2 rounded-lg bg-muted/30">
                          <span className="text-xs text-muted-foreground uppercase tracking-wide">Duration</span>
                          <p className="font-semibold mt-0.5">
                            {route.estimated_duration_hours
                              ? `${route.estimated_duration_hours} hrs`
                              : "Not set"}
                          </p>
                        </div>
                        <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30">
                          <span className="text-xs text-blue-600 dark:text-blue-400 uppercase tracking-wide">Fuel Needed</span>
                          <p className="font-semibold mt-0.5 text-blue-700 dark:text-blue-300">
                            {fuelEstimate
                              ? `${fuelEstimate.liters.toFixed(0)} L`
                              : "N/A"}
                          </p>
                        </div>
                        <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
                          <span className="text-xs text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Est. Cost</span>
                          <p className="font-semibold mt-0.5 text-emerald-700 dark:text-emerald-300">
                            {fuelEstimate
                              ? `R${fuelEstimate.cost.toFixed(2)}`
                              : "N/A"}
                          </p>
                        </div>
                      </div>

                      {route.notes && (
                        <p className="mt-4 text-sm text-muted-foreground border-t pt-3 italic">
                          <span className="font-medium not-italic">Notes:</span> {route.notes}
                        </p>
                      )}

                      {route.usage_count > 0 && (
                        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">Used {route.usage_count}x</Badge>
                          {route.last_used_at && <span>Last: {formatDate(route.last_used_at)}</span>}
                        </p>
                      )}
                    </div>

                    <div className="opacity-70 group-hover:opacity-100 transition-opacity">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openDetailsDialog(route)}>
                          <FileText className="h-4 w-4 mr-2" />
                          View Details & Notes
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            toggleFavorite.mutate({
                              id: route.id,
                              is_favorite: !route.is_favorite,
                            })
                          }
                        >
                          <Star className="h-4 w-4 mr-2" />
                          {route.is_favorite ? "Remove from Favorites" : "Add to Favorites"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => openEditRouteDialog(route)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Route
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => {
                            setSelectedRoute(route);
                            setDeleteRouteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </CardContent>
  </Card>
);

const FavoriteRoutesCard = ({
  routes,
  calculateFuelCost,
  openDetailsDialog,
}: {
  routes: FuelRoute[];
  calculateFuelCost: (route: FuelRoute) => { liters: number; cost: number; price: number } | null;
  openDetailsDialog: (route: FuelRoute) => void;
}) => (
  <Card className="shadow-lg">
    <CardHeader className="border-b bg-gradient-to-r from-yellow-500/10 to-amber-500/5">
      <CardTitle className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
        <Star className="h-5 w-5 fill-yellow-500" />
        Favorite Routes
      </CardTitle>
      <CardDescription>Your most used routes for quick access</CardDescription>
    </CardHeader>
    <CardContent className="p-4">
      {routes.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Star className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No favorite routes yet</p>
          <p className="text-sm mt-1">Star your frequently used routes from the Routes tab.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {routes.map((route) => {
            const fuelEstimate = calculateFuelCost(route);
            return (
              <Card
                key={route.id}
                className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:border-yellow-300 dark:hover:border-yellow-700 group overflow-hidden"
                onClick={() => openDetailsDialog(route)}
              >
                <div className="h-1 bg-gradient-to-r from-yellow-400 to-amber-500" />
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2 group-hover:text-yellow-600 transition-colors">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    {route.name}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    {route.origin} → {route.destination}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center text-sm">
                    <Badge variant="outline" className="font-mono">
                      {route.total_distance_km?.toLocaleString()} km
                    </Badge>
                    {fuelEstimate && (
                      <span className="font-bold text-emerald-600 font-bold">
                        ~R{fuelEstimate.cost.toFixed(0)}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </CardContent>
  </Card>
);

const CreateSupplierDialog = ({
  open,
  onOpenChange,
  formData,
  setFormData,
  handleCreateSupplier,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: Partial<CreateSupplierData>;
  setFormData: (data: Partial<CreateSupplierData>) => void;
  handleCreateSupplier: () => Promise<void>;
  isPending: boolean;
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Add New Diesel Supplier</DialogTitle>
        <DialogDescription>Enter the supplier details and current diesel price</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Supplier Name *</Label>
            <Input
              value={formData.name || ""}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Total Energies"
            />
          </div>
          <div className="space-y-2">
            <Label>Location *</Label>
            <Input
              value={formData.location || ""}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="e.g., Johannesburg CBD"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Full Address</Label>
          <Input
            value={formData.address || ""}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder="Street address"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Province</Label>
            <Input
              value={formData.province || ""}
              onChange={(e) => setFormData({ ...formData, province: e.target.value })}
              placeholder="e.g., Gauteng"
            />
          </div>
          <div className="space-y-2">
            <Label>Current Price (R/L) *</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.current_price_per_liter || ""}
              onChange={(e) =>
                setFormData({ ...formData, current_price_per_liter: parseFloat(e.target.value) })
              }
              placeholder="e.g., 23.50"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Google Maps URL</Label>
            <Input
              value={formData.google_maps_url || ""}
              onChange={(e) => setFormData({ ...formData, google_maps_url: e.target.value })}
              placeholder="https://maps.google.com/..."
            />
          </div>
          <div className="space-y-2">
            <Label>Operating Hours</Label>
            <Input
              value={formData.operating_hours || ""}
              onChange={(e) => setFormData({ ...formData, operating_hours: e.target.value })}
              placeholder="e.g., 24/7 or 06:00-22:00"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Notes</Label>
          <Textarea
            value={formData.notes || ""}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Any additional information..."
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button onClick={handleCreateSupplier} disabled={isPending}>
          {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Add Supplier
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

const EditSupplierDialog = ({
  open,
  onOpenChange,
  formData,
  setFormData,
  handleUpdateSupplier,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: Partial<CreateSupplierData>;
  setFormData: (data: Partial<CreateSupplierData>) => void;
  handleUpdateSupplier: () => Promise<void>;
  isPending: boolean;
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Edit Supplier</DialogTitle>
        <DialogDescription>Update supplier information</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Supplier Name</Label>
            <Input
              value={formData.name || ""}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Location</Label>
            <Input
              value={formData.location || ""}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Full Address</Label>
          <Input
            value={formData.address || ""}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Province</Label>
            <Input
              value={formData.province || ""}
              onChange={(e) => setFormData({ ...formData, province: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Google Maps URL</Label>
            <Input
              value={formData.google_maps_url || ""}
              onChange={(e) => setFormData({ ...formData, google_maps_url: e.target.value })}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Notes</Label>
          <Textarea
            value={formData.notes || ""}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button onClick={handleUpdateSupplier} disabled={isPending}>
          {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save Changes
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

const UpdatePriceDialog = ({
  open,
  onOpenChange,
  selectedSupplier,
  priceData,
  setPriceData,
  handleUpdatePrice,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedSupplier: DieselSupplier | null;
  priceData: { new_price: string; notes: string };
  setPriceData: (data: typeof priceData) => void;
  handleUpdatePrice: () => Promise<void>;
  isPending: boolean;
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Update Diesel Price</DialogTitle>
        <DialogDescription>
          Update the current price for {selectedSupplier?.name}
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="space-y-2">
          <Label>Current Price</Label>
          <div className="text-lg font-mono">
            R{selectedSupplier?.current_price_per_liter.toFixed(2)}/L
          </div>
        </div>
        <div className="space-y-2">
          <Label>New Price (R/L) *</Label>
          <Input
            type="number"
            step="0.01"
            value={priceData.new_price}
            onChange={(e) => setPriceData({ ...priceData, new_price: e.target.value })}
            placeholder="Enter new price"
          />
        </div>
        <div className="space-y-2">
          <Label>Notes</Label>
          <Textarea
            value={priceData.notes}
            onChange={(e) => setPriceData({ ...priceData, notes: e.target.value })}
            placeholder="Reason for price change..."
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button onClick={handleUpdatePrice} disabled={isPending}>
          {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Update Price
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

const AvoidDialog = ({
  open,
  onOpenChange,
  selectedSupplier,
  avoidReason,
  setAvoidReason,
  handleMarkAvoided,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedSupplier: DieselSupplier | null;
  avoidReason: string;
  setAvoidReason: (reason: string) => void;
  handleMarkAvoided: () => Promise<void>;
  isPending: boolean;
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle className="text-red-600">Mark Supplier to Avoid</DialogTitle>
        <DialogDescription>
          Mark {selectedSupplier?.name} as a supplier to avoid. Please provide a reason.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label>Reason for Avoiding</Label>
          <Textarea
            value={avoidReason}
            onChange={(e) => setAvoidReason(e.target.value)}
            placeholder="e.g., Poor fuel quality, long queues, bad service..."
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button
          variant="destructive"
          onClick={handleMarkAvoided}
          disabled={isPending}
        >
          {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Mark to Avoid
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

const DeleteConfirmation = ({
  open,
  onOpenChange,
  selectedSupplier,
  handleDeleteSupplier,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedSupplier: DieselSupplier | null;
  handleDeleteSupplier: () => Promise<void>;
}) => (
  <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Delete Supplier?</AlertDialogTitle>
        <AlertDialogDescription>
          Are you sure you want to delete {selectedSupplier?.name}? This action cannot be undone
          and will remove all price history.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction
          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          onClick={handleDeleteSupplier}
        >
          Delete
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

const BulkImportDialog = ({
  open,
  onOpenChange,
  importData,
  setImportData,
  handleBulkImport,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  importData: string;
  setImportData: (data: string) => void;
  handleBulkImport: () => Promise<void>;
  isPending: boolean;
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Bulk Import Suppliers</DialogTitle>
        <DialogDescription>
          Paste tab-separated data with columns: Name, Location, Address, Price
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <Textarea
          value={importData}
          onChange={(e) => setImportData(e.target.value)}
          placeholder={`Example:\nShell Johannesburg\tJohannesburg CBD\t123 Main Street, Johannesburg, Gauteng\tR23.50\nBP Pretoria\tPretoria East\t456 Oak Avenue, Pretoria, Gauteng\tR23.75`}
          className="min-h-[200px] font-mono text-sm"
        />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button onClick={handleBulkImport} disabled={isPending}>
          {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Import Suppliers
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

const AddToRouteDialog = ({
  open,
  onOpenChange,
  selectedSupplier,
  routes,
  selectedRouteForSupplier,
  setSelectedRouteForSupplier,
  handleAddSupplierToRoute,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedSupplier: DieselSupplier | null;
  routes: FuelRoute[];
  selectedRouteForSupplier: string;
  setSelectedRouteForSupplier: (routeId: string) => void;
  handleAddSupplierToRoute: () => Promise<void>;
  isPending: boolean;
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Route className="h-5 w-5" />
          Add to Route
        </DialogTitle>
        <DialogDescription>
          Add {selectedSupplier?.name} as a fuel stop on one of your routes
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        {selectedSupplier && (
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Fuel className="h-8 w-8 text-green-600" />
                <div>
                  <h4 className="font-medium">{selectedSupplier.name}</h4>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {selectedSupplier.location}
                    {selectedSupplier.province && `, ${selectedSupplier.province}`}
                  </p>
                  <p className="text-sm font-medium text-green-600">
                    R{selectedSupplier.current_price_per_liter.toFixed(2)}/L
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-2">
          <Label>Select Route *</Label>
          {routes.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              <Route className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No routes available.</p>
              <p className="text-xs">Create a route first from the Routes tab.</p>
            </div>
          ) : (
            <Select
              value={selectedRouteForSupplier}
              onValueChange={setSelectedRouteForSupplier}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a route..." />
              </SelectTrigger>
              <SelectContent>
                {routes.map((route) => (
                  <SelectItem key={route.id} value={route.id}>
                    <div className="flex items-center gap-2">
                      {route.is_favorite && (
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      )}
                      <span>{route.name}</span>
                      <span className="text-muted-foreground text-xs">
                        ({route.origin} → {route.destination})
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {selectedRouteForSupplier && (
          <div className="rounded-lg border p-3 bg-green-50 dark:bg-green-950">
            <p className="text-sm text-green-700 dark:text-green-300">
              <strong>{selectedSupplier?.name}</strong> will be added as a fuel stop on this route.
              You can reorder stops from the route details.
            </p>
          </div>
        )}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button
          onClick={handleAddSupplierToRoute}
          disabled={!selectedRouteForSupplier || isPending}
        >
          {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Add to Route
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

const CreateRouteDialog = ({
  open,
  onOpenChange,
  routeFormData,
  setRouteFormData,
  handleCreateRoute,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  routeFormData: Partial<CreateRouteData>;
  setRouteFormData: (data: Partial<CreateRouteData>) => void;
  handleCreateRoute: () => Promise<void>;
  isPending: boolean;
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Add New Route</DialogTitle>
        <DialogDescription>Create a frequently used route for fuel planning</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="space-y-2">
          <Label>Route Name *</Label>
          <Input
            value={routeFormData.name || ""}
            onChange={(e) => setRouteFormData({ ...routeFormData, name: e.target.value })}
            placeholder="e.g., Johannesburg to Durban"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Origin *</Label>
            <Input
              value={routeFormData.origin || ""}
              onChange={(e) => setRouteFormData({ ...routeFormData, origin: e.target.value })}
              placeholder="e.g., Johannesburg"
            />
          </div>
          <div className="space-y-2">
            <Label>Destination *</Label>
            <Input
              value={routeFormData.destination || ""}
              onChange={(e) => setRouteFormData({ ...routeFormData, destination: e.target.value })}
              placeholder="e.g., Durban"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Total Distance (km)</Label>
            <Input
              type="number"
              value={routeFormData.total_distance_km || ""}
              onChange={(e) =>
                setRouteFormData({ ...routeFormData, total_distance_km: parseFloat(e.target.value) })
              }
              placeholder="e.g., 580"
            />
          </div>
          <div className="space-y-2">
            <Label>Estimated Duration (hours)</Label>
            <Input
              type="number"
              step="0.5"
              value={routeFormData.estimated_duration_hours || ""}
              onChange={(e) =>
                setRouteFormData({
                  ...routeFormData,
                  estimated_duration_hours: parseFloat(e.target.value),
                })
              }
              placeholder="e.g., 6.5"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Fuel Consumption (L/km)</Label>
          <Input
            type="number"
            step="0.01"
            value={routeFormData.avg_fuel_consumption_per_km || 0.35}
            onChange={(e) =>
              setRouteFormData({
                ...routeFormData,
                avg_fuel_consumption_per_km: parseFloat(e.target.value),
              })
            }
            placeholder="0.35"
          />
          <p className="text-xs text-muted-foreground">
            Average truck consumption is 0.35 L/km (35L per 100km)
          </p>
        </div>

        <div className="space-y-2">
          <Label>Route Notes</Label>
          <Textarea
            value={routeFormData.notes || ""}
            onChange={(e) => setRouteFormData({ ...routeFormData, notes: e.target.value })}
            placeholder="General notes about this route..."
          />
        </div>

        <div className="space-y-2">
          <Label>Driver Tips</Label>
          <Textarea
            value={routeFormData.driver_tips || ""}
            onChange={(e) => setRouteFormData({ ...routeFormData, driver_tips: e.target.value })}
            placeholder="Tips for drivers on this route..."
          />
        </div>

        <div className="space-y-2">
          <Label>Recommended Fuel Strategy</Label>
          <Textarea
            value={routeFormData.best_fuel_strategy || ""}
            onChange={(e) =>
              setRouteFormData({ ...routeFormData, best_fuel_strategy: e.target.value })
            }
            placeholder="e.g., Fill up at Total Harrismith for best price..."
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button onClick={handleCreateRoute} disabled={isPending}>
          {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Create Route
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

const EditRouteDialog = ({
  open,
  onOpenChange,
  routeFormData,
  setRouteFormData,
  handleUpdateRoute,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  routeFormData: Partial<CreateRouteData>;
  setRouteFormData: (data: Partial<CreateRouteData>) => void;
  handleUpdateRoute: () => Promise<void>;
  isPending: boolean;
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Edit Route</DialogTitle>
        <DialogDescription>Update route information</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="space-y-2">
          <Label>Route Name</Label>
          <Input
            value={routeFormData.name || ""}
            onChange={(e) => setRouteFormData({ ...routeFormData, name: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Origin</Label>
            <Input
              value={routeFormData.origin || ""}
              onChange={(e) => setRouteFormData({ ...routeFormData, origin: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Destination</Label>
            <Input
              value={routeFormData.destination || ""}
              onChange={(e) => setRouteFormData({ ...routeFormData, destination: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Total Distance (km)</Label>
            <Input
              type="number"
              value={routeFormData.total_distance_km || ""}
              onChange={(e) =>
                setRouteFormData({ ...routeFormData, total_distance_km: parseFloat(e.target.value) })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Estimated Duration (hours)</Label>
            <Input
              type="number"
              step="0.5"
              value={routeFormData.estimated_duration_hours || ""}
              onChange={(e) =>
                setRouteFormData({
                  ...routeFormData,
                  estimated_duration_hours: parseFloat(e.target.value),
                })
              }
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Route Notes</Label>
          <Textarea
            value={routeFormData.notes || ""}
            onChange={(e) => setRouteFormData({ ...routeFormData, notes: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label>Driver Tips</Label>
          <Textarea
            value={routeFormData.driver_tips || ""}
            onChange={(e) => setRouteFormData({ ...routeFormData, driver_tips: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label>Recommended Fuel Strategy</Label>
          <Textarea
            value={routeFormData.best_fuel_strategy || ""}
            onChange={(e) =>
              setRouteFormData({ ...routeFormData, best_fuel_strategy: e.target.value })
            }
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button onClick={handleUpdateRoute} disabled={isPending}>
          {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save Changes
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

const DeleteRouteConfirmation = ({
  open,
  onOpenChange,
  selectedRoute,
  handleDeleteRoute,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedRoute: FuelRoute | null;
  handleDeleteRoute: () => Promise<void>;
}) => (
  <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Delete Route?</AlertDialogTitle>
        <AlertDialogDescription>
          Are you sure you want to delete {selectedRoute?.name}? This will also delete all
          notes and waypoints associated with this route.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction
          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          onClick={handleDeleteRoute}
        >
          Delete
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

// Price History Dialog Component
const PriceHistoryDialogComponent = ({
  open,
  onOpenChange,
  supplier,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier: DieselSupplier | null;
}) => {
  const { data: history = [], isLoading } = useSupplierPriceHistory(supplier?.id || "");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Price History - {supplier?.name}</DialogTitle>
          <DialogDescription>View historical price changes for this supplier</DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No price history available yet
          </div>
        ) : (
          <>
            {/* Price Chart */}
            <div className="h-64 mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={[...history].reverse().map((h) => ({
                  date: new Date(h.effective_date).toLocaleDateString("en-ZA", { month: "short", year: "2-digit" }),
                  price: h.price_per_liter,
                }))}>
                  <XAxis dataKey="date" />
                  <YAxis domain={["auto", "auto"]} />
                  <Tooltip formatter={(value: number) => [`R${value.toFixed(2)}`, "Price"]} />
                  <Line type="monotone" dataKey="price" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* History Table */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-center">Change</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{formatDate(entry.effective_date)}</TableCell>
                    <TableCell className="text-right font-mono">
                      R{entry.price_per_liter.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-center">
                      {entry.price_change !== null && (
                        <Badge
                          variant={entry.price_change < 0 ? "default" : "destructive"}
                          className={
                            entry.price_change < 0
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                              : ""
                          }
                        >
                          {entry.price_change > 0 ? (
                            <ArrowUp className="h-3 w-3 mr-1" />
                          ) : (
                            <ArrowDown className="h-3 w-3 mr-1" />
                          )}
                          {entry.price_change_percent?.toFixed(1)}%
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {entry.notes || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

// Route Details Dialog Component
const RouteDetailsDialog = ({
  open,
  onOpenChange,
  route,
  cheapestSuppliers,
  allSuppliers,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  route: FuelRoute;
  cheapestSuppliers: DieselSupplier[];
  allSuppliers: DieselSupplier[];
}) => {
  const { data: notes = [], isLoading: notesLoading } = useRouteNotes(route.id);
  const { data: waypoints = [] } = useRouteWaypoints(route.id);
  const addNote = useAddRouteNote();
  const updateNote = useUpdateRouteNote();
  const deleteNote = useDeleteRouteNote();
  const updateWaypointNotes = useUpdateWaypointNotes();
  const deleteWaypoint = useDeleteRouteWaypoint();
  const reorderWaypoints = useReorderWaypoints();

  // Calculate average price for the export component
  const avgPrice = useMemo(
    () =>
      allSuppliers.length > 0
        ? allSuppliers.reduce((sum, s) => sum + s.current_price_per_liter, 0) / allSuppliers.length
        : 0,
    [allSuppliers]
  );

  // Handler for updating waypoint notes from the export component
  const handleUpdateWaypointNotes = useCallback(
    async (waypointId: string, notesText: string) => {
      await updateWaypointNotes.mutateAsync({ id: waypointId, route_id: route.id, notes: notesText });
    },
    [route.id, updateWaypointNotes]
  );

  // Handler for removing a waypoint from the route
  const handleRemoveWaypoint = useCallback(
    async (waypointId: string) => {
      await deleteWaypoint.mutateAsync({ id: waypointId, route_id: route.id });
    },
    [deleteWaypoint, route.id]
  );

  // Handler for reordering waypoints (changing fuel stop sequence)
  const handleReorderWaypoints = useCallback(
    async (waypointOrders: { id: string; sequence_order: number }[]) => {
      await reorderWaypoints.mutateAsync({ route_id: route.id, waypoint_orders: waypointOrders });
    },
    [reorderWaypoints, route.id]
  );

  const [addNoteDialogOpen, setAddNoteDialogOpen] = useState(false);
  const [editNoteId, setEditNoteId] = useState<string | null>(null);
  const [noteForm, setNoteForm] = useState<Partial<CreateNoteData>>({ note_type: "general" });

  const handleAddNote = useCallback(async () => {
    if (!noteForm.content) return;
    await addNote.mutateAsync({
      route_id: route.id,
      title: noteForm.title,
      content: noteForm.content,
      note_type: noteForm.note_type as "general" | "fuel" | "road_condition" | "hazard" | "tip",
      location_description: noteForm.location_description,
      is_important: noteForm.is_important,
    });
    setAddNoteDialogOpen(false);
    setNoteForm({ note_type: "general" });
  }, [addNote, noteForm, route.id]);

  const handleUpdateNote = useCallback(async () => {
    if (!editNoteId || !noteForm.content) return;
    await updateNote.mutateAsync({
      id: editNoteId,
      route_id: route.id,
      title: noteForm.title,
      content: noteForm.content,
      note_type: noteForm.note_type as "general" | "fuel" | "road_condition" | "hazard" | "tip",
      is_important: noteForm.is_important,
    });
    setEditNoteId(null);
    setNoteForm({ note_type: "general" });
  }, [editNoteId, noteForm, route.id, updateNote]);

  const handleDeleteNote = useCallback(
    async (noteId: string) => {
      await deleteNote.mutateAsync({ id: noteId, route_id: route.id });
    },
    [deleteNote, route.id]
  );

  const openEditNote = useCallback((note: RouteNote) => {
    setNoteForm({
      note_type: note.note_type,
      title: note.title || undefined,
      content: note.content,
      location_description: note.location_description || undefined,
      is_important: note.is_important,
    });
    setEditNoteId(note.id);
  }, []);

  // Calculate fuel estimate
  const fuelNeeded = useMemo(
    () => (route.total_distance_km ? route.total_distance_km * route.avg_fuel_consumption_per_km : 0),
    [route.avg_fuel_consumption_per_km, route.total_distance_km]
  );
  const cheapestPrice = cheapestSuppliers[0]?.current_price_per_liter || 0;
  const estimatedCost = fuelNeeded * cheapestPrice;

  return (
    <Dialog open={open} onOpenChange={onOpenChange} >
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Route className="h-5 w-5 text-primary" />
            {route.name}
            {route.is_favorite && <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />}
          </DialogTitle>
          <DialogDescription>
            {route.origin} → {route.destination}
            {route.is_round_trip && " (Round Trip)"}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="overview" className="mt-4">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="stops" className="flex items-center gap-1">
              <Fuel className="h-3.5 w-3.5" />
              Stops ({waypoints.filter(w => w.is_fuel_stop).length})
            </TabsTrigger>
            <TabsTrigger value="map">
              <MapPin className="h-4 w-4 mr-1" />
              Map
            </TabsTrigger>
            <TabsTrigger value="notes">
              Notes ({notes.length})
            </TabsTrigger>
            <TabsTrigger value="fuel">Strategy</TabsTrigger>
            <TabsTrigger value="export">
              <Download className="h-4 w-4 mr-1" />
              Export
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="text-sm text-muted-foreground">Distance</div>
                  <div className="text-xl font-bold">
                    {route.total_distance_km?.toLocaleString() || "—"} km
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-sm text-muted-foreground">Duration</div>
                  <div className="text-xl font-bold">
                    {route.estimated_duration_hours || "—"} hrs
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-sm text-muted-foreground">Fuel Needed</div>
                  <div className="text-xl font-bold">{fuelNeeded.toFixed(0)} L</div>
                </CardContent>
              </Card>
              <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
                <CardContent className="pt-4">
                  <div className="text-sm text-green-700 dark:text-green-300">Est. Cost</div>
                  <div className="text-xl font-bold text-green-700 dark:text-green-300">
                    R{estimatedCost.toFixed(2)}
                  </div>
                </CardContent>
              </Card>
            </div>

            {route.notes && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Route Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{route.notes}</p>
                </CardContent>
              </Card>
            )}

            {route.driver_tips && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-yellow-500" />
                    Driver Tips
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{route.driver_tips}</p>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Usage Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-6 text-sm">
                  <div>
                    <span className="text-muted-foreground">Times used:</span>{" "}
                    <span className="font-medium">{route.usage_count}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Last used:</span>{" "}
                    <span className="font-medium">
                      {route.last_used_at ? formatDate(route.last_used_at) : "Never"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Created:</span>{" "}
                    <span className="font-medium">{formatDate(route.created_at)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Fuel Stops Management Tab */}
          <TabsContent value="stops" className="space-y-4 mt-4">
            <Card className="shadow-lg">
              <CardHeader className="border-b bg-gradient-to-r from-blue-500/10 to-cyan-500/5">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                      <Fuel className="h-5 w-5" />
                      Fuel Stops on Route
                    </CardTitle>
                    <CardDescription>
                      Manage the order and details of fuel stops on this route. Drag to reorder.
                    </CardDescription>
                  </div>
                  <Badge className="text-base px-3 py-1 bg-gradient-to-r from-blue-500 to-cyan-400 text-white shadow-sm">
                    {waypoints.filter(w => w.is_fuel_stop).length} Stops
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                {waypoints.filter(w => w.is_fuel_stop).length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <Fuel className="h-8 w-8 text-blue-500 opacity-70" />
                    </div>
                    <p className="text-lg font-medium">No fuel stops added yet</p>
                    <p className="text-sm mt-1">Add fuel stops from the Suppliers tab to include them on this route.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Route Start */}
                    <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/20 rounded-xl border border-emerald-200 dark:border-emerald-800/50">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-green-400 flex items-center justify-center text-white shadow-md">
                        <Navigation className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-emerald-700 dark:text-emerald-400">Start: {route.origin}</div>
                        <div className="text-xs text-emerald-600/70 dark:text-emerald-500/70">Beginning of route</div>
                      </div>
                    </div>

                    {/* Vertical connector */}
                    <div className="flex justify-center">
                      <div className="w-0.5 h-4 bg-gradient-to-b from-emerald-300 to-blue-300 dark:from-emerald-700 dark:to-blue-700" />
                    </div>

                    {/* Fuel Stops */}
                    {waypoints
                      .filter(w => w.is_fuel_stop)
                      .sort((a, b) => (a.sequence_order || 0) - (b.sequence_order || 0))
                      .map((waypoint, index, arr) => {
                        const supplier = waypoint.diesel_suppliers as DieselSupplier | undefined;
                        const isFirst = index === 0;
                        const isLast = index === arr.length - 1;
                        const pricePosition = supplier && cheapestSuppliers.length > 0
                          ? ((supplier.current_price_per_liter - (cheapestSuppliers[0]?.current_price_per_liter || 0)) /
                             ((cheapestSuppliers[cheapestSuppliers.length - 1]?.current_price_per_liter || 1) - (cheapestSuppliers[0]?.current_price_per_liter || 0))) * 100
                          : 50;

                        return (
                          <div key={waypoint.id}>
                            <div className="group relative flex items-stretch gap-0 bg-background border rounded-xl shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-700 overflow-hidden">
                              {/* Drag Handle / Reorder Controls */}
                              <div className="flex flex-col items-center justify-center w-12 bg-muted/30 border-r">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 rounded-none hover:bg-blue-100 dark:hover:bg-blue-900/30"
                                  onClick={() => handleReorderWaypoints(
                                    waypoints.filter(w => w.is_fuel_stop).map((wp, i) => {
                                      if (wp.id === waypoint.id) return { id: wp.id, sequence_order: (arr[index - 1]?.sequence_order || 0) };
                                      if (i === index - 1) return { id: wp.id, sequence_order: waypoint.sequence_order };
                                      return { id: wp.id, sequence_order: wp.sequence_order };
                                    })
                                  )}
                                  disabled={isFirst}
                                  title="Move up"
                                >
                                  <ArrowUp className={`h-4 w-4 ${isFirst ? 'text-muted-foreground/30' : 'text-blue-600'}`} />
                                </Button>
                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white text-xs font-bold shadow">
                                  {index + 1}
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 rounded-none hover:bg-blue-100 dark:hover:bg-blue-900/30"
                                  onClick={() => handleReorderWaypoints(
                                    waypoints.filter(w => w.is_fuel_stop).map((wp, i) => {
                                      if (wp.id === waypoint.id) return { id: wp.id, sequence_order: (arr[index + 1]?.sequence_order || 999) };
                                      if (i === index + 1) return { id: wp.id, sequence_order: waypoint.sequence_order };
                                      return { id: wp.id, sequence_order: wp.sequence_order };
                                    })
                                  )}
                                  disabled={isLast}
                                  title="Move down"
                                >
                                  <ArrowDown className={`h-4 w-4 ${isLast ? 'text-muted-foreground/30' : 'text-blue-600'}`} />
                                </Button>
                              </div>

                              {/* Stop Info */}
                              <div className="flex-1 p-4">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="font-semibold text-foreground">{supplier?.name || waypoint.name}</span>
                                      {supplier?.is_preferred && (
                                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                      )}
                                      {supplier?.is_avoided && (
                                        <Badge variant="destructive" className="text-xs">Avoided</Badge>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                      <MapPin className="h-3.5 w-3.5" />
                                      {supplier?.location || waypoint.name}
                                      {supplier?.province && <span className="text-xs">• {supplier.province}</span>}
                                    </div>
                                    {waypoint.notes && (
                                      <p className="mt-2 text-sm text-muted-foreground italic bg-muted/30 px-2 py-1 rounded">
                                        📝 {waypoint.notes}
                                      </p>
                                    )}
                                  </div>

                                  {/* Price Display */}
                                  {supplier && (
                                    <div className="text-right ml-4">
                                      <div className="text-xl font-bold font-mono">
                                        R{supplier.current_price_per_liter.toFixed(2)}
                                      </div>
                                      <div className="text-xs text-muted-foreground">/liter</div>
                                      {/* Mini price position bar */}
                                      <div className="mt-1 w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                                        <div
                                          className={`h-full rounded-full ${
                                            pricePosition <= 25 ? 'bg-gradient-to-r from-emerald-500 to-green-400' :
                                            pricePosition <= 50 ? 'bg-gradient-to-r from-green-400 to-yellow-400' :
                                            pricePosition <= 75 ? 'bg-gradient-to-r from-yellow-400 to-orange-400' :
                                            'bg-gradient-to-r from-orange-400 to-red-500'
                                          }`}
                                          style={{ width: `${Math.max(10, Math.min(100, pricePosition))}%` }}
                                        />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="flex flex-col items-center justify-center w-12 bg-muted/20 border-l opacity-60 group-hover:opacity-100 transition-opacity">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-10 w-full rounded-none hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600"
                                  onClick={() => {
                                    // Open edit notes - would need state for this
                                  }}
                                  title="Edit notes"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-10 w-full rounded-none hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500"
                                  onClick={() => handleRemoveWaypoint(waypoint.id)}
                                  title="Remove from route"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>

                            {/* Connector to next */}
                            {!isLast && (
                              <div className="flex justify-center">
                                <div className="w-0.5 h-4 bg-gradient-to-b from-blue-300 to-blue-300 dark:from-blue-700 dark:to-blue-700" />
                              </div>
                            )}
                          </div>
                        );
                      })}

                    {/* Vertical connector to destination */}
                    <div className="flex justify-center">
                      <div className="w-0.5 h-4 bg-gradient-to-b from-blue-300 to-red-300 dark:from-blue-700 dark:to-red-700" />
                    </div>

                    {/* Route End */}
                    <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/20 rounded-xl border border-red-200 dark:border-red-800/50">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-rose-400 flex items-center justify-center text-white shadow-md">
                        <MapPin className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-red-700 dark:text-red-400">End: {route.destination}</div>
                        <div className="text-xs text-red-600/70 dark:text-red-500/70">Destination</div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Tips Card */}
            <Card className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/20 border-amber-200 dark:border-amber-800/50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center flex-shrink-0">
                    <Lightbulb className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="text-sm">
                    <p className="font-medium text-amber-800 dark:text-amber-300 mb-1">Tips for managing fuel stops</p>
                    <ul className="text-amber-700 dark:text-amber-400 space-y-1">
                      <li>• Use the <ArrowUp className="h-3 w-3 inline" /><ArrowDown className="h-3 w-3 inline" /> arrows to reorder stops to match your actual route</li>
                      <li>• Click <Trash2 className="h-3 w-3 inline" /> to remove a stop you no longer need</li>
                      <li>• Add new stops from the <strong>Suppliers</strong> tab using "Add to Route"</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Map Tab */}
          <TabsContent value="map" className="space-y-4 mt-4">
            <FuelRouteMap
              route={route}
              suppliers={allSuppliers.filter((s) => s.is_active && !s.is_avoided)}
              showSuppliers={true}
              height="450px"
            />
          </TabsContent>

          {/* Notes Tab */}
          <TabsContent value="notes" className="space-y-4 mt-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Add notes about fuel stops, road conditions, hazards, and tips
              </p>
              <Button size="sm" onClick={() => setAddNoteDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Add Note
              </Button>
            </div>

            {notesLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : notes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No notes yet. Add notes to help drivers on this route.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notes.map((note) => {
                  const noteType = NOTE_TYPES.find((t) => t.value === note.note_type);
                  return (
                    <Card
                      key={note.id}
                      className={note.is_important ? "border-yellow-400" : ""}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-lg">{noteType?.icon || "📝"}</span>
                              <Badge variant="secondary">{noteType?.label || note.note_type}</Badge>
                              {note.is_important && (
                                <Badge variant="outline" className="text-yellow-600 border-yellow-400">
                                  Important
                                </Badge>
                              )}
                            </div>
                            {note.title && (
                              <h4 className="font-medium mb-1">{note.title}</h4>
                            )}
                            <p className="text-sm">{note.content}</p>
                            {note.location_description && (
                              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {note.location_description}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-2">
                              Added {formatDate(note.created_at)}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditNote(note)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              onClick={() => handleDeleteNote(note.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Add/Edit Note Dialog */}
            <Dialog
              open={addNoteDialogOpen || editNoteId !== null}
              onOpenChange={(open) => {
                if (!open) {
                  setAddNoteDialogOpen(false);
                  setEditNoteId(null);
                  setNoteForm({ note_type: "general" });
                }
              }}
            >
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editNoteId ? "Edit Note" : "Add Note"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Note Type</Label>
                    <Select
                      value={noteForm.note_type || "general"}
                      onValueChange={(val) =>
                        setNoteForm({
                          ...noteForm,
                          note_type: val as "general" | "fuel" | "road_condition" | "hazard" | "tip",
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {NOTE_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.icon} {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Title (optional)</Label>
                    <Input
                      value={noteForm.title || ""}
                      onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })}
                      placeholder="Brief title for the note"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Content *</Label>
                    <Textarea
                      value={noteForm.content || ""}
                      onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })}
                      placeholder="Note details..."
                      rows={4}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Location (optional)</Label>
                    <Input
                      value={noteForm.location_description || ""}
                      onChange={(e) =>
                        setNoteForm({ ...noteForm, location_description: e.target.value })
                      }
                      placeholder="e.g., 50km before Harrismith"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="is_important"
                      title="Mark as important"
                      checked={noteForm.is_important || false}
                      onChange={(e) =>
                        setNoteForm({ ...noteForm, is_important: e.target.checked })
                      }
                      className="rounded"
                    />
                    <Label htmlFor="is_important">Mark as important</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setAddNoteDialogOpen(false);
                      setEditNoteId(null);
                      setNoteForm({ note_type: "general" });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={editNoteId ? handleUpdateNote : handleAddNote}
                    disabled={addNote.isPending || updateNote.isPending}
                  >
                    {(addNote.isPending || updateNote.isPending) && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    {editNoteId ? "Update" : "Add"} Note
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Fuel Strategy Tab */}
          <TabsContent value="fuel" className="space-y-4 mt-4">
            {route.best_fuel_strategy && (
              <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-green-700 dark:text-green-300">
                    <Fuel className="h-4 w-4" />
                    Recommended Strategy
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-green-800 dark:text-green-200">
                    {route.best_fuel_strategy}
                  </p>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Cheapest Stations Available</CardTitle>
                <CardDescription>
                  Use these stations for the best prices on your route
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Station</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead className="text-right">Price/L</TableHead>
                      <TableHead className="text-right">
                        Cost for {fuelNeeded.toFixed(0)}L
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cheapestSuppliers.slice(0, 5).map((supplier, index) => (
                      <TableRow key={supplier.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {index === 0 && <Badge className="bg-green-600">Best</Badge>}
                            {supplier.name}
                          </div>
                        </TableCell>
                        <TableCell>{supplier.location}</TableCell>
                        <TableCell className="text-right font-mono">
                          R{supplier.current_price_per_liter.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          R{(fuelNeeded * supplier.current_price_per_liter).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {cheapestSuppliers.length >= 2 && (
                  <div className="mt-4 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                    <p className="text-sm text-green-700 dark:text-green-300">
                      <strong>Potential Savings:</strong> Using {cheapestSuppliers[0].name} instead of{" "}
                      {cheapestSuppliers[cheapestSuppliers.length - 1].name} saves you{" "}
                      <strong>
                        R
                        {(
                          fuelNeeded *
                          (cheapestSuppliers[cheapestSuppliers.length - 1].current_price_per_liter -
                            cheapestSuppliers[0].current_price_per_liter)
                        ).toFixed(2)}
                      </strong>{" "}
                      per trip
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calculator className="h-4 w-4" />
                  Fuel Calculator
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Route Distance:</span>
                    <p className="font-medium">{route.total_distance_km?.toLocaleString() || "—"} km</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Consumption Rate:</span>
                    <p className="font-medium">{route.avg_fuel_consumption_per_km} L/km</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total Fuel Required:</span>
                    <p className="font-medium">{fuelNeeded.toFixed(0)} liters</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">At Best Price (R{cheapestPrice.toFixed(2)}/L):</span>
                    <p className="font-bold text-green-600">R{estimatedCost.toFixed(2)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Export Tab */}
          <TabsContent value="export" className="space-y-4 mt-4">
            <FuelRoutePlanExport
              route={route}
              waypoints={waypoints}
              suppliers={allSuppliers}
              avgPrice={avgPrice}
              notes={notes}
              onUpdateWaypointNotes={handleUpdateWaypointNotes}
              onRemoveWaypoint={handleRemoveWaypoint}
              onReorderWaypoints={handleReorderWaypoints}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default DieselSupplierManagement;