import React, { useEffect, useCallback } from 'react';
import { Map, AdvancedMarker, Pin, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { useLocationContext } from './LocationContext';
import { Navigation } from 'lucide-react';
import { motion } from 'motion/react';

export const MapView: React.FC = () => {
  const { locations, userLocation, setUserLocation } = useLocationContext();
  const map = useMap();
  const coreLib = useMapsLibrary('core');

  // Auto-fit bounds
  useEffect(() => {
    if (map && coreLib && locations.length > 0) {
      const bounds = new coreLib.LatLngBounds();
      locations.forEach(loc => bounds.extend({ lat: loc.lat, lng: loc.lng }));
      if (userLocation) bounds.extend(userLocation);
      map.fitBounds(bounds);
    }
  }, [map, google, locations, userLocation]);

  const handleGetCurrentLocation = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = { lat: position.coords.latitude, lng: position.coords.longitude };
          setUserLocation(pos);
          map?.panTo(pos);
          map?.setZoom(16);
        },
        () => console.error("Error getting location")
      );
    }
  }, [map, setUserLocation]);

  return (
    <div className="relative w-full h-full">
      <Map
        defaultZoom={13}
        defaultCenter={{ lat: 13.7563, lng: 100.5018 }}
        mapId="DEMO_MAP_ID"
        className="w-full h-full"
      >
        {locations.map(loc => (
          <AdvancedMarker key={loc.id} position={{ lat: loc.lat, lng: loc.lng }}>
            <motion.div whileHover={{ scale: 1.2 }} className="cursor-pointer">
              <Pin />
            </motion.div>
          </AdvancedMarker>
        ))}
        {userLocation && (
          <AdvancedMarker position={userLocation}>
            <motion.div whileHover={{ scale: 1.2 }} className="cursor-pointer">
              <Pin background={'#4285F4'} glyphColor={'#FFF'} borderColor={'#FFF'} />
            </motion.div>
          </AdvancedMarker>
        )}
      </Map>

      <button
        onClick={handleGetCurrentLocation}
        className="absolute bottom-6 right-6 p-4 bg-white dark:bg-slate-800 rounded-full shadow-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition"
      >
        <Navigation className="text-blue-500" size={24} />
      </button>
    </div>
  );
};
