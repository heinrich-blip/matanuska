import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { MaintenanceSchedule } from "@/types/maintenance";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { AlertCircle, Calendar, CheckCircle, Clock, Edit, Gauge, Smartphone, User, Wrench } from "lucide-react";
import { useState } from "react";
import { CreateJobCardFromScheduleDialog } from "../dialogs/CreateJobCardFromScheduleDialog";
import { EditScheduleDialog } from "./EditScheduleDialog";
import { MobileQuickComplete } from "./MobileQuickComplete";
import { Progress } from "@/components/ui/progress";
import { calculateKmStatus, getVehicleLatestKm } from "@/lib/maintenanceKmTracking";

interface ScheduleDetailsDialogProps {
  schedule: MaintenanceSchedule;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export function ScheduleDetailsDialog({
  schedule,
  open,
  onOpenChange,
  onUpdate,
}: ScheduleDetailsDialogProps) {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showCreateJobCard, setShowCreateJobCard] = useState(false);
  const [showMobileQuickComplete, setShowMobileQuickComplete] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  // Fetch vehicle KM for KM-based schedules (from trips + current_odometer)
  const { data: vehicleOdometer } = useQuery({
    queryKey: ["vehicle-km-from-trips", schedule.vehicle_id],
    queryFn: async () => {
      if (!schedule.vehicle_id) return null;
      const kmMap = await getVehicleLatestKm([schedule.vehicle_id]);
      const { data: vehicle } = await supabase
        .from("vehicles")
        .select("fleet_number, registration_number")
        .eq("id", schedule.vehicle_id)
        .single();
      return {
        current_odometer: kmMap[schedule.vehicle_id] || 0,
        fleet_number: vehicle?.fleet_number || null,
        registration_number: vehicle?.registration_number || null,
      };
    },
    enabled: open && !!schedule.vehicle_id && !!schedule.odometer_based,
  });

