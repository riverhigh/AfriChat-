import {
  ChatThread,
  ChatMessage,
  Product,
  CallLogItem,
  UserStatus,
  LanguageCode,
  MemeSticker,
  AudioSpace,
  ScamEntity,
  AjoGroup,
  FinancialPoll,
  UserProfile,
  DeviceContact,
  UserUploadedMeme,
  DispatchDeliveryOrder,
  JobPosting,
  ServiceProvider,
  ServiceBooking,
  DelayedTransfer,
  PayrollEmployee,
  PayrollRunLog,
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
  ReferralProgram,
  StoreSubscription,
  CreatorDigitalFile,
  AfriBook,
  GroupReadSession,
  Course,
  TutorProfile,
} from '../types';

export const LOCALIZED_STRINGS: Record<LanguageCode, Record<string, string>> = {
  en: {
    appName: 'AGC',
    chats: 'Chats',
    status: 'Status',
    market: 'Stores',
    calls: 'Calls',
    settings: 'Settings',
    searchPlaceholder: 'Search chats, contacts, or stores...',
    online: 'online',
    lastSeen: 'last seen today at',
    lowDataMode: 'Low Data Mode',
    voiceNote: 'Voice message',
    transcription: 'Transcript',
    translate: 'Translate',
    addToCart: 'Add to cart',
    buyWithEscrow: 'Pay with Escrow',
    inStock: 'In Stock',
    storeCatalog: 'Catalog',
    escrowBadge: 'Escrow Protected: Payment released only after delivery confirmation',
    releaseFunds: 'Confirm Delivery & Release Payment',
    fundsSecured: 'Payment secured in Escrow',
    deliveryCode: 'Delivery Confirmation PIN',
    payWith: 'Pay with',
    momo: 'Mobile Money (M-Pesa / MoMo)',
    ussd: 'USSD Bank Transfer',
    card: 'Debit Card',
    typeMessage: 'Message',
    myStatus: 'My Status',
    tapToAddStatus: 'Tap to add status update',
    recentUpdates: 'Recent updates',
    viewedUpdates: 'Viewed updates',
    expiresIn: 'Expires in',
    statusViews: 'Views',
    statusLikes: 'Likes',
  },
  pcm: {
    appName: 'AGC',
    chats: 'Chats',
    status: 'Status',
    market: 'Stores',
    calls: 'Calls',
    settings: 'Settings',
    searchPlaceholder: 'Find chat, store or person...',
    online: 'dey online',
    lastSeen: 'last seen today at',
    lowDataMode: 'Save Data Mode',
    voiceNote: 'Voice note',
    transcription: 'Wetin person tok',
    translate: 'Translate',
    addToCart: 'Put for bag',
    buyWithEscrow: 'Pay with Escrow Lock',
    inStock: 'E dey ground',
    storeCatalog: 'Catalog',
    escrowBadge: 'Escrow Guarantee: Your moni dey secure till you hold market',
    releaseFunds: 'I don receive am, release payment',
    fundsSecured: 'Moni dey secure for Escrow',
    deliveryCode: 'Delivery PIN code',
    payWith: 'Pay with',
    momo: 'Mobile Money (MoMo / M-Pesa)',
    ussd: 'USSD Code Dial',
    card: 'ATM Card',
    typeMessage: 'Type message...',
    myStatus: 'My Status',
    tapToAddStatus: 'Tap put new status yarn',
    recentUpdates: 'Fresh updates',
    viewedUpdates: 'Updates wey you don see',
    expiresIn: 'E go disappear in',
    statusViews: 'People wey view',
    statusLikes: 'People wey like',
  },
  sw: {
    appName: 'AGC',
    chats: 'Soga',
    status: 'Hali',
    market: 'Maduka',
    calls: 'Simu',
    settings: 'Mipangilio',
    searchPlaceholder: 'Tafuta mazungumzo au duka...',
    online: 'yuko mtandaoni',
    lastSeen: 'mara ya mwisho leo saa',
    lowDataMode: 'Hifadhi Data',
    voiceNote: 'Ujumbe wa sauti',
    transcription: 'Nakala ya sauti',
    translate: 'Tafsiri',
    addToCart: 'Weka mfukoni',
    buyWithEscrow: 'Nunua kwa Escrow',
    inStock: 'Ipo tayari',
    storeCatalog: 'Katalogi',
    escrowBadge: 'Ulinzi wa Escrow: Pesa ziko salama hadi upokee mzigo',
    releaseFunds: 'Thibitisha Upokeaji & Toa Pesa',
    fundsSecured: 'Pesa zimelindwa kwa Escrow',
    deliveryCode: 'PIN ya Upokeaji',
    payWith: 'Lipa kwa',
    momo: 'M-Pesa / MoMo',
    ussd: 'Nambari ya USSD',
    card: 'Kadi ya Benki',
    typeMessage: 'Ujumbe...',
    myStatus: 'Hali Yangu',
    tapToAddStatus: 'Gusa ili kuongeza hali',
    recentUpdates: 'Sasisho za hivi karibuni',
    viewedUpdates: 'Sasisho zilizotazamwa',
    expiresIn: 'Inakwisha baada ya',
    statusViews: 'Watazamaji',
    statusLikes: 'Waliopenda',
  },
  yo: {
    appName: 'AGC',
    chats: 'Ọ̀rọ̀',
    status: 'Ipo Mi',
    market: 'Àwọn Ìtajà',
    calls: 'Ìpè',
    settings: 'Ètò',
    searchPlaceholder: 'Wá ọ̀rọ̀ tàbí olùtajà...',
    online: 'wà lórí ayélujára',
    lastSeen: 'a rí i kẹ́yìn lónìí ní',
    lowDataMode: 'Fipamọ́ Data',
    voiceNote: 'Ohùn',
    transcription: 'Àkọsílẹ̀',
    translate: 'Túmọ̀ sí',
    addToCart: 'Fi kún àpò',
    buyWithEscrow: 'Rà pẹ̀lú Escrow',
    inStock: 'Ó wà nílẹ̀',
    storeCatalog: 'Àtòjọ Ọjà',
    escrowBadge: 'Ààbò Escrow: Owó rẹ wà ní ààbò títí tí o fi rí ọjà gbà',
    releaseFunds: 'Mo ti gba ọjà, tú owó',
    fundsSecured: 'Owó wà ní ààbò Escrow',
    deliveryCode: 'Kóòdù Ìfiranṣẹ́',
    payWith: 'Sanwo pẹ̀lú',
    momo: 'Mobile Money',
    ussd: 'Kóòdù USSD',
    card: 'Káàdì Bank',
    typeMessage: 'Kọ ọ̀rọ̀...',
    myStatus: 'Ipo Mi',
    tapToAddStatus: 'Fikun ipo rẹ',
    recentUpdates: 'Àwọn ìròyìn tuntun',
    viewedUpdates: 'Àwọn tí a ti wò',
    expiresIn: 'Yóò parẹ́ ní',
    statusViews: 'Àwọn tó wò ó',
    statusLikes: 'Àwọn tó fẹ́ràn rẹ̀',
  },
  ha: {
    appName: 'AGC',
    chats: 'Hira',
    status: 'Hali',
    market: 'Shaguna',
    calls: 'Kira',
    settings: 'Saituna',
    searchPlaceholder: 'Nemi hira ko shago...',
    online: 'yana kan layi',
    lastSeen: 'gani na karshe a yau',
    lowDataMode: 'Tattalin Data',
    voiceNote: 'Sakon murya',
    transcription: 'Rubutun murya',
    translate: 'Fassara zuwa',
    addToCart: 'Saka a kwando',
    buyWithEscrow: 'Saya da Escrow',
    inStock: 'Akwai shi',
    storeCatalog: 'Jerin Kaya',
    escrowBadge: 'Kariyar Escrow: Kudinku na tsare har sai kun karbi kaya',
    releaseFunds: 'Na karbi kaya, saki kudi',
    fundsSecured: 'Kudi suna kulle a Escrow',
    deliveryCode: 'Lambar Tabbatarwa',
    payWith: 'Biya ta',
    momo: 'Mobile Money',
    ussd: 'USSD Code',
    card: 'Katin Banki',
    typeMessage: 'Rubuta sako...',
    myStatus: 'Matsayina',
    tapToAddStatus: 'Sanya sabon matsayi',
    recentUpdates: 'Sabbin labarai',
    viewedUpdates: 'Wadanda aka gani',
    expiresIn: 'Zai kare a cikin',
    statusViews: 'Masu kallo',
    statusLikes: 'Masu so',
  },
  fr: {
    appName: 'AGC',
    chats: 'Discussions',
    status: 'Statuts',
    market: 'Boutiques',
    calls: 'Appels',
    settings: 'Paramètres',
    searchPlaceholder: 'Rechercher une discussion ou boutique...',
    online: 'en ligne',
    lastSeen: 'vu aujourd’hui à',
    lowDataMode: 'Éco données',
    voiceNote: 'Message vocal',
    transcription: 'Transcription',
    translate: 'Traduire',
    addToCart: 'Ajouter au panier',
    buyWithEscrow: 'Payer avec Escrow',
    inStock: 'En stock',
    storeCatalog: 'Catalogue',
    escrowBadge: 'Protection Escrow: Fonds bloqués jusqu’à confirmation',
    releaseFunds: 'Confirmer livraison & libérer les fonds',
    fundsSecured: 'Fonds sécurisés sous Escrow',
    deliveryCode: 'Code secret de livraison',
    payWith: 'Payer avec',
    momo: 'Mobile Money',
    ussd: 'Code USSD',
    card: 'Carte bancaire',
    typeMessage: 'Message...',
    myStatus: 'Mon Statut',
    tapToAddStatus: 'Appuyez pour ajouter un statut',
    recentUpdates: 'Mises à jour récentes',
    viewedUpdates: 'Mises à jour vues',
    expiresIn: 'Expire dans',
    statusViews: 'Vues',
    statusLikes: 'J’aime',
  },
};

