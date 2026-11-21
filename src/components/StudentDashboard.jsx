import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Activity
} from 'lucide-react';
import { dbService } from '../services/db';
import {
  verifyDynamicToken,
  getOrCreateDeviceId,
  getCurrentPositionAsync,
  triggerFeedback
} from '../utils/crypto';

function HolographicStudentCard({ user, deviceId, attendancePct }) {
  const [tilt, setTilt] = useState({ x: 0, y: 0, glareX: 50, glareY: 50 });
  const [flipped, setFlipped] = useState(false);
  const [studentQrUrl, setStudentQrUrl] = useState('');
  const [gyroEnabled, setGyroEnabled] = useState(false);
  const cardRef = useRef(null);

  const cardNumber = useMemo(() => {
    const raw = (user.id || '000000').replace(/\D/g, '');
    const padded = (raw + '20268419').slice(0, 8);
    return `${padded.slice(0, 4)} ${padded.slice(4, 8)}`;
  }, [user.id]);

  // Генерация персонального QR-кода студенческого ID
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
      color: { dark: '#060b19', light: '#ffffff' }
    }).then(setStudentQrUrl);
  }, [user, deviceId]);

  // Реакция на наклон телефона (гироскоп)
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

  // Реакция на мышь/палец на экране
  const handlePointerMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width;
    const relY = (e.clientY - rect.top) / rect.height;
    const rotateY = (relX - 0.5) * 22;
    const rotateX = -(relY - 0.5) * 22;
    setTilt({
      x: rotateX,
      y: rotateY,
      glareX: relX * 100,
      glareY: relY * 100
    });
  };

  const resetTilt = () => {
    setTilt({ x: 0, y: 0, glareX: 50, glareY: 50 });
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
    <div className="space-y-3" style={{ perspective: '1100px' }}>
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
        className="relative w-full aspect-[1.58/1] rounded-[1.75rem] cursor-pointer select-none shadow-[0_25px_55px_-12px_rgba(34,211,238,0.28)]"
      >
        {/* ЛИЦЕВАЯ СТОРОНА БИЛЕТА */}
        <div
          style={{ backfaceVisibility: 'hidden' }}
          className="absolute inset-0 rounded-[1.75rem] overflow-hidden border border-white/20 bg-gradient-to-br from-[#0c1938] via-[#091229] to-[#131c42] p-5 flex flex-col justify-between"
        >
          {/* Декоративные сетка и орбы внутри карты */}
          <div
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage:
                'radial-gradient(circle at 1.5px 1.5px, rgba(56,189,248,0.7) 1px, transparent 0)',
              backgroundSize: '14px 14px'
            }}
          />
          <div className="absolute -right-12 -top-12 w-44 h-44 rounded-full bg-cyan-400/25 blur-2xl pointer-events-none" />
          <div className="absolute -left-10 -bottom-12 w-44 h-44 rounded-full bg-indigo-500/30 blur-2xl pointer-events-none" />

          {/* Радужный голографический перелив, двигающийся при наклоне */}
          <div
            className="absolute inset-0 pointer-events-none mix-blend-overlay transition-opacity duration-200"
            style={{
              background: `radial-gradient(circle at ${tilt.glareX}% ${tilt.glareY}%, rgba(255,255,255,0.75) 0%, rgba(34,211,238,0.45) 28%, rgba(168,85,247,0.35) 55%, transparent 80%)`
            }}
          />
          <div
            className="absolute inset-0 pointer-events-none opacity-35"
            style={{
              background: `linear-gradient(${115 + tilt.y * 2}deg, transparent 25%, rgba(56,189,248,0.35) 45%, rgba(244,114,182,0.35) 55%, transparent 75%)`
            }}
          />

          {/* Верхняя шапка билета */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-500 to-cyan-400 flex items-center justify-center shadow-md">
                <Activity className="w-4 h-4 text-slate-950 stroke-[2.5]" />
              </div>
              <div>
                <div className="text-xs font-black tracking-wider text-white uppercase">
                  Pulse ID
                </div>
                <div className="text-[9px] text-cyan-300/80 uppercase tracking-widest">
                  Студенческий билет
                </div>
              </div>
            </div>

            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 backdrop-blur-md">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              АКТИВЕН
            </span>
          </div>

          {/* Центральная часть: ФИО и группа */}
          <div className="relative z-10 my-auto pt-2">
            <div className="text-[10px] text-slate-400 uppercase tracking-widest">
              Владелец карты
            </div>
            <div className="text-lg sm:text-xl font-extrabold text-white tracking-tight leading-snug mt-0.5">
              {user.fullName}
            </div>
            <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-white/10 border border-white/15 backdrop-blur-md">
              <span className="text-[10px] text-slate-300">Группа:</span>
              <span className="text-xs font-black text-cyan-300 tracking-wide">{user.group}</span>
            </div>
          </div>

          {/* Нижняя полоса билета */}
          <div className="relative z-10 flex items-end justify-between pt-2 border-t border-white/10">
            <div>
              <div className="text-[9px] text-slate-400 uppercase tracking-wider">Номер ID</div>
              <div className="font-mono text-xs font-bold tracking-widest text-slate-200">
                № {cardNumber}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[9px] text-slate-400 uppercase tracking-wider">Посещаемость</div>
              <div className="text-xs font-extrabold text-emerald-400">{attendancePct}%</div>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-cyan-300 font-semibold">
              <RotateCw className="w-3 h-3" />
              <span>QR-код</span>
            </div>
          </div>
        </div>

        {/* ОБОРОТНАЯ СТОРОНА БИЛЕТА (QR-ПРОПУСК) */}
        <div
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)'
          }}
          className="absolute inset-0 rounded-[1.75rem] overflow-hidden border border-cyan-400/30 bg-gradient-to-br from-[#091229] via-[#060b19] to-[#0f172a] p-5 flex items-center justify-between gap-4"
        >
          <div className="bg-white p-2.5 rounded-2xl shadow-[0_0_25px_rgba(34,211,238,0.35)] shrink-0">
            {studentQrUrl && (
              <img src={studentQrUrl} alt="Student ID QR" className="w-28 h-28 sm:w-32 sm:h-32" />
            )}
          </div>

          <div className="flex-1 text-left space-y-2">
            <div className="inline-flex items-center gap-1 text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5" /> Цифровой пропуск
            </div>
            <div className="text-sm font-bold text-white leading-tight">{user.fullName}</div>
            <div className="text-xs text-slate-400">Группа {user.group}</div>
            <div className="pt-1">
              <div className="text-[9px] text-slate-500 uppercase">Device Hash</div>
              <div className="text-[10px] font-mono text-slate-300 truncate max-w-[150px]">
                {deviceId}
              </div>
            </div>
            <div className="text-[10px] text-cyan-400/90 flex items-center gap-1 pt-1">
              <RotateCw className="w-3 h-3" /> Нажмите, чтобы перевернуть
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between px-1 text-[11px] text-slate-500">
        <span>
          {gyroEnabled
            ? 'Гироскоп активен — наклоните телефон для перелива'
            : 'Нажмите на карту, чтобы открыть QR-пропуск'}
        </span>
        <button
          type="button"
          onClick={() => setFlipped((prev) => !prev)}
          className="text-cyan-400 font-semibold hover:underline"
        >
          {flipped ? 'Лицевая сторона' : 'Показать QR'}
        </button>
      </div>
    </div>
  );
}

