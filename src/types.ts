export type CurrencyCode = 'NGN' | 'KES' | 'GHS' | 'ZAR';

export type LanguageCode = 'en' | 'pcm' | 'sw' | 'yo' | 'ha' | 'fr';

export type EscrowStatus =
  | 'escrow_secured'
  | 'shipped'
  | 'release_approved'
  | 'funds_released'
  | 'disputed'
  | 'refunded';

export interface Product {
  id: string;
  sellerId: string;
  sellerName: string;
  sellerPhone?: string;
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
  isApproved?: boolean;
}

export interface EscrowOrder {
  id: string;
  chatId: string;
  product: Product;
  quantity: number;
  subtotalAmount?: number;
  escrowFee?: number;
  totalAmount: number;
  currency: CurrencyCode;
  status: EscrowStatus;
  escrowPin: string;
  buyerId?: string;
  buyerName: string;
  buyerPhone?: string;
  sellerName: string;
  sellerPhone?: string;
  deliveryAddress: string;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  releasedAt?: string;
  failedClaimAttempts?: number;
  disputeReason?: string;
  paymentMethod: 'paystack' | 'wallet';
  paystackRef?: string;
}

export type WalletTransactionType =
  | 'topup'
  | 'deposit'
  | 'escrow_lock'
  | 'escrow_fee'
  | 'escrow_release'
  | 'withdrawal'
  | 'payroll_debit'
  | 'transfer_in'
  | 'transfer_out'
  | 'sent'
  | 'received'
  | 'store_purchase'
  | 'game_wager'
  | 'game_win'
  | 'bill_paid'
  | 'bill_received'
  | 'ad_payment'
  | 'store_subscription'
  | 'artisan_reg'
  | 'errand_escrow'
  | 'errand_release'
  | 'service_booking'
  | 'creator_tip'
  | 'course_enroll'
  | 'legal_consult'
  | 'health_consult'
  | 'outside_ticket'
  | 'outside_payout'
  | 'task_stake'
  | 'task_earn'
  | 'referral_bonus'
  | 'refund';

export interface WalletTransaction {
  id: string;
  userId?: string;
  userPhone?: string;
  userName?: string;
  type: WalletTransactionType;
  title: string;
  description?: string;
  amount: number;
  fee?: number;
  balanceAfter?: number;
  currency: CurrencyCode;
  timestamp: string;
  createdAt?: string;
  status: 'completed' | 'pending';
  reference?: string;
  referenceId?: string;
  channel: 'paystack' | 'wallet' | 'bank_transfer';
  metadata?: Record<string, any>;
}

export interface UserWallet {
  availableBalance: number;
  escrowLockedBalance: number;
  currency: CurrencyCode;
  transactions: WalletTransaction[];
  balance?: number;
}

export interface LiveBankOption {
  name: string;
  code: string;
  slug?: string;
  type?: string;
}

export interface ResolvedBankAccount {
  accountNumber: string;
  accountName: string;
  bankName: string;
  bankCode: string;
  bankId?: number;
  verifiedBy: 'paystack_live' | 'flutterwave_live';
}

export type CreditAlertCategory =
  | 'escrow'
  | 'game_win'
  | 'admin_topup'
  | 'deposit'
  | 'refund'
  | 'bill_received'
  | 'referral'
  | 'payout';

export interface CreditAlertEvent {
  id: string;
  amount: number;
  currency: CurrencyCode;
  newBalance: number;
  category: CreditAlertCategory;
  categoryLabel: string;
  title: string;
  subtitle?: string;
  xpEarned: number;
  createdAt: string;
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
  isVerified?: boolean;
  handle?: string;
}

export interface AudioSpaceListener {
  id: string;
  name: string;
  avatar: string;
  isMuted?: boolean;
  isSpeaking?: boolean;
  isAnonymous?: boolean;
  isVerified?: boolean;
  handle?: string;
}

export interface AudioSpaceChatMessage {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  text: string;
  timestamp: string;
}

