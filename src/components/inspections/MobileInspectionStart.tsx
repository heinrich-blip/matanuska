import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Camera, QrCode, ArrowRight, Truck, AlertCircle } from "lucide-react";
import PositionQRScanner, { ScanResult } from "@/components/tyres/PositionQRScanner";
import InspectorProfileSelector from "./InspectorProfileSelector";
import LoadingSpinner from "@/components/ui/loading-spinner";
import { getFleetConfig } from "@/constants/fleetTyreConfig";
import { toast } from "@/hooks/use-toast";

interface ScannedVehicleData {
  fleetNumber: string;
  registration: string;
  fullCode: string;
}

const MobileInspectionStart = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showScanner, setShowScanner] = useState(false);
  const [scannedVehicle, setScannedVehicle] = useState<ScannedVehicleData | null>(null);
  const [inspectorId, setInspectorId] = useState("");
  const [inspectorName, setInspectorName] = useState("");

  // Parse URL parameters for deep link support
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const vehicleParam = searchParams.get('vehicle');

    if (vehicleParam && !scannedVehicle) {
      // Parse vehicle code from URL (format: FLEET-REG)
      const parts = vehicleParam.split('-');
      if (parts.length >= 2) {
        const fleetNumber = parts[0];
        const registration = parts.slice(1).join('-');
        setScannedVehicle({
          fleetNumber,
          registration,
          fullCode: vehicleParam
        });
        toast({
          title: "Vehicle Loaded",
          description: `${vehicleParam} loaded from QR code`,
        });
      }
    }
  }, [location.search, scannedVehicle]);

  // Fetch vehicle details when scanned
  const { data: vehicleData, isLoading: isLoadingVehicle, isError: vehicleError } = useQuery({
    queryKey: ["vehicle", scannedVehicle?.fullCode],
    enabled: !!scannedVehicle,
    queryFn: async () => {
      if (!scannedVehicle) return null;

      const fullRegistration = `${scannedVehicle.fleetNumber}-${scannedVehicle.registration}`;
      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .eq("registration_number", fullRegistration)
        .single();

      if (error) {
        console.error("Vehicle not found:", error);
        toast({
          title: "Vehicle Not Found",
          description: "The scanned vehicle was not found in the database",
          variant: "destructive",
        });
        return null;
      }
      return data;
    },
  });

  const handleScanSuccess = (result: ScanResult) => {
    if (result.type === "vehicle") {
      const vehicleData = result.data as { fleetNumber: string; registration: string; fullCode: string };
      setScannedVehicle(vehicleData);
      setShowScanner(false);
      toast({
        title: "Vehicle Scanned",
        description: `${vehicleData.fleetNumber}-${vehicleData.registration}`,
      });
    } else {
      toast({
        title: "Invalid QR Code",
        description: "Please scan a vehicle QR code",
        variant: "destructive",
      });
    }
  };

  const handleStartInspection = () => {
    if (!vehicleData || !inspectorId || !inspectorName) {
      toast({
        title: "Missing Information",
        description: "Please scan a vehicle and select an inspector",
        variant: "destructive",
      });
      return;
    }

    // Navigate to inspection type selector
    navigate("/inspections/type-selector", {
      state: {
        vehicleData,
        inspectorId,
        inspectorName,
        scannedVehicleData: scannedVehicle,
      },
    });
  };

  const fleetConfig = scannedVehicle
    ? getFleetConfig(`${scannedVehicle.fleetNumber}-${scannedVehicle.registration}`)
    : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-background border-b shadow-sm">
        <div className="text-center space-y-1 py-4 px-4">
          <h1 className="text-2xl font-bold">Mobile Vehicle Inspection</h1>
          <p className="text-sm text-muted-foreground">
            Scan vehicle QR code to start
          </p>
        </div>
      </div>

      <div className="p-4 space-y-4 pb-20">
        {/* Scanner or Scanned Vehicle */}
        {!scannedVehicle && !showScanner && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              Step 1: Scan Vehicle
            </CardTitle>
            <CardDescription>
              Point your camera at the vehicle's QR code
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => setShowScanner(true)}
              className="w-full"
              size="lg"
            >
              <Camera className="w-5 h-5 mr-2" />
              Open Camera Scanner
            </Button>
            <Button
              variant="link"
              className="w-full mt-2"
              onClick={() => navigate("/inspections")}
            >
              Or use manual entry
            </Button>
          </CardContent>
        </Card>
      )}

      {showScanner && (
        <PositionQRScanner
          onScanSuccess={handleScanSuccess}
          onClose={() => setShowScanner(false)}
        />
      )}

      {scannedVehicle && (
        <>
          {isLoadingVehicle && (
            <Card>
              <CardContent className="py-8">
                <LoadingSpinner text="Loading vehicle details..." />
              </CardContent>
            </Card>
          )}

          {vehicleError && !isLoadingVehicle && (
            <Card className="border-destructive">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-destructive" />
                  <CardTitle className="text-destructive">Vehicle Not Found</CardTitle>
                </div>
                <CardDescription>
                  The scanned vehicle could not be found in the system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  onClick={() => {
                    setScannedVehicle(null);
                    setShowScanner(true);
                  }}
                  className="w-full h-12"
                >
                  Scan Again
                </Button>
              </CardContent>
            </Card>
          )}

          {!isLoadingVehicle && !vehicleError && vehicleData && (
            <>
              {/* Scanned Vehicle Card */}
              <Card className="border-primary">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Truck className="w-5 h-5" />
                  Vehicle Scanned
                </div>
                <Badge variant="default">Ready</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Registration:</span>
                <span className="font-semibold">
                  {scannedVehicle.fleetNumber}-{scannedVehicle.registration}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Fleet:</span>
                <Badge variant="secondary">{scannedVehicle.fleetNumber}</Badge>
              </div>
              {fleetConfig && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Positions:</span>
                  <Badge variant="outline">{fleetConfig.positions.length} tyres</Badge>
                </div>
              )}
              {vehicleData && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Make:</span>
                    <span className="font-medium">{vehicleData.make}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Model:</span>
                    <span className="font-medium">{vehicleData.model}</span>
                  </div>
                </>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => {
                  setScannedVehicle(null);
                  setShowScanner(true);
                }}
              >
                Scan Different Vehicle
              </Button>
            </CardContent>
          </Card>

          {/* Inspector Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Step 2: Select Inspector</CardTitle>
              <CardDescription>Who is conducting this inspection?</CardDescription>
            </CardHeader>
            <CardContent>
              <InspectorProfileSelector
                value={inspectorId}
                onChange={(id: string, name: string) => {
                  setInspectorId(id);
                  setInspectorName(name);
                }}
              />
            </CardContent>
          </Card>

          {/* Start Inspection Button - Sticky at bottom */}
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t shadow-lg">
            <Button
              onClick={handleStartInspection}
              disabled={!vehicleData || !inspectorId}
              className="w-full h-14 text-lg"
              size="lg"
            >
              Choose Inspection Type
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
            </>
          )}
        </>
      )}
      </div>
    </div>
  );
};

export default MobileInspectionStart;