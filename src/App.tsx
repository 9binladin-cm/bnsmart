import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  MapPin, Search, Plus, Trash2, Edit3, Save, X, Compass, Map as MapIcon, Download, Upload, RotateCcw, Star, Check, Navigation, MapPinned, Sparkles, Lock, Unlock, Info, Layers, Heart, ChevronRight, ChevronUp, ChevronDown, Copy, LayoutDashboard, ClipboardList, BarChart2, Settings, CalendarDays, Calendar, Activity, CheckCircle2, FileCheck2, AlertCircle, QrCode, Building2, Home, Users, Clock, Share2, Eye
} from 'lucide-react';
import QRCode from 'qrcode';
import { motion, AnimatePresence } from 'motion/react';
import { BookmarkLocation } from './types';
import { TableView } from './components/TableView';
import { LocationProvider } from './components/LocationContext';
import { useNearbyLocations } from './hooks/useNearbyLocations';
import { useLocationContext } from './components/LocationContext';
import { SplashScreen } from './components/SplashScreen';
import { db, isFirebaseConfigured, collection, setDoc, deleteDoc, doc, onSnapshot, addDoc, updateDoc, serverTimestamp } from './firebase';
import L from 'leaflet';
import 'leaflet.heat';
import { APIProvider, AdvancedMarker, Pin, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';

const API_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || '';
const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

const INITIAL_LANDMARKS = [];

const NONTHABURI_TAMBONS = [
  "เกาะเกร็ด", "ขุนศรี", "คลองขวาง", "คลองข่อย", "คลองเกลือ", "คลองพระอุดม",
  "ตลาดขวัญ", "ทวีวัฒนา", "ท่าทราย", "ท่าอิฐ", "บางกระสอ", "บางกร่าง",
  "บางกรวย", "บางขนุน", "บางขุนกอง", "บางคูรัด", "บางคูเวียง", "บางเขน",
  "บางตะไนย์", "บางตลาด", "บางบัวทอง", "บางพูด", "บางไผ่", "บางพลับ",
  "บางม่วง", "บางแม่นาง", "บางรักน้อย", "บางรักพัฒนา", "บางรักใหญ่", "บางเลน",
  "บางศรีเมือง", "บางสีทอง", "บางใหญ่", "บ้านใหม่", "ปากเกร็ด", "ปลายบาง",
  "พิมลราช", "มหาสวัสดิ์", "ราษฎร์นิยม", "ละหาร", "ลำโพ", "วัดชลอ",
  "ศาลากลาง", "สวนใหญ่", "เสาธงหิน", "โสนลอย", "หนองเพรางาย", "อ้อมเกร็ด",
  "ไทรน้อย", "ไทรใหญ่", "ไทรม้า"
].sort((a, b) => a.localeCompare(b, "th"));

const TILE_LAYERS = {
  streets: {
    name: 'แผนที่นำทาง (Voyager)',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; CARTO'
  },
  light: {
    name: 'สว่างมินิมอล (Positron)',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; CARTO'
  },
  dark: {
    name: 'ธีมมืดถนอมสายตา (Dark)',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; CARTO'
  },
  terrain: {
    name: 'ภูมิประเทศเชิงลึก (Topo)',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: 'Map data: OSM'
  }
};

const getCategorySvgString = (category) => {
  let innerPath = '';
  switch (category) {
    case 'Village': innerPath = '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>'; break;
    case 'Community': innerPath = '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'; break;
    case 'Office': innerPath = '<rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/>'; break;
    case 'Condo': innerPath = '<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/>'; break;
    default: innerPath = '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>'; 
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${innerPath}</svg>`;
};

const getCategoryEmoji = (category) => {
  switch (category) {
    case 'Village': return '🏠';
    case 'Community': return '👥';
    case 'Office': return '🏢';
    case 'Condo': return '🏙️';
    default: return '📍';
  }
};

const getOsmTileUrl = (lat: number, lng: number) => {
  try {
    const latRad = (lat * Math.PI) / 180;
    const n = Math.pow(2, 15); // zoom 15
    const xtile = Math.floor(((lng + 180) / 360) * n);
    const ytile = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
    return `https://tile.openstreetmap.org/15/${xtile}/${ytile}.png`;
  } catch (err) {
    return null;
  }
};

const StylizedMapPlaceholder = ({ emoji, category }: any) => {
  const markerColorsLocal: Record<string, string> = {
    Village: 'bg-emerald-500 text-white',
    Community: 'bg-indigo-500 text-white',
    Office: 'bg-teal-500 text-white',
    Condo: 'bg-orange-500 text-white',
  };
  const badgeColor = markerColorsLocal[category] || 'bg-blue-600 text-white';

  return (
    <div className="absolute inset-0 bg-slate-100 dark:bg-slate-800 flex flex-col items-center justify-center border border-dashed border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden pointer-events-none">
      <div className="relative w-full h-full flex items-center justify-center">
        {/* Simple map abstract grid lines */}
        <div className="absolute inset-0 grid grid-cols-4 grid-rows-4 opacity-[0.12] dark:opacity-[0.2]">
          <div className="border-r border-b border-slate-400 dark:border-slate-500"></div>
          <div className="border-r border-b border-slate-400 dark:border-slate-500"></div>
          <div className="border-r border-b border-slate-400 dark:border-slate-500"></div>
          <div className="border-b border-slate-400 dark:border-slate-500"></div>
          <div className="border-r border-b border-slate-400 dark:border-slate-500"></div>
          <div className="border-r border-b border-slate-400 dark:border-slate-500"></div>
          <div className="border-r border-b border-slate-400 dark:border-slate-500"></div>
          <div className="border-b border-slate-400 dark:border-slate-500"></div>
        </div>
        
        {/* Abstract road paths */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.25] text-slate-400 dark:text-slate-500" viewBox="0 0 100 100" preserveAspectRatio="none">
          <line x1="0" y1="30" x2="100" y2="70" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
          <line x1="40" y1="0" x2="60" y2="100" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
          <circle cx="50" cy="50" r="16" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="3,3" />
        </svg>

        {/* Minimal pins and glowing elements */}
        <div className="absolute w-2.5 h-2.5 bg-rose-500 rounded-full border border-white dark:border-slate-900 shadow-sm animate-pulse z-10 flex items-center justify-center">
          <span className="absolute w-5 h-5 bg-rose-500/30 rounded-full animate-ping"></span>
        </div>

        {/* Mini overlay category label */}
        <div className={`absolute bottom-0.5 right-0.5 px-0.5 rounded text-[8px] scale-90 ${badgeColor} shadow-md`}>
          {emoji}
        </div>
      </div>
    </div>
  );
};
const getDistanceString = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const distKm = calculateDistanceKm(lat1, lng1, lat2, lng2);
  if (distKm < 1) {
    return `${(distKm * 1000).toFixed(0)} ม.`;
  }
  return `${distKm.toFixed(2)} กม.`;
};

const getCategoryNameTh = (category) => {
  switch (category) {
    case 'Village': return 'หมู่บ้าน';
    case 'Community': return 'ชุมชน';
    case 'Office': return 'สำนักงาน';
    case 'Condo': return 'คอนโด';
    default: return 'ปักหมุดอื่นๆ';
  }
};

