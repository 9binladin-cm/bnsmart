
import React, { useState } from 'react';
import { BookmarkLocation } from '../types';
import { ChevronUp, ChevronDown, Edit3, Trash2, Check, X, MapPin, Home, Users, Building2, MapPinned } from 'lucide-react';
import { doc, updateDoc, deleteDoc } from '../firebase';
import { db } from '../firebase';

interface TableProps {
  locations: BookmarkLocation[];
}

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'Village': return <Home size={14} className="text-emerald-500 inline" />;
    case 'Community': return <Users size={14} className="text-blue-500 inline" />;
    case 'Office': return <Building2 size={14} className="text-rose-500 inline" />;
    case 'Condo': return <MapPinned size={14} className="text-amber-500 inline" />;
    default: return <MapPin size={14} className="text-slate-500 inline" />;
  }
};

const getCategoryNameTh = (category: string) => {
  switch (category) {
    case 'Village': return 'หมู่บ้าน';
    case 'Community': return 'ชุมชน';
    case 'Office': return 'สำนักงาน/อาคาร';
    case 'Condo': return 'คอนโด/หอพัก';
    default: return 'อื่นๆ';
  }
};

export const TableView: React.FC<TableProps> = ({ locations }) => {
  const [sortConfig, setSortConfig] = useState<{ key: keyof BookmarkLocation; direction: 'asc' | 'desc' } | null>(null);
  
  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<BookmarkLocation>>({});
  const [isSaving, setIsSaving] = useState(false);

  const sortedData = [...locations].sort((a, b) => {
    if (!sortConfig) return 0;
    const { key, direction } = sortConfig;
    if (a[key] < b[key]) return direction === 'asc' ? -1 : 1;
    if (a[key] > b[key]) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (key: keyof BookmarkLocation) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const startEdit = (loc: BookmarkLocation) => {
    setEditingId(loc.id);
    setEditFormData({ ...loc });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditFormData({});
  };

  const handleInputChange = (field: keyof BookmarkLocation, value: any) => {
    setEditFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const saveEdit = async (id: string) => {
    if (!db) {
      alert("Firebase is not initialized");
      return;
    }
    
    setIsSaving(true);
    try {
      const docRef = doc(db, 'landmarks', id);
      
      const payload: any = { ...editFormData };
      
      // Ensure coordinates are valid numbers
      const parsedLat = Number(payload.lat);
      const parsedLng = Number(payload.lng);
      if (isNaN(parsedLat) || !isFinite(parsedLat) || isNaN(parsedLng) || !isFinite(parsedLng)) {
        alert("กรุณากรอกพิกัดละติจูดและลองจิจูดให้ถูกต้อง");
        setIsSaving(false);
        return;
      }
      payload.lat = parsedLat;
      payload.lng = parsedLng;
      
      delete payload.id; // don't write id field explicitly if it's doc id
      
      await updateDoc(docRef, payload);
      setEditingId(null);
    } catch (err) {
      console.error("Error updating document:", err);
      alert("ไม่สามารถบันทึกข้อมูลได้");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteLocation = async (id: string) => {
    if (!db) return;
    if (!window.confirm("คุณต้องการลบพิกัดนี้ใช่หรือไม่?")) return;
    try {
      await deleteDoc(doc(db, 'landmarks', id));
    } catch (err) {
      console.error("Error deleting location:", err);
    }
  };

  return (
    <div className="overflow-x-auto w-full bg-slate-900 rounded-2xl border border-slate-800 shadow-xl scrollbar-hide p-1">
      <table className="w-full text-sm text-left text-slate-300">
        <thead className="text-xs text-slate-400 uppercase bg-slate-800/50 sticky top-0 backdrop-blur-md">
          <tr>
            <th className="px-5 py-4 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('name')}>
              <div className="flex items-center gap-1">ชื่อสถานที่ {sortConfig?.key === 'name' ? (sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4 text-[#FF6B00]" /> : <ChevronDown className="w-4 h-4 text-[#FF6B00]" />) : <ChevronDown className="w-4 h-4 opacity-0" />}</div>
            </th>
            <th className="px-5 py-4 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('category')}>
              <div className="flex items-center gap-1">ประเภท {sortConfig?.key === 'category' ? (sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4 text-[#FF6B00]" /> : <ChevronDown className="w-4 h-4 text-[#FF6B00]" />) : <ChevronDown className="w-4 h-4 opacity-0" />}</div>
            </th>
            <th className="px-5 py-4 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('lat')}>
              <div className="flex items-center gap-1">พิกัด (Lat, Lng) {sortConfig?.key === 'lat' ? (sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4 text-[#FF6B00]" /> : <ChevronDown className="w-4 h-4 text-[#FF6B00]" />) : <ChevronDown className="w-4 h-4 opacity-0" />}</div>
            </th>
            <th className="px-5 py-4 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('googleMapLink')}>
              <div className="flex items-center gap-1">ลิงก์ {sortConfig?.key === 'googleMapLink' ? (sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4 text-[#FF6B00]" /> : <ChevronDown className="w-4 h-4 text-[#FF6B00]" />) : <ChevronDown className="w-4 h-4 opacity-0" />}</div>
            </th>
            <th className="px-5 py-4 text-center">
              จัดการ
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/50">
          {sortedData.map((loc) => {
            const isEditing = editingId === loc.id;

            return (
              <tr key={loc.id} className="bg-slate-900/40 hover:bg-slate-800/80 transition-colors">
                
                {/* Name */}
                <td className="px-5 py-3 font-medium text-slate-100 min-w-[200px]">
                  {isEditing ? (
                    <input 
                      type="text" 
                      value={editFormData.name || ''} 
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  ) : (
                    loc.name
                  )}
                </td>

                {/* Category */}
                <td className="px-5 py-3 whitespace-nowrap">
                  {isEditing ? (
                    <select 
                      value={editFormData.category || 'Village'} 
                      onChange={(e) => handleInputChange('category', e.target.value)}
                      className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="Village">หมู่บ้าน (Village)</option>
                      <option value="Community">ชุมชน (Community)</option>
                      <option value="Office">สำนักงาน/อาคาร (Office)</option>
                      <option value="Condo">คอนโด/หอพัก (Condo)</option>
                    </select>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 text-slate-300 rounded-lg text-[11px] font-medium border border-slate-700 whitespace-nowrap">
                      {getCategoryIcon(loc.category)}
                      {getCategoryNameTh(loc.category)}
                    </span>
                  )}
                </td>

                {/* Coordinates */}
                <td className="px-5 py-3 font-mono text-xs whitespace-nowrap">
                  {isEditing ? (
                    <div className="flex flex-col gap-1 w-32">
                      <input 
                        type="number" 
                        value={editFormData.lat !== undefined ? editFormData.lat : ''} 
                        onChange={(e) => handleInputChange('lat', e.target.value)}
                        placeholder="Lat"
                        className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                      <input 
                        type="number" 
                        value={editFormData.lng !== undefined ? editFormData.lng : ''} 
                        onChange={(e) => handleInputChange('lng', e.target.value)}
                        placeholder="Lng"
                        className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  ) : (
                    <div className="text-slate-400">
                      <div><span className="text-slate-500">Lat:</span> {loc.lat.toFixed(5)}</div>
                      <div><span className="text-slate-500">Lng:</span> {loc.lng.toFixed(5)}</div>
                    </div>
                  )}
                </td>

                {/* Link */}
                <td className="px-5 py-3 min-w-[150px]">
                  {isEditing ? (
                    <input 
                      type="text" 
                      value={editFormData.googleMapLink || ''} 
                      onChange={(e) => handleInputChange('googleMapLink', e.target.value)}
                      placeholder="https://g.page/..."
                      className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  ) : (
                    loc.googleMapLink ? (
                      <a href={loc.googleMapLink} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline text-[10px] break-all line-clamp-2">
                        {loc.googleMapLink}
                      </a>
                    ) : (
                      <span className="text-slate-500 text-[10px]">-</span>
                    )
                  )}
                </td>

                {/* Actions */}
                <td className="px-5 py-3 text-center whitespace-nowrap">
                  {isEditing ? (
                    <div className="flex items-center justify-center gap-2">
                      <button 
                        onClick={() => saveEdit(loc.id)} 
                        disabled={isSaving}
                        className="p-1.5 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded transition"
                        title="บันทึก"
                      >
                        <Check size={14} />
                      </button>
                      <button 
                        onClick={cancelEdit} 
                        disabled={isSaving}
                        className="p-1.5 bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white rounded transition"
                        title="ยกเลิก"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <button 
                        onClick={() => startEdit(loc)} 
                        className="p-1.5 bg-slate-800 text-slate-400 hover:text-blue-400 hover:bg-slate-700 rounded transition"
                        title="แก้ไขแบบ Inline"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button 
                        onClick={() => deleteLocation(loc.id)} 
                        className="p-1.5 bg-slate-800 text-slate-400 hover:text-rose-500 hover:bg-slate-700 rounded transition"
                        title="ลบข้อมูล"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </td>

              </tr>
            );
          })}
          {sortedData.length === 0 && (
            <tr>
              <td colSpan={5} className="px-5 py-12 text-center text-slate-500">
                ไม่มีข้อมูลตำแหน่ง/พิกัด
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

