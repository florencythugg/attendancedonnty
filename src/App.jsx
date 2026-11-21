import React, { useState, useEffect } from 'react';
import AuthScreen from './components/AuthScreen';
import TeacherDashboard from './components/TeacherDashboard';
import StudentDashboard from './components/StudentDashboard';
import { dbService } from './services/db';

const SESSION_KEY = 'ap_v2_current_user';

function WelcomeSplash({ onDone }) {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setFading(true), 1200);
    const t2 = setTimeout(() => onDone(), 1700);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onDone]);

  return (
    <div
      className={`fixed inset-0 z-50 bg-[#030712] flex flex-col items-center justify-center pointer-events-none transition-all duration-500 ease-out ${
        fading ? 'opacity-0 scale-105' : 'opacity-100 scale-100'
      }`}
    >
      <style>{`
        @keyframes pulseDraw100 {
          0% { stroke-dashoffset: 100; }
          50% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: -100; }
        }
        @keyframes pulseRingExpand {
          0% { transform: scale(0.85); opacity: 0.8; }
          100% { transform: scale(1.85); opacity: 0; }
        }
      `}</style>

      <div className="relative flex items-center justify-center w-28 h-28 mb-4">
        <span
          style={{ animation: 'pulseRingExpand 1.6s cubic-bezier(0.16, 1, 0.3, 1) infinite' }}
          className="absolute inset-3 rounded-3xl border-2 border-cyan-400/60"
        />
        <span
          style={{ animation: 'pulseRingExpand 1.6s cubic-bezier(0.16, 1, 0.3, 1) 0.5s infinite' }}
          className="absolute inset-3 rounded-3xl border border-blue-500/50"
        />

        <div className="absolute inset-2 rounded-3xl bg-gradient-to-tr from-blue-600/45 via-cyan-400/35 to-indigo-600/45 blur-xl" />

        <div className="relative w-22 h-22 p-5 rounded-3xl bg-gradient-to-tr from-blue-600 via-cyan-400 to-indigo-600 p-[1.5px] shadow-2xl shadow-cyan-500/30">
          <div className="w-16 h-16 rounded-[1.35rem] bg-[#060b19] flex items-center justify-center">
            <svg viewBox="0 0 80 50" className="w-12 h-9 overflow-visible" fill="none">
              <path
                d="M 4 26 L 20 26 L 27 11 L 36 41 L 45 7 L 53 26 L 76 26"
                stroke="rgba(34, 211, 238, 0.22)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                pathLength="100"
                d="M 4 26 L 20 26 L 27 11 L 36 41 L 45 7 L 53 26 L 76 26"
                stroke="#22d3ee"
                strokeWidth="4.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  strokeDasharray: 100,
                  animation: 'pulseDraw100 1.4s ease-in-out infinite',
                  filter: 'drop-shadow(0 0 6px #22d3ee)'
                }}
              />
            </svg>
          </div>
        </div>
      </div>

      <div className="text-3xl font-black tracking-tight bg-gradient-to-r from-white via-cyan-100 to-blue-400 bg-clip-text text-transparent">
        Pulse
      </div>
    </div>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem(SESSION_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [dbState, setDbState] = useState({
    users: [],
    lessons: [],
    records: []
  });

  useEffect(() => {
    const unsubscribe = dbService.subscribeAll((nextState) => {
      setDbState(nextState);
    });
    return () => unsubscribe && unsubscribe();
  }, []);

  const handleAuthSuccess = (user) => {
    setCurrentUser(user);
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem(SESSION_KEY);
  };

  return (
    <>
      {showSplash && <WelcomeSplash onDone={() => setShowSplash(false)} />}

      {!currentUser ? (
        <AuthScreen onAuthSuccess={handleAuthSuccess} />
      ) : currentUser.role === 'teacher' ? (
        <TeacherDashboard user={currentUser} data={dbState} onLogout={handleLogout} />
      ) : (
        <StudentDashboard user={currentUser} data={dbState} onLogout={handleLogout} />
      )}
    </>
  );
}
