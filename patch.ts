import * as fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const regex = /{currentView === 'dashboard' && \([\s\S]*?{!\(currentView === 'dashboard'\) &&/m;

if (regex.test(code)) {
  code = code.replace(regex, `{currentView === 'dashboard' && (
        <div id="new-mobile-dashboard" className="w-full h-full bg-[#f8fbff] text-slate-800 flex flex-col overflow-y-auto relative z-30 font-sans">
          
          {/* Blue gradient header background */}
          <div className="absolute top-0 left-0 w-full h-[320px] bg-gradient-to-b from-[#4bc0c1] to-[#3b82f6] z-0 rounded-b-[40px] shadow-sm"></div>

          {/* Header Title */}
          <header className="relative z-10 pt-12 pb-6 px-6 flex justify-center items-center">
            <h1 className="text-xl font-bold text-white tracking-wide shadow-sm">หน้าแรก</h1>
            <div className="absolute right-6 flex gap-3">
               <button onClick={() => setShowSettingsModal(true)} className="w-8 h-8 rounded-full flex items-center justify-center text-white"><Settings size={20}/></button>
            </div>
          </header>

          {/* Top 2 Cards */}
          <div className="relative z-10 px-4 grid grid-cols-2 gap-4 mb-8 mt-2">
            
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col relative overflow-hidden">
              <div className="flex items-center gap-2 mb-4 z-10">
                <div className="bg-[#fbbc05] rounded-md p-2 shadow-sm text-white">
                  <ClipboardList size={20} className="stroke-[2.5px]"/>
                </div>
                <div className="flex-1">
                  <span className="text-sm font-bold text-slate-700 block leading-tight">รายการ<br/>พิกัดจัดเก็บ</span>
                </div>
              </div>
              <div className="text-right z-10 mt-2">
                <span className="text-3xl font-bold text-blue-600 tracking-tight">{statsSummary.total}</span>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col relative overflow-hidden">
              <div className="flex items-center gap-2 mb-4 z-10">
                <div className="bg-[#4285F4] rounded-md p-2 shadow-sm text-white">
                  <ClipboardList size={20} className="stroke-[2.5px]"/>
                </div>
                <div className="flex-1">
                  <span className="text-sm font-bold text-slate-700 block leading-tight">รายการ<br/>คิวงาน</span>
                </div>
              </div>
              <div className="text-right z-10 mt-2">
                <span className="text-3xl font-bold text-blue-600 tracking-tight">{routePoints.length}</span>
              </div>
            </div>

          </div>

          {/* Grid Menu Icons */}
          <div className="relative z-10 bg-white flex-1 rounded-t-[32px] pt-10 px-6 pb-32 mb-10 shadow-[0_-4px_20px_rgba(0,0,0,0.04)]">
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
                <div className="w-14 h-14 rounded-[16px] bg-[#3b82f6] text-white flex items-center justify-center shadow-md transition group-hover:scale-105">
                   <MapPin size={26} className="stroke-[2px]"/>
                </div>
                <span className="text-xs font-medium text-slate-600 text-center leading-tight">เพิ่มหมุด</span>
              </button>

              <button 
                onClick={() => {
                  setCurrentView('map');
                  if (isMobile) setMobileActiveTab('map');
                }}
                className="flex flex-col items-center gap-2 group cursor-pointer"
              >
                <div className="w-14 h-14 rounded-[16px] bg-[#f59e0b] text-white flex items-center justify-center shadow-md transition group-hover:scale-105">
                   <MapIcon size={26} className="stroke-[2px]"/>
                </div>
                <span className="text-xs font-medium text-slate-600 text-center leading-tight">เปิดแผนที่</span>
              </button>

              <button 
                onClick={() => {
                  setCurrentView('table');
                }}
                className="flex flex-col items-center gap-2 group cursor-pointer"
              >
                <div className="w-14 h-14 rounded-[16px] bg-[#10b981] text-white flex items-center justify-center shadow-md transition group-hover:scale-105">
                   <ClipboardList size={26} className="stroke-[2px]"/>
                </div>
                <span className="text-xs font-medium text-slate-600 text-center leading-tight">พิกัดทั้งหมด</span>
              </button>

              <button 
                onClick={() => {
                  setCurrentView('map');
                  if (isMobile) setMobileActiveTab('list');
                }}
                className="flex flex-col items-center gap-2 group cursor-pointer"
              >
                <div className="w-14 h-14 rounded-[16px] bg-[#ef4444] text-white flex items-center justify-center shadow-md transition group-hover:scale-105">
                   <Search size={26} className="stroke-[2px]"/>
                </div>
                <span className="text-xs font-medium text-slate-600 text-center leading-tight">ค้นหาพิกัด</span>
              </button>

              <button 
                onClick={() => setShowPlaylistTodayModal(true)}
                className="flex flex-col items-center gap-2 group cursor-pointer relative"
              >
                {routePoints.length > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#ef4444] rounded-full border-2 border-white text-[10px] text-white flex items-center justify-center font-bold">{routePoints.length}</span>}
                <div className="w-14 h-14 rounded-[16px] bg-[#0cc75c] text-white flex items-center justify-center shadow-md transition group-hover:scale-105">
                   <CalendarDays size={26} className="stroke-[2px]"/>
                </div>
                <span className="text-xs font-medium text-slate-600 text-center leading-tight">คิวงานวันนี้</span>
              </button>

              <button 
                onClick={() => setShowQueueModal(true)}
                className="flex flex-col items-center gap-2 group cursor-pointer relative"
              >
                {queueLocations.length > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#ef4444] rounded-full border-2 border-white text-[10px] text-white flex items-center justify-center font-bold">{queueLocations.length}</span>}
                <div className="w-14 h-14 rounded-[16px] bg-[#1c81ef] text-white flex items-center justify-center shadow-md transition group-hover:scale-105">
                   <AlertCircle size={26} className="stroke-[2px]"/>
                </div>
                <span className="text-xs font-medium text-slate-600 text-center leading-tight">รอกรอกลิงก์</span>
              </button>

              <button 
                onClick={() => setShowStatsModal(true)}
                className="flex flex-col items-center gap-2 group cursor-pointer"
              >
                <div className="w-14 h-14 rounded-[16px] bg-[#8b5cf6] text-white flex items-center justify-center shadow-md transition group-hover:scale-105">
                   <BarChart2 size={26} className="stroke-[2px]"/>
                </div>
                <span className="text-xs font-medium text-slate-600 text-center leading-tight">ดูสถิติ</span>
              </button>

              <button 
                onClick={() => setIsProximityAlertActive(!isProximityAlertActive)}
                className="flex flex-col items-center gap-2 group cursor-pointer"
              >
                <div className={\`w-14 h-14 rounded-[16px] text-white flex items-center justify-center shadow-md transition group-hover:scale-105 \${isProximityAlertActive ? 'bg-[#916bfa]' : 'bg-slate-300'}\`}>
                   <Activity size={26} className="stroke-[2px]"/>
                </div>
                <span className="text-xs font-medium text-slate-600 text-center leading-tight">ระบบเตือน</span>
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
                <div className="w-14 h-14 rounded-[16px] bg-[#ffb902] text-white flex items-center justify-center shadow-md transition group-hover:scale-105">
                   <Sparkles size={26} className="stroke-[2px]"/>
                </div>
                <span className="text-xs font-medium text-slate-600 text-center leading-tight">ไม้วัดระยะ</span>
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
                <div className="w-14 h-14 rounded-[16px] bg-[#0abb59] text-white flex items-center justify-center shadow-md transition group-hover:scale-105">
                   <Layers size={26} className="stroke-[2px]"/>
                </div>
                <span className="text-xs font-medium text-slate-600 text-center leading-tight">วัดพื้นที่</span>
              </button>

            </div>
          </div>
          
          {/* Bottom Bar Navigation matching the screenshot */}
          <div className="fixed bottom-0 left-0 w-full h-[65px] bg-white border-t border-slate-100 flex items-center justify-around z-40 pb-2">
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
      {!(currentView === 'dashboard') &&`);
  fs.writeFileSync('src/App.tsx', code);
}
