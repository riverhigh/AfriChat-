import React from 'react';
import {
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Video,
  VideoOff,
  User,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const ActiveCallModal: React.FC = () => {
  const {
    activeCall,
    endCall,
    toggleCallMute,
    toggleCallSpeaker,
  } = useApp();

  if (!activeCall) return null;

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? `0${secs}` : secs}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0f0e1c] text-white flex flex-col justify-between p-6 animate-in fade-in duration-200">
      {/* Top Details */}
      <div className="text-center pt-8 space-y-2">
        <span className="text-xs font-mono text-indigo-400 font-semibold tracking-wider uppercase">
          AfriChat {activeCall.type === 'video' ? 'Video Call' : 'Voice Call'} · End-to-End Encrypted
        </span>
        <h2 className="text-2xl font-bold font-display tracking-tight">
          {activeCall.name}
        </h2>
        <div className="text-sm font-mono text-slate-400">
          {activeCall.phone}
        </div>
        <div className="text-base font-mono text-emerald-400 font-semibold pt-1">
          {activeCall.durationSeconds === 0 ? 'Connecting...' : formatTimer(activeCall.durationSeconds)}
        </div>
      </div>

      {/* Avatar / Video Preview */}
      <div className="flex flex-col items-center justify-center my-auto">
        <div className="relative">
          <div className="w-32 h-32 rounded-full p-1 bg-gradient-to-tr from-indigo-500 to-amber-500 shadow-2xl">
            {activeCall.avatar ? (
              <img
                src={activeCall.avatar}
                alt={activeCall.name}
                referrerPolicy="no-referrer"
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <div className="w-full h-full rounded-full bg-slate-800 flex items-center justify-center text-white">
                <User className="w-14 h-14 text-slate-400" />
              </div>
            )}
          </div>
          {activeCall.durationSeconds > 0 && (
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-emerald-500 text-slate-950 font-bold text-[10px] rounded-full uppercase tracking-wider">
              Connected
            </div>
          )}
        </div>
      </div>

      {/* In-Call Controls */}
      <div className="pb-8 space-y-6">
        <div className="grid grid-cols-3 gap-4 max-w-xs mx-auto text-center">
          {/* Mute */}
          <button
            onClick={toggleCallMute}
            className={`w-14 h-14 mx-auto rounded-full flex items-center justify-center transition-colors ${
              activeCall.isMuted
                ? 'bg-rose-500 text-white'
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
          >
            {activeCall.isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>

          {/* Speaker */}
          <button
            onClick={toggleCallSpeaker}
            className={`w-14 h-14 mx-auto rounded-full flex items-center justify-center transition-colors ${
              activeCall.isSpeaker
                ? 'bg-indigo-600 text-white'
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
          >
            {activeCall.isSpeaker ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
          </button>

          {/* Video Toggle */}
          <button
            onClick={() => alert('Camera toggle')}
            className="w-14 h-14 mx-auto rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
          >
            {activeCall.type === 'video' ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
          </button>
        </div>

        {/* Big Red Hangup Button */}
        <div className="flex justify-center">
          <button
            onClick={endCall}
            className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-xl active:scale-95 transition-transform"
            aria-label="End call"
          >
            <PhoneOff className="w-7 h-7" />
          </button>
        </div>
      </div>
    </div>
  );
};
