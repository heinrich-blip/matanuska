// src/components/driver/CarReportsGrid.tsx
'use client';

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCRAReports } from "@/hooks/useCRAReports";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Calendar, FileText, Loader2, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useDebounce } from "use-debounce";
import CRAReportForm from "./CRAReportForm";

type SortOption = "date-desc" | "date-asc" | "priority" | "status";
type ReportTab = "car" | "cra";

export default function CarReportsGrid() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debounced] = useDebounce(search, 300);
  const [sort, setSort] = useState<SortOption>("date-desc");
  const [activeTab, setActiveTab] = useState<ReportTab>("car");
  const [showCRAForm, setShowCRAForm] = useState(false);
  const [editingCRAId, setEditingCRAId] = useState<string | undefined>();

  // Fetch CRA Reports
  const { data: craReports = [], isLoading: isLoadingCRA } = useCRAReports();

  const {
    data: cars = [],
    isLoading,
  } = useQuery({
    queryKey: ['car_reports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('car_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('car_reports')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['car_reports'] });
    },
  });

  const filteredSorted = useMemo(() => {
    let list = cars;

    if (debounced) {
      const q = debounced.toLowerCase();
      list = list.filter(
        c =>
          (c.report_number?.toLowerCase().includes(q)) ||
          (c.driver_name?.toLowerCase().includes(q)) ||
          (c.fleet_number?.toLowerCase().includes(q)) ||
          (c.incident_type?.toLowerCase().includes(q))
      );
    }

    // Move const outside switch
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const statusOrder = { open: 0, 'in-progress': 1, resolved: 2, closed: 3 };

    list.sort((a, b) => {
      switch (sort) {
        case "date-desc":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "date-asc":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "priority":
          return (priorityOrder[a.severity ?? 'medium'] ?? 3) - (priorityOrder[b.severity ?? 'medium'] ?? 3);
        case "status":
          return (statusOrder[a.status ?? 'open'] ?? 0) - (statusOrder[b.status ?? 'open'] ?? 0);
        default:
          return 0;
      }
    });

    return list;
  }, [cars, debounced, sort]);

  if (isLoading || isLoadingCRA) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-64 rounded-lg" />
        ))}
      </div>
    );
  }

  // Filter CRA reports
  const filteredCRA = craReports.filter((cra) => {
    if (!debounced) return true;
    const q = debounced.toLowerCase();
    return (
      cra.cra_number?.toLowerCase().includes(q) ||
      cra.discovered_by?.toLowerCase().includes(q) ||
      cra.issue_category?.toLowerCase().includes(q) ||
      cra.issue_description?.toLowerCase().includes(q)
    );
  });

  const handleOpenCRAForm = (id?: string) => {
    setEditingCRAId(id);
    setShowCRAForm(true);
  };

  const handleCloseCRAForm = () => {
    setEditingCRAId(undefined);
    setShowCRAForm(false);
  };

  const getRiskBadgeVariant = (risk: string | null) => {
    switch (risk) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      {/* CRA Form Dialog */}
      <Dialog open={showCRAForm} onOpenChange={setShowCRAForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCRAId ? 'Edit CRA Report' : 'New CRA Report'}
            </DialogTitle>
          </DialogHeader>
          <CRAReportForm
            existingReportId={editingCRAId}
            onClose={handleCloseCRAForm}
          />
        </DialogContent>
      </Dialog>

      {/* Tabs for CAR vs CRA */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ReportTab)}>
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <TabsList>
            <TabsTrigger value="car" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              CAR Reports ({cars.length})
            </TabsTrigger>
            <TabsTrigger value="cra" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              CRA Reports ({craReports.length})
            </TabsTrigger>
          </TabsList>
          <div className="flex gap-3 w-full sm:w-auto">
            <Input
              placeholder={activeTab === 'car' ? "Search CAR, driver..." : "Search CRA..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-64 h-10"
            />
            <Select value={sort} onValueChange={(v) => setSort(v as SortOption)}>
              <SelectTrigger className="w-40 h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date-desc">Newest First</SelectItem>
                <SelectItem value="date-asc">Oldest First</SelectItem>
                <SelectItem value="priority">Priority</SelectItem>
                <SelectItem value="status">Status</SelectItem>
              </SelectContent>
            </Select>
            {activeTab === 'cra' && (
              <Button onClick={() => handleOpenCRAForm()}>
                <Plus className="h-4 w-4 mr-2" />
                New CRA
              </Button>
            )}
          </div>
        </div>

        {/* CAR Reports Tab */}
        <TabsContent value="car" className="mt-6">
          {filteredSorted.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">No CARs Found</h3>
                <p className="text-muted-foreground">Try adjusting search or filters.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSorted.map((car) => (
                <Card key={car.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold">{car.report_number}</CardTitle>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline">{car.driver_name}</Badge>
                      {car.fleet_number && <Badge variant="outline">Fleet #{car.fleet_number}</Badge>}
                      <Badge variant={car.status === 'resolved' ? 'default' : 'destructive'}>
                        {car.status}
                      </Badge>
                      <Badge variant="secondary">{car.severity}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm font-medium text-gray-700">{car.incident_type}</p>
                    <p className="text-sm text-muted-foreground">
                      {car.description.substring(0, 100)}...
                    </p>
                    <div className="text-xs text-gray-500 space-y-1">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Incident: {car.incident_date || 'N/A'}
                      </div>
                      {car.target_completion_date && (
                        <div className="flex items-center gap-1">
                          Target: {car.target_completion_date}
                        </div>
                      )}
                      {car.responsible_person && (
                        <div className="flex items-center gap-1">
                          Responsible: {car.responsible_person}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 pt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          // Open modal here
                        }}
                      >
                        View Details
                      </Button>
                      {car.status !== 'closed' && (
                        <Button
                          size="sm"
                          onClick={() => updateStatus.mutate({ id: car.id, status: 'resolved' })}
                          disabled={updateStatus.isPending}
                        >
                          {updateStatus.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            'Resolve'
                          )}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* CRA Reports Tab */}
        <TabsContent value="cra" className="mt-6">
          {filteredCRA.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">No CRA Reports Found</h3>
                <p className="text-muted-foreground">
                  {craReports.length === 0
                    ? "Create your first CRA report to get started."
                    : "Try adjusting search or filters."}
                </p>
                {craReports.length === 0 && (
                  <Button className="mt-4" onClick={() => handleOpenCRAForm()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create CRA Report
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCRA.map((cra) => (
                <Card key={cra.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold">{cra.cra_number}</CardTitle>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline">{cra.issue_category}</Badge>
                      <Badge variant={cra.status === 'approved' ? 'default' : 'secondary'}>
                        {cra.status}
                      </Badge>
                      {cra.risk_assessment && (
                        <Badge variant={getRiskBadgeVariant(cra.risk_assessment)}>
                          {cra.risk_assessment} risk
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      {cra.issue_description?.substring(0, 100)}...
                    </p>
                    <div className="text-xs text-gray-500 space-y-1">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Discovered: {cra.discovery_date || 'N/A'}
                      </div>
                      <div className="flex items-center gap-1">
                        By: {cra.discovered_by}
                      </div>
                      {cra.vehicles && (
                        <div className="flex items-center gap-1">
                          Vehicle: Fleet #{(cra.vehicles as { fleet_number?: string })?.fleet_number}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 pt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenCRAForm(cra.id)}
                      >
                        View / Edit
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
