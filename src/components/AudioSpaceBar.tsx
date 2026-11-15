import React, { useState, useEffect } from 'react';
import { Radio, Users, X, Clock } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const AudioSpaceBar: React.FC = () => {
  const { activeAudioSpace, isAudioSpaceMinimized, setIsAudioSpaceMinimized, leaveAudioSpace } = useApp();
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!activeAudioSpace) return;
    const start = activeAudioSpace.startedAt || Date.now();
    setSeconds(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    const interval = setInterval(() => {
      setSeconds(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    }, 1000);
    return () => clearInterval(interval);
  }, [activeAudioSpace?.id, activeAudioSpace?.startedAt]);

  if (!activeAudioSpace || !isAudioSpaceMinimized) return null;

  const minutes = Math.floor(seconds / 60);
  const remSec = seconds % 60;
  const clockStr = `${String(minutes).padStart(2, '0')}:${String(remSec).padStart(2, '0')}`;

  return (
    <div className="fixed top-14 inset-x-0 z-25 max-w-md mx-auto px-3 py-1 pointer-events-none">
      <div
        onClick={() => setIsAudioSpaceMinimized(false)}
        className="pointer-events-auto bg-zinc-950/95 backdrop-blur-md text-white px-3.5 py-2.5 rounded-full shadow-2xl border border-[#7856ff]/50 flex items-center justify-between gap-3 cursor-pointer animate-in slide-in-from-top-2"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-[#7856ff]/20 text-[#9c82ff] flex items-center justify-center shrink-0 relative">
            <Radio className="w-4 h-4 animate-pulse" />
            <span className="w-2 h-2 rounded-full bg-[#7856ff] absolute -top-0.5 -right-0.5" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[10px]">
              <span className="text-[#9c82ff] font-extrabold uppercase tracking-wider">
                LIVE
              </span>
              <span className="text-zinc-500">·</span>
              <span className="text-zinc-300 flex items-center gap-1 font-mono">
                <Clock className="w-3 h-3 text-zinc-400" />
                {clockStr}
              </span>
              <span className="text-zinc-500">·</span>
              <span className="text-zinc-300 flex items-center gap-1">
                <Users className="w-3 h-3 text-zinc-400" />
                {activeAudioSpace.listenersCount}
              </span>
            </div>
            <h4 className="text-xs font-bold truncate text-white">
              {activeAudioSpace.title}
            </h4>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-full font-mono text-zinc-300 font-semibold">
            {activeAudioSpace.isLowBandwidthMode ? '12kbps' : 'HD'}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              leaveAudioSpace();
            }}
            className="text-zinc-400 hover:text-white p-1"
            aria-label="Leave space"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
