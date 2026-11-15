import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  Phone,
  Video,
  MoreVertical,
  Paperclip,
  Smile,
  Mic,
  Send,
  Play,
  Pause,
  CheckCheck,
  Check,
  ShoppingBag,
  Lock,
  Store,
  Languages,
  Shield,
  ShieldAlert,
  ShieldCheck,
  FileText,
  Vote,
  Coins,
  Radio,
  Sparkles,
  Download,
  CheckCircle2,
  Maximize2,
  Eye,
  AlertTriangle,
  Camera,
  Users,
  Image,
  Sliders,
  Trash2,
  Reply,
  Copy,
  X,
  Share2,
  Star,
  CheckSquare,
  Bell,
  Volume2,
  Search,
  MessageSquare,
  UserCheck,
  UserX,
  BadgeCheck,
  Crown,
  Eraser,
  Gamepad2,
  Trophy,
  MapPin,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ChatMessage, Product, LanguageCode } from '../types';
import { EmojiMemeDrawer } from './EmojiMemeDrawer';
import { DisplayWallpaperModal } from './DisplayWallpaperModal';
import { ContactProfileModal } from './ContactProfileModal';
import { compressChatMediaImage } from '../utils/imageUtils';
import { GroupInfoModal } from './GroupInfoModal';
import { LocationMessageBubble } from './LocationMessageBubble';

interface ActiveChatProps {
  onOpenVoiceRecorder: () => void;
}

