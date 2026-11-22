import React, { useEffect, useRef, useState } from 'react';
import { Monitor, Video, Mic, MicOff, VideoOff, Radio, Users, Volume2 } from 'lucide-react';
import { dbService } from '../services/db';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.yandex.ru:3478' },
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

export function TeacherBroadcaster({ lesson }) {
  const [stream, setStream] = useState(null);
  const [micMuted, setMicMuted] = useState(false);
  const [error, setError] = useState('');
  const [connectedCount, setConnectedCount] = useState(0);

  const videoRef = useRef(null);
  const peersRef = useRef(new Map());

  const stopStream = () => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
    peersRef.current.forEach((pc) => pc.close());
    peersRef.current.clear();
    setConnectedCount(0);
  };

  useEffect(() => {
    return () => stopStream();
  }, []);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const startBroadcast = async (type) => {
    setError('');
    try {
      stopStream();
      let mediaStream;
      if (type === 'screen') {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: { frameRate: 24 },
          audio: true
        });
        try {
          const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          micStream.getAudioTracks().forEach((track) => displayStream.addTrack(track));
        } catch {}
        mediaStream = displayStream;
      } else {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 },
          audio: true
        });
      }

      mediaStream.getVideoTracks()[0].onended = () => stopStream();
      setStream(mediaStream);
    } catch (err) {
      setError('Не удалось получить доступ к экрану или камере: ' + err.message);
    }
  };

  useEffect(() => {
    if (!stream || !lesson?.id) return;

    const unsub = dbService.subscribeStreamViewers(lesson.id, async (viewers) => {
      setConnectedCount(viewers.length);

      for (const viewer of viewers) {
        if (!viewer.offer || peersRef.current.has(viewer.id)) continue;

        const pc = new RTCPeerConnection(ICE_SERVERS);
        peersRef.current.set(viewer.id, pc);

        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            dbService.addBroadcasterIce(lesson.id, viewer.id, event.candidate.toJSON());
          }
        };

        dbService.subscribeViewerIce(lesson.id, viewer.id, (cand) => {
          pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
        });

        await pc.setRemoteDescription(new RTCSessionDescription(viewer.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        await dbService.setViewerAnswer(lesson.id, viewer.id, {
          type: answer.type,
          sdp: answer.sdp
        });
      }
    });

    return () => unsub();
  }, [stream, lesson?.id]);

  const toggleMic = () => {
    if (!stream) return;
    stream.getAudioTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setMicMuted((prev) => !prev);
  };

  return (
    <div className="space-y-3">
      {!stream ? (
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-white/10 space-y-3">
          <div className="text-xs text-slate-300 font-semibold">
            Выберите источник трансляции для студентов (P2P без VPN):
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => startBroadcast('screen')}
              className="py-3 px-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:brightness-110 text-xs font-bold text-white flex flex-col items-center gap-1.5 shadow-lg shadow-blue-600/25"
            >
              <Monitor className="w-5 h-5" />
              <span>Демонстрация экрана</span>
            </button>
            <button
              type="button"
              onClick={() => startBroadcast('camera')}
              className="py-3 px-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-bold text-white flex flex-col items-center gap-1.5"
            >
              <Video className="w-5 h-5 text-cyan-400" />
              <span>Веб-камера</span>
            </button>
          </div>
          {error && <div className="text-[11px] text-rose-400">{error}</div>}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="relative rounded-2xl overflow-hidden bg-black border border-cyan-500/40 aspect-video">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-contain"
            />
            <div className="absolute top-2.5 left-2.5 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-600 text-white text-[10px] font-bold">
                <Radio className="w-3 h-3 animate-pulse" /> В ЭФИРЕ
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/70 text-cyan-300 text-[10px] font-bold">
                <Users className="w-3 h-3" /> Зрителей: {connectedCount}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={toggleMic}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border ${
                micMuted
                  ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                  : 'bg-white/10 border-white/15 text-white'
              }`}
            >
              {micMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-emerald-400" />}
              <span>{micMuted ? 'Микрофон выкл' : 'Микрофон вкл'}</span>
            </button>

            <button
              type="button"
              onClick={stopStream}
              className="flex-1 py-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center justify-center gap-1.5"
            >
              <VideoOff className="w-4 h-4" />
              <span>Остановить эфир</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function StudentViewer({ lesson, student, deviceId, onMarked }) {
  const [joined, setJoined] = useState(false);
  const [statusText, setStatusText] = useState('Ожидание подключения...');
  const videoRef = useRef(null);
  const pcRef = useRef(null);

  const joinStream = async () => {
    setJoined(true);
    setStatusText('Соединение с преподавателем...');

    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    pc.ontrack = (event) => {
      if (videoRef.current && event.streams[0]) {
        videoRef.current.srcObject = event.streams[0];
        setStatusText('Прямой эфир');
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        dbService.addViewerIce(lesson.id, student.id, event.candidate.toJSON());
      }
    };

    const offer = await pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true
    });
    await pc.setLocalDescription(offer);

    await dbService.createViewerOffer(lesson.id, student.id, {
      type: offer.type,
      sdp: offer.sdp
    });

    const rec = await dbService.markOnlineAttendance({ lesson, student, deviceId });
    if (onMarked) onMarked(rec);

    dbService.subscribeViewerSession(
      lesson.id,
      student.id,
      async (answer) => {
        if (!pc.currentRemoteDescription) {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
        }
      },
      (cand) => {
        pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
      }
    );
  };

  useEffect(() => {
    return () => {
      if (pcRef.current) pcRef.current.close();
    };
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
      <div className="flex items-center justify-between">
        <div className="text-xs font-bold text-white">{lesson.subject}</div>
        <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
          <Volume2 className="w-3.5 h-3.5" /> {statusText}
        </span>
      </div>
      <div className="rounded-2xl overflow-hidden bg-black border border-white/10 aspect-video">
        <video
          ref={videoRef}
          autoPlay
          controls
          playsInline
          className="w-full h-full object-contain"
        />
      </div>
    </div>
  );
}
