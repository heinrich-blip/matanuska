import DieselDebriefModal from '@/components/diesel/DieselDebriefModal';
import DieselImportModal from '@/components/diesel/DieselImportModal';
import DieselNormsModal from '@/components/diesel/DieselNormsModal';
import DieselTransactionViewModal from '@/components/diesel/DieselTransactionViewModal';
import ManualDieselEntryModal from '@/components/diesel/ManualDieselEntryModal';
import ProbeVerificationModal from '@/components/diesel/ProbeVerificationModal';
import ReeferDieselTab from '@/components/diesel/ReeferDieselTab';
import ReeferLinkageModal from '@/components/diesel/ReeferLinkageModal';
import TripLinkageModal from '@/components/diesel/TripLinkageModal';
import Layout from '@/components/Layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useOperations } from '@/contexts/OperationsContext';
import { useReeferDieselRecords, type ReeferDieselRecordRow } from '@/hooks/useReeferDiesel';
import { generateDieselDebriefPDF, generateFleetDebriefSummaryPDF, generateSelectedTransactionsPDF } from '@/lib/dieselDebriefExport';
import { generateAllFleetsDieselExcel, generateAllFleetsDieselPDF, generateFleetDieselExcel, generateFleetDieselPDF, type DieselExportRecord } from '@/lib/dieselFleetExport';
import { formatCurrency, formatDate, formatNumber } from '@/lib/formatters';
import type { DieselConsumptionRecord, DieselNorms } from '@/types/operations';
import { AlertCircle, BarChart3, CheckCircle, ChevronDown, ChevronRight, Download, Edit, Eye, FileSpreadsheet, FileText, Filter, Fuel, Link, Plus, Settings, Snowflake, Trash2, Truck, Upload, User } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

// Report data types
interface DriverReport {
  driver: string;
  totalLitres: number;
  totalCostZAR: number;
  totalCostUSD: number;
  totalDistance: number;
  avgKmPerLitre: number;
  fillCount: number;
  lastFillDate: string;
}

interface ReeferDriverReport {
  driver: string;
  totalLitres: number;
  totalCostZAR: number;
  totalCostUSD: number;
  fillCount: number;
  lastFillDate: string;
  fleets: string[];
}

interface FleetReport {
  fleet: string;
  totalLitres: number;
  totalCostZAR: number;
  totalCostUSD: number;
  totalDistance: number;
  avgKmPerLitre: number;
  fillCount: number;
  drivers: string[];
}

interface ReeferFleetReport {
  fleet: string;
  totalLitres: number;
  totalCostZAR: number;
  totalCostUSD: number;
  fillCount: number;
  drivers: string[];
}

interface StationReport {
  station: string;
  totalLitres: number;
  totalCostZAR: number;
  totalCostUSD: number;
  avgCostPerLitre: number;
  fillCount: number;
  fleetsServed: string[];
}

interface WeeklyFleetData {
  fleet: string;
  totalLitres: number;
  totalKm: number;
  consumption: number | null; // km/L for trucks
  totalCostZAR: number;
  totalCostUSD: number;
}

interface WeeklySectionData {
  name: string;
  fleets: string[];
  isReeferSection: boolean; // Reefers use L/H instead of km/L
  data: WeeklyFleetData[];
  sectionTotal: { totalLitres: number; totalKm: number; consumption: number | null; totalCostZAR: number; totalCostUSD: number };
}

interface WeeklyReport {
  weekNumber: number;
  weekLabel: string;
  weekStart: string;
  weekEnd: string;
  sections: WeeklySectionData[];
  grandTotal: { totalLitres: number; totalKm: number; consumption: number | null; totalCostZAR: number; totalCostUSD: number };
}

// Fleet category definitions
const FLEET_CATEGORIES = {
  '30 Ton Trucks': ['21H', '22H', '23H', '24H', '26H', '28H', '31H', '32H', '33H', '34H'],
  'Reefers (L/H)': ['4F', '5F', '6F', '7F', '8F', '9F'],
  'Farm Lmv': ['1H', '4H', '6H'],
  'Bulawayo Truck': ['29H'],
  'Nyamagay Truck': ['30H'],
};

const REEFER_SECTION_NAME = 'Reefers (L/H)';
const isReeferFleet = (fleet?: string | null) => !!fleet && fleet.toUpperCase().trim().endsWith('F');

const getWeekNumberForDateString = (dateStr: string): number => {
  const date = new Date(dateStr);
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  return Math.ceil((days + startOfYear.getDay() + 1) / 7);
};

