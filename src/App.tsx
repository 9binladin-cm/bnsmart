/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import { 
  MapPin, 
  Search, 
  Plus, 
  Trash2, 
  Edit3, 
  Save, 
  X, 
  Compass, 
  Map, 
  Download, 
  Upload, 
  RotateCcw, 
  Star, 
  Check, 
  Navigation, 
  MapPinned, 
  Sparkles,
  Info,
  Layers,
  Heart,
  ChevronRight,
  MapIcon,
  LayoutDashboard,
  ClipboardList,
  BarChart2,
  Settings,
  CalendarDays,
  Activity,
  CheckCircle2,
  FileCheck2,
  AlertCircle,
  QrCode
} from 'lucide-react';
import QRCode from 'qrcode';
import { motion, AnimatePresence } from 'motion/react';
import { db, isFirebaseConfigured, collection, setDoc, deleteDoc, doc, onSnapshot, addDoc, updateDoc, serverTimestamp } from './firebase';

// Type definitions for map coordinate bookmark locations
interface BookmarkLocation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  category: 'Village' | 'Community' | 'Office' | 'Condo';
  notes: string;
  googleMapLink?: string;
  soi?: string;      // ซอย
  moo?: string;      // หมู่ที่
  tambon?: string;   // ตำบล/แขวง
  amphoe?: string;   // เขต/อำเภอ
  createdAt: number;
}

// Initial seed data - Beautiful Landmark bookmarks around Thailand
const INITIAL_LANDMARKS: BookmarkLocation[] = [];

// Map Styles Tile Layers Configurations
const TILE_LAYERS = {
  streets: {
    name: 'เส้นทางและแผนที่สตรีท',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  },
  light: {
    name: 'สว่างมินิมอล (Positron)',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>'
  },
  dark: {
    name: 'ธีมมืดถนอมสายตา (Dark)',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>'
  },
  terrain: {
    name: 'ภูมิประเทศเชิงลึก (Topo)',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: 'Map data: &copy; OSM, SRTM | Map style: &copy; OpenTopoMap'
  }
};

const getCategoryEmoji = (category: string) => {
  switch (category) {
    case 'Village': return '🏘️';
    case 'Community': return '🤝';
    case 'Office': return '🏢';
    case 'Condo': return '🏙️';
    default: return '📍';
  }
};

const getCategoryNameTh = (category: string) => {
  switch (category) {
    case 'Village': return 'หมู่บ้าน';
    case 'Community': return 'ชุมชน';
    case 'Office': return 'สำนักงาน';
    case 'Condo': return 'คอนโด';
    default: return 'ปักหมุดอื่นๆ';
  }
};

