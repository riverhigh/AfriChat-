import React from 'react';
import { CircleDot, Phone, MessageSquare, Compass, Sparkles, Building2 } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const BottomNav: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    t,
    chats,
    statuses,
    currentUser,
    audioSpaces,
  } = useApp();

  const totalUnread = chats.reduce((acc, c) => acc + c.unreadCount, 0);
  const hasNewStatus = statuses.some((s) => !s.isMe);
  const hasLiveSpace = audioSpaces.some((s) => s.isLive);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-black/95 backdrop-blur-md border-t border-slate-200 dark:border-neutral-900 transition-colors">
      <div className="max-w-md mx-auto grid grid-cols-5 items-center h-16 px-1">
        {/* 1. Updates Tab (FIRST) */}
        <button
          type="button"
          onClick={() => setActiveTab('status')}
          className={`flex flex-col items-center justify-center min-h-[48px] py-1 transition-all relative ${
            activeTab === 'status'
              ? 'text-purple-600 dark:text-purple-400 font-bold scale-[1.03]'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <CircleDot className="w-5 h-5" />
            {hasNewStatus && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-amber-500 rounded-full ring-2 ring-white dark:ring-black" />
            )}
          </div>
          <span className="text-[10px] mt-1 font-medium tracking-tight">
            Updates
          </span>
        </button>

        {/* 2. Calls Tab (SECOND) */}
        <button
          type="button"
          onClick={() => setActiveTab('calls')}
          className={`flex flex-col items-center justify-center min-h-[48px] py-1 transition-all relative ${
            activeTab === 'calls'
              ? 'text-purple-600 dark:text-purple-400 font-bold scale-[1.03]'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Phone className="w-5 h-5" />
          <span className="text-[10px] mt-1 font-medium tracking-tight">
            {t('calls')}
          </span>
        </button>

        {/* 3. Town Tab (MIDDLE - Groups, Channels & Spaces) */}
        <button
          type="button"
          onClick={() => setActiveTab('town')}
          className={`flex flex-col items-center justify-center min-h-[48px] py-1 transition-all relative ${
            activeTab === 'town'
              ? 'text-purple-600 dark:text-purple-400 font-bold scale-[1.05]'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <Building2 className="w-5 h-5" />
            {hasLiveSpace && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white dark:ring-black animate-pulse" />
            )}
          </div>
          <span className="text-[10px] mt-1 font-bold tracking-tight">
            Town
          </span>
        </button>

        {/* 4. Chats Tab (FOURTH) */}
        <button
          type="button"
          onClick={() => setActiveTab('chats')}
          className={`flex flex-col items-center justify-center min-h-[48px] py-1 transition-all relative ${
            activeTab === 'chats'
              ? 'text-purple-600 dark:text-purple-400 font-bold scale-[1.03]'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <MessageSquare className="w-5 h-5" />
            {totalUnread > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-emerald-600 text-white text-[10px] font-bold rounded-full min-w-4 h-4 px-1 flex items-center justify-center shadow-xs">
                {totalUnread}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-1 font-medium tracking-tight">
            {t('chats')}
          </span>
        </button>

        {/* 5. Hub Tab (FIFTH - Personal, Stores, Wallet & Admin) */}
        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`flex flex-col items-center justify-center min-h-[48px] py-1 transition-all relative ${
            activeTab === 'settings'
              ? 'text-purple-600 dark:text-purple-400 font-bold scale-[1.03]'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <div className={`w-5.5 h-5.5 rounded-full overflow-hidden border p-0.2 ${
            activeTab === 'settings'
              ? 'border-purple-600 dark:border-purple-400 ring-2 ring-purple-500/30'
              : 'border-slate-300 dark:border-neutral-700'
          }`}>
            <img
              src={currentUser.avatarUrl || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='50' fill='%23180a33'/><circle cx='50' cy='38' r='18' fill='%23a855f7'/><path d='M16 88c0-18.778 15.222-34 34-34s34 15.222 34 34' fill='%23a855f7'/></svg>"}
              alt="Hub"
              className="w-full h-full rounded-full object-cover"
            />
          </div>
          <span className="text-[10px] mt-1 font-bold tracking-tight">
            Hub
          </span>
        </button>
      </div>
    </nav>
  );
};