export interface AudioSpace {
  id: string;
  title: string;
  topic: string;
  hostId?: string;
  hostPhone?: string;
  hostName: string;
  hostAvatar: string;
  listenersCount: number;
  peakListeners?: number;
  startedAt?: number;
  speakers: AudioSpaceSpeaker[];
  listeners?: AudioSpaceListener[];
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
  activePoll?: QuickPoll | null;
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
  votesByUser?: Record<string, { optionId: string; voterName: string; voterKey: string }>;
  status: 'active' | 'closed';
  payoutRule: string;
}

export type ChatThemeId =
  | 'default'
  | 'brutalist_obsidian'
  | 'neon_lagos'
  | 'sahara_gold'
  | 'emerald_circuit'
  | 'adire_indigo';

export type GhostTimerSetting = 'off' | '10s' | '30s' | '1m' | '5m' | '1h' | '24h';

export interface QuickPollOption {
  id: string;
  text: string;
  voterIds: string[];
  voterNames: string[];
}

export interface QuickPoll {
  id: string;
  question: string;
  creatorId: string;
  creatorName: string;
  options: QuickPollOption[];
  allowMultiple?: boolean;
  status: 'active' | 'closed';
  createdAt: string;
}

export interface PinnedChatAnnouncement {
  messageId: string;
  text: string;
  senderName: string;
  pinnedByName: string;
  pinnedAt: string;
}

export const STANDARD_GAME_BET_LIMIT = 10000;
export const VERIFIED_GAME_BET_LIMIT = 50000;
export const VERIFIED_BADGE_MONTHLY_FEE = 4000;

export type TicTacToeCell = 'X' | 'O' | null;

