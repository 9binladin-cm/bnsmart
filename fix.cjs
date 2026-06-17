const fs = require('fs');

const lucideImports = `import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  MapPin, Search, Plus, Trash2, Edit3, Save, X, Compass, Map as MapIcon, Download, Upload, RotateCcw, Star, Check, Navigation, MapPinned, Sparkles, Lock, Unlock, Info, Layers, Heart, ChevronRight, ChevronUp, ChevronDown, Copy, LayoutDashboard, ClipboardList, BarChart2, Settings, CalendarDays, Calendar, Activity, CheckCircle2, FileCheck2, AlertCircle, QrCode, Building2, Home, Users, Clock, Share2, Eye
} from 'lucide-react';
import QRCode from 'qrcode';
import { motion, AnimatePresence } from 'motion/react';
import { BookmarkLocation } from './types';
import { TableView } from './components/TableView';
import { db, isFirebaseConfigured, collection, setDoc, deleteDoc, doc, onSnapshot, addDoc, updateDoc, serverTimestamp } from './firebase';
import L from 'leaflet';
import 'leaflet.heat';
import { APIProvider, Map as GoogleMap, AdvancedMarker, Pin, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';

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
  return \`<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">\${innerPath}</svg>\`;
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

const StylizedMapPlaceholder = ({ emoji, category }: any) => null;
const getOsmTileUrl = (a: any, b: any) => "";
const getDistanceString = (a:any, b:any, c:any, d:any) => "";

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
`;

let content = fs.readFileSync('src/App.tsx', 'utf-8');

// Replace everything before export default function App()
content = content.replace(/^.*?(?=export default function App\(\) \{)/s, lucideImports + '\n\n');

fs.writeFileSync('src/App.tsx', content);
