import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { MaintenanceSchedule } from "@/types/maintenance";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

interface EditScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule: MaintenanceSchedule;
  onSuccess: () => void;
}

export function EditScheduleDialog({ open, onOpenChange, schedule, onSuccess }: EditScheduleDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const { data: vehicles = [], isLoading: vehiclesLoading } = useQuery({
    queryKey: ["vehicles", "active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("id, registration_number, fleet_number, vehicle_type")
        .eq("active", true)
        .order("fleet_number");
      if (error) throw error;
      return (data || []).filter(vehicle => vehicle.id && vehicle.id.trim() !== "");
    },
  });

  const { register, handleSubmit, watch, setValue, reset } = useForm({
    defaultValues: {
      vehicle_id: schedule.vehicle_id || "none",
      title: schedule.title || "",
      description: schedule.description || "",
      schedule_type: schedule.schedule_type || "one_time",
      frequency: schedule.frequency || "monthly",
      frequency_value: schedule.frequency_value || 1,
      category: schedule.category || "service",
      maintenance_type: schedule.maintenance_type || "",
      priority: schedule.priority || "medium",
      assigned_to: schedule.assigned_to || "",
      estimated_duration_hours: schedule.estimated_duration_hours || 0,
      auto_create_job_card: schedule.auto_create_job_card || false,
      odometer_based: schedule.odometer_based || false,
      odometer_interval_km: schedule.odometer_interval_km || 0,
      last_odometer_reading: schedule.last_odometer_reading || 0,
      notes: schedule.notes || "",
    },
  });

  // Reset form when schedule changes
  useEffect(() => {
    if (open && schedule) {
      reset({
        vehicle_id: schedule.vehicle_id || "none",
        title: schedule.title || "",
        description: schedule.description || "",
        schedule_type: schedule.schedule_type || "one_time",
        frequency: schedule.frequency || "monthly",
        frequency_value: schedule.frequency_value || 1,
        category: schedule.category || "service",
        maintenance_type: schedule.maintenance_type || "",
        priority: schedule.priority || "medium",
        assigned_to: schedule.assigned_to || "",
        estimated_duration_hours: schedule.estimated_duration_hours || 0,
        auto_create_job_card: schedule.auto_create_job_card || false,
        odometer_based: schedule.odometer_based || false,
        odometer_interval_km: schedule.odometer_interval_km || 0,
        last_odometer_reading: schedule.last_odometer_reading || 0,
        notes: schedule.notes || "",
      });
    }
  }, [open, schedule, reset]);

  const scheduleType = watch("schedule_type");
  const odometerBased = watch("odometer_based");
  const selectedVehicleId = watch("vehicle_id");
  const intervalKm = watch("odometer_interval_km");
  const lastOdometerReading = watch("last_odometer_reading");

  // Compute next service KM
  const nextServiceKm = odometerBased && intervalKm && lastOdometerReading
    ? lastOdometerReading + intervalKm
    : null;

  // Auto-populate last_odometer_reading from vehicle's current_odometer
  const { data: selectedVehicleData } = useQuery({
    queryKey: ["vehicle-odometer", selectedVehicleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("current_odometer")
        .eq("id", selectedVehicleId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!selectedVehicleId && selectedVehicleId !== "none",
  });

  const onSubmit = async (data: Record<string, unknown>) => {
    setLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateData: Record<string, any> = {
        title: data.title,
        description: data.description,
        schedule_type: data.schedule_type,
        frequency: data.frequency,
        frequency_value: data.frequency_value,
        category: data.category,
        maintenance_type: data.maintenance_type,
        service_type: data.maintenance_type || data.category || "service",
        priority: data.priority,
        assigned_to: data.assigned_to || null,
        estimated_duration_hours: data.estimated_duration_hours,
        auto_create_job_card: data.auto_create_job_card,
        odometer_based: data.odometer_based,
        odometer_interval_km: data.odometer_interval_km,
        last_odometer_reading: data.last_odometer_reading || 0,
        notes: data.notes || null,
        vehicle_id: data.vehicle_id === "none" ? null : data.vehicle_id,
      };

      // If NOT KM-based, clear odometer fields
      if (!data.odometer_based) {
        updateData.odometer_interval_km = null;
        updateData.last_odometer_reading = null;
      }

      const { error } = await supabase
        .from("maintenance_schedules")
        .update(updateData)
        .eq("id", schedule.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Maintenance schedule updated successfully",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Maintenance Schedule</DialogTitle>
          <DialogDescription>
            Update the schedule details below.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[600px] pr-4">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Title *</Label>
                <Input id="edit-title" {...register("title")} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-maintenance_type">Maintenance Type *</Label>
                <Input id="edit-maintenance_type" {...register("maintenance_type")} required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-vehicle_id">Vehicle</Label>
              <Select
                value={watch("vehicle_id")}
                onValueChange={(value) => setValue("vehicle_id", value)}
                disabled={vehiclesLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={vehiclesLoading ? "Loading vehicles..." : "Select vehicle (optional)"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Fleet-wide schedule)</SelectItem>
                  {vehicles.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      {vehicle.fleet_number || vehicle.registration_number} - {vehicle.registration_number}
                      {vehicle.vehicle_type && ` (${vehicle.vehicle_type})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea id="edit-description" {...register("description")} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-category">Category *</Label>
                <Select
                  value={watch("category")}
                  onValueChange={(value) => setValue("category", value as "inspection" | "service" | "repair" | "replacement" | "calibration")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inspection">Inspection</SelectItem>
                    <SelectItem value="service">Service</SelectItem>
                    <SelectItem value="repair">Repair</SelectItem>
                    <SelectItem value="replacement">Replacement</SelectItem>
                    <SelectItem value="calibration">Calibration</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-priority">Priority *</Label>
                <Select
                  value={watch("priority")}
                  onValueChange={(value) => setValue("priority", value as "low" | "medium" | "high" | "critical")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-schedule_type">Schedule Type *</Label>
                <Select
                  value={watch("schedule_type")}
                  onValueChange={(value) => setValue("schedule_type", value as "one_time" | "recurring")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="one_time">One Time</SelectItem>
                    <SelectItem value="recurring">Recurring</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {scheduleType === "recurring" && !odometerBased && (
                <div className="space-y-2">
                  <Label htmlFor="edit-frequency">Frequency *</Label>
                  <Select
                    value={watch("frequency") || "monthly"}
                    onValueChange={(value) => setValue("frequency", value as "daily" | "weekly" | "monthly" | "quarterly" | "yearly")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-assigned_to">Assigned To</Label>
              <Input id="edit-assigned_to" {...register("assigned_to")} />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="edit-auto_create_job_card"
                checked={watch("auto_create_job_card")}
                onCheckedChange={(checked) => setValue("auto_create_job_card", checked)}
              />
              <Label htmlFor="edit-auto_create_job_card">Auto-create job card when due</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="edit-odometer_based"
                checked={odometerBased}
                onCheckedChange={(checked) => setValue("odometer_based", checked)}
              />
              <Label htmlFor="edit-odometer_based">KM-based scheduling (instead of date)</Label>
            </div>

            {odometerBased && (
              <div className="space-y-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
                <p className="text-sm font-medium text-blue-800">KM-Based Schedule Configuration</p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="edit-last_odometer_reading">Previous / Last Service KM *</Label>
                    <Input
                      id="edit-last_odometer_reading"
                      type="number"
                      placeholder="KM at last service"
                      {...register("last_odometer_reading", { valueAsNumber: true })}
                    />
                    {selectedVehicleData?.current_odometer != null && (
                      <p className="text-xs text-muted-foreground">
                        Vehicle current odometer: {selectedVehicleData.current_odometer.toLocaleString()} km
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-odometer_interval_km">Service Interval (km) *</Label>
                    <Input
                      id="edit-odometer_interval_km"
                      type="number"
                      placeholder="e.g. 10000"
                      {...register("odometer_interval_km", { valueAsNumber: true })}
                    />
                  </div>
                </div>
                {nextServiceKm !== null && (
                  <div className="rounded-md bg-white p-3 border">
                    <p className="text-sm text-muted-foreground">Next Service Due At</p>
                    <p className="text-xl font-bold text-blue-700">{nextServiceKm.toLocaleString()} km</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      ({lastOdometerReading?.toLocaleString()} km + {intervalKm?.toLocaleString()} km interval)
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea id="edit-notes" {...register("notes")} />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
