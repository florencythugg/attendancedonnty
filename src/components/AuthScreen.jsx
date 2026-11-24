import React, { useState, useRef } from 'react';
import {
  Cloud,
  ArrowRight,
  UserPlus,
  LogIn,
  GraduationCap,
  ShieldCheck,
  Activity,
  Monitor,
  Smartphone,
  CheckCircle2
} from 'lucide-react';

function AnimatedPulseLogo() {
  return (
    <div className="relative mb-6 select-none flex items-center justify-center">
      {/* Плавное неоновое свечение прямо от контура логотипа */}
      <div className="pointer-events-none absolute w-32 h-32 rounded-[2rem] bg-gradient-to-tr from-blue-500/35 via-cyan-400/35 to-indigo-500/35 blur-2xl animate-pulse" />

      {/* Расходящиеся неоновые волны-квадраты прямо от края иконки */}
      <span
        className="pointer-events-none absolute w-[104px] h-[104px] rounded-[1.85rem] border-[1.5px] border-cyan-400/80 shadow-[0_0_22px_rgba(34,211,238,0.45)]"
        style={{ animation: 'pulseSquareWave 2.8s cubic-bezier(0.16, 1, 0.3, 1) infinite' }}
      />
      <span
        className="pointer-events-none absolute w-[104px] h-[104px] rounded-[1.85rem] border-[1.5px] border-blue-400/70 shadow-[0_0_22px_rgba(59,130,246,0.4)]"
        style={{ animation: 'pulseSquareWave 2.8s cubic-bezier(0.16, 1, 0.3, 1) infinite 1.4s' }}
      />

      {/* Сам логотип с чистым тёмным фоном внутри (104x104px) */}
      <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-[1.85rem] shadow-[0_0_38px_rgba(34,211,238,0.32)] flex items-center justify-center">
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

          <path
            d="M 16 52 L 32 52 L 40 32 L 50 71 L 60 27 L 68 52 L 84 52"
            fill="none"
            stroke="#22d3ee"
            strokeOpacity="0.2"
            strokeWidth="3.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

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

          <circle cx="84" cy="52" r="3" fill="#67e8f9" filter="url(#pulseGlow)">
            <animate
              attributeName="opacity"
              values="0.3;1;0.3"
              dur="1.8s"
              repeatCount="indefinite"
            />
          </circle>
        </svg>

        {/* Индикатор онлайн-статуса */}
        <span className="absolute -top-1 -right-1 flex h-5 w-5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-5 w-5 bg-emerald-400 border-2 border-[#030712]" />
        </span>
      </div>
    </div>
  );
}