// ── PURGED LIVE DEFAULTS (NO HARDCODED MOCKS) ───────────────────────────────

export const MOCK_PRODUCTS: Product[] = [];

export const MOCK_STATUSES: UserStatus[] = [];

export const MOCK_MEME_TEMPLATES: MemeSticker[] = [];

export const MOCK_AUDIO_SPACES: AudioSpace[] = [];

export const MOCK_SCAM_DATABASE: Record<string, ScamEntity> = {};

export const MOCK_AJO_BALOGUN: AjoGroup = {
  id: '',
  name: '',
  description: '',
  cycleContributionAmount: 0,
  currency: 'NGN',
  frequency: 'monthly',
  totalRounds: 0,
  currentRound: 0,
  nextPayoutDate: '',
  currentRecipientName: '',
  totalPoolPerRound: 0,
  members: [],
  rules: '',
};

export const MOCK_FINANCIAL_POLL_SAMPLE: FinancialPoll = {
  id: '',
  title: '',
  creatorName: '',
  stakePerVote: 0,
  currency: 'NGN',
  options: [],
  totalStakeLocked: 0,
  totalVoters: 0,
  status: 'active',
  payoutRule: '',
};

export const MOCK_CHATS: ChatThread[] = [];

export const INITIAL_MESSAGES: Record<string, ChatMessage[]> = {};

