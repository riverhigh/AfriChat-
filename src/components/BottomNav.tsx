import React from 'react';
import { CircleDot, Phone, MessageSquare, Eye, EyeOff } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const BottomNav: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    t,
    chats,
    statuses,
    currentUser,
    hideBalanceOnNav,
    toggleHideBalance,
    wallet,
  } = useApp();

  const totalUnread = chats.reduce((acc, c) => acc + c.unreadCount, 0);
  const hasNewStatus = statuses.some((s) => !s.isMe);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-black/95 backdrop-blur-md border-t border-slate-200 dark:border-neutral-900 transition-colors">
      <div className="max-w-md mx-auto grid grid-cols-4 items-center h-16 px-2">
        {/* 1. Chats Tab */}
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
              <span className="absolute -top-1.5 -right-2.5 bg-emerald-600 text-white text-[10px] font-bold rounded-full min-w-4 h-4 px-1 flex items-center justify-center shadow-xs">
                {totalUnread}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-1 font-medium tracking-tight">
            {t('chats')}
          </span>
        </button>

        {/* 2. Status / Updates Tab */}
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

        {/* 3. Calls Tab */}
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

        {/* 4. User Account Tab ("You" - includes Store, Dispatch, Jobs & Settings) */}
        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`flex flex-col items-center justify-center min-h-[48px] py-1 transition-all relative ${
            activeTab === 'settings'
              ? 'text-purple-600 dark:text-purple-400 font-bold scale-[1.03]'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <div className={`w-6 h-6 rounded-full overflow-hidden border p-0.2 ${activeTab === 'settings' ? 'border-purple-600 dark:border-purple-400 ring-2 ring-purple-500/30' : 'border-slate-300 dark:border-neutral-700'}`}>
            <img
              src={currentUser.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"}
              alt="You"
              className="w-full h-full rounded-full object-cover"
            />
          </div>
          <span className="text-[10px] mt-1 font-medium tracking-tight">
            You
          </span>
        </button>
      </div>
    </nav>
  );
};

