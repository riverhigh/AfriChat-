import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Mic,
  MicOff,
  Radio,
  Users,
  Wifi,
  Sparkles,
  Volume2,
  Hand,
  Share2,
  Crown,
  Shield,
  Gem,
  Settings,
  UserCheck,
  UserX,
  VolumeX,
  Pin,
  Megaphone,
  Check,
  Plus,
  Clock,
  XCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AudioSpaceSpeaker } from '../types';

export const AudioSpaceModal: React.FC = () => {
  const {
    activeAudioSpace,
    leaveAudioSpace,
    endAudioSpace,
    spaceEndedSummary,
    setSpaceEndedSummary,
    toggleAudioSpaceMute,
    toggleSpaceLowBandwidth,
    currentUser,
  } = useApp();

  const [floatingEmojis, setFloatingEmojis] = useState<{ id: number; emoji: string; x: number }[]>([]);
  const [hasRequestedMic, setHasRequestedMic] = useState(false);
  const [showManageDeck, setShowManageDeck] = useState(false);
  const [selectedSpeakerForAction, setSelectedSpeakerForAction] = useState<AudioSpaceSpeaker | null>(null);

  // Live duration timer & live peak listeners
  const [liveSeconds, setLiveSeconds] = useState(0);
  const [livePeak, setLivePeak] = useState(() => activeAudioSpace?.listenersCount || 1);

  useEffect(() => {
    if (!activeAudioSpace) return;
    const start = activeAudioSpace.startedAt || Date.now();
    setLiveSeconds(Math.max(0, Math.floor((Date.now() - start) / 1000)));

    const timer = setInterval(() => {
      setLiveSeconds(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    }, 1000);

    return () => clearInterval(timer);
  }, [activeAudioSpace?.id, activeAudioSpace?.startedAt]);

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

  // Local state for interactive stage management
  const [speakersList, setSpeakersList] = useState<AudioSpaceSpeaker[]>(() => {
    if (!activeAudioSpace) return [];
    // Ensure host, co-host, and sponsor are well-represented
    const current = activeAudioSpace.speakers || [];
    const hasHost = current.some((s) => s.role === 'host');
    const hasCoHost = current.some((s) => s.role === 'co-host');
    const hasSponsor = current.some((s) => s.role === 'sponsor');

    let enhanced = [...current];
    if (!hasHost) {
      enhanced.unshift({
        id: 'host_main',
        name: activeAudioSpace.hostName || 'Host',
        avatar: activeAudioSpace.hostAvatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        role: 'host',
        isSpeaking: true,
        isMuted: false,
      });
    }

    if (!hasCoHost && enhanced.length > 1) {
      enhanced[1] = { ...enhanced[1], role: 'co-host' };
    }

    if (!hasSponsor) {
      enhanced.push({
        id: 'sp_sponsor',
        name: 'Kente Pay Africa',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        role: 'sponsor',
        isSpeaking: false,
        isMuted: false,
        sponsorBrand: 'Kente Pay',
        sponsorTagline: 'Zero-Fee African Merchant Remittances',
      });
    }

    return enhanced;
  });

  const [raisedHandsQueue, setRaisedHandsQueue] = useState<{ id: string; name: string; avatar: string; time: string }[]>([
    {
      id: 'rh_1',
      name: 'Amara Okafor',
      avatar: 'https://api.dicebear.com/8.x/initials/svg?seed=Amara&backgroundColor=581c87&textColor=ffffff',
      time: '1m ago',
    },
    {
      id: 'rh_2',
      name: 'Kofi Mensah',
      avatar: 'https://api.dicebear.com/8.x/initials/svg?seed=Kofi&backgroundColor=065f46&textColor=ffffff',
      time: 'Just now',
    },
  ]);

  const [pinnedNote, setPinnedNote] = useState<string>(
    '📢 Welcome to Street Radio! Q&A session starts in 10 mins. Raise your hand to speak.'
  );
  const [isEditingPin, setIsEditingPin] = useState(false);
  const [pinInput, setPinInput] = useState(pinnedNote);

  if (spaceEndedSummary) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
        <div className="w-full max-w-sm rounded-3xl bg-gradient-to-b from-[#1f0b3b] via-[#120624] to-[#0b0317] border border-purple-500/40 p-6 text-center space-y-4 shadow-2xl text-white">
          <div className="w-14 h-14 rounded-full bg-purple-600/20 text-purple-400 mx-auto flex items-center justify-center border border-purple-500/30">
            <Radio className="w-7 h-7" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-purple-400 bg-purple-950/60 border border-purple-500/30 px-2.5 py-0.5 rounded-full">
              Space Concluded
            </span>
            <h3 className="text-lg font-black font-display text-white mt-2">
              {spaceEndedSummary.title}
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-2.5 py-2">
            <div className="p-3 bg-purple-950/50 rounded-2xl border border-purple-500/20 text-center">
              <Clock className="w-4 h-4 text-amber-400 mx-auto mb-1" />
              <div className="text-[10px] text-purple-300/70 font-mono">Total Duration</div>
              <div className="text-base font-black font-mono text-white mt-0.5">
                {spaceEndedSummary.durationFormatted}
              </div>
            </div>
            <div className="p-3 bg-purple-950/50 rounded-2xl border border-purple-500/20 text-center">
              <Users className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
              <div className="text-[10px] text-purple-300/70 font-mono">Peak Listeners</div>
              <div className="text-base font-black font-mono text-white mt-0.5">
                {spaceEndedSummary.peakListeners}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSpaceEndedSummary(null)}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95"
          >
            Return to Town
          </button>
        </div>
      </div>
    );
  }

  if (!activeAudioSpace) return null;

  // Determine current user's role in this Space
  const mySpeaker = speakersList.find(
    (s) => s.id === currentUser.id || s.name.toLowerCase().includes(currentUser.fullName.toLowerCase())
  );
  const isHost = mySpeaker?.role === 'host' || activeAudioSpace.hostName.toLowerCase().includes(currentUser.fullName.toLowerCase()) || true; // allow manage controls for creator
  const isCoHost = mySpeaker?.role === 'co-host';
  const isSponsor = mySpeaker?.role === 'sponsor';
  const canManage = isHost || isCoHost;
  const isMeMuted = mySpeaker?.isMuted ?? false;

  const handleSendReaction = (emoji: string) => {
    const newEmoji = {
      id: Date.now() + Math.random(),
      emoji,
      x: Math.floor(Math.random() * 80) + 10,
    };
    setFloatingEmojis((prev) => [...prev, newEmoji]);
    setTimeout(() => {
      setFloatingEmojis((prev) => prev.filter((e) => e.id !== newEmoji.id));
    }, 2000);
  };

  const handleMuteAll = () => {
    setSpeakersList((prev) =>
      prev.map((s) => (s.role === 'host' ? s : { ...s, isMuted: true, isSpeaking: false }))
    );
  };

  const handleApproveRaisedHand = (hand: { id: string; name: string; avatar: string }) => {
    // Promote to stage
    setSpeakersList((prev) => [
      ...prev,
      {
        id: hand.id,
        name: hand.name,
        avatar: hand.avatar,
        role: 'speaker',
        isSpeaking: false,
        isMuted: false,
      },
    ]);
    setRaisedHandsQueue((prev) => prev.filter((h) => h.id !== hand.id));
  };

  const handleDeclineRaisedHand = (id: string) => {
    setRaisedHandsQueue((prev) => prev.filter((h) => h.id !== id));
  };

  const handleToggleSpeakerMute = (speakerId: string) => {
    setSpeakersList((prev) =>
      prev.map((s) => (s.id === speakerId ? { ...s, isMuted: !s.isMuted } : s))
    );
  };

  const handleSetRole = (speakerId: string, newRole: 'host' | 'co-host' | 'sponsor' | 'speaker') => {
    setSpeakersList((prev) =>
      prev.map((s) => (s.id === speakerId ? { ...s, role: newRole } : s))
    );
    setSelectedSpeakerForAction(null);
  };

  const handleRemoveFromStage = (speakerId: string) => {
    setSpeakersList((prev) => prev.filter((s) => s.id !== speakerId));
    setSelectedSpeakerForAction(null);
  };

  const sponsorSpeaker = speakersList.find((s) => s.role === 'sponsor');

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-gradient-to-b from-[#190d33] via-[#100824] to-[#080414] rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden border border-purple-500/30 text-white relative">
        
        {/* Floating animated reaction emojis */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-30">
          {floatingEmojis.map((item) => (
            <div
              key={item.id}
              style={{ left: `${item.x}%` }}
              className="absolute bottom-24 text-3xl animate-bounce duration-1000 transition-all opacity-90"
            >
              {item.emoji}
            </div>
          ))}
        </div>

        {/* ── Top Header ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-purple-500/20 shrink-0 bg-white/5">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
            </span>
            <div className="flex items-center gap-1.5 font-mono text-xs font-black text-rose-400 uppercase tracking-wider">
              <Radio className="w-4 h-4" />
              <span>Street Radio Live</span>
            </div>
            {/* Live Ticking Duration Clock */}
            <div className="flex items-center gap-1 text-[11px] font-mono font-bold text-amber-300 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
              <Clock className="w-3 h-3 text-amber-400" />
              <span>{formatClockDisplay(liveSeconds)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Manage Deck Toggle (for Host / Co-Host) */}
            {canManage && (
              <button
                type="button"
                onClick={() => setShowManageDeck(!showManageDeck)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 border transition-all ${
                  showManageDeck
                    ? 'bg-amber-500 text-black border-amber-400 shadow-md shadow-amber-500/30'
                    : 'bg-white/10 border-white/20 text-amber-300 hover:bg-white/20'
                }`}
                title="Host & Co-Host Stage Management Controls"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Host Deck</span>
                {raisedHandsQueue.length > 0 && (
                  <span className="w-4 h-4 rounded-full bg-rose-600 text-white text-[9px] font-black flex items-center justify-center">
                    {raisedHandsQueue.length}
                  </span>
                )}
              </button>
            )}

            {/* Low Bandwidth Mode Badge Toggle */}
            <button
              type="button"
              onClick={toggleSpaceLowBandwidth}
              className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold flex items-center gap-1 border transition-colors ${
                activeAudioSpace.isLowBandwidthMode
                  ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                  : 'bg-white/10 border-white/20 text-slate-300'
              }`}
              title="Compress stream for poor 2G/3G network zones"
            >
              <Wifi className="w-3 h-3" />
              <span>{activeAudioSpace.isLowBandwidthMode ? '12kbps Stream' : 'HD Voice'}</span>
            </button>

            <button
              type="button"
              onClick={leaveAudioSpace}
              className="p-1 rounded-full text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── Main Body ──────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          
          {/* Space Title & Category */}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-purple-600/30 border border-purple-500/40 text-purple-300 uppercase font-bold tracking-wider">
                {activeAudioSpace.category}
              </span>
              <span className="text-[11px] font-mono text-purple-300/80 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-white font-semibold">{activeAudioSpace.listenersCount} tuned in</span>
                <span className="text-[10px] text-purple-400 font-medium">· Peak: {livePeak}</span>
              </span>
            </div>
            <h2 className="text-xl font-black font-display mt-1 leading-snug text-white">
              {activeAudioSpace.title}
            </h2>
            {activeAudioSpace.topic && (
              <p className="text-xs text-purple-200/70 mt-1 leading-relaxed">
                {activeAudioSpace.topic}
              </p>
            )}
          </div>

          {/* 💎 Official Sponsor Spotlight Banner */}
          {sponsorSpeaker && (
            <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-teal-950/40 to-purple-950/50 border border-emerald-500/40 flex items-center justify-between gap-3 shadow-lg shadow-emerald-950/30">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shrink-0 shadow-sm">
                  <img
                    src={sponsorSpeaker.avatar}
                    alt={sponsorSpeaker.sponsorBrand || sponsorSpeaker.name}
                    className="w-full h-full rounded-[10px] object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 text-[9px] font-black bg-emerald-500 text-black px-1.5 py-0.2 rounded font-mono uppercase tracking-wider">
                      <Gem className="w-2.5 h-2.5" />
                      SPONSOR
                    </span>
                    <span className="font-bold text-xs text-white truncate">
                      {sponsorSpeaker.sponsorBrand || sponsorSpeaker.name}
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-200/80 truncate mt-0.5">
                    {sponsorSpeaker.sponsorTagline || 'Official space patron & African brand sponsor'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => alert(`Visiting ${sponsorSpeaker.sponsorBrand || sponsorSpeaker.name} store on AGC!`)}
                className="px-2.5 py-1 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-[10px] font-bold shrink-0 transition-transform active:scale-95"
              >
                Explore 🛍️
              </button>
            </div>
          )}

          {/* 📌 Pinned Announcement Bar */}
          {pinnedNote && (
            <div className="p-2.5 rounded-xl bg-purple-950/40 border border-purple-500/30 flex items-center justify-between gap-2 text-xs text-purple-200">
              <div className="flex items-center gap-2 min-w-0">
                <Pin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="truncate">{pinnedNote}</span>
              </div>
              {canManage && (
                <button
                  type="button"
                  onClick={() => {
                    const updated = prompt('Edit pinned announcement:', pinnedNote);
                    if (updated !== null) setPinnedNote(updated.trim());
                  }}
                  className="text-[10px] font-bold text-purple-400 hover:text-white shrink-0 underline"
                >
                  Edit
                </button>
              )}
            </div>
          )}

          {/* ── Speakers on Stage (Distinct Role Avatars) ─────────────────── */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-purple-300/80 mb-3 px-1">
              <span className="font-mono uppercase tracking-wider text-[11px] font-bold">
                Speakers & Stage Leaders
              </span>
              <span className="font-mono text-[11px] text-purple-400">
                {speakersList.length} on Stage
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {speakersList.map((speaker) => {
                const isThisHost = speaker.role === 'host';
                const isThisCoHost = speaker.role === 'co-host';
                const isThisSponsor = speaker.role === 'sponsor';

                return (
                  <div
                    key={speaker.id}
                    onClick={() => canManage && setSelectedSpeakerForAction(speaker)}
                    className={`flex flex-col items-center p-3 rounded-2xl relative text-center transition-all cursor-pointer ${
                      isThisHost
                        ? 'bg-gradient-to-b from-amber-950/30 to-purple-950/40 border-2 border-amber-500/60 shadow-lg shadow-amber-950/30'
                        : isThisCoHost
                        ? 'bg-gradient-to-b from-purple-950/40 to-indigo-950/40 border-2 border-purple-500/50 shadow-md shadow-purple-950/30'
                        : isThisSponsor
                        ? 'bg-gradient-to-b from-emerald-950/40 to-teal-950/40 border-2 border-emerald-500/50 shadow-md shadow-emerald-950/30'
                        : 'bg-white/5 border border-white/10 hover:border-purple-500/40'
                    }`}
                  >
                    {/* Ring around avatar indicating role & speaking waveform */}
                    <div
                      className={`w-14 h-14 rounded-full p-0.5 relative transition-all ${
                        isThisHost
                          ? 'ring-4 ring-amber-400 ring-offset-2 ring-offset-[#100824]'
                          : isThisCoHost
                          ? 'ring-4 ring-purple-500 ring-offset-2 ring-offset-[#100824]'
                          : isThisSponsor
                          ? 'ring-4 ring-emerald-400 ring-offset-2 ring-offset-[#100824]'
                          : speaker.isSpeaking
                          ? 'ring-4 ring-emerald-500 ring-offset-2 ring-offset-[#100824]'
                          : 'ring-1 ring-white/20'
                      }`}
                    >
                      <img
                        src={speaker.avatar}
                        alt={speaker.name}
                        className="w-full h-full rounded-full object-cover"
                      />

                      {/* Mic Status Badge */}
                      <div
                        className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] ring-2 ring-[#100824] ${
                          speaker.isMuted
                            ? 'bg-rose-500 text-white'
                            : 'bg-emerald-500 text-white'
                        }`}
                      >
                        {speaker.isMuted ? <MicOff className="w-2.5 h-2.5" /> : <Mic className="w-2.5 h-2.5" />}
                      </div>
                    </div>

                    {/* Role Pill */}
                    <div className="mt-2.5">
                      {isThisHost && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 text-black font-mono tracking-wider shadow-sm">
                          <Crown className="w-2.5 h-2.5 fill-black" />
                          HOST
                        </span>
                      )}
                      {isThisCoHost && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-mono tracking-wider shadow-sm">
                          <Shield className="w-2.5 h-2.5 fill-white" />
                          CO-HOST
                        </span>
                      )}
                      {isThisSponsor && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 text-black font-mono tracking-wider shadow-sm">
                          <Gem className="w-2.5 h-2.5 fill-black" />
                          SPONSOR
                        </span>
                      )}
                      {!isThisHost && !isThisCoHost && !isThisSponsor && (
                        <span className="text-[9px] font-mono text-purple-300 font-bold uppercase tracking-wider">
                          Speaker
                        </span>
                      )}
                    </div>

                    <span className="font-bold text-xs mt-1 truncate w-full text-white">
                      {speaker.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Host & Co-Host Interactive Management Deck (Collapsible) ──── */}
          {showManageDeck && canManage && (
            <div className="p-4 rounded-2xl bg-[#140b2a] border border-amber-500/40 space-y-3.5 animate-in slide-in-from-top-2 shadow-xl">
              <div className="flex items-center justify-between border-b border-purple-500/20 pb-2">
                <div className="flex items-center gap-2">
                  <Crown className="w-4 h-4 text-amber-400" />
                  <span className="font-bold text-xs uppercase tracking-wide text-amber-300">
                    Host & Co-Host Control Deck
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleMuteAll}
                  className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold flex items-center gap-1"
                >
                  <VolumeX className="w-3 h-3" />
                  <span>Mute All</span>
                </button>
              </div>

              {/* Raised Hands Queue */}
              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-purple-300 mb-2">
                  <span className="flex items-center gap-1.5">
                    <Hand className="w-3.5 h-3.5 text-amber-400" />
                    <span>Raised Hands Requesting Mic ({raisedHandsQueue.length})</span>
                  </span>
                </div>

                {raisedHandsQueue.length === 0 ? (
                  <p className="text-[11px] text-purple-400/60 italic py-1">
                    No listeners requesting the microphone right now.
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {raisedHandsQueue.map((hand) => (
                      <div
                        key={hand.id}
                        className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-purple-500/20 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <img
                            src={hand.avatar}
                            alt={hand.name}
                            className="w-7 h-7 rounded-full object-cover"
                          />
                          <span className="font-bold text-white truncate">{hand.name}</span>
                          <span className="text-[10px] text-purple-400 font-mono">{hand.time}</span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleApproveRaisedHand(hand)}
                            className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] flex items-center gap-1"
                          >
                            <Check className="w-3 h-3" />
                            <span>Bring to Stage</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeclineRaisedHand(hand.id)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-400"
                            title="Decline"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Audio Stream Waveform Simulator ────────────────────────────── */}
          <div className="p-3 rounded-2xl bg-white/5 border border-purple-500/20 flex items-center justify-between gap-1.5 px-4">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span className="text-xs font-mono text-emerald-300 font-bold">Encrypted African Audio Stream</span>
            </div>
            <div className="flex items-end gap-1 h-6">
              {[10, 22, 16, 28, 14, 24, 18, 30, 12, 26, 16].map((h, i) => (
                <div
                  key={i}
                  style={{ height: `${h}px` }}
                  className="w-1 bg-gradient-to-t from-emerald-500 via-purple-500 to-indigo-400 rounded-full animate-pulse"
                />
              ))}
            </div>
          </div>

          {/* ── Reaction Bar ──────────────────────────────────────────────── */}
          <div>
            <div className="text-[10px] uppercase font-bold text-purple-300/80 mb-1.5 px-1 font-mono">
              Tap Live Reactions
            </div>
            <div className="flex justify-between items-center bg-white/5 p-2 rounded-2xl border border-purple-500/20">
              {['🔥', '👏', '🇳🇬', '💃', '💯', '💎'].map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleSendReaction(emoji)}
                  className="text-2xl hover:scale-125 transition-transform active:scale-95 p-1"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Bottom Controls Dock ─────────────────────────────────────────── */}
        <div className="p-4 border-t border-purple-500/20 bg-[#0a0517] flex items-center justify-between gap-2.5 shrink-0">
          {/* Mute / Unmute Toggle */}
          <button
            type="button"
            onClick={toggleAudioSpaceMute}
            className={`flex-1 py-3 px-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 ${
              isMeMuted
                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white ring-2 ring-emerald-400/40'
            }`}
          >
            {isMeMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            <span>{isMeMuted ? 'Unmute My Mic' : 'Mic Active (Tap to Mute)'}</span>
          </button>

          {/* Raise Hand Toggle */}
          <button
            type="button"
            onClick={() => {
              setHasRequestedMic(!hasRequestedMic);
              if (!hasRequestedMic) {
                // Add current user to raised hands queue
                setRaisedHandsQueue((prev) => [
                  ...prev,
                  {
                    id: currentUser.id,
                    name: `${currentUser.fullName || 'You'}`,
                    avatar: currentUser.avatarUrl || 'https://api.dicebear.com/8.x/initials/svg?seed=You',
                    time: 'Just now',
                  },
                ]);
              }
            }}
            className={`py-3 px-4 rounded-2xl font-bold text-xs flex items-center gap-1.5 border transition-all active:scale-95 ${
              hasRequestedMic
                ? 'bg-amber-500 text-black border-amber-400 shadow-md shadow-amber-500/30'
                : 'bg-white/10 border-white/20 text-white hover:bg-white/15'
            }`}
          >
            <Hand className="w-4 h-4" />
            <span>{hasRequestedMic ? 'Hand Raised' : 'Request Mic'}</span>
          </button>

          {/* End Space Button for Host */}
          {isHost && (
            <button
              type="button"
              onClick={() =>
                endAudioSpace(activeAudioSpace.id, {
                  durationFormatted: formatLiveDuration(liveSeconds),
                  peakListeners: livePeak,
                })
              }
              className="py-3 px-4 bg-rose-600/80 hover:bg-rose-600 text-white border border-rose-500 rounded-2xl text-xs font-bold transition-all shadow-md active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <XCircle className="w-4 h-4" />
              <span>End Space</span>
            </button>
          )}

          {/* Leave Button */}
          <button
            type="button"
            onClick={leaveAudioSpace}
            className="py-3 px-4 bg-white/5 hover:bg-rose-950/40 text-rose-400 border border-white/10 rounded-2xl text-xs font-bold transition-colors"
          >
            Leave
          </button>
        </div>

        {/* ── Speaker Action Popup (When Host taps a speaker) ──────────────── */}
        {selectedSpeakerForAction && canManage && (
          <div
            onClick={() => setSelectedSpeakerForAction(null)}
            className="fixed inset-0 z-60 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xs bg-[#150a2b] border border-purple-500/40 rounded-3xl p-5 shadow-2xl space-y-3 text-white animate-in zoom-in-95"
            >
              <div className="flex items-center gap-3 border-b border-purple-500/20 pb-3">
                <img
                  src={selectedSpeakerForAction.avatar}
                  alt={selectedSpeakerForAction.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div className="min-w-0">
                  <h4 className="font-bold text-sm truncate">{selectedSpeakerForAction.name}</h4>
                  <span className="text-[10px] font-mono text-purple-400 uppercase">
                    Current Role: {selectedSpeakerForAction.role}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => handleSetRole(selectedSpeakerForAction.id, 'co-host')}
                  className="w-full p-2.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/40 text-purple-200 font-bold flex items-center gap-2 transition-colors"
                >
                  <Shield className="w-4 h-4 text-purple-400" />
                  <span>Promote to Co-Host</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSetRole(selectedSpeakerForAction.id, 'sponsor')}
                  className="w-full p-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-200 font-bold flex items-center gap-2 transition-colors"
                >
                  <Gem className="w-4 h-4 text-emerald-400" />
                  <span>Designate as Official Sponsor</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleSpeakerMute(selectedSpeakerForAction.id)}
                  className="w-full p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold flex items-center gap-2 transition-colors"
                >
                  <MicOff className="w-4 h-4 text-amber-400" />
                  <span>{selectedSpeakerForAction.isMuted ? 'Unmute Speaker' : 'Mute Speaker'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRemoveFromStage(selectedSpeakerForAction.id)}
                  className="w-full p-2.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 font-bold flex items-center gap-2 transition-colors"
                >
                  <UserX className="w-4 h-4 text-rose-400" />
                  <span>Move to Audience</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setSelectedSpeakerForAction(null)}
                className="w-full py-2 text-xs font-bold text-slate-400 hover:text-white"
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
