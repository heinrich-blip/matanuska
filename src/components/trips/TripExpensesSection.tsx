import { CostForm } from '@/components/costs/CostForm';
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
  } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import
  {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
  } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import
  {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from '@/components/ui/select';
import
  {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from '@/components/ui/table';
import { useOperations } from '@/contexts/OperationsContext';
import { useToast } from '@/hooks/use-toast';
import { useWialonVehicles } from '@/hooks/useWialonVehicles';
import { supabase } from '@/integrations/supabase/client';
import { CostEntry, Trip } from '@/types/operations';
import { extractFleetNumber } from '@/utils/fleetUtils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import
  {
    AlertTriangle,
    CheckCircle,
    Edit,
    Eye,
    Flag,
    RotateCcw,
    Search,
    Trash2,
    Truck
  } from 'lucide-react';
import { useMemo, useState } from 'react';
import FlagResolutionModal from './FlagResolutionModal';

interface TripExpensesSectionProps {
  trips: Trip[];
  onViewTrip?: (trip: Trip) => void;
}

interface ExpenseWithTrip extends CostEntry {
  trip_number?: string;
  trip_status?: string;
  trip_origin?: string;
  trip_destination?: string;
  fleet_number?: string;
}

const TripExpensesSection = ({ trips, onViewTrip }: TripExpensesSectionProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { deleteCostEntry } = useOperations();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'flagged' | 'resolved' | 'verified'>('all');
  const [filterTripStatus, setFilterTripStatus] = useState<'all' | 'active' | 'completed'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterFleet, setFilterFleet] = useState<string>('all');
  const [editingCost, setEditingCost] = useState<CostEntry | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [costToDelete, setCostToDelete] = useState<CostEntry | null>(null);
  const [selectedFlaggedCost, setSelectedFlaggedCost] = useState<CostEntry | null>(null);
  const [showFlagModal, setShowFlagModal] = useState(false);

  // Fetch wialon vehicles for fleet mapping
  const { data: wialonVehicles = [] } = useWialonVehicles();

  // Check if any filters are active
  const hasActiveFilters = searchQuery || filterStatus !== 'all' || filterTripStatus !== 'all' || filterCategory !== 'all' || filterFleet !== 'all';

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setFilterStatus('all');
    setFilterTripStatus('all');
    setFilterCategory('all');
    setFilterFleet('all');
  };

  // Fetch all cost entries with trip information
  const { data: expenses = [], isLoading, refetch } = useQuery({
    queryKey: ['all-expenses', trips, wialonVehicles],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cost_entries')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;

      // Create a map of trips by id for quick lookup
      const tripMap = new Map(trips.map((trip) => [trip.id, trip]));

      // Create a map of wialon vehicles for fleet lookup - extract short fleet codes
      const wialonMap = new Map(wialonVehicles.map((v) => [v.id, extractFleetNumber(v.fleet_number || v.name)]));

      // Transform data to include trip information
      return (data || []).map((expense) => {
        const tripData = expense.trip_id ? tripMap.get(expense.trip_id) : null;
        // Get fleet number from wialon vehicle via trip's vehicle_id
        const fleetNumber = tripData?.vehicle_id ? wialonMap.get(tripData.vehicle_id) : undefined;
        return {
          ...expense,
          attachments: expense.attachments as unknown as CostEntry['attachments'],
          trip_number: tripData?.trip_number,
          trip_status: tripData?.status,
          trip_origin: tripData?.origin,
          trip_destination: tripData?.destination,
          fleet_number: fleetNumber,
        } as ExpenseWithTrip;
      });
    },
    enabled: trips.length > 0,
  });

  // Get unique categories for filter
  const categories = useMemo(() => {
    const uniqueCategories = new Set(expenses.map((e) => e.category));
    return Array.from(uniqueCategories).sort();
  }, [expenses]);

  // Get unique fleet numbers for filter
  const fleetNumbers = useMemo(() => {
    const uniqueFleets = new Set(
      expenses
        .map((e) => e.fleet_number)
        .filter((f): f is string => !!f)
    );
    return Array.from(uniqueFleets).sort((a, b) => {
      // Natural sort for fleet numbers like 4H, 6H, 21H, 22H
      const aNum = parseInt(a.replace(/\D/g, '')) || 0;
      const bNum = parseInt(b.replace(/\D/g, '')) || 0;
      if (aNum !== bNum) return aNum - bNum;
      return a.localeCompare(b);
    });
  }, [expenses]);

  // Filter expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          expense.category?.toLowerCase().includes(query) ||
          expense.sub_category?.toLowerCase().includes(query) ||
          expense.reference_number?.toLowerCase().includes(query) ||
          expense.trip_number?.toLowerCase().includes(query) ||
          expense.fleet_number?.toLowerCase().includes(query) ||
          expense.notes?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (filterStatus !== 'all') {
        if (filterStatus === 'flagged' && (!expense.is_flagged || expense.investigation_status === 'resolved')) {
          return false;
        }
        if (filterStatus === 'resolved' && expense.investigation_status !== 'resolved') {
          return false;
        }
        if (filterStatus === 'verified' && expense.is_flagged) {
          return false;
        }
      }

      // Trip status filter
      if (filterTripStatus !== 'all' && expense.trip_status !== filterTripStatus) {
        return false;
      }

      // Category filter
      if (filterCategory !== 'all' && expense.category !== filterCategory) {
        return false;
      }

      // Fleet filter
      if (filterFleet !== 'all' && expense.fleet_number !== filterFleet) {
        return false;
      }

      return true;
    });
  }, [expenses, searchQuery, filterStatus, filterTripStatus, filterCategory, filterFleet]);

  // Calculate summary statistics
  const stats = useMemo(() => {
    const totalExpenses = { ZAR: 0, USD: 0 };
    let flaggedCount = 0;
    let unresolvedFlagCount = 0;
    let resolvedCount = 0;

    expenses.forEach((expense) => {
      const currency = (expense.currency as 'ZAR' | 'USD') || 'USD';
      totalExpenses[currency] += expense.amount || 0;

      if (expense.is_flagged) {
        flaggedCount++;
        if (expense.investigation_status === 'resolved') {
          resolvedCount++;
        } else {
          unresolvedFlagCount++;
        }
      }
    });

    return {
      totalExpenses,
      totalCount: expenses.length,
      flaggedCount,
      unresolvedFlagCount,
      resolvedCount,
    };
  }, [expenses]);

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    const symbol = currency === 'USD' ? '$' : 'R';
    return `${symbol}${amount.toLocaleString('en-ZA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-ZA');
  };

  const handleEdit = (expense: CostEntry) => {
    setEditingCost(expense);
    setShowEditDialog(true);
  };

  const handleDelete = async () => {
    if (!costToDelete) return;

    try {
      await deleteCostEntry(costToDelete.id);
      toast({
        title: 'Success',
        description: 'Expense deleted successfully',
      });
      setCostToDelete(null);
      refetch();
      queryClient.invalidateQueries({ queryKey: ['cost-entries'] });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to delete expense',
        variant: 'destructive',
      });
    }
  };

  const handleResolveFlag = (cost: CostEntry) => {
    setSelectedFlaggedCost(cost);
    setShowFlagModal(true);
  };

  const getStatusBadge = (expense: ExpenseWithTrip) => {
    if (!expense.is_flagged) {
      return (
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-300/50">
          <CheckCircle className="w-3 h-3 mr-1" />
          Verified
        </Badge>
      );
    }

    if (expense.investigation_status === 'resolved') {
      return (
        <Badge variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-300/50">
          <CheckCircle className="w-3 h-3 mr-1" />
          Resolved
        </Badge>
      );
    }

    return (
      <Badge variant="destructive">
        <AlertTriangle className="w-3 h-3 mr-1" />
        Flagged
      </Badge>
    );
  };

  const findTripById = (tripId?: string) => {
    if (!tripId) return null;
    return trips.find((t) => t.id === tripId) || null;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <p className="text-muted-foreground">Loading expenses...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Glass Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-card/80 backdrop-blur-sm border border-border/60 rounded-xl px-5 py-3.5 shadow-sm">
        <div>
          <span className="text-sm font-medium text-muted-foreground tabular-nums">
            {stats.totalCount} entries totaling {formatCurrency(stats.totalExpenses.ZAR, 'ZAR')}
            {stats.totalExpenses.USD > 0 && ` + ${formatCurrency(stats.totalExpenses.USD, 'USD')}`}
          </span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          {stats.unresolvedFlagCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-700">
              <Flag className="h-3.5 w-3.5" />
              <span className="font-medium">{stats.unresolvedFlagCount}</span>
              <span>flagged</span>
            </div>
          )}
          {stats.resolvedCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-700">
              <CheckCircle className="h-3.5 w-3.5" />
              <span className="font-medium">{stats.resolvedCount}</span>
              <span>resolved</span>
            </div>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 p-4 rounded-xl bg-muted/40 backdrop-blur-sm border border-border/40">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search expenses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9 text-sm bg-background/80 border-border/50 rounded-lg"
          />
        </div>

        <div className="flex flex-wrap gap-2.5">
          {/* Fleet Filter */}
          <Select value={filterFleet} onValueChange={setFilterFleet}>
            <SelectTrigger className="h-9 w-[120px] text-sm bg-background/80 border-border/50 rounded-lg">
              <Truck className="h-3.5 w-3.5 mr-1.5 text-muted-foreground shrink-0" />
              <SelectValue placeholder="Fleet" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Fleets</SelectItem>
              {fleetNumbers.map((fleet) => (
                <SelectItem key={fleet} value={fleet}>
                  {fleet}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Category Filter */}
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="h-9 w-[140px] text-sm bg-background/80 border-border/50 rounded-lg">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Flag Status Filter */}
          <Select value={filterStatus} onValueChange={(value: typeof filterStatus) => setFilterStatus(value)}>
            <SelectTrigger className="h-9 w-[120px] text-sm bg-background/80 border-border/50 rounded-lg">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="flagged">Flagged</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="verified">Verified</SelectItem>
            </SelectContent>
          </Select>

          {/* Trip Status Filter */}
          <Select value={filterTripStatus} onValueChange={(value: typeof filterTripStatus) => setFilterTripStatus(value)}>
            <SelectTrigger className="h-9 w-[130px] text-sm bg-background/80 border-border/50 rounded-lg">
              <SelectValue placeholder="Trip" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Trips</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-9 px-2.5 text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Active Filter Pills */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-1.5">
          {filterFleet !== 'all' && (
            <Badge variant="secondary" className="gap-1 text-xs h-6">
              Fleet: {filterFleet}
              <button onClick={() => setFilterFleet('all')} className="ml-0.5 hover:text-destructive">×</button>
            </Badge>
          )}
          {filterCategory !== 'all' && (
            <Badge variant="secondary" className="gap-1 text-xs h-6">
              {filterCategory}
              <button onClick={() => setFilterCategory('all')} className="ml-0.5 hover:text-destructive">×</button>
            </Badge>
          )}
          {filterStatus !== 'all' && (
            <Badge variant="secondary" className="gap-1 text-xs h-6">
              {filterStatus}
              <button onClick={() => setFilterStatus('all')} className="ml-0.5 hover:text-destructive">×</button>
            </Badge>
          )}
          {filterTripStatus !== 'all' && (
            <Badge variant="secondary" className="gap-1 text-xs h-6">
              {filterTripStatus} trips
              <button onClick={() => setFilterTripStatus('all')} className="ml-0.5 hover:text-destructive">×</button>
            </Badge>
          )}
          {searchQuery && (
            <Badge variant="secondary" className="gap-1 text-xs h-6">
              "{searchQuery}"
              <button onClick={() => setSearchQuery('')} className="ml-0.5 hover:text-destructive">×</button>
            </Badge>
          )}
        </div>
      )}

      {/* Expenses Table */}
      <div className="rounded-xl border border-border/60 bg-card/80 backdrop-blur-sm shadow-sm">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/60">
          <h3 className="font-medium text-sm">
            Expenses <span className="text-muted-foreground font-normal">({filteredExpenses.length})</span>
          </h3>
        </div>
        {filteredExpenses.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-muted-foreground text-sm">No expenses found matching your filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[70px] text-xs font-medium">Fleet</TableHead>
                  <TableHead className="text-xs font-medium">Trip</TableHead>
                  <TableHead className="text-xs font-medium">Category</TableHead>
                  <TableHead className="text-xs font-medium text-right">Amount</TableHead>
                  <TableHead className="w-[90px] text-xs font-medium">Date</TableHead>
                  <TableHead className="w-[100px] text-xs font-medium">Status</TableHead>
                  <TableHead className="w-[120px] text-xs font-medium text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.map((expense) => (
                  <TableRow
                    key={expense.id}
                    className={expense.is_flagged && expense.investigation_status !== 'resolved' ? 'bg-amber-50/50 dark:bg-amber-950/20' : ''}
                  >
                    <TableCell className="py-2">
                      {expense.fleet_number ? (
                        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-xs font-mono font-medium">
                          {expense.fleet_number}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium">{expense.trip_number || '-'}</span>
                        {expense.trip_origin && expense.trip_destination && (
                          <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {expense.trip_origin} → {expense.trip_destination}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm">{expense.category}</span>
                        {expense.sub_category && (
                          <span className="text-xs text-muted-foreground">{expense.sub_category}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-2 text-right font-medium tabular-nums text-sm">
                      {formatCurrency(expense.amount, expense.currency || 'USD')}
                    </TableCell>
                    <TableCell className="py-2 text-xs text-muted-foreground">
                      {formatDate(expense.date)}
                    </TableCell>
                    <TableCell className="py-2">{getStatusBadge(expense)}</TableCell>
                    <TableCell className="py-2 text-right">
                      <div className="flex items-center justify-end gap-0.5">
                        {expense.trip_id && onViewTrip && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => {
                              const trip = findTripById(expense.trip_id);
                              if (trip) onViewTrip(trip);
                            }}
                            title="View Trip"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {expense.is_flagged && expense.investigation_status !== 'resolved' && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-amber-600"
                            onClick={() => handleResolveFlag(expense)}
                            title="Resolve Flag"
                          >
                            <Flag className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => handleEdit(expense)}
                          title="Edit"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => setCostToDelete(expense)}
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
          </DialogHeader>
          {editingCost && (
            <CostForm
              tripId={editingCost.trip_id || ''}
              cost={editingCost as import('@/types/forms').Cost}
              onSubmit={(success) => {
                if (success) {
                  setShowEditDialog(false);
                  setEditingCost(null);
                  refetch();
                  queryClient.invalidateQueries({ queryKey: ['cost-entries'] });
                }
              }}
              onCancel={() => {
                setShowEditDialog(false);
                setEditingCost(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Flag Resolution Modal */}
      <FlagResolutionModal
        cost={selectedFlaggedCost}
        isOpen={showFlagModal}
        onClose={() => {
          setShowFlagModal(false);
          setSelectedFlaggedCost(null);
        }}
        onResolve={() => {
          refetch();
          queryClient.invalidateQueries({ queryKey: ['cost-entries'] });
          setShowFlagModal(false);
          setSelectedFlaggedCost(null);
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!costToDelete} onOpenChange={() => setCostToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this expense? This action cannot be undone.
              {costToDelete?.is_flagged && (
                <span className="block mt-2 text-amber-600 font-medium">
                  Warning: This expense is flagged and may require investigation.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TripExpensesSection;