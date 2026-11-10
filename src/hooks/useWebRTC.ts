import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { getSocket, emitCallSignal, joinWebRTCCallRoom } from '../services/socket';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export interface UseWebRTCOptions {
  roomId: string;
  callType: 'voice' | 'video';
  isInitiator: boolean;
  onCallEnded?: () => void;
}

export type CallConnectionState =
  | 'idle'
  | 'requesting_permissions'
  | 'ringing'
  | 'connecting'
  | 'connected'
  | 'ended'
  | 'error';

// ── Fallback Media Stream Generator ──────────────────────────────────────────
// When two tabs share the same camera or when hardware is busy, this prevents hanging
function createFallbackStream(isVideo: boolean): MediaStream {
  const stream = new MediaStream();

  // Create silent/clean audio track via Web Audio API
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    const dest = ctx.createMediaStreamDestination();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    gain.gain.value = 0.0001; // Inaudible room tone
    osc.connect(gain);
    gain.connect(dest);
    osc.start();
    dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
  } catch {
    // Web audio blocked
  }

  // Create clean animated canvas video track if video call
  if (isVideo) {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 480;
      canvas.height = 360;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        let frame = 0;
        const render = () => {
          frame++;
          ctx.fillStyle = '#0f0820';
          ctx.fillRect(0, 0, 480, 360);

          // Animated purple orb
          const pulse = Math.sin(frame * 0.05) * 15;
          ctx.beginPath();
          ctx.arc(240, 180, 50 + pulse, 0, Math.PI * 2);
          ctx.fillStyle = '#9333ea';
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 18px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('AfriChat Video', 240, 185);

          requestAnimationFrame(render);
        };
        render();

        const canvasStream = (canvas as HTMLCanvasElement & { captureStream(fps?: number): MediaStream }).captureStream(20);
        canvasStream.getVideoTracks().forEach((t) => stream.addTrack(t));
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
  onCallEnded,
}: UseWebRTCOptions) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connectionState, setConnectionState] = useState<CallConnectionState>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(callType === 'voice');
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [durationSeconds, setDurationSeconds] = useState(0);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const supabaseChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const ringtoneIntervalRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<number | null>(null);
  const iceCandidateQueueRef = useRef<RTCIceCandidateInit[]>([]);
  const processedSignalsRef = useRef<Set<string>>(new Set());
  const peerReadyRef = useRef<boolean>(false);
  const hasSentOfferRef = useRef<boolean>(false);

  // ── Web Audio Ringback Tone Synthesizer ──────────────────────────────────────
  const playTone = useCallback((freq1: number, freq2: number, durationMs: number) => {
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
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc1.frequency.setValueAtTime(freq1, now);
      osc2.frequency.setValueAtTime(freq2, now);

      gainNode.gain.setValueAtTime(0.04, now);
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

  const startRingtone = useCallback(() => {
    if (ringtoneIntervalRef.current) return;
    playTone(440, 480, 1000);
    ringtoneIntervalRef.current = window.setInterval(() => {
      playTone(440, 480, 1000);
    }, 3000);
  }, [playTone]);

  const stopRingtone = useCallback(() => {
    if (ringtoneIntervalRef.current) {
      clearInterval(ringtoneIntervalRef.current);
      ringtoneIntervalRef.current = null;
    }
  }, []);

  const playEndTone = useCallback(() => {
    stopRingtone();
    playTone(480, 400, 300);
  }, [playTone, stopRingtone]);

  // ── Multi-Transport Signal Sender (BroadcastChannel + Socket.io + Supabase) ─
  const sendSignal = useCallback((event: string, payload: any) => {
    const packet = {
      event,
      payload,
      id: `${event}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      roomId,
    };

    // 1. Local tab-to-tab BroadcastChannel (instant zero-latency)
    try {
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.postMessage(packet);
      }
    } catch (err) {
      console.warn('BroadcastChannel error:', err);
    }

    // 2. Local network Socket.io relay
    try {
      emitCallSignal(roomId, event, payload);
    } catch (err) {
      console.warn('Socket.io call signal error:', err);
    }

    // 3. Global Supabase Realtime Broadcast
    try {
      if (supabaseChannelRef.current) {
        supabaseChannelRef.current.send({
          type: 'broadcast',
          event,
          payload,
        });
      }
    } catch (err) {
      console.warn('Supabase call signal error:', err);
    }
  }, [roomId]);

  // ── Cleanup streams and connection ─────────────────────────────────────────
  const cleanup = useCallback(() => {
    stopRingtone();
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);

    if (pcRef.current) {
      pcRef.current.onicecandidate = null;
      pcRef.current.ontrack = null;
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.close();
      pcRef.current = null;
    }

    if (supabaseChannelRef.current) {
      supabaseChannelRef.current.unsubscribe();
      supabaseChannelRef.current = null;
    }

    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.close();
      broadcastChannelRef.current = null;
    }
  }, [stopRingtone]);

  // ── Initialize Local Media Stream (With Hardware Timeout & Fallback) ──────
  const initLocalStream = useCallback(async (currentFacingMode: 'user' | 'environment') => {
    setConnectionState('requesting_permissions');

    const constraints: MediaStreamConstraints = {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video:
        callType === 'video'
          ? {
              facingMode: currentFacingMode,
              width: { ideal: 640 },
              height: { ideal: 480 },
            }
          : false,
    };

    try {
      // 3.5-second timeout on hardware request to prevent freezing
      const hardwarePromise = navigator.mediaDevices.getUserMedia(constraints);
      const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3500));

      const stream = await Promise.race([hardwarePromise, timeoutPromise]);

      if (stream) {
        localStreamRef.current = stream;
        setLocalStream(stream);
        return stream;
      } else {
        console.warn('⚠️ [WebRTC]: Hardware media request timed out or busy, using fallback stream');
        const fallback = createFallbackStream(callType === 'video');
        localStreamRef.current = fallback;
        setLocalStream(fallback);
        return fallback;
      }
    } catch (err: unknown) {
      console.warn('⚠️ [WebRTC]: Could not get requested media, activating fallback stream:', err);
      // Try audio only if video failed
      if (callType === 'video') {
        try {
          const audioOnly = await navigator.mediaDevices.getUserMedia({ audio: true });
          localStreamRef.current = audioOnly;
          setLocalStream(audioOnly);
          setIsVideoOff(true);
          return audioOnly;
        } catch {
          // Fallback
        }
      }

      const fallback = createFallbackStream(callType === 'video');
      localStreamRef.current = fallback;
      setLocalStream(fallback);
      return fallback;
    }
  }, [callType]);

  // ── Create & Configure PeerConnection ──────────────────────────────────────
  const createPeerConnection = useCallback((stream: MediaStream) => {
    if (pcRef.current) return pcRef.current;

    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    // Add local tracks to peer connection
    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    // Handle remote tracks
    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal('webrtc_ice', { candidate: event.candidate.toJSON() });
      }
    };

    // Connection state changes
    pc.onconnectionstatechange = () => {
      if (!pc) return;
      const state = pc.connectionState;
      if (state === 'connected') {
        stopRingtone();
        setConnectionState('connected');
        if (!timerIntervalRef.current) {
          timerIntervalRef.current = window.setInterval(() => {
            setDurationSeconds((prev) => prev + 1);
          }, 1000);
        }
      } else if (state === 'disconnected' || state === 'failed') {
        setConnectionState('ended');
        playEndTone();
      }
    };

    return pc;
  }, [playEndTone, sendSignal, stopRingtone]);

  // ── Create Offer Handler ───────────────────────────────────────────────────
  const makeOffer = useCallback(async () => {
    if (!pcRef.current || hasSentOfferRef.current) return;
    try {
      hasSentOfferRef.current = true;
      setConnectionState('connecting');
      const offer = await pcRef.current.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: callType === 'video',
      });
      await pcRef.current.setLocalDescription(offer);
      sendSignal('webrtc_offer', { sdp: offer });
    } catch (err) {
      console.error('Error creating offer:', err);
    }
  }, [callType, sendSignal]);

  // ── Process Inbound Signals (Deduplicated Across Transports) ────────────────
  const handleInboundSignal = useCallback(async (event: string, payload: any) => {
    if (event === 'peer_join' || event === 'receiver_ready') {
      peerReadyRef.current = true;
      if (isInitiator) {
        stopRingtone();
        await makeOffer();
      } else {
        // Receiver informs initiator that it is ready
        sendSignal('receiver_ready', { timestamp: Date.now() });
      }
    } else if (event === 'webrtc_offer') {
      if (!pcRef.current) return;
      try {
        stopRingtone();
        setConnectionState('connecting');
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(payload.sdp));

        // Process queued ICE candidates
        while (iceCandidateQueueRef.current.length > 0) {
          const cand = iceCandidateQueueRef.current.shift();
          if (cand) await pcRef.current.addIceCandidate(new RTCIceCandidate(cand));
        }

        const answer = await pcRef.current.createAnswer();
        await pcRef.current.setLocalDescription(answer);

        sendSignal('webrtc_answer', { sdp: answer });
      } catch (err) {
        console.error('Error handling offer:', err);
      }
    } else if (event === 'webrtc_answer') {
      if (!pcRef.current) return;
      try {
        stopRingtone();
        setConnectionState('connecting');
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(payload.sdp));

        // Process queued ICE candidates
        while (iceCandidateQueueRef.current.length > 0) {
          const cand = iceCandidateQueueRef.current.shift();
          if (cand) await pcRef.current.addIceCandidate(new RTCIceCandidate(cand));
        }
      } catch (err) {
        console.error('Error handling answer:', err);
      }
    } else if (event === 'webrtc_ice') {
      if (pcRef.current && pcRef.current.remoteDescription) {
        try {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate));
        } catch (err) {
          console.error('Error adding ICE candidate:', err);
        }
      } else {
        iceCandidateQueueRef.current.push(payload.candidate);
      }
    } else if (event === 'webrtc_end') {
      setConnectionState('ended');
      playEndTone();
      if (onCallEnded) onCallEnded();
    }
  }, [isInitiator, makeOffer, onCallEnded, playEndTone, sendSignal, stopRingtone]);

  // ── Setup Multi-Transport Signaling ────────────────────────────────────────
  const setupSignaling = useCallback(async () => {
    // 1. Setup BroadcastChannel for instant same-browser multi-tab signaling
    try {
      const bc = new BroadcastChannel(`africhat_call_${roomId}`);
      broadcastChannelRef.current = bc;
      bc.onmessage = (msg) => {
        const { event, payload, id } = msg.data || {};
        if (id && !processedSignalsRef.current.has(id)) {
          processedSignalsRef.current.add(id);
          handleInboundSignal(event, payload);
        }
      };
    } catch (e) {
      console.warn('BroadcastChannel not supported:', e);
    }

    // 2. Join Socket.io Call Room
    try {
      joinWebRTCCallRoom(roomId);
      const socket = getSocket();
      if (socket) {
        socket.on('call_signal', (data: { roomId: string; event: string; data: any }) => {
          if (data && data.roomId === roomId) {
            handleInboundSignal(data.event, data.data);
          }
        });
      }
    } catch (e) {
      console.warn('Socket.io join call room error:', e);
    }

    // 3. Setup Supabase Realtime Broadcast Channel
    const channelName = `call_room_${roomId}`;
    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } },
    });
    supabaseChannelRef.current = channel;

    ['peer_join', 'receiver_ready', 'webrtc_offer', 'webrtc_answer', 'webrtc_ice', 'webrtc_end'].forEach((evt) => {
      channel.on('broadcast', { event: evt }, ({ payload }) => {
        handleInboundSignal(evt, payload);
      });
    });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        if (isInitiator) {
          setConnectionState('ringing');
          startRingtone();
        } else {
          setConnectionState('connecting');
        }

        // Announce presence across all channels
        sendSignal(isInitiator ? 'peer_join' : 'receiver_ready', {
          timestamp: Date.now(),
          isInitiator,
        });
      }
    });

    // Periodic heartbeat presence ping if initiator is waiting for receiver
    const pingInterval = setInterval(() => {
      if (isInitiator && !peerReadyRef.current) {
        sendSignal('peer_join', { timestamp: Date.now(), retry: true });
      }
    }, 2000);

    return () => clearInterval(pingInterval);
  }, [handleInboundSignal, isInitiator, roomId, sendSignal, startRingtone]);

  // ── Main Launch Effect ─────────────────────────────────────────────────────
  useEffect(() => {
    let isCancelled = false;
    let cleanupInterval: (() => void) | undefined;

    async function init() {
      const stream = await initLocalStream(facingMode);
      if (isCancelled || !stream) return;

      createPeerConnection(stream);
      const cleanupPing = await setupSignaling();
      cleanupInterval = cleanupPing;
    }

    init();

    return () => {
      isCancelled = true;
      if (cleanupInterval) cleanupInterval();
      cleanup();
    };
  }, [initLocalStream, createPeerConnection, setupSignaling, cleanup, facingMode]);

  // ── Controls ───────────────────────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) return;
    localStreamRef.current.getAudioTracks().forEach((track) => {
      track.enabled = !track.enabled;
    });
    setIsMuted((prev) => !prev);
  }, []);

  const toggleVideo = useCallback(() => {
    if (!localStreamRef.current) return;
    localStreamRef.current.getVideoTracks().forEach((track) => {
      track.enabled = !track.enabled;
    });
    setIsVideoOff((prev) => !prev);
  }, []);

  const toggleSpeaker = useCallback(() => {
    setIsSpeaker((prev) => !prev);
  }, []);

  const flipCamera = useCallback(async () => {
    if (callType !== 'video') return;
    const nextFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextFacing);

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: nextFacing, width: { ideal: 640 }, height: { ideal: 480 } },
      });
      const newVideoTrack = newStream.getVideoTracks()[0];

      if (localStreamRef.current && pcRef.current && newVideoTrack) {
        const oldVideoTrack = localStreamRef.current.getVideoTracks()[0];
        if (oldVideoTrack) {
          oldVideoTrack.stop();
          localStreamRef.current.removeTrack(oldVideoTrack);
        }

        localStreamRef.current.addTrack(newVideoTrack);
        setLocalStream(new MediaStream(localStreamRef.current.getTracks()));

        const sender = pcRef.current.getSenders().find((s) => s.track && s.track.kind === 'video');
        if (sender) {
          sender.replaceTrack(newVideoTrack);
        }
      }
    } catch (err) {
      console.warn('Could not flip camera:', err);
    }
  }, [callType, facingMode]);

  const endCall = useCallback(() => {
    playEndTone();
    sendSignal('webrtc_end', { roomId });
    setConnectionState('ended');
    cleanup();
    if (onCallEnded) onCallEnded();
  }, [cleanup, onCallEnded, playEndTone, roomId, sendSignal]);

  return {
    localStream,
    remoteStream,
    connectionState,
    isMuted,
    isVideoOff,
    isSpeaker,
    facingMode,
    durationSeconds,
    errorMessage,
    toggleMute,
    toggleVideo,
    toggleSpeaker,
    flipCamera,
    endCall,
  };
}