export const MOCK_CALLS: CallLogItem[] = [];

export const INITIAL_CURRENT_USER: UserProfile = {
  id: '',
  phoneNumber: '',
  fullName: 'AGC User',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
  about: 'Available · Using AGC',
  createdAt: new Date().toISOString(),
  lastSeen: 'online',
  isPhoneVerified: false,
};

export const MOCK_DEVICE_CONTACTS: DeviceContact[] = [];

export const INITIAL_USER_MEMES: UserUploadedMeme[] = [];

export const MOCK_DISPATCH_ORDERS: DispatchDeliveryOrder[] = [];

export const MOCK_JOB_POSTINGS: JobPosting[] = [];

export const MOCK_SERVICE_PROVIDERS: ServiceProvider[] = [];

export const MOCK_SERVICE_BOOKINGS: ServiceBooking[] = [];

export const MOCK_DELAYED_TRANSFERS: DelayedTransfer[] = [];

export const MOCK_PAYROLL_EMPLOYEES: PayrollEmployee[] = [];

export const MOCK_PAYROLL_LOGS: PayrollRunLog[] = [];

export const MOCK_TOWN_COMMUNITIES: TownCommunity[] = [];

export const MOCK_DOCTORS: DoctorProfile[] = [];

export const MOCK_QUEUE_TOKENS: HospitalQueueToken[] = [];

