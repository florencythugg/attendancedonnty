import React, { useState, useEffect } from 'react';
import { dbService } from './services/db';
import AuthScreen from './components/AuthScreen';
import TeacherDashboard from './components/TeacherDashboard';
import StudentDashboard from './components/StudentDashboard';

const SESSION_KEY = 'attendance_pro_current_user';

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
    const unsubscribe = dbService.subscribeAll((newData) => {
      setData(newData);
    });
    return () => unsubscribe && unsubscribe();
  }, []);

  const handleAuthSuccess = (u) => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(u));
    setUser(u);
  };

  const handleLogout = () => {
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
  };

  if (!user) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  if (user.role === 'teacher') {
    return <TeacherDashboard user={user} data={data} onLogout={handleLogout} />;
  }

  return <StudentDashboard user={user} data={data} onLogout={handleLogout} />;
}
