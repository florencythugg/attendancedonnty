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
    <div className="relative mb-5 select-none flex items-center justify-center">
      {/* Плавное неоновое свечение прямо от контура логотипа */}
      <div className="pointer-events-none absolute w-24 h-24 rounded-[1.6rem] bg-gradient-to-tr from-blue-500/35 via-cyan-400/35 to-indigo-500/35 blur-xl animate-pulse" />

      {/* Расходящиеся неоновые волны-квадраты прямо от края иконки */}
      <span
        className="pointer-events-none absolute w-20 h-20 rounded-[1.45rem] border border-cyan-400/70 shadow-[0_0_16px_rgba(34,211,238,0.35)]"
        style={{ animation: 'pulseSquareWave 2.8s cubic-bezier(0.16, 1, 0.3, 1) infinite' }}
      />
      <span
        className="pointer-events-none absolute w-20 h-20 rounded-[1.45rem] border border-blue-400/60 shadow-[0_0_16px_rgba(59,130,246,0.3)]"
        style={{ animation: 'pulseSquareWave 2.8s cubic-bezier(0.16, 1, 0.3, 1) infinite 1.4s' }}
      />

      {/* Сам логотип с чистым фоном внутри */}
      <div className="relative w-20 h-20 rounded-[1.45rem] shadow-[0_0_30px_rgba(34,211,238,0.28)] flex items-center justify-center">
        <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id="pulseStrokeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="50%" stopColor="#22d3ee" />
              <stop offset="100%" stopColor="#818cf8" />
            </linearGradient>

            <filter id="pulseGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Чистая тёмная подложка и неоновый контур */}
          <rect
            x="2"
            y="2"
            width="96"
            height="96"
            rx="24"
            fill="#071024"
            stroke="url(#pulseStrokeGrad)"
            strokeWidth="3"
          />

          {/* Фоновая линия пульса */}
          <path
            d="M 16 52 L 32 52 L 40 32 L 50 71 L 60 27 L 68 52 L 84 52"
            fill="none"
            stroke="#22d3ee"
            strokeOpacity="0.2"
            strokeWidth="3.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Анимированная светящаяся линия пульса */}
          <path
            d="M 16 52 L 32 52 L 40 32 L 50 71 L 60 27 L 68 52 L 84 52"
            fill="none"
            stroke="url(#pulseStrokeGrad)"
            strokeWidth="4.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#pulseGlow)"
            style={{
              strokeDasharray: 145,
              animation: 'pulseWaveDraw 2.6s ease-in-out infinite'
            }}
          />

          {/* Светящаяся точка на конце волны */}
          <circle cx="84" cy="52" r="3" fill="#67e8f9" filter="url(#pulseGlow)">
            <animate
              attributeName="opacity"
              values="0.3;1;0.3"
              dur="1.8s"
              repeatCount="indefinite"
            />
          </circle>
        </svg>

        {/* Индикатор онлайн-статуса в углу */}
        <span className="absolute -top-1 -right-1 flex h-4 w-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-400 border-2 border-[#030712]" />
        </span>
      </div>

      <style>{`
        @keyframes pulseSquareWave {
          0% {
            transform: scale(1);
            opacity: 0.85;
          }
          100% {
            transform: scale(1.65);
            opacity: 0;
          }
        }
        @keyframes pulseWaveDraw {
          0% {
            stroke-dashoffset: 145;
            opacity: 0.4;
          }
          50% {
            stroke-dashoffset: 0;
            opacity: 1;
          }
          100% {
            stroke-dashoffset: -145;
            opacity: 0.4;
          }
        }
        @keyframes pulseTextShimmer {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
        .pulse-shimmer-title {
          background: linear-gradient(
            110deg,
            #ffffff 0%,
            #67e8f9 25%,
            #38bdf8 50%,
            #818cf8 75%,
            #ffffff 100%
          );
          background-size: 240% 240%;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: pulseTextShimmer 4.5s ease-in-out infinite;
          filter: drop-shadow(0 0 18px rgba(34, 211, 238, 0.25));
        }
      `}</style>
    </div>
  );
}

