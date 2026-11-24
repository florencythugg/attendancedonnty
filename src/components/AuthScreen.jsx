import React, { useState, useId } from 'react';
import {
  Cloud,
  CloudOff,
  ArrowRight,
  UserPlus,
  LogIn,
  GraduationCap,
  ShieldCheck,
  AlertCircle,
  Smartphone,
  Download,
  MapPin,
  Radio,
  CreditCard,
  Lock,
  Cpu
} from 'lucide-react';
import { dbService } from '../services/db';

const APK_DOWNLOAD_URL =
  'https://github.com/florencythugg/attendancedonnty/releases/latest/download/Pulse.apk';

function AnimatedPulseLogo({ desktop = false }) {
  const uid = useId().replace(/:/g, '');
  const gradId = `carbonStrokeGrad-${uid}`;
  const glowId = `carbonGlow-${uid}`;

  return (
    <div
      className={`relative select-none flex items-center justify-center shrink-0 ${
        desktop ? 'w-24 h-24' : 'mb-6 w-24 h-24 sm:w-28 sm:h-28'
      }`}
    >
      <div className="pointer-events-none absolute inset-[-10px] rounded-[1.85rem] bg-gradient-to-tr from-white/20 via-zinc-300/15 to-white/20 blur-xl animate-pulse" />

      <span
        className="pointer-events-none absolute inset-0 rounded-[1.85rem] border-[1.5px] border-white/55 shadow-[0_0_18px_rgba(255,255,255,0.2)]"
        style={{ animation: 'pulseSquareWave 2.8s cubic-bezier(0.16, 1, 0.3, 1) infinite' }}
      />
      <span
        className="pointer-events-none absolute inset-0 rounded-[1.85rem] border-[1.5px] border-zinc-400/40 shadow-[0_0_18px_rgba(255,255,255,0.12)]"
        style={{ animation: 'pulseSquareWave 2.8s cubic-bezier(0.16, 1, 0.3, 1) infinite 1.4s' }}
      />

      <div className="relative w-full h-full rounded-[1.85rem] shadow-[0_0_32px_rgba(255,255,255,0.14)] flex items-center justify-center">
        <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="50%" stopColor="#a1a1aa" />
              <stop offset="100%" stopColor="#ffffff" />
            </linearGradient>

            <filter id={glowId} x="-30%" y="-30%" width="160%" height="160%">
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
            stroke={`url(#${gradId})`}
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
            stroke={`url(#${gradId})`}
            strokeWidth="4.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter={`url(#${glowId})`}
            style={{
              strokeDasharray: 145,
              animation: 'pulseWaveDraw 2.6s ease-in-out infinite'
            }}
          />

          <circle cx="84" cy="52" r="3" fill="#ffffff" filter={`url(#${glowId})`}>
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

const DESKTOP_FEATURES = [
  {
    icon: MapPin,
    title: 'Динамическая отметка + GPS',
    desc: 'Криптографическая ротация токенов каждые 20 секунд и проверка геозоны аудитории.',
    tag: 'HMAC-SHA256'
  },
  {
    icon: Radio,
    title: 'Встроенные дистант-эфиры',
    desc: 'Прямые аудио/видео-пары и демонстрация экрана P2P прямо в приложении без сторонних сервисов.',
    tag: 'WEBRTC P2P'
  },
  {
    icon: CreditCard,
    title: 'Цифровой пропуск Pulse ID',
    desc: 'Интерактивный студенческий билет и кабинет преподавателя с защитой от передачи аккаунта.',
    tag: 'ANTI-SPOOFING'
  }
];

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

  const isNativeApp =
    typeof window !== 'undefined' && Boolean(window.Capacitor?.isNativePlatform?.());

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
    <div className="carbon-bg relative min-h-[100dvh] flex flex-col justify-between overflow-x-hidden">
      {/* Плавные серебристые блики на карбоне */}
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

      {/* ВЕРХНЯЯ ШАПКА (ТОЛЬКО ПК) */}
      <header className="hidden lg:flex relative z-10 w-full max-w-[1320px] mx-auto px-8 pt-6 pb-2 items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399]" />
          <span className="text-xs font-mono font-bold tracking-[0.22em] text-zinc-400 uppercase">
            PULSE // DIGITAL CAMPUS
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-xs font-semibold text-zinc-200">
            {dbService.isCloud ? (
              <>
                <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                <span>Облачная синхронизация активна</span>
              </>
            ) : (
              <>
                <CloudOff className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-amber-200">Локальный режим (без облака)</span>
              </>
            )}
          </div>

          {!isNativeApp && (
            <a
              href={APK_DOWNLOAD_URL}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/15 border border-white/15 text-xs font-bold text-white transition"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Android APK</span>
            </a>
          )}
        </div>
      </header>

      {/* ОСНОВНОЙ КОНТЕНТ: на телефоне 1 колонка, на ПК — 2 колонки */}
      <main className="relative z-10 w-full max-w-[440px] sm:max-w-[520px] lg:max-w-[1320px] mx-auto px-4 sm:px-8 py-6 lg:py-8 my-auto grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 xl:gap-14 items-center">
        {/* МОБИЛЬНАЯ ШАПКА (как было раньше, скрывается на ПК) */}
        <div className="flex flex-col items-center text-center lg:hidden">
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

        {/* ЛЕВАЯ КОЛОНКА (ТОЛЬКО ПК): Лого + Презентация */}
        <div className="hidden lg:block lg:col-span-7 space-y-8">
          <div className="flex items-center gap-6">
            <AnimatedPulseLogo desktop />
            <div>
              <h1 className="text-6xl xl:text-7xl font-black tracking-tight pulse-shimmer-title leading-none">
                Pulse
              </h1>
              <p className="text-lg xl:text-xl text-zinc-300 font-medium mt-2.5 max-w-lg leading-snug">
                Посещаемость, онлайн-пары и цифровой пропуск кампуса в одном приложении
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3.5">
            {DESKTOP_FEATURES.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="carbon-card rounded-3xl p-5 flex items-start gap-4 hover:border-white/20 transition-all group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-white/[0.05] border border-white/10 group-hover:border-white/25 flex items-center justify-center shrink-0 text-white transition">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-base font-extrabold text-white">{item.title}</h3>
                      <span className="text-[10px] font-mono font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-white/[0.05] border border-white/10 text-zinc-400 shrink-0">
                        {item.tag}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-400 mt-1 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ПРАВАЯ КОЛОНКА НА ПК / ОСНОВНАЯ КАРТОЧКА НА ТЕЛЕФОНЕ */}
        <div className="lg:col-span-5 space-y-4">
          <div className="carbon-card rounded-[2rem] sm:rounded-[2.25rem] p-6 sm:p-8 space-y-5 sm:space-y-6">
            {/* Заголовок внутри карточки (только ПК) */}
            <div className="hidden lg:block space-y-1">
              <h2 className="text-xl font-black text-white">
                {mode === 'login' ? 'Вход в личный кабинет' : 'Регистрация в Pulse'}
              </h2>
              <p className="text-xs text-zinc-400">
                {mode === 'login'
                  ? 'Введите ваши учётные данные студента или преподавателя'
                  : 'Создайте аккаунт для доступа к парам и журналу'}
              </p>
            </div>

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

          {/* Карточка скачивания Android APK (только на ПК и в мобильном браузере, скрыта внутри APK) */}
          {!isNativeApp && (
            <a
              href={APK_DOWNLOAD_URL}
              className="hidden lg:flex carbon-card rounded-2xl px-5 py-4 items-center justify-between gap-3 hover:border-white/25 transition group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shrink-0">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white group-hover:text-zinc-100">
                    Мобильное приложение Pulse
                  </div>
                  <div className="text-xs text-zinc-400">
                    Скачать актуальный Pulse.apk для Android
                  </div>
                </div>
              </div>
              <div className="p-2 rounded-xl bg-white/[0.06] group-hover:bg-zinc-100 group-hover:text-zinc-950 text-zinc-300 transition">
                <Download className="w-4 h-4" />
              </div>
            </a>
          )}
        </div>
      </main>

      {/* НИЖНЯЯ ТЕХНИЧЕСКАЯ ТЕЛЕМЕТРИЯ (ТОЛЬКО ПК) */}
      <footer className="hidden lg:flex relative z-10 w-full max-w-[1320px] mx-auto px-8 pb-6 pt-3 flex-wrap items-center justify-between gap-4 text-[11px] font-mono text-zinc-500 border-t border-white/[0.05]">
        <div className="flex flex-wrap items-center gap-5">
          <span className="inline-flex items-center gap-1.5 text-zinc-400">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            HMAC-SHA256 • ACTIVE
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-zinc-400" />
            P2P STREAM • READY
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-zinc-400" />
            GPS GEOFENCE • ENABLED
          </span>
        </div>
        <div className="text-zinc-500 tracking-wider">PULSE v2.4 • CARBON EDITION</div>
      </footer>
    </div>
  );
}
