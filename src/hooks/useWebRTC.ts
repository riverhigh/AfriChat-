import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { getSocket, emitCallSignal, joinWebRTCCallRoom, leaveWebRTCCallRoom } from '../services/socket';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    // Google STUN (fast, local networks)
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    // OpenRelay free public TURN (crosses symmetric NAT — mobile 4G/5G)
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    // Cloudflare STUN fallback
    { urls: 'stun:stun.cloudflare.com:3478' },
  ],
  iceCandidatePoolSize: 4,
};

export interface UseWebRTCOptions {
  roomId: string;
  callType: 'voice' | 'video';
  isInitiator: boolean;
  userPhone?: string;
  userName?: string;
  userAvatar?: string;
  isGroupCall?: boolean;
  isAnonymous?: boolean;
  onCallEnded?: () => void;
  onUpgradedToGroup?: () => void;
  enabled?: boolean;
}

export interface RemotePeerMedia {
  peerId: string;
  name: string;
  phone?: string;
  avatar?: string;
  isAnonymous?: boolean;
  isScreenSharing?: boolean;
  stream: MediaStream | null;
  connectionState: string;
}

export type CallConnectionState =
  | 'idle'
  | 'requesting_permissions'
  | 'ringing'
  | 'connecting'
  | 'connected'
  | 'ended'
  | 'error';

interface PeerEntry {
  peerId: string;
  name: string;
  phone?: string;
  avatar?: string;
  isAnonymous?: boolean;
  isScreenSharing?: boolean;
  pc: RTCPeerConnection;
  stream: MediaStream;
  iceQueue: RTCIceCandidateInit[];
  hasSentOffer: boolean;
  disconnectTimer?: number | null;
}

// ── Fallback Media Stream Generator ──────────────────────────────────────────
// Used ONLY when hardware mic/camera permission is denied or device is busy,
// so WebRTC peer negotiation can still complete cleanly.
function createFallbackStream(isVideo: boolean): MediaStream {
  const stream = new MediaStream();
  let audioCtx: AudioContext | null = null;
  let audioOsc: OscillatorNode | null = null;
  let rafId: number | null = null;
  let stopped = false;

  const stopResources = () => {
    stopped = true;
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    if (audioOsc) {
      try { audioOsc.stop(); } catch (_) {}
      try { audioOsc.disconnect(); } catch (_) {}
      audioOsc = null;
    }
    if (audioCtx && audioCtx.state !== 'closed') {
      audioCtx.close().catch(() => {});
      audioCtx = null;
    }
  };

  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    audioCtx = ctx;
    const dest = ctx.createMediaStreamDestination();
    const osc = ctx.createOscillator();
    audioOsc = osc;
    const gain = ctx.createGain();
    gain.gain.value = 0.0001;
    osc.connect(gain);
    gain.connect(dest);
    osc.start();
    dest.stream.getAudioTracks().forEach((t) => {
      const origStop = t.stop.bind(t);
      t.stop = () => {
        stopResources();
        origStop();
      };
      stream.addTrack(t);
    });
  } catch {
    // Web audio blocked
  }

  if (isVideo) {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 480;
      canvas.height = 360;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        let frame = 0;
        const render = () => {
          if (stopped) return;
          frame++;
          ctx.fillStyle = '#0f0820';
          ctx.fillRect(0, 0, 480, 360);

          const pulse = Math.sin(frame * 0.05) * 15;
          ctx.beginPath();
          ctx.arc(240, 180, 50 + pulse, 0, Math.PI * 2);
          ctx.fillStyle = '#9333ea';
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 18px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('AGC Video', 240, 185);

          rafId = requestAnimationFrame(render);
        };
        render();

        const canvasStream = (canvas as HTMLCanvasElement & { captureStream(fps?: number): MediaStream }).captureStream(15);
        canvasStream.getVideoTracks().forEach((t) => {
          const origStop = t.stop.bind(t);
          t.stop = () => {
            stopResources();
            origStop();
          };
          stream.addTrack(t);
        });
      }
    } catch {
      // Canvas stream unsupported
    }
  }

  return stream;
}

