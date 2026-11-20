import React, { useState } from 'react';
import { QrCode, GraduationCap, UserCheck, ShieldCheck, Cloud, HardDrive, ArrowRight, Sparkles } from 'lucide-react';
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
    <div className="relative min-h-screen bg-[#030712] overflow-hidden flex flex-col justify-center px-4 py-8">
      {/* Анимированные фоновые градиенты */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="animate-orb absolute -top-24 -left-24 w-80 h-80 rounded-full bg-blue-600/20 blur-[90px]" />
        <div className="animate-orb-delayed absolute top-1/2 -right-24 w-80 h-80 rounded-full bg-indigo-600/20 blur-[90px]" />
        <div className="animate-orb absolute -bottom-24 left-1/3 w-72 h-72 rounded-full bg-cyan-500/15 blur-[90px]" />
      </div>

      <div className="relative z-10 w-full max-w-md mx-auto animate-tab-enter">
        {/* Логотип и статус */}
        <div className="text-center mb-7">
          <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 p-[1px] shadow-2xl shadow-blue-500/30 mb-4">
            <div className="w-full h-full rounded-3xl bg-slate-950/80 backdrop-blur-xl flex items-center justify-center">
              <QrCode className="w-10 h-10 text-blue-400" />
            </div>
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-slate-950" />
            </span>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-blue-100 to-indigo-300 bg-clip-text text-transparent">
            Attendance Pro
          </h1>
          <p className="text-xs text-slate-400 mt-1.5 tracking-wide">
            Смарт-система контроля посещаемости • HMAC & GPS
          </p>

          <div className="mt-3.5 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] font-medium glass-card text-slate-300">
            {dbService.isCloud ? (
              <>
                <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                <span>Cloud Sync: Firebase Online</span>
              </>
            ) : (
              <>
                <HardDrive className="w-3.5 h-3.5 text-amber-400" />
                <span>Локальный режим</span>
              </>
            )}
          </div>
        </div>

        {/* Основная стеклянная карточка */}
        <div className="glass-card rounded-3xl p-6">
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950/80 rounded-2xl border border-white/5 mb-5">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(''); }}
              className={`py-2.5 text-xs font-bold rounded-xl transition-all duration-200 ${
                mode === 'login'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Вход в систему
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setError(''); }}
              className={`py-2.5 text-xs font-bold rounded-xl transition-all duration-200 ${
                mode === 'register'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Регистрация
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === 'register' && (
              <div className="space-y-3.5 animate-tab-enter">
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setRole('student')}
                    className={`flex items-center justify-center gap-2 py-3 px-3 rounded-2xl border text-xs font-bold transition-all ${
                      role === 'student'
                        ? 'bg-blue-500/15 border-blue-500/60 text-blue-300 shadow-inner'
                        : 'bg-slate-950/60 border-white/5 text-slate-400 hover:border-white/15'
                    }`}
                  >
                    <GraduationCap className="w-4 h-4" />
                    Студент
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('teacher')}
                    className={`flex items-center justify-center gap-2 py-3 px-3 rounded-2xl border text-xs font-bold transition-all ${
                      role === 'teacher'
                        ? 'bg-indigo-500/15 border-indigo-500/60 text-indigo-300 shadow-inner'
                        : 'bg-slate-950/60 border-white/5 text-slate-400 hover:border-white/15'
                    }`}
                  >
                    <UserCheck className="w-4 h-4" />
                    Преподаватель
                  </button>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1 uppercase tracking-wider">
                    ФИО полностью
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={role === 'student' ? 'Иванов Иван Иванович' : 'Петров Пётр Петрович'}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-950/70 border border-white/10 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition"
                  />
                </div>

                {role === 'student' ? (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1 uppercase tracking-wider">
                      Академическая группа
                    </label>
                    <input
                      type="text"
                      value={group}
                      onChange={(e) => setGroup(e.target.value.toUpperCase())}
                      placeholder="Введите вашу группу (напр. КСЦ-23)"
                      className="w-full px-4 py-3 rounded-2xl bg-slate-950/70 border border-white/10 text-sm text-white uppercase placeholder:normal-case placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition"
                    />
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1 uppercase tracking-wider">
                        Кафедра
                      </label>
                      <input
                        type="text"
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        placeholder="Кафедра компьютерной инженерии"
                        className="w-full px-4 py-3 rounded-2xl bg-slate-950/70 border border-white/10 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1 uppercase tracking-wider">
                        Код доступа преподавателя
                      </label>
                      <input
                        type="text"
                        value={inviteCode}
                        onChange={(e) => setInviteCode(e.target.value)}
                        placeholder="TEACHER2026"
                        className="w-full px-4 py-3 rounded-2xl bg-slate-950/70 border border-white/10 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition"
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1 uppercase tracking-wider">
                Логин
              </label>
              <input
                type="text"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                placeholder="Введите логин"
                className="w-full px-4 py-3 rounded-2xl bg-slate-950/70 border border-white/10 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1 uppercase tracking-wider">
                Пароль
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                className="w-full px-4 py-3 rounded-2xl bg-slate-950/70 border border-white/10 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            {error && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 animate-tab-enter">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:brightness-110 active:scale-[0.98] transition-all text-sm font-bold text-white flex items-center justify-center gap-2 shadow-xl shadow-blue-600/25 disabled:opacity-50"
            >
              <span>{loading ? 'Подключение...' : mode === 'login' ? 'Войти' : 'Создать аккаунт'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-white/10">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 mb-2.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Быстрый демо-вход (для презентации):</span>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => quickDemo('teacher')}
                className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-200 active:scale-[0.98] transition"
              >
                Преподаватель
              </button>
              <button
                type="button"
                onClick={() => quickDemo('student')}
                className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-200 active:scale-[0.98] transition"
              >
                Студент
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
