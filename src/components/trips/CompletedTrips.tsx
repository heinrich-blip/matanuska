import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { EditHistoryRecord } from '@/types/forms';
import { useQueryClient } from '@tanstack/react-query';
import { addDays, format, getISOWeek, parseISO, startOfWeek } from 'date-fns';
import { 
    AlertTriangle, 
    Building, 
    Calendar, 
    CheckCircle, 
    ChevronDown, 
    ChevronRight, 
    DollarSign, 
    Download, 
    Edit, 
    Eye, 
    Filter, 
    FilterX, 
    Gauge, 
    History, 
    MapPin, 
    MoreVertical, 
    RefreshCw, 
    RotateCcw, 
    Search, 
    Settings, 
    Truck, 
    User, 
    Users, 
    X,
    CheckCircle2
} from 'lucide-react'; // Removed unused FileSpreadsheet
import { useMemo, useState } from 'react';
import CompletedTripEditModal from './CompletedTripEditModal';
import TripExportDialog from './TripExportDialog';

// Helper function to get week key (Monday of the week)
const getWeekKey = (dateString: string): string => {
  const date = parseISO(dateString);
  const monday = startOfWeek(date, { weekStartsOn: 1 });
  return format(monday, 'yyyy-MM-dd');
};

// Helper function to get week number of the year (ISO week)
const getWeekNumber = (dateString: string): number => {
  const date = parseISO(dateString);
  return getISOWeek(date);
};

// Helper function to format week range (Monday - Sunday)
const formatWeekRange = (mondayKey: string): string => {
  const monday = parseISO(mondayKey);
  const sunday = addDays(monday, 6);
  return `${format(monday, 'dd MMM')} - ${format(sunday, 'dd MMM yyyy')}`;
};

interface CostEntry {
  amount: number;
  currency?: string;
  is_flagged?: boolean;
  investigation_status?: string;
  flag_reason?: string;
}

interface AdditionalCost {
  amount: number;
  currency?: string;
}

interface Trip {
  id: string;
  trip_number: string;
  route?: string;
  driver_name?: string;
  client_name?: string;
  vehicle_id?: string;
  fleet_number?: string;
  base_revenue?: number;
  revenue_currency?: string;
  revenue_type?: 'per_load' | 'per_km';
  rate_per_km?: number;
  distance_km?: number;
  empty_km?: number;
  departure_date?: string;
  arrival_date?: string;
  completed_at?: string;
  origin?: string;
  destination?: string;
  description?: string;
  starting_km?: number;
  ending_km?: number;
  status?: string;
  load_type?: string;
  edit_history?: EditHistoryRecord[];
  costs?: CostEntry[];
  additional_costs?: AdditionalCost[];
  // Warning/validation fields
  hasFlaggedCosts?: boolean;
  flaggedCostCount?: number;
  hasPendingCosts?: boolean;
  pendingCostCount?: number;
  hasNoCosts?: boolean;
  payment_status?: string;
}

interface CompletedTripsProps {
  trips: Trip[];
  onView: (trip: Trip) => void;
  onRefresh?: () => void;
  isLoading?: boolean;
}

