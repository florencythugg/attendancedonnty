import * as XLSX from 'xlsx';

const STATUS_LABELS = {
  PRESENT: 'Присутствует',
  LATE: 'Опоздал',
  EXCUSED: 'Уваж. причина',
  ABSENT: 'Отсутствует'
};

export function exportLessonToExcel(lesson, groupStudents, records) {
  const recordMap = new Map(records.map((r) => [r.studentId, r]));

  const rows = groupStudents.map((st, idx) => {
    const rec = recordMap.get(st.id);
    const status = rec ? STATUS_LABELS[rec.status] || rec.status : 'Отсутствует';
    const time = rec?.markedAt
      ? new Date(rec.markedAt).toLocaleTimeString('ru-RU')
      : '—';
    const method = rec?.method === 'MANUAL' ? 'Вручную (преп.)' : rec ? 'QR / HMAC' : '—';
    return {
      '№': idx + 1,
      'ФИО студента': st.fullName,
      'Группа': st.group,
      'Статус': status,
      'Время отметки': time,
      'Способ': method,
      'ID устройства': rec?.deviceId || '—'
    };
  });

  records.forEach((rec) => {
    if (!groupStudents.some((s) => s.id === rec.studentId)) {
      rows.push({
        '№': rows.length + 1,
        'ФИО студента': rec.studentName,
        'Группа': rec.studentGroup,
        'Статус': STATUS_LABELS[rec.status] || rec.status,
        'Время отметки': rec.markedAt ? new Date(rec.markedAt).toLocaleTimeString('ru-RU') : '—',
        'Способ': rec.method === 'MANUAL' ? 'Вручную (преп.)' : 'QR / HMAC',
        'ID устройства': rec.deviceId || '—'
      });
    }
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [
    { wch: 5 },
    { wch: 30 },
    { wch: 12 },
    { wch: 16 },
    { wch: 15 },
    { wch: 16 },
    { wch: 20 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Ведомость пары');

  const dateStr = new Date(lesson.startedAt).toISOString().slice(0, 10);
  const safeSubject = lesson.subject.replace(/[^a-zA-Zа-яА-Я0-9]/g, '_').slice(0, 20);
  XLSX.writeFile(wb, `Attendance_${lesson.group}_${safeSubject}_${dateStr}.xlsx`);
}

export function exportSemesterSummaryToExcel(lessons, students, allRecords, groupFilter) {
  const filteredLessons = groupFilter === 'ALL'
    ? lessons
    : lessons.filter((l) => l.group === groupFilter);

  const filteredStudents = groupFilter === 'ALL'
    ? students
    : students.filter((s) => s.group === groupFilter);

  const rows = filteredStudents.map((st, idx) => {
    const studentLessons = filteredLessons.filter((l) => l.group === st.group);
    const total = studentLessons.length;
    let present = 0;
    let late = 0;

    studentLessons.forEach((l) => {
      const rec = allRecords.find((r) => r.lessonId === l.id && r.studentId === st.id);
      if (rec?.status === 'PRESENT') present++;
      else if (rec?.status === 'LATE') late++;
    });

    const attended = present + late;
    const absent = Math.max(0, total - attended);
    const pct = total > 0 ? Math.round((attended / total) * 100) : 0;

    return {
      '№': idx + 1,
      'ФИО студента': st.fullName,
      'Группа': st.group,
      'Всего пар': total,
      'Вовремя': present,
      'Опоздания': late,
      'Пропуски': absent,
      'Посещаемость (%)': `${pct}%`
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [
    { wch: 5 },
    { wch: 30 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 18 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Сводка посещаемости');
  XLSX.writeFile(wb, `Attendance_Summary_${groupFilter}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
