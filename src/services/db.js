import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  query,
  where,
  onSnapshot
} from 'firebase/firestore';
import { firebaseConfig, isFirebaseConfigured } from '../firebaseConfig';
import { generateRandomSecret } from '../utils/crypto';

let firestore = null;
if (isFirebaseConfigured) {
  const app = initializeApp(firebaseConfig);
  firestore = getFirestore(app);
}

const LS_KEYS = {
  users: 'ap_v2_users',
  lessons: 'ap_v2_lessons',
  records: 'ap_v2_records'
};

const listeners = new Set();
function notifyLocalListeners() {
  listeners.forEach((cb) => cb());
}

function readLocal(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch {
    return [];
  }
}

function writeLocal(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
  notifyLocalListeners();
}

function normalizeName(name) {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

export const dbService = {
  isCloud: isFirebaseConfigured,

  async registerUser({ role, fullName, group, department, login, password }) {
    const cleanLogin = login.trim().toLowerCase();
    const cleanName = fullName.trim().replace(/\s+/g, ' ');
    const cleanGroup = role === 'student' ? group.trim().toUpperCase() : '';

    if (firestore) {
      const q = query(collection(firestore, 'users'), where('login', '==', cleanLogin));
      const snap = await getDocs(q);
      if (!snap.empty) {
        throw new Error('Пользователь с таким логином уже зарегистрирован');
      }

      // Проверяем, не загрузил ли преподаватель этого студента заранее в ведомость
      let targetId = `${role[0]}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      if (role === 'student') {
        const groupQ = query(
          collection(firestore, 'users'),
          where('role', '==', 'student'),
          where('group', '==', cleanGroup)
        );
        const groupSnap = await getDocs(groupQ);
        const preloaded = groupSnap.docs
          .map((d) => d.data())
          .find((u) => u.isPreloaded && normalizeName(u.fullName) === normalizeName(cleanName));
        if (preloaded) {
          targetId = preloaded.id;
        }
      }

      const userObj = {
        id: targetId,
        role,
        fullName: cleanName,
        group: cleanGroup,
        department: role === 'teacher' ? (department?.trim() || 'Кафедра КИ') : '',
        login: cleanLogin,
        password,
        isPreloaded: false,
        createdAt: Date.now()
      };

      await setDoc(doc(firestore, 'users', targetId), userObj);
      return userObj;
    } else {
      const users = readLocal(LS_KEYS.users);
      if (users.some((u) => u.login === cleanLogin)) {
        throw new Error('Пользователь с таким логином уже зарегистрирован');
      }

      const preloadedIdx = role === 'student'
        ? users.findIndex(
            (u) =>
              u.role === 'student' &&
              u.isPreloaded &&
              u.group === cleanGroup &&
              normalizeName(u.fullName) === normalizeName(cleanName)
          )
        : -1;

      const targetId =
        preloadedIdx >= 0
          ? users[preloadedIdx].id
          : `${role[0]}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

      const userObj = {
        id: targetId,
        role,
        fullName: cleanName,
        group: cleanGroup,
        department: role === 'teacher' ? (department?.trim() || 'Кафедра КИ') : '',
        login: cleanLogin,
        password,
        isPreloaded: false,
        createdAt: Date.now()
      };

      if (preloadedIdx >= 0) users[preloadedIdx] = userObj;
      else users.push(userObj);
      writeLocal(LS_KEYS.users, users);
      return userObj;
    }
  },

  async bulkImportStudents(groupName, rawText) {
    const cleanGroup = groupName.trim().toUpperCase();
    if (!cleanGroup) throw new Error('Укажите название группы');

    const lines = rawText
      .split(/\r?\n/)
      .map((line) => line.replace(/^\d+[\.\)\-\s]+/, '').trim().replace(/\s+/g, ' '))
      .filter((line) => line.length >= 3);

    if (lines.length === 0) {
      throw new Error('Список пуст. Введите хотя бы одно ФИО.');
    }

    const uniqueNames = Array.from(new Set(lines));
    let addedCount = 0;

    if (firestore) {
      const q = query(
        collection(firestore, 'users'),
        where('role', '==', 'student'),
        where('group', '==', cleanGroup)
      );
      const snap = await getDocs(q);
      const existingNormalized = new Set(
        snap.docs.map((d) => normalizeName(d.data().fullName))
      );

      for (const name of uniqueNames) {
        if (existingNormalized.has(normalizeName(name))) continue;
        const id = `s_pre_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        await setDoc(doc(firestore, 'users', id), {
          id,
          role: 'student',
          fullName: name,
          group: cleanGroup,
          department: '',
          login: '',
          password: '',
          isPreloaded: true,
          createdAt: Date.now()
        });
        existingNormalized.add(normalizeName(name));
        addedCount++;
      }
    } else {
      const users = readLocal(LS_KEYS.users);
      const existingNormalized = new Set(
        users
          .filter((u) => u.role === 'student' && u.group === cleanGroup)
          .map((u) => normalizeName(u.fullName))
      );

      for (const name of uniqueNames) {
        if (existingNormalized.has(normalizeName(name))) continue;
        users.push({
          id: `s_pre_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          role: 'student',
          fullName: name,
          group: cleanGroup,
          department: '',
          login: '',
          password: '',
          isPreloaded: true,
          createdAt: Date.now()
        });
        existingNormalized.add(normalizeName(name));
        addedCount++;
      }
      writeLocal(LS_KEYS.users, users);
    }

    return { added: addedCount, skipped: uniqueNames.length - addedCount };
  },

  async removePreloadedStudent(studentId) {
    if (firestore) {
      await deleteDoc(doc(firestore, 'users', studentId));
    } else {
      const users = readLocal(LS_KEYS.users).filter((u) => u.id !== studentId);
      writeLocal(LS_KEYS.users, users);
    }
  },

  async loginUser(login, password) {
    const cleanLogin = login.trim().toLowerCase();
    if (!cleanLogin) throw new Error('Введите логин');
    if (firestore) {
      const q = query(collection(firestore, 'users'), where('login', '==', cleanLogin));
      const snap = await getDocs(q);
      if (snap.empty) throw new Error('Пользователь не найден');
      const user = snap.docs[0].data();
      if (user.password !== password) throw new Error('Неверный пароль');
      return user;
    } else {
      const users = readLocal(LS_KEYS.users);
      const user = users.find((u) => u.login === cleanLogin);
      if (!user) throw new Error('Пользователь не найден');
      if (user.password !== password) throw new Error('Неверный пароль');
      return user;
    }
  },

  async createLesson({ teacher, subject, group, room, lateMinutes }) {
    const id = 'les_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
    const lesson = {
      id,
      teacherId: teacher.id,
      teacherName: teacher.fullName,
      subject: subject.trim(),
      group: group.trim().toUpperCase(),
      room: room.trim() || 'Ауд. не указана',
      lateMinutes: Number(lateMinutes) || 10,
      secret: generateRandomSecret(),
      isActive: true,
      startedAt: Date.now(),
      endedAt: null
    };

    if (firestore) {
      await setDoc(doc(firestore, 'lessons', id), lesson);
    } else {
      const lessons = readLocal(LS_KEYS.lessons);
      lessons.unshift(lesson);
      writeLocal(LS_KEYS.lessons, lessons);
    }
    return lesson;
  },

  async finishLesson(lessonId) {
    const endedAt = Date.now();
    if (firestore) {
      await updateDoc(doc(firestore, 'lessons', lessonId), {
        isActive: false,
        endedAt
      });
    } else {
      const lessons = readLocal(LS_KEYS.lessons).map((l) =>
        l.id === lessonId ? { ...l, isActive: false, endedAt } : l
      );
      writeLocal(LS_KEYS.lessons, lessons);
    }
  },

  async getLessonById(lessonId) {
    if (firestore) {
      const snap = await getDoc(doc(firestore, 'lessons', lessonId));
      return snap.exists() ? snap.data() : null;
    } else {
      return readLocal(LS_KEYS.lessons).find((l) => l.id === lessonId) || null;
    }
  },

  async markAttendance({ lesson, student, deviceId, method = 'QR', forcedStatus = null }) {
    const recordId = `${lesson.id}__${student.id}`;
    const now = Date.now();
    const minutesPassed = (now - lesson.startedAt) / 60000;
    const status = forcedStatus || (minutesPassed > (lesson.lateMinutes || 10) ? 'LATE' : 'PRESENT');

    const record = {
      id: recordId,
      lessonId: lesson.id,
      studentId: student.id,
      studentName: student.fullName,
      studentGroup: student.group,
      status,
      markedAt: now,
      deviceId: method === 'MANUAL' ? 'TEACHER_MANUAL' : deviceId,
      method
    };

    if (firestore) {
      if (method !== 'MANUAL') {
        const q = query(
          collection(firestore, 'records'),
          where('lessonId', '==', lesson.id),
          where('deviceId', '==', deviceId)
        );
        const snap = await getDocs(q);
        const otherStudent = snap.docs.find((d) => d.data().studentId !== student.id);
        if (otherStudent) {
          throw new Error('С этого устройства уже отметился другой студент на данной паре (защита от спуфинга)');
        }
      }
      await setDoc(doc(firestore, 'records', recordId), record);
      return record;
    } else {
      const records = readLocal(LS_KEYS.records);
      if (method !== 'MANUAL') {
        const conflict = records.find(
          (r) => r.lessonId === lesson.id && r.deviceId === deviceId && r.studentId !== student.id
        );
        if (conflict) {
          throw new Error('С этого устройства уже отметился другой студент на данной паре (защита от спуфинга)');
        }
      }
      const idx = records.findIndex((r) => r.id === recordId);
      if (idx >= 0) records[idx] = record;
      else records.push(record);
      writeLocal(LS_KEYS.records, records);
      return record;
    }
  },

  async removeAttendance(lessonId, studentId) {
    const recordId = `${lessonId}__${studentId}`;
    if (firestore) {
      await setDoc(doc(firestore, 'records', recordId), {
        id: recordId,
        lessonId,
        studentId,
        status: 'ABSENT',
        markedAt: null,
        method: 'MANUAL'
      });
    } else {
      const records = readLocal(LS_KEYS.records).filter((r) => r.id !== recordId);
      writeLocal(LS_KEYS.records, records);
    }
  },

  subscribeAll(callback) {
    if (firestore) {
      let state = { users: [], lessons: [], records: [] };
      const emit = () => callback({ ...state });

      const unsubUsers = onSnapshot(collection(firestore, 'users'), (snap) => {
        state.users = snap.docs.map((d) => d.data());
        emit();
      });
      const unsubLessons = onSnapshot(collection(firestore, 'lessons'), (snap) => {
        state.lessons = snap.docs
          .map((d) => d.data())
          .sort((a, b) => b.startedAt - a.startedAt);
        emit();
      });
      const unsubRecords = onSnapshot(collection(firestore, 'records'), (snap) => {
        state.records = snap.docs
          .map((d) => d.data())
          .filter((r) => r.status !== 'ABSENT');
        emit();
      });

      return () => {
        unsubUsers();
        unsubLessons();
        unsubRecords();
      };
    } else {
      const emitLocal = () => {
        callback({
          users: readLocal(LS_KEYS.users),
          lessons: readLocal(LS_KEYS.lessons).sort((a, b) => b.startedAt - a.startedAt),
          records: readLocal(LS_KEYS.records)
        });
      };
      emitLocal();
      listeners.add(emitLocal);
      const storageHandler = () => emitLocal();
      window.addEventListener('storage', storageHandler);
      return () => {
        listeners.delete(emitLocal);
        window.removeEventListener('storage', storageHandler);
      };
    }
  }
};
