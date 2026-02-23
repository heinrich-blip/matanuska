import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { MaintenanceSchedule } from "@/types/maintenance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, isSameDay, isToday, isPast, addMonths, subMonths } from "date-fns";
import { ScheduleDetailsDialog } from "./ScheduleDetailsDialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { CalendarDays, List, AlertCircle, CheckCircle, Clock, ChevronLeft, ChevronRight, Grid3x3 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { MaintenanceGridCalendar } from "./MaintenanceGridCalendar";

interface MaintenanceCalendarProps {
  schedules: MaintenanceSchedule[];
  onUpdate: () => void;
}

export function MaintenanceCalendar({ schedules, onUpdate }: MaintenanceCalendarProps) {
  const isMobile = useIsMobile();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedSchedule, setSelectedSchedule] = useState<MaintenanceSchedule | null>(null);
  const [viewMode, setViewMode] = useState<"day-picker" | "grid" | "list">("day-picker");
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  const schedulesOnSelectedDate = schedules.filter(schedule => {
    if (!schedule.next_due_date || !selectedDate) return false;
    return isSameDay(new Date(schedule.next_due_date), selectedDate);
  });

  const getScheduleStatus = (schedule: MaintenanceSchedule) => {
    if (!schedule.next_due_date) return 'inactive';
    const dueDate = new Date(schedule.next_due_date);
    if (isPast(dueDate) && !isToday(dueDate)) return 'overdue';
    if (isToday(dueDate)) return 'due-today';
    return 'upcoming';
  };

  const overdueDates = schedules
    .filter(s => s.next_due_date && getScheduleStatus(s) === 'overdue')
    .map(s => new Date(s.next_due_date!));

  const dueTodayDates = schedules
    .filter(s => s.next_due_date && getScheduleStatus(s) === 'due-today')
    .map(s => new Date(s.next_due_date!));

  const upcomingDates = schedules
    .filter(s => s.next_due_date && getScheduleStatus(s) === 'upcoming')
    .map(s => new Date(s.next_due_date!));

  // Enhanced modifiers with priority-based color coding
  const criticalOverdueDates = schedules
    .filter(s => s.next_due_date && getScheduleStatus(s) === 'overdue' && s.priority === 'critical')
    .map(s => new Date(s.next_due_date!));

  const highOverdueDates = schedules
    .filter(s => s.next_due_date && getScheduleStatus(s) === 'overdue' && ['high', 'medium', 'low'].includes(s.priority))
    .map(s => new Date(s.next_due_date!));

  const criticalDueTodayDates = schedules
    .filter(s => s.next_due_date && getScheduleStatus(s) === 'due-today' && s.priority === 'critical')
    .map(s => new Date(s.next_due_date!));

  const highDueTodayDates = schedules
    .filter(s => s.next_due_date && getScheduleStatus(s) === 'due-today' && ['high', 'medium'].includes(s.priority))
    .map(s => new Date(s.next_due_date!));

  const normalDueTodayDates = schedules
    .filter(s => s.next_due_date && getScheduleStatus(s) === 'due-today' && s.priority === 'low')
    .map(s => new Date(s.next_due_date!));

  const criticalUpcomingDates = schedules
    .filter(s => s.next_due_date && getScheduleStatus(s) === 'upcoming' && s.priority === 'critical')
    .map(s => new Date(s.next_due_date!));

  const highUpcomingDates = schedules
    .filter(s => s.next_due_date && getScheduleStatus(s) === 'upcoming' && ['high', 'medium'].includes(s.priority))
    .map(s => new Date(s.next_due_date!));

  const normalUpcomingDates = schedules
    .filter(s => s.next_due_date && getScheduleStatus(s) === 'upcoming' && s.priority === 'low')
    .map(s => new Date(s.next_due_date!));

  const modifiers = {
    criticalOverdue: criticalOverdueDates,
    highOverdue: highOverdueDates,
    criticalDueToday: criticalDueTodayDates,
    highDueToday: highDueTodayDates,
    normalDueToday: normalDueTodayDates,
    criticalUpcoming: criticalUpcomingDates,
    highUpcoming: highUpcomingDates,
    normalUpcoming: normalUpcomingDates,
  };

  const modifiersClassNames = {
    criticalOverdue: "bg-destructive text-destructive-foreground font-bold hover:bg-destructive/90 ring-2 ring-destructive ring-offset-2",
    highOverdue: "bg-destructive/70 text-destructive-foreground font-bold hover:bg-destructive/80",
    criticalDueToday: "bg-warning text-warning-foreground font-bold hover:bg-warning/90 ring-2 ring-warning ring-offset-2",
    highDueToday: "bg-warning/70 text-warning-foreground font-bold hover:bg-warning/80",
    normalDueToday: "bg-warning/50 text-warning-foreground font-semibold hover:bg-warning/60",
    criticalUpcoming: "bg-primary text-primary-foreground font-bold hover:bg-primary/90 ring-2 ring-primary ring-offset-2",
    highUpcoming: "bg-primary/60 text-primary-foreground font-semibold hover:bg-primary/70",
    normalUpcoming: "bg-primary/30 text-primary-foreground hover:bg-primary/40",
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

  const getStatusBadge = (schedule: MaintenanceSchedule) => {
    const status = getScheduleStatus(schedule);
    switch (status) {
      case 'overdue':
        return <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" />Overdue</Badge>;
      case 'due-today':
        return <Badge variant="default" className="gap-1 bg-warning text-warning-foreground"><Clock className="h-3 w-3" />Due Today</Badge>;
      case 'upcoming':
        return <Badge variant="outline" className="gap-1"><CalendarDays className="h-3 w-3" />Upcoming</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "day-picker" | "grid" | "list")}>
          <TabsList>
            <TabsTrigger value="day-picker" className="gap-2">
              <CalendarDays className="h-4 w-4" />
              {!isMobile && "Day Picker"}
            </TabsTrigger>
            <TabsTrigger value="grid" className="gap-2">
              <Grid3x3 className="h-4 w-4" />
              {!isMobile && "Grid"}
            </TabsTrigger>
            <TabsTrigger value="list" className="gap-2">
              <List className="h-4 w-4" />
              {!isMobile && "List"}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <Card className="bg-muted/30 border-muted">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-4 text-xs flex-wrap">
              <div className="font-semibold text-foreground">Priority & Status:</div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded-sm bg-destructive ring-2 ring-destructive ring-offset-1" />
                <span className="text-foreground font-medium">Critical Overdue</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded-sm bg-destructive/70" />
                <span className="text-muted-foreground">Overdue</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded-sm bg-warning ring-2 ring-warning ring-offset-1" />
                <span className="text-foreground font-medium">Critical Due</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded-sm bg-warning/70" />
                <span className="text-muted-foreground">Due Today</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded-sm bg-primary ring-2 ring-primary ring-offset-1" />
                <span className="text-foreground font-medium">Critical Upcoming</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded-sm bg-primary/60" />
                <span className="text-muted-foreground">Upcoming</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grid view takes full width, other views use two columns */}
      <div className={cn("grid gap-4", viewMode === "grid" ? "lg:grid-cols-1" : "lg:grid-cols-[1.5fr,1fr]")}>
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10">
            <CardTitle className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-primary" />
                <span>
                  {viewMode === "day-picker" && "Maintenance Calendar"}
                  {viewMode === "grid" && "Calendar Grid"}
                  {viewMode === "list" && "Schedule Overview"}
                </span>
              </div>
              {isMobile && viewMode === "day-picker" && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-normal min-w-[100px] text-center">
                    {format(currentMonth, 'MMM yyyy')}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {viewMode === "day-picker" ? (
              <div className="flex justify-center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  month={currentMonth}
                  onMonthChange={setCurrentMonth}
                  modifiers={modifiers}
                  modifiersClassNames={modifiersClassNames}
                  className="rounded-lg border-2 shadow-sm scale-110 transform"
                  classNames={{
                    months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                    month: "space-y-4",
                    caption: "flex justify-center pt-1 relative items-center text-lg font-semibold",
                    caption_label: "text-base font-bold",
                    nav: "space-x-1 flex items-center",
                    nav_button: "h-8 w-8 bg-transparent hover:bg-accent rounded-md",
                    table: "w-full border-collapse space-y-1",
                    head_row: "flex",
                    head_cell: "text-muted-foreground rounded-md w-12 font-bold text-sm",
                    row: "flex w-full mt-2",
                    cell: "h-12 w-12 text-center text-base p-0 relative",
                    day: "h-12 w-12 p-0 font-semibold hover:bg-accent hover:text-accent-foreground rounded-md transition-all",
                    day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                    day_today: "bg-accent font-bold ring-2 ring-accent",
                    day_outside: "text-muted-foreground opacity-50",
                    day_disabled: "text-muted-foreground opacity-50",
                    day_hidden: "invisible",
                  }}
                />
              </div>
            ) : viewMode === "grid" ? (
              <MaintenanceGridCalendar
                schedules={schedules}
                onDateClick={(date) => setSelectedDate(date)}
                onEventClick={(schedule) => setSelectedSchedule(schedule)}
              />
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-destructive" />
                    <span className="font-semibold text-destructive">Overdue</span>
                  </div>
                  <Badge variant="destructive">{overdueDates.length}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-warning/10 border border-warning/20">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-warning" />
                    <span className="font-semibold text-warning">Due Today</span>
                  </div>
                  <Badge className="bg-warning text-warning-foreground">{dueTodayDates.length}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-5 w-5 text-primary" />
                    <span className="font-semibold text-primary">Upcoming</span>
                  </div>
                  <Badge variant="outline">{upcomingDates.length}</Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Selected Date Panel - Hide in grid view */}
        {viewMode !== "grid" && (

        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-secondary/5 to-secondary/10">
            <CardTitle className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-base">Selected Date</span>
                <Badge variant="outline" className="text-base px-3 py-1">{schedulesOnSelectedDate.length}</Badge>
              </div>
              <div className="text-sm font-normal text-muted-foreground">
                {selectedDate && format(selectedDate, "EEEE, MMMM dd, yyyy")}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {schedulesOnSelectedDate.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CheckCircle className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground font-medium">
                  No schedules for this date
                </p>
                <p className="text-sm text-muted-foreground/80 mt-1">
                  Select another date or create a new schedule
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {schedulesOnSelectedDate.map((schedule) => {
                  const status = getScheduleStatus(schedule);
                  return (
                    <Card
                      key={schedule.id}
                      className={cn(
                        "p-4 cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] border-l-4",
                        status === 'overdue' && schedule.priority === 'critical' && "border-l-destructive bg-destructive/10 border-destructive/50 shadow-md shadow-destructive/20",
                        status === 'overdue' && schedule.priority !== 'critical' && "border-l-destructive/70 bg-destructive/5 border-destructive/30",
                        status === 'due-today' && schedule.priority === 'critical' && "border-l-warning bg-warning/10 border-warning/50 shadow-md shadow-warning/20",
                        status === 'due-today' && ['high', 'medium'].includes(schedule.priority) && "border-l-warning/70 bg-warning/5 border-warning/30",
                        status === 'due-today' && schedule.priority === 'low' && "border-l-warning/50 bg-warning/5 border-warning/20",
                        status === 'upcoming' && schedule.priority === 'critical' && "border-l-primary bg-primary/10 border-primary/50 shadow-sm shadow-primary/10",
                        status === 'upcoming' && ['high', 'medium'].includes(schedule.priority) && "border-l-primary/60 bg-primary/5 border-primary/30",
                        status === 'upcoming' && schedule.priority === 'low' && "border-l-primary/30 bg-primary/5 border-primary/20"
                      )}
                      onClick={() => setSelectedSchedule(schedule)}
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-semibold flex-1 text-base">{schedule.title}</h4>
                          <div className="flex items-center gap-2 flex-wrap justify-end">
                            {getStatusBadge(schedule)}
                            <Badge 
                              variant={getPriorityColor(schedule.priority)} 
                              className={cn(
                                "capitalize font-semibold",
                                schedule.priority === 'critical' && "ring-2 ring-destructive/50 ring-offset-1"
                              )}
                            >
                              {schedule.priority}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {schedule.maintenance_type}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap text-sm">
                          <Badge variant="outline" className="capitalize">
                            {schedule.category}
                          </Badge>
                          {schedule.assigned_to && (
                            <span className="text-muted-foreground">
                              Assigned to: {schedule.assigned_to}
                            </span>
                          )}
                          {schedule.estimated_duration_hours && (
                            <span className="text-muted-foreground">
                              • {schedule.estimated_duration_hours}h estimated
                            </span>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
        )}
      </div>

      {selectedSchedule && (
        <ScheduleDetailsDialog
          schedule={selectedSchedule}
          open={!!selectedSchedule}
          onOpenChange={(open) => !open && setSelectedSchedule(null)}
          onUpdate={onUpdate}
        />
      )}
    </div>
  );
}
