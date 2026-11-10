import React, { useEffect, useRef, useState } from 'react';
import {
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Video,
  VideoOff,
  User,
  SwitchCamera,
  Share2,
  Copy,
  Check,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  Radio,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useWebRTC } from '../hooks/useWebRTC';

export const ActiveCallModal: React.FC = () => {
  const { activeCall, endCall } = useApp();
  const [copiedLink, setCopiedLink] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  const {
    localStream,
    remoteStream,
    connectionState,
    isMuted,
    isVideoOff,
    isSpeaker,
    durationSeconds,
    errorMessage,
    toggleMute,
    toggleVideo,
    toggleSpeaker,
    flipCamera,
    endCall: endWebRTCCall,
  } = useWebRTC({
    roomId: activeCall?.roomId || `call_${activeCall?.phone?.replace(/\D/g, '') || 'room'}`,
    callType: activeCall?.type || 'voice',
    isInitiator: activeCall?.isInitiator ?? true,
    onCallEnded: endCall,
  });

  // Attach local stream to local video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Attach remote stream to remote video element
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  if (!activeCall) return null;

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? `0${secs}` : secs}`;
  };

  const callLink = `${window.location.origin}/?call=${activeCall.roomId}&type=${activeCall.type}`;

  const handleCopyLink = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `AfriChat ${activeCall.type === 'video' ? 'Video' : 'Voice'} Call`,
          text: `Join my live AfriChat call:`,
          url: callLink,
        });
      } else {
        await navigator.clipboard.writeText(callLink);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 3000);
      }
    } catch {
      await navigator.clipboard.writeText(callLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    }
  };

  const isVideoMode = activeCall.type === 'video';

  return (
    <div className="fixed inset-0 z-50 bg-[#06060a] text-white flex flex-col justify-between overflow-hidden animate-in fade-in select-none">
      {/* ── Background: Remote Video or Deep Dark Ambience ──────────────────── */}
      {isVideoMode && remoteStream ? (
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-32 -left-32 w-96 h-96 bg-purple-900/20 rounded-full blur-[140px]" />
          <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-900/20 rounded-full blur-[140px]" />
        </div>
      )}

      {/* Subtle overlay for legibility */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-black/90 pointer-events-none" />

      {/* ── Top Bar: Encryption Status & Caller Metadata ───────────────────── */}
      <div className="relative z-10 px-5 pt-8 pb-4 text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/6 backdrop-blur-md border border-white/10 text-[11px] font-mono font-semibold text-purple-300">
          <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
          <span>AfriChat Peer WebRTC · E2E Encrypted</span>
        </div>

        <h2 className="text-2xl font-black font-display tracking-tight text-white mt-2">
          {activeCall.name}
        </h2>
        <div className="text-xs font-mono text-white/50">{activeCall.phone}</div>

        {/* Dynamic Status Pill */}
        <div className="pt-1">
          {connectionState === 'requesting_permissions' && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-300 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20 animate-pulse">
              Requesting mic & camera permission...
            </span>
          )}
          {connectionState === 'ringing' && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-300 bg-purple-500/15 px-3 py-1 rounded-full border border-purple-500/30 animate-pulse">
              <Radio className="w-3.5 h-3.5 animate-spin" />
              Ringing · Waiting for peer to connect...
            </span>
          )}
          {connectionState === 'connecting' && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-300 bg-indigo-500/15 px-3 py-1 rounded-full border border-indigo-500/30 animate-pulse">
              Connecting WebRTC stream...
            </span>
          )}
          {connectionState === 'connected' && (
            <span className="inline-flex items-center gap-1.5 text-sm font-mono font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              {formatTimer(durationSeconds)}
            </span>
          )}
          {connectionState === 'error' && (
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-300 bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20">
              <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
              <span>{errorMessage || 'Media connection failed'}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Center: Avatar / Voice Rings or Video Preview ───────────────────── */}
      <div className="relative z-10 flex flex-col items-center justify-center my-auto px-4">
        {!remoteStream && (
          <div className="relative flex items-center justify-center">
            {/* Animated pulses when calling */}
            <div className="absolute w-44 h-44 rounded-full bg-purple-600/15 animate-ping duration-1000" />
            <div className="absolute w-36 h-36 rounded-full bg-purple-600/20 animate-pulse" />

            <div className="relative w-28 h-28 rounded-full p-1 bg-gradient-to-tr from-purple-600 via-indigo-600 to-purple-400 shadow-2xl shadow-purple-950/80">
              {activeCall.avatar ? (
                <img
                  src={activeCall.avatar}
                  alt={activeCall.name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-[#120d20] flex items-center justify-center text-white">
                  <User className="w-12 h-12 text-purple-300/60" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Share Call Link Pill (Convenient for multi-device testing) */}
        <div className="mt-8 max-w-xs w-full">
          <button
            type="button"
            onClick={handleCopyLink}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl bg-white/8 hover:bg-white/12 active:scale-98 border border-white/10 backdrop-blur-md text-xs font-semibold text-white/80 transition-all shadow-lg"
          >
            {copiedLink ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-300">Call Link Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4 text-purple-400" />
                <span>Invite Peer (Tap to Copy/Share Link)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Picture-in-Picture: Local Camera Preview ───────────────────────── */}
      {isVideoMode && (
        <div className="absolute top-6 right-5 z-20 w-28 h-40 sm:w-32 sm:h-44 rounded-2xl overflow-hidden border-2 border-purple-500/40 shadow-2xl bg-black/80 backdrop-blur-md transition-all">
          {!isVideoOff && localStream ? (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover scale-x-[-1]"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-[#100a20] text-white/40 p-2 text-center">
              <VideoOff className="w-6 h-6 text-purple-400/60 mb-1" />
              <span className="text-[10px]">Camera Off</span>
            </div>
          )}
          <span className="absolute bottom-1.5 left-2 text-[9px] font-bold bg-black/60 px-1.5 py-0.5 rounded text-white/70">
            You
          </span>
        </div>
      )}

      {/* ── Bottom Controls ─────────────────────────────────────────────────── */}
      <div className="relative z-10 px-6 pb-10 pt-4 space-y-6">
        <div className="flex items-center justify-center gap-4 max-w-sm mx-auto">
          {/* Mute Mic */}
          <button
            type="button"
            onClick={toggleMute}
            className={`w-14 h-14 rounded-2xl flex items-center justify-center backdrop-blur-md transition-all active:scale-95 border ${
              isMuted
                ? 'bg-rose-500/20 border-rose-500/50 text-rose-400'
                : 'bg-white/8 border-white/10 text-white hover:bg-white/15'
            }`}
            title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
          >
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>

          {/* Toggle Video (If video call) */}
          {isVideoMode && (
            <>
              <button
                type="button"
                onClick={toggleVideo}
                className={`w-14 h-14 rounded-2xl flex items-center justify-center backdrop-blur-md transition-all active:scale-95 border ${
                  isVideoOff
                    ? 'bg-rose-500/20 border-rose-500/50 text-rose-400'
                    : 'bg-white/8 border-white/10 text-white hover:bg-white/15'
                }`}
                title={isVideoOff ? 'Turn Camera On' : 'Turn Camera Off'}
              >
                {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
              </button>

              {/* Flip Camera (Front / Back) */}
              <button
                type="button"
                onClick={flipCamera}
                className="w-14 h-14 rounded-2xl bg-white/8 border border-white/10 text-white hover:bg-white/15 flex items-center justify-center backdrop-blur-md transition-all active:scale-95"
                title="Switch Camera (Front/Back)"
              >
                <SwitchCamera className="w-6 h-6 text-purple-300" />
              </button>
            </>
          )}

          {/* Speaker Toggle */}
          <button
            type="button"
            onClick={toggleSpeaker}
            className={`w-14 h-14 rounded-2xl flex items-center justify-center backdrop-blur-md transition-all active:scale-95 border ${
              isSpeaker
                ? 'bg-purple-600/30 border-purple-500 text-purple-300'
                : 'bg-white/8 border-white/10 text-white hover:bg-white/15'
            }`}
            title="Toggle Speakerphone"
          >
            {isSpeaker ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
          </button>

          {/* End Call Button */}
          <button
            type="button"
            onClick={endWebRTCCall}
            className="w-16 h-16 rounded-3xl bg-rose-600 hover:bg-rose-500 active:scale-95 text-white flex items-center justify-center shadow-2xl shadow-rose-950/80 transition-all border border-rose-400/30"
            title="End Call"
          >
            <PhoneOff className="w-7 h-7" />
          </button>
        </div>
      </div>
    </div>
  );
};
