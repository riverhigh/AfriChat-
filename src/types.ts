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
  type: 'topup' | 'escrow_lock' | 'escrow_release' | 'withdrawal';
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
  tags: string[];
  topText?: string;
  bottomText?: string;
  cultureOrigin: 'Nollywood' | 'Afrobeats' | 'Pidgin Slang' | 'Street Banter';
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
  mediaUrl?: string;
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
  fullName: string;
  avatarUrl: string;
  about: string;
  createdAt: string;
  lastSeen: string;
}

export interface DeviceContact {
  id: string;
  name: string;
  rawPhoneNumber: string;
  normalizedPhoneNumber: string;
  avatar?: string;
  about?: string;
  isRegisteredOnAfriChat: boolean;
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

