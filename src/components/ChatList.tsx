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
  CheckCircle2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ChatThread } from '../types';
import { ContactProfileModal } from './ContactProfileModal';

export const ChatList: React.FC = () => {
  const {
    chats,
    setActiveChatId,
    setIsContactsModalOpen,
    statuses,
    setActiveViewingStatus,
  } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<
    'all' | 'unread' | 'groups' | 'channels' | 'stores'
  >('all');
  const [selectedProfileChat, setSelectedProfileChat] = useState<ChatThread | null>(null);

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
    <div className="flex flex-col pb-24 relative bg-white dark:bg-black min-h-[calc(100vh-130px)]">
      {/* Page Title & Search Bar */}
      <div className="px-4 pt-2 pb-1">
        <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 font-display">
          Chats
        </h2>
      </div>

      <div className="px-4 py-2">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 absolute left-3.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search chats, groups, channels..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-100 dark:bg-neutral-900 rounded-2xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-colors border border-transparent dark:border-neutral-800"
          />
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-2 mt-2.5 overflow-x-auto no-scrollbar pb-0.5">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`px-3.5 py-1.5 text-xs rounded-full font-semibold transition-colors shrink-0 ${
              filterType === 'all'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-neutral-900 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-transparent dark:border-neutral-800'
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setFilterType('unread')}
            className={`px-3.5 py-1.5 text-xs rounded-full font-semibold transition-colors shrink-0 flex items-center gap-1.5 ${
              filterType === 'unread'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-neutral-900 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-transparent dark:border-neutral-800'
            }`}
          >
            <span>Unread</span>
            <span
              className={`text-[10px] px-1 rounded-full ${
                filterType === 'unread'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-200 dark:bg-neutral-800 text-slate-700 dark:text-slate-200'
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
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-neutral-900 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-transparent dark:border-neutral-800'
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
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-neutral-900 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-transparent dark:border-neutral-800'
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
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-neutral-900 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-transparent dark:border-neutral-800'
            }`}
          >
            <Store className="w-3 h-3" />
            <span>Stores</span>
          </button>
        </div>
      </div>

      {/* Chat Thread List */}
      <div className="divide-y divide-slate-100 dark:divide-neutral-900">
        {filteredChats.map((chat: ChatThread) => {
          // Check if contact has recently updated their 24h status
          const contactStatus = statuses.find(
            (s) =>
              !s.isMe &&
              (s.userId === chat.id ||
                s.userName.toLowerCase().trim() === chat.name.toLowerCase().trim() ||
                chat.name.toLowerCase().includes(s.userName.toLowerCase()) ||
                s.userName.toLowerCase().includes(chat.name.toLowerCase()))
          );
          const hasRecentStatus = Boolean(contactStatus);

          return (
            <div
              key={chat.id}
              onClick={() => setActiveChatId(chat.id)}
              className={`flex items-center gap-3.5 px-4 py-3 hover:bg-slate-50 dark:hover:bg-neutral-900/60 cursor-pointer transition-colors active:bg-slate-100 dark:active:bg-neutral-900 ${
                chat.isScamFlagged ? 'bg-rose-50/50 dark:bg-rose-950/20' : ''
              }`}
            >
              {/* Avatar - larger size w-14 h-14 with status ring flow for recent status updates */}
              <div
                className="relative shrink-0 group cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedProfileChat(chat);
                }}
                title={hasRecentStatus ? `${chat.name} posted a new status - tap to view` : 'View contact info'}
              >
                {hasRecentStatus ? (
                  <div className="p-[2.5px] rounded-full bg-gradient-to-tr from-emerald-500 via-teal-400 to-indigo-500 shadow-xs animate-pulse">
                    <div className="p-0.5 bg-white dark:bg-black rounded-full">
                      <img
                        src={chat.avatar}
                        alt={chat.name}
                        referrerPolicy="no-referrer"
                        className="w-13 h-13 rounded-full object-cover group-hover:opacity-90 transition-opacity"
                      />
                    </div>
                  </div>
                ) : (
                  <img
                    src={chat.avatar}
                    alt={chat.name}
                    referrerPolicy="no-referrer"
                    className={`w-14 h-14 rounded-full object-cover group-hover:opacity-90 transition-opacity ${
                      chat.isScamFlagged ? 'ring-2 ring-rose-500' : 'ring-1 ring-black/5 dark:ring-white/10'
                    }`}
                  />
                )}

                {/* Status Story flow icon */}
                {hasRecentStatus && !chat.isScamFlagged && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      if (contactStatus) {
                        setActiveViewingStatus(contactStatus);
                      }
                    }}
                    title="View 24h Story"
                    className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-tr from-emerald-500 to-teal-400 text-white rounded-full flex items-center justify-center text-[10px] shadow-md border-2 border-white dark:border-black hover:scale-110 transition-transform"
                  >
                    <Sparkles className="w-2.5 h-2.5" />
                  </span>
                )}

                {chat.isOnline && !chat.isScamFlagged && !hasRecentStatus && (
                  <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-black rounded-full" />
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
                    {chat.isCelebrityVerified && (
                      <span
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-gradient-to-r from-amber-500/20 to-purple-600/20 border border-amber-400/50 text-amber-500 dark:text-amber-300 text-[9px] font-bold shrink-0"
                        title="Celebrity Verified"
                      >
                        <CheckCircle2 className="w-2.5 h-2.5 fill-amber-400/20" />
                        <span>VIP</span>
                      </span>
                    )}
                  {chat.isGroup && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-medium shrink-0">
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
                      ? 'text-purple-600 dark:text-purple-400 font-semibold'
                      : 'text-slate-400'
                  }`}
                >
                  {chat.lastMessageTime}
                </span>
              </div>

              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
                  {!chat.unreadCount && (
                    <CheckCheck className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                  )}
                  {chat.isScamFlagged && (
                    <span className="text-rose-500 font-bold shrink-0">[⚠️ SCAM REPORTED]</span>
                  )}
                  <span className="truncate">{chat.lastMessage}</span>
                </p>

                {chat.unreadCount > 0 && (
                  <span className="shrink-0 bg-purple-600 text-white font-bold text-[10px] rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                    {chat.unreadCount}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}

        {chats.length === 0 ? (
          <div className="py-20 px-6 text-center">
            <div className="w-16 h-16 rounded-3xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto mb-4 border border-purple-500/20">
              <MessageSquarePlus className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-base text-slate-800 dark:text-slate-100 font-display">No conversations yet</h3>
            <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1.5 max-w-xs mx-auto leading-relaxed">
              Start chatting with your contacts, join a group savings Ajo, or message verified African merchants.
            </p>
            <button
              onClick={() => setIsContactsModalOpen(true)}
              className="mt-5 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-2xl shadow-md shadow-purple-600/20 transition-all active:scale-95 inline-flex items-center gap-2"
            >
              <MessageSquarePlus className="w-4 h-4" />
              <span>Start a Chat</span>
            </button>
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No chats found matching &ldquo;{searchQuery}&rdquo;.
          </div>
        ) : null}
      </div>

      {/* Floating Action Button (FAB) */}
      <button
        onClick={() => setIsContactsModalOpen(true)}
        className="fixed bottom-20 right-5 w-14 h-14 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center shadow-lg shadow-purple-600/30 transition-transform active:scale-95 z-20"
        aria-label="New chat / Sync contacts"
        title="Start New Chat / Sync Contacts"
      >
        <MessageSquarePlus className="w-6 h-6" />
      </button>

      {/* AfriChat Contact Info Profile Modal */}
      <ContactProfileModal
        chat={selectedProfileChat}
        isOpen={Boolean(selectedProfileChat)}
        onClose={() => setSelectedProfileChat(null)}
      />
    </div>
  );
};
