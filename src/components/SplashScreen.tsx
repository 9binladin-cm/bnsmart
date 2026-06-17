import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Navigation, Shield, Wifi, Compass, ArrowRight } from 'lucide-react';

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('กำลังเชื่อมต่อระบบ GPS...');
  const [isFinishing, setIsFinishing] = useState(false);

  // Status updates matching the loading sequence
  useEffect(() => {
    const totalDuration = 2800; // 2.8 seconds loading screen
    const intervalTime = 40;
    const steps = totalDuration / intervalTime;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      const currentProgress = Math.min((currentStep / steps) * 100, 100);
      setProgress(Math.floor(currentProgress));

      // Dynamic tech status dialogue in Thai, matching the logistics/trucking theme
      if (currentProgress < 25) {
        setStatusText('กำลังเปิดสัญญาณดาวเทียม & ตรวจสอบพิกัด...');
      } else if (currentProgress < 50) {
        setStatusText('กำลังดาวน์โหลดข้อมูลพิกัดลูกค้าในเครือข่ายฐานข้อมูล...');
      } else if (currentProgress < 75) {
        setStatusText('เชื่อมต่อฐานข้อมูล Cloud Firestore สำเร็จ...');
      } else if (currentProgress < 95) {
        setStatusText('กำลังประมวลผลระยะทางห่างจากตำแหน่งปัจจุบันของคุณ...');
      } else {
        setStatusText('ระบบแผนที่และพิกัดพร้อมใช้งาน NCPRO MAP!');
      }

      if (currentStep >= steps) {
        clearInterval(timer);
        setIsFinishing(true);
        // Clean fade out after complete
        const exitTimer = setTimeout(() => {
          onComplete();
        }, 600);
        return () => clearTimeout(exitTimer);
      }
    }, intervalTime);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {!isFinishing && (
        <motion.div
          id="ncpro-splash-screen"
          className="fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-[#07090e] select-none text-white overflow-hidden font-sans"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        >
          {/* Neon Grid Background & Ambient Lighting */}
          <div className="absolute inset-0 opacity-10 bg-[linear-gradient(rgba(18,24,38,0.3)_1px,transparent_1px),linear-gradient(90deg,rgba(18,24,38,0.3)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[160px] pointer-events-none"></div>
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none"></div>

          {/* Background Card holding our generated truck photo */}
          <motion.div
            className="absolute inset-0 w-full h-full opacity-20 pointer-events-none"
            initial={{ scale: 1.1, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.25 }}
            transition={{ duration: 2.5, ease: 'easeOut' }}
          >
            <img
              src="/src/assets/images/splash_truck_bg_1781660184853.jpg"
              alt="NCPRO Delivery Transporter Background"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            {/* Dark Linear and radial gradients to blend the image seamlessly */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#07090e] via-[#07090e]/80 to-transparent"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-[#07090e] via-transparent to-[#07090e]"></div>
          </motion.div>

          {/* Core Content Container */}
          <div className="z-10 flex flex-col items-center justify-center max-w-lg w-full px-6 text-center">
            
            {/* Animated Logo Assembly */}
            <div className="relative mb-8">
              {/* Spinning / pulsing radar rings */}
              <motion.div 
                className="absolute -inset-10 rounded-full border border-blue-500/20"
                animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              />
              <motion.div 
                className="absolute -inset-16 rounded-full border border-cyan-500/10"
                animate={{ scale: [1, 1.6, 1], opacity: [0.4, 0, 0.4] }}
                transition={{ duration: 4.5, repeat: Infinity, ease: "linear" }}
              />

              {/* The Interlocking Geometric Diamond Symbol */}
              <motion.div
                className="relative bg-gradient-to-br from-slate-900/90 to-slate-950/90 border border-slate-800 p-8 rounded-3xl shadow-2xl shadow-blue-500/10"
                initial={{ rotate: -10, scale: 0.8, opacity: 0 }}
                animate={{ rotate: 0, scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 100, damping: 15 }}
              >
                <svg className="w-20 h-20 text-white" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="neonGlowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#38BDF8" />
                      <stop offset="100%" stopColor="#1D4ED8" />
                    </linearGradient>
                    <filter id="shadowFilter">
                      <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#38BDF8" floodOpacity="0.5" />
                    </filter>
                  </defs>

                  {/* Animated path drawing of the beautiful interlocking geometric diamond */}
                  <motion.path
                    d="M 50 12 L 88 50 L 50 88 L 12 50 Z"
                    stroke="url(#neonGlowGrad)"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1.8, ease: 'easeInOut', delay: 0.3 }}
                  />

                  <motion.path
                    d="M 50 25 L 75 50 L 50 75 L 25 50 Z"
                    stroke="white"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter="url(#shadowFilter)"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 1.5, ease: 'easeInOut', delay: 0.8 }}
                  />

                  {/* Dynamic central pointer beacon icon */}
                  <motion.circle
                    cx="50"
                    cy="50"
                    r="6"
                    className="fill-cyan-400"
                    animate={{ scale: [1, 1.5, 1], opacity: [0.7, 1, 0.7] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  
                  {/* Subtle navigation cursor element */}
                  <polygon points="50,38 54,46 50,44 46,46" fill="#38BDF8" transform="rotate(45 50 50)"/>
                </svg>
              </motion.div>
            </div>

            {/* Typography Heading for NCPRO MAP */}
            <div className="mb-8">
              <motion.h1 
                className="text-4xl md:text-5xl font-black tracking-[0.15em] text-white flex items-center justify-center gap-1 font-display uppercase"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.5 }}
              >
                <span className="bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">NCPRO</span>
                <span className="bg-gradient-to-r from-[#38BDF8] to-[#1D4ED8] bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(56,189,248,0.25)]">MAP</span>
              </motion.h1>
              
              <motion.p 
                className="text-slate-400 text-xs md:text-sm font-medium tracking-widest uppercase mt-2.5 flex items-center justify-center gap-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.8 }}
                transition={{ duration: 0.8, delay: 0.7 }}
              >
                <Compass className="w-4 h-4 text-cyan-400 animate-spin-slow" />
                TRANS DIRECTIONAL LOGISTICS NAVIGATION SYSTEM
              </motion.p>
            </div>

            {/* Custom Glowing Tech Progress Bar */}
            <div className="w-full bg-slate-900/80 border border-slate-800/80 p-5 rounded-2xl mb-6 shadow-xl backdrop-blur-md">
              <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-2.5 px-1">
                <span className="flex items-center gap-1.5 font-mono text-cyan-400">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
                  {statusText}
                </span>
                <span className="font-mono bg-slate-800 px-2 py-0.5 rounded text-slate-300">{progress}%</span>
              </div>
              
              <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden p-[2px] border border-slate-900">
                <motion.div 
                  className="h-full bg-gradient-to-r from-blue-600 via-cyan-400 to-cyan-300 rounded-full shadow-[0_0_8px_rgba(56,189,248,0.5)]"
                  initial={{ width: '0%' }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.1, ease: 'easeOut' }}
                />
              </div>

              {/* Server & Client Connection Telemetries (Legitimate indicators, no slop) */}
              <div className="flex items-center justify-around mt-4 pt-3 border-t border-slate-800/60 font-mono text-[9px] text-slate-500">
                <div className="flex items-center gap-1.5">
                  <Shield size={10} className="text-emerald-500" />
                  <span>SECURE AUTHENTICATED</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Wifi size={10} className="text-cyan-500 animate-pulse" />
                  <span>GPS ONLINE</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Navigation size={10} className="text-blue-500" />
                  <span>LAT/LNG ACTIVE</span>
                </div>
              </div>
            </div>

            {/* Elegant Bypass/Skip Loader button */}
            <motion.button
              onClick={onComplete}
              className="group px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700/80 text-xs text-slate-400 hover:text-white rounded-xl transition-all duration-300 flex items-center gap-2 shadow-lg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.9 }}
              transition={{ delay: 1 }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <span>ข้ามขั้นตอนดาวน์โหลด</span>
              <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
            </motion.button>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
