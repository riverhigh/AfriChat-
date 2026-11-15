import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  Mic,
  MicOff,
  Radio,
  Users,
  Wifi,
  Hand,
  Share2,
  Crown,
  Shield,
  Gem,
  Sliders,
  UserX,
  VolumeX,
  Pin,
  Check,
  Clock,
  ChevronDown,
  ChevronLeft,
  MessageCircle,
  SmilePlus,
  Send,
  BadgeCheck,
  Volume2,
  AlertCircle,
} from 'lucide-react';
import { useApp, phonesMatch } from '../context/AppContext';
import { AudioSpaceSpeaker } from '../types';
import { useSpaceAudio } from '../hooks/useSpaceAudio';

const SPACE_REACTION_EMOJIS = ['😂', '😮', '😢', '💜', '💯', '👏', '✊', '👍', '🔥'];

const RemoteAudioPlayer: React.FC<{ stream: MediaStream }> = ({ stream }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    if (el.srcObject !== stream) {
      el.srcObject = stream;
    }
    el.play().catch(() => {});
  }, [stream]);

  return <audio ref={audioRef} autoPlay playsInline className="hidden" />;
};

export const AudioSpaceModal: React.FC = () => {
  const {
    activeAudioSpace,
    isAudioSpaceMinimized,
    setIsAudioSpaceMinimized,
    leaveAudioSpace,
    endAudioSpace,
    spaceEndedSummary,
    setSpaceEndedSummary,
    toggleSpaceLowBandwidth,
    isSpaceCreator,
    currentUser,
  } = useApp();

  // Strictly identify whether currentUser is the Space creator (ONLY creator can end Space)
  const isCreator = useMemo(() => {
    if (!activeAudioSpace || !currentUser?.id) return false;
    if (isSpaceCreator(activeAudioSpace)) return true;
    if (activeAudioSpace.hostId && activeAudioSpace.hostId === currentUser.id) return true;
    if (
      activeAudioSpace.hostPhone &&
      currentUser.phoneNumber &&
      phonesMatch(activeAudioSpace.hostPhone, currentUser.phoneNumber)
    ) {
      return true;
    }
    return false;
  }, [activeAudioSpace, currentUser?.id, currentUser?.phoneNumber, isSpaceCreator]);

  // Pre-join sheet for listeners joining a Space they didn't create
  const [hasStartedListening, setHasStartedListening] = useState<boolean>(false);
  const [listenAnonymously, setListenAnonymously] = useState<boolean>(false);

  // Sub-sheets & UI drawers
  const [showParticipantsSheet, setShowParticipantsSheet] = useState(false);
  const [participantFilter, setParticipantFilter] = useState<'all' | 'cohosts' | 'speakers' | 'listeners'>('all');
  const [showManageDeck, setShowManageDeck] = useState(false);
  const [showEmojiTray, setShowEmojiTray] = useState(false);
  const [showChatSheet, setShowChatSheet] = useState(false);
  const [confirmEndPrompt, setConfirmEndPrompt] = useState(false);
  const [selectedSpeakerForAction, setSelectedSpeakerForAction] = useState<AudioSpaceSpeaker | null>(null);
  const [shareCopiedToast, setShareCopiedToast] = useState(false);

  const [pinDraft, setPinDraft] = useState<string>('');
  const [isEditingPin, setIsEditingPin] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [liveSeconds, setLiveSeconds] = useState(0);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  // Reset per-Space UI state when activeAudioSpace changes
  useEffect(() => {
    if (!activeAudioSpace) {
      setHasStartedListening(false);
      setShowParticipantsSheet(false);
      setShowManageDeck(false);
      setShowEmojiTray(false);
      setShowChatSheet(false);
      setConfirmEndPrompt(false);
      setSelectedSpeakerForAction(null);
      return;
    }

    setHasStartedListening(isCreator);
    setPinDraft(activeAudioSpace.pinnedAnnouncement || '');
  }, [activeAudioSpace?.id, isCreator]);

  // Live clock
  useEffect(() => {
    if (!activeAudioSpace) return;
    const start = activeAudioSpace.startedAt || Date.now();
    setLiveSeconds(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    const timer = setInterval(() => {
      setLiveSeconds(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    }, 1000);
    return () => clearInterval(timer);
  }, [activeAudioSpace?.id, activeAudioSpace?.startedAt]);

  // Unified Live WebRTC + Socket.IO + Supabase Space Room Engine
  const {
    speakers: speakersList,
    listeners: listenersList,
    raisedHands: raisedHandsQueue,
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
    canSpeak: isOnStage,
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
  } = useSpaceAudio({
    space: activeAudioSpace,
    currentUser: {
      id: currentUser.id,
      fullName: currentUser.fullName,
      avatarUrl: currentUser.avatarUrl,
      phoneNumber: currentUser.phoneNumber,
    },
    hasJoinedLive: Boolean(activeAudioSpace && hasStartedListening),
    isAnonymous: listenAnonymously,
    isCreator,
    onSpaceEnded: (payload) => {
      if (!activeAudioSpace) return;
      setSpaceEndedSummary({
        spaceId: payload.spaceId,
        title: activeAudioSpace.title || 'Live Community Space',
        durationFormatted: payload.durationFormatted || formatLiveDuration(liveSeconds),
        peakListeners: payload.peakListeners || peakListeners || 1,
      });
    },
  });

  // Auto-scroll space chat
  useEffect(() => {
    if (showChatSheet && chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages.length, showChatSheet]);

  const formatLiveDuration = (totalSec: number): string => {
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  const formatClockDisplay = (totalSec: number): string => {
    const minutes = Math.floor(totalSec / 60);
    const seconds = totalSec % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  // Space Ended Summary Modal
  if (spaceEndedSummary) {
    return (
      <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
        <div className="w-full max-w-sm rounded-3xl bg-[#0b0b0f] border border-zinc-800 p-6 text-center space-y-4 shadow-2xl text-white">
          <div className="w-14 h-14 rounded-full bg-[#7856ff]/15 text-[#7856ff] mx-auto flex items-center justify-center border border-[#7856ff]/30">
            <Radio className="w-7 h-7" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-violet-400">
              Space Ended
            </span>
            <h3 className="text-lg font-extrabold text-white mt-1.5 leading-snug">
              {spaceEndedSummary.title}
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-2.5 py-2">
            <div className="p-3 bg-zinc-900 rounded-2xl border border-zinc-800 text-center">
              <Clock className="w-4 h-4 text-violet-400 mx-auto mb-1" />
              <div className="text-[11px] text-zinc-400">Duration</div>
              <div className="text-base font-bold text-white mt-0.5">
                {spaceEndedSummary.durationFormatted}
              </div>
            </div>
            <div className="p-3 bg-zinc-900 rounded-2xl border border-zinc-800 text-center">
              <Users className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
              <div className="text-[11px] text-zinc-400">Peak listeners</div>
              <div className="text-base font-bold text-white mt-0.5">
                {spaceEndedSummary.peakListeners}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSpaceEndedSummary(null)}
            className="w-full py-3.5 bg-[#7856ff] hover:bg-[#6a45ff] text-white font-bold text-sm rounded-full transition-all active:scale-95"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  if (!activeAudioSpace || isAudioSpaceMinimized) return null;

  const isCoHost = myRole === 'co-host';
  const canManage = isCreator || isCoHost;
  const totalListeningCount = Math.max(
    listenersCount || 0,
    activeAudioSpace.listenersCount || 0,
    speakersList.length + listenersList.length,
    1
  );

  const handleStartListening = () => {
    // Resume Web Audio on user gesture so incoming streams play cleanly on iOS/Chrome
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }
        setTimeout(() => ctx.close().catch(() => {}), 300);
      }
    } catch (_) {}
    setHasStartedListening(true);
  };

  const handleSendReaction = (emoji: string) => {
    sendReaction(emoji);
    setShowEmojiTray(false);
  };

  const handleSendSpaceChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    sendChatMessage(chatInput.trim());
    setChatInput('');
  };

  const handleSavePinnedNote = (e: React.FormEvent) => {
    e.preventDefault();
    updatePinnedNote(pinDraft.trim());
    setIsEditingPin(false);
  };

  const handleShareSpace = () => {
    const shareText = `Join "${activeAudioSpace.title}" live on AfriChat Spaces!`;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(shareText).catch(() => {});
    }
    setShareCopiedToast(true);
    setTimeout(() => setShareCopiedToast(false), 2000);
  };

  // Grouping for Participants Sheet
  const hostSpeakers = speakersList.filter((s) => s.role === 'host');
  const coHostSpeakers = speakersList.filter((s) => s.role === 'co-host');
  const stageSpeakers = speakersList.filter((s) => s.role !== 'host' && s.role !== 'co-host');
  const sponsorSpeaker = speakersList.find((s) => s.role === 'sponsor');

  // ── PRE-JOIN PREVIEW SHEET (Matches Twitter/X Spaces IMG_7137.png) ───────────
  if (!hasStartedListening) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
        <div className="w-full max-w-md bg-black rounded-t-[28px] sm:rounded-3xl border-t sm:border border-zinc-800/90 shadow-2xl max-h-[90vh] flex flex-col overflow-hidden text-white">
          {/* Drag Handle */}
          <div className="pt-3 pb-1 flex justify-center shrink-0">
            <div className="w-9 h-1 rounded-full bg-zinc-700" />
          </div>

          <div className="px-5 pt-2 pb-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={leaveAudioSpace}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold transition-colors"
                aria-label="Back to Spaces"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <span className="text-xs font-extrabold tracking-wider uppercase text-[#8b6cff]">
                LIVE
              </span>
            </div>
            <button
              type="button"
              onClick={leaveAudioSpace}
              className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
              aria-label="Close space preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-6">
            <h2 className="text-2xl font-extrabold leading-tight tracking-tight text-white">
              {activeAudioSpace.title}
            </h2>

            {/* Clean 4-column avatar grid */}
            <div className="grid grid-cols-4 gap-x-3 gap-y-5">
              {(Array.isArray(speakersList) ? speakersList : []).filter(Boolean).map((speaker) => {
                const safeSpeakerName = speaker?.name || 'Speaker';
                const roleLabel =
                  speaker?.role === 'host'
                    ? 'Host'
                    : speaker?.role === 'co-host'
                    ? 'Co-host'
                    : speaker?.role === 'sponsor'
                    ? 'Sponsor'
                    : 'Speaker';
                return (
                  <div key={speaker.id || safeSpeakerName} className="flex flex-col items-center text-center min-w-0">
                    <div className="w-14 h-14 rounded-full overflow-hidden bg-zinc-900">
                      <img
                        src={
                          speaker.avatar ||
                          `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(safeSpeakerName)}`
                        }
                        alt={safeSpeakerName}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="mt-2 w-full flex items-center justify-center gap-0.5 min-w-0">
                      <span className="text-xs font-bold text-white truncate">
                        {safeSpeakerName}
                      </span>
                      {(speaker.isVerified || speaker.role === 'host') && (
                        <BadgeCheck className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                      )}
                    </div>
                    <span className="text-[11px] text-zinc-400 font-medium mt-0.5">
                      {roleLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Pre-Join Controls */}
          <div className="px-5 pt-4 pb-6 border-t border-zinc-800/90 bg-black space-y-4 shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-white">Listen anonymously</span>
              <button
                type="button"
                role="switch"
                aria-checked={listenAnonymously}
                onClick={() => setListenAnonymously((prev) => !prev)}
                className={`w-12 h-7 rounded-full relative transition-colors ${
                  listenAnonymously ? 'bg-[#7856ff]' : 'bg-zinc-800'
                }`}
              >
                <span
                  className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform shadow-sm ${
                    listenAnonymously ? 'left-6' : 'left-1'
                  }`}
                />
              </button>
            </div>

            <p className="text-xs text-zinc-500 text-center leading-relaxed px-2">
              Audio streams live via encrypted voice channels. Your mic stays off unless you are invited to speak on stage.
            </p>

            <button
              type="button"
              onClick={handleStartListening}
              className="w-full py-3.5 rounded-full bg-[#7856ff] hover:bg-[#6a45ff] text-white font-bold text-sm transition-all active:scale-[0.99] shadow-lg shadow-[#7856ff]/25"
            >
              Start listening
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── ACTIVE LIVE SPACE VIEW (Matches Twitter/X Spaces IMG_7140.png) ───────────
  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
      {/* Remote WebRTC Audio Streams */}
      {remoteStreams.map((rs) => (
        <RemoteAudioPlayer key={rs.peerId} stream={rs.stream} />
      ))}

      <div className="w-full max-w-md bg-black sm:bg-[#07070a] rounded-t-[28px] sm:rounded-3xl border-t sm:border border-zinc-800/90 shadow-2xl max-h-[94vh] flex flex-col overflow-hidden text-white relative">
        {/* Floating Animated Reaction Emojis */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-30">
          {floatingReactions.map((item) => (
            <div
              key={item.id}
              style={{ left: `${item.x}%` }}
              className="absolute bottom-24 flex flex-col items-center animate-bounce duration-1000 transition-all"
            >
              <span className="text-3xl drop-shadow-lg">{item.emoji}</span>
            </div>
          ))}
        </div>

        {/* Drag Handle */}
        <div className="pt-2.5 pb-1 flex justify-center shrink-0">
          <div className="w-9 h-1 rounded-full bg-zinc-700" />
        </div>

        {/* Top Bar */}
        <div className="px-5 py-2.5 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => setIsAudioSpaceMinimized(true)}
              className="flex items-center gap-0.5 px-2 py-1 -ml-1 rounded-full text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold transition-colors shrink-0"
              title="Back & keep listening in background"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <div className="flex items-center gap-1.5 text-xs font-bold truncate">
              <span className="text-[#8b6cff] uppercase tracking-wide">LIVE</span>
              <span className="text-zinc-500">·</span>
              <span className="text-zinc-300 font-medium">
                {totalListeningCount} listening
              </span>
              <span className="text-zinc-600">·</span>
              <span className="text-zinc-400 font-mono text-[11px]">
                {formatClockDisplay(liveSeconds)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={toggleSpaceLowBandwidth}
              className={`px-2 py-1 rounded-full text-[10px] font-semibold border transition-colors ${
                activeAudioSpace.isLowBandwidthMode
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                  : 'border-zinc-800 bg-zinc-900 text-zinc-400'
              }`}
              title="Toggle low-data audio compression"
            >
              <Wifi className="w-3 h-3 inline mr-1" />
              {activeAudioSpace.isLowBandwidthMode ? '12kbps' : 'HD'}
            </button>

            <button
              type="button"
              onClick={handleShareSpace}
              className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
              title="Share Space"
            >
              <Share2 className="w-4 h-4" />
            </button>

            {/* STRICT PERMISSION: Only the creator sees End; listeners & speakers only see Leave */}
            {isCreator ? (
              confirmEndPrompt ? (
                <div className="flex items-center gap-1 bg-zinc-900 border border-rose-500/40 rounded-full px-2 py-0.5">
                  <button
                    type="button"
                    onClick={() =>
                      endAudioSpace(activeAudioSpace.id, {
                        durationFormatted: formatLiveDuration(liveSeconds),
                        peakListeners: peakListeners || totalListeningCount,
                      })
                    }
                    className="text-[11px] font-bold text-rose-400 hover:text-rose-300 px-1.5 py-0.5"
                  >
                    Confirm
                  </button>
                  <span className="text-zinc-700">|</span>
                  <button
                    type="button"
                    onClick={() => setConfirmEndPrompt(false)}
                    className="text-[11px] font-medium text-zinc-400 hover:text-white px-1.5 py-0.5"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmEndPrompt(true)}
                  className="px-3 py-1 rounded-full text-xs font-bold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-colors"
                >
                  End
                </button>
              )
            ) : (
              <button
                type="button"
                onClick={leaveAudioSpace}
                className="px-3 py-1 rounded-full text-xs font-bold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-colors"
              >
                Leave
              </button>
            )}
          </div>
        </div>

        {shareCopiedToast && (
          <div className="mx-5 mb-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-700 text-[11px] text-center text-zinc-200 font-medium">
            Space invite copied to clipboard
          </div>
        )}

        {micPermissionError && (
          <div className="mx-5 mb-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{micPermissionError}</span>
          </div>
        )}

        {/* Main Scrollable Stage */}
        <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-5">
          {/* Title & Category */}
          <div>
            <h2 className="text-xl font-extrabold leading-snug text-white">
              {activeAudioSpace.title}
            </h2>
            {activeAudioSpace.topic && (
              <p className="text-xs text-zinc-400 mt-1">{activeAudioSpace.topic}</p>
            )}
          </div>

          {/* Pinned Note / Embedded Post Card (Matches IMG_7139 / IMG_7140 style) */}
          {(pinnedNote || sponsorSpeaker) && (
            <div className="p-3.5 rounded-2xl bg-zinc-900/75 border border-zinc-800/90 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <img
                    src={sponsorSpeaker?.avatar || activeAudioSpace.hostAvatar}
                    alt=""
                    className="w-5 h-5 rounded-full object-cover"
                  />
                  <span className="font-bold text-white truncate">
                    {sponsorSpeaker?.sponsorBrand || activeAudioSpace.hostName}
                  </span>
                  {sponsorSpeaker && (
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300">
                      Sponsor
                    </span>
                  )}
                </div>
                {canManage && (
                  <button
                    type="button"
                    onClick={() => {
                      setPinDraft(pinnedNote);
                      setIsEditingPin(true);
                      setShowManageDeck(true);
                    }}
                    className="text-[11px] text-zinc-400 hover:text-white"
                  >
                    Edit
                  </button>
                )}
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                {pinnedNote || sponsorSpeaker?.sponsorTagline || 'Live voice stage active'}
              </p>
            </div>
          )}

          {/* Clean 4-Column Stage Grid (No Heavy Boxes) */}
          <div className="grid grid-cols-4 gap-x-3 gap-y-5 pt-1">
            {(Array.isArray(speakersList) ? speakersList : []).filter(Boolean).map((speaker) => {
              const safeSpeakerName = speaker?.name || 'Speaker';
              const isMe = speaker.id === currentUser?.id;
              const isSpeakingLive =
                !speaker.isMuted && Boolean(speakingPeers[speaker.id] || speaker.isSpeaking);
              const activeEmoji = avatarReactions[speaker.id]?.emoji;
              const isRaisingHand = raisedHandsQueue.some((h) => h.id === speaker.id);
              const roleLabel =
                speaker.role === 'host'
                  ? 'Host'
                  : speaker.role === 'co-host'
                  ? 'Co-host'
                  : speaker.role === 'sponsor'
                  ? 'Sponsor'
                  : 'Speaker';

              return (
                <div
                  key={speaker.id || safeSpeakerName}
                  onClick={() => {
                    if (canManage && speaker.role !== 'host') {
                      setSelectedSpeakerForAction(speaker);
                    }
                  }}
                  className={`flex flex-col items-center text-center min-w-0 relative ${
                    canManage && speaker.role !== 'host' ? 'cursor-pointer' : ''
                  }`}
                >
                  <div className="relative">
                    <div
                      className={`w-15 h-15 rounded-full overflow-hidden bg-zinc-900 transition-all ${
                        isSpeakingLive
                          ? 'ring-2 ring-[#7856ff] ring-offset-2 ring-offset-black'
                          : 'ring-1 ring-zinc-800'
                      }`}
                    >
                      <img
                        src={
                          speaker.avatar ||
                          `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(safeSpeakerName)}`
                        }
                        alt={safeSpeakerName}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Live Emoji Bubble on Reacting User */}
                    {activeEmoji && (
                      <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center text-base shadow-lg animate-bounce">
                        {activeEmoji}
                      </div>
                    )}

                    {/* Raised Hand Indicator */}
                    {!activeEmoji && isRaisingHand && (
                      <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-amber-500 text-black flex items-center justify-center text-xs shadow-md">
                        ✋
                      </div>
                    )}

                    {/* Live Mic / Speaking Equalizer Badge */}
                    <div
                      className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center ring-2 ring-black ${
                        speaker.isMuted
                          ? 'bg-zinc-800 text-rose-400'
                          : isSpeakingLive
                          ? 'bg-[#7856ff] text-white'
                          : 'bg-zinc-800 text-zinc-200'
                      }`}
                    >
                      {speaker.isMuted ? (
                        <MicOff className="w-3 h-3" />
                      ) : isSpeakingLive ? (
                        <div className="flex items-end gap-[2px] h-3">
                          <span className="w-[2px] h-2 bg-white rounded-full animate-pulse" />
                          <span className="w-[2px] h-3 bg-white rounded-full animate-bounce" />
                          <span className="w-[2px] h-1.5 bg-white rounded-full animate-pulse" />
                        </div>
                      ) : (
                        <Mic className="w-3 h-3" />
                      )}
                    </div>
                  </div>

                  <div className="mt-2 w-full flex items-center justify-center gap-0.5 min-w-0">
                    <span className="text-xs font-bold text-white truncate">
                      {isMe ? 'You' : safeSpeakerName}
                    </span>
                    {(speaker.isVerified || speaker.role === 'host') && (
                      <BadgeCheck className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                    )}
                  </div>
                  <span className="text-[11px] text-zinc-400 font-medium mt-0.5">
                    {roleLabel}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Live Voice Status Indicator */}
          <div className="flex items-center justify-between pt-2 text-[11px] text-zinc-500">
            <span className="flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-[#8b6cff]" />
              <span>
                {audioConnectedPeers > 0
                  ? `Live audio connected (${audioConnectedPeers} ${audioConnectedPeers === 1 ? 'peer' : 'peers'})`
                  : 'Live audio channel active'}
              </span>
            </span>
            {raisedHandsQueue.length > 0 && canManage && (
              <button
                type="button"
                onClick={() => setShowManageDeck(true)}
                className="text-amber-400 font-semibold hover:underline"
              >
                {raisedHandsQueue.length} hand{raisedHandsQueue.length > 1 ? 's' : ''} raised
              </button>
            )}
          </div>

          {/* Collapsible Host / Co-Host Management Deck */}
          {showManageDeck && canManage && (
            <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3.5 animate-in slide-in-from-top-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Crown className="w-4 h-4 text-amber-400" />
                  <span>Host Controls</span>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPinDraft(pinnedNote);
                      setIsEditingPin((v) => !v);
                    }}
                    className="px-2.5 py-1 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-semibold flex items-center gap-1"
                  >
                    <Pin className="w-3 h-3" />
                    <span>Pin note</span>
                  </button>
                  <button
                    type="button"
                    onClick={muteAllSpeakers}
                    className="px-2.5 py-1 rounded-full bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 text-[11px] font-semibold flex items-center gap-1"
                  >
                    <VolumeX className="w-3 h-3" />
                    <span>Mute all</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowManageDeck(false)}
                    className="p-1 text-zinc-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {isEditingPin && (
                <form onSubmit={handleSavePinnedNote} className="flex gap-2">
                  <input
                    type="text"
                    value={pinDraft}
                    onChange={(e) => setPinDraft(e.target.value)}
                    placeholder="Write a pinned announcement for the Space..."
                    className="flex-1 px-3 py-2 rounded-xl bg-black border border-zinc-700 text-xs text-white focus:outline-none focus:border-[#7856ff]"
                  />
                  <button
                    type="submit"
                    className="px-3 py-2 rounded-xl bg-[#7856ff] text-white text-xs font-bold"
                  >
                    Save
                  </button>
                </form>
              )}

              <div>
                <div className="text-[11px] font-semibold text-zinc-400 mb-2 flex items-center gap-1.5">
                  <Hand className="w-3.5 h-3.5 text-amber-400" />
                  <span>Speaker requests ({raisedHandsQueue.length})</span>
                </div>
                {raisedHandsQueue.length === 0 ? (
                  <p className="text-xs text-zinc-500">No listeners requesting to speak right now.</p>
                ) : (
                  <div className="space-y-2 max-h-36 overflow-y-auto">
                    {(Array.isArray(raisedHandsQueue) ? raisedHandsQueue : []).filter(Boolean).map((hand) => {
                      const handName = hand?.name || 'Listener';
                      return (
                        <div
                          key={hand.id || handName}
                          className="flex items-center justify-between p-2 rounded-xl bg-black/60 border border-zinc-800 text-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img
                              src={
                                hand.avatar ||
                                `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(handName)}`
                              }
                              alt={handName}
                              className="w-7 h-7 rounded-full object-cover"
                            />
                            <span className="font-semibold text-white truncate">{handName}</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => approveHand(hand.id)}
                              className="px-2.5 py-1 rounded-full bg-[#7856ff] hover:bg-[#6a45ff] text-white font-bold text-[11px] flex items-center gap-1"
                            >
                              <Check className="w-3 h-3" />
                              <span>Invite</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => declineHand(hand.id)}
                              className="p-1 text-zinc-400 hover:text-rose-400"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Floating Live Emoji Reaction Tray */}
        {showEmojiTray && (
          <div className="mx-5 mb-2 p-2 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-around shadow-xl animate-in slide-in-from-bottom-2 z-20">
            {SPACE_REACTION_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleSendReaction(emoji)}
                className="text-xl hover:scale-125 active:scale-95 transition-transform p-1"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {/* Bottom Dock (Matches Twitter/X Spaces Dock) */}
        <div
          className="px-5 py-3 border-t border-zinc-900 bg-black flex items-center justify-between gap-3 shrink-0"
          style={{ paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 12px), 14px)' }}
        >
          {/* Left: Mic toggle if on stage, OR Raise Hand button if listener */}
          <div className="flex items-center gap-2.5">
            {isOnStage ? (
              <button
                type="button"
                onClick={toggleMyMute}
                className={`h-11 px-4 rounded-full font-bold text-xs flex items-center gap-2 transition-all active:scale-95 ${
                  isMeMuted
                    ? 'bg-zinc-900 border border-zinc-700 text-white hover:bg-zinc-800'
                    : 'bg-[#7856ff] text-white shadow-lg shadow-[#7856ff]/30'
                }`}
              >
                {isMeMuted ? <MicOff className="w-4 h-4 text-rose-400" /> : <Mic className="w-4 h-4" />}
                <span>{isMeMuted ? 'Mic off' : 'Mic on'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => raiseOrLowerHand()}
                className={`h-11 px-4 rounded-full font-bold text-xs flex items-center gap-2 border transition-all active:scale-95 ${
                  hasRaisedHand
                    ? 'bg-amber-500 text-black border-amber-400'
                    : 'bg-zinc-900 border-zinc-700 text-white hover:bg-zinc-800'
                }`}
              >
                <Hand className="w-4 h-4" />
                <span>{hasRaisedHand ? 'Requested' : 'Request'}</span>
              </button>
            )}
          </div>

          {/* Right Action Icons: Participants, Host Controls, React, Live Chat Pill */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowParticipantsSheet(true)}
              className="w-10 h-10 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 flex items-center justify-center text-zinc-200 transition-colors"
              title="Participants"
            >
              <Users className="w-4 h-4" />
            </button>

            {canManage && (
              <button
                type="button"
                onClick={() => setShowManageDeck((v) => !v)}
                className={`relative w-10 h-10 rounded-full border flex items-center justify-center transition-colors ${
                  showManageDeck
                    ? 'bg-white text-black border-white'
                    : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-200'
                }`}
                title="Host controls"
              >
                <Sliders className="w-4 h-4" />
                {raisedHandsQueue.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#7856ff] text-white text-[9px] font-bold flex items-center justify-center">
                    {raisedHandsQueue.length}
                  </span>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowEmojiTray((v) => !v)}
              className={`w-10 h-10 rounded-full border flex items-center justify-center transition-colors ${
                showEmojiTray
                  ? 'bg-white text-black border-white'
                  : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-200'
              }`}
              title="Send live reaction"
            >
              <SmilePlus className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setShowChatSheet(true)}
              className="h-10 px-4 rounded-full bg-[#7856ff] hover:bg-[#6a45ff] text-white font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95"
              title="Open Space chat"
            >
              <MessageCircle className="w-4 h-4" />
              <span>{chatMessages.length}</span>
            </button>
          </div>
        </div>

        {/* ── PARTICIPANTS BOTTOM SHEET ──────────────────────────────────── */}
        {showParticipantsSheet && (
          <div
            onClick={() => setShowParticipantsSheet(false)}
            className="absolute inset-0 z-40 bg-black/70 backdrop-blur-xs flex items-end animate-in fade-in"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full bg-black border-t border-zinc-800 rounded-t-[28px] max-h-[82vh] flex flex-col animate-in slide-in-from-bottom"
            >
              <div className="pt-3 pb-1 flex justify-center shrink-0">
                <div className="w-9 h-1 rounded-full bg-zinc-700" />
              </div>

              <div className="px-5 py-2 border-b border-zinc-900 flex items-center justify-between shrink-0">
                <button
                  type="button"
                  onClick={() => setShowParticipantsSheet(false)}
                  className="flex items-center gap-1 text-xs font-semibold text-zinc-300 hover:text-white py-1 pr-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <h4 className="text-sm font-extrabold text-white">
                  Participants ({totalListeningCount})
                </h4>
                <button
                  type="button"
                  onClick={() => setShowParticipantsSheet(false)}
                  className="p-1 text-zinc-400 hover:text-white"
                  aria-label="Close participants"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Filter Pills: All, Co-hosts, Speakers, Listeners */}
              <div className="px-5 py-2.5 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
                {(
                  [
                    { id: 'all', label: 'All' },
                    { id: 'cohosts', label: 'Co-hosts' },
                    { id: 'speakers', label: 'Speakers' },
                    { id: 'listeners', label: 'Listeners' },
                  ] as const
                ).map((pill) => (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => setParticipantFilter(pill.id)}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold shrink-0 transition-colors ${
                      participantFilter === pill.id
                        ? 'bg-white text-black'
                        : 'bg-transparent border border-zinc-700 text-white hover:border-zinc-500'
                    }`}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
                {/* Host */}
                {participantFilter === 'all' && hostSpeakers.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-base font-extrabold text-white">Host</h4>
                    {hostSpeakers.filter(Boolean).map((h) => {
                      const hName = String(h?.name || 'Host');
                      const hAvatar =
                        h?.avatar ||
                        `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(hName)}`;
                      return (
                        <div key={h.id || hName} className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <img src={hAvatar} alt={hName} className="w-10 h-10 rounded-full object-cover" />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1 text-sm font-bold text-white truncate">
                                <span>{hName}</span>
                                <BadgeCheck className="w-4 h-4 text-sky-500 shrink-0" />
                              </div>
                              <div className="text-xs text-zinc-500 truncate">
                                {h.handle || `@${hName.toLowerCase().replace(/\s+/g, '')}`}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Co-hosts */}
                {(participantFilter === 'all' || participantFilter === 'cohosts') && (
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-base font-extrabold text-white">Co-hosts</h4>
                      <p className="text-xs text-zinc-500">{coHostSpeakers.length} Co-hosts</p>
                    </div>
                    {coHostSpeakers.length === 0 ? (
                      <p className="text-xs text-zinc-500">No co-hosts assigned yet.</p>
                    ) : (
                      coHostSpeakers.filter(Boolean).map((ch) => {
                        const chName = String(ch?.name || 'Co-host');
                        const chAvatar =
                          ch?.avatar ||
                          `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(chName)}`;
                        return (
                          <div key={ch.id || chName} className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <img src={chAvatar} alt={chName} className="w-10 h-10 rounded-full object-cover" />
                              <div className="min-w-0">
                                <div className="text-sm font-bold text-white truncate">{chName}</div>
                                <div className="text-xs text-zinc-500 truncate">
                                  {ch.handle || `@${chName.toLowerCase().replace(/\s+/g, '')}`}
                                </div>
                              </div>
                            </div>
                            {canManage && (
                              <button
                                type="button"
                                onClick={() => {
                                  setShowParticipantsSheet(false);
                                  setSelectedSpeakerForAction(ch);
                                }}
                                className="text-xs text-zinc-400 hover:text-white px-2.5 py-1 rounded-full border border-zinc-800"
                              >
                                Manage
                              </button>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* Speakers */}
                {(participantFilter === 'all' || participantFilter === 'speakers') && (
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-base font-extrabold text-white">Speakers</h4>
                      <p className="text-xs text-zinc-500">Speakers: {stageSpeakers.length}</p>
                    </div>
                    {stageSpeakers.length === 0 ? (
                      <p className="text-xs text-zinc-500">Only host on stage right now.</p>
                    ) : (
                      stageSpeakers.filter(Boolean).map((sp) => {
                        const spName = String(sp?.name || 'Speaker');
                        const spAvatar =
                          sp?.avatar ||
                          `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(spName)}`;
                        return (
                          <div key={sp.id || spName} className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <img src={spAvatar} alt={spName} className="w-10 h-10 rounded-full object-cover" />
                              <div className="min-w-0">
                                <div className="text-sm font-bold text-white truncate">{spName}</div>
                                <div className="text-xs text-zinc-500 truncate">
                                  {sp.isMuted ? 'Muted' : 'Mic active'}
                                </div>
                              </div>
                            </div>
                            {canManage && (
                              <button
                                type="button"
                                onClick={() => {
                                  setShowParticipantsSheet(false);
                                  setSelectedSpeakerForAction(sp);
                                }}
                                className="text-xs text-zinc-400 hover:text-white px-2.5 py-1 rounded-full border border-zinc-800"
                              >
                                Manage
                              </button>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* Listeners */}
                {(participantFilter === 'all' || participantFilter === 'listeners') && (
                  <div className="space-y-3 pb-4">
                    <div>
                      <h4 className="text-base font-extrabold text-white">Listeners</h4>
                      <p className="text-xs text-zinc-500">{listenersList.length} listening</p>
                    </div>
                    {listenersList.length === 0 ? (
                      <p className="text-xs text-zinc-500">No listeners in the audience yet.</p>
                    ) : (
                      listenersList.filter(Boolean).map((ln) => {
                        const lnName = String(ln?.name || 'Listener');
                        return (
                          <div key={ln.id || lnName} className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <img
                                src={
                                  ln.avatar ||
                                  `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(lnName)}`
                                }
                                alt={lnName}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                              <div className="min-w-0">
                                <div className="text-sm font-bold text-white truncate">{lnName}</div>
                                <div className="text-xs text-zinc-500">Listener</div>
                              </div>
                            </div>
                            {canManage && (
                              <button
                                type="button"
                                onClick={() => approveHand(ln.id)}
                                className="px-3 py-1 rounded-full bg-[#7856ff]/20 text-[#9c82ff] hover:bg-[#7856ff] hover:text-white text-xs font-bold transition-colors"
                              >
                                Invite to speak
                              </button>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── LIVE SPACE CHAT SHEET ────────────────────────────────────────── */}
        {showChatSheet && (
          <div
            onClick={() => setShowChatSheet(false)}
            className="absolute inset-0 z-40 bg-black/70 backdrop-blur-xs flex items-end animate-in fade-in"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full bg-black border-t border-zinc-800 rounded-t-[28px] h-[68vh] flex flex-col animate-in slide-in-from-bottom"
            >
              <div className="px-5 py-3 border-b border-zinc-900 flex items-center justify-between shrink-0">
                <button
                  type="button"
                  onClick={() => setShowChatSheet(false)}
                  className="flex items-center gap-1 text-xs font-semibold text-zinc-300 hover:text-white py-1 pr-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <h4 className="text-sm font-extrabold text-white">Space Chat</h4>
                <button
                  type="button"
                  onClick={() => setShowChatSheet(false)}
                  className="p-1 text-zinc-400 hover:text-white"
                  aria-label="Close space chat"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div ref={chatScrollRef} className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
                {!Array.isArray(chatMessages) || chatMessages.length === 0 ? (
                  <div className="text-center py-12 text-xs text-zinc-500">
                    No messages yet. Say hello to everyone in the Space!
                  </div>
                ) : (
                  chatMessages.filter(Boolean).map((m) => {
                    const msgUserName = String(m?.userName || 'Listener');
                    return (
                      <div key={m.id || msgUserName} className="flex items-start gap-2.5 text-xs">
                        <img
                          src={
                            m.userAvatar ||
                            `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(msgUserName)}`
                          }
                          alt={msgUserName}
                          className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline gap-2">
                            <span className="font-bold text-white">{msgUserName}</span>
                            <span className="text-[10px] text-zinc-500">{m.timestamp || 'Now'}</span>
                          </div>
                          <p className="text-zinc-200 mt-0.5 break-words">{m.text || ''}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <form
                onSubmit={handleSendSpaceChat}
                className="px-4 py-3 border-t border-zinc-900 flex items-center gap-2 shrink-0"
              >
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Send a message to the Space..."
                  className="flex-1 px-4 py-2.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#7856ff]"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim()}
                  className="w-9 h-9 rounded-full bg-[#7856ff] hover:bg-[#6a45ff] disabled:opacity-40 text-white flex items-center justify-center shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ── SPEAKER MODERATION ACTION POPUP (Host / Co-Host only) ────────── */}
        {selectedSpeakerForAction && canManage && (
          <div
            onClick={() => setSelectedSpeakerForAction(null)}
            className="absolute inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xs bg-zinc-950 border border-zinc-800 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl space-y-3 text-white animate-in slide-in-from-bottom"
            >
              <div className="flex items-center gap-3 border-b border-zinc-800 pb-3">
                <img
                  src={selectedSpeakerForAction.avatar}
                  alt={selectedSpeakerForAction.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div className="min-w-0">
                  <h4 className="font-bold text-sm truncate">{selectedSpeakerForAction.name}</h4>
                  <span className="text-[11px] text-zinc-400 capitalize">
                    {selectedSpeakerForAction.role}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 text-xs">
                {isCreator && (
                  <button
                    type="button"
                    onClick={() => {
                      setParticipantRole(
                        selectedSpeakerForAction.id,
                        selectedSpeakerForAction.role === 'co-host' ? 'speaker' : 'co-host'
                      );
                      setSelectedSpeakerForAction(null);
                    }}
                    className="w-full p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-100 font-semibold flex items-center gap-2.5 transition-colors"
                  >
                    <Shield className="w-4 h-4 text-[#8b6cff]" />
                    <span>
                      {selectedSpeakerForAction.role === 'co-host'
                        ? 'Remove Co-host'
                        : 'Make Co-host'}
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setParticipantRole(selectedSpeakerForAction.id, 'sponsor');
                    setSelectedSpeakerForAction(null);
                  }}
                  className="w-full p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-100 font-semibold flex items-center gap-2.5 transition-colors"
                >
                  <Gem className="w-4 h-4 text-emerald-400" />
                  <span>Feature as Sponsor</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    toggleParticipantMute(selectedSpeakerForAction.id);
                    setSelectedSpeakerForAction(null);
                  }}
                  className="w-full p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-100 font-semibold flex items-center gap-2.5 transition-colors"
                >
                  <MicOff className="w-4 h-4 text-amber-400" />
                  <span>{selectedSpeakerForAction.isMuted ? 'Unmute mic' : 'Mute mic'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    removeFromStage(selectedSpeakerForAction.id);
                    setSelectedSpeakerForAction(null);
                  }}
                  className="w-full p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-semibold flex items-center gap-2.5 transition-colors"
                >
                  <UserX className="w-4 h-4" />
                  <span>Move to audience</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setSelectedSpeakerForAction(null)}
                className="w-full py-2 text-xs font-semibold text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