export default function AuthScreen({ onAuthSuccess }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [role, setRole] = useState('student'); // 'student' | 'teacher'
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
    <div className="relative min-h-[100dvh] bg-[#030712] flex flex-col items-center justify-center p-4 overflow-x-hidden">
      {/* Фоновые световые сферы */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="animate-orb -top-24 -left-24 w-80 h-80 rounded-full bg-blue-600/20 blur-[100px]" />
        <div className="animate-orb-delayed bottom-0 -right-24 w-80 h-80 rounded-full bg-cyan-500/15 blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-md space-y-6">
        {/* Анимированный логотип и переливающийся заголовок */}
        <div className="flex flex-col items-center text-center">
          <AnimatedPulseLogo />

          <h1 className="text-4xl font-black tracking-tight pulse-shimmer-title">
            Pulse
          </h1>

          <p className="text-xs sm:text-[13px] text-slate-400 font-medium mt-1.5 tracking-wide">
            Посещаемость и онлайн-пары в один клик
          </p>

          <div className="mt-3.5 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/10 backdrop-blur-md">
            {dbService.isCloud ? (
              <>
                <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[11px] font-semibold text-slate-200">
                  Облачная синхронизация активна
                </span>
              </>
            ) : (
              <>
                <CloudOff className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[11px] font-semibold text-amber-200">
                  Локальный режим (без облака)
                </span>
              </>
            )}
          </div>
        </div>

        {/* Карточка входа / регистрации */}
        <div className="glass-card rounded-[2rem] p-5 sm:p-6 space-y-5">
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950/80 rounded-2xl border border-white/10">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError('');
              }}
              className={`py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                mode === 'login'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Вход в систему</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError('');
              }}
              className={`py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                mode === 'register'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Регистрация</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === 'register' && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('student')}
                    className={`py-2.5 px-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                      role === 'student'
                        ? 'bg-cyan-500/15 border-cyan-400/50 text-cyan-300'
                        : 'bg-slate-950/60 border-white/10 text-slate-400'
                    }`}
                  >
                    <GraduationCap className="w-4 h-4" />
                    <span>Студент</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('teacher')}
                    className={`py-2.5 px-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                      role === 'teacher'
                        ? 'bg-blue-500/15 border-blue-400/50 text-blue-300'
                        : 'bg-slate-950/60 border-white/10 text-slate-400'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Преподаватель</span>
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
                    placeholder="Иванов Иван Иванович"
                    required
                    className="w-full px-4 py-3 rounded-2xl bg-slate-950/75 border border-white/10 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition"
                  />
                </div>

                {role === 'student' ? (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1 uppercase tracking-wider">
                      Учебная группа
                    </label>
                    <input
                      type="text"
                      value={group}
                      onChange={(e) => setGroup(e.target.value.toUpperCase())}
                      placeholder="Например: КСЦ-23"
                      required
                      className="w-full px-4 py-3 rounded-2xl bg-slate-950/75 border border-white/10 text-sm text-white uppercase placeholder:normal-case placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1 uppercase tracking-wider">
                      Кафедра (необязательно)
                    </label>
                    <input
                      type="text"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      placeholder="Например: ФИСП"
                      className="w-full px-4 py-3 rounded-2xl bg-slate-950/75 border border-white/10 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition"
                    />
                  </div>
                )}
              </>
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
                required
                className="w-full px-4 py-3 rounded-2xl bg-slate-950/75 border border-white/10 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition"
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
                required
                className="w-full px-4 py-3 rounded-2xl bg-slate-950/75 border border-white/10 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            {error && (
              <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/35 text-xs text-rose-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:brightness-110 active:scale-[0.98] transition-all text-sm font-bold text-white flex items-center justify-center gap-2 shadow-xl shadow-blue-600/25"
            >
              <span>
                {loading
                  ? 'Подождите...'
                  : mode === 'login'
                  ? 'Войти'
                  : 'Создать аккаунт'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
