import { initializeApp } from 'firebase/app';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
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
import { generateRandomSecret, calculateDistanceMeters } from '../utils/crypto';

let firestore = null;
if (isFirebaseConfigured) {
  const app = initializeApp(firebaseConfig);
  firestore = initializeFirestore(app, {
    experimentalForceLongPolling: true,
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  });
}

const LOCAL_KEY = 'ap_v2_local_db';

function readLocal() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { users: [], lessons: [], records: [] };
}

function writeLocal(state) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(state));
  window.dispatchEvent(new Event('ap_local_update'));
}

export const dbService = {
  isCloud: Boolean(firestore),

  subscribeAll(callback) {
    if (firestore) {
      let state = { users: [], lessons: [], records: [] };
      const emit = () => callback({ ...state });

      const unsubUsers = onSnapshot(collection(firestore, 'users'), (snap) => {
        state.users = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        emit();
      });
      const unsubLessons = onSnapshot(collection(firestore, 'lessons'), (snap) => {
        state.lessons = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => b.startedAt - a.startedAt);
        emit();
      });
      const unsubRecords = onSnapshot(collection(firestore, 'records'), (snap) => {
        state.records = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        emit();
      });

      return () => {
        unsubUsers();
        unsubLessons();
        unsubRecords();
      };
    }

    const handler = () => callback(readLocal());
    handler();
    window.addEventListener('ap_local_update', handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('ap_local_update', handler);
      window.removeEventListener('storage', handler);
    };
  },

  async registerUser({ role, fullName, group, department, login, password }) {
    const cleanLogin = login.trim().toLowerCase();
    const cleanName = fullName.trim();
    const cleanGroup = group ? group.trim().toUpperCase() : '';

    if (firestore) {
      const q = query(collection(firestore, 'users'), where('login', '==', cleanLogin));
      const existing = await getDocs(q);
      if (!existing.empty) {
        throw new Error('Этот логин уже занят');
      }

      if (role === 'student') {
        const preQ = query(
          collection(firestore, 'users'),
          where('role', '==', 'student'),
          where('group', '==', cleanGroup)
        );
        const preSnap = await getDocs(preQ);
        const matchedPre = preSnap.docs.find(
          (d) => d.data().isPreloaded && d.data().fullName.toLowerCase() === cleanName.toLowerCase()
        );
        if (matchedPre) {
          const upgraded = {
            ...matchedPre.data(),
            id: matchedPre.id,
            fullName: cleanName,
            login: cleanLogin,
            password,
            isPreloaded: false
          };
          await setDoc(doc(firestore, 'users', matchedPre.id), upgraded);
          return upgraded;
        }
      }

      const id = `u_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const user = {
        id,
        role,
        fullName: cleanName,
        group: cleanGroup,
        department: department ? department.trim() : '',
        login: cleanLogin,
        password,
        isPreloaded: false,
        createdAt: Date.now()
      };
      await setDoc(doc(firestore, 'users', id), user);
      return user;
    }

    const state = readLocal();
    if (state.users.some((u) => u.login === cleanLogin)) {
      throw new Error('Этот логин уже занят');
    }

    if (role === 'student') {
      const preIdx = state.users.findIndex(
        (u) =>
          u.isPreloaded &&
          u.group === cleanGroup &&
          u.fullName.toLowerCase() === cleanName.toLowerCase()
      );
      if (preIdx !== -1) {
        state.users[preIdx] = {
          ...state.users[preIdx],
          fullName: cleanName,
          login: cleanLogin,
          password,
          isPreloaded: false
        };
        writeLocal(state);
        return state.users[preIdx];
      }
    }

    const user = {
      id: `u_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      role,
      fullName: cleanName,
      group: cleanGroup,
      department: department ? department.trim() : '',
      login: cleanLogin,
      password,
      isPreloaded: false,
      createdAt: Date.now()
    };
    state.users.push(user);
    writeLocal(state);
    return user;
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
    }

    const state = readLocal();
    const user = state.users.find((u) => u.login === cleanLogin);
    if (!user) throw new Error('Пользователь не найден');
    if (user.password !== password) throw new Error('Неверный пароль');
    return user;
  },

  async bulkImportStudents(groupName, rawText) {
    const cleanGroup = groupName.trim().toUpperCase();
    if (!cleanGroup) throw new Error('Укажите название группы');

    const names = rawText
      .split(/\r?\n/)
      .map((line) => line.replace(/^\d+[\.\)\-\s]+/, '').trim())
      .filter((line) => line.length >= 3);

    if (names.length === 0) throw new Error('Список пуст. Введите хотя бы одно ФИО.');

    let added = 0;
    let skipped = 0;

    if (firestore) {
      const existingSnap = await getDocs(
        query(collection(firestore, 'users'), where('group', '==', cleanGroup))
      );
      const existingNames = new Set(
        existingSnap.docs.map((d) => d.data().fullName.toLowerCase())
      );

      for (const name of names) {
        if (existingNames.has(name.toLowerCase())) {
          skipped += 1;
          continue;
        }
        const id = `pre_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        await setDoc(doc(firestore, 'users', id), {
          id,
          role: 'student',
          fullName: name,
          group: cleanGroup,
          login: '',
          password: '',
          isPreloaded: true,
          createdAt: Date.now()
        });
        existingNames.add(name.toLowerCase());
        added += 1;
      }
      return { added, skipped };
    }

    const state = readLocal();
    const existingNames = new Set(
      state.users
        .filter((u) => u.group === cleanGroup)
        .map((u) => u.fullName.toLowerCase())
    );

    for (const name of names) {
      if (existingNames.has(name.toLowerCase())) {
        skipped += 1;
        continue;
      }
      state.users.push({
        id: `pre_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        role: 'student',
        fullName: name,
        group: cleanGroup,
        login: '',
        password: '',
        isPreloaded: true,
        createdAt: Date.now()
      });
      existingNames.add(name.toLowerCase());
      added += 1;
    }
    writeLocal(state);
    return { added, skipped };
  },

  async removePreloadedStudent(studentId) {
    if (firestore) {
      await deleteDoc(doc(firestore, 'users', studentId));
      return;
    }
    const state = readLocal();
    state.users = state.users.filter((u) => u.id !== studentId);
    writeLocal(state);
  },

  async createLesson({ teacher, subject, group, room, lateMinutes, geo, mode }) {
    const id = `les_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const lesson = {
      id,
      teacherId: teacher.id,
      teacherName: teacher.fullName,
      subject: subject.trim(),
      group: group.trim().toUpperCase(),
      room: room.trim() || (mode === 'online' ? 'Онлайн-эфир' : 'Ауд. 101'),
      mode: mode || 'offline',
      lateMinutes: Number(lateMinutes) || 10,
      secret: generateRandomSecret(),
      geo: geo || null,
      startedAt: Date.now(),
      isActive: true
    };

    if (firestore) {
      await setDoc(doc(firestore, 'lessons', id), lesson);
      return lesson;
    }

    const state = readLocal();
    state.lessons.unshift(lesson);
    writeLocal(state);
    return lesson;
  },

  async finishLesson(lessonId) {
    if (firestore) {
      await updateDoc(doc(firestore, 'lessons', lessonId), {
        isActive: false,
        endedAt: Date.now()
      });
      return;
    }
    const state = readLocal();
    const les = state.lessons.find((l) => l.id === lessonId);
    if (les) {
      les.isActive = false;
      les.endedAt = Date.now();
      writeLocal(state);
    }
  },

  async getLessonById(lessonId) {
    if (firestore) {
      const snap = await getDoc(doc(firestore, 'lessons', lessonId));
      return snap.exists() ? snap.data() : null;
    }
    const state = readLocal();
    return state.lessons.find((l) => l.id === lessonId) || null;
  },

  async markAttendance({ lesson, student, deviceId, method, forcedStatus, studentGeo }) {
    const recordId = `${lesson.id}_${student.id}`;
    const now = Date.now();
    const diffMinutes = (now - lesson.startedAt) / 60000;
    const autoStatus = diffMinutes <= lesson.lateMinutes ? 'PRESENT' : 'LATE';
    const status = forcedStatus || autoStatus;

    let distanceMeters = null;
    if (!forcedStatus && lesson.geo) {
      if (!studentGeo) {
        throw new Error('Для этой пары включён контроль геопозиции. Разрешите доступ к GPS.');
      }
      distanceMeters = calculateDistanceMeters(
        lesson.geo.lat,
        lesson.geo.lng,
        studentGeo.lat,
        studentGeo.lng
      );
      if (distanceMeters > lesson.geo.radiusMeters) {
        throw new Error(
          `Вы вне аудитории (${distanceMeters} м от преподавателя, допустимо до ${lesson.geo.radiusMeters} м).`
        );
      }
    }

    const record = {
      id: recordId,
      lessonId: lesson.id,
      studentId: student.id,
      studentName: student.fullName,
      studentGroup: student.group,
      status,
      method: method || 'QR',
      deviceId,
      distanceMeters,
      markedAt: now
    };

    if (firestore) {
      if (!forcedStatus) {
        const q = query(collection(firestore, 'records'), where('lessonId', '==', lesson.id));
        const snap = await getDocs(q);
        const dupDevice = snap.docs
          .map((d) => d.data())
          .find((r) => r.deviceId === deviceId && r.studentId !== student.id);
        if (dupDevice) {
          throw new Error(
            `С этого телефона уже отметился студент ${dupDevice.studentName}. Повторная отметка с одного устройства запрещена.`
          );
        }
      }
      await setDoc(doc(firestore, 'records', recordId), record);
      return record;
    }

    const state = readLocal();
    if (!forcedStatus) {
      const dupDevice = state.records.find(
        (r) => r.lessonId === lesson.id && r.deviceId === deviceId && r.studentId !== student.id
      );
      if (dupDevice) {
        throw new Error(
          `С этого телефона уже отметился студент ${dupDevice.studentName}. Повторная отметка с одного устройства запрещена.`
        );
      }
    }

    const idx = state.records.findIndex((r) => r.id === recordId);
    if (idx >= 0) state.records[idx] = record;
    else state.records.push(record);
    writeLocal(state);
    return record;
  },

  async removeAttendance(lessonId, studentId) {
    const recordId = `${lessonId}_${studentId}`;
    if (firestore) {
      await deleteDoc(doc(firestore, 'records', recordId));
      return;
    }
    const state = readLocal();
    state.records = state.records.filter((r) => r.id !== recordId);
    writeLocal(state);
  },

  async markOnlineAttendance({ lesson, student, deviceId }) {
    const recordId = `${lesson.id}_${student.id}`;
    const now = Date.now();
    const diffMinutes = (now - lesson.startedAt) / 60000;
    const status = diffMinutes <= (lesson.lateMinutes || 10) ? 'PRESENT' : 'LATE';

    const record = {
      id: recordId,
      lessonId: lesson.id,
      studentId: student.id,
      studentName: student.fullName,
      studentGroup: student.group,
      status,
      method: 'ONLINE',
      deviceId,
      markedAt: now
    };

    if (firestore) {
      await setDoc(doc(firestore, 'records', recordId), record);
    } else {
      const state = readLocal();
      const idx = state.records.findIndex((r) => r.id === recordId);
      if (idx >= 0) state.records[idx] = record;
      else state.records.push(record);
      writeLocal(state);
    }
    return record;
  },

  subscribeStreamViewers(lessonId, callback) {
    if (!firestore) return () => {};
    const viewersCol = collection(firestore, 'lessons', lessonId, 'viewers');
    return onSnapshot(viewersCol, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      callback(list);
    });
  },

  async setViewerAnswer(lessonId, viewerId, answer) {
    if (!firestore) return;
    await updateDoc(doc(firestore, 'lessons', lessonId, 'viewers', viewerId), {
      answer
    });
  },

  async addBroadcasterIce(lessonId, viewerId, candidate) {
    if (!firestore) return;
    const iceCol = collection(firestore, 'lessons', lessonId, 'viewers', viewerId, 'broadcasterCandidates');
    await setDoc(doc(iceCol), candidate);
  },

  async createViewerOffer(lessonId, studentId, offer) {
    if (!firestore) return;
    await setDoc(doc(firestore, 'lessons', lessonId, 'viewers', studentId), {
      offer,
      answer: null,
      createdAt: Date.now()
    });
  },

  async addViewerIce(lessonId, studentId, candidate) {
    if (!firestore) return;
    const iceCol = collection(firestore, 'lessons', lessonId, 'viewers', studentId, 'viewerCandidates');
    await setDoc(doc(iceCol), candidate);
  },

  subscribeViewerSession(lessonId, studentId, onAnswer, onIceCandidate) {
    if (!firestore) return () => {};
    const unsubDoc = onSnapshot(doc(firestore, 'lessons', lessonId, 'viewers', studentId), (snap) => {
      const data = snap.data();
      if (data?.answer) onAnswer(data.answer);
    });
    const unsubIce = onSnapshot(
      collection(firestore, 'lessons', lessonId, 'viewers', studentId, 'broadcasterCandidates'),
      (snap) => {
        snap.docChanges().forEach((change) => {
          if (change.type === 'added') onIceCandidate(change.doc.data());
        });
      }
    );
    return () => {
      unsubDoc();
      unsubIce();
    };
  },

  subscribeViewerIce(lessonId, studentId, onIceCandidate) {
    if (!firestore) return () => {};
    return onSnapshot(
      collection(firestore, 'lessons', lessonId, 'viewers', studentId, 'viewerCandidates'),
      (snap) => {
        snap.docChanges().forEach((change) => {
          if (change.type === 'added') onIceCandidate(change.doc.data());
        });
      }
    );
  }
};