const calculateDistanceKm = (lat1, lng1, lat2, lng2) => {
  const R = 6371; 
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

import { animate } from "motion";

const playBeepAlert = () => { console.log("Beep!"); };


export default function App() {
  if (!hasValidKey) {
    return (
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',fontFamily:'sans-serif'}}>
        <div style={{textAlign:'center',maxWidth:520}}>
          <h2>Google Maps API Key Required</h2>
          <p><strong>Step 1:</strong> <a href="https://console.cloud.google.com/google/maps-apis/start?utm_campaign=gmp-code-assist-ais" target="_blank" rel="noopener">Get an API Key</a></p>
          <p><strong>Step 2:</strong> Add your key as a secret in AI Studio:</p>
          <ul style={{textAlign:'left',lineHeight:'1.8'}}>
            <li>Open <strong>Settings</strong> (⚙️ gear icon, <strong>top-right corner</strong>)</li>
            <li>Select <strong>Secrets</strong></li>
            <li>Type <code>GOOGLE_MAPS_PLATFORM_KEY</code> as the secret name, press <strong>Enter</strong></li>
            <li>Paste your API key as the value, press <strong>Enter</strong></li>
          </ul>
          <p>The app rebuilds automatically after you add the secret.</p>
        </div>
      </div>
    );
  }

  return (
    <APIProvider apiKey={API_KEY} version="weekly">
      <LocationProvider>
        <AppContent />
      </LocationProvider>
    </APIProvider>
  );
}

function AppContent() {
  const { userLocation, setUserLocation } = useLocationContext();
  const { nearbyLocations } = useNearbyLocations(userLocation);
  
  const [currentView, setCurrentView] = useState<'dashboard' | 'map' | 'table' | 'add-location' | 'edit-location' | 'queue-today' | 'pending-queue' | 'stats' | 'settings'>('dashboard');

  useEffect(() => {
    (window as any).setCurrentViewGlobal = setCurrentView;
    return () => {
      delete (window as any).setCurrentViewGlobal;
    };
  }, []);

  const [isMobile, setIsMobile] = useState(false);
  const [mobileActiveTab, setMobileActiveTab] = useState<'map' | 'list'>('map');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [mobileSheetState, setMobileSheetState] = useState<'collapsed' | 'peek' | 'expanded'>('peek');
  const touchYRef = useRef<number | null>(null);
  const [showSplash, setShowSplash] = useState(true);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchYRef.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchYRef.current === null) return;
    const currentY = e.touches[0].clientY;
    const diffY = touchYRef.current - currentY; // positive is swipe up, negative is swipe down

    if (Math.abs(diffY) > 35) { // threshold
      if (diffY > 0) {
        // swipe up
        setMobileSheetState(prev => {
          if (prev === 'collapsed') return 'peek';
          if (prev === 'peek') return 'expanded';
          return prev;
        });
      } else {
        // swipe down
        setMobileSheetState(prev => {
          if (prev === 'expanded') return 'peek';
          if (prev === 'peek') return 'collapsed';
          return prev;
        });
      }
      touchYRef.current = null; // reset to prevent multiple triggers in one gesture
    }
  };
  
  // Dialog / Overlays state
  const [showQueueModal, setShowQueueModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // 1. Core State for Bookmarks Data
  const [locations, setLocations] = useState<BookmarkLocation[]>(() => {
    try {
      const cached = localStorage.getItem('cached_landmarks_50');
      if (cached && cached !== 'undefined') {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Failed to load locations from localStorage cache:', e);
    }
    return [];
  });

  // State Declarations moved UP to avoid any TDZ ReferenceErrors
  const [isLocating, setIsLocating] = useState(false);
  const [showPlaylistTodayModal, setShowPlaylistTodayModal] = useState(false);
  const [isPlaylistPanelOpen, setIsPlaylistPanelOpen] = useState(false);
  const [playlistSearchQuery, setPlaylistSearchQuery] = useState('');
  const [isProximityAlertActive, setIsProximityAlertActive] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('is_proximity_alert_active');
      return saved !== 'false';
    } catch (e) {
      return true;
    }
  });

  // Derived filtered database locations for inline playlist search & add feature
  const matchingDbLocations = useMemo(() => {
    if (!playlistSearchQuery.trim()) return [];
    const q = playlistSearchQuery.toLowerCase();
    return locations
      .filter((loc) => {
        return (
          loc.name.toLowerCase().includes(q) ||
          (loc.tambon || '').toLowerCase().includes(q) ||
          (loc.moo || '').toLowerCase().includes(q) ||
          (loc.category || '').toLowerCase().includes(q) ||
          (loc.notes || '').toLowerCase().includes(q)
        );
      })
      .slice(0, 8); // Display top 8 results safely to prevent cluttered UI on Mobile First devices
  }, [locations, playlistSearchQuery]);

  // 📍 Route Planning State
  const [routePoints, setRoutePoints] = useState<BookmarkLocation[]>(() => {
    try {
      const cached = localStorage.getItem('today_playlist_route_points');
      if (cached && cached !== 'undefined') {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Failed to load playlist from localStorage:', e);
    }
    return [];
  });

  // Automatically sorted playlist locations based on current GPS proximity ASC
  const sortedPlaylistLocations = useMemo(() => {
    if (userLocation && userLocation.lat !== 0 && userLocation.lng !== 0) {
      return [...routePoints]
        .map(l => ({
          ...l,
          dist: calculateDistanceKm(userLocation.lat, userLocation.lng, l.lat || 0, l.lng || 0)
        }))
        .sort((a, b) => (a.dist || 0) - (b.dist || 0));
    }
    return routePoints;
  }, [routePoints, userLocation]);

  // Save isProximityAlertActive config
  useEffect(() => {
    localStorage.setItem('is_proximity_alert_active', String(isProximityAlertActive));
  }, [isProximityAlertActive]);

  // Save playlist to localStorage
  useEffect(() => {
    localStorage.setItem('today_playlist_route_points', JSON.stringify(routePoints));
  }, [routePoints]);

  const handleCheckIn = async (locId: string) => {
    const timestamp = Date.now();
    try {
      // 1. Update Firestore if possible (optional persistence helper)
      try {
        const locRef = doc(db, 'locations', locId);
        await updateDoc(locRef, { checkedInAt: timestamp });
      } catch (e) {
        console.warn('Firestore update skipped or failed:', e);
      }
      
      // 2. Update local routePoints
      setRoutePoints(prev => prev.map(p => p.id === locId ? { ...p, checkedInAt: timestamp } : p));
      
      showToast('เช็คอินสำเร็จ! 🎉', 'success');
      
      // 3. Suggest next house from the playlist
      const unchecked = sortedPlaylistLocations.filter(p => p.id !== locId && !p.checkedInAt);
      if (unchecked.length > 0) {
        const nextLoc = unchecked[0];
        setTimeout(() => {
          showToast(`เป้าหมายต่อไป: ${nextLoc.name}`, 'info');
          setActiveLocationId(nextLoc.id);
          handleMapFocus(nextLoc.lat, nextLoc.lng, 17);
        }, 1200);
      } else {
        showToast('คุณทำภารกิจในคิวครบทั้งหมดแล้ว! 🥳', 'success');
      }
    } catch (e) {
      console.error('Check-in failed:', e);
      showToast('เช็คอินไม่สำเร็จ กรุณาลองใหม่', 'error');
    }
  };

  const [searchQuery, setSearchQuery] = useState('');

  // 📍 Proximity Alert Logic: Alert user with sound and center focus when near the next unchecked playlist point
  const lastAlertedId = useRef<string | null>(null);
  useEffect(() => {
    if (!isProximityAlertActive || !userLocation || !sortedPlaylistLocations.length || userLocation.lat === 0) return;
    
    // Find the first unchecked location in sorted list
    const nearestUnchecked = sortedPlaylistLocations.find(loc => !loc.checkedInAt);
    if (!nearestUnchecked) return;
    
    const distKm = calculateDistanceKm(userLocation.lat, userLocation.lng, nearestUnchecked.lat, nearestUnchecked.lng);
    const distMeters = distKm * 1000;
    
    // If within 150 meters and haven't alerted for this location recently
    if (distMeters < 150 && lastAlertedId.current !== nearestUnchecked.id) {
      playBeepAlert(); // Play the gorgeous high-fidelity double beep
      showToast(`📍 แนะนำจุดถัดไป: ${nearestUnchecked.name} (ห่างอีก ${Math.round(distMeters / 10) * 10} ม.)`, 'success');
      lastAlertedId.current = nearestUnchecked.id;
      
      // Focus on the location
      setActiveLocationId(nearestUnchecked.id);
      handleMapFocus(nearestUnchecked.lat, nearestUnchecked.lng, 17);
    }
  }, [userLocation, sortedPlaylistLocations, isProximityAlertActive]);

  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [tambonFilter, setTambonFilter] = useState<string>('All');
  const [mooFilter, setMooFilter] = useState<string>('All');
  const [lockTambonFilter, setLockTambonFilter] = useState<boolean>(false);
  const [lockMooFilter, setLockMooFilter] = useState<boolean>(false);
  const [sortMode, setSortMode] = useState<'date' | 'name' | 'distance' | 'recentlyVisited'>('date');
  const [activeLocationId, setActiveLocationId] = useState<string | null>(null);
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);

  // Map settings state
  const [tileStyle, setTileStyle] = useState<keyof typeof TILE_LAYERS>('streets'); // default street map
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  // Auto Theme Detection Effect to automatically update tileStyle and UI mode upon application load
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleThemeChange = (e: MediaQueryListEvent | MediaQueryList) => {
        const preferredDark = e.matches;
        setIsDarkMode(preferredDark);
        setTileStyle(preferredDark ? 'dark' : 'streets');
        
        // Update document element class list to propagate dark mode status down the tree
        if (preferredDark) {
          document.documentElement.classList.add('dark');
          document.body.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
          document.body.classList.remove('dark');
        }
      };

      // Run initial check and set states
      handleThemeChange(mediaQuery);

      // Register live listeners
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleThemeChange);
        return () => mediaQuery.removeEventListener('change', handleThemeChange);
      } else if ((mediaQuery as any).addListener) {
        (mediaQuery as any).addListener(handleThemeChange);
        return () => (mediaQuery as any).removeListener(handleThemeChange);
      }
    }
  }, []);

  const notifiedLocationsRef = useRef<Set<string>>(new Set());
  const notificationPermissionRef = useRef<NotificationPermission | null>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : null
  );

  const [routePolyline, setRoutePolyline] = useState<[number, number][] | null>(null);
  const [routeDistance, setRouteDistance] = useState<number | null>(null);
  const [routeDuration, setRouteDuration] = useState<number | null>(null);
  const [isRouteMode, setIsRouteMode] = useState(false);
  const routeLayerRef = useRef<L.Polyline | null>(null);

  // GIS Ruler status and map viewport tracking
  const [mapCenter, setMapCenter] = useState<{lat: number, lng: number}>({lat: 13.7563, lng: 100.5018});
  const [mapZoom, setMapZoom] = useState<number>(7);
  const [isRulerMode, setIsRulerMode] = useState<boolean>(false);
  const [rulerPoints, setRulerPoints] = useState<[number, number][]>([]);
  const [measuredDistance, setMeasuredDistance] = useState<number | null>(null);

  const [isAreaMode, setIsAreaMode] = useState<boolean>(false);
  const [areaPoints, setAreaPoints] = useState<[number, number][]>([]);
  const [measuredAreaSqM, setMeasuredAreaSqM] = useState<number | null>(null);

  const isRulerModeRef = useRef(false);
  const rulerPointsRef = useRef<[number, number][]>([]);
  const rulerTempLayersRef = useRef<any[]>([]);

  const isAreaModeRef = useRef(false);
  const areaPointsRef = useRef<[number, number][]>([]);
  const areaTempLayersRef = useRef<any[]>([]);

  // Toggle Ruler Mode
  const toggleRulerMode = () => {
    const nextVal = !isRulerMode;
    setIsRulerMode(nextVal);
    isRulerModeRef.current = nextVal;
    
    if (nextVal) {
      if (isAreaMode) toggleAreaMode(); // Close area mode
      showToast('📐 โหมดวัดระยะทางตรงเปิดใช้งานแล้ว คลิกที่แผนที่เพื่อปักจุดวัดระยะ!', 'info');
    } else {
      clearRuler();
    }
  };

  // Toggle Area Mode
  const toggleAreaMode = () => {
    const nextVal = !isAreaMode;
    setIsAreaMode(nextVal);
    isAreaModeRef.current = nextVal;
    
    if (nextVal) {
      if (isRulerMode) toggleRulerMode(); // Close ruler mode
      showToast('📐 โหมดวัดพื้นที่ใช้งานแล้ว คลิกวาดรูปหลายเหลี่ยมลงบนแผนที่!', 'info');
    } else {
      clearArea();
    }
  };

  // Clear Ruler graphics
  const clearRuler = () => {
    if (mapInstanceRef.current) {
      rulerTempLayersRef.current.forEach(layer => {
        try {
          layer.remove();
        } catch (e) {
          // ignore
        }
      });
    }
    rulerTempLayersRef.current = [];
    rulerPointsRef.current = [];
    setRulerPoints([]);
    setMeasuredDistance(null);
  };

  // Clear Area graphics
  const clearArea = () => {
    if (mapInstanceRef.current) {
      areaTempLayersRef.current.forEach(layer => {
        try {
          layer.remove();
        } catch (e) {
          // ignore
        }
      });
    }
    areaTempLayersRef.current = [];
    areaPointsRef.current = [];
    setAreaPoints([]);
    setMeasuredAreaSqM(null);
  };

  // Helper inside click handlers to add ruler points dynamically
  const addRulerPoint = (lat: number, lng: number, mapInstance: L.Map) => {
    const nextPoints = [...rulerPointsRef.current, [lat, lng] as [number, number]];
    rulerPointsRef.current = nextPoints;
    setRulerPoints(nextPoints);

    // Dynamic Leaflet drawing
    const dot = L.circle([lat, lng], {
      radius: 50 * Math.max(1, 20 - mapInstance.getZoom()), // adaptive radius based on scale
      color: '#f59e0b',
      fillColor: '#fbbf24',
      fillOpacity: 0.9,
      weight: 3
    }).addTo(mapInstance);
    rulerTempLayersRef.current.push(dot);

    if (nextPoints.length > 1) {
      const prev = nextPoints[nextPoints.length - 2];
      const line = L.polyline([prev, [lat, lng]], {
        color: '#f59e0b',
        weight: 3.5,
        dashArray: '6, 8',
        opacity: 0.95
      }).addTo(mapInstance);
      rulerTempLayersRef.current.push(line);

      let totalDist = 0;
      for (let i = 0; i < nextPoints.length - 1; i++) {
        totalDist += calculateDistanceKm(nextPoints[i][0], nextPoints[i][1], nextPoints[i+1][0], nextPoints[i+1][1]);
      }
      setMeasuredDistance(totalDist);

      const labelText = `📍 จุดที่ ${nextPoints.length} | รวม: ${totalDist.toFixed(3)} กม. (${(totalDist * 1000).toLocaleString('th-TH', { maximumFractionDigits: 0 })} ม.)`;
      const tooltip = L.tooltip({
        permanent: true,
        direction: 'top',
        className: 'bg-amber-500 text-white font-bold text-xs px-2 py-1.5 rounded-lg shadow-xl border border-amber-600 font-sans z-[1100]'
      })
      .setContent(labelText)
      .setLatLng([lat, lng])
      .addTo(mapInstance);
      rulerTempLayersRef.current.push(tooltip);
    } else {
      const tooltip = L.tooltip({
        permanent: true,
        direction: 'top',
        className: 'bg-indigo-600 text-white font-bold text-xs px-2 py-1.5 rounded-lg shadow-xl border border-indigo-700 font-sans z-[1100]'
      })
      .setContent('🏁 จุดเริ่มต้นรังวัด (Start)')
      .setLatLng([lat, lng])
      .addTo(mapInstance);
      rulerTempLayersRef.current.push(tooltip);
    }
  };

  const calculatePolygonAreaSqM = (points: [number, number][]) => {
    if (points.length < 3) return 0;
    let area = 0;
    const R = 6378137;
    for (let i = 0; i < points.length; i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % points.length];
      const lat1 = p1[0] * Math.PI / 180;
      const lng1 = p1[1] * Math.PI / 180;
      const lat2 = p2[0] * Math.PI / 180;
      const lng2 = p2[1] * Math.PI / 180;
      area += (lng2 - lng1) * (2 + Math.sin(lat1) + Math.sin(lat2));
    }
    return Math.abs(area * (R * R / 2.0));
  };

  const drawAreaGraphics = (mapInstance: L.Map) => {
    // Clear previous
    areaTempLayersRef.current.forEach(layer => {
      try { layer.remove(); } catch (e) {}
    });
    areaTempLayersRef.current = [];

    const pts = areaPointsRef.current;
    if (pts.length === 0) {
      setMeasuredAreaSqM(null);
      return;
    }

    // Draw dots for each point
    pts.forEach((pt, i) => {
      const dot = L.circle(pt, {
        radius: 50 * Math.max(1, 20 - mapInstance.getZoom()),
        color: '#8b5cf6',
        fillColor: '#a78bfa',
        fillOpacity: 0.9,
        weight: 3
      }).addTo(mapInstance);
      areaTempLayersRef.current.push(dot);

      if (i === 0) {
        const tooltip = L.tooltip({
          permanent: true,
          direction: 'top',
          className: 'bg-indigo-600 text-white font-bold text-xs px-2 py-1.5 rounded-lg shadow-xl border border-indigo-700 font-sans z-[1100]'
        })
        .setContent('🏁 จุดที่ 1')
        .setLatLng(pt)
        .addTo(mapInstance);
        areaTempLayersRef.current.push(tooltip);
      }
    });

    if (pts.length >= 2) {
      const isPolygon = pts.length > 2;
      const GraphicCode = isPolygon ? L.polygon : L.polyline;
      
      const shape = GraphicCode(pts, {
        color: '#8b5cf6',
        fillColor: isPolygon ? '#c084fc' : undefined,
        fillOpacity: isPolygon ? 0.4 : 0,
        weight: 3.5,
        dashArray: isPolygon ? undefined : '6, 8',
      }).addTo(mapInstance);
      
      areaTempLayersRef.current.push(shape);

      if (isPolygon) {
        const areaSqM = calculatePolygonAreaSqM(pts);
        setMeasuredAreaSqM(areaSqM);
        
        let labelText = `📐 พื้นที่: ${(areaSqM).toLocaleString('th-TH', { maximumFractionDigits: 0 })} ตร.ม.`;
        if (areaSqM > 1600) {
          const rai = Math.floor(areaSqM / 1600);
          const ngan = Math.floor((areaSqM % 1600) / 400);
          const sqw = Math.floor((areaSqM % 400) / 4);
          labelText += `\n(${rai} ไร่ ${ngan} งาน ${sqw} ตร.ว.)`;
        }
        
        const lastPt = pts[pts.length - 1];
        const tooltip = L.tooltip({
          permanent: true,
          direction: 'top',
          className: 'bg-purple-600 text-white font-bold text-[11px] px-2.5 py-1.5 rounded-lg shadow-xl border border-purple-700 font-sans z-[1100] whitespace-pre-wrap text-center leading-tight'
        })
        .setContent(labelText)
        .setLatLng(lastPt)
        .addTo(mapInstance);
        areaTempLayersRef.current.push(tooltip);
      } else {
        setMeasuredAreaSqM(null);
      }
    } else {
      setMeasuredAreaSqM(null);
    }
  };

  const addAreaPoint = (lat: number, lng: number, mapInstance: L.Map) => {
    areaPointsRef.current = [...areaPointsRef.current, [lat, lng] as [number, number]];
    setAreaPoints(areaPointsRef.current);
    drawAreaGraphics(mapInstance);
  };

  const undoAreaPoint = () => {
    if (areaPointsRef.current.length > 0) {
      areaPointsRef.current = areaPointsRef.current.slice(0, -1);
      setAreaPoints(areaPointsRef.current);
      if (mapInstanceRef.current) {
        drawAreaGraphics(mapInstanceRef.current);
      }
    }
  };

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
  const [formCoords, setFormCoords] = useState<string>('');
  const [formGoogleMapLink, setFormGoogleMapLink] = useState('');
  const [formSoi, setFormSoi] = useState('');
  const [formMoo, setFormMoo] = useState('');
  const [formTambon, setFormTambon] = useState('');
  const [formAmphoe, setFormAmphoe] = useState('');
  const [formHouseNumber, setFormHouseNumber] = useState('');

  // Automatically generate highly precise Google Maps coordinate link when formLat/formLng changes
  useEffect(() => {
    const plat = parseFloat(String(formLat));
    const plng = parseFloat(String(formLng));
    if (plat && plng && !isNaN(plat) && !isNaN(plng) && isFinite(plat) && isFinite(plng)) {
      setFormGoogleMapLink(`https://www.google.com/maps?q=${plat},${plng}`);
    }
  }, [formLat, formLng]);

  // 🔒 States สำหรับจดจำการล็อกฟิลด์ข้อมูล
  const [lockType, setLockType] = useState(false);
  const [lockSoi, setLockSoi] = useState(false);
  const [lockMoo, setLockMoo] = useState(false);
  const [lockTambon, setLockTambon] = useState(false);
  const [lockAmphoe, setLockAmphoe] = useState(false);
  const [lockHouseNumber, setLockHouseNumber] = useState(false);
  const [lockGps, setLockGps] = useState(false);

  // Sync GPS to Form if lockGps is active
  useEffect(() => {
    if (lockGps && userLocation && (isCreating || isEditing)) {
      setFormLat(userLocation.lat);
      setFormLng(userLocation.lng);
      fetchThaiAddressDetails(userLocation.lat, userLocation.lng);
    }
  }, [userLocation, lockGps, isCreating, isEditing]);

  // File imports state
  const [fileImportSuccess, setFileImportSuccess] = useState<string | null>(null);
  const [fileImportError, setFileImportError] = useState<string | null>(null);
  const [copiedCoords, setCopiedCoords] = useState<boolean>(false);

  // 🍞 Toast Notification System
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
  };

  // 🛡️ Form Stability Guard (Prevent accidental refresh)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isCreating || isEditing) {
        const message = 'คุณมีการกรอกข้อมูลลอยอยู่ การรีเฟรชหน้าจะทำให้ข้อมูลที่ยังไม่บันทึกหายไป ต้องการดำเนินการต่อหรือไม่?';
        e.preventDefault();
        e.returnValue = message;
        return message;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isCreating, isEditing]);

  // 📋 Robust Copy to Clipboard Helper
  const copyToClipboard = async (text: string, successMessage: string) => {
    try {
      // Try modern API first
      await navigator.clipboard.writeText(text);
      showToast(successMessage, 'success');
    } catch (err) {
      // Fallback for iframe constraints
      try {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        // Ensure it's not visible
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showToast(successMessage, 'success');
      } catch (fallbackErr) {
        showToast('ไม่สามารถคัดลอกข้อมูลได้', 'error');
        console.error('Copy failed:', fallbackErr);
      }
    }
  };

  const handleCopyLocation = async (loc: BookmarkLocation) => {
    const text = `📌 ${loc.name}\n📍 พิกัด: ${loc.lat}, ${loc.lng}\n🏠 ที่อยู่: ${loc.houseNumber ? `บ้านเลขที่ ${loc.houseNumber} ` : ''}${loc.moo ? `ม.${loc.moo} ` : ''}${loc.soi ? `ซ.${loc.soi} ` : ''}${loc.tambon || ''}\n📝 บันทึก: ${loc.notes || '-'}`;
    await copyToClipboard(text, 'คัดลอกรายละเอียดข้อมูลแล้ว');
  };

  // 🔗 Share entire Location Card beautifully
  const handleShareCard = async (loc: BookmarkLocation) => {
    const categoryName = getCategoryNameTh(loc.category);
    const categoryEmoji = getCategoryEmoji(loc.category);
    const mapLink = loc.googleMapLink || `https://www.google.com/maps?q=${loc.lat},${loc.lng}`;
    const addressDetails = [
      loc.houseNumber ? `บ้านเลขที่: ${loc.houseNumber}` : '',
      loc.soi ? `ซอย: ${loc.soi}` : '',
      loc.moo ? `หมู่: ${loc.moo}` : '',
      loc.tambon ? `ตำบล: ${loc.tambon}` : '',
      loc.amphoe ? `อำเภอ: ${loc.amphoe}` : ''
    ].filter(Boolean).join(' ');

    const shareText = `📌 [แชร์ข้อมูลพิกัดจัดเก็บ]
🏡 ชื่อสถานที่: ${loc.name}
📂 ประเภท: ${categoryEmoji} ${categoryName}
📍 พิกัด GPS: ${loc.lat.toFixed(6)}, ${loc.lng.toFixed(6)}
📮 ที่อยู่: ${addressDetails || 'ไม่ได้ระบุ'}
📝 บันทึกเพิ่มเติม: ${loc.notes || 'ไม่มี'}
🌐 ลิงก์แผนที่นำทาง: ${mapLink}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `แชร์พิกัด: ${loc.name}`,
          text: shareText,
          url: mapLink,
        });
        showToast('แชร์ข้อมูลพิกัดเรียบร้อยแล้ว!', 'success');
      } catch (err) {
        // user clicked cancel or it failed
        await copyToClipboard(shareText, 'คัดลอกข้อมูลการ์ดพิกัดไปยังคลิปบอร์ดแล้ว!');
      }
    } else {
      await copyToClipboard(shareText, 'คัดลอกข้อมูลการ์ดพิกัดไปยังคลิปบอร์ดแล้ว!');
    }
  };

  // QR Code generator state
  const [activeQrCodeUrl, setActiveQrCodeUrl] = useState<string | null>(null);
  const [showActiveQr, setShowActiveQr] = useState<boolean>(false);

  // Edit/Save Confirmation states
  const [showSaveConfirmModal, setShowSaveConfirmModal] = useState<boolean>(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // 3. Leaflet Ref Holders
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  
  // Custom layer groups for dynamic loading without rebuilding map
  const markersLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const heatmapLayerRef = useRef<any | null>(null);
  const tempMarkerRef = useRef<L.Marker | null>(null);
  const userLocationMarkerRef = useRef<L.Marker | null>(null);
  const plottedMarkersRef = useRef<Record<string, L.Marker>>({});
  const watchIdRef = useRef<number | null>(null);

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
        const plat = parseFloat(String(latRaw));
        const plng = parseFloat(String(lngRaw));
        
        if (isNaN(plat) || isNaN(plng) || !isFinite(plat) || !isFinite(plng)) {
          console.error('CRITICAL: Skipping marker with invalid coordinates:', docSnap.id, latRaw, lngRaw);
          return;
        }

        let latVal = plat;
        let lngVal = plng;

        list.push({
          id: docSnap.id,
          name: data.name || '',
          lat: latVal,
          lng: lngVal,
          category: categoryVal,
          notes: data.note || '',
          houseNumber: data.address?.houseNumber || '',
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

      // Cache the last 50 loaded locations to localStorage for offline access
      try {
        const top50 = list.slice(0, 50);
        localStorage.setItem('cached_landmarks_50', JSON.stringify(top50));
      } catch (e) {
        console.warn('Failed to cache top 50 landmarks to localStorage:', e);
      }
    }, (error) => {
      console.error('Firestore real-time sync failed:', error);
    });

    return () => unsubscribe();
  }, []);

  // 4c. Real-time location watch cleanup & Auto-start on mount
  useEffect(() => {
    // Automatically try to get GPS on mount to satisfy "access current position real-time automatically every time"
    handleGetMyGPS();
    
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
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

  // Helper for filter options
  const uniqueTambons = useMemo(() => {
    const list = locations.map(l => l.tambon).filter(Boolean);
    return Array.from(new Set(list)).sort((a, b) => (a as string).localeCompare(b as string, 'th'));
  }, [locations]);

  const uniqueMoos = useMemo(() => {
    const list = locations.map(l => l.moo).filter(Boolean);
    return Array.from(new Set(list)).sort((a, b) => (a as string).localeCompare(b as string, 'th', { numeric: true }));
  }, [locations]);

  // 5. Filter and Sort Locations list
  const filteredLocations = useMemo(() => {
    const filtered = locations.filter(loc => {
      const q = searchQuery.toLowerCase().trim();
      
      const matchCategory = categoryFilter === 'All' || loc.category === categoryFilter;
      const matchTambon = tambonFilter === 'All' || loc.tambon === tambonFilter;
      const matchMoo = mooFilter === 'All' || loc.moo === mooFilter;

      if (!q) {
        return matchCategory && matchTambon && matchMoo;
      }

      // Perform address search combining Thailand address sub-fields, name, and notes, completely ignoring pin lat/lng coordinates
      const addressString = [
        loc.houseNumber || '',
        loc.soi || '',
        loc.moo || '',
        loc.tambon || '',
        loc.amphoe || '',
        loc.notes || '',
        loc.name || ''
      ].join(' ').toLowerCase();

      const matchSearch = addressString.includes(q);
      return matchSearch && matchCategory && matchTambon && matchMoo;
    });

    return filtered.sort((a, b) => {
      if (sortMode === 'name') {
        return a.name.localeCompare(b.name, 'th');
      }
      if (sortMode === 'distance') {
        if (!userLocation) return 0; // Fallback to original order if no GPS
        const distA = calculateDistanceKm(userLocation.lat, userLocation.lng, a.lat, a.lng);
        const distB = calculateDistanceKm(userLocation.lat, userLocation.lng, b.lat, b.lng);
        return distA - distB;
      }
      if (sortMode === 'recentlyVisited') {
        const timeA = a.checkedInAt || 0;
        const timeB = b.checkedInAt || 0;
        return timeB - timeA; // Descending order (newest first)
      }
      // sortMode === 'date' (Default, assuming Firebase returns them ordered, or we use string comparison on id if no createdAt exists)
      // Actually reversing gives newest first visually if appending
      return 0; // Or write logic if createdAt is available, keeping 0 to maintain firestore order
    });
  }, [locations, searchQuery, categoryFilter, tambonFilter, mooFilter, sortMode, userLocation]);

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
    const initialCenter: L.LatLngExpression = [13.7563, 100.5018];
    const initialZoom = 7;

    try {
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

      // Custom Zoom controls (disabled to favor premium Tailwind zoom controls)

      // Add visual scale / ruler tool displaying current zoom scale in meters or kilometers
      L.control.scale({
        position: 'bottomleft',
        metric: true,
        imperial: false
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

      // Track center and zoom changes for real-time Premium GUI HUD
      leafletMap.on('moveend', () => {
        const center = leafletMap.getCenter();
        setMapCenter({
          lat: parseFloat(center.lat.toFixed(6)),
          lng: parseFloat(center.lng.toFixed(6))
        });
      });

      leafletMap.on('zoomend', () => {
        setMapZoom(leafletMap.getZoom());
      });

      // Setup map click event to grab coordinates visually
      leafletMap.on('click', async (e: L.LeafletMouseEvent) => {
        if (!e || !e.latlng) return;
        
        const plat = parseFloat(String(e.latlng.lat));
        const plng = parseFloat(String(e.latlng.lng));
        
        if (isNaN(plat) || isNaN(plng)) return;
        
        const clickedLat = parseFloat(plat.toFixed(6));
        const clickedLng = parseFloat(plng.toFixed(6));

        // Check if map measurement rulers are active
        if (isRulerModeRef.current) {
          addRulerPoint(clickedLat, clickedLng, leafletMap);
          return;
        }

        if (isAreaModeRef.current) {
          addAreaPoint(clickedLat, clickedLng, leafletMap);
          return;
        }
        
        if (!isNaN(clickedLat) && !isNaN(clickedLng)) {
          setSelectedMapPoint({ lat: clickedLat, lng: clickedLng });
        }
        setIsCreating(true);
        setIsEditing(false);
        
        // Pre-fill form fields
        setFormName('หมุดพิกัดจัดเก็บใหม่');
        setFormLat(clickedLat);
        setFormLng(clickedLng);
        setFormCoords(`${clickedLat}, ${clickedLng}`);
        if (!lockType) setFormCategory('Village');
        setFormNotes('');
        setFormGoogleMapLink(`https://www.google.com/maps?q=${clickedLat},${clickedLng}`);
        if (!lockHouseNumber) setFormHouseNumber('');
        if (!lockSoi) setFormSoi('');
        if (!lockMoo) setFormMoo('');
        if (!lockTambon) setFormTambon('');
        if (!lockAmphoe) setFormAmphoe('');

        // Auto-trigger reverse geocoding on click
        fetchThaiAddressDetails(clickedLat, clickedLng);

        // Redirect to fullscreen creation page
        if ((window as any).setCurrentViewGlobal) {
          (window as any).setCurrentViewGlobal('add-location');
        }
      });
    } catch (err) {
      console.error('Leaflet initialization failed:', err);
    }

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
  const createCustomMarkerHtml = (loc: BookmarkLocation, isActive: boolean) => {
    const bgColors: Record<string, string> = {
      Village: '#10B981', // Emerald
      Community: '#3B82F6', // Blue
      Office: '#F43F5E', // Rose
      Condo: '#F59E0B', // Amber
    };

    const color = bgColors[loc.category] || '#EF4444';
    const scaleClass = isActive ? 'scale-125 z-[9999]' : 'scale-100 hover:scale-110';

    // Dynamic Label text: Extract House Number or Use Moo
    const labelText = (() => {
      const houseNumMatch = loc.name.match(/\d+([\/\-]\d+)?/);
      const houseNum = houseNumMatch ? houseNumMatch[0] : '';
      
      if (mooFilter !== 'All') {
        return houseNum || loc.name.substring(0, 6);
      } else {
        if (loc.moo) {
          return `${loc.moo}${houseNum ? `/${houseNum}` : ''}`;
        }
        return houseNum || loc.name.substring(0, 6);
      }
    })();

    return `
      <div class="flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md border border-white/20 pl-0.5 pr-2.5 py-0.5 rounded-full shadow-2xl transition-all duration-300 ${scaleClass} whitespace-nowrap group ring-1 ring-black/20">
        <!-- Small Red Pin -->
        <svg viewBox="0 0 24 24" class="w-4 h-4 fill-red-500 stroke-white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
          <circle cx="12" cy="10" r="3"></circle>
        </svg>
        
        <!-- Text Label (House Number / Moo) -->
        <span class="text-[11px] font-black text-white font-sans tracking-tight drop-shadow-md">
          ${labelText}
        </span>
        
        <!-- Active indicator arrow -->
        ${isActive ? `
          <div class="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px] border-t-red-600 drop-shadow-sm"></div>
        ` : ''}
      </div>
    `;
  };

  // Modernized and elegant popup content HTML helper
  const getPopupContentHtml = (loc: BookmarkLocation) => {
    return `
      <div class="p-2.5 min-w-[220px] font-sans text-slate-800 dark:text-slate-200 bg-white dark:bg-[#111215]">
        <div class="flex items-center gap-2 font-bold text-sm border-b border-slate-100 dark:border-slate-800/80 pb-1.5 mb-1.5">
          <div class="w-5 h-5 shrink-0 flex items-center justify-center bg-blue-100/50 dark:bg-blue-900/35 text-blue-600 dark:text-blue-400 rounded">
            ${getCategorySvgString(loc.category)}
          </div>
          <span class="truncate text-slate-950 dark:text-white font-extrabold pr-1 select-text">${loc.name}</span>
        </div>
        
        <div class="text-[10px] text-slate-400 dark:text-slate-500 font-mono flex items-center gap-1 mb-2">
          <span class="text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1 py-0.2 rounded font-semibold">GPS</span>
          <span class="select-text">${loc.lat.toFixed(6)}, ${loc.lng.toFixed(6)}</span>
        </div>
        
        <div class="text-[11px] text-slate-700 dark:text-slate-300 bg-slate-50/80 dark:bg-slate-900/30 p-2 rounded-xl border border-slate-100 dark:border-slate-800/80 space-y-1">
          <div class="flex items-center gap-1"><span class="text-slate-400 dark:text-slate-500 w-14 shrink-0 font-semibold">บ้านเลขที่:</span> <span class="select-text truncate text-slate-900 dark:text-slate-200">${loc.houseNumber || '-'}</span></div>
          <div class="flex items-center gap-1"><span class="text-slate-400 dark:text-slate-500 w-14 shrink-0 font-semibold">หมู่ที่:</span> <span class="select-text truncate text-slate-900 dark:text-slate-200">${loc.moo || '-'}</span></div>
          <div class="flex items-center gap-1"><span class="text-slate-400 dark:text-slate-500 w-14 shrink-0 font-semibold">ซอย:</span> <span class="select-text truncate text-slate-900 dark:text-slate-200">${loc.soi || '-'}</span></div>
          <div class="flex items-center gap-1"><span class="text-slate-400 dark:text-slate-500 w-14 shrink-0 font-semibold">ตำบล:</span> <span class="select-text truncate text-slate-900 dark:text-slate-200">${loc.tambon || '-'}</span></div>
        </div>

        ${loc.notes ? `
          <div class="text-xs text-slate-500 dark:text-slate-400 bg-amber-50/30 dark:bg-amber-950/20 p-2 rounded-xl border border-amber-100/50 dark:border-amber-900/30 mt-2 leading-relaxed italic select-text">
            "${loc.notes}"
          </div>
        ` : ''}

        <div class="flex flex-col gap-2 mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80">
          <div class="flex justify-between items-center">
            <span class="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full text-slate-600 dark:text-slate-350 font-extrabold font-sans">
              ${getCategoryNameTh(loc.category)}
            </span>
            <button 
              onclick="if(window.addToRouteById) { window.addToRouteById('${loc.id}'); }"
              class="flex items-center gap-1 text-[10px] bg-blue-600 hover:bg-blue-700 text-white font-bold px-2.5 py-1 rounded-lg shadow-sm transition cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg> เพิ่มลงเส้นทาง
            </button>
          </div>
          <div class="grid grid-cols-2 gap-1.5 mt-1 border-t border-slate-100/60 dark:border-slate-800/40 pt-2">
            ${loc.googleMapLink ? `
              <a href="${loc.googleMapLink}" target="_blank" rel="noopener noreferrer" class="flex items-center justify-center gap-1.5 text-[10px] bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-blue-600 dark:text-blue-400 px-2 py-1.5 rounded-lg font-bold">
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg> แผนที่พิน
              </a>
            ` : `
              <a href="https://www.google.com/maps/dir/?api=1&destination=${loc.lat},${loc.lng}" target="_blank" rel="noopener noreferrer" class="flex items-center justify-center gap-1.5 text-[10px] bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-emerald-600 dark:text-emerald-400 px-2 py-1.5 rounded-lg font-bold">
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg> แผนที่ทาง
              </a>
            `}
            <a href="https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${loc.lat},${loc.lng}" target="_blank" rel="noopener noreferrer" class="flex items-center justify-center gap-1.5 text-[10px] bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-[#FF6B00] px-2 py-1.5 rounded-lg font-bold">
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg> วิวพิกัด
            </a>
          </div>
        </div>
      </div>
    `;
  };

  // 8. Plot Location Markers Effect (Performance-critical incremental rendering with entrance animation on new additions)
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerGroupRef.current) return;

    // Clear old heatmap
    if (heatmapLayerRef.current) {
      try {
        mapInstanceRef.current.removeLayer(heatmapLayerRef.current);
      } catch (err) {
        // ignore
      }
      heatmapLayerRef.current = null;
    }

    // Heatmap update
    const heatPoints = filteredLocations
      .filter(loc => !isNaN(Number(loc.lat)) && !isNaN(Number(loc.lng)))
      .map(loc => [Number(loc.lat), Number(loc.lng), 0.5] as [number, number, number]);
    
    if (heatPoints.length > 0 && mapInstanceRef.current) {
      try {
        const heatLayer = (L as any).heatLayer(heatPoints, {
          radius: 20,
          blur: 15,
          maxZoom: 10
        }).addTo(mapInstanceRef.current);
        heatmapLayerRef.current = heatLayer;
      } catch (err) {
        console.warn('Heatmap layer failed:', err);
      }
    }

    // Determine current ID set
    const currentIds = new Set(filteredLocations.map(l => l.id));

    // 1. Remove markers that are no longer present
    Object.keys(plottedMarkersRef.current).forEach(id => {
      if (!currentIds.has(id)) {
        const markerToRemove = plottedMarkersRef.current[id];
        if (markerToRemove) {
          try {
            markersLayerGroupRef.current?.removeLayer(markerToRemove);
          } catch (e) {
            // ignore
          }
        }
        delete plottedMarkersRef.current[id];
      }
    });

    // 2. Add or update currently filtered locations
    filteredLocations.forEach(loc => {
      const nLat = parseFloat(String(loc.lat));
      const nLng = parseFloat(String(loc.lng));
      
      if (isNaN(nLat) || isNaN(nLng) || !isFinite(nLat) || !isFinite(nLng)) {
        console.warn('Skipping marker with invalid coordinates:', loc.id, loc.lat, loc.lng);
        return;
      }

      const isCurrentlyActive = loc.id === activeLocationId;
      const customHtml = createCustomMarkerHtml(loc, isCurrentlyActive);
      const icon = L.divIcon({
        html: customHtml,
        className: 'custom-location-pin-wrapper',
        iconSize: [60, 30],
        iconAnchor: [30, 15],
        popupAnchor: [0, -15]
      });

      const safeNLat = isNaN(nLat) ? 0 : nLat;
      const safeNLng = isNaN(nLng) ? 0 : nLng;
      const popupContent = getPopupContentHtml(loc);

      const existingMarker = plottedMarkersRef.current[loc.id];
      if (existingMarker) {
        // Prevent re-entrance flicker: update position, icon and popup contents of existing marker incrementally
        try {
          existingMarker.setLatLng([safeNLat, safeNLng]);
          existingMarker.setIcon(icon);
          existingMarker.setPopupContent(popupContent);
        } catch (err) {
          console.error('Failed to update incremental marker properties:', err);
        }
      } else {
        // Brand new marker added to the map: execute entrance animation
        try {
          const elementMarker = L.marker([safeNLat, safeNLng], { icon }).addTo(markersLayerGroupRef.current!);

          // Try to trigger smooth Framer Motion entry scale on the marker element
          try {
            const el = elementMarker.getElement();
            if (el) {
              animate(el, { opacity: [0, 1], transform: ['scale(0.5)', 'scale(1)'] }, { duration: 0.4, ease: 'easeOut' });
            } else {
              elementMarker.on('add', () => {
                const elOnAdd = elementMarker.getElement();
                if (elOnAdd) {
                  animate(elOnAdd, { opacity: [0, 1], transform: ['scale(0.5)', 'scale(1)'] }, { duration: 0.4, ease: 'easeOut' });
                }
              });
            }
          } catch (animErr) {
            console.warn('Marker animate failed:', animErr);
          }

          // Modernized popup binding
          elementMarker.bindPopup(popupContent, { closeButton: true });

          elementMarker.on('click', () => {
            setActiveLocationId(loc.id);
            setIsCreating(false);
            setIsEditing(false);
          });

          plottedMarkersRef.current[loc.id] = elementMarker;
        } catch (err) {
          console.error('Failed to plot marker incrementally:', err);
        }
      }
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

    if (selectedMapPoint) {
      const pLat = parseFloat(String(selectedMapPoint.lat));
      const pLng = parseFloat(String(selectedMapPoint.lng));

      if (!isNaN(pLat) && !isNaN(pLng) && isFinite(pLat) && isFinite(pLng)) {
        const tempHtml = `
        <div class="relative flex items-center justify-center w-10 h-10 rounded-full border-2 border-dashed border-red-500 bg-red-50 text-red-500 shadow-lg scale-110 animate-bounce">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="2"/></svg>
          <span class="absolute inline-flex h-full w-full rounded-full bg-red-400/20 animate-pulse -z-10"></span>
        </div>
      `;
        const icon = L.divIcon({
          html: tempHtml,
          className: 'temp-marker-placement',
          iconSize: [40, 40],
          iconAnchor: [20, 20]
        });

        try {
          const safePLat = (isNaN(pLat) || !isFinite(pLat)) ? 0 : pLat;
          const safePLng = (isNaN(pLng) || !isFinite(pLng)) ? 0 : pLng;
          const tempMarker = L.marker([safePLat, safePLng], { icon })
            .addTo(mapInstanceRef.current);
          
          tempMarkerRef.current = tempMarker;
        } catch (err) {
          console.error('Failed to create temp marker:', err);
        }
      }
    }
  }, [selectedMapPoint]);

  // 10. User Current Location Pin Helper
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (userLocationMarkerRef.current) {
      userLocationMarkerRef.current.remove();
      userLocationMarkerRef.current = null;
    }

    if (userLocation) {
      const uLat = parseFloat(String(userLocation.lat));
      const uLng = parseFloat(String(userLocation.lng));

      if (!isNaN(uLat) && !isNaN(uLng) && isFinite(uLat) && isFinite(uLng)) {
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

        try {
          const safeULat = (isNaN(uLat) || !isFinite(uLat)) ? 0 : uLat;
          const safeULng = (isNaN(uLng) || !isFinite(uLng)) ? 0 : uLng;
          const popupContent = `
            <div class="text-center p-1 font-sans min-w-[120px]">
              <div class="text-[11px] font-bold text-slate-800 mb-2">📍 ตำแหน่งปัจจุบัน</div>
              <button 
                onclick="if(window.startCreatingAtUserLocation) { window.startCreatingAtUserLocation(); }" 
                class="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-sm cursor-pointer transition-all border-none active:scale-95 inline-block"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg> เพิ่มข้อมูล
              </button>
            </div>
          `;
          const uMarker = L.marker([safeULat, safeULng], { icon })
            .addTo(mapInstanceRef.current)
            .bindPopup(popupContent, { closeButton: true });
          
          userLocationMarkerRef.current = uMarker;
        } catch (err) {
          console.error('Failed to create user location marker:', err);
        }
      }
    }
  }, [userLocation]);

  // 10b. Auto Zoom/Scale to fit filtered results
  useEffect(() => {
    if (!mapInstanceRef.current || filteredLocations.length === 0 || isCreating || isEditing) return;

    // Only auto-zoom if the search/filter changed and we aren't currently focusing a specific pin
    const validCoords = filteredLocations
      .map(loc => [parseFloat(String(loc.lat)), parseFloat(String(loc.lng))] as [number, number])
      .filter(coord => !isNaN(coord[0]) && !isNaN(coord[1]) && isFinite(coord[0]) && isFinite(coord[1]));

    if (validCoords.length === 0) return;

    const bounds = L.latLngBounds(validCoords);
    
    // Check if bounds are valid
    if (bounds.isValid()) {
      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();
      const isPoint = Math.abs(sw.lat - ne.lat) < 0.0001 && Math.abs(sw.lng - ne.lng) < 0.0001;

      if (isPoint) {
        mapInstanceRef.current.flyTo(sw, 15, {
          duration: 1.5
        });
      } else {
        mapInstanceRef.current.flyToBounds(bounds, {
          padding: [40, 40],
          maxZoom: 16,
          duration: 1.5
        });
      }
    }
  }, [filteredLocations.length, tambonFilter, mooFilter, categoryFilter, searchQuery]);

  // 10c. Route Logic: Fetch route from OSRM and display on map
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Clear existing route polyline
    if (routeLayerRef.current) {
      routeLayerRef.current.remove();
      routeLayerRef.current = null;
    }

    if (routePoints.length < 2) {
      setRoutePolyline(null);
      setRouteDistance(null);
      setRouteDuration(null);
      return;
    }

    const fetchRoute = async () => {
      try {
        const coords = routePoints.map(p => `${p.lng},${p.lat}`).join(';');
        const url = `https://router.project-osrm.org/route/v1/driving/${coords}?geometries=geojson&overview=full`;
        
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network response was not ok');
        
        const data = await response.json();
        if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
          console.warn('OSRM routing request failed or returned no routes');
          return;
        }

        const route = data.routes[0];
        const geometry = route.geometry.coordinates
          .map((c: [number, number]) => [Number(c[1]), Number(c[0])] as [number, number])
          .filter(coord => !isNaN(coord[0]) && !isNaN(coord[1]) && isFinite(coord[0]) && isFinite(coord[1]));
        
        if (geometry.length === 0) return;

        setRoutePolyline(geometry);
        setRouteDistance(route.distance);
        setRouteDuration(route.duration);

        // Draw on map
        const polyline = L.polyline(geometry, {
          color: '#3b82f6', // blue-500
          weight: 6,
          opacity: 0.8,
          lineJoin: 'round',
          dashArray: '10, 10',
          className: 'animate-route-path'
        }).addTo(mapInstanceRef.current!);

        routeLayerRef.current = polyline;

        // Auto-zoom to fit the route
        const bounds = polyline.getBounds();
        if (bounds.isValid()) {
          const sw = bounds.getSouthWest();
          const ne = bounds.getNorthEast();
          const isPoint = Math.abs(sw.lat - ne.lat) < 0.0001 && Math.abs(sw.lng - ne.lng) < 0.0001;

          if (isPoint) {
            mapInstanceRef.current!.flyTo(sw, 15, {
              duration: 1.5
            });
          } else {
            mapInstanceRef.current!.flyToBounds(bounds, {
              padding: [50, 50],
              duration: 1.5
            });
          }
        }

      } catch (err) {
        console.error('Failed to fetch route:', err);
      }
    };

    fetchRoute();
  }, [routePoints]);

  // Smooth Focus (Fly to) coordinates helper
  const handleMapFocus = (lat: any, lng: any, zoom = 14) => {
    if (!mapInstanceRef.current) return;
    
    const plat = parseFloat(String(lat));
    const plng = parseFloat(String(lng));
    const pzoom = parseFloat(String(zoom));

    if (isNaN(plat) || isNaN(plng) || !isFinite(plat) || !isFinite(plng)) {
      console.warn('handleMapFocus received invalid coordinates:', lat, lng);
      return;
    }

    try {
      const size = mapInstanceRef.current.getSize();
      const targetZoom = (isNaN(pzoom) || !isFinite(pzoom)) ? 14 : pzoom;
      
      // Fallback to setView without animation if the map container is hidden or too small
      if (size.x <= 0 || size.y <= 0) {
        mapInstanceRef.current.setView([plat, plng], targetZoom);
      } else {
        mapInstanceRef.current.flyTo([plat, plng], targetZoom, {
          animate: true,
          duration: 1.5,
          easeLinearity: 0.25
        });
      }
    } catch (err) {
      console.error('Map flyTo failed:', err);
    }
  };

  // Helper: Request GPS (Real-time tracking)
  const handleGetMyGPS = () => {
    if (!navigator.geolocation) {
      showToast('เบราว์เซอร์ของคุณไม่สนับสนุน GPS', 'error');
      return;
    }

    if (isLocating && watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
      setIsLocating(false);
      showToast('หยุดการติดตามตำแหน่งแล้ว', 'info');
      return;
    }

    setIsLocating(true);
    showToast('กำลังรับข้อมูลตำแหน่งแบบ Real-Time...', 'info');
    
    // Request notification permission for proximity alerts
    if ('Notification' in window) {
      Notification.requestPermission().then(permission => {
        notificationPermissionRef.current = permission;
      });
    }

    // Initial fetch
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        if (latitude === undefined || longitude === undefined || isNaN(latitude) || isNaN(longitude)) return;
        const myLat = parseFloat(latitude.toFixed(6));
        const myLng = parseFloat(longitude.toFixed(6));
        if (isNaN(myLat) || isNaN(myLng)) return;
        
        setUserLocation({ lat: myLat, lng: myLng });
        
        handleMapFocus(myLat, myLng, 16);
        showToast('เชื่อมต่อ GPS สำเร็จ', 'success');
      },
      (error) => {
        console.warn('Initial GPS fetch failed:', error);
        if (error.code === 1) {
          showToast('การเข้าถึงตำแหน่งถูกปฏิเสธ', 'error');
        } else {
          showToast('ไม่สามารถระบุตำแหน่งได้', 'error');
        }
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );

    // Start watching
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const myLat = parseFloat(latitude.toFixed(6));
        const myLng = parseFloat(longitude.toFixed(6));
        
        if (isNaN(myLat) || isNaN(myLng)) return;

        setUserLocation({ lat: myLat, lng: myLng });
        
        // Only auto-pan if the user is in map view and we just started
        // Actually, for "real-time", let's keep following them if the map isn't being moved by user?
        // Simple implementation: update user state, which updates the marker via useEffect.
      },
      (error) => {
        console.error('Real-time GPS tracking error:', error);
        setIsLocating(false);
        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    watchIdRef.current = watchId;
  };

  // Background Proximity Checker
  useEffect(() => {
    if (!userLocation || locations.length === 0) return;
    
    locations.forEach(loc => {
      const distKm = calculateDistanceKm(userLocation.lat, userLocation.lng, loc.lat, loc.lng);
      
      // Check if within 500 meters (0.5 km)
      if (distKm <= 0.5) {
        if (!notifiedLocationsRef.current.has(loc.id)) {
          // Add to set immediately to prevent duplicate notifications in rapid succession
          notifiedLocationsRef.current.add(loc.id);
          
          if ('Notification' in window && notificationPermissionRef.current === 'granted') {
            new Notification('📍 คุณอยู่ใกล้ตำแหน่งที่บันทึกไว้', {
              body: `คุณอยู่ห่างจาก "${loc.name}" เพียง ${(distKm * 1000).toFixed(0)} เมตร`,
              icon: '/favicon.ico'
            });
          }
          showToast(`📍 คุณอยู่ใกล้ "${loc.name}" ในระยะ ${(distKm * 1000).toFixed(0)} เมตร`, 'info');
        }
      } else {
        // If they move away (e.g., > 600m), we could reset it so they get notified again if they come back
        // Using a slightly larger threshold (0.6 km) to prevent flip-flopping exactly at 500m
        if (distKm > 0.6 && notifiedLocationsRef.current.has(loc.id)) {
          notifiedLocationsRef.current.delete(loc.id);
        }
      }
    });
  }, [userLocation, locations]);

  // Reverse geocoding tool using free OpenStreetMap Nominatim for Thai Address Details
  const fetchThaiAddressDetails = async (lat: number, lng: number) => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=th`);
      if (!response.ok) return;
      const data = await response.json();
      if (data && data.address) {
        const addr = data.address;
        
        // Extract house number
        const detectedHouseNumber = addr.house_number || '';

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

        if (!lockHouseNumber) setFormHouseNumber(detectedHouseNumber);
        if (!lockSoi) setFormSoi(detectedSoi);
        if (!lockMoo) setFormMoo(detectedMoo);
        if (!lockTambon) setFormTambon(detectedTambon);
        if (!lockAmphoe) setFormAmphoe(detectedAmphoe);
      }
    } catch (err) {
      console.error('Error fetching address:', err);
    }
  };

  // A global function to allow Leaflet popups (HTML strings) to trigger creating a location
  useEffect(() => {
    (window as any).startCreatingAtUserLocation = () => {
      if (userLocation) {
        const uLat = parseFloat(String(userLocation.lat));
        const uLng = parseFloat(String(userLocation.lng));
        if (!isNaN(uLat) && !isNaN(uLng) && isFinite(uLat) && isFinite(uLng)) {
          const lat = parseFloat(uLat.toFixed(6));
          const lng = parseFloat(uLng.toFixed(6));
          setSelectedMapPoint({ lat, lng });
          setIsCreating(true);
          setIsEditing(false);
          setFormName('หมุดพิกัดจัดเก็บใหม่ (ตำแหน่งปัจจุบัน)');
          setFormLat(lat);
          setFormLng(lng);
          if (!lockType) setFormCategory('Village');
          setFormNotes('');
          setFormGoogleMapLink('');
          if (!lockHouseNumber) setFormHouseNumber('');
          if (!lockSoi) setFormSoi('');
          if (!lockMoo) setFormMoo('');
          if (!lockTambon) setFormTambon('');
          if (!lockAmphoe) setFormAmphoe('');
          fetchThaiAddressDetails(lat, lng);
          if (mapInstanceRef.current) {
            mapInstanceRef.current.closePopup();
          }
        }
      } else {
        alert("กรุณารอรับพิกัด GPS ก่อนทำการเพิ่มข้อมูล");
      }
    };
    return () => {
      delete (window as any).startCreatingAtUserLocation;
    };
  }, [userLocation, lockType, lockHouseNumber, lockSoi, lockMoo, lockTambon, lockAmphoe]);

  // Global helper for adding to route from Leaflet popups
  useEffect(() => {
    (window as any).addToRouteById = (id: string) => {
      const location = locations.find(l => l.id === id);
      if (location) {
        setRoutePoints(prev => {
          if (prev.find(p => p.id === id)) return prev;
          return [...prev, location];
        });
        setIsRouteMode(true);
      }
    };
    return () => {
      delete (window as any).addToRouteById;
    };
  }, [locations]);

  const handleGetCurrentLocationForForm = () => {
    if (!navigator.geolocation) {
      alert('เบราว์เซอร์ของคุณไม่สนับสนุนฟังก์ชันค้นหาพิกัด Geolocation');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        if (latitude === undefined || longitude === undefined || isNaN(latitude) || isNaN(longitude)) {
          alert('ไม่พบพิกัดที่ถูกต้องจากเซ็นเซอร์ของอุปกรณ์ หรือรูปพิกัดคลาดเคลื่อนผิดพลาด');
          return;
        }
        const latVal = parseFloat(latitude.toFixed(6));
        const lngVal = parseFloat(longitude.toFixed(6));
        
        if (isNaN(latVal) || isNaN(lngVal)) {
          alert('ไม่พบพิกัดที่ถูกต้องจากเซ็นเซอร์ของอุปกรณ์ หรือรูปพิกัดคลาดเคลื่อนผิดพลาด');
          return;
        }

        setFormLat(latVal);
        setFormLng(lngVal);
        setFormCoords(`${latVal}, ${lngVal}`);
        setFormGoogleMapLink(`https://www.google.com/maps?q=${latVal},${lngVal}`);
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
      
      if (!isNaN(inputLat) && isFinite(inputLat) && !isNaN(inputLng) && isFinite(inputLng) && 
          inputLat >= -90 && inputLat <= 90 && inputLng >= -180 && inputLng <= 180) {
        setSelectedMapPoint({ lat: inputLat, lng: inputLng });
        handleMapFocus(inputLat, inputLng, 14);
        
        // Open Create mode so they can easily save it
        setIsCreating(true);
        setIsEditing(false);
        setFormName('พิกัดที่ค้นหาด่วน');
        setFormLat(inputLat);
        setFormLng(inputLng);
        setFormCategory(lockType ? formCategory : 'Village');
        setFormNotes('ปักไว้ด้วยระบบค้นหาพิกัดนำทางด่วน');
        setFormGoogleMapLink('');
        if (!lockHouseNumber) setFormHouseNumber('');
        if (!lockSoi) setFormSoi('');
        if (!lockMoo) setFormMoo('');
        if (!lockTambon) setFormTambon('');
        if (!lockAmphoe) setFormAmphoe('');
      } else {
        setQuickCoordinatesError('ค่าพิกัดไม่อยู่ในขอบเขตสากล (Lat -90 ถึง 90, Lng -180 ถึง 180)');
      }
    } else {
      setQuickCoordinatesError('กรุณาป้อนรูปแบบที่ถูกต้อง เช่น: 13.8095, 100.5605');
    }
  };

  // Helper: Parse and handle single coordinate field inputs
  const handleCoordsInputChange = (val: string) => {
    // บังคับห้ามเว้นวรรค หากมีให้ปรับให้ติดกันอัตโนมัติ (auto-strip space and auto-convert whitespace divider to comma)
    let sanitized = val;
    if (sanitized.includes(',')) {
      sanitized = sanitized.replace(/\s+/g, '');
    } else {
      sanitized = sanitized.trim().replace(/\s+/g, ',');
    }
    setFormCoords(sanitized);
    
    // Clean and split by common separators (comma, spaces, slashes)
    const cleanVal = sanitized.replace(/[()[\]{}]/g, ''); // strip parentheses
    const parts = cleanVal.split(/[,\/|]+/).map(p => p.trim()).filter(Boolean);
    
    if (parts.length >= 2) {
      const parsedLat = parseFloat(parts[0]);
      const parsedLng = parseFloat(parts[1]);
      
      if (!isNaN(parsedLat) && isFinite(parsedLat) && !isNaN(parsedLng) && isFinite(parsedLng)) {
        setFormLat(parsedLat);
        setFormLng(parsedLng);
      } else {
        setFormLat('');
        setFormLng('');
      }
    } else {
      setFormLat('');
      setFormLng('');
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
    setFormCoords(`${loc.lat.toFixed(6)}, ${loc.lng.toFixed(6)}`);
    setFormGoogleMapLink(loc.googleMapLink || '');
    setFormHouseNumber(loc.houseNumber || '');
    setFormSoi(loc.soi || '');
    setFormMoo(loc.moo || '');
    setFormTambon(loc.tambon || '');
    setFormAmphoe(loc.amphoe || '');
  };

  // Delete Action triggered via custom Modal
  const handleDeleteLocation = (id: string) => {
    setDeleteTargetId(id);
  };

  // จริงใจดำเนินการลบ
  const handleConfirmDelete = async () => {
    if (!deleteTargetId) return;
    const id = deleteTargetId;
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
    setDeleteTargetId(null);
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

    if (isNaN(latVal) || !isFinite(latVal) || latVal < -90 || latVal > 90) {
      alert('กรุณาป้อนละติจูดให้ถูกต้องระหว่าง -90 และ 90');
      return;
    }

    if (isNaN(lngVal) || !isFinite(lngVal) || lngVal < -180 || lngVal > 180) {
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
        houseNumber: formHouseNumber.trim(),
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
        houseNumber: formHouseNumber.trim() || undefined,
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
    
    // ตรวจสอบเงื่อนไขกุญแจล็อกก่อนเคลียร์ค่า
    if (!lockType) setFormCategory('Village');
    if (!lockHouseNumber) setFormHouseNumber('');
    if (!lockSoi) setFormSoi('');
    if (!lockMoo) setFormMoo('');
    if (!lockTambon) setFormTambon('');
    if (!lockAmphoe) setFormAmphoe('');
    if (!lockGps) setLockGps(false);
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
    const withoutLinks = locations.filter(l => !l.googleMapLink);
    if (userLocation && userLocation.lat !== 0 && userLocation.lng !== 0) {
      return withoutLinks
        .map(l => ({ 
          ...l, 
          dist: calculateDistanceKm(userLocation.lat, userLocation.lng, l.lat || 0, l.lng || 0) 
        }))
        .sort((a, b) => (a.dist || 0) - (b.dist || 0))
        .slice(0, 5);
    }
    return withoutLinks.slice(0, 5);
  }, [locations, userLocation]);

  // Sorted Playlist Locations is now declared at the top of App() for Temporal Dead Zone prevention
  const sortedPlaylistLocationsAlias = sortedPlaylistLocations;

  return (
    <>
      <AnimatePresence mode="wait">
        {showSplash && (
          <SplashScreen onComplete={() => setShowSplash(false)} />
        )}
      </AnimatePresence>

      <div id="app-root-container" className="flex flex-col lg:flex-row h-screen w-full select-none overflow-hidden bg-slate-50 text-slate-800">
      
      {/* 1.5 Sleek Table View (Hidden by default, visible when currentView === 'table') */}
      {currentView === 'table' && (
        <div id="aesthetic-table-panel" className="w-full h-full bg-[#0A0B0F]/95 text-[#D8DADF] flex flex-col overflow-y-auto p-6 md:p-10 relative z-30 font-sans">
          {/* Subtle glowing accent background */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[140px] pointer-events-none"></div>
          
          <div className="flex items-center justify-between mb-8 z-10">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-white font-display">
                DATA <span className="text-[#FF6B00]">TABLE</span>
              </h1>
              <p className="text-slate-400 text-sm font-medium mt-1">ตารางพิกัดข้อมูลทั้งหมด</p>
            </div>
            <button 
              onClick={() => setCurrentView('dashboard')} 
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-sm transition-colors border border-slate-700 flex items-center gap-2"
            >
              <LayoutDashboard size={16} />
               กลับหน้าหลัก
            </button>
          </div>

          <div className="flex-1 w-full z-10 max-w-7xl mx-auto">
            <TableView locations={locations} />
          </div>
        </div>
      )}

      {/* 2.1 Full-screen Creation & Editing Page */}
      {(currentView === 'add-location' || currentView === 'edit-location') && (
        <div id="fullscreen-location-form" className="w-full h-full min-h-screen bg-[#0A0B0E] text-[#D8DADF] flex flex-col overflow-y-auto p-4 md:p-10 relative z-30 font-sans">
          {/* Glowing gradient background */}
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-[140px] pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#FF6B00]/5 rounded-full blur-[140px] pointer-events-none"></div>

          <div className="max-w-3xl w-full mx-auto flex-1 flex flex-col justify-between z-10">
            <div>
              {/* Header Header */}
              <div className="flex items-center justify-between pb-6 border-b border-slate-800 mb-8 mt-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-500/20">
                    <MapPinned size={22} />
                  </div>
                  <div>
                    <h1 className="text-xl md:text-2xl font-black text-white tracking-wide">
                      {currentView === 'add-location' ? 'สร้างและบันทึกพิกัดใหม่' : 'แก้ไขพิกัดข้อมูลสถานที่'}
                    </h1>
                    <p className="text-xs text-slate-400 mt-1">
                      {currentView === 'add-location' ? 'ป้อนรายละเอียดที่อยู่ไทยพิกัดพิกัดภูมิศาสตร์ (เน้นความแม่นยำสูง หลีกเลี่ยงเดาสถานพิกัด)' : 'แก้ไขรายละเอียดข้อมูลพิกัดสถานที่ในระบบสำรวจ'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded-xl font-bold text-xs transition duration-200 cursor-pointer flex items-center gap-1.5"
                >
                  <X size={14} /> ยกเลิก
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleSaveForm} className="space-y-6">
                
                {/* 1. Category selector */}
                <div className="bg-[#121319] border border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                      ประเภทสถานที่ปักหมุด
                    </label>
                    <button
                      type="button"
                      onClick={() => setLockType(!lockType)}
                      className={`text-[10px] font-bold px-2 py-1 rounded transition flex items-center gap-1 ${lockType ? 'bg-[#FF6B00]/20 text-[#FF6B00]' : 'bg-slate-850 text-slate-400'}`}
                    >
                      {lockType ? <Lock size={10} /> : <Unlock size={10} />}
                      <span>{lockType ? 'ล็อกหมวดหมู่พิกัด' : 'ไม่ได้บล็อก'}</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { key: 'Village', label: 'หมู่บ้าน', emoji: '🏡', border: 'border-emerald-500/30', bg: 'bg-emerald-500/10 text-emerald-400' },
                      { key: 'Community', label: 'ชุมชน', emoji: '🤝', border: 'border-blue-500/30', bg: 'bg-blue-500/10 text-blue-400' },
                      { key: 'Office', label: 'สำนักงาน', emoji: '🏢', border: 'border-rose-500/30', bg: 'bg-rose-500/10 text-rose-400' },
                      { key: 'Condo', label: 'คอนโด', emoji: '🌆', border: 'border-amber-500/30', bg: 'bg-amber-500/10 text-amber-400' },
                    ].map((cat) => {
                      const active = formCategory === cat.key;
                      return (
                        <button
                          key={cat.key}
                          type="button"
                          onClick={() => setFormCategory(cat.key as any)}
                          className={`py-3 px-1 rounded-xl border text-xs transition duration-200 cursor-pointer text-center flex flex-col items-center gap-1.5 ${
                            active 
                              ? `${cat.border} ${cat.bg} border-2 font-bold` 
                              : 'border-slate-800/80 bg-[#17181F] text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <span className="text-lg">{cat.emoji}</span>
                          <span>{cat.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Core geographical details */}
                <div className="bg-[#121319] border border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">พิกัดทางภูมิศาสตร์ (ละติจูด/ลองจิจูด)</h3>
                  
                  {/* Name */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-400">ชื่อตำแหน่งสถานที่พิกัด</label>
                    <input
                      type="text"
                      required
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="ป้อนชื่อหมู่บ้าน คอนโด หรือ ตึกศูนย์กลาง"
                      className="w-full px-4 py-3 bg-[#17181F] border border-slate-800 rounded-xl text-white text-xs outline-none focus:border-slate-700 focus:ring-1 focus:ring-slate-700 transition"
                    />
                  </div>

                  {/* Lat and Lng inputs */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-400">ละติจูด (Lat) ความแม่นยำสูง</label>
                      <input
                        type="text"
                        required
                        value={formLat}
                        onChange={(e) => setFormLat(e.target.value)}
                        placeholder="เช่น 13.xxxx"
                        className="w-full px-4 py-3 bg-[#17181F] border border-slate-800 rounded-xl text-white font-mono text-xs outline-none focus:border-slate-700 focus:ring-1 focus:ring-slate-700 transition"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-400">ลองจิจูด (Lng) ความแม่นยำสูง</label>
                      <input
                        type="text"
                        required
                        value={formLng}
                        onChange={(e) => setFormLng(e.target.value)}
                        placeholder="เช่น 100.xxxx"
                        className="w-full px-4 py-3 bg-[#17181F] border border-slate-800 rounded-xl text-white font-mono text-xs outline-none focus:border-slate-700 focus:ring-1 focus:ring-slate-700 transition"
                      />
                    </div>
                  </div>

                  {/* Auto Geocoding lookup bar */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const l = parseFloat(String(formLat));
                        const r = parseFloat(String(formLng));
                        if (l && r && !isNaN(l) && !isNaN(r)) {
                          fetchThaiAddressDetails(l, r);
                        } else {
                          showToast('กรุณากรอกละติจูดและลองจิจูดก่อนระบบแปลงที่อยู่ไทย', 'error');
                        }
                      }}
                      className="flex-1 py-3 px-4 bg-[#FF6B00]/10 hover:bg-[#FF6B00]/20 border border-[#FF6B00]/30 text-[#FF6B00] rounded-xl text-xs font-bold transition cursor-pointer text-center flex items-center justify-center gap-1.5"
                    >
                      <MapIcon size={14} />
                      <span>ดึงข้อมูลที่อยู่ไทยอัตโนมัติ (OpenStreetMap)</span>
                    </button>
                    {userLocation && (
                      <button
                        type="button"
                        onClick={() => {
                          setFormLat(userLocation.lat);
                          setFormLng(userLocation.lng);
                          showToast('ตั้งพิกัดด้วย GPS ของฉันสำเร็จ!', 'success');
                        }}
                        className="py-3 px-4 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Navigation size={12} />
                        <span>ใช้ GPS ล่าสุดของฉัน</span>
                      </button>
                    )}
                  </div>

                  {/* Google Maps Link Link field (Generated automatically!) */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-400">ลิ้งก์แผนที่นำทางระบบ Google Maps (ระบบแปลงพิกัดแม่นยำสูงอัตโนมัติ)</label>
                    <div className="relative">
                      <input
                        type="url"
                        value={formGoogleMapLink}
                        onChange={(e) => setFormGoogleMapLink(e.target.value)}
                        placeholder="https://www.google.com/maps?q=lat,lng"
                        className="w-full pl-10 pr-4 py-3 bg-[#17181F] border border-slate-800 rounded-xl text-[#FF6B00] font-mono text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                      />
                      <Compass size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    </div>
                  </div>
                </div>

                {/* 3. Thai address details (No Guessing constraint) */}
                <div className="bg-[#121319] border border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">รายละเอียดทางที่อยู่ประเทศไทย (นนทบุรีเป็นหลัก)</h3>
                    <span className="text-[10px] text-emerald-400 font-bold bg-[#17181F] border border-emerald-500/20 px-2.5 py-0.5 rounded-full">OpenStreetMap Database</span>
                  </div>

                  <p className="text-[11px] text-slate-450 leading-relaxed italic border-l-2 border-[#FF6B00] pl-3 bg-slate-900/40 p-2.5 rounded-r-xl">
                    * ระบบจะจัดวางที่อยู่และอำเภอจากการระบุผ่าน OpenStreetMap โดยละเว้นข้อมูลหลอกหรือการ คาดเดาอัตโนมัติ หากไม่มีข้อมูลพิกัดในจุดที่กำหนดให้เว้นว่างช่องฟิลด์นั้นไว้ เพื่อความถูกต้องสูงสุด
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {/* บ้านเลขที่ */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="font-semibold text-slate-400">บ้านเลขที่</span>
                        <button type="button" onClick={() => setLockHouseNumber(!lockHouseNumber)} className="text-slate-500 hover:text-slate-300">
                          {lockHouseNumber ? <Lock size={10} className="text-amber-500" /> : <Unlock size={10} />}
                        </button>
                      </div>
                      <input
                        type="text"
                        value={formHouseNumber}
                        onChange={(e) => setFormHouseNumber(e.target.value)}
                        placeholder="ว่าง (ไม่ต้องกรอกมั่ว)"
                        className="w-full px-3 py-2.5 bg-[#17181F] border border-slate-800 rounded-xl text-white text-xs outline-none focus:border-slate-700 transition"
                      />
                    </div>

                    {/* ซอย */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="font-semibold text-slate-400">ซอย / ซอยย่อย</span>
                        <button type="button" onClick={() => setLockSoi(!lockSoi)} className="text-slate-500 hover:text-slate-300">
                          {lockSoi ? <Lock size={10} className="text-amber-500" /> : <Unlock size={10} />}
                        </button>
                      </div>
                      <input
                        type="text"
                        value={formSoi}
                        onChange={(e) => setFormSoi(e.target.value)}
                        placeholder="หรือเว้นว่าง"
                        className="w-full px-3 py-2.5 bg-[#17181F] border border-slate-800 rounded-xl text-white text-xs outline-none focus:border-slate-700 transition"
                      />
                    </div>

                    {/* หมู่ที่ */}
                    <div className="space-y-1.5 col-span-2 sm:col-span-1">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="font-semibold text-slate-400">หมู่ที่</span>
                        <button type="button" onClick={() => setLockMoo(!lockMoo)} className="text-slate-500 hover:text-slate-300">
                          {lockMoo ? <Lock size={10} className="text-amber-500" /> : <Unlock size={10} />}
                        </button>
                      </div>
                      <input
                        type="text"
                        value={formMoo}
                        onChange={(e) => setFormMoo(e.target.value)}
                        placeholder="เช่น หมู่ 4"
                        className="w-full px-3 py-2.5 bg-[#17181F] border border-slate-800 rounded-xl text-white text-xs outline-none focus:border-slate-700 transition"
                      />
                    </div>

                    {/* ตำบล */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="font-semibold text-slate-400">ตำบล / แขวง</span>
                        <button type="button" onClick={() => setLockTambon(!lockTambon)} className="text-slate-500 hover:text-slate-300">
                          {lockTambon ? <Lock size={10} className="text-amber-500" /> : <Unlock size={10} />}
                        </button>
                      </div>
                      <input
                        type="text"
                        value={formTambon}
                        onChange={(e) => setFormTambon(e.target.value)}
                        placeholder="ตำบลเสาธงหิน"
                        className="w-full px-3 py-2.5 bg-[#17181F] border border-slate-800 rounded-xl text-white text-xs outline-none focus:border-slate-700 transition"
                      />
                    </div>

                    {/* อำเภอ */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="font-semibold text-slate-400">อำเภอ / เขต</span>
                        <button type="button" onClick={() => setLockAmphoe(!lockAmphoe)} className="text-slate-500 hover:text-slate-300">
                          {lockAmphoe ? <Lock size={10} className="text-amber-500" /> : <Unlock size={10} />}
                        </button>
                      </div>
                      <input
                        type="text"
                        value={formAmphoe}
                        onChange={(e) => setFormAmphoe(e.target.value)}
                        placeholder="บางบัวทอง"
                        className="w-full px-3 py-2.5 bg-[#17181F] border border-slate-800 rounded-xl text-white text-xs outline-none focus:border-slate-700 transition"
                      />
                    </div>

                    {/* จังหวัดนนทบุรี */}
                    <div className="space-y-1.5 col-span-2 sm:col-span-1">
                      <label className="block text-xs font-semibold text-slate-400">จังหวัดหลัก</label>
                      <input
                        type="text"
                        disabled
                        value="จังหวัดนนทบุรี (หลัก)"
                        className="w-full px-3 py-2.5 bg-[#121319] border border-slate-850 rounded-xl text-slate-500 text-xs font-black cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. Notes / หมายเหตุบันทึก */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">หมายเหตุและโน้ตย่อยพิกัดสถานที่</label>
                  <textarea
                    rows={3}
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="ป้อนโน้ตเพื่อช่วยบันทึกรายละเอียดในการเดินทางหรือข้อมูลอื่นเพิ่มเติม..."
                    className="w-full px-4 py-3 bg-[#121319] border border-slate-800 rounded-2xl text-white text-xs focus:ring-1 focus:ring-[#FF6B00] outline-none transition resize-none shadow-sm"
                  />
                </div>

                {/* Submit Action Block */}
                <div className="flex gap-4 pt-6 border-t border-slate-800 pb-20 justify-end">
                  <button
                    type="submit"
                    className="flex-1 sm:flex-initial px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-lg shadow-blue-500/10 active:scale-95 text-center flex items-center justify-center gap-2"
                  >
                    <Save size={15} />
                    <span>บันทึกและปักหมุดสำเร็จ</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelForm}
                    className="px-6 py-3.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-400 hover:text-white font-bold text-xs rounded-xl transition cursor-pointer text-center"
                  >
                    กลับหน้าหลัก
                  </button>
                </div>

              </form>
            </div>
          </div>
        </div>
      )}

      {/* 2.2 Full-screen Agenda & Playlist Page */}
      {currentView === 'queue-today' && (
        <div id="fullscreen-playlist-today" className="w-full h-full min-h-screen bg-[#07080B]/98 text-[#D8DADF] flex flex-col overflow-y-auto p-4 md:p-10 relative z-30 font-sans">
          <div className="absolute top-0 left-0 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none"></div>

          <div className="max-w-4xl w-full mx-auto flex-1 flex flex-col z-10">
            {/* Header Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-slate-800 mb-8 mt-4 gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-600 rounded-2xl text-white shadow-lg shadow-emerald-500/20">
                  <CalendarDays size={22} />
                </div>
                <div>
                  <h1 className="text-xl md:text-2xl font-black text-white tracking-wide flex items-center gap-2.5">
                    <span>คิวงานของฉันวันนี้</span>
                    {routePoints.length > 0 && (
                      <span className="text-[10px] bg-emerald-500 text-slate-950 font-black px-2 py-0.5 rounded-full">
                        {routePoints.filter(p => !p.checkedInAt).length} จุดค้างอยู่
                      </span>
                    )}
                  </h1>
                  <p className="text-xs text-slate-400 mt-1">คิวเส้นทางที่คุณจัดระเบียบสำรวจเพื่อท่องเที่ยวและปักบันทึกในหนึ่งวัน</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCurrentView('dashboard')}
                className="px-4 py-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl font-bold text-xs transition duration-200 cursor-pointer flex items-center gap-1.5 self-end sm:self-auto"
              >
                <ChevronRight size={14} className="rotate-180" /> กลับหน้าแรก
              </button>
            </div>

            {/* Proximity and quick multi route block */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-[#121319] border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-2.5">
                  <Activity size={18} className={isProximityAlertActive ? 'text-emerald-400 animate-pulse' : 'text-slate-500'} />
                  <div>
                    <span className="text-xs font-bold text-white block">ระบบแจ้งเตือนระยะใกล้วิทยุ</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">เตือนเมื่อคุณเข้าห่างพิกัดที่ใกล้เคียงที่สุดในคิว</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsProximityAlertActive(!isProximityAlertActive);
                    showToast(isProximityAlertActive ? 'ปิดระบบส่งเตือนพิกัด' : 'เปิดระบบส่งเตือนเสียงเรียกรอบพิกัดแล้ว', 'info');
                  }}
                  className={`px-4 py-1.5 rounded-full text-[10px] font-bold transition-all ${isProximityAlertActive ? 'bg-emerald-500 text-slate-950 shadow' : 'bg-slate-800 text-slate-400'}`}
                >
                  {isProximityAlertActive ? 'เปิดใช้งานอยู่' : 'ปิดการใช้งาน'}
                </button>
              </div>

              <div className="bg-[#121319] border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                <div>
                  <span className="text-xs font-bold text-white block">เครื่องมือนำทางกลุ่มแบบรวดเร็ว</span>
                  <span className="text-[10px] text-slate-400 mt-0.5">เปิด Map จัดกลุ่มทริปรวมกัน {routePoints.length} สถานที่</span>
                </div>
                <button
                  disabled={routePoints.length === 0}
                  onClick={() => {
                    if (routePoints.length === 0) return;
                    const coords = sortedPlaylistLocations.map(p => `${p.lat},${p.lng}`).join('/');
                    window.open(`https://www.google.com/maps/dir/${coords}`, '_blank');
                    showToast('เปิดคิวเส้นทาง Google Maps แบบรวมพิกัดสำเร็จ!', 'success');
                  }}
                  className={`px-4 py-2.5 rounded-xl text-[10px] font-bold transition flex items-center gap-1.5 ${
                    routePoints.length > 0 
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow' 
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <Navigation size={12} className="stroke-[2.5px]" />
                  <span>นำทางกลุ่มพิกัดทริป 🗺️</span>
                </button>
              </div>
            </div>

            {/* Route Points List Wrapper */}
            <div className="bg-[#121319] border border-slate-810 rounded-2xl p-6 shadow-md flex-1">
              <h3 className="text-xs font-black text-slate-300 uppercase tracking-widest mb-4">คิวลำดับท่องเที่ยวของวัน</h3>
              
              {routePoints.length === 0 ? (
                <div className="text-center py-20 bg-slate-950/20 border border-dashed border-slate-800/80 rounded-2xl">
                  <span className="text-5xl block mb-3">📅</span>
                  <h4 className="text-sm font-bold text-slate-350">ยังไม่มีรายการคิวงานจัดเก็บในวันนี้</h4>
                  <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                    เพิ่มสถานที่ลงใน "คิวงานวันนี้" โดยการเลือกปุ่ม "บวก Playlist" บนหัวรายละเอียดหมุดในแผนที่หรือแดชบอร์ดพิกัดสะสม
                  </p>
                </div>
              ) : (
                <div className="space-y-3.5 pr-1">
                  {sortedPlaylistLocations.map((loc, idx) => {
                    const isChecked = !!loc.checkedInAt;
                    const dKm = userLocation ? calculateDistanceKm(userLocation.lat, userLocation.lng, loc.lat, loc.lng) : null;
                    const distStr = dKm !== null ? (dKm < 1 ? `${(dKm * 1000).toFixed(0)} ม.` : `${dKm.toFixed(2)} กม.`) : null;

                    return (
                      <div 
                        key={loc.id}
                        className={`flex flex-col md:flex-row md:items-center justify-between p-4 rounded-2xl border transition duration-200 ${
                          isChecked 
                            ? 'bg-[#152B1E] border-emerald-500/20 opacity-75' 
                            : 'bg-slate-950/30 border-slate-800/80 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-start gap-3.5 min-w-0 flex-1">
                          {/* Order Index Badge */}
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs ${
                            isChecked ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-300'
                          }`}>
                            #{idx + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm shrink-0">{getCategoryEmoji(loc.category)}</span>
                              <span className="text-[10px] text-slate-400 font-bold tracking-wider uppercase bg-[#17181F] border border-slate-800 px-2 py-0.5 rounded-full">{loc.category}</span>
                              {distStr && (
                                <span className="text-[10px] text-amber-500 font-mono font-bold flex items-center gap-1 bg-[#2C210E] border border-amber-500/10 px-2 py-0.5 rounded-full shrink-0">
                                  <Navigation size={9} /> {distStr}
                                </span>
                              )}
                            </div>
                            <h4 className="text-sm font-bold text-white truncate">{loc.name}</h4>
                            <p className="text-xs text-slate-400 mt-1 italic line-clamp-1">
                              {loc.notes || 'ยังไม่มีรายละเอียดโน้ต...'}
                            </p>
                            <span className="text-[9px] font-mono text-slate-500 mt-1 block">พิกัดทางละติจูดลองจิจูดจริง: {loc.lat.toFixed(6)}, {loc.lng.toFixed(6)}</span>
                          </div>
                        </div>

                        {/* Queue Controls Row */}
                        <div className="mt-4 md:mt-0 md:ml-4 flex items-center gap-2">
                          <button
                            onClick={() => handleCheckIn(loc.id)}
                            className={`flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-[10px] font-bold border transition ${
                              isChecked 
                                ? 'bg-emerald-600 border-emerald-500 text-white cursor-pointer' 
                                : 'bg-[#121319] hover:bg-[#1D1E26] border-slate-800 text-slate-300 pointer-events-auto cursor-pointer'
                            }`}
                          >
                            <CheckCircle2 size={12} />
                            <span>{isChecked ? 'เช็คอินแล้ว' : 'กดเช็คอินพิกัด'}</span>
                          </button>

                          <a
                            href={loc.googleMapLink || `https://www.google.com/maps?q=${loc.lat},${loc.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-indigo-600 hover:bg-indigo-700 text-white p-2.5 rounded-xl border border-indigo-500/20 transition cursor-pointer"
                            title="นำทางผ่านแผนที่ดาวเทียม"
                          >
                            <Navigation size={12} className="stroke-[2.5px]" />
                          </a>

                          <button
                            onClick={() => handleStartEdit(loc)}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-2.5 rounded-xl border border-slate-700 transition cursor-pointer"
                            title="แก้ไขรายละเอียดหมุดพิกัด"
                          >
                            <Edit3 size={11} />
                          </button>

                          <button
                            onClick={() => {
                              setRoutePoints(prev => prev.filter(p => p.id !== loc.id));
                              showToast('ลบพิกัดออกจากทริปจัดเก็บแล้ว', 'info');
                            }}
                            className="bg-rose-950/30 hover:bg-rose-600/20 border border-rose-500/10 text-rose-400 p-2.5 rounded-xl transition cursor-pointer"
                            title="นำพิกัดนี้ออกจาก Playlist"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2.3 Full-screen Waitlist / Missing Google Map Link Screen */}
      {currentView === 'pending-queue' && (
        <div id="fullscreen-pending-queue" className="w-full h-full min-h-screen bg-[#07080B] text-[#D8DADF] flex flex-col overflow-y-auto p-4 md:p-10 relative z-30 font-sans">
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-red-500/5 rounded-full blur-[140px] pointer-events-none"></div>

          <div className="max-w-4xl w-full mx-auto flex-1 flex flex-col z-10">
            {/* Header Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-slate-800 mb-8 mt-4 gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-500/20">
                  <AlertCircle size={22} />
                </div>
                <div>
                  <h1 className="text-xl md:text-2xl font-black text-white tracking-wide">
                    <span>ตารางประเมินตรวจสอบข้อมูล (รอกรอกประเมินลิงก์)</span>
                    {queueLocations.length > 0 && (
                      <span className="text-[11px] bg-rose-500/20 border border-rose-500/20 text-rose-400 font-bold px-2 py-0.5 rounded-full ml-3 inline-block">
                        {queueLocations.length} หมุดต้องการขยาย
                      </span>
                    )}
                  </h1>
                  <p className="text-xs text-slate-400 mt-1">คัดเลือกพิกัดที่ขาดลิ้งก์นำทาง Google Maps แผนที่ต้นขั้ว เพื่อความครบสมบูรณ์ของพิกัดสะสมจังหวัดนนทบุรี</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCurrentView('dashboard')}
                className="px-4 py-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl font-bold text-xs transition duration-200 cursor-pointer flex items-center gap-1.5 self-end sm:self-auto"
              >
                <ChevronRight size={14} className="rotate-180" /> กลับหน้าแรก
              </button>
            </div>

            {/* List */}
            <div className="bg-[#121319] border border-slate-800 rounded-2xl p-6 shadow-md flex-1">
              <h3 className="text-xs font-black text-slate-300 uppercase tracking-widest mb-4">พิกัดขาดลิ้งก์ Google Maps / ข้อมูลไม่สมบูรณ์</h3>

              {queueLocations.length === 0 ? (
                <div className="text-center py-20 bg-slate-950/20 border border-dashed border-slate-800/80 rounded-2xl">
                  <span className="text-5xl block mb-3">🎉</span>
                  <h4 className="text-sm font-bold text-emerald-450">สุดยอดข้อมูลไทยสมบูรณ์แบบ!</h4>
                  <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                    พิกัดสะสมทุกลายตำแหน่งปักหมุดมีข้อมูล Google Maps และพิกัดเรียบลำดับถูกต้อง แม่นยำครบถ้วนแล้ว ไม่มีพิกัดในกลุ่มรอตรวจสอบ
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3.5 pr-1">
                  {queueLocations.map(loc => (
                    <div 
                      key={loc.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-[#181921] border border-slate-800 hover:border-slate-700 rounded-2xl transition duration-200 gap-4"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-sm shrink-0">{getCategoryEmoji(loc.category)}</span>
                          <span className="text-[9px] text-[#FF6B00] font-mono tracking-wider font-bold bg-[#FF6B00]/10 px-2 py-0.5 rounded-full">{loc.lat.toFixed(6)}, {loc.lng.toFixed(6)}</span>
                          <span className="text-[9px] text-slate-400 font-bold bg-slate-800 px-2 py-0.5 rounded-full uppercase">{loc.category}</span>
                        </div>
                        <h4 className="text-sm font-bold text-white truncate">{loc.name}</h4>
                        <p className="text-xs text-slate-400 mt-1 italic line-clamp-1">
                          {loc.notes || 'ยังไม่มีบันทึกข้อมูลรายละเอียดเพิ่มเติมย่อย...'}
                        </p>
                        {userLocation && (loc as any).dist !== undefined && (
                          <div className="text-[10px] font-bold text-emerald-500 mt-1.5 flex items-center gap-1">
                            <Navigation size={9} /> ห่างจากที่อยู่ปัจจุบันของคุณ {((loc as any).dist * 1000).toFixed(0)} เมตร
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 self-end sm:self-auto">
                        <button
                          onClick={() => {
                            setActiveLocationId(loc.id);
                            handleStartEdit(loc);
                          }}
                          className="flex items-center gap-1.5 text-xs font-bold bg-[#FF6B00]/15 hover:bg-[#FF6B00] text-[#FF6B00] hover:text-white px-4 py-2.5 rounded-xl border border-[#FF6B00]/35 transition cursor-pointer text-center"
                        >
                          <Edit3 size={12} />
                          <span>กรอกพิกัดลิงก์พวง</span>
                        </button>
                        <button
                          onClick={() => {
                            setCurrentView('map');
                            setActiveLocationId(loc.id);
                            handleMapFocus(loc.lat, loc.lng, 15);
                            showToast(`บินไปสำรวจ ${loc.name} เรียบร้อย!`, 'info');
                          }}
                          className="bg-slate-850 hover:bg-slate-800 text-slate-300 px-3.5 py-2.5 rounded-xl border border-slate-700/80 transition cursor-pointer"
                          title="บินไปพิกัดจริงบนแผนที่"
                        >
                          <Navigation size={12} className="stroke-[2px]" />
                        </button>
                      </div>

                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2.4 Full-screen Statistics Report Screen */}
      {currentView === 'stats' && (
        <div id="fullscreen-stats-report" className="w-full h-full min-h-screen bg-[#07080B] text-[#D8DADF] flex flex-col overflow-y-auto p-4 md:p-10 relative z-30 font-sans">
          <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[140px] pointer-events-none"></div>

          <div className="max-w-4xl w-full mx-auto flex-1 flex flex-col z-10">
            {/* Header Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-slate-800 mb-8 mt-4 gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-[#9b80e4] rounded-2xl text-white shadow-lg shadow-[#9b80e4]/25">
                  <BarChart2 size={22} />
                </div>
                <div>
                  <h1 className="text-xl md:text-2xl font-black text-white tracking-wide">รายงานสรุปงานวิเคราะห์ทางพิกัดสำรวจ</h1>
                  <p className="text-xs text-slate-400 mt-1">บทสรุปความก้าวหน้าและการจำแนกข้อมูลประเภทพิกัดของจังหวัดนนทบุรี</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCurrentView('dashboard')}
                className="px-4 py-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl font-bold text-xs transition duration-200 cursor-pointer flex items-center gap-1.5 self-end sm:self-auto"
              >
                <ChevronRight size={14} className="rotate-180" /> กลับหน้าแรก
              </button>
            </div>

            {/* Content stats grids */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              
              {/* Bento Card 1: Total Locations */}
              <div className="p-6 bg-[#121319] border border-slate-800 rounded-2xl flex flex-col justify-between shadow-sm">
                <span className="text-[10px] font-bold text-[#515560] uppercase tracking-wider block">พิกัดจัดเก็บทั้งหมด</span>
                <span className="text-5xl font-extrabold text-white mt-4 block font-sans">{statsSummary.total} <span className="text-sm text-slate-400 font-normal">พิกัด</span></span>
                <span className="text-xs text-indigo-400 block mt-4 font-semibold">★ คะแนนเฉลี่ยความพอใจ {statsSummary.avgRating} / 5 ดาว</span>
              </div>

              {/* Bento Card 2: Check-In Rate */}
              <div className="p-6 bg-[#121319] border border-slate-800 rounded-2xl flex flex-col justify-between shadow-sm">
                <span className="text-[10px] font-bold text-[#515560] uppercase tracking-wider block">อัตราเช็กอินสำรวจท่องเที่ยว</span>
                <div className="flex items-center gap-3 mt-4">
                  <span className="text-4xl font-extrabold text-emerald-400 block font-sans">{statsSummary.visitedPercentage}%</span>
                  <div className="flex-1 bg-slate-800 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-emerald-400 h-full rounded-full" style={{ width: `${statsSummary.visitedPercentage}%` }}></div>
                  </div>
                </div>
                <span className="text-xs text-slate-400 block mt-4">ไปเช็กอินแล้ว {statsSummary.visitedCount} จุด / รอดำเนินการ {statsSummary.pendingCount} จุด</span>
              </div>

              {/* Bento Card 3: Saved Progress ratio */}
              <div className="p-6 bg-[#121319] border border-slate-800 rounded-2xl flex flex-col justify-between shadow-sm">
                <span className="text-[10px] font-bold text-[#515560] uppercase tracking-wider block">คุณภาพความครบถ้วนพวงลิงก์</span>
                <div className="flex items-center gap-3 mt-4">
                  {locations.length > 0 ? (
                    <span className="text-4xl font-extrabold text-[#FF6B00] block">
                      {Math.round(((locations.length - queueLocations.length) / locations.length) * 100)}%
                    </span>
                  ) : <span className="text-4xl font-extrabold text-[#FF6B00] block">100%</span>}
                  <div className="flex-1 bg-slate-800 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-[#FF6B00] h-full rounded-full" style={{ width: `${locations.length > 0 ? Math.round(((locations.length - queueLocations.length) / locations.length) * 100) : 100}%` }}></div>
                  </div>
                </div>
                <span className="text-xs text-slate-400 block mt-4">สมบูรณ์แล้ว {locations.length - queueLocations.length} พิกัด / รอเก็บข้อมูล {queueLocations.length} พิกัด</span>
              </div>

              {/* Category distribution bar charts list inside full screen card */}
              <div className="p-6 bg-[#121319] border border-slate-800 rounded-2xl md:col-span-3 space-y-4 shadow-sm">
                <span className="text-[11px] font-bold text-[#515560] uppercase tracking-wider block">จำแนกโครงสร้างสัดส่วนตามประเภทปักหมุด</span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                  {[
                    { label: 'หมู่บ้านไทย (Village)', value: statsSummary.categoriesCount.Village || 0, color: 'bg-emerald-400', emoji: '🏡', icon: <Home size={13} className="text-emerald-400 mr-2 inline" /> },
                    { label: 'ชุมชนและหน่วยงาน (Community)', value: statsSummary.categoriesCount.Community || 0, color: 'bg-blue-400', emoji: '🤝', icon: <Users size={13} className="text-blue-400 mr-2 inline" /> },
                    { label: 'อาคาร / สำนักงาน (Office)', value: statsSummary.categoriesCount.Office || 0, color: 'bg-rose-450', emoji: '🏢', icon: <Building2 size={13} className="text-rose-450 mr-2 inline" /> },
                    { label: 'คอนโดมิเนียมย่านหลัก (Condo)', value: statsSummary.categoriesCount.Condo || 0, color: 'bg-amber-400', emoji: '🌆', icon: <MapPinned size={13} className="text-amber-400 mr-2 inline" /> },
                  ].map((categoryItem, i) => {
                    const pct = statsSummary.total > 0 ? Math.round((categoryItem.value / statsSummary.total) * 100) : 0;
                    return (
                      <div key={i} className="text-xs space-y-2.5 bg-[#17181F] p-4 rounded-xl border border-slate-800">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-[#9BA1B0] font-semibold flex items-center">
                            <span className="mr-1">{categoryItem.emoji}</span>
                            <span>{categoryItem.label}</span>
                          </span>
                          <span className="text-white font-mono font-black text-xs">{categoryItem.value} พิกัด ({pct}%)</span>
                        </div>
                        <div className="w-full bg-slate-850 h-3 rounded-full overflow-hidden">
                          <div className={`h-full ${categoryItem.color} rounded-full`} style={{ width: `${pct}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* 2.5 Full-screen System Settings & Control Dashboard Screen */}
      {currentView === 'settings' && (
        <div id="fullscreen-settings-control" className="w-full h-full min-h-screen bg-[#07080B] text-[#D8DADF] flex flex-col overflow-y-auto p-4 md:p-10 relative z-30 font-sans">
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#FF6B00]/5 rounded-full blur-[140px] pointer-events-none"></div>

          <div className="max-w-2xl w-full mx-auto flex-1 flex flex-col z-10">
            {/* Header Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-slate-800 mb-8 mt-4 gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-slate-900 border border-slate-850 rounded-2xl text-[#FF6B00] shadow-lg shadow-amber-500/10">
                  <Settings size={22} className="text-[#FF6B00]" />
                </div>
                <div>
                  <h1 className="text-xl md:text-2xl font-black text-white tracking-wide">สำรองข้อมูลและการควบคุมระบบสำรวจ</h1>
                  <p className="text-xs text-slate-400 mt-1">ส่งออก กู้คืนข้อมูลพิกัด หรือติดตั้งไทยแลนด์สเปกเริ่มต้น</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCurrentView('dashboard')}
                className="px-4 py-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl font-bold text-xs transition duration-200 cursor-pointer flex items-center gap-1.5 self-end sm:self-auto"
              >
                <ChevronRight size={14} className="rotate-180" /> กลับหน้าแรก
              </button>
            </div>

            {/* Control Panel Bento list */}
            <div className="bg-[#121319] border border-slate-800 rounded-2xl p-6 shadow-md space-y-6">
              
              {/* Export Block */}
              <div className="space-y-2">
                <h4 className="text-[#9BA1B0] font-bold text-xs uppercase tracking-wider">สำรองและส่งออกข้อมูลพิกัดทั้งหมด (Backup JSON)</h4>
                <p className="text-slate-450 text-xs leading-relaxed">
                  กดบันทึกพิกัดสะสมทั้งหมดของคุณ ออกมาในรูปแบบไฟล์เอกสารเอกลักษณ์ JSON เพื่อเก็บไว้กู้คืนหรือเปลี่ยนย้ายเครื่องสำรวจภูมิศาสตร์
                </p>
                <button 
                  onClick={() => {
                    handleExportData();
                    showToast('ดาวน์โหลดฐานข้อมูลพิกัดท่องเที่ยวสำเร็จ!', 'success');
                  }}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 py-3 px-5 bg-slate-800 hover:bg-slate-700 hover:border-slate-600 text-white rounded-xl border border-slate-750 transition font-bold text-xs cursor-pointer"
                >
                  <Download size={14} />
                  <span>ส่งออกข้อมูลสำรวจพิกัด (Export JSON)</span>
                </button>
              </div>

              {/* Import Block */}
              <div className="space-y-2 pt-4 border-t border-slate-810">
                <h4 className="text-[#9BA1B0] font-bold text-xs uppercase tracking-wider">นำเข้าพิกัดสำรวจพิกัดใหม่ (Import JSON)</h4>
                <p className="text-slate-450 text-xs leading-relaxed">
                  นำไฟล์ข้อมูลสำรวจที่มีอาร์เรย์พิกัดถูกต้อง เข้ามาเขียนทับ/อิงผสมผสานรวมกับฐานข้อมูลดั่งเดิมของคุณในทันที
                </p>
                
                <label className="inline-flex items-center justify-center gap-2 py-3 px-5 bg-[#FF6B00]/10 hover:bg-[#FF6B00]/20 text-[#FF6B00] border border-[#FF6B00]/30 rounded-xl transition font-bold text-xs cursor-pointer w-full sm:w-auto">
                  <Upload size={14} />
                  <span>เลือกไฟล์เพื่อนำเข้า (Import JSON)</span>
                  <input 
                    type="file" 
                    accept=".json" 
                    onChange={(e) => {
                      handleImportData(e);
                      setCurrentView('dashboard');
                    }} 
                    className="hidden" 
                  />
                </label>
              </div>

              {/* Hard reset Block */}
              <div className="space-y-3 pt-4 border-t border-[#FF6B00]/10">
                <h4 className="text-rose-450 font-bold text-xs uppercase tracking-wider">ล้างกระดานและดาวน์โหลดไทยแลนด์สเปกเริ่มต้น</h4>
                <p className="text-slate-450 text-xs leading-relaxed">
                  ลบรายละเอียดสถานที่จัดเก็บส่วนบุคคลทิ้งถาวร แล้วทำการติดตั้งข้อมูลตัวเลือกแม่แบบ <strong>"5 แลนด์มาร์กสวยที่สุดในประเทศไทย"</strong> มาเป็นค่าตั้งต้นแรก
                </p>
                <button 
                  onClick={() => {
                    handleResetToDefaults();
                    setCurrentView('dashboard');
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-rose-950/40 hover:bg-rose-900 border border-rose-900/50 text-rose-350 rounded-xl transition text-xs font-bold cursor-pointer"
                >
                  <RotateCcw size={14} />
                  <span>ล้างข้อมูลพิกัดสะสมส่วนตัว และติดตั้งแม่แบบไทยแลนด์ดั้งเดิม</span>
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {currentView === 'dashboard' && (
        <div id="new-mobile-dashboard" className="w-full h-full bg-[#f8fbff] text-slate-800 flex flex-col overflow-y-auto relative z-30 font-sans">
          
          {/* Blue gradient header background */}
          <div className="absolute top-0 left-0 w-full h-[320px] bg-gradient-to-br from-[#1b88e9] to-[#0d6ac1] z-0 rounded-b-[40px] shadow-sm pointer-events-none"></div>

          {/* Header Title */}
          <header className="relative z-10 pt-12 pb-6 px-6 flex justify-center items-center">
            <h1 className="text-xl font-bold text-white tracking-wide shadow-sm">หน้าแรก</h1>
            <div className="absolute right-6 flex gap-3">
               <button onClick={() => setCurrentView('settings')} className="w-8 h-8 rounded-full flex items-center justify-center text-white"><Settings size={20}/></button>
            </div>
          </header>

          {/* Top 2 Cards */}
          <div className="relative z-10 px-5 grid grid-cols-2 gap-4 mb-8 mt-4">
            
            <div className="bg-white rounded-[24px] p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-50 flex flex-col relative overflow-hidden group">
              <div className="flex items-center gap-3 mb-2 z-10">
                <div className="w-10 h-10 bg-[#fbbc05]/10 rounded-2xl flex items-center justify-center text-[#fbbc05]">
                  <ClipboardList size={20} className="stroke-[2px]"/>
                </div>
                <div className="flex-1">
                  <span className="text-[13px] font-bold text-slate-700 block leading-tight">พิกัดทั้งหมด</span>
                </div>
              </div>
              <div className="text-right z-10 mt-3">
                <span className="text-4xl font-light text-[#1b88e9] tracking-tight">{statsSummary.total}</span>
              </div>
            </div>

            <div className="bg-white rounded-[24px] p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-50 flex flex-col relative overflow-hidden group">
              <div className="flex items-center gap-3 mb-2 z-10">
                <div className="w-10 h-10 bg-[#1b88e9]/10 rounded-2xl flex items-center justify-center text-[#1b88e9]">
                  <CalendarDays size={20} className="stroke-[2px]"/>
                </div>
                <div className="flex-1">
                  <span className="text-[13px] font-bold text-slate-700 block leading-tight">คิวงานวันนี้</span>
                </div>
              </div>
              <div className="text-right z-10 mt-3">
                <span className="text-4xl font-light text-[#1b88e9] tracking-tight">{routePoints.length}</span>
              </div>
            </div>

          </div>

          {/* Grid Menu Icons */}
          <div className="relative z-10 bg-white flex-1 rounded-t-[40px] pt-10 px-6 pb-32 shadow-[0_-10px_40px_rgba(0,0,0,0.04)]">
            <div className="grid grid-cols-4 gap-y-8 gap-x-2">
               
              <button 
                onClick={() => {
                  setCurrentView('add-location');
                  setIsCreating(true);
                  setIsEditing(false);
                  setSelectedMapPoint(null);
                  setFormName('');
                  if (!lockType) setFormCategory('Village');
                  setFormNotes('');
                  setFormLat('');
                  setFormLng('');
                  setFormCoords('');
                  setFormGoogleMapLink('');
                  if (!lockHouseNumber) setFormHouseNumber('');
                  if (!lockSoi) setFormSoi('');
                  if (!lockMoo) setFormMoo('');
                  if (!lockTambon) setFormTambon('');
                  if (!lockAmphoe) setFormAmphoe('');
                }}
                className="flex flex-col items-center gap-3 group cursor-pointer"
              >
                <div className="w-[56px] h-[56px] rounded-full bg-[#1b88e9] text-white flex items-center justify-center shadow-[0_8px_16px_rgba(27,136,233,0.25)] transition-transform group-hover:scale-105 active:scale-95 duration-200">
                   <MapPin size={24} className="stroke-[2px]"/>
                </div>
                <span className="text-[11px] font-bold text-slate-600 text-center leading-tight">เพิ่มหมุด</span>
              </button>

              <button 
                onClick={() => {
                  setCurrentView('map');
                  if (isMobile) setMobileActiveTab('map');
                }}
                className="flex flex-col items-center gap-3 group cursor-pointer"
              >
                <div className="w-[56px] h-[56px] rounded-full bg-[#ffb902] text-white flex items-center justify-center shadow-[0_8px_16px_rgba(255,185,2,0.25)] transition-transform group-hover:scale-105 active:scale-95 duration-200">
                   <MapIcon size={24} className="stroke-[2px]"/>
                </div>
                <span className="text-[11px] font-bold text-slate-600 text-center leading-tight">แผนที่รวม</span>
              </button>

              <button 
                onClick={() => {
                  setCurrentView('table');
                }}
                className="flex flex-col items-center gap-3 group cursor-pointer"
              >
                <div className="w-[56px] h-[56px] rounded-full bg-[#0abb59] text-white flex items-center justify-center shadow-[0_8px_16px_rgba(10,187,89,0.25)] transition-transform group-hover:scale-105 active:scale-95 duration-200">
                   <ClipboardList size={24} className="stroke-[2px]"/>
                </div>
                <span className="text-[11px] font-bold text-slate-600 text-center leading-tight">พิกัดทั้งหมด</span>
              </button>

              <button 
                onClick={() => {
                  setCurrentView('map');
                  if (isMobile) setMobileActiveTab('list');
                }}
                className="flex flex-col items-center gap-3 group cursor-pointer"
              >
                <div className="w-[56px] h-[56px] rounded-full bg-[#ff6849] text-white flex items-center justify-center shadow-[0_8px_16px_rgba(255,104,73,0.25)] transition-transform group-hover:scale-105 active:scale-95 duration-200">
                   <Search size={24} className="stroke-[2px]"/>
                </div>
                <span className="text-[11px] font-bold text-slate-600 text-center leading-tight">ค้นหาพิกัด</span>
              </button>

              <button 
                onClick={() => setCurrentView('queue-today')}
                className="flex flex-col items-center gap-3 group cursor-pointer relative"
              >
                {routePoints.length > 0 && <span className="absolute top-0 right-1 w-[20px] h-[20px] bg-[#ef4444] rounded-full border-2 border-white text-[10px] text-white flex items-center justify-center font-bold z-10 shadow-sm">{routePoints.length}</span>}
                <div className="w-[56px] h-[56px] rounded-full bg-[#0cc75c] text-white flex items-center justify-center shadow-[0_8px_16px_rgba(12,199,92,0.25)] transition-transform group-hover:scale-105 active:scale-95 duration-200">
                   <CalendarDays size={24} className="stroke-[2px]"/>
                </div>
                <span className="text-[11px] font-bold text-slate-600 text-center leading-tight">คิวงานวันนี้</span>
              </button>

              <button 
                onClick={() => setCurrentView('pending-queue')}
                className="flex flex-col items-center gap-3 group cursor-pointer relative"
              >
                {queueLocations.length > 0 && <span className="absolute top-0 right-1 w-[20px] h-[20px] bg-[#ef4444] rounded-full border-2 border-white text-[10px] text-white flex items-center justify-center font-bold z-10 shadow-sm">{queueLocations.length}</span>}
                <div className="w-[56px] h-[56px] rounded-full bg-[#1c81ef] text-white flex items-center justify-center shadow-[0_8px_16px_rgba(28,129,239,0.25)] transition-transform group-hover:scale-105 active:scale-95 duration-200">
                   <AlertCircle size={24} className="stroke-[2px]"/>
                </div>
                <span className="text-[11px] font-bold text-slate-600 text-center leading-tight">รอกรอกลิงก์</span>
              </button>

              <button 
                onClick={() => setCurrentView('stats')}
                className="flex flex-col items-center gap-3 group cursor-pointer"
              >
                <div className="w-[56px] h-[56px] rounded-full bg-[#9b80e4] text-white flex items-center justify-center shadow-[0_8px_16px_rgba(155,128,228,0.25)] transition-transform group-hover:scale-105 active:scale-95 duration-200">
                   <BarChart2 size={24} className="stroke-[2px]"/>
                </div>
                <span className="text-[11px] font-bold text-slate-600 text-center leading-tight">สถิติข้อมูล</span>
              </button>

              <button 
                onClick={() => setIsProximityAlertActive(!isProximityAlertActive)}
                className="flex flex-col items-center gap-3 group cursor-pointer"
              >
                <div className={`w-[56px] h-[56px] rounded-full text-white flex items-center justify-center transition-transform group-hover:scale-105 active:scale-95 duration-200 ${isProximityAlertActive ? 'bg-[#ffb902] shadow-[0_8px_16px_rgba(255,185,2,0.25)]' : 'bg-slate-300 shadow-sm'}`}>
                   <Activity size={24} className="stroke-[2px]"/>
                </div>
                <span className="text-[11px] font-bold text-slate-600 text-center leading-tight">ระบบเตือน</span>
              </button>

              <button 
                onClick={() => {
                  setIsRulerMode(!isRulerMode);
                  if (!isRulerMode) {
                     showToast('เลือกจุดบนแผนที่เพื่อวัดระยะทาง', 'info');
                     setCurrentView('map');
                  }
                }}
                className="flex flex-col items-center gap-3 group cursor-pointer"
              >
                <div className="w-[56px] h-[56px] rounded-full bg-[#0abb59] text-white flex items-center justify-center shadow-[0_8px_16px_rgba(10,187,89,0.25)] transition-transform group-hover:scale-105 active:scale-95 duration-200">
                   <Sparkles size={24} className="stroke-[2px]"/>
                </div>
                <span className="text-[11px] font-bold text-slate-600 text-center leading-tight">ไม้วัดระยะ</span>
              </button>

              <button 
                onClick={() => {
                  setIsAreaMode(!isAreaMode);
                  if (!isAreaMode) {
                     showToast('วาดโพลิกอนเพื่อคำนวณพื้นที่', 'info');
                     setCurrentView('map');
                  }
                }}
                className="flex flex-col items-center gap-3 group cursor-pointer"
              >
                <div className="w-[56px] h-[56px] rounded-full bg-[#ff6849] text-white flex items-center justify-center shadow-[0_8px_16px_rgba(255,104,73,0.25)] transition-transform group-hover:scale-105 active:scale-95 duration-200">
                   <Layers size={24} className="stroke-[2px]"/>
                </div>
                <span className="text-[11px] font-bold text-slate-600 text-center leading-tight">วัดพื้นที่</span>
              </button>

            </div>
          </div>
          
          {/* Bottom Bar Navigation */}
          <div className="fixed bottom-0 left-0 w-full h-[75px] bg-white shadow-[0_-10px_20px_rgba(0,0,0,0.04)] flex items-center justify-around z-[100] pb-2 rounded-t-3xl border-t border-slate-50">
             <button onClick={() => setCurrentView('dashboard')} className="flex flex-col items-center gap-1.5 mt-2 text-[#1b88e9]">
                <Home size={24} className="fill-[#1b88e9] stroke-[#1b88e9]" />
                <span className="text-[10px] font-bold">หน้าแรก</span>
             </button>
             <button onClick={() => setCurrentView('table')} className="flex flex-col items-center gap-1.5 mt-2 text-slate-400 hover:text-[#1b88e9] transition-colors">
                <Search size={22} className="stroke-[2px]" />
                <span className="text-[10px] font-bold">ค้นหา</span>
             </button>
             <button onClick={() => setCurrentView('settings')} className="flex flex-col items-center gap-1.5 mt-2 text-slate-400 hover:text-[#1b88e9] transition-colors font-bold cursor-pointer">
                <Users size={22} className="stroke-[2px]" />
                <span className="text-[10px] font-bold">ฉัน</span>
             </button>
          </div>

        </div>
      )}
      {/* 2. Interactive Map Screen (Visible when currentView === 'map') */}
      <div id="interactive-map-workspace" className={`flex flex-col lg:flex-row h-screen w-full select-none bg-slate-50 overflow-hidden ${currentView === 'map' ? 'flex-1 relative' : 'absolute top-0 left-0 opacity-0 pointer-events-none z-[-999]'}`}>
        
        {/* SIDEBAR PANEL : Operations, Search & CRUD */}
        <aside 
          id="sidebar-panel" 
          style={isMobile ? {
            height: mobileSheetState === 'collapsed' ? '56px' : mobileSheetState === 'peek' ? '45vh' : '82vh',
            transition: 'height 300ms cubic-bezier(0.4, 0, 0.2, 1)'
          } : undefined}
          className={
            isMobile 
              ? "fixed bottom-16 left-0 right-0 bg-white dark:bg-slate-950 rounded-t-3xl shadow-[0_-10px_35px_rgba(0,0,0,0.15)] border-t border-slate-200/80 dark:border-slate-800/80 z-[1010] flex flex-col pointer-events-auto overflow-hidden pb-4"
              : `fixed right-4 top-4 bottom-4 w-96 xl:w-[420px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800/80 z-[1010] flex flex-col pointer-events-auto overflow-hidden transition-all duration-300 ease-out ${
                  isSidebarOpen 
                    ? "translate-x-0 opacity-100" 
                    : "translate-x-[460px] opacity-0 pointer-events-none"
                }`
          }
        >
          
          {/* Mobile Sheet Drag Handle Bar with Swipe Gestures */}
          {isMobile && (
            <div 
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onClick={() => {
                if (mobileSheetState === 'collapsed') setMobileSheetState('peek');
                else if (mobileSheetState === 'peek') setMobileSheetState('expanded');
                else setMobileSheetState('collapsed');
              }}
              className="w-full py-2.5 bg-gradient-to-r from-slate-950 to-slate-900 flex flex-col items-center justify-center cursor-pointer select-none border-b border-slate-800/40"
            >
              <div className="w-12 h-1 bg-slate-500 rounded-full hover:bg-slate-300 transition-colors"></div>
            </div>
          )}

          {/* Elegant Corporate Header (Adaptive for Mobile Theme and Height State) */}
          {isMobile ? (
            mobileSheetState === 'collapsed' ? (
              <div 
                onClick={() => setMobileSheetState('peek')}
                className="h-[36px] bg-gradient-to-r from-slate-950 to-slate-900 px-4 flex items-center justify-between cursor-pointer select-none text-white flex-shrink-0"
              >
                <div className="flex items-center gap-2">
                  <span className="p-0.5 bg-blue-600 rounded text-white">
                    <MapPinned size={11} />
                  </span>
                  <span className="text-[11px] font-bold font-sans">
                    รายการพิกัดสถานที่ท่องเที่ยว ({locations.length} จุด)
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 flex items-center gap-1 font-bold">
                  <span>รูดปัดขึ้น</span>
                  <ChevronUp size={11} className="animate-bounce" />
                </span>
              </div>
            ) : (
              <div className="p-3.5 border-b border-slate-800/40 bg-gradient-to-r from-slate-950 to-slate-900 text-white relative flex-shrink-0">
                <div className="flex items-center justify-between mb-1.5">
                  <button 
                    id="btn-back-to-dash"
                    onClick={() => setCurrentView('dashboard')}
                    className="flex items-center gap-1 bg-slate-850 hover:bg-slate-800 text-slate-300 px-2 py-0.5 rounded-lg text-[10px] font-bold transition cursor-pointer"
                  >
                    <LayoutDashboard size={11} />
                    <span>กลับสู่แดชบอร์ด</span>
                  </button>
                  
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      <span className="w-1 h-1 bg-emerald-400 rounded-full mr-1 animate-ping"></span>
                      คลาวด์พร้อม
                    </span>
                    <button
                      onClick={() => setMobileSheetState('collapsed')}
                      className="p-1 bg-slate-850 hover:bg-slate-850 text-slate-400 rounded-md transition"
                    >
                      <ChevronDown size={11} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-1.5">
                  <span className="p-1 bg-blue-600 rounded bg-blue-600 text-white">
                    <MapPinned size={11} />
                  </span>
                  <h1 className="text-[11px] font-bold tracking-tight text-white font-sans">
                    {isCreating ? '➕ กำลังสร้างและจัดเก็บพิกัดใหม่' : isEditing ? '✏️ กำลังแก้ไขข้อมูลพิกัดสถานที่' : `📍 รายการหมุดทั้งหมด (${locations.length} จุด)`}
                  </h1>
                </div>
              </div>
            )
          ) : (
            <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-slate-950 to-slate-900 text-white relative flex-shrink-0">
              <div className="flex items-center justify-between mb-2">
                <button 
                  id="btn-back-to-dash"
                  onClick={() => setCurrentView('dashboard')}
                  className="flex items-center gap-1 bg-slate-800 hover:bg-slate-705 hover:text-white px-2.5 py-1 rounded-lg text-slate-300 transition text-xs font-semibold cursor-pointer"
                >
                  <LayoutDashboard size={13} />
                  <span>กลับสู่แดชบอร์ด</span>
                </button>
                
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center px-1.5 py-1 rounded-full text-[10px] font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 line-baseline">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full mr-1 animate-ping"></span>
                    เชื่อมต่อสมบูรณ์
                  </span>
                  {!isMobile && (
                    <button 
                      onClick={() => setIsSidebarOpen(false)}
                      className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-all cursor-pointer border border-slate-750"
                      title="ซ่อนแผงควบคุม"
                    >
                      <ChevronRight size={13} />
                    </button>
                  )}
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
          )}

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
                  
                  {/* Category Selection Component */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-xs font-semibold text-slate-350">
                        เลือกประเภทสถานที่
                      </label>
                      <button 
                        type="button" 
                        onClick={() => setLockType(!lockType)} 
                        className={`flex items-center gap-1 px-2 py-0.5 rounded-full border transition-all text-[10px] font-bold ${
                          lockType 
                            ? 'bg-amber-500/10 border-amber-500/50 text-amber-400' 
                            : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300'
                        } cursor-pointer`}
                        title={lockType ? "คลิกเพื่อปลดล็อคประเภท" : "คลิกเพื่อล็อคประเภทนี้ไว้"}
                      >
                        {lockType ? <Lock size={10} /> : <Unlock size={10} />}
                        <span>{lockType ? 'ล็อคแล้ว' : 'ไม่ล็อค'}</span>
                      </button>
                    </div>
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
                  <div className="flex gap-2">
                    <button
                      id="btn-form-get-current"
                      type="button"
                      onClick={handleGetCurrentLocationForForm}
                      className="flex-1 flex items-center justify-center gap-2 bg-slate-800 text-white font-bold text-xs py-2 px-3 rounded-lg hover:bg-slate-700 transition shadow cursor-pointer active:scale-98"
                    >
                      <MapPin size={13} className="text-[#FF6B00]" />
                      <span>ดึงตำแหน่ง GPS</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setLockGps(!lockGps)}
                      className={`px-3 py-2 rounded-lg border transition-all flex items-center gap-1.5 ${
                        lockGps 
                          ? 'bg-amber-500 border-amber-600 text-white shadow-lg' 
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                      } cursor-pointer`}
                      title={lockGps ? "ปลดล็อคการตามพิกัด" : "ล็อคพิกัดตามตำแหน่งจริง"}
                    >
                      {lockGps ? <Lock size={12} /> : <Unlock size={12} />}
                      <span className="text-[10px] font-bold">{lockGps ? 'ล็อค' : 'ล็อก'}</span>
                    </button>
                  </div>

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

                  {/* Thailand Specific Address Information Grid (HomeNo, Moo, Soi, Tambon) */}
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2.5 mt-2 text-[#E2E8F0]">
                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block border-b border-slate-800 pb-1 flex justify-between items-center">
                      🏢 ข้อมูลที่อยู่ประเทศไทย
                      <span className="text-[9px] text-amber-400 font-normal">คลิกรูปกุญแจเพื่อล็อคค่าที่อยู่ไว้</span>
                    </span>
                    
                    {/* Row 1: บ้านเลขที่ | หมู่ที่ */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-0.5 flex justify-between items-center">
                          <span>บ้านเลขที่ (House No.)</span>
                        </label>
                        <div className="relative flex items-center">
                          <input 
                            id="input-house-number"
                            type="text"
                            value={formHouseNumber}
                            onChange={(e) => setFormHouseNumber(e.target.value)}
                            placeholder="เช่น 123/45" 
                            className="w-full text-xxs pl-2.5 pr-7 py-1.5 bg-[#14161E] border border-slate-800 rounded-md text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                          <button 
                            type="button" 
                            onClick={() => setLockHouseNumber(!lockHouseNumber)} 
                            className={`absolute right-1.5 p-1 transition-all ${
                              lockHouseNumber 
                                ? 'text-amber-400 scale-110' 
                                : 'text-slate-600 hover:text-slate-400'
                            } cursor-pointer`}
                          >
                            {lockHouseNumber ? <Lock size={11} /> : <Unlock size={11} />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-0.5 flex justify-between items-center">
                          <span>หมู่ที่ (Moo)</span>
                        </label>
                        <div className="relative flex items-center">
                          <input 
                            id="input-moo"
                            type="text"
                            value={formMoo}
                            onChange={(e) => setFormMoo(e.target.value)}
                            placeholder="เช่น หมู่ 3" 
                            className="w-full text-xxs pl-2.5 pr-7 py-1.5 bg-[#14161E] border border-slate-800 rounded-md text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                          <button 
                            type="button" 
                            onClick={() => setLockMoo(!lockMoo)} 
                            className={`absolute right-1.5 p-1 transition-all ${
                              lockMoo 
                                ? 'text-amber-400 scale-110' 
                                : 'text-slate-600 hover:text-slate-400'
                            } cursor-pointer`}
                          >
                            {lockMoo ? <Lock size={11} /> : <Unlock size={11} />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Row 2: ซอย | ตำบล (ดรอปดาวน์/สไลด์เดอร์ หรือ พิมพ์ด่วน) */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-0.5 flex justify-between items-center">
                          <span>ซอย (Soi)</span>
                        </label>
                        <div className="relative flex items-center">
                          <input 
                            id="input-soi"
                            type="text"
                            value={formSoi}
                            onChange={(e) => setFormSoi(e.target.value)}
                            placeholder="เช่น ซอยมิตรไมตรี" 
                            className="w-full text-xxs pl-2.5 pr-7 py-1.5 bg-[#14161E] border border-slate-800 rounded-md text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                          <button 
                            type="button" 
                            onClick={() => setLockSoi(!lockSoi)} 
                            className={`absolute right-1.5 p-1 transition-all ${
                              lockSoi 
                                ? 'text-amber-400 scale-110' 
                                : 'text-slate-600 hover:text-slate-400'
                            } cursor-pointer`}
                          >
                            {lockSoi ? <Lock size={11} /> : <Unlock size={11} />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-0.5 flex justify-between items-center">
                          <span>ตำบล (Tambon)</span>
                        </label>
                        <div className="relative flex items-center">
                          <input 
                            id="input-tambon"
                            type="text"
                            list="tambons-list"
                            value={formTambon}
                            onChange={(e) => setFormTambon(e.target.value)}
                            placeholder="พิมพ์ หรือ เลือก..." 
                            className="w-full text-xxs pl-2.5 pr-7 py-1.5 bg-[#14161E] border border-slate-800 rounded-md text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                          <datalist id="tambons-list">
                            {NONTHABURI_TAMBONS.map((t) => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </datalist>
                          
                          <button 
                            type="button" 
                            onClick={() => setLockTambon(!lockTambon)} 
                            className={`absolute right-1.5 p-1 transition-all ${
                              lockTambon 
                                ? 'text-amber-400 scale-110' 
                                : 'text-slate-600 hover:text-slate-400'
                            } cursor-pointer`}
                          >
                            {lockTambon ? <Lock size={11} /> : <Unlock size={11} />}
                          </button>
                        </div>
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

                  {/* Merged Coordinates Input */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-350 mb-1">
                      พิกัด (ละติจูด, ลองจิจูด) <span className="text-red-500">*</span>
                    </label>
                    <input 
                      id="input-coordinates"
                      type="text" 
                      required
                      value={formCoords}
                      onChange={(e) => handleCoordsInputChange(e.target.value)}
                      placeholder="เช่น 13.7563, 100.5018"
                      className="w-full text-xs px-3 py-2 bg-slate-900 border border-slate-805 text-slate-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF6B00] font-mono"
                    />
                    {formLat !== '' && formLng !== '' && !isNaN(Number(formLat)) && !isNaN(Number(formLng)) ? (
                      <span className="text-[10px] text-emerald-400 font-mono block mt-1">
                        ✓ แยกสำเร็จ: {Number(formLat).toFixed(6)}, {Number(formLng).toFixed(6)}
                      </span>
                    ) : formCoords.trim() !== '' ? (
                      <span className="text-[10px] text-red-400 font-medium block mt-1">
                        ✗ รูปแบบพิกัดไม่ถูกต้อง (กรุณาป้อน ละติจูด, ลองจิจูด)
                      </span>
                    ) : null}
                  </div>

                  <div className="text-[11px] text-emerald-400/80 bg-emerald-950/40 p-2 rounded border border-emerald-800/30 mt-1">
                    💡 พิกัดจะถูกปรับค่าทศนิยมออโตเมติกให้แม่นยำระดับควบคุม ± ไม่เกิน 5 เมตรก่อนส่งขึ้นฐานข้อมูลคลาวด์
                  </div>

                  {/* NAVIGATION BUTTON BELOW LONGITUDE */}
                  {formLat !== '' && formLng !== '' && !isNaN(Number(formLat)) && !isNaN(Number(formLng)) && (
                    <div className="mt-1 flex gap-2 w-full">
                      <a
                        id="btn-form-navigate-gmap"
                        href={formGoogleMapLink ? formGoogleMapLink : `https://www.google.com/maps/dir/?api=1&destination=${formLat},${formLng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] py-2 px-2 rounded-lg transition shadow text-center cursor-pointer"
                      >
                        <Navigation size={12} />
                        <span>นำทาง (Map)</span>
                      </a>
                      <a
                        id="btn-form-streetview-gmap"
                        href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${formLat},${formLng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 inline-flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] py-2 px-2 rounded-lg transition shadow text-center cursor-pointer"
                      >
                        <Eye size={12} />
                        <span>ภาพสถานที่</span>
                      </a>
                    </div>
                  )}

                  {/* Save and Cancel Buttons inside sidebar form */}
                  <div className="pt-3 font-sans space-y-2">
                    <button 
                      id="btn-sidebar-save-form"
                      type="button" 
                      onClick={async (e) => {
                        if (isMobile) {
                          // Save directly on mobile to avoid modal overlays
                          if (!formName.trim()) {
                            alert('กรุณากรอกชื่อชื่อตำแหน่งข้อมูลพิกัด');
                            return;
                          }
                          await executeSaveLocation(isEditing);
                          setIsCreating(false);
                          setIsEditing(false);
                          setSelectedMapPoint(null);
                          setMobileSheetState('peek');
                          setMobileActiveTab('list');
                        } else {
                          // Open confirm modal on desktop
                          handleSaveForm(e);
                        }
                      }}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-blue-500/10"
                    >
                      <Save size={14} />
                      <span>บันทึกพิกัดตำแหน่งนี้</span>
                    </button>

                    <button 
                      id="btn-sidebar-cancel-form"
                      type="button" 
                      onClick={() => {
                        setIsCreating(false);
                        setIsEditing(false);
                        setSelectedMapPoint(null);
                        if (isMobile) {
                          setMobileActiveTab('list');
                          setMobileSheetState('peek');
                        }
                      }}
                      className="w-full bg-slate-800 hover:bg-slate-755 border border-slate-700/60 text-[#D8DADF] font-bold text-xs py-2.5 px-4 rounded-xl transition cursor-pointer text-center"
                    >
                      ยกเลิก
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
                    <div className="flex flex-col gap-1 mt-1">
                      <div className="flex items-center gap-2 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100 w-fit">
                        <span className="text-[10px] font-bold text-slate-500 font-mono">
                          {activeLocation.lat.toFixed(6)}, {activeLocation.lng.toFixed(6)}
                        </span>
                        <button
                          id="btn-copy-coords-desktop"
                          onClick={async () => {
                            await copyToClipboard(`${activeLocation.lat.toFixed(6)}, ${activeLocation.lng.toFixed(6)}`, 'คัดลอกพิกัดเรียบร้อยแล้ว!');
                          }}
                          className="p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-200/50 rounded transition-all cursor-pointer"
                          title="คัดลอกพิกัด"
                        >
                          <Copy size={11} />
                        </button>
                      </div>
                      {userLocation && (
                        <div className="text-[10px] font-bold text-slate-550 mt-0.5 flex items-center gap-1">
                          <Navigation size={10} className="text-emerald-500" />
                          ห่างจากคุณ {(calculateDistanceKm(userLocation.lat, userLocation.lng, activeLocation.lat, activeLocation.lng) * 1000).toFixed(0)} เมตร
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 bg-white/50 backdrop-blur p-0.5 rounded-lg border border-slate-200/30">
                    <button 
                      id="btn-edit-active"
                      onClick={() => handleStartEdit(activeLocation)} 
                      className="p-1.5 bg-white text-slate-600 hover:text-[#FF6B00] hover:bg-[#FF6B00]/5 rounded-lg border border-slate-200/60 shadow-sm transition cursor-pointer"
                      title="แก้ไขตำแหน่งพิกัดนี้"
                    >
                      <Edit3 size={13} />
                    </button>
                    <button 
                      id="btn-delete-active"
                      onClick={() => handleDeleteLocation(activeLocation.id)} 
                      className="p-1.5 bg-white text-slate-350 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-200/60 shadow-sm transition cursor-pointer"
                      title="ลบจุดนี้ออก"
                    >
                      <Trash2 size={13} />
                    </button>
                    <button 
                      id="btn-close-active"
                      onClick={() => setActiveLocationId(null)} 
                      className="p-1.5 bg-slate-900 text-white hover:bg-slate-800 rounded-lg shadow-sm transition cursor-pointer"
                      title="ปิดหน้าต่างแสดงข้อมูล"
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>

                                {/* QR Code Sharing Block (Desktop Sidebar) */}
                <div className="mt-3 bg-slate-100/40 border border-slate-200/50 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-[9px] text-slate-400 uppercase tracking-wider block font-sans">ฟีเจอร์แชร์พิกัด</span>
                      <span className="text-[10px] text-slate-550 block mt-0.5">
                        {activeLocation.googleMapLink ? 'สแกนคิวอาร์ลิ้งค์แผนที่' : 'สแกนคิวอาร์คู่พิกัดพอร์ตสำเร็จ'}
                      </span>
                    </div>
                    <button
                      onClick={async () => {
                        if (!showActiveQr) {
                          const text = activeLocation.googleMapLink || `https://www.google.com/maps/dir/?api=1&destination=${activeLocation.lat},${activeLocation.lng}`;
                          try {
                            const url = await QRCode.toDataURL(text, { width: 180, margin: 1, color: { dark: '#0F172A', light: '#FFFFFF' } });
                            setActiveQrCodeUrl(url);
                          } catch (err) {
                            console.error('QR Generate Error', err);
                          }
                        }
                        setShowActiveQr(!showActiveQr);
                      }}
                      className="px-2 py-1 bg-white border border-slate-200 text-[#FF6B00] font-bold text-[10px] rounded hover:bg-slate-50 transition cursor-pointer flex gap-1 items-center shadow-sm"
                    >
                      <QrCode size={10} />
                      {showActiveQr ? 'ปิด QR' : 'เปิด QR'}
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
                  <div className="flex gap-2">
                    <button 
                      id="btn-active-playlist-add"
                      onClick={() => {
                        setRoutePoints(prev => {
                          if (prev.find(p => p.id === activeLocation.id)) {
                            showToast('พิกัดนี้อยู่ใน Playlist แล้ว', 'info');
                            return prev;
                          }
                          showToast('เพิ่มพิกัดเข้า Playlist สำเร็จ!', 'success');
                          return [...prev, activeLocation];
                        });
                        setIsRouteMode(true);
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 rounded-xl transition cursor-pointer"
                    >
                      <Plus size={12} className="text-white" />
                      <span>บวก Playlist</span>
                    </button>
                    <a 
                      id="btn-active-external-navigate"
                      href={activeLocation.googleMapLink ? activeLocation.googleMapLink : `https://www.google.com/maps/dir/?api=1&destination=${activeLocation.lat},${activeLocation.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-xl transition cursor-pointer text-center"
                    >
                      <Navigation size={12} />
                      <span>นำทาง (Google Map)</span>
                    </a>
                  </div>
                  <div className="flex gap-2">
                    <a 
                      id="btn-active-street-view"
                      href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${activeLocation.lat},${activeLocation.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs py-2.5 rounded-xl transition cursor-pointer text-center"
                    >
                      <Eye size={12} />
                      <span>ภาพสถานที่ (Street View)</span>
                    </a>
                    <button 
                      onClick={() => handleShareCard(activeLocation)}
                      className="flex-1 flex items-center justify-center gap-2 bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 font-bold text-xs py-2.5 rounded-xl transition cursor-pointer"
                    >
                      <Share2 size={13} className="text-[#FF6B00]" />
                      <span>แชร์ข้อมูลการ์ด</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

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

              {/* Geographic Filters with premium Lock buttons */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight ml-1">พิมพ์/เลือกตำบล</label>
                  <div className="relative flex items-center gap-1">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        list="tambon-options"
                        value={tambonFilter === 'All' ? '' : tambonFilter}
                        disabled={lockTambonFilter}
                        onChange={(e) => {
                          const val = e.target.value.trim();
                          setTambonFilter(val || 'All');
                          if (!lockMooFilter) {
                            setMooFilter('All');
                          }
                        }}
                        placeholder="ตำบล..."
                        className={`w-full text-[11px] font-bold py-1.5 px-2 bg-white border rounded-lg focus:ring-1 focus:ring-blue-500 text-slate-700 outline-none shadow-sm transition-all ${
                          lockTambonFilter ? 'bg-amber-50/50 border-amber-200 text-amber-800' : 'border-slate-200'
                        }`}
                      />
                      <datalist id="tambon-options">
                        {uniqueTambons.map(t => (
                          <option key={t} value={t!} />
                        ))}
                      </datalist>
                    </div>
                    <button
                      type="button"
                      onClick={() => setLockTambonFilter(!lockTambonFilter)}
                      className={`p-1.5 rounded-lg border transition-all shrink-0 cursor-pointer flex items-center justify-center ${
                        lockTambonFilter 
                          ? 'bg-amber-600 border-amber-600 text-white shadow-sm scale-105' 
                          : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-400 hover:text-slate-600'
                      }`}
                      title={lockTambonFilter ? "ปลดล็อคตัวกรองตำบล" : "ล็อคตัวกรองตำบลนี้"}
                    >
                      {lockTambonFilter ? <Lock size={12} strokeWidth={2.5} /> : <Unlock size={12} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight ml-1">พิมพ์/เลือกหมู่</label>
                  <div className="relative flex items-center gap-1">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        list="moo-options"
                        value={mooFilter === 'All' ? '' : mooFilter}
                        disabled={lockMooFilter}
                        onChange={(e) => {
                          const val = e.target.value.trim();
                          setMooFilter(val || 'All');
                        }}
                        placeholder="หมู่..."
                        className={`w-full text-[11px] font-bold py-1.5 px-2 bg-white border rounded-lg focus:ring-1 focus:ring-blue-500 text-slate-700 outline-none shadow-sm transition-all ${
                          lockMooFilter ? 'bg-amber-50/50 border-amber-200 text-amber-800' : 'border-slate-200'
                        }`}
                      />
                      <datalist id="moo-options">
                        {uniqueMoos
                          .filter(m => {
                            if (tambonFilter === 'All') return true;
                            return locations.some(l => l.tambon === tambonFilter && l.moo === m);
                          })
                          .map(m => (
                            <option key={m} value={m!} />
                          ))}
                      </datalist>
                    </div>
                    <button
                      type="button"
                      onClick={() => setLockMooFilter(!lockMooFilter)}
                      className={`p-1.5 rounded-lg border transition-all shrink-0 cursor-pointer flex items-center justify-center ${
                        lockMooFilter 
                          ? 'bg-amber-600 border-amber-600 text-white shadow-sm scale-105' 
                          : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-400 hover:text-slate-600'
                      }`}
                      title={lockMooFilter ? "ปลดล็อคตัวกรองหมู่" : "ล็อคตัวกรองหมู่นี้"}
                    >
                      {lockMooFilter ? <Lock size={12} strokeWidth={2.5} /> : <Unlock size={12} />}
                    </button>
                  </div>
                </div>
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
                      <span>
                        {cat === 'All' ? (
                          <span className="flex items-center gap-1.5"><MapPin size={14} /> <span>ทั้งหมด</span></span>
                        ) : (
                          <span className="flex items-center gap-1.5">{getCategoryEmoji(cat)} <span>{getCategoryNameTh(cat).split(' ')[0]}</span></span>
                        )}
                      </span>
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
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">ผลการกรอง ({filteredLocations.length})</span>
                    {(categoryFilter !== 'All' || tambonFilter !== 'All' || mooFilter !== 'All' || searchQuery !== '') && (
                      <button 
                        onClick={() => {
                          setCategoryFilter('All');
                          if (!lockTambonFilter) setTambonFilter('All');
                          if (!lockMooFilter) setMooFilter('All');
                          setSearchQuery('');
                        }}
                        className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-bold hover:bg-blue-200 cursor-pointer transition active:scale-95"
                      >
                         ✕ ล้างการกรอง
                      </button>
                    )}
                  </div>
                  {(categoryFilter !== 'All' || tambonFilter !== 'All' || mooFilter !== 'All') && (
                    <span className="text-[9px] text-blue-500 font-medium">กำลังแสดงเฉพาะ {tambonFilter !== 'All' ? `ต.${tambonFilter}` : ''} {mooFilter !== 'All' ? `ม.${mooFilter}` : ''} {categoryFilter !== 'All' ? `(${getCategoryNameTh(categoryFilter)})` : ''}</span>
                  )}
                </div>
                
                <div className="relative">
                  <select
                    value={sortMode}
                    onChange={(e) => {
                      if (e.target.value === 'distance' && !userLocation) {
                        alert('กรุณาเปิดการติดตามตำแหน่งปัจจุบันบนแผนที่ (ปุ่มพิกัด GPS ฉัน) ก่อนทำการเรียงตามความใกล้ระยะทาง');
                        setSortMode('date');
                        return;
                      }
                      setSortMode(e.target.value as 'date' | 'name' | 'distance');
                    }}
                    className="text-[10px] bg-white border border-slate-200 text-slate-700 py-1.5 pl-2.5 pr-6 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none font-bold cursor-pointer shadow-sm"
                  >
                    <option value="date">เรียงตามวันที่สร้าง</option>
                    <option value="name">เรียงตามชื่อ</option>
                    <option value="distance">ตรงนี้ใกล้สุด (GPS)</option>
                    <option value="recentlyVisited">เช็คอินล่าสุด</option>
                  </select>
                  <span className="absolute right-2 top-2 pointer-events-none text-slate-400">
                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"></path></svg>
                  </span>
                </div>
              </div>

              {/* Select All and Batch Actions Section */}
              <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 select-none">
                  <input 
                    type="checkbox"
                    checked={filteredLocations.length > 0 && filteredLocations.every(l => selectedLocationIds.includes(l.id))}
                    onChange={(e) => {
                      if (e.target.checked) {
                        // Add select to filtered items
                        setSelectedLocationIds(prev => {
                          const nonFiltered = prev.filter(id => !filteredLocations.some(l => l.id === id));
                          return [...nonFiltered, ...filteredLocations.map(l => l.id)];
                        });
                      } else {
                        // Remove filtered items
                        setSelectedLocationIds(prev => prev.filter(id => !filteredLocations.some(l => l.id === id)));
                      }
                    }}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                  />
                  <span>เลือกทั้งหมด ({filteredLocations.length})</span>
                </label>

                {selectedLocationIds.length > 0 && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        const selectedObjects = locations.filter(l => selectedLocationIds.includes(l.id));
                        setRoutePoints(prev => {
                          const newPoints = [...prev];
                          let addedAny = false;
                          selectedObjects.forEach(loc => {
                            if (!newPoints.some(p => p.id === loc.id)) {
                              newPoints.push(loc);
                              addedAny = true;
                            }
                          });
                          if (addedAny) {
                            showToast(`เพิ่มเข้า Playlist สำเร็จ (${selectedObjects.length} จุด)!`, 'success');
                          } else {
                            showToast('พิกัดทั้งหมดนี้อยู่ใน Playlist แล้ว', 'info');
                          }
                          return newPoints;
                        });
                        setIsRouteMode(true);
                      }}
                      className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-2 py-1 rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <Plus size={10} />
                      <span>บวก Playlist ({selectedLocationIds.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const selectedObjects = locations.filter(l => selectedLocationIds.includes(l.id));
                        if (selectedObjects.length === 0) return;
                        
                        const shareText = `📌 [แชร์ชุดข้อมูลพิกัดที่เลือก] (${selectedObjects.length} รายการ)\n\n` + 
                          selectedObjects.map((loc, index) => {
                            const addr = [loc.houseNumber ? `บ้านเลขที่:${loc.houseNumber}` : '', loc.soi ? `ซอย:${loc.soi}` : '', loc.moo ? `ม.${loc.moo}` : '', loc.tambon ? `ต.${loc.tambon}` : '', loc.amphoe ? `อ.${loc.amphoe}` : ''].filter(Boolean).join(' ');
                            return `${index + 1}. ${getCategoryEmoji(loc.category)} ${loc.name}\n📍 พิกัด: ${loc.lat.toFixed(6)}, ${loc.lng.toFixed(6)}\n📮 ที่อยู่: ${addr || '-'}\n📝 โน้ต: ${loc.notes || '-'}\n🌐 แผนที่: ${loc.googleMapLink || `https://www.google.com/maps?q=${loc.lat},${loc.lng}`}`;
                          }).join('\n\n');

                        if (navigator.share) {
                          try {
                            await navigator.share({
                              title: 'แชร์ชุดพิกัด',
                              text: shareText
                            });
                            showToast('แชร์พิกัดทั้งหมดสำเร็จ!', 'success');
                          } catch (err) {
                            await copyToClipboard(shareText, 'คัดลอกชุดพิกัดจัดเก็บเรียบร้อย!');
                          }
                        } else {
                          await copyToClipboard(shareText, 'คัดลอกชุดพิกัดจัดเก็บเรียบร้อย!');
                        }
                      }}
                      className="bg-[#FF6B00]/10 hover:bg-[#FF6B00]/20 text-[#FF6B00] border border-[#FF6B00]/20 px-2 py-1 rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <Share2 size={10} />
                      <span>แชร์ทั้งหมด</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedLocationIds([])}
                      className="text-slate-400 hover:text-slate-600 text-[10px] font-bold"
                    >
                      ล้าง
                    </button>
                  </div>
                )}
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
                      <div className="flex items-start gap-3 min-w-0">
                        {/* Checkbox for standard item selection */}
                        <div 
                          className="flex items-center pt-5 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input 
                            type="checkbox"
                            checked={selectedLocationIds.includes(loc.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedLocationIds(prev => [...prev, loc.id]);
                              } else {
                                setSelectedLocationIds(prev => prev.filter(id => id !== loc.id));
                              }
                            }}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                          />
                        </div>

                        {/* Map Preview Thumbnail */}
                        <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-slate-205 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800 flex items-center justify-center shadow-inner group-hover:border-blue-400/50 transition duration-200">
                          {/* fallback stylized layout overlay */}
                          <StylizedMapPlaceholder emoji={getCategoryEmoji(loc.category)} category={loc.category} />
                          
                          {/* Map preview image from calculated OSM tile on top of placeholder */}
                          {loc.lat && loc.lng && (
                            <img 
                              src={getOsmTileUrl(loc.lat, loc.lng) || undefined} 
                              alt="Map Preview"
                              referrerPolicy="no-referrer"
                              className="absolute inset-0 w-full h-full object-cover transition duration-300 group-hover:scale-110 z-10"
                              onError={(e) => {
                                // On error or failed load, hide correct element
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          )}
                          
                          {/* Pulsing locate pinpoint overlay */}
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                            <div className="w-2.5 h-2.5 bg-rose-500 rounded-full border border-white dark:border-slate-950 shadow-md"></div>
                            <div className="absolute w-5 h-5 bg-rose-500/25 rounded-full animate-ping"></div>
                          </div>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                            <span className="text-[9px] text-slate-400 font-mono font-bold">
                              {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
                            </span>
                            {loc.googleMapLink ? (
                              <span className="inline-flex items-center gap-0.5 text-[8px] bg-blue-50 text-blue-700 px-1 py-0.5 rounded font-black">
                                <MapIcon className="w-2.5 h-2.5" /> ลิงก์แมป
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 text-[8px] bg-slate-100 text-slate-500 px-1 py-0.5 rounded font-bold">
                                <Clock className="w-2.5 h-2.5" /> รอลิงก์
                              </span>
                            )}
                            {userLocation && (
                              <span className="inline-flex items-center gap-0.5 text-[8px] bg-emerald-50 text-emerald-700 px-1 py-0.5 rounded font-semibold">
                                <Navigation className="w-2 h-2 rotate-45" /> {getDistanceString(userLocation.lat, userLocation.lng, loc.lat, loc.lng)}
                              </span>
                            )}
                          </div>
                          
                          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate leading-snug group-hover:text-blue-600 transition">
                            {loc.name}
                          </h4>

                          {/* Thai sub-address badges inside feed */}
                          {loc.tambon && (
                            <p className="text-[9px] text-slate-500 font-bold mt-0.5 block">
                              📍 ตำบล{loc.tambon} (จ.นนทบุรี)
                            </p>
                          )}
                          
                          <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5 font-normal italic leading-relaxed">
                            {loc.notes || 'ยังไม่มีรายละเอียดที่ป้อนโน้ต...'}
                          </p>
                        </div>

                        {/* Navigation Right arrow */}
                        <div className="ml-2 flex items-center justify-center shrink-0">
                          <button
                            id={`btn-fly-${loc.id}`}
                            type="button"
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
                          id={`btn-quick-copy-${loc.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyLocation(loc);
                          }}
                          className="p-1 hover:bg-slate-100 text-slate-655 hover:text-emerald-650 rounded cursor-pointer"
                          title="คัดลอกรายละเอียด"
                        >
                          <Copy size={11} />
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
                setFormCoords('');
                if (!lockType) setFormCategory('Village');
                setFormNotes('');
                setFormGoogleMapLink('');
                if (!lockHouseNumber) setFormHouseNumber('');
                if (!lockSoi) setFormSoi('');
                if (!lockMoo) setFormMoo('');
                if (!lockTambon) setFormTambon('');
                if (!lockAmphoe) setFormAmphoe('');
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
          className="absolute inset-0 w-full h-full z-0 overflow-hidden bg-slate-150 flex flex-col"
        >
          
          {/* 1. GOOGLE MAPS STYLE FLOATING CONTROL DRAWER (TOP-LEFT) */}
          <div 
            id="google-maps-style-sidebar"
            className="absolute top-4 left-4 z-[1000] pointer-events-none max-w-sm sm:max-w-md w-[calc(100%-32px)] flex flex-col gap-2.5"
          >
            {/* Unified Floating Search Bar Dashboard */}
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200/60 flex flex-col pointer-events-auto overflow-hidden transition-all duration-300 hover:shadow-2xl">
              <div className="flex items-center px-4 py-3 gap-2">
                <Search size={18} className="text-slate-400 shrink-0" />
                <input
                  id="google-search-input"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setQuickCoordinatesInput(e.target.value); // Sync coordinates input as well
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      // If typing coords "lat, lng", execute quick goto
                      if (/^-?\d+\.?\d*,\s*-?\d+\.?\d*$/.test(searchQuery.trim())) {
                        handleQuickGoTo(e);
                      }
                    }
                  }}
                  placeholder="ค้นหาชื่อ, ตำบล, หมู่, ซอย หรือพิกัด..."
                  className="flex-1 text-sm bg-transparent border-none outline-none text-slate-800 placeholder-slate-400 font-sans font-medium p-0 focus:ring-0"
                />
                
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setQuickCoordinatesInput('');
                    }}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                )}
                
                <span className="w-[1px] h-6 bg-slate-200 mx-1"></span>
                
                <button
                  onClick={handleGetMyGPS}
                  className={`p-1.5 rounded-xl transition-all duration-200 cursor-pointer ${
                    isLocating 
                      ? 'text-blue-600 bg-blue-50 border border-blue-100 shadow-sm' 
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                  title="หาตำแหน่งพิกัด GPS ปัจจุบันของคุณ"
                >
                  <Compass size={18} className={isLocating ? 'animate-spin' : ''} />
                </button>
              </div>

              {/* Instant Auto-Complete matching list inside Google Maps Search Box */}
              {searchQuery && (
                <div className="border-t border-slate-100 max-h-[240px] overflow-y-auto bg-white">
                  {/* Match Coordinates Quick Jumper Action */}
                  {/^-?\d+\.?\d*,\s*-?\d+\.?\d*$/.test(searchQuery.trim()) && (
                    <button
                      type="button"
                      onClick={handleQuickGoTo}
                      className="w-full text-left px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <Navigation size={14} className="animate-pulse" />
                      <span>บินด่วนไปยังพิกัดพิกัด: {searchQuery}</span>
                    </button>
                  )}

                  {/* Filtered existing bookmarks */}
                  {filteredLocations.length > 0 ? (
                    filteredLocations.slice(0, 5).map(loc => (
                      <button
                        key={loc.id}
                        type="button"
                        onClick={() => {
                          setActiveLocationId(loc.id);
                          setIsEditing(false);
                          setIsCreating(false);
                          handleMapFocus(loc.lat, loc.lng, 15);
                        }}
                        className="w-full text-left px-4 py-2.5 hover:bg-slate-50 transition-colors flex items-center gap-3 border-b border-slate-100/40 last:border-b-0 cursor-pointer"
                      >
                        <span className="p-1.5 bg-slate-100 rounded-lg text-slate-600 scale-90">
                          {getCategoryEmoji(loc.category)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">{loc.name}</p>
                          <p className="text-[10px] text-slate-400 truncate">
                            {loc.tambon ? `ต.${loc.tambon} ` : ''}
                            {loc.amphoe ? `อ.${loc.amphoe} ` : ''}
                            {loc.moo ? `ม.${loc.moo} ` : ''}
                            ({loc.lat.toFixed(4)}, {loc.lng.toFixed(4)})
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setRoutePoints(prev => {
                                if (prev.find(p => p.id === loc.id)) {
                                  showToast('พิกัดนี้อยู่ใน Playlist แล้ว', 'info');
                                  return prev;
                                }
                                showToast('เพิ่มพิกัดเข้า Playlist สำเร็จ!', 'success');
                                return [...prev, loc];
                              });
                            }}
                            className="p-2 hover:bg-amber-50 text-amber-500 rounded-lg transition group/add"
                            title="เพิ่มเข้า Playlist คิวงานวันนี้"
                          >
                            <Plus size={14} strokeWidth={3} className="group-hover/add:scale-125 transition" />
                          </button>
                          <ChevronRight size={14} className="text-slate-300" />
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="py-4 text-center text-slate-400 text-xs font-medium">
                      ไม่พบจุดบันทึกในช่วงคำค้นนี้
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Scrolling Horizontal Category Shortcut Chips Row */}
            <div className="flex gap-1.5 overflow-x-auto py-1 scrollbar-none pointer-events-auto select-none no-scrollbar">
              <button
                type="button"
                onClick={() => {
                  setCategoryFilter('All');
                  if (!lockTambonFilter) setTambonFilter('All');
                  if (!lockMooFilter) setMooFilter('All');
                  setSearchQuery('');
                }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-bold shadow-sm transition-all whitespace-nowrap cursor-pointer ${
                  categoryFilter === 'All' && tambonFilter === 'All' && mooFilter === 'All' && searchQuery === ''
                    ? 'bg-slate-900 border-slate-900 text-white'
                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                <span>🌐 ทุกจุด</span>
              </button>

              <button
                type="button"
                id="btn-map-playlist-shortcut"
                onClick={() => setIsPlaylistPanelOpen(true)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border shadow-sm transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                  isPlaylistPanelOpen 
                    ? 'bg-amber-600 border-amber-700 text-white' 
                    : 'border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold'
                } text-xs`}
              >
                <span>📅 คิวงานวันนี้</span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black ${isPlaylistPanelOpen ? 'bg-white text-amber-600' : 'bg-amber-500 text-white'}`}>
                  {routePoints.length}
                </span>
              </button>
              {(['Village', 'Community', 'Office', 'Condo'] as BookmarkLocation['category'][]).map(cat => {
                const isActive = categoryFilter === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setCategoryFilter(isActive ? 'All' : cat);
                    }}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-bold shadow-sm transition-all whitespace-nowrap cursor-pointer ${
                      isActive
                        ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                        : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <span>{getCategoryEmoji(cat)}</span>
                    <span>{getCategoryNameTh(cat)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick coordinates Go-To search feedback alert */}
          {quickCoordinatesError && (
            <div id="quick-coords-error-alert" className="absolute top-32 left-4 z-[999] bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-semibold px-3 py-1.5 rounded-lg shadow-lg animate-fadeIn flex items-center gap-1.5 pointer-events-auto">
              <AlertCircle size={13} className="text-rose-500 shrink-0" />
              <span>{quickCoordinatesError}</span>
              <button id="close-quick-error" className="ml-2 hover:text-rose-900 cursor-pointer" onClick={() => setQuickCoordinatesError('')}>
                <X size={12} />
              </button>
            </div>
          )}

          {/* 2. GOOGLE MAPS STYLE FLOATING CONTROL CARD HUD (BOTTOM-RIGHT) */}
          <div className="absolute bottom-8 right-4 z-[1000] flex flex-col gap-2.5 pointer-events-none">
            
            {/* Map Style Overlay Card Picker */}
            <div className="relative group pointer-events-auto shadow-lg rounded-xl">
              <button 
                id="btn-google-layers-picker"
                className="w-10 h-10 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-xl text-slate-700 hover:text-blue-600 transition shadow flex items-center justify-center cursor-pointer"
                title="เปลี่ยนรูปแบบแผนที่ดาวดาวเทียม/ถนน"
              >
                <Layers size={18} />
              </button>
              
              {/* Flyout panel */}
              <div className="absolute right-0 bottom-full mb-2 w-48 bg-white/95 backdrop-blur rounded-xl shadow-2xl border border-slate-200/60 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-bottom-right overflow-hidden">
                <div className="p-2 py-1.5 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  สไตล์แผนที่
                </div>
                <div className="p-2 space-y-1">
                  {Object.entries(TILE_LAYERS).map(([key, style]) => (
                    <button
                      key={key}
                      onClick={() => setTileStyle(key as keyof typeof TILE_LAYERS)}
                      className={`w-full text-left px-2.5 py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
                        tileStyle === key 
                          ? 'bg-blue-50 text-blue-600 font-bold' 
                          : 'hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      <div className={`w-2 h-2 rounded-full ${tileStyle === key ? 'bg-blue-600' : 'bg-slate-300'}`}></div>
                      <span>{style.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

             {/* Agenda Playlist Mode Toggle widget */}
            <button
              id="btn-playlist-mode-floating-nav"
              onClick={() => setIsPlaylistPanelOpen(!isPlaylistPanelOpen)}
              className={`w-10 h-10 pointer-events-auto border rounded-xl shadow-lg flex items-center justify-center transition-all cursor-pointer ${
                isPlaylistPanelOpen 
                  ? 'bg-amber-500 border-amber-600 text-white hover:bg-amber-600 shadow-amber-200/50' 
                  : 'bg-white hover:bg-slate-50 border-slate-200 text-amber-500'
              }`}
              title="ดูคิวงานวันนี้และสถิติการเช็คอิน"
            >
              <Calendar size={18} />
            </button>

            {/* FAB button to reopen the folded location list sidebar */}
            {!isMobile && !isSidebarOpen && (
              <button
                id="btn-expand-list-sidebar"
                onClick={() => setIsSidebarOpen(true)}
                className="w-10 h-10 pointer-events-auto bg-white hover:bg-slate-50 border border-slate-200/80 rounded-xl shadow-lg flex items-center justify-center text-slate-700 hover:text-blue-600 transition-all cursor-pointer"
                title="แสดงรายการจุดปักหมุดทั้งหมด"
              >
                <ClipboardList size={18} />
              </button>
            )}

            {/* Glassmorphic custom zoom tools */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-lg flex flex-col pointer-events-auto overflow-hidden">
              <button
                id="btn-floating-center-gps"
                onClick={() => {
                  if (userLocation && userLocation.lat !== 0 && userLocation.lng !== 0) {
                    handleMapFocus(userLocation.lat, userLocation.lng, 16);
                  } else {
                    alert('กำลังค้นหาพิกัด GPS ปัจจุบันของคุณ หรือคุณยังไม่ได้อนุญาตการใช้ Location');
                  }
                }}
                className="w-10 h-10 hover:bg-slate-50 text-blue-600 flex items-center justify-center border-b border-slate-100 transition cursor-pointer"
                title="ไปที่ตำแหน่งของฉัน (Center on current GPS)"
              >
                <Navigation size={18} className="fill-current rotate-45" strokeWidth={1.5} />
              </button>
              <button
                id="btn-floating-zoom-in"
                onClick={() => mapInstanceRef.current?.zoomIn()}
                className="w-10 h-10 hover:bg-slate-50 text-slate-700 flex items-center justify-center border-b border-slate-100 text-lg font-semibold transition cursor-pointer"
                title="ขยายแผนที่ (Zoom In)"
              >
                +
              </button>
              
              {/* Dynamic Zoom Level Text Label Overlay */}
              <div 
                id="btn-floating-zoom-level"
                className="w-10 h-5 bg-slate-50 border-b border-slate-100 text-[9px] font-mono font-black text-blue-600 flex items-center justify-center select-none tracking-tighter"
                title="ระดับการซูมปัจจุบัน (Current Zoom Level)"
              >
                {mapZoom}x
              </div>

              <button
                id="btn-floating-reset-zoom"
                onClick={() => {
                  if (mapInstanceRef.current) {
                    mapInstanceRef.current.setView([13.7563, 100.5018], 7, { animate: true });
                  }
                }}
                className="w-10 h-10 hover:bg-slate-50 text-slate-700 hover:text-blue-600 flex items-center justify-center border-b border-slate-100 transition cursor-pointer"
                title="รีเซ็ตมุมมองปรับกลับสู่ประเทศไทย (Reset view)"
              >
                <RotateCcw size={16} />
              </button>
              <button
                id="btn-floating-zoom-out"
                onClick={() => mapInstanceRef.current?.zoomOut()}
                className="w-10 h-10 hover:bg-slate-50 text-slate-700 flex items-center justify-center text-lg font-semibold transition cursor-pointer"
                title="ย่อแผนที่ (Zoom Out)"
              >
                −
              </button>
            </div>
          </div>

          {/* 📐 NEW: WORLD-CLASS PROFESSIONAL GIS HUD & OVERLAYS */}
          <div className="absolute bottom-4 left-4 z-[1000] pointer-events-none max-w-xs sm:max-w-sm w-72 sm:w-80 bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-2xl rounded-2xl p-3.5 flex flex-col gap-2.5 text-slate-800 text-xs select-none transition-all duration-300">
            {/* HUD Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-2 pointer-events-auto">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="font-bold tracking-tight text-slate-700 uppercase text-[10px]">ระบบข้อมูลภูมิสารสนเทศ (GIS Tool)</span>
              </div>
              <div className="flex items-center gap-1.5 font-mono text-[9px] bg-slate-100 px-2 py-0.5 rounded-full text-slate-600">
                <span>ZOOM: {mapZoom}x</span>
              </div>
            </div>

            {/* GIS Center Coordinate Grid */}
            <div className="grid grid-cols-2 gap-1.5 font-mono bg-slate-50 p-2 rounded-xl border border-slate-100 pointer-events-auto">
              <div>
                <span className="text-[9px] text-slate-450 block uppercase font-bold">LATITUDE (Y)</span>
                <span className="text-[11px] font-black tracking-tight text-slate-800">{mapCenter.lat.toFixed(6)}</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-450 block uppercase font-bold">LONGITUDE (X)</span>
                <span className="text-[11px] font-black tracking-tight text-slate-800">{mapCenter.lng.toFixed(6)}</span>
              </div>
            </div>

            {/* Quick Interactive GIS Tools (Ruler, Pin Switch, Clear) */}
            <div className="flex flex-col gap-1.5 pt-1 pointer-events-auto">
              {/* Ruler Mode */}
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-slate-450 font-bold uppercase tracking-wider">เครื่องมือรังวัดระยะทางตรง</span>
                {measuredDistance !== null && (
                  <span className="text-[10px] text-amber-600 font-bold font-mono">
                    รวม: {measuredDistance.toFixed(3)} กม.
                  </span>
                )}
              </div>
              
              <div className="flex gap-1.5 mb-1.5">
                <button
                  type="button"
                  onClick={toggleRulerMode}
                  className={`flex-1 py-1.5 px-2.5 rounded-xl border text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    isRulerMode 
                      ? 'bg-amber-500 border-amber-600 text-white shadow-lg font-black' 
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <Navigation size={12} className={isRulerMode ? 'rotate-45' : ''} />
                  <span>{isRulerMode ? 'ปิดโหมดรังวัด' : 'เปิดโหมดรังวัด'}</span>
                </button>

                {rulerPoints.length > 0 && (
                  <button
                    type="button"
                    onClick={clearRuler}
                    className="py-1.5 px-3 rounded-xl bg-rose-50 border border-rose-200 hover:bg-rose-500 hover:text-white text-rose-600 hover:border-rose-500 text-[11px] font-bold transition-all cursor-pointer"
                    title="ล้างข้อมูลที่วัดทั้งหมด"
                  >
                    ล้างค่า
                  </button>
                )}
              </div>

              {/* Area Mode */}
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-slate-450 font-bold uppercase tracking-wider">เครื่องมือรังวัดพื้นที่ (Area Measure)</span>
                {measuredAreaSqM !== null && (
                  <span className="text-[10px] text-purple-600 font-bold font-mono">
                    {measuredAreaSqM.toLocaleString('th-TH', { maximumFractionDigits: 0 })} ตร.ม.
                  </span>
                )}
              </div>
              
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={toggleAreaMode}
                  className={`flex-1 py-1.5 px-2.5 rounded-xl border text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    isAreaMode 
                      ? 'bg-purple-500 border-purple-600 text-white shadow-lg font-black' 
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <MapPin size={12} />
                  <span>{isAreaMode ? 'ปิดโหมดวัดพื้นที่' : 'เปิดโหมดวัดพื้นที่'}</span>
                </button>

                {areaPoints.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={undoAreaPoint}
                      className="py-1.5 px-3 rounded-xl bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-600 border-slate-300 text-[11px] font-bold transition-all cursor-pointer"
                      title="เลิกทำจุดล่าสุด"
                    >
                      ย้อนกลับ
                    </button>
                    <button
                      type="button"
                      onClick={clearArea}
                      className="py-1.5 px-3 rounded-xl bg-rose-50 border border-rose-200 hover:bg-rose-500 hover:text-white text-rose-600 hover:border-rose-500 text-[11px] font-bold transition-all cursor-pointer"
                      title="ล้างข้อมูลที่วาดทั้งหมด"
                    >
                      ล้างค่า
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Real-time Category Distribution Legends (Interactive Filters) */}
            <div className="border-t border-slate-100 pt-2 flex flex-col gap-1.5 pointer-events-auto">
              <span className="text-[9px] text-slate-450 font-bold uppercase tracking-wider">สัญลักษณ์แผนที่ (คลิกเพื่อเปิด/ปิดกรอง)</span>
              <div className="grid grid-cols-2 gap-1.5">
                {(['Village', 'Community', 'Office', 'Condo'] as BookmarkLocation['category'][]).map(cat => {
                  const isActive = categoryFilter === cat;
                  const count = locations.filter(l => l.category === cat).length;
                  
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategoryFilter(isActive ? 'All' : cat)}
                      className={`px-2 py-1.5 rounded-xl border flex items-center justify-between text-[10px] font-bold transition-all cursor-pointer select-none ${
                        isActive 
                          ? 'bg-blue-600 border-blue-500 text-white shadow-md' 
                          : 'bg-slate-50 border-slate-150 hover:bg-slate-100 text-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span>{getCategoryEmoji(cat)}</span>
                        <span className="truncate">{getCategoryNameTh(cat)}</span>
                      </div>
                      <span className={`font-mono text-[9px] px-1.5 py-0.2 rounded-full ${isActive ? 'bg-white text-blue-660 font-black' : 'bg-slate-200 text-slate-500'}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
              {categoryFilter !== 'All' && (
                <button
                  type="button"
                  onClick={() => setCategoryFilter('All')}
                  className="w-full text-center py-1 text-[9px] text-blue-600 hover:text-blue-700 font-bold transition-all cursor-pointer animate-pulse"
                >
                  แสดงข้อมูลครบทุกประเภท
                </button>
              )}
            </div>
          </div>

          {/* Core Leaflet Mount canvas div wrapper */}
          <div 
            id="map-container"
            ref={mapContainerRef} 
            className="w-full h-full z-0 relative"
            style={{ cursor: 'pointer' }}
          ></div>

          {/* 🔴 INTEGRATED PLAYLIST SIDE PANEL (Agenda & Check-In) */}
          <AnimatePresence>
            {isPlaylistPanelOpen && (
              <motion.div
                initial={{ x: 400, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 400, opacity: 0 }}
                className={`absolute z-[1001] bg-[#12131A] shadow-2xl border-l border-white/5 flex flex-col pointer-events-auto ${
                  isMobile 
                    ? 'inset-0 w-full h-full' 
                    : 'top-0 right-0 bottom-0 w-96 rounded-l-[32px]'
                }`}
              >
                <div className="bg-slate-900/50 text-white p-5 flex items-center justify-between border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500 border border-amber-500/20 shadow-inner">
                      <Calendar size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black tracking-tight text-white">คิวงานของคุณวันนี้</h3>
                      <p className="text-[10px] text-slate-500 font-bold mt-0.5">
                        {userLocation ? '🟢 เรียงตามลำดับพิกัดที่ใกล้ที่สุด' : '📍 เปิด GPS เพื่อจัดลำดับอัตโนมัติ'}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsPlaylistPanelOpen(false)}
                    className="p-2 hover:bg-white/10 rounded-full transition text-slate-400 hover:text-white"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* 🔊 PROXIMITY ALERT TOGGLE SWITCH */}
                <div className="bg-slate-950/40 px-5 py-3 border-b border-white/5 flex items-center justify-between pointer-events-auto">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={13} className={isProximityAlertActive ? 'text-amber-500' : 'text-slate-500'} />
                    <span className="text-[11px] font-black text-slate-300">เปิดเสียงเตือนนำทางเมื่อใกล้พิกัด</span>
                  </div>
                  <button
                    onClick={() => {
                      setIsProximityAlertActive(!isProximityAlertActive);
                      showToast(!isProximityAlertActive ? 'เปิดระบบเสียงแจ้งเตือนนำทางแบบเรียลไทม์ 🔊' : 'ปิดการแจ้งเตือนเสียงเรียบร้อย', 'success');
                    }}
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none flex items-center cursor-pointer ${isProximityAlertActive ? 'bg-amber-500' : 'bg-slate-700'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 transform ${isProximityAlertActive ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </div>

                {/* 🔍 INLINE SEARCH & ADD INSTANTLY INTO QUEUE */}
                <div className="bg-[#161720] p-4 border-b border-white/5 space-y-2 pointer-events-auto">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                      <Plus size={10} className="text-amber-500" /> ค้นหาพิกัดเพิ่มเข้าคิวงาน
                    </span>
                    <button
                      onClick={() => {
                        setCurrentView('dashboard');
                        if (isMobile) {
                          setIsPlaylistPanelOpen(false);
                        }
                      }}
                      className="text-[9px] font-black text-amber-500 hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <Search size={8} /> ไปฟังก์ชันค้นหาหลัก
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={playlistSearchQuery}
                      onChange={(e) => setPlaylistSearchQuery(e.target.value)}
                      placeholder="พิมพ์คำค้น (ชื่อ/ตำบล/หมู่บ้าน)..."
                      className="w-full text-xs bg-slate-900 border border-white/10 rounded-xl py-2 px-3 pl-8 pr-8 text-white focus:outline-none focus:border-amber-500/50 transition-colors"
                    />
                    <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    {playlistSearchQuery && (
                      <button 
                        onClick={() => setPlaylistSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      >
                        <X size={10} />
                      </button>
                    )}
                  </div>

                  {/* Filter results list */}
                  {playlistSearchQuery && (
                    <div className="max-h-36 overflow-y-auto space-y-1.5 pt-1 custom-scrollbar">
                      {matchingDbLocations.length === 0 ? (
                        <p className="text-[9px] text-slate-500 text-center py-2 italic">ไม่พบพิกัดนี้บนฐานข้อมูลระบบ</p>
                      ) : (
                        matchingDbLocations.map((loc) => {
                          const isInPlaylist = routePoints.some((p) => p.id === loc.id);
                          return (
                            <div key={loc.id} className="flex items-center justify-between text-xs bg-slate-950/30 p-2 rounded-lg border border-white/5 hover:border-white/10 transition-colors">
                              <div className="min-w-0 pr-2">
                                <p className="font-bold text-white truncate text-[11px]">{loc.name}</p>
                                <p className="text-[9px] text-slate-500 truncate mt-0.5">
                                  ต.{loc.tambon || '-'} {loc.moo ? `ม.${loc.moo}` : ''} • {getCategoryNameTh(loc.category)}
                                </p>
                              </div>
                              <button
                                disabled={isInPlaylist}
                                onClick={() => {
                                  setRoutePoints((prev) => [...prev, loc]);
                                  setPlaylistSearchQuery('');
                                  showToast(`เพิ่ม "${loc.name}" เข้า Playlist คิวงานเรียบร้อย!`, 'success');
                                }}
                                className={`shrink-0 text-[10px] p-1 px-2.5 rounded-lg font-black transition flex items-center gap-0.5 cursor-pointer ${
                                  isInPlaylist 
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10 cursor-default' 
                                    : 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg active:scale-95'
                                }`}
                              >
                                {isInPlaylist ? (
                                  <>
                                    <Check size={8} strokeWidth={4} />
                                    <span>เพิ่มแล้ว</span>
                                  </>
                                ) : (
                                  <>
                                    <Plus size={8} strokeWidth={4} />
                                    <span>เพิ่มคิว</span>
                                  </>
                                )}
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>

                <div className="p-4 flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                  {routePoints.length === 0 ? (
                    <div className="text-center py-20 text-slate-500 space-y-4 opacity-50">
                      <span className="text-5xl block">📥</span>
                      <p className="text-xs font-bold">ยังไม่มีแผนงานในคิววันนี้</p>
                      <p className="text-[10px] px-6">กด + คิวงานจากรายละเอียดหมุดบนแผนที่ หรือค้นหาข้อมูลใหม่เพื่อปักหมุด</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {sortedPlaylistLocations.map((loc, idx) => {
                        const isChecked = !!loc.checkedInAt;
                        const dKm = userLocation ? calculateDistanceKm(userLocation.lat, userLocation.lng, loc.lat, loc.lng) : null;
                        const distStr = dKm !== null ? (dKm < 1 ? `${(dKm * 1000).toFixed(0)} ม.` : `${dKm.toFixed(2)} กม.`) : null;

                        return (
                          <div 
                            key={`${loc.id}-${idx}`}
                            className={`flex flex-col bg-[#1B1D26]/60 border ${isChecked ? 'border-emerald-500/30' : 'border-white/5'} rounded-2xl p-4 transition-all duration-300 hover:bg-white/[0.03] group relative overflow-hidden`}
                          >
                            {isChecked && (
                              <div className="absolute top-0 right-0 py-1 px-3 bg-emerald-600 text-white text-[9px] font-black rounded-bl-xl shadow-lg z-10 flex items-center gap-1">
                                <Check size={8} strokeWidth={4} /> เช็คอินแล้ว
                              </div>
                            )}

                            <div className="flex gap-3">
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border transition-all ${isChecked ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20' : 'bg-slate-900 text-slate-500 border-white/5'}`}>
                                <span className="text-xs font-black">{idx + 1}</span>
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className={`text-sm font-black truncate transition-all ${isChecked ? 'text-slate-500 line-through opacity-70' : 'text-white'}`}>{loc.name}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                  {!isChecked && distStr && (
                                    <span className="text-[9px] font-black text-amber-500 flex items-center gap-1">
                                      <Navigation size={8} className="rotate-45" /> {distStr}
                                    </span>
                                  )}
                                  <span className="text-[10px] text-slate-500 font-bold overflow-hidden truncate">
                                    ต.{loc.tambon || '-'} • ม.{loc.moo || '-'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="mt-4 pt-3 border-t border-white/5 flex gap-2">
                              {!isChecked ? (
                                <button
                                  onClick={() => handleCheckIn(loc.id)}
                                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black rounded-xl transition active:scale-95 shadow-xl shadow-emerald-600/20 flex items-center justify-center gap-2"
                                >
                                  <MapPin size={12} /> เช็คอิน
                                </button>
                              ) : (
                                <div className="flex-1 py-2 text-emerald-400/80 text-[10px] font-bold flex items-center justify-center gap-1.5 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
                                  <Check size={12} /> {new Date(loc.checkedInAt || 0).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              )}
                              
                              <button
                                onClick={() => {
                                  setActiveLocationId(loc.id);
                                  handleMapFocus(loc.lat, loc.lng, 17);
                                  if (isMobile) setIsPlaylistPanelOpen(false);
                                }}
                                className="w-10 h-10 bg-white/5 hover:bg-white/10 text-white rounded-xl transition flex items-center justify-center"
                              >
                                <Eye size={16} />
                              </button>
                              
                              <button
                                onClick={() => setRoutePoints(prev => prev.filter(p => p.id !== loc.id))}
                                className="w-10 h-10 bg-white/5 hover:bg-rose-950 text-slate-500 hover:text-rose-400 rounded-xl transition flex items-center justify-center"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {routePoints.length > 0 && (
                  <div className="p-5 bg-white/[0.02] border-t border-white/5 space-y-3">
                    <button
                      onClick={() => {
                        const coords = sortedPlaylistLocations.map(p => `${p.lat},${p.lng}`).join('/');
                        window.open(`https://www.google.com/maps/dir/${coords}`, '_blank');
                      }}
                      className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black rounded-2xl transition shadow-2xl shadow-blue-600/30 flex items-center justify-center gap-3 active:scale-[0.98]"
                    >
                      <Navigation size={18} className="rotate-45" />
                      เปิดนำทาง Google Maps ทั้งหมด
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('ล้างคิวงานวันนี้ทั้งหมด?')) setRoutePoints([]);
                      }}
                      className="w-full py-3 text-[10px] font-black text-slate-500 hover:text-rose-500 uppercase tracking-widest transition"
                    >
                      รีเซ็ตคิวงานวันนี้
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

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
                  setFormCoords(`${selectedMapPoint.lat.toFixed(6)}, ${selectedMapPoint.lng.toFixed(6)}`);
                  if (!lockType) setFormCategory('Village');
                  setFormNotes('');
                  setFormGoogleMapLink('');
                  if (!lockHouseNumber) setFormHouseNumber('');
                  if (!lockSoi) setFormSoi('');
                  if (!lockMoo) setFormMoo('');
                  if (!lockTambon) setFormTambon('');
                  if (!lockAmphoe) setFormAmphoe('');
                }}
                className="w-full flex items-center justify-center gap-1.5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition"
              >
                <Plus size={14} />
                <span>เขียนป้ายชื่อและจัดเก็บพิกัดนี้</span>
              </button>
            </div>
          )}

          {/* 3. GOOGLE MAPS STYLE PREMIUM LOCATION DETAIL PANEL (BOTTOM-LEFT / BOTTOM-MIDDLE AUTO RESPONSIVE) */}
          <AnimatePresence>
            {activeLocation && !selectedMapPoint && (
              <motion.div 
                id="google-maps-location-drawer" 
                initial={{ opacity: 0, y: 35, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 40, scale: 0.96 }}
                transition={{ type: "spring", damping: 25, stiffness: 220 }}
                className={`absolute z-[999] bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden pointer-events-auto text-slate-800 transition-all duration-300 ${
                  isMobile 
                    ? 'bottom-20 left-4 right-4 max-h-[70vh] overflow-y-auto' 
                    : 'bottom-16 left-4 w-96 max-h-[64vh] overflow-y-auto'
                }`}
              >
              {/* Category Gradient Header Banner Wallpaper */}
              <div className={`relative h-28 shrink-0 flex items-end p-4 bg-gradient-to-r ${
                activeLocation.category === 'Village' ? 'from-emerald-500 to-teal-600' :
                activeLocation.category === 'Community' ? 'from-blue-500 to-indigo-600' :
                activeLocation.category === 'Office' ? 'from-rose-500 to-red-600' :
                'from-amber-500 to-orange-600'
              }`}>
                <div className="absolute top-3 right-3 flex gap-1 z-10">
                  <button 
                    onClick={() => handleStartEdit(activeLocation)} 
                    className="p-1.5 bg-white/25 hover:bg-white/40 backdrop-blur rounded-lg text-white transition cursor-pointer"
                    title="แก้ไขตำแหน่งพิกัดนี้"
                  >
                    <Edit3 size={13} />
                  </button>
                  <button 
                    onClick={() => handleDeleteLocation(activeLocation.id)} 
                    className="p-1.5 bg-white/25 hover:bg-rose-600/90 backdrop-blur rounded-lg text-white transition cursor-pointer"
                    title="ลบจุดนี้ออก"
                  >
                    <Trash2 size={13} />
                  </button>
                  <button 
                    onClick={() => setActiveLocationId(null)} 
                    className="p-1.5 bg-white/25 hover:bg-white/45 backdrop-blur rounded-lg text-white transition cursor-pointer"
                    title="ปิดหน้าต่าง"
                  >
                    <X size={13} />
                  </button>
                </div>

                <div className="flex items-center gap-2.5 relative z-10 text-white">
                  <span className="text-2xl bg-white/10 backdrop-blur p-2 rounded-xl border border-white/20 shadow-sm flex items-center justify-center">
                    {getCategoryEmoji(activeLocation.category)}
                  </span>
                  <div>
                    <span className="text-[9px] uppercase font-bold tracking-widest text-white/95 bg-white/20 px-2.5 py-0.5 rounded-full border border-white/15">
                      {getCategoryNameTh(activeLocation.category)}
                    </span>
                    <h3 className="text-sm font-bold truncate max-w-[240px] pt-1 leading-snug drop-shadow-sm text-white">
                      {activeLocation.name}
                    </h3>
                  </div>
                </div>
              </div>

              {/* Card Contents */}
              <div className="p-4 space-y-3.5 select-text overflow-y-auto">
                
                {/* Distance status tracker indicator */}
                {userLocation && (
                  <div className="text-xs font-bold text-blue-600 bg-blue-50/75 border border-blue-100 rounded-xl px-3 py-2 flex items-center gap-1.5">
                    <Navigation size={12} className="text-blue-500 rotate-45 animate-pulse" />
                    <span>ห่างจากพิกัดปักหมุด GPS ของคุณประมาณ {(calculateDistanceKm(userLocation.lat, userLocation.lng, activeLocation.lat, activeLocation.lng) * 1000).toFixed(0)} เมตร</span>
                  </div>
                )}

                {/* Sub address attributes and coordinates copy block */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
                    <span className="text-xs font-mono font-bold text-slate-700">
                      {activeLocation.lat.toFixed(6)}, {activeLocation.lng.toFixed(6)}
                    </span>
                    <button
                      onClick={async () => {
                        await copyToClipboard(`${activeLocation.lat.toFixed(6)}, ${activeLocation.lng.toFixed(6)}`, 'คัดลอกคู่พิกัดเรียบร้อยแล้ว!');
                      }}
                      className="p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
                      title="คัดลอกพิกัด"
                    >
                      <Copy size={12} />
                    </button>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-1.5">
                    <span className="text-[9px] font-bold text-slate-450 uppercase tracking-widest block font-sans">ข้อมูลรายละเอียดเชิงพื้นที่:</span>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-slate-600 font-sans leading-relaxed">
                      <div><span className="text-slate-400 font-medium font-sans">บ้านเลขที่:</span> <span className="font-semibold text-slate-850">{activeLocation.houseNumber || '-'}</span></div>
                      <div><span className="text-slate-400 font-medium font-sans">หมู่ที่:</span> <span className="font-semibold text-slate-850">{activeLocation.moo || '-'}</span></div>
                      <div><span className="text-slate-400 font-medium font-sans">ซอย:</span> <span className="font-semibold text-slate-850">{activeLocation.soi || '-'}</span></div>
                      <div><span className="text-slate-400 font-medium font-sans">ตำบล / ท้องถิ่น:</span> <span className="font-bold text-slate-850">{activeLocation.tambon || 'ไม่ได้ระบุ'}</span></div>
                      <div className="col-span-2"><span className="text-slate-400 font-medium font-sans">อำเภอ:</span> <span className="font-bold text-slate-850">{activeLocation.amphoe || 'ไม่ได้ระบุ'}</span></div>
                    </div>
                  </div>
                </div>

                {/* Check-in Status */}
                {activeLocation.checkedInAt && (
                  <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0 shadow-sm shadow-emerald-500/20">
                      <Check size={16} strokeWidth={3} />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-emerald-600 block leading-tight">เช็คอินแล้วเมื่อเวลา</span>
                      <span className="text-xs font-black text-emerald-800">{new Date(activeLocation.checkedInAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.</span>
                    </div>
                  </div>
                )}

                {/* Main Dynamic Description / Notes */}
                <div className="bg-amber-50/50 border border-amber-100 p-3 rounded-xl">
                  <span className="text-[9px] font-bold text-amber-500 uppercase tracking-widest block mb-0.5 font-sans">บันทึกพิกัดจัดเก็บเพิ่มเติม:</span>
                  <p className="text-xs text-amber-800/95 font-medium leading-relaxed italic">
                    {activeLocation.notes ? `"${activeLocation.notes}"` : 'ไม่ได้ระบุประวัติหรือโน้ตสรุปเพิ่มเติมของพิกัดจัดเก็บชิ้นนี้'}
                  </p>
                </div>

                {/* Action navigation buttons row in horizontal grid */}
                <div className="grid grid-cols-2 gap-2 shrink-0">
                  {/* Primary Suggestion: CHECK IN */}
                  <button 
                    onClick={() => handleCheckIn(activeLocation.id)}
                    disabled={!!activeLocation.checkedInAt}
                    className={`flex items-center justify-center gap-1.5 font-bold text-xs py-3 rounded-xl transition cursor-pointer text-center col-span-2 shadow-lg mb-1 active:scale-[0.98] ${
                      activeLocation.checkedInAt 
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200' 
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                    }`}
                  >
                    {activeLocation.checkedInAt ? <CheckCircle2 size={14} /> : <MapPin size={14} />}
                    <span>{activeLocation.checkedInAt ? 'เช็คอินเรียบร้อยแล้ว' : 'ส่งงาน / เช็คอินพิกัดนี้'}</span>
                  </button>

                  <button 
                    onClick={() => {
                      setRoutePoints(prev => {
                        if (prev.find(p => p.id === activeLocation.id)) {
                          showToast('พิกัดนี้อยู่ใน Playlist แล้ว', 'info');
                          return prev;
                        }
                        showToast('เพิ่มพิกัดเข้า Playlist สำเร็จ!', 'success');
                        return [...prev, activeLocation];
                      });
                    }}
                    className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 rounded-xl transition cursor-pointer text-center"
                  >
                    <Plus size={12} className="text-white shrink-0" />
                    <span>บวก Playlist</span>
                  </button>
                  
                  <a 
                    href={activeLocation.googleMapLink ? activeLocation.googleMapLink : `https://www.google.com/maps/dir/?api=1&destination=${activeLocation.lat},${activeLocation.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-xl transition cursor-pointer text-center"
                  >
                    <Navigation size={12} className="shrink-0" />
                    <span>นำทาง</span>
                  </a>

                  <a 
                    href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${activeLocation.lat},${activeLocation.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs py-2.5 rounded-xl transition cursor-pointer text-center"
                  >
                    <Eye size={12} className="shrink-0" />
                    <span>Street View</span>
                  </a>
                </div>

                {/* Integration with dynamic route scheduler tool! */}
                <button
                  type="button"
                  onClick={() => handleShareCard(activeLocation)}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl shadow-sm transition cursor-pointer z-10 shrink-0"
                >
                  <Share2 size={12} className="text-[#FF6B00] shrink-0" />
                  <span>แชร์ข้อมูลการ์ดทั้งใบ</span>
                </button>

                {/* QR Code sharing section nested beautifully inside card */}
                <div className="border border-slate-200 rounded-xl p-2.5 space-y-2 shrink-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-[8px] text-slate-400 uppercase tracking-widest block mb-0.5">แชร์พิกัดข้ามอุปกรณ์:</span>
                      <span className="text-[10px] text-slate-500 font-medium block">
                        สแกนนำทางตรงบนมือถือทันที
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowActiveQr(!showActiveQr)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer border ${
                        showActiveQr 
                          ? 'bg-[#FF6B00] text-white border-[#FF6B00] shadow' 
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <QrCode size={11} />
                      <span>{showActiveQr ? 'ปิดคิวอาร์' : 'สแกน QR'}</span>
                    </button>
                  </div>

                  <AnimatePresence>
                    {showActiveQr && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden flex flex-col items-center justify-center pt-2 pb-1 bg-white border border-slate-100 rounded-lg shadow-inner"
                      >
                        {activeQrCodeUrl ? (
                          <div className="flex flex-col items-center space-y-1.5">
                            <img 
                              src={activeQrCodeUrl} 
                              alt="Location QR Code" 
                              className="w-24 h-24 object-contain select-none"
                              referrerPolicy="no-referrer"
                            />
                            <div className="px-2 text-center">
                              <p className="text-[9px] text-[#FF6B00] font-black">
                                {activeLocation.googleMapLink ? '🗺️ เปิดใน Google Maps' : '📍 นำทางตรงพิกัดปักหมุด'}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="py-3 text-[10px] text-slate-400 flex flex-col items-center gap-1">
                            <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-[#FF6B00]"></div>
                            <span>กำลังสร้างคิวอาร์แชร์...</span>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* 3. Mobile Navigation Bottom Tab Bar (Auto scaled for phone devices) */}
        {isMobile && (
          <nav id="mobile-bottom-nav-bar" className="fixed bottom-0 left-0 right-0 h-16 bg-slate-950/95 backdrop-blur-md border-t border-slate-800/80 flex items-center justify-around z-[1100] px-4 shadow-2xl">
            <button
              id="mob-nav-btn-map"
              onClick={() => {
                setMobileActiveTab('map');
                setMobileSheetState('collapsed');
              }}
              className={`flex flex-col items-center justify-center gap-1.5 transition cursor-pointer ${
                mobileActiveTab === 'map' ? 'text-blue-500 scale-105 font-bold' : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              <MapIcon size={20} />
              <span className="text-[10px] tracking-wide">แผนที่</span>
            </button>
            <button
              id="mob-nav-btn-list"
              onClick={() => {
                setMobileActiveTab('list');
                setMobileSheetState('peek');
              }}
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

      {/* 4. Mobile Fullscreen CRUD Form Sheet Overlay - fully integrated in sidebar bottom sheet */}
      {false && (isCreating || isEditing) && (
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
            {/* Category */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-semibold text-slate-300">
                  เลือกประเภทสถานที่และหมวดหมู่
                </label>
                <button 
                  type="button" 
                  onClick={() => setLockType(!lockType)} 
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full border transition-all text-[9px] font-bold ${
                    lockType 
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' 
                      : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-400'
                  } cursor-pointer`}
                >
                  {lockType ? <Lock size={10} /> : <Unlock size={10} />}
                  <span>{lockType ? 'ล็อคแล้ว' : 'ไม่ล็อค'}</span>
                </button>
              </div>
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
            <div className="flex gap-2">
              <button
                id="mob-btn-form-get-current"
                type="button"
                onClick={handleGetCurrentLocationForForm}
                className="flex-1 flex items-center justify-center gap-2 bg-slate-800 text-white font-bold text-xs py-3 px-4 rounded-xl transition shadow cursor-pointer active:scale-98"
              >
                <MapPin size={14} className="text-[#FF6B00]" />
                <span>ตำแหน่งปัจจุบัน</span>
              </button>
              <button
                type="button"
                onClick={() => setLockGps(!lockGps)}
                className={`px-4 py-3 rounded-xl border transition-all flex items-center gap-2 ${
                  lockGps 
                    ? 'bg-amber-500 border-amber-600 text-white shadow-lg' 
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                } cursor-pointer`}
              >
                {lockGps ? <Lock size={14} /> : <Unlock size={14} />}
                <span className="text-[10px] font-bold">{lockGps ? 'ล็อคค่า' : 'ล็อค'}</span>
              </button>
            </div>

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

            {/* Thailand Specific Address Information Grid (HomeNo, Moo, Soi, Tambon) FOR MOBILE */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 space-y-3">
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest block border-b border-slate-800 pb-2 flex justify-between items-center">
                <span>🏢 ข้อมูลที่อยู่ประเทศไทย</span>
                <span className="text-[9px] text-amber-400 font-normal normal-case">คลิกรูปกุญแจเพื่อล็อคค่าคงเดิมได้</span>
              </span>
              
              {/* Row 1: บ้านเลขที่ | หมู่ที่ */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-300">บ้านเลขที่ (House No.)</label>
                  <div className="relative flex items-center">
                    <input 
                      id="mob-input-house-number"
                      type="text"
                      value={formHouseNumber}
                      onChange={(e) => setFormHouseNumber(e.target.value)}
                      placeholder="เช่น 123/45" 
                      className="w-full text-xs pl-3 pr-8 py-2 bg-slate-950 border border-slate-800/85 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-white"
                    />
                    <button 
                      type="button" 
                      onClick={() => setLockHouseNumber(!lockHouseNumber)} 
                      className={`absolute right-2 p-1 transition-all ${
                        lockHouseNumber 
                          ? 'text-amber-400 scale-110' 
                          : 'text-slate-600 hover:text-slate-400'
                      } cursor-pointer`}
                      title={lockHouseNumber ? "ปลดล็อคบ้านเลขที่" : "ล็อคข้อมูลบ้านเลขที่"}
                    >
                      {lockHouseNumber ? <Lock size={12} /> : <Unlock size={12} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-300">หมู่ที่ (Moo)</label>
                  <div className="relative flex items-center">
                    <input 
                      id="mob-input-moo"
                      type="text"
                      value={formMoo}
                      onChange={(e) => setFormMoo(e.target.value)}
                      placeholder="เช่น หมู่ 3" 
                      className="w-full text-xs pl-3 pr-8 py-2 bg-slate-950 border border-slate-800/85 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-white"
                    />
                    <button 
                      type="button" 
                      onClick={() => setLockMoo(!lockMoo)} 
                      className={`absolute right-2 p-1 transition-all ${
                        lockMoo 
                          ? 'text-amber-400 scale-110' 
                          : 'text-slate-600 hover:text-slate-400'
                      } cursor-pointer`}
                      title={lockMoo ? "ปลดล็อคหมู่" : "ล็อคข้อมูลหมู่นี้"}
                    >
                      {lockMoo ? <Lock size={12} /> : <Unlock size={12} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Row 2: ซอย | ตำบล */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-300">ซอย (Soi)</label>
                  <div className="relative flex items-center">
                    <input 
                      id="mob-input-soi"
                      type="text"
                      value={formSoi}
                      onChange={(e) => setFormSoi(e.target.value)}
                      placeholder="เช่น ซอยมิตรไมตรี" 
                      className="w-full text-xs pl-3 pr-8 py-2 bg-slate-950 border border-slate-800/85 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-white"
                    />
                    <button 
                      type="button" 
                      onClick={() => setLockSoi(!lockSoi)} 
                      className={`absolute right-2 p-1 transition-all ${
                        lockSoi 
                          ? 'text-amber-400 scale-110' 
                          : 'text-slate-600 hover:text-slate-400'
                      } cursor-pointer`}
                      title={lockSoi ? "ปลดล็อคซอย" : "ล็อคข้อมูลซอยนี้"}
                    >
                      {lockSoi ? <Lock size={12} /> : <Unlock size={12} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-300">ตำบล (Tambon)</label>
                  <div className="relative flex items-center">
                    <input 
                      id="mob-input-tambon"
                      type="text"
                      list="tambons-list-mobile"
                      value={formTambon}
                      onChange={(e) => setFormTambon(e.target.value)}
                      placeholder="พิมพ์ หรือ เลือก..." 
                      className="w-full text-xs pl-3 pr-8 py-2 bg-slate-950 border border-slate-800/85 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-white"
                    />
                    <datalist id="tambons-list-mobile">
                      {NONTHABURI_TAMBONS.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </datalist>

                    <button 
                      type="button" 
                      onClick={() => setLockTambon(!lockTambon)} 
                      className={`absolute right-2 p-1 transition-all ${
                        lockTambon 
                          ? 'text-amber-400 scale-110' 
                          : 'text-slate-600 hover:text-slate-400'
                      } cursor-pointer`}
                      title={lockTambon ? "ปลดล็อคตำบล" : "ล็อคข้อมูลตำบลนี้"}
                    >
                      {lockTambon ? <Lock size={12} /> : <Unlock size={12} />}
                    </button>
                  </div>
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

            {/* Merged Coordinates Input (Mobile View) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                พิกัด (ละติจูด, ลองจิจูด) <span className="text-red-500">*</span>
              </label>
              <input 
                id="mob-input-coordinates"
                type="text" 
                required
                value={formCoords}
                onChange={(e) => handleCoordsInputChange(e.target.value)}
                placeholder="เช่น 13.7563, 100.5018"
                className="w-full text-sm px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-white placeholder-slate-650"
              />
              {formLat !== '' && formLng !== '' && !isNaN(Number(formLat)) && !isNaN(Number(formLng)) ? (
                <span className="text-[10px] text-emerald-400 font-mono block mt-1">
                  ✓ แยกสำเร็จ: {Number(formLat).toFixed(6)}, {Number(formLng).toFixed(6)}
                </span>
              ) : formCoords.trim() !== '' ? (
                <span className="text-[10px] text-red-400 font-medium block mt-1">
                  ✗ รูปแบบพิกัดไม่ถูกต้อง
                </span>
              ) : null}
            </div>

            <div className="text-[11px] text-emerald-400/80 bg-emerald-950/40 p-2 rounded border border-emerald-800/30">
              💡 พิกัดจะถูกปรับค่าทศนิยมออโตเมติกให้แม่นยำระดับควบคุม ± ไม่เกิน 5 เมตรก่อนส่งขึ้นฐานข้อมูลคลาวด์
            </div>

            {/* NAVIGATION BUTTON BELOW LONGITUDE FOR MOBILE */}
            {formLat !== '' && formLng !== '' && !isNaN(Number(formLat)) && !isNaN(Number(formLng)) && (
              <div className="flex gap-2">
                <a
                  id="mob-btn-form-navigate-gmap"
                  href={formGoogleMapLink ? formGoogleMapLink : `https://www.google.com/maps/dir/?api=1&destination=${formLat},${formLng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3 px-4 rounded-xl transition shadow text-center cursor-pointer"
                >
                  <Navigation size={14} />
                  <span>นำทาง</span>
                </a>
                <a
                  id="mob-btn-form-streetview-gmap"
                  href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${formLat},${formLng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs py-3 px-4 rounded-xl transition shadow text-center cursor-pointer"
                >
                  <Eye size={14} />
                  <span>Street View</span>
                </a>
              </div>
            )}

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
                      {userLocation && (loc as any).dist !== undefined && (
                        <div className="text-[9px] font-bold text-emerald-500 mt-1 flex items-center gap-1">
                          <Navigation size={9} /> ห่าง {( (loc as any).dist * 1000 ).toFixed(0)} ม.
                        </div>
                      )}
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

      {/* 3.1 "คิวงานวันนี้" Today's Location Playlist Queue Modal Removed */ }

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
                    { label: 'หมู่บ้าน (Village)', value: statsSummary.categoriesCount.Village || 0, color: 'bg-emerald-500', icon: <Home size={14} className="text-emerald-500 mr-1.5 inline" /> },
                    { label: 'ชุมชน (Community)', value: statsSummary.categoriesCount.Community || 0, color: 'bg-blue-500', icon: <Users size={14} className="text-blue-500 mr-1.5 inline" /> },
                    { label: 'สำนักงาน (Office)', value: statsSummary.categoriesCount.Office || 0, color: 'bg-rose-500', icon: <Building2 size={14} className="text-rose-500 mr-1.5 inline" /> },
                    { label: 'คอนโด (Condo)', value: statsSummary.categoriesCount.Condo || 0, color: 'bg-amber-500', icon: <MapPinned size={14} className="text-amber-500 mr-1.5 inline" /> },
                  ].map((categoryItem, i) => {
                    const pct = statsSummary.total > 0 ? Math.round((categoryItem.value / statsSummary.total) * 100) : 0;
                    return (
                      <div key={i} className="text-xs">
                        <div className="flex items-center justify-between text-[11px] mb-0.5">
                          <span className="text-[#9BA1B0] font-semibold">{categoryItem.icon}{categoryItem.label}</span>
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
                <Sparkles className="w-5 h-5 text-emerald-400" />
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
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">ที่อยู่พิกัดไทย (จ.นนทบุรี):</span>
                {formSoi || formMoo || formTambon ? (
                  <span className="text-slate-300 leading-relaxed block text-xs bg-slate-900/50 p-2 rounded-lg border border-slate-800/60 mt-1">
                    {[
                      formSoi ? `ซอย${formSoi}` : '',
                      formMoo ? `หมู่ที่ ${formMoo}` : '',
                      formTambon ? `ตำบล${formTambon}` : ''
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

      {/* 7. Custom Delete Confirmation Modal (Thai translation: ยืนยันการลบพิกัดสะสม) */}
      {deleteTargetId && (
        <div id="delete-confirm-modal-overlay" className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-[1300] animate-fadeIn">
          <div className="bg-[#111218] border border-rose-500/30 rounded-[24px] max-w-sm w-full p-6 text-[#D8DADF] shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-rose-500 to-orange-500"></div>
            
            <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center shrink-0">
                <span className="text-xl">⚠️</span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  คำเตือน: ยืนยันการลบข้อมูล
                </h3>
                <p className="text-[10px] text-slate-400">การลบนี้เป็นแบบถาวรและไม่สามารถกู้คืนกลับมาได้อีก</p>
              </div>
            </div>

            <div className="py-4 space-y-2">
              <p className="text-xs text-slate-300 leading-relaxed animate-pulse">
                คุณแน่ใจหรือไม่ว่าต้องการลบพิกัดตำแหน่งสถานที่นี้? ข้อมูลในระดับฐานข้อมูลและสัญลักษณ์การปักหมุดบนแผนที่จะถูกทำลายอย่างถาวรทันที
              </p>
              {locations.find(l => l.id === deleteTargetId) && (
                <div className="bg-rose-950/20 border border-rose-500/20 rounded-xl p-3 mt-2">
                  <span className="text-[9px] text-rose-400 font-bold block uppercase tracking-wider">ตำแหน่งที่จะถูกลบ:</span>
                  <span className="text-xs font-bold text-white block mt-0.5 truncate">
                    {locations.find(l => l.id === deleteTargetId)?.name}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                    Lat: {locations.find(l => l.id === deleteTargetId)?.lat.toFixed(5)}, Lng: {locations.find(l => l.id === deleteTargetId)?.lng.toFixed(5)}
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-2.5 pt-3 border-t border-slate-800/30">
              <button
                id="btn-confirm-delete-agree"
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow transition duration-200 cursor-pointer text-center"
              >
                ยืนยันการลบถาวร 🗑️
              </button>
              <button
                id="btn-confirm-delete-cancel"
                type="button"
                onClick={() => setDeleteTargetId(null)}
                className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-[#D8DADF] font-bold text-xs rounded-xl transition duration-200 cursor-pointer"
              >
                ยกเลิก
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 8. Toast Notifications */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[2000] px-4 py-2.5 rounded-full shadow-2xl border flex items-center gap-2 font-bold text-xs ${
              toast.type === 'success' 
                ? 'bg-emerald-500 text-white border-emerald-400' 
                : toast.type === 'error'
                  ? 'bg-rose-500 text-white border-rose-400'
                  : 'bg-blue-600 text-white border-blue-500'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 size={14} />}
            {toast.type === 'error' && <AlertCircle size={14} />}
            {toast.type === 'info' && <Info size={14} />}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
    </>
  );
}