export default function StudentDashboard({ user, data, onLogout }) {
  const [tab, setTab] = useState('scan');
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
        throw new Error('QR-код устарел (прошло более 20 секунд). Отсканируйте свежий код с экрана преподавателя.');
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
        detail: `${lesson.subject} • Статус: ${rec.status === 'LATE' ? 'Опоздание' : 'Присутствует вовремя'}${
          typeof rec.distanceMeters === 'number' ? ` (${rec.distanceMeters} м от аудитории)` : ''
        }`
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
      setFeedback({ type: 'error', title: 'Неверный формат', detail: 'Введите 6-значный код с экрана преподавателя' });
      return;
    }

    setProcessing(true);
    setFeedback(null);
    try {
      let matchedLesson = null;
      for (const les of activeGroupLessons) {
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
        detail: `${matchedLesson.subject} (${matchedLesson.room}) • ${rec.status === 'LATE' ? 'Опоздание' : 'Вовремя'}${
          typeof rec.distanceMeters === 'number' ? ` (${rec.distanceMeters} м от аудитории)` : ''
        }`
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

  return (
    <div className="relative min-h-[100dvh] bg-[#030712] pb-28 overflow-x-hidden">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="animate-orb -top-24 -left-24 w-80 h-80 rounded-full bg-blue-600/15 blur-[95px]" />
        <div className="animate-orb-delayed bottom-10 -right-24 w-80 h-80 rounded-full bg-cyan-500/15 blur-[95px]" />
      </div>

      <div className="relative z-10 max-w-lg mx-auto">
        <header className="sticky top-0 z-20 bg-[#030712]/80 backdrop-blur-xl border-b border-white/10 px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-extrabold shadow-lg shadow-blue-600/25">
              {user.fullName[0]}
            </div>
            <div>
              <div className="text-[11px] text-cyan-400 font-bold uppercase tracking-wider">
                Pulse • {user.group}
              </div>
              <div className="text-sm font-bold text-white">{user.fullName}</div>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white active:scale-95 transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </header>

        <main key={tab} className="p-4 space-y-5 animate-tab-enter">
          {tab === 'scan' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-1.5 p-1 glass-card rounded-2xl">
                <button
                  onClick={() => setScanMode('camera')}
                  className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    scanMode === 'camera'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Camera className="w-4 h-4" />
                  <span>Сканер QR</span>
                </button>
                <button
                  onClick={() => setScanMode('pin')}
                  className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    scanMode === 'pin'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Keyboard className="w-4 h-4" />
                  <span>Ввести PIN</span>
                </button>
              </div>

              {feedback && (
                <div
                  className={`p-4 rounded-2xl border flex items-start gap-3 animate-tab-enter ${
                    feedback.type === 'success'
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200 shadow-lg shadow-emerald-500/10'
                      : 'bg-rose-500/15 border-rose-500/40 text-rose-200 shadow-lg shadow-rose-500/10'
                  }`}
                >
                  {feedback.type === 'success' ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="text-sm font-bold">{feedback.title}</div>
                    <div className="text-xs opacity-90 mt-0.5">{feedback.detail}</div>
                  </div>
                </div>
              )}

              {scanMode === 'camera' ? (
                <div className="glass-card rounded-3xl p-5 text-center">
                  <div className={`relative overflow-hidden rounded-2xl ${cameraActive ? 'mb-3 ring-2 ring-cyan-400/60' : ''}`}>
                    <div id="qr-reader" className="w-full" />
                    {cameraActive && (
                      <div className="pointer-events-none absolute inset-0">
                        <div className="animate-scan-laser absolute left-4 right-4 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#22d3ee]" />
                      </div>
                    )}
                  </div>

                  {!cameraActive ? (
                    <div className="py-6">
                      <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-blue-600/20 to-cyan-500/20 border border-blue-500/30 flex items-center justify-center mb-4 shadow-inner">
                        <ScanLine className="w-10 h-10 text-cyan-400" />
                      </div>
                      <h2 className="text-lg font-extrabold text-white">Отметка на паре</h2>
                      <p className="text-xs text-slate-400 mt-1 mb-6 max-w-xs mx-auto">
                        Наведите камеру на динамический QR-код преподавателя для мгновенной верификации
                      </p>
                      <button
                        onClick={startCamera}
                        disabled={processing}
                        className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:brightness-110 active:scale-[0.98] transition-all text-sm font-bold text-white shadow-xl shadow-blue-600/30"
                      >
                        {processing ? 'Проверка GPS и токена...' : 'Включить сканер'}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={stopCamera}
                      className="w-full py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-xs font-bold text-slate-200 transition"
                    >
                      Выключить камеру
                    </button>
                  )}
                </div>
              ) : (
                <form
                  onSubmit={handlePinSubmit}
                  className="glass-card rounded-3xl p-5 space-y-4 animate-tab-enter"
                >
                  <div>
                    <h2 className="text-base font-bold text-white">Резервный код пары</h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Введите 6-значный код под QR-кодом преподавателя (действует 20 сек)
                    </p>
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="w-full text-center font-mono text-3xl font-extrabold tracking-[0.4em] py-4 rounded-2xl bg-slate-950/80 border border-white/10 text-white focus:outline-none focus:border-cyan-400 transition"
                  />
                  <button
                    type="submit"
                    disabled={processing || pinInput.length !== 6}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:brightness-110 disabled:opacity-50 active:scale-[0.98] transition text-sm font-bold text-white shadow-lg shadow-blue-600/25"
                  >
                    {processing ? 'Проверка HMAC и GPS...' : 'Подтвердить присутствие'}
                  </button>
                </form>
              )}

              {activeGroupLessons.length > 0 && (
                <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/25 backdrop-blur-md">
                  <div className="text-xs font-bold text-cyan-300 mb-1.5 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> Сейчас идёт перекличка:
                  </div>
                  {activeGroupLessons.map((l) => (
                    <div key={l.id} className="text-xs text-slate-200">
                      • {l.subject} ({l.group}, {l.room}) {l.geo ? '• GPS-контроль' : ''}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'stats' && (
            <div className="space-y-4">
              <div className="glass-card rounded-3xl p-5 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Общая посещаемость
                  </div>
                  <div className="text-4xl font-extrabold bg-gradient-to-r from-white to-cyan-300 bg-clip-text text-transparent mt-1">
                    {stats.pct}%
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Посещено {stats.attended} из {stats.total} пар
                  </div>
                </div>
                <div className="relative w-22 h-22">
                  <svg className="w-20 h-20 -rotate-90 drop-shadow-[0_0_12px_rgba(16,185,129,0.3)]" viewBox="0 0 36 36">
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="rgba(255,255,255,0.08)"
                      strokeWidth="3.5"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke={stats.pct >= 75 ? '#10b981' : stats.pct >= 50 ? '#f59e0b' : '#f43f5e'}
                      strokeWidth="3.5"
                      strokeDasharray={`${stats.pct}, 100`}
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div className="glass-card rounded-2xl p-3 text-center">
                  <div className="text-xl font-extrabold text-emerald-400">{stats.present}</div>
                  <div className="text-[11px] text-slate-400">Вовремя</div>
                </div>
                <div className="glass-card rounded-2xl p-3 text-center">
                  <div className="text-xl font-extrabold text-amber-400">{stats.late}</div>
                  <div className="text-[11px] text-slate-400">Опоздания</div>
                </div>
                <div className="glass-card rounded-2xl p-3 text-center">
                  <div className="text-xl font-extrabold text-rose-400">{stats.absent}</div>
                  <div className="text-[11px] text-slate-400">Пропуски</div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-white mb-2.5">По дисциплинам</h3>
                <div className="space-y-2.5">
                  {Object.entries(stats.bySubject).map(([subj, info]) => {
                    const p = Math.round((info.attended / info.total) * 100);
                    return (
                      <div key={subj} className="p-4 rounded-2xl glass-card">
                        <div className="flex justify-between text-xs mb-2">
                          <span className="font-bold text-white">{subj}</span>
                          <span className="text-cyan-400 font-bold">
                            {info.attended}/{info.total} ({p}%)
                          </span>
                        </div>
                        <div className="h-2 bg-slate-950 rounded-full overflow-hidden p-[1px]">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-500"
                            style={{ width: `${p}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-white mb-2.5">История занятий</h3>
                <div className="space-y-2">
                  {groupLessons.map((les) => {
                    const rec = myRecords.find((r) => r.lessonId === les.id);
                    const status = rec?.status || 'ABSENT';
                    return (
                      <div
                        key={les.id}
                        className="p-3.5 rounded-2xl glass-card flex items-center justify-between"
                      >
                        <div>
                          <div className="text-sm font-semibold text-white">{les.subject}</div>
                          <div className="text-[11px] text-slate-400">
                            {new Date(les.startedAt).toLocaleDateString('ru-RU')} • {les.teacherName}
                          </div>
                        </div>
                        {status === 'PRESENT' && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400">
                            <CheckCircle2 className="w-4 h-4" /> Был
                          </span>
                        )}
                        {status === 'LATE' && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-400">
                            <Clock className="w-4 h-4" /> Опоздал
                          </span>
                        )}
                        {status === 'ABSENT' && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-400">
                            <XCircle className="w-4 h-4" /> Пропуск
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {tab === 'profile' && (
            <div className="space-y-4">
              {/* Голографический цифровой студенческий билет */}
              <HolographicStudentCard
                user={user}
                deviceId={deviceId}
                attendancePct={stats.pct}
              />

              <div className="glass-card rounded-3xl p-5 space-y-3.5">
                <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-white/10 flex items-center gap-3">
                  <Smartphone className="w-5 h-5 text-cyan-400 shrink-0" />
                  <div>
                    <div className="text-[11px] text-slate-400">Привязанное устройство (Anti-Spoofing)</div>
                    <div className="text-xs font-mono text-white mt-0.5">{deviceId}</div>
                  </div>
                </div>

                <button
                  onClick={onLogout}
                  className="w-full py-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-bold active:scale-[0.98] transition"
                >
                  Выйти из аккаунта
                </button>
              </div>
            </div>
          )}
        </main>

        <nav className="fixed bottom-0 left-0 right-0 glass-nav pb-safe z-30">
          <div className="max-w-lg mx-auto grid grid-cols-3">
            <button
              onClick={() => setTab('scan')}
              className={`py-3 flex flex-col items-center gap-1 text-[11px] font-bold transition ${
                tab === 'scan' ? 'text-cyan-400' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <ScanLine className="w-5 h-5" />
              <span>Отметиться</span>
            </button>
            <button
              onClick={() => setTab('stats')}
              className={`py-3 flex flex-col items-center gap-1 text-[11px] font-bold transition ${
                tab === 'stats' ? 'text-cyan-400' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <BarChart3 className="w-5 h-5" />
              <span>Посещаемость</span>
            </button>
            <button
              onClick={() => setTab('profile')}
              className={`py-3 flex flex-col items-center gap-1 text-[11px] font-bold transition ${
                tab === 'profile' ? 'text-cyan-400' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <User className="w-5 h-5" />
              <span>Профиль</span>
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
}
