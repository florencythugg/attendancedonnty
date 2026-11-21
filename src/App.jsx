import React, { useState, useEffect } from 'react';
import AuthScreen from './components/AuthScreen';
import TeacherDashboard from './components/TeacherDashboard';
import StudentDashboard from './components/StudentDashboard';
import { dbService } from './services/db';

const SESSION_KEY = 'ap_v2_current_user';

function WelcomeSplash({ onDone }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDone();
    }, 1450);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div className="fixed inset-0 z-50 bg-[#030712] flex flex-col items-center justify-center pointer-events-none animate-splash-screen">
      {/* Фоновое мягкое свечение */}
      <div className="absolute w-72 h-72 rounded-full bg-cyan-500/15 blur-[95px]" />
      <div className="absolute w-64 h-64 rounded-full bg-blue-600/20 blur-[85px]" />

      {/* Значок с бегущим импульсом */}
      <div className="relative flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-tr from-blue-600 via-cyan-400 to-indigo-600 p-[1.5px] shadow-2xl shadow-cyan-500/25 mb-4">
        <div className="w-full h-full rounded-[1.4rem] bg-[#060b19] flex items-center justify-center">
          <svg viewBox="0 0 80 50" className="w-12 h-9 overflow-visible" fill="none">
            <defs>
              <linearGradient id="splashPulseGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="50%" stopColor="#22d3ee" />
                <stop offset="100%" stopColor="#818cf8" />
              </linearGradient>
            </defs>
            <path
              d="M 4 26 L 20 26 L 27 11 L 36 41 L 45 7 L 53 26 L 76 26"
              stroke="url(#splashPulseGrad)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="animate-pulse-line"
            />
          </svg>
        </div>
      </div>

      <div className="text-2xl font-black tracking-tight bg-gradient-to-r from-white via-cyan-100 to-blue-400 bg-clip-text text-transparent">
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
