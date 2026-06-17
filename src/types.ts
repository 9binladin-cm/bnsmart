
export interface BookmarkLocation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  category: 'Village' | 'Community' | 'Office' | 'Condo';
  notes: string;
  googleMapLink?: string;
  houseNumber?: string;  // บ้านเลขที่
  soi?: string;         // ซอย
  moo?: string;         // หมู่ที่
  tambon?: string;      // ตำบล/แขวง
  amphoe?: string;      // เขต/อำเภอ
  createdAt: number;
  checkedInAt?: number; // Check-in timestamp
}