export default function App() {
  const [viewportMode, setViewportMode] = useState('desktop'); // 'desktop' | 'mobile'
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [role, setRole] = useState('student'); // 'student' | 'teacher'
  const [fullName, setFullName] = useState('');
  const [group, setGroup] = useState('');
  const [department, setDepartment] = useState('');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [demoNotice, setDemoNotice] = useState('');

  const handleDemoSubmit = (e) => {
    e.preventDefault();
    setDemoNotice(
      mode === 'login'
        ? `Демо-вход выполнен для логина «${login || 'student'}»`
        : `Демо-аккаунт «${fullName || 'Новый пользователь'}» готов`
    );
    setTimeout(() => setDemoNotice(''), 3500);
  };

  const isMobilePreview = viewportMode === 'mobile';

  return (
    <div className="min-h-screen bg-[#02050e] text-slate-100 flex flex-col">
      {/* Верхняя панель переключения режима предпросмотра (ПК / Телефон) */}
      <div className="sticky top-0 z-50 bg-[#050b1a]/90 backdrop-blur-xl border-b border-white/10 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
          <Activity className="w-4 h-4 text-cyan-400" />
          <span>Предпросмотр экрана входа Pulse</span>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950 border border-white/10">
          <button
            type="button"
            onClick={() => setViewportMode('desktop')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
              viewportMode === 'desktop'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>ПК (Широкий)</span>
          </button>
          <button
            type="button"
            onClick={() => setViewportMode('mobile')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
              viewportMode === 'mobile'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Телефон</span>
          </button>
        </div>
      </div>

      {/* Область предпросмотра */}
      <div className="flex-1 flex items-center justify-center p-0 sm:p-4">
        <div
          className={`relative bg-[#030712] overflow-hidden flex items-center justify-center transition-all duration-300 ${
            isMobilePreview
              ? 'w-[412px] min-h-[840px] rounded-[2.75rem] border-[6px] border-slate-800 shadow-[0_25px_70px_rgba(0,0,0,0.85)] p-5'
              : 'w-full min-h-[calc(100vh-56px)] p-6 sm:p-10'
          }`}
        >
          {/* Аккуратный переливающийся неоновый фон по всей странице */}
          <div className="pointer-events-none fixed inset-0 overflow-hidden">
            <div
              className="absolute -top-32 -left-24 w-[32rem] h-[32rem] rounded-full bg-blue-600/20 blur-[130px]"
              style={{ animation: 'neonAmbientShiftA 11s ease-in-out infinite' }}
            />
            <div
              className="absolute top-1/3 -right-28 w-[30rem] h-[30rem] rounded-full bg-cyan-400/15 blur-[135px]"
              style={{ animation: 'neonAmbientShiftB 13s ease-in-out infinite' }}
            />
            <div
              className="absolute -bottom-36 left-1/4 w-[34rem] h-[34rem] rounded-full bg-indigo-500/20 blur-[140px]"
              style={{ animation: 'neonAmbientShiftC 15s ease-in-out infinite' }}
            />
            <div
              className="absolute inset-0 opacity-50"
              style={{
                background:
                  'radial-gradient(circle at 50% 25%, rgba(34, 211, 238, 0.08), transparent 60%)',
                animation: 'neonAmbientPulse 9s ease-in-out infinite'
              }}
            />
          </div>

          {/* Крупная центральная колонка */}
          <div
            className={`relative z-10 w-full mx-auto ${
              isMobilePreview ? 'max-w-[365px] space-y-6' : 'max-w-[540px] space-y-8'
            }`}
          >
            <div className="flex flex-col items-center text-center">
              <AnimatedPulseLogo />

              <h1
                className={`font-black tracking-tight pulse-shimmer-title ${
                  isMobilePreview ? 'text-5xl' : 'text-5xl sm:text-6xl'
                }`}
              >
                Pulse
              </h1>

              <p
                className={`text-slate-300/90 font-medium mt-2 tracking-wide ${
                  isMobilePreview ? 'text-sm' : 'text-base sm:text-lg'
                }`}
              >
                Посещаемость и онлайн-пары в один клик
              </p>

              <div
                className={`mt-4 inline-flex items-center gap-2.5 rounded-full bg-white/[0.05] border border-white/15 backdrop-blur-md ${
                  isMobilePreview ? 'px-4 py-2' : 'px-5 py-2.5'
                }`}
              >
                <Cloud className="w-4 h-4 text-emerald-400" />
                <span
                  className={`font-semibold text-slate-200 ${
                    isMobilePreview ? 'text-xs' : 'text-xs sm:text-sm'
                  }`}
                >
                  Облачная синхронизация активна
                </span>
              </div>
            </div>

            {/* Стеклянная карточка авторизации увеличенного масштаба */}
            <div
              className={`rounded-[2.25rem] bg-[#0b1224]/80 backdrop-blur-2xl border border-white/10 shadow-[0_28px_70px_rgba(0,0,0,0.7)] ${
                isMobilePreview ? 'p-6 space-y-5' : 'p-7 sm:p-9 space-y-6'
              }`}
            >
              <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-950/85 rounded-2xl border border-white/10">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className={`py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                    isMobilePreview ? 'text-xs' : 'text-sm'
                  } ${
                    mode === 'login'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <LogIn className="w-4 h-4" />
                  <span>Вход в систему</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className={`py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                    isMobilePreview ? 'text-xs' : 'text-sm'
                  } ${
                    mode === 'register'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Регистрация</span>
                </button>
              </div>

              <form onSubmit={handleDemoSubmit} className="space-y-4">
                {mode === 'register' && (
                  <>
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setRole('student')}
                        className={`py-3 px-3.5 rounded-2xl border font-bold flex items-center justify-center gap-2 transition ${
                          isMobilePreview ? 'text-xs' : 'text-sm'
                        } ${
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
                        className={`py-3 px-3.5 rounded-2xl border font-bold flex items-center justify-center gap-2 transition ${
                          isMobilePreview ? 'text-xs' : 'text-sm'
                        } ${
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
                      <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                        ФИО полностью
                      </label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Иванов Иван Иванович"
                        className={`w-full px-4 rounded-2xl bg-slate-950/80 border border-white/10 text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition ${
                          isMobilePreview ? 'py-3.5 text-sm' : 'py-4 text-base'
                        }`}
                      />
                    </div>

                    {role === 'student' ? (
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                          Учебная группа
                        </label>
                        <input
                          type="text"
                          value={group}
                          onChange={(e) => setGroup(e.target.value.toUpperCase())}
                          placeholder="Например: КСЦ-23"
                          className={`w-full px-4 rounded-2xl bg-slate-950/80 border border-white/10 text-white uppercase placeholder:normal-case placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition ${
                            isMobilePreview ? 'py-3.5 text-sm' : 'py-4 text-base'
                          }`}
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                          Кафедра (необязательно)
                        </label>
                        <input
                          type="text"
                          value={department}
                          onChange={(e) => setDepartment(e.target.value)}
                          placeholder="Например: ФИСП"
                          className={`w-full px-4 rounded-2xl bg-slate-950/80 border border-white/10 text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition ${
                            isMobilePreview ? 'py-3.5 text-sm' : 'py-4 text-base'
                          }`}
                        />
                      </div>
                    )}
                  </>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                    Логин
                  </label>
                  <input
                    type="text"
                    value={login}
                    onChange={(e) => setLogin(e.target.value)}
                    placeholder="Введите логин"
                    className={`w-full px-4 rounded-2xl bg-slate-950/80 border border-white/10 text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition ${
                      isMobilePreview ? 'py-3.5 text-sm' : 'py-4 text-base'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                    Пароль
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••"
                    className={`w-full px-4 rounded-2xl bg-slate-950/80 border border-white/10 text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition ${
                      isMobilePreview ? 'py-3.5 text-sm' : 'py-4 text-base'
                    }`}
                  />
                </div>

                {demoNotice && (
                  <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/35 text-xs sm:text-sm text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{demoNotice}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className={`w-full rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:brightness-110 active:scale-[0.98] transition-all font-bold text-white flex items-center justify-center gap-2 shadow-xl shadow-blue-600/30 ${
                    isMobilePreview ? 'py-4 text-sm' : 'py-4 text-base'
                  }`}
                >
                  <span>{mode === 'login' ? 'Войти' : 'Создать аккаунт'}</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </form>
            </div>
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
            @keyframes neonAmbientShiftA {
              0%, 100% {
                transform: translate3d(0px, 0px, 0) scale(1);
              }
              50% {
                transform: translate3d(90px, 60px, 0) scale(1.15);
              }
            }
            @keyframes neonAmbientShiftB {
              0%, 100% {
                transform: translate3d(0px, 0px, 0) scale(1);
              }
              50% {
                transform: translate3d(-85px, -55px, 0) scale(1.12);
              }
            }
            @keyframes neonAmbientShiftC {
              0%, 100% {
                transform: translate3d(0px, 0px, 0) scale(1);
              }
              50% {
                transform: translate3d(70px, -65px, 0) scale(1.18);
              }
            }
            @keyframes neonAmbientPulse {
              0%, 100% {
                opacity: 0.45;
              }
              50% {
                opacity: 0.85;
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
      </div>
    </div>
  );
}
