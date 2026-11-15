import { useState, useEffect, useRef, useCallback } from 'react';
import {
  AudioSpace,
  AudioSpaceChatMessage,
  AudioSpaceListener,
  AudioSpaceSpeaker,
} from '../types';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import {
  getSocket,
  joinSpaceRoom,
  leaveSpaceRoom,
  emitSpaceSpeaking,
  emitSpaceReaction,
  emitSpaceRaiseHand,
  emitSpaceStageAction,
  emitSpaceChatMessage,
  emitSpaceWebRTCSignal,
} from '../services/socket';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
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
    { urls: 'stun:stun.cloudflare.com:3478' },
  ],
  iceCandidatePoolSize: 4,
};

export interface LiveSpaceReaction {
  id: number;
  emoji: string;
  userId: string;
  userName?: string;
  x: number;
}

export interface RemoteSpaceAudioStream {
  peerId: string;
  stream: MediaStream;
}

interface PeerConnEntry {
  peerId: string;
  pc: RTCPeerConnection;
  stream: MediaStream;
  iceQueue: RTCIceCandidateInit[];
  makingOffer: boolean;
}

interface UseSpaceAudioOptions {
  space: AudioSpace | null;
  currentUser: {
    id: string;
    fullName: string;
    avatarUrl?: string;
    phoneNumber?: string;
  };
  hasJoinedLive: boolean;
  isAnonymous: boolean;
  isCreator: boolean;
  onSpaceEnded?: (payload: { spaceId: string; durationFormatted?: string; peakListeners?: number }) => void;
}

