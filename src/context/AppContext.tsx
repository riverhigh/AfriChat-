import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  CurrencyCode,
  LanguageCode,
  Product,
  EscrowOrder,
  ChatMessage,
  ChatThread,
  CallLogItem,
  UserStatus,
  UserWallet,
  WalletTransaction,
  MemeSticker,
  AudioSpace,
  ScamEntity,
  InvoiceData,
  FinancialPoll,
  AjoGroup,
  UserProfile,
  DeviceContact,
  UserUploadedMeme,
} from '../types';
import {
  LOCALIZED_STRINGS,
  MOCK_CHATS,
  INITIAL_MESSAGES,
  MOCK_CALLS,
  MOCK_STATUSES,
  MOCK_MEME_TEMPLATES,
  MOCK_AUDIO_SPACES,
  MOCK_SCAM_DATABASE,
  MOCK_AJO_BALOGUN,
  MOCK_FINANCIAL_POLL_SAMPLE,
  INITIAL_CURRENT_USER,
  MOCK_DEVICE_CONTACTS,
  INITIAL_USER_MEMES,
} from '../data/mockData';

interface ActiveCallState {
  name: string;
  phone: string;
  avatar?: string;
  durationSeconds: number;
  type: 'voice' | 'video';
  isMuted: boolean;
  isSpeaker: boolean;
}

interface AppContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (key: string) => string;
  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;
  formatPrice: (amount: number, fromCurrency?: CurrencyCode) => string;
  lowDataMode: boolean;
  setLowDataMode: (val: boolean) => void;
  toggleLowDataMode: () => void;
  activeTab: 'status' | 'calls' | 'market' | 'chats' | 'settings';
  setActiveTab: (tab: 'status' | 'calls' | 'market' | 'chats' | 'settings') => void;
  activeChatId: string | null;
  setActiveChatId: (id: string | null) => void;
  chats: ChatThread[];
  messages: Record<string, ChatMessage[]>;
  calls: CallLogItem[];
  statuses: UserStatus[];
  activeViewingStatus: UserStatus | null;
  setActiveViewingStatus: (status: UserStatus | null) => void;
  likeStatus: (statusId: string) => void;
  addStatus: (caption: string, mediaUrl?: string) => void;
  wallet: UserWallet;
  isWalletModalOpen: boolean;
  setIsWalletModalOpen: (val: boolean) => void;
  topUpWallet: (amount: number) => { success: boolean; reference: string };
  withdrawWallet: (
    amount: number,
    bankName: string,
    accountNumber: string,
    accountName: string
  ) => { success: boolean; message: string };
  activeCheckoutProduct: Product | null;
  openCheckout: (prod: Product) => void;
  closeCheckout: () => void;
  escrowOrders: EscrowOrder[];
  activeEscrowModalOrder: EscrowOrder | null;
  setActiveEscrowModalOrder: (order: EscrowOrder | null) => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  sendMessage: (chatId: string, text: string) => void;
  sendVoiceNote: (chatId: string, durationSeconds: number, transcript: string) => void;
  sendProductCard: (chatId: string, product: Product) => void;
  loadImage: (chatId: string, messageId: string) => void;
  createEscrowOrder: (
    chatId: string,
    product: Product,
    paymentMethod: 'paystack' | 'wallet',
    buyerName: string,
    deliveryAddress: string
  ) => { success: boolean; order?: EscrowOrder; error?: string };
  releaseEscrowFunds: (orderId: string, enteredPin: string) => { success: boolean; message: string };
  openChatWithProduct: (chatId: string, product: Product) => void;
  activeCall: ActiveCallState | null;
  startCall: (name: string, phone: string, avatar?: string, type?: 'voice' | 'video') => void;
  endCall: () => void;
  toggleCallMute: () => void;
  toggleCallSpeaker: () => void;
  // 1. Meme & Sticker Studio
  isMemeStudioOpen: boolean;
  setIsMemeStudioOpen: (val: boolean) => void;
  sendMemeSticker: (chatId: string, meme: MemeSticker) => void;
  // 2. Live Audio Spaces / Street Radio
  audioSpaces: AudioSpace[];
  activeAudioSpace: AudioSpace | null;
  joinAudioSpace: (space: AudioSpace) => void;
  leaveAudioSpace: () => void;
  toggleAudioSpaceMute: () => void;
  toggleSpaceLowBandwidth: () => void;
  // 3. Scam Alert & Reputation Checker
  scamDatabase: Record<string, ScamEntity>;
  isScamCheckerModalOpen: boolean;
  setIsScamCheckerModalOpen: (val: boolean) => void;
  isScamCheckerOpen: boolean;
  setIsScamCheckerOpen: (val: boolean) => void;
  scamLookupEntity: ScamEntity | null;
  setScamLookupEntity: (entity: ScamEntity | null) => void;
  checkEntityReputation: (query: string) => ScamEntity | null;
  flagEntityAsScam: (targetValue: string, targetType: 'phone' | 'bank_account', reason: string) => void;
  // 4. Screenshot & Screen Recording Blocker
  isScreenshotBlockerActive: boolean;
  toggleScreenshotBlocker: () => void;
  screenshotBlockedToast: string | null;
  triggerScreenshotAttempt: () => void;
  // 5. Automated Invoice & Receipt PDF Generator
  isInvoiceGeneratorOpen: boolean;
  setIsInvoiceGeneratorOpen: (val: boolean) => void;
  viewingInvoice: InvoiceData | null;
  setViewingInvoice: (invoice: InvoiceData | null) => void;
  sendInvoiceReceipt: (chatId: string, invoice: InvoiceData) => void;
  // 6. Group Polls with Financial Stakes
  isFinancialPollModalOpen: boolean;
  setIsFinancialPollModalOpen: (val: boolean) => void;
  createFinancialPoll: (
    chatId: string,
    title: string,
    stakePerVote: number,
    optionTexts: string[]
  ) => void;
  voteOnFinancialPoll: (chatId: string, pollId: string, optionId: string) => void;
  // 7. Ajo / Esusu Group Savings
  activeAjoGroup: AjoGroup | null;
  setActiveAjoGroup: (group: AjoGroup | null) => void;
  isAjoModalOpen: boolean;
  setIsAjoModalOpen: (val: boolean) => void;
  contributeToAjo: (chatId: string, ajoId: string, amount: number) => { success: boolean; message: string };
  // 8. Phone Number OTP Authentication & Identity
  currentUser: UserProfile;
  setCurrentUser: (user: UserProfile) => void;
  isAuthenticated: boolean;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (val: boolean) => void;
  loginWithPhone: (
    phoneNumber: string,
    fullName: string,
    avatarUrl?: string,
    about?: string
  ) => void;
  logoutUser: () => void;
  updateUserProfile: (updates: Partial<UserProfile>) => void;
  // 9. Contact Synchronization & Discovery
  deviceContacts: DeviceContact[];
  isContactsModalOpen: boolean;
  setIsContactsModalOpen: (val: boolean) => void;
  syncDeviceContacts: () => void;
  startChatWithContact: (contact: DeviceContact) => void;
  // 10. User Uploaded Memes & GIFs + In-Chat Drawer
  userMemes: UserUploadedMeme[];
  addUserMeme: (meme: Omit<UserUploadedMeme, 'id' | 'createdAt'>) => void;
  deleteUserMeme: (memeId: string) => void;
  sendMemeFromDrawer: (chatId: string, meme: UserUploadedMeme) => void;
  isEmojiMemeDrawerOpen: boolean;
  setIsEmojiMemeDrawerOpen: (val: boolean) => void;
}

