import { supabase, isSupabaseConfigured } from './supabase';
import type { ChatMessage, ChatThread, UserProfile, UserWallet } from '../types';

const CHAT_BACKUP_PREFIX = '__agc_sys_chats_';
const MAX_CHATS_BACKUP = 120;
const MAX_MESSAGES_PER_CHAT_BACKUP = 160;
const MAX_AVATAR_LEN = 32000;
const MAX_IMAGE_LEN = 120000;
const MAX_VOICE_LEN = 350000;

export interface AccountBackupSnapshot {
  wallet?: UserWallet;
  userProfile?: Partial<UserProfile>;
  updatedAt?: string;
}

function getPhoneKeyVariants(phoneNumber?: string): { digits: string; last9: string } {
  const raw = (phoneNumber || '').replace(/\D/g, '');
  if (!raw) return { digits: '', last9: '' };
  let norm = raw;
  if (norm.startsWith('0') && norm.length === 11) {
    norm = '234' + norm.slice(1);
  }
  const last9 = norm.length >= 9 ? norm.slice(-9) : norm;
  return { digits: norm, last9 };
}

/**
 * Strips heavy/redundant blobs before persisting chats to Supabase
 * so storage usage stays fast while preserving voice notes and photos.
 */
export function sanitizeChatsForBackup(chats: ChatThread[]): ChatThread[] {
  return (chats || []).slice(0, MAX_CHATS_BACKUP).map((c) => ({
    ...c,
    avatar:
      c.avatar && (!c.avatar.startsWith('data:') || c.avatar.length <= MAX_AVATAR_LEN)
        ? c.avatar
        : '',
    catalog: [], // Do not duplicate marketplace product catalogs in chat backup
  }));
}

export function sanitizeMessagesForBackup(
  messagesMap: Record<string, ChatMessage[]>
): Record<string, ChatMessage[]> {
  const out: Record<string, ChatMessage[]> = {};
  for (const [chatId, list] of Object.entries(messagesMap || {})) {
    if (!Array.isArray(list) || list.length === 0) continue;
    out[chatId] = list.slice(-MAX_MESSAGES_PER_CHAT_BACKUP).map((m) => {
      const sanitized: ChatMessage = {
        ...m,
        // Strip repeated per-message avatar data URLs
        senderAvatar:
          m.senderAvatar && !m.senderAvatar.startsWith('data:')
            ? m.senderAvatar
            : undefined,
      };
      if (sanitized.imageUrl && sanitized.imageUrl.startsWith('data:') && sanitized.imageUrl.length > MAX_IMAGE_LEN) {
        sanitized.imageUrl = undefined;
        if (!sanitized.text) sanitized.text = '📷 Photo';
      }
      if (sanitized.memeSticker?.imageUrl && sanitized.memeSticker.imageUrl.startsWith('data:') && sanitized.memeSticker.imageUrl.length > MAX_IMAGE_LEN) {
        sanitized.memeSticker = {
          ...sanitized.memeSticker,
          imageUrl: '',
        };
      }
      if (sanitized.voiceNote?.audioDataUrl && sanitized.voiceNote.audioDataUrl.length > MAX_VOICE_LEN) {
        sanitized.voiceNote = {
          ...sanitized.voiceNote,
          audioDataUrl: '',
        };
      }
      return sanitized;
    });
  }
  return out;
}

export function sanitizeProfileForBackup(profile?: Partial<UserProfile>): Partial<UserProfile> | undefined {
  if (!profile || !profile.phoneNumber) return undefined;
  return {
    ...profile,
    avatarUrl:
      profile.avatarUrl && (!profile.avatarUrl.startsWith('data:') || profile.avatarUrl.length <= 48000)
        ? profile.avatarUrl
        : undefined,
  };
}

export function mergeChatThreadsAndMessages(
  primaryChats: ChatThread[],
  primaryMsgs: Record<string, ChatMessage[]>,
  secondaryChats: ChatThread[],
  secondaryMsgs: Record<string, ChatMessage[]>
): { chats: ChatThread[]; messages: Record<string, ChatMessage[]> } {
  const chatMap = new Map<string, ChatThread>();

  // Insert secondary (e.g. remote DB backup) first, then overlay/merge primary (local)
  for (const c of secondaryChats || []) {
    if (c && c.id) chatMap.set(c.id, c);
  }
  for (const c of primaryChats || []) {
    if (!c || !c.id) continue;
    const prev = chatMap.get(c.id);
    if (!prev) {
      chatMap.set(c.id, c);
    } else {
      chatMap.set(c.id, {
        ...prev,
        ...c,
        avatar: c.avatar || prev.avatar,
        lastMessage: c.lastMessage || prev.lastMessage,
        lastMessageTime: c.lastMessageTime || prev.lastMessageTime,
      });
    }
  }

  const mergedMsgs: Record<string, ChatMessage[]> = {};
  const allChatIds = new Set([
    ...Object.keys(secondaryMsgs || {}),
    ...Object.keys(primaryMsgs || {}),
  ]);

  for (const cid of allChatIds) {
    const secList = Array.isArray(secondaryMsgs?.[cid]) ? secondaryMsgs[cid] : [];
    const priList = Array.isArray(primaryMsgs?.[cid]) ? primaryMsgs[cid] : [];
    const byId = new Map<string, ChatMessage>();
    for (const m of secList) {
      if (m && m.id) byId.set(m.id, m);
    }
    for (const m of priList) {
      if (!m || !m.id) continue;
      const existing = byId.get(m.id);
      if (!existing) {
        byId.set(m.id, m);
      } else {
        byId.set(m.id, {
          ...existing,
          ...m,
          imageUrl: m.imageUrl || existing.imageUrl,
          voiceNote: m.voiceNote
            ? {
                ...(existing.voiceNote || {}),
                ...m.voiceNote,
                audioDataUrl: m.voiceNote.audioDataUrl || existing.voiceNote?.audioDataUrl,
              }
            : existing.voiceNote,
        });
      }
    }
    mergedMsgs[cid] = Array.from(byId.values());
  }

  return {
    chats: Array.from(chatMap.values()),
    messages: mergedMsgs,
  };
}

