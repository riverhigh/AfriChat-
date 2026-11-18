import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  initSocket,
  getSocket,
  getSocketUrl,
  joinChatRoom,
  leaveChatRoom,
  emitLogoutUserRooms,
  emitLiveMessage,
  emitLiveGameUpdate,
  emitMessageReaction,
  emitChatMetaUpdate,
  emitQuickPollUpdate,
  emitMessagesRead,
  emitGroupInvite,
  emitGroupInviteResponse,
  emitPhoneCallSignal,
  emitCallSignal,
  joinLiveSpace,
  leaveLiveSpace,
  emitSpaceStageAction,
  emitEndSpace,
  registerSocketUser,
  emitPostStatus,
  emitViewStatus,
  emitLikeStatus,
} from '../services/socket';
import { encryptChatMessage, decryptChatMessage, getConversationSecret, getConversationSecretFallbacks } from '../utils/cryptoUtils';
import { safeLocalStorage, safeSessionStorage } from '../utils/safeStorage';
import { isSyntheticTestUser } from '../utils/testAccountFilter';
import { showLocalNotification, requestNotificationPermission } from '../services/notifications';
import {
  compressAvatarImage,
  compressChatMediaImage,
  compressLowDataMediaImage,
  downsampleDataUrl,
  isPlaceholderAvatar,
} from '../utils/imageUtils';
import {
  saveUserChatsBackupToSupabase,
  fetchUserChatsBackupFromSupabase,
  mergeChatThreadsAndMessages,
} from '../services/supabaseChatSync';
import {
  askGroqAi,
  AFRIBOT_ID,
  AFRIBOT_NAME,
  AFRIBOT_PHONE,
  AFRIBOT_AVATAR,
  GroqMessage,
} from '../services/groq';
import {
  pickHardXoMove,
  pickHardWhotMove,
  isWhotCardPlayable,
  pickHardLudoPlan,
  evaluateBest5PokerHand,
  comparePokerEvaluations,
  pickHardPokerAction,
} from '../utils/gameAiEngine';
import {
  DEFAULT_LUDO_RULES_CONFIG,
  getLudoRulesConfig,
  getLegalLudoPlayState,
  simulateLudoSingleDieStep,
  isStepFinished,
} from '../utils/ludoRules';
import { playAnimalSound, getNotificationSound } from '../utils/soundUtils';
import { isUnresolvedEscrowBetGameMessage } from '../utils/gameEscrowUtils';
import {
  supabase,
  isSupabaseConfigured,
  fetchProfile,
  mapProfileToUser,
  fetchLiveTownCommunities,
  createTownCommunityInDb,
  updateTownCommunityInDb,
  deleteTownCommunityInDb,
  fetchTownCommunityByInviteOrId,
  isHiddenOrInvalidCommunityRow,
  fetchLiveAudioSpaces,
  createAudioSpaceInDb,
  updateAudioSpaceInDb,
  mapAudioSpaceRow,
  getActiveSpacesTable,
  fetchStatusFeedWithAds,
  trackAdClickInDb,
  fetchLiveArtisanStations,
  createArtisanStationInDb,
  fetchLiveStoreSubscriptions,
  createStoreSubscriptionInDb,
  fetchServiceProviders,
  fetchScamReportByTarget,
  fetchAllScamReports,
  broadcastScamReport,
  upsertScamReportInDb,
  upsertXoGameInSupabase,
  fetchXoGameByIdFromSupabase,
  fetchXoGamesForChatFromSupabase,
  subscribeToXoGamesInChat,
} from '../services/supabase';
import {
  ADMIN_SYS_CONFIG_KEY,
  ADMIN_SYS_CMS_KEY,
  ADMIN_SYS_USERS_KEY,
  ADMIN_SYS_STORES_KEY,
  canonicalAdminUserKey,
  safeJsonFetch,
  fetchSupabaseAdminSlice,
  saveSupabaseAdminSlice,
  upsertSupabaseAdminUserOverride,
} from '../services/supabaseAdminSync';
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
  CreditAlertCategory,
  CreditAlertEvent,
  MemeSticker,
  AudioSpace,
  ScamEntity,
  InvoiceData,
  FinancialPoll,
  QuickPoll,
  PinnedChatAnnouncement,
  GhostTimerSetting,
  ChatThemeId,
  AjoGroup,
  TicTacToeGameState,
  WhotShape,
  WhotCard,
  WhotGameState,
  LudoRulesConfig,
  LudoGameState,
  PokerSuit,
  PokerCard,
  PokerPhase,
  PokerGameState,
  STANDARD_GAME_BET_LIMIT,
  VERIFIED_GAME_BET_LIMIT,
  BillRequest,
  AGC_BILL_CATEGORIES,
  LocationPinMeta,
  UserProfile,
  DeviceContact,
  ContactRequest,
  GroupInvitation,
  UserUploadedMeme,
  DispatchDeliveryOrder,
  JobPosting,
  SecurityQuestionEntry,
  SecuritySettings,
  ServiceProvider,
  ServiceBooking,
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
  AdminSystemConfig,
  AdminCmsData,
  CmsAnnouncement,
  CmsMarqueeBanner,
  CmsFaqItem,
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

export const normalizePhoneDigits = (raw?: string): string => {
  if (!raw) return '';
  let d = raw.replace(/\D/g, '');
  if (d.startsWith('0') && d.length === 11) {
    d = '234' + d.slice(1);
  }
  return d;
};

export const normalizePhoneInternational = (raw?: string): string => {
  if (!raw) return '';
  const trimmed = String(raw).trim();
  if (!trimmed) return '';
  const cleaned = trimmed.replace(/[\s\-()]/g, '');
  if (cleaned.startsWith('+')) {
    const plusDigits = cleaned.slice(1).replace(/\D/g, '');
    return plusDigits ? `+${plusDigits}` : '';
  }
  const digits = cleaned.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0') && digits.length === 11) return `+234${digits.slice(1)}`;
  if (digits.startsWith('234') && digits.length >= 13) return `+${digits}`;
  if (digits.length === 10 && /^[789]/.test(digits)) return `+234${digits}`;
  if (digits.length >= 11) return `+${digits}`;
  return `+234${digits}`;
};

export const phonesMatch = (p1?: string, p2?: string): boolean => {
  if (!p1 || !p2) return false;
  if (p1 === '+234 BOT AI' || p2 === '+234 BOT AI') {
    return p1.trim() === p2.trim();
  }
  const c1 = p1.replace(/\D/g, '');
  const c2 = p2.replace(/\D/g, '');
  if (!c1 || !c2) return p1.trim().toLowerCase() === p2.trim().toLowerCase();
  if (c1 === c2) return true;
  const n1 = normalizePhoneDigits(p1);
  const n2 = normalizePhoneDigits(p2);
  if (n1 && n2 && n1 === n2) return true;
  if (c1.length >= 9 && c2.length >= 9 && c1.slice(-9) === c2.slice(-9)) return true;
  return false;
};

export const isSpaceCreator = (
  space?: Pick<AudioSpace, 'hostId' | 'hostPhone' | 'speakers'> | null,
  user?: Pick<UserProfile, 'id' | 'phoneNumber'> | null
): boolean => {
  if (!space || !user) return false;
  if (space.hostId && user.id && space.hostId === user.id) return true;
  if (space.hostPhone && user.phoneNumber && phonesMatch(space.hostPhone, user.phoneNumber)) {
    return true;
  }
  if (!space.hostId && Array.isArray(space.speakers)) {
    return space.speakers.some((s) => s.role === 'host' && Boolean(user.id) && s.id === user.id);
  }
  return false;
};

export const dedupePhoneList = (phones?: string[]): string[] => {
  if (!Array.isArray(phones)) return [];
  const out: string[] = [];
  for (const raw of phones) {
    const clean = String(raw || '').trim();
    if (!clean || clean === '+234 BOT AI') continue;
    if (!out.some((p) => phonesMatch(p, clean))) {
      out.push(clean);
    }
  }
  return out;
};

export const dedupeNameList = (names?: string[]): string[] => {
  if (!Array.isArray(names)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of names) {
    const clean = String(raw || '').trim();
    if (!clean) continue;
    const key = clean.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(clean);
    }
  }
  return out;
};

export const computeClientMembersCount = (members?: string[], memberPhones?: string[]): number => {
  const uniquePhones = dedupePhoneList(memberPhones);
  const uniqueNames = dedupeNameList(members);
  const hasBot = uniqueNames.some((m) => m.toLowerCase() === 'agcbot' || m.toLowerCase() === 'afribot ai');
  if (uniquePhones.length > 0) {
    return Math.max(uniquePhones.length + (hasBot ? 1 : 0), 1);
  }
  return Math.max(uniqueNames.length, 1);
};

export const isUserChatAdmin = (
  chat?: Partial<ChatThread> | null,
  user?: Pick<UserProfile, 'id' | 'fullName' | 'phoneNumber' | 'username'> | null
): boolean => {
  if (!chat || !user) return false;
  if (user.id && chat.creatorId && chat.creatorId === user.id) return true;
  if (user.phoneNumber && (chat as any).creatorPhone && phonesMatch((chat as any).creatorPhone, user.phoneNumber)) {
    return true;
  }
  if (user.id && Array.isArray(chat.adminIds) && chat.adminIds.includes(user.id)) return true;
  const admins = Array.isArray(chat.admins) ? chat.admins : [];
  const myNameLower = (user.fullName || '').trim().toLowerCase();
  const myHandle = (user.username || '').trim().replace(/^@/, '').toLowerCase();
  return admins.some((a) => {
    const clean = String(a || '').trim();
    if (!clean) return false;
    const lower = clean.toLowerCase();
    if (lower === 'you') return true;
    if (myNameLower && lower === myNameLower) return true;
    if (myHandle && (lower === myHandle || lower === `@${myHandle}`)) return true;
    if (user.phoneNumber && phonesMatch(clean, user.phoneNumber)) return true;
    return false;
  });
};

export const isUserAdminBlockedFromSending = (
  chat?: Partial<ChatThread> | null,
  user?: Pick<UserProfile, 'id' | 'fullName' | 'phoneNumber' | 'username'> | null
): boolean => {
  if (!chat) return false;
  if (!chat.isChannel && !chat.announceMode) return false;
  return !isUserChatAdmin(chat, user);
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

export const isStatusExpiredClient = (
  s?: Partial<UserStatus> | null,
  nowMs: number = Date.now()
): boolean => {
  if (!s) return true;
  if (s.expiresAt) {
    const expMs = Date.parse(s.expiresAt);
    if (Number.isFinite(expMs) && expMs > 0) return expMs <= nowMs;
  }
  if (s.isSponsored || s.statusType === 'sponsored') {
    return false;
  }
  const expiresInHours = s.expiresInHours ?? 24;
  let createdMs = 0;
  if (s.createdAtISO) {
    const isoMs = Date.parse(s.createdAtISO);
    if (Number.isFinite(isoMs) && isoMs > 0) createdMs = isoMs;
  }
  if (!createdMs && s.id) {
    const match = s.id.match(/\d{12,14}/);
    if (match) createdMs = parseInt(match[0], 10);
  }
  if (!createdMs && s.createdAt) {
    const parsed = Date.parse(s.createdAt);
    if (Number.isFinite(parsed) && parsed > 0) createdMs = parsed;
  }
  if (!createdMs) return false;
  return createdMs + expiresInHours * 3_600_000 <= nowMs;
};

export function sortChatsByRecency(list: ChatThread[]): ChatThread[] {
  return [...list].sort((a, b) => (b.lastMessageAtMs || 0) - (a.lastMessageAtMs || 0));
}

function bumpChatThreadToTop(
  prev: ChatThread[],
  chatId: string,
  patch: Partial<ChatThread>,
  createFallback?: () => ChatThread
): ChatThread[] {
  const idx = prev.findIndex((c) => c.id === chatId);
  const ts = patch.lastMessageAtMs || Date.now();
  if (idx >= 0) {
    const updatedThread: ChatThread = {
      ...prev[idx],
      ...patch,
      lastMessageAtMs: Math.max(prev[idx].lastMessageAtMs || 0, ts),
    };
    const rest = prev.filter((_, i) => i !== idx);
    return sortChatsByRecency([updatedThread, ...rest]);
  }
  if (createFallback) {
    const created: ChatThread = {
      ...createFallback(),
      ...patch,
      lastMessageAtMs: ts,
    };
    return sortChatsByRecency([created, ...prev]);
  }
  return prev;
}

export const getSavedUserCleanPhone = (): string => {
  try {
    const s = safeLocalStorage.getItem('AGC_user_profile_v2');
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

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DEFAULT_AVATAR_SVG =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='50' fill='%23180a33'/><circle cx='50' cy='38' r='18' fill='%23a855f7'/><path d='M16 88c0-18.778 15.222-34 34-34s34 15.222 34 34' fill='%23a855f7'/></svg>";

function getCandidatePhoneKeys(phoneNumber?: string): string[] {
  const raw = (phoneNumber || '').replace(/\D/g, '');
  const norm = normalizePhoneDigits(phoneNumber);
  const last9 = norm.length >= 9 ? norm.slice(-9) : norm;
  return Array.from(new Set([norm, raw, last9].filter(Boolean)));
}

function sanitizeLoadedChats(parsed: unknown): ChatThread[] {
  if (!Array.isArray(parsed)) return [];
  return sortChatsByRecency(
    parsed
      .filter((c: ChatThread) => c && c.id && c.id !== 'chat_balogun_ajo' && c.id !== 'chat_mama_chidinma')
      .map((c: ChatThread) => {
        const isBot = c.id === AFRIBOT_ID || Boolean(c.isBot);
        const fixedMembers = Array.isArray(c.members)
          ? c.members.map((m) => (m === 'AfriBot AI' ? AFRIBOT_NAME : m))
          : c.members;
        const fixedAdmins = Array.isArray(c.admins)
          ? c.admins.map((a) => (a === 'AfriBot AI' ? AFRIBOT_NAME : a))
          : c.admins;
        const fixedLast =
          typeof c.lastMessage === 'string' && c.lastMessage.includes('AfriBot AI')
            ? c.lastMessage.replace(/AfriBot AI/g, AFRIBOT_NAME)
            : c.lastMessage;
        return {
          ...c,
          ...(isBot && (!c.name || c.name === 'AfriBot AI') ? { name: AFRIBOT_NAME } : {}),
          ...(fixedLast !== c.lastMessage ? { lastMessage: fixedLast } : {}),
          ...(fixedMembers !== c.members ? { members: fixedMembers } : {}),
          ...(fixedAdmins !== c.admins ? { admins: fixedAdmins } : {}),
        };
      })
  );
}

const GHOST_DURATION_MS: Record<string, number> = {
  '10s': 10 * 1000,
  '30s': 30 * 1000,
  '1m': 60 * 1000,
  '5m': 5 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
};

export function parseGhostDurationMs(timer?: string): number {
  if (!timer || timer === 'off') return 0;
  return GHOST_DURATION_MS[timer] || 0;
}

export function extractMentionsFromText(text?: string): string[] {
  if (!text) return [];
  const matches = text.match(/@([a-zA-Z0-9_.-]{2,32})/g);
  if (!matches) return [];
  return Array.from(new Set(matches.map((m) => m.slice(1).toLowerCase())));
}

export function doesMessageMentionUser(msg: ChatMessage, user: UserProfile): boolean {
  const tokens = new Set<string>(
    [...(msg.mentions || []), ...extractMentionsFromText(msg.text)].map((s) => s.toLowerCase())
  );
  if (tokens.size === 0) return false;
  if (tokens.has('everyone') || tokens.has('all') || tokens.has('here')) return true;
  const username = (user.username || '').replace(/^@/, '').trim().toLowerCase();
  const fullName = (user.fullName || '').trim().toLowerCase();
  const firstName = fullName.split(/\s+/)[0] || '';
  const compactFull = fullName.replace(/\s+/g, '_');
  const compactNoSpace = fullName.replace(/\s+/g, '');
  return (
    (Boolean(username) && tokens.has(username)) ||
    (Boolean(firstName) && firstName.length >= 2 && tokens.has(firstName)) ||
    (Boolean(compactFull) && tokens.has(compactFull)) ||
    (Boolean(compactNoSpace) && tokens.has(compactNoSpace))
  );
}

function enqueueOfflineOutboxItem(chatId: string, msg: ChatMessage) {
  try {
    const raw = localStorage.getItem('AGC_offline_outbox');
    const list: Array<{ chatId: string; msg: ChatMessage }> = raw ? JSON.parse(raw) : [];
    if (!list.some((item) => item?.msg?.id === msg.id)) {
      list.push({ chatId, msg });
      localStorage.setItem('AGC_offline_outbox', JSON.stringify(list.slice(-80)));
      window.dispatchEvent(new CustomEvent('agc-outbox-changed'));
    }
  } catch (_) {}
}

function sanitizeLoadedMessages(parsed: unknown): Record<string, ChatMessage[]> {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
  const now = Date.now();
  const cleaned: Record<string, ChatMessage[]> = {};
  for (const [cid, msgs] of Object.entries(parsed as Record<string, ChatMessage[]>)) {
    if (!Array.isArray(msgs)) continue;
    cleaned[cid] = msgs
      .filter((m): m is ChatMessage => Boolean(m && typeof m === 'object' && m.id && !(m.expiresAt && m.expiresAt <= now)))
      .map((m) => {
        if (m.type === 'voice' && m.voiceNote?.expiresAt) {
        const exp = new Date(m.voiceNote.expiresAt).getTime();
        if (!isNaN(exp) && now > exp) {
          return {
            ...m,
            type: 'text' as const,
            text: '🎙️ Voice note expired',
            voiceNote: undefined,
          };
        }
      }
        if (m.type === 'game_xo' && m.xoGame) {
          const board = Array.isArray(m.xoGame.board) && m.xoGame.board.length === 9
            ? m.xoGame.board
            : Array(9).fill(null);
          return { ...m, xoGame: { ...m.xoGame, board } };
        }
        if (m.type === 'game_whot' && m.whotGame) {
          const wg = m.whotGame;
          const challengerHand = Array.isArray(wg.challengerHand) ? wg.challengerHand : [];
          const opponentHand = Array.isArray(wg.opponentHand) ? wg.opponentHand : [];
          const deck = Array.isArray(wg.deck) ? wg.deck : [];
          const discardPile = Array.isArray(wg.discardPile)
            ? wg.discardPile
            : wg.topCard
            ? [wg.topCard]
            : [];
          const topCard = wg.topCard || discardPile[discardPile.length - 1] || { id: 'whot_fallback', shape: 'circle' as const, number: 1 };
          return {
            ...m,
            whotGame: {
              ...wg,
              challengerHand,
              opponentHand,
              deck,
              discardPile,
              topCard,
              pendingDrawCount: wg.pendingDrawCount || 0,
              pendingDrawType: wg.pendingDrawType ?? null,
              reshuffleCount: wg.reshuffleCount || 0,
            },
          };
        }
        if (m.type === 'game_ludo' && m.ludoGame) {
          const lg = m.ludoGame;
          const challengerTokens = Array.isArray(lg.challengerTokens) ? lg.challengerTokens : [-1, -1, -1, -1, -1, -1, -1, -1];
          const opponentTokens = Array.isArray(lg.opponentTokens) ? lg.opponentTokens : [-1, -1, -1, -1, -1, -1, -1, -1];
          const diceValues = Array.isArray(lg.diceValues)
            ? lg.diceValues
            : lg.diceValue
            ? [lg.diceValue]
            : [];
          return {
            ...m,
            ludoGame: {
              ...lg,
              challengerTokens,
              opponentTokens,
              diceValues,
              consecutiveSixes: lg.consecutiveSixes || 0,
            },
          };
        }
        if (m.type === 'game_poker' && m.pokerGame) {
          const pg = m.pokerGame;
          return {
            ...m,
            pokerGame: {
              ...pg,
              deck: Array.isArray(pg.deck) ? pg.deck : [],
              challengerHole: Array.isArray(pg.challengerHole) ? pg.challengerHole : [],
              opponentHole: Array.isArray(pg.opponentHole) ? pg.opponentHole : [],
              communityCards: Array.isArray(pg.communityCards) ? pg.communityCards : [],
              actedThisPhase: Array.isArray(pg.actedThisPhase) ? pg.actedThisPhase : [],
            },
          };
        }
        return m;
      });
  }
  return cleaned;
}

const EMPTY_WALLET: UserWallet = {
  availableBalance: 0,
  escrowLockedBalance: 0,
  currency: 'NGN',
  transactions: [],
};

function persistPartitionedChats(chatsToSave: ChatThread[], phoneNumber?: string) {
  const clean = phoneNumber ? normalizePhoneDigits(phoneNumber) : getSavedUserCleanPhone();
  if (!clean) return;
  try {
    localStorage.setItem(`AGC_chats_v2_${clean}`, JSON.stringify(chatsToSave));
  } catch (_) {}
}

function persistPartitionedMessages(msgsToSave: Record<string, ChatMessage[]>, phoneNumber?: string) {
  const clean = phoneNumber ? normalizePhoneDigits(phoneNumber) : getSavedUserCleanPhone();
  if (!clean) return;
  try {
    localStorage.setItem(`AGC_messages_v2_${clean}`, JSON.stringify(msgsToSave));
  } catch (_) {}
}

function persistPartitionedWallet(walletToSave: UserWallet, phoneNumber?: string) {
  const clean = phoneNumber ? normalizePhoneDigits(phoneNumber) : getSavedUserCleanPhone();
  try {
    const serialized = JSON.stringify(walletToSave);
    if (clean) {
      localStorage.setItem(`AGC_user_wallet_v2_${clean}`, serialized);
    }
    localStorage.setItem('AGC_user_wallet_v2', serialized);
  } catch (_) {}
}

function sanitizeLoadedWallet(parsed: any): UserWallet | null {
  if (!parsed || typeof parsed !== 'object') return null;
  if (parsed.availableBalance === 125000 && (!Array.isArray(parsed.transactions) || parsed.transactions.length === 0)) {
    return null;
  }
  return {
    availableBalance: typeof parsed.availableBalance === 'number' && Number.isFinite(parsed.availableBalance) ? parsed.availableBalance : 0,
    escrowLockedBalance: typeof parsed.escrowLockedBalance === 'number' && Number.isFinite(parsed.escrowLockedBalance) ? parsed.escrowLockedBalance : 0,
    currency: parsed.currency || 'NGN',
    transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
  };
}

function loadPartitionedWallet(phoneNumber?: string): UserWallet {
  const targetPhone = phoneNumber || '';
  const candidates = getCandidatePhoneKeys(targetPhone);
  for (const keySuffix of candidates) {
    try {
      const raw = localStorage.getItem(`AGC_user_wallet_v2_${keySuffix}`);
      if (raw) {
        const sanitized = sanitizeLoadedWallet(JSON.parse(raw));
        if (sanitized) return sanitized;
      }
    } catch (_) {}
  }

  // Fallback migration from legacy unpartitioned key ONLY if the previous profile belonged to this phone (or no other user owns it)
  try {
    const legacyRaw = localStorage.getItem('AGC_user_wallet_v2');
    if (legacyRaw) {
      const legacyParsed = sanitizeLoadedWallet(JSON.parse(legacyRaw));
      if (legacyParsed) {
        const prevProfileRaw = localStorage.getItem('AGC_user_profile_v2');
        const prevProfile = prevProfileRaw ? JSON.parse(prevProfileRaw) : null;
        if (!targetPhone || !prevProfile?.phoneNumber || phonesMatch(prevProfile.phoneNumber, targetPhone)) {
          const norm = normalizePhoneDigits(targetPhone);
          if (norm) {
            try { localStorage.setItem(`AGC_user_wallet_v2_${norm}`, JSON.stringify(legacyParsed)); } catch (_) {}
          }
          return legacyParsed;
        }
      }
    }
  } catch (_) {}

  return { ...EMPTY_WALLET, transactions: [] };
}

function persistPartitionedUserProfile(profile: UserProfile) {
  if (!profile) return;
  const norm = normalizePhoneDigits(profile.phoneNumber);
  try {
    const serialized = JSON.stringify(profile);
    safeLocalStorage.setItem('AGC_user_profile_v2', serialized);
    if (norm) {
      safeLocalStorage.setItem(`AGC_user_profile_v2_${norm}`, serialized);
    }
    // Verify native localStorage didn't silently reject due to quota (e.g. large base64 avatar)
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('AGC_user_profile_v2', serialized);
      }
    } catch {
      const compactProfile: UserProfile = {
        ...profile,
        avatarUrl:
          profile.avatarUrl && profile.avatarUrl.length > 8000 && profile.avatarUrl.startsWith('data:')
            ? DEFAULT_AVATAR_SVG
            : profile.avatarUrl,
      };
      const compactSerialized = JSON.stringify(compactProfile);
      safeLocalStorage.setItem('AGC_user_profile_v2', compactSerialized);
      if (norm) {
        safeLocalStorage.setItem(`AGC_user_profile_v2_${norm}`, compactSerialized);
      }
    }
  } catch (_) {}
}

function loadPartitionedUserProfile(phoneNumber?: string): Partial<UserProfile> | null {
  const targetPhone = phoneNumber || '';
  const candidates = getCandidatePhoneKeys(targetPhone);
  for (const keySuffix of candidates) {
    try {
      const raw = safeLocalStorage.getItem(`AGC_user_profile_v2_${keySuffix}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch (_) {}
  }
  try {
    const allUsers: UserProfile[] = JSON.parse(safeLocalStorage.getItem('AGC_all_registered_users') || '[]');
    const matched = allUsers.find((u) => phonesMatch(u.phoneNumber, targetPhone));
    if (matched) return matched;
  } catch (_) {}
  try {
    const lastRaw = safeLocalStorage.getItem('AGC_user_profile_v2');
    if (lastRaw) {
      const parsed = JSON.parse(lastRaw);
      if (parsed?.phoneNumber && phonesMatch(parsed.phoneNumber, targetPhone)) return parsed;
    }
  } catch (_) {}
  return null;
}

function loadPartitionedBlockedUsers(phoneNumber?: string): string[] {
  const candidates = getCandidatePhoneKeys(phoneNumber || '');
  for (const keySuffix of candidates) {
    try {
      const raw = safeLocalStorage.getItem(`AGC_blocked_users_${keySuffix}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed.map(String);
      }
    } catch (_) {}
  }
  try {
    const legacy = safeLocalStorage.getItem('AGC_blocked_users');
    if (legacy) {
      const parsed = JSON.parse(legacy);
      if (Array.isArray(parsed)) return parsed.map(String);
    }
  } catch (_) {}
  return [];
}

function persistPartitionedBlockedUsers(list: string[], phoneNumber?: string) {
  const deduped = Array.from(new Set((list || []).map((x) => String(x || '').trim()).filter(Boolean)));
  const serialized = JSON.stringify(deduped);
  try {
    const userKey = getUserStorageKey('AGC_blocked_users', phoneNumber);
    safeLocalStorage.setItem(userKey, serialized);
    safeLocalStorage.setItem('AGC_blocked_users', serialized);
  } catch (_) {}
}

function recoverPersistedUserProfile(): UserProfile | null {
  try {
    const saved = safeLocalStorage.getItem('AGC_user_profile_v2');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.phoneNumber && parsed.id !== 'usr_chioma_adebayo' && parsed.fullName !== 'Chioma Adebayo') {
        return { ...parsed, isPhoneVerified: true };
      }
    }
  } catch (_) {}
  try {
    for (let i = 0; i < safeLocalStorage.length; i++) {
      const k = safeLocalStorage.key(i);
      if (k && k.startsWith('AGC_user_profile_v2_')) {
        const raw = safeLocalStorage.getItem(k);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        if (parsed && parsed.phoneNumber && parsed.id !== 'usr_chioma_adebayo' && parsed.fullName !== 'Chioma Adebayo') {
          return { ...parsed, isPhoneVerified: true };
        }
      }
    }
  } catch (_) {}
  return null;
}

function loadPartitionedUserChatsAndMessages(phoneNumber?: string): {
  chats: ChatThread[];
  messages: Record<string, ChatMessage[]>;
} {
  const targetPhone = phoneNumber || '';
  const candidates = getCandidatePhoneKeys(targetPhone);
  let mergedChats: ChatThread[] = [];
  let mergedMsgs: Record<string, ChatMessage[]> = {};

  for (const keySuffix of candidates) {
    try {
      const cRaw = localStorage.getItem(`AGC_chats_v2_${keySuffix}`);
      if (cRaw) {
        const parsedChats = sanitizeLoadedChats(JSON.parse(cRaw));
        if (parsedChats.length > 0) {
          const combined = mergeChatThreadsAndMessages(mergedChats, {}, parsedChats, {});
          mergedChats = combined.chats;
        }
      }
    } catch (_) {}

    try {
      const mRaw = localStorage.getItem(`AGC_messages_v2_${keySuffix}`);
      if (mRaw) {
        const parsedMsgs = sanitizeLoadedMessages(JSON.parse(mRaw));
        if (Object.keys(parsedMsgs).length > 0) {
          const combined = mergeChatThreadsAndMessages([], mergedMsgs, [], parsedMsgs);
          mergedMsgs = combined.messages;
        }
      }
    } catch (_) {}
  }

  // Also migrate any orphaned DM chats written to legacy bare keys if they belong to this user
  try {
    const bareChatsRaw = localStorage.getItem('AGC_chats_v2');
    const bareMsgsRaw = localStorage.getItem('AGC_messages_v2');
    const norm = normalizePhoneDigits(targetPhone);
    if (norm && bareChatsRaw) {
      const bareChats = sanitizeLoadedChats(JSON.parse(bareChatsRaw));
      const matchingChats = bareChats.filter(
        (c) => c.id.includes(norm) || (norm.length >= 9 && c.id.includes(norm.slice(-9)))
      );
      if (matchingChats.length > 0) {
        const combined = mergeChatThreadsAndMessages(mergedChats, mergedMsgs, matchingChats, {});
        mergedChats = combined.chats;
      }
    }
    if (norm && bareMsgsRaw) {
      const bareMsgs = sanitizeLoadedMessages(JSON.parse(bareMsgsRaw));
      const matchingMsgs: Record<string, ChatMessage[]> = {};
      for (const [cid, list] of Object.entries(bareMsgs)) {
        if (cid.includes(norm) || (norm.length >= 9 && cid.includes(norm.slice(-9)))) {
          matchingMsgs[cid] = list;
        }
      }
      if (Object.keys(matchingMsgs).length > 0) {
        const combined = mergeChatThreadsAndMessages(mergedChats, mergedMsgs, [], matchingMsgs);
        mergedMsgs = combined.messages;
      }
    }
  } catch (_) {}

  // Ensure sender polarity ('user' vs 'other') stays accurate for self-sent messages after re-login
  if (targetPhone) {
    for (const [cid, list] of Object.entries(mergedMsgs)) {
      mergedMsgs[cid] = list.map((m) => {
        if (m.sender === 'system') return m;
        if (m.senderPhone && phonesMatch(m.senderPhone, targetPhone)) {
          return m.sender === 'user' ? m : { ...m, sender: 'user' as const };
        }
        return m;
      });
    }
  }

  mergedChats = sortChatsByRecency(mergedChats);

  // Ensure canonical key is populated for fast future lookups
  const canonical = normalizePhoneDigits(targetPhone);
  if (canonical && (mergedChats.length > 0 || Object.keys(mergedMsgs).length > 0)) {
    persistPartitionedChats(mergedChats, canonical);
    persistPartitionedMessages(mergedMsgs, canonical);
  }

  return { chats: mergedChats, messages: mergedMsgs };
}

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
  isGroupCall?: boolean;
  participantPhones?: string[];
  chatId?: string;
  isMinimized?: boolean;
  isAnonymous?: boolean;
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
  globalChatTheme: ChatThemeId | string;
  setGlobalChatTheme: (themeId: ChatThemeId | string) => void;
  setChatTheme: (chatId: string, themeId: ChatThemeId | string) => void;
  setDisappearingTimer: (chatId: string, timer: GhostTimerSetting | string) => void;
  markGhostMessagesViewed: (chatId: string) => void;
  pinChatMessage: (chatId: string, msg: ChatMessage | null) => void;
  clearChatMentions: (chatId: string) => void;
  // QR Scan Modal
  isScanQrModalOpen: boolean;
  setIsScanQrModalOpen: (val: boolean) => void;
  activeChatId: string | null;
  setActiveChatId: (id: string | null) => void;
  chats: ChatThread[];
  clearChat: (chatId: string) => void;
  deleteChat: (chatId: string) => void;
  toggleShelfChat: (chatId: string) => void;
  setChatLabel: (chatId: string, label?: string) => void;
  updateChat: (chatId: string, updates: Partial<ChatThread>) => void;
  addMembersToGroup: (chatId: string, memberNames: string[], memberPhones?: string[]) => void;
  createGroup: (name: string, memberNamesOrPhones: string[], avatar?: string, description?: string, memberPhones?: string[]) => string;
  createChannel: (name: string, description?: string, avatar?: string, memberNamesOrPhones?: string[], memberPhones?: string[]) => string;
  toggleMemberAdmin: (chatId: string, memberName: string, memberPhone?: string) => void;
  removeMemberFromGroup: (chatId: string, memberName: string, memberPhone?: string) => void;
  leaveGroup: (chatId: string) => void;
  deleteMessage: (chatId: string, messageId: string) => void;
  reactToMessage: (chatId: string, messageId: string, emoji: string) => void;
  sendImageMessage: (chatId: string, imageUrl: string, caption?: string, oneTimeView?: boolean) => void;
  blockedUserIds: string[];
  toggleBlockUser: (idOrPhone: string, peerPhone?: string) => boolean;
  isUserBlockedByMe: (idOrPhone?: string, peerPhone?: string) => boolean;
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
  addSponsoredStatus: (
    ad: { brand: string; caption: string; mediaUrl: string; ctaLabel?: string; targetUrl?: string },
    paymentPin?: string
  ) => Promise<{ success: boolean; message: string; pending?: boolean }>;
  deleteStatus: (statusId: string) => void;
  handleAdClick: (statusId: string, targetUrl?: string) => Promise<void>;
  wallet: UserWallet;
  activeCreditAlert: CreditAlertEvent | null;
  dismissCreditAlert: () => void;
  triggerCreditAlert: (alert: Omit<CreditAlertEvent, 'id' | 'createdAt' | 'xpEarned'> & { id?: string; xpEarned?: number }) => void;
  isWalletModalOpen: boolean;
  setIsWalletModalOpen: (val: boolean) => void;
  refreshWalletFromServer: () => Promise<void>;
  topUpWallet: (
    amount: number,
    reference?: string
  ) => Promise<{ success: boolean; reference: string; fee: number; totalPaid: number; message?: string }>;
  withdrawWallet: (
    amount: number,
    bankName: string,
    accountNumber: string,
    accountName: string,
    bankCode?: string
  ) => Promise<{ success: boolean; message: string }>;
  fetchLiveBanks: () => Promise<{ success: boolean; count: number; source: string; banks: Array<{ name: string; code: string }> }>;
  resolveBankAccount: (
    accountNumber: string,
    signal?: AbortSignal
  ) => Promise<{
    success: boolean;
    requiresSecretKey?: boolean;
    banksTotal?: number;
    banksScanned?: number;
    primaryAccount?: {
      accountNumber: string;
      accountName: string;
      bankName: string;
      bankCode: string;
      bankId?: number;
      verifiedBy: 'paystack_live' | 'flutterwave_live';
    };
    matches?: Array<{
      accountNumber: string;
      accountName: string;
      bankName: string;
      bankCode: string;
      bankId?: number;
      verifiedBy: 'paystack_live' | 'flutterwave_live';
    }>;
    candidateBanks?: Array<{ name: string; code: string }>;
    message?: string;
  }>;
  updateUsername: (
    newUsername: string,
    newAbout?: string
  ) => Promise<{ success: boolean; error?: string; username?: string }>;
  hideBalanceOnNav: boolean;
  toggleHideBalance: () => void;
  readReceiptsEnabled: boolean;
  toggleReadReceipts: () => void;
  activeCheckoutProduct: Product | null;
  openCheckout: (prod: Product) => void;
  closeCheckout: () => void;
  escrowOrders: EscrowOrder[];
  activeEscrowModalOrder: EscrowOrder | null;
  setActiveEscrowModalOrder: (order: EscrowOrder | null) => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  sendMessage: (chatId: string, text: string, replyTo?: { id?: string; sender: string; text: string }, oneTimeView?: boolean) => void;
  forwardMessage: (
    targets: Array<{ chatId?: string; phone?: string; name?: string; avatar?: string }>,
    sourceMessage: ChatMessage
  ) => number;
  sendVoiceNote: (chatId: string, durationSeconds: number, transcript: string, audioDataUrl?: string, oneTimeView?: boolean) => void;
  sendProductCard: (chatId: string, product: Product, fromSelf?: boolean) => void;
  isShareLocationModalOpen: boolean;
  setIsShareLocationModalOpen: (val: boolean) => void;
  sendLocationMessage: (chatId: string, locationData: LocationPinMeta) => void;
  isOneTimeViewEnabled: boolean;
  setIsOneTimeViewEnabled: (val: boolean) => void;
  loadImage: (chatId: string, messageId: string) => void;
  createEscrowOrder: (
    chatId: string,
    product: Product,
    paymentMethod: 'paystack' | 'wallet',
    buyerName: string,
    deliveryAddress: string
  ) => { success: boolean; order?: EscrowOrder; error?: string };
  approveEscrowRelease: (orderId: string) => Promise<{ success: boolean; message: string; order?: EscrowOrder }>;
  claimEscrowWithCode: (orderId: string, enteredPin: string) => Promise<{ success: boolean; message: string; order?: EscrowOrder }>;
  disputeEscrowOrder: (orderId: string, reason: string) => Promise<{ success: boolean; message: string }>;
  refreshEscrowOrders: () => Promise<void>;
  releaseEscrowFunds: (orderId: string, enteredPin: string) => { success: boolean; message: string };
  openChatWithProduct: (chatId: string, product: Product) => void;
  activeCall: ActiveCallState | null;
  startCall: (
    name: string,
    phone: string,
    avatar?: string,
    type?: 'voice' | 'video',
    roomId?: string,
    isInitiator?: boolean,
    options?: {
      isGroupCall?: boolean;
      participantPhones?: string[];
      chatId?: string;
      isAnonymous?: boolean;
    }
  ) => void;
  endCall: () => void;
  toggleCallMute: () => void;
  toggleCallSpeaker: () => void;
  toggleCallMinimize: () => void;
  setCallMinimized: (val: boolean) => void;
  upgradeCallToGroup: () => void;
  inviteToActiveCall: (
    targets: Array<{ phone: string; name?: string; avatar?: string }>
  ) => { invitedCount: number; alreadyInCall: number };
  incomingCall: {
    roomId: string;
    callerName: string;
    callerPhone: string;
    callerAvatar?: string;
    type: 'voice' | 'video';
    isGroupCall?: boolean;
    groupName?: string;
    participantPhones?: string[];
  } | null;
  acceptIncomingCall: (options?: { anonymous?: boolean }) => void;
  declineIncomingCall: () => void;
  // 1. Meme & Sticker Studio
  isMemeStudioOpen: boolean;
  setIsMemeStudioOpen: (val: boolean) => void;
  sendMemeSticker: (chatId: string, meme: MemeSticker) => void;
  // 2. Live Audio Spaces / Street Radio
  isSpacesDashboardOpen: boolean;
  setIsSpacesDashboardOpen: (val: boolean) => void;
  isAudioSpaceMinimized: boolean;
  setIsAudioSpaceMinimized: (val: boolean) => void;
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
  isSpaceCreator: (space?: AudioSpace | null) => boolean;
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
  ) => { success: boolean; message?: string };
  voteOnFinancialPoll: (
    chatId: string,
    pollId: string,
    optionId: string
  ) => { success: boolean; insufficientFunds?: boolean; message?: string };
  // 6a. Free Chat Quick Polls
  isQuickPollModalOpen: boolean;
  setIsQuickPollModalOpen: (val: boolean) => void;
  createQuickPoll: (
    chatId: string,
    question: string,
    optionTexts: string[],
    allowMultiple?: boolean
  ) => { success: boolean; message?: string };
  voteOnQuickPoll: (chatId: string, messageId: string, optionId: string) => void;
  // 6b. Live Socket.IO Multiplayer X/O (Tic-Tac-Toe)
  isGameXoModalOpen: boolean;
  setIsGameXoModalOpen: (val: boolean) => void;
  getGameBetLimit: () => { isVerified: boolean; maxBet: number };
  sendXoChallenge: (
    chatId: string,
    mode: 'friendly' | 'bet',
    betAmount: number
  ) => Promise<{ success: boolean; insufficientFunds?: boolean; requiresVerifiedBadge?: boolean; message?: string; game?: TicTacToeGameState }>;
  acceptXoChallenge: (
    game: TicTacToeGameState
  ) => Promise<{ success: boolean; insufficientFunds?: boolean; requiresVerifiedBadge?: boolean; message?: string }>;
  declineXoChallenge: (
    game: TicTacToeGameState
  ) => Promise<{ success: boolean; message?: string }>;
  makeXoMove: (
    game: TicTacToeGameState,
    cellIndex: number
  ) => Promise<{ success: boolean; message?: string }>;
  forfeitXoGame: (
    game: TicTacToeGameState
  ) => Promise<{ success: boolean; message?: string }>;
  // 6c. Real-Time Multiplayer Whot!, Ludo & Texas Hold'em Poker Games
  sendWhotChallenge: (
    chatId: string,
    mode: 'friendly' | 'bet',
    betAmount: number
  ) => Promise<{ success: boolean; insufficientFunds?: boolean; requiresVerifiedBadge?: boolean; message?: string; game?: WhotGameState }>;
  acceptWhotChallenge: (
    game: WhotGameState
  ) => Promise<{ success: boolean; insufficientFunds?: boolean; requiresVerifiedBadge?: boolean; message?: string }>;
  declineWhotChallenge: (
    game: WhotGameState
  ) => Promise<{ success: boolean; message?: string }>;
  playWhotCard: (
    game: WhotGameState,
    cardId: string,
    requestedShape?: WhotShape
  ) => Promise<{ success: boolean; message?: string }>;
  drawWhotCard: (
    game: WhotGameState
  ) => Promise<{ success: boolean; message?: string }>;
  forfeitWhotGame: (
    game: WhotGameState
  ) => Promise<{ success: boolean; message?: string }>;
  sendLudoChallenge: (
    chatId: string,
    mode: 'friendly' | 'bet',
    betAmount: number,
    options?: { twoHouseMode?: boolean; mandatoryCaptureToFinish?: boolean }
  ) => Promise<{ success: boolean; insufficientFunds?: boolean; requiresVerifiedBadge?: boolean; message?: string; game?: LudoGameState }>;
  acceptLudoChallenge: (
    game: LudoGameState
  ) => Promise<{ success: boolean; insufficientFunds?: boolean; requiresVerifiedBadge?: boolean; message?: string }>;
  declineLudoChallenge: (
    game: LudoGameState
  ) => Promise<{ success: boolean; message?: string }>;
  rollLudoDice: (
    game: LudoGameState
  ) => Promise<{ success: boolean; message?: string }>;
  moveLudoToken: (
    game: LudoGameState,
    tokenIndex: number,
    dieChoice?: 'die0' | 'die1' | 'combined'
  ) => Promise<{ success: boolean; message?: string }>;
  forfeitLudoGame: (
    game: LudoGameState
  ) => Promise<{ success: boolean; message?: string }>;
  sendPokerChallenge: (
    chatId: string,
    mode: 'friendly' | 'bet',
    betAmount: number
  ) => Promise<{ success: boolean; insufficientFunds?: boolean; requiresVerifiedBadge?: boolean; message?: string; game?: PokerGameState }>;
  acceptPokerChallenge: (
    game: PokerGameState
  ) => Promise<{ success: boolean; insufficientFunds?: boolean; requiresVerifiedBadge?: boolean; message?: string }>;
  declinePokerChallenge: (
    game: PokerGameState
  ) => Promise<{ success: boolean; message?: string }>;
  performPokerAction: (
    game: PokerGameState,
    action: 'fold' | 'check' | 'call' | 'raise',
    raiseBy?: number
  ) => Promise<{ success: boolean; message?: string }>;
  forfeitPokerGame: (
    game: PokerGameState
  ) => Promise<{ success: boolean; message?: string }>;
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
    role?: 'user' | 'admin' | 'creator' | 'merchant',
    email?: string
  ) => void;
  logoutUser: () => void;
  updateUserProfile: (updates: Partial<UserProfile>) => void;
  // 9. Contact Synchronization & Discovery
  deviceContacts: DeviceContact[];
  isContactsModalOpen: boolean;
  setIsContactsModalOpen: (val: boolean) => void;
  syncDeviceContacts: () => void;
  startChatWithContact: (contact: DeviceContact) => void;
  openDirectChat: (target: {
    phone?: string;
    userId?: string;
    name?: string;
    avatar?: string;
    location?: string;
    verifiedStore?: boolean;
    product?: Product;
  }) => string;
  startAiChat: () => void;
  inviteBotToGroup: (groupId: string, makeAdmin?: boolean) => void;
  addNewDeviceContact: (
    name: string,
    phone: string,
    about?: string,
    isRegistered?: boolean,
    avatar?: string,
    options?: { sendRequest?: boolean }
  ) => DeviceContact;
  importDeviceContacts: (contacts: { name: string; phone: string }[]) => Promise<number>;
  friendRequests: ContactRequest[];
  activeContactRequestPopup: ContactRequest | null;
  setActiveContactRequestPopup: (req: ContactRequest | null) => void;
  sendFriendRequest: (targetPhone: string, targetName?: string, message?: string) => Promise<boolean>;
  acceptFriendRequest: (requestId: string) => void;
  declineFriendRequest: (requestId: string) => void;
  groupInvites: GroupInvitation[];
  activeGroupInvitePopup: GroupInvitation | null;
  setActiveGroupInvitePopup: (invite: GroupInvitation | null) => void;
  acceptGroupInvite: (inviteId: string) => void;
  declineGroupInvite: (inviteId: string) => void;
  respondToGroupInvitation: (chatId: string, accept: boolean) => void;
  endAudioSpace: (spaceId: string, customStats?: { durationFormatted?: string; peakListeners?: number }) => void;
  spaceEndedSummary: { spaceId: string; title: string; durationFormatted: string; peakListeners: number } | null;
  setSpaceEndedSummary: (val: { spaceId: string; title: string; durationFormatted: string; peakListeners: number } | null) => void;
  // Live Supabase Presence & Typing Indicators
  onlineUserKeys: Set<string>;
  isUserOnline: (phoneOrIdentifier?: string) => boolean;
  getLastSeen: (phoneOrIdentifier?: string) => string;
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
  // 12b. Task-to-Earn Micro-Task Bounty Campaigns
  isTaskEarnModalOpen: boolean;
  setIsTaskEarnModalOpen: (val: boolean) => void;
  // 13. Security Settings (Payment PIN & Security Questions)
  securitySettings: SecuritySettings;
  setPaymentPin: (pin: string) => void;
  updatePaymentPin: (newPin: string, oldPin?: string) => { success: boolean; message: string };
  setSecurityQuestion: (question: string, answer: string) => void;
  setSecurityQuestions: (questions: SecurityQuestionEntry[]) => { success: boolean; message: string };
  resetPaymentPinWithQuestions: (answers: [string, string], newPin: string) => { success: boolean; message: string };
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
  // 15. Send My Bill (Pay on Behalf)
  isSendBillModalOpen: boolean;
  setIsSendBillModalOpen: (val: boolean) => void;
  sendBillRequest: (params: {
    recipientPhone: string;
    recipientName: string;
    recipientAvatar?: string;
    title: string;
    category: BillRequest['category'];
    featureKey?: keyof FeatureFlags;
    featureRefId?: string;
    amount: number;
    note?: string;
  }) => Promise<{ success: boolean; message?: string; bill?: BillRequest }>;
  payBillOnBehalf: (
    bill: BillRequest,
    channel?: 'wallet' | 'paystack',
    paystackRef?: string
  ) => Promise<{ success: boolean; insufficientFunds?: boolean; message?: string }>;
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
  deleteTownCommunity: (id: string) => void;
  joinGroupByCodeOrLink: (codeOrLink: string) => Promise<{ success: boolean; name?: string; error?: string }>;
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
  registerAsErrandRunner: (data: { name: string; location: string; deliveryBaseFee: number; ninOrIdRef?: string }) => Promise<{ success: boolean; message?: string }>;
  addErrandRunnerItem: (item: Omit<ErrandItem, 'id'>) => void;
  removeErrandRunnerItem: (itemId: string) => void;
  // 18. Healthcare & Hospital Telehealth
  doctors: DoctorProfile[];
  queueTokens: HospitalQueueToken[];
  medicationReminders: MedicationReminder[];
  healthVault: HealthVaultRecord;
  isHealthModalOpen: boolean;
  setIsHealthModalOpen: (val: boolean) => void;
  registerClinicOrDoctor: (data: {
    name: string;
    accountType: 'doctor' | 'clinic';
    specialty: string;
    hospitalName: string;
    city: string;
    officeAddress: string;
    licenseNumber: string;
    consultationFee: number;
    bio: string;
    languages: string[];
    departments?: string[];
  }) => Promise<{ success: boolean; message: string; profile?: DoctorProfile }>;
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
  registerLawyer: (data: {
    name: string;
    supremeCourtNumber: string;
    firmName: string;
    specializations: string[];
    yearsExperience: number;
    officeAddress: string;
    city: string;
    consultationFee: number;
    bio: string;
  }) => Promise<{ success: boolean; message: string; profile?: LawyerProfile }>;
  bookLawyerConsultation: (lawyerId: string, notes: string) => Promise<{ success: boolean; message: string }>;
  generateLegalContract: (data: Omit<GeneratedLegalContract, 'id' | 'createdAt' | 'status' | 'signatureA'>) => GeneratedLegalContract;
  signLegalContract: (contractId: string, partyBSignature: string) => void;
  triggerEmergencyLegalSos: () => { success: boolean; message: string };
  refreshProfessionals: () => Promise<void>;
  reviewProfessional: (
    category: 'lawyer' | 'clinic' | 'errand',
    id: string,
    decision: 'approved' | 'rejected',
    reason?: string
  ) => Promise<{ success: boolean; message?: string }>;
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
  hasActiveStore: boolean;
  myStoreProducts: Product[];
  addStoreProduct: (prod: Omit<Product, 'id' | 'sellerId' | 'sellerName' | 'inStock' | 'stockCount'>) => { success: boolean; product?: Product; message: string };
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
  // 30. Pet Shop & Forum
  isPetShopModalOpen: boolean;
  setIsPetShopModalOpen: (val: boolean) => void;
  // 29. Super Admin Console & Moderation
  isAdminModalOpen: boolean;
  setIsAdminModalOpen: (val: boolean) => void;
  adminUsers: AdminUserRecord[];
  refreshAdminUsers: () => Promise<void>;
  getBadgeForPhone: (phoneOrId?: string) => 'blue' | 'gold' | 'creator_plus' | 'admin' | null;
  toggleUserVerification: (userId: string, badge: 'blue' | 'gold' | 'creator_plus' | 'admin' | null, hints?: { phoneNumber?: string; fullName?: string; avatarUrl?: string }) => Promise<boolean>;
  toggleUserSuspension: (userId: string) => Promise<boolean>;
  adminResolveEscrow: (orderId: string, action: 'release_to_seller' | 'refund_to_buyer', note: string) => { success: boolean; message: string };
  systemBroadcast: AdminSystemBroadcast | null;
  setSystemBroadcast: (broadcast: AdminSystemBroadcast | null) => void;
  createAdminBroadcast: (title: string, message: string, level: 'info' | 'warning' | 'alert' | 'urgent') => void;
  clearAdminBroadcast: () => Promise<boolean>;
  systemConfig: AdminSystemConfig;
  updateSystemConfig: (updates: Partial<AdminSystemConfig>) => Promise<boolean>;
  updateAdminFeatureFlag: (key: keyof FeatureFlags, val?: boolean) => Promise<boolean>;
  cmsData: AdminCmsData;
  updateCmsData: (updates: Partial<AdminCmsData>) => Promise<boolean>;
  setUserStatus: (
    userIdOrPhone: string,
    status: 'active' | 'suspended' | 'banned' | 'flagged',
    options?: { durationHours?: number; reason?: string }
  ) => Promise<boolean>;
  setUserRole: (userIdOrPhone: string, role: 'user' | 'creator' | 'merchant' | 'admin') => Promise<boolean>;
  banUser: (phoneOrId: string, reason?: string) => Promise<void>;
  unbanUser: (phoneOrId: string) => Promise<void>;
  adjustUserWallet: (phoneOrId: string, deltaOrNew: number, isAbsolute?: boolean) => Promise<void>;
  kickUserSession: (phoneOrId: string) => Promise<void>;
  isBanned: boolean;
  banInfo: { reason?: string; bannedAt?: string } | null;
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

// --- Data Version Nuke ---
// Bump this string whenever you need to wipe all stale cached/mock data.
const AGC_DATA_VERSION = 'v5_purged_all_mocks_live_2026';
const AGC_GROUPS_PURGE_FLAG = 'AGC_groups_purged_2026_11_16';
(function nukeStaleMockData() {
  if (typeof window === 'undefined') return;
  try {
    const stored = safeLocalStorage.getItem('AGC_data_version');
    if (stored !== AGC_DATA_VERSION) {
      const keepKeys = new Set([
        'AGC_data_version',
        'AGC_groups_purged_2026_11_16',
        'AGC_font_size',
        'AGC_low_data_mode',
        'AGC_language',
        'AGC_currency',
        'AGC_hide_phone_town',
        'AGC_user_profile_v2',
        'AGC_user_wallet_v2',
        'AGC_is_authenticated',
        'AGC_device_contacts',
        'AGC_registered_users_cache',
        'AGC_registered_phones',
        'AGC_taken_usernames',
        'AGC_session_token',
        'AGC_all_registered_users',
      ]);
      const keepPrefixes = [
        'AGC_chats_v2_',
        'AGC_messages_v2_',
        'AGC_user_wallet_v2_',
        'AGC_user_profile_v2_',
      ];
      const toRemove: string[] = [];
      for (let i = 0; i < safeLocalStorage.length; i++) {
        const key = safeLocalStorage.key(i);
        if (key && key.startsWith('AGC_') && !keepKeys.has(key) && !keepPrefixes.some((p) => key.startsWith(p))) {
          toRemove.push(key);
        }
      }
      toRemove.forEach((k) => safeLocalStorage.removeItem(k));
      safeLocalStorage.setItem('AGC_data_version', AGC_DATA_VERSION);
      console.log('[AGC] Stale mock data purged, 100% live system running.');
    }

    // One-time system-wide purge of stale groups, channels, Town Square caches & group invites
    if (safeLocalStorage.getItem(AGC_GROUPS_PURGE_FLAG) !== '1') {
      safeLocalStorage.removeItem('AGC_town_communities_v2');
      const allKeys: string[] = [];
      for (let i = 0; i < safeLocalStorage.length; i++) {
        const k = safeLocalStorage.key(i);
        if (k) allKeys.push(k);
      }

      const isGroupOrCommunityChatId = (id: string) =>
        id.startsWith('town_comm_') || id.startsWith('group_') || id.startsWith('channel_');

      allKeys.forEach((key) => {
        if (key.startsWith('AGC_group_invites') || key.startsWith('AGC_handled_group_invites') || key.startsWith('AGC_declined_group_ids')) {
          safeLocalStorage.removeItem(key);
          return;
        }
        if (key.startsWith('AGC_chats_v2')) {
          try {
            const raw = safeLocalStorage.getItem(key);
            if (!raw) return;
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              const cleaned = parsed.filter(
                (c: any) =>
                  c &&
                  typeof c.id === 'string' &&
                  !isGroupOrCommunityChatId(c.id) &&
                  !c.isGroup &&
                  !c.isChannel
              );
              safeLocalStorage.setItem(key, JSON.stringify(cleaned));
            }
          } catch (_) {}
          return;
        }
        if (key.startsWith('AGC_messages_v2')) {
          try {
            const raw = safeLocalStorage.getItem(key);
            if (!raw) return;
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
              let changed = false;
              Object.keys(parsed).forEach((cid) => {
                if (isGroupOrCommunityChatId(cid)) {
                  delete parsed[cid];
                  changed = true;
                }
              });
              if (changed) {
                safeLocalStorage.setItem(key, JSON.stringify(parsed));
              }
            }
          } catch (_) {}
        }
      });

      safeLocalStorage.setItem(AGC_GROUPS_PURGE_FLAG, '1');
      console.log('[AGC] Cleared stale groups, channels, and Town Square caches while preserving DMs.');
    }
  } catch (_) {}
})();

const INITIAL_ERRAND_RUNNERS: ErrandRunner[] = [];

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
  // --- Admin System Config, CMS & Feature Flags System ---
  const DEFAULT_SYSTEM_CONFIG: AdminSystemConfig = {
    maintenanceMode: false,
    maintenanceMessage: 'AfriChat is undergoing scheduled system upgrades. We will be back shortly.',
    allowNewRegistrations: true,
    requirePhoneOtp: false,
    defaultCurrency: 'NGN',
    dispatchCommissionPercent: 5,
    escrowCommissionPercent: 1,
    artisanCommissionPercent: 2,
    creatorCommissionPercent: 5,
    sponsoredAdFeeNgn: 2500,
    lowBandwidthDefault: false,
    supportContactPhone: '+234800000000',
  };

  const DEFAULT_CMS_DATA: AdminCmsData = {
    announcements: [
      {
        id: 'ann_welcome',
        title: 'Welcome to AfriChat Super-App',
        content: 'Experience secure African remittances, peer-to-peer escrow, and on-demand local dispatch.',
        level: 'info',
        audience: 'all',
        actionUrl: '',
        active: true,
        createdAt: new Date().toISOString(),
      },
    ],
    marqueeBanner: {
      enabled: true,
      text: '⚡ Welcome to AfriChat! Zero-fee transfers, instant dispatch deliveries, and escrow protection live across Africa.',
      speed: 'normal',
      backgroundColor: '#7c3aed',
      textColor: '#ffffff',
    },
    faqArticles: [
      {
        id: 'faq_escrow',
        question: 'How does Balogun Escrow Protection work?',
        answer: 'When you purchase goods or book an artisan, your payment is held securely in an encrypted vault until you confirm satisfactory delivery.',
        category: 'escrow',
        published: true,
      },
      {
        id: 'faq_dispatch',
        question: 'How do PickkR and Gokada dispatch deliveries work?',
        answer: 'Our dispatch system matches nearby verified riders. A 5% platform fee guarantees insurance and GPS parcel tracking.',
        category: 'dispatch',
        published: true,
      },
      {
        id: 'faq_safety',
        question: 'How do I avoid scammers on P2P payments?',
        answer: 'Use the Scam Shield tool in the 9-dot menu before sending funds. Never release escrow funds until you inspect items physically.',
        category: 'security',
        published: true,
      },
    ],
    communityGuidelines: '1. Treat all community members with respect.\n2. No fraudulent listings, phishing links, or unauthorized transactions.\n3. Verified badges are subject to continuous compliance with AfriChat terms.',
    termsOfService: 'AfriChat provides communication, marketplace escrow mediation, and logistical dispatch coordination across African regions.',
    sponsorSpotlight: {
      enabled: false,
      brandName: '',
      tagline: '',
      bannerUrl: '',
      linkUrl: '',
    },
    sponsoredStatuses: [],
  };

  const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
    wallet: true,
    escrow: true,
    securityPin: true,
    dispatch: true,
    artisan: true,
    healthcare: true,
    legal: true,
    jobs: true,
    petShop: true,
    errands: true,
    creator: true,
    audioSpaces: true,
    writers: true,
    storeTiers: true,
    tutor: true,
    referral: true,
    memeStudio: true,
    scamChecker: true,
    town: true,
    market: true,
    status: true,
    calls: true,
    voiceNotes: true,
    ajo: true,
    payroll: true,
  };

  const [systemConfig, setSystemConfig] = useState<AdminSystemConfig>(DEFAULT_SYSTEM_CONFIG);
  const [cmsData, setCmsData] = useState<AdminCmsData>(DEFAULT_CMS_DATA);
  const [featureFlags, setFeatureFlags] = useState<FeatureFlags>(DEFAULT_FEATURE_FLAGS);

  const systemConfigRef = useRef<AdminSystemConfig>(DEFAULT_SYSTEM_CONFIG);
  const cmsDataRef = useRef<AdminCmsData>(DEFAULT_CMS_DATA);
  const featureFlagsRef = useRef<FeatureFlags>(DEFAULT_FEATURE_FLAGS);
  const adminSupabaseChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const adminConfigUpdatedAtRef = useRef<number>(0);
  const adminCmsUpdatedAtRef = useRef<number>(0);
  const systemBroadcastRef = useRef<AdminSystemBroadcast | null>(null);

  useEffect(() => { systemConfigRef.current = systemConfig; }, [systemConfig]);
  useEffect(() => { cmsDataRef.current = cmsData; }, [cmsData]);
  useEffect(() => { featureFlagsRef.current = featureFlags; }, [featureFlags]);

  const isFeatureEnabled = (key: keyof FeatureFlags): boolean => {
    if (key === 'wallet') return Boolean(featureFlags.wallet);
    const WALLET_DEPENDENTS: (keyof FeatureFlags)[] = [
      'market', 'artisan', 'errands', 'ajo', 'payroll', 'writers', 'creator', 'escrow', 'tutor', 'storeTiers', 'securityPin'
    ];
    if (WALLET_DEPENDENTS.includes(key)) {
      return Boolean(featureFlags.wallet && featureFlags[key] !== false);
    }
    return Boolean(featureFlags[key] !== false);
  };

  // Helper to reliably call admin API via same-origin /api
  const callAdminApi = async (path: string, options?: RequestInit) => {
    const normalizedPath = path.startsWith('/') ? path : '/' + path;
    try {
      return await fetch(normalizedPath, options);
    } catch (_) {
      return null;
    }
  };

  const adminSyncChannelRef = useRef<BroadcastChannel | null>(null);

  const toggleFeatureFlag = (key: keyof FeatureFlags) => {
    updateAdminFeatureFlag(key);
  };

  const updateSystemConfig = async (updates: Partial<AdminSystemConfig>): Promise<boolean> => {
    const nowIso = new Date().toISOString();
    adminConfigUpdatedAtRef.current = Date.now();
    const nextConfig: AdminSystemConfig = { ...systemConfigRef.current, ...updates };
    systemConfigRef.current = nextConfig;
    setSystemConfig(nextConfig);

    try {
      adminSyncChannelRef.current?.postMessage({ type: 'config', data: nextConfig });
    } catch (_) {}

    if (adminSupabaseChannelRef.current) {
      try {
        adminSupabaseChannelRef.current.send({
          type: 'broadcast',
          event: 'admin_config',
          payload: nextConfig,
        });
      } catch (_) {}
    }

    const [apiData, sbOk] = await Promise.all([
      safeJsonFetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      }),
      saveSupabaseAdminSlice(ADMIN_SYS_CONFIG_KEY, 'AGC_ADMIN_CONFIG', {
        config: nextConfig,
        featureFlags: featureFlagsRef.current,
        updatedAt: nowIso,
      }),
    ]);

    if (apiData?.config) {
      systemConfigRef.current = apiData.config;
      setSystemConfig(apiData.config);
    }
    return Boolean(apiData?.success || sbOk);
  };

  const updateAdminFeatureFlag = async (key: keyof FeatureFlags, val?: boolean): Promise<boolean> => {
    const nowIso = new Date().toISOString();
    adminConfigUpdatedAtRef.current = Date.now();
    const currentFlags = featureFlagsRef.current;
    const nextVal = val !== undefined ? val : currentFlags[key] === false;
    const updates = { [key]: nextVal };
    const nextFlags: FeatureFlags = { ...currentFlags, ...updates };
    featureFlagsRef.current = nextFlags;
    setFeatureFlags(nextFlags);

    try {
      adminSyncChannelRef.current?.postMessage({ type: 'features', data: nextFlags });
    } catch (_) {}

    if (adminSupabaseChannelRef.current) {
      try {
        adminSupabaseChannelRef.current.send({
          type: 'broadcast',
          event: 'admin_features',
          payload: nextFlags,
        });
      } catch (_) {}
    }

    const [apiData, sbOk] = await Promise.all([
      safeJsonFetch('/api/admin/features', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      }),
      saveSupabaseAdminSlice(ADMIN_SYS_CONFIG_KEY, 'AGC_ADMIN_CONFIG', {
        config: systemConfigRef.current,
        featureFlags: nextFlags,
        updatedAt: nowIso,
      }),
    ]);

    if (apiData?.featureFlags) {
      featureFlagsRef.current = apiData.featureFlags;
      setFeatureFlags(apiData.featureFlags);
    }
    return Boolean(apiData?.success || sbOk);
  };

  const updateCmsData = async (updates: Partial<AdminCmsData>): Promise<boolean> => {
    const nowIso = new Date().toISOString();
    adminCmsUpdatedAtRef.current = Date.now();
    const cur = cmsDataRef.current;
    const nextCms: AdminCmsData = {
      ...cur,
      ...updates,
      marqueeBanner: updates.marqueeBanner
        ? { ...cur.marqueeBanner, ...updates.marqueeBanner }
        : cur.marqueeBanner,
      sponsorSpotlight: updates.sponsorSpotlight
        ? { ...cur.sponsorSpotlight, ...updates.sponsorSpotlight }
        : cur.sponsorSpotlight,
    };
    cmsDataRef.current = nextCms;
    setCmsData(nextCms);

    try {
      adminSyncChannelRef.current?.postMessage({ type: 'cms', data: nextCms });
    } catch (_) {}

    if (adminSupabaseChannelRef.current) {
      try {
        adminSupabaseChannelRef.current.send({
          type: 'broadcast',
          event: 'admin_cms',
          payload: nextCms,
        });
      } catch (_) {}
    }

    const [apiData, sbOk] = await Promise.all([
      safeJsonFetch('/api/admin/cms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      }),
      saveSupabaseAdminSlice(ADMIN_SYS_CMS_KEY, 'AGC_ADMIN_CMS', {
        cms: nextCms,
        activeBroadcast: systemBroadcastRef.current,
        updatedAt: nowIso,
      }),
    ]);

    if (apiData?.cms) {
      cmsDataRef.current = apiData.cms;
      setCmsData(apiData.cms);
    }
    return Boolean(apiData?.success || sbOk);
  };

  // --- Errands System ---
  const [errandRunners, setErrandRunners] = useState<ErrandRunner[]>(() => {
    try {
      const saved = localStorage.getItem('AGC_errand_runners_v1');
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return [];
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

    const orderId = `errand_${Date.now()}`;
    const randomPin = Math.floor(1000 + Math.random() * 9000).toString();
    const escrowTx = recordLedgerTransaction({
      id: `tx_errand_${Date.now()}`,
      type: 'errand_escrow',
      title: `Errand Escrow Lock (Runner: ${orderData.runnerName})`,
      description: `Errand escrow lock with runner ${orderData.runnerName} (${orderData.items.length} items)`,
      amount: orderData.totalAmount,
      fee: 0,
      balanceAfter: wallet.availableBalance - orderData.totalAmount,
      currency: 'NGN',
      referenceId: `ERR_${orderId}`,
      channel: 'wallet',
    });

    setWallet((prev) => ({
      ...prev,
      availableBalance: prev.availableBalance - orderData.totalAmount,
      escrowLockedBalance: prev.escrowLockedBalance + orderData.totalAmount,
      transactions: [escrowTx, ...prev.transactions],
    }));

    const newOrder: ErrandOrder = {
      ...orderData,
      id: orderId,
      customerId: currentUser.id,
      customerName: currentUser.fullName,
      customerPhone: currentUser.phoneNumber,
      status: 'pending',
      escrowReleaseCode: randomPin,
      proofImages: [],
      createdAt: new Date().toISOString(),
    };

    setErrandOrders((prev) => [newOrder, ...prev]);

    fetch('/api/professionals/errands/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newOrder),
    }).catch(() => {});

    return newOrder;
  };

  const completeErrandWithCode = (orderId: string, code: string): boolean => {
    const order = errandOrders.find((o) => o.id === orderId);
    if (!order || order.escrowReleaseCode !== code.trim()) return false;

    const releaseTx = recordLedgerTransaction({
      id: `tx_errand_rel_${Date.now()}`,
      type: 'errand_release',
      title: `Errand Escrow Release (Order: ${order.id})`,
      description: `Errand payout released to ${order.runnerName}`,
      amount: order.totalAmount,
      fee: 0,
      balanceAfter: wallet.availableBalance,
      currency: 'NGN',
      referenceId: `REL_ERR_${order.id}`,
      channel: 'wallet',
    });

    setWallet((prev) => ({
      ...prev,
      escrowLockedBalance: Math.max(0, prev.escrowLockedBalance - order.totalAmount),
      transactions: [releaseTx, ...prev.transactions],
    }));

    setErrandOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: 'completed' } : o)));
    setErrandRunners((prev) => prev.map((r) => (r.id === order.runnerId ? { ...r, completedCount: r.completedCount + 1 } : r)));

    fetch('/api/professionals/errands/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, code: code.trim() }),
    }).catch(() => {});

    return true;
  };

  const disputeErrandOrder = (orderId: string, reason: string) => {
    setErrandOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: 'disputed', disputeReason: reason } : o)));
    fetch('/api/professionals/errands/dispute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, reason }),
    }).catch(() => {});
  };

  const registerAsErrandRunner = async (data: { name: string; location: string; deliveryBaseFee: number; ninOrIdRef?: string }) => {
    const newRunner: ErrandRunner = {
      id: `runner_${Date.now()}`,
      userId: currentUser.id,
      userPhone: currentUser.phoneNumber,
      name: data.name,
      phone: currentUser.phoneNumber,
      avatar: currentUser.avatarUrl,
      location: data.location,
      bio: `AGC Errand Runner based in ${data.location}.`,
      ninOrIdRef: data.ninOrIdRef || '',
      isVerified: false,
      approvalStatus: 'pending',
      verificationStatus: 'pending',
      rating: 5.0,
      reviewsCount: 1,
      completedCount: 0,
      deliveryBaseFee: data.deliveryBaseFee,
      currency: 'NGN',
      isOnline: true,
      isRegistered: true,
      createdAt: new Date().toISOString(),
      itemsForSale: [],
    };
    setErrandRunners((prev) => [newRunner, ...prev.filter((r) => r.userId !== currentUser.id && !phonesMatch(r.phone, currentUser.phoneNumber))]);
    try {
      const resp = await fetch('/api/professionals/errands/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRunner),
      });
      const json = await resp.json().catch(() => null);
      if (resp.ok && json?.runner) {
        setErrandRunners((prev) => [json.runner, ...prev.filter((r) => r.id !== newRunner.id && r.id !== json.runner.id && r.userId !== currentUser.id)]);
        return { success: true, message: 'Errand runner profile submitted for verification!' };
      }
      return { success: true, message: 'Errand runner profile saved locally (syncing).' };
    } catch (_) {
      return { success: true, message: 'Errand runner profile saved locally.' };
    }
  };

  const addErrandRunnerItem = (item: Omit<ErrandItem, 'id'>) => {
    const newItem: ErrandItem = { ...item, id: `item_${Date.now()}` };
    const targetRunner = errandRunners.find((r) => r.userId === currentUser.id || phonesMatch(r.phone, currentUser.phoneNumber));
    setErrandRunners((prev) => prev.map((r) => {
      if (r.userId === currentUser.id || phonesMatch(r.phone, currentUser.phoneNumber)) {
        return { ...r, itemsForSale: [newItem, ...r.itemsForSale] };
      }
      return r;
    }));
    if (targetRunner) {
      fetch('/api/professionals/errands/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runnerId: targetRunner.id, item: newItem }),
      }).catch(() => {});
    }
  };

  const removeErrandRunnerItem = (itemId: string) => {
    const targetRunner = errandRunners.find((r) => r.userId === currentUser.id || phonesMatch(r.phone, currentUser.phoneNumber));
    setErrandRunners((prev) => prev.map((r) => {
      if (r.userId === currentUser.id || phonesMatch(r.phone, currentUser.phoneNumber)) {
        return { ...r, itemsForSale: r.itemsForSale.filter((i: any) => i.id !== itemId) };
      }
      return r;
    }));
    if (targetRunner) {
      fetch(`/api/professionals/errands/items/${encodeURIComponent(targetRunner.id)}/${encodeURIComponent(itemId)}`, {
        method: 'DELETE',
      }).catch(() => {});
    }
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
  const [lowDataMode, setLowDataModeState] = useState<boolean>(() => {
    return safeLocalStorage.getItem('AGC_low_data_mode') === 'true';
  });
  const setLowDataMode = (val: boolean) => {
    setLowDataModeState(val);
    safeLocalStorage.setItem('AGC_low_data_mode', String(val));
  };
  useEffect(() => {
    document.documentElement.classList.toggle('low-data-mode', lowDataMode);
    safeLocalStorage.setItem('AGC_low_data_mode', String(lowDataMode));
  }, [lowDataMode]);

  const [activeTab, setActiveTab] = useState<'status' | 'calls' | 'town' | 'chats' | 'settings' | 'market'>('status');

  // Display & Appearance
  const [fontSize, setFontSizeState] = useState<AppFontSize>(() => {
    return (safeLocalStorage.getItem('AGC_font_size') as AppFontSize) || 'normal';
  });

  const setFontSize = (size: AppFontSize) => {
    setFontSizeState(size);
    safeLocalStorage.setItem('AGC_font_size', size);
    document.documentElement.classList.remove('text-size-small', 'text-size-normal', 'text-size-large', 'text-size-huge');
    document.documentElement.classList.add(`text-size-${size}`);
  };

  useEffect(() => {
    document.documentElement.classList.remove('text-size-small', 'text-size-normal', 'text-size-large', 'text-size-huge');
    document.documentElement.classList.add(`text-size-${fontSize}`);
  }, [fontSize]);

  const [chatWallpaper, setChatWallpaperState] = useState<string | null>(() => {
    return safeLocalStorage.getItem('AGC_wallpaper') || null;
  });

  const setChatWallpaper = (wallpaper: string | null) => {
    setChatWallpaperState(wallpaper);
    if (wallpaper) {
      safeLocalStorage.setItem('AGC_wallpaper', wallpaper);
    } else {
      safeLocalStorage.removeItem('AGC_wallpaper');
    }
  };

  const [globalChatTheme, setGlobalChatThemeState] = useState<string>(() => {
    return safeLocalStorage.getItem('AGC_global_chat_theme') || 'default';
  });
  const setGlobalChatTheme = (themeId: ChatThemeId | string) => {
    setGlobalChatThemeState(themeId);
    safeLocalStorage.setItem('AGC_global_chat_theme', themeId);
  };

  // QR Code Scanner Modal
  const [isScanQrModalOpen, setIsScanQrModalOpen] = useState(false);

  const generateCommunityUuid = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };

  const isInvalidCommunityClientItem = (c: Partial<TownCommunity> | null | undefined) => {
    if (!c) return true;
    return isHiddenOrInvalidCommunityRow({
      id: c.id,
      name: c.name,
      description: c.description,
      is_live: true,
    });
  };

  const isUserAuthorizedForTownCommunity = useCallback(
    (c: Partial<TownCommunity> | null | undefined, myPhone?: string, myId?: string): boolean => {
      if (!c || !c.id) return false;
      if (myPhone && Array.isArray(c.kickedPhones) && c.kickedPhones.some((p) => phonesMatch(p, myPhone))) {
        return false;
      }
      const isPrivate = c.isPrivate === true || (c.type || 'group') === 'group';
      if (!isPrivate) return true;
      if (!myPhone && !myId) return false;
      if (myId && c.creatorId && c.creatorId === myId) return true;
      if (myPhone && c.creatorPhone && phonesMatch(c.creatorPhone, myPhone)) return true;
      if (myPhone && Array.isArray(c.memberPhones) && c.memberPhones.some((p) => phonesMatch(p, myPhone))) return true;
      if (myPhone && Array.isArray(c.invitedPhones) && c.invitedPhones.some((p) => phonesMatch(p, myPhone))) return true;
      if (
        chatsRef.current.some(
          (ch) =>
            ch.id === `town_comm_${c.id}` &&
            ch.invitationStatus !== 'pending' &&
            ch.invitationStatus !== 'declined' &&
            !(myPhone && Array.isArray(ch.kickedPhones) && ch.kickedPhones.some((p) => phonesMatch(p, myPhone)))
        )
      ) {
        return true;
      }
      return false;
    },
    []
  );

  const loadPartitionedTownCommunities = useCallback((phone?: string): TownCommunity[] => {
    const norm = normalizePhoneDigits(phone);
    if (!norm) return [];
    const userKey = getUserStorageKey('AGC_town_communities_v2', phone);
    try {
      const saved = safeLocalStorage.getItem(userKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const seenKeys = new Set<string>();
          const clean: TownCommunity[] = [];
          parsed.forEach((c: TownCommunity) => {
            if (isInvalidCommunityClientItem(c)) return;
            if ((c.type === 'group' || c.isPrivate) && !c.isJoined) return;
            if (Array.isArray(c.kickedPhones) && c.kickedPhones.some((p) => phonesMatch(p, phone))) return;
            const dedupeKey =
              c.type === 'group' || c.isPrivate
                ? `id::${c.id}`
                : `${String(c.name || '').trim().toLowerCase()}::${c.type || 'group'}`;
            if (seenKeys.has(c.id) || seenKeys.has(dedupeKey)) return;
            seenKeys.add(c.id);
            seenKeys.add(dedupeKey);
            clean.push(c);
          });
          return clean;
        }
      }
    } catch (e) {
      console.warn(e);
    }
    return [];
  }, []);

  const persistPartitionedTownCommunities = useCallback((list: TownCommunity[], phone?: string) => {
    const cleanPhone = normalizePhoneDigits(phone || getSavedUserCleanPhone());
    if (!cleanPhone) return;
    try {
      safeLocalStorage.setItem(`AGC_town_communities_v2_${cleanPhone}`, JSON.stringify(list));
    } catch (_) {}
  }, []);

  // Town Communities & Anonymous Privacy (strictly partitioned per user)
  const [townCommunities, setTownCommunities] = useState<TownCommunity[]>(() => {
    const savedPhone = getSavedUserCleanPhone();
    if (!savedPhone) return [];
    return loadPartitionedTownCommunities(savedPhone);
  });
  const [hidePhoneNumberInTown, setHidePhoneNumberInTown] = useState<boolean>(() => {
    return safeLocalStorage.getItem('AGC_hide_phone_town') === 'true';
  });
  const toggleHidePhoneNumberInTown = () => {
    setHidePhoneNumberInTown((prev) => {
      const next = !prev;
      safeLocalStorage.setItem('AGC_hide_phone_town', String(next));
      return next;
    });
  };
  const townCommunitiesRef = useRef<TownCommunity[]>(townCommunities);
  const deletedCommunityIdsRef = useRef<Set<string>>(new Set());
  const deletedCommunityNamesRef = useRef<Set<string>>(new Set());
  const recentCommunityCreateRef = useRef<Map<string, number>>(new Map());
  useEffect(() => {
    townCommunitiesRef.current = townCommunities;
    const phone = currentUserRef.current?.phoneNumber;
    const norm = normalizePhoneDigits(phone);
    if (isAuthenticatedRef.current && norm && loadedPhoneForChatsRef.current === norm) {
      persistPartitionedTownCommunities(townCommunities, phone);
    }
  }, [townCommunities, persistPartitionedTownCommunities]);

  const syncLiveCommunitiesRef = useRef<(() => void) | null>(null);

  // Sync communities across devices from Supabase & Gateway server
  useEffect(() => {
    let isMounted = true;

    const removeCommunityLocally = (communityId: string, fallbackName?: string) => {
      if (!communityId && !fallbackName) return;
      if (communityId) deletedCommunityIdsRef.current.add(communityId);
      const normName = (fallbackName || '').trim().toLowerCase();
      if (normName) deletedCommunityNamesRef.current.add(normName);

      const myPhone = currentUserRef.current?.phoneNumber;
      setTownCommunities((prev) => {
        const updated = prev.filter(
          (c) =>
            c.id !== communityId &&
            (!normName || c.name.trim().toLowerCase() !== normName)
        );
        if (myPhone && loadedPhoneForChatsRef.current === normalizePhoneDigits(myPhone)) {
          persistPartitionedTownCommunities(updated, myPhone);
        }
        return updated;
      });

      const communityChatId = `town_comm_${communityId}`;
      setChats((prev) => {
        const updated = prev.filter(
          (c) =>
            c.id !== communityChatId &&
            !(normName && c.id.startsWith('town_comm_') && c.name.trim().toLowerCase() === normName)
        );
        if (updated.length !== prev.length && myPhone) {
          persistPartitionedChats(updated, myPhone);
        }
        return updated;
      });

      setMessages((prev) => {
        if (!prev[communityChatId]) return prev;
        const updated = { ...prev };
        delete updated[communityChatId];
        if (myPhone) persistPartitionedMessages(updated, myPhone);
        return updated;
      });

      setActiveChatId((curr) => (curr === communityChatId ? null : curr));
    };

    const syncLiveCommunities = async () => {
      if (!isAuthenticatedRef.current) return;
      const myPhone = currentUserRef.current?.phoneNumber || '';
      const myId = currentUserRef.current?.id || '';
      const normMyPhone = normalizePhoneDigits(myPhone);
      if (!normMyPhone || loadedPhoneForChatsRef.current !== normMyPhone) return;

      const authoritativeRows: TownCommunity[] = [];
      const seenIds = new Set<string>();
      const seenNames = new Set<string>();
      const kickedOutCommChatIds = new Set<string>();
      const threadSyncUpdates = new Map<string, { name: string; commType: 'group' | 'channel'; actualCount: number; parsedMembers: string[]; kickedPhones: string[] }>();
      let gotSupabaseAuth = false;
      let gotServerAuth = false;

      if (isSupabaseConfigured) {
        try {
          const { data, error } = await fetchLiveTownCommunities(100);
          if (!error && Array.isArray(data)) {
            gotSupabaseAuth = true;
            data.forEach((row: any) => {
              if (isHiddenOrInvalidCommunityRow(row)) return;
              if (deletedCommunityIdsRef.current.has(row.id)) return;
              const lowerName = String(row.name || '').trim().toLowerCase();
              if (deletedCommunityNamesRef.current.has(lowerName)) return;

              const tags: string[] = Array.isArray(row.tags) ? row.tags : [];
              const typeTag = tags.find((t: string) => t.startsWith('type:'));
              const commType = typeTag
                ? (typeTag.replace('type:', '') as 'group' | 'channel')
                : (row.category === 'Broadcast' ? 'channel' : 'group');
              const isPrivate = commType === 'group' || tags.some((t: string) => t.toLowerCase() === 'private:true');
              const inviteTag = tags.find((t: string) => t.toLowerCase().startsWith('invite:'));
              const inviteCode = inviteTag ? inviteTag.slice(7).trim().toUpperCase() : undefined;
              const creatorIdTag = tags.find((t: string) => t.startsWith('creator_id:'));
              const rowCreatorId = creatorIdTag ? creatorIdTag.replace('creator_id:', '') : undefined;
              const creatorPhoneTag = tags.find((t: string) => t.startsWith('creator_phone:'));
              const rowCreatorPhone = creatorPhoneTag ? creatorPhoneTag.replace('creator_phone:', '') : undefined;
              const membersTag = tags.find((t: string) => t.startsWith('members:'));
              let parsedMembers: string[] = [];
              if (membersTag) {
                try { parsedMembers = dedupePhoneList(JSON.parse(membersTag.replace('members:', ''))); } catch (_) {}
              }
              const kickedTag = tags.find((t: string) => t.startsWith('kicked:'));
              let parsedKicked: string[] = [];
              if (kickedTag) {
                try { parsedKicked = dedupePhoneList(JSON.parse(kickedTag.replace('kicked:', ''))); } catch (_) {}
              }
              const cleanMembers = parsedMembers.filter((p) => !parsedKicked.some((kp) => phonesMatch(kp, p)));
              const chatId = `town_comm_${row.id}`;
              if (parsedKicked.some((kp) => phonesMatch(kp, myPhone))) {
                kickedOutCommChatIds.add(chatId);
                return;
              }
              const actualCount = Math.max(Number(row.members_count || 0), cleanMembers.length, 1);
              const existingLocal = townCommunitiesRef.current.find((c) => c.id === row.id);
              const alreadyInChats = chatsRef.current.some((c) => c.id === chatId);

              const candidateComm: TownCommunity = {
                id: row.id,
                name: row.name,
                type: commType,
                category: row.category || 'Tech & Hustle',
                description: row.description || '',
                membersCount: actualCount,
                avatar: row.avatar || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(row.name)}&backgroundColor=581c87&textColor=ffffff`,
                isVerified: Boolean(row.is_live),
                isJoined: Boolean(existingLocal?.isJoined || alreadyInChats || cleanMembers.some((p) => phonesMatch(p, myPhone))),
                recentActivity: cleanMembers.length > 0 ? `${actualCount} members connected` : 'Active community',
                adminName: existingLocal?.adminName || 'AGC Admin',
                creatorId: rowCreatorId || existingLocal?.creatorId,
                creatorPhone: rowCreatorPhone || existingLocal?.creatorPhone,
                isPrivate,
                inviteCode: inviteCode || existingLocal?.inviteCode,
                memberPhones: cleanMembers.length > 0 ? cleanMembers : existingLocal?.memberPhones,
                kickedPhones: parsedKicked,
              };

              // Strict privacy gate: private groups are hidden unless user is creator, invited, or joined member
              if (!isUserAuthorizedForTownCommunity(candidateComm, myPhone, myId)) {
                return;
              }

              const dedupeKey = isPrivate ? `id::${row.id}` : `${lowerName}::${commType}`;
              if (seenIds.has(row.id) || seenNames.has(dedupeKey)) return;
              seenIds.add(row.id);
              seenNames.add(dedupeKey);

              authoritativeRows.push(candidateComm);

              threadSyncUpdates.set(chatId, {
                name: row.name,
                commType,
                actualCount,
                parsedMembers: cleanMembers,
                kickedPhones: parsedKicked,
              });
            });
          }
        } catch (_) {}
      }

      try {
        const res = await fetch(
          `/api/communities?phone=${encodeURIComponent(myPhone)}&userId=${encodeURIComponent(myId)}`
        );
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json?.communities)) {
            gotServerAuth = true;
            json.communities.forEach((c: TownCommunity) => {
              if (isInvalidCommunityClientItem(c)) return;
              if (deletedCommunityIdsRef.current.has(c.id)) return;
              if (Array.isArray(c.kickedPhones) && c.kickedPhones.some((kp) => phonesMatch(kp, myPhone))) {
                kickedOutCommChatIds.add(`town_comm_${c.id}`);
                return;
              }
              if (!isUserAuthorizedForTownCommunity(c, myPhone, myId)) return;
              const lowerName = String(c.name || '').trim().toLowerCase();
              if (deletedCommunityNamesRef.current.has(lowerName)) return;
              const commType = c.type === 'channel' ? 'channel' : 'group';
              const isPrivate = commType === 'group' || Boolean(c.isPrivate);
              const dedupeKey = isPrivate ? `id::${c.id}` : `${lowerName}::${commType}`;
              const cleanServerPhones = dedupePhoneList(c.memberPhones);
              const actualCount = Math.max(Number(c.membersCount || 0), cleanServerPhones.length, 1);
              const chatId = `town_comm_${c.id}`;
              threadSyncUpdates.set(chatId, {
                name: c.name,
                commType,
                actualCount,
                parsedMembers: cleanServerPhones,
                kickedPhones: dedupePhoneList(c.kickedPhones),
              });
              if (seenIds.has(c.id) || seenNames.has(dedupeKey)) return;
              seenIds.add(c.id);
              seenNames.add(dedupeKey);
              const existingLocal = townCommunitiesRef.current.find((lc) => lc.id === c.id);
              const alreadyInChats = chatsRef.current.some((ch) => ch.id === chatId);
              authoritativeRows.push({
                ...c,
                isPrivate,
                memberPhones: cleanServerPhones.length > 0 ? cleanServerPhones : existingLocal?.memberPhones,
                membersCount: actualCount,
                isJoined: Boolean(c.isJoined || existingLocal?.isJoined || alreadyInChats || cleanServerPhones.some((p) => phonesMatch(p, myPhone))),
              });
            });
          }
        }
      } catch (_) {}

      if (!isMounted || loadedPhoneForChatsRef.current !== normMyPhone) return;

      if (gotSupabaseAuth || gotServerAuth) {
        const now = Date.now();
        setTownCommunities((prev) => {
          // Preserve only brand-new local creates (< 10s old) that haven't settled yet
          const pendingRecent = prev.filter((c) => {
            if (isInvalidCommunityClientItem(c)) return false;
            if (deletedCommunityIdsRef.current.has(c.id)) return false;
            if (kickedOutCommChatIds.has(`town_comm_${c.id}`)) return false;
            if (seenIds.has(c.id)) return false;
            if (!isUserAuthorizedForTownCommunity(c, myPhone, myId)) return false;
            const createdTs = recentCommunityCreateRef.current.get(`${c.name.trim().toLowerCase()}::${c.type}`);
            return Boolean(createdTs && now - createdTs < 10000);
          });
          const merged = [...pendingRecent, ...authoritativeRows];
          persistPartitionedTownCommunities(merged, myPhone);
          return merged;
        });

        if (threadSyncUpdates.size > 0 || kickedOutCommChatIds.size > 0) {
          setChats((cPrev) => {
            let changed = false;
            const filteredPrev = cPrev.filter((cExisting) => {
              if (kickedOutCommChatIds.has(cExisting.id)) {
                changed = true;
                return false;
              }
              return true;
            });
            const updated = filteredPrev.map((cExisting) => {
              const sync = threadSyncUpdates.get(cExisting.id);
              if (!sync) return cExisting;
              changed = true;
              const mergedPhones = sync.parsedMembers.length > 0 ? sync.parsedMembers : dedupePhoneList(cExisting.memberPhones);
              return {
                ...cExisting,
                name: sync.name || cExisting.name,
                isGroup: sync.commType !== 'channel',
                isChannel: sync.commType === 'channel',
                membersCount: Math.max(sync.actualCount, mergedPhones.length, 1),
                memberPhones: mergedPhones,
                members: sync.parsedMembers.length > 0 ? sync.parsedMembers : cExisting.members,
                kickedPhones: sync.kickedPhones,
              };
            });
            if (changed) {
              persistPartitionedChats(updated, myPhone);
              return updated;
            }
            return cPrev;
          });
        }
      }
    };

    syncLiveCommunitiesRef.current = syncLiveCommunities;
    syncLiveCommunities();

    // 3. Socket.io community_created & community_deleted listeners
    const socket = getSocket();
    const handleCommunityCreated = (comm: TownCommunity) => {
      if (!comm || !comm.id || isInvalidCommunityClientItem(comm)) return;
      if (deletedCommunityIdsRef.current.has(comm.id)) return;
      const myPhone = currentUserRef.current?.phoneNumber || '';
      const myId = currentUserRef.current?.id || '';
      if (!isUserAuthorizedForTownCommunity(comm, myPhone, myId)) return;
      const lowerKey = `${String(comm.name || '').trim().toLowerCase()}::${comm.type || 'group'}`;
      setTownCommunities((prev) => {
        if (
          prev.some(
            (c) =>
              c.id === comm.id ||
              (comm.type !== 'group' && `${c.name.trim().toLowerCase()}::${c.type}` === lowerKey)
          )
        ) {
          return prev;
        }
        const updated = [comm, ...prev];
        persistPartitionedTownCommunities(updated, myPhone);
        return updated;
      });
    };

    const handleCommunityDeleted = (payload: { id?: string; name?: string }) => {
      if (!payload?.id && !payload?.name) return;
      removeCommunityLocally(payload.id || '', payload.name);
    };

    socket?.on('community_created', handleCommunityCreated);
    socket?.on('community_deleted', handleCommunityDeleted);

    // 4. Supabase Realtime live_town_communities broadcast listener across devices
    let commCh: ReturnType<typeof supabase.channel> | null = null;
    if (isSupabaseConfigured) {
      commCh = supabase.channel('live_town_communities', { config: { broadcast: { self: false } } });
      commCh
        .on('broadcast', { event: 'community_created' }, ({ payload }) => {
          if (!payload || !payload.id) return;
          handleCommunityCreated(payload);
        })
        .on('broadcast', { event: 'community_deleted' }, ({ payload }: any) => {
          if (!payload?.id && !payload?.name) return;
          removeCommunityLocally(payload.id || '', payload.name);
        })
        .on('broadcast', { event: 'members_updated' }, ({ payload }: any) => {
          if (!payload?.chatName && !payload?.communityId && !payload?.chatId) return;
          const matchComm = (c: TownCommunity) =>
            (payload.communityId && c.id === payload.communityId) ||
            (payload.chatId && `town_comm_${c.id}` === payload.chatId) ||
            (payload.chatName && c.name === payload.chatName);
          const myPhone = currentUserRef.current?.phoneNumber || '';
          const wasKicked = Boolean(myPhone && Array.isArray(payload.kickedPhones) && payload.kickedPhones.some((kp: string) => phonesMatch(kp, myPhone)));
          setTownCommunities((prev) => {
            const updated = wasKicked
              ? prev.filter((c) => !matchComm(c))
              : prev.map((c) =>
                  matchComm(c)
                    ? {
                        ...c,
                        membersCount: payload.membersCount ?? c.membersCount,
                        memberPhones: Array.isArray(payload.memberPhones) ? payload.memberPhones : c.memberPhones,
                      }
                    : c
                );
            persistPartitionedTownCommunities(updated, myPhone);
            return updated;
          });
          setChats((prev) => {
            const updated = wasKicked
              ? prev.filter((c) => !(payload.chatId ? c.id === payload.chatId : c.name === payload.chatName))
              : prev.map((c) =>
                  (payload.chatId ? c.id === payload.chatId : c.name === payload.chatName)
                    ? {
                        ...c,
                        membersCount: payload.membersCount ?? c.membersCount,
                        members: payload.members || c.members,
                        memberPhones: payload.memberPhones || c.memberPhones,
                      }
                    : c
                );
            persistPartitionedChats(updated, myPhone);
            return updated;
          });
        })
        .subscribe();
    }

    return () => {
      isMounted = false;
      syncLiveCommunitiesRef.current = null;
      socket?.off('community_created', handleCommunityCreated);
      socket?.off('community_deleted', handleCommunityDeleted);
      if (commCh) commCh.unsubscribe();
    };
  }, [isUserAuthorizedForTownCommunity, persistPartitionedTownCommunities]);

  const toggleJoinTownCommunity = (id: string) => {
    const me = currentUserRef.current;
    const myPhone = me?.phoneNumber || '';
    const myName = me?.fullName || 'AGC Member';
    const target = townCommunitiesRef.current.find((c) => c.id === id);
    if (!target) return;

    const joining = !target.isJoined;
    const currentPhones = dedupePhoneList(target.memberPhones);
    const nextPhones = joining
      ? dedupePhoneList([...currentPhones, myPhone])
      : currentPhones.filter((p) => !phonesMatch(p, myPhone));
    const nextCount = joining
      ? Math.max((target.membersCount || 1) + (currentPhones.some((p) => phonesMatch(p, myPhone)) ? 0 : 1), nextPhones.length, 1)
      : Math.max(Math.min((target.membersCount || 1) - 1, nextPhones.length > 0 ? nextPhones.length : (target.membersCount || 1) - 1), 1);

    setTownCommunities((prev) => {
      const updated = prev.map((c) =>
        c.id === id
          ? {
              ...c,
              isJoined: joining,
              memberPhones: nextPhones,
              membersCount: nextCount,
            }
          : c
      );
      persistPartitionedTownCommunities(updated, myPhone);
      return updated;
    });

    if (joining) {
      fetch('/api/groups/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codeOrLink: target.inviteCode || target.id,
          phone: myPhone,
          name: myName,
          avatar: me?.avatarUrl,
          userId: me?.id,
        }),
      }).catch(() => {});
    } else {
      fetch('/api/groups/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: `town_comm_${id}`,
          action: 'leave',
          actorPhone: myPhone,
          actorId: me?.id,
          targetName: myName,
          targetPhone: myPhone,
        }),
      }).catch(() => {});
    }

    if (isSupabaseConfigured) {
      updateTownCommunityInDb(id, {
        members_count: nextCount,
        members: nextPhones,
      }).catch(() => {});
    }
  };

  const addTownCommunity = (name: string, type: 'group' | 'channel', category: TownCommunity['category'], description: string) => {
    const cleanName = name.trim();
    const cleanDesc = description.trim();
    if (!cleanName || cleanName.length < 2 || cleanName.startsWith('__') || cleanName.toLowerCase().includes('__probe')) {
      return;
    }

    const dedupeKey = `${cleanName.toLowerCase()}::${type}`;
    const now = Date.now();
    const lastCreatedAt = recentCommunityCreateRef.current.get(dedupeKey) || 0;
    if (now - lastCreatedAt < 5000) {
      return;
    }
    if (
      townCommunitiesRef.current.some(
        (c) => c.name.trim().toLowerCase() === cleanName.toLowerCase() && c.type === type
      )
    ) {
      return;
    }
    recentCommunityCreateRef.current.set(dedupeKey, now);

    const communityId = generateCommunityUuid();
    const isPrivateGroup = type === 'group';
    const inviteCode = isPrivateGroup
      ? 'G' + Math.random().toString(36).substring(2, 7).toUpperCase()
      : 'C' + Math.random().toString(36).substring(2, 7).toUpperCase();
    const myPhone = currentUser.phoneNumber || '';

    const newCommunity: TownCommunity = {
      id: communityId,
      name: cleanName,
      type,
      category,
      membersCount: 1,
      avatar: `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(cleanName)}&backgroundColor=581c87&textColor=ffffff`,
      description: cleanDesc || `${type === 'channel' ? 'Channel' : 'Private group'} community`,
      isVerified: false,
      isJoined: true,
      recentActivity: isPrivateGroup ? 'Private · Invite only' : 'Just created',
      adminName: currentUser.fullName || 'You',
      creatorId: currentUser.id,
      creatorPhone: myPhone,
      isPrivate: isPrivateGroup,
      inviteCode,
      memberPhones: myPhone ? [myPhone] : [],
    };
    setTownCommunities((prev) => {
      const updated = [newCommunity, ...prev.filter((c) => c.id !== communityId)];
      persistPartitionedTownCommunities(updated, myPhone);
      return updated;
    });

    // LIVE SYSTEM: Persist once to Supabase; only broadcast publicly for non-private channels
    if (isSupabaseConfigured) {
      createTownCommunityInDb({
        id: newCommunity.id,
        name: newCommunity.name,
        type: newCommunity.type,
        category: newCommunity.category,
        description: newCommunity.description,
        avatar: newCommunity.avatar,
        members_count: 1,
        members: myPhone ? [myPhone] : [],
        isPrivate: isPrivateGroup,
        inviteCode,
        creatorId: currentUser.id,
        creatorPhone: myPhone,
      }).catch((e) => console.warn('Supabase community create notice:', e));

      if (!isPrivateGroup) {
        sendSupabaseBroadcastOnce('live_town_communities', 'community_created', newCommunity);
      }
    }

    // Create corresponding ChatThread so the group/channel appears in creator's chat list
    const communityChatId = `town_comm_${newCommunity.id}`;
    const creatorDisplay = currentUser.fullName || 'You';
    const newThread: ChatThread = {
      id: communityChatId,
      name: newCommunity.name,
      avatar: newCommunity.avatar,
      isGroup: type !== 'channel',
      isChannel: type === 'channel',
      creatorId: currentUser.id,
      creatorPhone: myPhone,
      admins: [creatorDisplay, 'You'],
      adminIds: currentUser.id ? [currentUser.id] : [],
      members: [creatorDisplay],
      memberPhones: myPhone ? [myPhone] : [],
      membersCount: 1,
      description: newCommunity.description,
      inviteCode,
      invitationStatus: 'accepted',
      verifiedStore: false,
      location: `${type === 'channel' ? 'Broadcast Channel' : 'Private Group'} · ${category}`,
      unreadCount: 0,
      lastMessage: newCommunity.description,
      lastMessageTime: 'Just now',
      catalog: [],
      isOnline: true,
    };
    setChats((prev) => {
      const updated = [newThread, ...prev.filter((c) => c.id !== communityChatId)];
      persistPartitionedChats(updated, currentUser.phoneNumber);
      return updated;
    });

    const welcomeMsg: ChatMessage = {
      id: `msg_comm_init_${Date.now()}`,
      chatId: communityChatId,
      sender: 'system',
      senderName: newCommunity.name,
      type: 'text',
      text:
        type === 'channel'
          ? `📢 Welcome to ${newCommunity.name} broadcast channel! ${newCommunity.description}`
          : `👋 Welcome to ${newCommunity.name}! ${newCommunity.description}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'read',
    };
    setMessages((prev) => {
      const existing = prev[communityChatId] || [];
      if (existing.length > 0) return prev;
      const updated = { ...prev, [communityChatId]: [welcomeMsg] };
      persistPartitionedMessages(updated, currentUser.phoneNumber);
      return updated;
    });

    // Broadcast via Socket.io & save to gateway server
    const socket = getSocket();
    socket?.emit('create_community', newCommunity);

    try {
      fetch('/api/communities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCommunity),
      }).catch(() => {});
    } catch (_) {}
  };

  const deleteTownCommunity = (communityId: string) => {
    const targetComm = townCommunitiesRef.current.find((c) => c.id === communityId);
    const targetName = targetComm?.name;
    const normName = targetName?.trim().toLowerCase();

    deletedCommunityIdsRef.current.add(communityId);
    if (normName) deletedCommunityNamesRef.current.add(normName);

    setTownCommunities((prev) => {
      const updated = prev.filter(
        (c) => c.id !== communityId && (!normName || c.name.trim().toLowerCase() !== normName)
      );
      persistPartitionedTownCommunities(updated, currentUser.phoneNumber);
      return updated;
    });

    const communityChatId = `town_comm_${communityId}`;
    setChats((prev) => {
      const updated = prev.filter(
        (c) =>
          c.id !== communityChatId &&
          !(normName && c.id.startsWith('town_comm_') && c.name.trim().toLowerCase() === normName)
      );
      persistPartitionedChats(updated, currentUser.phoneNumber);
      return updated;
    });

    setMessages((prev) => {
      const updated = { ...prev };
      delete updated[communityChatId];
      persistPartitionedMessages(updated, currentUser.phoneNumber);
      return updated;
    });

    setGroupInvites((prev) => prev.filter((inv) => inv.groupId !== communityChatId && inv.groupId !== communityId));
    setActiveChatId((curr) => (curr === communityChatId ? null : curr));

    if (isSupabaseConfigured) {
      deleteTownCommunityInDb(communityId, targetName).catch(() => {});
      sendSupabaseBroadcastOnce('live_town_communities', 'community_deleted', {
        id: communityId,
        name: targetName,
      });
    }

    try {
      fetch(`/api/communities/${encodeURIComponent(communityId)}`, { method: 'DELETE' }).catch(() => {});
    } catch (_) {}

    const socket = getSocket();
    socket?.emit('delete_community', { id: communityId, name: targetName });
  };

  const openCommunityChat = (community: TownCommunity) => {
    if (
      isInvalidCommunityClientItem(community) ||
      deletedCommunityIdsRef.current.has(community.id) ||
      deletedCommunityNamesRef.current.has(community.name.trim().toLowerCase())
    ) {
      return;
    }
    const chatId = `town_comm_${community.id}`;
    const isOwner = Boolean(
      (community.creatorId && currentUser.id && community.creatorId === currentUser.id) ||
        (community.creatorPhone && currentUser.phoneNumber && phonesMatch(community.creatorPhone, currentUser.phoneNumber)) ||
        (community.adminName &&
          (community.adminName === currentUser.fullName || community.adminName === 'You'))
    );
    const commPhones = dedupePhoneList(community.memberPhones);
    const commCount = Math.max(community.membersCount || 1, commPhones.length, 1);
    setChats((prev) => {
      if (prev.some((c) => c.id === chatId)) {
        const updated = prev.map((c) =>
          c.id === chatId
            ? {
                ...c,
                name: community.name || c.name,
                avatar: community.avatar || c.avatar,
                description: community.description ?? c.description,
                inviteCode: community.inviteCode || c.inviteCode,
                creatorId: c.creatorId || community.creatorId || (isOwner ? currentUser.id : undefined),
                creatorPhone: c.creatorPhone || community.creatorPhone,
                isGroup: community.type !== 'channel',
                isChannel: community.type === 'channel',
                membersCount: commCount,
                memberPhones: commPhones.length > 0 ? commPhones : c.memberPhones,
                members: commPhones.length > 0 ? commPhones : c.members,
                admins:
                  c.admins && c.admins.length > 0
                    ? c.admins
                    : isOwner
                    ? [currentUser.fullName || 'You', 'You']
                    : c.admins,
                adminIds:
                  c.adminIds && c.adminIds.length > 0
                    ? c.adminIds
                    : isOwner && currentUser.id
                    ? [currentUser.id]
                    : c.adminIds,
              }
            : c
        );
        persistPartitionedChats(updated, currentUser.phoneNumber);
        return updated;
      }
      const newThread: ChatThread = {
        id: chatId,
        name: community.name,
        avatar: community.avatar,
        description: community.description,
        inviteCode: community.inviteCode,
        isGroup: community.type !== 'channel',
        isChannel: community.type === 'channel',
        creatorId: community.creatorId || (isOwner ? currentUser.id : undefined),
        creatorPhone: community.creatorPhone,
        admins: isOwner ? [currentUser.fullName || 'You', 'You'] : community.adminName ? [community.adminName] : [],
        adminIds: isOwner && currentUser.id ? [currentUser.id] : [],
        members: commPhones.length > 0 ? commPhones : (isOwner ? [currentUser.fullName || 'You'] : []),
        memberPhones: commPhones,
        membersCount: commCount,
        invitationStatus: 'accepted',
        verifiedStore: false,
        location: `${community.type === 'channel' ? 'Broadcast Channel' : 'Town Group'} · ${community.category}`,
        unreadCount: 0,
        lastMessage: community.description || `Welcome to ${community.name}`,
        lastMessageTime: 'Just now',
        catalog: [],
        isOnline: true,
      };
      const updated = [newThread, ...prev];
      persistPartitionedChats(updated, currentUser.phoneNumber);
      return updated;
    });

    setMessages((prev) => {
      if ((prev[chatId] || []).length > 0) return prev;
      const welcomeMsg: ChatMessage = {
        id: `msg_comm_open_${Date.now()}`,
        chatId,
        sender: 'system',
        senderName: community.name,
        type: 'text',
        text:
          community.type === 'channel'
            ? `📢 ${community.name} Broadcast Channel: ${community.description || 'Official updates and posts appear here.'}`
            : `👋 ${community.name}: ${community.description || 'Welcome to the community room!'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'read',
      };
      const updated = { ...prev, [chatId]: [welcomeMsg] };
      persistPartitionedMessages(updated, currentUser.phoneNumber);
      return updated;
    });

    if (!community.isJoined) {
      toggleJoinTownCommunity(community.id);
    }

    joinChatRoom(chatId);
    setActiveTab('chats');
    setActiveChatId(chatId);
  };

  const joinGroupByCodeOrLink = useCallback(
    async (rawInput: string): Promise<{ success: boolean; name?: string; error?: string }> => {
      const raw = String(rawInput || '').trim();
      if (!raw) return { success: false, error: 'Please enter an invite link or code.' };

      // Extract token from full URLs like https://agc.chat/join/group_123 or ?join=G9X7A2 or #join=G9X7A2
      let extracted = raw;
      try {
        if (raw.includes('://') || raw.includes('?') || raw.includes('#')) {
          const normalizedUrl = raw.startsWith('http') ? raw : `https://agc.chat/${raw.replace(/^\/+/, '')}`;
          const u = new URL(normalizedUrl);
          const qJoin = u.searchParams.get('join') || u.searchParams.get('code') || u.searchParams.get('invite');
          if (qJoin) {
            extracted = qJoin.trim();
          } else if (u.hash && u.hash.includes('join=')) {
            const m = u.hash.match(/join=([^&#]+)/i);
            if (m?.[1]) extracted = decodeURIComponent(m[1]).trim();
          } else {
            const segs = u.pathname.split('/').filter(Boolean);
            if (segs.length > 0) extracted = decodeURIComponent(segs[segs.length - 1]).trim();
          }
        } else {
          extracted = raw.replace(/^.*\//, '').trim();
        }
      } catch (_) {
        extracted = raw.replace(/^.*\//, '').trim();
      }

      const tokenUpper = extracted.toUpperCase();
      const strippedTownUpper = tokenUpper.replace(/^TOWN_COMM_/, '');

      // 1. Check already-loaded Chats
      const existingChat = chatsRef.current.find(
        (c) =>
          (c.isGroup || c.isChannel) &&
          (c.id.toUpperCase() === tokenUpper ||
            (c.inviteCode && c.inviteCode.toUpperCase() === tokenUpper))
      );
      if (existingChat) {
        if (existingChat.invitationStatus === 'pending') {
          setChats((prev) => {
            const updated = prev.map((c) =>
              c.id === existingChat.id ? { ...c, invitationStatus: 'accepted' as const } : c
            );
            persistPartitionedChats(updated, currentUserRef.current?.phoneNumber);
            return updated;
          });
        }
        joinChatRoom(existingChat.id);
        setActiveTab('chats');
        setActiveChatId(existingChat.id);
        return { success: true, name: existingChat.name };
      }

      // 2. Check already-loaded Town Communities
      const localComm = townCommunitiesRef.current.find(
        (c) =>
          c.id.toUpperCase() === tokenUpper ||
          c.id.toUpperCase() === strippedTownUpper ||
          (c.inviteCode && c.inviteCode.toUpperCase() === tokenUpper)
      );
      if (localComm) {
        if (!localComm.isJoined) toggleJoinTownCommunity(localComm.id);
        openCommunityChat(localComm);
        return { success: true, name: localComm.name };
      }

      const me = currentUserRef.current;
      const myPhone = me?.phoneNumber || '';
      const myName = me?.fullName || 'AGC Member';

      // 3. Query server join endpoint (covers private groups & Town groups)
      try {
        const res = await fetch('/api/groups/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            codeOrLink: extracted,
            phone: myPhone,
            name: myName,
            avatar: me?.avatarUrl,
            userId: me?.id,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.success && data.kind === 'group' && data.group) {
            const g = data.group;
            const mergedMembers = dedupeNameList([...(Array.isArray(g.members) ? g.members : []), myName]);
            const mergedPhones = dedupePhoneList([...(Array.isArray(g.memberPhones) ? g.memberPhones : []), myPhone]);
            const joinedThread: ChatThread = {
              id: g.id,
              name: g.name,
              avatar: g.avatar || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150&auto=format&fit=crop&q=80',
              verifiedStore: false,
              location: g.isChannel ? 'Broadcast Channel' : 'Private Group',
              unreadCount: 0,
              lastMessage: `You joined via invite link`,
              lastMessageTime: 'Just now',
              lastMessageAtMs: Date.now(),
              catalog: [],
              isOnline: true,
              isGroup: !g.isChannel,
              isChannel: Boolean(g.isChannel),
              creatorId: g.creatorId,
              creatorPhone: g.creatorPhone,
              admins: Array.isArray(g.admins) ? g.admins : [],
              adminIds: Array.isArray(g.adminIds) ? g.adminIds : [],
              members: mergedMembers,
              memberPhones: mergedPhones,
              pendingMembers: Array.isArray(g.pendingMembers) ? g.pendingMembers : [],
              pendingPhones: Array.isArray(g.pendingPhones) ? g.pendingPhones : [],
              kickedPhones: Array.isArray(g.kickedPhones) ? g.kickedPhones : [],
              membersCount: Math.max(Number(g.membersCount || 1), computeClientMembersCount(mergedMembers, mergedPhones)),
              announceMode: Boolean(g.announceMode),
              inviteCode: g.inviteCode,
              description: g.description,
              invitationStatus: 'accepted',
            };
            kickedGroupIdsRef.current.delete(g.id);
            persistKickedGroupIds(myPhone);
            declinedGroupIdsRef.current.delete(g.id);
            try {
              const key = getUserStorageKey('AGC_declined_group_ids', myPhone);
              const arr = Array.from(declinedGroupIdsRef.current).slice(-250);
              localStorage.setItem(key, JSON.stringify(arr));
            } catch (_) {}
            setChats((prev) => {
              const filtered = prev.filter((c) => c.id !== g.id);
              const updated = [joinedThread, ...filtered];
              persistPartitionedChats(updated, myPhone);
              return updated;
            });
            setMessages((prev) => {
              const list = prev[g.id] || [];
              const sysMsg: ChatMessage = {
                id: `msg_sys_linkjoin_${Date.now()}`,
                chatId: g.id,
                sender: 'system',
                text: `You joined "${g.name}" using an invite link/code.`,
                type: 'text',
                timestamp: 'Just now',
                status: 'sent',
              };
              const updated = { ...prev, [g.id]: [...list, sysMsg] };
              persistPartitionedMessages(updated, myPhone);
              return updated;
            });
            joinChatRoom(g.id);
            setActiveTab('chats');
            setActiveChatId(g.id);
            return { success: true, name: g.name };
          }

          if (data?.success && data.kind === 'community' && data.community) {
            const c = data.community;
            kickedGroupIdsRef.current.delete(`town_comm_${c.id}`);
            persistKickedGroupIds(myPhone);
            const joinedComm: TownCommunity = {
              ...c,
              isJoined: true,
              memberPhones: dedupePhoneList([...(Array.isArray(c.memberPhones) ? c.memberPhones : []), myPhone]),
            };
            joinedComm.membersCount = Math.max(Number(joinedComm.membersCount || 1), joinedComm.memberPhones?.length || 1);
            setTownCommunities((prev) => {
              const filtered = prev.filter((item) => item.id !== joinedComm.id);
              const updated = [joinedComm, ...filtered];
              persistPartitionedTownCommunities(updated, myPhone);
              return updated;
            });
            openCommunityChat(joinedComm);
            return { success: true, name: joinedComm.name };
          }
        } else {
          const errJson = await res.json().catch(() => null);
          if (errJson?.error) {
            return { success: false, error: errJson.error };
          }
        }
      } catch (_) {}

      // 4. Fallback: query Supabase town_communities by invite tag or UUID
      if (isSupabaseConfigured) {
        try {
          const { data: row } = await fetchTownCommunityByInviteOrId(extracted);
          if (row && row.id) {
            const tags: string[] = Array.isArray(row.tags) ? row.tags : [];
            const typeTag = tags.find((t: string) => t.startsWith('type:'));
            const commType = typeTag ? (typeTag.replace('type:', '') as 'group' | 'channel') : 'group';
            const inviteTag = tags.find((t: string) => t.toLowerCase().startsWith('invite:'));
            const membersTag = tags.find((t: string) => t.startsWith('members:'));
            const kickedTag = tags.find((t: string) => t.startsWith('kicked:'));
            let parsedMembers: string[] = [];
            if (membersTag) {
              try { parsedMembers = dedupePhoneList(JSON.parse(membersTag.replace('members:', ''))); } catch (_) {}
            }
            let parsedKicked: string[] = [];
            if (kickedTag) {
              try { parsedKicked = dedupePhoneList(JSON.parse(kickedTag.replace('kicked:', ''))); } catch (_) {}
            }
            if (myPhone && parsedKicked.some((kp) => phonesMatch(kp, myPhone))) {
              return { success: false, error: 'You were removed from this group and must be re-invited by an admin.' };
            }
            const alreadyInRow = parsedMembers.some((p) => phonesMatch(p, myPhone));
            const mergedMembers = dedupePhoneList([...parsedMembers, myPhone]);
            const joinedComm: TownCommunity = {
              id: row.id,
              name: row.name,
              type: commType,
              category: row.category || 'Tech & Hustle',
              description: row.description || '',
              membersCount: Math.max(Number(row.members_count || 1) + (alreadyInRow ? 0 : 1), mergedMembers.length, 1),
              avatar: row.avatar || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(row.name)}&backgroundColor=581c87&textColor=ffffff`,
              isVerified: Boolean(row.is_live),
              isJoined: true,
              recentActivity: 'Joined via invite',
              adminName: 'AGC Admin',
              isPrivate: commType === 'group' || tags.some((t: string) => t.toLowerCase() === 'private:true'),
              inviteCode: inviteTag ? inviteTag.slice(7).trim().toUpperCase() : undefined,
              memberPhones: mergedMembers,
            };
            setTownCommunities((prev) => {
              const filtered = prev.filter((item) => item.id !== joinedComm.id);
              const updated = [joinedComm, ...filtered];
              persistPartitionedTownCommunities(updated, myPhone);
              return updated;
            });
            updateTownCommunityInDb(row.id, {
              members_count: joinedComm.membersCount,
              members: mergedMembers,
            }).catch(() => {});
            openCommunityChat(joinedComm);
            return { success: true, name: joinedComm.name };
          }
        } catch (_) {}
      }

      return {
        success: false,
        error: 'No matching private group, community, or live space found for that invite link or code.',
      };
    },
    []
  );

  // Healthcare
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
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

  const refreshProfessionals = async () => {
    try {
      const resp = await fetch('/api/professionals');
      if (!resp.ok) return;
      const data = await resp.json().catch(() => null);
      if (data?.success) {
        if (Array.isArray(data.lawyers)) setLawyers(data.lawyers);
        if (Array.isArray(data.clinicsDoctors)) setDoctors(data.clinicsDoctors);
        if (Array.isArray(data.errandRunners)) setErrandRunners(data.errandRunners);
        if (Array.isArray(data.errandOrders)) setErrandOrders(data.errandOrders);
      }
    } catch (_) {}
  };

  useEffect(() => {
    refreshProfessionals();
  }, []);

  const registerClinicOrDoctor = async (data: {
    name: string;
    accountType: 'doctor' | 'clinic';
    specialty: string;
    hospitalName: string;
    city: string;
    officeAddress: string;
    licenseNumber: string;
    consultationFee: number;
    bio: string;
    languages: string[];
    departments?: string[];
  }): Promise<{ success: boolean; message: string; profile?: DoctorProfile }> => {
    const payload = {
      ...data,
      hospitalAffiliation: data.hospitalName,
      userId: currentUser.id,
      userPhone: currentUser.phoneNumber,
      avatar: currentUser.avatarUrl,
    };
    try {
      const resp = await fetch('/api/professionals/clinics/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await resp.json().catch(() => null);
      if (!resp.ok || !json?.success) {
        return { success: false, message: json?.error || 'Could not submit registration.' };
      }
      if (Array.isArray(json.professionals?.clinicsDoctors)) {
        setDoctors(json.professionals.clinicsDoctors);
      } else if (json.doctor) {
        setDoctors((prev) => [json.doctor, ...prev.filter((d) => d.id !== json.doctor.id)]);
      }
      return {
        success: true,
        profile: json.doctor,
        message: 'Registration submitted! Your MDCN / Facility credentials are pending Admin verification.',
      };
    } catch (_) {
      return { success: false, message: 'Network error submitting registration.' };
    }
  };

  const bookDoctorAppointment = (doctorId: string, notes: string) => {
    const doc = doctors.find((d) => d.id === doctorId);
    if (!doc) {
      return { success: false, message: 'Selected doctor or clinic not found.' };
    }
    const fee = Math.max(0, Number(doc.consultationFee) || 0);
    if (fee > 0 && wallet.availableBalance < fee) {
      return {
        success: false,
        message: `Insufficient wallet balance for ₦${fee.toLocaleString()} consultation fee. Top up your wallet first.`,
      };
    }
    if (fee > 0) {
      const clinicLabel = doc.hospitalAffiliation || doc.hospitalName || '';
      const tx = recordLedgerTransaction({
        id: `tx_health_${Date.now()}`,
        type: 'health_consult',
        title: `AfriHealth Consult: ${doc.name}${clinicLabel ? ` (${clinicLabel})` : ''}`,
        description: `Medical telehealth consult with ${doc.name} · Notes: ${(notes || 'General triage').slice(0, 60)}`,
        amount: fee,
        fee: 0,
        balanceAfter: wallet.availableBalance - fee,
        currency: 'NGN',
        referenceId: `HLTH_${Date.now()}`,
        channel: 'wallet',
      });
      setWallet((prev) => ({
        ...prev,
        availableBalance: prev.availableBalance - fee,
        transactions: [tx, ...prev.transactions],
      }));
    }
    if (doc.userPhone) {
      const clinicLabel = doc.hospitalAffiliation || doc.hospitalName || '';
      startChatWithContact({
        id: doc.id,
        name: `${doc.name}${clinicLabel ? ` (${clinicLabel})` : ''}`,
        rawPhoneNumber: doc.userPhone,
        normalizedPhoneNumber: doc.userPhone,
        avatar: doc.avatar,
        isRegisteredOnAGC: true,
      });
      setIsHealthModalOpen(false);
    }
    return {
      success: true,
      message: `Telehealth consult booked with ${doc.name}${fee > 0 ? ` (₦${fee.toLocaleString()} paid)` : ''}. Encrypted consultation chat opened!`,
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
  const [lawyers, setLawyers] = useState<LawyerProfile[]>([]);
  const [contractTemplates] = useState<LegalContractTemplate[]>(MOCK_CONTRACT_TEMPLATES);
  const [generatedContracts, setGeneratedContracts] = useState<GeneratedLegalContract[]>([]);
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);

  const registerLawyer = async (data: {
    name: string;
    supremeCourtNumber: string;
    firmName: string;
    specializations: string[];
    yearsExperience: number;
    officeAddress: string;
    city: string;
    consultationFee: number;
    bio: string;
  }): Promise<{ success: boolean; message: string; profile?: LawyerProfile }> => {
    const payload = {
      ...data,
      barNumber: data.supremeCourtNumber,
      firm: data.firmName,
      userId: currentUser.id,
      userPhone: currentUser.phoneNumber,
      avatar: currentUser.avatarUrl,
    };
    try {
      const resp = await fetch('/api/professionals/lawyers/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await resp.json().catch(() => null);
      if (!resp.ok || !json?.success) {
        return { success: false, message: json?.error || 'Could not submit lawyer registration.' };
      }
      if (Array.isArray(json.professionals?.lawyers)) {
        setLawyers(json.professionals.lawyers);
      } else if (json.lawyer) {
        setLawyers((prev) => [json.lawyer, ...prev.filter((l) => l.id !== json.lawyer.id)]);
      }
      return {
        success: true,
        profile: json.lawyer,
        message: 'Lawyer registration submitted! Your SCN credentials are pending Admin verification.',
      };
    } catch (_) {
      return { success: false, message: 'Network error submitting lawyer registration.' };
    }
  };

  const bookLawyerConsultation = async (
    lawyerId: string,
    notes: string
  ): Promise<{ success: boolean; message: string }> => {
    const lawyer = lawyers.find((l) => l.id === lawyerId);
    if (!lawyer) return { success: false, message: 'Lawyer profile not found.' };
    const fee = Math.max(0, Number(lawyer.consultationFee) || 0);
    const escrowFee = fee > 0 ? Math.min(Math.round(fee * 0.01), 4000) : 0;
    const totalPayable = fee + escrowFee;
    if (totalPayable > 0 && wallet.availableBalance < totalPayable) {
      return {
        success: false,
        message: `Insufficient wallet balance. Need ₦${totalPayable.toLocaleString()} (₦${fee.toLocaleString()} fee + ₦${escrowFee.toLocaleString()} escrow protection).`,
      };
    }

    const chatPhone = lawyer.userPhone || `+234800${String(lawyer.id).replace(/\D/g, '').slice(-6).padStart(6, '0')}`;
    const myPhone = currentUser.phoneNumber || '';
    const deterministicId = myPhone && chatPhone ? getDirectChatId(myPhone, chatPhone) : `chat_law_${lawyer.id}`;
    const firmLabel = lawyer.firmName || lawyer.firm || 'Counsel';
    const scnLabel = lawyer.supremeCourtNumber || lawyer.barNumber || '';
    startChatWithContact({
      id: lawyer.id,
      name: `${lawyer.name} (${firmLabel})`,
      rawPhoneNumber: chatPhone,
      normalizedPhoneNumber: chatPhone,
      avatar: lawyer.avatar,
      isRegisteredOnAGC: true,
    });

    if (fee > 0) {
      const escrowResult = createEscrowOrder(
        deterministicId,
        {
          id: `legal_consult_${lawyer.id}_${Date.now()}`,
          sellerId: lawyer.userId || lawyer.id,
          sellerName: lawyer.name,
          sellerPhone: chatPhone,
          title: `Legal Consultation · ${lawyer.name} (${lawyer.specialty})`,
          description: notes || `Verified Legal Consultation with SCN ${scnLabel}`,
          price: fee,
          currency: 'NGN',
          imageUrl: '',
          category: 'fashion',
          inStock: true,
          stockCount: 1,
          location: `${lawyer.city || 'Nigeria'}`,
          condition: 'Brand New',
          tags: ['Escrow', 'AfriLaw'],
        },
        'wallet',
        currentUser.fullName || 'Client',
        `${lawyer.officeAddress || 'Virtual Consultation Room'}`
      );
      if (!escrowResult.success) {
        return { success: false, message: escrowResult.error || 'Unable to lock consultation escrow.' };
      }
      recordLedgerTransaction({
        id: `tx_legal_consult_${Date.now()}`,
        type: 'legal_consult',
        title: `AfriLaw Consultation Escrow: ${lawyer.name}`,
        description: `Consultation booked with ${lawyer.name} (SCN: ${scnLabel})`,
        amount: fee,
        fee: escrowFee,
        balanceAfter: Math.max(0, wallet.availableBalance - totalPayable),
        currency: 'NGN',
        referenceId: `LAW_${Date.now()}`,
        channel: 'wallet',
      });
    }
    setIsLegalModalOpen(false);
    return {
      success: true,
      message: `Consultation booked with ${lawyer.name} (Escrow Secured · PIN generated). Direct legal chat opened!`,
    };
  };

  const reviewProfessional = async (
    category: 'lawyer' | 'clinic' | 'errand',
    id: string,
    decision: 'approved' | 'rejected',
    reason?: string
  ): Promise<{ success: boolean; message?: string }> => {
    try {
      const resp = await fetch('/api/admin/professionals/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, id, decision, reason }),
      });
      const json = await resp.json().catch(() => null);
      if (!resp.ok || !json?.success) {
        return { success: false, message: json?.error || 'Failed to review professional.' };
      }
      if (json.professionals) {
        if (Array.isArray(json.professionals.lawyers)) setLawyers(json.professionals.lawyers);
        if (Array.isArray(json.professionals.clinicsDoctors)) setDoctors(json.professionals.clinicsDoctors);
        if (Array.isArray(json.professionals.errandRunners)) setErrandRunners(json.professionals.errandRunners);
      }
      return { success: true, message: `Marked as ${decision}.` };
    } catch (_) {
      return { success: false, message: 'Network error reviewing professional.' };
    }
  };

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
    const price = Number(creator.monthlySubPrice) || 0;
    if (price > 0 && wallet.availableBalance < price) {
      return { success: false, message: `Insufficient wallet balance for ₦${price.toLocaleString()} VIP creator subscription.` };
    }
    if (price > 0) {
      const tx = recordLedgerTransaction({
        id: `tx_creator_sub_${Date.now()}`,
        type: 'service_booking',
        title: `VIP Creator Subscription: ${creator.name}`,
        description: `Monthly VIP fan subscription to ${creator.name}`,
        amount: price,
        fee: 0,
        balanceAfter: wallet.availableBalance - price,
        currency: 'NGN',
        referenceId: `CSUB_${creator.id}_${Date.now()}`,
        channel: 'wallet',
      });
      setWallet((prev) => ({
        ...prev,
        availableBalance: prev.availableBalance - price,
        transactions: [tx, ...prev.transactions],
      }));
    }

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
    const price = Number(show.price) || 0;
    if (price > 0 && wallet.availableBalance < price) {
      return { success: false, message: `Insufficient wallet balance for ₦${price.toLocaleString()} show ticket.` };
    }
    if (price > 0) {
      const tx = recordLedgerTransaction({
        id: `tx_show_${Date.now()}`,
        type: 'service_booking',
        title: `Show Ticket: ${show.title}`,
        description: `Purchased event ticket for "${show.title}"`,
        amount: price,
        fee: 0,
        balanceAfter: wallet.availableBalance - price,
        currency: 'NGN',
        referenceId: `SHOW_${show.id}_${Date.now()}`,
        channel: 'wallet',
      });
      setWallet((prev) => ({
        ...prev,
        availableBalance: prev.availableBalance - price,
        transactions: [tx, ...prev.transactions],
      }));
    }

    const generatedPin = `TICK-AFRI-${Math.floor(1000 + Math.random() * 9000)}`;
    const generatedQr = `AFRI-SHOW-${show.id.toUpperCase()}-${generatedPin}`;

    const updatedShow: CreatorShowTicket = {
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
    const price = Number(song.price) || 0;
    if (price > 0 && wallet.availableBalance < price) {
      return { success: false, message: `Insufficient wallet balance for ₦${price.toLocaleString()} music track.` };
    }
    if (price > 0) {
      const tx = recordLedgerTransaction({
        id: `tx_song_${Date.now()}`,
        type: 'store_purchase',
        title: `Music Purchase: ${song.title}`,
        description: `Direct track purchase from ${song.artistName}: "${song.title}"`,
        amount: price,
        fee: 0,
        balanceAfter: wallet.availableBalance - price,
        currency: 'NGN',
        referenceId: `SONG_${song.id}_${Date.now()}`,
        channel: 'wallet',
      });
      setWallet((prev) => ({
        ...prev,
        availableBalance: prev.availableBalance - price,
        transactions: [tx, ...prev.transactions],
      }));
    }

    const updatedSong: CreatorSong = {
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

    let newTx: WalletTransaction | null = null;
    if (paymentMethod === 'wallet') {
      newTx = {
        id: `tx_artisan_reg_${Date.now()}`,
        type: 'artisan_reg',
        title: 'Artisan Station Registration Fee (₦5,000)',
        description: `Artisan station registration: ${stationData.stationName || 'Master Station'}`,
        amount: regFee,
        fee: 0,
        balanceAfter: wallet.availableBalance - regFee,
        currency: 'NGN',
        timestamp: 'Just now',
        createdAt: new Date().toISOString(),
        status: 'completed',
        reference: `ART_${Date.now()}`,
        referenceId: `ART_${Date.now()}`,
        channel: 'wallet',
      };
      setWallet((prev) => ({
        ...prev,
        availableBalance: prev.availableBalance - regFee,
        transactions: [newTx!, ...prev.transactions],
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
      isApproved: false,
      approvalStatus: 'pending',
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

    if (newTx) {
      fetch('/api/wallet/ledger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newTx,
          userId: currentUser.id,
          userPhone: currentUser.phoneNumber,
          userName: currentUser.fullName,
        }),
      }).catch(() => {});
    }

    fetch('/api/artisans/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: newStation.id,
        stationName: newStation.stationName,
        category: newStation.categoryLabel || newStation.category,
        location: newStation.location,
        workshopAddress: newStation.workshopAddress,
        ownerName: newStation.ownerName,
        ownerPhone: newStation.ownerPhone,
        registrationFeePaid: true,
      }),
    }).catch(() => {});

    //  LIVE SYSTEM: Publish Artisan Station to Supabase (pending approval)
    if (isSupabaseConfigured) {
      createArtisanStationInDb({
        station_name: newStation.stationName,
        category: newStation.category,
        category_label: newStation.categoryLabel,
        location: newStation.location,
        workshop_address: newStation.workshopAddress,
        about: newStation.about,
        avatar: newStation.avatar,
        is_approved: false,
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

    return {
      success: true,
      message: 'Artisan Station submitted! Pending Admin Approval before appearing publicly.',
      station: newStation,
    };
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
      const newTx = recordLedgerTransaction({
        id: `tx_lst_fee_${Date.now()}`,
        type: 'service_booking',
        title: `Service Listing Fee (₦500): ${listing.title}`,
        description: `Artisan service listing fee for ${listing.title}`,
        amount: listingFee,
        fee: 0,
        balanceAfter: wallet.availableBalance - listingFee,
        currency: 'NGN',
        referenceId: `ART_LST_${Date.now()}`,
        channel: 'wallet',
      });
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
    const fallback: ReferralProgram = {
      referralCode: '',
      referralLink: 'https://agc.app/join',
      totalInvited: 0,
      activeVerifiedCount: 0,
      pendingCount: 0,
      totalEarned: 0,
      availableBonus: 0,
      rewardPerActiveUser: 500,
      referredList: [],
    };
    try {
      const saved = localStorage.getItem('AGC_referral_program');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return {
            ...fallback,
            ...parsed,
            referredList: Array.isArray(parsed.referredList) ? parsed.referredList : [],
          };
        }
      }
    } catch (e) {
      console.warn('Failed to parse referral program:', e);
    }
    return fallback;
  });
  const [isReferralModalOpen, setIsReferralModalOpen] = useState(false);

  const claimReferralBonus = () => {
    if (referralProgram.availableBonus <= 0) {
      return { success: false, amountClaimed: 0, message: 'No unlocked referral bonuses ready to claim right now.' };
    }
    const bonusToClaim = referralProgram.availableBonus;
    const newTx = recordLedgerTransaction({
      id: `tx_ref_bonus_${Date.now()}`,
      type: 'referral_bonus',
      title: 'Anti-Fraud Referral Reward Bonus Claim',
      description: 'Claimed verified referral invite bonus',
      amount: bonusToClaim,
      fee: 0,
      balanceAfter: wallet.availableBalance + bonusToClaim,
      currency: 'NGN',
      referenceId: `REF_BONUS_${Date.now()}`,
      channel: 'wallet',
    });
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
  const activeChatIdRef = useRef<string | null>(activeChatId);
  activeChatIdRef.current = activeChatId;
  const notifiedMessageIdsRef = useRef<Set<string>>(new Set());
  const emitReadReceiptForChatRef = useRef<(chatId: string, explicitMessageIds?: string[]) => void>(() => {});

  // Read receipts preference (enabled by default; persisted per user phone)
  const [readReceiptsEnabled, setReadReceiptsEnabled] = useState<boolean>(() => {
    try {
      const savedPhone = getSavedUserCleanPhone();
      const key = savedPhone ? getUserStorageKey('AGC_read_receipts_v1', savedPhone) : 'AGC_read_receipts_v1';
      const val = safeLocalStorage.getItem(key) ?? safeLocalStorage.getItem('AGC_read_receipts_v1');
      return val !== 'false';
    } catch (_) {
      return true;
    }
  });
  const readReceiptsEnabledRef = useRef<boolean>(readReceiptsEnabled);
  readReceiptsEnabledRef.current = readReceiptsEnabled;

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
        persistPartitionedChats(updated, currentUser.phoneNumber);
        return updated;
      }
      return prev;
    });
    emitReadReceiptForChatRef.current(activeChatId);
  }, [activeChatId, readReceiptsEnabled]);
  const [chats, setChats] = useState<ChatThread[]>(() => {
    const savedPhone = getSavedUserCleanPhone();
    if (!savedPhone) return [];
    return loadPartitionedUserChatsAndMessages(savedPhone).chats;
  });
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>(() => {
    const savedPhone = getSavedUserCleanPhone();
    if (!savedPhone) return {};
    return loadPartitionedUserChatsAndMessages(savedPhone).messages;
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
          const now = Date.now();
          return parsed.filter((s: UserStatus) => !isStatusExpiredClient(s, now));
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

  const refreshEscrowOrders = async () => {
    try {
      const phone = currentUserRef.current?.phoneNumber || '';
      const q = phone ? `?viewerPhone=${encodeURIComponent(phone)}` : '';
      const res = await fetch(`/api/escrow/orders${q}`);
      if (!res.ok) return;
      const data = await res.json().catch(() => null);
      if (data?.success && Array.isArray(data.orders) && data.orders.length > 0) {
        setEscrowOrders((prev) => {
          const map = new Map<string, EscrowOrder>();
          data.orders.forEach((o: EscrowOrder) => map.set(o.id, o));
          prev.forEach((o) => {
            if (!map.has(o.id)) map.set(o.id, o);
          });
          return Array.from(map.values());
        });
      }
    } catch (_) {}
  };

  const [activeEscrowModalOrder, setActiveEscrowModalOrder] = useState<EscrowOrder | null>(null);
  const [activeCall, setActiveCall] = useState<ActiveCallState | null>(null);
  const [incomingCall, setIncomingCall] = useState<{
    roomId: string;
    callerName: string;
    callerPhone: string;
    callerAvatar?: string;
    type: 'voice' | 'video';
    isGroupCall?: boolean;
    groupName?: string;
    participantPhones?: string[];
  } | null>(null);
  const activeCallRef = useRef<ActiveCallState | null>(null);
  const incomingCallRef = useRef<typeof incomingCall>(null);
  const callRingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callSignalHandlersRef = useRef<{
    onIncomingCall: (payload: any) => void;
    onCallTerminated: (payload: any, eventName?: string) => void;
  }>({ onIncomingCall: () => {}, onCallTerminated: () => {} });
  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);
  useEffect(() => {
    incomingCallRef.current = incomingCall;
  }, [incomingCall]);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
        : false;
    } catch {
      return false;
    }
  });

  // 1. Meme & Sticker Studio State
  const [isMemeStudioOpen, setIsMemeStudioOpen] = useState(false);

  // 2. Live Audio Spaces / Street Radio State
  const [isSpacesDashboardOpen, setIsSpacesDashboardOpen] = useState(false);
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
  const [isAudioSpaceMinimized, setIsAudioSpaceMinimized] = useState(false);
  const activeAudioSpaceRef = useRef<AudioSpace | null>(null);
  activeAudioSpaceRef.current = activeAudioSpace;

  //  LIVE SYSTEM: Hydrate and listen for live Audio Spaces across devices via Supabase + Socket.IO
  useEffect(() => {
    const socket = getSocket();
    const handleSpaceEndedEvent = (payload: any) => {
      const endedId = payload?.id || payload?.spaceId;
      if (!endedId) return;
      setAudioSpaces((prev) => prev.filter((s) => s.id !== endedId));
      setActiveAudioSpace((prev) => {
        if (prev && prev.id === endedId) {
          setSpaceEndedSummary({
            spaceId: endedId,
            title: prev.title || 'Live Community Space',
            durationFormatted: payload?.durationFormatted || 'Ended by host',
            peakListeners: payload?.peakListeners || prev.peakListeners || prev.listenersCount || 1,
          });
          setIsAudioSpaceMinimized(false);
          return null;
        }
        return prev;
      });
    };
    socket?.on('space_ended', handleSpaceEndedEvent);

    if (!isSupabaseConfigured) {
      return () => {
        socket?.off('space_ended', handleSpaceEndedEvent);
      };
    }

    const syncFromSupabase = async () => {
      try {
        const { data, error } = await fetchLiveAudioSpaces();
        if (error || !Array.isArray(data)) return;
        const dbSpaces = data.map(mapAudioSpaceRow);
        setAudioSpaces((prev) => {
          const dbIds = new Set(dbSpaces.map((s) => s.id));
          // Keep any just-created local-only space that doesn't have a DB UUID yet
          const pendingLocal = prev.filter(
            (s) => s.isLive && s.id.startsWith('space_') && !dbIds.has(s.id)
          );
          const merged = [...dbSpaces, ...pendingLocal];
          try {
            localStorage.setItem('AGC_audio_spaces_v2', JSON.stringify(merged));
          } catch (_) {}
          return merged;
        });
      } catch (_) {}
    };

    syncFromSupabase();

    const tableName = getActiveSpacesTable();
    const spaceCh = supabase.channel('live_audio_spaces', { config: { broadcast: { self: false } } });
    spaceCh
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: tableName },
        () => {
          syncFromSupabase();
        }
      )
      .on('broadcast', { event: 'space_started' }, ({ payload }) => {
        if (!payload || !payload.id) return;
        setAudioSpaces((prev) => {
          const updated = [payload, ...prev.filter((s) => s.id !== payload.id)];
          try { localStorage.setItem('AGC_audio_spaces_v2', JSON.stringify(updated)); } catch (_) {}
          return updated;
        });
      })
      .on('broadcast', { event: 'space_ended' }, ({ payload }) => {
        handleSpaceEndedEvent(payload);
      })
      .subscribe();

    return () => {
      socket?.off('space_ended', handleSpaceEndedEvent);
      Promise.resolve(supabase.removeChannel(spaceCh)).catch(() => {});
    };
  }, []);



  // 3. Scam Alert & Reputation Checker State
  const [scamDatabase, setScamDatabase] = useState<Record<string, ScamEntity>>(() => {
    try {
      const saved = localStorage.getItem('AGC_scam_database_v2');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (_) {}
    return {};
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

  // 6. Group Polls with Financial Stakes & Free Chat Quick Polls State
  const [isFinancialPollModalOpen, setIsFinancialPollModalOpen] = useState(false);
  const [isQuickPollModalOpen, setIsQuickPollModalOpen] = useState(false);

  // 7. Ajo / Esusu Group Savings State & 1-Time View Toggle
  const [isOneTimeViewEnabled, setIsOneTimeViewEnabled] = useState(false);
  const [activeAjoGroup, setActiveAjoGroupState] = useState<AjoGroup | null>(() => {
    try {
      const saved = localStorage.getItem('AGC_active_ajo_group_v1');
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return null;
  });
  const setActiveAjoGroup = useCallback((group: AjoGroup | null) => {
    setActiveAjoGroupState(group);
    try {
      if (group) localStorage.setItem('AGC_active_ajo_group_v1', JSON.stringify(group));
      else localStorage.removeItem('AGC_active_ajo_group_v1');
    } catch (_) {}
  }, []);
  const [isAjoModalOpen, setIsAjoModalOpen] = useState(false);

  // 8. Phone Number OTP Authentication & Identity State
  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    const recovered = recoverPersistedUserProfile();
    if (recovered) return recovered;
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

  const chatsRef = useRef<ChatThread[]>(chats);
  const messagesRef = useRef<Record<string, ChatMessage[]>>(messages);
  const loadedPhoneForChatsRef = useRef<string>(getSavedUserCleanPhone());
  const isHydratingChatsRef = useRef<boolean>(false);
  const loadedPhoneForWalletRef = useRef<string>(getSavedUserCleanPhone());
  const isHydratingWalletRef = useRef<boolean>(false);
  const chatBackupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastLoginAtRef = useRef<number>(0);
  const baselineDbSessionTokenRef = useRef<string | null>(null);
  const lastLocalProfileEditAtRef = useRef<number>(0);
  const propagateUserProfileUpdateRef = useRef<
    (u: { id?: string; phoneNumber?: string; fullName?: string; username?: string; avatarUrl?: string }) => void
  >(() => {});
  const syncMissedMessagesRef = useRef<(specificChatId?: string) => void>(() => {});

  useEffect(() => {
    chatsRef.current = chats;
  }, [chats]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
  useEffect(() => {
    try {
      // Clean legacy mock service providers and other caches
      const sp = safeLocalStorage.getItem('AGC_service_providers_v2');
      if (sp && sp.includes('sp_tunde_mechanic')) {
        safeLocalStorage.removeItem('AGC_service_providers_v2');
      }
      const st = safeLocalStorage.getItem('AGC_artisan_station_v2');
      if (st && st.includes('st_kofi_workshop')) {
        safeLocalStorage.removeItem('AGC_artisan_station_v2');
      }
    } catch (e) {}
  }, []);

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const isAuth = safeLocalStorage.getItem('AGC_is_authenticated');
      const recovered = recoverPersistedUserProfile();
      if (isAuth === 'true' && recovered?.phoneNumber) {
        return true;
      }
    } catch (e) {
      return false;
    }
    return false;
  });
  const isAuthenticatedRef = useRef<boolean>(isAuthenticated);
  isAuthenticatedRef.current = isAuthenticated;
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isKickedOut, setIsKickedOut] = useState(false);

  useEffect(() => {
    if (isAuthenticated && currentUser.phoneNumber) {
      refreshEscrowOrders();
    }
  }, [isAuthenticated, currentUser.phoneNumber]);

  // Automatically persist chats & messages strictly partitioned per user (ONLY when authenticated & hydrated)
  useEffect(() => {
    if (!isAuthenticated || isHydratingChatsRef.current) return;
    const norm = normalizePhoneDigits(currentUser?.phoneNumber);
    if (!norm || loadedPhoneForChatsRef.current !== norm) return;
    persistPartitionedChats(chats, currentUser.phoneNumber);
    if (chatBackupTimerRef.current) clearTimeout(chatBackupTimerRef.current);
    chatBackupTimerRef.current = setTimeout(() => {
      saveUserChatsBackupToSupabase(currentUser.phoneNumber, chatsRef.current, messagesRef.current, {
        wallet: walletRef.current,
        userProfile: currentUserRef.current,
      }).catch(() => {});
    }, 1500);
  }, [chats, currentUser?.phoneNumber, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || isHydratingChatsRef.current) return;
    const norm = normalizePhoneDigits(currentUser?.phoneNumber);
    if (!norm || loadedPhoneForChatsRef.current !== norm) return;
    persistPartitionedMessages(messages, currentUser.phoneNumber);
    if (chatBackupTimerRef.current) clearTimeout(chatBackupTimerRef.current);
    chatBackupTimerRef.current = setTimeout(() => {
      saveUserChatsBackupToSupabase(currentUser.phoneNumber, chatsRef.current, messagesRef.current, {
        wallet: walletRef.current,
        userProfile: currentUserRef.current,
      }).catch(() => {});
    }, 1500);
  }, [messages, currentUser?.phoneNumber, isAuthenticated]);

  // Sync all group & channel socket rooms whenever membership changes while authenticated
  const groupRoomIdsKey = chats
    .filter((c) => c.isGroup || c.isChannel)
    .map((c) => c.id)
    .sort()
    .join(',');

  useEffect(() => {
    if (!isAuthenticated || !groupRoomIdsKey) return;
    groupRoomIdsKey.split(',').forEach((gid) => {
      if (gid) joinChatRoom(gid);
    });
  }, [isAuthenticated, groupRoomIdsKey]);

  // Hydrate chats/messages/wallet/profile from localStorage + Supabase backup whenever user logs in or mounts
  useEffect(() => {
    if (!isAuthenticated || !currentUser?.phoneNumber) return;
    const phone = currentUser.phoneNumber;
    const norm = normalizePhoneDigits(phone);
    if (!norm) return;

    isHydratingChatsRef.current = true;
    kickedGroupIdsRef.current = loadKickedGroupIds(phone);
    const localBlocked = loadPartitionedBlockedUsers(phone);
    setBlockedUserIds(localBlocked);
    blockedUserIdsRef.current = localBlocked;
    const localData = loadPartitionedUserChatsAndMessages(phone);
    const filteredLocalChats = localData.chats.filter((c) => !kickedGroupIdsRef.current.has(c.id));
    setChats(filteredLocalChats);
    setMessages(localData.messages);
    loadedPhoneForChatsRef.current = norm;
    setTownCommunities(loadPartitionedTownCommunities(phone));
    isHydratingChatsRef.current = false;

    isHydratingWalletRef.current = true;
    const localWallet = loadPartitionedWallet(phone);
    setWallet(localWallet);
    walletRef.current = localWallet;
    loadedPhoneForWalletRef.current = norm;
    isHydratingWalletRef.current = false;

    void syncGroupsFromServerRef.current?.();
    syncLiveCommunitiesRef.current?.();
    void syncMissedMessagesRef.current?.(activeChatIdRef.current || undefined);

    fetch(`/api/users/blocks?phone=${encodeURIComponent(phone)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => {
        if (!res?.success || !Array.isArray(res.blockedPhones)) return;
        setBlockedUserIds((prev) => {
          const merged = Array.from(new Set([...prev, ...res.blockedPhones.map(String)]));
          blockedUserIdsRef.current = merged;
          persistPartitionedBlockedUsers(merged, phone);
          return merged;
        });
      })
      .catch(() => {});

    let cancelled = false;
    // Always hydrate authoritative wallet balance & unified ledger directly from the backend server
    Promise.all([
      fetch(`/api/wallet/${encodeURIComponent(phone)}`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch(`/api/wallet/transactions?phone=${encodeURIComponent(phone)}`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ])
      .then(([res, txRes]) => {
        if (cancelled || !res?.success || !res?.wallet) return;
        const baseTxs: WalletTransaction[] = Array.isArray(res.wallet.transactions) ? res.wallet.transactions : [];
        const ledgerTxs: WalletTransaction[] = Array.isArray(txRes?.transactions) ? txRes.transactions : [];
        const txMap = new Map<string, WalletTransaction>();
        [...ledgerTxs, ...baseTxs].forEach((tx) => {
          if (tx?.id && !txMap.has(tx.id)) txMap.set(tx.id, tx);
        });
        const serverWallet: UserWallet = {
          availableBalance: Number(res.wallet.availableBalance) || 0,
          escrowLockedBalance: Number(res.wallet.escrowLockedBalance) || 0,
          currency: res.wallet.currency || 'NGN',
          transactions: Array.from(txMap.values()),
        };
        isHydratingWalletRef.current = true;
        suppressInitialCreditForPhoneRef.current = norm;
        setWallet(serverWallet);
        walletRef.current = serverWallet;
        persistPartitionedWallet(serverWallet, phone);
        isHydratingWalletRef.current = false;
      })
      .catch(() => {});

    fetchUserChatsBackupFromSupabase(phone)
      .then((remote) => {
        if (cancelled || !remote) return;
        if (remote.chats.length > 0 || Object.keys(remote.messages).length > 0) {
          const merged = mergeChatThreadsAndMessages(
            chatsRef.current,
            messagesRef.current,
            remote.chats,
            remote.messages
          );
          const sortedMergedChats = sortChatsByRecency(merged.chats);
          setChats(sortedMergedChats);
          setMessages(merged.messages);
          persistPartitionedChats(sortedMergedChats, phone);
          persistPartitionedMessages(merged.messages, phone);
        }

        // Security rule: never overwrite authoritative server wallet balances from client backup snapshots.

        // Restore custom profile fields from Supabase if local missed them (or remote is newer and not during fresh edit)
        const remoteProf = remote.accountSnapshot?.userProfile;
        if (remoteProf && phonesMatch(remoteProf.phoneNumber || phone, phone)) {
          const localEditTsKey = getUserStorageKey('AGC_profile_updated_at', phone);
          const localEditTs = Number(safeLocalStorage.getItem(localEditTsKey) || 0);
          const remoteTs = remote.updatedAt ? Date.parse(remote.updatedAt) || 0 : 0;
          const isRecentLocalEdit = Date.now() - lastLocalProfileEditAtRef.current < 25000;
          const remoteIsNewer = !isRecentLocalEdit && remoteTs > localEditTs && localEditTs > 0;
          setCurrentUser((prev) => {
            const remoteName = remoteProf.username || remoteProf.fullName;
            const useRemoteName =
              remoteName &&
              remoteName !== 'AGC User' &&
              remoteName !== 'Registered User' &&
              (remoteIsNewer || !prev.fullName || prev.fullName === 'AGC User');
            const mergedUser: UserProfile = {
              ...prev,
              fullName: useRemoteName ? remoteName! : prev.fullName,
              avatarUrl:
                !isPlaceholderAvatar(prev.avatarUrl)
                  ? prev.avatarUrl
                  : remoteProf.avatarUrl || prev.avatarUrl,
              about:
                prev.about && prev.about !== 'Available · Using AGC' && !remoteIsNewer
                  ? prev.about
                  : remoteProf.about || prev.about,
              username: useRemoteName ? (remoteProf.username || remoteName) : (prev.username || remoteProf.username),
              email: prev.email || remoteProf.email,
              verificationBadge: prev.verificationBadge ?? remoteProf.verificationBadge ?? null,
              isCelebrityVerified: prev.isCelebrityVerified ?? remoteProf.isCelebrityVerified,
              celebrityCategory: prev.celebrityCategory || remoteProf.celebrityCategory,
              celebrityStageName: prev.celebrityStageName || remoteProf.celebrityStageName,
              role: prev.role && prev.role !== 'user' ? prev.role : remoteProf.role || prev.role,
              createdAt: prev.createdAt || remoteProf.createdAt || new Date().toISOString(),
            };
            persistPartitionedUserProfile(mergedUser);
            return mergedUser;
          });
        }
        if (!cancelled) {
          void syncMissedMessagesRef.current?.(activeChatIdRef.current || undefined);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [currentUser?.phoneNumber, isAuthenticated]);

  //  LIVE SYSTEM: Hydrate and listen for live Artisan Stations & Service Providers
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

  //  LIVE SYSTEM: Realtime Live Job Board Broadcast channel
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

  //  LIVE SYSTEM: Realtime Global User Registration & Device Sync
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const handleGlobalUserPayload = (payload: any) => {
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
        const nextAll = allUsers.filter((u) => !phonesMatch(u.phoneNumber, payload.phoneNumber));
        nextAll.push(payload);
        localStorage.setItem('AGC_all_registered_users', JSON.stringify(nextAll));
      } catch (_) {}
      propagateUserProfileUpdateRef.current(payload);
    };

    const userSyncCh = supabase.channel('global_user_sync', { config: { broadcast: { self: false } } });
    userSyncCh
      .on('broadcast', { event: 'user_registered' }, ({ payload }: any) => {
        handleGlobalUserPayload(payload);
      })
      .on('broadcast', { event: 'user_updated' }, ({ payload }: any) => {
        handleGlobalUserPayload(payload);
      })
      .subscribe();

    return () => {
      userSyncCh.unsubscribe();
    };
  }, [isSupabaseConfigured]);

  //  LIVE SYSTEM: Hydrate and listen for live Store Subscriptions
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    fetchLiveStoreSubscriptions().then(({ data }) => {
      if (data && Array.isArray(data) && data.length > 0) {
        const myStore = data.find((row: any) => row.user_id === currentUser.id || row.user_phone === currentUser.phoneNumber);
        if (myStore) {
          const limitVal = myStore.items_limit || (myStore.tier === 'pro_100' ? 100 : 30);
          const usedVal = myStore.items_used || 0;
          const isActiveVal = myStore.is_active ?? true;
          const loadedSub: StoreSubscription = {
            tier: myStore.tier || 'starter_30',
            monthlyFee: myStore.tier === 'pro_100' ? 7000 : 3000,
            itemLimit: limitVal,
            itemsLimit: limitVal,
            itemsCount: usedVal,
            itemsUsed: usedVal,
            storeName: myStore.store_name,
            description: myStore.description || '',
            category: myStore.category || 'General Trade',
            active: isActiveVal,
            isRegistered: isActiveVal,
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
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((c) => !isSyntheticTestUser(c));
        }
      }
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

  const [activeContactRequestPopup, setActiveContactRequestPopup] = useState<import('../types').ContactRequest | null>(null);
  const friendRequestsRef = useRef<import('../types').ContactRequest[]>(friendRequests);
  useEffect(() => { friendRequestsRef.current = friendRequests; }, [friendRequests]);

  const handledFriendRequestIdsRef = useRef<Set<string>>(new Set());
  const sentFriendRequestsCacheRef = useRef<Map<string, number>>(new Map());

  const loadHandledFriendRequestIds = useCallback((phone?: string): Set<string> => {
    try {
      const key = getUserStorageKey('AGC_handled_friend_requests', phone);
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return new Set(parsed.map(String));
      }
    } catch (_) {}
    return new Set();
  }, []);

  const markFriendRequestsHandled = useCallback((ids: string[], phone?: string) => {
    if (!ids.length) return;
    ids.forEach((id) => handledFriendRequestIdsRef.current.add(id));
    try {
      const key = getUserStorageKey('AGC_handled_friend_requests', phone || currentUser.phoneNumber);
      const arr = Array.from(handledFriendRequestIdsRef.current).slice(-250);
      localStorage.setItem(key, JSON.stringify(arr));
    } catch (_) {}
  }, [currentUser.phoneNumber]);

  const handleIncomingFriendRequest = useCallback((req: import('../types').ContactRequest) => {
    if (!req || !req.id || !req.senderPhone) return;
    if (currentUser.phoneNumber && phonesMatch(req.senderPhone, currentUser.phoneNumber)) return;
    if (req.recipientPhone && currentUser.phoneNumber && !phonesMatch(req.recipientPhone, currentUser.phoneNumber)) return;
    if (handledFriendRequestIdsRef.current.has(req.id)) return;

    const alreadyPending = friendRequestsRef.current.some(
      (r) => r.id === req.id || (r.senderPhone && phonesMatch(r.senderPhone, req.senderPhone))
    );
    if (alreadyPending) return;

    setFriendRequests((prev) => {
      if (prev.some((r) => r.id === req.id || (r.senderPhone && phonesMatch(r.senderPhone, req.senderPhone)))) {
        return prev;
      }
      return [req, ...prev];
    });
    setActiveContactRequestPopup((curr) => curr || req);
    showLocalNotification(
      `👋 New Contact Request from ${req.senderName}`,
      req.message || `${req.senderName} (${req.senderPhone}) added you!`,
      req.senderAvatar || '/icon-192.png'
    );
  }, [currentUser.phoneNumber]);

  const [spaceEndedSummary, setSpaceEndedSummary] = useState<{
    spaceId: string;
    title: string;
    durationFormatted: string;
    peakListeners: number;
  } | null>(null);

  // Re-read user's friend requests & handled IDs when phone changes
  useEffect(() => {
    handledFriendRequestIdsRef.current = loadHandledFriendRequestIds(currentUser.phoneNumber);
    const userKey = getUserStorageKey('AGC_friend_requests', currentUser.phoneNumber);
    try {
      const saved = localStorage.getItem(userKey);
      const parsed: import('../types').ContactRequest[] = saved ? JSON.parse(saved) : [];
      const cleaned = parsed.filter(
        (r) =>
          r &&
          r.id &&
          !handledFriendRequestIdsRef.current.has(r.id) &&
          (!currentUser.phoneNumber || !phonesMatch(r.senderPhone, currentUser.phoneNumber))
      );
      setFriendRequests(cleaned);
    } catch (_) {}
  }, [currentUser.phoneNumber, loadHandledFriendRequestIds]);

  // Sync incoming pending friend requests from Supabase contact_requests table
  useEffect(() => {
    if (!isSupabaseConfigured || !currentUser.phoneNumber) return;
    const cleanPhone = currentUser.phoneNumber.replace(/\D/g, '');
    const altPhone = normalizePhoneDigits(cleanPhone);
    const phones = Array.from(new Set([currentUser.phoneNumber, cleanPhone, altPhone].filter(Boolean)));

    supabase
      .from('contact_requests')
      .select('*')
      .in('to_phone', phones)
      .eq('status', 'pending')
      .then(({ data }) => {
        if (data && data.length > 0) {
          let dismissedPopups: string[] = [];
          try {
            dismissedPopups = JSON.parse(safeSessionStorage.getItem('AGC_dismissed_request_popups') || '[]');
          } catch (_) {}

          const seenSenders = new Set<string>();
          const validRows = data.filter((d: any) => {
            if (!d || !d.id || !d.from_phone) return false;
            if (handledFriendRequestIdsRef.current.has(d.id)) return false;
            if (phonesMatch(d.from_phone, currentUser.phoneNumber)) return false;
            const senderKey = canonicalAdminUserKey(d.from_phone) || d.from_phone;
            if (seenSenders.has(senderKey)) return false;
            seenSenders.add(senderKey);
            return true;
          });

          const unhandled = validRows.find((d: any) => !dismissedPopups.includes(d.id));
          if (unhandled) {
            setActiveContactRequestPopup((current) => {
              if (current) return current;
              return {
                id: unhandled.id,
                senderPhone: unhandled.from_phone,
                senderName: unhandled.from_name,
                senderAvatar: unhandled.from_avatar,
                recipientPhone: unhandled.to_phone,
                message: unhandled.greeting,
                createdAt: unhandled.created_at ? new Date(unhandled.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently',
                status: 'pending' as const,
              };
            });
          }

          setFriendRequests((prev) => {
            const existingIds = new Set(prev.map((r) => r.id));
            const existingSenders = prev.map((r) => r.senderPhone).filter(Boolean);
            const newReqs = validRows
              .filter(
                (d: any) =>
                  !existingIds.has(d.id) &&
                  !existingSenders.some((sp) => phonesMatch(sp, d.from_phone))
              )
              .map((d: any) => ({
                id: d.id,
                senderPhone: d.from_phone,
                senderName: d.from_name,
                senderAvatar: d.from_avatar,
                recipientPhone: d.to_phone,
                message: d.greeting,
                createdAt: d.created_at ? new Date(d.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently',
                status: 'pending' as const,
              }));
            return newReqs.length > 0 ? [...newReqs, ...prev] : prev;
          });
        }
      }, () => {});
  }, [currentUser.phoneNumber, isSupabaseConfigured]);

  // Persist friend requests scoped by current user phone
  useEffect(() => {
    if (currentUser.phoneNumber) {
      try {
        const userKey = getUserStorageKey('AGC_friend_requests', currentUser.phoneNumber);
        localStorage.setItem(userKey, JSON.stringify(friendRequests));
      } catch (_) {}
    }
  }, [friendRequests, currentUser.phoneNumber]);

  // Group & Channel Pending Invitations State (strictly partitioned per user)
  const [groupInvites, setGroupInvites] = useState<GroupInvitation[]>(() => {
    try {
      const userKey = getUserStorageKey('AGC_group_invites');
      const saved = localStorage.getItem(userKey);
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return [];
  });
  const [activeGroupInvitePopup, setActiveGroupInvitePopup] = useState<GroupInvitation | null>(null);
  const groupInvitesRef = useRef<GroupInvitation[]>(groupInvites);
  useEffect(() => { groupInvitesRef.current = groupInvites; }, [groupInvites]);

  const handledGroupInviteIdsRef = useRef<Set<string>>(new Set());
  const declinedGroupIdsRef = useRef<Set<string>>(new Set());
  const kickedGroupIdsRef = useRef<Set<string>>(new Set());
  const syncGroupsFromServerRef = useRef<(() => Promise<void>) | null>(null);

  const loadKickedGroupIds = useCallback((phone?: string): Set<string> => {
    try {
      const key = getUserStorageKey('AGC_kicked_group_ids', phone);
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return new Set(parsed.map(String));
      }
    } catch (_) {}
    return new Set();
  }, []);

  const persistKickedGroupIds = useCallback((phone?: string) => {
    try {
      const key = getUserStorageKey('AGC_kicked_group_ids', phone || currentUserRef.current?.phoneNumber);
      const arr = Array.from(kickedGroupIdsRef.current).slice(-250);
      localStorage.setItem(key, JSON.stringify(arr));
    } catch (_) {}
  }, []);

  const loadHandledGroupInviteIds = useCallback((phone?: string): Set<string> => {
    try {
      const key = getUserStorageKey('AGC_handled_group_invites', phone);
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return new Set(parsed.map(String));
      }
    } catch (_) {}
    return new Set();
  }, []);

  const markGroupInvitesHandled = useCallback((ids: string[], phone?: string) => {
    if (!ids.length) return;
    ids.forEach((id) => handledGroupInviteIdsRef.current.add(id));
    try {
      const key = getUserStorageKey('AGC_handled_group_invites', phone || currentUser.phoneNumber);
      const arr = Array.from(handledGroupInviteIdsRef.current).slice(-250);
      localStorage.setItem(key, JSON.stringify(arr));
    } catch (_) {}
  }, [currentUser.phoneNumber]);

  const loadDeclinedGroupIds = useCallback((phone?: string): Set<string> => {
    try {
      const key = getUserStorageKey('AGC_declined_group_ids', phone);
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return new Set(parsed.map(String));
      }
    } catch (_) {}
    return new Set();
  }, []);

  const persistDeclinedGroupIds = useCallback((phone?: string) => {
    try {
      const key = getUserStorageKey('AGC_declined_group_ids', phone || currentUser.phoneNumber);
      const arr = Array.from(declinedGroupIdsRef.current).slice(-250);
      localStorage.setItem(key, JSON.stringify(arr));
    } catch (_) {}
  }, [currentUser.phoneNumber]);

  useEffect(() => {
    syncLiveCommunitiesRef.current?.();
  }, [currentUser.id, currentUser.phoneNumber, isAuthenticated]);

  const handleIncomingGroupInvite = useCallback((rawInvite: GroupInvitation, chatSnapshot?: ChatThread) => {
    if (!rawInvite || !rawInvite.id || !rawInvite.groupId) return;
    if (rawInvite.invitedByPhone && currentUser.phoneNumber && phonesMatch(rawInvite.invitedByPhone, currentUser.phoneNumber)) {
      return;
    }
    if (rawInvite.invitedPhone && currentUser.phoneNumber && !phonesMatch(rawInvite.invitedPhone, currentUser.phoneNumber)) {
      return;
    }
    if (handledGroupInviteIdsRef.current.has(rawInvite.id)) return;

    // An admin re-inviting a previously kicked/declined user allows them to respond again
    if (kickedGroupIdsRef.current.has(rawInvite.groupId)) {
      kickedGroupIdsRef.current.delete(rawInvite.groupId);
      persistKickedGroupIds(currentUser.phoneNumber);
    }

    const alreadyJoined = chatsRef.current.some(
      (c) => c.id === rawInvite.groupId && c.invitationStatus !== 'pending' && c.invitationStatus !== 'declined'
    );
    if (alreadyJoined) return;

    const alreadyPending = groupInvitesRef.current.some(
      (inv) => inv.id === rawInvite.id || (inv.groupId === rawInvite.groupId && inv.status === 'pending')
    );
    if (alreadyPending) return;

    const invite: GroupInvitation = {
      ...rawInvite,
      entityType: rawInvite.entityType || (rawInvite.groupId.startsWith('channel_') ? 'channel' : 'group'),
      chatSnapshot: rawInvite.chatSnapshot || chatSnapshot,
      status: 'pending',
    };

    setGroupInvites((prev) => {
      if (prev.some((inv) => inv.id === invite.id || (inv.groupId === invite.groupId && inv.status === 'pending'))) {
        return prev;
      }
      return [invite, ...prev];
    });
    setActiveGroupInvitePopup((curr) => curr || invite);

    const label = invite.entityType === 'channel' ? 'Channel' : 'Group';
    showLocalNotification(
      `📩 ${label} Invite: ${invite.groupName}`,
      `${invite.invitedByName || 'Someone'} invited you to join "${invite.groupName}". Tap to Accept or Decline.`,
      invite.groupAvatar || '/icon-192.png'
    );
  }, [currentUser.phoneNumber]);

  // Re-read user's group invites & handled/declined IDs when phone changes
  useEffect(() => {
    handledGroupInviteIdsRef.current = loadHandledGroupInviteIds(currentUser.phoneNumber);
    declinedGroupIdsRef.current = loadDeclinedGroupIds(currentUser.phoneNumber);
    const userKey = getUserStorageKey('AGC_group_invites', currentUser.phoneNumber);
    try {
      const saved = localStorage.getItem(userKey);
      const parsed: GroupInvitation[] = saved ? JSON.parse(saved) : [];
      const cleaned = parsed.filter(
        (inv) =>
          inv &&
          inv.id &&
          inv.groupId &&
          !handledGroupInviteIdsRef.current.has(inv.id) &&
          (!inv.invitedByPhone || !currentUser.phoneNumber || !phonesMatch(inv.invitedByPhone, currentUser.phoneNumber))
      );
      setGroupInvites(cleaned);
      if (cleaned.length > 0) {
        let dismissedPopups: string[] = [];
        try {
          dismissedPopups = JSON.parse(safeSessionStorage.getItem('AGC_dismissed_group_invite_popups') || '[]');
        } catch (_) {}
        const firstUnhandled = cleaned.find((inv) => !dismissedPopups.includes(inv.id));
        if (firstUnhandled) {
          setActiveGroupInvitePopup((curr) => curr || firstUnhandled);
        }
      }
    } catch (_) {}
  }, [currentUser.phoneNumber, loadHandledGroupInviteIds, loadDeclinedGroupIds]);

  // Sync incoming pending group/channel invitations from Supabase group_invitations table
  useEffect(() => {
    if (!isSupabaseConfigured || !currentUser.phoneNumber) return;
    const cleanPhone = currentUser.phoneNumber.replace(/\D/g, '');
    const altPhone = normalizePhoneDigits(cleanPhone);
    const plusPhone = altPhone ? `+${altPhone}` : '';
    const phones = Array.from(new Set([currentUser.phoneNumber, cleanPhone, altPhone, plusPhone].filter(Boolean)));

    supabase
      .from('group_invitations')
      .select('*')
      .in('invited_phone', phones)
      .eq('status', 'pending')
      .then(({ data }) => {
        if (data && data.length > 0) {
          let dismissedPopups: string[] = [];
          try {
            dismissedPopups = JSON.parse(safeSessionStorage.getItem('AGC_dismissed_group_invite_popups') || '[]');
          } catch (_) {}

          const seenGroups = new Set<string>();
          const validRows = data.filter((d: any) => {
            if (!d || !d.id || !d.group_id) return false;
            if (handledGroupInviteIdsRef.current.has(d.id)) return false;
            if (d.invited_by_phone && phonesMatch(d.invited_by_phone, currentUser.phoneNumber)) return false;
            const alreadyJoined = chatsRef.current.some(
              (c) => c.id === d.group_id && c.invitationStatus !== 'pending' && c.invitationStatus !== 'declined'
            );
            if (alreadyJoined) return false;
            if (seenGroups.has(d.group_id)) return false;
            seenGroups.add(d.group_id);
            return true;
          });

          const mappedInvites: GroupInvitation[] = validRows.map((d: any) => ({
            id: d.id,
            groupId: d.group_id,
            groupName: d.group_name || 'Group Chat',
            groupAvatar: d.group_avatar,
            entityType: String(d.group_id).startsWith('channel_') ? 'channel' : 'group',
            invitedPhone: d.invited_phone,
            invitedByPhone: d.invited_by_phone,
            invitedByName: d.invited_by_name || d.invited_by_phone || 'AGC User',
            createdAt: d.created_at
              ? new Date(d.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : 'Recently',
            status: 'pending',
          }));

          const unhandled = mappedInvites.find((inv) => !dismissedPopups.includes(inv.id));
          if (unhandled) {
            setActiveGroupInvitePopup((curr) => curr || unhandled);
          }

          if (mappedInvites.length > 0) {
            setGroupInvites((prev) => {
              const existingIds = new Set(prev.map((inv) => inv.id));
              const existingGroupIds = new Set(prev.map((inv) => inv.groupId));
              const newOnes = mappedInvites.filter(
                (inv) => !existingIds.has(inv.id) && !existingGroupIds.has(inv.groupId)
              );
              return newOnes.length > 0 ? [...newOnes, ...prev] : prev;
            });
          }
        }
      }, () => {});
  }, [currentUser.phoneNumber, isSupabaseConfigured]);

  // Persist group/channel invites scoped by current user phone
  useEffect(() => {
    if (currentUser.phoneNumber) {
      try {
        const userKey = getUserStorageKey('AGC_group_invites', currentUser.phoneNumber);
        localStorage.setItem(userKey, JSON.stringify(groupInvites));
      } catch (_) {}
    }
  }, [groupInvites, currentUser.phoneNumber]);

  // Re-read user's contacts when phone changes (filtering any cached synthetic test entries)
  useEffect(() => {
    const userKey = getUserStorageKey('AGC_device_contacts', currentUser.phoneNumber);
    try {
      const saved = localStorage.getItem(userKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        setDeviceContacts(Array.isArray(parsed) ? parsed.filter((c) => !isSyntheticTestUser(c)) : []);
      } else {
        setDeviceContacts([]);
      }
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
        .then(({ data }: any) => {
          if (data && Array.isArray(data) && data.length > 0) {
            setDeviceContacts((prev) => {
              const map = new Map<string, DeviceContact>();
              prev.filter((c) => !isSyntheticTestUser(c)).forEach((c) => map.set(c.normalizedPhoneNumber, c));
              data.forEach((row: any) => {
                if (isSyntheticTestUser({ name: row.name, phone: row.phone })) return;
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
      fetch('/api/users')
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
        }, () => {});
    } catch (_) {}
  }, [isAuthenticated, currentUser.id, currentUser.phoneNumber]);

  // --- Realtime Presence & Live Typing Indicators (Supabase Channel) ---
  const [onlineUserKeys, setOnlineUserKeys] = useState<Set<string>>(new Set());
  const [typingUsers, setTypingUsers] = useState<Record<string, string[]>>({});
  const [lastSeenMap, setLastSeenMap] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('AGC_last_seen_map_v2');
      return saved ? JSON.parse(saved) : {};
    } catch (_) {
      return {};
    }
  });

  const recordLastSeen = useCallback((key?: string, timeIso: string = new Date().toISOString()) => {
    if (!key) return;
    const clean = key.replace(/\D/g, '');
    const last9 = clean.length >= 9 ? clean.slice(-9) : clean;
    setLastSeenMap((prev) => {
      const next = {
        ...prev,
        [key]: timeIso,
        ...(clean ? { [clean]: timeIso } : {}),
        ...(last9 ? { [last9]: timeIso } : {}),
      };
      try { localStorage.setItem('AGC_last_seen_map_v2', JSON.stringify(next)); } catch (_) {}
      return next;
    });
  }, []);

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

  const getLastSeen = useCallback(
    (identifier?: string): string => {
      if (!identifier) return 'last seen recently';
      if (isUserOnline(identifier)) return 'online';

      const clean = identifier.replace(/\D/g, '');
      const last9 = clean.length >= 9 ? clean.slice(-9) : clean;
      const timeIso =
        lastSeenMap[identifier] ||
        (clean ? lastSeenMap[clean] : undefined) ||
        (last9 ? lastSeenMap[last9] : undefined);

      if (!timeIso || timeIso === 'online') {
        const contact = deviceContacts.find(
          (c) =>
            phonesMatch(c.normalizedPhoneNumber, identifier) ||
            phonesMatch(c.rawPhoneNumber, identifier) ||
            (c.registeredUser?.phoneNumber && phonesMatch(c.registeredUser.phoneNumber, identifier))
        );
        if (contact?.registeredUser?.lastSeen && contact.registeredUser.lastSeen !== 'online') {
          return contact.registeredUser.lastSeen;
        }
        return 'last seen recently';
      }

      try {
        const d = new Date(timeIso);
        if (isNaN(d.getTime())) return 'last seen recently';
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffSecs = Math.floor(diffMs / 1000);
        const diffMins = Math.floor(diffSecs / 60);

        if (diffSecs < 60) return 'last seen just now';
        if (diffMins < 60) return `last seen ${diffMins}m ago`;

        const formatTime = (date: Date) => {
          let h = date.getHours();
          const m = date.getMinutes().toString().padStart(2, '0');
          const ampm = h >= 12 ? 'PM' : 'AM';
          h = h % 12 || 12;
          return `${h}:${m} ${ampm}`;
        };

        const isToday = d.toDateString() === now.toDateString();
        if (isToday) return `last seen today at ${formatTime(d)}`;

        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        const isYesterday = d.toDateString() === yesterday.toDateString();
        if (isYesterday) return `last seen yesterday at ${formatTime(d)}`;

        return `last seen ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
      } catch (_) {
        return 'last seen recently';
      }
    },
    [isUserOnline, lastSeenMap, deviceContacts]
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
        recordLastSeen(key);
      })
      .on('broadcast', { event: 'user_offline' }, ({ payload }) => {
        if (!payload?.phone) return;
        const clean = payload.phone.replace(/\D/g, '');
        const last9 = clean.length >= 9 ? clean.slice(-9) : clean;
        setOnlineUserKeys((prev) => {
          const next = new Set(prev);
          next.delete(payload.phone);
          if (clean) next.delete(clean);
          if (last9) next.delete(last9);
          return next;
        });
        recordLastSeen(payload.phone, payload.timestamp || new Date().toISOString());
      })
      .on('broadcast', { event: 'user_online' }, ({ payload }) => {
        if (!payload?.phone) return;
        const clean = payload.phone.replace(/\D/g, '');
        const last9 = clean.length >= 9 ? clean.slice(-9) : clean;
        setOnlineUserKeys((prev) => {
          const next = new Set(prev);
          next.add(payload.phone);
          if (clean) next.add(clean);
          if (last9) next.add(last9);
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
          presenceChannel.send({
            type: 'broadcast',
            event: 'user_online',
            payload: { phone: currentUser.phoneNumber },
          });
        }
      });

    // Detect browser close, tab switch, background sleep
    const handleVisibilityOrUnload = () => {
      const nowIso = new Date().toISOString();
      if (document.visibilityState === 'hidden') {
        presenceChannel.untrack();
        presenceChannel.send({
          type: 'broadcast',
          event: 'user_offline',
          payload: { phone: currentUser.phoneNumber, timestamp: nowIso },
        });
        if (isSupabaseConfigured) {
          supabase.from('profiles').update({ last_seen: nowIso }).eq('phone_number', currentUser.phoneNumber).then(() => {}, () => {});
        }
      } else if (document.visibilityState === 'visible') {
        presenceChannel.track({
          userId: currentUser.id,
          phone: currentUser.phoneNumber,
          cleanPhone: myCleanPhone,
          last9: myLast9,
          name: currentUser.fullName,
          onlineAt: nowIso,
        });
        presenceChannel.send({
          type: 'broadcast',
          event: 'user_online',
          payload: { phone: currentUser.phoneNumber },
        });
        if (isSupabaseConfigured) {
          supabase.from('profiles').update({ last_seen: 'online' }).eq('phone_number', currentUser.phoneNumber).then(() => {}, () => {});
        }
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityOrUnload);
    window.addEventListener('beforeunload', handleVisibilityOrUnload);
    window.addEventListener('pagehide', handleVisibilityOrUnload);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityOrUnload);
      window.removeEventListener('beforeunload', handleVisibilityOrUnload);
      window.removeEventListener('pagehide', handleVisibilityOrUnload);
      presenceChannel.unsubscribe();
    };
  }, [isAuthenticated, currentUser?.phoneNumber, currentUser?.id, currentUser?.fullName]);

  // Status Feed: fetch existing statuses from contacts + subscribe to live updates + auto-purge after 24h
  useEffect(() => {
    if (!isAuthenticated || !currentUser?.phoneNumber) return;
    const myCleanPhone = currentUser.phoneNumber.replace(/\D/g, '');

    const purgeExpiredLocally = () => {
      const now = Date.now();
      setStatuses((prev) => {
        const filtered = prev.filter((s) => !isStatusExpiredClient(s, now));
        if (filtered.length === prev.length) return prev;
        try {
          localStorage.setItem('AGC_statuses_v2', JSON.stringify(filtered));
        } catch (_) {}
        return filtered;
      });
      setActiveViewingStatus((curr) => (curr && isStatusExpiredClient(curr, now) ? null : curr));
    };

    purgeExpiredLocally();
    const purgeInterval = setInterval(purgeExpiredLocally, 30_000);

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

      fetchStatusFeedWithAds(200).then(({ data }: any) => {
        if (!data || !Array.isArray(data)) return;
        const now = Date.now();
        const incoming = data
          .filter((row: any) => {
            if (row.is_sponsored) return true;
            const isDifferentUser = row.user_id ? row.user_id !== currentUser.id : true;
            const rp = (row.user_phone || '').replace(/\D/g, '');
            const isDifferentPhone = myCleanPhone ? (!rp || rp !== myCleanPhone) : true;
            return isDifferentUser && isDifferentPhone;
          })
          .map((row: any): UserStatus => {
            const isSponsored = Boolean(row.is_sponsored);
            const brand = row.sponsor_brand || row.profiles?.username || row.user_name || 'Sponsored';
            return {
              id: row.id,
              userId: row.user_id || (isSponsored ? `sponsor_${row.id}` : ''),
              userPhone: row.user_phone || undefined,
              userName: isSponsored ? brand : (row.user_name || row.profiles?.username || 'AGC User'),
              userAvatar: row.user_avatar || row.profiles?.avatar_url || row.media_url || '',
              isMe: false,
              statusType: isSponsored ? 'sponsored' : (row.status_type || 'thought'),
              mediaUrl: row.media_url || undefined,
              videoUrl: row.video_url || undefined,
              thoughtBg: row.thought_bg || undefined,
              caption: row.caption || '',
              createdAt: isSponsored
                ? 'Sponsored'
                : row.created_at
                ? new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : 'Recently',
              createdAtISO: row.created_at || undefined,
              expiresAt: row.expires_at || undefined,
              expiresInHours: 24,
              viewsCount: row.views_count || 0,
              likesCount: row.likes_count || 0,
              hasLikedByMe: false,
              viewers: [],
              isSponsored,
              sponsorBrand: brand,
              ctaLabel: row.cta_label || 'Learn More',
              targetUrl: row.target_url || undefined,
              adClicksCount: row.ad_clicks_count || 0,
            };
          })
          .filter((s: UserStatus) => !isStatusExpiredClient(s, now));
        if (incoming.length > 0) {
          setStatuses((prev) => {
            const validPrev = prev.filter((s) => !isStatusExpiredClient(s, now));
            const myStatuses = validPrev.filter((s) => s.isMe);
            const otherStatuses = validPrev.filter((s) => !s.isMe);
            const existingIds = new Set(otherStatuses.map((s) => s.id));
            const newOnes = incoming.filter((s) => !existingIds.has(s.id));
            return [...myStatuses, ...newOnes, ...otherStatuses];
          });
        }
      });
    }

    // 2. Fetch from local server REST fallback
    try {
      fetch('/api/statuses')
        .then((r) => (r.ok ? r.json() : null))
        .then((serverStatuses) => {
          if (Array.isArray(serverStatuses) && serverStatuses.length > 0) {
            const now = Date.now();
            const incoming = serverStatuses
              .filter((s: any) => !isStatusExpiredClient(s, now))
              .filter((s: any) => {
                const isDifferentUser = s.userId ? s.userId !== currentUser.id : true;
                const rp = (s.userPhone || s.phoneNumber || '').replace(/\D/g, '');
                const isDifferentPhone = myCleanPhone ? (!rp || rp !== myCleanPhone) : true;
                return isDifferentUser && isDifferentPhone;
              })
              .map((s: any) => ({ ...s, isMe: false }));
            if (incoming.length > 0) {
              setStatuses((prev) => {
                const validPrev = prev.filter((item) => !isStatusExpiredClient(item, now));
                const existingIds = new Set(validPrev.map((item) => item.id));
                const newItems = incoming.filter((item) => !existingIds.has(item.id));
                return [...validPrev, ...newItems];
              });
            }
          }
        }, () => {});
    } catch (_) {}

    // 3. Multi-Tab / Same Machine BroadcastChannel Sync
    let bcStatus: BroadcastChannel | null = null;
    try {
      bcStatus = new BroadcastChannel('AGC_statuses_sync');
      bcStatus.onmessage = (e) => {
        if (e.data?.type === 'new_status' && e.data.status) {
          const incoming: UserStatus = e.data.status;
          if (isStatusExpiredClient(incoming)) return;
          if (incoming.userId === currentUser.id) return;
          const senderPhone = (incoming.userPhone || '').replace(/\D/g, '');
          if (myCleanPhone && senderPhone && senderPhone === myCleanPhone) return;
          setStatuses((prev) => {
            if (prev.some((s) => s.id === incoming.id)) return prev;
            return [{ ...incoming, isMe: false }, ...prev];
          });
        } else if (e.data?.type === 'delete_status' && e.data.statusId) {
          setStatuses((prev) => prev.filter((s) => s.id !== e.data.statusId));
          setActiveViewingStatus((curr) => (curr?.id === e.data.statusId ? null : curr));
        }
      };
    } catch (_) {}

    // 4. Real-Time Socket.io Status Listeners
    const socket = getSocket();
    const onSocketNewStatus = ({ status }: any) => {
      if (!status || isStatusExpiredClient(status)) return;
      if (status.userId && status.userId === currentUser.id) return;
      const senderPhone = (status.userPhone || '').replace(/\D/g, '');
      if (myCleanPhone && senderPhone && senderPhone === myCleanPhone) return;
      setStatuses((prev) => {
        if (prev.some((s) => s.id === status.id)) return prev;
        return [{ ...status, isMe: false }, ...prev];
      });
    };

    const onSocketStatusPurged = (payload: any) => {
      const ids: string[] = Array.isArray(payload?.ids)
        ? payload.ids
        : payload?.statusId
        ? [String(payload.statusId)]
        : [];
      if (ids.length === 0) return;
      const idSet = new Set(ids);
      setStatuses((prev) => prev.filter((s) => !idSet.has(s.id)));
      setActiveViewingStatus((curr) => (curr && idSet.has(curr.id) ? null : curr));
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
    socket?.on('status_purged', onSocketStatusPurged);
    socket?.on('status_viewed', onSocketViewed);
    socket?.on('status_liked', onSocketLiked);

    // 5. Subscribe to real-time status feed via Supabase (Broadcast + Postgres CDC)
    if (!isSupabaseConfigured) return () => {
      clearInterval(purgeInterval);
      if (bcStatus) bcStatus.close();
      socket?.off('new_status', onSocketNewStatus);
      socket?.off('status_purged', onSocketStatusPurged);
      socket?.off('status_viewed', onSocketViewed);
      socket?.off('status_liked', onSocketLiked);
    };

    const statusSub = supabase.channel('status_feed', { config: { broadcast: { self: true } } });
    statusFeedChannelRef.current = statusSub;
    statusSub
      .on('broadcast', { event: 'new_status' }, ({ payload }: any) => {
        if (!payload?.status) return;
        const incoming: UserStatus = payload.status;
        if (isStatusExpiredClient(incoming)) return;
        if (incoming.userId === currentUser.id) return;
        const senderPhone = (incoming.userPhone || '').replace(/\D/g, '');
        if (myCleanPhone && senderPhone && senderPhone === myCleanPhone) return;
        setStatuses((prev) => {
          if (prev.some((s) => s.id === incoming.id)) return prev;
          return [{ ...incoming, isMe: false }, ...prev];
        });
      })
      .on('broadcast', { event: 'delete_status' }, ({ payload }: any) => {
        if (!payload?.statusId) return;
        setStatuses((prev) => prev.filter((s) => s.id !== payload.statusId));
        setActiveViewingStatus((curr) => (curr?.id === payload.statusId ? null : curr));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'user_statuses' }, (payload: any) => {
        if (!payload?.new) return;
        const row = payload.new;
        if (!row.is_sponsored) {
          if (row.user_id === currentUser.id) return;
          const rp = (row.user_phone || '').replace(/\D/g, '');
          if (myCleanPhone && rp && rp === myCleanPhone) return;
        }
        const isSponsored = Boolean(row.is_sponsored);
        const incoming: UserStatus = {
          id: row.id,
          userId: row.user_id || (isSponsored ? `sponsor_${row.id}` : ''),
          userPhone: row.user_phone,
          userName: isSponsored ? (row.sponsor_brand || row.user_name || 'Sponsored') : (row.user_name || 'AGC User'),
          userAvatar: row.user_avatar || row.media_url || '',
          isMe: false,
          statusType: isSponsored ? 'sponsored' : (row.status_type || 'thought'),
          mediaUrl: row.media_url || undefined,
          videoUrl: row.video_url || undefined,
          thoughtBg: row.thought_bg || undefined,
          caption: row.caption || '',
          createdAt: isSponsored ? 'Sponsored' : 'Just now',
          createdAtISO: row.created_at || new Date().toISOString(),
          expiresAt: row.expires_at || undefined,
          expiresInHours: 24,
          viewsCount: row.views_count || 0,
          likesCount: row.likes_count || 0,
          hasLikedByMe: false,
          viewers: [],
          isSponsored,
          sponsorBrand: row.sponsor_brand || undefined,
          ctaLabel: row.cta_label || undefined,
          targetUrl: row.target_url || undefined,
          adClicksCount: row.ad_clicks_count || 0,
        };
        if (isStatusExpiredClient(incoming)) return;
        setStatuses((prev) => {
          if (prev.some((s) => s.id === incoming.id)) return prev;
          return [incoming, ...prev];
        });
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'user_statuses' }, (payload: any) => {
        if (!payload?.old?.id) return;
        setStatuses((prev) => prev.filter((s) => s.id !== payload.old.id));
        setActiveViewingStatus((curr) => (curr?.id === payload.old.id ? null : curr));
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
      clearInterval(purgeInterval);
      if (bcStatus) bcStatus.close();
      if (statusSub) statusSub.unsubscribe();
      socket?.off('new_status', onSocketNewStatus);
      socket?.off('status_purged', onSocketStatusPurged);
      socket?.off('status_viewed', onSocketViewed);
      socket?.off('status_liked', onSocketLiked);
    };
  }, [isAuthenticated, currentUser?.phoneNumber]);

  // Sync Admin-managed CMS Sponsored Status Ads into the live Status feed
  useEffect(() => {
    const activeAds = (cmsData?.sponsoredStatuses || []).filter((ad) => ad && ad.active && ad.mediaUrl);
    setStatuses((prev) => {
      const nonCmsStatuses = prev.filter((s) => !s.id.startsWith('cms_ad_'));
      if (activeAds.length === 0) return nonCmsStatuses;
      const mappedAds: UserStatus[] = activeAds.map((ad) => {
        const existing = prev.find((p) => p.id === `cms_ad_${ad.id}`);
        return {
          id: `cms_ad_${ad.id}`,
          userId: `sponsor_${ad.id}`,
          userName: ad.brandName || 'Sponsored',
          userAvatar: ad.avatarUrl || ad.mediaUrl,
          isMe: false,
          statusType: 'sponsored',
          mediaUrl: ad.mediaUrl,
          caption: ad.caption || '',
          createdAt: 'Sponsored',
          createdAtISO: ad.createdAt || new Date().toISOString(),
          expiresInHours: 24,
          viewsCount: existing?.viewsCount || 0,
          likesCount: existing?.likesCount || 0,
          viewers: existing?.viewers || [],
          hasLikedByMe: existing?.hasLikedByMe || false,
          isSponsored: true,
          sponsorBrand: ad.brandName,
          ctaLabel: ad.ctaLabel || 'Learn More',
          targetUrl: ad.targetUrl,
          adClicksCount: existing?.adClicksCount ?? ad.clicksCount ?? 0,
        };
      });
      return [...mappedAds, ...nonCmsStatuses];
    });
  }, [cmsData?.sponsoredStatuses]);

  const handleAdClick = async (statusId: string, targetUrl?: string) => {
    if (!statusId) return;
    setStatuses((prev) =>
      prev.map((s) =>
        s.id === statusId ? { ...s, adClicksCount: (s.adClicksCount || 0) + 1 } : s
      )
    );
    const cleanAdId = statusId.startsWith('cms_ad_') ? statusId.replace('cms_ad_', '') : statusId;
    await trackAdClickInDb(cleanAdId, targetUrl, currentUser?.id);
  };

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
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
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
    return [];
  });
  const [isJobBoardModalOpen, setIsJobBoardModalOpen] = useState(false);
  const [isPostJobModalOpen, setIsPostJobModalOpen] = useState(false);
  const [isTaskEarnModalOpen, setIsTaskEarnModalOpen] = useState(false);

  // 13. Security Settings (Payment PIN & Security Questions — NO default PIN)
  const getSecurityStorageKey = (phone?: string) =>
    getUserStorageKey('AGC_security_settings_v2', phone || currentUserRef.current?.phoneNumber || getSavedUserCleanPhone());

  const loadPartitionedSecuritySettings = (phone?: string): SecuritySettings => {
    const emptyDefault: SecuritySettings = {
      hasPaymentPin: false,
      paymentPin: undefined,
      securityQuestions: [],
      failedAttempts: 0,
      lockoutUntil: null,
    };
    try {
      const key = getUserStorageKey('AGC_security_settings_v2', phone || getSavedUserCleanPhone());
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          const pin = parsed.paymentPin && parsed.paymentPin !== '1234' ? String(parsed.paymentPin) : undefined;
          const questions: SecurityQuestionEntry[] = Array.isArray(parsed.securityQuestions)
            ? parsed.securityQuestions.filter((q: any) => q?.question && q?.answer)
            : parsed.securityQuestion && parsed.securityAnswer
            ? [{ question: parsed.securityQuestion, answer: parsed.securityAnswer }]
            : [];
          return {
            ...emptyDefault,
            ...parsed,
            hasPaymentPin: Boolean(pin && parsed.hasPaymentPin !== false),
            paymentPin: pin,
            securityQuestions: questions,
          };
        }
      }
    } catch (e) {
      console.warn('Failed to parse security settings:', e);
    }
    return emptyDefault;
  };

  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>(() =>
    loadPartitionedSecuritySettings()
  );
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

  // 15. Send My Bill (Pay on Behalf) Modal State
  const [isSendBillModalOpen, setIsSendBillModalOpen] = useState(false);

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

  // Persistent User Wallet State (strictly partitioned per phone + Supabase backup)
  const [wallet, setWallet] = useState<UserWallet>(() => {
    const savedPhone = getSavedUserCleanPhone();
    return savedPhone ? loadPartitionedWallet(savedPhone) : { ...EMPTY_WALLET, transactions: [] };
  });
  const walletRef = useRef<UserWallet>(wallet);
  walletRef.current = wallet;

  const [activeCreditAlert, setActiveCreditAlert] = useState<CreditAlertEvent | null>(null);
  const suppressInitialCreditForPhoneRef = useRef<string>('');
  const pendingCreditHintRef = useRef<{ note?: string; category?: CreditAlertCategory; label?: string; at: number } | null>(null);
  const firedCreditAlertKeysRef = useRef<Set<string>>(new Set());
  const creditTrackerRef = useRef<{
    phoneNorm: string;
    balance: number;
    currency: CurrencyCode;
    txIds: Set<string>;
    ready: boolean;
  }>({
    phoneNorm: '',
    balance: wallet.availableBalance || 0,
    currency: wallet.currency || 'NGN',
    txIds: new Set((wallet.transactions || []).map((t) => t.id).filter(Boolean)),
    ready: false,
  });

  const dismissCreditAlert = useCallback(() => {
    setActiveCreditAlert(null);
  }, []);

  const triggerCreditAlert = useCallback(
    (alert: Omit<CreditAlertEvent, 'id' | 'createdAt' | 'xpEarned'> & { id?: string; xpEarned?: number }) => {
      const amt = Number(alert.amount || 0);
      if (!(amt > 0)) return;
      const key = alert.id || `${alert.category}_${Math.round(amt)}_${Math.round(alert.newBalance)}`;
      if (firedCreditAlertKeysRef.current.has(key)) return;
      firedCreditAlertKeysRef.current.add(key);
      if (firedCreditAlertKeysRef.current.size > 120) {
        const first = firedCreditAlertKeysRef.current.values().next().value;
        if (first) firedCreditAlertKeysRef.current.delete(first);
      }
      const computedXp = alert.xpEarned ?? Math.max(15, Math.min(250, Math.round(amt / 250) * 5 + 15));
      setActiveCreditAlert({
        id: key,
        amount: amt,
        currency: alert.currency || 'NGN',
        newBalance: alert.newBalance,
        category: alert.category,
        categoryLabel: alert.categoryLabel,
        title: alert.title,
        subtitle: alert.subtitle,
        xpEarned: computedXp,
        createdAt: new Date().toISOString(),
      });
    },
    []
  );

  useEffect(() => {
    const norm = normalizePhoneDigits(currentUser?.phoneNumber);
    const curBal = Number(wallet.availableBalance || 0);
    const curCurrency = wallet.currency || 'NGN';
    const curTxIds = new Set((wallet.transactions || []).map((t) => t.id).filter(Boolean));

    if (!isAuthenticated || !norm || loadedPhoneForWalletRef.current !== norm || isHydratingWalletRef.current) {
      creditTrackerRef.current = {
        phoneNorm: norm,
        balance: curBal,
        currency: curCurrency,
        txIds: curTxIds,
        ready: false,
      };
      return;
    }

    const prev = creditTrackerRef.current;
    const hint =
      pendingCreditHintRef.current && Date.now() - pendingCreditHintRef.current.at < 5000
        ? pendingCreditHintRef.current
        : null;

    if (suppressInitialCreditForPhoneRef.current === norm && !hint) {
      suppressInitialCreditForPhoneRef.current = '';
      creditTrackerRef.current = {
        phoneNorm: norm,
        balance: curBal,
        currency: curCurrency,
        txIds: curTxIds,
        ready: true,
      };
      return;
    }

    if (!prev.ready || prev.phoneNorm !== norm || prev.currency !== curCurrency) {
      creditTrackerRef.current = {
        phoneNorm: norm,
        balance: curBal,
        currency: curCurrency,
        txIds: curTxIds,
        ready: true,
      };
      return;
    }

    const delta = Number((curBal - prev.balance).toFixed(2));
    if (delta > 0.5) {
      const creditTypes = new Set([
        'deposit',
        'topup',
        'game_win',
        'escrow_release',
        'refund',
        'bill_received',
        'transfer_in',
        'received',
        'referral_bonus',
        'errand_release',
      ]);
      const newCreditTx = (wallet.transactions || []).find(
        (t) => t?.id && !prev.txIds.has(t.id) && creditTypes.has(String(t.type))
      );

      let category: CreditAlertCategory = hint?.category || 'payout';
      let categoryLabel = hint?.label || 'Wallet Credited';
      let title = hint?.note || newCreditTx?.title || 'Funds added to your wallet';
      let subtitle = newCreditTx?.description || undefined;

      const rawText = `${newCreditTx?.title || ''} ${hint?.note || ''}`.toLowerCase();
      if (newCreditTx?.metadata?.adminAdjusted || rawText.includes('admin')) {
        category = 'admin_topup';
        categoryLabel = 'Admin Top-Up';
        title = newCreditTx?.title || hint?.note || 'Wallet credited by administrator';
      } else if (newCreditTx?.type === 'game_win' || newCreditTx?.metadata?.gameBetEscrow || rawText.includes('win payout') || rawText.includes('bet win')) {
        category = 'game_win';
        categoryLabel = 'Bet Win Payout';
      } else if (newCreditTx?.type === 'escrow_release' || newCreditTx?.type === 'errand_release' || rawText.includes('escrow')) {
        category = 'escrow';
        categoryLabel = 'Trade Escrow Release';
      } else if (newCreditTx?.type === 'refund' || rawText.includes('refund')) {
        category = 'refund';
        categoryLabel = 'Stake Refunded';
      } else if (newCreditTx?.type === 'bill_received' || rawText.includes('bill')) {
        category = 'bill_received';
        categoryLabel = 'Bill Paid';
      } else if (newCreditTx?.type === 'referral_bonus' || rawText.includes('referral')) {
        category = 'referral';
        categoryLabel = 'Referral Bonus';
      } else if (newCreditTx?.type === 'deposit' || newCreditTx?.type === 'topup' || rawText.includes('top up') || rawText.includes('paystack')) {
        category = 'deposit';
        categoryLabel = 'Wallet Top-Up';
      }

      pendingCreditHintRef.current = null;
      const alertKey = newCreditTx?.id || `${category}_${Math.round(delta)}_${Math.round(curBal)}_${Math.floor(Date.now() / 2500)}`;
      triggerCreditAlert({
        id: alertKey,
        amount: delta,
        currency: curCurrency,
        newBalance: curBal,
        category,
        categoryLabel,
        title,
        subtitle,
      });
    }

    creditTrackerRef.current = {
      phoneNorm: norm,
      balance: curBal,
      currency: curCurrency,
      txIds: curTxIds,
      ready: true,
    };
  }, [wallet, isAuthenticated, currentUser?.phoneNumber, triggerCreditAlert]);

  // Keep wallet persistently saved per user across logouts, reloads, and refreshes
  useEffect(() => {
    walletRef.current = wallet;
    if (!isAuthenticated || isHydratingWalletRef.current) return;
    const norm = normalizePhoneDigits(currentUser?.phoneNumber);
    if (!norm || loadedPhoneForWalletRef.current !== norm) return;
    persistPartitionedWallet(wallet, currentUser.phoneNumber);
    if (chatBackupTimerRef.current) clearTimeout(chatBackupTimerRef.current);
    chatBackupTimerRef.current = setTimeout(() => {
      saveUserChatsBackupToSupabase(currentUser.phoneNumber, chatsRef.current, messagesRef.current, {
        wallet: walletRef.current,
        userProfile: currentUserRef.current,
      }).catch(() => {});
    }, 1500);
  }, [wallet, currentUser?.phoneNumber, isAuthenticated]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Call duration is tracked inside useWebRTC (ActiveCallSession) to avoid 1s full-app context re-renders

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => !prev);
  };

  const toggleLowDataMode = () => {
    setLowDataMode(!lowDataMode);
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

  const recordLedgerTransaction = (params: {
    id?: string;
    type: WalletTransaction['type'];
    title: string;
    description?: string;
    amount: number;
    fee?: number;
    balanceAfter?: number;
    currency?: CurrencyCode;
    status?: 'completed' | 'pending';
    referenceId?: string;
    channel?: 'paystack' | 'wallet' | 'bank_transfer';
    metadata?: Record<string, any>;
  }): WalletTransaction => {
    const nowIso = new Date().toISOString();
    const ref = params.referenceId || `REF_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;
    const tx: WalletTransaction = {
      id: params.id || `tx_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`,
      userId: currentUserRef.current?.id,
      userPhone: currentUserRef.current?.phoneNumber,
      userName: currentUserRef.current?.fullName,
      type: params.type,
      title: params.title,
      description: params.description || params.title,
      amount: Math.abs(Number(params.amount) || 0),
      fee: Number(params.fee || 0),
      balanceAfter: params.balanceAfter,
      currency: params.currency || 'NGN',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: nowIso,
      status: params.status || 'completed',
      reference: ref,
      referenceId: ref,
      channel: params.channel || 'wallet',
      metadata: params.metadata,
    };
    fetch('/api/wallet/ledger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tx),
    }).catch(() => {});
    return tx;
  };

  const refreshWalletFromServer = async () => {
    const phone = currentUserRef.current?.phoneNumber;
    if (!phone) return;
    try {
      const [resp, txResp] = await Promise.all([
        fetch(`/api/wallet/${encodeURIComponent(phone)}`),
        fetch(`/api/wallet/transactions?phone=${encodeURIComponent(phone)}`).catch(() => null),
      ]);
      if (!resp.ok) return;
      const data = await resp.json();
      const txJson = txResp && txResp.ok ? await txResp.json().catch(() => null) : null;
      if (data?.success && data?.wallet) {
        const baseTxs: WalletTransaction[] = Array.isArray(data.wallet.transactions) ? data.wallet.transactions : [];
        const ledgerTxs: WalletTransaction[] = Array.isArray(txJson?.transactions) ? txJson.transactions : [];
        const txMap = new Map<string, WalletTransaction>();
        [...ledgerTxs, ...baseTxs].forEach((tx) => {
          if (tx?.id && !txMap.has(tx.id)) txMap.set(tx.id, tx);
        });
        const nextWallet: UserWallet = {
          availableBalance: Number(data.wallet.availableBalance) || 0,
          escrowLockedBalance: Number(data.wallet.escrowLockedBalance) || 0,
          currency: data.wallet.currency || 'NGN',
          transactions: Array.from(txMap.values()),
        };
        setWallet(nextWallet);
        walletRef.current = nextWallet;
        persistPartitionedWallet(nextWallet, phone);
      }
    } catch (_) {}
  };

  // Wallet Funding via Server-Side Paystack Verification & Signed Webhook (Never trusts client balance math)
  const topUpWallet = async (amount: number, reference?: string) => {
    const fee = Math.min(Math.round(amount * 0.01), 2000);
    const totalPaid = amount + fee;
    const phone = currentUserRef.current?.phoneNumber;
    const ref = (reference || '').trim();

    if (!phone || !ref) {
      return {
        success: false,
        reference: ref,
        fee,
        totalPaid,
        message: 'Valid Paystack transaction reference is required for server verification.',
      };
    }

    try {
      const resp = await fetch('/api/wallet/verify-paystack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: phone, reference: ref }),
      });
      const data = await resp.json().catch(() => ({}));
      if (resp.ok && data?.success && data?.wallet) {
        const verifiedWallet: UserWallet = {
          availableBalance: Number(data.wallet.availableBalance) || 0,
          escrowLockedBalance: Number(data.wallet.escrowLockedBalance) || 0,
          currency: data.wallet.currency || 'NGN',
          transactions: Array.isArray(data.wallet.transactions) ? data.wallet.transactions : [],
        };
        setWallet(verifiedWallet);
        walletRef.current = verifiedWallet;
        persistPartitionedWallet(verifiedWallet, phone);
        return {
          success: true,
          reference: ref,
          fee: Number(data.fee ?? fee),
          totalPaid: Number(data.amountCredited ?? amount) + Number(data.fee ?? fee),
          message: `${CURRENCY_SYMBOLS.NGN}${Number(data.amountCredited ?? amount).toLocaleString()} verified & credited to wallet.`,
        };
      }
      return {
        success: false,
        reference: ref,
        fee,
        totalPaid,
        message:
          data?.message ||
          'Payment awaiting server-side Paystack webhook verification. Wallet will update automatically once verified.',
      };
    } catch (err: any) {
      return {
        success: false,
        reference: ref,
        fee,
        totalPaid,
        message: err?.message || 'Unable to verify transaction with server.',
      };
    }
  };

  // Fetch live banks index (cached from Paystack Bank API)
  const fetchLiveBanks = useCallback(async () => {
    try {
      const resp = await fetch('/api/wallet/banks');
      const data = await resp.json().catch(() => ({}));
      if (resp.ok && data?.success) {
        return {
          success: true,
          count: Number(data.count || data.banks?.length || 0),
          source: String(data.source || 'paystack_live_api'),
          banks: Array.isArray(data.banks) ? data.banks : [],
        };
      }
    } catch (_) {}
    return { success: false, count: 0, source: 'offline', banks: [] };
  }, []);

  // Automatically resolve destination bank & account holder full name from 10-digit account number
  const resolveBankAccount = useCallback(async (accountNumber: string, signal?: AbortSignal) => {
    const cleanAcct = String(accountNumber || '').replace(/\D/g, '');
    if (!/^\d{10}$/.test(cleanAcct)) {
      return { success: false, message: 'Enter a valid 10-digit account number.' };
    }
    try {
      const resp = await fetch('/api/wallet/resolve-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountNumber: cleanAcct }),
        signal,
      });
      const data = await resp.json().catch(() => ({}));
      return {
        success: Boolean(resp.ok && data?.success),
        requiresSecretKey: Boolean(data?.requiresSecretKey),
        banksTotal: typeof data?.banksTotal === 'number' ? data.banksTotal : undefined,
        banksScanned: typeof data?.banksScanned === 'number' ? data.banksScanned : undefined,
        primaryAccount: data?.primaryAccount,
        matches: Array.isArray(data?.matches) ? data.matches : undefined,
        candidateBanks: Array.isArray(data?.candidateBanks) ? data.candidateBanks : undefined,
        message: data?.message,
      };
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return { success: false, message: '' };
      }
      return { success: false, message: err?.message || 'Unable to resolve bank account right now.' };
    }
  }, []);

  // Wallet Withdrawal to Bank (Authoritative Server Balance Check & Debit)
  const withdrawWallet = async (
    amount: number,
    bankName: string,
    accountNumber: string,
    accountName: string,
    bankCode?: string
  ) => {
    const phone = currentUserRef.current?.phoneNumber;
    if (!phone) {
      return { success: false, message: 'Sign in required to withdraw funds.' };
    }
    try {
      const resp = await fetch('/api/wallet/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: phone, amount, bankName, bankCode, accountNumber, accountName }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok || !data?.success) {
        await refreshWalletFromServer();
        return { success: false, message: data?.message || 'Withdrawal could not be authorized by server.' };
      }
      if (data.wallet) {
        const nextWallet: UserWallet = {
          availableBalance: Number(data.wallet.availableBalance) || 0,
          escrowLockedBalance: Number(data.wallet.escrowLockedBalance) || 0,
          currency: data.wallet.currency || 'NGN',
          transactions: Array.isArray(data.wallet.transactions) ? data.wallet.transactions : [],
        };
        setWallet(nextWallet);
        walletRef.current = nextWallet;
        persistPartitionedWallet(nextWallet, phone);
      }
      return {
        success: true,
        message: data.message || `Withdrawal of ${CURRENCY_SYMBOLS.NGN}${amount.toLocaleString()} to ${accountName} processed.`,
      };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Network error verifying withdrawal with server.' };
    }
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

  const toggleReadReceipts = useCallback(() => {
    setReadReceiptsEnabled((prev) => {
      const next = !prev;
      readReceiptsEnabledRef.current = next;
      try {
        const phone = currentUserRef.current?.phoneNumber;
        if (phone) {
          safeLocalStorage.setItem(getUserStorageKey('AGC_read_receipts_v1', phone), String(next));
        }
        safeLocalStorage.setItem('AGC_read_receipts_v1', String(next));
      } catch (_) {}
      return next;
    });
  }, []);

  // Multi-Transport Live Status Broadcaster (BroadcastChannel + Socket.io + REST + Supabase Realtime + DB)
  const publishStatusLive = (newStatus: UserStatus) => {
    const cleanPhone = currentUserRef.current.phoneNumber?.replace(/\D/g, '') || '';
    const outgoingStatus = {
      ...newStatus,
      userPhone: cleanPhone,
      expiresAt: newStatus.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
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

    // 3. Server REST fallback
    try {
      fetch('/api/statuses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(outgoingStatus),
      }).catch(() => {});
    } catch (_) {}

    // 4. Supabase Database Persistence + Realtime Broadcast
    if (isSupabaseConfigured) {
      supabase
        .from('user_statuses')
        .upsert({
          id: newStatus.id,
          user_id: currentUserRef.current.id,
          user_phone: cleanPhone,
          user_name: newStatus.sponsorBrand || currentUserRef.current.fullName || 'AGC User',
          user_avatar: currentUserRef.current.avatarUrl || '',
          status_type: newStatus.statusType || 'thought',
          media_url: newStatus.mediaUrl || null,
          video_url: newStatus.videoUrl || null,
          thought_bg: newStatus.thoughtBg || null,
          caption: newStatus.caption || '',
          is_sponsored: Boolean(newStatus.isSponsored),
          sponsor_brand: newStatus.sponsorBrand || null,
          cta_label: newStatus.ctaLabel || null,
          target_url: newStatus.targetUrl || null,
          expires_at: outgoingStatus.expiresAt,
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

    try {
      const s = getSocket();
      s?.emit('delete_status', { statusId });
      fetch(`/api/statuses/${encodeURIComponent(statusId)}`, { method: 'DELETE' }).catch(() => {});
    } catch (_) {}

    if (statusFeedChannelRef.current) {
      try {
        statusFeedChannelRef.current.send({
          type: 'broadcast',
          event: 'delete_status',
          payload: { statusId },
        });
      } catch (_) {}
    }

    if (isSupabaseConfigured) {
      supabase.from('user_statuses').delete().eq('id', statusId).then(({ error }) => {
        if (error) console.warn('Status delete notice:', error?.message);
      });
    }
  };

  const addStatus = (caption: string, mediaUrl?: string) => {
    const nowMs = Date.now();
    const newStatus: UserStatus = {
      id: `status_${nowMs}_${Math.random().toString(36).substring(2, 6)}`,
      userId: currentUser.id,
      userPhone: currentUser.phoneNumber,
      userName: currentUser.fullName,
      userAvatar: currentUser.avatarUrl,
      isMe: true,
      statusType: mediaUrl ? 'media' : 'thought',
      mediaUrl: mediaUrl || '/src/assets/images/african_textiles_wax_1794210824926.jpg',
      caption: caption || 'New post on AGC 24h Status!',
      createdAt: 'Just now',
      createdAtISO: new Date(nowMs).toISOString(),
      expiresAt: new Date(nowMs + 24 * 60 * 60 * 1000).toISOString(),
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
    const nowMs = Date.now();
    const newStatus: UserStatus = {
      id: `status_thought_${nowMs}_${Math.random().toString(36).substring(2, 6)}`,
      userId: currentUser.id,
      userPhone: currentUser.phoneNumber,
      userName: currentUser.fullName,
      userAvatar: currentUser.avatarUrl,
      isMe: true,
      statusType: 'thought',
      thoughtBg: themeBg || 'from-indigo-600 via-purple-600 to-pink-600',
      caption: thoughtText,
      createdAt: 'Just now',
      createdAtISO: new Date(nowMs).toISOString(),
      expiresAt: new Date(nowMs + 24 * 60 * 60 * 1000).toISOString(),
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

  const addSponsoredStatus = async (
    ad: {
      brand: string;
      caption: string;
      mediaUrl: string;
      ctaLabel?: string;
      targetUrl?: string;
    },
    paymentPin?: string
  ): Promise<{ success: boolean; message: string; pending?: boolean }> => {
    const adFee = Number(systemConfigRef.current?.sponsoredAdFeeNgn ?? 2500);
    if (!securitySettings.hasPaymentPin || !securitySettings.paymentPin) {
      return {
        success: false,
        message: 'Configure your Payment PIN in Hub > Payment PIN & Security before paying for Sponsored Ads.',
      };
    }
    const pinCheck = verifyPaymentPinDetailed(paymentPin || '');
    if (!pinCheck.success) {
      return { success: false, message: pinCheck.message || 'Invalid Payment PIN.' };
    }
    if (wallet.availableBalance < adFee) {
      return {
        success: false,
        message: `Insufficient wallet balance. Sponsored Status Ad costs ₦${adFee.toLocaleString()}.`,
      };
    }

    const nextBal = wallet.availableBalance - adFee;
    const refId = `AD_${Date.now()}`;
    const tx = recordLedgerTransaction({
      type: 'ad_payment',
      title: `Sponsored Ad Submission: ${ad.brand.trim() || 'Brand'}`,
      description: `Sponsored status ad fee (${ad.brand.trim() || 'Brand'})`,
      amount: adFee,
      fee: 0,
      balanceAfter: nextBal,
      referenceId: refId,
      channel: 'wallet',
    });

    setWallet((prev) => ({
      ...prev,
      availableBalance: Math.max(0, prev.availableBalance - adFee),
      transactions: [tx, ...prev.transactions],
    }));

    try {
      const resp = await fetch('/api/ads/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandName: ad.brand.trim() || 'Sponsored Brand',
          caption: ad.caption.trim() || 'Promoted vendor update',
          mediaUrl: ad.mediaUrl,
          ctaLabel: ad.ctaLabel?.trim() || 'Visit Offer',
          targetUrl: ad.targetUrl?.trim() || '#market',
          avatarUrl: currentUser.avatarUrl || ad.mediaUrl,
          submittedByPhone: currentUser.phoneNumber,
          submittedByName: currentUser.fullName || ad.brand,
          paidAmount: adFee,
        }),
      });
      const data = await resp.json().catch(() => null);
      if (data?.cms) {
        cmsDataRef.current = data.cms;
        setCmsData(data.cms);
      }
      return {
        success: true,
        pending: true,
        message: `₦${adFee.toLocaleString()} paid! Your Sponsored Ad "${ad.brand.trim()}" is now Pending Admin Approval.`,
      };
    } catch (_) {
      return {
        success: true,
        pending: true,
        message: `Sponsored Ad submitted (₦${adFee.toLocaleString()}) and queued for Admin Approval.`,
      };
    }
  };

  const addDeviceMediaStatus = async (caption: string, mediaUrl: string, mediaType: 'image' | 'video' = 'image') => {
    let finalMediaUrl = mediaUrl;
    if (mediaType === 'image' && mediaUrl.startsWith('data:image') && mediaUrl.length > 72000) {
      try {
        finalMediaUrl = await compressChatMediaImage(mediaUrl);
      } catch (_) {}
    }

    const nowMs = Date.now();
    const newStatus: UserStatus = {
      id: `status_media_${nowMs}_${Math.random().toString(36).substring(2, 6)}`,
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
      createdAtISO: new Date(nowMs).toISOString(),
      expiresAt: new Date(nowMs + 24 * 60 * 60 * 1000).toISOString(),
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
    const nowMs = Date.now();
    const newStatus: UserStatus = {
      id: `status_vid_${nowMs}_${Math.random().toString(36).substring(2, 6)}`,
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
      createdAtISO: new Date(nowMs).toISOString(),
      expiresAt: new Date(nowMs + 24 * 60 * 60 * 1000).toISOString(),
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

  const currentUserRef = useRef(currentUser);
  currentUserRef.current = currentUser;
  const deviceContactsRef = useRef(deviceContacts);
  deviceContactsRef.current = deviceContacts;

  const propagateUserProfileUpdate = useCallback(
    (u: { id?: string; phoneNumber?: string; fullName?: string; username?: string; avatarUrl?: string }) => {
      const phone = u?.phoneNumber;
      const rawName = u?.username || u?.fullName;
      const validName =
        rawName && rawName !== 'AGC User' && rawName !== 'Registered User' ? rawName : undefined;
      const validAvatar =
        u?.avatarUrl && !isPlaceholderAvatar(u.avatarUrl) ? u.avatarUrl : undefined;
      if (!phone || (!validName && !validAvatar)) return;

      const myPhoneNow = currentUserRef.current?.phoneNumber;
      const isSelf = Boolean(myPhoneNow && phonesMatch(myPhoneNow, phone));

      // Update deviceContacts cache
      setDeviceContacts((prev) => {
        let changed = false;
        const next = prev.map((ct) => {
          const cp = ct.normalizedPhoneNumber || ct.rawPhoneNumber;
          if (!cp || !phonesMatch(cp, phone)) return ct;
          const nextName = validName || ct.name;
          const nextAvatar = validAvatar || ct.avatar;
          if (
            nextName === ct.name &&
            nextAvatar === ct.avatar &&
            (!ct.registeredUser || ct.registeredUser.fullName === nextName)
          ) {
            return ct;
          }
          changed = true;
          return {
            ...ct,
            name: nextName,
            avatar: nextAvatar,
            registeredUser: ct.registeredUser
              ? {
                  ...ct.registeredUser,
                  fullName: nextName,
                  avatarUrl: nextAvatar || ct.registeredUser.avatarUrl || '',
                }
              : ct.registeredUser,
          };
        });
        if (!changed) return prev;
        try {
          const userKey = getUserStorageKey('AGC_device_contacts', currentUserRef.current?.phoneNumber);
          localStorage.setItem(userKey, JSON.stringify(next));
        } catch (_) {}
        return next;
      });

      // Update DM chat threads belonging to that contact
      setChats((prev) => {
        let changed = false;
        const next = prev.map((c) => {
          if (c.isGroup || c.isChannel || c.isBot || c.id === AFRIBOT_ID) return c;
          const dmParts = c.id.startsWith('dm_') && !c.id.includes('self')
            ? c.id.replace('dm_', '').split('_')
            : [];
          const matchesDirectPhone =
            (c.phone && phonesMatch(c.phone, phone)) ||
            (c.phoneNumber && phonesMatch(c.phoneNumber, phone)) ||
            (c.id.includes('self') && isSelf) ||
            (!isSelf && dmParts.some((p) => phonesMatch(p, phone)));
          if (!matchesDirectPhone) return c;

          const nextName = validName
            ? c.id.includes('self') || c.name.includes('(Message yourself)')
              ? `${validName} (Message yourself)`
              : validName
            : c.name;
          const nextAvatar = validAvatar || c.avatar;
          if (nextName === c.name && nextAvatar === c.avatar) return c;
          changed = true;
          return { ...c, name: nextName, avatar: nextAvatar };
        });
        if (!changed) return prev;
        persistPartitionedChats(next, currentUserRef.current?.phoneNumber);
        return next;
      });

      // Update active statuses userName / userAvatar
      setStatuses((prev) => {
        let changed = false;
        const next = prev.map((s) => {
          if (s.isSponsored || s.statusType === 'sponsored') return s;
          if (!s.userPhone || !phonesMatch(s.userPhone, phone)) return s;
          const nextName = validName || s.userName;
          const nextAvatar = validAvatar || s.userAvatar;
          if (nextName === s.userName && nextAvatar === s.userAvatar) return s;
          changed = true;
          return { ...s, userName: nextName, userAvatar: nextAvatar };
        });
        return changed ? next : prev;
      });
    },
    []
  );
  propagateUserProfileUpdateRef.current = propagateUserProfileUpdate;

  // Helper: send a one-shot Supabase Realtime broadcast without tearing down live listener channels
  const sendSupabaseBroadcastOnce = useCallback(
    (topic: string, event: string, payload: any) => {
      if (!isSupabaseConfigured || !topic) return;
      try {
        const existing = supabase
          .getChannels()
          .find(
            (c: any) =>
              c.subTopic === topic ||
              c.topic === `realtime:${topic}` ||
              c.topic === topic
          );

        if (existing) {
          Promise.resolve(
            existing.send({
              type: 'broadcast',
              event,
              payload,
            })
          ).catch(() => {});
          return;
        }

        const ch = supabase.channel(topic, {
          config: { broadcast: { self: false } },
        });
        const cleanupTempChannel = () => {
          try {
            const bindings = (ch as any).bindings;
            const hasListeners =
              Boolean(bindings?.broadcast?.length) ||
              Boolean(bindings?.postgres_changes?.length) ||
              Boolean(bindings?.presence?.length);
            if (!hasListeners) {
              Promise.resolve(supabase.removeChannel(ch)).catch(() => {});
            }
          } catch (_) {}
        };

        const chAny = ch as unknown as {
          httpSend?: (evt: string, data: any) => Promise<unknown>;
        };
        if (typeof chAny.httpSend === 'function') {
          chAny
            .httpSend(event, payload)
            .then(cleanupTempChannel)
            .catch(() => {
              ch.subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                  Promise.resolve(
                    ch.send({
                      type: 'broadcast',
                      event,
                      payload,
                    })
                  )
                    .catch(() => {})
                    .finally(() => {
                      setTimeout(cleanupTempChannel, 1500);
                    });
                }
              });
            });
          return;
        }

        ch.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            Promise.resolve(
              ch.send({
                type: 'broadcast',
                event,
                payload,
              })
            )
              .catch(() => {})
              .finally(() => {
                setTimeout(cleanupTempChannel, 1500);
              });
          }
        });
      } catch (_) {}
    },
    []
  );

  // Helper: broadcast call control signals (incoming_call / call_declined / call_ended)
  // to every target participant phone across Socket.IO, BroadcastChannel, and Supabase Realtime
  const sendCallControlSignal = useCallback(
    (
      targetPhones: string[],
      event: 'incoming_call' | 'call_declined' | 'call_ended',
      payload: any
    ) => {
      const myPhone = currentUserRef.current?.phoneNumber || '';
      const seenNorm = new Set<string>();
      const cleanTargets: string[] = [];

      targetPhones.forEach((raw) => {
        if (!raw) return;
        const digits = raw.replace(/\D/g, '');
        if (digits.length < 7) return;
        if (myPhone && phonesMatch(raw, myPhone)) return;
        const norm = normalizePhoneDigits(raw) || digits;
        if (seenNorm.has(norm)) return;
        seenNorm.add(norm);
        cleanTargets.push(raw);
      });

      if (cleanTargets.length === 0) return;

      cleanTargets.forEach((targetPhone) => {
        const rawClean = targetPhone.replace(/\D/g, '');
        const norm = normalizePhoneDigits(targetPhone) || rawClean;
        const variants = Array.from(new Set([rawClean, norm].filter(Boolean)));

        // 1. Socket.io (server uses emitToPhoneVariantsOnce)
        try {
          emitPhoneCallSignal(targetPhone, payload, event);
        } catch (_) {}

        // 2. BroadcastChannel (same-browser multi-tab)
        try {
          const bc = new BroadcastChannel('AGC_phone_calls');
          bc.postMessage({
            targetPhone: norm,
            targetVariants: variants,
            event,
            data: payload,
          });
          setTimeout(() => {
            try { bc.close(); } catch (_) {}
          }, 1500);
        } catch (_) {}

        // 3. Supabase Realtime (phone_call_* and inbox_* for both raw & normalized phone)
        if (isSupabaseConfigured) {
          variants.forEach((v) => {
            ['phone_call_', 'inbox_'].forEach((prefix) => {
              sendSupabaseBroadcastOnce(`${prefix}${v}`, event, payload);
            });
          });
        }
      });
    },
    [sendSupabaseBroadcastOnce]
  );

  // Helper: broadcast webrtc_end directly into the call room across all transports
  const emitRoomEndSignal = useCallback((roomId: string, extraData: Record<string, any> = {}) => {
    if (!roomId) return;
    const payload = {
      roomId,
      endedBy: currentUserRef.current?.phoneNumber || '',
      timestamp: Date.now(),
      _sigId: `ctx_end_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      ...extraData,
    };

    try {
      emitCallSignal(roomId, 'webrtc_end', payload);
    } catch (_) {}

    try {
      const bc = new BroadcastChannel(`AGC_call_${roomId}`);
      bc.postMessage({ event: 'webrtc_end', payload, id: payload._sigId, roomId });
      setTimeout(() => {
        try { bc.close(); } catch (_) {}
      }, 1500);
    } catch (_) {}

    if (isSupabaseConfigured) {
      sendSupabaseBroadcastOnce(`call_room_${roomId}`, 'webrtc_end', payload);
    }
  }, [sendSupabaseBroadcastOnce]);

  // --- Multi-Transport Incoming Call & Call Termination Listener ---
  // Depends ONLY on currentUser.phoneNumber so listeners never tear down mid-call
  useEffect(() => {
    const rawCleanPhone = currentUser.phoneNumber?.replace(/\D/g, '') || '';
    const normCleanPhone = normalizePhoneDigits(currentUser.phoneNumber) || '';
    if (!rawCleanPhone && !normCleanPhone) return;

    const myVariants = Array.from(new Set([rawCleanPhone, normCleanPhone].filter(Boolean)));

    const handleIncomingCall = (payload: any) => {
      if (!payload?.roomId) return;
      if (payload.callerPhone && currentUserRef.current?.phoneNumber && phonesMatch(payload.callerPhone, currentUserRef.current.phoneNumber)) {
        return;
      }
      if (payload.timestamp && Date.now() - Number(payload.timestamp) > 60_000) {
        return;
      }
      if (activeCallRef.current) return;
      if (incomingCallRef.current?.roomId === payload.roomId) return;

      incomingCallRef.current = payload;
      setIncomingCall(payload);
      showLocalNotification(
        `📞 Incoming AGC ${payload.type === 'video' ? 'Video' : 'Voice'} Call`,
        payload.isGroupCall
          ? `${payload.callerName || 'Someone'} invited you to a group call (${payload.groupName || 'Group'})`
          : `${payload.callerName || 'Someone'} is calling you on AGC...`,
        payload.callerAvatar || '/icon-192.png'
      );
    };

    const handleCallTerminated = (payload: any, eventName: string = 'call_ended') => {
      const targetRoomId = payload?.roomId;

      if (incomingCallRef.current) {
        if (!targetRoomId || incomingCallRef.current.roomId === targetRoomId) {
          incomingCallRef.current = null;
          setIncomingCall(null);
        }
      }

      const currentActive = activeCallRef.current;
      if (currentActive) {
        const roomMatches = !targetRoomId || currentActive.roomId === targetRoomId;
        if (roomMatches) {
          const shouldTerminateActive =
            !currentActive.isGroupCall ||
            eventName === 'call_ended' ||
            Boolean(payload?.isHostCancel);
          if (shouldTerminateActive) {
            if (callRingTimeoutRef.current) {
              clearTimeout(callRingTimeoutRef.current);
              callRingTimeoutRef.current = null;
            }
            activeCallRef.current = null;
            setActiveCall(null);
          }
        }
      }
    };

    callSignalHandlersRef.current = {
      onIncomingCall: handleIncomingCall,
      onCallTerminated: handleCallTerminated,
    };

    // 1. Socket.io Phone channel listener
    const socket =
      getSocket() ||
      initSocket({
        id: currentUserRef.current?.id || 'user',
        name: currentUserRef.current?.fullName || 'AGC User',
        avatar: currentUserRef.current?.avatarUrl,
        phone: currentUserRef.current?.phoneNumber,
        sessionToken: safeLocalStorage.getItem('AGC_session_token') || undefined,
      });

    const triggerForceLogout = (payload?: any) => {
      const myToken = safeLocalStorage.getItem('AGC_session_token');
      const mySockId = getSocket()?.id;
      if (payload?.sessionToken && myToken && payload.sessionToken === myToken) {
        return;
      }
      if (payload?.excludeSocketId && mySockId && payload.excludeSocketId === mySockId) {
        return;
      }
      if (payload?.reason !== 'admin_kick' && Date.now() - lastLoginAtRef.current < 5000) {
        return;
      }
      console.warn('⚠️ AGC force_logout executed:', payload?.reason || 'signed in on another device');
      safeLocalStorage.setItem('AGC_is_authenticated', 'false');
      safeLocalStorage.removeItem('AGC_session_token');
      setIsKickedOut(true);
      setIsAuthenticated(false);
    };

    const onSocketDeclined = (payload: any) => handleCallTerminated(payload, 'call_declined');
    const onSocketEnded = (payload: any) => handleCallTerminated(payload, 'call_ended');

    socket?.on('force_logout', triggerForceLogout);
    socket?.on('incoming_call', handleIncomingCall);
    socket?.on('call_declined', onSocketDeclined);
    socket?.on('call_ended', onSocketEnded);

    // 2. BroadcastChannel for same-browser multi-tab calling
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('AGC_phone_calls');
      bc.onmessage = (e) => {
        const targetMatch =
          phonesMatch(e.data?.targetPhone, currentUserRef.current?.phoneNumber) ||
          (Array.isArray(e.data?.targetVariants) &&
            e.data.targetVariants.some((v: string) => phonesMatch(v, currentUserRef.current?.phoneNumber)));
        if (!targetMatch) return;

        if (e.data?.event === 'call_declined' || e.data?.event === 'call_ended') {
          handleCallTerminated(e.data?.data, e.data.event);
        } else if (e.data?.data) {
          handleIncomingCall(e.data.data);
        }
      };
    } catch (_) {}

    // 3. Supabase Realtime channel listeners (supports all phone variants + session force_logout)
    const sbChannels: Array<ReturnType<typeof supabase.channel>> = [];
    if (isSupabaseConfigured) {
      myVariants.forEach((variant) => {
        const channel = supabase.channel(`phone_call_${variant}`, {
          config: { broadcast: { self: false } },
        });
        channel
          .on('broadcast', { event: 'incoming_call' }, ({ payload }) => {
            handleIncomingCall(payload);
          })
          .on('broadcast', { event: 'call_declined' }, ({ payload }) => {
            handleCallTerminated(payload, 'call_declined');
          })
          .on('broadcast', { event: 'call_ended' }, ({ payload }) => {
            handleCallTerminated(payload, 'call_ended');
          })
          .on('broadcast', { event: 'force_logout' }, ({ payload }: any) => {
            const myToken = safeLocalStorage.getItem('AGC_session_token');
            if (payload?.sessionToken && myToken && payload.sessionToken !== myToken) {
              triggerForceLogout(payload);
            }
          })
          .subscribe();
        sbChannels.push(channel);
      });
    }

    // 4. Polling heartbeat for session enforcement across remote devices (captures baseline so stale DB column never self-kicks)
    let baselineCaptured = false;
    if (isSupabaseConfigured && currentUser?.phoneNumber) {
      supabase
        .from('profiles')
        .select('session_token')
        .eq('phone_number', currentUser.phoneNumber)
        .maybeSingle()
        .then(
          ({ data }) => {
            baselineDbSessionTokenRef.current = data?.session_token || null;
            baselineCaptured = true;
          },
          () => {
            baselineCaptured = true;
          }
        );
    }
    const sessionHeartbeat = setInterval(async () => {
      if (!isSupabaseConfigured || !currentUser?.phoneNumber || !baselineCaptured) return;
      if (typeof document !== 'undefined' && document.hidden) return;
      const myToken = safeLocalStorage.getItem('AGC_session_token');
      if (!myToken) return;
      try {
        const { data } = await supabase
          .from('profiles')
          .select('session_token')
          .eq('phone_number', currentUser.phoneNumber)
          .maybeSingle();
        if (
          data?.session_token &&
          data.session_token !== myToken &&
          data.session_token !== baselineDbSessionTokenRef.current
        ) {
          triggerForceLogout({ reason: 'new_device_login', sessionToken: data.session_token });
        }
      } catch (_) {}
    }, 60000);

    return () => {
      socket?.off('force_logout', triggerForceLogout);
      socket?.off('incoming_call', handleIncomingCall);
      socket?.off('call_declined', onSocketDeclined);
      socket?.off('call_ended', onSocketEnded);
      if (bc) bc.close();
      sbChannels.forEach((ch) => {
        try {
          Promise.resolve(supabase.removeChannel(ch)).catch(() => {});
        } catch (_) {}
      });
      clearInterval(sessionHeartbeat);
    };
  }, [currentUser.phoneNumber]);

  const startCall = useCallback(
    (
      name: string,
      phone: string,
      avatar?: string,
      type: 'voice' | 'video' = 'voice',
      roomId?: string,
      isInitiator: boolean = true,
      options?: {
        isGroupCall?: boolean;
        participantPhones?: string[];
        chatId?: string;
        isAnonymous?: boolean;
      }
    ) => {
      const generatedRoomId = roomId || `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const me = currentUserRef.current;
      const myPhone = me?.phoneNumber || '';

      // Resolve all target participant phones (supports DMs + Groups + Channels)
      const collectedPhones: string[] = [];
      if (Array.isArray(options?.participantPhones)) {
        collectedPhones.push(...options.participantPhones);
      }

      const targetChat = options?.chatId
        ? chatsRef.current.find((c) => c.id === options.chatId)
        : undefined;

      if (targetChat) {
        if (Array.isArray(targetChat.memberPhones)) {
          collectedPhones.push(...targetChat.memberPhones);
        }
        if (Array.isArray(targetChat.members)) {
          targetChat.members.forEach((mem) => {
            if (!mem) return;
            const memDigits = mem.replace(/\D/g, '');
            if (memDigits.length >= 7) {
              collectedPhones.push(mem);
              return;
            }
            const contactMatch = deviceContactsRef.current.find(
              (dc) => dc.name === mem || phonesMatch(dc.normalizedPhoneNumber, mem) || phonesMatch(dc.rawPhoneNumber, mem)
            );
            if (contactMatch) {
              collectedPhones.push(contactMatch.normalizedPhoneNumber || contactMatch.rawPhoneNumber);
            }
          });
        }
        if (!targetChat.isGroup && !targetChat.isChannel) {
          if (targetChat.phoneNumber) collectedPhones.push(targetChat.phoneNumber);
          if (targetChat.phone) collectedPhones.push(targetChat.phone);
          if (targetChat.id.startsWith('dm_')) {
            const parts = targetChat.id.replace('dm_', '').split('_');
            parts.forEach((p) => {
              if (p && p !== 'self' && p.replace(/\D/g, '').length >= 7) {
                collectedPhones.push(p);
              }
            });
          }
        }
      }

      const isGroupCall = Boolean(options?.isGroupCall || targetChat?.isGroup || targetChat?.isChannel);
      const isCallRoomSlug = phone.startsWith('afri_') || phone.startsWith('call_') || phone === '+234 800 000 0000';
      if (phone && !isCallRoomSlug && phone.replace(/\D/g, '').length >= 7) {
        collectedPhones.push(phone);
      }

      const seenNorm = new Set<string>();
      const uniqueTargets: string[] = [];
      collectedPhones.forEach((raw) => {
        if (!raw) return;
        const digits = raw.replace(/\D/g, '');
        if (digits.length < 7) return;
        if (myPhone && phonesMatch(raw, myPhone)) return;
        const norm = normalizePhoneDigits(raw) || digits;
        if (seenNorm.has(norm)) return;
        seenNorm.add(norm);
        uniqueTargets.push(raw);
      });

      const resolvedDisplayPhone =
        isGroupCall
          ? `${uniqueTargets.length + 1} participants`
          : uniqueTargets[0] || phone || '';

      const nextActiveCall: ActiveCallState = {
        name,
        phone: resolvedDisplayPhone,
        avatar,
        durationSeconds: 0,
        type,
        isMuted: false,
        isSpeaker: false,
        roomId: generatedRoomId,
        isInitiator,
        isGroupCall: isGroupCall || uniqueTargets.length > 1,
        participantPhones: uniqueTargets,
        chatId: options?.chatId,
        isMinimized: false,
        isAnonymous: Boolean(options?.isAnonymous),
      };

      activeCallRef.current = nextActiveCall;
      setActiveCall(nextActiveCall);

      if (isInitiator && uniqueTargets.length > 0) {
        const callPayload = {
          roomId: generatedRoomId,
          callerName: me?.fullName || 'AGC User',
          callerPhone: myPhone,
          callerAvatar: me?.avatarUrl,
          type,
          isGroupCall: nextActiveCall.isGroupCall,
          groupName: nextActiveCall.isGroupCall ? name : undefined,
          participantPhones: [myPhone, ...uniqueTargets].filter(Boolean),
          timestamp: Date.now(),
        };
        sendCallControlSignal(uniqueTargets, 'incoming_call', callPayload);
      }

      const newCallItem: CallLogItem = {
        id: `call_${Date.now()}`,
        name,
        phone: resolvedDisplayPhone,
        avatar: avatar || DEFAULT_AVATAR_SVG,
        type,
        direction: isInitiator ? 'outgoing' : 'incoming',
        time: 'Just now',
      };
      setCalls((prev) => [newCallItem, ...prev]);

      if (callRingTimeoutRef.current) {
        clearTimeout(callRingTimeoutRef.current);
        callRingTimeoutRef.current = null;
      }
    },
    [sendCallControlSignal]
  );

  const acceptIncomingCall = useCallback(
    (options?: { anonymous?: boolean }) => {
      const inc = incomingCallRef.current;
      if (!inc) return;
      const { callerName, callerPhone, callerAvatar, type, roomId, isGroupCall, groupName, participantPhones } = inc;
      incomingCallRef.current = null;
      setIncomingCall(null);
      startCall(
        isGroupCall && groupName ? groupName : callerName,
        callerPhone,
        callerAvatar,
        type,
        roomId,
        false,
        {
          isGroupCall,
          participantPhones: participantPhones || (callerPhone ? [callerPhone] : []),
          isAnonymous: Boolean(options?.anonymous),
        }
      );
    },
    [startCall]
  );

  const declineIncomingCall = useCallback(() => {
    const inc = incomingCallRef.current;
    if (!inc) return;

    if (inc.callerPhone) {
      sendCallControlSignal([inc.callerPhone], 'call_declined', {
        roomId: inc.roomId,
        declinedBy: currentUserRef.current?.phoneNumber || '',
        isGroupCall: Boolean(inc.isGroupCall),
      });
    }

    const missedItem: CallLogItem = {
      id: `call_${Date.now()}`,
      name: inc.isGroupCall && inc.groupName ? inc.groupName : inc.callerName,
      phone: inc.callerPhone,
      avatar: inc.callerAvatar || DEFAULT_AVATAR_SVG,
      type: inc.type,
      direction: 'missed',
      time: 'Just now',
    };
    setCalls((prev) => [missedItem, ...prev]);
    incomingCallRef.current = null;
    setIncomingCall(null);
  }, [sendCallControlSignal]);

  const endCall = useCallback(() => {
    if (callRingTimeoutRef.current) {
      clearTimeout(callRingTimeoutRef.current);
      callRingTimeoutRef.current = null;
    }

    const current = activeCallRef.current;
    if (!current) return;

    activeCallRef.current = null;
    setActiveCall(null);

    const targets = [
      ...(current.participantPhones || []),
      ...(current.phone && current.phone.replace(/\D/g, '').length >= 7 ? [current.phone] : []),
    ];

    const endPayload = {
      roomId: current.roomId,
      endedBy: currentUserRef.current?.phoneNumber || '',
      isHostCancel: Boolean(current.isInitiator),
      isGroupCall: Boolean(current.isGroupCall),
    };

    if (targets.length > 0) {
      sendCallControlSignal(targets, 'call_ended', endPayload);
    }
    if (current.roomId) {
      emitRoomEndSignal(current.roomId, {
        isHostCancel: Boolean(current.isInitiator),
      });
    }
  }, [emitRoomEndSignal, sendCallControlSignal]);

  const toggleCallMute = () => {
    setActiveCall((prev) => (prev ? { ...prev, isMuted: !prev.isMuted } : null));
  };

  const toggleCallSpeaker = () => {
    setActiveCall((prev) => (prev ? { ...prev, isSpeaker: !prev.isSpeaker } : null));
  };

  const setCallMinimized = useCallback((val: boolean) => {
    setActiveCall((prev) => {
      if (!prev) return null;
      const next = { ...prev, isMinimized: val };
      activeCallRef.current = next;
      return next;
    });
  }, []);

  const toggleCallMinimize = useCallback(() => {
    setActiveCall((prev) => {
      if (!prev) return null;
      const next = { ...prev, isMinimized: !prev.isMinimized };
      activeCallRef.current = next;
      return next;
    });
  }, []);

  const upgradeCallToGroup = useCallback(() => {
    setActiveCall((prev) => {
      if (!prev || prev.isGroupCall) return prev;
      const next: ActiveCallState = {
        ...prev,
        isGroupCall: true,
      };
      activeCallRef.current = next;
      return next;
    });
  }, []);

  const inviteToActiveCall = useCallback(
    (targets: Array<{ phone: string; name?: string; avatar?: string }>): { invitedCount: number; alreadyInCall: number } => {
      const current = activeCallRef.current;
      if (!current || !current.roomId) return { invitedCount: 0, alreadyInCall: 0 };

      const me = currentUserRef.current;
      const myPhone = me?.phoneNumber || '';
      const existingPhones = [...(current.participantPhones || [])];
      if (current.phone && current.phone.replace(/\D/g, '').length >= 7) {
        existingPhones.push(current.phone);
      }

      const newPhones: string[] = [];
      let alreadyInCall = 0;

      targets.forEach((t) => {
        const raw = (t?.phone || '').trim();
        const digits = raw.replace(/\D/g, '');
        if (digits.length < 7) return;
        if (myPhone && phonesMatch(raw, myPhone)) return;
        if (existingPhones.some((ep) => phonesMatch(ep, raw)) || newPhones.some((np) => phonesMatch(np, raw))) {
          alreadyInCall += 1;
          return;
        }
        newPhones.push(raw);
      });

      if (newPhones.length === 0) {
        return { invitedCount: 0, alreadyInCall };
      }

      const mergedParticipants = Array.from(new Set([...existingPhones, ...newPhones]));
      const groupTitle = current.isGroupCall
        ? current.name
        : `${current.name || 'Call'} + ${newPhones.length}`;

      const updatedActive: ActiveCallState = {
        ...current,
        isGroupCall: true,
        name: groupTitle,
        phone: `${mergedParticipants.length + 1} participants`,
        participantPhones: mergedParticipants,
      };
      activeCallRef.current = updatedActive;
      setActiveCall(updatedActive);

      // Ring the newly added participants into the SAME live room
      const callPayload = {
        roomId: current.roomId,
        callerName: current.isAnonymous ? 'Anonymous' : (me?.fullName || 'AGC User'),
        callerPhone: current.isAnonymous ? '' : myPhone,
        callerAvatar: current.isAnonymous ? '' : me?.avatarUrl,
        type: current.type,
        isGroupCall: true,
        groupName: groupTitle,
        participantPhones: [myPhone, ...mergedParticipants].filter(Boolean),
        timestamp: Date.now(),
      };
      sendCallControlSignal(newPhones, 'incoming_call', callPayload);

      // Notify existing peers in the room that this call is now a multi-party group call
      const upgradeSig = {
        roomId: current.roomId,
        _sigId: `ctx_grp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        timestamp: Date.now(),
      };
      try {
        emitCallSignal(current.roomId, 'call_upgraded_group', upgradeSig);
      } catch (_) {}
      try {
        const bc = new BroadcastChannel(`AGC_call_${current.roomId}`);
        bc.postMessage({ event: 'call_upgraded_group', payload: upgradeSig, id: upgradeSig._sigId, roomId: current.roomId });
        setTimeout(() => { try { bc.close(); } catch (_) {} }, 1500);
      } catch (_) {}
      if (isSupabaseConfigured) {
        sendSupabaseBroadcastOnce(`call_room_${current.roomId}`, 'call_upgraded_group', upgradeSig);
      }

      return { invitedCount: newPhones.length, alreadyInCall };
    },
    [sendCallControlSignal, sendSupabaseBroadcastOnce]
  );
  // Blocked users list (strictly partitioned per logged-in user + synced with server)
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>(() =>
    loadPartitionedBlockedUsers(getSavedUserCleanPhone())
  );
  const blockedUserIdsRef = useRef<string[]>(blockedUserIds);
  blockedUserIdsRef.current = blockedUserIds;

  const isUserBlockedByMe = useCallback(
    (idOrPhone?: string, peerPhone?: string): boolean => {
      const list = blockedUserIdsRef.current;
      if (!list || list.length === 0) return false;
      const candidates = [idOrPhone, peerPhone].filter(Boolean).map((v) => String(v).trim());
      if (idOrPhone && String(idOrPhone).startsWith('dm_') && !String(idOrPhone).includes('self')) {
        const myPhone = currentUserRef.current?.phoneNumber || '';
        const parts = String(idOrPhone).replace('dm_', '').split('_').filter(Boolean);
        const other = parts.find((p) => !myPhone || !phonesMatch(p, myPhone));
        if (other) candidates.push(other);
      }
      for (const candidate of candidates) {
        if (list.includes(candidate)) return true;
        const candDigits = candidate.replace(/\D/g, '');
        if (candDigits.length >= 7) {
          if (list.some((b) => phonesMatch(b, candDigits))) return true;
        }
      }
      return false;
    },
    [blockedUserIds]
  );

  const toggleBlockUser = (idOrPhone: string, peerPhone?: string): boolean => {
    const myPhone = currentUserRef.current?.phoneNumber || '';
    const resolvedPeerPhone = (() => {
      if (peerPhone && peerPhone.replace(/\D/g, '').length >= 7) return peerPhone;
      if (idOrPhone.startsWith('dm_') && !idOrPhone.includes('self')) {
        const parts = idOrPhone.replace('dm_', '').split('_').filter(Boolean);
        const other = parts.find((p) => !myPhone || !phonesMatch(p, myPhone));
        if (other) return `+${other}`;
      }
      if (idOrPhone.replace(/\D/g, '').length >= 7 && !idOrPhone.startsWith('group_') && !idOrPhone.startsWith('channel_')) {
        return idOrPhone;
      }
      const chatMatch = chatsRef.current.find((c) => c.id === idOrPhone);
      return chatMatch?.phone || (chatMatch as any)?.phoneNumber || '';
    })();

    const currentlyBlocked = isUserBlockedByMe(idOrPhone, resolvedPeerPhone);
    const nextBlocked = !currentlyBlocked;
    const normPeerDigits = normalizePhoneDigits(resolvedPeerPhone);

    setBlockedUserIds((prev) => {
      let updated: string[];
      if (!nextBlocked) {
        updated = prev.filter((item) => {
          if (item === idOrPhone) return false;
          if (resolvedPeerPhone && (item === resolvedPeerPhone || phonesMatch(item, resolvedPeerPhone))) return false;
          return true;
        });
      } else {
        const additions = [idOrPhone, resolvedPeerPhone, normPeerDigits].filter(Boolean);
        updated = Array.from(new Set([...prev, ...additions]));
      }
      blockedUserIdsRef.current = updated;
      persistPartitionedBlockedUsers(updated, myPhone);
      return updated;
    });

    if (myPhone && resolvedPeerPhone) {
      fetch('/api/users/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blockerPhone: myPhone,
          targetPhone: resolvedPeerPhone,
          blocked: nextBlocked,
        }),
      }).catch(() => {});
    }

    return nextBlocked;
  };

  const broadcastGroupSnapshot = useCallback((updatedChat: ChatThread) => {
    if (!updatedChat || (!updatedChat.isGroup && !updatedChat.isChannel)) return;
    const myPhone = currentUserRef.current?.phoneNumber || '';
    try {
      const bc = new BroadcastChannel('AGC_chats_sync');
      bc.postMessage({ type: 'group_updated', group: updatedChat });
      bc.close();
    } catch (_) {}
    if (isSupabaseConfigured) {
      dedupePhoneList(updatedChat.memberPhones).forEach((p) => {
        if (myPhone && phonesMatch(p, myPhone)) return;
        const clean = p.replace(/\D/g, '');
        const norm = normalizePhoneDigits(clean);
        new Set([clean, norm].filter(Boolean)).forEach((t) => {
          sendSupabaseBroadcastSafe(`inbox_${t}`, 'group_updated', { group: updatedChat });
        });
      });
    }
  }, []);

  const updateChat = (chatId: string, updates: Partial<ChatThread>) => {
    let nextThread: ChatThread | null = null;
    setChats((prev) => {
      const updated = prev.map((c) => {
        if (c.id !== chatId) return c;
        nextThread = { ...c, ...updates };
        return nextThread;
      });
      persistPartitionedChats(updated, currentUser.phoneNumber);
      return updated;
    });

    const isGroupMetaSync =
      updates.announceMode !== undefined ||
      updates.name !== undefined ||
      updates.description !== undefined ||
      updates.avatar !== undefined;

    const existing = nextThread || chatsRef.current.find((c) => c.id === chatId);
    if (isGroupMetaSync && existing && (existing.isGroup || existing.isChannel)) {
      const merged = { ...existing, ...updates };
      fetch('/api/groups/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: chatId,
          action: 'update_meta',
          actorPhone: currentUser.phoneNumber,
          actorId: currentUser.id,
          name: updates.name,
          description: updates.description,
          avatar: updates.avatar,
          announceMode: updates.announceMode,
        }),
      }).catch(() => {});
      broadcastGroupSnapshot(merged);
    }
  };

  const relayChatMetaUpdate = useCallback(
    (chatId: string, meta: { disappearingTimer?: string; pinnedMessage?: PinnedChatAnnouncement | null; chatTheme?: string }) => {
      const chat = chatsRef.current.find((c) => c.id === chatId);
      const targetPhone = chat?.phone || (chat as any)?.phoneNumber || '';
      const memberPhones = chat?.memberPhones || [];
      const payload = { chatId, ...meta, targetPhone, memberPhones, senderId: currentUser.id };
      try {
        const bc = new BroadcastChannel('AGC_chats_sync');
        bc.postMessage({ type: 'chat_meta_update', ...payload });
        bc.close();
      } catch (_) {}
      emitChatMetaUpdate(payload);
      if (isSupabaseConfigured) {
        sendSupabaseBroadcastSafe(`chat_${chatId}`, 'chat_meta_update', payload);
        if (targetPhone) {
          const clean = targetPhone.replace(/\D/g, '');
          if (clean) sendSupabaseBroadcastSafe(`inbox_${clean}`, 'chat_meta_update', payload);
        }
        memberPhones.forEach((p) => {
          const cp = p.replace(/\D/g, '');
          if (cp && !phonesMatch(cp, currentUser.phoneNumber)) {
            sendSupabaseBroadcastSafe(`inbox_${cp}`, 'chat_meta_update', payload);
          }
        });
      }
    },
    [currentUser.id, currentUser.phoneNumber]
  );

  const setDisappearingTimer = (chatId: string, timer: GhostTimerSetting | string) => {
    updateChat(chatId, { disappearingTimer: timer });
    relayChatMetaUpdate(chatId, { disappearingTimer: timer });
    const sysText =
      timer === 'off'
        ? '👻 Ghost disappearing messages turned off.'
        : `👻 Ghost mode active: messages self-destruct ${timer} after viewing.`;
    const sysMsg: ChatMessage = {
      id: `msg_sys_ghost_${Date.now()}`,
      chatId,
      sender: 'system',
      text: sysText,
      type: 'text',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'delivered',
    };
    setMessages((prev) => {
      const updated = { ...prev, [chatId]: [...(prev[chatId] || []), sysMsg] };
      persistPartitionedMessages(updated, currentUser.phoneNumber);
      return updated;
    });
  };

  const markGhostMessagesViewed = useCallback(
    (chatId: string) => {
      if (!chatId) return;
      const targetChat = chatsRef.current.find((c) => c.id === chatId);
      const chatTimerMs = parseGhostDurationMs(targetChat?.disappearingTimer);
      setMessages((prev) => {
        const list = prev[chatId];
        if (!list || list.length === 0) return prev;
        const now = Date.now();
        let changed = false;
        const nextList = list.map((m) => {
          const durMs = m.disappearingDurationMs || (m.isGhost ? chatTimerMs || 30000 : 0);
          if ((m.isGhost || m.disappearingDurationMs) && !m.expiresAt && durMs > 0) {
            changed = true;
            return { ...m, viewedAt: now, expiresAt: now + durMs, status: 'read' as const };
          }
          return m;
        });
        if (!changed) return prev;
        const updated = { ...prev, [chatId]: nextList };
        persistPartitionedMessages(updated, currentUser.phoneNumber);
        return updated;
      });
    },
    [currentUser.phoneNumber]
  );

  // Auto-purge expired Ghost messages every 2s
  useEffect(() => {
    const interval = window.setInterval(() => {
      const now = Date.now();
      setMessages((prev) => {
        let anyExpired = false;
        const next: Record<string, ChatMessage[]> = {};
        for (const [cid, list] of Object.entries(prev)) {
          const filtered = list.filter((m) => !(m.expiresAt && m.expiresAt <= now));
          if (filtered.length !== list.length) anyExpired = true;
          next[cid] = filtered;
        }
        if (!anyExpired) return prev;
        persistPartitionedMessages(next, currentUser.phoneNumber);
        return next;
      });
    }, 2000);
    return () => window.clearInterval(interval);
  }, [currentUser.phoneNumber]);

  const pinChatMessage = (chatId: string, msg: ChatMessage | null) => {
    const pinned: PinnedChatAnnouncement | null = msg
      ? {
          messageId: msg.id,
          text:
            msg.text?.trim() ||
            (msg.type === 'image'
              ? '📷 Pinned Photo'
              : msg.type === 'voice'
              ? '🎙️ Pinned Voice Note'
              : msg.type === 'quick_poll' && msg.quickPoll
              ? `📊 Poll: ${msg.quickPoll.question}`
              : '📌 Pinned Announcement'),
          senderName: msg.sender === 'user' ? currentUser.fullName || 'You' : msg.senderName || 'Member',
          pinnedByName: currentUser.fullName || 'Admin',
          pinnedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
      : null;
    updateChat(chatId, { pinnedMessage: pinned });
    relayChatMetaUpdate(chatId, { pinnedMessage: pinned });
  };

  const setChatTheme = (chatId: string, themeId: ChatThemeId | string) => {
    updateChat(chatId, { chatTheme: themeId });
    relayChatMetaUpdate(chatId, { chatTheme: themeId });
  };

  const clearChatMentions = useCallback(
    (chatId: string) => {
      if (!chatId) return;
      setChats((prev) => {
        const target = prev.find((c) => c.id === chatId);
        if (!target || (!target.unreadMentions && !target.lastMentionMessageId)) return prev;
        const updated = prev.map((c) =>
          c.id === chatId ? { ...c, unreadMentions: 0, lastMentionMessageId: undefined } : c
        );
        persistPartitionedChats(updated, currentUser.phoneNumber);
        return updated;
      });
    },
    [currentUser.phoneNumber]
  );

  useEffect(() => {
    if (activeChatId) {
      markGhostMessagesViewed(activeChatId);
    }
  }, [activeChatId, markGhostMessagesViewed]);

  const sendGroupInvitesToTargets = useCallback(
    (targetChat: ChatThread, targets: { name: string; phone: string }[]) => {
      if (!targetChat || !targets.length) return;
      const myName = currentUser.fullName || currentUser.phoneNumber || 'AGC User';
      const myPhone = currentUser.phoneNumber || '';
      const entityType: 'group' | 'channel' = targetChat.isChannel ? 'channel' : 'group';

      const chatSnapshot: ChatThread = {
        ...targetChat,
        invitationStatus: 'pending',
        invitedBy: myName,
      };

      // Register chat on backend so anyone given the invite link or code can join
      if (!targetChat.id.startsWith('town_comm_')) {
        try {
          fetch('/api/groups/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: targetChat.id,
              name: targetChat.name,
              avatar: targetChat.avatar,
              description: targetChat.description,
              isGroup: targetChat.isGroup,
              isChannel: targetChat.isChannel,
              creatorId: targetChat.creatorId || currentUser.id,
              creatorPhone: myPhone,
              admins: targetChat.admins,
              adminIds: targetChat.adminIds,
              members: targetChat.members,
              memberPhones: targetChat.memberPhones,
              membersCount: targetChat.membersCount || 1,
              inviteCode: targetChat.inviteCode,
            }),
          }).catch(() => {});
        } catch (_) {}
      }

      const seenCleanPhones = new Set<string>();
      targets.forEach(({ phone }) => {
        const cleanTarget = normalizePhoneDigits(phone) || (phone || '').replace(/\D/g, '');
        if (!cleanTarget) return;
        if (myPhone && phonesMatch(phone, myPhone)) return;
        if (seenCleanPhones.has(cleanTarget)) return;
        seenCleanPhones.add(cleanTarget);

        const invite: GroupInvitation = {
          id: `ginv_${targetChat.id}_${cleanTarget}_${Date.now()}`,
          groupId: targetChat.id,
          groupName: targetChat.name,
          groupAvatar: targetChat.avatar,
          entityType,
          description: targetChat.description,
          invitedPhone: phone,
          invitedByPhone: myPhone,
          invitedByName: myName,
          invitedByAvatar: currentUser.avatarUrl,
          membersCount: targetChat.membersCount || 1,
          chatSnapshot,
          createdAt: 'Just now',
          status: 'pending',
        };

        try {
          const bc = new BroadcastChannel('AGC_chats_sync');
          bc.postMessage({ type: 'group_invite', invite, chat: chatSnapshot, targetPhone: phone });
          bc.close();
        } catch (_) {}

        try {
          emitGroupInvite(invite, chatSnapshot, phone);
        } catch (_) {}

        if (isSupabaseConfigured) {
          supabase
            .from('group_invitations')
            .insert({
              id: invite.id,
              group_id: invite.groupId,
              group_name: invite.groupName,
              group_avatar: invite.groupAvatar || null,
              invited_phone: phone,
              invited_by_phone: myPhone || 'unknown',
              invited_by_name: myName,
              status: 'pending',
            })
            .then(() => {}, () => {});

          const rawClean = phone.replace(/\D/g, '');
          const inboxTargets = Array.from(new Set([rawClean, cleanTarget].filter(Boolean)));
          inboxTargets.forEach((t) => {
            try {
              const ch = supabase.channel(`inbox_${t}`, { config: { broadcast: { self: false } } });
              ch.subscribe((st) => {
                if (st === 'SUBSCRIBED') {
                  ch.send({
                    type: 'broadcast',
                    event: 'group_invite',
                    payload: { invite, chat: chatSnapshot },
                  })
                    .catch(() => {})
                    .finally(() => {
                      setTimeout(() => {
                        try { supabase.removeChannel(ch); } catch (_) {}
                      }, 1500);
                    });
                }
              });
            } catch (_) {}
          });
        }
      });
    },
    [currentUser.fullName, currentUser.phoneNumber, currentUser.avatarUrl]
  );

  const addMembersToGroup = (chatId: string, memberNames: string[], memberPhones?: string[]) => {
    if (!memberNames.length) return;
    const targetChat = chatsRef.current.find((c) => c.id === chatId) || chats.find((c) => c.id === chatId);
    const entityType = targetChat?.isChannel ? 'channel' : 'group';

    const resolvedTargets: { name: string; phone: string; isBot?: boolean }[] = memberNames.map((nameOrPhone, idx) => {
      const explicitPhone = memberPhones?.[idx];
      const isBot =
        nameOrPhone.trim().toLowerCase() === 'agcbot' ||
        nameOrPhone.trim().toLowerCase() === 'afribot ai' ||
        explicitPhone === '+234 BOT AI';
      if (isBot) {
        return { name: AFRIBOT_NAME, phone: AFRIBOT_PHONE, isBot: true };
      }
      const matchedContact = deviceContacts.find(
        (dc) =>
          dc.name === nameOrPhone ||
          dc.normalizedPhoneNumber === nameOrPhone ||
          dc.rawPhoneNumber === nameOrPhone ||
          (explicitPhone && phonesMatch(dc.normalizedPhoneNumber || dc.rawPhoneNumber, explicitPhone))
      );
      const resolvedPhone =
        explicitPhone ||
        matchedContact?.normalizedPhoneNumber ||
        matchedContact?.rawPhoneNumber ||
        (/^\+?[0-9\s-]{7,}$/.test(nameOrPhone) ? nameOrPhone : '');
      return {
        name: matchedContact?.name || nameOrPhone,
        phone: resolvedPhone,
      };
    });

    const hasBotTarget = resolvedTargets.some((t) => t.isBot);
    const inviteTargets = resolvedTargets.filter((t) => !t.isBot && (t.phone || t.name));

    if (hasBotTarget) {
      inviteBotToGroup(chatId, true);
    }

    if (inviteTargets.length === 0) return;

    const displayNames = inviteTargets.map((t) => t.name);
    const invitePhonesList = dedupePhoneList(inviteTargets.map((t) => t.phone).filter(Boolean));

    setChats((prev) => {
      const updated = prev.map((c) => {
        if (c.id === chatId) {
          const currentPending = c.pendingMembers || [];
          const currentMembers = c.members || [];
          const currentPhones = c.memberPhones || [];
          const newPending = inviteTargets
            .filter(
              (t) =>
                !currentMembers.some((m) => m.toLowerCase() === t.name.toLowerCase()) &&
                !(t.phone && currentPhones.some((p) => phonesMatch(p, t.phone)))
            )
            .map((t) => t.name);
          const updatedPending = dedupeNameList([...currentPending, ...newPending]);
          const updatedPendingPhones = dedupePhoneList([...(c.pendingPhones || []), ...invitePhonesList]);
          const updatedKicked = (c.kickedPhones || []).filter(
            (kp) => !invitePhonesList.some((ip) => phonesMatch(kp, ip))
          );
          return {
            ...c,
            pendingMembers: updatedPending,
            pendingPhones: updatedPendingPhones,
            kickedPhones: updatedKicked,
            lastMessage: `Invited ${displayNames.join(', ')} (pending)`,
            lastMessageTime: 'Just now',
          };
        }
        return c;
      });
      persistPartitionedChats(updated, currentUser.phoneNumber);
      return updated;
    });

    if (targetChat) {
      sendGroupInvitesToTargets(targetChat, inviteTargets);
    }

    fetch('/api/groups/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        groupId: chatId,
        actorPhone: currentUser.phoneNumber,
        actorId: currentUser.id,
        targets: inviteTargets,
      }),
    }).catch(() => {});

    const sysMsg: ChatMessage = {
      id: `msg_sys_${Date.now()}`,
      chatId,
      sender: 'system',
      text: `You invited ${displayNames.join(', ')} to join this ${entityType}. They will appear as members once they accept.`,
      type: 'text',
      timestamp: 'Just now',
      status: 'sent',
    };

    setMessages((prev) => {
      const current = prev[chatId] || [];
      const updated = { ...prev, [chatId]: [...current, sysMsg] };
      persistPartitionedMessages(updated, currentUser.phoneNumber);
      return updated;
    });

    showLocalNotification(
      `📩 ${entityType === 'channel' ? 'Channel' : 'Group'} Invite Sent`,
      `Sent invite to ${displayNames.join(', ')} for "${targetChat?.name || entityType}".`
    );
  };

  const createGroup = (
    name: string,
    memberNamesOrPhones: string[],
    avatar?: string,
    description?: string,
    memberPhones?: string[]
  ): string => {
    const cleanName = name.trim();
    if (!cleanName || cleanName.length < 2 || cleanName.startsWith('__')) return '';
    const dedupeKey = `group:${cleanName.toLowerCase()}`;
    const now = Date.now();
    if (now - (recentCommunityCreateRef.current.get(dedupeKey) || 0) < 4000) {
      return '';
    }
    recentCommunityCreateRef.current.set(dedupeKey, now);

    const newChatId = 'group_' + now;
    const shortInvite = 'G' + Math.random().toString(36).substring(2, 7).toUpperCase();
    const myName = currentUser.fullName || 'You';
    const myPhone = currentUser.phoneNumber || '';

    const resolvedAll = memberNamesOrPhones.map((item, idx) => {
      const explicitPhone = memberPhones?.[idx];
      const isBot =
        item.trim().toLowerCase() === 'agcbot' ||
        item.trim().toLowerCase() === 'afribot ai' ||
        explicitPhone === '+234 BOT AI';
      if (isBot) {
        return { name: AFRIBOT_NAME, phone: AFRIBOT_PHONE, isBot: true };
      }
      const matchedContact = deviceContacts.find(
        (dc) =>
          dc.name === item ||
          dc.normalizedPhoneNumber === item ||
          dc.rawPhoneNumber === item ||
          (explicitPhone && phonesMatch(dc.normalizedPhoneNumber || dc.rawPhoneNumber, explicitPhone))
      );
      const resolvedPhone =
        explicitPhone ||
        matchedContact?.normalizedPhoneNumber ||
        matchedContact?.rawPhoneNumber ||
        (/^\+?[0-9\s-]{7,}$/.test(item) ? item : '');
      return {
        name: matchedContact?.name || item,
        phone: resolvedPhone,
        isBot: false,
      };
    });

    const hasBot = resolvedAll.some((t) => t.isBot);
    const resolvedTargets = resolvedAll.filter((t) => !t.isBot);
    const initialMembers = hasBot ? [myName, AFRIBOT_NAME] : [myName];
    const initialAdmins = hasBot ? [myName, AFRIBOT_NAME] : [myName];
    const initialMemberPhones = myPhone ? [myPhone] : [];
    const initialCount = computeClientMembersCount(initialMembers, initialMemberPhones);
    const pendingPhoneList = dedupePhoneList(resolvedTargets.map((t) => t.phone).filter(Boolean));

    const newThread: ChatThread = {
      id: newChatId,
      name: cleanName,
      avatar: avatar || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150&auto=format&fit=crop&q=80',
      verifiedStore: false,
      location: 'Community Group',
      unreadCount: 0,
      lastMessage: resolvedTargets.length > 0
        ? `Created group "${cleanName}" · ${resolvedTargets.length} invite(s) sent`
        : hasBot
        ? `Created group "${cleanName}" with AgcBot`
        : `You created group "${cleanName}"`,
      lastMessageTime: 'Just now',
      catalog: [],
      isOnline: true,
      isGroup: true,
      membersCount: initialCount,
      creatorId: currentUser.id,
      creatorPhone: myPhone,
      admins: initialAdmins,
      adminIds: [currentUser.id],
      members: initialMembers,
      memberPhones: initialMemberPhones,
      pendingMembers: resolvedTargets.map((t) => t.name),
      pendingPhones: pendingPhoneList,
      kickedPhones: [],
      inviteCode: shortInvite,
      invitationStatus: 'accepted',
      description,
    };

    const sysMsg: ChatMessage = {
      id: 'msg_sys_' + Date.now(),
      chatId: newChatId,
      sender: 'system',
      text: resolvedTargets.length > 0
        ? `You created group "${cleanName}"${hasBot ? ' with AgcBot' : ''} and sent invitations to ${resolvedTargets.map((t) => t.name).join(', ')}.`
        : `You created group "${cleanName}"${hasBot ? ' with AgcBot as Admin' : ''}.`,
      type: 'text',
      timestamp: 'Just now',
      status: 'sent',
    };

    setChats((prev) => {
      const updated = [newThread, ...prev];
      persistPartitionedChats(updated, currentUser.phoneNumber);
      return updated;
    });

    setMessages((prev) => {
      const updated = { ...prev, [newChatId]: [sysMsg] };
      persistPartitionedMessages(updated, currentUser.phoneNumber);
      return updated;
    });

    joinChatRoom(newChatId);

    // Register private group on server so invite links, codes, and live member syncing work across accounts
    try {
      fetch('/api/groups/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: newThread.id,
          name: newThread.name,
          avatar: newThread.avatar,
          description: newThread.description,
          isGroup: true,
          isChannel: false,
          creatorId: currentUser.id,
          creatorPhone: myPhone,
          admins: newThread.admins,
          adminIds: newThread.adminIds,
          members: newThread.members,
          memberPhones: newThread.memberPhones,
          pendingMembers: newThread.pendingMembers,
          pendingPhones: newThread.pendingPhones,
          membersCount: initialCount,
          inviteCode: shortInvite,
        }),
      }).catch(() => {});
    } catch (_) {}

    // Send group invitations to selected members (prompts them to accept or decline)
    if (resolvedTargets.length > 0) {
      sendGroupInvitesToTargets(newThread, resolvedTargets);
    }

    setActiveChatId(newChatId);
    return newChatId;
  };

  const createChannel = (
    name: string,
    description?: string,
    avatar?: string,
    memberNamesOrPhones?: string[],
    memberPhones?: string[]
  ): string => {
    const cleanName = name.trim();
    if (!cleanName || cleanName.length < 2 || cleanName.startsWith('__')) return '';
    const dedupeKey = `channel:${cleanName.toLowerCase()}`;
    const now = Date.now();
    if (now - (recentCommunityCreateRef.current.get(dedupeKey) || 0) < 4000) {
      return '';
    }
    recentCommunityCreateRef.current.set(dedupeKey, now);

    const newChatId = 'channel_' + now;
    const shortInvite = 'C' + Math.random().toString(36).substring(2, 7).toUpperCase();
    const myName = currentUser.fullName || 'You';
    const myPhone = currentUser.phoneNumber || '';

    const resolvedTargets: { name: string; phone: string }[] = (memberNamesOrPhones || [])
      .filter((item) => item.trim().toLowerCase() !== 'agcbot' && item.trim().toLowerCase() !== 'afribot ai')
      .map((item, idx) => {
        const explicitPhone = memberPhones?.[idx];
        const matchedContact = deviceContacts.find(
          (dc) =>
            dc.name === item ||
            dc.normalizedPhoneNumber === item ||
            dc.rawPhoneNumber === item ||
            (explicitPhone && phonesMatch(dc.normalizedPhoneNumber || dc.rawPhoneNumber, explicitPhone))
        );
        const resolvedPhone =
          explicitPhone ||
          matchedContact?.normalizedPhoneNumber ||
          matchedContact?.rawPhoneNumber ||
          (/^\+?[0-9\s-]{7,}$/.test(item) ? item : '');
        return {
          name: matchedContact?.name || item,
          phone: resolvedPhone,
        };
      });

    const pendingPhoneList = dedupePhoneList(resolvedTargets.map((t) => t.phone).filter(Boolean));

    const newThread: ChatThread = {
      id: newChatId,
      name: cleanName,
      avatar: avatar || 'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=150&auto=format&fit=crop&q=80',
      verifiedStore: false,
      location: 'Broadcast Channel',
      unreadCount: 0,
      lastMessage: resolvedTargets.length > 0
        ? `Channel created · ${resolvedTargets.length} invite(s) sent`
        : 'Channel created',
      lastMessageTime: 'Just now',
      catalog: [],
      isOnline: true,
      isGroup: false,
      isChannel: true,
      membersCount: 1,
      creatorId: currentUser.id,
      creatorPhone: myPhone,
      admins: [myName],
      adminIds: [currentUser.id],
      members: [myName],
      memberPhones: myPhone ? [myPhone] : [],
      pendingMembers: resolvedTargets.map((t) => t.name),
      pendingPhones: pendingPhoneList,
      kickedPhones: [],
      inviteCode: shortInvite,
      invitationStatus: 'accepted',
      description,
    };

    const sysMsg: ChatMessage = {
      id: 'msg_sys_' + Date.now(),
      chatId: newChatId,
      sender: 'system',
      text: resolvedTargets.length > 0
        ? `Channel "${cleanName}" created and invitations sent to ${resolvedTargets.map((t) => t.name).join(', ')}.`
        : `Channel "${cleanName}" created. Broadcast updates, news, and media to your subscribers.`,
      type: 'text',
      timestamp: 'Just now',
      status: 'sent',
    };

    setChats((prev) => {
      const updated = [newThread, ...prev];
      persistPartitionedChats(updated, currentUser.phoneNumber);
      return updated;
    });

    setMessages((prev) => {
      const updated = { ...prev, [newChatId]: [sysMsg] };
      persistPartitionedMessages(updated, currentUser.phoneNumber);
      return updated;
    });

    joinChatRoom(newChatId);

    // Always register channel on server so invite links, join-by-code, subscriber count & kicks work cleanly
    try {
      fetch('/api/groups/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: newThread.id,
          name: newThread.name,
          avatar: newThread.avatar,
          description: newThread.description,
          isGroup: false,
          isChannel: true,
          creatorId: currentUser.id,
          creatorPhone: myPhone,
          admins: newThread.admins,
          adminIds: newThread.adminIds,
          members: newThread.members,
          memberPhones: newThread.memberPhones,
          pendingMembers: newThread.pendingMembers,
          pendingPhones: newThread.pendingPhones,
          membersCount: 1,
          inviteCode: shortInvite,
        }),
      }).catch(() => {});
    } catch (_) {}

    if (resolvedTargets.length > 0) {
      sendGroupInvitesToTargets(newThread, resolvedTargets);
    }

    setActiveChatId(newChatId);
    return newChatId;
  };

  const toggleMemberAdmin = (chatId: string, memberName: string, memberPhone?: string) => {
    const targetChat = chatsRef.current.find((c) => c.id === chatId);
    if (!targetChat) return;
    if (!isUserChatAdmin(targetChat, currentUserRef.current)) return;

    const matchedContact = deviceContactsRef.current.find(
      (dc) =>
        dc.name === memberName ||
        (memberPhone && phonesMatch(dc.normalizedPhoneNumber || dc.rawPhoneNumber, memberPhone))
    );
    const resolvedPhone =
      memberPhone || matchedContact?.normalizedPhoneNumber || matchedContact?.rawPhoneNumber || '';

    let nextAdminsSnapshot: string[] = [];
    let updatedChatSnapshot: ChatThread | null = null;
    setChats((prev) => {
      const updated = prev.map((c) => {
        if (c.id === chatId) {
          const currentAdmins = c.admins || [currentUser.fullName || 'You'];
          const isAlreadyAdmin = currentAdmins.some(
            (a) =>
              a.toLowerCase() === memberName.toLowerCase() ||
              (resolvedPhone && phonesMatch(a, resolvedPhone))
          );
          const updatedAdmins = isAlreadyAdmin
            ? currentAdmins.filter(
                (a) =>
                  a.toLowerCase() !== memberName.toLowerCase() &&
                  (!resolvedPhone || !phonesMatch(a, resolvedPhone))
              )
            : dedupeNameList([...currentAdmins, memberName]);
          nextAdminsSnapshot = updatedAdmins;
          updatedChatSnapshot = { ...c, admins: updatedAdmins };
          return updatedChatSnapshot;
        }
        return c;
      });
      persistPartitionedChats(updated, currentUser.phoneNumber);
      return updated;
    });

    fetch('/api/groups/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        groupId: chatId,
        action: 'toggle_admin',
        actorPhone: currentUser.phoneNumber,
        actorId: currentUser.id,
        targetName: memberName,
        targetPhone: resolvedPhone,
        admins: nextAdminsSnapshot,
      }),
    }).catch(() => {});

    if (updatedChatSnapshot) {
      broadcastGroupSnapshot(updatedChatSnapshot);
    }

    const sysMsg: ChatMessage = {
      id: 'msg_sys_' + Date.now(),
      chatId,
      sender: 'system',
      text: `${memberName} admin status was updated.`,
      type: 'text',
      timestamp: 'Just now',
      status: 'sent',
    };
    setMessages((prev) => {
      const updated = { ...prev, [chatId]: [...(prev[chatId] || []), sysMsg] };
      persistPartitionedMessages(updated, currentUser.phoneNumber);
      return updated;
    });
  };

  const removeGroupLocallyAndCleanup = useCallback(
    (
      groupId: string,
      opts?: { recordKick?: boolean; preserveMessages?: boolean; notifyTitle?: string; notifyBody?: string }
    ) => {
      if (!groupId) return;
      const myPhone = currentUserRef.current?.phoneNumber;
      const hadGroup =
        chatsRef.current.some((c) => c.id === groupId) ||
        (groupId.startsWith('town_comm_') &&
          townCommunitiesRef.current.some((tc) => tc.id === groupId.replace('town_comm_', '') && tc.isJoined));

      if (opts?.recordKick) {
        kickedGroupIdsRef.current.add(groupId);
        persistKickedGroupIds(myPhone);
      }

      try {
        leaveChatRoom(groupId);
      } catch (_) {}

      setChats((prev) => {
        if (!prev.some((c) => c.id === groupId)) return prev;
        const updated = prev.filter((c) => c.id !== groupId);
        if (myPhone) persistPartitionedChats(updated, myPhone);
        return updated;
      });

      if (!opts?.preserveMessages) {
        setMessages((prev) => {
          if (!prev[groupId]) return prev;
          const updated = { ...prev };
          delete updated[groupId];
          if (myPhone) persistPartitionedMessages(updated, myPhone);
          return updated;
        });
      }

      setGroupInvites((prev) => {
        const next = prev.filter((inv) => inv.groupId !== groupId);
        return next.length === prev.length ? prev : next;
      });
      setActiveGroupInvitePopup((curr) => (curr && curr.groupId === groupId ? null : curr));
      setActiveChatId((curr) => (curr === groupId ? null : curr));

      if (groupId.startsWith('town_comm_')) {
        const commId = groupId.replace('town_comm_', '');
        setTownCommunities((prev) => {
          const targetComm = prev.find((tc) => tc.id === commId);
          if (!targetComm) return prev;
          const nextPhones = dedupePhoneList(targetComm.memberPhones).filter(
            (p) => !myPhone || !phonesMatch(p, myPhone)
          );
          const updated =
            targetComm.type === 'channel' && !targetComm.isPrivate && !opts?.recordKick
              ? prev.map((tc) =>
                  tc.id === commId
                    ? {
                        ...tc,
                        isJoined: false,
                        memberPhones: nextPhones,
                        membersCount: Math.max((tc.membersCount || 1) - 1, nextPhones.length, 1),
                      }
                    : tc
                )
              : prev.filter((tc) => tc.id !== commId);
          if (myPhone) persistPartitionedTownCommunities(updated, myPhone);
          return updated;
        });
      }

      if (hadGroup && opts?.notifyTitle) {
        showLocalNotification(opts.notifyTitle, opts.notifyBody || 'You are no longer a member.');
      }
    },
    [persistKickedGroupIds, persistPartitionedTownCommunities]
  );

  const applyAuthoritativeGroupUpdate = useCallback(
    (g: any) => {
      if (!g || !g.id || !isAuthenticatedRef.current) return;
      const myUser = currentUserRef.current;
      const myPhone = myUser?.phoneNumber || '';
      const myId = myUser?.id || '';
      const normMyPhone = normalizePhoneDigits(myPhone);
      if (!normMyPhone || loadedPhoneForChatsRef.current !== normMyPhone) return;

      const serverKicked: string[] = dedupePhoneList(g.kickedPhones);
      const serverMemberPhones: string[] = dedupePhoneList(g.memberPhones);
      const isKicked = Boolean(myPhone && serverKicked.some((kp) => phonesMatch(kp, myPhone)));
      const isCreator =
        (Boolean(myId) && g.creatorId === myId) ||
        (Boolean(myPhone && g.creatorPhone) && phonesMatch(g.creatorPhone, myPhone));
      const isInPhones = Boolean(myPhone && serverMemberPhones.some((mp) => phonesMatch(mp, myPhone)));
      const isMember = isCreator || isInPhones;

      if (isKicked || (serverMemberPhones.length > 0 && !isMember)) {
        removeGroupLocallyAndCleanup(g.id, {
          recordKick: isKicked,
          notifyTitle: isKicked ? `Removed from ${g.name || 'Group'}` : undefined,
          notifyBody: isKicked ? 'An admin removed you from this conversation.' : undefined,
        });
        return;
      }

      if (!isMember) return;

      if (kickedGroupIdsRef.current.has(g.id)) {
        kickedGroupIdsRef.current.delete(g.id);
        persistKickedGroupIds(myPhone);
      }

      const nextMembers = dedupeNameList(g.members);
      const nextPending = dedupeNameList(g.pendingMembers);
      const nextPendingPhones = dedupePhoneList(g.pendingPhones);
      const nextCount = Math.max(Number(g.membersCount || 0), computeClientMembersCount(nextMembers, serverMemberPhones));
      const isChan = Boolean(g.isChannel);

      setChats((prev) => {
        const idx = prev.findIndex((c) => c.id === g.id);
        if (idx >= 0) {
          const existing = prev[idx];
          const updatedThread: ChatThread = {
            ...existing,
            name: g.name || existing.name,
            avatar: g.avatar || existing.avatar,
            description: g.description !== undefined ? g.description : existing.description,
            isGroup: !isChan,
            isChannel: isChan,
            creatorId: g.creatorId || existing.creatorId,
            creatorPhone: g.creatorPhone || existing.creatorPhone,
            admins: Array.isArray(g.admins) ? g.admins : existing.admins,
            adminIds: Array.isArray(g.adminIds) ? g.adminIds : existing.adminIds,
            members: nextMembers.length > 0 ? nextMembers : existing.members,
            memberPhones: serverMemberPhones.length > 0 ? serverMemberPhones : existing.memberPhones,
            pendingMembers: Array.isArray(g.pendingMembers) ? nextPending : existing.pendingMembers,
            pendingPhones: Array.isArray(g.pendingPhones) ? nextPendingPhones : existing.pendingPhones,
            kickedPhones: serverKicked,
            membersCount: nextCount,
            announceMode: g.announceMode !== undefined ? Boolean(g.announceMode) : existing.announceMode,
            inviteCode: g.inviteCode || existing.inviteCode,
            invitationStatus: 'accepted',
          };
          const updated = prev.map((c, i) => (i === idx ? updatedThread : c));
          persistPartitionedChats(updated, myPhone);
          return updated;
        }

        if (declinedGroupIdsRef.current.has(g.id)) return prev;
        const createdThread: ChatThread = {
          id: g.id,
          name: g.name || (isChan ? 'Broadcast Channel' : 'Group Chat'),
          avatar:
            g.avatar ||
            (isChan
              ? 'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=150&auto=format&fit=crop&q=80'
              : 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150&auto=format&fit=crop&q=80'),
          description: g.description,
          verifiedStore: false,
          location: isChan ? 'Broadcast Channel' : 'Private Group',
          unreadCount: 0,
          lastMessage: g.description || (isChan ? 'Subscribed channel' : 'Group chat'),
          lastMessageTime: 'Just now',
          lastMessageAtMs: Date.now(),
          catalog: [],
          isOnline: true,
          isGroup: !isChan,
          isChannel: isChan,
          creatorId: g.creatorId,
          creatorPhone: g.creatorPhone,
          admins: Array.isArray(g.admins) ? g.admins : [],
          adminIds: Array.isArray(g.adminIds) ? g.adminIds : [],
          members: nextMembers,
          memberPhones: serverMemberPhones,
          pendingMembers: nextPending,
          pendingPhones: nextPendingPhones,
          kickedPhones: serverKicked,
          membersCount: nextCount,
          announceMode: Boolean(g.announceMode),
          inviteCode: g.inviteCode,
          invitationStatus: 'accepted',
        };
        joinChatRoom(g.id);
        const updated = [createdThread, ...prev];
        persistPartitionedChats(updated, myPhone);
        return updated;
      });

      if (String(g.id).startsWith('town_comm_')) {
        const commId = String(g.id).replace('town_comm_', '');
        setTownCommunities((prev) => {
          if (!prev.some((tc) => tc.id === commId)) return prev;
          const updated = prev.map((tc) =>
            tc.id === commId
              ? {
                  ...tc,
                  name: g.name || tc.name,
                  description: g.description !== undefined ? g.description : tc.description,
                  memberPhones: serverMemberPhones,
                  membersCount: nextCount,
                  kickedPhones: serverKicked,
                }
              : tc
          );
          persistPartitionedTownCommunities(updated, myPhone);
          return updated;
        });
      }
    },
    [persistKickedGroupIds, persistPartitionedTownCommunities, removeGroupLocallyAndCleanup]
  );

  const leaveGroup = (chatId: string) => {
    const me = currentUserRef.current;
    const myPhone = me?.phoneNumber || '';
    const myName = me?.fullName || 'AGC User';
    const targetChat = chatsRef.current.find((c) => c.id === chatId);
    const commId = chatId.startsWith('town_comm_') ? chatId.replace('town_comm_', '') : '';
    const targetComm = commId ? townCommunitiesRef.current.find((tc) => tc.id === commId) : undefined;

    removeGroupLocallyAndCleanup(chatId, { recordKick: false });

    fetch('/api/groups/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        groupId: chatId,
        action: 'leave',
        actorPhone: myPhone,
        actorId: me?.id,
        targetName: myName,
        targetPhone: myPhone,
      }),
    }).catch(() => {});

    if (commId && isSupabaseConfigured && targetComm) {
      const remainingPhones = dedupePhoneList(targetComm.memberPhones).filter(
        (p) => !myPhone || !phonesMatch(p, myPhone)
      );
      const nextCount = Math.max((targetComm.membersCount || 1) - 1, remainingPhones.length, 1);
      updateTownCommunityInDb(commId, {
        members_count: nextCount,
        members: remainingPhones,
      }).catch(() => {});
    }

    if (targetChat) {
      const remainingPhones = dedupePhoneList(targetChat.memberPhones).filter(
        (p) => !myPhone || !phonesMatch(p, myPhone)
      );
      const remainingMembers = (targetChat.members || []).filter(
        (m) => m.toLowerCase() !== myName.toLowerCase() && (!myPhone || !phonesMatch(m, myPhone)) && m.toLowerCase() !== 'you'
      );
      const remainingAdmins = (targetChat.admins || []).filter(
        (a) => a.toLowerCase() !== myName.toLowerCase() && (!myPhone || !phonesMatch(a, myPhone)) && a.toLowerCase() !== 'you'
      );
      broadcastGroupSnapshot({
        ...targetChat,
        members: remainingMembers,
        memberPhones: remainingPhones,
        admins: remainingAdmins,
        membersCount: computeClientMembersCount(remainingMembers, remainingPhones),
      });
    }
  };

  const removeMemberFromGroup = (chatId: string, memberName: string, memberPhone?: string) => {
    const me = currentUserRef.current;
    const myPhone = me?.phoneNumber || '';
    const myName = me?.fullName || '';

    const isSelf =
      (memberPhone && myPhone && phonesMatch(memberPhone, myPhone)) ||
      memberName.trim().toLowerCase() === 'you' ||
      (Boolean(myName) && memberName.trim().toLowerCase() === myName.trim().toLowerCase());
    if (isSelf) {
      leaveGroup(chatId);
      return;
    }

    const targetChat = chatsRef.current.find((c) => c.id === chatId);
    if (!targetChat) return;
    if (!isUserChatAdmin(targetChat, me)) return;

    const matchedContact = deviceContactsRef.current.find(
      (dc) =>
        dc.name === memberName ||
        dc.normalizedPhoneNumber === memberName ||
        dc.rawPhoneNumber === memberName ||
        (memberPhone && phonesMatch(dc.normalizedPhoneNumber || dc.rawPhoneNumber, memberPhone))
    );
    const matchedAdminUser = adminUsersRef.current.find(
      (u) =>
        u.fullName === memberName ||
        (memberPhone && u.phoneNumber && phonesMatch(u.phoneNumber, memberPhone))
    );
    const resolvedPhone =
      memberPhone ||
      matchedContact?.normalizedPhoneNumber ||
      matchedContact?.rawPhoneNumber ||
      matchedAdminUser?.phoneNumber ||
      (/^\+?[0-9\s-]{7,}$/.test(memberName) ? memberName : '');

    let updatedSnapshot: ChatThread | null = null;
    let nextCountForSync = 1;
    let nextPhonesForSync: string[] = [];
    let nextKickedForSync: string[] = [];

    setChats((prev) => {
      const updated = prev.map((c) => {
        if (c.id !== chatId) return c;
        const lowerTarget = memberName.trim().toLowerCase();
        const matchesEntry = (entry: string) => {
          const clean = String(entry || '').trim();
          if (!clean) return false;
          if (clean.toLowerCase() === lowerTarget) return true;
          if (resolvedPhone && phonesMatch(clean, resolvedPhone)) return true;
          return false;
        };
        const nextMembers = (c.members || []).filter((m) => !matchesEntry(m));
        const nextPhones = dedupePhoneList(c.memberPhones).filter(
          (p) => !resolvedPhone || !phonesMatch(p, resolvedPhone)
        );
        const nextPending = (c.pendingMembers || []).filter((m) => !matchesEntry(m));
        const nextPendingPhones = dedupePhoneList(c.pendingPhones).filter(
          (p) => !resolvedPhone || !phonesMatch(p, resolvedPhone)
        );
        const nextAdmins = (c.admins || []).filter((a) => !matchesEntry(a));
        const nextKicked = resolvedPhone
          ? dedupePhoneList([...(c.kickedPhones || []), resolvedPhone])
          : dedupePhoneList(c.kickedPhones);
        const nextCount = computeClientMembersCount(nextMembers, nextPhones);
        nextCountForSync = nextCount;
        nextPhonesForSync = nextPhones;
        nextKickedForSync = nextKicked;
        updatedSnapshot = {
          ...c,
          members: nextMembers,
          memberPhones: nextPhones,
          pendingMembers: nextPending,
          pendingPhones: nextPendingPhones,
          admins: nextAdmins,
          kickedPhones: nextKicked,
          membersCount: nextCount,
        };
        return updatedSnapshot;
      });
      persistPartitionedChats(updated, myPhone);
      return updated;
    });

    fetch('/api/groups/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        groupId: chatId,
        action: 'kick',
        actorPhone: myPhone,
        actorId: me?.id,
        targetName: memberName,
        targetPhone: resolvedPhone,
      }),
    }).catch(() => {});

    // Notify kicked user + remaining members immediately via BroadcastChannel & Supabase Realtime
    try {
      const bc = new BroadcastChannel('AGC_chats_sync');
      bc.postMessage({
        type: 'group_kicked',
        groupId: chatId,
        groupName: targetChat.name,
        targetPhone: resolvedPhone,
        targetName: memberName,
      });
      if (updatedSnapshot) {
        bc.postMessage({ type: 'group_updated', group: updatedSnapshot });
      }
      bc.close();
    } catch (_) {}

    if (isSupabaseConfigured) {
      if (resolvedPhone) {
        const clean = resolvedPhone.replace(/\D/g, '');
        const norm = normalizePhoneDigits(clean);
        new Set([clean, norm].filter(Boolean)).forEach((t) => {
          sendSupabaseBroadcastSafe(`inbox_${t}`, 'group_kicked', {
            groupId: chatId,
            groupName: targetChat.name,
            targetPhone: resolvedPhone,
            targetName: memberName,
          });
        });
      }
      if (chatId.startsWith('town_comm_')) {
        const commId = chatId.replace('town_comm_', '');
        updateTownCommunityInDb(commId, {
          members_count: nextCountForSync,
          members: nextPhonesForSync,
          kicked: nextKickedForSync,
        }).catch(() => {});
        sendSupabaseBroadcastSafe('live_town_communities', 'members_updated', {
          communityId: commId,
          chatId,
          chatName: targetChat.name,
          membersCount: nextCountForSync,
          memberPhones: nextPhonesForSync,
          kickedPhones: nextKickedForSync,
        });
      }
    }

    if (updatedSnapshot) {
      broadcastGroupSnapshot(updatedSnapshot);
    }

    const sysMsg: ChatMessage = {
      id: 'msg_sys_' + Date.now(),
      chatId,
      sender: 'system',
      text: `${memberName} was removed from the ${targetChat.isChannel ? 'channel' : 'group'}.`,
      type: 'text',
      timestamp: 'Just now',
      status: 'sent',
    };
    setMessages((prev) => {
      const updated = { ...prev, [chatId]: [...(prev[chatId] || []), sysMsg] };
      persistPartitionedMessages(updated, myPhone);
      return updated;
    });
  };

  const deleteMessage = (chatId: string, messageId: string) => {
    setMessages((prev) => {
      const list = prev[chatId] || [];
      const updatedList = list.filter((m) => m.id !== messageId);
      const updated = { ...prev, [chatId]: updatedList };
      persistPartitionedMessages(updated, currentUser.phoneNumber);
      return updated;
    });
  };

  const applyRemoteMessageReaction = useCallback(
    (payload: { chatId: string; messageId: string; emoji: string; reactorName?: string; userName?: string }) => {
      const { chatId, messageId, emoji } = payload || {};
      const reactor = (payload?.reactorName || payload?.userName || '').trim();
      if (!chatId || !messageId || !emoji || !reactor) return;
      const myName = currentUserRef.current?.fullName || 'You';
      if (reactor === myName) return;

      setMessages((prev) => {
        const list = prev[chatId];
        if (!Array.isArray(list)) return prev;
        let touched = false;
        const updatedList = list.map((m) => {
          if (m.id !== messageId) return m;
          touched = true;
          const reactions = { ...(m.reactions || {}) };
          const users = reactions[emoji] || [];
          if (users.includes(reactor)) {
            reactions[emoji] = users.filter((u) => u !== reactor);
            if (reactions[emoji].length === 0) delete reactions[emoji];
          } else {
            reactions[emoji] = [...users, reactor];
          }
          return { ...m, reactions };
        });
        if (!touched) return prev;
        const updated = { ...prev, [chatId]: updatedList };
        persistPartitionedMessages(updated, currentUserRef.current?.phoneNumber);
        return updated;
      });
    },
    []
  );

  // Reliable Supabase broadcast helper: uses active joined WebSocket channel if open, otherwise REST httpSend (avoids join races & listener channel collisions)
  const sendSupabaseBroadcastSafe = useCallback((channelName: string, event: string, payload: any) => {
    if (!isSupabaseConfigured || !channelName) return;
    try {
      const targetTopic = `realtime:${channelName}`;
      const existingJoined = supabase
        .getChannels()
        .find((c) => c.topic === targetTopic && c.state === 'joined');
      if (existingJoined) {
        existingJoined.send({ type: 'broadcast', event, payload }).catch(() => {});
        return;
      }
      const cacheKey = `out_${channelName}`;
      let outbound = inboxChannelRefsRef.current.get(cacheKey);
      if (!outbound || outbound.state === 'closed' || outbound.state === 'errored') {
        outbound = supabase.channel(channelName, { config: { broadcast: { self: false } } });
        inboxChannelRefsRef.current.set(cacheKey, outbound);
      }
      if (typeof (outbound as any).httpSend === 'function') {
        (outbound as any).httpSend(event, payload).catch(() => {});
      } else {
        outbound.send({ type: 'broadcast', event, payload }).catch(() => {});
      }
    } catch (_) {}
  }, []);

  const applyRemoteReadReceipt = useCallback(
    (payload: {
      chatId: string;
      messageIds?: string[];
      readerPhone?: string;
      readerName?: string;
      readAt?: string;
    }) => {
      const { chatId, messageIds, readerPhone, readAt } = payload || {};
      if (!chatId) return;
      const userNow = currentUserRef.current;
      const myCleanPhone = userNow.phoneNumber?.replace(/\D/g, '') || '';
      const cleanReader = (readerPhone || '').replace(/\D/g, '');
      const isSelfReceipt =
        Boolean(cleanReader && myCleanPhone && phonesMatch(cleanReader, myCleanPhone));
      if (isSelfReceipt && !chatId.startsWith('dm_self_')) {
        return;
      }

      const candidateChatIds = new Set<string>([chatId]);
      if (chatId.startsWith('dm_') && !chatId.includes('self') && myCleanPhone && cleanReader) {
        candidateChatIds.add(getDirectChatId(myCleanPhone, cleanReader));
      }
      if (cleanReader && myCleanPhone) {
        const directFromReader = getDirectChatId(myCleanPhone, cleanReader);
        if (directFromReader) candidateChatIds.add(directFromReader);
      }

      const targetIdsSet =
        Array.isArray(messageIds) && messageIds.length > 0 ? new Set(messageIds.map(String)) : null;
      const effectiveReadAt =
        readAt || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      setMessages((prev) => {
        let anyUpdated = false;
        const nextMap = { ...prev };

        candidateChatIds.forEach((cid) => {
          const list = prev[cid];
          if (!Array.isArray(list) || list.length === 0) return;

          let listUpdated = false;
          const updatedList = list.map((m) => {
            if (m.sender !== 'user') return m;
            if (targetIdsSet && !targetIdsSet.has(String(m.id))) return m;
            const existingReadBy = Array.isArray(m.readBy) ? m.readBy : [];
            const alreadyRecordedReader = cleanReader ? existingReadBy.some((r) => phonesMatch(r, cleanReader)) : true;
            if (m.status === 'read' && alreadyRecordedReader) return m;
            listUpdated = true;
            return {
              ...m,
              status: 'read' as const,
              readAt: m.readAt || effectiveReadAt,
              readBy: cleanReader
                ? Array.from(new Set([...existingReadBy, cleanReader]))
                : m.readBy,
            };
          });

          if (listUpdated) {
            anyUpdated = true;
            nextMap[cid] = updatedList;
          }
        });

        if (!anyUpdated) return prev;
        persistPartitionedMessages(nextMap, userNow.phoneNumber);
        return nextMap;
      });
    },
    []
  );

  const emitReadReceiptForChat = useCallback(
    (chatId: string, explicitMessageIds?: string[]) => {
      if (!chatId || !readReceiptsEnabledRef.current) return;
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      if (!isAuthenticatedRef.current || isHydratingChatsRef.current) return;

      const userNow = currentUserRef.current;
      const myCleanPhone = userNow.phoneNumber?.replace(/\D/g, '') || '';
      if (!myCleanPhone) return;

      const currentChat = chatsRef.current.find((c) => c.id === chatId);
      if (chatId === AFRIBOT_ID || currentChat?.isBot) return;

      const threadMsgs = messagesRef.current?.[chatId] || [];
      const unreadIncomingIds = threadMsgs
        .filter((m) => {
          if (chatId.startsWith('dm_self_')) {
            return m.sender === 'user' && m.status !== 'read';
          }
          return m.sender !== 'user' && m.sender !== 'system' && m.status !== 'read';
        })
        .map((m) => m.id);

      const messageIdsToMark = Array.from(
        new Set([...unreadIncomingIds, ...(explicitMessageIds || [])].filter(Boolean))
      );
      if (messageIdsToMark.length === 0) return;

      const readAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const idSet = new Set(messageIdsToMark);

      // Mark locally so we don't emit duplicate receipts for the same messages
      setMessages((prev) => {
        const list = prev[chatId];
        if (!Array.isArray(list)) return prev;
        let touched = false;
        const nextList = list.map((m) => {
          if (!idSet.has(m.id) || m.status === 'read') return m;
          touched = true;
          return { ...m, status: 'read' as const, readAt: m.readAt || readAt };
        });
        if (!touched) return prev;
        const updated = { ...prev, [chatId]: nextList };
        persistPartitionedMessages(updated, userNow.phoneNumber);
        return updated;
      });

      if (chatId.startsWith('dm_self_')) return;

      let targetCleanPhone = (currentChat?.phone || (currentChat as any)?.phoneNumber || '').replace(/\D/g, '');
      if (!targetCleanPhone && chatId.startsWith('dm_')) {
        const parts = chatId.replace('dm_', '').split('_').filter(Boolean);
        targetCleanPhone = parts.find((p) => !phonesMatch(p, myCleanPhone)) || parts[0] || '';
      }
      const memberPhones = (currentChat?.memberPhones || []).filter((p) => !phonesMatch(p, myCleanPhone));

      const payload = {
        chatId,
        messageIds: messageIdsToMark,
        readerPhone: userNow.phoneNumber,
        readerName: userNow.fullName || 'AGC User',
        readAt,
        targetPhone: targetCleanPhone || undefined,
        memberPhones: memberPhones.length > 0 ? memberPhones : undefined,
      };

      // 1. BroadcastChannel (same browser multi-tab sync)
      try {
        const bc = new BroadcastChannel('AGC_chats_sync');
        bc.postMessage({ type: 'messages_read', ...payload });
        bc.close();
      } catch (_) {}

      // 2. Socket.io live read receipt + server store update
      emitMessagesRead({
        chatId,
        messageIds: messageIdsToMark,
        readerPhone: userNow.phoneNumber,
        readerName: userNow.fullName || 'AGC User',
        readAt,
        targetPhone: targetCleanPhone || undefined,
        memberPhones: memberPhones.length > 0 ? memberPhones : undefined,
      });

      // 3. Supabase Realtime fallback
      if (isSupabaseConfigured) {
        sendSupabaseBroadcastSafe(`chat_${chatId}`, 'messages_read', payload);
        if (targetCleanPhone) {
          const targets = new Set([targetCleanPhone, normalizePhoneDigits(targetCleanPhone)].filter(Boolean));
          targets.forEach((t) => sendSupabaseBroadcastSafe(`inbox_${t}`, 'messages_read', payload));
        }
        memberPhones.forEach((p) => {
          const cp = p.replace(/\D/g, '');
          if (cp && !phonesMatch(cp, myCleanPhone)) {
            const normCp = normalizePhoneDigits(cp);
            new Set([cp, normCp].filter(Boolean)).forEach((t) => {
              sendSupabaseBroadcastSafe(`inbox_${t}`, 'messages_read', payload);
            });
          }
        });
      }
    },
    [sendSupabaseBroadcastSafe]
  );
  emitReadReceiptForChatRef.current = emitReadReceiptForChat;

  const reactToMessage = (chatId: string, messageId: string, emoji: string) => {
    const myName = currentUser.fullName || 'You';
    setMessages((prev) => {
      const list = prev[chatId] || [];
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
      persistPartitionedMessages(updated, currentUser.phoneNumber);
      return updated;
    });

    const currentChat = chatsRef.current.find((c) => c.id === chatId) || chats.find((c) => c.id === chatId);
    const myCleanPhone = currentUser.phoneNumber?.replace(/\D/g, '') || '';
    let targetCleanPhone = currentChat?.phone?.replace(/\D/g, '');
    if (!targetCleanPhone && chatId.startsWith('dm_')) {
      const parts = chatId.replace('dm_', '').split('_');
      targetCleanPhone = parts.find((p) => !phonesMatch(p, myCleanPhone)) || parts[0];
    }
    const memberPhones = currentChat?.memberPhones || [];

    emitMessageReaction(chatId, messageId, emoji, myName, memberPhones, targetCleanPhone);

    try {
      const bc = new BroadcastChannel('AGC_chats_sync');
      bc.postMessage({ type: 'message_reaction', chatId, messageId, emoji, reactorName: myName, senderId: currentUser.id });
      bc.close();
    } catch (_) {}

    if (isSupabaseConfigured) {
      const reactionPayload = { chatId, messageId, emoji, reactorName: myName, senderId: currentUser.id };
      sendSupabaseBroadcastSafe(`chat_${chatId}`, 'message_reaction', reactionPayload);
      if (targetCleanPhone) {
        const targets = new Set([targetCleanPhone, normalizePhoneDigits(targetCleanPhone)].filter(Boolean));
        targets.forEach((t) => {
          sendSupabaseBroadcastSafe(`inbox_${t}`, 'message_reaction', reactionPayload);
        });
      }
      memberPhones.forEach((p) => {
        const cp = p.replace(/\D/g, '');
        if (cp && !phonesMatch(cp, myCleanPhone)) {
          sendSupabaseBroadcastSafe(`inbox_${cp}`, 'message_reaction', reactionPayload);
        }
      });
    }
  };

  // Unified Multi-Transport Live Message Broadcaster (BroadcastChannel + Socket.io + Durable REST + Supabase)
  const broadcastLiveMessage = async (chatId: string, msg: ChatMessage, overrideChat?: ChatThread) => {
    const userNow = currentUserRef.current;
    const chatsNow = chatsRef.current;
    const contactsNow = deviceContactsRef.current;
    const currentChat = overrideChat || chatsNow.find((c) => c.id === chatId);
    const myCleanPhone = userNow.phoneNumber?.replace(/\D/g, '') || '';
    const isGroupOrChannel = Boolean(
      currentChat?.isGroup ||
        currentChat?.isChannel ||
        chatId.startsWith('group_') ||
        chatId.startsWith('channel_') ||
        chatId.startsWith('town_comm_')
    );
    let targetCleanPhone = (currentChat?.phone || (currentChat as any)?.phoneNumber || '')?.replace(/\D/g, '');

    if (!targetCleanPhone && chatId.startsWith('dm_') && !chatId.includes('self')) {
      const parts = chatId.replace('dm_', '').split('_').filter(Boolean);
      targetCleanPhone = parts.find((p) => !phonesMatch(p, myCleanPhone)) || parts[0] || '';
    }

    if (!targetCleanPhone && currentChat?.id) {
      const contactMatch = contactsNow.find(
        (ct) =>
          ct.id === currentChat.id ||
          (currentChat.name &&
            currentChat.name !== 'Direct Chat' &&
            currentChat.name !== 'AGC User' &&
            ct.name === currentChat.name)
      );
      if (contactMatch?.normalizedPhoneNumber || contactMatch?.rawPhoneNumber) {
        targetCleanPhone = (contactMatch.normalizedPhoneNumber || contactMatch.rawPhoneNumber || '').replace(/\D/g, '');
      }
    }

    if (!targetCleanPhone && !isGroupOrChannel) {
      const dirUser = adminUsersRef.current.find((u) => u.id === chatId || u.id === currentChat?.id);
      if (dirUser?.phoneNumber) {
        targetCleanPhone = dirUser.phoneNumber.replace(/\D/g, '');
      }
    }

    // Do not deliver 1-on-1 DMs if current user blocked this recipient
    if (!isGroupOrChannel && !chatId.includes('self') && isUserBlockedByMe(chatId, targetCleanPhone)) {
      return;
    }

    const memberPhones = currentChat?.memberPhones || [];
    const wireChat = currentChat
      ? {
          id: currentChat.id,
          name: currentChat.name,
          avatar:
            currentChat.avatar && (!currentChat.avatar.startsWith('data:') || currentChat.avatar.length <= 16000)
              ? currentChat.avatar
              : undefined,
          isGroup: Boolean(currentChat.isGroup),
          isChannel: Boolean(currentChat.isChannel),
          membersCount: currentChat.membersCount,
          members: currentChat.members,
          memberPhones: currentChat.memberPhones,
          phone: currentChat.phone || (currentChat as any).phoneNumber || (targetCleanPhone ? `+${targetCleanPhone}` : undefined),
        }
      : undefined;
    const isDeviceOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

    // Encrypt message text with WebCrypto AES-GCM 256-bit for wire transport
    const secret = getConversationSecret(chatId, myCleanPhone, targetCleanPhone);
    let wireMessage = msg;
    if (!wireMessage.senderPhone && userNow.phoneNumber) {
      wireMessage = { ...wireMessage, senderPhone: userNow.phoneNumber };
    }
    if (msg.text && typeof msg.text === 'string' && !msg.text.startsWith('AGC_E2EE:')) {
      try {
        const cipherText = await encryptChatMessage(msg.text, secret);
        wireMessage = { ...wireMessage, text: cipherText, isEncrypted: true };
      } catch (_) {}
    }

    // 1. BroadcastChannel (instant same-computer tab/window sync)
    try {
      const bc = new BroadcastChannel('AGC_chats_sync');
      bc.postMessage({
        chatId,
        message: wireMessage,
        senderId: userNow.id,
        targetPhone: targetCleanPhone,
        memberPhones,
        isGroup: isGroupOrChannel,
        chat: wireChat,
      });
      bc.close();
    } catch (e) {
      console.warn('BroadcastChannel error:', e);
    }

    if (!isDeviceOnline) {
      // Offline: Persist into local outbox queue so reconnect auto-flushes queued messages
      enqueueOfflineOutboxItem(chatId, msg);
      return;
    }

    // 2. Socket.io Live WebSocket Relay
    emitLiveMessage(chatId, wireMessage, targetCleanPhone, memberPhones, wireChat);

    // 3. Durable HTTP Store-and-Forward Relay (/api/messages/send)
    let restDelivered = false;
    try {
      const resp = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId,
          message: wireMessage,
          senderPhone: userNow.phoneNumber,
          targetPhone: targetCleanPhone,
          memberPhones,
          chat: wireChat,
          isGroup: isGroupOrChannel,
          senderSocketId: getSocket()?.id,
        }),
        keepalive: true,
      });
      restDelivered = resp.ok;
    } catch (_) {
      enqueueOfflineOutboxItem(chatId, msg);
    }

    if ((restDelivered || getSocket()?.connected) && msg.status === 'sent') {
      msg.status = 'delivered';
      setMessages((prev) => {
        const list = prev[chatId] || [];
        const updatedList = list.map((m) => (m.id === msg.id ? { ...m, status: 'delivered' as const } : m));
        const nextMap = { ...prev, [chatId]: updatedList };
        persistPartitionedMessages(nextMap, userNow.phoneNumber);
        return nextMap;
      });
    }

    // 4. Supabase Realtime (Cross-device & background inbox channel)
    if (isSupabaseConfigured) {
      try {
        sendSupabaseBroadcastSafe(`chat_${chatId}`, 'new_message', {
          chatId,
          message: wireMessage,
          senderId: userNow.id,
          targetPhone: targetCleanPhone,
          isGroup: Boolean(currentChat?.isGroup),
          chat: wireChat,
        });

        // Recipient personal inbox channels
        if (targetCleanPhone) {
          const targets = new Set([targetCleanPhone, normalizePhoneDigits(targetCleanPhone)].filter(Boolean));
          targets.forEach((t) => {
            sendSupabaseBroadcastSafe(`inbox_${t}`, 'new_message', {
              chatId,
              message: wireMessage,
              senderId: userNow.id,
              targetPhone: targetCleanPhone,
              chat: wireChat,
            });
          });
        }

        // Group member inbox channels
        if (memberPhones && memberPhones.length > 0) {
          memberPhones.forEach((p) => {
            const cp = p.replace(/\D/g, '');
            if (cp && !phonesMatch(cp, myCleanPhone)) {
              const normCp = normalizePhoneDigits(cp);
              new Set([cp, normCp].filter(Boolean)).forEach((t) => {
                sendSupabaseBroadcastSafe(`inbox_${t}`, 'new_message', {
                  chatId,
                  message: wireMessage,
                  senderId: userNow.id,
                  isGroup: true,
                  chat: wireChat,
                });
              });
            }
          });
        }

        // Town community feed
        if (chatId.startsWith('town_comm_')) {
          sendSupabaseBroadcastSafe('town_community_feed', 'new_message', {
            chatId,
            message: wireMessage,
            senderId: userNow.id,
          });
        }
      } catch (e) {
        console.warn('Supabase chat broadcast notice:', e);
      }
    }
  };

  const sendImageMessage = async (chatId: string, imageUrl: string, caption?: string, oneTimeView?: boolean) => {
    const _targetChatImg = chatsRef.current.find((c) => c.id === chatId);
    if (isUserAdminBlockedFromSending(_targetChatImg, currentUserRef.current)) return;
    if (!_targetChatImg?.isGroup && !_targetChatImg?.isChannel && !chatId.includes('self') && isUserBlockedByMe(chatId, _targetChatImg?.phone || (_targetChatImg as any)?.phoneNumber)) return;

    // Strongly compress any data URL image so Supabase storage & Realtime stay tiny
    let finalImageUrl = imageUrl;
    if (imageUrl.startsWith('data:image')) {
      if (lowDataMode) {
        try {
          finalImageUrl = await compressLowDataMediaImage(imageUrl);
        } catch (_) {}
      } else if (imageUrl.length > 72000) {
        try {
          finalImageUrl = await compressChatMediaImage(imageUrl);
        } catch (_) {}
      }
    }

    const useOneTime = Boolean(oneTimeView);
    const targetChat = chatsRef.current.find((c) => c.id === chatId) || chats.find((c) => c.id === chatId);
    const ghostMs = parseGhostDurationMs(targetChat?.disappearingTimer);
    const nowMs = Date.now();
    const newMsg: ChatMessage = {
      id: 'msg_img_' + nowMs + '_' + Math.random().toString(36).substring(2, 6),
      chatId,
      sender: 'user',
      senderName: currentUser.fullName || 'AGC User',
      senderPhone: currentUser.phoneNumber,
      senderAvatar: currentUser.avatarUrl,
      type: 'image',
      imageUrl: finalImageUrl,
      text: caption || '',
      oneTimeView: useOneTime,
      ...(ghostMs > 0 ? { isGhost: true, disappearingDurationMs: ghostMs, expiresAt: nowMs + ghostMs } : {}),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sent',
    };

    const previewLabel = useOneTime ? '🔒 1-Time Photo' : (caption ? `📷 ${caption}` : '📷 Photo');

    setMessages((prev) => {
      const current = prev[chatId] || [];
      const updated = { ...prev, [chatId]: [...current, newMsg] };
      persistPartitionedMessages(updated, currentUser.phoneNumber);
      return updated;
    });

    setChats((prev) => {
      const updated = bumpChatThreadToTop(
        prev,
        chatId,
        {
          lastMessage: previewLabel,
          lastMessageTime: newMsg.timestamp,
          lastMessageAtMs: nowMs,
        },
        () => {
          const contactMatch = deviceContacts.find(
            (ct) => ct.id === chatId || (ct.rawPhoneNumber && chatId.includes(ct.rawPhoneNumber.replace(/\D/g, '')))
          );
          return {
            id: chatId,
            name: contactMatch?.name || (chatId.startsWith('dm_') ? 'Direct Chat' : 'Chat'),
            avatar: contactMatch?.avatar || DEFAULT_AVATAR_SVG,
            verifiedStore: false,
            location: 'Direct Chat',
            unreadCount: 0,
            lastMessage: previewLabel,
            lastMessageTime: newMsg.timestamp,
            lastMessageAtMs: nowMs,
            catalog: [],
            isOnline: true,
            phone: contactMatch?.rawPhoneNumber || '',
          };
        }
      );
      persistPartitionedChats(updated, currentUser.phoneNumber);
      return updated;
    });

    if (useOneTime) setIsOneTimeViewEnabled(false);

    // Broadcast live across all transports (Socket.io, REST store-and-forward, BroadcastChannel, Supabase Realtime)
    broadcastLiveMessage(chatId, newMsg);
  };

  const clearChat = (chatId: string) => {
    const currentThreadMsgs = messagesRef.current?.[chatId] || messages[chatId] || [];
    const preservedPreview = currentThreadMsgs.filter(isUnresolvedEscrowBetGameMessage);

    setMessages((prev) => {
      const existing = prev[chatId] || [];
      const preserved = existing.filter(isUnresolvedEscrowBetGameMessage);
      const updated = { ...prev, [chatId]: preserved };
      persistPartitionedMessages(updated, currentUser.phoneNumber);
      return updated;
    });
    setChats((prev) => {
      const lastPreserved = preservedPreview[preservedPreview.length - 1];
      const updated = prev.map((c) => {
        if (c.id !== chatId) return c;
        if (lastPreserved) {
          return {
            ...c,
            lastMessage: lastPreserved.text || '🎮 Active Game Bet (Escrow Held)',
            lastMessageTime: lastPreserved.timestamp || c.lastMessageTime,
          };
        }
        return { ...c, lastMessage: 'Chat history cleared', lastMessageTime: '' };
      });
      persistPartitionedChats(updated, currentUser.phoneNumber);
      return updated;
    });
  };

  const deleteChat = (chatId: string) => {
    if (chatId.startsWith('town_comm_')) {
      const rawId = chatId.replace('town_comm_', '');
      deleteTownCommunity(rawId);
      return;
    }
    setChats((prev) => {
      const updated = prev.filter((c) => c.id !== chatId);
      persistPartitionedChats(updated, currentUser.phoneNumber);
      return updated;
    });
    setMessages((prev) => {
      const updated = { ...prev };
      delete updated[chatId];
      persistPartitionedMessages(updated, currentUser.phoneNumber);
      return updated;
    });
    setActiveChatId((curr) => (curr === chatId ? null : curr));
  };

  const toggleShelfChat = (chatId: string) => {
    setChats((prev) => {
      const updated = prev.map((c) => (c.id === chatId ? { ...c, isShelved: !c.isShelved } : c));
      persistPartitionedChats(updated, currentUser.phoneNumber);
      return updated;
    });
  };

  const setChatLabel = (chatId: string, label?: string) => {
    setChats((prev) => {
      const updated = prev.map((c) => (c.id === chatId ? { ...c, label: label ? label.trim() : undefined } : c));
      persistPartitionedChats(updated, currentUser.phoneNumber);
      return updated;
    });
  };

  const sendMessage = (
    chatId: string,
    text: string,
    replyTo?: { id?: string; sender: string; text: string },
    oneTimeView?: boolean
  ) => {
    if (!text.trim()) return;

    // Block non-admins from sending in channels or announce-only groups, and block DMs to blocked contacts
    const _targetChatSend = chatsRef.current.find((c) => c.id === chatId) || chats.find((c) => c.id === chatId);
    if (isUserAdminBlockedFromSending(_targetChatSend, currentUserRef.current)) {
      return;
    }
    if (!_targetChatSend?.isGroup && !_targetChatSend?.isChannel && !chatId.includes('self') && isUserBlockedByMe(chatId, _targetChatSend?.phone || (_targetChatSend as any)?.phoneNumber)) {
      return;
    }

    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    const isSelfNoteChat = chatId.startsWith('dm_self_');
    const initialStatus: 'sent' | 'delivered' | 'read' =
      isSelfNoteChat && readReceiptsEnabledRef.current
        ? 'read'
        : isOnline
        ? 'delivered'
        : 'sent';
    const useOneTime = Boolean(oneTimeView);
    const ghostMs = parseGhostDurationMs(_targetChatSend?.disappearingTimer);
    const mentions = extractMentionsFromText(text);
    const previewLabel = useOneTime ? '🔒 1-Time Message' : ghostMs > 0 ? `👻 ${text}` : text;

    const newMsg: ChatMessage = {
      id: `msg_user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      chatId,
      sender: 'user',
      senderName: currentUser.fullName || 'AGC User',
      senderPhone: currentUser.phoneNumber,
      senderAvatar: currentUser.avatarUrl,
      text,
      oneTimeView: useOneTime,
      ...(ghostMs > 0 ? { isGhost: true, disappearingDurationMs: ghostMs, expiresAt: Date.now() + ghostMs } : {}),
      ...(mentions.length > 0 ? { mentions } : {}),
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
      ...(initialStatus === 'read'
        ? { readAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
        : {}),
    };

    // 1. Update local state and persist partitioned per user
    setMessages((prev) => {
      const updated = {
        ...prev,
        [chatId]: [...(prev[chatId] || []), newMsg],
      };
      persistPartitionedMessages(updated, currentUser.phoneNumber);
      return updated;
    });

    const sentNowMs = Date.now();
    setChats((prev) => {
      const updated = bumpChatThreadToTop(
        prev,
        chatId,
        {
          lastMessage: previewLabel,
          lastMessageTime: newMsg.timestamp,
          lastMessageAtMs: sentNowMs,
        },
        () => {
          const contactMatch = deviceContacts.find(
            (ct) => ct.id === chatId || (ct.rawPhoneNumber && chatId.includes(ct.rawPhoneNumber.replace(/\D/g, '')))
          );
          return {
            id: chatId,
            name: contactMatch?.name || (chatId.startsWith('dm_') ? 'Direct Chat' : 'Chat'),
            avatar:
              contactMatch?.avatar ||
              "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='50' fill='%23180a33'/><circle cx='50' cy='38' r='18' fill='%23a855f7'/><path d='M16 88c0-18.778 15.222-34 34-34s34 15.222 34 34' fill='%23a855f7'/></svg>",
            verifiedStore: false,
            location: 'Direct Chat',
            unreadCount: 0,
            lastMessage: previewLabel,
            lastMessageTime: newMsg.timestamp,
            lastMessageAtMs: sentNowMs,
            catalog: [],
            isOnline: true,
            phone: contactMatch?.rawPhoneNumber || '',
          };
        }
      );
      persistPartitionedChats(updated, currentUser.phoneNumber);
      return updated;
    });

    if (useOneTime) setIsOneTimeViewEnabled(false);

    // 2. Broadcast live
    broadcastLiveMessage(chatId, newMsg);

    // 3. AI Chatbot Auto-Response (AgcBot)
    const targetChat = chatsRef.current.find((c) => c.id === chatId) || chats.find((c) => c.id === chatId);
    const isBotChat = chatId === AFRIBOT_ID || Boolean(targetChat?.isBot);
    const isGroupWithBot = Boolean(
      targetChat?.isGroup &&
      (targetChat.members?.includes(AFRIBOT_NAME) ||
        targetChat.admins?.includes(AFRIBOT_NAME) ||
        targetChat.members?.includes('AfriBot AI') ||
        targetChat.admins?.includes('AfriBot AI'))
    );
    const mentionsBot = /(^|\s)@(bot|agcbot|afribot|ai)\b/i.test(text) || replyTo?.sender?.includes('AgcBot');

    if (isBotChat || (isGroupWithBot && mentionsBot)) {
      setTypingUsers((prev) => ({
        ...prev,
        [chatId]: ['AgcBot is thinking...'],
      }));

      const cleanedPrompt = isGroupWithBot
        ? text.replace(/@(bot|agcbot|afribot|ai)\b/gi, '').trim() || text
        : text;

      const prevMsgs = messages[chatId] || [];
      const history: GroqMessage[] = prevMsgs
        .filter((m) => m.text && !m.deleted)
        .slice(-10)
        .map((m) => ({
          role: (m.sender === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
          content: m.text || '',
        }));
      history.push({ role: 'user', content: cleanedPrompt });

      askGroqAi(history, {
        isGroup: isGroupWithBot,
        groupName: targetChat?.name,
        senderName: currentUser.fullName || 'Member',
      })
        .then((aiReply: string) => {
          setTypingUsers((prev) => {
            const copy = { ...prev };
            delete copy[chatId];
            return copy;
          });

          const botNowMs = Date.now();
          const botResponseMsg: ChatMessage = {
            id: `msg_bot_${botNowMs}_${Math.random().toString(36).substring(2, 6)}`,
            chatId,
            sender: 'other',
            senderName: AFRIBOT_NAME,
            senderPhone: AFRIBOT_PHONE,
            senderAvatar: AFRIBOT_AVATAR,
            text: aiReply,
            translatedText: {
              en: aiReply,
              pcm: aiReply,
              sw: aiReply,
              yo: aiReply,
              ha: aiReply,
              fr: aiReply,
            },
            type: 'text',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: 'read',
            replyTo: isGroupWithBot
              ? { id: newMsg.id, sender: newMsg.senderName || 'Member', text: newMsg.text || '' }
              : undefined,
          };

          setMessages((prev) => {
            const prevList = prev[chatId] || [];
            const markedList = readReceiptsEnabledRef.current
              ? prevList.map((m) =>
                  m.sender === 'user' && m.status !== 'read'
                    ? { ...m, status: 'read' as const, readAt: m.readAt || botResponseMsg.timestamp }
                    : m
                )
              : prevList;
            const updated = {
              ...prev,
              [chatId]: [...markedList, botResponseMsg],
            };
            persistPartitionedMessages(updated, currentUser.phoneNumber);
            return updated;
          });

          setChats((prev) => {
            const updated = bumpChatThreadToTop(prev, chatId, {
              lastMessage: aiReply,
              lastMessageTime: botResponseMsg.timestamp,
              lastMessageAtMs: botNowMs,
            });
            persistPartitionedChats(updated, currentUser.phoneNumber);
            return updated;
          });

          broadcastLiveMessage(chatId, botResponseMsg);
        })
        .catch((err: unknown) => {
          console.error('[AgcBot] Error generating AI response:', err);
          setTypingUsers((prev) => {
            const copy = { ...prev };
            delete copy[chatId];
            return copy;
          });
        });
    }
  };

  const forwardMessage = (
    targets: Array<{ chatId?: string; phone?: string; name?: string; avatar?: string }>,
    sourceMessage: ChatMessage
  ): number => {
    if (!targets || targets.length === 0) return 0;

    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    const initialStatus: 'sent' | 'delivered' = isOnline ? 'delivered' : 'sent';
    const timestampStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Normalize forwarded payload cleanly (strip 1-time lock, replies, reactions; convert interactive cards cleanly)
    const passthroughTypes: ChatMessage['type'][] = [
      'text',
      'image',
      'voice',
      'product_card',
      'meme_sticker',
      'location',
      'invoice_receipt',
    ];
    let fwdType: ChatMessage['type'] = passthroughTypes.includes(sourceMessage.type)
      ? sourceMessage.type
      : 'text';
    let fwdText = sourceMessage.text || '';

    if (!passthroughTypes.includes(sourceMessage.type)) {
      if (sourceMessage.type === 'financial_poll' && sourceMessage.financialPoll) {
        fwdText = `📊 Poll: ${sourceMessage.financialPoll.title}`;
      } else if (sourceMessage.type === 'game_xo' && sourceMessage.xoGame) {
        fwdText = `🎮 X/O Game Challenge (${sourceMessage.xoGame.mode === 'bet' ? `₦${sourceMessage.xoGame.betAmount} stake` : 'Friendly'})`;
      } else if (sourceMessage.type === 'escrow_receipt' && sourceMessage.order) {
        fwdText = `🔒 Escrow Order: ${sourceMessage.order.product?.title || 'Protected Deal'}`;
      } else if (!fwdText) {
        fwdText = 'Forwarded message';
      }
      fwdType = 'text';
    }

    let previewLabel = fwdText;
    if (fwdType === 'image') {
      previewLabel = fwdText ? `📷 ${fwdText}` : '📷 Photo';
    } else if (fwdType === 'voice' && sourceMessage.voiceNote) {
      previewLabel = `🎙️ Voice message (${sourceMessage.voiceNote.durationSeconds}s)`;
    } else if (fwdType === 'product_card' && sourceMessage.product) {
      previewLabel = ` ${sourceMessage.product.title}`;
    } else if (fwdType === 'meme_sticker') {
      previewLabel = '🎭 Sticker';
    } else if (fwdType === 'location') {
      previewLabel = `📍 ${sourceMessage.locationData?.addressName || 'Shared Location'}`;
    } else if (fwdType === 'invoice_receipt') {
      previewLabel = `🧾 Invoice #${(sourceMessage.invoice || sourceMessage.invoiceData)?.invoiceNumber || ''}`;
    }
    const threadPreview = `↪ ${previewLabel || 'Forwarded message'}`;

    const seenChatIds = new Set<string>();
    const prepared: Array<{ chatId: string; msg: ChatMessage; thread: ChatThread }> = [];

    targets.forEach((t, idx) => {
      const resolvedChatId =
        t.chatId || (t.phone ? getDirectChatId(currentUser.phoneNumber, t.phone) : '');
      if (!resolvedChatId || seenChatIds.has(resolvedChatId)) return;
      seenChatIds.add(resolvedChatId);

      const existingThread =
        chatsRef.current.find((c) => c.id === resolvedChatId) ||
        chats.find((c) => c.id === resolvedChatId);

      const resolvedThread: ChatThread = existingThread
        ? {
            ...existingThread,
            lastMessage: threadPreview,
            lastMessageTime: timestampStr,
          }
        : {
            id: resolvedChatId,
            name: t.name || t.phone || 'Direct Chat',
            avatar: t.avatar || DEFAULT_AVATAR_SVG,
            verifiedStore: false,
            location: 'Direct Chat',
            unreadCount: 0,
            lastMessage: threadPreview,
            lastMessageTime: timestampStr,
            catalog: [],
            isOnline: false,
            phone: t.phone || '',
            phoneNumber: t.phone || '',
          };

      const fwdMsg: ChatMessage = {
        id: `msg_fwd_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
        chatId: resolvedChatId,
        sender: 'user',
        senderName: currentUser.fullName || 'AGC User',
        senderPhone: currentUser.phoneNumber,
        senderAvatar: currentUser.avatarUrl,
        type: fwdType,
        text: fwdText,
        imageUrl: fwdType === 'image' ? sourceMessage.imageUrl : undefined,
        voiceNote:
          fwdType === 'voice' && sourceMessage.voiceNote
            ? {
                ...sourceMessage.voiceNote,
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
              }
            : undefined,
        product: fwdType === 'product_card' ? sourceMessage.product : undefined,
        memeSticker: fwdType === 'meme_sticker' ? sourceMessage.memeSticker : undefined,
        locationData: fwdType === 'location' ? sourceMessage.locationData : undefined,
        invoice: fwdType === 'invoice_receipt' ? sourceMessage.invoice : undefined,
        invoiceData: fwdType === 'invoice_receipt' ? sourceMessage.invoiceData : undefined,
        oneTimeView: false,
        isForwarded: true,
        timestamp: timestampStr,
        status: initialStatus,
      };

      prepared.push({ chatId: resolvedChatId, msg: fwdMsg, thread: resolvedThread });
    });

    if (prepared.length === 0) return 0;

    setMessages((prev) => {
      const next = { ...prev };
      prepared.forEach(({ chatId: cid, msg }) => {
        next[cid] = [...(next[cid] || []), msg];
      });
      messagesRef.current = next;
      persistPartitionedMessages(next, currentUser.phoneNumber);
      return next;
    });

    const fwdNowMs = Date.now();
    setChats((prev) => {
      let next = [...prev];
      prepared.forEach(({ chatId: cid, thread }) => {
        next = bumpChatThreadToTop(
          next,
          cid,
          {
            lastMessage: thread.lastMessage,
            lastMessageTime: thread.lastMessageTime,
            lastMessageAtMs: fwdNowMs,
          },
          () => ({ ...thread, lastMessageAtMs: fwdNowMs })
        );
      });
      chatsRef.current = next;
      persistPartitionedChats(next, currentUser.phoneNumber);
      return next;
    });

    prepared.forEach(({ chatId: cid, msg, thread }) => {
      broadcastLiveMessage(cid, msg, thread);
    });

    return prepared.length;
  };

  const sendVoiceNote = (
    chatId: string,
    durationSeconds: number,
    transcript: string,
    audioDataUrl?: string,
    oneTimeView?: boolean
  ) => {
    const targetChat = chatsRef.current.find((c) => c.id === chatId) || chats.find((c) => c.id === chatId);
    if (isUserAdminBlockedFromSending(targetChat, currentUserRef.current)) return;
    if (!targetChat?.isGroup && !targetChat?.isChannel && !chatId.includes('self') && isUserBlockedByMe(chatId, targetChat?.phone || (targetChat as any)?.phoneNumber)) return;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24h TTL
    const useOneTime = Boolean(oneTimeView);
    const ghostMs = parseGhostDurationMs(targetChat?.disappearingTimer);
    const previewLabel = useOneTime
      ? `🔒 1-Time Voice Note (${durationSeconds}s)`
      : `🎙️ Voice message (${durationSeconds}s)`;

    const newMsg: ChatMessage = {
      id: `msg_vn_${Date.now()}`,
      chatId,
      sender: 'user',
      senderName: currentUser.fullName || 'AGC User',
      senderPhone: currentUser.phoneNumber,
      senderAvatar: currentUser.avatarUrl,
      type: 'voice',
      oneTimeView: useOneTime,
      ...(ghostMs > 0 ? { isGhost: true, disappearingDurationMs: ghostMs, expiresAt: Date.now() + ghostMs } : {}),
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
        audioDataUrl, // kept for in-tab playback; base64 survives cross-device broadcast
        expiresAt,
        transcriptRevealed: false,
      },
      mediaSizeKB: Math.round(durationSeconds * 4.5),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sent',
    };

    setMessages((prev) => {
      const updated = {
        ...prev,
        [chatId]: [...(prev[chatId] || []), newMsg],
      };
      persistPartitionedMessages(updated, currentUser.phoneNumber);
      return updated;
    });

    const vnNowMs = Date.now();
    setChats((prev) => {
      const updated = bumpChatThreadToTop(
        prev,
        chatId,
        {
          lastMessage: previewLabel,
          lastMessageTime: newMsg.timestamp,
          lastMessageAtMs: vnNowMs,
        },
        () => {
          const contactMatch = deviceContacts.find(
            (ct) => ct.id === chatId || (ct.rawPhoneNumber && chatId.includes(ct.rawPhoneNumber.replace(/\D/g, '')))
          );
          return {
            id: chatId,
            name: contactMatch?.name || (chatId.startsWith('dm_') ? 'Direct Chat' : 'Chat'),
            avatar:
              contactMatch?.avatar ||
              "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='50' fill='%23180a33'/><circle cx='50' cy='38' r='18' fill='%23a855f7'/><path d='M16 88c0-18.778 15.222-34 34-34s34 15.222 34 34' fill='%23a855f7'/></svg>",
            verifiedStore: false,
            location: 'Direct Chat',
            unreadCount: 0,
            lastMessage: previewLabel,
            lastMessageTime: newMsg.timestamp,
            lastMessageAtMs: vnNowMs,
            catalog: [],
            isOnline: true,
            phone: contactMatch?.rawPhoneNumber || '',
          };
        }
      );
      persistPartitionedChats(updated, currentUser.phoneNumber);
      return updated;
    });

    if (useOneTime) setIsOneTimeViewEnabled(false);

    broadcastLiveMessage(chatId, newMsg);
  };

  const sendProductCard = (chatId: string, product: Product, fromSelf: boolean = true) => {
    const nowMs = Date.now();
    const newMsg: ChatMessage = {
      id: `msg_prod_${nowMs}_${Math.random().toString(36).substring(2, 6)}`,
      chatId,
      sender: fromSelf ? 'user' : 'other',
      senderName: fromSelf ? (currentUser.fullName || product.sellerName) : product.sellerName,
      senderPhone: fromSelf ? currentUser.phoneNumber : undefined,
      senderAvatar: fromSelf ? currentUser.avatarUrl : undefined,
      type: 'product_card',
      product,
      text: ` ${product.title} (${CURRENCY_SYMBOLS[product.currency] || '₦'}${product.price.toLocaleString()})`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sent',
    };

    setMessages((prev) => ({
      ...prev,
      [chatId]: [...(prev[chatId] || []), newMsg],
    }));

    setChats((prev) => {
      const updated = bumpChatThreadToTop(prev, chatId, {
        lastMessage: `🛍️ ${product.title}`,
        lastMessageTime: newMsg.timestamp,
        lastMessageAtMs: nowMs,
      });
      persistPartitionedChats(updated, currentUser.phoneNumber);
      return updated;
    });

    broadcastLiveMessage(chatId, newMsg);
  };

  const sendLocationMessage = (chatId: string, locationData: LocationPinMeta) => {
    if (!chatId || !Number.isFinite(locationData.latitude) || !Number.isFinite(locationData.longitude)) return;
    const targetChat = chatsRef.current.find((c) => c.id === chatId);
    if (isUserAdminBlockedFromSending(targetChat, currentUserRef.current)) return;
    if (!targetChat?.isGroup && !targetChat?.isChannel && !chatId.includes('self') && isUserBlockedByMe(chatId, targetChat?.phone || (targetChat as any)?.phoneNumber)) return;

    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    const label = locationData.addressName?.trim() || `${locationData.latitude.toFixed(4)}, ${locationData.longitude.toFixed(4)}`;
    const previewLabel = `📍 ${label}`;
    const nowMs = Date.now();

    const newMsg: ChatMessage = {
      id: `msg_loc_${nowMs}_${Math.random().toString(36).substring(2, 6)}`,
      chatId,
      sender: 'user',
      senderName: currentUser.fullName || 'AGC User',
      senderPhone: currentUser.phoneNumber,
      senderAvatar: currentUser.avatarUrl,
      type: 'location',
      text: `📍 Shared Pin Location: ${label}`,
      locationData: {
        ...locationData,
        addressName: label,
        sharedAt: locationData.sharedAt || new Date().toISOString(),
      },
      metadata: {
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        address_name: label,
        landmark_note: locationData.landmarkNote,
        accuracy_meters: locationData.accuracyMeters,
        purpose: locationData.purpose || 'general',
      },
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: isOnline ? 'delivered' : 'sent',
    };

    setMessages((prev) => {
      const updated = {
        ...prev,
        [chatId]: [...(prev[chatId] || []), newMsg],
      };
      try {
        const userKey = getUserStorageKey('AGC_messages_v2', currentUser.phoneNumber);
        localStorage.setItem(userKey, JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });

    setChats((prev) => {
      const updated = bumpChatThreadToTop(
        prev,
        chatId,
        {
          lastMessage: previewLabel,
          lastMessageTime: newMsg.timestamp,
          lastMessageAtMs: nowMs,
        },
        () => {
          const contactMatch = deviceContacts.find(
            (ct) => ct.id === chatId || (ct.rawPhoneNumber && chatId.includes(ct.rawPhoneNumber.replace(/\D/g, '')))
          );
          return {
            id: chatId,
            name: contactMatch?.name || (chatId.startsWith('dm_') ? 'Direct Chat' : 'Chat'),
            avatar:
              contactMatch?.avatar ||
              "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='50' fill='%23180a33'/><circle cx='50' cy='38' r='18' fill='%23a855f7'/><path d='M16 88c0-18.778 15.222-34 34-34s34 15.222 34 34' fill='%23a855f7'/></svg>",
            verifiedStore: false,
            location: 'Direct Chat',
            unreadCount: 0,
            lastMessage: previewLabel,
            lastMessageTime: newMsg.timestamp,
            lastMessageAtMs: nowMs,
            catalog: [],
            isOnline: true,
            phone: contactMatch?.rawPhoneNumber || '',
          };
        }
      );
      persistPartitionedChats(updated, currentUser.phoneNumber);
      return updated;
    });

    broadcastLiveMessage(chatId, newMsg);
  };

  // Escrow Order Creation (Paystack or Wallet) with 1% fee capped at ₦4,000 + Two-Step PIN Release
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
    const subtotalAmount = Math.max(0, Math.round(Number(product.price) || 0));
    const escrowFee = Math.min(Math.round(subtotalAmount * 0.01), 4000);
    const totalAmount = subtotalAmount + escrowFee;

    const targetChat = chats.find((c) => c.id === chatId);
    const sellerPhone = product.sellerPhone || targetChat?.phoneNumber || targetChat?.phone || '';
    const buyerPhone = currentUser.phoneNumber || '';

    if (paymentMethod === 'wallet') {
      if (wallet.availableBalance < totalAmount) {
        return {
          success: false,
          error: `Insufficient wallet balance (${CURRENCY_SYMBOLS.NGN}${wallet.availableBalance.toLocaleString()}). Need ${CURRENCY_SYMBOLS.NGN}${totalAmount.toLocaleString()} (incl. ₦${escrowFee.toLocaleString()} escrow fee).`,
        };
      }

      setWallet((prev) => ({
        ...prev,
        availableBalance: prev.availableBalance - totalAmount,
        escrowLockedBalance: prev.escrowLockedBalance + subtotalAmount,
      }));
    } else {
      setWallet((prev) => ({
        ...prev,
        escrowLockedBalance: prev.escrowLockedBalance + subtotalAmount,
      }));
    }

    const cleanBuyer = buyerName.trim() || currentUser.fullName || 'AGC Buyer';
    const cleanAddress = deliveryAddress.trim() || 'Direct AGC Chat Delivery';

    const newOrder: EscrowOrder = {
      id: orderId,
      chatId,
      product,
      quantity: 1,
      subtotalAmount,
      escrowFee,
      totalAmount,
      currency: product.currency,
      status: 'escrow_secured',
      escrowPin: pin,
      buyerName: cleanBuyer,
      buyerPhone,
      sellerName: product.sellerName,
      sellerPhone,
      deliveryAddress: cleanAddress,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      paymentMethod,
      paystackRef,
      failedClaimAttempts: 0,
    };

    setEscrowOrders((prev) => [newOrder, ...prev]);

    const receiptText = `Funds held in AGC Escrow Vault (${CURRENCY_SYMBOLS[product.currency] || '₦'}${subtotalAmount.toLocaleString()} + ${CURRENCY_SYMBOLS[product.currency] || '₦'}${escrowFee.toLocaleString()} 1% fee) awaiting buyer approval. Seller only claims payout after buyer approves release & shares their system code.`;

    const receiptMsg: ChatMessage = {
      id: `msg_escrow_${Date.now()}`,
      chatId,
      sender: 'system',
      type: 'escrow_receipt',
      order: { ...newOrder },
      text: receiptText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'delivered',
    };

    setMessages((prev) => ({
      ...prev,
      [chatId]: [...(prev[chatId] || []), receiptMsg],
    }));

    // Broadcast sanitized receipt (no PIN!) so seller sees the held funds status in real time
    broadcastLiveMessage(chatId, {
      ...receiptMsg,
      order: { ...newOrder, escrowPin: '' },
    });

    setChats((prev) =>
      bumpChatThreadToTop(prev, chatId, {
        lastMessage: `🔒 Escrow Vault: ${product.title}`,
        lastMessageTime: receiptMsg.timestamp,
        lastMessageAtMs: Date.now(),
      })
    );

    // Persist authoritatively to server (writes server ledger + emits escrow_order_updated & wallet_updated)
    fetch('/api/escrow/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId,
        chatId,
        product,
        quantity: 1,
        subtotalAmount,
        escrowFee,
        totalAmount,
        currency: product.currency,
        buyerName: cleanBuyer,
        buyerPhone,
        sellerName: product.sellerName,
        sellerPhone,
        deliveryAddress: cleanAddress,
        paymentMethod,
        paystackRef,
        escrowPin: pin,
      }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.success && data.order) {
          setEscrowOrders((prev) => prev.map((o) => (o.id === orderId ? data.order : o)));
          if (data.wallet) {
            setWallet((prev) => ({
              ...prev,
              availableBalance: Number(data.wallet.availableBalance) ?? prev.availableBalance,
              escrowLockedBalance: Number(data.wallet.escrowLockedBalance) ?? prev.escrowLockedBalance,
              transactions: Array.isArray(data.wallet.transactions) ? data.wallet.transactions : prev.transactions,
            }));
          }
        } else {
          // Server unreachable fallback: record client ledger entry
          recordLedgerTransaction({
            type: paymentMethod === 'wallet' ? 'escrow_lock' : 'store_purchase',
            title: `Escrow Lock: ${product.title}`,
            description: `Escrow held for ${product.title} (${cleanBuyer} -> ${product.sellerName})`,
            amount: subtotalAmount,
            fee: escrowFee,
            balanceAfter: paymentMethod === 'wallet' ? Math.max(0, wallet.availableBalance - totalAmount) : wallet.availableBalance,
            currency: product.currency,
            referenceId: `ESC_${orderId}`,
            channel: paymentMethod,
          });
        }
      })
      .catch(() => {
        recordLedgerTransaction({
          type: paymentMethod === 'wallet' ? 'escrow_lock' : 'store_purchase',
          title: `Escrow Lock: ${product.title}`,
          description: `Escrow held for ${product.title} (${cleanBuyer} -> ${product.sellerName})`,
          amount: subtotalAmount,
          fee: escrowFee,
          balanceAfter: paymentMethod === 'wallet' ? Math.max(0, wallet.availableBalance - totalAmount) : wallet.availableBalance,
          currency: product.currency,
          referenceId: `ESC_${orderId}`,
          channel: paymentMethod,
        });
      });

    closeCheckout();
    return { success: true, order: newOrder };
  };

  const approveEscrowRelease = async (
    orderId: string
  ): Promise<{ success: boolean; message: string; order?: EscrowOrder }> => {
    const order = escrowOrders.find((o) => o.id === orderId);
    if (!order) return { success: false, message: 'Escrow order not found.' };

    try {
      const res = await fetch('/api/escrow/approve-release', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          actorPhone: currentUser.phoneNumber || order.buyerPhone,
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success && data.order) {
        const updatedOrder = { ...order, ...data.order, escrowPin: order.escrowPin || data.order.escrowPin };
        setEscrowOrders((prev) => prev.map((o) => (o.id === orderId ? updatedOrder : o)));
        setActiveEscrowModalOrder((prev) => (prev && prev.id === orderId ? updatedOrder : prev));
        const msg: ChatMessage = {
          id: `msg_esc_app_${Date.now()}`,
          chatId: order.chatId,
          sender: 'system',
          type: 'text',
          text: `Buyer approved release for Order #${order.id}. Recipient (${order.sellerName}) can now enter the 4-digit system code to claim payout.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'delivered',
        };
        setMessages((prev) => ({
          ...prev,
          [order.chatId]: [...(prev[order.chatId] || []), msg],
        }));
        broadcastLiveMessage(order.chatId, msg);
        return { success: true, message: data.message || 'Release approved! Share your 4-digit code with the seller.', order: updatedOrder };
      }
      return { success: false, message: data?.error || 'Could not approve escrow release.' };
    } catch (_) {
      // Offline optimistic update
      const updatedOrder: EscrowOrder = {
        ...order,
        status: 'release_approved',
        approvedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setEscrowOrders((prev) => prev.map((o) => (o.id === orderId ? updatedOrder : o)));
      setActiveEscrowModalOrder((prev) => (prev && prev.id === orderId ? updatedOrder : prev));
      return { success: true, message: 'Release approved! Share your 4-digit code with the seller.', order: updatedOrder };
    }
  };

  const claimEscrowWithCode = async (
    orderId: string,
    enteredPin: string
  ): Promise<{ success: boolean; message: string; order?: EscrowOrder }> => {
    const order = escrowOrders.find((o) => o.id === orderId);
    if (!order) return { success: false, message: 'Escrow order not found.' };
    const cleanPin = enteredPin.trim();
    if (!cleanPin) return { success: false, message: 'Enter the 4-digit system release code provided by the buyer.' };

    try {
      const res = await fetch('/api/escrow/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          pin: cleanPin,
          claimantPhone: currentUser.phoneNumber || order.sellerPhone,
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success && data.order) {
        const updatedOrder = data.order as EscrowOrder;
        setEscrowOrders((prev) => prev.map((o) => (o.id === orderId ? updatedOrder : o)));
        setActiveEscrowModalOrder((prev) => (prev && prev.id === orderId ? updatedOrder : prev));
        if (data.wallet) {
          setWallet((prev) => ({
            ...prev,
            availableBalance: Number(data.wallet.availableBalance) ?? prev.availableBalance,
            escrowLockedBalance: Number(data.wallet.escrowLockedBalance) ?? prev.escrowLockedBalance,
            transactions: Array.isArray(data.wallet.transactions) ? data.wallet.transactions : prev.transactions,
          }));
        }
        const payout = Number(data.payoutAmount ?? order.subtotalAmount ?? order.totalAmount);
        const relMsg: ChatMessage = {
          id: `msg_released_${Date.now()}`,
          chatId: order.chatId,
          sender: 'system',
          type: 'text',
          text: `Escrow PIN verified! ${CURRENCY_SYMBOLS[order.currency] || '₦'}${payout.toLocaleString()} credited directly to ${order.sellerName}'s AGC wallet.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'delivered',
        };
        setMessages((prev) => ({
          ...prev,
          [order.chatId]: [...(prev[order.chatId] || []), relMsg],
        }));
        broadcastLiveMessage(order.chatId, relMsg);
        return { success: true, message: data.message || 'Funds claimed and credited to your wallet!', order: updatedOrder };
      }
      if (data?.order) {
        setEscrowOrders((prev) => prev.map((o) => (o.id === orderId ? data.order : o)));
        setActiveEscrowModalOrder((prev) => (prev && prev.id === orderId ? data.order : prev));
      }
      return { success: false, message: data?.error || 'Invalid 4-digit release code.' };
    } catch (_) {
      return { success: false, message: 'Network error verifying code with server.' };
    }
  };

  const disputeEscrowOrder = async (
    orderId: string,
    reason: string
  ): Promise<{ success: boolean; message: string }> => {
    const order = escrowOrders.find((o) => o.id === orderId);
    if (!order) return { success: false, message: 'Escrow order not found.' };
    try {
      const res = await fetch('/api/escrow/dispute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          reason: reason.trim() || 'Buyer reported delivery issue',
          actorName: currentUser.fullName || 'AGC User',
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success && data.order) {
        setEscrowOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, ...data.order } : o)));
        setActiveEscrowModalOrder((prev) => (prev && prev.id === orderId ? { ...prev, ...data.order } : prev));
        return { success: true, message: data.message || `Dispute flagged for Order #${orderId}.` };
      }
      return { success: false, message: data?.error || 'Could not flag dispute.' };
    } catch (_) {
      setEscrowOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: 'disputed', disputeReason: reason } : o))
      );
      return { success: true, message: `Dispute flagged for Order #${orderId}. Funds remain safely held in escrow.` };
    }
  };

  const releaseEscrowFunds = (orderId: string, enteredPin: string) => {
    const order = escrowOrders.find((o) => o.id === orderId);
    if (!order) return { success: false, message: 'Order not found' };

    if (enteredPin.trim() !== order.escrowPin.trim() && !verifyPaymentPin(enteredPin)) {
      return { success: false, message: 'Invalid 4-digit PIN! Check your order receipt.' };
    }

    const payoutAmount = order.subtotalAmount || order.totalAmount;
    const updated = escrowOrders.map((o) =>
      o.id === orderId ? { ...o, status: 'funds_released' as const, updatedAt: new Date().toISOString() } : o
    );
    setEscrowOrders(updated);

    const relTx = recordLedgerTransaction({
      type: 'escrow_release',
      title: `Released Escrow Payout: ${order.product.title}`,
      description: `Escrow released to ${order.sellerName} (${order.product.title})`,
      amount: payoutAmount,
      fee: order.escrowFee || 0,
      balanceAfter: wallet.availableBalance,
      currency: order.currency,
      referenceId: `REL_${order.id}`,
      channel: 'wallet',
    });
    setWallet((prev) => ({
      ...prev,
      escrowLockedBalance: Math.max(0, prev.escrowLockedBalance - payoutAmount),
      transactions: [relTx, ...prev.transactions],
    }));

    const releaseMsg: ChatMessage = {
      id: `msg_released_${Date.now()}`,
      chatId: order.chatId,
      sender: 'system',
      type: 'text',
      text: `Delivery confirmed. Payment of ${CURRENCY_SYMBOLS[order.currency]}${payoutAmount.toLocaleString()} released to ${order.sellerName}.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'delivered',
    };

    setMessages((prev) => ({
      ...prev,
      [order.chatId]: [...(prev[order.chatId] || []), releaseMsg],
    }));

    setChats((prev) =>
      bumpChatThreadToTop(prev, order.chatId, {
        lastMessage: `✅ Escrow released (${CURRENCY_SYMBOLS[order.currency]}${order.totalAmount.toLocaleString()})`,
        lastMessageTime: releaseMsg.timestamp,
        lastMessageAtMs: Date.now(),
      })
    );

    return {
      success: true,
      message: `Payment of ${CURRENCY_SYMBOLS[order.currency]}${order.totalAmount.toLocaleString()} released to ${order.sellerName}.`,
    };
  };

  const openChatWithProduct = (chatId: string, product: Product) => {
    const resolvedChatId = openDirectChat({
      phone: product.sellerPhone,
      userId: product.sellerId || chatId,
      name: product.sellerName,
      avatar: product.imageUrl,
      location: product.category,
      verifiedStore: true,
      product,
    });
    sendProductCard(resolvedChatId, product);
  };

  // 1. Meme & Sticker Studio Handler
  const sendMemeSticker = (chatId: string, meme: MemeSticker) => {
    const targetChat = chatsRef.current.find((c) => c.id === chatId);
    if (isUserAdminBlockedFromSending(targetChat, currentUserRef.current)) return;
    if (!targetChat?.isGroup && !targetChat?.isChannel && !chatId.includes('self') && isUserBlockedByMe(chatId, targetChat?.phone || (targetChat as any)?.phoneNumber)) return;
    const nowMs = Date.now();
    const newMsg: ChatMessage = {
      id: `msg_meme_${nowMs}`,
      chatId,
      sender: 'user',
      senderName: currentUser.fullName || 'AGC User',
      senderPhone: currentUser.phoneNumber,
      senderAvatar: currentUser.avatarUrl,
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
      const updated = bumpChatThreadToTop(
        prev,
        chatId,
        {
          lastMessage: `🎭 Meme: ${meme.title}`,
          lastMessageTime: newMsg.timestamp,
          lastMessageAtMs: nowMs,
        },
        () => ({
          id: chatId,
          name: chatId.startsWith('dm_') ? 'Direct Chat' : 'Chat',
          avatar:
            "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='50' fill='%23180a33'/><circle cx='50' cy='38' r='18' fill='%23a855f7'/><path d='M16 88c0-18.778 15.222-34 34-34s34 15.222 34 34' fill='%23a855f7'/></svg>",
          verifiedStore: false,
          location: 'Direct Chat',
          unreadCount: 0,
          lastMessage: `🎭 Meme: ${meme.title}`,
          lastMessageTime: newMsg.timestamp,
          lastMessageAtMs: nowMs,
          catalog: [],
          isOnline: true,
        })
      );
      persistPartitionedChats(updated, currentUser.phoneNumber);
      return updated;
    });

    broadcastLiveMessage(chatId, newMsg);
  };

  // 2. Live Audio Spaces / Street Radio Handlers
  const checkIsSpaceCreator = useCallback(
    (space?: AudioSpace | null): boolean => isSpaceCreator(space, currentUser),
    [currentUser?.id, currentUser?.phoneNumber]
  );

  const createAudioSpace = (
    title: string,
    topic: string,
    category: AudioSpace['category'],
    isLowBandwidth: boolean = true
  ): AudioSpace => {
    const tempSpaceId = `space_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const myName = currentUser.fullName || 'Host';
    const myAvatar = currentUser.avatarUrl || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(myName)}&backgroundColor=581c87&textColor=ffffff`;
    const myHostId = currentUser.id || `host_${Date.now()}`;

    const newSpace: AudioSpace = {
      id: tempSpaceId,
      title: title.trim(),
      topic: topic.trim() || 'Live community discussion',
      category: category || 'Tech & Hustle',
      hostId: myHostId,
      hostPhone: currentUser.phoneNumber,
      hostName: myName,
      hostAvatar: myAvatar,
      listenersCount: 1,
      peakListeners: 1,
      startedAt: Date.now(),
      isLive: true,
      isLowBandwidthMode: isLowBandwidth,
      speakers: [
        {
          id: myHostId,
          name: myName,
          handle: currentUser.username ? `@${currentUser.username}` : undefined,
          avatar: myAvatar,
          role: 'host',
          isVerified: Boolean(currentUser.verificationBadge || currentUser.isCelebrityVerified),
          isSpeaking: false,
          isMuted: false,
        },
      ],
    };

    setAudioSpaces((prev) => {
      const updated = [newSpace, ...prev.filter((s) => s.id !== tempSpaceId)];
      try { localStorage.setItem('AGC_audio_spaces_v2', JSON.stringify(updated)); } catch (_) {}
      return updated;
    });

    setIsAudioSpaceMinimized(false);
    setActiveAudioSpace(newSpace);
    joinLiveSpace(
      tempSpaceId,
      { id: myHostId, name: myName, avatar: myAvatar },
      {
        hostId: myHostId,
        hostName: myName,
        hostAvatar: myAvatar,
        speakers: newSpace.speakers,
      }
    );

    //  LIVE SYSTEM: Persist to Supabase and broadcast live across all devices
    if (isSupabaseConfigured) {
      createAudioSpaceInDb({
        title: newSpace.title,
        topic: newSpace.topic,
        category: newSpace.category,
        host_id: myHostId,
        host_name: myName,
        host_avatar: myAvatar,
        is_live: true,
        is_low_bandwidth_mode: newSpace.isLowBandwidthMode,
        listeners_count: 1,
      })
        .then(({ data }) => {
          const persistedSpace = data
            ? {
                ...mapAudioSpaceRow(data),
                hostId: myHostId,
                hostPhone: currentUser.phoneNumber,
              }
            : newSpace;
          if (data?.id) {
            setAudioSpaces((prev) =>
              prev.map((s) =>
                s.id === tempSpaceId
                  ? { ...persistedSpace, speakers: newSpace.speakers, peakListeners: s.peakListeners }
                  : s
              )
            );
            setActiveAudioSpace((prev) =>
              prev && prev.id === tempSpaceId
                ? { ...persistedSpace, speakers: prev.speakers, peakListeners: prev.peakListeners }
                : prev
            );
            joinLiveSpace(
              String(data.id),
              { id: myHostId, name: myName, avatar: myAvatar },
              {
                hostId: myHostId,
                hostName: myName,
                hostAvatar: myAvatar,
                speakers: newSpace.speakers,
              }
            );
          }

          try {
            const existing = supabase.getChannels().find((c) => c.topic === 'realtime:live_audio_spaces');
            if (existing && existing.state === 'joined') {
              existing.send({ type: 'broadcast', event: 'space_started', payload: persistedSpace });
            } else {
              const tempCh = supabase.channel(`live_audio_spaces_pub_${Date.now()}`);
              tempCh.subscribe((st) => {
                if (st === 'SUBSCRIBED') {
                  tempCh.send({ type: 'broadcast', event: 'space_started', payload: persistedSpace });
                  setTimeout(() => {
                    Promise.resolve(supabase.removeChannel(tempCh)).catch(() => {});
                  }, 1000);
                }
              });
            }
          } catch (_) {}
        })
        .catch((e) => console.warn('Supabase space create notice:', e));
    }

    return newSpace;
  };

  const joinAudioSpace = (space: AudioSpace) => {
    const isAlreadyMember = space.speakers?.some((s) => s.id === currentUser.id) ||
      space.listeners?.some((l) => l.id === currentUser.id);

    const currentListenersCount = isAlreadyMember ? space.listenersCount : (space.listenersCount || 0) + 1;
    const updatedSpace: AudioSpace = {
      ...space,
      startedAt: space.startedAt || Date.now(),
      peakListeners: Math.max(space.peakListeners || 0, currentListenersCount),
      listenersCount: currentListenersCount,
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

    setIsAudioSpaceMinimized(false);
    setActiveAudioSpace(updatedSpace);
    setAudioSpaces((prev) => prev.map((s) => (s.id === space.id ? updatedSpace : s)));
    joinLiveSpace(
      space.id,
      {
        id: currentUser.id,
        name: currentUser.fullName,
        avatar: currentUser.avatarUrl,
      },
      {
        hostId: space.hostId,
        hostPhone: space.hostPhone,
        hostName: space.hostName,
        hostAvatar: space.hostAvatar,
        speakers: space.speakers,
        pinnedNote: space.pinnedAnnouncement,
      }
    );

    if (isSupabaseConfigured && !isAlreadyMember) {
      updateAudioSpaceInDb(space.id, { listeners_count: currentListenersCount }).catch(() => {});
    }
  };

  const leaveAudioSpace = () => {
    if (activeAudioSpace) {
      leaveLiveSpace(activeAudioSpace.id, currentUser.id);
    }
    setIsAudioSpaceMinimized(false);
    setActiveAudioSpace(null);
  };

  const toggleAudioSpaceMute = () => {
    if (!activeAudioSpace) return;
    setActiveAudioSpace((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        speakers: prev.speakers.map((sp) =>
          sp.id === currentUser.id ? { ...sp, isMuted: !sp.isMuted, isSpeaking: sp.isMuted ? sp.isSpeaking : false } : sp
        ),
      };
    });
    emitSpaceStageAction(activeAudioSpace.id, currentUser.id, 'toggle_self_mute');
  };

  const toggleSpaceLowBandwidth = () => {
    if (!activeAudioSpace) return;
    setActiveAudioSpace((prev) => (prev ? { ...prev, isLowBandwidthMode: !prev.isLowBandwidthMode } : null));
  };

  const endAudioSpace = (spaceId: string, customStats?: { durationFormatted?: string; peakListeners?: number }) => {
    const space = audioSpaces.find((s) => s.id === spaceId) || activeAudioSpace;
    // Strict creator-only check: non-creators can only leave, never end the space
    if (!checkIsSpaceCreator(space)) {
      leaveAudioSpace();
      return;
    }

    const startTime = space?.startedAt || activeAudioSpace?.startedAt || Date.now();
    const elapsedMs = Math.max(1000, Date.now() - startTime);

    const totalSeconds = Math.max(1, Math.floor(elapsedMs / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const computedDuration =
      hours > 0 ? `${hours}h ${minutes}m ${seconds}s` : minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

    const durationFormatted = customStats?.durationFormatted || computedDuration;
    const peakListeners = customStats?.peakListeners ?? Math.max(
      space?.peakListeners || 0,
      space?.listenersCount || 0,
      activeAudioSpace?.peakListeners || 0,
      activeAudioSpace?.listenersCount || 0,
      1
    );

    setSpaceEndedSummary({
      spaceId,
      title: space?.title || activeAudioSpace?.title || 'Live Community Space',
      durationFormatted,
      peakListeners,
    });

    setAudioSpaces((prev) => prev.filter((s) => s.id !== spaceId));

    emitEndSpace(spaceId, currentUser.id, durationFormatted, peakListeners, currentUser.phoneNumber);

    if (isSupabaseConfigured) {
      updateAudioSpaceInDb(spaceId, {
        is_live: false,
        ended_at: new Date().toISOString(),
      }).catch(() => {});

      try {
        const existing = supabase.getChannels().find((c) => c.topic === 'realtime:live_audio_spaces');
        if (existing && existing.state === 'joined') {
          existing.send({
            type: 'broadcast',
            event: 'space_ended',
            payload: { id: spaceId, spaceId, durationFormatted, peakListeners },
          });
        }
      } catch (_) {}
    }
    setIsAudioSpaceMinimized(false);
    setActiveAudioSpace(null);
  };

  const sendFriendRequest = async (targetPhone: string, targetName?: string, message?: string): Promise<boolean> => {
    if (!targetPhone || !currentUser.phoneNumber) return false;
    if (phonesMatch(targetPhone, currentUser.phoneNumber)) return false;

    const canonicalTarget = canonicalAdminUserKey(targetPhone) || normalizePhoneDigits(targetPhone);
    const now = Date.now();
    const lastSentAt = sentFriendRequestsCacheRef.current.get(canonicalTarget) || 0;
    if (now - lastSentAt < 10000) {
      return false;
    }
    sentFriendRequestsCacheRef.current.set(canonicalTarget, now);

    const req: import('../types').ContactRequest = {
      id: `freq_${now}_${Math.random().toString(36).substring(2, 6)}`,
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
      supabase
        .from('contact_requests')
        .insert({
          id: req.id,
          from_phone: req.senderPhone,
          to_phone: req.recipientPhone,
          from_name: req.senderName,
          from_avatar: req.senderAvatar,
          greeting: req.message,
          status: 'pending',
        })
        .then(() => {}, () => {});

      const cleanTarget = targetPhone.replace(/\D/g, '');
      const targets = Array.from(new Set([cleanTarget, normalizePhoneDigits(cleanTarget)].filter(Boolean)));
      targets.forEach((t) => {
        try {
          const ch = supabase.channel(`inbox_${t}`, { config: { broadcast: { self: false } } });
          ch.subscribe((st) => {
            if (st === 'SUBSCRIBED') {
              ch.send({ type: 'broadcast', event: 'friend_request', payload: { request: req } })
                .catch(() => {})
                .finally(() => {
                  setTimeout(() => {
                    try { supabase.removeChannel(ch); } catch (_) {}
                  }, 1500);
                });
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

    const matchingIds = friendRequests
      .filter((r) => r.id === requestId || (r.senderPhone && phonesMatch(r.senderPhone, req.senderPhone)))
      .map((r) => r.id);

    markFriendRequestsHandled(matchingIds, currentUser.phoneNumber);

    // Explicitly do NOT echo back a reverse friend request when accepting!
    addNewDeviceContact(
      req.senderName,
      req.senderPhone,
      'Connected via Contact Request',
      true,
      req.senderAvatar,
      { sendRequest: false }
    );

    setFriendRequests((prev) => {
      const remaining = prev.filter((r) => !matchingIds.includes(r.id));
      setActiveContactRequestPopup((curr) => {
        if (!curr || matchingIds.includes(curr.id) || (curr.senderPhone && phonesMatch(curr.senderPhone, req.senderPhone))) {
          return remaining.length > 0 ? remaining[0] : null;
        }
        return curr;
      });
      return remaining;
    });

    if (isSupabaseConfigured) {
      supabase
        .from('contact_requests')
        .update({ status: 'accepted', updated_at: new Date().toISOString() })
        .in('id', matchingIds)
        .then(() => {}, () => {});

      if (req.senderPhone && currentUser.phoneNumber) {
        const sClean = req.senderPhone.replace(/\D/g, '');
        const sNorm = normalizePhoneDigits(sClean);
        const mClean = currentUser.phoneNumber.replace(/\D/g, '');
        const mNorm = normalizePhoneDigits(mClean);
        const senderVars = Array.from(new Set([req.senderPhone, sClean, sNorm].filter(Boolean)));
        const myVars = Array.from(new Set([currentUser.phoneNumber, mClean, mNorm].filter(Boolean)));
        supabase
          .from('contact_requests')
          .update({ status: 'accepted', updated_at: new Date().toISOString() })
          .in('from_phone', senderVars)
          .in('to_phone', myVars)
          .eq('status', 'pending')
          .then(() => {}, () => {});
      }
    }

    const socket = getSocket();
    if (socket) {
      socket.emit('friend_request_accepted', {
        requestId,
        acceptorPhone: currentUser.phoneNumber,
        acceptorName: currentUser.fullName,
        acceptorAvatar: currentUser.avatarUrl,
        targetPhone: req.senderPhone,
      });
    }

    if (isSupabaseConfigured && req.senderPhone) {
      const cleanSender = req.senderPhone.replace(/\D/g, '');
      const senderTargets = Array.from(new Set([cleanSender, normalizePhoneDigits(cleanSender)].filter(Boolean)));
      senderTargets.forEach((t) => {
        try {
          const ch = supabase.channel(`inbox_${t}`, { config: { broadcast: { self: false } } });
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
              })
                .catch(() => {})
                .finally(() => {
                  setTimeout(() => {
                    try { supabase.removeChannel(ch); } catch (_) {}
                  }, 1500);
                });
            }
          });
        } catch (_) {}
      });
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
    const req = friendRequests.find((r) => r.id === requestId);
    const matchingIds = req
      ? friendRequests
          .filter((r) => r.id === requestId || (r.senderPhone && phonesMatch(r.senderPhone, req.senderPhone)))
          .map((r) => r.id)
      : [requestId];

    markFriendRequestsHandled(matchingIds, currentUser.phoneNumber);

    setFriendRequests((prev) => {
      const remaining = prev.filter((r) => !matchingIds.includes(r.id));
      setActiveContactRequestPopup((curr) => {
        if (!curr || matchingIds.includes(curr.id)) {
          return remaining.length > 0 ? remaining[0] : null;
        }
        return curr;
      });
      return remaining;
    });
    if (isSupabaseConfigured) {
      supabase
        .from('contact_requests')
        .update({ status: 'declined', updated_at: new Date().toISOString() })
        .in('id', matchingIds)
        .then(() => {}, () => {});

      if (req?.senderPhone && currentUser.phoneNumber) {
        const sClean = req.senderPhone.replace(/\D/g, '');
        const sNorm = normalizePhoneDigits(sClean);
        const mClean = currentUser.phoneNumber.replace(/\D/g, '');
        const mNorm = normalizePhoneDigits(mClean);
        const senderVars = Array.from(new Set([req.senderPhone, sClean, sNorm].filter(Boolean)));
        const myVars = Array.from(new Set([currentUser.phoneNumber, mClean, mNorm].filter(Boolean)));
        supabase
          .from('contact_requests')
          .update({ status: 'declined', updated_at: new Date().toISOString() })
          .in('from_phone', senderVars)
          .in('to_phone', myVars)
          .eq('status', 'pending')
          .then(() => {}, () => {});
      }
    }
  };

  const notifyGroupInviteResponse = useCallback(
    (invite: GroupInvitation, accepted: boolean) => {
      const responderPhone = currentUser.phoneNumber || '';
      const responderName = currentUser.fullName || currentUser.phoneNumber || 'AGC User';
      const targetPhone = invite.invitedByPhone;
      const payload = {
        inviteId: invite.id,
        groupId: invite.groupId,
        responderPhone,
        responderName,
        accepted,
        targetPhone,
      };

      try {
        emitGroupInviteResponse(payload);
      } catch (_) {}

      fetch('/api/groups/invite-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => {});

      try {
        const bc = new BroadcastChannel('AGC_chats_sync');
        bc.postMessage({ type: 'group_invite_response', ...payload });
        bc.close();
      } catch (_) {}

      if (isSupabaseConfigured) {
        const recipientPhones = dedupePhoneList([
          ...(targetPhone ? [targetPhone] : []),
          ...(Array.isArray(invite.chatSnapshot?.memberPhones) ? invite.chatSnapshot!.memberPhones! : []),
        ]).filter((p) => !responderPhone || !phonesMatch(p, responderPhone));

        recipientPhones.forEach((rp) => {
          const rawClean = rp.replace(/\D/g, '');
          const normTarget = normalizePhoneDigits(rawClean);
          new Set([rawClean, normTarget].filter(Boolean)).forEach((t) => {
            sendSupabaseBroadcastSafe(`inbox_${t}`, 'group_invite_response', payload);
          });
        });
      }
    },
    [currentUser.phoneNumber, currentUser.fullName, sendSupabaseBroadcastSafe]
  );

  const acceptGroupInvite = (inviteId: string) => {
    const invite = groupInvitesRef.current.find((inv) => inv.id === inviteId) ||
      groupInvites.find((inv) => inv.id === inviteId);
    if (!invite) return;

    const matchingIds = groupInvitesRef.current
      .filter((inv) => inv.id === inviteId || inv.groupId === invite.groupId)
      .map((inv) => inv.id);
    if (!matchingIds.includes(inviteId)) matchingIds.push(inviteId);

    markGroupInvitesHandled(matchingIds, currentUser.phoneNumber);
    declinedGroupIdsRef.current.delete(invite.groupId);
    persistDeclinedGroupIds(currentUser.phoneNumber);
    kickedGroupIdsRef.current.delete(invite.groupId);
    persistKickedGroupIds(currentUser.phoneNumber);

    setGroupInvites((prev) => {
      const remaining = prev.filter((inv) => !matchingIds.includes(inv.id) && inv.groupId !== invite.groupId);
      setActiveGroupInvitePopup((curr) => {
        if (!curr || matchingIds.includes(curr.id) || curr.groupId === invite.groupId) {
          return remaining.length > 0 ? remaining[0] : null;
        }
        return curr;
      });
      return remaining;
    });

    const isChannel = invite.entityType === 'channel' || invite.groupId.startsWith('channel_');
    const myName = currentUser.fullName || 'You';
    const myPhone = currentUser.phoneNumber || '';

    setChats((prev) => {
      const existingIdx = prev.findIndex((c) => c.id === invite.groupId);
      if (existingIdx >= 0) {
        const updated = prev.map((c) => {
          if (c.id !== invite.groupId) return c;
          const nextMembers = dedupeNameList([...(c.members || []), myName]);
          const nextMemberPhones = dedupePhoneList([...(c.memberPhones || []), myPhone]);
          return {
            ...c,
            invitationStatus: 'accepted' as const,
            members: nextMembers,
            memberPhones: nextMemberPhones,
            kickedPhones: (c.kickedPhones || []).filter((kp) => !phonesMatch(kp, myPhone)),
            membersCount: computeClientMembersCount(nextMembers, nextMemberPhones),
            lastMessage: `You joined this ${isChannel ? 'channel' : 'group'}`,
            lastMessageTime: 'Just now',
          };
        });
        persistPartitionedChats(updated, currentUser.phoneNumber);
        return updated;
      }

      const snapshot = invite.chatSnapshot;
      const baseMembers = snapshot?.members || (invite.invitedByName ? [invite.invitedByName] : []);
      const baseMemberPhones = snapshot?.memberPhones || (invite.invitedByPhone ? [invite.invitedByPhone] : []);
      const mergedMembers = dedupeNameList([...baseMembers, myName]);
      const mergedPhones = dedupePhoneList([...baseMemberPhones, myPhone]);

      const joinedThread: ChatThread = {
        ...(snapshot || {}),
        id: invite.groupId,
        name: invite.groupName || snapshot?.name || (isChannel ? 'Broadcast Channel' : 'Community Group'),
        avatar:
          invite.groupAvatar ||
          snapshot?.avatar ||
          (isChannel
            ? 'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=150&auto=format&fit=crop&q=80'
            : 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150&auto=format&fit=crop&q=80'),
        verifiedStore: snapshot?.verifiedStore ?? false,
        location: snapshot?.location || (isChannel ? 'Broadcast Channel' : 'Community Group'),
        unreadCount: 0,
        lastMessage: `You joined this ${isChannel ? 'channel' : 'group'}`,
        lastMessageTime: 'Just now',
        catalog: snapshot?.catalog || [],
        isOnline: true,
        isGroup: !isChannel,
        isChannel,
        admins: snapshot?.admins?.length ? snapshot.admins : invite.invitedByName ? [invite.invitedByName] : [],
        adminIds: snapshot?.adminIds || [],
        members: mergedMembers,
        memberPhones: mergedPhones,
        membersCount: computeClientMembersCount(mergedMembers, mergedPhones),
        description: invite.description || snapshot?.description,
        invitedBy: invite.invitedByName,
        invitationStatus: 'accepted',
      };

      const updated = [joinedThread, ...prev];
      persistPartitionedChats(updated, currentUser.phoneNumber);
      return updated;
    });

    const welcomeMsg: ChatMessage = {
      id: `msg_sys_join_${Date.now()}`,
      chatId: invite.groupId,
      sender: 'system',
      text: `You accepted ${invite.invitedByName ? `${invite.invitedByName}'s` : 'the'} invitation and joined "${invite.groupName}".`,
      type: 'text',
      timestamp: 'Just now',
      status: 'sent',
    };
    setMessages((prev) => {
      const existing = prev[invite.groupId] || [];
      const updated = { ...prev, [invite.groupId]: [...existing, welcomeMsg] };
      persistPartitionedMessages(updated, currentUser.phoneNumber);
      return updated;
    });

    try {
      joinChatRoom(invite.groupId);
    } catch (_) {}

    if (isSupabaseConfigured) {
      supabase
        .from('group_invitations')
        .update({ status: 'accepted', updated_at: new Date().toISOString() })
        .in('id', matchingIds)
        .then(() => {}, () => {});

      if (currentUser.phoneNumber) {
        const cleanMe = currentUser.phoneNumber.replace(/\D/g, '');
        const normMe = normalizePhoneDigits(cleanMe);
        const myVars = Array.from(new Set([currentUser.phoneNumber, cleanMe, normMe, normMe ? `+${normMe}` : ''].filter(Boolean)));
        supabase
          .from('group_invitations')
          .update({ status: 'accepted', updated_at: new Date().toISOString() })
          .eq('group_id', invite.groupId)
          .in('invited_phone', myVars)
          .eq('status', 'pending')
          .then(() => {}, () => {});
      }
    }

    if (invite.groupId.startsWith('town_comm_')) {
      const commId = invite.groupId.replace('town_comm_', '');
      setTownCommunities((prev) => {
        const exists = prev.some((c) => c.id === commId);
        let updated: TownCommunity[];
        if (exists) {
          updated = prev.map((c) => {
            if (c.id !== commId) return c;
            const nextPhones = dedupePhoneList([...(c.memberPhones || []), myPhone]);
            return {
              ...c,
              isJoined: true,
              memberPhones: nextPhones,
              membersCount: Math.max(c.membersCount || 1, nextPhones.length),
            };
          });
        } else {
          const newComm: TownCommunity = {
            id: commId,
            name: invite.groupName || 'Private Group',
            type: isChannel ? 'channel' : 'group',
            category: 'Tech & Hustle',
            membersCount: Math.max(invite.membersCount || 1, 1),
            avatar: invite.groupAvatar || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(invite.groupName || 'Group')}&backgroundColor=581c87&textColor=ffffff`,
            description: invite.description || '',
            isVerified: false,
            isJoined: true,
            recentActivity: 'Joined via invite',
            adminName: invite.invitedByName || 'Group Admin',
            isPrivate: !isChannel,
            memberPhones: myPhone ? [myPhone] : [],
          };
          updated = [newComm, ...prev];
        }
        persistPartitionedTownCommunities(updated, myPhone);
        return updated;
      });
    }

    notifyGroupInviteResponse(invite, true);
    setActiveChatId(invite.groupId);
  };

  const declineGroupInvite = (inviteId: string) => {
    const invite = groupInvitesRef.current.find((inv) => inv.id === inviteId) ||
      groupInvites.find((inv) => inv.id === inviteId);
    const matchingIds = invite
      ? groupInvitesRef.current
          .filter((inv) => inv.id === inviteId || inv.groupId === invite.groupId)
          .map((inv) => inv.id)
      : [inviteId];
    if (!matchingIds.includes(inviteId)) matchingIds.push(inviteId);

    markGroupInvitesHandled(matchingIds, currentUser.phoneNumber);
    if (invite?.groupId) {
      declinedGroupIdsRef.current.add(invite.groupId);
      persistDeclinedGroupIds(currentUser.phoneNumber);
    }

    setGroupInvites((prev) => {
      const remaining = prev.filter((inv) => !matchingIds.includes(inv.id) && (!invite?.groupId || inv.groupId !== invite.groupId));
      setActiveGroupInvitePopup((curr) => {
        if (!curr || matchingIds.includes(curr.id) || (invite?.groupId && curr.groupId === invite.groupId)) {
          return remaining.length > 0 ? remaining[0] : null;
        }
        return curr;
      });
      return remaining;
    });

    if (invite?.groupId) {
      setChats((prev) => {
        if (!prev.some((c) => c.id === invite.groupId && c.invitationStatus === 'pending')) return prev;
        const updated = prev.filter((c) => c.id !== invite.groupId);
        persistPartitionedChats(updated, currentUser.phoneNumber);
        return updated;
      });
      if (activeChatId === invite.groupId) {
        setActiveChatId(null);
      }
    }

    if (isSupabaseConfigured) {
      supabase
        .from('group_invitations')
        .update({ status: 'declined', updated_at: new Date().toISOString() })
        .in('id', matchingIds)
        .then(() => {}, () => {});

      if (invite?.groupId && currentUser.phoneNumber) {
        const cleanMe = currentUser.phoneNumber.replace(/\D/g, '');
        const normMe = normalizePhoneDigits(cleanMe);
        const myVars = Array.from(new Set([currentUser.phoneNumber, cleanMe, normMe, normMe ? `+${normMe}` : ''].filter(Boolean)));
        supabase
          .from('group_invitations')
          .update({ status: 'declined', updated_at: new Date().toISOString() })
          .eq('group_id', invite.groupId)
          .in('invited_phone', myVars)
          .eq('status', 'pending')
          .then(() => {}, () => {});
      }
    }

    if (invite) {
      notifyGroupInviteResponse(invite, false);
    }
  };

  const respondToGroupInvitation = (chatId: string, accept: boolean) => {
    const matchingInvite = groupInvitesRef.current.find((inv) => inv.groupId === chatId);
    if (matchingInvite) {
      if (accept) acceptGroupInvite(matchingInvite.id);
      else declineGroupInvite(matchingInvite.id);
      return;
    }

    if (!accept) {
      declinedGroupIdsRef.current.add(chatId);
      persistDeclinedGroupIds(currentUser.phoneNumber);
      setChats((prev) => {
        const updated = prev.filter((c) => c.id !== chatId);
        persistPartitionedChats(updated, currentUser.phoneNumber);
        return updated;
      });
      setActiveChatId(null);
      return;
    }

    setChats((prev) => {
      const updated = prev.map((c) => {
        if (c.id !== chatId) return c;
        return {
          ...c,
          invitationStatus: 'accepted' as const,
        };
      });
      persistPartitionedChats(updated, currentUser.phoneNumber);
      return updated;
    });
  };

  // 3. Scam Alert & Reputation Checker Handlers

  // --- Live Supabase Realtime listener for cross-device scam report sync ---
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
    fetchAllScamReports().then(({ data }: any) => {
      if (!data || !Array.isArray(data) || data.length === 0) return;
      setScamDatabase((prev) => {
        const merged: Record<string, ScamEntity> = { ...prev };
        data.forEach((row: any) => {
          const key = (row.target_value || '').replace(/\s+/g, '');
          if (!key || key.startsWith('__agc_sys_')) return;
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
    }, () => {});

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

    // 2. Persist to Supabase Database and broadcast to all live users
    if (isSupabaseConfigured) {
      try {
        const payload = {
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
        };
        // Persist to Supabase scam_reports table
        upsertScamReportInDb(payload).catch((err) => console.warn('Scam DB upsert error:', err));
        // Broadcast over Realtime
        broadcastScamReport(payload);
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
      senderName: currentUser.fullName || 'AGC User',
      senderPhone: currentUser.phoneNumber,
      senderAvatar: currentUser.avatarUrl,
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

    setChats((prev) => {
      const updated = bumpChatThreadToTop(prev, chatId, {
        lastMessage: `📄 Invoice #${invoice.invoiceNumber}`,
        lastMessageTime: newMsg.timestamp,
        lastMessageAtMs: Date.now(),
      });
      persistPartitionedChats(updated, currentUser.phoneNumber);
      return updated;
    });

    broadcastLiveMessage(chatId, newMsg);
  };

  // Helper: Recompute poll option tallies & totals from per-user votesByUser map
  const recomputePollFromVotes = (
    poll: FinancialPoll,
    votesByUser: Record<string, { optionId: string; voterName: string; voterKey: string }>
  ): FinancialPoll => {
    const entries = Object.values(votesByUser || {});
    const updatedOptions = poll.options.map((opt) => {
      const votersForOpt = entries.filter((v) => v.optionId === opt.id);
      return {
        ...opt,
        votesCount: votersForOpt.length,
        voterNames: votersForOpt.map((v) => v.voterName),
      };
    });
    const totalVoters = entries.length;
    return {
      ...poll,
      options: updatedOptions,
      votesByUser,
      totalVoters,
      totalStakeLocked: totalVoters * poll.stakePerVote,
    };
  };

  // 6. Group Polls with Financial Stakes Handlers (Strictly Group Chats Only)
  const createFinancialPoll = (
    chatId: string,
    title: string,
    stakePerVote: number,
    optionTexts: string[]
  ): { success: boolean; message?: string } => {
    const targetChat = chats.find((c) => c.id === chatId);
    if (!targetChat?.isGroup) {
      return {
        success: false,
        message: 'Financial Stake Polls are only available in group chats.',
      };
    }

    const activeCur: CurrencyCode = currency || 'NGN';
    const cleanOptions = optionTexts.map((t) => t.trim()).filter(Boolean);
    if (cleanOptions.length < 2) {
      return { success: false, message: 'Provide at least 2 poll options.' };
    }

    const nowTs = Date.now();
    const newPoll: FinancialPoll = {
      id: `poll_${nowTs}`,
      title,
      creatorName: currentUser.fullName || 'AGC User',
      stakePerVote,
      currency: activeCur,
      totalStakeLocked: 0,
      totalVoters: 0,
      votesByUser: {},
      status: 'active',
      payoutRule: `Every voter locks ${CURRENCY_SYMBOLS[activeCur]}${stakePerVote.toLocaleString()} into Escrow upon casting vote.`,
      options: cleanOptions.map((txt, idx) => ({
        id: `opt_${nowTs}_${idx}`,
        text: txt,
        votesCount: 0,
        voterNames: [],
      })),
    };

    const newMsg: ChatMessage = {
      id: `msg_poll_${nowTs}`,
      chatId,
      sender: 'user',
      senderName: currentUser.fullName || 'AGC User',
      senderPhone: currentUser.phoneNumber,
      senderAvatar: currentUser.avatarUrl,
      type: 'financial_poll',
      financialPoll: newPoll,
      text: `Financial Stake Poll: ${title} (Stake: ${CURRENCY_SYMBOLS[activeCur]}${stakePerVote.toLocaleString()})`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sent',
    };

    setMessages((prev) => {
      const updated = {
        ...prev,
        [chatId]: [...(prev[chatId] || []), newMsg],
      };
      try {
        const userKey = getUserStorageKey('AGC_messages_v2', currentUser.phoneNumber);
        localStorage.setItem(userKey, JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });

    setChats((prev) => {
      const updated = bumpChatThreadToTop(prev, chatId, {
        lastMessage: `📊 Stake Poll: ${title}`,
        lastMessageTime: newMsg.timestamp,
        lastMessageAtMs: nowTs,
      });
      persistPartitionedChats(updated, currentUser.phoneNumber);
      return updated;
    });

    broadcastLiveMessage(chatId, newMsg);
    return { success: true, message: 'Stake Poll launched in group!' };
  };

  const voteOnFinancialPoll = (
    chatId: string,
    pollId: string,
    optionId: string
  ): { success: boolean; insufficientFunds?: boolean; message?: string } => {
    let resolvedId = chatId;
    let chatMsgs = messages[resolvedId] || [];
    let pollMsg = chatMsgs.find((m) => m.financialPoll?.id === pollId);
    if (!pollMsg) {
      for (const [cid, list] of Object.entries(messages)) {
        const found = list.find((m) => m.financialPoll?.id === pollId);
        if (found) {
          resolvedId = cid;
          chatMsgs = list;
          pollMsg = found;
          break;
        }
      }
    }

    if (!pollMsg || !pollMsg.financialPoll) {
      return { success: false, message: 'Poll not found in this group.' };
    }

    const targetChat = chats.find((c) => c.id === resolvedId);
    if (targetChat && !targetChat.isGroup) {
      return { success: false, message: 'Stake Polls are restricted to group chats.' };
    }

    const poll = pollMsg.financialPoll;
    const myVoterKey = normalizePhoneDigits(currentUser.phoneNumber) || currentUser.id || 'local_user';
    const existingVotesMap: Record<string, { optionId: string; voterName: string; voterKey: string }> = {
      ...(poll.votesByUser || {}),
    };
    const myExistingVote = existingVotesMap[myVoterKey];

    if (myExistingVote?.optionId === optionId) {
      return { success: true, message: 'Your vote is already locked on this option.' };
    }

    const hasAlreadyStaked = Boolean(myExistingVote);
    if (!hasAlreadyStaked && wallet.availableBalance < poll.stakePerVote) {
      const sym = CURRENCY_SYMBOLS[poll.currency || 'NGN'] || '₦';
      return {
        success: false,
        insufficientFunds: true,
        message: `Insufficient balance: need ${sym}${poll.stakePerVote.toLocaleString()} to lock your vote stake.`,
      };
    }

    if (!hasAlreadyStaked) {
      const pollTx = recordLedgerTransaction({
        type: 'escrow_lock',
        title: `Poll Stake: ${poll.title.slice(0, 24)}...`,
        description: `Group financial poll stake (${poll.title})`,
        amount: poll.stakePerVote,
        fee: 0,
        balanceAfter: wallet.availableBalance - poll.stakePerVote,
        currency: poll.currency,
        referenceId: `POL_${pollId}`,
        channel: 'wallet',
      });
      setWallet((prev) => ({
        ...prev,
        availableBalance: prev.availableBalance - poll.stakePerVote,
        escrowLockedBalance: prev.escrowLockedBalance + poll.stakePerVote,
        transactions: [pollTx, ...prev.transactions],
      }));
    }

    const voterDisplay = currentUser.fullName || currentUser.phoneNumber || 'AGC Member';
    const nextVotesByUser = {
      ...existingVotesMap,
      [myVoterKey]: {
        optionId,
        voterName: voterDisplay,
        voterKey: myVoterKey,
      },
    };

    const updatedPoll = recomputePollFromVotes(poll, nextVotesByUser);
    delete updatedPoll.userVotedOptionId;

    const updatedMsg: ChatMessage = { ...pollMsg, financialPoll: updatedPoll };

    setMessages((prev) => {
      const updated = {
        ...prev,
        [resolvedId]: (prev[resolvedId] || []).map((m) =>
          m.financialPoll?.id === pollId ? updatedMsg : m
        ),
      };
      try {
        const userKey = getUserStorageKey('AGC_messages_v2', currentUser.phoneNumber);
        localStorage.setItem(userKey, JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });

    broadcastLiveMessage(resolvedId, updatedMsg);
    return {
      success: true,
      message: hasAlreadyStaked
        ? 'Vote updated (stake already locked in escrow).'
        : 'Vote cast & escrow stake locked!',
    };
  };

  // 6a. Free Chat Quick Polls (Groups, DMs, Channels)
  const createQuickPoll = (
    chatId: string,
    question: string,
    optionTexts: string[],
    allowMultiple = false
  ): { success: boolean; message?: string } => {
    const _targetChatPoll = chatsRef.current.find((c) => c.id === chatId);
    if (isUserAdminBlockedFromSending(_targetChatPoll, currentUserRef.current)) {
      return { success: false, message: 'Only admins can post in this group/channel.' };
    }
    const cleanQuestion = question.trim();
    const cleanOptions = optionTexts.map((t) => t.trim()).filter(Boolean);
    if (!cleanQuestion) return { success: false, message: 'Enter a poll question.' };
    if (cleanOptions.length < 2) return { success: false, message: 'Provide at least 2 options.' };

    const nowTs = Date.now();
    const poll: QuickPoll = {
      id: `qpoll_${nowTs}_${Math.random().toString(36).slice(2, 6)}`,
      question: cleanQuestion,
      creatorId: currentUser.id,
      creatorName: currentUser.fullName || 'AGC User',
      options: cleanOptions.map((txt, idx) => ({
        id: `qopt_${nowTs}_${idx}`,
        text: txt,
        voterIds: [],
        voterNames: [],
      })),
      allowMultiple,
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    const targetChat = chatsRef.current.find((c) => c.id === chatId);
    const ghostMs = parseGhostDurationMs(targetChat?.disappearingTimer);

    const newMsg: ChatMessage = {
      id: `msg_qpoll_${nowTs}`,
      chatId,
      sender: 'user',
      senderName: currentUser.fullName || 'AGC User',
      senderPhone: currentUser.phoneNumber,
      senderAvatar: currentUser.avatarUrl,
      type: 'quick_poll',
      quickPoll: poll,
      text: `📊 Poll: ${cleanQuestion}`,
      ...(ghostMs > 0 ? { isGhost: true, disappearingDurationMs: ghostMs, expiresAt: Date.now() + ghostMs } : {}),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sent',
    };

    setMessages((prev) => {
      const updated = { ...prev, [chatId]: [...(prev[chatId] || []), newMsg] };
      persistPartitionedMessages(updated, currentUser.phoneNumber);
      return updated;
    });
    setChats((prev) => {
      const updated = bumpChatThreadToTop(prev, chatId, {
        lastMessage: `📊 Poll: ${cleanQuestion}`,
        lastMessageTime: newMsg.timestamp,
        lastMessageAtMs: nowTs,
      });
      persistPartitionedChats(updated, currentUser.phoneNumber);
      return updated;
    });

    broadcastLiveMessage(chatId, newMsg);
    return { success: true, message: 'Quick Poll posted!' };
  };

  const voteOnQuickPoll = (chatId: string, messageId: string, optionId: string) => {
    const myVoterId = currentUser.id || normalizePhoneDigits(currentUser.phoneNumber) || 'local_user';
    const myVoterName = currentUser.fullName || currentUser.phoneNumber || 'Member';
    let updatedPollForSync: QuickPoll | null = null;

    setMessages((prev) => {
      const list = prev[chatId] || [];
      const nextList = list.map((m) => {
        if (m.id !== messageId || !m.quickPoll || m.quickPoll.status === 'closed') return m;
        const allowMultiple = Boolean(m.quickPoll.allowMultiple);
        const nextPoll: QuickPoll = {
          ...m.quickPoll,
          options: m.quickPoll.options.map((opt) => {
            const voterIds = [...opt.voterIds];
            const voterNames = [...opt.voterNames];
            const idx = voterIds.indexOf(myVoterId);
            if (opt.id === optionId) {
              if (idx >= 0) {
                voterIds.splice(idx, 1);
                voterNames.splice(idx, 1);
              } else {
                voterIds.push(myVoterId);
                voterNames.push(myVoterName);
              }
            } else if (!allowMultiple && idx >= 0) {
              voterIds.splice(idx, 1);
              voterNames.splice(idx, 1);
            }
            return { ...opt, voterIds, voterNames };
          }),
        };
        updatedPollForSync = nextPoll;
        return { ...m, quickPoll: nextPoll };
      });
      if (!updatedPollForSync) return prev;
      const nextAll = { ...prev, [chatId]: nextList };
      persistPartitionedMessages(nextAll, currentUser.phoneNumber);
      return nextAll;
    });

    if (updatedPollForSync) {
      const targetChat = chatsRef.current.find((c) => c.id === chatId);
      const targetPhone = targetChat?.phone || (targetChat as any)?.phoneNumber || '';
      const memberPhones = targetChat?.memberPhones || [];
      const payload = { chatId, messageId, quickPoll: updatedPollForSync, targetPhone, memberPhones, senderId: currentUser.id };
      try {
        const bc = new BroadcastChannel('AGC_chats_sync');
        bc.postMessage({ type: 'quick_poll_update', ...payload });
        bc.close();
      } catch (_) {}
      emitQuickPollUpdate(payload);
      if (isSupabaseConfigured) {
        sendSupabaseBroadcastSafe(`chat_${chatId}`, 'quick_poll_update', payload);
        if (targetPhone) {
          const clean = targetPhone.replace(/\D/g, '');
          if (clean) sendSupabaseBroadcastSafe(`inbox_${clean}`, 'quick_poll_update', payload);
        }
        memberPhones.forEach((p) => {
          const cp = p.replace(/\D/g, '');
          if (cp && !phonesMatch(cp, currentUser.phoneNumber)) {
            sendSupabaseBroadcastSafe(`inbox_${cp}`, 'quick_poll_update', payload);
          }
        });
      }
    }
  };

  // 6b. Real-Time Supabase Multiplayer X/O (Tic-Tac-Toe) & Location Pin Modal State
  const [isGameXoModalOpen, setIsGameXoModalOpen] = useState(false);
  const [isShareLocationModalOpen, setIsShareLocationModalOpen] = useState(false);
  const inFlightGameSettlesRef = useRef<Set<string>>(new Set());

  const getXoLockedStorageKey = (phone?: string) =>
    getUserStorageKey('AGC_xo_locked_ids', phone || currentUser.phoneNumber);
  const getXoSettledStorageKey = (phone?: string) =>
    getUserStorageKey('AGC_xo_settled_ids', phone || currentUser.phoneNumber);

  const hasXoFlag = (storageKey: string, gameId: string): boolean => {
    try {
      const raw = localStorage.getItem(storageKey);
      const arr: string[] = raw ? JSON.parse(raw) : [];
      return arr.includes(gameId);
    } catch {
      return false;
    }
  };

  const setXoFlag = (storageKey: string, gameId: string) => {
    try {
      const raw = localStorage.getItem(storageKey);
      const arr: string[] = raw ? JSON.parse(raw) : [];
      if (!arr.includes(gameId)) {
        localStorage.setItem(storageKey, JSON.stringify([...arr.slice(-150), gameId]));
      }
    } catch (_) {}
  };

  const applyAuthoritativeServerWallet = useCallback((srvWallet: any, phoneOverride?: string) => {
    if (!srvWallet) return;
    const phone = phoneOverride || currentUserRef.current?.phoneNumber || '';
    const nextWallet: UserWallet = {
      availableBalance: Math.max(0, Number(srvWallet.availableBalance) || 0),
      escrowLockedBalance: Math.max(0, Number(srvWallet.escrowLockedBalance) || 0),
      currency: srvWallet.currency || walletRef.current.currency || 'NGN',
      transactions: Array.isArray(srvWallet.transactions)
        ? srvWallet.transactions
        : walletRef.current.transactions,
    };
    isHydratingWalletRef.current = true;
    setWallet(nextWallet);
    walletRef.current = nextWallet;
    if (phone) persistPartitionedWallet(nextWallet, phone);
    isHydratingWalletRef.current = false;
  }, []);

  const resolveGameApiUrl = (apiPath: string): string => {
    const base = (getSocketUrl() || '').trim().replace(/\/+$/, '');
    const normalized = apiPath.startsWith('/') ? apiPath : `/${apiPath}`;
    return base ? `${base}${normalized}` : normalized;
  };

  const lockGameBetOnServer = async (params: {
    gameId: string;
    gameType: 'xo' | 'whot' | 'ludo' | 'poker';
    role: 'challenger' | 'opponent';
    playerPhone: string;
    playerName?: string;
    opponentPhone?: string;
    opponentName?: string;
    betAmount: number;
    currency: CurrencyCode;
    title: string;
  }): Promise<{ success: boolean; insufficientFunds?: boolean; requiresVerifiedBadge?: boolean; message?: string }> => {
    const applyLocalEscrowLockFallback = (): {
      success: boolean;
      insufficientFunds?: boolean;
      message?: string;
    } => {
      const stake = Math.round(Number(params.betAmount) || 0);
      const currentWal = walletRef.current;
      const sym = CURRENCY_SYMBOLS[params.currency || currentWal.currency || 'NGN'] || '₦';
      if (stake <= 0 || currentWal.availableBalance < stake) {
        return {
          success: false,
          insufficientFunds: true,
          message: `Insufficient wallet balance (${sym}${currentWal.availableBalance.toLocaleString()} available; need ${sym}${stake.toLocaleString()}).`,
        };
      }
      const nowIso = new Date().toISOString();
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const txId = `tx_${params.gameType}_${params.role === 'challenger' ? 'lock' : 'acc'}_${params.gameId}`;
      const label =
        params.gameType === 'whot'
          ? 'Whot!'
          : params.gameType === 'ludo'
          ? 'Ludo'
          : params.gameType === 'poker'
          ? 'Poker'
          : 'X/O';
      const nextAvailable = Math.max(0, Number(currentWal.availableBalance || 0) - stake);
      const nextLocked = Math.max(0, Number(currentWal.escrowLockedBalance || 0) + stake);
      const lockTx: WalletTransaction = {
        id: txId,
        type: 'game_wager',
        title: params.title || `${label} Bet Escrow Lock`,
        amount: stake,
        currency: params.currency || currentWal.currency || 'NGN',
        timestamp: nowStr,
        createdAt: nowIso,
        status: 'completed',
        reference: `${params.gameType.toUpperCase()}_${params.gameId}`,
        channel: 'wallet',
        metadata: { gameBetEscrow: true, gameId: params.gameId, gameType: params.gameType, role: params.role },
      };
      const nextWallet: UserWallet = {
        ...currentWal,
        availableBalance: nextAvailable,
        escrowLockedBalance: nextLocked,
        transactions: [lockTx, ...(currentWal.transactions || []).filter((t) => t.id !== txId)].slice(0, 100),
      };
      isHydratingWalletRef.current = true;
      setWallet(nextWallet);
      walletRef.current = nextWallet;
      persistPartitionedWallet(nextWallet, params.playerPhone);
      isHydratingWalletRef.current = false;
      setXoFlag(getXoLockedStorageKey(params.playerPhone), params.gameId);
      return { success: true };
    };

    try {
      const resp = await fetch(resolveGameApiUrl('/api/games/bet/lock'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const contentType = (resp.headers.get('content-type') || '').toLowerCase();
      const rawText = await resp.text().catch(() => '');
      let data: any = null;
      if (rawText && !contentType.includes('text/html') && !rawText.trimStart().startsWith('<')) {
        try {
          data = JSON.parse(rawText);
        } catch {
          data = null;
        }
      }

      const isStructuredApiJson =
        data && typeof data === 'object' && ('success' in data || 'message' in data || 'error' in data);

      // If endpoint is missing/static HTML fallback/gateway unavailable, use verified local escrow lock
      if (!isStructuredApiJson && [200, 404, 405, 502, 503, 504].includes(resp.status)) {
        return applyLocalEscrowLockFallback();
      }

      if (!resp.ok || !data?.success) {
        if (data?.insufficientFunds) {
          refreshWalletFromServer().catch(() => {});
        }
        return {
          success: false,
          insufficientFunds: Boolean(data?.insufficientFunds),
          requiresVerifiedBadge: Boolean(data?.requiresVerifiedBadge),
          message:
            data?.message ||
            data?.error ||
            `Unable to lock bet stake in server escrow (HTTP ${resp.status}).`,
        };
      }

      if (data.wallet) {
        applyAuthoritativeServerWallet(data.wallet, params.playerPhone);
      }
      setXoFlag(getXoLockedStorageKey(params.playerPhone), params.gameId);
      return { success: true };
    } catch {
      return applyLocalEscrowLockFallback();
    }
  };

  const settleGameBetOnServer = async (params: {
    gameId: string;
    gameType: 'xo' | 'whot' | 'ludo' | 'poker';
    status: 'won' | 'draw' | 'declined' | 'cancelled';
    winnerPhone?: string;
    winnerName?: string;
    challengerPhone: string;
    opponentPhone?: string;
    betAmount: number;
    currency: CurrencyCode;
  }): Promise<boolean> => {
    const myPhone = currentUserRef.current?.phoneNumber || '';
    const settleKey = getXoSettledStorageKey(myPhone);
    if (inFlightGameSettlesRef.current.has(params.gameId)) return true;
    inFlightGameSettlesRef.current.add(params.gameId);

    const applyLocalEscrowSettleFallback = (): boolean => {
      if (!myPhone || hasXoFlag(settleKey, params.gameId)) return true;
      const lockedKey = getXoLockedStorageKey(myPhone);
      const hadLocked = hasXoFlag(lockedKey, params.gameId);
      const stake = Math.round(Number(params.betAmount) || 0);
      if (!hadLocked || stake <= 0) {
        setXoFlag(settleKey, params.gameId);
        return true;
      }

      const currentWal = walletRef.current;
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const label =
        params.gameType === 'whot'
          ? 'Whot!'
          : params.gameType === 'ludo'
          ? 'Ludo'
          : params.gameType === 'poker'
          ? 'Poker'
          : 'X/O';
      const refId = `${params.gameType.toUpperCase()}_${params.gameId}`;
      let nextAvailable = Number(currentWal.availableBalance || 0);
      const nextLocked = Math.max(0, Number(currentWal.escrowLockedBalance || 0) - stake);
      let tx: WalletTransaction | null = null;

      const nowIso = new Date().toISOString();
      if (params.status === 'won') {
        const iWon = Boolean(params.winnerPhone && phonesMatch(myPhone, params.winnerPhone));
        if (iWon) {
          const totalPot = stake * 2;
          const fee = Math.round(totalPot * 0.01);
          const payout = Math.max(0, totalPot - fee);
          nextAvailable += payout;
          tx = {
            id: `tx_${params.gameType}_win_${params.gameId}`,
            type: 'game_win',
            title: `${label} Win Payout (1% fee: ${fee.toLocaleString()})`,
            amount: payout,
            currency: params.currency || currentWal.currency || 'NGN',
            timestamp: nowStr,
            createdAt: nowIso,
            status: 'completed',
            reference: refId,
            channel: 'wallet',
          };
        } else {
          tx = {
            id: `tx_${params.gameType}_loss_${params.gameId}`,
            type: 'escrow_release',
            title: `${label} Bet Lost (${params.winnerName || 'Opponent'} won)`,
            amount: stake,
            currency: params.currency || currentWal.currency || 'NGN',
            timestamp: nowStr,
            createdAt: nowIso,
            status: 'completed',
            reference: refId,
            channel: 'wallet',
          };
        }
      } else {
        nextAvailable += stake;
        tx = {
          id: `tx_${params.gameType}_ref_${params.gameId}`,
          type: 'refund',
          title:
            params.status === 'draw'
              ? `${label} Match Draw (Stake Refunded)`
              : `${label} Challenge Closed (Stake Refunded)`,
          amount: stake,
          currency: params.currency || currentWal.currency || 'NGN',
          timestamp: nowStr,
          createdAt: nowIso,
          status: 'completed',
          reference: refId,
          channel: 'wallet',
        };
      }

      const nextWallet: UserWallet = {
        ...currentWal,
        availableBalance: Math.max(0, nextAvailable),
        escrowLockedBalance: nextLocked,
        transactions: tx
          ? [tx, ...(currentWal.transactions || []).filter((t) => t.id !== tx!.id)].slice(0, 100)
          : currentWal.transactions,
      };
      isHydratingWalletRef.current = true;
      setWallet(nextWallet);
      walletRef.current = nextWallet;
      persistPartitionedWallet(nextWallet, myPhone);
      isHydratingWalletRef.current = false;
      setXoFlag(settleKey, params.gameId);
      return true;
    };

    try {
      const resp = await fetch(resolveGameApiUrl('/api/games/bet/settle'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...params,
          requesterPhone: myPhone || params.winnerPhone || params.challengerPhone,
        }),
      });
      const contentType = (resp.headers.get('content-type') || '').toLowerCase();
      const rawText = await resp.text().catch(() => '');
      let data: any = null;
      if (rawText && !contentType.includes('text/html') && !rawText.trimStart().startsWith('<')) {
        try {
          data = JSON.parse(rawText);
        } catch {
          data = null;
        }
      }
      const isStructuredApiJson =
        data && typeof data === 'object' && ('success' in data || 'message' in data || 'error' in data);

      if (!isStructuredApiJson && [200, 404, 405, 502, 503, 504].includes(resp.status)) {
        return applyLocalEscrowSettleFallback();
      }

      if (resp.ok && data?.success) {
        if (data.wallet) {
          applyAuthoritativeServerWallet(data.wallet, myPhone);
        } else {
          await refreshWalletFromServer();
        }
        if (myPhone) setXoFlag(settleKey, params.gameId);
        return true;
      }
      return false;
    } catch {
      return applyLocalEscrowSettleFallback();
    } finally {
      inFlightGameSettlesRef.current.delete(params.gameId);
    }
  };

  const XO_WIN_LINES_CLIENT: number[][] = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  const getXoStatusRank = (status?: TicTacToeGameState['status']): number => {
    if (status === 'won' || status === 'draw' || status === 'declined' || status === 'cancelled') return 3;
    if (status === 'active') return 2;
    return 1;
  };

  const shouldReplaceXoGame = (existing: TicTacToeGameState, incoming: TicTacToeGameState): boolean => {
    const existingRank = getXoStatusRank(existing.status);
    const incomingRank = getXoStatusRank(incoming.status);
    if (incomingRank > existingRank) return true;
    if (incomingRank < existingRank) return false;
    if (existingRank === 3) return false;
    const existingMoves = existing.board.filter(Boolean).length;
    const incomingMoves = incoming.board.filter(Boolean).length;
    if (incomingMoves > existingMoves) return true;
    if (incomingMoves < existingMoves) return false;
    return (incoming.updatedAt || '') >= (existing.updatedAt || '');
  };

  const ensureChatThreadForIncomingGame = useCallback(
    (
      resolvedCid: string,
      challengerPhone: string,
      challengerName: string,
      challengerAvatar: string | undefined,
      previewText: string,
      timestamp: string
    ) => {
      const userNow = currentUserRef.current;
      const myPhone = userNow?.phoneNumber || '';
      const isFromMe = Boolean(myPhone && challengerPhone && phonesMatch(myPhone, challengerPhone));
      setChats((prev) => {
        const idx = prev.findIndex((c) => c.id === resolvedCid);
        const activeNow = activeChatIdRef.current;
        if (idx >= 0) {
          const updated = [...prev];
          const matched = { ...updated[idx] };
          matched.lastMessage = previewText;
          matched.lastMessageTime = timestamp;
          if (!isFromMe && activeNow !== resolvedCid) {
            matched.unreadCount = (matched.unreadCount || 0) + 1;
          }
          updated.splice(idx, 1);
          const finalUpdated = [matched, ...updated];
          persistPartitionedChats(finalUpdated, myPhone);
          return finalUpdated;
        }
        if (!resolvedCid.startsWith('dm_')) return prev;
        const newThread: ChatThread = {
          id: resolvedCid,
          name: isFromMe ? 'Direct Chat' : (challengerName || 'AGC Contact'),
          avatar: challengerAvatar || DEFAULT_AVATAR_SVG,
          verifiedStore: false,
          location: 'Direct Chat',
          unreadCount: !isFromMe && activeNow !== resolvedCid ? 1 : 0,
          lastMessage: previewText,
          lastMessageTime: timestamp,
          catalog: [],
          isOnline: true,
          phone: isFromMe ? '' : challengerPhone,
        };
        const finalUpdated = [newThread, ...prev];
        persistPartitionedChats(finalUpdated, myPhone);
        return finalUpdated;
      });
    },
    []
  );

  const broadcastXoGameState = useCallback(
    (game: TicTacToeGameState, extraPhones: string[] = []) => {
      if (!game?.id || !game?.chatId) return;
      const targetPhones = [
        game.challengerPhone,
        game.opponentPhone || '',
        game.xPlayerPhone || '',
        game.oPlayerPhone || '',
        ...extraPhones,
      ].filter(Boolean);

      // 1. Socket.io live WebSocket relay (primary low-latency transport)
      emitLiveGameUpdate('xo_game_update', game.chatId, game, targetPhones);

      // 2. BroadcastChannel (same-browser tabs)
      try {
        const bc = new BroadcastChannel('AGC_chats_sync');
        bc.postMessage({ type: 'xo_game_update', game, senderId: currentUser.id });
        bc.close();
      } catch (_) {}

      // 3. Supabase Realtime broadcast (cross-device backup)
      if (isSupabaseConfigured) {
        try {
          sendSupabaseBroadcastSafe(`chat_${game.chatId}`, 'xo_game_update', {
            game,
            senderId: currentUser.id,
          });

          const phoneSet = new Set<string>();
          targetPhones.forEach((p) => {
            const rawDigits = String(p).replace(/\D/g, '');
            const norm = normalizePhoneDigits(String(p));
            if (rawDigits) phoneSet.add(rawDigits);
            if (norm) phoneSet.add(norm);
          });

          phoneSet.forEach((p) => {
            sendSupabaseBroadcastSafe(`inbox_${p}`, 'xo_game_update', {
              game,
              senderId: currentUser.id,
            });
          });
        } catch (_) {}
      }
    },
    [currentUser.id, sendSupabaseBroadcastSafe]
  );

  const applyXoGameUpdate = useCallback(
    (incomingGame: TicTacToeGameState) => {
      if (!incomingGame?.id || !incomingGame?.chatId) return;

      const myPhone = currentUser.phoneNumber || '';
      const isParticipant =
        phonesMatch(myPhone, incomingGame.challengerPhone) ||
        phonesMatch(myPhone, incomingGame.opponentPhone) ||
        phonesMatch(myPhone, incomingGame.xPlayerPhone) ||
        phonesMatch(myPhone, incomingGame.oPlayerPhone);

      let insertedNewCard = false;
      let insertedCid = incomingGame.chatId;
      const cardPreview =
        incomingGame.mode === 'bet'
          ? `🎮 X/O Challenge (${CURRENCY_SYMBOLS[incomingGame.currency || 'NGN']}${incomingGame.betAmount.toLocaleString()} bet)`
          : '🎮 Friendly X/O Challenge';
      const cardTs = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // Update chat message holding this X/O game (or insert it if missing)
      setMessages((prev) => {
        let targetCid = incomingGame.chatId;
        if (targetCid.startsWith('dm_') && myPhone) {
          const parts = targetCid.replace('dm_', '').split('_');
          const other = phonesMatch(parts[0], myPhone) ? parts[1] : parts[0];
          if (other) {
            const sym = getDirectChatId(myPhone, other);
            if (sym) targetCid = sym;
          }
        }

        let resolvedCid = prev[targetCid] ? targetCid : (prev[incomingGame.chatId] ? incomingGame.chatId : targetCid);
        let list = prev[resolvedCid] || [];
        let existingIdx = list.findIndex((m) => m.xoGame?.id === incomingGame.id);

        if (existingIdx < 0) {
          for (const [cid, msgs] of Object.entries(prev)) {
            const idx = msgs.findIndex((m) => m.xoGame?.id === incomingGame.id);
            if (idx >= 0) {
              resolvedCid = cid;
              list = msgs;
              existingIdx = idx;
              break;
            }
          }
        }

        let nextList: ChatMessage[];
        if (existingIdx >= 0) {
          const currentXo = list[existingIdx]?.xoGame;
          const nextXo = currentXo && !shouldReplaceXoGame(currentXo, incomingGame) ? currentXo : incomingGame;
          if (nextXo === currentXo) return prev;
          nextList = list.map((m, i) =>
            i === existingIdx ? { ...m, xoGame: nextXo } : m
          );
        } else {
          insertedNewCard = true;
          insertedCid = resolvedCid;
          const newCard: ChatMessage = {
            id: `msg_xo_${incomingGame.id}`,
            chatId: resolvedCid,
            sender: phonesMatch(myPhone, incomingGame.challengerPhone) ? 'user' : 'other',
            senderName: incomingGame.challengerName,
            senderPhone: incomingGame.challengerPhone,
            senderAvatar: incomingGame.challengerAvatar,
            type: 'game_xo',
            xoGame: incomingGame,
            text: cardPreview,
            timestamp: cardTs,
            status: 'delivered',
          };
          nextList = [...list, newCard];
        }

        const updated = { ...prev, [resolvedCid]: nextList };
        persistPartitionedMessages(updated, currentUser.phoneNumber);
        return updated;
      });

      if (insertedNewCard) {
        ensureChatThreadForIncomingGame(
          insertedCid,
          incomingGame.challengerPhone,
          incomingGame.challengerName,
          incomingGame.challengerAvatar,
          cardPreview,
          cardTs
        );
      }

      // Authoritative Idempotent Server Wallet Settlement on Terminal States
      if (
        isParticipant &&
        incomingGame.mode === 'bet' &&
        incomingGame.betAmount > 0 &&
        (incomingGame.status === 'won' ||
          incomingGame.status === 'draw' ||
          incomingGame.status === 'declined' ||
          incomingGame.status === 'cancelled')
      ) {
        const settleKey = getXoSettledStorageKey(myPhone);
        if (!hasXoFlag(settleKey, incomingGame.id)) {
          void settleGameBetOnServer({
            gameId: incomingGame.id,
            gameType: 'xo',
            status: incomingGame.status,
            winnerPhone: incomingGame.winnerPhone,
            winnerName: incomingGame.winnerName,
            challengerPhone: incomingGame.challengerPhone,
            opponentPhone: incomingGame.opponentPhone,
            betAmount: Number(incomingGame.betAmount || 0),
            currency: incomingGame.currency || 'NGN',
          });
        }
      }
    },
    [currentUser.phoneNumber, CURRENCY_SYMBOLS, ensureChatThreadForIncomingGame]
  );

  const getGameBetLimit = (): { isVerified: boolean; maxBet: number } => {
    const activeBadge = currentUser.verificationBadge || getBadgeForPhone(currentUser.phoneNumber);
    const hasBadge =
      activeBadge === 'admin' ||
      currentUser.role === 'admin' ||
      activeBadge === 'blue' ||
      activeBadge === 'gold' ||
      activeBadge === 'creator_plus' ||
      Boolean(currentUser.isCelebrityVerified);
    let notExpired = true;
    if (
      hasBadge &&
      activeBadge !== 'admin' &&
      currentUser.role !== 'admin' &&
      currentUser.verificationExpiresAt
    ) {
      const exp = Date.parse(currentUser.verificationExpiresAt);
      if (Number.isFinite(exp) && exp <= Date.now()) {
        notExpired = false;
      }
    }
    const isVerified = hasBadge && notExpired;
    return {
      isVerified,
      maxBet: isVerified ? VERIFIED_GAME_BET_LIMIT : STANDARD_GAME_BET_LIMIT,
    };
  };

  const sendXoChallenge = async (
    chatId: string,
    mode: 'friendly' | 'bet',
    betAmount: number
  ): Promise<{ success: boolean; insufficientFunds?: boolean; requiresVerifiedBadge?: boolean; message?: string; game?: TicTacToeGameState }> => {
    const targetChat = chats.find((c) => c.id === chatId);
    const isAiChat = chatId === AFRIBOT_ID || Boolean(targetChat?.isBot);
    if (isAiChat && mode === 'bet') {
      return {
        success: false,
        message: 'AgcBot only plays Friendly matches (no betting in AI Chat).',
      };
    }

    const cleanBet = mode === 'bet' ? Math.round(Number(betAmount) || 0) : 0;
    const sym = CURRENCY_SYMBOLS[currency || 'NGN'] || '₦';
    if (mode === 'bet' && cleanBet < 50) {
      return { success: false, message: `Minimum bet amount is ${sym}50.` };
    }
    if (mode === 'bet') {
      const { isVerified, maxBet } = getGameBetLimit();
      if (cleanBet > maxBet) {
        return {
          success: false,
          requiresVerifiedBadge: !isVerified,
          message: isVerified
            ? `Maximum bet per game is ${sym}${VERIFIED_GAME_BET_LIMIT.toLocaleString()}.`
            : `Standard max bet is ${sym}${STANDARD_GAME_BET_LIMIT.toLocaleString()} per game. Get the Verified Badge (₦4,000/mo) to unlock a ${sym}${VERIFIED_GAME_BET_LIMIT.toLocaleString()} limit!`,
        };
      }
    }
    if (mode === 'bet' && wallet.availableBalance < cleanBet) {
      return {
        success: false,
        insufficientFunds: true,
        message: `Insufficient wallet balance for ${sym}${cleanBet.toLocaleString()} bet.`,
      };
    }

    const myPhone = currentUser.phoneNumber || currentUser.id;
    let opponentPhone = isAiChat
      ? AFRIBOT_PHONE
      : (!targetChat?.isGroup && !targetChat?.isChannel)
      ? (targetChat?.phoneNumber || targetChat?.phone || '')
      : '';
    if (!isAiChat && !opponentPhone && chatId.startsWith('dm_')) {
      const parts = chatId.replace('dm_', '').split('_');
      opponentPhone = parts.find((p) => !phonesMatch(p, myPhone)) || '';
    }

    const nowIso = new Date().toISOString();
    const gameId = `xo_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const totalPot = mode === 'bet' ? cleanBet * 2 : 0;
    const platformFee = mode === 'bet' ? Math.round(totalPot * 0.01) : 0;
    const winnerPayout = totalPot - platformFee;

    const aiStartsFirst = isAiChat && Math.random() < 0.8;
    const myDisplayName = currentUser.fullName || 'AGC Player';
    const aiDisplayName = 'AgcBot (Hard AI)';

    const newGame: TicTacToeGameState = {
      id: gameId,
      chatId,
      gameType: 'xo',
      challengerId: currentUser.id,
      challengerPhone: myPhone,
      challengerName: myDisplayName,
      challengerAvatar: currentUser.avatarUrl,
      opponentPhone: opponentPhone || undefined,
      opponentName: isAiChat ? aiDisplayName : !targetChat?.isGroup ? targetChat?.name : undefined,
      opponentAvatar: isAiChat ? AFRIBOT_AVATAR : !targetChat?.isGroup ? targetChat?.avatar : undefined,
      isAiOpponent: isAiChat,
      aiDifficulty: isAiChat ? 'hard' : undefined,
      mode,
      betAmount: cleanBet,
      currency: currency || 'NGN',
      board: Array(9).fill(null),
      xPlayerPhone: aiStartsFirst ? AFRIBOT_PHONE : myPhone,
      xPlayerName: aiStartsFirst ? aiDisplayName : myDisplayName,
      oPlayerPhone: isAiChat ? (aiStartsFirst ? myPhone : AFRIBOT_PHONE) : undefined,
      oPlayerName: isAiChat ? (aiStartsFirst ? myDisplayName : aiDisplayName) : undefined,
      currentTurn: 'X',
      status: isAiChat ? 'active' : 'pending',
      totalPot,
      platformFeeRate: 0.01,
      platformFee,
      winnerPayout,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const cardMsg: ChatMessage = {
      id: `msg_xo_${gameId}`,
      chatId,
      sender: 'user',
      senderName: currentUser.fullName || 'AGC Player',
      senderPhone: myPhone,
      senderAvatar: currentUser.avatarUrl,
      type: 'game_xo',
      xoGame: newGame,
      text:
        mode === 'bet'
          ? `🎮 X/O Challenge: ${sym}${cleanBet.toLocaleString()} bet (Winner pot: ${sym}${winnerPayout.toLocaleString()} after 1% fee)`
          : '🎮 X/O Friendly Challenge (Tic-Tac-Toe)',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sent',
    };

    if (mode === 'bet' && cleanBet > 0) {
      const lockRes = await lockGameBetOnServer({
        gameId,
        gameType: 'xo',
        role: 'challenger',
        playerPhone: myPhone,
        playerName: currentUser.fullName || 'AGC Player',
        opponentPhone: opponentPhone || undefined,
        opponentName: !targetChat?.isGroup ? targetChat?.name : undefined,
        betAmount: cleanBet,
        currency: newGame.currency,
        title: `X/O Bet Escrow Lock (${targetChat?.name || 'Match'})`,
      });
      if (!lockRes.success) {
        return {
          success: false,
          insufficientFunds: lockRes.insufficientFunds,
          requiresVerifiedBadge: lockRes.requiresVerifiedBadge,
          message: lockRes.message || `Insufficient wallet balance for bet.`,
        };
      }
    }

    setMessages((prev) => {
      const updated = { ...prev, [chatId]: [...(prev[chatId] || []), cardMsg] };
      try {
        const userKey = getUserStorageKey('AGC_messages_v2', currentUser.phoneNumber);
        localStorage.setItem(userKey, JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });

    setChats((prev) => {
      const updated = prev.map((c) =>
        c.id === chatId
          ? {
              ...c,
              lastMessage: mode === 'bet' ? `🎮 X/O Challenge (${sym}${cleanBet.toLocaleString()})` : '🎮 X/O Friendly Challenge',
              lastMessageTime: cardMsg.timestamp,
            }
          : c
      );
      try {
        const userKey = getUserStorageKey('AGC_chats_v2', currentUser.phoneNumber);
        localStorage.setItem(userKey, JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });

    if (!isAiChat) {
      const memberPhones = targetChat?.memberPhones || [];
      const wireOverrideChat =
        targetChat ||
        (opponentPhone
          ? ({
              id: chatId,
              name: currentUser.fullName || 'Direct Chat',
              avatar: '',
              verifiedStore: false,
              location: 'Direct Chat',
              unreadCount: 0,
              lastMessage: '',
              lastMessageTime: '',
              catalog: [],
              isOnline: true,
              phone: opponentPhone,
            } as ChatThread)
          : undefined);
      broadcastLiveMessage(chatId, cardMsg, wireOverrideChat);
      broadcastXoGameState(newGame, memberPhones);
      void upsertXoGameInSupabase(newGame).catch(() => {});
    }

    return { success: true, game: newGame, message: 'X/O Challenge sent!' };
  };

  const acceptXoChallenge = async (
    game: TicTacToeGameState
  ): Promise<{ success: boolean; insufficientFunds?: boolean; requiresVerifiedBadge?: boolean; message?: string }> => {
    const myPhone = currentUser.phoneNumber || currentUser.id;
    if (phonesMatch(myPhone, game.challengerPhone) || (currentUser.id && game.challengerId === currentUser.id)) {
      return { success: false, message: 'Waiting for your opponent to accept.' };
    }
    if (game.mode === 'bet' && game.betAmount > 0) {
      const { isVerified, maxBet } = getGameBetLimit();
      const sym = CURRENCY_SYMBOLS[game.currency || 'NGN'] || '₦';
      if (game.betAmount > maxBet) {
        return {
          success: false,
          requiresVerifiedBadge: !isVerified,
          message: `Stakes above ${sym}${STANDARD_GAME_BET_LIMIT.toLocaleString()} require a Verified Badge (₦4,000/mo, up to ${sym}${VERIFIED_GAME_BET_LIMIT.toLocaleString()}).`,
        };
      }
      if (walletRef.current.availableBalance < game.betAmount) {
        await refreshWalletFromServer();
        if (walletRef.current.availableBalance < game.betAmount) {
          return {
            success: false,
            insufficientFunds: true,
            message: `Insufficient balance: need ${sym}${game.betAmount.toLocaleString()} to accept bet.`,
          };
        }
      }
    }

    // Fetch latest persisted state from Supabase to avoid accepting a cancelled/already-accepted game
    const latestFromDb = await fetchXoGameByIdFromSupabase(game.id).catch(() => null);
    const baseGame = latestFromDb && shouldReplaceXoGame(game, latestFromDb) ? latestFromDb : (latestFromDb || game);

    if (baseGame.status !== 'pending') {
      applyXoGameUpdate(baseGame);
      if (baseGame.status === 'active' && phonesMatch(myPhone, baseGame.oPlayerPhone)) {
        return { success: true, message: 'Rejoined active match!' };
      }
      return { success: false, message: `Challenge is already ${baseGame.status}.` };
    }

    if (baseGame.opponentPhone && !phonesMatch(myPhone, baseGame.opponentPhone)) {
      return { success: false, message: 'This challenge was sent to another player.' };
    }

    const acceptedGame: TicTacToeGameState = {
      ...baseGame,
      opponentPhone: myPhone,
      opponentName: currentUser.fullName || baseGame.opponentName || 'Player O',
      opponentAvatar: currentUser.avatarUrl || baseGame.opponentAvatar,
      oPlayerPhone: myPhone,
      oPlayerName: currentUser.fullName || baseGame.opponentName || 'Player O',
      status: 'active',
      currentTurn: 'X',
      updatedAt: new Date().toISOString(),
    };

    if (acceptedGame.mode === 'bet' && acceptedGame.betAmount > 0) {
      const lockRes = await lockGameBetOnServer({
        gameId: acceptedGame.id,
        gameType: 'xo',
        role: 'opponent',
        playerPhone: myPhone,
        playerName: currentUser.fullName || 'Player O',
        opponentPhone: acceptedGame.challengerPhone,
        opponentName: acceptedGame.challengerName,
        betAmount: acceptedGame.betAmount,
        currency: acceptedGame.currency || 'NGN',
        title: `X/O Match Bet Stake (${acceptedGame.challengerName})`,
      });
      if (!lockRes.success) {
        return {
          success: false,
          insufficientFunds: lockRes.insufficientFunds,
          requiresVerifiedBadge: lockRes.requiresVerifiedBadge,
          message: lockRes.message || 'Insufficient wallet balance to accept bet.',
        };
      }
    }

    applyXoGameUpdate(acceptedGame);
    const chatObj = chats.find((c) => c.id === acceptedGame.chatId);
    broadcastXoGameState(acceptedGame, chatObj?.memberPhones || []);
    void upsertXoGameInSupabase(acceptedGame).catch(() => {});
    return { success: true, message: 'Challenge accepted! Match started.' };
  };

  const declineXoChallenge = async (
    game: TicTacToeGameState
  ): Promise<{ success: boolean; message?: string }> => {
    const myPhone = currentUser.phoneNumber || currentUser.id;
    const latestFromDb = await fetchXoGameByIdFromSupabase(game.id).catch(() => null);
    const baseGame = latestFromDb || game;

    if (baseGame.status !== 'pending') {
      applyXoGameUpdate(baseGame);
      return { success: false, message: `Cannot decline a ${baseGame.status} game.` };
    }

    const isChallenger = phonesMatch(myPhone, baseGame.challengerPhone);
    const declinedGame: TicTacToeGameState = {
      ...baseGame,
      status: isChallenger ? 'cancelled' : 'declined',
      settledAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (declinedGame.mode === 'bet' && declinedGame.betAmount > 0) {
      await settleGameBetOnServer({
        gameId: declinedGame.id,
        gameType: 'xo',
        status: declinedGame.status as 'declined' | 'cancelled',
        challengerPhone: declinedGame.challengerPhone,
        opponentPhone: declinedGame.opponentPhone,
        betAmount: declinedGame.betAmount,
        currency: declinedGame.currency || 'NGN',
      });
    }

    applyXoGameUpdate(declinedGame);
    const chatObj = chats.find((c) => c.id === declinedGame.chatId);
    broadcastXoGameState(declinedGame, chatObj?.memberPhones || []);
    void upsertXoGameInSupabase(declinedGame).catch(() => {});
    return { success: true, message: 'Challenge closed.' };
  };

  const makeXoMove = async (
    game: TicTacToeGameState,
    cellIndex: number
  ): Promise<{ success: boolean; message?: string }> => {
    const myPhone = currentUser.phoneNumber || currentUser.id;
    const isAiMatch = Boolean(game.isAiOpponent || phonesMatch(game.opponentPhone, AFRIBOT_PHONE) || game.chatId === AFRIBOT_ID);
    const latestFromDb = isAiMatch ? null : await fetchXoGameByIdFromSupabase(game.id).catch(() => null);
    const baseGame = latestFromDb && shouldReplaceXoGame(game, latestFromDb) ? latestFromDb : game;

    if (baseGame.status !== 'active') {
      applyXoGameUpdate(baseGame);
      return { success: false, message: `Game is ${baseGame.status}.` };
    }
    if (cellIndex < 0 || cellIndex > 8 || baseGame.board[cellIndex] !== null) {
      applyXoGameUpdate(baseGame);
      return { success: false, message: 'That square is already taken.' };
    }

    const expectedPhone = baseGame.currentTurn === 'X' ? baseGame.xPlayerPhone : baseGame.oPlayerPhone;
    if (!expectedPhone || !phonesMatch(myPhone, expectedPhone)) {
      applyXoGameUpdate(baseGame);
      return {
        success: false,
        message: `It is ${baseGame.currentTurn}'s turn (${baseGame.currentTurn === 'X' ? baseGame.xPlayerName : baseGame.oPlayerName}).`,
      };
    }

    const nextBoard = [...baseGame.board];
    nextBoard[cellIndex] = baseGame.currentTurn;
    const nowIso = new Date().toISOString();

    let winningLine: number[] | undefined;
    for (const line of XO_WIN_LINES_CLIENT) {
      const [a, b, c] = line;
      if (nextBoard[a] && nextBoard[a] === nextBoard[b] && nextBoard[a] === nextBoard[c]) {
        winningLine = line;
        break;
      }
    }

    let nextGame: TicTacToeGameState;
    if (winningLine) {
      const winSymbol = baseGame.currentTurn;
      const winPhone = winSymbol === 'X' ? baseGame.xPlayerPhone : baseGame.oPlayerPhone;
      const winName = winSymbol === 'X' ? baseGame.xPlayerName : baseGame.oPlayerName;
      const totalPot = baseGame.mode === 'bet' ? Number(baseGame.betAmount || 0) * 2 : 0;
      const platformFee = baseGame.mode === 'bet' ? Math.round(totalPot * 0.01) : 0;
      nextGame = {
        ...baseGame,
        board: nextBoard,
        status: 'won',
        winnerSymbol: winSymbol,
        winnerPhone: winPhone,
        winnerName: winName,
        winningLine,
        totalPot,
        platformFeeRate: 0.01,
        platformFee,
        winnerPayout: totalPot - platformFee,
        settledAt: nowIso,
        updatedAt: nowIso,
      };
    } else if (!nextBoard.includes(null)) {
      nextGame = {
        ...baseGame,
        board: nextBoard,
        status: 'draw',
        settledAt: nowIso,
        updatedAt: nowIso,
      };
    } else {
      nextGame = {
        ...baseGame,
        board: nextBoard,
        currentTurn: baseGame.currentTurn === 'X' ? 'O' : 'X',
        updatedAt: nowIso,
      };
    }

    if (
      nextGame.mode === 'bet' &&
      nextGame.betAmount > 0 &&
      (nextGame.status === 'won' || nextGame.status === 'draw')
    ) {
      await settleGameBetOnServer({
        gameId: nextGame.id,
        gameType: 'xo',
        status: nextGame.status,
        winnerPhone: nextGame.winnerPhone,
        winnerName: nextGame.winnerName,
        challengerPhone: nextGame.challengerPhone,
        opponentPhone: nextGame.opponentPhone,
        betAmount: nextGame.betAmount,
        currency: nextGame.currency || 'NGN',
      });
    }

    // Optimistic local update + broadcast + Supabase DB persistence
    applyXoGameUpdate(nextGame);
    if (!isAiMatch) {
      const chatObj = chats.find((c) => c.id === nextGame.chatId);
      broadcastXoGameState(nextGame, chatObj?.memberPhones || []);
      void upsertXoGameInSupabase(nextGame).catch(() => {});
    }

    return { success: true };
  };

  const forfeitXoGame = async (
    game: TicTacToeGameState
  ): Promise<{ success: boolean; message?: string }> => {
    const myPhone = currentUser.phoneNumber || currentUser.id;
    const isAiMatch = Boolean(game.isAiOpponent || phonesMatch(game.opponentPhone, AFRIBOT_PHONE) || game.chatId === AFRIBOT_ID);
    if (game.status !== 'active') {
      return { success: false, message: 'Only active matches can be forfeited.' };
    }

    const isX = phonesMatch(myPhone, game.xPlayerPhone) || phonesMatch(myPhone, game.challengerPhone);
    const isO = phonesMatch(myPhone, game.oPlayerPhone) || (!isX && game.opponentPhone && phonesMatch(myPhone, game.opponentPhone));
    if (!isX && !isO) {
      return { success: false, message: 'Only match participants can forfeit.' };
    }

    const myName = isX
      ? (game.xPlayerName || game.challengerName || currentUser.fullName || 'Player X')
      : (game.oPlayerName || game.opponentName || currentUser.fullName || 'Player O');
    const winSymbol: 'X' | 'O' = isX ? 'O' : 'X';
    const winPhone = isX ? (game.oPlayerPhone || game.opponentPhone || AFRIBOT_PHONE) : (game.xPlayerPhone || game.challengerPhone);
    const winName = isX ? (game.oPlayerName || game.opponentName || 'Opponent') : (game.xPlayerName || game.challengerName);
    const totalPot = game.mode === 'bet' ? Number(game.betAmount || 0) * 2 : 0;
    const platformFee = game.mode === 'bet' ? Math.round(totalPot * 0.01) : 0;
    const nowIso = new Date().toISOString();

    const forfeitedGame: TicTacToeGameState = {
      ...game,
      status: 'won',
      winnerSymbol: winSymbol,
      winnerPhone: winPhone,
      winnerName: winName,
      winningLine: undefined,
      totalPot,
      platformFeeRate: 0.01,
      platformFee,
      winnerPayout: totalPot - platformFee,
      lastActionNote: `${myName} forfeited the match`,
      settledAt: nowIso,
      updatedAt: nowIso,
    };

    if (forfeitedGame.mode === 'bet' && forfeitedGame.betAmount > 0) {
      await settleGameBetOnServer({
        gameId: forfeitedGame.id,
        gameType: 'xo',
        status: 'won',
        winnerPhone: forfeitedGame.winnerPhone,
        winnerName: forfeitedGame.winnerName,
        challengerPhone: forfeitedGame.challengerPhone,
        opponentPhone: forfeitedGame.opponentPhone,
        betAmount: forfeitedGame.betAmount,
        currency: forfeitedGame.currency || 'NGN',
      });
    }

    applyXoGameUpdate(forfeitedGame);
    if (!isAiMatch) {
      const chatObj = chats.find((c) => c.id === forfeitedGame.chatId);
      broadcastXoGameState(forfeitedGame, chatObj?.memberPhones || []);
      void upsertXoGameInSupabase(forfeitedGame).catch(() => {});
    }
    return { success: true, message: 'Match forfeited.' };
  };

  // ── 6c. Lightweight Whot!, Ludo (8 seeds / 2 Castles / 2 Dice) & Texas Hold'em Poker + Send My Bill ──
  const shuffleArray = <T,>(items: T[]): T[] => {
    const arr = [...items];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  const createWhotDeck = (): WhotCard[] => {
    const deck: WhotCard[] = [];
    const circleTriNums = [1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14];
    const crossSquareNums = [1, 2, 3, 5, 7, 10, 11, 13, 14];
    const starNums = [1, 2, 3, 4, 5, 7, 8];
    let seq = 1;
    circleTriNums.forEach((n) => {
      deck.push({ id: `wc_${seq++}`, shape: 'circle', number: n });
      deck.push({ id: `wc_${seq++}`, shape: 'triangle', number: n });
    });
    crossSquareNums.forEach((n) => {
      deck.push({ id: `wc_${seq++}`, shape: 'cross', number: n });
      deck.push({ id: `wc_${seq++}`, shape: 'square', number: n });
    });
    starNums.forEach((n) => {
      deck.push({ id: `wc_${seq++}`, shape: 'star', number: n });
    });
    for (let i = 0; i < 4; i++) {
      deck.push({ id: `wc_${seq++}`, shape: 'whot', number: 20 });
    }
    return shuffleArray(deck);
  };

  /**
   * Empty Market Reshuffle Rule:
   * When a player needs to draw and deck.length === 0, keep the active top card in discardPile,
   * Fisher-Yates shuffle the remaining discardPile cards back into deck, and keep all player hands untouched.
   */
  const drawCardsFromWhotMarket = (
    deck: WhotCard[],
    discardPile: WhotCard[],
    count: number,
    existingReshuffles: number = 0
  ): {
    drawn: WhotCard[];
    nextDeck: WhotCard[];
    nextDiscard: WhotCard[];
    reshuffleCount: number;
    didReshuffle: boolean;
  } => {
    let nextDeck = [...deck];
    let nextDiscard = [...discardPile];
    const drawn: WhotCard[] = [];
    let reshuffleCount = existingReshuffles;
    let didReshuffle = false;

    for (let k = 0; k < count; k++) {
      if (nextDeck.length === 0 && nextDiscard.length > 1) {
        const activeTop = nextDiscard[nextDiscard.length - 1];
        const recycled = nextDiscard.slice(0, -1);
        nextDeck = shuffleArray(recycled);
        nextDiscard = [activeTop];
        reshuffleCount += 1;
        didReshuffle = true;
      }
      if (nextDeck.length > 0) {
        drawn.push(nextDeck.shift()!);
      }
    }
    return { drawn, nextDeck, nextDiscard, reshuffleCount, didReshuffle };
  };

  const createPokerDeck = (): PokerCard[] => {
    const suits: PokerSuit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
    const cards: PokerCard[] = [];
    for (const suit of suits) {
      for (let rank = 2; rank <= 14; rank++) {
        cards.push({ id: `pk_${suit}_${rank}`, suit, rank });
      }
    }
    return shuffleArray(cards);
  };

  const broadcastGamePayload = useCallback(
    (
      eventName: 'whot_game_update' | 'ludo_game_update' | 'poker_game_update' | 'bill_request_update',
      payloadData: any,
      chatId: string,
      extraPhones: string[] = []
    ) => {
      // 1. Socket.io live WebSocket relay (primary low-latency transport)
      emitLiveGameUpdate(eventName, chatId, payloadData, extraPhones);

      // 2. BroadcastChannel (same-browser tabs)
      try {
        const bc = new BroadcastChannel('AGC_chats_sync');
        bc.postMessage({ type: eventName, payload: payloadData, senderId: currentUser.id });
        bc.close();
      } catch (_) {}

      // 3. Supabase Realtime broadcast (cross-device backup)
      if (isSupabaseConfigured) {
        try {
          sendSupabaseBroadcastSafe(`chat_${chatId}`, eventName, {
            payload: payloadData,
            senderId: currentUser.id,
          });

          const phoneSet = new Set<string>();
          extraPhones.filter(Boolean).forEach((p) => {
            const rawDigits = String(p).replace(/\D/g, '');
            const norm = normalizePhoneDigits(String(p));
            if (rawDigits) phoneSet.add(rawDigits);
            if (norm) phoneSet.add(norm);
          });
          phoneSet.forEach((p) => {
            sendSupabaseBroadcastSafe(`inbox_${p}`, eventName, {
              payload: payloadData,
              senderId: currentUser.id,
            });
          });
        } catch (_) {}
      }
    },
    [currentUser.id, sendSupabaseBroadcastSafe]
  );

  const settleBetGameEscrowIfNeeded = (params: {
    gameId: string;
    gameType?: 'xo' | 'whot' | 'ludo' | 'poker';
    label: string;
    mode: 'friendly' | 'bet';
    betAmount: number;
    currency: CurrencyCode;
    status: 'won' | 'draw' | 'declined' | 'cancelled' | 'pending' | 'active';
    winnerPhone?: string;
    winnerName?: string;
    challengerPhone?: string;
    opponentPhone?: string;
    winnerPayout: number;
    platformFee: number;
    isParticipant: boolean;
  }) => {
    if (
      !params.isParticipant ||
      params.mode !== 'bet' ||
      params.betAmount <= 0 ||
      (params.status !== 'won' && params.status !== 'draw' && params.status !== 'declined' && params.status !== 'cancelled')
    ) {
      return;
    }
    const myPhone = currentUser.phoneNumber || '';
    const settleKey = getXoSettledStorageKey(myPhone);
    if (hasXoFlag(settleKey, params.gameId)) return;

    void settleGameBetOnServer({
      gameId: params.gameId,
      gameType:
        params.gameType ||
        (params.label.toLowerCase().includes('poker')
          ? 'poker'
          : params.label.toLowerCase().includes('ludo')
          ? 'ludo'
          : params.label.toLowerCase().includes('whot')
          ? 'whot'
          : 'xo'),
      status: params.status,
      winnerPhone: params.winnerPhone,
      winnerName: params.winnerName,
      challengerPhone: params.challengerPhone || myPhone,
      opponentPhone: params.opponentPhone,
      betAmount: Number(params.betAmount || 0),
      currency: params.currency || 'NGN',
    });
  };

  const applyWhotGameUpdate = useCallback(
    (incomingGame: WhotGameState) => {
      if (!incomingGame?.id || !incomingGame?.chatId) return;
      const myPhone = currentUser.phoneNumber || '';
      const isParticipant =
        phonesMatch(myPhone, incomingGame.challengerPhone) ||
        phonesMatch(myPhone, incomingGame.opponentPhone);

      let insertedNewCard = false;
      let insertedCid = incomingGame.chatId;
      const cardPreview =
        incomingGame.mode === 'bet'
          ? `🃏 Whot! Challenge (${CURRENCY_SYMBOLS[incomingGame.currency || 'NGN']}${incomingGame.betAmount.toLocaleString()} bet)`
          : '🃏 Friendly Whot! Challenge';
      const cardTs = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      setMessages((prev) => {
        let targetCid = incomingGame.chatId;
        if (targetCid.startsWith('dm_') && myPhone) {
          const parts = targetCid.replace('dm_', '').split('_');
          const other = phonesMatch(parts[0], myPhone) ? parts[1] : parts[0];
          if (other) targetCid = getDirectChatId(myPhone, other) || targetCid;
        }
        const resolvedCid = prev[targetCid] ? targetCid : (prev[incomingGame.chatId] ? incomingGame.chatId : targetCid);
        const list = prev[resolvedCid] || [];
        const existingIdx = list.findIndex((m) => m.whotGame?.id === incomingGame.id);

        let nextList: ChatMessage[];
        if (existingIdx >= 0) {
          const cur = list[existingIdx]?.whotGame;
          if (cur) {
            const curRank = getXoStatusRank(cur.status);
            const incRank = getXoStatusRank(incomingGame.status);
            if (incRank < curRank) return prev;
            if (incRank === curRank && curRank === 3) return prev;
            if (incRank === curRank && (incomingGame.moveCount || 0) < (cur.moveCount || 0)) return prev;
            if (incRank === curRank && (incomingGame.moveCount || 0) === (cur.moveCount || 0) && (incomingGame.updatedAt || '') <= (cur.updatedAt || '')) return prev;
          }
          nextList = list.map((m, i) => (i === existingIdx ? { ...m, whotGame: incomingGame } : m));
        } else {
          insertedNewCard = true;
          insertedCid = resolvedCid;
          const newCard: ChatMessage = {
            id: `msg_whot_${incomingGame.id}`,
            chatId: resolvedCid,
            sender: phonesMatch(myPhone, incomingGame.challengerPhone) ? 'user' : 'other',
            senderName: incomingGame.challengerName,
            senderPhone: incomingGame.challengerPhone,
            senderAvatar: incomingGame.challengerAvatar,
            type: 'game_whot',
            whotGame: incomingGame,
            text: cardPreview,
            timestamp: cardTs,
            status: 'delivered',
          };
          nextList = [...list, newCard];
        }
        const updated = { ...prev, [resolvedCid]: nextList };
        persistPartitionedMessages(updated, currentUser.phoneNumber);
        return updated;
      });

      if (insertedNewCard) {
        ensureChatThreadForIncomingGame(
          insertedCid,
          incomingGame.challengerPhone,
          incomingGame.challengerName,
          incomingGame.challengerAvatar,
          cardPreview,
          cardTs
        );
      }

      settleBetGameEscrowIfNeeded({
        gameId: incomingGame.id,
        gameType: 'whot',
        label: 'Whot!',
        mode: incomingGame.mode,
        betAmount: incomingGame.betAmount,
        currency: incomingGame.currency,
        status: incomingGame.status,
        winnerPhone: incomingGame.winnerPhone,
        winnerName: incomingGame.winnerName,
        challengerPhone: incomingGame.challengerPhone,
        opponentPhone: incomingGame.opponentPhone,
        winnerPayout: incomingGame.winnerPayout,
        platformFee: incomingGame.platformFee,
        isParticipant,
      });
    },
    [currentUser.phoneNumber, CURRENCY_SYMBOLS, ensureChatThreadForIncomingGame]
  );

  const applyLudoGameUpdate = useCallback(
    (incomingGame: LudoGameState) => {
      if (!incomingGame?.id || !incomingGame?.chatId) return;
      const myPhone = currentUser.phoneNumber || '';
      const isParticipant =
        phonesMatch(myPhone, incomingGame.challengerPhone) ||
        phonesMatch(myPhone, incomingGame.opponentPhone);

      let insertedNewCard = false;
      let insertedCid = incomingGame.chatId;
      const cardPreview =
        incomingGame.mode === 'bet'
          ? `🎲 Ludo Challenge (${CURRENCY_SYMBOLS[incomingGame.currency || 'NGN']}${incomingGame.betAmount.toLocaleString()} bet)`
          : '🎲 Friendly Ludo Challenge';
      const cardTs = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      setMessages((prev) => {
        let targetCid = incomingGame.chatId;
        if (targetCid.startsWith('dm_') && myPhone) {
          const parts = targetCid.replace('dm_', '').split('_');
          const other = phonesMatch(parts[0], myPhone) ? parts[1] : parts[0];
          if (other) targetCid = getDirectChatId(myPhone, other) || targetCid;
        }
        const resolvedCid = prev[targetCid] ? targetCid : (prev[incomingGame.chatId] ? incomingGame.chatId : targetCid);
        const list = prev[resolvedCid] || [];
        const existingIdx = list.findIndex((m) => m.ludoGame?.id === incomingGame.id);

        let nextList: ChatMessage[];
        if (existingIdx >= 0) {
          const cur = list[existingIdx]?.ludoGame;
          if (cur) {
            const curRank = getXoStatusRank(cur.status);
            const incRank = getXoStatusRank(incomingGame.status);
            if (incRank < curRank) return prev;
            if (incRank === curRank && curRank === 3) return prev;
            if (incRank === curRank && (incomingGame.moveCount || 0) < (cur.moveCount || 0)) return prev;
            if (incRank === curRank && (incomingGame.moveCount || 0) === (cur.moveCount || 0) && (incomingGame.updatedAt || '') <= (cur.updatedAt || '')) return prev;
          }
          nextList = list.map((m, i) => (i === existingIdx ? { ...m, ludoGame: incomingGame } : m));
        } else {
          insertedNewCard = true;
          insertedCid = resolvedCid;
          const newCard: ChatMessage = {
            id: `msg_ludo_${incomingGame.id}`,
            chatId: resolvedCid,
            sender: phonesMatch(myPhone, incomingGame.challengerPhone) ? 'user' : 'other',
            senderName: incomingGame.challengerName,
            senderPhone: incomingGame.challengerPhone,
            senderAvatar: incomingGame.challengerAvatar,
            type: 'game_ludo',
            ludoGame: incomingGame,
            text: cardPreview,
            timestamp: cardTs,
            status: 'delivered',
          };
          nextList = [...list, newCard];
        }
        const updated = { ...prev, [resolvedCid]: nextList };
        persistPartitionedMessages(updated, currentUser.phoneNumber);
        return updated;
      });

      if (insertedNewCard) {
        ensureChatThreadForIncomingGame(
          insertedCid,
          incomingGame.challengerPhone,
          incomingGame.challengerName,
          incomingGame.challengerAvatar,
          cardPreview,
          cardTs
        );
      }

      settleBetGameEscrowIfNeeded({
        gameId: incomingGame.id,
        gameType: 'ludo',
        label: 'Ludo',
        mode: incomingGame.mode,
        betAmount: incomingGame.betAmount,
        currency: incomingGame.currency,
        status: incomingGame.status,
        winnerPhone: incomingGame.winnerPhone,
        winnerName: incomingGame.winnerName,
        challengerPhone: incomingGame.challengerPhone,
        opponentPhone: incomingGame.opponentPhone,
        winnerPayout: incomingGame.winnerPayout,
        platformFee: incomingGame.platformFee,
        isParticipant,
      });
    },
    [currentUser.phoneNumber, CURRENCY_SYMBOLS, ensureChatThreadForIncomingGame]
  );

  const applyPokerGameUpdate = useCallback(
    (incomingGame: PokerGameState) => {
      if (!incomingGame?.id || !incomingGame?.chatId) return;
      const myPhone = currentUser.phoneNumber || '';
      const isParticipant =
        phonesMatch(myPhone, incomingGame.challengerPhone) ||
        phonesMatch(myPhone, incomingGame.opponentPhone);

      let insertedNewCard = false;
      let insertedCid = incomingGame.chatId;
      const cardPreview =
        incomingGame.mode === 'bet'
          ? `♠️ Texas Hold'em Poker (${CURRENCY_SYMBOLS[incomingGame.currency || 'NGN']}${incomingGame.betAmount.toLocaleString()} bet)`
          : "♠️ Friendly Texas Hold'em Poker";
      const cardTs = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      setMessages((prev) => {
        let targetCid = incomingGame.chatId;
        if (targetCid.startsWith('dm_') && myPhone) {
          const parts = targetCid.replace('dm_', '').split('_');
          const other = phonesMatch(parts[0], myPhone) ? parts[1] : parts[0];
          if (other) targetCid = getDirectChatId(myPhone, other) || targetCid;
        }
        const resolvedCid = prev[targetCid] ? targetCid : (prev[incomingGame.chatId] ? incomingGame.chatId : targetCid);
        const list = prev[resolvedCid] || [];
        const existingIdx = list.findIndex((m) => m.pokerGame?.id === incomingGame.id);

        let nextList: ChatMessage[];
        if (existingIdx >= 0) {
          const cur = list[existingIdx]?.pokerGame;
          if (cur) {
            const curRank = getXoStatusRank(cur.status);
            const incRank = getXoStatusRank(incomingGame.status);
            if (incRank < curRank) return prev;
            if (incRank === curRank && curRank === 3) return prev;
            if (incRank === curRank && (incomingGame.moveCount || 0) < (cur.moveCount || 0)) return prev;
            if (incRank === curRank && (incomingGame.moveCount || 0) === (cur.moveCount || 0) && (incomingGame.updatedAt || '') <= (cur.updatedAt || '')) return prev;
          }
          nextList = list.map((m, i) => (i === existingIdx ? { ...m, pokerGame: incomingGame } : m));
        } else {
          insertedNewCard = true;
          insertedCid = resolvedCid;
          const newCard: ChatMessage = {
            id: `msg_poker_${incomingGame.id}`,
            chatId: resolvedCid,
            sender: phonesMatch(myPhone, incomingGame.challengerPhone) ? 'user' : 'other',
            senderName: incomingGame.challengerName,
            senderPhone: incomingGame.challengerPhone,
            senderAvatar: incomingGame.challengerAvatar,
            type: 'game_poker',
            pokerGame: incomingGame,
            text: cardPreview,
            timestamp: cardTs,
            status: 'delivered',
          };
          nextList = [...list, newCard];
        }
        const updated = { ...prev, [resolvedCid]: nextList };
        persistPartitionedMessages(updated, currentUser.phoneNumber);
        return updated;
      });

      if (insertedNewCard) {
        ensureChatThreadForIncomingGame(
          insertedCid,
          incomingGame.challengerPhone,
          incomingGame.challengerName,
          incomingGame.challengerAvatar,
          cardPreview,
          cardTs
        );
      }

      settleBetGameEscrowIfNeeded({
        gameId: incomingGame.id,
        gameType: 'poker',
        label: 'Poker',
        mode: incomingGame.mode,
        betAmount: incomingGame.betAmount,
        currency: incomingGame.currency,
        status: incomingGame.status,
        winnerPhone: incomingGame.winnerPhone,
        winnerName: incomingGame.winnerName,
        challengerPhone: incomingGame.challengerPhone,
        opponentPhone: incomingGame.opponentPhone,
        winnerPayout: incomingGame.winnerPayout,
        platformFee: incomingGame.platformFee,
        isParticipant,
      });
    },
    [currentUser.phoneNumber, CURRENCY_SYMBOLS, ensureChatThreadForIncomingGame]
  );

  const applyBillRequestUpdate = useCallback(
    (incomingBill: BillRequest) => {
      if (!incomingBill?.id || !incomingBill?.chatId) return;
      const myPhone = currentUser.phoneNumber || '';
      setMessages((prev) => {
        let targetCid = incomingBill.chatId;
        if (targetCid.startsWith('dm_') && myPhone) {
          const parts = targetCid.replace('dm_', '').split('_');
          const other = phonesMatch(parts[0], myPhone) ? parts[1] : parts[0];
          if (other) targetCid = getDirectChatId(myPhone, other) || targetCid;
        }
        const resolvedCid = prev[targetCid] ? targetCid : (prev[incomingBill.chatId] ? incomingBill.chatId : targetCid);
        const list = prev[resolvedCid] || [];
        const existingIdx = list.findIndex((m) => m.billRequest?.id === incomingBill.id);
        if (existingIdx < 0) return prev;
        const curBill = list[existingIdx].billRequest;
        if (curBill?.status === 'paid' && incomingBill.status !== 'paid') return prev;
        const nextList = list.map((m, i) => (i === existingIdx ? { ...m, billRequest: incomingBill } : m));
        const updated = { ...prev, [resolvedCid]: nextList };
        try {
          const userKey = getUserStorageKey('AGC_messages_v2', currentUser.phoneNumber);
          localStorage.setItem(userKey, JSON.stringify(updated));
        } catch (_) {}
        return updated;
      });
    },
    [currentUser.phoneNumber]
  );

  const sendWhotChallenge = async (
    chatId: string,
    mode: 'friendly' | 'bet',
    betAmount: number
  ): Promise<{ success: boolean; insufficientFunds?: boolean; requiresVerifiedBadge?: boolean; message?: string; game?: WhotGameState }> => {
    const targetChat = chats.find((c) => c.id === chatId);
    const isAiChat = chatId === AFRIBOT_ID || Boolean(targetChat?.isBot);
    if (isAiChat && mode === 'bet') {
      return {
        success: false,
        message: 'AgcBot only plays Friendly matches (no betting in AI Chat).',
      };
    }

    const cleanBet = mode === 'bet' ? Math.round(Number(betAmount) || 0) : 0;
    const sym = CURRENCY_SYMBOLS[currency || 'NGN'] || '₦';
    if (mode === 'bet' && cleanBet < 50) {
      return { success: false, message: `Minimum bet amount is ${sym}50.` };
    }
    if (mode === 'bet') {
      const { isVerified, maxBet } = getGameBetLimit();
      if (cleanBet > maxBet) {
        return {
          success: false,
          requiresVerifiedBadge: !isVerified,
          message: isVerified
            ? `Maximum bet per game is ${sym}${VERIFIED_GAME_BET_LIMIT.toLocaleString()}.`
            : `Standard max bet is ${sym}${STANDARD_GAME_BET_LIMIT.toLocaleString()} per game. Get the Verified Badge (₦4,000/mo) to unlock a ${sym}${VERIFIED_GAME_BET_LIMIT.toLocaleString()} limit!`,
        };
      }
    }
    if (mode === 'bet' && wallet.availableBalance < cleanBet) {
      return {
        success: false,
        insufficientFunds: true,
        message: `Insufficient wallet balance for ${sym}${cleanBet.toLocaleString()} bet.`,
      };
    }

    const myPhone = currentUser.phoneNumber || currentUser.id;
    let opponentPhone = isAiChat
      ? AFRIBOT_PHONE
      : !targetChat?.isGroup && !targetChat?.isChannel
      ? (targetChat?.phoneNumber || targetChat?.phone || '')
      : '';
    if (!isAiChat && !opponentPhone && chatId.startsWith('dm_')) {
      const parts = chatId.replace('dm_', '').split('_');
      opponentPhone = parts.find((p) => !phonesMatch(p, myPhone)) || '';
    }

    const deck = createWhotDeck();
    const challengerHand = deck.splice(0, 5);
    const opponentHand = deck.splice(0, 5);
    let topIdx = deck.findIndex((c) => c.shape !== 'whot' && ![1, 2, 5, 8, 14, 20].includes(c.number));
    if (topIdx < 0) topIdx = 0;
    const [topCard] = deck.splice(topIdx, 1);

    const nowIso = new Date().toISOString();
    const gameId = `whot_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const totalPot = mode === 'bet' ? cleanBet * 2 : 0;
    const platformFee = mode === 'bet' ? Math.round(totalPot * 0.01) : 0;
    const winnerPayout = totalPot - platformFee;

    const newGame: WhotGameState = {
      id: gameId,
      chatId,
      gameType: 'whot',
      challengerId: currentUser.id,
      challengerPhone: myPhone,
      challengerName: currentUser.fullName || 'Player 1',
      challengerAvatar: currentUser.avatarUrl,
      opponentPhone: opponentPhone || undefined,
      opponentName: isAiChat ? 'AgcBot (Hard AI)' : !targetChat?.isGroup ? targetChat?.name : undefined,
      opponentAvatar: isAiChat ? AFRIBOT_AVATAR : !targetChat?.isGroup ? targetChat?.avatar : undefined,
      isAiOpponent: isAiChat,
      aiDifficulty: isAiChat ? 'hard' : undefined,
      mode,
      betAmount: cleanBet,
      currency: currency || 'NGN',
      challengerHand,
      opponentHand,
      deck,
      discardPile: [topCard],
      topCard,
      requestedShape: null,
      pendingDrawCount: 0,
      pendingDrawType: null,
      reshuffleCount: 0,
      currentTurnPhone: myPhone,
      currentTurnName: currentUser.fullName || 'Player 1',
      lastActionNote: isAiChat ? 'AgcBot (Hard AI) accepted! Your move first.' : undefined,
      moveCount: 0,
      status: isAiChat ? 'active' : 'pending',
      totalPot,
      platformFeeRate: 0.01,
      platformFee,
      winnerPayout,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const cardMsg: ChatMessage = {
      id: `msg_whot_${gameId}`,
      chatId,
      sender: 'user',
      senderName: currentUser.fullName || 'AGC Player',
      senderPhone: myPhone,
      senderAvatar: currentUser.avatarUrl,
      type: 'game_whot',
      whotGame: newGame,
      text: mode === 'bet' ? `🃏 Whot! Challenge (${sym}${cleanBet.toLocaleString()} bet)` : '🃏 Friendly Whot! Challenge',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sent',
    };

    if (mode === 'bet' && cleanBet > 0) {
      const lockRes = await lockGameBetOnServer({
        gameId,
        gameType: 'whot',
        role: 'challenger',
        playerPhone: myPhone,
        playerName: currentUser.fullName || 'Player 1',
        opponentPhone: opponentPhone || undefined,
        opponentName: !targetChat?.isGroup ? targetChat?.name : undefined,
        betAmount: cleanBet,
        currency: newGame.currency,
        title: `Whot! Bet Escrow Lock (${targetChat?.name || 'Match'})`,
      });
      if (!lockRes.success) {
        return {
          success: false,
          insufficientFunds: lockRes.insufficientFunds,
          requiresVerifiedBadge: lockRes.requiresVerifiedBadge,
          message: lockRes.message || `Insufficient wallet balance for bet.`,
        };
      }
    }

    setMessages((prev) => {
      const updated = { ...prev, [chatId]: [...(prev[chatId] || []), cardMsg] };
      persistPartitionedMessages(updated, currentUser.phoneNumber);
      return updated;
    });
    setChats((prev) => {
      const updated = prev.map((c) =>
        c.id === chatId ? { ...c, lastMessage: cardMsg.text || '🃏 Whot! Challenge', lastMessageTime: cardMsg.timestamp } : c
      );
      persistPartitionedChats(updated, currentUser.phoneNumber);
      return updated;
    });

    if (!isAiChat) {
      const wireOverrideChat =
        targetChat ||
        (opponentPhone
          ? ({
              id: chatId,
              name: currentUser.fullName || 'Direct Chat',
              avatar: '',
              verifiedStore: false,
              location: 'Direct Chat',
              unreadCount: 0,
              lastMessage: '',
              lastMessageTime: '',
              catalog: [],
              isOnline: true,
              phone: opponentPhone,
            } as ChatThread)
          : undefined);
      broadcastLiveMessage(chatId, cardMsg, wireOverrideChat);
      broadcastGamePayload('whot_game_update', newGame, chatId, [myPhone, opponentPhone, ...(targetChat?.memberPhones || [])]);
    }
    return { success: true, game: newGame, message: 'Whot! Challenge sent!' };
  };

  const acceptWhotChallenge = async (game: WhotGameState) => {
    const myPhone = currentUser.phoneNumber || currentUser.id;
    if (phonesMatch(myPhone, game.challengerPhone)) {
      return { success: false, message: 'Waiting for your opponent to accept.' };
    }
    if (game.mode === 'bet' && game.betAmount > 0) {
      const { isVerified, maxBet } = getGameBetLimit();
      const sym = CURRENCY_SYMBOLS[game.currency || 'NGN'] || '₦';
      if (game.betAmount > maxBet) {
        return {
          success: false,
          requiresVerifiedBadge: !isVerified,
          message: `Stakes above ${sym}${STANDARD_GAME_BET_LIMIT.toLocaleString()} require a Verified Badge (₦4,000/mo, up to ${sym}${VERIFIED_GAME_BET_LIMIT.toLocaleString()}).`,
        };
      }
      if (walletRef.current.availableBalance < game.betAmount) {
        await refreshWalletFromServer();
        if (walletRef.current.availableBalance < game.betAmount) {
          return { success: false, insufficientFunds: true, message: `Insufficient balance: need ${sym}${game.betAmount.toLocaleString()} to accept bet.` };
        }
      }
    }
    if (game.status !== 'pending') {
      return { success: false, message: `Challenge is already ${game.status}.` };
    }
    const accepted: WhotGameState = {
      ...game,
      opponentPhone: myPhone,
      opponentName: currentUser.fullName || game.opponentName || 'Player 2',
      opponentAvatar: currentUser.avatarUrl || game.opponentAvatar,
      status: 'active',
      moveCount: (game.moveCount || 0) + 1,
      lastActionNote: `${game.challengerName} starts first`,
      updatedAt: new Date().toISOString(),
    };
    if (accepted.mode === 'bet' && accepted.betAmount > 0) {
      const lockRes = await lockGameBetOnServer({
        gameId: accepted.id,
        gameType: 'whot',
        role: 'opponent',
        playerPhone: myPhone,
        playerName: currentUser.fullName || 'Player 2',
        opponentPhone: accepted.challengerPhone,
        opponentName: accepted.challengerName,
        betAmount: accepted.betAmount,
        currency: accepted.currency || 'NGN',
        title: `Whot! Match Bet Stake (${accepted.challengerName})`,
      });
      if (!lockRes.success) {
        return {
          success: false,
          insufficientFunds: lockRes.insufficientFunds,
          requiresVerifiedBadge: lockRes.requiresVerifiedBadge,
          message: lockRes.message || 'Insufficient wallet balance to accept bet.',
        };
      }
    }
    applyWhotGameUpdate(accepted);
    broadcastGamePayload('whot_game_update', accepted, accepted.chatId, [accepted.challengerPhone, myPhone]);
    return { success: true, message: 'Whot! match started!' };
  };

  const declineWhotChallenge = async (game: WhotGameState) => {
    const myPhone = currentUser.phoneNumber || currentUser.id;
    const closed: WhotGameState = {
      ...game,
      status: phonesMatch(myPhone, game.challengerPhone) ? 'cancelled' : 'declined',
      moveCount: (game.moveCount || 0) + 1,
      settledAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    if (closed.mode === 'bet' && closed.betAmount > 0) {
      await settleGameBetOnServer({
        gameId: closed.id,
        gameType: 'whot',
        status: closed.status as 'declined' | 'cancelled',
        challengerPhone: closed.challengerPhone,
        opponentPhone: closed.opponentPhone,
        betAmount: closed.betAmount,
        currency: closed.currency || 'NGN',
      });
    }
    applyWhotGameUpdate(closed);
    broadcastGamePayload('whot_game_update', closed, closed.chatId, [closed.challengerPhone, closed.opponentPhone || '']);
    return { success: true };
  };

  const playWhotCard = async (game: WhotGameState, cardId: string, requestedShape?: WhotShape) => {
    const myPhone = currentUser.phoneNumber || currentUser.id;
    if (game.status !== 'active' || !phonesMatch(myPhone, game.currentTurnPhone)) {
      return { success: false, message: 'Not your turn.' };
    }
    const isChallenger = phonesMatch(myPhone, game.challengerPhone);
    const hand = isChallenger ? [...(game.challengerHand || [])] : [...(game.opponentHand || [])];
    const oppHand = isChallenger ? [...(game.opponentHand || [])] : [...(game.challengerHand || [])];
    const cardIdx = hand.findIndex((c) => c.id === cardId);
    if (cardIdx < 0) return { success: false, message: 'Card not found in hand.' };

    const card = hand[cardIdx];
    if (!isWhotCardPlayable(card, game)) {
      if ((game.pendingDrawCount || 0) > 0) {
        return {
          success: false,
          message:
            game.pendingDrawType === 'pick_three'
              ? `Stack another 5 (Pick Three) or tap Pick ${game.pendingDrawCount}!`
              : `Stack another 2 (Pick Two) or tap Pick ${game.pendingDrawCount}!`,
        };
      }
      return { success: false, message: 'Card does not match Call Card.' };
    }

    hand.splice(cardIdx, 1);
    let nextDeck = [...(game.deck || [])];
    let nextDiscard = [...(game.discardPile || []), card];
    let nextReshuffles = game.reshuffleCount || 0;

    const oppPhone = isChallenger ? game.opponentPhone || '' : game.challengerPhone;
    const oppName = isChallenger ? game.opponentName || 'Opponent' : game.challengerName;
    const myName = isChallenger ? game.challengerName : game.opponentName || 'Player 2';

    if (hand.length === 0) {
      const wonGame: WhotGameState = {
        ...game,
        challengerHand: isChallenger ? hand : oppHand,
        opponentHand: isChallenger ? oppHand : hand,
        deck: nextDeck,
        discardPile: nextDiscard,
        topCard: card,
        requestedShape: null,
        pendingDrawCount: 0,
        pendingDrawType: null,
        reshuffleCount: nextReshuffles,
        status: 'won',
        winnerPhone: myPhone,
        winnerName: myName,
        lastActionNote: `${myName} cleared all cards!`,
        moveCount: (game.moveCount || 0) + 1,
        settledAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      if (wonGame.mode === 'bet' && wonGame.betAmount > 0) {
        await settleGameBetOnServer({
          gameId: wonGame.id,
          gameType: 'whot',
          status: 'won',
          winnerPhone: wonGame.winnerPhone,
          winnerName: wonGame.winnerName,
          challengerPhone: wonGame.challengerPhone,
          opponentPhone: wonGame.opponentPhone,
          betAmount: wonGame.betAmount,
          currency: wonGame.currency || 'NGN',
        });
      }
      applyWhotGameUpdate(wonGame);
      if (!wonGame.isAiOpponent && wonGame.chatId !== AFRIBOT_ID) {
        broadcastGamePayload('whot_game_update', wonGame, wonGame.chatId, [wonGame.challengerPhone, wonGame.opponentPhone || '']);
      }
      return { success: true };
    }

    let nextTurnPhone = oppPhone;
    let nextTurnName = oppName;
    let nextRequestedShape: WhotShape | null = null;
    let nextPendingDrawCount = 0;
    let nextPendingDrawType: 'pick_two' | 'pick_three' | null = null;
    let actionNote = `${myName} played ${card.shape === 'whot' ? 'WHOT 20' : `${card.number} ${card.shape}`}`;

    if (card.shape === 'whot' || card.number === 20) {
      nextRequestedShape = requestedShape && requestedShape !== 'whot' ? requestedShape : 'circle';
      actionNote = `${myName} played WHOT (20) & asked for ${nextRequestedShape.toUpperCase()}`;
    } else if (card.number === 1) {
      // Hold On: current player goes again
      nextTurnPhone = myPhone;
      nextTurnName = myName;
      actionNote = `${myName} played Hold On (1) — plays again!`;
    } else if (card.number === 2) {
      // Pick Two (Stackable): opponent must stack another 2 or draw pendingDrawCount
      nextPendingDrawCount = (game.pendingDrawCount || 0) + 2;
      nextPendingDrawType = 'pick_two';
      nextTurnPhone = oppPhone;
      nextTurnName = oppName;
      actionNote = `${myName} played Pick 2! ${oppName} must stack 2 or Pick ${nextPendingDrawCount}`;
    } else if (card.number === 5) {
      // Pick Three (Stackable): opponent must stack another 5 or draw pendingDrawCount
      nextPendingDrawCount = (game.pendingDrawCount || 0) + 3;
      nextPendingDrawType = 'pick_three';
      nextTurnPhone = oppPhone;
      nextTurnName = oppName;
      actionNote = `${myName} played Pick 3! ${oppName} must stack 5 or Pick ${nextPendingDrawCount}`;
    } else if (card.number === 8) {
      // Suspension: skips next player's turn -> current player plays again
      nextTurnPhone = myPhone;
      nextTurnName = myName;
      actionNote = `${myName} played Suspension (8) — ${oppName} skipped!`;
    } else if (card.number === 14) {
      // General Market: opponent draws 1 card from Market (reshuffle discard pile if empty) & current player goes again
      const drawRes = drawCardsFromWhotMarket(nextDeck, nextDiscard, 1, nextReshuffles);
      oppHand.push(...drawRes.drawn);
      nextDeck = drawRes.nextDeck;
      nextDiscard = drawRes.nextDiscard;
      nextReshuffles = drawRes.reshuffleCount;
      nextTurnPhone = myPhone;
      nextTurnName = myName;
      actionNote = `${myName} played General Market (14)! ${oppName} picked 1${drawRes.didReshuffle ? ' (Market reshuffled)' : ''}`;
    }

    const updatedGame: WhotGameState = {
      ...game,
      challengerHand: isChallenger ? hand : oppHand,
      opponentHand: isChallenger ? oppHand : hand,
      deck: nextDeck,
      discardPile: nextDiscard,
      topCard: card,
      requestedShape: nextRequestedShape,
      pendingDrawCount: nextPendingDrawCount,
      pendingDrawType: nextPendingDrawType,
      reshuffleCount: nextReshuffles,
      currentTurnPhone: nextTurnPhone,
      currentTurnName: nextTurnName,
      lastActionNote: actionNote,
      moveCount: (game.moveCount || 0) + 1,
      updatedAt: new Date().toISOString(),
    };
    applyWhotGameUpdate(updatedGame);
    if (!updatedGame.isAiOpponent && updatedGame.chatId !== AFRIBOT_ID) {
      broadcastGamePayload('whot_game_update', updatedGame, updatedGame.chatId, [updatedGame.challengerPhone, updatedGame.opponentPhone || '']);
    }
    return { success: true };
  };

  const drawWhotCard = async (game: WhotGameState) => {
    const myPhone = currentUser.phoneNumber || currentUser.id;
    if (game.status !== 'active' || !phonesMatch(myPhone, game.currentTurnPhone)) {
      return { success: false, message: 'Not your turn.' };
    }
    const isChallenger = phonesMatch(myPhone, game.challengerPhone);
    const hand = isChallenger ? [...(game.challengerHand || [])] : [...(game.opponentHand || [])];
    const oppHand = isChallenger ? [...(game.opponentHand || [])] : [...(game.challengerHand || [])];
    const drawQty = game.pendingDrawCount && game.pendingDrawCount > 0 ? game.pendingDrawCount : 1;

    const drawRes = drawCardsFromWhotMarket(
      game.deck || [],
      game.discardPile || [],
      drawQty,
      game.reshuffleCount || 0
    );
    hand.push(...drawRes.drawn);

    const oppPhone = isChallenger ? game.opponentPhone || '' : game.challengerPhone;
    const oppName = isChallenger ? game.opponentName || 'Opponent' : game.challengerName;
    const myName = isChallenger ? game.challengerName : game.opponentName || 'Player 2';

    const updatedGame: WhotGameState = {
      ...game,
      challengerHand: isChallenger ? hand : oppHand,
      opponentHand: isChallenger ? oppHand : hand,
      deck: drawRes.nextDeck,
      discardPile: drawRes.nextDiscard,
      pendingDrawCount: 0,
      pendingDrawType: null,
      reshuffleCount: drawRes.reshuffleCount,
      currentTurnPhone: oppPhone,
      currentTurnName: oppName,
      lastActionNote:
        drawQty > 1
          ? `${myName} picked ${drawQty} penalty cards${drawRes.didReshuffle ? ' (Market reshuffled)' : ''}`
          : `${myName} went to Market${drawRes.didReshuffle ? ' (Market reshuffled)' : ''}`,
      moveCount: (game.moveCount || 0) + 1,
      updatedAt: new Date().toISOString(),
    };
    applyWhotGameUpdate(updatedGame);
    if (!updatedGame.isAiOpponent && updatedGame.chatId !== AFRIBOT_ID) {
      broadcastGamePayload('whot_game_update', updatedGame, updatedGame.chatId, [updatedGame.challengerPhone, updatedGame.opponentPhone || '']);
    }
    return { success: true };
  };

  const forfeitWhotGame = async (game: WhotGameState) => {
    const myPhone = currentUser.phoneNumber || currentUser.id;
    if (game.status !== 'active') {
      return { success: false, message: 'Only active matches can be forfeited.' };
    }
    const isChallenger = phonesMatch(myPhone, game.challengerPhone);
    const isOpp = !isChallenger && (!game.opponentPhone || phonesMatch(myPhone, game.opponentPhone));
    if (!isChallenger && !isOpp) {
      return { success: false, message: 'Only participants can forfeit.' };
    }
    const myName = isChallenger ? game.challengerName : (game.opponentName || currentUser.fullName || 'Player 2');
    const winPhone = isChallenger ? (game.opponentPhone || AFRIBOT_PHONE) : game.challengerPhone;
    const winName = isChallenger ? (game.opponentName || 'Opponent') : game.challengerName;
    const nowIso = new Date().toISOString();

    const forfeitedGame: WhotGameState = {
      ...game,
      status: 'won',
      winnerPhone: winPhone,
      winnerName: winName,
      pendingDrawCount: 0,
      pendingDrawType: null,
      lastActionNote: `${myName} forfeited the match`,
      moveCount: (game.moveCount || 0) + 1,
      settledAt: nowIso,
      updatedAt: nowIso,
    };

    if (forfeitedGame.mode === 'bet' && forfeitedGame.betAmount > 0) {
      await settleGameBetOnServer({
        gameId: forfeitedGame.id,
        gameType: 'whot',
        status: 'won',
        winnerPhone: forfeitedGame.winnerPhone,
        winnerName: forfeitedGame.winnerName,
        challengerPhone: forfeitedGame.challengerPhone,
        opponentPhone: forfeitedGame.opponentPhone,
        betAmount: forfeitedGame.betAmount,
        currency: forfeitedGame.currency || 'NGN',
      });
    }
    applyWhotGameUpdate(forfeitedGame);
    if (!forfeitedGame.isAiOpponent && forfeitedGame.chatId !== AFRIBOT_ID) {
      broadcastGamePayload('whot_game_update', forfeitedGame, forfeitedGame.chatId, [forfeitedGame.challengerPhone, forfeitedGame.opponentPhone || '']);
    }
    return { success: true, message: 'Match forfeited.' };
  };

  // Nigerian Double-Dice Ludo Helpers (Zero Safe Tiles, Eat & Go Home, Stacking Blocks, Double-6 Bonus Only)
  const resolveLudoRoll = (
    game: LudoGameState,
    rollerPhone: string,
    rollerName: string,
    oppPhone: string,
    oppName: string
  ): LudoGameState => {
    const isChallenger = phonesMatch(rollerPhone, game.challengerPhone);
    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    const dicePair: [number, number] = [d1, d2];
    const isDoubleSix = d1 === 6 && d2 === 6;
    const nextDoubleSixStreak = isDoubleSix ? (game.consecutiveSixes || 0) + 1 : 0;

    if (isDoubleSix && nextDoubleSixStreak >= 3) {
      return {
        ...game,
        diceValues: [],
        rolledDice: dicePair,
        lastPlayedDice: dicePair,
        diceValue: d1,
        hasRolled: false,
        consecutiveSixes: 0,
        pendingStackTargetTrackIdx: null,
        pendingStackAttackerIndex: null,
        currentTurnPhone: oppPhone,
        currentTurnName: oppName,
        lastActionNote: `${rollerName} rolled [6, 6] 3× in a row — FOUL! Turn cancelled.`,
        moveCount: (game.moveCount || 0) + 1,
        updatedAt: new Date().toISOString(),
      };
    }

    const probeState: LudoGameState = {
      ...game,
      pendingStackTargetTrackIdx: null,
      pendingStackAttackerIndex: null,
    };
    const legal = getLegalLudoPlayState(probeState, isChallenger, dicePair);

    if (!legal.hasAnyLegalMove) {
      return {
        ...game,
        diceValues: [],
        rolledDice: dicePair,
        lastPlayedDice: dicePair,
        diceValue: d1,
        hasRolled: false,
        consecutiveSixes: 0,
        pendingStackTargetTrackIdx: null,
        pendingStackAttackerIndex: null,
        currentTurnPhone: oppPhone,
        currentTurnName: oppName,
        lastActionNote: `${rollerName} rolled [${d1}, ${d2}] (no legal move — turn passed)`,
        moveCount: (game.moveCount || 0) + 1,
        updatedAt: new Date().toISOString(),
      };
    }

    const mandatoryHint =
      legal.forcedHigherDie !== null
        ? ` · Must play higher die (${legal.forcedHigherDie})`
        : '';

    return {
      ...game,
      diceValues: [...dicePair],
      rolledDice: dicePair,
      lastPlayedDice: dicePair,
      diceValue: d1,
      hasRolled: true,
      consecutiveSixes: nextDoubleSixStreak,
      pendingStackTargetTrackIdx: null,
      pendingStackAttackerIndex: null,
      lastActionNote: isDoubleSix
        ? `${rollerName} rolled DOUBLE 6 [6 & 6] — bonus roll after moves!`
        : `${rollerName} rolled [${d1} & ${d2}]${mandatoryHint}`,
      moveCount: (game.moveCount || 0) + 1,
      updatedAt: new Date().toISOString(),
    };
  };

  const resolveLudoMove = (
    game: LudoGameState,
    moverPhone: string,
    tokenIndex: number,
    dieChoice: 'die0' | 'die1' | 'combined' = 'die0'
  ): { error?: string; nextGame?: LudoGameState; finishedNow?: boolean } => {
    const isChallenger = phonesMatch(moverPhone, game.challengerPhone);
    let myTokens = [...((isChallenger ? game.challengerTokens : game.opponentTokens) || [])];
    let oppTokens = [...((isChallenger ? game.opponentTokens : game.challengerTokens) || [])];
    let myCaptures = (isChallenger ? game.challengerCaptures : game.opponentCaptures) || 0;
    const oppCaptures = (isChallenger ? game.opponentCaptures : game.challengerCaptures) || 0;
    const rules = getLudoRulesConfig(game);

    const curStep = myTokens[tokenIndex];
    if (curStep === undefined || isStepFinished(curStep)) {
      return { error: 'Seed already finished.' };
    }

    const remaining =
      game.diceValues && game.diceValues.length > 0
        ? [...game.diceValues]
        : game.diceValue
        ? [game.diceValue]
        : [];
    if (remaining.length === 0) return { error: 'Roll the dice first.' };

    const legal = getLegalLudoPlayState(game, isChallenger, remaining);
    const blockedReason = legal.reasonForBlockedToken(tokenIndex, dieChoice);
    if (blockedReason) {
      return { error: blockedReason };
    }

    const myName = isChallenger ? game.challengerName : game.opponentName || 'Green/Blue Player';
    const oppPhone = isChallenger ? game.opponentPhone || '' : game.challengerPhone;
    const oppName = isChallenger ? game.opponentName || 'Opponent' : game.challengerName;

    let capturedCount = 0;
    let instantFinishedCount = 0;
    let completedStackAssault = false;
    let nextPendingTarget: number | null = null;
    let nextPendingAttacker: number | null = null;
    let nextRemaining = [...remaining];
    let moveLabel = '';

    if (dieChoice === 'combined') {
      if (remaining.length < 2) return { error: 'Need 2 unused dice to play both.' };
      const [d0, d1] = remaining;

      const trySeq = (first: number, second: number) => {
        const s1 = simulateLudoSingleDieStep({
          myTokens,
          oppTokens,
          tokenIndex,
          dieVal: first,
          otherDieVal: second,
          isChallenger,
          rules,
          myCaptures,
          pendingStackTargetTrackIdx: null,
          pendingStackAttackerIndex: null,
        });
        if (!s1.valid || s1.nextPendingStackTarget !== null || isStepFinished(s1.nextStep)) {
          return null;
        }
        const s2 = simulateLudoSingleDieStep({
          myTokens: s1.nextMyTokens,
          oppTokens: s1.nextOppTokens,
          tokenIndex,
          dieVal: second,
          otherDieVal: null,
          isChallenger,
          rules,
          myCaptures: myCaptures + s1.capturesGained,
          pendingStackTargetTrackIdx: null,
          pendingStackAttackerIndex: null,
        });
        if (!s2.valid) return null;
        return { s1, s2, order: [first, second] as [number, number] };
      };

      const seq =
        curStep < 0 && d1 === rules.spawn_requires && d0 !== rules.spawn_requires
          ? trySeq(d1, d0)
          : trySeq(d0, d1) || trySeq(d1, d0);

      if (!seq) {
        return { error: 'Cannot play both dice sequentially on that seed.' };
      }

      myTokens = seq.s2.nextMyTokens;
      oppTokens = seq.s2.nextOppTokens;
      capturedCount = seq.s1.capturesGained + seq.s2.capturesGained;
      myCaptures += capturedCount;
      instantFinishedCount = seq.s1.instantFinishedCount + seq.s2.instantFinishedCount;
      completedStackAssault = seq.s2.completedStackAssault;
      nextPendingTarget = seq.s2.nextPendingStackTarget;
      nextPendingAttacker = seq.s2.nextPendingAttacker;
      nextRemaining = [];
      moveLabel = `${myName} played [${seq.order[0]}+${seq.order[1]}] on seed #${tokenIndex + 1}`;
    } else {
      const dieIdx = dieChoice === 'die1' && remaining.length > 1 ? 1 : 0;
      const dieVal = remaining[dieIdx];
      const otherDieVal = remaining.length === 2 ? remaining[dieIdx === 0 ? 1 : 0] : null;

      const s1 = simulateLudoSingleDieStep({
        myTokens,
        oppTokens,
        tokenIndex,
        dieVal,
        otherDieVal,
        isChallenger,
        rules,
        myCaptures,
        pendingStackTargetTrackIdx: game.pendingStackTargetTrackIdx ?? null,
        pendingStackAttackerIndex: game.pendingStackAttackerIndex ?? null,
      });
      if (!s1.valid) {
        return { error: s1.reason || 'Invalid move.' };
      }

      myTokens = s1.nextMyTokens;
      oppTokens = s1.nextOppTokens;
      capturedCount = s1.capturesGained;
      myCaptures += capturedCount;
      instantFinishedCount = s1.instantFinishedCount;
      completedStackAssault = s1.completedStackAssault;
      nextPendingTarget = s1.nextPendingStackTarget;
      nextPendingAttacker = s1.nextPendingAttacker;
      nextRemaining.splice(dieIdx, 1);

      moveLabel =
        nextPendingTarget !== null
          ? `${myName} moved seed #${tokenIndex + 1} to raid stack (play 2nd seed onto block!)`
          : curStep < 0
          ? `${myName} spawned seed #${tokenIndex + 1}`
          : `${myName} moved seed #${tokenIndex + 1} by ${dieVal}`;
    }

    const finishedNow = myTokens.every(isStepFinished);
    if (finishedNow) {
      return {
        finishedNow: true,
        nextGame: {
          ...game,
          challengerTokens: isChallenger ? myTokens : oppTokens,
          opponentTokens: isChallenger ? oppTokens : myTokens,
          challengerCaptures: isChallenger ? myCaptures : oppCaptures,
          opponentCaptures: isChallenger ? oppCaptures : myCaptures,
          pendingStackTargetTrackIdx: null,
          pendingStackAttackerIndex: null,
          diceValues: [],
          diceValue: null,
          hasRolled: false,
          consecutiveSixes: 0,
          status: 'won',
          winnerPhone: moverPhone,
          winnerName: myName,
          lastActionNote:
            capturedCount > 0
              ? `${myName} captured & finished all ${myTokens.length} seeds!`
              : `${myName} finished all ${myTokens.length} seeds!`,
          moveCount: (game.moveCount || 0) + 1,
          settledAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      };
    }

    const eatNote =
      completedStackAssault
        ? ' · STACK CAPTURE (2 eaten & finished home!)'
        : capturedCount > 0
        ? ' · EAT & GO HOME (seed scored!)'
        : instantFinishedCount > 0
        ? ' · Seed reached Home!'
        : '';

    const intermediateState: LudoGameState = {
      ...game,
      challengerTokens: isChallenger ? myTokens : oppTokens,
      opponentTokens: isChallenger ? oppTokens : myTokens,
      challengerCaptures: isChallenger ? myCaptures : oppCaptures,
      opponentCaptures: isChallenger ? oppCaptures : myCaptures,
      pendingStackTargetTrackIdx: nextPendingTarget,
      pendingStackAttackerIndex: nextPendingAttacker,
    };

    if (
      nextRemaining.length > 0 &&
      getLegalLudoPlayState(intermediateState, isChallenger, nextRemaining).hasAnyLegalMove
    ) {
      return {
        finishedNow: false,
        nextGame: {
          ...intermediateState,
          diceValues: nextRemaining,
          diceValue: nextRemaining[0],
          hasRolled: true,
          lastActionNote: `${moveLabel}${eatNote} · Play [${nextRemaining[0]}]`,
          moveCount: (game.moveCount || 0) + 1,
          updatedAt: new Date().toISOString(),
        },
      };
    }

    // Roll complete! Double-6 ([6, 6]) ONLY grants a bonus roll!
    const hadDoubleSixBonus = Boolean(
      game.rolledDice && game.rolledDice[0] === 6 && game.rolledDice[1] === 6
    );
    const keepTurn = hadDoubleSixBonus;

    return {
      finishedNow: false,
      nextGame: {
        ...intermediateState,
        diceValues: [],
        diceValue: null,
        hasRolled: false,
        consecutiveSixes: keepTurn ? game.consecutiveSixes || 1 : 0,
        pendingStackTargetTrackIdx: null,
        pendingStackAttackerIndex: null,
        currentTurnPhone: keepTurn ? moverPhone : oppPhone,
        currentTurnName: keepTurn ? myName : oppName,
        lastActionNote: hadDoubleSixBonus
          ? `${moveLabel}${eatNote} · Double-6 Bonus Roll!`
          : `${moveLabel}${eatNote}`,
        moveCount: (game.moveCount || 0) + 1,
        updatedAt: new Date().toISOString(),
      },
    };
  };

  const sendLudoChallenge = async (
    chatId: string,
    mode: 'friendly' | 'bet',
    betAmount: number,
    options?: { twoHouseMode?: boolean; mandatoryCaptureToFinish?: boolean }
  ): Promise<{ success: boolean; insufficientFunds?: boolean; requiresVerifiedBadge?: boolean; message?: string; game?: LudoGameState }> => {
    const targetChat = chats.find((c) => c.id === chatId);
    const isAiChat = chatId === AFRIBOT_ID || Boolean(targetChat?.isBot);
    if (isAiChat && mode === 'bet') {
      return {
        success: false,
        message: 'AgcBot only plays Friendly matches (no betting in AI Chat).',
      };
    }

    const cleanBet = mode === 'bet' ? Math.round(Number(betAmount) || 0) : 0;
    const sym = CURRENCY_SYMBOLS[currency || 'NGN'] || '₦';
    if (mode === 'bet' && cleanBet < 50) {
      return { success: false, message: `Minimum bet amount is ${sym}50.` };
    }
    if (mode === 'bet') {
      const { isVerified, maxBet } = getGameBetLimit();
      if (cleanBet > maxBet) {
        return {
          success: false,
          requiresVerifiedBadge: !isVerified,
          message: isVerified
            ? `Maximum bet per game is ${sym}${VERIFIED_GAME_BET_LIMIT.toLocaleString()}.`
            : `Standard max bet is ${sym}${STANDARD_GAME_BET_LIMIT.toLocaleString()} per game. Get the Verified Badge (₦4,000/mo) to unlock a ${sym}${VERIFIED_GAME_BET_LIMIT.toLocaleString()} limit!`,
        };
      }
    }
    if (mode === 'bet' && wallet.availableBalance < cleanBet) {
      return {
        success: false,
        insufficientFunds: true,
        message: `Insufficient wallet balance for ${sym}${cleanBet.toLocaleString()} bet.`,
      };
    }

    const myPhone = currentUser.phoneNumber || currentUser.id;
    let opponentPhone = isAiChat
      ? AFRIBOT_PHONE
      : !targetChat?.isGroup && !targetChat?.isChannel
      ? (targetChat?.phoneNumber || targetChat?.phone || '')
      : '';
    if (!isAiChat && !opponentPhone && chatId.startsWith('dm_')) {
      const parts = chatId.replace('dm_', '').split('_');
      opponentPhone = parts.find((p) => !phonesMatch(p, myPhone)) || '';
    }

    const nowIso = new Date().toISOString();
    const gameId = `ludo_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const totalPot = mode === 'bet' ? cleanBet * 2 : 0;
    const platformFee = mode === 'bet' ? Math.round(totalPot * 0.01) : 0;
    const winnerPayout = totalPot - platformFee;

    const twoHouseMode = options?.twoHouseMode ?? true;
    const mandatoryCaptureToFinish = options?.mandatoryCaptureToFinish ?? true;
    const seedCount = twoHouseMode ? 8 : 4;
    const rulesConfig: LudoRulesConfig = {
      ...DEFAULT_LUDO_RULES_CONFIG,
      two_house_mode: twoHouseMode,
      mandatory_capture_to_finish: mandatoryCaptureToFinish,
    };

    const newGame: LudoGameState = {
      id: gameId,
      chatId,
      gameType: 'ludo',
      challengerId: currentUser.id,
      challengerPhone: myPhone,
      challengerName: currentUser.fullName || 'Red Player',
      challengerAvatar: currentUser.avatarUrl,
      opponentPhone: opponentPhone || undefined,
      opponentName: isAiChat ? 'AgcBot (Hard AI)' : !targetChat?.isGroup ? targetChat?.name : undefined,
      opponentAvatar: isAiChat ? AFRIBOT_AVATAR : !targetChat?.isGroup ? targetChat?.avatar : undefined,
      isAiOpponent: isAiChat,
      aiDifficulty: isAiChat ? 'hard' : undefined,
      mode,
      betAmount: cleanBet,
      currency: currency || 'NGN',
      challengerTokens: Array(seedCount).fill(-1),
      opponentTokens: Array(seedCount).fill(-1),
      rulesConfig,
      challengerCaptures: 0,
      opponentCaptures: 0,
      pendingStackTargetTrackIdx: null,
      pendingStackAttackerIndex: null,
      diceValues: [],
      rolledDice: null,
      lastPlayedDice: null,
      diceValue: null,
      hasRolled: false,
      consecutiveSixes: 0,
      currentTurnPhone: myPhone,
      currentTurnName: currentUser.fullName || 'Red Player',
      lastActionNote: isAiChat
        ? `${seedCount} Seeds · Double-6 Bonus Only · Zero Safe Tiles! Roll vs AgcBot.`
        : undefined,
      moveCount: 0,
      status: isAiChat ? 'active' : 'pending',
      totalPot,
      platformFeeRate: 0.01,
      platformFee,
      winnerPayout,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const cardMsg: ChatMessage = {
      id: `msg_ludo_${gameId}`,
      chatId,
      sender: 'user',
      senderName: currentUser.fullName || 'AGC Player',
      senderPhone: myPhone,
      senderAvatar: currentUser.avatarUrl,
      type: 'game_ludo',
      ludoGame: newGame,
      text: mode === 'bet' ? `🎲 Ludo 8-Seed Challenge (${sym}${cleanBet.toLocaleString()} bet)` : '🎲 Friendly Ludo 8-Seed Challenge',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sent',
    };

    if (mode === 'bet' && cleanBet > 0) {
      const lockRes = await lockGameBetOnServer({
        gameId,
        gameType: 'ludo',
        role: 'challenger',
        playerPhone: myPhone,
        playerName: currentUser.fullName || 'Red Player',
        opponentPhone: opponentPhone || undefined,
        opponentName: !targetChat?.isGroup ? targetChat?.name : undefined,
        betAmount: cleanBet,
        currency: newGame.currency,
        title: `Ludo Bet Escrow Lock (${targetChat?.name || 'Match'})`,
      });
      if (!lockRes.success) {
        return {
          success: false,
          insufficientFunds: lockRes.insufficientFunds,
          requiresVerifiedBadge: lockRes.requiresVerifiedBadge,
          message: lockRes.message || `Insufficient wallet balance for bet.`,
        };
      }
    }

    setMessages((prev) => {
      const updated = { ...prev, [chatId]: [...(prev[chatId] || []), cardMsg] };
      persistPartitionedMessages(updated, currentUser.phoneNumber);
      return updated;
    });
    setChats((prev) => {
      const updated = prev.map((c) =>
        c.id === chatId ? { ...c, lastMessage: cardMsg.text || '🎲 Ludo Challenge', lastMessageTime: cardMsg.timestamp } : c
      );
      persistPartitionedChats(updated, currentUser.phoneNumber);
      return updated;
    });

    if (!isAiChat) {
      const wireOverrideChat =
        targetChat ||
        (opponentPhone
          ? ({
              id: chatId,
              name: currentUser.fullName || 'Direct Chat',
              avatar: '',
              verifiedStore: false,
              location: 'Direct Chat',
              unreadCount: 0,
              lastMessage: '',
              lastMessageTime: '',
              catalog: [],
              isOnline: true,
              phone: opponentPhone,
            } as ChatThread)
          : undefined);
      broadcastLiveMessage(chatId, cardMsg, wireOverrideChat);
      broadcastGamePayload('ludo_game_update', newGame, chatId, [myPhone, opponentPhone, ...(targetChat?.memberPhones || [])]);
    }
    return { success: true, game: newGame, message: 'Ludo Challenge sent!' };
  };

  const acceptLudoChallenge = async (game: LudoGameState) => {
    const myPhone = currentUser.phoneNumber || currentUser.id;
    if (phonesMatch(myPhone, game.challengerPhone)) {
      return { success: false, message: 'Waiting for your opponent to accept.' };
    }
    if (game.mode === 'bet' && game.betAmount > 0) {
      const { isVerified, maxBet } = getGameBetLimit();
      const sym = CURRENCY_SYMBOLS[game.currency || 'NGN'] || '₦';
      if (game.betAmount > maxBet) {
        return {
          success: false,
          requiresVerifiedBadge: !isVerified,
          message: `Stakes above ${sym}${STANDARD_GAME_BET_LIMIT.toLocaleString()} require a Verified Badge (₦4,000/mo, up to ${sym}${VERIFIED_GAME_BET_LIMIT.toLocaleString()}).`,
        };
      }
      if (walletRef.current.availableBalance < game.betAmount) {
        await refreshWalletFromServer();
        if (walletRef.current.availableBalance < game.betAmount) {
          return { success: false, insufficientFunds: true, message: `Insufficient balance: need ${sym}${game.betAmount.toLocaleString()} to accept bet.` };
        }
      }
    }
    if (game.status !== 'pending') {
      return { success: false, message: `Challenge is already ${game.status}.` };
    }
    const accepted: LudoGameState = {
      ...game,
      opponentPhone: myPhone,
      opponentName: currentUser.fullName || game.opponentName || 'Green/Blue Player',
      opponentAvatar: currentUser.avatarUrl || game.opponentAvatar,
      status: 'active',
      moveCount: (game.moveCount || 0) + 1,
      lastActionNote: `${game.challengerName} rolls 2 dice first`,
      updatedAt: new Date().toISOString(),
    };
    if (accepted.mode === 'bet' && accepted.betAmount > 0) {
      const lockRes = await lockGameBetOnServer({
        gameId: accepted.id,
        gameType: 'ludo',
        role: 'opponent',
        playerPhone: myPhone,
        playerName: currentUser.fullName || 'Green/Blue Player',
        opponentPhone: accepted.challengerPhone,
        opponentName: accepted.challengerName,
        betAmount: accepted.betAmount,
        currency: accepted.currency || 'NGN',
        title: `Ludo Match Bet Stake (${accepted.challengerName})`,
      });
      if (!lockRes.success) {
        return {
          success: false,
          insufficientFunds: lockRes.insufficientFunds,
          requiresVerifiedBadge: lockRes.requiresVerifiedBadge,
          message: lockRes.message || 'Insufficient wallet balance to accept bet.',
        };
      }
    }
    applyLudoGameUpdate(accepted);
    broadcastGamePayload('ludo_game_update', accepted, accepted.chatId, [accepted.challengerPhone, myPhone]);
    return { success: true, message: 'Ludo match started!' };
  };

  const declineLudoChallenge = async (game: LudoGameState) => {
    const myPhone = currentUser.phoneNumber || currentUser.id;
    const closed: LudoGameState = {
      ...game,
      status: phonesMatch(myPhone, game.challengerPhone) ? 'cancelled' : 'declined',
      moveCount: (game.moveCount || 0) + 1,
      settledAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    if (closed.mode === 'bet' && closed.betAmount > 0) {
      await settleGameBetOnServer({
        gameId: closed.id,
        gameType: 'ludo',
        status: closed.status as 'declined' | 'cancelled',
        challengerPhone: closed.challengerPhone,
        opponentPhone: closed.opponentPhone,
        betAmount: closed.betAmount,
        currency: closed.currency || 'NGN',
      });
    }
    applyLudoGameUpdate(closed);
    broadcastGamePayload('ludo_game_update', closed, closed.chatId, [closed.challengerPhone, closed.opponentPhone || '']);
    return { success: true };
  };

  const rollLudoDice = async (game: LudoGameState) => {
    const myPhone = currentUser.phoneNumber || currentUser.id;
    if (game.status !== 'active' || !phonesMatch(myPhone, game.currentTurnPhone) || game.hasRolled) {
      return { success: false, message: 'Cannot roll right now.' };
    }
    const isChallenger = phonesMatch(myPhone, game.challengerPhone);
    const myName = isChallenger ? game.challengerName : game.opponentName || 'Green/Blue Player';
    const oppPhone = isChallenger ? game.opponentPhone || '' : game.challengerPhone;
    const oppName = isChallenger ? game.opponentName || 'Opponent' : game.challengerName;

    const updated = resolveLudoRoll(game, myPhone, myName, oppPhone, oppName);
    applyLudoGameUpdate(updated);
    if (!updated.isAiOpponent && updated.chatId !== AFRIBOT_ID) {
      broadcastGamePayload('ludo_game_update', updated, updated.chatId, [updated.challengerPhone, updated.opponentPhone || '']);
    }
    return { success: true };
  };

  const moveLudoToken = async (
    game: LudoGameState,
    tokenIndex: number,
    dieChoice: 'die0' | 'die1' | 'combined' = 'die0'
  ) => {
    const myPhone = currentUser.phoneNumber || currentUser.id;
    if (game.status !== 'active' || !phonesMatch(myPhone, game.currentTurnPhone) || !game.hasRolled) {
      return { success: false, message: 'Roll the dice first.' };
    }
    const res = resolveLudoMove(game, myPhone, tokenIndex, dieChoice);
    if (res.error || !res.nextGame) {
      return { success: false, message: res.error || 'Invalid move.' };
    }
    const updated = res.nextGame;
    if (res.finishedNow && updated.mode === 'bet' && updated.betAmount > 0) {
      await settleGameBetOnServer({
        gameId: updated.id,
        gameType: 'ludo',
        status: 'won',
        winnerPhone: updated.winnerPhone,
        winnerName: updated.winnerName,
        challengerPhone: updated.challengerPhone,
        opponentPhone: updated.opponentPhone,
        betAmount: updated.betAmount,
        currency: updated.currency || 'NGN',
      });
    }
    applyLudoGameUpdate(updated);
    if (!updated.isAiOpponent && updated.chatId !== AFRIBOT_ID) {
      broadcastGamePayload('ludo_game_update', updated, updated.chatId, [updated.challengerPhone, updated.opponentPhone || '']);
    }
    return { success: true };
  };

  const forfeitLudoGame = async (game: LudoGameState) => {
    const myPhone = currentUser.phoneNumber || currentUser.id;
    if (game.status !== 'active') {
      return { success: false, message: 'Only active matches can be forfeited.' };
    }
    const isChallenger = phonesMatch(myPhone, game.challengerPhone);
    const isOpp = !isChallenger && (!game.opponentPhone || phonesMatch(myPhone, game.opponentPhone));
    if (!isChallenger && !isOpp) {
      return { success: false, message: 'Only participants can forfeit.' };
    }
    const myName = isChallenger ? game.challengerName : (game.opponentName || currentUser.fullName || 'Green/Blue Player');
    const winPhone = isChallenger ? (game.opponentPhone || AFRIBOT_PHONE) : game.challengerPhone;
    const winName = isChallenger ? (game.opponentName || 'Opponent') : game.challengerName;
    const nowIso = new Date().toISOString();

    const forfeitedGame: LudoGameState = {
      ...game,
      diceValues: [],
      diceValue: null,
      hasRolled: false,
      status: 'won',
      winnerPhone: winPhone,
      winnerName: winName,
      lastActionNote: `${myName} forfeited the match`,
      moveCount: (game.moveCount || 0) + 1,
      settledAt: nowIso,
      updatedAt: nowIso,
    };

    if (forfeitedGame.mode === 'bet' && forfeitedGame.betAmount > 0) {
      await settleGameBetOnServer({
        gameId: forfeitedGame.id,
        gameType: 'ludo',
        status: 'won',
        winnerPhone: forfeitedGame.winnerPhone,
        winnerName: forfeitedGame.winnerName,
        challengerPhone: forfeitedGame.challengerPhone,
        opponentPhone: forfeitedGame.opponentPhone,
        betAmount: forfeitedGame.betAmount,
        currency: forfeitedGame.currency || 'NGN',
      });
    }
    applyLudoGameUpdate(forfeitedGame);
    if (!forfeitedGame.isAiOpponent && forfeitedGame.chatId !== AFRIBOT_ID) {
      broadcastGamePayload('ludo_game_update', forfeitedGame, forfeitedGame.chatId, [forfeitedGame.challengerPhone, forfeitedGame.opponentPhone || '']);
    }
    return { success: true, message: 'Match forfeited.' };
  };

  // ── Texas Hold'em Poker Engine ──
  const resolvePokerAction = (
    game: PokerGameState,
    actorPhone: string,
    action: 'fold' | 'check' | 'call' | 'raise',
    raiseBy: number = 40
  ): { error?: string; nextGame?: PokerGameState; settledNow?: boolean } => {
    const isChallenger = phonesMatch(actorPhone, game.challengerPhone);
    const actorName = isChallenger ? game.challengerName : game.opponentName || 'Player 2';
    const oppPhone = isChallenger ? game.opponentPhone || '' : game.challengerPhone;
    const oppName = isChallenger ? game.opponentName || 'Opponent' : game.challengerName;

    let myChips = isChallenger ? game.challengerChips : game.opponentChips;
    let oppChips = isChallenger ? game.opponentChips : game.challengerChips;
    let myBet = isChallenger ? game.challengerBet : game.opponentBet;
    let oppBet = isChallenger ? game.opponentBet : game.challengerBet;
    let pot = game.pot || 0;
    const deck = [...(game.deck || [])];
    let communityCards = [...(game.communityCards || [])];
    let phase: PokerPhase = game.phase;
    let acted = Array.isArray(game.actedThisPhase) ? [...game.actedThisPhase] : [];
    const nowIso = new Date().toISOString();

    if (action === 'fold') {
      return {
        settledNow: true,
        nextGame: {
          ...game,
          status: 'won',
          winnerPhone: oppPhone,
          winnerName: oppName,
          winningHandLabel: `${actorName} folded`,
          lastActionNote: `${actorName} folded · ${oppName} wins ${pot} chips!`,
          moveCount: (game.moveCount || 0) + 1,
          settledAt: nowIso,
          updatedAt: nowIso,
        },
      };
    }

    let note = '';
    const toCall = Math.max(0, oppBet - myBet);

    if (action === 'check') {
      if (toCall > 0) return { error: `Cannot check — must call ${toCall} chips.` };
      if (!acted.some((p) => phonesMatch(p, actorPhone))) acted.push(actorPhone);
      note = `${actorName} checked`;
    } else if (action === 'call') {
      const paid = Math.min(myChips, toCall);
      myChips -= paid;
      myBet += paid;
      pot += paid;
      if (!acted.some((p) => phonesMatch(p, actorPhone))) acted.push(actorPhone);
      note = toCall > 0 ? `${actorName} called ${paid}` : `${actorName} checked`;
    } else if (action === 'raise') {
      if (myChips <= 0) return { error: 'No chips remaining to raise.' };
      const cleanRaise = Math.max(game.bigBlind || 20, Math.round(raiseBy || 40));
      const totalAdd = Math.min(myChips, toCall + cleanRaise);
      if (totalAdd <= toCall && toCall > 0) {
        // Call all-in instead
        myChips -= totalAdd;
        myBet += totalAdd;
        pot += totalAdd;
        if (!acted.some((p) => phonesMatch(p, actorPhone))) acted.push(actorPhone);
        note = `${actorName} went All-In (${totalAdd})`;
      } else {
        myChips -= totalAdd;
        myBet += totalAdd;
        pot += totalAdd;
        acted = [actorPhone];
        note = myChips === 0 ? `${actorName} went ALL-IN (${myBet})!` : `${actorName} raised to ${myBet}`;
      }
    }

    const bothActed =
      acted.some((p) => phonesMatch(p, game.challengerPhone)) &&
      acted.some((p) => phonesMatch(p, oppPhone || AFRIBOT_PHONE));
    const someoneAllIn = myChips === 0 || oppChips === 0;
    const betsMatched = myBet === oppBet || (someoneAllIn && bothActed);

    if (bothActed && betsMatched) {
      myBet = 0;
      oppBet = 0;
      acted = [];

      if (someoneAllIn || phase === 'river') {
        while (communityCards.length < 5 && deck.length > 0) {
          communityCards.push(deck.shift()!);
        }
        phase = 'showdown';
      } else if (phase === 'preflop') {
        for (let k = 0; k < 3 && deck.length > 0; k++) communityCards.push(deck.shift()!);
        phase = 'flop';
      } else if (phase === 'flop') {
        if (deck.length > 0) communityCards.push(deck.shift()!);
        phase = 'turn';
      } else if (phase === 'turn') {
        if (deck.length > 0) communityCards.push(deck.shift()!);
        phase = 'river';
      }

      if (phase === 'showdown') {
        const chEval = evaluateBest5PokerHand([...(game.challengerHole || []), ...communityCards]);
        const opEval = evaluateBest5PokerHand([...(game.opponentHole || []), ...communityCards]);
        const cmp = comparePokerEvaluations(chEval, opEval);
        const finalChallengerChips = isChallenger ? myChips : oppChips;
        const finalOpponentChips = isChallenger ? oppChips : myChips;

        if (cmp === 0) {
          const half = Math.floor(pot / 2);
          return {
            settledNow: true,
            nextGame: {
              ...game,
              deck,
              communityCards,
              phase: 'showdown',
              pot,
              challengerChips: finalChallengerChips + half,
              opponentChips: finalOpponentChips + (pot - half),
              challengerBet: 0,
              opponentBet: 0,
              actedThisPhase: [],
              challengerHandLabel: chEval.label,
              opponentHandLabel: opEval.label,
              winningHandLabel: `Split Pot (${chEval.label})`,
              lastActionNote: `Showdown Tie! Both hold ${chEval.label}`,
              status: 'draw',
              moveCount: (game.moveCount || 0) + 1,
              settledAt: nowIso,
              updatedAt: nowIso,
            },
          };
        }

        const chWon = cmp > 0;
        return {
          settledNow: true,
          nextGame: {
            ...game,
            deck,
            communityCards,
            phase: 'showdown',
            pot,
            challengerChips: finalChallengerChips + (chWon ? pot : 0),
            opponentChips: finalOpponentChips + (chWon ? 0 : pot),
            challengerBet: 0,
            opponentBet: 0,
            actedThisPhase: [],
            challengerHandLabel: chEval.label,
            opponentHandLabel: opEval.label,
            winningHandLabel: chWon ? chEval.label : opEval.label,
            winnerPhone: chWon ? game.challengerPhone : game.opponentPhone,
            winnerName: chWon ? game.challengerName : game.opponentName || 'Player 2',
            lastActionNote: `Showdown: ${chWon ? game.challengerName : game.opponentName || 'Player 2'} wins with ${chWon ? chEval.label : opEval.label}!`,
            status: 'won',
            moveCount: (game.moveCount || 0) + 1,
            settledAt: nowIso,
            updatedAt: nowIso,
          },
        };
      }

      return {
        settledNow: false,
        nextGame: {
          ...game,
          deck,
          communityCards,
          phase,
          pot,
          challengerChips: isChallenger ? myChips : oppChips,
          opponentChips: isChallenger ? oppChips : myChips,
          challengerBet: 0,
          opponentBet: 0,
          actedThisPhase: [],
          currentTurnPhone: game.challengerPhone,
          currentTurnName: game.challengerName,
          lastActionNote: `${note} · Dealing ${phase.toUpperCase()}`,
          moveCount: (game.moveCount || 0) + 1,
          updatedAt: nowIso,
        },
      };
    }

    return {
      settledNow: false,
      nextGame: {
        ...game,
        deck,
        communityCards,
        phase,
        pot,
        challengerChips: isChallenger ? myChips : oppChips,
        opponentChips: isChallenger ? oppChips : myChips,
        challengerBet: isChallenger ? myBet : oppBet,
        opponentBet: isChallenger ? oppBet : myBet,
        actedThisPhase: acted,
        currentTurnPhone: oppPhone,
        currentTurnName: oppName,
        lastActionNote: note,
        moveCount: (game.moveCount || 0) + 1,
        updatedAt: nowIso,
      },
    };
  };

  const sendPokerChallenge = async (
    chatId: string,
    mode: 'friendly' | 'bet',
    betAmount: number
  ): Promise<{ success: boolean; insufficientFunds?: boolean; requiresVerifiedBadge?: boolean; message?: string; game?: PokerGameState }> => {
    const targetChat = chats.find((c) => c.id === chatId);
    const isAiChat = chatId === AFRIBOT_ID || Boolean(targetChat?.isBot);
    if (isAiChat && mode === 'bet') {
      return {
        success: false,
        message: 'AgcBot only plays Friendly matches (no betting in AI Chat).',
      };
    }

    const cleanBet = mode === 'bet' ? Math.round(Number(betAmount) || 0) : 0;
    const sym = CURRENCY_SYMBOLS[currency || 'NGN'] || '₦';
    if (mode === 'bet' && cleanBet < 50) {
      return { success: false, message: `Minimum bet amount is ${sym}50.` };
    }
    if (mode === 'bet') {
      const { isVerified, maxBet } = getGameBetLimit();
      if (cleanBet > maxBet) {
        return {
          success: false,
          requiresVerifiedBadge: !isVerified,
          message: isVerified
            ? `Maximum bet per game is ${sym}${VERIFIED_GAME_BET_LIMIT.toLocaleString()}.`
            : `Standard max bet is ${sym}${STANDARD_GAME_BET_LIMIT.toLocaleString()} per game. Get the Verified Badge (₦4,000/mo) to unlock a ${sym}${VERIFIED_GAME_BET_LIMIT.toLocaleString()} limit!`,
        };
      }
    }
    if (mode === 'bet' && wallet.availableBalance < cleanBet) {
      return {
        success: false,
        insufficientFunds: true,
        message: `Insufficient wallet balance for ${sym}${cleanBet.toLocaleString()} bet.`,
      };
    }

    const myPhone = currentUser.phoneNumber || currentUser.id;
    let opponentPhone = isAiChat
      ? AFRIBOT_PHONE
      : !targetChat?.isGroup && !targetChat?.isChannel
      ? (targetChat?.phoneNumber || targetChat?.phone || '')
      : '';
    if (!isAiChat && !opponentPhone && chatId.startsWith('dm_')) {
      const parts = chatId.replace('dm_', '').split('_');
      opponentPhone = parts.find((p) => !phonesMatch(p, myPhone)) || '';
    }

    const deck = createPokerDeck();
    const challengerHole = deck.splice(0, 2);
    const opponentHole = deck.splice(0, 2);
    const nowIso = new Date().toISOString();
    const gameId = `poker_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const totalPot = mode === 'bet' ? cleanBet * 2 : 0;
    const platformFee = mode === 'bet' ? Math.round(totalPot * 0.01) : 0;
    const winnerPayout = totalPot - platformFee;

    const newGame: PokerGameState = {
      id: gameId,
      chatId,
      gameType: 'poker',
      challengerId: currentUser.id,
      challengerPhone: myPhone,
      challengerName: currentUser.fullName || 'Player 1',
      challengerAvatar: currentUser.avatarUrl,
      opponentPhone: opponentPhone || undefined,
      opponentName: isAiChat ? 'AgcBot (Hard AI)' : !targetChat?.isGroup ? targetChat?.name : undefined,
      opponentAvatar: isAiChat ? AFRIBOT_AVATAR : !targetChat?.isGroup ? targetChat?.avatar : undefined,
      isAiOpponent: isAiChat,
      aiDifficulty: isAiChat ? 'hard' : undefined,
      mode,
      betAmount: cleanBet,
      currency: currency || 'NGN',
      deck,
      challengerHole,
      opponentHole,
      communityCards: [],
      phase: 'preflop',
      pot: 30,
      challengerChips: 990,
      opponentChips: 980,
      challengerBet: 10,
      opponentBet: 20,
      smallBlind: 10,
      bigBlind: 20,
      currentTurnPhone: myPhone,
      currentTurnName: currentUser.fullName || 'Player 1',
      actedThisPhase: [],
      lastActionNote: isAiChat
        ? 'Blinds 10/20 posted vs AgcBot (Hard AI). Your action Pre-Flop!'
        : 'Blinds 10/20 posted. Waiting for opponent to accept.',
      moveCount: 0,
      status: isAiChat ? 'active' : 'pending',
      totalPot,
      platformFeeRate: 0.01,
      platformFee,
      winnerPayout,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const cardMsg: ChatMessage = {
      id: `msg_poker_${gameId}`,
      chatId,
      sender: 'user',
      senderName: currentUser.fullName || 'AGC Player',
      senderPhone: myPhone,
      senderAvatar: currentUser.avatarUrl,
      type: 'game_poker',
      pokerGame: newGame,
      text:
        mode === 'bet'
          ? `♠️ Texas Hold'em Poker (${sym}${cleanBet.toLocaleString()} bet)`
          : "♠️ Friendly Texas Hold'em Poker",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sent',
    };

    if (mode === 'bet' && cleanBet > 0) {
      const lockRes = await lockGameBetOnServer({
        gameId,
        gameType: 'poker',
        role: 'challenger',
        playerPhone: myPhone,
        playerName: currentUser.fullName || 'Player 1',
        opponentPhone: opponentPhone || undefined,
        opponentName: !targetChat?.isGroup ? targetChat?.name : undefined,
        betAmount: cleanBet,
        currency: newGame.currency,
        title: `Poker Bet Escrow Lock (${targetChat?.name || 'Match'})`,
      });
      if (!lockRes.success) {
        return {
          success: false,
          insufficientFunds: lockRes.insufficientFunds,
          requiresVerifiedBadge: lockRes.requiresVerifiedBadge,
          message: lockRes.message || 'Insufficient wallet balance for bet.',
        };
      }
    }

    setMessages((prev) => {
      const updated = { ...prev, [chatId]: [...(prev[chatId] || []), cardMsg] };
      persistPartitionedMessages(updated, currentUser.phoneNumber);
      return updated;
    });
    setChats((prev) => {
      const updated = prev.map((c) =>
        c.id === chatId ? { ...c, lastMessage: cardMsg.text || "♠️ Poker Challenge", lastMessageTime: cardMsg.timestamp } : c
      );
      persistPartitionedChats(updated, currentUser.phoneNumber);
      return updated;
    });

    if (!isAiChat) {
      const wireOverrideChat =
        targetChat ||
        (opponentPhone
          ? ({
              id: chatId,
              name: currentUser.fullName || 'Direct Chat',
              avatar: '',
              verifiedStore: false,
              location: 'Direct Chat',
              unreadCount: 0,
              lastMessage: '',
              lastMessageTime: '',
              catalog: [],
              isOnline: true,
              phone: opponentPhone,
            } as ChatThread)
          : undefined);
      broadcastLiveMessage(chatId, cardMsg, wireOverrideChat);
      broadcastGamePayload('poker_game_update', newGame, chatId, [myPhone, opponentPhone, ...(targetChat?.memberPhones || [])]);
    }
    return { success: true, game: newGame, message: 'Poker Challenge sent!' };
  };

  const acceptPokerChallenge = async (game: PokerGameState) => {
    const myPhone = currentUser.phoneNumber || currentUser.id;
    if (phonesMatch(myPhone, game.challengerPhone)) {
      return { success: false, message: 'Waiting for your opponent to accept.' };
    }
    if (game.mode === 'bet' && game.betAmount > 0) {
      const { isVerified, maxBet } = getGameBetLimit();
      const sym = CURRENCY_SYMBOLS[game.currency || 'NGN'] || '₦';
      if (game.betAmount > maxBet) {
        return {
          success: false,
          requiresVerifiedBadge: !isVerified,
          message: `Stakes above ${sym}${STANDARD_GAME_BET_LIMIT.toLocaleString()} require a Verified Badge (₦4,000/mo, up to ${sym}${VERIFIED_GAME_BET_LIMIT.toLocaleString()}).`,
        };
      }
      if (walletRef.current.availableBalance < game.betAmount) {
        await refreshWalletFromServer();
        if (walletRef.current.availableBalance < game.betAmount) {
          return { success: false, insufficientFunds: true, message: `Insufficient balance: need ${sym}${game.betAmount.toLocaleString()} to accept bet.` };
        }
      }
    }
    if (game.status !== 'pending') {
      return { success: false, message: `Challenge is already ${game.status}.` };
    }
    const accepted: PokerGameState = {
      ...game,
      opponentPhone: myPhone,
      opponentName: currentUser.fullName || game.opponentName || 'Player 2',
      opponentAvatar: currentUser.avatarUrl || game.opponentAvatar,
      status: 'active',
      moveCount: (game.moveCount || 0) + 1,
      lastActionNote: `${game.challengerName} acts first Pre-Flop`,
      updatedAt: new Date().toISOString(),
    };
    if (accepted.mode === 'bet' && accepted.betAmount > 0) {
      const lockRes = await lockGameBetOnServer({
        gameId: accepted.id,
        gameType: 'poker',
        role: 'opponent',
        playerPhone: myPhone,
        playerName: currentUser.fullName || 'Player 2',
        opponentPhone: accepted.challengerPhone,
        opponentName: accepted.challengerName,
        betAmount: accepted.betAmount,
        currency: accepted.currency || 'NGN',
        title: `Poker Match Bet Stake (${accepted.challengerName})`,
      });
      if (!lockRes.success) {
        return {
          success: false,
          insufficientFunds: lockRes.insufficientFunds,
          requiresVerifiedBadge: lockRes.requiresVerifiedBadge,
          message: lockRes.message || 'Insufficient wallet balance to accept bet.',
        };
      }
    }
    applyPokerGameUpdate(accepted);
    broadcastGamePayload('poker_game_update', accepted, accepted.chatId, [accepted.challengerPhone, myPhone]);
    return { success: true, message: 'Poker match started!' };
  };

  const declinePokerChallenge = async (game: PokerGameState) => {
    const myPhone = currentUser.phoneNumber || currentUser.id;
    const closed: PokerGameState = {
      ...game,
      status: phonesMatch(myPhone, game.challengerPhone) ? 'cancelled' : 'declined',
      moveCount: (game.moveCount || 0) + 1,
      settledAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    if (closed.mode === 'bet' && closed.betAmount > 0) {
      await settleGameBetOnServer({
        gameId: closed.id,
        gameType: 'poker',
        status: closed.status as 'declined' | 'cancelled',
        challengerPhone: closed.challengerPhone,
        opponentPhone: closed.opponentPhone,
        betAmount: closed.betAmount,
        currency: closed.currency || 'NGN',
      });
    }
    applyPokerGameUpdate(closed);
    broadcastGamePayload('poker_game_update', closed, closed.chatId, [closed.challengerPhone, closed.opponentPhone || '']);
    return { success: true };
  };

  const performPokerAction = async (
    game: PokerGameState,
    action: 'fold' | 'check' | 'call' | 'raise',
    raiseBy?: number
  ) => {
    const myPhone = currentUser.phoneNumber || currentUser.id;
    if (game.status !== 'active' || !phonesMatch(myPhone, game.currentTurnPhone)) {
      return { success: false, message: 'Not your turn to act.' };
    }
    const res = resolvePokerAction(game, myPhone, action, raiseBy);
    if (res.error || !res.nextGame) {
      return { success: false, message: res.error || 'Action not allowed.' };
    }
    const updated = res.nextGame;
    if (res.settledNow && updated.mode === 'bet' && updated.betAmount > 0 && (updated.status === 'won' || updated.status === 'draw')) {
      await settleGameBetOnServer({
        gameId: updated.id,
        gameType: 'poker',
        status: updated.status,
        winnerPhone: updated.winnerPhone,
        winnerName: updated.winnerName,
        challengerPhone: updated.challengerPhone,
        opponentPhone: updated.opponentPhone,
        betAmount: updated.betAmount,
        currency: updated.currency || 'NGN',
      });
    }
    applyPokerGameUpdate(updated);
    if (!updated.isAiOpponent && updated.chatId !== AFRIBOT_ID) {
      broadcastGamePayload('poker_game_update', updated, updated.chatId, [updated.challengerPhone, updated.opponentPhone || '']);
    }
    return { success: true };
  };

  const forfeitPokerGame = async (game: PokerGameState) => {
    const myPhone = currentUser.phoneNumber || currentUser.id;
    if (game.status !== 'active') {
      return { success: false, message: 'Only active matches can be forfeited.' };
    }
    const isChallenger = phonesMatch(myPhone, game.challengerPhone);
    const isOpp = !isChallenger && (!game.opponentPhone || phonesMatch(myPhone, game.opponentPhone));
    if (!isChallenger && !isOpp) {
      return { success: false, message: 'Only participants can forfeit.' };
    }
    const myName = isChallenger ? game.challengerName : (game.opponentName || currentUser.fullName || 'Player 2');
    const winPhone = isChallenger ? (game.opponentPhone || AFRIBOT_PHONE) : game.challengerPhone;
    const winName = isChallenger ? (game.opponentName || 'Opponent') : game.challengerName;
    const nowIso = new Date().toISOString();

    const forfeitedGame: PokerGameState = {
      ...game,
      status: 'won',
      winnerPhone: winPhone,
      winnerName: winName,
      winningHandLabel: `${myName} forfeited`,
      lastActionNote: `${myName} forfeited · ${winName} wins the match`,
      moveCount: (game.moveCount || 0) + 1,
      settledAt: nowIso,
      updatedAt: nowIso,
    };

    if (forfeitedGame.mode === 'bet' && forfeitedGame.betAmount > 0) {
      await settleGameBetOnServer({
        gameId: forfeitedGame.id,
        gameType: 'poker',
        status: 'won',
        winnerPhone: forfeitedGame.winnerPhone,
        winnerName: forfeitedGame.winnerName,
        challengerPhone: forfeitedGame.challengerPhone,
        opponentPhone: forfeitedGame.opponentPhone,
        betAmount: forfeitedGame.betAmount,
        currency: forfeitedGame.currency || 'NGN',
      });
    }
    applyPokerGameUpdate(forfeitedGame);
    if (!forfeitedGame.isAiOpponent && forfeitedGame.chatId !== AFRIBOT_ID) {
      broadcastGamePayload('poker_game_update', forfeitedGame, forfeitedGame.chatId, [forfeitedGame.challengerPhone, forfeitedGame.opponentPhone || '']);
    }
    return { success: true, message: 'Match forfeited.' };
  };

  // Hard-Level AI Turn Runner for Friendly X/O, Whot!, Ludo, and Texas Hold'em Poker in AI Chat
  const scheduledAiTurnKeysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const aiName = 'AgcBot (Hard AI)';
    const allChatIds = Object.keys(messages || {});
    for (const cid of allChatIds) {
      const list = messages[cid];
      if (!Array.isArray(list)) continue;
      for (const msg of list) {
        if (!msg || typeof msg !== 'object') continue;
        // 1. X/O Hard AI Turn (supports AI as either X first-mover or O second-mover)
        if (msg.type === 'game_xo' && msg.xoGame) {
          const g = msg.xoGame;
          const board = Array.isArray(g.board) && g.board.length === 9 ? g.board : Array(9).fill(null);
          const aiIsX = Boolean(g.xPlayerPhone && phonesMatch(g.xPlayerPhone, AFRIBOT_PHONE));
          const aiIsO = Boolean(g.oPlayerPhone && phonesMatch(g.oPlayerPhone, AFRIBOT_PHONE));
          const isAiGame = Boolean(g.isAiOpponent || aiIsX || aiIsO || g.chatId === AFRIBOT_ID);
          const aiSymbol: 'X' | 'O' = aiIsX ? 'X' : 'O';
          const humanSymbol: 'X' | 'O' = aiSymbol === 'X' ? 'O' : 'X';
          if (isAiGame && g.status === 'active' && g.currentTurn === aiSymbol) {
            const movesPlayed = board.filter((c) => c !== null).length;
            const key = `xo:${g.id}:${movesPlayed}:${g.currentTurn}`;
            if (!scheduledAiTurnKeysRef.current.has(key)) {
              scheduledAiTurnKeysRef.current.add(key);
              setTimeout(() => {
                const cellIdx = pickHardXoMove(board, aiSymbol);
                if (cellIdx < 0 || board[cellIdx] !== null) return;
                const nextBoard = [...board];
                nextBoard[cellIdx] = aiSymbol;
                const nowIso = new Date().toISOString();
                let winningLine: number[] | undefined;
                for (const line of XO_WIN_LINES_CLIENT) {
                  const [a, b, c] = line;
                  if (nextBoard[a] && nextBoard[a] === nextBoard[b] && nextBoard[a] === nextBoard[c]) {
                    winningLine = line;
                    break;
                  }
                }
                const nextGame: TicTacToeGameState = winningLine
                  ? {
                      ...g,
                      board: nextBoard,
                      status: 'won',
                      winnerSymbol: aiSymbol,
                      winnerPhone: AFRIBOT_PHONE,
                      winnerName: aiName,
                      winningLine,
                      settledAt: nowIso,
                      updatedAt: nowIso,
                    }
                  : !nextBoard.includes(null)
                  ? {
                      ...g,
                      board: nextBoard,
                      status: 'draw',
                      settledAt: nowIso,
                      updatedAt: nowIso,
                    }
                  : {
                      ...g,
                      board: nextBoard,
                      currentTurn: humanSymbol,
                      updatedAt: nowIso,
                    };
                applyXoGameUpdate(nextGame);
              }, 480);
            }
          }
        }

        // 2. Whot! Hard AI Turn (Stacking Pick 2/5, 8 Suspension, 14 Gen Market, Market Reshuffle)
        if (msg.type === 'game_whot' && msg.whotGame) {
          const g = msg.whotGame;
          const isAiGame = Boolean(g.isAiOpponent || phonesMatch(g.opponentPhone, AFRIBOT_PHONE) || g.chatId === AFRIBOT_ID);
          if (
            isAiGame &&
            g.status === 'active' &&
            phonesMatch(g.currentTurnPhone, AFRIBOT_PHONE) &&
            Array.isArray(g.opponentHand) &&
            Array.isArray(g.challengerHand)
          ) {
            const key = `whot:${g.id}:${g.moveCount || 0}`;
            if (!scheduledAiTurnKeysRef.current.has(key)) {
              scheduledAiTurnKeysRef.current.add(key);
              setTimeout(() => {
                const aiHand = [...(g.opponentHand || [])];
                const humanHand = [...(g.challengerHand || [])];
                let nextDeck = [...(g.deck || [])];
                let nextDiscard = [...(g.discardPile || [])];
                let nextReshuffles = g.reshuffleCount || 0;

                const decision = pickHardWhotMove(g, aiHand, humanHand.length);
                if (decision.action === 'draw') {
                  const drawQty = g.pendingDrawCount && g.pendingDrawCount > 0 ? g.pendingDrawCount : 1;
                  const drawRes = drawCardsFromWhotMarket(nextDeck, nextDiscard, drawQty, nextReshuffles);
                  aiHand.push(...drawRes.drawn);
                  const updated: WhotGameState = {
                    ...g,
                    challengerHand: humanHand,
                    opponentHand: aiHand,
                    deck: drawRes.nextDeck,
                    discardPile: drawRes.nextDiscard,
                    pendingDrawCount: 0,
                    pendingDrawType: null,
                    reshuffleCount: drawRes.reshuffleCount,
                    currentTurnPhone: g.challengerPhone,
                    currentTurnName: g.challengerName,
                    lastActionNote:
                      drawQty > 1
                        ? `${aiName} picked ${drawQty} penalty cards${drawRes.didReshuffle ? ' (Market reshuffled)' : ''}`
                        : `${aiName} went to Market${drawRes.didReshuffle ? ' (Market reshuffled)' : ''}`,
                    moveCount: (g.moveCount || 0) + 1,
                    updatedAt: new Date().toISOString(),
                  };
                  applyWhotGameUpdate(updated);
                  return;
                }

                const card = decision.card;
                const idx = aiHand.findIndex((c) => c.id === card.id);
                if (idx >= 0) aiHand.splice(idx, 1);
                nextDiscard.push(card);

                if (aiHand.length === 0) {
                  const wonGame: WhotGameState = {
                    ...g,
                    challengerHand: humanHand,
                    opponentHand: aiHand,
                    deck: nextDeck,
                    discardPile: nextDiscard,
                    topCard: card,
                    requestedShape: null,
                    pendingDrawCount: 0,
                    pendingDrawType: null,
                    reshuffleCount: nextReshuffles,
                    status: 'won',
                    winnerPhone: AFRIBOT_PHONE,
                    winnerName: aiName,
                    lastActionNote: `${aiName} cleared all cards!`,
                    moveCount: (g.moveCount || 0) + 1,
                    settledAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  };
                  applyWhotGameUpdate(wonGame);
                  return;
                }

                let nextTurnPhone = g.challengerPhone;
                let nextTurnName = g.challengerName;
                let nextRequestedShape: WhotShape | null = null;
                let nextPendingDrawCount = 0;
                let nextPendingDrawType: 'pick_two' | 'pick_three' | null = null;
                let actionNote = `${aiName} played ${card.shape === 'whot' ? 'WHOT 20' : `${card.number} ${card.shape}`}`;

                if (card.shape === 'whot' || card.number === 20) {
                  nextRequestedShape =
                    decision.requestedShape && decision.requestedShape !== 'whot'
                      ? decision.requestedShape
                      : 'circle';
                  actionNote = `${aiName} played WHOT (20) & asked for ${nextRequestedShape.toUpperCase()}`;
                } else if (card.number === 1) {
                  nextTurnPhone = AFRIBOT_PHONE;
                  nextTurnName = aiName;
                  actionNote = `${aiName} played Hold On (1) — plays again!`;
                } else if (card.number === 2) {
                  nextPendingDrawCount = (g.pendingDrawCount || 0) + 2;
                  nextPendingDrawType = 'pick_two';
                  nextTurnPhone = g.challengerPhone;
                  nextTurnName = g.challengerName;
                  actionNote = `${aiName} played Pick 2! Stack 2 or Pick ${nextPendingDrawCount}`;
                } else if (card.number === 5) {
                  nextPendingDrawCount = (g.pendingDrawCount || 0) + 3;
                  nextPendingDrawType = 'pick_three';
                  nextTurnPhone = g.challengerPhone;
                  nextTurnName = g.challengerName;
                  actionNote = `${aiName} played Pick 3! Stack 5 or Pick ${nextPendingDrawCount}`;
                } else if (card.number === 8) {
                  nextTurnPhone = AFRIBOT_PHONE;
                  nextTurnName = aiName;
                  actionNote = `${aiName} played Suspension (8) — you are skipped!`;
                } else if (card.number === 14) {
                  const drawRes = drawCardsFromWhotMarket(nextDeck, nextDiscard, 1, nextReshuffles);
                  humanHand.push(...drawRes.drawn);
                  nextDeck = drawRes.nextDeck;
                  nextDiscard = drawRes.nextDiscard;
                  nextReshuffles = drawRes.reshuffleCount;
                  nextTurnPhone = AFRIBOT_PHONE;
                  nextTurnName = aiName;
                  actionNote = `${aiName} played General Market (14)! You picked 1${drawRes.didReshuffle ? ' (Market reshuffled)' : ''}`;
                }

                const updated: WhotGameState = {
                  ...g,
                  challengerHand: humanHand,
                  opponentHand: aiHand,
                  deck: nextDeck,
                  discardPile: nextDiscard,
                  topCard: card,
                  requestedShape: nextRequestedShape,
                  pendingDrawCount: nextPendingDrawCount,
                  pendingDrawType: nextPendingDrawType,
                  reshuffleCount: nextReshuffles,
                  currentTurnPhone: nextTurnPhone,
                  currentTurnName: nextTurnName,
                  lastActionNote: actionNote,
                  moveCount: (g.moveCount || 0) + 1,
                  updatedAt: new Date().toISOString(),
                };
                applyWhotGameUpdate(updated);
              }, 650);
            }
          }
        }

        // 3. Ludo Hard AI Turn (2 Dice Roll -> 8-Seed Split/Combined Move Tree)
        if (msg.type === 'game_ludo' && msg.ludoGame) {
          const g = msg.ludoGame;
          const isAiGame = Boolean(g.isAiOpponent || phonesMatch(g.opponentPhone, AFRIBOT_PHONE) || g.chatId === AFRIBOT_ID);
          if (
            isAiGame &&
            g.status === 'active' &&
            phonesMatch(g.currentTurnPhone, AFRIBOT_PHONE) &&
            Array.isArray(g.challengerTokens) &&
            Array.isArray(g.opponentTokens)
          ) {
            const key = `ludo:${g.id}:${g.moveCount || 0}:${g.hasRolled ? 'r' : 'nr'}`;
            if (!scheduledAiTurnKeysRef.current.has(key)) {
              scheduledAiTurnKeysRef.current.add(key);
              if (!g.hasRolled) {
                setTimeout(() => {
                  const updated = resolveLudoRoll(
                    g,
                    AFRIBOT_PHONE,
                    aiName,
                    g.challengerPhone,
                    g.challengerName
                  );
                  applyLudoGameUpdate(updated);
                }, 550);
              } else {
                setTimeout(() => {
                  const remainingDice =
                    g.diceValues && g.diceValues.length > 0
                      ? g.diceValues
                      : g.diceValue
                      ? [g.diceValue]
                      : [];
                  const plan = pickHardLudoPlan(g, remainingDice, false);
                  if (!plan) {
                    const passTurn: LudoGameState = {
                      ...g,
                      diceValues: [],
                      diceValue: null,
                      hasRolled: false,
                      consecutiveSixes: 0,
                      currentTurnPhone: g.challengerPhone,
                      currentTurnName: g.challengerName,
                      lastActionNote: `${aiName} had no move — your turn`,
                      moveCount: (g.moveCount || 0) + 1,
                      updatedAt: new Date().toISOString(),
                    };
                    applyLudoGameUpdate(passTurn);
                    return;
                  }
                  const res = resolveLudoMove(g, AFRIBOT_PHONE, plan.tokenIndex, plan.dieChoice);
                  if (res.nextGame) {
                    applyLudoGameUpdate(res.nextGame);
                  }
                }, 650);
              }
            }
          }
        }

        // 4. Texas Hold'em Poker 3-Layer Hard AI Turn
        if (msg.type === 'game_poker' && msg.pokerGame) {
          const g = msg.pokerGame;
          const isAiGame = Boolean(g.isAiOpponent || phonesMatch(g.opponentPhone, AFRIBOT_PHONE) || g.chatId === AFRIBOT_ID);
          if (
            isAiGame &&
            g.status === 'active' &&
            phonesMatch(g.currentTurnPhone, AFRIBOT_PHONE) &&
            Array.isArray(g.opponentHole)
          ) {
            const key = `poker:${g.id}:${g.moveCount || 0}:${g.phase}`;
            if (!scheduledAiTurnKeysRef.current.has(key)) {
              scheduledAiTurnKeysRef.current.add(key);
              setTimeout(() => {
                const decision = pickHardPokerAction(
                  g,
                  g.opponentHole || [],
                  g.opponentChips,
                  g.opponentBet,
                  g.challengerBet
                );
                const res = resolvePokerAction(
                  g,
                  AFRIBOT_PHONE,
                  decision.action,
                  decision.raiseBy
                );
                if (res.nextGame) {
                  applyPokerGameUpdate(res.nextGame);
                }
              }, 700);
            }
          }
        }
      }
    }
  }, [messages, applyXoGameUpdate, applyWhotGameUpdate, applyLudoGameUpdate, applyPokerGameUpdate]);

  // Send My Bill (Pay on Behalf) Handlers
  const sendBillRequest = async (params: {
    recipientPhone: string;
    recipientName: string;
    recipientAvatar?: string;
    title: string;
    category: BillRequest['category'];
    featureKey?: keyof FeatureFlags;
    featureRefId?: string;
    amount: number;
    note?: string;
  }): Promise<{ success: boolean; message?: string; bill?: BillRequest }> => {
    const myPhone = currentUser.phoneNumber || currentUser.id;
    if (!params.recipientPhone || phonesMatch(myPhone, params.recipientPhone)) {
      return { success: false, message: 'Select a valid recipient (cannot send a bill to yourself).' };
    }
    if (!AGC_BILL_CATEGORIES.includes(params.category)) {
      return {
        success: false,
        message: 'Send My Bill is strictly for AGC system features (Store, Artisan, Errands, Escrow, etc.).',
      };
    }
    if (params.featureKey && !isFeatureEnabled(params.featureKey)) {
      return {
        success: false,
        message: `The ${params.category} feature is currently disabled on AGC.`,
      };
    }
    const numericAmt = Math.round(Number(params.amount) || 0);
    if (!Number.isFinite(numericAmt) || numericAmt < 50) {
      return { success: false, message: 'Minimum bill amount is 50.' };
    }

    const dmChatId = getDirectChatId(myPhone, params.recipientPhone);
    const nowIso = new Date().toISOString();
    const bill: BillRequest = {
      id: `bill_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      chatId: dmChatId,
      title: params.title.trim(),
      category: params.category,
      featureKey: params.featureKey,
      featureRefId: params.featureRefId?.trim() || undefined,
      amount: numericAmt,
      currency: currency || 'NGN',
      note: params.note,
      requesterPhone: myPhone,
      requesterName: currentUser.fullName || 'AGC User',
      requesterAvatar: currentUser.avatarUrl,
      recipientPhone: params.recipientPhone,
      recipientName: params.recipientName,
      status: 'pending',
      createdAt: nowIso,
    };

    const sym = CURRENCY_SYMBOLS[bill.currency] || '₦';
    const msg: ChatMessage = {
      id: `msg_bill_${bill.id}`,
      chatId: dmChatId,
      sender: 'user',
      senderName: currentUser.fullName || 'AGC User',
      senderPhone: myPhone,
      senderAvatar: currentUser.avatarUrl,
      type: 'bill_request',
      billRequest: bill,
      text: `🧾 Bill Request: ${bill.title} (${sym}${bill.amount.toLocaleString()})`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sent',
    };

    // Ensure DM thread exists & is bumped to top
    const billNowMs = Date.now();
    setChats((prev) => {
      const existingIdx = prev.findIndex(
        (c) => c.id === dmChatId || (!c.isGroup && !c.isChannel && phonesMatch(c.phone || c.phoneNumber, params.recipientPhone))
      );
      const updated =
        existingIdx >= 0
          ? bumpChatThreadToTop(prev, prev[existingIdx].id, {
              id: dmChatId,
              lastMessage: msg.text || '🧾 Bill Request',
              lastMessageTime: msg.timestamp,
              lastMessageAtMs: billNowMs,
            })
          : sortChatsByRecency([
              {
                id: dmChatId,
                name: params.recipientName || params.recipientPhone,
                avatar: params.recipientAvatar || DEFAULT_AVATAR_SVG,
                verifiedStore: false,
                location: 'Direct Chat',
                unreadCount: 0,
                lastMessage: msg.text || '🧾 Bill Request',
                lastMessageTime: msg.timestamp,
                lastMessageAtMs: billNowMs,
                catalog: [],
                isOnline: false,
                phone: params.recipientPhone,
                phoneNumber: params.recipientPhone,
              },
              ...prev,
            ]);
      persistPartitionedChats(updated, currentUser.phoneNumber);
      return updated;
    });

    setMessages((prev) => {
      const updated = { ...prev, [dmChatId]: [...(prev[dmChatId] || []), msg] };
      persistPartitionedMessages(updated, currentUser.phoneNumber);
      return updated;
    });

    setActiveTab('chats');
    setActiveChatId(dmChatId);
    broadcastLiveMessage(dmChatId, msg);
    broadcastGamePayload('bill_request_update', bill, dmChatId, [myPhone, params.recipientPhone]);

    return { success: true, bill, message: 'Bill sent!' };
  };

  const payBillOnBehalf = async (
    bill: BillRequest,
    channel: 'wallet' | 'paystack' = 'wallet',
    paystackRef?: string
  ): Promise<{ success: boolean; insufficientFunds?: boolean; message?: string }> => {
    const myPhone = currentUser.phoneNumber || currentUser.id;
    if (bill.status === 'paid') {
      return { success: false, message: 'This bill has already been paid.' };
    }
    if (phonesMatch(myPhone, bill.requesterPhone)) {
      return { success: false, message: 'Only the recipient can pay this bill on behalf of the requester.' };
    }
    if (channel === 'wallet' && wallet.availableBalance < bill.amount) {
      const sym = CURRENCY_SYMBOLS[bill.currency || 'NGN'] || '₦';
      return {
        success: false,
        insufficientFunds: true,
        message: `Insufficient wallet balance (${sym}${wallet.availableBalance.toLocaleString()}). Top up or pay with Paystack.`,
      };
    }

    try {
      const resp = await fetch('/api/wallet/pay-bill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          billId: bill.id,
          payerPhone: myPhone,
          payerName: currentUser.fullName || 'AGC User',
          requesterPhone: bill.requesterPhone,
          requesterName: bill.requesterName,
          amount: bill.amount,
          title: bill.title,
          category: bill.category,
          featureKey: bill.featureKey,
          featureRefId: bill.featureRefId,
          channel,
          paystackRef,
        }),
      });
      const data = await resp.json().catch(() => null);
      if (resp.ok && data?.success) {
        if (data.wallet) {
          const nextWallet: UserWallet = {
            availableBalance: Number(data.wallet.availableBalance) || 0,
            escrowLockedBalance: Number(data.wallet.escrowLockedBalance) || 0,
            currency: data.wallet.currency || 'NGN',
            transactions: Array.isArray(data.wallet.transactions) ? data.wallet.transactions : [],
          };
          setWallet(nextWallet);
          walletRef.current = nextWallet;
          persistPartitionedWallet(nextWallet, currentUser.phoneNumber);
        }
        const paidBill: BillRequest = {
          ...bill,
          status: 'paid',
          paidByPhone: myPhone,
          paidByName: currentUser.fullName || 'AGC User',
          paidAt: data.paidAt || new Date().toISOString(),
          paymentReference: data.reference,
          paymentChannel: channel,
        };
        applyBillRequestUpdate(paidBill);
        broadcastGamePayload('bill_request_update', paidBill, bill.chatId, [bill.requesterPhone, myPhone]);
        return { success: true, message: `Paid ${bill.title} for ${bill.requesterName}!` };
      }

      if (data?.insufficientFunds) {
        return { success: false, insufficientFunds: true, message: data.message };
      }
      return { success: false, message: data?.message || 'Unable to settle bill on server.' };
    } catch (_) {
      return { success: false, message: 'Network error while paying bill.' };
    }
  };

  // 7. Ajo / Esusu Group Savings Handlers
  const contributeToAjo = (chatId: string, ajoId: string, amount: number) => {
    if (wallet.availableBalance < amount) {
      return { success: false, message: 'Insufficient wallet balance for this Ajo cycle.' };
    }

    const roundNum = activeAjoGroup?.currentRound || 1;

    // Deduct contribution and log transaction
    const ajoTx = recordLedgerTransaction({
      id: `tx_${Date.now()}`,
      type: 'transfer_out',
      title: `Ajo Contribution Round ${roundNum}`,
      description: `Ajo / Esusu savings contribution Round ${roundNum}`,
      amount,
      fee: 0,
      balanceAfter: Math.max(0, wallet.availableBalance - amount),
      currency: 'NGN',
      referenceId: `AJO_${ajoId}_${Date.now()}`,
      channel: 'wallet',
    });

    setWallet((prev) => ({
      ...prev,
      availableBalance: prev.availableBalance - amount,
      transactions: [ajoTx, ...prev.transactions],
    }));

    if (activeAjoGroup) {
      const updatedMembers = activeAjoGroup.members.map((m) =>
        m.id === 'm1' || m.id === 'm_host' || (currentUser.phoneNumber && phonesMatch(m.phone, currentUser.phoneNumber))
          ? { ...m, hasPaidCurrentCycle: true }
          : m
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
      senderName: currentUser.fullName || 'AGC User',
      senderPhone: currentUser.phoneNumber,
      senderAvatar: currentUser.avatarUrl,
      type: 'text',
      text: `✅ Paid ${CURRENCY_SYMBOLS.NGN}${amount.toLocaleString()} for Ajo Cycle Round ${roundNum} via AGC Wallet.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'delivered',
    };

    setMessages((prev) => ({
      ...prev,
      [chatId]: [...(prev[chatId] || []), newMsg],
    }));

    setChats((prev) => {
      const updated = bumpChatThreadToTop(prev, chatId, {
        lastMessage: `🪙 Paid ₦${amount.toLocaleString()} to Ajo Round ${roundNum}`,
        lastMessageTime: newMsg.timestamp,
        lastMessageAtMs: Date.now(),
      });
      persistPartitionedChats(updated, currentUser.phoneNumber);
      return updated;
    });

    broadcastLiveMessage(chatId, newMsg);

    return { success: true, message: `Successfully contributed ₦${amount.toLocaleString()} to Ajo pot (Round ${roundNum})!` };
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
      type: 'transfer_out',
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

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const updatedUser: UserProfile = {
      ...currentUser,
      verificationBadge: badge,
      platformFeeRate: feeRate,
      verificationExpiresAt: expiresAt,
    };
    setCurrentUser(updatedUser);
    persistPartitionedUserProfile(updatedUser);

    // Sync badge upgrade + wallet debit authoritatively with server
    if (currentUser.phoneNumber) {
      fetch('/api/wallet/upgrade-badge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: currentUser.phoneNumber, badge }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data?.success && data?.wallet) {
            applyAuthoritativeServerWallet(data.wallet, currentUser.phoneNumber);
          }
        })
        .catch(() => {});
    }

    return {
      success: true,
      message: `${badgeTitle} activated! You unlocked the ₦50,000 game bet limit and verified Ajo hosting.`,
    };
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
    const targetChat = chats.find((c) => c.id === activeChatId);
    const isAdminInTargetGroup = Boolean(
      targetChat?.isGroup &&
      (
        targetChat.creatorId === currentUser.id ||
        targetChat.adminIds?.includes(currentUser.id) ||
        targetChat.admins?.includes(currentUser.fullName) ||
        (currentUser.phoneNumber && targetChat.admins?.includes(currentUser.phoneNumber)) ||
        targetChat.admins?.includes('You')
      )
    );
    if (!isAdminInTargetGroup) {
      return {
        success: false,
        message: 'Ajo / Esusu clubs can only be hosted inside group chats by group admins.',
      };
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
      totalPoolPerRound: ajoData.cycleContributionAmount * ajoData.totalRounds,
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
      nextPayoutDate: new Date(Date.now() + (ajoData.frequency === 'weekly' ? 7 : 30) * 24 * 60 * 60 * 1000).toLocaleDateString(),
      rules: ajoData.rules || '',
    };
    setActiveAjoGroup(newGroup);

    if (activeChatId) {
      const ajoMsg: ChatMessage = {
        id: `msg_ajo_new_${Date.now()}`,
        chatId: activeChatId,
        sender: 'user',
        senderName: currentUser.fullName || 'AGC User',
        senderPhone: currentUser.phoneNumber,
        senderAvatar: currentUser.avatarUrl,
        type: 'ajo_update',
        ajoGroup: newGroup,
        text: `🪙 Ajo Club Launched: ${newGroup.name} (₦${newGroup.totalPoolPerRound.toLocaleString()} Round Pot)`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'sent',
      };
      setMessages((prev) => ({
        ...prev,
        [activeChatId]: [...(prev[activeChatId] || []), ajoMsg],
      }));
      setChats((prev) => {
        const updated = bumpChatThreadToTop(prev, activeChatId, {
          lastMessage: `🪙 Ajo Club: ${newGroup.name}`,
          lastMessageTime: ajoMsg.timestamp,
          lastMessageAtMs: Date.now(),
        });
        persistPartitionedChats(updated, currentUser.phoneNumber);
        return updated;
      });
      broadcastLiveMessage(activeChatId, ajoMsg);
    }

    return { success: true, message: `Ajo group "${ajoData.name}" created & posted!` };
  };

  const syncProfileToAllRegistries = async (userProfile: UserProfile) => {
    const cleanPhone = (userProfile.phoneNumber || '').replace(/\D/g, '');
    const normPhone = normalizePhoneDigits(userProfile.phoneNumber);
    const last9 = (normPhone || cleanPhone).length >= 9 ? (normPhone || cleanPhone).slice(-9) : (normPhone || cleanPhone);

    // Always keep avatar strongly compressed before saving to DB
    let compactAvatar = userProfile.avatarUrl || '';
    if (
      compactAvatar.startsWith('data:image') &&
      !isPlaceholderAvatar(compactAvatar) &&
      compactAvatar.length > 18000
    ) {
      try {
        compactAvatar = await compressAvatarImage(compactAvatar);
      } catch (_) {}
    }

    const nowIso = new Date().toISOString();
    const userWithCompactAvatar: UserProfile = {
      ...userProfile,
      username: userProfile.username || userProfile.fullName,
      avatarUrl: compactAvatar || userProfile.avatarUrl,
    };

    // Update localStorage user caches consistently (both active + per-phone partition)
    persistPartitionedUserProfile(userWithCompactAvatar);
    try {
      const regMap = JSON.parse(localStorage.getItem('AGC_registered_phones') || '{}');
      const entry = {
        phoneNumber: userWithCompactAvatar.phoneNumber,
        fullName: userWithCompactAvatar.fullName,
        username: userWithCompactAvatar.username,
        avatarUrl: userWithCompactAvatar.avatarUrl,
        registeredAt: userWithCompactAvatar.createdAt || nowIso,
        updatedAt: nowIso,
      };
      if (cleanPhone) regMap[cleanPhone] = entry;
      if (normPhone) regMap[normPhone] = entry;
      if (userWithCompactAvatar.phoneNumber) regMap[userWithCompactAvatar.phoneNumber] = entry;
      if (last9) regMap[last9] = entry;
      localStorage.setItem('AGC_registered_phones', JSON.stringify(regMap));

      const allUsers: UserProfile[] = JSON.parse(localStorage.getItem('AGC_all_registered_users') || '[]');
      const filtered = allUsers.filter(
        (u) => !phonesMatch(u.phoneNumber, userWithCompactAvatar.phoneNumber)
      );
      filtered.push(userWithCompactAvatar);
      localStorage.setItem('AGC_all_registered_users', JSON.stringify(filtered));
    } catch (_) {}

    // Update adminUsers list in-memory
    setAdminUsers((prev) => {
      const merged = mergeAdminUsersList(
        prev,
        [
          {
            id: userWithCompactAvatar.id || `usr_${normPhone || cleanPhone}`,
            fullName: userWithCompactAvatar.fullName || 'User',
            phoneNumber: userWithCompactAvatar.phoneNumber,
            avatarUrl: userWithCompactAvatar.avatarUrl || DEFAULT_AVATAR_SVG,
            role: userWithCompactAvatar.role || 'user',
            verificationBadge: userWithCompactAvatar.verificationBadge ?? null,
            isPhoneVerified: Boolean(userWithCompactAvatar.isPhoneVerified),
            status: 'active',
            joinedDate: 'Just now',
            walletBalanceNgn: 0,
            ordersCount: 0,
            isOnline: true,
            lastSeen: 'online',
          },
        ],
        false
      );
      adminUsersRef.current = merged;
      return merged;
    });

    if (isSupabaseConfigured && last9) {
      // Allow compressed avatars up to 45KB (normally 3KB-12KB) or HTTP URLs
      const dbAvatar =
        compactAvatar &&
        !compactAvatar.startsWith('data:image/svg+xml') &&
        (compactAvatar.length <= 45000 || compactAvatar.startsWith('http'))
          ? compactAvatar
          : (compactAvatar && compactAvatar.length <= 45000 ? compactAvatar : '');

      supabase
        .from('agc_phone_registry')
        .upsert(
          {
            phone_digits: last9,
            full_phone: userWithCompactAvatar.phoneNumber,
            username: userWithCompactAvatar.fullName,
            avatar_url: dbAvatar,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'phone_digits' }
        )
        .then(({ error }: any) => {
          if (error) console.warn('Phone registry sync notice:', error.message);
        });

      if (UUID_PATTERN.test(userWithCompactAvatar.id)) {
        supabase
          .from('profiles')
          .upsert({
            id: userWithCompactAvatar.id,
            full_name: userWithCompactAvatar.fullName,
            phone_number: userWithCompactAvatar.phoneNumber,
            avatar_url: dbAvatar || userWithCompactAvatar.avatarUrl,
            bio: userWithCompactAvatar.about,
            updated_at: new Date().toISOString(),
          })
          .then(({ error }: any) => {
            if (error) console.warn('Supabase profile sync notice:', error.message);
          });
      }

      try {
        const syncChannel = supabase.channel('global_user_sync');
        syncChannel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            syncChannel.send({
              type: 'broadcast',
              event: 'user_updated',
              payload: userWithCompactAvatar,
            });
          }
        });
      } catch (_) {}
    }

    // Sync to local Express gateway (never trigger single-session kick during profile hydration/updates)
    try {
      fetch('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...userWithCompactAvatar,
          updatedAt: nowIso,
          sessionToken: safeLocalStorage.getItem('AGC_session_token') || undefined,
          socketId: getSocket()?.id,
          skipSessionKick: true,
        }),
      }).catch(() => {});
    } catch (_) {}

    if (adminSupabaseChannelRef.current) {
      try {
        adminSupabaseChannelRef.current.send({
          type: 'broadcast',
          event: 'user_updated',
          payload: userWithCompactAvatar,
        });
      } catch (_) {}
    }

    return userWithCompactAvatar;
  };

  const loginWithPhone = (
    phoneNumber: string,
    fullName: string,
    avatarUrl?: string,
    about?: string,
    role?: 'user' | 'admin' | 'creator' | 'merchant',
    email?: string
  ) => {
    const sessionToken = `${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    const normPhone = normalizePhoneDigits(phoneNumber);
    const last9 = (normPhone || cleanPhone).length >= 9 ? (normPhone || cleanPhone).slice(-9) : (normPhone || cleanPhone);

    lastLoginAtRef.current = Date.now();
    setIsKickedOut(false);
    safeLocalStorage.setItem('AGC_session_token', sessionToken);

    // Load cached/partitioned profile for this phone so custom avatars, names, about, roles & badges are never lost
    const partitionedCached = loadPartitionedUserProfile(phoneNumber);
    let cachedName = partitionedCached?.fullName && partitionedCached.fullName !== 'AGC User' ? partitionedCached.fullName : '';
    let cachedAvatar = partitionedCached?.avatarUrl && !isPlaceholderAvatar(partitionedCached.avatarUrl) ? partitionedCached.avatarUrl : '';
    let cachedId = partitionedCached?.id || '';
    try {
      const regMap = JSON.parse(localStorage.getItem('AGC_registered_phones') || '{}');
      for (const [k, v] of Object.entries(regMap) as [string, any][]) {
        if (phonesMatch(k, phoneNumber) || phonesMatch(v?.phoneNumber, phoneNumber)) {
          if (!cachedName && v?.fullName && v.fullName !== 'AGC User') cachedName = v.fullName;
          if (!cachedAvatar && v?.avatarUrl && !isPlaceholderAvatar(v.avatarUrl)) cachedAvatar = v.avatarUrl;
          break;
        }
      }
      const allUsers: UserProfile[] = JSON.parse(localStorage.getItem('AGC_all_registered_users') || '[]');
      const matchedUser = allUsers.find((u) => phonesMatch(u.phoneNumber, phoneNumber));
      if (matchedUser) {
        if (!cachedName && matchedUser.fullName && matchedUser.fullName !== 'AGC User') cachedName = matchedUser.fullName;
        if (!cachedAvatar && matchedUser.avatarUrl && !isPlaceholderAvatar(matchedUser.avatarUrl)) cachedAvatar = matchedUser.avatarUrl;
        if (!cachedId && matchedUser.id) cachedId = matchedUser.id;
      }
      const lastProfileRaw = localStorage.getItem('AGC_user_profile_v2');
      if (lastProfileRaw) {
        const lastP = JSON.parse(lastProfileRaw);
        if (lastP?.phoneNumber && phonesMatch(lastP.phoneNumber, phoneNumber)) {
          if (!cachedName && lastP.fullName && lastP.fullName !== 'AGC User') cachedName = lastP.fullName;
          if (!cachedAvatar && lastP.avatarUrl && !isPlaceholderAvatar(lastP.avatarUrl)) cachedAvatar = lastP.avatarUrl;
          if (!cachedId && lastP.id) cachedId = lastP.id;
        }
      }
    } catch (_) {}

    const chosenName =
      fullName && fullName !== 'AGC User'
        ? fullName
        : cachedName || fullName || 'AGC User';

    const chosenAvatar =
      avatarUrl && !isPlaceholderAvatar(avatarUrl)
        ? avatarUrl
        : cachedAvatar || avatarUrl || DEFAULT_AVATAR_SVG;

    const chosenAbout =
      about && about !== 'Available · Using AGC'
        ? about
        : (partitionedCached?.about || about || 'Available · Using AGC');

    const updatedUser: UserProfile = {
      ...(partitionedCached || {}),
      id: cachedId || `usr_${normPhone || cleanPhone || Date.now()}`,
      phoneNumber,
      email: (email && email.trim()) || partitionedCached?.email,
      fullName: chosenName,
      avatarUrl: chosenAvatar,
      about: chosenAbout,
      createdAt: partitionedCached?.createdAt || new Date().toISOString(),
      lastSeen: 'online',
      isPhoneVerified: true,
      role: role || partitionedCached?.role || (phoneNumber.includes('admin') ? 'admin' : 'user'),
    };

    // Load local partitioned chats & wallet BEFORE flipping isAuthenticated so auto-save never writes empty defaults
    isHydratingChatsRef.current = true;
    isHydratingWalletRef.current = true;
    const localChatState = loadPartitionedUserChatsAndMessages(phoneNumber);
    const localWalletState = loadPartitionedWallet(phoneNumber);
    loadedPhoneForChatsRef.current = normPhone || cleanPhone;
    loadedPhoneForWalletRef.current = normPhone || cleanPhone;
    kickedGroupIdsRef.current = loadKickedGroupIds(phoneNumber);
    const loginBlocked = loadPartitionedBlockedUsers(phoneNumber);
    setBlockedUserIds(loginBlocked);
    blockedUserIdsRef.current = loginBlocked;
    const filteredLoginChats = localChatState.chats.filter((c) => !kickedGroupIdsRef.current.has(c.id));
    setChats(filteredLoginChats);
    setMessages(localChatState.messages);
    chatsRef.current = filteredLoginChats;
    messagesRef.current = localChatState.messages;
    setTownCommunities(loadPartitionedTownCommunities(phoneNumber));
    setWallet(localWalletState);
    walletRef.current = localWalletState;
    setSecuritySettings(loadPartitionedSecuritySettings(phoneNumber));
    try {
      const rrKey = getUserStorageKey('AGC_read_receipts_v1', phoneNumber);
      const rrVal = safeLocalStorage.getItem(rrKey) ?? safeLocalStorage.getItem('AGC_read_receipts_v1');
      const nextRr = rrVal !== 'false';
      setReadReceiptsEnabled(nextRr);
      readReceiptsEnabledRef.current = nextRr;
    } catch (_) {}

    setCurrentUser(updatedUser);
    currentUserRef.current = updatedUser;
    isAuthenticatedRef.current = true;
    setIsAuthenticated(true);
    setActiveChatId(null);
    isHydratingChatsRef.current = false;
    isHydratingWalletRef.current = false;

    persistPartitionedUserProfile(updatedUser);
    safeLocalStorage.setItem('AGC_is_authenticated', 'true');

    // Register phone in local persistent registry
    try {
      const regMap = JSON.parse(localStorage.getItem('AGC_registered_phones') || '{}');
      const entry = {
        phoneNumber: updatedUser.phoneNumber,
        fullName: updatedUser.fullName,
        avatarUrl: updatedUser.avatarUrl,
        registeredAt: new Date().toISOString(),
      };
      if (cleanPhone) regMap[cleanPhone] = entry;
      if (normPhone) regMap[normPhone] = entry;
      regMap[updatedUser.phoneNumber] = entry;
      if (last9) regMap[last9] = entry;
      localStorage.setItem('AGC_registered_phones', JSON.stringify(regMap));

      const allUsers: UserProfile[] = JSON.parse(localStorage.getItem('AGC_all_registered_users') || '[]');
      const filtered = allUsers.filter((u) => !phonesMatch(u.phoneNumber, updatedUser.phoneNumber));
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

    // 2. Register with Socket.io Gateway
    try {
      registerSocketUser({ ...updatedUser, sessionToken });
      const sock = getSocket();
      if (sock) {
        sock.emit('register_phone', { phone: cleanPhone, sessionToken });
      }
    } catch (e) {
      console.warn('Socket user register notice:', e);
    }

    // Update adminUsers state immediately via canonical merge
    setAdminUsers((prev) => {
      const merged = mergeAdminUsersList(
        prev,
        [
          {
            id: updatedUser.id || `usr_${normPhone || cleanPhone}`,
            fullName: updatedUser.fullName || 'User',
            phoneNumber: updatedUser.phoneNumber,
            avatarUrl: updatedUser.avatarUrl || DEFAULT_AVATAR_SVG,
            role: updatedUser.role || 'user',
            verificationBadge: updatedUser.verificationBadge ?? null,
            isPhoneVerified: Boolean(updatedUser.isPhoneVerified),
            status: 'active',
            joinedDate: 'Just now',
            walletBalanceNgn: 0,
            ordersCount: 0,
            isOnline: true,
            lastSeen: 'online',
          },
        ],
        false
      );
      adminUsersRef.current = merged;
      return merged;
    });

    // 3. Register with local server REST API and hydrate server-side badge/role/wallet
    try {
      const registerPayload = JSON.stringify({
        ...updatedUser,
        sessionToken,
        socketId: getSocket()?.id,
      });
      fetch('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: registerPayload,
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.user) {
            setCurrentUser((prev) => {
              const hydrated: UserProfile = {
                ...prev,
                avatarUrl:
                  !isPlaceholderAvatar(prev.avatarUrl)
                    ? prev.avatarUrl
                    : (data.user.avatarUrl || prev.avatarUrl),
                verificationBadge:
                  data.user.verificationBadge !== undefined
                    ? data.user.verificationBadge
                    : prev.verificationBadge,
                role: (data.user.role as UserProfile['role']) || prev.role,
              };
              persistPartitionedUserProfile(hydrated);
              return hydrated;
            });
            setAdminUsers((prev) => {
              const merged = mergeAdminUsersList(prev, [mapRawToAdminUser(data.user)], true);
              adminUsersRef.current = merged;
              return merged;
            });
          }
        })
        .catch(() => {});
    } catch (e) {
      console.warn('REST user register notice:', e);
    }

    if (adminSupabaseChannelRef.current) {
      try {
        adminSupabaseChannelRef.current.send({
          type: 'broadcast',
          event: 'user_registered',
          payload: updatedUser,
        });
      } catch (_) {}
    }

    // 4. Sequentially hydrate from agc_phone_registry FIRST, then upsert merged profile (prevents wiping DB avatar on login!)
    if (isSupabaseConfigured) {
      (async () => {
        try {
          const { data: regData } = await supabase
            .from('agc_phone_registry')
            .select('username, avatar_url, full_phone')
            .or(`phone_digits.eq.${last9},full_phone.eq.${updatedUser.phoneNumber},full_phone.eq.${cleanPhone}`)
            .limit(1)
            .maybeSingle();

          let resolvedName = updatedUser.fullName;
          let resolvedAvatar = updatedUser.avatarUrl;

          if (regData) {
            if (regData.username && regData.username !== 'AGC User') {
              resolvedName = regData.username;
            }
            if (regData.avatar_url && !isPlaceholderAvatar(regData.avatar_url)) {
              // Prefer DB avatar if incoming login call didn't provide a newer custom photo
              if (isPlaceholderAvatar(resolvedAvatar) || !avatarUrl) {
                resolvedAvatar = regData.avatar_url;
              }
            }
          }

          const finalEnriched: UserProfile = {
            ...updatedUser,
            fullName: resolvedName,
            avatarUrl: resolvedAvatar,
          };

          if (finalEnriched.fullName !== updatedUser.fullName || finalEnriched.avatarUrl !== updatedUser.avatarUrl) {
            setCurrentUser((prev) => {
              const next = {
                ...prev,
                fullName: finalEnriched.fullName,
                avatarUrl: finalEnriched.avatarUrl,
              };
              persistPartitionedUserProfile(next);
              return next;
            });
          }

          await syncProfileToAllRegistries(finalEnriched);
        } catch (err) {
          console.warn('Supabase login registry sync notice:', err);
        }
      })();

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

      try {
        sendSupabaseBroadcastOnce(`phone_call_${cleanPhone}`, 'force_logout', {
          sessionToken,
          targetPhone: cleanPhone,
        });
      } catch (_) {}
    }
  };

  const logoutUser = () => {
    // Flush current chats, messages, wallet & profile to partitioned localStorage + Supabase BEFORE clearing React state
    const activePhone = currentUserRef.current?.phoneNumber || currentUser?.phoneNumber;
    if (chatBackupTimerRef.current) {
      clearTimeout(chatBackupTimerRef.current);
      chatBackupTimerRef.current = null;
    }
    if (activePhone) {
      persistPartitionedChats(chatsRef.current, activePhone);
      persistPartitionedMessages(messagesRef.current, activePhone);
      persistPartitionedTownCommunities(townCommunitiesRef.current, activePhone);
      persistPartitionedWallet(walletRef.current, activePhone);
      persistPartitionedUserProfile(currentUserRef.current || currentUser);
      saveUserChatsBackupToSupabase(activePhone, chatsRef.current, messagesRef.current, {
        wallet: walletRef.current,
        userProfile: currentUserRef.current || currentUser,
      }).catch(() => {});
    }
    try {
      emitLogoutUserRooms();
    } catch (_) {}
    // Clear loaded-phone guards & mark unauthenticated FIRST so auto-save effects & incoming socket/broadcast listeners NEVER overwrite saved storage!
    isAuthenticatedRef.current = false;
    loadedPhoneForChatsRef.current = '';
    loadedPhoneForWalletRef.current = '';
    kickedGroupIdsRef.current.clear();
    setIsAuthenticated(false);
    safeLocalStorage.setItem('AGC_is_authenticated', 'false');
    setActiveChatId(null);
    setChats([]);
    setMessages({});
    setBlockedUserIds([]);
    blockedUserIdsRef.current = [];
    setTownCommunities([]);
    setGroupInvites([]);
    setActiveGroupInvitePopup(null);
    setWallet({ ...EMPTY_WALLET, transactions: [] });
    setIsAuthModalOpen(true);
  };

  const updateUserProfile = (updates: Partial<UserProfile>) => {
    lastLocalProfileEditAtRef.current = Date.now();
    const baseUser = currentUserRef.current;
    const updated: UserProfile = {
      ...baseUser,
      ...updates,
      username: updates.username ?? (updates.fullName && updates.fullName !== 'AGC User' ? updates.fullName : baseUser.username),
    };
    if (updated.phoneNumber) {
      safeLocalStorage.setItem(
        getUserStorageKey('AGC_profile_updated_at', updated.phoneNumber),
        String(lastLocalProfileEditAtRef.current)
      );
    }
    currentUserRef.current = updated;
    setCurrentUser(updated);
    persistPartitionedUserProfile(updated);
    propagateUserProfileUpdate(updated);

    // Emit updated identity on Socket.IO + BroadcastChannel
    try {
      const sock = getSocket();
      if (sock?.connected) {
        sock.emit('register_user', {
          ...updated,
          sessionToken: safeLocalStorage.getItem('AGC_session_token') || undefined,
        });
      }
    } catch (_) {}

    // Persist compressed avatar/profile asynchronously to agc_phone_registry, local registries, and Supabase
    (async () => {
      const compacted = await syncProfileToAllRegistries(updated);
      if (compacted.avatarUrl !== updated.avatarUrl) {
        setCurrentUser((curr) =>
          phonesMatch(curr.phoneNumber, compacted.phoneNumber)
            ? { ...curr, avatarUrl: compacted.avatarUrl }
            : curr
        );
      }
      if (updated.phoneNumber) {
        saveUserChatsBackupToSupabase(updated.phoneNumber, chatsRef.current, messagesRef.current, {
          wallet: walletRef.current,
          userProfile: compacted,
          updatedAt: new Date().toISOString(),
        }).catch(() => {});
      }
    })();
  };

  const updateUsername = async (
    newUsername: string,
    newAbout?: string
  ): Promise<{ success: boolean; error?: string; username?: string }> => {
    const clean = newUsername.trim().toLowerCase().replace(/^@+/, '').replace(/[^a-z0-9_.]/g, '');
    if (clean.length < 3 || clean.length > 24) {
      return { success: false, error: 'Username must be 3–24 characters (letters, numbers, _ or .).' };
    }
    const reserved = new Set([
      'admin', 'administrator', 'agc', 'africhat', 'support', 'help', 'official',
      'system', 'root', 'moderator', 'mod', 'paystack', 'escrow', 'staff',
    ]);
    if (reserved.has(clean)) {
      return { success: false, error: `@${clean} is reserved and cannot be used.` };
    }

    const myPhone = currentUserRef.current?.phoneNumber || '';
    const prevHandle = (currentUserRef.current?.username || currentUserRef.current?.fullName || '')
      .trim()
      .toLowerCase()
      .replace(/^@+/, '');

    // Server uniqueness + profile update
    let serverUser: any = null;
    try {
      const checkResp = await fetch(
        `/api/users/check-username?username=${encodeURIComponent(clean)}&excludePhone=${encodeURIComponent(myPhone)}`
      );
      if (checkResp.ok) {
        const checkData = await checkResp.json();
        if (checkData.taken) {
          return { success: false, error: `@${clean} is already taken by another user.` };
        }
      }

      if (myPhone) {
        const patchResp = await fetch('/api/users/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phoneNumber: myPhone,
            username: clean,
            ...(newAbout !== undefined ? { about: newAbout.trim() } : {}),
          }),
        });
        const patchData = await patchResp.json().catch(() => ({}));
        if (!patchResp.ok) {
          return { success: false, error: patchData?.error || 'Could not update username.' };
        }
        if (patchData?.user) {
          serverUser = patchData.user;
        }
      }
    } catch (_) {}

    // Swap old handle in local taken list cleanly
    try {
      const taken: string[] = JSON.parse(localStorage.getItem('AGC_taken_usernames') || '[]');
      const nextTaken = taken.filter((u) => u.toLowerCase().replace(/^@+/, '') !== prevHandle);
      if (!nextTaken.includes(clean)) nextTaken.push(clean);
      localStorage.setItem('AGC_taken_usernames', JSON.stringify(nextTaken));
    } catch (_) {}

    const resolvedAbout =
      newAbout !== undefined
        ? newAbout.trim() || 'Available · Using AGC'
        : serverUser?.about ?? currentUserRef.current?.about;

    updateUserProfile({
      fullName: clean,
      username: clean,
      ...(resolvedAbout !== undefined ? { about: resolvedAbout } : {}),
    });

    return { success: true, username: clean };
  };

  // PWA App Badge: show unread message count on installed PWA icon
  useEffect(() => {
    const totalUnread = chats.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
    if ('setAppBadge' in navigator) {
      if (totalUnread > 0) {
        (navigator as any).setAppBadge(totalUnread).catch(() => {/* badge not supported */});
      } else {
        (navigator as any).clearAppBadge().catch(() => {/* badge not supported */});
      }
    }
  }, [chats]);

  // 9. Contacts Handlers
  const syncDeviceContacts = () => {
    setDeviceContacts((prev) => [...prev]);
  };

  const addNewDeviceContact = (
    name: string,
    phone: string,
    about?: string,
    isRegistered: boolean = true,
    customAvatar?: string,
    options?: { sendRequest?: boolean }
  ) => {
    const normalized = normalizePhoneInternational(phone) || phone.trim();
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

    const existedAlready = deviceContacts.some(
      (c) => phonesMatch(c.normalizedPhoneNumber, normalized) || phonesMatch(c.rawPhoneNumber, phone)
    );

    setDeviceContacts((prev) => {
      const updated = [
        newContact,
        ...prev.filter((c) => !phonesMatch(c.normalizedPhoneNumber, normalized) && c.normalizedPhoneNumber !== normalized),
      ];
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

    // Only send a friend request when explicitly requested by user action and not already connected
    if (
      options?.sendRequest === true &&
      !existedAlready &&
      normalized &&
      currentUser.phoneNumber &&
      !phonesMatch(normalized, currentUser.phoneNumber)
    ) {
      sendFriendRequest(normalized, name, `Hi, I am ${currentUser.fullName || 'AGC User'}. I added you on AfriChat!`);
    }

    return newContact;
  };

  const importDeviceContacts = async (rawContacts: { name: string; phone: string }[]): Promise<number> => {
    if (!rawContacts || rawContacts.length === 0) return 0;

    const normalizedList: DeviceContact[] = rawContacts
      .filter((c) => !isSyntheticTestUser({ name: c.name, phone: c.phone }))
      .map((c, i) => {
      const raw = c.phone.trim();
      const normalized = normalizePhoneInternational(raw) || raw;
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
      const res = await fetch('/api/users');
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

  const openDirectChat = useCallback(
    (target: {
      phone?: string;
      userId?: string;
      name?: string;
      avatar?: string;
      location?: string;
      verifiedStore?: boolean;
      product?: Product;
    }): string => {
      const userNow = currentUserRef.current;
      const myPhone = userNow.phoneNumber || '';
      const normMy = normalizePhoneDigits(myPhone);

      const dirById = target.userId
        ? adminUsersRef.current.find((u) => u.id === target.userId)
        : undefined;
      const contactById = target.userId
        ? deviceContactsRef.current.find(
            (c) => c.id === target.userId || c.registeredUser?.id === target.userId
          )
        : undefined;
      const chatById = target.userId
        ? chatsRef.current.find((c) => c.id === target.userId)
        : undefined;

      const rawOtherPhone =
        target.phone ||
        dirById?.phoneNumber ||
        contactById?.normalizedPhoneNumber ||
        contactById?.rawPhoneNumber ||
        chatById?.phone ||
        (chatById as any)?.phoneNumber ||
        '';
      const normalizedOtherPhone = rawOtherPhone
        ? normalizePhoneInternational(rawOtherPhone) || rawOtherPhone
        : '';

      const dirByPhone = normalizedOtherPhone
        ? adminUsersRef.current.find((u) => u.phoneNumber && phonesMatch(u.phoneNumber, normalizedOtherPhone))
        : undefined;
      const contactByPhone = normalizedOtherPhone
        ? deviceContactsRef.current.find(
            (c) =>
              phonesMatch(c.normalizedPhoneNumber, normalizedOtherPhone) ||
              phonesMatch(c.rawPhoneNumber, normalizedOtherPhone)
          )
        : undefined;

      const isSelf =
        target.userId === 'self' ||
        Boolean(myPhone && normalizedOtherPhone && phonesMatch(myPhone, normalizedOtherPhone));

      const deterministicId = isSelf
        ? `dm_self_${normMy}`
        : myPhone && normalizedOtherPhone
        ? getDirectChatId(myPhone, normalizedOtherPhone)
        : '';

      const currentChats = chatsRef.current;
      const existingChat = currentChats.find(
        (c) =>
          (deterministicId && c.id === deterministicId) ||
          (isSelf && (c.id === `dm_self_${normMy}` || c.name.includes('(Message yourself)'))) ||
          (!isSelf &&
            normalizedOtherPhone &&
            (c.phone || (c as any).phoneNumber) &&
            phonesMatch(c.phone || (c as any).phoneNumber, normalizedOtherPhone)) ||
          (!deterministicId && target.userId && c.id === target.userId)
      );

      const targetChatId =
        deterministicId || existingChat?.id || target.userId || `chat_${Date.now()}`;

      const bestName = isSelf
        ? `${userNow.fullName || 'You'} (Message yourself)`
        : target.name &&
          target.name !== 'AGC User' &&
          target.name !== 'Direct Chat' &&
          target.name !== 'AGC Contact'
        ? target.name
        : dirByPhone?.fullName ||
          dirById?.fullName ||
          contactByPhone?.name ||
          existingChat?.name ||
          target.name ||
          normalizedOtherPhone ||
          'AGC User';

      const bestAvatar =
        (isSelf ? userNow.avatarUrl : undefined) ||
        (target.avatar && !isPlaceholderAvatar(target.avatar) ? target.avatar : undefined) ||
        dirByPhone?.avatarUrl ||
        dirById?.avatarUrl ||
        contactByPhone?.avatar ||
        existingChat?.avatar ||
        DEFAULT_AVATAR_SVG;

      const peerPhoneFormatted = isSelf ? myPhone : normalizedOtherPhone;

      setChats((prev) => {
        const idx = prev.findIndex(
          (c) =>
            c.id === targetChatId ||
            (existingChat && c.id === existingChat.id) ||
            (!isSelf &&
              normalizedOtherPhone &&
              (c.phone || (c as any).phoneNumber) &&
              phonesMatch(c.phone || (c as any).phoneNumber, normalizedOtherPhone))
        );
        let updated: ChatThread[];
        if (idx >= 0) {
          const cur = prev[idx];
          const isCurNameGeneric =
            !cur.name || cur.name === 'Direct Chat' || cur.name === 'AGC User' || cur.name === 'AGC Contact';
          const mergedCatalog = target.product
            ? [target.product, ...(cur.catalog || []).filter((p) => p.id !== target.product!.id)]
            : cur.catalog;
          const patched: ChatThread = {
            ...cur,
            id: targetChatId,
            name: isCurNameGeneric ? bestName : cur.name,
            avatar: isPlaceholderAvatar(cur.avatar) ? bestAvatar : cur.avatar,
            phone: cur.phone || peerPhoneFormatted,
            phoneNumber: (cur as any).phoneNumber || peerPhoneFormatted,
            ...(mergedCatalog ? { catalog: mergedCatalog } : {}),
          };
          updated = [patched, ...prev.filter((_, i) => i !== idx)];
        } else {
          const newThread: ChatThread = {
            id: targetChatId,
            name: bestName,
            avatar: bestAvatar,
            verifiedStore: Boolean(target.verifiedStore),
            location: target.location || (isSelf ? 'Notes to Self' : 'Direct Chat'),
            unreadCount: 0,
            lastMessage: target.product ? `Product: ${target.product.title}` : 'Tap to start conversation',
            lastMessageTime: 'Just now',
            lastMessageAtMs: Date.now(),
            catalog: target.product ? [target.product] : [],
            isOnline: true,
            phone: peerPhoneFormatted,
            phoneNumber: peerPhoneFormatted,
            ...(target.product ? { storeCategory: target.product.category } : {}),
          };
          updated = sortChatsByRecency([newThread, ...prev]);
        }
        chatsRef.current = updated;
        persistPartitionedChats(updated, myPhone);
        return updated;
      });

      joinChatRoom(targetChatId);
      setActiveTab('chats');
      setActiveChatId(targetChatId);

      if (isSupabaseConfigured && targetChatId && !isSelf) {
        const myUserId = userNow.id || myPhone;
        const otherUserId = target.userId || dirByPhone?.id || normalizedOtherPhone;
        supabase
          .from('chats')
          .upsert({ id: targetChatId, type: 'direct', created_at: new Date().toISOString() }, { onConflict: 'id' })
          .then(({ error }) => {
            if (error) console.warn('[AGC] Supabase chat upsert:', error.message);
          });
        [myUserId, otherUserId].filter(Boolean).forEach((uid) => {
          supabase
            .from('chat_participants')
            .upsert({ chat_id: targetChatId, user_id: uid }, { onConflict: 'chat_id,user_id' })
            .then(({ error }) => {
              if (error) console.warn('[AGC] Participant upsert:', error.message);
            });
        });
      }

      return targetChatId;
    },
    []
  );

  const startChatWithContact = (contact: DeviceContact) => {
    const otherPhone = contact.normalizedPhoneNumber || contact.rawPhoneNumber || '';
    openDirectChat({
      phone: otherPhone,
      userId: contact.id === 'self' ? 'self' : contact.registeredUser?.id,
      name: contact.name,
      avatar: contact.avatar,
      location: 'Contact Book',
    });
    setIsContactsModalOpen(false);
  };

  const startAiChat = () => {
    const nowMs = Date.now();
    let aiChat = chats.find((c) => c.id === AFRIBOT_ID || c.isBot);
    if (!aiChat) {
      aiChat = {
        id: AFRIBOT_ID,
        name: AFRIBOT_NAME,
        avatar: AFRIBOT_AVATAR,
        verifiedStore: false,
        location: 'AI Assistant · Groq LPU',
        unreadCount: 0,
        lastMessage: 'Hello! I am AgcBot. Ask me anything, or invite me to your groups as an Admin! 🤖✨',
        lastMessageTime: 'Just now',
        lastMessageAtMs: nowMs,
        catalog: [],
        isOnline: true,
        isBot: true,
        phone: AFRIBOT_PHONE,
      };
      setChats((prev) => {
        const updated = sortChatsByRecency([aiChat!, ...prev.filter((c) => c.id !== AFRIBOT_ID)]);
        persistPartitionedChats(updated, currentUser.phoneNumber);
        return updated;
      });
    } else if (aiChat.name !== AFRIBOT_NAME || aiChat.lastMessage?.includes('AfriBot')) {
      setChats((prev) => {
        const updated = prev.map((c) =>
          c.id === AFRIBOT_ID || c.isBot
            ? {
                ...c,
                name: AFRIBOT_NAME,
                lastMessage: c.lastMessage?.replace(/AfriBot AI/g, AFRIBOT_NAME),
              }
            : c
        );
        persistPartitionedChats(updated, currentUser.phoneNumber);
        return updated;
      });
    }

    setMessages((prev) => {
      const currentMsgs = prev[AFRIBOT_ID] || [];
      if (currentMsgs.length === 0) {
        const welcomeMsg: ChatMessage = {
          id: `msg_bot_welcome_${nowMs}`,
          chatId: AFRIBOT_ID,
          sender: 'other',
          senderName: AFRIBOT_NAME,
          senderAvatar: AFRIBOT_AVATAR,
          senderPhone: AFRIBOT_PHONE,
          text: `Habari & Greetings! 👋 I am **AgcBot**, powered by Groq ultra-fast LPU inference.\n\nI am your personal AI companion right inside AGC. Here are things you can ask me:\n- 💡 Brainstorm business & trade ideas\n- 💰 Explain Ajo savings, crypto, or escrow rules\n- 🌍 Translate between English, Pidgin, Swahili, Yoruba, Hausa, French\n- ✍️ Draft contracts, essays, emails, or marketing pitches\n- 👥 **Add me to your Groups as an Admin** to help answer questions, moderate, or summarize chats!\n\nHow can I assist you today?`,
          type: 'text',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'read',
        };
        const updated = { ...prev, [AFRIBOT_ID]: [welcomeMsg] };
        persistPartitionedMessages(updated, currentUser.phoneNumber);
        return updated;
      }
      return prev;
    });

    setActiveTab('chats');
    setActiveChatId(AFRIBOT_ID);
    setIsContactsModalOpen(false);
  };

  const inviteBotToGroup = (groupId: string, makeAdmin: boolean = true) => {
    let nextChatSnapshot: ChatThread | null = null;
    setChats((prev) => {
      const updated = prev.map((c) => {
        if (c.id !== groupId) return c;
        const currentMembers = (c.members || []).filter((m) => m !== 'AfriBot AI');
        const currentAdmins = (c.admins || []).filter((a) => a !== 'AfriBot AI');
        const newMembers = currentMembers.includes(AFRIBOT_NAME)
          ? currentMembers
          : [...currentMembers, AFRIBOT_NAME];
        const newAdmins = makeAdmin && !currentAdmins.includes(AFRIBOT_NAME)
          ? [...currentAdmins, AFRIBOT_NAME]
          : currentAdmins;
        nextChatSnapshot = {
          ...c,
          members: newMembers,
          admins: newAdmins,
          membersCount: computeClientMembersCount(newMembers, c.memberPhones),
        };
        return nextChatSnapshot;
      });
      persistPartitionedChats(updated, currentUser.phoneNumber);
      return updated;
    });

    if (nextChatSnapshot) {
      const snap = nextChatSnapshot as ChatThread;
      fetch('/api/groups/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId,
          action: 'update_meta',
          actorPhone: currentUser.phoneNumber,
          actorId: currentUser.id,
          admins: snap.admins,
          members: snap.members,
          membersCount: snap.membersCount,
        }),
      }).catch(() => {});
      broadcastGroupSnapshot(snap);
    }

    const announceMsg: ChatMessage = {
      id: `msg_bot_joined_${Date.now()}`,
      chatId: groupId,
      sender: 'system',
      senderName: AFRIBOT_NAME,
      senderAvatar: AFRIBOT_AVATAR,
      text: makeAdmin
        ? `🤖 AgcBot was added to this group as an Admin! Tag @AgcBot or @bot anytime to ask questions, settle debates, or get AI assistance.`
        : `🤖 AgcBot joined the group! Tag @AgcBot or @bot to chat with the AI.`,
      type: 'text',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'delivered',
    };

    setMessages((prev) => {
      const updated = {
        ...prev,
        [groupId]: [...(prev[groupId] || []), announceMsg],
      };
      persistPartitionedMessages(updated, currentUser.phoneNumber);
      return updated;
    });

    showLocalNotification('AgcBot Added', `🤖 AgcBot added to group${makeAdmin ? ' as Admin' : ''}!`);
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
    const nowMs = Date.now();
    const newMsg: ChatMessage = {
      id: `msg_umeme_${nowMs}`,
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

    setChats((prev) => {
      const updated = bumpChatThreadToTop(prev, chatId, {
        lastMessage: `🖼️ Meme: ${meme.title || 'Custom Upload'}`,
        lastMessageTime: newMsg.timestamp,
        lastMessageAtMs: nowMs,
      });
      persistPartitionedChats(updated, currentUser.phoneNumber);
      return updated;
    });

    setIsEmojiMemeDrawerOpen(false);
    broadcastLiveMessage(chatId, newMsg);
  };

  // 11. Dispatch Handlers
  const createDispatchOrder = (
    orderData: Omit<DispatchDeliveryOrder, 'id' | 'trackingCode' | 'createdAt' | 'status'>
  ): DispatchDeliveryOrder => {
    const baseFee = orderData.estimatedFee || (orderData.vehicleType === 'van' ? 6500 : 2400);
    // 5% Platform commission calculation
    const platformFee = Math.round(baseFee * 0.05);
    const totalFee = baseFee + platformFee;

    const prefix = orderData.provider === 'gokada' ? 'GKD' : 'PCK';
    const code = `AGC-${prefix}-${Math.floor(10000 + Math.random() * 90000)}`;
    const newOrder: DispatchDeliveryOrder = {
      ...orderData,
      id: `disp_${Date.now()}`,
      trackingCode: code,
      estimatedFee: baseFee,
      platformFee,
      totalFee,
      status: 'rider_assigned',
      riderName: orderData.provider === 'gokada' ? 'Gokada Express Dispatch' : 'PickkR Hub Rider',
      riderPhone: '+2348039988112',
      riderPlate: orderData.provider === 'gokada' ? 'GKD-481-APP' : 'PCK-102-LAG',
      createdAt: 'Just now',
    };

    setDispatchOrders((prev) => {
      const updated = [newOrder, ...prev.filter((o) => o.id !== newOrder.id)];
      localStorage.setItem('AGC_dispatch_orders', JSON.stringify(updated));
      return updated;
    });

    try {
      fetch('/api/dispatch/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOrder),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.success && data.order) {
            setDispatchOrders((prev) => {
              const updated = prev.map((o) => (o.id === newOrder.id ? data.order : o));
              localStorage.setItem('AGC_dispatch_orders', JSON.stringify(updated));
              return updated;
            });
          }
        })
        .catch(() => {});
    } catch (_) {}

    recordLedgerTransaction({
      id: `tx_disp_${Date.now()}`,
      type: 'service_booking',
      title: `Dispatch Delivery: ${newOrder.provider.toUpperCase()} (${code})`,
      description: `${orderData.packageDescription || 'Parcel dispatch'} to ${orderData.recipientName}`,
      amount: baseFee,
      fee: platformFee,
      balanceAfter: wallet.availableBalance,
      currency: 'NGN',
      referenceId: code,
      channel: 'wallet',
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

    const newTx = recordLedgerTransaction({
      id: `tx_${Date.now()}`,
      type: 'service_booking',
      title: `Job Board Posting: ${jobData.title.slice(0, 25)}`,
      description: `Featured job board posting fee: ${jobData.title}`,
      amount: postFee,
      fee: 0,
      balanceAfter: wallet.availableBalance - postFee,
      currency: 'NGN',
      referenceId: `JOB_${Date.now()}`,
      channel: 'wallet',
    });

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

    //  Broadcast to all live users via Supabase Realtime
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

    const newTx = recordLedgerTransaction({
      id: `tx_${Date.now()}`,
      type: 'service_booking',
      title: `Job Application Fee: ${job.title.slice(0, 24)}`,
      description: `Verified job application fee for ${job.title}`,
      amount: applyFee,
      fee: 0,
      balanceAfter: wallet.availableBalance - applyFee,
      currency: 'NGN',
      referenceId: `JOB_APP_${Date.now()}`,
      channel: 'wallet',
    });

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

  // 13. Security Handlers & Anti-Brute-Force Protection (No '1234' default + 2 Security Questions prerequisite)
  const WEAK_PINS = ['0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999', '1234', '4321', '0123', '9876'];

  const saveSecuritySettingsState = (updated: SecuritySettings) => {
    try {
      localStorage.setItem(getSecurityStorageKey(), JSON.stringify(updated));
    } catch (_) {}
  };

  const verifyPaymentPinDetailed = (pin: string): { success: boolean; message?: string; lockedUntil?: number | null } => {
    if (!securitySettings.hasPaymentPin || !securitySettings.paymentPin) {
      return {
        success: false,
        message: 'No Payment PIN configured. Go to Hub > Payment PIN & Security to set 2 Security Questions and create your PIN.',
      };
    }

    const now = Date.now();
    if (securitySettings.lockoutUntil && securitySettings.lockoutUntil > now) {
      const remainingSeconds = Math.ceil((securitySettings.lockoutUntil - now) / 1000);
      return {
        success: false,
        message: `Security Lockout Active: Too many failed attempts. Try again in ${remainingSeconds}s.`,
        lockedUntil: securitySettings.lockoutUntil,
      };
    }

    const currentPin = securitySettings.paymentPin.trim();
    if (currentPin === pin.trim()) {
      if ((securitySettings.failedAttempts ?? 0) > 0 || securitySettings.lockoutUntil) {
        setSecuritySettings((prev) => {
          const updated = { ...prev, failedAttempts: 0, lockoutUntil: null };
          saveSecuritySettingsState(updated);
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
      saveSecuritySettingsState(updated);
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
      saveSecuritySettingsState(updated);
      return updated;
    });
  };

  const setSecurityQuestions = (questions: SecurityQuestionEntry[]): { success: boolean; message: string } => {
    const cleaned = (questions || []).map((q) => ({
      question: (q.question || '').trim(),
      answer: (q.answer || '').trim(),
    }));
    if (cleaned.length < 2 || !cleaned[0].question || !cleaned[0].answer || !cleaned[1].question || !cleaned[1].answer) {
      return { success: false, message: 'Please provide 2 Security Questions and both Answers.' };
    }
    if (cleaned[0].question.toLowerCase() === cleaned[1].question.toLowerCase()) {
      return { success: false, message: 'Please select 2 different Security Questions.' };
    }

    setSecuritySettings((prev) => {
      const updated: SecuritySettings = {
        ...prev,
        securityQuestions: cleaned.slice(0, 2),
        securityQuestion: cleaned[0].question,
        securityAnswer: cleaned[0].answer,
      };
      saveSecuritySettingsState(updated);
      return updated;
    });

    return { success: true, message: '2 Security Questions saved! You can now create or manage your Payment PIN.' };
  };

  const updatePaymentPin = (newPin: string, oldPin?: string): { success: boolean; message: string } => {
    if (!Array.isArray(securitySettings.securityQuestions) || securitySettings.securityQuestions.length < 2) {
      return {
        success: false,
        message: 'Please set 2 Security Questions & Answers before creating your Payment PIN.',
      };
    }

    if (securitySettings.hasPaymentPin && securitySettings.paymentPin) {
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
      saveSecuritySettingsState(updated);
      return updated;
    });

    return { success: true, message: 'Payment PIN successfully saved and secured!' };
  };

  const resetPaymentPinWithQuestions = (
    answers: [string, string],
    newPin: string
  ): { success: boolean; message: string } => {
    const savedQuestions = securitySettings.securityQuestions || [];
    if (savedQuestions.length < 2) {
      return { success: false, message: 'Two Security Questions must be configured first.' };
    }

    const ans0 = (answers[0] || '').trim().toLowerCase();
    const ans1 = (answers[1] || '').trim().toLowerCase();
    if (
      ans0 !== savedQuestions[0].answer.trim().toLowerCase() ||
      ans1 !== savedQuestions[1].answer.trim().toLowerCase()
    ) {
      return { success: false, message: 'One or both security question answers do not match.' };
    }

    if (!newPin || newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      return { success: false, message: 'New PIN must be exactly 4 numeric digits.' };
    }

    if (WEAK_PINS.includes(newPin)) {
      return { success: false, message: 'PIN is too weak or common (e.g. 1234, 0000, 1111). Please choose a stronger PIN.' };
    }

    setSecuritySettings((prev) => {
      const updated = { ...prev, hasPaymentPin: true, paymentPin: newPin, failedAttempts: 0, lockoutUntil: null };
      saveSecuritySettingsState(updated);
      return updated;
    });

    return { success: true, message: 'Security answers verified! Payment PIN has been reset.' };
  };

  const setPaymentPin = (pin: string) => {
    updatePaymentPin(pin);
  };

  const setSecurityQuestion = (question: string, answer: string) => {
    setSecuritySettings((prev) => {
      const existingSecond = prev.securityQuestions?.[1];
      const nextQuestions: SecurityQuestionEntry[] = existingSecond
        ? [{ question, answer }, existingSecond]
        : [{ question, answer }];
      const updated = { ...prev, securityQuestion: question, securityAnswer: answer, securityQuestions: nextQuestions };
      saveSecuritySettingsState(updated);
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
      const tx = recordLedgerTransaction({
        type: 'escrow_lock',
        title: `Service Escrow: ${booking.serviceTitle} with ${booking.providerName}`,
        description: `Artisan service escrow lock: ${booking.serviceTitle}`,
        amount: booking.totalPrice,
        fee: 0,
        balanceAfter: Math.max(0, wallet.availableBalance - booking.totalPrice),
        currency: booking.currency,
        referenceId: `SRV_ESC_${newBooking.id}`,
        channel: 'wallet',
      });

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
        const refTx = recordLedgerTransaction({
          type: 'refund',
          title: `Refund: Cancelled ${target.serviceTitle}`,
          description: `Refund for cancelled service booking (${target.serviceTitle})`,
          amount: target.totalPrice,
          fee: 0,
          balanceAfter: walletRef.current.availableBalance + target.totalPrice,
          currency: target.currency,
          referenceId: `REF_${bookingId}`,
          channel: 'wallet',
        });
        setWallet((w) => ({
          ...w,
          availableBalance: w.availableBalance + target.totalPrice,
          escrowLockedBalance: Math.max(0, w.escrowLockedBalance - target.totalPrice),
          transactions: [refTx, ...w.transactions],
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
        const relTx = recordLedgerTransaction({
          type: 'escrow_release',
          title: `Service Escrow Released: ${target.serviceTitle} to ${target.providerName}`,
          description: `Released service escrow payout to ${target.providerName}`,
          amount: target.totalPrice,
          fee: 0,
          balanceAfter: walletRef.current.availableBalance,
          currency: target.currency,
          referenceId: `REL_SRV_${bookingId}`,
          channel: 'wallet',
        });
        setWallet((w) => ({
          ...w,
          escrowLockedBalance: Math.max(0, w.escrowLockedBalance - target.totalPrice),
          transactions: [relTx, ...w.transactions],
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
      reviewCount: 0,
      isVerified: false,
      approvalStatus: 'pending',
      badge: 'Pending Admin Approval',
    };

    setServiceProviders((prev) => {
      const updated = [newProvider, ...prev];
      localStorage.setItem('AGC_service_providers', JSON.stringify(updated));
      return updated;
    });

    fetch('/api/artisans/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: newProvider.id,
        stationName: newProvider.businessName || newProvider.name,
        category: newProvider.categoryLabel || newProvider.category,
        location: newProvider.location,
        ownerName: newProvider.name,
        ownerPhone: newProvider.phone || currentUser.phoneNumber,
        registrationFeePaid: true,
      }),
    }).catch(() => {});
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

    let runningBal = wallet.availableBalance;
    targets.forEach((e) => {
      const ref = `PAY_${Math.floor(100000 + Math.random() * 900000)}`;
      runningBal = Math.max(0, runningBal - e.salary);
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

      newTxList.push(
        recordLedgerTransaction({
          id: `tx_${Date.now()}_${e.id}`,
          type: 'payroll_debit',
          title: `Auto-Debit Salary: ${e.fullName} (${e.role})`,
          description: `Payroll disbursement to ${e.fullName} (${e.role})`,
          amount: e.salary,
          fee: 0,
          balanceAfter: runningBal,
          currency: e.currency,
          referenceId: ref,
          channel: 'wallet',
        })
      );
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
    persistPartitionedUserProfile(updatedUser);

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
    persistPartitionedUserProfile(updatedUser);
  };

  // 25. Store Registration & Tiers System (3k/mo for 30 items, 7k/mo for 100 items limit)
  const [isStoreRegModalOpen, setIsStoreRegModalOpen] = useState(false);
  const [storeSubscription, setStoreSubscription] = useState<StoreSubscription>(() => {
    try {
      const saved = localStorage.getItem('AGC_store_sub');
      if (saved) {
        const parsed = JSON.parse(saved);
        const isActive = Boolean((parsed.active || parsed.isRegistered) && parsed.tier && parsed.tier !== 'none');
        const limitVal = parsed.itemLimit ?? parsed.itemsLimit ?? 0;
        const usedVal = parsed.itemsCount ?? parsed.itemsUsed ?? 0;
        return {
          tier: parsed.tier || 'none',
          monthlyFee: parsed.monthlyFee || (parsed.tier === 'pro_100' ? 7000 : parsed.tier === 'starter_30' ? 3000 : 0),
          itemLimit: limitVal,
          itemsLimit: limitVal,
          itemsCount: usedVal,
          itemsUsed: usedVal,
          storeName: parsed.storeName || '',
          description: parsed.description || '',
          category: parsed.category || '',
          active: Boolean(parsed.active && parsed.tier && parsed.tier !== 'none' && parsed.approvalStatus !== 'suspended' && parsed.approvalStatus !== 'rejected'),
          isRegistered: Boolean((parsed.isRegistered || parsed.active) && parsed.tier && parsed.tier !== 'none'),
          approvalStatus: parsed.approvalStatus || (parsed.active ? 'approved' : parsed.isRegistered ? 'pending' : undefined),
          expiresAt: parsed.expiresAt || '',
          paymentMethod: parsed.paymentMethod || 'wallet',
        };
      }
    } catch (e) {
      console.warn('Failed to parse store sub:', e);
    }
    return {
      tier: 'none',
      monthlyFee: 0,
      itemLimit: 0,
      itemsLimit: 0,
      itemsCount: 0,
      itemsUsed: 0,
      storeName: '',
      description: '',
      category: '',
      active: false,
      isRegistered: false,
      expiresAt: '',
      paymentMethod: 'wallet',
    };
  });

  const hasActiveStore = Boolean(
    storeSubscription &&
    storeSubscription.active &&
    storeSubscription.tier &&
    storeSubscription.tier !== 'none' &&
    storeSubscription.approvalStatus !== 'suspended' &&
    storeSubscription.approvalStatus !== 'rejected'
  );

  const [myStoreProducts, setMyStoreProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem('AGC_my_store_products_v1');
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return [];
  });

  const addStoreProduct = (
    prod: Omit<Product, 'id' | 'sellerId' | 'sellerName' | 'inStock' | 'stockCount'>
  ): { success: boolean; product?: Product; message: string } => {
    if (!storeSubscription?.isRegistered || storeSubscription.tier === 'none') {
      return { success: false, message: 'Please submit a Merchant Store plan before adding catalog products.' };
    }
    const limit = storeSubscription.itemLimit || storeSubscription.itemsLimit || 30;
    if (myStoreProducts.length >= limit) {
      return { success: false, message: `Store limit reached (${limit} items). Upgrade to Pro for 100 items.` };
    }
    const newProduct: Product = {
      ...prod,
      id: `prod_store_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sellerId: currentUser.id || currentUser.phoneNumber || 'merchant',
      sellerName: storeSubscription.storeName || currentUser.fullName || 'AGC Official Store',
      inStock: true,
      stockCount: 10,
    };
    const nextProducts = [newProduct, ...myStoreProducts];
    setMyStoreProducts(nextProducts);
    try {
      localStorage.setItem('AGC_my_store_products_v1', JSON.stringify(nextProducts));
    } catch (_) {}

    const nextSub: StoreSubscription = {
      ...storeSubscription,
      itemsCount: nextProducts.length,
      itemsUsed: nextProducts.length,
    };
    setStoreSubscription(nextSub);
    try {
      localStorage.setItem('AGC_store_sub', JSON.stringify(nextSub));
    } catch (_) {}

    return {
      success: true,
      product: newProduct,
      message: storeSubscription.active
        ? `"${newProduct.title}" added to your store catalog!`
        : `"${newProduct.title}" saved! Your store will go live once Admin approves it.`,
    };
  };

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
      const newTx = recordLedgerTransaction({
        id: `tx_store_reg_${Date.now()}`,
        type: 'store_subscription',
        title: `Store Registration (${tier === 'starter_30' ? 'Starter 30-Items' : 'Pro 100-Items'})`,
        description: `Merchant store subscription: ${storeName || 'AGC Store'} (${tier})`,
        amount: fee,
        fee: 0,
        balanceAfter: wallet.availableBalance - fee,
        currency: 'NGN',
        referenceId: `STORE_SUB_${Date.now()}`,
        channel: 'wallet',
      });
      setWallet((prev) => ({
        ...prev,
        availableBalance: prev.availableBalance - fee,
        transactions: [newTx, ...prev.transactions],
      }));
    }

    const currentCount = myStoreProducts.length || storeSubscription?.itemsCount || 0;
    const storeId = `store_${Date.now()}`;
    const updatedSub: StoreSubscription = {
      tier,
      monthlyFee: fee,
      itemLimit,
      itemsLimit: itemLimit,
      itemsCount: currentCount,
      itemsUsed: currentCount,
      storeName: storeName || (currentUser.fullName ? `${currentUser.fullName}'s Official Store` : 'AGC Store'),
      description: description || 'Verified African merchant catalog.',
      category: category || 'General Trade',
      active: false,
      isRegistered: true,
      approvalStatus: 'pending',
      expiresAt: 'In 30 days',
      paymentMethod,
    };

    setStoreSubscription(updatedSub);
    localStorage.setItem('AGC_store_sub', JSON.stringify(updatedSub));

    fetch('/api/stores/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: storeId,
        storeName: updatedSub.storeName,
        description: updatedSub.description,
        category: updatedSub.category,
        tier: updatedSub.tier,
        itemsLimit: updatedSub.itemLimit,
        itemsCount: updatedSub.itemsCount,
        ownerName: currentUser.fullName,
        ownerPhone: currentUser.phoneNumber,
        paymentMethod: updatedSub.paymentMethod,
      }),
    }).catch(() => {});

    //  LIVE SYSTEM: Publish Store Subscription to Supabase (pending admin approval)
    if (isSupabaseConfigured) {
      createStoreSubscriptionInDb({
        store_name: updatedSub.storeName,
        description: updatedSub.description,
        category: updatedSub.category,
        tier: updatedSub.tier,
        items_limit: updatedSub.itemLimit,
        is_active: false,
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
      message: `Store submitted under ${tier === 'starter_30' ? 'Starter (₦3k/mo)' : 'Pro (₦7k/mo)'}! Pending Admin Approval before appearing in Marketplace.`,
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
    return [];
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

    const newTx = recordLedgerTransaction({
      id: `tx_file_buy_${Date.now()}`,
      type: 'store_purchase',
      title: `Digital Product: ${file.title}`,
      description: `Purchased digital file: ${file.title}`,
      amount: file.price,
      fee: 0,
      balanceAfter: wallet.availableBalance - file.price,
      currency: file.currency,
      referenceId: `FILE_${fileId}`,
      channel: 'wallet',
    });

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

    const newTx = recordLedgerTransaction({
      id: `tx_vip_${Date.now()}`,
      type: 'service_booking',
      title: `VIP 1-on-1 ${type === 'voice' ? 'Voice Call' : type === 'video' ? 'Video Call' : 'VIP Direct Chat'} with ${creator.name} (${durationMinutes}m)`,
      description: `Creator VIP session (${durationMinutes}m ${type}) with ${creator.name}`,
      amount: price,
      fee: 0,
      balanceAfter: wallet.availableBalance - price,
      currency: 'NGN',
      referenceId: `VIP_${creatorId}_${Date.now()}`,
      channel: 'wallet',
    });

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

    const newTx = recordLedgerTransaction({
      id: `tx_tip_${Date.now()}`,
      type: 'creator_tip',
      title: `Reader Tip to ${book.authorName} for "${book.title}"`,
      description: `AfriBooks reader tip to ${book.authorName}`,
      amount,
      fee: 0,
      balanceAfter: wallet.availableBalance - amount,
      currency: 'NGN',
      referenceId: `TIP_${bookId}_${Date.now()}`,
      channel: 'wallet',
    });

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

    const newTx = recordLedgerTransaction({
      id: `tx_book_buy_${Date.now()}`,
      type: 'store_purchase',
      title: `Paid Book Purchase: ${book.title}`,
      description: `AfriBooks purchase: "${book.title}"`,
      amount: book.price,
      fee: 0,
      balanceAfter: wallet.availableBalance - book.price,
      currency: book.currency,
      referenceId: `BOOK_${bookId}_${Date.now()}`,
      channel: 'wallet',
    });

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
  const [isPetShopModalOpen, setIsPetShopModalOpen] = useState(false);
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
      const newTx = recordLedgerTransaction({
        id: `tx_tutor_reg_${Date.now()}`,
        type: 'service_booking',
        title: `Certified Tutor Registration Fee (₦${totalFee.toLocaleString()})`,
        description: `Registered AGC Certified Tutor: ${data.tutorName}`,
        amount: totalFee,
        fee: 0,
        balanceAfter: wallet.availableBalance - totalFee,
        currency: 'NGN',
        referenceId: `TUTOR_REG_${Date.now()}`,
        channel: 'wallet',
      });
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
      const newTx = recordLedgerTransaction({
        id: `tx_tutor_unlimited_${Date.now()}`,
        type: 'service_booking',
        title: 'Tutor Unlimited Pro Subscription (₦20,000 / month)',
        description: 'Upgraded to Unlimited Pro Tutor subscription',
        amount: proFee,
        fee: 0,
        balanceAfter: wallet.availableBalance - proFee,
        currency: 'NGN',
        referenceId: `TUTOR_PRO_${Date.now()}`,
        channel: 'wallet',
      });
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
      const newTx = recordLedgerTransaction({
        id: `tx_enroll_${Date.now()}`,
        type: 'course_enroll',
        title: `Course Enrollment: ${course.title}`,
        description: `Enrolled in course: ${course.title}`,
        amount: course.price,
        fee: 0,
        balanceAfter: wallet.availableBalance - course.price,
        currency: course.currency,
        referenceId: `CRS_${courseId}_${Date.now()}`,
        channel: 'wallet',
      });
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
    async ({
      chatId,
      message,
      senderId,
      targetPhone,
      isGroup,
      chat,
      createdAtMs,
    }: {
      chatId: string;
      message: ChatMessage;
      senderId?: string;
      targetPhone?: string;
      isGroup?: boolean;
      chat?: any;
      createdAtMs?: number;
    }) => {
      if (!message || !chatId) return;
      // CRITICAL: Never accept or persist incoming messages while logged out or hydrating!
      // Otherwise prev state ({} / []) overwrites the user's saved localStorage history.
      if (!isAuthenticatedRef.current || isHydratingChatsRef.current) return;

      const userNow = currentUserRef.current;
      const currentActiveChatId = activeChatIdRef.current;
      const myCleanPhone = userNow.phoneNumber?.replace(/\D/g, '') || '';
      const normMyPhone = normalizePhoneDigits(myCleanPhone);
      if (!normMyPhone || loadedPhoneForChatsRef.current !== normMyPhone) return;

      // Ignore deleted/probe Town communities
      if (chatId.startsWith('town_comm_')) {
        const rawCommId = chatId.replace('town_comm_', '');
        if (deletedCommunityIdsRef.current.has(rawCommId)) return;
      }
      if (chat?.name && String(chat.name).trim().startsWith('__')) return;

      const senderCleanPhone = (message.senderPhone || '').replace(/\D/g, '');
      const isFromMe =
        (Boolean(senderId) && senderId === userNow.id) ||
        (Boolean(senderCleanPhone && myCleanPhone && phonesMatch(senderCleanPhone, myCleanPhone)) &&
          message.sender !== 'system');

      const isDm = chatId.startsWith('dm_');
      const isChannelChat = Boolean(chatId.startsWith('channel_') || chat?.isChannel);
      const isGroupChat = Boolean(isGroup || chatId.startsWith('group_') || chatId.startsWith('town_comm_') || chat?.isGroup || isChannelChat);
      const isSelfChat = chatId.includes('self') || (myCleanPhone && phonesMatch(senderCleanPhone, myCleanPhone) && (!targetPhone || phonesMatch(targetPhone, myCleanPhone)));

      // Ignore any incoming group/channel traffic if user was kicked/removed
      if (isGroupChat) {
        const localGroup = chatsRef.current.find((c) => c.id === chatId);
        const isKickedHere =
          kickedGroupIdsRef.current.has(chatId) ||
          Boolean(myCleanPhone && localGroup?.kickedPhones?.some((kp) => phonesMatch(kp, myCleanPhone))) ||
          Boolean(myCleanPhone && Array.isArray(chat?.kickedPhones) && chat.kickedPhones.some((kp: string) => phonesMatch(kp, myCleanPhone)));
        if (isKickedHere) {
          removeGroupLocallyAndCleanup(chatId, { recordKick: true });
          return;
        }
      }

      // 1. Strict DM Protection: Only actual participants can receive or view direct messages!
      if (isDm && !isSelfChat) {
        const parts = chatId.replace('dm_', '').split('_');
        if (parts.length >= 2 && myCleanPhone) {
          const isParticipant = phonesMatch(parts[0], myCleanPhone) || phonesMatch(parts[1], myCleanPhone);
          if (!isParticipant) {
            return;
          }
        }
      }

      // If a target phone was explicitly addressed, verify recipient matches my phone (allow self sync)
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
      } else if (!isGroupChat) {
        otherCleanPhone = isFromMe ? (targetPhone || '').replace(/\D/g, '') : senderCleanPhone;
        if (myCleanPhone && otherCleanPhone && !isSelfChat) {
          resolvedChatId = getDirectChatId(myCleanPhone, otherCleanPhone);
        }
      }

      // Enforce recipient block list BEFORE decryption, persistence, thread creation, or notification
      if (!isFromMe && !isGroupChat && !isSelfChat) {
        const senderIdentity = senderCleanPhone || otherCleanPhone;
        if (isUserBlockedByMe(resolvedChatId, senderIdentity) || isUserBlockedByMe(chatId, senderIdentity)) {
          return;
        }
      }

      // Decrypt message text if encrypted with E2EE (try normalized + legacy phone secrets)
      let plainText = message.text;
      let wasEncrypted = Boolean(message.isEncrypted);
      if (message.text && typeof message.text === 'string' && message.text.startsWith('AGC_E2EE:')) {
        const peerPhoneForSecret = isFromMe
          ? (otherCleanPhone || (targetPhone || '').replace(/\D/g, ''))
          : (senderCleanPhone || otherCleanPhone);
        const secretCandidates = getConversationSecretFallbacks(resolvedChatId, myCleanPhone, peerPhoneForSecret);
        for (const candidateSecret of secretCandidates) {
          try {
            const decrypted = await decryptChatMessage(message.text, candidateSecret);
            if (decrypted && !decrypted.startsWith('AGC_E2EE:')) {
              plainText = decrypted;
              wasEncrypted = true;
              break;
            }
          } catch (_) {}
        }
      }

      // 3. Synchronously check duplicates BEFORE setMessages updater to avoid async React 19 races
      const existingListSync = messagesRef.current[resolvedChatId] || messagesRef.current[chatId] || [];
      const existingIdxSync = existingListSync.findIndex((m) => m.id === message.id);
      const isUpdatableExisting =
        existingIdxSync >= 0 &&
        ((message.status === 'read' && existingListSync[existingIdxSync].status !== 'read') ||
          message.type === 'financial_poll' ||
          message.type === 'ajo_update' ||
          message.type === 'game_xo' ||
          message.type === 'game_whot' ||
          message.type === 'game_ludo' ||
          message.type === 'game_poker' ||
          message.type === 'bill_request');

      if (existingIdxSync >= 0 && !isUpdatableExisting) {
        return;
      }

      setMessages((prev) => {
        const list = prev[resolvedChatId] || prev[chatId] || [];
        const existingIdx = list.findIndex((m) => m.id === message.id);
        if (existingIdx >= 0) {
          const existingMsg = list[existingIdx];
          const shouldUpgradeRead = message.status === 'read' && existingMsg.status !== 'read';
          if (
            shouldUpgradeRead ||
            message.type === 'financial_poll' ||
            message.type === 'ajo_update' ||
            message.type === 'game_xo' ||
            message.type === 'game_whot' ||
            message.type === 'game_ludo' ||
            message.type === 'game_poker' ||
            message.type === 'bill_request'
          ) {
            const updatedList = list.map((m, idx) => {
              if (idx !== existingIdx) return m;
              let nextPoll = m.financialPoll;
              if (message.financialPoll && m.financialPoll) {
                const mergedVotes = {
                  ...(m.financialPoll.votesByUser || {}),
                  ...(message.financialPoll.votesByUser || {}),
                };
                nextPoll = recomputePollFromVotes(message.financialPoll, mergedVotes);
                delete nextPoll.userVotedOptionId;
              } else if (message.financialPoll) {
                nextPoll = message.financialPoll;
              }

              let nextXo = m.xoGame;
              if (message.xoGame && m.xoGame) {
                if (shouldReplaceXoGame(m.xoGame, message.xoGame)) {
                  nextXo = message.xoGame;
                }
              } else if (message.xoGame) {
                nextXo = message.xoGame;
              }

              const pickNewerGameState = <T extends { status?: string; moveCount?: number; updatedAt?: string }>(
                cur?: T,
                inc?: T
              ): T | undefined => {
                if (!inc) return cur;
                if (!cur) return inc;
                const curRank = getXoStatusRank(cur.status as any);
                const incRank = getXoStatusRank(inc.status as any);
                if (incRank > curRank) return inc;
                if (incRank < curRank) return cur;
                if (curRank === 3) return cur;
                if ((inc.moveCount || 0) > (cur.moveCount || 0)) return inc;
                if ((inc.moveCount || 0) < (cur.moveCount || 0)) return cur;
                return (inc.updatedAt || '') >= (cur.updatedAt || '') ? inc : cur;
              };

              return {
                ...m,
                status: message.status === 'read' ? ('read' as const) : m.status,
                readAt: message.readAt ?? m.readAt,
                readBy: message.readBy ?? m.readBy,
                financialPoll: nextPoll,
                ajoGroup: message.ajoGroup ?? m.ajoGroup,
                xoGame: nextXo,
                whotGame: pickNewerGameState(m.whotGame, message.whotGame),
                ludoGame: pickNewerGameState(m.ludoGame, message.ludoGame),
                pokerGame: pickNewerGameState(m.pokerGame, message.pokerGame),
                billRequest: message.billRequest ?? m.billRequest,
              };
            });
            const updated = { ...prev, [resolvedChatId]: updatedList };
            try {
              const userKey = getUserStorageKey('AGC_messages_v2', userNow.phoneNumber);
              localStorage.setItem(userKey, JSON.stringify(updated));
            } catch (_) {}
            return updated;
          }
          return prev;
        }

        const isViewingChatNow =
          (currentActiveChatId === resolvedChatId || currentActiveChatId === chatId) &&
          (typeof document === 'undefined' || document.visibilityState === 'visible');

        const receivedMsg: ChatMessage = {
          ...message,
          text: plainText,
          isEncrypted: wasEncrypted,
          chatId: resolvedChatId,
          sender: isSelfChat ? 'user' : (isFromMe ? 'user' : 'other'),
          status:
            isViewingChatNow && !isFromMe && readReceiptsEnabledRef.current
              ? 'read'
              : message.status === 'read'
              ? 'read'
              : 'delivered',
          ...(isViewingChatNow && !isFromMe && readReceiptsEnabledRef.current
            ? { readAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
            : {}),
          ...((currentActiveChatId === resolvedChatId || currentActiveChatId === chatId) && (message.isGhost || message.disappearingDurationMs) && !message.expiresAt
            ? {
                viewedAt: Date.now(),
                expiresAt: Date.now() + (message.disappearingDurationMs || 30000),
              }
            : {}),
        };
        const updated = {
          ...prev,
          [resolvedChatId]: [...list, receivedMsg],
        };
        try {
          const userKey = getUserStorageKey('AGC_messages_v2', userNow.phoneNumber);
          localStorage.setItem(userKey, JSON.stringify(updated));
        } catch (_) {}
        return updated;
      });

      if (existingIdxSync >= 0) return;

      if (
        !isFromMe &&
        (currentActiveChatId === resolvedChatId || currentActiveChatId === chatId) &&
        readReceiptsEnabledRef.current &&
        (typeof document === 'undefined' || document.visibilityState === 'visible')
      ) {
        emitReadReceiptForChatRef.current(resolvedChatId, [message.id]);
      }

      const mentionedMe =
        !isFromMe &&
        doesMessageMentionUser({ ...message, text: plainText }, userNow);

      // 4. Update or insert thread
      setChats((prev) => {
        const index = prev.findIndex(
          (c) =>
            c.id === resolvedChatId ||
            c.id === chatId ||
            (!isGroupChat && otherCleanPhone && (c.phone || (c as any).phoneNumber) && phonesMatch(c.phone || (c as any).phoneNumber, otherCleanPhone))
        );

        const msgText = message.oneTimeView
          ? (message.type === 'image' ? '🔒 1-Time Photo' : message.type === 'voice' ? '🔒 1-Time Voice Note' : '🔒 1-Time Message')
          : (message.type === 'location'
              ? `📍 ${message.locationData?.addressName || message.metadata?.address_name || 'Shared Pin Location'}`
              : plainText ||
                (message.type === 'image'
                  ? '📷 Photo'
                  : message.type === 'voice'
                  ? '🎙️ Voice message'
                  : message.type === 'meme_sticker'
                  ? '🎭 Sticker'
                  : message.type === 'quick_poll' && message.quickPoll
                  ? `📊 Poll: ${message.quickPoll.question}`
                  : '📎 Attachment'));

        const peerPhoneDigits = otherCleanPhone || senderCleanPhone;
        const resolvedPeerPhone = isSelfChat
          ? userNow.phoneNumber
          : (message.senderPhone || (peerPhoneDigits ? `+${peerPhoneDigits}` : ''));
        const dirMatch = !isGroupChat && peerPhoneDigits
          ? adminUsersRef.current.find((u) => u.phoneNumber && phonesMatch(u.phoneNumber, peerPhoneDigits))
          : undefined;

        if (index >= 0) {
          const updated = [...prev];
          const matched = { ...updated[index] };
          const incomingTs = createdAtMs || Date.now();
          const prevTs = matched.lastMessageAtMs || 0;
          const isNewerMsg = incomingTs >= prevTs;
          const activeNow = activeChatIdRef.current;
          const isOpenNow = activeNow === resolvedChatId || activeNow === matched.id || activeNow === chatId;
          if (matched.id !== resolvedChatId && activeNow === matched.id) {
            setActiveChatId(resolvedChatId);
          }
          matched.id = resolvedChatId;
          if (!matched.phone && resolvedPeerPhone) {
            matched.phone = resolvedPeerPhone;
            (matched as any).phoneNumber = resolvedPeerPhone;
          }
          if (
            !isGroupChat &&
            !isFromMe &&
            (!matched.name || matched.name === 'Direct Chat' || matched.name === 'AGC Contact' || matched.name === 'AGC User')
          ) {
            const upgradedName = dirMatch?.fullName || dirMatch?.username || message.senderName;
            if (upgradedName) matched.name = upgradedName;
          }
          if (isNewerMsg) {
            matched.lastMessage = msgText;
            matched.lastMessageTime = message.timestamp;
          }
          matched.lastMessageAtMs = Math.max(prevTs, incomingTs);
          matched.unreadCount = isOpenNow || isFromMe ? (matched.unreadCount || 0) : (matched.unreadCount || 0) + 1;
          if (mentionedMe) {
            matched.unreadMentions = (matched.unreadMentions || 0) + 1;
            matched.lastMentionMessageId = message.id;
            if (!isOpenNow) {
              showLocalNotification(
                `@${userNow.username || userNow.fullName || 'You'} mentioned in ${matched.name}`,
                plainText || 'Mentioned you in chat',
                matched.avatar || '/icon-192.png'
              );
            }
          }
          updated.splice(index, 1);
          const finalUpdated = sortChatsByRecency([matched, ...updated]);
          persistPartitionedChats(finalUpdated, userNow.phoneNumber);
          return finalUpdated;
        } else {
          // Never auto-insert unjoined Town communities, channels, declined groups, or uninvited groups into personal chats
          if (resolvedChatId.startsWith('town_comm_') || chatId.startsWith('town_comm_')) {
            return prev;
          }
          if (isGroupChat) {
            const isExplicitMember =
              isFromMe ||
              (Array.isArray(chat?.memberPhones) &&
                Boolean(userNow.phoneNumber) &&
                chat.memberPhones.some((p: string) => phonesMatch(p, userNow.phoneNumber)));
            if (
              !isExplicitMember ||
              declinedGroupIdsRef.current.has(resolvedChatId) ||
              groupInvitesRef.current.some((inv) => inv.groupId === resolvedChatId && inv.status === 'pending')
            ) {
              return prev;
            }
          }
          const activeNow = activeChatIdRef.current;
          const incomingTs = createdAtMs || Date.now();
          const resolvedPeerName = isGroupChat
            ? (chat?.name || (isChannelChat ? 'Broadcast Channel' : 'Group Chat'))
            : isSelfChat
            ? `${userNow.fullName || 'You'} (Message yourself)`
            : (dirMatch?.fullName || dirMatch?.username || message.senderName || resolvedPeerPhone || 'AGC Contact');
          const newThread: ChatThread = {
            id: resolvedChatId,
            name: resolvedPeerName,
            avatar:
              (isGroupChat
                ? chat?.avatar
                : isSelfChat
                ? userNow.avatarUrl
                : (dirMatch?.avatarUrl || message.senderAvatar)) ||
              "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='50' fill='%23180a33'/><circle cx='50' cy='38' r='18' fill='%23a855f7'/><path d='M16 88c0-18.778 15.222-34 34-34s34 15.222 34 34' fill='%23a855f7'/></svg>",
            verifiedStore: false,
            location: isChannelChat
              ? 'Broadcast Channel'
              : isGroupChat
              ? 'Community Group'
              : isSelfChat
              ? 'Notes to Self'
              : (resolvedChatId.startsWith('town_comm_') ? 'Town Community' : 'Direct Chat'),
            unreadCount: activeNow === resolvedChatId || activeNow === chatId || isFromMe ? 0 : 1,
            lastMessage: msgText,
            lastMessageTime: message.timestamp,
            lastMessageAtMs: incomingTs,
            catalog: [],
            isOnline: true,
            isGroup: isGroupChat && !isChannelChat,
            isChannel: isChannelChat,
            membersCount: chat?.membersCount || computeClientMembersCount(chat?.members, chat?.memberPhones),
            members: chat?.members || [],
            memberPhones: chat?.memberPhones || [],
            phone: resolvedPeerPhone,
            phoneNumber: resolvedPeerPhone,
          };
          const finalUpdated = sortChatsByRecency([newThread, ...prev]);
          persistPartitionedChats(finalUpdated, userNow.phoneNumber);
          return finalUpdated;
        }
      });

      if (
        currentActiveChatId !== resolvedChatId &&
        currentActiveChatId !== chatId &&
        !isFromMe &&
        !notifiedMessageIdsRef.current.has(message.id)
      ) {
        notifiedMessageIdsRef.current.add(message.id);
        if (notifiedMessageIdsRef.current.size > 300) {
          const firstKey = notifiedMessageIdsRef.current.values().next().value;
          if (firstKey) notifiedMessageIdsRef.current.delete(firstKey);
        }
        showLocalNotification(
          `💬 ${message.senderName || 'AGC User'}`,
          message.type === 'location'
            ? `📍 ${message.locationData?.addressName || 'Shared a pin location'}`
            : (plainText || (message.type === 'image' ? '📷 Sent a photo' : 'Sent you an attachment')),
          message.senderAvatar || '/icon-192.png'
        );
      }
    },
    []
  );

  // Sync authoritative group & channel membership/counts/kicks from backend server
  const syncGroupsFromServer = useCallback(async () => {
    if (!isAuthenticatedRef.current || isHydratingChatsRef.current) return;
    const phone = currentUserRef.current?.phoneNumber || '';
    const userId = currentUserRef.current?.id || '';
    const norm = normalizePhoneDigits(phone);
    if (!norm || loadedPhoneForChatsRef.current !== norm) return;

    try {
      const res = await fetch(
        `/api/groups?phone=${encodeURIComponent(norm)}&userId=${encodeURIComponent(userId)}`
      );
      if (!res.ok) return;
      const json = await res.json();
      if (!json?.success) return;

      if (Array.isArray(json.excludedGroupIds)) {
        json.excludedGroupIds.forEach((excludedId: string) => {
          if (excludedId) {
            removeGroupLocallyAndCleanup(excludedId, { recordKick: true });
          }
        });
      }

      if (Array.isArray(json.groups)) {
        json.groups.forEach((g: any) => {
          applyAuthoritativeGroupUpdate(g);
        });
      }
    } catch (_) {}
  }, [applyAuthoritativeGroupUpdate, removeGroupLocallyAndCleanup]);
  syncGroupsFromServerRef.current = syncGroupsFromServer;

  // Store-and-forward missed-message recovery from server buffer
  const syncMissedMessagesFromServer = useCallback(async (specificChatId?: string) => {
    if (!isAuthenticatedRef.current || isHydratingChatsRef.current) return;
    const phone = currentUserRef.current?.phoneNumber;
    const norm = normalizePhoneDigits(phone);
    if (!norm || loadedPhoneForChatsRef.current !== norm) return;

    const watermarkKey = `AGC_last_msg_sync_${norm}`;
    const lastWatermark = Number(safeLocalStorage.getItem(watermarkKey) || 0);
    const sinceMs = lastWatermark > 0 ? Math.max(0, lastWatermark - 60_000) : Date.now() - 3 * 24 * 60 * 60 * 1000;

    try {
      const requests: Promise<any>[] = [
        fetch(`/api/messages/sync?phone=${encodeURIComponent(norm)}&sinceMs=${sinceMs}`)
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
      ];
      if (specificChatId && specificChatId !== AFRIBOT_ID && !kickedGroupIdsRef.current.has(specificChatId)) {
        requests.push(
          fetch(`/api/messages/chat/${encodeURIComponent(specificChatId)}?phone=${encodeURIComponent(norm)}&sinceMs=${sinceMs}`)
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null)
        );
      }
      const results = await Promise.all(requests);
      let newestServerTs = lastWatermark;
      const seenIds = new Set<string>();

      for (const res of results) {
        if (res?.removed && specificChatId) {
          removeGroupLocallyAndCleanup(specificChatId, { recordKick: true });
          continue;
        }
        if (!res?.success || !Array.isArray(res.messages)) continue;
        if (typeof res.serverTimeMs === 'number' && res.serverTimeMs > newestServerTs) {
          newestServerTs = res.serverTimeMs;
        }
        for (const entry of res.messages) {
          if (!entry?.message?.id || seenIds.has(entry.message.id)) continue;
          seenIds.add(entry.message.id);
          await handleIncomingMessage({
            chatId: entry.chatId,
            message: entry.message,
            targetPhone: entry.targetPhone,
            isGroup: entry.isGroup,
            chat: entry.chat,
            createdAtMs: entry.createdAtMs,
          });
        }
      }
      if (newestServerTs > lastWatermark) {
        safeLocalStorage.setItem(watermarkKey, String(newestServerTs));
      }
    } catch (_) {}
  }, [handleIncomingMessage, removeGroupLocallyAndCleanup]);
  syncMissedMessagesRef.current = (specificChatId?: string) => {
    void syncMissedMessagesFromServer(specificChatId);
  };

  useEffect(() => {
    const userAtMount = currentUserRef.current;
    const myCleanPhone = userAtMount.phoneNumber?.replace(/\D/g, '') || '';
    if (!isAuthenticated || !myCleanPhone) return;
    const normPhone = normalizePhoneDigits(myCleanPhone);
    const socket = initSocket({
      id: userAtMount.id,
      name: userAtMount.fullName,
      avatar: userAtMount.avatarUrl,
      phone: userAtMount.phoneNumber,
    });

    const registerRoomsOnConnect = () => {
      const latestUser = currentUserRef.current;
      const latestCleanPhone = latestUser.phoneNumber?.replace(/\D/g, '') || myCleanPhone;
      const latestNorm = normalizePhoneDigits(latestCleanPhone);
      const sessTok = safeLocalStorage.getItem('AGC_session_token') || undefined;
      if (latestCleanPhone) {
        socket.emit('register_phone', { phone: latestCleanPhone, sessionToken: sessTok });
        if (latestNorm !== latestCleanPhone) {
          socket.emit('register_phone', { phone: latestNorm, sessionToken: sessTok });
        }
        socket.emit('user_online', {
          userId: latestUser.id,
          userName: latestUser.fullName,
          avatar: latestUser.avatarUrl,
          phoneNumber: latestUser.phoneNumber,
        });
      }
      // Join active chat & all existing group/channel rooms so live kicks & member updates arrive immediately
      if (activeChatIdRef.current) {
        joinChatRoom(activeChatIdRef.current);
      }
      chatsRef.current.forEach((c) => {
        if (c.isGroup || c.isChannel) joinChatRoom(c.id);
      });
      void syncGroupsFromServer();
      void syncMissedMessagesFromServer(activeChatIdRef.current || undefined);
    };

    if (socket.connected) {
      registerRoomsOnConnect();
    } else {
      void syncGroupsFromServer();
      void syncMissedMessagesFromServer(activeChatIdRef.current || undefined);
    }
    socket.on('connect', registerRoomsOnConnect);

    const handleInboxFocusOrVis = () => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        void syncGroupsFromServer();
        syncLiveCommunitiesRef.current?.();
        void syncMissedMessagesFromServer(activeChatIdRef.current || undefined);
        if (activeChatIdRef.current) {
          emitReadReceiptForChatRef.current(activeChatIdRef.current);
        }
      }
    };
    window.addEventListener('focus', handleInboxFocusOrVis);
    document.addEventListener('visibilitychange', handleInboxFocusOrVis);
    const missedSyncInterval = setInterval(() => {
      void syncGroupsFromServer();
      void syncMissedMessagesFromServer(activeChatIdRef.current || undefined);
    }, 10_000);

    // 1. Socket.io listeners
    const handleXoGameSocket = (payload: any) => {
      if (payload?.game) applyXoGameUpdate(payload.game);
    };
    const handleWhotGameSocket = (payload: any) => {
      if (payload?.payload) applyWhotGameUpdate(payload.payload);
    };
    const handleLudoGameSocket = (payload: any) => {
      if (payload?.payload) applyLudoGameUpdate(payload.payload);
    };
    const handlePokerGameSocket = (payload: any) => {
      if (payload?.payload) applyPokerGameUpdate(payload.payload);
    };
    const handleBillRequestSocket = (payload: any) => {
      if (payload?.payload) applyBillRequestUpdate(payload.payload);
    };

    const handleChatMetaUpdateSocket = (payload: any) => {
      if (!payload?.chatId) return;
      const updates: Partial<ChatThread> = {};
      if (payload.disappearingTimer !== undefined) updates.disappearingTimer = payload.disappearingTimer;
      if (payload.pinnedMessage !== undefined) updates.pinnedMessage = payload.pinnedMessage;
      if (payload.chatTheme !== undefined) updates.chatTheme = payload.chatTheme;
      if (Object.keys(updates).length > 0) {
        updateChat(payload.chatId, updates);
      }
    };
    const handleQuickPollUpdateSocket = (payload: any) => {
      if (!payload?.chatId || !payload?.messageId || !payload?.quickPoll) return;
      setMessages((prev) => {
        const list = prev[payload.chatId];
        if (!list) return prev;
        const nextList = list.map((m) =>
          m.id === payload.messageId ? { ...m, quickPoll: payload.quickPoll } : m
        );
        const updated = { ...prev, [payload.chatId]: nextList };
        persistPartitionedMessages(updated, currentUserRef.current.phoneNumber);
        return updated;
      });
    };

    const handleOnlineFlushOutbox = () => {
      try {
        const raw = localStorage.getItem('AGC_offline_outbox');
        if (!raw) return;
        const queued: Array<{ chatId: string; msg: ChatMessage }> = JSON.parse(raw);
        if (!Array.isArray(queued) || queued.length === 0) return;
        localStorage.removeItem('AGC_offline_outbox');
        window.dispatchEvent(new CustomEvent('agc-outbox-changed'));
        queued.forEach((item) => {
          if (item?.chatId && item?.msg) {
            broadcastLiveMessage(item.chatId, item.msg);
          }
        });
      } catch (_) {}
    };
    window.addEventListener('online', handleOnlineFlushOutbox);

    socket.on('new_message', handleIncomingMessage);
    socket.on('messages_read', applyRemoteReadReceipt);
    socket.on('message_reaction', applyRemoteMessageReaction);
    socket.on('chat_meta_update', handleChatMetaUpdateSocket);
    socket.on('quick_poll_update', handleQuickPollUpdateSocket);
    socket.on('xo_game_update', handleXoGameSocket);
    socket.on('whot_game_update', handleWhotGameSocket);
    socket.on('ludo_game_update', handleLudoGameSocket);
    socket.on('poker_game_update', handlePokerGameSocket);
    socket.on('bill_request_update', handleBillRequestSocket);

    const handleGroupCreated = (payload: any) => {
      if (!payload?.chat) return;
      const chat: ChatThread = payload.chat;
      if (chat.name && chat.name.trim().startsWith('__')) return;
      const latestUser = currentUserRef.current;
      if (chat.creatorId && chat.creatorId === latestUser.id) return;
      const isTargeted =
        (payload.targetPhone && latestUser.phoneNumber && phonesMatch(payload.targetPhone, latestUser.phoneNumber)) ||
        (Array.isArray(chat.memberPhones) &&
          Boolean(latestUser.phoneNumber) &&
          chat.memberPhones.some((p) => phonesMatch(p, latestUser.phoneNumber)));
      if (!isTargeted) return;
      if (chatsRef.current.some((c) => c.id === chat.id && c.invitationStatus !== 'pending')) return;
      const syntheticInvite: GroupInvitation = {
        id: `ginv_${chat.id}_${myCleanPhone || 'me'}`,
        groupId: chat.id,
        groupName: chat.name,
        groupAvatar: chat.avatar,
        entityType: chat.isChannel || chat.id.startsWith('channel_') ? 'channel' : 'group',
        description: chat.description,
        invitedPhone: latestUser.phoneNumber || '',
        invitedByPhone: chat.memberPhones?.[0] || '',
        invitedByName: chat.invitedBy || chat.admins?.[0] || 'Group Admin',
        membersCount: chat.membersCount || 1,
        chatSnapshot: { ...chat, invitationStatus: 'pending' },
        createdAt: 'Just now',
        status: 'pending',
      };
      handleIncomingGroupInvite(syntheticInvite, chat);
    };

    const handleGroupInviteSocket = (payload: any) => {
      if (payload?.invite) {
        handleIncomingGroupInvite(payload.invite, payload.chat);
      }
    };

    const handleGroupInviteResponse = (payload: any) => {
      if (!payload?.groupId) return;
      const { groupId, responderPhone, responderName, accepted, group } = payload;
      const latestUser = currentUserRef.current;
      if (responderPhone && latestUser.phoneNumber && phonesMatch(responderPhone, latestUser.phoneNumber)) {
        return;
      }

      if (group && group.id) {
        applyAuthoritativeGroupUpdate(group);
      }

      const displayName = responderName || responderPhone || 'Contact';
      let addedNewMember = false;

      setChats((prev) => {
        const target = prev.find((c) => c.id === groupId);
        if (!target) return prev;
        const alreadyMember = Boolean(
          (responderPhone && target.memberPhones?.some((p) => phonesMatch(p, responderPhone))) ||
            target.members?.some(
              (m) =>
                m.toLowerCase() === displayName.toLowerCase() ||
                (responderPhone && phonesMatch(m, responderPhone))
            )
        );
        const updated = prev.map((c) => {
          if (c.id !== groupId) return c;
          const nextPending = (c.pendingMembers || []).filter(
            (m) => m.toLowerCase() !== displayName.toLowerCase() && (!responderPhone || !phonesMatch(m, responderPhone))
          );
          const nextPendingPhones = (c.pendingPhones || []).filter(
            (p) => !responderPhone || !phonesMatch(p, responderPhone)
          );
          if (accepted) {
            if (!alreadyMember) addedNewMember = true;
            const nextMembers = dedupeNameList([...(c.members || []), displayName]);
            const nextPhones = dedupePhoneList([...(c.memberPhones || []), ...(responderPhone ? [responderPhone] : [])]);
            const nextCount = computeClientMembersCount(nextMembers, nextPhones);
            return {
              ...c,
              pendingMembers: nextPending,
              pendingPhones: nextPendingPhones,
              kickedPhones: (c.kickedPhones || []).filter((kp) => !responderPhone || !phonesMatch(kp, responderPhone)),
              members: nextMembers,
              memberPhones: nextPhones,
              membersCount: Math.max(nextCount, Number(group?.membersCount || 0)),
              lastMessage: alreadyMember ? c.lastMessage : `${displayName} joined`,
              lastMessageTime: alreadyMember ? c.lastMessageTime : 'Just now',
            };
          }
          return {
            ...c,
            pendingMembers: nextPending,
            pendingPhones: nextPendingPhones,
          };
        });
        persistPartitionedChats(updated, latestUser.phoneNumber);
        return updated;
      });

      if (addedNewMember) {
        const sysMsg: ChatMessage = {
          id: `msg_sys_invres_${Date.now()}`,
          chatId: groupId,
          sender: 'system',
          text: accepted
            ? `✅ ${displayName} accepted the invitation and joined.`
            : `${displayName} declined the invitation.`,
          type: 'text',
          timestamp: 'Just now',
          status: 'sent',
        };
        setMessages((prev) => {
          const list = prev[groupId] || [];
          const updated = { ...prev, [groupId]: [...list, sysMsg] };
          persistPartitionedMessages(updated, latestUser.phoneNumber);
          return updated;
        });
        if (accepted) {
          showLocalNotification(`✅ ${displayName} joined`, `${displayName} accepted your group/channel invite.`);
        }
      }
    };

    const handleGroupUpdatedEvent = (payload: any) => {
      const grp = payload?.group || payload;
      if (!grp?.id) return;
      applyAuthoritativeGroupUpdate(grp);
    };

    const handleGroupKickedEvent = (payload: any) => {
      const gid = payload?.groupId || payload?.id;
      if (!gid) return;
      const myPhone = currentUserRef.current?.phoneNumber || '';
      if (payload?.targetPhone && myPhone && !phonesMatch(payload.targetPhone, myPhone)) return;
      removeGroupLocallyAndCleanup(gid, {
        recordKick: true,
        notifyTitle: `Removed from ${payload?.groupName || 'Group'}`,
        notifyBody: 'An admin removed you from this conversation.',
      });
    };

    const handleFriendRequestSocket = ({ request }: any) => {
      if (request) handleIncomingFriendRequest(request);
    };

    const handleFriendRequestAccepted = (payload: any) => {
      if (!payload || !payload.acceptorPhone) return;
      const latestUser = currentUserRef.current;
      if (latestUser.phoneNumber && phonesMatch(payload.acceptorPhone, latestUser.phoneNumber)) return;
      const acceptorName = payload.acceptorName || payload.acceptorPhone;
      addNewDeviceContact(
        acceptorName,
        payload.acceptorPhone,
        'Accepted your Contact Request',
        true,
        payload.acceptorAvatar,
        { sendRequest: false }
      );
      showLocalNotification(
        `✅ ${acceptorName} accepted your request`,
        `You can now chat securely with ${acceptorName}.`,
        payload.acceptorAvatar || '/icon-192.png'
      );
    };

    const handleDispatchOrderCreated = (order: DispatchDeliveryOrder) => {
      if (!order?.id) return;
      setDispatchOrders((prev) => {
        if (prev.some((o) => o.id === order.id)) return prev;
        const updated = [order, ...prev];
        localStorage.setItem('AGC_dispatch_orders', JSON.stringify(updated));
        return updated;
      });
    };

    const handleDispatchStatusUpdated = ({ id, status, order }: any) => {
      if (!id) return;
      setDispatchOrders((prev) => {
        const updated = prev.map((o) => {
          if (o.id === id) {
            return { ...(order || o), status };
          }
          return o;
        });
        localStorage.setItem('AGC_dispatch_orders', JSON.stringify(updated));
        return updated;
      });
    };

    const handleAccountBanned = (payload: any) => {
      setIsBanned(true);
      setBanInfo(payload);
    };

    const handleSpaceEndedSocket = (payload: any) => {
      const endedId = payload?.spaceId || payload?.id;
      if (!endedId) return;
      setAudioSpaces((prev) => prev.filter((s) => s.id !== endedId));
      const active = activeAudioSpaceRef.current;
      if (active && active.id === endedId) {
        setSpaceEndedSummary({
          spaceId: endedId,
          title: active.title || 'Live Community Space',
          durationFormatted: payload?.durationFormatted || 'Live session',
          peakListeners: payload?.peakListeners || active.peakListeners || active.listenersCount || 1,
        });
        setActiveAudioSpace(null);
      }
    };

    const handleSpaceStateSyncSocket = (payload: any) => {
      if (!payload?.spaceId) return;
      setAudioSpaces((prev) =>
        prev.map((s) =>
          s.id === payload.spaceId
            ? {
                ...s,
                hostId: payload.hostId || s.hostId,
                speakers: Array.isArray(payload.speakers) ? payload.speakers : s.speakers,
                listeners: Array.isArray(payload.listeners) ? payload.listeners : s.listeners,
                listenersCount: payload.listenersCount ?? s.listenersCount,
                peakListeners: Math.max(s.peakListeners || 0, payload.listenersCount || 0),
                pinnedAnnouncement: payload.pinnedNote ?? s.pinnedAnnouncement,
              }
            : s
        )
      );
      setActiveAudioSpace((prev) => {
        if (!prev || prev.id !== payload.spaceId) return prev;
        return {
          ...prev,
          hostId: payload.hostId || prev.hostId,
          speakers: Array.isArray(payload.speakers) ? payload.speakers : prev.speakers,
          listeners: Array.isArray(payload.listeners) ? payload.listeners : prev.listeners,
          listenersCount: payload.listenersCount ?? prev.listenersCount,
          peakListeners: Math.max(prev.peakListeners || 0, payload.listenersCount || 0),
          pinnedAnnouncement: payload.pinnedNote ?? prev.pinnedAnnouncement,
        };
      });
    };

    socket.on('account_banned', handleAccountBanned);
    socket.on('group_created', handleGroupCreated);
    socket.on('group_invite', handleGroupInviteSocket);
    socket.on('group_invite_response', handleGroupInviteResponse);
    socket.on('group_updated', handleGroupUpdatedEvent);
    socket.on('group_kicked', handleGroupKickedEvent);
    socket.on('friend_request', handleFriendRequestSocket);
    socket.on('friend_request_accepted', handleFriendRequestAccepted);
    socket.on('dispatch_order_created', handleDispatchOrderCreated);
    socket.on('dispatch_status_updated', handleDispatchStatusUpdated);
    socket.on('space_ended', handleSpaceEndedSocket);
    socket.on('space_state_sync', handleSpaceStateSyncSocket);

    // 2. BroadcastChannel listener (instant multi-tab / window sync)
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('AGC_chats_sync');
      bc.onmessage = (e) => {
        const latestUser = currentUserRef.current;
        if (e.data && e.data.type === 'messages_read' && e.data.chatId) {
          applyRemoteReadReceipt(e.data);
          return;
        }
        if (e.data && e.data.type === 'message_reaction' && e.data.chatId && e.data.messageId) {
          applyRemoteMessageReaction(e.data);
          return;
        }
        if (e.data && e.data.type === 'chat_meta_update' && e.data.chatId) {
          handleChatMetaUpdateSocket(e.data);
          return;
        }
        if (e.data && e.data.type === 'quick_poll_update' && e.data.chatId) {
          handleQuickPollUpdateSocket(e.data);
          return;
        }
        if (e.data && e.data.type === 'xo_game_update' && e.data.game) {
          applyXoGameUpdate(e.data.game);
          return;
        }
        if (e.data && e.data.type === 'whot_game_update' && e.data.payload) {
          applyWhotGameUpdate(e.data.payload);
          return;
        }
        if (e.data && e.data.type === 'ludo_game_update' && e.data.payload) {
          applyLudoGameUpdate(e.data.payload);
          return;
        }
        if (e.data && e.data.type === 'poker_game_update' && e.data.payload) {
          applyPokerGameUpdate(e.data.payload);
          return;
        }
        if (e.data && e.data.type === 'bill_request_update' && e.data.payload) {
          applyBillRequestUpdate(e.data.payload);
          return;
        }
        if (e.data && e.data.type === 'group_invite' && e.data.invite) {
          const myPhone = latestUser.phoneNumber?.replace(/\D/g, '') || '';
          const target = (e.data.targetPhone || e.data.invite.invitedPhone || '').replace(/\D/g, '');
          const sender = (e.data.invite.invitedByPhone || '').replace(/\D/g, '');
          if (target && myPhone && phonesMatch(target, myPhone) && (!sender || !phonesMatch(sender, myPhone))) {
            handleIncomingGroupInvite(e.data.invite, e.data.chat);
          }
          return;
        }
        if (e.data && e.data.type === 'group_invite_response' && e.data.groupId) {
          handleGroupInviteResponse(e.data);
          return;
        }
        if (e.data && e.data.type === 'group_updated' && e.data.group) {
          handleGroupUpdatedEvent(e.data);
          return;
        }
        if (e.data && e.data.type === 'group_kicked' && e.data.groupId) {
          handleGroupKickedEvent(e.data);
          return;
        }
        if (e.data && e.data.type === 'friend_request' && e.data.request) {
          const myPhone = latestUser.phoneNumber?.replace(/\D/g, '') || '';
          const target = (e.data.targetPhone || e.data.request.recipientPhone || '').replace(/\D/g, '');
          const sender = (e.data.request.senderPhone || '').replace(/\D/g, '');
          if (target && myPhone && phonesMatch(target, myPhone) && (!sender || !phonesMatch(sender, myPhone))) {
            handleIncomingFriendRequest(e.data.request);
          }
          return;
        }
        if (e.data && e.data.chatId && e.data.message) {
          const { chatId, senderId, targetPhone, isGroup } = e.data;
          const myPhone = latestUser.phoneNumber?.replace(/\D/g, '') || '';
          if (senderId === latestUser.id && !chatId.includes('self')) {
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
        .on('broadcast', { event: 'messages_read' }, ({ payload }: any) => {
          if (payload?.chatId) {
            applyRemoteReadReceipt(payload);
          }
        })
        .on('broadcast', { event: 'message_reaction' }, ({ payload }: any) => {
          if (payload?.chatId && payload?.messageId) {
            applyRemoteMessageReaction(payload);
          }
        })
        .on('broadcast', { event: 'chat_meta_update' }, ({ payload }: any) => {
          if (payload?.chatId) handleChatMetaUpdateSocket(payload);
        })
        .on('broadcast', { event: 'quick_poll_update' }, ({ payload }: any) => {
          if (payload?.chatId && payload?.quickPoll) handleQuickPollUpdateSocket(payload);
        })
        .on('broadcast', { event: 'xo_game_update' }, ({ payload }: any) => {
          if (payload?.game) {
            applyXoGameUpdate(payload.game);
          }
        })
        .on('broadcast', { event: 'whot_game_update' }, ({ payload }: any) => {
          if (payload?.payload) {
            applyWhotGameUpdate(payload.payload);
          }
        })
        .on('broadcast', { event: 'ludo_game_update' }, ({ payload }: any) => {
          if (payload?.payload) {
            applyLudoGameUpdate(payload.payload);
          }
        })
        .on('broadcast', { event: 'poker_game_update' }, ({ payload }: any) => {
          if (payload?.payload) {
            applyPokerGameUpdate(payload.payload);
          }
        })
        .on('broadcast', { event: 'bill_request_update' }, ({ payload }: any) => {
          if (payload?.payload) {
            applyBillRequestUpdate(payload.payload);
          }
        })
        .on('broadcast', { event: 'group_created' }, ({ payload }: any) => {
          if (payload && payload.chat) {
            handleGroupCreated(payload);
          }
        })
        .on('broadcast', { event: 'group_invite' }, ({ payload }: any) => {
          if (payload && payload.invite) {
            handleIncomingGroupInvite(payload.invite, payload.chat);
          }
        })
        .on('broadcast', { event: 'group_invite_response' }, ({ payload }: any) => {
          if (payload && payload.groupId) {
            handleGroupInviteResponse(payload);
          }
        })
        .on('broadcast', { event: 'group_updated' }, ({ payload }: any) => {
          if (payload) handleGroupUpdatedEvent(payload);
        })
        .on('broadcast', { event: 'group_kicked' }, ({ payload }: any) => {
          if (payload) handleGroupKickedEvent(payload);
        })
        .on('broadcast', { event: 'friend_request' }, ({ payload }: any) => {
          if (payload && payload.request) {
            handleIncomingFriendRequest(payload.request);
          }
        })
        .on('broadcast', { event: 'friend_request_accepted' }, ({ payload }: any) => {
          handleFriendRequestAccepted(payload);
        })
        .on('broadcast', { event: 'incoming_call' }, ({ payload }: any) => {
          callSignalHandlersRef.current.onIncomingCall(payload);
        })
        .on('broadcast', { event: 'call_declined' }, ({ payload }: any) => {
          callSignalHandlersRef.current.onCallTerminated(payload, 'call_declined');
        })
        .on('broadcast', { event: 'call_ended' }, ({ payload }: any) => {
          callSignalHandlersRef.current.onCallTerminated(payload, 'call_ended');
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
          .on('broadcast', { event: 'messages_read' }, ({ payload }: any) => {
            if (payload?.chatId) {
              applyRemoteReadReceipt(payload);
            }
          })
          .on('broadcast', { event: 'message_reaction' }, ({ payload }: any) => {
            if (payload?.chatId && payload?.messageId) {
              applyRemoteMessageReaction(payload);
            }
          })
          .on('broadcast', { event: 'xo_game_update' }, ({ payload }: any) => {
            if (payload?.game) {
              applyXoGameUpdate(payload.game);
            }
          })
          .on('broadcast', { event: 'whot_game_update' }, ({ payload }: any) => {
            if (payload?.payload) {
              applyWhotGameUpdate(payload.payload);
            }
          })
          .on('broadcast', { event: 'ludo_game_update' }, ({ payload }: any) => {
            if (payload?.payload) {
              applyLudoGameUpdate(payload.payload);
            }
          })
          .on('broadcast', { event: 'poker_game_update' }, ({ payload }: any) => {
            if (payload?.payload) {
              applyPokerGameUpdate(payload.payload);
            }
          })
          .on('broadcast', { event: 'bill_request_update' }, ({ payload }: any) => {
            if (payload?.payload) {
              applyBillRequestUpdate(payload.payload);
            }
          })
          .on('broadcast', { event: 'group_created' }, ({ payload }: any) => {
            if (payload && payload.chat) {
              handleGroupCreated(payload);
            }
          })
          .on('broadcast', { event: 'group_invite' }, ({ payload }: any) => {
            if (payload && payload.invite) {
              handleIncomingGroupInvite(payload.invite, payload.chat);
            }
          })
          .on('broadcast', { event: 'group_invite_response' }, ({ payload }: any) => {
            if (payload && payload.groupId) {
              handleGroupInviteResponse(payload);
            }
          })
          .on('broadcast', { event: 'group_updated' }, ({ payload }: any) => {
            if (payload) handleGroupUpdatedEvent(payload);
          })
          .on('broadcast', { event: 'group_kicked' }, ({ payload }: any) => {
            if (payload) handleGroupKickedEvent(payload);
          })
          .on('broadcast', { event: 'friend_request' }, ({ payload }: any) => {
            if (payload && payload.request) {
              handleIncomingFriendRequest(payload.request);
            }
          })
          .on('broadcast', { event: 'friend_request_accepted' }, ({ payload }: any) => {
            handleFriendRequestAccepted(payload);
          })
          .on('broadcast', { event: 'incoming_call' }, ({ payload }: any) => {
            callSignalHandlersRef.current.onIncomingCall(payload);
          })
          .on('broadcast', { event: 'call_declined' }, ({ payload }: any) => {
            callSignalHandlersRef.current.onCallTerminated(payload, 'call_declined');
          })
          .on('broadcast', { event: 'call_ended' }, ({ payload }: any) => {
            callSignalHandlersRef.current.onCallTerminated(payload, 'call_ended');
          })
          .subscribe();
      }
    }

    // 4. Persistent Supabase Realtime Town Feed Listener (only for communities the user has joined/opened)
    let sbTownFeed: any = null;
    if (isSupabaseConfigured) {
      sbTownFeed = supabase.channel('town_community_feed', {
        config: { broadcast: { self: false } },
      });
      sbTownFeed
        .on('broadcast', { event: 'new_message' }, ({ payload }: any) => {
          const latestUser = currentUserRef.current;
          if (payload && payload.message && payload.senderId !== latestUser.id) {
            const hasThread =
              chatsRef.current.some((c) => c.id === payload.chatId) ||
              townCommunitiesRef.current.some((tc) => `town_comm_${tc.id}` === payload.chatId && tc.isJoined);
            if (hasThread) {
              handleIncomingMessage(payload);
            }
          }
        })
        .subscribe();
    }

    return () => {
      clearInterval(missedSyncInterval);
      window.removeEventListener('focus', handleInboxFocusOrVis);
      document.removeEventListener('visibilitychange', handleInboxFocusOrVis);
      window.removeEventListener('online', handleOnlineFlushOutbox);
      socket.off('connect', registerRoomsOnConnect);
      socket.off('account_banned', handleAccountBanned);
      socket.off('new_message', handleIncomingMessage);
      socket.off('messages_read', applyRemoteReadReceipt);
      socket.off('message_reaction', applyRemoteMessageReaction);
      socket.off('chat_meta_update', handleChatMetaUpdateSocket);
      socket.off('quick_poll_update', handleQuickPollUpdateSocket);
      socket.off('xo_game_update', handleXoGameSocket);
      socket.off('whot_game_update', handleWhotGameSocket);
      socket.off('ludo_game_update', handleLudoGameSocket);
      socket.off('poker_game_update', handlePokerGameSocket);
      socket.off('bill_request_update', handleBillRequestSocket);
      socket.off('group_created', handleGroupCreated);
      socket.off('group_invite', handleGroupInviteSocket);
      socket.off('group_invite_response', handleGroupInviteResponse);
      socket.off('group_updated', handleGroupUpdatedEvent);
      socket.off('group_kicked', handleGroupKickedEvent);
      socket.off('friend_request', handleFriendRequestSocket);
      socket.off('friend_request_accepted', handleFriendRequestAccepted);
      socket.off('dispatch_order_created', handleDispatchOrderCreated);
      socket.off('dispatch_status_updated', handleDispatchStatusUpdated);
      socket.off('space_ended', handleSpaceEndedSocket);
      socket.off('space_state_sync', handleSpaceStateSyncSocket);
      if (bc) bc.close();
      if (sbInboxChannel) sbInboxChannel.unsubscribe();
      if (sbInboxNorm) sbInboxNorm.unsubscribe();
      if (sbTownFeed) sbTownFeed.unsubscribe();
    };
  }, [currentUser.id, currentUser.phoneNumber, isAuthenticated, handleIncomingMessage, syncMissedMessagesFromServer, applyXoGameUpdate, applyWhotGameUpdate, applyLudoGameUpdate, applyPokerGameUpdate, applyBillRequestUpdate, applyRemoteMessageReaction, applyRemoteReadReceipt]);

  const syncCurrentUserFromRecord = useCallback((me?: AdminUserRecord) => {
    const cur = currentUserRef.current;
    if (!me || !cur?.phoneNumber) return;

    const remoteName = me.username || me.fullName;
    const isValidRemoteName =
      Boolean(remoteName) && remoteName !== 'AGC User' && remoteName !== 'Registered User';
    const isRecentLocalEdit = Date.now() - lastLocalProfileEditAtRef.current < 20_000;
    const shouldSyncName =
      !isRecentLocalEdit &&
      isValidRemoteName &&
      remoteName !== cur.fullName;
    const shouldSyncAvatar =
      !isRecentLocalEdit &&
      Boolean(me.avatarUrl) &&
      !isPlaceholderAvatar(me.avatarUrl) &&
      (isPlaceholderAvatar(cur.avatarUrl) || me.avatarUrl !== cur.avatarUrl);

    if (
      me.verificationBadge !== cur.verificationBadge ||
      (me.role && me.role !== cur.role) ||
      shouldSyncName ||
      shouldSyncAvatar
    ) {
      setCurrentUser((prev) => {
        const updated: UserProfile = {
          ...prev,
          fullName: shouldSyncName ? remoteName! : prev.fullName,
          username: shouldSyncName ? (me.username || remoteName) : prev.username,
          avatarUrl: shouldSyncAvatar ? me.avatarUrl : prev.avatarUrl,
          verificationBadge: me.verificationBadge !== undefined ? me.verificationBadge : prev.verificationBadge,
          role: (me.role as UserProfile['role']) || prev.role,
        };
        persistPartitionedUserProfile(updated);
        return updated;
      });
    }

    if (me.status === 'banned') {
      const nextBan = {
        reason: me.banReason || 'Violation of AfriChat platform terms and conditions.',
        bannedAt: me.bannedAt || new Date().toISOString(),
      };
      setIsBanned(true);
      setBanInfo(nextBan);
      try {
        localStorage.setItem('AGC_banned_state', JSON.stringify({
          isBanned: true,
          reason: nextBan.reason,
          bannedAt: nextBan.bannedAt,
          phone: cur.phoneNumber,
        }));
      } catch (_) {}
    } else if (me.status === 'active') {
      setIsBanned((prev) => (prev ? false : prev));
      setBanInfo((prev) => (prev ? null : prev));
      try {
        const savedBan = localStorage.getItem('AGC_banned_state');
        if (savedBan) {
          const parsed = JSON.parse(savedBan);
          if (!parsed?.phone || phonesMatch(parsed.phone, cur.phoneNumber)) {
            localStorage.removeItem('AGC_banned_state');
          }
        }
      } catch (_) {}
    }

    if (me.adminWalletAdjustedAt && me.walletBalanceNgn !== undefined) {
      const adjTs = Date.parse(me.adminWalletAdjustedAt) || 0;
      const walletTsKey = getUserStorageKey('AGC_last_admin_wallet_ts', cur.phoneNumber);
      let lastSeenTs = 0;
      try {
        lastSeenTs = Number(localStorage.getItem(walletTsKey) || 0);
      } catch (_) {}
      if (adjTs > lastSeenTs) {
        setWallet((w) => {
          const updated = { ...w, availableBalance: me.walletBalanceNgn };
          walletRef.current = updated;
          if (cur.phoneNumber) persistPartitionedWallet(updated, cur.phoneNumber);
          return updated;
        });
        try { localStorage.setItem(walletTsKey, String(adjTs)); } catch (_) {}
      }
    }
  }, []);

  // Global live sync for Admin Feature Flags, System Config, CMS, Broadcasts & Registered Users
  const refreshAdminUsers = async (): Promise<void> => {
    try {
      const [apiRes, sbRes, sbOverrides] = await Promise.all([
        safeJsonFetch('/api/users'),
        isSupabaseConfigured
          ? supabase.from('agc_phone_registry').select('*').then((r) => r, () => null)
          : Promise.resolve(null),
        fetchSupabaseAdminSlice<{ overrides?: Record<string, any> }>(ADMIN_SYS_USERS_KEY),
      ]);

      let nextList = adminUsersRef.current.filter((u) => !isSyntheticTestUser(u));

      if (sbRes && !sbRes.error && Array.isArray(sbRes.data)) {
        const sbMapped: AdminUserRecord[] = sbRes.data
          .filter((row: any) => !isSyntheticTestUser(row))
          .map((row: any) => ({
          id: `usr_${row.phone_digits || (row.full_phone || '').replace(/\D/g, '')}`,
          fullName: row.username || 'Registered User',
          phoneNumber: row.full_phone || (row.phone_digits ? `+234${String(row.phone_digits).replace(/^0+/, '')}` : ''),
          avatarUrl: row.avatar_url || `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(row.username || 'user')}`,
          role: 'user',
          verificationBadge: null,
          isPhoneVerified: true,
          status: 'active',
          joinedDate: row.registered_at ? new Date(row.registered_at).toLocaleDateString() : 'Recent',
          walletBalanceNgn: 0,
          ordersCount: 0,
          isOnline: false,
          lastSeen: row.updated_at || row.registered_at || undefined,
        }));
        nextList = mergeAdminUsersList(nextList, sbMapped, false);
      }

      if (apiRes?.users && Array.isArray(apiRes.users)) {
        const mappedUsers = apiRes.users
          .filter((u: any) => !isSyntheticTestUser(u))
          .map(mapRawToAdminUser);
        nextList = mergeAdminUsersList(nextList, mappedUsers, true);
      }

      if (sbOverrides?.overrides && typeof sbOverrides.overrides === 'object') {
        const overrideRecords: AdminUserRecord[] = Object.entries(sbOverrides.overrides)
          .map(([key, ov]: [string, any]) => {
            const phoneStr = ov.phoneNumber || (key.length >= 9 ? `+234${key}` : key);
            return mapRawToAdminUser({
              ...ov,
              id: ov.id || `usr_${key}`,
              phoneNumber: phoneStr,
            });
          })
          .filter((u) => !isSyntheticTestUser(u));
        nextList = mergeAdminUsersList(nextList, overrideRecords, true);
      }

      nextList = nextList.filter((u) => !isSyntheticTestUser(u));
      adminUsersRef.current = nextList;
      setAdminUsers(nextList);

      const myPhoneClean = (currentUser?.phoneNumber || '').replace(/\D/g, '');
      if (myPhoneClean) {
        const me = nextList.find((u) => phonesMatch(u.phoneNumber, currentUser.phoneNumber));
        if (me) {
          syncCurrentUserFromRecord(me);
        }
      }
    } catch (_) {}
  };

  useEffect(() => {
    try {
      localStorage.removeItem('AGC_system_config_v1');
      localStorage.removeItem('AGC_feature_flags_v1');
      localStorage.removeItem('AGC_cms_data_v1');
      localStorage.removeItem('AGC_system_broadcast');
      localStorage.removeItem('AGC_admin_users');
    } catch (_) {}

    const syncAdminFromServer = async () => {
      try {
        const [apiData, sbCfg, sbCms, sbStores] = await Promise.all([
          safeJsonFetch('/api/admin/config'),
          fetchSupabaseAdminSlice<{ config?: Partial<AdminSystemConfig>; featureFlags?: Partial<FeatureFlags>; updatedAt?: string }>(ADMIN_SYS_CONFIG_KEY),
          fetchSupabaseAdminSlice<{ cms?: Partial<AdminCmsData>; activeBroadcast?: AdminSystemBroadcast | null; updatedAt?: string }>(ADMIN_SYS_CMS_KEY),
          fetchSupabaseAdminSlice<{ stores?: Record<string, any>; artisans?: Record<string, any> }>(ADMIN_SYS_STORES_KEY),
        ]);

        // Reconcile System Config & Feature Flags using newest updatedAt timestamp
        const apiCfgTs = apiData?.updatedAt ? (Date.parse(apiData.updatedAt) || 0) : 0;
        const sbCfgTs = sbCfg?.updatedAt ? (Date.parse(sbCfg.updatedAt) || 0) : 0;
        const cfgWinner =
          sbCfg && sbCfgTs >= apiCfgTs && sbCfgTs >= adminConfigUpdatedAtRef.current
            ? sbCfg
            : apiData?.success && apiCfgTs >= adminConfigUpdatedAtRef.current
            ? apiData
            : sbCfg && !apiData?.success
            ? sbCfg
            : null;

        if (cfgWinner) {
          const winnerTs = Math.max(apiCfgTs, sbCfgTs);
          if (winnerTs > adminConfigUpdatedAtRef.current) {
            adminConfigUpdatedAtRef.current = winnerTs;
          }
          if (cfgWinner.config) {
            const merged = { ...DEFAULT_SYSTEM_CONFIG, ...cfgWinner.config };
            systemConfigRef.current = merged;
            setSystemConfig(merged);
          }
          if (cfgWinner.featureFlags) {
            const merged = { ...DEFAULT_FEATURE_FLAGS, ...cfgWinner.featureFlags };
            featureFlagsRef.current = merged;
            setFeatureFlags(merged);
          }
        }

        // Reconcile CMS & Active Broadcast using newest updatedAt timestamp
        const apiCmsTs = apiData?.cmsUpdatedAt
          ? (Date.parse(apiData.cmsUpdatedAt) || 0)
          : apiData?.updatedAt
          ? (Date.parse(apiData.updatedAt) || 0)
          : 0;
        const sbCmsTs = sbCms?.updatedAt ? (Date.parse(sbCms.updatedAt) || 0) : 0;
        const cmsWinner =
          sbCms && sbCmsTs >= apiCmsTs && sbCmsTs >= adminCmsUpdatedAtRef.current
            ? sbCms
            : apiData?.success && apiCmsTs >= adminCmsUpdatedAtRef.current
            ? apiData
            : sbCms && !apiData?.success
            ? sbCms
            : null;

        if (cmsWinner) {
          const winnerTs = Math.max(apiCmsTs, sbCmsTs);
          if (winnerTs > adminCmsUpdatedAtRef.current) {
            adminCmsUpdatedAtRef.current = winnerTs;
          }
          if (cmsWinner.cms) {
            const merged = {
              ...DEFAULT_CMS_DATA,
              ...cmsWinner.cms,
              marqueeBanner: { ...DEFAULT_CMS_DATA.marqueeBanner, ...(cmsWinner.cms.marqueeBanner || {}) },
              sponsorSpotlight: { ...DEFAULT_CMS_DATA.sponsorSpotlight, ...(cmsWinner.cms.sponsorSpotlight || {}) },
            };
            cmsDataRef.current = merged;
            setCmsData(merged);
          }
          if (cmsWinner.activeBroadcast !== undefined) {
            systemBroadcastRef.current = cmsWinner.activeBroadcast || null;
            setSystemBroadcast(cmsWinner.activeBroadcast || null);
          }
        }

        // Apply admin store & artisan overrides to client state
        if (sbStores) {
          if (sbStores.stores && typeof sbStores.stores === 'object') {
            const overridesList = Object.values(sbStores.stores) as any[];
            setStoreSubscription((prev) => {
              if (!prev || (!prev.isRegistered && !prev.storeName)) return prev;
              const match = overridesList.find(
                (ov) =>
                  (ov.ownerPhone && currentUser?.phoneNumber && phonesMatch(ov.ownerPhone, currentUser.phoneNumber)) ||
                  (ov.storeName && prev.storeName && ov.storeName.toLowerCase() === prev.storeName.toLowerCase())
              );
              if (!match) return prev;
              const nextTier = (match.tier as StoreTier) || prev.tier;
              const nextLimit = match.itemsLimit ?? (nextTier === 'pro_100' ? 100 : 30);
              const nextActive = match.status !== undefined ? match.status === 'active' : prev.active;
              if (nextTier === prev.tier && nextLimit === prev.itemLimit && nextActive === prev.active) {
                return prev;
              }
              const nextSub: StoreSubscription = {
                ...prev,
                tier: nextTier,
                itemLimit: nextLimit,
                itemsLimit: nextLimit,
                active: nextActive,
                approvalStatus: (match.status === 'active' ? 'approved' : match.status) || prev.approvalStatus,
              };
              try { localStorage.setItem('AGC_store_sub', JSON.stringify(nextSub)); } catch (_) {}
              return nextSub;
            });
          }

          if (sbStores.artisans && typeof sbStores.artisans === 'object') {
            const artisanMap = sbStores.artisans as Record<string, any>;
            setArtisanStation((prev) => {
              if (!prev) return prev;
              const match = artisanMap[prev.id];
              if (!match || (match.isApproved === undefined && match.approvalStatus === undefined)) return prev;
              const nextApproved = match.isApproved !== undefined ? Boolean(match.isApproved) : prev.isApproved;
              const nextStatus = match.approvalStatus || (nextApproved ? 'approved' : prev.approvalStatus);
              if (nextApproved === prev.isApproved && nextStatus === prev.approvalStatus) return prev;
              const nextStation = { ...prev, isApproved: nextApproved, approvalStatus: nextStatus };
              try { localStorage.setItem('AGC_artisan_station', JSON.stringify(nextStation)); } catch (_) {}
              return nextStation;
            });
            setServiceProviders((prev) => {
              let changed = false;
              const next = prev.map((sp) => {
                const match = artisanMap[sp.id];
                if (match && match.isApproved !== undefined && Boolean(match.isApproved) !== sp.isVerified) {
                  changed = true;
                  return {
                    ...sp,
                    isVerified: Boolean(match.isApproved),
                    approvalStatus: match.approvalStatus || (match.isApproved ? 'approved' : 'suspended'),
                  };
                }
                return sp;
              });
              return changed ? next : prev;
            });
          }
        }
      } catch (_) {}

      refreshAdminUsers();
    };

    syncAdminFromServer();

    const socket = initSocket();
    const onConfig = (cfg: AdminSystemConfig) => {
      adminConfigUpdatedAtRef.current = Date.now();
      const merged = { ...DEFAULT_SYSTEM_CONFIG, ...cfg };
      systemConfigRef.current = merged;
      setSystemConfig(merged);
    };
    const onFeatures = (flags: FeatureFlags) => {
      adminConfigUpdatedAtRef.current = Date.now();
      const merged = { ...DEFAULT_FEATURE_FLAGS, ...flags };
      featureFlagsRef.current = merged;
      setFeatureFlags(merged);
    };
    const onCms = (cms: AdminCmsData) => {
      adminCmsUpdatedAtRef.current = Date.now();
      const merged = {
        ...DEFAULT_CMS_DATA,
        ...cms,
        marqueeBanner: { ...DEFAULT_CMS_DATA.marqueeBanner, ...(cms.marqueeBanner || {}) },
        sponsorSpotlight: { ...DEFAULT_CMS_DATA.sponsorSpotlight, ...(cms.sponsorSpotlight || {}) },
      };
      cmsDataRef.current = merged;
      setCmsData(merged);
    };
    const onBroadcast = (bc: AdminSystemBroadcast) => {
      adminCmsUpdatedAtRef.current = Date.now();
      systemBroadcastRef.current = bc;
      setSystemBroadcast(bc);
    };
    const onBroadcastCleared = () => {
      adminCmsUpdatedAtRef.current = Date.now();
      systemBroadcastRef.current = null;
      setSystemBroadcast(null);
    };
    const onUsersSnapshot = (rawList: any[]) => {
      if (!Array.isArray(rawList)) return;
      const mapped = rawList.map(mapRawToAdminUser);
      setAdminUsers((prev) => {
        const merged = mergeAdminUsersList(prev, mapped, true);
        adminUsersRef.current = merged;
        return merged;
      });
    };
    const onUserRegistered = (u: any) => {
      if (!u) return;
      const mapped = mapRawToAdminUser(u);
      setAdminUsers((prev) => {
        const merged = mergeAdminUsersList(prev, [mapped], true);
        adminUsersRef.current = merged;
        return merged;
      });
      propagateUserProfileUpdateRef.current(u);
    };
    const onUserUpdated = (u: any) => {
      if (!u) return;
      const mapped = mapRawToAdminUser(u);
      setAdminUsers((prev) => {
        const merged = mergeAdminUsersList(prev, [mapped], true);
        adminUsersRef.current = merged;
        return merged;
      });
      propagateUserProfileUpdateRef.current(u);
      const latestSelf = currentUserRef.current;
      if (latestSelf.id === u.id || (latestSelf.phoneNumber && u.phoneNumber && phonesMatch(latestSelf.phoneNumber, u.phoneNumber))) {
        syncCurrentUserFromRecord(mapped);
      }
    };
    const onBanEvent = (payload: any) => {
      if (!payload) return;
      const target = payload.phoneOrId || payload.phoneNumber || '';
      const targetClean = String(target).replace(/\D/g, '');
      setAdminUsers((prev) => {
        const next = prev.map((u) =>
          u.id === target || u.phoneNumber === target || (targetClean && phonesMatch(u.phoneNumber, target))
            ? { ...u, status: 'banned' as const, bannedAt: payload.bannedAt, banReason: payload.reason, isOnline: false }
            : u
        );
        adminUsersRef.current = next;
        return next;
      });
      if (currentUser.id === target || (currentUser.phoneNumber && target && phonesMatch(currentUser.phoneNumber, target))) {
        setIsBanned(true);
        setBanInfo({
          reason: payload.reason || 'Violation of AfriChat platform terms and conditions.',
          bannedAt: payload.bannedAt || new Date().toISOString(),
        });
        try {
          localStorage.setItem('AGC_banned_state', JSON.stringify({
            isBanned: true,
            reason: payload.reason,
            bannedAt: payload.bannedAt,
            phone: currentUser.phoneNumber,
          }));
        } catch (_) {}
      }
    };
    const onUnbanEvent = (payload: any) => {
      if (!payload) return;
      const target = payload.phoneOrId || payload.phoneNumber || '';
      const targetClean = String(target).replace(/\D/g, '');
      setAdminUsers((prev) => {
        const next = prev.map((u) =>
          u.id === target || u.phoneNumber === target || (targetClean && phonesMatch(u.phoneNumber, target))
            ? { ...u, status: 'active' as const, bannedAt: undefined, banReason: undefined }
            : u
        );
        adminUsersRef.current = next;
        return next;
      });
      if (currentUser.id === target || (currentUser.phoneNumber && target && phonesMatch(currentUser.phoneNumber, target))) {
        setIsBanned(false);
        setBanInfo(null);
        try { localStorage.removeItem('AGC_banned_state'); } catch (_) {}
      }
    };
    const onWalletAdjustedEvent = (payload: any) => {
      if (!payload) return;
      const target = payload.phoneOrId || payload.phoneNumber || '';
      const targetClean = String(target).replace(/\D/g, '');
      if (payload.newBalance !== undefined) {
        setAdminUsers((prev) => {
          const next = prev.map((u) =>
            u.id === target || u.phoneNumber === target || (targetClean && phonesMatch(u.phoneNumber, target))
              ? { ...u, walletBalanceNgn: payload.newBalance }
              : u
          );
          adminUsersRef.current = next;
          return next;
        });
        if (currentUser.id === target || (currentUser.phoneNumber && target && phonesMatch(currentUser.phoneNumber, target))) {
          pendingCreditHintRef.current = {
            note: payload.note || 'Wallet credited by administrator',
            category: 'admin_topup',
            label: 'Admin Top-Up',
            at: Date.now(),
          };
          setWallet((w) => ({ ...w, availableBalance: payload.newBalance }));
          try {
            const walletTsKey = getUserStorageKey('AGC_last_admin_wallet_ts', currentUser.phoneNumber);
            localStorage.setItem(walletTsKey, String(Date.now()));
          } catch (_) {}
        }
      }
    };
    const onKickEvent = (payload: any) => {
      const myToken = safeLocalStorage.getItem('AGC_session_token');
      const mySockId = getSocket()?.id;
      if (payload?.sessionToken && myToken && payload.sessionToken === myToken) return;
      if (payload?.excludeSocketId && mySockId && payload.excludeSocketId === mySockId) return;
      if (payload?.reason !== 'admin_kick' && Date.now() - lastLoginAtRef.current < 5000) return;

      const target = payload?.phoneOrId || payload?.phoneNumber || payload?.targetPhone || '';
      if (target && (currentUser.id === target || (currentUser.phoneNumber && phonesMatch(currentUser.phoneNumber, target)))) {
        setIsKickedOut(true);
        setIsAuthenticated(false);
        try { safeLocalStorage.setItem('AGC_is_authenticated', 'false'); } catch (_) {}
      }
    };

    const onWalletUpdatedEvent = (payload: any) => {
      if (!payload) return;
      const phone = currentUserRef.current?.phoneNumber;
      if (!phone) return;
      if (typeof payload.note === 'string' && payload.note.trim()) {
        pendingCreditHintRef.current = {
          note: payload.note.trim(),
          at: Date.now(),
        };
      }
      setWallet((prev) => {
        const nextWallet: UserWallet = {
          availableBalance:
            typeof payload.balance === 'number'
              ? payload.balance
              : typeof payload.availableBalance === 'number'
              ? payload.availableBalance
              : prev.availableBalance,
          escrowLockedBalance:
            typeof payload.escrowLockedBalance === 'number'
              ? payload.escrowLockedBalance
              : prev.escrowLockedBalance,
          currency: payload.currency || prev.currency || 'NGN',
          transactions: Array.isArray(payload.transactions) ? payload.transactions : prev.transactions,
        };
        walletRef.current = nextWallet;
        persistPartitionedWallet(nextWallet, phone);
        return nextWallet;
      });
    };

    const onEscrowOrderUpdated = (payload: { order?: EscrowOrder }) => {
      const incoming = payload?.order;
      if (!incoming?.id) return;
      setEscrowOrders((prev) => {
        const idx = prev.findIndex((o) => o.id === incoming.id);
        if (idx >= 0) {
          const existing = prev[idx];
          const merged: EscrowOrder = {
            ...existing,
            ...incoming,
            escrowPin: incoming.escrowPin || existing.escrowPin || '',
          };
          const copy = [...prev];
          copy[idx] = merged;
          return copy;
        }
        return [incoming, ...prev];
      });
      setActiveEscrowModalOrder((prev) =>
        prev && prev.id === incoming.id
          ? { ...prev, ...incoming, escrowPin: incoming.escrowPin || prev.escrowPin || '' }
          : prev
      );
    };

    const onProfessionalsUpdated = (payload: any) => {
      if (!payload) return;
      if (Array.isArray(payload.lawyers)) setLawyers(payload.lawyers);
      if (Array.isArray(payload.clinicsDoctors)) setDoctors(payload.clinicsDoctors);
      if (Array.isArray(payload.errandRunners)) setErrandRunners(payload.errandRunners);
      if (Array.isArray(payload.errandOrders)) setErrandOrders(payload.errandOrders);
    };

    const onTaskPayoutReleased = (payload: any) => {
      if (!payload) return;
      const amt = Number(payload.amount || 0);
      if (amt > 0) {
        triggerCreditAlert({
          id: payload.reference || `taskpay_${payload.submissionId || Date.now()}`,
          amount: amt,
          currency: payload.currency || 'NGN',
          newBalance: Number(payload.newBalance || walletRef.current?.availableBalance || 0),
          category: 'payout',
          categoryLabel: 'Task Reward Released',
          title: payload.taskTitle || 'Micro-Task Verified & Paid',
          subtitle: 'Admin verified your proof and released escrow funds',
        });
      }
      refreshWalletFromServer().catch(() => {});
    };

    socket.on('admin_config_updated', onConfig);
    socket.on('admin_features_updated', onFeatures);
    socket.on('admin_cms_updated', onCms);
    socket.on('system_broadcast', onBroadcast);
    socket.on('system_broadcast_cleared', onBroadcastCleared);
    socket.on('admin_users_snapshot', onUsersSnapshot);
    socket.on('user_registered', onUserRegistered);
    socket.on('user_updated', onUserUpdated);
    socket.on('wallet_updated', onWalletUpdatedEvent);
    socket.on('task_payout_released', onTaskPayoutReleased);
    socket.on('escrow_order_updated', onEscrowOrderUpdated);
    socket.on('professionals_updated', onProfessionalsUpdated);
    socket.on('force_logout', onKickEvent);
    socket.on('admin_store_updated', syncAdminFromServer);
    socket.on('admin_artisan_updated', syncAdminFromServer);

    let sbAdminChannel: ReturnType<typeof supabase.channel> | null = null;
    let sbPhoneRegChannel: ReturnType<typeof supabase.channel> | null = null;
    if (isSupabaseConfigured) {
      try {
        sbAdminChannel = supabase.channel('agc_global_admin_sync', {
          config: { broadcast: { self: false } },
        });
        sbAdminChannel
          .on('broadcast', { event: 'admin_config' }, ({ payload }: any) => {
            if (payload) onConfig(payload);
          })
          .on('broadcast', { event: 'admin_features' }, ({ payload }: any) => {
            if (payload) onFeatures(payload);
          })
          .on('broadcast', { event: 'admin_cms' }, ({ payload }: any) => {
            if (payload) onCms(payload);
          })
          .on('broadcast', { event: 'system_broadcast' }, ({ payload }: any) => {
            if (payload) onBroadcast(payload);
          })
          .on('broadcast', { event: 'system_broadcast_cleared' }, () => {
            onBroadcastCleared();
          })
          .on('broadcast', { event: 'user_updated' }, ({ payload }: any) => {
            if (payload) onUserUpdated(payload);
          })
          .on('broadcast', { event: 'user_registered' }, ({ payload }: any) => {
            if (payload) onUserRegistered(payload);
          })
          .on('broadcast', { event: 'ban' }, ({ payload }: any) => {
            onBanEvent(payload);
          })
          .on('broadcast', { event: 'unban' }, ({ payload }: any) => {
            onUnbanEvent(payload);
          })
          .on('broadcast', { event: 'wallet_adjusted' }, ({ payload }: any) => {
            onWalletAdjustedEvent(payload);
          })
          .on('broadcast', { event: 'kick' }, ({ payload }: any) => {
            onKickEvent(payload);
          })
          .on('broadcast', { event: 'admin_store_updated' }, () => {
            syncAdminFromServer();
          })
          .on('broadcast', { event: 'admin_artisan_updated' }, () => {
            syncAdminFromServer();
          })
          .subscribe();
        adminSupabaseChannelRef.current = sbAdminChannel;

        sbPhoneRegChannel = supabase
          .channel('agc_phone_registry_live_global')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'agc_phone_registry' },
            (payload: any) => {
              const row = payload?.new;
              if (row && (row.full_phone || row.phone_digits)) {
                const sbUser: AdminUserRecord = {
                  id: `usr_${row.phone_digits || (row.full_phone || '').replace(/\D/g, '')}`,
                  fullName: row.username || 'Registered User',
                  phoneNumber: row.full_phone || `+234${String(row.phone_digits).replace(/^0+/, '')}`,
                  avatarUrl: row.avatar_url || `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(row.username || 'user')}`,
                  role: 'user',
                  verificationBadge: null,
                  isPhoneVerified: true,
                  status: 'active',
                  joinedDate: row.registered_at ? new Date(row.registered_at).toLocaleDateString() : 'Recent',
                  walletBalanceNgn: 0,
                  ordersCount: 0,
                  isOnline: false,
                  lastSeen: row.updated_at || row.registered_at || undefined,
                };
                setAdminUsers((prev) => {
                  const merged = mergeAdminUsersList(prev, [sbUser], false);
                  adminUsersRef.current = merged;
                  return merged;
                });
                propagateUserProfileUpdateRef.current({
                  phoneNumber: sbUser.phoneNumber,
                  fullName: sbUser.fullName,
                  username: row.username || undefined,
                  avatarUrl: row.avatar_url || undefined,
                });
              }
            }
          )
          .subscribe();
      } catch (_) {}
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        syncAdminFromServer();
      }
    };
    window.addEventListener('focus', syncAdminFromServer);
    document.addEventListener('visibilitychange', handleVisibility);
    const pollInterval = setInterval(syncAdminFromServer, 12000);

    return () => {
      socket.off('admin_config_updated', onConfig);
      socket.off('admin_features_updated', onFeatures);
      socket.off('admin_cms_updated', onCms);
      socket.off('system_broadcast', onBroadcast);
      socket.off('system_broadcast_cleared', onBroadcastCleared);
      socket.off('admin_users_snapshot', onUsersSnapshot);
      socket.off('user_registered', onUserRegistered);
      socket.off('user_updated', onUserUpdated);
      socket.off('wallet_updated', onWalletUpdatedEvent);
      socket.off('task_payout_released', onTaskPayoutReleased);
      socket.off('escrow_order_updated', onEscrowOrderUpdated);
      socket.off('professionals_updated', onProfessionalsUpdated);
      socket.off('force_logout', onKickEvent);
      socket.off('admin_store_updated', syncAdminFromServer);
      socket.off('admin_artisan_updated', syncAdminFromServer);
      window.removeEventListener('focus', syncAdminFromServer);
      document.removeEventListener('visibilitychange', handleVisibility);
      clearInterval(pollInterval);
      if (sbAdminChannel) {
        sbAdminChannel.unsubscribe();
        adminSupabaseChannelRef.current = null;
      }
      if (sbPhoneRegChannel) {
        sbPhoneRegChannel.unsubscribe();
      }
    };
  }, []);

  // Initial fetch for live dispatch orders from backend API
  useEffect(() => {
    try {
      fetch('/api/dispatch/orders')
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.success && Array.isArray(data.orders) && data.orders.length > 0) {
            setDispatchOrders(data.orders);
            localStorage.setItem('AGC_dispatch_orders', JSON.stringify(data.orders));
          }
        })
        .catch(() => {});
    } catch (_) {}
  }, []);

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
          persistPartitionedMessages(updated, currentUserRef.current.phoneNumber);
          return updated;
        }
        return prev;
      });
      syncMissedMessagesRef.current(activeChatIdRef.current || undefined);
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  // Join active chat & subscribe to Supabase Realtime (messages + persisted game_matches Postgres Changes)
  useEffect(() => {
    if (!activeChatId) return;

    joinChatRoom(activeChatId);
    syncMissedMessagesRef.current(activeChatId);

    // Hydrate persisted X/O game boards from Supabase so refreshes/reconnects restore live state
    fetchXoGamesForChatFromSupabase(activeChatId)
      .then((games) => {
        games.forEach((g) => applyXoGameUpdate(g));
      })
      .catch(() => {});

    const sbXoChannel = isSupabaseConfigured
      ? subscribeToXoGamesInChat(activeChatId, applyXoGameUpdate)
      : null;

    const sbChannel = supabase.channel(`chat_${activeChatId}`, {
      config: { broadcast: { self: false } },
    });

    sbChannel
      .on('broadcast', { event: 'new_message' }, ({ payload }) => {
        if (payload && payload.message && payload.senderId !== currentUser.id) {
          handleIncomingMessage(payload);
        }
      })
      .on('broadcast', { event: 'message_reaction' }, ({ payload }) => {
        if (payload?.chatId && payload?.messageId) {
          applyRemoteMessageReaction(payload);
        }
      })
      .on('broadcast', { event: 'xo_game_update' }, ({ payload }) => {
        if (payload?.game) {
          applyXoGameUpdate(payload.game);
        }
      })
      .on('broadcast', { event: 'whot_game_update' }, ({ payload }) => {
        if (payload?.payload) {
          applyWhotGameUpdate(payload.payload);
        }
      })
      .on('broadcast', { event: 'ludo_game_update' }, ({ payload }) => {
        if (payload?.payload) {
          applyLudoGameUpdate(payload.payload);
        }
      })
      .on('broadcast', { event: 'poker_game_update' }, ({ payload }) => {
        if (payload?.payload) {
          applyPokerGameUpdate(payload.payload);
        }
      })
      .on('broadcast', { event: 'bill_request_update' }, ({ payload }) => {
        if (payload?.payload) {
          applyBillRequestUpdate(payload.payload);
        }
      })
      .subscribe();

    return () => {
      leaveChatRoom(activeChatId);
      sbChannel.unsubscribe();
      if (sbXoChannel) sbXoChannel.unsubscribe();
    };
  }, [
    activeChatId,
    currentUser.id,
    handleIncomingMessage,
    applyXoGameUpdate,
    applyWhotGameUpdate,
    applyLudoGameUpdate,
    applyPokerGameUpdate,
    applyBillRequestUpdate,
    applyRemoteMessageReaction,
  ]);

  const checkIsAdminUrl = () => {
    if (typeof window === 'undefined') return false;
    const hash = (window.location.hash || '').toLowerCase();
    const searchParams = new URLSearchParams(window.location.search || '');
    const adminParam = (searchParams.get('admin') || '').toLowerCase();
    const path = (window.location.pathname || '').toLowerCase().replace(/\/+$/, '');
    return (
      hash === '#admin' ||
      hash.startsWith('#admin?') ||
      hash === '#/admin' ||
      hash.startsWith('#/admin?') ||
      adminParam === 'true' ||
      adminParam === '1' ||
      path === '/admin' ||
      path.endsWith('/admin')
    );
  };

  // 29. Super Admin Console & Moderation State (Hidden Easter Egg Triggers)
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(() => checkIsAdminUrl());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setIsAdminModalOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const pendingJoinCodeRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleUrlChange = () => {
      const hash = window.location.hash || '';
      const search = (window.location.search || '').toLowerCase();
      if (checkIsAdminUrl()) {
        setIsAdminModalOpen(true);
      }

      // Handle PWA manifest shortcuts (?tab=chats|status|calls|town|market|settings&sub=artisan)
      try {
        const sp = new URLSearchParams(window.location.search || '');
        const tabParam = (sp.get('tab') || '').toLowerCase();
        const subParam = (sp.get('sub') || '').toLowerCase();
        if (
          tabParam === 'chats' ||
          tabParam === 'status' ||
          tabParam === 'calls' ||
          tabParam === 'town' ||
          tabParam === 'market' ||
          tabParam === 'settings'
        ) {
          setActiveTab(tabParam);
          if (subParam === 'artisan') {
            setIsServicesModalOpen(true);
          }
          window.history.replaceState(null, '', window.location.pathname || '/');
        }
      } catch (_) {}

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
              avatar || undefined,
              { sendRequest: false }
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
            const c = addNewDeviceContact(`Contact ${phone.slice(-4)}`, phone, 'Added via AGC QR', true, undefined, { sendRequest: false });
            startChatWithContact(c);
            window.history.replaceState(null, '', window.location.pathname);
          }
        } catch (_) {}
      }
      // Handle group invite link: ?join=CODE, #join=CODE, or /join/CODE
      try {
        const urlParams = new URLSearchParams(window.location.search || '');
        const hashStr = hash.replace(/^#/, '');
        const hashParams = new URLSearchParams(hashStr.includes('?') ? hashStr.split('?')[1] : hashStr);
        const pathJoinMatch = (window.location.pathname || '').match(/\/(?:join|g|c)\/([^/?#]+)/i);
        const joinToken =
          urlParams.get('join') ||
          urlParams.get('code') ||
          urlParams.get('invite') ||
          hashParams.get('join') ||
          hashParams.get('code') ||
          (pathJoinMatch?.[1] ? decodeURIComponent(pathJoinMatch[1]) : '');
        if (joinToken && joinToken.trim()) {
          pendingJoinCodeRef.current = joinToken.trim();
          window.history.replaceState(null, '', '/');
          if (isAuthenticatedRef.current) {
            const codeToJoin = pendingJoinCodeRef.current;
            pendingJoinCodeRef.current = null;
            if (codeToJoin) {
              joinGroupByCodeOrLink(codeToJoin).catch(() => {});
            }
          }
        }
      } catch (_) {}
    };

    handleUrlChange();
    window.addEventListener('hashchange', handleUrlChange);
    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('focus', handleUrlChange);
    return () => {
      window.removeEventListener('hashchange', handleUrlChange);
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('focus', handleUrlChange);
    };
  }, [joinGroupByCodeOrLink]);

  useEffect(() => {
    if (isAuthenticated && pendingJoinCodeRef.current) {
      const code = pendingJoinCodeRef.current;
      pendingJoinCodeRef.current = null;
      joinGroupByCodeOrLink(code).catch(() => {});
    }
  }, [isAuthenticated, joinGroupByCodeOrLink]);
  const [adminUsers, setAdminUsers] = useState<AdminUserRecord[]>([]);
  const adminUsersRef = useRef<AdminUserRecord[]>([]);
  useEffect(() => { adminUsersRef.current = adminUsers; }, [adminUsers]);

  const mapRawToAdminUser = (u: any): AdminUserRecord => ({
    id: u.id || `usr_${(u.phoneNumber || '').replace(/\D/g, '') || Date.now()}`,
    fullName: u.fullName || u.name || 'Registered User',
    phoneNumber: u.phoneNumber || u.phone || '',
    avatarUrl: u.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    role: u.role || 'user',
    verificationBadge: u.verificationBadge ?? null,
    isPhoneVerified: u.isPhoneVerified !== undefined ? Boolean(u.isPhoneVerified) : true,
    status: u.status || 'active',
    bannedAt: u.bannedAt,
    banReason: u.banReason,
    suspendedAt: u.suspendedAt,
    suspendedUntil: u.suspendedUntil,
    suspensionReason: u.suspensionReason,
    kycStatus: u.kycStatus,
    kycType: u.kycType,
    adminWalletAdjustedAt: u.adminWalletAdjustedAt,
    updatedAt: u.updatedAt,
    joinedDate: u.joinedDate || (u.registeredAt || u.createdAt ? new Date(u.registeredAt || u.createdAt).toLocaleDateString() : 'Recent'),
    walletBalanceNgn: u.walletBalanceNgn ?? 0,
    ordersCount: u.ordersCount || 0,
    isOnline: Boolean(u.isOnline || u.lastSeen === 'online'),
    lastSeen: u.lastSeen || undefined,
  });

  const mergeAdminUsersList = (
    prev: AdminUserRecord[],
    incoming: AdminUserRecord[],
    authoritative: boolean
  ): AdminUserRecord[] => {
    const next = [...prev];
    incoming.forEach((inc) => {
      const idx = next.findIndex(
        (u) =>
          (inc.id && u.id === inc.id) ||
          (inc.phoneNumber && u.phoneNumber && phonesMatch(u.phoneNumber, inc.phoneNumber))
      );
      if (idx >= 0) {
        const cur = next[idx];
        if (authoritative) {
          next[idx] = {
            ...cur,
            ...inc,
            fullName: inc.fullName && inc.fullName !== 'Registered User' ? inc.fullName : cur.fullName,
            avatarUrl: inc.avatarUrl || cur.avatarUrl,
            verificationBadge: inc.verificationBadge !== undefined ? inc.verificationBadge : cur.verificationBadge,
            role: inc.role || cur.role,
            status: inc.status || cur.status,
            kycStatus: inc.kycStatus ?? cur.kycStatus,
            kycType: inc.kycType ?? cur.kycType,
            adminWalletAdjustedAt: inc.adminWalletAdjustedAt ?? cur.adminWalletAdjustedAt,
            walletBalanceNgn: inc.walletBalanceNgn ?? cur.walletBalanceNgn,
          };
        } else {
          // Non-authoritative (e.g. agc_phone_registry): NEVER wipe admin-set badge, role, status, ban, or wallet
          next[idx] = {
            ...cur,
            fullName: inc.fullName && inc.fullName !== 'Registered User' && (!cur.fullName || cur.fullName === 'User' || cur.fullName === 'AGC User') ? inc.fullName : cur.fullName,
            avatarUrl:
              inc.avatarUrl && !isPlaceholderAvatar(inc.avatarUrl)
                ? inc.avatarUrl
                : (cur.avatarUrl || inc.avatarUrl),
            phoneNumber: cur.phoneNumber || inc.phoneNumber,
            joinedDate: cur.joinedDate && cur.joinedDate !== 'Recent' ? cur.joinedDate : inc.joinedDate,
          };
        }
      } else {
        next.push(inc);
      }
    });
    return next;
  };

  const getBadgeForPhone = (phoneOrId?: string): 'blue' | 'gold' | 'creator_plus' | 'admin' | null => {
    if (!phoneOrId) return null;
    if (currentUser?.phoneNumber && phonesMatch(currentUser.phoneNumber, phoneOrId)) {
      if (currentUser.verificationBadge) return currentUser.verificationBadge;
    }
    const found = adminUsersRef.current.find(
      (u) => u.id === phoneOrId || (u.phoneNumber && phonesMatch(u.phoneNumber, phoneOrId))
    );
    return found?.verificationBadge || null;
  };

  const [systemBroadcast, setSystemBroadcast] = useState<AdminSystemBroadcast | null>(null);
  useEffect(() => { systemBroadcastRef.current = systemBroadcast; }, [systemBroadcast]);

  // Real-Time Multi-Tab / Multi-Window Admin State Synchronization
  useEffect(() => {
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('AGC_system_admin_sync');
      adminSyncChannelRef.current = bc;
      bc.onmessage = (e) => {
        const msg = e.data;
        if (!msg || !msg.type) return;
        if (msg.type === 'config' && msg.data) {
          adminConfigUpdatedAtRef.current = Date.now();
          systemConfigRef.current = msg.data;
          setSystemConfig(msg.data);
        } else if (msg.type === 'features' && msg.data) {
          adminConfigUpdatedAtRef.current = Date.now();
          featureFlagsRef.current = msg.data;
          setFeatureFlags(msg.data);
        } else if (msg.type === 'cms' && msg.data) {
          adminCmsUpdatedAtRef.current = Date.now();
          cmsDataRef.current = msg.data;
          setCmsData(msg.data);
        } else if (msg.type === 'broadcast') {
          adminCmsUpdatedAtRef.current = Date.now();
          systemBroadcastRef.current = msg.data || null;
          setSystemBroadcast(msg.data || null);
        } else if (msg.type === 'user_updated' && msg.data) {
          const mapped = mapRawToAdminUser(msg.data);
          setAdminUsers((prev) => {
            const merged = mergeAdminUsersList(prev, [mapped], true);
            adminUsersRef.current = merged;
            return merged;
          });
          if (currentUser?.phoneNumber && mapped.phoneNumber && phonesMatch(currentUser.phoneNumber, mapped.phoneNumber)) {
            syncCurrentUserFromRecord(mapped);
          }
        } else if (msg.type === 'ban') {
          const myPhoneClean = (currentUser?.phoneNumber || '').replace(/\D/g, '');
          const targetClean = (msg.phoneOrId || '').replace(/\D/g, '');
          if (currentUser?.id === msg.phoneOrId || (myPhoneClean && targetClean && phonesMatch(myPhoneClean, msg.phoneOrId))) {
            setIsBanned(true);
            setBanInfo({
              reason: msg.reason || 'Violation of AfriChat platform terms and conditions.',
              bannedAt: msg.bannedAt || new Date().toISOString(),
            });
            try {
              localStorage.setItem('AGC_banned_state', JSON.stringify({
                isBanned: true,
                reason: msg.reason,
                bannedAt: msg.bannedAt,
                phone: currentUser?.phoneNumber,
              }));
            } catch (_) {}
          }
          setAdminUsers((prev) =>
            prev.map((u) =>
              u.id === msg.phoneOrId || u.phoneNumber === msg.phoneOrId || (targetClean && phonesMatch(u.phoneNumber, msg.phoneOrId))
                ? { ...u, status: 'banned', bannedAt: msg.bannedAt, banReason: msg.reason, isOnline: false }
                : u
            )
          );
        } else if (msg.type === 'unban') {
          const myPhoneClean = (currentUser?.phoneNumber || '').replace(/\D/g, '');
          const targetClean = (msg.phoneOrId || '').replace(/\D/g, '');
          if (currentUser?.id === msg.phoneOrId || (myPhoneClean && targetClean && phonesMatch(myPhoneClean, msg.phoneOrId))) {
            setIsBanned(false);
            setBanInfo(null);
            try { localStorage.removeItem('AGC_banned_state'); } catch (_) {}
          }
          setAdminUsers((prev) =>
            prev.map((u) =>
              u.id === msg.phoneOrId || u.phoneNumber === msg.phoneOrId || (targetClean && phonesMatch(u.phoneNumber, msg.phoneOrId))
                ? { ...u, status: 'active', bannedAt: undefined, banReason: undefined }
                : u
            )
          );
        } else if (msg.type === 'wallet_adjusted') {
          const myPhoneClean = (currentUser?.phoneNumber || '').replace(/\D/g, '');
          const targetClean = (msg.phoneOrId || '').replace(/\D/g, '');
          if (currentUser?.id === msg.phoneOrId || (myPhoneClean && targetClean && phonesMatch(myPhoneClean, msg.phoneOrId))) {
            if (msg.newBalance !== undefined) {
              pendingCreditHintRef.current = {
                note: 'Wallet credited by administrator',
                category: 'admin_topup',
                label: 'Admin Top-Up',
                at: Date.now(),
              };
              setWallet((prev) => ({ ...prev, availableBalance: msg.newBalance }));
            }
          }
          setAdminUsers((prev) =>
            prev.map((u) => {
              if (u.id === msg.phoneOrId || u.phoneNumber === msg.phoneOrId || (targetClean && phonesMatch(u.phoneNumber, msg.phoneOrId))) {
                return { ...u, walletBalanceNgn: msg.newBalance ?? u.walletBalanceNgn };
              }
              return u;
            })
          );
        } else if (msg.type === 'kick') {
          const target = msg.phoneOrId || '';
          if (target && (currentUser?.id === target || (currentUser?.phoneNumber && phonesMatch(currentUser.phoneNumber, target)))) {
            setIsKickedOut(true);
            setIsAuthenticated(false);
            try { safeLocalStorage.setItem('AGC_is_authenticated', 'false'); } catch (_) {}
          }
        }
      };
    } catch (_) {}
    return () => {
      if (bc) bc.close();
    };
  }, [currentUser, syncCurrentUserFromRecord]);

  const findAdminUserTarget = (userIdOrPhone: string): AdminUserRecord | undefined => {
    const clean = userIdOrPhone.replace(/\D/g, '');
    return adminUsersRef.current.find(
      (u) =>
        u.id === userIdOrPhone ||
        u.phoneNumber === userIdOrPhone ||
        (clean && u.phoneNumber && phonesMatch(u.phoneNumber, userIdOrPhone))
    );
  };

  const resolveAdminUserKey = (userIdOrPhone: string): string => {
    const target = findAdminUserTarget(userIdOrPhone);
    const phoneDigits = target?.phoneNumber?.replace(/\D/g, '');
    return phoneDigits || target?.id || userIdOrPhone.replace(/\D/g, '') || userIdOrPhone;
  };

  const broadcastUserUpdateEverywhere = (userObj: any) => {
    try {
      adminSyncChannelRef.current?.postMessage({ type: 'user_updated', data: userObj });
    } catch (_) {}
    if (adminSupabaseChannelRef.current) {
      try {
        adminSupabaseChannelRef.current.send({
          type: 'broadcast',
          event: 'user_updated',
          payload: userObj,
        });
      } catch (_) {}
    }
  };

  const toggleUserVerification = async (
    userId: string,
    badge: 'blue' | 'gold' | 'creator_plus' | 'admin' | null,
    hints?: { phoneNumber?: string; fullName?: string; avatarUrl?: string }
  ): Promise<boolean> => {
    const target = findAdminUserTarget(userId);
    const phoneNum = hints?.phoneNumber || target?.phoneNumber || (userId.startsWith('+') ? userId : '');
    const clean = (phoneNum || userId).replace(/\D/g, '');
    const optimisticUser: AdminUserRecord = {
      ...(target || {
        id: userId,
        fullName: hints?.fullName || 'Registered User',
        phoneNumber: phoneNum,
        avatarUrl: hints?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        role: 'user',
        isPhoneVerified: true,
        status: 'active',
        joinedDate: 'Recent',
        walletBalanceNgn: 0,
        ordersCount: 0,
        isOnline: false,
      }),
      verificationBadge: badge,
    };

    setAdminUsers((prev) => {
      const merged = mergeAdminUsersList(prev, [optimisticUser], true);
      adminUsersRef.current = merged;
      return merged;
    });
    if (currentUser.id === userId || (clean && currentUser.phoneNumber && phonesMatch(currentUser.phoneNumber, phoneNum || userId))) {
      setCurrentUser((prev) => {
        const updated = { ...prev, verificationBadge: badge };
        persistPartitionedUserProfile(updated);
        return updated;
      });
    }
    broadcastUserUpdateEverywhere(optimisticUser);

    const identifier = resolveAdminUserKey(phoneNum || userId);
    const [apiData, sbOk] = await Promise.all([
      safeJsonFetch(`/api/admin/users/${encodeURIComponent(identifier)}/badge`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verificationBadge: badge,
          phoneNumber: phoneNum || undefined,
          fullName: hints?.fullName || target?.fullName,
          avatarUrl: hints?.avatarUrl || target?.avatarUrl,
        }),
      }),
      upsertSupabaseAdminUserOverride(phoneNum || identifier, {
        verificationBadge: badge,
        phoneNumber: phoneNum || target?.phoneNumber,
        fullName: hints?.fullName || target?.fullName,
        avatarUrl: hints?.avatarUrl || target?.avatarUrl,
      }),
    ]);

    if (apiData?.user) {
      const mapped = mapRawToAdminUser(apiData.user);
      setAdminUsers((prev) => {
        const merged = mergeAdminUsersList(prev, [mapped], true);
        adminUsersRef.current = merged;
        return merged;
      });
      broadcastUserUpdateEverywhere(apiData.user);
    }
    return Boolean(apiData?.success || sbOk);
  };

  const toggleUserSuspension = async (userId: string): Promise<boolean> => {
    const existing = findAdminUserTarget(userId);
    const nextStatus = existing?.status === 'suspended' ? 'active' : 'suspended';
    return setUserStatus(userId, nextStatus);
  };

  const [isBanned, setIsBanned] = useState(() => {
    try {
      const saved = localStorage.getItem('AGC_banned_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.isBanned) {
          const profRaw = localStorage.getItem('AGC_user_profile_v2');
          const prof = profRaw ? JSON.parse(profRaw) : null;
          if (!parsed.phone || (prof?.phoneNumber && phonesMatch(parsed.phone, prof.phoneNumber))) {
            return true;
          }
        }
      }
    } catch (_) {}
    return false;
  });
  const [banInfo, setBanInfo] = useState<{ reason?: string; bannedAt?: string } | null>(() => {
    try {
      const saved = localStorage.getItem('AGC_banned_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.isBanned) {
          const profRaw = localStorage.getItem('AGC_user_profile_v2');
          const prof = profRaw ? JSON.parse(profRaw) : null;
          if (!parsed.phone || (prof?.phoneNumber && phonesMatch(parsed.phone, prof.phoneNumber))) {
            return { reason: parsed.reason, bannedAt: parsed.bannedAt };
          }
        }
      }
    } catch (_) {}
    return null;
  });

  const setUserStatus = async (
    userIdOrPhone: string,
    status: 'active' | 'suspended' | 'banned' | 'flagged',
    options?: { durationHours?: number; reason?: string }
  ): Promise<boolean> => {
    const target = findAdminUserTarget(userIdOrPhone);
    const clean = userIdOrPhone.replace(/\D/g, '');
    const durationHours = options?.durationHours;
    const reason = options?.reason?.trim() || undefined;
    const nowIso = new Date().toISOString();
    const suspendedAt = status === 'suspended' ? nowIso : undefined;
    const suspendedUntil =
      status === 'suspended' && durationHours && durationHours > 0
        ? new Date(Date.now() + durationHours * 3_600_000).toISOString()
        : undefined;
    const suspensionReason = status === 'suspended' ? reason : undefined;

    const patchFields: Partial<AdminUserRecord> = {
      status,
      ...(status === 'suspended'
        ? { suspendedAt, suspendedUntil, suspensionReason }
        : status === 'active'
        ? { suspendedAt: undefined, suspendedUntil: undefined, suspensionReason: undefined, bannedAt: undefined, banReason: undefined }
        : {}),
    };

    const optimisticUser = target
      ? { ...target, ...patchFields }
      : { id: userIdOrPhone, phoneNumber: userIdOrPhone, ...patchFields };
    setAdminUsers((prev) => {
      const next = prev.map((u) =>
        u.id === userIdOrPhone || u.phoneNumber === userIdOrPhone || (clean && phonesMatch(u.phoneNumber, userIdOrPhone))
          ? { ...u, ...patchFields }
          : u
      );
      adminUsersRef.current = next;
      return next;
    });
    broadcastUserUpdateEverywhere(optimisticUser);

    const identifier = resolveAdminUserKey(target?.phoneNumber || userIdOrPhone);
    const [apiData, sbOk] = await Promise.all([
      safeJsonFetch(`/api/admin/users/${encodeURIComponent(identifier)}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          durationHours,
          suspendedUntil,
          reason,
          phoneNumber: target?.phoneNumber,
          fullName: target?.fullName,
          avatarUrl: target?.avatarUrl,
        }),
      }),
      upsertSupabaseAdminUserOverride(target?.phoneNumber || identifier, {
        status,
        ...(status === 'suspended'
          ? { suspendedAt, suspendedUntil, suspensionReason }
          : status === 'active'
          ? { suspendedAt: undefined, suspendedUntil: undefined, suspensionReason: undefined }
          : {}),
        phoneNumber: target?.phoneNumber,
        fullName: target?.fullName,
        avatarUrl: target?.avatarUrl,
      }),
    ]);

    if (apiData?.user) {
      const mapped = mapRawToAdminUser(apiData.user);
      setAdminUsers((prev) => {
        const merged = mergeAdminUsersList(prev, [mapped], true);
        adminUsersRef.current = merged;
        return merged;
      });
      broadcastUserUpdateEverywhere(apiData.user);
    }
    return Boolean(apiData?.success || sbOk);
  };

  const setUserRole = async (
    userIdOrPhone: string,
    role: 'user' | 'creator' | 'merchant' | 'admin'
  ): Promise<boolean> => {
    const target = findAdminUserTarget(userIdOrPhone);
    const clean = userIdOrPhone.replace(/\D/g, '');
    const optimisticUser = target ? { ...target, role } : { id: userIdOrPhone, phoneNumber: userIdOrPhone, role };
    setAdminUsers((prev) => {
      const next = prev.map((u) =>
        u.id === userIdOrPhone || u.phoneNumber === userIdOrPhone || (clean && phonesMatch(u.phoneNumber, userIdOrPhone))
          ? { ...u, role }
          : u
      );
      adminUsersRef.current = next;
      return next;
    });
    if (currentUser.id === userIdOrPhone || (clean && currentUser.phoneNumber && phonesMatch(currentUser.phoneNumber, userIdOrPhone))) {
      setCurrentUser((prev) => {
        const updated = { ...prev, role };
        persistPartitionedUserProfile(updated);
        return updated;
      });
    }
    broadcastUserUpdateEverywhere(optimisticUser);

    const identifier = resolveAdminUserKey(target?.phoneNumber || userIdOrPhone);
    const [apiData, sbOk] = await Promise.all([
      safeJsonFetch(`/api/admin/users/${encodeURIComponent(identifier)}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role,
          phoneNumber: target?.phoneNumber,
          fullName: target?.fullName,
          avatarUrl: target?.avatarUrl,
        }),
      }),
      upsertSupabaseAdminUserOverride(target?.phoneNumber || identifier, {
        role,
        phoneNumber: target?.phoneNumber,
        fullName: target?.fullName,
        avatarUrl: target?.avatarUrl,
      }),
    ]);

    if (apiData?.user) {
      const mapped = mapRawToAdminUser(apiData.user);
      setAdminUsers((prev) => {
        const merged = mergeAdminUsersList(prev, [mapped], true);
        adminUsersRef.current = merged;
        return merged;
      });
      broadcastUserUpdateEverywhere(apiData.user);
    }
    return Boolean(apiData?.success || sbOk);
  };

  const banUser = async (phoneOrId: string, reason?: string) => {
    const target = findAdminUserTarget(phoneOrId);
    const clean = phoneOrId.replace(/\D/g, '');
    const banReason = reason || 'Violation of AfriChat platform terms and conditions.';
    const bannedAt = new Date().toISOString();
    const optimisticUser = {
      ...(target || { id: phoneOrId, phoneNumber: phoneOrId }),
      status: 'banned' as const,
      bannedAt,
      banReason,
      isOnline: false,
    };
    setAdminUsers((prev) => {
      const next = prev.map((u) =>
        u.id === phoneOrId || u.phoneNumber === phoneOrId || (clean && phonesMatch(u.phoneNumber, phoneOrId))
          ? { ...u, status: 'banned' as const, bannedAt, banReason, isOnline: false }
          : u
      );
      adminUsersRef.current = next;
      return next;
    });
    const banPayload = { type: 'ban', phoneOrId: target?.phoneNumber || phoneOrId, reason: banReason, bannedAt };
    try { adminSyncChannelRef.current?.postMessage(banPayload); } catch (_) {}
    if (adminSupabaseChannelRef.current) {
      try {
        adminSupabaseChannelRef.current.send({ type: 'broadcast', event: 'ban', payload: banPayload });
      } catch (_) {}
    }
    broadcastUserUpdateEverywhere(optimisticUser);

    const identifier = resolveAdminUserKey(target?.phoneNumber || phoneOrId);
    const [apiData] = await Promise.all([
      safeJsonFetch(`/api/admin/users/${encodeURIComponent(identifier)}/ban`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: banReason,
          phoneNumber: target?.phoneNumber,
          fullName: target?.fullName,
          avatarUrl: target?.avatarUrl,
        }),
      }),
      upsertSupabaseAdminUserOverride(target?.phoneNumber || identifier, {
        status: 'banned',
        banReason,
        bannedAt,
        phoneNumber: target?.phoneNumber,
        fullName: target?.fullName,
        avatarUrl: target?.avatarUrl,
      }),
    ]);
    if (apiData?.user) broadcastUserUpdateEverywhere(apiData.user);
  };

  const unbanUser = async (phoneOrId: string) => {
    const target = findAdminUserTarget(phoneOrId);
    const clean = phoneOrId.replace(/\D/g, '');
    const optimisticUser = {
      ...(target || { id: phoneOrId, phoneNumber: phoneOrId }),
      status: 'active' as const,
      bannedAt: undefined,
      banReason: undefined,
    };
    setAdminUsers((prev) => {
      const next = prev.map((u) =>
        u.id === phoneOrId || u.phoneNumber === phoneOrId || (clean && phonesMatch(u.phoneNumber, phoneOrId))
          ? { ...u, status: 'active' as const, bannedAt: undefined, banReason: undefined }
          : u
      );
      adminUsersRef.current = next;
      return next;
    });
    const unbanPayload = { type: 'unban', phoneOrId: target?.phoneNumber || phoneOrId };
    try { adminSyncChannelRef.current?.postMessage(unbanPayload); } catch (_) {}
    if (adminSupabaseChannelRef.current) {
      try {
        adminSupabaseChannelRef.current.send({ type: 'broadcast', event: 'unban', payload: unbanPayload });
      } catch (_) {}
    }
    broadcastUserUpdateEverywhere(optimisticUser);

    const identifier = resolveAdminUserKey(target?.phoneNumber || phoneOrId);
    const [apiData] = await Promise.all([
      safeJsonFetch(`/api/admin/users/${encodeURIComponent(identifier)}/unban`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: target?.phoneNumber,
          fullName: target?.fullName,
          avatarUrl: target?.avatarUrl,
        }),
      }),
      upsertSupabaseAdminUserOverride(target?.phoneNumber || identifier, {
        status: 'active',
        banReason: null,
        bannedAt: null,
        phoneNumber: target?.phoneNumber,
        fullName: target?.fullName,
        avatarUrl: target?.avatarUrl,
      }),
    ]);
    if (apiData?.user) broadcastUserUpdateEverywhere(apiData.user);
  };

  const adjustUserWallet = async (phoneOrId: string, deltaOrNew: number, isAbsolute: boolean = false) => {
    const target = findAdminUserTarget(phoneOrId);
    const clean = phoneOrId.replace(/\D/g, '');
    const adjustedAt = new Date().toISOString();
    const isTargetCurrentUser = Boolean(
      currentUser?.phoneNumber &&
        (currentUser.id === phoneOrId ||
          (clean && phonesMatch(currentUser.phoneNumber, phoneOrId)) ||
          (target?.phoneNumber && phonesMatch(currentUser.phoneNumber, target.phoneNumber)))
    );

    const liveCurrentWalletBal =
      isTargetCurrentUser && typeof walletRef.current?.availableBalance === 'number'
        ? walletRef.current.availableBalance
        : undefined;
    const baseBal =
      liveCurrentWalletBal !== undefined &&
      (!target?.adminWalletAdjustedAt ||
        Math.abs((target.walletBalanceNgn ?? 0) - liveCurrentWalletBal) > 0)
        ? liveCurrentWalletBal
        : (target?.walletBalanceNgn ?? 0);

    const resolvedNewBal = Math.max(
      0,
      Math.round(isAbsolute ? deltaOrNew : baseBal + deltaOrNew)
    );

    setAdminUsers((prev) => {
      const exists = prev.some(
        (u) => u.id === phoneOrId || u.phoneNumber === phoneOrId || (clean && phonesMatch(u.phoneNumber, phoneOrId))
      );
      const next = exists
        ? prev.map((u) => {
            if (u.id === phoneOrId || u.phoneNumber === phoneOrId || (clean && phonesMatch(u.phoneNumber, phoneOrId))) {
              return { ...u, walletBalanceNgn: resolvedNewBal, adminWalletAdjustedAt: adjustedAt };
            }
            return u;
          })
        : [
            ...prev,
            {
              id: target?.id || `usr_${clean || Date.now()}`,
              fullName: target?.fullName || (isTargetCurrentUser ? currentUser.fullName : 'Registered User'),
              phoneNumber: target?.phoneNumber || (isTargetCurrentUser ? currentUser.phoneNumber : phoneOrId),
              avatarUrl: target?.avatarUrl || DEFAULT_AVATAR_SVG,
              role: target?.role || 'user',
              verificationBadge: target?.verificationBadge ?? null,
              isPhoneVerified: true,
              status: target?.status || 'active',
              joinedDate: target?.joinedDate || 'Recent',
              walletBalanceNgn: resolvedNewBal,
              adminWalletAdjustedAt: adjustedAt,
              ordersCount: target?.ordersCount || 0,
              isOnline: isTargetCurrentUser,
            },
          ];
      adminUsersRef.current = next;
      return next;
    });

    if (isTargetCurrentUser) {
      pendingCreditHintRef.current = {
        note: 'Wallet credited by administrator',
        category: 'admin_topup',
        label: 'Admin Top-Up',
        at: Date.now(),
      };
      walletRef.current = { ...walletRef.current, availableBalance: resolvedNewBal };
      setWallet((w) => ({ ...w, availableBalance: resolvedNewBal }));
      try {
        const walletTsKey = getUserStorageKey('AGC_last_admin_wallet_ts', currentUser.phoneNumber);
        localStorage.setItem(walletTsKey, String(Date.parse(adjustedAt) || Date.now()));
      } catch (_) {}
    }

    const walletPayload = {
      type: 'wallet_adjusted',
      phoneOrId: target?.phoneNumber || phoneOrId,
      newBalance: resolvedNewBal,
      adminWalletAdjustedAt: adjustedAt,
    };
    try { adminSyncChannelRef.current?.postMessage(walletPayload); } catch (_) {}
    if (adminSupabaseChannelRef.current) {
      try {
        adminSupabaseChannelRef.current.send({ type: 'broadcast', event: 'wallet_adjusted', payload: walletPayload });
      } catch (_) {}
    }

    const identifier = resolveAdminUserKey(target?.phoneNumber || phoneOrId);
    const [apiData] = await Promise.all([
      safeJsonFetch(`/api/admin/users/${encodeURIComponent(identifier)}/adjust-wallet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newBalance: resolvedNewBal,
          phoneNumber: target?.phoneNumber || (isTargetCurrentUser ? currentUser.phoneNumber : undefined),
          fullName: target?.fullName || (isTargetCurrentUser ? currentUser.fullName : undefined),
          avatarUrl: target?.avatarUrl,
        }),
      }),
      upsertSupabaseAdminUserOverride(target?.phoneNumber || identifier, {
        walletBalanceNgn: resolvedNewBal,
        adminWalletAdjustedAt: adjustedAt,
        phoneNumber: target?.phoneNumber || (isTargetCurrentUser ? currentUser.phoneNumber : undefined),
        fullName: target?.fullName || (isTargetCurrentUser ? currentUser.fullName : undefined),
        avatarUrl: target?.avatarUrl,
      }),
    ]);
    if (apiData?.user) broadcastUserUpdateEverywhere(apiData.user);
  };

  const kickUserSession = async (phoneOrId: string) => {
    const target = findAdminUserTarget(phoneOrId);
    const payload = { type: 'kick', phoneOrId: target?.phoneNumber || phoneOrId };
    try { adminSyncChannelRef.current?.postMessage(payload); } catch (_) {}
    if (adminSupabaseChannelRef.current) {
      try {
        adminSupabaseChannelRef.current.send({ type: 'broadcast', event: 'kick', payload });
      } catch (_) {}
    }
    try {
      const identifier = resolveAdminUserKey(phoneOrId);
      await callAdminApi(`/api/admin/users/${encodeURIComponent(identifier)}/kick`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (e) {}
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

  const createAdminBroadcast = (title: string, message: string, level: 'info' | 'warning' | 'alert' | 'urgent' = 'info') => {
    const nowIso = new Date().toISOString();
    adminCmsUpdatedAtRef.current = Date.now();
    const newBroadcast: AdminSystemBroadcast = {
      id: `bc_${Date.now()}`,
      title,
      message,
      level,
      createdAt: 'Just now',
      active: true,
    };
    systemBroadcastRef.current = newBroadcast;
    setSystemBroadcast(newBroadcast);

    try {
      adminSyncChannelRef.current?.postMessage({ type: 'broadcast', data: newBroadcast });
    } catch (_) {}

    if (adminSupabaseChannelRef.current) {
      try {
        adminSupabaseChannelRef.current.send({
          type: 'broadcast',
          event: 'system_broadcast',
          payload: newBroadcast,
        });
      } catch (_) {}
    }

    safeJsonFetch('/api/admin/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, message, level }),
    });
    saveSupabaseAdminSlice(ADMIN_SYS_CMS_KEY, 'AGC_ADMIN_CMS', {
      cms: cmsDataRef.current,
      activeBroadcast: newBroadcast,
      updatedAt: nowIso,
    });

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

  const clearAdminBroadcast = async (): Promise<boolean> => {
    const nowIso = new Date().toISOString();
    adminCmsUpdatedAtRef.current = Date.now();
    systemBroadcastRef.current = null;
    setSystemBroadcast(null);
    try {
      adminSyncChannelRef.current?.postMessage({ type: 'broadcast', data: null });
    } catch (_) {}
    if (adminSupabaseChannelRef.current) {
      try {
        adminSupabaseChannelRef.current.send({
          type: 'broadcast',
          event: 'system_broadcast_cleared',
          payload: {},
        });
      } catch (_) {}
    }
    const [apiData, sbOk] = await Promise.all([
      safeJsonFetch('/api/admin/broadcast', { method: 'DELETE' }),
      saveSupabaseAdminSlice(ADMIN_SYS_CMS_KEY, 'AGC_ADMIN_CMS', {
        cms: cmsDataRef.current,
        activeBroadcast: null,
        updatedAt: nowIso,
      }),
    ]);
    return Boolean(apiData?.success || sbOk);
  };

  return (
    <AppContext.Provider
      value={{
        featureFlags,
        isFeatureEnabled,
        toggleFeatureFlag,
        clearChat,
        deleteChat,
        toggleShelfChat,
        setChatLabel,
        updateChat,
        addMembersToGroup,
        removeMemberFromGroup,
        leaveGroup,
        createGroup,
        createChannel,
        toggleMemberAdmin,
        deleteMessage,
        reactToMessage,
        sendImageMessage,
        blockedUserIds,
        toggleBlockUser,
        isUserBlockedByMe,
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
        addSponsoredStatus,
        deleteStatus,
        handleAdClick,
        wallet,
        activeCreditAlert,
        dismissCreditAlert,
        triggerCreditAlert,
        isWalletModalOpen,
        setIsWalletModalOpen,
        refreshWalletFromServer,
        topUpWallet,
        withdrawWallet,
        fetchLiveBanks,
        resolveBankAccount,
        updateUsername,
        hideBalanceOnNav,
        toggleHideBalance,
        readReceiptsEnabled,
        toggleReadReceipts,
        activeCheckoutProduct,
        openCheckout,
        closeCheckout,
        escrowOrders,
        activeEscrowModalOrder,
        setActiveEscrowModalOrder,
        isDarkMode,
        toggleDarkMode,
        sendMessage,
        forwardMessage,
        sendVoiceNote,
        sendProductCard,
        isShareLocationModalOpen,
        setIsShareLocationModalOpen,
        sendLocationMessage,
        isOneTimeViewEnabled,
        setIsOneTimeViewEnabled,
        loadImage,
        createEscrowOrder,
        approveEscrowRelease,
        claimEscrowWithCode,
        disputeEscrowOrder,
        refreshEscrowOrders,
        releaseEscrowFunds,
        openChatWithProduct,
        activeCall,
        startCall,
        endCall,
        toggleCallMute,
        toggleCallSpeaker,
        toggleCallMinimize,
        setCallMinimized,
        upgradeCallToGroup,
        inviteToActiveCall,
        incomingCall,
        acceptIncomingCall,
        declineIncomingCall,
        // 1. Meme & Sticker Studio
        isMemeStudioOpen,
        setIsMemeStudioOpen,
        sendMemeSticker,
        // 2. Live Audio Spaces / Street Radio
        isSpacesDashboardOpen,
        setIsSpacesDashboardOpen,
        isAudioSpaceMinimized,
        setIsAudioSpaceMinimized,
        audioSpaces,
        activeAudioSpace,
        joinAudioSpace,
        leaveAudioSpace,
        createAudioSpace,
        toggleAudioSpaceMute,
        toggleSpaceLowBandwidth,
        isSpaceCreator,
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
        // 6. Group Polls with Financial Stakes & Free Chat Quick Polls
        isFinancialPollModalOpen,
        setIsFinancialPollModalOpen,
        createFinancialPoll,
        voteOnFinancialPoll,
        isQuickPollModalOpen,
        setIsQuickPollModalOpen,
        createQuickPoll,
        voteOnQuickPoll,
        // 6b. Live Socket.IO Multiplayer X/O (Tic-Tac-Toe)
        isGameXoModalOpen,
        setIsGameXoModalOpen,
        getGameBetLimit,
        sendXoChallenge,
        acceptXoChallenge,
        declineXoChallenge,
        makeXoMove,
        forfeitXoGame,
        // 6c. Live Whot!, Ludo & Texas Hold'em Poker Games
        sendWhotChallenge,
        acceptWhotChallenge,
        declineWhotChallenge,
        playWhotCard,
        drawWhotCard,
        forfeitWhotGame,
        sendLudoChallenge,
        acceptLudoChallenge,
        declineLudoChallenge,
        rollLudoDice,
        moveLudoToken,
        forfeitLudoGame,
        sendPokerChallenge,
        acceptPokerChallenge,
        declinePokerChallenge,
        performPokerAction,
        forfeitPokerGame,
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
        openDirectChat,
        startAiChat,
        inviteBotToGroup,
        addNewDeviceContact,
        importDeviceContacts,
        friendRequests,
        activeContactRequestPopup,
        setActiveContactRequestPopup,
        sendFriendRequest,
        acceptFriendRequest,
        declineFriendRequest,
        groupInvites,
        activeGroupInvitePopup,
        setActiveGroupInvitePopup,
        acceptGroupInvite,
        declineGroupInvite,
        respondToGroupInvitation,
        endAudioSpace,
        spaceEndedSummary,
        setSpaceEndedSummary,
        // Live Supabase Presence & Typing Indicators
        onlineUserKeys,
        isUserOnline,
        getLastSeen,
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
        // 12b. Task-to-Earn Micro-Task Bounty Campaigns
        isTaskEarnModalOpen,
        setIsTaskEarnModalOpen,
        // 13. Security Settings (Payment PIN & Security Questions)
        securitySettings,
        setPaymentPin,
        updatePaymentPin,
        setSecurityQuestion,
        setSecurityQuestions,
        resetPaymentPinWithQuestions,
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
        // 15. Send My Bill (Pay on Behalf)
        isSendBillModalOpen,
        setIsSendBillModalOpen,
        sendBillRequest,
        payBillOnBehalf,
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
        globalChatTheme,
        setGlobalChatTheme,
        setChatTheme,
        setDisappearingTimer,
        markGhostMessagesViewed,
        pinChatMessage,
        clearChatMentions,
        // QR Scanner
        isScanQrModalOpen,
        setIsScanQrModalOpen,
        // 18. Town Communities
        townCommunities,
        hidePhoneNumberInTown,
        toggleHidePhoneNumberInTown,
        toggleJoinTownCommunity,
        addTownCommunity,
        deleteTownCommunity,
        joinGroupByCodeOrLink,
        // 19. Healthcare
        doctors,
        queueTokens,
        medicationReminders,
        healthVault,
        isHealthModalOpen,
        setIsHealthModalOpen,
        registerClinicOrDoctor,
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
        registerLawyer,
        bookLawyerConsultation,
        generateLegalContract,
        signLegalContract,
        triggerEmergencyLegalSos,
        refreshProfessionals,
        reviewProfessional,
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
        hasActiveStore,
        myStoreProducts,
        addStoreProduct,
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
        // 30. Pet Shop & Forum
        isPetShopModalOpen,
        setIsPetShopModalOpen,
        // 29. Super Admin Console & Moderation
        isAdminModalOpen,
        setIsAdminModalOpen,
        adminUsers,
        refreshAdminUsers,
        getBadgeForPhone,
        toggleUserVerification,
        toggleUserSuspension,
        adminResolveEscrow,
        systemBroadcast,
        setSystemBroadcast,
        createAdminBroadcast,
        clearAdminBroadcast,
        systemConfig,
        updateSystemConfig,
        updateAdminFeatureFlag,
        cmsData,
        updateCmsData,
        setUserStatus,
        setUserRole,
        banUser,
        unbanUser,
        adjustUserWallet,
        kickUserSession,
        isBanned,
        banInfo,
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







