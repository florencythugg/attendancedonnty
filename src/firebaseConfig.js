// =========================================================================
// ОБЛАЧНАЯ БАЗА ДАННЫХ FIREBASE ПОДКЛЮЧЕНА (ПРОЕКТ: donnty180)
// =========================================================================

export const firebaseConfig = {
  apiKey: "AIzaSyAFZ2wCAkJZaZreSbdHwSsKlS1tltFnJfc",
  authDomain: "donnty180.firebaseapp.com",
  projectId: "donnty180",
  storageBucket: "donnty180.firebasestorage.app",
  messagingSenderId: "906834163319",
  appId: "1:906834163319:web:c5548fb4bdb1309eb1b872",
  measurementId: "G-95PF9H5B2K"
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId
);

// Код доступа для регистрации преподавателей
export const TEACHER_INVITE_CODE = "TEACHER2026";
