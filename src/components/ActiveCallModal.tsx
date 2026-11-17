import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  Minimize2,
  Maximize2,
  MonitorUp,
  MonitorOff,
  UserPlus,
  EyeOff,
  Search,
  X,
  Clock,
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

function normalizePhoneTail(phone?: string): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  return digits.length >= 9 ? digits.slice(-9) : digits;
}

function samePhone(a?: string, b?: string): boolean {
  const ta = normalizePhoneTail(a);
  const tb = normalizePhoneTail(b);
  return Boolean(ta && tb && ta === tb);
}

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
  const showVideo = (isVideoMode || Boolean(peer.isScreenSharing)) && hasVideoTrack;
  const displayName = peer.isAnonymous ? 'Anonymous' : peer.name || 'Participant';

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (peer.stream && showVideo) {
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
  }, [peer.stream, showVideo]);

  return (
    <div className="relative rounded-2xl overflow-hidden bg-white/5 border border-white/10 aspect-[3/4] flex flex-col items-center justify-center">
      {showVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full ${peer.isScreenSharing ? 'object-contain bg-black' : 'object-cover'}`}
        />
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 p-3">
          {!peer.isAnonymous && peer.avatar ? (
            <img
              src={peer.avatar}
              alt={displayName}
              className="w-16 h-16 rounded-full object-cover border-2 border-purple-500/60"
            />
          ) : peer.isAnonymous ? (
            <div className="w-16 h-16 rounded-full bg-zinc-800 border-2 border-purple-400/50 flex items-center justify-center text-purple-300">
              <EyeOff className="w-7 h-7" />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-full bg-purple-700/40 border-2 border-purple-500/60 flex items-center justify-center text-lg font-bold">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      )}

      {peer.isScreenSharing && (
        <div className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/90 text-black text-[10px] font-bold shadow">
          <MonitorUp className="w-3 h-3" />
          <span>Screen</span>
        </div>
      )}

      {peer.isAnonymous && (
        <div className="absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/70 border border-purple-400/30 text-purple-200 text-[9px] font-semibold">
          <EyeOff className="w-2.5 h-2.5" />
          <span>Anon</span>
        </div>
      )}

      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between px-2 py-1 rounded-lg bg-black/60 backdrop-blur-sm text-[11px]">
        <span className="font-semibold truncate">{displayName}</span>
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
  const {
    currentUser,
    chats,
    deviceContacts,
    setCallMinimized,
    upgradeCallToGroup,
    inviteToActiveCall,
  } = useApp();
  const [copiedLink, setCopiedLink] = useState(false);
  const [isLocalMain, setIsLocalMain] = useState(false);
  const [callToast, setCallToast] = useState<string | null>(null);
  const [isAddParticipantOpen, setIsAddParticipantOpen] = useState(false);
  const [inviteQuery, setInviteQuery] = useState('');

  // Night Fill-Light / Screen Ring Light states
  const [isNightLightActive, setIsNightLightActive] = useState(false);
  const [fillLightBrightness, setFillLightBrightness] = useState(100);
  const [fillLightTone, setFillLightTone] = useState<FillLightTone>('white');
  const [fillLightLayout, setFillLightLayout] = useState<FillLightLayout>('canvas');
  const [isLowLightDetected, setIsLowLightDetected] = useState(false);
  const [lowLightDismissed, setLowLightDismissed] = useState(false);

  const lastTouchTapRef = useRef<{ time: number; x: number; y: number }>({ time: 0, x: 0, y: 0 });
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string, ms = 2200) => {
    setCallToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setCallToast(null), ms);
  };

  const resolvedRoomId =
    activeCall.roomId || `call_${(activeCall.phone || '').replace(/\D/g, '') || 'room'}`;
  const isVideoMode = activeCall.type === 'video';
  const isMinimized = Boolean(activeCall.isMinimized);

  const {
    localStream,
    remoteStream,
    remotePeers,
    connectionState,
    isMuted,
    isVideoOff,
    isScreenSharing,
    isSpeaker,
    durationSeconds,
    toggleMute,
    toggleVideo,
    toggleScreenShare,
    stopScreenShare,
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
    isAnonymous: Boolean(activeCall.isAnonymous),
    onCallEnded: onEndCall,
    onUpgradedToGroup: upgradeCallToGroup,
    enabled: true,
  });

  const isMultiPeer = remotePeers.length > 1;
  const isAnyRemoteSharing = remotePeers.some((p) => Boolean(p.isScreenSharing));
  const isAnyRemoteVideo = remotePeers.some(
    (p) => Boolean(p.stream && p.stream.getVideoTracks().length > 0)
  );
  const isVideoEffective = isVideoMode || isScreenSharing || isAnyRemoteSharing || isAnyRemoteVideo;
  const canSwapPip = isVideoEffective && !isMultiPeer;

  const singleRemotePeer = !isMultiPeer ? remotePeers[0] : undefined;
  const isSingleRemoteAnonymous = Boolean(
    !activeCall.isGroupCall && singleRemotePeer?.isAnonymous
  );
  const displayCallerName = isSingleRemoteAnonymous ? 'Anonymous' : activeCall.name;
  const displayCallerAvatar = isSingleRemoteAnonymous ? '' : activeCall.avatar;
  const displayCallerSub = activeCall.isGroupCall
    ? `Group Call · ${Math.max(activeCall.participantPhones?.length || 0, remotePeers.length)} participant${
        Math.max(activeCall.participantPhones?.length || 0, remotePeers.length) === 1 ? '' : 's'
      }`
    : isSingleRemoteAnonymous
    ? 'Number hidden'
    : activeCall.phone;

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  // Low-light detection via AmbientLightSensor (where supported) or camera luma sampling fallback
  useEffect(() => {
    if (!isVideoMode || isScreenSharing || isNightLightActive || lowLightDismissed || isMinimized) {
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
  }, [isVideoMode, isScreenSharing, isNightLightActive, lowLightDismissed, localStream, isVideoOff, isMinimized]);

  const toggleMainCamera = () => {
    if (!canSwapPip) return;
    setIsLocalMain((prev) => {
      const next = !prev;
      showToast(
        next
          ? isScreenSharing
            ? 'Your shared screen in main view'
            : 'Your camera in main view'
          : `${displayCallerName || 'Caller'} in main view`,
        1600
      );
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

  const handleToggleScreenShare = async () => {
    const res = await toggleScreenShare();
    if (!res.success && res.message) {
      showToast(res.message, 3200);
    } else if (res.success && res.isScreenSharing) {
      showToast('Sharing your screen', 2200);
    } else if (res.success) {
      showToast('Screen sharing stopped', 1800);
    }
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

  // Build deduplicated contact/chat list for "Add Another User to Call"
  const inviteCandidates = useMemo(() => {
    const map = new Map<
      string,
      { phone: string; name: string; avatar?: string; alreadyInCall: boolean }
    >();
    const myPhone = currentUser?.phoneNumber || '';
    const existingList = [
      ...(activeCall.participantPhones || []),
      activeCall.phone || '',
      ...remotePeers.map((p) => p.phone || ''),
    ].filter(Boolean);

    const addCandidate = (phone?: string, name?: string, avatar?: string) => {
      const clean = (phone || '').trim();
      const tail = normalizePhoneTail(clean);
      if (!tail || tail.length < 7) return;
      if (myPhone && samePhone(clean, myPhone)) return;
      const inCall = existingList.some((ep) => samePhone(ep, clean));
      const existing = map.get(tail);
      if (!existing) {
        map.set(tail, {
          phone: clean,
          name: (name || clean).trim(),
          avatar,
          alreadyInCall: inCall,
        });
      } else if (inCall && !existing.alreadyInCall) {
        map.set(tail, { ...existing, alreadyInCall: true });
      }
    };

    chats.forEach((c) => {
      if (c.isGroup || c.isChannel || c.isBot) return;
      const p = c.phone || c.phoneNumber;
      if (p) addCandidate(p, c.name, c.avatar);
    });
    deviceContacts.forEach((dc) => {
      addCandidate(dc.normalizedPhoneNumber || dc.rawPhoneNumber, dc.name, dc.avatar);
    });

    const q = inviteQuery.trim().toLowerCase();
    const qDigits = q.replace(/\D/g, '');
    return Array.from(map.values()).filter((item) => {
      if (!q) return true;
      if (item.name.toLowerCase().includes(q)) return true;
      if (qDigits && item.phone.replace(/\D/g, '').includes(qDigits)) return true;
      return false;
    });
  }, [chats, deviceContacts, currentUser?.phoneNumber, activeCall.participantPhones, activeCall.phone, remotePeers, inviteQuery]);

  const rawQueryDigits = inviteQuery.replace(/\D/g, '');
  const canInviteTypedPhone =
    rawQueryDigits.length >= 7 &&
    !samePhone(inviteQuery, currentUser?.phoneNumber) &&
    !inviteCandidates.some((c) => samePhone(c.phone, inviteQuery));

  const handleInviteTarget = (target: { phone: string; name?: string; avatar?: string }) => {
    const res = inviteToActiveCall([target]);
    if (res.invitedCount > 0) {
      showToast(`Ringing ${target.name || target.phone}...`, 2400);
    } else if (res.alreadyInCall > 0) {
      showToast(`${target.name || target.phone} is already in this call`, 2000);
    }
  };

  const mainStream = canSwapPip ? (isLocalMain ? localStream : remoteStream) : null;
  const pipStream = canSwapPip ? (isLocalMain ? remoteStream : localStream) : localStream;
  const hasRemoteVideo = Boolean(remoteStream && remoteStream.getVideoTracks().length > 0);
  const showMainLocalOff = canSwapPip && isLocalMain && isVideoOff && !isScreenSharing;
  const showMainVideo = canSwapPip && Boolean(mainStream) && !showMainLocalOff;
  const isMainStreamScreenShare =
    (isLocalMain && isScreenSharing) || (!isLocalMain && Boolean(singleRemotePeer?.isScreenSharing));
  const showPipVideo =
    isVideoEffective &&
    Boolean(pipStream) &&
    (canSwapPip ? (isLocalMain ? hasRemoteVideo : !isVideoOff || isScreenSharing) : !isVideoOff || isScreenSharing);

  const isAnyFillLight = !isMinimized && isVideoMode && isNightLightActive;
  const isFillLightCanvas = isAnyFillLight && fillLightLayout === 'canvas';
  const activeToneCfg = FILL_LIGHT_TONES[fillLightTone];

  const statusText =
    connectionState === 'connected'
      ? formatTimer(durationSeconds)
      : connectionState === 'ringing'
      ? 'Ringing...'
      : connectionState === 'requesting_permissions'
      ? 'Permissions...'
      : 'Connecting...';

  // Minimized floating call pill / video PiP (keeps ActiveCallSession + WebRTC mounted!)
  if (isMinimized) {
    const minimizedPreviewStream = mainStream || localStream;
    const showMinimizedPreview = isVideoEffective && Boolean(minimizedPreviewStream);

    return (
      <>
        {remotePeers.map((peer) =>
          peer.stream ? <RemoteStreamAudio key={`aud_${peer.peerId}`} stream={peer.stream} /> : null
        )}

        {showMinimizedPreview ? (
          <div className="fixed top-14 right-3 z-50 w-40 sm:w-44 rounded-2xl overflow-hidden bg-zinc-950/95 border border-purple-500/60 shadow-2xl pointer-events-auto animate-in fade-in slide-in-from-top-2">
            <div
              onClick={() => setCallMinimized(false)}
              className="relative w-full h-44 bg-black cursor-pointer group"
              title="Tap to expand call"
            >
              <StreamVideo
                stream={minimizedPreviewStream}
                className={`w-full h-full ${
                  isMainStreamScreenShare || isScreenSharing ? 'object-contain bg-black' : 'object-cover'
                }`}
              />
              <div className="absolute inset-x-0 top-0 p-2 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between gap-1">
                <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {statusText}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCallMinimized(false);
                  }}
                  className="w-6 h-6 rounded-full bg-black/60 hover:bg-purple-600 text-white flex items-center justify-center transition-colors"
                  title="Expand call"
                >
                  <Maximize2 className="w-3 h-3" />
                </button>
              </div>
              <div className="absolute inset-x-0 bottom-0 px-2 py-1.5 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
                <div className="text-[11px] font-bold text-white truncate flex items-center gap-1">
                  {isSingleRemoteAnonymous && <EyeOff className="w-3 h-3 text-purple-300 shrink-0" />}
                  <span className="truncate">{displayCallerName}</span>
                </div>
                {isScreenSharing && (
                  <div className="text-[9px] font-semibold text-emerald-300">Sharing your screen</div>
                )}
              </div>
            </div>

            <div className="px-2 py-1.5 bg-zinc-950 flex items-center justify-between gap-1 border-t border-white/10">
              <button
                type="button"
                onClick={toggleMute}
                className={`flex-1 h-8 rounded-xl flex items-center justify-center transition-colors ${
                  isMuted ? 'bg-amber-500 text-black' : 'bg-white/10 text-white hover:bg-white/20'
                }`}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              </button>
              {isScreenSharing && (
                <button
                  type="button"
                  onClick={stopScreenShare}
                  className="flex-1 h-8 rounded-xl bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 flex items-center justify-center transition-colors"
                  title="Stop screen share"
                >
                  <MonitorOff className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setCallMinimized(false)}
                className="flex-1 h-8 rounded-xl bg-purple-600/80 hover:bg-purple-600 text-white flex items-center justify-center transition-colors"
                title="Expand call"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleHangUp}
                className="flex-1 h-8 rounded-xl bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center transition-colors"
                title="End call"
              >
                <PhoneOff className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="fixed top-14 inset-x-0 z-50 max-w-md mx-auto px-3 py-1 pointer-events-none">
            <div
              onClick={() => setCallMinimized(false)}
              className="pointer-events-auto bg-zinc-950/95 backdrop-blur-md text-white px-3 py-2 rounded-full shadow-2xl border border-purple-500/50 flex items-center justify-between gap-2.5 cursor-pointer animate-in slide-in-from-top-2"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-full bg-purple-600/25 border border-purple-400/50 flex items-center justify-center shrink-0 relative overflow-hidden">
                  {displayCallerAvatar ? (
                    <img
                      src={displayCallerAvatar}
                      alt={displayCallerName}
                      className="w-full h-full object-cover"
                    />
                  ) : isSingleRemoteAnonymous ? (
                    <EyeOff className="w-4 h-4 text-purple-300" />
                  ) : (
                    <span className="text-xs font-black text-purple-200">
                      {(displayCallerName || 'A').charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-zinc-950 absolute -bottom-0.5 -right-0.5 animate-pulse" />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <span className="text-emerald-400 font-extrabold uppercase tracking-wider">
                      {activeCall.type === 'video' ? 'VIDEO' : 'ON CALL'}
                    </span>
                    <span className="text-zinc-500">·</span>
                    <span className="text-zinc-300 flex items-center gap-1 font-mono tabular-nums">
                      <Clock className="w-3 h-3 text-zinc-400" />
                      {statusText}
                    </span>
                    {(activeCall.isGroupCall || isMultiPeer) && (
                      <>
                        <span className="text-zinc-500">·</span>
                        <span className="text-purple-300 font-semibold">
                          {connectedCount + 1} in call
                        </span>
                      </>
                    )}
                  </div>
                  <h4 className="text-xs font-bold truncate text-white">{displayCallerName}</h4>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleMute();
                  }}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                    isMuted ? 'bg-amber-500 text-black' : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCallMinimized(false);
                  }}
                  className="w-8 h-8 rounded-full bg-purple-600/80 hover:bg-purple-600 text-white flex items-center justify-center transition-colors"
                  title="Expand call"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleHangUp();
                  }}
                  className="w-8 h-8 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center transition-colors"
                  title="End call"
                >
                  <PhoneOff className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  const renderPipPreview = (insideCard: boolean) => {
    if (!isVideoEffective) return null;
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
        title={canSwapPip ? 'Tap to swap camera views' : 'Your preview'}
        style={pipGlowStyle}
        className={`${
          insideCard ? 'absolute top-3 right-3 w-20 h-28' : 'absolute top-20 right-4 w-28 h-40'
        } z-20 rounded-2xl overflow-hidden shadow-2xl ${
          isAnyFillLight ? 'border-2 border-white' : 'border-2 border-purple-500/60'
        } bg-black/80 text-left focus:outline-none focus:ring-2 focus:ring-purple-400 transition-all active:scale-95`}
      >
        {showPipVideo && pipStream ? (
          <StreamVideo
            stream={pipStream}
            className={`w-full h-full ${
              (!isLocalMain && isScreenSharing) || (isLocalMain && singleRemotePeer?.isScreenSharing)
                ? 'object-contain bg-black'
                : 'object-cover'
            }`}
          />
        ) : canSwapPip && isLocalMain ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 p-2 bg-neutral-900">
            {displayCallerAvatar ? (
              <img
                src={displayCallerAvatar}
                alt={displayCallerName}
                className="w-10 h-10 rounded-full object-cover border border-purple-400/50"
              />
            ) : isSingleRemoteAnonymous ? (
              <div className="w-10 h-10 rounded-full bg-zinc-800 border border-purple-400/50 flex items-center justify-center text-purple-300">
                <EyeOff className="w-5 h-5" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-purple-700/50 border border-purple-400/50 flex items-center justify-center text-sm font-black">
                {(displayCallerName || 'A').charAt(0).toUpperCase()}
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
          {canSwapPip && isLocalMain
            ? displayCallerName
            : isScreenSharing
            ? 'Your Screen'
            : activeCall.isAnonymous
            ? 'You (Anon)'
            : 'You'}
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
            <StreamVideo
              stream={mainStream}
              className={`absolute inset-0 w-full h-full ${
                isMainStreamScreenShare ? 'object-contain bg-black' : 'object-cover'
              }`}
            />
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
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setCallMinimized(true)}
                className="w-9 h-9 rounded-full bg-black/65 text-white flex items-center justify-center shrink-0"
                title="Minimize call"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
              <div className="flex-1 min-w-0">
                <NightLightTopControls
                  layout={fillLightLayout}
                  onLayoutChange={setFillLightLayout}
                  onClose={() => setIsNightLightActive(false)}
                />
              </div>
              <button
                type="button"
                onClick={() => setIsAddParticipantOpen(true)}
                className="w-9 h-9 rounded-full bg-black/65 text-white flex items-center justify-center shrink-0"
                title="Add participant"
              >
                <UserPlus className="w-4 h-4" />
              </button>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/75 backdrop-blur-md text-white text-xs font-semibold shadow-md">
              <span className="font-bold truncate max-w-[160px]">
                {isLocalMain && canSwapPip ? `${displayCallerName} · Self` : displayCallerName}
              </span>
              <span className="text-white/40">·</span>
              <span className="font-mono text-emerald-400 tabular-nums">{statusText}</span>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setCallMinimized(true)}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 backdrop-blur-md text-white flex items-center justify-center transition-all active:scale-90 shrink-0"
                title="Minimize call to use app"
              >
                <Minimize2 className="w-4 h-4" />
              </button>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/6 backdrop-blur-md border border-white/10 text-[11px] font-mono font-semibold text-purple-300 truncate max-w-[230px]">
                <ShieldCheck className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span className="truncate">End-to-End Encrypted</span>
                {(activeCall.isGroupCall || isMultiPeer) && (
                  <span className="inline-flex items-center gap-1 ml-1 pl-1.5 border-l border-white/15 text-emerald-300 shrink-0">
                    <Users className="w-3 h-3" />
                    {connectedCount}/{Math.max(totalInvited, remotePeers.length)}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsAddParticipantOpen(true)}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 backdrop-blur-md text-white flex items-center justify-center transition-all active:scale-90 shrink-0"
                title="Add user to call"
              >
                <UserPlus className="w-4 h-4" />
              </button>
            </div>

            <h2 className="text-2xl font-black font-display tracking-tight text-white mt-2">
              {isLocalMain && canSwapPip ? `${displayCallerName} · Self View` : displayCallerName}
            </h2>
            <div className="text-xs font-mono text-white/50 flex items-center justify-center gap-1.5">
              {isSingleRemoteAnonymous && <EyeOff className="w-3.5 h-3.5 text-purple-300" />}
              <span>{displayCallerSub}</span>
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

              {activeCall.isAnonymous && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-200 bg-purple-600/25 px-2.5 py-1 rounded-full border border-purple-400/30">
                  <EyeOff className="w-3 h-3" />
                  Joined Anonymously
                </span>
              )}

              {isScreenSharing && (
                <button
                  type="button"
                  onClick={stopScreenShare}
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold text-black bg-emerald-400 hover:bg-emerald-300 px-2.5 py-1 rounded-full shadow transition-colors"
                >
                  <MonitorUp className="w-3 h-3" />
                  <span>Sharing Screen · Stop</span>
                </button>
              )}

              {!isScreenSharing && singleRemotePeer?.isScreenSharing && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-300 bg-emerald-500/15 px-2.5 py-1 rounded-full border border-emerald-500/30">
                  <MonitorUp className="w-3 h-3" />
                  Viewing Shared Screen
                </span>
              )}
            </div>

            {canSwapPip && (
              <div className="text-[10px] font-medium text-white/60">
                Double-tap screen to switch view
              </div>
            )}

            {/* Low-Light Auto-Trigger Banner */}
            {isVideoMode && !isScreenSharing && (
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

      {/* Transient Feedback Toast */}
      {callToast && (
        <div className="absolute top-36 left-1/2 -translate-x-1/2 z-40 px-3.5 py-1.5 rounded-full bg-black/85 border border-white/15 backdrop-blur-md text-xs font-bold text-white shadow-xl pointer-events-none whitespace-nowrap">
          {callToast}
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
                  <RemotePeerTile key={peer.peerId} peer={peer} isVideoMode={isVideoEffective} />
                ))}
              </div>
            ) : showMainVideo && mainStream ? (
              <StreamVideo
                stream={mainStream}
                className={`w-full h-full ${isMainStreamScreenShare ? 'object-contain bg-black' : 'object-cover'}`}
              />
            ) : showMainLocalOff ? (
              <div className="flex flex-col items-center justify-center gap-2 text-white/70">
                <VideoOff className="w-8 h-8" />
                <span className="text-xs font-semibold">Your Camera is Off</span>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 p-4 text-center">
                <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-purple-600 via-indigo-600 to-amber-500 shadow-xl">
                  {displayCallerAvatar ? (
                    <img
                      src={displayCallerAvatar}
                      alt={displayCallerName}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : isSingleRemoteAnonymous ? (
                    <div className="w-full h-full rounded-full bg-[#150d26] flex items-center justify-center text-purple-300">
                      <EyeOff className="w-9 h-9" />
                    </div>
                  ) : (
                    <div className="w-full h-full rounded-full bg-[#150d26] flex items-center justify-center text-2xl font-black text-purple-200">
                      {(displayCallerName || 'A').charAt(0).toUpperCase()}
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
                <RemotePeerTile key={peer.peerId} peer={peer} isVideoMode={isVideoEffective} />
              ))}
            </div>
          ) : showMainLocalOff ? (
            <div className="flex flex-col items-center justify-center gap-2 text-white/65 bg-black/45 px-6 py-5 rounded-3xl border border-white/10 backdrop-blur-md">
              <VideoOff className="w-9 h-9" />
              <span className="text-xs font-semibold">Your Camera is Off</span>
            </div>
          ) : !isVideoEffective || (!isLocalMain && !remoteStream) ? (
            <div className="relative flex items-center justify-center">
              {connectionState === 'ringing' && (
                <>
                  <div className="absolute w-44 h-44 rounded-full border border-purple-500/30 animate-ping" />
                  <div className="absolute w-56 h-56 rounded-full border border-purple-500/15 animate-pulse" />
                </>
              )}

              <div className="w-28 h-28 rounded-full p-1 bg-gradient-to-tr from-purple-600 via-indigo-600 to-amber-500 shadow-2xl relative">
                {displayCallerAvatar ? (
                  <img
                    src={displayCallerAvatar}
                    alt={displayCallerName}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : isSingleRemoteAnonymous ? (
                  <div className="w-full h-full rounded-full bg-[#150d26] flex items-center justify-center text-purple-300">
                    <EyeOff className="w-10 h-10" />
                  </div>
                ) : (
                  <div className="w-full h-full rounded-full bg-[#150d26] flex items-center justify-center text-2xl font-black text-purple-200">
                    {(displayCallerName || 'A').charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {/* Link Share + Quick Add User Actions */}
          <div className="mt-8 flex items-center justify-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/15 text-white/85 hover:text-white backdrop-blur-md border border-white/10 text-xs font-semibold transition-all active:scale-95"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Call Link Copied!' : 'Share Call Link'}</span>
            </button>
            <button
              type="button"
              onClick={() => setIsAddParticipantOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-600/30 hover:bg-purple-600/45 text-purple-100 backdrop-blur-md border border-purple-400/30 text-xs font-semibold transition-all active:scale-95"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add Person</span>
            </button>
          </div>
        </div>
      )}

      {/* Video / Screen Share Call PiP Window when NOT in Fill-Light Canvas mode */}
      {!isFillLightCanvas && renderPipPreview(false)}

      {/* Hidden remote audio elements — plays live audio for EVERY connected remote participant */}
      {remotePeers.map((peer) =>
        peer.stream ? <RemoteStreamAudio key={`aud_${peer.peerId}`} stream={peer.stream} /> : null
      )}

      {/* Add Participant Overlay Drawer */}
      {isAddParticipantOpen && (
        <div
          data-no-swap="true"
          onClick={() => setIsAddParticipantOpen(false)}
          className="fixed inset-0 z-30 bg-black/75 backdrop-blur-md flex items-end sm:items-center justify-center p-3 sm:p-5"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-zinc-950 border border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[82vh]"
          >
            <div className="px-4 py-3.5 border-b border-white/10 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-purple-400" />
                  <span>Add Another User to Call</span>
                </h3>
                <p className="text-[11px] text-white/55 mt-0.5">
                  Invited users can choose to show their number or join anonymously.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddParticipantOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white/80 flex items-center justify-center shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 border-b border-white/10">
              <div className="relative">
                <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={inviteQuery}
                  onChange={(e) => setInviteQuery(e.target.value)}
                  placeholder="Search contact or type phone number..."
                  className="w-full pl-9 pr-3 py-2.5 rounded-2xl bg-white/8 border border-white/10 text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-purple-400"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {canInviteTypedPhone && (
                <div className="flex items-center justify-between gap-2 p-2.5 rounded-2xl bg-purple-600/20 border border-purple-400/30">
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate">{inviteQuery.trim()}</div>
                    <div className="text-[10px] text-purple-200/80">Invite phone number directly</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      handleInviteTarget({ phone: inviteQuery.trim(), name: inviteQuery.trim() });
                      setInviteQuery('');
                    }}
                    className="px-3 py-1.5 rounded-full bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shrink-0"
                  >
                    Invite
                  </button>
                </div>
              )}

              {inviteCandidates.length === 0 ? (
                <div className="py-8 text-center text-xs text-white/45">
                  No matching contacts. Type a full phone number above to ring them directly.
                </div>
              ) : (
                inviteCandidates.map((person) => (
                  <div
                    key={person.phone}
                    className="flex items-center justify-between gap-3 p-2.5 rounded-2xl bg-white/5 hover:bg-white/8 border border-white/8"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {person.avatar ? (
                        <img
                          src={person.avatar}
                          alt={person.name}
                          className="w-10 h-10 rounded-full object-cover border border-white/15 shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-purple-700/40 border border-purple-400/40 flex items-center justify-center text-xs font-black text-purple-200 shrink-0">
                          {person.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">{person.name}</div>
                        <div className="text-[11px] font-mono text-white/45 truncate">{person.phone}</div>
                      </div>
                    </div>

                    {person.alreadyInCall ? (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold shrink-0">
                        In Call
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleInviteTarget(person)}
                        className="px-3 py-1.5 rounded-full bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shrink-0 transition-colors active:scale-95"
                      >
                        Add
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Floating Fill-Light Adjuster + Call Control Dock */}
      <div
        className="relative z-10 px-3 sm:px-6 pt-2 space-y-2.5"
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
          className={`max-w-md mx-auto flex items-center justify-center gap-2 sm:gap-2.5 backdrop-blur-xl rounded-full p-2 sm:p-2.5 shadow-2xl ${
            isAnyFillLight
              ? 'bg-black/80 border border-black/20'
              : 'bg-white/8 border border-white/10'
          }`}
        >
          <button
            type="button"
            onClick={toggleMute}
            className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-all active:scale-90 ${
              isMuted ? 'bg-amber-500 text-black' : 'bg-white/12 text-white hover:bg-white/20'
            }`}
            title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
          >
            {isMuted ? <MicOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Mic className="w-4 h-4 sm:w-5 sm:h-5" />}
          </button>

          <button
            type="button"
            onClick={toggleSpeaker}
            className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-all active:scale-90 ${
              isSpeaker ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/40' : 'bg-white/12 text-white hover:bg-white/20'
            }`}
            title={isSpeaker ? 'Speaker On' : 'Speaker Off'}
          >
            {isSpeaker ? <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" /> : <VolumeX className="w-4 h-4 sm:w-5 sm:h-5" />}
          </button>

          {isVideoMode && (
            <>
              <button
                type="button"
                onClick={toggleVideo}
                className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-all active:scale-90 ${
                  isVideoOff ? 'bg-amber-500 text-black' : 'bg-white/12 text-white hover:bg-white/20'
                }`}
                title={isVideoOff ? 'Turn Video On' : 'Turn Video Off'}
              >
                {isVideoOff ? <VideoOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Video className="w-4 h-4 sm:w-5 sm:h-5" />}
              </button>

              {!isScreenSharing && (
                <button
                  type="button"
                  onClick={flipCamera}
                  className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/12 text-white hover:bg-white/20 flex items-center justify-center transition-all active:scale-90"
                  title="Flip Camera"
                >
                  <SwitchCamera className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              )}

              <button
                type="button"
                onClick={toggleNightLight}
                className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-all active:scale-90 ${
                  isNightLightActive
                    ? 'bg-amber-200 text-black shadow-[0_0_20px_rgba(255,244,214,0.85)]'
                    : isLowLightDetected
                    ? 'bg-amber-400/25 text-amber-200 border border-amber-300/60 animate-pulse'
                    : 'bg-white/12 text-white hover:bg-white/20'
                }`}
                title={isNightLightActive ? 'Turn Off Night Fill-Light' : 'Turn On Night Fill-Light'}
              >
                <Sun className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </>
          )}

          <button
            type="button"
            onClick={handleToggleScreenShare}
            className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-all active:scale-90 ${
              isScreenSharing
                ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/40'
                : 'bg-white/12 text-white hover:bg-white/20'
            }`}
            title={isScreenSharing ? 'Stop Screen Sharing' : 'Share Screen'}
          >
            {isScreenSharing ? (
              <MonitorOff className="w-4 h-4 sm:w-5 sm:h-5" />
            ) : (
              <MonitorUp className="w-4 h-4 sm:w-5 sm:h-5" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsAddParticipantOpen(true)}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/12 text-white hover:bg-white/20 flex items-center justify-center transition-all active:scale-90"
            title="Add user to call"
          >
            <UserPlus className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <button
            type="button"
            onClick={handleHangUp}
            className="w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center transition-all shadow-lg shadow-rose-600/50 active:scale-90 shrink-0"
            title="End Call"
          >
            <PhoneOff className="w-5 h-5 sm:w-6 sm:h-6" />
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
