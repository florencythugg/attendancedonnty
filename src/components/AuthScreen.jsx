import React, { useState, useEffect } from 'react';
import { GraduationCap, UserCheck, Cloud, HardDrive, ArrowRight, Sparkles } from 'lucide-react';
import { dbService } from '../services/db';
import { TEACHER_INVITE_CODE } from '../firebaseConfig';

function AnimatedPulseLogo() {
  return (
    <div className="relative inline-flex items-center justify-center w-28 h-28 mb-3">
      <style>{`
        @keyframes logoWaveFlow {
          0% { stroke-dashoffset: 100; }
          50% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: -100; }
        }
        @keyframes logoRadarWave {
          0% { transform: scale(0.82); opacity: 0.75; }
          100% { transform: scale(1.75); opacity: 0; }
        }
        @keyframes logoGlowBreath {
          0%, 100% { opacity: 0.45; transform: scale(0.95); }
          50% { opacity: 0.85; transform: scale(1.08); }
        }
      `}</style>

      {/* Два расходящихся радарных кольца */}
      <span
        style={{ animation: 'logoRadarWave 2.4s cubic-bezier(0.16, 1, 0.3, 1) infinite' }}
        className="absolute inset-3 rounded-3xl border border-cyan-400/60 pointer-events-none"
      />
      <span
        style={{ animation: 'logoRadarWave 2.4s cubic-bezier(0.16, 1, 0.3, 1) 1.2s infinite' }}
        className="absolute inset-3 rounded-3xl border border-blue-500/50 pointer-events-none"
      />

      {/* Дышащее неоновое свечение */}
      <div
        style={{ animation: 'logoGlowBreath 3s ease-in-out infinite' }}
        className="absolute inset-2 rounded-3xl bg-gradient-to-tr from-blue-600/50 via-cyan-400/40 to-indigo-600/50 blur-xl pointer-events-none"
      />

      {/* Корпус логотипа */}
      <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-tr from-blue-600 via-cyan-400 to-indigo-600 p-[1.5px] shadow-2xl shadow-cyan-500/30">
        <div className="w-full h-full rounded-[1.4rem] bg-[#060b19]/90 backdrop-blur-xl flex items-center justify-center overflow-hidden relative">
          <div
            className="absolute inset-0 opacity-25"
            style={{
              backgroundImage:
                'radial-gradient(circle at 1px 1px, rgba(56,189,248,0.65) 1px, transparent 0)',
              backgroundSize: '10px 10px'
            }}
          />

          <svg viewBox="0 0 80 50" className="w-14 h-10 relative z-10 overflow-visible" fill="none">
            <defs>
              <linearGradient id="pulseGradLive" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="50%" stopColor="#22d3ee" />
                <stop offset="100%" stopColor="#818cf8" />
              </linearGradient>
            </defs>

            {/* Фоновый контур импульса */}
            <path
              d="M 4 26 L 20 26 L 27 11 L 36 41 L 45 7 L 53 26 L 76 26"
              stroke="rgba(56, 189, 248, 0.25)"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Непрерывно бегущий луч импульса */}
            <path
              pathLength="100"
              d="M 4 26 L 20 26 L 27 11 L 36 41 L 45 7 L 53 26 L 76 26"
              stroke="url(#pulseGradLive)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                strokeDasharray: 100,
                animation: 'logoWaveFlow 2.2s ease-in-out infinite',
                filter: 'drop-shadow(0 0 6px rgba(34, 211, 238, 0.85))'
              }}
            />
          </svg>
        </div>

        {/* Пульсирующий индикатор статуса */}
        <span className="absolute -top-1 -right-1 flex h-4 w-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-[#030712]" />
        </span>
      </div>
    </div>
  );
}

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
  const [knownGroups, setKnownGroups] = useState([]);

  useEffect(() => {
    const unsub = dbService.subscribeAll((d) => {
      const set = new Set();
      d.users.forEach((u) => u.group && set.add(u.group));
      d.lessons.forEach((l) => l.group && set.add(l.group));
      setKnownGroups(Array.from(set).sort());
    });
    return () => unsub && unsub();
  }, []);

  const filteredGroups = group.trim()
    ? knownGroups.filter((g) => g.includes(group.trim().toUpperCase()) && g !== group.trim().toUpperCase())
    : knownGroups.slice(0, 6);

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
    <div className="relative min-h-[100dvh] bg-[#030712] overflow-hidden flex flex-col justify-center px-4 py-8">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="animate-orb -top-24 -left-24 absolute w-80 h-80 rounded-full bg-blue-600/20 blur-[90px]" />
        <div className="animate-orb-delayed top-1/2 -right-24 absolute w-80 h-80 rounded-full bg-indigo-600/20 blur-[90px]" />
        <div className="animate-orb -bottom-24 left-1/3 absolute w-72 h-72 rounded-full bg-cyan-500/15 blur-[90px]" />
      </div>

      <div className="relative z-10 w-full max-w-md mx-auto animate-tab-enter">
        <div className="text-center mb-7">
          <AnimatedPulseLogo />

          <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-white via-cyan-100 to-blue-400 bg-clip-text text-transparent">
            Pulse
          </h1>
          <p className="text-xs text-slate-400 mt-1.5 tracking-wide">
            Умный контроль посещаемости • QR & GPS
          </p>

          <div className="mt-3.5 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] font-medium glass-card text-slate-300">
            {dbService.isCloud ? (
              <>
                <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                <span>Облачная синхронизация активна</span>
              </>
            ) : (
              <>
                <HardDrive className="w-3.5 h-3.5 text-amber-400" />
                <span>Локальный режим</span>
              </>
            )}
          </div>
        </div>

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
                    {filteredGroups.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {filteredGroups.map((g) => (
                          <button
                            type="button"
                            key={g}
                            onClick={() => setGroup(g)}
                            className="text-[11px] px-2.5 py-1 rounded-xl bg-white/5 hover:bg-blue-600/20 border border-white/10 text-slate-300 transition"
                          >
                            {g}
                          </button>
                        ))}
                      </div>
                    )}
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
              <span>Быстрый демо-вход:</span>
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
