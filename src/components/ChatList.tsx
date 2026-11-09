import React, { useState } from 'react';
import {
  Search,
  CheckCheck,
  MessageSquarePlus,
  Radio,
  ShieldAlert,
  Sparkles,
  Users,
  Coins,
  Store,
  AlertTriangle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ChatThread } from '../types';

export const ChatList: React.FC = () => {
  const {
    chats,
    setActiveChatId,
    setIsMemeStudioOpen,
    setIsScamCheckerOpen,
    joinAudioSpace,
    audioSpaces,
  } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<
    'all' | 'unread' | 'groups' | 'channels' | 'stores'
  >('all');

  const filteredChats = chats.filter((chat) => {
    const matchesSearch =
      chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (chat.storeCategory && chat.storeCategory.toLowerCase().includes(searchQuery.toLowerCase())) ||
      chat.location.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (filterType === 'stores') return chat.verifiedStore;
    if (filterType === 'unread') return chat.unreadCount > 0;
    if (filterType === 'groups') return chat.isGroup || Boolean(chat.ajoGroup);
    if (filterType === 'channels') return chat.isChannel;
    return true;
  });

  return (
    <div className="flex flex-col pb-24 relative bg-white dark:bg-[#11101e] min-h-[calc(100vh-130px)]">
      {/* Prominent Page Title */}
      <div className="px-4 pt-2 pb-1">
        <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 font-display">
          Chats
        </h2>
      </div>

      {/* Search Input */}
      <div className="px-4 py-2">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 absolute left-3.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search chats, groups, channels & stores..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-100 dark:bg-[#1c1933] rounded-2xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
          />
        </div>

        {/* Quick Launch Action Pills for African Super-App Features */}
        <div className="flex items-center gap-2 mt-2.5 overflow-x-auto no-scrollbar pb-1">
          <button
            type="button"
            onClick={() => {
              const liveSpace = audioSpaces.find((s) => s.isLive) || audioSpaces[0];
              if (liveSpace) joinAudioSpace(liveSpace);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-500/15 to-orange-500/15 border border-rose-500/30 text-rose-500 dark:text-rose-400 text-xs font-semibold shrink-0 active:scale-95 transition-transform"
          >
            <Radio className="w-3.5 h-3.5 animate-pulse text-rose-500" />
            <span>Street Radio</span>
            <span className="text-[10px] px-1 py-0.2 rounded-full bg-rose-500 text-white font-mono font-bold">
              LIVE
            </span>
          </button>

          <button
            type="button"
            onClick={() => setIsScamCheckerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-semibold shrink-0 active:scale-95 transition-transform"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Scam Database</span>
          </button>

          <button
            type="button"
            onClick={() => setIsMemeStudioOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 text-xs font-semibold shrink-0 active:scale-95 transition-transform"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Meme Studio</span>
          </button>
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-2 mt-2 overflow-x-auto no-scrollbar pb-0.5">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`px-3.5 py-1.5 text-xs rounded-full font-semibold transition-colors shrink-0 ${
              filterType === 'all'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-[#1c1933] text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setFilterType('unread')}
            className={`px-3.5 py-1.5 text-xs rounded-full font-semibold transition-colors shrink-0 flex items-center gap-1.5 ${
              filterType === 'unread'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-[#1c1933] text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            <span>Unread</span>
            <span
              className={`text-[10px] px-1 rounded-full ${
                filterType === 'unread'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
              }`}
            >
              {chats.filter((c) => c.unreadCount > 0).length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setFilterType('groups')}
            className={`px-3.5 py-1.5 text-xs rounded-full font-semibold transition-colors shrink-0 flex items-center gap-1 ${
              filterType === 'groups'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-[#1c1933] text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            <Users className="w-3 h-3" />
            <span>Groups & Ajo</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterType('channels')}
            className={`px-3.5 py-1.5 text-xs rounded-full font-semibold transition-colors shrink-0 flex items-center gap-1 ${
              filterType === 'channels'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-[#1c1933] text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            <Radio className="w-3 h-3" />
            <span>Channels</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterType('stores')}
            className={`px-3.5 py-1.5 text-xs rounded-full font-semibold transition-colors shrink-0 flex items-center gap-1 ${
              filterType === 'stores'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-[#1c1933] text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            <Store className="w-3 h-3" />
            <span>Stores</span>
          </button>
        </div>
      </div>

      {/* Chat Thread List */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
        {filteredChats.map((chat: ChatThread) => (
          <div
            key={chat.id}
            onClick={() => setActiveChatId(chat.id)}
            className={`flex items-center gap-3.5 px-4 py-3 hover:bg-slate-50 dark:hover:bg-[#1a172e]/50 cursor-pointer transition-colors active:bg-slate-100 dark:active:bg-[#1a172e] ${
              chat.isScamFlagged ? 'bg-rose-50/50 dark:bg-rose-950/20' : ''
            }`}
          >
            {/* Avatar */}
            <div className="relative shrink-0">
              <img
                src={chat.avatar}
                alt={chat.name}
                referrerPolicy="no-referrer"
                className={`w-12 h-12 rounded-full object-cover ${
                  chat.isScamFlagged ? 'ring-2 ring-rose-500' : ''
                }`}
              />
              {chat.isOnline && !chat.isScamFlagged && (
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-[#11101e] rounded-full" />
              )}
              {chat.isScamFlagged && (
                <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-rose-600 text-white rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-2.5 h-2.5" />
                </span>
              )}
            </div>

            {/* Chat info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">
                    {chat.name}
                  </span>
                  {chat.isGroup && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-medium shrink-0">
                      Group
                    </span>
                  )}
                  {chat.isChannel && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-medium shrink-0">
                      Channel
                    </span>
                  )}
                  {chat.ajoGroup && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-medium shrink-0 flex items-center gap-0.5">
                      <Coins className="w-2.5 h-2.5" />
                      <span>Ajo</span>
                    </span>
                  )}
                </div>
                <span
                  className={`text-[11px] shrink-0 font-mono ${
                    chat.unreadCount > 0
                      ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
                      : 'text-slate-400'
                  }`}
                >
                  {chat.lastMessageTime}
                </span>
              </div>

              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
                  {!chat.unreadCount && (
                    <CheckCheck className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  )}
                  {chat.isScamFlagged && (
                    <span className="text-rose-500 font-bold shrink-0">[⚠️ SCAM REPORTED]</span>
                  )}
                  <span className="truncate">{chat.lastMessage}</span>
                </p>

                {chat.unreadCount > 0 && (
                  <span className="shrink-0 bg-indigo-600 text-white font-bold text-[10px] rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                    {chat.unreadCount}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}

        {filteredChats.length === 0 && (
          <div className="p-8 text-center text-slate-400 text-xs">
            No chats found matching &ldquo;{searchQuery}&rdquo;.
          </div>
        )}
      </div>

      {/* Floating Action Button (FAB) */}
      <button
        onClick={() => {
          const firstStore = chats.find((c) => c.verifiedStore);
          if (firstStore) setActiveChatId(firstStore.id);
        }}
        className="fixed bottom-20 right-5 w-14 h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shadow-lg transition-transform active:scale-95 z-20"
        aria-label="New chat"
      >
        <MessageSquarePlus className="w-6 h-6" />
      </button>
    </div>
  );
};
