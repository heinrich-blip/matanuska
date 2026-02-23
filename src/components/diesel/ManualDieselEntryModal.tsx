import { Alert, AlertDescription } from '@/components/ui/alert';
import Button from '@/components/ui/button-variants';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/ui/date-picker';
import { DriverSelect } from '@/components/ui/driver-select';
import { Input, Select, TextArea } from '@/components/ui/form-elements';
import { Label } from '@/components/ui/label';
import Modal from '@/components/ui/modal';
import { REEFER_UNITS } from '@/constants/fleet';
import { useFleetNumberOptions } from '@/hooks/useFleetNumbers';
import { useDispenseFuel, useFuelBunkers } from '@/hooks/useFuelBunkers';
import { supabase } from '@/integrations/supabase/client';
import { AlertCircle, CheckCircle2, Clock, Loader2, Snowflake } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import FuelStationSelect from '../ui/fuel-station-select';

// Type definitions
interface TrailerFuelData {
  trailer_id: string;
  operating_hours: number;
  litres_per_hour: number;
  total_litres: number;
  fuel_cost: number;
}

interface DieselNorm {
  id: string;
  fleet_number: string;
  expected_km_per_litre: number;
  tolerance_percentage: number;
  min_acceptable: number;
  max_acceptable: number;
}

interface DieselRecord {
  id?: string;
  fleet_number: string;
  date: string;
  fuel_station: string;
  litres_filled: number;
  cost_per_litre: number | null;
  total_cost: number;
  km_reading: number;
  previous_km_reading: number | null;
  distance_travelled: number | null;
  driver_name: string;
  notes: string;
  currency: string;
  linked_trailers: string[] | null;
  trailer_fuel_data: TrailerFuelData[] | null;
  vehicle_litres_only: number;
  trailer_litres_total: number;
  vehicle_fuel_cost: number;
  trailer_fuel_cost: number;
  km_per_litre?: number;
  requires_debrief?: boolean;
  debrief_trigger_reason?: string;
}

interface ManualDieselEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (record: DieselRecord) => Promise<void>;
  editRecord?: DieselRecord | null;
}

