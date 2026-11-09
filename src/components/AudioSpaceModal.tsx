import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const AudioSpaceModal: React.FC = () => {
  const {
    activeAudioSpace,
    leaveAudioSpace,
    toggleAudioSpaceMute,
    toggleSpaceLowBandwidth,
  } = useApp();

  const [floatingEmojis, setFloatingEmojis] = useState<{ id: number; emoji: string; x: number }[]>([]);
  const [hasRequestedMic, setHasRequestedMic] = useState(false);

  if (!activeAudioSpace) return null;

  const mySpeaker = activeAudioSpace.speakers.find((s) => s.id === 'sp_2');
  const isMeMuted = mySpeaker?.isMuted ?? true;

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

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-gradient-to-b from-[#181530] via-[#120f24] to-[#0a0817] rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden border border-indigo-500/30 text-white relative">
        {/* Floating animated reaction emojis */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
          {floatingEmojis.map((item) => (
            <div
              key={item.id}
              style={{ left: `${item.x}%` }}
              className="absolute bottom-20 text-3xl animate-bounce duration-1000 transition-all opacity-90"
            >
              {item.emoji}
            </div>
          ))}
        </div>

        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
            </span>
            <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-rose-400 uppercase tracking-wider">
              <Radio className="w-4 h-4" />
              <span>Street Radio Live</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Low Bandwidth Mode Badge Toggle */}
            <button
              type="button"
              onClick={toggleSpaceLowBandwidth}
              className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold flex items-center gap-1 border transition-colors ${
                activeAudioSpace.isLowBandwidthMode
                  ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                  : 'bg-white/10 border-white/20 text-slate-300'
              }`}
              title="Compress stream to 12kbps for poor network zones"
            >
              <Wifi className="w-3 h-3" />
              <span>{activeAudioSpace.isLowBandwidthMode ? '12kbps Afta-Code' : 'HD Voice'}</span>
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

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Room Title */}
          <div>
            <div className="text-[11px] font-mono text-indigo-400 uppercase font-semibold">
              {activeAudioSpace.category}
            </div>
            <h2 className="text-lg font-bold font-display mt-0.5 leading-snug">
              {activeAudioSpace.title}
            </h2>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              {activeAudioSpace.topic}
            </p>
          </div>

          {/* Speakers Section */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-3">
              <span>Speakers on Stage</span>
              <span className="font-mono text-[11px] text-indigo-300">
                {activeAudioSpace.speakers.length} Speaking
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {activeAudioSpace.speakers.map((speaker) => (
                <div
                  key={speaker.id}
                  className="flex flex-col items-center p-3 rounded-2xl bg-white/5 border border-white/10 relative text-center"
                >
                  {/* Glowing speaking ring */}
                  <div
                    className={`w-14 h-14 rounded-full p-0.5 relative transition-all ${
                      speaker.isSpeaking
                        ? 'ring-4 ring-emerald-500 ring-offset-2 ring-offset-[#120f24]'
                        : ''
                    }`}
                  >
                    <img
                      src={speaker.avatar}
                      alt={speaker.name}
                      className="w-full h-full rounded-full object-cover"
                    />
                    <div
                      className={`absolute bottom-0 right-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] border border-[#120f24] ${
                        speaker.isMuted
                          ? 'bg-rose-500 text-white'
                          : 'bg-emerald-500 text-white'
                      }`}
                    >
                      {speaker.isMuted ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
                    </div>
                  </div>

                  <span className="font-semibold text-xs mt-2 truncate w-full">
                    {speaker.name}
                  </span>
                  <span className="text-[10px] text-slate-400 uppercase font-mono">
                    {speaker.role}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Audio Visualizer Waves (Simulated) */}
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-1.5 px-4">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span className="text-xs font-mono text-emerald-300">Live Audio Stream</span>
            </div>
            <div className="flex items-end gap-1 h-6">
              {[12, 24, 18, 8, 22, 16, 26, 14, 20, 10, 24].map((h, i) => (
                <div
                  key={i}
                  style={{ height: `${h}px` }}
                  className="w-1 bg-gradient-to-t from-emerald-500 to-indigo-400 rounded-full animate-pulse"
                />
              ))}
            </div>
          </div>

          {/* Listeners Info */}
          <div className="flex items-center justify-between text-xs text-slate-400 px-1 font-mono">
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-slate-500" />
              <span>{activeAudioSpace.listenersCount} African Market Listeners</span>
            </div>
            <span>Hosted by {activeAudioSpace.hostName}</span>
          </div>

          {/* Reaction Bar */}
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400 mb-1 px-1">
              Tap Emoji Reactions
            </div>
            <div className="flex justify-between items-center bg-white/5 p-2 rounded-2xl border border-white/10">
              {['🔥', '👏', '🇳🇬', '💃', '💯', '😂'].map((emoji) => (
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

        {/* Footer Actions */}
        <div className="p-4 border-t border-white/10 bg-[#0c0919] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={toggleAudioSpaceMute}
            className={`flex-1 py-3 px-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all ${
              isMeMuted
                ? 'bg-rose-600/90 hover:bg-rose-600 text-white'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white ring-2 ring-emerald-400/40'
            }`}
          >
            {isMeMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            <span>{isMeMuted ? 'Unmute My Mic' : 'Mic Active (Mute)'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setHasRequestedMic(!hasRequestedMic);
              alert(hasRequestedMic ? 'Cancelled mic request' : 'Hand raised to speak! Host will bring you up.');
            }}
            className={`py-3 px-4 rounded-2xl font-bold text-xs flex items-center gap-1.5 border transition-colors ${
              hasRequestedMic
                ? 'bg-amber-500 text-slate-900 border-amber-400'
                : 'bg-white/10 border-white/20 text-white hover:bg-white/15'
            }`}
          >
            <Hand className="w-4 h-4" />
            <span>{hasRequestedMic ? 'Hand Raised' : 'Request Mic'}</span>
          </button>

          <button
            type="button"
            onClick={leaveAudioSpace}
            className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-rose-400 rounded-2xl text-xs font-bold"
          >
            Leave Quietly
          </button>
        </div>
      </div>
    </div>
  );
};
