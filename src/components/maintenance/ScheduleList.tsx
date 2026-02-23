import { useState } from "react";
import { format } from "date-fns";
import { MaintenanceSchedule } from "@/types/maintenance";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, Calendar, AlertTriangle, FileText, FileSpreadsheet } from "lucide-react";
import { ScheduleDetailsDialog } from "./ScheduleDetailsDialog";
import { exportSchedulesToPDF, exportSchedulesToExcel } from "@/lib/maintenanceExport";
import { useToast } from "@/hooks/use-toast";

interface ScheduleListProps {
  schedules: MaintenanceSchedule[];
  onUpdate: () => void;
  showOverdueOnly?: boolean;
}

export function ScheduleList({ schedules, onUpdate, showOverdueOnly }: ScheduleListProps) {
  const [selectedSchedule, setSelectedSchedule] = useState<MaintenanceSchedule | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const { toast } = useToast();

  const filteredSchedules = schedules.filter(schedule => {
    const matchesSearch = schedule.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      schedule.maintenance_type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPriority = priorityFilter === "all" || schedule.priority === priorityFilter;
    const matchesCategory = categoryFilter === "all" || schedule.category === categoryFilter;
    
    return matchesSearch && matchesPriority && matchesCategory;
  });

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

  const getDaysUntilDue = (dueDate: string | null) => {
    if (!dueDate) return null;
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-4 flex-wrap items-center justify-between">
        <div className="flex gap-4 flex-wrap flex-1">
          <Input
            placeholder="Search schedules..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-xs"
          />
          
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="inspection">Inspection</SelectItem>
              <SelectItem value="service">Service</SelectItem>
              <SelectItem value="repair">Repair</SelectItem>
              <SelectItem value="replacement">Replacement</SelectItem>
              <SelectItem value="calibration">Calibration</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              exportSchedulesToPDF(filteredSchedules, 'Active Maintenance Schedules');
              toast({
                title: "Success",
                description: "PDF exported successfully",
              });
            }}
            disabled={filteredSchedules.length === 0}
          >
            <FileText className="w-4 h-4 mr-2" />
            PDF
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              exportSchedulesToExcel(filteredSchedules, 'maintenance-schedules');
              toast({
                title: "Success",
                description: "Excel file exported successfully",
              });
            }}
            disabled={filteredSchedules.length === 0}
          >
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Excel
          </Button>
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Next Due</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSchedules.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  {showOverdueOnly ? "No overdue schedules" : "No schedules found"}
                </TableCell>
              </TableRow>
            ) : (
              filteredSchedules.map((schedule) => {
                const daysUntilDue = getDaysUntilDue(schedule.next_due_date);
                const isOverdue = daysUntilDue !== null && daysUntilDue < 0;
                const isDueToday = daysUntilDue === 0;

                return (
                  <TableRow key={schedule.id}>
                    <TableCell className="font-medium">{schedule.title}</TableCell>
                    <TableCell>{schedule.maintenance_type}</TableCell>
                    <TableCell className="capitalize">{schedule.category}</TableCell>
                    <TableCell>
                      <Badge variant={getPriorityColor(schedule.priority)}>
                        {schedule.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {schedule.next_due_date ? (
                        <div className="flex items-center gap-2">
                          {isOverdue && <AlertTriangle className="h-4 w-4 text-destructive" />}
                          {isDueToday && <Calendar className="h-4 w-4 text-warning" />}
                          <span className={isOverdue ? "text-destructive" : isDueToday ? "text-warning" : ""}>
                            {format(new Date(schedule.next_due_date), "MMM dd, yyyy")}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Not scheduled</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isOverdue ? (
                        <Badge variant="destructive">Overdue</Badge>
                      ) : isDueToday ? (
                        <Badge variant="default">Due Today</Badge>
                      ) : daysUntilDue !== null && daysUntilDue <= 7 ? (
                        <Badge variant="secondary">Due Soon</Badge>
                      ) : (
                        <Badge variant="outline">Scheduled</Badge>
                      )}
                    </TableCell>
                    <TableCell>{schedule.assigned_to || "Unassigned"}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedSchedule(schedule)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
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