const CompletedTrips = ({ trips, onView, onRefresh, isLoading = false }: CompletedTripsProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Filter state
  const [fleetFilter, setFleetFilter] = useState<string>('all');
  const [driverFilter, setDriverFilter] = useState<string>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grouped' | 'list'>('grouped');

  // Expanded state
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());
  const [expandedFleets, setExpandedFleets] = useState<Set<string>>(new Set());

  // Edit modal state
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Export dialog state
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);

  const toggleWeekCollapse = (weekKey: string) => {
    setExpandedWeeks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(weekKey)) {
        newSet.delete(weekKey);
      } else {
        newSet.add(weekKey);
      }
      return newSet;
    });
  };

  const toggleFleetCollapse = (fleetKey: string) => {
    setExpandedFleets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fleetKey)) {
        newSet.delete(fleetKey);
      } else {
        newSet.add(fleetKey);
      }
      return newSet;
    });
  };

  const collapseAll = () => {
    setExpandedWeeks(new Set());
    setExpandedFleets(new Set());
  };

  const expandAll = () => {
    const allWeeks = Object.keys(tripsByWeek);
    setExpandedWeeks(new Set(allWeeks));
  };

  // Extract unique values for filters
  const filterOptions = useMemo(() => {
    const fleets = [...new Set(trips.map(t => t.fleet_number).filter(Boolean))] as string[];
    const drivers = [...new Set(trips.map(t => t.driver_name).filter(Boolean))] as string[];
    const clients = [...new Set(trips.map(t => t.client_name).filter(Boolean))] as string[];
    return {
      fleets: fleets.sort(),
      drivers: drivers.sort(),
      clients: clients.sort(),
    };
  }, [trips]);

  // Filter trips based on selected filters
  const filteredTrips = useMemo(() => {
    return trips.filter(trip => {
      if (fleetFilter !== 'all' && trip.fleet_number !== fleetFilter) return false;
      if (driverFilter !== 'all' && trip.driver_name !== driverFilter) return false;
      if (clientFilter !== 'all' && trip.client_name !== clientFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          trip.trip_number.toLowerCase().includes(query) ||
          trip.route?.toLowerCase().includes(query) ||
          trip.driver_name?.toLowerCase().includes(query) ||
          trip.client_name?.toLowerCase().includes(query) ||
          trip.fleet_number?.toLowerCase().includes(query) ||
          trip.origin?.toLowerCase().includes(query) ||
          trip.destination?.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [trips, fleetFilter, driverFilter, clientFilter, searchQuery]);

  // Group trips by week
  const tripsByWeek = useMemo(() => {
    const grouped: Record<string, Trip[]> = {};

    filteredTrips.forEach(trip => {
      const dateToUse = trip.arrival_date || trip.departure_date;
      const weekKey = dateToUse ? getWeekKey(dateToUse) : 'No Date';
      if (!grouped[weekKey]) {
        grouped[weekKey] = [];
      }
      grouped[weekKey].push(trip);
    });

    const sortedKeys = Object.keys(grouped).sort((a, b) => {
      if (a === 'No Date') return 1;
      if (b === 'No Date') return -1;
      return b.localeCompare(a);
    });

    const sorted: Record<string, Trip[]> = {};
    sortedKeys.forEach(key => {
      sorted[key] = grouped[key];
    });

    return sorted;
  }, [filteredTrips]);

  const hasActiveFilters = fleetFilter !== 'all' || driverFilter !== 'all' || clientFilter !== 'all' || searchQuery !== '';

  const clearFilters = () => {
    setFleetFilter('all');
    setDriverFilter('all');
    setClientFilter('all');
    setSearchQuery('');
  };

  // Detect duplicate POD numbers
  const duplicatePods = useMemo(() => {
    const counts: Record<string, number> = {};
    trips.forEach(t => {
      counts[t.trip_number] = (counts[t.trip_number] || 0) + 1;
    });
    return Object.entries(counts).filter(([, count]) => count > 1).map(([pod]) => pod);
  }, [trips]);

  // Stats calculation
  const stats = useMemo(() => {
    const totalRevenue = filteredTrips.reduce((sum, t) => sum + (t.base_revenue || 0), 0);
    const totalExpenses = filteredTrips.reduce((sum, t) => {
      const tripExpenses = [...(t.costs || []), ...(t.additional_costs || [])].reduce((s, c) => s + (c.amount || 0), 0);
      return sum + tripExpenses;
    }, 0);
    const totalDistance = filteredTrips.reduce((sum, t) => sum + (t.distance_km || 0), 0);
    const avgRevenuePerTrip = filteredTrips.length > 0 ? totalRevenue / filteredTrips.length : 0;
    
    // Warning stats
    const tripsWithFlaggedCosts = filteredTrips.filter(t => t.hasFlaggedCosts).length;
    const tripsWithNoCosts = filteredTrips.filter(t => t.hasNoCosts).length;
    const tripsWithPendingCosts = filteredTrips.filter(t => t.hasPendingCosts).length;
    const tripsNeedingAttention = filteredTrips.filter(t => t.hasFlaggedCosts || t.hasNoCosts || t.hasPendingCosts).length;
    
    return {
      totalTrips: filteredTrips.length,
      totalRevenue,
      totalExpenses,
      netProfit: totalRevenue - totalExpenses,
      totalDistance,
      avgRevenuePerTrip,
      tripsWithFlaggedCosts,
      tripsWithNoCosts,
      tripsWithPendingCosts,
      tripsNeedingAttention,
    };
  }, [filteredTrips]);

  const handleEdit = (trip: Trip) => {
    setSelectedTrip(trip);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (updatedTrip: Trip, editRecord: EditHistoryRecord) => {
    try {
      const existingHistory = updatedTrip.edit_history || [];
      const newHistory = [...existingHistory, editRecord];

      const { error } = await supabase
        .from('trips')
        .update({
          fleet_vehicle_id: null,
          vehicle_id: updatedTrip.vehicle_id || null,
          driver_name: updatedTrip.driver_name || null,
          client_name: updatedTrip.client_name || null,
          origin: updatedTrip.origin || null,
          destination: updatedTrip.destination || null,
          route: updatedTrip.route || null,
          departure_date: updatedTrip.departure_date || null,
          arrival_date: updatedTrip.arrival_date || null,
          base_revenue: updatedTrip.base_revenue || null,
          revenue_currency: updatedTrip.revenue_currency || 'USD',
          revenue_type: updatedTrip.revenue_type || 'per_load',
          rate_per_km: updatedTrip.rate_per_km || null,
          starting_km: updatedTrip.starting_km || null,
          ending_km: updatedTrip.ending_km || null,
          distance_km: updatedTrip.distance_km || null,
          edit_history: JSON.parse(JSON.stringify(newHistory)),
          updated_at: new Date().toISOString(),
        })
        .eq('id', updatedTrip.id);

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ['trips'] });
      await queryClient.invalidateQueries({ queryKey: ['delivery-dashboard-summary'] });
      await queryClient.invalidateQueries({ queryKey: ['recent-delivery-performance'] });

      toast({
        title: 'Trip Updated',
        description: 'Changes have been saved and logged.',
      });

      setIsEditModalOpen(false);
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Error updating trip:', error);
      toast({
        title: 'Error',
        description: 'Failed to update trip. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleReactivate = async (trip: Trip) => {
    try {
      const { error } = await supabase
        .from('trips')
        .update({
          status: 'active',
          completed_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', trip.id);

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ['trips'] });
      await queryClient.invalidateQueries({ queryKey: ['delivery-dashboard-summary'] });
      await queryClient.invalidateQueries({ queryKey: ['recent-delivery-performance'] });

      toast({
        title: 'Trip Reactivated',
        description: `POD #${trip.trip_number} has been moved back to active trips.`,
      });

      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Error reactivating trip:', error);
      toast({
        title: 'Error',
        description: 'Failed to reactivate trip. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    const formatter = new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    return formatter.format(amount);
  };

  const calculateProfit = (trip: Trip): { amount: number; currency: string } | null => {
    const revenue = trip.base_revenue || 0;
    const expenses = [...(trip.costs || []), ...(trip.additional_costs || [])].reduce((sum, c) => sum + (c.amount || 0), 0);
    const currency = trip.revenue_currency || 'USD';
    return { amount: revenue - expenses, currency };
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Enhanced Header with Stats */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          {/* Needs Attention Card - Show prominently when there are issues */}
          {stats.tripsNeedingAttention > 0 && (
            <Card className="p-5 bg-gradient-to-br from-amber-500/10 to-amber-500/20 border-amber-400/40">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-amber-700 mb-1">Needs Attention</p>
                  <span className="text-2xl font-bold text-amber-600">{stats.tripsNeedingAttention}</span>
                  <div className="flex flex-col gap-0.5 mt-1 text-xs text-amber-600/80">
                    {stats.tripsWithFlaggedCosts > 0 && (
                      <span>{stats.tripsWithFlaggedCosts} flagged costs</span>
                    )}
                    {stats.tripsWithNoCosts > 0 && (
                      <span>{stats.tripsWithNoCosts} missing costs</span>
                    )}
                    {stats.tripsWithPendingCosts > 0 && (
                      <span>{stats.tripsWithPendingCosts} pending review</span>
                    )}
                  </div>
                </div>
                <div className="h-10 w-10 rounded-lg bg-amber-500/30 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                </div>
              </div>
            </Card>
          )}

          <Card className={`${stats.tripsNeedingAttention > 0 ? 'col-span-1' : 'col-span-1 md:col-span-2'} p-5 bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 border-emerald-500/20`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Completed Trips</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold">{stats.totalTrips}</span>
                  <span className="text-sm text-muted-foreground">total</span>
                </div>
                <div className="flex items-center gap-3 mt-2 text-xs">
                  <span className="flex items-center gap-1">
                    <Truck className="h-3.5 w-3.5 text-muted-foreground" />
                    {filterOptions.fleets.length} fleets
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    {filterOptions.drivers.length} drivers
                  </span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </Card>

          <Card className="p-5 bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 border-emerald-500/20">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Total Revenue</p>
                <span className="text-2xl font-bold text-emerald-600">{formatCurrency(stats.totalRevenue)}</span>
                <p className="text-xs text-muted-foreground mt-1">
                  Avg {formatCurrency(stats.avgRevenuePerTrip)} per trip
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </Card>

          <Card className="p-5 bg-gradient-to-br from-rose-500/5 to-rose-500/10 border-rose-500/20">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Total Expenses</p>
                <span className="text-2xl font-bold text-rose-600">{formatCurrency(stats.totalExpenses)}</span>
              </div>
              <div className="h-10 w-10 rounded-lg bg-rose-500/20 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-rose-600" />
              </div>
            </div>
          </Card>

          <Card className="p-5 bg-gradient-to-br from-blue-500/5 to-blue-500/10 border-blue-500/20">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Net Profit</p>
                <span className={`text-2xl font-bold ${stats.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {formatCurrency(stats.netProfit)}
                </span>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.totalDistance.toLocaleString()} total km
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Gauge className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Premium Toolbar */}
        <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 bg-muted/30 border-b">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Settings className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold tracking-tight">Completed Trip Management</h2>
                <p className="text-xs text-muted-foreground">View and manage historical trip data</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'grouped' | 'list')} className="mr-2">
                <TabsList className="h-9">
                  <TabsTrigger value="grouped" className="text-xs px-3">Grouped View</TabsTrigger>
                  <TabsTrigger value="list" className="text-xs px-3">List View</TabsTrigger>
                </TabsList>
              </Tabs>

              {onRefresh && (
                <Button variant="outline" size="sm" onClick={onRefresh} className="h-9 gap-2">
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              )}

              <Button variant="outline" size="sm" onClick={() => setIsExportDialogOpen(true)} className="h-9 gap-2">
                <Download className="h-4 w-4" />
                Export
              </Button>
            </div>
          </div>

          {/* Enhanced Filter Bar */}
          <div className="p-4 space-y-4">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search by POD, route, driver, client, fleet..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-10 pl-9 pr-4 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  aria-label="Search trips"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                    aria-label="Clear search"
                    title="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-2">
                <Select value={fleetFilter} onValueChange={setFleetFilter}>
                  <SelectTrigger className="w-[140px] h-10">
                    <Truck className="h-3.5 w-3.5 mr-2" />
                    <SelectValue placeholder="Fleet" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Fleets</SelectItem>
                    {filterOptions.fleets.map(fleet => (
                      <SelectItem key={fleet} value={fleet}>{fleet}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={driverFilter} onValueChange={setDriverFilter}>
                  <SelectTrigger className="w-[160px] h-10">
                    <User className="h-3.5 w-3.5 mr-2" />
                    <SelectValue placeholder="Driver" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Drivers</SelectItem>
                    {filterOptions.drivers.map(driver => (
                      <SelectItem key={driver} value={driver}>{driver}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={clientFilter} onValueChange={setClientFilter}>
                  <SelectTrigger className="w-[160px] h-10">
                    <Building className="h-3.5 w-3.5 mr-2" />
                    <SelectValue placeholder="Client" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Clients</SelectItem>
                    {filterOptions.clients.map(client => (
                      <SelectItem key={client} value={client}>{client}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Filter Status Bar */}
            {hasActiveFilters && (
              <div className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2 text-sm">
                  <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">Active filters:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {fleetFilter !== 'all' && (
                      <Badge variant="secondary" className="text-xs gap-1">
                        <Truck className="h-2.5 w-2.5" />
                        {fleetFilter}
                      </Badge>
                    )}
                    {driverFilter !== 'all' && (
                      <Badge variant="secondary" className="text-xs gap-1">
                        <User className="h-2.5 w-2.5" />
                        {driverFilter}
                      </Badge>
                    )}
                    {clientFilter !== 'all' && (
                      <Badge variant="secondary" className="text-xs gap-1">
                        <Building className="h-2.5 w-2.5" />
                        {clientFilter}
                      </Badge>
                    )}
                    {searchQuery && (
                      <Badge variant="secondary" className="text-xs gap-1">
                        <Search className="h-2.5 w-2.5" />
                        "{searchQuery}"
                      </Badge>
                    )}
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 gap-1 text-xs">
                  <FilterX className="h-3 w-3" />
                  Clear all
                </Button>
              </div>
            )}

            {/* Results Summary */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Showing <span className="font-medium text-foreground">{filteredTrips.length}</span> of{' '}
                <span className="font-medium text-foreground">{trips.length}</span> completed trips
              </span>
              {Object.keys(tripsByWeek).length > 0 && (
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={expandAll} className="h-7 text-xs">
                    Expand All
                  </Button>
                  <Button variant="ghost" size="sm" onClick={collapseAll} className="h-7 text-xs">
                    Collapse All
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Duplicate POD Alert */}
        {duplicatePods.length > 0 && (
          <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4 flex items-start gap-3">
            <div className="h-9 w-9 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4 text-destructive" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-destructive">Duplicate POD Numbers Detected</p>
              <p className="text-sm text-destructive/70 mt-0.5">
                Duplicates: {duplicatePods.join(', ')}
              </p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Empty State */}
        {!isLoading && trips.length === 0 && (
          <Card className="border-dashed">
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="h-20 w-20 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-6">
                <CheckCircle className="h-10 w-10 text-emerald-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No completed trips</h3>
              <p className="text-sm text-muted-foreground text-center max-w-md mb-8">
                Completed trips will appear here once trips are marked as completed from the active trips view.
              </p>
            </div>
          </Card>
        )}

        {/* No Results State */}
        {!isLoading && trips.length > 0 && filteredTrips.length === 0 && (
          <Card className="border-dashed">
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="h-20 w-20 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-6">
                <Filter className="h-10 w-10 text-amber-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No matching trips</h3>
              <p className="text-sm text-muted-foreground text-center max-w-md mb-8">
                No completed trips match your current filter criteria. Try adjusting or clearing the filters.
              </p>
              <Button variant="outline" size="lg" onClick={clearFilters} className="gap-2">
                <FilterX className="h-4 w-4" />
                Clear All Filters
              </Button>
            </div>
          </Card>
        )}

        {/* Trip Cards - Grouped View */}
        {!isLoading && viewMode === 'grouped' && filteredTrips.length > 0 && (
          <div className="space-y-4">
            {Object.entries(tripsByWeek).map(([weekKey, weekTrips]) => {
              const isCollapsed = !expandedWeeks.has(weekKey);
              const weekNumber = weekKey === 'No Date' ? null : getWeekNumber(weekKey);
              const formattedWeek = weekKey === 'No Date'
                ? 'No Offloading Date'
                : formatWeekRange(weekKey);

              // Calculate week totals
              const weekRevenue = weekTrips.reduce((sum, t) => sum + (t.base_revenue || 0), 0);
              const weekExpenses = weekTrips.reduce((sum, t) => {
                return sum + [...(t.costs || []), ...(t.additional_costs || [])].reduce((s, c) => s + (c.amount || 0), 0);
              }, 0);

              return (
                <Collapsible
                  key={weekKey}
                  open={!isCollapsed}
                  onOpenChange={() => toggleWeekCollapse(weekKey)}
                >
                  <CollapsibleTrigger asChild>
                    <div className="group flex items-center justify-between p-5 bg-card border rounded-xl hover:bg-accent/50 hover:border-emerald-500/30 transition-all duration-200 cursor-pointer shadow-sm">
                      <div className="flex items-center gap-5">
                        <div className={`flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-200 ${
                          isCollapsed 
                            ? 'bg-muted group-hover:bg-emerald-500/10' 
                            : 'bg-emerald-500/20'
                        }`}>
                          {isCollapsed ? (
                            <ChevronRight className={`h-5 w-5 transition-colors ${
                              isCollapsed ? 'text-muted-foreground' : 'text-emerald-600'
                            }`} />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-emerald-600" />
                          )}
                        </div>
                        
                        {weekNumber && (
                          <div className="flex flex-col items-center justify-center w-16 h-16 bg-emerald-500/10 rounded-xl">
                            <span className="text-xs text-muted-foreground">Week</span>
                            <span className="text-2xl font-bold text-emerald-600 tabular-nums leading-none">{weekNumber}</span>
                          </div>
                        )}

                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="text-lg font-semibold">{formattedWeek}</h3>
                            <Badge variant="secondary" className="text-xs font-medium px-2.5 py-0.5">
                              {weekTrips.length} {weekTrips.length === 1 ? 'trip' : 'trips'}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="flex items-center gap-1.5">
                              <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
                              <span className="font-medium text-emerald-600">{formatCurrency(weekRevenue)}</span>
                            </span>
                            <span className="flex items-center gap-1.5">
                              <DollarSign className="h-3.5 w-3.5 text-rose-500" />
                              <span className="font-medium text-rose-600">{formatCurrency(weekExpenses)}</span>
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Gauge className="h-3.5 w-3.5 text-blue-500" />
                              <span className="font-medium">{weekTrips.reduce((sum, t) => sum + (t.distance_km || 0), 0).toLocaleString()} km</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent className="mt-3">
                    <div className="space-y-3 pl-6 border-l-2 border-emerald-500/20 ml-6">
                      {(() => {
                        const fleetGroups = weekTrips.reduce<Record<string, Trip[]>>((acc, trip) => {
                          const fleet = trip.fleet_number || 'Unassigned';
                          if (!acc[fleet]) acc[fleet] = [];
                          acc[fleet].push(trip);
                          return acc;
                        }, {});

                        return Object.entries(fleetGroups)
                          .sort(([a], [b]) => {
                            if (a === 'Unassigned') return 1;
                            if (b === 'Unassigned') return -1;
                            return a.localeCompare(b);
                          })
                          .map(([fleetNumber, fleetTrips]) => {
                            const fleetKey = `${weekKey}-${fleetNumber}`;
                            const isFleetExpanded = expandedFleets.has(fleetKey);

                            return (
                              <Collapsible key={fleetKey} open={isFleetExpanded} onOpenChange={() => toggleFleetCollapse(fleetKey)}>
                                <CollapsibleTrigger asChild>
                                  <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/50 border border-transparent hover:border-border/60 transition-all cursor-pointer">
                                    <div className="flex items-center gap-3">
                                      <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                        {isFleetExpanded ? (
                                          <ChevronDown className="h-4 w-4 text-emerald-600" />
                                        ) : (
                                          <ChevronRight className="h-4 w-4 text-emerald-600" />
                                        )}
                                      </div>
                                      <Truck className="h-4 w-4 text-muted-foreground" />
                                      <span className="font-semibold">{fleetNumber}</span>
                                      <Badge variant="secondary" className="text-xs font-medium">
                                        {fleetTrips.length} trips
                                      </Badge>
                                    </div>
                                    <span className="text-sm font-medium text-emerald-600">
                                      {formatCurrency(fleetTrips.reduce((sum, t) => sum + (t.base_revenue || 0), 0))}
                                    </span>
                                  </div>
                                </CollapsibleTrigger>

                                <CollapsibleContent className="mt-2">
                                  <div className="space-y-2 pl-12">
                                    {fleetTrips.map((trip) => {
                                      const profit = calculateProfit(trip);
                                      const isDuplicate = duplicatePods.includes(trip.trip_number);
                                      const hasEditHistory = trip.edit_history && trip.edit_history.length > 0;
                                      const needsAttention = trip.hasFlaggedCosts || trip.hasPendingCosts || trip.hasNoCosts;
                                      
                                      // Calculate individual trip expenses
                                      const tripExpenses = [...(trip.costs || []), ...(trip.additional_costs || [])]
                                        .reduce((sum, c) => sum + (c.amount || 0), 0);

                                      return (
                                        <Card key={trip.id} className={`overflow-hidden transition-all hover:shadow-md ${
                                          isDuplicate ? 'border-destructive/30 bg-destructive/5' : 
                                          needsAttention ? 'border-amber-300 bg-amber-50/30' : ''
                                        }`}>
                                          <div className="p-5">
                                            {/* Header */}
                                            <div className="flex items-start justify-between mb-4">
                                              <div className="flex items-start gap-4">
                                                <div className={`flex flex-col items-center justify-center w-14 h-14 rounded-xl ${
                                                  trip.hasFlaggedCosts ? 'bg-amber-100 ring-2 ring-amber-400' :
                                                  trip.hasNoCosts ? 'bg-rose-100 ring-2 ring-rose-300' :
                                                  'bg-emerald-500/10'
                                                }`}>
                                                  <span className="text-xs text-muted-foreground">POD</span>
                                                  <span className={`text-lg font-bold leading-none ${
                                                    trip.hasFlaggedCosts || trip.hasNoCosts ? 'text-amber-600' : 'text-emerald-600'
                                                  }`}>{trip.trip_number}</span>
                                                </div>
                                                <div>
                                                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                    <h4 className="font-semibold text-lg">{trip.route || 'No route specified'}</h4>
                                                    {/* Warning indicators */}
                                                    {trip.hasFlaggedCosts && (
                                                      <Tooltip>
                                                        <TooltipTrigger>
                                                          <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300 gap-1 text-xs">
                                                            <AlertTriangle className="h-3 w-3" />
                                                            {trip.flaggedCostCount} flagged
                                                          </Badge>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                          <p>{trip.flaggedCostCount} cost{trip.flaggedCostCount === 1 ? '' : 's'} flagged for review</p>
                                                        </TooltipContent>
                                                      </Tooltip>
                                                    )}
                                                    {trip.hasPendingCosts && !trip.hasFlaggedCosts && (
                                                      <Tooltip>
                                                        <TooltipTrigger>
                                                          <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300 gap-1 text-xs">
                                                            <RefreshCw className="h-3 w-3" />
                                                            {trip.pendingCostCount} pending
                                                          </Badge>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                          <p>{trip.pendingCostCount} cost{trip.pendingCostCount === 1 ? '' : 's'} under investigation</p>
                                                        </TooltipContent>
                                                      </Tooltip>
                                                    )}
                                                    {trip.hasNoCosts && (
                                                      <Tooltip>
                                                        <TooltipTrigger>
                                                          <Badge variant="outline" className="bg-rose-100 text-rose-700 border-rose-300 gap-1 text-xs">
                                                            <AlertTriangle className="h-3 w-3" />
                                                            No costs
                                                          </Badge>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                          <p>No cost entries recorded for this trip</p>
                                                        </TooltipContent>
                                                      </Tooltip>
                                                    )}
                                                    {isDuplicate && (
                                                      <Tooltip>
                                                        <TooltipTrigger>
                                                          <AlertTriangle className="h-4 w-4 text-destructive" />
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                          <p>Duplicate POD number</p>
                                                        </TooltipContent>
                                                      </Tooltip>
                                                    )}
                                                    {hasEditHistory && (
                                                      <Tooltip>
                                                        <TooltipTrigger>
                                                          <History className="h-4 w-4 text-amber-500" />
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                          <p>Has edit history</p>
                                                        </TooltipContent>
                                                      </Tooltip>
                                                    )}
                                                  </div>
                                                  <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                                                    <span className="flex items-center gap-1">
                                                      <Calendar className="h-3.5 w-3.5" />
                                                      {trip.arrival_date 
                                                        ? format(parseISO(trip.arrival_date), 'dd MMM yyyy')
                                                        : trip.departure_date 
                                                        ? format(parseISO(trip.departure_date), 'dd MMM yyyy')
                                                        : 'No date'}
                                                    </span>
                                                    <span>•</span>
                                                    <span className="flex items-center gap-1">
                                                      <MapPin className="h-3.5 w-3.5" />
                                                      {trip.client_name || 'No client'}
                                                    </span>
                                                    {/* Payment status badge */}
                                                    {trip.payment_status && (
                                                      <Badge variant="outline" className={`text-xs px-1.5 py-0 ${
                                                        trip.payment_status === 'paid' ? 'bg-emerald-100 text-emerald-700 border-emerald-300' :
                                                        trip.payment_status === 'partial' ? 'bg-amber-100 text-amber-700 border-amber-300' :
                                                        'bg-slate-100 text-slate-600 border-slate-300'
                                                      }`}>
                                                        {trip.payment_status === 'paid' ? 'Paid' :
                                                         trip.payment_status === 'partial' ? 'Partial' : 'Unpaid'}
                                                      </Badge>
                                                    )}
                                                  </div>
                                                </div>
                                              </div>

                                              <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                  <Button variant="ghost" size="icon" className="h-9 w-9">
                                                    <MoreVertical className="h-4 w-4" />
                                                  </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-56">
                                                  <DropdownMenuItem onClick={() => onView(trip)} className="gap-2">
                                                    <Eye className="h-4 w-4" /> View Details
                                                  </DropdownMenuItem>
                                                  <DropdownMenuItem onClick={() => handleEdit(trip)} className="gap-2">
                                                    <Edit className="h-4 w-4" /> Edit Trip
                                                  </DropdownMenuItem>
                                                  <DropdownMenuSeparator />
                                                  <DropdownMenuItem onClick={() => handleReactivate(trip)} className="gap-2 text-blue-600">
                                                    <RotateCcw className="h-4 w-4" /> Reactivate Trip
                                                  </DropdownMenuItem>
                                                </DropdownMenuContent>
                                              </DropdownMenu>
                                            </div>

                                            {/* Metrics Grid */}
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                              <div className="bg-muted/30 rounded-lg p-3">
                                                <p className="text-xs text-muted-foreground mb-1">Driver</p>
                                                <div className="flex items-center gap-2">
                                                  <User className="h-4 w-4 text-muted-foreground" />
                                                  <span className="font-medium truncate">{trip.driver_name || '—'}</span>
                                                </div>
                                              </div>

                                              <div className="bg-muted/30 rounded-lg p-3">
                                                <p className="text-xs text-muted-foreground mb-1">Fleet</p>
                                                <div className="flex items-center gap-2">
                                                  <Truck className="h-4 w-4 text-muted-foreground" />
                                                  <span className="font-mono font-medium">{trip.fleet_number || '—'}</span>
                                                </div>
                                              </div>

                                              <div className="bg-muted/30 rounded-lg p-3">
                                                <p className="text-xs text-muted-foreground mb-1">Distance</p>
                                                <div className="flex items-center gap-2">
                                                  <Gauge className="h-4 w-4 text-muted-foreground" />
                                                  <span className="font-medium">
                                                    {trip.distance_km ? `${trip.distance_km.toLocaleString()} km` : '—'}
                                                    {trip.empty_km ? ` (${trip.empty_km} empty)` : ''}
                                                  </span>
                                                </div>
                                              </div>

                                              <div className="bg-muted/30 rounded-lg p-3">
                                                <p className="text-xs text-muted-foreground mb-1">Profit</p>
                                                <div className="flex items-center gap-2">
                                                  <DollarSign className={`h-4 w-4 ${profit?.amount && profit.amount >= 0 ? 'text-emerald-500' : 'text-rose-500'}`} />
                                                  <span className={`font-semibold ${
                                                    profit?.amount && profit.amount >= 0 ? 'text-emerald-600' : 'text-rose-600'
                                                  }`}>
                                                    {profit ? formatCurrency(profit.amount, profit.currency) : '—'}
                                                  </span>
                                                </div>
                                              </div>
                                            </div>

                                            {/* Financial Details */}
                                            <div className="flex flex-wrap items-center gap-4 text-sm border-t pt-3">
                                              <div className="flex items-center gap-2">
                                                <span className="text-muted-foreground">Revenue:</span>
                                                <span className="font-semibold text-emerald-600">
                                                  {formatCurrency(trip.base_revenue || 0, trip.revenue_currency)}
                                                </span>
                                              </div>
                                              <Separator orientation="vertical" className="h-4" />
                                              <div className="flex items-center gap-2">
                                                <span className="text-muted-foreground">Expenses:</span>
                                                <span className="font-semibold text-rose-600">
                                                  {formatCurrency(tripExpenses)}
                                                </span>
                                              </div>
                                              {trip.description && (
                                                <>
                                                  <Separator orientation="vertical" className="h-4" />
                                                  <div className="flex items-center gap-2">
                                                    <span className="text-muted-foreground">Notes:</span>
                                                    <span className="text-sm text-muted-foreground italic truncate max-w-[200px]">
                                                      {trip.description}
                                                    </span>
                                                  </div>
                                                </>
                                              )}
                                            </div>
                                          </div>
                                        </Card>
                                      );
                                    })}
                                  </div>
                                </CollapsibleContent>
                              </Collapsible>
                            );
                          });
                      })()}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        )}

        {selectedTrip && (
          <CompletedTripEditModal
            isOpen={isEditModalOpen}
            trip={selectedTrip}
            onClose={() => setIsEditModalOpen(false)}
            onSave={handleSaveEdit}
          />
        )}

        {/* Trip List - List View */}
        {!isLoading && viewMode === 'list' && filteredTrips.length > 0 && (
          <div className="bg-card border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">POD</th>
                    <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fleet</th>
                    <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Driver</th>
                    <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Client</th>
                    <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Route</th>
                    <th className="text-right p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Revenue</th>
                    <th className="text-right p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Expenses</th>
                    <th className="text-right p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Profit</th>
                    <th className="text-right p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Distance</th>
                    <th className="text-right p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredTrips.map((trip) => {
                    const profit = calculateProfit(trip);
                    const expenses = [...(trip.costs || []), ...(trip.additional_costs || [])].reduce((s, c) => s + (c.amount || 0), 0);
                    return (
                      <tr key={trip.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3">
                          <span className="font-medium text-sm">{trip.trip_number}</span>
                          {duplicatePods.includes(trip.trip_number) && (
                            <AlertTriangle className="h-3 w-3 text-amber-500 ml-2 inline" />
                          )}
                        </td>
                        <td className="p-3">
                          <Badge variant="outline" className="text-xs">{trip.fleet_number || '-'}</Badge>
                        </td>
                        <td className="p-3 text-sm">{trip.driver_name || '-'}</td>
                        <td className="p-3 text-sm">{trip.client_name || '-'}</td>
                        <td className="p-3 text-sm max-w-[150px] truncate">{trip.route || '-'}</td>
                        <td className="p-3 text-right">
                          <span className="text-sm font-medium text-emerald-600">
                            {formatCurrency(trip.base_revenue || 0)}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <span className="text-sm font-medium text-rose-600">
                            {formatCurrency(expenses)}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <span className={`text-sm font-medium ${(profit?.amount || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {formatCurrency(profit?.amount || 0)}
                          </span>
                        </td>
                        <td className="p-3 text-right text-sm">{trip.distance_km?.toLocaleString() || 0} km</td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => onView(trip)} title="View">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleEdit(trip)} title="Edit">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-emerald-600" onClick={() => handleReactivate(trip)} title="Reactivate">
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Export Dialog */}
        <TripExportDialog
          isOpen={isExportDialogOpen}
          onClose={() => setIsExportDialogOpen(false)}
          trips={trips}
          tripType="completed"
        />
      </div>
    </TooltipProvider>
  );
};

export default CompletedTrips;