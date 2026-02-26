
import CorrectiveActionDialog from "@/components/dialogs/CorrectiveActionDialog";
import { CreateWorkOrderFromInspectionDialog } from "@/components/dialogs/CreateWorkOrderFromInspectionDialog";
import { RootCauseAnalysisDialog } from "@/components/dialogs/RootCauseAnalysisDialog";
import { InspectionActionsMenu } from "@/components/inspections/InspectionActionsMenu";
import { InspectionForm } from "@/components/inspections/InspectionForm";
import Layout from "@/components/MobilePageLayout";
import
  {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
  } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, Calendar, Car, ClipboardList, FileText, MapPin, User } from "lucide-react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

interface Fault {
  id: string;
  fault_description: string;
  severity: string;
  corrective_action_status: string | null;
  corrective_action_notes: string | null;
}

interface RootCauseAnalysis {
  root_cause: string;
  conducted_by: string;
  responsible_person: string;
  notes: string;
}

interface InspectionData {
  id: string;
  inspection_number: string;
  inspection_date: string;
  inspector_name: string;
  inspection_type: string | null;
  vehicle_registration: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  odometer_reading: number | null;
  notes: string | null;
  status: string;
  template_id?: string | null;
  root_cause_analysis?: RootCauseAnalysis | null | unknown; // Can be Json from DB
  created_at: string | null;
  completed_at: string | null;
  completed_by: string | null;
  digital_signature: string | null;
  initiated_via: string | null;
  vehicle_id: string | null;
  inspector_profile_id: string | null;
  scanned_vehicle_qr: string | null;
  updated_at: string | null;
}

const InspectionDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [showCorrectiveAction, setShowCorrectiveAction] = useState(false);
  const [showRootCauseAnalysis, setShowRootCauseAnalysis] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [showCreateWorkOrder, setShowCreateWorkOrder] = useState(false);

  // Fetch inspection details
  const { data: inspection, isLoading, refetch } = useQuery<InspectionData>({
    queryKey: ["inspection", id],
    queryFn: async () => {
      if (!id) throw new Error("No inspection ID provided");

      const { data, error } = await supabase
        .from("vehicle_inspections")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as InspectionData;
    },
    enabled: !!id,
  });

  // Fetch template information separately
  const { data: template, isLoading: isTemplateLoading } = useQuery({
    queryKey: ["inspection_template", inspection?.template_id],
    queryFn: async () => {
      const templateId = inspection?.template_id;
      if (!templateId) return null;

      const { data, error } = await supabase
        .from("inspection_templates")
        .select("id, name, description")
        .eq("id", templateId)
        .single();

      if (error) {
        console.error("Error fetching template:", error);
        return null;
      }
      return data;
    },
    enabled: !!inspection?.template_id,
  });

  // Fetch faults
  const { data: faults = [] } = useQuery<Fault[]>({
    queryKey: ["inspection_faults", id],
    queryFn: async () => {
      if (!id) return [];

      const { data, error } = await supabase
        .from("inspection_faults")
        .select("id, fault_description, severity, corrective_action_status, corrective_action_notes")
        .eq("inspection_id", id);

      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  // Fetch inspection items (tyre positions / checklist items)
  const { data: inspectionItems = [] } = useQuery({
    queryKey: ["inspection_items_detail", id],
    queryFn: async () => {
      if (!id) return [];

      const { data, error } = await supabase
        .from("inspection_items")
        .select("id, item_name, category, status, notes")
        .eq("inspection_id", id)
        .order("item_name");

      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  // Action handlers
  const handleView = () => {
    toast({
      title: "Viewing Inspection",
      description: "You are already viewing this inspection",
    });
  };

  const handleShare = () => {
    if (!inspection) return;
    navigator.clipboard.writeText(window.location.href);
    toast({
      title: "Link Copied",
      description: `Inspection ${inspection.inspection_number} link copied to clipboard`,
    });
  };

  const handleCreateWorkOrder = () => {
    if (!inspection) return;
    setShowCreateWorkOrder(true);
  };

  const handleCorrectiveAction = () => {
    if (faults.length === 0) {
      toast({
        title: "No Faults Found",
        description: "This inspection has no recorded faults",
      });
      return;
    }
    setShowCorrectiveAction(true);
  };

  const handleRootCauseAnalysis = () => {
    setShowRootCauseAnalysis(true);
  };

  const handleViewPDF = () => {
    if (!inspection) return;
    toast({
      title: "Generating PDF",
      description: `Creating PDF for ${inspection.inspection_number}...`,
    });
  };

  const handleArchive = async () => {
    if (!inspection) return;

    try {
      const { error } = await supabase
        .from("vehicle_inspections")
        .update({ status: "cancelled" })
        .eq("id", inspection.id);

      if (error) throw error;

      toast({
        title: "Archived",
        description: `Inspection ${inspection.inspection_number} has been archived`,
      });
      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to archive inspection",
        variant: "destructive",
      });
    }
  };

  const handleDelete = () => {
    setShowDeleteAlert(true);
  };

  const confirmDelete = async () => {
    if (!inspection) return;

    try {
      const { error } = await supabase
        .from("vehicle_inspections")
        .delete()
        .eq("id", inspection.id);

      if (error) throw error;

      toast({
        title: "Deleted",
        description: `Inspection ${inspection.inspection_number} has been deleted`,
      });
      navigate("/");
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete inspection",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Loading inspection details...</p>
        </div>
      </Layout>
    );
  }

  if (!inspection) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-96 gap-4">
          <p className="text-muted-foreground">Inspection not found</p>
          <Button onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Inspections
          </Button>
        </div>
      </Layout>
    );
  }

  const getSeverityVariant = (severity: string) => {
    switch (severity) {
      case "critical": return "destructive";
      case "high": return "destructive";
      case "medium": return "default";
      default: return "secondary";
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl shrink-0" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-xl font-bold">Inspection Details</h1>
              <p className="text-sm text-muted-foreground truncate">{inspection.inspection_number}</p>
            </div>
          </div>

          <InspectionActionsMenu
            inspectionId={inspection.id}
            inspectionNumber={inspection.inspection_number}
            onView={handleView}
            onShare={handleShare}
            onCreateWorkOrder={handleCreateWorkOrder}
            onCorrectiveAction={handleCorrectiveAction}
            onRootCauseAnalysis={handleRootCauseAnalysis}
            onViewPDF={handleViewPDF}
            onArchive={handleArchive}
            onDelete={handleDelete}
          />
        </div>

        {/* Show Inspection Form if status is in_progress */}
        {inspection.status === "in_progress" && (
          <>
            {/* Show template info card while loading or when template is available */}
            {inspection.template_id && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardList className="h-5 w-5" />
                    Inspection Template
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isTemplateLoading ? (
                    <p className="text-sm text-muted-foreground">Loading template...</p>
                  ) : template ? (
                    <div className="space-y-2">
                      <p className="font-medium">{template.name}</p>
                      {template.description && (
                        <p className="text-sm text-muted-foreground">{template.description}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-destructive">Template not found</p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Only show form when template is loaded or if there's no template_id */}
            {(!inspection.template_id || !isTemplateLoading) && (
              <InspectionForm
                inspectionId={inspection.id}
                templateId={inspection.template_id}
                onComplete={() => refetch()}
              />
            )}

            {/* Show loading state while template is loading */}
            {inspection.template_id && isTemplateLoading && (
              <Card>
                <CardContent className="py-8">
                  <div className="flex items-center justify-center">
                    <p className="text-muted-foreground">Loading inspection form...</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Show Results if status is completed */}
        {inspection.status === "completed" && (
          <div className="space-y-6">
            {/* Inspection Info */}
            <div className="grid gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Inspection Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Date & Time</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(inspection.inspection_date).toLocaleString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Inspector</p>
                      <p className="text-sm text-muted-foreground">{inspection.inspector_name}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Inspection Type</p>
                      <p className="text-sm text-muted-foreground">{inspection.inspection_type || "N/A"}</p>
                    </div>
                  </div>

                  {/* Template Information */}
                  {template && (
                    <div className="flex items-start gap-3">
                      <ClipboardList className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Template Used</p>
                        <p className="text-sm text-muted-foreground">{template.name}</p>
                        {template.description && (
                          <p className="text-xs text-muted-foreground mt-1">{template.description}</p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Status</p>
                      <Badge variant={inspection.status === "completed" ? "default" : "secondary"}>
                        {inspection.status}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Vehicle Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Car className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Registration</p>
                      <p className="text-sm text-muted-foreground">{inspection.vehicle_registration}</p>
                    </div>
                  </div>

                  {(inspection.vehicle_make || inspection.vehicle_model) && (
                    <div className="flex items-start gap-3">
                      <Car className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Make & Model</p>
                        <p className="text-sm text-muted-foreground">
                          {inspection.vehicle_make} {inspection.vehicle_model}
                        </p>
                      </div>
                    </div>
                  )}

                  {inspection.odometer_reading && (
                    <div className="flex items-start gap-3">
                      <Car className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Odometer Reading</p>
                        <p className="text-sm text-muted-foreground">
                          {inspection.odometer_reading.toLocaleString()} km
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Notes */}
            {inspection.notes && (
              <Card>
                <CardHeader>
                  <CardTitle>Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{inspection.notes}</p>
                </CardContent>
              </Card>
            )}

            {/* Faults */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Faults ({faults.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {faults.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No faults recorded for this inspection</p>
                ) : (
                  <div className="space-y-4">
                    {faults.map((fault) => (
                      <div key={fault.id} className="border rounded-lg p-4 space-y-2">
                        <div className="flex items-start justify-between">
                          <p className="font-medium">{fault.fault_description}</p>
                          <Badge variant={getSeverityVariant(fault.severity)}>
                            {fault.severity}
                          </Badge>
                        </div>

                        {fault.corrective_action_status && (
                          <>
                            <Separator />
                            <div className="space-y-1">
                              <p className="text-sm font-medium">Corrective Action Status:</p>
                              <Badge variant={fault.corrective_action_status === "fixed" ? "default" : "secondary"}>
                                {fault.corrective_action_status}
                              </Badge>
                            </div>
                          </>
                        )}

                        {fault.corrective_action_notes && (
                          <div className="space-y-1">
                            <p className="text-sm font-medium">Notes:</p>
                            <p className="text-sm text-muted-foreground">{fault.corrective_action_notes}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Inspection Items (Tyre Positions / Checklist) */}
            {inspectionItems.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardList className="h-5 w-5" />
                    Inspection Items ({inspectionItems.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {inspectionItems.map((item) => (
                      <div
                        key={item.id}
                        className={`border rounded-lg p-3 border-l-4 ${
                          item.status === 'fail' ? 'border-l-red-500 bg-red-50/50' :
                          item.status === 'pass' ? 'border-l-green-500 bg-green-50/30' :
                          'border-l-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium">{item.item_name}</p>
                          <Badge
                            variant={item.status === 'fail' ? 'destructive' : item.status === 'pass' ? 'default' : 'secondary'}
                            className="text-[11px] flex-shrink-0"
                          >
                            {item.status === 'fail' ? 'FAIL' : item.status === 'pass' ? 'PASS' : item.status?.toUpperCase()}
                          </Badge>
                        </div>
                        {item.notes && (
                          <p className="text-xs text-muted-foreground mt-1.5 whitespace-pre-line">{item.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Root Cause Analysis */}
            {inspection.root_cause_analysis && (
              <Card>
                <CardHeader>
                  <CardTitle>Root Cause Analysis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium">Root Cause:</p>
                    <p className="text-sm text-muted-foreground">
                      {(inspection.root_cause_analysis as RootCauseAnalysis)?.root_cause || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Conducted By:</p>
                    <p className="text-sm text-muted-foreground">
                      {(inspection.root_cause_analysis as RootCauseAnalysis)?.conducted_by || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Responsible Person:</p>
                    <p className="text-sm text-muted-foreground">
                      {(inspection.root_cause_analysis as RootCauseAnalysis)?.responsible_person || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Analysis Notes:</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {(inspection.root_cause_analysis as RootCauseAnalysis)?.notes || 'N/A'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Corrective Action Dialog */}
      {faults.length > 0 && (
        <CorrectiveActionDialog
          open={showCorrectiveAction}
          onOpenChange={setShowCorrectiveAction}
          faults={faults}
          inspectionId={inspection.id}
          onCompleted={() => {
            refetch();
            setShowCorrectiveAction(false);
          }}
        />
      )}

      {/* Root Cause Analysis Dialog */}
      <RootCauseAnalysisDialog
        open={showRootCauseAnalysis}
        onOpenChange={setShowRootCauseAnalysis}
        inspectionId={inspection.id}
        inspectionNumber={inspection.inspection_number}
        onCompleted={() => {
          refetch();
          setShowRootCauseAnalysis(false);
        }}
      />

      {/* Create Job Card Dialog */}
      <CreateWorkOrderFromInspectionDialog
        open={showCreateWorkOrder}
        onOpenChange={setShowCreateWorkOrder}
        inspectionId={inspection.id}
        inspectionNumber={inspection.inspection_number}
        vehicleRegistration={inspection.vehicle_registration}
        onSuccess={() => {
          toast({
            title: "Job Card Created",
            description: "Job card has been successfully created with all identified faults as tasks",
          });
          refetch();
          setShowCreateWorkOrder(false);
        }}
      />

      {/* Delete Confirmation Alert */}
      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete inspection{" "}
              <span className="font-semibold">{inspection.inspection_number}</span>.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

export default InspectionDetails;