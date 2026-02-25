import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Calendar, Clock, FileSpreadsheet, FileText, Gauge } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { toast } from "sonner";
import { CompleteMaintenanceDialog } from "./CompleteMaintenanceDialog";
import { MaintenanceSchedule } from "@/types/maintenance";
import { exportOverdueToPDF, exportOverdueToExcel } from "@/lib/maintenanceExport";
import { getVehicleLatestKm } from "@/lib/maintenanceKmTracking";

export function OverdueAlerts() {
  const [overdueSchedules, setOverdueSchedules] = useState<MaintenanceSchedule[]>([]);
  const [vehicleKmMap, setVehicleKmMap] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSchedule, setSelectedSchedule] = useState<MaintenanceSchedule | null>(null);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);

  const fetchOverdue = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch date-based overdue schedules
      const { data: dateOverdue, error: dateError } = await supabase
        .from("maintenance_schedules")
        .select("*")
        .eq("is_active", true)
        .eq("odometer_based", false)
        .lt("next_due_date", new Date().toISOString().split("T")[0])
        .order("priority", { ascending: false })
        .order("next_due_date", { ascending: true });

      if (dateError) throw dateError;

      // 2. Fetch ALL active KM-based schedules (they may have sentinel date 2099-12-31)
      const { data: kmSchedules, error: kmError } = await supabase
        .from("maintenance_schedules")
        .select("*")
        .eq("is_active", true)
        .eq("odometer_based", true);

      if (kmError) throw kmError;

      // 3. Get latest trip ending_km for each vehicle that has a KM schedule
      const kmVehicleIds = [...new Set((kmSchedules || []).filter(s => s.vehicle_id).map(s => s.vehicle_id as string))];
      const latestKmMap = await getVehicleLatestKm(kmVehicleIds);
      setVehicleKmMap(latestKmMap);

      // 4. Filter KM schedules that are actually overdue based on trip ending_km
      const kmOverdue = (kmSchedules || []).filter(s => {
        if (!s.vehicle_id || !s.odometer_interval_km) return false;
        const currentKm = latestKmMap[s.vehicle_id as string] || 0;
        const lastReading = (s.last_odometer_reading as number) || 0;
        const nextServiceKm = lastReading + (s.odometer_interval_km as number);
        return currentKm >= nextServiceKm;
      });

      // 5. Merge both lists (date overdue + KM overdue), deduplicate by ID
      const allOverdue = [...(dateOverdue || []), ...kmOverdue];
      const seen = new Set<string>();
      const deduped = allOverdue.filter(s => {
        if (seen.has(s.id)) return false;
        seen.add(s.id);
        return true;
      });

      setOverdueSchedules(deduped as MaintenanceSchedule[]);
    } catch (error) {
      console.error("Error fetching overdue schedules:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to load overdue schedules";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOverdue();

    // Auto-refresh every minute
    const interval = setInterval(fetchOverdue, 60000);
    return () => clearInterval(interval);
  }, []);

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      critical: "bg-red-500",
      high: "bg-orange-500",
      medium: "bg-yellow-500",
      low: "bg-blue-500",
    };
    return colors[priority] || "bg-gray-500";
  };

  const getDaysOverdue = (dueDate: string) => {
    return differenceInDays(new Date(), new Date(dueDate));
  };

  const handleComplete = (schedule: MaintenanceSchedule) => {
    setSelectedSchedule(schedule);
    setShowCompleteDialog(true);
  };

  const handleCompleted = () => {
    fetchOverdue();
    toast.success("Maintenance completed");
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">Loading overdue schedules...</div>
        </CardContent>
      </Card>
    );
  }

  if (overdueSchedules.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <div className="mb-2">✓ No overdue maintenance</div>
            <div className="text-sm">All maintenance tasks are up to date</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <CardTitle className="text-red-600">
                  {overdueSchedules.length} Overdue Maintenance Task{overdueSchedules.length !== 1 ? "s" : ""}
                </CardTitle>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    exportOverdueToPDF(overdueSchedules);
                    toast.success("PDF exported successfully");
                  }}
                  disabled={overdueSchedules.length === 0}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    exportOverdueToExcel(overdueSchedules);
                    toast.success("Excel exported successfully");
                  }}
                  disabled={overdueSchedules.length === 0}
                >
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Excel
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {overdueSchedules.map((schedule) => {
                const isKmBased = !!schedule.odometer_based;
                const daysOverdue = isKmBased ? 0 : getDaysOverdue(schedule.next_due_date!);
                // For KM-based: compute KM overdue info
                const currentVehicleKm = (schedule.vehicle_id && vehicleKmMap[schedule.vehicle_id]) || 0;
                const lastReading = schedule.last_odometer_reading || 0;
                const kmOverdueAmount = isKmBased && schedule.odometer_interval_km
                  ? currentVehicleKm - (lastReading + schedule.odometer_interval_km)
                  : 0;
                return (
                  <Card key={schedule.id} className="border-l-4 border-l-red-500">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center space-x-2">
                            <Badge className={getPriorityColor(schedule.priority)}>
                              {schedule.priority}
                            </Badge>
                            <Badge variant="outline">{schedule.category}</Badge>
                            {isKmBased && (
                              <Badge variant="secondary" className="text-xs">KM-based</Badge>
                            )}
                          </div>

                          <h3 className="font-semibold text-lg">{schedule.title}</h3>

                          {schedule.description && (
                            <p className="text-sm text-muted-foreground">{schedule.description}</p>
                          )}

                          <div className="flex items-center space-x-4 text-sm text-muted-foreground flex-wrap gap-y-1">
                            {isKmBased ? (
                              <>
                                <div className="flex items-center space-x-1 text-red-600 font-semibold">
                                  <Gauge className="w-4 h-4" />
                                  <span>{Math.abs(kmOverdueAmount).toLocaleString()} km overdue</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <span>Vehicle at {currentVehicleKm.toLocaleString()} km — service was due at {(lastReading + (schedule.odometer_interval_km || 0)).toLocaleString()} km</span>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="flex items-center space-x-1">
                                  <Calendar className="w-4 h-4" />
                                  <span>Due: {format(new Date(schedule.next_due_date!), "MMM dd, yyyy")}</span>
                                </div>
                                <div className="flex items-center space-x-1 text-red-600 font-semibold">
                                  <Clock className="w-4 h-4" />
                                  <span>{daysOverdue} day{daysOverdue !== 1 ? "s" : ""} overdue</span>
                                </div>
                              </>
                            )}
                          </div>

                          {schedule.assigned_to && (
                            <div className="text-sm">
                              <span className="text-muted-foreground">Assigned to:</span>{" "}
                              <span className="font-medium">{schedule.assigned_to}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col space-y-2 ml-4">
                          <Button
                            size="sm"
                            onClick={() => handleComplete(schedule)}
                          >
                            Complete
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                          >
                            Reschedule
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {selectedSchedule && (
        <CompleteMaintenanceDialog
          open={showCompleteDialog}
          onOpenChange={setShowCompleteDialog}
          schedule={selectedSchedule}
          onComplete={handleCompleted}
        />
      )}
    </>
  );
}
