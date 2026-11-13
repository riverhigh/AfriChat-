import React from 'react';
import { UserCheck, UserX, X, MessageSquare, ShieldCheck, Sparkles, Phone, Users } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const IncomingContactRequestModal: React.FC = () => {
  const {
    activeContactRequestPopup,
    setActiveContactRequestPopup,
    friendRequests,
    acceptFriendRequest,
    declineFriendRequest,
  } = useApp();

  if (!activeContactRequestPopup) return null;

  const req = activeContactRequestPopup;
  const pendingCount = friendRequests.length;
  const currentIndex = friendRequests.findIndex((r) => r.id === req.id);
  const positionText = pendingCount > 1 && currentIndex !== -1 ? `Request ${currentIndex + 1} of ${pendingCount}` : null;

  const handleDismiss = () => {
    try {
      const dismissed = JSON.parse(sessionStorage.getItem('AGC_dismissed_request_popups') || '[]');
      if (!dismissed.includes(req.id)) {
        dismissed.push(req.id);
        sessionStorage.setItem('AGC_dismissed_request_popups', JSON.stringify(dismissed));
      }
    } catch (_) {}
    setActiveContactRequestPopup(null);
  };

  const handleAccept = () => {
    acceptFriendRequest(req.id);
    handleDismiss();
  };

  const handleDecline = () => {
    declineFriendRequest(req.id);
    handleDismiss();
  };

  const defaultAvatar = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='50' fill='%23180a33'/><circle cx='50' cy='38' r='18' fill='%23a855f7'/><path d='M16 88c0-18.778 15.222-34 34-34s34 15.222 34 34' fill='%23a855f7'/></svg>";

  return (
    <div className="fixed inset-0 z-70 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200 select-none">
      {/* Background ambient lighting */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-600/20 rounded-full blur-[140px] animate-pulse" />
      </div>

      <div className="relative w-full max-w-sm bg-[#18152e] dark:bg-[#120f24] border border-purple-500/30 rounded-3xl shadow-2xl p-5 space-y-4 text-white overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-sm shadow-purple-600/30">
              <Users className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                <span>Someone Added You</span>
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              </h3>
              <p className="text-[11px] text-purple-300/80 font-medium">New Contact Request</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white flex items-center justify-center transition-colors"
            title="Dismiss for now"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contact Info Card */}
        <div className="flex flex-col items-center text-center p-4 rounded-2xl bg-white/5 border border-purple-500/15 space-y-2.5">
          <div className="relative">
            <img
              src={req.senderAvatar || defaultAvatar}
              alt={req.senderName}
              referrerPolicy="no-referrer"
              className="w-20 h-20 rounded-full object-cover border-2 border-purple-500/40 shadow-xl ring-4 ring-purple-950/60"
            />
            <span className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-emerald-500 border-2 border-[#18152e] flex items-center justify-center text-white shadow-sm">
              <UserCheck className="w-3.5 h-3.5" />
            </span>
          </div>

          <div>
            <h4 className="text-base font-bold text-white leading-tight">
              {req.senderName}
            </h4>
            <div className="flex items-center justify-center gap-1.5 mt-1 text-xs text-purple-200/80 font-mono">
              <Phone className="w-3 h-3 text-purple-400" />
              <span>{req.senderPhone}</span>
            </div>
          </div>

          {/* Greeting message / note */}
          <div className="w-full bg-black/40 rounded-xl p-2.5 text-xs text-purple-200/90 border border-purple-500/20 text-left flex items-start gap-2">
            <MessageSquare className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed line-clamp-3 italic">
              "{req.message || `Hi, I am ${req.senderName}. Let's connect on AfriChat!`}"
            </p>
          </div>

          <div className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>AfriChat End-to-End Encrypted</span>
          </div>
        </div>

        {positionText && (
          <div className="text-center text-[10px] text-purple-300/60 font-medium">
            {positionText}
          </div>
        )}

        {/* Action Buttons: Accept or Decline */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <button
            type="button"
            onClick={handleDecline}
            className="py-2.5 px-3 bg-rose-500/10 hover:bg-rose-500/20 active:bg-rose-500/30 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
          >
            <UserX className="w-3.5 h-3.5 text-rose-400" />
            <span>Decline</span>
          </button>

          <button
            type="button"
            onClick={handleAccept}
            className="py-2.5 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-900/40 transition-all active:scale-95 cursor-pointer"
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Accept</span>
          </button>
        </div>
      </div>
    </div>
  );
};
