import React, { useState, useEffect } from 'react';
import AuthScreen from './components/AuthScreen';
import TeacherDashboard from './components/TeacherDashboard';
import StudentDashboard from './components/StudentDashboard';
import { dbService } from './services/db';

const SESSION_KEY = 'ap_v2_current_user';
const CARBON_BG_COLOR = '#060607';

function PulseSplashIntro({ exiting }) {
  return (
    <div
      className={`carbon-bg fixed inset-0 z-[100] flex flex-col items-center justify-center p-6 transition-all duration-500 ease-out ${
        exiting ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[28rem] h-[28rem] rounded-full bg-white/[0.06] blur-[120px] animate-pulse" />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center">
        <div className="relative mb-6 select-none flex items-center justify-center w-28 h-28 sm:w-32 sm:h-32 splash-logo-pop">
          <div className="pointer-events-none absolute w-32 h-32 sm:w-36 sm:h-36 rounded-[2rem] bg-gradient-to-tr from-white/25 via-zinc-300/15 to-white/25 blur-2xl animate-pulse" />

          <span
            className="pointer-events-none absolute w-28 h-28 sm:w-32 sm:h-32 rounded-[2rem] border-[1.5px] border-white/60 shadow-[0_0_24px_rgba(255,255,255,0.22)]"
            style={{ animation: 'pulseSquareWave 2.2s cubic-bezier(0.16, 1, 0.3, 1) infinite' }}
          />
          <span
            className="pointer-events-none absolute w-28 h-28 sm:w-32 sm:h-32 rounded-[2rem] border-[1.5px] border-zinc-400/45 shadow-[0_0_24px_rgba(255,255,255,0.14)]"
            style={{ animation: 'pulseSquareWave 2.2s cubic-bezier(0.16, 1, 0.3, 1) infinite 1.1s' }}
          />

          <div className="relative w-full h-full rounded-[2rem] shadow-[0_0_40px_rgba(255,255,255,0.16)] flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="splashCarbonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="50%" stopColor="#a1a1aa" />
                  <stop offset="100%" stopColor="#ffffff" />
                </linearGradient>
                <filter id="splashCarbonGlow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="2.6" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              <rect
                x="2"
                y="2"
                width="96"
                height="96"
                rx="24"
                fill="#0a0a0c"
                stroke="url(#splashCarbonGrad)"
                strokeWidth="2.8"
              />

              <path
                d="M 16 52 L 32 52 L 40 32 L 50 71 L 60 27 L 68 52 L 84 52"
                fill="none"
                stroke="#ffffff"
                strokeOpacity="0.16"
                strokeWidth="3.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              <path
                d="M 16 52 L 32 52 L 40 32 L 50 71 L 60 27 L 68 52 L 84 52"
                fill="none"
                stroke="url(#splashCarbonGrad)"
                strokeWidth="4.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#splashCarbonGlow)"
                style={{
                  strokeDasharray: 145,
                  animation: 'pulseWaveDraw 1.8s ease-in-out infinite'
                }}
              />

              <circle cx="84" cy="52" r="3.2" fill="#ffffff" filter="url(#splashCarbonGlow)">
                <animate
                  attributeName="opacity"
                  values="0.25;1;0.25"
                  dur="1.4s"
                  repeatCount="indefinite"
                />
              </circle>
            </svg>

            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70" />
              <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-400 border-2 border-[#060607]" />
            </span>
          </div>
        </div>

        <h1 className="text-5xl sm:text-6xl font-black tracking-tight pulse-shimmer-title splash-text-up">
          Pulse
        </h1>
        <p className="mt-2 text-xs sm:text-sm uppercase tracking-[0.28em] text-zinc-400 font-semibold splash-sub-up">
          Цифровой кампус
        </p>

        <div className="mt-7 w-44 h-1 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-zinc-400 via-white to-zinc-300 splash-bar-fill" />
        </div>
      </div>

      <style>{`
        @keyframes splashLogoPop {
          0% { opacity: 0; transform: scale(0.82); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes splashFadeUp {
          0% { opacity: 0; transform: translateY(12px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes splashBarFill {
          0% { width: 0%; }
          100% { width: 100%; }
        }
        .splash-logo-pop {
          animation: splashLogoPop 0.55s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .splash-text-up {
          opacity: 0;
          animation: splashFadeUp 0.55s cubic-bezier(0.16, 1, 0.3, 1) 0.18s forwards;
        }
        .splash-sub-up {
          opacity: 0;
          animation: splashFadeUp 0.55s cubic-bezier(0.16, 1, 0.3, 1) 0.32s forwards;
        }
        .splash-bar-fill {
          animation: splashBarFill 1.45s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
      `}</style>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem(SESSION_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [data, setData] = useState({ users: [], lessons: [], records: [] });
  const [showSplash, setShowSplash] = useState(true);
  const [splashExiting, setSplashExiting] = useState(false);

  useEffect(() => {
    const exitTimer = setTimeout(() => setSplashExiting(true), 1500);
    const hideTimer = setTimeout(() => setShowSplash(false), 2050);
    return () => {
      clearTimeout(exitTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  useEffect(() => {
    const applyDarkBars = async () => {
      document.documentElement.style.backgroundColor = CARBON_BG_COLOR;
      document.body.style.backgroundColor = CARBON_BG_COLOR;

      let metaTheme = document.querySelector('meta[name="theme-color"]');
      if (!metaTheme) {
        metaTheme = document.createElement('meta');
        metaTheme.name = 'theme-color';
        document.head.appendChild(metaTheme);
      }
      metaTheme.setAttribute('content', CARBON_BG_COLOR);

      try {
        if (window.Capacitor?.Plugins?.StatusBar) {
          const { StatusBar } = window.Capacitor.Plugins;
          await StatusBar.setBackgroundColor({ color: CARBON_BG_COLOR });
          await StatusBar.setStyle({ style: 'DARK' });
        }
      } catch {}
    };

    applyDarkBars();
    document.addEventListener('visibilitychange', applyDarkBars);
    window.addEventListener('focus', applyDarkBars);

    return () => {
      document.removeEventListener('visibilitychange', applyDarkBars);
      window.removeEventListener('focus', applyDarkBars);
    };
  }, []);

  useEffect(() => {
    const unsub = dbService.subscribeAll((nextData) => {
      setData(nextData);
    });
    return () => unsub && unsub();
  }, []);

  const handleAuthSuccess = (authedUser) => {
    setUser(authedUser);
    localStorage.setItem(SESSION_KEY, JSON.stringify(authedUser));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem(SESSION_KEY);
  };

  return (
    <>
      {!user ? (
        <AuthScreen onAuthSuccess={handleAuthSuccess} />
      ) : user.role === 'teacher' ? (
        <TeacherDashboard user={user} data={data} onLogout={handleLogout} />
      ) : (
        <StudentDashboard user={user} data={data} onLogout={handleLogout} />
      )}

      {showSplash && <PulseSplashIntro exiting={splashExiting} />}
    </>
  );
}