const DieselManagement = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [fleetFilter, _setFleetFilter] = useState<string>('');
  const [weekFilter, _setWeekFilter] = useState<string>('');
  const [reportType, setReportType] = useState<'driver' | 'fleet' | 'station' | 'weekly'>('fleet');
  const {
    dieselRecords,
    trips,
    dieselNorms,
    addDieselRecord,
    updateDieselRecord,
    deleteDieselRecord,
    linkDieselToTrip,
    unlinkDieselFromTrip,
    addDieselNorm,
    updateDieselNorm,
    deleteDieselNorm,
  } = useOperations();

  const truckRecords = useMemo(
    () => dieselRecords.filter(record => !isReeferFleet(record.fleet_number)),
    [dieselRecords]
  );
  const reeferRecords = useMemo(
    () => dieselRecords.filter(record => isReeferFleet(record.fleet_number)),
    [dieselRecords]
  );
  const reeferFleetNumbers = useMemo(() => {
    const fleets = new Set(reeferRecords.map(r => r.fleet_number).filter(Boolean));
    return Array.from(fleets).sort();
  }, [reeferRecords]);

  // Modal states
  const [isManualEntryOpen, setIsManualEntryOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isTripLinkageOpen, setIsTripLinkageOpen] = useState(false);
  const [isProbeVerificationOpen, setIsProbeVerificationOpen] = useState(false);
  const [isDebriefOpen, setIsDebriefOpen] = useState(false);
  const [isNormsModalOpen, setIsNormsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isReeferLinkageOpen, setIsReeferLinkageOpen] = useState(false);

  // Selected records
  const [selectedRecord, setSelectedRecord] = useState<DieselConsumptionRecord | null>(null);
  const [selectedNorm, setSelectedNorm] = useState<DieselNorms | null>(null);

  // UI state for expanded fleet/week sections
  const [expandedFleets, setExpandedFleets] = useState<Set<string>>(new Set());
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());
  const [expandedReportWeeks, setExpandedReportWeeks] = useState<Set<string>>(new Set());

  // Toggle week expansion in weekly report
  const toggleReportWeekExpanded = (weekKey: string) => {
    setExpandedReportWeeks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(weekKey)) {
        newSet.delete(weekKey);
      } else {
        newSet.add(weekKey);
      }
      return newSet;
    });
  };

  // Linked reefer records for view modal
  const [linkedReeferRecords, setLinkedReeferRecords] = useState<ReeferDieselRecordRow[]>([]);

  // Fetch reefer records linked to selected record (for view modal)
  const { records: allReeferRecords } = useReeferDieselRecords({});

  // Update linked reefer records when selected record changes
  useEffect(() => {
    if (selectedRecord?.id && allReeferRecords.length > 0) {
      const linked = allReeferRecords.filter(
        (r) => r.linked_diesel_record_id === selectedRecord.id
      );
      setLinkedReeferRecords(linked);
    } else {
      setLinkedReeferRecords([]);
    }
  }, [selectedRecord?.id, allReeferRecords]);

  // Debrief fleet filter for PDF export
  const [debriefFleetFilter, setDebriefFleetFilter] = useState<string>('');

  // Calculate summary statistics (trucks)
  const totalRecords = truckRecords.length;
  const totalLitres = truckRecords.reduce((sum, record) => sum + (record.litres_filled || 0), 0);

  // Calculate costs by currency
  const totalCostZAR = truckRecords
    .filter(r => (r.currency || 'ZAR') === 'ZAR')
    .reduce((sum, record) => sum + (record.total_cost || 0), 0);
  const totalCostUSD = truckRecords
    .filter(r => r.currency === 'USD')
    .reduce((sum, record) => sum + (record.total_cost || 0), 0);

  const totalDistance = truckRecords.reduce((sum, record) => sum + (record.distance_travelled || 0), 0);
  const averageKmPerLitre = totalDistance && totalLitres
    ? totalDistance / totalLitres
    : 0;

  // Reefer summary statistics
  const reeferTotalRecords = reeferRecords.length;
  const reeferTotalLitres = reeferRecords.reduce((sum, record) => sum + (record.litres_filled || 0), 0);
  const reeferTotalCostZAR = reeferRecords
    .filter(r => (r.currency || 'ZAR') === 'ZAR')
    .reduce((sum, record) => sum + (record.total_cost || 0), 0);
  const reeferTotalCostUSD = reeferRecords
    .filter(r => r.currency === 'USD')
    .reduce((sum, record) => sum + (record.total_cost || 0), 0);

  // Helper: Calculate km per litre for a record
  const calculateKmPerLitre = (record: DieselConsumptionRecord): number | null => {
    if (isReeferFleet(record.fleet_number)) return null;
    if (!record.distance_travelled || !record.litres_filled) return null;
    return record.distance_travelled / record.litres_filled;
  };

  // Helper: Get norm for a fleet number
  const getNormForFleet = (fleetNumber: string): DieselNorms | undefined => {
    return dieselNorms.find(norm => norm.fleet_number === fleetNumber);
  };

  // Helper: Check if consumption is BELOW acceptable range (poor efficiency requiring debrief)
  // Only low km/L (poor efficiency) triggers debrief - high km/L is good performance
  const isOutsideNorm = (kmPerLitre: number, norm: DieselNorms | undefined): boolean => {
    if (!norm) return false;
    return kmPerLitre < norm.min_acceptable;
  };

  // Helper: Get variance from expected norm
  const _getVarianceFromNorm = (kmPerLitre: number, norm: DieselNorms | undefined): number | null => {
    if (!norm) return null;
    const variance = ((kmPerLitre - norm.expected_km_per_litre) / norm.expected_km_per_litre) * 100;
    return variance;
  };

  // Calculate records requiring debrief based on norms
  const recordsRequiringDebrief = truckRecords.filter(record => {
    const kmPerLitre = calculateKmPerLitre(record);
    if (!kmPerLitre) return false;
    const norm = getNormForFleet(record.fleet_number);
    return isOutsideNorm(kmPerLitre, norm) && !record.debrief_signed;
  });

  // Count of debriefed vs pending
  const debriefStats = {
    total: recordsRequiringDebrief.length,
    pending: recordsRequiringDebrief.filter(r => !r.debrief_signed).length,
    completed: truckRecords.filter(r => r.debrief_signed).length,
  };

  // Get current week number
  const getCurrentWeekNumber = (): number => {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
    return Math.ceil((days + startOfYear.getDay() + 1) / 7);
  };

  const currentWeek = getCurrentWeekNumber();

  // Generate week options (1-52)
  const _weekOptions = useMemo(() => {
    return Array.from({ length: 52 }, (_, i) => i + 1);
  }, []);

  // Filter diesel records by fleet and week
  const _filteredDieselRecords = useMemo(() => {
    let filtered = dieselRecords;
    if (fleetFilter) {
      filtered = filtered.filter(record => record.fleet_number === fleetFilter);
    }
    if (weekFilter) {
      const weekNum = parseInt(weekFilter);
      filtered = filtered.filter(record => getWeekNumberForDateString(record.date) === weekNum);
    }
    return filtered;
  }, [dieselRecords, fleetFilter, weekFilter]);

  // Get unique fleet numbers from records for filter dropdown
  const uniqueFleetNumbers = useMemo(() => {
    const fleets = new Set(truckRecords.map(r => r.fleet_number));
    return Array.from(fleets).sort();
  }, [truckRecords]);

  // Helper: Get week date range string (e.g., "Jan 27 - Feb 2")
  const getWeekDateRange = (weekNum: number, year: number = new Date().getFullYear()): string => {
    const jan1 = new Date(year, 0, 1);
    const daysToFirstMonday = (8 - jan1.getDay()) % 7;
    const firstWeekStart = new Date(year, 0, 1 + daysToFirstMonday - 7);
    const weekStart = new Date(firstWeekStart);
    weekStart.setDate(weekStart.getDate() + (weekNum - 1) * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const formatShort = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${formatShort(weekStart)} - ${formatShort(weekEnd)}`;
  };

  const groupRecordsByFleetAndWeek = useCallback((records: DieselConsumptionRecord[]) => {
    const grouped: Record<string, Record<number, DieselConsumptionRecord[]>> = {};

    records.forEach(record => {
      const fleet = record.fleet_number;
      const week = getWeekNumberForDateString(record.date);

      if (!grouped[fleet]) {
        grouped[fleet] = {};
      }
      if (!grouped[fleet][week]) {
        grouped[fleet][week] = [];
      }
      grouped[fleet][week].push(record);
    });

    // Sort records within each week by date descending
    Object.keys(grouped).forEach(fleet => {
      Object.keys(grouped[fleet]).forEach(weekStr => {
        const week = parseInt(weekStr);
        grouped[fleet][week].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      });
    });

    return grouped;
  }, []);

  // Group records by fleet, then by week
  const truckRecordsGroupedByFleetAndWeek = useMemo(
    () => groupRecordsByFleetAndWeek(truckRecords),
    [groupRecordsByFleetAndWeek, truckRecords]
  );
  const reeferRecordsGroupedByFleetAndWeek = useMemo(
    () => groupRecordsByFleetAndWeek(reeferRecords),
    [groupRecordsByFleetAndWeek, reeferRecords]
  );

  // Get sorted fleet list
  const sortedFleets = useMemo(() => {
    return Object.keys(truckRecordsGroupedByFleetAndWeek).sort();
  }, [truckRecordsGroupedByFleetAndWeek]);
  const sortedReeferFleets = useMemo(() => {
    return Object.keys(reeferRecordsGroupedByFleetAndWeek).sort();
  }, [reeferRecordsGroupedByFleetAndWeek]);

  // Toggle fleet expansion
  const toggleFleetExpanded = (fleet: string) => {
    setExpandedFleets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fleet)) {
        newSet.delete(fleet);
      } else {
        newSet.add(fleet);
      }
      return newSet;
    });
  };

  // Toggle week expansion
  const toggleWeekExpanded = (key: string) => {
    setExpandedWeeks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  // Calculate fleet totals
  const getFleetTotals = (
    groupedRecords: Record<string, Record<number, DieselConsumptionRecord[]>>,
    fleet: string
  ) => {
    const fleetRecords = Object.values(groupedRecords[fleet] || {}).flat();
    const totalLitres = fleetRecords.reduce((sum, r) => sum + (r.litres_filled || 0), 0);
    const totalCostZAR = fleetRecords.reduce((sum, r) => sum + ((r.currency || 'ZAR') === 'ZAR' ? (r.total_cost || 0) : 0), 0);
    const totalCostUSD = fleetRecords.reduce((sum, r) => sum + (r.currency === 'USD' ? (r.total_cost || 0) : 0), 0);
    const totalDistance = fleetRecords.reduce((sum, r) => sum + (r.distance_travelled || 0), 0);
    const isReefer = isReeferFleet(fleet);
    const avgKmL = !isReefer && totalLitres > 0 ? totalDistance / totalLitres : 0;
    // Calculate pending debrief dynamically based on norms instead of using stored requires_debrief
    const pendingDebrief = isReefer ? 0 : fleetRecords.filter(r => {
      if (r.debrief_signed) return false; // Already debriefed
      const kmPerLitre = calculateKmPerLitre(r);
      if (!kmPerLitre) return false;
      const norm = getNormForFleet(r.fleet_number);
      return isOutsideNorm(kmPerLitre, norm);
    }).length;
    return { totalLitres, totalCostZAR, totalCostUSD, totalDistance, avgKmL, count: fleetRecords.length, pendingDebrief };
  };

  // Calculate week totals for a fleet
  const getWeekTotals = (records: DieselConsumptionRecord[], isReefer = false) => {
    const totalLitres = records.reduce((sum, r) => sum + (r.litres_filled || 0), 0);
    const totalCostZAR = records.reduce((sum, r) => sum + ((r.currency || 'ZAR') === 'ZAR' ? (r.total_cost || 0) : 0), 0);
    const totalCostUSD = records.reduce((sum, r) => sum + (r.currency === 'USD' ? (r.total_cost || 0) : 0), 0);
    const totalDistance = records.reduce((sum, r) => sum + (r.distance_travelled || 0), 0);
    const avgKmL = !isReefer && totalLitres > 0 ? totalDistance / totalLitres : 0;
    // Calculate pending debrief dynamically based on norms instead of using stored requires_debrief
    const pendingDebrief = isReefer ? 0 : records.filter(r => {
      if (r.debrief_signed) return false; // Already debriefed
      const kmPerLitre = calculateKmPerLitre(r);
      if (!kmPerLitre) return false;
      const norm = getNormForFleet(r.fleet_number);
      return isOutsideNorm(kmPerLitre, norm);
    }).length;
    return { totalLitres, totalCostZAR, totalCostUSD, totalDistance, avgKmL, count: records.length, pendingDebrief };
  };

  // Generate reports by driver
  const driverReports = useMemo((): DriverReport[] => {
    const driverMap = new Map<string, DriverReport>();

    truckRecords.forEach(record => {
      const driver = record.driver_name || 'Unknown Driver';
      const existing = driverMap.get(driver);

      if (existing) {
        existing.totalLitres += record.litres_filled || 0;
        existing.totalCostZAR += (record.currency || 'ZAR') === 'ZAR' ? (record.total_cost || 0) : 0;
        existing.totalCostUSD += record.currency === 'USD' ? (record.total_cost || 0) : 0;
        existing.totalDistance += record.distance_travelled || 0;
        existing.fillCount += 1;
        if (record.date > existing.lastFillDate) existing.lastFillDate = record.date;
      } else {
        driverMap.set(driver, {
          driver,
          totalLitres: record.litres_filled || 0,
          totalCostZAR: (record.currency || 'ZAR') === 'ZAR' ? (record.total_cost || 0) : 0,
          totalCostUSD: record.currency === 'USD' ? (record.total_cost || 0) : 0,
          totalDistance: record.distance_travelled || 0,
          avgKmPerLitre: 0,
          fillCount: 1,
          lastFillDate: record.date,
        });
      }
    });

    // Calculate averages
    driverMap.forEach(report => {
      report.avgKmPerLitre = report.totalLitres > 0 ? report.totalDistance / report.totalLitres : 0;
    });

    return Array.from(driverMap.values()).sort((a, b) => b.totalLitres - a.totalLitres);
  }, [truckRecords]);

  const reeferDriverReports = useMemo((): ReeferDriverReport[] => {
    const driverMap = new Map<string, ReeferDriverReport>();

    reeferRecords.forEach(record => {
      const driver = record.driver_name || 'Unknown Driver';
      const existing = driverMap.get(driver);
      const fleet = record.fleet_number;

      if (existing) {
        existing.totalLitres += record.litres_filled || 0;
        existing.totalCostZAR += (record.currency || 'ZAR') === 'ZAR' ? (record.total_cost || 0) : 0;
        existing.totalCostUSD += record.currency === 'USD' ? (record.total_cost || 0) : 0;
        existing.fillCount += 1;
        if (record.date > existing.lastFillDate) existing.lastFillDate = record.date;
        if (fleet && !existing.fleets.includes(fleet)) existing.fleets.push(fleet);
      } else {
        driverMap.set(driver, {
          driver,
          totalLitres: record.litres_filled || 0,
          totalCostZAR: (record.currency || 'ZAR') === 'ZAR' ? (record.total_cost || 0) : 0,
          totalCostUSD: record.currency === 'USD' ? (record.total_cost || 0) : 0,
          fillCount: 1,
          lastFillDate: record.date,
          fleets: fleet ? [fleet] : [],
        });
      }
    });

    return Array.from(driverMap.values()).sort((a, b) => b.totalLitres - a.totalLitres);
  }, [reeferRecords]);

  // Generate reports by fleet
  const fleetReports = useMemo((): FleetReport[] => {
    const fleetMap = new Map<string, FleetReport>();

    truckRecords.forEach(record => {
      const fleet = record.fleet_number;
      const existing = fleetMap.get(fleet);
      const driver = record.driver_name || 'Unknown';

      if (existing) {
        existing.totalLitres += record.litres_filled || 0;
        existing.totalCostZAR += (record.currency || 'ZAR') === 'ZAR' ? (record.total_cost || 0) : 0;
        existing.totalCostUSD += record.currency === 'USD' ? (record.total_cost || 0) : 0;
        existing.totalDistance += record.distance_travelled || 0;
        existing.fillCount += 1;
        if (!existing.drivers.includes(driver)) existing.drivers.push(driver);
      } else {
        fleetMap.set(fleet, {
          fleet,
          totalLitres: record.litres_filled || 0,
          totalCostZAR: (record.currency || 'ZAR') === 'ZAR' ? (record.total_cost || 0) : 0,
          totalCostUSD: record.currency === 'USD' ? (record.total_cost || 0) : 0,
          totalDistance: record.distance_travelled || 0,
          avgKmPerLitre: 0,
          fillCount: 1,
          drivers: [driver],
        });
      }
    });

    // Calculate averages
    fleetMap.forEach(report => {
      report.avgKmPerLitre = report.totalLitres > 0 ? report.totalDistance / report.totalLitres : 0;
    });

    return Array.from(fleetMap.values()).sort((a, b) => b.totalLitres - a.totalLitres);
  }, [truckRecords]);

  const reeferFleetReports = useMemo((): ReeferFleetReport[] => {
    const fleetMap = new Map<string, ReeferFleetReport>();

    reeferRecords.forEach(record => {
      const fleet = record.fleet_number;
      const existing = fleetMap.get(fleet);
      const driver = record.driver_name || 'Unknown';

      if (existing) {
        existing.totalLitres += record.litres_filled || 0;
        existing.totalCostZAR += (record.currency || 'ZAR') === 'ZAR' ? (record.total_cost || 0) : 0;
        existing.totalCostUSD += record.currency === 'USD' ? (record.total_cost || 0) : 0;
        existing.fillCount += 1;
        if (!existing.drivers.includes(driver)) existing.drivers.push(driver);
      } else {
        fleetMap.set(fleet, {
          fleet,
          totalLitres: record.litres_filled || 0,
          totalCostZAR: (record.currency || 'ZAR') === 'ZAR' ? (record.total_cost || 0) : 0,
          totalCostUSD: record.currency === 'USD' ? (record.total_cost || 0) : 0,
          fillCount: 1,
          drivers: [driver],
        });
      }
    });

    return Array.from(fleetMap.values()).sort((a, b) => b.totalLitres - a.totalLitres);
  }, [reeferRecords]);

  // Generate reports by filling station
  const stationReports = useMemo((): StationReport[] => {
    const stationMap = new Map<string, StationReport>();

    truckRecords.forEach(record => {
      const station = record.fuel_station || 'Unknown Station';
      const existing = stationMap.get(station);
      const fleet = record.fleet_number;

      if (existing) {
        existing.totalLitres += record.litres_filled || 0;
        existing.totalCostZAR += (record.currency || 'ZAR') === 'ZAR' ? (record.total_cost || 0) : 0;
        existing.totalCostUSD += record.currency === 'USD' ? (record.total_cost || 0) : 0;
        existing.fillCount += 1;
        if (!existing.fleetsServed.includes(fleet)) existing.fleetsServed.push(fleet);
      } else {
        stationMap.set(station, {
          station,
          totalLitres: record.litres_filled || 0,
          totalCostZAR: (record.currency || 'ZAR') === 'ZAR' ? (record.total_cost || 0) : 0,
          totalCostUSD: record.currency === 'USD' ? (record.total_cost || 0) : 0,
          avgCostPerLitre: 0,
          fillCount: 1,
          fleetsServed: [fleet],
        });
      }
    });

    // Calculate averages
    stationMap.forEach(report => {
      const totalCost = report.totalCostZAR + report.totalCostUSD;
      report.avgCostPerLitre = report.totalLitres > 0 ? totalCost / report.totalLitres : 0;
    });

    return Array.from(stationMap.values()).sort((a, b) => b.totalLitres - a.totalLitres);
  }, [truckRecords]);

  const reeferStationReports = useMemo((): StationReport[] => {
    const stationMap = new Map<string, StationReport>();

    reeferRecords.forEach(record => {
      const station = record.fuel_station || 'Unknown Station';
      const existing = stationMap.get(station);
      const fleet = record.fleet_number;

      if (existing) {
        existing.totalLitres += record.litres_filled || 0;
        existing.totalCostZAR += (record.currency || 'ZAR') === 'ZAR' ? (record.total_cost || 0) : 0;
        existing.totalCostUSD += record.currency === 'USD' ? (record.total_cost || 0) : 0;
        existing.fillCount += 1;
        if (!existing.fleetsServed.includes(fleet)) existing.fleetsServed.push(fleet);
      } else {
        stationMap.set(station, {
          station,
          totalLitres: record.litres_filled || 0,
          totalCostZAR: (record.currency || 'ZAR') === 'ZAR' ? (record.total_cost || 0) : 0,
          totalCostUSD: record.currency === 'USD' ? (record.total_cost || 0) : 0,
          avgCostPerLitre: 0,
          fillCount: 1,
          fleetsServed: [fleet],
        });
      }
    });

    stationMap.forEach(report => {
      const totalCost = report.totalCostZAR + report.totalCostUSD;
      report.avgCostPerLitre = report.totalLitres > 0 ? totalCost / report.totalLitres : 0;
    });

    return Array.from(stationMap.values()).sort((a, b) => b.totalLitres - a.totalLitres);
  }, [reeferRecords]);

  // Generate weekly consumption report by fleet categories
  const weeklyReports = useMemo((): WeeklyReport[] => {
    // Helper to get week start (Monday) from a date
    const getWeekStart = (date: Date): Date => {
      const d = new Date(date);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
      d.setDate(diff);
      d.setHours(0, 0, 0, 0);
      return d;
    };

    // Helper to get ISO week number
    const getWeekNumber = (date: Date): number => {
      const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
      const dayNum = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    };

    // Helper to format week label (dates only)
    const formatWeekLabel = (start: Date, end: Date): string => {
      const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
      return `${start.toLocaleDateString('en-ZA', options)} - ${end.toLocaleDateString('en-ZA', options)}`;
    };

    // Group records by week
    const weekMap = new Map<string, { weekStart: Date; weekEnd: Date; records: typeof dieselRecords }>();

    dieselRecords.forEach(record => {
      const recordDate = new Date(record.date);
      const weekStart = getWeekStart(recordDate);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const weekKey = weekStart.toISOString().split('T')[0];

      if (!weekMap.has(weekKey)) {
        weekMap.set(weekKey, { weekStart, weekEnd, records: [] });
      }
      weekMap.get(weekKey)!.records.push(record);
    });

    // Build weekly reports with sections
    const reports: WeeklyReport[] = [];
    const sortedWeeks = Array.from(weekMap.entries()).sort((a, b) => b[0].localeCompare(a[0])); // Most recent first

    for (const [_weekKey, { weekStart, weekEnd, records }] of sortedWeeks) {
      const sections: WeeklySectionData[] = [];
      let grandTotalLitres = 0;
      let grandTotalKm = 0;
      let grandTotalCostZAR = 0;
      let grandTotalCostUSD = 0;

      for (const [sectionName, fleetList] of Object.entries(FLEET_CATEGORIES)) {
        const isReeferSection = sectionName === REEFER_SECTION_NAME;
        const sectionFleetList = isReeferSection ? reeferFleetNumbers : fleetList;
        const sectionRecords = isReeferSection
          ? records.filter(r => isReeferFleet(r.fleet_number))
          : records.filter(r => !isReeferFleet(r.fleet_number));
        const sectionData: WeeklyFleetData[] = [];
        let sectionTotalLitres = 0;
        let sectionTotalKm = 0;
        let sectionTotalCostZAR = 0;
        let sectionTotalCostUSD = 0;

        for (const fleet of sectionFleetList) {
          const fleetRecords = sectionRecords.filter(r => r.fleet_number === fleet);
          if (fleetRecords.length > 0) {
            const totalLitres = fleetRecords.reduce((sum, r) => sum + (r.litres_filled || 0), 0);
            const totalKm = fleetRecords.reduce((sum, r) => sum + (r.distance_travelled || 0), 0);
            const totalCostZAR = fleetRecords.reduce((sum, r) => sum + ((r.currency || 'ZAR') === 'ZAR' ? (r.total_cost || 0) : 0), 0);
            const totalCostUSD = fleetRecords.reduce((sum, r) => sum + (r.currency === 'USD' ? (r.total_cost || 0) : 0), 0);
            const consumption = isReeferSection ? null : (totalLitres > 0 ? totalKm / totalLitres : null);

            sectionData.push({ fleet, totalLitres, totalKm, consumption, totalCostZAR, totalCostUSD });
            sectionTotalLitres += totalLitres;
            sectionTotalKm += totalKm;
            sectionTotalCostZAR += totalCostZAR;
            sectionTotalCostUSD += totalCostUSD;
          }
        }

        // Add fleets with 0 litres if they're in the category (to show all fleets)
        for (const fleet of sectionFleetList) {
          if (!sectionData.find(d => d.fleet === fleet)) {
            sectionData.push({ fleet, totalLitres: 0, totalKm: 0, consumption: null, totalCostZAR: 0, totalCostUSD: 0 });
          }
        }

        // Sort by fleet number naturally
        sectionData.sort((a, b) => {
          const numA = parseInt(a.fleet.replace(/\D/g, '')) || 999;
          const numB = parseInt(b.fleet.replace(/\D/g, '')) || 999;
          return numA - numB;
        });

        const sectionConsumption = isReeferSection ? null : (sectionTotalLitres > 0 ? sectionTotalKm / sectionTotalLitres : null);
        sections.push({
          name: sectionName,
          fleets: sectionFleetList,
          isReeferSection,
          data: sectionData,
          sectionTotal: { totalLitres: sectionTotalLitres, totalKm: sectionTotalKm, consumption: sectionConsumption, totalCostZAR: sectionTotalCostZAR, totalCostUSD: sectionTotalCostUSD },
        });

        if (!isReeferSection) {
          grandTotalLitres += sectionTotalLitres;
          grandTotalKm += sectionTotalKm;
          grandTotalCostZAR += sectionTotalCostZAR;
          grandTotalCostUSD += sectionTotalCostUSD;
        }
      }

      const grandConsumption = grandTotalLitres > 0 ? grandTotalKm / grandTotalLitres : null;
      reports.push({
        weekNumber: getWeekNumber(weekStart),
        weekLabel: formatWeekLabel(weekStart, weekEnd),
        weekStart: weekStart.toISOString().split('T')[0],
        weekEnd: weekEnd.toISOString().split('T')[0],
        sections,
        grandTotal: { totalLitres: grandTotalLitres, totalKm: grandTotalKm, consumption: grandConsumption, totalCostZAR: grandTotalCostZAR, totalCostUSD: grandTotalCostUSD },
      });
    }

    return reports;
  }, [dieselRecords, reeferFleetNumbers]);

  // Export report to Excel
  const exportReportToExcel = () => {
    let headers = '';
    let rows: string[] = [];
    let filename = '';

    if (reportType === 'driver') {
      headers = ['Driver', 'Total Litres', 'Total Cost (ZAR)', 'Total Cost (USD)', 'Total Distance (km)', 'Avg km/L', 'Fill Count', 'Last Fill Date'].join('\t');
      rows = driverReports.map(r => [
        r.driver,
        r.totalLitres.toFixed(2),
        r.totalCostZAR.toFixed(2),
        r.totalCostUSD.toFixed(2),
        r.totalDistance.toString(),
        r.avgKmPerLitre.toFixed(2),
        r.fillCount.toString(),
        r.lastFillDate,
      ].join('\t'));
      if (reeferDriverReports.length > 0) {
        rows = rows.concat([
          '',
          'REEFER DRIVERS',
          ['Driver', 'Total Litres', 'Total Cost (ZAR)', 'Total Cost (USD)', 'Fill Count', 'Last Fill Date', 'Fleets'].join('\t'),
          ...reeferDriverReports.map(r => [
            r.driver,
            r.totalLitres.toFixed(2),
            r.totalCostZAR.toFixed(2),
            r.totalCostUSD.toFixed(2),
            r.fillCount.toString(),
            r.lastFillDate,
            r.fleets.join(', '),
          ].join('\t')),
        ]);
      }
      filename = `diesel_report_by_driver_${new Date().toISOString().split('T')[0]}.xls`;
    } else if (reportType === 'fleet') {
      headers = ['Fleet', 'Total Litres', 'Total Cost (ZAR)', 'Total Cost (USD)', 'Total Distance (km)', 'Avg km/L', 'Fill Count', 'Drivers'].join('\t');
      rows = fleetReports.map(r => [
        r.fleet,
        r.totalLitres.toFixed(2),
        r.totalCostZAR.toFixed(2),
        r.totalCostUSD.toFixed(2),
        r.totalDistance.toString(),
        r.avgKmPerLitre.toFixed(2),
        r.fillCount.toString(),
        r.drivers.join(', '),
      ].join('\t'));
      if (reeferFleetReports.length > 0) {
        rows = rows.concat([
          '',
          'REEFER FLEETS',
          ['Fleet', 'Total Litres', 'Total Cost (ZAR)', 'Total Cost (USD)', 'Fill Count', 'Drivers'].join('\t'),
          ...reeferFleetReports.map(r => [
            r.fleet,
            r.totalLitres.toFixed(2),
            r.totalCostZAR.toFixed(2),
            r.totalCostUSD.toFixed(2),
            r.fillCount.toString(),
            r.drivers.join(', '),
          ].join('\t')),
        ]);
      }
      filename = `diesel_report_by_fleet_${new Date().toISOString().split('T')[0]}.xls`;
    } else {
      headers = ['Station', 'Total Litres', 'Total Cost (ZAR)', 'Total Cost (USD)', 'Avg Cost/L', 'Fill Count', 'Fleets Served'].join('\t');
      rows = stationReports.map(r => [
        r.station,
        r.totalLitres.toFixed(2),
        r.totalCostZAR.toFixed(2),
        r.totalCostUSD.toFixed(2),
        r.avgCostPerLitre.toFixed(2),
        r.fillCount.toString(),
        r.fleetsServed.join(', '),
      ].join('\t'));
      if (reeferStationReports.length > 0) {
        rows = rows.concat([
          '',
          'REEFER STATIONS',
          ['Station', 'Total Litres', 'Total Cost (ZAR)', 'Total Cost (USD)', 'Avg Cost/L', 'Fill Count', 'Fleets Served'].join('\t'),
          ...reeferStationReports.map(r => [
            r.station,
            r.totalLitres.toFixed(2),
            r.totalCostZAR.toFixed(2),
            r.totalCostUSD.toFixed(2),
            r.avgCostPerLitre.toFixed(2),
            r.fillCount.toString(),
            r.fleetsServed.join(', '),
          ].join('\t')),
        ]);
      }
      filename = `diesel_report_by_station_${new Date().toISOString().split('T')[0]}.xls`;
    }

    const tsvContent = '\uFEFF' + headers + '\n' + rows.join('\n');
    const blob = new Blob([tsvContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  // Export all diesel transactions to Excel (XLSX format using CSV with Excel compatibility)
  const exportAllTransactionsToExcel = () => {
    // Create Excel-compatible CSV with all transaction details
    const headers = [
      'Date',
      'Fleet Number',
      'Driver',
      'Fuel Station',
      'Litres Filled',
      'Cost per Litre',
      'Total Cost',
      'Currency',
      'KM Reading',
      'Previous KM',
      'Distance Travelled',
      'km/L',
      'Debrief Status',
      'Debrief Required',
      'Debriefed By',
      'Debrief Date',
      'Debrief Reason',
      'Notes',
      'Trip ID',
      'Probe Verified',
    ].join('\t');

    const rows = dieselRecords.map(record => {
      const kmPerLitre = record.distance_travelled && record.litres_filled
        ? (record.distance_travelled / record.litres_filled).toFixed(2)
        : '';
      const norm = getNormForFleet(record.fleet_number);
      const requiresDebrief = kmPerLitre && norm && parseFloat(kmPerLitre) < norm.min_acceptable;

      return [
        record.date,
        record.fleet_number,
        record.driver_name || '',
        record.fuel_station || '',
        record.litres_filled?.toFixed(2) || '',
        record.cost_per_litre?.toFixed(2) || '',
        record.total_cost?.toFixed(2) || '',
        record.currency || 'ZAR',
        record.km_reading || '',
        record.previous_km_reading || '',
        record.distance_travelled || '',
        kmPerLitre,
        record.debrief_signed ? 'Completed' : (requiresDebrief ? 'Pending' : 'Not Required'),
        requiresDebrief ? 'Yes' : 'No',
        record.debrief_signed_by || '',
        record.debrief_date || '',
        record.debrief_trigger_reason || '',
        (record.notes || '').replace(/[\t\n\r]/g, ' '),
        record.trip_id || '',
        record.probe_verified ? 'Yes' : 'No',
      ].join('\t');
    });

    // Use tab-separated values for better Excel compatibility
    const tsvContent = '\uFEFF' + headers + '\n' + rows.join('\n'); // BOM for Excel UTF-8
    const blob = new Blob([tsvContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `diesel_transactions_${new Date().toISOString().split('T')[0]}.xls`;
    link.click();
  };

  // Export debrief transactions to Excel
  const exportDebriefTransactions = (type: 'pending' | 'completed' | 'all') => {
    let recordsToExport: DieselConsumptionRecord[] = [];
    let filename = '';

    if (type === 'pending') {
      recordsToExport = recordsRequiringDebrief;
      filename = `diesel_pending_debriefs_${new Date().toISOString().split('T')[0]}.xls`;
    } else if (type === 'completed') {
      recordsToExport = truckRecords.filter(r => r.debrief_signed);
      filename = `diesel_completed_debriefs_${new Date().toISOString().split('T')[0]}.xls`;
    } else {
      recordsToExport = [...recordsRequiringDebrief, ...truckRecords.filter(r => r.debrief_signed)];
      filename = `diesel_all_debriefs_${new Date().toISOString().split('T')[0]}.xls`;
    }

    const headers = [
      'Date',
      'Fleet Number',
      'Driver',
      'Fuel Station',
      'Litres Filled',
      'Total Cost',
      'Currency',
      'Distance (km)',
      'Actual km/L',
      'Expected km/L',
      'Min Acceptable',
      'Variance %',
      'Debrief Status',
      'Debriefed By',
      'Debrief Date',
      'Debrief Reason',
      'Notes',
    ].join('\t');

    const rows = recordsToExport.map(record => {
      const kmPerLitre = record.distance_travelled && record.litres_filled
        ? record.distance_travelled / record.litres_filled
        : null;
      const norm = getNormForFleet(record.fleet_number);
      const variance = kmPerLitre && norm
        ? ((kmPerLitre - norm.expected_km_per_litre) / norm.expected_km_per_litre * 100)
        : null;

      return [
        record.date,
        record.fleet_number,
        record.driver_name || '',
        record.fuel_station || '',
        record.litres_filled?.toFixed(2) || '',
        record.total_cost?.toFixed(2) || '',
        record.currency || 'ZAR',
        record.distance_travelled || '',
        kmPerLitre?.toFixed(2) || '',
        norm?.expected_km_per_litre?.toFixed(2) || '',
        norm?.min_acceptable?.toFixed(2) || '',
        variance?.toFixed(1) || '',
        record.debrief_signed ? 'Completed' : 'Pending',
        record.debrief_signed_by || '',
        record.debrief_date || '',
        record.debrief_trigger_reason || '',
        (record.notes || '').replace(/[\t\n\r]/g, ' '),
      ].join('\t');
    });

    const tsvContent = '\uFEFF' + headers + '\n' + rows.join('\n');
    const blob = new Blob([tsvContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  // Handler functions
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleManualSave = async (record: any) => {
    if (record.id) {
      await updateDieselRecord(record as unknown as DieselConsumptionRecord);
    } else {
      await addDieselRecord(record as unknown as Omit<DieselConsumptionRecord, 'id' | 'created_at' | 'updated_at'>);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleImport = async (records: any[]) => {
    for (const record of records) {
      await addDieselRecord(record as unknown as Omit<DieselConsumptionRecord, 'id' | 'created_at' | 'updated_at'>);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleLinkToTrip = async (record: any, tripId: string) => {
    await linkDieselToTrip(record as unknown as DieselConsumptionRecord, tripId);
  };

  const handleUnlinkFromTrip = async (recordId: string) => {
    await unlinkDieselFromTrip(recordId);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleProbeVerification = async (verificationData: any) => {
    await updateDieselRecord(verificationData as unknown as DieselConsumptionRecord);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleDebrief = async (debriefData: any) => {
    await updateDieselRecord(debriefData as unknown as DieselConsumptionRecord);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleNormSave = async (norm: any) => {
    if (norm.id) {
      await updateDieselNorm(norm as unknown as DieselNorms);
    } else {
      await addDieselNorm(norm as unknown as DieselNorms);
    }
  };

  const handleDeleteRecord = async (recordId: string) => {
    if (confirm('Are you sure you want to delete this diesel record?')) {
      await deleteDieselRecord(recordId);
    }
  };

  const handleDeleteNorm = async (normId: string) => {
    if (confirm('Are you sure you want to delete this fuel norm?')) {
      await deleteDieselNorm(normId);
    }
  };

  // Export fleet debrief summary PDF
  const handleExportFleetDebriefSummary = (fleetNumber: string, showPendingOnly: boolean = false) => {
    const fleetRecords = truckRecords.filter(r => r.fleet_number === fleetNumber);
    const recordsWithDebriefStatus = fleetRecords.map(record => {
      const kmPerLitre = calculateKmPerLitre(record);
      const norm = getNormForFleet(record.fleet_number);
      const requiresDebrief = kmPerLitre !== null && norm && kmPerLitre < norm.min_acceptable;

      return {
        id: record.id,
        fleet_number: record.fleet_number,
        date: record.date,
        driver_name: record.driver_name,
        fuel_station: record.fuel_station,
        litres_filled: record.litres_filled,
        total_cost: record.total_cost,
        currency: record.currency,
        km_per_litre: kmPerLitre ?? undefined,
        debrief_signed: record.debrief_signed,
        debrief_signed_by: record.debrief_signed_by,
        debrief_signed_at: record.debrief_signed_at,
        debrief_notes: record.debrief_notes,
        requires_debrief: requiresDebrief,
        debrief_trigger_reason: record.debrief_trigger_reason,
      };
    });

    generateFleetDebriefSummaryPDF({
      fleetNumber,
      records: recordsWithDebriefStatus,
      showPendingOnly,
    });
  };

  // Export all debrief transactions as PDF
  const handleExportAllDebriefsPDF = () => {
    const recordsWithDebriefStatus = truckRecords.map(record => {
      const kmPerLitre = calculateKmPerLitre(record);
      const norm = getNormForFleet(record.fleet_number);
      const requiresDebrief = kmPerLitre !== null && norm && kmPerLitre < norm.min_acceptable;

      return {
        id: record.id,
        fleet_number: record.fleet_number,
        date: record.date,
        driver_name: record.driver_name,
        fuel_station: record.fuel_station,
        litres_filled: record.litres_filled,
        total_cost: record.total_cost,
        currency: record.currency,
        km_per_litre: kmPerLitre ?? undefined,
        debrief_signed: record.debrief_signed,
        debrief_signed_by: record.debrief_signed_by,
        debrief_signed_at: record.debrief_signed_at,
        debrief_notes: record.debrief_notes,
        requires_debrief: requiresDebrief,
        debrief_trigger_reason: record.debrief_trigger_reason,
      };
    });

    // Filter to only include records that need debrief or have been debriefed
    const debriefRecords = recordsWithDebriefStatus.filter(r => r.requires_debrief || r.debrief_signed);
    generateSelectedTransactionsPDF(debriefRecords, 'ALL FLEETS DEBRIEF SUMMARY');
  };

  const openEditRecord = (record: DieselConsumptionRecord) => {
    setSelectedRecord(record);
    setIsManualEntryOpen(true);
  };

  const openTripLinkage = (record: DieselConsumptionRecord) => {
    setSelectedRecord(record);
    setIsTripLinkageOpen(true);
  };

  const openProbeVerification = (record: DieselConsumptionRecord) => {
    setSelectedRecord(record);
    setIsProbeVerificationOpen(true);
  };

  const openDebrief = (record: DieselConsumptionRecord) => {
    setSelectedRecord(record);
    setIsDebriefOpen(true);
  };

  const openEditNorm = (norm: DieselNorms) => {
    setSelectedNorm(norm);
    setIsNormsModalOpen(true);
  };

  const openViewModal = (record: DieselConsumptionRecord) => {
    setSelectedRecord(record);
    setIsViewModalOpen(true);
  };

  const openReeferLinkage = (record: DieselConsumptionRecord) => {
    setSelectedRecord(record);
    setIsReeferLinkageOpen(true);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Button
              className="gap-2"
              onClick={() => {
                setSelectedRecord(null);
                setIsManualEntryOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Manual Entry
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setIsImportModalOpen(true)}
            >
              <Upload className="h-4 w-4" />
              Import Data
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={exportAllTransactionsToExcel}
            >
              <FileSpreadsheet className="h-4 w-4" />
              Export Excel
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Records</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{totalRecords}</div>
              {reeferTotalRecords > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Reefers: {reeferTotalRecords}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Truck Litres</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{formatNumber(totalLitres)} L</div>
              {reeferTotalLitres > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Reefers: {formatNumber(reeferTotalLitres)} L
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Truck Cost</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{formatCurrency(totalCostZAR, 'ZAR')}</div>
              {totalCostUSD > 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  {formatCurrency(totalCostUSD, 'USD')}
                </p>
              )}
              {(reeferTotalCostZAR > 0 || reeferTotalCostUSD > 0) && (
                <p className="text-xs text-muted-foreground mt-1">
                  Reefers: {reeferTotalCostZAR > 0 ? formatCurrency(reeferTotalCostZAR, 'ZAR') : ''}
                  {reeferTotalCostZAR > 0 && reeferTotalCostUSD > 0 ? ' / ' : ''}
                  {reeferTotalCostUSD > 0 ? formatCurrency(reeferTotalCostUSD, 'USD') : ''}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg km/L (Trucks)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{formatNumber(averageKmPerLitre, 2)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Requires Debrief</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{debriefStats.pending}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {debriefStats.completed} completed
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="reefer" className="flex items-center gap-1">
              <Snowflake className="h-3 w-3" />
              Reefer
            </TabsTrigger>
            <TabsTrigger value="debrief">Debrief</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="norms">Norms</TabsTrigger>
            <TabsTrigger value="import">Import Data</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            {/* Action Buttons */}
            <div className="flex gap-2 mb-6">
              <Button
                className="gap-2"
                onClick={() => {
                  setSelectedRecord(null);
                  setIsManualEntryOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
                Add Record
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => setIsImportModalOpen(true)}
              >
                <Upload className="h-4 w-4" />
                Import CSV
              </Button>
            </div>

            {/* Fleet-grouped records */}
            {sortedFleets.length > 0 ? (
              <div className="space-y-6">
                {sortedFleets.map((fleet) => {
                  const fleetTotals = getFleetTotals(truckRecordsGroupedByFleetAndWeek, fleet);
                  const isFleetExpanded = expandedFleets.has(fleet);
                  const fleetWeeks = Object.keys(truckRecordsGroupedByFleetAndWeek[fleet])
                    .map(w => parseInt(w))
                    .sort((a, b) => b - a); // Most recent weeks first

                  return (
                    <Card key={fleet} className="overflow-hidden">
                      {/* Fleet Header */}
                      <Collapsible open={isFleetExpanded} onOpenChange={() => toggleFleetExpanded(fleet)}>
                        <CollapsibleTrigger asChild>
                          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {isFleetExpanded ? (
                                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                )}
                                <div>
                                  <CardTitle className="text-xl">{fleet}</CardTitle>
                                  <CardDescription>
                                    {fleetTotals.count} transactions across {fleetWeeks.length} week(s)
                                  </CardDescription>
                                </div>
                              </div>
                              <div className="flex items-center gap-6 text-sm">
                                <div className="text-right">
                                  <p className="text-muted-foreground">Total Litres</p>
                                  <p className="font-semibold">{formatNumber(fleetTotals.totalLitres)} L</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-muted-foreground">Total Cost</p>
                                  <p className="font-semibold">
                                    {fleetTotals.totalCostZAR > 0 && formatCurrency(fleetTotals.totalCostZAR, 'ZAR')}
                                    {fleetTotals.totalCostZAR > 0 && fleetTotals.totalCostUSD > 0 && ' / '}
                                    {fleetTotals.totalCostUSD > 0 && formatCurrency(fleetTotals.totalCostUSD, 'USD')}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-muted-foreground">Avg km/L</p>
                                  <p className="font-semibold">{formatNumber(fleetTotals.avgKmL, 2)}</p>
                                </div>
                                {fleetTotals.pendingDebrief > 0 && (
                                  <Badge variant="destructive" className="ml-2">
                                    {fleetTotals.pendingDebrief} Debrief
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </CardHeader>
                        </CollapsibleTrigger>

                        <CollapsibleContent>
                          <CardContent className="pt-0">
                            {/* Week sections within fleet */}
                            <div className="space-y-3">
                              {fleetWeeks.map((week) => {
                                const weekKey = `${fleet}-${week}`;
                                const isWeekExpanded = expandedWeeks.has(weekKey);
                                const weekRecords = truckRecordsGroupedByFleetAndWeek[fleet][week];
                                const weekTotals = getWeekTotals(weekRecords);

                                return (
                                  <Collapsible key={weekKey} open={isWeekExpanded} onOpenChange={() => toggleWeekExpanded(weekKey)}>
                                    <div className="border rounded-lg">
                                      <CollapsibleTrigger asChild>
                                        <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/30 transition-colors">
                                          <div className="flex items-center gap-2">
                                            {isWeekExpanded ? (
                                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                            ) : (
                                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                            )}
                                            <span className="font-medium">
                                              Week {week}{week === currentWeek ? ' (Current)' : ''}
                                            </span>
                                            <span className="text-sm text-muted-foreground">
                                              ({getWeekDateRange(week)})
                                            </span>
                                            <Badge variant="secondary" className="ml-2">
                                              {weekRecords.length} transaction{weekRecords.length !== 1 ? 's' : ''}
                                            </Badge>
                                          </div>
                                          <div className="flex items-center gap-4 text-sm">
                                            <span>{formatNumber(weekTotals.totalLitres)} L</span>
                                            <span>
                                              {weekTotals.totalCostZAR > 0 && formatCurrency(weekTotals.totalCostZAR, 'ZAR')}
                                              {weekTotals.totalCostZAR > 0 && weekTotals.totalCostUSD > 0 && ' / '}
                                              {weekTotals.totalCostUSD > 0 && formatCurrency(weekTotals.totalCostUSD, 'USD')}
                                            </span>
                                            <span className="font-medium">{formatNumber(weekTotals.avgKmL, 2)} km/L</span>
                                            {weekTotals.pendingDebrief > 0 && (
                                              <Badge variant="destructive" className="text-xs">
                                                {weekTotals.pendingDebrief} Debrief
                                              </Badge>
                                            )}
                                          </div>
                                        </div>
                                      </CollapsibleTrigger>

                                      <CollapsibleContent>
                                        <div className="border-t bg-background">
                                          {/* Professional Transaction table */}
                                          <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                              <thead className="bg-slate-100 dark:bg-slate-800 border-b-2 border-slate-200 dark:border-slate-700">
                                                <tr>
                                                  <th className="text-left px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Date</th>
                                                  <th className="text-left px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Driver</th>
                                                  <th className="text-left px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Station</th>
                                                  <th className="text-right px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Litres</th>
                                                  <th className="text-right px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Cost</th>
                                                  <th className="text-right px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">KM Reading</th>
                                                  <th className="text-right px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">km/L</th>
                                                  <th className="text-center px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Status</th>
                                                  <th className="text-center px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Actions</th>
                                                </tr>
                                              </thead>
                                              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                                {weekRecords.map((record, idx) => {
                                                  const kmPerLitre = calculateKmPerLitre(record);
                                                  const norm = getNormForFleet(record.fleet_number);
                                                  const outsideNorm = kmPerLitre && norm ? isOutsideNorm(kmPerLitre, norm) : false;
                                                  const hasLinkedReefer = allReeferRecords.some(r => r.linked_diesel_record_id === record.id);

                                                  return (
                                                    <tr
                                                      key={record.id}
                                                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/50 dark:bg-slate-800/30'}`}
                                                    >
                                                      <td className="px-4 py-3 whitespace-nowrap">
                                                        <span className="font-medium">{formatDate(record.date)}</span>
                                                      </td>
                                                      <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2">
                                                          <User className="h-4 w-4 text-muted-foreground" />
                                                          <span>{record.driver_name || <span className="text-muted-foreground italic">No driver</span>}</span>
                                                        </div>
                                                      </td>
                                                      <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2">
                                                          <Fuel className="h-4 w-4 text-muted-foreground" />
                                                          <span>{record.fuel_station || <span className="text-muted-foreground italic">Unknown</span>}</span>
                                                        </div>
                                                      </td>
                                                      <td className="px-4 py-3 text-right font-mono">
                                                        <span className="font-semibold">{formatNumber(record.litres_filled)}</span>
                                                        <span className="text-muted-foreground ml-1">L</span>
                                                      </td>
                                                      <td className="px-4 py-3 text-right font-mono">
                                                        <span className="font-semibold">
                                                          {formatCurrency(record.total_cost, (record.currency || 'ZAR') as 'ZAR' | 'USD')}
                                                        </span>
                                                      </td>
                                                      <td className="px-4 py-3 text-right font-mono">
                                                        <div>
                                                          <span className="font-semibold">{formatNumber(record.km_reading)}</span>
                                                          {record.previous_km_reading && (
                                                            <span className="text-xs text-muted-foreground block">
                                                              +{formatNumber(record.km_reading - record.previous_km_reading)} km
                                                            </span>
                                                          )}
                                                        </div>
                                                      </td>
                                                      <td className={`px-4 py-3 text-right font-mono ${outsideNorm ? 'text-destructive font-bold' : 'text-green-600 dark:text-green-400'}`}>
                                                        {kmPerLitre ? (
                                                          <span>{formatNumber(kmPerLitre, 2)}</span>
                                                        ) : (
                                                          <span className="text-muted-foreground">—</span>
                                                        )}
                                                      </td>
                                                      <td className="px-4 py-3">
                                                        <div className="flex flex-wrap items-center justify-center gap-1">
                                                          {outsideNorm && !record.debrief_signed && (
                                                            <Badge variant="destructive" className="text-xs whitespace-nowrap">
                                                              <AlertCircle className="h-3 w-3 mr-1" />
                                                              Debrief
                                                            </Badge>
                                                          )}
                                                          {record.debrief_signed && (
                                                            <Badge variant="default" className="bg-green-600 text-xs whitespace-nowrap">
                                                              <CheckCircle className="h-3 w-3 mr-1" />
                                                              Debriefed
                                                            </Badge>
                                                          )}
                                                          {record.probe_verified && (
                                                            <Badge variant="outline" className="text-xs whitespace-nowrap border-blue-500 text-blue-600">
                                                              <CheckCircle className="h-3 w-3 mr-1" />
                                                              Probe OK
                                                            </Badge>
                                                          )}
                                                          {!record.probe_verified && (
                                                            <Badge variant="outline" className="text-xs whitespace-nowrap border-orange-400 text-orange-500">
                                                              Probe Pending
                                                            </Badge>
                                                          )}
                                                          {hasLinkedReefer && (
                                                            <Badge variant="outline" className="text-xs whitespace-nowrap border-cyan-500 text-cyan-600">
                                                              <Snowflake className="h-3 w-3 mr-1" />
                                                              Reefer
                                                            </Badge>
                                                          )}
                                                          {record.trip_id && (
                                                            <Badge variant="outline" className="text-xs whitespace-nowrap border-purple-500 text-purple-600">
                                                              <Link className="h-3 w-3 mr-1" />
                                                              Trip Linked
                                                            </Badge>
                                                          )}
                                                          {record.linked_trailers && record.linked_trailers.length > 0 && (
                                                            <Badge variant="outline" className="text-xs whitespace-nowrap">
                                                              <Truck className="h-3 w-3 mr-1" />
                                                              +{record.linked_trailers.length} Trailer
                                                            </Badge>
                                                          )}
                                                        </div>
                                                      </td>
                                                      <td className="px-4 py-3 text-center">
                                                        <DropdownMenu>
                                                          <DropdownMenuTrigger asChild>
                                                            <Button variant="outline" size="sm" className="h-8 px-2">
                                                              <Settings className="h-4 w-4 mr-1" />
                                                              <ChevronDown className="h-3 w-3" />
                                                            </Button>
                                                          </DropdownMenuTrigger>
                                                          <DropdownMenuContent align="end" className="w-48">
                                                            <DropdownMenuItem onClick={() => openViewModal(record)}>
                                                              <Eye className="h-4 w-4 mr-2" />
                                                              View Details
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => openEditRecord(record)}>
                                                              <Edit className="h-4 w-4 mr-2" />
                                                              Edit Record
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => openTripLinkage(record)}>
                                                              <Link className="h-4 w-4 mr-2" />
                                                              {record.trip_id ? 'Change Trip' : 'Link to Trip'}
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => openReeferLinkage(record)}>
                                                              <Snowflake className="h-4 w-4 mr-2" />
                                                              {hasLinkedReefer ? 'Manage Reefer' : 'Link Reefer'}
                                                            </DropdownMenuItem>
                                                            {!record.probe_verified && (
                                                              <DropdownMenuItem onClick={() => openProbeVerification(record)}>
                                                                <CheckCircle className="h-4 w-4 mr-2" />
                                                                Verify Probe
                                                              </DropdownMenuItem>
                                                            )}
                                                            {(outsideNorm || record.requires_debrief) && !record.debrief_signed && (
                                                              <DropdownMenuItem onClick={() => openDebrief(record)} className="text-destructive">
                                                                <FileText className="h-4 w-4 mr-2" />
                                                                Debrief Required
                                                              </DropdownMenuItem>
                                                            )}
                                                            <DropdownMenuItem
                                                              onClick={() => handleDeleteRecord(record.id)}
                                                              className="text-destructive"
                                                            >
                                                              <Trash2 className="h-4 w-4 mr-2" />
                                                              Delete Record
                                                            </DropdownMenuItem>
                                                          </DropdownMenuContent>
                                                        </DropdownMenu>
                                                      </td>
                                                    </tr>
                                                  );
                                                })}
                                              </tbody>
                                            </table>
                                          </div>
                                        </div>
                                      </CollapsibleContent>
                                    </div>
                                  </Collapsible>
                                );
                              })}
                            </div>
                          </CardContent>
                        </CollapsibleContent>
                      </Collapsible>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Diesel Records</h3>
                    <p className="text-muted-foreground mb-4">
                      Start by adding diesel records manually or import from a CSV file.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {sortedReeferFleets.length > 0 && (
              <Card className="border-cyan-200/60 dark:border-cyan-900/60">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Snowflake className="h-5 w-5 text-cyan-500" />
                    Reefer Diesel (L/hr)
                  </CardTitle>
                  <CardDescription>
                    Separate view for reefer units {sortedReeferFleets.join(', ')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {sortedReeferFleets.map((fleet) => {
                    const fleetTotals = getFleetTotals(reeferRecordsGroupedByFleetAndWeek, fleet);
                    const isFleetExpanded = expandedFleets.has(`reefer-${fleet}`);
                    const fleetWeeks = Object.keys(reeferRecordsGroupedByFleetAndWeek[fleet])
                      .map(w => parseInt(w))
                      .sort((a, b) => b - a);

                    return (
                      <Card key={`reefer-${fleet}`} className="overflow-hidden">
                        <Collapsible open={isFleetExpanded} onOpenChange={() => toggleFleetExpanded(`reefer-${fleet}`)}>
                          <CollapsibleTrigger asChild>
                            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  {isFleetExpanded ? (
                                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                                  ) : (
                                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                  )}
                                  <div>
                                    <CardTitle className="text-xl">{fleet}</CardTitle>
                                    <CardDescription>
                                      {fleetTotals.count} transactions across {fleetWeeks.length} week(s)
                                    </CardDescription>
                                  </div>
                                </div>
                                <div className="flex items-center gap-6 text-sm">
                                  <div className="text-right">
                                    <p className="text-muted-foreground">Total Litres</p>
                                    <p className="font-semibold">{formatNumber(fleetTotals.totalLitres)} L</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-muted-foreground">Total Cost</p>
                                    <p className="font-semibold">
                                      {fleetTotals.totalCostZAR > 0 && formatCurrency(fleetTotals.totalCostZAR, 'ZAR')}
                                      {fleetTotals.totalCostZAR > 0 && fleetTotals.totalCostUSD > 0 && ' / '}
                                      {fleetTotals.totalCostUSD > 0 && formatCurrency(fleetTotals.totalCostUSD, 'USD')}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </CardHeader>
                          </CollapsibleTrigger>

                          <CollapsibleContent>
                            <CardContent className="pt-0">
                              <div className="space-y-3">
                                {fleetWeeks.map((week) => {
                                  const weekKey = `reefer-${fleet}-${week}`;
                                  const isWeekExpanded = expandedWeeks.has(weekKey);
                                  const weekRecords = reeferRecordsGroupedByFleetAndWeek[fleet][week];
                                  const weekTotals = getWeekTotals(weekRecords, true);

                                  return (
                                    <Collapsible key={weekKey} open={isWeekExpanded} onOpenChange={() => toggleWeekExpanded(weekKey)}>
                                      <div className="border rounded-lg">
                                        <CollapsibleTrigger asChild>
                                          <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/30 transition-colors">
                                            <div className="flex items-center gap-2">
                                              {isWeekExpanded ? (
                                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                              ) : (
                                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                              )}
                                              <span className="font-medium">
                                                Week {week}{week === currentWeek ? ' (Current)' : ''}
                                              </span>
                                              <span className="text-sm text-muted-foreground">
                                                ({getWeekDateRange(week)})
                                              </span>
                                              <Badge variant="secondary" className="ml-2">
                                                {weekRecords.length} transaction{weekRecords.length !== 1 ? 's' : ''}
                                              </Badge>
                                            </div>
                                            <div className="flex items-center gap-4 text-sm">
                                              <span>{formatNumber(weekTotals.totalLitres)} L</span>
                                              <span>
                                                {weekTotals.totalCostZAR > 0 && formatCurrency(weekTotals.totalCostZAR, 'ZAR')}
                                                {weekTotals.totalCostZAR > 0 && weekTotals.totalCostUSD > 0 && ' / '}
                                                {weekTotals.totalCostUSD > 0 && formatCurrency(weekTotals.totalCostUSD, 'USD')}
                                              </span>
                                            </div>
                                          </div>
                                        </CollapsibleTrigger>

                                        <CollapsibleContent>
                                          <div className="border-t bg-background">
                                            <div className="overflow-x-auto">
                                              <table className="w-full text-sm">
                                                <thead className="bg-slate-100 dark:bg-slate-800 border-b-2 border-slate-200 dark:border-slate-700">
                                                  <tr>
                                                    <th className="text-left px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Date</th>
                                                    <th className="text-left px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Driver</th>
                                                    <th className="text-left px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Station</th>
                                                    <th className="text-right px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Litres</th>
                                                    <th className="text-right px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Cost</th>
                                                    <th className="text-center px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Actions</th>
                                                  </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                                  {weekRecords.map((record, idx) => (
                                                    <tr
                                                      key={record.id}
                                                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/50 dark:bg-slate-800/30'}`}
                                                    >
                                                      <td className="px-4 py-3 whitespace-nowrap">
                                                        <span className="font-medium">{formatDate(record.date)}</span>
                                                      </td>
                                                      <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2">
                                                          <User className="h-4 w-4 text-muted-foreground" />
                                                          <span>{record.driver_name || <span className="text-muted-foreground italic">No driver</span>}</span>
                                                        </div>
                                                      </td>
                                                      <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2">
                                                          <Fuel className="h-4 w-4 text-muted-foreground" />
                                                          <span>{record.fuel_station || <span className="text-muted-foreground italic">Unknown</span>}</span>
                                                        </div>
                                                      </td>
                                                      <td className="px-4 py-3 text-right font-mono">
                                                        <span className="font-semibold">{formatNumber(record.litres_filled)}</span>
                                                        <span className="text-muted-foreground ml-1">L</span>
                                                      </td>
                                                      <td className="px-4 py-3 text-right font-mono">
                                                        <span className="font-semibold">
                                                          {formatCurrency(record.total_cost, (record.currency || 'ZAR') as 'ZAR' | 'USD')}
                                                        </span>
                                                      </td>
                                                      <td className="px-4 py-3 text-center">
                                                        <DropdownMenu>
                                                          <DropdownMenuTrigger asChild>
                                                            <Button variant="outline" size="sm" className="h-8 px-2">
                                                              <Settings className="h-4 w-4 mr-1" />
                                                              <ChevronDown className="h-3 w-3" />
                                                            </Button>
                                                          </DropdownMenuTrigger>
                                                          <DropdownMenuContent align="end" className="w-48">
                                                            <DropdownMenuItem onClick={() => openViewModal(record)}>
                                                              <Eye className="h-4 w-4 mr-2" />
                                                              View Details
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => openEditRecord(record)}>
                                                              <Edit className="h-4 w-4 mr-2" />
                                                              Edit Record
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => openTripLinkage(record)}>
                                                              <Link className="h-4 w-4 mr-2" />
                                                              {record.trip_id ? 'Change Trip' : 'Link to Trip'}
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => openReeferLinkage(record)}>
                                                              <Snowflake className="h-4 w-4 mr-2" />
                                                              Link Reefer
                                                            </DropdownMenuItem>
                                                            {!record.probe_verified && (
                                                              <DropdownMenuItem onClick={() => openProbeVerification(record)}>
                                                                <CheckCircle className="h-4 w-4 mr-2" />
                                                                Verify Probe
                                                              </DropdownMenuItem>
                                                            )}
                                                            <DropdownMenuItem
                                                              onClick={() => handleDeleteRecord(record.id)}
                                                              className="text-destructive"
                                                            >
                                                              <Trash2 className="h-4 w-4 mr-2" />
                                                              Delete Record
                                                            </DropdownMenuItem>
                                                          </DropdownMenuContent>
                                                        </DropdownMenu>
                                                      </td>
                                                    </tr>
                                                  ))}
                                                </tbody>
                                              </table>
                                            </div>
                                          </div>
                                        </CollapsibleContent>
                                      </div>
                                    </Collapsible>
                                  );
                                })}
                              </div>
                            </CardContent>
                          </CollapsibleContent>
                        </Collapsible>
                      </Card>
                    );
                  })}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Reefer Diesel Tab - Separate tracking for reefer units (L/hr) */}
          <TabsContent value="reefer">
            <ReeferDieselTab />
          </TabsContent>

          <TabsContent value="debrief">
            <div className="space-y-6">
              {/* Fleet Debrief Summary Export Section */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Fleet Debrief Summary</CardTitle>
                      <CardDescription>
                        Export PDF summary of debrief status per fleet or across all fleets
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-muted-foreground" />
                        <select
                          title="Filter by fleet number"
                          value={debriefFleetFilter}
                          onChange={(e) => setDebriefFleetFilter(e.target.value)}
                          className="px-3 py-1.5 border rounded-md bg-background text-sm min-w-[150px]"
                        >
                          <option value="">Select Fleet...</option>
                          {uniqueFleetNumbers.map((fleet) => (
                            <option key={fleet} value={fleet}>{fleet}</option>
                          ))}
                        </select>
                      </div>
                      {debriefFleetFilter && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleExportFleetDebriefSummary(debriefFleetFilter, false)}
                            className="gap-2"
                          >
                            <FileText className="h-4 w-4" />
                            Full Summary PDF
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleExportFleetDebriefSummary(debriefFleetFilter, true)}
                            className="gap-2"
                          >
                            <AlertCircle className="h-4 w-4" />
                            Pending Only PDF
                          </Button>
                        </>
                      )}
                      <Button
                        variant="default"
                        size="sm"
                        onClick={handleExportAllDebriefsPDF}
                        className="gap-2"
                      >
                        <Download className="h-4 w-4" />
                        All Fleets PDF
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              {/* Pending Debriefs */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Pending Debriefs</CardTitle>
                      <CardDescription>
                        Records with fuel efficiency outside acceptable norms requiring driver debrief
                      </CardDescription>
                    </div>
                    {recordsRequiringDebrief.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => exportDebriefTransactions('pending')}
                        className="gap-2"
                      >
                        <FileSpreadsheet className="h-4 w-4" />
                        Export Pending
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {recordsRequiringDebrief.length > 0 ? (
                    <div className="space-y-3">
                      {recordsRequiringDebrief.map((record) => {
                        const kmPerLitre = calculateKmPerLitre(record);
                        const norm = getNormForFleet(record.fleet_number);
                        return (
                          <div key={record.id} className="border rounded-lg p-4">
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                              <div>
                                <p className="text-sm text-muted-foreground">Fleet</p>
                                <p className="font-medium">{record.fleet_number}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Date</p>
                                <p className="font-medium">{formatDate(record.date)}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Driver</p>
                                <p className="font-medium">{record.driver_name || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Actual</p>
                                <p className="font-medium text-destructive">
                                  {kmPerLitre ? `${formatNumber(kmPerLitre, 2)} km/L` : 'N/A'}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Expected</p>
                                <p className="font-medium">
                                  {norm ? `${formatNumber(norm.expected_km_per_litre, 2)} km/L` : 'No norm set'}
                                </p>
                              </div>
                            </div>
                            <div className="mt-3 pt-3 border-t flex justify-end">
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => openDebrief(record)}
                              >
                                <FileText className="h-4 w-4 mr-1" />
                                Complete Debrief
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <CheckCircle className="h-12 w-12 mx-auto text-success mb-4" />
                      <h3 className="text-lg font-medium mb-2">No Pending Debriefs</h3>
                      <p className="text-muted-foreground">
                        All records are within acceptable fuel efficiency norms
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Completed Debriefs */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Completed Debriefs</CardTitle>
                      <CardDescription>
                        Records that have been debriefed and signed off
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      {truckRecords.filter(r => r.debrief_signed).length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => exportDebriefTransactions('completed')}
                          className="gap-2"
                        >
                          <FileSpreadsheet className="h-4 w-4" />
                          Export Completed
                        </Button>
                      )}
                      {(recordsRequiringDebrief.length > 0 || truckRecords.filter(r => r.debrief_signed).length > 0) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => exportDebriefTransactions('all')}
                          className="gap-2"
                        >
                          <Download className="h-4 w-4" />
                          Export All Debriefs
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {truckRecords.filter(r => r.debrief_signed).length > 0 ? (
                    <div className="space-y-3">
                      {truckRecords.filter(r => r.debrief_signed).map((record) => (
                        <div key={record.id} className="border rounded-lg p-4 flex items-center justify-between">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1">
                            <div>
                              <p className="text-sm text-muted-foreground">Fleet</p>
                              <p className="font-medium">{record.fleet_number}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Date</p>
                              <p className="font-medium">{formatDate(record.date)}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Efficiency</p>
                              <p className="font-medium">{record.km_per_litre ? `${formatNumber(record.km_per_litre, 2)} km/L` : 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Debriefed By</p>
                              <p className="font-medium">{record.debrief_signed_by}</p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => generateDieselDebriefPDF(record, dieselNorms.find(n => n.fleet_number === record.fleet_number))}
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            Export PDF
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      No completed debriefs yet
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="reports">
            <div className="space-y-6">
              {/* Report Type Selector */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Diesel Reports</CardTitle>
                      <CardDescription>
                        Analyze fuel consumption by driver, fleet, or filling station
                      </CardDescription>
                    </div>
                    <Button onClick={exportReportToExcel} className="gap-2">
                      <FileSpreadsheet className="h-4 w-4" />
                      Export Excel
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={reportType === 'fleet' ? 'default' : 'outline'}
                      onClick={() => setReportType('fleet')}
                      className="gap-2"
                    >
                      <Truck className="h-4 w-4" />
                      By Fleet
                    </Button>
                    <Button
                      variant={reportType === 'driver' ? 'default' : 'outline'}
                      onClick={() => setReportType('driver')}
                      className="gap-2"
                    >
                      <User className="h-4 w-4" />
                      By Driver
                    </Button>
                    <Button
                      variant={reportType === 'station' ? 'default' : 'outline'}
                      onClick={() => setReportType('station')}
                      className="gap-2"
                    >
                      <Fuel className="h-4 w-4" />
                      By Station
                    </Button>
                    <Button
                      variant={reportType === 'weekly' ? 'default' : 'outline'}
                      onClick={() => setReportType('weekly')}
                      className="gap-2"
                    >
                      <BarChart3 className="h-4 w-4" />
                      Weekly Consumption
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Fleet Report */}
              {reportType === 'fleet' && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Truck className="h-5 w-5" />
                          Fleet Consumption Report
                        </CardTitle>
                        <CardDescription>
                          {fleetReports.length} fleets with diesel records
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="gap-2">
                              <Download className="h-4 w-4" />
                              Export All Fleets
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                const exportRecords: DieselExportRecord[] = truckRecords.map(r => ({
                                  id: r.id,
                                  date: r.date,
                                  fleet_number: r.fleet_number,
                                  driver_name: r.driver_name,
                                  fuel_station: r.fuel_station,
                                  litres_filled: r.litres_filled,
                                  cost_per_litre: r.cost_per_litre,
                                  total_cost: r.total_cost,
                                  currency: r.currency,
                                  km_reading: r.km_reading,
                                  previous_km_reading: r.previous_km_reading,
                                  distance_travelled: r.distance_travelled,
                                  km_per_litre: r.km_per_litre,
                                  trip_id: r.trip_id,
                                  debrief_signed: r.debrief_signed,
                                  debrief_signed_by: r.debrief_signed_by,
                                  debrief_date: r.debrief_date,
                                  notes: r.notes,
                                }));
                                generateAllFleetsDieselPDF(exportRecords);
                              }}
                              className="gap-2"
                            >
                              <FileText className="h-4 w-4" />
                              Export All as PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                const exportRecords: DieselExportRecord[] = truckRecords.map(r => ({
                                  id: r.id,
                                  date: r.date,
                                  fleet_number: r.fleet_number,
                                  driver_name: r.driver_name,
                                  fuel_station: r.fuel_station,
                                  litres_filled: r.litres_filled,
                                  cost_per_litre: r.cost_per_litre,
                                  total_cost: r.total_cost,
                                  currency: r.currency,
                                  km_reading: r.km_reading,
                                  previous_km_reading: r.previous_km_reading,
                                  distance_travelled: r.distance_travelled,
                                  km_per_litre: r.km_per_litre,
                                  trip_id: r.trip_id,
                                  debrief_signed: r.debrief_signed,
                                  debrief_signed_by: r.debrief_signed_by,
                                  debrief_date: r.debrief_date,
                                  notes: r.notes,
                                }));
                                generateAllFleetsDieselExcel(exportRecords);
                              }}
                              className="gap-2"
                            >
                              <FileSpreadsheet className="h-4 w-4" />
                              Export All as Excel
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {fleetReports.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left p-3 font-medium">Fleet</th>
                              <th className="text-right p-3 font-medium">Total Litres</th>
                              <th className="text-right p-3 font-medium">Total Cost</th>
                              <th className="text-right p-3 font-medium">Distance (km)</th>
                              <th className="text-right p-3 font-medium">Avg km/L</th>
                              <th className="text-right p-3 font-medium">Fills</th>
                              <th className="text-left p-3 font-medium">Drivers</th>
                              <th className="text-center p-3 font-medium">Export</th>
                            </tr>
                          </thead>
                          <tbody>
                            {fleetReports.map((report) => {
                              const norm = getNormForFleet(report.fleet);
                              const isLow = norm && report.avgKmPerLitre < norm.min_acceptable;
                              return (
                                <tr key={report.fleet} className="border-b hover:bg-muted/50">
                                  <td className="p-3 font-medium">{report.fleet}</td>
                                  <td className="p-3 text-right">{formatNumber(report.totalLitres)} L</td>
                                  <td className="p-3 text-right">
                                    {report.totalCostZAR > 0 && <div>{formatCurrency(report.totalCostZAR, 'ZAR')}</div>}
                                    {report.totalCostUSD > 0 && <div className="text-xs text-muted-foreground">{formatCurrency(report.totalCostUSD, 'USD')}</div>}
                                  </td>
                                  <td className="p-3 text-right">{formatNumber(report.totalDistance)}</td>
                                  <td className={`p-3 text-right font-medium ${isLow ? 'text-destructive' : 'text-success'}`}>
                                    {formatNumber(report.avgKmPerLitre, 2)}
                                  </td>
                                  <td className="p-3 text-right">{report.fillCount}</td>
                                  <td className="p-3">
                                    <div className="flex flex-wrap gap-1">
                                      {report.drivers.slice(0, 3).map(d => (
                                        <Badge key={d} variant="secondary" className="text-xs">{d}</Badge>
                                      ))}
                                      {report.drivers.length > 3 && (
                                        <Badge variant="outline" className="text-xs">+{report.drivers.length - 3}</Badge>
                                      )}
                                    </div>
                                  </td>
                                  <td className="p-3">
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-8 gap-1">
                                          <Download className="h-3 w-3" />
                                          <ChevronDown className="h-3 w-3" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem
                                          onClick={() => {
                                            const exportRecords: DieselExportRecord[] = truckRecords.map(r => ({
                                              id: r.id,
                                              date: r.date,
                                              fleet_number: r.fleet_number,
                                              driver_name: r.driver_name,
                                              fuel_station: r.fuel_station,
                                              litres_filled: r.litres_filled,
                                              cost_per_litre: r.cost_per_litre,
                                              total_cost: r.total_cost,
                                              currency: r.currency,
                                              km_reading: r.km_reading,
                                              previous_km_reading: r.previous_km_reading,
                                              distance_travelled: r.distance_travelled,
                                              km_per_litre: r.km_per_litre,
                                              trip_id: r.trip_id,
                                              debrief_signed: r.debrief_signed,
                                              debrief_signed_by: r.debrief_signed_by,
                                              debrief_date: r.debrief_date,
                                              notes: r.notes,
                                            }));
                                            generateFleetDieselPDF({
                                              fleetNumber: report.fleet,
                                              records: exportRecords,
                                            });
                                          }}
                                          className="gap-2"
                                        >
                                          <FileText className="h-4 w-4" />
                                          Export PDF
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onClick={() => {
                                            const exportRecords: DieselExportRecord[] = truckRecords.map(r => ({
                                              id: r.id,
                                              date: r.date,
                                              fleet_number: r.fleet_number,
                                              driver_name: r.driver_name,
                                              fuel_station: r.fuel_station,
                                              litres_filled: r.litres_filled,
                                              cost_per_litre: r.cost_per_litre,
                                              total_cost: r.total_cost,
                                              currency: r.currency,
                                              km_reading: r.km_reading,
                                              previous_km_reading: r.previous_km_reading,
                                              distance_travelled: r.distance_travelled,
                                              km_per_litre: r.km_per_litre,
                                              trip_id: r.trip_id,
                                              debrief_signed: r.debrief_signed,
                                              debrief_signed_by: r.debrief_signed_by,
                                              debrief_date: r.debrief_date,
                                              notes: r.notes,
                                            }));
                                            generateFleetDieselExcel({
                                              fleetNumber: report.fleet,
                                              records: exportRecords,
                                            });
                                          }}
                                          className="gap-2"
                                        >
                                          <FileSpreadsheet className="h-4 w-4" />
                                          Export Excel
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot>
                            <tr className="bg-muted/50 font-medium">
                              <td className="p-3">Total</td>
                              <td className="p-3 text-right">{formatNumber(fleetReports.reduce((s, r) => s + r.totalLitres, 0))} L</td>
                              <td className="p-3 text-right">
                                {formatCurrency(fleetReports.reduce((s, r) => s + r.totalCostZAR, 0), 'ZAR')}
                              </td>
                              <td className="p-3 text-right">{formatNumber(fleetReports.reduce((s, r) => s + r.totalDistance, 0))}</td>
                              <td className="p-3 text-right">—</td>
                              <td className="p-3 text-right">{fleetReports.reduce((s, r) => s + r.fillCount, 0)}</td>
                              <td className="p-3"></td>
                              <td className="p-3"></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">No diesel records to report</p>
                      </div>
                    )}

                    {reeferFleetReports.length > 0 && (
                      <div className="mt-8">
                        <div className="flex items-center gap-2 mb-3">
                          <Snowflake className="h-4 w-4 text-cyan-500" />
                          <h4 className="font-semibold">Reefer Fleets (L/hr)</h4>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left p-3 font-medium">Fleet</th>
                                <th className="text-right p-3 font-medium">Total Litres</th>
                                <th className="text-right p-3 font-medium">Total Cost</th>
                                <th className="text-right p-3 font-medium">Fills</th>
                                <th className="text-left p-3 font-medium">Drivers</th>
                              </tr>
                            </thead>
                            <tbody>
                              {reeferFleetReports.map((report) => (
                                <tr key={report.fleet} className="border-b hover:bg-muted/50">
                                  <td className="p-3 font-medium">{report.fleet}</td>
                                  <td className="p-3 text-right">{formatNumber(report.totalLitres)} L</td>
                                  <td className="p-3 text-right">
                                    {report.totalCostZAR > 0 && <div>{formatCurrency(report.totalCostZAR, 'ZAR')}</div>}
                                    {report.totalCostUSD > 0 && <div className="text-xs text-muted-foreground">{formatCurrency(report.totalCostUSD, 'USD')}</div>}
                                  </td>
                                  <td className="p-3 text-right">{report.fillCount}</td>
                                  <td className="p-3">
                                    <div className="flex flex-wrap gap-1">
                                      {report.drivers.slice(0, 3).map(d => (
                                        <Badge key={d} variant="secondary" className="text-xs">{d}</Badge>
                                      ))}
                                      {report.drivers.length > 3 && (
                                        <Badge variant="outline" className="text-xs">+{report.drivers.length - 3}</Badge>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="bg-muted/50 font-medium">
                                <td className="p-3">Total</td>
                                <td className="p-3 text-right">{formatNumber(reeferFleetReports.reduce((s, r) => s + r.totalLitres, 0))} L</td>
                                <td className="p-3 text-right">
                                  {formatCurrency(reeferFleetReports.reduce((s, r) => s + r.totalCostZAR, 0), 'ZAR')}
                                </td>
                                <td className="p-3 text-right">{reeferFleetReports.reduce((s, r) => s + r.fillCount, 0)}</td>
                                <td className="p-3"></td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Driver Report */}
              {reportType === 'driver' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Driver Consumption Report
                    </CardTitle>
                    <CardDescription>
                      {driverReports.length} drivers with diesel records
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {driverReports.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left p-3 font-medium">Driver</th>
                              <th className="text-right p-3 font-medium">Total Litres</th>
                              <th className="text-right p-3 font-medium">Total Cost</th>
                              <th className="text-right p-3 font-medium">Distance (km)</th>
                              <th className="text-right p-3 font-medium">Avg km/L</th>
                              <th className="text-right p-3 font-medium">Fills</th>
                              <th className="text-right p-3 font-medium">Last Fill</th>
                            </tr>
                          </thead>
                          <tbody>
                            {driverReports.map((report) => (
                              <tr key={report.driver} className="border-b hover:bg-muted/50">
                                <td className="p-3 font-medium">{report.driver}</td>
                                <td className="p-3 text-right">{formatNumber(report.totalLitres)} L</td>
                                <td className="p-3 text-right">
                                  {report.totalCostZAR > 0 && <div>{formatCurrency(report.totalCostZAR, 'ZAR')}</div>}
                                  {report.totalCostUSD > 0 && <div className="text-xs text-muted-foreground">{formatCurrency(report.totalCostUSD, 'USD')}</div>}
                                </td>
                                <td className="p-3 text-right">{formatNumber(report.totalDistance)}</td>
                                <td className="p-3 text-right font-medium">
                                  {report.avgKmPerLitre > 0 ? formatNumber(report.avgKmPerLitre, 2) : '—'}
                                </td>
                                <td className="p-3 text-right">{report.fillCount}</td>
                                <td className="p-3 text-right text-muted-foreground">{formatDate(report.lastFillDate)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="bg-muted/50 font-medium">
                              <td className="p-3">Total</td>
                              <td className="p-3 text-right">{formatNumber(driverReports.reduce((s, r) => s + r.totalLitres, 0))} L</td>
                              <td className="p-3 text-right">
                                {formatCurrency(driverReports.reduce((s, r) => s + r.totalCostZAR, 0), 'ZAR')}
                              </td>
                              <td className="p-3 text-right">{formatNumber(driverReports.reduce((s, r) => s + r.totalDistance, 0))}</td>
                              <td className="p-3 text-right">—</td>
                              <td className="p-3 text-right">{driverReports.reduce((s, r) => s + r.fillCount, 0)}</td>
                              <td className="p-3"></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">No diesel records to report</p>
                      </div>
                    )}

                    {reeferDriverReports.length > 0 && (
                      <div className="mt-8">
                        <div className="flex items-center gap-2 mb-3">
                          <Snowflake className="h-4 w-4 text-cyan-500" />
                          <h4 className="font-semibold">Reefer Drivers (L/hr)</h4>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left p-3 font-medium">Driver</th>
                                <th className="text-right p-3 font-medium">Total Litres</th>
                                <th className="text-right p-3 font-medium">Total Cost</th>
                                <th className="text-right p-3 font-medium">Fills</th>
                                <th className="text-right p-3 font-medium">Last Fill</th>
                                <th className="text-left p-3 font-medium">Fleets</th>
                              </tr>
                            </thead>
                            <tbody>
                              {reeferDriverReports.map((report) => (
                                <tr key={report.driver} className="border-b hover:bg-muted/50">
                                  <td className="p-3 font-medium">{report.driver}</td>
                                  <td className="p-3 text-right">{formatNumber(report.totalLitres)} L</td>
                                  <td className="p-3 text-right">
                                    {report.totalCostZAR > 0 && <div>{formatCurrency(report.totalCostZAR, 'ZAR')}</div>}
                                    {report.totalCostUSD > 0 && <div className="text-xs text-muted-foreground">{formatCurrency(report.totalCostUSD, 'USD')}</div>}
                                  </td>
                                  <td className="p-3 text-right">{report.fillCount}</td>
                                  <td className="p-3 text-right text-muted-foreground">{formatDate(report.lastFillDate)}</td>
                                  <td className="p-3">
                                    <div className="flex flex-wrap gap-1">
                                      {report.fleets.slice(0, 3).map(fleet => (
                                        <Badge key={fleet} variant="secondary" className="text-xs">{fleet}</Badge>
                                      ))}
                                      {report.fleets.length > 3 && (
                                        <Badge variant="outline" className="text-xs">+{report.fleets.length - 3}</Badge>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="bg-muted/50 font-medium">
                                <td className="p-3">Total</td>
                                <td className="p-3 text-right">{formatNumber(reeferDriverReports.reduce((s, r) => s + r.totalLitres, 0))} L</td>
                                <td className="p-3 text-right">
                                  {formatCurrency(reeferDriverReports.reduce((s, r) => s + r.totalCostZAR, 0), 'ZAR')}
                                </td>
                                <td className="p-3 text-right">{reeferDriverReports.reduce((s, r) => s + r.fillCount, 0)}</td>
                                <td className="p-3"></td>
                                <td className="p-3"></td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Station Report */}
              {reportType === 'station' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Fuel className="h-5 w-5" />
                      Filling Station Report
                    </CardTitle>
                    <CardDescription>
                      {stationReports.length} filling stations used
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {stationReports.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left p-3 font-medium">Station</th>
                              <th className="text-right p-3 font-medium">Total Litres</th>
                              <th className="text-right p-3 font-medium">Total Cost</th>
                              <th className="text-right p-3 font-medium">Avg Cost/L</th>
                              <th className="text-right p-3 font-medium">Fills</th>
                              <th className="text-left p-3 font-medium">Fleets Served</th>
                            </tr>
                          </thead>
                          <tbody>
                            {stationReports.map((report) => (
                              <tr key={report.station} className="border-b hover:bg-muted/50">
                                <td className="p-3 font-medium">{report.station}</td>
                                <td className="p-3 text-right">{formatNumber(report.totalLitres)} L</td>
                                <td className="p-3 text-right">
                                  {report.totalCostZAR > 0 && <div>{formatCurrency(report.totalCostZAR, 'ZAR')}</div>}
                                  {report.totalCostUSD > 0 && <div className="text-xs text-muted-foreground">{formatCurrency(report.totalCostUSD, 'USD')}</div>}
                                </td>
                                <td className="p-3 text-right">
                                  {formatNumber(report.avgCostPerLitre, 2)}/L
                                </td>
                                <td className="p-3 text-right">{report.fillCount}</td>
                                <td className="p-3">
                                  <div className="flex flex-wrap gap-1">
                                    {report.fleetsServed.slice(0, 4).map(f => (
                                      <Badge key={f} variant="secondary" className="text-xs">{f}</Badge>
                                    ))}
                                    {report.fleetsServed.length > 4 && (
                                      <Badge variant="outline" className="text-xs">+{report.fleetsServed.length - 4}</Badge>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="bg-muted/50 font-medium">
                              <td className="p-3">Total</td>
                              <td className="p-3 text-right">{formatNumber(stationReports.reduce((s, r) => s + r.totalLitres, 0))} L</td>
                              <td className="p-3 text-right">
                                {formatCurrency(stationReports.reduce((s, r) => s + r.totalCostZAR, 0), 'ZAR')}
                              </td>
                              <td className="p-3 text-right">—</td>
                              <td className="p-3 text-right">{stationReports.reduce((s, r) => s + r.fillCount, 0)}</td>
                              <td className="p-3"></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">No diesel records to report</p>
                      </div>
                    )}

                    {reeferStationReports.length > 0 && (
                      <div className="mt-8">
                        <div className="flex items-center gap-2 mb-3">
                          <Snowflake className="h-4 w-4 text-cyan-500" />
                          <h4 className="font-semibold">Reefer Stations (L/hr)</h4>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left p-3 font-medium">Station</th>
                                <th className="text-right p-3 font-medium">Total Litres</th>
                                <th className="text-right p-3 font-medium">Total Cost</th>
                                <th className="text-right p-3 font-medium">Avg Cost/L</th>
                                <th className="text-right p-3 font-medium">Fills</th>
                                <th className="text-left p-3 font-medium">Fleets Served</th>
                              </tr>
                            </thead>
                            <tbody>
                              {reeferStationReports.map((report) => (
                                <tr key={report.station} className="border-b hover:bg-muted/50">
                                  <td className="p-3 font-medium">{report.station}</td>
                                  <td className="p-3 text-right">{formatNumber(report.totalLitres)} L</td>
                                  <td className="p-3 text-right">
                                    {report.totalCostZAR > 0 && <div>{formatCurrency(report.totalCostZAR, 'ZAR')}</div>}
                                    {report.totalCostUSD > 0 && <div className="text-xs text-muted-foreground">{formatCurrency(report.totalCostUSD, 'USD')}</div>}
                                  </td>
                                  <td className="p-3 text-right">
                                    {formatNumber(report.avgCostPerLitre, 2)}/L
                                  </td>
                                  <td className="p-3 text-right">{report.fillCount}</td>
                                  <td className="p-3">
                                    <div className="flex flex-wrap gap-1">
                                      {report.fleetsServed.slice(0, 4).map(f => (
                                        <Badge key={f} variant="secondary" className="text-xs">{f}</Badge>
                                      ))}
                                      {report.fleetsServed.length > 4 && (
                                        <Badge variant="outline" className="text-xs">+{report.fleetsServed.length - 4}</Badge>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="bg-muted/50 font-medium">
                                <td className="p-3">Total</td>
                                <td className="p-3 text-right">{formatNumber(reeferStationReports.reduce((s, r) => s + r.totalLitres, 0))} L</td>
                                <td className="p-3 text-right">
                                  {formatCurrency(reeferStationReports.reduce((s, r) => s + r.totalCostZAR, 0), 'ZAR')}
                                </td>
                                <td className="p-3 text-right">—</td>
                                <td className="p-3 text-right">{reeferStationReports.reduce((s, r) => s + r.fillCount, 0)}</td>
                                <td className="p-3"></td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Weekly Consumption Report */}
              {reportType === 'weekly' && (
                <div className="space-y-4">
                  {weeklyReports.length > 0 ? (
                    weeklyReports.map((weekReport) => {
                      const isExpanded = expandedReportWeeks.has(weekReport.weekStart);
                      return (
                        <Collapsible key={weekReport.weekStart} open={isExpanded} onOpenChange={() => toggleReportWeekExpanded(weekReport.weekStart)}>
                          <Card>
                            <CollapsibleTrigger asChild>
                              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <ChevronRight className={`h-5 w-5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                    <div>
                                      <CardTitle className="flex items-center gap-2 text-lg">
                                        <BarChart3 className="h-5 w-5" />
                                        Week {weekReport.weekNumber} — {weekReport.weekLabel}
                                      </CardTitle>
                                      <CardDescription className="mt-1">
                                        {formatNumber(weekReport.grandTotal.totalLitres)} L | {formatNumber(weekReport.grandTotal.totalKm)} km |{' '}
                                        {weekReport.grandTotal.consumption !== null && <span className="font-medium">{formatNumber(weekReport.grandTotal.consumption, 2)} km/L</span>}
                                        {weekReport.grandTotal.totalCostZAR > 0 && ` | ${formatCurrency(weekReport.grandTotal.totalCostZAR, 'ZAR')}`}
                                        {weekReport.grandTotal.totalCostUSD > 0 && ` | ${formatCurrency(weekReport.grandTotal.totalCostUSD, 'USD')}`}
                                      </CardDescription>
                                    </div>
                                  </div>
                                </div>
                              </CardHeader>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <CardContent>
                                <div className="space-y-6">
                                  {weekReport.sections.map((section) => (
                                    <div key={section.name} className="border rounded-lg p-4">
                                      <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                                        {section.name === 'Reefers (L/H)' && <Snowflake className="h-4 w-4 text-blue-500" />}
                                        {section.name === '30 Ton Trucks' && <Truck className="h-4 w-4 text-orange-500" />}
                                        {section.name === 'Farm Lmv' && <Truck className="h-4 w-4 text-green-500" />}
                                        {(section.name === 'Bulawayo Truck' || section.name === 'Nyamagay Truck') && <Truck className="h-4 w-4 text-purple-500" />}
                                        {section.name}
                                        {section.sectionTotal.consumption !== null && (
                                          <Badge variant="secondary" className="ml-2">
                                            Avg: {formatNumber(section.sectionTotal.consumption, 2)} km/L
                                          </Badge>
                                        )}
                                      </h4>
                                      <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                          <thead>
                                            <tr className="border-b bg-muted/30">
                                              <th className="text-left p-2 font-medium">Fleet</th>
                                              <th className="text-right p-2 font-medium">Litres</th>
                                              <th className="text-right p-2 font-medium">Km</th>
                                              <th className="text-right p-2 font-medium">
                                                {section.isReeferSection ? 'L/H' : 'km/L'}
                                              </th>
                                              <th className="text-right p-2 font-medium">Cost</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {section.data.map((fleetData) => (
                                              <tr key={fleetData.fleet} className="border-b hover:bg-muted/50">
                                                <td className="p-2 font-medium">{fleetData.fleet}</td>
                                                <td className="p-2 text-right">
                                                  {fleetData.totalLitres > 0 ? (
                                                    <span>{formatNumber(fleetData.totalLitres)} L</span>
                                                  ) : (
                                                    <span className="text-muted-foreground">—</span>
                                                  )}
                                                </td>
                                                <td className="p-2 text-right">
                                                  {fleetData.totalKm > 0 ? (
                                                    <span>{formatNumber(fleetData.totalKm)}</span>
                                                  ) : (
                                                    <span className="text-muted-foreground">—</span>
                                                  )}
                                                </td>
                                                <td className="p-2 text-right">
                                                  {fleetData.consumption !== null ? (
                                                    <span className="font-medium text-primary">{formatNumber(fleetData.consumption, 2)}</span>
                                                  ) : (
                                                    <span className="text-muted-foreground">—</span>
                                                  )}
                                                </td>
                                                <td className="p-2 text-right">
                                                  {(fleetData.totalCostZAR > 0 || fleetData.totalCostUSD > 0) ? (
                                                    <div>
                                                      {fleetData.totalCostZAR > 0 && <div>{formatCurrency(fleetData.totalCostZAR, 'ZAR')}</div>}
                                                      {fleetData.totalCostUSD > 0 && <div className="text-xs text-muted-foreground">{formatCurrency(fleetData.totalCostUSD, 'USD')}</div>}
                                                    </div>
                                                  ) : (
                                                    <span className="text-muted-foreground">—</span>
                                                  )}
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                          <tfoot>
                                            <tr className="bg-muted/50 font-medium">
                                              <td className="p-2">Section Total</td>
                                              <td className="p-2 text-right">{formatNumber(section.sectionTotal.totalLitres)} L</td>
                                              <td className="p-2 text-right">{formatNumber(section.sectionTotal.totalKm)}</td>
                                              <td className="p-2 text-right text-primary">
                                                {section.sectionTotal.consumption !== null ? formatNumber(section.sectionTotal.consumption, 2) : '—'}
                                              </td>
                                              <td className="p-2 text-right">
                                                {section.sectionTotal.totalCostZAR > 0 && <div>{formatCurrency(section.sectionTotal.totalCostZAR, 'ZAR')}</div>}
                                                {section.sectionTotal.totalCostUSD > 0 && <div className="text-xs text-muted-foreground">{formatCurrency(section.sectionTotal.totalCostUSD, 'USD')}</div>}
                                              </td>
                                            </tr>
                                          </tfoot>
                                        </table>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </CardContent>
                            </CollapsibleContent>
                          </Card>
                        </Collapsible>
                      );
                    })
                  ) : (
                    <Card>
                      <CardContent className="text-center py-12">
                        <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">No diesel records to report</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="norms">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Fuel Efficiency Norms</CardTitle>
                  <CardDescription>
                    Configure expected fuel consumption standards
                  </CardDescription>
                </div>
                <Button
                  onClick={() => {
                    setSelectedNorm(null);
                    setIsNormsModalOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Norm
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dieselNorms.length > 0 ? (
                    dieselNorms.map((norm) => (
                      <div key={norm.id} className="border rounded-lg p-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Fleet</p>
                            <p className="font-medium">{norm.fleet_number}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Expected</p>
                            <p className="font-medium">{formatNumber(norm.expected_km_per_litre, 2)} km/L</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Min</p>
                            <p className="font-medium">{formatNumber(norm.min_acceptable, 2)} km/L</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Max</p>
                            <p className="font-medium">{formatNumber(norm.max_acceptable, 2)} km/L</p>
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditNorm(norm)}
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteNorm(norm.id)}
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <Settings className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">No Fuel Norms Configured</h3>
                      <p className="text-muted-foreground mb-4">
                        Set fuel efficiency standards for your fleet
                      </p>
                      <Button
                        onClick={() => {
                          setSelectedNorm(null);
                          setIsNormsModalOpen(true);
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Norm
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="import">
            <Card>
              <CardHeader>
                <CardTitle>Import Diesel Data</CardTitle>
                <CardDescription>
                  Bulk import diesel records from CSV
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Import CSV File</h3>
                  <p className="text-muted-foreground mb-4">
                    Upload a CSV file with your diesel consumption data
                  </p>
                  <Button onClick={() => setIsImportModalOpen(true)}>
                    <Upload className="h-4 w-4 mr-2" />
                    Select File
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      {/* eslint-disable @typescript-eslint/no-explicit-any */}
      <ManualDieselEntryModal
        isOpen={isManualEntryOpen}
        onClose={() => {
          setIsManualEntryOpen(false);
          setSelectedRecord(null);
        }}
        onSave={handleManualSave}
        editRecord={selectedRecord as unknown as any}
      />

      <DieselImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImport}
      />

      <TripLinkageModal
        isOpen={isTripLinkageOpen}
        onClose={() => {
          setIsTripLinkageOpen(false);
          setSelectedRecord(null);
        }}
        dieselRecord={selectedRecord as unknown as any}
        trips={trips}
        onLinkToTrip={handleLinkToTrip}
        onUnlinkFromTrip={handleUnlinkFromTrip}
      />

      <ProbeVerificationModal
        isOpen={isProbeVerificationOpen}
        onClose={() => {
          setIsProbeVerificationOpen(false);
          setSelectedRecord(null);
        }}
        dieselRecord={selectedRecord as unknown as any}
        onVerify={handleProbeVerification}
      />

      <DieselDebriefModal
        isOpen={isDebriefOpen}
        onClose={() => {
          setIsDebriefOpen(false);
          setSelectedRecord(null);
        }}
        dieselRecord={selectedRecord as unknown as any}
        onDebrief={handleDebrief}
      />

      <DieselNormsModal
        isOpen={isNormsModalOpen}
        onClose={() => {
          setIsNormsModalOpen(false);
          setSelectedNorm(null);
        }}
        onSave={handleNormSave}
        editNorm={selectedNorm as unknown as any}
      />

      <DieselTransactionViewModal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedRecord(null);
        }}
        record={selectedRecord}
        linkedReeferRecords={linkedReeferRecords}
        onLinkTrip={() => {
          setIsViewModalOpen(false);
          setIsTripLinkageOpen(true);
        }}
        onLinkReefer={() => {
          setIsViewModalOpen(false);
          setIsReeferLinkageOpen(true);
        }}
        onDebrief={() => {
          setIsViewModalOpen(false);
          setIsDebriefOpen(true);
        }}
        onVerifyProbe={() => {
          setIsViewModalOpen(false);
          setIsProbeVerificationOpen(true);
        }}
      />

      <ReeferLinkageModal
        isOpen={isReeferLinkageOpen}
        onClose={() => {
          setIsReeferLinkageOpen(false);
          setSelectedRecord(null);
        }}
        dieselRecord={selectedRecord}
        linkedReeferRecords={linkedReeferRecords}
        onLinkComplete={() => {
          // Refetch reefer records will happen automatically via query invalidation
        }}
      />
      {/* eslint-enable @typescript-eslint/no-explicit-any */}
    </Layout>
  );
};

export default DieselManagement;