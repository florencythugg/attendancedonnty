import React, { useState } from 'react';
import {
  Cloud,
  CloudOff,
  ArrowRight,
  UserPlus,
  LogIn,
  GraduationCap,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { dbService } from '../services/db';

function AnimatedPulseLogo() {
  return (
    <div className="relative mb-6 select-none flex items-center justify-center w-24 h-24 sm:w-28 sm:h-28">
      <div className="pointer-events-none absolute w-28 h-28 sm:w-32 sm:h-32 rounded-[1.85rem] bg-gradient-to-tr from-white/20 via-zinc-300/15 to-white/20 blur-xl animate-pulse" />

      <span
        className="pointer-events-none absolute w-24 h-24 sm:w-[106px] sm:h-[106px] rounded-[1.85rem] border-[1.5px] border-white/55 shadow-[0_0_18px_rgba(255,255,255,0.2)]"
        style={{ animation: 'pulseSquareWave 2.8s cubic-bezier(0.16, 1, 0.3, 1) infinite' }}
      />
      <span
        className="pointer-events-none absolute w-24 h-24 sm:w-[106px] sm:h-[106px] rounded-[1.85rem] border-[1.5px] border-zinc-400/40 shadow-[0_0_18px_rgba(255,255,255,0.12)]"
        style={{ animation: 'pulseSquareWave 2.8s cubic-bezier(0.16, 1, 0.3, 1) infinite 1.4s' }}
      />

      <div className="relative w-full h-full rounded-[1.85rem] shadow-[0_0_32px_rgba(255,255,255,0.14)] flex items-center justify-center">
        <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id="carbonStrokeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="50%" stopColor="#a1a1aa" />
              <stop offset="100%" stopColor="#ffffff" />
            </linearGradient>

            <filter id="carbonGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="2.4" result="blur" />
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
            stroke="url(#carbonStrokeGrad)"
            strokeWidth="2.8"
          />

          <path
            d="M 16 52 L 32 52 L 40 32 L 50 71 L 60 27 L 68 52 L 84 52"
            fill="none"
            stroke="#ffffff"
            strokeOpacity="0.14"
            strokeWidth="3.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <path
            d="M 16 52 L 32 52 L 40 32 L 50 71 L 60 27 L 68 52 L 84 52"
            fill="none"
            stroke="url(#carbonStrokeGrad)"
            strokeWidth="4.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#carbonGlow)"
            style={{
              strokeDasharray: 145,
              animation: 'pulseWaveDraw 2.6s ease-in-out infinite'
            }}
          />

          <circle cx="84" cy="52" r="3" fill="#ffffff" filter="url(#carbonGlow)">
            <animate
              attributeName="opacity"
              values="0.25;1;0.25"
              dur="1.8s"
              repeatCount="indefinite"
            />
          </circle>
        </svg>

        <span className="absolute -top-1 -right-1 flex h-4 w-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-65" />
          <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-400 border-2 border-[#060607]" />
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
        if (role === 'student' && !group.trim()) {
          throw new Error('Укажите учебную группу (например, КСЦ-23)');
        }
        const user = await dbService.registerUser({
          role,
          fullName,
          group,
          department,
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

  return (
    <div className="carbon-bg relative min-h-[100dvh] flex flex-col items-center justify-center p-4 sm:p-8 overflow-x-hidden">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute -top-36 -left-28 w-[34rem] h-[34rem] rounded-full bg-white/[0.05] blur-[140px]"
          style={{ animation: 'neonAmbientShiftA 12s ease-in-out infinite' }}
        />
        <div
          className="absolute top-1/3 -right-28 w-[30rem] h-[30rem] rounded-full bg-zinc-300/[0.04] blur-[140px]"
          style={{ animation: 'neonAmbientShiftB 14s ease-in-out infinite' }}
        />
        <div
          className="absolute -bottom-40 left-1/4 w-[36rem] h-[36rem] rounded-full bg-white/[0.035] blur-[150px]"
          style={{ animation: 'neonAmbientShiftC 16s ease-in-out infinite' }}
        />
      </div>

      <div className="relative z-10 w-full max-w-[420px] sm:max-w-[520px] space-y-6 sm:space-y-8">
        <div className="flex flex-col items-center text-center">
          <AnimatedPulseLogo />

          <h1 className="text-5xl sm:text-6xl font-black tracking-tight pulse-shimmer-title">
            Pulse
          </h1>

          <p className="text-sm sm:text-base text-zinc-400 font-medium mt-2 tracking-wide">
            Посещаемость и онлайн-пары в один клик
          </p>

          <div className="mt-4 inline-flex items-center gap-2.5 px-4 sm:px-5 py-2 rounded-full bg-white/[0.04] border border-white/10 backdrop-blur-md">
            {dbService.isCloud ? (
              <>
                <Cloud className="w-4 h-4 text-emerald-400" />
                <span className="text-xs sm:text-sm font-semibold text-zinc-200">
                  Облачная синхронизация активна
                </span>
              </>
            ) : (
              <>
                <CloudOff className="w-4 h-4 text-amber-400" />
                <span className="text-xs sm:text-sm font-semibold text-amber-200">
                  Локальный режим (без облака)
                </span>
              </>
            )}
          </div>
        </div>

        <div className="carbon-card rounded-[2rem] sm:rounded-[2.25rem] p-6 sm:p-8 space-y-5 sm:space-y-6">
          <div className="grid grid-cols-2 gap-2 p-1.5 bg-black/75 rounded-2xl border border-white/10">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError('');
              }}
              className={`py-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                mode === 'login'
                  ? 'bg-zinc-200 text-zinc-950 shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <LogIn className="w-4 h-4" />
              <span>Вход в систему</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError('');
              }}
              className={`py-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                mode === 'register'
                  ? 'bg-zinc-200 text-zinc-950 shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>Регистрация</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setRole('student')}
                    className={`py-3 px-3.5 rounded-2xl border text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition ${
                      role === 'student'
                        ? 'bg-white/10 border-white/35 text-white'
                        : 'bg-black/60 border-white/10 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <GraduationCap className="w-4 h-4" />
                    <span>Студент</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('teacher')}
                    className={`py-3 px-3.5 rounded-2xl border text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition ${
                      role === 'teacher'
                        ? 'bg-white/10 border-white/35 text-white'
                        : 'bg-black/60 border-white/10 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Преподаватель</span>
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider">
                    ФИО полностью
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Иванов Иван Иванович"
                    required
                    className="w-full px-4 py-3.5 sm:py-4 rounded-2xl bg-black/75 border border-white/10 text-sm sm:text-base text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/40 transition"
                  />
                </div>

                {role === 'student' ? (
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider">
                      Учебная группа
                    </label>
                    <input
                      type="text"
                      value={group}
                      onChange={(e) => setGroup(e.target.value.toUpperCase())}
                      placeholder="Например: КСЦ-23"
                      required
                      className="w-full px-4 py-3.5 sm:py-4 rounded-2xl bg-black/75 border border-white/10 text-sm sm:text-base text-white uppercase placeholder:normal-case placeholder:text-zinc-600 focus:outline-none focus:border-white/40 transition"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider">
                      Кафедра (необязательно)
                    </label>
                    <input
                      type="text"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      placeholder="Например: ФИСП"
                      className="w-full px-4 py-3.5 sm:py-4 rounded-2xl bg-black/75 border border-white/10 text-sm sm:text-base text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/40 transition"
                    />
                  </div>
                )}
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider">
                Логин
              </label>
              <input
                type="text"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                placeholder="Введите логин"
                required
                className="w-full px-4 py-3.5 sm:py-4 rounded-2xl bg-black/75 border border-white/10 text-sm sm:text-base text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/40 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider">
                Пароль
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                required
                className="w-full px-4 py-3.5 sm:py-4 rounded-2xl bg-black/75 border border-white/10 text-sm sm:text-base text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/40 transition"
              />
            </div>

            {error && (
              <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/35 text-xs sm:text-sm text-rose-300 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-2xl bg-zinc-100 hover:bg-white active:scale-[0.98] transition-all text-sm sm:text-base font-black text-zinc-950 flex items-center justify-center gap-2 shadow-[0_12px_30px_rgba(255,255,255,0.12)]"
            >
              <span>
                {loading
                  ? 'Подождите...'
                  : mode === 'login'
                  ? 'Войти'
                  : 'Создать аккаунт'}
              </span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