const ManualDieselEntryModal = ({
  isOpen,
  onClose,
  onSave,
  editRecord,
}: ManualDieselEntryModalProps) => {
  const [formData, setFormData] = useState({
    fleet_number: '',
    date: new Date().toISOString().split('T')[0],
    fuel_station: '',
    litres_filled: '',
    cost_per_litre: '',
    total_cost: '',
    km_reading: '',
    driver_name: '',
    notes: '',
    currency: 'ZAR',
  });

  // Fuel source selection: 'station' or 'bunker'
  const [fuelSource, setFuelSource] = useState<'station' | 'bunker'>('station');
  const [selectedBunkerId, setSelectedBunkerId] = useState<string>('');

  // Fetch fuel bunkers
  const { data: bunkers = [], isLoading: isLoadingBunkers } = useFuelBunkers(true);
  const dispenseFuelMutation = useDispenseFuel();

  // Auto-fetched previous km reading from database
  const [previousKmReading, setPreviousKmReading] = useState<number | null>(null);
  const [previousKmDate, setPreviousKmDate] = useState<string | null>(null);
  const [isLoadingPreviousKm, setIsLoadingPreviousKm] = useState(false);

  // Diesel norm for the selected fleet
  const [dieselNorm, setDieselNorm] = useState<DieselNorm | null>(null);
  const [isLoadingNorm, setIsLoadingNorm] = useState(false);

  const [selectedTrailers, setSelectedTrailers] = useState<string[]>([]);
  const [trailerHours, setTrailerHours] = useState<Record<string, string>>({});
  const [trailerLitresPerHour, setTrailerLitresPerHour] = useState<Record<string, string>>({});
  const [trailerPreviousHours, setTrailerPreviousHours] = useState<Record<string, { hours: number | null; date: string | null }>>({});
  const [loadingReeferHours, setLoadingReeferHours] = useState<Record<string, boolean>>({});

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [operationSuccess, setOperationSuccess] = useState(false);

  // Function to fetch previous km reading from last fill-up
  const fetchPreviousKmReading = useCallback(async (fleetNumber: string, currentDate: string, excludeRecordId?: string) => {
    if (!fleetNumber || !currentDate) {
      setPreviousKmReading(null);
      setPreviousKmDate(null);
      return;
    }

    setIsLoadingPreviousKm(true);
    try {
      let query = supabase
        .from('diesel_records')
        .select('km_reading, date')
        .eq('fleet_number', fleetNumber)
        .lt('date', currentDate);

      // When editing, exclude the current record from the query
      if (excludeRecordId) {
        query = query.neq('id', excludeRecordId);
      }

      const { data, error } = await query
        .order('date', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        setPreviousKmReading(null);
        setPreviousKmDate(null);
      } else {
        setPreviousKmReading(data.km_reading);
        setPreviousKmDate(data.date);
      }
    } catch {
      setPreviousKmReading(null);
      setPreviousKmDate(null);
    } finally {
      setIsLoadingPreviousKm(false);
    }
  }, []);

  // Fetch previous km reading when fleet number or date changes
  useEffect(() => {
    if (formData.fleet_number && formData.date) {
      // Pass the edit record ID to exclude it from the query when editing
      fetchPreviousKmReading(formData.fleet_number, formData.date, editRecord?.id);
    }
  }, [formData.fleet_number, formData.date, editRecord?.id, fetchPreviousKmReading]);

  // Function to fetch diesel norm for fleet number
  const fetchDieselNorm = useCallback(async (fleetNumber: string) => {
    if (!fleetNumber) {
      setDieselNorm(null);
      return;
    }

    setIsLoadingNorm(true);
    try {
      const { data, error } = await supabase
        .from('diesel_norms')
        .select('*')
        .eq('fleet_number', fleetNumber)
        .single();

      if (error || !data) {
        setDieselNorm(null);
      } else {
        setDieselNorm(data);
      }
    } catch {
      setDieselNorm(null);
    } finally {
      setIsLoadingNorm(false);
    }
  }, []);

  // Fetch diesel norm when fleet number changes
  useEffect(() => {
    if (formData.fleet_number) {
      fetchDieselNorm(formData.fleet_number);
    }
  }, [formData.fleet_number, fetchDieselNorm]);

  // Function to fetch previous operating hours for a reefer unit
  const fetchPreviousReeferHours = useCallback(async (reeferUnit: string, currentDate: string) => {
    if (!reeferUnit || !currentDate) {
      setTrailerPreviousHours((prev) => ({
        ...prev,
        [reeferUnit]: { hours: null, date: null },
      }));
      return;
    }

    setLoadingReeferHours((prev) => ({ ...prev, [reeferUnit]: true }));
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('reefer_diesel_records')
        .select('operating_hours, date')
        .eq('reefer_unit', reeferUnit)
        .lt('date', currentDate)
        .order('date', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        setTrailerPreviousHours((prev) => ({
          ...prev,
          [reeferUnit]: { hours: null, date: null },
        }));
      } else {
        setTrailerPreviousHours((prev) => ({
          ...prev,
          [reeferUnit]: { hours: data.operating_hours, date: data.date },
        }));
      }
    } catch {
      setTrailerPreviousHours((prev) => ({
        ...prev,
        [reeferUnit]: { hours: null, date: null },
      }));
    } finally {
      setLoadingReeferHours((prev) => ({ ...prev, [reeferUnit]: false }));
    }
  }, []);

  // Fetch previous hours for selected trailers when date changes
  useEffect(() => {
    if (formData.date && selectedTrailers.length > 0) {
      selectedTrailers.forEach((trailer) => {
        fetchPreviousReeferHours(trailer, formData.date);
      });
    }
  }, [formData.date, selectedTrailers, fetchPreviousReeferHours]);

  // Helper to check if consumption exceeds norm
  const checkNormViolation = (kmPerLitre: number): { exceeds: boolean; reason: string } => {
    if (!dieselNorm) {
      return { exceeds: false, reason: '' };
    }

    if (kmPerLitre < dieselNorm.min_acceptable) {
      const variance = ((dieselNorm.expected_km_per_litre - kmPerLitre) / dieselNorm.expected_km_per_litre * 100).toFixed(1);
      return {
        exceeds: true,
        reason: `Consumption below minimum acceptable (${kmPerLitre.toFixed(2)} km/L vs min ${dieselNorm.min_acceptable.toFixed(2)} km/L). ${variance}% below expected norm of ${dieselNorm.expected_km_per_litre.toFixed(2)} km/L.`
      };
    }

    if (kmPerLitre > dieselNorm.max_acceptable) {
      // This is actually good performance, but might indicate a data issue
      return { exceeds: false, reason: '' };
    }

    return { exceeds: false, reason: '' };
  };

  useEffect(() => {
    if (editRecord && isOpen) {
      setFormData({
        fleet_number: editRecord.fleet_number || '',
        date: editRecord.date || new Date().toISOString().split('T')[0],
        fuel_station: editRecord.fuel_station || '',
        litres_filled: editRecord.litres_filled?.toString() || '',
        cost_per_litre: editRecord.cost_per_litre?.toString() || '',
        total_cost: editRecord.total_cost?.toString() || '',
        km_reading: editRecord.km_reading?.toString() || '',
        driver_name: editRecord.driver_name || '',
        notes: editRecord.notes || '',
        currency: editRecord.currency || 'ZAR',
      });
      // When editing, use the stored previous_km_reading
      setPreviousKmReading(editRecord.previous_km_reading || null);
      setPreviousKmDate(null); // We don't store this date when editing
      setSelectedTrailers(editRecord.linked_trailers || []);
      // Reset fuel source to station when editing (bunker transactions can't be edited)
      setFuelSource('station');
      setSelectedBunkerId('');

      // Load trailer fuel data if editing
      const hours: Record<string, string> = {};
      const lph: Record<string, string> = {};
      if (editRecord.trailer_fuel_data) {
        editRecord.trailer_fuel_data.forEach((data: TrailerFuelData) => {
          hours[data.trailer_id] = data.operating_hours.toString();
          lph[data.trailer_id] = data.litres_per_hour.toString();
        });
      }
      setTrailerHours(hours);
      setTrailerLitresPerHour(lph);
    } else if (isOpen) {
      setFormData({
        fleet_number: '',
        date: new Date().toISOString().split('T')[0],
        fuel_station: '',
        litres_filled: '',
        cost_per_litre: '',
        total_cost: '',
        km_reading: '',
        driver_name: '',
        notes: '',
        currency: 'ZAR',
      });
      setPreviousKmReading(null);
      setPreviousKmDate(null);
      setSelectedTrailers([]);
      setTrailerHours({});
      setTrailerLitresPerHour({});
      setTrailerPreviousHours({});
      setLoadingReeferHours({});
      setErrors({});
      setOperationError(null);
      setOperationSuccess(false);
      setFuelSource('station');
      setSelectedBunkerId('');
    }
  }, [editRecord, isOpen]);

  useEffect(() => {
    if (formData.litres_filled && formData.cost_per_litre) {
      const total = parseFloat(formData.litres_filled) * parseFloat(formData.cost_per_litre);
      if (!isNaN(total)) {
        setFormData(prev => ({ ...prev, total_cost: total.toFixed(2) }));
      }
    }
  }, [formData.litres_filled, formData.cost_per_litre]);

  // Auto-fill cost per litre from bunker when bunker is selected
  useEffect(() => {
    if (fuelSource === 'bunker' && selectedBunkerId) {
      const bunker = bunkers.find(b => b.id === selectedBunkerId);
      if (bunker?.unit_cost) {
        setFormData(prev => ({ ...prev, cost_per_litre: bunker.unit_cost?.toString() || '' }));
      }
    }
  }, [fuelSource, selectedBunkerId, bunkers]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.fleet_number) newErrors.fleet_number = 'Fleet number is required';
    if (!formData.date) newErrors.date = 'Date is required';

    // Validate fuel source
    if (fuelSource === 'station') {
      if (!formData.fuel_station) newErrors.fuel_station = 'Fuel station is required';
    } else if (fuelSource === 'bunker') {
      if (!selectedBunkerId) newErrors.bunker = 'Please select a bunker';
      // Check bunker has enough fuel
      const selectedBunker = bunkers.find(b => b.id === selectedBunkerId);
      if (selectedBunker && formData.litres_filled) {
        const litresNeeded = parseFloat(formData.litres_filled);
        if (litresNeeded > selectedBunker.current_level_liters) {
          newErrors.litres_filled = `Bunker only has ${selectedBunker.current_level_liters.toFixed(1)}L available`;
        }
      }
    }

    if (!formData.litres_filled || parseFloat(formData.litres_filled) <= 0) {
      newErrors.litres_filled = newErrors.litres_filled || 'Valid litres filled is required';
    }
    if (!formData.total_cost || parseFloat(formData.total_cost) <= 0) {
      newErrors.total_cost = 'Valid total cost is required';
    }
    if (!formData.km_reading || parseInt(formData.km_reading) <= 0) {
      newErrors.km_reading = 'Valid km reading is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setIsProcessing(true);
    setOperationError(null);

    try {
      const litresFilled = parseFloat(formData.litres_filled);
      const costPerLitre = formData.cost_per_litre === '' ? null : parseFloat(formData.cost_per_litre);

      // If using bunker, dispense fuel first
      let bunkerDispenseResult = null;
      if (fuelSource === 'bunker' && selectedBunkerId) {
        const selectedBunker = bunkers?.find(b => b.id === selectedBunkerId);
        if (selectedBunker && selectedBunker.current_level_liters !== null && litresFilled > selectedBunker.current_level_liters) {
          throw new Error(`Insufficient fuel in bunker. Available: ${selectedBunker.current_level_liters?.toFixed(0)}L, Requested: ${litresFilled}L`);
        }

        bunkerDispenseResult = await dispenseFuelMutation.mutateAsync({
          bunker_id: selectedBunkerId,
          quantity_liters: litresFilled,
          vehicle_fleet_number: formData.fleet_number,
          driver_name: formData.driver_name || undefined,
          odometer_reading: formData.km_reading ? parseInt(formData.km_reading) : undefined,
          notes: formData.notes || undefined,
        });

        if (!bunkerDispenseResult.success) {
          throw new Error('Failed to dispense fuel from bunker');
        }
      }

      // Calculate trailer fuel consumption
      const trailerFuelData: TrailerFuelData[] = selectedTrailers.map(trailerId => {
        const hours = parseFloat(trailerHours[trailerId] || '0');
        const lph = parseFloat(trailerLitresPerHour[trailerId] || '0');
        const totalLitres = hours * lph;
        const fuelCost = totalLitres * (costPerLitre ?? 0);

        return {
          trailer_id: trailerId,
          operating_hours: hours,
          litres_per_hour: lph,
          total_litres: totalLitres,
          fuel_cost: fuelCost,
        };
      });

      const trailerLitresTotal = trailerFuelData.reduce((sum, t) => sum + t.total_litres, 0);
      const trailerFuelCost = trailerFuelData.reduce((sum, t) => sum + t.fuel_cost, 0);
      const vehicleLitresOnly = litresFilled - trailerLitresTotal;
      const vehicleFuelCost = vehicleLitresOnly * (costPerLitre ?? 0);

      // Determine fuel station name (bunker name if from bunker)
      let fuelStationName = formData.fuel_station;
      if (fuelSource === 'bunker' && selectedBunkerId) {
        const selectedBunker = bunkers?.find(b => b.id === selectedBunkerId);
        fuelStationName = selectedBunker ? `Bunker: ${selectedBunker.name} (${selectedBunker.location})` : 'Bunker';
      }

      const recordData: DieselRecord = {
        fleet_number: formData.fleet_number,
        date: formData.date,
        fuel_station: fuelStationName,
        litres_filled: litresFilled,
        cost_per_litre: costPerLitre,
        total_cost: parseFloat(formData.total_cost),
        km_reading: parseInt(formData.km_reading),
        previous_km_reading: previousKmReading,
        distance_travelled: previousKmReading && formData.km_reading
          ? parseInt(formData.km_reading) - previousKmReading
          : null,
        driver_name: formData.driver_name,
        notes: fuelSource === 'bunker' && bunkerDispenseResult
          ? `${formData.notes ? formData.notes + ' | ' : ''}Bunker level after: ${bunkerDispenseResult.new_bunker_level?.toFixed(0)}L`
          : formData.notes,
        currency: formData.currency,
        linked_trailers: selectedTrailers.length > 0 ? selectedTrailers : null,
        trailer_fuel_data: trailerFuelData.length > 0 ? trailerFuelData : null,
        vehicle_litres_only: vehicleLitresOnly,
        trailer_litres_total: trailerLitresTotal,
        vehicle_fuel_cost: vehicleFuelCost,
        trailer_fuel_cost: trailerFuelCost,
      };

      // Calculate vehicle km/L using only vehicle fuel
      if (recordData.distance_travelled && vehicleLitresOnly > 0) {
        recordData.km_per_litre = recordData.distance_travelled / vehicleLitresOnly;

        // Check if consumption exceeds norm and requires debrief
        const normCheck = checkNormViolation(recordData.km_per_litre);
        if (normCheck.exceeds) {
          recordData.requires_debrief = true;
          recordData.debrief_trigger_reason = normCheck.reason;
        }
      }

      await onSave(editRecord ? { ...recordData, id: editRecord.id } : recordData);
      setOperationSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : 'Failed to save diesel record');
    } finally {
      setIsProcessing(false);
    }
  };

  const { options: dynamicFleetOptions } = useFleetNumberOptions();
  const fleetOptions = [
    { label: 'Select Fleet Number', value: '' },
    ...dynamicFleetOptions
  ];
  const currencyOptions = [
    { label: 'ZAR', value: 'ZAR' },
    { label: 'USD', value: 'USD' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editRecord ? 'Edit Diesel Record' : 'Manual Diesel Entry'}
      maxWidth="2xl"
    >
      <div className="flex flex-col">
        <div className="flex-1 overflow-y-auto space-y-4 pr-2 max-h-[60vh]">
          {operationSuccess && (
          <Alert className="bg-success/10 border-success">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <AlertDescription className="text-success">
              Diesel record saved successfully!
            </AlertDescription>
          </Alert>
        )}

        {operationError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{operationError}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Fleet Number"
            value={formData.fleet_number}
            onChange={(e) => setFormData({ ...formData, fleet_number: e.target.value })}
            options={fleetOptions}
            error={errors.fleet_number}
            disabled={isProcessing}
          />

          <div className="space-y-2">
            <Label>Date</Label>
            <DatePicker
              value={formData.date}
              onChange={(date) => {
                if (date) {
                  // Use local date formatting to avoid timezone issues
                  const year = date.getFullYear();
                  const month = String(date.getMonth() + 1).padStart(2, '0');
                  const day = String(date.getDate()).padStart(2, '0');
                  setFormData({ ...formData, date: `${year}-${month}-${day}` });
                } else {
                  setFormData({ ...formData, date: '' });
                }
              }}
              disabled={isProcessing}
              placeholder="Select date"
            />
            {errors.date && <p className="text-sm text-destructive">{errors.date}</p>}
          </div>

          {/* Fuel Source Selection */}
          <div className="md:col-span-2 space-y-3">
            <label className="text-sm font-medium text-foreground">Fuel Source</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="fuelSource"
                  value="station"
                  checked={fuelSource === 'station'}
                  onChange={() => {
                    setFuelSource('station');
                    setSelectedBunkerId('');
                  }}
                  disabled={isProcessing}
                  className="w-4 h-4 text-primary"
                />
                <span className="text-sm">Filling Station</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="fuelSource"
                  value="bunker"
                  checked={fuelSource === 'bunker'}
                  onChange={() => setFuelSource('bunker')}
                  disabled={isProcessing}
                  className="w-4 h-4 text-primary"
                />
                <span className="text-sm">Fuel Bunker</span>
              </label>
            </div>
          </div>

          {fuelSource === 'station' ? (
            <div className="space-y-2">
              <Label>Filling Station</Label>
              <FuelStationSelect
                value={formData.fuel_station}
                onValueChange={(value) => setFormData({ ...formData, fuel_station: value })}
                onPriceChange={(price, currency) => {
                  if (price !== null && !formData.cost_per_litre) {
                    // Auto-fill price if not already set
                    setFormData(prev => ({
                      ...prev,
                      cost_per_litre: price.toString(),
                      currency: currency,
                    }));
                  }
                }}
                error={errors.fuel_station}
                disabled={isProcessing}
                placeholder="Select or add filling station..."
              />
            </div>
          ) : (
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Select Bunker</label>
              <select
                value={selectedBunkerId}
                onChange={(e) => setSelectedBunkerId(e.target.value)}
                disabled={isProcessing || isLoadingBunkers}
                className="w-full px-3 py-2 border rounded-md bg-background text-foreground"
              >
                <option value="">Select a bunker...</option>
                {bunkers?.map((bunker) => (
                  <option key={bunker.id} value={bunker.id}>
                    {bunker.name} - {bunker.location} ({bunker.current_level_liters?.toFixed(0) || 0}L available)
                  </option>
                ))}
              </select>
              {errors.bunker && (
                <p className="text-sm text-destructive">{errors.bunker}</p>
              )}
              {selectedBunkerId && bunkers && (
                <p className="text-xs text-muted-foreground">
                  Available: {bunkers.find(b => b.id === selectedBunkerId)?.current_level_liters?.toFixed(0) || 0}L
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>Driver</Label>
            <DriverSelect
              value={formData.driver_name}
              onValueChange={(value) => setFormData({ ...formData, driver_name: value })}
              placeholder="Select driver"
              allowCreate={true}
              disabled={isProcessing}
            />
          </div>

          <Input
            label="Litres Filled"
            type="number"
            step="0.01"
            value={formData.litres_filled}
            onChange={(e) => setFormData({ ...formData, litres_filled: e.target.value })}
            error={errors.litres_filled}
            disabled={isProcessing}
          />

          <Input
            label="Cost per Litre"
            type="number"
            step="0.01"
            value={formData.cost_per_litre}
            onChange={(e) => setFormData({ ...formData, cost_per_litre: e.target.value })}
            disabled={isProcessing}
          />

          <div className="flex items-end gap-2">
            <Select
              label="Currency"
              value={formData.currency}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              options={currencyOptions}
              disabled={isProcessing}
              className="w-24"
            />
            <Input
              label="Total Cost"
              type="number"
              step="0.01"
              value={formData.total_cost}
              onChange={(e) => setFormData({ ...formData, total_cost: e.target.value })}
              error={errors.total_cost}
              disabled={isProcessing}
              className="flex-1"
            />
          </div>

          <Input
            label="KM Reading"
            type="number"
            value={formData.km_reading}
            onChange={(e) => setFormData({ ...formData, km_reading: e.target.value })}
            error={errors.km_reading}
            disabled={isProcessing}
          />

          {/* Previous KM Reading - Auto-fetched from last fill-up */}
          <div className="space-y-2 md:col-span-2">
            <Label className="text-sm font-medium">Previous KM Reading</Label>
            <div className="flex items-center h-10 px-3 border rounded-md bg-muted/50">
              {isLoadingPreviousKm ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Loading...</span>
                </div>
              ) : previousKmReading !== null ? (
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{previousKmReading.toLocaleString()} km</span>
                  {previousKmDate && (
                    <span className="text-xs text-muted-foreground">
                      from {new Date(previousKmDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
              ) : formData.fleet_number ? (
                <span className="text-sm text-muted-foreground italic">No previous fill-up found</span>
              ) : (
                <span className="text-sm text-muted-foreground italic">Select a fleet number first</span>
              )}
            </div>
            {previousKmReading !== null && formData.km_reading && (
              <p className="text-xs text-muted-foreground">
                Distance: {(parseInt(formData.km_reading) - previousKmReading).toLocaleString()} km
              </p>
            )}
          </div>
        </div>

        {/* Efficiency Preview & Norm Check */}
        {previousKmReading !== null && formData.km_reading && formData.litres_filled && (
          (() => {
            const distance = parseInt(formData.km_reading) - previousKmReading;
            const litres = parseFloat(formData.litres_filled);
            // Calculate trailer litres if any are selected
            const trailerLitres = selectedTrailers.reduce((sum, trailerId) => {
              const hours = parseFloat(trailerHours[trailerId] || '0');
              const lph = parseFloat(trailerLitresPerHour[trailerId] || '0');
              return sum + (hours * lph);
            }, 0);
            const vehicleLitres = litres - trailerLitres;
            const kmPerLitre = vehicleLitres > 0 && distance > 0 ? distance / vehicleLitres : 0;
            const normCheck = kmPerLitre > 0 ? checkNormViolation(kmPerLitre) : { exceeds: false, reason: '' };

            return (
              <div className={`p-4 rounded-lg border-2 ${normCheck.exceeds ? 'border-destructive bg-destructive/10' : 'border-green-500 bg-green-500/10'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Calculated Efficiency</span>
                  <span className={`text-lg font-bold ${normCheck.exceeds ? 'text-destructive' : 'text-green-600'}`}>
                    {kmPerLitre.toFixed(2)} km/L
                  </span>
                </div>

                {dieselNorm ? (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Fleet Norm: {dieselNorm.expected_km_per_litre.toFixed(2)} km/L</span>
                      <span>Range: {dieselNorm.min_acceptable.toFixed(2)} - {dieselNorm.max_acceptable.toFixed(2)} km/L</span>
                    </div>
                    {normCheck.exceeds ? (
                      <Alert variant="destructive" className="py-2">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          <strong>⚠️ Debrief Required:</strong> {normCheck.reason}
                        </AlertDescription>
                      </Alert>
                    ) : kmPerLitre > 0 && (
                      <div className="flex items-center gap-2 text-xs text-green-600">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Consumption within acceptable range</span>
                      </div>
                    )}
                  </div>
                ) : isLoadingNorm ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Loading norm...</span>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">
                    No diesel norm configured for this fleet number
                  </p>
                )}
              </div>
            );
          })()
        )}

        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Snowflake className="h-4 w-4 text-blue-500" />
            Linked Reefers with Fuel Consumption (Optional)
          </Label>
          <p className="text-xs text-muted-foreground">
            Select reefer units that were fueled along with this truck. Previous operating hours will be auto-fetched to calculate L/hr.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {REEFER_UNITS.map(trailer => {
              const prevHoursData = trailerPreviousHours[trailer];
              const isLoadingPrevHours = loadingReeferHours[trailer];

              return (
              <div key={trailer} className="border rounded-lg p-3 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={selectedTrailers.includes(trailer)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedTrailers([...selectedTrailers, trailer]);
                        // Trigger fetch for previous hours
                        if (formData.date) {
                          fetchPreviousReeferHours(trailer, formData.date);
                        }
                      } else {
                        setSelectedTrailers(selectedTrailers.filter(t => t !== trailer));
                        const newHours = { ...trailerHours };
                        const newLph = { ...trailerLitresPerHour };
                        delete newHours[trailer];
                        delete newLph[trailer];
                        setTrailerHours(newHours);
                        setTrailerLitresPerHour(newLph);
                      }
                    }}
                    disabled={isProcessing}
                  />
                  <span className="text-sm font-medium">{trailer}</span>
                </label>

                {selectedTrailers.includes(trailer) && (
                  <div className="space-y-3 ml-6">
                    {/* Previous Hours (Auto-fetched) */}
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Previous Hour Meter (Auto-fetched)
                      </Label>
                      <div className="flex items-center h-9 px-3 border rounded-md bg-muted/50 text-sm">
                        {isLoadingPrevHours ? (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <span className="text-xs">Loading...</span>
                          </div>
                        ) : prevHoursData?.hours !== null && prevHoursData?.hours !== undefined ? (
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{prevHoursData.hours.toLocaleString()} hrs</span>
                            {prevHoursData.date && (
                              <span className="text-[10px] text-muted-foreground">
                                from {new Date(prevHoursData.date).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">No previous fill-up found</span>
                        )}
                      </div>
                    </div>

                    {/* Current Hour Meter Input */}
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="e.g., 1250.5"
                      value={trailerHours[trailer] || ''}
                      onChange={(e) => {
                        setTrailerHours({ ...trailerHours, [trailer]: e.target.value });
                        // Auto-calculate L/hr if we have previous hours and litres filled
                        if (trailerLitresPerHour[trailer]) {
                          // Keep existing L/hr
                        } else if (prevHoursData?.hours !== null && e.target.value) {
                          const hoursOperated = parseFloat(e.target.value) - (prevHoursData.hours || 0);
                          if (hoursOperated > 0) {
                            // Auto-calculate based on a reasonable assumption
                          }
                        }
                      }}
                      label="Current Hour Meter *"
                      disabled={isProcessing}
                    />

                    {/* Hours Operated and L/hr Display */}
                    {trailerHours[trailer] && prevHoursData?.hours !== null && prevHoursData?.hours !== undefined && (
                      <div className="p-2 rounded-md border-2 border-blue-500 bg-blue-500/10">
                        <div className="flex items-center justify-between text-xs">
                          <span>Hours Operated:</span>
                          <span className="font-medium">
                            {(parseFloat(trailerHours[trailer]) - prevHoursData.hours).toFixed(1)} hrs
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Litres Filled Input */}
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="e.g., 50"
                      value={trailerLitresPerHour[trailer] || ''}
                      onChange={(e) => setTrailerLitresPerHour({ ...trailerLitresPerHour, [trailer]: e.target.value })}
                      label="Litres Filled *"
                      disabled={isProcessing}
                    />

                    {/* L/hr Calculation */}
                    {trailerHours[trailer] && trailerLitresPerHour[trailer] && prevHoursData?.hours !== null && prevHoursData?.hours !== undefined && (
                      (() => {
                        const hoursOperated = parseFloat(trailerHours[trailer]) - prevHoursData.hours;
                        const litresFilled = parseFloat(trailerLitresPerHour[trailer]);
                        const litresPerHour = hoursOperated > 0 ? litresFilled / hoursOperated : 0;

                        return (
                          <div className="p-2 rounded-md border-2 border-green-500 bg-green-500/10">
                            <div className="flex items-center justify-between">
                              <span className="text-xs">Consumption Rate:</span>
                              <span className="font-bold text-green-600">
                                {litresPerHour.toFixed(2)} L/hr
                              </span>
                            </div>
                          </div>
                        );
                      })()
                    )}

                    {/* Manual L/hr entry when no previous hours */}
                    {(!prevHoursData || prevHoursData.hours === null) && trailerHours[trailer] && trailerLitresPerHour[trailer] && (
                      <p className="text-xs text-muted-foreground">
                        Total: {parseFloat(trailerLitresPerHour[trailer]).toFixed(2)} L
                        <br />
                        <span className="text-amber-600">⚠️ No previous reading - L/hr cannot be auto-calculated</span>
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
            })}
          </div>
        </div>

          <TextArea
            label="Notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            disabled={isProcessing}
            rows={3}
          />
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t mt-4 flex-shrink-0">
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isProcessing}>
            {isProcessing ? 'Saving...' : editRecord ? 'Update' : 'Save'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ManualDieselEntryModal;
