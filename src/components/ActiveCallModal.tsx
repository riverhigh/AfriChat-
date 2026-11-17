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
  Check,
  ShieldCheck,
  Radio,
  Users,
  Sun,
} from 'lucide-react';
import { useApp, ActiveCallState } from '../context/AppContext';
import { useWebRTC, RemotePeerMedia } from '../hooks/useWebRTC';
import {
  NightLightBackdrop,
  NightLightTopControls,
  NightLightAdjusterPanel,
  LowLightSuggestionBanner,
  FillLightTone,
  FillLightLayout,
  FILL_LIGHT_TONES,
} from './NightLightOverlay';

interface RemoteStreamAudioProps {
  stream: MediaStream | null;
}

const RemoteStreamAudio: React.FC<RemoteStreamAudioProps> = ({ stream }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    if (stream) {
      if (el.srcObject !== stream) {
        el.srcObject = stream;
      }
      el.play().catch(() => {});
    } else {
      el.srcObject = null;
    }
    return () => {
      if (el) el.srcObject = null;
    };
  }, [stream]);

  return <audio ref={audioRef} autoPlay playsInline style={{ display: 'none' }} />;
};

interface RemotePeerTileProps {
  peer: RemotePeerMedia;
  isVideoMode: boolean;
}

const RemotePeerTile: React.FC<RemotePeerTileProps> = ({ peer, isVideoMode }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hasVideoTrack = Boolean(peer.stream && peer.stream.getVideoTracks().length > 0);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (peer.stream && isVideoMode && hasVideoTrack) {
      if (el.srcObject !== peer.stream) {
        el.srcObject = peer.stream;
      }
      el.play().catch(() => {});
    } else {
      el.srcObject = null;
    }
    return () => {
      if (el) el.srcObject = null;
    };
  }, [peer.stream, isVideoMode, hasVideoTrack]);

  return (
    <div className="relative rounded-2xl overflow-hidden bg-white/5 border border-white/10 aspect-[3/4] flex flex-col items-center justify-center">
      {isVideoMode && hasVideoTrack ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 p-3">
          {peer.avatar ? (
            <img
              src={peer.avatar}
              alt={peer.name}
              className="w-16 h-16 rounded-full object-cover border-2 border-purple-500/60"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-purple-700/40 border-2 border-purple-500/60 flex items-center justify-center text-lg font-bold">
              {(peer.name || 'P').charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      )}
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between px-2 py-1 rounded-lg bg-black/60 backdrop-blur-sm text-[11px]">
        <span className="font-semibold truncate">{peer.name}</span>
        <span className="text-[10px] text-emerald-400 font-mono shrink-0 ml-1">
          {peer.connectionState === 'connected' ? 'Live' : 'Connecting'}
        </span>
      </div>
    </div>
  );
};

interface StreamVideoProps {
  stream: MediaStream | null;
  className?: string;
}

const StreamVideo: React.FC<StreamVideoProps> = ({ stream, className = '' }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (stream) {
      if (el.srcObject !== stream) {
        el.srcObject = stream;
      }
      el.play().catch(() => {});
    } else {
      el.srcObject = null;
    }
    return () => {
      if (el) el.srcObject = null;
    };
  }, [stream]);

  return <video ref={videoRef} autoPlay playsInline muted className={className} />;
};

interface ActiveCallSessionProps {
  activeCall: ActiveCallState;
  onEndCall: () => void;
}

