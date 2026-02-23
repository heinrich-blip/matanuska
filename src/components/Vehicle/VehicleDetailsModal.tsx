import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import
  {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
  } from "@/components/ui/dialog";
import { AlertTriangle, CalendarDays, CheckCircle, Clock, Fuel, Gauge } from "lucide-react";
import React from 'react';
import FleetTyreLayoutDiagram from "../tyres/FleetTyreLayoutDiagram";

interface Vehicle {
  id: string;
  registration: string;
  make: string;
  model: string;
  year: number;
  vin: string;
  status: string;
  mileage: number;
  fuel_type: string;
  last_service_date: string;
  next_service_due: string;
  insurance_expiry: string;
  mot_expiry: string;
  created_at: string;
  updated_at: string;
  fleetNumber?: string | null;
}

interface VehicleDetailsModalProps {
  vehicle: Vehicle | null;
  isOpen: boolean;
  onClose: () => void;
}

export const VehicleDetailsModal: React.FC<VehicleDetailsModalProps> = ({
  vehicle,
  isOpen,
  onClose,
}) => {
  if (!vehicle) return null;

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800';
      case 'inactive':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const isDateSoon = (dateString: string, daysThreshold: number = 30) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= daysThreshold && diffDays >= 0;
  };

  const isDateOverdue = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    return date < now;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="text-2xl font-bold">{vehicle.registration}</span>
            <Badge className={getStatusColor(vehicle.status)}>
              {vehicle.status}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            {vehicle.make} {vehicle.model} ({vehicle.year})
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {/* Vehicle Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gauge className="h-5 w-5" />
                Vehicle Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-500">Make:</span>
                  <p className="font-medium">{vehicle.make}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-500">Model:</span>
                  <p className="font-medium">{vehicle.model}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-500">Year:</span>
                  <p className="font-medium">{vehicle.year}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-500">VIN:</span>
                  <p className="font-medium font-mono text-xs">{vehicle.vin}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-500">Fuel Type:</span>
                  <p className="font-medium flex items-center gap-1">
                    <Fuel className="h-4 w-4" />
                    {vehicle.fuel_type}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-gray-500">Mileage:</span>
                  <p className="font-medium">{vehicle.mileage?.toLocaleString()} miles</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Service & Maintenance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                Service & Maintenance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-500">Last Service:</span>
                  <span className="font-medium">
                    {vehicle.last_service_date ? formatDate(vehicle.last_service_date) : 'N/A'}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-500">Next Service Due:</span>
                  <div className="flex items-center gap-2">
                    {vehicle.next_service_due && isDateOverdue(vehicle.next_service_due) && (
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    )}
                    {vehicle.next_service_due && isDateSoon(vehicle.next_service_due) && !isDateOverdue(vehicle.next_service_due) && (
                      <Clock className="h-4 w-4 text-yellow-500" />
                    )}
                    <span className={`font-medium ${
                      vehicle.next_service_due && isDateOverdue(vehicle.next_service_due)
                        ? 'text-red-600'
                        : vehicle.next_service_due && isDateSoon(vehicle.next_service_due)
                        ? 'text-yellow-600'
                        : ''
                    }`}>
                      {vehicle.next_service_due ? formatDate(vehicle.next_service_due) : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Legal & Compliance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Legal & Compliance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-500">MOT Expiry:</span>
                  <div className="flex items-center gap-2">
                    {vehicle.mot_expiry && isDateOverdue(vehicle.mot_expiry) && (
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    )}
                    {vehicle.mot_expiry && isDateSoon(vehicle.mot_expiry) && !isDateOverdue(vehicle.mot_expiry) && (
                      <Clock className="h-4 w-4 text-yellow-500" />
                    )}
                    <span className={`font-medium ${
                      vehicle.mot_expiry && isDateOverdue(vehicle.mot_expiry)
                        ? 'text-red-600'
                        : vehicle.mot_expiry && isDateSoon(vehicle.mot_expiry)
                        ? 'text-yellow-600'
                        : ''
                    }`}>
                      {vehicle.mot_expiry ? formatDate(vehicle.mot_expiry) : 'N/A'}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-500">Insurance Expiry:</span>
                  <div className="flex items-center gap-2">
                    {vehicle.insurance_expiry && isDateOverdue(vehicle.insurance_expiry) && (
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    )}
                    {vehicle.insurance_expiry && isDateSoon(vehicle.insurance_expiry) && !isDateOverdue(vehicle.insurance_expiry) && (
                      <Clock className="h-4 w-4 text-yellow-500" />
                    )}
                    <span className={`font-medium ${
                      vehicle.insurance_expiry && isDateOverdue(vehicle.insurance_expiry)
                        ? 'text-red-600'
                        : vehicle.insurance_expiry && isDateSoon(vehicle.insurance_expiry)
                        ? 'text-yellow-600'
                        : ''
                    }`}>
                      {vehicle.insurance_expiry ? formatDate(vehicle.insurance_expiry) : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* System Information */}
          <Card>
            <CardHeader>
              <CardTitle>System Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="font-medium text-gray-500">Created:</span>
                <span>{formatDate(vehicle.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-500">Last Updated:</span>
                <span>{formatDate(vehicle.updated_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-500">Vehicle ID:</span>
                <span className="font-mono text-xs">{vehicle.id}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tyre Configuration Section */}
        {(() => {
          // Use fleet_number from the vehicle record directly
          const fleetNumber = vehicle.fleetNumber;
          if (fleetNumber) {
            return (
              <div className="mt-6">
                <FleetTyreLayoutDiagram
                  vehicleId={vehicle.id}
                  registrationNumber={vehicle.registration}
                  fleetNumber={fleetNumber}
                />
              </div>
            );
          }
          return null;
        })()}

        {/* Alerts Section */}
        {(
          (vehicle.next_service_due && (isDateOverdue(vehicle.next_service_due) || isDateSoon(vehicle.next_service_due))) ||
          (vehicle.mot_expiry && (isDateOverdue(vehicle.mot_expiry) || isDateSoon(vehicle.mot_expiry))) ||
          (vehicle.insurance_expiry && (isDateOverdue(vehicle.insurance_expiry) || isDateSoon(vehicle.insurance_expiry)))
        ) && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-600">
                <AlertTriangle className="h-5 w-5" />
                Alerts & Notifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {vehicle.next_service_due && isDateOverdue(vehicle.next_service_due) && (
                  <div className="flex items-center gap-2 text-red-600 text-sm">
                    <AlertTriangle className="h-4 w-4" />
                    Service is overdue since {formatDate(vehicle.next_service_due)}
                  </div>
                )}
                {vehicle.next_service_due && isDateSoon(vehicle.next_service_due) && !isDateOverdue(vehicle.next_service_due) && (
                  <div className="flex items-center gap-2 text-yellow-600 text-sm">
                    <Clock className="h-4 w-4" />
                    Service due soon on {formatDate(vehicle.next_service_due)}
                  </div>
                )}
                {vehicle.mot_expiry && isDateOverdue(vehicle.mot_expiry) && (
                  <div className="flex items-center gap-2 text-red-600 text-sm">
                    <AlertTriangle className="h-4 w-4" />
                    MOT expired on {formatDate(vehicle.mot_expiry)}
                  </div>
                )}
                {vehicle.mot_expiry && isDateSoon(vehicle.mot_expiry) && !isDateOverdue(vehicle.mot_expiry) && (
                  <div className="flex items-center gap-2 text-yellow-600 text-sm">
                    <Clock className="h-4 w-4" />
                    MOT expires soon on {formatDate(vehicle.mot_expiry)}
                  </div>
                )}
                {vehicle.insurance_expiry && isDateOverdue(vehicle.insurance_expiry) && (
                  <div className="flex items-center gap-2 text-red-600 text-sm">
                    <AlertTriangle className="h-4 w-4" />
                    Insurance expired on {formatDate(vehicle.insurance_expiry)}
                  </div>
                )}
                {vehicle.insurance_expiry && isDateSoon(vehicle.insurance_expiry) && !isDateOverdue(vehicle.insurance_expiry) && (
                  <div className="flex items-center gap-2 text-yellow-600 text-sm">
                    <Clock className="h-4 w-4" />
                    Insurance expires soon on {formatDate(vehicle.insurance_expiry)}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </DialogContent>
    </Dialog>
  );
};