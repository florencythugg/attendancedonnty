import React, { useState, useEffect, useRef, useMemo, useId } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import QRCode from 'qrcode';
import {
  ScanLine,
  BarChart3,
  User,
  CheckCircle2,
  Clock,
  XCircle,
  Camera,
  Keyboard,
  LogOut,
  AlertTriangle,
  Smartphone,
  Sparkles,
  RotateCw,
  ShieldCheck,
  Activity,
  Cloud,
  CloudOff,
  Radio,
  GraduationCap
} from 'lucide-react';
import { dbService } from '../services/db';
import {
  verifyDynamicToken,
  getOrCreateDeviceId,
  getCurrentPositionAsync,
  triggerFeedback
} from '../utils/crypto';
import { StudentViewer } from './LiveStreamRoom';

function PulseMiniLogo() {
  return (
    <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-2xl shrink-0 flex items-center justify-center shadow-[0_0_16px_rgba(255,255,255,0.12)]">
      <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
        <defs>
          <linearGradient id="stdCarbonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="50%" stopColor="#a1a1aa" />
            <stop offset="100%" stopColor="#ffffff" />
          </linearGradient>
        </defs>
        <rect
          x="3"
          y="3"
          width="94"
          height="94"
          rx="24"
          fill="#0a0a0c"
          stroke="url(#stdCarbonGrad)"
          strokeWidth="3.2"
        />
        <path
          d="M 18 52 L 33 52 L 41 32 L 50 71 L 60 27 L 68 52 L 82 52"
          fill="none"
          stroke="url(#stdCarbonGrad)"
          strokeWidth="4.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#060607]" />
    </div>
  );
}

