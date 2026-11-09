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
  type: 'topup' | 'escrow_lock' | 'escrow_release' | 'withdrawal' | 'transfer_delayed' | 'payroll_debit' | 'transfer_in';
  title: string;
  amount: number;
  currency: CurrencyCode;
  timestamp: string;
  status: 'completed' | 'pending';
  reference: string;
  channel: 'paystack' | 'wallet' | 'bank_transfer';
}

export interface UserWallet {
  availableBalance: number;
  escrowLockedBalance: number;
  currency: CurrencyCode;
  transactions: WalletTransaction[];
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
  role: 'host' | 'co-host' | 'speaker';
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
  speakers: AudioSpaceSpeaker[];
  isLive: boolean;
  category: 'Tech & Hustle' | 'Afrobeats & Music' | 'Football Banter' | 'Market Townhall';
  isLowBandwidthMode: boolean;
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
}

export interface ChatMessage {
  id: string;
  chatId: string;
  sender: 'user' | 'other' | 'system';
  senderName?: string;
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
  voiceNote?: VoiceNoteMeta;
  product?: Product;
  order?: EscrowOrder;
  memeSticker?: MemeSticker;
  invoiceData?: InvoiceData;
  financialPoll?: FinancialPoll;
  ajoGroup?: AjoGroup;
  scamEntity?: ScamEntity;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read';
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
  isGroup?: boolean;
  isChannel?: boolean;
  membersCount?: number;
  isScreenshotBlocked?: boolean;
  isScamFlagged?: boolean;
  scamReportsCount?: number;
  activeSpaceId?: string;
  ajoGroup?: AjoGroup;
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
  userName: string;
  userAvatar: string;
  isMe?: boolean;
  statusType?: 'image' | 'video' | 'thought' | 'media';
  thoughtBg?: string;
  mediaUrl?: string;
  videoUrl?: string;
  caption: string;
  createdAt: string;
  expiresInHours: number;
  viewsCount: number;
  likesCount: number;
  viewers: StatusViewer[];
  hasLikedByMe?: boolean;
}

export interface UserProfile {
  id: string;
  phoneNumber: string;
  countryCode?: string;
  fullName: string;
  avatarUrl: string;
  about: string;
  isPhoneVerified?: boolean;
  createdAt: string;
  lastSeen: string;
  verificationBadge?: 'blue' | 'gold' | 'creator_plus' | null;
  verificationExpiresAt?: string;
  isCreator?: boolean;
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
  isRegisteredOnAfriChat: boolean;
  isRegistered?: boolean;
  registeredUser?: UserProfile;
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
  vehicleType: 'bike' | 'keke' | 'van';
  estimatedFee: number;
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




