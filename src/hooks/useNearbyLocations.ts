import { useState, useEffect, useCallback, useRef } from 'react';
import { collection, query, orderBy, startAt, endAt, getDocs, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { getGeohash, calculateDistance } from '../lib/geoUtils';
import { BookmarkLocation } from '../types';

export const useNearbyLocations = (
  userLocation: { lat: number; lng: number } | null,
  radiusInMeters: number = 5000,
  isEnabled: boolean = true
) => {
  const [nearbyLocations, setNearbyLocations] = useState<BookmarkLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const lastLocationRef = useRef<{ lat: number; lng: number } | null>(null);

  const fetchNearby = useCallback(async () => {
    if (!userLocation || !isEnabled) return;

    // Cache check: only re-fetch if moved > 20 meters
    if (lastLocationRef.current) {
        const dist = calculateDistance(
            userLocation.lat, userLocation.lng,
            lastLocationRef.current.lat, lastLocationRef.current.lng
        );
        if (dist < 20) return;
    }

    setLoading(true);
    try {
      // Basic geohash query. For full production, use geofire library logic
      // to handle boundary cases, but for this implementation, a geohash prefix query
      // is the standard Firestore geo-query pattern.
      const hash = getGeohash(userLocation.lat, userLocation.lng, 6);
      
      const locationsRef = collection(db, 'locations');
      const q = query(
        locationsRef,
        orderBy('geohash'),
        startAt(hash.substring(0, 5)), // Approximate range
        endAt(hash.substring(0, 5) + '~'),
        limit(100) // Fetch extra, filter in JS
      );

      const snapshot = await getDocs(q);
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BookmarkLocation));
      
      // Filter by strict radius
      const filtered = docs.filter(loc => 
        calculateDistance(userLocation.lat, userLocation.lng, loc.lat, loc.lng) <= radiusInMeters
      );
      
      // Sort by distance
      const sorted = filtered
        .map(loc => ({
            ...loc,
            distance: calculateDistance(userLocation.lat, userLocation.lng, loc.lat, loc.lng)
        }))
        .sort((a,b) => (a.distance || 0) - (b.distance || 0))
        .slice(0, 50);

      setNearbyLocations(sorted);
      lastLocationRef.current = userLocation;
    } catch (e) {
      console.error('Nearby query failed', e);
    } finally {
      setLoading(false);
    }
  }, [userLocation, radiusInMeters, isEnabled]);

  useEffect(() => {
    fetchNearby();
  }, [fetchNearby]);

  return { nearbyLocations, loading };
};