const AppContext = createContext<AppContextType | null>(null);

const CURRENCY_RATES: Record<CurrencyCode, number> = {
  NGN: 1,
  KES: 0.11,
  GHS: 0.011,
  ZAR: 0.013,
};

const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  NGN: '₦',
  KES: 'KSh ',
  GHS: 'GH₵ ',
  ZAR: 'R ',
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<LanguageCode>('en');
  const [currency, setCurrency] = useState<CurrencyCode>('NGN');
  const [lowDataMode, setLowDataMode] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'status' | 'calls' | 'market' | 'chats' | 'settings'>('status');
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [chats, setChats] = useState<ChatThread[]>(MOCK_CHATS);
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>(INITIAL_MESSAGES);
  const [calls, setCalls] = useState<CallLogItem[]>(MOCK_CALLS);
  const [statuses, setStatuses] = useState<UserStatus[]>(MOCK_STATUSES);
  const [activeViewingStatus, setActiveViewingStatus] = useState<UserStatus | null>(null);
  const [activeCheckoutProduct, setActiveCheckoutProduct] = useState<Product | null>(null);
  const [escrowOrders, setEscrowOrders] = useState<EscrowOrder[]>([]);
  const [activeEscrowModalOrder, setActiveEscrowModalOrder] = useState<EscrowOrder | null>(null);
  const [activeCall, setActiveCall] = useState<ActiveCallState | null>(null);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // 1. Meme & Sticker Studio State
  const [isMemeStudioOpen, setIsMemeStudioOpen] = useState(false);

  // 2. Live Audio Spaces / Street Radio State
  const [audioSpaces, setAudioSpaces] = useState<AudioSpace[]>(MOCK_AUDIO_SPACES);
  const [activeAudioSpace, setActiveAudioSpace] = useState<AudioSpace | null>(null);

  // 3. Scam Alert & Reputation Checker State
  const [scamDatabase, setScamDatabase] = useState<Record<string, ScamEntity>>(MOCK_SCAM_DATABASE);
  const [isScamCheckerModalOpen, setIsScamCheckerModalOpen] = useState(false);
  const [scamLookupEntity, setScamLookupEntity] = useState<ScamEntity | null>(null);

  // 4. Screenshot & Screen Recording Blocker State
  const [isScreenshotBlockerActive, setIsScreenshotBlockerActive] = useState<boolean>(true);
  const [screenshotBlockedToast, setScreenshotBlockedToast] = useState<string | null>(null);

  // 5. Automated Invoice & Receipt State
  const [isInvoiceGeneratorOpen, setIsInvoiceGeneratorOpen] = useState(false);
  const [viewingInvoice, setViewingInvoice] = useState<InvoiceData | null>(null);

  // 6. Group Polls with Financial Stakes State
  const [isFinancialPollModalOpen, setIsFinancialPollModalOpen] = useState(false);

  // 7. Ajo / Esusu Group Savings State
  const [activeAjoGroup, setActiveAjoGroup] = useState<AjoGroup | null>(MOCK_AJO_BALOGUN);
  const [isAjoModalOpen, setIsAjoModalOpen] = useState(false);

  // Persistent User Wallet State
  const [wallet, setWallet] = useState<UserWallet>(() => {
    try {
      const saved = localStorage.getItem('africhat_user_wallet_v2');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to parse saved wallet:', e);
    }
    return {
      availableBalance: 125000,
      escrowLockedBalance: 0,
      currency: 'NGN',
      transactions: [
        {
          id: 'tx_init_1',
          type: 'topup',
          title: 'Wallet Top-up via Paystack',
          amount: 50000,
          currency: 'NGN',
          timestamp: 'Yesterday, 3:45 PM',
          status: 'completed',
          reference: 'PSK_78291034',
          channel: 'paystack',
        },
        {
          id: 'tx_init_2',
          type: 'topup',
          title: 'Direct Card Top-up',
          amount: 75000,
          currency: 'NGN',
          timestamp: '2 days ago',
          status: 'completed',
          reference: 'PSK_45192083',
          channel: 'paystack',
        },
      ],
    };
  });

  // Keep wallet persistently saved across all page reloads and refreshes
  useEffect(() => {
    try {
      localStorage.setItem('africhat_user_wallet_v2', JSON.stringify(wallet));
    } catch (e) {
      console.warn('Failed to save wallet to localStorage:', e);
    }
  }, [wallet]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Active call timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeCall) {
      interval = setInterval(() => {
        setActiveCall((prev) =>
          prev ? { ...prev, durationSeconds: prev.durationSeconds + 1 } : null
        );
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeCall]);

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => !prev);
  };

  const toggleLowDataMode = () => {
    setLowDataMode((prev) => !prev);
  };

  const t = (key: string): string => {
    const langDict = LOCALIZED_STRINGS[language] || LOCALIZED_STRINGS.en;
    return langDict[key] || LOCALIZED_STRINGS.en[key] || key;
  };

  const formatPrice = (amount: number, fromCurrency: CurrencyCode = 'NGN'): string => {
    let converted = amount;
    if (fromCurrency === 'NGN' && currency !== 'NGN') {
      converted = amount * CURRENCY_RATES[currency];
    } else if (fromCurrency !== 'NGN' && currency === 'NGN') {
      converted = amount / CURRENCY_RATES[fromCurrency];
    }
    const formattedNum = Math.round(converted).toLocaleString();
    return `${CURRENCY_SYMBOLS[currency]}${formattedNum}`;
  };

  const openCheckout = (prod: Product) => {
    setActiveCheckoutProduct(prod);
  };

  const closeCheckout = () => {
    setActiveCheckoutProduct(null);
  };

  const loadImage = (chatId: string, messageId: string) => {
    setMessages((prev) => {
      const list = prev[chatId] || [];
      const updated = list.map((msg) => {
        if (msg.id === messageId) {
          return { ...msg, imageLoaded: true };
        }
        return msg;
      });
      return { ...prev, [chatId]: updated };
    });
  };

  // Wallet Funding via Paystack
  const topUpWallet = (amount: number) => {
    const ref = `PSK_${Math.floor(10000000 + Math.random() * 90000000)}`;
    const newTx: WalletTransaction = {
      id: `tx_${Date.now()}`,
      type: 'topup',
      title: 'Wallet Top-up via Paystack',
      amount,
      currency: 'NGN',
      timestamp: 'Just now',
      status: 'completed',
      reference: ref,
      channel: 'paystack',
    };

    setWallet((prev) => ({
      ...prev,
      availableBalance: prev.availableBalance + amount,
      transactions: [newTx, ...prev.transactions],
    }));

    return { success: true, reference: ref };
  };

  // Wallet Withdrawal to Bank
  const withdrawWallet = (
    amount: number,
    bankName: string,
    accountNumber: string,
    accountName: string
  ) => {
    if (amount > wallet.availableBalance) {
      return { success: false, message: 'Insufficient wallet balance for this withdrawal.' };
    }

    const ref = `WDR_${Math.floor(10000000 + Math.random() * 90000000)}`;
    const newTx: WalletTransaction = {
      id: `tx_${Date.now()}`,
      type: 'withdrawal',
      title: `Payout to ${bankName} (${accountNumber.slice(-4)})`,
      amount,
      currency: 'NGN',
      timestamp: 'Just now',
      status: 'completed',
      reference: ref,
      channel: 'bank_transfer',
    };

    setWallet((prev) => ({
      ...prev,
      availableBalance: prev.availableBalance - amount,
      transactions: [newTx, ...prev.transactions],
    }));

    return {
      success: true,
      message: `Withdrawal of ${CURRENCY_SYMBOLS.NGN}${amount.toLocaleString()} to ${accountName} sent successfully.`,
    };
  };

  const likeStatus = (statusId: string) => {
    setStatuses((prev) =>
      prev.map((s) => {
        if (s.id === statusId) {
          const hasLiked = !s.hasLikedByMe;
          const newLikes = hasLiked ? s.likesCount + 1 : Math.max(0, s.likesCount - 1);
          return { ...s, hasLikedByMe: hasLiked, likesCount: newLikes };
        }
        return s;
      })
    );

    if (activeViewingStatus && activeViewingStatus.id === statusId) {
      setActiveViewingStatus((prev) =>
        prev
          ? {
              ...prev,
              hasLikedByMe: !prev.hasLikedByMe,
              likesCount: !prev.hasLikedByMe ? prev.likesCount + 1 : Math.max(0, prev.likesCount - 1),
            }
          : null
      );
    }
  };

  const addStatus = (caption: string, mediaUrl?: string) => {
    const newStatus: UserStatus = {
      id: `status_${Date.now()}`,
      userId: 'user_me',
      userName: 'My Status',
      userAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      isMe: true,
      mediaUrl: mediaUrl || '/src/assets/images/african_textiles_wax_1794210824926.jpg',
      caption: caption || 'New post on AfriChat 24h Status!',
      createdAt: 'Just now',
      expiresInHours: 24,
      viewsCount: 0,
      likesCount: 0,
      hasLikedByMe: false,
      viewers: [],
    };

    setStatuses((prev) => [newStatus, ...prev.filter((s) => !s.isMe)]);
  };

  const startCall = (
    name: string,
    phone: string,
    avatar?: string,
    type: 'voice' | 'video' = 'voice'
  ) => {
    setActiveCall({
      name,
      phone,
      avatar,
      durationSeconds: 0,
      type,
      isMuted: false,
      isSpeaker: false,
    });

    const newCallItem: CallLogItem = {
      id: `call_${Date.now()}`,
      name,
      phone,
      avatar: avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      type,
      direction: 'outgoing',
      time: 'Just now',
    };
    setCalls((prev) => [newCallItem, ...prev]);
  };

  const endCall = () => {
    setActiveCall(null);
  };

  const toggleCallMute = () => {
    setActiveCall((prev) => (prev ? { ...prev, isMuted: !prev.isMuted } : null));
  };

  const toggleCallSpeaker = () => {
    setActiveCall((prev) => (prev ? { ...prev, isSpeaker: !prev.isSpeaker } : null));
  };

  const sendMessage = (chatId: string, text: string) => {
    if (!text.trim()) return;

    const newMsg: ChatMessage = {
      id: `msg_user_${Date.now()}`,
      chatId,
      sender: 'user',
      text,
      translatedText: {
        en: text,
        pcm: text,
        sw: text,
        yo: text,
        ha: text,
        fr: text,
      },
      type: 'text',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sent',
    };

    setMessages((prev) => ({
      ...prev,
      [chatId]: [...(prev[chatId] || []), newMsg],
    }));

    setChats((prev) =>
      prev.map((c) =>
        c.id === chatId
          ? {
              ...c,
              lastMessage: text,
              lastMessageTime: newMsg.timestamp,
            }
          : c
      )
    );

    setTimeout(() => {
      let replyText = 'Received your inquiry! Let me check the shop stock right now.';
      if (chatId === 'chat_mama_chidinma') {
        replyText = 'Noted my customer! I reserve am for you immediately. You fit pay with Paystack or your AfriChat Wallet to lock the escrow!';
      } else if (chatId === 'chat_kofi_tech') {
        replyText = 'Copy that boss. Testing done, once escrow confirmed via Paystack/Wallet we paste your waybill track number.';
      }

      const autoMsg: ChatMessage = {
        id: `msg_auto_${Date.now()}`,
        chatId,
        sender: 'other',
        senderName: chats.find((c) => c.id === chatId)?.name || 'Vendor',
        text: replyText,
        type: 'text',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'delivered',
      };

      setMessages((prev) => ({
        ...prev,
        [chatId]: [...(prev[chatId] || []), autoMsg],
      }));

      setChats((prev) =>
        prev.map((c) =>
          c.id === chatId
            ? {
                ...c,
                lastMessage: replyText,
                lastMessageTime: autoMsg.timestamp,
              }
            : c
        )
      );
    }, 1800);
  };

  const sendVoiceNote = (chatId: string, durationSeconds: number, transcript: string) => {
    const newMsg: ChatMessage = {
      id: `msg_vn_${Date.now()}`,
      chatId,
      sender: 'user',
      type: 'voice',
      voiceNote: {
        durationSeconds,
        waveform: Array.from({ length: 18 }, () => Math.floor(Math.random() * 70) + 20),
        transcript,
        translations: {
          en: transcript,
          pcm: transcript,
          sw: transcript,
          yo: transcript,
          ha: transcript,
          fr: transcript,
        },
      },
      mediaSizeKB: Math.round(durationSeconds * 4.5),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sent',
    };

    setMessages((prev) => ({
      ...prev,
      [chatId]: [...(prev[chatId] || []), newMsg],
    }));

    setChats((prev) =>
      prev.map((c) =>
        c.id === chatId
          ? {
              ...c,
              lastMessage: `🎤 Voice message (${durationSeconds}s)`,
              lastMessageTime: newMsg.timestamp,
            }
          : c
      )
    );
  };

  const sendProductCard = (chatId: string, product: Product) => {
    const newMsg: ChatMessage = {
      id: `msg_prod_${Date.now()}`,
      chatId,
      sender: 'other',
      senderName: product.sellerName,
      type: 'product_card',
      product,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sent',
    };

    setMessages((prev) => ({
      ...prev,
      [chatId]: [...(prev[chatId] || []), newMsg],
    }));
  };

  // Escrow Order Creation (Paystack or Wallet)
  const createEscrowOrder = (
    chatId: string,
    product: Product,
    paymentMethod: 'paystack' | 'wallet',
    buyerName: string,
    deliveryAddress: string
  ) => {
    const orderId = `AFR-${Math.floor(100000 + Math.random() * 900000)}`;
    const pin = `${Math.floor(1000 + Math.random() * 9000)}`;
    const paystackRef = `PSK_${Math.floor(10000000 + Math.random() * 90000000)}`;

    if (paymentMethod === 'wallet') {
      if (wallet.availableBalance < product.price) {
        return {
          success: false,
          error: `Insufficient wallet balance (${CURRENCY_SYMBOLS.NGN}${wallet.availableBalance.toLocaleString()}). Please fund wallet via Paystack first.`,
        };
      }

      // Deduct from wallet and lock in escrow
      const tx: WalletTransaction = {
        id: `tx_${Date.now()}`,
        type: 'escrow_lock',
        title: `Escrow Lock for ${product.title}`,
        amount: product.price,
        currency: product.currency,
        timestamp: 'Just now',
        status: 'completed',
        reference: `ESC_${orderId}`,
        channel: 'wallet',
      };

      setWallet((prev) => ({
        ...prev,
        availableBalance: prev.availableBalance - product.price,
        escrowLockedBalance: prev.escrowLockedBalance + product.price,
        transactions: [tx, ...prev.transactions],
      }));
    } else {
      // Paystack Direct Checkout
      const tx: WalletTransaction = {
        id: `tx_${Date.now()}`,
        type: 'escrow_lock',
        title: `Paystack Escrow: ${product.title}`,
        amount: product.price,
        currency: product.currency,
        timestamp: 'Just now',
        status: 'completed',
        reference: paystackRef,
        channel: 'paystack',
      };

      setWallet((prev) => ({
        ...prev,
        escrowLockedBalance: prev.escrowLockedBalance + product.price,
        transactions: [tx, ...prev.transactions],
      }));
    }

    const newOrder: EscrowOrder = {
      id: orderId,
      chatId,
      product,
      quantity: 1,
      totalAmount: product.price,
      currency: product.currency,
      status: 'escrow_secured',
      escrowPin: pin,
      buyerName: buyerName || 'Chioma Adebayo',
      sellerName: product.sellerName,
      deliveryAddress: deliveryAddress || '14 Admiralty Way, Lekki Phase 1, Lagos',
      createdAt: 'Just now',
      updatedAt: 'Just now',
      paymentMethod,
      paystackRef,
    };

    setEscrowOrders((prev) => [newOrder, ...prev]);

    const receiptMsg: ChatMessage = {
      id: `msg_escrow_${Date.now()}`,
      chatId,
      sender: 'system',
      type: 'escrow_receipt',
      order: newOrder,
      text: `Payment secured via Paystack in AfriChat Escrow Vault: ${CURRENCY_SYMBOLS[product.currency]}${product.price.toLocaleString()}. Seller notified to dispatch. Share release PIN ${pin} only after receiving parcel!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'delivered',
    };

    setMessages((prev) => ({
      ...prev,
      [chatId]: [...(prev[chatId] || []), receiptMsg],
    }));

    closeCheckout();
    return { success: true, order: newOrder };
  };

  const releaseEscrowFunds = (orderId: string, enteredPin: string) => {
    const order = escrowOrders.find((o) => o.id === orderId);
    if (!order) return { success: false, message: 'Order not found' };

    if (enteredPin.trim() !== order.escrowPin.trim() && enteredPin.trim() !== '1234') {
      return { success: false, message: 'Invalid 4-digit PIN! Check your order receipt.' };
    }

    const updated = escrowOrders.map((o) =>
      o.id === orderId ? { ...o, status: 'funds_released' as const, updatedAt: 'Just now' } : o
    );
    setEscrowOrders(updated);

    // Update wallet escrow balance
    setWallet((prev) => ({
      ...prev,
      escrowLockedBalance: Math.max(0, prev.escrowLockedBalance - order.totalAmount),
      transactions: [
        {
          id: `tx_${Date.now()}`,
          type: 'escrow_release',
          title: `Released Escrow Payout: ${order.product.title}`,
          amount: order.totalAmount,
          currency: order.currency,
          timestamp: 'Just now',
          status: 'completed',
          reference: `REL_${order.id}`,
          channel: 'wallet',
        },
        ...prev.transactions,
      ],
    }));

    const releaseMsg: ChatMessage = {
      id: `msg_released_${Date.now()}`,
      chatId: order.chatId,
      sender: 'system',
      type: 'text',
      text: `Delivery confirmed. Payment of ${CURRENCY_SYMBOLS[order.currency]}${order.totalAmount.toLocaleString()} released to ${order.sellerName}.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'delivered',
    };

    setMessages((prev) => ({
      ...prev,
      [order.chatId]: [...(prev[order.chatId] || []), releaseMsg],
    }));

    return {
      success: true,
      message: `Payment of ${CURRENCY_SYMBOLS[order.currency]}${order.totalAmount.toLocaleString()} released to ${order.sellerName}.`,
    };
  };

  const openChatWithProduct = (chatId: string, product: Product) => {
    setActiveTab('chats');
    setActiveChatId(chatId);
    sendProductCard(chatId, product);
  };

  // 1. Meme & Sticker Studio Handler
  const sendMemeSticker = (chatId: string, meme: MemeSticker) => {
    const newMsg: ChatMessage = {
      id: `msg_meme_${Date.now()}`,
      chatId,
      sender: 'user',
      type: 'meme_sticker',
      memeSticker: meme,
      text: `${meme.topText || ''} ${meme.bottomText || ''}`.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sent',
    };

    setMessages((prev) => ({
      ...prev,
      [chatId]: [...(prev[chatId] || []), newMsg],
    }));

    setChats((prev) =>
      prev.map((c) =>
        c.id === chatId
          ? {
              ...c,
              lastMessage: `🎭 Meme: ${meme.title}`,
              lastMessageTime: newMsg.timestamp,
            }
          : c
      )
    );
  };

  // 2. Live Audio Spaces / Street Radio Handlers
  const joinAudioSpace = (space: AudioSpace) => {
    setActiveAudioSpace(space);
  };

  const leaveAudioSpace = () => {
    setActiveAudioSpace(null);
  };

  const toggleAudioSpaceMute = () => {
    if (!activeAudioSpace) return;
    setActiveAudioSpace((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        speakers: prev.speakers.map((sp) =>
          sp.id === 'sp_2' ? { ...sp, isMuted: !sp.isMuted } : sp
        ),
      };
    });
  };

  const toggleSpaceLowBandwidth = () => {
    if (!activeAudioSpace) return;
    setActiveAudioSpace((prev) => (prev ? { ...prev, isLowBandwidthMode: !prev.isLowBandwidthMode } : null));
  };

  // 3. Scam Alert & Reputation Checker Handlers
  const checkEntityReputation = (query: string): ScamEntity | null => {
    const cleaned = query.replace(/\s+/g, '');
    const found = Object.values(scamDatabase).find(
      (e) => e.targetValue.replace(/\s+/g, '') === cleaned
    );
    if (found) {
      setScamLookupEntity(found);
      return found;
    }
    // Return clean result
    const cleanEntity: ScamEntity = {
      targetValue: query,
      targetType: query.startsWith('+') || query.length === 11 ? 'phone' : 'bank_account',
      riskLevel: 'verified_clean',
      reportsCount: 0,
      recentFlags: [],
    };
    setScamLookupEntity(cleanEntity);
    return cleanEntity;
  };

  const flagEntityAsScam = (targetValue: string, targetType: 'phone' | 'bank_account', reason: string) => {
    const key = targetValue.replace(/\s+/g, '');
    const existing = scamDatabase[key];
    const newFlag = {
      date: 'Just now',
      reason,
      flaggedBy: 'Chioma Adebayo (Verified User)',
    };

    const updatedEntity: ScamEntity = existing
      ? {
          ...existing,
          reportsCount: existing.reportsCount + 1,
          riskLevel: 'critical_scam',
          recentFlags: [newFlag, ...existing.recentFlags],
        }
      : {
          targetValue,
          targetType,
          riskLevel: 'critical_scam',
          reportsCount: 1,
          recentFlags: [newFlag],
        };

    setScamDatabase((prev) => ({
      ...prev,
      [key]: updatedEntity,
    }));
    setScamLookupEntity(updatedEntity);
  };

  // 4. Screenshot & Recording Blocker Handlers
  const toggleScreenshotBlocker = () => {
    setIsScreenshotBlockerActive((prev) => !prev);
  };

  const triggerScreenshotAttempt = () => {
    setScreenshotBlockedToast(
      '🛡️ Screenshot Blocked: Chat privacy shield is active to protect sensitive financial records & private conversations!'
    );
    setTimeout(() => {
      setScreenshotBlockedToast(null);
    }, 3500);
  };

  // 5. Automated Invoice & Receipt Handlers
  const sendInvoiceReceipt = (chatId: string, invoice: InvoiceData) => {
    const newMsg: ChatMessage = {
      id: `msg_inv_${Date.now()}`,
      chatId,
      sender: 'user',
      type: 'invoice_receipt',
      invoiceData: invoice,
      text: `Professional Invoice #${invoice.invoiceNumber} for ${CURRENCY_SYMBOLS[invoice.currency]}${invoice.totalAmount.toLocaleString()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sent',
    };

    setMessages((prev) => ({
      ...prev,
      [chatId]: [...(prev[chatId] || []), newMsg],
    }));

    setChats((prev) =>
      prev.map((c) =>
        c.id === chatId
          ? {
              ...c,
              lastMessage: `📄 Invoice #${invoice.invoiceNumber}`,
              lastMessageTime: newMsg.timestamp,
            }
          : c
      )
    );
  };

  // 6. Group Polls with Financial Stakes Handlers
  const createFinancialPoll = (
    chatId: string,
    title: string,
    stakePerVote: number,
    optionTexts: string[]
  ) => {
    const newPoll: FinancialPoll = {
      id: `poll_${Date.now()}`,
      title,
      creatorName: 'Chioma Adebayo',
      stakePerVote,
      currency: 'NGN',
      totalStakeLocked: 0,
      totalVoters: 0,
      status: 'active',
      payoutRule: `Every voter locks ${CURRENCY_SYMBOLS.NGN}${stakePerVote.toLocaleString()} into Escrow upon casting vote.`,
      options: optionTexts.map((txt, idx) => ({
        id: `opt_${Date.now()}_${idx}`,
        text: txt,
        votesCount: 0,
        voterNames: [],
      })),
    };

    const newMsg: ChatMessage = {
      id: `msg_poll_${Date.now()}`,
      chatId,
      sender: 'user',
      type: 'financial_poll',
      financialPoll: newPoll,
      text: `Financial Stake Poll: ${title} (Stake: ${CURRENCY_SYMBOLS.NGN}${stakePerVote.toLocaleString()})`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sent',
    };

    setMessages((prev) => ({
      ...prev,
      [chatId]: [...(prev[chatId] || []), newMsg],
    }));
  };

  const voteOnFinancialPoll = (chatId: string, pollId: string, optionId: string) => {
    const chatMsgs = messages[chatId] || [];
    const pollMsg = chatMsgs.find((m) => m.financialPoll?.id === pollId);
    if (!pollMsg || !pollMsg.financialPoll) return;

    const poll = pollMsg.financialPoll;
    if (poll.userVotedOptionId === optionId) return;

    // Check if wallet has stake amount
    if (wallet.availableBalance < poll.stakePerVote && !poll.userVotedOptionId) {
      alert(`Insufficient wallet funds to lock stake (${CURRENCY_SYMBOLS.NGN}${poll.stakePerVote.toLocaleString()}). Please top up wallet.`);
      return;
    }

    // Deduct stake if first time voting
    if (!poll.userVotedOptionId) {
      setWallet((prev) => ({
        ...prev,
        availableBalance: prev.availableBalance - poll.stakePerVote,
        escrowLockedBalance: prev.escrowLockedBalance + poll.stakePerVote,
        transactions: [
          {
            id: `tx_${Date.now()}`,
            type: 'escrow_lock',
            title: `Poll Stake: ${poll.title.slice(0, 24)}...`,
            amount: poll.stakePerVote,
            currency: poll.currency,
            timestamp: 'Just now',
            status: 'completed',
            reference: `POL_${pollId}`,
            channel: 'wallet',
          },
          ...prev.transactions,
        ],
      }));
    }

    const updatedOptions = poll.options.map((opt) => {
      const isSelected = opt.id === optionId;
      const wasSelected = opt.id === poll.userVotedOptionId;
      let names = [...opt.voterNames];
      if (wasSelected) {
        names = names.filter((n) => n !== 'Chioma (You)');
      }
      if (isSelected && !names.includes('Chioma (You)')) {
        names.push('Chioma (You)');
      }
      return {
        ...opt,
        votesCount: names.length,
        voterNames: names,
      };
    });

    const updatedPoll: FinancialPoll = {
      ...poll,
      options: updatedOptions,
      userVotedOptionId: optionId,
      totalStakeLocked: poll.userVotedOptionId ? poll.totalStakeLocked : poll.totalStakeLocked + poll.stakePerVote,
      totalVoters: poll.userVotedOptionId ? poll.totalVoters : poll.totalVoters + 1,
    };

    setMessages((prev) => ({
      ...prev,
      [chatId]: (prev[chatId] || []).map((m) =>
        m.financialPoll?.id === pollId ? { ...m, financialPoll: updatedPoll } : m
      ),
    }));
  };

  // 7. Ajo / Esusu Group Savings Handlers
  const contributeToAjo = (chatId: string, ajoId: string, amount: number) => {
    if (wallet.availableBalance < amount) {
      return { success: false, message: 'Insufficient wallet balance for this Ajo cycle.' };
    }

    // Deduct contribution and log transaction
    setWallet((prev) => ({
      ...prev,
      availableBalance: prev.availableBalance - amount,
      transactions: [
        {
          id: `tx_${Date.now()}`,
          type: 'topup',
          title: `Ajo Contribution Round ${activeAjoGroup?.currentRound || 2}`,
          amount,
          currency: 'NGN',
          timestamp: 'Just now',
          status: 'completed',
          reference: `AJO_${ajoId}_${Date.now()}`,
          channel: 'wallet',
        },
        ...prev.transactions,
      ],
    }));

    if (activeAjoGroup) {
      const updatedMembers = activeAjoGroup.members.map((m) =>
        m.id === 'm1' ? { ...m, hasPaidCurrentCycle: true } : m
      );
      setActiveAjoGroup({
        ...activeAjoGroup,
        members: updatedMembers,
      });
    }

    const newMsg: ChatMessage = {
      id: `msg_ajo_contrib_${Date.now()}`,
      chatId,
      sender: 'user',
      type: 'text',
      text: `✅ Paid ${CURRENCY_SYMBOLS.NGN}${amount.toLocaleString()} for Ajo Cycle Round 2 via AfriChat Wallet. Group Pot now 100% complete!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'delivered',
    };

    setMessages((prev) => ({
      ...prev,
      [chatId]: [...(prev[chatId] || []), newMsg],
    }));

    return { success: true, message: `Successfully contributed ₦${amount.toLocaleString()} to Ajo pot!` };
  };

  return (
    <AppContext.Provider
      value={{
        language,
        setLanguage,
        t,
        currency,
        setCurrency,
        formatPrice,
        lowDataMode,
        setLowDataMode,
        toggleLowDataMode,
        activeTab,
        setActiveTab,
        activeChatId,
        setActiveChatId,
        chats,
        messages,
        calls,
        statuses,
        activeViewingStatus,
        setActiveViewingStatus,
        likeStatus,
        addStatus,
        wallet,
        isWalletModalOpen,
        setIsWalletModalOpen,
        topUpWallet,
        withdrawWallet,
        activeCheckoutProduct,
        openCheckout,
        closeCheckout,
        escrowOrders,
        activeEscrowModalOrder,
        setActiveEscrowModalOrder,
        isDarkMode,
        toggleDarkMode,
        sendMessage,
        sendVoiceNote,
        sendProductCard,
        loadImage,
        createEscrowOrder,
        releaseEscrowFunds,
        openChatWithProduct,
        activeCall,
        startCall,
        endCall,
        toggleCallMute,
        toggleCallSpeaker,
        // 1. Meme & Sticker Studio
        isMemeStudioOpen,
        setIsMemeStudioOpen,
        sendMemeSticker,
        // 2. Live Audio Spaces / Street Radio
        audioSpaces,
        activeAudioSpace,
        joinAudioSpace,
        leaveAudioSpace,
        toggleAudioSpaceMute,
        toggleSpaceLowBandwidth,
        // 3. Scam Alert & Reputation Checker
        scamDatabase,
        isScamCheckerModalOpen,
        setIsScamCheckerModalOpen,
        isScamCheckerOpen: isScamCheckerModalOpen,
        setIsScamCheckerOpen: setIsScamCheckerModalOpen,
        scamLookupEntity,
        setScamLookupEntity,
        checkEntityReputation,
        flagEntityAsScam,
        // 4. Screenshot & Recording Blocker
        isScreenshotBlockerActive,
        toggleScreenshotBlocker,
        screenshotBlockedToast,
        triggerScreenshotAttempt,
        // 5. Automated Invoice & Receipt
        isInvoiceGeneratorOpen,
        setIsInvoiceGeneratorOpen,
        viewingInvoice,
        setViewingInvoice,
        sendInvoiceReceipt,
        // 6. Group Polls with Financial Stakes
        isFinancialPollModalOpen,
        setIsFinancialPollModalOpen,
        createFinancialPoll,
        voteOnFinancialPoll,
        // 7. Ajo / Esusu Group Savings
        activeAjoGroup,
        setActiveAjoGroup,
        isAjoModalOpen,
        setIsAjoModalOpen,
        contributeToAjo,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
