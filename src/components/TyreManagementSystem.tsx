import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Car, Package } from "lucide-react";
import TyreInspection from "./TyreInspection";
import TyreInventory from "./TyreInventory";
import FleetTyreReports from "./tyres/FleetTyreReports";

const TyreManagementSystem = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Tyre Management System</h1>
        <p className="text-muted-foreground">
          Comprehensive tyre inventory, vehicle tyre management, and analytics
        </p>
      </div>

      <Tabs defaultValue="vehicle-store" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="vehicle-store" className="flex items-center gap-2">
            <Car className="w-4 h-4" />
            Vehicle Store
          </TabsTrigger>
          <TabsTrigger value="inventory" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Inventory
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Analytics & Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vehicle-store">
          <TyreInspection />
        </TabsContent>

        <TabsContent value="inventory">
          <TyreInventory />
        </TabsContent>

        <TabsContent value="analytics">
          <FleetTyreReports />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TyreManagementSystem;