function HolographicStudentCard({ user, deviceId, attendancePct }) {
  const [tilt, setTilt] = useState({ x: 3, y: -6, glareX: 35, glareY: 30 });
  const [flipped, setFlipped] = useState(false);
  const [studentQrUrl, setStudentQrUrl] = useState('');
  const [gyroEnabled, setGyroEnabled] = useState(false);
  const cardRef = useRef(null);

  const cardNumber = useMemo(() => {
    const raw = (user.id || '000000').replace(/\D/g, '');
    const padded = (raw + '20268419').slice(0, 8);
    return `${padded.slice(0, 4)} ${padded.slice(4, 8)}`;
  }, [user.id]);

  useEffect(() => {
    const payload = JSON.stringify({
      type: 'PULSE_STUDENT_ID',
      uid: user.id,
      name: user.fullName,
      group: user.group,
      dev: deviceId
    });
    QRCode.toDataURL(payload, {
      width: 220,
      margin: 1,
      color: { dark: '#09090b', light: '#ffffff' }
    }).then(setStudentQrUrl);
  }, [user, deviceId]);

  useEffect(() => {
    const handleOrientation = (e) => {
      if (e.gamma === null || e.beta === null) return;
      setGyroEnabled(true);
      const maxAngle = 22;
      const clampedX = Math.max(-maxAngle, Math.min(maxAngle, e.gamma));
      const clampedY = Math.max(-maxAngle, Math.min(maxAngle, e.beta - 45));
      const rotateY = (clampedX / maxAngle) * 14;
      const rotateX = -(clampedY / maxAngle) * 14;
      const glareX = 50 + (clampedX / maxAngle) * 42;
      const glareY = 50 + (clampedY / maxAngle) * 42;
      setTilt({ x: rotateX, y: rotateY, glareX, glareY });
    };

    window.addEventListener('deviceorientation', handleOrientation);
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, []);

  const handlePointerMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width;
    const relY = (e.clientY - rect.top) / rect.height;
    const rotateY = (relX - 0.5) * 20;
    const rotateX = -(relY - 0.5) * 20;
    setTilt({
      x: rotateX,
      y: rotateY,
      glareX: relX * 100,
      glareY: relY * 100
    });
  };

  const resetTilt = () => {
    setTilt({ x: 3, y: -6, glareX: 35, glareY: 30 });
  };

  const requestGyroPermission = async () => {
    if (
      typeof DeviceOrientationEvent !== 'undefined' &&
      typeof DeviceOrientationEvent.requestPermission === 'function'
    ) {
      try {
        const res = await DeviceOrientationEvent.requestPermission();
        if (res === 'granted') setGyroEnabled(true);
      } catch {}
    }
  };

  return (
    <div className="space-y-3 w-full max-w-[440px]" style={{ perspective: '1100px' }}>
      <div
        ref={cardRef}
        onPointerMove={handlePointerMove}
        onPointerLeave={resetTilt}
        onClick={() => {
          requestGyroPermission();
          setFlipped((prev) => !prev);
        }}
        style={{
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y + (flipped ? 180 : 0)}deg)`,
          transformStyle: 'preserve-3d',
          transition: 'transform 0.35s cubic-bezier(0.22, 1, 0.36, 1)'
        }}
        className="relative w-full aspect-[1.58/1] rounded-[1.75rem] cursor-pointer select-none shadow-[0_28px_65px_-15px_rgba(0,0,0,0.9),0_0_25px_rgba(255,255,255,0.06)]"
      >
        {/* Лицевая сторона — Black Carbon */}
        <div
          style={{ backfaceVisibility: 'hidden' }}
          className="carbon-surface absolute inset-0 rounded-[1.75rem] overflow-hidden border border-white/20 p-5 sm:p-6 flex flex-col justify-between"
        >
          {/* Металлический блик */}
          <div
            className="absolute inset-0 pointer-events-none mix-blend-overlay transition-opacity duration-200"
            style={{
              background: `radial-gradient(circle at ${tilt.glareX}% ${tilt.glareY}%, rgba(255,255,255,0.85) 0%, rgba(228,228,231,0.3) 34%, transparent 78%)`
            }}
          />
          <div
            className="absolute inset-0 pointer-events-none opacity-25"
            style={{
              background: `linear-gradient(${115 + tilt.y * 2}deg, transparent 25%, rgba(255,255,255,0.28) 48%, rgba(161,161,170,0.2) 55%, transparent 75%)`
            }}
          />

          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-zinc-100 flex items-center justify-center shadow">
                <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-950 stroke-[2.5]" />
              </div>
              <div>
                <div className="text-xs sm:text-sm font-black tracking-wider text-white uppercase">
                  Pulse ID
                </div>
                <div className="text-[9px] sm:text-[10px] text-zinc-400 uppercase tracking-widest">
                  Студенческий билет
                </div>
              </div>
            </div>

            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 backdrop-blur-md">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              АКТИВЕН
            </span>
          </div>

          <div className="relative z-10 my-auto pt-2">
            <div className="text-[10px] text-zinc-400 uppercase tracking-widest">
              Владелец карты
            </div>
            <div className="text-lg sm:text-xl font-extrabold text-white tracking-tight leading-snug mt-0.5">
              {user.fullName}
            </div>
            <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-white/[0.08] border border-white/15 backdrop-blur-md">
              <span className="text-[10px] text-zinc-400">Группа:</span>
              <span className="text-xs font-black text-white tracking-wide">{user.group}</span>
            </div>
          </div>

          <div className="relative z-10 flex items-end justify-between pt-2.5 border-t border-white/10">
            <div>
              <div className="text-[9px] text-zinc-400 uppercase tracking-wider">Номер ID</div>
              <div className="font-mono text-xs font-bold tracking-widest text-zinc-200">
                № {cardNumber}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[9px] text-zinc-400 uppercase tracking-wider">Посещаемость</div>
              <div className="text-xs font-extrabold text-emerald-400">{attendancePct}%</div>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-zinc-300 font-semibold">
              <RotateCw className="w-3 h-3" />
              <span>QR-код</span>
            </div>
          </div>
        </div>

        {/* Обратная сторона — QR-пропуск */}
        <div
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)'
          }}
          className="carbon-surface absolute inset-0 rounded-[1.75rem] overflow-hidden border border-white/25 p-5 sm:p-6 flex items-center justify-between gap-4"
        >
          <div className="bg-white p-2.5 rounded-2xl shadow-[0_0_25px_rgba(255,255,255,0.16)] shrink-0">
            {studentQrUrl && (
              <img src={studentQrUrl} alt="Student ID QR" className="w-28 h-28 sm:w-32 sm:h-32" />
            )}
          </div>

          <div className="flex-1 text-left space-y-2 min-w-0">
            <div className="inline-flex items-center gap-1 text-[10px] font-bold text-zinc-200 uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Цифровой пропуск
            </div>
            <div className="text-sm font-bold text-white leading-tight">{user.fullName}</div>
            <div className="text-xs text-zinc-400">Группа {user.group}</div>
            <div className="pt-1">
              <div className="text-[9px] text-zinc-500 uppercase">Device Hash</div>
              <div className="text-[10px] font-mono text-zinc-300 truncate max-w-[160px]">
                {deviceId}
              </div>
            </div>
            <div className="text-[10px] text-zinc-300 flex items-center gap-1 pt-1">
              <RotateCw className="w-3 h-3" /> Нажмите, чтобы перевернуть
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between px-1 text-[11px] sm:text-xs text-zinc-500">
        <span>
          {gyroEnabled
            ? 'Гироскоп активен — наклоните телефон для перелива'
            : 'Нажмите на карту, чтобы открыть QR-пропуск'}
        </span>
        <button
          type="button"
          onClick={() => setFlipped((prev) => !prev)}
          className="text-zinc-200 font-semibold hover:text-white underline-offset-4 hover:underline shrink-0 ml-2"
        >
          {flipped ? 'Лицевая сторона' : 'Показать QR'}
        </button>
      </div>
    </div>
  );
}

export default function StudentDashboard({ user, data, onLogout }) {
  const [tab, setTab] = useState('scan'); // 'scan' | 'stats' | 'profile'
  const [scanMode, setScanMode] = useState('camera');
  const [cameraActive, setCameraActive] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [processing, setProcessing] = useState(false);

  const scannerRef = useRef(null);
  const deviceId = useMemo(() => getOrCreateDeviceId(), []);

  const groupLessons = useMemo(
    () => data.lessons.filter((l) => l.group === user.group),
    [data.lessons, user.group]
  );

  const activeGroupLessons = useMemo(
    () => data.lessons.filter((l) => l.isActive),
    [data.lessons]
  );

  const onlineActiveLessons = useMemo(
    () => activeGroupLessons.filter((l) => l.mode === 'online' && l.group === user.group),
    [activeGroupLessons, user.group]
  );

  const offlineActiveLessons = useMemo(
    () => activeGroupLessons.filter((l) => l.mode !== 'online'),
    [activeGroupLessons]
  );

  const myRecords = useMemo(
    () => data.records.filter((r) => r.studentId === user.id),
    [data.records, user.id]
  );

  const stats = useMemo(() => {
    const total = groupLessons.length;
    let present = 0;
    let late = 0;
    const bySubject = {};

    groupLessons.forEach((les) => {
      if (!bySubject[les.subject]) {
        bySubject[les.subject] = { total: 0, attended: 0 };
      }
      bySubject[les.subject].total += 1;

      const rec = myRecords.find((r) => r.lessonId === les.id);
      if (rec) {
        if (rec.status === 'PRESENT') present += 1;
        else if (rec.status === 'LATE') late += 1;
        bySubject[les.subject].attended += 1;
      }
    });

    const attended = present + late;
    const absent = Math.max(0, total - attended);
    const pct = total > 0 ? Math.round((attended / total) * 100) : 100;

    return { total, present, late, absent, attended, pct, bySubject };
  }, [groupLessons, myRecords]);

  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch {}
      scannerRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [tab, scanMode]);

  const startCamera = async () => {
    setFeedback(null);
    try {
      const html5QrCode = new Html5Qrcode('qr-reader');
      scannerRef.current = html5QrCode;
      setCameraActive(true);
      await html5QrCode.start(
        { facingMode: 'environment' },
        { fps: 12, qrbox: { width: 230, height: 230 } },
        async (decodedText) => {
          await stopCamera();
          await handleQrPayload(decodedText);
        },
        () => {}
      );
    } catch {
      setCameraActive(false);
      triggerFeedback('error');
      setFeedback({
        type: 'error',
        title: 'Нет доступа к камере',
        detail: 'Разрешите доступ к камере или используйте вкладку «Ввести PIN».'
      });
    }
  };

  const handleQrPayload = async (rawText) => {
    setProcessing(true);
    setFeedback(null);
    try {
      let parsed;
      try {
        parsed = JSON.parse(rawText);
      } catch {
        throw new Error('Этот QR-код не относится к системе Pulse');
      }

      const lesson = await dbService.getLessonById(parsed.lid);
      if (!lesson) throw new Error('Пара не найдена в системе');
      if (!lesson.isActive) throw new Error('Перекличка по этой паре уже завершена');

      const valid = await verifyDynamicToken(lesson.id, lesson.secret, parsed.t);
      if (!valid) {
        throw new Error(
          'QR-код устарел (прошло более 20 секунд). Отсканируйте свежий код с экрана преподавателя.'
        );
      }

      let studentGeo = null;
      if (lesson.geo) {
        studentGeo = await getCurrentPositionAsync();
      }

      const rec = await dbService.markAttendance({
        lesson,
        student: user,
        deviceId,
        method: 'QR',
        studentGeo
      });

      triggerFeedback('success');
      setFeedback({
        type: 'success',
        title: 'Отметка подтверждена!',
        detail: `${lesson.subject} • Статус: ${
          rec.status === 'LATE' ? 'Опоздание' : 'Присутствует вовремя'
        }${typeof rec.distanceMeters === 'number' ? ` (${rec.distanceMeters} м от аудитории)` : ''}`
      });
    } catch (err) {
      triggerFeedback('error');
      setFeedback({
        type: 'error',
        title: 'Ошибка верификации',
        detail: err.message
      });
    } finally {
      setProcessing(false);
    }
  };

  const handlePinSubmit = async (e) => {
    e.preventDefault();
    const code = pinInput.trim();
    if (code.length !== 6) {
      triggerFeedback('error');
      setFeedback({
        type: 'error',
        title: 'Неверный формат',
        detail: 'Введите 6-значный код с экрана преподавателя'
      });
      return;
    }

    setProcessing(true);
    setFeedback(null);
    try {
      let matchedLesson = null;
      for (const les of offlineActiveLessons) {
        const ok = await verifyDynamicToken(les.id, les.secret, code);
        if (ok) {
          matchedLesson = les;
          break;
        }
      }

      if (!matchedLesson) {
        throw new Error('Код неверный или уже устарел (обновляется каждые 20 сек).');
      }

      let studentGeo = null;
      if (matchedLesson.geo) {
        studentGeo = await getCurrentPositionAsync();
      }

      const rec = await dbService.markAttendance({
        lesson: matchedLesson,
        student: user,
        deviceId,
        method: 'PIN',
        studentGeo
      });

      triggerFeedback('success');
      setPinInput('');
      setFeedback({
        type: 'success',
        title: 'Отметка подтверждена!',
        detail: `${matchedLesson.subject} (${matchedLesson.room}) • ${
          rec.status === 'LATE' ? 'Опоздание' : 'Вовремя'
        }${typeof rec.distanceMeters === 'number' ? ` (${rec.distanceMeters} м от аудитории)` : ''}`
      });
    } catch (err) {
      triggerFeedback('error');
      setFeedback({
        type: 'error',
        title: 'Не удалось отметиться',
        detail: err.message
      });
    } finally {
      setProcessing(false);
    }
  };

  const hasLiveActivity = onlineActiveLessons.length > 0 || offlineActiveLessons.length > 0;

  const navItems = [
    { id: 'scan', label: 'Отметиться', icon: ScanLine, badge: hasLiveActivity ? 'LIVE' : null },
    { id: 'stats', label: 'Посещаемость', icon: BarChart3 },
    { id: 'profile', label: 'Профиль / ID', icon: User }
  ];

  return (
    <div className="carbon-bg relative min-h-[100dvh] pb-24 lg:pb-10 overflow-x-hidden">
      {/* Плавные переливающиеся серебристые блики */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute -top-36 -left-28 w-[34rem] h-[34rem] rounded-full bg-white/[0.045] blur-[140px]"
          style={{ animation: 'neonAmbientShiftA 12s ease-in-out infinite' }}
        />
        <div
          className="absolute top-1/3 -right-28 w-[30rem] h-[30rem] rounded-full bg-zinc-300/[0.035] blur-[140px]"
          style={{ animation: 'neonAmbientShiftB 14s ease-in-out infinite' }}
        />
      </div>

      {/* Мобильная шапка (скрыта на ПК) */}
      <header className="lg:hidden sticky top-0 z-20 bg-[#060607]/85 backdrop-blur-xl border-b border-white/10 px-4 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <PulseMiniLogo />
          <div>
            <div className="text-[11px] text-zinc-400 font-bold uppercase tracking-wider">
              Pulse • {user.group}
            </div>
            <div className="text-sm font-bold text-white truncate max-w-[200px]">
              {user.fullName}
            </div>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="p-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-zinc-400 hover:text-white active:scale-95 transition"
          title="Выйти"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </header>

      {/* Основной контейнер: на ПК 12-колоночная сетка с боковой панелью */}
      <div className="relative z-10 max-w-lg lg:max-w-[1440px] mx-auto p-4 lg:p-8 lg:grid lg:grid-cols-12 lg:gap-6 items-start">
        {/* ЛЕВАЯ БОКОВАЯ ПАНЕЛЬ (только ПК) */}
        <aside className="hidden lg:flex lg:col-span-3 carbon-card rounded-[2rem] p-6 flex-col justify-between sticky top-8 min-h-[calc(100vh-4rem)]">
          <div className="space-y-6">
            <div className="flex items-center gap-3.5 pb-5 border-b border-white/10">
              <PulseMiniLogo />
              <div>
                <div className="text-2xl font-black tracking-tight pulse-shimmer-title leading-none">
                  Pulse
                </div>
                <div className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-300">
                  {dbService.isCloud ? (
                    <>
                      <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Облако активно</span>
                    </>
                  ) : (
                    <>
                      <CloudOff className="w-3.5 h-3.5 text-amber-400" />
                      <span>Локальный режим</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setTab('profile')}
              className="w-full text-left p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 transition space-y-1"
            >
              <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-zinc-200" />
                <span>Студент • {user.group}</span>
              </div>
              <div className="text-base font-extrabold text-white leading-snug">
                {user.fullName}
              </div>
              <div className="text-xs text-zinc-400">
                Посещаемость:{' '}
                <span className="text-emerald-400 font-bold">{stats.pct}%</span>
              </div>
            </button>

            <nav className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = tab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTab(item.id)}
                    className={`w-full px-4 py-3.5 rounded-2xl text-[15px] font-bold flex items-center justify-between transition-all ${
                      active
                        ? 'bg-zinc-100 text-zinc-950 shadow-[0_0_24px_rgba(255,255,255,0.14)]'
                        : 'text-zinc-400 hover:text-white hover:bg-white/[0.05]'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <Icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </span>
                    {item.badge && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                          active
                            ? 'bg-emerald-600 text-white'
                            : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/35'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="pt-6 border-t border-white/10">
            <button
              type="button"
              onClick={onLogout}
              className="w-full py-3.5 px-4 rounded-2xl bg-white/[0.04] hover:bg-rose-500/15 border border-white/10 hover:border-rose-500/35 text-sm font-bold text-zinc-300 hover:text-rose-300 flex items-center justify-center gap-2 transition"
            >
              <LogOut className="w-4 h-4" />
              <span>Выйти из аккаунта</span>
            </button>
          </div>
        </aside>

        {/* ОСНОВНАЯ РАБОЧАЯ ОБЛАСТЬ */}
        <main key={tab} className="lg:col-span-9 space-y-6">
          {/* Верхняя строка сводки (видна на ПК) */}
          <div className="hidden lg:grid grid-cols-4 gap-4">
            <div className="carbon-card rounded-3xl p-5">
              <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Общая явка
              </div>
              <div className="mt-2 text-3xl font-black text-white">{stats.pct}%</div>
            </div>
            <div className="carbon-card rounded-3xl p-5">
              <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Вовремя
              </div>
              <div className="mt-2 text-3xl font-black text-emerald-400">{stats.present}</div>
            </div>
            <div className="carbon-card rounded-3xl p-5">
              <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Опоздания
              </div>
              <div className="mt-2 text-3xl font-black text-amber-400">{stats.late}</div>
            </div>
            <div className="carbon-card rounded-3xl p-5">
              <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Пропуски
              </div>
              <div className="mt-2 text-3xl font-black text-zinc-400">{stats.absent}</div>
            </div>
          </div>

          {/* ==================== ВКЛАДКА 1: ОТМЕТКА И ОНЛАЙН-ЭФИР ==================== */}
          {tab === 'scan' && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
              {/* Правая на ПК / верхняя на телефоне: Активные эфиры и переклички */}
              <div className="xl:col-span-5 xl:order-2 space-y-4">
                {onlineActiveLessons.map((l) => (
                  <StudentViewer
                    key={l.id}
                    lesson={l}
                    student={user}
                    deviceId={deviceId}
                    onMarked={() => {
                      triggerFeedback('success');
                      setFeedback({
                        type: 'success',
                        title: 'Вы подключились к онлайн-паре!',
                        detail: `${l.subject} • Посещение автоматически засчитано`
                      });
                    }}
                  />
                ))}

                {offlineActiveLessons.length > 0 && (
                  <div className="carbon-card p-5 rounded-3xl border border-white/15 space-y-2.5">
                    <div className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      <span>Сейчас идёт очная перекличка:</span>
                    </div>
                    <div className="space-y-1.5">
                      {offlineActiveLessons.map((l) => (
                        <div
                          key={l.id}
                          className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 text-xs sm:text-sm text-zinc-200"
                        >
                          <div className="font-bold text-white">{l.subject}</div>
                          <div className="text-xs text-zinc-400 mt-0.5">
                            {l.group} • {l.room} {l.geo ? '• GPS-контроль' : ''}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!hasLiveActivity && (
                  <div className="hidden xl:block carbon-card rounded-[2rem] p-6 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-400">
                      <Radio className="w-4 h-4 text-zinc-300" />
                      <span>Активные пары группы {user.group}</span>
                    </div>
                    <p className="text-sm text-zinc-400 leading-relaxed">
                      Сейчас нет запущенных дистанционных эфиров. Как только преподаватель начнёт
                      онлайн-пару для группы <b className="text-white">{user.group}</b>, карточка
                      подключения появится здесь автоматически.
                    </p>
                  </div>
                )}
              </div>

              {/* Левая на ПК / основная: Сканер QR или ввод PIN */}
              <div className="xl:col-span-7 xl:order-1 space-y-4">
                <div className="grid grid-cols-2 gap-2 p-1.5 carbon-card rounded-2xl">
                  <button
                    onClick={() => setScanMode('camera')}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                      scanMode === 'camera'
                        ? 'bg-zinc-100 text-zinc-950 shadow-md'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Camera className="w-4 h-4" />
                    <span>Сканер QR</span>
                  </button>
                  <button
                    onClick={() => setScanMode('pin')}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                      scanMode === 'pin'
                        ? 'bg-zinc-100 text-zinc-950 shadow-md'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Keyboard className="w-4 h-4" />
                    <span>Ввести PIN</span>
                  </button>
                </div>

                {feedback && (
                  <div
                    className={`p-4 rounded-2xl border flex items-start gap-3 ${
                      feedback.type === 'success'
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
                        : 'bg-rose-500/15 border-rose-500/40 text-rose-200'
                    }`}
                  >
                    {feedback.type === 'success' ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="text-sm sm:text-base font-bold">{feedback.title}</div>
                      <div className="text-xs sm:text-sm opacity-90 mt-0.5">{feedback.detail}</div>
                    </div>
                  </div>
                )}

                {scanMode === 'camera' ? (
                  <div className="carbon-card rounded-[2rem] p-5 sm:p-8 text-center">
                    <div
                      className={`relative overflow-hidden rounded-2xl ${
                        cameraActive ? 'mb-4 ring-2 ring-white/40' : ''
                      }`}
                    >
                      <div id="qr-reader" className="w-full" />
                    </div>

                    {!cameraActive ? (
                      <div className="py-6 sm:py-8">
                        <div className="w-20 h-20 mx-auto rounded-3xl bg-white/[0.06] border border-white/15 flex items-center justify-center mb-5 shadow-inner">
                          <ScanLine className="w-10 h-10 text-white" />
                        </div>
                        <h2 className="text-lg sm:text-2xl font-black text-white">
                          Отметка на паре
                        </h2>
                        <p className="text-xs sm:text-sm text-zinc-400 mt-1.5 mb-6 max-w-sm mx-auto leading-relaxed">
                          Наведите камеру на динамический QR-код преподавателя для мгновенной
                          верификации
                        </p>
                        <button
                          onClick={startCamera}
                          disabled={processing}
                          className="w-full py-4 rounded-2xl bg-zinc-100 hover:bg-white active:scale-[0.98] transition-all text-sm sm:text-base font-black text-zinc-950 shadow-[0_12px_30px_rgba(255,255,255,0.12)]"
                        >
                          {processing ? 'Проверка GPS и токена...' : 'Включить сканер'}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={stopCamera}
                        className="w-full py-3.5 rounded-2xl bg-white/10 hover:bg-white/15 text-xs sm:text-sm font-bold text-zinc-200 transition"
                      >
                        Выключить камеру
                      </button>
                    )}
                  </div>
                ) : (
                  <form
                    onSubmit={handlePinSubmit}
                    className="carbon-card rounded-[2rem] p-5 sm:p-8 space-y-5"
                  >
                    <div>
                      <h2 className="text-lg sm:text-xl font-black text-white">
                        Резервный код пары
                      </h2>
                      <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                        Введите 6-значный код с экрана преподавателя (действует 20 сек)
                      </p>
                    </div>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={pinInput}
                      onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                      className="w-full text-center font-mono text-3xl sm:text-4xl font-black tracking-[0.4em] py-4 sm:py-5 rounded-2xl bg-black/80 border border-white/15 text-white placeholder:text-zinc-700 focus:outline-none focus:border-white/45 transition"
                    />
                    <button
                      type="submit"
                      disabled={processing || pinInput.length !== 6}
                      className="w-full py-4 rounded-2xl bg-zinc-100 hover:bg-white disabled:opacity-45 active:scale-[0.98] transition text-sm sm:text-base font-black text-zinc-950 shadow-[0_12px_30px_rgba(255,255,255,0.12)]"
                    >
                      {processing ? 'Проверка HMAC и GPS...' : 'Подтвердить присутствие'}
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}

          {/* ==================== ВКЛАДКА 2: ПОСЕЩАЕМОСТЬ ==================== */}
          {tab === 'stats' && (
            <div className="space-y-5">
              {/* Сводная карточка (видна на всех экранах, на мобильном дополняется 3 плитками) */}
              <div className="carbon-card rounded-[2rem] p-5 sm:p-7 flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Общая посещаемость
                  </div>
                  <div className="text-4xl sm:text-5xl font-black text-white mt-1">
                    {stats.pct}%
                  </div>
                  <div className="text-xs sm:text-sm text-zinc-400 mt-1">
                    Посещено {stats.attended} из {stats.total} пар
                  </div>
                </div>
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 shrink-0">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="rgba(255,255,255,0.1)"
                      strokeWidth="3.5"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke={
                        stats.pct >= 75 ? '#34d399' : stats.pct >= 50 ? '#fbbf24' : '#fb7185'
                      }
                      strokeWidth="3.5"
                      strokeDasharray={`${stats.pct}, 100`}
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5 lg:hidden">
                <div className="carbon-card rounded-2xl p-3 text-center">
                  <div className="text-xl font-black text-emerald-400">{stats.present}</div>
                  <div className="text-[11px] text-zinc-400">Вовремя</div>
                </div>
                <div className="carbon-card rounded-2xl p-3 text-center">
                  <div className="text-xl font-black text-amber-400">{stats.late}</div>
                  <div className="text-[11px] text-zinc-400">Опоздания</div>
                </div>
                <div className="carbon-card rounded-2xl p-3 text-center">
                  <div className="text-xl font-black text-zinc-400">{stats.absent}</div>
                  <div className="text-[11px] text-zinc-400">Пропуски</div>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
                {/* По дисциплинам */}
                <div className="carbon-card rounded-[2rem] p-5 sm:p-7 space-y-4">
                  <h3 className="text-base sm:text-lg font-black text-white">По дисциплинам</h3>
                  {Object.keys(stats.bySubject).length === 0 ? (
                    <div className="text-xs sm:text-sm text-zinc-500 py-4">
                      Пока нет данных по дисциплинам
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {Object.entries(stats.bySubject).map(([subj, info]) => {
                        const p = Math.round((info.attended / info.total) * 100);
                        return (
                          <div
                            key={subj}
                            className="p-4 rounded-2xl bg-white/[0.03] border border-white/10"
                          >
                            <div className="flex justify-between text-xs sm:text-sm mb-2 gap-2">
                              <span className="font-bold text-white truncate">{subj}</span>
                              <span className="text-zinc-200 font-bold shrink-0">
                                {info.attended}/{info.total} ({p}%)
                              </span>
                            </div>
                            <div className="h-2 bg-black/80 rounded-full overflow-hidden p-[1px]">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  p >= 75
                                    ? 'bg-emerald-400'
                                    : p >= 50
                                    ? 'bg-amber-400'
                                    : 'bg-rose-400'
                                }`}
                                style={{ width: `${p}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* История занятий */}
                <div className="carbon-card rounded-[2rem] p-5 sm:p-7 space-y-4">
                  <h3 className="text-base sm:text-lg font-black text-white">История занятий</h3>
                  {groupLessons.length === 0 ? (
                    <div className="text-xs sm:text-sm text-zinc-500 py-4">
                      Для вашей группы пока нет проведённых занятий
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {groupLessons.map((les) => {
                        const rec = myRecords.find((r) => r.lessonId === les.id);
                        const status = rec?.status || 'ABSENT';
                        return (
                          <div
                            key={les.id}
                            className="p-3.5 sm:p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <div className="text-sm font-bold text-white truncate">
                                {les.subject}
                              </div>
                              <div className="text-[11px] sm:text-xs text-zinc-400 mt-0.5">
                                {new Date(les.startedAt).toLocaleDateString('ru-RU')} •{' '}
                                {les.teacherName}
                              </div>
                            </div>
                            <div className="shrink-0">
                              {status === 'PRESENT' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Был
                                </span>
                              )}
                              {status === 'LATE' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                  <Clock className="w-3.5 h-3.5" /> Опоздал
                                </span>
                              )}
                              {status === 'EXCUSED' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-white/10 text-zinc-200 border border-white/25">
                                  Уваж.
                                </span>
                              )}
                              {status === 'ABSENT' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-white/[0.04] text-zinc-500 border border-white/10">
                                  <XCircle className="w-3.5 h-3.5" /> Пропуск
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ==================== ВКЛАДКА 3: ПРОФИЛЬ И 3D PULSE ID ==================== */}
          {tab === 'profile' && (
            <div className="carbon-card rounded-[2rem] p-5 sm:p-8 grid grid-cols-1 xl:grid-cols-2 gap-8 items-center">
              <div className="space-y-5">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    Личный кабинет студента
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">
                    {user.fullName}
                  </h2>
                  <p className="text-sm text-zinc-400 mt-1">
                    Ваш цифровой студенческий билет Pulse ID с криптографическим QR-пропуском и
                    защитой от передачи аккаунта.
                  </p>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl bg-black/65 border border-white/10 space-y-3 text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="text-zinc-400">Учебная группа:</span>
                    <span className="font-bold text-white">{user.group}</span>
                  </div>
                  {user.login && (
                    <div className="flex justify-between gap-2">
                      <span className="text-zinc-400">Логин:</span>
                      <span className="font-mono text-zinc-200">{user.login}</span>
                    </div>
                  )}
                  <div className="flex justify-between gap-2">
                    <span className="text-zinc-400">Посещаемость:</span>
                    <span className="font-bold text-emerald-400">{stats.pct}%</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-black/65 border border-white/10 flex items-center gap-3">
                  <Smartphone className="w-5 h-5 text-zinc-300 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[11px] text-zinc-400">
                      Привязанное устройство (Anti-Spoofing)
                    </div>
                    <div className="text-xs font-mono text-white mt-0.5 truncate">{deviceId}</div>
                  </div>
                </div>

                <button
                  onClick={onLogout}
                  className="w-full py-3.5 rounded-2xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/35 text-rose-300 text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Выйти из аккаунта</span>
                </button>
              </div>

              <div className="flex justify-center">
                <HolographicStudentCard
                  user={user}
                  deviceId={deviceId}
                  attendancePct={stats.pct}
                />
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Мобильная нижняя навигация (скрыта на ПК) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#0a0a0c]/95 backdrop-blur-xl border-t border-white/10 pb-safe z-30">
        <div className="max-w-lg mx-auto grid grid-cols-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`py-3 flex flex-col items-center gap-1 text-[11px] font-bold transition ${
                  active ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
