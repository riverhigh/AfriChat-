export type CurrencyCode = 'NGN' | 'KES' | 'GHS' | 'ZAR';

export type LanguageCode = 'en' | 'pcm' | 'sw' | 'yo' | 'ha' | 'fr';

export type EscrowStatus = 
  | 'escrow_secured'
  | 'shipped'
  | 'funds_released'
  | 'disputed';

export interface Product {
  id: string;
  sellerId: string;
  sellerName: string;
  title: string;
  description: string;
  price: number;
  currency: CurrencyCode;
  imageUrl: string;
  category: 'textiles' | 'electronics' | 'beauty' | 'fashion' | 'books';
  inStock: boolean;
  stockCount: number;
  location: string;
  condition: 'Brand New' | 'Direct Import' | 'Refurbished' | 'Fairly Used';
  tags: string[];
}

export interface EscrowOrder {
  id: string;
  chatId: string;
  product: Product;
  quantity: number;
  totalAmount: number;
  currency: CurrencyCode;
  status: EscrowStatus;
  escrowPin: string;
  buyerName: string;
  sellerName: string;
  deliveryAddress: string;
  createdAt: string;
  updatedAt: string;
  paymentMethod: 'paystack' | 'wallet';
  paystackRef?: string;
}

export interface WalletTransaction {
  id: string;
  type: 'topup' | 'escrow_lock' | 'escrow_release' | 'withdrawal' | 'transfer_delayed' | 'payroll_debit' | 'transfer_in' | 'transfer_out';
  title: string;
  amount: number;
  currency: CurrencyCode;
  timestamp: string;
  status: 'completed' | 'pending';
  reference?: string;
  channel: 'paystack' | 'wallet' | 'bank_transfer';
}

export interface UserWallet {
  availableBalance: number;
  escrowLockedBalance: number;
  currency: CurrencyCode;
  transactions: WalletTransaction[];
  balance?: number;
}

export interface MemeSticker {
  id: string;
  title: string;
  imageUrl: string;
  tags?: string[];
  topText?: string;
  bottomText?: string;
  category?: string;
  cultureOrigin?: 'Nollywood' | 'Afrobeats' | 'Pidgin Slang' | 'Street Banter' | 'User Created' | 'User Custom' | string;
}

export interface AudioSpaceSpeaker {
  id: string;
  name: string;
  avatar: string;
  role: 'host' | 'co-host' | 'speaker' | 'sponsor';
  sponsorBrand?: string;
  sponsorTagline?: string;
  isSpeaking: boolean;
  isMuted: boolean;
}

export interface AudioSpace {
  id: string;
  title: string;
  topic: string;
  hostName: string;
  hostAvatar: string;
  listenersCount: number;
  peakListeners?: number;
  startedAt?: number;
  speakers: AudioSpaceSpeaker[];
  listeners?: { id: string; name: string; avatar: string; isMuted?: boolean; isSpeaking?: boolean }[];
  isLive: boolean;
  category: 'Tech & Hustle' | 'Afrobeats & Music' | 'Football Banter' | 'Market Townhall';
  isLowBandwidthMode: boolean;
  pinnedAnnouncement?: string;
  sponsorBanner?: {
    brandName: string;
    tagline: string;
    avatar?: string;
    badge?: string;
  };
  raisedHands?: {
    id: string;
    name: string;
    avatar: string;
    time: string;
  }[];
}

