import React, { useState, useEffect } from 'react';
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
  Share2,
  Copy,
  Check,
  Link,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const CallsView: React.FC = () => {
  const { calls, startCall, activeCall, deviceContacts, chats } = useApp();
  const [showKeypad, setShowKeypad] = useState(false);
  const [dialedNumber, setDialedNumber] = useState('');

  // ── Create Call Link Sheet State ───────────────────────────────────────────
  const [showCreateLinkModal, setShowCreateLinkModal] = useState(false);
  const [linkType, setLinkType] = useState<'video' | 'voice'>('video');
  const [createdRoomId, setCreatedRoomId] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  // ── Incoming Call from URL State ───────────────────────────────────────────
  const [invitedCallRoom, setInvitedCallRoom] = useState<{ roomId: string; type: 'voice' | 'video' } | null>(null);

  // Check URL on load for `?call=...`
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const callRoom = params.get('call');
      const callType = (params.get('type') === 'voice' ? 'voice' : 'video') as 'voice' | 'video';
      if (callRoom && !activeCall) {
        setInvitedCallRoom({ roomId: callRoom, type: callType });
      }
    } catch {
      // Ignore URL parsing errors
    }
  }, [activeCall]);

  const handleOpenCreateLink = () => {
    const newRoomId = `afri_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    setCreatedRoomId(newRoomId);
    setCopiedLink(false);
    setShowCreateLinkModal(true);
  };

  const fullGeneratedLink = typeof window !== 'undefined'
    ? `${window.location.origin}/?call=${createdRoomId}&type=${linkType}`
    : '';

  const handleCopyGeneratedLink = async () => {
    try {
      await navigator.clipboard.writeText(fullGeneratedLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    } catch {
      // Fallback
    }
  };

  const handleShareGeneratedLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `AGC ${linkType === 'video' ? 'Video' : 'Voice'} Call`,
          text: `Join my live AGC ${linkType} call:`,
          url: fullGeneratedLink,
        });
      } catch {
        // User cancelled share
      }
    } else {
      handleCopyGeneratedLink();
    }
  };

  const handleStartHostCall = () => {
    setShowCreateLinkModal(false);
    startCall(
      `Call Room (${linkType.toUpperCase()})`,
      createdRoomId,
      undefined,
      linkType,
      createdRoomId,
      true
    );
  };

  const handleAcceptInvitedCall = () => {
    if (!invitedCallRoom) return;
    const { roomId, type } = invitedCallRoom;
    setInvitedCallRoom(null);
    // Clear URL param without reload
    window.history.replaceState({}, '', window.location.pathname);
    startCall(
      `AGC Peer (${type.toUpperCase()})`,
      roomId,
      undefined,
      type,
      roomId,
      false
    );
  };

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

      {/* ── Create Call Link Row (Working) ─────────────────────────────────── */}
      <div
        onClick={handleOpenCreateLink}
        className="flex items-center gap-4 px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-neutral-900/60 cursor-pointer transition-colors"
      >
        <div className="w-11 h-11 rounded-full bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-purple-600/20">
          <Link className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>Create call link</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400">
              Live WebRTC
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
            Share a link for your AGC audio or video call
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

      {/* ── Call History List ──────────────────────────────────────────────── */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
        {calls.length === 0 ? (
          <div className="py-16 px-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto mb-3">
              <PhoneCall className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">No recent calls</h3>
            <p className="text-xs text-slate-400 dark:text-neutral-500 mt-1 max-w-xs mx-auto">
              Calls made or received via AGC will show up here. Use the dialpad or create a call link to connect.
            </p>
            <div className="flex items-center justify-center gap-2 mt-4">
              <button
                onClick={handleOpenCreateLink}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors inline-flex items-center gap-1.5"
              >
                <Link className="w-3.5 h-3.5" />
                <span>Create Call Link</span>
              </button>
              <button
                onClick={() => setShowKeypad(true)}
                className="px-4 py-2 border border-slate-200 dark:border-neutral-800 hover:bg-slate-50 dark:hover:bg-neutral-900 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-colors inline-flex items-center gap-1.5"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Open Dialpad</span>
              </button>
            </div>
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

      {/* ── Slide-Up Phone Dialpad Sheet ───────────────────────────────────── */}
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

      {/* ── Create Call Link Modal ─────────────────────────────────────────── */}
      {showCreateLinkModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-[#0a0a0f] text-white rounded-t-3xl sm:rounded-3xl border border-white/10 p-6 space-y-5 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center">
                  <Link className="w-4.5 h-4.5 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Create Call Link</h3>
                  <p className="text-[11px] text-white/40">Anyone with the link can join</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateLinkModal(false)}
                className="w-7 h-7 rounded-full border border-white/10 flex items-center justify-center text-white/40 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Call Type Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                Call Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setLinkType('video')}
                  className={`py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all ${
                    linkType === 'video'
                      ? 'bg-purple-600 border-purple-500 text-white shadow-md shadow-purple-900/50'
                      : 'bg-white/4 border-white/8 text-white/50 hover:bg-white/8'
                  }`}
                >
                  <Video className="w-4 h-4" />
                  <span>Video Call</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLinkType('voice')}
                  className={`py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all ${
                    linkType === 'voice'
                      ? 'bg-purple-600 border-purple-500 text-white shadow-md shadow-purple-900/50'
                      : 'bg-white/4 border-white/8 text-white/50 hover:bg-white/8'
                  }`}
                >
                  <Phone className="w-4 h-4" />
                  <span>Voice Call</span>
                </button>
              </div>
            </div>

            {/* Generated Link Display */}
            <div className="p-3 rounded-2xl bg-white/4 border border-white/8 space-y-1">
              <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest block">
                Your Secure Room Link
              </span>
              <p className="font-mono text-xs text-purple-300 break-all select-all">
                {fullGeneratedLink}
              </p>
            </div>

            {/* Actions: Copy & Share */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleCopyGeneratedLink}
                className="py-3 px-3 rounded-xl bg-white/8 hover:bg-white/12 active:scale-98 border border-white/10 text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-all"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-300">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-purple-400" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleShareGeneratedLink}
                className="py-3 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 active:scale-98 text-xs font-bold text-white flex items-center justify-center gap-1.5 shadow-lg shadow-purple-950/50 transition-all"
              >
                <Share2 className="w-4 h-4" />
                <span>Share Link</span>
              </button>
            </div>

            {/* Host Launch CTA */}
            <button
              type="button"
              onClick={handleStartHostCall}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-purple-900/60 active:scale-98 transition-all"
            >
              <span>Start Call as Host Now</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Incoming Call URL Prompt Modal ─────────────────────────────────── */}
      {invitedCallRoom && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-6 animate-in zoom-in-95">
          <div className="w-full max-w-xs bg-[#0d0917] text-white rounded-3xl border border-purple-500/30 p-6 space-y-4 text-center shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-purple-600/20 border border-purple-500/40 text-purple-300 flex items-center justify-center mx-auto shadow-lg">
              {invitedCallRoom.type === 'video' ? <Video className="w-7 h-7" /> : <Phone className="w-7 h-7" />}
            </div>
            <div>
              <h3 className="text-base font-black text-white">Incoming Call Invitation</h3>
              <p className="text-xs text-white/50 mt-1">
                You've been invited to join an AGC {invitedCallRoom.type === 'video' ? 'Video' : 'Voice'} Call.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setInvitedCallRoom(null)}
                className="flex-1 py-3 rounded-xl border border-white/10 text-white/50 hover:bg-white/5 text-xs font-bold transition-all"
              >
                Decline
              </button>
              <button
                type="button"
                onClick={handleAcceptInvitedCall}
                className="flex-1 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-900/60 transition-all"
              >
                Join Call
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