export interface TicTacToeGameState {
  id: string;
  chatId: string;
  gameType: 'xo';
  challengerId: string;
  challengerPhone: string;
  challengerName: string;
  challengerAvatar?: string;
  opponentPhone?: string;
  opponentName?: string;
  opponentAvatar?: string;
  isAiOpponent?: boolean;
  aiDifficulty?: 'hard';
  mode: 'friendly' | 'bet';
  betAmount: number;
  currency: CurrencyCode;
  board: TicTacToeCell[];
  xPlayerPhone: string;
  xPlayerName: string;
  oPlayerPhone?: string;
  oPlayerName?: string;
  currentTurn: 'X' | 'O';
  status: 'pending' | 'active' | 'won' | 'draw' | 'declined' | 'cancelled';
  winnerSymbol?: 'X' | 'O';
  winnerPhone?: string;
  winnerName?: string;
  winningLine?: number[];
  totalPot: number;
  platformFeeRate: number;
  platformFee: number;
  winnerPayout: number;
  lastActionNote?: string;
  settledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type WhotShape = 'circle' | 'triangle' | 'cross' | 'square' | 'star' | 'whot';

export interface WhotCard {
  id: string;
  shape: WhotShape;
  number: number; // 1..14, or 20 for 'whot'
}

export interface WhotGameState {
  id: string;
  chatId: string;
  gameType: 'whot';
  challengerId: string;
  challengerPhone: string;
  challengerName: string;
  challengerAvatar?: string;
  opponentPhone?: string;
  opponentName?: string;
  opponentAvatar?: string;
  isAiOpponent?: boolean;
  aiDifficulty?: 'hard';
  mode: 'friendly' | 'bet';
  betAmount: number;
  currency: CurrencyCode;
  challengerHand: WhotCard[];
  opponentHand: WhotCard[];
  deck: WhotCard[];
  discardPile: WhotCard[];
  topCard: WhotCard;
  requestedShape?: WhotShape | null;
  pendingDrawCount?: number;
  pendingDrawType?: 'pick_two' | 'pick_three' | null;
  reshuffleCount?: number;
  currentTurnPhone: string;
  currentTurnName: string;
  lastActionNote?: string;
  moveCount: number;
  status: 'pending' | 'active' | 'won' | 'draw' | 'declined' | 'cancelled';
  winnerPhone?: string;
  winnerName?: string;
  totalPot: number;
  platformFeeRate: number;
  platformFee: number;
  winnerPayout: number;
  settledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type LudoColor = 'purple' | 'amber';

export interface LudoRulesConfig {
  dice_count: 2;
  safe_tiles: number[];
  spawn_requires: 6;
  spawn_captures_occupant: boolean;
  instant_finish_on_capture: boolean;
  stack_protects_from_single: boolean;
  stack_blocks_passing: boolean;
  mandatory_capture_to_finish: boolean;
  two_house_mode: boolean;
}

export interface LudoGameState {
  id: string;
  chatId: string;
  gameType: 'ludo';
  challengerId: string;
  challengerPhone: string;
  challengerName: string;
  challengerAvatar?: string;
  opponentPhone?: string;
  opponentName?: string;
  opponentAvatar?: string;
  isAiOpponent?: boolean;
  aiDifficulty?: 'hard';
  mode: 'friendly' | 'bet';
  betAmount: number;
  currency: CurrencyCode;
  /** 8 seeds (Two-House Mode: indices 0..3 = Castle A, 4..7 = Castle B) or 4 seeds (Single-House) */
  challengerTokens: number[];
  opponentTokens: number[];
  /** Authentic Nigerian Double-Dice Ludo ruleset flags */
  rulesConfig?: LudoRulesConfig;
  /** Total captures ("eats") recorded by each player */
  challengerCaptures?: number;
  opponentCaptures?: number;
  /** Outer-track index awaiting 2nd token to complete a Stack-vs-Stack capture */
  pendingStackTargetTrackIdx?: number | null;
  pendingStackAttackerIndex?: number | null;
  /** Current remaining unused dice in this roll (up to 2 dice) */
  diceValues?: number[];
  /** Original 2 dice rolled this turn */
  rolledDice?: [number, number] | null;
  /** Most recent dice pair rolled/played for bold graphic display on board center */
  lastPlayedDice?: [number, number] | null;
  /** Backwards-compatible primary die value */
  diceValue: number | null;
  hasRolled: boolean;
  /** Consecutive [6, 6] double-6 rolls on current turn (3 cancels turn) */
  consecutiveSixes?: number;
  currentTurnPhone: string;
  currentTurnName: string;
  lastActionNote?: string;
  moveCount: number;
  status: 'pending' | 'active' | 'won' | 'draw' | 'declined' | 'cancelled';
  winnerPhone?: string;
  winnerName?: string;
  totalPot: number;
  platformFeeRate: number;
  platformFee: number;
  winnerPayout: number;
  settledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type PokerSuit = 'spades' | 'hearts' | 'diamonds' | 'clubs';
export type PokerPhase = 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';

export interface PokerCard {
  id: string;
  suit: PokerSuit;
  rank: number; // 2..14 (11=J, 12=Q, 13=K, 14=A)
}

export interface PokerGameState {
  id: string;
  chatId: string;
  gameType: 'poker';
  challengerId: string;
  challengerPhone: string;
  challengerName: string;
  challengerAvatar?: string;
  opponentPhone?: string;
  opponentName?: string;
  opponentAvatar?: string;
  isAiOpponent?: boolean;
  aiDifficulty?: 'hard';
  mode: 'friendly' | 'bet';
  betAmount: number;
  currency: CurrencyCode;
  deck: PokerCard[];
  challengerHole: PokerCard[];
  opponentHole: PokerCard[];
  communityCards: PokerCard[];
  phase: PokerPhase;
  pot: number;
  challengerChips: number;
  opponentChips: number;
  challengerBet: number;
  opponentBet: number;
  smallBlind: number;
  bigBlind: number;
  currentTurnPhone: string;
  currentTurnName: string;
  actedThisPhase: string[];
  lastActionNote?: string;
  winningHandLabel?: string;
  challengerHandLabel?: string;
  opponentHandLabel?: string;
  moveCount: number;
  status: 'pending' | 'active' | 'won' | 'draw' | 'declined' | 'cancelled';
  winnerPhone?: string;
  winnerName?: string;
  totalPot: number;
  platformFeeRate: number;
  platformFee: number;
  winnerPayout: number;
  settledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export const AGC_BILL_CATEGORIES = [
  'Store & Market',
  'Artisan Hub',
  'Errands',
  'Escrow Order',
  'Dispatch',
  'Store Tier',
  'Ajo / Esusu',
  'Creator Hub',
  'Tutors & Courses',
  'Writers Guild',
  'AfriHealth',
  'AfriLaw',
  'Pet Shop',
  'Job Board',
] as const;

export type AgcBillCategory = (typeof AGC_BILL_CATEGORIES)[number];

export interface BillRequest {
  id: string;
  chatId: string;
  title: string;
  category: AgcBillCategory;
  featureKey?: keyof FeatureFlags;
  featureRefId?: string;
  amount: number;
  currency: CurrencyCode;
  note?: string;
  requesterPhone: string;
  requesterName: string;
  requesterAvatar?: string;
  recipientPhone: string;
  recipientName: string;
  status: 'pending' | 'paid' | 'declined';
  paidByPhone?: string;
  paidByName?: string;
  paidAt?: string;
  paymentReference?: string;
  paymentChannel?: 'wallet' | 'paystack';
  createdAt: string;
}

export interface AiKnowledgeEntry {
  id: string;
  title: string;
  category: string;
  topic: string;
  sourceType: 'manual' | 'url';
  sourceUrl?: string;
  content: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
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

export interface LocationPinMeta {
  latitude: number;
  longitude: number;
  addressName?: string;
  landmarkNote?: string;
  accuracyMeters?: number;
  purpose?: 'delivery' | 'meetup' | 'artisan_call' | 'general';
  sharedAt: string;
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
    | 'scam_warning'
    | 'game_xo'
    | 'game_whot'
    | 'game_ludo'
    | 'game_poker'
    | 'bill_request'
    | 'location'
    | 'quick_poll';
  imageUrl?: string;
  imageLoaded?: boolean;
  mediaSizeKB?: number;
  /** One-time view: image disappears after first tap */
  oneTimeView?: boolean;
  /** Ghost disappearing message metadata */
  isGhost?: boolean;
  disappearingDurationMs?: number;
  expiresAt?: number;
  viewedAt?: number;
  /** @mention tokens/usernames extracted from message */
  mentions?: string[];
  voiceNote?: VoiceNoteMeta;
  product?: Product;
  order?: EscrowOrder;
  memeSticker?: MemeSticker;
  invoiceData?: InvoiceData;
  invoice?: InvoiceData;
  financialPoll?: FinancialPoll;
  quickPoll?: QuickPoll;
  ajoGroup?: AjoGroup;
  scamEntity?: ScamEntity;
  xoGame?: TicTacToeGameState;
  whotGame?: WhotGameState;
  ludoGame?: LudoGameState;
  pokerGame?: PokerGameState;
  billRequest?: BillRequest;
  locationData?: LocationPinMeta;
  metadata?: Record<string, any>;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read';
  readAt?: string;
  readBy?: string[];
  replyTo?: {
    id?: string;
    sender: string;
    text: string;
  };
  reactions?: Record<string, string[]>;
  deleted?: boolean;
  isEncrypted?: boolean;
  isForwarded?: boolean;
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
  lastMessageAtMs?: number;
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
  adminIds?: string[];
  description?: string;
  creatorId?: string;
  creatorPhone?: string;
  members?: string[];
  memberPhones?: string[];
  pendingMembers?: string[];
  pendingPhones?: string[];
  kickedPhones?: string[];
  inviteCode?: string;
  invitationStatus?: 'pending' | 'accepted' | 'declined';
  invitedBy?: string;
  isShelved?: boolean;
  label?: string;
  isBot?: boolean;
  botModel?: string;
  announceMode?: boolean;
  chatTheme?: ChatThemeId | string;
  pinnedMessage?: PinnedChatAnnouncement | null;
  unreadMentions?: number;
  lastMentionMessageId?: string;
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

export interface GroupInvitation {
  id: string;
  groupId: string;
  groupName: string;
  groupAvatar?: string;
  entityType: 'group' | 'channel';
  description?: string;
  invitedPhone: string;
  invitedByPhone: string;
  invitedByName: string;
  invitedByAvatar?: string;
  membersCount?: number;
  chatSnapshot?: ChatThread;
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
  statusType?: 'image' | 'video' | 'thought' | 'media' | 'sponsored';
  thoughtBg?: string;
  mediaUrl?: string;
  videoUrl?: string;
  caption: string;
  createdAt: string;
  /** ISO-8601 for precise live countdown e.g. 2026-11-12T14:00:00.000Z */
  createdAtISO?: string;
  expiresAt?: string;
  expiresInHours: number;
  viewsCount: number;
  likesCount: number;
  viewers: StatusViewer[];
  hasLikedByMe?: boolean;
  /** True when reshared from another user's post */
  isReshared?: boolean;
  /** Sponsored Ad fields */
  isSponsored?: boolean;
  sponsorBrand?: string;
  ctaLabel?: string;
  targetUrl?: string;
  adClicksCount?: number;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  paidAmount?: number;
  rejectionReason?: string;
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
  verificationBadge?: 'blue' | 'gold' | 'creator_plus' | 'admin' | null;
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
  status: 'finding_rider' | 'rider_assigned' | 'picked_up' | 'in_transit' | 'delivered';
  estimatedMinutes?: number;
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

export interface SecurityQuestionEntry {
  question: string;
  answer: string;
}

export interface SecuritySettings {
  hasPaymentPin: boolean;
  isPaymentPinSet?: boolean;
  paymentPin?: string;
  securityQuestion?: string;
  securityAnswer?: string;
  securityQuestions?: SecurityQuestionEntry[];
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
  approvalStatus?: 'pending' | 'approved' | 'rejected' | 'suspended';
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
  creatorPhone?: string;
  isPrivate?: boolean;
  inviteCode?: string;
  memberPhones?: string[];
  invitedPhones?: string[];
  kickedPhones?: string[];
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
  userId?: string;
  userPhone?: string;
  accountType?: 'doctor' | 'clinic';
  name: string;
  title: string;
  specialty: DoctorSpecialty;
  hospitalAffiliation: string;
  hospitalName?: string;
  licenseNumber?: string;
  phone?: string;
  city?: string;
  officeAddress?: string;
  departments?: string[];
  avatar: string;
  rating: number;
  reviewCount: number;
  consultationFee: number;
  currency: CurrencyCode;
  isAvailable: boolean;
  isVerified?: boolean;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  verificationStatus?: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  languages: string[];
  bio: string;
  createdAt?: string;
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
  userId?: string;
  userPhone?: string;
  phone?: string;
  name: string;
  title: string;
  firm: string;
  firmName?: string;
  specialty: LawyerSpecialty;
  specializations?: string[];
  avatar: string;
  barNumber: string;
  supremeCourtNumber?: string;
  yearsExperience: number;
  consultationFee: number;
  currency: CurrencyCode;
  isAvailable: boolean;
  location: string;
  officeAddress?: string;
  city?: string;
  verifiedLicense: boolean;
  isVerified?: boolean;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  verificationStatus?: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  rating?: number;
  bio: string;
  createdAt?: string;
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
  approvalStatus?: 'pending' | 'approved' | 'rejected' | 'suspended';
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
  approvalStatus?: 'pending' | 'approved' | 'rejected' | 'suspended';
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
  username?: string;
  phoneNumber: string;
  avatarUrl: string;
  role: 'user' | 'creator' | 'merchant' | 'admin';
  verificationBadge?: 'blue' | 'gold' | 'creator_plus' | 'admin' | null;
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
  suspendedAt?: string;
  suspendedUntil?: string;
  suspensionReason?: string;
  kycStatus?: 'unverified' | 'pending' | 'verified' | 'rejected';
  kycType?: 'BVN' | 'NIN';
  adminWalletAdjustedAt?: string;
  updatedAt?: string;
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
  sponsoredAdFeeNgn?: number;
  lowBandwidthDefault: boolean;
  supportContactPhone: string;
}

export interface FeatureFlags {
  // Master Financials
  wallet: boolean;          // Master dependency hub: if off, disables all money-related features
  escrow: boolean;          // requires wallet
  securityPin?: boolean;

