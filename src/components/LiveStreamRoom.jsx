import React, { useEffect, useRef, useState } from 'react';
import {
  Monitor,
  Video,
  Mic,
  MicOff,
  VideoOff,
  Radio,
  Users,
  Volume2,
  VolumeX,
  RefreshCw,
  SwitchCamera
} from 'lucide-react';
import { dbService } from '../services/db';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.yandex.ru:3478' },
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ]
};

function formatMediaError(err) {
  const name = err?.name || '';
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return 'Доступ к камере или микрофону запрещён. Разрешите доступ в настройках телефона (Приложения → Pulse → Разрешения) или в браузере.';
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return 'Камера или микрофон не найдены на этом устройстве.';
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return 'Камера или микрофон уже заняты другим приложением.';
  }
  if (name === 'NotSupportedError') {
    return 'Этот режим не поддерживается на телефоне. Используйте камеру или микрофон.';
  }
  return `Ошибка доступа к медиа: ${err?.message || 'неизвестная ошибка'}`;
}

function RemoteAudioPlayer({ stream, muted }) {
  const audioRef = useRef(null);

  useEffect(() => {
    if (audioRef.current && stream) {
      audioRef.current.srcObject = stream;
      audioRef.current.play().catch(() => {});
    }
  }, [stream]);

  return <audio ref={audioRef} autoPlay playsInline muted={muted} className="hidden" />;
}