export const ActiveChat: React.FC<ActiveChatProps> = ({ onOpenVoiceRecorder }) => {
  const {
    clearChat,
    deleteChat,
    activeChatId,
    setActiveChatId,
    chats,
    messages,
    sendMessage,
    deleteMessage,
    reactToMessage,
    sendImageMessage,
    respondToGroupInvitation,
    openCheckout,
    setActiveEscrowModalOrder,
    formatPrice,
    language,
    startCall,
    chatWallpaper,
    // Super-app features
    isScreenshotBlockerActive,
    toggleScreenshotBlocker,
    screenshotBlockedToast,
    triggerScreenshotAttempt,
    setIsMemeStudioOpen,
    setIsInvoiceGeneratorOpen,
    setViewingInvoice,
    setIsFinancialPollModalOpen,
    voteOnFinancialPoll,
    setIsGameXoModalOpen,
    setIsShareLocationModalOpen,
    acceptXoChallenge,
    declineXoChallenge,
    makeXoMove,
    setIsWalletModalOpen,
    setIsAjoModalOpen,
    setActiveAjoGroup,
    joinAudioSpace,
    audioSpaces,
    setIsScamCheckerModalOpen,
    checkEntityReputation,
    isEmojiMemeDrawerOpen,
    setIsEmojiMemeDrawerOpen,
    setIsHealthModalOpen,
    setIsLegalModalOpen,
    setIsErrandsModalOpen,
    statuses,
    setActiveViewingStatus,
    currentUser,
    isUserOnline,
    getLastSeen,
    getBadgeForPhone,
    typingUsers,
    sendTypingIndicator,
    friendRequests,
    acceptFriendRequest,
    declineFriendRequest,
    isFeatureEnabled,
    setIsAdminModalOpen,
    isOneTimeViewEnabled,
    setIsOneTimeViewEnabled,
    hasActiveStore,
    myStoreProducts,
    addStoreProduct,
    sendProductCard,
    currency,
  } = useApp();

  const [isDisplayModalOpen, setIsDisplayModalOpen] = useState(false);
  const [isContactProfileOpen, setIsContactProfileOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [toastNotice, setToastNotice] = useState<string | null>(null);
  const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false);
  const [showHeaderActionsMenu, setShowHeaderActionsMenu] = useState(false);
  const [confirmChatAction, setConfirmChatAction] = useState<'clear' | 'delete' | null>(null);
  const [showChatSearch, setShowChatSearch] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [pollCardErrors, setPollCardErrors] = useState<Record<string, { msg: string; insufficient?: boolean }>>({});
  const [xoBusyId, setXoBusyId] = useState<string | null>(null);
  const [xoErrors, setXoErrors] = useState<Record<string, { msg: string; insufficient?: boolean }>>({});

  // Fullscreen image lightbox
  const [lightboxImg, setLightboxImg] = useState<{
    url: string;
    caption?: string;
    isOneTime?: boolean;
    msgId?: string;
  } | null>(null);

  // One-time disappearing text viewer
  const [lightboxOneTimeText, setLightboxOneTimeText] = useState<{
    msgId: string;
    text: string;
    senderName: string;
  } | null>(null);

  // Custom Escrow Deal quick modal state
  const [showEscrowDealModal, setShowEscrowDealModal] = useState(false);
  const [escrowDealTitle, setEscrowDealTitle] = useState('');
  const [escrowDealAmount, setEscrowDealAmount] = useState('15000');
  const [escrowDealError, setEscrowDealError] = useState<string | null>(null);

  // Store Owner Catalog quick-add form state
  const [showAddCatalogForm, setShowAddCatalogForm] = useState(false);
  const [newProdTitle, setNewProdTitle] = useState('');
  const [newProdPrice, setNewProdPrice] = useState('');
  const [newProdDesc, setNewProdDesc] = useState('');
  const [catalogFeedback, setCatalogFeedback] = useState<string | null>(null);

  // Persistence for viewed one-time images
  const [openedOneTimeImages, setOpenedOneTimeImages] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem('AGC_opened_one_time_images');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const markOneTimeAsOpened = (msgId: string) => {
    setOpenedOneTimeImages((prev) => {
      const updated = { ...prev, [msgId]: true };
      try {
        localStorage.setItem('AGC_opened_one_time_images', JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });
  };

  // Group chat helpers
  const GROUP_COLORS = [
    'text-pink-500','text-violet-500','text-sky-500','text-emerald-500',
    'text-orange-400','text-rose-400','text-teal-400','text-amber-400',
  ];
  const getSenderColor = (name: string) => {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
    return GROUP_COLORS[h % GROUP_COLORS.length];
  };
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Swipe from left to right to go back to chats
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;

    // Swipe right by at least 65px with small vertical movement
    if (deltaX > 65 && Math.abs(deltaY) < 55) {
      setActiveChatId(null);
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeChatId) return;
    setShowAttachMenu(false);
    try {
      const compressedDataUrl = await compressChatMediaImage(file);
      sendImageMessage(activeChatId, compressedDataUrl, undefined, isOneTimeViewEnabled);
    } catch (err) {
      console.warn('Image compression failed:', err);
    } finally {
      setIsOneTimeViewEnabled(false);
      e.target.value = '';
    }
  };

  const [inputText, setInputText] = useState('');
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleInputChange = (val: string) => {
    setInputText(val);
    if (!activeChatId) return;
    sendTypingIndicator(activeChatId, true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      sendTypingIndicator(activeChatId, false);
    }, 2200);
  };
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [voiceProgress, setVoiceProgress] = useState<Record<string, number>>({});
  // Track which voice note transcripts have been revealed by the user
  const [revealedTranscripts, setRevealedTranscripts] = useState<Record<string, boolean>>({});
  const [showCatalogDrawer, setShowCatalogDrawer] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [translatedMessages, setTranslatedMessages] = useState<Record<string, boolean>>({});
  const [activeMenuMsgId, setActiveMenuMsgId] = useState<string | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getTranslatedContent = (msg: ChatMessage): string => {
    if (msg.translatedText) {
      if (msg.translatedText[language] && msg.translatedText[language] !== msg.text) {
        return msg.translatedText[language];
      }
      const altLang = language === 'en' ? 'pcm' : 'en';
      if (msg.translatedText[altLang] && msg.translatedText[altLang] !== msg.text) {
        return msg.translatedText[altLang];
      }
      for (const l of ['pcm', 'en', 'sw', 'yo', 'ha', 'fr'] as LanguageCode[]) {
        if (msg.translatedText[l] && msg.translatedText[l] !== msg.text) {
          return msg.translatedText[l];
        }
      }
    }

    const phraseMap: [RegExp, string][] = [
      [/\bhow far\b/i, 'Hello, how are you?'],
      [/\bhow body\b/i, 'How are you feeling today?'],
      [/\bi dey\b/i, 'I am doing well'],
      [/\bxiexie\b/i, 'Thank you very much.'],
      [/\babeg\b/i, 'please'],
      [/\bwetin dey\b/i, "what's going on?"],
      [/\bno wahala\b/i, 'No problem at all.'],
      [/\bkedu\b/i, 'How are you?'],
      [/\bbawo ni\b/i, 'How is everything?'],
      [/\bjambo\b/i, 'Hello!'],
      [/\basante\b/i, 'Thank you.'],
    ];

    const raw = msg.text || '';
    for (const [re, rep] of phraseMap) {
      if (re.test(raw)) {
        return raw.replace(re, rep);
      }
    }

    if (/\b(dey|don|wetin|abeg|fit|na)\b/i.test(raw)) {
      return raw
        .replace(/\bdey\b/gi, 'is')
        .replace(/\bdon\b/gi, 'has')
        .replace(/\babeg\b/gi, 'please')
        .replace(/\bwetin\b/gi, 'what')
        .replace(/\bfit\b/gi, 'can')
        .replace(/\bna\b/gi, 'is');
    }

    return `Translated (${language.toUpperCase()}): "${raw}"`;
  };

  const chatContainerRef = useRef<HTMLDivElement>(null);

  const currentChat =
    chats.find((c) => c.id === activeChatId) ||
    (activeChatId?.startsWith('dm_')
      ? chats.find((c) => c.phone && activeChatId.includes(c.phone.replace(/\D/g, '')))
      : undefined);
  const isGroupChat = Boolean(currentChat?.isGroup);
  const isGroupAdmin = Boolean(
    currentUser &&
      currentChat?.isGroup &&
      (currentChat.creatorId === currentUser.id ||
        currentChat.adminIds?.includes(currentUser.id) ||
        currentChat.admins?.includes(currentUser.fullName) ||
        (currentUser.phoneNumber && currentChat.admins?.includes(currentUser.phoneNumber)) ||
        currentChat.admins?.includes('You'))
  );
  const isChannelAdmin = Boolean(
    currentUser &&
      currentChat?.isChannel &&
      (currentChat.creatorId === currentUser.id ||
        currentChat.adminIds?.includes(currentUser.id) ||
        currentChat.admins?.includes(currentUser.fullName) ||
        currentChat.admins?.includes('You'))
  );
  const isChannelMember = currentChat?.isChannel && !isChannelAdmin;

  const normPhone = (p?: string) => {
    const d = (p || '').replace(/\D/g, '');
    if (d.length === 11 && d.startsWith('0')) return '234' + d.slice(1);
    return d;
  };
  const samePhone = (a?: string, b?: string) => {
    if (!a || !b) return false;
    if (a.trim() === b.trim()) return true;
    const na = normPhone(a);
    const nb = normPhone(b);
    if (!na || !nb) return false;
    if (na === nb) return true;
    return na.length >= 9 && nb.length >= 9 && na.slice(-9) === nb.slice(-9);
  };
  const myPhoneRaw = currentUser.phoneNumber || currentUser.id || '';
  const myVoterKey = normPhone(myPhoneRaw) || currentUser.id || 'local_user';
  const currentMessages =
    (activeChatId && messages[activeChatId]) ||
    (currentChat?.id && messages[currentChat.id]) ||
    [];

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [currentMessages, activeChatId]);

  // Cleanup playing audio & transient UI on unmount or chat switch
  useEffect(() => {
    setIsOneTimeViewEnabled(false);
    setShowAttachMenu(false);
    setShowCatalogDrawer(false);
    setShowChatSearch(false);
    setChatSearchQuery('');
    return () => {
      Object.values(audioRefs.current).forEach((a) => {
        try { a.pause(); a.currentTime = 0; } catch (_) {}
      });
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setPlayingVoiceId(null);
    };
  }, [activeChatId]);

  if (!currentChat) {
    return (
      <div className="flex flex-col h-full w-full max-w-md mx-auto bg-white dark:bg-black items-center justify-center p-6 text-center select-none">
        <div className="w-14 h-14 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 mb-4 shadow-sm">
          <MessageSquare className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1">
          Conversation not available
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mb-6">
          This conversation could not be loaded or was cleared.
        </p>
        <button
          type="button"
          onClick={() => setActiveChatId(null)}
          className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-600/30 active:scale-95 transition-all cursor-pointer"
        >
          Return to Chats
        </button>
      </div>
    );
  }

  const handleSend = () => {
    if (!inputText.trim() || !activeChatId) return;
    const trimmed = inputText.trim().toLowerCase();
    if (trimmed === '/agc-admin') {
      setInputText('');
      setIsAdminModalOpen(true);
      return;
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    sendTypingIndicator(activeChatId, false);
    const replyMeta = replyingTo
      ? {
          id: replyingTo.id,
          sender: replyingTo.sender === 'user' ? 'You' : (currentChat?.name || 'Contact'),
          text: replyingTo.text || (replyingTo.imageUrl ? '📷 Photo' : 'Voice note'),
        }
      : undefined;
    sendMessage(activeChatId, inputText, replyMeta, isOneTimeViewEnabled);
    setInputText('');
    setReplyingTo(null);
    if (isOneTimeViewEnabled) setIsOneTimeViewEnabled(false);
  };

  // Real audio playback ref map (msgId -> HTMLAudioElement)
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});

  const toggleVoicePlayback = (
    msgId: string,
    audioDataUrl?: string,
    transcriptText?: string,
    isOneTime?: boolean
  ) => {
    // Pause any other playing audio
    Object.entries(audioRefs.current).forEach(([id, a]) => {
      if (id !== msgId && !a.paused) {
        try { a.pause(); a.currentTime = 0; } catch (_) {}
      }
    });

    const existing = audioRefs.current[msgId];

    if (existing && !existing.paused) {
      existing.pause();
      existing.currentTime = 0;
      setPlayingVoiceId(null);
      setVoiceProgress((prev) => ({ ...prev, [msgId]: 0 }));
      if (isOneTime) markOneTimeAsOpened(msgId);
      return;
    }

    if (playingVoiceId === msgId && typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setPlayingVoiceId(null);
      setVoiceProgress((prev) => ({ ...prev, [msgId]: 0 }));
      if (isOneTime) markOneTimeAsOpened(msgId);
      return;
    }

    if (existing) {
      existing.play().then(() => {
        setPlayingVoiceId(msgId);
      }).catch((err) => {
        console.warn('Playback resume notice:', err);
        setPlayingVoiceId(null);
      });
      return;
    }

    if (audioDataUrl) {
      try {
        const audio = new Audio(audioDataUrl);
        audioRefs.current[msgId] = audio;
        audio.onended = () => {
          setPlayingVoiceId(null);
          setVoiceProgress((prev) => ({ ...prev, [msgId]: 0 }));
          if (isOneTime) markOneTimeAsOpened(msgId);
        };
        audio.ontimeupdate = () => {
          if (audio.duration && audio.duration > 0) {
            const pct = (audio.currentTime / audio.duration) * 100;
            setVoiceProgress((prev) => ({ ...prev, [msgId]: pct }));
          }
        };
        audio.onerror = () => {
          console.warn('Voice note audio format failed to decode');
          setPlayingVoiceId(null);
        };
        audio.play().then(() => {
          setPlayingVoiceId(msgId);
        }).catch((err) => {
          console.warn('Audio play notice:', err);
          setPlayingVoiceId(null);
        });
      } catch (e) {
        console.warn('Audio construction error:', e);
      }
    } else if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(transcriptText?.trim() || 'Voice message');
      utter.onstart = () => {
        setPlayingVoiceId(msgId);
        setVoiceProgress((prev) => ({ ...prev, [msgId]: 50 }));
      };
      utter.onend = () => {
        setPlayingVoiceId(null);
        setVoiceProgress((prev) => ({ ...prev, [msgId]: 0 }));
        if (isOneTime) markOneTimeAsOpened(msgId);
      };
      utter.onerror = () => {
        setPlayingVoiceId(null);
      };
      window.speechSynthesis.speak(utter);
    } else if (isOneTime) {
      markOneTimeAsOpened(msgId);
    }
  };

  const toggleTranslation = (msgId: string) => {
    setTranslatedMessages((prev) => ({
      ...prev,
      [msgId]: !prev[msgId],
    }));
  };

  return (
    <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} className="flex flex-col h-full w-full max-w-md mx-auto bg-white dark:bg-black transition-colors relative select-none overflow-x-hidden overflow-y-hidden overscroll-none touch-pan-y fixed inset-0 sm:relative sm:inset-auto sm:h-full">
      {/* Custom Chat Wallpaper Layer (Uploaded from device or preset) */}
      {chatWallpaper && (
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
          <img
            src={chatWallpaper}
            alt="Chat Wallpaper"
            className="w-full h-full object-cover opacity-20 dark:opacity-25"
          />
          <div className="absolute inset-0 bg-white/70 dark:bg-black/75 backdrop-blur-[0.5px]" />
        </div>
      )}

      {/* Screenshot Blocked Toast Notification */}
      {screenshotBlockedToast && (
        <div style={{ top: 'max(calc(env(safe-area-inset-top, 0px) + 64px), 72px)' }} className="absolute inset-x-3 z-50 p-3 bg-rose-600 text-white rounded-2xl shadow-2xl flex items-center gap-2.5 animate-in slide-in-from-top-4 border border-rose-400">
          <ShieldAlert className="w-5 h-5 shrink-0 animate-bounce" />
          <div className="text-xs font-medium leading-tight">
            {screenshotBlockedToast}
          </div>
        </div>
      )}

      {/* Top Header */}
      <div
        className="flex items-center justify-between px-3 pb-2.5 bg-purple-950 dark:bg-black text-white shrink-0 z-20 shadow-xs border-b border-purple-900/60 dark:border-neutral-900"
        style={{
          paddingTop: 'max(calc(env(safe-area-inset-top, 0px) + 8px), 16px)',
          paddingLeft: 'max(env(safe-area-inset-left, 0px), 12px)',
          paddingRight: 'max(env(safe-area-inset-right, 0px), 12px)',
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => setActiveChatId(null)}
            className="p-1 text-white hover:bg-white/10 rounded-full transition-colors"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Avatar (Click opens Contact Profile, with status ring flow if recent update) */}
          {(() => {
            const contactStatus = statuses.find(
              (s) =>
                !s.isMe &&
                (s.userId === currentChat.id ||
                  s.userName.toLowerCase().trim() === currentChat.name.toLowerCase().trim() ||
                  currentChat.name.toLowerCase().includes(s.userName.toLowerCase()) ||
                  s.userName.toLowerCase().includes(currentChat.name.toLowerCase()))
            );
            const hasRecentStatus = Boolean(contactStatus);

            return (
              <div className="flex items-center gap-2">
                <div
                  className="relative shrink-0 cursor-pointer group"
                  onClick={() => {
                    if (hasRecentStatus && contactStatus) {
                      setActiveViewingStatus(contactStatus);
                    } else {
                      setIsContactProfileOpen(true);
                    }
                  }}
                  title={hasRecentStatus ? `${currentChat.name} posted a status story (Tap to view)` : 'View contact info'}
                >
                  {hasRecentStatus ? (
                    <div className="p-[2.5px] rounded-full bg-gradient-to-tr from-purple-500 via-pink-500 to-amber-400 shadow-md animate-pulse">
                      <div className="p-0.5 bg-black rounded-full">
                        <img
                          src={currentChat.avatar}
                          alt={currentChat.name}
                          referrerPolicy="no-referrer"
                          className="w-10 h-10 rounded-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>
                    </div>
                  ) : (
                    <img
                      src={currentChat.avatar}
                      alt={currentChat.name}
                      referrerPolicy="no-referrer"
                      className="w-11 h-11 rounded-full object-cover border border-white/20 group-hover:scale-105 transition-transform"
                    />
                  )}

                  {hasRecentStatus && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        if (contactStatus) setActiveViewingStatus(contactStatus);
                      }}
                      title="View 24h Story"
                      className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-tr from-purple-600 to-pink-500 text-white rounded-full flex items-center justify-center text-[9px] shadow-sm border border-black"
                    >
                      <Sparkles className="w-2.5 h-2.5" />
                    </span>
                  )}

                  {(() => {
                    const isPeerOnline = !currentChat.isGroup && !currentChat.isChannel && isUserOnline(currentChat.phoneNumber || currentChat.phone || currentChat.id || currentChat.name);
                    return isPeerOnline && !currentChat.isScamFlagged && !hasRecentStatus ? (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-purple-950 dark:border-black rounded-full shadow-sm shadow-emerald-400 animate-pulse" />
                    ) : null;
                  })()}
                  {currentChat.isScamFlagged && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold">
                      !
                    </span>
                  )}
                </div>

                {/* Contact Details (Click opens Contact Profile) */}
                <div
                  onClick={() => setIsContactProfileOpen(true)}
                  className="min-w-0 cursor-pointer px-1 group"
                  title="View contact info"
                >
                  <div className="font-bold text-sm leading-tight text-white group-hover:text-purple-300 truncate flex items-center gap-1.5 transition-colors">
                    <span>{currentChat.name}</span>
                    {(() => {
                      const liveBadge =
                        !currentChat.isGroup && !currentChat.isChannel
                          ? getBadgeForPhone(currentChat.phoneNumber || currentChat.phone || currentChat.id)
                          : null;
                      if (liveBadge === 'blue') {
                        return (
                          <span
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-sky-500/25 border border-sky-400/60 text-sky-300 text-[9px] font-extrabold shrink-0"
                            title="Blue VIP Verified"
                          >
                            <BadgeCheck className="w-3 h-3 text-sky-400" />
                            <span>Verified</span>
                          </span>
                        );
                      }
                      if (liveBadge === 'gold') {
                        return (
                          <span
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-amber-400/25 border border-amber-400/60 text-amber-300 text-[9px] font-extrabold shrink-0"
                            title="Gold Verified Merchant"
                          >
                            <BadgeCheck className="w-3 h-3 text-amber-400" />
                            <span>Merchant</span>
                          </span>
                        );
                      }
                      if (liveBadge === 'creator_plus' || currentChat.isCelebrityVerified) {
                        return (
                          <span
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-gradient-to-r from-amber-500/25 to-purple-600/30 border border-amber-400/60 text-amber-300 text-[9px] font-extrabold shadow-2xs shrink-0"
                            title={
                              liveBadge === 'creator_plus'
                                ? 'Creator+ VIP'
                                : `Celebrity Verified: ${currentChat.celebrityStageName || currentChat.name} (${currentChat.celebrityCategory || 'VIP / Artist'})`
                            }
                          >
                            {liveBadge === 'creator_plus' ? (
                              <Crown className="w-3 h-3 text-purple-300" />
                            ) : (
                              <CheckCircle2 className="w-3 h-3 text-amber-400 fill-amber-400/20" />
                            )}
                            <span>{liveBadge === 'creator_plus' ? 'Creator+' : 'Celebrity'}</span>
                          </span>
                        );
                      }
                      return null;
                    })()}
                    {currentChat.isGroup && (
                      <button
                        onClick={() => setIsGroupInfoOpen(true)}
                        className="text-[10px] font-mono bg-white/15 hover:bg-white/25 px-1.5 py-0.2 rounded font-normal transition-colors"
                        title="Group info"
                      >
                        {currentChat.membersCount} members
                      </button>
                    )}
                  </div>
                  <div className="text-[11px] text-indigo-200/80 leading-tight truncate">
                    {(() => {
                      const currentTyping = typingUsers[currentChat.id] || [];
                      const isTypingNow = currentTyping.length > 0;
                      const isPeerOnline = !currentChat.isGroup && !currentChat.isChannel && isUserOnline(currentChat.phoneNumber || currentChat.phone || currentChat.id || currentChat.name);

                      if (currentChat.isScamFlagged) {
                        return <span className="text-rose-400 font-bold">⚠️ Flagged Scammer ({currentChat.scamReportsCount} reports)</span>;
                      }
                      if (isTypingNow) {
                        return (
                          <span className="text-purple-300 font-semibold flex items-center gap-1 animate-pulse">
                            <span>{currentTyping.join(', ')} typing</span>
                            <span className="inline-flex gap-0.5">
                              <span className="w-1 h-1 bg-purple-300 rounded-full animate-bounce [animation-delay:0ms]" />
                              <span className="w-1 h-1 bg-purple-300 rounded-full animate-bounce [animation-delay:150ms]" />
                              <span className="w-1 h-1 bg-purple-300 rounded-full animate-bounce [animation-delay:300ms]" />
                            </span>
                          </span>
                        );
                      }
                      if (hasRecentStatus) {
                        return <span className="text-pink-300 font-medium">✨ new story update</span>;
                      }
                      if (isPeerOnline) {
                        return (
                          <span className="text-emerald-400 font-medium flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span>online now</span>
                          </span>
                        );
                      }
                      if (currentChat.isGroup || currentChat.isChannel) {
                        return null;
                      }
                      const lastSeenStr = getLastSeen(currentChat.phoneNumber || currentChat.phone || currentChat.id || currentChat.name);
                      return <span className="text-indigo-200/70 font-normal">{lastSeenStr}</span>;
                    })()}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Right Action Icons: Video, Voice, Scam Check - Disappear when toggled off */}
        <div className="flex items-center gap-1 text-white">
          {isFeatureEnabled('calls') && (
            <>
              <button
                onClick={() =>
                  startCall(
                    currentChat.name,
                    currentChat.phoneNumber || currentChat.phone || '',
                    currentChat.avatar,
                    'video',
                    undefined,
                    true,
                    {
                      isGroupCall: Boolean(currentChat.isGroup || currentChat.isChannel),
                      participantPhones: currentChat.memberPhones,
                      chatId: currentChat.id,
                    }
                  )
                }
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                aria-label="Video Call"
                title="Video Call"
              >
                <Video className="w-5 h-5" />
              </button>

              <button
                onClick={() =>
                  startCall(
                    currentChat.name,
                    currentChat.phoneNumber || currentChat.phone || '',
                    currentChat.avatar,
                    'voice',
                    undefined,
                    true,
                    {
                      isGroupCall: Boolean(currentChat.isGroup || currentChat.isChannel),
                      participantPhones: currentChat.memberPhones,
                      chatId: currentChat.id,
                    }
                  )
                }
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                aria-label="Voice Call"
                title="Voice Call"
              >
                <Phone className="w-5 h-5" />
              </button>
            </>
          )}

          {isFeatureEnabled('scamChecker') && (
            <button
              type="button"
              onClick={() => {
                const target = currentChat.phoneNumber || currentChat.phone;
                if (target) checkEntityReputation(target);
                setIsScamCheckerModalOpen(true);
              }}
              className="p-2 hover:bg-white/10 rounded-full transition-colors text-amber-400"
              title="Check Scam Reputation"
              aria-label="Scam Check"
            >
              <ShieldAlert className="w-5 h-5" />
            </button>
          )}

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowHeaderActionsMenu((prev) => !prev)}
              className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/80 hover:text-white"
              title="Chat Options"
              aria-label="Chat Options"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {showHeaderActionsMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowHeaderActionsMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-[#1a1635] text-slate-800 dark:text-slate-100 rounded-2xl shadow-2xl border border-slate-200 dark:border-purple-900/40 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <button
                    type="button"
                    onClick={() => {
                      setShowHeaderActionsMenu(false);
                      setConfirmChatAction('clear');
                    }}
                    className="w-full px-3.5 py-2.5 text-left text-xs font-medium hover:bg-slate-100 dark:hover:bg-white/10 flex items-center gap-2.5 transition-colors"
                  >
                    <Eraser className="w-4 h-4 text-slate-500 dark:text-slate-300 shrink-0" />
                    <span>Clear Chat History</span>
                  </button>

                  {(currentChat.isGroup || currentChat.isChannel) &&
                    (currentChat.creatorId === currentUser.id ||
                      currentChat.admins?.includes(currentUser.fullName) ||
                      currentChat.admins?.includes('You') ||
                      currentChat.id.startsWith('town_comm_')) && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowHeaderActionsMenu(false);
                          setConfirmChatAction('delete');
                        }}
                        className="w-full px-3.5 py-2.5 text-left text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/15 flex items-center gap-2.5 transition-colors border-t border-slate-100 dark:border-purple-900/30"
                      >
                        <Trash2 className="w-4 h-4 shrink-0" />
                        <span>Delete {currentChat.isChannel ? 'Channel' : 'Group'}</span>
                      </button>
                    )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* In-Chat Search Bar */}
      {showChatSearch && (
        <div className="px-3 py-2 bg-slate-50 dark:bg-[#131026] border-b border-slate-200 dark:border-purple-900/40 flex items-center gap-2 shrink-0 z-10 animate-in slide-in-from-top-2">
          <Search className="w-4 h-4 text-purple-500 shrink-0" />
          <input
            type="text"
            value={chatSearchQuery}
            onChange={(e) => setChatSearchQuery(e.target.value)}
            placeholder="Search messages in this chat..."
            autoFocus
            className="flex-1 bg-transparent text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
          />
          {chatSearchQuery && (
            <span className="text-[10px] font-mono text-purple-500 font-bold shrink-0">
              {currentMessages.filter((m) => (m.text || '').toLowerCase().includes(chatSearchQuery.toLowerCase())).length} found
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              setShowChatSearch(false);
              setChatSearchQuery('');
            }}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* In-Chat Store Owner Catalog Drawer */}
      {showCatalogDrawer && hasActiveStore && (
        <div className="bg-white dark:bg-[#151329] border-b border-slate-200 dark:border-slate-800 p-3 shadow-md animate-in slide-in-from-top duration-200 shrink-0 max-h-80 overflow-y-auto z-10 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5 text-purple-500" />
              <span>My Store Catalog ({myStoreProducts.length})</span>
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowAddCatalogForm((p) => !p);
                  setCatalogFeedback(null);
                }}
                className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold transition-colors"
              >
                {showAddCatalogForm ? 'Cancel' : '+ Add Product'}
              </button>
              <button
                type="button"
                onClick={() => setShowCatalogDrawer(false)}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                Done
              </button>
            </div>
          </div>

          {catalogFeedback && (
            <div className="p-2 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-600 dark:text-purple-300 text-[11px] font-semibold">
              {catalogFeedback}
            </div>
          )}

          {showAddCatalogForm && (
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#1e1b38] border border-purple-500/30 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={newProdTitle}
                  onChange={(e) => setNewProdTitle(e.target.value)}
                  placeholder="Product name..."
                  className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-black/40 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none"
                />
                <input
                  type="number"
                  min={100}
                  value={newProdPrice}
                  onChange={(e) => setNewProdPrice(e.target.value)}
                  placeholder={`Price (${currency})`}
                  className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-black/40 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white focus:outline-none"
                />
              </div>
              <input
                type="text"
                value={newProdDesc}
                onChange={(e) => setNewProdDesc(e.target.value)}
                placeholder="Short description (optional)"
                className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-black/40 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  const priceNum = Number(newProdPrice);
                  if (!newProdTitle.trim() || !priceNum || priceNum <= 0) {
                    setCatalogFeedback('Enter a valid product name and price.');
                    return;
                  }
                  const res = addStoreProduct({
                    title: newProdTitle.trim(),
                    description: newProdDesc.trim() || 'Escrow-protected store item',
                    price: priceNum,
                    currency,
                    imageUrl: '/assets/aistudio/IMG_7069_4d0dd19c.jpeg',
                    category: 'fashion',
                    location: 'Lagos, Nigeria',
                    condition: 'Brand New',
                    tags: ['Store'],
                  });
                  setCatalogFeedback(res.message);
                  if (res.success) {
                    setNewProdTitle('');
                    setNewProdPrice('');
                    setNewProdDesc('');
                    setShowAddCatalogForm(false);
                  }
                }}
                className="w-full py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors"
              >
                Save Product to Store
              </button>
            </div>
          )}

          {myStoreProducts.length === 0 ? (
            <div className="p-4 text-center rounded-xl bg-slate-50 dark:bg-[#1e1b38] border border-dashed border-slate-300 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
              No products in your store yet. Tap <strong>+ Add Product</strong> to list an item and drop it into chat.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {myStoreProducts.map((product: Product) => (
                <div
                  key={product.id}
                  className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50 dark:bg-[#1e1b38] border border-slate-200/80 dark:border-slate-800"
                >
                  <img
                    src={product.imageUrl}
                    alt={product.title}
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 rounded-lg object-cover shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {product.title}
                    </h4>
                    <div className="text-xs font-bold font-mono text-indigo-600 dark:text-indigo-400">
                      {formatPrice(product.price, product.currency)}
                    </div>
                    <div className="mt-1 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          if (activeChatId) sendProductCard(activeChatId, product, true);
                          setShowCatalogDrawer(false);
                          setToastNotice(`Sent "${product.title}" in chat`);
                          setTimeout(() => setToastNotice(null), 2200);
                        }}
                        className="px-2 py-0.5 bg-purple-600 hover:bg-purple-700 text-white rounded text-[10px] font-bold transition-colors"
                      >
                        Send in Chat
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowCatalogDrawer(false);
                          openCheckout(product);
                        }}
                        className="px-2 py-0.5 bg-indigo-600/15 hover:bg-indigo-600/25 text-indigo-600 dark:text-indigo-300 rounded text-[10px] font-semibold transition-colors"
                      >
                        Escrow
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {currentChat.catalog && currentChat.catalog.length > 0 && (
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="text-[11px] font-bold text-slate-500 mb-1.5">
                {currentChat.name} · Catalog ({currentChat.catalog.length})
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {currentChat.catalog.map((product: Product) => (
                  <div
                    key={product.id}
                    className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50 dark:bg-[#1e1b38] border border-slate-200/80 dark:border-slate-800"
                  >
                    <img
                      src={product.imageUrl}
                      alt={product.title}
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 rounded-lg object-cover shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {product.title}
                      </h4>
                      <div className="text-xs font-bold font-mono text-indigo-600 dark:text-indigo-400">
                        {formatPrice(product.price, product.currency)}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setShowCatalogDrawer(false);
                          openCheckout(product);
                        }}
                        className="mt-1 px-2.5 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[10px] font-semibold transition-colors"
                      >
                        Buy in Chat
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Group Invitation Pending Banner */}
      {currentChat.invitationStatus === 'pending' && (
        <div className="p-3.5 bg-gradient-to-r from-purple-900/50 via-indigo-950/60 to-purple-900/50 border-b border-purple-500/40 text-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-md z-10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center shrink-0 border border-purple-500/30">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-slate-900 dark:text-white">
                {currentChat.isChannel ? 'Channel Invitation' : 'Group Invitation'}: {currentChat.name}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-purple-300/80">
                You were invited to this {currentChat.isChannel ? 'channel' : 'group'}. Accept to join or decline to dismiss.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => respondToGroupInvitation(currentChat.id, true)}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
            >
              Accept & Join
            </button>
            <button
              type="button"
              onClick={() => respondToGroupInvitation(currentChat.id, false)}
              className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Decline
            </button>
          </div>
        </div>
      )}

      {/* 1-on-1 Contact Request Pending Banner */}
      {(() => {
        if (currentChat.isGroup || currentChat.isChannel) return null;
        const pendingContactReq = friendRequests.find(
          (r) =>
            r.status === 'pending' &&
            ((currentChat.phoneNumber && r.senderPhone && r.senderPhone.replace(/\D/g, '') === currentChat.phoneNumber.replace(/\D/g, '')) ||
             (currentChat.phone && r.senderPhone && r.senderPhone.replace(/\D/g, '') === currentChat.phone.replace(/\D/g, '')) ||
             (r.senderName && r.senderName.toLowerCase() === currentChat.name.toLowerCase()))
        );
        if (!pendingContactReq) return null;

        return (
          <div className="p-3.5 bg-gradient-to-r from-purple-950/90 via-[#18152e] to-purple-950/90 border-b border-purple-500/40 text-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-md z-10 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0 border border-emerald-500/30">
                <UserCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <div className="font-bold text-white flex items-center gap-1.5">
                  <span>{pendingContactReq.senderName} added you</span>
                  <span className="text-[10px] font-mono text-purple-300 bg-purple-500/20 px-1.5 py-0.2 rounded-full">New Request</span>
                </div>
                <div className="text-[11px] text-purple-200/80">
                  "{pendingContactReq.message || `Wants to connect with you on AfriChat.`}"
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => acceptFriendRequest(pendingContactReq.id)}
                className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer flex items-center gap-1"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Accept</span>
              </button>
              <button
                type="button"
                onClick={() => declineFriendRequest(pendingContactReq.id)}
                className="px-3.5 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1"
              >
                <UserX className="w-3.5 h-3.5" />
                <span>Decline</span>
              </button>
            </div>
          </div>
        );
      })()}

      {/* Message Feed */}
      <div
        ref={chatContainerRef}
        onClick={() => setActiveMenuMsgId(null)}
        className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-2 space-y-2.5 overscroll-contain w-full min-w-0"
      >
        {/* Date Divider */}
        <div className="flex justify-center my-2">
          <span className="text-[11px] bg-white/80 dark:bg-[#1a172e]/80 backdrop-blur-xs text-slate-600 dark:text-slate-400 px-3 py-1 rounded-md shadow-2xs font-medium">
            TODAY
          </span>
        </div>

        {(chatSearchQuery.trim()
          ? currentMessages.filter((m: ChatMessage) =>
              (m.text || '').toLowerCase().includes(chatSearchQuery.trim().toLowerCase()) ||
              (m.senderName || '').toLowerCase().includes(chatSearchQuery.trim().toLowerCase())
            )
          : currentMessages
        ).map((msg: ChatMessage) => {
          const isUser = msg.sender === 'user';
          const isSystem = msg.sender === 'system';

          if (isSystem) {
            return (
              <div key={msg.id} className="flex justify-center my-2">
                <div className="max-w-xs bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl p-3 text-center shadow-2xs">
                  <div className="flex items-center justify-center gap-1.5 text-amber-800 dark:text-amber-300 text-xs font-bold mb-1">
                    <Lock className="w-3.5 h-3.5" />
                    <span>AGC Escrow Protection</span>
                  </div>
                  <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                    {msg.text}
                  </p>
                  {msg.order && (
                    <div className="mt-2 pt-2 border-t border-amber-200 dark:border-amber-800/60 flex items-center justify-between text-xs">
                      <span className="text-slate-600 dark:text-slate-400 font-mono">
                        PIN: <strong className="text-amber-700 dark:text-amber-300">{msg.order.escrowPin}</strong>
                      </span>
                      <button
                        onClick={() => setActiveEscrowModalOrder(msg.order!)}
                        className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] font-semibold transition-colors"
                      >
                        Manage Escrow
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              className={`flex items-start gap-2.5 my-2.5 w-full ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {/* Contact Avatar (WeChat style Left) */}
              {!isUser && (
                <img
                  src={msg.senderAvatar || currentChat?.avatar || `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(msg.senderName || 'contact')}`}
                  alt={msg.senderName || currentChat?.name || 'Contact'}
                  className="w-9 h-9 rounded-xl object-cover shrink-0 mt-0.5 border border-slate-200/80 dark:border-white/10 shadow-2xs select-none"
                />
              )}

              {/* Message Bubble + Floating Context Menu Container */}
              <div className="relative max-w-[76%] sm:max-w-[70%] min-w-0">
                {/* WeChat-style Floating Context Menu (opens on highlight / click) */}
                {activeMenuMsgId === msg.id && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className={`absolute -top-26 z-40 ${isUser ? 'right-0' : 'left-0'} bg-[#242428]/95 dark:bg-[#1a1a1e]/95 text-white backdrop-blur-md rounded-2xl p-2 shadow-2xl border border-white/15 w-64 animate-in zoom-in-95 duration-150 select-none`}
                  >
                    {/* Row 1: Copy, Forward, Favorite, Delete, Select */}
                    <div className="grid grid-cols-5 gap-1 text-center pb-1.5 border-b border-white/10">
                      <button
                        type="button"
                        onClick={() => {
                          if (msg.text) navigator.clipboard.writeText(msg.text);
                          setToastNotice('Copied!');
                          setTimeout(() => setToastNotice(null), 1800);
                          setActiveMenuMsgId(null);
                        }}
                        className="flex flex-col items-center gap-1 p-1 rounded-lg hover:bg-white/10 transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5 text-slate-200" />
                        <span className="text-[10px] text-slate-300">Copy</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setReplyingTo(msg);
                          setActiveMenuMsgId(null);
                        }}
                        className="flex flex-col items-center gap-1 p-1 rounded-lg hover:bg-white/10 transition-colors"
                      >
                        <Share2 className="w-3.5 h-3.5 text-slate-200" />
                        <span className="text-[10px] text-slate-300">Forward</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setToastNotice('Saved to Favorites ⭐');
                          setTimeout(() => setToastNotice(null), 1800);
                          setActiveMenuMsgId(null);
                        }}
                        className="flex flex-col items-center gap-1 p-1 rounded-lg hover:bg-white/10 transition-colors"
                      >
                        <Star className="w-3.5 h-3.5 text-amber-300" />
                        <span className="text-[10px] text-slate-300">Favorite</span>
                      </button>
                      {isUser ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (activeChatId) deleteMessage(activeChatId, msg.id);
                            setActiveMenuMsgId(null);
                          }}
                          className="flex flex-col items-center gap-1 p-1 rounded-lg hover:bg-rose-500/20 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-300" />
                          <span className="text-[10px] text-rose-300">Delete</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setReplyingTo(msg);
                            setActiveMenuMsgId(null);
                          }}
                          className="flex flex-col items-center gap-1 p-1 rounded-lg hover:bg-white/10 transition-colors"
                        >
                          <Reply className="w-3.5 h-3.5 text-slate-200" />
                          <span className="text-[10px] text-slate-300">Reply</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setToastNotice('Message Selected');
                          setTimeout(() => setToastNotice(null), 1800);
                          setActiveMenuMsgId(null);
                        }}
                        className="flex flex-col items-center gap-1 p-1 rounded-lg hover:bg-white/10 transition-colors"
                      >
                        <CheckSquare className="w-3.5 h-3.5 text-slate-200" />
                        <span className="text-[10px] text-slate-300">Select</span>
                      </button>
                    </div>

                    {/* Row 2: Reminder, Read, Translate, Search */}
                    <div className="grid grid-cols-4 gap-1 text-center pt-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setToastNotice('Reminder set for 1 hour');
                          setTimeout(() => setToastNotice(null), 1800);
                          setActiveMenuMsgId(null);
                        }}
                        className="flex flex-col items-center gap-1 p-1 rounded-lg hover:bg-white/10 transition-colors"
                      >
                        <Bell className="w-3.5 h-3.5 text-slate-200" />
                        <span className="text-[10px] text-slate-300">Reminder</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (msg.text && 'speechSynthesis' in window) {
                            window.speechSynthesis.cancel();
                            const u = new SpeechSynthesisUtterance(msg.text);
                            window.speechSynthesis.speak(u);
                          }
                          setActiveMenuMsgId(null);
                        }}
                        className="flex flex-col items-center gap-1 p-1 rounded-lg hover:bg-white/10 transition-colors"
                      >
                        <Volume2 className="w-3.5 h-3.5 text-slate-200" />
                        <span className="text-[10px] text-slate-300">Read</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          toggleTranslation(msg.id);
                          setActiveMenuMsgId(null);
                        }}
                        className="flex flex-col items-center gap-1 p-1 rounded-lg hover:bg-purple-600/30 transition-colors text-purple-300 font-bold"
                      >
                        <Languages className="w-3.5 h-3.5 text-purple-400" />
                        <span className="text-[10px] text-purple-300">Translate</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setChatSearchQuery(msg.text || '');
                          setShowChatSearch(true);
                          setActiveMenuMsgId(null);
                        }}
                        className="flex flex-col items-center gap-1 p-1 rounded-lg hover:bg-white/10 transition-colors"
                      >
                        <Search className="w-3.5 h-3.5 text-slate-200" />
                        <span className="text-[10px] text-slate-300">Search</span>
                      </button>
                    </div>

                    {/* Speech Pointer Arrow */}
                    <div className={`w-3 h-3 bg-[#242428]/95 dark:bg-[#1a1a1e]/95 border-r border-b border-white/15 transform rotate-45 ${isUser ? 'ml-auto mr-4' : 'ml-4'} -mb-3 mt-0.5`} />
                  </div>
                )}

                {/* Main Speech Bubble */}
                <div
                  onPointerDown={(e) => {
                    // Start long-press timer (420 ms)
                    longPressTimerRef.current = setTimeout(() => {
                      e.stopPropagation();
                      setActiveMenuMsgId(activeMenuMsgId === msg.id ? null : msg.id);
                      longPressTimerRef.current = null;
                    }, 420);
                  }}
                  onPointerUp={() => {
                    if (longPressTimerRef.current) {
                      clearTimeout(longPressTimerRef.current);
                      longPressTimerRef.current = null;
                    }
                  }}
                  onPointerLeave={() => {
                    if (longPressTimerRef.current) {
                      clearTimeout(longPressTimerRef.current);
                      longPressTimerRef.current = null;
                    }
                  }}
                  onContextMenu={(e) => e.preventDefault()}
                  onMouseUp={(e) => {
                    const sel = window.getSelection()?.toString();
                    if (sel && sel.trim().length > 0) {
                      e.stopPropagation();
                      setActiveMenuMsgId(msg.id);
                    }
                  }}
                  className={`rounded-2xl px-3.5 py-2.5 shadow-xs transition-all relative break-words break-all [overflow-wrap:anywhere] min-w-0 cursor-pointer ${
                    isUser
                      ? 'bg-purple-600 dark:bg-purple-600 text-white rounded-tr-xs'
                      : 'bg-white dark:bg-[#2c2c2e] text-slate-900 dark:text-slate-100 rounded-tl-xs border border-slate-200/80 dark:border-white/10'
                  }`}
                >
                  {/* Group sender name (colored per sender) */}
                  {currentChat?.isGroup && !isUser && msg.senderName && (
                    <div className={`text-[11px] font-bold mb-1 ${getSenderColor(msg.senderName)}`}>
                      {msg.senderName}
                    </div>
                  )}

                  {/* Quoted Reply Preview */}
                  {msg.replyTo && (
                    <div className={`mb-2 p-2 rounded-xl border-l-3 text-xs ${
                      isUser
                        ? 'bg-black/15 border-white text-purple-100'
                        : 'bg-black/5 dark:bg-white/10 border-purple-500 text-slate-700 dark:text-slate-300'
                    }`}>
                      <div className="font-bold text-[10px] opacity-90">
                        {msg.replyTo.sender}
                      </div>
                      <div className="truncate text-[11px] opacity-80 break-words break-all [overflow-wrap:anywhere]">
                        {msg.replyTo.text}
                      </div>
                    </div>
                  )}

                  {/* Text Message (with Disappearing 1-Time View support) */}
                  {msg.type === 'text' && (
                    msg.oneTimeView ? (
                      openedOneTimeImages[msg.id] ? (
                        <div className="flex items-center gap-2.5 p-2 rounded-xl bg-black/15 dark:bg-white/5 border border-dashed border-white/25 select-none opacity-80">
                          <div className="w-7 h-7 rounded-full border border-current flex items-center justify-center font-bold text-xs">
                            1
                          </div>
                          <div>
                            <div className="text-xs font-bold">1-Time Message</div>
                            <div className="text-[10px] font-mono italic opacity-75">Opened · Disappeared</div>
                          </div>
                        </div>
                      ) : (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            setLightboxOneTimeText({
                              msgId: msg.id,
                              text: msg.text || '',
                              senderName: isUser ? 'You' : (msg.senderName || currentChat.name),
                            });
                            markOneTimeAsOpened(msg.id);
                          }}
                          className="flex items-center gap-3 p-2.5 rounded-xl bg-black/15 dark:bg-purple-600/15 hover:bg-black/25 border border-purple-300/40 cursor-pointer transition-all group"
                          title="Tap to read 1-time message"
                        >
                          <div className="w-8 h-8 rounded-full border-2 border-dashed border-current flex items-center justify-center font-black text-xs shrink-0 group-hover:scale-105 transition-transform">
                            1
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold flex items-center gap-1.5">
                              <span>1-Time Text Message</span>
                              <Eye className="w-3.5 h-3.5" />
                            </div>
                            <div className="text-[10px] font-mono opacity-80">
                              Tap to read once · Disappears
                            </div>
                          </div>
                        </div>
                      )
                    ) : (
                      <div>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words break-all [overflow-wrap:anywhere] min-w-0 select-text">
                          {msg.text}
                        </p>

                        {/* WeChat-style Translated Sub-Card (Only appears when user highlights/taps Translate) */}
                        {translatedMessages[msg.id] && (
                          <div className={`mt-2 pt-2 border-t select-text text-left animate-in fade-in duration-150 ${
                            isUser
                              ? 'border-white/20 text-purple-100'
                              : 'border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200'
                          }`}>
                            <p className="text-sm font-medium leading-relaxed">
                              {getTranslatedContent(msg)}
                            </p>
                            <div className={`flex items-center gap-1.5 mt-1 text-[10px] font-mono ${
                              isUser ? 'text-purple-200' : 'text-slate-400 dark:text-slate-500'
                            }`}>
                              <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 fill-purple-400/20" />
                              <span>Translated by AfriChat</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  )}

                {/* Image Message (with Click-to-Enlarge Lightbox & Disappearing One-Time View) */}
                {msg.type === 'image' && (
                  msg.oneTimeView ? (
                    openedOneTimeImages[msg.id] ? (
                      /* Disappeared / Already Opened Card */
                      <div className="flex items-center gap-2.5 p-3 rounded-xl bg-black/10 dark:bg-white/5 border border-dashed border-slate-300 dark:border-neutral-700 select-none opacity-75">
                        <div className="w-7 h-7 rounded-full border border-slate-400 dark:border-neutral-500 flex items-center justify-center font-bold text-xs text-slate-400 dark:text-neutral-500">
                          1
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-500 dark:text-neutral-400">Photo</div>
                          <div className="text-[10px] text-slate-400 font-mono italic">Opened · Disappeared</div>
                        </div>
                      </div>
                    ) : (
                      /* Unopened 1-Time View Card */
                      <div
                        onClick={() => {
                          if (msg.imageUrl) {
                            setLightboxImg({
                              url: msg.imageUrl,
                              caption: msg.text,
                              isOneTime: true,
                              msgId: msg.id,
                            });
                            markOneTimeAsOpened(msg.id);
                          }
                        }}
                        className="flex items-center gap-3 p-3 bg-gradient-to-r from-purple-600/15 to-indigo-600/15 hover:from-purple-600/25 hover:to-indigo-600/25 rounded-2xl border border-purple-500/40 cursor-pointer transition-all shadow-xs group"
                        title="Tap to view 1-time photo"
                      >
                        <div className="w-9 h-9 rounded-full border-2 border-dashed border-purple-500 flex items-center justify-center font-black text-sm text-purple-600 dark:text-purple-400 bg-white/20 dark:bg-purple-950/40 group-hover:scale-105 transition-transform">
                          1
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                            <span>1-Time View Photo</span>
                            <Eye className="w-3.5 h-3.5 text-purple-500" />
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-neutral-400 font-mono">
                            Tap to view once · Disappears after closing
                          </div>
                        </div>
                      </div>
                    )
                  ) : (
                    /* Regular Click-to-Enlarge Image */
                    <div className="space-y-1">
                      <div
                        onClick={() => msg.imageUrl && setLightboxImg({ url: msg.imageUrl, caption: msg.text })}
                        className="overflow-hidden rounded-xl cursor-pointer group relative shadow-xs"
                        title="Tap to enlarge"
                      >
                        <img
                          src={msg.imageUrl}
                          alt="Shared media"
                          referrerPolicy="no-referrer"
                          className="w-full max-h-64 object-cover group-hover:scale-102 transition-transform duration-200"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center pointer-events-none">
                          <span className="p-2 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-xs shadow-md">
                            <Maximize2 className="w-4 h-4" />
                          </span>
                        </div>
                      </div>
                      {msg.text && (
                        <p className="text-sm leading-relaxed pt-1">{msg.text}</p>
                      )}
                    </div>
                  )
                )}

                {/* Voice Note Message (with 1-Time Disappearing playback) */}
                {msg.type === 'voice' && msg.voiceNote && (() => {
                  if (msg.oneTimeView && openedOneTimeImages[msg.id]) {
                    return (
                      <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-black/15 dark:bg-white/5 border border-dashed border-white/25 select-none opacity-80 min-w-[200px]">
                        <div className="w-7 h-7 rounded-full border border-current flex items-center justify-center font-bold text-xs">
                          1
                        </div>
                        <div>
                          <div className="text-xs font-bold">1-Time Voice Note</div>
                          <div className="text-[10px] font-mono italic opacity-75">Played · Disappeared</div>
                        </div>
                      </div>
                    );
                  }

                  const vn = msg.voiceNote;
                  const isExpired = Boolean(vn.expiresAt && Date.now() > new Date(vn.expiresAt).getTime());
                  const isRevealed = revealedTranscripts[msg.id];
                  const hasTranscript = vn.transcript && vn.transcript.trim().length > 0;
                  let expiryLabel = '';
                  if (vn.expiresAt) {
                    const msLeft = new Date(vn.expiresAt).getTime() - Date.now();
                    if (isExpired) expiryLabel = 'Expired';
                    else {
                      const hLeft = Math.ceil(msLeft / 3600000);
                      expiryLabel = hLeft <= 1 ? '<1h left' : `${hLeft}h left`;
                    }
                  }
                  return (
                    <div className="space-y-2 min-w-[220px]">
                      {msg.oneTimeView && (
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-200 dark:text-purple-300">
                          <span className="w-4 h-4 rounded-full border border-dashed border-current flex items-center justify-center text-[9px] font-black">1</span>
                          <span>1-Time Voice · Disappears after playing</span>
                        </div>
                      )}
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!isExpired) {
                              toggleVoicePlayback(msg.id, vn.audioDataUrl, vn.transcript, msg.oneTimeView);
                            }
                          }}
                          className={`w-10 h-10 rounded-full text-white flex items-center justify-center shrink-0 transition-colors shadow-xs ${
                            isExpired
                              ? 'bg-slate-400 cursor-not-allowed'
                              : msg.oneTimeView
                              ? 'bg-purple-800 hover:bg-purple-900 ring-2 ring-purple-300/60'
                              : 'bg-indigo-600 hover:bg-indigo-700'
                          }`}
                          aria-label="Play voice note"
                          disabled={isExpired}
                        >
                          {playingVoiceId === msg.id ? (
                            <Pause className="w-4 h-4 fill-current" />
                          ) : (
                            <Play className="w-4 h-4 fill-current ml-0.5" />
                          )}
                        </button>

                        <div className="flex-1">
                          <div className="w-full bg-slate-300 dark:bg-slate-700 h-1 rounded-full overflow-hidden">
                            <div
                              style={{ width: `${voiceProgress[msg.id] || 0}%` }}
                              className="bg-indigo-600 dark:bg-indigo-400 h-full transition-all duration-200"
                            />
                          </div>
                          <div className="flex justify-between items-center text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-mono">
                            <span>0:{vn.durationSeconds < 10 ? `0${vn.durationSeconds}` : vn.durationSeconds}</span>
                            {expiryLabel && (
                              <span className={`text-[9px] font-semibold ${isExpired ? 'text-rose-400' : 'text-slate-400'}`}>
                                🕐 {expiryLabel}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Transcript — hidden on 1-Time voice notes */}
                      {!isExpired && !msg.oneTimeView && (
                        <div className="pt-1 border-t border-black/5 dark:border-white/5">
                          {isRevealed && hasTranscript ? (
                            <div className="text-xs text-slate-600 dark:text-slate-300 italic leading-relaxed">
                              &ldquo;{translatedMessages[msg.id] && vn.translations ? (vn.translations[language] || vn.translations.en || vn.transcript) : vn.transcript}&rdquo;
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setRevealedTranscripts(prev => ({ ...prev, [msg.id]: true }));
                              }}
                              className="text-[10px] font-semibold text-indigo-500 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1 transition-colors"
                            >
                              💬 Transcribe
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
                {/* Product Card Message */}
                {msg.type === 'product_card' && msg.product && (() => {
                  const isEscrowDeal =
                    msg.product.id.startsWith('deal_') ||
                    Boolean(msg.product.tags?.includes('Escrow'));
                  const showProductImage = Boolean(msg.product.imageUrl) && !isEscrowDeal;
                  return (
                    <div className="space-y-2 min-w-[240px]">
                      {showProductImage && (
                        <div className="rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800">
                          <img
                            src={msg.product.imageUrl}
                            alt={msg.product.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-40 object-cover"
                          />
                        </div>
                      )}

                      <div>
                        {isEscrowDeal && (
                          <div className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-0.5">
                            <Lock className="w-3 h-3" />
                            <span>Escrow Deal</span>
                          </div>
                        )}
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {msg.product.title}
                        </h4>
                        <div className="text-sm font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-0.5">
                          {formatPrice(msg.product.price, msg.product.currency)}
                        </div>
                      </div>

                      <button
                        onClick={() => openCheckout(msg.product!)}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>Buy with Escrow</span>
                      </button>
                    </div>
                  );
                })()}

                {/* Meme & Sticker Message */}
                {msg.type === 'meme_sticker' && msg.memeSticker && (
                  <div className="space-y-1.5 min-w-[200px]">
                    <div className="relative rounded-xl overflow-hidden aspect-4/3 bg-black">
                      <img
                        src={msg.memeSticker.imageUrl}
                        alt={msg.memeSticker.title}
                        className="w-full h-full object-cover"
                      />
                      {msg.memeSticker.topText && (
                        <div className="absolute top-1.5 inset-x-1.5 text-center pointer-events-none">
                          <span className="font-black text-sm uppercase text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] px-1">
                            {msg.memeSticker.topText}
                          </span>
                        </div>
                      )}
                      {msg.memeSticker.bottomText && (
                        <div className="absolute bottom-2 inset-x-1.5 text-center pointer-events-none">
                          <span className="font-black text-sm uppercase text-amber-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] px-1">
                            {msg.memeSticker.bottomText}
                          </span>
                        </div>
                      )}
                      <span className="absolute bottom-1 right-1 text-[8px] font-mono text-white/80 bg-black/60 px-1 rounded">
                        {msg.memeSticker.cultureOrigin}
                      </span>
                    </div>
                  </div>
                )}

                {/* Invoice & Receipt Message */}
                {msg.type === 'invoice_receipt' && msg.invoiceData && (
                  <div className="space-y-2 min-w-[250px] p-1">
                    <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-1.5">
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <span className="font-bold text-xs font-mono">{msg.invoiceData.invoiceNumber}</span>
                      </div>
                      <span className="text-[9px] uppercase font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                        Escrow Sealed
                      </span>
                    </div>

                    <div>
                      <div className="font-semibold text-xs text-slate-800 dark:text-slate-100">
                        {msg.invoiceData.sellerBusinessName}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Customer: {msg.invoiceData.buyerName}
                      </div>
                    </div>

                    <div className="bg-black/5 dark:bg-white/5 p-2 rounded-xl text-[11px] space-y-1">
                      {msg.invoiceData.items.map((it) => (
                        <div key={it.id} className="flex justify-between">
                          <span className="truncate">{it.quantity}x {it.description}</span>
                          <span className="font-mono font-semibold">₦{it.total.toLocaleString()}</span>
                        </div>
                      ))}
                      <div className="pt-1 border-t border-black/5 dark:border-white/5 flex justify-between font-bold text-xs">
                        <span>Total Paid:</span>
                        <span className="font-mono text-indigo-600 dark:text-indigo-400">
                          ₦{msg.invoiceData.totalAmount.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setViewingInvoice(msg.invoiceData!)}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>View & Download PDF Receipt</span>
                    </button>
                  </div>
                )}

                {/* Financial Stake Poll Message */}
                {msg.type === 'financial_poll' && msg.financialPoll && (() => {
                  const poll = msg.financialPoll!;
                  const pollCur = poll.currency || 'NGN';
                  const myVoteEntry = poll.votesByUser
                    ? poll.votesByUser[myVoterKey] ||
                      Object.values(poll.votesByUser).find(
                        (v) => samePhone(v.voterKey, myPhoneRaw) || v.voterKey === currentUser.id
                      )
                    : undefined;
                  const myVotedOptionId = myVoteEntry?.optionId ?? (poll.votesByUser ? undefined : poll.userVotedOptionId);
                  const pollErr = pollCardErrors[poll.id];

                  return (
                    <div
                      onPointerDown={(e) => e.stopPropagation()}
                      onMouseUp={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                      className="space-y-2.5 min-w-[260px] p-1 select-none"
                    >
                      <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-1.5 gap-2">
                        <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold text-xs">
                          <Vote className="w-4 h-4 shrink-0" />
                          <span>Group Stake Poll</span>
                        </div>
                        <span className="font-mono tabular-nums text-[11px] text-amber-700 dark:text-amber-300 font-bold">
                          {formatPrice(poll.stakePerVote, pollCur)} / vote
                        </span>
                      </div>

                      <div>
                        <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 leading-snug">
                          {poll.title}
                        </h4>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5 tabular-nums">
                          <span>
                            Pot:{' '}
                            <strong className="font-mono text-emerald-600 dark:text-emerald-400">
                              {formatPrice(poll.totalStakeLocked, pollCur)}
                            </strong>
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{poll.totalVoters} committed</span>
                        </div>
                      </div>

                      {/* Options voting list */}
                      <div className="space-y-1.5">
                        {poll.options.map((opt) => {
                          const isVoted = myVotedOptionId === opt.id;
                          const percentage = poll.totalVoters
                            ? Math.round((opt.votesCount / poll.totalVoters) * 100)
                            : 0;

                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const res = voteOnFinancialPoll(currentChat.id, poll.id, opt.id);
                                if (!res?.success) {
                                  setPollCardErrors((prev) => ({
                                    ...prev,
                                    [poll.id]: {
                                      msg: res?.message || 'Unable to cast vote.',
                                      insufficient: res?.insufficientFunds,
                                    },
                                  }));
                                  return;
                                }
                                setPollCardErrors((prev) => {
                                  const next = { ...prev };
                                  delete next[poll.id];
                                  return next;
                                });
                                if (res.message) {
                                  setToastNotice(res.message);
                                  setTimeout(() => setToastNotice(null), 2600);
                                }
                              }}
                              className={`w-full text-left min-h-[42px] p-2.5 rounded-xl border cursor-pointer relative overflow-hidden transition-all ${
                                isVoted
                                  ? 'border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/60 text-slate-900 dark:text-white'
                                  : 'border-slate-200 dark:border-slate-700 hover:bg-black/5 dark:hover:bg-white/5 text-slate-800 dark:text-slate-100'
                              }`}
                            >
                              <div
                                style={{ width: `${percentage}%` }}
                                className={`absolute inset-y-0 left-0 opacity-15 transition-all duration-200 ${
                                  isVoted ? 'bg-indigo-600' : 'bg-slate-400'
                                }`}
                              />
                              <div className="relative flex items-center justify-between text-xs z-10 gap-2">
                                <span className="font-medium truncate">
                                  {isVoted ? '✓ ' : ''}{opt.text}
                                </span>
                                <span className="font-mono tabular-nums font-bold shrink-0">
                                  {opt.votesCount} ({percentage}%)
                                </span>
                              </div>
                              {opt.voterNames.length > 0 && (
                                <div className="relative text-[10px] text-slate-500 dark:text-slate-400 mt-1 truncate z-10 font-mono">
                                  {opt.voterNames.join(', ')}
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {pollErr && (
                        <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-200 text-[11px] flex items-center justify-between gap-2">
                          <span>{pollErr.msg}</span>
                          {pollErr.insufficient && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsWalletModalOpen(true);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold shrink-0 whitespace-nowrap"
                            >
                              Top Up
                            </button>
                          )}
                        </div>
                      )}

                      <div className="text-[10px] text-slate-500 dark:text-slate-400 text-center font-mono tabular-nums">
                        Voting locks {formatPrice(poll.stakePerVote, pollCur)} in group escrow
                      </div>
                    </div>
                  );
                })()}

                {/* Live Supabase Realtime Multiplayer X/O (Tic-Tac-Toe) Card */}
                {msg.type === 'game_xo' && msg.xoGame && (() => {
                  const game = msg.xoGame!;
                  const gCur = game.currency || 'NGN';
                  const isChallenger =
                    samePhone(myPhoneRaw, game.challengerPhone) ||
                    (Boolean(currentUser.id) && game.challengerId === currentUser.id);
                  const mySymbol: 'X' | 'O' | null = samePhone(myPhoneRaw, game.xPlayerPhone)
                    ? 'X'
                    : samePhone(myPhoneRaw, game.oPlayerPhone)
                    ? 'O'
                    : null;
                  const isMyTurn = game.status === 'active' && Boolean(mySymbol && game.currentTurn === mySymbol);
                  const turnName = game.currentTurn === 'X' ? game.xPlayerName : (game.oPlayerName || 'Player O');
                  const winSet = new Set(game.winningLine || []);
                  const xoErr = xoErrors[game.id];
                  const isBusy = xoBusyId === game.id;
                  const iWon =
                    game.status === 'won' &&
                    (samePhone(myPhoneRaw, game.winnerPhone) || (mySymbol !== null && game.winnerSymbol === mySymbol));

                  return (
                    <div
                      onPointerDown={(e) => e.stopPropagation()}
                      onMouseUp={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                      className="space-y-3 min-w-[260px] max-w-[300px] p-1 select-none"
                    >
                      {/* Match Title & Mode */}
                      <div className="flex items-center justify-between gap-2 pb-2 border-b border-black/10 dark:border-white/10">
                        <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-white">
                          <Gamepad2 className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                          <span>X/O Challenge</span>
                        </div>
                        <span className="font-mono tabular-nums text-[11px] font-bold text-emerald-700 dark:text-emerald-300 whitespace-nowrap">
                          {game.mode === 'bet' ? `${formatPrice(game.betAmount, gCur)} Bet` : 'Friendly'}
                        </span>
                      </div>

                      {/* Players & Bet Breakdown */}
                      <div className="space-y-1 text-[11px]">
                        <div className="flex items-center justify-between text-slate-700 dark:text-slate-200 gap-2">
                          <span className="truncate font-semibold">
                            <span className="font-mono font-black text-indigo-600 dark:text-indigo-400">X</span> {game.xPlayerName}
                          </span>
                          <span className="text-slate-400" aria-hidden="true">vs</span>
                          <span className="truncate font-semibold text-right">
                            {game.oPlayerName || game.opponentName || 'Waiting'}{' '}
                            <span className="font-mono font-black text-amber-600 dark:text-amber-400">O</span>
                          </span>
                        </div>
                        {game.mode === 'bet' && (
                          <div className="flex items-center justify-between text-[10px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                            <span>Pot: {formatPrice(game.totalPot, gCur)} · 1% fee: {formatPrice(game.platformFee, gCur)}</span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                              Win: {formatPrice(game.winnerPayout, gCur)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Interactive 3x3 Board */}
                      <div className="grid grid-cols-3 gap-2 p-2 rounded-2xl bg-slate-100 dark:bg-[#17142b] border border-slate-200 dark:border-white/10">
                        {game.board.map((cell, idx) => {
                          const isWinCell = winSet.has(idx);
                          const canPlayCell =
                            game.status === 'active' &&
                            isMyTurn &&
                            cell === null &&
                            !isBusy;

                          return (
                            <button
                              key={idx}
                              type="button"
                              disabled={!canPlayCell}
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (!canPlayCell) return;
                                setXoBusyId(game.id);
                                setXoErrors((prev) => {
                                  const next = { ...prev };
                                  delete next[game.id];
                                  return next;
                                });
                                try {
                                  const res = await makeXoMove(game, idx);
                                  if (!res.success && res.message) {
                                    setXoErrors((prev) => ({
                                      ...prev,
                                      [game.id]: { msg: res.message! },
                                    }));
                                  }
                                } finally {
                                  setXoBusyId(null);
                                }
                              }}
                              aria-label={`Square ${idx + 1}${cell ? ` ${cell}` : ''}`}
                              className={`min-h-[52px] aspect-square rounded-xl flex items-center justify-center font-display font-black text-2xl transition-all duration-150 ${
                                isWinCell
                                  ? 'bg-emerald-500/20 border-2 border-emerald-500 text-emerald-600 dark:text-emerald-300 scale-[1.02]'
                                  : cell !== null
                                  ? 'bg-white dark:bg-[#231f3d] border border-slate-200 dark:border-white/10'
                                  : canPlayCell
                                  ? 'bg-white dark:bg-[#231f3d] border border-slate-200 dark:border-white/15 hover:border-purple-500 active:scale-95 cursor-pointer'
                                  : 'bg-white/60 dark:bg-[#1e1a33] border border-slate-200/70 dark:border-white/5 cursor-default'
                              }`}
                            >
                              {cell === 'X' ? (
                                <span className={isWinCell ? 'text-emerald-600 dark:text-emerald-300' : 'text-indigo-600 dark:text-indigo-400'}>
                                  X
                                </span>
                              ) : cell === 'O' ? (
                                <span className={isWinCell ? 'text-emerald-600 dark:text-emerald-300' : 'text-amber-600 dark:text-amber-400'}>
                                  O
                                </span>
                              ) : null}
                            </button>
                          );
                        })}
                      </div>

                      {/* Turn / Pending / Result Controls */}
                      {game.status === 'pending' && (
                        isChallenger ? (
                          <div className="flex items-center justify-between gap-2 pt-0.5">
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">
                              Waiting for opponent to accept...
                            </span>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={async (e) => {
                                e.stopPropagation();
                                setXoBusyId(game.id);
                                try {
                                  await declineXoChallenge(game);
                                } finally {
                                  setXoBusyId(null);
                                }
                              }}
                              className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-600 dark:text-rose-300 text-[11px] font-semibold whitespace-nowrap"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-2 pt-0.5">
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={async (e) => {
                                e.stopPropagation();
                                setXoBusyId(game.id);
                                try {
                                  await declineXoChallenge(game);
                                } finally {
                                  setXoBusyId(null);
                                }
                              }}
                              className="py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-700 dark:text-slate-200 text-xs font-semibold whitespace-nowrap"
                            >
                              Decline
                            </button>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={async (e) => {
                                e.stopPropagation();
                                setXoBusyId(game.id);
                                setXoErrors((prev) => {
                                  const next = { ...prev };
                                  delete next[game.id];
                                  return next;
                                });
                                try {
                                  const res = await acceptXoChallenge(game);
                                  if (!res.success) {
                                    setXoErrors((prev) => ({
                                      ...prev,
                                      [game.id]: {
                                        msg: res.message || 'Could not join game.',
                                        insufficient: res.insufficientFunds,
                                      },
                                    }));
                                  }
                                } finally {
                                  setXoBusyId(null);
                                }
                              }}
                              className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold whitespace-nowrap"
                            >
                              {isBusy
                                ? 'Joining...'
                                : game.mode === 'bet'
                                ? `Accept (${formatPrice(game.betAmount, gCur)})`
                                : 'Accept & Play'}
                            </button>
                          </div>
                        )
                      )}

                      {game.status === 'active' && (
                        <div className={`px-3 py-2 rounded-xl text-[11px] font-semibold flex items-center justify-between gap-2 ${
                          isMyTurn
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                            : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300'
                        }`}>
                          <span>
                            {isMyTurn
                              ? `Your turn (${mySymbol}) · Tap any open square`
                              : `${turnName}'s turn (${game.currentTurn})`}
                          </span>
                        </div>
                      )}

                      {(game.status === 'won' || game.status === 'draw' || game.status === 'declined' || game.status === 'cancelled') && (
                        <div className="space-y-2">
                          <div className={`p-2.5 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 ${
                            game.status === 'won'
                              ? iWon
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                                : 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30'
                              : 'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200'
                          }`}>
                            <div className="flex items-center gap-1.5 min-w-0">
                              <Trophy className="w-4 h-4 shrink-0 text-amber-500" />
                              <span className="truncate">
                                {game.status === 'won'
                                  ? `${game.winnerName || 'Winner'} won (${game.winnerSymbol})`
                                  : game.status === 'draw'
                                  ? 'Match Draw'
                                  : game.status === 'declined'
                                  ? 'Challenge Declined'
                                  : 'Challenge Cancelled'}
                              </span>
                            </div>
                            {game.mode === 'bet' && (
                              <span className="font-mono tabular-nums text-[10px] shrink-0">
                                {game.status === 'won'
                                  ? `${formatPrice(game.winnerPayout, gCur)} paid`
                                  : 'Refunded'}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsGameXoModalOpen(true);
                            }}
                            className="w-full py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-colors"
                          >
                            Play Again
                          </button>
                        </div>
                      )}

                      {xoErr && (
                        <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-200 text-[11px] flex items-center justify-between gap-2">
                          <span>{xoErr.msg}</span>
                          {xoErr.insufficient && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsWalletModalOpen(true);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold shrink-0 whitespace-nowrap"
                            >
                              Top Up
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Ajo / Esusu Update Message */}
                {msg.type === 'ajo_update' && msg.ajoGroup && (
                  <div className="space-y-2 min-w-[250px] p-1">
                    <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-1.5">
                      <div className="flex items-center gap-1.5 text-amber-500 font-bold text-xs">
                        <Coins className="w-4 h-4" />
                        <span>Ajo / Esusu Cycle Active</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full">
                        Round {msg.ajoGroup.currentRound}/{msg.ajoGroup.totalRounds}
                      </span>
                    </div>

                    <div>
                      <div className="font-bold text-xs text-slate-900 dark:text-slate-100">
                        {msg.ajoGroup.name}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Pot: <strong className="font-mono text-emerald-600 text-xs">₦{msg.ajoGroup.totalPoolPerRound.toLocaleString()}</strong> · Next Payout: {msg.ajoGroup.nextPayoutDate}
                      </div>
                    </div>

                    <div className="p-2 bg-black/5 dark:bg-white/5 rounded-xl text-[11px] flex items-center justify-between">
                      <span>Beneficiary this round:</span>
                      <strong className="text-indigo-600 dark:text-indigo-400">{msg.ajoGroup.currentRecipientName}</strong>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveAjoGroup(msg.ajoGroup!);
                        setIsAjoModalOpen(true);
                      }}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                    >
                      <Coins className="w-3.5 h-3.5" />
                      <span>Open Ajo Ledger & Pay Contribution</span>
                    </button>
                  </div>
                )}

                {/* Scam Warning Message */}
                {msg.type === 'scam_warning' && msg.scamEntity && (
                  <div className="space-y-2 min-w-[260px] p-2 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-900 rounded-xl text-rose-900 dark:text-rose-200">
                    <div className="flex items-center gap-2 font-bold text-xs text-rose-600 dark:text-rose-400">
                      <AlertTriangle className="w-4 h-4 shrink-0 animate-bounce" />
                      <span>CROWDSOURCED SCAM WARNING!</span>
                    </div>
                    <p className="text-xs leading-relaxed">
                      {msg.text}
                    </p>
                    <div className="flex items-center justify-between text-[10px] font-mono font-semibold pt-1 border-t border-rose-200 dark:border-rose-900">
                      <span>{msg.scamEntity.reportsCount} Community Flags</span>
                      <button
                        type="button"
                        onClick={() => {
                          checkEntityReputation(msg.scamEntity!.targetValue);
                          setIsScamCheckerModalOpen(true);
                        }}
                        className="underline text-rose-700 dark:text-rose-300"
                      >
                        Inspect Evidence
                      </button>
                    </div>
                  </div>
                )}

                {/* Shared Pin Location Preview Card */}
                {msg.type === 'location' && (msg.locationData || msg.metadata?.latitude != null) && (
                  <LocationMessageBubble msg={msg} isUser={isUser} />
                )}

                {/* Reaction Badges */}
                {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                  <div className="flex gap-1 flex-wrap mt-1">
                    {Object.entries(msg.reactions).map(([emoji, users]) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => activeChatId && reactToMessage(activeChatId, msg.id, emoji)}
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-[11px] shadow-xs hover:scale-110 transition-transform cursor-pointer"
                        title={users.join(', ')}
                      >
                        <span>{emoji}</span>
                        {users.length > 1 && (
                          <span className="text-[9px] font-bold text-slate-500">{users.length}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {/* Timestamp & Delivery Ticks */}
                <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] font-mono ${
                  isUser ? 'text-purple-200' : 'text-slate-400 dark:text-slate-500'
                }`}>
                  <span>{msg.timestamp}</span>
                  {isUser && (
                    <span title={msg.status === 'read' ? 'Read' : msg.status === 'delivered' ? 'Delivered' : 'Sent'}>
                      {msg.status === 'read' ? (
                        <CheckCheck className="w-3.5 h-3.5 text-white" />
                      ) : msg.status === 'delivered' ? (
                        <CheckCheck className="w-3.5 h-3.5 text-purple-200/80" />
                      ) : (
                        <Check className="w-3.5 h-3.5 text-purple-200/80" />
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* User Avatar (WeChat style Right) */}
            {isUser && (
              <img
                src={currentUser.avatarUrl || 'https://api.dicebear.com/7.x/thumbs/svg?seed=user'}
                alt={currentUser.fullName || 'You'}
                className="w-9 h-9 rounded-xl object-cover shrink-0 mt-0.5 border border-purple-500/30 shadow-2xs select-none"
              />
            )}
          </div>
          );
        })}
      </div>

      {/* Attachment popover (Cleaned & Role-Gated) */}
      {showAttachMenu && (
        <div className="mx-3 mb-2 p-3 bg-white dark:bg-[#1a172e] rounded-2xl shadow-xl grid grid-cols-4 gap-2 text-center text-xs animate-in slide-in-from-bottom-2 shrink-0 z-20 border border-slate-200 dark:border-slate-800">
          {/* Photos */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
          >
            <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 flex items-center justify-center mb-1">
              <Camera className="w-4 h-4" />
            </div>
            <span className="text-[10px] leading-tight font-bold text-emerald-600 dark:text-emerald-400">Photos</span>
          </button>

          {/* Meme & Sticker Studio */}
          {isFeatureEnabled('memeStudio') && (
            <button
              type="button"
              onClick={() => {
                setShowAttachMenu(false);
                setIsMemeStudioOpen(true);
              }}
              className="flex flex-col items-center p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
            >
              <div className="w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-600 flex items-center justify-center mb-1">
                <Smile className="w-4 h-4" />
              </div>
              <span className="text-[10px] leading-tight">Meme Studio</span>
            </button>
          )}

          {/* Invoice PDF (Only for Active Store Owners) */}
          {isFeatureEnabled('wallet') && hasActiveStore && (
            <button
              type="button"
              onClick={() => {
                setShowAttachMenu(false);
                setIsInvoiceGeneratorOpen(true);
              }}
              className="flex flex-col items-center p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
            >
              <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 flex items-center justify-center mb-1">
                <FileText className="w-4 h-4" />
              </div>
              <span className="text-[10px] leading-tight">Invoice PDF</span>
            </button>
          )}

          {/* Financial Stake Poll (Strictly Group Chats Only) */}
          {isFeatureEnabled('wallet') && isGroupChat && (
            <button
              type="button"
              onClick={() => {
                setShowAttachMenu(false);
                setIsFinancialPollModalOpen(true);
              }}
              className="flex flex-col items-center p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
            >
              <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 flex items-center justify-center mb-1">
                <Vote className="w-4 h-4" />
              </div>
              <span className="text-[10px] leading-tight">Stake Poll</span>
            </button>
          )}

          {/* Ajo / Esusu Savings (Strictly Group Admins in Group Chats Only) */}
          {isFeatureEnabled('ajo') && isGroupAdmin && (
            <button
              type="button"
              onClick={() => {
                setShowAttachMenu(false);
                setIsAjoModalOpen(true);
              }}
              className="flex flex-col items-center p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
            >
              <div className="w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-600 flex items-center justify-center mb-1">
                <Coins className="w-4 h-4" />
              </div>
              <span className="text-[10px] leading-tight">Ajo / Esusu</span>
            </button>
          )}

          {/* Scam Checker */}
          {isFeatureEnabled('scamChecker') && (
            <button
              type="button"
              onClick={() => {
                setShowAttachMenu(false);
                const target = currentChat.phoneNumber || currentChat.phone;
                if (target) checkEntityReputation(target);
                setIsScamCheckerModalOpen(true);
              }}
              className="flex flex-col items-center p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
            >
              <div className="w-9 h-9 rounded-full bg-rose-100 dark:bg-rose-900/60 text-rose-600 flex items-center justify-center mb-1">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <span className="text-[10px] leading-tight">Scam Check</span>
            </button>
          )}

          {/* Catalog (Only for Active Store Owners) */}
          {isFeatureEnabled('market') && hasActiveStore && (
            <button
              type="button"
              onClick={() => {
                setShowAttachMenu(false);
                setShowCatalogDrawer(true);
              }}
              className="flex flex-col items-center p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
            >
              <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-1">
                <Store className="w-4 h-4" />
              </div>
              <span className="text-[10px] leading-tight">Catalog</span>
            </button>
          )}

          {/* Escrow Direct Deal */}
          {isFeatureEnabled('escrow') && (
            <button
              type="button"
              onClick={() => {
                setShowAttachMenu(false);
                if (currentChat.catalog && currentChat.catalog[0]) {
                  openCheckout(currentChat.catalog[0]);
                } else {
                  setEscrowDealTitle('');
                  setEscrowDealAmount('15000');
                  setEscrowDealError(null);
                  setShowEscrowDealModal(true);
                }
              }}
              className="flex flex-col items-center p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
            >
              <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 flex items-center justify-center mb-1">
                <Lock className="w-4 h-4" />
              </div>
              <span className="text-[10px] leading-tight">Escrow Deal</span>
            </button>
          )}

          {/* Send Game: Live Supabase X/O */}
          {!currentChat.isChannel && (
            <button
              type="button"
              onClick={() => {
                setShowAttachMenu(false);
                setIsGameXoModalOpen(true);
              }}
              className="flex flex-col items-center p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
            >
              <div className="w-9 h-9 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-600 dark:text-purple-300 flex items-center justify-center mb-1">
                <Gamepad2 className="w-4 h-4" />
              </div>
              <span className="text-[10px] leading-tight">Send Game</span>
            </button>
          )}

          {/* Share Pin Location */}
          <button
            type="button"
            onClick={() => {
              setShowAttachMenu(false);
              setIsShareLocationModalOpen(true);
            }}
            className="flex flex-col items-center p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
          >
            <div className="w-9 h-9 rounded-full bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-1">
              <MapPin className="w-4 h-4" />
            </div>
            <span className="text-[10px] leading-tight">Location Pin</span>
          </button>
        </div>
      )}

      {/* Emojis, Memes & Custom GIFs Drawer */}
      <EmojiMemeDrawer />

      {/* Toast Notice */}
      {toastNotice && (
        <div className="mx-4 mb-2 p-2 bg-slate-900 text-white text-xs rounded-xl text-center shadow-lg animate-in fade-in shrink-0">
          {toastNotice}
        </div>
      )}

      {/* Hidden file input for Photo Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageFileChange}
        accept="image/*"
        className="hidden"
      />

      {/* Replying Banner */}
      {replyingTo && (
        <div className="mx-3 mb-1 p-2.5 bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-900/60 rounded-2xl flex items-center justify-between text-xs animate-in slide-in-from-bottom-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-1 h-8 bg-purple-600 rounded-full shrink-0" />
            <div className="min-w-0">
              <div className="font-bold text-purple-700 dark:text-purple-300 text-[11px]">
                Replying to {replyingTo.sender === 'user' ? 'yourself' : (currentChat?.name || 'Friend')}
              </div>
              <div className="text-slate-600 dark:text-slate-400 truncate text-[11px]">
                {replyingTo.text || (replyingTo.imageUrl ? '📷 Photo' : 'Voice message')}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setReplyingTo(null)}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Input Bar / Channel Read-only Banner */}
      {isChannelMember ? (
        <div className="px-4 py-3 bg-slate-100 dark:bg-neutral-900 shrink-0 flex items-center justify-center border-t border-slate-200 dark:border-neutral-800">
          <span className="text-xs text-slate-400 dark:text-slate-500">🔇 Only admins can post in this channel</span>
        </div>
      ) : (
      <div className="px-2 py-2 bg-transparent shrink-0 flex items-center gap-1.5 z-20">
        <div className={`flex-1 flex items-center bg-slate-100 dark:bg-neutral-900 rounded-full px-3 py-1.5 shadow-2xs border transition-colors ${
          isOneTimeViewEnabled
            ? 'border-purple-500 ring-2 ring-purple-500/30'
            : 'border-slate-200/60 dark:border-neutral-800'
        }`}>
          <button
            type="button"
            onClick={() => setIsEmojiMemeDrawerOpen(!isEmojiMemeDrawerOpen)}
            className={`p-1 transition-colors ${
              isEmojiMemeDrawerOpen
                ? 'text-purple-600 dark:text-purple-400'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
            title="African Emojis, Memes & Stickers"
          >
            <Smile className="w-5 h-5" />
          </button>

          <input
            type="text"
            value={inputText}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={isOneTimeViewEnabled ? '1-Time message · disappears' : 'Message'}
            className="flex-1 min-w-0 px-2 py-1 bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
          />

          <button
            type="button"
            onClick={() => {
              const next = !isOneTimeViewEnabled;
              setIsOneTimeViewEnabled(next);
              setToastNotice(next ? '1-Time ON: next text, photo, or voice disappears after view' : '1-Time mode off');
              setTimeout(() => setToastNotice(null), 2400);
            }}
            title={isOneTimeViewEnabled ? '1-Time Disappearing Mode ON (tap to turn off)' : 'Tap for 1-Time Disappearing text, photo, or voice'}
            aria-label="Toggle 1-Time Disappearing Message"
            className={`w-7 h-7 rounded-full border-2 border-dashed flex items-center justify-center font-black text-[11px] shrink-0 mr-1 transition-all cursor-pointer ${
              isOneTimeViewEnabled
                ? 'bg-purple-600 border-white text-white shadow-md shadow-purple-600/40 scale-105'
                : 'border-slate-400 dark:border-slate-500 text-slate-400 hover:text-purple-500 hover:border-purple-400'
            }`}
          >
            1
          </button>

          <button
            type="button"
            onClick={() => setShowAttachMenu(!showAttachMenu)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
            aria-label="Attachments"
          >
            <Paperclip className="w-5 h-5" />
          </button>
        </div>

        {inputText.trim() || !isFeatureEnabled('voiceNotes') ? (
          <button
            onClick={handleSend}
            disabled={!inputText.trim()}
            className="w-11 h-11 rounded-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white flex items-center justify-center shadow-md shadow-purple-600/30 transition-colors shrink-0"
            aria-label="Send"
          >
            <Send className="w-5 h-5 ml-0.5" />
          </button>
        ) : (
          <button
            onClick={onOpenVoiceRecorder}
            className="w-11 h-11 rounded-full bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center shadow-md shadow-purple-600/30 transition-colors shrink-0"
            aria-label="Record voice note"
          >
            <Mic className="w-5 h-5" />
          </button>
        )}
      </div>

      )}

      {/* Display & Chat Wallpaper Modal */}
      <DisplayWallpaperModal
        isOpen={isDisplayModalOpen}
        onClose={() => setIsDisplayModalOpen(false)}
      />

      {/* Group Info Modal (WhatsApp-style) */}
      {currentChat?.isGroup && (
        <GroupInfoModal
          isOpen={isGroupInfoOpen}
          onClose={() => setIsGroupInfoOpen(false)}
          chat={currentChat}
        />
      )}

      {/* AGC Contact Info Profile Modal */}
      <ContactProfileModal
        chat={currentChat}
        isOpen={isContactProfileOpen}
        onClose={() => setIsContactProfileOpen(false)}
        onOpenThemeModal={() => setIsDisplayModalOpen(true)}
      />

      {/* Fullscreen Lightbox Modal (Click to Enlarge / Disappearing Photo Viewer) */}
      {lightboxImg && (
        <div
          className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-md flex flex-col justify-between p-4 animate-in fade-in select-none text-white"
          onClick={() => setLightboxImg(null)}
        >
          {/* Top Bar */}
          <div
            className="flex items-center justify-between z-10 px-2"
            style={{ paddingTop: 'max(calc(env(safe-area-inset-top, 0px) + 8px), 14px)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              {lightboxImg.isOneTime && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-600 text-white text-xs font-bold shadow-lg shadow-purple-600/40">
                  <span className="w-4 h-4 rounded-full border border-white flex items-center justify-center text-[10px] font-bold">1</span>
                  <span>1-Time View · Disappears after closing</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              {!lightboxImg.isOneTime && (
                <a
                  href={lightboxImg.url}
                  download="agc-image.jpg"
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                  title="Download photo"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Download className="w-5 h-5" />
                </a>
              )}
              <button
                type="button"
                onClick={() => setLightboxImg(null)}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Center Enlarged Image */}
          <div
            className="flex-1 flex items-center justify-center p-2 relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightboxImg.url}
              alt={lightboxImg.caption || 'Enlarged photo'}
              className="max-h-[82vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl animate-in zoom-in-95 duration-200"
            />
          </div>

          {/* Bottom Caption */}
          {lightboxImg.caption && (
            <div
              className="max-w-md mx-auto px-4 py-2.5 bg-black/75 backdrop-blur-md text-white rounded-2xl text-center text-sm border border-white/10 mb-2"
              onClick={(e) => e.stopPropagation()}
            >
              {lightboxImg.caption}
            </div>
          )}
        </div>
      )}

      {/* In-App Confirmation Modal for Clear Chat / Delete Group */}
      {confirmChatAction && (
        <div
          className="fixed inset-0 z-[180] bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setConfirmChatAction(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-white dark:bg-[#17122c] border border-slate-200 dark:border-purple-900/40 rounded-3xl p-5 shadow-2xl space-y-4 text-slate-900 dark:text-white"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/15 text-rose-500 flex items-center justify-center shrink-0">
                {confirmChatAction === 'delete' ? <Trash2 className="w-5 h-5" /> : <Eraser className="w-5 h-5" />}
              </div>
              <div>
                <h4 className="font-bold text-sm">
                  {confirmChatAction === 'delete'
                    ? `Delete ${currentChat.isChannel ? 'Channel' : 'Group'}?`
                    : 'Clear Chat History?'}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {confirmChatAction === 'delete'
                    ? `"${currentChat.name}" and its messages will be removed.`
                    : `All messages in "${currentChat.name}" will be cleared from this device.`}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setConfirmChatAction(null)}
                className="py-2.5 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const act = confirmChatAction;
                  setConfirmChatAction(null);
                  if (act === 'clear') clearChat(currentChat.id);
                  else if (act === 'delete') deleteChat(currentChat.id);
                }}
                className="py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors"
              >
                {confirmChatAction === 'delete' ? 'Delete' : 'Clear History'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* One-Time Disappearing Text Message Viewer Modal */}
      {lightboxOneTimeText && (
        <div
          className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-md flex flex-col justify-between p-5 animate-in fade-in select-none text-white"
          onClick={() => setLightboxOneTimeText(null)}
        >
          <div
            className="flex items-center justify-between"
            style={{ paddingTop: 'max(calc(env(safe-area-inset-top, 0px) + 8px), 14px)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-600 text-white text-xs font-bold shadow-lg shadow-purple-600/40">
              <span className="w-4 h-4 rounded-full border border-dashed border-white flex items-center justify-center text-[10px] font-bold">1</span>
              <span>1-Time Message · Disappears after closing</span>
            </span>
            <button
              type="button"
              onClick={() => setLightboxOneTimeText(null)}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div
            className="flex-1 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full max-w-sm p-6 rounded-3xl bg-[#181330] border border-purple-500/40 shadow-2xl space-y-3 text-center">
              <div className="text-[11px] font-mono uppercase tracking-wider text-purple-300">
                From {lightboxOneTimeText.senderName}
              </div>
              <p className="text-base font-medium leading-relaxed text-white whitespace-pre-wrap break-words">
                {lightboxOneTimeText.text}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setLightboxOneTimeText(null)}
            className="w-full max-w-sm mx-auto py-3 rounded-2xl bg-purple-600 hover:bg-purple-700 text-xs font-bold"
          >
            Close &amp; Disappear
          </button>
        </div>
      )}

      {/* Custom In-Chat Escrow Deal Modal */}
      {showEscrowDealModal && (
        <div
          className="fixed inset-0 z-[180] bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in"
          onClick={() => setShowEscrowDealModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-white dark:bg-[#17122c] border border-slate-200 dark:border-purple-900/40 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl space-y-4 text-slate-900 dark:text-white"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm">Create Escrow Deal</h4>
                  <p className="text-[10px] text-slate-400">Protected buyer/seller transaction with PIN release</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEscrowDealModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {escrowDealError && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-medium">
                {escrowDealError}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Item or Service Description
                </label>
                <input
                  type="text"
                  value={escrowDealTitle}
                  onChange={(e) => setEscrowDealTitle(e.target.value)}
                  placeholder="e.g. iPhone 14 Pro / 6 Yards Ankara / Design Milestone"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Agreed Amount ({currency})
                </label>
                <input
                  type="number"
                  min={100}
                  value={escrowDealAmount}
                  onChange={(e) => setEscrowDealAmount(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  const amt = Number(escrowDealAmount);
                  if (!escrowDealTitle.trim() || !amt || amt <= 0) {
                    setEscrowDealError('Enter item description and valid amount.');
                    return;
                  }
                  const dealProd: Product = {
                    id: `deal_${Date.now()}`,
                    sellerId: currentChat.id,
                    sellerName: currentUser.fullName || 'AGC User',
                    title: escrowDealTitle.trim(),
                    description: `Escrow-protected deal with ${currentChat.name}`,
                    price: amt,
                    currency,
                    imageUrl: '',
                    category: 'fashion',
                    inStock: true,
                    stockCount: 1,
                    location: 'AGC Direct Escrow',
                    condition: 'Brand New',
                    tags: ['Escrow'],
                  };
                  if (activeChatId) sendProductCard(activeChatId, dealProd, true);
                  setShowEscrowDealModal(false);
                }}
                className="py-2.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-colors"
              >
                Send Deal Card
              </button>
              <button
                type="button"
                onClick={() => {
                  const amt = Number(escrowDealAmount);
                  if (!escrowDealTitle.trim() || !amt || amt <= 0) {
                    setEscrowDealError('Enter item description and valid amount.');
                    return;
                  }
                  const dealProd: Product = {
                    id: `deal_${Date.now()}`,
                    sellerId: currentChat.id,
                    sellerName: currentChat.name,
                    title: escrowDealTitle.trim(),
                    description: `Direct Escrow payment to ${currentChat.name}`,
                    price: amt,
                    currency,
                    imageUrl: '',
                    category: 'fashion',
                    inStock: true,
                    stockCount: 1,
                    location: 'AGC Direct Escrow',
                    condition: 'Brand New',
                    tags: ['Escrow'],
                  };
                  setShowEscrowDealModal(false);
                  openCheckout(dealProd);
                }}
                className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors"
              >
                Pay Now (Escrow)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
