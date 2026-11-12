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
  AlertTriangle,
  Camera,
  Users,
  Image,
  Sliders,
  Trash2,
  Reply,
  Copy,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ChatMessage, Product, LanguageCode } from '../types';
import { EmojiMemeDrawer } from './EmojiMemeDrawer';
import { DisplayWallpaperModal } from './DisplayWallpaperModal';
import { ContactProfileModal } from './ContactProfileModal';
import { compressImageFile } from '../utils/imageUtils';

interface ActiveChatProps {
  onOpenVoiceRecorder: () => void;
}

export const ActiveChat: React.FC<ActiveChatProps> = ({ onOpenVoiceRecorder }) => {
  const {
    clearChat,
    activeChatId,
    setActiveChatId,
    chats,
    messages,
    sendMessage,
    deleteMessage,
    reactToMessage,
    sendImageMessage,
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
  } = useApp();

  const [isDisplayModalOpen, setIsDisplayModalOpen] = useState(false);
  const [isContactProfileOpen, setIsContactProfileOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [toastNotice, setToastNotice] = useState<string | null>(null);
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
      const compressedDataUrl = await compressImageFile(file, 1200, 0.75);
      sendImageMessage(activeChatId, compressedDataUrl);
    } catch (err) {
      console.warn('Image compression fallback:', err);
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          sendImageMessage(activeChatId, reader.result);
        }
      };
      reader.readAsDataURL(file);
    } finally {
      e.target.value = '';
    }
  };

  const [inputText, setInputText] = useState('');
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [voiceProgress, setVoiceProgress] = useState<Record<string, number>>({});
  const [showCatalogDrawer, setShowCatalogDrawer] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [translatedMessages, setTranslatedMessages] = useState<Record<string, LanguageCode>>({});

  const chatContainerRef = useRef<HTMLDivElement>(null);

  const currentChat = chats.find((c) => c.id === activeChatId);
  const currentMessages = activeChatId ? messages[activeChatId] || [] : [];

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [currentMessages, activeChatId]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (playingVoiceId) {
      interval = setInterval(() => {
        setVoiceProgress((prev) => {
          const current = prev[playingVoiceId] || 0;
          if (current >= 100) {
            setPlayingVoiceId(null);
            return { ...prev, [playingVoiceId]: 0 };
          }
          return { ...prev, [playingVoiceId]: current + 8 };
        });
      }, 250);
    }
    return () => clearInterval(interval);
  }, [playingVoiceId]);

  if (!currentChat) return null;

  const handleSend = () => {
    if (!inputText.trim() || !activeChatId) return;
    const replyMeta = replyingTo
      ? {
          id: replyingTo.id,
          sender: replyingTo.sender === 'user' ? 'You' : (currentChat?.name || 'Contact'),
          text: replyingTo.text || (replyingTo.imageUrl ? '📷 Photo' : 'Voice note'),
        }
      : undefined;
    sendMessage(activeChatId, inputText, replyMeta);
    setInputText('');
    setReplyingTo(null);
  };

  const toggleVoicePlayback = (msgId: string) => {
    setPlayingVoiceId((prev) => (prev === msgId ? null : msgId));
  };

  const toggleTranslation = (msgId: string, targetLang: LanguageCode) => {
    setTranslatedMessages((prev) => ({
      ...prev,
      [msgId]: prev[msgId] === targetLang ? (language === targetLang ? 'en' : language) : targetLang,
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

                  {currentChat.isOnline && !currentChat.isScamFlagged && !hasRecentStatus && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-purple-950 dark:border-black rounded-full" />
                  )}
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
                    {currentChat.isCelebrityVerified && (
                      <span
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-gradient-to-r from-amber-500/25 to-purple-600/30 border border-amber-400/60 text-amber-300 text-[9px] font-extrabold shadow-2xs shrink-0"
                        title={`Celebrity Verified: ${currentChat.celebrityStageName || currentChat.name} (${currentChat.celebrityCategory || 'VIP / Artist'})`}
                      >
                        <CheckCircle2 className="w-3 h-3 text-amber-400 fill-amber-400/20" />
                        <span>Celebrity</span>
                      </span>
                    )}
                    {currentChat.isGroup && (
                      <span className="text-[10px] font-mono bg-white/15 px-1.5 py-0.2 rounded font-normal">
                        {currentChat.membersCount} members
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-indigo-200/80 leading-tight truncate">
                    {currentChat.isScamFlagged ? (
                      <span className="text-rose-400 font-bold">⚠️ Flagged Scammer ({currentChat.scamReportsCount} reports)</span>
                    ) : hasRecentStatus ? (
                      <span className="text-pink-300 font-medium">✨ new story update</span>
                    ) : currentChat.isOnline ? (
                      <span className="text-emerald-400 font-medium">online</span>
                    ) : (
                      'last seen recently'
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Right Action Icons: Video, Voice, Scam Check */}
        <div className="flex items-center gap-1 text-white">
          <button
            onClick={() =>
              startCall(
                currentChat.name,
                currentChat.phone || '+234 800 000 0000',
                currentChat.avatar,
                'video'
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
                currentChat.phone || '+234 800 000 0000',
                currentChat.avatar,
                'voice'
              )
            }
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
            aria-label="Voice Call"
            title="Voice Call"
          >
            <Phone className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={() => setIsScamCheckerModalOpen(true)}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-amber-400"
            title="Check Scam Reputation"
            aria-label="Scam Check"
          >
            <ShieldAlert className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={() => {
              if (window.confirm(`Clear all message history in "${currentChat.name}"?\n\nMessages will be permanently removed from this device.`)) {
                clearChat(currentChat.id);
              }
            }}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/60 hover:text-rose-400"
            title="Clear Chat History (Permanent)"
            aria-label="Clear Chat"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* In-Chat Mini-Catalog Drawer */}
      {showCatalogDrawer && currentChat.catalog && currentChat.catalog.length > 0 && (
        <div className="bg-white dark:bg-[#151329] border-b border-slate-200 dark:border-slate-800 p-3 shadow-md animate-in slide-in-from-top duration-200 shrink-0 max-h-64 overflow-y-auto z-10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
              {currentChat.name} · Catalog ({currentChat.catalog.length} items)
            </span>
            <button
              onClick={() => setShowCatalogDrawer(false)}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Done
            </button>
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
                  className="w-14 h-14 rounded-lg object-cover shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {product.title}
                  </h4>
                  <div className="text-xs font-bold font-mono text-indigo-600 dark:text-indigo-400">
                    {formatPrice(product.price, product.currency)}
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <button
                      onClick={() => {
                        setShowCatalogDrawer(false);
                        openCheckout(product);
                      }}
                      className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[11px] font-semibold transition-colors"
                    >
                      Buy in Chat
                    </button>
                    <span className="text-[10px] text-slate-400">
                      Escrow Vault
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Message Feed */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-2 space-y-2.5 overscroll-contain w-full min-w-0"
      >
        {/* Date Divider */}
        <div className="flex justify-center my-2">
          <span className="text-[11px] bg-white/80 dark:bg-[#1a172e]/80 backdrop-blur-xs text-slate-600 dark:text-slate-400 px-3 py-1 rounded-md shadow-2xs font-medium">
            TODAY
          </span>
        </div>

        {currentMessages.map((msg: ChatMessage) => {
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

          const activeTransLang = translatedMessages[msg.id] || language;
          const translatedBody = msg.translatedText?.[activeTransLang] || msg.text;

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`group max-w-[85%] sm:max-w-[75%] rounded-2xl px-3.5 py-2 shadow-2xs transition-all relative break-words break-all [overflow-wrap:anywhere] min-w-0 ${
                  isUser
                    ? 'bg-[#e0e7ff] dark:bg-[#312e81] text-[#1e1b4b] dark:text-white rounded-tr-none'
                    : 'bg-white dark:bg-[#1a172e] text-slate-900 dark:text-slate-100 rounded-tl-none border border-slate-200/60 dark:border-slate-800'
                }`}
              >
                {/* Quoted Reply Preview */}
                {msg.replyTo && (
                  <div className="mb-2 p-2 rounded-xl bg-black/10 dark:bg-white/10 border-l-3 border-purple-500 text-xs">
                    <div className="font-bold text-purple-700 dark:text-purple-300 text-[10px]">
                      {msg.replyTo.sender}
                    </div>
                    <div className="text-slate-600 dark:text-slate-300 truncate text-[11px] break-words break-all [overflow-wrap:anywhere]">
                      {msg.replyTo.text}
                    </div>
                  </div>
                )}

                {/* Message Quick Action Menu (Hover on desktop / tap on mobile) */}
                <div className={`absolute -top-3.5 ${isUser ? 'right-0' : 'left-0'} hidden group-hover:flex items-center gap-1 bg-white dark:bg-[#1a172e] px-2 py-0.5 rounded-full shadow-md border border-slate-200 dark:border-slate-800 z-10 animate-in fade-in`}>
                  {['👍', '❤️', '😂', '🔥'].map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => activeChatId && reactToMessage(activeChatId, msg.id, em)}
                      className="p-0.5 hover:scale-125 transition-transform text-xs"
                    >
                      {em}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setReplyingTo(msg)}
                    className="p-1 text-slate-400 hover:text-purple-500 hover:scale-110 transition-all"
                    title="Reply"
                  >
                    <Reply className="w-3 h-3" />
                  </button>
                  {msg.text && (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(msg.text || '');
                        setToastNotice('Message copied!');
                        setTimeout(() => setToastNotice(null), 2000);
                      }}
                      className="p-1 text-slate-400 hover:text-indigo-500 hover:scale-110 transition-all"
                      title="Copy"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  )}
                  {isUser && (
                    <button
                      type="button"
                      onClick={() => activeChatId && deleteMessage(activeChatId, msg.id)}
                      className="p-1 text-slate-400 hover:text-rose-500 hover:scale-110 transition-all"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
                {/* Text Message */}
                {msg.type === 'text' && (
                  <div>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words break-all [overflow-wrap:anywhere] min-w-0">
                      {translatedBody}
                    </p>

                    {msg.translatedText && (
                      <div className="mt-1 flex items-center justify-start text-[10px] text-slate-500 dark:text-slate-400">
                        <button
                          onClick={() => toggleTranslation(msg.id, language === 'pcm' ? 'en' : 'pcm')}
                          className="flex items-center gap-1 hover:underline"
                        >
                          <Languages className="w-3 h-3" />
                          <span>
                            {activeTransLang === 'pcm' ? 'English' : 'Pidgin translation'}
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Image Message */}
                {msg.type === 'image' && (
                  <div className="space-y-1">
                    <div className="overflow-hidden rounded-xl">
                      <img
                        src={msg.imageUrl}
                        alt="Shared media"
                        referrerPolicy="no-referrer"
                        className="w-full max-h-64 object-cover"
                      />
                    </div>
                    {msg.text && (
                      <p className="text-sm leading-relaxed pt-1">{msg.text}</p>
                    )}
                  </div>
                )}

                {/* Voice Note Message */}
                {msg.type === 'voice' && msg.voiceNote && (
                  <div className="space-y-2 min-w-[220px]">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleVoicePlayback(msg.id)}
                        className="w-10 h-10 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shrink-0 transition-colors shadow-xs"
                        aria-label="Play voice note"
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
                          <span>0:{msg.voiceNote.durationSeconds < 10 ? `0${msg.voiceNote.durationSeconds}` : msg.voiceNote.durationSeconds}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-1 border-t border-black/5 dark:border-white/5 text-xs text-slate-600 dark:text-slate-300 italic">
                      &ldquo;{msg.voiceNote.translations[activeTransLang] || msg.voiceNote.transcript}&rdquo;
                    </div>
                  </div>
                )}

                {/* Product Card Message */}
                {msg.type === 'product_card' && msg.product && (
                  <div className="space-y-2 min-w-[240px]">
                    <div className="rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800">
                      <img
                        src={msg.product.imageUrl}
                        alt={msg.product.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-40 object-cover"
                      />
                    </div>

                    <div>
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
                )}

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
                {msg.type === 'financial_poll' && msg.financialPoll && (
                  <div className="space-y-2.5 min-w-[260px] p-1">
                    <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-1.5">
                      <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold text-xs">
                        <Vote className="w-4 h-4" />
                        <span>Financial Stake Poll</span>
                      </div>
                      <span className="font-mono text-[10px] bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold px-2 py-0.5 rounded-full">
                        ₦{(msg.financialPoll.stakePerVote / 1000).toFixed(0)}k Stake/Vote
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 leading-snug">
                        {msg.financialPoll.title}
                      </h4>
                      <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-2">
                        <span>Total Pot: <strong className="font-mono text-emerald-600">₦{msg.financialPoll.totalStakeLocked.toLocaleString()}</strong></span>
                        <span>·</span>
                        <span>{msg.financialPoll.totalVoters} Voters Committed</span>
                      </div>
                    </div>

                    {/* Options voting list */}
                    <div className="space-y-1.5">
                      {msg.financialPoll.options.map((opt) => {
                        const isVoted = msg.financialPoll?.userVotedOptionId === opt.id;
                        const percentage = msg.financialPoll?.totalVoters
                          ? Math.round((opt.votesCount / msg.financialPoll.totalVoters) * 100)
                          : 0;

                        return (
                          <div
                            key={opt.id}
                            onClick={() => voteOnFinancialPoll(activeChatId!, msg.financialPoll!.id, opt.id)}
                            className={`p-2 rounded-xl border cursor-pointer relative overflow-hidden transition-all ${
                              isVoted
                                ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/50'
                                : 'border-slate-200 dark:border-slate-700 hover:bg-black/5 dark:hover:bg-white/5'
                            }`}
                          >
                            {/* Vote % fill bar */}
                            <div
                              style={{ width: `${percentage}%` }}
                              className={`absolute inset-y-0 left-0 opacity-15 ${
                                isVoted ? 'bg-indigo-600' : 'bg-slate-400'
                              }`}
                            />
                            <div className="relative flex items-center justify-between text-xs z-10">
                              <span className="font-medium truncate pr-2">
                                {isVoted && '✓ '} {opt.text}
                              </span>
                              <span className="font-mono font-bold shrink-0">
                                {opt.votesCount} ({percentage}%)
                              </span>
                            </div>
                            {opt.voterNames.length > 0 && (
                              <div className="relative text-[9px] text-slate-400 mt-1 truncate z-10 font-mono">
                                Voters: {opt.voterNames.join(', ')}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="text-[10px] text-slate-400 text-center font-mono">
                      🔒 Voting automatically locks {formatPrice(msg.financialPoll.stakePerVote, 'NGN')} in escrow.
                    </div>
                  </div>
                )}

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
                        Pot Pot: <strong className="font-mono text-emerald-600 text-xs">₦{msg.ajoGroup.totalPoolPerRound.toLocaleString()}</strong> · Next Payout: {msg.ajoGroup.nextPayoutDate}
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

                {/* Timestamp & WhatsApp-Style Delivery Ticks (Single grey = sent/offline, Double grey = delivered, Double colored = read) */}
                <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                  <span>{msg.timestamp}</span>
                  {isUser && (
                    <span title={msg.status === 'read' ? 'Read' : msg.status === 'delivered' ? 'Delivered' : 'Sent (1 check until delivered)'}>
                      {msg.status === 'read' ? (
                        <CheckCheck className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                      ) : msg.status === 'delivered' ? (
                        <CheckCheck className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                      ) : (
                        <Check className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Attachment popover with all 8 African Super-App Features */}
      {showAttachMenu && (
        <div className="mx-3 mb-2 p-3 bg-white dark:bg-[#1a172e] rounded-2xl shadow-xl grid grid-cols-4 gap-2 text-center text-xs animate-in slide-in-from-bottom-2 shrink-0 z-20 border border-slate-200 dark:border-slate-800">
          {/* 0. Photo & Media Gallery */}
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

                    {/* Errand & Market Shopping */}
          <button
            type="button"
            onClick={() => {
              setShowAttachMenu(false);
              setIsErrandsModalOpen(true);
            }}
            className="flex flex-col items-center p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
          >
            <div className="w-9 h-9 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-1">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <span className="text-[10px] leading-tight font-bold text-purple-500 dark:text-purple-300">Errands</span>
          </button>
          {/* 1. Meme & Sticker Studio */}
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

          {/* 2. Automated Invoice & Receipt */}
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

          {/* 3. Financial Stake Poll */}
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

          {/* 4. Ajo / Esusu Savings */}
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

          {/* 5. Street Radio Space */}
          <button
            type="button"
            onClick={() => {
              setShowAttachMenu(false);
              joinAudioSpace(audioSpaces[0]);
            }}
            className="flex flex-col items-center p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
          >
            <div className="w-9 h-9 rounded-full bg-rose-100 dark:bg-rose-900/60 text-rose-600 flex items-center justify-center mb-1">
              <Radio className="w-4 h-4" />
            </div>
            <span className="text-[10px] leading-tight">Street Radio</span>
          </button>

          {/* 6. Scam Checker */}
          <button
            type="button"
            onClick={() => {
              setShowAttachMenu(false);
              if (currentChat.phone) checkEntityReputation(currentChat.phone);
              setIsScamCheckerModalOpen(true);
            }}
            className="flex flex-col items-center p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
          >
            <div className="w-9 h-9 rounded-full bg-rose-100 dark:bg-rose-900/60 text-rose-600 flex items-center justify-center mb-1">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <span className="text-[10px] leading-tight">Scam Check</span>
          </button>

          {/* 7. Catalog / Escrow */}
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

          {/* 8. Escrow Direct Deal */}
          <button
            type="button"
            onClick={() => {
              setShowAttachMenu(false);
              if (currentChat.catalog && currentChat.catalog[0]) {
                openCheckout(currentChat.catalog[0]);
              } else {
                alert('No catalog product in this chat yet. Use catalog button to attach goods.');
              }
            }}
            className="flex flex-col items-center p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
          >
            <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 flex items-center justify-center mb-1">
              <Lock className="w-4 h-4" />
            </div>
            <span className="text-[10px] leading-tight">Escrow Deal</span>
          </button>

          {/* 9. Wallpaper & Text Scale */}
          <button
            type="button"
            onClick={() => {
              setShowAttachMenu(false);
              setIsDisplayModalOpen(true);
            }}
            className="flex flex-col items-center p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
          >
            <div className="w-9 h-9 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-1">
              <Image className="w-4 h-4" />
            </div>
            <span className="text-[10px] leading-tight">Wallpaper</span>
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

      {/* Input Bar */}
      <div className="px-2 py-2 bg-transparent shrink-0 flex items-center gap-1.5 z-20">
        <div className="flex-1 flex items-center bg-slate-100 dark:bg-neutral-900 rounded-full px-3 py-1.5 shadow-2xs border border-slate-200/60 dark:border-neutral-800">
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
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Message"
            className="flex-1 min-w-0 px-2 py-1 bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
          />

          <button
            onClick={() => setShowAttachMenu(!showAttachMenu)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
          >
            <Paperclip className="w-5 h-5" />
          </button>
        </div>

        {inputText.trim() ? (
          <button
            onClick={handleSend}
            className="w-11 h-11 rounded-full bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center shadow-md shadow-purple-600/30 transition-colors shrink-0"
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

      {/* Display & Chat Wallpaper Modal */}
      <DisplayWallpaperModal
        isOpen={isDisplayModalOpen}
        onClose={() => setIsDisplayModalOpen(false)}
      />

      {/* AGC Contact Info Profile Modal */}
      <ContactProfileModal
        chat={currentChat}
        isOpen={isContactProfileOpen}
        onClose={() => setIsContactProfileOpen(false)}
        onOpenThemeModal={() => setIsDisplayModalOpen(true)}
      />
    </div>
  );
};