export async function saveUserChatsBackupToSupabase(
  phoneNumber: string,
  chats: ChatThread[],
  messages: Record<string, ChatMessage[]>,
  accountSnapshot?: AccountBackupSnapshot
): Promise<boolean> {
  if (!isSupabaseConfigured || !phoneNumber) return false;
  const { last9 } = getPhoneKeyVariants(phoneNumber);
  if (!last9) return false;

  const cleanChats = sanitizeChatsForBackup(chats);
  const cleanMsgs = sanitizeMessagesForBackup(messages);
  const nowIso = new Date().toISOString();
  const cleanAccount: AccountBackupSnapshot | undefined = accountSnapshot
    ? {
        wallet: accountSnapshot.wallet,
        userProfile: sanitizeProfileForBackup(accountSnapshot.userProfile),
        updatedAt: accountSnapshot.updatedAt || nowIso,
      }
    : undefined;

  let savedPrimary = false;

  // 1. Try dedicated agc_chat_backups table first (if SQL migration was run)
  try {
    const { error } = await supabase.from('agc_chat_backups').upsert(
      {
        phone_digits: last9,
        full_phone: phoneNumber,
        chats_json: cleanChats,
        messages_json: cleanMsgs,
        updated_at: nowIso,
      },
      { onConflict: 'phone_digits' }
    );
    if (!error) savedPrimary = true;
  } catch (_) {}

  // 2. Always persist to scam_reports (__agc_sys_chats_*) as well when accountSnapshot is provided (or as fallback)
  if (!savedPrimary || cleanAccount) {
    try {
      const { error } = await supabase.from('scam_reports').upsert(
        {
          target_value: `${CHAT_BACKUP_PREFIX}${last9}`,
          target_type: 'phone',
          risk_level: 'verified_clean',
          reports_count: 0,
          account_name: 'AGC_CHAT_BACKUP',
          bank_name: 'AGC_SYSTEM',
          flags: {
            chats: cleanChats,
            messages: cleanMsgs,
            ...(cleanAccount ? { accountSnapshot: cleanAccount } : {}),
            updatedAt: nowIso,
          },
          updated_at: nowIso,
        },
        { onConflict: 'target_value,target_type' }
      );
      if (!error) savedPrimary = true;
    } catch (_) {}
  }

  return savedPrimary;
}

export async function fetchUserChatsBackupFromSupabase(phoneNumber: string): Promise<{
  chats: ChatThread[];
  messages: Record<string, ChatMessage[]>;
  accountSnapshot?: AccountBackupSnapshot;
  updatedAt?: string;
} | null> {
  if (!isSupabaseConfigured || !phoneNumber) return null;
  const { last9 } = getPhoneKeyVariants(phoneNumber);
  if (!last9) return null;

  let backupA: { chats: ChatThread[]; messages: Record<string, ChatMessage[]>; updatedAt?: string } | null = null;
  let backupB: {
    chats: ChatThread[];
    messages: Record<string, ChatMessage[]>;
    accountSnapshot?: AccountBackupSnapshot;
    updatedAt?: string;
  } | null = null;

  // 1. Try agc_chat_backups
  try {
    const { data, error } = await supabase
      .from('agc_chat_backups')
      .select('chats_json, messages_json, updated_at')
      .eq('phone_digits', last9)
      .maybeSingle();
    if (!error && data) {
      backupA = {
        chats: Array.isArray(data.chats_json) ? (data.chats_json as ChatThread[]) : [],
        messages:
          data.messages_json && typeof data.messages_json === 'object'
            ? (data.messages_json as Record<string, ChatMessage[]>)
            : {},
        updatedAt: data.updated_at,
      };
    }
  } catch (_) {}

  // 2. Try scam_reports backup (also carries accountSnapshot: wallet + profile)
  try {
    const { data, error } = await supabase
      .from('scam_reports')
      .select('flags, updated_at')
      .eq('target_value', `${CHAT_BACKUP_PREFIX}${last9}`)
      .eq('target_type', 'phone')
      .maybeSingle();
    if (!error && data && data.flags && typeof data.flags === 'object') {
      const flags = data.flags as any;
      backupB = {
        chats: Array.isArray(flags.chats) ? (flags.chats as ChatThread[]) : [],
        messages:
          flags.messages && typeof flags.messages === 'object'
            ? (flags.messages as Record<string, ChatMessage[]>)
            : {},
        accountSnapshot: flags.accountSnapshot as AccountBackupSnapshot | undefined,
        updatedAt: flags.updatedAt || data.updated_at,
      };
    }
  } catch (_) {}

  if (!backupA && !backupB) return null;
  if (backupA && !backupB) return backupA;
  if (backupB && !backupA) return backupB;

  const tsA = backupA?.updatedAt ? Date.parse(backupA.updatedAt) || 0 : 0;
  const tsB = backupB?.updatedAt ? Date.parse(backupB.updatedAt) || 0 : 0;
  const primary = tsA >= tsB ? backupA! : backupB!;
  const secondary = tsA >= tsB ? backupB! : backupA!;
  const merged = mergeChatThreadsAndMessages(
    primary.chats,
    primary.messages,
    secondary.chats,
    secondary.messages
  );
  return {
    ...merged,
    accountSnapshot: backupB?.accountSnapshot,
    updatedAt: primary.updatedAt,
  };
}

