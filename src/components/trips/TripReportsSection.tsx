import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { CostEntry, Trip } from '@/types/operations';
import
  {
    endOfWeek,
    format,
    getISOWeek,
    getISOWeekYear,
    getYear,
    parseISO,
    startOfWeek,
    subMonths,
  } from 'date-fns';
import
  {
    Building,
    Calendar,
    DollarSign,
    Download,
    MapPin,
    TrendingDown,
    TrendingUp,
    Truck,
    User
  } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import TruckReportsTab from './TruckReportsTab';

interface TripReportsSectionProps {
  trips: Trip[];
  costEntries: CostEntry[];
}

interface CurrencyAmounts {
  ZAR: number;
  USD: number;
}

interface WeeklySummary {
  weekKey: string;
  weekNumber: number;
  year: number;
  startDate: string;
  endDate: string;
  tripCount: number;
  revenue: CurrencyAmounts;
  expenses: CurrencyAmounts;
  profit: CurrencyAmounts;
  totalKm: number;
}

interface MonthlySummary {
  monthKey: string;
  monthName: string;
  year: number;
  tripCount: number;
  completedTrips: number;
  activeTrips: number;
  revenue: CurrencyAmounts;
  expenses: CurrencyAmounts;
  profit: CurrencyAmounts;
  totalKm: number;
}

interface DriverSummary {
  driverName: string;
  tripCount: number;
  completedTrips: number;
  revenue: CurrencyAmounts;
  expenses: CurrencyAmounts;
  profit: CurrencyAmounts;
  totalKm: number;
}

interface ClientSummary {
  clientName: string;
  tripCount: number;
  completedTrips: number;
  revenue: CurrencyAmounts;
  expenses: CurrencyAmounts;
  profit: CurrencyAmounts;
  totalKm: number;
  emptyKm: number;
  lastTripDate: string;
}

interface RouteSummary {
  route: string;
  origin: string;
  destination: string;
  tripCount: number;
  revenue: CurrencyAmounts;
  expenses: CurrencyAmounts;
  profit: CurrencyAmounts;
}

interface TruckSummary {
  fleetNumber: string;
  tripCount: number;
  revenue: CurrencyAmounts;
  expenses: CurrencyAmounts;
  profit: CurrencyAmounts;
  totalKm: number;
}

// Helper to display currency amounts
const CurrencyDisplay = ({ amounts, type = 'default' }: { amounts: CurrencyAmounts; type?: 'revenue' | 'expense' | 'profit' | 'default' }) => {
  const hasZAR = amounts.ZAR !== 0;
  const hasUSD = amounts.USD !== 0;

  if (!hasZAR && !hasUSD) {
    return <span className="text-muted-foreground">-</span>;
  }

  const getColorClass = (value: number) => {
    if (type === 'revenue') return 'text-green-600';
    if (type === 'expense') return 'text-red-600';
    if (type === 'profit') return value >= 0 ? 'text-emerald-600' : 'text-orange-600';
    return '';
  };

  return (
    <div className="space-y-0.5">
      {hasZAR && (
        <div className={cn('font-semibold', getColorClass(amounts.ZAR))}>
          {formatCurrency(amounts.ZAR, 'ZAR')}
        </div>
      )}
      {hasUSD && (
        <div className={cn('font-semibold', getColorClass(amounts.USD))}>
          {formatCurrency(amounts.USD, 'USD')}
        </div>
      )}
    </div>
  );
};

