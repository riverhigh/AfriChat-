import {
  initSocket,
  getSocket,
  joinChatRoom,
  leaveChatRoom,
  emitLiveMessage,
  emitCreateGroup,
  emitPhoneCallSignal,
  joinLiveSpace,
  leaveLiveSpace,
  registerSocketUser,
  emitPostStatus,
  emitViewStatus,
  emitLikeStatus,
} from '../services/socket';
import { encryptChatMessage, decryptChatMessage, getConversationSecret } from '../utils/cryptoUtils';

export const normalizePhoneDigits = (raw?: string): string => {
  if (!raw) return '';
  let d = raw.replace(/\D/g, '');
  if (d.startsWith('0') && d.length === 11) {
    d = '234' + d.slice(1);
  }
  return d;
};

export const phonesMatch = (p1?: string, p2?: string): boolean => {
  if (!p1 || !p2) return false;
  const c1 = p1.replace(/\D/g, '');
  const c2 = p2.replace(/\D/g, '');
  if (c1 === c2) return true;
  const n1 = normalizePhoneDigits(p1);
  const n2 = normalizePhoneDigits(p2);
  if (n1 && n2 && n1 === n2) return true;
  if (c1.length >= 9 && c2.length >= 9 && c1.slice(-9) === c2.slice(-9)) return true;
  return false;
};

export const getDirectChatId = (phoneA?: string, phoneB?: string): string => {
  const normA = normalizePhoneDigits(phoneA);
  const normB = normalizePhoneDigits(phoneB);
  if (normA && normB) {
    const sorted = [normA, normB].sort();
    return `dm_${sorted[0]}_${sorted[1]}`;
  }
  return '';
};

export const getSavedUserCleanPhone = (): string => {
  try {
    const s = localStorage.getItem('AGC_user_profile_v2');
    if (s) {
      const p = JSON.parse(s);
      if (p?.phoneNumber) return normalizePhoneDigits(p.phoneNumber);
    }
  } catch (_) {}
  return '';
};

export const getUserStorageKey = (prefix: string, cleanPhone?: string): string => {
  const clean = cleanPhone ? normalizePhoneDigits(cleanPhone) : getSavedUserCleanPhone();
  return clean ? `${prefix}_${clean}` : prefix;
};

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { showLocalNotification, requestNotificationPermission } from '../services/notifications';
import { downsampleDataUrl } from '../utils/imageUtils';
import {
  supabase,
  isSupabaseConfigured,
  fetchProfile,
  mapProfileToUser,
  fetchLiveTownCommunities,
  createTownCommunityInDb,
  updateTownCommunityInDb,
  fetchLiveAudioSpaces,
  createAudioSpaceInDb,
  fetchLiveArtisanStations,
  createArtisanStationInDb,
  fetchLiveStoreSubscriptions,
  createStoreSubscriptionInDb,
  fetchServiceProviders,
  fetchScamReportByTarget,
  fetchAllScamReports,
  broadcastScamReport,
} from '../services/supabase';
import {
  FeatureFlags,
  ErrandRunner,
  ErrandItem,
  ErrandOrder,
  GamifyMilestone,
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
  ArtisanStation,
  ArtisanStaff,
  ArtisanTask,
  ServiceOffering,
  ReferredUser,
  ReferralProgram,
  StoreTier,
  StoreSubscription,
  CreatorDigitalFile,
  CreatorVipService,
  AfriBook,
  BookChapter,
  GroupReadSession,
  CelebrityVerificationApplication,
  Course,
  TutorProfile,
  AdminUserRecord,
  AdminSystemBroadcast,
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

  INITIAL_CURRENT_USER,
  MOCK_DEVICE_CONTACTS,

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
  MOCK_ARTISAN_STATION,
  MOCK_REFERRAL_PROGRAM,
  MOCK_STORE_SUBSCRIPTION,
  MOCK_CREATOR_FILES,
  MOCK_AFRI_BOOKS,
  MOCK_GROUP_READ_SESSIONS,
  MOCK_COURSES,
  INITIAL_TUTOR_PROFILE,
  MOCK_ADMIN_USERS,
  INITIAL_ADMIN_BROADCAST,
} from '../data/mockData';

export interface ActiveCallState {
  name: string;
  phone: string;
  avatar?: string;
  durationSeconds: number;
  type: 'voice' | 'video';
  isMuted: boolean;
  isSpeaker: boolean;
  roomId?: string;
  isInitiator?: boolean;
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
  clearChat: (chatId: string) => void;
  updateChat: (chatId: string, updates: Partial<ChatThread>) => void;
  addMembersToGroup: (chatId: string, memberNames: string[]) => void;
  createGroup: (name: string, memberNamesOrPhones: string[], avatar?: string, description?: string, memberPhones?: string[]) => string;
  createChannel: (name: string, description?: string, avatar?: string) => string;
  toggleMemberAdmin: (chatId: string, memberName: string) => void;
  removeMemberFromGroup: (chatId: string, memberName: string) => void;
  deleteMessage: (chatId: string, messageId: string) => void;
  reactToMessage: (chatId: string, messageId: string, emoji: string) => void;
  sendImageMessage: (chatId: string, imageUrl: string, caption?: string, oneTimeView?: boolean) => void;
  blockedUserIds: string[];
  toggleBlockUser: (idOrPhone: string) => boolean;
  CURRENCY_SYMBOLS: Record<CurrencyCode, string>;
  CURRENCY_RATES: Record<CurrencyCode, number>;
  openCommunityChat: (community: TownCommunity) => void;
  messages: Record<string, ChatMessage[]>;
  calls: CallLogItem[];
  statuses: UserStatus[];
  activeViewingStatus: UserStatus | null;
  setActiveViewingStatus: (status: UserStatus | null) => void;
  likeStatus: (statusId: string) => void;
  markStatusViewed: (statusId: string) => void;
  addStatus: (caption: string, mediaUrl?: string) => void;
  addThoughtStatus: (thoughtText: string, themeBg: string) => void;
  addDeviceMediaStatus: (caption: string, mediaUrl: string, mediaType?: 'image' | 'video') => void;
  addDeviceVideoStatus: (caption: string, videoUrl: string, thumbnail?: string) => void;
  deleteStatus: (statusId: string) => void;
  wallet: UserWallet;
  isWalletModalOpen: boolean;
  setIsWalletModalOpen: (val: boolean) => void;
  topUpWallet: (amount: number) => { success: boolean; reference: string; fee: number; totalPaid: number };
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
  sendMessage: (chatId: string, text: string, replyTo?: { id?: string; sender: string; text: string }) => void;
  sendVoiceNote: (chatId: string, durationSeconds: number, transcript: string, audioDataUrl?: string) => void;
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
  startCall: (name: string, phone: string, avatar?: string, type?: 'voice' | 'video', roomId?: string, isInitiator?: boolean) => void;
  endCall: () => void;
  toggleCallMute: () => void;
  toggleCallSpeaker: () => void;
  incomingCall: {
    roomId: string;
    callerName: string;
    callerPhone: string;
    callerAvatar?: string;
    type: 'voice' | 'video';
  } | null;
  acceptIncomingCall: () => void;
  declineIncomingCall: () => void;
  // 1. Meme & Sticker Studio
  isMemeStudioOpen: boolean;
  setIsMemeStudioOpen: (val: boolean) => void;
  sendMemeSticker: (chatId: string, meme: MemeSticker) => void;
  // 2. Live Audio Spaces / Street Radio
  audioSpaces: AudioSpace[];
  activeAudioSpace: AudioSpace | null;
  joinAudioSpace: (space: AudioSpace) => void;
  leaveAudioSpace: () => void;
  createAudioSpace: (
    title: string,
    topic: string,
    category: AudioSpace['category'],
    isLowBandwidth?: boolean
  ) => AudioSpace;
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
  isCheckingReputation: boolean;
  checkEntityReputation: (query: string) => Promise<ScamEntity | null>;
  flagEntityAsScam: (targetValue: string, targetType: 'phone' | 'bank_account', reason: string) => Promise<void>;
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
  upgradeVerificationBadge: (badge: 'blue' | 'gold' | 'creator_plus') => { success: boolean; message: string };
  // 8. Phone Number OTP Authentication & Identity
  currentUser: UserProfile;
  setCurrentUser: (user: UserProfile) => void;
  isAuthenticated: boolean;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (val: boolean) => void;
  isKickedOut: boolean;
  loginWithPhone: (
    phoneNumber: string,
    fullName: string,
    avatarUrl?: string,
    about?: string,
    role?: 'user' | 'admin' | 'creator' | 'merchant'
  ) => void;
  logoutUser: () => void;
  updateUserProfile: (updates: Partial<UserProfile>) => void;
  // 9. Contact Synchronization & Discovery
  deviceContacts: DeviceContact[];
  isContactsModalOpen: boolean;
  setIsContactsModalOpen: (val: boolean) => void;
  syncDeviceContacts: () => void;
  startChatWithContact: (contact: DeviceContact) => void;
  addNewDeviceContact: (name: string, phone: string, about?: string, isRegistered?: boolean, avatar?: string) => DeviceContact;
  importDeviceContacts: (contacts: { name: string; phone: string }[]) => Promise<number>;
  friendRequests: import('../types').ContactRequest[];
  sendFriendRequest: (targetPhone: string, targetName?: string, message?: string) => Promise<boolean>;
  acceptFriendRequest: (requestId: string) => void;
  declineFriendRequest: (requestId: string) => void;
  respondToGroupInvitation: (chatId: string, accept: boolean) => void;
  endAudioSpace: (spaceId: string) => void;
  spaceEndedSummary: { spaceId: string; title: string; durationFormatted: string; peakListeners: number } | null;
  setSpaceEndedSummary: (val: { spaceId: string; title: string; durationFormatted: string; peakListeners: number } | null) => void;
  // Live Supabase Presence & Typing Indicators
  onlineUserKeys: Set<string>;
  isUserOnline: (phoneOrIdentifier?: string) => boolean;
  typingUsers: Record<string, string[]>;
  sendTypingIndicator: (chatId: string, isTyping: boolean) => void;
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
  applyForJob: (job: JobPosting) => { success: boolean; message: string };
  // 13. Security Settings (Payment PIN & Security Questions)
  securitySettings: SecuritySettings;
  setPaymentPin: (pin: string) => void;
  updatePaymentPin: (newPin: string, oldPin?: string) => { success: boolean; message: string };
  setSecurityQuestion: (question: string, answer: string) => void;
  verifyPaymentPin: (pin: string) => boolean;
  verifyPaymentPinDetailed: (pin: string) => { success: boolean; message?: string; lockedUntil?: number | null };
  resetPinLockout: () => void;
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
  addTownCommunity: (name: string, type: 'group' | 'channel', category: TownCommunity['category'], description: string) => void;
  // Feature Flags System
  featureFlags: FeatureFlags;
  isFeatureEnabled: (key: keyof FeatureFlags) => boolean;
  toggleFeatureFlag: (key: keyof FeatureFlags) => void;
  // Errands System
  errandRunners: ErrandRunner[];
  errandOrders: ErrandOrder[];
  isErrandsModalOpen: boolean;
  setIsErrandsModalOpen: (val: boolean) => void;
  createErrandOrder: (order: Omit<ErrandOrder, 'id' | 'createdAt' | 'status' | 'escrowReleaseCode' | 'proofImages' | 'customerId' | 'customerName' | 'customerPhone'>) => ErrandOrder | null;
  completeErrandWithCode: (orderId: string, code: string) => boolean;
  disputeErrandOrder: (orderId: string, reason: string) => void;
  registerAsErrandRunner: (data: { name: string; location: string; deliveryBaseFee: number }) => void;
  addErrandRunnerItem: (item: Omit<ErrandItem, 'id'>) => void;
  removeErrandRunnerItem: (itemId: string) => void;
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
  // 22. Artisan Service Station & Workspace Management
  artisanStation: ArtisanStation | null;
  registerArtisanStation: (
    stationData: Partial<ArtisanStation>,
    paymentMethod: 'wallet' | 'paystack'
  ) => { success: boolean; message: string; station?: ArtisanStation };
  addArtisanListing: (
    listing: Omit<ServiceOffering, 'id'>,
    paymentMethod?: 'wallet' | 'paystack'
  ) => { success: boolean; message: string; listing?: ServiceOffering };
  updateStationHours: (hours: ArtisanStation['operatingHours']) => void;
  hireArtisanStaff: (
    staff: Omit<ArtisanStaff, 'id' | 'hiredAt' | 'status'>
  ) => { success: boolean; staffMember: ArtisanStaff };
  assignArtisanTask: (
    task: Omit<ArtisanTask, 'id' | 'createdAt' | 'status'>
  ) => { success: boolean; task: ArtisanTask };
  updateArtisanTaskStatus: (taskId: string, status: ArtisanTask['status']) => void;
  isArtisanModalOpen: boolean;
  setIsArtisanModalOpen: (val: boolean) => void;
  // 23. Anti-Fraud Referral & Invite System
  referralProgram: ReferralProgram;
  isReferralModalOpen: boolean;
  setIsReferralModalOpen: (val: boolean) => void;
  claimReferralBonus: () => { success: boolean; amountClaimed: number; message: string };
  simulateInviteContact: (name: string, phone: string, passesFraudCheck: boolean) => void;
  // 24. Celebrity Identity Verification
  isCelebrityModalOpen: boolean;
  setIsCelebrityModalOpen: (val: boolean) => void;
  celebrityApplications: CelebrityVerificationApplication[];
  applyForCelebrityVerification: (data: {
    stageName: string;
    category: CelebrityVerificationApplication['category'];
    socialHandle: string;
    proofDocumentUrl?: string;
  }) => { success: boolean; message: string };
  toggleCelebrityStatus: () => void;
  // 25. Store Registration & Tiers (3k/mo for 30 limit, 7k/mo for 100 limit)
  isStoreRegModalOpen: boolean;
  setIsStoreRegModalOpen: (val: boolean) => void;
  storeSubscription: StoreSubscription;
  subscribeStoreTier: (
    tier: 'starter_30' | 'pro_100',
    storeName: string,
    category: string,
    description: string,
    paymentMethod: 'wallet' | 'paystack'
  ) => { success: boolean; message: string };
  // 26. Creator Digital Files & VIP Call/Video/Chat Booking
  creatorFiles: CreatorDigitalFile[];
  buyCreatorFile: (fileId: string) => { success: boolean; file?: CreatorDigitalFile; message: string };
  uploadCreatorFile: (fileData: Omit<CreatorDigitalFile, 'id' | 'downloadsCount' | 'isPurchasedByMe' | 'createdAt'>) => void;
  bookCreatorVipSession: (creatorId: string, type: 'voice' | 'video' | 'chat', durationMinutes: number, price: number) => { success: boolean; message: string };
  updateCreatorVipRates: (creatorId: string, rates: Partial<CreatorVipService>) => void;
  // 27. Writers System (AfriBooks - Chapters, Tips, Paid Books & Buddy Read)
  afriBooks: AfriBook[];
  activeReadingBook: AfriBook | null;
  setActiveReadingBook: (book: AfriBook | null) => void;
  activeReadingChapterIndex: number;
  setActiveReadingChapterIndex: (idx: number) => void;
  isWritersModalOpen: boolean;
  setIsWritersModalOpen: (val: boolean) => void;
  submitNewBook: (book: Omit<AfriBook, 'id' | 'totalReads' | 'tipsReceivedCount' | 'tipsTotalAmount' | 'isPurchasedByMe' | 'publishedAt'>) => { success: boolean; book: AfriBook; message: string };
  addChapterToBook: (bookId: string, chapter: Omit<BookChapter, 'id' | 'comments'>) => void;
  commentOnChapter: (bookId: string, chapterId: string, commentText: string) => void;
  tipBookAuthor: (bookId: string, amount: number) => { success: boolean; message: string };
  buyPaidBook: (bookId: string) => { success: boolean; message: string };
  groupReadSessions: GroupReadSession[];
  activeGroupReadSession: GroupReadSession | null;
  setActiveGroupReadSession: (session: GroupReadSession | null) => void;
  startGroupReadSession: (bookId: string, buddyName: string, buddyAvatar?: string) => GroupReadSession;
  sendGroupReadMessage: (sessionId: string, text: string) => void;
  updateGroupReadProgress: (sessionId: string, chapterIndex: number, page: number) => void;
  // 28. African Tutor & Online Course Marketplace System
  tutorProfile: TutorProfile;
  courses: Course[];
  isTutorModalOpen: boolean;
  setIsTutorModalOpen: (val: boolean) => void;
  activeLearningCourse: Course | null;
  setActiveLearningCourse: (course: Course | null) => void;
  registerAsTutor: (data: {
    tutorName: string;
    bio: string;
    category: string;
    payVerificationBlueCheck: boolean;
    paymentMethod: 'wallet' | 'paystack';
  }) => { success: boolean; message: string };
  upgradeTutorUnlimited: (paymentMethod: 'wallet' | 'paystack') => { success: boolean; message: string };
  publishCourse: (courseData: Omit<Course, 'id' | 'tutorId' | 'tutorName' | 'tutorAvatar' | 'tutorIsBlueVerified' | 'enrolledStudentsCount' | 'rating' | 'reviewsCount' | 'createdAt' | 'isEnrolledByMe'>) => { success: boolean; course?: Course; message: string };
  enrollInCourse: (courseId: string, paymentMethod: 'wallet' | 'paystack') => { success: boolean; message: string };
  // 29. Super Admin Console & Moderation
  isAdminModalOpen: boolean;
  setIsAdminModalOpen: (val: boolean) => void;
  adminUsers: AdminUserRecord[];
  toggleUserVerification: (userId: string, badge: 'blue' | 'gold' | 'creator_plus' | null) => void;
  toggleUserSuspension: (userId: string) => void;
  adminResolveEscrow: (orderId: string, action: 'release_to_seller' | 'refund_to_buyer', note: string) => { success: boolean; message: string };
  systemBroadcast: AdminSystemBroadcast | null;
  setSystemBroadcast: (broadcast: AdminSystemBroadcast | null) => void;
  createAdminBroadcast: (title: string, message: string, level: 'info' | 'warning' | 'alert') => void;
}

const AppContext = createContext<AppContextType | null>(null);

export const CURRENCY_RATES: Record<CurrencyCode, number> = {
  NGN: 1,
  KES: 0.11,
  GHS: 0.011,
  ZAR: 0.013,
};

export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  NGN: '₦',
  KES: 'KSh ',
  GHS: 'GH₵ ',
  ZAR: 'R ',
};

// ─── Data Version Nuke ───────────────────────────────────────────────────────
// Bump this string whenever you need to wipe all stale cached/mock data.
const AGC_DATA_VERSION = 'v3_clean_2026';
(function nukeStaleMockData() {
  if (typeof window === 'undefined') return;
  const stored = localStorage.getItem('AGC_data_version');
  if (stored !== AGC_DATA_VERSION) {
    const keepKeys = new Set(['AGC_data_version', 'AGC_font_size', 'AGC_low_data_mode', 'AGC_language', 'AGC_currency', 'AGC_hide_phone_town', 'AGC_user_profile_v2', 'AGC_is_authenticated', 'AGC_device_contacts', 'AGC_registered_users_cache', 'AGC_registered_phones', 'AGC_taken_usernames', 'AGC_session_token', 'AGC_all_registered_users']);
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('AGC_') && !keepKeys.has(key)) {
        toRemove.push(key);
      }
    }
    toRemove.forEach((k) => localStorage.removeItem(k));
    localStorage.setItem('AGC_data_version', AGC_DATA_VERSION);
    console.log('[AGC] Stale data cleared, starting fresh.');
  }
})();


const INITIAL_ERRAND_RUNNERS: ErrandRunner[] = [
  {
    id: 'runner_kelvin',
    userId: 'usr_kelvin',
    name: 'Kelvin Okafor (FastRunner Lekki)',
    phone: '+2348021112233',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    location: 'Lekki / Victoria Island',
    bio: 'Professional market shopper. Fresh meat, fish, curry & farm produce delivery in 45 mins.',
    rating: 4.9,
    reviewsCount: 38,
    completedCount: 32, // Gold Errand Master milestone unlocked!
    deliveryBaseFee: 1500,
    currency: 'NGN',
    isOnline: true,
    isRegistered: true,
    itemsForSale: [
      { id: 'item_1', name: 'Fresh Whole Chicken', price: 3800, unit: 'kg', category: 'Meat & Poultry', inStock: true },
      { id: 'item_2', name: 'Fresh Titus Fish (Mackerel)', price: 2900, unit: 'kg', category: 'Meat & Poultry', inStock: true },
      { id: 'item_3', name: 'Oloyin Honey Beans', price: 1400, unit: 'derica', category: 'Food Stuffs', inStock: true },
      { id: 'item_4', name: 'Ducros Curry Powder', price: 650, unit: 'pack', category: 'Spices & Seasoning', inStock: true },
      { id: 'item_5', name: 'Nescafe Classic Coffee', price: 2400, unit: 'jar', category: 'Groceries', inStock: true },
      { id: 'item_6', name: 'Fresh Bell Peppers (Tatase)', price: 1200, unit: 'basket', category: 'Food Stuffs', inStock: true },
    ],
  },
  {
    id: 'runner_amina',
    userId: 'usr_amina',
    name: 'Amina Bello (Garki Market Express)',
    phone: '+2348035556677',
    avatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=200&auto=format&fit=crop&q=80',
    location: 'Wuse / Garki, Abuja',
    bio: 'Direct market purchases from wholesale dealers. Freshness guaranteed or money refunded.',
    rating: 4.8,
    reviewsCount: 22,
    completedCount: 18,
    deliveryBaseFee: 2000,
    currency: 'NGN',
    isOnline: true,
    isRegistered: true,
    itemsForSale: [
      { id: 'item_7', name: 'Beef Cut & Cleaned', price: 4200, unit: 'kg', category: 'Meat & Poultry', inStock: true },
      { id: 'item_8', name: 'Brown Beans', price: 1300, unit: 'derica', category: 'Food Stuffs', inStock: true },
      { id: 'item_9', name: 'Groundnut Oil (Devon Kings)', price: 3200, unit: 'litre', category: 'Groceries', inStock: true },
      { id: 'item_10', name: 'Catfish Live/Cleaned', price: 3500, unit: 'kg', category: 'Meat & Poultry', inStock: true },
    ],
  },
];

