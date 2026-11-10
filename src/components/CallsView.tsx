import React, { useState } from 'react';
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Video,
  UserPlus,
  Delete,
  PhoneCall,
  X,
  Grid,
  Plus,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const CallsView: React.FC = () => {
  const { calls, startCall } = useApp();
  const [showKeypad, setShowKeypad] = useState(false);
  const [dialedNumber, setDialedNumber] = useState('');

  const keypadKeys = [
    { num: '1', letters: '' },
    { num: '2', letters: 'ABC' },
    { num: '3', letters: 'DEF' },
    { num: '4', letters: 'GHI' },
    { num: '5', letters: 'JKL' },
    { num: '6', letters: 'MNO' },
    { num: '7', letters: 'PQRS' },
    { num: '8', letters: 'TUV' },
    { num: '9', letters: 'WXYZ' },
    { num: '*', letters: '' },
    { num: '0', letters: '+' },
    { num: '#', letters: '' },
  ];

  const handleKeyPress = (char: string) => {
    setDialedNumber((prev) => prev + char);
  };

  const handleDelete = () => {
    setDialedNumber((prev) => prev.slice(0, -1));
  };

  const handleCall = (type: 'voice' | 'video' = 'voice') => {
    if (!dialedNumber.trim()) return;
    startCall(dialedNumber, dialedNumber, undefined, type);
    setShowKeypad(false);
  };

  return (
    <div className="flex flex-col pb-24 relative bg-white dark:bg-black min-h-[calc(100vh-130px)]">
      {/* Prominent Page Title */}
      <div className="px-4 pt-2 pb-1">
        <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 font-display">
          Calls
        </h2>
      </div>

      {/* Create call link */}
      <div className="flex items-center gap-4 px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-neutral-900/60 cursor-pointer">
        <div className="w-11 h-11 rounded-full bg-purple-600 text-white flex items-center justify-center shrink-0">
          <UserPlus className="w-5 h-5" />
        </div>
        <div>
          <div className="font-semibold text-sm text-slate-900 dark:text-slate-100">
            Create call link
          </div>
          <p className="text-xs text-slate-500">
            Share a link for your AfriChat audio or video call
          </p>
        </div>
      </div>

      <div className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
        <span>Recent Calls</span>
        <button
          onClick={() => setShowKeypad(!showKeypad)}
          className="text-purple-600 dark:text-purple-400 normal-case font-semibold flex items-center gap-1 hover:underline"
        >
          <Phone className="w-3.5 h-3.5" />
          <span>{showKeypad ? 'Hide Dialpad' : 'Open Dialpad'}</span>
        </button>
      </div>

      {/* Call History */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
        {calls.length === 0 ? (
          <div className="py-16 px-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto mb-3">
              <PhoneCall className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">No recent calls</h3>
            <p className="text-xs text-slate-400 dark:text-neutral-500 mt-1 max-w-xs mx-auto">
              Calls made or received via AfriChat will show up here. Use the dialpad or create a call link to connect.
            </p>
            <button
              onClick={() => setShowKeypad(true)}
              className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors inline-flex items-center gap-1.5"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Open Dialpad</span>
            </button>
          </div>
        ) : (
          calls.map((call) => (
          <div
            key={call.id}
            className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <img
                src={call.avatar}
                alt={call.name}
                referrerPolicy="no-referrer"
                className="w-12 h-12 rounded-full object-cover"
              />
              <div>
                <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                  {call.name}
                </h4>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                  {call.direction === 'missed' && (
                    <PhoneMissed className="w-3.5 h-3.5 text-rose-500" />
                  )}
                  {call.direction === 'incoming' && (
                    <PhoneIncoming className="w-3.5 h-3.5 text-emerald-500" />
                  )}
                  {call.direction === 'outgoing' && (
                    <PhoneOutgoing className="w-3.5 h-3.5 text-indigo-500" />
                  )}
                  <span>{call.time}</span>
                  <span className="font-mono text-[10px] text-slate-400">· {call.phone}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => startCall(call.name, call.phone, call.avatar, 'voice')}
                className="text-purple-600 dark:text-purple-400 p-2 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-full transition-colors"
                title="Voice Call"
              >
                <Phone className="w-5 h-5" />
              </button>
              <button
                onClick={() => startCall(call.name, call.phone, call.avatar, 'video')}
                className="text-purple-600 dark:text-purple-400 p-2 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-full transition-colors"
                title="Video Call"
              >
                <Video className="w-5 h-5" />
              </button>
            </div>
          </div>
          ))
        )}
      </div>

      {/* Floating Action Button to Open Keypad */}
      {!showKeypad && (
        <button
          onClick={() => setShowKeypad(true)}
          className="fixed bottom-20 right-5 w-14 h-14 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center shadow-lg shadow-purple-600/30 transition-transform active:scale-95 z-20"
          aria-label="Open Keypad"
          title="Dial phone number"
        >
          <PhoneCall className="w-6 h-6" />
        </button>
      )}

      {/* Slide-Up Phone Dialpad Sheet */}
      {showKeypad && (
        <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-2xs flex items-end justify-center animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-black rounded-t-3xl p-5 pb-8 shadow-2xl border-t border-slate-200 dark:border-neutral-800 animate-in slide-in-from-bottom duration-200">
            {/* Grab handle & close */}
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-1 bg-slate-300 dark:bg-neutral-800 rounded-full mx-auto" />
              <button
                onClick={() => setShowKeypad(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Dialed Number Display */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 dark:border-neutral-800 mb-3 min-h-[50px]">
              <span className="font-mono text-2xl font-bold tracking-wider text-slate-900 dark:text-slate-100 truncate">
                {dialedNumber || (
                  <span className="text-slate-400 text-base font-normal">
                    Enter phone number...
                  </span>
                )}
              </span>
              {dialedNumber && (
                <button
                  onClick={handleDelete}
                  className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
                  aria-label="Backspace"
                >
                  <Delete className="w-6 h-6" />
                </button>
              )}
            </div>

            {/* Quick Country Code Presets */}
            <div className="flex items-center justify-center gap-1.5 mb-3 text-xs font-mono">
              {[
                { code: '+234 ', label: '🇳🇬 +234' },
                { code: '+254 ', label: '🇰🇪 +254' },
                { code: '+233 ', label: '🇬🇭 +233' },
                { code: '+27 ', label: '🇿🇦 +27' },
              ].map((p) => (
                <button
                  key={p.code}
                  onClick={() => setDialedNumber((prev) => (prev ? prev : p.code))}
                  className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-neutral-900 text-slate-600 dark:text-slate-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-colors text-[11px] border border-transparent dark:border-neutral-800"
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* 3x4 Touch Dialpad Grid */}
            <div className="grid grid-cols-3 gap-3 px-4">
              {keypadKeys.map((k) => (
                <button
                  key={k.num}
                  onClick={() => handleKeyPress(k.num)}
                  className="h-14 rounded-2xl bg-slate-100 dark:bg-neutral-900 hover:bg-slate-200 dark:hover:bg-neutral-800 active:scale-95 transition-all flex flex-col items-center justify-center shadow-2xs border border-transparent dark:border-neutral-800"
                >
                  <span className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100 leading-tight">
                    {k.num}
                  </span>
                  {k.letters && (
                    <span className="text-[9px] font-semibold text-slate-400 tracking-widest uppercase">
                      {k.letters}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Call Buttons */}
            <div className="flex items-center justify-center gap-4 mt-4 px-4">
              <button
                onClick={() => handleCall('voice')}
                disabled={!dialedNumber.trim()}
                className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
              >
                <Phone className="w-5 h-5 fill-current" />
                <span>Call Voice</span>
              </button>

              <button
                onClick={() => handleCall('video')}
                disabled={!dialedNumber.trim()}
                className="py-3.5 px-5 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20 active:scale-95 transition-all"
                title="Video Call"
              >
                <Video className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