export function useSpaceAudio({
  space,
  currentUser,
  hasJoinedLive,
  isAnonymous,
  isCreator,
  onSpaceEnded,
}: UseSpaceAudioOptions) {
  const spaceId = space?.id || '';
  const myId = currentUser.id;
  const myName = currentUser.fullName || 'AGC User';
  const myAvatar =
    currentUser.avatarUrl ||
    `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(myName)}&backgroundColor=581c87&textColor=ffffff`;

  const [speakers, setSpeakers] = useState<AudioSpaceSpeaker[]>(() => space?.speakers || []);
  const [listeners, setListeners] = useState<AudioSpaceListener[]>(() => space?.listeners || []);
  const [raisedHands, setRaisedHands] = useState<
    { id: string; name: string; avatar: string; time: string }[]
  >(() => space?.raisedHands || []);
  const [chatMessages, setChatMessages] = useState<AudioSpaceChatMessage[]>([]);
  const [pinnedNote, setPinnedNote] = useState<string>(space?.pinnedAnnouncement || '');
  const [listenersCount, setListenersCount] = useState<number>(space?.listenersCount || 1);
  const [peakListeners, setPeakListeners] = useState<number>(space?.peakListeners || space?.listenersCount || 1);

  const [floatingReactions, setFloatingReactions] = useState<LiveSpaceReaction[]>([]);
  const [avatarReactions, setAvatarReactions] = useState<Record<string, { emoji: string; id: number }>>({});
  const [speakingPeers, setSpeakingPeers] = useState<Record<string, boolean>>({});
  const [remoteStreams, setRemoteStreams] = useState<RemoteSpaceAudioStream[]>([]);
  const [micPermissionError, setMicPermissionError] = useState<string | null>(null);
  const [audioConnectedPeers, setAudioConnectedPeers] = useState<number>(0);

  const peersRef = useRef<Map<string, PeerConnEntry>>(new Map());
  const localMicStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserMapRef = useRef<Map<string, { analyser: AnalyserNode; source: MediaStreamAudioSourceNode; data: Uint8Array<ArrayBuffer> }>>(new Map());
  const supabaseChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const lastLocalSpeakEmitRef = useRef<{ speaking: boolean; ts: number }>({ speaking: false, ts: 0 });
  const spaceRef = useRef(space);
  spaceRef.current = space;
  const onSpaceEndedRef = useRef(onSpaceEnded);
  onSpaceEndedRef.current = onSpaceEnded;

  // Reset room state cleanly when switching spaces
  useEffect(() => {
    if (!space) {
      setSpeakers([]);
      setListeners([]);
      setRaisedHands([]);
      setChatMessages([]);
      setPinnedNote('');
      setFloatingReactions([]);
      setAvatarReactions({});
      setSpeakingPeers({});
      setRemoteStreams([]);
      setAudioConnectedPeers(0);
      return;
    }

    const rawSpeakers = Array.isArray(space.speakers) ? space.speakers.filter(Boolean) : [];
    const baseSpeakers =
      rawSpeakers.length > 0
        ? rawSpeakers.map((sp) => ({
            ...sp,
            id: sp.id || `sp_${Math.random().toString(36).slice(2, 7)}`,
            name: sp.name || 'Speaker',
            avatar: sp.avatar || '',
            role: sp.role || ('speaker' as const),
          }))
        : [
            {
              id: space.hostId || `host_${space.id}`,
              name: space.hostName || 'Host',
              avatar: space.hostAvatar || '',
              role: 'host' as const,
              isSpeaking: false,
              isMuted: false,
            },
          ];

    setSpeakers(baseSpeakers);
    setListeners(
      (Array.isArray(space.listeners) ? space.listeners : [])
        .filter(Boolean)
        .map((ln) => ({ ...ln, id: ln.id || `ln_${Math.random()}`, name: ln.name || 'Listener', avatar: ln.avatar || '' }))
    );
    setRaisedHands(
      (Array.isArray(space.raisedHands) ? space.raisedHands : [])
        .filter(Boolean)
        .map((rh) => ({ ...rh, id: rh.id || `rh_${Math.random()}`, name: rh.name || 'Listener', avatar: rh.avatar || '' }))
    );
    setPinnedNote(space.pinnedAnnouncement || '');
    setListenersCount(Math.max(1, space.listenersCount || baseSpeakers.length));
    setPeakListeners((prev) => Math.max(prev, space.peakListeners || space.listenersCount || 1));
  }, [spaceId]);

  const mySpeaker = speakers.find((s) => s.id === myId);
  const myRole: 'host' | 'co-host' | 'speaker' | 'sponsor' | 'listener' =
    isCreator || mySpeaker?.role === 'host'
      ? 'host'
      : mySpeaker?.role || 'listener';
  const canSpeak = myRole !== 'listener';
  const isMeMuted = mySpeaker?.isMuted ?? (myRole === 'host' ? false : true);
  const hasRaisedHand = raisedHands.some((h) => h.id === myId);

  // Helper: broadcast Space realtime payload across Supabase Realtime + BroadcastChannel
  const broadcastExtra = useCallback(
    (event: string, payload: any) => {
      if (!spaceId) return;
      try {
        broadcastChannelRef.current?.postMessage({ event, payload });
      } catch (_) {}
      try {
        const ch = supabaseChannelRef.current;
        if (ch) {
          ch.send({ type: 'broadcast', event, payload });
        }
      } catch (_) {}
    },
    [spaceId]
  );

  const sendWebRTCSignal = useCallback(
    (event: string, data: any) => {
      if (!spaceId) return;
      emitSpaceWebRTCSignal(spaceId, event, data);
      broadcastExtra('space_webrtc_signal', { spaceId, event, data });
    },
    [spaceId, broadcastExtra]
  );

  // Trigger incoming/outgoing reaction animation & avatar badge
  const pushReactionUI = useCallback((reaction: { id?: number; userId: string; userName?: string; emoji: string }) => {
    const id = reaction.id || Date.now() + Math.random();
    const x = 14 + Math.floor(Math.random() * 72);
    setFloatingReactions((prev) => [...prev.slice(-24), { id, emoji: reaction.emoji, userId: reaction.userId, userName: reaction.userName, x }]);

    if (reaction.userId) {
      setAvatarReactions((prev) => ({
        ...prev,
        [reaction.userId]: { emoji: reaction.emoji, id },
      }));
      setTimeout(() => {
        setAvatarReactions((prev) => {
          if (prev[reaction.userId]?.id !== id) return prev;
          const copy = { ...prev };
          delete copy[reaction.userId];
          return copy;
        });
      }, 2800);
    }

    setTimeout(() => {
      setFloatingReactions((prev) => prev.filter((r) => r.id !== id));
    }, 2600);
  }, []);

  // AudioContext Analyser attachment for live voice activity bars
  const attachAnalyser = useCallback((peerId: string, stream: MediaStream) => {
    try {
      if (!stream || stream.getAudioTracks().length === 0) return;
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const prev = analyserMapRef.current.get(peerId);
      if (prev) {
        try { prev.source.disconnect(); } catch (_) {}
      }

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.55;
      source.connect(analyser);
      const data = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
      analyserMapRef.current.set(peerId, { analyser, source, data });
    } catch (_) {}
  }, []);

  const detachAnalyser = useCallback((peerId: string) => {
    const entry = analyserMapRef.current.get(peerId);
    if (entry) {
      try { entry.source.disconnect(); } catch (_) {}
      analyserMapRef.current.delete(peerId);
    }
    setSpeakingPeers((prev) => {
      if (!prev[peerId]) return prev;
      const next = { ...prev };
      delete next[peerId];
      return next;
    });
  }, []);

  // Cleanup all WebRTC connections & local mic
  const cleanupWebRTC = useCallback(() => {
    peersRef.current.forEach((entry) => {
      try { entry.pc.close(); } catch (_) {}
    });
    peersRef.current.clear();

    if (localMicStreamRef.current) {
      localMicStreamRef.current.getTracks().forEach((t) => {
        try { t.stop(); } catch (_) {}
      });
      localMicStreamRef.current = null;
    }

    analyserMapRef.current.forEach((entry) => {
      try { entry.source.disconnect(); } catch (_) {}
    });
    analyserMapRef.current.clear();

    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }

    setRemoteStreams([]);
    setAudioConnectedPeers(0);
    setSpeakingPeers({});
  }, []);

  const syncRemoteStreamsList = useCallback(() => {
    const list: RemoteSpaceAudioStream[] = [];
    let connected = 0;
    peersRef.current.forEach((entry) => {
      if (entry.pc.connectionState === 'connected' || entry.pc.iceConnectionState === 'connected') {
        connected += 1;
      }
      if (entry.stream.getAudioTracks().length > 0) {
        list.push({ peerId: entry.peerId, stream: entry.stream });
      }
    });
    setRemoteStreams(list);
    setAudioConnectedPeers(connected);
  }, []);

  // Create or retrieve WebRTC RTCPeerConnection for a peer in this Space
  const getOrCreatePeer = useCallback(
    (remotePeerId: string): PeerConnEntry | null => {
      if (!remotePeerId || remotePeerId === myId || !spaceId) return null;
      const existing = peersRef.current.get(remotePeerId);
      if (existing && existing.pc.signalingState !== 'closed') {
        return existing;
      }

      const pc = new RTCPeerConnection(ICE_SERVERS);
      const remoteStream = new MediaStream();
      const entry: PeerConnEntry = {
        peerId: remotePeerId,
        pc,
        stream: remoteStream,
        iceQueue: [],
        makingOffer: false,
      };
      peersRef.current.set(remotePeerId, entry);

      // Attach local audio track if we already have mic stream, otherwise setup recvonly transceiver
      if (localMicStreamRef.current) {
        localMicStreamRef.current.getAudioTracks().forEach((track) => {
          pc.addTrack(track, localMicStreamRef.current!);
        });
      } else {
        try {
          pc.addTransceiver('audio', { direction: 'recvonly' });
        } catch (_) {}
      }

      pc.ontrack = (evt) => {
        const incomingTrack = evt.track;
        if (!remoteStream.getTracks().some((t) => t.id === incomingTrack.id)) {
          remoteStream.addTrack(incomingTrack);
        }
        attachAnalyser(remotePeerId, remoteStream);
        syncRemoteStreamsList();
      };

      pc.onicecandidate = (evt) => {
        if (evt.candidate) {
          sendWebRTCSignal('space_ice', {
            from: myId,
            to: remotePeerId,
            candidate: evt.candidate.toJSON(),
          });
        }
      };

      pc.onconnectionstatechange = () => {
        syncRemoteStreamsList();
        if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
          detachAnalyser(remotePeerId);
        }
      };

      return entry;
    },
    [myId, spaceId, attachAnalyser, detachAnalyser, sendWebRTCSignal, syncRemoteStreamsList]
  );

  const sendOfferToPeer = useCallback(
    async (remotePeerId: string) => {
      const entry = getOrCreatePeer(remotePeerId);
      if (!entry) return;
      try {
        if (entry.makingOffer || entry.pc.signalingState !== 'stable') return;
        entry.makingOffer = true;
        const offer = await entry.pc.createOffer({ offerToReceiveAudio: true });
        await entry.pc.setLocalDescription(offer);
        sendWebRTCSignal('space_offer', {
          from: myId,
          to: remotePeerId,
          sdp: entry.pc.localDescription,
        });
      } catch (err) {
        console.warn('[SpaceAudio] offer failed:', err);
      } finally {
        entry.makingOffer = false;
      }
    },
    [getOrCreatePeer, myId, sendWebRTCSignal]
  );

  // Sync or acquire local microphone when user is an unmuted speaker/host
  useEffect(() => {
    if (!hasJoinedLive || !spaceId) return;

    let cancelled = false;
    const syncMicrophone = async () => {
      if (!canSpeak) {
        // Listener role: release mic if previously held
        if (localMicStreamRef.current) {
          localMicStreamRef.current.getTracks().forEach((t) => {
            try { t.stop(); } catch (_) {}
          });
          localMicStreamRef.current = null;
          detachAnalyser(myId);
          setMicPermissionError(null);
        }
        return;
      }

      if (isMeMuted) {
        if (localMicStreamRef.current) {
          localMicStreamRef.current.getAudioTracks().forEach((t) => {
            t.enabled = false;
          });
        }
        setSpeakingPeers((prev) => ({ ...prev, [myId]: false }));
        emitSpaceSpeaking(spaceId, myId, false, 0);
        broadcastExtra('space_speaking', { userId: myId, isSpeaking: false, audioLevel: 0 });
        return;
      }

      // Unmuted speaker or host: capture or re-enable mic
      if (localMicStreamRef.current && localMicStreamRef.current.getAudioTracks().some((t) => t.readyState === 'live')) {
        localMicStreamRef.current.getAudioTracks().forEach((t) => {
          t.enabled = true;
        });
        setMicPermissionError(null);
        return;
      }

      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setMicPermissionError('Microphone unsupported in this browser.');
          return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: spaceRef.current?.isLowBandwidthMode ? 16000 : 48000,
          },
          video: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localMicStreamRef.current = stream;
        setMicPermissionError(null);
        attachAnalyser(myId, stream);

        const audioTrack = stream.getAudioTracks()[0];
        if (audioTrack) {
          audioTrack.enabled = true;
          // Push audio track to all existing peer connections & renegotiate
          for (const [remotePeerId, entry] of peersRef.current.entries()) {
            const senders = entry.pc.getSenders();
            const audioSender = senders.find((s) => s.track?.kind === 'audio' || s.track === null);
            if (audioSender) {
              try {
                await audioSender.replaceTrack(audioTrack);
              } catch (_) {
                entry.pc.addTrack(audioTrack, stream);
              }
            } else {
              entry.pc.addTrack(audioTrack, stream);
            }
            // Upgrade transceiver direction if recvonly
            entry.pc.getTransceivers().forEach((tr) => {
              if (tr.receiver.track?.kind === 'audio' && tr.direction === 'recvonly') {
                tr.direction = 'sendrecv';
              }
            });
            await sendOfferToPeer(remotePeerId);
          }
        }
      } catch (err: any) {
        setMicPermissionError(err?.name === 'NotAllowedError' ? 'Microphone access blocked' : 'No microphone detected');
      }
    };

    syncMicrophone();
    return () => {
      cancelled = true;
    };
  }, [hasJoinedLive, spaceId, canSpeak, isMeMuted, myId, attachAnalyser, detachAnalyser, broadcastExtra, sendOfferToPeer]);

  // Poll AudioContext Analysers for real-time Voice Activity Detection (VAD)
  useEffect(() => {
    if (!hasJoinedLive || !spaceId) return;

    const interval = setInterval(() => {
      const nextSpeaking: Record<string, boolean> = {};
      analyserMapRef.current.forEach(({ analyser, data }, peerId) => {
        analyser.getByteFrequencyData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i];
        const avg = sum / (data.length || 1);
        const isActive = avg > 14;
        nextSpeaking[peerId] = isActive;

        if (peerId === myId) {
          const mutedNow = !canSpeak || isMeMuted;
          const mySpeaking = mutedNow ? false : isActive;
          nextSpeaking[myId] = mySpeaking;
          const now = Date.now();
          if (
            mySpeaking !== lastLocalSpeakEmitRef.current.speaking ||
            (mySpeaking && now - lastLocalSpeakEmitRef.current.ts > 900)
          ) {
            lastLocalSpeakEmitRef.current = { speaking: mySpeaking, ts: now };
            const level = Math.min(1, avg / 64);
            emitSpaceSpeaking(spaceId, myId, mySpeaking, level);
            broadcastExtra('space_speaking', { userId: myId, isSpeaking: mySpeaking, audioLevel: level });
          }
        }
      });

      setSpeakingPeers((prev) => {
        let changed = false;
        const merged = { ...prev };
        for (const [pid, val] of Object.entries(nextSpeaking)) {
          if (merged[pid] !== val) {
            merged[pid] = val;
            changed = true;
          }
        }
        return changed ? merged : prev;
      });
    }, 150);

    return () => clearInterval(interval);
  }, [hasJoinedLive, spaceId, myId, canSpeak, isMeMuted, broadcastExtra]);

  // Join Space room & wire multi-transport listeners (Socket.IO + Supabase Realtime + BroadcastChannel)
  useEffect(() => {
    if (!hasJoinedLive || !spaceId || !myId) return;

    const handleWebRTCSignal = async (event: string, data: any) => {
      if (!data || data.from === myId) return;
      if (data.to && data.to !== myId) return;
      const remotePeerId = data.from as string;
      if (!remotePeerId) return;

      if (event === 'space_hello') {
        // Deterministic offer side: lexicographically larger ID initiates to prevent glare
        if (myId > remotePeerId) {
          await sendOfferToPeer(remotePeerId);
        }
        return;
      }

      const entry = getOrCreatePeer(remotePeerId);
      if (!entry) return;
      const { pc } = entry;

      if (event === 'space_offer' && data.sdp) {
        try {
          const polite = myId < remotePeerId;
          const offerCollision = entry.makingOffer || pc.signalingState !== 'stable';
          if (offerCollision && !polite) return;

          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
          // Flush queued ICE candidates
          for (const c of entry.iceQueue) {
            try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch (_) {}
          }
          entry.iceQueue = [];

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          sendWebRTCSignal('space_answer', {
            from: myId,
            to: remotePeerId,
            sdp: pc.localDescription,
          });
        } catch (err) {
          console.warn('[SpaceAudio] offer handle error:', err);
        }
      } else if (event === 'space_answer' && data.sdp) {
        try {
          if (pc.signalingState === 'have-local-offer') {
            await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
            for (const c of entry.iceQueue) {
              try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch (_) {}
            }
            entry.iceQueue = [];
          }
        } catch (err) {
          console.warn('[SpaceAudio] answer handle error:', err);
        }
      } else if (event === 'space_ice' && data.candidate) {
        try {
          if (pc.remoteDescription && pc.remoteDescription.type) {
            await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
          } else {
            entry.iceQueue.push(data.candidate);
          }
        } catch (_) {}
      }
    };

    const applyRoomSnapshot = (snap: any) => {
      if (!snap || snap.spaceId !== spaceId) return;
      if (Array.isArray(snap.speakers)) {
        setSpeakers(
          snap.speakers.filter(Boolean).map((sp: any) => ({
            ...sp,
            id: sp.id || `sp_${Math.random().toString(36).slice(2, 7)}`,
            name: sp.name || sp.fullName || 'Speaker',
            avatar: sp.avatar || '',
            role: sp.role || 'speaker',
          }))
        );
      }
      if (Array.isArray(snap.listeners)) {
        setListeners(
          snap.listeners.filter(Boolean).map((ln: any) => ({
            ...ln,
            id: ln.id || `ln_${Math.random().toString(36).slice(2, 7)}`,
            name: ln.name || ln.fullName || 'Listener',
            avatar: ln.avatar || '',
          }))
        );
      }
      if (Array.isArray(snap.raisedHands)) {
        setRaisedHands(
          snap.raisedHands.filter(Boolean).map((rh: any) => ({
            ...rh,
            id: rh.id || `rh_${Math.random().toString(36).slice(2, 7)}`,
            name: rh.name || 'Listener',
            avatar: rh.avatar || '',
            time: rh.time || 'Just now',
          }))
        );
      }
      if (Array.isArray(snap.chatMessages)) {
        setChatMessages(
          snap.chatMessages.filter(Boolean).map((m: any) => ({
            ...m,
            id: m.id || `spchat_${Math.random().toString(36).slice(2, 7)}`,
            userName: m.userName || m.senderName || 'Listener',
            text: String(m.text || ''),
            timestamp: m.timestamp || 'Now',
          }))
        );
      }
      if (typeof snap.pinnedNote === 'string') setPinnedNote(snap.pinnedNote);
      if (typeof snap.listenersCount === 'number') setListenersCount(snap.listenersCount);
      if (typeof snap.peakListeners === 'number') {
        setPeakListeners((prev) => Math.max(prev, snap.peakListeners));
      }
    };

    // 1. Socket.IO Join + Listeners
    const socket = getSocket();
    const spaceMeta = {
      hostId: spaceRef.current?.hostId || (isCreator ? myId : undefined),
      hostPhone: spaceRef.current?.hostPhone || (isCreator ? currentUser.phoneNumber : undefined),
      hostName: spaceRef.current?.hostName || myName,
      hostAvatar: spaceRef.current?.hostAvatar || myAvatar,
      speakers: spaceRef.current?.speakers || [],
      pinnedNote: spaceRef.current?.pinnedAnnouncement || '',
    };

    joinSpaceRoom(
      spaceId,
      {
        id: myId,
        name: isAnonymous ? 'Anonymous listener' : myName,
        avatar: isAnonymous ? '' : myAvatar,
        isAnonymous,
      },
      spaceMeta
    );

    const onStateSync = (snap: any) => applyRoomSnapshot(snap);
    const onUserJoined = (payload: any) => {
      if (payload?.spaceId !== spaceId || !payload?.user?.id || payload.user.id === myId) return;
      sendWebRTCSignal('space_hello', { from: myId, to: payload.user.id });
      if (myId > payload.user.id) {
        sendOfferToPeer(payload.user.id);
      }
    };
    const onUserLeft = (payload: any) => {
      if (payload?.spaceId !== spaceId || !payload?.userId) return;
      const entry = peersRef.current.get(payload.userId);
      if (entry) {
        try { entry.pc.close(); } catch (_) {}
        peersRef.current.delete(payload.userId);
        detachAnalyser(payload.userId);
        syncRemoteStreamsList();
      }
    };
    const onSpeakerActive = (payload: any) => {
      if (!payload?.userId) return;
      setSpeakingPeers((prev) => ({ ...prev, [payload.userId]: Boolean(payload.isSpeaking) }));
    };
    const onReaction = (payload: any) => {
      if (payload?.spaceId !== spaceId || !payload?.emoji) return;
      pushReactionUI(payload);
    };
    const onChatMsg = (payload: any) => {
      if (payload?.spaceId !== spaceId || !payload?.message) return;
      const msgSafe = {
        ...payload.message,
        id: payload.message.id || `spchat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        userName: payload.message.userName || payload.message.senderName || 'Listener',
        text: String(payload.message.text || ''),
        timestamp: payload.message.timestamp || 'Now',
      };
      setChatMessages((prev) =>
        prev.some((m) => m.id === msgSafe.id) ? prev : [...prev.slice(-99), msgSafe]
      );
    };
    const onWebRTCSig = (payload: any) => {
      if (payload?.spaceId !== spaceId) return;
      handleWebRTCSignal(payload.event, payload.data);
    };
    const onEnded = (payload: any) => {
      if (payload?.spaceId === spaceId) {
        onSpaceEndedRef.current?.(payload);
      }
    };

    socket?.on('space_state_sync', onStateSync);
    socket?.on('space_user_joined', onUserJoined);
    socket?.on('space_user_left', onUserLeft);
    socket?.on('space_speaker_active', onSpeakerActive);
    socket?.on('space_reaction', onReaction);
    socket?.on('space_chat_message', onChatMsg);
    socket?.on('space_webrtc_signal', onWebRTCSig);
    socket?.on('space_ended', onEnded);

    // 2. BroadcastChannel (same-browser multi-tab fallback)
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel(`AGC_space_live_${spaceId}`);
      broadcastChannelRef.current = bc;
      bc.onmessage = (evt) => {
        const { event, payload } = evt.data || {};
        if (event === 'space_reaction') onReaction(payload);
        else if (event === 'space_chat_message') onChatMsg(payload);
        else if (event === 'space_speaking') onSpeakerActive(payload);
        else if (event === 'space_state_sync') applyRoomSnapshot(payload);
        else if (event === 'space_webrtc_signal') onWebRTCSig(payload);
      };
    } catch (_) {}

    // 3. Supabase Realtime room channel
    let supaCh: ReturnType<typeof supabase.channel> | null = null;
    if (isSupabaseConfigured) {
      supaCh = supabase.channel(`space_live_room_${spaceId}`, {
        config: { broadcast: { self: false } },
      });
      supabaseChannelRef.current = supaCh;
      supaCh
        .on('broadcast', { event: 'space_reaction' }, ({ payload }) => onReaction(payload))
        .on('broadcast', { event: 'space_chat_message' }, ({ payload }) => onChatMsg(payload))
        .on('broadcast', { event: 'space_speaking' }, ({ payload }) => onSpeakerActive(payload))
        .on('broadcast', { event: 'space_state_sync' }, ({ payload }) => applyRoomSnapshot(payload))
        .on('broadcast', { event: 'space_webrtc_signal' }, ({ payload }) => onWebRTCSig(payload))
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            supaCh?.send({
              type: 'broadcast',
              event: 'space_webrtc_signal',
              payload: { spaceId, event: 'space_hello', data: { from: myId } },
            });
          }
        });
    }

    // Announce hello immediately over Socket.IO so existing peers initiate WebRTC audio
    sendWebRTCSignal('space_hello', { from: myId });

    return () => {
      leaveSpaceRoom(spaceId, myId);
      socket?.off('space_state_sync', onStateSync);
      socket?.off('space_user_joined', onUserJoined);
      socket?.off('space_user_left', onUserLeft);
      socket?.off('space_speaker_active', onSpeakerActive);
      socket?.off('space_reaction', onReaction);
      socket?.off('space_chat_message', onChatMsg);
      socket?.off('space_webrtc_signal', onWebRTCSig);
      socket?.off('space_ended', onEnded);

      if (bc) {
        bc.close();
        broadcastChannelRef.current = null;
      }
      if (supaCh) {
        supabaseChannelRef.current = null;
        Promise.resolve(supabase.removeChannel(supaCh)).catch(() => {});
      }
      cleanupWebRTC();
    };
  }, [
    hasJoinedLive,
    spaceId,
    myId,
    myName,
    myAvatar,
    isAnonymous,
    isCreator,
    currentUser.phoneNumber,
    getOrCreatePeer,
    sendOfferToPeer,
    sendWebRTCSignal,
    detachAnalyser,
    syncRemoteStreamsList,
    pushReactionUI,
    cleanupWebRTC,
  ]);

  // ── Live User Actions ──────────────────────────────────────────────────────

  const sendReaction = useCallback(
    (emoji: string) => {
      if (!spaceId || !emoji) return;
      const id = Date.now() + Math.random();
      const payload = { spaceId, userId: myId, userName: myName, emoji, id };
      pushReactionUI(payload);
      emitSpaceReaction(spaceId, myId, myName, emoji, id);
      broadcastExtra('space_reaction', payload);
    },
    [spaceId, myId, myName, pushReactionUI, broadcastExtra]
  );

  const toggleMyMute = useCallback(() => {
    if (!spaceId || !canSpeak) return;
    const nextMuted = !isMeMuted;
    setSpeakers((prev) =>
      prev.map((s) => (s.id === myId ? { ...s, isMuted: nextMuted, isSpeaking: nextMuted ? false : s.isSpeaking } : s))
    );
    emitSpaceStageAction(spaceId, myId, 'toggle_self_mute', myId, nextMuted);
  }, [spaceId, canSpeak, isMeMuted, myId]);

  const raiseOrLowerHand = useCallback(
    (raised?: boolean) => {
      if (!spaceId) return;
      const nextRaised = raised !== undefined ? raised : !hasRaisedHand;
      if (nextRaised) {
        setRaisedHands((prev) =>
          prev.some((h) => h.id === myId)
            ? prev
            : [...prev, { id: myId, name: myName, avatar: myAvatar, time: 'Just now' }]
        );
      } else {
        setRaisedHands((prev) => prev.filter((h) => h.id !== myId));
      }
      emitSpaceRaiseHand(spaceId, { id: myId, name: myName, avatar: myAvatar }, nextRaised);
    },
    [spaceId, hasRaisedHand, myId, myName, myAvatar]
  );

  const approveHand = useCallback(
    (targetUserId: string) => {
      if (!spaceId) return;
      const person = raisedHands.find((h) => h.id === targetUserId) || listeners.find((l) => l.id === targetUserId);
      if (person && !speakers.some((s) => s.id === targetUserId)) {
        setSpeakers((prev) => [
          ...prev,
          { id: targetUserId, name: person.name, avatar: person.avatar, role: 'speaker', isSpeaking: false, isMuted: true },
        ]);
      }
      setRaisedHands((prev) => prev.filter((h) => h.id !== targetUserId));
      setListeners((prev) => prev.filter((l) => l.id !== targetUserId));
      emitSpaceStageAction(spaceId, myId, 'approve_hand', targetUserId);
    },
    [spaceId, myId, raisedHands, listeners, speakers]
  );

  const declineHand = useCallback(
    (targetUserId: string) => {
      if (!spaceId) return;
      setRaisedHands((prev) => prev.filter((h) => h.id !== targetUserId));
      emitSpaceStageAction(spaceId, myId, 'decline_hand', targetUserId);
    },
    [spaceId, myId]
  );

  const setParticipantRole = useCallback(
    (targetUserId: string, newRole: 'co-host' | 'speaker' | 'sponsor') => {
      if (!spaceId) return;
      const action =
        newRole === 'co-host' ? 'promote_cohost' : newRole === 'sponsor' ? 'set_sponsor' : 'demote_speaker';
      setSpeakers((prev) => prev.map((s) => (s.id === targetUserId ? { ...s, role: newRole } : s)));
      emitSpaceStageAction(spaceId, myId, action, targetUserId);
    },
    [spaceId, myId]
  );

  const toggleParticipantMute = useCallback(
    (targetUserId: string, nextMuted?: boolean) => {
      if (!spaceId) return;
      const target = speakers.find((s) => s.id === targetUserId);
      const shouldMute = nextMuted !== undefined ? nextMuted : !(target?.isMuted ?? false);
      setSpeakers((prev) =>
        prev.map((s) => (s.id === targetUserId ? { ...s, isMuted: shouldMute, isSpeaking: shouldMute ? false : s.isSpeaking } : s))
      );
      emitSpaceStageAction(spaceId, myId, shouldMute ? 'mute_speaker' : 'unmute_speaker', targetUserId);
    },
    [spaceId, myId, speakers]
  );

  const muteAllSpeakers = useCallback(() => {
    if (!spaceId) return;
    setSpeakers((prev) => prev.map((s) => (s.role === 'host' ? s : { ...s, isMuted: true, isSpeaking: false })));
    emitSpaceStageAction(spaceId, myId, 'mute_all');
  }, [spaceId, myId]);

  const removeFromStage = useCallback(
    (targetUserId: string) => {
      if (!spaceId) return;
      const target = speakers.find((s) => s.id === targetUserId);
      if (!target || target.role === 'host') return;
      setSpeakers((prev) => prev.filter((s) => s.id !== targetUserId));
      setListeners((prev) =>
        prev.some((l) => l.id === targetUserId) ? prev : [...prev, { id: target.id, name: target.name, avatar: target.avatar }]
      );
      emitSpaceStageAction(spaceId, myId, 'remove_from_stage', targetUserId);
    },
    [spaceId, myId, speakers]
  );

  const updatePinnedNote = useCallback(
    (text: string) => {
      if (!spaceId) return;
      const cleaned = text.trim();
      setPinnedNote(cleaned);
      emitSpaceStageAction(spaceId, myId, 'update_pin', undefined, cleaned);
    },
    [spaceId, myId]
  );

  const sendChatMessage = useCallback(
    (text: string) => {
      const cleaned = text.trim();
      if (!spaceId || !cleaned) return;
      const msg: AudioSpaceChatMessage = {
        id: `spchat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        userId: myId,
        userName: myName,
        userAvatar: myAvatar,
        text: cleaned,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setChatMessages((prev) => [...prev.slice(-99), msg]);
      emitSpaceChatMessage(spaceId, msg);
      broadcastExtra('space_chat_message', { spaceId, message: msg });
    },
    [spaceId, myId, myName, myAvatar, broadcastExtra]
  );

  return {
    speakers,
    listeners,
    raisedHands,
    chatMessages,
    pinnedNote,
    listenersCount,
    peakListeners,
    floatingReactions,
    avatarReactions,
    speakingPeers,
    remoteStreams,
    audioConnectedPeers,
    micPermissionError,
    myRole,
    canSpeak,
    isMeMuted,
    hasRaisedHand,
    sendReaction,
    toggleMyMute,
    raiseOrLowerHand,
    approveHand,
    declineHand,
    setParticipantRole,
    toggleParticipantMute,
    muteAllSpeakers,
    removeFromStage,
    updatePinnedNote,
    sendChatMessage,
  };
}
