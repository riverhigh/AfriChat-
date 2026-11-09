import React from 'react';
import { Radio, Users, Volume2, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const AudioSpaceBar: React.FC = () => {
  const { activeAudioSpace, joinAudioSpace, leaveAudioSpace } = useApp();

  if (!activeAudioSpace) return null;

  return (
    <div className="fixed top-14 inset-x-0 z-25 max-w-md mx-auto px-3 py-1 pointer-events-none">
      <div
        onClick={() => joinAudioSpace(activeAudioSpace)}
        className="pointer-events-auto bg-gradient-to-r from-[#1e1b4b] via-[#312e81] to-[#4338ca] text-white p-2.5 rounded-2xl shadow-xl border border-indigo-400/40 flex items-center justify-between gap-3 cursor-pointer animate-in slide-in-from-top-2"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 relative">
            <Radio className="w-4 h-4 animate-pulse" />
            <span className="w-2 h-2 rounded-full bg-rose-500 absolute -top-0.5 -right-0.5" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-rose-300 font-bold uppercase">
                Street Radio Live
              </span>
              <span className="text-[10px] text-indigo-200 flex items-center gap-1 font-mono">
                <Users className="w-3 h-3" />
                {activeAudioSpace.listenersCount}
              </span>
            </div>
            <h4 className="text-xs font-bold truncate">
              {activeAudioSpace.title}
            </h4>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] bg-white/15 px-2 py-0.5 rounded-full font-mono text-emerald-300 font-semibold">
            {activeAudioSpace.isLowBandwidthMode ? '12kbps' : 'HD'}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              leaveAudioSpace();
            }}
            className="text-white/60 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
