import React, { useState } from 'react';
import { QrCode, GraduationCap, UserCheck, ShieldCheck, Cloud, HardDrive, ArrowRight } from 'lucide-react';
import { dbService } from '../services/db';
import { TEACHER_INVITE_CODE } from '../firebaseConfig';

export default function AuthScreen({ onAuthSuccess }) {
  const [mode, setMode] = useState('login');
  const [role, setRole] = useState('student');
  const [fullName, setFullName] = useState('');
  const [group, setGroup] = useState('');
  const [department, setDepartment] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        const user = await dbService.loginUser(login, password);
        onAuthSuccess(user);
      } else {
        if (!fullName.trim() || !login.trim() || !password.trim()) {
          throw new Error('Заполните все обязательные поля');
        }
        if (role === 'student' && !group.trim()) {
          throw new Error('Введите вашу учебную группу');
        }
        if (role === 'teacher' && inviteCode.trim() !== TEACHER_INVITE_CODE) {
          throw new Error(`Неверный код преподавателя (код: ${TEACHER_INVITE_CODE})`);
        }
        const user = await dbService.registerUser({
          role,
          fullName,
          group: group.trim().toUpperCase(),
          department: department.trim() || 'Кафедра КИ',
          login,
          password
        });
        onAuthSuccess(user);
      }
    } catch (err) {
      setError(err.message || 'Ошибка авторизации');
    } finally {
      setLoading(false);
    }
  };

  const quickDemo = async (demoRole) => {
    setError('');
    setLoading(true);
    try {
      const user = await dbService.loginUser(demoRole === 'teacher' ? 'teacher' : 'student', '123');
      onAuthSuccess(user);
    } catch {
      try {
        const created = await dbService.registerUser(
          demoRole === 'teacher'
            ? {
                role: 'teacher',
                fullName: 'Чередникова О.Ю.',
                department: 'Кафедра компьютерной инженерии',
                login: 'teacher',
                password: '123'
              }
            : {
                role: 'student',
                fullName: 'Косяк Даниил Дмитриевич',
                group: 'КСЦ-23',
                login: 'student',
                password: '123'
              }
        );
        onAuthSuccess(created);
      } catch (e2) {
        setError(e2.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center px-4 py-8 max-w-md mx-auto">
      <div className="text-center mb-7">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg shadow-blue-600/30 mb-4">
          <QrCode className="w-9 h-9 text-white" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Attendance Pro</h1>
        <p className="text-sm text-slate-400 mt-1">Учёт посещаемости по динамическим QR-кодам</p>

        <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-900 border border-slate-800 text-slate-300">
          {dbService.isCloud ? (
            <>
              <Cloud className="w-3.5 h-3.5 text-emerald-400" />
              <span>Облако Firebase подключено</span>
            </>
          ) : (
            <>
              <HardDrive className="w-3.5 h-3.5 text-amber-400" />
              <span>Локальный режим</span>
            </>
          )}
        </div>
      </div>

      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="grid grid-cols-2 gap-1 p-1 bg-slate-950 rounded-xl mb-5">
          <button
            type="button"
            onClick={() => { setMode('login'); setError(''); }}
            className={`py-2 text-sm font-semibold rounded-lg transition ${
              mode === 'login' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Вход
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setError(''); }}
            className={`py-2 text-sm font-semibold rounded-lg transition ${
              mode === 'register' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Регистрация
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'register' && (
            <>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setRole('student')}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-sm font-medium transition ${
                    role === 'student'
                      ? 'bg-blue-600/15 border-blue-500 text-blue-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <GraduationCap className="w-4 h-4" />
                  Студент
                </button>
                <button
                  type="button"
                  onClick={() => setRole('teacher')}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-sm font-medium transition ${
                    role === 'teacher'
                      ? 'bg-indigo-600/15 border-indigo-500 text-indigo-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <UserCheck className="w-4 h-4" />
                  Преподаватель
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">ФИО полностью</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={role === 'student' ? 'Иванов Иван Иванович' : 'Петров Пётр Петрович'}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {role === 'student' ? (
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Академическая группа
                  </label>
                  <input
                    type="text"
                    value={group}
                    onChange={(e) => setGroup(e.target.value.toUpperCase())}
                    placeholder="Введите название вашей группы (напр. КСЦ-23)"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white uppercase placeholder:normal-case focus:outline-none focus:border-blue-500"
                  />
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Кафедра</label>
                    <input
                      type="text"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      placeholder="Например: Кафедра компьютерной инженерии"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Код доступа преподавателя
                    </label>
                    <input
                      type="text"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                      placeholder="TEACHER2026"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </>
              )}
            </>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Логин</label>
            <input
              type="text"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              placeholder="Придумайте или введите логин"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Пароль</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.99] transition text-sm font-semibold text-white flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 disabled:opacity-50"
          >
            <span>{loading ? 'Загрузка...' : mode === 'login' ? 'Войти в систему' : 'Создать аккаунт'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-slate-800">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-2.5">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            <span>Быстрый демо-вход (для демонстрации на защите):</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => quickDemo('teacher')}
              className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition"
            >
              Преподаватель
            </button>
            <button
              type="button"
              onClick={() => quickDemo('student')}
              className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition"
            >
              Студент
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
