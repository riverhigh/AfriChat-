import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { playSwooshSound, playAnimalSound, getNotificationSound } from '../utils/soundUtils';
import { getUnresolvedEscrowBetGames } from '../utils/gameEscrowUtils';
import {
  ArrowLeft,
  Phone,
  Video,
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
  Bot,
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
  ZoomIn,
  ZoomOut,
  RotateCcw,
  CornerUpRight,
  Receipt,
  Grid3X3,
  Layers,
  Dices,
  Pin,
  Ghost,
  Palette,
  BarChart3,
  WifiOff,
  AtSign,
  Flag,
} from 'lucide-react';
import {
  useApp,
  isStatusExpiredClient,
  phonesMatch,
  isUserChatAdmin,
  computeClientMembersCount,
} from '../context/AppContext';
import { ChatMessage, GhostTimerSetting, Product, LanguageCode } from '../types';
import { EmojiMemeDrawer } from './EmojiMemeDrawer';
import { DisplayWallpaperModal } from './DisplayWallpaperModal';
import { ContactProfileModal } from './ContactProfileModal';
import { compressChatMediaImage, compressLowDataMediaImage } from '../utils/imageUtils';
import { getChatThemePreset } from '../utils/chatThemes';
import { exportChatTranscript } from '../utils/chatExport';
import { GroupInfoModal } from './GroupInfoModal';
import { LocationMessageBubble } from './LocationMessageBubble';
import { NineDotsIcon } from './NineDotsIcon';
import { WhotGameCard } from './WhotGameCard';
import { LudoGameCard } from './LudoGameCard';
import { PokerGameCard } from './PokerGameCard';
import { openPaystackPopup } from '../services/paystack';

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
    escrowOrders,
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
    sendXoChallenge,
    sendWhotChallenge,
    sendLudoChallenge,
    sendPokerChallenge,
    acceptXoChallenge,
    declineXoChallenge,
    makeXoMove,
    forfeitXoGame,
    upgradeVerificationBadge,
    setIsWalletModalOpen,
    setIsSendBillModalOpen,
    payBillOnBehalf,
    securitySettings,
    verifyPaymentPinDetailed,
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
    forwardMessage,
    adminUsers,
    deviceContacts,
    lowDataMode,
    globalChatTheme,
    setDisappearingTimer,
    markGhostMessagesViewed,
    pinChatMessage,
    clearChatMentions,
    setIsQuickPollModalOpen,
    voteOnQuickPoll,
  } = useApp();

  const [isDisplayModalOpen, setIsDisplayModalOpen] = useState(false);
  const [isContactProfileOpen, setIsContactProfileOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [toastNotice, setToastNotice] = useState<string | null>(null);
  const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false);
  const [showHeaderActionsMenu, setShowHeaderActionsMenu] = useState(false);
  const [showGhostTimerMenu, setShowGhostTimerMenu] = useState(false);
  const [confirmChatAction, setConfirmChatAction] = useState<'clear' | 'delete' | null>(null);
  const [showChatSearch, setShowChatSearch] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [voiceSpeed, setVoiceSpeed] = useState<1 | 1.5 | 2>(1);
  const [revealedLowDataImages, setRevealedLowDataImages] = useState<Record<string, boolean>>({});
  const [highlightedMsgId, setHighlightedMsgId] = useState<string | null>(null);
  const [ghostClockNow, setGhostClockNow] = useState(() => Date.now());
  const inputRef = useRef<HTMLInputElement>(null);
  const [pollCardErrors, setPollCardErrors] = useState<Record<string, { msg: string; insufficient?: boolean }>>({});
  const [xoBusyId, setXoBusyId] = useState<string | null>(null);
  const [xoErrors, setXoErrors] = useState<Record<string, { msg: string; insufficient?: boolean; requiresVerifiedBadge?: boolean }>>({});
  const [fullModeXoId, setFullModeXoId] = useState<string | null>(null);
  const [xoConfirmForfeitId, setXoConfirmForfeitId] = useState<string | null>(null);

  useEffect(() => {
    if (!fullModeXoId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullModeXoId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullModeXoId]);
  const [billBusyId, setBillBusyId] = useState<string | null>(null);
  const [billErrors, setBillErrors] = useState<Record<string, { msg: string; insufficient?: boolean }>>({});
  const [billPinPromptId, setBillPinPromptId] = useState<string | null>(null);
  const [billPinInput, setBillPinInput] = useState('');
  // Message Forwarding modal state
  const [forwardingMessage, setForwardingMessage] = useState<ChatMessage | null>(null);
  const [forwardSearch, setForwardSearch] = useState('');
  const [selectedForwardTargets, setSelectedForwardTargets] = useState<
    Array<{ key: string; chatId?: string; phone?: string; name: string; avatar?: string; subtitle?: string }>
  >([]);

  // Fullscreen image lightbox + Zoom / Pan / Direct Save state
  const [lightboxImg, setLightboxImg] = useState<{
    url: string;
    caption?: string;
    isOneTime?: boolean;
    msgId?: string;
  } | null>(null);
  const [lightboxZoom, setLightboxZoom] = useState<number>(1);
  const [lightboxPan, setLightboxPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const lightboxLastTapRef = useRef<number>(0);
  const lightboxPinchRef = useRef<{ startDist: number; startZoom: number } | null>(null);
  const lightboxDragRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  useEffect(() => {
    setLightboxZoom(1);
    setLightboxPan({ x: 0, y: 0 });
    lightboxPinchRef.current = null;
    lightboxDragRef.current = null;
  }, [lightboxImg?.url]);

  const clampZoom = (z: number) => Math.min(4, Math.max(1, Number(z.toFixed(2))));

  const handleSaveImageToDevice = async (url: string) => {
    const extMatch = url.match(/^data:image\/([a-zA-Z0-9+.-]+);/);
    const rawExt = extMatch?.[1]?.split('+')[0]?.toLowerCase() || 'jpg';
    const ext = rawExt === 'jpeg' ? 'jpg' : rawExt;
    const filename = `agc-photo-${Date.now()}.${ext}`;

    const triggerBlobDownload = (blob: Blob) => {
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = filename;
      a.rel = 'noopener';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
      setToastNotice('Image saved to device');
      setTimeout(() => setToastNotice(null), 2200);
    };

    try {
      if (url.startsWith('data:')) {
        const [header, base64Data] = url.split(',');
        const mime = header.match(/data:([^;]+)/)?.[1] || 'image/jpeg';
        const byteChars = atob(base64Data || '');
        const byteNumbers = new Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) {
          byteNumbers[i] = byteChars.charCodeAt(i);
        }
        const blob = new Blob([new Uint8Array(byteNumbers)], { type: mime });
        triggerBlobDownload(blob);
        return;
      }

      const res = await fetch(url, { mode: 'cors' });
      if (res.ok) {
        const blob = await res.blob();
        triggerBlobDownload(blob);
        return;
      }
    } catch (_) {}

    // Fallback via canvas for cross-origin images or direct anchor download (never target="_blank")
    try {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('load failed'));
        img.src = url;
      });
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.92)
        );
        if (blob) {
          triggerBlobDownload(blob);
          return;
        }
      }
    } catch (_) {}

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setToastNotice('Image download started');
    setTimeout(() => setToastNotice(null), 2200);
  };

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
      const compressedDataUrl = lowDataMode
        ? await compressLowDataMediaImage(file)
        : await compressChatMediaImage(file);
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

  const currentChat =
    chats.find((c) => c.id === activeChatId) ||
    (activeChatId?.startsWith('dm_')
      ? chats.find((c) => {
          const digits = normPhone(c.phone || (c as any).phoneNumber);
          return Boolean(
            digits &&
              (activeChatId.includes(digits) ||
                (digits.length >= 9 && activeChatId.includes(digits.slice(-9))))
          );
        })
      : undefined);
  const isGroupChat = Boolean(currentChat?.isGroup);
  const isGroupAdmin = Boolean(currentChat?.isGroup && isUserChatAdmin(currentChat, currentUser));
  const isChannelAdmin = Boolean(currentChat?.isChannel && isUserChatAdmin(currentChat, currentUser));
  const isChannelMember = Boolean(currentChat?.isChannel && !isChannelAdmin);

  const myPhoneRaw = currentUser.phoneNumber || currentUser.id || '';
  const myVoterKey = normPhone(myPhoneRaw) || currentUser.id || 'local_user';
  const myQuickPollVoterId = currentUser.id || normPhone(myPhoneRaw) || 'local_user';
  const currentMessages =
    (activeChatId && messages[activeChatId]) ||
    (currentChat?.id && messages[currentChat.id]) ||
    [];
  const activeChatTheme = getChatThemePreset(currentChat?.chatTheme || globalChatTheme);
  const canPinMessages = Boolean(
    currentChat && ((!currentChat.isGroup && !currentChat.isChannel) || isGroupAdmin || isChannelAdmin)
  );
  const hasActiveGhostCountdown = currentMessages.some((m) => Boolean(m.expiresAt));

  useEffect(() => {
    if (!hasActiveGhostCountdown) return;
    setGhostClockNow(Date.now());
    const timer = setInterval(() => setGhostClockNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [hasActiveGhostCountdown]);

  useEffect(() => {
    if (currentChat?.id) {
      markGhostMessagesViewed(currentChat.id);
    }
  }, [currentChat?.id, currentMessages.length, markGhostMessagesViewed]);

  useEffect(() => {
    if (playingVoiceId && audioRefs.current[playingVoiceId]) {
      try {
        audioRefs.current[playingVoiceId].playbackRate = voiceSpeed;
      } catch (_) {}
    }
  }, [voiceSpeed, playingVoiceId]);

  const scrollToMessageById = (targetMsgId: string) => {
    const el = document.getElementById(`msg-${targetMsgId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedMsgId(targetMsgId);
      setTimeout(() => {
        setHighlightedMsgId((cur) => (cur === targetMsgId ? null : cur));
      }, 1800);
    } else {
      setToastNotice('Message is no longer in this chat');
      setTimeout(() => setToastNotice(null), 2000);
    }
  };

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
    setShowHeaderActionsMenu(false);
    setShowGhostTimerMenu(false);
    return () => {
      Object.values(audioRefs.current).forEach((a) => {
        try { a.pause(); a.currentTime = 0; } catch (_) {}
      });
      audioRefs.current = {};
      Object.values(voiceObjectUrlsRef.current).forEach((u) => {
        try { URL.revokeObjectURL(u); } catch (_) {}
      });
      voiceObjectUrlsRef.current = {};
      if (voiceFallbackTimerRef.current) {
        clearInterval(voiceFallbackTimerRef.current);
        voiceFallbackTimerRef.current = null;
      }
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
    playSwooshSound();
    setInputText('');
    setReplyingTo(null);
    if (isOneTimeViewEnabled) setIsOneTimeViewEnabled(false);
  };

  // Real audio playback ref map (msgId -> HTMLAudioElement) + Blob URLs for reliable cross-browser playback
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});
  const voiceObjectUrlsRef = useRef<Record<string, string>>({});
  const voiceFallbackTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const dataUrlToPlayableUrl = (msgId: string, rawUrl: string): string => {
    if (!rawUrl.startsWith('data:')) return rawUrl;
    if (voiceObjectUrlsRef.current[msgId]) return voiceObjectUrlsRef.current[msgId];
    try {
      const commaIdx = rawUrl.indexOf(',');
      if (commaIdx === -1) return rawUrl;
      const meta = rawUrl.slice(0, commaIdx);
      const base64 = rawUrl.slice(commaIdx + 1);
      const mime = meta.match(/data:([^;]+)/)?.[1] || 'audio/webm';
      const bin = atob(base64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) {
        bytes[i] = bin.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: mime });
      const objUrl = URL.createObjectURL(blob);
      voiceObjectUrlsRef.current[msgId] = objUrl;
      return objUrl;
    } catch (_) {
      return rawUrl;
    }
  };

  const stopAllVoicePlayback = (exceptMsgId?: string) => {
    Object.entries(audioRefs.current).forEach(([id, a]) => {
      if (id !== exceptMsgId && !a.paused) {
        try { a.pause(); a.currentTime = 0; } catch (_) {}
      }
    });
    if (voiceFallbackTimerRef.current) {
      clearInterval(voiceFallbackTimerRef.current);
      voiceFallbackTimerRef.current = null;
    }
  };

  const playVoiceFallback = (
    msgId: string,
    transcriptText?: string,
    isOneTime?: boolean,
    durationSeconds?: number
  ) => {
    const cleanText = transcriptText?.trim() || '';
    if (cleanText && typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(cleanText);
        utter.rate = voiceSpeed;
        let settled = false;
        utter.onstart = () => {
          setPlayingVoiceId(msgId);
          setVoiceProgress((prev) => ({ ...prev, [msgId]: 35 }));
        };
        utter.onend = () => {
          if (settled) return;
          settled = true;
          setPlayingVoiceId(null);
          setVoiceProgress((prev) => ({ ...prev, [msgId]: 0 }));
          if (isOneTime) markOneTimeAsOpened(msgId);
        };
        utter.onerror = () => {
          if (settled) return;
          settled = true;
          setPlayingVoiceId(null);
          setVoiceProgress((prev) => ({ ...prev, [msgId]: 0 }));
        };
        setPlayingVoiceId(msgId);
        setVoiceProgress((prev) => ({ ...prev, [msgId]: 20 }));
        window.speechSynthesis.speak(utter);
        return;
      } catch (_) {}
    }

    // Visual timer + gentle notice when raw audio stream is missing/unavailable
    const totalMs = Math.max(1200, (durationSeconds || 2) * 1000);
    const startAt = Date.now();
    setPlayingVoiceId(msgId);
    setVoiceProgress((prev) => ({ ...prev, [msgId]: 5 }));
    setToastNotice(cleanText ? 'Playing transcript audio' : 'Audio recording unavailable for this note');
    setTimeout(() => setToastNotice(null), 2200);
    voiceFallbackTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - startAt;
      const pct = Math.min(100, (elapsed / totalMs) * 100);
      setVoiceProgress((prev) => ({ ...prev, [msgId]: pct }));
      if (elapsed >= totalMs) {
        if (voiceFallbackTimerRef.current) {
          clearInterval(voiceFallbackTimerRef.current);
          voiceFallbackTimerRef.current = null;
        }
        setPlayingVoiceId(null);
        setVoiceProgress((prev) => ({ ...prev, [msgId]: 0 }));
        if (isOneTime) markOneTimeAsOpened(msgId);
      }
    }, 100);
  };

  const toggleVoicePlayback = (
    msgId: string,
    audioDataUrl?: string,
    transcriptText?: string,
    isOneTime?: boolean,
    durationSeconds?: number
  ) => {
    stopAllVoicePlayback(msgId);

    const existing = audioRefs.current[msgId];

    // If currently playing this voice note, pause & reset
    if (existing && !existing.paused) {
      existing.pause();
      existing.currentTime = 0;
      setPlayingVoiceId(null);
      setVoiceProgress((prev) => ({ ...prev, [msgId]: 0 }));
      if (isOneTime) markOneTimeAsOpened(msgId);
      return;
    }

    if (playingVoiceId === msgId) {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (voiceFallbackTimerRef.current) {
        clearInterval(voiceFallbackTimerRef.current);
        voiceFallbackTimerRef.current = null;
      }
      setPlayingVoiceId(null);
      setVoiceProgress((prev) => ({ ...prev, [msgId]: 0 }));
      if (isOneTime) markOneTimeAsOpened(msgId);
      return;
    }

    if (existing) {
      try {
        existing.playbackRate = voiceSpeed;
        if (existing.ended || (Number.isFinite(existing.duration) && existing.currentTime >= existing.duration)) {
          existing.currentTime = 0;
        }
        existing.play().then(() => {
          setPlayingVoiceId(msgId);
        }).catch((err) => {
          console.warn('Playback resume notice:', err);
          delete audioRefs.current[msgId];
          playVoiceFallback(msgId, transcriptText, isOneTime, durationSeconds);
        });
        return;
      } catch (_) {
        delete audioRefs.current[msgId];
      }
    }

    if (audioDataUrl && audioDataUrl.trim().length > 10) {
      try {
        const playableSrc = dataUrlToPlayableUrl(msgId, audioDataUrl);
        const audio = new Audio(playableSrc);
        audio.preload = 'auto';
        audio.playbackRate = voiceSpeed;
        audioRefs.current[msgId] = audio;

        const finishAudio = () => {
          setPlayingVoiceId(null);
          setVoiceProgress((prev) => ({ ...prev, [msgId]: 0 }));
          if (isOneTime) markOneTimeAsOpened(msgId);
        };

        audio.onended = finishAudio;
        audio.ontimeupdate = () => {
          // Chrome WebM MediaRecorder blobs often report Infinity duration until ended
          const effectiveDuration =
            Number.isFinite(audio.duration) && audio.duration > 0
              ? audio.duration
              : Math.max(1, durationSeconds || 2);
          const pct = Math.min(100, (audio.currentTime / effectiveDuration) * 100);
          setVoiceProgress((prev) => ({ ...prev, [msgId]: pct }));
        };
        audio.onerror = () => {
          console.warn('Voice note audio format failed to decode');
          delete audioRefs.current[msgId];
          playVoiceFallback(msgId, transcriptText, isOneTime, durationSeconds);
        };

        audio.play().then(() => {
          setPlayingVoiceId(msgId);
        }).catch((err) => {
          console.warn('Audio play notice:', err);
          delete audioRefs.current[msgId];
          playVoiceFallback(msgId, transcriptText, isOneTime, durationSeconds);
        });
        return;
      } catch (e) {
        console.warn('Audio construction error:', e);
        delete audioRefs.current[msgId];
      }
    }

    playVoiceFallback(msgId, transcriptText, isOneTime, durationSeconds);
  };

  const cycleVoiceSpeed = (e: React.MouseEvent) => {
    e.stopPropagation();
    setVoiceSpeed((prev) => (prev === 1 ? 1.5 : prev === 1.5 ? 2 : 1));
  };

  const formatGhostCountdown = (msg: ChatMessage): string => {
    if (msg.expiresAt) {
      const remSec = Math.max(0, Math.ceil((msg.expiresAt - ghostClockNow) / 1000));
      if (remSec < 60) return `${remSec}s`;
      if (remSec < 3600) return `${Math.ceil(remSec / 60)}m`;
      return `${Math.ceil(remSec / 3600)}h`;
    }
    return currentChat.disappearingTimer && currentChat.disappearingTimer !== 'off'
      ? currentChat.disappearingTimer
      : 'Ghost';
  };

  const mentionMatch = inputText.match(/(?:^|\s)@([a-zA-Z0-9_.-]{0,24})$/);
  const mentionQuery = mentionMatch ? mentionMatch[1].toLowerCase() : null;
  const mentionCandidates = (() => {
    const list: Array<{ handle: string; label: string; badge?: string }> = [];
    const seen = new Set<string>();
    const pushCandidate = (rawName: string, badge?: string) => {
      const clean = rawName.trim();
      if (!clean) return;
      const handle = clean.replace(/^@/, '').replace(/\s+/g, '_');
      const key = handle.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      list.push({ handle, label: clean, badge });
    };
    if (currentChat.isGroup || currentChat.isChannel) {
      pushCandidate('everyone', 'Notify all');
    }
    (currentChat.members || []).forEach((m) => pushCandidate(m, 'Member'));
    currentMessages.forEach((m) => {
      if (m.sender === 'other' && m.senderName) pushCandidate(m.senderName);
    });
    if (!currentChat.isGroup && !currentChat.isChannel) {
      pushCandidate(currentChat.name);
    }
    return list;
  })();

  const filteredMentionCandidates =
    mentionQuery !== null
      ? mentionCandidates
          .filter(
            (c) =>
              c.handle.toLowerCase().includes(mentionQuery) ||
              c.label.toLowerCase().includes(mentionQuery)
          )
          .slice(0, 5)
      : [];

  const insertMentionHandle = (handle: string) => {
    setInputText((prev) => prev.replace(/@([a-zA-Z0-9_.-]{0,24})$/, `@${handle} `));
    inputRef.current?.focus();
  };

  const renderTextWithMentions = (text: string, isUserBubble: boolean) => {
    const parts = text.split(/(@[a-zA-Z0-9_.-]{2,32})/g);
    return parts.map((part, idx) => {
      if (/^@[a-zA-Z0-9_.-]{2,32}$/.test(part)) {
        return (
          <span
            key={idx}
            className={
              isUserBubble
                ? 'font-extrabold text-amber-300 underline decoration-amber-300/60 underline-offset-2'
                : 'font-extrabold text-purple-600 dark:text-purple-300 bg-purple-500/15 px-1 rounded'
            }
          >
            {part}
          </span>
        );
      }
      return <React.Fragment key={idx}>{part}</React.Fragment>;
    });
  };

  const feedThemeStyle: React.CSSProperties | undefined =
    activeChatTheme.id !== 'default' && activeChatTheme.backgroundStyle
      ? {
          backgroundImage:
            !lowDataMode && activeChatTheme.patternDataUrl
              ? `${activeChatTheme.patternDataUrl}, ${activeChatTheme.backgroundStyle}`
              : activeChatTheme.backgroundStyle,
          backgroundRepeat:
            !lowDataMode && activeChatTheme.patternDataUrl ? 'repeat, no-repeat' : 'no-repeat',
          backgroundSize:
            !lowDataMode && activeChatTheme.patternDataUrl ? '44px 44px, cover' : 'cover',
        }
      : undefined;

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
            const dmPeerDigits =
              currentChat.id?.startsWith('dm_') && !currentChat.id.includes('self')
                ? currentChat.id.replace('dm_', '').split('_').find((part) => !phonesMatch(part, currentUser?.phoneNumber))
                : undefined;
            const peerPhone = currentChat.phoneNumber || currentChat.phone || dmPeerDigits;
            const contactStatus = statuses.find(
              (s) =>
                !s.isMe &&
                !s.isSponsored &&
                !isStatusExpiredClient(s) &&
                ((peerPhone && s.userPhone && phonesMatch(s.userPhone, peerPhone)) ||
                  s.userId === currentChat.id ||
                  s.userName.toLowerCase().trim() === currentChat.name.toLowerCase().trim())
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
                    <span>
                      {(() => {
                        if (currentChat.isBot || currentChat.id === 'chat_afribot_ai') {
                          return currentChat.name === 'AfriBot AI' ? 'AgcBot' : currentChat.name;
                        }
                        if (!currentChat.isGroup && !currentChat.isChannel) {
                          const dmPeerDigits =
                            currentChat.id?.startsWith('dm_') && !currentChat.id.includes('self')
                              ? currentChat.id.replace('dm_', '').split('_').find((part) => !phonesMatch(part, currentUser?.phoneNumber))
                              : undefined;
                          const peerPhone = currentChat.phoneNumber || currentChat.phone || dmPeerDigits;
                          const matched = peerPhone
                            ? (adminUsers || []).find((u) => u.phoneNumber && phonesMatch(u.phoneNumber, peerPhone))
                            : null;
                          const resolved =
                            (matched?.username && matched.username.trim()) ||
                            (matched?.fullName && matched.fullName !== 'New User' && matched.fullName !== 'AGC User'
                              ? matched.fullName
                              : '');
                          if (resolved) {
                            const isSelf = currentChat.id.includes('self') || phonesMatch(peerPhone, currentUser?.phoneNumber);
                            return isSelf && !resolved.includes('(Message yourself)')
                              ? `${resolved} (Message yourself)`
                              : resolved;
                          }
                        }
                        return currentChat.name;
                      })()}
                    </span>
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
                      if (liveBadge === 'admin') {
                        return (
                          <span
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-gradient-to-r from-rose-500/25 to-violet-600/30 border border-rose-400/60 text-rose-200 text-[9px] font-extrabold shadow-2xs shrink-0"
                            title="Verified Platform Admin"
                          >
                            <ShieldCheck className="w-3 h-3 text-rose-400" />
                            <span>Admin</span>
                          </span>
                        );
                      }
                      return null;
                    })()}
                    {(currentChat.isBot || currentChat.id === 'chat_afribot_ai') && (
                      <span
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-gradient-to-r from-purple-500/25 to-pink-500/25 border border-pink-400/50 text-pink-200 text-[9px] font-extrabold shadow-2xs shrink-0"
                        title="AgcBot AI Assistant (Groq)"
                      >
                        <Bot className="w-3 h-3 text-pink-400" />
                        <span>BOT</span>
                      </span>
                    )}
                    {(currentChat.isGroup || currentChat.isChannel) && (() => {
                      const badgeCount = Math.max(
                        currentChat.membersCount || 1,
                        computeClientMembersCount(currentChat.members, currentChat.memberPhones)
                      );
                      return (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsGroupInfoOpen(true);
                          }}
                          className="text-[10px] font-mono bg-white/15 hover:bg-white/25 px-1.5 py-0.2 rounded font-normal transition-colors"
                          title={currentChat.isChannel ? 'Channel info' : 'Group info'}
                        >
                          {badgeCount}{' '}
                          {currentChat.isChannel
                            ? badgeCount === 1
                              ? 'subscriber'
                              : 'subscribers'
                            : badgeCount === 1
                            ? 'member'
                            : 'members'}
                        </button>
                      );
                    })()}
                    {currentChat.disappearingTimer && currentChat.disappearingTimer !== 'off' && (
                      <span
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-purple-500/30 border border-purple-300/40 text-purple-100 text-[9px] font-mono font-bold shrink-0"
                        title={`Ghost messages auto-destruct after ${currentChat.disappearingTimer}`}
                      >
                        👻 {currentChat.disappearingTimer}
                      </span>
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
                        return <span className="text-pink-300 font-medium">✓¨ new story update</span>;
                      }
                      if (currentChat.isBot || currentChat.id === 'chat_afribot_ai') {
                        return (
                          <span className="text-pink-300 font-medium flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-pulse" />
                            <span>Online · Groq AI Assistant</span>
                          </span>
                        );
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
                        const hasBot =
                          currentChat.members?.includes('AgcBot') ||
                          currentChat.admins?.includes('AgcBot') ||
                          currentChat.members?.includes('AfriBot AI') ||
                          currentChat.admins?.includes('AfriBot AI');
                        if (hasBot) {
                          return (
                            <span className="text-purple-300/90 font-medium flex items-center gap-1">
                              <Bot className="w-3 h-3 text-pink-400" />
                              <span>AgcBot Admin active (type @AgcBot or @bot to ask)</span>
                            </span>
                          );
                        }
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
              <NineDotsIcon className="w-5 h-5" />
            </button>

            {showHeaderActionsMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => {
                    setShowHeaderActionsMenu(false);
                    setShowGhostTimerMenu(false);
                  }}
                />
                <div className="absolute right-0 mt-2 w-60 max-h-[75vh] overflow-y-auto bg-white dark:bg-[#1a1635] text-slate-800 dark:text-slate-100 rounded-2xl shadow-2xl border border-slate-200 dark:border-purple-900/40 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <button
                    type="button"
                    onClick={() => {
                      setShowHeaderActionsMenu(false);
                      setIsDisplayModalOpen(true);
                    }}
                    className="w-full px-3.5 py-2.5 text-left text-xs font-medium hover:bg-slate-100 dark:hover:bg-white/10 flex items-center gap-2.5 transition-colors"
                  >
                    <Palette className="w-4 h-4 text-purple-500 shrink-0" />
                    <span className="flex-1">Chat Theme &amp; Gradient</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowGhostTimerMenu((prev) => !prev)}
                    className="w-full px-3.5 py-2.5 text-left text-xs font-medium hover:bg-slate-100 dark:hover:bg-white/10 flex items-center justify-between gap-2 transition-colors"
                  >
                    <span className="flex items-center gap-2.5">
                      <Ghost className="w-4 h-4 text-fuchsia-500 shrink-0" />
                      <span>Ghost Messages</span>
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-600 dark:text-purple-300 font-bold">
                      {currentChat.disappearingTimer && currentChat.disappearingTimer !== 'off'
                        ? currentChat.disappearingTimer
                        : 'Off'}
                    </span>
                  </button>

                  {showGhostTimerMenu && (
                    <div className="px-3 pb-2.5 pt-1 flex flex-wrap gap-1 border-b border-slate-100 dark:border-purple-900/30">
                      {(['off', '10s', '30s', '1m', '5m', '1h', '24h'] as GhostTimerSetting[]).map((timerOpt) => {
                        const isCurrentTimer = (currentChat.disappearingTimer || 'off') === timerOpt;
                        return (
                          <button
                            key={timerOpt}
                            type="button"
                            onClick={() => {
                              setDisappearingTimer(currentChat.id, timerOpt);
                              setShowGhostTimerMenu(false);
                              setShowHeaderActionsMenu(false);
                              setToastNotice(
                                timerOpt === 'off'
                                  ? 'Ghost messages turned off'
                                  : `Ghost timer set to ${timerOpt}`
                              );
                              setTimeout(() => setToastNotice(null), 2200);
                            }}
                            className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition-colors ${
                              isCurrentTimer
                                ? 'bg-purple-600 text-white'
                                : 'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 hover:bg-purple-500/20'
                            }`}
                          >
                            {timerOpt === 'off' ? 'Off' : timerOpt}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {!(isChannelMember || (currentChat.announceMode && !isGroupAdmin)) && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowHeaderActionsMenu(false);
                        setIsQuickPollModalOpen(true);
                      }}
                      className="w-full px-3.5 py-2.5 text-left text-xs font-medium hover:bg-slate-100 dark:hover:bg-white/10 flex items-center gap-2.5 transition-colors"
                    >
                      <BarChart3 className="w-4 h-4 text-indigo-500 shrink-0" />
                      <span>Quick Vote Poll</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      exportChatTranscript(currentChat, currentMessages, currentUser);
                      setShowHeaderActionsMenu(false);
                      setToastNotice('Chat transcript exported (.txt)');
                      setTimeout(() => setToastNotice(null), 2200);
                    }}
                    className="w-full px-3.5 py-2.5 text-left text-xs font-medium hover:bg-slate-100 dark:hover:bg-white/10 flex items-center gap-2.5 transition-colors"
                  >
                    <Download className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Export Transcript (.txt)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowHeaderActionsMenu(false);
                      setConfirmChatAction('clear');
                    }}
                    className="w-full px-3.5 py-2.5 text-left text-xs font-medium hover:bg-slate-100 dark:hover:bg-white/10 flex items-center gap-2.5 transition-colors border-t border-slate-100 dark:border-purple-900/30"
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

      {/* Friendly Hard-AI Quick Game Bar in AI Chat */}
      {(currentChat.isBot || currentChat.id === 'chat_afribot_ai') && (
        <div className="px-3 py-2 bg-gradient-to-r from-purple-950/90 via-[#1b1638] to-indigo-950/90 border-b border-purple-500/25 flex flex-wrap items-center justify-between gap-2 shrink-0 z-10">
          <div className="flex items-center gap-1.5 min-w-0 text-[11px] font-semibold text-purple-100">
            <Bot className="w-3.5 h-3.5 text-pink-400 shrink-0" />
            <span className="truncate">Play Hard AI (Friendly):</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={() => void sendXoChallenge(currentChat.id, 'friendly', 0)}
              className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold flex items-center gap-1 transition-colors"
            >
              <Grid3X3 className="w-3 h-3 text-purple-300" />
              <span>X/O</span>
            </button>
            <button
              type="button"
              onClick={() => void sendWhotChallenge(currentChat.id, 'friendly', 0)}
              className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold flex items-center gap-1 transition-colors"
            >
              <Layers className="w-3 h-3 text-amber-300" />
              <span>Whot!</span>
            </button>
            <button
              type="button"
              onClick={() => void sendLudoChallenge(currentChat.id, 'friendly', 0)}
              className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold flex items-center gap-1 transition-colors"
            >
              <Dices className="w-3 h-3 text-emerald-300" />
              <span>Ludo</span>
            </button>
            <button
              type="button"
              onClick={() => void sendPokerChallenge(currentChat.id, 'friendly', 0)}
              className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold flex items-center gap-1 transition-colors"
            >
              <span className="text-teal-300 font-black leading-none">♠</span>
              <span>Poker</span>
            </button>
          </div>
        </div>
      )}

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

      {/* Sticky Pinned Announcement Banner */}
      {currentChat.pinnedMessage && (
        <div
          onClick={() => scrollToMessageById(currentChat.pinnedMessage!.messageId)}
          className="px-3.5 py-2 bg-purple-950/95 dark:bg-[#161029] text-white border-b border-purple-500/35 flex items-center justify-between gap-2.5 cursor-pointer hover:bg-purple-900/95 transition-colors shrink-0 z-10"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Pin className="w-3.5 h-3.5 text-amber-400 shrink-0 rotate-45" />
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300 truncate">
                Pinned · {currentChat.pinnedMessage.senderName}
              </div>
              <div className="text-xs text-purple-100 truncate">
                {currentChat.pinnedMessage.text}
              </div>
            </div>
          </div>
          {canPinMessages ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                pinChatMessage(currentChat.id, null);
              }}
              className="p-1 rounded-full hover:bg-white/15 text-purple-200 hover:text-white shrink-0"
              title="Unpin announcement"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <span className="text-[10px] font-mono text-purple-300 shrink-0">View</span>
          )}
        </div>
      )}

      {/* Message Feed */}
      <div
        ref={chatContainerRef}
        onClick={() => setActiveMenuMsgId(null)}
        style={feedThemeStyle}
        className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-2 space-y-2.5 overscroll-contain w-full min-w-0 relative"
      >
        {/* Floating Jump-to-Mention Pill */}
        {(currentChat.lastMentionMessageId || (currentChat.unreadMentions || 0) > 0) && (
          <div className="sticky top-2 z-20 flex justify-end pointer-events-none">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (currentChat.lastMentionMessageId) {
                  scrollToMessageById(currentChat.lastMentionMessageId);
                }
                clearChatMentions(currentChat.id);
              }}
              className="pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-xs shadow-xl border border-amber-200 active:scale-95 transition-transform"
            >
              <AtSign className="w-3.5 h-3.5" />
              <span>
                {(currentChat.unreadMentions || 0) > 0
                  ? `${currentChat.unreadMentions} Mention${currentChat.unreadMentions! > 1 ? 's' : ''}`
                  : 'Jump to @mention'}
              </span>
            </button>
          </div>
        )}

        {/* Date Divider */}
        <div className="flex justify-center my-2">
          <span className="text-[11px] bg-white/80 dark:bg-[#1a172e]/80 backdrop-blur-xs text-slate-600 dark:text-slate-400 px-3 py-1 rounded-md shadow-2xs font-medium">
            TODAY
          </span>
        </div>

        {(() => {
          const filtered = chatSearchQuery.trim()
            ? currentMessages.filter((m: ChatMessage) =>
                (m.text || '').toLowerCase().includes(chatSearchQuery.trim().toLowerCase()) ||
                (m.senderName || '').toLowerCase().includes(chatSearchQuery.trim().toLowerCase())
              )
            : currentMessages;
          const isOngoingGame = (m: ChatMessage) =>
            (m.type === 'game_xo' && Boolean(m.xoGame) && (m.xoGame!.status === 'active' || m.xoGame!.status === 'pending')) ||
            (m.type === 'game_whot' && Boolean(m.whotGame) && (m.whotGame!.status === 'active' || m.whotGame!.status === 'pending')) ||
            (m.type === 'game_ludo' && Boolean(m.ludoGame) && (m.ludoGame!.status === 'active' || m.ludoGame!.status === 'pending')) ||
            (m.type === 'game_poker' && Boolean(m.pokerGame) && (m.pokerGame!.status === 'active' || m.pokerGame!.status === 'pending'));
          const nonOngoing = filtered.filter((m) => !isOngoingGame(m));
          const ongoingGames = filtered.filter((m) => isOngoingGame(m));
          return [...nonOngoing, ...ongoingGames];
        })().map((msg: ChatMessage) => {
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
                  {msg.order && (() => {
                    const liveOrder = escrowOrders.find((o) => o.id === msg.order!.id) || msg.order!;
                    const isBuyer = phonesMatch(currentUser?.phoneNumber || '', liveOrder.buyerPhone) ||
                      liveOrder.buyerId === currentUser?.id;
                    const statusLabel =
                      liveOrder.status === 'funds_released'
                        ? 'Funds Released'
                        : liveOrder.status === 'release_approved'
                        ? 'Approved · Enter Code'
                        : liveOrder.status === 'disputed'
                        ? 'Disputed'
                        : liveOrder.status === 'refunded'
                        ? 'Refunded'
                        : 'Held in Escrow (Awaiting Approval)';
                    return (
                      <div className="mt-2 pt-2 border-t border-amber-200 dark:border-amber-800/60 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-300">
                            {statusLabel}
                          </span>
                          <button
                            onClick={() => setActiveEscrowModalOrder(liveOrder)}
                            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] font-semibold transition-colors"
                          >
                            Manage Escrow
                          </button>
                        </div>
                        <div className="text-left text-[11px] font-mono text-slate-600 dark:text-slate-400">
                          {isBuyer ? (
                            <span>
                              System PIN (Creator): <strong className="text-amber-700 dark:text-amber-300">{liveOrder.escrowPin}</strong>
                            </span>
                          ) : liveOrder.status === 'release_approved' ? (
                            <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                              Buyer approved! Tap Manage Escrow to enter PIN & claim.
                            </span>
                          ) : liveOrder.status === 'funds_released' ? (
                            <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                              Completed · Payout credited to your wallet
                            </span>
                          ) : (
                            <span>Money held in vault awaiting buyer approval</span>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            );
          }

          return (
            <div
              id={`msg-${msg.id}`}
              key={msg.id}
              className={`flex items-start gap-2.5 my-2.5 w-full ${isUser ? 'justify-end' : 'justify-start'} ${
                highlightedMsgId === msg.id ? 'agc-jump-flash rounded-2xl' : ''
              }`}
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
                    className={`absolute -top-36 z-40 ${isUser ? 'right-0' : 'left-0'} bg-[#242428]/95 dark:bg-[#1a1a1e]/95 text-white backdrop-blur-md rounded-2xl p-2 shadow-2xl border border-white/15 w-64 animate-in zoom-in-95 duration-150 select-none`}
                  >
                    {/* Quick Emoji Reaction Row */}
                    <div className="flex items-center justify-between px-1 pb-1.5 mb-1.5 border-b border-white/10">
                      {['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥'].map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => {
                            if (activeChatId) reactToMessage(activeChatId, msg.id, emoji);
                            setActiveMenuMsgId(null);
                          }}
                          className="w-7 h-7 rounded-full hover:bg-white/15 active:scale-125 flex items-center justify-center text-base transition-transform cursor-pointer"
                          title={`React ${emoji}`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>

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
                          setForwardingMessage(msg);
                          setForwardSearch('');
                          setSelectedForwardTargets([]);
                          setActiveMenuMsgId(null);
                        }}
                        className="flex flex-col items-center gap-1 p-1 rounded-lg hover:bg-white/10 transition-colors"
                      >
                        <CornerUpRight className="w-3.5 h-3.5 text-slate-200" />
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

                    {/* Row 2: Reminder, Read, Translate, Pin, Search */}
                    <div className={`grid ${canPinMessages ? 'grid-cols-5' : 'grid-cols-4'} gap-1 text-center pt-1.5`}>
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
                      {canPinMessages && (
                        <button
                          type="button"
                          onClick={() => {
                            const isAlreadyPinned = currentChat.pinnedMessage?.messageId === msg.id;
                            pinChatMessage(currentChat.id, isAlreadyPinned ? null : msg);
                            setToastNotice(isAlreadyPinned ? 'Unpinned message' : 'Pinned announcement');
                            setTimeout(() => setToastNotice(null), 1800);
                            setActiveMenuMsgId(null);
                          }}
                          className="flex flex-col items-center gap-1 p-1 rounded-lg hover:bg-amber-500/20 transition-colors text-amber-300 font-bold"
                        >
                          <Pin className="w-3.5 h-3.5 text-amber-300" />
                          <span className="text-[10px] text-amber-300">
                            {currentChat.pinnedMessage?.messageId === msg.id ? 'Unpin' : 'Pin'}
                          </span>
                        </button>
                      )}
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
                      ? activeChatTheme.id !== 'default'
                        ? `${activeChatTheme.sentBubbleClass} rounded-tr-xs`
                        : 'bg-purple-600 dark:bg-purple-600 text-white rounded-tr-xs'
                      : 'bg-white dark:bg-[#2c2c2e] text-slate-900 dark:text-slate-100 rounded-tl-xs border border-slate-200/80 dark:border-white/10'
                  }`}
                >
                  {/* Group sender name (colored per sender) */}
                  {currentChat?.isGroup && !isUser && msg.senderName && (
                    <div className={`text-[11px] font-bold mb-1 flex items-center gap-1.5 ${getSenderColor(msg.senderName)}`}>
                      <span>{msg.senderName === 'AfriBot AI' ? 'AgcBot' : msg.senderName}</span>
                      {(msg.senderName === 'AgcBot' || msg.senderName === 'AfriBot AI') && (
                        <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded-full bg-pink-500/20 text-pink-400 text-[8px] font-black uppercase tracking-wider border border-pink-500/30">
                          <Bot className="w-2.5 h-2.5" /> BOT ADMIN
                        </span>
                      )}
                    </div>
                  )}

                  {/* Forwarded Label */}
                  {msg.isForwarded && (
                    <div
                      className={`flex items-center gap-1 text-[10px] font-semibold italic mb-1 ${
                        isUser ? 'text-purple-200/90' : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      <CornerUpRight className="w-3 h-3 shrink-0" />
                      <span>Forwarded</span>
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
                          {renderTextWithMentions(msg.text || '', isUser)}
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
                  ) : lowDataMode && !isUser && !revealedLowDataImages[msg.id] ? (
                    /* Data Saver Mode: Defer Full Photo Load until Tapped */
                    <div className="space-y-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setRevealedLowDataImages((prev) => ({ ...prev, [msg.id]: true }));
                        }}
                        className="w-full min-w-[200px] flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-dashed border-amber-500/50 text-left transition-colors"
                      >
                        <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-300 flex items-center justify-center shrink-0">
                          <WifiOff className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-amber-700 dark:text-amber-300">
                            Data Saver Mode
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">
                            Tap to download &amp; view photo
                          </div>
                        </div>
                      </button>
                      {msg.text && (
                        <p className="text-sm leading-relaxed pt-1">
                          {renderTextWithMentions(msg.text, isUser)}
                        </p>
                      )}
                    </div>
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
                        <p className="text-sm leading-relaxed pt-1">
                          {renderTextWithMentions(msg.text, isUser)}
                        </p>
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
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!isExpired) {
                              toggleVoicePlayback(
                                msg.id,
                                vn.audioDataUrl,
                                vn.transcript,
                                msg.oneTimeView,
                                vn.durationSeconds
                              );
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
                          <div className="flex justify-between items-center text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-mono gap-2">
                            <span>0:{vn.durationSeconds < 10 ? `0${vn.durationSeconds}` : vn.durationSeconds}</span>
                            <div className="flex items-center gap-1.5">
                              {expiryLabel && (
                                <span className={`text-[9px] font-semibold ${isExpired ? 'text-rose-400' : 'text-slate-400'}`}>
                                  ⏱️ {expiryLabel}
                                </span>
                              )}
                              <button
                                type="button"
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={cycleVoiceSpeed}
                                className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold font-mono border transition-colors ${
                                  isUser
                                    ? 'bg-white/15 hover:bg-white/25 border-white/25 text-white'
                                    : 'bg-indigo-500/15 hover:bg-indigo-500/25 border-indigo-500/30 text-indigo-600 dark:text-indigo-300'
                                }`}
                                title="Playback speed (1x / 1.5x / 2x)"
                              >
                                {voiceSpeed}x
                              </button>
                            </div>
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
                  const isSender = msg.sender === 'user';
                  const subtotal = Number(msg.product.price) || 0;
                  const fee = Math.min(Math.round(subtotal * 0.01), 4000);
                  const productForCheckout: Product = {
                    ...msg.product,
                    sellerPhone:
                      msg.product.sellerPhone ||
                      (isSender ? currentUser?.phoneNumber : currentChat?.phoneNumber || currentChat?.phone || ''),
                  };
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
                          {formatPrice(subtotal, msg.product.currency)}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                          + {formatPrice(fee, msg.product.currency)} (1% escrow fee, max ₦4,000)
                        </div>
                      </div>

                      {isSender ? (
                        <div className="w-full py-2 px-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 rounded-xl font-semibold text-[11px] flex items-center justify-center gap-1.5">
                          <Lock className="w-3.5 h-3.5 shrink-0" />
                          <span>Deal Sent · Waiting for Buyer Payment</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => openCheckout(productForCheckout)}
                          className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>{isEscrowDeal ? 'Pay with Escrow' : 'Buy with Escrow'}</span>
                        </button>
                      )}
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

                {/* Free Chat Quick Poll Message */}
                {msg.type === 'quick_poll' && msg.quickPoll && (() => {
                  const qPoll = msg.quickPoll!;
                  const totalVotes = qPoll.options.reduce((sum, o) => sum + o.voterIds.length, 0);
                  return (
                    <div
                      onPointerDown={(e) => e.stopPropagation()}
                      onMouseUp={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                      className="space-y-2.5 min-w-[250px] p-1 select-none"
                    >
                      <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-1.5 gap-2">
                        <div className={`flex items-center gap-1.5 font-bold text-xs ${isUser ? 'text-purple-100' : 'text-purple-600 dark:text-purple-300'}`}>
                          <BarChart3 className="w-4 h-4 shrink-0" />
                          <span>Quick Vote Poll</span>
                        </div>
                        <span className={`text-[10px] font-mono font-bold ${isUser ? 'text-purple-200' : 'text-slate-500 dark:text-slate-400'}`}>
                          {totalVotes} vote{totalVotes === 1 ? '' : 's'}
                        </span>
                      </div>

                      <h4 className={`font-bold text-xs leading-snug ${isUser ? 'text-white' : 'text-slate-900 dark:text-slate-100'}`}>
                        {qPoll.question}
                      </h4>

                      <div className="space-y-1.5">
                        {qPoll.options.map((opt) => {
                          const votes = opt.voterIds.length;
                          const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
                          const voted = opt.voterIds.includes(myQuickPollVoterId);
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                voteOnQuickPoll(currentChat.id, msg.id, opt.id);
                              }}
                              className={`w-full text-left px-3 py-2 rounded-xl border relative overflow-hidden transition-all ${
                                voted
                                  ? isUser
                                    ? 'border-white bg-white/15 text-white'
                                    : 'border-purple-600 bg-purple-50 dark:bg-purple-950/60 text-slate-900 dark:text-white'
                                  : isUser
                                  ? 'border-white/25 hover:bg-white/10 text-white'
                                  : 'border-slate-200 dark:border-slate-700 hover:bg-black/5 dark:hover:bg-white/5 text-slate-800 dark:text-slate-100'
                              }`}
                            >
                              <div
                                style={{ width: `${pct}%` }}
                                className={`absolute inset-y-0 left-0 transition-all duration-200 ${
                                  isUser
                                    ? 'bg-white/20'
                                    : voted
                                    ? 'bg-purple-500/20'
                                    : 'bg-slate-400/15'
                                }`}
                              />
                              <div className="relative z-10 flex items-center justify-between text-xs gap-2">
                                <span className="font-semibold truncate">
                                  {voted ? '✓ ' : ''}{opt.text}
                                </span>
                                <span className="font-mono font-bold text-[11px] shrink-0">
                                  {pct}% ({votes})
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      <div className={`text-[10px] flex items-center justify-between font-mono ${isUser ? 'text-purple-200' : 'text-slate-400'}`}>
                        <span>By {qPoll.creatorName}</span>
                        <span>{qPoll.allowMultiple ? 'Multiple choice' : 'Single choice'}</span>
                      </div>
                    </div>
                  );
                })()}

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

                  const xoConfirming = xoConfirmForfeitId === game.id && game.status === 'active';

                  const renderXoCardBody = (isFull: boolean) => (
                    <div
                      onPointerDown={(e) => e.stopPropagation()}
                      onMouseUp={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                      className={`select-none ${
                        isFull
                          ? 'space-y-4 w-full max-w-md mx-auto'
                          : 'space-y-3 min-w-[260px] max-w-[300px] p-1'
                      }`}
                    >
                      {/* Match Title & Mode */}
                      {!isFull && (
                        <div className="flex items-center justify-between gap-2 pb-2 border-b border-black/10 dark:border-white/10">
                          <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-white min-w-0">
                            <Gamepad2 className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                            <span className="truncate">X/O Challenge</span>
                            {game.isAiOpponent && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-purple-500/15 text-purple-700 dark:text-purple-300 text-[9px] font-extrabold shrink-0">
                                <Bot className="w-2.5 h-2.5" />
                                Hard AI
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="font-mono tabular-nums text-[11px] font-bold text-emerald-700 dark:text-emerald-300 whitespace-nowrap">
                              {game.mode === 'bet' ? `${formatPrice(game.betAmount, gCur)} Bet` : 'Friendly'}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setFullModeXoId(game.id);
                              }}
                              title="Open Full Mode"
                              aria-label="Open X/O in Full Mode"
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-slate-200 transition-colors"
                            >
                              <Maximize2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Players & Bet Breakdown */}
                      <div className={`space-y-1.5 ${isFull ? 'text-sm bg-white/80 dark:bg-[#1e1a36] p-3.5 rounded-2xl border border-slate-200 dark:border-white/10' : 'text-[11px]'}`}>
                        <div className="flex items-center justify-between text-slate-700 dark:text-slate-200 gap-2">
                          <span className="truncate font-semibold">
                            <span className="font-mono font-black text-indigo-600 dark:text-indigo-400">X</span> {game.xPlayerName}
                          </span>
                          <span className="text-slate-400 text-xs font-bold" aria-hidden="true">vs</span>
                          <span className="truncate font-semibold text-right">
                            {game.oPlayerName || game.opponentName || 'Waiting'}{' '}
                            <span className="font-mono font-black text-amber-600 dark:text-amber-400">O</span>
                          </span>
                        </div>
                        {game.mode === 'bet' && (
                          <div className={`flex items-center justify-between font-mono tabular-nums text-slate-500 dark:text-slate-400 ${isFull ? 'text-xs' : 'text-[10px]'}`}>
                            <span>Pot: {formatPrice(game.totalPot, gCur)} · 1% fee: {formatPrice(game.platformFee, gCur)}</span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                              Win: {formatPrice(game.winnerPayout, gCur)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Interactive 3x3 Board */}
                      <div className={`grid grid-cols-3 rounded-2xl bg-slate-100 dark:bg-[#17142b] border border-slate-200 dark:border-white/10 ${
                        isFull ? 'gap-3 p-3.5 shadow-inner' : 'gap-2 p-2'
                      }`}>
                        {(Array.isArray(game.board) && game.board.length === 9 ? game.board : Array(9).fill(null)).map((cell, idx) => {
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
                              className={`aspect-square rounded-xl flex items-center justify-center font-display font-black transition-all duration-150 ${
                                isFull ? 'min-h-[88px] sm:min-h-[104px] text-4xl sm:text-5xl rounded-2xl' : 'min-h-[52px] text-2xl'
                              } ${
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
                                        requiresVerifiedBadge: res.requiresVerifiedBadge,
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
                        <div className="space-y-2">
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
                            {mySymbol !== null && !xoConfirming && (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setXoConfirmForfeitId(game.id);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-600 dark:text-rose-300 text-[10px] font-bold whitespace-nowrap shrink-0 transition-colors"
                              >
                                <Flag className="w-3 h-3" />
                                <span>Forfeit</span>
                              </button>
                            )}
                          </div>

                          {xoConfirming && mySymbol !== null && (
                            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 space-y-2">
                              <p className="text-[11px] font-semibold text-rose-700 dark:text-rose-200 leading-snug">
                                Forfeit this X/O match? Your opponent will be declared the winner
                                {game.mode === 'bet' ? ` and collect ${formatPrice(game.winnerPayout, gCur)}` : ''}.
                              </p>
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setXoConfirmForfeitId(null);
                                  }}
                                  className="py-1.5 px-2.5 rounded-lg bg-white dark:bg-white/10 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/15 text-[11px] font-semibold"
                                >
                                  Keep Playing
                                </button>
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    setXoBusyId(game.id);
                                    setXoConfirmForfeitId(null);
                                    try {
                                      const res = await forfeitXoGame(game);
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
                                  className="py-1.5 px-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold"
                                >
                                  Confirm Forfeit
                                </button>
                              </div>
                            </div>
                          )}
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
                              <div className="min-w-0">
                                <div className="truncate">
                                  {game.status === 'won'
                                    ? `${game.winnerName || 'Winner'} won (${game.winnerSymbol})`
                                    : game.status === 'draw'
                                    ? 'Match Draw'
                                    : game.status === 'declined'
                                    ? 'Challenge Declined'
                                    : 'Challenge Cancelled'}
                                </div>
                                {game.lastActionNote && (
                                  <div className="text-[10px] opacity-80 truncate">
                                    {game.lastActionNote}
                                  </div>
                                )}
                              </div>
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
                              if (isFull) setFullModeXoId(null);
                              setIsGameXoModalOpen(true);
                            }}
                            className="w-full py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-colors"
                          >
                            Play Again
                          </button>
                        </div>
                      )}

                      {xoErr && (
                        <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-200 text-[11px] space-y-1.5">
                          <span>{xoErr.msg}</span>
                          {(xoErr.requiresVerifiedBadge || xoErr.insufficient) && (
                            <div className="flex flex-wrap gap-1.5">
                              {xoErr.requiresVerifiedBadge && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const upRes = upgradeVerificationBadge('blue');
                                    if (!upRes.success) {
                                      setXoErrors((prev) => ({
                                        ...prev,
                                        [game.id]: { msg: upRes.message, insufficient: true },
                                      }));
                                    } else {
                                      setXoErrors((prev) => ({
                                        ...prev,
                                        [game.id]: { msg: 'Verified Badge active! Tap Accept & Play to join.' },
                                      }));
                                    }
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-[10px] font-bold inline-flex items-center gap-1 whitespace-nowrap"
                                >
                                  <BadgeCheck className="w-3 h-3" />
                                  <span>Verify (₦4k/mo)</span>
                                </button>
                              )}
                              {xoErr.insufficient && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (isFull) setFullModeXoId(null);
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
                      )}
                    </div>
                  );

                  return (
                    <>
                      {renderXoCardBody(false)}
                      {fullModeXoId === game.id &&
                        typeof document !== 'undefined' &&
                        createPortal(
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="fixed inset-0 z-[75] flex flex-col bg-slate-50 dark:bg-[#0d0a1a] text-slate-900 dark:text-white animate-in fade-in duration-150"
                          >
                            {/* Full Mode Header */}
                            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#141026]/95 backdrop-blur-md shrink-0">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setFullModeXoId(null);
                                }}
                                className="min-h-[44px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-800 dark:text-white text-xs font-bold transition-colors"
                              >
                                <ArrowLeft className="w-4 h-4" />
                                <span>Back</span>
                              </button>
                              <div className="flex items-center gap-1.5 font-extrabold text-sm min-w-0">
                                <Gamepad2 className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                                <span className="truncate">X/O Arena</span>
                                {game.isAiOpponent && (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-purple-500/15 text-purple-700 dark:text-purple-300 text-[10px] font-extrabold">
                                    <Bot className="w-3 h-3" />
                                    AI
                                  </span>
                                )}
                              </div>
                              <span className="font-mono tabular-nums text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 whitespace-nowrap">
                                {game.mode === 'bet' ? `${formatPrice(game.betAmount, gCur)} Bet` : 'Friendly'}
                              </span>
                            </div>

                            {/* Full Mode Arena Canvas */}
                            <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col justify-center">
                              {renderXoCardBody(true)}
                            </div>
                          </div>,
                          document.body
                        )}
                    </>
                  );
                })()}

                {/* Live Multiplayer Whot! Card Game */}
                {msg.type === 'game_whot' && msg.whotGame && (
                  <div
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseUp={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <WhotGameCard game={msg.whotGame} />
                  </div>
                )}

                {/* Live Multiplayer Ludo Board Game */}
                {msg.type === 'game_ludo' && msg.ludoGame && (
                  <div
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseUp={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <LudoGameCard game={msg.ludoGame} />
                  </div>
                )}

                {/* Live Multiplayer Texas Hold'em Poker Game */}
                {msg.type === 'game_poker' && msg.pokerGame && (
                  <div
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseUp={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <PokerGameCard game={msg.pokerGame} />
                  </div>
                )}

                {/* Send My Bill (Pay on Behalf) Interactive Card */}
                {msg.type === 'bill_request' && msg.billRequest && (() => {
                  const bill = msg.billRequest!;
                  const bCur = bill.currency || 'NGN';
                  const isRequester = samePhone(myPhoneRaw, bill.requesterPhone);
                  const isPaid = bill.status === 'paid';
                  const billErr = billErrors[bill.id];
                  const isBusy = billBusyId === bill.id;
                  const showingPin = billPinPromptId === bill.id;

                  const executeWalletBillPay = async () => {
                    if (securitySettings?.hasPaymentPin && !showingPin) {
                      setBillPinPromptId(bill.id);
                      setBillPinInput('');
                      return;
                    }
                    if (securitySettings?.hasPaymentPin && showingPin) {
                      const check = verifyPaymentPinDetailed(billPinInput);
                      if (!check.success) {
                        setBillErrors((prev) => ({
                          ...prev,
                          [bill.id]: { msg: check.message || 'Incorrect payment PIN.' },
                        }));
                        return;
                      }
                    }

                    setBillBusyId(bill.id);
                    setBillErrors((prev) => {
                      const next = { ...prev };
                      delete next[bill.id];
                      return next;
                    });
                    try {
                      const res = await payBillOnBehalf(bill, 'wallet');
                      if (!res.success) {
                        setBillErrors((prev) => ({
                          ...prev,
                          [bill.id]: {
                            msg: res.message || 'Could not settle bill.',
                            insufficient: res.insufficientFunds,
                          },
                        }));
                      } else {
                        setBillPinPromptId(null);
                        setBillPinInput('');
                      }
                    } finally {
                      setBillBusyId(null);
                    }
                  };

                  const executePaystackBillPay = () => {
                    const userEmail =
                      currentUser.email ||
                      `${(currentUser.phoneNumber || '2348000000000').replace(/\D/g, '')}@agc.africa`;
                    setBillBusyId(bill.id);
                    openPaystackPopup({
                      email: userEmail,
                      amount: bill.amount,
                      currency: 'NGN',
                      metadata: {
                        type: 'bill_request',
                        billId: bill.id,
                        requesterPhone: bill.requesterPhone,
                      },
                      onSuccess: async (resp: { reference: string }) => {
                        try {
                          const res = await payBillOnBehalf(bill, 'paystack', resp.reference);
                          if (!res.success) {
                            setBillErrors((prev) => ({
                              ...prev,
                              [bill.id]: { msg: res.message || 'Payment verification failed.' },
                            }));
                          }
                        } finally {
                          setBillBusyId(null);
                        }
                      },
                      onClose: () => {
                        setBillBusyId(null);
                      },
                    });
                  };

                  return (
                    <div
                      onPointerDown={(e) => e.stopPropagation()}
                      onMouseUp={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                      className="space-y-2.5 min-w-[260px] max-w-[300px] p-1 select-none"
                    >
                      <div className="flex items-center justify-between gap-2 pb-2 border-b border-black/10 dark:border-white/10">
                        <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-white">
                          <Receipt className="w-4 h-4 text-emerald-500 shrink-0" />
                          <span>AGC Feature Bill</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-purple-500/15 text-purple-600 dark:text-purple-300">
                          {bill.category}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-100 dark:bg-[#17142b] border border-slate-200 dark:border-white/10 space-y-1">
                        <div className="text-xs font-bold text-slate-900 dark:text-white">
                          {bill.title}
                        </div>
                        <div className="text-lg font-black font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                          {formatPrice(bill.amount, bCur)}
                        </div>
                        {bill.featureRefId && (
                          <div className="inline-block px-2 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/20 text-[10px] font-mono text-purple-600 dark:text-purple-300">
                            Ref: {bill.featureRefId}
                          </div>
                        )}
                        {bill.note && (
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed pt-0.5">
                            {bill.note}
                          </p>
                        )}
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 pt-1">
                          Requested by <strong>@{bill.requesterName}</strong>
                        </div>
                      </div>

                      {isPaid ? (
                        <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center justify-between gap-2">
                          <span className="flex items-center gap-1.5 truncate">
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            <span className="truncate">Paid by @{bill.paidByName || 'Friend'}</span>
                          </span>
                          <span className="font-mono text-[10px] uppercase shrink-0">Settled</span>
                        </div>
                      ) : isRequester ? (
                        <div className="px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-[11px] font-medium text-center">
                          Waiting for @{bill.recipientName} to pay on your behalf
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {showingPin && (
                            <div className="flex items-center gap-1.5">
                              <input
                                type="password"
                                inputMode="numeric"
                                maxLength={4}
                                value={billPinInput}
                                onChange={(e) => setBillPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                placeholder="4-digit PIN"
                                className="flex-1 px-2.5 py-2 rounded-xl bg-white dark:bg-[#17142b] border border-purple-500/40 text-xs font-mono text-slate-900 dark:text-white focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => setBillPinPromptId(null)}
                                className="px-2.5 py-2 rounded-xl bg-slate-200 dark:bg-white/10 text-[11px] font-semibold text-slate-700 dark:text-slate-200"
                              >
                                Cancel
                              </button>
                            </div>
                          )}

                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={executeWalletBillPay}
                            className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                            <span>
                              {isBusy
                                ? 'Paying Bill...'
                                : showingPin
                                ? `Confirm PIN & Pay (${formatPrice(bill.amount, bCur)})`
                                : `Pay Bill via Wallet (${formatPrice(bill.amount, bCur)})`}
                            </span>
                          </button>

                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={executePaystackBillPay}
                            className="w-full py-2 px-3 rounded-xl bg-indigo-600/15 hover:bg-indigo-600/25 border border-indigo-500/30 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold transition-colors"
                          >
                            Pay via Card / Bank (Paystack)
                          </button>
                        </div>
                      )}

                      {billErr && (
                        <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-200 text-[11px] flex items-center justify-between gap-2">
                          <span>{billErr.msg}</span>
                          {billErr.insufficient && (
                            <button
                              type="button"
                              onClick={() => setIsWalletModalOpen(true)}
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

                {/* Timestamp, Ghost Countdown, Quick React Trigger & Delivery Ticks */}
                <div className={`flex items-center justify-end gap-1.5 mt-1 text-[10px] font-mono ${
                  isUser ? 'text-purple-200' : 'text-slate-400 dark:text-slate-500'
                }`}>
                  {(msg.isGhost || msg.expiresAt) && (
                    <span
                      className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
                        isUser
                          ? 'bg-white/15 text-amber-200'
                          : 'bg-purple-500/15 text-purple-600 dark:text-purple-300'
                      }`}
                      title="Disappearing Ghost Message"
                    >
                      👻 {formatGhostCountdown(msg)}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenuMsgId(activeMenuMsgId === msg.id ? null : msg.id);
                    }}
                    className={`p-0.5 rounded-full transition-colors ${
                      isUser ? 'hover:bg-white/15 text-purple-200/80' : 'hover:bg-slate-200/70 dark:hover:bg-white/10 text-slate-400'
                    }`}
                    title="React or message actions"
                  >
                    <Smile className="w-3 h-3" />
                  </button>
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

          {/* Free Quick Vote Poll (Any Chat / Group / Channel) */}
          {!(isChannelMember || (currentChat?.announceMode && !isGroupAdmin)) && (
            <button
              type="button"
              onClick={() => {
                setShowAttachMenu(false);
                setIsQuickPollModalOpen(true);
              }}
              className="flex flex-col items-center p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
            >
              <div className="w-9 h-9 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-600 dark:text-purple-300 flex items-center justify-center mb-1">
                <BarChart3 className="w-4 h-4" />
              </div>
              <span className="text-[10px] leading-tight font-semibold">Quick Poll</span>
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

          {/* Send My Bill (Pay on Behalf) */}
          {isFeatureEnabled('wallet') && !currentChat.isChannel && (
            <button
              type="button"
              onClick={() => {
                setShowAttachMenu(false);
                setIsSendBillModalOpen(true);
              }}
              className="flex flex-col items-center p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
            >
              <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-300 flex items-center justify-center mb-1">
                <Receipt className="w-4 h-4" />
              </div>
              <span className="text-[10px] leading-tight">Send My Bill</span>
            </button>
          )}

          {/* Send Game: Live X/O, Whot!, Ludo */}
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

      {/* @Mention Autocomplete Popover */}
      {filteredMentionCandidates.length > 0 && !(isChannelMember || (currentChat?.announceMode && !isGroupAdmin)) && (
        <div className="mx-3 mb-1.5 bg-white dark:bg-[#18132a] border border-purple-500/30 rounded-2xl shadow-xl overflow-hidden z-30 animate-in slide-in-from-bottom-2 shrink-0">
          {filteredMentionCandidates.map((cand) => (
            <button
              key={cand.handle}
              type="button"
              onClick={() => insertMentionHandle(cand.handle)}
              className="w-full px-3.5 py-2 flex items-center justify-between text-left hover:bg-purple-500/10 text-xs transition-colors border-b last:border-b-0 border-slate-100 dark:border-white/5"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono font-bold text-purple-600 dark:text-purple-300">
                  @{cand.handle}
                </span>
                {cand.label !== cand.handle && (
                  <span className="text-slate-500 dark:text-slate-400 truncate text-[11px]">
                    {cand.label}
                  </span>
                )}
              </div>
              {cand.badge && (
                <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-600 dark:text-purple-300 shrink-0">
                  {cand.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Input Bar / Channel Read-only Banner */}
      {(isChannelMember || (currentChat?.announceMode && !isGroupAdmin)) ? (
        <div className="px-4 py-3 bg-slate-100 dark:bg-neutral-900 shrink-0 flex items-center justify-center border-t border-slate-200 dark:border-neutral-800">
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {currentChat?.isChannel
              ? '🔇 Only admins can post in this channel'
              : '🔇 Announce Mode — only admins can send messages'}
          </span>
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
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={isOneTimeViewEnabled ? '1-Time message · disappears' : 'Message (@ to mention)'}
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
        targetChatId={currentChat.id}
      />

      {/* Group & Channel Info Modal (WhatsApp-style) */}
      {(currentChat?.isGroup || currentChat?.isChannel) && (
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

      {/* Fullscreen Lightbox Modal (Pinch/Wheel/Button Zoom + Pan + Direct Device Save) */}
      {lightboxImg && (
        <div
          className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-md flex flex-col justify-between p-4 animate-in fade-in select-none text-white touch-none"
          onClick={() => {
            if (lightboxZoom <= 1) setLightboxImg(null);
          }}
        >
          {/* Top Bar */}
          <div
            className="flex items-center justify-between gap-2 z-10 px-1"
            style={{ paddingTop: 'max(calc(env(safe-area-inset-top, 0px) + 8px), 14px)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 min-w-0">
              {lightboxImg.isOneTime ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-600 text-white text-xs font-bold shadow-lg shadow-purple-600/40 truncate">
                  <span className="w-4 h-4 rounded-full border border-white flex items-center justify-center text-[10px] font-bold shrink-0">1</span>
                  <span className="truncate">1-Time View · Disappears after closing</span>
                </span>
              ) : (
                <div className="flex items-center gap-1 bg-white/10 backdrop-blur-md rounded-full px-2 py-1 border border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      const next = clampZoom(lightboxZoom - 0.5);
                      setLightboxZoom(next);
                      if (next <= 1) setLightboxPan({ x: 0, y: 0 });
                    }}
                    disabled={lightboxZoom <= 1}
                    className="p-1.5 rounded-full hover:bg-white/15 disabled:opacity-40 transition-colors"
                    title="Zoom out"
                    aria-label="Zoom out"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-mono font-bold px-1.5 min-w-[44px] text-center">
                    {Math.round(lightboxZoom * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setLightboxZoom((z) => clampZoom(z + 0.5))}
                    disabled={lightboxZoom >= 4}
                    className="p-1.5 rounded-full hover:bg-white/15 disabled:opacity-40 transition-colors"
                    title="Zoom in"
                    aria-label="Zoom in"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  {lightboxZoom > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        setLightboxZoom(1);
                        setLightboxPan({ x: 0, y: 0 });
                      }}
                      className="p-1.5 rounded-full hover:bg-white/15 transition-colors"
                      title="Reset zoom"
                      aria-label="Reset zoom"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {!lightboxImg.isOneTime && (
                <button
                  type="button"
                  onClick={() => handleSaveImageToDevice(lightboxImg.url)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/15 hover:bg-white/25 text-white text-xs font-semibold transition-colors border border-white/10"
                  title="Save image to device"
                  aria-label="Save image to device"
                >
                  <Download className="w-4 h-4" />
                  <span>Save</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setLightboxImg(null)}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                title="Close"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Center Zoomable & Pannable Image */}
          <div
            className="flex-1 flex items-center justify-center p-2 relative overflow-hidden"
            onClick={(e) => {
              e.stopPropagation();
              const now = Date.now();
              if (now - lightboxLastTapRef.current < 280) {
                if (lightboxZoom > 1) {
                  setLightboxZoom(1);
                  setLightboxPan({ x: 0, y: 0 });
                } else {
                  setLightboxZoom(2.5);
                }
                lightboxLastTapRef.current = 0;
              } else {
                lightboxLastTapRef.current = now;
              }
            }}
            onWheel={(e) => {
              e.preventDefault();
              const delta = e.deltaY < 0 ? 0.25 : -0.25;
              const next = clampZoom(lightboxZoom + delta);
              setLightboxZoom(next);
              if (next <= 1) setLightboxPan({ x: 0, y: 0 });
            }}
            onMouseDown={(e) => {
              if (lightboxZoom <= 1) return;
              e.preventDefault();
              lightboxDragRef.current = {
                active: true,
                startX: e.clientX,
                startY: e.clientY,
                originX: lightboxPan.x,
                originY: lightboxPan.y,
              };
            }}
            onMouseMove={(e) => {
              const drag = lightboxDragRef.current;
              if (!drag?.active || lightboxZoom <= 1) return;
              setLightboxPan({
                x: drag.originX + (e.clientX - drag.startX),
                y: drag.originY + (e.clientY - drag.startY),
              });
            }}
            onMouseUp={() => {
              lightboxDragRef.current = null;
            }}
            onMouseLeave={() => {
              lightboxDragRef.current = null;
            }}
            onTouchStart={(e) => {
              if (e.touches.length === 2) {
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                lightboxPinchRef.current = {
                  startDist: Math.hypot(dx, dy) || 1,
                  startZoom: lightboxZoom,
                };
                lightboxDragRef.current = null;
              } else if (e.touches.length === 1 && lightboxZoom > 1) {
                lightboxDragRef.current = {
                  active: true,
                  startX: e.touches[0].clientX,
                  startY: e.touches[0].clientY,
                  originX: lightboxPan.x,
                  originY: lightboxPan.y,
                };
              }
            }}
            onTouchMove={(e) => {
              if (e.touches.length === 2 && lightboxPinchRef.current) {
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                const dist = Math.hypot(dx, dy);
                const next = clampZoom(
                  lightboxPinchRef.current.startZoom * (dist / lightboxPinchRef.current.startDist)
                );
                setLightboxZoom(next);
                if (next <= 1) setLightboxPan({ x: 0, y: 0 });
              } else if (e.touches.length === 1 && lightboxDragRef.current?.active && lightboxZoom > 1) {
                const drag = lightboxDragRef.current;
                setLightboxPan({
                  x: drag.originX + (e.touches[0].clientX - drag.startX),
                  y: drag.originY + (e.touches[0].clientY - drag.startY),
                });
              }
            }}
            onTouchEnd={() => {
              lightboxPinchRef.current = null;
              lightboxDragRef.current = null;
            }}
          >
            <img
              src={lightboxImg.url}
              alt={lightboxImg.caption || 'Enlarged photo'}
              draggable={false}
              style={{
                transform: `translate3d(${lightboxPan.x}px, ${lightboxPan.y}px, 0) scale(${lightboxZoom})`,
                transition: lightboxDragRef.current?.active || lightboxPinchRef.current ? 'none' : 'transform 140ms ease-out',
                cursor: lightboxZoom > 1 ? 'grab' : 'zoom-in',
              }}
              className="max-h-[80vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl select-none"
            />
          </div>

          {/* Bottom Caption / Hint */}
          <div className="flex flex-col items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            {lightboxImg.caption && (
              <div className="max-w-md mx-auto px-4 py-2.5 bg-black/75 backdrop-blur-md text-white rounded-2xl text-center text-sm border border-white/10">
                {lightboxImg.caption}
              </div>
            )}
            <span className="text-[11px] text-white/50">
              {lightboxZoom > 1 ? 'Drag to pan · Double-tap to reset' : 'Pinch, scroll, or double-tap to zoom'}
            </span>
          </div>
        </div>
      )}

      {/* In-App Confirmation Modal for Clear Chat / Delete Group */}
      {confirmChatAction && (() => {
        const activeEscrowBetGames =
          confirmChatAction === 'clear' ? getUnresolvedEscrowBetGames(currentMessages) : [];
        return (
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
              {confirmChatAction === 'clear' && activeEscrowBetGames.length > 0 && (
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                  <span>
                    {activeEscrowBetGames.length === 1
                      ? '1 active game bet with held escrow and no decided winner yet will be kept in chat.'
                      : `${activeEscrowBetGames.length} active game bets with held escrow and no decided winner yet will be kept in chat.`}
                  </span>
                </div>
              )}
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
                    if (act === 'clear') {
                      clearChat(currentChat.id);
                      if (activeEscrowBetGames.length > 0) {
                        setToastNotice(
                          `Chat cleared · ${activeEscrowBetGames.length} active bet game${
                            activeEscrowBetGames.length > 1 ? 's' : ''
                          } kept (escrow held)`
                        );
                        setTimeout(() => setToastNotice(null), 3000);
                      }
                    } else if (act === 'delete') {
                      deleteChat(currentChat.id);
                    }
                  }}
                  className="py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors"
                >
                  {confirmChatAction === 'delete' ? 'Delete' : 'Clear History'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
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

              {Number(escrowDealAmount) > 0 && (() => {
                const sub = Number(escrowDealAmount) || 0;
                const fee = Math.min(Math.round(sub * 0.01), 4000);
                return (
                  <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-slate-800 space-y-1 text-[11px]">
                    <div className="flex justify-between text-slate-600 dark:text-slate-300">
                      <span>Escrow Fee (1%, max ₦4,000)</span>
                      <span className="font-mono font-semibold">{formatPrice(fee, currency)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-slate-900 dark:text-white pt-1 border-t border-slate-200 dark:border-slate-800">
                      <span>Buyer Pays Total</span>
                      <span className="font-mono text-emerald-600 dark:text-emerald-400">{formatPrice(sub + fee, currency)}</span>
                    </div>
                  </div>
                );
              })()}
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
                    sellerId: currentUser.id,
                    sellerName: currentUser.fullName || 'AGC User',
                    sellerPhone: currentUser.phoneNumber || '',
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
                    sellerPhone: currentChat.phoneNumber || currentChat.phone || '',
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
      {/* Forward Message Recipient Picker Modal */}
      {forwardingMessage && (
        <div
          className="fixed inset-0 z-[190] bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in"
          onClick={() => setForwardingMessage(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md max-h-[85vh] flex flex-col bg-white dark:bg-[#17122c] border border-slate-200 dark:border-purple-900/40 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden text-slate-900 dark:text-white"
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-200 dark:border-purple-900/40 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-600/15 text-purple-600 dark:text-purple-300 flex items-center justify-center">
                  <CornerUpRight className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm">Forward Message</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Choose one or more chats or contacts
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setForwardingMessage(null)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Preview Snippet */}
            <div className="px-5 py-2.5 bg-slate-50 dark:bg-black/25 border-b border-slate-200/80 dark:border-purple-900/30 text-xs shrink-0">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-300 mb-0.5 flex items-center gap-1">
                <CornerUpRight className="w-3 h-3" />
                <span>Message to Forward</span>
              </div>
              <div className="truncate text-slate-700 dark:text-slate-200">
                {forwardingMessage.type === 'image'
                  ? forwardingMessage.text
                    ? `📷 Photo: ${forwardingMessage.text}`
                    : '📷 Photo'
                  : forwardingMessage.type === 'voice'
                  ? `🎙️ Voice note (${forwardingMessage.voiceNote?.durationSeconds || 0}s)`
                  : forwardingMessage.type === 'product_card'
                  ? ` ${forwardingMessage.product?.title || 'Product / Deal'}`
                  : forwardingMessage.type === 'location'
                  ? `📍 ${forwardingMessage.locationData?.addressName || 'Shared Location'}`
                  : forwardingMessage.type === 'invoice_receipt'
                  ? `🧾 Invoice #${(forwardingMessage.invoice || forwardingMessage.invoiceData)?.invoiceNumber || ''}`
                  : forwardingMessage.text || 'Message'}
              </div>
            </div>

            {/* Search Input */}
            <div className="p-3 border-b border-slate-200/70 dark:border-purple-900/30 shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={forwardSearch}
                  onChange={(e) => setForwardSearch(e.target.value)}
                  placeholder="Search chats, groups, or phone numbers..."
                  autoFocus
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-100 dark:bg-black/35 border border-slate-200 dark:border-purple-800/40 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* Recipient List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {(() => {
                type ForwardCandidate = {
                  key: string;
                  chatId?: string;
                  phone?: string;
                  name: string;
                  avatar?: string;
                  subtitle?: string;
                };
                const seenKeys = new Set<string>();
                const seenPhones = new Set<string>();
                const candidates: ForwardCandidate[] = [];
                const myPhoneLast9 = (currentUser?.phoneNumber || '').replace(/\D/g, '').slice(-9);

                const normalizeLast9 = (p?: string) => {
                  const d = (p || '').replace(/\D/g, '');
                  return d.length >= 9 ? d.slice(-9) : d;
                };

                // 1. Existing chats (excluding active chat)
                chats.forEach((c) => {
                  if (c.id === activeChatId) return;
                  const p = c.phoneNumber || c.phone || '';
                  const last9 = normalizeLast9(p);
                  if (last9 && last9 === myPhoneLast9 && !c.isGroup && !c.isChannel) return;
                  const key = `chat_${c.id}`;
                  if (seenKeys.has(key)) return;
                  seenKeys.add(key);
                  if (last9 && !c.isGroup && !c.isChannel) seenPhones.add(last9);
                  candidates.push({
                    key,
                    chatId: c.id,
                    phone: p || undefined,
                    name: c.name,
                    avatar: c.avatar,
                    subtitle: c.isGroup
                      ? `Group · ${c.membersCount || c.memberPhones?.length || 0} members`
                      : c.isChannel
                      ? 'Channel'
                      : p || c.location || 'Recent chat',
                  });
                });

                // 2. Device contacts not already listed
                deviceContacts.forEach((ct) => {
                  const p = ct.rawPhoneNumber || '';
                  const last9 = normalizeLast9(p);
                  if (!last9 || last9 === myPhoneLast9 || seenPhones.has(last9)) return;
                  seenPhones.add(last9);
                  candidates.push({
                    key: `phone_${last9}`,
                    phone: p,
                    name: ct.name || p,
                    avatar: ct.avatar,
                    subtitle: p,
                  });
                });

                // 3. Registered platform users not already listed
                adminUsers.forEach((u) => {
                  const p = u.phoneNumber || '';
                  const last9 = normalizeLast9(p);
                  if (!last9 || last9 === myPhoneLast9 || seenPhones.has(last9)) return;
                  seenPhones.add(last9);
                  candidates.push({
                    key: `phone_${last9}`,
                    phone: p,
                    name: u.fullName || p,
                    avatar: u.avatarUrl,
                    subtitle: p,
                  });
                });

                const q = forwardSearch.trim().toLowerCase();
                const filtered = q
                  ? candidates.filter(
                      (item) =>
                        item.name.toLowerCase().includes(q) ||
                        (item.phone || '').toLowerCase().includes(q) ||
                        (item.subtitle || '').toLowerCase().includes(q)
                    )
                  : candidates;

                if (filtered.length === 0) {
                  return (
                    <div className="py-10 text-center text-xs text-slate-400">
                      No matching chats or users found.
                    </div>
                  );
                }

                return filtered.map((item) => {
                  const isSelected = selectedForwardTargets.some((t) => t.key === item.key);
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => {
                        setSelectedForwardTargets((prev) =>
                          prev.some((t) => t.key === item.key)
                            ? prev.filter((t) => t.key !== item.key)
                            : [...prev, item]
                        );
                      }}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-2xl text-left transition-colors ${
                        isSelected
                          ? 'bg-purple-600/15 border border-purple-500/40'
                          : 'hover:bg-slate-100 dark:hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <img
                        src={
                          item.avatar ||
                          `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(item.name)}`
                        }
                        alt={item.name}
                        className="w-10 h-10 rounded-full object-cover shrink-0 border border-slate-200 dark:border-white/10"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold truncate">{item.name}</div>
                        {item.subtitle && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate font-mono">
                            {item.subtitle}
                          </div>
                        )}
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center border shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-purple-600 border-purple-600 text-white'
                            : 'border-slate-300 dark:border-slate-600'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                      </div>
                    </button>
                  );
                });
              })()}
            </div>

            {/* Footer Send Action */}
            <div className="p-4 border-t border-slate-200 dark:border-purple-900/40 bg-slate-50 dark:bg-black/30 flex items-center justify-between gap-3 shrink-0">
              <div className="text-xs text-slate-500 dark:text-slate-300 truncate">
                {selectedForwardTargets.length === 0
                  ? 'Select recipients'
                  : `${selectedForwardTargets.length} selected`}
              </div>
              <button
                type="button"
                disabled={selectedForwardTargets.length === 0}
                onClick={() => {
                  if (!forwardingMessage || selectedForwardTargets.length === 0) return;
                  const count = forwardMessage(
                    selectedForwardTargets.map((t) => ({
                      chatId: t.chatId,
                      phone: t.phone,
                      name: t.name,
                      avatar: t.avatar,
                    })),
                    forwardingMessage
                  );
                  setForwardingMessage(null);
                  setSelectedForwardTargets([]);
                  setForwardSearch('');
                  if (count > 0) {
                    setToastNotice(`Forwarded to ${count} chat${count > 1 ? 's' : ''}`);
                    setTimeout(() => setToastNotice(null), 2400);
                  }
                }}
                className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Forward</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