export function useWebRTC({
  roomId,
  callType,
  isInitiator,
  userPhone,
  userName,
  userAvatar,
  isGroupCall = false,
  isAnonymous = false,
  onCallEnded,
  onUpgradedToGroup,
  enabled = true,
}: UseWebRTCOptions) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [remotePeers, setRemotePeers] = useState<RemotePeerMedia[]>([]);
  const [connectionState, setConnectionState] = useState<CallConnectionState>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(callType === 'voice');
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [durationSeconds, setDurationSeconds] = useState(0);

  // Stable refs so callback/prop identity changes NEVER tear down the call
  const onCallEndedRef = useRef(onCallEnded);
  onCallEndedRef.current = onCallEnded;
  const onUpgradedToGroupRef = useRef(onUpgradedToGroup);
  onUpgradedToGroupRef.current = onUpgradedToGroup;
  const userPhoneRef = useRef(userPhone || '');
  userPhoneRef.current = userPhone || '';
  const userNameRef = useRef(userName || 'AGC User');
  userNameRef.current = userName || 'AGC User';
  const userAvatarRef = useRef(userAvatar || '');
  userAvatarRef.current = userAvatar || '';
  const isGroupCallRef = useRef(isGroupCall);
  isGroupCallRef.current = isGroupCall;
  const isAnonymousRef = useRef(Boolean(isAnonymous));
  isAnonymousRef.current = Boolean(isAnonymous);
  const isInitiatorRef = useRef(isInitiator);
  isInitiatorRef.current = isInitiator;
  const roomIdRef = useRef(roomId);
  roomIdRef.current = roomId;
  const callTypeRef = useRef(callType);
  callTypeRef.current = callType;
  const isScreenSharingRef = useRef(false);
  const isVideoOffRef = useRef(callType === 'voice');
  isVideoOffRef.current = isVideoOff;
  const facingModeRef = useRef<'user' | 'environment'>('user');
  facingModeRef.current = facingMode;
  const wasVideoOffBeforeShareRef = useRef<boolean>(callType === 'voice');
  const screenStreamRef = useRef<MediaStream | null>(null);

  // Session-unique peer ID for glare-free mesh signaling
  const myPeerIdRef = useRef<string>('');
  if (!myPeerIdRef.current) {
    const clean = isAnonymous ? 'anon' : ((userPhone || '').replace(/\D/g, '') || 'peer');
    myPeerIdRef.current = `${clean}_${Math.random().toString(36).slice(2, 8)}`;
  }

  const peersRef = useRef<Map<string, PeerEntry>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const supabaseChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const ringtoneIntervalRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<number | null>(null);
  const processedSignalsRef = useRef<Set<string>>(new Set());
  const signalQueueRef = useRef<Array<{ event: string; payload: any }>>([]);
  const pendingInboundSignalsRef = useRef<Array<{ event: string; payload: any }>>([]);
  const supabaseReadyRef = useRef<boolean>(false);
  const isMediaReadyRef = useRef<boolean>(false);
  const endedFlagRef = useRef<boolean>(false);
  const signalSeqRef = useRef<number>(0);
  const socketListenerRef = useRef<((data: { roomId: string; event: string; data: any }) => void) | null>(null);
  const signalChainRef = useRef<Promise<void>>(Promise.resolve());

  // ── Web Audio Ringback Tone Synthesizer ────────────────────────────────────
  const playTone = useCallback((freq1: number, freq2: number, durationMs: number) => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new AudioCtx();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc1.frequency.setValueAtTime(freq1, now);
      osc2.frequency.setValueAtTime(freq2, now);

      gainNode.gain.setValueAtTime(0.035, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + durationMs / 1000);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + durationMs / 1000);
      osc2.stop(now + durationMs / 1000);
    } catch {
      // AudioContext unavailable
    }
  }, []);

  const stopRingtone = useCallback(() => {
    if (ringtoneIntervalRef.current) {
      clearInterval(ringtoneIntervalRef.current);
      ringtoneIntervalRef.current = null;
    }
  }, []);

  const startRingtone = useCallback(() => {
    if (ringtoneIntervalRef.current) return;
    playTone(440, 480, 900);
    ringtoneIntervalRef.current = window.setInterval(() => {
      playTone(440, 480, 900);
    }, 3000);
  }, [playTone]);

  const playEndTone = useCallback(() => {
    stopRingtone();
    playTone(480, 400, 280);
  }, [playTone, stopRingtone]);

  const startDurationTimer = useCallback(() => {
    if (timerIntervalRef.current) return;
    timerIntervalRef.current = window.setInterval(() => {
      setDurationSeconds((prev) => prev + 1);
    }, 1000);
  }, []);

  // Sync React state with peer map (reuses entry.stream to avoid flickering media elements)
  const syncRemotePeersState = useCallback(() => {
    const list: RemotePeerMedia[] = [];
    let primaryStream: MediaStream | null = null;
    peersRef.current.forEach((entry) => {
      const tracks = entry.stream.getTracks();
      const hasTracks = tracks.length > 0;
      const activeStream = hasTracks ? entry.stream : null;
      if (!primaryStream && activeStream) {
        primaryStream = activeStream;
      }
      list.push({
        peerId: entry.peerId,
        name: entry.isAnonymous ? 'Anonymous' : entry.name,
        phone: entry.isAnonymous ? undefined : entry.phone,
        avatar: entry.isAnonymous ? undefined : entry.avatar,
        isAnonymous: Boolean(entry.isAnonymous),
        isScreenSharing: Boolean(entry.isScreenSharing),
        stream: activeStream,
        connectionState: entry.pc.connectionState || entry.pc.iceConnectionState || 'connecting',
      });
    });
    setRemotePeers(list);
    setRemoteStream(primaryStream);
  }, []);

  // ── Multi-Transport Signal Sender ──────────────────────────────────────────
  const flushSignalQueue = useCallback(() => {
    if (!supabaseChannelRef.current || !supabaseReadyRef.current) return;
    while (signalQueueRef.current.length > 0) {
      const queued = signalQueueRef.current.shift();
      if (!queued) continue;
      try {
        Promise.resolve(
          supabaseChannelRef.current.send({
            type: 'broadcast',
            event: queued.event,
            payload: queued.payload,
          })
        ).catch(() => {});
      } catch (err) {
        console.warn('Supabase flush error:', err);
      }
    }
  }, []);

  const sendSignal = useCallback((event: string, rawPayload: Record<string, any> = {}) => {
    const activeRoom = roomIdRef.current;
    if (!activeRoom) return;

    signalSeqRef.current += 1;
    const sigId = `${myPeerIdRef.current}_${event}_${signalSeqRef.current}_${Date.now()}`;
    const anon = isAnonymousRef.current;
    const payload = {
      ...rawPayload,
      _sigId: sigId,
      _fromPeerId: myPeerIdRef.current,
      _fromName: anon ? 'Anonymous' : userNameRef.current,
      _fromPhone: anon ? '' : userPhoneRef.current,
      _fromAvatar: anon ? '' : userAvatarRef.current,
      _isAnonymous: anon,
      _isScreenSharing: isScreenSharingRef.current,
    };

    // Mark our own signal ID processed so we never echo-handle it
    processedSignalsRef.current.add(sigId);

    // 1. BroadcastChannel (same-browser tabs)
    try {
      broadcastChannelRef.current?.postMessage({
        event,
        payload,
        id: sigId,
        roomId: activeRoom,
      });
    } catch (_) {}

    // 2. Socket.IO relay
    try {
      emitCallSignal(activeRoom, event, payload);
    } catch (_) {}

    // 3. Supabase Realtime Broadcast
    if (isSupabaseConfigured) {
      if (supabaseReadyRef.current && supabaseChannelRef.current) {
        try {
          Promise.resolve(
            supabaseChannelRef.current.send({
              type: 'broadcast',
              event,
              payload,
            })
          ).catch(() => {
            signalQueueRef.current.push({ event, payload });
          });
        } catch {
          signalQueueRef.current.push({ event, payload });
        }
      } else {
        signalQueueRef.current.push({ event, payload });
      }
    }
  }, []);

  // ── Cleanup ────────────────────────────────────────────────────────────────
  const cleanup = useCallback((deferSupabaseUnsubMs: number = 0) => {
    stopRingtone();
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    // Remove Socket.IO listener cleanly
    try {
      const socket = getSocket();
      if (socket && socketListenerRef.current) {
        socket.off('call_signal', socketListenerRef.current);
      }
      socketListenerRef.current = null;
      if (roomIdRef.current) {
        leaveWebRTCCallRoom(roomIdRef.current);
      }
    } catch (_) {}

    // Close all peer connections
    peersRef.current.forEach((entry) => {
      if (entry.disconnectTimer) clearTimeout(entry.disconnectTimer);
      try {
        entry.pc.onicecandidate = null;
        entry.pc.ontrack = null;
        entry.pc.onconnectionstatechange = null;
        entry.pc.oniceconnectionstatechange = null;
        entry.pc.close();
      } catch (_) {}
    });
    peersRef.current.clear();

    // Stop screen share stream if active
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => {
        try {
          track.onended = null;
          track.stop();
        } catch (_) {}
      });
      screenStreamRef.current = null;
    }
    isScreenSharingRef.current = false;
    setIsScreenSharing(false);

    // Stop local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
          track.enabled = false;
        } catch (_) {}
      });
      localStreamRef.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
    setRemotePeers([]);

    // Close BroadcastChannel
    if (broadcastChannelRef.current) {
      try {
        broadcastChannelRef.current.close();
      } catch (_) {}
      broadcastChannelRef.current = null;
    }

    // Unsubscribe Supabase channel (optionally deferred so webrtc_end flushes)
    const sbCh = supabaseChannelRef.current;
    supabaseChannelRef.current = null;
    supabaseReadyRef.current = false;
    if (sbCh) {
      const closeSb = () => {
        try {
          Promise.resolve(sbCh.unsubscribe())
            .catch(() => {})
            .finally(() => {
              try {
                supabase.removeChannel(sbCh);
              } catch (_) {}
            });
        } catch (_) {}
      };
      if (deferSupabaseUnsubMs > 0) {
        setTimeout(closeSb, deferSupabaseUnsubMs);
      } else {
        closeSb();
      }
    }

    // Close ringtone AudioContext
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
    }
    audioContextRef.current = null;

    // Reset all signaling/media state refs
    isMediaReadyRef.current = false;
    signalQueueRef.current = [];
    pendingInboundSignalsRef.current = [];
    processedSignalsRef.current.clear();
  }, [stopRingtone]);

  const isPcClosed = (pc: RTCPeerConnection): boolean =>
    (pc.signalingState as string) === 'closed';

  // ── Get or Create PeerConnection for a Specific Remote Peer ────────────────
  const getOrCreatePeer = useCallback(
    (
      remotePeerId: string,
      meta?: {
        _fromName?: string;
        _fromPhone?: string;
        _fromAvatar?: string;
        _isAnonymous?: boolean;
        _isScreenSharing?: boolean;
      }
    ): PeerEntry | null => {
      const existing = peersRef.current.get(remotePeerId);
      if (existing) {
        if (meta?._isAnonymous !== undefined) {
          existing.isAnonymous = Boolean(meta._isAnonymous);
          if (existing.isAnonymous) {
            existing.name = 'Anonymous';
            existing.phone = undefined;
            existing.avatar = undefined;
          }
        }
        if (!existing.isAnonymous) {
          if (meta?._fromName && existing.name === 'Participant') existing.name = meta._fromName;
          if (meta?._fromPhone && !existing.phone) existing.phone = meta._fromPhone;
          if (meta?._fromAvatar && !existing.avatar) existing.avatar = meta._fromAvatar;
        }
        if (meta?._isScreenSharing !== undefined) {
          existing.isScreenSharing = Boolean(meta._isScreenSharing);
        }
        return existing;
      }

      const stream = localStreamRef.current;
      if (!stream) return null;

      let pc: RTCPeerConnection;
      try {
        pc = new RTCPeerConnection(ICE_SERVERS);
      } catch (err) {
        console.error('RTCPeerConnection unavailable:', err);
        setErrorMessage('WebRTC calling is not supported in this browser.');
        setConnectionState('error');
        return null;
      }

      const isPeerAnon = Boolean(meta?._isAnonymous);
      const entry: PeerEntry = {
        peerId: remotePeerId,
        name: isPeerAnon ? 'Anonymous' : (meta?._fromName || 'Participant'),
        phone: isPeerAnon ? undefined : meta?._fromPhone,
        avatar: isPeerAnon ? undefined : meta?._fromAvatar,
        isAnonymous: isPeerAnon,
        isScreenSharing: Boolean(meta?._isScreenSharing),
        pc,
        stream: new MediaStream(),
        iceQueue: [],
        hasSentOffer: false,
        disconnectTimer: null,
      };
      peersRef.current.set(remotePeerId, entry);

      // Automatically upgrade to multi-peer mode if >1 remote peer joins
      if (peersRef.current.size > 1 && !isGroupCallRef.current) {
        isGroupCallRef.current = true;
        onUpgradedToGroupRef.current?.();
      }

      // Attach local tracks
      stream.getTracks().forEach((track) => {
        try {
          pc.addTrack(track, stream);
        } catch (_) {}
      });

      // Handle remote tracks (accumulates both audio & video tracks cleanly)
      pc.ontrack = (event) => {
        if (endedFlagRef.current || pc.signalingState === 'closed') return;
        const incomingTracks =
          event.streams && event.streams[0]
            ? event.streams[0].getTracks()
            : event.track
            ? [event.track]
            : [];

        let changed = false;
        incomingTracks.forEach((t) => {
          if (!entry.stream.getTracks().some((existingTrack) => existingTrack.id === t.id)) {
            entry.stream.addTrack(t);
            changed = true;
          }
        });
        if (event.track && !entry.stream.getTracks().some((t) => t.id === event.track.id)) {
          entry.stream.addTrack(event.track);
          changed = true;
        }

        if (changed || entry.stream.getTracks().length > 0) {
          syncRemotePeersState();
        }
        stopRingtone();
        setConnectionState('connected');
        startDurationTimer();
      };

      // Handle ICE candidates -> targeted to remotePeerId
      pc.onicecandidate = (event) => {
        if (endedFlagRef.current || pc.signalingState === 'closed') return;
        if (event.candidate) {
          sendSignal('webrtc_ice', {
            _targetPeerId: remotePeerId,
            candidate: event.candidate.toJSON(),
          });
        }
      };

      const markConnected = () => {
        if (endedFlagRef.current || pc.signalingState === 'closed') return;
        if (entry.disconnectTimer) {
          clearTimeout(entry.disconnectTimer);
          entry.disconnectTimer = null;
        }
        stopRingtone();
        setConnectionState('connected');
        startDurationTimer();
        syncRemotePeersState();
      };

      pc.oniceconnectionstatechange = () => {
        if (endedFlagRef.current || pc.signalingState === 'closed') return;
        const iceState = pc.iceConnectionState;
        if (iceState === 'connected' || iceState === 'completed') {
          markConnected();
        } else if (iceState === 'disconnected') {
          if (!entry.disconnectTimer) {
            entry.disconnectTimer = window.setTimeout(() => {
              entry.disconnectTimer = null;
              if (endedFlagRef.current || pc.signalingState === 'closed') return;
              if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
                // In group call, remove stale peer; in 1-on-1, keep trying unless ended
                if (isGroupCallRef.current && peersRef.current.size > 1) {
                  try { pc.close(); } catch (_) {}
                  peersRef.current.delete(remotePeerId);
                  syncRemotePeersState();
                }
              }
            }, 6000);
          }
        } else if (iceState === 'failed') {
          // Attempt ICE restart if we are the offerer
          if (myPeerIdRef.current.localeCompare(remotePeerId) < 0 && typeof pc.restartIce === 'function') {
            try {
              pc.restartIce();
              pc.createOffer({ iceRestart: true })
                .then((offer) => {
                  if (endedFlagRef.current || isPcClosed(pc)) return null;
                  return pc.setLocalDescription(offer).then(() => pc.localDescription || offer);
                })
                .then((sdp) => {
                  if (!sdp || endedFlagRef.current) return;
                  sendSignal('webrtc_offer', {
                    _targetPeerId: remotePeerId,
                    sdp: { type: sdp.type, sdp: sdp.sdp },
                  });
                })
                .catch(() => {});
            } catch (_) {}
          }
        }
      };

      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        if (state === 'connected') {
          markConnected();
        } else if (state === 'closed') {
          peersRef.current.delete(remotePeerId);
          syncRemotePeersState();
        }
      };

      syncRemotePeersState();
      return entry;
    },
    [sendSignal, startDurationTimer, stopRingtone, syncRemotePeersState]
  );

  // ── Create & Send Offer to a Specific Peer ─────────────────────────────────
  const sendOfferToPeer = useCallback(
    async (entry: PeerEntry, forceResendIfPending = false) => {
      if (endedFlagRef.current) return;
      const pc = entry.pc;
      if (pc.signalingState === 'closed') return;

      // If we already sent an offer and are still waiting for an answer with no ICE progress,
      // re-emit the existing localDescription safely without calling createOffer() again.
      if (entry.hasSentOffer) {
        if (
          forceResendIfPending &&
          pc.signalingState === 'have-local-offer' &&
          pc.localDescription &&
          pc.iceConnectionState === 'new'
        ) {
          sendSignal('webrtc_offer', {
            _targetPeerId: entry.peerId,
            sdp: { type: pc.localDescription.type, sdp: pc.localDescription.sdp },
          });
        }
        return;
      }

      try {
        entry.hasSentOffer = true;
        setConnectionState((prev) => (prev === 'connected' ? 'connected' : 'connecting'));
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
        });
        if (endedFlagRef.current || isPcClosed(pc)) return;
        await pc.setLocalDescription(offer);
        const sdp = pc.localDescription || offer;
        sendSignal('webrtc_offer', {
          _targetPeerId: entry.peerId,
          sdp: { type: sdp.type, sdp: sdp.sdp },
        });
      } catch (err) {
        entry.hasSentOffer = false;
        console.error('Error creating WebRTC offer:', err);
      }
    },
    [sendSignal]
  );

  // ── Process Inbound Signal (serialized to prevent SDP/ICE race conditions) ──
  const processInboundSignal = useCallback(
    async (event: string, payload: any) => {
      if (!payload || endedFlagRef.current) return;

      const sigId = payload._sigId as string | undefined;
      const fromPeerId = payload._fromPeerId as string | undefined;
      const targetPeerId = payload._targetPeerId as string | undefined;

      // Ignore self-originated signals
      if (fromPeerId && fromPeerId === myPeerIdRef.current) return;

      // Ignore signals explicitly addressed to another peer
      if (targetPeerId && targetPeerId !== myPeerIdRef.current) return;

      // Deduplicate across BroadcastChannel + Socket.IO + Supabase Realtime
      if (sigId) {
        if (processedSignalsRef.current.has(sigId)) return;
        processedSignalsRef.current.add(sigId);
      }

      // Handle hangup IMMEDIATELY even if local media permissions are still pending
      if (event === 'webrtc_end') {
        if (
          !isGroupCallRef.current ||
          payload.isHostCancel ||
          peersRef.current.size <= 1
        ) {
          endedFlagRef.current = true;
          setConnectionState('ended');
          playEndTone();
          cleanup(0);
          onCallEndedRef.current?.();
        } else if (fromPeerId) {
          const entry = peersRef.current.get(fromPeerId);
          if (entry) {
            if (entry.disconnectTimer) clearTimeout(entry.disconnectTimer);
            try { entry.pc.close(); } catch (_) {}
            peersRef.current.delete(fromPeerId);
            syncRemotePeersState();
          }
        }
        return;
      }

      // Buffer signals if getUserMedia hasn't resolved yet so NO offer is ever dropped
      if (!isMediaReadyRef.current || !localStreamRef.current) {
        pendingInboundSignalsRef.current.push({ event, payload });
        return;
      }

      const senderPeerId = fromPeerId || 'legacy_peer';
      const iAmOfferer = myPeerIdRef.current.localeCompare(senderPeerId) < 0;

      if (event === 'peer_join' || event === 'receiver_ready') {
        const entry = getOrCreatePeer(senderPeerId, payload);
        if (!entry || entry.pc.signalingState === 'closed') return;
        stopRingtone();
        setConnectionState((prev) => (prev === 'connected' ? 'connected' : 'connecting'));

        if (iAmOfferer) {
          await sendOfferToPeer(entry, true);
        } else {
          // Let the offerer know immediately we are media-ready too
          sendSignal('peer_ack', { _targetPeerId: senderPeerId });
        }
      } else if (event === 'peer_ack') {
        const entry = getOrCreatePeer(senderPeerId, payload);
        if (!entry || entry.pc.signalingState === 'closed') return;
        stopRingtone();
        setConnectionState((prev) => (prev === 'connected' ? 'connected' : 'connecting'));

        if (iAmOfferer) {
          await sendOfferToPeer(entry, true);
        }
      } else if (event === 'webrtc_offer') {
        const entry = getOrCreatePeer(senderPeerId, payload);
        if (!entry || !payload.sdp || entry.pc.signalingState === 'closed') return;

        try {
          stopRingtone();
          setConnectionState((prev) => (prev === 'connected' ? 'connected' : 'connecting'));

          if (entry.pc.signalingState !== 'stable') {
            if (!iAmOfferer) {
              await entry.pc.setLocalDescription({ type: 'rollback' }).catch(() => {});
            } else {
              // Impolite offerer already sent an offer; ignore colliding offer
              return;
            }
          }

          if (endedFlagRef.current || isPcClosed(entry.pc)) return;
          await entry.pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));

          while (entry.iceQueue.length > 0) {
            if (endedFlagRef.current || isPcClosed(entry.pc)) break;
            const cand = entry.iceQueue.shift();
            if (cand) {
              await entry.pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
            }
          }

          if (endedFlagRef.current || isPcClosed(entry.pc)) return;
          const answer = await entry.pc.createAnswer();
          if (endedFlagRef.current || isPcClosed(entry.pc)) return;
          await entry.pc.setLocalDescription(answer);
          const sdp = entry.pc.localDescription || answer;
          sendSignal('webrtc_answer', {
            _targetPeerId: senderPeerId,
            sdp: { type: sdp.type, sdp: sdp.sdp },
          });
        } catch (err) {
          console.error('Error handling WebRTC offer:', err);
        }
      } else if (event === 'webrtc_answer') {
        const entry = peersRef.current.get(senderPeerId);
        if (!entry || !payload.sdp || entry.pc.signalingState === 'closed') return;

        try {
          if (entry.pc.signalingState === 'have-local-offer') {
            stopRingtone();
            setConnectionState((prev) => (prev === 'connected' ? 'connected' : 'connecting'));
            await entry.pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));

            while (entry.iceQueue.length > 0) {
              if (endedFlagRef.current || isPcClosed(entry.pc)) break;
              const cand = entry.iceQueue.shift();
              if (cand) {
                await entry.pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
              }
            }
          }
        } catch (err) {
          console.error('Error handling WebRTC answer:', err);
        }
      } else if (event === 'call_upgraded_group') {
        if (!isGroupCallRef.current) {
          isGroupCallRef.current = true;
          onUpgradedToGroupRef.current?.();
        }
      } else if (event === 'peer_media_state') {
        const entry = peersRef.current.get(senderPeerId);
        if (entry) {
          if (payload.isScreenSharing !== undefined) {
            entry.isScreenSharing = Boolean(payload.isScreenSharing);
          }
          if (payload._isAnonymous !== undefined) {
            entry.isAnonymous = Boolean(payload._isAnonymous);
            if (entry.isAnonymous) {
              entry.name = 'Anonymous';
              entry.phone = undefined;
              entry.avatar = undefined;
            }
          }
          syncRemotePeersState();
        }
      } else if (event === 'webrtc_ice') {
        if (!payload.candidate) return;
        const entry = getOrCreatePeer(senderPeerId, payload);
        if (!entry || entry.pc.signalingState === 'closed') return;

        if (entry.pc.remoteDescription) {
          try {
            await entry.pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
          } catch (_) {}
        } else {
          entry.iceQueue.push(payload.candidate);
        }
      }
    },
    [cleanup, getOrCreatePeer, playEndTone, sendOfferToPeer, sendSignal, stopRingtone, syncRemotePeersState]
  );

  const handleInboundSignal = useCallback(
    (event: string, payload: any) => {
      signalChainRef.current = signalChainRef.current
        .then(() => processInboundSignal(event, payload))
        .catch(() => {});
      return signalChainRef.current;
    },
    [processInboundSignal]
  );

  // ── Initialize Local Media Stream ──────────────────────────────────────────
  const initLocalStream = useCallback(async (initialFacing: 'user' | 'environment', type: 'voice' | 'video') => {
    setConnectionState('requesting_permissions');
    setErrorMessage(null);

    const constraints: MediaStreamConstraints = {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video:
        type === 'video'
          ? {
              facingMode: initialFacing,
              width: { ideal: 640 },
              height: { ideal: 480 },
            }
          : false,
    };

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('MediaDevices API unavailable');
      }
      const hardwarePromise = navigator.mediaDevices.getUserMedia(constraints);
      const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000));
      const stream = await Promise.race([hardwarePromise, timeoutPromise]);

      if (stream) {
        localStreamRef.current = stream;
        setLocalStream(stream);
        return stream;
      }

      // Stop delayed hardware stream if it resolves after timeout
      hardwarePromise.then((lateStream) => {
        if (lateStream && localStreamRef.current !== lateStream) {
          lateStream.getTracks().forEach((t) => { try { t.stop(); } catch (_) {} });
        }
      }).catch(() => {});

      console.warn('⚠️ [WebRTC]: Hardware media request timed out, trying fallback stream');
      const fallback = createFallbackStream(type === 'video');
      localStreamRef.current = fallback;
      setLocalStream(fallback);
      return fallback;
    } catch (err) {
      console.warn('⚠️ [WebRTC]: Could not get requested media:', err);
      if (type === 'video' && navigator.mediaDevices?.getUserMedia) {
        try {
          const audioOnly = await navigator.mediaDevices.getUserMedia({ audio: true });
          localStreamRef.current = audioOnly;
          setLocalStream(audioOnly);
          setIsVideoOff(true);
          return audioOnly;
        } catch {
          // Fall through
        }
      }

      const fallback = createFallbackStream(type === 'video');
      localStreamRef.current = fallback;
      setLocalStream(fallback);
      return fallback;
    }
  }, []);

  // ── Main Lifecycle Effect (ONLY depends on enabled, roomId, callType, isInitiator) ──
  useEffect(() => {
    if (!enabled || !roomId) return;

    endedFlagRef.current = false;
    let isCancelled = false;
    let pingInterval: number | null = null;

    // 1. Setup BroadcastChannel
    try {
      const bc = new BroadcastChannel(`AGC_call_${roomId}`);
      broadcastChannelRef.current = bc;
      bc.onmessage = (msg) => {
        const { event, payload } = msg.data || {};
        if (event && payload) {
          handleInboundSignal(event, payload);
        }
      };
    } catch (_) {}

    // 2. Setup Socket.IO Room Signaling
    try {
      joinWebRTCCallRoom(roomId);
      const socket = getSocket();
      if (socket) {
        const onSocketSignal = (data: { roomId: string; event: string; data: any }) => {
          if (data && data.roomId === roomId) {
            handleInboundSignal(data.event, data.data);
          }
        };
        socketListenerRef.current = onSocketSignal;
        socket.on('call_signal', onSocketSignal);
      }
    } catch (_) {}

    // 3. Setup Supabase Realtime Call Room Channel
    if (isSupabaseConfigured) {
      const channel = supabase.channel(`call_room_${roomId}`, {
        config: { broadcast: { self: false } },
      });
      supabaseChannelRef.current = channel;

      ['peer_join', 'peer_ack', 'receiver_ready', 'peer_media_state', 'call_upgraded_group', 'webrtc_offer', 'webrtc_answer', 'webrtc_ice', 'webrtc_end'].forEach((evt) => {
        channel.on('broadcast', { event: evt }, ({ payload }) => {
          handleInboundSignal(evt, payload);
        });
      });

      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED' && !isCancelled) {
          supabaseReadyRef.current = true;
          flushSignalQueue();
          if (isMediaReadyRef.current) {
            sendSignal('peer_join', { isInitiator });
          }
        }
      });
    }

    // 4. Initialize Local Media & Replay Early Buffered Signals
    async function boot() {
      const stream = await initLocalStream('user', callType);
      if (isCancelled || endedFlagRef.current || !stream) {
        stream?.getTracks().forEach((t) => {
          try { t.stop(); } catch (_) {}
        });
        return;
      }

      isMediaReadyRef.current = true;
      setConnectionState(isInitiator ? 'ringing' : 'connecting');
      if (isInitiator) {
        startRingtone();
      }

      // Announce readiness across all transports immediately
      sendSignal('peer_join', { isInitiator });

      // Replay any signals that arrived while waiting for mic/camera permission
      const buffered = pendingInboundSignalsRef.current.splice(0);
      for (const item of buffered) {
        await handleInboundSignal(item.event, item.payload);
      }

      // Gentle presence heartbeat until at least one peer connects
      pingInterval = window.setInterval(() => {
        if (isCancelled || endedFlagRef.current) return;
        const hasConnectedPeer = Array.from(peersRef.current.values()).some(
          (p) => p.pc.connectionState === 'connected' || p.pc.iceConnectionState === 'connected'
        );
        if (!hasConnectedPeer) {
          sendSignal('peer_join', { isInitiator, retry: true });
        }
      }, 2500);
    }

    boot();

    return () => {
      isCancelled = true;
      if (pingInterval) clearInterval(pingInterval);
      cleanup(0);
    };
    // Intentionally excludes callbacks/facingMode so call is NEVER torn down on UI re-renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, roomId, callType, isInitiator]);

  // ── Ringing Timeout (Initiator only: auto-cancel after 45s if unanswered) ──
  useEffect(() => {
    if (!isInitiator || connectionState !== 'ringing') return;
    const ringTimeout = window.setTimeout(() => {
      if (endedFlagRef.current) return;
      endedFlagRef.current = true;
      playEndTone();
      sendSignal('webrtc_end', { roomId: roomIdRef.current, isHostCancel: true });
      setConnectionState('ended');
      cleanup(350);
      onCallEndedRef.current?.();
    }, 46500);
    return () => clearTimeout(ringTimeout);
  }, [cleanup, connectionState, isInitiator, playEndTone, sendSignal]);

  // ── Controls ───────────────────────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) return;
    const nextMuted = !isMuted;
    localStreamRef.current.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted;
    });
    setIsMuted(nextMuted);
  }, [isMuted]);

  const stopScreenShare = useCallback(async () => {
    if (!isScreenSharingRef.current && !screenStreamRef.current) return;

    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => {
        try {
          t.onended = null;
          t.stop();
        } catch (_) {}
      });
      screenStreamRef.current = null;
    }

    isScreenSharingRef.current = false;
    setIsScreenSharing(false);

    const stream = localStreamRef.current;
    if (stream) {
      stream.getVideoTracks().forEach((t) => {
        try {
          t.onended = null;
          t.stop();
        } catch (_) {}
        stream.removeTrack(t);
      });

      if (callTypeRef.current === 'video' && !wasVideoOffBeforeShareRef.current && navigator.mediaDevices?.getUserMedia) {
        try {
          const camStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: facingModeRef.current, width: { ideal: 640 }, height: { ideal: 480 } },
          });
          const camTrack = camStream.getVideoTracks()[0];
          if (camTrack && localStreamRef.current) {
            localStreamRef.current.addTrack(camTrack);
            setIsVideoOff(false);
            peersRef.current.forEach((entry) => {
              const sender = entry.pc.getSenders().find((s) => s.track?.kind === 'video') ||
                entry.pc.getTransceivers().find((tr) => tr.receiver.track?.kind === 'video')?.sender;
              if (sender) {
                sender.replaceTrack(camTrack).catch(() => {});
              }
            });
            setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
            sendSignal('peer_media_state', { isScreenSharing: false, isVideoOff: false });
            return;
          }
        } catch (err) {
          console.warn('Could not restore camera after screen share:', err);
        }
      }

      setIsVideoOff(true);
      peersRef.current.forEach((entry) => {
        const sender = entry.pc.getSenders().find((s) => s.track?.kind === 'video');
        if (sender) {
          sender.replaceTrack(null).catch(() => {});
        }
      });
      if (localStreamRef.current) {
        setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
      }
    }

    sendSignal('peer_media_state', { isScreenSharing: false, isVideoOff: true });
  }, [sendSignal]);

  const startScreenShare = useCallback(async (): Promise<{
    success: boolean;
    isScreenSharing?: boolean;
    message?: string;
  }> => {
    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getDisplayMedia !== 'function'
    ) {
      return {
        success: false,
        message: 'Screen sharing is not supported in this browser.',
      };
    }

    if (isScreenSharingRef.current) {
      return { success: true, isScreenSharing: true };
    }

    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 24, max: 30 } },
        audio: false,
      });
      const screenTrack = displayStream.getVideoTracks()[0];
      if (!screenTrack) {
        displayStream.getTracks().forEach((t) => { try { t.stop(); } catch (_) {} });
        return { success: false, message: 'No screen video track was selected.' };
      }

      wasVideoOffBeforeShareRef.current = isVideoOffRef.current;
      screenStreamRef.current = displayStream;
      isScreenSharingRef.current = true;
      setIsScreenSharing(true);
      setIsVideoOff(false);

      screenTrack.onended = () => {
        void stopScreenShare();
      };

      const stream = localStreamRef.current;
      if (stream) {
        stream.getVideoTracks().forEach((oldTrack) => {
          try {
            oldTrack.onended = null;
            oldTrack.stop();
          } catch (_) {}
          stream.removeTrack(oldTrack);
        });
        stream.addTrack(screenTrack);
        setLocalStream(new MediaStream(stream.getTracks()));

        for (const entry of peersRef.current.values()) {
          if (entry.pc.signalingState === 'closed') continue;
          const videoSender =
            entry.pc.getSenders().find((s) => s.track?.kind === 'video') ||
            entry.pc.getTransceivers().find((tr) => tr.receiver.track?.kind === 'video')?.sender;

          if (videoSender) {
            await videoSender.replaceTrack(screenTrack).catch(() => {});
          } else {
            // Voice call upgrading to send video/screen track: add track and renegotiate SDP
            try {
              entry.pc.addTrack(screenTrack, stream);
              if (entry.pc.signalingState === 'stable') {
                const offer = await entry.pc.createOffer({
                  offerToReceiveAudio: true,
                  offerToReceiveVideo: true,
                });
                if (!endedFlagRef.current && String(entry.pc.signalingState) !== 'closed') {
                  await entry.pc.setLocalDescription(offer);
                  const sdp = entry.pc.localDescription || offer;
                  sendSignal('webrtc_offer', {
                    _targetPeerId: entry.peerId,
                    sdp: { type: sdp.type, sdp: sdp.sdp },
                  });
                }
              }
            } catch (err) {
              console.warn('Screen share renegotiation error:', err);
            }
          }
        }
      }

      sendSignal('peer_media_state', { isScreenSharing: true, isVideoOff: false });
      return { success: true, isScreenSharing: true };
    } catch (err: any) {
      if (err?.name === 'NotAllowedError' || err?.name === 'AbortError') {
        return { success: false, message: 'Screen sharing cancelled.' };
      }
      return { success: false, message: err?.message || 'Unable to start screen sharing.' };
    }
  }, [sendSignal, stopScreenShare]);

  const toggleScreenShare = useCallback(async (): Promise<{
    success: boolean;
    isScreenSharing?: boolean;
    message?: string;
  }> => {
    if (isScreenSharingRef.current) {
      await stopScreenShare();
      return { success: true, isScreenSharing: false };
    }
    return startScreenShare();
  }, [startScreenShare, stopScreenShare]);

  const toggleVideo = useCallback(() => {
    if (!localStreamRef.current) return;
    if (isScreenSharingRef.current) {
      void stopScreenShare();
      return;
    }
    const nextOff = !isVideoOff;
    localStreamRef.current.getVideoTracks().forEach((track) => {
      track.enabled = !nextOff;
    });
    setIsVideoOff(nextOff);
  }, [isVideoOff, stopScreenShare]);

  const toggleSpeaker = useCallback(() => {
    setIsSpeaker((prev) => !prev);
  }, []);

  const flipCamera = useCallback(async () => {
    if (callTypeRef.current !== 'video' || isScreenSharingRef.current) return;
    const nextFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextFacing);

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: nextFacing, width: { ideal: 640 }, height: { ideal: 480 } },
      });
      const newVideoTrack = newStream.getVideoTracks()[0];

      if (localStreamRef.current && newVideoTrack) {
        const oldVideoTrack = localStreamRef.current.getVideoTracks()[0];
        if (oldVideoTrack) {
          oldVideoTrack.stop();
          localStreamRef.current.removeTrack(oldVideoTrack);
        }

        localStreamRef.current.addTrack(newVideoTrack);
        setLocalStream(new MediaStream(localStreamRef.current.getTracks()));

        // Replace track across ALL active peer connections without tearing down the call
        peersRef.current.forEach((entry) => {
          const sender = entry.pc.getSenders().find((s) => s.track && s.track.kind === 'video');
          if (sender) {
            sender.replaceTrack(newVideoTrack).catch(() => {});
          }
        });
      }
    } catch (err) {
      console.warn('Could not flip camera:', err);
    }
  }, [facingMode]);

  const endCall = useCallback(() => {
    if (endedFlagRef.current) return;
    endedFlagRef.current = true;
    playEndTone();
    sendSignal('webrtc_end', {
      roomId: roomIdRef.current,
      isHostCancel: isInitiatorRef.current,
    });
    setConnectionState('ended');
    cleanup(350);
    onCallEndedRef.current?.();
  }, [cleanup, playEndTone, sendSignal]);

  return {
    localStream,
    remoteStream,
    remotePeers,
    connectionState,
    isMuted,
    isVideoOff,
    isScreenSharing,
    isSpeaker,
    facingMode,
    durationSeconds,
    errorMessage,
    toggleMute,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    toggleScreenShare,
    toggleSpeaker,
    flipCamera,
    endCall,
  };
}
