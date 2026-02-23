import { MaintenanceSchedule } from "@/types/maintenance";
import { CalendarEventPill } from "./CalendarEventPill";
import { cn } from "@/lib/utils";
import { isToday } from "date-fns";

interface CalendarDayCellProps {
  day: number | null;
  date: Date | null;
  isCurrentMonth: boolean;
  events: MaintenanceSchedule[];
  onDateClick: (date: Date) => void;
  onEventClick: (schedule: MaintenanceSchedule) => void;
  maxEventsToShow?: number;
}

export function CalendarDayCell({
  day,
  date,
  isCurrentMonth,
  events,
  onDateClick,
  onEventClick,
  maxEventsToShow = 3
}: CalendarDayCellProps) {
  if (!day || !date) {
    return <div className="h-24 md:h-28 border border-border bg-muted/20" />;
  }

  const visibleEvents = events.slice(0, maxEventsToShow);
  const hiddenCount = events.length - maxEventsToShow;

  return (
    <div
      onClick={() => onDateClick(date)}
      className={cn(
        "h-24 md:h-28 border border-border p-1 md:p-2 overflow-hidden transition-colors cursor-pointer",
        isCurrentMonth ? "bg-background hover:bg-accent/50" : "bg-muted/30 hover:bg-muted/50",
        isToday(date) && "bg-accent ring-2 ring-accent-foreground/20"
      )}
    >
      <div className={cn(
        "text-sm md:text-base font-semibold mb-1",
        isToday(date) && "text-primary font-bold",
        !isCurrentMonth && "text-muted-foreground"
      )}>
        {day}
      </div>
      <div className="space-y-1">
        {visibleEvents.map((event) => (
          <CalendarEventPill
            key={event.id}
            schedule={event}
            onClick={onEventClick}
          />
        ))}
        {hiddenCount > 0 && (
          <div className="text-xs text-muted-foreground font-medium">
            +{hiddenCount} more
          </div>
        )}
      </div>
    </div>
  );
}