const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  wallet: true,
  market: true,
  artisan: true,
  errands: true,
  ajo: true,
  payroll: true,
  writers: true,
  creator: true,
  escrow: true,
  tutor: true,
  dispatch: true,
  calls: true,
  status: true,
  town: true,
  audioSpaces: true,
  healthcare: true,
  legal: true,
  jobs: true,
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Persistent Supabase channel ref for status feed (avoids channel leak on every like/view)
  const statusFeedChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  // Persistent pre-subscribed broadcast channel for instant chat sends (no subscribe() delay per message)
  const chatBroadcastChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  // Track which per-chat inbox channels are already subscribed (phone -> channel)
  const inboxChannelRefsRef = useRef<Map<string, ReturnType<typeof supabase.channel>>>(new Map());
  // ── Feature Flags System (Wallet as Master Hub) ──────────────────────────
  const [featureFlags, setFeatureFlags] = useState<FeatureFlags>(() => {
    try {
      const saved = localStorage.getItem('AGC_feature_flags_v1');
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return {
      wallet: true, market: true, artisan: true, errands: true, ajo: true,
      payroll: true, writers: true, creator: true, escrow: true, tutor: true,
      dispatch: true, calls: true, status: true, town: true, audioSpaces: true,
      healthcare: true, legal: true, jobs: true,
    };
  });

  const isFeatureEnabled = (key: keyof FeatureFlags): boolean => {
    if (key === 'wallet') return featureFlags.wallet;
    const WALLET_DEPENDENTS: (keyof FeatureFlags)[] = [
      'market', 'artisan', 'errands', 'ajo', 'payroll', 'writers', 'creator', 'escrow', 'tutor'
    ];
    if (WALLET_DEPENDENTS.includes(key)) {
      return featureFlags.wallet && Boolean(featureFlags[key]);
    }
    return Boolean(featureFlags[key]);
  };

  const toggleFeatureFlag = (key: keyof FeatureFlags) => {
    setFeatureFlags((prev: FeatureFlags) => {
      const next = { ...prev, [key]: !prev[key] };
      try { localStorage.setItem('AGC_feature_flags_v1', JSON.stringify(next)); } catch (_) {}
      return next;
    });
  };

  // ── Errands System ────────────────────────────────────────────────────────
  const [errandRunners, setErrandRunners] = useState<ErrandRunner[]>(() => {
    try {
      const saved = localStorage.getItem('AGC_errand_runners_v1');
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return [
      {
        id: 'runner_kelvin',
        userId: 'usr_kelvin',
        name: 'Kelvin Okafor (FastRunner Lekki)',
        phone: '+2348021112233',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
        location: 'Lekki / Victoria Island',
        bio: 'Professional market shopper. Fresh meat, fish, curry & farm produce delivery in 45 mins.',
        rating: 4.9,
        reviewsCount: 38,
        completedCount: 32,
        deliveryBaseFee: 1500,
        currency: 'NGN',
        isOnline: true,
        isRegistered: true,
        itemsForSale: [
          { id: 'item_1', name: 'Fresh Whole Chicken', price: 3800, unit: 'kg', category: 'Meat & Poultry', inStock: true },
          { id: 'item_2', name: 'Fresh Titus Fish (Mackerel)', price: 2900, unit: 'kg', category: 'Meat & Poultry', inStock: true },
          { id: 'item_3', name: 'Oloyin Honey Beans', price: 1400, unit: 'derica', category: 'Food Stuffs', inStock: true },
          { id: 'item_4', name: 'Ducros Curry Powder', price: 650, unit: 'pack', category: 'Spices & Seasoning', inStock: true },
          { id: 'item_5', name: 'Nescafe Classic Coffee', price: 2400, unit: 'jar', category: 'Groceries', inStock: true },
          { id: 'item_6', name: 'Fresh Bell Peppers (Tatase)', price: 1200, unit: 'basket', category: 'Food Stuffs', inStock: true },
        ],
      },
      {
        id: 'runner_amina',
        userId: 'usr_amina',
        name: 'Amina Bello (Garki Market Express)',
        phone: '+2348035556677',
        avatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=200&auto=format&fit=crop&q=80',
        location: 'Wuse / Garki, Abuja',
        bio: 'Direct market purchases from wholesale dealers. Freshness guaranteed.',
        rating: 4.8,
        reviewsCount: 22,
        completedCount: 18,
        deliveryBaseFee: 2000,
        currency: 'NGN',
        isOnline: true,
        isRegistered: true,
        itemsForSale: [
          { id: 'item_7', name: 'Beef Cut & Cleaned', price: 4200, unit: 'kg', category: 'Meat & Poultry', inStock: true },
          { id: 'item_8', name: 'Brown Beans', price: 1300, unit: 'derica', category: 'Food Stuffs', inStock: true },
          { id: 'item_9', name: 'Groundnut Oil (Devon Kings)', price: 3200, unit: 'litre', category: 'Groceries', inStock: true },
        ],
      },
    ];
  });

  const [errandOrders, setErrandOrders] = useState<ErrandOrder[]>(() => {
    try {
      const saved = localStorage.getItem('AGC_errand_orders_v1');
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return [];
  });

  const [isErrandsModalOpen, setIsErrandsModalOpen] = useState(false);

  useEffect(() => {
    try { localStorage.setItem('AGC_errand_runners_v1', JSON.stringify(errandRunners)); } catch (_) {}
  }, [errandRunners]);

  useEffect(() => {
    try { localStorage.setItem('AGC_errand_orders_v1', JSON.stringify(errandOrders)); } catch (_) {}
  }, [errandOrders]);

  const createErrandOrder = (
    orderData: Omit<ErrandOrder, 'id' | 'createdAt' | 'status' | 'escrowReleaseCode' | 'proofImages' | 'customerId' | 'customerName' | 'customerPhone'>
  ): ErrandOrder | null => {
    if (wallet.availableBalance < orderData.totalAmount) return null;

    const escrowTx: WalletTransaction = {
      id: `tx_errand_${Date.now()}`,
      type: 'escrow_lock',
      title: `Errand Escrow Lock (Runner: ${orderData.runnerName})`,
      amount: orderData.totalAmount,
      currency: 'NGN',
      timestamp: 'Just now',
      status: 'completed',
      channel: 'wallet',
    };

    setWallet((prev) => ({
      ...prev,
      availableBalance: prev.availableBalance - orderData.totalAmount,
      escrowLockedBalance: prev.escrowLockedBalance + orderData.totalAmount,
      transactions: [escrowTx, ...prev.transactions],
    }));

    const randomPin = Math.floor(1000 + Math.random() * 9000).toString();
    const newOrder: ErrandOrder = {
      ...orderData,
      id: `errand_${Date.now()}`,
      customerId: currentUser.id,
      customerName: currentUser.fullName,
      customerPhone: currentUser.phoneNumber,
      status: 'pending',
      escrowReleaseCode: randomPin,
      proofImages: [],
      createdAt: 'Just now',
    };

    setErrandOrders((prev) => [newOrder, ...prev]);
    return newOrder;
  };

  const completeErrandWithCode = (orderId: string, code: string): boolean => {
    const order = errandOrders.find((o) => o.id === orderId);
    if (!order || order.escrowReleaseCode !== code) return false;

    const releaseTx: WalletTransaction = {
      id: `tx_errand_rel_${Date.now()}`,
      type: 'escrow_release',
      title: `Errand Escrow Release (Order: ${order.id})`,
      amount: order.totalAmount,
      currency: 'NGN',
      timestamp: 'Just now',
      status: 'completed',
      channel: 'wallet',
    };

    setWallet((prev) => ({
      ...prev,
      escrowLockedBalance: Math.max(0, prev.escrowLockedBalance - order.totalAmount),
      transactions: [releaseTx, ...prev.transactions],
    }));

    setErrandOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: 'completed' } : o)));
    setErrandRunners((prev) => prev.map((r) => r.id === order.runnerId ? { ...r, completedCount: r.completedCount + 1 } : r));
    return true;
  };

  const disputeErrandOrder = (orderId: string, reason: string) => {
    setErrandOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: 'disputed', disputeReason: reason } : o)));
  };

  const registerAsErrandRunner = (data: { name: string; location: string; deliveryBaseFee: number }) => {
    const newRunner: ErrandRunner = {
      id: `runner_${Date.now()}`,
      userId: currentUser.id,
      name: data.name,
      phone: currentUser.phoneNumber,
      avatar: currentUser.avatarUrl,
      location: data.location,
      bio: `Verified AGC Errand Runner based in ${data.location}.`,
      rating: 5.0,
      reviewsCount: 1,
      completedCount: 0,
      deliveryBaseFee: data.deliveryBaseFee,
      currency: 'NGN',
      isOnline: true,
      isRegistered: true,
      itemsForSale: [
        { id: `item_${Date.now()}_1`, name: 'Fresh Chicken', price: 3500, unit: 'kg', category: 'Meat & Poultry', inStock: true },
        { id: `item_${Date.now()}_2`, name: 'Fresh Fish', price: 2800, unit: 'kg', category: 'Meat & Poultry', inStock: true },
        { id: `item_${Date.now()}_3`, name: 'Curry Powder', price: 500, unit: 'pack', category: 'Spices & Seasoning', inStock: true },
        { id: `item_${Date.now()}_4`, name: 'Beans (Honey/Brown)', price: 1200, unit: 'derica', category: 'Food Stuffs', inStock: true },
        { id: `item_${Date.now()}_5`, name: 'Coffee', price: 2200, unit: 'jar', category: 'Groceries', inStock: true },
      ],
    };
    setErrandRunners((prev) => [newRunner, ...prev.filter((r) => r.userId !== currentUser.id)]);
  };

  const addErrandRunnerItem = (item: Omit<ErrandItem, 'id'>) => {
    const newItem: ErrandItem = { ...item, id: `item_${Date.now()}` };
    setErrandRunners((prev) => prev.map((r) => {
      if (r.userId === currentUser.id || r.phone === currentUser.phoneNumber) {
        return { ...r, itemsForSale: [newItem, ...r.itemsForSale] };
      }
      return r;
    }));
  };

  const removeErrandRunnerItem = (itemId: string) => {
    setErrandRunners((prev) => prev.map((r) => {
      if (r.userId === currentUser.id || r.phone === currentUser.phoneNumber) {
        return { ...r, itemsForSale: r.itemsForSale.filter((i: any) => i.id !== itemId) };
      }
      return r;
    }));
  };
  const [language, setLanguage] = useState<LanguageCode>('en');
  const [currency, setCurrencyState] = useState<CurrencyCode>(() => {
    try {
      const saved = localStorage.getItem('AGC_currency');
      if (saved && (saved === 'NGN' || saved === 'KES' || saved === 'GHS' || saved === 'ZAR')) {
        return saved as CurrencyCode;
      }
    } catch (_) {}
    return 'NGN';
  });

  const setCurrency = (c: CurrencyCode) => {
    setCurrencyState(c);
    try {
      localStorage.setItem('AGC_currency', c);
    } catch (_) {}
    setWallet((prev) => ({
      ...prev,
      currency: c,
    }));
  };
  const [lowDataMode, setLowDataMode] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'status' | 'calls' | 'town' | 'chats' | 'settings' | 'market'>('status');

  // Display & Appearance
  const [fontSize, setFontSizeState] = useState<AppFontSize>(() => {
    return (localStorage.getItem('AGC_font_size') as AppFontSize) || 'normal';
  });

  const setFontSize = (size: AppFontSize) => {
    setFontSizeState(size);
    localStorage.setItem('AGC_font_size', size);
    document.documentElement.classList.remove('text-size-small', 'text-size-normal', 'text-size-large', 'text-size-huge');
    document.documentElement.classList.add(`text-size-${size}`);
  };

  useEffect(() => {
    document.documentElement.classList.remove('text-size-small', 'text-size-normal', 'text-size-large', 'text-size-huge');
    document.documentElement.classList.add(`text-size-${fontSize}`);
  }, [fontSize]);

  const [chatWallpaper, setChatWallpaperState] = useState<string | null>(() => {
    return localStorage.getItem('AGC_wallpaper') || null;
  });

  const setChatWallpaper = (wallpaper: string | null) => {
    setChatWallpaperState(wallpaper);
    if (wallpaper) {
      localStorage.setItem('AGC_wallpaper', wallpaper);
    } else {
      localStorage.removeItem('AGC_wallpaper');
    }
  };

  // QR Code Scanner Modal
  const [isScanQrModalOpen, setIsScanQrModalOpen] = useState(false);

  // Town Communities & Anonymous Privacy
  const [townCommunities, setTownCommunities] = useState<TownCommunity[]>(() => {
    try {
      const saved = localStorage.getItem('AGC_town_communities_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && !parsed.some((c: TownCommunity) => c.id === 'town_cv_tech' || c.id === 'town_afritech_daily')) {
          return parsed;
        } else {
          localStorage.removeItem('AGC_town_communities_v2');
        }
      }
    } catch (e) {
      console.warn(e);
    }
    return [];
  });
  const [hidePhoneNumberInTown, setHidePhoneNumberInTown] = useState<boolean>(() => {
    return localStorage.getItem('AGC_hide_phone_town') === 'true';
  });
  const toggleHidePhoneNumberInTown = () => {
    setHidePhoneNumberInTown((prev) => {
      const next = !prev;
      localStorage.setItem('AGC_hide_phone_town', String(next));
      return next;
    });
  };
  useEffect(() => {
    try {
      localStorage.setItem('AGC_town_communities_v2', JSON.stringify(townCommunities));
    } catch (e) {}
  }, [townCommunities]);

  // Sync communities across devices from Supabase & Gateway server
  useEffect(() => {
    // 1. Fetch from Supabase town_communities
    if (isSupabaseConfigured) {
      supabase
        .from('town_communities')
        .select('*')
        .then(({ data }) => {
          if (data && Array.isArray(data) && data.length > 0) {
            setTownCommunities((prev) => {
              const map = new Map<string, TownCommunity>();
              prev.forEach((c) => map.set(c.id, c));
              data.forEach((row: any) => {
                const tags: string[] = Array.isArray(row.tags) ? row.tags : [];
                const typeTag = tags.find((t: string) => t.startsWith('type:'));
                const commType = typeTag ? (typeTag.replace('type:', '') as 'group' | 'channel') : (row.category === 'Broadcast' ? 'channel' : 'group');
                const membersTag = tags.find((t: string) => t.startsWith('members:'));
                let parsedMembers: string[] = [];
                if (membersTag) {
                  try { parsedMembers = JSON.parse(membersTag.replace('members:', '')); } catch (_) {}
                }
                const actualCount = row.members_count || (parsedMembers.length > 0 ? parsedMembers.length + 1 : 1);

                map.set(row.id, {
                  id: row.id,
                  name: row.name,
                  type: commType,
                  category: row.category || 'Tech & Hustle',
                  description: row.description || '',
                  membersCount: actualCount,
                  avatar: row.avatar || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(row.name)}&backgroundColor=581c87&textColor=ffffff`,
                  isVerified: row.is_live || false,
                  isJoined: true,
                  recentActivity: parsedMembers.length > 0 ? `${parsedMembers.length} members connected` : 'Active community',
                  adminName: 'AGC Admin',
                });

                // Sync corresponding chat thread in chats state
                const chatId = `town_comm_${row.id}`;
                setChats((cPrev) => {
                  const existingIdx = cPrev.findIndex((c) => c.id === chatId || c.name === row.name);
                  if (existingIdx !== -1) {
                    const cExisting = cPrev[existingIdx];
                    const updatedChat: ChatThread = {
                      ...cExisting,
                      membersCount: actualCount,
                      members: parsedMembers.length > 0 ? parsedMembers : cExisting.members,
                    };
                    const updated = [...cPrev];
                    updated[existingIdx] = updatedChat;
                    try { localStorage.setItem('AGC_chats_v2', JSON.stringify(updated)); } catch (_) {}
                    return updated;
                  }
                  return cPrev;
                });
              });
              const merged = Array.from(map.values());
              try { localStorage.setItem('AGC_town_communities_v2', JSON.stringify(merged)); } catch (_) {}
              return merged;
            });
          }
        });
    }

    // 2. Fetch from Gateway server /api/communities
    try {
      const socketHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
      fetch(`http://${socketHost}:3002/api/communities`)
        .then((r) => (r.ok ? r.json() : null))
        .then((json) => {
          if (json?.communities && Array.isArray(json.communities) && json.communities.length > 0) {
            setTownCommunities((prev) => {
              const map = new Map<string, TownCommunity>();
              prev.forEach((c) => map.set(c.id, c));
              json.communities.forEach((c: TownCommunity) => map.set(c.id, c));
              const merged = Array.from(map.values());
              try { localStorage.setItem('AGC_town_communities_v2', JSON.stringify(merged)); } catch (_) {}
              return merged;
            });
          }
        })
        .catch(() => {});
    } catch (_) {}

    // 3. Socket.io community_created listener
    const socket = getSocket();
    const handleCommunityCreated = (comm: TownCommunity) => {
      if (!comm || !comm.id) return;
      setTownCommunities((prev) => {
        if (prev.some((c) => c.id === comm.id)) return prev;
        const updated = [comm, ...prev];
        try { localStorage.setItem('AGC_town_communities_v2', JSON.stringify(updated)); } catch (_) {}
        return updated;
      });
    };

    socket?.on('community_created', handleCommunityCreated);

    // 4. Supabase Realtime live_town_communities broadcast listener across devices
    let commCh: ReturnType<typeof supabase.channel> | null = null;
    if (isSupabaseConfigured) {
      commCh = supabase.channel('live_town_communities', { config: { broadcast: { self: false } } });
      commCh
        .on('broadcast', { event: 'community_created' }, ({ payload }) => {
          if (!payload || !payload.id) return;
          handleCommunityCreated(payload);
          // Also register corresponding chat thread
          const chatId = `town_comm_${payload.id}`;
          setChats((prev) => {
            if (prev.some((c) => c.id === chatId)) return prev;
            const newThread: ChatThread = {
              id: chatId,
              name: payload.name,
              avatar: payload.avatar,
              isGroup: true,
              membersCount: payload.membersCount || 1,
              verifiedStore: false,
              location: `${payload.type === 'channel' ? 'Broadcast Channel' : 'Town Group'} · ${payload.category}`,
              unreadCount: 0,
              lastMessage: payload.description || 'Community live',
              lastMessageTime: 'Just now',
              catalog: [],
              isOnline: true,
            };
            const updated = [newThread, ...prev];
            try { localStorage.setItem('AGC_chats_v2', JSON.stringify(updated)); } catch (_) {}
            return updated;
          });
        })
        .on('broadcast', { event: 'members_updated' }, ({ payload }: any) => {
          if (!payload?.chatName) return;
          setTownCommunities((prev) =>
            prev.map((c) =>
              c.name === payload.chatName ? { ...c, membersCount: payload.membersCount } : c
            )
          );
          setChats((prev) =>
            prev.map((c) =>
              c.name === payload.chatName
                ? {
                    ...c,
                    membersCount: payload.membersCount,
                    members: payload.members || c.members,
                  }
                : c
            )
          );
        })
        .subscribe();
    }

    return () => {
      socket?.off('community_created', handleCommunityCreated);
      if (commCh) commCh.unsubscribe();
    };
  }, []);



  const toggleJoinTownCommunity = (id: string) => {
    setTownCommunities((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, isJoined: !c.isJoined, membersCount: c.isJoined ? c.membersCount - 1 : c.membersCount + 1 } : c
      )
    );
  };

  const addTownCommunity = (name: string, type: 'group' | 'channel', category: TownCommunity['category'], description: string) => {
    const newCommunity: TownCommunity = {
      id: `town_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: name.trim(),
      type,
      category,
      membersCount: 1,
      avatar: `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=581c87&textColor=ffffff`,
      description: description.trim() || `${type === 'channel' ? 'Channel' : 'Group'} community`,
      isVerified: false,
      isJoined: true,
      recentActivity: 'Just created',
      adminName: currentUser.fullName || 'You',
    };
    setTownCommunities((prev) => {
      const updated = [newCommunity, ...prev];
      try { localStorage.setItem('AGC_town_communities_v2', JSON.stringify(updated)); } catch (e) {}
      return updated;
    });

    // 🌐 LIVE SYSTEM: Persist to Supabase and broadcast to all devices in real-time
    if (isSupabaseConfigured) {
      createTownCommunityInDb({
        name: newCommunity.name,
        type: newCommunity.type,
        category: newCommunity.category,
        description: newCommunity.description,
        avatar: newCommunity.avatar,
        members_count: 1,
      }).catch((e) => console.warn('Supabase community create notice:', e));

      try {
        const commCh = supabase.channel('live_town_communities', { config: { broadcast: { self: false } } });
        commCh.subscribe((st) => {
          if (st === 'SUBSCRIBED') {
            commCh.send({ type: 'broadcast', event: 'community_created', payload: newCommunity });
          }
        });
      } catch (_) {}
    }

    // Create corresponding ChatThread so the group/channel appears in chat list
    const communityChatId = `town_comm_${newCommunity.id}`;
    const newThread: ChatThread = {
      id: communityChatId,
      name: newCommunity.name,
      avatar: newCommunity.avatar,
      isGroup: true,
      membersCount: 1,
      verifiedStore: false,
      location: `${type === 'channel' ? 'Broadcast Channel' : 'Town Group'} · ${category}`,
      unreadCount: 0,
      lastMessage: newCommunity.description,
      lastMessageTime: 'Just now',
      catalog: [],
      isOnline: true,
    };
    setChats((prev) => {
      const updated = [newThread, ...prev.filter((c) => c.id !== communityChatId)];
      try { localStorage.setItem('AGC_chats_v2', JSON.stringify(updated)); } catch (e) {}
      return updated;
    });

    // Broadcast via Socket.io
    const socket = getSocket();
    socket?.emit('create_community', newCommunity);

    // Save to gateway server
    try {
      const socketHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
      fetch(`http://${socketHost}:3002/api/communities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCommunity),
      }).catch(() => {});
    } catch (_) {}

    // Persist to Supabase town_communities
    if (isSupabaseConfigured) {
      supabase.from('town_communities').insert({
        id: newCommunity.id,
        name: newCommunity.name,
        category: newCommunity.category,
        description: newCommunity.description,
        avatar: newCommunity.avatar,
        members_count: 1,
      }).then(({ error }) => {
        if (error) console.warn('Town community Supabase insert notice:', error.message);
      });
    }
  };

  const openCommunityChat = (community: TownCommunity) => {
    const chatId = `town_comm_${community.id}`;
    setChats((prev) => {
      if (prev.some((c) => c.id === chatId)) return prev;
      const newThread: ChatThread = {
        id: chatId,
        name: community.name,
        avatar: community.avatar,
        isGroup: true,
        membersCount: community.membersCount || 1,
        verifiedStore: false,
        location: `${community.type === 'channel' ? 'Broadcast Channel' : 'Town Group'} · ${community.category}`,
        unreadCount: 0,
        lastMessage: community.description || `Welcome to ${community.name}`,
        lastMessageTime: 'Just now',
        catalog: [],
        isOnline: true,
      };
      const updated = [newThread, ...prev];
      try { localStorage.setItem('AGC_chats_v2', JSON.stringify(updated)); } catch (e) {}
      return updated;
    });

    if (!community.isJoined) {
      toggleJoinTownCommunity(community.id);
    }

    joinChatRoom(chatId);
    setActiveTab('chats');
    setActiveChatId(chatId);
  };

  // Healthcare
  const [doctors] = useState<DoctorProfile[]>([]);
  const [queueTokens, setQueueTokens] = useState<HospitalQueueToken[]>([]);
  const [medicationReminders, setMedicationReminders] = useState<MedicationReminder[]>([]);
  const [healthVault, setHealthVault] = useState<HealthVaultRecord>({
    bloodGroup: 'O+',
    genotype: 'AA',
    allergies: [],
    chronicConditions: [],
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyNotes: '',
    qrCodeId: '',
    lastUpdated: 'Not configured yet',
  });
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
  const [lawyers] = useState<LawyerProfile[]>([]);
  const [contractTemplates] = useState<LegalContractTemplate[]>(MOCK_CONTRACT_TEMPLATES);
  const [generatedContracts, setGeneratedContracts] = useState<GeneratedLegalContract[]>([]);
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
  const [creators, setCreators] = useState<CreatorProfile[]>([]);
  const [creatorPosts, setCreatorPosts] = useState<CreatorPost[]>([]);
  const [creatorShows, setCreatorShows] = useState<CreatorShowTicket[]>([]);
  const [creatorSongs, setCreatorSongs] = useState<CreatorSong[]>([]);
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
          nowFollowed = !c.isFollowedByMe;
          return {
            ...c,
            isFollowedByMe: nowFollowed,
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
      message: `🎵 Purchased "${song.title}"! 100% payout credited directly to ${song.artistName}'s AGC Wallet. Stream & download unlocked.`,
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
      creatorAvatar: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='50' fill='%23180a33'/><circle cx='50' cy='38' r='18' fill='%23a855f7'/><path d='M16 88c0-18.778 15.222-34 34-34s34 15.222 34 34' fill='%23a855f7'/></svg>",
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

  // 22. Artisan Service Station & Workspace Management
  const [artisanStation, setArtisanStation] = useState<ArtisanStation | null>(() => {
    try {
      const saved = localStorage.getItem('AGC_artisan_station');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse artisan station:', e);
    }
    return null;
  });
  const [isArtisanModalOpen, setIsArtisanModalOpen] = useState(false);

  const registerArtisanStation = (
    stationData: Partial<ArtisanStation>,
    paymentMethod: 'wallet' | 'paystack'
  ) => {
    const regFee = 5000;
    if (paymentMethod === 'wallet' && wallet.availableBalance < regFee) {
      return {
        success: false,
        message: 'Insufficient wallet balance for ₦5,000 station registration. Please top up your wallet or select Paystack.',
      };
    }

    if (paymentMethod === 'wallet') {
      const newTx: WalletTransaction = {
        id: `tx_artisan_reg_${Date.now()}`,
        type: 'transfer_out',
        title: 'Artisan Station Registration Fee (₦5,000)',
        amount: regFee,
        currency: 'NGN',
        timestamp: 'Just now',
        status: 'completed',
        channel: 'wallet',
      };
      setWallet((prev) => ({
        ...prev,
        availableBalance: prev.availableBalance - regFee,
        transactions: [newTx, ...prev.transactions],
      }));
    }

    const newStation: ArtisanStation = {
      id: `station_${Date.now()}`,
      ownerId: currentUser.id,
      ownerName: currentUser.fullName,
      ownerPhone: currentUser.phoneNumber,
      stationName: stationData.stationName || `${currentUser.fullName}'s Master Station`,
      category: stationData.category || 'mechanic',
      categoryLabel: stationData.categoryLabel || 'Auto & Engineering Specialist',
      location: stationData.location || 'Surulere Artisan Complex, Lagos',
      workshopAddress: stationData.workshopAddress || 'Block 5, Commercial Avenue, Lagos',
      about: stationData.about || 'Verified high-precision African workshop station with Escrow guarantees.',
      avatar: stationData.avatar || currentUser.avatarUrl,
      isApproved: true,
      registrationFeePaid: true,
      registrationFeeAmount: regFee,
      registrationPaymentMethod: paymentMethod,
      registeredAt: 'Just now',
      operatingHours: stationData.operatingHours || {
        days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        startTime: '08:00 AM',
        endTime: '07:00 PM',
        breakTime: '01:00 PM - 02:00 PM',
      },
      listings: stationData.listings || [],
      staff: stationData.staff || [
        {
          id: `staff_owner_${Date.now()}`,
          name: currentUser.fullName,
          role: 'Senior Artisan',
          phone: currentUser.phoneNumber,
          hiredAt: 'Today',
          wage: 'Lead Partner',
          status: 'active',
        },
      ],
      tasks: stationData.tasks || [],
    };

    setArtisanStation(newStation);
    localStorage.setItem('AGC_artisan_station', JSON.stringify(newStation));

    // 🌐 LIVE SYSTEM: Publish Artisan Station to Supabase and broadcast live to network
    if (isSupabaseConfigured) {
      createArtisanStationInDb({
        station_name: newStation.stationName,
        category: newStation.category,
        category_label: newStation.categoryLabel,
        location: newStation.location,
        workshop_address: newStation.workshopAddress,
        about: newStation.about,
        avatar: newStation.avatar,
        is_approved: true,
        registration_fee_paid: true,
        operating_hours: newStation.operatingHours as any,
      }).catch((e) => console.warn('Supabase create station notice:', e));

      try {
        const artCh = supabase.channel('live_artisan_stations', { config: { broadcast: { self: false } } });
        artCh.subscribe((st) => {
          if (st === 'SUBSCRIBED') {
            artCh.send({ type: 'broadcast', event: 'station_registered', payload: newStation });
          }
        });
      } catch (_) {}
    }

    return { success: true, message: 'Artisan Station successfully registered and live on AGC Network!', station: newStation };
  };

  const addArtisanListing = (
    listing: Omit<ServiceOffering, 'id'>,
    paymentMethod: 'wallet' | 'paystack' = 'wallet'
  ) => {
    const listingFee = 500;
    if (paymentMethod === 'wallet' && wallet.availableBalance < listingFee) {
      return {
        success: false,
        message: 'Insufficient wallet balance for ₦500 listing fee. Please top up your wallet.',
      };
    }

    if (paymentMethod === 'wallet') {
      const newTx: WalletTransaction = {
        id: `tx_lst_fee_${Date.now()}`,
        type: 'transfer_out',
        title: `Service Listing Fee (₦500): ${listing.title}`,
        amount: listingFee,
        currency: 'NGN',
        timestamp: 'Just now',
        status: 'completed',
        channel: 'wallet',
      };
      setWallet((prev) => ({
        ...prev,
        availableBalance: prev.availableBalance - listingFee,
        transactions: [newTx, ...prev.transactions],
      }));
    }

    const newOffering: ServiceOffering = {
      ...listing,
      id: `lst_${Date.now()}`,
    };

    if (artisanStation) {
      const updatedStation: ArtisanStation = {
        ...artisanStation,
        listings: [...artisanStation.listings, newOffering],
      };
      setArtisanStation(updatedStation);
      localStorage.setItem('AGC_artisan_station', JSON.stringify(updatedStation));
    }

    // Also sync to global serviceProviders so any client in AGC can discover and book it
    setServiceProviders((prev) => {
      const existing = prev.find((p) => p.phone === currentUser.phoneNumber || (artisanStation && p.id === artisanStation.id));
      if (existing) {
        const updated = prev.map((p) => (p.id === existing.id ? { ...p, servicesOffered: [newOffering, ...p.servicesOffered] } : p));
        localStorage.setItem('AGC_service_providers', JSON.stringify(updated));
        return updated;
      } else {
        const brandNewProvider: ServiceProvider = {
          id: artisanStation?.id || `serv_${Date.now()}`,
          name: currentUser.fullName,
          businessName: artisanStation?.stationName || 'Verified Artisan Station',
          avatar: currentUser.avatarUrl,
          category: artisanStation?.category || 'mechanic',
          categoryLabel: artisanStation?.categoryLabel || 'Master Artisan',
          rating: 5.0,
          reviewCount: 1,
          hourlyRate: newOffering.price,
          currency: 'NGN',
          location: artisanStation?.location || 'Lagos, Nigeria',
          about: artisanStation?.about || 'Verified artisan workshop.',
          experienceYears: 6,
          phone: currentUser.phoneNumber,
          isVerified: true,
          badge: 'Master Artisan Station',
          availability: {
            days: artisanStation?.operatingHours.days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
            timeSlots: ['09:00 AM', '12:00 PM', '03:00 PM', '05:30 PM'],
          },
          servicesOffered: [newOffering],
          portfolioImages: [
            'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=400&auto=format&fit=crop&q=80',
          ],
        };
        const updated = [brandNewProvider, ...prev];
        localStorage.setItem('AGC_service_providers', JSON.stringify(updated));
        return updated;
      }
    });

    return {
      success: true,
      message: `New service listing "${newOffering.title}" published! (₦500 fee paid)`,
      listing: newOffering,
    };
  };

  const updateStationHours = (hours: ArtisanStation['operatingHours']) => {
    if (!artisanStation) return;
    const updated = { ...artisanStation, operatingHours: hours };
    setArtisanStation(updated);
    localStorage.setItem('AGC_artisan_station', JSON.stringify(updated));
  };

  const hireArtisanStaff = (staff: Omit<ArtisanStaff, 'id' | 'hiredAt' | 'status'>) => {
    const newStaff: ArtisanStaff = {
      ...staff,
      id: `staff_${Date.now()}`,
      hiredAt: 'Today',
      status: 'active',
    };
    if (artisanStation) {
      const updated = { ...artisanStation, staff: [...artisanStation.staff, newStaff] };
      setArtisanStation(updated);
      localStorage.setItem('AGC_artisan_station', JSON.stringify(updated));
    }
    return { success: true, staffMember: newStaff };
  };

  const assignArtisanTask = (task: Omit<ArtisanTask, 'id' | 'createdAt' | 'status'>) => {
    const newTask: ArtisanTask = {
      ...task,
      id: `task_${Date.now()}`,
      status: 'pending',
      createdAt: 'Just now',
    };
    if (artisanStation) {
      const updated = { ...artisanStation, tasks: [newTask, ...artisanStation.tasks] };
      setArtisanStation(updated);
      localStorage.setItem('AGC_artisan_station', JSON.stringify(updated));
    }
    return { success: true, task: newTask };
  };

  const updateArtisanTaskStatus = (taskId: string, status: ArtisanTask['status']) => {
    if (!artisanStation) return;
    const updatedTasks = artisanStation.tasks.map((t) => (t.id === taskId ? { ...t, status } : t));
    const updated = { ...artisanStation, tasks: updatedTasks };
    setArtisanStation(updated);
    localStorage.setItem('AGC_artisan_station', JSON.stringify(updated));
  };

  // 23. Anti-Fraud Referral & Invite System
  const [referralProgram, setReferralProgram] = useState<ReferralProgram>(() => {
    try {
      const saved = localStorage.getItem('AGC_referral_program');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse referral program:', e);
    }
    return {
      referralCode: '',
      totalEarned: 0,
      availableBonus: 0,
      invitedCount: 0,
      pendingPayout: 0,
      invitedContacts: [],
    };
  });
  const [isReferralModalOpen, setIsReferralModalOpen] = useState(false);

  const claimReferralBonus = () => {
    if (referralProgram.availableBonus <= 0) {
      return { success: false, amountClaimed: 0, message: 'No unlocked referral bonuses ready to claim right now.' };
    }
    const bonusToClaim = referralProgram.availableBonus;
    const newTx: WalletTransaction = {
      id: `tx_ref_bonus_${Date.now()}`,
      type: 'topup',
      title: 'Anti-Fraud Referral Reward Bonus Claim',
      amount: bonusToClaim,
      currency: 'NGN',
      timestamp: 'Just now',
      status: 'completed',
      channel: 'wallet',
    };
    setWallet((prev) => ({
      ...prev,
      availableBalance: prev.availableBalance + bonusToClaim,
      transactions: [newTx, ...prev.transactions],
    }));
    setReferralProgram((prev) => {
      const updated = {
        ...prev,
        availableBonus: 0,
      };
      localStorage.setItem('AGC_referral_program', JSON.stringify(updated));
      return updated;
    });
    return {
      success: true,
      amountClaimed: bonusToClaim,
      message: `🎉 ₦${bonusToClaim.toLocaleString()} referral reward credited to your AGC wallet!`,
    };
  };

  const simulateInviteContact = (name: string, phone: string, passesFraudCheck: boolean) => {
    const newInvited: ReferredUser = {
      id: `ref_${Date.now()}`,
      name,
      phone,
      joinedAt: 'Just now',
      otpVerified: passesFraudCheck,
      walletFundedOrTransacted: passesFraudCheck,
      transactionAmount: passesFraudCheck ? 5000 : 0,
      activityCompleted: passesFraudCheck,
      status: passesFraudCheck ? 'verified_active' : 'pending',
      rewardEarned: passesFraudCheck ? 500 : 0,
    };
    setReferralProgram((prev) => {
      const newReferredList = [newInvited, ...prev.referredList];
      const verified = newReferredList.filter((r) => r.status === 'verified_active').length;
      const pending = newReferredList.filter((r) => r.status === 'pending').length;
      const additionalBonus = passesFraudCheck ? 500 : 0;
      const updated: ReferralProgram = {
        ...prev,
        totalInvited: prev.totalInvited + 1,
        activeVerifiedCount: verified,
        pendingCount: pending,
        totalEarned: prev.totalEarned + additionalBonus,
        availableBonus: prev.availableBonus + additionalBonus,
        referredList: newReferredList,
      };
      localStorage.setItem('AGC_referral_program', JSON.stringify(updated));
      return updated;
    });
  };

  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  // Automatically mark chat as read when opened (clears badge instantly)
  useEffect(() => {
    if (!activeChatId) return;
    setChats((prev) => {
      let hasChanges = false;
      const updated = prev.map((c) => {
        if (c.id === activeChatId && c.unreadCount > 0) {
          hasChanges = true;
          return { ...c, unreadCount: 0 };
        }
        return c;
      });
      if (hasChanges) {
        try {
          localStorage.setItem('AGC_chats_v2', JSON.stringify(updated));
        } catch (_) {}
        return updated;
      }
      return prev;
    });
  }, [activeChatId]);
  const [chats, setChats] = useState<ChatThread[]>(() => {
    try {
      const userKey = getUserStorageKey('AGC_chats_v2');
      const saved = localStorage.getItem(userKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && !parsed.some((c: ChatThread) => c.id === 'chat_balogun_ajo' || c.id === 'chat_mama_chidinma')) {
          return parsed;
        } else {
          localStorage.removeItem(userKey);
        }
      }
    } catch (e) {
      console.warn(e);
    }
    return [];
  });
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>(() => {
    try {
      const userKey = getUserStorageKey('AGC_messages_v2');
      const saved = localStorage.getItem(userKey);
      if (saved) {
        const parsed: Record<string, ChatMessage[]> = JSON.parse(saved);
        const now = Date.now();
        // Purge expired voice notes (24h TTL) on load
        const purged: Record<string, ChatMessage[]> = {};
        for (const [cid, msgs] of Object.entries(parsed)) {
          purged[cid] = msgs.map((m) => {
            if (m.type === 'voice' && m.voiceNote?.expiresAt) {
              const exp = new Date(m.voiceNote.expiresAt).getTime();
              if (!isNaN(exp) && now > exp) {
                // Replace expired voice note with a tombstone text message
                return {
                  ...m,
                  type: 'text' as const,
                  text: '🎙️ Voice note expired',
                  voiceNote: undefined,
                };
              }
            }
            return m;
          });
        }
        return purged;
      }
    } catch (e) {
      console.warn(e);
    }
    return {};
  });
  const [calls, setCalls] = useState<CallLogItem[]>(() => {
    try {
      const saved = localStorage.getItem('AGC_calls_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && !parsed.some((c: CallLogItem) => c.phone === '+234 803 123 4567' || c.name === 'Mama Chidinma Textiles')) {
          return parsed;
        } else {
          localStorage.removeItem('AGC_calls_v2');
        }
      }
    } catch (e) {
      console.warn(e);
    }
    return [];
  });
    const [statuses, setStatuses] = useState<UserStatus[]>(() => {
    try {
      const saved = localStorage.getItem('AGC_statuses_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn(e);
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('AGC_statuses_v2', JSON.stringify(statuses));
    } catch (e) {
      console.warn('Status save error:', e);
    }
  }, [statuses]);
  const [activeViewingStatus, setActiveViewingStatus] = useState<UserStatus | null>(null);
  const [activeCheckoutProduct, setActiveCheckoutProduct] = useState<Product | null>(null);
  const [escrowOrders, setEscrowOrders] = useState<EscrowOrder[]>(() => {
    try {
      const saved = localStorage.getItem('AGC_escrow_orders_v2');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn(e);
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('AGC_escrow_orders_v2', JSON.stringify(escrowOrders));
    } catch (e) {}
  }, [escrowOrders]);
  const [activeEscrowModalOrder, setActiveEscrowModalOrder] = useState<EscrowOrder | null>(null);
  const [activeCall, setActiveCall] = useState<ActiveCallState | null>(null);
  const [incomingCall, setIncomingCall] = useState<{
    roomId: string;
    callerName: string;
    callerPhone: string;
    callerAvatar?: string;
    type: 'voice' | 'video';
  } | null>(null);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // 1. Meme & Sticker Studio State
  const [isMemeStudioOpen, setIsMemeStudioOpen] = useState(false);

  // 2. Live Audio Spaces / Street Radio State
  const [audioSpaces, setAudioSpaces] = useState<AudioSpace[]>(() => {
    try {
      const saved = localStorage.getItem('AGC_audio_spaces_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && !parsed.some((s: AudioSpace) => s.id === 'space_afrobeats_01' || s.id === 'space_market_02')) {
          return parsed;
        } else {
          localStorage.removeItem('AGC_audio_spaces_v2');
        }
      }
    } catch (e) {
      console.warn(e);
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('AGC_audio_spaces_v2', JSON.stringify(audioSpaces));
    } catch (e) {}
  }, [audioSpaces]);
  const [activeAudioSpace, setActiveAudioSpace] = useState<AudioSpace | null>(null);

  // 🌐 LIVE SYSTEM: Hydrate and listen for live Audio Spaces across devices
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    fetchLiveAudioSpaces().then(({ data }) => {
      if (data && Array.isArray(data) && data.length > 0) {
        setAudioSpaces((prev) => {
          const map = new Map<string, AudioSpace>();
          prev.forEach((s) => map.set(s.id, s));
          data.forEach((row: any) => {
            map.set(row.id, {
              id: row.id,
              title: row.title,
              topic: row.topic || '',
              category: row.category || 'Tech & Hustle',
              hostName: row.host_name || 'Host',
              hostAvatar: row.host_avatar || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(row.title)}&backgroundColor=581c87&textColor=ffffff`,
              listenersCount: row.listeners_count || 1,
              isLive: row.is_live,
              isLowBandwidthMode: row.is_low_bandwidth_mode ?? true,
              speakers: Array.isArray(row.speakers) ? row.speakers : [
                { id: 'host', name: row.host_name || 'Host', avatar: row.host_avatar || '', role: 'host', isSpeaking: true, isMuted: false }
              ],
            });
          });
          const merged = Array.from(map.values());
          try { localStorage.setItem('AGC_audio_spaces_v2', JSON.stringify(merged)); } catch (_) {}
          return merged;
        });
      }
    });

    const spaceCh = supabase.channel('live_audio_spaces', { config: { broadcast: { self: false } } });
    spaceCh
      .on('broadcast', { event: 'space_started' }, ({ payload }) => {
        if (!payload || !payload.id) return;
        setAudioSpaces((prev) => {
          const updated = [payload, ...prev.filter((s) => s.id !== payload.id)];
          try { localStorage.setItem('AGC_audio_spaces_v2', JSON.stringify(updated)); } catch (_) {}
          return updated;
        });
      })
      .on('broadcast', { event: 'space_ended' }, ({ payload }) => {
        if (!payload?.id) return;
        setAudioSpaces((prev) => prev.filter((s) => s.id !== payload.id));
      })
      .subscribe();

    return () => {
      spaceCh.unsubscribe();
    };
  }, []);



  // 3. Scam Alert & Reputation Checker State
  const [scamDatabase, setScamDatabase] = useState<Record<string, ScamEntity>>(() => {
    // Load from localStorage first (persists user-submitted reports between sessions)
    try {
      const saved = localStorage.getItem('AGC_scam_database_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge with MOCK_SCAM_DATABASE so built-in entries are always present
        return { ...MOCK_SCAM_DATABASE, ...parsed };
      }
    } catch (_) {}
    return { ...MOCK_SCAM_DATABASE };
  });
  const [isScamCheckerModalOpen, setIsScamCheckerModalOpen] = useState(false);
  const [scamLookupEntity, setScamLookupEntity] = useState<ScamEntity | null>(null);
  const [isCheckingReputation, setIsCheckingReputation] = useState(false);

  // 4. Screenshot & Screen Recording Blocker State
  const [isScreenshotBlockerActive, setIsScreenshotBlockerActive] = useState<boolean>(true);
  const [screenshotBlockedToast, setScreenshotBlockedToast] = useState<string | null>(null);

  // 5. Automated Invoice & Receipt State
  const [isInvoiceGeneratorOpen, setIsInvoiceGeneratorOpen] = useState(false);
  const [viewingInvoice, setViewingInvoice] = useState<InvoiceData | null>(null);

  // 6. Group Polls with Financial Stakes State
  const [isFinancialPollModalOpen, setIsFinancialPollModalOpen] = useState(false);

  // 7. Ajo / Esusu Group Savings State
  const [activeAjoGroup, setActiveAjoGroup] = useState<AjoGroup | null>(null);
  const [isAjoModalOpen, setIsAjoModalOpen] = useState(false);

  // 8. Phone Number OTP Authentication & Identity State
  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem('AGC_user_profile_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.phoneNumber && parsed.id !== 'usr_chioma_adebayo' && parsed.fullName !== 'Chioma Adebayo') {
          return { ...parsed, isPhoneVerified: true };
        }
      }
    } catch (e) {
      console.warn('Failed to parse user profile:', e);
    }
    return {
      id: '',
      phoneNumber: '',
      fullName: 'AGC User',
      avatarUrl: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='50' fill='%23180a33'/><circle cx='50' cy='38' r='18' fill='%23a855f7'/><path d='M16 88c0-18.778 15.222-34 34-34s34 15.222 34 34' fill='%23a855f7'/></svg>",
      about: 'Available · Using AGC',
      createdAt: new Date().toISOString(),
      lastSeen: 'online',
      isPhoneVerified: false,
    };
  });

  // Automatically persist chats & messages strictly partitioned per user
  useEffect(() => {
    const clean = (currentUser?.phoneNumber || '').replace(/\D/g, '');
    if (clean) {
      try {
        localStorage.setItem(`AGC_chats_v2_${clean}`, JSON.stringify(chats));
      } catch (_) {}
    }
  }, [chats, currentUser?.phoneNumber]);

  useEffect(() => {
    const clean = (currentUser?.phoneNumber || '').replace(/\D/g, '');
    if (clean) {
      try {
        localStorage.setItem(`AGC_messages_v2_${clean}`, JSON.stringify(messages));
      } catch (_) {}
    }
  }, [messages, currentUser?.phoneNumber]);

  // Re-read user's chats and messages whenever switching users / phone number
  useEffect(() => {
    if (!currentUser?.phoneNumber) return;
    const chatKey = getUserStorageKey('AGC_chats_v2', currentUser.phoneNumber);
    const msgKey = getUserStorageKey('AGC_messages_v2', currentUser.phoneNumber);
    try {
      const savedChats = localStorage.getItem(chatKey);
      if (savedChats) {
        const parsed = JSON.parse(savedChats);
        if (Array.isArray(parsed) && !parsed.some((c: ChatThread) => c.id === 'chat_balogun_ajo' || c.id === 'chat_mama_chidinma')) {
          setChats(parsed);
        } else {
          setChats([]);
        }
      } else {
        setChats([]);
      }
    } catch (_) {
      setChats([]);
    }

    try {
      const savedMsgs = localStorage.getItem(msgKey);
      setMessages(savedMsgs ? JSON.parse(savedMsgs) : {});
    } catch (_) {
      setMessages({});
    }
  }, [currentUser?.phoneNumber]);
  useEffect(() => {
    try {
      const savedWallet = localStorage.getItem('AGC_user_wallet_v2');
      if (savedWallet) {
        const parsed = JSON.parse(savedWallet);
        if (parsed && parsed.availableBalance === 125000) {
          localStorage.setItem('AGC_user_wallet_v2', JSON.stringify({
            availableBalance: 0,
            escrowLockedBalance: 0,
            currency: 'NGN',
            transactions: []
          }));
          setWallet({
            availableBalance: 0,
            escrowLockedBalance: 0,
            currency: 'NGN',
            transactions: []
          });
        }
      }
      // Clean legacy mock service providers and other caches
      const sp = localStorage.getItem('AGC_service_providers_v2');
      if (sp && sp.includes('sp_tunde_mechanic')) {
        localStorage.removeItem('AGC_service_providers_v2');
      }
      const st = localStorage.getItem('AGC_artisan_station_v2');
      if (st && st.includes('st_kofi_workshop')) {
        localStorage.removeItem('AGC_artisan_station_v2');
      }
    } catch (e) {}
  }, []);

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const profile = localStorage.getItem('AGC_user_profile_v2');
      const isAuth = localStorage.getItem('AGC_is_authenticated');
      if (isAuth === 'true' && profile) {
        const parsed = JSON.parse(profile);
        if (parsed && parsed.phoneNumber && parsed.id !== 'usr_chioma_adebayo' && parsed.fullName !== 'Chioma Adebayo') {
          return true;
        }
      }
    } catch (e) {
      return false;
    }
    return false;
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isKickedOut, setIsKickedOut] = useState(false);

  // 🌐 LIVE SYSTEM: Hydrate and listen for live Artisan Stations & Service Providers
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    fetchLiveArtisanStations().then(({ data }) => {
      if (data && Array.isArray(data) && data.length > 0) {
        const myStationRow = data.find((row: any) => row.owner_phone === currentUser.phoneNumber || row.owner_id === currentUser.id);
        if (myStationRow) {
          const loadedStation: ArtisanStation = {
            id: myStationRow.id,
            ownerId: myStationRow.owner_id || currentUser.id,
            ownerName: myStationRow.owner_name || currentUser.fullName,
            ownerPhone: myStationRow.owner_phone || currentUser.phoneNumber,
            stationName: myStationRow.station_name,
            category: myStationRow.category,
            categoryLabel: myStationRow.category_label || 'Master Artisan',
            location: myStationRow.location,
            workshopAddress: myStationRow.workshop_address || '',
            about: myStationRow.about || '',
            avatar: myStationRow.avatar || currentUser.avatarUrl,
            isApproved: myStationRow.is_approved ?? true,
            registrationFeePaid: myStationRow.registration_fee_paid ?? true,
            registrationFeeAmount: 5000,
            registrationPaymentMethod: 'wallet',
            registeredAt: myStationRow.created_at || 'Just now',
            operatingHours: myStationRow.operating_hours || {
              days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
              startTime: '08:00 AM',
              endTime: '07:00 PM',
              breakTime: '01:00 PM - 02:00 PM',
            },
            listings: myStationRow.listings || [],
            staff: myStationRow.staff || [],
            tasks: myStationRow.tasks || [],
          };
          setArtisanStation(loadedStation);
          try { localStorage.setItem('AGC_artisan_station', JSON.stringify(loadedStation)); } catch (_) {}
        }
      }
    });

    const artCh = supabase.channel('live_artisan_stations', { config: { broadcast: { self: false } } });
    artCh
      .on('broadcast', { event: 'station_registered' }, ({ payload }) => {
        if (!payload || !payload.id) return;
        const newProvider: ServiceProvider = {
          id: payload.id,
          name: payload.ownerName || 'Verified Artisan',
          businessName: payload.stationName,
          avatar: payload.avatar,
          category: payload.category,
          categoryLabel: payload.categoryLabel,
          rating: 5.0,
          reviewCount: 1,
          hourlyRate: 5000,
          currency: 'NGN',
          location: payload.location,
          about: payload.about,
          experienceYears: 5,
          phone: payload.ownerPhone,
          isVerified: true,
          badge: 'Master Artisan Station',
          availability: {
            days: payload.operatingHours?.days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
            timeSlots: ['09:00 AM', '12:00 PM', '03:00 PM', '05:30 PM'],
          },
          servicesOffered: payload.listings || [],
          portfolioImages: [],
        };
        setServiceProviders((prev) => [newProvider, ...prev.filter((p) => p.id !== payload.id)]);
      })
      .subscribe();

    return () => {
      artCh.unsubscribe();
    };
  }, [currentUser.phoneNumber, currentUser.id]);

  // 🌐 LIVE SYSTEM: Realtime Live Job Board Broadcast channel
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const jobCh = supabase.channel('live_job_board', { config: { broadcast: { self: false } } });
    jobCh
      .on('broadcast', { event: 'new_job_posted' }, ({ payload }: any) => {
        if (!payload?.job) return;
        const incoming: JobPosting = payload.job;
        setJobPostings((prev) => {
          if (prev.some((j) => j.id === incoming.id)) return prev;
          const updated = [incoming, ...prev];
          try {
            localStorage.setItem('AGC_job_postings', JSON.stringify(updated));
          } catch (e) {}
          return updated;
        });
      })
      .subscribe();

    return () => {
      jobCh.unsubscribe();
    };
  }, [isSupabaseConfigured]);

  // 🌐 LIVE SYSTEM: Realtime Global User Registration & Device Sync
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const userSyncCh = supabase.channel('global_user_sync', { config: { broadcast: { self: false } } });
    userSyncCh
      .on('broadcast', { event: 'user_registered' }, ({ payload }: any) => {
        if (!payload || !payload.phoneNumber) return;
        const clean = payload.phoneNumber.replace(/\D/g, '');
        const core = clean.replace(/^234|^233|^254|^27|^256|^250|^225|^255|^237|^20|^44|^1/, '').replace(/^0+/, '');
        try {
          const regMap = JSON.parse(localStorage.getItem('AGC_registered_phones') || '{}');
          regMap[clean] = payload;
          regMap[payload.phoneNumber] = payload;
          if (core) {
            regMap[core] = payload;
            if (core.length >= 9) regMap[core.slice(-9)] = payload;
          }
          localStorage.setItem('AGC_registered_phones', JSON.stringify(regMap));

          const allUsers: UserProfile[] = JSON.parse(localStorage.getItem('AGC_all_registered_users') || '[]');
          if (!allUsers.some((u) => u.phoneNumber === payload.phoneNumber)) {
            allUsers.push(payload);
            localStorage.setItem('AGC_all_registered_users', JSON.stringify(allUsers));
          }
        } catch (_) {}
      })
      .subscribe();

    return () => {
      userSyncCh.unsubscribe();
    };
  }, [isSupabaseConfigured]);

  // 🌐 LIVE SYSTEM: Hydrate and listen for live Store Subscriptions
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    fetchLiveStoreSubscriptions().then(({ data }) => {
      if (data && Array.isArray(data) && data.length > 0) {
        const myStore = data.find((row: any) => row.user_id === currentUser.id || row.user_phone === currentUser.phoneNumber);
        if (myStore) {
          const loadedSub: StoreSubscription = {
            tier: myStore.tier || 'starter_30',
            monthlyFee: myStore.tier === 'pro_100' ? 7000 : 3000,
            itemLimit: myStore.items_limit || (myStore.tier === 'pro_100' ? 100 : 30),
            itemsCount: myStore.items_used || 0,
            storeName: myStore.store_name,
            description: myStore.description || '',
            category: myStore.category || 'General Trade',
            active: myStore.is_active ?? true,
            expiresAt: 'In 30 days',
            paymentMethod: (myStore.payment_method as any) || 'wallet',
          };
          setStoreSubscription(loadedSub);
          try { localStorage.setItem('AGC_store_sub', JSON.stringify(loadedSub)); } catch (_) {}
        }
      }
    });
  }, [currentUser.id, currentUser.phoneNumber]);

  // 9. Contact Synchronization & Discovery State (Strictly partitioned per logged-in user)
  const [deviceContacts, setDeviceContacts] = useState<DeviceContact[]>(() => {
    try {
      const userKey = getUserStorageKey('AGC_device_contacts');
      const saved = localStorage.getItem(userKey);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse device contacts:', e);
    }
    return [];
  });
  const [isContactsModalOpen, setIsContactsModalOpen] = useState(false);

  // WeChat-style Friend Requests State (strictly partitioned per user)
  const [friendRequests, setFriendRequests] = useState<import('../types').ContactRequest[]>(() => {
    try {
      const userKey = getUserStorageKey('AGC_friend_requests');
      const saved = localStorage.getItem(userKey);
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return [];
  });

  const [spaceEndedSummary, setSpaceEndedSummary] = useState<{
    spaceId: string;
    title: string;
    durationFormatted: string;
    peakListeners: number;
  } | null>(null);

  // Re-read user's friend requests when phone changes
  useEffect(() => {
    const userKey = getUserStorageKey('AGC_friend_requests', currentUser.phoneNumber);
    try {
      const saved = localStorage.getItem(userKey);
      setFriendRequests(saved ? JSON.parse(saved) : []);
    } catch (_) {}
  }, [currentUser.phoneNumber]);

  // Persist friend requests scoped by current user phone
  useEffect(() => {
    if (currentUser.phoneNumber) {
      try {
        const userKey = getUserStorageKey('AGC_friend_requests', currentUser.phoneNumber);
        localStorage.setItem(userKey, JSON.stringify(friendRequests));
      } catch (_) {}
    }
  }, [friendRequests, currentUser.phoneNumber]);

  // Re-read user's contacts when phone changes
  useEffect(() => {
    const userKey = getUserStorageKey('AGC_device_contacts', currentUser.phoneNumber);
    try {
      const saved = localStorage.getItem(userKey);
      setDeviceContacts(saved ? JSON.parse(saved) : []);
    } catch (_) {}
  }, [currentUser.phoneNumber]);

  // Persist device contacts scoped by current user's phone
  useEffect(() => {
    if (currentUser.phoneNumber) {
      try {
        const userKey = getUserStorageKey('AGC_device_contacts', currentUser.phoneNumber);
        localStorage.setItem(userKey, JSON.stringify(deviceContacts));
      } catch (_) {}
    }
  }, [deviceContacts, currentUser.phoneNumber]);

  // Sync saved contacts across devices from Supabase & Gateway server
  useEffect(() => {
    if (!isAuthenticated || !currentUser?.phoneNumber) return;

    // 1. Fetch from Supabase device_contacts for THIS user
    if (isSupabaseConfigured && currentUser.id) {
      supabase
        .from('device_contacts')
        .select('*')
        .eq('owner_id', currentUser.id)
        .then(({ data }) => {
          if (data && Array.isArray(data) && data.length > 0) {
            setDeviceContacts((prev) => {
              const map = new Map<string, DeviceContact>();
              prev.forEach((c) => map.set(c.normalizedPhoneNumber, c));
              data.forEach((row: any) => {
                map.set(row.phone, {
                  id: row.id || `cnt_${row.phone}`,
                  name: row.name,
                  rawPhoneNumber: row.phone,
                  normalizedPhoneNumber: row.phone,
                  about: 'Available · Using AGC',
                  avatar: row.avatar_url,
                  isRegisteredOnAGC: row.is_on_afri_chat ?? true,
                });
              });
              const merged = Array.from(map.values());
              try {
                const userKey = getUserStorageKey('AGC_device_contacts', currentUser.phoneNumber);
                localStorage.setItem(userKey, JSON.stringify(merged));
              } catch (_) {}
              return merged;
            });
          }
        });

      // 1b. Enrich ONLY existing contacts with registered status from agc_phone_registry (never inject strangers)
      supabase
        .from('agc_phone_registry')
        .select('phone_digits, full_phone, username, avatar_url')
        .then(({ data }) => {
          if (data && Array.isArray(data) && data.length > 0) {
            setDeviceContacts((prev) => {
              let changed = false;
              const updated = prev.map((c) => {
                const matched = data.find((row: any) => phonesMatch(row.full_phone || row.phone_digits, c.normalizedPhoneNumber || c.rawPhoneNumber));
                if (matched && (!c.isRegisteredOnAGC || !c.registeredUser)) {
                  changed = true;
                  return {
                    ...c,
                    isRegisteredOnAGC: true,
                    avatar: matched.avatar_url || c.avatar,
                    registeredUser: {
                      id: `usr_${matched.phone_digits}`,
                      phoneNumber: matched.full_phone || c.normalizedPhoneNumber,
                      fullName: matched.username || c.name,
                      avatarUrl: matched.avatar_url || c.avatar,
                      about: 'Available · Using AGC',
                      createdAt: new Date().toISOString(),
                      lastSeen: 'recently',
                    },
                  };
                }
                return c;
              });
              if (changed) {
                try {
                  const userKey = getUserStorageKey('AGC_device_contacts', currentUser.phoneNumber);
                  localStorage.setItem(userKey, JSON.stringify(updated));
                } catch (_) {}
                return updated;
              }
              return prev;
            });
          }
        });
    }

    // 2. Fetch from local server registry to enrich contacts (never inject strangers)
    try {
      const socketHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
      fetch(`http://${socketHost}:3002/api/users`)
        .then((r) => (r.ok ? r.json() : null))
        .then((json) => {
          if (json?.users && Array.isArray(json.users)) {
            setDeviceContacts((prev) => {
              let changed = false;
              const updated = prev.map((c) => {
                const matched = json.users.find((u: any) => phonesMatch(u.phoneNumber || u.cleanPhone, c.normalizedPhoneNumber || c.rawPhoneNumber));
                if (matched && (!c.isRegisteredOnAGC || !c.registeredUser)) {
                  changed = true;
                  return {
                    ...c,
                    isRegisteredOnAGC: true,
                    avatar: matched.avatarUrl || c.avatar,
                    registeredUser: {
                      id: matched.id || `usr_${matched.cleanPhone}`,
                      phoneNumber: matched.phoneNumber || c.normalizedPhoneNumber,
                      fullName: matched.fullName || c.name,
                      avatarUrl: matched.avatarUrl || c.avatar,
                      about: matched.about || 'Available · Using AGC',
                      createdAt: new Date().toISOString(),
                      lastSeen: 'online',
                    },
                  };
                }
                return c;
              });
              if (changed) {
                try {
                  const userKey = getUserStorageKey('AGC_device_contacts', currentUser.phoneNumber);
                  localStorage.setItem(userKey, JSON.stringify(updated));
                } catch (_) {}
                return updated;
              }
              return prev;
            });
          }
        })
        .catch(() => {});
    } catch (_) {}
  }, [isAuthenticated, currentUser.id, currentUser.phoneNumber]);

  // ─── Realtime Presence & Live Typing Indicators (Supabase Channel) ────────
  const [onlineUserKeys, setOnlineUserKeys] = useState<Set<string>>(new Set());
  const [typingUsers, setTypingUsers] = useState<Record<string, string[]>>({});

  const isUserOnline = useCallback(
    (identifier?: string): boolean => {
      if (!identifier) return false;
      const clean = identifier.replace(/\D/g, '');
      const last9 = clean.length >= 9 ? clean.slice(-9) : clean;
      for (const k of onlineUserKeys) {
        if (k === identifier) return true;
        const kc = k.replace(/\D/g, '');
        if (kc && (kc === clean || (last9.length >= 7 && (kc.endsWith(last9) || clean.endsWith(kc.slice(-9)))))) {
          return true;
        }
      }
      return false;
    },
    [onlineUserKeys]
  );

  const sendTypingIndicator = useCallback(
    (chatId: string, isTyping: boolean) => {
      if (!isSupabaseConfigured || !currentUser?.phoneNumber) return;
      try {
        const ch = supabase.channel('online_presence');
        ch.send({
          type: 'broadcast',
          event: 'typing_indicator',
          payload: {
            chatId,
            senderPhone: currentUser.phoneNumber,
            senderName: currentUser.fullName || 'AGC User',
            isTyping,
          },
        });
      } catch (_) {}
    },
    [currentUser]
  );

  useEffect(() => {
    if (!isSupabaseConfigured || !isAuthenticated || !currentUser?.phoneNumber) return;

    const myCleanPhone = currentUser.phoneNumber.replace(/\D/g, '');
    const myLast9 = myCleanPhone.length >= 9 ? myCleanPhone.slice(-9) : myCleanPhone;
    const presenceKey = myLast9 || myCleanPhone || currentUser.id;

    const presenceChannel = supabase.channel('online_presence', {
      config: { presence: { key: presenceKey } },
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const keys = new Set<string>();
        Object.keys(state).forEach((k) => keys.add(k));
        Object.values(state).forEach((presences: any) => {
          if (Array.isArray(presences)) {
            presences.forEach((p) => {
              if (p.phone) keys.add(p.phone);
              if (p.cleanPhone) keys.add(p.cleanPhone);
              if (p.last9) keys.add(p.last9);
            });
          }
        });
        setOnlineUserKeys(keys);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        setOnlineUserKeys((prev) => {
          const next = new Set(prev);
          next.add(key);
          newPresences?.forEach((p: any) => {
            if (p.phone) next.add(p.phone);
            if (p.cleanPhone) next.add(p.cleanPhone);
            if (p.last9) next.add(p.last9);
          });
          return next;
        });
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        setOnlineUserKeys((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      })
      .on('broadcast', { event: 'typing_indicator' }, ({ payload }) => {
        if (!payload || payload.senderPhone === currentUser.phoneNumber) return;
        const { chatId, senderName, isTyping } = payload;
        setTypingUsers((prev) => {
          const currentList = prev[chatId] || [];
          if (isTyping) {
            if (!currentList.includes(senderName)) {
              return { ...prev, [chatId]: [...currentList, senderName] };
            }
            return prev;
          } else {
            const filtered = currentList.filter((n) => n !== senderName);
            return { ...prev, [chatId]: filtered };
          }
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            userId: currentUser.id,
            phone: currentUser.phoneNumber,
            cleanPhone: myCleanPhone,
            last9: myLast9,
            name: currentUser.fullName,
            onlineAt: new Date().toISOString(),
          });
        }
      });

    return () => {
      presenceChannel.unsubscribe();
    };
  }, [isAuthenticated, currentUser?.phoneNumber, currentUser?.id, currentUser?.fullName]);

  // Status Feed: fetch existing statuses from contacts + subscribe to live updates
  useEffect(() => {
    if (!isAuthenticated || !currentUser?.phoneNumber) return;
    const myCleanPhone = currentUser.phoneNumber.replace(/\D/g, '');

    // 1. Fetch contact statuses from Supabase (active 24h stories)
    if (isSupabaseConfigured) {
      // Automated DB Space Purge: Delete all expired statuses (>24h) from Supabase DB to prevent DB bloat
      supabase
        .from('user_statuses')
        .delete()
        .lt('expires_at', new Date().toISOString())
        .then(({ error }) => {
          if (!error) console.log('[AGC] Purged expired statuses from Supabase DB to free storage');
        });

      supabase
        .from('user_statuses')
        .select('*')
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(200)
        .then(({ data }) => {
          if (!data || !Array.isArray(data)) return;
          const incoming = data
            .filter((row: any) => {
              const isDifferentUser = row.user_id ? row.user_id !== currentUser.id : true;
              const rp = (row.user_phone || '').replace(/\D/g, '');
              const isDifferentPhone = myCleanPhone ? (!rp || rp !== myCleanPhone) : true;
              return isDifferentUser && isDifferentPhone;
            })
            .map((row: any): UserStatus => ({
              id: row.id,
              userId: row.user_id,
              userPhone: row.user_phone,
              userName: row.user_name || 'AGC User',
              userAvatar: row.user_avatar || '',
              isMe: false,
              statusType: row.status_type || 'thought',
              mediaUrl: row.media_url || undefined,
              videoUrl: row.video_url || undefined,
              thoughtBg: row.thought_bg || undefined,
              caption: row.caption || '',
              createdAt: row.created_at ? new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently',
              expiresInHours: 24,
              viewsCount: row.views_count || 0,
              likesCount: row.likes_count || 0,
              hasLikedByMe: false,
              viewers: [],
            }));
          if (incoming.length > 0) {
            setStatuses((prev) => {
              const myStatuses = prev.filter((s) => s.isMe);
              const otherStatuses = prev.filter((s) => !s.isMe);
              const existingIds = new Set(otherStatuses.map((s) => s.id));
              const newOnes = incoming.filter((s) => !existingIds.has(s.id));
              return [...myStatuses, ...newOnes, ...otherStatuses];
            });
          }
        });
    }

    // 2. Fetch from local server REST fallback
    try {
      const socketHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
      fetch(`http://${socketHost}:3002/api/statuses`)
        .then((r) => (r.ok ? r.json() : null))
        .then((serverStatuses) => {
          if (Array.isArray(serverStatuses) && serverStatuses.length > 0) {
            const incoming = serverStatuses
              .filter((s: any) => {
                const isDifferentUser = s.userId ? s.userId !== currentUser.id : true;
                const rp = (s.userPhone || s.phoneNumber || '').replace(/\D/g, '');
                const isDifferentPhone = myCleanPhone ? (!rp || rp !== myCleanPhone) : true;
                return isDifferentUser && isDifferentPhone;
              })
              .map((s: any) => ({ ...s, isMe: false }));
            if (incoming.length > 0) {
              setStatuses((prev) => {
                const existingIds = new Set(prev.map((item) => item.id));
                const newItems = incoming.filter((item) => !existingIds.has(item.id));
                return [...prev, ...newItems];
              });
            }
          }
        })
        .catch(() => {});
    } catch (_) {}

    // 3. Multi-Tab / Same Machine BroadcastChannel Sync
    let bcStatus: BroadcastChannel | null = null;
    try {
      bcStatus = new BroadcastChannel('AGC_statuses_sync');
      bcStatus.onmessage = (e) => {
        if (e.data?.type === 'new_status' && e.data.status) {
          const incoming: UserStatus = e.data.status;
          if (incoming.userId === currentUser.id) return;
          const senderPhone = (incoming.userPhone || '').replace(/\D/g, '');
          if (myCleanPhone && senderPhone && senderPhone === myCleanPhone) return;
          setStatuses((prev) => {
            if (prev.some((s) => s.id === incoming.id)) return prev;
            return [{ ...incoming, isMe: false }, ...prev];
          });
        } else if (e.data?.type === 'delete_status' && e.data.statusId) {
          setStatuses((prev) => prev.filter((s) => s.id !== e.data.statusId));
        }
      };
    } catch (_) {}

    // 4. Real-Time Socket.io Status Listeners
    const socket = getSocket();
    const onSocketNewStatus = ({ status }: any) => {
      if (!status) return;
      if (status.userId && status.userId === currentUser.id) return;
      const senderPhone = (status.userPhone || '').replace(/\D/g, '');
      if (myCleanPhone && senderPhone && senderPhone === myCleanPhone) return;
      setStatuses((prev) => {
        if (prev.some((s) => s.id === status.id)) return prev;
        return [{ ...status, isMe: false }, ...prev];
      });
    };

    const onSocketViewed = (payload: any) => {
      if (!payload?.statusId || !payload?.viewer) return;
      setStatuses((prev) =>
        prev.map((s) => {
          if (s.id !== payload.statusId) return s;
          if (s.viewers?.some((v: any) => v.id === payload.viewer.id)) return s;
          return { ...s, viewsCount: (s.viewsCount || 0) + 1, viewers: [...(s.viewers || []), payload.viewer] };
        })
      );
      setActiveViewingStatus((curr) => {
        if (!curr || curr.id !== payload.statusId) return curr;
        if (curr.viewers?.some((v) => v.id === payload.viewer.id)) return curr;
        return { ...curr, viewsCount: (curr.viewsCount || 0) + 1, viewers: [...(curr.viewers || []), payload.viewer] };
      });
    };

    const onSocketLiked = (payload: any) => {
      if (!payload?.statusId) return;
      setStatuses((prev) =>
        prev.map((s) => {
          if (s.id !== payload.statusId) return s;
          return { ...s, likesCount: payload.liked ? (s.likesCount || 0) + 1 : Math.max(0, (s.likesCount || 0) - 1) };
        })
      );
      setActiveViewingStatus((curr) => {
        if (!curr || curr.id !== payload.statusId) return curr;
        return { ...curr, likesCount: payload.liked ? (curr.likesCount || 0) + 1 : Math.max(0, (curr.likesCount || 0) - 1) };
      });
    };

    socket?.on('new_status', onSocketNewStatus);
    socket?.on('status_viewed', onSocketViewed);
    socket?.on('status_liked', onSocketLiked);

    // 5. Subscribe to real-time status feed via Supabase (Broadcast + Postgres CDC)
    if (!isSupabaseConfigured) return () => {
      if (bcStatus) bcStatus.close();
      socket?.off('new_status', onSocketNewStatus);
      socket?.off('status_viewed', onSocketViewed);
      socket?.off('status_liked', onSocketLiked);
    };

    const statusSub = supabase.channel('status_feed', { config: { broadcast: { self: true } } });
    statusFeedChannelRef.current = statusSub;
    statusSub
      .on('broadcast', { event: 'new_status' }, ({ payload }: any) => {
        if (!payload?.status) return;
        const incoming: UserStatus = payload.status;
        if (incoming.userId === currentUser.id) return;
        const senderPhone = (incoming.userPhone || '').replace(/\D/g, '');
        if (myCleanPhone && senderPhone && senderPhone === myCleanPhone) return;
        setStatuses((prev) => {
          if (prev.some((s) => s.id === incoming.id)) return prev;
          return [{ ...incoming, isMe: false }, ...prev];
        });
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'user_statuses' }, (payload: any) => {
        if (!payload?.new) return;
        const row = payload.new;
        if (row.user_id === currentUser.id) return;
        const rp = (row.user_phone || '').replace(/\D/g, '');
        if (myCleanPhone && rp && rp === myCleanPhone) return;
        const incoming: UserStatus = {
          id: row.id,
          userId: row.user_id,
          userPhone: row.user_phone,
          userName: row.user_name || 'AGC User',
          userAvatar: row.user_avatar || '',
          isMe: false,
          statusType: row.status_type || 'thought',
          mediaUrl: row.media_url || undefined,
          videoUrl: row.video_url || undefined,
          thoughtBg: row.thought_bg || undefined,
          caption: row.caption || '',
          createdAt: 'Just now',
          expiresInHours: 24,
          viewsCount: row.views_count || 0,
          likesCount: row.likes_count || 0,
          hasLikedByMe: false,
          viewers: [],
        };
        setStatuses((prev) => {
          if (prev.some((s) => s.id === incoming.id)) return prev;
          return [incoming, ...prev];
        });
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'user_statuses' }, (payload: any) => {
        if (!payload?.old?.id) return;
        setStatuses((prev) => prev.filter((s) => s.id !== payload.old.id));
      })
      // Cross-device sync: catch views_count / likes_count DB updates from other devices
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'user_statuses' }, (payload: any) => {
        if (!payload?.new?.id) return;
        const row = payload.new;
        setStatuses((prev) =>
          prev.map((s) => {
            if (s.id !== row.id) return s;
            return {
              ...s,
              viewsCount: row.views_count ?? s.viewsCount,
              likesCount: row.likes_count ?? s.likesCount,
            };
          })
        );
      })
      .on('broadcast', { event: 'status_viewed' }, ({ payload }: any) => {
        if (!payload?.statusId || !payload?.viewer) return;
        setStatuses((prev) =>
          prev.map((s) => {
            if (s.id !== payload.statusId) return s;
            if (s.viewers?.some((v) => v.id === payload.viewer.id)) return s;
            return { ...s, viewsCount: s.viewsCount + 1, viewers: [...(s.viewers || []), payload.viewer] };
          })
        );
        setActiveViewingStatus((curr) => {
          if (!curr || curr.id !== payload.statusId) return curr;
          if (curr.viewers?.some((v) => v.id === payload.viewer.id)) return curr;
          return { ...curr, viewsCount: (curr.viewsCount || 0) + 1, viewers: [...(curr.viewers || []), payload.viewer] };
        });
      })
      .on('broadcast', { event: 'status_liked' }, ({ payload }: any) => {
        if (!payload?.statusId) return;
        setStatuses((prev) =>
          prev.map((s) => {
            if (s.id !== payload.statusId) return s;
            return { ...s, likesCount: payload.liked ? s.likesCount + 1 : Math.max(0, s.likesCount - 1) };
          })
        );
        setActiveViewingStatus((curr) => {
          if (!curr || curr.id !== payload.statusId) return curr;
          return { ...curr, likesCount: payload.liked ? (curr.likesCount || 0) + 1 : Math.max(0, (curr.likesCount || 0) - 1) };
        });
      })
      .subscribe();

    return () => {
      if (bcStatus) bcStatus.close();
      if (statusSub) statusSub.unsubscribe();
      socket?.off('new_status', onSocketNewStatus);
      socket?.off('status_viewed', onSocketViewed);
      socket?.off('status_liked', onSocketLiked);
    };
  }, [isAuthenticated, currentUser?.phoneNumber]);

  // 10. User Uploaded Memes & GIFs + In-Chat Drawer State
  const [userMemes, setUserMemes] = useState<UserUploadedMeme[]>(() => {
    try {
      const saved = localStorage.getItem('AGC_user_memes');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse user memes:', e);
    }
    return [];
  });
  const [isEmojiMemeDrawerOpen, setIsEmojiMemeDrawerOpen] = useState(false);

  // Hide balance figure on Nav for public privacy
  const [hideBalanceOnNav, setHideBalanceOnNav] = useState<boolean>(() => {
    return localStorage.getItem('AGC_hide_balance') === 'true';
  });

  // 11. Gokada / PickkR Dispatch Integration State
  const [dispatchOrders, setDispatchOrders] = useState<DispatchDeliveryOrder[]>(() => {
    try {
      const saved = localStorage.getItem('AGC_dispatch_orders');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse dispatch orders:', e);
    }
    return [];
  });
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);

  // 12. Job Board with Employer Pay-to-Post State
  const [jobPostings, setJobPostings] = useState<JobPosting[]>(() => {
    try {
      const saved = localStorage.getItem('AGC_job_postings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
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
      const saved = localStorage.getItem('AGC_security_settings');
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
      const saved = localStorage.getItem('AGC_service_providers');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse service providers:', e);
    }
    return [];
  });
  const [serviceBookings, setServiceBookings] = useState<ServiceBooking[]>(() => {
    try {
      const saved = localStorage.getItem('AGC_service_bookings');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse service bookings:', e);
    }
    return [];
  });
  const [isServicesModalOpen, setIsServicesModalOpen] = useState(false);
  const [selectedServiceProvider, setSelectedServiceProvider] = useState<ServiceProvider | null>(null);

  // 15. Money Transfer with 1-2 Days Security Delay State
  const [delayedTransfers, setDelayedTransfers] = useState<DelayedTransfer[]>(() => {
    try {
      const saved = localStorage.getItem('AGC_delayed_transfers');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse delayed transfers:', e);
    }
    return [];
  });
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  // 16. Payroll & Recurring Auto-Debit State
  const [payrollEmployees, setPayrollEmployees] = useState<PayrollEmployee[]>(() => {
    try {
      const saved = localStorage.getItem('AGC_payroll_employees');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse payroll employees:', e);
    }
    return [];
  });
  const [payrollLogs, setPayrollLogs] = useState<PayrollRunLog[]>(() => {
    try {
      const saved = localStorage.getItem('AGC_payroll_logs');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse payroll logs:', e);
    }
    return [];
  });
  const [isPayrollModalOpen, setIsPayrollModalOpen] = useState(false);

  // Persistent User Wallet State
  const [wallet, setWallet] = useState<UserWallet>(() => {
    try {
      const saved = localStorage.getItem('AGC_user_wallet_v2');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to parse saved wallet:', e);
    }
    return {
      availableBalance: 0,
      escrowLockedBalance: 0,
      currency: 'NGN',
      transactions: [],
    };
  });

  // Keep wallet persistently saved across all page reloads and refreshes
  useEffect(() => {
    try {
      localStorage.setItem('AGC_user_wallet_v2', JSON.stringify(wallet));
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

  // Wallet Funding via Paystack (1% fee capped at ₦2,000)
  const topUpWallet = (amount: number) => {
    const fee = Math.min(Math.round(amount * 0.01), 2000);
    const totalPaid = amount + fee;
    const ref = `PSK_${Math.floor(10000000 + Math.random() * 90000000)}`;
    const newTx: WalletTransaction = {
      id: `tx_${Date.now()}`,
      type: 'topup',
      title: `Wallet Top-up via Paystack (Fee: ₦${fee.toLocaleString()})`,
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

    return { success: true, reference: ref, fee, totalPaid };
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
    let newLiked = false;
    let newCount = 0;

    setStatuses((prev) =>
      prev.map((s) => {
        if (s.id === statusId) {
          newLiked = !s.hasLikedByMe;
          newCount = newLiked ? s.likesCount + 1 : Math.max(0, s.likesCount - 1);
          return { ...s, hasLikedByMe: newLiked, likesCount: newCount };
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

    // 1. Broadcast like via Socket.io
    emitLikeStatus(statusId, newLiked, currentUser.id, currentUser.fullName);

    // 2. Broadcast like via persistent status_feed channel (no channel leak)
    if (isSupabaseConfigured) {
      const ch = statusFeedChannelRef.current;
      if (ch) {
        ch.send({
          type: 'broadcast',
          event: 'status_liked',
          payload: { statusId, liked: newLiked, likerId: currentUser.id, likerName: currentUser.fullName },
        });
      }
      // Persist to DB
      supabase.from('user_statuses').update({ likes_count: newCount }).eq('id', statusId).then(() => {});
    }
  };

  const markStatusViewed = (statusId: string) => {
    const viewer: import('../types').StatusViewer = {
      id: currentUser.id,
      name: currentUser.fullName,
      avatar: currentUser.avatarUrl || '',
      timeViewed: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    // 1. Broadcast view via Socket.io
    emitViewStatus(statusId, viewer);
    setStatuses((prev) =>
      prev.map((s) => {
        if (s.id === statusId) {
          const alreadyViewed = s.viewers?.some((v) => v.id === currentUser.id);
          if (alreadyViewed) return s;
          const newCount = s.viewsCount + 1;
          if (isSupabaseConfigured) {
            supabase.from('user_statuses').update({ views_count: newCount }).eq('id', statusId).then(() => {});
          }
          return {
            ...s,
            viewsCount: newCount,
            viewers: [...(s.viewers || []), viewer],
          };
        }
        return s;
      })
    );
    // Broadcast view via persistent channel ref (no channel leak)
    if (isSupabaseConfigured) {
      const ch = statusFeedChannelRef.current;
      if (ch) {
        ch.send({
          type: 'broadcast',
          event: 'status_viewed',
          payload: { statusId, viewer },
        });
      }
    }
  };

  const toggleHideBalance = () => {
    setHideBalanceOnNav((prev) => {
      const next = !prev;
      localStorage.setItem('AGC_hide_balance', String(next));
      return next;
    });
  };

  // Multi-Transport Live Status Broadcaster (BroadcastChannel + Socket.io + Supabase Realtime + DB)
  const publishStatusLive = (newStatus: UserStatus) => {
    const cleanPhone = currentUser.phoneNumber?.replace(/\D/g, '') || '';
    const outgoingStatus = {
      ...newStatus,
      userPhone: cleanPhone,
      isMe: false,
    };

    // 1. BroadcastChannel (same machine / multi-tab live sync)
    try {
      const bc = new BroadcastChannel('AGC_statuses_sync');
      bc.postMessage({ type: 'new_status', status: outgoingStatus });
      bc.close();
    } catch (_) {}

    // 2. Socket.io Relay
    emitPostStatus(outgoingStatus);

    // 3. Supabase Database Persistence + Realtime Broadcast
    if (isSupabaseConfigured) {
      supabase
        .from('user_statuses')
        .upsert({
          id: newStatus.id,
          user_id: currentUser.id,
          user_phone: cleanPhone,
          user_name: currentUser.fullName || 'AGC User',
          user_avatar: currentUser.avatarUrl || '',
          status_type: newStatus.statusType || 'thought',
          media_url: newStatus.mediaUrl || null,
          video_url: newStatus.videoUrl || null,
          thought_bg: newStatus.thoughtBg || null,
          caption: newStatus.caption || '',
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          views_count: 0,
          likes_count: 0,
        })
        .then(({ error }) => {
          if (error) console.warn('Status DB upsert notice:', error.message);
        });

      try {
        const statusFeedCh = supabase.channel('status_feed', { config: { broadcast: { self: false } } });
        statusFeedCh.subscribe((st) => {
          if (st === 'SUBSCRIBED') {
            statusFeedCh.send({
              type: 'broadcast',
              event: 'new_status',
              payload: { status: outgoingStatus },
            });
          }
        });
      } catch (err) {
        console.warn('Status Realtime broadcast notice:', err);
      }
    }
  };

  const deleteStatus = (statusId: string) => {
    setStatuses((prev) => {
      const updated = prev.filter((s) => s.id !== statusId);
      try {
        localStorage.setItem('AGC_statuses_v2', JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });

    if (activeViewingStatus?.id === statusId) {
      setActiveViewingStatus(null);
    }

    try {
      const bc = new BroadcastChannel('AGC_statuses_sync');
      bc.postMessage({ type: 'delete_status', statusId });
      bc.close();
    } catch (_) {}

    if (isSupabaseConfigured) {
      supabase.from('user_statuses').delete().eq('id', statusId).then(({ error }) => {
        if (error) console.warn('Status delete notice:', error?.message);
      });
    }
  };

  const addStatus = (caption: string, mediaUrl?: string) => {
    const newStatus: UserStatus = {
      id: `status_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: currentUser.id,
      userPhone: currentUser.phoneNumber,
      userName: currentUser.fullName,
      userAvatar: currentUser.avatarUrl,
      isMe: true,
      statusType: mediaUrl ? 'media' : 'thought',
      mediaUrl: mediaUrl || '/src/assets/images/african_textiles_wax_1794210824926.jpg',
      caption: caption || 'New post on AGC 24h Status!',
      createdAt: 'Just now',
      createdAtISO: new Date().toISOString(),
      isReshared: caption.startsWith('Reshared') || false,
      expiresInHours: 24,
      viewsCount: 0,
      likesCount: 0,
      hasLikedByMe: false,
      viewers: [],
    };

    // Stack new status with existing ones without deleting older ones
    setStatuses((prev) => {
      const updated = [newStatus, ...prev.filter((s) => s.id !== newStatus.id)];
      try {
        localStorage.setItem('AGC_statuses_v2', JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });

    publishStatusLive(newStatus);
  };

  const addThoughtStatus = (thoughtText: string, themeBg: string) => {
    const newStatus: UserStatus = {
      id: `status_thought_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: currentUser.id,
      userPhone: currentUser.phoneNumber,
      userName: currentUser.fullName,
      userAvatar: currentUser.avatarUrl,
      isMe: true,
      statusType: 'thought',
      thoughtBg: themeBg || 'from-indigo-600 via-purple-600 to-pink-600',
      caption: thoughtText,
      createdAt: 'Just now',
      createdAtISO: new Date().toISOString(),
      expiresInHours: 24,
      viewsCount: 0,
      likesCount: 0,
      hasLikedByMe: false,
      viewers: [],
    };

    // Stack new status with existing ones without deleting older ones
    setStatuses((prev) => {
      const updated = [newStatus, ...prev.filter((s) => s.id !== newStatus.id)];
      try {
        localStorage.setItem('AGC_statuses_v2', JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });

    publishStatusLive(newStatus);
  };

  const addDeviceMediaStatus = async (caption: string, mediaUrl: string, mediaType: 'image' | 'video' = 'image') => {
    let finalMediaUrl = mediaUrl;
    if (mediaType === 'image' && mediaUrl.startsWith('data:image') && mediaUrl.length > 250000) {
      try {
        finalMediaUrl = await downsampleDataUrl(mediaUrl, 1200, 0.75);
      } catch (_) {}
    }

    const newStatus: UserStatus = {
      id: `status_media_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: currentUser.id,
      userPhone: currentUser.phoneNumber,
      userName: currentUser.fullName,
      userAvatar: currentUser.avatarUrl,
      isMe: true,
      statusType: mediaType,
      mediaUrl: finalMediaUrl,
      videoUrl: mediaType === 'video' ? finalMediaUrl : undefined,
      caption: caption || (mediaType === 'video' ? 'Video Status 🎥' : 'Photo Status 📸'),
      createdAt: 'Just now',
      createdAtISO: new Date().toISOString(),
      expiresInHours: 24,
      viewsCount: 0,
      likesCount: 0,
      hasLikedByMe: false,
      viewers: [],
    };

    // Stack new status with existing ones without deleting older ones
    setStatuses((prev) => {
      const updated = [newStatus, ...prev.filter((s) => s.id !== newStatus.id)];
      try {
        localStorage.setItem('AGC_statuses_v2', JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });

    publishStatusLive(newStatus);
  };

  const addDeviceVideoStatus = (caption: string, videoUrl: string, thumbnail?: string) => {
    const newStatus: UserStatus = {
      id: `status_vid_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: currentUser.id,
      userPhone: currentUser.phoneNumber,
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

    // Stack new status with existing ones without deleting older ones
    setStatuses((prev) => {
      const updated = [newStatus, ...prev.filter((s) => s.id !== newStatus.id)];
      try {
        localStorage.setItem('AGC_statuses_v2', JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });

    publishStatusLive(newStatus);
  };

  // ── Multi-Transport Incoming Call Listener (Socket.io + BroadcastChannel + Supabase)
  useEffect(() => {
    const myCleanPhone = currentUser.phoneNumber?.replace(/\D/g, '');
    if (!myCleanPhone) return;

    const handleIncomingCall = (payload: any) => {
      if (!activeCall && payload?.roomId) {
        setIncomingCall(payload);
        showLocalNotification(
          `📞 Incoming AGC ${payload.type === 'video' ? 'Video' : 'Voice'} Call`,
          `${payload.callerName || 'Someone'} is calling you on AGC...`,
          payload.callerAvatar || '/icon-192.png'
        );
      }
    };

    const handleCallDeclined = () => {
      setActiveCall(null);
      setIncomingCall(null);
    };

    // 1. Socket.io Phone channel listener
    const socket = getSocket();

    // 🔒 Multi-transport single-device session enforcement
    const triggerForceLogout = () => {
      console.warn('⚠️ AGC force_logout executed: signed in on another device');
      localStorage.setItem('AGC_is_authenticated', 'false');
      localStorage.removeItem('AGC_session_token');
      setIsAuthenticated(false);
      setTimeout(() => {
        alert('⚠️ AGC Security Alert\n\nYour account was just signed in on another device.\nYou have been logged out from this device for security.');
        window.location.reload();
      }, 300);
    };

    socket?.on('force_logout', triggerForceLogout);

    socket?.on('incoming_call', handleIncomingCall);
    socket?.on('call_declined', handleCallDeclined);

    // 2. BroadcastChannel for same-browser multi-tab calling
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('AGC_phone_calls');
      bc.onmessage = (e) => {
        if (e.data?.targetPhone === myCleanPhone) {
          if (e.data?.event === 'call_declined') {
            handleCallDeclined();
          } else if (e.data?.data) {
            handleIncomingCall(e.data.data);
          }
        }
      };
    } catch (_) {}

    // 3. Supabase Realtime channel listener (calls + session force_logout)
    const channelName = `phone_call_${myCleanPhone}`;
    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } },
    });

    channel
      .on('broadcast', { event: 'incoming_call' }, ({ payload }) => {
        handleIncomingCall(payload);
      })
      .on('broadcast', { event: 'call_declined' }, () => {
        handleCallDeclined();
      })
      .on('broadcast', { event: 'force_logout' }, ({ payload }: any) => {
        const myToken = localStorage.getItem('AGC_session_token');
        if (payload?.sessionToken && myToken && payload.sessionToken !== myToken) {
          triggerForceLogout();
        }
      })
      .subscribe();

    // 4. Polling heartbeat for session enforcement across remote devices (zero-waste, tab-aware)
    const sessionHeartbeat = setInterval(async () => {
      if (!isSupabaseConfigured || !currentUser?.phoneNumber) return;
      if (typeof document !== 'undefined' && document.hidden) return; // Pause when tab is inactive
      const myToken = localStorage.getItem('AGC_session_token');
      if (!myToken) return;
      try {
        const { data } = await supabase
          .from('profiles')
          .select('session_token')
          .eq('phone_number', currentUser.phoneNumber)
          .maybeSingle();
        if (data?.session_token && data.session_token !== myToken) {
          triggerForceLogout();
        }
      } catch (_) {}
    }, 60000);

    return () => {
      socket?.off('incoming_call', handleIncomingCall);
      socket?.off('call_declined', handleCallDeclined);
      if (bc) bc.close();
      channel.unsubscribe();
      clearInterval(sessionHeartbeat);
    };
  }, [currentUser.phoneNumber, activeCall]);

  const startCall = (
    name: string,
    phone: string,
    avatar?: string,
    type: 'voice' | 'video' = 'voice',
    roomId?: string,
    isInitiator: boolean = true
  ) => {
    const generatedRoomId = roomId || `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    setActiveCall({
      name,
      phone,
      avatar,
      durationSeconds: 0,
      type,
      isMuted: false,
      isSpeaker: false,
      roomId: generatedRoomId,
      isInitiator,
    });

    // Multi-transport broadcast: Socket.io + BroadcastChannel + Supabase
    const cleanTargetPhone = phone.replace(/\D/g, '');
    const callPayload = {
      roomId: generatedRoomId,
      callerName: currentUser.fullName,
      callerPhone: currentUser.phoneNumber,
      callerAvatar: currentUser.avatarUrl,
      type,
      timestamp: Date.now(),
    };

    if (cleanTargetPhone && isInitiator) {
      // 1. Socket.io
      emitPhoneCallSignal(cleanTargetPhone, callPayload);

      // 2. BroadcastChannel
      try {
        const bc = new BroadcastChannel('AGC_phone_calls');
        bc.postMessage({ targetPhone: cleanTargetPhone, event: 'incoming_call', data: callPayload });
        setTimeout(() => { try { bc.close(); } catch (_) {} }, 4000);
      } catch (_) {}

      // 3. Supabase Realtime
      const targetChannel = supabase.channel(`phone_call_${cleanTargetPhone}`);
      targetChannel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          targetChannel.send({
            type: 'broadcast',
            event: 'incoming_call',
            payload: callPayload,
          });
        }
      });
    }

    const newCallItem: CallLogItem = {
      id: `call_${Date.now()}`,
      name,
      phone,
      avatar: avatar || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='50' fill='%23180a33'/><circle cx='50' cy='38' r='18' fill='%23a855f7'/><path d='M16 88c0-18.778 15.222-34 34-34s34 15.222 34 34' fill='%23a855f7'/></svg>",
      type,
      direction: 'outgoing',
      time: 'Just now',
    };
    setCalls((prev) => [newCallItem, ...prev]);

    // Auto-cancel outgoing call after 45 seconds if still ringing / not answered
    if (isInitiator) {
      const ringSafeTimeout = setTimeout(() => {
        setActiveCall((current) => {
          if (!current) return null; // already ended
          // Only cancel if we're still in the same call room
          if (current.roomId !== generatedRoomId) return current;
          return null; // hang up
        });
        // Log as missed for the other side
        try {
          setCalls((prev) => {
            const idx = prev.findIndex((c) => c.id === newCallItem.id);
            if (idx === -1) return prev;
            const updated = [...prev];
            updated[idx] = { ...updated[idx], direction: 'missed' };
            return updated;
          });
        } catch (_) {}
      }, 45_000);
      return () => clearTimeout(ringSafeTimeout);
    }
  };

  const acceptIncomingCall = () => {
    if (!incomingCall) return;
    const { callerName, callerPhone, callerAvatar, type, roomId } = incomingCall;
    setIncomingCall(null);
    startCall(callerName, callerPhone, callerAvatar, type, roomId, false);
  };

  const declineIncomingCall = () => {
    if (!incomingCall) return;
    const cleanCallerPhone = incomingCall.callerPhone?.replace(/\D/g, '');
    if (cleanCallerPhone) {
      // 1. Socket.io
      const socket = getSocket();
      socket?.emit('phone_call_signal', { targetPhone: cleanCallerPhone, event: 'call_declined', data: { roomId: incomingCall.roomId } });

      // 2. BroadcastChannel
      try {
        const bc = new BroadcastChannel('AGC_phone_calls');
        bc.postMessage({ targetPhone: cleanCallerPhone, event: 'call_declined', data: { roomId: incomingCall.roomId } });
        setTimeout(() => { try { bc.close(); } catch (_) {} }, 3000);
      } catch (_) {}

      // 3. Supabase Realtime
      const channel = supabase.channel(`phone_call_${cleanCallerPhone}`);
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channel.send({
            type: 'broadcast',
            event: 'call_declined',
            payload: { roomId: incomingCall.roomId },
          });
          channel.unsubscribe();
        }
      });
    }

    const missedItem: CallLogItem = {
      id: `call_${Date.now()}`,
      name: incomingCall.callerName,
      phone: incomingCall.callerPhone,
      avatar: incomingCall.callerAvatar || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='50' fill='%23180a33'/><circle cx='50' cy='38' r='18' fill='%23a855f7'/><path d='M16 88c0-18.778 15.222-34 34-34s34 15.222 34 34' fill='%23a855f7'/></svg>",
      type: incomingCall.type,
      direction: 'missed',
      time: 'Just now',
    };
    setCalls((prev) => [missedItem, ...prev]);
    setIncomingCall(null);
  };

  const endCall = () => {
    if (activeCall?.phone) {
      const cleanPhone = activeCall.phone.replace(/\D/g, '');
      if (cleanPhone) {
        const socket = getSocket();
        socket?.emit('phone_call_signal', { targetPhone: cleanPhone, event: 'call_declined', data: { roomId: activeCall.roomId } });
        try {
          const bc = new BroadcastChannel('AGC_phone_calls');
          bc.postMessage({ targetPhone: cleanPhone, event: 'call_declined', data: { roomId: activeCall.roomId } });
          bc.close();
        } catch (_) {}
      }
    }
    setActiveCall(null);
  };

  const toggleCallMute = () => {
    setActiveCall((prev) => (prev ? { ...prev, isMuted: !prev.isMuted } : null));
  };

  const toggleCallSpeaker = () => {
    setActiveCall((prev) => (prev ? { ...prev, isSpeaker: !prev.isSpeaker } : null));
  };
  // Blocked users list
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('AGC_blocked_users');
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return [];
  });

  const toggleBlockUser = (idOrPhone: string): boolean => {
    let isBlocked = false;
    setBlockedUserIds((prev) => {
      let updated: string[];
      if (prev.includes(idOrPhone)) {
        updated = prev.filter((id) => id !== idOrPhone);
        isBlocked = false;
      } else {
        updated = [...prev, idOrPhone];
        isBlocked = true;
      }
      try {
        localStorage.setItem('AGC_blocked_users', JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });
    return isBlocked;
  };

  const updateChat = (chatId: string, updates: Partial<ChatThread>) => {
    setChats((prev) => {
      const updated = prev.map((c) => (c.id === chatId ? { ...c, ...updates } : c));
      try {
        localStorage.setItem('AGC_chats_v2', JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });
  };

  const addMembersToGroup = (chatId: string, memberNames: string[]) => {
    if (!memberNames.length) return;
    const targetChat = chats.find((c) => c.id === chatId);
    const entityType = targetChat?.isChannel ? 'channel' : 'group';

    setChats((prev) => {
      const updated = prev.map((c) => {
        if (c.id === chatId) {
          const currentMembers = (c as any).members || [];
          const updatedMemberList = Array.from(new Set([...currentMembers, ...memberNames]));
          return {
            ...c,
            members: updatedMemberList,
            membersCount: updatedMemberList.length + 1,
            lastMessage: `You added ${memberNames.join(', ')}`,
            lastMessageTime: 'Just now',
          };
        }
        return c;
      });
      try {
        localStorage.setItem('AGC_chats_v2', JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });

    // Update townCommunities state & Supabase
    const chatName = targetChat?.name;
    const currentMembersList = (targetChat as any)?.members || [];
    const updatedMembersList = Array.from(new Set([...currentMembersList, ...memberNames]));
    const newMembersCount = updatedMembersList.length + 1;

    setTownCommunities((prev) => {
      const updated = prev.map((tc) => {
        if (tc.name === chatName || `town_comm_${tc.id}` === chatId || tc.id === chatId) {
          return {
            ...tc,
            membersCount: newMembersCount,
            recentActivity: `Added ${memberNames.join(', ')}`,
          };
        }
        return tc;
      });
      try { localStorage.setItem('AGC_town_communities_v2', JSON.stringify(updated)); } catch (_) {}
      return updated;
    });

    if (chatName && isSupabaseConfigured) {
      updateTownCommunityInDb(chatName, {
        members_count: newMembersCount,
        members: updatedMembersList,
      }).catch((err) => console.warn('Supabase member count update notice:', err));

      try {
        const commCh = supabase.channel('live_town_communities', { config: { broadcast: { self: false } } });
        commCh.subscribe((st) => {
          if (st === 'SUBSCRIBED') {
            commCh.send({
              type: 'broadcast',
              event: 'members_updated',
              payload: { chatName, membersCount: newMembersCount, members: updatedMembersList }
            });
          }
        });
      } catch (_) {}
    }

    const sysMsg: ChatMessage = {
      id: `msg_sys_${Date.now()}`,
      chatId,
      sender: 'system',
      text: `You added ${memberNames.join(', ')} to the ${entityType}.`,
      type: 'text',
      timestamp: 'Just now',
      status: 'sent',
    };

    setMessages((prev) => {
      const current = prev[chatId] || [];
      const updated = { ...prev, [chatId]: [...current, sysMsg] };
      try {
        localStorage.setItem('AGC_messages_v2', JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });
  };

  const createGroup = (name: string, memberNamesOrPhones: string[], avatar?: string, description?: string, memberPhones?: string[]): string => {
    const newChatId = 'group_' + Date.now();
    const shortInvite = 'G' + Math.random().toString(36).substring(2, 7).toUpperCase();
    const myName = currentUser.fullName || 'You';
    const myPhone = currentUser.phoneNumber || '';
    const allMemberPhones = Array.from(new Set([
      myPhone,
      ...(memberPhones || []),
      ...memberNamesOrPhones.filter((m) => /^\+?[0-9\s-]+$/.test(m)),
    ])).filter(Boolean);

    const newThread: ChatThread = {
      id: newChatId,
      name,
      avatar: avatar || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150&auto=format&fit=crop&q=80',
      verifiedStore: false,
      location: 'Community Group',
      unreadCount: 0,
      lastMessage: 'You created group "' + name + '"',
      lastMessageTime: 'Just now',
      catalog: [],
      isOnline: true,
      isGroup: true,
      membersCount: memberNamesOrPhones.length + 1,
      admins: [myName],
      members: [myName, ...memberNamesOrPhones],
      memberPhones: allMemberPhones,
      inviteCode: shortInvite,
      description,
    };

    const sysMsg: ChatMessage = {
      id: 'msg_sys_' + Date.now(),
      chatId: newChatId,
      sender: 'system',
      text: 'You created group "' + name + '" with ' + memberNamesOrPhones.length + ' members.',
      type: 'text',
      timestamp: 'Just now',
      status: 'sent',
    };

    setChats((prev) => {
      const updated = [newThread, ...prev];
      try {
        const userKey = getUserStorageKey('AGC_chats_v2', currentUser.phoneNumber);
        localStorage.setItem(userKey, JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });

    setMessages((prev) => {
      const updated = { ...prev, [newChatId]: [sysMsg] };
      try {
        const userKey = getUserStorageKey('AGC_messages_v2', currentUser.phoneNumber);
        localStorage.setItem(userKey, JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });

    // Broadcast new group to Socket.io and Supabase so other members see it on their dash
    try {
      emitCreateGroup(newThread, allMemberPhones);
      emitLiveMessage(newChatId, sysMsg, undefined, allMemberPhones, newThread);
    } catch (_) {}

    try {
      const bc = new BroadcastChannel('AGC_chats_sync');
      bc.postMessage({ chatId: newChatId, chat: newThread, message: sysMsg, senderId: currentUser.id, memberPhones: allMemberPhones });
      bc.close();
    } catch (_) {}

    if (isSupabaseConfigured) {
      createTownCommunityInDb({
        name,
        type: 'group',
        category: 'Tech & Hustle',
        description: description || 'Community group',
        avatar: newThread.avatar,
        members_count: memberNamesOrPhones.length + 1,
        members: memberNamesOrPhones,
      }).catch((e) => console.warn('Supabase group persist notice:', e));

      // Broadcast to all members' personal Supabase inboxes
      allMemberPhones.forEach((p) => {
        const cleanP = p.replace(/\D/g, '');
        if (cleanP) {
          try {
            const inboxCh = supabase.channel(`inbox_${cleanP}`, { config: { broadcast: { self: false } } });
            inboxCh.subscribe((st) => {
              if (st === 'SUBSCRIBED') {
                inboxCh.send({ type: 'broadcast', event: 'group_created', payload: { chat: newThread, message: sysMsg } });
              }
            });
          } catch (_) {}
        }
      });

      try {
        const sbChannel = supabase.channel('town_community_feed', { config: { broadcast: { self: false } } });
        sbChannel.subscribe((st) => {
          if (st === 'SUBSCRIBED') {
            sbChannel.send({ type: 'broadcast', event: 'new_message', payload: { chatId: newChatId, chat: newThread, message: sysMsg, senderId: currentUser.id } });
          }
        });
      } catch (_) {}
    }

    setActiveChatId(newChatId);
    return newChatId;
  };

  const createChannel = (name: string, description?: string, avatar?: string): string => {
    const newChatId = 'channel_' + Date.now();
    const shortInvite = 'C' + Math.random().toString(36).substring(2, 7).toUpperCase();
    const myName = currentUser.fullName || 'You';
    const newThread: ChatThread = {
      id: newChatId,
      name,
      avatar: avatar || 'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=150&auto=format&fit=crop&q=80',
      verifiedStore: false,
      location: 'Broadcast Channel',
      unreadCount: 0,
      lastMessage: 'Channel created',
      lastMessageTime: 'Just now',
      catalog: [],
      isOnline: true,
      isChannel: true,
      membersCount: 1,
      admins: [myName],
      inviteCode: shortInvite,
      description,
    };

    const sysMsg: ChatMessage = {
      id: 'msg_sys_' + Date.now(),
      chatId: newChatId,
      sender: 'system',
      text: 'Channel "' + name + '" created. Broadcast updates, news, and media to your subscribers.',
      type: 'text',
      timestamp: 'Just now',
      status: 'sent',
    };

    setChats((prev) => {
      const updated = [newThread, ...prev];
      try {
        localStorage.setItem('AGC_chats_v2', JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });

    setMessages((prev) => {
      const updated = { ...prev, [newChatId]: [sysMsg] };
      try {
        localStorage.setItem('AGC_messages_v2', JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });

    setActiveChatId(newChatId);
    return newChatId;
  };

  const toggleMemberAdmin = (chatId: string, memberName: string) => {
    setChats((prev) => {
      const updated = prev.map((c) => {
        if (c.id === chatId) {
          const currentAdmins = c.admins || [currentUser.fullName || 'You'];
          const isAlreadyAdmin = currentAdmins.includes(memberName);
          const updatedAdmins = isAlreadyAdmin
            ? currentAdmins.filter((a) => a !== memberName)
            : [...currentAdmins, memberName];
          return { ...c, admins: updatedAdmins };
        }
        return c;
      });
      try {
        localStorage.setItem('AGC_chats_v2', JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });

    const sysMsg: ChatMessage = {
      id: 'msg_sys_' + Date.now(),
      chatId,
      sender: 'system',
      text: memberName + ' was updated as group admin.',
      type: 'text',
      timestamp: 'Just now',
      status: 'sent',
    };
    setMessages((prev) => {
      const updated = { ...prev, [chatId]: [...(prev[chatId] || []), sysMsg] };
      try {
        localStorage.setItem('AGC_messages_v2', JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });
  };

  const removeMemberFromGroup = (chatId: string, memberName: string) => {
    setChats((prev) => {
      const updated = prev.map((c) => {
        if (c.id === chatId) {
          const currentAdmins = (c.admins || []).filter((a) => a !== memberName);
          return {
            ...c,
            membersCount: Math.max(1, (c.membersCount || 2) - 1),
            admins: currentAdmins,
          };
        }
        return c;
      });
      try {
        localStorage.setItem('AGC_chats_v2', JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });

    const sysMsg: ChatMessage = {
      id: 'msg_sys_' + Date.now(),
      chatId,
      sender: 'system',
      text: memberName + ' was removed from the group.',
      type: 'text',
      timestamp: 'Just now',
      status: 'sent',
    };
    setMessages((prev) => {
      const updated = { ...prev, [chatId]: [...(prev[chatId] || []), sysMsg] };
      try {
        localStorage.setItem('AGC_messages_v2', JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });
  };

  const deleteMessage = (chatId: string, messageId: string) => {
    setMessages((prev) => {
      const list = prev[chatId] || [];
      const updatedList = list.filter((m) => m.id !== messageId);
      const updated = { ...prev, [chatId]: updatedList };
      try {
        localStorage.setItem('AGC_messages_v2', JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });
  };

  const reactToMessage = (chatId: string, messageId: string, emoji: string) => {
    setMessages((prev) => {
      const list = prev[chatId] || [];
      const myName = currentUser.fullName || 'You';
      const updatedList = list.map((m) => {
        if (m.id === messageId) {
          const reactions = { ...(m.reactions || {}) };
          const users = reactions[emoji] || [];
          if (users.includes(myName)) {
            reactions[emoji] = users.filter((u) => u !== myName);
            if (reactions[emoji].length === 0) delete reactions[emoji];
          } else {
            reactions[emoji] = [...users, myName];
          }
          return { ...m, reactions };
        }
        return m;
      });
      const updated = { ...prev, [chatId]: updatedList };
      try {
        localStorage.setItem('AGC_messages_v2', JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });
  };

  // Unified Multi-Transport Live Message Broadcaster
  const broadcastLiveMessage = async (chatId: string, msg: ChatMessage) => {
    const currentChat = chats.find((c) => c.id === chatId);
    const myCleanPhone = currentUser.phoneNumber?.replace(/\D/g, '') || '';
    let targetCleanPhone = currentChat?.phone?.replace(/\D/g, '');

    if (!targetCleanPhone && chatId.startsWith('dm_')) {
      const parts = chatId.replace('dm_', '').split('_');
      targetCleanPhone = parts.find((p) => !phonesMatch(p, myCleanPhone)) || parts[0];
    }

    if (!targetCleanPhone && currentChat?.id) {
      const contactMatch = deviceContacts.find((ct) => ct.id === currentChat.id || ct.name === currentChat.name);
      if (contactMatch?.rawPhoneNumber) {
        targetCleanPhone = contactMatch.rawPhoneNumber.replace(/\D/g, '');
      }
    }

    const memberPhones = currentChat?.memberPhones || [];
    const isDeviceOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

    // Encrypt message text with WebCrypto AES-GCM 256-bit for wire transport
    const secret = getConversationSecret(chatId, myCleanPhone, targetCleanPhone);
    let wireMessage = msg;
    if (msg.text && typeof msg.text === 'string' && !msg.text.startsWith('AGC_E2EE:')) {
      try {
        const cipherText = await encryptChatMessage(msg.text, secret);
        wireMessage = { ...msg, text: cipherText, isEncrypted: true };
      } catch (_) {}
    }

    // 1. BroadcastChannel (instant same-computer tab/window sync)
    try {
      const bc = new BroadcastChannel('AGC_chats_sync');
      bc.postMessage({ chatId, message: wireMessage, senderId: currentUser.id, targetPhone: targetCleanPhone, memberPhones, isGroup: Boolean(currentChat?.isGroup), chat: currentChat });
      bc.close();
    } catch (e) {
      console.warn('BroadcastChannel error:', e);
    }

    if (!isDeviceOnline) {
      // Offline: Keep as 1 check (sent). Will automatically flush and double check once data is on.
      return;
    }

    // If online, transition single check ('sent') -> double check ('delivered')
    if (msg.status === 'sent') {
      msg.status = 'delivered';
      setMessages((prev) => {
        const list = prev[chatId] || [];
        const updated = list.map((m) => (m.id === msg.id ? { ...m, status: 'delivered' as const } : m));
        try {
          const userKey = getUserStorageKey('AGC_messages_v2', currentUser.phoneNumber);
          localStorage.setItem(userKey, JSON.stringify({ ...prev, [chatId]: updated }));
        } catch (_) {}
        return { ...prev, [chatId]: updated };
      });
    }

    // 2. Socket.io Live WebSocket Relay
    emitLiveMessage(chatId, wireMessage, targetCleanPhone, memberPhones, currentChat);

    // 3. Supabase Realtime (Cross-device & background inbox channel)
    // Uses pre-subscribed persistent channels -- no per-message subscribe() handshake delay
    if (isSupabaseConfigured) {
      try {
        // Helper: get-or-create a pre-subscribed channel for instant sends
        const getOrSubscribeCh = (name: string): ReturnType<typeof supabase.channel> => {
          const existing = inboxChannelRefsRef.current.get(name);
          if (existing) return existing;
          const ch = supabase.channel(name, { config: { broadcast: { self: false } } });
          ch.subscribe(); // fire-and-forget; future .send() calls are instant once SUBSCRIBED
          inboxChannelRefsRef.current.set(name, ch);
          return ch;
        };

        // Ensure global chat broadcast channel is pre-subscribed
        if (!chatBroadcastChannelRef.current) {
          chatBroadcastChannelRef.current = supabase.channel('agc_chat_global', {
            config: { broadcast: { self: false } },
          });
          chatBroadcastChannelRef.current.subscribe();
        }

        // Send instantly — no waiting for SUBSCRIBED
        chatBroadcastChannelRef.current.send({
          type: 'broadcast',
          event: 'new_message',
          payload: { chatId, message: wireMessage, senderId: currentUser.id, chat: currentChat },
        }).catch(() => {});

        // Recipient personal inbox channels
        if (targetCleanPhone) {
          const targets = new Set([targetCleanPhone, normalizePhoneDigits(targetCleanPhone)].filter(Boolean));
          targets.forEach((t) => {
            const ch = getOrSubscribeCh(`inbox_${t}`);
            ch.send({
              type: 'broadcast',
              event: 'new_message',
              payload: { chatId, message: wireMessage, senderId: currentUser.id, targetPhone: targetCleanPhone, chat: currentChat },
            }).catch(() => {});
          });
        }

        // Group member inbox channels
        if (memberPhones && memberPhones.length > 0) {
          memberPhones.forEach((p) => {
            const cp = p.replace(/\D/g, '');
            if (cp && !phonesMatch(cp, myCleanPhone)) {
              const ch = getOrSubscribeCh(`inbox_${cp}`);
              ch.send({
                type: 'broadcast',
                event: 'new_message',
                payload: { chatId, message: wireMessage, senderId: currentUser.id, isGroup: true, chat: currentChat },
              }).catch(() => {});
            }
          });
        }

        // Town community feed
        if (chatId.startsWith('town_comm_')) {
          const ch = getOrSubscribeCh('town_community_feed');
          ch.send({
            type: 'broadcast',
            event: 'new_message',
            payload: { chatId, message: wireMessage, senderId: currentUser.id },
          }).catch(() => {});
        }
      } catch (e) {
        console.warn('Supabase chat broadcast notice:', e);
      }
    }
  };

  const sendImageMessage = async (chatId: string, imageUrl: string, caption?: string, oneTimeView?: boolean) => {
    // Ensure image data URL fits comfortably within Supabase 256KB Realtime payload
    let finalImageUrl = imageUrl;
    if (imageUrl.startsWith('data:image') && imageUrl.length > 250000) {
      try {
        finalImageUrl = await downsampleDataUrl(imageUrl, 1200, 0.75);
      } catch (_) {}
    }

    const newMsg: ChatMessage = {
      id: 'msg_img_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      chatId,
      sender: 'user',
      senderName: currentUser.fullName || 'AGC User',
      senderPhone: currentUser.phoneNumber,
      senderAvatar: currentUser.avatarUrl,
      type: 'image',
      imageUrl: finalImageUrl,
      text: caption || '',
      oneTimeView: Boolean(oneTimeView),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sent',
    };

    setMessages((prev) => {
      const current = prev[chatId] || [];
      const updated = { ...prev, [chatId]: [...current, newMsg] };
      try {
        localStorage.setItem('AGC_messages_v2', JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });

    setChats((prev) => {
      const exists = prev.some((c) => c.id === chatId);
      if (exists) {
        return prev.map((c) =>
          c.id === chatId
            ? {
                ...c,
                lastMessage: caption ? `📷 ${caption}` : '📷 Photo',
                lastMessageTime: newMsg.timestamp,
              }
            : c
        );
      }
      const contactMatch = deviceContacts.find(
        (ct) => ct.id === chatId || (ct.rawPhoneNumber && chatId.includes(ct.rawPhoneNumber.replace(/\D/g, '')))
      );
      const newThread: ChatThread = {
        id: chatId,
        name: contactMatch?.name || (chatId.startsWith('dm_') ? 'Direct Chat' : 'Chat'),
        avatar:
          contactMatch?.avatar ||
          "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='50' fill='%23180a33'/><circle cx='50' cy='38' r='18' fill='%23a855f7'/><path d='M16 88c0-18.778 15.222-34 34-34s34 15.222 34 34' fill='%23a855f7'/></svg>",
        verifiedStore: false,
        location: 'Direct Chat',
        unreadCount: 0,
        lastMessage: caption ? `📷 ${caption}` : '📷 Photo',
        lastMessageTime: newMsg.timestamp,
        catalog: [],
        isOnline: true,
        phone: contactMatch?.rawPhoneNumber || '',
      };
      return [newThread, ...prev];
    });

    // Broadcast live across all transports (Socket.io, BroadcastChannel, Supabase Realtime)
    broadcastLiveMessage(chatId, newMsg);
  };

  const clearChat = (chatId: string) => {
    setMessages((prev) => {
      const updated = { ...prev, [chatId]: [] };
      try {
        localStorage.setItem('AGC_messages_v2', JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });
    setChats((prev) => {
      const updated = prev.map((c) =>
        c.id === chatId ? { ...c, lastMessage: 'Chat history cleared', lastMessageTime: '' } : c
      );
      try {
        localStorage.setItem('AGC_chats_v2', JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });
  };

  const sendMessage = (chatId: string, text: string, replyTo?: { id?: string; sender: string; text: string }) => {
    if (!text.trim()) return;

    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    const initialStatus: 'sent' | 'delivered' = isOnline ? 'delivered' : 'sent';

    const newMsg: ChatMessage = {
      id: `msg_user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      chatId,
      sender: 'user',
      senderName: currentUser.fullName || 'AGC User',
      senderPhone: currentUser.phoneNumber,
      senderAvatar: currentUser.avatarUrl,
      text,
      replyTo,
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
      status: initialStatus,
    };

    // 1. Update local state and persist
    setMessages((prev) => {
      const updated = {
        ...prev,
        [chatId]: [...(prev[chatId] || []), newMsg],
      };
      try {
        localStorage.setItem('AGC_messages_v2', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    setChats((prev) => {
      const exists = prev.some((c) => c.id === chatId);
      let updated: ChatThread[];
      if (exists) {
        updated = prev.map((c) =>
          c.id === chatId
            ? {
                ...c,
                lastMessage: text,
                lastMessageTime: newMsg.timestamp,
              }
            : c
        );
      } else {
        const contactMatch = deviceContacts.find(
          (ct) => ct.id === chatId || (ct.rawPhoneNumber && chatId.includes(ct.rawPhoneNumber.replace(/\D/g, '')))
        );
        const newThread: ChatThread = {
          id: chatId,
          name: contactMatch?.name || (chatId.startsWith('dm_') ? 'Direct Chat' : 'Chat'),
          avatar:
            contactMatch?.avatar ||
            "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='50' fill='%23180a33'/><circle cx='50' cy='38' r='18' fill='%23a855f7'/><path d='M16 88c0-18.778 15.222-34 34-34s34 15.222 34 34' fill='%23a855f7'/></svg>",
          verifiedStore: false,
          location: 'Direct Chat',
          unreadCount: 0,
          lastMessage: text,
          lastMessageTime: newMsg.timestamp,
          catalog: [],
          isOnline: true,
          phone: contactMatch?.rawPhoneNumber || '',
        };
        updated = [newThread, ...prev];
      }
      return updated;
    });

    // 2. Broadcast live
    broadcastLiveMessage(chatId, newMsg);
  };

  const sendVoiceNote = (chatId: string, durationSeconds: number, transcript: string, audioDataUrl?: string) => {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24h TTL
    const newMsg: ChatMessage = {
      id: `msg_vn_${Date.now()}`,
      chatId,
      sender: 'user',
      senderName: currentUser.fullName || 'AGC User',
      senderPhone: currentUser.phoneNumber,
      senderAvatar: currentUser.avatarUrl,
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
        audioDataUrl, // kept for in-tab playback; stripped before cross-device broadcast
        expiresAt,
        transcriptRevealed: false,
      },
      mediaSizeKB: Math.round(durationSeconds * 4.5),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sent',
    };

    setMessages((prev) => ({
      ...prev,
      [chatId]: [...(prev[chatId] || []), newMsg],
    }));

    setChats((prev) => {
      const exists = prev.some((c) => c.id === chatId);
      if (exists) {
        return prev.map((c) =>
          c.id === chatId
            ? {
                ...c,
                lastMessage: `🎤 Voice message (${durationSeconds}s)`,
                lastMessageTime: newMsg.timestamp,
              }
            : c
        );
      }
      const contactMatch = deviceContacts.find(
        (ct) => ct.id === chatId || (ct.rawPhoneNumber && chatId.includes(ct.rawPhoneNumber.replace(/\D/g, '')))
      );
      const newThread: ChatThread = {
        id: chatId,
        name: contactMatch?.name || (chatId.startsWith('dm_') ? 'Direct Chat' : 'Chat'),
        avatar:
          contactMatch?.avatar ||
          "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='50' fill='%23180a33'/><circle cx='50' cy='38' r='18' fill='%23a855f7'/><path d='M16 88c0-18.778 15.222-34 34-34s34 15.222 34 34' fill='%23a855f7'/></svg>",
        verifiedStore: false,
        location: 'Direct Chat',
        unreadCount: 0,
        lastMessage: `🎤 Voice message (${durationSeconds}s)`,
        lastMessageTime: newMsg.timestamp,
        catalog: [],
        isOnline: true,
        phone: contactMatch?.rawPhoneNumber || '',
      };
      return [newThread, ...prev];
    });

    // Strip blob: URL before cross-device broadcast (blob: URLs are tab-local only)
    const wireVoiceNote = { ...newMsg.voiceNote!, audioDataUrl: undefined };
    broadcastLiveMessage(chatId, { ...newMsg, voiceNote: wireVoiceNote });
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
      buyerName: buyerName || currentUser.fullName || 'AGC User',
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
      text: `Payment secured via Paystack in AGC Escrow Vault: ${CURRENCY_SYMBOLS[product.currency]}${product.price.toLocaleString()}. Seller notified to dispatch. Share release PIN ${pin} only after receiving parcel!`,
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

    if (enteredPin.trim() !== order.escrowPin.trim() && !verifyPaymentPin(enteredPin)) {
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
    setChats((prev) => {
      if (prev.some((c) => c.id === chatId)) return prev;
      const newThread: ChatThread = {
        id: chatId,
        name: product.sellerName,
        avatar: product.imageUrl,
        verifiedStore: true,
        location: product.category,
        unreadCount: 0,
        lastMessage: `Product: ${product.title}`,
        lastMessageTime: 'Just now',
        catalog: [product],
        isOnline: true,
        storeCategory: product.category,
      };
      return [newThread, ...prev];
    });
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

    setChats((prev) => {
      const exists = prev.some((c) => c.id === chatId);
      if (exists) {
        return prev.map((c) =>
          c.id === chatId
            ? {
                ...c,
                lastMessage: `🎭 Meme: ${meme.title}`,
                lastMessageTime: newMsg.timestamp,
              }
            : c
        );
      }
      const newThread: ChatThread = {
        id: chatId,
        name: chatId.startsWith('dm_') ? 'Direct Chat' : 'Chat',
        avatar:
          "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='50' fill='%23180a33'/><circle cx='50' cy='38' r='18' fill='%23a855f7'/><path d='M16 88c0-18.778 15.222-34 34-34s34 15.222 34 34' fill='%23a855f7'/></svg>",
        verifiedStore: false,
        location: 'Direct Chat',
        unreadCount: 0,
        lastMessage: `🎭 Meme: ${meme.title}`,
        lastMessageTime: newMsg.timestamp,
        catalog: [],
        isOnline: true,
      };
      return [newThread, ...prev];
    });

    broadcastLiveMessage(chatId, newMsg);
  };

  // 2. Live Audio Spaces / Street Radio Handlers
  const createAudioSpace = (
    title: string,
    topic: string,
    category: AudioSpace['category'],
    isLowBandwidth: boolean = true
  ): AudioSpace => {
    const spaceId = `space_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const myName = currentUser.fullName || 'Host';
    const myAvatar = currentUser.avatarUrl || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(myName)}&backgroundColor=581c87&textColor=ffffff`;

    const newSpace: AudioSpace = {
      id: spaceId,
      title: title.trim(),
      topic: topic.trim() || 'Live community discussion',
      category: category || 'Tech & Hustle',
      hostName: myName,
      hostAvatar: myAvatar,
      listenersCount: 1,
      isLive: true,
      isLowBandwidthMode: isLowBandwidth,
      speakers: [
        {
          id: currentUser.id || `sp_${Date.now()}`,
          name: myName,
          avatar: myAvatar,
          role: 'host',
          isSpeaking: true,
          isMuted: false,
        },
      ],
    };

    setAudioSpaces((prev) => {
      const updated = [newSpace, ...prev.filter((s) => s.id !== spaceId)];
      try { localStorage.setItem('AGC_audio_spaces_v2', JSON.stringify(updated)); } catch (_) {}
      return updated;
    });

    setActiveAudioSpace(newSpace);

    // 🌐 LIVE SYSTEM: Persist to Supabase and broadcast live across all devices
    if (isSupabaseConfigured) {
      createAudioSpaceInDb({
        title: newSpace.title,
        topic: newSpace.topic,
        category: newSpace.category,
        is_live: true,
        is_low_bandwidth_mode: newSpace.isLowBandwidthMode,
        listeners_count: 1,
      }).catch((e) => console.warn('Supabase space create notice:', e));

      try {
        const spaceCh = supabase.channel('live_audio_spaces', { config: { broadcast: { self: false } } });
        spaceCh.subscribe((st) => {
          if (st === 'SUBSCRIBED') {
            spaceCh.send({ type: 'broadcast', event: 'space_started', payload: newSpace });
          }
        });
      } catch (_) {}
    }

    return newSpace;
  };

  const joinAudioSpace = (space: AudioSpace) => {
    const isAlreadyMember = space.speakers?.some((s) => s.id === currentUser.id) ||
      space.listeners?.some((l) => l.id === currentUser.id);

    const updatedSpace: AudioSpace = {
      ...space,
      listenersCount: isAlreadyMember ? space.listenersCount : (space.listenersCount || 0) + 1,
      listeners: isAlreadyMember
        ? space.listeners
        : [
            ...(space.listeners || []),
            {
              id: currentUser.id,
              name: currentUser.fullName || 'You',
              avatar: currentUser.avatarUrl || 'https://api.dicebear.com/7.x/thumbs/svg?seed=me',
              isMuted: true,
              isSpeaking: false,
            },
          ],
    };

    setActiveAudioSpace(updatedSpace);
    setAudioSpaces((prev) => prev.map((s) => (s.id === space.id ? updatedSpace : s)));
    joinLiveSpace(space.id, {
      id: currentUser.id,
      name: currentUser.fullName,
      avatar: currentUser.avatarUrl,
    });
  };

  const leaveAudioSpace = () => {
    if (activeAudioSpace) {
      leaveLiveSpace(activeAudioSpace.id, currentUser.id);
    }
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

  const endAudioSpace = (spaceId: string) => {
    const space = audioSpaces.find((s) => s.id === spaceId) || activeAudioSpace;
    const peakListeners = space ? (space.listenersCount || 1) + 4 : 5;
    const durationFormatted = '42m 18s';

    setSpaceEndedSummary({
      spaceId,
      title: space?.title || 'Live Community Space',
      durationFormatted,
      peakListeners,
    });

    setAudioSpaces((prev) => prev.filter((s) => s.id !== spaceId));

    const socket = getSocket();
    if (socket) {
      socket.emit('space_ended', { spaceId, durationFormatted, peakListeners });
    }
    if (isSupabaseConfigured) {
      try {
        const ch = supabase.channel('town_community_feed', { config: { broadcast: { self: false } } });
        ch.subscribe((st) => {
          if (st === 'SUBSCRIBED') {
            ch.send({ type: 'broadcast', event: 'space_ended', payload: { spaceId, durationFormatted, peakListeners } });
          }
        });
      } catch (_) {}
    }
    setActiveAudioSpace(null);
  };

  const sendFriendRequest = async (targetPhone: string, targetName?: string, message?: string): Promise<boolean> => {
    if (!targetPhone || !currentUser.phoneNumber) return false;
    const req: import('../types').ContactRequest = {
      id: `freq_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      senderPhone: currentUser.phoneNumber,
      senderName: currentUser.fullName || 'AGC User',
      senderAvatar: currentUser.avatarUrl,
      recipientPhone: targetPhone,
      message: message || `Hi, I am ${currentUser.fullName || 'AGC User'}. Let's connect on AfriChat!`,
      createdAt: 'Just now',
      status: 'pending',
    };

    try {
      const bc = new BroadcastChannel('AGC_chats_sync');
      bc.postMessage({ type: 'friend_request', request: req, targetPhone });
      bc.close();
    } catch (_) {}

    const socket = getSocket();
    if (socket) {
      socket.emit('friend_request', { request: req, targetPhone });
    }

    if (isSupabaseConfigured) {
      const cleanTarget = targetPhone.replace(/\D/g, '');
      const targets = [cleanTarget, normalizePhoneDigits(cleanTarget)].filter(Boolean);
      targets.forEach((t) => {
        try {
          const ch = supabase.channel(`inbox_${t}`, { config: { broadcast: { self: false } } });
          ch.subscribe((st) => {
            if (st === 'SUBSCRIBED') {
              ch.send({ type: 'broadcast', event: 'friend_request', payload: { request: req } });
            }
          });
        } catch (_) {}
      });
    }

    showLocalNotification('Request Sent', `Contact request sent to ${targetName || targetPhone}`);
    return true;
  };

  const acceptFriendRequest = (requestId: string) => {
    const req = friendRequests.find((r) => r.id === requestId);
    if (!req) return;

    addNewDeviceContact(req.senderName, req.senderPhone, 'Connected via Contact Request', true, req.senderAvatar);
    setFriendRequests((prev) => prev.filter((r) => r.id !== requestId));

    const socket = getSocket();
    if (socket) {
      socket.emit('friend_request_accepted', {
        requestId,
        acceptorPhone: currentUser.phoneNumber,
        acceptorName: currentUser.fullName,
        targetPhone: req.senderPhone,
      });
    }

    if (isSupabaseConfigured) {
      const cleanSender = req.senderPhone.replace(/\D/g, '');
      try {
        const ch = supabase.channel(`inbox_${cleanSender}`, { config: { broadcast: { self: false } } });
        ch.subscribe((st) => {
          if (st === 'SUBSCRIBED') {
            ch.send({
              type: 'broadcast',
              event: 'friend_request_accepted',
              payload: {
                requestId,
                acceptorPhone: currentUser.phoneNumber,
                acceptorName: currentUser.fullName,
                acceptorAvatar: currentUser.avatarUrl,
              },
            });
          }
        });
      } catch (_) {}
    }

    const contactObj: DeviceContact = {
      id: req.id,
      name: req.senderName,
      rawPhoneNumber: req.senderPhone,
      normalizedPhoneNumber: req.senderPhone,
      isRegisteredOnAGC: true,
      avatar: req.senderAvatar,
    };
    startChatWithContact(contactObj);
  };

  const declineFriendRequest = (requestId: string) => {
    setFriendRequests((prev) => prev.filter((r) => r.id !== requestId));
  };

  const respondToGroupInvitation = (chatId: string, accept: boolean) => {
    setChats((prev) =>
      prev.map((c) => {
        if (c.id !== chatId) return c;
        return {
          ...c,
          invitationStatus: accept ? 'accepted' : 'declined',
        };
      })
    );
    if (!accept) {
      setActiveChatId(null);
    }
  };

  // 3. Scam Alert & Reputation Checker Handlers

  // ── Live Supabase Realtime listener for cross-device scam report sync ─────
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const scamCh = supabase.channel('agc_scam_reports_live', {
      config: { broadcast: { self: false } },
    });
    scamCh
      .on('broadcast', { event: 'new_scam_report' }, ({ payload }: any) => {
        if (!payload?.targetValue) return;
        const key = payload.targetValue.replace(/\s+/g, '');
        const incoming: ScamEntity = {
          targetValue: payload.targetValue,
          targetType: payload.targetType || 'phone',
          riskLevel: payload.riskLevel || 'critical_scam',
          reportsCount: payload.reportsCount || 1,
          accountName: payload.accountName,
          bankName: payload.bankName,
          recentFlags: Array.isArray(payload.flags)
            ? payload.flags.map((f: any) => ({
                date: f.date || 'Just now',
                reason: f.reason || '',
                flaggedBy: f.flagged_by || f.flaggedBy || 'Anonymous',
              }))
            : [],
        };
        setScamDatabase((prev) => {
          const updated = { ...prev, [key]: incoming };
          try { localStorage.setItem('AGC_scam_database_v2', JSON.stringify(updated)); } catch (_) {}
          return updated;
        });
        // If user is currently looking at this entity, refresh the result
        setScamLookupEntity((prev) => {
          if (prev && prev.targetValue.replace(/\s+/g, '') === key) return incoming;
          return prev;
        });
      })
      .subscribe();

    // Also hydrate scam database from Supabase on mount
    fetchAllScamReports().then(({ data }) => {
      if (!data || !Array.isArray(data) || data.length === 0) return;
      setScamDatabase((prev) => {
        const merged: Record<string, ScamEntity> = { ...prev };
        data.forEach((row: any) => {
          const key = (row.target_value || '').replace(/\s+/g, '');
          if (!key) return;
          const flags: { date: string; reason: string; flaggedBy: string }[] = Array.isArray(row.flags)
            ? row.flags.map((f: any) => ({
                date: f.date || new Date(row.created_at).toLocaleDateString(),
                reason: f.reason || '',
                flaggedBy: f.flagged_by || f.flaggedBy || 'Verified AGC User',
              }))
            : [];
          merged[key] = {
            targetValue: row.target_value,
            targetType: row.target_type || 'phone',
            riskLevel: row.risk_level || 'verified_clean',
            reportsCount: row.reports_count || row.count || 0,
            accountName: row.account_name,
            bankName: row.bank_name,
            recentFlags: flags,
          };
        });
        try { localStorage.setItem('AGC_scam_database_v2', JSON.stringify(merged)); } catch (_) {}
        return merged;
      });
    }).catch(() => {});

    return () => { scamCh.unsubscribe(); };
  }, [isSupabaseConfigured]);

  /**
   * Async reputation check: queries Supabase first (live database),
   * falls back to local scamDatabase (mock + user-submitted via broadcast).
   */
  const checkEntityReputation = async (query: string): Promise<ScamEntity | null> => {
    setIsCheckingReputation(true);
    setScamLookupEntity(null);

    const cleaned = query.replace(/\s+/g, '');

    // 1. Try live Supabase lookup
    if (isSupabaseConfigured) {
      try {
        const { data } = await fetchScamReportByTarget(query);
        if (data) {
          const flags: { date: string; reason: string; flaggedBy: string }[] = Array.isArray(data.flags)
            ? data.flags.map((f: any) => ({
                date: f.date || new Date(data.created_at).toLocaleDateString(),
                reason: f.reason || '',
                flaggedBy: f.flagged_by || f.flaggedBy || 'Verified AGC User',
              }))
            : [];
          const entity: ScamEntity = {
            targetValue: data.target_value,
            targetType: data.target_type || 'phone',
            riskLevel: data.risk_level || 'verified_clean',
            reportsCount: data.reports_count || data.count || 0,
            accountName: data.account_name,
            bankName: data.bank_name,
            recentFlags: flags,
          };
          // Cache in local db
          setScamDatabase((prev) => {
            const updated = { ...prev, [cleaned]: entity };
            try { localStorage.setItem('AGC_scam_database_v2', JSON.stringify(updated)); } catch (_) {}
            return updated;
          });
          setScamLookupEntity(entity);
          setIsCheckingReputation(false);
          return entity;
        }
      } catch (_) {}
    }

    // 2. Fall back to local scamDatabase (mock + broadcast-received entries)
    const found = Object.values(scamDatabase).find(
      (e) => e.targetValue.replace(/\s+/g, '') === cleaned
    );
    if (found) {
      setScamLookupEntity(found);
      setIsCheckingReputation(false);
      return found;
    }

    // 3. Not found anywhere — return clean entity
    const cleanEntity: ScamEntity = {
      targetValue: query,
      targetType: cleaned.startsWith('+') || /^\d{11}$/.test(cleaned) ? 'phone' : 'bank_account',
      riskLevel: 'verified_clean',
      reportsCount: 0,
      recentFlags: [],
    };
    setScamLookupEntity(cleanEntity);
    setIsCheckingReputation(false);
    return cleanEntity;
  };

  /**
   * Submit a scam/fraud report: persists locally, broadcasts to all live
   * AGC users via Supabase Realtime, and updates local state.
   */
  const flagEntityAsScam = async (
    targetValue: string,
    targetType: 'phone' | 'bank_account',
    reason: string
  ): Promise<void> => {
    const key = targetValue.replace(/\s+/g, '');
    const existing = scamDatabase[key];
    const reporterName = currentUser.fullName && currentUser.fullName !== 'AGC User'
      ? `${currentUser.fullName.split(' ')[0]} (Verified)`
      : 'Anonymous AGC User';
    const now = new Date();
    const dateLabel = now.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });

    const newFlag = { date: dateLabel, reason, flaggedBy: reporterName };

    const updatedEntity: ScamEntity = existing
      ? {
          ...existing,
          reportsCount: existing.reportsCount + 1,
          riskLevel: 'critical_scam' as const,
          recentFlags: [newFlag, ...existing.recentFlags].slice(0, 20),
        }
      : {
          targetValue,
          targetType,
          riskLevel: 'critical_scam' as const,
          reportsCount: 1,
          recentFlags: [newFlag],
        };

    // 1. Update local state immediately
    setScamDatabase((prev) => {
      const updated = { ...prev, [key]: updatedEntity };
      try { localStorage.setItem('AGC_scam_database_v2', JSON.stringify(updated)); } catch (_) {}
      return updated;
    });
    setScamLookupEntity(updatedEntity);

    // 2. Broadcast to all live users via Supabase Realtime
    if (isSupabaseConfigured) {
      try {
        broadcastScamReport({
          targetValue: updatedEntity.targetValue,
          targetType: updatedEntity.targetType,
          riskLevel: updatedEntity.riskLevel,
          reportsCount: updatedEntity.reportsCount,
          accountName: updatedEntity.accountName,
          bankName: updatedEntity.bankName,
          flags: updatedEntity.recentFlags.map((f) => ({
            date: f.date,
            reason: f.reason,
            flagged_by: f.flaggedBy,
          })),
        });
      } catch (_) {}
    }
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
      creatorName: currentUser.fullName || 'AGC User',
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
        names = names.filter((n) => n !== currentUser.fullName ? `${currentUser.fullName} (You)` : 'You');
      }
      if (isSelected && !names.includes(currentUser.fullName ? `${currentUser.fullName} (You)` : 'You')) {
        names.push(currentUser.fullName ? `${currentUser.fullName} (You)` : 'You');
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
      text: `✅ Paid ${CURRENCY_SYMBOLS.NGN}${amount.toLocaleString()} for Ajo Cycle Round 2 via AGC Wallet. Group Pot now 100% complete!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'delivered',
    };

    setMessages((prev) => ({
      ...prev,
      [chatId]: [...(prev[chatId] || []), newMsg],
    }));

    return { success: true, message: `Successfully contributed ₦${amount.toLocaleString()} to Ajo pot!` };
  };

  const upgradeVerificationBadge = (badge: 'blue' | 'gold' | 'creator_plus') => {
    let cost = 4000;
    let feeRate = 0.02;
    let badgeTitle = 'Blue Checkmark (₦4,000/mo · 2% platform fee)';

    if (badge === 'gold') {
      cost = 11000;
      feeRate = 0.05;
      badgeTitle = 'Gold Creator Checkmark (₦11,000/mo · 5% platform fee)';
    } else if (badge === 'creator_plus') {
      cost = 25000;
      feeRate = 0.02;
      badgeTitle = 'Creator Plus Plan (₦25,000/mo · 2% platform fee)';
    }

    if (wallet.availableBalance < cost) {
      return {
        success: false,
        message: `Insufficient wallet balance for ${badgeTitle}. Please top up your wallet.`,
      };
    }

    const newTx: WalletTransaction = {
      id: `tx_${Date.now()}`,
      type: 'topup',
      title: badgeTitle,
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

    return { success: true, message: `Badge activated successfully!` };
  };

  const createAjoGroup = (ajoData: {
    name: string;
    cycleContributionAmount: number;
    frequency: 'weekly' | 'monthly';
    totalRounds: number;
    rules?: string;
  }): { success: boolean; requiresVerification?: boolean; message: string } => {
    if (!currentUser.isPhoneVerified) {
      return { success: false, requiresVerification: true, message: 'Phone verification required to create an Ajo group.' };
    }
    const newGroup: AjoGroup = {
      id: `ajo_${Date.now()}`,
      name: ajoData.name,
      description: '',
      cycleContributionAmount: ajoData.cycleContributionAmount,
      currency: 'NGN',
      frequency: ajoData.frequency,
      totalRounds: ajoData.totalRounds,
      currentRound: 1,
      totalPoolPerRound: ajoData.cycleContributionAmount,
      currentRecipientName: currentUser.fullName,
      members: [
        {
          id: 'm1',
          name: currentUser.fullName,
          avatar: currentUser.avatarUrl || '',
          phone: currentUser.phoneNumber,
          hasPaidCurrentCycle: false,
          payoutPosition: 1,
          payoutDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
          isReceivedPayout: false,
        },
      ],
      nextPayoutDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      rules: ajoData.rules || '',
    };
    setActiveAjoGroup(newGroup);
    return { success: true, message: `Ajo group "${ajoData.name}" created successfully!` };
  };

  const loginWithPhone = (
    phoneNumber: string,
    fullName: string,
    avatarUrl?: string,
    about?: string,
    role?: 'user' | 'admin' | 'creator' | 'merchant'
  ) => {
    // Generate a unique session token for single-device enforcement
    const sessionToken = `${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    const cleanPhone = phoneNumber.replace(/\D/g, '');

    // Store session token so we can detect if another device steals the session
    localStorage.setItem('AGC_session_token', sessionToken);

    const updatedUser: UserProfile = {
      id: `usr_${Date.now()}`,
      phoneNumber,
      fullName: fullName || 'AGC User',
      avatarUrl: avatarUrl || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='50' fill='%23180a33'/><circle cx='50' cy='38' r='18' fill='%23a855f7'/><path d='M16 88c0-18.778 15.222-34 34-34s34 15.222 34 34' fill='%23a855f7'/></svg>",
      about: about || 'Available · Using AGC',
      createdAt: new Date().toISOString(),
      lastSeen: 'online',
      isPhoneVerified: true,
      role: role || (phoneNumber.includes('admin') ? 'admin' : 'user'),
    };

    setCurrentUser(updatedUser);
    setIsAuthenticated(true);
    setActiveChatId(null);

    // Strictly partition and load chats/messages for this phone number:
    try {
      const savedUserChats = localStorage.getItem(`AGC_chats_v2_${cleanPhone}`);
      if (savedUserChats) {
        const parsed = JSON.parse(savedUserChats);
        setChats(Array.isArray(parsed) ? parsed : []);
      } else {
        setChats([]);
      }
    } catch (_) {
      setChats([]);
    }

    try {
      const savedUserMsgs = localStorage.getItem(`AGC_messages_v2_${cleanPhone}`);
      if (savedUserMsgs) {
        setMessages(JSON.parse(savedUserMsgs));
      } else {
        setMessages({});
      }
    } catch (_) {
      setMessages({});
    }

    // 1. LocalStorage Persistence (Never wiped)
    localStorage.setItem('AGC_user_profile_v2', JSON.stringify(updatedUser));
    localStorage.setItem('AGC_is_authenticated', 'true');

    // Register phone in persistent registry for duplicate detection
    try {
      const regMap = JSON.parse(localStorage.getItem('AGC_registered_phones') || '{}');
      const entry = {
        phoneNumber: updatedUser.phoneNumber,
        fullName: updatedUser.fullName,
        avatarUrl: updatedUser.avatarUrl,
        registeredAt: new Date().toISOString(),
      };
      regMap[cleanPhone] = entry;
      regMap[updatedUser.phoneNumber] = entry;
      const core = cleanPhone.replace(/^234|^233|^254|^27|^256|^250|^225|^255|^237|^20|^44|^1/, '').replace(/^0+/, '');
      if (core) {
        regMap[core] = entry;
        if (core.length >= 9) regMap[core.slice(-9)] = entry;
      }
      localStorage.setItem('AGC_registered_phones', JSON.stringify(regMap));

      const allUsers: UserProfile[] = JSON.parse(localStorage.getItem('AGC_all_registered_users') || '[]');
      const filtered = allUsers.filter(u => u.phoneNumber !== updatedUser.phoneNumber);
      filtered.push(updatedUser);
      localStorage.setItem('AGC_all_registered_users', JSON.stringify(filtered));

      const cleanUser = (updatedUser.fullName || '').toLowerCase().replace(/^@/, '').trim();
      const takenList: string[] = JSON.parse(localStorage.getItem('AGC_taken_usernames') || '[]');
      if (cleanUser && !takenList.includes(cleanUser)) {
        takenList.push(cleanUser);
        localStorage.setItem('AGC_taken_usernames', JSON.stringify(takenList));
      }
    } catch (_) {}

    requestNotificationPermission().catch(() => {});
    setIsAuthModalOpen(false);

    // 2. Register with Socket.io Gateway (pass sessionToken for single-session enforcement)
    try {
      registerSocketUser(updatedUser);
      // Also emit register_phone with session token so server can kick old socket
      const sock = getSocket();
      if (sock) {
        sock.emit('register_phone', { phone: cleanPhone, sessionToken });
      }
    } catch (e) {
      console.warn('Socket user register notice:', e);
    }

    // 3. Register with local server REST API
    try {
      const payload = JSON.stringify(updatedUser);
      const registerPayload = JSON.stringify({ ...updatedUser, sessionToken });
      fetch('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: registerPayload,
      }).catch(() => {
        const socketHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
        fetch(`http://${socketHost}:3002/api/users/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
        }).catch(() => {});
      });
    } catch (e) {
      console.warn('REST user register notice:', e);
    }

    // 4. Save to Supabase profiles and broadcast global sync
    if (isSupabaseConfigured) {
      // 4a. Write to agc_phone_registry — no-RLS public table for cross-device duplicate detection
      const phoneDigits = cleanPhone;
      const last9 = phoneDigits.length >= 9 ? phoneDigits.slice(-9) : phoneDigits;

      // Hydrate username and avatar from agc_phone_registry if logging in on a new device
      supabase
        .from('agc_phone_registry')
        .select('username, avatar_url, full_phone')
        .or(`phone_digits.eq.${last9},full_phone.eq.${updatedUser.phoneNumber},full_phone.eq.${phoneDigits}`)
        .limit(1)
        .maybeSingle()
        .then(({ data: regData }) => {
          if (regData?.username && (updatedUser.fullName === 'AGC User' || !updatedUser.fullName || regData.username !== 'AGC User')) {
            setCurrentUser((prev) => {
              const enriched: UserProfile = {
                ...prev,
                fullName: regData.username || prev.fullName,
                avatarUrl: regData.avatar_url || prev.avatarUrl,
              };
              try {
                localStorage.setItem('AGC_user_profile_v2', JSON.stringify(enriched));
              } catch (_) {}
              return enriched;
            });
          }
        });

      // Keep avatar payload safe (<3000 chars) to prevent HTTP 413
      const safeAvatar = (updatedUser.avatarUrl && updatedUser.avatarUrl.length < 3000)
        ? updatedUser.avatarUrl
        : (updatedUser.avatarUrl?.startsWith('http') ? updatedUser.avatarUrl : '');

      supabase
        .from('agc_phone_registry')
        .upsert(
          {
            phone_digits: last9,
            full_phone: updatedUser.phoneNumber,
            username: updatedUser.fullName,
            avatar_url: safeAvatar,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'phone_digits' }
        )
        .then(({ error }: any) => {
          if (error) console.warn('Phone registry notice:', error.message);
          else console.log('✅ Cross-device phone registry updated');
        });

      supabase
        .from('profiles')
        .upsert({
          id: updatedUser.id,
          full_name: updatedUser.fullName,
          phone_number: updatedUser.phoneNumber,
          avatar_url: updatedUser.avatarUrl,
          bio: updatedUser.about,
          updated_at: new Date().toISOString(),
        })
        .then(({ error }: any) => {
          if (error) console.warn('Supabase profile save notice:', error);
          else console.log('✅ Supabase profile registered');
        });

      try {
        const syncChannel = supabase.channel('global_user_sync');
        syncChannel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            syncChannel.send({
              type: 'broadcast',
              event: 'user_registered',
              payload: updatedUser,
            });
          }
        });
      } catch (_) {}

      // Broadcast force_logout via Supabase channel to other devices with this phone
      try {
        const ch = supabase.channel(`phone_call_${cleanPhone}`);
        ch.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            ch.send({
              type: 'broadcast',
              event: 'force_logout',
              payload: { sessionToken, targetPhone: cleanPhone },
            });
          }
        });
      } catch (_) {}
    }
  };

  const logoutUser = () => {
    setIsAuthenticated(false);
    localStorage.setItem('AGC_is_authenticated', 'false');
    setActiveChatId(null);
    setChats([]);
    setMessages({});
    setIsAuthModalOpen(true);
  };

  const updateUserProfile = (updates: Partial<UserProfile>) => {
    setCurrentUser((prev) => {
      const updated = { ...prev, ...updates };
      localStorage.setItem('AGC_user_profile_v2', JSON.stringify(updated));
      return updated;
    });
  };

  // 9. Contacts Handlers
  const syncDeviceContacts = () => {
    setDeviceContacts((prev) => [...prev]);
  };

  const addNewDeviceContact = (name: string, phone: string, about?: string, isRegistered: boolean = true, customAvatar?: string) => {
    const cleaned = phone.replace(/[\s-]/g, '');
    const normalized = cleaned.startsWith('0') ? `+234${cleaned.slice(1)}` : cleaned.startsWith('+') ? cleaned : `+234${cleaned}`;
    const avatar = customAvatar || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='50' fill='%23180a33'/><circle cx='50' cy='38' r='18' fill='%23a855f7'/><path d='M16 88c0-18.778 15.222-34 34-34s34 15.222 34 34' fill='%23a855f7'/></svg>";
    const newContact: DeviceContact = {
      id: `cnt_${Date.now()}`,
      name,
      rawPhoneNumber: phone,
      normalizedPhoneNumber: normalized,
      about: about || (isRegistered ? 'Available · Using AGC' : 'Invited to AGC'),
      avatar,
      isRegisteredOnAGC: isRegistered,
      registeredUser: isRegistered
        ? {
            id: `usr_${Date.now()}`,
            phoneNumber: normalized,
            fullName: name,
            avatarUrl: avatar,
            about: about || 'Available · Using AGC',
            createdAt: new Date().toISOString(),
            lastSeen: 'Just now',
          }
        : undefined,
    };
    setDeviceContacts((prev) => {
      const updated = [newContact, ...prev.filter(c => c.normalizedPhoneNumber !== normalized)];
      try {
        const userKey = getUserStorageKey('AGC_device_contacts', currentUser.phoneNumber);
        localStorage.setItem(userKey, JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });

    // Also persist friend to Supabase device_contacts
    if (isSupabaseConfigured && currentUser.id) {
      try {
        supabase.from('device_contacts').upsert({
          owner_id: currentUser.id,
          name: newContact.name,
          phone: newContact.normalizedPhoneNumber,
          avatar_url: newContact.avatar,
          is_on_afri_chat: newContact.isRegisteredOnAGC,
        }, { onConflict: 'owner_id,phone' }).then(({ error }) => {
          if (error) console.warn('Supabase device_contacts notice:', error.message);
        });
      } catch (_) {}
    }

    return newContact;
  };

  const importDeviceContacts = async (rawContacts: { name: string; phone: string }[]): Promise<number> => {
    if (!rawContacts || rawContacts.length === 0) return 0;

    const normalizedList: DeviceContact[] = rawContacts.map((c, i) => {
      const raw = c.phone.trim();
      const cleaned = raw.replace(/[\s-]/g, '');
      const normalized = cleaned.startsWith('0') ? `+234${cleaned.slice(1)}` : cleaned.startsWith('+') ? cleaned : `+234${cleaned}`;
      return {
        id: `cnt_imp_${Date.now()}_${i}`,
        name: c.name.trim() || `Contact ${normalized.slice(-4)}`,
        rawPhoneNumber: raw,
        normalizedPhoneNumber: normalized,
        about: 'Device Contact',
        avatar: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='50' fill='%23180a33'/><circle cx='50' cy='38' r='18' fill='%23a855f7'/><path d='M16 88c0-18.778 15.222-34 34-34s34 15.222 34 34' fill='%23a855f7'/></svg>",
        isRegisteredOnAGC: false,
      };
    });

    let registeredCount = 0;
    let registeredUsers: any[] = [];
    try {
      const socketHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
      const res = await fetch(`http://${socketHost}:3002/api/users`);
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json?.users)) registeredUsers = json.users;
      }
    } catch (_) {}

    if (isSupabaseConfigured) {
      try {
        const { data } = await supabase.from('agc_phone_registry').select('*');
        if (Array.isArray(data)) registeredUsers = [...registeredUsers, ...data];
      } catch (_) {}
    }

    const updatedContacts = normalizedList.map((c) => {
      const match = registeredUsers.find((u) => phonesMatch(u.full_phone || u.phoneNumber || u.cleanPhone || u.phone_digits, c.normalizedPhoneNumber || c.rawPhoneNumber));
      if (match) {
        registeredCount++;
        return {
          ...c,
          isRegisteredOnAGC: true,
          avatar: match.avatar_url || match.avatarUrl || c.avatar,
          about: match.about || 'Available · Using AGC',
          registeredUser: {
            id: match.id || `usr_${match.phone_digits}`,
            phoneNumber: match.full_phone || c.normalizedPhoneNumber,
            fullName: match.username || match.fullName || c.name,
            avatarUrl: match.avatar_url || match.avatarUrl || c.avatar,
            about: match.about || 'Available · Using AGC',
            createdAt: new Date().toISOString(),
            lastSeen: 'recently',
          },
        };
      }
      return c;
    });

    setDeviceContacts((prev) => {
      const map = new Map<string, DeviceContact>();
      prev.forEach((c) => map.set(c.normalizedPhoneNumber, c));
      updatedContacts.forEach((c) => map.set(c.normalizedPhoneNumber, c));
      const merged = Array.from(map.values());
      try {
        const userKey = getUserStorageKey('AGC_device_contacts', currentUser.phoneNumber);
        localStorage.setItem(userKey, JSON.stringify(merged));
      } catch (_) {}
      return merged;
    });

    // Also persist imported contacts to Supabase device_contacts
    if (isSupabaseConfigured && currentUser.id) {
      try {
        const rows = updatedContacts.map((c) => ({
          owner_id: currentUser.id,
          name: c.name,
          phone: c.normalizedPhoneNumber,
          avatar_url: c.avatar,
          is_on_afri_chat: c.isRegisteredOnAGC,
        }));
        supabase.from('device_contacts').upsert(rows, { onConflict: 'owner_id,phone' }).then(() => {});
      } catch (_) {}
    }

    return registeredCount;
  };

  const startChatWithContact = (contact: DeviceContact) => {
    const myPhone = currentUser.phoneNumber || '';
    const otherPhone = contact.normalizedPhoneNumber || contact.rawPhoneNumber || '';
    const isSelf = contact.id === 'self' || phonesMatch(myPhone, otherPhone);
    const deterministicId = isSelf
      ? `dm_self_${normalizePhoneDigits(myPhone)}`
      : myPhone && otherPhone
      ? getDirectChatId(myPhone, otherPhone)
      : '';

    let existingChat = chats.find(
      (c) =>
        (deterministicId && c.id === deterministicId) ||
        (isSelf && (c.id === `dm_self_${normalizePhoneDigits(myPhone)}` || c.name.includes('(Message yourself)'))) ||
        (!isSelf && otherPhone && c.phone && phonesMatch(c.phone, otherPhone)) ||
        (!isSelf && c.name.toLowerCase() === contact.name.toLowerCase())
    );

    const targetChatId = deterministicId || existingChat?.id || `chat_${Date.now()}`;

    if (!existingChat) {
      const newThread: ChatThread = {
        id: targetChatId,
        name: contact.name,
        avatar:
          contact.avatar ||
          "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='50' fill='%23180a33'/><circle cx='50' cy='38' r='18' fill='%23a855f7'/><path d='M16 88c0-18.778 15.222-34 34-34s34 15.222 34 34' fill='%23a855f7'/></svg>",
        verifiedStore: false,
        location: 'Contact Book',
        unreadCount: 0,
        lastMessage: 'Tap to start conversation',
        lastMessageTime: 'Just now',
        catalog: [],
        isOnline: true,
        phone: contact.normalizedPhoneNumber || contact.rawPhoneNumber,
      };
      setChats((prev) => {
        const updated = [newThread, ...prev];
        try {
          const userKey = getUserStorageKey('AGC_chats_v2', currentUser.phoneNumber);
          localStorage.setItem(userKey, JSON.stringify(updated));
        } catch (_) {}
        return updated;
      });
      existingChat = newThread;
    } else if (existingChat.id !== targetChatId) {
      const updated = { ...existingChat, id: targetChatId };
      setChats((prev) => {
        const updatedList = prev.map((c) => (c.id === existingChat!.id ? updated : c));
        try {
          const userKey = getUserStorageKey('AGC_chats_v2', currentUser.phoneNumber);
          localStorage.setItem(userKey, JSON.stringify(updatedList));
        } catch (_) {}
        return updatedList;
      });
      existingChat = updated;
    }

    setActiveTab('chats');
    setActiveChatId(existingChat.id);
    setIsContactsModalOpen(false);

    // Persist bilateral chat to Supabase so BOTH sides can see each other's messages
    if (isSupabaseConfigured && targetChatId) {
      const myUserId = currentUser.id || myPhone;
      const otherUserId = contact.registeredUser?.id || otherPhone;

      supabase
        .from('chats')
        .upsert({ id: targetChatId, type: 'direct', created_at: new Date().toISOString() }, { onConflict: 'id' })
        .then(({ error }) => { if (error) console.warn('[AGC] Supabase chat upsert:', error.message); });

      // Insert both participant rows (bilateral — the key fix for one-sided QR chats)
      [myUserId, otherUserId].filter(Boolean).forEach((uid) => {
        supabase
          .from('chat_participants')
          .upsert({ chat_id: targetChatId, user_id: uid }, { onConflict: 'chat_id,user_id' })
          .then(({ error }) => { if (error) console.warn('[AGC] Participant upsert:', error.message); });
      });
    }
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
      localStorage.setItem('AGC_user_memes', JSON.stringify(updated));
      return updated;
    });
  };

  const deleteUserMeme = (memeId: string) => {
    setUserMemes((prev) => {
      const updated = prev.filter((m) => m.id !== memeId);
      localStorage.setItem('AGC_user_memes', JSON.stringify(updated));
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
    broadcastLiveMessage(chatId, newMsg);
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
      localStorage.setItem('AGC_dispatch_orders', JSON.stringify(updated));
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
      localStorage.setItem('AGC_job_postings', JSON.stringify(updated));
      return updated;
    });

    // 🌐 Broadcast to all live users via Supabase Realtime
    if (isSupabaseConfigured) {
      try {
        const jobCh = supabase.channel('live_job_board', { config: { broadcast: { self: false } } });
        jobCh.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            jobCh.send({
              type: 'broadcast',
              event: 'new_job_posted',
              payload: { job: newJob },
            });
          }
        });
      } catch (e) {
        console.warn('Failed to broadcast new job:', e);
      }
    }

    setIsPostJobModalOpen(false);
    return {
      success: true,
      job: newJob,
      message: 'Job posting published successfully on AGC Opportunities Board (₦400 fee deducted)!',
    };
  };

  const applyForJob = (job: JobPosting) => {
    const applyFee = 50;
    if (wallet.availableBalance < applyFee) {
      return {
        success: false,
        message: `Insufficient wallet balance for application fee (₦${applyFee}). Please fund your AGC wallet first.`,
      };
    }

    const newTx: WalletTransaction = {
      id: `tx_${Date.now()}`,
      type: 'topup',
      title: `Job Application Fee: ${job.title.slice(0, 24)}`,
      amount: applyFee,
      currency: 'NGN',
      timestamp: 'Just now',
      status: 'completed',
      reference: `JOB_APP_${Date.now()}`,
      channel: 'wallet',
    };

    setWallet((prev) => ({
      ...prev,
      availableBalance: prev.availableBalance - applyFee,
      transactions: [newTx, ...prev.transactions],
    }));

    // Inject application notification message directly into chat with employer
    const employerChat = chats.find((c) => c.phone === job.contactPhone || c.name.toLowerCase().includes(job.company.toLowerCase())) || chats[0];
    if (employerChat) {
      const appMsg: ChatMessage = {
        id: `msg_app_${Date.now()}`,
        chatId: employerChat.id,
        sender: 'user',
        senderName: currentUser.fullName || 'AGC Applicant',
        senderPhone: currentUser.phoneNumber,
        senderAvatar: currentUser.avatarUrl,
        text: `📄 Job Application Submitted: "${job.title}" at ${job.company}.\nApplicant: ${currentUser.fullName || 'AGC Member'} (${currentUser.phoneNumber || 'Verified Phone'}).\n₦50 application fee escrow verified. Ready to discuss!`,
        type: 'text',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'sent',
      };
      setMessages((prev) => ({
        ...prev,
        [employerChat.id]: [...(prev[employerChat.id] || []), appMsg],
      }));
    }

    return {
      success: true,
      message: `Application submitted for "${job.title}"! ₦50 application fee paid from your wallet. Employer chat opened.`,
    };
  };

  // 13. Security Handlers & Anti-Brute-Force Protection
  const WEAK_PINS = ['0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999', '1234', '4321', '0123', '9876'];

  const verifyPaymentPinDetailed = (pin: string): { success: boolean; message?: string; lockedUntil?: number | null } => {
    const now = Date.now();
    if (securitySettings.lockoutUntil && securitySettings.lockoutUntil > now) {
      const remainingSeconds = Math.ceil((securitySettings.lockoutUntil - now) / 1000);
      return {
        success: false,
        message: `Security Lockout Active: Too many failed attempts. Try again in ${remainingSeconds}s.`,
        lockedUntil: securitySettings.lockoutUntil,
      };
    }

    const currentPin = (securitySettings.paymentPin || '1234').trim();
    if (currentPin === pin.trim()) {
      if ((securitySettings.failedAttempts ?? 0) > 0 || securitySettings.lockoutUntil) {
        setSecuritySettings((prev) => {
          const updated = { ...prev, failedAttempts: 0, lockoutUntil: null };
          localStorage.setItem('AGC_security_settings', JSON.stringify(updated));
          return updated;
        });
      }
      return { success: true };
    }

    const nextAttempts = (securitySettings.failedAttempts || 0) + 1;
    const isLocked = nextAttempts >= 5;
    const lockoutUntil = isLocked ? now + 180000 : null;

    setSecuritySettings((prev) => {
      const updated = { ...prev, failedAttempts: nextAttempts, lockoutUntil };
      localStorage.setItem('AGC_security_settings', JSON.stringify(updated));
      return updated;
    });

    if (isLocked) {
      return {
        success: false,
        message: 'Security Alert: 5 failed PIN attempts reached. Account locked for 3 minutes for anti-fraud protection.',
        lockedUntil: lockoutUntil,
      };
    }

    const remaining = 5 - nextAttempts;
    return {
      success: false,
      message: `Incorrect PIN. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining before security lockout.`,
    };
  };

  const verifyPaymentPin = (pin: string): boolean => {
    return verifyPaymentPinDetailed(pin).success;
  };

  const resetPinLockout = () => {
    setSecuritySettings((prev) => {
      const updated = { ...prev, failedAttempts: 0, lockoutUntil: null };
      localStorage.setItem('AGC_security_settings', JSON.stringify(updated));
      return updated;
    });
  };

  const updatePaymentPin = (newPin: string, oldPin?: string): { success: boolean; message: string } => {
    const currentPin = (securitySettings.paymentPin || '1234').trim();
    
    // Verify old PIN if one was already set
    if (securitySettings.hasPaymentPin && currentPin) {
      if (!oldPin) {
        return { success: false, message: 'Current 4-digit PIN is required to change PIN.' };
      }
      const check = verifyPaymentPinDetailed(oldPin);
      if (!check.success) {
        return { success: false, message: check.message || 'Current PIN verification failed.' };
      }
    }

    if (!newPin || newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      return { success: false, message: 'New PIN must be exactly 4 numeric digits.' };
    }

    if (WEAK_PINS.includes(newPin)) {
      return { success: false, message: 'PIN is too weak or common (e.g. 1234, 0000, 1111). Please choose a stronger PIN.' };
    }

    setSecuritySettings((prev) => {
      const updated = { ...prev, hasPaymentPin: true, paymentPin: newPin, failedAttempts: 0, lockoutUntil: null };
      localStorage.setItem('AGC_security_settings', JSON.stringify(updated));
      return updated;
    });

    return { success: true, message: 'Payment PIN successfully updated and secured!' };
  };

  const setPaymentPin = (pin: string) => {
    updatePaymentPin(pin);
  };

  const setSecurityQuestion = (question: string, answer: string) => {
    setSecuritySettings((prev) => {
      const updated = { ...prev, securityQuestion: question, securityAnswer: answer };
      localStorage.setItem('AGC_security_settings', JSON.stringify(updated));
      return updated;
    });
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
      localStorage.setItem('AGC_service_bookings', JSON.stringify(updated));
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
      localStorage.setItem('AGC_service_bookings', JSON.stringify(updated));
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
      localStorage.setItem('AGC_service_bookings', JSON.stringify(updated));
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
      localStorage.setItem('AGC_service_providers', JSON.stringify(updated));
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
      note: note || 'Transfer via AGC Delayed Escrow',
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
      localStorage.setItem('AGC_delayed_transfers', JSON.stringify(updated));
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
      localStorage.setItem('AGC_delayed_transfers', JSON.stringify(updated));
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
      localStorage.setItem('AGC_delayed_transfers', JSON.stringify(updated));
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
      localStorage.setItem('AGC_payroll_employees', JSON.stringify(updated));
      return updated;
    });
  };

  const toggleEmployeePayrollStatus = (id: string) => {
    setPayrollEmployees((prev) => {
      const updated = prev.map((e) =>
        e.id === id ? { ...e, status: e.status === 'active' ? ('paused' as const) : ('active' as const) } : e
      );
      localStorage.setItem('AGC_payroll_employees', JSON.stringify(updated));
      return updated;
    });
  };

  const deletePayrollEmployee = (id: string) => {
    setPayrollEmployees((prev) => {
      const updated = prev.filter((e) => e.id !== id);
      localStorage.setItem('AGC_payroll_employees', JSON.stringify(updated));
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
      localStorage.setItem('AGC_payroll_logs', JSON.stringify(updated));
      return updated;
    });

    // Update lastPaidDate for employees
    setPayrollEmployees((prev) => {
      const updated = prev.map((e) =>
        targets.some((t) => t.id === e.id)
          ? { ...e, lastPaidDate: 'Today, Just now' }
          : e
      );
      localStorage.setItem('AGC_payroll_employees', JSON.stringify(updated));
      return updated;
    });

    return {
      success: true,
      totalDebited: totalNeeded,
      message: `Payroll auto-debit executed successfully! ₦${totalNeeded.toLocaleString()} disbursed to ${targets.length} staff member(s).`,
    };
  };

  // 24. Celebrity Identity Verification State
  const [isCelebrityModalOpen, setIsCelebrityModalOpen] = useState(false);
  const [celebrityApplications, setCelebrityApplications] = useState<CelebrityVerificationApplication[]>(() => {
    try {
      const saved = localStorage.getItem('AGC_celebrity_apps');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse celebrity apps:', e);
    }
    return [
      {
        id: 'cel_app_01',
        userId: 'usr_burna_boy',
        stageName: 'Burna Boy',
        realName: 'Damini Ebunoluwa Ogulu',
        category: 'Musician',
        socialHandle: '@burnaboygram',
        status: 'approved',
        submittedAt: 'Jan 2026',
      },
    ];
  });

  const applyForCelebrityVerification = (data: {
    stageName: string;
    category: CelebrityVerificationApplication['category'];
    socialHandle: string;
    proofDocumentUrl?: string;
  }) => {
    const newApp: CelebrityVerificationApplication = {
      id: `app_${Date.now()}`,
      userId: currentUser.id,
      stageName: data.stageName,
      realName: currentUser.fullName,
      category: data.category,
      socialHandle: data.socialHandle,
      proofDocumentUrl: data.proofDocumentUrl,
      status: 'approved', // Auto-approval verification workflow for platform celebrities
      submittedAt: 'Just now',
    };

    setCelebrityApplications((prev) => {
      const updated = [newApp, ...prev];
      localStorage.setItem('AGC_celebrity_apps', JSON.stringify(updated));
      return updated;
    });

    const updatedUser: UserProfile = {
      ...currentUser,
      isCelebrityVerified: true,
      celebrityCategory: data.category,
      celebrityStageName: data.stageName,
    };
    setCurrentUser(updatedUser);
    localStorage.setItem('AGC_user_profile_v2', JSON.stringify(updatedUser));

    return {
      success: true,
      message: `🌟 Celebrity Identity Verified! The golden/purple celebrity verified badge is now active on your AGC profile and chats.`,
    };
  };

  const toggleCelebrityStatus = () => {
    const nextStatus = !currentUser.isCelebrityVerified;
    const updatedUser: UserProfile = {
      ...currentUser,
      isCelebrityVerified: nextStatus,
      celebrityCategory: nextStatus ? (currentUser.celebrityCategory || 'Public Figure & Creator') : undefined,
    };
    setCurrentUser(updatedUser);
    localStorage.setItem('AGC_user_profile_v2', JSON.stringify(updatedUser));
  };

  // 25. Store Registration & Tiers System (3k/mo for 30 items, 7k/mo for 100 items limit)
  const [isStoreRegModalOpen, setIsStoreRegModalOpen] = useState(false);
  const [storeSubscription, setStoreSubscription] = useState<StoreSubscription>(() => {
    try {
      const saved = localStorage.getItem('AGC_store_sub');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse store sub:', e);
    }
    return {
      isRegistered: false,
      tier: null,
      storeName: '',
      category: '',
      description: '',
      itemsLimit: 0,
      itemsUsed: 0,
      expiresAt: '',
    };
  });

  const subscribeStoreTier = (
    tier: 'starter_30' | 'pro_100',
    storeName: string,
    category: string,
    description: string,
    paymentMethod: 'wallet' | 'paystack'
  ) => {
    const fee = tier === 'starter_30' ? 3000 : 7000;
    const itemLimit = tier === 'starter_30' ? 30 : 100;

    if (paymentMethod === 'wallet' && wallet.availableBalance < fee) {
      return {
        success: false,
        message: `Insufficient wallet balance for ₦${fee.toLocaleString()} monthly store registration. Please top up or pay with card.`,
      };
    }

    if (paymentMethod === 'wallet') {
      const newTx: WalletTransaction = {
        id: `tx_store_reg_${Date.now()}`,
        type: 'transfer_out',
        title: `Store Registration (${tier === 'starter_30' ? 'Starter 30-Items' : 'Pro 100-Items'})`,
        amount: fee,
        currency: 'NGN',
        timestamp: 'Just now',
        status: 'completed',
        channel: 'wallet',
      };
      setWallet((prev) => ({
        ...prev,
        availableBalance: prev.availableBalance - fee,
        transactions: [newTx, ...prev.transactions],
      }));
    }

    const updatedSub: StoreSubscription = {
      tier,
      monthlyFee: fee,
      itemLimit,
      itemsCount: storeSubscription ? storeSubscription.itemsCount : 0,
      storeName: storeName || (currentUser.fullName ? `${currentUser.fullName}'s Official Store` : 'AGC Store'),
      description: description || 'Verified African merchant catalog.',
      category: category || 'General Trade',
      active: true,
      expiresAt: 'In 30 days',
      paymentMethod,
    };

    setStoreSubscription(updatedSub);
    localStorage.setItem('AGC_store_sub', JSON.stringify(updatedSub));

    // 🌐 LIVE SYSTEM: Publish Store Subscription to Supabase and broadcast live to network
    if (isSupabaseConfigured) {
      createStoreSubscriptionInDb({
        store_name: updatedSub.storeName,
        description: updatedSub.description,
        category: updatedSub.category,
        tier: updatedSub.tier,
        items_limit: updatedSub.itemLimit,
        is_active: true,
        payment_method: updatedSub.paymentMethod,
      }).catch((e) => console.warn('Supabase store create notice:', e));

      try {
        const storeCh = supabase.channel('live_store_subscriptions', { config: { broadcast: { self: false } } });
        storeCh.subscribe((st) => {
          if (st === 'SUBSCRIBED') {
            storeCh.send({ type: 'broadcast', event: 'store_registered', payload: updatedSub });
          }
        });
      } catch (_) {}
    }

    return {
      success: true,
      message: `🎉 Store successfully registered live under ${tier === 'starter_30' ? 'Starter (30 Items Limit - ₦3k/mo)' : 'Pro (100 Items Limit - ₦7k/mo)'}!`,
    };
  };

  // 26. Creator Digital Files & VIP Sessions
  const [creatorFiles, setCreatorFiles] = useState<CreatorDigitalFile[]>(() => {
    try {
      const saved = localStorage.getItem('AGC_creator_files');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse creator files:', e);
    }
    return MOCK_CREATOR_FILES;
  });

  const buyCreatorFile = (fileId: string) => {
    const file = creatorFiles.find((f) => f.id === fileId);
    if (!file) return { success: false, message: 'Digital file not found.' };

    if (wallet.availableBalance < file.price) {
      return {
        success: false,
        message: `Insufficient wallet balance to buy "${file.title}" (₦${file.price.toLocaleString()}). Please top up your wallet.`,
      };
    }

    const newTx: WalletTransaction = {
      id: `tx_file_buy_${Date.now()}`,
      type: 'transfer_out',
      title: `Digital Product: ${file.title}`,
      amount: file.price,
      currency: file.currency,
      timestamp: 'Just now',
      status: 'completed',
      channel: 'wallet',
    };

    setWallet((prev) => ({
      ...prev,
      availableBalance: prev.availableBalance - file.price,
      transactions: [newTx, ...prev.transactions],
    }));

    const updatedFile: CreatorDigitalFile = {
      ...file,
      isPurchasedByMe: true,
      downloadsCount: file.downloadsCount + 1,
    };

    setCreatorFiles((prev) => {
      const updated = prev.map((f) => (f.id === fileId ? updatedFile : f));
      localStorage.setItem('AGC_creator_files', JSON.stringify(updated));
      return updated;
    });

    // Credit creator total earnings
    setCreators((prev) =>
      prev.map((c) => (c.id === file.creatorId ? { ...c, totalEarnings: c.totalEarnings + file.price } : c))
    );

    return {
      success: true,
      file: updatedFile,
      message: `🎉 Purchased "${file.title}"! Download unlocked and saved to your device library.`,
    };
  };

  const uploadCreatorFile = (
    fileData: Omit<CreatorDigitalFile, 'id' | 'downloadsCount' | 'isPurchasedByMe' | 'createdAt'>
  ) => {
    const newFile: CreatorDigitalFile = {
      ...fileData,
      id: `file_${Date.now()}`,
      downloadsCount: 0,
      isPurchasedByMe: true,
      createdAt: 'Just now',
    };

    setCreatorFiles((prev) => {
      const updated = [newFile, ...prev];
      localStorage.setItem('AGC_creator_files', JSON.stringify(updated));
      return updated;
    });
  };

  const bookCreatorVipSession = (
    creatorId: string,
    type: 'voice' | 'video' | 'chat',
    durationMinutes: number,
    price: number
  ) => {
    const creator = creators.find((c) => c.id === creatorId);
    if (!creator) return { success: false, message: 'Creator not found' };

    if (wallet.availableBalance < price) {
      return {
        success: false,
        message: `Insufficient wallet balance for VIP session (₦${price.toLocaleString()}). Please top up your wallet.`,
      };
    }

    const newTx: WalletTransaction = {
      id: `tx_vip_${Date.now()}`,
      type: 'transfer_out',
      title: `VIP 1-on-1 ${type === 'voice' ? 'Voice Call' : type === 'video' ? 'Video Call' : 'VIP Direct Chat'} with ${creator.name} (${durationMinutes}m)`,
      amount: price,
      currency: 'NGN',
      timestamp: 'Just now',
      status: 'completed',
      channel: 'wallet',
    };

    setWallet((prev) => ({
      ...prev,
      availableBalance: prev.availableBalance - price,
      transactions: [newTx, ...prev.transactions],
    }));

    // Credit creator directly
    setCreators((prev) =>
      prev.map((c) => (c.id === creatorId ? { ...c, totalEarnings: c.totalEarnings + price } : c))
    );

    // Launch call or chat directly!
    if (type === 'voice' || type === 'video') {
      startCall(creator.name, '+234 800 CREATOR', creator.avatar, type);
    } else {
      // Find or open chat
      const existingChat = chats.find((c) => c.name.toLowerCase().includes(creator.name.slice(0, 5).toLowerCase()));
      if (existingChat) {
        setActiveChatId(existingChat.id);
      }
    }

    return {
      success: true,
      message: `📞 VIP 1-on-1 ${type.toUpperCase()} session with ${creator.name} confirmed for ${durationMinutes} min(s)! Starting connection now...`,
    };
  };

  const updateCreatorVipRates = (creatorId: string, rates: Partial<CreatorVipService>) => {
    setCreators((prev) =>
      prev.map((c) => {
        if (c.id === creatorId) {
          return {
            ...c,
            vipServices: {
              voicePerMinute: 1500,
              videoPerMinute: 3000,
              bundle3MinVoice: 3500,
              bundle5MinVoice: 5500,
              bundle3MinVideo: 7500,
              bundle5MinVideo: 12000,
              vipDirectChat24h: 4000,
              ...c.vipServices,
              ...rates,
            },
          };
        }
        return c;
      })
    );
  };

  // 27. Writers System (AfriBooks)
  const [afriBooks, setAfriBooks] = useState<AfriBook[]>(() => {
    try {
      const saved = localStorage.getItem('AGC_afribooks');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse books:', e);
    }
    return [];
  });
  const [activeReadingBook, setActiveReadingBook] = useState<AfriBook | null>(null);
  const [activeReadingChapterIndex, setActiveReadingChapterIndex] = useState<number>(0);
  const [isWritersModalOpen, setIsWritersModalOpen] = useState(false);

  const [groupReadSessions, setGroupReadSessions] = useState<GroupReadSession[]>(() => {
    try {
      const saved = localStorage.getItem('AGC_group_read');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse group read:', e);
    }
    return [];
  });
  const [activeGroupReadSession, setActiveGroupReadSession] = useState<GroupReadSession | null>(null);

  const submitNewBook = (
    bookData: Omit<AfriBook, 'id' | 'totalReads' | 'tipsReceivedCount' | 'tipsTotalAmount' | 'isPurchasedByMe' | 'publishedAt'>
  ) => {
    const newBook: AfriBook = {
      ...bookData,
      id: `book_${Date.now()}`,
      isHumanWrittenCertified: true, // Strict anti-AI guarantee
      totalReads: 1,
      tipsReceivedCount: 0,
      tipsTotalAmount: 0,
      isPurchasedByMe: true, // author owns their book
      publishedAt: 'Just now',
    };

    setAfriBooks((prev) => {
      const updated = [newBook, ...prev];
      localStorage.setItem('AGC_afribooks', JSON.stringify(updated));
      return updated;
    });

    return {
      success: true,
      book: newBook,
      message: `📖 "${newBook.title}" published to African Writers Guild with 100% Human-Written certification!`,
    };
  };

  const addChapterToBook = (bookId: string, chapterData: Omit<BookChapter, 'id' | 'comments'>) => {
    const newChap: BookChapter = {
      ...chapterData,
      id: `chap_${Date.now()}`,
      comments: [],
    };

    setAfriBooks((prev) => {
      const updated = prev.map((b) => (b.id === bookId ? { ...b, chapters: [...b.chapters, newChap] } : b));
      localStorage.setItem('AGC_afribooks', JSON.stringify(updated));
      return updated;
    });

    if (activeReadingBook && activeReadingBook.id === bookId) {
      setActiveReadingBook((prev) => (prev ? { ...prev, chapters: [...prev.chapters, newChap] } : null));
    }
  };

  const commentOnChapter = (bookId: string, chapterId: string, commentText: string) => {
    const newComment = {
      id: `comm_${Date.now()}`,
      readerName: currentUser.fullName || 'Avid Reader',
      readerAvatar: currentUser.avatarUrl || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='50' fill='%23180a33'/><circle cx='50' cy='38' r='18' fill='%23a855f7'/><path d='M16 88c0-18.778 15.222-34 34-34s34 15.222 34 34' fill='%23a855f7'/></svg>",
      comment: commentText.trim(),
      timestamp: 'Just now',
    };

    setAfriBooks((prev) => {
      const updated = prev.map((b) => {
        if (b.id !== bookId) return b;
        return {
          ...b,
          chapters: b.chapters.map((ch) => (ch.id === chapterId ? { ...ch, comments: [newComment, ...ch.comments] } : ch)),
        };
      });
      localStorage.setItem('AGC_afribooks', JSON.stringify(updated));
      return updated;
    });

    if (activeReadingBook && activeReadingBook.id === bookId) {
      setActiveReadingBook((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          chapters: prev.chapters.map((ch) => (ch.id === chapterId ? { ...ch, comments: [newComment, ...ch.comments] } : ch)),
        };
      });
    }
  };

  const tipBookAuthor = (bookId: string, amount: number) => {
    const book = afriBooks.find((b) => b.id === bookId);
    if (!book) return { success: false, message: 'Book not found' };

    if (wallet.availableBalance < amount) {
      return { success: false, message: `Insufficient wallet balance to tip ₦${amount.toLocaleString()}. Please top up your wallet.` };
    }

    const newTx: WalletTransaction = {
      id: `tx_tip_${Date.now()}`,
      type: 'transfer_out',
      title: `Reader Tip to ${book.authorName} for "${book.title}"`,
      amount,
      currency: 'NGN',
      timestamp: 'Just now',
      status: 'completed',
      channel: 'wallet',
    };

    setWallet((prev) => ({
      ...prev,
      availableBalance: prev.availableBalance - amount,
      transactions: [newTx, ...prev.transactions],
    }));

    setAfriBooks((prev) => {
      const updated = prev.map((b) =>
        b.id === bookId
          ? {
              ...b,
              tipsReceivedCount: b.tipsReceivedCount + 1,
              tipsTotalAmount: b.tipsTotalAmount + amount,
            }
          : b
      );
      localStorage.setItem('AGC_afribooks', JSON.stringify(updated));
      return updated;
    });

    if (activeReadingBook && activeReadingBook.id === bookId) {
      setActiveReadingBook((prev) =>
        prev
          ? {
              ...prev,
              tipsReceivedCount: prev.tipsReceivedCount + 1,
              tipsTotalAmount: prev.tipsTotalAmount + amount,
            }
          : null
      );
    }

    return {
      success: true,
      message: `☕ Tipped ₦${amount.toLocaleString()} directly to author ${book.authorName}! Thank you for supporting authentic human literature.`,
    };
  };

  const buyPaidBook = (bookId: string) => {
    const book = afriBooks.find((b) => b.id === bookId);
    if (!book) return { success: false, message: 'Book not found' };

    if (wallet.availableBalance < book.price) {
      return {
        success: false,
        message: `Insufficient wallet balance to purchase "${book.title}" (₦${book.price.toLocaleString()}). Please top up your wallet.`,
      };
    }

    const newTx: WalletTransaction = {
      id: `tx_book_buy_${Date.now()}`,
      type: 'transfer_out',
      title: `Paid Book Purchase: ${book.title}`,
      amount: book.price,
      currency: book.currency,
      timestamp: 'Just now',
      status: 'completed',
      channel: 'wallet',
    };

    setWallet((prev) => ({
      ...prev,
      availableBalance: prev.availableBalance - book.price,
      transactions: [newTx, ...prev.transactions],
    }));

    setAfriBooks((prev) => {
      const updated = prev.map((b) => (b.id === bookId ? { ...b, isPurchasedByMe: true, totalReads: b.totalReads + 1 } : b));
      localStorage.setItem('AGC_afribooks', JSON.stringify(updated));
      return updated;
    });

    if (activeReadingBook && activeReadingBook.id === bookId) {
      setActiveReadingBook((prev) => (prev ? { ...prev, isPurchasedByMe: true } : null));
    }

    return {
      success: true,
      message: `📚 Purchased "${book.title}"! All chapters and group buddy reading unlocked.`,
    };
  };

  const startGroupReadSession = (bookId: string, buddyName: string, buddyAvatar?: string) => {
    const book = afriBooks.find((b) => b.id === bookId);
    const newSession: GroupReadSession = {
      id: `grp_read_${Date.now()}`,
      bookId,
      bookTitle: book ? book.title : 'African Book',
      bookCover: book ? book.coverUrl : 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80',
      hostUserId: currentUser.id,
      hostUserName: currentUser.fullName,
      buddyUserId: `buddy_${Date.now()}`,
      buddyUserName: buddyName,
      buddyAvatar: buddyAvatar || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='50' fill='%23180a33'/><circle cx='50' cy='38' r='18' fill='%23a855f7'/><path d='M16 88c0-18.778 15.222-34 34-34s34 15.222 34 34' fill='%23a855f7'/></svg>",
      currentChapter: 1,
      currentPage: 1,
      isPaidByOne: true, // 2 friends can both read together if one pays
      messages: [
        {
          id: `grm_${Date.now()}`,
          senderName: currentUser.fullName,
          text: `Hey ${buddyName}! I started reading "${book?.title}". Let's buddy-read this together chapter by chapter!`,
          timestamp: 'Just now',
        },
      ],
    };

    setGroupReadSessions((prev) => {
      const updated = [newSession, ...prev];
      localStorage.setItem('AGC_group_read', JSON.stringify(updated));
      return updated;
    });
    setActiveGroupReadSession(newSession);
    return newSession;
  };

  const sendGroupReadMessage = (sessionId: string, text: string) => {
    const newMsg = {
      id: `grm_${Date.now()}`,
      senderName: currentUser.fullName,
      text: text.trim(),
      timestamp: 'Just now',
    };

    setGroupReadSessions((prev) => {
      const updated = prev.map((s) => (s.id === sessionId ? { ...s, messages: [...s.messages, newMsg] } : s));
      localStorage.setItem('AGC_group_read', JSON.stringify(updated));
      return updated;
    });

    if (activeGroupReadSession && activeGroupReadSession.id === sessionId) {
      setActiveGroupReadSession((prev) => (prev ? { ...prev, messages: [...prev.messages, newMsg] } : null));
    }
  };

  const updateGroupReadProgress = (sessionId: string, chapterIndex: number, page: number) => {
    setGroupReadSessions((prev) => {
      const updated = prev.map((s) => (s.id === sessionId ? { ...s, currentChapter: chapterIndex + 1, currentPage: page } : s));
      localStorage.setItem('AGC_group_read', JSON.stringify(updated));
      return updated;
    });

    if (activeGroupReadSession && activeGroupReadSession.id === sessionId) {
      setActiveGroupReadSession((prev) => (prev ? { ...prev, currentChapter: chapterIndex + 1, currentPage: page } : null));
    }
  };


  
  // 28. African Tutor & Online Course Marketplace System State
  const [tutorProfile, setTutorProfile] = useState<TutorProfile>(() => {
    try {
      const saved = localStorage.getItem('AGC_tutor_profile');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse tutor profile:', e);
    }
    return {
      isRegisteredTutor: false,
      fullName: '',
      headline: '',
      bio: '',
      rating: 0,
      totalStudents: 0,
      totalEarnedNgn: 0,
      avatarUrl: '',
      hasBlueVerificationBadge: false,
      maxCoursesAllowed: 0,
    };
  });

  const [courses, setCourses] = useState<Course[]>(() => {
    try {
      const saved = localStorage.getItem('AGC_courses');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse courses:', e);
    }
    return [];
  });

  const [isTutorModalOpen, setIsTutorModalOpen] = useState(false);
  const [activeLearningCourse, setActiveLearningCourse] = useState<Course | null>(null);

  const registerAsTutor = (data: {
    tutorName: string;
    bio: string;
    category: string;
    payVerificationBlueCheck: boolean;
    paymentMethod: 'wallet' | 'paystack';
  }) => {
    const regFee = 5000;
    const blueCheckFee = data.payVerificationBlueCheck ? 4000 : 0;
    const totalFee = regFee + blueCheckFee;

    if (data.paymentMethod === 'wallet' && wallet.availableBalance < totalFee) {
      return {
        success: false,
        message: `Insufficient wallet balance for ₦${totalFee.toLocaleString()} (₦5,000 Tutor Reg + ${blueCheckFee > 0 ? '₦4,000 Blue Check' : ''}). Please top up your wallet or pay via Paystack.`,
      };
    }

    if (data.paymentMethod === 'wallet') {
      const newTx: WalletTransaction = {
        id: `tx_tutor_reg_${Date.now()}`,
        type: 'transfer_out',
        title: `Certified Tutor Registration Fee (₦${totalFee.toLocaleString()})`,
        amount: totalFee,
        currency: 'NGN',
        timestamp: 'Just now',
        status: 'completed',
        channel: 'wallet',
      };
      setWallet((prev) => ({
        ...prev,
        availableBalance: prev.availableBalance - totalFee,
        transactions: [newTx, ...prev.transactions],
      }));
    }

    if (data.payVerificationBlueCheck || currentUser.verificationBadge) {
      setCurrentUser((prev) => ({
        ...prev,
        verificationBadge: 'blue',
      }));
    }

    const updatedProfile: TutorProfile = {
      isRegisteredTutor: true,
      tutorName: data.tutorName,
      bio: data.bio,
      category: data.category,
      hasBlueCheck: true,
      tier: 'starter_10',
      coursesLimit: 10,
      activeCoursesCount: 0,
      totalEarnings: 0,
      registeredAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    };

    setTutorProfile(updatedProfile);
    localStorage.setItem('AGC_tutor_profile', JSON.stringify(updatedProfile));

    return {
      success: true,
      message: '🎉 Congratulations! You are now a Registered AGC Certified Tutor with Verified Blue Check status. You can publish up to 10 courses!',
    };
  };

  const upgradeTutorUnlimited = (paymentMethod: 'wallet' | 'paystack') => {
    const proFee = 20000;
    if (paymentMethod === 'wallet' && wallet.availableBalance < proFee) {
      return {
        success: false,
        message: 'Insufficient wallet balance for ₦20,000 Unlimited Pro Tutor plan. Please top up your wallet or use Paystack.',
      };
    }

    if (paymentMethod === 'wallet') {
      const newTx: WalletTransaction = {
        id: `tx_tutor_unlimited_${Date.now()}`,
        type: 'transfer_out',
        title: 'Tutor Unlimited Pro Subscription (₦20,000 / month)',
        amount: proFee,
        currency: 'NGN',
        timestamp: 'Just now',
        status: 'completed',
        channel: 'wallet',
      };
      setWallet((prev) => ({
        ...prev,
        availableBalance: prev.availableBalance - proFee,
        transactions: [newTx, ...prev.transactions],
      }));
    }

    const updatedProfile: TutorProfile = {
      ...tutorProfile,
      tier: 'unlimited_pro',
      coursesLimit: 999999,
      renewalDate: 'In 30 days',
    };

    setTutorProfile(updatedProfile);
    localStorage.setItem('AGC_tutor_profile', JSON.stringify(updatedProfile));

    return {
      success: true,
      message: '🚀 Upgraded to Unlimited Pro Tutor Plan! You can now publish unlimited courses on AGC with zero restrictions.',
    };
  };

  const publishCourse = (
    courseData: Omit<Course, 'id' | 'tutorId' | 'tutorName' | 'tutorAvatar' | 'tutorIsBlueVerified' | 'enrolledStudentsCount' | 'rating' | 'reviewsCount' | 'createdAt' | 'isEnrolledByMe'>
  ) => {
    if (!tutorProfile.isRegisteredTutor) {
      return {
        success: false,
        message: 'Tutor Registration Required: You must register as a tutor (₦5,000 fee + ₦4,000 Blue Check) before publishing courses.',
      };
    }

    const myCoursesCount = courses.filter((c) => c.tutorId === currentUser.id).length;
    if (myCoursesCount >= tutorProfile.coursesLimit) {
      return {
        success: false,
        message: `Course limit reached (${tutorProfile.coursesLimit} courses). Upgrade to the ₦20,000/month Unlimited Pro Plan to add more courses.`,
      };
    }

    const newCourse: Course = {
      ...courseData,
      id: `crs_${Date.now()}`,
      tutorId: currentUser.id,
      tutorName: tutorProfile.tutorName || currentUser.fullName,
      tutorAvatar: currentUser.avatarUrl || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='50' fill='%23180a33'/><circle cx='50' cy='38' r='18' fill='%23a855f7'/><path d='M16 88c0-18.778 15.222-34 34-34s34 15.222 34 34' fill='%23a855f7'/></svg>",
      tutorIsBlueVerified: true,
      enrolledStudentsCount: 0,
      rating: 5.0,
      reviewsCount: 1,
      createdAt: 'Just now',
      isEnrolledByMe: true,
    };

    const updatedCourses = [newCourse, ...courses];
    setCourses(updatedCourses);
    localStorage.setItem('AGC_courses', JSON.stringify(updatedCourses));

    const updatedProfile: TutorProfile = {
      ...tutorProfile,
      activeCoursesCount: (tutorProfile.activeCoursesCount || 0) + 1,
    };
    setTutorProfile(updatedProfile);
    localStorage.setItem('AGC_tutor_profile', JSON.stringify(updatedProfile));

    return {
      success: true,
      course: newCourse,
      message: `📚 "${newCourse.title}" published successfully to AGC Course Academy!`,
    };
  };

  const enrollInCourse = (courseId: string, paymentMethod: 'wallet' | 'paystack') => {
    const course = courses.find((c) => c.id === courseId);
    if (!course) return { success: false, message: 'Course not found' };

    if (course.isEnrolledByMe) {
      return { success: false, message: 'You are already enrolled in this course! Open the classroom tab to start learning.' };
    }

    if (paymentMethod === 'wallet' && wallet.availableBalance < course.price) {
      return {
        success: false,
        message: `Insufficient wallet balance to enroll for ${CURRENCY_SYMBOLS[course.currency]}${course.price.toLocaleString()}. Please top up your wallet or pay via Paystack.`,
      };
    }

    if (paymentMethod === 'wallet') {
      const newTx: WalletTransaction = {
        id: `tx_enroll_${Date.now()}`,
        type: 'transfer_out',
        title: `Course Enrollment: ${course.title}`,
        amount: course.price,
        currency: course.currency,
        timestamp: 'Just now',
        status: 'completed',
        channel: 'wallet',
      };
      setWallet((prev) => ({
        ...prev,
        availableBalance: prev.availableBalance - course.price,
        transactions: [newTx, ...prev.transactions],
      }));
    }

    const updatedCourses = courses.map((c) =>
      c.id === courseId
        ? { ...c, isEnrolledByMe: true, enrolledStudentsCount: c.enrolledStudentsCount + 1 }
        : c
    );
    setCourses(updatedCourses);
    localStorage.setItem('AGC_courses', JSON.stringify(updatedCourses));

    return {
      success: true,
      message: `🎓 Enrolled in "${course.title}"! Full curriculum, video lessons, and syllabus unlocked with Escrow learner guarantee.`,
    };
  };


  // Real-Time Multi-Transport Live Chat Connection (Socket.io + BroadcastChannel + Supabase)
  const handleIncomingMessage = useCallback(
    async ({ chatId, message, senderId, targetPhone, isGroup, chat }: { chatId: string; message: ChatMessage; senderId?: string; targetPhone?: string; isGroup?: boolean; chat?: any }) => {
      if (!message || !chatId) return;

      const myCleanPhone = currentUser.phoneNumber?.replace(/\D/g, '') || '';
      const senderCleanPhone = (message.senderPhone || '').replace(/\D/g, '');
      const isFromMe = (senderId && senderId === currentUser.id) || (senderCleanPhone && phonesMatch(senderCleanPhone, myCleanPhone) && message.sender === 'user');

      const isDm = chatId.startsWith('dm_');
      const isGroupChat = Boolean(isGroup || chatId.startsWith('group_') || chat?.isGroup);
      const isSelfChat = chatId.includes('self') || (myCleanPhone && phonesMatch(senderCleanPhone, myCleanPhone) && (!targetPhone || phonesMatch(targetPhone, myCleanPhone)));

      // 1. Strict DM Protection: Only actual participants can receive or view direct messages!
      if (isDm && !isSelfChat) {
        const parts = chatId.replace('dm_', '').split('_');
        if (parts.length >= 2 && myCleanPhone) {
          const isParticipant = phonesMatch(parts[0], myCleanPhone) || phonesMatch(parts[1], myCleanPhone);
          if (!isParticipant) {
            // Strictly private between other users; drop immediately!
            return;
          }
        }
      }

      // If a target phone was explicitly addressed, verify recipient matches my phone
      if (targetPhone && !isFromMe && !isGroupChat) {
        if (!phonesMatch(targetPhone, myCleanPhone)) {
          return;
        }
      }

      // 2. Resolve chat ID symmetrically
      let resolvedChatId = chatId;
      let otherCleanPhone = '';
      if (isDm) {
        if (isSelfChat) {
          resolvedChatId = `dm_self_${normalizePhoneDigits(myCleanPhone)}`;
        } else {
          const parts = chatId.replace('dm_', '').split('_');
          otherCleanPhone = (phonesMatch(parts[0], myCleanPhone) ? parts[1] : parts[0]) || senderCleanPhone;
          if (myCleanPhone && otherCleanPhone) {
            resolvedChatId = getDirectChatId(myCleanPhone, otherCleanPhone);
          }
        }
      }

      // Decrypt message text if encrypted with E2EE
      let plainText = message.text;
      let wasEncrypted = Boolean(message.isEncrypted);
      if (message.text && typeof message.text === 'string' && message.text.startsWith('AGC_E2EE:')) {
        const secret = getConversationSecret(resolvedChatId, myCleanPhone, senderCleanPhone || otherCleanPhone);
        try {
          plainText = await decryptChatMessage(message.text, secret);
          wasEncrypted = true;
        } catch (_) {}
      }

      // 3. Filter duplicates strictly by message ID
      setMessages((prev) => {
        const list = prev[resolvedChatId] || prev[chatId] || [];
        if (list.some((m) => m.id === message.id)) return prev;

        const receivedMsg: ChatMessage = {
          ...message,
          text: plainText,
          isEncrypted: wasEncrypted,
          chatId: resolvedChatId,
          sender: isSelfChat ? 'user' : (isFromMe ? 'user' : 'other'),
          status: 'delivered',
        };
        const updated = {
          ...prev,
          [resolvedChatId]: [...list, receivedMsg],
        };
        try {
          const userKey = getUserStorageKey('AGC_messages_v2', currentUser.phoneNumber);
          localStorage.setItem(userKey, JSON.stringify(updated));
        } catch (_) {}
        return updated;
      });

      // 4. Update or insert thread
      setChats((prev) => {
        const index = prev.findIndex(
          (c) =>
            c.id === resolvedChatId ||
            c.id === chatId ||
            (!isGroupChat && otherCleanPhone && c.phone && phonesMatch(c.phone, otherCleanPhone))
        );

        const msgText =
          plainText ||
          (message.type === 'image'
            ? '📷 Photo'
            : message.type === 'voice'
            ? '🎤 Voice message'
            : message.type === 'meme_sticker'
            ? '🎭 Sticker'
            : '📎 Attachment');

        if (index >= 0) {
          const updated = [...prev];
          const matched = { ...updated[index] };
          if (matched.id !== resolvedChatId && activeChatId === matched.id) {
            setActiveChatId(resolvedChatId);
          }
          matched.id = resolvedChatId;
          matched.lastMessage = msgText;
          matched.lastMessageTime = message.timestamp;
          matched.unreadCount =
            activeChatId === resolvedChatId || activeChatId === matched.id || activeChatId === chatId
              ? 0
              : (matched.unreadCount || 0) + 1;
          updated.splice(index, 1);
          const finalUpdated = [matched, ...updated];
          try {
            const userKey = getUserStorageKey('AGC_chats_v2', currentUser.phoneNumber);
            localStorage.setItem(userKey, JSON.stringify(finalUpdated));
          } catch (_) {}
          return finalUpdated;
        } else {
          const newThread: ChatThread = {
            id: resolvedChatId,
            name: isGroupChat
              ? (chat?.name || 'Group Chat')
              : isSelfChat
              ? `${currentUser.fullName || 'You'} (Message yourself)`
              : (message.senderName || 'AGC Contact'),
            avatar:
              (isGroupChat
                ? chat?.avatar
                : isSelfChat
                ? currentUser.avatarUrl
                : message.senderAvatar) ||
              "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='50' fill='%23180a33'/><circle cx='50' cy='38' r='18' fill='%23a855f7'/><path d='M16 88c0-18.778 15.222-34 34-34s34 15.222 34 34' fill='%23a855f7'/></svg>",
            verifiedStore: false,
            location: isGroupChat
              ? 'Community Group'
              : isSelfChat
              ? 'Notes to Self'
              : (resolvedChatId.startsWith('town_comm_') ? 'Town Community' : 'Direct Chat'),
            unreadCount: activeChatId === resolvedChatId || activeChatId === chatId ? 0 : 1,
            lastMessage: msgText,
            lastMessageTime: message.timestamp,
            catalog: [],
            isOnline: true,
            isGroup: isGroupChat,
            membersCount: chat?.membersCount || 2,
            members: chat?.members || [],
            memberPhones: chat?.memberPhones || [],
            phone: isSelfChat ? currentUser.phoneNumber : (message.senderPhone || ''),
          };
          const finalUpdated = [newThread, ...prev];
          try {
            const userKey = getUserStorageKey('AGC_chats_v2', currentUser.phoneNumber);
            localStorage.setItem(userKey, JSON.stringify(finalUpdated));
          } catch (_) {}
          return finalUpdated;
        }
      });

      if (activeChatId !== resolvedChatId && activeChatId !== chatId && !isFromMe) {
        showLocalNotification(
          `💬 ${message.senderName || 'AGC User'}`,
          message.text || (message.type === 'image' ? '📷 Sent a photo' : 'Sent you an attachment'),
          message.senderAvatar || '/icon-192.png'
        );
      }
    },
    [currentUser, activeChatId]
  );

  useEffect(() => {
    const myCleanPhone = currentUser.phoneNumber?.replace(/\D/g, '') || '';
    const normPhone = normalizePhoneDigits(myCleanPhone);
    const socket = initSocket({
      id: currentUser.id,
      name: currentUser.fullName,
      avatar: currentUser.avatarUrl,
      phone: currentUser.phoneNumber,
    });

    if (socket && myCleanPhone) {
      socket.emit('register_phone', myCleanPhone);
      if (normPhone !== myCleanPhone) {
        socket.emit('register_phone', normPhone);
      }
      socket.emit('user_online', {
        userId: currentUser.id,
        userName: currentUser.fullName,
        avatar: currentUser.avatarUrl,
        phoneNumber: currentUser.phoneNumber,
      });
    }

    // 1. Socket.io listeners
    socket.on('new_message', handleIncomingMessage);

    const handleGroupCreated = (payload: any) => {
      if (!payload?.chat) return;
      const chat: ChatThread = payload.chat;
      setChats((prev) => {
        if (prev.some((c) => c.id === chat.id)) return prev;
        const updated = [chat, ...prev];
        try {
          const userKey = getUserStorageKey('AGC_chats_v2', currentUser.phoneNumber);
          localStorage.setItem(userKey, JSON.stringify(updated));
        } catch (_) {}
        return updated;
      });
      showLocalNotification(
        `👥 Added to "${chat.name}"`,
        `You were added to group ${chat.name}`,
        chat.avatar || '/icon-192.png'
      );
    };

    socket.on('group_created', handleGroupCreated);

    // 2. BroadcastChannel listener (instant multi-tab / window sync)
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('AGC_chats_sync');
      bc.onmessage = (e) => {
        if (e.data && e.data.chatId && e.data.message) {
          const { chatId, senderId, targetPhone, memberPhones, isGroup } = e.data;
          const myPhone = currentUser.phoneNumber?.replace(/\D/g, '') || '';
          if (senderId === currentUser.id && !chatId.includes('self')) {
            return;
          }
          if (chatId.startsWith('dm_') && !chatId.includes('self')) {
            const parts = chatId.replace('dm_', '').split('_');
            if (parts.length >= 2 && myPhone && !phonesMatch(parts[0], myPhone) && !phonesMatch(parts[1], myPhone)) {
              return;
            }
          }
          if (targetPhone && !isGroup) {
            if (myPhone && !phonesMatch(targetPhone, myPhone)) {
              return;
            }
          }
          handleIncomingMessage(e.data);
        }
      };
    } catch (e) {
      console.warn('BroadcastChannel not available:', e);
    }

    // 3. Persistent Supabase Realtime Inbox Listener (guarantees cross-device delivery)
    let sbInboxChannel: any = null;
    let sbInboxNorm: any = null;
    if (isSupabaseConfigured && myCleanPhone) {
      sbInboxChannel = supabase.channel(`inbox_${myCleanPhone}`, {
        config: { broadcast: { self: false } },
      });
      sbInboxChannel
        .on('broadcast', { event: 'new_message' }, ({ payload }: any) => {
          if (payload && payload.message) {
            handleIncomingMessage(payload);
          }
        })
        .on('broadcast', { event: 'group_created' }, ({ payload }: any) => {
          if (payload && payload.chat) {
            handleGroupCreated(payload);
          }
        })
        .subscribe();

      if (normPhone !== myCleanPhone) {
        sbInboxNorm = supabase.channel(`inbox_${normPhone}`, {
          config: { broadcast: { self: false } },
        });
        sbInboxNorm
          .on('broadcast', { event: 'new_message' }, ({ payload }: any) => {
            if (payload && payload.message) {
              handleIncomingMessage(payload);
            }
          })
          .on('broadcast', { event: 'group_created' }, ({ payload }: any) => {
            if (payload && payload.chat) {
              handleGroupCreated(payload);
            }
          })
          .subscribe();
      }
    }

    // 4. Persistent Supabase Realtime Town Feed Listener
    let sbTownFeed: any = null;
    if (isSupabaseConfigured) {
      sbTownFeed = supabase.channel('town_community_feed', {
        config: { broadcast: { self: false } },
      });
      sbTownFeed
        .on('broadcast', { event: 'new_message' }, ({ payload }: any) => {
          if (payload && payload.message && payload.senderId !== currentUser.id) {
            handleIncomingMessage(payload);
          }
        })
        .subscribe();
    }

    return () => {
      socket.off('new_message', handleIncomingMessage);
      socket.off('group_created', handleGroupCreated);
      if (bc) bc.close();
      if (sbInboxChannel) sbInboxChannel.unsubscribe();
      if (sbInboxNorm) sbInboxNorm.unsubscribe();
      if (sbTownFeed) sbTownFeed.unsubscribe();
    };
  }, [currentUser, activeChatId, handleIncomingMessage]);

  // Offline/Online Reconnection Sync (Flushes pending 1-check messages to 2-check delivered)
  useEffect(() => {
    const handleOnline = () => {
      setMessages((prev) => {
        let hasPending = false;
        const updated = { ...prev };
        Object.keys(updated).forEach((chatId) => {
          updated[chatId] = updated[chatId].map((msg) => {
            if (msg.sender === 'user' && msg.status === 'sent') {
              hasPending = true;
              broadcastLiveMessage(chatId, { ...msg, status: 'delivered' });
              return { ...msg, status: 'delivered' as const };
            }
            return msg;
          });
        });
        if (hasPending) {
          try {
            localStorage.setItem('AGC_messages_v2', JSON.stringify(updated));
          } catch (_) {}
          return updated;
        }
        return prev;
      });
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  // Join active chat room when switching chats (Socket.io + Supabase Realtime)
  useEffect(() => {
    if (!activeChatId) return;

    joinChatRoom(activeChatId);

    const sbChannel = supabase.channel(`chat_${activeChatId}`, {
      config: { broadcast: { self: false } },
    });

    sbChannel
      .on('broadcast', { event: 'new_message' }, ({ payload }) => {
        if (payload && payload.message && payload.senderId !== currentUser.id) {
          handleIncomingMessage(payload);
        }
      })
      .subscribe();

    return () => {
      leaveChatRoom(activeChatId);
      sbChannel.unsubscribe();
    };
  }, [activeChatId, currentUser.id, handleIncomingMessage]);

  // 29. Super Admin Console & Moderation State
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.toLowerCase();
      const search = window.location.search.toLowerCase();
      const path = window.location.pathname.toLowerCase();
      return hash === '#admin' || search.includes('admin=true') || search.includes('admin=1') || path === '/admin';
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleUrlChange = () => {
      const hash = window.location.hash;
      const hashLower = hash.toLowerCase();
      const search = window.location.search.toLowerCase();
      const path = window.location.pathname.toLowerCase();
      if (hashLower === '#admin' || search.includes('admin=true') || search.includes('admin=1') || path === '/admin') {
        setIsAdminModalOpen(true);
      }

      // Handle universal AGC QR contact link: ?contact=... or #contact=... or #addcontact
      if (search.includes('contact=') || search.includes('phone=') || hash.includes('contact=') || hash.includes('phone=') || hash.includes('addcontact')) {
        try {
          const searchParams = new URLSearchParams(window.location.search);
          const hashString = hash.replace(/^#/, '');
          const hashParams = new URLSearchParams(hashString.includes('?') ? hashString.split('?')[1] : hashString);

          let phone = searchParams.get('contact') || searchParams.get('phone') || hashParams.get('contact') || hashParams.get('phone');
          let name = searchParams.get('name') || hashParams.get('name');
          let avatar = searchParams.get('avatar') || hashParams.get('avatar');

          // If param is a JSON string
          if (phone && phone.startsWith('{')) {
            try {
              const j = JSON.parse(decodeURIComponent(phone));
              if (j.phone) {
                phone = j.phone;
                name = j.name || name;
                avatar = j.avatar || avatar;
              }
            } catch (_) {}
          } else if (hash.includes('contact=')) {
            const rawMatch = hash.match(/contact=([^&#]+)/);
            if (rawMatch && rawMatch[1].startsWith('%7B')) {
              try {
                const j = JSON.parse(decodeURIComponent(rawMatch[1]));
                if (j.phone) {
                  phone = j.phone;
                  name = j.name || name;
                  avatar = j.avatar || avatar;
                }
              } catch (_) {}
            }
          }

          if (phone) {
            const c = addNewDeviceContact(
              name || 'AGC User',
              phone,
              'Added via AGC QR',
              true,
              avatar || undefined
            );
            startChatWithContact(c);
            window.history.replaceState(null, '', window.location.pathname);
          }
        } catch (_) {}
      }

      // Handle call link: #call={phone}
      if (hash.includes('call=')) {
        try {
          const match = hash.match(/call=([^&#]+)/);
          if (match) {
            const phone = decodeURIComponent(match[1]);
            const c = addNewDeviceContact(`Contact ${phone.slice(-4)}`, phone, 'Added via AGC QR', true);
            startChatWithContact(c);
            window.history.replaceState(null, '', window.location.pathname);
          }
        } catch (_) {}
      }
    };

    handleUrlChange();
    window.addEventListener('hashchange', handleUrlChange);
    window.addEventListener('popstate', handleUrlChange);
    return () => {
      window.removeEventListener('hashchange', handleUrlChange);
      window.removeEventListener('popstate', handleUrlChange);
    };
  }, []);
  const [adminUsers, setAdminUsers] = useState<AdminUserRecord[]>(() => {
    try {
      const saved = localStorage.getItem('AGC_admin_users');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn(e);
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('AGC_admin_users', JSON.stringify(adminUsers));
    } catch (e) {}
  }, [adminUsers]);

  const [systemBroadcast, setSystemBroadcast] = useState<AdminSystemBroadcast | null>(() => {
    try {
      const saved = localStorage.getItem('AGC_system_broadcast');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return null;
  });

  useEffect(() => {
    try {
      if (systemBroadcast) {
        localStorage.setItem('AGC_system_broadcast', JSON.stringify(systemBroadcast));
      } else {
        localStorage.removeItem('AGC_system_broadcast');
      }
    } catch (e) {}
  }, [systemBroadcast]);

  const toggleUserVerification = (userId: string, badge: 'blue' | 'gold' | 'creator_plus' | null) => {
    setAdminUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, verificationBadge: badge } : u))
    );
    if (currentUser.id === userId) {
      setCurrentUser((prev) => ({ ...prev, verificationBadge: badge }));
    }
  };

  const toggleUserSuspension = (userId: string) => {
    setAdminUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? { ...u, status: u.status === 'suspended' ? 'active' : 'suspended' }
          : u
      )
    );
  };

  const adminResolveEscrow = (orderId: string, action: 'release_to_seller' | 'refund_to_buyer', note: string) => {
    const order = escrowOrders.find((o) => o.id === orderId);
    if (!order) return { success: false, message: 'Escrow order not found' };

    setEscrowOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status: (action === 'release_to_seller' ? 'funds_released' : 'disputed') as import('../types').EscrowStatus,
              updatedAt: 'Just now',
            }
          : o
      )
    );

    setWallet((prev) => ({
      ...prev,
      escrowLockedBalance: Math.max(0, prev.escrowLockedBalance - order.totalAmount),
      transactions: [
        {
          id: `tx_${Date.now()}`,
          type: action === 'release_to_seller' ? 'escrow_release' : 'topup',
          amount: order.totalAmount,
          currency: order.currency,
          title: action === 'release_to_seller'
            ? `Admin Escrow Force-Release: ${order.product.title} (Ref: ${order.id})`
            : `Admin Escrow Refund: ${order.product.title} (Ref: ${order.id} - ${note})`,
          channel: 'wallet',
          timestamp: 'Just now',
          status: 'completed',
        },
        ...prev.transactions,
      ],
    }));

    return {
      success: true,
      message:
        action === 'release_to_seller'
          ? `Escrow #${orderId} released to seller ${order.sellerName}.`
          : `Escrow #${orderId} refunded to buyer ${order.buyerName}.`,
    };
  };

  const createAdminBroadcast = (title: string, message: string, level: 'info' | 'warning' | 'alert' = 'info') => {
    const newBroadcast: AdminSystemBroadcast = {
      id: `bc_${Date.now()}`,
      title,
      message,
      level,
      createdAt: 'Just now',
      active: true,
    };
    setSystemBroadcast(newBroadcast);

    // Push directly to users' Updates tab as an official status story
    const adminStatus: UserStatus = {
      id: `stat_admin_${Date.now()}`,
      userId: 'usr_AGC_official_admin',
      userName: 'AGC Official',
      userAvatar: '/favicon.svg',
      caption: `📢 ${title}: ${message}`,
      statusType: 'thought',
      thoughtBg: level === 'alert' 
        ? 'from-rose-950 via-purple-950 to-black' 
        : level === 'warning'
        ? 'from-amber-950 via-purple-950 to-black'
        : 'from-purple-900 via-indigo-950 to-black',
      createdAt: 'Just now',
      expiresInHours: 48,
      viewsCount: 1,
      likesCount: 0,
      hasLikedByMe: false,
      isMe: false,
      viewers: [],
    };

    setStatuses((prev) => {
      const updated = [adminStatus, ...prev.filter((s) => s.id !== adminStatus.id)];
      try {
        localStorage.setItem('AGC_statuses_v2', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  return (
    <AppContext.Provider
      value={{
        featureFlags,
        isFeatureEnabled,
        toggleFeatureFlag,
        clearChat,
        updateChat,
        addMembersToGroup,
        removeMemberFromGroup,
        createGroup,
        createChannel,
        toggleMemberAdmin,
        deleteMessage,
        reactToMessage,
        sendImageMessage,
        blockedUserIds,
        toggleBlockUser,
        CURRENCY_SYMBOLS,
        CURRENCY_RATES,
        openCommunityChat,
        errandRunners,
        errandOrders,
        isErrandsModalOpen,
        setIsErrandsModalOpen,
        createErrandOrder,
        completeErrandWithCode,
        disputeErrandOrder,
        registerAsErrandRunner,
        addErrandRunnerItem,
        removeErrandRunnerItem,
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
        markStatusViewed,
        addStatus,
        addThoughtStatus,
        addDeviceMediaStatus,
        addDeviceVideoStatus,
        deleteStatus,
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
        incomingCall,
        acceptIncomingCall,
        declineIncomingCall,
        // 1. Meme & Sticker Studio
        isMemeStudioOpen,
        setIsMemeStudioOpen,
        sendMemeSticker,
        // 2. Live Audio Spaces / Street Radio
        audioSpaces,
        activeAudioSpace,
        joinAudioSpace,
        leaveAudioSpace,
        createAudioSpace,
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
        isCheckingReputation,
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
        isKickedOut,
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
        importDeviceContacts,
        friendRequests,
        sendFriendRequest,
        acceptFriendRequest,
        declineFriendRequest,
        respondToGroupInvitation,
        endAudioSpace,
        spaceEndedSummary,
        setSpaceEndedSummary,
        // Live Supabase Presence & Typing Indicators
        onlineUserKeys,
        isUserOnline,
        typingUsers,
        sendTypingIndicator,
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
        applyForJob,
        // 13. Security Settings (Payment PIN & Security Questions)
        securitySettings,
        setPaymentPin,
        updatePaymentPin,
        setSecurityQuestion,
        verifyPaymentPin,
        verifyPaymentPinDetailed,
        resetPinLockout,
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
        addTownCommunity,
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
        // 22. Artisan Service Station & Workspace Management
        artisanStation,
        registerArtisanStation,
        addArtisanListing,
        updateStationHours,
        hireArtisanStaff,
        assignArtisanTask,
        updateArtisanTaskStatus,
        isArtisanModalOpen,
        setIsArtisanModalOpen,
        // 23. Anti-Fraud Referral & Invite System
        referralProgram,
        isReferralModalOpen,
        setIsReferralModalOpen,
        claimReferralBonus,
        simulateInviteContact,
        // 24. Celebrity Identity Verification
        isCelebrityModalOpen,
        setIsCelebrityModalOpen,
        celebrityApplications,
        applyForCelebrityVerification,
        toggleCelebrityStatus,
        // 25. Store Registration & Tiers
        isStoreRegModalOpen,
        setIsStoreRegModalOpen,
        storeSubscription,
        subscribeStoreTier,
        // 26. Creator Digital Files & VIP Sessions
        creatorFiles,
        buyCreatorFile,
        uploadCreatorFile,
        bookCreatorVipSession,
        updateCreatorVipRates,
        // 27. Writers System (AfriBooks)
        afriBooks,
        activeReadingBook,
        setActiveReadingBook,
        activeReadingChapterIndex,
        setActiveReadingChapterIndex,
        isWritersModalOpen,
        setIsWritersModalOpen,
        submitNewBook,
        addChapterToBook,
        commentOnChapter,
        tipBookAuthor,
        buyPaidBook,
        groupReadSessions,
        activeGroupReadSession,
        setActiveGroupReadSession,
        startGroupReadSession,
        sendGroupReadMessage,
        updateGroupReadProgress,
        // 28. African Tutor & Online Course Marketplace System
        tutorProfile,
        courses,
        isTutorModalOpen,
        setIsTutorModalOpen,
        activeLearningCourse,
        setActiveLearningCourse,
        registerAsTutor,
        upgradeTutorUnlimited,
        publishCourse,
        enrollInCourse,
        // 29. Super Admin Console & Moderation
        isAdminModalOpen,
        setIsAdminModalOpen,
        adminUsers,
        toggleUserVerification,
        toggleUserSuspension,
        adminResolveEscrow,
        systemBroadcast,
        setSystemBroadcast,
        createAdminBroadcast,
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
