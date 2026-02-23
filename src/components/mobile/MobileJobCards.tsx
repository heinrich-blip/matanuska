import JobCardDetailsDialog from "@/components/dialogs/JobCardDetailsDialog";
import AddJobCardDialog from "@/components/dialogs/AddJobCardDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import {
  Calendar,
  ChevronRight,
  ClipboardList,
  FileText,
  Filter,
  Plus,
  Search,
  Truck,
  User,
} from "lucide-react";
import { useState } from "react";

interface JobCard {
  id: string;
  job_number: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assignee: string | null;
  due_date: string | null;
  vehicle_id: string | null;
  inspection_id: string | null;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
  vehicle?: {
    id: string;
    fleet_number: string | null;
    registration_number: string;
  } | null;
  inspection?: {
    id: string;
    inspection_number: string;
    inspection_type: string | null;
    inspection_date: string | null;
  } | null;
  partsSummary?: {
    count: number;
    latestIrNumber: string | null;
    latestPartName: string | null;
  };
}

const MobileJobCards = () => {
  const [selectedJob, setSelectedJob] = useState<JobCard | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPriority, setSelectedPriority] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

  const { data: jobCards = [], refetch, isLoading } = useQuery({
    queryKey: ["job_cards_mobile"],
    queryFn: async () => {
      const { data: baseJobCards, error } = await supabase
        .from("job_cards")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      const cards = baseJobCards || [];
      if (cards.length === 0) return [] as JobCard[];

      const vehicleIds = [...new Set(cards.map(c => c.vehicle_id).filter(Boolean))] as string[];
      const inspectionIds = [...new Set(cards.map(c => c.inspection_id).filter(Boolean))] as string[];
      const jobCardIds = cards.map(c => c.id);

      const [vehiclesResult, inspectionsResult, partsResult] = await Promise.all([
        vehicleIds.length > 0
          ? supabase.from("vehicles").select("id, fleet_number, registration_number").in("id", vehicleIds)
          : { data: [], error: null },
        inspectionIds.length > 0
          ? supabase.from("vehicle_inspections").select("id, inspection_number, inspection_type, inspection_date").in("id", inspectionIds)
          : { data: [], error: null },
        jobCardIds.length > 0
          ? supabase.from("parts_requests").select("job_card_id, part_name, ir_number, created_at, ordered_at").in("job_card_id", jobCardIds)
          : { data: [], error: null },
      ]);

      const vehicleMap = new Map((vehiclesResult.data || []).map(v => [v.id, v]));
      const inspectionMap = new Map((inspectionsResult.data || []).map(i => [i.id, i]));

      const partsSummaryMap = new Map<string, { count: number; latestIrNumber: string | null; latestPartName: string | null }>();
      for (const part of (partsResult.data || []) as { job_card_id: string | null; part_name: string | null; ir_number: string | null; created_at: string; ordered_at: string | null }[]) {
        if (!part.job_card_id) continue;
        const existing = partsSummaryMap.get(part.job_card_id) || { count: 0, latestIrNumber: null, latestPartName: null };
        existing.count += 1;
        if (part.ir_number) existing.latestIrNumber = part.ir_number;
        if (part.part_name) existing.latestPartName = part.part_name;
        partsSummaryMap.set(part.job_card_id, existing);
      }

      return cards.map(card => ({
        ...card,
        vehicle: card.vehicle_id ? vehicleMap.get(card.vehicle_id) || null : null,
        inspection: card.inspection_id ? inspectionMap.get(card.inspection_id) || null : null,
        partsSummary: partsSummaryMap.get(card.id) || { count: 0, latestIrNumber: null, latestPartName: null },
      })) as JobCard[];
    },
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "bg-red-500 text-white";
      case "high": return "bg-orange-500 text-white";
      case "medium": return "bg-blue-500 text-white";
      case "low": return "bg-gray-400 text-white";
      default: return "bg-gray-400 text-white";
    }
  };

  const getStatusColor = (status: string) => {
    const s = status?.toLowerCase();
    switch (s) {
      case "pending": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "in_progress":
      case "in progress": return "bg-blue-100 text-blue-800 border-blue-200";
      case "completed": return "bg-green-100 text-green-800 border-green-200";
      case "on_hold":
      case "on hold": return "bg-orange-100 text-orange-800 border-orange-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const filteredCards = jobCards.filter((card) => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      if (!card.title.toLowerCase().includes(term) &&
          !card.job_number.toLowerCase().includes(term) &&
          !(card.vehicle?.fleet_number || "").toLowerCase().includes(term)) {
        return false;
      }
    }
    if (selectedPriority !== "all" && card.priority !== selectedPriority) return false;
    return true;
  });

  const activeCards = filteredCards.filter(c => {
    const s = c.status?.toLowerCase();
    return s === "pending" || s === "in_progress" || s === "in progress";
  });

  const completedCards = filteredCards.filter(c => c.status?.toLowerCase() === "completed");

  const handleJobClick = (job: JobCard) => {
    setSelectedJob(job);
    setDialogOpen(true);
  };

  const JobCardItem = ({ card }: { card: JobCard }) => (
    <Card
      className="active:scale-[0.98] transition-transform cursor-pointer border-l-4"
      style={{
        borderLeftColor: card.priority === "urgent" ? "#ef4444"
          : card.priority === "high" ? "#f97316"
          : card.priority === "medium" ? "#3b82f6"
          : "#9ca3af",
      }}
      onClick={() => handleJobClick(card)}
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-muted-foreground">#{card.job_number}</span>
              <Badge className={cn("text-[10px] px-1.5 py-0", getStatusColor(card.status))} variant="outline">
                {card.status?.replace("_", " ")}
              </Badge>
            </div>
            <p className="font-medium text-sm leading-tight truncate">{card.title}</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
          {card.vehicle && (
            <span className="flex items-center gap-1">
              <Truck className="h-3 w-3" />
              {card.vehicle.fleet_number || card.vehicle.registration_number}
            </span>
          )}
          {card.assignee && (
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {card.assignee}
            </span>
          )}
          {card.due_date && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(card.due_date).toLocaleDateString()}
            </span>
          )}
          {card.inspection && (
            <span className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              {card.inspection.inspection_number}
            </span>
          )}
          {card.partsSummary && card.partsSummary.count > 0 && (
            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
              {card.partsSummary.count} part{card.partsSummary.count > 1 ? "s" : ""}
            </Badge>
          )}
        </div>

        <Badge className={cn("text-[10px] px-1.5 py-0 mt-2", getPriorityColor(card.priority))}>
          {card.priority}
        </Badge>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Job Cards
          </h1>
          <p className="text-xs text-muted-foreground">
            {activeCards.length} active, {completedCards.length} completed
          </p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search jobs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>
          <Button
            variant={showFilters ? "default" : "outline"}
            size="icon"
            className="h-9 w-9 flex-shrink-0"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4" />
          </Button>
        </div>

        {showFilters && (
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {["all", "urgent", "high", "medium", "low"].map((p) => (
              <Button
                key={p}
                variant={selectedPriority === p ? "default" : "outline"}
                size="sm"
                className="text-xs h-7 flex-shrink-0"
                onClick={() => setSelectedPriority(p)}
              >
                {p === "all" ? "All" : p.charAt(0).toUpperCase() + p.slice(1)}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Tabs for Active / Completed */}
      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-9">
          <TabsTrigger value="active" className="text-xs">
            Active ({activeCards.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="text-xs">
            Completed ({completedCards.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-3 space-y-2">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Loading...</div>
          ) : activeCards.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">No active job cards</div>
          ) : (
            activeCards.map((card) => <JobCardItem key={card.id} card={card} />)
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-3 space-y-2">
          {completedCards.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">No completed job cards</div>
          ) : (
            completedCards.map((card) => <JobCardItem key={card.id} card={card} />)
          )}
        </TabsContent>
      </Tabs>

      {/* FAB - New Job Card */}
      <Button
        className="fixed bottom-20 right-4 h-12 w-12 rounded-full shadow-lg z-40"
        onClick={() => setShowAddDialog(true)}
      >
        <Plus className="h-5 w-5" />
      </Button>

      {/* Dialogs */}
      <JobCardDetailsDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        jobCard={selectedJob}
        onUpdate={refetch}
      />

      <AddJobCardDialog
        open={showAddDialog}
        onOpenChange={(open) => {
          setShowAddDialog(open);
          if (!open) refetch();
        }}
      />
    </div>
  );
};

export default MobileJobCards;
