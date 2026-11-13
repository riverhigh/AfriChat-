import React, { useState } from 'react';
import {
  Search,
  CheckCheck,
  MessageSquarePlus,
  Radio,
  ShieldAlert,
  Sparkles,
  Users,
  User,
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
    isUserOnline,
    typingUsers,
  } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<
    'all' | 'unread' | 'groups' | 'channels' | 'stores'
  >('all');
  const [selectedProfileChat, setSelectedProfileChat] = useState<ChatThread | null>(null);
  const [avatarPrompt, setAvatarPrompt] = useState<{ chat: ChatThread; status: any } | null>(null);

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
                  if (contactStatus) {
                    setActiveViewingStatus(contactStatus);
                  } else {
                    setSelectedProfileChat(chat);
                  }
                }}
                title={hasRecentStatus ? `${chat.name} posted a new status - tap to view` : 'View contact info'}
              >
                {hasRecentStatus ? (
                  <div className="p-[2.5px] rounded-full bg-gradient-to-tr from-purple-600 via-pink-500 to-indigo-600 ring-2 ring-purple-500/60 shadow-[0_0_12px_rgba(168,85,247,0.5)] animate-pulse">
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

                {(chat.isOnline || isUserOnline(chat.phoneNumber || chat.name)) && !chat.isScamFlagged && !hasRecentStatus && (
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
                  {typingUsers[chat.id]?.length ? (<span className="text-purple-400 font-semibold italic animate-pulse">typing...</span>) : (<span className="truncate">{chat.lastMessage}</span>)}
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

      {/* AGC Contact Info Profile Modal */}
      {/* Avatar Prompt Modal: View Updates or View Profile */}
      {avatarPrompt && (
        <div
          onClick={() => setAvatarPrompt(null)}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xs bg-white dark:bg-neutral-900 rounded-3xl p-5 border border-slate-200 dark:border-neutral-800 shadow-2xl text-center space-y-4 animate-in zoom-in-95"
          >
            <div className="relative w-16 h-16 mx-auto rounded-full p-1 bg-gradient-to-tr from-purple-600 via-pink-500 to-indigo-600 ring-4 ring-purple-500/30">
              <img
                src={avatarPrompt.chat.avatar}
                alt={avatarPrompt.chat.name}
                className="w-full h-full rounded-full object-cover"
              />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">{avatarPrompt.chat.name}</h3>
              <p className="text-xs text-purple-600 dark:text-purple-400 font-medium mt-0.5">
                New 24h status update posted
              </p>
            </div>
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  if (avatarPrompt.status) setActiveViewingStatus(avatarPrompt.status);
                  setAvatarPrompt(null);
                }}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-transform active:scale-95"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>View Status Updates</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedProfileChat(avatarPrompt.chat);
                  setAvatarPrompt(null);
                }}
                className="w-full py-2.5 px-4 bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <User className="w-4 h-4 text-purple-400" />
                <span>View Profile</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <ContactProfileModal
        chat={selectedProfileChat}
        isOpen={Boolean(selectedProfileChat)}
        onClose={() => setSelectedProfileChat(null)}
      />
    </div>
  );
};
