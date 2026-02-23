import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Calendar, Clock } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { toast } from "sonner";
import { CompleteMaintenanceDialog } from "./CompleteMaintenanceDialog";
import { MaintenanceSchedule } from "@/types/maintenance";

export function OverdueAlerts() {
  const [overdueSchedules, setOverdueSchedules] = useState<MaintenanceSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSchedule, setSelectedSchedule] = useState<MaintenanceSchedule | null>(null);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);

  const fetchOverdue = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("maintenance_schedules")
        .select("*")
        .eq("is_active", true)
        .lt("next_due_date", new Date().toISOString().split("T")[0])
        .order("priority", { ascending: false })
        .order("next_due_date", { ascending: true });

      if (error) throw error;
      setOverdueSchedules(data as MaintenanceSchedule[] || []);
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
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <CardTitle className="text-red-600">
                {overdueSchedules.length} Overdue Maintenance Task{overdueSchedules.length !== 1 ? "s" : ""}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {overdueSchedules.map((schedule) => {
                const daysOverdue = getDaysOverdue(schedule.next_due_date!);
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
                          </div>

                          <h3 className="font-semibold text-lg">{schedule.title}</h3>

                          {schedule.description && (
                            <p className="text-sm text-muted-foreground">{schedule.description}</p>
                          )}

                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <div className="flex items-center space-x-1">
                              <Calendar className="w-4 h-4" />
                              <span>Due: {format(new Date(schedule.next_due_date!), "MMM dd, yyyy")}</span>
                            </div>
                            <div className="flex items-center space-x-1 text-red-600 font-semibold">
                              <Clock className="w-4 h-4" />
                              <span>{daysOverdue} day{daysOverdue !== 1 ? "s" : ""} overdue</span>
                            </div>
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
