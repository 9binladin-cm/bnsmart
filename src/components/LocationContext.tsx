import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { BookmarkLocation } from '../types';

interface LocationContextType {
  locations: BookmarkLocation[];
  setLocations: React.Dispatch<React.SetStateAction<BookmarkLocation[]>>;
  userLocation: {lat: number, lng: number} | null;
  setUserLocation: React.Dispatch<React.SetStateAction<{lat: number, lng: number} | null>>;
  activeLocationId: string | null;
  setActiveLocationId: React.Dispatch<React.SetStateAction<string | null>>;
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  categoryFilter: string;
  setCategoryFilter: React.Dispatch<React.SetStateAction<string>>;
   tambonFilter: string;
  setTambonFilter: React.Dispatch<React.SetStateAction<string>>;
  mooFilter: string;
  setMooFilter: React.Dispatch<React.SetStateAction<string>>;
  sortMode: 'date' | 'name' | 'distance';
  setSortMode: React.Dispatch<React.SetStateAction<'date' | 'name' | 'distance'>>;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const LocationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [locations, setLocations] = useState<BookmarkLocation[]>([]);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  
  useEffect(() => {
    if (!navigator.geolocation) return;

    const watcher = navigator.geolocation.watchPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => console.error('Geo error', err),
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );

    return () => navigator.geolocation.clearWatch(watcher);
  }, []);
  const [activeLocationId, setActiveLocationId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [tambonFilter, setTambonFilter] = useState<string>('All');
  const [mooFilter, setMooFilter] = useState<string>('All');
  const [sortMode, setSortMode] = useState<'date' | 'name' | 'distance'>('distance');

  return (
    <LocationContext.Provider value={{
      locations, setLocations,
      userLocation, setUserLocation,
      activeLocationId, setActiveLocationId,
      searchQuery, setSearchQuery,
      categoryFilter, setCategoryFilter,
      tambonFilter, setTambonFilter,
      mooFilter, setMooFilter,
      sortMode, setSortMode
    }}>
      {children}
    </LocationContext.Provider>
  );
};

export const useLocationContext = () => {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocationContext must be used within a LocationProvider');
  }
  return context;
};
