import FaultTracking from "@/components/FaultTracking";
import { InspectionHistory } from "@/components/inspections/InspectionHistory";
import Layout from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, ClipboardCheck } from "lucide-react";

const Inspections = () => {
  return (
    <Layout>
      <Tabs defaultValue="inspections" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="inspections" className="gap-2">
            <ClipboardCheck className="h-4 w-4" />
            Inspections
          </TabsTrigger>
          <TabsTrigger value="faults" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Fault Tracking
          </TabsTrigger>
        </TabsList>
        <TabsContent value="inspections">
          <InspectionHistory />
        </TabsContent>
        <TabsContent value="faults">
          <FaultTracking />
        </TabsContent>
      </Tabs>
    </Layout>
  );
};

export default Inspections;