export const MOCK_MEDICATION_REMINDERS: MedicationReminder[] = [];

export const MOCK_HEALTH_VAULT: HealthVaultRecord = {
  bloodGroup: 'O+',
  genotype: 'AA',
  allergies: [],
  chronicConditions: [],
  emergencyContactName: '',
  emergencyContactPhone: '',
  emergencyNotes: '',
  qrCodeId: '',
  lastUpdated: '',
};

export const MOCK_LAWYERS: LawyerProfile[] = [];

export const MOCK_CONTRACT_TEMPLATES: LegalContractTemplate[] = [];

export const MOCK_GENERATED_CONTRACTS: GeneratedLegalContract[] = [];

export const MOCK_CREATORS: CreatorProfile[] = [];

export const MOCK_CREATOR_POSTS: CreatorPost[] = [];

export const MOCK_CREATOR_SHOWS: CreatorShowTicket[] = [];

export const MOCK_CREATOR_SONGS: CreatorSong[] = [];

export const MOCK_ARTISAN_STATION: ArtisanStation = {
  id: '',
  ownerId: '',
  ownerName: '',
  ownerPhone: '',
  stationName: '',
  category: 'mechanic',
  categoryLabel: '',
  location: '',
  workshopAddress: '',
  about: '',
  avatar: '',
  isApproved: false,
  registrationFeePaid: false,
  registrationFeeAmount: 0,
  registrationPaymentMethod: 'wallet',
  registeredAt: '',
  operatingHours: {
    days: [],
    startTime: '',
    endTime: '',
    breakTime: '',
  },
  listings: [],
  staff: [],
  tasks: [],
};

export const MOCK_REFERRAL_PROGRAM: ReferralProgram = {
  referralCode: '',
  referralLink: '',
  rewardPerActiveUser: 500,
  totalEarned: 0,
  availableBonus: 0,
  totalInvited: 0,
  activeVerifiedCount: 0,
  pendingCount: 0,
  referredList: [],
};

export const MOCK_STORE_SUBSCRIPTION: StoreSubscription = {
  tier: 'none',
  monthlyFee: 0,
  itemLimit: 0,
  itemsCount: 0,
  storeName: '',
  description: '',
  category: '',
  active: false,
  expiresAt: '',
  paymentMethod: 'wallet',
};

export const MOCK_CREATOR_FILES: CreatorDigitalFile[] = [];

export const MOCK_AFRI_BOOKS: AfriBook[] = [];

export const MOCK_GROUP_READ_SESSIONS: GroupReadSession[] = [];

export const INITIAL_TUTOR_PROFILE: TutorProfile = {
  isRegisteredTutor: false,
  tutorName: '',
  bio: '',
  category: '',
  hasBlueCheck: false,
  tier: 'starter_10',
  coursesLimit: 10,
  activeCoursesCount: 0,
  totalEarnings: 0,
};

export const MOCK_COURSES: Course[] = [];

export const MOCK_ADMIN_USERS: import('../types').AdminUserRecord[] = [];

export const INITIAL_ADMIN_BROADCAST: import('../types').AdminSystemBroadcast = {
  id: '',
  title: '',
  message: '',
  level: 'info',
  createdAt: '',
  active: false,
};
