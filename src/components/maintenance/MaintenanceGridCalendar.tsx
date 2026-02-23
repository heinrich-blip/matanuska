import { Button } from "@/components/ui/button";
import { MaintenanceSchedule } from "@/types/maintenance";
import { addMonths, eachDayOfInterval, endOfMonth, format, isSameDay, startOfMonth, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { CalendarDayCell } from "./CalendarDayCell";

interface MaintenanceGridCalendarProps {
  schedules: MaintenanceSchedule[];
  onDateClick: (date: Date) => void;
  onEventClick: (schedule: MaintenanceSchedule) => void;
}

export function MaintenanceGridCalendar({
  schedules,
  onDateClick,
  onEventClick
}: MaintenanceGridCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  const getEventsForDay = (date: Date): MaintenanceSchedule[] => {
    return schedules.filter(schedule => {
      if (!schedule.next_due_date) return false;
      return isSameDay(new Date(schedule.next_due_date), date);
    });
  };

  const generateCalendarDays = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const startDate = new Date(monthStart);
    startDate.setDate(startDate.getDate() - monthStart.getDay()); // Start from Sunday

    const endDate = new Date(monthEnd);
    const remainingDays = 6 - monthEnd.getDay();
    endDate.setDate(endDate.getDate() + remainingDays); // End on Saturday

    return eachDayOfInterval({ start: startDate, end: endDate });
  };

  const calendarDays = generateCalendarDays();

  return (
    <div className="space-y-4">
      {/* Header with navigation */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl md:text-2xl font-bold">
          {format(currentMonth, 'MMMM yyyy')}
        </h3>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentMonth(new Date())}
            className="hidden md:flex"
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="h-8 w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Header - Day names */}
      <div className="grid grid-cols-7 gap-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div
            key={day}
            className="p-2 text-center font-bold text-sm md:text-base text-muted-foreground"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((date, index) => {
          const day = date.getDate();
          const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
          const events = getEventsForDay(date);

          return (
            <CalendarDayCell
              key={index}
              day={day}
              date={date}
              isCurrentMonth={isCurrentMonth}
              events={events}
              onDateClick={onDateClick}
              onEventClick={onEventClick}
              maxEventsToShow={3}
            />
          );
        })}
      </div>
    </div>
  );
}
