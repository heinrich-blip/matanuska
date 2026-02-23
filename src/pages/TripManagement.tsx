import CustomerRetentionDashboard from "@/components/analytics/CustomerRetentionDashboard";
import Layout from "@/components/Layout";
import MissedLoadsTracker from "@/components/operations/MissedLoadsTracker";
import YearToDateKPIs from "@/components/reports/YearToDateKPIs";
import ActiveTrips from "@/components/trips/ActiveTrips";
import AddTripDialog from "@/components/trips/AddTripDialog";
import CompletedTrips from "@/components/trips/CompletedTrips";
import EditTripDialog from "@/components/trips/EditTripDialog";
import InvoicingDashboard from "@/components/trips/InvoicingDashboard";
import LoadImportModal from "@/components/trips/LoadImportModal";
import TripDetailsModal from "@/components/trips/TripDetailsModal";
import TripExpensesSection from "@/components/trips/TripExpensesSection";
import TripReportsSection from "@/components/trips/TripReportsSection";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useOperations } from "@/contexts/OperationsContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Trip } from "@/types/operations";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, BarChart3, CheckCircle2, CreditCard, FileText, LineChart, Receipt, Zap } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const TripManagement = () => {
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [showTripDetails, setShowTripDetails] = useState(false);
  // Lifted dialog state from ActiveTrips to prevent portal unmount issues
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  // Track pending refetch to debounce real-time updates during dialog animations
  const pendingRefetchRef = useRef<NodeJS.Timeout | null>(null);
  const {
    missedLoads,
    addMissedLoad,
    updateMissedLoad,
    deleteMissedLoad,
    costEntries
  } = useOperations();

  // Auto-refresh trips using useQuery with refetchInterval
  const {
    data: allTrips = [],
    isLoading: loading,
    refetch: fetchTrips,
  } = useQuery({
    queryKey: ["trips"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trips')
        .select(`
          *,
          wialon_vehicles:vehicle_id(id, fleet_number, name),
          vehicles:fleet_vehicle_id(id, fleet_number, registration_number)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return (data || []).map(trip => {
        // Extract fleet_number - prefer vehicles table (fleet_vehicle_id), fallback to wialon_vehicles
        // Note: fleet_vehicle_id join - cast needed until types are regenerated after migration
        const fleetVehicle = (trip as unknown as { vehicles?: { id: string; fleet_number: string | null; registration_number: string } | null }).vehicles;
        const wialonVehicle = trip.wialon_vehicles as { id: string; fleet_number: string | null; name: string } | null;
        return {
          ...trip,
          fleet_number: fleetVehicle?.fleet_number || wialonVehicle?.fleet_number || wialonVehicle?.name || null,
          payment_status: trip.payment_status || 'unpaid',
          status: trip.status || 'active',
          revenue_currency: trip.revenue_currency || 'ZAR'
        };
      });
    },
    // Auto-refresh every 30 seconds for background updates
    refetchInterval: 30000,
    // Keep previous data while refetching to prevent UI flicker
    placeholderData: (previousData) => previousData,
    // Don't show error toast on background refetch failures
    retry: 2,
    staleTime: 10000, // Consider data fresh for 10 seconds
  });

  // Memoize filtered trips to prevent unnecessary re-renders
  const activeTrips = useMemo(() =>
    allTrips.filter(trip => trip.status === 'active') as unknown as Trip[],
    [allTrips]
  );

  const completedTrips = useMemo(() =>
    allTrips.filter(trip => trip.status === 'completed') as unknown as Trip[],
    [allTrips]
  );

  // Check if any dialog is open (prevents DOM conflicts during animations)
  const isAnyDialogOpen = showEditDialog || showTripDetails || isAddDialogOpen || isImportModalOpen;

  // Debounced refetch function that respects dialog state
  const debouncedRefetch = useCallback(() => {
    // Clear any pending refetch
    if (pendingRefetchRef.current) {
      clearTimeout(pendingRefetchRef.current);
    }
    // If a dialog is open, delay the refetch to prevent portal issues
    if (isAnyDialogOpen) {
      pendingRefetchRef.current = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['trips'] });
      }, 500);
    } else {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
    }
  }, [queryClient, isAnyDialogOpen]);

  // Real-time subscription for instant updates
  useEffect(() => {
    const channel = supabase
      .channel('trips-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trips',
        },
        () => {
          // Use debounced refetch to prevent DOM conflicts
          debouncedRefetch();
        }
      )
      .subscribe();

    return () => {
      if (pendingRefetchRef.current) {
        clearTimeout(pendingRefetchRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [debouncedRefetch]);

  const handleEdit = (trip: Trip) => {
    setEditingTrip(trip);
    setShowEditDialog(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('trips')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Trip deleted successfully',
      });
      fetchTrips();
    } catch (error) {
      console.error('Error deleting trip:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete trip',
        variant: 'destructive',
      });
    }
  };

  const handleView = (trip: Trip) => {
    setSelectedTrip(trip);
    setShowTripDetails(true);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Loading trips...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-5">
        <Tabs defaultValue="active" className="space-y-5">
          <div className="bg-card/80 backdrop-blur-sm border border-border/60 rounded-xl p-1.5 shadow-sm">
            <TabsList className="inline-flex w-full bg-transparent gap-1 h-auto p-0 flex-wrap">
              <TabsTrigger value="active" className="rounded-lg px-3.5 py-2 text-sm font-medium gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all duration-200">
                <Zap className="h-3.5 w-3.5" />
                Active
                {activeTrips.length > 0 && <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-bold rounded-full">{activeTrips.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="completed" className="rounded-lg px-3.5 py-2 text-sm font-medium gap-2 data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm transition-all duration-200">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Completed
                {completedTrips.length > 0 && <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-bold rounded-full">{completedTrips.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="expenses" className="rounded-lg px-3.5 py-2 text-sm font-medium gap-2 data-[state=active]:bg-rose-500/10 data-[state=active]:text-rose-700 data-[state=active]:shadow-sm transition-all duration-200">
                <Receipt className="h-3.5 w-3.5" />
                Expenses
              </TabsTrigger>
              <TabsTrigger value="reports" className="rounded-lg px-3.5 py-2 text-sm font-medium gap-2 data-[state=active]:bg-violet-500/10 data-[state=active]:text-violet-700 data-[state=active]:shadow-sm transition-all duration-200">
                <BarChart3 className="h-3.5 w-3.5" />
                Reports
              </TabsTrigger>
              <TabsTrigger value="invoices" className="rounded-lg px-3.5 py-2 text-sm font-medium gap-2 data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-700 data-[state=active]:shadow-sm transition-all duration-200">
                <FileText className="h-3.5 w-3.5" />
                Invoices
              </TabsTrigger>
              <TabsTrigger value="analytics" className="rounded-lg px-3.5 py-2 text-sm font-medium gap-2 data-[state=active]:bg-cyan-500/10 data-[state=active]:text-cyan-700 data-[state=active]:shadow-sm transition-all duration-200">
                <LineChart className="h-3.5 w-3.5" />
                Analytics
              </TabsTrigger>
              <TabsTrigger value="ytd" className="rounded-lg px-3.5 py-2 text-sm font-medium gap-2 data-[state=active]:bg-indigo-500/10 data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm transition-all duration-200">
                <CreditCard className="h-3.5 w-3.5" />
                YTD
              </TabsTrigger>
              <TabsTrigger value="missed-loads" className="rounded-lg px-3.5 py-2 text-sm font-medium gap-2 data-[state=active]:bg-orange-500/10 data-[state=active]:text-orange-700 data-[state=active]:shadow-sm transition-all duration-200">
                <AlertCircle className="h-3.5 w-3.5" />
                Missed
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="active">
            <ActiveTrips
              trips={activeTrips}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onView={handleView}
              onAddTrip={() => setIsAddDialogOpen(true)}
              onImport={() => setIsImportModalOpen(true)}
            />
          </TabsContent>

          <TabsContent value="completed">
            <CompletedTrips
              trips={completedTrips}
              onView={handleView}
              onRefresh={fetchTrips}
            />
          </TabsContent>

          <TabsContent value="expenses">
            <TripExpensesSection
              trips={[...activeTrips, ...completedTrips]}
              onViewTrip={handleView}
            />
          </TabsContent>

          <TabsContent value="reports">
            <TripReportsSection
              trips={[...activeTrips, ...completedTrips]}
              costEntries={costEntries}
            />
          </TabsContent>

          <TabsContent value="invoices">
            <InvoicingDashboard />
          </TabsContent>

          <TabsContent value="analytics">
            <CustomerRetentionDashboard
              trips={[...activeTrips, ...completedTrips]}
            />
          </TabsContent>

          <TabsContent value="ytd">
            <YearToDateKPIs trips={[...activeTrips, ...completedTrips]} />
          </TabsContent>

          <TabsContent value="missed-loads">
            <MissedLoadsTracker
              missedLoads={missedLoads}
              onAddMissedLoad={addMissedLoad}
              onUpdateMissedLoad={updateMissedLoad}
              onDeleteMissedLoad={deleteMissedLoad}
            />
          </TabsContent>
        </Tabs>

        <TripDetailsModal
          trip={selectedTrip}
          isOpen={showTripDetails}
          onClose={() => {
            setShowTripDetails(false);
            setSelectedTrip(null);
          }}
          onRefresh={fetchTrips}
        />

        <EditTripDialog
          trip={editingTrip}
          isOpen={showEditDialog}
          onClose={() => {
            setShowEditDialog(false);
            setEditingTrip(null);
          }}
          onRefresh={fetchTrips}
        />

        {/* Lifted dialogs from ActiveTrips to prevent portal unmount issues */}
        <AddTripDialog
          isOpen={isAddDialogOpen}
          onClose={() => setIsAddDialogOpen(false)}
        />

        <LoadImportModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
        />
      </div>
    </Layout>
  );
};

export default TripManagement;