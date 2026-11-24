import React, { useState, useEffect, useMemo, useRef, useId } from 'react';
import QRCode from 'qrcode';
import {
  QrCode,
  Play,
  Square,
  Users,
  Download,
  History,
  Maximize2,
  Minimize2,
  CheckCircle2,
  Clock,
  XCircle,
  Shield,
  LogOut,
  Plus,
  Search,
  UserPlus,
  Trash2,
  X,
  MapPin,
  Sparkles,
  BookmarkCheck,
  Radio,
  User,
  Activity,
  Cloud,
  CloudOff
} from 'lucide-react';
import { dbService } from '../services/db';
import {
  ROTATION_SECONDS,
  generateDynamicToken,
  getSecondsRemaining,
  getTimeStep,
  getCurrentPositionAsync
} from '../utils/crypto';
import { exportLessonToExcel, exportSemesterSummaryToExcel } from '../utils/exportExcel';
import { TeacherBroadcaster } from './LiveStreamRoom';

function PulseMiniLogo() {
  const uid = useId().replace(/:/g, '');
  const gradId = `pulseMiniGrad-${uid}`;
  const glowId = `pulseMiniGlow-${uid}`;

  return (
    <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-2xl shrink-0 flex items-center justify-center shadow-[0_0_18px_rgba(255,255,255,0.14)]">
      {/* Мягкое свечение */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl bg-white/15 blur-md animate-pulse" />

      <svg viewBox="0 0 100 100" className="relative w-full h-full overflow-visible">
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="50%" stopColor="#a1a1aa" />
            <stop offset="100%" stopColor="#ffffff" />
          </linearGradient>
          <filter id={glowId} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect
          x="3"
          y="3"
          width="94"
          height="94"
          rx="24"
          fill="#0a0a0c"
          stroke={`url(#${gradId})`}
          strokeWidth="3.2"
        />

        {/* Фоновая линия пульса */}
        <path
          d="M 18 52 L 33 52 L 41 32 L 50 71 L 60 27 L 68 52 L 82 52"
          fill="none"
          stroke="#ffffff"
          strokeOpacity="0.18"
          strokeWidth="4.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Анимированная белая линия пульса */}
        <path
          d="M 18 52 L 33 52 L 41 32 L 50 71 L 60 27 L 68 52 L 82 52"
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth="4.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter={`url(#${glowId})`}
          style={{
            strokeDasharray: 145,
            animation: 'pulseWaveDraw 2.6s ease-in-out infinite'
          }}
        />

        <circle cx="82" cy="52" r="3.4" fill="#ffffff" filter={`url(#${glowId})`}>
          <animate
            attributeName="opacity"
            values="0.25;1;0.25"
            dur="1.8s"
            repeatCount="indefinite"
          />
        </circle>
      </svg>

      {/* Зелёный индикатор онлайна */}
      <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-65" />
        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400 border-2 border-[#060607]" />
      </span>
    </div>
  );
}


function TeacherPulseIdCard({ user, totalLessons, avgAttendance }) {
  const [tilt, setTilt] = useState({ x: 3, y: -6, glareX: 30, glareY: 30 });
  const cardRef = useRef(null);

  const handleMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const rx = (e.clientX - rect.left) / rect.width;
    const ry = (e.clientY - rect.top) / rect.height;
    setTilt({
      x: -(ry - 0.5) * 18,
      y: (rx - 0.5) * 18,
      glareX: rx * 100,
      glareY: ry * 100
    });
  };

  const resetTilt = () => setTilt({ x: 3, y: -6, glareX: 30, glareY: 30 });

  return (
    <div style={{ perspective: '1000px' }} className="w-full max-w-[440px]">
      <div
        ref={cardRef}
        onPointerMove={handleMove}
        onPointerLeave={resetTilt}
        style={{
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transition: 'transform 0.25s cubic-bezier(0.22, 1, 0.36, 1)'
        }}
        className="carbon-surface relative w-full aspect-[1.62/1] rounded-[1.75rem] overflow-hidden border border-white/20 p-5 sm:p-6 flex flex-col justify-between shadow-[0_28px_65px_-15px_rgba(0,0,0,0.9),0_0_25px_rgba(255,255,255,0.06)] cursor-pointer select-none"
      >
        <div
          className="absolute inset-0 pointer-events-none mix-blend-overlay"
          style={{
            background: `radial-gradient(circle at ${tilt.glareX}% ${tilt.glareY}%, rgba(255,255,255,0.85) 0%, rgba(228,228,231,0.3) 35%, transparent 78%)`
          }}
        />

        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-zinc-100 flex items-center justify-center shadow">
              <Activity className="w-5 h-5 text-zinc-950 stroke-[2.5]" />
            </div>
            <div>
              <div className="text-sm font-black tracking-wider text-white uppercase">Pulse ID</div>
              <div className="text-[10px] text-zinc-400 uppercase tracking-widest">
                Преподаватель • Carbon
              </div>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 border border-emerald-500/35 text-emerald-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            ВЕРИФИЦИРОВАН
          </span>
        </div>

        <div className="relative z-10">
          <div className="text-[11px] text-zinc-400 uppercase tracking-widest">
            {user.department ? `Кафедра: ${user.department}` : 'Преподавательский состав'}
          </div>
          <div className="text-lg sm:text-xl font-extrabold text-white mt-1 leading-snug">
            {user.fullName}
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between pt-3 border-t border-white/10 text-[11px] sm:text-xs">
          <span className="font-mono text-zinc-300">
            ID: {String(user.id || 'TCH').slice(0, 12).toUpperCase()}
          </span>
          <span className="text-zinc-200 font-semibold">
            Пар: {totalLessons} • Явка {avgAttendance}%
          </span>
        </div>
      </div>
    </div>
  );
}

export default function TeacherDashboard({ user, data, onLogout }) {
  const [tab, setTab] = useState('active'); // 'active' | 'history' | 'analytics' | 'profile'
  const [lessonMode, setLessonMode] = useState('offline');
  const [subject, setSubject] = useState('');
  const [group, setGroup] = useState('');
  const [room, setRoom] = useState('');
  const [lateMinutes, setLateMinutes] = useState(10);
  const [useGeoFence, setUseGeoFence] = useState(false);
  const [geoRadius, setGeoRadius] = useState(100);
  const [geoError, setGeoError] = useState('');
  const [creating, setCreating] = useState(false);

  const [qrDataUrl, setQrDataUrl] = useState('');
  const [currentPin, setCurrentPin] = useState('------');
  const [secondsLeft, setSecondsLeft] = useState(ROTATION_SECONDS);
  const [qrPulse, setQrPulse] = useState(false);
  const [fullscreenQr, setFullscreenQr] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHistoryLesson, setSelectedHistoryLesson] = useState(null);
  const [analyticsGroup, setAnalyticsGroup] = useState('ALL');

  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importGroup, setImportGroup] = useState('');
  const [importText, setImportText] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const students = useMemo(
    () =>
      data.users
        .filter((u) => u.role === 'student')
        .sort((a, b) => a.fullName.localeCompare(b.fullName, 'ru')),
    [data.users]
  );

  const myLessons = useMemo(
    () => data.lessons.filter((l) => l.teacherId === user.id),
    [data.lessons, user.id]
  );

  const savedPresets = useMemo(() => {
    const map = new Map();
    myLessons.forEach((l) => {
      const key = `${l.subject.toLowerCase()}__${l.group.toUpperCase()}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          subject: l.subject,
          group: l.group,
          room: l.room
        });
      }
    });
    return Array.from(map.values()).slice(0, 8);
  }, [myLessons]);

  const savedSubjects = useMemo(() => {
    const set = new Set();
    myLessons.forEach((l) => l.subject && set.add(l.subject));
    return Array.from(set);
  }, [myLessons]);

  const allGroups = useMemo(() => {
    const set = new Set();
    students.forEach((s) => s.group && set.add(s.group));
    data.lessons.forEach((l) => l.group && set.add(l.group));
    return Array.from(set).sort();
  }, [students, data.lessons]);

  const activeLesson = useMemo(
    () => myLessons.find((l) => l.isActive) || null,
    [myLessons]
  );

  const teacherStats = useMemo(() => {
    const totalLessons = myLessons.length;
    const onlineLessons = myLessons.filter((l) => l.mode === 'online').length;
    let sumPct = 0;
    let counted = 0;

    myLessons.forEach((les) => {
      const recs = data.records.filter((r) => r.lessonId === les.id).length;
      const total = students.filter((s) => s.group === les.group).length || recs;
      if (total > 0) {
        sumPct += (recs / total) * 100;
        counted += 1;
      }
    });

    const avgAttendance = counted > 0 ? Math.round(sumPct / counted) : 0;
    return { totalLessons, onlineLessons, avgAttendance };
  }, [myLessons, data.records, students]);

  useEffect(() => {
    if (!activeLesson || activeLesson.mode === 'online') return;
    let lastStep = -1;
    let cancelled = false;

    const tick = async () => {
      const now = Date.now();
      const step = getTimeStep(now);
      setSecondsLeft(getSecondsRemaining(now));

      if (step !== lastStep) {
        lastStep = step;
        const tok = await generateDynamicToken(activeLesson.id, activeLesson.secret, step);
        if (cancelled) return;
        setCurrentPin(tok.pin);
        setQrPulse(true);
        setTimeout(() => setQrPulse(false), 450);
        const url = await QRCode.toDataURL(tok.payload, {
          width: 340,
          margin: 2,
          color: { dark: '#09090b', light: '#ffffff' }
        });
        if (!cancelled) setQrDataUrl(url);
      }
    };

    tick();
    const timer = setInterval(tick, 500);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [activeLesson]);

  const applyPreset = (preset) => {
    setSubject(preset.subject);
    setGroup(preset.group);
    setRoom(preset.room || '');
  };

  const handleStartLesson = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !group.trim()) return;
    setCreating(true);
    setGeoError('');
    try {
      let geo = null;
      if (lessonMode === 'offline' && useGeoFence) {
        const pos = await getCurrentPositionAsync();
        geo = { lat: pos.lat, lng: pos.lng, radiusMeters: geoRadius };
      }
      await dbService.createLesson({
        teacher: user,
        subject,
        group,
        room,
        lateMinutes,
        geo,
        mode: lessonMode
      });
    } catch (err) {
      setGeoError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleFinishLesson = async () => {
    if (!activeLesson) return;
    await dbService.finishLesson(activeLesson.id);
    setFullscreenQr(false);
    setSelectedHistoryLesson({ ...activeLesson, isActive: false, endedAt: Date.now() });
    setTab('history');
  };

  const handleBulkImport = async (e) => {
    e.preventDefault();
    setImporting(true);
    setImportResult(null);
    try {
      const res = await dbService.bulkImportStudents(importGroup, importText);
      setImportResult({
        type: 'success',
        text: `Добавлено студентов: ${res.added}${res.skipped > 0 ? ` (пропущено дублей: ${res.skipped})` : ''}`
      });
      setImportText('');
      if (analyticsGroup !== 'ALL') setAnalyticsGroup(importGroup.trim().toUpperCase());
    } catch (err) {
      setImportResult({ type: 'error', text: err.message });
    } finally {
      setImporting(false);
    }
  };

  const cycleStudentStatus = async (lesson, student, currentRecord) => {
    if (!currentRecord) {
      await dbService.markAttendance({
        lesson,
        student,
        deviceId: 'TEACHER_MANUAL',
        method: 'MANUAL',
        forcedStatus: 'PRESENT'
      });
    } else if (currentRecord.status === 'PRESENT') {
      await dbService.markAttendance({
        lesson,
        student,
        deviceId: 'TEACHER_MANUAL',
        method: 'MANUAL',
        forcedStatus: 'LATE'
      });
    } else if (currentRecord.status === 'LATE') {
      await dbService.markAttendance({
        lesson,
        student,
        deviceId: 'TEACHER_MANUAL',
        method: 'MANUAL',
        forcedStatus: 'EXCUSED'
      });
    } else {
      await dbService.removeAttendance(lesson.id, student.id);
    }
  };

  const renderLessonRoster = (lesson) => {
    const lessonRecords = data.records.filter((r) => r.lessonId === lesson.id);
    const recordMap = new Map(lessonRecords.map((r) => [r.studentId, r]));
    const groupStudents = students.filter((s) => s.group === lesson.group);

    const combined = [...groupStudents];
    lessonRecords.forEach((r) => {
      if (!combined.some((s) => s.id === r.studentId)) {
        combined.push({ id: r.studentId, fullName: r.studentName, group: r.studentGroup });
      }
    });

    const filtered = combined.filter((s) =>
      s.fullName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const presentCount = lessonRecords.filter((r) => r.status === 'PRESENT').length;
    const lateCount = lessonRecords.filter((r) => r.status === 'LATE').length;
    const absentCount = Math.max(0, combined.length - lessonRecords.length);

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-2xl p-3.5 text-center backdrop-blur-md">
            <div className="text-2xl sm:text-3xl font-black text-emerald-400">{presentCount}</div>
            <div className="text-[11px] sm:text-xs font-semibold text-emerald-200/80">Вовремя</div>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-3.5 text-center backdrop-blur-md">
            <div className="text-2xl sm:text-3xl font-black text-amber-400">{lateCount}</div>
            <div className="text-[11px] sm:text-xs font-semibold text-amber-200/80">Опоздали</div>
          </div>
          <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-3.5 text-center backdrop-blur-md">
            <div className="text-2xl sm:text-3xl font-black text-zinc-400">{absentCount}</div>
            <div className="text-[11px] sm:text-xs font-semibold text-zinc-400">Нет на паре</div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск студента по ФИО..."
              className="w-full pl-10 pr-4 py-3 rounded-2xl bg-black/75 border border-white/10 text-xs sm:text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/35 transition"
            />
          </div>
          <button
            onClick={() => exportLessonToExcel(lesson, groupStudents, lessonRecords)}
            className="flex items-center gap-1.5 px-4 py-3 rounded-2xl bg-zinc-100 hover:bg-white active:scale-95 text-xs sm:text-sm font-black text-zinc-950 shadow-md transition"
          >
            <Download className="w-4 h-4" />
            <span>Excel</span>
          </button>
        </div>

        <p className="text-xs text-zinc-500">
          Нажмите на карточку студента для ручной смены статуса
        </p>

        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="text-center py-8 px-4 text-xs sm:text-sm text-zinc-400 carbon-card rounded-2xl space-y-3">
              <div>В группе {lesson.group} пока нет списка студентов</div>
              <button
                type="button"
                onClick={() => {
                  setImportGroup(lesson.group);
                  setImportResult(null);
                  setImportModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-zinc-100 text-zinc-950 font-black hover:bg-white transition"
              >
                <UserPlus className="w-4 h-4" /> Загрузить список {lesson.group}
              </button>
            </div>
          ) : (
            filtered.map((st) => {
              const rec = recordMap.get(st.id);
              const status = rec?.status || 'ABSENT';
              return (
                <button
                  key={st.id}
                  onClick={() => cycleStudentStatus(lesson, st, rec)}
                  className="w-full flex items-center justify-between p-3.5 sm:p-4 rounded-2xl carbon-card hover:border-white/25 active:scale-[0.99] transition-all text-left"
                >
                  <div className="min-w-0 pr-3">
                    <div className="text-sm sm:text-[15px] font-bold text-white flex items-center gap-2 truncate">
                      <span className="truncate">{st.fullName}</span>
                      {st.isPreloaded && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/5 text-zinc-400 border border-white/10 shrink-0">
                          по списку
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] sm:text-xs text-zinc-400 flex flex-wrap items-center gap-2 mt-0.5">
                      <span>{st.group}</span>
                      {rec?.markedAt && (
                        <span>
                          •{' '}
                          {new Date(rec.markedAt).toLocaleTimeString('ru-RU', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })}
                        </span>
                      )}
                      {typeof rec?.distanceMeters === 'number' && (
                        <span className="text-emerald-400 font-medium">• {rec.distanceMeters} м</span>
                      )}
                      {rec?.method === 'ONLINE' && (
                        <span className="text-zinc-200 font-medium">• Онлайн-эфир</span>
                      )}
                      {rec?.method === 'MANUAL' && <span className="text-zinc-300">• Вручную</span>}
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
                        <XCircle className="w-3.5 h-3.5" /> Нет
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    );
  };

  if (fullscreenQr && activeLesson && activeLesson.mode !== 'online') {
    return (
      <div className="carbon-bg fixed inset-0 z-50 flex flex-col items-center justify-center p-6 text-center">
        <button
          onClick={() => setFullscreenQr(false)}
          className="absolute top-6 right-6 p-3 rounded-2xl carbon-card text-zinc-300 hover:text-white z-10"
        >
          <Minimize2 className="w-5 h-5" />
        </button>
        <div className="relative z-10">
          <div className="text-sm sm:text-base font-bold text-zinc-300 mb-1">
            {activeLesson.group} • {activeLesson.room}
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-white mb-6">
            {activeLesson.subject}
          </h2>
          <div
            className={`inline-block bg-white p-6 rounded-[2rem] shadow-[0_0_70px_rgba(255,255,255,0.16)] transition-transform duration-300 ${
              qrPulse ? 'scale-105' : 'scale-100'
            }`}
          >
            {qrDataUrl && (
              <img src={qrDataUrl} alt="Dynamic QR" className="w-72 h-72 sm:w-96 sm:h-96" />
            )}
          </div>
          <div className="mt-7 flex items-center justify-center gap-4">
            <div className="px-6 py-3.5 rounded-2xl carbon-card">
              <div className="text-[11px] text-zinc-400 uppercase tracking-wider">Резервный PIN</div>
              <div className="text-3xl sm:text-4xl font-mono font-black tracking-widest text-white mt-0.5">
                {currentPin}
              </div>
            </div>
            <div className="px-6 py-3.5 rounded-2xl carbon-card">
              <div className="text-[11px] text-zinc-400 uppercase tracking-wider">Ротация HMAC</div>
              <div className="text-3xl sm:text-4xl font-mono font-black text-emerald-400 mt-0.5">
                {secondsLeft}с
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const navItems = [
    { id: 'active', label: 'Пара / QR', icon: QrCode, badge: activeLesson ? 'LIVE' : null },
    { id: 'history', label: 'Архив', icon: History },
    { id: 'analytics', label: 'Группы', icon: Users },
    { id: 'profile', label: 'Кабинет', icon: User }
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
            <div className="text-[11px] text-zinc-400 font-bold flex items-center gap-1 uppercase tracking-wider">
              <Shield className="w-3 h-3 text-zinc-200" /> Pulse • Преподаватель
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
              <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                Преподаватель {user.department ? `• ${user.department}` : ''}
              </div>
              <div className="text-base font-extrabold text-white leading-snug">
                {user.fullName}
              </div>
              <div className="text-xs text-zinc-400">
                Проведено пар: {teacherStats.totalLessons}
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
                Проведено пар
              </div>
              <div className="mt-2 text-3xl font-black text-white">{teacherStats.totalLessons}</div>
            </div>
            <div className="carbon-card rounded-3xl p-5">
              <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Средняя явка
              </div>
              <div className="mt-2 text-3xl font-black text-emerald-400">
                {teacherStats.avgAttendance}%
              </div>
            </div>
            <div className="carbon-card rounded-3xl p-5">
              <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Студентов в базе
              </div>
              <div className="mt-2 text-3xl font-black text-white">{students.length}</div>
            </div>
            <div className="carbon-card rounded-3xl p-5">
              <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Учебных групп
              </div>
              <div className="mt-2 text-3xl font-black text-zinc-200">{allGroups.length}</div>
            </div>
          </div>

          {/* ==================== ВКЛАДКА 1: АКТИВНАЯ ПАРА / ЗАПУСК ==================== */}
          {tab === 'active' && (
            <>
              {!activeLesson ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Левая/основная колонка: Форма создания пары */}
                  <div
                    className={`${
                      savedPresets.length > 0 ? 'lg:col-span-7' : 'lg:col-span-12'
                    } carbon-card rounded-[2rem] p-5 sm:p-7`}
                  >
                    <div className="flex items-center gap-3.5 mb-6">
                      <div className="p-3 rounded-2xl bg-white/[0.06] border border-white/15 text-white">
                        <Plus className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-lg sm:text-xl font-black text-white">
                          Начать новую пару
                        </h2>
                        <p className="text-xs sm:text-sm text-zinc-400">
                          Выберите очный QR-режим или дистанционный эфир
                        </p>
                      </div>
                    </div>

                    <form onSubmit={handleStartLesson} className="space-y-4">
                      <div className="grid grid-cols-2 gap-2 p-1.5 bg-black/80 rounded-2xl border border-white/10">
                        <button
                          type="button"
                          onClick={() => setLessonMode('offline')}
                          className={`py-3 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition ${
                            lessonMode === 'offline'
                              ? 'bg-zinc-100 text-zinc-950 shadow-md'
                              : 'text-zinc-400 hover:text-white'
                          }`}
                        >
                          <QrCode className="w-4 h-4" />
                          <span>Очно (QR + GPS)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setLessonMode('online')}
                          className={`py-3 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition ${
                            lessonMode === 'online'
                              ? 'bg-zinc-100 text-zinc-950 shadow-md'
                              : 'text-zinc-400 hover:text-white'
                          }`}
                        >
                          <Radio className="w-4 h-4" />
                          <span>Дистанционно</span>
                        </button>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider">
                          Дисциплина
                        </label>
                        <input
                          type="text"
                          list="pulse-subjects"
                          value={subject}
                          onChange={(e) => setSubject(e.target.value)}
                          placeholder="Введите название предмета (напр. Экономика)"
                          required
                          className="w-full px-4 py-3.5 rounded-2xl bg-black/75 border border-white/10 text-sm sm:text-base text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/40 transition"
                        />
                        <datalist id="pulse-subjects">
                          {savedSubjects.map((s) => (
                            <option key={s} value={s} />
                          ))}
                        </datalist>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider">
                            Группа
                          </label>
                          <input
                            type="text"
                            list="pulse-groups"
                            value={group}
                            onChange={(e) => setGroup(e.target.value.toUpperCase())}
                            placeholder="Напр. КСЦ-23"
                            required
                            className="w-full px-4 py-3.5 rounded-2xl bg-black/75 border border-white/10 text-sm sm:text-base text-white uppercase placeholder:normal-case placeholder:text-zinc-600 focus:outline-none focus:border-white/40 transition"
                          />
                          <datalist id="pulse-groups">
                            {allGroups.map((g) => (
                              <option key={g} value={g} />
                            ))}
                          </datalist>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider">
                            {lessonMode === 'online' ? 'Формат' : 'Аудитория'}
                          </label>
                          <input
                            type="text"
                            value={room}
                            onChange={(e) => setRoom(e.target.value)}
                            placeholder={lessonMode === 'online' ? 'Онлайн-лекция' : 'Напр. Ауд. 8.204'}
                            className="w-full px-4 py-3.5 rounded-2xl bg-black/75 border border-white/10 text-sm sm:text-base text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/40 transition"
                          />
                        </div>
                      </div>

                      {allGroups.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {allGroups.slice(0, 10).map((g) => (
                            <button
                              type="button"
                              key={g}
                              onClick={() => setGroup(g)}
                              className={`text-xs px-3 py-1.5 rounded-xl border transition ${
                                group === g
                                  ? 'bg-zinc-100 border-zinc-100 text-zinc-950 font-bold'
                                  : 'bg-white/[0.04] border-white/10 text-zinc-400 hover:text-white'
                              }`}
                            >
                              {g}
                            </button>
                          ))}
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider">
                          Допуск на опоздание
                        </label>
                        <select
                          value={lateMinutes}
                          onChange={(e) => setLateMinutes(Number(e.target.value))}
                          className="w-full px-4 py-3.5 rounded-2xl bg-black/80 border border-white/10 text-sm sm:text-base text-white focus:outline-none focus:border-white/40"
                        >
                          <option value={5}>5 минут</option>
                          <option value={10}>10 минут</option>
                          <option value={15}>15 минут</option>
                          <option value={30}>30 минут</option>
                        </select>
                      </div>

                      {lessonMode === 'offline' && (
                        <div className="p-4 rounded-2xl bg-black/65 border border-white/10 space-y-3">
                          <label className="flex items-center justify-between cursor-pointer">
                            <span className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-zinc-200">
                              <MapPin className="w-4 h-4 text-emerald-400" />
                              <span>Контроль геозоны аудитории (GPS)</span>
                            </span>
                            <input
                              type="checkbox"
                              checked={useGeoFence}
                              onChange={(e) => setUseGeoFence(e.target.checked)}
                              className="w-4 h-4 accent-zinc-200"
                            />
                          </label>
                          {useGeoFence && (
                            <div className="flex items-center justify-between pt-3 border-t border-white/10">
                              <span className="text-xs text-zinc-400">Допустимый радиус:</span>
                              <select
                                value={geoRadius}
                                onChange={(e) => setGeoRadius(Number(e.target.value))}
                                className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-white/15 text-xs text-white"
                              >
                                <option value={50}>50 метров (строго)</option>
                                <option value={100}>100 метров (корпус)</option>
                                <option value={250}>250 метров (кампус)</option>
                              </select>
                            </div>
                          )}
                          {geoError && <div className="text-xs text-rose-400">{geoError}</div>}
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={creating}
                        className="w-full py-4 rounded-2xl bg-zinc-100 hover:bg-white active:scale-[0.98] transition-all text-sm sm:text-base font-black text-zinc-950 flex items-center justify-center gap-2 shadow-[0_12px_30px_rgba(255,255,255,0.12)]"
                      >
                        <Play className="w-4 h-4 fill-current" />
                        <span>
                          {creating
                            ? 'Запуск...'
                            : lessonMode === 'online'
                            ? 'Запустить дистанционную пару'
                            : 'Запустить пару и открыть QR'}
                        </span>
                      </button>
                    </form>
                  </div>

                  {/* Правая колонка: Сохранённые пары */}
                  {savedPresets.length > 0 && (
                    <div className="lg:col-span-5 carbon-card rounded-[2rem] p-5 sm:p-7 space-y-4">
                      <div className="flex items-center gap-2 text-xs font-bold text-zinc-300 uppercase tracking-wider">
                        <BookmarkCheck className="w-4 h-4 text-emerald-400" />
                        <span>Мои сохранённые пары</span>
                      </div>
                      <p className="text-xs text-zinc-400">
                        Нажмите на карточку, чтобы мгновенно подставить предмет, группу и аудиторию:
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2.5">
                        {savedPresets.map((p) => (
                          <button
                            key={p.key}
                            type="button"
                            onClick={() => applyPreset(p)}
                            className="w-full text-left p-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/10 border border-white/10 hover:border-white/25 active:scale-[0.99] transition"
                          >
                            <div className="text-sm font-bold text-white">{p.subject}</div>
                            <div className="text-xs text-zinc-400 mt-0.5">
                              {p.group} {p.room ? `• ${p.room}` : ''}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                  {/* Левая колонка: QR-код или Дистант-эфир */}
                  <div className="xl:col-span-5 carbon-card rounded-[2rem] p-5 sm:p-7 space-y-5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/25">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                          {activeLesson.mode === 'online'
                            ? `ДИСТАНТ • ${activeLesson.group}`
                            : `LIVE • ${activeLesson.group}${
                                activeLesson.geo ? ` • GPS ≤ ${activeLesson.geo.radiusMeters}м` : ''
                              }`}
                        </span>
                        <h2 className="text-xl sm:text-2xl font-black text-white mt-2.5">
                          {activeLesson.subject}
                        </h2>
                        <div className="text-xs sm:text-sm text-zinc-400 mt-0.5">
                          {activeLesson.room}
                        </div>
                      </div>
                      {activeLesson.mode !== 'online' && (
                        <button
                          onClick={() => setFullscreenQr(true)}
                          className="p-2.5 rounded-2xl bg-white/[0.06] border border-white/10 text-zinc-300 hover:text-white active:scale-95 transition"
                          title="На весь экран (для проектора)"
                        >
                          <Maximize2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {activeLesson.mode === 'online' ? (
                      <TeacherBroadcaster lesson={activeLesson} />
                    ) : (
                      <div className="flex flex-col items-center py-2">
                        <div className="p-1.5 rounded-3xl bg-gradient-to-tr from-zinc-600 via-white to-zinc-600 shadow-[0_0_40px_rgba(255,255,255,0.12)]">
                          <div
                            className={`bg-white p-4 rounded-[1.35rem] transition-transform duration-300 ${
                              qrPulse ? 'scale-[1.03]' : 'scale-100'
                            }`}
                          >
                            {qrDataUrl && (
                              <img src={qrDataUrl} alt="QR Code" className="w-56 h-56 sm:w-64 sm:h-64" />
                            )}
                          </div>
                        </div>

                        <div className="w-full max-w-[280px] mt-5">
                          <div className="flex justify-between text-xs text-zinc-400 mb-1.5">
                            <span className="flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-zinc-200" /> HMAC-SHA256
                            </span>
                            <span className="font-mono text-white font-bold">{secondsLeft} сек</span>
                          </div>
                          <div className="h-2.5 bg-black/80 rounded-full overflow-hidden p-[1px] border border-white/10">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-zinc-400 to-white transition-all duration-500"
                              style={{ width: `${(secondsLeft / ROTATION_SECONDS) * 100}%` }}
                            />
                          </div>
                        </div>

                        <div className="mt-4 w-full max-w-[280px] px-5 py-3 rounded-2xl bg-black/75 border border-white/10 text-center">
                          <span className="text-xs text-zinc-400 mr-2">Резервный PIN:</span>
                          <span className="font-mono text-xl font-black tracking-widest text-white">
                            {currentPin}
                          </span>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={handleFinishLesson}
                      className="w-full py-3.5 rounded-2xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/35 text-rose-300 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition"
                    >
                      <Square className="w-4 h-4 fill-current" />
                      <span>Завершить пару и подвести итоги</span>
                    </button>
                  </div>

                  {/* Правая колонка: Живой журнал отметки */}
                  <div className="xl:col-span-7 carbon-card rounded-[2rem] p-5 sm:p-7">
                    <h3 className="text-base sm:text-lg font-black text-white mb-4">
                      Журнал отметки в реальном времени
                    </h3>
                    {renderLessonRoster(activeLesson)}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ==================== ВКЛАДКА 2: АРХИВ ПАР ==================== */}
          {tab === 'history' && (
            <div className="space-y-4">
              {selectedHistoryLesson ? (
                <div className="space-y-4">
                  <button
                    onClick={() => setSelectedHistoryLesson(null)}
                    className="text-xs sm:text-sm text-zinc-300 hover:text-white font-bold inline-block"
                  >
                    ← Вернуться ко всем парам
                  </button>
                  <div className="carbon-card rounded-3xl p-5">
                    <div className="text-xs text-zinc-400">
                      {new Date(selectedHistoryLesson.startedAt).toLocaleString('ru-RU')} •{' '}
                      {selectedHistoryLesson.group}
                    </div>
                    <h2 className="text-lg sm:text-xl font-black text-white mt-1">
                      {selectedHistoryLesson.subject}
                    </h2>
                  </div>
                  <div className="carbon-card rounded-3xl p-5">
                    {renderLessonRoster(selectedHistoryLesson)}
                  </div>
                </div>
              ) : (
                <div className="carbon-card rounded-[2rem] p-5 sm:p-7 space-y-4">
                  <h2 className="text-lg sm:text-2xl font-black text-white">Архив проведённых пар</h2>
                  {myLessons.length === 0 ? (
                    <div className="text-center py-10 text-xs sm:text-sm text-zinc-500">
                      Вы ещё не провели ни одной пары
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {myLessons.map((les) => {
                        const count = data.records.filter((r) => r.lessonId === les.id).length;
                        const total = students.filter((s) => s.group === les.group).length || count;
                        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                        return (
                          <button
                            key={les.id}
                            onClick={() => setSelectedHistoryLesson(les)}
                            className="w-full text-left p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 hover:border-white/25 active:scale-[0.99] transition"
                          >
                            <div className="flex justify-between items-start gap-2">
                              <div>
                                <div className="text-sm sm:text-base font-bold text-white">
                                  {les.subject}
                                </div>
                                <div className="text-xs text-zinc-400 mt-1">
                                  {les.group} • {new Date(les.startedAt).toLocaleDateString('ru-RU')}
                                  {les.mode === 'online' ? ' • Онлайн' : ''}
                                </div>
                              </div>
                              <span className="px-3 py-1 rounded-xl bg-white/10 border border-white/15 text-white text-xs font-bold shrink-0">
                                {count}/{total} ({pct}%)
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ==================== ВКЛАДКА 3: ГРУППЫ И СПИСКИ ==================== */}
          {tab === 'analytics' && (
            <div className="carbon-card rounded-[2rem] p-5 sm:p-7 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg sm:text-2xl font-black text-white">Группы и списки</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setImportGroup(analyticsGroup === 'ALL' ? '' : analyticsGroup);
                      setImportResult(null);
                      setImportModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-zinc-100 hover:bg-white text-xs sm:text-sm font-black text-zinc-950 active:scale-95 transition"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Загрузить список</span>
                  </button>
                  <button
                    onClick={() =>
                      exportSemesterSummaryToExcel(myLessons, students, data.records, analyticsGroup)
                    }
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 text-xs sm:text-sm font-bold text-emerald-300 active:scale-95 transition"
                  >
                    <Download className="w-4 h-4" />
                    <span>XLSX</span>
                  </button>
                </div>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1">
                <button
                  onClick={() => setAnalyticsGroup('ALL')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold border whitespace-nowrap transition ${
                    analyticsGroup === 'ALL'
                      ? 'bg-zinc-100 border-zinc-100 text-zinc-950'
                      : 'bg-white/[0.04] border-white/10 text-zinc-400 hover:text-white'
                  }`}
                >
                  Все группы ({students.length})
                </button>
                {allGroups.map((g) => {
                  const cnt = students.filter((s) => s.group === g).length;
                  return (
                    <button
                      key={g}
                      onClick={() => setAnalyticsGroup(g)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold border whitespace-nowrap transition ${
                        analyticsGroup === g
                          ? 'bg-zinc-100 border-zinc-100 text-zinc-950'
                          : 'bg-white/[0.04] border-white/10 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {g} ({cnt})
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {students.filter((s) => analyticsGroup === 'ALL' || s.group === analyticsGroup)
                  .length === 0 ? (
                  <div className="md:col-span-2 text-center py-10 px-4 text-xs sm:text-sm text-zinc-400">
                    Список студентов пуст. Нажмите «Загрузить список», чтобы вставить ФИО из Excel
                    или Word.
                  </div>
                ) : (
                  students
                    .filter((s) => analyticsGroup === 'ALL' || s.group === analyticsGroup)
                    .map((st) => {
                      const groupLessons = myLessons.filter((l) => l.group === st.group);
                      const total = groupLessons.length;
                      const attended = groupLessons.filter((l) =>
                        data.records.some((r) => r.lessonId === l.id && r.studentId === st.id)
                      ).length;
                      const pct = total > 0 ? Math.round((attended / total) * 100) : 0;

                      return (
                        <div
                          key={st.id}
                          className="p-4 rounded-2xl bg-white/[0.03] border border-white/10"
                        >
                          <div className="flex justify-between items-center mb-2.5 gap-2">
                            <div className="min-w-0">
                              <div className="text-sm font-bold text-white flex items-center gap-2 truncate">
                                <span className="truncate">{st.fullName}</span>
                                {st.isPreloaded ? (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/5 text-zinc-400 shrink-0">
                                    не рег.
                                  </span>
                                ) : (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 shrink-0">
                                    аккаунт
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-zinc-400 mt-0.5">
                                {st.group} • Посещено {attended} из {total} пар
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span
                                className={`text-sm font-extrabold ${
                                  pct >= 75
                                    ? 'text-emerald-400'
                                    : pct >= 50
                                    ? 'text-amber-400'
                                    : 'text-rose-400'
                                }`}
                              >
                                {pct}%
                              </span>
                              {st.isPreloaded && (
                                <button
                                  onClick={() => dbService.removePreloadedStudent(st.id)}
                                  className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-white/5"
                                  title="Удалить из списка"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="h-2 bg-black/80 rounded-full overflow-hidden p-[1px]">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                pct >= 75
                                  ? 'bg-emerald-400'
                                  : pct >= 50
                                  ? 'bg-amber-400'
                                  : 'bg-rose-400'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          )}

          {/* ==================== ВКЛАДКА 4: ЛИЧНЫЙ КАБИНЕТ ПРЕПОДАВАТЕЛЯ ==================== */}
          {tab === 'profile' && (
            <div className="carbon-card rounded-[2rem] p-5 sm:p-8 grid grid-cols-1 xl:grid-cols-2 gap-8 items-center">
              <div className="space-y-5">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    Личный кабинет
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">
                    {user.fullName}
                  </h2>
                  <p className="text-sm text-zinc-400 mt-1">
                    Учётная запись преподавателя системы Pulse с доступом к динамическим QR-кодам,
                    GPS-контролю и дистанционным эфирам.
                  </p>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl bg-black/65 border border-white/10 space-y-3 text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="text-zinc-400">Роль:</span>
                    <span className="font-bold text-white">Преподаватель</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-zinc-400">Кафедра:</span>
                    <span className="font-bold text-white">
                      {user.department || 'Не указана'}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-zinc-400">Логин:</span>
                    <span className="font-mono text-zinc-200">{user.login}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-zinc-400">Проведено пар:</span>
                    <span className="font-bold text-white">
                      {teacherStats.totalLessons} (онлайн: {teacherStats.onlineLessons})
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-zinc-400">Средняя явка:</span>
                    <span className="font-bold text-emerald-400">
                      {teacherStats.avgAttendance}%
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onLogout}
                  className="w-full py-3.5 rounded-2xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/35 text-rose-300 text-sm font-bold flex items-center justify-center gap-2 transition"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Выйти из аккаунта</span>
                </button>
              </div>

              <div className="flex flex-col items-center space-y-3">
                <TeacherPulseIdCard
                  user={user}
                  totalLessons={teacherStats.totalLessons}
                  avgAttendance={teacherStats.avgAttendance}
                />
                <span className="text-xs text-zinc-500">
                  Наведите курсор или проведите пальцем по карте Pulse ID
                </span>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Модальное окно загрузки списка группы */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="carbon-card rounded-3xl p-5 sm:p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Загрузка списка группы</h3>
                <p className="text-xs text-zinc-400">
                  Вставьте ФИО студентов (каждое с новой строки)
                </p>
              </div>
              <button
                onClick={() => setImportModalOpen(false)}
                className="p-2 rounded-xl bg-white/5 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleBulkImport} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 mb-1 uppercase">
                  Название группы
                </label>
                <input
                  type="text"
                  value={importGroup}
                  onChange={(e) => setImportGroup(e.target.value.toUpperCase())}
                  placeholder="Введите название группы"
                  required
                  className="w-full px-4 py-3 rounded-2xl bg-black/80 border border-white/10 text-sm text-white uppercase placeholder:normal-case focus:outline-none focus:border-white/40"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 mb-1 uppercase">
                  Список ФИО
                </label>
                <textarea
                  rows={7}
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder={
                    'Косяк Даниил Дмитриевич\nАвраменко Илья Сергеевич\nБелова Анна Викторовна'
                  }
                  required
                  className="w-full px-4 py-3 rounded-2xl bg-black/80 border border-white/10 text-xs text-white focus:outline-none focus:border-white/40 leading-relaxed"
                />
              </div>

              {importResult && (
                <div
                  className={`p-3 rounded-2xl text-xs border ${
                    importResult.type === 'success'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}
                >
                  {importResult.text}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setImportModalOpen(false)}
                  className="flex-1 py-3 rounded-2xl bg-white/5 text-xs font-bold text-zinc-300 hover:text-white"
                >
                  Закрыть
                </button>
                <button
                  type="submit"
                  disabled={importing}
                  className="flex-1 py-3 rounded-2xl bg-zinc-100 hover:bg-white text-xs font-black text-zinc-950"
                >
                  {importing ? 'Сохранение...' : 'Добавить в группу'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Мобильная нижняя навигация (скрыта на ПК) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#0a0a0c]/95 backdrop-blur-xl border-t border-white/10 pb-safe z-30">
        <div className="max-w-lg mx-auto grid grid-cols-4">
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
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
