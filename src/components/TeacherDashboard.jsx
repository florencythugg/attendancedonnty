import React, { useState, useEffect, useMemo } from 'react';
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
  BookmarkCheck
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

export default function TeacherDashboard({ user, data, onLogout }) {
  const [tab, setTab] = useState('active');
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

  // Умные авто-шаблоны пар преподавателя (ввёл один раз — сохранилось навсегда)
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

  useEffect(() => {
    if (!activeLesson) return;
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
          color: { dark: '#090d1a', light: '#ffffff' }
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
      if (useGeoFence) {
        const pos = await getCurrentPositionAsync();
        geo = { lat: pos.lat, lng: pos.lng, radiusMeters: geoRadius };
      }
      await dbService.createLesson({
        teacher: user,
        subject,
        group,
        room,
        lateMinutes,
        geo
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
        <div className="grid grid-cols-3 gap-2.5">
          <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-2xl p-3 text-center backdrop-blur-md">
            <div className="text-2xl font-extrabold text-emerald-400">{presentCount}</div>
            <div className="text-[11px] font-medium text-emerald-200/80">Вовремя</div>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-3 text-center backdrop-blur-md">
            <div className="text-2xl font-extrabold text-amber-400">{lateCount}</div>
            <div className="text-[11px] font-medium text-amber-200/80">Опоздали</div>
          </div>
          <div className="bg-rose-500/10 border border-rose-500/25 rounded-2xl p-3 text-center backdrop-blur-md">
            <div className="text-2xl font-extrabold text-rose-400">{absentCount}</div>
            <div className="text-[11px] font-medium text-rose-200/80">Нет на паре</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск студента..."
              className="w-full pl-10 pr-3 py-2.5 rounded-2xl bg-slate-900/80 border border-white/10 text-xs text-white focus:outline-none focus:border-blue-500 transition"
            />
          </div>
          <button
            onClick={() => exportLessonToExcel(lesson, groupStudents, lessonRecords)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 active:scale-95 text-xs font-bold text-white shadow-lg shadow-emerald-600/20 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Excel</span>
          </button>
        </div>

        <p className="text-[11px] text-slate-500">
          Нажмите на карточку студента для ручной смены статуса
        </p>

        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="text-center py-8 px-4 text-xs text-slate-400 glass-card rounded-2xl space-y-3">
              <div>В группе {lesson.group} пока нет списка студентов</div>
              <button
                type="button"
                onClick={() => {
                  setImportGroup(lesson.group);
                  setImportResult(null);
                  setImportModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white font-bold shadow-lg shadow-blue-600/30"
              >
                <UserPlus className="w-3.5 h-3.5" /> Загрузить список {lesson.group}
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
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl glass-card hover:border-white/20 active:scale-[0.99] transition-all text-left"
                >
                  <div>
                    <div className="text-sm font-semibold text-white flex items-center gap-2">
                      <span>{st.fullName}</span>
                      {st.isPreloaded && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/5 text-slate-400 border border-white/10">
                          по списку
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                      <span>{st.group}</span>
                      {rec?.markedAt && (
                        <span>
                          • {new Date(rec.markedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      )}
                      {typeof rec?.distanceMeters === 'number' && (
                        <span className="text-emerald-400 font-medium">• {rec.distanceMeters} м</span>
                      )}
                      {rec?.method === 'MANUAL' && <span className="text-blue-400">• Вручную</span>}
                    </div>
                  </div>
                  <div>
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
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
                        Уваж.
                      </span>
                    )}
                    {status === 'ABSENT' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-white/5 text-slate-400 border border-white/10">
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

  if (fullscreenQr && activeLesson) {
    return (
      <div className="fixed inset-0 z-50 bg-[#030712] flex flex-col items-center justify-center p-6 text-center">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="animate-orb absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-blue-600/20 blur-[120px]" />
          <div className="animate-orb-delayed bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-indigo-600/20 blur-[120px]" />
        </div>
        <button
          onClick={() => setFullscreenQr(false)}
          className="absolute top-5 right-5 p-3 rounded-2xl glass-card text-slate-300 hover:text-white z-10"
        >
          <Minimize2 className="w-5 h-5" />
        </button>
        <div className="relative z-10">
          <div className="text-sm font-bold text-cyan-400 mb-1">
            {activeLesson.group} • {activeLesson.room}
          </div>
          <h2 className="text-2xl font-extrabold text-white mb-6">{activeLesson.subject}</h2>
          <div
            className={`inline-block bg-white p-6 rounded-[2rem] shadow-[0_0_60px_rgba(59,130,246,0.35)] transition-transform duration-300 ${
              qrPulse ? 'scale-105' : 'scale-100'
            }`}
          >
            {qrDataUrl && <img src={qrDataUrl} alt="Dynamic QR" className="w-72 h-72 sm:w-80 sm:h-80" />}
          </div>
          <div className="mt-7 flex items-center justify-center gap-4">
            <div className="px-6 py-3 rounded-2xl glass-card">
              <div className="text-[11px] text-slate-400 uppercase tracking-wider">Резервный PIN</div>
              <div className="text-3xl font-mono font-extrabold tracking-widest text-white mt-0.5">
                {currentPin}
              </div>
            </div>
            <div className="px-6 py-3 rounded-2xl glass-card">
              <div className="text-[11px] text-slate-400 uppercase tracking-wider">Ротация HMAC</div>
              <div className="text-3xl font-mono font-extrabold text-cyan-400 mt-0.5">{secondsLeft}с</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[100dvh] bg-[#030712] pb-28 overflow-x-hidden">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="animate-orb -top-20 -right-20 absolute w-72 h-72 rounded-full bg-blue-600/15 blur-[90px]" />
        <div className="animate-orb-delayed bottom-10 -left-20 absolute w-72 h-72 rounded-full bg-indigo-600/15 blur-[90px]" />
      </div>

      <div className="relative z-10 max-w-lg mx-auto">
        <header className="sticky top-0 z-20 bg-[#030712]/80 backdrop-blur-xl border-b border-white/10 px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-600/25">
              {user.fullName[0]}
            </div>
            <div>
              <div className="text-[11px] text-cyan-400 font-bold flex items-center gap-1 uppercase tracking-wider">
                <Shield className="w-3 h-3" /> Pulse • Преподаватель
              </div>
              <div className="text-sm font-bold text-white">{user.fullName}</div>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white active:scale-95 transition"
            title="Выйти"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </header>

        <main key={tab} className="p-4 space-y-5 animate-tab-enter">
          {tab === 'active' && (
            <>
              {!activeLesson ? (
                <div className="space-y-4">
                  {/* Сохраненные шаблоны пар в один тап */}
                  {savedPresets.length > 0 && (
                    <div className="glass-card rounded-3xl p-4">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-cyan-400 uppercase tracking-wider mb-2.5">
                        <BookmarkCheck className="w-3.5 h-3.5" />
                        <span>Мои сохранённые пары (нажмите для подстановки)</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {savedPresets.map((p) => (
                          <button
                            key={p.key}
                            type="button"
                            onClick={() => applyPreset(p)}
                            className="text-left px-3 py-2 rounded-2xl bg-white/5 hover:bg-blue-600/20 border border-white/10 hover:border-blue-500/40 active:scale-95 transition"
                          >
                            <div className="text-xs font-bold text-white">{p.subject}</div>
                            <div className="text-[10px] text-slate-400">
                              {p.group} {p.room ? `• ${p.room}` : ''}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="glass-card rounded-3xl p-5">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="p-2.5 rounded-2xl bg-gradient-to-br from-blue-600/25 to-indigo-600/25 border border-blue-500/30 text-blue-400">
                        <Plus className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-white">Начать новую пару</h2>
                        <p className="text-xs text-slate-400">Предмет и группа сохранятся автоматически</p>
                      </div>
                    </div>

                    <form onSubmit={handleStartLesson} className="space-y-3.5">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1 uppercase tracking-wider">
                          Дисциплина
                        </label>
                        <input
                          type="text"
                          list="pulse-subjects"
                          value={subject}
                          onChange={(e) => setSubject(e.target.value)}
                          placeholder="Введите название предмета (напр. Экономика)"
                          required
                          className="w-full px-4 py-3 rounded-2xl bg-slate-950/70 border border-white/10 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition"
                        />
                        <datalist id="pulse-subjects">
                          {savedSubjects.map((s) => (
                            <option key={s} value={s} />
                          ))}
                        </datalist>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-400 mb-1 uppercase tracking-wider">
                            Группа
                          </label>
                          <input
                            type="text"
                            list="pulse-groups"
                            value={group}
                            onChange={(e) => setGroup(e.target.value.toUpperCase())}
                            placeholder="Напр. КСЦ-23"
                            required
                            className="w-full px-4 py-3 rounded-2xl bg-slate-950/70 border border-white/10 text-sm text-white uppercase placeholder:normal-case placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition"
                          />
                          <datalist id="pulse-groups">
                            {allGroups.map((g) => (
                              <option key={g} value={g} />
                            ))}
                          </datalist>
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-400 mb-1 uppercase tracking-wider">
                            Аудитория
                          </label>
                          <input
                            type="text"
                            value={room}
                            onChange={(e) => setRoom(e.target.value)}
                            placeholder="Напр. Ауд. 8.204"
                            className="w-full px-4 py-3 rounded-2xl bg-slate-950/70 border border-white/10 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition"
                          />
                        </div>
                      </div>

                      {allGroups.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {allGroups.slice(0, 8).map((g) => (
                            <button
                              type="button"
                              key={g}
                              onClick={() => setGroup(g)}
                              className={`text-xs px-3 py-1 rounded-xl border transition ${
                                group === g
                                  ? 'bg-blue-600/25 border-blue-500 text-blue-300 font-semibold'
                                  : 'bg-white/5 border-white/10 text-slate-400'
                              }`}
                            >
                              {g}
                            </button>
                          ))}
                        </div>
                      )}

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1 uppercase tracking-wider">
                          Допуск на опоздание
                        </label>
                        <select
                          value={lateMinutes}
                          onChange={(e) => setLateMinutes(Number(e.target.value))}
                          className="w-full px-4 py-3 rounded-2xl bg-slate-950/70 border border-white/10 text-sm text-white focus:outline-none focus:border-blue-500"
                        >
                          <option value={5}>5 минут</option>
                          <option value={10}>10 минут</option>
                          <option value={15}>15 минут</option>
                          <option value={30}>30 минут</option>
                        </select>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-white/10 space-y-2.5">
                        <label className="flex items-center justify-between cursor-pointer">
                          <span className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                            <MapPin className="w-4 h-4 text-cyan-400" />
                            <span>Контроль геозоны аудитории (GPS)</span>
                          </span>
                          <input
                            type="checkbox"
                            checked={useGeoFence}
                            onChange={(e) => setUseGeoFence(e.target.checked)}
                            className="w-4 h-4 accent-blue-600"
                          />
                        </label>
                        {useGeoFence && (
                          <div className="flex items-center justify-between pt-2.5 border-t border-white/10">
                            <span className="text-[11px] text-slate-400">Допустимый радиус:</span>
                            <select
                              value={geoRadius}
                              onChange={(e) => setGeoRadius(Number(e.target.value))}
                              className="px-2.5 py-1 rounded-xl bg-slate-900 border border-white/10 text-xs text-white"
                            >
                              <option value={50}>50 метров (строго)</option>
                              <option value={100}>100 метров (корпус)</option>
                              <option value={250}>250 метров (кампус)</option>
                            </select>
                          </div>
                        )}
                        {geoError && <div className="text-[11px] text-rose-400">{geoError}</div>}
                      </div>

                      <button
                        type="submit"
                        disabled={creating}
                        className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:brightness-110 active:scale-[0.98] transition-all text-sm font-bold text-white flex items-center justify-center gap-2 shadow-xl shadow-blue-600/25"
                      >
                        <Play className="w-4 h-4 fill-current" />
                        <span>{creating ? 'Определение GPS...' : 'Запустить пару и открыть QR'}</span>
                      </button>
                    </form>
                  </div>
                </div>
              ) : (
                <>
                  <div className="glass-card rounded-3xl p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/25">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                          LIVE • {activeLesson.group}
                          {activeLesson.geo && ` • GPS ≤ ${activeLesson.geo.radiusMeters}м`}
                        </span>
                        <h2 className="text-lg font-extrabold text-white mt-2">{activeLesson.subject}</h2>
                        <div className="text-xs text-slate-400">{activeLesson.room}</div>
                      </div>
                      <button
                        onClick={() => setFullscreenQr(true)}
                        className="p-2.5 rounded-2xl bg-white/5 border border-white/10 text-slate-300 hover:text-white active:scale-95 transition"
                        title="На весь экран (для проектора)"
                      >
                        <Maximize2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex flex-col items-center my-4">
                      <div className="relative p-1 rounded-3xl bg-gradient-to-tr from-blue-500 via-cyan-400 to-indigo-500 shadow-[0_0_40px_rgba(37,99,235,0.3)]">
                        <div
                          className={`bg-white p-3.5 rounded-[1.35rem] transition-transform duration-300 ${
                            qrPulse ? 'scale-[1.03]' : 'scale-100'
                          }`}
                        >
                          {qrDataUrl && <img src={qrDataUrl} alt="QR Code" className="w-52 h-52" />}
                        </div>
                      </div>

                      <div className="w-full max-w-[235px] mt-4">
                        <div className="flex justify-between text-[11px] text-slate-400 mb-1.5">
                          <span className="flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-cyan-400" /> HMAC-SHA256
                          </span>
                          <span className="font-mono text-cyan-400 font-bold">{secondsLeft} сек</span>
                        </div>
                        <div className="h-2 bg-slate-900 rounded-full overflow-hidden p-[1px] border border-white/5">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-500"
                            style={{ width: `${(secondsLeft / ROTATION_SECONDS) * 100}%` }}
                          />
                        </div>
                      </div>

                      <div className="mt-3.5 px-5 py-2 rounded-2xl bg-slate-950/80 border border-white/10 text-center">
                        <span className="text-[11px] text-slate-400 mr-2">Резервный PIN:</span>
                        <span className="font-mono text-lg font-extrabold tracking-widest text-white">
                          {currentPin}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={handleFinishLesson}
                      className="w-full mt-2 py-3 rounded-2xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition"
                    >
                      <Square className="w-3.5 h-3.5 fill-current" />
                      <span>Завершить пару и подвести итоги</span>
                    </button>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-white mb-2.5">Журнал отметки в реальном времени</h3>
                    {renderLessonRoster(activeLesson)}
                  </div>
                </>
              )}
            </>
          )}

          {tab === 'history' && (
            <div className="space-y-4">
              {selectedHistoryLesson ? (
                <div>
                  <button
                    onClick={() => setSelectedHistoryLesson(null)}
                    className="text-xs text-blue-400 font-semibold mb-3 inline-block"
                  >
                    ← Вернуться ко всем парам
                  </button>
                  <div className="glass-card rounded-3xl p-4 mb-4">
                    <div className="text-xs text-slate-400">
                      {new Date(selectedHistoryLesson.startedAt).toLocaleString('ru-RU')} • {selectedHistoryLesson.group}
                    </div>
                    <h2 className="text-base font-bold text-white mt-0.5">{selectedHistoryLesson.subject}</h2>
                  </div>
                  {renderLessonRoster(selectedHistoryLesson)}
                </div>
              ) : (
                <>
                  <h2 className="text-base font-bold text-white">Архив проведённых пар</h2>
                  {myLessons.length === 0 ? (
                    <div className="text-center py-10 text-xs text-slate-500 glass-card rounded-3xl">
                      Вы ещё не провели ни одной пары
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {myLessons.map((les) => {
                        const count = data.records.filter((r) => r.lessonId === les.id).length;
                        const total = students.filter((s) => s.group === les.group).length || count;
                        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                        return (
                          <button
                            key={les.id}
                            onClick={() => setSelectedHistoryLesson(les)}
                            className="w-full text-left p-4 rounded-2xl glass-card hover:border-white/20 active:scale-[0.99] transition"
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="text-sm font-bold text-white">{les.subject}</div>
                                <div className="text-xs text-slate-400 mt-0.5">
                                  {les.group} • {new Date(les.startedAt).toLocaleDateString('ru-RU')}
                                </div>
                              </div>
                              <span className="px-3 py-1 rounded-xl bg-blue-500/15 border border-blue-500/25 text-blue-300 text-xs font-bold">
                                {count}/{total} ({pct}%)
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {tab === 'analytics' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-bold text-white">Группы и списки</h2>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setImportGroup(analyticsGroup === 'ALL' ? '' : analyticsGroup);
                      setImportResult(null);
                      setImportModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-xs font-bold text-white shadow-lg shadow-blue-600/25 active:scale-95 transition"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Загрузить список</span>
                  </button>
                  <button
                    onClick={() =>
                      exportSemesterSummaryToExcel(myLessons, students, data.records, analyticsGroup)
                    }
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white active:scale-95 transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>XLSX</span>
                  </button>
                </div>
              </div>

              <div className="flex gap-1.5 overflow-x-auto pb-1">
                <button
                  onClick={() => setAnalyticsGroup('ALL')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border whitespace-nowrap transition ${
                    analyticsGroup === 'ALL'
                      ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-600/30'
                      : 'bg-white/5 border-white/10 text-slate-400'
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
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border whitespace-nowrap transition ${
                        analyticsGroup === g
                          ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-600/30'
                          : 'bg-white/5 border-white/10 text-slate-400'
                      }`}
                    >
                      {g} ({cnt})
                    </button>
                  );
                })}
              </div>

              <div className="space-y-2.5">
                {students.filter((s) => analyticsGroup === 'ALL' || s.group === analyticsGroup).length === 0 ? (
                  <div className="text-center py-10 px-4 text-xs text-slate-400 glass-card rounded-3xl">
                    Список студентов пуст. Нажмите «Загрузить список», чтобы вставить ФИО из Excel или Word.
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
                        <div key={st.id} className="p-4 rounded-2xl glass-card">
                          <div className="flex justify-between items-center mb-2">
                            <div>
                              <div className="text-sm font-bold text-white flex items-center gap-2">
                                <span>{st.fullName}</span>
                                {st.isPreloaded ? (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/5 text-slate-400">
                                    не рег.
                                  </span>
                                ) : (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400">
                                    аккаунт
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-slate-400">
                                {st.group} • Посещено {attended} из {total} пар
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-sm font-extrabold ${
                                  pct >= 75 ? 'text-emerald-400' : pct >= 50 ? 'text-amber-400' : 'text-rose-400'
                                }`}
                              >
                                {pct}%
                              </span>
                              {st.isPreloaded && (
                                <button
                                  onClick={() => dbService.removePreloadedStudent(st.id)}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-white/5"
                                  title="Удалить из списка"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="h-2 bg-slate-950 rounded-full overflow-hidden p-[1px]">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                pct >= 75
                                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                                  : pct >= 50
                                  ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                                  : 'bg-gradient-to-r from-rose-500 to-pink-500'
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
        </main>

        {importModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-tab-enter">
            <div className="glass-card rounded-3xl p-5 w-full max-w-md space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">Загрузка списка группы</h3>
                  <p className="text-xs text-slate-400">Вставьте ФИО студентов (каждое с новой строки)</p>
                </div>
                <button
                  onClick={() => setImportModalOpen(false)}
                  className="p-2 rounded-xl bg-white/5 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleBulkImport} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1 uppercase">
                    Название группы
                  </label>
                  <input
                    type="text"
                    value={importGroup}
                    onChange={(e) => setImportGroup(e.target.value.toUpperCase())}
                    placeholder="Введите название группы"
                    required
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-950/80 border border-white/10 text-sm text-white uppercase placeholder:normal-case focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1 uppercase">
                    Список ФИО
                  </label>
                  <textarea
                    rows={7}
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    placeholder={"Косяк Даниил Дмитриевич\nАвраменко Илья Сергеевич\nБелова Анна Викторовна"}
                    required
                    className="w-full px-4 py-3 rounded-2xl bg-slate-950/80 border border-white/10 text-xs text-white focus:outline-none focus:border-blue-500 leading-relaxed"
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
                    className="flex-1 py-3 rounded-2xl bg-white/5 text-xs font-bold text-slate-300"
                  >
                    Закрыть
                  </button>
                  <button
                    type="submit"
                    disabled={importing}
                    className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-xs font-bold text-white"
                  >
                    {importing ? 'Сохранение...' : 'Добавить в группу'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <nav className="fixed bottom-0 left-0 right-0 glass-nav pb-safe z-30">
          <div className="max-w-lg mx-auto grid grid-cols-3">
            <button
              onClick={() => setTab('active')}
              className={`py-3 flex flex-col items-center gap-1 text-[11px] font-bold transition ${
                tab === 'active' ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <QrCode className="w-5 h-5" />
              <span>Пара / QR</span>
            </button>
            <button
              onClick={() => setTab('history')}
              className={`py-3 flex flex-col items-center gap-1 text-[11px] font-bold transition ${
                tab === 'history' ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <History className="w-5 h-5" />
              <span>Архив</span>
            </button>
            <button
              onClick={() => setTab('analytics')}
              className={`py-3 flex flex-col items-center gap-1 text-[11px] font-bold transition ${
                tab === 'analytics' ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Users className="w-5 h-5" />
              <span>Группы</span>
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
}
