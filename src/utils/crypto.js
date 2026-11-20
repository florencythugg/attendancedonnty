export const ROTATION_SECONDS = 20;

export function getTimeStep(timestampMs = Date.now()) {
  return Math.floor(timestampMs / 1000 / ROTATION_SECONDS);
}

export function getSecondsRemaining(timestampMs = Date.now()) {
  const sec = Math.floor(timestampMs / 1000);
  return ROTATION_SECONDS - (sec % ROTATION_SECONDS);
}

export async function generateHmacHex(secret, message) {
  const enc = new TextEncoder();
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
    return Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  let hash = 2166136261;
  const str = secret + ':' + message;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash).toString(16).padStart(12, '0');
}

export async function generateDynamicToken(lessonId, secret, step = getTimeStep()) {
  const hex = await generateHmacHex(secret, `${lessonId}:${step}`);
  const shortHash = hex.slice(0, 10);
  const numeric = (parseInt(hex.slice(0, 8), 16) % 900000) + 100000;
  return {
    step,
    token: shortHash,
    pin: String(numeric),
    payload: JSON.stringify({
      v: 2,
      lid: lessonId,
      t: shortHash,
      s: step
    })
  };
}

export async function verifyDynamicToken(lessonId, secret, inputTokenOrPin) {
  const currentStep = getTimeStep();
  const allowedSteps = [currentStep, currentStep - 1];
  const normalized = String(inputTokenOrPin).trim();

  for (const step of allowedSteps) {
    const generated = await generateDynamicToken(lessonId, secret, step);
    if (normalized === generated.token || normalized === generated.pin) {
      return true;
    }
  }
  return false;
}

export function getOrCreateDeviceId() {
  const KEY = 'attendance_pro_device_id';
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = 'DEV-' + Math.random().toString(36).substring(2, 8).toUpperCase() + '-' + Date.now().toString(36).slice(-4).toUpperCase();
    localStorage.setItem(KEY, id);
  }
  return id;
}

export function generateRandomSecret() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let res = '';
  for (let i = 0; i < 24; i++) {
    res += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return res;
}
// Расчёт расстояния между двумя GPS-точками в метрах (формула гаверсинусов)
export function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000; // радиус Земли в метрах
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export function getCurrentPositionAsync(timeoutMs = 7000) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Геолокация не поддерживается вашим устройством'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy || 0)
        }),
      (err) => {
        if (err.code === 1) {
          reject(new Error('Доступ к геолокации запрещён. Разрешите GPS в настройках браузера/телефона.'));
        } else {
          reject(new Error('Не удалось определить GPS-координаты. Проверьте, включена ли геолокация.'));
        }
      },
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 10000 }
    );
  });
}
