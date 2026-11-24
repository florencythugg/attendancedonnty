import React, { useState, useEffect } from 'react';
import AuthScreen from './components/AuthScreen';
import TeacherDashboard from './components/TeacherDashboard';
import StudentDashboard from './components/StudentDashboard';
import { dbService } from './services/db';

const SESSION_KEY = 'ap_v2_current_user';

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

  useEffect(() => {
    const applyDarkBars = async () => {
      document.documentElement.style.backgroundColor = '#030712';
      document.body.style.backgroundColor = '#030712';

      let metaTheme = document.querySelector('meta[name="theme-color"]');
      if (!metaTheme) {
        metaTheme = document.createElement('meta');
        metaTheme.name = 'theme-color';
        document.head.appendChild(metaTheme);
      }
      metaTheme.setAttribute('content', '#030712');

      try {
        if (window.Capacitor?.Plugins?.StatusBar) {
          const { StatusBar } = window.Capacitor.Plugins;
          await StatusBar.setBackgroundColor({ color: '#030712' });
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

  if (!user) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  if (user.role === 'teacher') {
    return <TeacherDashboard user={user} data={data} onLogout={handleLogout} />;
  }

  return <StudentDashboard user={user} data={data} onLogout={handleLogout} />;
}