const ActiveCallSession: React.FC<ActiveCallSessionProps> = ({ activeCall, onEndCall }) => {
  const { currentUser } = useApp();
  const [copiedLink, setCopiedLink] = useState(false);
  const [isLocalMain, setIsLocalMain] = useState(false);
  const [swapToast, setSwapToast] = useState<string | null>(null);

  // Night Fill-Light / Screen Ring Light states
  const [isNightLightActive, setIsNightLightActive] = useState(false);
  const [fillLightBrightness, setFillLightBrightness] = useState(100);
  const [fillLightTone, setFillLightTone] = useState<FillLightTone>('white');
  const [fillLightLayout, setFillLightLayout] = useState<FillLightLayout>('canvas');
  const [isLowLightDetected, setIsLowLightDetected] = useState(false);
  const [lowLightDismissed, setLowLightDismissed] = useState(false);

  const lastTouchTapRef = useRef<{ time: number; x: number; y: number }>({ time: 0, x: 0, y: 0 });
  const swapToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resolvedRoomId =
    activeCall.roomId || `call_${(activeCall.phone || '').replace(/\D/g, '') || 'room'}`;
  const isVideoMode = activeCall.type === 'video';

  const {
    localStream,
    remoteStream,
    remotePeers,
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
    roomId: resolvedRoomId,
    callType: activeCall.type || 'voice',
    isInitiator: activeCall.isInitiator ?? true,
    userPhone: currentUser?.phoneNumber,
    userName: currentUser?.fullName,
    userAvatar: currentUser?.avatarUrl,
    isGroupCall: Boolean(activeCall.isGroupCall),
    onCallEnded: onEndCall,
    enabled: true,
  });

  const isMultiPeer = remotePeers.length > 1;
  const canSwapPip = isVideoMode && !isMultiPeer;

  useEffect(() => {
    return () => {
      if (swapToastTimerRef.current) clearTimeout(swapToastTimerRef.current);
    };
  }, []);

  // Low-light detection via AmbientLightSensor (where supported) or camera luma sampling fallback
  useEffect(() => {
    if (!isVideoMode || isNightLightActive || lowLightDismissed) {
      return;
    }

    let sensor: {
      start: () => void;
      stop: () => void;
      illuminance?: number;
      onreading: (() => void) | null;
      onerror?: (() => void) | null;
    } | null = null;
    let cancelled = false;

    try {
      const WinWithSensor = window as unknown as {
        AmbientLightSensor?: new () => {
          start: () => void;
          stop: () => void;
          illuminance: number;
          onreading: (() => void) | null;
          onerror: (() => void) | null;
        };
      };
      if (WinWithSensor.AmbientLightSensor) {
        const als = new WinWithSensor.AmbientLightSensor();
        als.onreading = () => {
          if (!cancelled && typeof als.illuminance === 'number' && als.illuminance < 25) {
            setIsLowLightDetected(true);
          }
        };
        als.onerror = () => {};
        als.start();
        sensor = als;
      }
    } catch {
      // Fallback to camera frame luminance check below
    }

    // Camera frame average luma fallback
    let probeInterval: ReturnType<typeof setInterval> | null = null;
    let probeVideo: HTMLVideoElement | null = null;

    if (localStream && !isVideoOff && localStream.getVideoTracks().length > 0) {
      probeVideo = document.createElement('video');
      probeVideo.muted = true;
      probeVideo.playsInline = true;
      probeVideo.srcObject = localStream;
      probeVideo.play().catch(() => {});

      const canvas = document.createElement('canvas');
      canvas.width = 16;
      canvas.height = 16;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      const sampleFrame = () => {
        if (cancelled || !probeVideo || !ctx || probeVideo.readyState < 2) return;
        try {
          ctx.drawImage(probeVideo, 0, 0, 16, 16);
          const data = ctx.getImageData(0, 0, 16, 16).data;
          let sum = 0;
          let nonZeroPixels = 0;
          for (let i = 0; i < data.length; i += 4) {
            const luma = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            sum += luma;
            if (data[i] + data[i + 1] + data[i + 2] > 6) nonZeroPixels++;
          }
          const avgLuma = sum / 256;
          if (nonZeroPixels > 16 && avgLuma < 56) {
            setIsLowLightDetected(true);
          }
        } catch {
          // Ignore canvas read errors
        }
      };

      const initialTimer = setTimeout(sampleFrame, 1800);
      probeInterval = setInterval(sampleFrame, 4000);

      return () => {
        cancelled = true;
        clearTimeout(initialTimer);
        if (probeInterval) clearInterval(probeInterval);
        if (probeVideo) probeVideo.srcObject = null;
        try {
          sensor?.stop();
        } catch {
          // ignore
        }
      };
    }

    return () => {
      cancelled = true;
      try {
        sensor?.stop();
      } catch {
        // ignore
      }
    };
  }, [isVideoMode, isNightLightActive, lowLightDismissed, localStream, isVideoOff]);

  const toggleMainCamera = () => {
    if (!canSwapPip) return;
    setIsLocalMain((prev) => {
      const next = !prev;
      setSwapToast(next ? 'Your camera in main view' : `${activeCall.name || 'Caller'} in main view`);
      if (swapToastTimerRef.current) clearTimeout(swapToastTimerRef.current);
      swapToastTimerRef.current = setTimeout(() => setSwapToast(null), 1600);
      return next;
    });
  };

  const toggleNightLight = () => {
    if (!isVideoMode) return;
    setIsNightLightActive((prev) => {
      const next = !prev;
      if (next) setIsLowLightDetected(false);
      return next;
    });
  };

  const isInteractiveTarget = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return false;
    return Boolean(target.closest('button, a, input, select, label, [data-no-swap="true"]'));
  };

  const handleStageDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canSwapPip || isInteractiveTarget(e.target)) return;
    toggleMainCamera();
  };

  const handleStagePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!canSwapPip || e.pointerType !== 'touch' || isInteractiveTarget(e.target)) return;
    const now = Date.now();
    const dx = Math.abs(e.clientX - lastTouchTapRef.current.x);
    const dy = Math.abs(e.clientY - lastTouchTapRef.current.y);
    if (now - lastTouchTapRef.current.time < 340 && dx < 48 && dy < 48) {
      lastTouchTapRef.current = { time: 0, x: 0, y: 0 };
      toggleMainCamera();
    } else {
      lastTouchTapRef.current = { time: now, x: e.clientX, y: e.clientY };
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? `0${secs}` : secs}`;
  };

  const callLink = `${window.location.origin}/?call=${resolvedRoomId}&type=${activeCall.type || 'voice'}`;

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
      try {
        await navigator.clipboard.writeText(callLink);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 3000);
      } catch (_) {}
    }
  };

  const connectedCount = remotePeers.filter((p) => p.connectionState === 'connected' || p.stream).length;
  const totalInvited = activeCall.participantPhones?.length || 0;

  const handleHangUp = () => {
    setIsNightLightActive(false);
    endWebRTCCall();
    onEndCall();
  };

  const mainStream = canSwapPip ? (isLocalMain ? localStream : remoteStream) : null;
  const pipStream = canSwapPip ? (isLocalMain ? remoteStream : localStream) : localStream;
  const hasRemoteVideo = Boolean(remoteStream && remoteStream.getVideoTracks().length > 0);
  const showMainLocalOff = canSwapPip && isLocalMain && isVideoOff;
  const showMainVideo = canSwapPip && Boolean(mainStream) && !showMainLocalOff;
  const showPipVideo =
    isVideoMode &&
    Boolean(pipStream) &&
    (canSwapPip ? (isLocalMain ? hasRemoteVideo : !isVideoOff) : !isVideoOff);

  const isAnyFillLight = isVideoMode && isNightLightActive;
  const isFillLightCanvas = isAnyFillLight && fillLightLayout === 'canvas';
  const activeToneCfg = FILL_LIGHT_TONES[fillLightTone];

  const renderPipPreview = (insideCard: boolean) => {
    if (!isVideoMode) return null;
    const pipGlowStyle: React.CSSProperties | undefined = isAnyFillLight
      ? {
          boxShadow: `0 0 28px ${activeToneCfg.glowRgba}, 0 0 0 3px ${activeToneCfg.hex}`,
        }
      : undefined;

    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (canSwapPip) toggleMainCamera();
        }}
        title={canSwapPip ? 'Tap to swap camera views' : 'Your camera preview'}
        style={pipGlowStyle}
        className={`${
          insideCard ? 'absolute top-3 right-3 w-20 h-28' : 'absolute top-20 right-4 w-28 h-40'
        } z-20 rounded-2xl overflow-hidden shadow-2xl ${
          isAnyFillLight ? 'border-2 border-white' : 'border-2 border-purple-500/60'
        } bg-black/80 text-left focus:outline-none focus:ring-2 focus:ring-purple-400 transition-all active:scale-95`}
      >
        {showPipVideo && pipStream ? (
          <StreamVideo stream={pipStream} className="w-full h-full object-cover" />
        ) : canSwapPip && isLocalMain ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 p-2 bg-neutral-900">
            {activeCall.avatar ? (
              <img
                src={activeCall.avatar}
                alt={activeCall.name}
                className="w-10 h-10 rounded-full object-cover border border-purple-400/50"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-purple-700/50 border border-purple-400/50 flex items-center justify-center text-sm font-black">
                {(activeCall.name || 'A').charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-[9px] text-white/70 truncate max-w-full px-1">
              {remoteStream ? 'Audio Only' : 'Connecting...'}
            </span>
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-white/50 bg-neutral-900">
            <VideoOff className="w-5 h-5 mb-1" />
            <span className="text-[9px]">Camera Off</span>
          </div>
        )}
        <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/65 text-[9px] font-bold text-white/90 truncate max-w-[92px]">
          {canSwapPip && isLocalMain ? activeCall.name : 'You'}
        </span>
      </button>
    );
  };

  return (
    <div
      onDoubleClick={handleStageDoubleClick}
      onPointerUp={handleStagePointerUp}
      className="fixed inset-0 z-50 bg-[#06060a] text-white flex flex-col justify-between overflow-hidden animate-in fade-in select-none touch-manipulation"
    >
      {/* Screen Ring Light / Night Fill-Light Backdrop or Edge Ring */}
      <NightLightBackdrop
        active={isAnyFillLight}
        brightness={fillLightBrightness}
        tone={fillLightTone}
        layout={fillLightLayout}
      />

      {/* Full-bleed Background Video when NOT in Fill-Light Canvas mode */}
      {!isFillLightCanvas && (
        <>
          {showMainVideo && mainStream ? (
            <StreamVideo stream={mainStream} className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div className="absolute -top-32 -left-32 w-96 h-96 bg-purple-900/20 rounded-full blur-[140px]" />
              <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-900/20 rounded-full blur-[140px]" />
            </div>
          )}

          {/* Subtle overlay for legibility */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/35 to-black/90 pointer-events-none" />
        </>
      )}

      {/* Top Bar */}
      <div
        className="relative z-10 px-4 sm:px-5 pb-2 text-center space-y-2"
        style={{ paddingTop: 'max(calc(env(safe-area-inset-top, 0px) + 12px), 24px)' }}
      >
        {isAnyFillLight ? (
          <div className="space-y-2">
            <NightLightTopControls
              layout={fillLightLayout}
              onLayoutChange={setFillLightLayout}
              onClose={() => setIsNightLightActive(false)}
            />
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/75 backdrop-blur-md text-white text-xs font-semibold shadow-md">
              <span className="font-bold truncate max-w-[160px]">
                {isLocalMain && canSwapPip ? `${activeCall.name} · Self` : activeCall.name}
              </span>
              <span className="text-white/40">·</span>
              <span className="font-mono text-emerald-400 tabular-nums">
                {connectionState === 'connected'
                  ? formatTimer(durationSeconds)
                  : connectionState === 'ringing'
                  ? 'Ringing...'
                  : 'Connecting...'}
              </span>
            </div>
          </div>
        ) : (
          <>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/6 backdrop-blur-md border border-white/10 text-[11px] font-mono font-semibold text-purple-300">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
              <span>End-to-End Encrypted</span>
              {(activeCall.isGroupCall || isMultiPeer) && (
                <span className="inline-flex items-center gap-1 ml-1 pl-1.5 border-l border-white/15 text-emerald-300">
                  <Users className="w-3 h-3" />
                  {connectedCount}/{Math.max(totalInvited, remotePeers.length)}
                </span>
              )}
            </div>

            <h2 className="text-2xl font-black font-display tracking-tight text-white mt-2">
              {isLocalMain && canSwapPip ? `${activeCall.name} · Self View` : activeCall.name}
            </h2>
            <div className="text-xs font-mono text-white/50">
              {activeCall.isGroupCall
                ? `Group Call · ${Math.max(totalInvited, remotePeers.length)} participant${
                    Math.max(totalInvited, remotePeers.length) === 1 ? '' : 's'
                  }`
                : activeCall.phone}
            </div>

            {/* Dynamic Status Pill */}
            <div className="pt-1 flex items-center justify-center gap-2 flex-wrap">
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
                  Connecting media...
                </span>
              )}
              {connectionState === 'connected' && (
                <span className="inline-flex items-center gap-1.5 text-xs font-mono tabular-nums font-bold text-emerald-400 bg-emerald-500/15 px-3 py-1 rounded-full border border-emerald-500/30">
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

            {canSwapPip && (
              <div className="text-[10px] font-medium text-white/60">
                Double-tap screen to switch camera view
              </div>
            )}

            {/* Low-Light Auto-Trigger Banner */}
            {isVideoMode && (
              <div className="pt-1">
                <LowLightSuggestionBanner
                  visible={isLowLightDetected && !lowLightDismissed && !isNightLightActive}
                  onEnable={() => {
                    setIsNightLightActive(true);
                    setIsLowLightDetected(false);
                  }}
                  onDismiss={() => {
                    setLowLightDismissed(true);
                    setIsLowLightDetected(false);
                  }}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Camera Swap Toast */}
      {swapToast && (
        <div className="absolute top-36 left-1/2 -translate-x-1/2 z-30 px-3.5 py-1.5 rounded-full bg-black/80 border border-white/15 backdrop-blur-md text-xs font-bold text-white shadow-xl pointer-events-none">
          {swapToast}
        </div>
      )}

      {/* Center Body: Floating Fill-Light Video Card OR Standard Call Stage */}
      {isFillLightCanvas ? (
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-5 py-2 min-h-0">
          <div
            style={{
              boxShadow: `0 0 55px ${activeToneCfg.glowRgba}, 0 20px 45px rgba(0,0,0,0.22)`,
            }}
            className="relative w-full max-w-xs h-full max-h-[420px] min-h-[220px] bg-zinc-900 rounded-3xl overflow-hidden border-2 border-white/75 flex items-center justify-center"
          >
            {isMultiPeer ? (
              <div className="w-full h-full p-2.5 overflow-y-auto grid grid-cols-2 gap-2 content-center">
                {remotePeers.map((peer) => (
                  <RemotePeerTile key={peer.peerId} peer={peer} isVideoMode={isVideoMode} />
                ))}
              </div>
            ) : showMainVideo && mainStream ? (
              <StreamVideo stream={mainStream} className="w-full h-full object-cover" />
            ) : showMainLocalOff ? (
              <div className="flex flex-col items-center justify-center gap-2 text-white/70">
                <VideoOff className="w-8 h-8" />
                <span className="text-xs font-semibold">Your Camera is Off</span>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 p-4 text-center">
                <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-purple-600 via-indigo-600 to-amber-500 shadow-xl">
                  {activeCall.avatar ? (
                    <img
                      src={activeCall.avatar}
                      alt={activeCall.name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-[#150d26] flex items-center justify-center text-2xl font-black text-purple-200">
                      {(activeCall.name || 'A').charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <span className="text-xs text-zinc-400">
                  {connectionState === 'connected' ? 'Video Feed Active' : 'Connecting Video...'}
                </span>
              </div>
            )}

            {/* Local / Swapped PiP inside the floating card with glowing ring */}
            {!isMultiPeer && renderPipPreview(true)}

            {canSwapPip && (
              <span className="absolute bottom-2.5 left-3 px-2 py-0.5 rounded-full bg-black/65 text-[10px] font-medium text-white/85 pointer-events-none">
                Double-tap to swap
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 overflow-y-auto">
          {isMultiPeer ? (
            <div className="w-full max-w-md grid grid-cols-2 gap-3">
              {remotePeers.map((peer) => (
                <RemotePeerTile key={peer.peerId} peer={peer} isVideoMode={isVideoMode} />
              ))}
            </div>
          ) : showMainLocalOff ? (
            <div className="flex flex-col items-center justify-center gap-2 text-white/65 bg-black/45 px-6 py-5 rounded-3xl border border-white/10 backdrop-blur-md">
              <VideoOff className="w-9 h-9" />
              <span className="text-xs font-semibold">Your Camera is Off</span>
            </div>
          ) : !isVideoMode || (!isLocalMain && !remoteStream) ? (
            <div className="relative flex items-center justify-center">
              {connectionState === 'ringing' && (
                <>
                  <div className="absolute w-44 h-44 rounded-full border border-purple-500/30 animate-ping" />
                  <div className="absolute w-56 h-56 rounded-full border border-purple-500/15 animate-pulse" />
                </>
              )}

              <div className="w-28 h-28 rounded-full p-1 bg-gradient-to-tr from-purple-600 via-indigo-600 to-amber-500 shadow-2xl relative">
                {activeCall.avatar ? (
                  <img
                    src={activeCall.avatar}
                    alt={activeCall.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-[#150d26] flex items-center justify-center text-2xl font-black text-purple-200">
                    {(activeCall.name || 'A').charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {/* Link Share trigger */}
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
      )}

      {/* Video Call PiP Window when NOT in Fill-Light Canvas mode */}
      {!isFillLightCanvas && renderPipPreview(false)}

      {/* Hidden remote audio elements — plays live audio for EVERY connected remote participant */}
      {remotePeers.map((peer) =>
        peer.stream ? <RemoteStreamAudio key={`aud_${peer.peerId}`} stream={peer.stream} /> : null
      )}

      {/* Bottom Floating Fill-Light Adjuster + Call Control Dock */}
      <div
        className="relative z-10 px-4 sm:px-6 pt-2 space-y-2.5"
        style={{ paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 20px), 28px)' }}
      >
        {isAnyFillLight && (
          <NightLightAdjusterPanel
            brightness={fillLightBrightness}
            onBrightnessChange={setFillLightBrightness}
            tone={fillLightTone}
            onToneChange={setFillLightTone}
          />
        )}

        <div
          data-no-swap="true"
          className={`max-w-sm mx-auto flex items-center justify-center gap-2.5 sm:gap-3 backdrop-blur-xl rounded-full p-2.5 sm:p-3 shadow-2xl ${
            isAnyFillLight
              ? 'bg-black/80 border border-black/20'
              : 'bg-white/8 border border-white/10'
          }`}
        >
          <button
            type="button"
            onClick={toggleMute}
            className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all active:scale-90 ${
              isMuted ? 'bg-amber-500 text-black' : 'bg-white/12 text-white hover:bg-white/20'
            }`}
            title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          <button
            type="button"
            onClick={toggleSpeaker}
            className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all active:scale-90 ${
              isSpeaker ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/40' : 'bg-white/12 text-white hover:bg-white/20'
            }`}
            title={isSpeaker ? 'Speaker On' : 'Speaker Off'}
          >
            {isSpeaker ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>

          {isVideoMode && (
            <>
              <button
                type="button"
                onClick={toggleVideo}
                className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all active:scale-90 ${
                  isVideoOff ? 'bg-amber-500 text-black' : 'bg-white/12 text-white hover:bg-white/20'
                }`}
                title={isVideoOff ? 'Turn Video On' : 'Turn Video Off'}
              >
                {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
              </button>

              <button
                type="button"
                onClick={flipCamera}
                className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/12 text-white hover:bg-white/20 flex items-center justify-center transition-all active:scale-90"
                title="Flip Camera"
              >
                <SwitchCamera className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={toggleNightLight}
                className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all active:scale-90 ${
                  isNightLightActive
                    ? 'bg-amber-200 text-black shadow-[0_0_20px_rgba(255,244,214,0.85)]'
                    : isLowLightDetected
                    ? 'bg-amber-400/25 text-amber-200 border border-amber-300/60 animate-pulse'
                    : 'bg-white/12 text-white hover:bg-white/20'
                }`}
                title={isNightLightActive ? 'Turn Off Night Fill-Light' : 'Turn On Night Fill-Light'}
              >
                <Sun className="w-5 h-5" />
              </button>
            </>
          )}

          <button
            type="button"
            onClick={handleHangUp}
            className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center transition-all shadow-lg shadow-rose-600/50 active:scale-90"
            title="End Call"
          >
            <PhoneOff className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Only mount the ActiveCallSession when an activeCall is actually present
export const ActiveCallModal: React.FC = () => {
  const { activeCall, endCall } = useApp();

  if (!activeCall) return null;

  return <ActiveCallSession key={activeCall.roomId || activeCall.phone} activeCall={activeCall} onEndCall={endCall} />;
};