  const { data: history } = useQuery({
    queryKey: ["maintenance-history", schedule.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_schedule_history")
        .select("*")
        .eq("schedule_id", schedule.id)
        .order("scheduled_date", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const handleMarkComplete = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.from("maintenance_schedule_history").insert([
        {
          schedule_id: schedule.id,
          scheduled_date: schedule.next_due_date!,
          completed_date: new Date().toISOString(),
          status: "completed",
          completed_by: "System User",
        },
      ]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Maintenance marked as complete",
      });

      onUpdate();
      onOpenChange(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'default';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{schedule.title}</span>
            <Badge variant={getPriorityColor(schedule.priority)}>
              {schedule.priority}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[600px]">
          <Tabs defaultValue="details" className="w-full">
            <TabsList>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Schedule Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>Schedule Type</span>
                      </div>
                      <p className="font-medium capitalize">{schedule.schedule_type.replace('_', ' ')}</p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <AlertCircle className="h-4 w-4" />
                        <span>Category</span>
                      </div>
                      <p className="font-medium capitalize">{schedule.category}</p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>{schedule.odometer_based ? "Tracking" : "Next Due Date"}</span>
                      </div>
                      <p className="font-medium">
                        {schedule.odometer_based
                          ? "KM-based (see below)"
                          : schedule.next_due_date
                            ? format(new Date(schedule.next_due_date), "PPP")
                            : "Not scheduled"}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="h-4 w-4" />
                        <span>Assigned To</span>
                      </div>
                      <p className="font-medium">{schedule.assigned_to || "Unassigned"}</p>
                    </div>
                  </div>

                  {schedule.description && (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Description</p>
                      <p>{schedule.description}</p>
                    </div>
                  )}

                  {schedule.notes && (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Notes</p>
                      <p>{schedule.notes}</p>
                    </div>
                  )}

                  {/* KM Tracking Section */}
                  {schedule.odometer_based && schedule.odometer_interval_km && (() => {
                    const currentOdo = vehicleOdometer?.current_odometer || 0;
                    const lastReading = schedule.last_odometer_reading || 0;
                    const kmStatus = calculateKmStatus(schedule.odometer_interval_km, lastReading, currentOdo);
                    return (
                      <Card className={`border ${kmStatus.isOverdue ? 'border-red-300 bg-red-50' : kmStatus.isApproaching ? 'border-amber-300 bg-amber-50' : 'border-blue-200 bg-blue-50'}`}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Gauge className="h-4 w-4" />
                            KM-Based Tracking
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="grid gap-3 md:grid-cols-4">
                            <div>
                              <p className="text-xs text-muted-foreground">Interval</p>
                              <p className="font-semibold">{schedule.odometer_interval_km.toLocaleString()} km</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Last Service</p>
                              <p className="font-semibold">{lastReading.toLocaleString()} km</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Current Odometer</p>
                              <p className="font-semibold">{currentOdo.toLocaleString()} km</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Next Service At</p>
                              <p className="font-semibold">{kmStatus.nextServiceKm.toLocaleString()} km</p>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span>{kmStatus.progressPercent}% used</span>
                              <span className={kmStatus.isOverdue ? 'text-red-600 font-semibold' : kmStatus.isApproaching ? 'text-amber-600 font-semibold' : ''}>
                                {kmStatus.isOverdue
                                  ? `${Math.abs(kmStatus.remainingKm).toLocaleString()} km overdue`
                                  : `${kmStatus.remainingKm.toLocaleString()} km remaining`}
                              </span>
                            </div>
                            <Progress
                              value={kmStatus.progressPercent}
                              className={`h-3 ${kmStatus.isOverdue ? '[&>div]:bg-red-500' : kmStatus.isApproaching ? '[&>div]:bg-amber-500' : '[&>div]:bg-blue-500'}`}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })()}

                  <div className="flex gap-2 pt-4 flex-wrap">
                    <Button
                      variant="outline"
                      onClick={() => setShowEditDialog(true)}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Schedule
                    </Button>
                    {isMobile ? (
                      <Button onClick={() => setShowMobileQuickComplete(true)} disabled={!schedule.next_due_date}>
                        <Smartphone className="mr-2 h-4 w-4" />
                        Quick Complete
                      </Button>
                    ) : (
                      <Button onClick={handleMarkComplete} disabled={loading || !schedule.next_due_date}>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        {loading ? "Marking Complete..." : "Mark as Complete"}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      onClick={() => setShowCreateJobCard(true)}
                    >
                      <Wrench className="mr-2 h-4 w-4" />
                      Create Job Card
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history">
              <Card>
                <CardHeader>
                  <CardTitle>Maintenance History</CardTitle>
                </CardHeader>
                <CardContent>
                  {!history || history.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No maintenance history yet
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {history.map((entry) => (
                        <Card key={entry.id}>
                          <CardContent className="pt-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">
                                  {entry.completed_date
                                    ? format(new Date(entry.completed_date), "PPP")
                                    : "Not completed"}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Status: <Badge variant="outline">{entry.status}</Badge>
                                </p>
                              </div>
                              {entry.duration_hours && (
                                <div className="text-right">
                                  <p className="text-sm text-muted-foreground">Duration</p>
                                  <p className="font-medium">{entry.duration_hours} hours</p>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </ScrollArea>
      </DialogContent>

      <MobileQuickComplete
        open={showMobileQuickComplete}
        onOpenChange={setShowMobileQuickComplete}
        scheduleId={schedule.id}
        onSuccess={onUpdate}
      />

      <EditScheduleDialog
        schedule={schedule}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onSuccess={() => {
          onUpdate();
          onOpenChange(false);
        }}
      />

      <CreateJobCardFromScheduleDialog
        schedule={schedule}
        open={showCreateJobCard}
        onOpenChange={setShowCreateJobCard}
        onSuccess={() => {
          onUpdate();
          toast({
            title: "Success",
            description: "Job card created successfully",
          });
        }}
      />
    </Dialog>
  );
}