export interface ScamEntity {
  targetValue: string; // phone number or bank account number
  targetType: 'phone' | 'bank_account';
  accountName?: string;
  bankName?: string;
  riskLevel: 'critical_scam' | 'suspicious' | 'verified_clean';
  reportsCount: number;
  recentFlags: {
    date: string;
    reason: string;
    flaggedBy: string;
  }[];
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface InvoiceData {
  id: string;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  sellerBusinessName: string;
  sellerPhone: string;
  sellerAddress: string;
  buyerName: string;
  buyerPhone: string;
  buyerAddress: string;
  items: InvoiceItem[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  totalAmount: number;
  currency: CurrencyCode;
  paymentStatus: 'paid_escrow' | 'pending_payment';
  paystackRef?: string;
  escrowPin?: string;
}

export interface PollOption {
  id: string;
  text: string;
  votesCount: number;
  voterNames: string[];
}

export interface FinancialPoll {
  id: string;
  title: string;
  creatorName: string;
  stakePerVote: number;
  currency: CurrencyCode;
  options: PollOption[];
  totalStakeLocked: number;
  totalVoters: number;
  userVotedOptionId?: string;
  status: 'active' | 'closed';
  payoutRule: string;
}

export interface AjoMember {
  id: string;
  name: string;
  avatar: string;
  phone: string;
  payoutPosition: number; // 1st month, 2nd month, etc.
  hasPaidCurrentCycle: boolean;
  payoutDate: string;
  isReceivedPayout: boolean;
}

export interface AjoGroup {
  id: string;
  name: string;
  description: string;
  cycleContributionAmount: number;
  currency: CurrencyCode;
  frequency: 'weekly' | 'monthly';
  totalRounds: number;
  currentRound: number;
  nextPayoutDate: string;
  currentRecipientName: string;
  totalPoolPerRound: number;
  members: AjoMember[];
  rules: string;
}

export interface VoiceNoteMeta {
  durationSeconds: number;
  waveform: number[];
  transcript: string;
  translations: Record<LanguageCode, string>;
  audioDataUrl?: string;    // ephemeral blob: URL for sender's tab; base64 for cross-device
  expiresAt: string;        // ISO -- voice notes auto-purge 24h after creation
  transcriptRevealed?: boolean; // hidden by default; revealed on user tap
}

export interface ChatMessage {
  id: string;
  chatId: string;
  sender: 'user' | 'other' | 'system';
  senderName?: string;
  senderPhone?: string;
  senderAvatar?: string;
  text?: string;
  translatedText?: Record<LanguageCode, string>;
  type:
    | 'text'
    | 'image'
    | 'voice'
    | 'product_card'
    | 'escrow_receipt'
    | 'meme_sticker'
    | 'invoice_receipt'
    | 'financial_poll'
    | 'ajo_update'
    | 'scam_warning';
  imageUrl?: string;
  imageLoaded?: boolean;
  mediaSizeKB?: number;
  /** One-time view: image disappears after first tap */
  oneTimeView?: boolean;
  voiceNote?: VoiceNoteMeta;
  product?: Product;
  order?: EscrowOrder;
  memeSticker?: MemeSticker;
  invoiceData?: InvoiceData;
  invoice?: InvoiceData;
  financialPoll?: FinancialPoll;
  ajoGroup?: AjoGroup;
  scamEntity?: ScamEntity;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read';
  replyTo?: {
    id?: string;
    sender: string;
    text: string;
  };
  reactions?: Record<string, string[]>;
  deleted?: boolean;
  isEncrypted?: boolean;
}

export interface ChatThread {
  id: string;
  name: string;
  avatar: string;
  verifiedStore: boolean;
  storeCategory?: string;
  location: string;
  unreadCount: number;
  lastMessage: string;
  lastMessageTime: string;
  catalog: Product[];
  isOnline: boolean;
  phone?: string;
  phoneNumber?: string;
  isGroup?: boolean;
  isChannel?: boolean;
  membersCount?: number;
  isScreenshotBlocked?: boolean;
  isScamFlagged?: boolean;
  scamReportsCount?: number;
  activeSpaceId?: string;
  ajoGroup?: AjoGroup;
  isCelebrityVerified?: boolean;
  celebrityCategory?: string;
  celebrityStageName?: string;
  isMuted?: boolean;
  isLocked?: boolean;
  isFavourite?: boolean;
  disappearingTimer?: string;
  admins?: string[];
  description?: string;
  creatorId?: string;
  members?: string[];
  memberPhones?: string[];
  inviteCode?: string;
  invitationStatus?: 'pending' | 'accepted' | 'declined';
  invitedBy?: string;
  isShelved?: boolean;
  label?: string;
}

export interface ContactRequest {
  id: string;
  senderPhone: string;
  senderName: string;
  senderAvatar?: string;
  recipientPhone: string;
  message?: string;
  createdAt: string;
  status: 'pending' | 'accepted' | 'declined';
}

export interface CallLogItem {
  id: string;
  name: string;
  avatar: string;
  type: 'voice' | 'video';
  direction: 'incoming' | 'outgoing' | 'missed';
  time: string;
  phone: string;
}

export interface StatusViewer {
  id: string;
  name: string;
  avatar: string;
  timeViewed: string;
  hasLiked?: boolean;
}

export interface UserStatus {
  id: string;
  userId: string;
  userPhone?: string;
  userName: string;
  userAvatar: string;
  isMe?: boolean;
  statusType?: 'image' | 'video' | 'thought' | 'media';
  thoughtBg?: string;
  mediaUrl?: string;
  videoUrl?: string;
  caption: string;
  createdAt: string;
  /** ISO-8601 for precise live countdown e.g. 2026-11-12T14:00:00.000Z */
  createdAtISO?: string;
  expiresInHours: number;
  viewsCount: number;
  likesCount: number;
  viewers: StatusViewer[];
  hasLikedByMe?: boolean;
  /** True when reshared from another user's post */
  isReshared?: boolean;
}

export interface UserProfile {
  id: string;
  phoneNumber: string;
  email?: string;
  countryCode?: string;
  fullName: string;
  username?: string;
  bio?: string;
  location?: string;
  isOnline?: boolean;
  avatarUrl: string;
  about: string;
  isPhoneVerified?: boolean;
  createdAt: string;
  lastSeen: string;
  verificationBadge?: 'blue' | 'gold' | 'creator_plus' | null;
  verificationExpiresAt?: string;
  isCelebrityVerified?: boolean;
  celebrityCategory?: string;
  celebrityStageName?: string;
  isCreator?: boolean;
  role?: 'user' | 'admin' | 'creator' | 'merchant';
  isAdmin?: boolean;
  creatorPlan?: 'none' | 'gold' | 'creator_plus';
  platformFeeRate?: number;
}

export interface DeviceContact {
  id: string;
  name: string;
  rawPhoneNumber: string;
  normalizedPhoneNumber: string;
  avatar?: string;
  about?: string;
  isRegisteredOnAGC: boolean;
  isRegistered?: boolean;
  registeredUser?: UserProfile;
  isCelebrityVerified?: boolean;
}

export interface UserUploadedMeme {
  id: string;
  title: string;
  mediaUrl: string;
  type: 'image' | 'gif';
  createdAt: string;
  tag?: string;
}

export type DispatchProvider = 'gokada' | 'pickkr';

export interface DispatchDeliveryOrder {
  id: string;
  trackingCode: string;
  provider: DispatchProvider;
  senderAddress: string;
  senderPhone: string;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  packageDescription: string;
  vehicleType: 'bike' | 'van';
  estimatedFee: number;
  platformFee?: number;
  totalFee?: number;
  currency: CurrencyCode;
  status: 'finding_rider' | 'rider_assigned' | 'in_transit' | 'delivered';
  riderName?: string;
  riderPhone?: string;
  riderPlate?: string;
  createdAt: string;
}

export interface JobPosting {
  id: string;
  title: string;
  company: string;
  location: string;
  type: 'Full-time' | 'Remote' | 'Contract' | 'Part-time';
  salaryRange: string;
  currency: CurrencyCode;
  description: string;
  requirements: string[];
  contactPhone: string;
  employerId: string;
  isFeatured: boolean;
  isPaid: boolean;
  postedAt: string;
}

export interface SecuritySettings {
  hasPaymentPin: boolean;
  isPaymentPinSet?: boolean;
  paymentPin?: string;
  securityQuestion?: string;
  securityAnswer?: string;
  failedAttempts?: number;
  lockoutUntil?: number | null;
}

// 14. Service Booking & Appointment System Types (No limits African jobs)
export type ServiceCategory =
  | 'mechanic'
  | 'barber'
  | 'nail_tech'
  | 'bouncer'
  | 'event_planner'
  | 'tailor'
  | 'makeup'
  | 'generator_tech'
  | 'dj'
  | 'caterer'
  | 'plumber'
  | 'electrician'
  | 'cleaner'
  | 'tutor'
  | 'other';

export interface ServiceOffering {
  id: string;
  title: string;
  price: number;
  durationMinutes: number;
  description?: string;
}

export interface ServiceProvider {
  id: string;
  name: string;
  businessName: string;
  avatar: string;
  category: ServiceCategory;
  categoryLabel: string;
  rating: number;
  reviewCount: number;
  hourlyRate: number;
  currency: CurrencyCode;
  location: string;
  about: string;
  experienceYears: number;
  availability: {
    days: string[];
    timeSlots: string[];
  };
  servicesOffered: ServiceOffering[];
  portfolioImages: string[];
  phone: string;
  isVerified: boolean;
  badge?: string;
}

export interface ServiceBooking {
  id: string;
  serviceProviderId: string;
  providerName: string;
  providerAvatar: string;
  clientName: string;
  clientPhone: string;
  serviceTitle: string;
  category: ServiceCategory;
  date: string;
  timeSlot: string;
  location: string;
  totalPrice: number;
  currency: CurrencyCode;
  notes?: string;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  paymentMode: 'escrow' | 'direct';
  isPaid: boolean;
  createdAt: string;
  bookingPin: string;
}

// 15. Money Transfer with 1-2 Days Delay (Anti-Fraud & Escrow Delay)
export interface DelayedTransfer {
  id: string;
  senderId: string;
  senderName: string;
  recipientPhone: string;
  recipientName: string;
  amount: number;
  currency: CurrencyCode;
  note: string;
  delayHours: number; // 24 or 48 hours
  scheduledReleaseTime: string;
  releaseTimestampMs: number;
  status: 'pending_clearance' | 'cleared' | 'cancelled_by_sender';
  createdAt: string;
  securityReason: string;
}

// 16. Payroll & Recurring Auto-Debit System
export interface PayrollEmployee {
  id: string;
  fullName: string;
  role: string;
  phone: string;
  salary: number;
  currency: CurrencyCode;
  frequency: 'weekly' | 'bi_weekly' | 'monthly';
  nextPaymentDate: string;
  status: 'active' | 'paused';
  bankOrWallet: string;
  accountNumber: string;
  lastPaidDate?: string;
}

export interface PayrollRunLog {
  id: string;
  employeeId: string;
  employeeName: string;
  role: string;
  amount: number;
  currency: CurrencyCode;
  date: string;
  status: 'successful' | 'failed';
  reference: string;
}

// 17. Visual Display & Customization
export type AppFontSize = 'small' | 'normal' | 'large' | 'huge';

// 18. Town Community Hub (Groups, Channels, Spaces, Privacy)
export interface TownCommunity {
  id: string;
  name: string;
  type: 'group' | 'channel';
  category: 'Tech & Hustle' | 'Market & Trade' | 'Campus & Youth' | 'Lifestyle & Faith' | 'Music & Creative';
  membersCount: number;
  avatar: string;
  description: string;
  isVerified: boolean;
  isJoined: boolean;
  recentActivity: string;
  adminName: string;
  creatorId?: string;
}

// 19. Healthcare & Telehealth System
export type DoctorSpecialty = 
  | 'General Practitioner'
  | 'Consultant Pediatrician'
  | 'Obstetrics & Gynaecology'
  | 'Cardiologist'
  | 'Clinical Pharmacist'
  | 'Mental Wellness';

export interface DoctorProfile {
  id: string;
  name: string;
  title: string;
  specialty: DoctorSpecialty;
  hospitalAffiliation: string;
  avatar: string;
  rating: number;
  reviewCount: number;
  consultationFee: number;
  currency: CurrencyCode;
  isAvailable: boolean;
  languages: string[];
  bio: string;
}

export interface HospitalQueueToken {
  id: string;
  hospitalName: string;
  department: string;
  tokenNumber: string;
  currentlyServing: string;
  positionInLine: number;
  estimatedWaitMins: number;
  bookedTime: string;
  status: 'waiting' | 'in_consultation' | 'completed' | 'cancelled';
  location: string;
}

export interface MedicationReminder {
  id: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  scheduledTimes: string[];
  remainingDays: number;
  pharmacyPartner: string;
  canReorder: boolean;
  notes?: string;
}

export interface HealthVaultRecord {
  bloodGroup: 'O+' | 'O-' | 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-';
  genotype: 'AA' | 'AS' | 'SS' | 'AC';
  allergies: string[];
  chronicConditions: string[];
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyNotes: string;
  qrCodeId: string;
  lastUpdated: string;
}

// 20. Legal Services & Smart Contract Generator
export type LawyerSpecialty = 
  | 'CAC Business & Corporate'
  | 'Human Rights & Police SOS'
  | 'Tenancy & Property Disputes'
  | 'Debt Recovery & Contracts'
  | 'Intellectual Property & Media';

export interface LawyerProfile {
  id: string;
  name: string;
  title: string;
  firm: string;
  specialty: LawyerSpecialty;
  avatar: string;
  barNumber: string;
  yearsExperience: number;
  consultationFee: number;
  currency: CurrencyCode;
  isAvailable: boolean;
  location: string;
  verifiedLicense: boolean;
  bio: string;
}

export interface LegalContractTemplate {
  id: string;
  title: string;
  category: 'Freelance & Services' | 'Tenancy & Rent' | 'Sales & Escrow Supply' | 'Non-Disclosure (NDA)';
  description: string;
  applicableLaw: string;
  badge: string;
}

export interface GeneratedLegalContract {
  id: string;
  templateTitle: string;
  partyAName: string;
  partyBName: string;
  amountOrValue: string;
  durationOrDate: string;
  governingLaw: string;
  specificTerms: string;
  createdAt: string;
  status: 'draft' | 'signed_binding' | 'disputed';
  signatureA: string;
  signatureB?: string;
  escrowOrderId?: string;
}

// 21. African Creator & Artist Direct Economy System
export interface CreatorProfile {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  banner: string;
  category: 'Music & Afrobeats' | 'Comedy & Skits' | 'Dance & Culture' | 'Lifestyle & Fashion' | 'Tech & Business';
  subscribersCount: number;
  monthlySubPrice: number;
  currency: CurrencyCode;
  bio: string;
  isVerified: boolean;
  badge: string;
  totalEarnings: number;
  isSubscribedByMe?: boolean;
  isFollowedByMe?: boolean;
  vipServices?: CreatorVipService;
}

export interface CreatorPost {
  id: string;
  creatorId: string;
  creatorName: string;
  creatorAvatar: string;
  creatorHandle: string;
  content: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'audio_leak' | 'text';
  isLocked: boolean; // Only for paid fan subscribers
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  hasLikedByMe?: boolean;
  audioDurationSec?: number;
}

export interface CreatorShowTicket {
  id: string;
  creatorId: string;
  creatorName: string;
  creatorAvatar?: string;
  title: string;
  type: 'online_stream' | 'offline_concert';
  date: string;
  time: string;
  venueOrStreamUrl: string;
  price: number;
  currency: CurrencyCode;
  availableTickets: number;
  totalSold: number;
  coverImage: string;
  description: string;
  ticketPin?: string;
  isPurchasedByMe?: boolean;
  ticketQrCode?: string;
}

export interface CreatorSong {
  id: string;
  artistId: string;
  artistName: string;
  artistAvatar?: string;
  title: string;
  album?: string;
  coverArt: string;
  price: number; // Direct pay to artist wallet
  currency: CurrencyCode;
  duration: string;
  genre: string;
  sampleAudioUrl?: string;
  playsCount: number;
  salesCount: number;
  isPurchasedByMe?: boolean;
  releaseDate: string;
}

// 22. Artisan Service Station & Workspace Management
export interface ArtisanStaff {
  id: string;
  name: string;
  role: 'Senior Artisan' | 'Apprentice' | 'Assistant' | 'Technician' | 'Store Manager';
  phone: string;
  hiredAt: string;
  wage: string;
  status: 'active' | 'on_leave';
}

export interface ArtisanTask {
  id: string;
  title: string;
  description: string;
  assignedToStaffId: string;
  assignedToStaffName: string;
  clientName?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed';
  dueDate: string;
  createdAt: string;
}

export interface ArtisanStation {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerPhone: string;
  stationName: string;
  category: ServiceCategory;
  categoryLabel: string;
  location: string;
  workshopAddress: string;
  about: string;
  avatar: string;
  isApproved: boolean;
  registrationFeePaid: boolean;
  registrationFeeAmount: number; // ₦5,000
  registrationPaymentMethod: 'wallet' | 'paystack';
  registeredAt: string;
  operatingHours: {
    days: string[];
    startTime: string;
    endTime: string;
    breakTime?: string;
  };
  listings: ServiceOffering[]; // ₦500 per listing
  staff: ArtisanStaff[];
  tasks: ArtisanTask[];
}

// 23. Anti-Fraud Referral & Invite System
export interface ReferredUser {
  id: string;
  name: string;
  phone: string;
  joinedAt: string;
  avatar?: string;
  otpVerified: boolean;
  walletFundedOrTransacted: boolean;
  transactionAmount?: number;
  activityCompleted: boolean;
  status: 'pending' | 'verified_active' | 'flagged_ghost';
  rewardEarned: number; // ₦500
}

export interface ReferralProgram {
  referralCode: string;
  referralLink: string;
  rewardPerActiveUser: number; // 500 NGN
  totalEarned: number;
  availableBonus: number;
  totalInvited: number;
  activeVerifiedCount: number;
  pendingCount: number;
  referredList: ReferredUser[];
}

// 24. Store Registration & Tiers System (3k/mo for 30 items, 7k/mo for 100 items)
export type StoreTier = 'none' | 'starter_30' | 'pro_100';

export interface StoreSubscription {
  tier: StoreTier;
  monthlyFee: number; // 3,000 for starter_30, 7,000 for pro_100
  itemLimit: number; // 30 for starter_30, 100 for pro_100
  itemsCount: number;
  storeName: string;
  description: string;
  category: string;
  active: boolean;
  isRegistered?: boolean;
  itemsUsed?: number;
  itemsLimit?: number;
  expiresAt: string;
  paymentMethod: 'wallet' | 'paystack';
}

// 25. Creator VIP Sessions & Digital Files Marketplace
export interface CreatorVipService {
  voicePerMinute: number;
  videoPerMinute: number;
  bundle3MinVoice: number;
  bundle5MinVoice: number;
  bundle3MinVideo: number;
  bundle5MinVideo: number;
  vipDirectChat24h: number;
}

export interface CreatorDigitalFile {
  id: string;
  creatorId: string;
  creatorName: string;
  creatorAvatar?: string;
  title: string;
  description: string;
  category: 'ebook' | 'music_audio' | 'video' | 'design_art' | 'preset_lut' | 'code_software' | 'pdf_guide' | 'other';
  fileName: string;
  fileSize: string;
  fileType: string;
  fileDataUrl?: string;
  price: number;
  currency: CurrencyCode;
  downloadsCount: number;
  isPurchasedByMe?: boolean;
  createdAt: string;
}

// 26. African Writers System (AfriBooks - Chapters, Tips, Paid Books & Buddy Group Read)
export interface BookChapterComment {
  id: string;
  readerName: string;
  readerAvatar: string;
  comment: string;
  timestamp: string;
}

export interface BookChapter {
  id: string;
  chapterNumber: number;
  title: string;
  content: string;
  readTimeMinutes: number;
  comments: BookChapterComment[];
}

export interface AfriBook {
  id: string;
  title: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  authorBio?: string;
  coverUrl: string;
  genre: string;
  synopsis: string;
  isHumanWrittenCertified: boolean; // Strictly true: No AI books allowed!
  pricingType: 'free' | 'paid';
  price: number; // e.g. ₦1,500
  currency: CurrencyCode;
  chapters: BookChapter[];
  totalReads: number;
  tipsReceivedCount: number;
  tipsTotalAmount: number;
  isPurchasedByMe?: boolean;
  publishedAt: string;
}

export interface GroupReadMessage {
  id: string;
  senderName: string;
  text: string;
  timestamp: string;
}

export interface GroupReadSession {
  id: string;
  bookId: string;
  bookTitle: string;
  bookCover: string;
  hostUserId: string;
  hostUserName: string;
  buddyUserId: string;
  buddyUserName: string;
  buddyAvatar: string;
  currentChapter: number;
  currentPage: number;
  isPaidByOne: boolean; // eg 2 friends can both read a certain book together if one pays
  messages: GroupReadMessage[];
}

// 27. Celebrity Identity Verification
export interface CelebrityVerificationApplication {
  id: string;
  userId: string;
  stageName: string;
  realName: string;
  category: 'Musician' | 'Actor / Film' | 'Comedian' | 'Athlete' | 'Creator & Influencer' | 'Public Figure';
  socialHandle: string;
  proofDocumentUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
}

// 28. African Tutor & Online Course Marketplace System
export type CourseCategory =
  | 'tech_coding'
  | 'business_finance'
  | 'languages_culture'
  | 'creative_design'
  | 'trades_engineering'
  | 'academics_jamb';

export interface CourseLesson {
  id: string;
  title: string;
  durationMinutes: number;
  videoUrl?: string;
  videoType?: 'upload' | 'embed' | 'url';
  notes?: string;
  pdfUrl?: string;
  pdfName?: string;
  fileUrl?: string;
  fileName?: string;
  isPreview?: boolean;
}

export interface Course {
  id: string;
  tutorId: string;
  tutorName: string;
  tutorAvatar: string;
  tutorIsBlueVerified: boolean;
  title: string;
  description: string;
  category: CourseCategory;
  price: number;
  currency: CurrencyCode;
  thumbnailUrl: string;
  lessonsCount: number;
  totalDurationHours: number;
  enrolledStudentsCount: number;
  rating: number;
  reviewsCount: number;
  lessons: CourseLesson[];
  createdAt: string;
  isEnrolledByMe?: boolean;
}

export interface TutorProfile {
  isRegisteredTutor: boolean;
  tutorName: string;
  bio: string;
  category: string;
  hasBlueCheck: boolean; // 4k verified blue check condition
  tier: 'starter_10' | 'unlimited_pro'; // 10 courses limit or unlimited (20k/mo)
  coursesLimit: number;
  activeCoursesCount: number;
  totalEarnings: number;
  registeredAt?: string;
  renewalDate?: string;
}


// 24. Super Admin Console & Platform Moderation
export interface AdminUserRecord {
  id: string;
  fullName: string;
  phoneNumber: string;
  avatarUrl: string;
  role: 'user' | 'creator' | 'merchant' | 'admin';
  verificationBadge?: 'blue' | 'gold' | 'creator_plus' | null;
  isPhoneVerified: boolean;
  status: 'active' | 'suspended' | 'flagged' | 'banned';
  joinedDate: string;
  walletBalanceNgn: number;
  ordersCount: number;
  lastSeen?: string; // ISO date string or 'online'
  isOnline?: boolean;
  deviceInfo?: string;
  bannedAt?: string;
  banReason?: string;
}

export interface AdminSystemBroadcast {
  id: string;
  title: string;
  message: string;
  level: 'info' | 'warning' | 'alert' | 'urgent';
  createdAt: string;
  active: boolean;
}

// 29. Admin System Config, Feature Flags & CMS
export interface AdminSystemConfig {
  maintenanceMode: boolean;
  maintenanceMessage: string;
  allowNewRegistrations: boolean;
  requirePhoneOtp: boolean;
  defaultCurrency: CurrencyCode;
  dispatchCommissionPercent: number; // e.g. 5%
  escrowCommissionPercent: number; // e.g. 1.5%
  artisanCommissionPercent: number; // e.g. 2%
  creatorCommissionPercent: number; // e.g. 5%
  minTransferAmountNgn: number;
  maxDailyTransferNgn: number;
  delayedSendHoldDurationMins: number;
  lowBandwidthDefault: boolean;
  supportContactPhone: string;
}

export interface FeatureFlags {
  // Master Financials
  wallet: boolean;          // Master dependency hub: if off, disables all money-related features
  p2pTransfers?: boolean;
  escrow: boolean;          // requires wallet
  delayedSend?: boolean;
  securityPin?: boolean;

  // Services & 3-Dot Menu Hub
  dispatch: boolean;        // independent
  artisan: boolean;         // requires wallet
  healthcare: boolean;      // independent
  legal: boolean;           // independent
  jobs: boolean;            // independent
  petShop?: boolean;
  errands: boolean;         // requires wallet

  // Creator & Tools
  creator: boolean;         // requires wallet
  audioSpaces: boolean;     // independent
  writers: boolean;         // requires wallet
  storeTiers?: boolean;
  tutor: boolean;           // requires wallet
  referral?: boolean;
  memeStudio?: boolean;
  scamChecker?: boolean;

  // Global Navigation & Communication
  town: boolean;            // independent
  market: boolean;          // requires wallet
  status: boolean;          // independent
  calls: boolean;           // independent
  voiceNotes?: boolean;
  ajo: boolean;             // requires wallet
  payroll: boolean;         // requires wallet
}

export interface CmsAnnouncement {
  id: string;
  title: string;
  content: string;
  level: 'info' | 'warning' | 'alert' | 'urgent';
  audience: 'all' | 'merchants' | 'creators' | 'drivers';
  actionUrl?: string;
  active: boolean;
  createdAt: string;
}

export interface CmsMarqueeBanner {
  enabled: boolean;
  text: string;
  speed: 'slow' | 'normal' | 'fast';
  backgroundColor: string;
  textColor: string;
}

export interface CmsFaqItem {
  id: string;
  question: string;
  answer: string;
  category: 'wallet' | 'escrow' | 'dispatch' | 'security' | 'general';
  published: boolean;
}

export interface AdminCmsData {
  announcements: CmsAnnouncement[];
  marqueeBanner: CmsMarqueeBanner;
  faqArticles: CmsFaqItem[];
  communityGuidelines: string;
  termsOfService: string;
  sponsorSpotlight: {
    enabled: boolean;
    brandName: string;
    tagline: string;
    bannerUrl?: string;
    linkUrl?: string;
  };
}

// 30. Errand Delivery & Shopping Service Types
export interface ErrandItem {
  id: string;
  name: string;
  price: number;
  unit: string;
  category: string;
  inStock: boolean;
}

export interface ErrandRunner {
  id: string;
  userId: string;
  name: string;
  phone: string;
  avatar: string;
  location: string;
  bio: string;
  rating: number;
  reviewsCount: number;
  completedCount: number;
  deliveryBaseFee: number;
  currency: CurrencyCode;
  itemsForSale: ErrandItem[];
  isOnline: boolean;
  isRegistered: boolean;
}

export interface ErrandOrder {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  runnerId: string;
  runnerName: string;
  runnerPhone: string;
  items: { item: ErrandItem; quantity: number; subtotal: number }[];
  customNotes?: string;
  dropoffAddress: string;
  itemsTotal: number;
  deliveryFee: number;
  totalAmount: number;
  currency: CurrencyCode;
  status: 'pending' | 'accepted' | 'shopping' | 'delivering' | 'delivered' | 'completed' | 'disputed';
  escrowReleaseCode: string;
  proofImages: string[];
  disputeReason?: string;
  disputeImages?: string[];
  createdAt: string;
}

// 31. Gamified Milestones & Badges
export interface GamifyMilestone {
  id: string;
  category: 'artisan' | 'store' | 'errand' | 'tutor';
  tierCount: number;
  badgeName: string;
  badgeIcon: string;
  title: string;
  description: string;
}
