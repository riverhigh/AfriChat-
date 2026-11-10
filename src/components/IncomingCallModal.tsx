import React, { useEffect, useRef } from 'react';
import {
  Phone,
  PhoneOff,
  Video,
  User,
  ShieldCheck,
  Radio,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const IncomingCallModal: React.FC = () => {
  const { incomingCall, acceptIncomingCall, declineIncomingCall } = useApp();
  const audioContextRef = useRef<AudioContext | null>(null);
  const ringtoneIntervalRef = useRef<number | null>(null);

  // ── Dual-tone incoming ringtone synthesizer ───────────────────────────────
  useEffect(() => {
    if (!incomingCall) return;

    let isCancelled = false;

    const playIncomingTone = () => {
      if (isCancelled) return;
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!audioContextRef.current) {
          audioContextRef.current = new AudioCtx();
        }
        const ctx = audioContextRef.current;
        if (ctx.state === 'suspended') {
          ctx.resume();
        }

        const now = ctx.currentTime;
        // Two beeps: 0-0.4s and 0.6-1.0s
        [0, 0.5].forEach((offset) => {
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const gain = ctx.createGain();

          osc1.frequency.setValueAtTime(440, now + offset);
          osc2.frequency.setValueAtTime(480, now + offset);

          gain.gain.setValueAtTime(0.06, now + offset);
          gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.35);

          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(ctx.destination);

          osc1.start(now + offset);
          osc2.start(now + offset);
          osc1.stop(now + offset + 0.35);
          osc2.stop(now + offset + 0.35);
        });
      } catch {
        // AudioContext restricted before gesture
      }
    };

    // Play immediately, then repeat every 3 seconds
    playIncomingTone();
    ringtoneIntervalRef.current = window.setInterval(playIncomingTone, 3000);

    return () => {
      isCancelled = true;
      if (ringtoneIntervalRef.current) {
        clearInterval(ringtoneIntervalRef.current);
        ringtoneIntervalRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
    };
  }, [incomingCall]);

  if (!incomingCall) return null;

  const isVideo = incomingCall.type === 'video';

  return (
    <div className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex flex-col justify-between p-6 animate-in fade-in duration-200 select-none text-white">
      {/* Background ambient lighting */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-80 h-80 bg-purple-700/25 rounded-full blur-[140px] animate-pulse" />
      </div>

      {/* ── Top Bar ────────────────────────────────────────────────────────── */}
      <div className="relative z-10 text-center pt-8 space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-[11px] font-mono text-purple-300 font-bold">
          <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
          <span>AfriChat End-to-End Encrypted</span>
        </div>

        <h3 className="text-sm font-semibold uppercase tracking-wider text-purple-300/80 pt-1">
          Incoming {isVideo ? 'Video' : 'Voice'} Call
        </h3>
        <h2 className="text-3xl font-black font-display text-white">
          {incomingCall.callerName}
        </h2>
        <p className="text-sm font-mono text-white/50">
          {incomingCall.callerPhone}
        </p>
      </div>

      {/* ── Center: Pulsing Avatar ─────────────────────────────────────────── */}
      <div className="relative z-10 flex flex-col items-center justify-center my-auto">
        <div className="relative flex items-center justify-center">
          <div className="absolute w-44 h-44 rounded-full bg-purple-600/20 animate-ping duration-1000" />
          <div className="absolute w-36 h-36 rounded-full bg-purple-600/30 animate-pulse" />

          <div className="relative w-28 h-28 rounded-full p-1 bg-gradient-to-tr from-purple-600 via-indigo-600 to-purple-400 shadow-2xl shadow-purple-950/90">
            {incomingCall.callerAvatar ? (
              <img
                src={incomingCall.callerAvatar}
                alt={incomingCall.callerName}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <div className="w-full h-full rounded-full bg-[#120d20] flex items-center justify-center text-white">
                <User className="w-12 h-12 text-purple-300/60" />
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 flex items-center gap-2 text-xs font-mono text-purple-300 bg-white/5 px-3.5 py-1.5 rounded-full border border-white/10">
          <Radio className="w-3.5 h-3.5 animate-spin text-purple-400" />
          <span>Ringing across AfriChat network...</span>
        </div>
      </div>

      {/* ── Bottom Actions: Decline / Accept ────────────────────────────────── */}
      <div className="relative z-10 pb-10">
        <div className="flex items-center justify-around max-w-xs mx-auto">
          {/* Decline Button */}
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={declineIncomingCall}
              className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-500 active:scale-95 text-white flex items-center justify-center shadow-xl shadow-rose-950/80 transition-all border border-rose-400/40"
              aria-label="Decline Call"
            >
              <PhoneOff className="w-7 h-7" />
            </button>
            <span className="text-xs font-semibold text-rose-300">Decline</span>
          </div>

          {/* Accept Button */}
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={acceptIncomingCall}
              className="w-16 h-16 rounded-full bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white flex items-center justify-center shadow-xl shadow-emerald-950/80 transition-all border border-emerald-400/40 animate-bounce duration-1000"
              aria-label="Accept Call"
            >
              {isVideo ? <Video className="w-7 h-7" /> : <Phone className="w-7 h-7 fill-current" />}
            </button>
            <span className="text-xs font-semibold text-emerald-300">Accept</span>
          </div>
        </div>
      </div>
    </div>
  );
};
