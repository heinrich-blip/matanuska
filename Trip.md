import React, { useState } from 'react';
import { Trip } from '../../types';
import Card, { CardContent, CardHeader } from '../ui/Card';
import Button from '../ui/Button';
import SyncIndicator from '../ui/SyncIndicator';
import {
  Edit,
  Trash2,
  Eye,
  AlertTriangle,
  Upload,
} from 'lucide-react';
import { formatCurrency, calculateTotalCosts, getFlaggedCostsCount } from '../../utils/helpers';
import LoadImportModal from '../trips/LoadImportModal';

interface ActiveTripsProps {
  trips: Trip[];
  onEdit: (trip: Trip) => void;
  onDelete: (id: string) => void;
  onView: (trip: Trip) => void;
}

const ActiveTrips: React.FC<ActiveTripsProps> = ({ trips, onEdit, onDelete, onView }) => {
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const openImportModal = () => setIsImportModalOpen(true);
  const closeImportModal = () => setIsImportModalOpen(false);

  const handleEdit = (trip: Trip) => {
    console.log('Editing trip:', trip);
    onEdit(trip);
  };

  const handleDelete = (id: string) => {
    const trip = trips.find(t => t.id === id);
    if (trip && confirm(`Delete trip for fleet ${trip.fleetNumber}? This cannot be undone.`)) {
      onDelete(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Active Trips</h2>
          <div className="flex items-center mt-1">
            <p className="text-gray-500 mr-3">{trips.length} active trip{trips.length !== 1 ? 's' : ''}</p>
            <SyncIndicator />
          </div>
        </div>
        <Button
          icon={<Upload className="w-4 h-4" />}
          onClick={openImportModal}
        >
          Import Trips
        </Button>
      </div>

      {trips.length === 0 && (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No active trips found</h3>
          <p className="text-gray-500">
            Create your first trip or import data to start tracking.
          </p>
          <Button
            icon={<Upload className="w-4 h-4" />}
            onClick={openImportModal}
            className="mt-4"
          >
            Import Trips
          </Button>
        </div>
      )}

      <div className="grid gap-4">
        {trips.map((trip) => {
          const currency = trip.revenueCurrency;
          const totalCosts = calculateTotalCosts(trip.costs);
          const profit = (trip.baseRevenue || 0) - totalCosts;
          const flaggedCount = getFlaggedCostsCount(trip.costs);

          return (
            <Card key={trip.id} className="hover:shadow-md transition-shadow">
              <CardHeader
                title={`Fleet ${trip.fleetNumber} - ${trip.route}`}
                subtitle={`${trip.clientName} • ${trip.startDate} to ${trip.endDate}`}
              />
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-500">Driver</p>
                    <p className="font-medium">{trip.driverName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Revenue</p>
                    <p className="font-medium text-green-600">
                      {formatCurrency(trip.baseRevenue || 0, currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Costs</p>
                    <p className="font-medium text-red-600">
                      {formatCurrency(totalCosts, currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Net Profit</p>
                    <p className={`font-medium ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(profit, currency)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="text-sm text-gray-500">
                      {trip.costs.length} cost entries
                      {trip.distanceKm && ` • ${trip.distanceKm} km`}
                    </div>
                    {flaggedCount > 0 && (
                      <div className="flex items-center space-x-1 text-amber-600">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-sm font-medium">{flaggedCount} flagged</span>
                      </div>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onView(trip)}
                      icon={<Eye className="w-3 h-3" />}
                    >
                      View
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(trip)}
                      icon={<Edit className="w-3 h-3" />}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleDelete(trip.id)}
                      icon={<Trash2 className="w-3 h-3" />}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <LoadImportModal isOpen={isImportModalOpen} onClose={closeImportModal} />
    </div>
  );
};

export default ActiveTrips;

import React, { useState } from 'react';
import { Trip, TripEditRecord, TRIP_EDIT_REASONS } from '../../types';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { Input, Select, TextArea } from '../ui/FormElements';
import { Save, X, AlertTriangle } from 'lucide-react';
import { formatDateTime } from '../../utils/helpers';

interface CompletedTripEditModalProps {
  isOpen: boolean;
  trip: Trip;
  onClose: () => void;
  onSave: (updatedTrip: Trip, editRecord: Omit<TripEditRecord, 'id'>) => void;
}

const CompletedTripEditModal: React.FC<CompletedTripEditModalProps> = ({
  isOpen,
  trip,
  onClose,
  onSave
}) => {
  const [formData, setFormData] = useState({
    fleetNumber: trip.fleetNumber,
    driverName: trip.driverName,
    clientName: trip.clientName,
    startDate: trip.startDate,
    endDate: trip.endDate,
    route: trip.route,
    description: trip.description || '',
    baseRevenue: trip.baseRevenue.toString(),
    revenueCurrency: trip.revenueCurrency,
    distanceKm: trip.distanceKm?.toString() || '',
  });

  const [editReason, setEditReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!editReason) {
      newErrors.editReason = 'Edit reason is required for completed trips';
    }
    
    if (editReason === 'Other (specify in comments)' && !customReason.trim()) {
      newErrors.customReason = 'Please specify the reason for editing';
    }

    // Check if any changes were made
    const hasChanges = Object.keys(formData).some(key => {
      const originalValue = trip[key as keyof Trip]?.toString() || '';
      const newValue = formData[key as keyof typeof formData] || '';
      return originalValue !== newValue;
    });

    if (!hasChanges) {
      newErrors.general = 'No changes detected. Please make changes before saving.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) return;

    // Identify changed fields
    const changes: Array<{field: string, oldValue: string, newValue: string}> = [];
    
    Object.keys(formData).forEach(key => {
      const originalValue = trip[key as keyof Trip]?.toString() || '';
      const newValue = formData[key as keyof typeof formData] || '';
      if (originalValue !== newValue) {
        changes.push({
          field: key,
          oldValue: originalValue,
          newValue: newValue
        });
      }
    });

    const finalReason = editReason === 'Other (specify in comments)' ? customReason : editReason;

    // Create edit records for each change
    changes.forEach(change => {
      const editRecord: Omit<TripEditRecord, 'id'> = {
        tripId: trip.id,
        editedBy: 'Current User', // In real app, use actual user
        editedAt: new Date().toISOString(),
        reason: finalReason,
        fieldChanged: change.field,
        oldValue: change.oldValue,
        newValue: change.newValue,
        changeType: 'update'
      };

      // Update trip with new data and edit history
      const updatedTrip: Trip = {
        ...trip,
        ...formData,
        baseRevenue: Number(formData.baseRevenue),
        distanceKm: formData.distanceKm ? Number(formData.distanceKm) : undefined,
        editHistory: [...(trip.editHistory || []), editRecord]
      };

      onSave(updatedTrip, editRecord);
    });

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Completed Trip"
      maxWidth="lg"
    >
      <div className="space-y-6">
        {/* Warning Alert */}
        <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-amber-800">Editing Completed Trip</h4>
              <p className="text-sm text-amber-700 mt-1">
                This trip has been completed. All changes will be logged with timestamps and reasons for audit purposes. 
                The edit history will be included in all future reports and exports.
              </p>
            </div>
          </div>
        </div>

        {/* Edit Reason - Required */}
        <div className="space-y-4 border-t pt-4">
          <h3 className="text-lg font-medium text-gray-900">Edit Justification (Required)</h3>
          
          <Select
            label="Reason for Edit *"
            value={editReason}
            onChange={(e) => setEditReason(e.target.value)}
            options={[
              { label: 'Select reason for editing...', value: '' },
              ...TRIP_EDIT_REASONS.map(reason => ({ label: reason, value: reason }))
            ]}
            error={errors.editReason}
          />

          {editReason === 'Other (specify in comments)' && (
            <TextArea
              label="Specify Reason *"
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="Please provide a detailed reason for editing this completed trip..."
              rows={3}
              error={errors.customReason}
            />
          )}
        </div>

        {/* Trip Data Form */}
        <div className="space-y-4 border-t pt-4">
          <h3 className="text-lg font-medium text-gray-900">Trip Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Fleet Number"
              value={formData.fleetNumber}
              onChange={(e) => handleChange('fleetNumber', e.target.value)}
            />

            <Input
              label="Driver Name"
              value={formData.driverName}
              onChange={(e) => handleChange('driverName', e.target.value)}
            />

            <Input
              label="Client Name"
              value={formData.clientName}
              onChange={(e) => handleChange('clientName', e.target.value)}
            />

            <Input
              label="Route"
              value={formData.route}
              onChange={(e) => handleChange('route', e.target.value)}
            />

            <Input
              label="Start Date"
              type="date"
              value={formData.startDate}
              onChange={(e) => handleChange('startDate', e.target.value)}
            />

            <Input
              label="End Date"
              type="date"
              value={formData.endDate}
              onChange={(e) => handleChange('endDate', e.target.value)}
            />

            <Select
              label="Currency"
              value={formData.revenueCurrency}
              onChange={(e) => handleChange('revenueCurrency', e.target.value)}
              options={[
                { label: 'ZAR (R)', value: 'ZAR' },
                { label: 'USD ($)', value: 'USD' }
              ]}
            />

            <Input
              label="Base Revenue"
              type="number"
              step="0.01"
              value={formData.baseRevenue}
              onChange={(e) => handleChange('baseRevenue', e.target.value)}
            />

            <Input
              label="Distance (km)"
              type="number"
              step="0.1"
              value={formData.distanceKm}
              onChange={(e) => handleChange('distanceKm', e.target.value)}
            />
          </div>

          <TextArea
            label="Description"
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            rows={3}
          />
        </div>

        {/* Existing Edit History */}
        {trip.editHistory && trip.editHistory.length > 0 && (
          <div className="space-y-4 border-t pt-4">
            <h3 className="text-lg font-medium text-gray-900">Previous Edit History</h3>
            <div className="bg-gray-50 rounded-md p-4 max-h-40 overflow-y-auto">
              {trip.editHistory.map((edit, index) => (
                <div key={index} className="text-sm border-b border-gray-200 pb-2 mb-2 last:border-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{edit.fieldChanged}: {edit.oldValue} → {edit.newValue}</p>
                      <p className="text-gray-600">Reason: {edit.reason}</p>
                    </div>
                    <div className="text-right text-xs text-gray-500">
                      <p>{edit.editedBy}</p>
                      <p>{formatDateTime(edit.editedAt)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {errors.general && (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
            {errors.general}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={onClose}
            icon={<X className="w-4 h-4" />}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            icon={<Save className="w-4 h-4" />}
          >
            Save Changes & Log Edit
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default CompletedTripEditModal;

import React, { useState } from 'react';
import { Trip, TripDeletionRecord } from '../../types';
import { useAppContext } from '../../context/AppContext';
import Card, { CardContent, CardHeader } from '../ui/Card';
import Button from '../ui/Button';
import { Input, Select } from '../ui/FormElements';
import CompletedTripEditModal from './CompletedTripEditModal';
import TripDeletionModal from './TripDeletionModal';
import SyncIndicator from '../ui/SyncIndicator';
import { 
  Eye, 
  Download, 
  FileSpreadsheet, 
  Filter, 
  Calendar, 
  User, 
  Edit, 
  Trash2,
  History,
  AlertTriangle
} from 'lucide-react';
import { 
  formatCurrency, 
  calculateTotalCosts, 
  formatDate, 
  downloadTripPDF, 
  downloadTripExcel,
  formatDateTime
} from '../../utils/helpers';

interface CompletedTripsProps {
  trips: Trip[];
  onView: (trip: Trip) => void;
}

const CompletedTrips: React.FC<CompletedTripsProps> = ({ trips, onView }) => {
  const { updateTrip, deleteTrip, connectionStatus } = useAppContext();
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    client: '',
    driver: '',
    currency: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [deletingTrip, setDeletingTrip] = useState<Trip | null>(null);
  const [showEditHistory, setShowEditHistory] = useState<string | null>(null);

  // Mock user role - in real app, get from auth context
  const userRole: 'admin' | 'manager' | 'operator' = 'admin';

  const filteredTrips = trips.filter(trip => {
    if (filters.startDate && trip.startDate < filters.startDate) return false;
    if (filters.endDate && trip.endDate > filters.endDate) return false;
    if (filters.client && trip.clientName !== filters.client) return false;
    if (filters.driver && trip.driverName !== filters.driver) return false;
    if (filters.currency && trip.revenueCurrency !== filters.currency) return false;
    return true;
  });

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const clearFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      client: '',
      driver: '',
      currency: ''
    });
  };

  const handleEditSave = (updatedTrip: Trip) => {
    updateTrip(updatedTrip);
    setEditingTrip(null);
    alert('Trip updated successfully. Edit has been logged for audit purposes.');
  };

  const handleDelete = (trip: Trip, deletionRecord: Omit<TripDeletionRecord, 'id'>) => {
    // In real app, save deletion record to audit log before deleting
    console.log('Deletion Record:', deletionRecord);
    deleteTrip(trip.id);
    setDeletingTrip(null);
    alert('Trip deleted successfully. Deletion has been logged for governance purposes.');
  };

  const uniqueClients = [...new Set(trips.map(trip => trip.clientName))];
  const uniqueDrivers = [...new Set(trips.map(trip => trip.driverName))];

  if (trips.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">No completed trips found</h3>
        <p className="text-gray-500">
          Complete some trips to see them here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Completed Trips</h2>
          <div className="flex items-center mt-1">
            <p className="text-gray-500 mr-3">{filteredTrips.length} completed trip{filteredTrips.length !== 1 ? 's' : ''}</p>
            <SyncIndicator />
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            icon={<Filter className="w-4 h-4" />}
          >
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardHeader title="Filter Completed Trips" />
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <Input
                label="Start Date"
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
              />
              <Input
                label="End Date"
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
              />
              <Select
                label="Client"
                value={filters.client}
                onChange={(e) => handleFilterChange('client', e.target.value)}
                options={[
                  { label: 'All Clients', value: '' },
                  ...uniqueClients.map(c => ({ label: c, value: c }))
                ]}
              />
              <Select
                label="Driver"
                value={filters.driver}
                onChange={(e) => handleFilterChange('driver', e.target.value)}
                options={[
                  { label: 'All Drivers', value: '' },
                  ...uniqueDrivers.map(d => ({ label: d, value: d }))
                ]}
              />
              <Select
                label="Currency"
                value={filters.currency}
                onChange={(e) => handleFilterChange('currency', e.target.value)}
                options={[
                  { label: 'All Currencies', value: '' },
                  { label: 'ZAR (R)', value: 'ZAR' },
                  { label: 'USD ($)', value: 'USD' }
                ]}
              />
            </div>
            <div className="mt-4 flex justify-end">
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Offline warning */}
      {connectionStatus !== 'connected' && (
        <div className="bg-amber-50 border border-amber-200 rounded-md p-4 mb-4">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-amber-800">Working Offline</h4>
              <p className="text-sm text-amber-700 mt-1">
                You're currently working offline. Changes to completed trips will be synced when your connection is restored.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {filteredTrips.map((trip) => {
          const currency = trip.revenueCurrency;
          const totalCosts = calculateTotalCosts(trip.costs);
          const profit = (trip.baseRevenue || 0) - totalCosts;
          const hasEditHistory = trip.editHistory && trip.editHistory.length > 0;

          return (
            <Card key={trip.id} className="hover:shadow-md transition-shadow">
              <CardHeader 
              title={`Fleet ${trip.fleetNumber} - ${trip.route}`}
              subtitle={
                <div className="flex items-center space-x-4 text-sm">
                <span>{trip.clientName} • Completed {formatDate(trip.completedAt || trip.endDate)}</span>
                {hasEditHistory && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-amber-100 text-amber-800">
                  <History className="w-3 h-3 mr-1" />
                  Edited
                  </span>
                )}
                </div>
              }
              />
              <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                <div className="flex items-center space-x-2">
                <User className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Driver</p>
                  <p className="font-medium">{trip.driverName}</p>
                </div>
                </div>
                <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Duration</p>
                  <p className="font-medium">{formatDate(trip.startDate)} - {formatDate(trip.endDate)}</p>
                </div>
                </div>
                <div>
                <p className="text-sm text-gray-500">Revenue</p>
                <p className="font-medium text-green-600">
                  {formatCurrency(trip.baseRevenue || 0, currency)}
                </p>
                </div>
                <div>
                <p className="text-sm text-gray-500">Total Costs</p>
                <p className="font-medium text-red-600">
                  {formatCurrency(totalCosts, currency)}
                </p>
                </div>
                <div>
                <p className="text-sm text-gray-500">Net Profit</p>
                <p className={`font-medium ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(profit, currency)}
                </p>
                </div>
              </div>

              {/* Edit History Preview */}
              {hasEditHistory && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span className="text-sm font-medium text-amber-800">
                    This trip has been edited {trip.editHistory!.length} time{trip.editHistory!.length !== 1 ? 's' : ''} after completion
                  </span>
                  </div>
                  <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowEditHistory(showEditHistory === trip.id ? null : trip.id)}
                  icon={<History className="w-3 h-3" />}
                  >
                  {showEditHistory === trip.id ? 'Hide' : 'View'} History
                  </Button>
                </div>
                
                {showEditHistory === trip.id && (
                  <div className="mt-3 space-y-2 max-h-40 overflow-y-auto">
                  {trip.editHistory!.map((edit, index) => (
                    <div key={index} className="text-sm bg-white p-2 rounded border">
                    <div className="flex justify-between items-start">
                      <div>
                      <p className="font-medium">{edit.fieldChanged}: {edit.oldValue} → {edit.newValue}</p>
                      <p className="text-gray-600">Reason: {edit.reason}</p>
                      </div>
                      <div className="text-right text-xs text-gray-500">
                      <p>{edit.editedBy}</p>
                      <p>{formatDateTime(edit.editedAt)}</p>
                      </div>
                    </div>
                    </div>
                  ))}
                  </div>
                )}
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500">
                {trip.costs.length} cost entries
                {trip.distanceKm && ` • ${trip.distanceKm} km`}
                {trip.completedBy && ` • Completed by ${trip.completedBy}`}
                </div>
                <div className="flex space-x-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => onView(trip)}
                  icon={<Eye className="w-3 h-3" />}
                >
                  View
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => downloadTripExcel(trip)}
                  icon={<FileSpreadsheet className="w-3 h-3" />}
                >
                  Excel
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => downloadTripPDF(trip)}
                  icon={<Download className="w-3 h-3" />}
                >
                  PDF
                </Button>
                
                {/* Edit Button - Available for all users */}
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setEditingTrip(trip)}
                  icon={<Edit className="w-3 h-3" />}
                >
                  Edit
                </Button>
                
                {/* Delete Button - Admin Only */}
                {userRole === 'admin' && (
                  <Button 
                  size="sm" 
                  variant="danger"
                  onClick={() => setDeletingTrip(trip)}
                  icon={<Trash2 className="w-3 h-3" />}
                  >
                  Delete
                  </Button>
                )}
                </div>
              </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Edit Modal */}
      {editingTrip && (
        <CompletedTripEditModal
          isOpen={!!editingTrip}
          trip={editingTrip}
          onClose={() => setEditingTrip(null)}
          onSave={handleEditSave}
        />
      )}

      {/* Deletion Modal */}
      {deletingTrip && (
        <TripDeletionModal
          isOpen={!!deletingTrip}
          trip={deletingTrip}
          onClose={() => setDeletingTrip(null)}
          onDelete={handleDelete}
          userRole={userRole}
        />
      )}
    </div>
  );
};

export default CompletedTrips;

import React, { useState } from 'react';
import { Trip, AdditionalCost, DelayReason } from '../../types';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { Input, TextArea, FileUpload } from '../ui/FormElements';
import AdditionalCostsForm from '../cost/AdditionalCostsForm';
import { 
  Send, 
  X, 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  FileText, 
  DollarSign,
  Calendar,
  Flag
} from 'lucide-react';
import { formatCurrency, formatDateTime, calculateKPIs } from '../../utils/helpers';

interface InvoiceSubmissionModalProps {
  isOpen: boolean;
  trip: Trip;
  onClose: () => void;
  onSubmit: (invoiceData: {
    invoiceNumber: string;
    invoiceDate: string;
    invoiceDueDate: string;
    finalTimeline: {
      finalArrivalDateTime: string;
      finalOffloadDateTime: string;
      finalDepartureDateTime: string;
    };
    validationNotes: string;
    proofOfDelivery: FileList | null;
    signedInvoice: FileList | null;
  }) => void;
  onAddAdditionalCost: (cost: Omit<AdditionalCost, 'id'>, files?: FileList) => void;
  onRemoveAdditionalCost: (costId: string) => void;
}

const InvoiceSubmissionModal: React.FC<InvoiceSubmissionModalProps> = ({
  isOpen,
  trip,
  onClose,
  onSubmit,
  onAddAdditionalCost,
  onRemoveAdditionalCost
}) => {
  const [formData, setFormData] = useState({
    invoiceNumber: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    invoiceDueDate: '',
    finalArrivalDateTime: trip.actualArrivalDateTime || trip.plannedArrivalDateTime || '',
    finalOffloadDateTime: trip.actualOffloadDateTime || trip.plannedOffloadDateTime || '',
    finalDepartureDateTime: trip.actualDepartureDateTime || trip.plannedDepartureDateTime || '',
    validationNotes: ''
  });

  const [proofOfDelivery, setProofOfDelivery] = useState<FileList | null>(null);
  const [signedInvoice, setSignedInvoice] = useState<FileList | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Calculate timeline discrepancies
  const calculateDiscrepancies = () => {
    const discrepancies = [];
    
    if (trip.plannedArrivalDateTime && formData.finalArrivalDateTime) {
      const planned = new Date(trip.plannedArrivalDateTime);
      const final = new Date(formData.finalArrivalDateTime);
      const diffHours = (final.getTime() - planned.getTime()) / (1000 * 60 * 60);
      
      if (Math.abs(diffHours) > 1) {
        discrepancies.push({
          type: 'Arrival',
          planned: formatDateTime(planned),
          final: formatDateTime(final),
          difference: `${diffHours > 0 ? '+' : ''}${diffHours.toFixed(1)} hours`,
          severity: Math.abs(diffHours) > 4 ? 'major' : Math.abs(diffHours) > 2 ? 'moderate' : 'minor'
        });
      }
    }

    if (trip.plannedOffloadDateTime && formData.finalOffloadDateTime) {
      const planned = new Date(trip.plannedOffloadDateTime);
      const final = new Date(formData.finalOffloadDateTime);
      const diffHours = (final.getTime() - planned.getTime()) / (1000 * 60 * 60);
      
      if (Math.abs(diffHours) > 1) {
        discrepancies.push({
          type: 'Offload',
          planned: formatDateTime(planned),
          final: formatDateTime(final),
          difference: `${diffHours > 0 ? '+' : ''}${diffHours.toFixed(1)} hours`,
          severity: Math.abs(diffHours) > 4 ? 'major' : Math.abs(diffHours) > 2 ? 'moderate' : 'minor'
        });
      }
    }

    if (trip.plannedDepartureDateTime && formData.finalDepartureDateTime) {
      const planned = new Date(trip.plannedDepartureDateTime);
      const final = new Date(formData.finalDepartureDateTime);
      const diffHours = (final.getTime() - planned.getTime()) / (1000 * 60 * 60);
      
      if (Math.abs(diffHours) > 1) {
        discrepancies.push({
          type: 'Departure',
          planned: formatDateTime(planned),
          final: formatDateTime(final),
          difference: `${diffHours > 0 ? '+' : ''}${diffHours.toFixed(1)} hours`,
          severity: Math.abs(diffHours) > 4 ? 'major' : Math.abs(diffHours) > 2 ? 'moderate' : 'minor'
        });
      }
    }

    return discrepancies;
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Auto-calculate due date based on currency
    if (field === 'invoiceDate') {
      const invoiceDate = new Date(value);
      const daysToAdd = trip.revenueCurrency === 'USD' ? 14 : 30;
      const dueDate = new Date(invoiceDate.getTime() + (daysToAdd * 24 * 60 * 60 * 1000));
      setFormData(prev => ({ 
        ...prev, 
        invoiceDate: value,
        invoiceDueDate: dueDate.toISOString().split('T')[0]
      }));
    }
    
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.invoiceNumber.trim()) {
      newErrors.invoiceNumber = 'Invoice number is required';
    }
    
    if (!formData.invoiceDate) {
      newErrors.invoiceDate = 'Invoice date is required';
    }
    
    if (!formData.invoiceDueDate) {
      newErrors.invoiceDueDate = 'Due date is required';
    }
    
    if (!formData.finalArrivalDateTime) {
      newErrors.finalArrivalDateTime = 'Final arrival time is required';
    }
    
    if (!formData.finalOffloadDateTime) {
      newErrors.finalOffloadDateTime = 'Final offload time is required';
    }
    
    if (!formData.finalDepartureDateTime) {
      newErrors.finalDepartureDateTime = 'Final departure time is required';
    }
    
    // Check for required documents
    if (!proofOfDelivery || proofOfDelivery.length === 0) {
      newErrors.proofOfDelivery = 'Proof of delivery is required for invoicing';
    }
    
    const discrepancies = calculateDiscrepancies();
    if (discrepancies.length > 0 && !formData.validationNotes.trim()) {
      newErrors.validationNotes = 'Validation notes are required when there are timeline discrepancies';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;
    
    onSubmit({
      invoiceNumber: formData.invoiceNumber.trim(),
      invoiceDate: formData.invoiceDate,
      invoiceDueDate: formData.invoiceDueDate,
      finalTimeline: {
        finalArrivalDateTime: formData.finalArrivalDateTime,
        finalOffloadDateTime: formData.finalOffloadDateTime,
        finalDepartureDateTime: formData.finalDepartureDateTime
      },
      validationNotes: formData.validationNotes.trim(),
      proofOfDelivery,
      signedInvoice
    });
  };

  const kpis = calculateKPIs(trip);
  const discrepancies = calculateDiscrepancies();
  const hasDiscrepancies = discrepancies.length > 0;
  const totalAdditionalCosts = trip.additionalCosts?.reduce((sum, cost) => sum + cost.amount, 0) || 0;
  const finalInvoiceAmount = kpis.totalRevenue + totalAdditionalCosts;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Submit Trip for Invoicing"
      maxWidth="4xl"
    >
      <div className="space-y-6">
        {/* Trip Summary */}
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <h3 className="text-lg font-medium text-blue-800 mb-3">Trip Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-blue-600 font-medium">Fleet & Driver</p>
              <p className="text-blue-800">{trip.fleetNumber} - {trip.driverName}</p>
            </div>
            <div>
              <p className="text-blue-600 font-medium">Route</p>
              <p className="text-blue-800">{trip.route}</p>
            </div>
            <div>
              <p className="text-blue-600 font-medium">Client</p>
              <p className="text-blue-800">{trip.clientName}</p>
            </div>
            <div>
              <p className="text-blue-600 font-medium">Period</p>
              <p className="text-blue-800">{trip.startDate} to {trip.endDate}</p>
            </div>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <h3 className="text-lg font-medium text-green-800 mb-3">Invoice Amount Breakdown</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-sm text-green-600">Base Revenue</p>
              <p className="text-xl font-bold text-green-800">
                {formatCurrency(trip.baseRevenue, trip.revenueCurrency)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-green-600">Additional Costs</p>
              <p className="text-xl font-bold text-green-800">
                {formatCurrency(totalAdditionalCosts, trip.revenueCurrency)}
              </p>
              <p className="text-xs text-green-600">{trip.additionalCosts?.length || 0} items</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-green-600">Total Invoice Amount</p>
              <p className="text-2xl font-bold text-green-800">
                {formatCurrency(finalInvoiceAmount, trip.revenueCurrency)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-green-600">Currency</p>
              <p className="text-xl font-bold text-green-800">{trip.revenueCurrency}</p>
            </div>
          </div>
        </div>

        {/* Timeline Validation */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Final Timeline Validation</h3>
          
          {hasDiscrepancies && (
            <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-amber-800">Timeline Discrepancies Detected</h4>
                  <p className="text-sm text-amber-700 mt-1">
                    Significant differences found between planned and final times. Please review and provide validation notes.
                  </p>
                  <div className="mt-3 space-y-2">
                    {discrepancies.map((disc, index) => (
                      <div key={index} className="text-sm bg-amber-100 p-2 rounded border border-amber-300">
                        <div className="flex items-center space-x-2">
                          <Flag className={`w-4 h-4 ${
                            disc.severity === 'major' ? 'text-red-600' : 
                            disc.severity === 'moderate' ? 'text-orange-600' : 'text-yellow-600'
                          }`} />
                          <span className="font-medium text-amber-800">{disc.type} Time Variance ({disc.severity})</span>
                        </div>
                        <div className="ml-6 mt-1 space-y-1">
                          <div className="text-amber-700">
                            <span className="font-medium">Planned:</span> {disc.planned}
                          </div>
                          <div className="text-amber-700">
                            <span className="font-medium">Final:</span> {disc.final}
                          </div>
                          <div className="text-amber-800 font-medium">
                            <span className="font-medium">Difference:</span> {disc.difference}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Final Arrival Date & Time *"
              type="datetime-local"
              value={formData.finalArrivalDateTime}
              onChange={(e) => handleChange('finalArrivalDateTime', e.target.value)}
              error={errors.finalArrivalDateTime}
            />
            <Input
              label="Final Offload Date & Time *"
              type="datetime-local"
              value={formData.finalOffloadDateTime}
              onChange={(e) => handleChange('finalOffloadDateTime', e.target.value)}
              error={errors.finalOffloadDateTime}
            />
            <Input
              label="Final Departure Date & Time *"
              type="datetime-local"
              value={formData.finalDepartureDateTime}
              onChange={(e) => handleChange('finalDepartureDateTime', e.target.value)}
              error={errors.finalDepartureDateTime}
            />
          </div>

          {hasDiscrepancies && (
            <TextArea
              label="Timeline Validation Notes *"
              value={formData.validationNotes}
              onChange={(e) => handleChange('validationNotes', e.target.value)}
              placeholder="Explain the timeline discrepancies and any delays encountered..."
              rows={3}
              error={errors.validationNotes}
            />
          )}
        </div>

        {/* Delay Reasons Summary */}
        {trip.delayReasons && trip.delayReasons.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <h4 className="text-sm font-medium text-red-800 mb-2">Recorded Delays ({trip.delayReasons.length})</h4>
            <div className="space-y-2">
              {trip.delayReasons.map((delay, index) => (
                <div key={index} className="text-sm bg-white p-2 rounded border border-red-200">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-medium text-red-800">{delay.delayType.replace(/_/g, ' ').toUpperCase()}</span>
                      <p className="text-red-700">{delay.description}</p>
                    </div>
                    <span className="text-red-600 font-medium">{delay.delayDuration}h</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Additional Costs */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Additional Costs</h3>
          <AdditionalCostsForm
            tripId={trip.id}
            additionalCosts={trip.additionalCosts || []}
            onAddCost={onAddAdditionalCost}
            onRemoveCost={onRemoveAdditionalCost}
          />
        </div>

        {/* Invoice Details */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Invoice Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Invoice Number *"
              value={formData.invoiceNumber}
              onChange={(e) => handleChange('invoiceNumber', e.target.value)}
              placeholder="INV-2025-001"
              error={errors.invoiceNumber}
            />
            <Input
              label="Invoice Date *"
              type="date"
              value={formData.invoiceDate}
              onChange={(e) => handleChange('invoiceDate', e.target.value)}
              error={errors.invoiceDate}
            />
            <Input
              label={`Due Date * (${trip.revenueCurrency === 'USD' ? '14' : '30'} days default)`}
              type="date"
              value={formData.invoiceDueDate}
              onChange={(e) => handleChange('invoiceDueDate', e.target.value)}
              error={errors.invoiceDueDate}
            />
          </div>
        </div>

        {/* Required Documents */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Required Documents</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FileUpload
                label="Proof of Delivery (POD) *"
                accept=".pdf,.jpg,.jpeg,.png"
                multiple
                onFileSelect={setProofOfDelivery}
              />
              {errors.proofOfDelivery && (
                <p className="text-sm text-red-600 mt-1">{errors.proofOfDelivery}</p>
              )}
              {proofOfDelivery && proofOfDelivery.length > 0 && (
                <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                  <p className="text-sm font-medium text-green-800">
                    Selected: {proofOfDelivery.length} file(s)
                  </p>
                  <ul className="text-sm text-green-700 mt-1">
                    {Array.from(proofOfDelivery).map((file, index) => (
                      <li key={index}>• {file.name}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div>
              <FileUpload
                label="Signed Invoice (Optional)"
                accept=".pdf,.jpg,.jpeg,.png"
                multiple
                onFileSelect={setSignedInvoice}
              />
              {signedInvoice && signedInvoice.length > 0 && (
                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-sm font-medium text-blue-800">
                    Selected: {signedInvoice.length} file(s)
                  </p>
                  <ul className="text-sm text-blue-700 mt-1">
                    {Array.from(signedInvoice).map((file, index) => (
                      <li key={index}>• {file.name}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Submission Summary */}
        <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
          <h4 className="text-sm font-medium text-gray-800 mb-2">Submission Summary</h4>
          <div className="text-sm text-gray-700 space-y-1">
            <p>• Trip will be marked as <strong>INVOICED</strong></p>
            <p>• Invoice aging tracking will begin automatically</p>
            <p>• Payment follow-up alerts will be scheduled based on currency thresholds</p>
            <p>• Timeline validation will be recorded for compliance reporting</p>
            {hasDiscrepancies && (
              <p className="text-amber-700">• Timeline discrepancies will be flagged for review</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={onClose}
            icon={<X className="w-4 h-4" />}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            icon={<Send className="w-4 h-4" />}
          >
            Submit for Invoicing
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default InvoiceSubmissionModal;import React, { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { FileUpload } from '../ui/FormElements';
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle } from 'lucide-react';

interface LoadImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LoadImportModal: React.FC<LoadImportModalProps> = ({ isOpen, onClose }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);

  const handleFileSelect = (files: FileList | null) => {
    if (files && files.length > 0) {
      setSelectedFile(files[0]);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    setImporting(true);
    try {
      // Simulate import process
      await new Promise(resolve => setTimeout(resolve, 2000));
      alert(`Successfully imported ${selectedFile.name}`);
      setSelectedFile(null);
      onClose();
    } catch (error) {
      console.error('Import failed:', error);
      alert('Import failed. Please check the file format and try again.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Import Trip Data"
      maxWidth="lg"
    >
      <div className="space-y-6">
        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <h4 className="text-sm font-medium text-blue-800 mb-2">Import Instructions</h4>
          <div className="text-sm text-blue-700 space-y-1">
            <p>• Supported formats: Excel (.xlsx, .xls) or CSV</p>
            <p>• Required columns: Fleet Number, Driver, Route, Client, Start Date, End Date</p>
            <p>• Optional columns: Description, Distance, Revenue</p>
            <p>• Maximum file size: 10MB</p>
          </div>
        </div>

        {/* File Upload */}
        <div>
          <FileUpload
            label="Select File"
            accept=".xlsx,.xls,.csv"
            onFileSelect={handleFileSelect}
          />
          
          {selectedFile && (
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">
                  Selected: {selectedFile.name}
                </span>
              </div>
              <p className="text-xs text-green-600 mt-1">
                Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          )}
        </div>

        {/* Template Download */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Download Template</h4>
          <p className="text-sm text-gray-600 mb-3">
            Use our template to ensure proper formatting:
          </p>
          <Button
            variant="outline"
            size="sm"
            icon={<FileSpreadsheet className="w-4 h-4" />}
            onClick={() => {
              // Create and download template
              const templateData = [
                ['Fleet Number', 'Driver', 'Route', 'Client', 'Start Date', 'End Date', 'Description', 'Distance (km)', 'Revenue'],
                ['UA123', 'John Doe', 'JHB-CPT', 'Client A', '2024-01-15', '2024-01-18', 'General freight', '1400', '25000']
              ];
              
              let csvContent = "data:text/csv;charset=utf-8,";
              templateData.forEach(row => {
                csvContent += row.join(",") + "\\r\\n";
              });
              
              const encodedUri = encodeURI(csvContent);
              const link = document.createElement("a");
              link.setAttribute("href", encodedUri);
              link.setAttribute("download", "trip-import-template.csv");
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
          >
            Download CSV Template
          </Button>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={importing}
          >
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={!selectedFile || importing}
            icon={importing ? undefined : <Upload className="w-4 h-4" />}
            loading={importing}
          >
            {importing ? 'Importing...' : 'Import Data'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default LoadImportModal;import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Card, { CardContent, CardHeader } from '../ui/Card';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { Input, Select, TextArea } from '../ui/FormElements';
import { 
  DollarSign, 
  Plus, 
  Edit, 
  Trash2, 
  AlertTriangle, 
  TrendingDown, 
  Calendar,
  MapPin,
  User,
  X,
  Save,
  CheckCircle,
  FileText
} from 'lucide-react';
import { MissedLoad, MISSED_LOAD_REASONS, CLIENTS } from '../../types';
import { formatCurrency, formatDate } from '../../utils/helpers';

interface MissedLoadsTrackerProps {
  missedLoads: MissedLoad[];
  onAddMissedLoad: (missedLoad: Omit<MissedLoad, 'id'>) => void;
  onUpdateMissedLoad: (missedLoad: MissedLoad) => void;
  onDeleteMissedLoad?: (id: string) => void;
}

const MissedLoadsTracker: React.FC<MissedLoadsTrackerProps> = ({
  missedLoads,
  onAddMissedLoad,
  onUpdateMissedLoad,
  onDeleteMissedLoad
}) => {
  const [showModal, setShowModal] = useState(false);
  const [showResolutionModal, setShowResolutionModal] = useState(false);
  const [editingLoad, setEditingLoad] = useState<MissedLoad | null>(null);
  const [resolvingLoad, setResolvingLoad] = useState<MissedLoad | null>(null);
  const [formData, setFormData] = useState({
    customerName: '',
    loadRequestDate: new Date().toISOString().split('T')[0],
    requestedPickupDate: '',
    requestedDeliveryDate: '',
    route: '',
    estimatedRevenue: '',
    currency: 'ZAR' as 'ZAR' | 'USD',
    reason: '',
    reasonDescription: '',
    resolutionStatus: 'pending' as 'pending' | 'resolved' | 'lost_opportunity' | 'rescheduled',
    followUpRequired: true,
    competitorWon: false,
    impact: 'medium' as 'low' | 'medium' | 'high'
  });
  const [resolutionData, setResolutionData] = useState({
    resolutionNotes: '',
    compensationOffered: '',
    compensationNotes: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleResolutionChange = (field: string, value: string) => {
    setResolutionData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.customerName.trim()) {
      newErrors.customerName = 'Customer name is required';
    }
    if (!formData.loadRequestDate) {
      newErrors.loadRequestDate = 'Load request date is required';
    }
    if (!formData.requestedPickupDate) {
      newErrors.requestedPickupDate = 'Requested pickup date is required';
    }
    if (!formData.requestedDeliveryDate) {
      newErrors.requestedDeliveryDate = 'Requested delivery date is required';
    }
    if (!formData.route.trim()) {
      newErrors.route = 'Route is required';
    }
    if (!formData.estimatedRevenue || Number(formData.estimatedRevenue) <= 0) {
      newErrors.estimatedRevenue = 'Valid estimated revenue is required';
    }
    if (!formData.reason) {
      newErrors.reason = 'Reason for missing load is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateResolutionForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!resolutionData.resolutionNotes.trim()) {
      newErrors.resolutionNotes = 'Resolution notes are required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    const missedLoadData: Omit<MissedLoad, 'id'> = {
      customerName: formData.customerName.trim(),
      loadRequestDate: formData.loadRequestDate,
      requestedPickupDate: formData.requestedPickupDate,
      requestedDeliveryDate: formData.requestedDeliveryDate,
      route: formData.route.trim(),
      estimatedRevenue: Number(formData.estimatedRevenue),
      currency: formData.currency,
      reason: formData.reason as any,
      reasonDescription: formData.reasonDescription.trim() || undefined,
      resolutionStatus: formData.resolutionStatus,
      followUpRequired: formData.followUpRequired,
      competitorWon: formData.competitorWon,
      recordedBy: 'Current User',
      recordedAt: new Date().toISOString(),
      impact: formData.impact
    };

    if (editingLoad) {
      onUpdateMissedLoad({ ...missedLoadData, id: editingLoad.id });
      alert('Missed load updated successfully!');
    } else {
      onAddMissedLoad(missedLoadData);
      alert('Missed load recorded successfully!');
    }

    handleClose();
  };

  const handleResolutionSubmit = () => {
    if (!validateResolutionForm() || !resolvingLoad) return;

    const updatedLoad: MissedLoad = {
      ...resolvingLoad,
      resolutionStatus: 'resolved',
      resolutionNotes: resolutionData.resolutionNotes.trim(),
      resolvedAt: new Date().toISOString(),
      resolvedBy: 'Current User',
      compensationOffered: resolutionData.compensationOffered ? Number(resolutionData.compensationOffered) : undefined,
      compensationNotes: resolutionData.compensationNotes.trim() || undefined
    };

    onUpdateMissedLoad(updatedLoad);
    
    alert(`Missed load resolved successfully!\n\nResolution: ${resolutionData.resolutionNotes}\n${resolutionData.compensationOffered ? `Compensation offered: ${formatCurrency(Number(resolutionData.compensationOffered), resolvingLoad.currency)}` : ''}`);
    
    setShowResolutionModal(false);
    setResolvingLoad(null);
    setResolutionData({
      resolutionNotes: '',
      compensationOffered: '',
      compensationNotes: ''
    });
    setErrors({});
  };

  const handleEdit = (load: MissedLoad) => {
    setFormData({
      customerName: load.customerName,
      loadRequestDate: load.loadRequestDate,
      requestedPickupDate: load.requestedPickupDate,
      requestedDeliveryDate: load.requestedDeliveryDate,
      route: load.route,
      estimatedRevenue: load.estimatedRevenue.toString(),
      currency: load.currency,
      reason: load.reason,
      reasonDescription: load.reasonDescription || '',
      resolutionStatus: load.resolutionStatus,
      followUpRequired: load.followUpRequired,
      competitorWon: load.competitorWon || false,
      impact: load.impact
    });
    setEditingLoad(load);
    setShowModal(true);
  };

  const handleResolve = (load: MissedLoad) => {
    setResolvingLoad(load);
    setResolutionData({
      resolutionNotes: '',
      compensationOffered: '',
      compensationNotes: ''
    });
    setShowResolutionModal(true);
  };

  const handleDelete = (id: string) => {
    const load = missedLoads.find(l => l.id === id);
    if (!load) return;

    const confirmMessage = `Are you sure you want to delete this missed load?\n\n` +
      `Customer: ${load.customerName}\n` +
      `Route: ${load.route}\n` +
      `Estimated Revenue: ${formatCurrency(load.estimatedRevenue, load.currency)}\n\n` +
      `This action cannot be undone.`;

    if (confirm(confirmMessage)) {
      onDeleteMissedLoad?.(id);
    }
  };

  const handleClose = () => {
    setShowModal(false);
    setEditingLoad(null);
    setFormData({
      customerName: '',
      loadRequestDate: new Date().toISOString().split('T')[0],
      requestedPickupDate: '',
      requestedDeliveryDate: '',
      route: '',
      estimatedRevenue: '',
      currency: 'ZAR',
      reason: '',
      reasonDescription: '',
      resolutionStatus: 'pending',
      followUpRequired: true,
      competitorWon: false,
      impact: 'medium'
    });
    setErrors({});
  };

  const handleNewMissedLoad = () => {
    setEditingLoad(null);
    setShowModal(true);
  };

  // Calculate summary metrics
  const totalMissedLoads = missedLoads.length;
  const revenueLostZAR = missedLoads
    .filter(load => load.currency === 'ZAR' && load.resolutionStatus !== 'resolved')
    .reduce((sum, load) => sum + load.estimatedRevenue, 0);
  const revenueLostUSD = missedLoads
    .filter(load => load.currency === 'USD' && load.resolutionStatus !== 'resolved')
    .reduce((sum, load) => sum + load.estimatedRevenue, 0);
  const resolvedLoads = missedLoads.filter(load => load.resolutionStatus === 'resolved').length;
  const competitorWins = missedLoads.filter(load => load.competitorWon).length;
  const compensationOfferedZAR = missedLoads
    .filter(load => load.currency === 'ZAR' && load.compensationOffered)
    .reduce((sum, load) => sum + (load.compensationOffered || 0), 0);
  const compensationOfferedUSD = missedLoads
    .filter(load => load.currency === 'USD' && load.compensationOffered)
    .reduce((sum, load) => sum + (load.compensationOffered || 0), 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'rescheduled': return 'bg-blue-100 text-blue-800';
      case 'lost_opportunity': return 'bg-red-100 text-red-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-green-100 text-green-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Missed Loads Tracker</h2>
          <p className="text-gray-600">Track and analyze missed business opportunities</p>
        </div>
        <Button
          onClick={handleNewMissedLoad}
          icon={<Plus className="w-4 h-4" />}
        >
          Record Missed Load
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Missed Loads</p>
                <p className="text-2xl font-bold text-red-600">{totalMissedLoads}</p>
                <p className="text-xs text-gray-400">{resolvedLoads} resolved</p>
              </div>
              <TrendingDown className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Revenue Lost</p>
                <div className="space-y-1">
                  <p className="text-lg font-bold text-red-600">
                    {formatCurrency(revenueLostZAR, 'ZAR')}
                  </p>
                  <p className="text-lg font-bold text-red-600">
                    {formatCurrency(revenueLostUSD, 'USD')}
                  </p>
                </div>
              </div>
              <DollarSign className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Compensation Offered</p>
                <div className="space-y-1">
                  <p className="text-lg font-bold text-blue-600">
                    {formatCurrency(compensationOfferedZAR, 'ZAR')}
                  </p>
                  <p className="text-lg font-bold text-blue-600">
                    {formatCurrency(compensationOfferedUSD, 'USD')}
                  </p>
                </div>
              </div>
              <CheckCircle className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Competitor Wins</p>
                <p className="text-2xl font-bold text-red-600">{competitorWins}</p>
                <p className="text-xs text-gray-400">High priority</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Missed Loads List */}
      <Card>
        <CardHeader title={`Missed Loads (${missedLoads.length})`} />
        <CardContent>
          {missedLoads.length === 0 ? (
            <div className="text-center py-12">
              <TrendingDown className="mx-auto h-10 w-10 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No missed loads recorded</h3>
              <p className="mt-1 text-sm text-gray-500">
                Start tracking missed business opportunities to identify improvement areas.
              </p>
              <div className="mt-6">
                <Button onClick={handleNewMissedLoad} icon={<Plus className="w-4 h-4" />}>
                  Record First Missed Load
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {missedLoads.map((load) => (
                <div key={load.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-medium text-gray-900">{load.customerName}</h3>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(load.resolutionStatus)}`}>
                          {load.resolutionStatus.replace('_', ' ').toUpperCase()}
                        </span>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getImpactColor(load.impact)}`}>
                          {load.impact.toUpperCase()} IMPACT
                        </span>
                        {load.competitorWon && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            COMPETITOR WON
                          </span>
                        )}
                        {load.resolutionStatus === 'resolved' && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            RESOLVED
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-3">
                        <div className="flex items-center space-x-2">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-500">Route</p>
                            <p className="font-medium">{load.route}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-500">Requested Dates</p>
                            <p className="font-medium text-sm">
                              {formatDate(load.requestedPickupDate)} - {formatDate(load.requestedDeliveryDate)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <DollarSign className="w-4 h-4 text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-500">Estimated Revenue</p>
                            <p className="font-medium text-red-600">
                              {formatCurrency(load.estimatedRevenue, load.currency)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-500">Recorded By</p>
                            <p className="font-medium text-sm">{load.recordedBy}</p>
                          </div>
                        </div>
                      </div>

                      <div className="mb-3">
                        <p className="text-sm text-gray-500">Reason</p>
                        <p className="font-medium">
                          {MISSED_LOAD_REASONS.find(r => r.value === load.reason)?.label || load.reason}
                        </p>
                        {load.reasonDescription && (
                          <p className="text-sm text-gray-600 mt-1">{load.reasonDescription}</p>
                        )}
                      </div>

                      {load.resolutionStatus === 'resolved' && load.resolutionNotes && (
                        <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded">
                          <p className="text-sm font-medium text-green-800">Resolution Notes:</p>
                          <p className="text-sm text-green-700">{load.resolutionNotes}</p>
                          {load.compensationOffered && (
                            <p className="text-sm text-green-700 mt-1">
                              <strong>Compensation Offered:</strong> {formatCurrency(load.compensationOffered, load.currency)}
                            </p>
                          )}
                          <p className="text-xs text-green-600 mt-1">
                            Resolved by {load.resolvedBy} on {load.resolvedAt ? formatDate(load.resolvedAt) : 'Unknown'}
                          </p>
                        </div>
                      )}

                      <div className="text-xs text-gray-500">
                        Recorded on {formatDate(load.recordedAt)} • 
                        {load.followUpRequired && <span className="text-amber-600 font-medium ml-1">Follow-up required</span>}
                      </div>
                    </div>

                    <div className="flex space-x-2 ml-4">
                      {load.resolutionStatus !== 'resolved' && (
                        <Button
                          size="sm"
                          onClick={() => handleResolve(load)}
                          icon={<FileText className="w-3 h-3" />}
                        >
                          Resolve
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(load)}
                        icon={<Edit className="w-3 h-3" />}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleDelete(load.id)}
                        icon={<Trash2 className="w-3 h-3" />}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={handleClose}
        title={editingLoad ? 'Edit Missed Load' : 'Record Missed Load'}
        maxWidth="lg"
      >
        <div className="space-y-6">
          <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-amber-800">Missed Load Documentation</h4>
                <p className="text-sm text-amber-700 mt-1">
                  Record all missed business opportunities to identify patterns and improve our response capabilities. 
                  This data helps in capacity planning and competitive analysis.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Customer Name *"
              value={formData.customerName}
              onChange={(e) => handleChange('customerName', e.target.value)}
              options={[
                { label: 'Select customer...', value: '' },
                ...CLIENTS.map(c => ({ label: c, value: c })),
                { label: 'Other (specify in description)', value: 'Other' }
              ]}
              error={errors.customerName}
            />

            <Input
              label="Load Request Date *"
              type="date"
              value={formData.loadRequestDate}
              onChange={(e) => handleChange('loadRequestDate', e.target.value)}
              error={errors.loadRequestDate}
            />

            <Input
              label="Requested Pickup Date *"
              type="date"
              value={formData.requestedPickupDate}
              onChange={(e) => handleChange('requestedPickupDate', e.target.value)}
              error={errors.requestedPickupDate}
            />

            <Input
              label="Requested Delivery Date *"
              type="date"
              value={formData.requestedDeliveryDate}
              onChange={(e) => handleChange('requestedDeliveryDate', e.target.value)}
              error={errors.requestedDeliveryDate}
            />

            <Input
              label="Route *"
              value={formData.route}
              onChange={(e) => handleChange('route', e.target.value)}
              placeholder="e.g., Johannesburg to Cape Town"
              error={errors.route}
            />

            <div className="grid grid-cols-2 gap-2">
              <Select
                label="Currency *"
                value={formData.currency}
                onChange={(e) => handleChange('currency', e.target.value)}
                options={[
                  { label: 'ZAR (R)', value: 'ZAR' },
                  { label: 'USD ($)', value: 'USD' }
                ]}
              />
              <Input
                label="Estimated Revenue *"
                type="number"
                step="0.01"
                min="0"
                value={formData.estimatedRevenue}
                onChange={(e) => handleChange('estimatedRevenue', e.target.value)}
                placeholder="0.00"
                error={errors.estimatedRevenue}
              />
            </div>

            <Select
              label="Reason for Missing Load *"
              value={formData.reason}
              onChange={(e) => handleChange('reason', e.target.value)}
              options={[
                { label: 'Select reason...', value: '' },
                ...MISSED_LOAD_REASONS
              ]}
              error={errors.reason}
            />

            <Select
              label="Business Impact"
              value={formData.impact}
              onChange={(e) => handleChange('impact', e.target.value)}
              options={[
                { label: 'Low Impact', value: 'low' },
                { label: 'Medium Impact', value: 'medium' },
                { label: 'High Impact', value: 'high' }
              ]}
            />

            <Select
              label="Resolution Status"
              value={formData.resolutionStatus}
              onChange={(e) => handleChange('resolutionStatus', e.target.value)}
              options={[
                { label: 'Pending', value: 'pending' },
                { label: 'Resolved', value: 'resolved' },
                { label: 'Lost Opportunity', value: 'lost_opportunity' },
                { label: 'Rescheduled', value: 'rescheduled' }
              ]}
            />
          </div>

          <TextArea
            label="Additional Details"
            value={formData.reasonDescription}
            onChange={(e) => handleChange('reasonDescription', e.target.value)}
            placeholder="Provide additional context about why this load was missed and any lessons learned..."
            rows={3}
          />

          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="followUpRequired"
                checked={formData.followUpRequired}
                onChange={(e) => handleChange('followUpRequired', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="followUpRequired" className="text-sm font-medium text-gray-700">
                Follow-up required with customer
              </label>
            </div>

            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="competitorWon"
                checked={formData.competitorWon}
                onChange={(e) => handleChange('competitorWon', e.target.checked)}
                className="rounded border-gray-300 text-red-600 focus:ring-red-500"
              />
              <label htmlFor="competitorWon" className="text-sm font-medium text-gray-700">
                Competitor won this load
              </label>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleClose}
              icon={<X className="w-4 h-4" />}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              icon={<Save className="w-4 h-4" />}
            >
              {editingLoad ? 'Update Missed Load' : 'Record Missed Load'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Resolution Modal */}
      <Modal
        isOpen={showResolutionModal}
        onClose={() => {
          setShowResolutionModal(false);
          setResolvingLoad(null);
          setResolutionData({
            resolutionNotes: '',
            compensationOffered: '',
            compensationNotes: ''
          });
          setErrors({});
        }}
        title="Resolve Missed Load"
        maxWidth="md"
      >
        {resolvingLoad && (
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-green-800">Missed Load Resolution</h4>
                  <p className="text-sm text-green-700 mt-1">
                    Document how this missed load was resolved and any compensation or goodwill gestures offered to maintain customer relationships.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-md p-4">
              <h4 className="text-sm font-medium text-gray-800 mb-2">Missed Load Details</h4>
              <div className="text-sm text-gray-700 space-y-1">
                <p><strong>Customer:</strong> {resolvingLoad.customerName}</p>
                <p><strong>Route:</strong> {resolvingLoad.route}</p>
                <p><strong>Estimated Revenue:</strong> {formatCurrency(resolvingLoad.estimatedRevenue, resolvingLoad.currency)}</p>
                <p><strong>Reason:</strong> {MISSED_LOAD_REASONS.find(r => r.value === resolvingLoad.reason)?.label || resolvingLoad.reason}</p>
              </div>
            </div>

            <div className="space-y-4">
              <TextArea
                label="Resolution Notes *"
                value={resolutionData.resolutionNotes}
                onChange={(e) => handleResolutionChange('resolutionNotes', e.target.value)}
                placeholder="Describe how this missed load was resolved, what actions were taken, and the outcome..."
                rows={4}
                error={errors.resolutionNotes}
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label={`Compensation Offered (${resolvingLoad.currency})`}
                  type="number"
                  step="0.01"
                  min="0"
                  value={resolutionData.compensationOffered}
                  onChange={(e) => handleResolutionChange('compensationOffered', e.target.value)}
                  placeholder="0.00"
                />
                <div></div>
              </div>

              <TextArea
                label="Compensation Notes"
                value={resolutionData.compensationNotes}
                onChange={(e) => handleResolutionChange('compensationNotes', e.target.value)}
                placeholder="Details about any compensation or goodwill gestures offered..."
                rows={3}
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <h4 className="text-sm font-medium text-blue-800 mb-2">Resolution Recording</h4>
              <div className="text-sm text-blue-700 space-y-1">
                <p>• This missed load will be marked as <strong>RESOLVED</strong></p>
                <p>• Resolution details will be recorded for future reference</p>
                <p>• Customer relationship impact will be tracked</p>
                <p>• Resolution will be logged with timestamp and user information</p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setShowResolutionModal(false);
                  setResolvingLoad(null);
                  setResolutionData({
                    resolutionNotes: '',
                    compensationOffered: '',
                    compensationNotes: ''
                  });
                  setErrors({});
                }}
                icon={<X className="w-4 h-4" />}
              >
                Cancel
              </Button>
              <Button
                onClick={handleResolutionSubmit}
                icon={<CheckCircle className="w-4 h-4" />}
              >
                Mark as Resolved
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default MissedLoadsTracker;import React, { useState } from 'react';
import { Trip, TripDeletionRecord, TRIP_DELETION_REASONS } from '../../types';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { Select, TextArea } from '../ui/FormElements';
import { Trash2, X, AlertTriangle, Shield } from 'lucide-react';
import { formatCurrency, calculateTotalCosts } from '../../utils/helpers';

interface TripDeletionModalProps {
  isOpen: boolean;
  trip: Trip;
  onClose: () => void;
  onDelete: (trip: Trip, deletionRecord: Omit<TripDeletionRecord, 'id'>) => void;
  userRole: 'admin' | 'manager' | 'operator';
}

const TripDeletionModal: React.FC<TripDeletionModalProps> = ({
  isOpen,
  trip,
  onClose,
  onDelete,
  userRole
}) => {
  const [deletionReason, setDeletionReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const totalCosts = calculateTotalCosts(trip.costs);
  const flaggedItems = trip.costs.filter(c => c.isFlagged).length;
  const confirmationText = `DELETE ${trip.fleetNumber}`;

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!deletionReason) {
      newErrors.deletionReason = 'Deletion reason is required';
    }
    
    if (deletionReason === 'Other (specify in comments)' && !customReason.trim()) {
      newErrors.customReason = 'Please specify the reason for deletion';
    }

    if (confirmText !== confirmationText) {
      newErrors.confirmText = `Please type "${confirmationText}" to confirm deletion`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleDelete = () => {
    if (!validateForm()) return;

    const finalReason = deletionReason === 'Other (specify in comments)' ? customReason : deletionReason;

    const deletionRecord: Omit<TripDeletionRecord, 'id'> = {
      tripId: trip.id,
      deletedBy: 'Current User', // In real app, use actual user
      deletedAt: new Date().toISOString(),
      reason: finalReason,
      tripData: JSON.stringify(trip),
      totalRevenue: trip.baseRevenue,
      totalCosts: totalCosts,
      costEntriesCount: trip.costs.length,
      flaggedItemsCount: flaggedItems
    };

    onDelete(trip, deletionRecord);
    onClose();
  };

  // Check if user has permission to delete
  if (userRole !== 'admin') {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Access Denied" maxWidth="md">
        <div className="text-center space-y-4">
          <Shield className="w-16 h-16 text-red-500 mx-auto" />
          <h3 className="text-lg font-medium text-gray-900">Insufficient Permissions</h3>
          <p className="text-gray-600">
            Only administrators can delete completed trips. This restriction ensures data integrity and audit compliance.
          </p>
          <Button onClick={onClose}>Close</Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Delete Completed Trip"
      maxWidth="lg"
    >
      <div className="space-y-6">
        {/* Critical Warning */}
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-red-800">CRITICAL: Permanent Deletion</h4>
              <p className="text-sm text-red-700 mt-1">
                This action will permanently delete the completed trip and all associated data. 
                This operation cannot be undone. All deletion details will be logged for governance and audit purposes.
              </p>
            </div>
          </div>
        </div>

        {/* Trip Summary */}
        <div className="bg-gray-50 rounded-md p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Trip to be Deleted</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p><strong>Fleet:</strong> {trip.fleetNumber}</p>
              <p><strong>Driver:</strong> {trip.driverName}</p>
              <p><strong>Route:</strong> {trip.route}</p>
              <p><strong>Client:</strong> {trip.clientName}</p>
            </div>
            <div>
              <p><strong>Period:</strong> {trip.startDate} to {trip.endDate}</p>
              <p><strong>Revenue:</strong> {formatCurrency(trip.baseRevenue, trip.revenueCurrency)}</p>
              <p><strong>Total Costs:</strong> {formatCurrency(totalCosts, trip.revenueCurrency)}</p>
              <p><strong>Status:</strong> {trip.status.toUpperCase()}</p>
            </div>
          </div>
          
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="flex justify-between text-sm">
              <span>Cost Entries: <strong>{trip.costs.length}</strong></span>
              <span>Flagged Items: <strong className="text-red-600">{flaggedItems}</strong></span>
              <span>Attachments: <strong>{trip.costs.reduce((sum, cost) => sum + cost.attachments.length, 0)}</strong></span>
            </div>
          </div>
        </div>

        {/* Deletion Reason */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Deletion Justification (Required)</h3>
          
          <Select
            label="Reason for Deletion *"
            value={deletionReason}
            onChange={(e) => setDeletionReason(e.target.value)}
            options={[
              { label: 'Select reason for deletion...', value: '' },
              ...TRIP_DELETION_REASONS.map(reason => ({ label: reason, value: reason }))
            ]}
            error={errors.deletionReason}
          />

          {deletionReason === 'Other (specify in comments)' && (
            <TextArea
              label="Specify Reason *"
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="Please provide a detailed reason for deleting this completed trip..."
              rows={3}
              error={errors.customReason}
            />
          )}
        </div>

        {/* Confirmation */}
        <div className="space-y-4 border-t pt-4">
          <h3 className="text-lg font-medium text-gray-900">Confirmation Required</h3>
          <p className="text-sm text-gray-600">
            To confirm deletion, please type <strong>{confirmationText}</strong> in the field below:
          </p>
          
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={confirmationText}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
          />
          {errors.confirmText && (
            <p className="text-sm text-red-600">{errors.confirmText}</p>
          )}
        </div>

        {/* Data Retention Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <h4 className="text-sm font-medium text-blue-800">Data Retention & Audit Trail</h4>
          <p className="text-sm text-blue-700 mt-1">
            Upon deletion, the following information will be permanently archived in the deletion log:
          </p>
          <ul className="text-sm text-blue-700 mt-2 list-disc list-inside">
            <li>Complete trip data snapshot</li>
            <li>All cost entries and attachments metadata</li>
            <li>Deletion timestamp and administrator details</li>
            <li>Justification reason and comments</li>
            <li>Financial summary (revenue, costs, profit/loss)</li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={onClose}
            icon={<X className="w-4 h-4" />}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleDelete}
            disabled={confirmText !== confirmationText}
            icon={<Trash2 className="w-4 h-4" />}
          >
            Permanently Delete Trip
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default TripDeletionModal;import React, { useState } from 'react';
import { Trip, CostEntry, AdditionalCost } from '../../types';
import { useAppContext } from '../../context/AppContext';
import Card, { CardContent, CardHeader } from '../ui/Card';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import CostForm from '../cost/CostForm';  
import CostList from '../cost/CostList';
import TripReport from '../reports/TripReport';
import SystemCostGenerator from '../cost/SystemCostGenerator';
import InvoiceSubmissionModal from './InvoiceSubmissionModal';
import TripPlanningForm from './TripPlanningForm';  
import { 
  Plus,   
  ArrowLeft, 
  BarChart3, 
  CheckCircle,   
  AlertTriangle,   
  Flag, 
  Calculator,
  Send,
  Clock,  
  Calendar
} from 'lucide-react';
import { 
  formatCurrency, 
  calculateKPIs, 
  getFlaggedCostsCount, 
  getUnresolvedFlagsCount, 
  canCompleteTrip,
  formatDateTime
} from '../../utils/helpers';

interface TripDetailsProps {
  trip: Trip;
  onBack: () => void;
}

const TripDetails: React.FC<TripDetailsProps> = ({ trip, onBack }) => {
  const { addCostEntry, updateCostEntry, deleteCostEntry, updateTrip, addAdditionalCost, removeAdditionalCost, addDelayReason } = useAppContext();
  const [showCostForm, setShowCostForm] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showSystemCostGenerator, setShowSystemCostGenerator] = useState(false);
  const [showInvoiceSubmission, setShowInvoiceSubmission] = useState(false);
  const [showTripPlanning, setShowTripPlanning] = useState(false);
  const [editingCost, setEditingCost] = useState<CostEntry | undefined>();

  // Enhanced handleAddCost with file support
  const handleAddCost = (costData: Omit<CostEntry, 'id' | 'attachments'>, files?: FileList) => {
    try {
      const costId = addCostEntry(costData, files);
      setShowCostForm(false);
      
      // Show success message with cost details
      alert(`Cost entry added successfully!\n\nCategory: ${costData.category}\nAmount: ${formatCurrency(costData.amount, costData.currency)}\nReference: ${costData.referenceNumber}`);
    } catch (error) {
      console.error('Error adding cost entry:', error);
      alert('Error adding cost entry. Please try again.');
    }
  };

  // Enhanced handleUpdateCost with file support
  const handleUpdateCost = (costData: Omit<CostEntry, 'id' | 'attachments'>, files?: FileList) => {
    if (editingCost) {
      try {
        // Process new files if provided
        const newAttachments = files ? Array.from(files).map((file, index) => ({
          id: `A${Date.now()}-${index}`,
          costEntryId: editingCost.id,
          filename: file.name,
          fileUrl: URL.createObjectURL(file),
          fileType: file.type,
          fileSize: file.size,
          uploadedAt: new Date().toISOString(),
          fileData: ''
        })) : [];

        const updatedCost: CostEntry = {
          ...editingCost,
          ...costData,
          attachments: [...editingCost.attachments, ...newAttachments]
        };

        updateCostEntry(updatedCost);
        setEditingCost(undefined);
        setShowCostForm(false);
        
        alert('Cost entry updated successfully!');
      } catch (error) {
        console.error('Error updating cost entry:', error);
        alert('Error updating cost entry. Please try again.');
      }
    }
  };

  const handleEditCost = (cost: CostEntry) => {
    setEditingCost(cost);
    setShowCostForm(true);
  };

  const handleDeleteCost = (id: string) => {
    if (confirm('Are you sure you want to delete this cost entry? This action cannot be undone.')) {
      try {
        deleteCostEntry(id);
        alert('Cost entry deleted successfully!');
      } catch (error) {
        console.error('Error deleting cost entry:', error);
        alert('Error deleting cost entry. Please try again.');
      }
    }
  };

  const handleGenerateSystemCosts = (systemCosts: Omit<CostEntry, 'id' | 'attachments'>[]) => {
    try {
      // Add each system cost entry individually
      for (const costData of systemCosts) {
        addCostEntry(costData);
      }
      
      setShowSystemCostGenerator(false);
      
      // Show detailed success message
      alert(`System costs generated successfully!\n\n${systemCosts.length} cost entries have been added:\n\n${systemCosts.map(cost => `• ${cost.subCategory}: ${formatCurrency(cost.amount, cost.currency)}`).join('\n')}\n\nTotal system costs: ${formatCurrency(systemCosts.reduce((sum, cost) => sum + cost.amount, 0), trip.revenueCurrency)}`);
    } catch (error) {
      console.error('Error generating system costs:', error);
      alert('Error generating system costs. Please try again.');
    }
  };

  const handleCompleteTrip = () => {
    const unresolvedFlags = getUnresolvedFlagsCount(trip.costs);
    
    if (unresolvedFlags > 0) {
      alert(`Cannot complete trip: ${unresolvedFlags} unresolved flagged items must be resolved before completing the trip.\n\nPlease go to the Flags & Investigations section to resolve all outstanding issues.`);
      return;
    }

    const confirmMessage = `Are you sure you want to mark this trip as COMPLETED?\n\n` +
      `This will:\n` +
      `• Lock the trip from further editing\n` +
      `• Move it to the Completed Trips section\n` +
      `• Make it available for invoicing\n\n` +
      `This action cannot be undone.`;

    if (confirm(confirmMessage)) {
      try {
        updateTrip({
          ...trip,
          status: 'completed',
          completedAt: new Date().toISOString().split('T')[0],
          completedBy: 'Current User' // In a real app, this would be the logged-in user
        });
        
        alert('Trip has been successfully completed and is now ready for invoicing.');
        onBack();
      } catch (error) {
        console.error('Error completing trip:', error);
        alert('Error completing trip. Please try again.');
      }
    }
  };

  // Handle invoice submission
  const handleInvoiceSubmission = (invoiceData: {
    invoiceNumber: string;
    invoiceDate: string;
    invoiceDueDate: string;
    finalTimeline: {
      finalArrivalDateTime: string;
      finalOffloadDateTime: string;
      finalDepartureDateTime: string;
    };
    validationNotes: string;
    proofOfDelivery: FileList | null;
    signedInvoice: FileList | null;
  }) => {
    try {
      // Create proof of delivery attachments
      const podAttachments = invoiceData.proofOfDelivery ? Array.from(invoiceData.proofOfDelivery).map((file, index) => ({
        id: `POD${Date.now()}-${index}`,
        tripId: trip.id,
        filename: file.name,
        fileUrl: URL.createObjectURL(file),
        fileType: file.type,
        fileSize: file.size,
        uploadedAt: new Date().toISOString(),
        fileData: ''
      })) : [];

      // Create signed invoice attachments
      const invoiceAttachments = invoiceData.signedInvoice ? Array.from(invoiceData.signedInvoice).map((file, index) => ({
        id: `INV${Date.now()}-${index}`,
        tripId: trip.id,
        filename: file.name,
        fileUrl: URL.createObjectURL(file),
        fileType: file.type,
        fileSize: file.size,
        uploadedAt: new Date().toISOString(),
        fileData: ''
      })) : [];

      const updatedTrip: Trip = {
        ...trip,
        status: 'invoiced',
        invoiceNumber: invoiceData.invoiceNumber,
        invoiceDate: invoiceData.invoiceDate,
        invoiceDueDate: invoiceData.invoiceDueDate,
        invoiceSubmittedAt: new Date().toISOString(),
        invoiceSubmittedBy: 'Current User',
        invoiceValidationNotes: invoiceData.validationNotes,
        finalArrivalDateTime: invoiceData.finalTimeline.finalArrivalDateTime,
        finalOffloadDateTime: invoiceData.finalTimeline.finalOffloadDateTime,
        finalDepartureDateTime: invoiceData.finalTimeline.finalDepartureDateTime,
        timelineValidated: true,
        timelineValidatedBy: 'Current User',
        timelineValidatedAt: new Date().toISOString(),
        proofOfDelivery: podAttachments,
        signedInvoice: invoiceAttachments,
        paymentStatus: 'unpaid'
      };

      updateTrip(updatedTrip);
      setShowInvoiceSubmission(false);
      
      alert(`Trip successfully submitted for invoicing!\n\nInvoice Number: ${invoiceData.invoiceNumber}\nDue Date: ${invoiceData.invoiceDueDate}\n\nThe trip is now in the invoicing workflow and payment tracking has begun.`);
      onBack();
    } catch (error) {
      console.error('Error submitting invoice:', error);
      alert('Error submitting invoice. Please try again.');
    }
  };

  // Handle additional cost management
  const handleAddAdditionalCost = (cost: Omit<AdditionalCost, 'id'>, files?: FileList) => {
    try {
      addAdditionalCost(trip.id, cost, files);
    } catch (error) {
      console.error('Error adding additional cost:', error);
      alert('Error adding additional cost. Please try again.');
    }
  };

  const handleRemoveAdditionalCost = (costId: string) => {
    try {
      removeAdditionalCost(trip.id, costId);
    } catch (error) {
      console.error('Error removing additional cost:', error);
      alert('Error removing additional cost. Please try again.');
    }
  };

  const closeCostForm = () => {
    setShowCostForm(false);
    setEditingCost(undefined);
  };

  const kpis = calculateKPIs(trip);
  const flaggedCount = getFlaggedCostsCount(trip.costs);
  const unresolvedFlags = getUnresolvedFlagsCount(trip.costs);
  const canComplete = canCompleteTrip(trip);
  
  // Check if system costs have been generated
  const hasSystemCosts = trip.costs.some(cost => cost.isSystemGenerated);
  const systemCosts = trip.costs.filter(cost => cost.isSystemGenerated);
  const manualCosts = trip.costs.filter(cost => !cost.isSystemGenerated);

  // Calculate timeline discrepancies for display
  const hasTimelineDiscrepancies = () => {
    if (!trip.plannedArrivalDateTime || !trip.actualArrivalDateTime) return false;
    
    const planned = new Date(trip.plannedArrivalDateTime);
    const actual = new Date(trip.actualArrivalDateTime);
    const diffHours = Math.abs((actual.getTime() - planned.getTime()) / (1000 * 60 * 60));
    
    return diffHours > 1; // More than 1 hour difference
  };

  return (
    <div className="space-y-6">
      {/* Header with Navigation and Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <Button variant="outline" onClick={onBack} icon={<ArrowLeft className="w-4 h-4" />}>
          Back to Trips
        </Button>
        
        <div className="flex flex-wrap gap-3">
          <Button 
            variant="outline" 
            onClick={() => setShowReport(true)} 
            icon={<BarChart3 className="w-4 h-4" />}
          >
            View Report
          </Button>
          
          {trip.status === 'active' && (
            <>
              <Button 
                variant="outline"
                onClick={() => setShowTripPlanning(true)} 
                icon={<Calendar className="w-4 h-4" />}
              >
                Trip Planning
              </Button>

              {!hasSystemCosts && (
                <Button 
                  variant="outline"
                  onClick={() => setShowSystemCostGenerator(true)} 
                  icon={<Calculator className="w-4 h-4" />}
                >
                  Generate System Costs
                </Button>
              )}
              
              <Button 
                onClick={() => setShowCostForm(true)} 
                icon={<Plus className="w-4 h-4" />}
              >
                Add Cost Entry
              </Button>
              
              <Button 
                onClick={handleCompleteTrip}
                disabled={!canComplete}
                icon={<CheckCircle className="w-4 h-4" />}
                className={!canComplete ? 'opacity-50 cursor-not-allowed' : ''}
                title={!canComplete ? `Cannot complete: ${unresolvedFlags} unresolved flags` : 'Mark trip as completed'}
              >
                Complete Trip
              </Button>
            </>
          )}

          {trip.status === 'completed' && (
            <Button 
              onClick={() => setShowInvoiceSubmission(true)}
              icon={<Send className="w-4 h-4" />}
            >
              Submit for Invoicing
            </Button>
          )}
        </div>
      </div>

      {/* Status Alerts */}
      {trip.status === 'invoiced' && (
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-md">
          <div className="flex items-start">
            <Send className="w-5 h-5 text-blue-600 mt-0.5 mr-3" />
            <div>
              <h4 className="text-sm font-medium text-blue-800">
                Trip Invoiced - Payment Tracking Active
              </h4>
              <p className="text-sm text-blue-700 mt-1">
                Invoice #{trip.invoiceNumber} submitted on {formatDateTime(trip.invoiceSubmittedAt!)} by {trip.invoiceSubmittedBy}. 
                Due date: {trip.invoiceDueDate}. Payment status: {trip.paymentStatus.toUpperCase()}.
              </p>
              {trip.timelineValidated && (
                <p className="text-sm text-blue-600 mt-1">
                  ✓ Timeline validated on {formatDateTime(trip.timelineValidatedAt!)}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Timeline Discrepancy Alert */}
      {hasTimelineDiscrepancies() && trip.status === 'active' && (
        <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-md">
          <div className="flex items-start">
            <Clock className="w-5 h-5 text-amber-600 mt-0.5 mr-3" />
            <div>
              <h4 className="text-sm font-medium text-amber-800">
                Timeline Discrepancies Detected
              </h4>
              <p className="text-sm text-amber-700 mt-1">
                Significant differences found between planned and actual times. Review timeline in Trip Planning section before completion.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Auto-completion notification */}
      {trip.autoCompletedAt && (
        <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-r-md">
          <div className="flex items-start">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-3" />
            <div>
              <h4 className="text-sm font-medium text-green-800">
                Trip Auto-Completed
              </h4>
              <p className="text-sm text-green-700 mt-1">
                This trip was automatically completed on {new Date(trip.autoCompletedAt).toLocaleDateString()} 
                because all investigations were resolved. Reason: {trip.autoCompletedReason}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* System Costs Alert */}
      {trip.status === 'active' && !hasSystemCosts && (
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-md">
          <div className="flex items-start">
            <Calculator className="w-5 h-5 text-blue-600 mt-0.5 mr-3" />
            <div>
              <h4 className="text-sm font-medium text-blue-800">
                System Costs Not Generated
              </h4>
              <p className="text-sm text-blue-700 mt-1">
                Automatic operational overhead costs have not been applied to this trip. 
                Generate system costs to ensure accurate profitability assessment including per-kilometer and per-day fixed costs.
              </p>
              <div className="mt-2">
                <Button 
                  size="sm"
                  onClick={() => setShowSystemCostGenerator(true)} 
                  icon={<Calculator className="w-4 h-4" />}
                >
                  Generate System Costs Now
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* System Costs Summary */}
      {hasSystemCosts && (
        <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-r-md">
          <div className="flex items-start">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-3" />
            <div>
              <h4 className="text-sm font-medium text-green-800">
                System Costs Applied ({systemCosts.length} entries)
              </h4>
              <p className="text-sm text-green-700 mt-1">
                Automatic operational overhead costs have been applied: {formatCurrency(systemCosts.reduce((sum, cost) => sum + cost.amount, 0), trip.revenueCurrency)} total system costs.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Trip Status Alerts */}
      {trip.status === 'active' && unresolvedFlags > 0 && (
        <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-md">
          <div className="flex items-start">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 mr-3" />
            <div>
              <h4 className="text-sm font-medium text-amber-800">
                {unresolvedFlags} Unresolved Flag{unresolvedFlags !== 1 ? 's' : ''} - Trip Cannot Be Completed
              </h4>
              <p className="text-sm text-amber-700 mt-1">
                All flagged cost entries must be investigated and resolved before this trip can be marked as completed. 
                Visit the <strong>Flags & Investigations</strong> section to resolve outstanding issues.
              </p>
              <div className="mt-2">
                <span className="text-xs text-amber-600">
                  Flagged items: {flaggedCount} total • {unresolvedFlags} unresolved • {flaggedCount - unresolvedFlags} resolved
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {trip.status === 'completed' && (
        <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-r-md">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
            <div>
              <h4 className="text-sm font-medium text-green-800">Trip Completed - Ready for Invoicing</h4>
              <p className="text-sm text-green-700">
                This trip was completed on {trip.completedAt} by {trip.completedBy}. 
                All cost entries are finalized and the trip is ready for invoice submission.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Trip Summary with Enhanced KPIs */}
      <Card>
        <CardHeader 
          title={`Fleet ${trip.fleetNumber} - Trip Details`}
          subtitle={
            trip.status === 'completed' ? `Completed ${trip.completedAt}` : 
            trip.status === 'invoiced' ? `Invoiced ${trip.invoiceDate}` :
            'Active Trip'
          }
        />
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Trip Information */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900 border-b pb-2">Trip Information</h4>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Driver</p>
                  <p className="font-medium">{trip.driverName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Client</p>
                  <p className="font-medium">{trip.clientName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Client Type</p>
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    trip.clientType === 'internal' 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-purple-100 text-purple-800'
                  }`}>
                    {trip.clientType === 'internal' ? 'Internal Client' : 'External Client'}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Route</p>
                  <p className="font-medium">{trip.route}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Duration</p>
                  <p className="font-medium">{trip.startDate} to {trip.endDate}</p>
                </div>
                {trip.distanceKm && (
                  <div>
                    <p className="text-sm text-gray-500">Distance</p>
                    <p className="font-medium">{trip.distanceKm} km</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    trip.status === 'completed' ? 'bg-green-100 text-green-800' : 
                    trip.status === 'invoiced' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {trip.status === 'completed' ? 'Completed' : 
                     trip.status === 'invoiced' ? 'Invoiced' : 'Active'}
                  </span>
                </div>
                {trip.description && (
                  <div>
                    <p className="text-sm text-gray-500">Description</p>
                    <p className="font-medium text-gray-700">{trip.description}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Financial Summary */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900 border-b pb-2">Financial Summary</h4>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Currency</p>
                  <p className="font-medium">{kpis.currency} ({kpis.currency === 'USD' ? '$' : 'R'})</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Base Revenue</p>
                  <p className="font-medium text-green-600">{formatCurrency(kpis.totalRevenue, kpis.currency)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Costs</p>
                  <p className="font-medium text-red-600">{formatCurrency(kpis.totalExpenses, kpis.currency)}</p>
                  {hasSystemCosts && (
                    <div className="text-xs text-gray-500 mt-1">
                      Manual: {formatCurrency(manualCosts.reduce((sum, cost) => sum + cost.amount, 0), kpis.currency)} • 
                      System: {formatCurrency(systemCosts.reduce((sum, cost) => sum + cost.amount, 0), kpis.currency)}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-500">Net Profit/Loss</p>
                  <p className={`font-bold text-lg ${kpis.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(kpis.netProfit, kpis.currency)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Profit Margin</p>
                  <p className={`font-medium ${kpis.profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {kpis.profitMargin.toFixed(2)}%
                  </p>
                </div>
              </div>
            </div>

            {/* KPIs and Status */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900 border-b pb-2">Key Metrics & Status</h4>
              <div className="space-y-3">
                {kpis.costPerKm > 0 && (
                  <div>
                    <p className="text-sm text-gray-500">Cost per Kilometer</p>
                    <p className="font-medium">{formatCurrency(kpis.costPerKm, kpis.currency)}/km</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-500">Cost Entries</p>
                  <p className="font-medium">{trip.costs.length} entries</p>
                  {hasSystemCosts && (
                    <div className="text-xs text-gray-500">
                      {manualCosts.length} manual • {systemCosts.length} system
                    </div>
                  )}
                </div>
                {flaggedCount > 0 && (
                  <div>
                    <p className="text-sm text-gray-500">Flagged Items</p>
                    <div className="flex items-center space-x-2">
                      <Flag className="w-4 h-4 text-amber-500" />
                      <span className="font-medium text-amber-600">
                        {flaggedCount} flagged
                      </span>
                      {unresolvedFlags > 0 && (
                        <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                          {unresolvedFlags} unresolved
                        </span>
                      )}
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-500">Documentation Status</p>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>With receipts:</span>
                      <span className="text-green-600 font-medium">
                        {trip.costs.filter(c => c.attachments.length > 0).length}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Missing receipts:</span>
                      <span className="text-red-600 font-medium">
                        {trip.costs.filter(c => c.attachments.length === 0).length}
                      </span>
                    </div>
                  </div>
                </div>
                {trip.status === 'active' && (
                  <div>
                    <p className="text-sm text-gray-500">Completion Status</p>
                    <p className={`font-medium ${canComplete ? 'text-green-600' : 'text-red-600'}`}>
                      {canComplete ? 'Ready to Complete' : 'Cannot Complete'}
                    </p>
                    {!canComplete && (
                      <p className="text-xs text-red-500 mt-1">
                        Resolve {unresolvedFlags} flag{unresolvedFlags !== 1 ? 's' : ''} first
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cost Entries Section */}
      <Card>
        <CardHeader
          title={`Cost Entries (${trip.costs.length})`}
          action={
            trip.status === 'active' && (
              <Button size="sm" onClick={() => setShowCostForm(true)} icon={<Plus className="w-4 h-4" />}>
                Add Cost Entry
              </Button>
            )
          }
        />
        <CardContent>
          <CostList 
            costs={trip.costs} 
            onEdit={trip.status === 'active' ? handleEditCost : undefined}
            onDelete={trip.status === 'active' ? handleDeleteCost : undefined}
          />
        </CardContent>
      </Card>

      {/* Modals */}
      {trip.status === 'active' && (
        <>
          <Modal
            isOpen={showCostForm}
            onClose={closeCostForm}
            title={editingCost ? 'Edit Cost Entry' : 'Add Cost Entry'}
            maxWidth="lg"
          >
            <CostForm
              tripId={trip.id}
              cost={editingCost}
              onSubmit={editingCost ? handleUpdateCost : handleAddCost}
              onCancel={closeCostForm}
            />
          </Modal>

          <Modal
            isOpen={showSystemCostGenerator}
            onClose={() => setShowSystemCostGenerator(false)}
            title="Generate System Costs"
            maxWidth="2xl"
          >
            <SystemCostGenerator
              trip={trip}
              onGenerateSystemCosts={handleGenerateSystemCosts}
            />
          </Modal>

          <Modal
            isOpen={showTripPlanning}
            onClose={() => setShowTripPlanning(false)}
            title="Trip Planning & Timeline"
            maxWidth="2xl"
          >
            <TripPlanningForm
              trip={trip}
              onUpdate={updateTrip}
              onAddDelay={(delay) => addDelayReason(trip.id, delay)}
            />
          </Modal>
        </>
      )}

      {trip.status === 'completed' && (
        <InvoiceSubmissionModal
          isOpen={showInvoiceSubmission}
          trip={trip}
          onClose={() => setShowInvoiceSubmission(false)}
          onSubmit={handleInvoiceSubmission}
          onAddAdditionalCost={handleAddAdditionalCost}
          onRemoveAdditionalCost={handleRemoveAdditionalCost}
        />
      )}

      <Modal
        isOpen={showReport}
        onClose={() => setShowReport(false)}
        title="Trip Report"
        maxWidth="2xl"
      >
        <TripReport trip={trip} />
      </Modal>
    </div>
  );
};

export default TripDetails;import React, { useState, useEffect } from 'react';
import { Trip, CLIENTS, DRIVERS, FLEET_NUMBERS, CLIENT_TYPES } from '../../types';
import { Input, Select, TextArea } from '../ui/FormElements';
import Button from '../ui/Button';
import { Save, X, Building } from 'lucide-react';

interface TripFormProps {
  trip?: Trip;
  onSubmit: (trip: Omit<Trip, 'id' | 'costs' | 'status'>) => void;
  onCancel: () => void;
}

const TripForm: React.FC<TripFormProps> = ({ trip, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    fleetNumber: '',
    driverName: '',
    clientName: '',
    clientType: 'external' as 'internal' | 'external',
    startDate: '',
    endDate: '',
    route: '',
    description: '',
    baseRevenue: '',
    revenueCurrency: 'ZAR' as 'USD' | 'ZAR',
    distanceKm: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (trip) {
      setFormData({
        fleetNumber: trip.fleetNumber,
        driverName: trip.driverName,
        clientName: trip.clientName,
        clientType: trip.clientType || 'external',
        startDate: trip.startDate,
        endDate: trip.endDate,
        route: trip.route,
        description: trip.description || '',
        baseRevenue: trip.baseRevenue.toString(),
        revenueCurrency: trip.revenueCurrency,
        distanceKm: trip.distanceKm?.toString() || '',
      });
    }
  }, [trip]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.fleetNumber) newErrors.fleetNumber = 'Fleet is required';
    if (!formData.driverName) newErrors.driverName = 'Driver is required';
    if (!formData.clientName) newErrors.clientName = 'Client is required';
    if (!formData.clientType) newErrors.clientType = 'Client type is required';
    if (!formData.route) newErrors.route = 'Route is required';
    if (!formData.baseRevenue || isNaN(Number(formData.baseRevenue))) {
      newErrors.baseRevenue = 'Revenue must be a valid number';
    }
    if (Number(formData.baseRevenue) <= 0) {
      newErrors.baseRevenue = 'Revenue must be greater than 0';
    }
    if (!formData.startDate) newErrors.startDate = 'Start date required';
    if (!formData.endDate) newErrors.endDate = 'End date required';
    if (formData.startDate && formData.endDate && formData.startDate > formData.endDate) {
      newErrors.endDate = 'End date must be after start date';
    }
    if (formData.distanceKm && isNaN(Number(formData.distanceKm))) {
      newErrors.distanceKm = 'Distance must be a valid number';
    }
    if (formData.distanceKm && Number(formData.distanceKm) < 0) {
      newErrors.distanceKm = 'Distance cannot be negative';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      const tripData = {
        fleetNumber: formData.fleetNumber,
        driverName: formData.driverName,
        clientName: formData.clientName,
        clientType: formData.clientType,
        startDate: formData.startDate,
        endDate: formData.endDate,
        route: formData.route,
        description: formData.description,
        baseRevenue: Number(formData.baseRevenue),
        revenueCurrency: formData.revenueCurrency,
        distanceKm: formData.distanceKm ? Number(formData.distanceKm) : undefined,
        paymentStatus: 'unpaid' as const,
        additionalCosts: [],
        delayReasons: [],
        followUpHistory: []
      };
      
      onSubmit(tripData);
    }
  };

  const getCurrencySymbol = (currency: 'USD' | 'ZAR') => {
    return currency === 'USD' ? '$' : 'R';
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <div className="flex items-center space-x-2 mb-3">
          <Building className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-medium text-blue-800">Client Classification</h3>
        </div>
        <Select
          label="Client Type *"
          value={formData.clientType}
          onChange={(e) => handleChange('clientType', e.target.value)}
          options={CLIENT_TYPES}
          error={errors.clientType}
        />
        <div className="mt-2 text-sm text-blue-700">
          <p><strong>Internal:</strong> In-house deliveries, farm or depot transfers</p>
          <p><strong>External:</strong> Third-party, contracted transport services</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Select
          label="Fleet Number *"
          value={formData.fleetNumber}
          onChange={(e) => handleChange('fleetNumber', e.target.value)}
          options={[
            { label: 'Select fleet number...', value: '' },
            ...FLEET_NUMBERS.map(f => ({ label: f, value: f }))
          ]}
          error={errors.fleetNumber}
        />

        <Select
          label="Driver *"
          value={formData.driverName}
          onChange={(e) => handleChange('driverName', e.target.value)}
          options={[
            { label: 'Select driver...', value: '' },
            ...DRIVERS.map(d => ({ label: d, value: d }))
          ]}
          error={errors.driverName}
        />

        <Select
          label="Client *"
          value={formData.clientName}
          onChange={(e) => handleChange('clientName', e.target.value)}
          options={[
            { label: 'Select client...', value: '' },
            ...CLIENTS.map(c => ({ label: c, value: c }))
          ]}
          error={errors.clientName}
        />

        <Input
          label="Route *"
          value={formData.route}
          onChange={(e) => handleChange('route', e.target.value)}
          placeholder="e.g., Harare - JHB"
          error={errors.route}
        />

        <Input
          label="Start Date *"
          type="date"
          value={formData.startDate}
          onChange={(e) => handleChange('startDate', e.target.value)}
          error={errors.startDate}
        />

        <Input
          label="End Date *"
          type="date"
          value={formData.endDate}
          onChange={(e) => handleChange('endDate', e.target.value)}
          error={errors.endDate}
        />

        <Select
          label="Currency *"
          value={formData.revenueCurrency}
          onChange={(e) => handleChange('revenueCurrency', e.target.value)}
          options={[
            { label: 'ZAR (R)', value: 'ZAR' },
            { label: 'USD ($)', value: 'USD' }
          ]}
        />

        <Input
          label={`Base Revenue (${getCurrencySymbol(formData.revenueCurrency)}) *`}
          type="number"
          step="0.01"
          min="0.01"
          value={formData.baseRevenue}
          onChange={(e) => handleChange('baseRevenue', e.target.value)}
          placeholder="0.00"
          error={errors.baseRevenue}
        />

        <Input
          label="Distance (km)"
          type="number"
          step="0.1"
          min="0"
          value={formData.distanceKm}
          onChange={(e) => handleChange('distanceKm', e.target.value)}
          placeholder="Optional - for cost per km calculation"
          error={errors.distanceKm}
        />
      </div>

      <TextArea
        label="Trip Description"
        value={formData.description}
        onChange={(e) => handleChange('description', e.target.value)}
        placeholder="Optional trip notes"
        rows={3}
      />

      <div className="flex justify-end space-x-4">
        <Button type="button" variant="outline" onClick={onCancel} icon={<X className="w-4 h-4" />}>
          Cancel
        </Button>
        <Button type="submit" icon={<Save className="w-4 h-4" />}>
          {trip ? 'Update Trip' : 'Save Trip'}
        </Button>
      </div>
    </form>
  );
};

export default TripForm;/**
 * Trip Planning Form Component
 * Manages trip timelines, planning, and delay tracking
 */
import React, { useState } from 'react';
import { Trip, DelayReason } from '../../types';
import Card, { CardContent, CardHeader } from '../ui/Card';
import Button from '../ui/Button';
import { Input, TextArea, Select } from '../ui/FormElements';
import { Calendar, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { formatDateTime } from '../../utils/helpers';

interface TripPlanningFormProps {
  trip: Trip;
  onUpdate: (trip: Trip) => void;
  onAddDelay: (delay: Omit<DelayReason, 'id'>) => void;
}

const TripPlanningForm: React.FC<TripPlanningFormProps> = ({
  trip,
  onUpdate,
  onAddDelay
}) => {
  const [timelineData, setTimelineData] = useState({
    plannedArrivalDateTime: trip.plannedArrivalDateTime || '',
    plannedOffloadDateTime: trip.plannedOffloadDateTime || '',
    plannedDepartureDateTime: trip.plannedDepartureDateTime || '',
    actualArrivalDateTime: trip.actualArrivalDateTime || '',
    actualOffloadDateTime: trip.actualOffloadDateTime || '',
    actualDepartureDateTime: trip.actualDepartureDateTime || ''
  });

  const [delayData, setDelayData] = useState({
    reason: '',
    durationHours: '',
    notes: '',
    responsibleParty: 'client' as 'client' | 'carrier' | 'third_party'
  });

  const handleTimelineChange = (field: string, value: string) => {
    setTimelineData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDelayChange = (field: string, value: string) => {
    setDelayData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const saveTimeline = () => {
    const updatedTrip = {
      ...trip,
      ...timelineData
    };
    onUpdate(updatedTrip);
  };

  const addDelayReason = () => {
    if (!delayData.reason.trim() || !delayData.durationHours) return;

    const newDelay: Omit<DelayReason, 'id'> = {
      tripId: trip.id,
      reason: delayData.reason,
      durationHours: parseFloat(delayData.durationHours),
      notes: delayData.notes,
      responsibleParty: delayData.responsibleParty,
      recordedAt: new Date().toISOString(),
      recordedBy: 'Current User'
    };

    onAddDelay(newDelay);
    
    // Reset form
    setDelayData({
      reason: '',
      durationHours: '',
      notes: '',
      responsibleParty: 'client'
    });
  };

  // Calculate timeline discrepancies
  const calculateDiscrepancies = () => {
    const discrepancies = [];
    
    if (timelineData.plannedArrivalDateTime && timelineData.actualArrivalDateTime) {
      const planned = new Date(timelineData.plannedArrivalDateTime);
      const actual = new Date(timelineData.actualArrivalDateTime);
      const diffHours = Math.abs((actual.getTime() - planned.getTime()) / (1000 * 60 * 60));
      
      if (diffHours > 1) {
        discrepancies.push({
          type: 'Arrival',
          planned: timelineData.plannedArrivalDateTime,
          actual: timelineData.actualArrivalDateTime,
          difference: diffHours.toFixed(1) + ' hours'
        });
      }
    }

    if (timelineData.plannedOffloadDateTime && timelineData.actualOffloadDateTime) {
      const planned = new Date(timelineData.plannedOffloadDateTime);
      const actual = new Date(timelineData.actualOffloadDateTime);
      const diffHours = Math.abs((actual.getTime() - planned.getTime()) / (1000 * 60 * 60));
      
      if (diffHours > 1) {
        discrepancies.push({
          type: 'Offload',
          planned: timelineData.plannedOffloadDateTime,
          actual: timelineData.actualOffloadDateTime,
          difference: diffHours.toFixed(1) + ' hours'
        });
      }
    }

    return discrepancies;
  };

  const discrepancies = calculateDiscrepancies();

  return (
    <div className="space-y-6">
      {/* Timeline Planning */}
      <Card>
        <CardHeader
          title="Trip Timeline Planning"
          subtitle="Manage planned vs actual timelines"
          icon={<Calendar className="w-5 h-5" />}
        />
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Planned Timeline */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900 border-b pb-2">Planned Timeline</h4>
              <Input
                label="Planned Arrival"
                type="datetime-local"
                value={timelineData.plannedArrivalDateTime}
                onChange={(e) => handleTimelineChange('plannedArrivalDateTime', e.target.value)}
              />
              <Input
                label="Planned Offload Start"
                type="datetime-local"
                value={timelineData.plannedOffloadDateTime}
                onChange={(e) => handleTimelineChange('plannedOffloadDateTime', e.target.value)}
              />
              <Input
                label="Planned Departure"
                type="datetime-local"
                value={timelineData.plannedDepartureDateTime}
                onChange={(e) => handleTimelineChange('plannedDepartureDateTime', e.target.value)}
              />
            </div>

            {/* Actual Timeline */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900 border-b pb-2">Actual Timeline</h4>
              <Input
                label="Actual Arrival"
                type="datetime-local"
                value={timelineData.actualArrivalDateTime}
                onChange={(e) => handleTimelineChange('actualArrivalDateTime', e.target.value)}
              />
              <Input
                label="Actual Offload Start"
                type="datetime-local"
                value={timelineData.actualOffloadDateTime}
                onChange={(e) => handleTimelineChange('actualOffloadDateTime', e.target.value)}
              />
              <Input
                label="Actual Departure"
                type="datetime-local"
                value={timelineData.actualDepartureDateTime}
                onChange={(e) => handleTimelineChange('actualDepartureDateTime', e.target.value)}
              />
            </div>
          </div>

          {/* Timeline Discrepancies */}
          {discrepancies.length > 0 && (
            <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-md">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-amber-800 mb-2">
                    Timeline Discrepancies Detected
                  </h4>
                  <div className="space-y-2">
                    {discrepancies.map((disc, index) => (
                      <div key={index} className="text-sm text-amber-700">
                        <p><strong>{disc.type}:</strong> {disc.difference} difference</p>
                        <p className="text-xs">Planned: {formatDateTime(disc.planned)}</p>
                        <p className="text-xs">Actual: {formatDateTime(disc.actual)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end mt-6">
            <Button onClick={saveTimeline} icon={<CheckCircle className="w-4 h-4" />}>
              Save Timeline
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delay Tracking */}
      <Card>
        <CardHeader
          title="Delay Tracking"
          subtitle="Record and manage trip delays"
          icon={<Clock className="w-5 h-5" />}
        />
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Delay Reason"
                value={delayData.reason}
                onChange={(e) => handleDelayChange('reason', e.target.value)}
                placeholder="e.g., Weather, Mechanical, Loading delay"
              />
              <Input
                label="Duration (Hours)"
                type="number"
                step="0.5"
                value={delayData.durationHours}
                onChange={(e) => handleDelayChange('durationHours', e.target.value)}
                placeholder="2.5"
              />
            </div>
            
            <Select
              label="Responsible Party"
              value={delayData.responsibleParty}
              onChange={(e) => handleDelayChange('responsibleParty', e.target.value)}
              options={[
                { label: 'Client', value: 'client' },
                { label: 'Carrier', value: 'carrier' },
                { label: 'Third Party', value: 'third_party' }
              ]}
            />
            
            <TextArea
              label="Delay Notes"
              value={delayData.notes}
              onChange={(e) => handleDelayChange('notes', e.target.value)}
              placeholder="Additional details about the delay..."
              rows={3}
            />

            <div className="flex justify-end">
              <Button 
                onClick={addDelayReason}
                disabled={!delayData.reason.trim() || !delayData.durationHours}
                icon={<Clock className="w-4 h-4" />}
              >
                Add Delay Reason
              </Button>
            </div>
          </div>

          {/* Existing Delay Reasons */}
          {trip.delayReasons && trip.delayReasons.length > 0 && (
            <div className="mt-6">
              <h4 className="font-semibold text-gray-900 mb-3">Recorded Delays</h4>
              <div className="space-y-2">
                {trip.delayReasons.map((delay, index) => (
                  <div key={index} className="p-3 bg-gray-50 border rounded-md">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900">{delay.reason}</p>
                        <p className="text-sm text-gray-600">{delay.notes}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Recorded by {delay.recordedBy} on {formatDateTime(delay.recordedAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-amber-600">{delay.durationHours} hours</p>
                        <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                          delay.responsibleParty === 'client' ? 'bg-green-100 text-green-800' :
                          delay.responsibleParty === 'carrier' ? 'bg-red-100 text-red-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {delay.responsibleParty.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TripPlanningForm;