import Layout from "@/components/Layout";
import { AddScheduleDialog } from "@/components/maintenance/AddScheduleDialog";
import { MaintenanceAnalytics } from "@/components/maintenance/MaintenanceAnalytics";
import { MaintenanceCalendar } from "@/components/maintenance/MaintenanceCalendar";
import { MaintenanceHistory } from "@/components/maintenance/MaintenanceHistory";
import { NotificationSettings } from "@/components/maintenance/NotificationSettings";
import { OverdueAlerts } from "@/components/maintenance/OverdueAlerts";
import { ScheduleList } from "@/components/maintenance/ScheduleList";
import { TemplateManager } from "@/components/maintenance/TemplateManager";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import type { MaintenanceSchedule } from "@/types/maintenance";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, BarChart3, Bell, Calendar, CheckCircle, Clock, FileText, History, Plus } from "lucide-react";
import { useState } from "react";

export default function MaintenanceScheduling() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const { data: schedules, refetch } = useQuery({
    queryKey: ["maintenance-schedules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_schedules")
        .select("*")
        .eq("is_active", true)
        .order("next_due_date", { ascending: true });

      if (error) throw error;
      // Cast schedule_type to the correct type
      return (data || []).map(schedule => ({
        ...schedule,
        schedule_type: schedule.schedule_type as MaintenanceSchedule['schedule_type']
      })) as MaintenanceSchedule[];
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["maintenance-stats"],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];

      const { data: dueToday } = await supabase
        .from("maintenance_schedules")
        .select("id")
        .eq("is_active", true)
        .eq("next_due_date", today);

      const { data: overdue } = await supabase
        .from("maintenance_schedules")
        .select("id")
        .eq("is_active", true)
        .lt("next_due_date", today);

      const { data: completed } = await supabase
        .from("maintenance_schedule_history")
        .select("id")
        .eq("status", "completed")
        .gte("completed_date", new Date(new Date().setDate(1)).toISOString());

      return {
        total: schedules?.length || 0,
        dueToday: dueToday?.length || 0,
        overdue: overdue?.length || 0,
        completedThisMonth: completed?.length || 0,
      };
    },
    enabled: !!schedules,
  });

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Maintenance Scheduling</h1>
            <p className="text-muted-foreground">
              Manage and track vehicle maintenance schedules
            </p>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Schedule
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Schedules</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total || 0}</div>
              <p className="text-xs text-muted-foreground">Active schedules</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Due Today</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.dueToday || 0}</div>
              <p className="text-xs text-muted-foreground">Tasks due today</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue</CardTitle>
              <AlertCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats?.overdue || 0}</div>
              <p className="text-xs text-muted-foreground">Require attention</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.completedThisMonth || 0}</div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="list" className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-7">
            <TabsTrigger value="list">Schedule List</TabsTrigger>
            <TabsTrigger value="calendar">Calendar View</TabsTrigger>
            <TabsTrigger value="overdue">
              Overdue
              {stats && stats.overdue > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {stats.overdue}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="w-4 h-4 mr-2" />
              History
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <BarChart3 className="w-4 h-4 mr-2" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="templates">
              <FileText className="w-4 h-4 mr-2" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <Bell className="w-4 h-4 mr-2" />
              Alerts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-4">
            <ScheduleList schedules={schedules || []} onUpdate={refetch} />
          </TabsContent>

          <TabsContent value="calendar">
            <MaintenanceCalendar schedules={schedules || []} onUpdate={refetch} />
          </TabsContent>

          <TabsContent value="overdue">
            <OverdueAlerts />
          </TabsContent>

          <TabsContent value="history">
            <MaintenanceHistory />
          </TabsContent>

          <TabsContent value="analytics">
            <MaintenanceAnalytics />
          </TabsContent>

          <TabsContent value="templates">
            <TemplateManager />
          </TabsContent>

          <TabsContent value="notifications">
            <NotificationSettings />
          </TabsContent>
        </Tabs>

        <AddScheduleDialog
          open={isAddDialogOpen}
          onOpenChange={setIsAddDialogOpen}
          onSuccess={refetch}
        />
      </div>
    </Layout>
  );
}