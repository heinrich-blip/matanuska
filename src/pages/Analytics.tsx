import Layout from "@/components/Layout";
import { DeliveryAnalyticsDashboard } from "@/components/analytics/DeliveryAnalyticsDashboard";
import { GPSAnalyticsDashboard } from "@/components/analytics/GPSAnalyticsDashboard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Satellite } from "lucide-react";

const Analytics = () => {
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive performance metrics and insights
          </p>
        </div>

        <Tabs defaultValue="gps" className="space-y-4">
          <TabsList>
            <TabsTrigger value="gps" className="flex items-center gap-2">
              <Satellite className="h-4 w-4" />
              GPS & Performance
            </TabsTrigger>
            <TabsTrigger value="delivery" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Delivery Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="gps">
            <GPSAnalyticsDashboard />
          </TabsContent>

          <TabsContent value="delivery">
            <DeliveryAnalyticsDashboard />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Analytics;