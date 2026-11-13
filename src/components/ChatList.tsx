import React, { useState, useRef } from 'react';
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
  Trash2,
  Tag,
  Archive,
  ChevronRight,
  ChevronLeft,
  X,
  Plus,
  Package,
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
    deleteChat,
    toggleShelfChat,
    setChatLabel,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<
    'all' | 'unread' | 'groups' | 'channels' | 'stores'
  >('all');
  const [selectedProfileChat, setSelectedProfileChat] = useState<ChatThread | null>(null);
  const [avatarPrompt, setAvatarPrompt] = useState<{ chat: ChatThread; status: any } | null>(null);

  // Swipe gesture state
  const [swipedChatId, setSwipedChatId] = useState<string | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  // Shelved view state (WhatsApp-style Archive)
  const [showShelvedOnly, setShowShelvedOnly] = useState(false);
  const [selectedLabelFilter, setSelectedLabelFilter] = useState<string | null>(null);

  // Add to List / Label modal state
  const [labelingChat, setLabelingChat] = useState<ChatThread | null>(null);
  const [customLabelInput, setCustomLabelInput] = useState('');

  const PRESET_LABELS = [
    { name: 'Important', color: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30' },
    { name: 'Lead', color: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' },
    { name: 'Customer', color: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30' },
    { name: 'Family', color: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30' },
    { name: 'Work', color: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30' },
    { name: 'Follow Up', color: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30' },
  ];

  const shelvedCount = chats.filter((c) => c.isShelved).length;
  const userLabels = Array.from(new Set(chats.map((c) => c.label).filter(Boolean))) as string[];

  const filteredChats = chats.filter((chat) => {
    // Shelved filter: WhatsApp behavior
    if (showShelvedOnly) {
      if (!chat.isShelved) return false;
    } else {
      if (chat.isShelved) return false;
    }

    if (selectedLabelFilter) {
      if (chat.label !== selectedLabelFilter) return false;
    }

    const matchesSearch =
      chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (chat.storeCategory && chat.storeCategory.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (chat.label && chat.label.toLowerCase().includes(searchQuery.toLowerCase())) ||
      chat.location.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (filterType === 'stores') return chat.verifiedStore;
    if (filterType === 'unread') return chat.unreadCount > 0;
    if (filterType === 'groups') return chat.isGroup || Boolean(chat.ajoGroup);
    if (filterType === 'channels') return chat.isChannel;
    return true;
  });

  // Touch gesture handlers for right-to-left swipe
  const handleTouchStart = (chatId: string, e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };

  const handleTouchEnd = (chatId: string, e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x;
    const deltaY = e.changedTouches[0].clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    // Detect horizontal swipe right-to-left (deltaX < -35px and mostly horizontal)
    if (deltaX < -35 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
      setSwipedChatId(chatId);
    } else if (deltaX > 35) {
      // Swiped left-to-right: close
      if (swipedChatId === chatId) setSwipedChatId(null);
    }
  };

  const handleApplyLabel = (labelName?: string) => {
    if (!labelingChat) return;
    setChatLabel(labelingChat.id, labelName);
    setLabelingChat(null);
    setCustomLabelInput('');
  };

  return (
    <div
      className="flex flex-col pb-24 relative bg-white dark:bg-black min-h-[calc(100vh-130px)] select-none"
      onClick={() => {
        if (swipedChatId) setSwipedChatId(null);
      }}
    >
      {/* Page Title & Search Bar */}
      <div className="px-4 pt-2 pb-1 flex items-center justify-between">
        <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 font-display">
          Chats
        </h2>
        {showShelvedOnly && (
          <button
            onClick={() => setShowShelvedOnly(false)}
            className="text-xs font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-3 py-1.5 rounded-xl flex items-center gap-1"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Back to Inbox</span>
          </button>
        )}
      </div>

      <div className="px-4 py-2">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 absolute left-3.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search chats, groups, channels, labels..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-100 dark:bg-neutral-900 rounded-2xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-colors border border-transparent dark:border-neutral-800"
          />
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-2 mt-2.5 overflow-x-auto no-scrollbar pb-0.5">
          <button
            type="button"
            onClick={() => {
              setFilterType('all');
              setShowShelvedOnly(false);
            }}
            className={`px-3.5 py-1.5 text-xs rounded-full font-semibold transition-colors shrink-0 ${
              filterType === 'all' && !showShelvedOnly
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-neutral-900 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-transparent dark:border-neutral-800'
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => {
              setFilterType('unread');
              setShowShelvedOnly(false);
            }}
            className={`px-3.5 py-1.5 text-xs rounded-full font-semibold transition-colors shrink-0 flex items-center gap-1.5 ${
              filterType === 'unread' && !showShelvedOnly
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-neutral-900 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-transparent dark:border-neutral-800'
            }`}
          >
            <span>Unread</span>
            <span
              className={`text-[10px] px-1 rounded-full ${
                filterType === 'unread' && !showShelvedOnly
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-200 dark:bg-neutral-800 text-slate-700 dark:text-slate-200'
              }`}
            >
              {chats.filter((c) => c.unreadCount > 0 && !c.isShelved).length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              setFilterType('groups');
              setShowShelvedOnly(false);
            }}
            className={`px-3.5 py-1.5 text-xs rounded-full font-semibold transition-colors shrink-0 flex items-center gap-1 ${
              filterType === 'groups' && !showShelvedOnly
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-neutral-900 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-transparent dark:border-neutral-800'
            }`}
          >
            <Users className="w-3 h-3" />
            <span>Groups</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setFilterType('channels');
              setShowShelvedOnly(false);
            }}
            className={`px-3.5 py-1.5 text-xs rounded-full font-semibold transition-colors shrink-0 flex items-center gap-1 ${
              filterType === 'channels' && !showShelvedOnly
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-neutral-900 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-transparent dark:border-neutral-800'
            }`}
          >
            <Radio className="w-3 h-3" />
            <span>Channels</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setFilterType('stores');
              setShowShelvedOnly(false);
            }}
            className={`px-3.5 py-1.5 text-xs rounded-full font-semibold transition-colors shrink-0 flex items-center gap-1 ${
              filterType === 'stores' && !showShelvedOnly
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-neutral-900 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-transparent dark:border-neutral-800'
            }`}
          >
            <Store className="w-3 h-3" />
            <span>Stores</span>
          </button>

          {/* Dynamic User Custom Lists / Labels Chips */}
          {userLabels.map((lbl) => (
            <button
              key={lbl}
              type="button"
              onClick={() => {
                setSelectedLabelFilter(selectedLabelFilter === lbl ? null : lbl);
                setShowShelvedOnly(false);
              }}
              className={`px-3 py-1.5 text-xs rounded-full font-semibold transition-colors shrink-0 flex items-center gap-1.5 ${
                selectedLabelFilter === lbl
                  ? 'bg-indigo-600 text-white shadow-xs font-bold'
                  : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-900/40'
              }`}
            >
              <Tag className="w-2.5 h-2.5" />
              <span>{lbl}</span>
            </button>
          ))}
        </div>
      </div>

      {/* WhatsApp-Style Shelved Header (Archive) */}
      {!showShelvedOnly && shelvedCount > 0 && (
        <div
          onClick={() => setShowShelvedOnly(true)}
          className="flex items-center justify-between px-4 py-3 bg-purple-50/70 dark:bg-purple-950/25 hover:bg-purple-100/70 dark:hover:bg-purple-950/40 cursor-pointer border-y border-purple-100/60 dark:border-purple-900/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-600/15 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Archive className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900 dark:text-white">Shelved</span>
              <span className="text-[10px] text-slate-400 dark:text-purple-300/60 font-medium">
                Archived conversations
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-mono font-bold text-purple-600 dark:text-purple-400 bg-purple-600/15 px-2 py-0.5 rounded-full">
              {shelvedCount}
            </span>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </div>
        </div>
      )}

      {/* When Viewing Shelved Banner */}
      {showShelvedOnly && (
        <div className="px-4 py-2.5 bg-amber-500/10 border-b border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Archive className="w-4 h-4" />
            <span className="font-semibold">Showing Shelved Chats ({filteredChats.length})</span>
          </div>
          <button
            onClick={() => setShowShelvedOnly(false)}
            className="text-[11px] underline font-bold"
          >
            Exit Shelf
          </button>
        </div>
      )}

      {/* Chat Thread List with Swipe-to-Reveal Actions */}
      <div className="divide-y divide-slate-100 dark:divide-neutral-900 overflow-hidden">
        {filteredChats.map((chat: ChatThread) => {
          const contactStatus = statuses.find(
            (s) =>
              !s.isMe &&
              (s.userId === chat.id ||
                s.userName.toLowerCase().trim() === chat.name.toLowerCase().trim() ||
                chat.name.toLowerCase().includes(s.userName.toLowerCase()) ||
                s.userName.toLowerCase().includes(chat.name.toLowerCase()))
          );
          const hasRecentStatus = Boolean(contactStatus);
          const isSwiped = swipedChatId === chat.id;

          return (
            <div
              key={chat.id}
              className="relative overflow-hidden bg-white dark:bg-black"
              onTouchStart={(e) => handleTouchStart(chat.id, e)}
              onTouchEnd={(e) => handleTouchEnd(chat.id, e)}
            >
              {/* Swipe Action Buttons Revealed Underneath (Right to Left) */}
              <div className="absolute inset-y-0 right-0 flex items-stretch z-0">
                {/* 1. Shelf / Unshelf Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleShelfChat(chat.id);
                    setSwipedChatId(null);
                  }}
                  className="w-16 bg-amber-500 hover:bg-amber-600 text-slate-950 flex flex-col items-center justify-center gap-1 text-[10px] font-bold transition-colors"
                  title={chat.isShelved ? 'Unshelf chat' : 'Shelf chat'}
                >
                  <Archive className="w-4 h-4" />
                  <span>{chat.isShelved ? 'Unshelf' : 'Shelf'}</span>
                </button>

                {/* 2. Add to List / Label Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLabelingChat(chat);
                    setCustomLabelInput(chat.label || '');
                    setSwipedChatId(null);
                  }}
                  className="w-16 bg-indigo-600 hover:bg-indigo-700 text-white flex flex-col items-center justify-center gap-1 text-[10px] font-bold transition-colors"
                  title="Add to List / Assign Label"
                >
                  <Tag className="w-4 h-4" />
                  <span>Label</span>
                </button>

                {/* 3. Delete Chat Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const isGroupOrChannel = chat.isGroup || chat.isChannel;
                    const confirmMsg = isGroupOrChannel
                      ? `Delete "${chat.name}"? This will permanently delete this conversation and its messages.`
                      : `Delete chat with "${chat.name}"?`;
                    if (window.confirm(confirmMsg)) {
                      deleteChat(chat.id);
                    }
                    setSwipedChatId(null);
                  }}
                  className="w-16 bg-rose-600 hover:bg-rose-700 text-white flex flex-col items-center justify-center gap-1 text-[10px] font-bold transition-colors"
                  title="Delete Chat"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete</span>
                </button>
              </div>

              {/* Main Chat Row (Slides Left when Swiped) */}
              <div
                onClick={() => {
                  if (isSwiped) {
                    setSwipedChatId(null);
                    return;
                  }
                  setActiveChatId(chat.id);
                }}
                style={{
                  transform: isSwiped ? 'translateX(-192px)' : 'translateX(0)',
                }}
                className={`flex items-center gap-3.5 px-4 py-3 bg-white dark:bg-black hover:bg-slate-50 dark:hover:bg-neutral-900/60 cursor-pointer transition-transform duration-200 ease-out active:bg-slate-100 dark:active:bg-neutral-900 relative z-10 ${
                  chat.isScamFlagged ? 'bg-rose-50/50 dark:bg-rose-950/20' : ''
                }`}
              >
                {/* Avatar */}
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

                  {!chat.isGroup && !chat.isChannel && isUserOnline(chat.phoneNumber || chat.phone || chat.id || chat.name) && !chat.isScamFlagged && !hasRecentStatus && (
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
                    <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
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

                      {/* Custom List / Label Badge */}
                      {chat.label && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 flex items-center gap-0.5 shrink-0">
                          <Tag className="w-2 h-2" />
                          <span>{chat.label}</span>
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
                      {typingUsers[chat.id]?.length ? (
                        <span className="text-purple-400 font-semibold italic animate-pulse">typing...</span>
                      ) : (
                        <span className="truncate">{chat.lastMessage}</span>
                      )}
                    </p>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {chat.unreadCount > 0 && (
                        <span className="bg-purple-600 text-white font-bold text-[10px] rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                          {chat.unreadCount}
                        </span>
                      )}

                      {/* Swipe trigger button for desktop mouse users */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSwipedChatId(isSwiped ? null : chat.id);
                        }}
                        className="text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 p-1 rounded-md opacity-60 hover:opacity-100 transition-opacity"
                        title={isSwiped ? 'Close actions' : 'Swipe actions'}
                      >
                        <ChevronLeft className={`w-3.5 h-3.5 transition-transform ${isSwiped ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                  </div>
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
            {showShelvedOnly
              ? 'No chats currently shelved.'
              : `No chats found matching "${searchQuery}".`}
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

      {/* Add to List / Label Modal */}
      {labelingChat && (
        <div
          onClick={() => setLabelingChat(null)}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-white dark:bg-[#120924] rounded-3xl p-5 border border-slate-200 dark:border-purple-900/40 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-purple-900/30 pb-3">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Add to List / Label
                </h3>
              </div>
              <button
                onClick={() => setLabelingChat(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-purple-300/70">
              Assign a label to <strong>{labelingChat.name}</strong> to organize your chats into custom lists.
            </p>

            {/* Preset Labels */}
            <div className="flex flex-wrap gap-1.5">
              {PRESET_LABELS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => handleApplyLabel(p.name)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all active:scale-95 ${p.color}`}
                >
                  {p.name}
                </button>
              ))}
            </div>

            {/* Custom Label Input */}
            <div className="pt-2">
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                Custom List / Label Name
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customLabelInput}
                  onChange={(e) => setCustomLabelInput(e.target.value)}
                  placeholder="e.g. VIP Client, Supplier, Gym"
                  className="flex-1 px-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-neutral-900 border border-slate-200 dark:border-purple-900/40 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
                <button
                  type="button"
                  onClick={() => handleApplyLabel(customLabelInput)}
                  className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold active:scale-95 transition-all"
                >
                  Save
                </button>
              </div>
            </div>

            {/* Remove Existing Label if any */}
            {labelingChat.label && (
              <button
                type="button"
                onClick={() => handleApplyLabel(undefined)}
                className="w-full py-2 text-xs text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl font-bold transition-colors"
              >
                Remove Current Label ({labelingChat.label})
              </button>
            )}
          </div>
        </div>
      )}

      {/* Avatar Prompt Modal */}
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

export default ChatList;