const TripReportsSection = ({ trips, costEntries }: TripReportsSectionProps) => {
  const [selectedPeriod, setSelectedPeriod] = useState<string>('3months');
  const { toast } = useToast();

  // Filter trips by period
  const filteredTrips = useMemo(() => {
    const now = new Date();
    let startDate: Date;

    switch (selectedPeriod) {
      case '1month':
        startDate = subMonths(now, 1);
        break;
      case '3months':
        startDate = subMonths(now, 3);
        break;
      case '6months':
        startDate = subMonths(now, 6);
        break;
      case '1year':
        startDate = subMonths(now, 12);
        break;
      case 'all':
      default:
        return trips;
    }

    return trips.filter(trip => {
      const tripDate = trip.departure_date ? parseISO(trip.departure_date) : null;
      return tripDate && tripDate >= startDate;
    });
  }, [trips, selectedPeriod]);

  // Calculate costs for each trip by currency
  const getTripCostsByCurrency = useCallback((tripId: string): CurrencyAmounts => {
    const tripCosts = costEntries.filter(cost => cost.trip_id === tripId);
    return {
      ZAR: tripCosts
        .filter(cost => cost.currency === 'ZAR')
        .reduce((sum, cost) => sum + Number(cost.amount || 0), 0),
      USD: tripCosts
        .filter(cost => (cost.currency || 'USD') === 'USD')
        .reduce((sum, cost) => sum + Number(cost.amount || 0), 0),
    };
  }, [costEntries]);

  // Overall Summary Stats
  const overallStats = useMemo(() => {
    const revenueZAR = filteredTrips
      .filter(t => t.revenue_currency === 'ZAR')
      .reduce((sum, t) => sum + (t.base_revenue || 0), 0);
    const revenueUSD = filteredTrips
      .filter(t => (t.revenue_currency || 'USD') === 'USD')
      .reduce((sum, t) => sum + (t.base_revenue || 0), 0);

    let expensesZAR = 0;
    let expensesUSD = 0;
    filteredTrips.forEach(t => {
      const costs = getTripCostsByCurrency(t.id);
      expensesZAR += costs.ZAR;
      expensesUSD += costs.USD;
    });

    const profitZAR = revenueZAR - expensesZAR;
    const profitUSD = revenueUSD - expensesUSD;
    const totalKm = filteredTrips.reduce((sum, t) => sum + (t.distance_km || 0), 0);
    const completedTrips = filteredTrips.filter(t => t.status === 'completed').length;

    return {
      totalTrips: filteredTrips.length,
      completedTrips,
      activeTrips: filteredTrips.length - completedTrips,
      revenue: { ZAR: revenueZAR, USD: revenueUSD },
      expenses: { ZAR: expensesZAR, USD: expensesUSD },
      profit: { ZAR: profitZAR, USD: profitUSD },
      totalKm,
      hasUSD: revenueUSD > 0 || expensesUSD > 0,
    };
  }, [filteredTrips, getTripCostsByCurrency]);

  // Weekly Summary - uses arrival_date (offloading date) for grouping, fallback to departure_date
  const weeklySummaries = useMemo(() => {
    const weekMap = new Map<string, WeeklySummary>();

    filteredTrips.forEach(trip => {
      const dateToUse = trip.arrival_date || trip.departure_date;
      if (!dateToUse) return;

      const date = parseISO(dateToUse);
      const weekStart = startOfWeek(date, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
      const weekNumber = getISOWeek(date);
      const year = getISOWeekYear(date);
      const weekKey = `${year}-W${String(weekNumber).padStart(2, '0')}`;

      const existing = weekMap.get(weekKey) || {
        weekKey,
        weekNumber,
        year,
        startDate: format(weekStart, 'dd MMM'),
        endDate: format(weekEnd, 'dd MMM yyyy'),
        tripCount: 0,
        revenue: { ZAR: 0, USD: 0 },
        expenses: { ZAR: 0, USD: 0 },
        profit: { ZAR: 0, USD: 0 },
        totalKm: 0,
      };

      const tripCosts = getTripCostsByCurrency(trip.id);
      const tripCurrency = (trip.revenue_currency || 'USD') as 'ZAR' | 'USD';
      const revenue = trip.base_revenue || 0;

      existing.tripCount += 1;
      existing.revenue[tripCurrency] += revenue;
      existing.expenses.ZAR += tripCosts.ZAR;
      existing.expenses.USD += tripCosts.USD;
      existing.profit.ZAR = existing.revenue.ZAR - existing.expenses.ZAR;
      existing.profit.USD = existing.revenue.USD - existing.expenses.USD;
      existing.totalKm += trip.distance_km || 0;

      weekMap.set(weekKey, existing);
    });

    return Array.from(weekMap.values()).sort((a, b) => b.weekKey.localeCompare(a.weekKey));
  }, [filteredTrips, getTripCostsByCurrency]);

  // Monthly Summary - uses arrival_date (offloading date) for grouping, fallback to departure_date
  const monthlySummaries = useMemo(() => {
    const monthMap = new Map<string, MonthlySummary>();

    filteredTrips.forEach(trip => {
      const dateToUse = trip.arrival_date || trip.departure_date;
      if (!dateToUse) return;

      const date = parseISO(dateToUse);
      const monthKey = format(date, 'yyyy-MM');
      const monthName = format(date, 'MMMM');
      const year = getYear(date);

      const existing = monthMap.get(monthKey) || {
        monthKey,
        monthName,
        year,
        tripCount: 0,
        completedTrips: 0,
        activeTrips: 0,
        revenue: { ZAR: 0, USD: 0 },
        expenses: { ZAR: 0, USD: 0 },
        profit: { ZAR: 0, USD: 0 },
        totalKm: 0,
      };

      const tripCosts = getTripCostsByCurrency(trip.id);
      const tripCurrency = (trip.revenue_currency || 'USD') as 'ZAR' | 'USD';
      const revenue = trip.base_revenue || 0;

      existing.tripCount += 1;
      if (trip.status === 'completed') existing.completedTrips += 1;
      else existing.activeTrips += 1;
      existing.revenue[tripCurrency] += revenue;
      existing.expenses.ZAR += tripCosts.ZAR;
      existing.expenses.USD += tripCosts.USD;
      existing.profit.ZAR = existing.revenue.ZAR - existing.expenses.ZAR;
      existing.profit.USD = existing.revenue.USD - existing.expenses.USD;
      existing.totalKm += trip.distance_km || 0;

      monthMap.set(monthKey, existing);
    });

    return Array.from(monthMap.values()).sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }, [filteredTrips, getTripCostsByCurrency]);

  // Driver Performance Summary
  const driverSummaries = useMemo(() => {
    const driverMap = new Map<string, DriverSummary>();

    filteredTrips.forEach(trip => {
      const driverName = trip.driver_name || 'Unassigned';

      const existing = driverMap.get(driverName) || {
        driverName,
        tripCount: 0,
        completedTrips: 0,
        revenue: { ZAR: 0, USD: 0 },
        expenses: { ZAR: 0, USD: 0 },
        profit: { ZAR: 0, USD: 0 },
        totalKm: 0,
      };

      const tripCosts = getTripCostsByCurrency(trip.id);
      const tripCurrency = (trip.revenue_currency || 'USD') as 'ZAR' | 'USD';
      const revenue = trip.base_revenue || 0;

      existing.tripCount += 1;
      if (trip.status === 'completed') existing.completedTrips += 1;
      existing.revenue[tripCurrency] += revenue;
      existing.expenses.ZAR += tripCosts.ZAR;
      existing.expenses.USD += tripCosts.USD;
      existing.profit.ZAR = existing.revenue.ZAR - existing.expenses.ZAR;
      existing.profit.USD = existing.revenue.USD - existing.expenses.USD;
      existing.totalKm += trip.distance_km || 0;

      driverMap.set(driverName, existing);
    });

    return Array.from(driverMap.values()).sort((a, b) => (b.revenue.ZAR + b.revenue.USD) - (a.revenue.ZAR + a.revenue.USD));
  }, [filteredTrips, getTripCostsByCurrency]);

  // Client Revenue Summary
  const clientSummaries = useMemo(() => {
    const clientMap = new Map<string, ClientSummary>();

    filteredTrips.forEach(trip => {
      const clientName = trip.client_name || 'No Client';

      const existing = clientMap.get(clientName) || {
        clientName,
        tripCount: 0,
        completedTrips: 0,
        revenue: { ZAR: 0, USD: 0 },
        expenses: { ZAR: 0, USD: 0 },
        profit: { ZAR: 0, USD: 0 },
        totalKm: 0,
        emptyKm: 0,
        lastTripDate: '',
      };

      const tripCosts = getTripCostsByCurrency(trip.id);
      const tripCurrency = (trip.revenue_currency || 'USD') as 'ZAR' | 'USD';
      const revenue = trip.base_revenue || 0;

      existing.tripCount += 1;
      if (trip.status === 'completed') existing.completedTrips += 1;
      existing.revenue[tripCurrency] += revenue;
      existing.expenses.ZAR += tripCosts.ZAR;
      existing.expenses.USD += tripCosts.USD;
      existing.profit.ZAR = existing.revenue.ZAR - existing.expenses.ZAR;
      existing.profit.USD = existing.revenue.USD - existing.expenses.USD;
      existing.totalKm += trip.distance_km || 0;
      existing.emptyKm += trip.empty_km || 0;

      if (trip.departure_date && (!existing.lastTripDate || trip.departure_date > existing.lastTripDate)) {
        existing.lastTripDate = trip.departure_date;
      }

      clientMap.set(clientName, existing);
    });

    return Array.from(clientMap.values()).sort((a, b) => (b.revenue.ZAR + b.revenue.USD) - (a.revenue.ZAR + a.revenue.USD));
  }, [filteredTrips, getTripCostsByCurrency]);

  // Route Summary
  const routeSummaries = useMemo(() => {
    const routeMap = new Map<string, RouteSummary>();

    filteredTrips.forEach(trip => {
      if (!trip.origin || !trip.destination) return;

      const routeKey = `${trip.origin} → ${trip.destination}`;

      const existing = routeMap.get(routeKey) || {
        route: routeKey,
        origin: trip.origin,
        destination: trip.destination,
        tripCount: 0,
        revenue: { ZAR: 0, USD: 0 },
        expenses: { ZAR: 0, USD: 0 },
        profit: { ZAR: 0, USD: 0 },
      };

      const tripCosts = getTripCostsByCurrency(trip.id);
      const tripCurrency = (trip.revenue_currency || 'USD') as 'ZAR' | 'USD';
      const revenue = trip.base_revenue || 0;

      existing.tripCount += 1;
      existing.revenue[tripCurrency] += revenue;
      existing.expenses.ZAR += tripCosts.ZAR;
      existing.expenses.USD += tripCosts.USD;
      existing.profit.ZAR = existing.revenue.ZAR - existing.expenses.ZAR;
      existing.profit.USD = existing.revenue.USD - existing.expenses.USD;

      routeMap.set(routeKey, existing);
    });

    return Array.from(routeMap.values()).sort((a, b) => b.tripCount - a.tripCount);
  }, [filteredTrips, getTripCostsByCurrency]);

  // Truck Summary - grouped by fleet number only
  const truckSummaries = useMemo(() => {
    const truckMap = new Map<string, TruckSummary>();

    filteredTrips.forEach(trip => {
      // Access fleet_number from trip (may not be in type but comes from DB)
      const fleetNumber = ((trip as Trip & { fleet_number?: string }).fleet_number || '').toUpperCase().trim();
      if (!fleetNumber) return;

      const existing = truckMap.get(fleetNumber) || {
        fleetNumber,
        tripCount: 0,
        revenue: { ZAR: 0, USD: 0 },
        expenses: { ZAR: 0, USD: 0 },
        profit: { ZAR: 0, USD: 0 },
        totalKm: 0,
      };

      const tripCosts = getTripCostsByCurrency(trip.id);
      const tripCurrency = (trip.revenue_currency || 'USD') as 'ZAR' | 'USD';
      const revenue = trip.base_revenue || 0;

      existing.tripCount += 1;
      existing.revenue[tripCurrency] += revenue;
      existing.expenses.ZAR += tripCosts.ZAR;
      existing.expenses.USD += tripCosts.USD;
      existing.profit.ZAR = existing.revenue.ZAR - existing.expenses.ZAR;
      existing.profit.USD = existing.revenue.USD - existing.expenses.USD;
      existing.totalKm += trip.distance_km || 0;

      truckMap.set(fleetNumber, existing);
    });

    return Array.from(truckMap.values()).sort((a, b) => (b.revenue.ZAR + b.revenue.USD) - (a.revenue.ZAR + a.revenue.USD));
  }, [filteredTrips, getTripCostsByCurrency]);

  // Export all trip reports to Excel
  const exportToExcel = useCallback(() => {
    try {
      const wb = XLSX.utils.book_new();

      // Calculate margins for summary
      const marginZAR = overallStats.revenue.ZAR > 0
        ? ((overallStats.profit.ZAR / overallStats.revenue.ZAR) * 100).toFixed(2) + '%'
        : '0%';
      const marginUSD = overallStats.revenue.USD > 0
        ? ((overallStats.profit.USD / overallStats.revenue.USD) * 100).toFixed(2) + '%'
        : '0%';

      // Overall Summary Sheet - Full year summary with margins (no completed/active trips)
      const summaryData = [
        ['Trip Reports Summary'],
        ['Period', selectedPeriod],
        ['Generated', new Date().toLocaleDateString()],
        [''],
        ['Overall Statistics'],
        ['Total Trips', overallStats.totalTrips],
        ['Total Kilometers', overallStats.totalKm],
        [''],
        ['Financial Summary (ZAR)'],
        ['Revenue (ZAR)', overallStats.revenue.ZAR],
        ['Expenses (ZAR)', overallStats.expenses.ZAR],
        ['Net Profit (ZAR)', overallStats.profit.ZAR],
        ['Profit Margin (ZAR)', marginZAR],
        [''],
        ['Financial Summary (USD)'],
        ['Revenue (USD)', overallStats.revenue.USD],
        ['Expenses (USD)', overallStats.expenses.USD],
        ['Net Profit (USD)', overallStats.profit.USD],
        ['Profit Margin (USD)', marginUSD],
      ];
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

      // Client Report Sheet
      const clientData = [
        ['Client', 'Trips', 'Revenue (ZAR)', 'Revenue (USD)', 'Expenses (ZAR)', 'Expenses (USD)', 'Profit (ZAR)', 'Profit (USD)'],
        ...clientSummaries.map(c => [
          c.clientName, c.tripCount,
          c.revenue.ZAR, c.revenue.USD, c.expenses.ZAR, c.expenses.USD, c.profit.ZAR, c.profit.USD
        ])
      ];
      const clientSheet = XLSX.utils.aoa_to_sheet(clientData);
      XLSX.utils.book_append_sheet(wb, clientSheet, 'By Client');

      // Driver Report Sheet
      const driverData = [
        ['Driver', 'Trips', 'KM', 'Revenue (ZAR)', 'Revenue (USD)', 'Expenses (ZAR)', 'Expenses (USD)', 'Profit (ZAR)', 'Profit (USD)'],
        ...driverSummaries.map(d => [
          d.driverName, d.tripCount, d.totalKm,
          d.revenue.ZAR, d.revenue.USD, d.expenses.ZAR, d.expenses.USD, d.profit.ZAR, d.profit.USD
        ])
      ];
      const driverSheet = XLSX.utils.aoa_to_sheet(driverData);
      XLSX.utils.book_append_sheet(wb, driverSheet, 'By Driver');

      // Truck Report Sheet
      const truckData = [
        ['Truck', 'Trips', 'KM', 'Revenue (ZAR)', 'Revenue (USD)', 'Expenses (ZAR)', 'Expenses (USD)', 'Profit (ZAR)', 'Profit (USD)'],
        ...truckSummaries.map(t => [
          t.fleetNumber, t.tripCount, t.totalKm,
          t.revenue.ZAR, t.revenue.USD, t.expenses.ZAR, t.expenses.USD, t.profit.ZAR, t.profit.USD
        ])
      ];
      const truckSheet = XLSX.utils.aoa_to_sheet(truckData);
      XLSX.utils.book_append_sheet(wb, truckSheet, 'By Truck');

      // Weekly Report Sheet
      const weeklyData = [
        ['Week', 'Year', 'Trips', 'KM', 'Revenue (ZAR)', 'Revenue (USD)', 'Expenses (ZAR)', 'Expenses (USD)', 'Profit (ZAR)', 'Profit (USD)'],
        ...weeklySummaries.map(w => [
          w.weekNumber, w.year, w.tripCount, w.totalKm,
          w.revenue.ZAR, w.revenue.USD, w.expenses.ZAR, w.expenses.USD, w.profit.ZAR, w.profit.USD
        ])
      ];
      const weeklySheet = XLSX.utils.aoa_to_sheet(weeklyData);
      XLSX.utils.book_append_sheet(wb, weeklySheet, 'Weekly');

      // Monthly Report Sheet
      const monthlyData = [
        ['Month', 'Year', 'Trips', 'KM', 'Revenue (ZAR)', 'Revenue (USD)', 'Expenses (ZAR)', 'Expenses (USD)', 'Profit (ZAR)', 'Profit (USD)'],
        ...monthlySummaries.map(m => [
          m.monthName, m.year, m.tripCount, m.totalKm,
          m.revenue.ZAR, m.revenue.USD, m.expenses.ZAR, m.expenses.USD, m.profit.ZAR, m.profit.USD
        ])
      ];
      const monthlySheet = XLSX.utils.aoa_to_sheet(monthlyData);
      XLSX.utils.book_append_sheet(wb, monthlySheet, 'Monthly');

      // Route Report Sheet
      const routeData = [
        ['Route', 'Origin', 'Destination', 'Trips', 'Revenue (ZAR)', 'Revenue (USD)', 'Expenses (ZAR)', 'Expenses (USD)', 'Profit (ZAR)', 'Profit (USD)'],
        ...routeSummaries.map(r => [
          r.route, r.origin, r.destination, r.tripCount,
          r.revenue.ZAR, r.revenue.USD, r.expenses.ZAR, r.expenses.USD, r.profit.ZAR, r.profit.USD
        ])
      ];
      const routeSheet = XLSX.utils.aoa_to_sheet(routeData);
      XLSX.utils.book_append_sheet(wb, routeSheet, 'By Route');

      // Save file
      XLSX.writeFile(wb, `Trip_Reports_${selectedPeriod}_${new Date().toISOString().split('T')[0]}.xlsx`);

      toast({
        title: 'Export Successful',
        description: 'Trip reports have been exported to Excel.',
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: 'Export Failed',
        description: 'Unable to export reports. Please try again.',
        variant: 'destructive',
      });
    }
  }, [selectedPeriod, overallStats, weeklySummaries, monthlySummaries, driverSummaries, clientSummaries, routeSummaries, truckSummaries, toast]);

  return (
    <div className="space-y-5">
      {/* Glass Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-card/80 backdrop-blur-sm border border-border/60 rounded-xl px-5 py-3.5 shadow-sm">
        <span className="text-sm font-medium text-muted-foreground">Performance insights for {filteredTrips.length} trips</span>
        <div className="flex items-center gap-2.5">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[180px] h-9 text-sm bg-background/80 border-border/50 rounded-lg">
              <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1month">Last Month</SelectItem>
              <SelectItem value="3months">Last 3 Months</SelectItem>
              <SelectItem value="6months">Last 6 Months</SelectItem>
              <SelectItem value="1year">Last Year</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={exportToExcel} className="h-9 gap-2 text-sm text-muted-foreground hover:text-foreground">
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Overall Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-card/80 backdrop-blur-sm border border-border/60 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Truck className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Trips</p>
              <p className="text-xl font-bold tabular-nums">{overallStats.totalTrips}</p>
            </div>
          </div>
        </div>

        <div className="bg-card/80 backdrop-blur-sm border border-border/60 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Revenue</p>
              <p className="text-lg font-bold text-emerald-600 tabular-nums">{formatCurrency(overallStats.revenue.ZAR, 'ZAR')}</p>
              {overallStats.revenue.USD > 0 && (
                <p className="text-sm font-semibold text-emerald-600/70 tabular-nums">{formatCurrency(overallStats.revenue.USD, 'USD')}</p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-card/80 backdrop-blur-sm border border-border/60 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
              <TrendingDown className="h-5 w-5 text-rose-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Expenses</p>
              <p className="text-lg font-bold text-rose-600 tabular-nums">{formatCurrency(overallStats.expenses.ZAR, 'ZAR')}</p>
              {overallStats.expenses.USD > 0 && (
                <p className="text-sm font-semibold text-rose-600/70 tabular-nums">{formatCurrency(overallStats.expenses.USD, 'USD')}</p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-card/80 backdrop-blur-sm border border-border/60 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className={cn(
              "h-10 w-10 rounded-xl flex items-center justify-center",
              overallStats.profit.ZAR >= 0 ? "bg-emerald-500/10" : "bg-orange-500/10"
            )}>
              {overallStats.profit.ZAR >= 0 ? (
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              ) : (
                <TrendingDown className="h-5 w-5 text-orange-600" />
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Net Profit (ZAR)</p>
              <p className={cn(
                "text-lg font-bold tabular-nums",
                overallStats.profit.ZAR >= 0 ? "text-emerald-600" : "text-orange-600"
              )}>{formatCurrency(overallStats.profit.ZAR, 'ZAR')}</p>
              {overallStats.hasUSD && (
                <p className={cn(
                  "text-sm font-semibold tabular-nums",
                  overallStats.profit.USD >= 0 ? "text-emerald-600/70" : "text-orange-600/70"
                )}>{formatCurrency(overallStats.profit.USD, 'USD')}</p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-card/80 backdrop-blur-sm border border-border/60 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
              <MapPin className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total KM</p>
              <p className="text-lg font-bold tabular-nums">{overallStats.totalKm.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Reports Tabs */}
      <Tabs defaultValue="monthly" className="space-y-4">
        <TabsList className="bg-card/80 backdrop-blur-sm border border-border/60 rounded-xl p-1.5 shadow-sm h-auto inline-flex">
          <TabsTrigger value="monthly" className="rounded-lg px-3.5 py-2 text-sm font-medium">Monthly</TabsTrigger>
          <TabsTrigger value="weekly" className="rounded-lg px-3.5 py-2 text-sm font-medium">Weekly</TabsTrigger>
          <TabsTrigger value="trucks" className="rounded-lg px-3.5 py-2 text-sm font-medium">Trucks</TabsTrigger>
          <TabsTrigger value="drivers" className="rounded-lg px-3.5 py-2 text-sm font-medium">Drivers</TabsTrigger>
          <TabsTrigger value="clients" className="rounded-lg px-3.5 py-2 text-sm font-medium">Clients</TabsTrigger>
          <TabsTrigger value="routes" className="rounded-lg px-3.5 py-2 text-sm font-medium">Routes</TabsTrigger>
        </TabsList>

        {/* Monthly Summary Tab */}
        <TabsContent value="monthly" className="space-y-4">
          <div className="bg-card/80 backdrop-blur-sm border border-border/60 rounded-xl shadow-sm">
            <div className="px-5 py-4 border-b border-border/60">
              <h3 className="font-semibold flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Monthly Performance Summary
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5">Revenue, expenses and profit breakdown by month</p>
            </div>
            <div className="p-5">
              {monthlySummaries.length > 0 ? (
                <div className="space-y-4">
                  {monthlySummaries.map((month) => {
                    return (
                      <div key={month.monthKey} className="p-4 rounded-xl border border-border/50 bg-card/60 hover:bg-accent/50 transition-colors">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                              <Calendar className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-lg">{month.monthName} {month.year}</h3>
                              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                <span>{month.tripCount} trips</span>
                                <Badge variant="outline" className="text-xs">{month.completedTrips} completed</Badge>
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 lg:gap-6">
                            <div className="text-center lg:text-right">
                              <p className="text-xs text-muted-foreground">Revenue</p>
                              <CurrencyDisplay amounts={month.revenue} type="revenue" />
                            </div>
                            <div className="text-center lg:text-right">
                              <p className="text-xs text-muted-foreground">Expenses</p>
                              <CurrencyDisplay amounts={month.expenses} type="expense" />
                            </div>
                            <div className="text-center lg:text-right">
                              <p className="text-xs text-muted-foreground">Profit</p>
                              <CurrencyDisplay amounts={month.profit} type="profit" />
                            </div>
                          </div>
                        </div>
                        {month.revenue.ZAR > 0 && (
                          <div className="mt-3">
                            <Progress
                              value={Math.min(100, Math.max(0, (month.profit.ZAR / month.revenue.ZAR) * 100))}
                              className={cn("h-2", month.profit.ZAR >= 0 ? "[&>div]:bg-emerald-500" : "[&>div]:bg-orange-500")}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No trip data available for the selected period</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Weekly Summary Tab */}
        <TabsContent value="weekly" className="space-y-4">
          <div className="bg-card/80 backdrop-blur-sm border border-border/60 rounded-xl shadow-sm">
            <div className="px-5 py-4 border-b border-border/60">
              <h3 className="font-semibold flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Weekly Performance Summary
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5">Detailed week-by-week breakdown</p>
            </div>
            <div className="p-5">
              {weeklySummaries.length > 0 ? (
                <div className="space-y-3">
                  {weeklySummaries.slice(0, 12).map((week) => (
                    <div key={week.weekKey} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 rounded-xl border border-border/50 hover:bg-accent/50 transition-colors gap-3">
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="font-mono">W{week.weekNumber}</Badge>
                        <div>
                          <p className="font-medium">{week.startDate} - {week.endDate}</p>
                          <p className="text-sm text-muted-foreground">{week.tripCount} trips • {week.totalKm.toLocaleString()} km</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 sm:gap-6">
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Revenue</p>
                          <CurrencyDisplay amounts={week.revenue} type="revenue" />
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Profit</p>
                          <CurrencyDisplay amounts={week.profit} type="profit" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No weekly data available</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Trucks Tab */}
        <TabsContent value="trucks" className="space-y-4">
          <TruckReportsTab trips={filteredTrips} costEntries={costEntries} />
        </TabsContent>

        {/* Drivers Tab */}
        <TabsContent value="drivers" className="space-y-4">
          <div className="bg-card/80 backdrop-blur-sm border border-border/60 rounded-xl shadow-sm">
            <div className="px-5 py-4 border-b border-border/60">
              <h3 className="font-semibold flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Driver Performance Report
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5">Revenue and profit contribution by driver</p>
            </div>
            <div className="p-5">
              {driverSummaries.length > 0 ? (
                <div className="space-y-3">
                  {driverSummaries.map((driver, index) => (
                    <div key={driver.driverName} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 rounded-xl border border-border/50 hover:bg-accent/50 transition-colors gap-3">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center font-bold text-primary tabular-nums">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-semibold">{driver.driverName}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{driver.tripCount} trips</span>
                            <span>•</span>
                            <span>{driver.totalKm.toLocaleString()} km</span>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 sm:gap-6">
                        <div className="text-center sm:text-right">
                          <p className="text-xs text-muted-foreground">Revenue</p>
                          <CurrencyDisplay amounts={driver.revenue} type="revenue" />
                        </div>
                        <div className="text-center sm:text-right">
                          <p className="text-xs text-muted-foreground">Expenses</p>
                          <CurrencyDisplay amounts={driver.expenses} type="expense" />
                        </div>
                        <div className="text-center sm:text-right">
                          <p className="text-xs text-muted-foreground">Profit</p>
                          <CurrencyDisplay amounts={driver.profit} type="profit" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No driver data available</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Clients Tab */}
        <TabsContent value="clients" className="space-y-4">
          <div className="bg-card/80 backdrop-blur-sm border border-border/60 rounded-xl shadow-sm">
            <div className="px-5 py-4 border-b border-border/60">
              <h3 className="font-semibold flex items-center gap-2">
                <Building className="h-5 w-5 text-primary" />
                Client Revenue Report
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5">Revenue breakdown by client</p>
            </div>
            <div className="p-5">
              {clientSummaries.length > 0 ? (
                <div className="space-y-6">
                  {(() => {
                    const INTERNAL_CLIENTS = ['Marketing', 'Burma Valley', 'Nyamagaya', 'Marketing Export'];

                    const internalClients = clientSummaries.filter(c =>
                      INTERNAL_CLIENTS.some(ic => c.clientName.toLowerCase() === ic.toLowerCase())
                    );
                    const emptyKmClients = clientSummaries.filter(c =>
                      c.clientName.toLowerCase().includes('empty') && c.clientName.toLowerCase().includes('km')
                    );
                    const thirdPartyClients = clientSummaries.filter(c =>
                      !INTERNAL_CLIENTS.some(ic => c.clientName.toLowerCase() === ic.toLowerCase()) &&
                      !(c.clientName.toLowerCase().includes('empty') && c.clientName.toLowerCase().includes('km'))
                    );

                    const getCategorySummary = (clients: ClientSummary[]) => {
                      const totals = clients.reduce(
                        (acc, c) => ({
                          trips: acc.trips + c.tripCount,
                          revenueZAR: acc.revenueZAR + c.revenue.ZAR,
                          revenueUSD: acc.revenueUSD + c.revenue.USD,
                          totalKm: acc.totalKm + c.totalKm,
                          emptyKm: acc.emptyKm + c.emptyKm,
                        }),
                        { trips: 0, revenueZAR: 0, revenueUSD: 0, totalKm: 0, emptyKm: 0 }
                      );
                      return totals;
                    };

                    const renderCategoryHeader = (title: string, color: string, clients: ClientSummary[]) => {
                      const summary = getCategorySummary(clients);
                      return (
                        <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 rounded-xl border ${color}`}>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-sm uppercase tracking-wide">{title}</h3>
                            <span className="text-xs text-muted-foreground">({summary.trips} trips)</span>
                          </div>
                          <div className="flex items-center gap-4 mt-1 sm:mt-0 text-xs">
                            <span className="font-medium text-green-700">
                              Revenue: {summary.revenueUSD > 0 ? `$${summary.revenueUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : ''}
                              {summary.revenueUSD > 0 && summary.revenueZAR > 0 ? ' + ' : ''}
                              {summary.revenueZAR > 0 ? `R${summary.revenueZAR.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : ''}
                              {summary.revenueUSD === 0 && summary.revenueZAR === 0 ? '$0.00' : ''}
                            </span>
                            <span className="text-gray-600">{summary.totalKm.toLocaleString()} km</span>
                            {summary.emptyKm > 0 && (
                              <span className="text-amber-600">{summary.emptyKm.toLocaleString()} km empty</span>
                            )}
                          </div>
                        </div>
                      );
                    };

                    const renderClientRow = (client: ClientSummary) => (
                      <div key={client.clientName} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 rounded-xl border border-border/50 hover:bg-accent/50 transition-colors gap-3">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Building className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold">{client.clientName}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>{client.tripCount} trips</span>
                              <span>•</span>
                              <span>{client.totalKm.toLocaleString()} km</span>
                              {client.emptyKm > 0 && (
                                <>
                                  <span>•</span>
                                  <span className="text-amber-600">{client.emptyKm.toLocaleString()} km empty</span>
                                </>
                              )}
                              {client.lastTripDate && (
                                <>
                                  <span>•</span>
                                  <span>Last: {formatDate(client.lastTripDate)}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4 sm:gap-6">
                          <div className="text-center sm:text-right">
                            <p className="text-xs text-muted-foreground">Revenue</p>
                            <CurrencyDisplay amounts={client.revenue} type="revenue" />
                          </div>
                          <div className="text-center sm:text-right">
                            <p className="text-xs text-muted-foreground">Expenses</p>
                            <CurrencyDisplay amounts={client.expenses} type="expense" />
                          </div>
                          <div className="text-center sm:text-right">
                            <p className="text-xs text-muted-foreground">Profit</p>
                            <CurrencyDisplay amounts={client.profit} type="profit" />
                          </div>
                        </div>
                      </div>
                    );

                    return (
                      <>
                        {/* INTERNAL Section */}
                        {renderCategoryHeader('Internal', 'border-blue-400/30 bg-blue-500/5', internalClients)}
                        <div className="space-y-2 pl-2">
                          {internalClients.length > 0 ? (
                            internalClients.map(renderClientRow)
                          ) : (
                            <p className="text-sm text-muted-foreground pl-4 py-2">No internal client trips in this period</p>
                          )}
                        </div>

                        {/* THIRD PARTY Section */}
                        {renderCategoryHeader('Third Party', 'border-violet-400/30 bg-violet-500/5', thirdPartyClients)}
                        <div className="space-y-2 pl-2">
                          {thirdPartyClients.length > 0 ? (
                            thirdPartyClients.map(renderClientRow)
                          ) : (
                            <p className="text-sm text-muted-foreground pl-4 py-2">No third party client trips in this period</p>
                          )}
                        </div>

                        {/* EMPTY KM Section */}
                        {renderCategoryHeader('Empty KM', 'border-amber-400/30 bg-amber-500/5', emptyKmClients)}
                        <div className="space-y-2 pl-2">
                          {emptyKmClients.length > 0 ? (
                            emptyKmClients.map(renderClientRow)
                          ) : (
                            <p className="text-sm text-muted-foreground pl-4 py-2">No empty KM trips in this period</p>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Building className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No client data available</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Routes Tab */}
        <TabsContent value="routes" className="space-y-4">
          <div className="bg-card/80 backdrop-blur-sm border border-border/60 rounded-xl shadow-sm">
            <div className="px-5 py-4 border-b border-border/60">
              <h3 className="font-semibold flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Route Profitability Report
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5">Performance analysis by route</p>
            </div>
            <div className="p-5">
              {routeSummaries.length > 0 ? (
                <div className="space-y-3">
                  {routeSummaries.slice(0, 15).map((route) => (
                    <div key={route.route} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 rounded-xl border border-border/50 hover:bg-accent/50 transition-colors gap-3">
                      <div className="flex items-center gap-3">
                        <MapPin className="h-5 w-5 text-muted-foreground shrink-0" />
                        <div>
                          <p className="font-semibold">{route.route}</p>
                          <p className="text-sm text-muted-foreground">{route.tripCount} trips</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 sm:gap-6">
                        <div className="text-center sm:text-right">
                          <p className="text-xs text-muted-foreground">Revenue</p>
                          <CurrencyDisplay amounts={route.revenue} type="revenue" />
                        </div>
                        <div className="text-center sm:text-right">
                          <p className="text-xs text-muted-foreground">Expenses</p>
                          <CurrencyDisplay amounts={route.expenses} type="expense" />
                        </div>
                        <div className="text-center sm:text-right">
                          <p className="text-xs text-muted-foreground">Profit</p>
                          <CurrencyDisplay amounts={route.profit} type="profit" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No route data available</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TripReportsSection;