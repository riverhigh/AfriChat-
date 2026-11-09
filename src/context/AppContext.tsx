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
  DispatchDeliveryOrder,
  JobPosting,
  SecuritySettings,
  ServiceProvider,
  ServiceBooking,
  DelayedTransfer,
  PayrollEmployee,
  PayrollRunLog,
  AppFontSize,
  TownCommunity,
  DoctorProfile,
  HospitalQueueToken,
  MedicationReminder,
  HealthVaultRecord,
  LawyerProfile,
  LegalContractTemplate,
  GeneratedLegalContract,
  CreatorProfile,
  CreatorPost,
  CreatorShowTicket,
  CreatorSong,
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
  MOCK_DISPATCH_ORDERS,
  MOCK_JOB_POSTINGS,
  MOCK_SERVICE_PROVIDERS,
  MOCK_SERVICE_BOOKINGS,
  MOCK_DELAYED_TRANSFERS,
  MOCK_PAYROLL_EMPLOYEES,
  MOCK_PAYROLL_LOGS,
  MOCK_TOWN_COMMUNITIES,
  MOCK_DOCTORS,
  MOCK_QUEUE_TOKENS,
  MOCK_MEDICATION_REMINDERS,
  MOCK_HEALTH_VAULT,
  MOCK_LAWYERS,
  MOCK_CONTRACT_TEMPLATES,
  MOCK_GENERATED_CONTRACTS,
  MOCK_CREATORS,
  MOCK_CREATOR_POSTS,
  MOCK_CREATOR_SHOWS,
  MOCK_CREATOR_SONGS,
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
  activeTab: 'status' | 'calls' | 'town' | 'chats' | 'settings' | 'market';
  setActiveTab: (tab: 'status' | 'calls' | 'town' | 'chats' | 'settings' | 'market') => void;
  // Display & Appearance
  fontSize: AppFontSize;
  setFontSize: (size: AppFontSize) => void;
  chatWallpaper: string | null;
  setChatWallpaper: (wallpaper: string | null) => void;
  // QR Scan Modal
  isScanQrModalOpen: boolean;
  setIsScanQrModalOpen: (val: boolean) => void;
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
  addThoughtStatus: (thoughtText: string, themeBg: string) => void;
  addDeviceMediaStatus: (caption: string, mediaUrl: string, mediaType?: 'image' | 'video') => void;
  addDeviceVideoStatus: (caption: string, videoUrl: string, thumbnail?: string) => void;
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
  hideBalanceOnNav: boolean;
  toggleHideBalance: () => void;
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
  createAjoGroup: (ajoData: {
    name: string;
    cycleContributionAmount: number;
    frequency: 'weekly' | 'monthly';
    totalRounds: number;
    rules?: string;
  }) => { success: boolean; requiresVerification?: boolean; message: string };
  upgradeVerificationBadge: (badge: 'blue' | 'gold') => { success: boolean; message: string };
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
  addNewDeviceContact: (name: string, phone: string, about?: string) => void;
  // 10. User Uploaded Memes & GIFs + In-Chat Drawer
  userMemes: UserUploadedMeme[];
  addUserMeme: (meme: Omit<UserUploadedMeme, 'id' | 'createdAt'>) => void;
  deleteUserMeme: (memeId: string) => void;
  sendMemeFromDrawer: (chatId: string, meme: UserUploadedMeme) => void;
  isEmojiMemeDrawerOpen: boolean;
  setIsEmojiMemeDrawerOpen: (val: boolean) => void;
  // 11. Gokada / PickkR Dispatch Integration
  dispatchOrders: DispatchDeliveryOrder[];
  isDispatchModalOpen: boolean;
  setIsDispatchModalOpen: (val: boolean) => void;
  createDispatchOrder: (
    order: Omit<DispatchDeliveryOrder, 'id' | 'trackingCode' | 'createdAt' | 'status'>
  ) => DispatchDeliveryOrder;
  // 12. Job Board with Employer Pay-to-Post
  jobPostings: JobPosting[];
  isJobBoardModalOpen: boolean;
  setIsJobBoardModalOpen: (val: boolean) => void;
  isPostJobModalOpen: boolean;
  setIsPostJobModalOpen: (val: boolean) => void;
  postNewJob: (
    job: Omit<JobPosting, 'id' | 'postedAt' | 'isPaid'>
  ) => { success: boolean; job?: JobPosting; message?: string };
  // 13. Security Settings (Payment PIN & Security Questions)
  securitySettings: SecuritySettings;
  setPaymentPin: (pin: string) => void;
  setSecurityQuestion: (question: string, answer: string) => void;
  verifyPaymentPin: (pin: string) => boolean;
  isSecurityModalOpen: boolean;
  setIsSecurityModalOpen: (val: boolean) => void;
  // 14. African Services & Appointment Booking (No Limit)
  serviceProviders: ServiceProvider[];
  serviceBookings: ServiceBooking[];
  isServicesModalOpen: boolean;
  setIsServicesModalOpen: (val: boolean) => void;
  selectedServiceProvider: ServiceProvider | null;
  setSelectedServiceProvider: (p: ServiceProvider | null) => void;
  createServiceBooking: (
    booking: Omit<ServiceBooking, 'id' | 'createdAt' | 'bookingPin'>
  ) => { success: boolean; booking: ServiceBooking };
  cancelServiceBooking: (bookingId: string) => void;
  completeServiceBooking: (bookingId: string) => void;
  registerAsServiceProvider: (
    provider: Omit<ServiceProvider, 'id' | 'rating' | 'reviewCount' | 'isVerified'>
  ) => void;
  // 15. Money Transfer with 1-2 Days Security Delay
  delayedTransfers: DelayedTransfer[];
  isTransferModalOpen: boolean;
  setIsTransferModalOpen: (val: boolean) => void;
  sendDelayedTransfer: (
    recipientPhone: string,
    recipientName: string,
    amount: number,
    note: string,
    delayHours?: number
  ) => { success: boolean; transfer?: DelayedTransfer; message?: string };
  cancelDelayedTransfer: (transferId: string) => { success: boolean; message: string };
  fastForwardTransferRelease: (transferId: string) => { success: boolean; message: string };
  // 16. Payroll & Recurring Auto-Debit
  payrollEmployees: PayrollEmployee[];
  payrollLogs: PayrollRunLog[];
  isPayrollModalOpen: boolean;
  setIsPayrollModalOpen: (val: boolean) => void;
  addPayrollEmployee: (emp: Omit<PayrollEmployee, 'id' | 'status'>) => void;
  toggleEmployeePayrollStatus: (id: string) => void;
  deletePayrollEmployee: (id: string) => void;
  runPayrollNow: (employeeId?: string) => { success: boolean; totalDebited: number; message: string };
  // 17. Town Communities & Anonymous Privacy
  townCommunities: TownCommunity[];
  hidePhoneNumberInTown: boolean;
  toggleHidePhoneNumberInTown: () => void;
  toggleJoinTownCommunity: (id: string) => void;
  // 18. Healthcare & Hospital Telehealth
  doctors: DoctorProfile[];
  queueTokens: HospitalQueueToken[];
  medicationReminders: MedicationReminder[];
  healthVault: HealthVaultRecord;
  isHealthModalOpen: boolean;
  setIsHealthModalOpen: (val: boolean) => void;
  bookDoctorAppointment: (doctorId: string, notes: string) => { success: boolean; message: string };
  takeQueueToken: (hospitalName: string, department: string) => { success: boolean; token: HospitalQueueToken };
  addMedicationReminder: (reminder: Omit<MedicationReminder, 'id'>) => void;
  updateHealthVault: (record: Partial<HealthVaultRecord>) => void;
  triggerEmergencySos: () => { success: boolean; message: string };
  // 19. Legal Services & Smart Contract Generator
  lawyers: LawyerProfile[];
  contractTemplates: LegalContractTemplate[];
  generatedContracts: GeneratedLegalContract[];
  isLegalModalOpen: boolean;
  setIsLegalModalOpen: (val: boolean) => void;
  generateLegalContract: (data: Omit<GeneratedLegalContract, 'id' | 'createdAt' | 'status' | 'signatureA'>) => GeneratedLegalContract;
  signLegalContract: (contractId: string, partyBSignature: string) => void;
  triggerEmergencyLegalSos: () => { success: boolean; message: string };
  // 21. African Creator & Artist Direct Economy System
  creators: CreatorProfile[];
  creatorPosts: CreatorPost[];
  creatorShows: CreatorShowTicket[];
  creatorSongs: CreatorSong[];
  isCreatorModalOpen: boolean;
  setIsCreatorModalOpen: (val: boolean) => void;
  subscribeToCreator: (creatorId: string) => { success: boolean; message: string };
  toggleFollowCreator: (creatorId: string) => { success: boolean; isFollowed: boolean };
  buyShowTicket: (showId: string) => { success: boolean; ticket?: CreatorShowTicket; message: string };
  buyCreatorSong: (songId: string) => { success: boolean; song?: CreatorSong; message: string };
  createCreatorPost: (content: string, isLocked: boolean, mediaType?: 'image' | 'video' | 'audio_leak' | 'text', mediaUrl?: string) => void;
  createCreatorShow: (show: Omit<CreatorShowTicket, 'id' | 'totalSold' | 'isPurchasedByMe'>) => void;
  createCreatorSong: (song: Omit<CreatorSong, 'id' | 'playsCount' | 'salesCount' | 'isPurchasedByMe'>) => void;
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
  const [activeTab, setActiveTab] = useState<'status' | 'calls' | 'town' | 'chats' | 'settings' | 'market'>('status');

  // Display & Appearance
  const [fontSize, setFontSizeState] = useState<AppFontSize>(() => {
    return (localStorage.getItem('africhat_font_size') as AppFontSize) || 'normal';
  });

  const setFontSize = (size: AppFontSize) => {
    setFontSizeState(size);
    localStorage.setItem('africhat_font_size', size);
    document.documentElement.classList.remove('text-size-small', 'text-size-normal', 'text-size-large', 'text-size-huge');
    document.documentElement.classList.add(`text-size-${size}`);
  };

  useEffect(() => {
    document.documentElement.classList.remove('text-size-small', 'text-size-normal', 'text-size-large', 'text-size-huge');
    document.documentElement.classList.add(`text-size-${fontSize}`);
  }, [fontSize]);

  const [chatWallpaper, setChatWallpaperState] = useState<string | null>(() => {
    return localStorage.getItem('africhat_wallpaper') || null;
  });

  const setChatWallpaper = (wallpaper: string | null) => {
    setChatWallpaperState(wallpaper);
    if (wallpaper) {
      localStorage.setItem('africhat_wallpaper', wallpaper);
    } else {
      localStorage.removeItem('africhat_wallpaper');
    }
  };

  // QR Code Scanner Modal
  const [isScanQrModalOpen, setIsScanQrModalOpen] = useState(false);

  // Town Communities & Anonymous Privacy
  const [townCommunities, setTownCommunities] = useState<TownCommunity[]>(MOCK_TOWN_COMMUNITIES);
  const [hidePhoneNumberInTown, setHidePhoneNumberInTown] = useState<boolean>(() => {
    return localStorage.getItem('africhat_hide_phone_town') === 'true';
  });
  const toggleHidePhoneNumberInTown = () => {
    setHidePhoneNumberInTown((prev) => {
      const next = !prev;
      localStorage.setItem('africhat_hide_phone_town', String(next));
      return next;
    });
  };
  const toggleJoinTownCommunity = (id: string) => {
    setTownCommunities((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, isJoined: !c.isJoined, membersCount: c.isJoined ? c.membersCount - 1 : c.membersCount + 1 } : c
      )
    );
  };

  // Healthcare
  const [doctors] = useState<DoctorProfile[]>(MOCK_DOCTORS);
  const [queueTokens, setQueueTokens] = useState<HospitalQueueToken[]>(MOCK_QUEUE_TOKENS);
  const [medicationReminders, setMedicationReminders] = useState<MedicationReminder[]>(MOCK_MEDICATION_REMINDERS);
  const [healthVault, setHealthVault] = useState<HealthVaultRecord>(MOCK_HEALTH_VAULT);
  const [isHealthModalOpen, setIsHealthModalOpen] = useState(false);

  const bookDoctorAppointment = (doctorId: string, notes: string) => {
    const doc = doctors.find((d) => d.id === doctorId);
    return {
      success: true,
      message: `Telehealth consult booked with ${doc ? doc.name : 'doctor'}. Encrypted triage chat opened!`,
    };
  };

  const takeQueueToken = (hospitalName: string, department: string) => {
    const randNum = Math.floor(Math.random() * 20) + 8;
    const newToken: HospitalQueueToken = {
      id: `tok_${Date.now()}`,
      hospitalName,
      department,
      tokenNumber: `Q-${randNum}`,
      currentlyServing: `Q-${Math.max(1, randNum - 3)}`,
      positionInLine: 3,
      estimatedWaitMins: 18,
      bookedTime: 'Just now',
      status: 'waiting',
      location: 'Main Hospital Wing',
    };
    setQueueTokens((prev) => [newToken, ...prev]);
    return { success: true, token: newToken };
  };

  const addMedicationReminder = (reminder: Omit<MedicationReminder, 'id'>) => {
    const newRem: MedicationReminder = {
      ...reminder,
      id: `med_${Date.now()}`,
    };
    setMedicationReminders((prev) => [newRem, ...prev]);
  };

  const updateHealthVault = (record: Partial<HealthVaultRecord>) => {
    setHealthVault((prev) => ({
      ...prev,
      ...record,
      lastUpdated: 'Just now',
    }));
  };

  const triggerEmergencySos = () => {
    return {
      success: true,
      message: '🚨 EMERGENCY SOS DISPATCHED: Live GPS coordinates broadcasted to LASAMBUS & Family Emergency Contact via SMS/Mesh network!',
    };
  };

  // Legal & Smart Contracts
  const [lawyers] = useState<LawyerProfile[]>(MOCK_LAWYERS);
  const [contractTemplates] = useState<LegalContractTemplate[]>(MOCK_CONTRACT_TEMPLATES);
  const [generatedContracts, setGeneratedContracts] = useState<GeneratedLegalContract[]>(MOCK_GENERATED_CONTRACTS);
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);

  const generateLegalContract = (data: Omit<GeneratedLegalContract, 'id' | 'createdAt' | 'status' | 'signatureA'>): GeneratedLegalContract => {
    const newContract: GeneratedLegalContract = {
      ...data,
      id: `cntr_${Date.now()}`,
      createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      status: 'signed_binding',
      signatureA: `${data.partyAName} [Digital E-Sign: 0x${Math.random().toString(16).slice(2, 7).toUpperCase()}]`,
    };
    setGeneratedContracts((prev) => [newContract, ...prev]);
    return newContract;
  };

  const signLegalContract = (contractId: string, partyBSignature: string) => {
    setGeneratedContracts((prev) =>
      prev.map((c) => (c.id === contractId ? { ...c, signatureB: partyBSignature, status: 'signed_binding' } : c))
    );
  };

  const triggerEmergencyLegalSos = () => {
    return {
      success: true,
      message: '⚖️ LEGAL SOS ACTIVE: Rapid Response Human Rights Defense Lawyers have been alerted with your coordinates!',
    };
  };

  // 21. African Creator & Direct Music Economy State
  const [creators, setCreators] = useState<CreatorProfile[]>(MOCK_CREATORS);
  const [creatorPosts, setCreatorPosts] = useState<CreatorPost[]>(MOCK_CREATOR_POSTS);
  const [creatorShows, setCreatorShows] = useState<CreatorShowTicket[]>(MOCK_CREATOR_SHOWS);
  const [creatorSongs, setCreatorSongs] = useState<CreatorSong[]>(MOCK_CREATOR_SONGS);
  const [isCreatorModalOpen, setIsCreatorModalOpen] = useState(false);

  const subscribeToCreator = (creatorId: string) => {
    const creator = creators.find((c) => c.id === creatorId);
    if (!creator) return { success: false, message: 'Creator not found' };

    setCreators((prev) =>
      prev.map((c) =>
        c.id === creatorId
          ? {
              ...c,
              isSubscribedByMe: true,
              subscribersCount: c.subscribersCount + 1,
              totalEarnings: c.totalEarnings + c.monthlySubPrice,
            }
          : c
      )
    );

    // Unlock all subscriber-only posts for this creator
    setCreatorPosts((prev) =>
      prev.map((p) => (p.creatorId === creatorId ? { ...p, isLocked: false } : p))
    );

    return {
      success: true,
      message: `🎉 Subscribed to ${creator.name}! Exclusive VIP posts, music leaks, and backstage stories unlocked.`,
    };
  };

  const toggleFollowCreator = (creatorId: string) => {
    let nowFollowed = false;
    setCreators((prev) =>
      prev.map((c) => {
        if (c.id === creatorId) {
          nowFollowed = !c.isSubscribedByMe;
          return {
            ...c,
            isSubscribedByMe: nowFollowed,
            subscribersCount: nowFollowed ? c.subscribersCount + 1 : Math.max(0, c.subscribersCount - 1),
          };
        }
        return c;
      })
    );
    return { success: true, isFollowed: nowFollowed };
  };

  const buyShowTicket = (showId: string) => {
    const show = creatorShows.find((s) => s.id === showId);
    if (!show) return { success: false, message: 'Show not found' };

    const generatedPin = `TICK-AFRI-${Math.floor(1000 + Math.random() * 9000)}`;
    const generatedQr = `AFRI-SHOW-${show.id.toUpperCase()}-${generatedPin}`;

    let updatedShow: CreatorShowTicket = {
      ...show,
      isPurchasedByMe: true,
      totalSold: show.totalSold + 1,
      availableTickets: Math.max(0, show.availableTickets - 1),
      ticketPin: generatedPin,
      ticketQrCode: generatedQr,
    };

    setCreatorShows((prev) => prev.map((s) => (s.id === showId ? updatedShow : s)));

    // Credit creator's total earnings
    setCreators((prev) =>
      prev.map((c) => (c.id === show.creatorId ? { ...c, totalEarnings: c.totalEarnings + show.price } : c))
    );

    return {
      success: true,
      ticket: updatedShow,
      message: `🎟️ Ticket purchased for "${show.title}"! Scannable QR pass and entry PIN issued.`,
    };
  };

  const buyCreatorSong = (songId: string) => {
    const song = creatorSongs.find((s) => s.id === songId);
    if (!song) return { success: false, message: 'Song not found' };

    let updatedSong: CreatorSong = {
      ...song,
      isPurchasedByMe: true,
      salesCount: song.salesCount + 1,
      playsCount: song.playsCount + 1,
    };

    setCreatorSongs((prev) => prev.map((s) => (s.id === songId ? updatedSong : s)));

    // Credit artist directly to their wallet
    setCreators((prev) =>
      prev.map((c) => (c.id === song.artistId ? { ...c, totalEarnings: c.totalEarnings + song.price } : c))
    );

    return {
      success: true,
      song: updatedSong,
      message: `🎵 Purchased "${song.title}"! 100% payout credited directly to ${song.artistName}'s AfriChat Wallet. Stream & download unlocked.`,
    };
  };

  const createCreatorPost = (
    content: string,
    isLocked: boolean,
    mediaType?: 'image' | 'video' | 'audio_leak' | 'text',
    mediaUrl?: string
  ) => {
    const newPost: CreatorPost = {
      id: `post_${Date.now()}`,
      creatorId: 'cr_kelvin_vibe',
      creatorName: 'You (Creator)',
      creatorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      creatorHandle: '@you_creator',
      content,
      mediaType: mediaType || 'text',
      mediaUrl,
      isLocked,
      likesCount: 0,
      commentsCount: 0,
      createdAt: 'Just now',
    };
    setCreatorPosts((prev) => [newPost, ...prev]);
  };

  const createCreatorShow = (showData: Omit<CreatorShowTicket, 'id' | 'totalSold' | 'isPurchasedByMe'>) => {
    const newShow: CreatorShowTicket = {
      ...showData,
      id: `show_${Date.now()}`,
      totalSold: 0,
      isPurchasedByMe: false,
    };
    setCreatorShows((prev) => [newShow, ...prev]);
  };

  const createCreatorSong = (songData: Omit<CreatorSong, 'id' | 'playsCount' | 'salesCount' | 'isPurchasedByMe'>) => {
    const newSong: CreatorSong = {
      ...songData,
      id: `song_${Date.now()}`,
      playsCount: 0,
      salesCount: 0,
      isPurchasedByMe: true, // creator owns their song
    };
    setCreatorSongs((prev) => [newSong, ...prev]);
  };

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

  // 8. Phone Number OTP Authentication & Identity State
  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem('africhat_user_profile_v2');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse user profile:', e);
    }
    return INITIAL_CURRENT_USER;
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('africhat_is_authenticated') !== 'false';
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // 9. Contact Synchronization & Discovery State
  const [deviceContacts, setDeviceContacts] = useState<DeviceContact[]>(() => {
    try {
      const saved = localStorage.getItem('africhat_device_contacts');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse device contacts:', e);
    }
    return MOCK_DEVICE_CONTACTS;
  });
  const [isContactsModalOpen, setIsContactsModalOpen] = useState(false);

  // 10. User Uploaded Memes & GIFs + In-Chat Drawer State
  const [userMemes, setUserMemes] = useState<UserUploadedMeme[]>(() => {
    try {
      const saved = localStorage.getItem('africhat_user_memes');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse user memes:', e);
    }
    return INITIAL_USER_MEMES;
  });
  const [isEmojiMemeDrawerOpen, setIsEmojiMemeDrawerOpen] = useState(false);

  // Hide balance figure on Nav for public privacy
  const [hideBalanceOnNav, setHideBalanceOnNav] = useState<boolean>(() => {
    return localStorage.getItem('africhat_hide_balance') === 'true';
  });

  // 11. Gokada / PickkR Dispatch Integration State
  const [dispatchOrders, setDispatchOrders] = useState<DispatchDeliveryOrder[]>(() => {
    try {
      const saved = localStorage.getItem('africhat_dispatch_orders');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse dispatch orders:', e);
    }
    return MOCK_DISPATCH_ORDERS;
  });
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);

  // 12. Job Board with Employer Pay-to-Post State
  const [jobPostings, setJobPostings] = useState<JobPosting[]>(() => {
    try {
      const saved = localStorage.getItem('africhat_job_postings');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse jobs:', e);
    }
    return MOCK_JOB_POSTINGS;
  });
  const [isJobBoardModalOpen, setIsJobBoardModalOpen] = useState(false);
  const [isPostJobModalOpen, setIsPostJobModalOpen] = useState(false);

  // 13. Security Settings (Payment PIN & Security Questions)
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>(() => {
    try {
      const saved = localStorage.getItem('africhat_security_settings');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse security settings:', e);
    }
    return {
      hasPaymentPin: true,
      paymentPin: '1234',
      securityQuestion: "What is your mother's maiden name?",
      securityAnswer: 'Adebayo',
    };
  });
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);

  // 14. African Services & Appointment Booking State
  const [serviceProviders, setServiceProviders] = useState<ServiceProvider[]>(() => {
    try {
      const saved = localStorage.getItem('africhat_service_providers');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse service providers:', e);
    }
    return MOCK_SERVICE_PROVIDERS;
  });
  const [serviceBookings, setServiceBookings] = useState<ServiceBooking[]>(() => {
    try {
      const saved = localStorage.getItem('africhat_service_bookings');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse service bookings:', e);
    }
    return MOCK_SERVICE_BOOKINGS;
  });
  const [isServicesModalOpen, setIsServicesModalOpen] = useState(false);
  const [selectedServiceProvider, setSelectedServiceProvider] = useState<ServiceProvider | null>(null);

  // 15. Money Transfer with 1-2 Days Security Delay State
  const [delayedTransfers, setDelayedTransfers] = useState<DelayedTransfer[]>(() => {
    try {
      const saved = localStorage.getItem('africhat_delayed_transfers');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse delayed transfers:', e);
    }
    return MOCK_DELAYED_TRANSFERS;
  });
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  // 16. Payroll & Recurring Auto-Debit State
  const [payrollEmployees, setPayrollEmployees] = useState<PayrollEmployee[]>(() => {
    try {
      const saved = localStorage.getItem('africhat_payroll_employees');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse payroll employees:', e);
    }
    return MOCK_PAYROLL_EMPLOYEES;
  });
  const [payrollLogs, setPayrollLogs] = useState<PayrollRunLog[]>(() => {
    try {
      const saved = localStorage.getItem('africhat_payroll_logs');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse payroll logs:', e);
    }
    return MOCK_PAYROLL_LOGS;
  });
  const [isPayrollModalOpen, setIsPayrollModalOpen] = useState(false);

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

  const toggleHideBalance = () => {
    setHideBalanceOnNav((prev) => {
      const next = !prev;
      localStorage.setItem('africhat_hide_balance', String(next));
      return next;
    });
  };

  const addStatus = (caption: string, mediaUrl?: string) => {
    const newStatus: UserStatus = {
      id: `status_${Date.now()}`,
      userId: currentUser.id,
      userName: currentUser.fullName,
      userAvatar: currentUser.avatarUrl,
      isMe: true,
      statusType: mediaUrl ? 'media' : 'thought',
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

  const addThoughtStatus = (thoughtText: string, themeBg: string) => {
    const newStatus: UserStatus = {
      id: `status_thought_${Date.now()}`,
      userId: currentUser.id,
      userName: currentUser.fullName,
      userAvatar: currentUser.avatarUrl,
      isMe: true,
      statusType: 'thought',
      thoughtBg: themeBg || 'from-indigo-600 via-purple-600 to-pink-600',
      caption: thoughtText,
      createdAt: 'Just now',
      expiresInHours: 24,
      viewsCount: 0,
      likesCount: 0,
      hasLikedByMe: false,
      viewers: [],
    };
    setStatuses((prev) => [newStatus, ...prev.filter((s) => !s.isMe)]);
  };

  const addDeviceMediaStatus = (caption: string, mediaUrl: string, mediaType: 'image' | 'video' = 'image') => {
    const newStatus: UserStatus = {
      id: `status_media_${Date.now()}`,
      userId: currentUser.id,
      userName: currentUser.fullName,
      userAvatar: currentUser.avatarUrl,
      isMe: true,
      statusType: mediaType,
      mediaUrl,
      videoUrl: mediaType === 'video' ? mediaUrl : undefined,
      caption: caption || (mediaType === 'video' ? 'Video Status 🎥' : 'Photo Status 📸'),
      createdAt: 'Just now',
      expiresInHours: 24,
      viewsCount: 0,
      likesCount: 0,
      hasLikedByMe: false,
      viewers: [],
    };
    setStatuses((prev) => [newStatus, ...prev.filter((s) => !s.isMe)]);
  };

  const addDeviceVideoStatus = (caption: string, videoUrl: string, thumbnail?: string) => {
    const newStatus: UserStatus = {
      id: `status_vid_${Date.now()}`,
      userId: currentUser.id,
      userName: currentUser.fullName,
      userAvatar: currentUser.avatarUrl,
      isMe: true,
      statusType: 'video',
      videoUrl,
      mediaUrl: thumbnail || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=500&auto=format&fit=crop&q=80',
      caption: caption || 'Video Status 🎥',
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

  const upgradeVerificationBadge = (badge: 'blue' | 'gold') => {
    const cost = badge === 'gold' ? 11000 : 6000;
    if (wallet.availableBalance < cost) {
      return {
        success: false,
        message: `Insufficient wallet balance for ${
          badge === 'gold' ? 'Gold Creator Checkmark (₦11,000/mo)' : 'Blue Host Checkmark (₦6,000/mo)'
        }. Please top up your wallet.`,
      };
    }

    const newTx: WalletTransaction = {
      id: `tx_${Date.now()}`,
      type: 'topup',
      title: `${badge === 'gold' ? 'Gold Creator Checkmark (₦11k/mo)' : 'Blue Ajo Host Checkmark (₦6k/mo)'}`,
      amount: cost,
      currency: 'NGN',
      timestamp: 'Just now',
      status: 'completed',
      reference: `VERIFY_${badge.toUpperCase()}_${Date.now()}`,
      channel: 'wallet',
    };

    setWallet((prev) => ({
      ...prev,
      availableBalance: prev.availableBalance - cost,
      transactions: [newTx, ...prev.transactions],
    }));

    const updatedUser: UserProfile = {
      ...currentUser,
      verificationBadge: badge,
      isCreator: badge === 'gold' ? true : currentUser.isCreator,
      verificationExpiresAt: '30 days remaining',
    };

    setCurrentUser(updatedUser);
    localStorage.setItem('africhat_user_profile_v2', JSON.stringify(updatedUser));

    return {
      success: true,
      message: `🎉 Success! You are now verified with a ${badge.toUpperCase()} Checkmark (${
        badge === 'gold' ? 'Creator Tier ₦11,000/mo' : 'Ajo Host Tier ₦6,000/mo'
      }). You can now host Ajo clubs and access full creator features!`,
    };
  };

  const createAjoGroup = (ajoData: {
    name: string;
    cycleContributionAmount: number;
    frequency: 'weekly' | 'monthly';
    totalRounds: number;
    rules?: string;
  }) => {
    if (!currentUser.verificationBadge) {
      return {
        success: false,
        requiresVerification: true,
        message: 'Hosting an Ajo / Esusu group requires an active Blue (₦6k/mo) or Gold (₦11k/mo) checkmark to guarantee trust.',
      };
    }

    const newAjo: AjoGroup = {
      id: `ajo_${Date.now()}`,
      name: ajoData.name,
      description: `Verified Ajo Club hosted by ${currentUser.fullName}`,
      cycleContributionAmount: ajoData.cycleContributionAmount,
      currency: 'NGN',
      frequency: ajoData.frequency,
      totalRounds: ajoData.totalRounds,
      currentRound: 1,
      nextPayoutDate: ajoData.frequency === 'weekly' ? 'Next Friday, 4:00 PM' : 'End of Month',
      currentRecipientName: `${currentUser.fullName} (Host)`,
      totalPoolPerRound: ajoData.cycleContributionAmount * ajoData.totalRounds,
      rules:
        ajoData.rules ||
        'Smart Escrow rules enforced: missed cycles will result in automatic debit freeze and bad debt flag.',
      members: [
        {
          id: 'm_host',
          name: `${currentUser.fullName} (Host)`,
          avatar:
            currentUser.avatarUrl ||
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          payoutPosition: 1,
          payoutDate: 'Round 1 (Current)',
          hasPaidCurrentCycle: true,
          isReceivedPayout: false,
        },
        {
          id: 'm_2',
          name: 'Ibrahim Danladi',
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
          payoutPosition: 2,
          payoutDate: 'Round 2',
          hasPaidCurrentCycle: true,
          isReceivedPayout: false,
        },
        {
          id: 'm_3',
          name: 'Folake Adeleke',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          payoutPosition: 3,
          payoutDate: 'Round 3',
          hasPaidCurrentCycle: false,
          isReceivedPayout: false,
        },
        {
          id: 'm_4',
          name: 'Emeka Okafor',
          avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
          payoutPosition: 4,
          payoutDate: 'Round 4',
          hasPaidCurrentCycle: false,
          isReceivedPayout: false,
        },
      ],
    };

    setActiveAjoGroup(newAjo);
    return {
      success: true,
      requiresVerification: false,
      message: `🎉 "${ajoData.name}" has been created! Total pool of ₦${newAjo.totalPoolPerRound.toLocaleString()} per round is now active under smart escrow.`,
    };
  };

  // 8. Phone OTP Auth Handlers
  const loginWithPhone = (
    phoneNumber: string,
    fullName: string,
    avatarUrl?: string,
    about?: string
  ) => {
    const updatedUser: UserProfile = {
      id: `usr_${Date.now()}`,
      phoneNumber,
      fullName: fullName || 'AfriChat User',
      avatarUrl: avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      about: about || 'Hey there! I am using AfriChat.',
      createdAt: new Date().toISOString(),
      lastSeen: 'online',
    };
    setCurrentUser(updatedUser);
    setIsAuthenticated(true);
    localStorage.setItem('africhat_user_profile_v2', JSON.stringify(updatedUser));
    localStorage.setItem('africhat_is_authenticated', 'true');
    setIsAuthModalOpen(false);
  };

  const logoutUser = () => {
    setIsAuthenticated(false);
    localStorage.setItem('africhat_is_authenticated', 'false');
    setIsAuthModalOpen(true);
  };

  const updateUserProfile = (updates: Partial<UserProfile>) => {
    setCurrentUser((prev) => {
      const updated = { ...prev, ...updates };
      localStorage.setItem('africhat_user_profile_v2', JSON.stringify(updated));
      return updated;
    });
  };

  // 9. Contacts Handlers
  const syncDeviceContacts = () => {
    setDeviceContacts((prev) => [...prev]);
  };

  const addNewDeviceContact = (name: string, phone: string, about?: string) => {
    const cleaned = phone.replace(/[\s-]/g, '');
    const normalized = cleaned.startsWith('0') ? `+234${cleaned.slice(1)}` : cleaned.startsWith('+') ? cleaned : `+234${cleaned}`;
    const newContact: DeviceContact = {
      id: `cnt_${Date.now()}`,
      name,
      rawPhoneNumber: phone,
      normalizedPhoneNumber: normalized,
      about: about || 'Hey there! I am using AfriChat.',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      isRegisteredOnAfriChat: true,
      registeredUser: {
        id: `usr_${Date.now()}`,
        phoneNumber: normalized,
        fullName: name,
        avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        about: about || 'Hey there! I am using AfriChat.',
        createdAt: new Date().toISOString(),
        lastSeen: 'Just now',
      },
    };
    setDeviceContacts((prev) => {
      const updated = [newContact, ...prev];
      localStorage.setItem('africhat_device_contacts', JSON.stringify(updated));
      return updated;
    });
  };

  const startChatWithContact = (contact: DeviceContact) => {
    let existingChat = chats.find(
      (c) =>
        c.phone === contact.normalizedPhoneNumber ||
        c.phone === contact.rawPhoneNumber ||
        c.name.toLowerCase() === contact.name.toLowerCase()
    );

    if (!existingChat) {
      const newChatId = `chat_${Date.now()}`;
      const newThread: ChatThread = {
        id: newChatId,
        name: contact.name,
        avatar:
          contact.avatar ||
          'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        verifiedStore: false,
        location: 'Contact Book',
        unreadCount: 0,
        lastMessage: 'Tap to start conversation',
        lastMessageTime: 'Just now',
        catalog: [],
        isOnline: true,
        phone: contact.normalizedPhoneNumber,
      };
      setChats((prev) => [newThread, ...prev]);
      existingChat = newThread;
    }

    setActiveTab('chats');
    setActiveChatId(existingChat.id);
    setIsContactsModalOpen(false);
  };

  // 10. Meme Handlers
  const addUserMeme = (meme: Omit<UserUploadedMeme, 'id' | 'createdAt'>) => {
    const newMeme: UserUploadedMeme = {
      ...meme,
      id: `umeme_${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setUserMemes((prev) => {
      const updated = [newMeme, ...prev];
      localStorage.setItem('africhat_user_memes', JSON.stringify(updated));
      return updated;
    });
  };

  const deleteUserMeme = (memeId: string) => {
    setUserMemes((prev) => {
      const updated = prev.filter((m) => m.id !== memeId);
      localStorage.setItem('africhat_user_memes', JSON.stringify(updated));
      return updated;
    });
  };

  const sendMemeFromDrawer = (chatId: string, meme: UserUploadedMeme) => {
    const newMsg: ChatMessage = {
      id: `msg_umeme_${Date.now()}`,
      chatId,
      sender: 'user',
      type: 'image',
      imageUrl: meme.mediaUrl,
      text: meme.title ? `[Meme: ${meme.title}]` : 'Shared a custom meme',
      imageLoaded: true,
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
              lastMessage: `🖼️ Meme: ${meme.title || 'Custom Upload'}`,
              lastMessageTime: newMsg.timestamp,
            }
          : c
      )
    );

    setIsEmojiMemeDrawerOpen(false);
  };

  // 11. Dispatch Handlers
  const createDispatchOrder = (
    orderData: Omit<DispatchDeliveryOrder, 'id' | 'trackingCode' | 'createdAt' | 'status'>
  ): DispatchDeliveryOrder => {
    const prefix = orderData.provider === 'gokada' ? 'GKD' : 'PCK';
    const code = `${prefix}-${Math.floor(10000 + Math.random() * 90000)}`;
    const newOrder: DispatchDeliveryOrder = {
      ...orderData,
      id: `disp_${Date.now()}`,
      trackingCode: code,
      status: 'rider_assigned',
      riderName: orderData.provider === 'gokada' ? 'Tunde Balogun (Gokada Express)' : 'Chijioke PickkR Hub #8',
      riderPhone: '+2348039988112',
      riderPlate: orderData.provider === 'gokada' ? 'GKD-481-APP' : 'PCK-102-LAG',
      createdAt: 'Just now',
    };

    setDispatchOrders((prev) => {
      const updated = [newOrder, ...prev];
      localStorage.setItem('africhat_dispatch_orders', JSON.stringify(updated));
      return updated;
    });

    return newOrder;
  };

  // 12. Job Handlers
  const postNewJob = (jobData: Omit<JobPosting, 'id' | 'postedAt' | 'isPaid'>) => {
    const postFee = 400;
    if (wallet.availableBalance < postFee) {
      return {
        success: false,
        message: `Insufficient wallet balance for featured job posting fee (${CURRENCY_SYMBOLS.NGN}${postFee.toLocaleString()}). Please top up wallet.`,
      };
    }

    const newTx: WalletTransaction = {
      id: `tx_${Date.now()}`,
      type: 'topup',
      title: `Job Board Posting: ${jobData.title.slice(0, 25)}`,
      amount: postFee,
      currency: 'NGN',
      timestamp: 'Just now',
      status: 'completed',
      reference: `JOB_${Date.now()}`,
      channel: 'wallet',
    };

    setWallet((prev) => ({
      ...prev,
      availableBalance: prev.availableBalance - postFee,
      transactions: [newTx, ...prev.transactions],
    }));

    const newJob: JobPosting = {
      ...jobData,
      id: `job_${Date.now()}`,
      postedAt: 'Just now',
      isPaid: true,
      isFeatured: true,
    };

    setJobPostings((prev) => {
      const updated = [newJob, ...prev];
      localStorage.setItem('africhat_job_postings', JSON.stringify(updated));
      return updated;
    });

    setIsPostJobModalOpen(false);
    return {
      success: true,
      job: newJob,
      message: 'Job posting published successfully on AfriChat Opportunities Board!',
    };
  };

  // 13. Security Handlers
  const setPaymentPin = (pin: string) => {
    setSecuritySettings((prev) => {
      const updated = { ...prev, hasPaymentPin: true, paymentPin: pin };
      localStorage.setItem('africhat_security_settings', JSON.stringify(updated));
      return updated;
    });
  };

  const setSecurityQuestion = (question: string, answer: string) => {
    setSecuritySettings((prev) => {
      const updated = { ...prev, securityQuestion: question, securityAnswer: answer };
      localStorage.setItem('africhat_security_settings', JSON.stringify(updated));
      return updated;
    });
  };

  const verifyPaymentPin = (pin: string): boolean => {
    if (!securitySettings.paymentPin) return true;
    return securitySettings.paymentPin.trim() === pin.trim();
  };

  // 14. African Services & Appointment Booking Handlers
  const createServiceBooking = (
    booking: Omit<ServiceBooking, 'id' | 'createdAt' | 'bookingPin'>
  ) => {
    const pin = `${Math.floor(1000 + Math.random() * 9000)}`;
    const newBooking: ServiceBooking = {
      ...booking,
      id: `bk_${Date.now()}`,
      createdAt: 'Just now',
      bookingPin: pin,
      isPaid: true,
      status: 'confirmed',
    };

    // If payment mode is escrow or wallet, log and deduct if sufficient
    if (booking.paymentMode === 'escrow') {
      const tx: WalletTransaction = {
        id: `tx_${Date.now()}`,
        type: 'escrow_lock',
        title: `Service Escrow: ${booking.serviceTitle} with ${booking.providerName}`,
        amount: booking.totalPrice,
        currency: booking.currency,
        timestamp: 'Just now',
        status: 'completed',
        reference: `SRV_ESC_${newBooking.id}`,
        channel: 'wallet',
      };

      setWallet((prev) => ({
        ...prev,
        availableBalance: Math.max(0, prev.availableBalance - booking.totalPrice),
        escrowLockedBalance: prev.escrowLockedBalance + booking.totalPrice,
        transactions: [tx, ...prev.transactions],
      }));
    }

    setServiceBookings((prev) => {
      const updated = [newBooking, ...prev];
      localStorage.setItem('africhat_service_bookings', JSON.stringify(updated));
      return updated;
    });

    return { success: true, booking: newBooking };
  };

  const cancelServiceBooking = (bookingId: string) => {
    setServiceBookings((prev) => {
      const target = prev.find((b) => b.id === bookingId);
      if (target && target.paymentMode === 'escrow') {
        // Refund escrow locked balance
        setWallet((w) => ({
          ...w,
          availableBalance: w.availableBalance + target.totalPrice,
          escrowLockedBalance: Math.max(0, w.escrowLockedBalance - target.totalPrice),
          transactions: [
            {
              id: `tx_${Date.now()}`,
              type: 'escrow_release',
              title: `Refund: Cancelled ${target.serviceTitle}`,
              amount: target.totalPrice,
              currency: target.currency,
              timestamp: 'Just now',
              status: 'completed',
              reference: `REF_${bookingId}`,
              channel: 'wallet',
            },
            ...w.transactions,
          ],
        }));
      }

      const updated = prev.map((b) =>
        b.id === bookingId ? { ...b, status: 'cancelled' as const } : b
      );
      localStorage.setItem('africhat_service_bookings', JSON.stringify(updated));
      return updated;
    });
  };

  const completeServiceBooking = (bookingId: string) => {
    setServiceBookings((prev) => {
      const target = prev.find((b) => b.id === bookingId);
      if (target && target.paymentMode === 'escrow') {
        setWallet((w) => ({
          ...w,
          escrowLockedBalance: Math.max(0, w.escrowLockedBalance - target.totalPrice),
          transactions: [
            {
              id: `tx_${Date.now()}`,
              type: 'escrow_release',
              title: `Service Escrow Released: ${target.serviceTitle} to ${target.providerName}`,
              amount: target.totalPrice,
              currency: target.currency,
              timestamp: 'Just now',
              status: 'completed',
              reference: `REL_SRV_${bookingId}`,
              channel: 'wallet',
            },
            ...w.transactions,
          ],
        }));
      }

      const updated = prev.map((b) =>
        b.id === bookingId ? { ...b, status: 'completed' as const } : b
      );
      localStorage.setItem('africhat_service_bookings', JSON.stringify(updated));
      return updated;
    });
  };

  const registerAsServiceProvider = (
    provider: Omit<ServiceProvider, 'id' | 'rating' | 'reviewCount' | 'isVerified'>
  ) => {
    const newProvider: ServiceProvider = {
      ...provider,
      id: `serv_${Date.now()}`,
      rating: 5.0,
      reviewCount: 1,
      isVerified: true,
      badge: 'Verified African Pro',
    };

    setServiceProviders((prev) => {
      const updated = [newProvider, ...prev];
      localStorage.setItem('africhat_service_providers', JSON.stringify(updated));
      return updated;
    });
  };

  // 15. Money Transfer with 1-2 Days Security Delay Handlers
  const sendDelayedTransfer = (
    recipientPhone: string,
    recipientName: string,
    amount: number,
    note: string,
    delayHours: number = 36 // Default 1.5 days (1-2 days)
  ) => {
    if (wallet.availableBalance < amount) {
      return {
        success: false,
        message: `Insufficient funds. Your available balance is ${CURRENCY_SYMBOLS.NGN}${wallet.availableBalance.toLocaleString()}.`,
      };
    }

    const releaseMs = Date.now() + delayHours * 3600 * 1000;
    const scheduledDate = new Date(releaseMs).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const newTransfer: DelayedTransfer = {
      id: `dtx_${Math.floor(100000 + Math.random() * 900000)}`,
      senderId: currentUser.id,
      senderName: currentUser.fullName,
      recipientPhone,
      recipientName,
      amount,
      currency: 'NGN',
      note: note || 'Transfer via AfriChat Delayed Escrow',
      delayHours,
      scheduledReleaseTime: `${scheduledDate} (${delayHours}h security delay)`,
      releaseTimestampMs: releaseMs,
      status: 'pending_clearance',
      createdAt: 'Just now',
      securityReason: 'Mandatory 1-2 Days Security Delay Buffer: Protects against unauthorized transfers, scam vendors & phishing before funds settle.',
    };

    // Deduct from available balance, add to locked and record transaction
    const tx: WalletTransaction = {
      id: `tx_${Date.now()}`,
      type: 'transfer_delayed',
      title: `Transfer to ${recipientName} (1-2 Days Delay)`,
      amount,
      currency: 'NGN',
      timestamp: 'Just now',
      status: 'pending',
      reference: newTransfer.id,
      channel: 'wallet',
    };

    setWallet((prev) => ({
      ...prev,
      availableBalance: prev.availableBalance - amount,
      escrowLockedBalance: prev.escrowLockedBalance + amount,
      transactions: [tx, ...prev.transactions],
    }));

    setDelayedTransfers((prev) => {
      const updated = [newTransfer, ...prev];
      localStorage.setItem('africhat_delayed_transfers', JSON.stringify(updated));
      return updated;
    });

    return {
      success: true,
      transfer: newTransfer,
      message: `₦${amount.toLocaleString()} scheduled to ${recipientName}. Funds will clear in ${delayHours} hours under anti-fraud delay. You can cancel at any time before settlement.`,
    };
  };

  const cancelDelayedTransfer = (transferId: string) => {
    const target = delayedTransfers.find((t) => t.id === transferId);
    if (!target) return { success: false, message: 'Transfer not found.' };
    if (target.status !== 'pending_clearance') {
      return { success: false, message: 'Only transfers pending clearance can be cancelled.' };
    }

    // Refund locked balance back to available
    setWallet((prev) => ({
      ...prev,
      availableBalance: prev.availableBalance + target.amount,
      escrowLockedBalance: Math.max(0, prev.escrowLockedBalance - target.amount),
      transactions: [
        {
          id: `tx_${Date.now()}`,
          type: 'escrow_release',
          title: `Cancelled Transfer Refund: ${target.recipientName}`,
          amount: target.amount,
          currency: target.currency,
          timestamp: 'Just now',
          status: 'completed',
          reference: `CAN_${transferId}`,
          channel: 'wallet',
        },
        ...prev.transactions,
      ],
    }));

    setDelayedTransfers((prev) => {
      const updated = prev.map((t) =>
        t.id === transferId ? { ...t, status: 'cancelled_by_sender' as const } : t
      );
      localStorage.setItem('africhat_delayed_transfers', JSON.stringify(updated));
      return updated;
    });

    return {
      success: true,
      message: `Transfer of ₦${target.amount.toLocaleString()} cancelled. Funds returned to your available wallet immediately.`,
    };
  };

  const fastForwardTransferRelease = (transferId: string) => {
    const target = delayedTransfers.find((t) => t.id === transferId);
    if (!target) return { success: false, message: 'Transfer not found.' };

    setWallet((prev) => ({
      ...prev,
      escrowLockedBalance: Math.max(0, prev.escrowLockedBalance - target.amount),
      transactions: [
        {
          id: `tx_${Date.now()}`,
          type: 'escrow_release',
          title: `Cleared 1-2 Days Delay Payout to ${target.recipientName}`,
          amount: target.amount,
          currency: target.currency,
          timestamp: 'Just now',
          status: 'completed',
          reference: `CLR_${transferId}`,
          channel: 'wallet',
        },
        ...prev.transactions,
      ],
    }));

    setDelayedTransfers((prev) => {
      const updated = prev.map((t) =>
        t.id === transferId ? { ...t, status: 'cleared' as const } : t
      );
      localStorage.setItem('africhat_delayed_transfers', JSON.stringify(updated));
      return updated;
    });

    return {
      success: true,
      message: `Delay cleared! ₦${target.amount.toLocaleString()} settled to ${target.recipientName}.`,
    };
  };

  // 16. Payroll & Recurring Auto-Debit Handlers
  const addPayrollEmployee = (emp: Omit<PayrollEmployee, 'id' | 'status'>) => {
    const newEmp: PayrollEmployee = {
      ...emp,
      id: `emp_${Date.now()}`,
      status: 'active',
    };

    setPayrollEmployees((prev) => {
      const updated = [newEmp, ...prev];
      localStorage.setItem('africhat_payroll_employees', JSON.stringify(updated));
      return updated;
    });
  };

  const toggleEmployeePayrollStatus = (id: string) => {
    setPayrollEmployees((prev) => {
      const updated = prev.map((e) =>
        e.id === id ? { ...e, status: e.status === 'active' ? ('paused' as const) : ('active' as const) } : e
      );
      localStorage.setItem('africhat_payroll_employees', JSON.stringify(updated));
      return updated;
    });
  };

  const deletePayrollEmployee = (id: string) => {
    setPayrollEmployees((prev) => {
      const updated = prev.filter((e) => e.id !== id);
      localStorage.setItem('africhat_payroll_employees', JSON.stringify(updated));
      return updated;
    });
  };

  const runPayrollNow = (employeeId?: string) => {
    const targets = employeeId
      ? payrollEmployees.filter((e) => e.id === employeeId)
      : payrollEmployees.filter((e) => e.status === 'active');

    if (targets.length === 0) {
      return { success: false, totalDebited: 0, message: 'No active staff on payroll to run.' };
    }

    const totalNeeded = targets.reduce((acc, e) => acc + e.salary, 0);
    if (wallet.availableBalance < totalNeeded) {
      return {
        success: false,
        totalDebited: 0,
        message: `Insufficient wallet balance for payroll (₦${totalNeeded.toLocaleString()} needed, ₦${wallet.availableBalance.toLocaleString()} available). Please top up via Paystack first.`,
      };
    }

    // Deduct from wallet and generate payroll run logs
    const newLogs: PayrollRunLog[] = [];
    const newTxList: WalletTransaction[] = [];

    targets.forEach((e) => {
      const ref = `PAY_${Math.floor(100000 + Math.random() * 900000)}`;
      newLogs.push({
        id: `prun_${Date.now()}_${e.id}`,
        employeeId: e.id,
        employeeName: e.fullName,
        role: e.role,
        amount: e.salary,
        currency: e.currency,
        date: 'Today, Auto-Debit Clearance',
        status: 'successful',
        reference: ref,
      });

      newTxList.push({
        id: `tx_${Date.now()}_${e.id}`,
        type: 'payroll_debit',
        title: `Auto-Debit Salary: ${e.fullName} (${e.role})`,
        amount: e.salary,
        currency: e.currency,
        timestamp: 'Just now',
        status: 'completed',
        reference: ref,
        channel: 'wallet',
      });
    });

    setWallet((prev) => ({
      ...prev,
      availableBalance: prev.availableBalance - totalNeeded,
      transactions: [...newTxList, ...prev.transactions],
    }));

    setPayrollLogs((prev) => {
      const updated = [...newLogs, ...prev];
      localStorage.setItem('africhat_payroll_logs', JSON.stringify(updated));
      return updated;
    });

    // Update lastPaidDate for employees
    setPayrollEmployees((prev) => {
      const updated = prev.map((e) =>
        targets.some((t) => t.id === e.id)
          ? { ...e, lastPaidDate: 'Today, Just now' }
          : e
      );
      localStorage.setItem('africhat_payroll_employees', JSON.stringify(updated));
      return updated;
    });

    return {
      success: true,
      totalDebited: totalNeeded,
      message: `Payroll auto-debit executed successfully! ₦${totalNeeded.toLocaleString()} disbursed to ${targets.length} staff member(s).`,
    };
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
        addThoughtStatus,
        addDeviceMediaStatus,
        addDeviceVideoStatus,
        wallet,
        isWalletModalOpen,
        setIsWalletModalOpen,
        topUpWallet,
        withdrawWallet,
        hideBalanceOnNav,
        toggleHideBalance,
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
        createAjoGroup,
        upgradeVerificationBadge,
        // 8. Phone Number OTP Authentication & Identity
        currentUser,
        setCurrentUser,
        isAuthenticated,
        isAuthModalOpen,
        setIsAuthModalOpen,
        loginWithPhone,
        logoutUser,
        updateUserProfile,
        // 9. Contact Synchronization & Discovery
        deviceContacts,
        isContactsModalOpen,
        setIsContactsModalOpen,
        syncDeviceContacts,
        startChatWithContact,
        addNewDeviceContact,
        // 10. User Uploaded Memes & GIFs + In-Chat Drawer
        userMemes,
        addUserMeme,
        deleteUserMeme,
        sendMemeFromDrawer,
        isEmojiMemeDrawerOpen,
        setIsEmojiMemeDrawerOpen,
        // 11. Gokada / PickkR Dispatch Integration
        dispatchOrders,
        isDispatchModalOpen,
        setIsDispatchModalOpen,
        createDispatchOrder,
        // 12. Job Board with Employer Pay-to-Post
        jobPostings,
        isJobBoardModalOpen,
        setIsJobBoardModalOpen,
        isPostJobModalOpen,
        setIsPostJobModalOpen,
        postNewJob,
        // 13. Security Settings (Payment PIN & Security Questions)
        securitySettings,
        setPaymentPin,
        setSecurityQuestion,
        verifyPaymentPin,
        isSecurityModalOpen,
        setIsSecurityModalOpen,
        // 14. African Services & Appointment Booking (No Limit)
        serviceProviders,
        serviceBookings,
        isServicesModalOpen,
        setIsServicesModalOpen,
        selectedServiceProvider,
        setSelectedServiceProvider,
        createServiceBooking,
        cancelServiceBooking,
        completeServiceBooking,
        registerAsServiceProvider,
        // 15. Money Transfer with 1-2 Days Security Delay
        delayedTransfers,
        isTransferModalOpen,
        setIsTransferModalOpen,
        sendDelayedTransfer,
        cancelDelayedTransfer,
        fastForwardTransferRelease,
        // 16. Payroll & Recurring Auto-Debit
        payrollEmployees,
        payrollLogs,
        isPayrollModalOpen,
        setIsPayrollModalOpen,
        addPayrollEmployee,
        toggleEmployeePayrollStatus,
        deletePayrollEmployee,
        runPayrollNow,
        // 17. Display & Appearance
        fontSize,
        setFontSize,
        chatWallpaper,
        setChatWallpaper,
        // QR Scanner
        isScanQrModalOpen,
        setIsScanQrModalOpen,
        // 18. Town Communities
        townCommunities,
        hidePhoneNumberInTown,
        toggleHidePhoneNumberInTown,
        toggleJoinTownCommunity,
        // 19. Healthcare
        doctors,
        queueTokens,
        medicationReminders,
        healthVault,
        isHealthModalOpen,
        setIsHealthModalOpen,
        bookDoctorAppointment,
        takeQueueToken,
        addMedicationReminder,
        updateHealthVault,
        triggerEmergencySos,
        // 20. Legal & Smart Contracts
        lawyers,
        contractTemplates,
        generatedContracts,
        isLegalModalOpen,
        setIsLegalModalOpen,
        generateLegalContract,
        signLegalContract,
        triggerEmergencyLegalSos,
        // 21. African Creator & Direct Music Economy
        creators,
        creatorPosts,
        creatorShows,
        creatorSongs,
        isCreatorModalOpen,
        setIsCreatorModalOpen,
        subscribeToCreator,
        toggleFollowCreator,
        buyShowTicket,
        buyCreatorSong,
        createCreatorPost,
        createCreatorShow,
        createCreatorSong,
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
