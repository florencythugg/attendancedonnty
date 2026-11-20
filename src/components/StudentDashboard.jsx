import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
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
  Smartphone
} from 'lucide-react';
import { dbService } from '../services/db';
import { verifyDynamicToken, getOrCreateDeviceId, getCurrentPositionAsync } from '../utils/crypto';

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
        { fps: 10, qrbox: { width: 230, height: 230 } },
        async (decodedText) => {
          await stopCamera();
          await handleQrPayload(decodedText);
        },
        () => {}
      );
    } catch {
      setCameraActive(false);
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
        throw new Error('Этот QR-код не относится к системе Attendance Pro');
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

      setFeedback({
        type: 'success',
        title: 'Отметка подтверждена!',
        detail: `${lesson.subject} • Статус: ${rec.status === 'LATE' ? 'Опоздание' : 'Присутствует вовремя'}${
          typeof rec.distanceMeters === 'number' ? ` (${rec.distanceMeters} м от аудитории)` : ''
        }`
      });
    } catch (err) {
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

      setPinInput('');
      setFeedback({
        type: 'success',
        title: 'Отметка подтверждена!',
        detail: `${matchedLesson.subject} (${matchedLesson.room}) • ${rec.status === 'LATE' ? 'Опоздание' : 'Вовремя'}${
          typeof rec.distanceMeters === 'number' ? ` (${rec.distanceMeters} м от аудитории)` : ''
        }`
      });
    } catch (err) {
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
    <div className="min-h-screen bg-slate-950 pb-24 max-w-lg mx-auto">
      <header className="sticky top-0 z-20 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-3.5 flex items-center justify-between">
        <div>
          <div className="text-xs text-blue-400 font-semibold">Студент • {user.group}</div>
          <div className="text-sm font-bold text-white">{user.fullName}</div>
        </div>
        <button
          onClick={onLogout}
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </header>

      <main className="p-4 space-y-5">
        {tab === 'scan' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-900 rounded-xl border border-slate-800">
              <button
                onClick={() => setScanMode('camera')}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition ${
                  scanMode === 'camera' ? 'bg-blue-600 text-white' : 'text-slate-400'
                }`}
              >
                <Camera className="w-4 h-4" />
                <span>Сканер QR</span>
              </button>
              <button
                onClick={() => setScanMode('pin')}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition ${
                  scanMode === 'pin' ? 'bg-blue-600 text-white' : 'text-slate-400'
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
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                }`}
              >
                {feedback.type === 'success' ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="text-sm font-bold">{feedback.title}</div>
                  <div className="text-xs opacity-85 mt-0.5">{feedback.detail}</div>
                </div>
              </div>
            )}

            {scanMode === 'camera' ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-center">
                <div id="qr-reader" className="w-full overflow-hidden rounded-xl mb-3" />

                {!cameraActive ? (
                  <div className="py-6">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-600/15 border border-blue-500/30 flex items-center justify-center mb-3">
                      <ScanLine className="w-8 h-8 text-blue-400" />
                    </div>
                    <h2 className="text-base font-bold text-white">Отметка на паре</h2>
                    <p className="text-xs text-slate-400 mt-1 mb-5">
                      Наведите камеру на динамический QR-код преподавателя
                    </p>
                    <button
                      onClick={startCamera}
                      disabled={processing}
                      className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-semibold text-white shadow-lg shadow-blue-600/25"
                    >
                      {processing ? 'Проверка GPS и токена...' : 'Включить камеру'}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={stopCamera}
                    className="w-full py-2.5 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300"
                  >
                    Выключить камеру
                  </button>
                )}
              </div>
            ) : (
              <form
                onSubmit={handlePinSubmit}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4"
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
                  className="w-full text-center font-mono text-3xl tracking-[0.4em] py-3.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  disabled={processing || pinInput.length !== 6}
                  className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-sm font-semibold text-white"
                >
                  {processing ? 'Проверка HMAC и GPS...' : 'Подтвердить присутствие'}
                </button>
              </form>
            )}

            {activeGroupLessons.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/25">
                <div className="text-xs font-semibold text-blue-300 mb-1">
                  Сейчас идёт перекличка:
                </div>
                {activeGroupLessons.map((l) => (
                  <div key={l.id} className="text-xs text-slate-300">
                    • {l.subject} ({l.group}, {l.room}) {l.geo ? '• с проверкой GPS' : ''}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'stats' && (
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-400">Общая посещаемость</div>
                <div className="text-3xl font-bold text-white mt-1">{stats.pct}%</div>
                <div className="text-xs text-slate-400 mt-1">
                  Посещено {stats.attended} из {stats.total} пар
                </div>
              </div>
              <div className="relative w-20 h-20">
                <svg className="w-20 h-20 -rotate-90" viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#1e293b"
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
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
                <div className="text-lg font-bold text-emerald-400">{stats.present}</div>
                <div className="text-[11px] text-slate-400">Вовремя</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
                <div className="text-lg font-bold text-amber-400">{stats.late}</div>
                <div className="text-[11px] text-slate-400">Опоздания</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
                <div className="text-lg font-bold text-rose-400">{stats.absent}</div>
                <div className="text-[11px] text-slate-400">Пропуски</div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-white mb-2.5">По дисциплинам</h3>
              <div className="space-y-2">
                {Object.entries(stats.bySubject).map(([subj, info]) => {
                  const p = Math.round((info.attended / info.total) * 100);
                  return (
                    <div key={subj} className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="font-semibold text-white">{subj}</span>
                        <span className="text-slate-400">
                          {info.attended}/{info.total} ({p}%)
                        </span>
                      </div>
                      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${p}%` }} />
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
                      className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between"
                    >
                      <div>
                        <div className="text-sm font-medium text-white">{les.subject}</div>
                        <div className="text-[11px] text-slate-400">
                          {new Date(les.startedAt).toLocaleDateString('ru-RU')} • {les.teacherName}
                        </div>
                      </div>
                      {status === 'PRESENT' && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400">
                          <CheckCircle2 className="w-4 h-4" /> Был
                        </span>
                      )}
                      {status === 'LATE' && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-400">
                          <Clock className="w-4 h-4" /> Опоздал
                        </span>
                      )}
                      {status === 'ABSENT' && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-400">
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
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-lg">
                {user.fullName[0]}
              </div>
              <div>
                <div className="text-base font-bold text-white">{user.fullName}</div>
                <div className="text-xs text-slate-400">Группа {user.group} • Логин: {user.login}</div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-3">
              <Smartphone className="w-5 h-5 text-blue-400 shrink-0" />
              <div>
                <div className="text-[11px] text-slate-400">Идентификатор устройства (Anti-Spoofing)</div>
                <div className="text-xs font-mono text-white mt-0.5">{deviceId}</div>
              </div>
            </div>

            <button
              onClick={onLogout}
              className="w-full py-2.5 rounded-xl bg-rose-600/15 border border-rose-500/30 text-rose-300 text-xs font-semibold"
            >
              Выйти из аккаунта
            </button>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 pb-safe z-30">
        <div className="max-w-lg mx-auto grid grid-cols-3">
          <button
            onClick={() => setTab('scan')}
            className={`py-3 flex flex-col items-center gap-1 text-[11px] font-medium ${
              tab === 'scan' ? 'text-blue-400' : 'text-slate-500'
            }`}
          >
            <ScanLine className="w-5 h-5" />
            <span>Отметиться</span>
          </button>
          <button
            onClick={() => setTab('stats')}
            className={`py-3 flex flex-col items-center gap-1 text-[11px] font-medium ${
              tab === 'stats' ? 'text-blue-400' : 'text-slate-500'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            <span>Посещаемость</span>
          </button>
          <button
            onClick={() => setTab('profile')}
            className={`py-3 flex flex-col items-center gap-1 text-[11px] font-medium ${
              tab === 'profile' ? 'text-blue-400' : 'text-slate-500'
            }`}
          >
            <User className="w-5 h-5" />
            <span>Профиль</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