export function TeacherBroadcaster({ lesson }) {
  const [isLive, setIsLive] = useState(false);
  const [sourceType, setSourceType] = useState(null); // 'screen' | 'media'
  const [camOn, setCamOn] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [facingMode, setFacingMode] = useState('user'); // 'user' | 'environment'
  const [muteStudents, setMuteStudents] = useState(false);
  const [error, setError] = useState('');
  const [connectedCount, setConnectedCount] = useState(0);
  const [studentAudios, setStudentAudios] = useState([]);

  const videoRef = useRef(null);
  const videoStreamRef = useRef(null);
  const audioStreamRef = useRef(null);
  const peersRef = useRef(new Map());

  const isMobileDevice =
    typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const canShareScreen =
    typeof navigator !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getDisplayMedia) &&
    !isMobileDevice;

  const syncTracksToPeers = async () => {
    const vTrack = videoStreamRef.current?.getVideoTracks()?.[0] || null;
    const aTrack = audioStreamRef.current?.getAudioTracks()?.[0] || null;

    for (const entry of peersRef.current.values()) {
      try {
        if (entry.videoSender) {
          await entry.videoSender.replaceTrack(vTrack);
        }
        if (entry.audioSender) {
          await entry.audioSender.replaceTrack(aTrack);
        }
      } catch {}
    }
  };

  const stopAllMedia = () => {
    if (videoStreamRef.current) {
      videoStreamRef.current.getTracks().forEach((t) => t.stop());
      videoStreamRef.current = null;
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((t) => t.stop());
      audioStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCamOn(false);
    setMicOn(false);
  };

  const stopStream = () => {
    stopAllMedia();
    peersRef.current.forEach((entry) => {
      try {
        entry.unsubIce && entry.unsubIce();
        entry.pc.close();
      } catch {}
    });
    peersRef.current.clear();
    setIsLive(false);
    setSourceType(null);
    setConnectedCount(0);
    setStudentAudios([]);
  };

  useEffect(() => {
    return () => stopStream();
  }, []);

  useEffect(() => {
    if (videoRef.current && videoStreamRef.current && camOn) {
      videoRef.current.srcObject = videoStreamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [camOn, isLive]);

  const enableCamera = async (targetFacing = facingMode) => {
    setError('');
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Браузер или WebView не поддерживает доступ к камере.');
      }
      let newStream;
      try {
        newStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: targetFacing,
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });
      } catch (e) {
        if (e?.name === 'OverconstrainedError' || e?.name === 'NotFoundError') {
          newStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        } else {
          throw e;
        }
      }

      if (videoStreamRef.current) {
        videoStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      videoStreamRef.current = newStream;

      const vTrack = newStream.getVideoTracks()[0];
      if (vTrack) {
        vTrack.onended = () => {
          disableCamera();
        };
      }

      setCamOn(true);
      await syncTracksToPeers();
      return true;
    } catch (err) {
      setError(formatMediaError(err));
      return false;
    }
  };

  const disableCamera = async () => {
    if (videoStreamRef.current) {
      videoStreamRef.current.getTracks().forEach((t) => t.stop());
      videoStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCamOn(false);
    await syncTracksToPeers();
  };

  const enableMicrophone = async () => {
    setError('');
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Браузер или WebView не поддерживает доступ к микрофону.');
      }
      let newAudio;
      try {
        newAudio = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true
          },
          video: false
        });
      } catch {
        newAudio = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      }

      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      audioStreamRef.current = newAudio;
      setMicOn(true);
      await syncTracksToPeers();
      return true;
    } catch (err) {
      setError(formatMediaError(err));
      return false;
    }
  };

  const disableMicrophone = async () => {
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((t) => t.stop());
      audioStreamRef.current = null;
    }
    setMicOn(false);
    await syncTracksToPeers();
  };

  const startBroadcast = async (mode) => {
    setError('');
    stopStream();

    if (mode === 'screen') {
      try {
        if (!navigator.mediaDevices?.getDisplayMedia) {
          throw { name: 'NotSupportedError' };
        }
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: { frameRate: 24 },
          audio: true
        });
        videoStreamRef.current = displayStream;
        const vTrack = displayStream.getVideoTracks()[0];
        if (vTrack) {
          vTrack.onended = () => stopStream();
        }
        setCamOn(true);
        setSourceType('screen');
        setIsLive(true);
        // Пробуем дополнительно подключить микрофон преподавателя
        await enableMicrophone();
        setError('');
      } catch (err) {
        stopStream();
        setError(formatMediaError(err));
      }
      return;
    }

    if (mode === 'mic_only') {
      const ok = await enableMicrophone();
      if (ok) {
        setSourceType('media');
        setIsLive(true);
      }
      return;
    }

    if (mode === 'cam_only') {
      const ok = await enableCamera(facingMode);
      if (ok) {
        setSourceType('media');
        setIsLive(true);
      }
      return;
    }

    if (mode === 'cam_and_mic') {
      const camOk = await enableCamera(facingMode);
      const micOk = await enableMicrophone();
      if (camOk || micOk) {
        setSourceType('media');
        setIsLive(true);
      }
    }
  };

  const switchCamera = async () => {
    const nextFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextFacing);
    if (sourceType === 'media' && camOn) {
      await enableCamera(nextFacing);
    }
  };

  useEffect(() => {
    if (!isLive || !lesson?.id) return;

    const unsub = dbService.subscribeStreamViewers(lesson.id, async (viewers) => {
      const now = Date.now();
      const freshViewers = viewers.filter(
        (v) => v.offer && now - (v.createdAt || now) < 30 * 60 * 1000
      );

      for (const viewer of freshViewers) {
        if (peersRef.current.has(viewer.id)) continue;

        const pc = new RTCPeerConnection(ICE_SERVERS);
        const state = {
          pc,
          audioSender: null,
          videoSender: null,
          remoteSet: false,
          pendingIce: [],
          unsubIce: null
        };
        peersRef.current.set(viewer.id, state);
        setConnectedCount(peersRef.current.size);

        pc.ontrack = (event) => {
          if (event.track.kind === 'audio') {
            const remoteStream = event.streams?.[0] || new MediaStream([event.track]);
            setStudentAudios((prev) => {
              const filtered = prev.filter((item) => item.id !== viewer.id);
              return [
                ...filtered,
                {
                  id: viewer.id,
                  name: viewer.studentName || 'Студент',
                  stream: remoteStream
                }
              ];
            });
          }
        };

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            dbService.addBroadcasterIce(lesson.id, viewer.id, event.candidate.toJSON());
          }
        };

        pc.onconnectionstatechange = () => {
          if (['failed', 'closed', 'disconnected'].includes(pc.connectionState)) {
            state.unsubIce && state.unsubIce();
            peersRef.current.delete(viewer.id);
            setConnectedCount(peersRef.current.size);
            setStudentAudios((prev) => prev.filter((item) => item.id !== viewer.id));
          }
        };

        state.unsubIce = dbService.subscribeViewerIce(lesson.id, viewer.id, (cand) => {
          if (state.remoteSet) {
            pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
          } else {
            state.pendingIce.push(cand);
          }
        });

        try {
          await pc.setRemoteDescription(new RTCSessionDescription(viewer.offer));
          state.remoteSet = true;

          for (const cand of state.pendingIce) {
            await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
          }
          state.pendingIce = [];

          // Находим трансиверы аудио и видео, чтобы включать/выключать их раздельно на лету
          const transceivers = pc.getTransceivers();
          const aTrans = transceivers.find((t) => t.receiver?.track?.kind === 'audio');
          const vTrans = transceivers.find((t) => t.receiver?.track?.kind === 'video');

          const currentVTrack = videoStreamRef.current?.getVideoTracks()?.[0] || null;
          const currentATrack = audioStreamRef.current?.getAudioTracks()?.[0] || null;

          if (aTrans) {
            aTrans.direction = 'sendrecv';
            state.audioSender = aTrans.sender;
            await aTrans.sender.replaceTrack(currentATrack);
          }
          if (vTrans) {
            vTrans.direction = 'sendonly';
            state.videoSender = vTrans.sender;
            await vTrans.sender.replaceTrack(currentVTrack);
          }

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          await dbService.setViewerAnswer(lesson.id, viewer.id, {
            type: answer.type,
            sdp: answer.sdp
          });
        } catch {
          state.unsubIce && state.unsubIce();
          peersRef.current.delete(viewer.id);
          setConnectedCount(peersRef.current.size);
        }
      }
    });

    return () => unsub();
  }, [isLive, lesson?.id]);

  return (
    <div className="space-y-3">
      {studentAudios.map((item) => (
        <RemoteAudioPlayer key={item.id} stream={item.stream} muted={muteStudents} />
      ))}

      {!isLive ? (
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-white/10 space-y-3">
          <div className="text-xs text-slate-300 font-semibold">
            Выберите, что включить для трансляции (можно менять во время пары):
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => startBroadcast('mic_only')}
              className="py-3 px-3 rounded-2xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-xs font-bold text-emerald-200 flex flex-col items-center gap-1.5"
            >
              <Mic className="w-5 h-5 text-emerald-400" />
              <span>Только микрофон</span>
            </button>

            <button
              type="button"
              onClick={() => startBroadcast('cam_only')}
              className="py-3 px-3 rounded-2xl bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/40 text-xs font-bold text-cyan-200 flex flex-col items-center gap-1.5"
            >
              <Video className="w-5 h-5 text-cyan-400" />
              <span>Только камера</span>
            </button>

            <button
              type="button"
              onClick={() => startBroadcast('cam_and_mic')}
              className={`${
                canShareScreen ? '' : 'col-span-2'
              } py-3 px-3 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:brightness-110 text-xs font-bold text-white flex flex-col items-center gap-1.5 shadow-lg shadow-cyan-600/20`}
            >
              <Radio className="w-5 h-5" />
              <span>Камера + микрофон</span>
            </button>

            {canShareScreen && (
              <button
                type="button"
                onClick={() => startBroadcast('screen')}
                className="py-3 px-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:brightness-110 text-xs font-bold text-white flex flex-col items-center gap-1.5 shadow-lg shadow-blue-600/25"
              >
                <Monitor className="w-5 h-5" />
                <span>Демонстрация экрана</span>
              </button>
            )}
          </div>

          {error && (
            <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-[11px] text-rose-300">
              {error}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-cyan-500/40 aspect-video flex items-center justify-center">
            {camOn ? (
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-contain bg-black"
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-4 text-center space-y-2">
                <div
                  className={`w-14 h-14 rounded-full flex items-center justify-center ${
                    micOn
                      ? 'bg-emerald-500/20 border border-emerald-400/50 text-emerald-400 animate-pulse'
                      : 'bg-white/5 border border-white/10 text-slate-400'
                  }`}
                >
                  {micOn ? <Mic className="w-7 h-7" /> : <MicOff className="w-7 h-7" />}
                </div>
                <div className="text-xs font-bold text-white">
                  {micOn ? 'Идёт голосовой эфир (камера выключена)' : 'Камера и микрофон на паузе'}
                </div>
                <div className="text-[11px] text-slate-400">
                  Включайте или отключайте камеру и микрофон кнопками ниже
                </div>
              </div>
            )}

            <div className="absolute top-2.5 left-2.5 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-600 text-white text-[10px] font-bold">
                <Radio className="w-3 h-3 animate-pulse" /> В ЭФИРЕ
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/70 text-cyan-300 text-[10px] font-bold">
                <Users className="w-3 h-3" /> Подключено: {connectedCount}
              </span>
            </div>

            {sourceType === 'media' && camOn && (
              <button
                type="button"
                onClick={switchCamera}
                className="absolute top-2.5 right-2.5 p-2 rounded-full bg-black/70 border border-white/15 text-white hover:bg-black"
                title="Переключить камеру"
              >
                <SwitchCamera className="w-4 h-4" />
              </button>
            )}
          </div>

          {error && (
            <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-[11px] text-rose-300">
              {error}
            </div>
          )}

          {/* Раздельное управление камерой и микрофоном */}
          <div className="grid grid-cols-2 gap-2">
            {sourceType === 'media' && (
              <button
                type="button"
                onClick={() => (camOn ? disableCamera() : enableCamera(facingMode))}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition ${
                  camOn
                    ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                    : 'bg-white/10 border-white/15 text-slate-300'
                }`}
              >
                {camOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4 text-slate-400" />}
                <span>{camOn ? 'Камера: Вкл' : 'Камера: Выкл'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => (micOn ? disableMicrophone() : enableMicrophone())}
              className={`${
                sourceType === 'screen' ? 'col-span-2' : ''
              } py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition ${
                micOn
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                  : 'bg-rose-500/20 border-rose-500/40 text-rose-300'
              }`}
            >
              {micOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
              <span>{micOn ? 'Микрофон: Вкл' : 'Микрофон: Выкл'}</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMuteStudents((prev) => !prev)}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border ${
                muteStudents
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                  : 'bg-white/10 border-white/15 text-cyan-300'
              }`}
            >
              {muteStudents ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              <span>{muteStudents ? 'Студенты: тихо' : 'Слышу студентов'}</span>
            </button>

            <button
              type="button"
              onClick={stopStream}
              className="py-2.5 px-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center justify-center gap-1.5"
            >
              <VideoOff className="w-4 h-4" />
              <span>Завершить эфир</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function StudentViewer({ lesson, student, deviceId, onMarked }) {
  const [joined, setJoined] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [hasActiveVideo, setHasActiveVideo] = useState(false);
  const [statusText, setStatusText] = useState('Ожидание подключения...');
  const [micEnabled, setMicEnabled] = useState(false);
  const [micError, setMicError] = useState('');

  const videoRef = useRef(null);
  const remoteStreamRef = useRef(new MediaStream());
  const pcRef = useRef(null);
  const audioSenderRef = useRef(null);
  const localMicStreamRef = useRef(null);
  const unsubSessionRef = useRef(null);
  const timeoutRef = useRef(null);

  const cleanupConnection = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (unsubSessionRef.current) {
      unsubSessionRef.current();
      unsubSessionRef.current = null;
    }
    if (localMicStreamRef.current) {
      localMicStreamRef.current.getTracks().forEach((t) => t.stop());
      localMicStreamRef.current = null;
    }
    if (pcRef.current) {
      try {
        pcRef.current.close();
      } catch {}
      pcRef.current = null;
    }
    remoteStreamRef.current = new MediaStream();
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    audioSenderRef.current = null;
    setMicEnabled(false);
    setIsConnected(false);
    setHasActiveVideo(false);
  };

  // Отслеживаем, идёт ли сейчас видеокадр от преподавателя (или только голос)
  useEffect(() => {
    if (!isConnected) return;
    const interval = setInterval(() => {
      const vid = videoRef.current;
      if (vid && vid.videoWidth > 0 && vid.readyState >= 2) {
        setHasActiveVideo(true);
      } else {
        setHasActiveVideo(false);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isConnected]);

  const joinStream = async () => {
    cleanupConnection();
    setJoined(true);
    setMicError('');
    setStatusText('Соединение с преподавателем...');

    const viewerKey = `${student.id}_${Date.now()}`;
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    const audioTransceiver = pc.addTransceiver('audio', { direction: 'sendrecv' });
    pc.addTransceiver('video', { direction: 'recvonly' });
    audioSenderRef.current = audioTransceiver.sender;

    const state = {
      remoteSet: false,
      pendingIce: []
    };

    pc.ontrack = (event) => {
      if (event.track) {
        const exists = remoteStreamRef.current.getTracks().some((t) => t.id === event.track.id);
        if (!exists) {
          remoteStreamRef.current.addTrack(event.track);
        }
      }
      if (videoRef.current && videoRef.current.srcObject !== remoteStreamRef.current) {
        videoRef.current.srcObject = remoteStreamRef.current;
      }
      if (videoRef.current) {
        videoRef.current.play().catch(() => {});
      }
      setIsConnected(true);
      setStatusText('Прямой эфир');
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        setIsConnected(true);
        setStatusText('Прямой эфир');
      } else if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
        setIsConnected(false);
        setStatusText('Связь прервана — нажмите Переподключиться');
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        dbService.addViewerIce(lesson.id, viewerKey, event.candidate.toJSON());
      }
    };

    timeoutRef.current = setTimeout(() => {
      if (!state.remoteSet) {
        setStatusText('Преподаватель ещё не запустил эфир — нажмите Переподключиться');
      }
    }, 12000);

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      await dbService.createViewerOffer(
        lesson.id,
        viewerKey,
        {
          type: offer.type,
          sdp: offer.sdp
        },
        student.fullName
      );

      const rec = await dbService.markOnlineAttendance({ lesson, student, deviceId });
      if (onMarked) onMarked(rec);

      unsubSessionRef.current = dbService.subscribeViewerSession(
        lesson.id,
        viewerKey,
        async (answer) => {
          if (!state.remoteSet && pc.signalingState !== 'closed') {
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
            state.remoteSet = true;
            for (const cand of state.pendingIce) {
              await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
            }
            state.pendingIce = [];
          }
        },
        (cand) => {
          if (state.remoteSet) {
            pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
          } else {
            state.pendingIce.push(cand);
          }
        }
      );
    } catch (err) {
      setStatusText('Ошибка подключения: ' + (err?.message || 'повторите попытку'));
    }
  };

  const toggleStudentMic = async () => {
    setMicError('');
    if (!pcRef.current || !audioSenderRef.current) return;

    if (micEnabled) {
      if (localMicStreamRef.current) {
        localMicStreamRef.current.getTracks().forEach((t) => t.stop());
        localMicStreamRef.current = null;
      }
      await audioSenderRef.current.replaceTrack(null).catch(() => {});
      setMicEnabled(false);
    } else {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Микрофон не поддерживается на этом устройстве.');
        }
        const micStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true
          }
        });
        const audioTrack = micStream.getAudioTracks()[0];
        if (!audioTrack) throw new Error('Аудиодорожка не найдена');

        localMicStreamRef.current = micStream;
        await audioSenderRef.current.replaceTrack(audioTrack);
        setMicEnabled(true);
      } catch (err) {
        setMicError(formatMediaError(err));
      }
    }
  };

  useEffect(() => {
    return () => cleanupConnection();
  }, []);

  if (!joined) {
    return (
      <div className="p-4 rounded-3xl bg-gradient-to-br from-blue-600/20 to-cyan-500/15 border border-cyan-400/40 space-y-3">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-cyan-300 uppercase">
            <Radio className="w-3.5 h-3.5 text-rose-400 animate-ping" /> Дистанционная пара
          </span>
          <span className="text-[11px] text-slate-300">{lesson.group}</span>
        </div>
        <div>
          <div className="text-base font-extrabold text-white">{lesson.subject}</div>
          <div className="text-xs text-slate-300 mt-0.5">Преподаватель: {lesson.teacherName}</div>
        </div>
        <button
          type="button"
          onClick={joinStream}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:brightness-110 text-xs font-extrabold text-white shadow-lg shadow-cyan-500/25 transition"
        >
          Подключиться к эфиру и отметиться
        </button>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-3xl p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-bold text-white truncate">{lesson.subject}</div>
        <span
          className={`text-[11px] font-semibold flex items-center gap-1 shrink-0 ${
            isConnected ? 'text-emerald-400' : 'text-amber-300'
          }`}
        >
          <Volume2 className="w-3.5 h-3.5" /> {statusText}
        </span>
      </div>

      <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-white/10 aspect-video">
        <video
          ref={videoRef}
          autoPlay
          controls={hasActiveVideo}
          playsInline
          className="w-full h-full object-contain bg-black"
        />

        {!isConnected && (
          <div className="absolute inset-0 bg-slate-950/85 flex flex-col items-center justify-center p-4 text-center space-y-2.5">
            <div className="w-7 h-7 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            <div className="text-xs text-slate-300">{statusText}</div>
          </div>
        )}

        {isConnected && !hasActiveVideo && (
          <div className="pointer-events-none absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-4 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-cyan-500/15 border border-cyan-400/40 flex items-center justify-center text-cyan-300 animate-pulse">
              <Volume2 className="w-6 h-6" />
            </div>
            <div className="text-xs font-bold text-white">Голосовой эфир преподавателя</div>
            <div className="text-[11px] text-slate-400">Камера преподавателя сейчас выключена</div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={toggleStudentMic}
          className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition ${
            micEnabled
              ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
              : 'bg-white/10 border-white/15 text-slate-200 hover:bg-white/15'
          }`}
        >
          {micEnabled ? <Mic className="w-4 h-4 animate-pulse" /> : <MicOff className="w-4 h-4 text-slate-400" />}
          <span>{micEnabled ? 'Микрофон вкл' : 'Включить микрофон'}</span>
        </button>

        <button
          type="button"
          onClick={joinStream}
          className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-bold text-cyan-300 flex items-center justify-center gap-1.5"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Переподключиться</span>
        </button>
      </div>

      {micError && (
        <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-[11px] text-rose-300">
          {micError}
        </div>
      )}
    </div>
  );
}
