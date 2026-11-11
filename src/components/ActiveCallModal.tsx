import React, { useEffect, useRef, useState } from 'react';
import {
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Video,
  VideoOff,
  SwitchCamera,
  Share2,
  Copy,
  Check,
  ShieldCheck,
  Radio,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useWebRTC } from '../hooks/useWebRTC';
import { ActiveCallState } from '../context/AppContext';

interface ActiveCallSessionProps {
  activeCall: ActiveCallState;
  onEndCall: () => void;
}

const ActiveCallSession: React.FC<ActiveCallSessionProps> = ({ activeCall, onEndCall }) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  const {
    localStream,
    remoteStream,
    connectionState,
    isMuted,
    isVideoOff,
    isSpeaker,
    durationSeconds,
    toggleMute,
    toggleVideo,
    toggleSpeaker,
    flipCamera,
    endCall: endWebRTCCall,
  } = useWebRTC({
    roomId: activeCall.roomId || `call_${activeCall.phone.replace(/\D/g, '') || 'room'}`,
    callType: activeCall.type || 'voice',
    isInitiator: activeCall.isInitiator ?? true,
    onCallEnded: onEndCall,
    enabled: true,
  });

  // Attach local stream to local video element
  useEffect(() => {
    const el = localVideoRef.current;
    if (el && localStream) {
      el.srcObject = localStream;
      el.play().catch(() => {
        // Autoplay blocked; user interaction needed — muted so this usually succeeds
      });
    }
  }, [localStream]);

  // Attach remote stream to video element (video calls) + audio element (all calls)
  useEffect(() => {
    if (!remoteStream) return;

    // Video: attach to <video> element for video calls
    const videoEl = remoteVideoRef.current;
    if (videoEl) {
      videoEl.srcObject = remoteStream;
      videoEl.play().catch(() => {});
    }

    // Audio: always attach remote stream to a dedicated <audio> element.
    // This ensures sound plays on mobile browsers even when video element
    // is not rendered (voice calls) or when autoplay policy blocks video.
    const audioEl = remoteAudioRef.current;
    if (audioEl) {
      audioEl.srcObject = remoteStream;
      audioEl.play().catch(() => {});
    }
  }, [remoteStream]);

  // RULE 3: Handle component unmounting safely — ensure all tracks are stopped when navigating away
  useEffect(() => {
    return () => {
      if (localStream) {
        localStream.getTracks().forEach((track) => {
          try {
            track.stop();
            track.enabled = false;
          } catch (e) {
            console.warn('Error stopping local track on unmount:', e);
          }
        });
      }
      if (remoteStream) {
        remoteStream.getTracks().forEach((track) => {
          try {
            track.stop();
            track.enabled = false;
          } catch (e) {
            console.warn('Error stopping remote track on unmount:', e);
          }
        });
      }
    };
  }, [localStream, remoteStream]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? `0${secs}` : secs}`;
  };

  const callLink = `${window.location.origin}/?call=${activeCall.roomId || ''}&type=${activeCall.type}`;

  const handleCopyLink = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `AGC ${activeCall.type === 'video' ? 'Video' : 'Voice'} Call`,
          text: `Join my live AGC call:`,
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

  const handleHangUp = () => {
    // RULE 2: Explicitly stop all audio/video tracks when user finishes call
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        try {
          track.stop();
          track.enabled = false;
        } catch (_) {}
      });
    }
    endWebRTCCall();
    onEndCall();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#06060a] text-white flex flex-col justify-between overflow-hidden animate-in fade-in select-none">
      {/* Background: Remote Video or Deep Dark Ambience */}
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

      {/* Top Bar */}
      <div className="relative z-10 px-5 pb-4 text-center space-y-2" style={{ paddingTop: 'max(calc(env(safe-area-inset-top, 0px) + 12px), 28px)' }}>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/6 backdrop-blur-md border border-white/10 text-[11px] font-mono font-semibold text-purple-300">
          <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
          <span>End-to-End Encrypted</span>
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
              Ringing...
            </span>
          )}
          {connectionState === 'connecting' && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-300 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20 animate-pulse">
              Connecting...
            </span>
          )}
          {connectionState === 'connected' && (
            <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-400 bg-emerald-500/15 px-3 py-1 rounded-full border border-emerald-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              {formatTimer(durationSeconds)}
            </span>
          )}
          {connectionState === 'ended' && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-400 bg-rose-500/15 px-3 py-1 rounded-full border border-rose-500/30">
              Call ended
            </span>
          )}
        </div>
      </div>

      {/* Center Body: Caller Avatar or PiP Video Window */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-6">
        {!isVideoMode || !remoteStream ? (
          <div className="relative flex items-center justify-center">
            {/* Animated Pulsing Rings */}
            {connectionState === 'ringing' && (
              <>
                <div className="absolute w-44 h-44 rounded-full border border-purple-500/30 animate-ping" />
                <div className="absolute w-56 h-56 rounded-full border border-purple-500/15 animate-pulse" />
              </>
            )}

            <div className="w-28 h-28 rounded-full p-1 bg-gradient-to-tr from-purple-600 via-indigo-600 to-amber-500 shadow-2xl relative">
              <img
                src={activeCall.avatar}
                alt={activeCall.name}
                className="w-full h-full rounded-full object-cover"
              />
            </div>
          </div>
        ) : null}

        {/* Link Share sheet trigger */}
        <div className="mt-8">
          <button
            type="button"
            onClick={handleCopyLink}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/15 text-white/80 hover:text-white backdrop-blur-md border border-white/10 text-xs font-semibold transition-all active:scale-95"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
            <span>{copiedLink ? 'Call Link Copied!' : 'Share Call Link'}</span>
          </button>
        </div>
      </div>

      {/* Video Call PiP Window (Local Camera Preview) */}
      {isVideoMode && (
        <div className="absolute top-20 right-4 z-20 w-28 h-40 rounded-2xl overflow-hidden shadow-2xl border-2 border-purple-500/60 bg-black/80">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : 'block'}`}
          />
          {isVideoOff && (
            <div className="w-full h-full flex flex-col items-center justify-center text-white/50 bg-neutral-900">
              <VideoOff className="w-6 h-6 mb-1" />
              <span className="text-[9px]">Camera Off</span>
            </div>
          )}
        </div>
      )}

      {/* Hidden remote audio element — ensures voice plays on mobile for both voice & video calls */}
      <audio
        ref={remoteAudioRef}
        autoPlay
        playsInline
        style={{ display: 'none' }}
      />

      {/* Bottom Floating Control Dock */}
      <div className="relative z-10 px-6 pt-4" style={{ paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 24px), 32px)' }}>
        <div className="max-w-xs mx-auto flex items-center justify-center gap-3 bg-white/8 backdrop-blur-xl border border-white/10 rounded-full p-3 shadow-2xl">
          {/* Mute Toggle */}
          <button
            type="button"
            onClick={toggleMute}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-90 ${
              isMuted ? 'bg-amber-500 text-black' : 'bg-white/10 text-white hover:bg-white/20'
            }`}
            title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Speaker Toggle */}
          <button
            type="button"
            onClick={toggleSpeaker}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-90 ${
              isSpeaker ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/40' : 'bg-white/10 text-white hover:bg-white/20'
            }`}
            title={isSpeaker ? 'Speaker On' : 'Speaker Off'}
          >
            {isSpeaker ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>

          {/* Video Toggle (If video mode) */}
          {isVideoMode && (
            <>
              <button
                type="button"
                onClick={toggleVideo}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-90 ${
                  isVideoOff ? 'bg-amber-500 text-black' : 'bg-white/10 text-white hover:bg-white/20'
                }`}
                title={isVideoOff ? 'Turn Video On' : 'Turn Video Off'}
              >
                {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
              </button>

              <button
                type="button"
                onClick={flipCamera}
                className="w-12 h-12 rounded-full bg-white/10 text-white hover:bg-white/20 flex items-center justify-center transition-all active:scale-90"
                title="Flip Camera"
              >
                <SwitchCamera className="w-5 h-5" />
              </button>
            </>
          )}

          {/* End Call Button */}
          <button
            type="button"
            onClick={handleHangUp}
            className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center transition-all shadow-lg shadow-rose-600/50 active:scale-90"
            title="End Call"
          >
            <PhoneOff className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};

// RULE 1: Never initialize WebRTC or getUserMedia on page load!
// Only mount the ActiveCallSession when an activeCall is actually present!
export const ActiveCallModal: React.FC = () => {
  const { activeCall, endCall } = useApp();

  if (!activeCall) return null;

  return <ActiveCallSession activeCall={activeCall} onEndCall={endCall} />;
};
