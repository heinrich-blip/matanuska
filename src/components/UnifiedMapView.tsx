/**
 * UnifiedMapView - Unified map view component
 */

import { useState, useEffect } from 'react';
import { LayersControl, MapContainer, TileLayer, ZoomControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const DEFAULT_CENTER = [-26.2707, 28.1123];
const DEFAULT_ZOOM = 10;

export interface RouteWaypoint {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  type: 'pickup' | 'delivery' | 'stop';
}

interface UnifiedMapViewProps {
  className?: string;
}

function UnifiedMapView({ className = '' }: UnifiedMapViewProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 rounded-lg ${className}`}>
        <div className="text-gray-500">Loading map...</div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        className="h-full w-full rounded-lg"
        scrollWheelZoom={true}
        zoomControl={false}
      >
        <LayersControl>
          <LayersControl.BaseLayer checked name="Street Map">
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Satellite">
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
          </LayersControl.BaseLayer>
        </LayersControl>
        <ZoomControl />
      </MapContainer>
    </div>
  );
}

export default UnifiedMapView;
export { UnifiedMapView };
