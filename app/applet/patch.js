const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const regex = /{currentView === 'dashboard' && \([\s\S]*?{\/\* 2\. Interactive Map Screen/;

if (regex.test(code)) {
  code = code.replace(regex, `{currentView === 'dashboard' && (
        <div id="new-mobile-dashboard" className="w-full h-full bg-[#f8fbff] text-slate-800 flex flex-col overflow-y-auto relative z-30 font-sans">
          
          {/* Blue gradient header background */}
          <div className="absolute top-0 left-0 w-full h-[320px] bg-gradient-to-b from-[#4bc0c1] to-[#3b82f6] z-0 rounded-b-[40px] shadow-sm pointer-events-none"></div>

          {/* Header Title */}
          <header className="relative z-10 pt-12 pb-6 px-6 flex justify-center items-center">
            <h1 className="text-xl font-bold text-white tracking-wide shadow-sm">หน้าแรก</h1>
            <div className="absolute right-6 flex gap-3">
               <button onClick={() => setShowSettingsModal(true)} className="w-8 h-8 rounded-full flex items-center justify-center text-white"><Settings size={20}/></button>
            </div>
          </header>

          {/* Top 2 Cards */}
          <div className="relative z-10 px-4 grid grid-cols-2 gap-4 mb-8 mt-2">
            
            <div className="bg-white rounded-[20px] p-4 shadow-sm border border-slate-100 flex flex-col relative overflow-hidden">
              <div className="flex items-center gap-3 mb-3 z-10">
                <div className="bg-[#fbbc05] rounded-xl p-2.5 shadow-sm text-white">
                  <ClipboardList size={22} className="stroke-[2.5px]"/>
                </div>
                <div className="flex-1">
                  <span className="text-sm font-bold text-slate-700 block leading-tight">รายการ<br/>พิกัดส่ง</span>
                </div>
              </div>
              <div className="text-right z-10 mt-1">
                <span className="text-4xl font-light text-[#589cf8] tracking-tight">{statsSummary.total}</span>
              </div>
            </div>

            <div className="bg-white rounded-[20px] p-4 shadow-sm border border-slate-100 flex flex-col relative overflow-hidden">
              <div className="flex items-center gap-3 mb-3 z-10">
                <div className="bg-[#4285F4] rounded-xl p-2.5 shadow-sm text-white">
                  <CalendarDays size={22} className="stroke-[2.5px]"/>
                </div>
                <div className="flex-1">
                  <span className="text-sm font-bold text-slate-700 block leading-tight">รายการ<br/>คิวงาน</span>
                </div>
              </div>
              <div className="text-right z-10 mt-1">
                <span className="text-4xl font-light text-[#589cf8] tracking-tight">{routePoints.length}</span>
              </div>
            </div>

          </div>

          {/* Grid Menu Icons */}
          <div className="relative z-10 bg-white flex-1 rounded-t-[32px] pt-10 px-6 pb-32 shadow-[0_-4px_20px_rgba(0,0,0,0.04)]">
            <div className="grid grid-cols-4 gap-y-7 gap-x-2">
               
              <button 
                onClick={() => {
                  setCurrentView('map');
                  if (isMobile) setMobileActiveTab('map');
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
                className="flex flex-col items-center gap-2 group cursor-pointer"
              >
                <div className="w-[56px] h-[56px] rounded-full bg-[#1b88e9] text-white flex items-center justify-center shadow-[0_4px_10px_rgba(27,136,233,0.3)] transition group-hover:scale-105">
                   <MapPin size={24} className="stroke-[2.5px]"/>
                </div>
                <span className="text-[11px] font-bold text-slate-600 text-center leading-tight">บุ๊คกิ้ง</span>
              </button>

              <button 
                onClick={() => {
                  setCurrentView('map');
                  if (isMobile) setMobileActiveTab('map');
                }}
                className="flex flex-col items-center gap-2 group cursor-pointer"
              >
                <div className="w-[56px] h-[56px] rounded-full bg-[#ffb902] text-white flex items-center justify-center shadow-[0_4px_10px_rgba(255,185,2,0.3)] transition group-hover:scale-105">
                   <MapIcon size={24} className="stroke-[2.5px]"/>
                </div>
                <span className="text-[11px] font-bold text-slate-600 text-center leading-tight">พิมพ์เวย์บิล</span>
              </button>

              <button 
                onClick={() => {
                  setCurrentView('table');
                }}
                className="flex flex-col items-center gap-2 group cursor-pointer"
              >
                <div className="w-[56px] h-[56px] rounded-full bg-[#0abb59] text-white flex items-center justify-center shadow-[0_4px_10px_rgba(10,187,89,0.3)] transition group-hover:scale-105">
                   <ClipboardList size={24} className="stroke-[2.5px]"/>
                </div>
                <span className="text-[11px] font-bold text-slate-600 text-center leading-tight">เข้ารับพัสดุ</span>
              </button>

              <button 
                onClick={() => {
                  setCurrentView('map');
                  if (isMobile) setMobileActiveTab('list');
                }}
                className="flex flex-col items-center gap-2 group cursor-pointer"
              >
                <div className="w-[56px] h-[56px] rounded-full bg-[#ff6849] text-white flex items-center justify-center shadow-[0_4px_10px_rgba(255,104,73,0.3)] transition group-hover:scale-105">
                   <Search size={24} className="stroke-[2.5px]"/>
                </div>
                <span className="text-[11px] font-bold text-slate-600 text-center leading-tight">ขาออก</span>
              </button>

              <button 
                onClick={() => setShowPlaylistTodayModal(true)}
                className="flex flex-col items-center gap-2 group cursor-pointer relative"
              >
                {routePoints.length > 0 && <span className="absolute top-0 right-1 w-[18px] h-[18px] bg-[#ef4444] rounded-full border-2 border-white text-[9px] text-white flex items-center justify-center font-bold z-10 shadow-sm">{routePoints.length}</span>}
                <div className="w-[56px] h-[56px] rounded-full bg-[#0cc75c] text-white flex items-center justify-center shadow-[0_4px_10px_rgba(12,199,92,0.3)] transition group-hover:scale-105">
                   <CalendarDays size={24} className="stroke-[2.5px]"/>
                </div>
                <span className="text-[11px] font-bold text-slate-600 text-center leading-tight">ขาเข้า</span>
              </button>

              <button 
                onClick={() => setShowQueueModal(true)}
                className="flex flex-col items-center gap-2 group cursor-pointer relative"
              >
                {queueLocations.length > 0 && <span className="absolute top-0 right-1 w-[18px] h-[18px] bg-[#ef4444] rounded-full border-2 border-white text-[9px] text-white flex items-center justify-center font-bold z-10 shadow-sm">{queueLocations.length}</span>}
                <div className="w-[56px] h-[56px] rounded-full bg-[#1c81ef] text-white flex items-center justify-center shadow-[0_4px_10px_rgba(28,129,239,0.3)] transition group-hover:scale-105">
                   <AlertCircle size={24} className="stroke-[2.5px]"/>
                </div>
                <span className="text-[11px] font-bold text-slate-600 text-center leading-tight">จ่ายงาน</span>
              </button>

              <button 
                onClick={() => setShowStatsModal(true)}
                className="flex flex-col items-center gap-2 group cursor-pointer"
              >
                <div className="w-[56px] h-[56px] rounded-full bg-[#9b80e4] text-white flex items-center justify-center shadow-[0_4px_10px_rgba(155,128,228,0.3)] transition group-hover:scale-105">
                   <BarChart2 size={24} className="stroke-[2.5px]"/>
                </div>
                <span className="text-[11px] font-bold text-slate-600 text-center leading-tight">เซ็นรับ</span>
              </button>

              <button 
                onClick={() => setIsProximityAlertActive(!isProximityAlertActive)}
                className="flex flex-col items-center gap-2 group cursor-pointer"
              >
                <div className={\`w-[56px] h-[56px] rounded-full text-white flex items-center justify-center shadow-md transition group-hover:scale-105 \${isProximityAlertActive ? 'bg-[#ffb902] shadow-[0_4px_10px_rgba(255,185,2,0.3)]' : 'bg-slate-300'}\`}>
                   <Activity size={24} className="stroke-[2.5px]"/>
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
                className="flex flex-col items-center gap-2 group cursor-pointer"
              >
                <div className="w-[56px] h-[56px] rounded-full bg-[#0abb59] text-white flex items-center justify-center shadow-[0_4px_10px_rgba(10,187,89,0.3)] transition group-hover:scale-105">
                   <Sparkles size={24} className="stroke-[2.5px]"/>
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
                className="flex flex-col items-center gap-2 group cursor-pointer"
              >
                <div className="w-[56px] h-[56px] rounded-full bg-[#ff6849] text-white flex items-center justify-center shadow-[0_4px_10px_rgba(255,104,73,0.3)] transition group-hover:scale-105">
                   <Layers size={24} className="stroke-[2.5px]"/>
                </div>
                <span className="text-[11px] font-bold text-slate-600 text-center leading-tight">วัดพื้นที่</span>
              </button>

            </div>
          </div>
          
          {/* Bottom Bar Navigation */}
          <div className="fixed bottom-0 left-0 w-full h-[65px] bg-white shadow-[0_-10px_20px_rgba(0,0,0,0.04)] flex items-center justify-around z-[100] pb-2">
             <button onClick={() => setCurrentView('dashboard')} className="flex flex-col items-center gap-1 mt-2 text-[#3b82f6]">
                <Home size={22} className="fill-[#3b82f6] stroke-[#3b82f6]" />
                <span className="text-[10px] font-bold">หน้าแรก</span>
             </button>
             <button onClick={() => setCurrentView('table')} className="flex flex-col items-center gap-1 mt-2 text-slate-400 hover:text-[#3b82f6]">
                <Search size={22} className="stroke-[2.5px]" />
                <span className="text-[10px] font-medium">ค้นหา</span>
             </button>
             <button onClick={() => setShowSettingsModal(true)} className="flex flex-col items-center gap-1 mt-2 text-slate-400 hover:text-[#3b82f6]">
                <Users size={22} className="stroke-[2.5px]" />
                <span className="text-[10px] font-medium">ฉัน</span>
             </button>
          </div>

        </div>
      )}
      {/* 2. Interactive Map Screen`);
  fs.writeFileSync('src/App.tsx', code);
  console.log('Successfully patched App.tsx');
} else {
  console.log('REGEX DID NOT MATCH');
}
