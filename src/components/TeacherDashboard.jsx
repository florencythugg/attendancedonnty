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
  X
} from 'lucide-react';
import { dbService } from '../services/db';
import {
  ROTATION_SECONDS,
  generateDynamicToken,
  getSecondsRemaining,
  getTimeStep
} from '../utils/crypto';
import { exportLessonToExcel, exportSemesterSummaryToExcel } from '../utils/exportExcel';

export default function TeacherDashboard({ user, data, onLogout }) {
  const [tab, setTab] = useState('active');
  const [subject, setSubject] = useState('Проектирование информационных систем');
  const [group, setGroup] = useState('КСЦ-23');
  const [room, setRoom] = useState('Ауд. 8.204');
  const [lateMinutes, setLateMinutes] = useState(10);
  const [creating, setCreating] = useState(false);

  const [qrDataUrl, setQrDataUrl] = useState('');
  const [currentPin, setCurrentPin] = useState('------');
  const [secondsLeft, setSecondsLeft] = useState(ROTATION_SECONDS);
  const [fullscreenQr, setFullscreenQr] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHistoryLesson, setSelectedHistoryLesson] = useState(null);
  const [analyticsGroup, setAnalyticsGroup] = useState('ALL');

  // Состояние модального окна загрузки списка группы
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importGroup, setImportGroup] = useState('КСЦ-23');
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

  const allGroups = useMemo(() => {
    const set = new Set(['КСЦ-23', 'КИ-23а', 'КИ-23б']);
    students.forEach((s) => s.group && set.add(s.group));
    data.lessons.forEach((l) => l.group && set.add(l.group));
    return Array.from(set);
  }, [students, data.lessons]);

  const myLessons = useMemo(
    () => data.lessons.filter((l) => l.teacherId === user.id),
    [data.lessons, user.id]
  );

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
        const url = await QRCode.toDataURL(tok.payload, {
          width: 320,
          margin: 2,
          color: { dark: '#0f172a', light: '#ffffff' }
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

  const handleStartLesson = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !group.trim()) return;
    setCreating(true);
    try {
      await dbService.createLesson({
        teacher: user,
        subject,
        group,
        room,
        lateMinutes
      });
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
          <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-xl p-3 text-center">
            <div className="text-xl font-bold text-emerald-400">{presentCount}</div>
            <div className="text-[11px] text-emerald-200/80">Вовремя</div>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl p-3 text-center">
            <div className="text-xl font-bold text-amber-400">{lateCount}</div>
            <div className="text-[11px] text-amber-200/80">Опоздали</div>
          </div>
          <div className="bg-rose-500/10 border border-rose-500/25 rounded-xl p-3 text-center">
            <div className="text-xl font-bold text-rose-400">{absentCount}</div>
            <div className="text-[11px] text-rose-200/80">Нет на паре</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск студента..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>
          <button
            onClick={() => exportLessonToExcel(lesson, groupStudents, lessonRecords)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Excel</span>
          </button>
        </div>

        <p className="text-[11px] text-slate-500">
          Нажмите на студента, чтобы вручную переключить статус (Присутствует → Опоздал → Уваж. → Отсутствует)
        </p>

        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="text-center py-8 px-4 text-xs text-slate-400 bg-slate-900/50 rounded-xl border border-slate-800 space-y-2.5">
              <div>В группе {lesson.group} пока нет списка студентов</div>
              <button
                type="button"
                onClick={() => {
                  setImportGroup(lesson.group);
                  setImportResult(null);
                  setImportModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white font-semibold"
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
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition text-left"
                >
                  <div>
                    <div className="text-sm font-medium text-white flex items-center gap-2">
                      <span>{st.fullName}</span>
                      {st.isPreloaded && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
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
                      {rec?.method === 'MANUAL' && <span className="text-blue-400">• Вручную</span>}
                    </div>
                  </div>
                  <div>
                    {status === 'PRESENT' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Был
                      </span>
                    )}
                    {status === 'LATE' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                        <Clock className="w-3.5 h-3.5" /> Опоздал
                      </span>
                    )}
                    {status === 'EXCUSED' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30">
                        Уваж.
                      </span>
                    )}
                    {status === 'ABSENT' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
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
      <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <button
          onClick={() => setFullscreenQr(false)}
          className="absolute top-5 right-5 p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-300"
        >
          <Minimize2 className="w-5 h-5" />
        </button>
        <div className="text-sm font-medium text-blue-400 mb-1">
          {activeLesson.group} • {activeLesson.room}
        </div>
        <h2 className="text-2xl font-bold text-white mb-6">{activeLesson.subject}</h2>
        <div className="bg-white p-5 rounded-3xl shadow-2xl">
          {qrDataUrl && <img src={qrDataUrl} alt="Dynamic QR" className="w-72 h-72 sm:w-80 sm:h-80" />}
        </div>
        <div className="mt-6 flex items-center gap-4">
          <div className="px-5 py-2.5 rounded-2xl bg-slate-900 border border-slate-800">
            <div className="text-[11px] text-slate-400">Резервный PIN-код</div>
            <div className="text-3xl font-mono font-bold tracking-widest text-white">{currentPin}</div>
          </div>
          <div className="px-5 py-2.5 rounded-2xl bg-slate-900 border border-slate-800">
            <div className="text-[11px] text-slate-400">Ротация HMAC</div>
            <div className="text-3xl font-mono font-bold text-blue-400">{secondsLeft}с</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 pb-24 max-w-lg mx-auto">
      <header className="sticky top-0 z-20 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-3.5 flex items-center justify-between">
        <div>
          <div className="text-xs text-blue-400 font-semibold flex items-center gap-1">
            <Shield className="w-3.5 h-3.5" /> Преподаватель
          </div>
          <div className="text-sm font-bold text-white">{user.fullName}</div>
        </div>
        <button
          onClick={onLogout}
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
          title="Выйти"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </header>

      <main className="p-4 space-y-5">
        {tab === 'active' && (
          <>
            {!activeLesson ? (
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">Начать новую пару</h2>
                    <p className="text-xs text-slate-400">Генерация защищённого динамического QR-кода</p>
                  </div>
                </div>

                <form onSubmit={handleStartLesson} className="space-y-3.5">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Дисциплина</label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Группа</label>
                      <input
                        type="text"
                        value={group}
                        onChange={(e) => setGroup(e.target.value)}
                        required
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Аудитория</label>
                      <input
                        type="text"
                        value={room}
                        onChange={(e) => setRoom(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {allGroups.map((g) => (
                      <button
                        type="button"
                        key={g}
                        onClick={() => setGroup(g)}
                        className={`text-xs px-2.5 py-1 rounded-lg border ${
                          group === g
                            ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                            : 'bg-slate-950 border-slate-800 text-slate-400'
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Допуск на опоздание (минут)
                    </label>
                    <select
                      value={lateMinutes}
                      onChange={(e) => setLateMinutes(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value={5}>5 минут</option>
                      <option value={10}>10 минут</option>
                      <option value={15}>15 минут</option>
                      <option value={30}>30 минут</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={creating}
                    className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-semibold text-white flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Запустить пару и открыть QR</span>
                  </button>
                </form>
              </div>
            ) : (
              <>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/25">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Идёт перекличка • {activeLesson.group}
                      </span>
                      <h2 className="text-base font-bold text-white mt-1.5">{activeLesson.subject}</h2>
                      <div className="text-xs text-slate-400">{activeLesson.room}</div>
                    </div>
                    <button
                      onClick={() => setFullscreenQr(true)}
                      className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
                      title="На весь экран (для проектора)"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex flex-col items-center my-3">
                    <div className="bg-white p-3.5 rounded-2xl shadow-lg">
                      {qrDataUrl && <img src={qrDataUrl} alt="QR Code" className="w-52 h-52" />}
                    </div>

                    <div className="w-full max-w-[230px] mt-3">
                      <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                        <span>HMAC-SHA256 ротация</span>
                        <span className="font-mono text-blue-400 font-semibold">{secondsLeft} сек</span>
                      </div>
                      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 transition-all duration-500"
                          style={{ width: `${(secondsLeft / ROTATION_SECONDS) * 100}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-3 px-4 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-center">
                      <span className="text-[11px] text-slate-400 mr-2">Код для ручного ввода:</span>
                      <span className="font-mono text-lg font-bold tracking-widest text-white">
                        {currentPin}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={handleFinishLesson}
                    className="w-full mt-2 py-2.5 rounded-xl bg-rose-600/15 hover:bg-rose-600/25 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center justify-center gap-2 transition"
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
                  className="text-xs text-blue-400 font-medium mb-3 inline-block"
                >
                  ← Вернуться ко всем парам
                </button>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4">
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
                  <div className="text-center py-10 text-xs text-slate-500 bg-slate-900/50 rounded-2xl border border-slate-800">
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
                          className="w-full text-left p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="text-sm font-semibold text-white">{les.subject}</div>
                              <div className="text-xs text-slate-400 mt-0.5">
                                {les.group} • {new Date(les.startedAt).toLocaleDateString('ru-RU')}
                              </div>
                            </div>
                            <span className="px-2.5 py-1 rounded-lg bg-blue-500/15 text-blue-300 text-xs font-bold">
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
                    setImportGroup(analyticsGroup === 'ALL' ? 'КСЦ-23' : analyticsGroup);
                    setImportResult(null);
                    setImportModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Загрузить список</span>
                </button>
                <button
                  onClick={() =>
                    exportSemesterSummaryToExcel(myLessons, students, data.records, analyticsGroup)
                  }
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>XLSX</span>
                </button>
              </div>
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-1">
              <button
                onClick={() => setAnalyticsGroup('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border whitespace-nowrap ${
                  analyticsGroup === 'ALL'
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
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
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border whitespace-nowrap ${
                      analyticsGroup === g
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    {g} ({cnt})
                  </button>
                );
              })}
            </div>

            <div className="space-y-2.5">
              {students.filter((s) => analyticsGroup === 'ALL' || s.group === analyticsGroup).length === 0 ? (
                <div className="text-center py-10 px-4 text-xs text-slate-400 bg-slate-900/60 rounded-2xl border border-slate-800">
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
                      <div
                        key={st.id}
                        className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800"
                      >
                        <div className="flex justify-between items-center mb-1.5">
                          <div>
                            <div className="text-sm font-semibold text-white flex items-center gap-2">
                              <span>{st.fullName}</span>
                              {st.isPreloaded ? (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                                  не рег.
                                </span>
                              ) : (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400">
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
                              className={`text-sm font-bold ${
                                pct >= 75 ? 'text-emerald-400' : pct >= 50 ? 'text-amber-400' : 'text-rose-400'
                              }`}
                            >
                              {pct}%
                            </span>
                            {st.isPreloaded && (
                              <button
                                onClick={() => dbService.removePreloadedStudent(st.id)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800"
                                title="Удалить из списка"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              pct >= 75 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-rose-500'
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

      {/* Модальное окно массовой загрузки списка группы */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Загрузка списка группы</h3>
                <p className="text-xs text-slate-400">Вставьте ФИО студентов из Excel или Word (каждое с новой строки)</p>
              </div>
              <button
                onClick={() => setImportModalOpen(false)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleBulkImport} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Название группы</label>
                <input
                  type="text"
                  value={importGroup}
                  onChange={(e) => setImportGroup(e.target.value)}
                  placeholder="Например: КСЦ-23"
                  required
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Список ФИО (по одному на строку)</label>
                <textarea
                  rows={7}
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder={"Косяк Даниил Дмитриевич\nАвраменко Илья Сергеевич\nБелова Анна Викторовна"}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500 leading-relaxed"
                />
              </div>

              {importResult && (
                <div
                  className={`p-3 rounded-xl text-xs border ${
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
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300"
                >
                  Закрыть
                </button>
                <button
                  type="submit"
                  disabled={importing}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white"
                >
                  {importing ? 'Сохранение...' : 'Добавить в группу'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 pb-safe z-30">
        <div className="max-w-lg mx-auto grid grid-cols-3">
          <button
            onClick={() => setTab('active')}
            className={`py-3 flex flex-col items-center gap-1 text-[11px] font-medium ${
              tab === 'active' ? 'text-blue-400' : 'text-slate-500'
            }`}
          >
            <QrCode className="w-5 h-5" />
            <span>Пара / QR</span>
          </button>
          <button
            onClick={() => setTab('history')}
            className={`py-3 flex flex-col items-center gap-1 text-[11px] font-medium ${
              tab === 'history' ? 'text-blue-400' : 'text-slate-500'
            }`}
          >
            <History className="w-5 h-5" />
            <span>Архив</span>
          </button>
          <button
            onClick={() => setTab('analytics')}
            className={`py-3 flex flex-col items-center gap-1 text-[11px] font-medium ${
              tab === 'analytics' ? 'text-blue-400' : 'text-slate-500'
            }`}
          >
            <Users className="w-5 h-5" />
            <span>Группы</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
