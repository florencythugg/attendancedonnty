import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
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

export const dbService = {
  isCloud: isFirebaseConfigured,

  async registerUser({ role, fullName, group, department, login, password }) {
    const cleanLogin = login.trim().toLowerCase();
    const id = `${role[0]}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const userObj = {
      id,
      role,
      fullName: fullName.trim(),
      group: role === 'student' ? group.trim().toUpperCase() : '',
      department: role === 'teacher' ? (department?.trim() || 'Кафедра КИ') : '',
      login: cleanLogin,
      password,
      createdAt: Date.now()
    };

    if (firestore) {
      const q = query(collection(firestore, 'users'), where('login', '==', cleanLogin));
      const snap = await getDocs(q);
      if (!snap.empty) {
        throw new Error('Пользователь с таким логином уже зарегистрирован');
      }
      await setDoc(doc(firestore, 'users', id), userObj);
      return userObj;
    } else {
      const users = readLocal(LS_KEYS.users);
      if (users.some((u) => u.login === cleanLogin)) {
        throw new Error('Пользователь с таким логином уже зарегистрирован');
      }
      users.push(userObj);
      writeLocal(LS_KEYS.users, users);
      return userObj;
    }
  },

  async loginUser(login, password) {
    const cleanLogin = login.trim().toLowerCase();
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