export default function App() {
  // Navigation / View state
  const [currentView, setCurrentView] = useState<'dashboard' | 'map'>('dashboard');
  
  // Mobile responsive and device auto-detection states
  const [isMobile, setIsMobile] = useState(false);
  const [mobileActiveTab, setMobileActiveTab] = useState<'map' | 'list'>('map');
  
  // Dialog / Overlays state
  const [showQueueModal, setShowQueueModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // 1. Core State for Bookmarks Data
  const [locations, setLocations] = useState<BookmarkLocation[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [activeLocationId, setActiveLocationId] = useState<string | null>(null);

  // Map settings state
  const [tileStyle, setTileStyle] = useState<keyof typeof TILE_LAYERS>('dark'); // default dark map
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [showTileMenu, setShowTileMenu] = useState(false);

  // Manual fast fly-to input state
  const [quickCoordinatesInput, setQuickCoordinatesInput] = useState('');
  const [quickCoordinatesError, setQuickCoordinatesError] = useState('');

  // 2. Add / Edit Form State
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedMapPoint, setSelectedMapPoint] = useState<{lat: number, lng: number} | null>(null);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<BookmarkLocation['category']>('Village');
  const [formNotes, setFormNotes] = useState('');
  const [formLat, setFormLat] = useState<string | number>('');
  const [formLng, setFormLng] = useState<string | number>('');
  const [formGoogleMapLink, setFormGoogleMapLink] = useState('');
  const [formSoi, setFormSoi] = useState('');
  const [formMoo, setFormMoo] = useState('');
  const [formTambon, setFormTambon] = useState('');
  const [formAmphoe, setFormAmphoe] = useState('');

  // File imports state
  const [fileImportSuccess, setFileImportSuccess] = useState<string | null>(null);
  const [fileImportError, setFileImportError] = useState<string | null>(null);
  const [copiedCoords, setCopiedCoords] = useState<boolean>(false);

  // QR Code generator state
  const [activeQrCodeUrl, setActiveQrCodeUrl] = useState<string | null>(null);
  const [showActiveQr, setShowActiveQr] = useState<boolean>(false);

  // Edit/Save Confirmation states
  const [showSaveConfirmModal, setShowSaveConfirmModal] = useState<boolean>(false);

  // 3. Leaflet Ref Holders
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  
  // Custom layer groups for dynamic loading without rebuilding map
  const markersLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const tempMarkerRef = useRef<L.Marker | null>(null);
  const userLocationMarkerRef = useRef<L.Marker | null>(null);

  // 4b. Firebase Real-Time Synchronization Listener (Syncing through landmarks collection)
  useEffect(() => {
    if (!isFirebaseConfigured) return;

    const landmarksCol = collection(db, 'landmarks');
    const unsubscribe = onSnapshot(landmarksCol, (snapshot) => {
      const list: BookmarkLocation[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        let categoryVal: 'Village' | 'Community' | 'Office' | 'Condo' = 'Village';
        if (data.type === 'community') categoryVal = 'Community';
        else if (data.type === 'office') categoryVal = 'Office';
        else if (data.type === 'condo') categoryVal = 'Condo';

        const latRaw = data.lat;
        const lngRaw = data.lng;
        let latVal = 13.7563; // defaults to central Thailand if invalid
        if (typeof latRaw === 'number') {
          latVal = isNaN(latRaw) ? 13.7563 : latRaw;
        } else if (typeof latRaw === 'string') {
          const parsed = parseFloat(latRaw);
          latVal = isNaN(parsed) ? 13.7563 : parsed;
        }

        let lngVal = 100.5018;
        if (typeof lngRaw === 'number') {
          lngVal = isNaN(lngRaw) ? 100.5018 : lngRaw;
        } else if (typeof lngRaw === 'string') {
          const parsed = parseFloat(lngRaw);
          lngVal = isNaN(parsed) ? 100.5018 : parsed;
        }

        list.push({
          id: docSnap.id,
          name: data.name || '',
          lat: latVal,
          lng: lngVal,
          category: categoryVal,
          notes: data.note || '',
          soi: data.address?.soi || '',
          moo: data.address?.moo || '',
          tambon: data.address?.tambon || '',
          amphoe: data.address?.amphoe || '',
          googleMapLink: data.googleMapsLink || '',
          createdAt: data.updatedAt ? (data.updatedAt.toMillis ? data.updatedAt.toMillis() : (data.updatedAt.seconds ? data.updatedAt.seconds * 1000 : Date.now())) : Date.now(),
        });
      });

      // Sort lists by createdAt descending-most first
      list.sort((a, b) => b.createdAt - a.createdAt);
      setLocations(list);
    }, (error) => {
      console.error('Firestore real-time sync failed:', error);
    });

    return () => unsubscribe();
  }, []);

  // Auto-detect mobile devices and responsive scaling
  useEffect(() => {
    const handleResize = () => {
      const isMobileSize = window.innerWidth < 1024; // lg breakpoint in tailwind
      setIsMobile(isMobileSize);
      if (mapInstanceRef.current) {
        setTimeout(() => {
          mapInstanceRef.current?.invalidateSize();
        }, 150);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 5. Filter Locations list
  const filteredLocations = useMemo(() => {
    return locations.filter(loc => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) {
        const matchCategory = categoryFilter === 'All' || loc.category === categoryFilter;
        return matchCategory;
      }

      // Perform address search combining Thailand address sub-fields, name, and notes, completely ignoring pin lat/lng coordinates
      const addressString = [
        loc.soi || '',
        loc.moo || '',
        loc.tambon || '',
        loc.amphoe || '',
        loc.notes || '',
        loc.name || ''
      ].join(' ').toLowerCase();

      const matchSearch = addressString.includes(q);
      const matchCategory = categoryFilter === 'All' || loc.category === categoryFilter;
      return matchSearch && matchCategory;
    });
  }, [locations, searchQuery, categoryFilter]);

  // Active Location detail
  const activeLocation = useMemo(() => {
    return locations.find(l => l.id === activeLocationId) || null;
  }, [locations, activeLocationId]);

  // QR Code generation handler
  useEffect(() => {
    setActiveQrCodeUrl(null);
    setShowActiveQr(false);

    if (!activeLocation) return;

    let isMounted = true;

    const generateQrCode = async () => {
      // Use the Google Maps link if it exists, otherwise fall back to coordinates directions link
      const text = activeLocation.googleMapLink || `https://www.google.com/maps/dir/?api=1&destination=${activeLocation.lat},${activeLocation.lng}`;
      try {
        const url = await QRCode.toDataURL(text, {
          width: 300,
          margin: 1,
          color: {
            dark: '#0f172a', // slate-900
            light: '#ffffff'
          }
        });
        if (isMounted) {
          setActiveQrCodeUrl(url);
        }
      } catch (err) {
        console.error('Failed to generate QR Code:', err);
      }
    };

    generateQrCode();

    return () => {
      isMounted = false;
    };
  }, [activeLocation?.id, activeLocation?.googleMapLink, activeLocation?.lat, activeLocation?.lng]);

  // Handle map resizing correctly when unhidden or mobile tabs change
  useEffect(() => {
    if (currentView === 'map' && mapInstanceRef.current) {
      setTimeout(() => {
        mapInstanceRef.current?.invalidateSize();
      }, 200);
    }
  }, [currentView, mobileActiveTab]);

  // 6. Map Initialization Effect
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Start coordinates center over Thailand or first location
    const initialCenter: [number, number] = [13.7563, 100.5018];
    const initialZoom = 7;

    // Thailand bounding box
    const thailandBounds = L.latLngBounds(
      L.latLng(5.5, 97.0),
      L.latLng(20.5, 106.0)
    );

    // Build Map instance
    const leafletMap = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: initialZoom,
      zoomControl: false, // custom placement
      maxBounds: thailandBounds,
      maxBoundsViscosity: 0.8
    });

    // Custom Zoom controls
    L.control.zoom({
      position: 'bottomright'
    }).addTo(leafletMap);

    // Initial tile layer setup
    const layer = L.tileLayer(TILE_LAYERS[tileStyle].url, {
      attribution: TILE_LAYERS[tileStyle].attribution
    }).addTo(leafletMap);

    tileLayerRef.current = layer;
    mapInstanceRef.current = leafletMap;

    // Feature group layers
    const markersGroup = L.layerGroup().addTo(leafletMap);
    markersLayerGroupRef.current = markersGroup;

    // Setup map click event to grab coordinates visually
    leafletMap.on('click', async (e: L.LeafletMouseEvent) => {
      if (!e || !e.latlng || isNaN(e.latlng.lat) || isNaN(e.latlng.lng)) return;
      const clickedLat = parseFloat(e.latlng.lat.toFixed(6));
      const clickedLng = parseFloat(e.latlng.lng.toFixed(6));
      
      if (isNaN(clickedLat) || isNaN(clickedLng)) return;
      
      setSelectedMapPoint({ lat: clickedLat, lng: clickedLng });
      setIsCreating(true);
      setIsEditing(false);
      
      // Pre-fill form fields
      setFormName('หมุดพิกัดจัดเก็บใหม่');
      setFormLat(clickedLat);
      setFormLng(clickedLng);
      setFormCategory('Village');
      setFormNotes('');
      setFormGoogleMapLink('');
      setFormSoi('');
      setFormMoo('');
      setFormTambon('');
      setFormAmphoe('');

      // Auto-trigger reverse geocoding on click
      fetchThaiAddressDetails(clickedLat, clickedLng);
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // 7. Dynamic Tile style transitions
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;
    
    // Remove old tiles layer
    mapInstanceRef.current.removeLayer(tileLayerRef.current);
    
    // Create and add new tile layer
    const newLayer = L.tileLayer(TILE_LAYERS[tileStyle].url, {
      attribution: TILE_LAYERS[tileStyle].attribution
    }).addTo(mapInstanceRef.current);

    tileLayerRef.current = newLayer;
  }, [tileStyle]);

  // Custom marker generator with gorgeous HTML design (bypasses Vite leaflet icons build issue)
  const createCustomMarkerHtml = (category: string, isActive: boolean) => {
    const bgColors: Record<string, string> = {
      Village: 'bg-emerald-500 border-emerald-100 text-white ring-emerald-400',
      Community: 'bg-blue-500 border-blue-100 text-white ring-blue-400',
      Office: 'bg-rose-500 border-rose-100 text-white ring-rose-400',
      Condo: 'bg-amber-500 border-amber-100 text-white ring-amber-400',
    };

    const colorScheme = bgColors[category] || bgColors.Village;
    const activeAnimationClass = isActive 
      ? 'scale-125 ring-4 shadow-xl z-[9999]' 
      : 'hover:scale-110 shadow-md scale-100';

    return `
      <div class="relative flex items-center justify-center w-9 h-9 rounded-full border-2 transition-transform duration-300 ${colorScheme} ${activeAnimationClass}">
        <span class="text-base select-none leading-none">${getCategoryEmoji(category)}</span>
        <!-- Selected halo effect -->
        ${isActive ? '<span class="absolute inline-flex h-full w-full rounded-full bg-blue-400/30 animate-ping -z-10"></span>' : ''}
      </div>
    `;
  };

  // 8. Plot Location Markers Effect
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerGroupRef.current) return;

    // Clear old bookmarks
    markersLayerGroupRef.current.clearLayers();

    // Iterate filter locations
    filteredLocations.forEach(loc => {
      // Safety validation
      if (typeof loc.lat !== 'number' || typeof loc.lng !== 'number' || isNaN(loc.lat) || isNaN(loc.lng)) {
        return;
      }
      const isCurrentlyActive = loc.id === activeLocationId;
      
      const customHtml = createCustomMarkerHtml(loc.category, isCurrentlyActive);
      const icon = L.divIcon({
        html: customHtml,
        className: 'custom-location-pin-wrapper',
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -18]
      });

      const elementMarker = L.marker([loc.lat, loc.lng], { icon }).addTo(markersLayerGroupRef.current!);

      // Popup with Thailand Address details and Google Map link navigation
      elementMarker.bindPopup(`
        <div class="p-2 min-w-[210px] font-sans">
          <div class="flex items-center gap-1.5 font-bold text-sm text-slate-800">
            <span class="text-lg">${getCategoryEmoji(loc.category)}</span>
            <span class="truncate pr-1">${loc.name}</span>
          </div>
          <div class="text-[10px] text-slate-400 font-mono mt-0.5">${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}</div>
          
          <div class="text-[11px] text-slate-700 bg-slate-50 p-1.5 rounded border border-slate-100 mt-2 space-y-0.5">
            <div><span class="text-slate-400">ซอย:</span> ${loc.soi || '-'} <span class="text-slate-400 pl-1.5">หมู่:</span> ${loc.moo || '-'}</div>
            <div><span class="text-slate-400">ตำบล/แขวง:</span> ${loc.tambon || '-'}</div>
            <div><span class="text-slate-400">เขต/อำเภอ:</span> ${loc.amphoe || '-'}</div>
          </div>

          <div class="text-xs text-slate-600 mt-2 border-t border-slate-100 pt-1.5 leading-relaxed italic">
            "${loc.notes || 'ยังไม่ระบุรายละเอียดบันทึก...'}"
          </div>
          <div class="flex justify-between items-center mt-3 pt-2 border-t border-slate-100">
            <span class="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-bold">
              ${getCategoryNameTh(loc.category)}
            </span>
            ${loc.googleMapLink ? `
              <a href="${loc.googleMapLink}" target="_blank" rel="noopener noreferrer" class="text-[10px] text-blue-600 font-bold hover:underline">
                🔗 ลิงก์แผนที่
              </a>
            ` : `
              <a href="https://www.google.com/maps/dir/?api=1&destination=${loc.lat},${loc.lng}" target="_blank" rel="noopener noreferrer" class="text-[10px] text-emerald-600 font-bold hover:underline">
                🚗 เส้นทางนำทาง
              </a>
            `}
          </div>
        </div>
      `);

      // Keep tracked on click
      elementMarker.on('click', () => {
        setActiveLocationId(loc.id);
        setIsCreating(false);
        setIsEditing(false);
      });
    });
  }, [filteredLocations, activeLocationId]);

  // 9. Selected Temporary / Pin Dropping Preview effect
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Clean up previous temp marker
    if (tempMarkerRef.current) {
      tempMarkerRef.current.remove();
      tempMarkerRef.current = null;
    }

    if (selectedMapPoint && typeof selectedMapPoint.lat === 'number' && typeof selectedMapPoint.lng === 'number' && !isNaN(selectedMapPoint.lat) && !isNaN(selectedMapPoint.lng)) {
      const tempHtml = `
        <div class="relative flex items-center justify-center w-10 h-10 rounded-full border-2 border-dashed border-red-500 bg-red-50 text-red-500 shadow-lg scale-110 animate-bounce">
          <span class="text-lg">🎯</span>
          <span class="absolute inline-flex h-full w-full rounded-full bg-red-400/20 animate-pulse -z-10"></span>
        </div>
      `;
      const icon = L.divIcon({
        html: tempHtml,
        className: 'temp-marker-placement',
        iconSize: [40, 40],
        iconAnchor: [20, 20]
      });

      const tempMarker = L.marker([selectedMapPoint.lat, selectedMapPoint.lng], { icon })
        .addTo(mapInstanceRef.current);
      
      tempMarkerRef.current = tempMarker;
    }
  }, [selectedMapPoint]);

  // 10. User Current Location Pin Helper
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (userLocationMarkerRef.current) {
      userLocationMarkerRef.current.remove();
      userLocationMarkerRef.current = null;
    }

    if (userLocation && typeof userLocation.lat === 'number' && typeof userLocation.lng === 'number' && !isNaN(userLocation.lat) && !isNaN(userLocation.lng)) {
      const radarHtml = `
        <div class="relative flex items-center justify-center w-8 h-8 rounded-full border-2 border-white bg-blue-500 shadow-xl ring-4 ring-blue-500/30">
          <div class="w-3 h-3 bg-white rounded-full"></div>
          <span class="absolute inline-flex h-full w-full rounded-full bg-blue-400/40 animate-ping -z-10"></span>
        </div>
      `;
      const icon = L.divIcon({
        html: radarHtml,
        className: 'user-radar-pulsate',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const uMarker = L.marker([userLocation.lat, userLocation.lng], { icon })
        .addTo(mapInstanceRef.current)
        .bindPopup('<strong class="text-xs">📍 คุณอยู่แถวนี้</strong>');
      
      userLocationMarkerRef.current = uMarker;
    }
  }, [userLocation]);

  // Smooth Focus (Fly to) coordinates helper
  const handleMapFocus = (lat: number, lng: number, zoom = 14) => {
    if (!mapInstanceRef.current) return;
    if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
      console.warn('handleMapFocus received invalid coordinates:', lat, lng);
      return;
    }
    mapInstanceRef.current.flyTo([lat, lng], zoom, {
      animate: true,
      duration: 1.5
    });
  };

  // Helper: Request GPS
  const handleGetMyGPS = () => {
    if (!navigator.geolocation) {
      alert('เบราว์เซอร์ของคุณไม่สนับสนุนฟังก์ชันค้นหาพิกัด Geolocation');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const myLat = parseFloat(latitude.toFixed(6));
        const myLng = parseFloat(longitude.toFixed(6));
        
        if (isNaN(myLat) || isNaN(myLng)) {
          alert('ไม่พบข้อมูลพิกัด GPS ปัจจุบันจากเซ็นเซอร์ หรือข้อมูลไม่สมบูรณ์');
          setIsLocating(false);
          return;
        }

        setUserLocation({ lat: myLat, lng: myLng });
        setIsLocating(false);
        handleMapFocus(myLat, myLng, 15);
      },
      (error) => {
        setIsLocating(false);
        alert(`เกิดข้อผิดพลาดในการหาพิกัด GPS: ${error.message}. กรุณาอนุญาตสิทธิ์เข้าถึงอุปกรณ์ของคุณ`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Reverse geocoding tool using free OpenStreetMap Nominatim for Thai Address Details
  const fetchThaiAddressDetails = async (lat: number, lng: number) => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=th`);
      if (!response.ok) return;
      const data = await response.json();
      if (data && data.address) {
        const addr = data.address;
        
        // Extract Soi
        let detectedSoi = '';
        if (addr.road && (addr.road.includes('ซอย') || addr.road.includes('ซ.'))) {
          detectedSoi = addr.road;
        } else if (addr.suburb && (addr.suburb.includes('ซอย') || addr.suburb.includes('ซ.'))) {
          detectedSoi = addr.suburb;
        }

        // Extract Moo (หมู่ที่)
        let detectedMoo = '';
        const addressString = JSON.stringify(addr);
        const mooMatch = addressString.match(/หมู่ที่\s*(\d+)/) || addressString.match(/ม\.\s*(\d+)/);
        if (mooMatch) {
          detectedMoo = mooMatch[0];
        }

        // Extract Tambon/Khwaeng (ตำบล/แขวง)
        let detectedTambon = addr.subdistrict || addr.suburb || addr.tambon || addr.khwaeng || '';
        if (!detectedTambon && addr.village) {
          detectedTambon = addr.village;
        }
        if (detectedTambon && !detectedTambon.startsWith('ตำบล') && !detectedTambon.startsWith('แขวง') && !detectedTambon.startsWith('ต.') && !detectedTambon.startsWith('ข.')) {
          const isBkk = (addr.city === 'กรุงเทพมหานคร' || addr.province === 'กรุงเทพมหานคร' || addr.state === 'กรุงเทพมหานคร');
          detectedTambon = (isBkk ? 'แขวง' : 'ตำบล') + detectedTambon;
        }

        // Extract Amphoe/Khet (เขต/อำเภอ)
        let detectedAmphoe = addr.district || addr.city_district || addr.amphoe || addr.khet || '';
        if (!detectedAmphoe && addr.city && addr.city !== 'กรุงเทพมหานคร') {
          detectedAmphoe = addr.city;
        }
        if (detectedAmphoe && !detectedAmphoe.startsWith('อำเภอ') && !detectedAmphoe.startsWith('เขต') && !detectedAmphoe.startsWith('อ.') && !detectedAmphoe.startsWith('ข.')) {
          const isBkk = (addr.city === 'กรุงเทพมหานคร' || addr.province === 'กรุงเทพมหานคร' || addr.state === 'กรุงเทพมหานคร');
          detectedAmphoe = (isBkk ? 'เขต' : 'อำเภอ') + detectedAmphoe;
        }

        setFormSoi(detectedSoi);
        setFormMoo(detectedMoo);
        setFormTambon(detectedTambon);
        setFormAmphoe(detectedAmphoe);
      }
    } catch (err) {
      console.error('Error fetching address:', err);
    }
  };

  const handleGetCurrentLocationForForm = () => {
    if (!navigator.geolocation) {
      alert('เบราว์เซอร์ของคุณไม่สนับสนุนฟังก์ชันค้นหาพิกัด Geolocation');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const latVal = parseFloat(latitude.toFixed(6));
        const lngVal = parseFloat(longitude.toFixed(6));
        
        if (isNaN(latVal) || isNaN(lngVal)) {
          alert('ไม่พบพิกัดที่ถูกต้องจากเซ็นเซอร์ของอุปกรณ์ หรือรูปพิกัดคลาดเคลื่อนผิดพลาด');
          return;
        }

        setFormLat(latVal);
        setFormLng(lngVal);
        // Auto fetch
        fetchThaiAddressDetails(latVal, lngVal);
      },
      (error) => {
        alert(`เกิดข้อผิดพลาดในการหาพิกัด: ${error.message}. กรุณาอนุญาตสิทธิ์เข้าถึงพิกัดเบราว์เซอร์`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // 11. Coordinate input go-to address lookup / fast navigation
  const handleQuickGoTo = (e: React.FormEvent) => {
    e.preventDefault();
    setQuickCoordinatesError('');
    
    // Parse latitude, longitude format like (13.7915, 100.329) or (13.7915 100.329) or (13.7915,100.329)
    const regex = /^\s*(-?\d+(\.\d+)?)\s*[\s,]\s*(-?\d+(\.\d+)?)\s*$/;
    const match = quickCoordinatesInput.match(regex);
    
    if (match) {
      const inputLat = parseFloat(match[1]);
      const inputLng = parseFloat(match[3]);
      
      if (inputLat >= -90 && inputLat <= 90 && inputLng >= -180 && inputLng <= 180) {
        setSelectedMapPoint({ lat: inputLat, lng: inputLng });
        handleMapFocus(inputLat, inputLng, 14);
        
        // Open Create mode so they can easily save it
        setIsCreating(true);
        setIsEditing(false);
        setFormName('พิกัดที่ค้นหาด่วน');
        setFormLat(inputLat);
        setFormLng(inputLng);
        setFormCategory('Village');
        setFormNotes('ปักไว้ด้วยระบบค้นหาพิกัดนำทางด่วน');
        setFormGoogleMapLink('');
        setFormSoi('');
        setFormMoo('');
        setFormTambon('');
        setFormAmphoe('');
      } else {
        setQuickCoordinatesError('ค่าพิกัดไม่อยู่ในขอบเขตสากล (Lat -90 ถึง 90, Lng -180 ถึง 180)');
      }
    } else {
      setQuickCoordinatesError('กรุณาป้อนรูปแบบที่ถูกต้อง เช่น: 13.8095, 100.5605');
    }
  };

  // Trigger Edit Form Pre-fill
  const handleStartEdit = (loc: BookmarkLocation) => {
    setIsEditing(true);
    setIsCreating(false);
    setSelectedMapPoint(null);
    
    setFormName(loc.name);
    setFormCategory(loc.category);
    setFormNotes(loc.notes);
    setFormLat(loc.lat);
    setFormLng(loc.lng);
    setFormGoogleMapLink(loc.googleMapLink || '');
    setFormSoi(loc.soi || '');
    setFormMoo(loc.moo || '');
    setFormTambon(loc.tambon || '');
    setFormAmphoe(loc.amphoe || '');
  };

  // Delete Action
  const handleDeleteLocation = async (id: string) => {
    if (window.confirm('คุณต้องการยืนยันลบพิกัดข้อมูลตำแหน่งนี้ออกจากแอปใช่หรือไม่?')) {
      if (isFirebaseConfigured) {
        try {
          const docRef = doc(db, 'landmarks', id);
          await deleteDoc(docRef);
        } catch (err) {
          console.error('Failed to delete on Firebase:', err);
        }
      } else {
        const updated = locations.filter(l => l.id !== id);
        setLocations(updated);
      }
      if (activeLocationId === id) {
        setActiveLocationId(null);
      }
    }
  };

  // 📍 ฟังก์ชันปรับความแม่นยำของตำแหน่งให้เสถียรในรัศมี ±5 เมตร
  // (การใช้ทศนิยม 5 ตำแหน่ง จะล็อกความแม่นยำระดับพิกัดดาวเทียมไว้ที่ ~1.1 เมตร ซึ่งปลอดภัยและไม่เกิน 5 เมตรแน่นอน)
  const roundToFiveMeters = (value: string | number): number => {
    const num = typeof value === 'number' ? value : parseFloat(String(value));
    if (isNaN(num)) return 0;
    return Math.round(num * 100000) / 100000; // ปัดเศษคงที่ไว้ที่ทศนิยม 5 ตำแหน่ง
  };

  // CRUD Save changes: Update or Create
  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert('กรุณากรอกชื่อชื่อตำแหน่งข้อมูลพิกัด');
      return;
    }

    const latVal = parseFloat(String(formLat));
    const lngVal = parseFloat(String(formLng));

    if (isNaN(latVal) || latVal < -90 || latVal > 90) {
      alert('กรุณาป้อนละติจูดให้ถูกต้องระหว่าง -90 และ 90');
      return;
    }

    if (isNaN(lngVal) || lngVal < -185 || lngVal > 185) {
      alert('กรุณาป้อนลองจิจูดให้ถูกต้องระหว่าง -180 และ 180');
      return;
    }

    // Trigger confirmation popup for BOTH edit and creation
    setShowSaveConfirmModal(true);
  };

  const executeSaveLocation = async (isEdit: boolean) => {
    const roundedLat = roundToFiveMeters(formLat);
    const roundedLng = roundToFiveMeters(formLng);

    let lowercaseType: 'village' | 'community' | 'office' | 'condo' = 'village';
    if (formCategory === 'Community') lowercaseType = 'community';
    else if (formCategory === 'Office') lowercaseType = 'office';
    else if (formCategory === 'Condo') lowercaseType = 'condo';

    const landmarkData = {
      name: formName.trim(),
      lat: roundedLat,
      lng: roundedLng,
      type: lowercaseType,
      googleMapsLink: formGoogleMapLink.trim(),
      address: {
        soi: formSoi.trim(),
        moo: formMoo.trim(),
        tambon: formTambon.trim(),
        amphoe: formAmphoe.trim()
      },
      note: formNotes.trim(),
      updatedAt: serverTimestamp()
    };

    if (isFirebaseConfigured) {
      try {
        if (isEdit && activeLocation?.id) {
          const docRef = doc(db, 'landmarks', activeLocation.id);
          await setDoc(docRef, landmarkData);
        } else {
          const docAdded = await addDoc(collection(db, 'landmarks'), landmarkData);
          setActiveLocationId(docAdded.id);
        }
      } catch (err) {
        console.error('Failed to save on Firebase:', err);
        alert('เกิดข้อผิดพลาดในการบันทึกข้อมูลลง Firebase');
        return;
      }
    } else {
      // Offline fallback state management
      const fallbackId = isEdit && activeLocation?.id ? activeLocation.id : `loc-${Date.now()}`;
      const newLoc: BookmarkLocation = {
        id: fallbackId,
        name: formName.trim(),
        lat: roundedLat,
        lng: roundedLng,
        category: formCategory,
        notes: formNotes.trim(),
        googleMapLink: formGoogleMapLink.trim() || undefined,
        soi: formSoi.trim() || undefined,
        moo: formMoo.trim() || undefined,
        tambon: formTambon.trim() || undefined,
        amphoe: formAmphoe.trim() || undefined,
        createdAt: Date.now()
      };
      if (isEdit) {
        setLocations(prev => prev.map(loc => loc.id === fallbackId ? newLoc : loc));
      } else {
        setLocations(prev => [newLoc, ...prev]);
        setActiveLocationId(fallbackId);
      }
    }

    setIsEditing(false);
    setIsCreating(false);
    setSelectedMapPoint(null);
    setShowSaveConfirmModal(false);

    // switch back to dashboard / list tab
    setCurrentView('dashboard');
    if (isMobile) {
      setMobileActiveTab('list');
    }

    // Auto focus on map
    handleMapFocus(roundedLat, roundedLng, 14);
  };

  // Cancel any action form
  const handleCancelForm = () => {
    setIsCreating(false);
    setIsEditing(false);
    setSelectedMapPoint(null);
    setFormGoogleMapLink('');
    setFormSoi('');
    setFormMoo('');
    setFormTambon('');
    setFormAmphoe('');
  };

  // Export saved bookmarks to JSON file
  const handleExportData = () => {
    try {
      const jsonStr = JSON.stringify(locations, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `map-bookmarks-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setFileImportSuccess('ส่งออกพิกัดข้อมูลงไฟล์ JSON สำรองเรียบร้อยแล้ว!');
    } catch {
      alert('ไม่สามารถส่งออกข้อมูลเป็นไฟล์ได้');
    }
  };

  // Import JSON files to parse coordinates
  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileImportError(null);
    setFileImportSuccess(null);
    
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (Array.isArray(json)) {
          // Robust checking
          const validLocations: BookmarkLocation[] = [];
          
          json.forEach((item, index) => {
            if (
              item &&
              typeof item.name === 'string' &&
              typeof item.lat === 'number' && !isNaN(item.lat) &&
              typeof item.lng === 'number' && !isNaN(item.lng) &&
              item.lat >= -90 && item.lat <= 90 &&
              item.lng >= -180 && item.lng <= 180 &&
              ['Village', 'Community', 'Office', 'Condo'].includes(item.category)
            ) {
              validLocations.push({
                id: item.id || `imported-${Date.now()}-${index}`,
                name: item.name,
                lat: item.lat,
                lng: item.lng,
                category: item.category as BookmarkLocation['category'],
                notes: item.notes || '',
                googleMapLink: item.googleMapLink || undefined,
                soi: item.soi || undefined,
                moo: item.moo || undefined,
                tambon: item.tambon || undefined,
                amphoe: item.amphoe || undefined,
                createdAt: item.createdAt || Date.now()
              });
            }
          });

          if (validLocations.length > 0) {
            setLocations(prev => {
              // Create combined data and remove duplicates by matching name & exact coordinate
              const combined = [...validLocations, ...prev];
              const unique: BookmarkLocation[] = [];
              const seen = new Set<string>();
              
              combined.forEach(loc => {
                const key = `${loc.lat.toFixed(5)}_${loc.lng.toFixed(5)}`;
                if (!seen.has(key)) {
                  seen.add(key);
                  unique.push(loc);
                }
              });
              return unique;
            });

            setFileImportSuccess(`นำเข้าข้อมูลพิกัดสำเร็จทั้งหมด ${validLocations.length} รายการ!`);
            // Clear input
            e.target.value = '';
          } else {
            setFileImportError('ไม่พบข้อมูลพิกัดตำแหน่งสอดคล้องตามมาตรฐานไฟล์ JSON');
          }
        } else {
          setFileImportError('โครงสร้างไฟล์ไม่ถูกต้อง ต้องเป็นอาร์เรย์แถวของตำแหน่งพิกัด');
        }
      } catch {
        setFileImportError('เกิดข้อผิดพลาดในการวิเคราะห์ไฟล์ JSON ไม่พบรูปแบบที่ถูกต้อง');
      }
    };

    reader.readAsText(file);
  };

  // Reset to seed defaults
  const handleResetToDefaults = () => {
    if (window.confirm('คุณต้องการรีเซ็ตข้อมูลทั้งหมดกลับไปเป็นค่าเริ่มต้นใช่หรือไม่? พิกัดของคุณจะถูกแทนที่ทดแทนใหม่')) {
      setLocations(INITIAL_LANDMARKS);
      setActiveLocationId(null);
      setIsCreating(false);
      setIsEditing(false);
      setSelectedMapPoint(null);
      setFileImportSuccess('รีเซ็ตข้อมูลตำแหน่งตัวอย่างเรียบร้อยแล้ว!');
      setShowSettingsModal(false);
      
      // Recenter Map
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setView([13.7563, 100.5018], 7);
      }
    }
  };

  // Pre-configured category colors
  const markerColors: Record<string, string> = {
    Village: 'border-l-emerald-500 bg-emerald-50/20 text-emerald-600',
    Community: 'border-l-blue-500 bg-blue-50/20 text-blue-650',
    Office: 'border-l-rose-500 bg-rose-50/20 text-rose-600',
    Condo: 'border-l-amber-500 bg-amber-50/20 text-amber-600',
  };

  // Computed Stats for the Work Summary Bento
  const statsSummary = useMemo(() => {
    const total = locations.length;
    const withLink = locations.filter(l => !!l.googleMapLink).length;
    const withoutLink = total - withLink;
    
    // Count per categories
    const categoriesCount = {
      Village: locations.filter(l => l.category === 'Village').length,
      Community: locations.filter(l => l.category === 'Community').length,
      Office: locations.filter(l => l.category === 'Office').length,
      Condo: locations.filter(l => l.category === 'Condo').length,
    };

    return {
      total,
      withLink,
      withoutLink,
      categoriesCount
    };
  }, [locations]);

  // Locations scheduled on "Today's queue" list (All locations without Google Maps link)
  const queueLocations = useMemo(() => {
    return locations.filter(l => !l.googleMapLink);
  }, [locations]);

  return (
    <div id="app-root-container" className="flex flex-col lg:flex-row h-screen w-full select-none overflow-hidden bg-slate-50 text-slate-800">
      
      {/* 1. Sleek Dashboard View (matches the user's dashboard image) */}
      {currentView === 'dashboard' && (
        <div id="aesthetic-dashboard-panel" className="w-full h-full bg-[#0A0B0F]/95 text-[#D8DADF] flex flex-col justify-between overflow-y-auto p-6 md:p-10 relative z-30 font-sans">
          
          {/* Subtle glowing accent background */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[140px] pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#FF6B00]/5 rounded-full blur-[120px] pointer-events-none"></div>

          <div>
            {/* Header branding */}
            <header className="mb-8 md:mb-10 animate-fadeIn flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/40 pb-6">
              <div>
                <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white font-display">
                  MAP <span className="text-[#FF6B00]">WORKSPACE</span>
                </h1>
                <p className="text-slate-400 text-xs md:text-sm font-medium mt-1.5 flex items-center gap-2">
                  <span className="font-mono tracking-widest text-[#FF6B00] bg-[#FF6B00]/10 px-2 py-0.5 rounded-md border border-[#FF6B00]/20">BNPROMAP v1.0.0</span>
                  <span className="inline-flex items-center gap-1.5 text-emerald-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse border-2 border-slate-900"></span>
                    ระบบพร้อมใช้งานออนไลน์
                  </span>
                </p>
              </div>
              <div className="hidden sm:flex items-center gap-3 bg-slate-900/60 border border-slate-800/80 px-4 py-2.5 rounded-2xl backdrop-blur-md">
                <Activity size={15} className="text-[#FF6B00] animate-pulse" />
                <div className="text-left">
                  <p className="text-[9px] uppercase tracking-wider font-bold text-slate-500 font-mono">เวลาเครื่องปัจจุบัน</p>
                  <p className="text-xs font-bold text-white font-mono">{new Date().toLocaleTimeString('th-TH')}</p>
                </div>
              </div>
            </header>

            {/* Mini Inline Stats Summary under Dashboard Header */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8 md:mb-12 max-w-7xl animate-slideUp">
              <div className="bg-[#13141A]/80 backdrop-blur-md border border-slate-800/60 rounded-[20px] p-4 flex flex-col justify-between hover:border-slate-700/80 transition-all duration-300">
                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 font-mono">พิกัดจัดเก็บทั้งหมด</span>
                <span className="text-2xl font-extrabold text-white font-display mt-2">{statsSummary.total} <span className="text-xs font-normal text-slate-400">จุด</span></span>
              </div>
              <div className="bg-[#13141A]/80 backdrop-blur-md border border-slate-800/60 rounded-[20px] p-4 flex flex-col justify-between hover:border-slate-700/80 transition-all duration-300">
                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 font-mono">หมู่บ้าน / ชุมชน</span>
                <span className="text-2xl font-extrabold text-emerald-400 font-display mt-2">{statsSummary.categoriesCount.Village + statsSummary.categoriesCount.Community} <span className="text-xs font-normal text-slate-400">จุด</span></span>
              </div>
              <div className="bg-[#13141A]/80 backdrop-blur-md border border-slate-800/60 rounded-[20px] p-4 flex flex-col justify-between hover:border-slate-700/80 transition-all duration-300">
                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 font-mono">สำนักงาน / คอนโด</span>
                <span className="text-2xl font-extrabold text-amber-500 font-display mt-2">{statsSummary.categoriesCount.Office + statsSummary.categoriesCount.Condo} <span className="text-xs font-normal text-slate-400">จุด</span></span>
              </div>
              <div className="bg-[#13141A]/80 backdrop-blur-md border border-[#FF6B00]/20 rounded-[20px] p-4 flex flex-col justify-between hover:border-[#FF6B00]/40 transition-all duration-300 relative overflow-hidden group">
                <div className="absolute right-0 top-0 w-12 h-12 bg-[#FF6B00]/5 rounded-full -mr-3 -mt-3"></div>
                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 font-mono">ลิงก์สถานที่ครบถ้วน</span>
                <span className="text-2xl font-extrabold text-[#FF6B00] font-display mt-2">{statsSummary.withLink} <span className="text-xs text-slate-400 font-normal">/ {statsSummary.total} จุด</span></span>
              </div>
            </div>

            {/* Menu options 2-columns spacing on mobile */}
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 md:gap-6 max-w-7xl animate-slideUp">
              
              {/* CARD 1: เปิดแผนที่ (Open Map) */}
              <button 
                id="dash-card-open-map"
                onClick={() => {
                  setCurrentView('map');
                  if (isMobile) {
                    setMobileActiveTab('map');
                  }
                }}
                className="aspect-square bg-[#13141B]/90 hover:bg-[#1C1D26] border border-slate-800/60 hover:border-slate-700 text-[#D8DADF] rounded-[24px] p-5 flex flex-col items-center justify-between transition-all duration-350 hover:-translate-y-2 hover:shadow-2xl hover:shadow-indigo-500/10 group cursor-pointer text-center"
              >
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/15 to-blue-500/5 border border-indigo-500/30 flex items-center justify-center transition group-hover:scale-110 mt-2">
                  <span className="text-3xl select-none">🗺️</span>
                </div>
                <div className="space-y-1 mt-auto w-full">
                  <span className="text-sm font-bold text-white tracking-wide block">
                    เปิดแผนที่
                  </span>
                  <span className="text-[9px] text-slate-400 font-medium block leading-tight">
                    สำรวจพื้นที่และพิกัดภูมิศาสตร์
                  </span>
                </div>
              </button>

              {/* CARD 2: เพิ่มข้อมูล (Add Point) */}
              <button 
                id="dash-card-add-data"
                onClick={() => {
                  setCurrentView('map');
                  if (isMobile) {
                    setMobileActiveTab('map');
                  }
                  setIsCreating(true);
                  setIsEditing(false);
                  setSelectedMapPoint(null);
                  setFormName('');
                  setFormCategory('Village');
                  setFormNotes('');
                  setFormLat('');
                  setFormLng('');
                  setFormGoogleMapLink('');
                  setFormSoi('');
                  setFormMoo('');
                  setFormTambon('');
                  setFormAmphoe('');
                }}
                className="aspect-square bg-[#13141B]/90 hover:bg-[#1C1D26] border border-slate-800/60 hover:border-slate-700 text-[#D8DADF] rounded-[24px] p-5 flex flex-col items-center justify-between transition-all duration-350 hover:-translate-y-2 hover:shadow-2xl hover:shadow-emerald-500/10 group cursor-pointer text-center"
              >
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/15 to-teal-500/5 border border-emerald-500/30 flex items-center justify-center transition group-hover:scale-110 mt-2">
                  <span className="text-3xl select-none">🎯</span>
                </div>
                <div className="space-y-1 mt-auto w-full">
                  <span className="text-sm font-bold text-white tracking-wide block">
                    เพิ่มข้อมูล
                  </span>
                  <span className="text-[9px] text-slate-400 font-medium block leading-tight">
                    สร้างแลนด์มาร์กปักหมุดตำแหน่งใหม่
                  </span>
                </div>
              </button>

              {/* CARD 3: ค้นหา (Search) */}
              <button 
                id="dash-card-search"
                onClick={() => {
                  setCurrentView('map');
                  if (isMobile) {
                    setMobileActiveTab('list');
                  }
                }}
                className="aspect-square bg-[#13141B]/90 hover:bg-[#1C1D26] border border-slate-800/60 hover:border-slate-700 text-[#D8DADF] rounded-[24px] p-5 flex flex-col items-center justify-between transition-all duration-350 hover:-translate-y-2 hover:shadow-2xl hover:shadow-cyan-500/10 group cursor-pointer text-center"
              >
                <div className="w-14 h-14 rounded-[20px] bg-gradient-to-br from-cyan-500/15 to-blue-500/5 border border-cyan-500/30 flex items-center justify-center transition group-hover:scale-110 mt-2">
                  <span className="text-3xl select-none">🔍</span>
                </div>
                <div className="space-y-1 mt-auto w-full">
                  <span className="text-sm font-bold text-white tracking-wide block">
                    ค้นหา
                  </span>
                  <span className="text-[9px] text-slate-400 font-medium block leading-tight">
                    สืบค้นและคัดกรองหมวดหมู่พิกัด
                  </span>
                </div>
              </button>

              {/* CARD 4: รอกรอกลิงก์ (Today's Queue / Wait for map link) */}
              <button 
                id="dash-card-queue"
                onClick={() => {
                  setShowQueueModal(true);
                }}
                className="aspect-square bg-[#13141B]/90 hover:bg-[#1C1D26] border border-slate-800/60 hover:border-slate-700 text-[#D8DADF] rounded-[24px] p-5 flex flex-col items-center justify-between transition-all duration-350 hover:-translate-y-2 hover:shadow-2xl hover:shadow-amber-500/10 group cursor-pointer text-center relative"
              >
                {queueLocations.length > 0 && (
                  <span className="absolute top-4 right-4 bg-[#FF6B00] text-white text-xs font-black w-6 h-6 rounded-full flex items-center justify-center shadow-lg border-2 border-slate-900 animate-bounce">
                    {queueLocations.length}
                  </span>
                )}
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/15 to-orange-500/5 border border-amber-500/30 flex items-center justify-center transition group-hover:scale-110 mt-2">
                  <span className="text-3xl select-none">📦</span>
                </div>
                <div className="space-y-1 mt-auto w-full">
                  <span className="text-sm font-bold text-white tracking-wide block">
                    รอกรอกลิงก์
                  </span>
                  <span className="text-[9px] text-slate-400 font-semibold block leading-tight">
                    จุดพักที่ยังไม่มีลิงก์นำทาง
                  </span>
                </div>
              </button>

              {/* CARD 5: สรุปงาน (Summary Dashboard) */}
              <button 
                id="dash-card-stats"
                onClick={() => {
                  setShowStatsModal(true);
                }}
                className="aspect-square bg-[#13141B]/90 hover:bg-[#1C1D26] border border-slate-800/60 hover:border-slate-700 text-[#D8DADF] rounded-[24px] p-5 flex flex-col items-center justify-between transition-all duration-350 hover:-translate-y-2 hover:shadow-2xl hover:shadow-emerald-500/10 group cursor-pointer text-center"
              >
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/15 to-teal-500/5 border border-emerald-500/30 flex items-center justify-center transition group-hover:scale-110 mt-2">
                  <span className="text-3xl select-none">📊</span>
                </div>
                <div className="space-y-1 mt-auto w-full">
                  <span className="text-sm font-bold text-white tracking-wide block">
                    สรุปงาน
                  </span>
                  <span className="text-[9px] text-slate-400 font-medium block leading-tight">
                    ความเรียบร้อยของข้อมูลพิกัด
                  </span>
                </div>
              </button>

            </div>
          </div>

          {/* Corporate bottom info footer and Settings FAB */}
          <footer className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-800/40 pt-6 text-slate-500 text-[10px] font-mono leading-none">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 uppercase font-semibold">
              <span>● สัญญาณดาวเทียม: เสถียรสูง</span>
              <span>● SERVER STATUS: ONLINE</span>
              <span>● LATENCY: 24MS</span>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="text-slate-400 font-medium select-text">สำรองข้อมูล / ประมวลผลระบบพิกัด:</span>
              <button 
                id="dash-settings-fab"
                onClick={() => setShowSettingsModal(true)}
                className="w-11 h-11 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white rounded-xl flex items-center justify-center shadow-lg transition-all duration-300 cursor-pointer group"
                title="ตั้งค่าและสำรองพิกัดไฟล์แผนที่"
              >
                <Settings size={18} className="group-hover:rotate-45 transition-transform duration-300 text-slate-300 group-hover:text-white" />
              </button>
            </div>
          </footer>

        </div>
      )}
      {/* 2. Interactive Map Screen (Visible when currentView === 'map') */}
      <div id="interactive-map-workspace" className={`flex-1 flex flex-col lg:flex-row h-screen w-full select-none overflow-hidden bg-slate-50 ${currentView === 'map' ? '' : 'hidden'}`}>
        
        {/* SIDEBAR PANEL : Operations, Search & CRUD */}
        <aside 
          id="sidebar-panel" 
          className={
            isMobile 
              ? (mobileActiveTab === 'list' && !(isCreating || isEditing) ? 'flex flex-col flex-1 h-full w-full bg-white z-[25] overflow-hidden pb-16 animate-fadeIn' : 'hidden')
              : 'w-full lg:w-[420px] xl:w-[460px] flex flex-col h-full bg-white border-r border-[#2B2F3E]/10 shadow-xl z-[25] flex-shrink-0'
          }
        >
          
          {/* Elegant Corporate Header with Back Button to Dashboard */}
          <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-slate-950 to-slate-900 text-white relative">
            <div className="flex items-center justify-between mb-2">
              <button 
                id="btn-back-to-dash"
                onClick={() => setCurrentView('dashboard')}
                className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 hover:text-white px-2.5 py-1 rounded-lg text-slate-300 transition text-xs font-semibold cursor-pointer"
              >
                <LayoutDashboard size={13} />
                <span>กลับสู่แดชบอร์ด</span>
              </button>
              
              <div className="flex items-center gap-1">
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full mr-1 animate-ping"></span>
                  เชื่อมต่อสมบูรณ์
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-2">
              <span className="p-1 bg-blue-600 rounded-lg text-white">
                <MapPinned size={14} />
              </span>
              <h1 className="text-sm font-bold tracking-tight text-white">
                ระบบพิกัดและหมุดจัดเก็บ ({locations.length} จุด)
              </h1>
            </div>

            {/* Quick alerts helper */}
            {(fileImportSuccess || fileImportError) && (
              <div id="import-msg-alert" className="absolute left-0 right-0 -bottom-1 translate-y-full px-4 py-2 z-[9999] bg-slate-100 border-b border-slate-200 animate-slideUp text-xs flex justify-between items-center shadow-lg">
                <span className={`font-semibold ${fileImportSuccess ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {fileImportSuccess || fileImportError}
                </span>
                <button 
                  id="close-feedback"
                  className="text-slate-500 hover:text-slate-800 ml-2 cursor-pointer" 
                  onClick={() => { setFileImportSuccess(null); setFileImportError(null); }}
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>

          {/* MAIN SCROLLABLE CONTENT BODY */}
          <div id="sidebar-scrollable-section" className="flex-1 overflow-y-auto p-4 space-y-4">
            
            {/* CRUD FORM LAYOUT (Active in add or edit mode) */}
            {isCreating || isEditing ? (
              <div id="form-card-container" className="bg-[#1A1D26] border border-slate-800 rounded-2xl p-4 animate-fadeIn text-[#E2E8F0]">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
                    {isCreating ? 'ปักหมุดพิกัดสถานที่ใหม่' : 'แก้ไขข้อมูลจุดพิกัดสถานที่'}
                  </span>
                  <button 
                    id="btn-cancel-form"
                    onClick={handleCancelForm} 
                    className="text-slate-400 hover:text-slate-200 p-1 rounded-full hover:bg-slate-800 transition cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>

                {selectedMapPoint && (
                  <div id="help-click-alert" className="mb-3 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-[10px] text-amber-400 flex items-center gap-1.5">
                    <Sparkles size={11} className="text-amber-500 shrink-0" />
                    <span>ดักจับพิกัดจากตำแหน่งที่คลิกบนแผนที่สดแล้ว</span>
                  </div>
                )}

                {/* Form fields */}
                <form id="coordinate-crud-form" onSubmit={(e) => e.preventDefault()} className="space-y-3.5">
                  
                  {/* Name field */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-350 mb-1">
                      ชื่อเรียกจุดพิกัดสถานที่ <span className="text-red-500">*</span>
                    </label>
                    <input 
                      id="input-location-name"
                      type="text" 
                      required
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="เช่น หมู่บ้านรุ่งทิพย์, ชุมชนพัฒนา" 
                      className="w-full text-xs px-3 py-2 bg-slate-900 border border-slate-800 text-slate-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF6B00] font-medium"
                    />
                  </div>

                  {/* Category Selection Component */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-350 mb-1.5">
                      เลือกประเภทสถานที่
                    </label>
                    <div className="grid grid-cols-4 gap-1.5 font-sans">
                      {(['Village', 'Community', 'Office', 'Condo'] as BookmarkLocation['category'][]).map(cat => {
                        const isSelected = formCategory === cat;
                        return (
                          <button
                            id={`cat-btn-${cat}`}
                            key={cat}
                            type="button"
                            onClick={() => setFormCategory(cat)}
                            className={`flex flex-col items-center justify-center p-1.5 rounded-lg border text-center transition-all cursor-pointer ${
                              isSelected 
                                ? 'bg-[#FF6B00] border-[#FF6B05] text-white shadow font-bold' 
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-805'
                            }`}
                          >
                            <span className="text-sm">{getCategoryEmoji(cat)}</span>
                            <span className="text-[9px] block truncate max-w-full mt-0.5">
                              {getCategoryNameTh(cat)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* GET CURRENT LOCATION BUTTON */}
                  <div>
                    <button
                      id="btn-form-get-current"
                      type="button"
                      onClick={handleGetCurrentLocationForForm}
                      className="w-full flex items-center justify-center gap-2 bg-slate-800 text-white font-bold text-xs py-2 px-3 rounded-lg hover:bg-slate-700 transition shadow cursor-pointer active:scale-98"
                    >
                      <MapPin size={13} className="text-[#FF6B00]" />
                      <span>ดึงตำแหน่ง GPS ปัจจุบัน</span>
                    </button>
                  </div>

                  {/* Coordinates Row */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-350 mb-1">
                        ละติจูด (Latitude) <span className="text-red-500">*</span>
                      </label>
                      <input 
                        id="input-latitude"
                        type="number" 
                        step="any"
                        required
                        value={formLat || ''}
                        onChange={(e) => setFormLat(parseFloat(e.target.value))}
                        placeholder="13.7563"
                        className="w-full text-xs px-3 py-2 bg-slate-900 border border-slate-805 text-slate-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF6B00] font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-350 mb-1">
                        ลองจิจูด (Longitude) <span className="text-red-500">*</span>
                      </label>
                      <input 
                        id="input-longitude"
                        type="number" 
                        step="any"
                        required
                        value={formLng || ''}
                        onChange={(e) => setFormLng(parseFloat(e.target.value))}
                        placeholder="100.5018"
                        className="w-full text-xs px-3 py-2 bg-slate-900 border border-slate-805 text-slate-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF6B00] font-mono"
                      />
                    </div>
                  </div>

                  <div className="text-[11px] text-emerald-400/80 bg-emerald-950/40 p-2 rounded border border-emerald-800/30 mt-1">
                    💡 พิกัดจะถูกปรับค่าทศนิยมออโตเมติกให้แม่นยำระดับควบคุม ± ไม่เกิน 5 เมตรก่อนส่งขึ้นฐานข้อมูลคลาวด์
                  </div>

                  {/* NAVIGATION BUTTON BELOW LONGITUDE */}
                  {formLat !== '' && formLng !== '' && !isNaN(Number(formLat)) && !isNaN(Number(formLng)) && (
                    <div className="mt-1">
                      <a
                        id="btn-form-navigate-gmap"
                        href={formGoogleMapLink ? formGoogleMapLink : `https://www.google.com/maps/dir/?api=1&destination=${formLat},${formLng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 px-3 rounded-lg transition shadow text-center cursor-pointer"
                      >
                        <Navigation size={13} />
                        <span>ปุ่มนำทาง (Google Map)</span>
                      </a>
                    </div>
                  )}

                  {/* Add Google Maps Link input */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-350 mb-1">
                      กรอก Link GoogleMap
                    </label>
                    <input 
                      id="input-google-map-link"
                      type="url" 
                      value={formGoogleMapLink}
                      onChange={(e) => setFormGoogleMapLink(e.target.value)}
                      placeholder="เช่น https://goo.gl/maps/..." 
                      className="w-full text-xs px-3 py-2 bg-slate-900 border border-slate-800 text-slate-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF6B00] font-medium"
                    />
                  </div>

                  {/* Thailand Specific Address Information Grid (Soi, Moo, Tambon, Amphoe) */}
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2 mt-2 text-[#E2E8F0]">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block border-b border-slate-800 pb-1">ข้อมูลที่อยู่สอดคล้องประเทศไทย</span>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-0.5">ชื่อซอย (Soi)</label>
                        <input 
                          id="input-soi"
                          type="text"
                          value={formSoi}
                          onChange={(e) => setFormSoi(e.target.value)}
                          placeholder="เช่น ซอยมิตรไมตรี" 
                          className="w-full text-xxs px-2.5 py-1.5 bg-[#14161E] border border-slate-800 rounded-md text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#FF6B00]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-0.5">หมู่ที่ (Moo)</label>
                        <input 
                          id="input-moo"
                          type="text"
                          value={formMoo}
                          onChange={(e) => setFormMoo(e.target.value)}
                          placeholder="เช่น หมู่ 3" 
                          className="w-full text-xxs px-2.5 py-1.5 bg-[#14161E] border border-slate-800 rounded-md text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#FF6B00]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-0.5">ตำบล/แขวง (Tambon)</label>
                        <select 
                          id="input-tambon"
                          value={formTambon}
                          onChange={(e) => setFormTambon(e.target.value)}
                          className="w-full text-xxs px-2.5 py-1.5 bg-[#14161E] border border-slate-800 rounded-md text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#FF6B00] appearance-none cursor-pointer"
                        >
                          <option value="">-- เลือกตำบล/แขวง --</option>
                          <option value="บางเลน">บางเลน</option>
                          <option value="บางใหญ่">บางใหญ่</option>
                          <option value="บางม่วง">บางม่วง</option>
                          <option value="เสาธงหิน">เสาธงหิน</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-0.5">เขต/อำเภอ (Amphoe)</label>
                        <input 
                          id="input-amphoe"
                          type="text"
                          value={formAmphoe}
                          onChange={(e) => setFormAmphoe(e.target.value)}
                          placeholder="เช่น เขตพญาไท" 
                          className="w-full text-xxs px-2.5 py-1.5 bg-[#14161E] border border-slate-800 rounded-md text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#FF6B00]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Description notes */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-350 mb-1">
                      ระบุบันทึกรายละเอียดพิกัด
                    </label>
                    <textarea 
                      id="input-notes"
                      rows={2}
                      value={formNotes}
                      onChange={(e) => setFormNotes(e.target.value)}
                      placeholder="เพิ่มโน้ตรายละเอียดสถานที่สำคัญ..." 
                      className="w-full text-xs px-3 py-2 bg-slate-900 border border-slate-800 text-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF6B00] leading-relaxed resize-none"
                    />
                  </div>

                  {/* Auto-saving status indicator and done button */}
                  <div className="pt-2 font-sans">
                    <div className="text-[10px] text-emerald-400 font-bold flex items-center justify-center gap-1.5 mb-2.5 bg-emerald-500/10 border border-emerald-500/20 py-2 px-3 rounded-xl">
                      <span className="animate-pulse">🟢</span>
                      <span>บันทึกพิกัดอัตโนมัติลงบน Firebase Cloud สำเร็จแล้ว</span>
                    </div>
                    <button 
                      id="btn-cancel"
                      type="button" 
                      onClick={() => {
                        setIsCreating(false);
                        setIsEditing(false);
                        setSelectedMapPoint(null);
                        if (isMobile) {
                          setMobileActiveTab('list');
                        }
                      }}
                      className="w-full bg-[#FF6B00] hover:bg-[#E05E00] text-white font-bold text-xs py-2.5 px-4 rounded-xl transition cursor-pointer text-center"
                    >
                      เสร็จสิ้นการระบุข้อมูล
                    </button>
                  </div>

                </form>
              </div>
            ) : activeLocation ? (
              
              /* READ BOX / SELECT VISITOR DETAIL EXPLAINER */
              <div id="read-card-details" className="bg-white border border-slate-200/80 rounded-2xl p-4.5 animate-fadeIn transition-all duration-300 relative overflow-hidden shadow-sm">
                <div className="absolute right-0 top-0 w-24 h-24 bg-[#FF6B00]/5 rounded-full -mr-6 -mt-6"></div>
                
                <div className="flex items-start justify-between relative z-10">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xl bg-slate-50 shadow-sm p-1.5 rounded-lg inline-block border border-slate-100">
                        {getCategoryEmoji(activeLocation.category)}
                      </span>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-[#FF6B00] px-2.5 py-0.5 rounded-full bg-[#FF6B00]/5 border border-[#FF6B00]/10">
                        {getCategoryNameTh(activeLocation.category)}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-800 pt-1 leading-snug">
                      {activeLocation.name}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button 
                      id="btn-edit-active"
                      onClick={() => handleStartEdit(activeLocation)} 
                      className="p-1.5 bg-slate-50 text-slate-600 hover:text-[#FF6B00] hover:bg-[#FF6B00]/5 rounded-lg border border-slate-200/60 shadow-sm transition cursor-pointer"
                      title="แก้ไขตำแหน่งพิกัดนี้"
                    >
                      <Edit3 size={13} />
                    </button>
                    <button 
                      id="btn-delete-active"
                      onClick={() => handleDeleteLocation(activeLocation.id)} 
                      className="p-1.5 bg-slate-50 text-slate-655 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-200/60 shadow-sm transition cursor-pointer"
                      title="ลบจุดนี้ออก"
                    >
                      <Trash2 size={13} />
                    </button>
                    <button 
                      id="btn-close-active"
                      onClick={() => setActiveLocationId(null)} 
                      className="p-1.5 bg-slate-400 text-white hover:bg-slate-500 rounded-lg shadow-sm transition cursor-pointer"
                      title="ปิดหน้าต่างแสดงข้อมูล"
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>

                {/* Detailed Thai Address components displayed elegantly below name */}
                <div className="mt-3.5 bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1.5 text-xs text-slate-750 font-sans">
                  <p className="font-bold text-[9px] text-slate-400 uppercase tracking-wider">ข้อมูลที่อยู่ประเทศไทย:</p>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-slate-700">
                    <div><span className="text-slate-400">ซอย:</span> {activeLocation.soi || '-'}</div>
                    <div><span className="text-slate-400">หมู่ที่:</span> {activeLocation.moo || '-'}</div>
                    <div className="col-span-2"><span className="text-slate-400">ตำบล/แขวง:</span> {activeLocation.tambon || '-'}</div>
                    <div className="col-span-2"><span className="text-slate-400">เขต/อำเภอ:</span> {activeLocation.amphoe || '-'}</div>
                  </div>
                </div>

                {/* latlng coordinates Copy-friendly info */}
                <div 
                  onClick={() => {
                    navigator.clipboard.writeText(`${activeLocation.lat.toFixed(6)}, ${activeLocation.lng.toFixed(6)}`);
                    setCopiedCoords(true);
                    setTimeout(() => setCopiedCoords(false), 2000);
                  }}
                  className="mt-3 grid grid-cols-2 gap-2 bg-slate-50 hover:bg-slate-100/80 px-3.5 py-2.5 rounded-xl border border-slate-200/60 font-mono text-[10px] text-slate-500 cursor-pointer transition relative group"
                  title="คลิกเพื่อคัดลอกพิกัดปักหมุดนี้นำไปใช้งาน"
                >
                  <div className="flex flex-col">
                    <span className="text-[8px] text-slate-400 font-sans uppercase font-bold">Latitude</span>
                    <span className="font-bold text-slate-700">{activeLocation.lat.toFixed(6)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[8px] text-slate-400 font-sans uppercase font-bold">Longitude</span>
                    <span className="font-bold text-slate-700">{activeLocation.lng.toFixed(6)}</span>
                  </div>
                  <span className="absolute right-2 top-2 text-[8px] bg-[#FF6B00] text-white font-sans font-extrabold px-1.5 py-0.5 rounded transition">
                    {copiedCoords ? 'คัดลอกสำเร็จ ✓' : 'คัดลอกคู่พิกัด'}
                  </span>
                </div>

                {/* Google Map Link detail status */}
                <div className="mt-3 text-xs leading-relaxed text-slate-600 bg-slate-50/50 px-3 py-2 rounded-xl border border-slate-100">
                  <p className="font-bold text-[9px] text-slate-400 uppercase tracking-wider mb-0.5">ลิงก์ Google Maps:</p>
                  {activeLocation.googleMapLink ? (
                    <a 
                      href={activeLocation.googleMapLink} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-[#FF6B00] hover:underline font-bold text-xxs block truncate max-w-full"
                    >
                      {activeLocation.googleMapLink}
                    </a>
                  ) : (
                    <span className="text-slate-400 block italic text-xxs">ยังไม่มีข้อมูลลิงก์ที่ตั้งบันทึกไว้</span>
                  )}
                </div>

                {/* QR Code Sharing Block (Desktop Sidebar) */}
                <div className="mt-3 bg-slate-100/40 border border-slate-200/50 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-[9px] text-slate-450 uppercase tracking-wider block">ฟีเจอร์เพิ่มแชร์พิกัด</span>
                      <span className="text-[10px] text-slate-500 font-bold block mt-0.5">
                        {activeLocation.googleMapLink ? 'สแกนคิวอาร์ลิ้งค์แผนที่' : 'สแกนคิวอาร์ระบุฝั่งจัดพิกัด'}
                      </span>
                    </div>
                    <button
                      id="btn-toggle-qr-code"
                      type="button"
                      onClick={() => setShowActiveQr(!showActiveQr)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                        showActiveQr 
                          ? 'bg-[#FF6B00] text-white border-[#FF6B00] shadow-sm' 
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <QrCode size={13} />
                      <span>{showActiveQr ? 'ปิดคิวอาร์' : 'แสดงคิวอาร์'}</span>
                    </button>
                  </div>

                  <AnimatePresence>
                    {showActiveQr && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden flex flex-col items-center justify-center pt-2 pb-1 bg-white rounded-lg border border-slate-200/50"
                      >
                        {activeQrCodeUrl ? (
                          <div className="flex flex-col items-center space-y-2 p-1 text-center">
                            <img 
                              src={activeQrCodeUrl} 
                              alt="Location QR Code" 
                              className="w-32 h-32 object-contain select-none"
                              referrerPolicy="no-referrer"
                            />
                            <div className="px-2">
                              <p className="text-[9px] text-[#FF6B00] font-black">
                                {activeLocation.googleMapLink ? '🗺️ ลิงก์แผนที่หลัก' : '📍 พิกัดสำลองนำทาง'}
                              </p>
                              <p className="text-[8px] text-slate-400 max-w-[190px] truncate leading-normal">
                                {activeLocation.googleMapLink || `${activeLocation.lat.toFixed(6)}, ${activeLocation.lng.toFixed(6)}`}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="py-4 text-xs text-slate-455 flex flex-col items-center gap-1">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#FF6B00]"></div>
                            <span>กำลังสร้าง QR...</span>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Note details */}
                <div className="mt-3 text-xs leading-relaxed text-slate-600 bg-slate-50/50 px-3 py-2.5 rounded-xl border border-slate-100">
                  <p className="font-bold text-[9px] text-slate-400 uppercase tracking-wider mb-0.5">บันทึกเพิ่มเติม:</p>
                  <p className="text-slate-700 font-medium">
                    {activeLocation.notes ? `"${activeLocation.notes}"` : 'ไม่ได้ระบุประวัติหรือโน้ตเพิ่มเติมสำหรับพิกัดจัดเก็บชิ้นนี้'}
                  </p>
                </div>

                {/* Fly maps directly button & Map navigation */}
                <div className="mt-3.5 flex flex-col gap-2">
                  <button 
                    id="btn-active-flyto"
                    onClick={() => handleMapFocus(activeLocation.lat, activeLocation.lng, 15)}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2.5 px-3 rounded-xl shadow-md transition cursor-pointer active:scale-98"
                  >
                    <Navigation size={13} className="text-[#FF6B00]" />
                    <span>บินไปยังพิกัดบนแผนที่</span>
                  </button>
                  <a 
                    id="btn-active-external-navigate"
                    href={activeLocation.googleMapLink ? activeLocation.googleMapLink : `https://www.google.com/maps/dir/?api=1&destination=${activeLocation.lat},${activeLocation.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 px-3 rounded-xl shadow-md transition cursor-pointer text-center"
                  >
                    <Navigation size={13} />
                    <span>นำทางด้วย Google Map</span>
                  </a>
                </div>

              </div>
            ) : (
              
              /* TUTORIAL / WELCOME TIPS */
              <div id="welcome-tutorial-card" className="bg-gradient-to-br from-indigo-50/50 to-blue-50/50 border border-indigo-100/60 rounded-2xl p-4 animate-fadeIn">
                <div className="flex gap-2">
                  <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-slate-855">
                      💡 เคล็ดลับการแต่งแต้มใช้งาน:
                    </h4>
                    <ul className="text-[11px] text-slate-650 space-y-1 list-disc pl-3.5 leading-relaxed">
                      <li><strong>คลิกตรงจุดใดก็ได้บนแผนที่</strong> เพื่อลอบดักจับพิกัดแล้วแต่งชื่อทำหมุดใหม่ทันที!</li>
                      <li>เปลี่ยนภาพแผนที่เป็นดาวเทียม ผิวมินิมอล หรือลานหินมืดได้ที่เมนูด้านบน</li>
                      <li>กดสลับสถานะ <strong>"เคยไปแล้ว"</strong> เพื่อสะสมความสำเร็จส่วนบุคคล</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* SEARCH AND CATEGORY FILTER COMPONENT */}
            <div id="search-filter-controls-container" className="space-y-3 pt-2">
              
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400">
                  <Search size={14} />
                </span>
                <input 
                  id="feed-search-input"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ค้นหาตามที่อยู่ (ซอย, หมู่, ตำบล, อำเภอ) หรือชื่อสถานที่..."
                  className="w-full text-xs pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800"
                />
                {searchQuery && (
                  <button 
                    id="btn-clear-search"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Categorization tab list filters */}
              <div id="category-filter-tabs" className="flex flex-wrap gap-1">
                {['All', 'Village', 'Community', 'Office', 'Condo'].map(cat => {
                  const isSelected = categoryFilter === cat;
                  const count = cat === 'All' 
                    ? locations.length 
                    : locations.filter(l => l.category === cat).length;

                  return (
                    <button
                      id={`filter-tab-${cat}`}
                      key={cat}
                      type="button"
                      onClick={() => setCategoryFilter(cat)}
                      className={`text-[10px] px-2.5 py-1 rounded-full font-bold transition flex items-center gap-1 cursor-pointer ${
                        isSelected 
                          ? 'bg-slate-900 text-white' 
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <span>{cat === 'All' ? '📌 ทั้งหมด' : `${getCategoryEmoji(cat)} ${getCategoryNameTh(cat).split(' ')[0]}`}</span>
                      <span className="text-[9px] bg-slate-700/10 text-[#334155]/80 px-1 py-0.1 ml-0.5 rounded-full font-mono">
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

            </div>

            {/* LOCATION LIST FEED */}
            <div id="location-cards-feed" className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs text-slate-400 font-semibold px-1">
                <span>รายการตำแหน่ง ({filteredLocations.length} หมุด)</span>
                {categoryFilter !== 'All' && <span className="text-[10px] text-blue-600 font-bold">ตัวกรองทำงานอยู่</span>}
              </div>

              {filteredLocations.length === 0 ? (
                <div id="empty-search-alert" className="text-center py-8 bg-white border border-slate-200 border-dashed rounded-xl px-4">
                  <span className="text-3xl block mb-2 opacity-60">🔮</span>
                  <p className="text-xs font-semibold text-slate-500">ไม่พบจุดพิกัดที่ท่านค้นพบ</p>
                  <p className="text-[10px] text-slate-400 mt-1">กรุณาลองป้อนคำค้นหาใหม่ หรือปรับตัวกรองให้กว้างขึ้น</p>
                </div>
              ) : (
                filteredLocations.map(loc => {
                  const isActive = loc.id === activeLocationId;
                  const activeColorClass = isActive 
                    ? 'border-2 border-blue-500 ring-2 ring-blue-500/10 bg-blue-50/20 shadow-md' 
                    : `border border-slate-200 border-l-4 ${markerColors[loc.category] || 'bg-white'}`;

                  return (
                    <div
                      id={`location-card-${loc.id}`}
                      key={loc.id}
                      onClick={() => {
                        setActiveLocationId(loc.id);
                        setIsEditing(false);
                        setIsCreating(false);
                        handleMapFocus(loc.lat, loc.lng, 14);
                      }}
                      className={`p-3 rounded-xl cursor-pointer transition-all duration-200 group relative ${activeColorClass}`}
                    >
                      <div className="flex items-start justify-between min-w-0">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                            <span className="text-sm shrink-0">{getCategoryEmoji(loc.category)}</span>
                            <span className="text-[9px] text-slate-400 font-mono font-bold">
                              {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
                            </span>
                            {loc.googleMapLink ? (
                              <span className="inline-flex items-center text-[8px] bg-blue-50 text-blue-700 px-1 rounded font-black">
                                🔗 ลิงก์แมป
                              </span>
                            ) : (
                              <span className="inline-flex items-center text-[8px] bg-slate-100 text-slate-500 px-1 rounded font-bold">
                                💤 รอลิงก์
                              </span>
                            )}
                          </div>
                          
                          <h4 className="text-xs font-bold text-slate-800 truncate leading-snug group-hover:text-blue-600 transition">
                            {loc.name}
                          </h4>

                          {/* Thai sub-address badges inside feed */}
                          {(loc.tambon || loc.amphoe) && (
                            <p className="text-[9px] text-slate-500 font-bold mt-1 block">
                              📍 {loc.tambon || '-'}{loc.amphoe ? ` , ${loc.amphoe}` : ''}
                            </p>
                          )}
                          
                          <p className="text-[11px] text-slate-500 line-clamp-1 mt-1 font-normal italic leading-relaxed">
                            {loc.notes || 'ยังไม่มีรายละเอียดที่ป้อนโน้ต...'}
                          </p>
                        </div>

                        {/* Navigation Right arrow */}
                        <div className="ml-2 flex items-center justify-center shrink-0">
                          <button
                            id={`btn-fly-${loc.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveLocationId(loc.id);
                              handleMapFocus(loc.lat, loc.lng, 15);
                            }}
                            className="bg-slate-100 hover:bg-blue-600 hover:text-white p-1 rounded-md text-slate-400 transition cursor-pointer"
                            title="หมุนซูมแผนที่ไปจุดนี้"
                          >
                            <ChevronRight size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Hover action Quick floating editor buttons right over card */}
                      <div className="absolute right-9 top-1/2 -translate-y-1/2 origin-right scale-0 group-hover:scale-100 shrink-0 flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5 shadow-md transition-all duration-200">
                        <button
                          id={`btn-quick-edit-${loc.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveLocationId(loc.id);
                            handleStartEdit(loc);
                          }}
                          className="p-1 hover:bg-slate-100 text-slate-655 hover:text-blue-650 rounded cursor-pointer"
                          title="แก้ไขตำแหน่ง"
                        >
                          <Edit3 size={11} />
                        </button>
                        <button
                          id={`btn-quick-delete-${loc.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteLocation(loc.id);
                          }}
                          className="p-1 hover:bg-slate-100 text-slate-500 hover:text-rose-600 rounded cursor-pointer"
                          title="ลบจุดปักหมุด"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>

                    </div>
                  );
                })
              )}

            </div>

          </div>

          {/* BOTTOM INTERACTIVE TRIGGER BUTTON TAB */}
          <div id="sidebar-footer-trigger" className="p-4 border-t border-slate-150 bg-slate-50 flex items-center gap-3">
            <button
              id="btn-trigger-add"
              onClick={() => {
                setIsCreating(true);
                setIsEditing(false);
                setSelectedMapPoint(null);
                setFormName('');
                setFormLat('');
                setFormLng('');
                setFormCategory('Village');
                setFormNotes('');
                setFormGoogleMapLink('');
                setFormSoi('');
                setFormMoo('');
                setFormTambon('');
                setFormAmphoe('');
                handleMapFocus(13.7563, 100.5018, 10);
              }}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-lg hover:shadow-blue-500/20 transition-all font-sans cursor-pointer animate-pulse"
            >
              <Plus size={16} />
              <span>สร้างเสร็จพิกัดใหม่ (+)</span>
            </button>
          </div>

        </aside>

        {/* MAP STAGE DISPLAY AREA */}
        <main 
          id="map-stage-panel" 
          className={
            isMobile 
              ? (mobileActiveTab === 'map' ? 'flex flex-col flex-1 h-full w-full relative overflow-hidden bg-slate-150 pb-16' : 'hidden')
              : 'flex-1 h-full relative overflow-hidden bg-slate-150 flex flex-col'
          }
        >
          
          {/* UPPER MAP FLOATING SYSTEM - Overlays directly on top of Leaflet */}
          <div 
            id="map-overlays-container" 
            className={`absolute top-4 left-3 right-3 z-[1000] flex ${isMobile ? 'flex-col gap-2' : 'flex-row gap-2'} pointer-events-none`}
          >
            
            {/* Quick Go-To Input field */}
            <form 
              id="form-quick-goto"
              onSubmit={handleQuickGoTo} 
              className={`flex items-center bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-lg border border-slate-200 pointer-events-auto ${isMobile ? 'w-full' : 'flex-1 max-w-sm sm:max-w-md'}`}
            >
              <MapIcon size={14} className="text-blue-500 mr-2 shrink-0 animate-bounce" />
              <div className="flex-1 min-w-0">
                <input 
                  id="input-quick-goto"
                  type="text" 
                  value={quickCoordinatesInput}
                  onChange={(e) => {
                    setQuickCoordinatesInput(e.target.value);
                    setQuickCoordinatesError('');
                  }}
                  placeholder="หมุนค้นหาพิกัดด่วน เช่น 13.8095, 100.5605"
                  className="w-full text-xs bg-transparent border-none outline-none focus:ring-0 text-slate-800 placeholder-slate-400 font-mono font-semibold"
                />
              </div>
              
              <button 
                id="submit-quick-goto"
                type="submit" 
                className="ml-1 px-2.5 py-1.5 bg-slate-900 hover:bg-blue-600 text-white font-bold text-[10px] rounded-lg transition cursor-pointer"
              >
                บินไป
              </button>
            </form>

            {/* Action buttons wrapper for auto-detect mobile layout */}
            <div className={`flex gap-1.5 pointer-events-none ${isMobile ? 'justify-end w-full' : ''}`}>
              
              {/* Quick layer styles selection dropdown */}
              <div id="map-style-menu-toggle" className="relative pointer-events-auto shrink-0 flex items-center justify-end">
                <button 
                  id="btn-map-styles"
                  onClick={() => setShowTileMenu(!showTileMenu)} 
                  className="flex items-center gap-1.5 px-3 py-2 bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-slate-200 text-slate-700 hover:text-slate-900 font-bold text-xs cursor-pointer"
                  title="เปลี่ยนรูปภาพทัศนียภาพพื้นหลัง"
                >
                  <Layers size={13} className="text-indigo-500" />
                  <span>ภาพเเผนที่</span>
                </button>

                {showTileMenu && (
                  <div id="tile-menu-dropdown" className="absolute right-0 top-full mt-2 w-52 bg-white border border-slate-200 rounded-xl shadow-2xl p-1.5 z-50 animate-slideDown">
                    <p className="text-[10px] font-bold text-slate-400 p-1.5 select-none uppercase tracking-wider">
                      เลือกแผนที่รองพื้น (Layers)
                    </p>
                    {Object.entries(TILE_LAYERS).map(([key, style]) => (
                      <button
                        id={`tile-style-opt-${key}`}
                        key={key}
                        onClick={() => {
                          setTileStyle(key as keyof typeof TILE_LAYERS);
                          setShowTileMenu(false);
                        }}
                        className={`w-full flex items-center justify-between text-left px-2 py-1.5 text-xs rounded-lg transition cursor-pointer ${
                          tileStyle === key 
                            ? 'bg-blue-50 text-blue-700 font-bold' 
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <span>{style.name}</span>
                        {tileStyle === key && <Check size={12} className="text-blue-600" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Current GPS coordinates tracking button */}
              <button
                id="btn-acquire-location"
                onClick={handleGetMyGPS}
                disabled={isLocating}
                className={`pointer-events-auto flex items-center gap-1.5 px-3 py-2 rounded-xl shadow-lg border text-xs font-bold transition cursor-pointer ${
                  isLocating 
                    ? 'bg-amber-50 text-amber-600 border-amber-200 animate-pulse' 
                    : 'bg-white hover:bg-blue-50 text-blue-600 hover:text-blue-700 border-slate-200'
                }`}
                title="ค้นหาพิกัด GPS จริงปัจจุบันผ่านสัญญาณเบราว์เซอร์"
              >
                <Compass size={14} className={isLocating ? 'animate-spin' : ''} />
                <span>{isLocating ? 'กําลังระบุ...' : 'พิกัด GPS ฉัน'}</span>
              </button>

            </div>

          </div>

          {/* Quick coordinates Go-To search feedback alert */}
          {quickCoordinatesError && (
            <div id="quick-coords-error-alert" className="absolute top-16 left-4 z-[9999] bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-semibold px-3 py-1.5 rounded-lg shadow-lg animate-fadeIn flex items-center gap-1.5 pointer-events-auto">
              <AlertCircle size={13} className="text-rose-500 shrink-0" />
              <span>{quickCoordinatesError}</span>
              <button id="close-quick-error" className="ml-2 hover:text-rose-900 cursor-pointer" onClick={() => setQuickCoordinatesError('')}>
                <X size={12} />
              </button>
            </div>
          )}

          {/* Core Leaflet Mount canvas div wrapper */}
          <div 
            id="map-container"
            ref={mapContainerRef} 
            className="w-full h-full z-0 relative"
            style={{ cursor: 'pointer' }}
          ></div>

          {/* Lower HUD banner indicating coordinates of Bangkok */}
          <div 
            id="coords-hud-status" 
            className={`absolute bottom-4 left-4 z-[1000] bg-slate-900/90 text-white backdrop-blur px-3 py-2 rounded-lg text-[10px] font-mono shadow-lg flex items-center gap-3 pointer-events-auto select-all ${isMobile ? 'hidden' : ''}`}
          >
            <div className="flex items-center gap-1">
              <span className="text-blue-400">🌐 CENTRE:</span>
              <span>13.7563° N, 100.5018° E (กรุงเทพฯ)</span>
            </div>
            <div className="h-3 w-[1px] bg-slate-700"></div>
            <div>
              <span className="text-emerald-400">STAGE:</span> Leaflet OpenStreetMap Interactive
            </div>
          </div>

          {/* 1. Mobile Floating Panel: Temporary selected pin on map */}
          {isMobile && mobileActiveTab === 'map' && selectedMapPoint && (
            <div id="mobile-floating-temp-pin-panel" className="absolute bottom-20 left-4 right-4 z-[999] bg-[#161720]/95 backdrop-blur-md rounded-2xl border border-slate-800 p-4 shadow-2xl flex flex-col gap-3 animate-slideUp text-white">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg">🎯</span>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400 font-mono">พิกัดชั่วคราว</span>
                  </div>
                  <h4 className="text-xs font-bold text-white">พิกัดทางภูมิศาสตร์ที่ปักหมุด</h4>
                  <p className="text-[10px] text-slate-400 font-mono">{selectedMapPoint.lat.toFixed(6)}, {selectedMapPoint.lng.toFixed(6)}</p>
                </div>
                <button 
                  id="mob-btn-clear-temp-point"
                  onClick={() => setSelectedMapPoint(null)}
                  className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition"
                >
                  <X size={16} />
                </button>
              </div>
              <button
                id="mob-btn-create-from-temp"
                onClick={() => {
                  setIsCreating(true);
                  setIsEditing(false);
                  setFormName('');
                  setFormLat(selectedMapPoint.lat);
                  setFormLng(selectedMapPoint.lng);
                  setFormCategory('Village');
                  setFormNotes('');
                  setFormGoogleMapLink('');
                  setFormSoi('');
                  setFormMoo('');
                  setFormTambon('');
                  setFormAmphoe('');
                }}
                className="w-full flex items-center justify-center gap-1.5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition"
              >
                <Plus size={14} />
                <span>เขียนป้ายชื่อและจัดเก็บพิกัดนี้</span>
              </button>
            </div>
          )}

          {/* 2. Mobile Floating Panel: Active saved location information */}
          {isMobile && mobileActiveTab === 'map' && activeLocation && !selectedMapPoint && (
            <div id="mobile-floating-location-panel" className="absolute bottom-20 left-4 right-4 z-[999] bg-[#161720]/95 backdrop-blur-md rounded-2xl border border-slate-800 p-4 shadow-2xl flex flex-col gap-3 animate-slideUp text-white">
              <div className="flex items-start justify-between">
                <div className="space-y-1 max-w-[75%] min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm bg-slate-800 p-1.5 rounded-lg inline-block">{getCategoryEmoji(activeLocation.category)}</span>
                    <span className="text-[9px] uppercase font-bold tracking-widest text-[#FF6B00] px-2 py-0.5 rounded-full bg-[#FF6B00]/10 border border-[#FF6B00]/20">
                      {getCategoryNameTh(activeLocation.category)}
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-white truncate pt-1">{activeLocation.name}</h3>
                  <p className="text-[10px] text-slate-400 font-mono">{activeLocation.lat.toFixed(5)}, {activeLocation.lng.toFixed(5)}</p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button 
                    id="mob-btn-edit-active"
                    onClick={() => handleStartEdit(activeLocation)} 
                    className="p-2 bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-700/80 hover:border-slate-605 transition cursor-pointer"
                  >
                    <Edit3 size={12} />
                  </button>
                  <button 
                    id="mob-btn-delete-active"
                    onClick={() => handleDeleteLocation(activeLocation.id)} 
                    className="p-2 bg-slate-800 text-slate-400 hover:text-rose-500 rounded-lg border border-slate-700/80 hover:border-rose-905 transition cursor-pointer"
                  >
                    <Trash2 size={12} />
                  </button>
                  <button 
                    id="mob-btn-close-active"
                    onClick={() => setActiveLocationId(null)} 
                    className="p-2 bg-slate-800 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>

              {/* Detailed Thai Address subcomponents list */}
              <div className="bg-slate-900/50 p-2.5 rounded-xl border border-slate-800 text-[11px] text-slate-300 font-sans space-y-1">
                <p className="font-bold text-[9px] text-slate-500 uppercase tracking-widest">ข้อมูลที่อยู่ประเทศไทย:</p>
                <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-slate-300">
                  <div><span className="text-slate-500">ซอย:</span> {activeLocation.soi || '-'}</div>
                  <div><span className="text-slate-500">หมู่ที่:</span> {activeLocation.moo || '-'}</div>
                  <div className="col-span-2"><span className="text-slate-500">ตำบล:</span> {activeLocation.tambon || '-'}</div>
                  <div className="col-span-2"><span className="text-slate-500">อำเภอ:</span> {activeLocation.amphoe || '-'}</div>
                </div>
              </div>

              {activeLocation.googleMapLink && (
                <div className="text-[10px] leading-relaxed text-slate-300 bg-slate-900/50 p-2 rounded-xl border border-slate-800">
                  <span className="font-bold text-[8px] text-slate-500 uppercase tracking-widest block mb-0.5">ลิงก์ Google Maps:</span>
                  <a 
                    href={activeLocation.googleMapLink} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-[#FF6B00] hover:underline font-bold block truncate max-w-full"
                  >
                    {activeLocation.googleMapLink}
                  </a>
                </div>
              )}

              {/* QR Code Sharing Block (Mobile Panel) */}
              <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-2.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-[8px] text-slate-500 uppercase tracking-widest block">การแชร์และ QR Code:</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {activeLocation.googleMapLink ? 'สแกนเพื่อเปิดบนอุปกรณ์อื่น' : 'นำทางด้วยพิกัดปักหมุด'}
                    </span>
                  </div>
                  <button
                    id="mob-btn-toggle-qr-code"
                    type="button"
                    onClick={() => setShowActiveQr(!showActiveQr)}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer border ${
                      showActiveQr 
                        ? 'bg-[#FF6B00] text-white border-[#FF6B00] shadow-sm' 
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                    }`}
                  >
                    <QrCode size={11} />
                    <span>{showActiveQr ? 'ปิดคิวอาร์' : 'แสดงคิวอาร์'}</span>
                  </button>
                </div>

                <AnimatePresence>
                  {showActiveQr && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden flex flex-col items-center justify-center pt-2.5 pb-1.5 bg-white rounded-lg"
                    >
                      {activeQrCodeUrl ? (
                        <div className="flex flex-col items-center space-y-1.5 p-1 text-center text-slate-950 font-sans font-medium">
                          <img 
                            src={activeQrCodeUrl} 
                            alt="Location QR Code" 
                            className="w-28 h-28 object-contain select-none"
                            referrerPolicy="no-referrer"
                          />
                          <div className="px-1.5">
                            <p className="text-[9px] text-[#FF6B00] font-black">
                              {activeLocation.googleMapLink ? '🗺️ ลิงก์สแกนเชื่อมแผนที่' : '📍 สแกนนำทางพิกัด'}
                            </p>
                            <p className="text-[8px] text-slate-500 max-w-[170px] truncate">
                              {activeLocation.googleMapLink || `${activeLocation.lat.toFixed(6)}, ${activeLocation.lng.toFixed(6)}`}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="py-3 text-[10px] text-slate-400 flex flex-col items-center gap-1">
                          <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-[#FF6B00]"></div>
                          <span>กำลังผลิตคิวอาร์...</span>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {activeLocation.notes && (
                <div className="text-[11px] leading-relaxed text-slate-350 bg-slate-900/50 p-2.5 rounded-xl italic">
                  "{activeLocation.notes}"
                </div>
              )}

              <div className="flex gap-2 mt-1">
                <button
                  id="mob-btn-flyto"
                  onClick={() => handleMapFocus(activeLocation.lat, activeLocation.lng, 15)}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-750 text-white font-bold text-xs py-2.5 rounded-xl transition cursor-pointer"
                >
                  <Navigation size={12} className="text-[#FF6B00]" />
                  <span>บินไปยังพิกัด</span>
                </button>
                <a 
                  id="mob-btn-external-navigate"
                  href={activeLocation.googleMapLink ? activeLocation.googleMapLink : `https://www.google.com/maps/dir/?api=1&destination=${activeLocation.lat},${activeLocation.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-xl transition cursor-pointer text-center"
                >
                  <Navigation size={12} />
                  <span>นำทาง (Google Map)</span>
                </a>
              </div>
            </div>
          )}

        </main>

        {/* 3. Mobile Navigation Bottom Tab Bar (Auto scaled for phone devices) */}
        {isMobile && (
          <nav id="mobile-bottom-nav-bar" className="fixed bottom-0 left-0 right-0 h-16 bg-slate-950/95 backdrop-blur-md border-t border-slate-800/80 flex items-center justify-around z-[1100] px-4 shadow-2xl">
            <button
              id="mob-nav-btn-map"
              onClick={() => setMobileActiveTab('map')}
              className={`flex flex-col items-center justify-center gap-1.5 transition cursor-pointer ${
                mobileActiveTab === 'map' ? 'text-blue-500 scale-105 font-bold' : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              <MapIcon size={20} />
              <span className="text-[10px] tracking-wide">แผนที่</span>
            </button>
            <button
              id="mob-nav-btn-list"
              onClick={() => setMobileActiveTab('list')}
              className={`flex flex-col items-center justify-center gap-1.5 transition cursor-pointer ${
                mobileActiveTab === 'list' ? 'text-blue-500 scale-105 font-bold' : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              <ClipboardList size={20} />
              <span className="text-[10px] tracking-wide">รายการหมุด</span>
            </button>
            <button
              id="mob-nav-btn-dash"
              onClick={() => setCurrentView('dashboard')}
              className="flex flex-col items-center justify-center gap-1.5 text-slate-400 hover:text-slate-300 transition cursor-pointer"
            >
              <LayoutDashboard size={20} />
              <span className="text-[10px] tracking-wide">แดชบอร์ด</span>
            </button>
          </nav>
        )}

      </div>

      {/* 4. Mobile Fullscreen CRUD Form Sheet Overlay (z-index highest) */}
      {isMobile && (isCreating || isEditing) && (
        <div id="mobile-fullscreen-form-sheet" className="fixed inset-0 bg-[#0F1015]/98 backdrop-blur-md z-[1200] flex flex-col p-6 text-white overflow-y-auto animate-fadeIn">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
            <div className="flex items-center gap-2">
              <span className="p-2.5 bg-blue-600 rounded-xl text-white">
                <MapPinned size={18} />
              </span>
              <div>
                <h3 className="text-sm font-bold text-white tracking-wide">
                  {isCreating ? 'สร้างและบันทึกพิกัดใหม่' : 'แก้ไขข้อมูลตำแหน่งพิกัด'}
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">กรอกข้อมูลสถานที่เพื่อบันทึกลงหน่วยความจำ</p>
              </div>
            </div>
            <button 
              id="mobile-btn-cancel-form"
              onClick={handleCancelForm} 
              className="text-slate-400 hover:text-white p-2 rounded-full hover:bg-slate-800/80 transition cursor-pointer bg-slate-900 border border-slate-800"
            >
              <X size={18} />
            </button>
          </div>

          <form id="mobile-coordinate-crud-form" onSubmit={handleSaveForm} className="space-y-5">
            {/* Name */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                ชื่อเรียกจุดพิกัดสถานที่ <span className="text-red-500">*</span>
              </label>
              <input 
                id="mob-input-location-name"
                type="text" 
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="เช่น คาเฟ่ยอดฮิต, วัดสระเกศ, อารีย์ ซอย 4" 
                className="w-full text-sm px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-white placeholder-slate-650"
              />
            </div>

            {/* Coordinates Lat / Lng */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  ละติจูด (Lat) <span className="text-red-500">*</span>
                </label>
                <input 
                  id="mob-input-latitude"
                  type="number" 
                  step="any"
                  required
                  value={formLat}
                  onChange={(e) => setFormLat(parseFloat(e.target.value))}
                  placeholder="13.7563"
                  className="w-full text-sm px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-white placeholder-slate-650"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  ลองจิจูด (Lng) <span className="text-red-500">*</span>
                </label>
                <input 
                  id="mob-input-longitude"
                  type="number" 
                  step="any"
                  required
                  value={formLng}
                  onChange={(e) => setFormLng(parseFloat(e.target.value))}
                  placeholder="100.5018"
                  className="w-full text-sm px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-white placeholder-slate-650"
                />
              </div>
            </div>

            <div className="text-[11px] text-emerald-400/80 bg-emerald-950/40 p-2 rounded border border-emerald-800/30">
              💡 พิกัดจะถูกปรับค่าทศนิยมออโตเมติกให้แม่นยำระดับควบคุม ± ไม่เกิน 5 เมตรก่อนส่งขึ้นฐานข้อมูลคลาวด์
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                เลือกประเภทสถานที่และหมวดหมู่
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(['Village', 'Community', 'Office', 'Condo'] as BookmarkLocation['category'][]).map(cat => {
                  const isSelected = formCategory === cat;
                  return (
                    <button
                      id={`mob-cat-btn-${cat}`}
                      key={cat}
                      type="button"
                      onClick={() => setFormCategory(cat)}
                      className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-xl border text-center transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-[#FF6B00] border-[#FF6B00] text-white shadow-lg font-bold' 
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'
                      }`}
                    >
                      <span className="text-lg">{getCategoryEmoji(cat)}</span>
                      <span className="text-[10px] block truncate max-w-full mt-1">
                        {getCategoryNameTh(cat)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* GET CURRENT LOCATION BUTTON FOR MOBILE */}
            <div>
              <button
                id="mob-btn-form-get-current"
                type="button"
                onClick={handleGetCurrentLocationForForm}
                className="w-full flex items-center justify-center gap-2 bg-slate-800 text-white font-bold text-xs py-3 px-4 rounded-xl transition shadow cursor-pointer active:scale-98"
              >
                <MapPin size={14} className="text-[#FF6B00]" />
                <span>ตำแหน่งปัจจุบัน</span>
              </button>
            </div>

            {/* NAVIGATION BUTTON BELOW LONGITUDE FOR MOBILE */}
            {formLat !== '' && formLng !== '' && !isNaN(Number(formLat)) && !isNaN(Number(formLng)) && (
              <div>
                <a
                  id="mob-btn-form-navigate-gmap"
                  href={formGoogleMapLink ? formGoogleMapLink : `https://www.google.com/maps/dir/?api=1&destination=${formLat},${formLng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3 px-4 rounded-xl transition shadow text-center cursor-pointer"
                >
                  <Navigation size={14} />
                  <span>ปุ่มนำทาง (Google Map)</span>
                </a>
              </div>
            )}

            {/* Add Google Maps Link input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                กรอก Link GoogleMap
              </label>
              <input 
                id="mob-input-google-map-link"
                type="url" 
                value={formGoogleMapLink}
                onChange={(e) => setFormGoogleMapLink(e.target.value)}
                placeholder="เช่น https://goo.gl/maps/..." 
                className="w-full text-sm px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-white placeholder-slate-650"
              />
            </div>

            {/* Thailand Specific Address Information Grid (Soi, Moo, Tambon, Amphoe) FOR MOBILE */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 space-y-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block border-b border-slate-800 pb-2">ข้อมูลที่อยู่สอดคล้องประเทศไทย</span>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-300">ชื่อซอย (Soi)</label>
                  <input 
                    id="mob-input-soi"
                    type="text"
                    value={formSoi}
                    onChange={(e) => setFormSoi(e.target.value)}
                    placeholder="เช่น ซอยมิตรไมตรี" 
                    className="w-full text-xs px-3 py-2 bg-slate-950 border border-slate-800/85 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF6B00] text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-300">หมู่ที่ (Moo)</label>
                  <input 
                    id="mob-input-moo"
                    type="text"
                    value={formMoo}
                    onChange={(e) => setFormMoo(e.target.value)}
                    placeholder="เช่น หมู่ 3" 
                    className="w-full text-xs px-3 py-2 bg-slate-955 border border-slate-800/85 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF6B00] text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-300">ตำบล/แขวง (Tambon)</label>
                  <select 
                    id="mob-input-tambon"
                    value={formTambon}
                    onChange={(e) => setFormTambon(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-slate-950 border border-slate-800/85 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF6B00] text-white appearance-none cursor-pointer"
                  >
                    <option value="">-- เลือกตำบล/แขวง --</option>
                    <option value="บางเลน">บางเลน</option>
                    <option value="บางใหญ่">บางใหญ่</option>
                    <option value="บางม่วง">บางม่วง</option>
                    <option value="เสาธงหิน">เสาธงหิน</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-300">เขต/อำเภอ (Amphoe)</label>
                  <input 
                    id="mob-input-amphoe"
                    type="text"
                    value={formAmphoe}
                    onChange={(e) => setFormAmphoe(e.target.value)}
                    placeholder="เช่น เขตพญาไท" 
                    className="w-full text-xs px-3 py-2 bg-slate-950 border border-slate-800/85 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF6B00] text-white"
                  />
                </div>
              </div>
            </div>

            {/* Description note */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                รายละเอียดบันทึกโน้ต
              </label>
              <textarea 
                id="mob-input-notes"
                rows={3}
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="เพิ่มโน้ตรายละเอียดต่างๆ วันเที่ยว เครื่องดื่มที่ชื่นชอบ..." 
                className="w-full text-sm px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed text-white placeholder-slate-650"
              />
            </div>

            {/* Save Form Buttons */}
            <div className="flex gap-3 pt-4 border-t border-slate-800 mt-6 pb-12">
              <button 
                id="mob-btn-save"
                type="submit" 
                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm py-3 px-4 rounded-xl shadow-lg shadow-blue-500/20 transition cursor-pointer"
              >
                <Save size={16} />
                <span>บันทึกตำแหน่งพิกัดนี้</span>
              </button>
              <button 
                id="mob-btn-cancel"
                type="button" 
                onClick={handleCancelForm}
                className="bg-slate-900 border border-slate-800 hover:bg-slate-850 text-slate-300 font-bold text-sm py-3 px-6 rounded-xl transition cursor-pointer"
              >
                ยกเลิก
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 3. "คิววันนี้" Today's Agenda Modal (Sleek dark themed mobile-style tab) */}
      {showQueueModal && (
        <div id="queue-modal-overlay" className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-[1100] animate-fadeIn">
          <div className="bg-[#16171C] border border-slate-800 rounded-[28px] max-w-lg w-full overflow-hidden shadow-2xl flex flex-col p-6 text-[#D8DADF]">
            
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-2xl select-none">📦</span>
                <div>
                  <h3 className="text-base font-bold text-white">คิววันนี้ (วันนี้ต้องทำอะไร)</h3>
                  <p className="text-[11px] text-[#515560]">รายการพิกัดท่องเที่ยว/งานที่ยังไม่ได้เข้าไปเช็กอิน</p>
                </div>
              </div>
              <button 
                id="btn-close-queue"
                onClick={() => setShowQueueModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* List agenda items */}
            <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
              {queueLocations.length === 0 ? (
                <div className="text-center py-10">
                  <span className="text-4xl block mb-2 opacity-60">🎉</span>
                  <p className="text-xs font-bold text-emerald-400">สุดยอด! มีการใส่ข้อมูล Link ครบถ้วนทุกจุดแล้ว</p>
                  <p className="text-[11px] text-[#515560] mt-1">ไม่มีพิกัดที่ขาดตกข้อมูลลนส์แผ่นที่อีกต่อไป</p>
                </div>
              ) : (
                queueLocations.map(loc => (
                  <div 
                    key={loc.id} 
                    className="flex items-start justify-between p-3 bg-[#1F2128] border border-slate-800 rounded-xl hover:border-slate-700 transition"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-sm shrink-0">{getCategoryEmoji(loc.category)}</span>
                        <span className="text-[10px] text-blue-400 font-mono">{loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}</span>
                      </div>
                      <h4 className="text-xs font-bold text-white truncate">{loc.name}</h4>
                      <p className="text-[10px] text-slate-400 italic line-clamp-1 mt-0.5">
                        {loc.notes || 'ยังไม่มีบันทึกโน้ตย่อย...'}
                      </p>
                    </div>

                    <div className="ml-3 flex items-center gap-2">
                      <button
                        id={`queue-check-${loc.id}`}
                        onClick={() => {
                          setShowQueueModal(false);
                          setActiveLocationId(loc.id);
                          handleStartEdit(loc);
                        }}
                        className="flex items-center gap-1 text-[10px] font-bold bg-[#FF6B00]/10 text-[#FF6B00] hover:bg-[#FF6B00] hover:text-white px-2 py-1 rounded-lg border border-[#FF6B00]/20 transition cursor-pointer shrink-0"
                      >
                        <Edit3 size={11} />
                        <span>ใส่ลิ้งค์</span>
                      </button>

                      <button
                        id={`queue-fly-${loc.id}`}
                        onClick={() => {
                          setShowQueueModal(false);
                          setCurrentView('map');
                          setActiveLocationId(loc.id);
                          handleMapFocus(loc.lat, loc.lng, 15);
                        }}
                        className="bg-slate-800 hover:bg-slate-750 p-1.5 rounded-lg text-slate-300 transition cursor-pointer"
                        title="บินไปพิกัดนี้บนแผนที่"
                      >
                        <ChevronRight size={12} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-5 pt-3 border-t border-slate-800 flex justify-end gap-2">
              <button
                id="btn-close-queue-done"
                onClick={() => setShowQueueModal(false)}
                className="w-full text-xs bg-slate-800 hover:bg-slate-750 text-white font-bold py-2 rounded-xl transition cursor-pointer"
              >
                ปิดหน้านี้
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 4. "สรุปงาน" Stats Modal (Elegant Bento stats layout with visual HTML graphs) */}
      {showStatsModal && (
        <div id="stats-modal-overlay" className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-[1100] animate-fadeIn">
          <div className="bg-[#111215] border border-slate-800 rounded-[28px] max-w-xl w-full overflow-hidden shadow-2xl flex flex-col p-6 text-[#D8DADF]">
            
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-2xl select-none font-bold text-indigo-400">📊</span>
                <div>
                  <h3 className="text-base font-bold text-white">รายงานสรุปงานและสถิติพิกัด</h3>
                  <p className="text-[11px] text-[#515560]">บทวิเคราะห์อัตราการเข้าเช็กอินและประเภทที่บันทึก</p>
                </div>
              </div>
              <button 
                id="btn-close-stats"
                onClick={() => setShowStatsModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* BENTO STATISTICS GRID */}
            <div className="grid grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
              
              {/* Bento Card 1: Total Locations */}
              <div className="p-4 bg-[#1A1C22]/60 border border-slate-800 rounded-2xl flex flex-col justify-between">
                <span className="text-[10px] font-bold text-[#515560] uppercase tracking-wider block">พิกัดจัดเก็บทั้งหมด</span>
                <span className="text-3xl font-extrabold text-white mt-2 block font-sans">{statsSummary.total} <span className="text-xs text-slate-400 font-normal">ตำแหน่ง</span></span>
                <span className="text-[10px] text-indigo-400 block mt-1.5">★ เฉลี่ย {statsSummary.avgRating} ดาว</span>
              </div>

              {/* Bento Card 2: Check-In Rate */}
              <div className="p-4 bg-[#1A1C22]/60 border border-slate-800 rounded-2xl flex flex-col justify-between">
                <span className="text-[10px] font-bold text-[#515560] uppercase tracking-wider block">อัตราเช็กอินท่องเที่ยว</span>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-3xl font-extrabold text-emerald-400 block font-sans">{statsSummary.visitedPercentage}%</span>
                  <div className="flex-1 bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-emerald-400 h-full rounded-full" style={{ width: `${statsSummary.visitedPercentage}%` }}></div>
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 block mt-1.5">ไปแล้ว {statsSummary.visitedCount} จุด / ค้าง {statsSummary.pendingCount} จุด</span>
              </div>

              {/* Bento Card 3: Categories Breakdown list (Visual SVG bar charts) */}
              <div className="p-4 bg-[#1A1C22]/60 border border-slate-800 rounded-2xl col-span-2 space-y-2.5">
                <span className="text-[10px] font-bold text-[#515560] uppercase tracking-wider block">จำแนกตามประเภทปักหมุด</span>
                
                <div className="space-y-1.5">
                  {[
                    { label: '🏕️ ท่องเที่ยว (Travel)', value: statsSummary.categoriesCount.Travel, color: 'bg-emerald-500' },
                    { label: '🍔 ของอร่อย / คาเฟ่ (Food)', value: statsSummary.categoriesCount.Food, color: 'bg-rose-500' },
                    { label: '💼 ที่ทำงาน (Work)', value: statsSummary.categoriesCount.Work, color: 'bg-blue-500' },
                    { label: '🏠 ที่พักอาศัย (Home)', value: statsSummary.categoriesCount.Home, color: 'bg-amber-500' },
                    { label: '📍 อื่นๆ (Custom)', value: statsSummary.categoriesCount.Custom, color: 'bg-purple-500' },
                  ].map((categoryItem, i) => {
                    const pct = statsSummary.total > 0 ? Math.round((categoryItem.value / statsSummary.total) * 100) : 0;
                    return (
                      <div key={i} className="text-xs">
                        <div className="flex items-center justify-between text-[11px] mb-0.5">
                          <span className="text-[#9BA1B0] font-semibold">{categoryItem.label}</span>
                          <span className="text-white font-mono font-bold">{categoryItem.value} จุด ({pct}%)</span>
                        </div>
                        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div className={`h-full ${categoryItem.color} rounded-full`} style={{ width: `${pct}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            <div className="mt-5 pt-3 border-t border-slate-800 flex justify-end gap-2">
              <button
                id="btn-close-stats-done"
                onClick={() => setShowStatsModal(false)}
                className="w-full text-xs bg-slate-800 hover:bg-slate-750 text-white font-bold py-2.5 rounded-xl transition cursor-pointer"
              >
                ปิดหน้ารายงาน
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 5. Settings / File backup Manager Modal (Invoked from dashboard gear icon button) */}
      {showSettingsModal && (
        <div id="settings-modal-overlay" className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-[1100] animate-fadeIn">
          <div className="bg-[#16171D] border border-slate-800 rounded-[28px] max-w-md w-full overflow-hidden shadow-2xl flex flex-col p-6 text-[#D8DADF]">
            
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Settings size={20} className="text-[#FF6B00]" />
                <div>
                  <h3 className="text-base font-bold text-white">การควบคุมและสำรองพิกัด</h3>
                  <p className="text-[11px] text-[#515560]">จัดระเบียบข้อมูลแผนที่ ส่งออก หรือกู้คืนระบบตัวอย่าง</p>
                </div>
              </div>
              <button 
                id="btn-close-settings"
                onClick={() => setShowSettingsModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 py-2 text-xs">
              
              {/* Backups section */}
              <div className="space-y-2">
                <h4 className="text-[#9BA1B0] font-bold text-[10px] uppercase tracking-wider">สำรองและส่งออกข้อมูลพิกัด (Backup JSON)</h4>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  ดาวน์โหลดไฟล์ระบบ `JSON` เก็บพิกัดสถานที่สะสมของคุณไว้เพื่อนำเข้าในเบราว์เซอร์อื่นได้อย่างสมบูรณ์
                </p>
                <div className="flex gap-2">
                  <button 
                    id="settings-btn-export"
                    onClick={() => {
                      handleExportData();
                      setShowSettingsModal(false);
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl border border-slate-700 transition font-bold text-[11px] cursor-pointer"
                  >
                    <Download size={13} />
                    <span>ส่งออกพิกัด (JSON)</span>
                  </button>
                </div>
              </div>

              {/* Restore section */}
              <div className="space-y-2 pt-2 border-t border-slate-850">
                <h4 className="text-[#9BA1B0] font-bold text-[10px] uppercase tracking-wider">นำข้อมูลสำรวจเข้ามาติดตั้ง (Import JSON)</h4>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  นำไฟล์ข้อมูลที่มีรูปแบบอาเรย์พิกัดถูกต้องเข้ามาผสานรวมกับพิกัดดั่งเดิมที่จัดเตรียมไว้ได้เลย
                </p>
                
                <label className="flex items-center justify-center gap-2 py-2 px-3 bg-[#FF6B00]/10 hover:bg-[#FF6B00]/25 text-[#FF6B00] border border-[#FF6B00]/30 rounded-xl transition font-bold text-[11px] cursor-pointer">
                  <Upload size={13} />
                  <span>กอบกู้ / นำเข้าไฟล์ (JSON)</span>
                  <input 
                    type="file" 
                    accept=".json" 
                    onChange={(e) => {
                      handleImportData(e);
                      setShowSettingsModal(false);
                    }} 
                    className="hidden" 
                  />
                </label>
              </div>

              {/* Hard reset block */}
              <div className="space-y-2 pt-3 border-t border-slate-850">
                <h4 className="text-rose-450 font-bold text-[10px] uppercase tracking-wider">มาตรการฟื้นคืนค่าระบบ (System Reset)</h4>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  สิ่งนี้จะลบทุกลายปักพิกัดปัจจุบันของคุณ แล้วแทนที่ด้วย <strong>"5 แลนด์มาร์กสำคัญของประเทศไทย"</strong> ยอดนิยมเริ่มต้น
                </p>
                <button 
                  id="settings-btn-reset"
                  onClick={handleResetToDefaults}
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-rose-950/40 hover:bg-rose-900 border border-rose-800/80 text-rose-200 rounded-xl transition text-[11px] font-bold cursor-pointer"
                >
                  <RotateCcw size={13} />
                  <span>ล้างตำแหน่ง และติดตั้งไทยแลนด์สเปกเริ่มต้น</span>
                </button>
              </div>

            </div>

            <div className="mt-5 pt-3 border-t border-slate-805 flex justify-end gap-2">
              <button
                id="btn-close-settings-done"
                onClick={() => setShowSettingsModal(false)}
                className="w-full text-xs bg-slate-850 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl transition cursor-pointer"
              >
                ปิดหน้าต่างควบคุม
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 6. Save Confirmation Modal (Thai translation: ยืนยันการบันทึกข้อมูล) */}
      {showSaveConfirmModal && (
        <div id="save-confirm-modal-overlay" className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-[1300] animate-fadeIn">
          <div className="bg-[#111218] border border-[#10B981]/30 rounded-[24px] max-w-sm w-full p-6 text-[#D8DADF] shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
            
            <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <span className="text-xl">✨</span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  {isEditing ? 'ยืนยันการบันทึกการแก้ไข' : 'ยืนยันบันทึกพิกัดใหม่'}
                </h3>
                <p className="text-[10px] text-[#9BA1B0]">โปรดตรวจสอบความถูกต้องของข้อมูลพิกัดภูมิศาสตร์ไทย</p>
              </div>
            </div>

            <div className="space-y-3 text-xs py-2">
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">ชื่อตำแหน่งข้อมูล:</span>
                <span className="text-emerald-400 font-bold text-xs">{formName || 'หมุดพิกัดจัดเก็บใหม่'}</span>
              </div>
              
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/40">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">ละติจูด (Lat):</span>
                  <span className="font-mono text-slate-200 text-xs">{parseFloat(String(formLat)).toFixed(5)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">ลองจิจูด (Lng):</span>
                  <span className="font-mono text-slate-200 text-xs">{parseFloat(String(formLng)).toFixed(5)}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/40">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">ที่อยู่พิกัดไทย:</span>
                {formSoi || formMoo || formTambon || formAmphoe ? (
                  <span className="text-slate-300 leading-relaxed block text-xs bg-slate-900/50 p-2 rounded-lg border border-slate-800/60 mt-1">
                    {[
                      formSoi ? `ซอย${formSoi}` : '',
                      formMoo ? `หมู่ที่ ${formMoo}` : '',
                      formTambon ? `ตำบล/แขวง${formTambon}` : '',
                      formAmphoe ? `อำเภอ/เขต${formAmphoe}` : ''
                    ].filter(Boolean).join(' ')}
                  </span>
                ) : (
                  <span className="text-slate-500 italic text-[11px] block mt-0.5">ยังไม่ระบุรายละเอียดที่อยู่หลัก</span>
                )}
              </div>
            </div>

            <div className="flex gap-2.5 pt-3 border-t border-slate-800/30">
              <button
                id="btn-confirm-save-agree"
                type="button"
                onClick={() => executeSaveLocation(isEditing)}
                className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition duration-200 cursor-pointer text-center"
              >
                {isEditing ? 'บันทึกการแก้ไข' : 'บันทึกข้อมูลพิกัด'}
              </button>
              <button
                id="btn-confirm-save-cancel"
                type="button"
                onClick={() => setShowSaveConfirmModal(false)}
                className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-[#D8DADF] font-bold text-xs rounded-xl transition duration-200 cursor-pointer"
              >
                ย้อนกลับ
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
