import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Car, Package } from "lucide-react";
import TyreInspection from "./TyreInspection";
import TyreInventory from "./TyreInventory";
import FleetTyreReports from "./tyres/FleetTyreReports";

const TyreManagementSystem = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Tyre Management System</h1>
        <p className="text-muted-foreground">
          Comprehensive tyre inventory, vehicle tyre management, and analytics
        </p>
      </div>

      <Tabs defaultValue="vehicle-store" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 h-auto">
          <TabsTrigger value="vehicle-store" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 py-2">
            <Car className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Vehicle Store</span>
            <span className="sm:hidden">Vehicles</span>
          </TabsTrigger>
          <TabsTrigger value="inventory" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 py-2">
            <Package className="w-4 h-4 shrink-0" />
            Inventory
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 py-2">
            <BarChart3 className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Analytics & Reports</span>
            <span className="sm:hidden">Analytics</span>
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