  // Services & 9-Dot Menu Hub
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
  tasks?: boolean;          // requires wallet
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

export interface SponsoredStatusAd {
  id: string;
  brandName: string;
  avatarUrl?: string;
  mediaUrl: string;
  caption: string;
  ctaLabel: string;
  targetUrl: string;
  active: boolean;
  status?: 'pending' | 'approved' | 'rejected';
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  submittedByPhone?: string;
  submittedByName?: string;
  paidAmount?: number;
  paymentReference?: string;
  rejectionReason?: string;
  clicksCount?: number;
  createdAt: string;
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
  sponsoredStatuses?: SponsoredStatusAd[];
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
  userPhone?: string;
  name: string;
  phone: string;
  ninOrIdRef?: string;
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
  isVerified?: boolean;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  verificationStatus?: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  createdAt?: string;
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

// 32. Outside Events, Parties, Nightlife & RSVP Ticket Passes
export type OutsideCategory = 'party' | 'concert' | 'rave' | 'tech_mixer' | 'rooftop' | 'hangout';

export interface OutsideParty {
  id: string;
  organizerId: string;
  organizerName: string;
  organizerPhone?: string;
  organizerAvatar?: string;
  organizerVerified?: boolean;
  title: string;
  description: string;
  category: OutsideCategory;
  city: string;
  venueName: string;
  address: string;
  lat: number | null;
  lng: number | null;
  isPaid: boolean;
  ticketPrice: number;
  currency: CurrencyCode;
  maxCapacity: number | null;
  rsvpCount: number;
  flyerUrl: string;
  eventDate: string;
  createdAt: string;
}

export interface OutsideRsvp {
  id: string;
  partyId: string;
  userId: string;
  userName: string;
  userPhone?: string;
  ticketCode: string;
  status: 'confirmed' | 'checked_in' | 'cancelled';
  paymentMethod: 'free' | 'wallet' | 'paystack';
  paymentReference?: string;
  amountPaid: number;
  checkedInAt?: string;
  createdAt: string;
}

// 33. Task-to-Earn Micro-Task Bounty Campaigns (70% Worker Pool / 30% Platform Fee)
export type TaskBountyCategory =
  | 'youtube'
  | 'instagram'
  | 'tiktok'
  | 'twitter'
  | 'music'
  | 'app'
  | 'other';

export type TaskBountySubmissionStatus = 'pending' | 'approved' | 'rejected';

export interface TaskBountySubmission {
  id: string;
  taskId: string;
  workerId?: string;
  workerName: string;
  workerPhone: string;
  workerAvatar?: string;
  proofUsername: string;
  proofScreenshot: string;
  note?: string;
  status: TaskBountySubmissionStatus;
  adminNote?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  payoutAmount: number;
  payoutReference?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskBountyCampaign {
  id: string;
  title: string;
  category: TaskBountyCategory;
  targetUrl?: string;
  instructions: string;
  platformHandleHint: string;
  creatorId?: string;
  creatorName: string;
  creatorPhone: string;
  creatorAvatar?: string;
  totalStake: number;
  systemFeePercent: number;
  systemFeeAmount: number;
  rewardPool: number;
  rewardPerTask: number;
  maxSlots: number;
  approvedCount: number;
  pendingCount: number;
  rejectedCount: number;
  remainingEscrow: number;
  currency: CurrencyCode;
  status: 'active' | 'completed' | 'closed';
  submissions: TaskBountySubmission[];
  mySubmission?: TaskBountySubmission | null;
  createdAt: string;
  updatedAt: string;
}


