import { createClient } from '@supabase/supabase-js';
import type { AudioSpace, TicTacToeGameState, UserProfile } from '../types';
import { safeLocalStorage } from '../utils/safeStorage';

const supabaseUrl: string =
  (import.meta.env.VITE_SUPABASE_URL as string) ||
  'https://sejiretcywvqbzbqalbg.supabase.co';

const supabaseAnonKey: string =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string) ||
  'sb_publishable_Ja5dvS5_c3JjrpsTI_hq_w_L7birCR1';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.includes('supabase.co') &&
  !supabaseUrl.includes('your-project-id')
);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: safeLocalStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// ─── Auth Helpers ──────────────────────────────────────────────────────────────

/** Sign up with phone + OTP (Supabase phone auth) */
export async function signUpWithPhone(phone: string) {
  return supabase.auth.signInWithOtp({ phone });
}

/** Verify OTP sent to phone */
export async function verifyPhoneOtp(phone: string, token: string) {
  return supabase.auth.verifyOtp({ phone, token, type: 'sms' });
}

/** Sign up with email + password */
export async function signUpWithEmail(email: string, password: string, fullName: string) {
  return supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
}

/** Sign in with email + password */
export async function signInWithEmail(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

/** Sign out */
export async function signOut() {
  return supabase.auth.signOut();
}

/** Get current session */
export async function getSession() {
  return supabase.auth.getSession();
}

/** Get current auth user */
export async function getAuthUser() {
  return supabase.auth.getUser();
}

// ─── Profile Helpers ──────────────────────────────────────────────────────────

/** Fetch profile row for a given user id */
export async function fetchProfile(userId: string) {
  return supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
}

/** Upsert (create or update) a profile row */
export async function upsertProfile(
  userId: string,
  data: Partial<{
    full_name: string;
    username: string;
    phone_number: string;
    avatar_url: string;
    bio: string;
    location: string;
    language: string;
    currency: string;
    low_data_mode: boolean;
    hide_balance: boolean;
    font_size: string;
    chat_wallpaper: string;
  }>
) {
  return supabase
    .from('profiles')
    .upsert({ id: userId, ...data, updated_at: new Date().toISOString() });
}

/** Map a Supabase profile row → app UserProfile type */
export function mapProfileToUser(row: Record<string, unknown>): UserProfile {
  return {
    id: row.id as string,
    fullName: (row.full_name as string) || 'AGC User',
    about: (row.bio as string) || (row.about as string) || 'Available · AGC User',
    createdAt: (row.created_at as string) || new Date().toISOString(),
    lastSeen: (row.last_seen as string) || 'Just now',
    username: (row.username as string) || '',
    phoneNumber: (row.phone_number as string) || '',
    avatarUrl:
      (row.avatar_url as string) ||
      `https://api.dicebear.com/7.x/avataaars/svg?seed=${row.id}`,
    bio: (row.bio as string) || '',
    location: (row.location as string) || '',
    isPhoneVerified: Boolean(row.is_phone_verified),
    isCelebrityVerified: Boolean(row.is_celebrity_verified),
    celebrityStageName: (row.celebrity_stage_name as string) || undefined,
    verificationBadge: (row.verification_badge as UserProfile['verificationBadge']) || undefined,
    role: (row.role as UserProfile['role']) || 'user',
    isAdmin: row.role === 'admin',
    isOnline: Boolean(row.is_online),
  };
}

// ─── Wallet Helpers ───────────────────────────────────────────────────────────

export async function fetchWallet(userId: string) {
  return supabase
    .from('wallets')
    .select('*')
    .eq('user_id', userId)
    .single();
}

export async function fetchWalletTransactions(userId: string, limit = 50) {
  return supabase
    .from('wallet_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
}

// ─── Products Helpers ─────────────────────────────────────────────────────────

export async function fetchProducts(category?: string, search?: string, limit = 60) {
  let query = supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (category && category !== 'all') {
    query = query.eq('category', category);
  }
  if (search) {
    query = query.ilike('title', `%${search}%`);
  }
  return query;
}

// ─── Service Providers ────────────────────────────────────────────────────────

export async function fetchServiceProviders(category?: string, limit = 60) {
  let query = supabase
    .from('service_providers')
    .select('*')
    .eq('is_active', true)
    .order('rating', { ascending: false })
    .limit(limit);

  if (category && category !== 'all') {
    query = query.eq('category', category);
  }
  return query;
}

// ─── Escrow Orders ────────────────────────────────────────────────────────────

export async function fetchEscrowOrders(userId: string, limit = 50) {
  return supabase
    .from('escrow_orders')
    .select('*')
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .order('created_at', { ascending: false })
    .limit(limit);
}

// ─── Messages / Realtime ──────────────────────────────────────────────────────

export async function fetchMessages(chatId: string, limit = 100) {
  return supabase
    .from('messages')
    .select('*, profiles!sender_id(full_name, avatar_url)')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true })
    .limit(limit);
}

export async function sendMessage(payload: {
  chat_id: string;
  sender_id: string;
  type: string;
  text?: string;
  image_url?: string;
  metadata?: Record<string, unknown>;
}) {
  return supabase.from('messages').insert(payload).select().single();
}

/** Subscribe to new messages in a chat */
export function subscribeToMessages(
  chatId: string,
  onMessage: (msg: Record<string, unknown>) => void
) {
  return supabase
    .channel(`messages:${chatId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
      (payload) => onMessage(payload.new as Record<string, unknown>)
    )
    .subscribe();
}

/** Subscribe to system broadcasts */
export function subscribeToBroadcasts(
  onBroadcast: (broadcast: Record<string, unknown>) => void
) {
  return supabase
    .channel('system_broadcasts')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'system_broadcasts' },
      (payload) => onBroadcast(payload.new as Record<string, unknown>)
    )
    .subscribe();
}

// ─── Courses ──────────────────────────────────────────────────────────────────

export async function fetchCourses(category?: string, search?: string, limit = 60) {
  let query = supabase
    .from('courses')
    .select(`
      *,
      tutor_profiles!tutor_id(tutor_name, user_id,
        profiles!user_id(avatar_url, is_phone_verified)
      )
    `)
    .eq('is_published', true)
    .order('enrolled_students_count', { ascending: false })
    .limit(limit);

  if (category && category !== 'all') {
    query = query.eq('category', category);
  }
  if (search) {
    query = query.ilike('title', `%${search}%`);
  }
  return query;
}

export async function enrollCourse(courseId: string, userId: string, amountPaid: number) {
  return supabase
    .from('course_enrollments')
    .insert({ course_id: courseId, student_id: userId, amount_paid: amountPaid })
    .select()
    .single();
}

// ─── System Broadcast ─────────────────────────────────────────────────────────

export async function fetchActiveBroadcast() {
  return supabase
    .from('system_broadcasts')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
}

// ─── Live Town Communities (Groups & Channels) ────────────────────────────────

export async function fetchLiveTownCommunities(limit = 100) {
  return supabase
    .from('town_communities')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
}

export async function createTownCommunityInDb(comm: {
  name: string;
  type?: string;
  category?: string;
  description?: string;
  avatar?: string;
  members_count?: number;
  members?: string[];
  tags?: string[];
}) {
  const tags: string[] = Array.isArray(comm.tags) ? [...comm.tags] : [];
  if (comm.type && !tags.some((t) => t.startsWith('type:'))) {
    tags.push(`type:${comm.type}`);
  }
  if (comm.members && comm.members.length > 0) {
    tags.push(`members:${JSON.stringify(comm.members)}`);
  }

  // Only insert columns that exist on town_communities schema in Supabase
  const payload = {
    name: comm.name,
    description: comm.description || null,
    category: comm.category || 'Tech & Hustle',
    avatar: comm.avatar || null,
    members_count: comm.members_count || 1,
    tags,
    is_live: true,
  };

  return supabase.from('town_communities').insert(payload).select().maybeSingle();
}

export async function updateTownCommunityInDb(nameOrId: string, updates: {
  members_count?: number;
  members?: string[];
  tags?: string[];
  description?: string;
}) {
  const tags: string[] = Array.isArray(updates.tags) ? [...updates.tags] : [];
  if (updates.members && updates.members.length > 0) {
    tags.push(`members:${JSON.stringify(updates.members)}`);
  }

  const payload: any = {};
  if (updates.members_count !== undefined) payload.members_count = updates.members_count;
  if (updates.description !== undefined) payload.description = updates.description;
  if (tags.length > 0) payload.tags = tags;

  // Try updating by UUID or name
  if (nameOrId.includes('-') && nameOrId.length >= 32) {
    return supabase.from('town_communities').update(payload).eq('id', nameOrId);
  }
  return supabase.from('town_communities').update(payload).eq('name', nameOrId);
}

// ─── Live Audio Spaces (Street Radio / Spaces) ───────────────────────────────

const VALID_SPACE_CATEGORIES: AudioSpace['category'][] = [
  'Tech & Hustle',
  'Afrobeats & Music',
  'Football Banter',
  'Market Townhall',
];

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isMissingSpacesTableError(err: any, tableName: string): boolean {
  const code = String(err?.code || '');
  const msg = String(err?.message || '').toLowerCase();
  return (
    code === 'PGRST205' ||
    code === '42P01' ||
    (msg.includes(tableName) && (msg.includes('schema cache') || msg.includes('does not exist')))
  );
}

let activeSpacesTable: 'audio_spaces' | 'spaces' = 'audio_spaces';

export function getActiveSpacesTable(): 'audio_spaces' | 'spaces' {
  return activeSpacesTable;
}

export function mapAudioSpaceRow(row: Record<string, any>): AudioSpace {
  const profile =
    row.profiles && !Array.isArray(row.profiles)
      ? row.profiles
      : Array.isArray(row.profiles)
      ? row.profiles[0]
      : null;

  const title = (row.title as string) || 'Live Space';
  const hostName =
    (row.host_name as string) ||
    (profile?.full_name as string) ||
    'Host';
  const hostAvatar =
    (row.host_avatar as string) ||
    (profile?.avatar_url as string) ||
    `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(hostName)}&backgroundColor=581c87&textColor=ffffff`;

  const rawCategory = row.category as AudioSpace['category'];
  const category = VALID_SPACE_CATEGORIES.includes(rawCategory)
    ? rawCategory
    : 'Tech & Hustle';

  const startedAtMs = row.started_at
    ? new Date(row.started_at as string).getTime()
    : row.created_at
    ? new Date(row.created_at as string).getTime()
    : Date.now();

  return {
    id: String(row.id),
    title,
    topic: (row.topic as string) || '',
    category,
    hostName,
    hostAvatar,
    listenersCount: Number(row.listeners_count ?? 0),
    isLive: Boolean(row.is_live),
    isLowBandwidthMode: Boolean(row.is_low_bandwidth_mode ?? true),
    startedAt: Number.isFinite(startedAtMs) ? startedAtMs : Date.now(),
    speakers: Array.isArray(row.speakers)
      ? row.speakers
      : [
          {
            id: (row.host_id as string) || `host_${row.id}`,
            name: hostName,
            avatar: hostAvatar,
            role: 'host',
            isSpeaking: true,
            isMuted: false,
          },
        ],
  };
}

export async function fetchLiveAudioSpaces(limit = 60) {
  if (activeSpacesTable === 'audio_spaces') {
    const joined = await supabase
      .from('audio_spaces')
      .select('*, profiles!host_id(full_name, avatar_url)')
      .eq('is_live', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!joined.error) return joined;

    if (!isMissingSpacesTableError(joined.error, 'audio_spaces')) {
      const plain = await supabase
        .from('audio_spaces')
        .select('*')
        .eq('is_live', true)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (!plain.error || !isMissingSpacesTableError(plain.error, 'audio_spaces')) {
        return plain;
      }
    }
    activeSpacesTable = 'spaces';
  }

  return supabase
    .from('spaces')
    .select('*')
    .eq('is_live', true)
    .order('created_at', { ascending: false })
    .limit(limit);
}

export async function fetchScheduledAudioSpaces(limit = 30) {
  if (activeSpacesTable === 'audio_spaces') {
    const joined = await supabase
      .from('audio_spaces')
      .select('*, profiles!host_id(full_name, avatar_url)')
      .eq('is_live', false)
      .is('ended_at', null)
      .order('started_at', { ascending: true })
      .limit(limit);

    if (!joined.error) return joined;

    if (!isMissingSpacesTableError(joined.error, 'audio_spaces')) {
      const plain = await supabase
        .from('audio_spaces')
        .select('*')
        .eq('is_live', false)
        .is('ended_at', null)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (!plain.error || !isMissingSpacesTableError(plain.error, 'audio_spaces')) {
        return plain;
      }
    }
    activeSpacesTable = 'spaces';
  }

  return supabase
    .from('spaces')
    .select('*')
    .eq('is_live', false)
    .order('created_at', { ascending: false })
    .limit(limit);
}

export async function createAudioSpaceInDb(space: {
  title: string;
  topic?: string;
  category: string;
  host_id?: string;
  host_name?: string;
  host_avatar?: string;
  is_live: boolean;
  is_low_bandwidth_mode?: boolean;
  listeners_count?: number;
  started_at?: string;
}) {
  const safeCategory = VALID_SPACE_CATEGORIES.includes(space.category as AudioSpace['category'])
    ? space.category
    : 'Tech & Hustle';

  if (activeSpacesTable === 'audio_spaces') {
    let resolvedHostId = space.host_id && UUID_REGEX.test(space.host_id) ? space.host_id : undefined;
    if (!resolvedHostId) {
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user?.id && UUID_REGEX.test(authData.user.id)) {
          resolvedHostId = authData.user.id;
        }
      } catch (_) {}
    }

    if (resolvedHostId) {
      const res = await supabase
        .from('audio_spaces')
        .insert({
          host_id: resolvedHostId,
          title: space.title,
          topic: space.topic || null,
          category: safeCategory,
          listeners_count: space.listeners_count ?? 1,
          is_live: space.is_live,
          is_low_bandwidth_mode: space.is_low_bandwidth_mode ?? true,
          started_at: space.started_at || (space.is_live ? new Date().toISOString() : null),
        })
        .select('*, profiles!host_id(full_name, avatar_url)')
        .maybeSingle();

      if (!res.error) return res;
      if (isMissingSpacesTableError(res.error, 'audio_spaces')) {
        activeSpacesTable = 'spaces';
      } else {
        return res;
      }
    }
  }

  if (activeSpacesTable === 'spaces') {
    return supabase
      .from('spaces')
      .insert({
        host_name: space.host_name || 'Host',
        title: space.title,
        listeners_count: space.listeners_count ?? 1,
        is_live: space.is_live,
      })
      .select()
      .maybeSingle();
  }

  return { data: null, error: null };
}

export async function updateAudioSpaceInDb(id: string, updates: Record<string, unknown>) {
  if (!id) return { data: null, error: null };
  if (activeSpacesTable === 'audio_spaces') {
    if (!UUID_REGEX.test(id)) return { data: null, error: null };
    return supabase.from('audio_spaces').update(updates).eq('id', id);
  }
  return supabase.from('spaces').update(updates).eq('id', id);
}

// ─── Scam Report & Reputation Database ───────────────────────────────────────

/**
 * Fetch a scam/fraud report by its target_value (phone or bank account number).
 * Schema: id, created_at, updated_at, target_value, target_type, risk_level, reports_count, account_name, bank_name, flags (jsonb)
 */
export async function fetchScamReportByTarget(targetValue: string) {
  const cleaned = targetValue.replace(/\s+/g, '');
  if (!cleaned || cleaned.startsWith('__agc_sys_')) {
    return { data: null, error: null };
  }
  // Try exact match first, then partial
  const { data, error } = await supabase
    .from('scam_reports')
    .select('*')
    .or(`target_value.eq.${cleaned},target_value.eq.${targetValue}`)
    .maybeSingle();

  if (error) {
    // Try a broader search using ilike
    const { data: d2, error: e2 } = await supabase
      .from('scam_reports')
      .select('*')
      .ilike('target_value', `%${cleaned}%`)
      .not('target_value', 'like', '__agc_sys_%')
      .maybeSingle();
    return { data: d2, error: e2 };
  }
  return { data, error };
}

/** Fetch all scam reports (for the crowdsourced vault display). */
export async function fetchAllScamReports(limit = 200) {
  return supabase
    .from('scam_reports')
    .select('*')
    .not('target_value', 'like', '__agc_sys_%')
    .order('reports_count', { ascending: false })
    .limit(limit);
}

/**
 * Persists a scam / fraud report into Supabase scam_reports table.
 * Uses upsert on target_value and target_type so reports increment and sync across all devices.
 */
export async function upsertScamReportInDb(entity: {
  targetValue: string;
  targetType: 'phone' | 'bank_account';
  riskLevel: string;
  reportsCount: number;
  accountName?: string;
  bankName?: string;
  flags: { date: string; reason: string; flagged_by?: string; flaggedBy?: string }[];
}) {
  const cleaned = entity.targetValue.replace(/\s+/g, '');
  const row = {
    target_value: cleaned,
    target_type: entity.targetType,
    risk_level: entity.riskLevel,
    reports_count: entity.reportsCount,
    account_name: entity.accountName || null,
    bank_name: entity.bankName || null,
    flags: entity.flags,
    updated_at: new Date().toISOString(),
  };

  return supabase
    .from('scam_reports')
    .upsert(row, { onConflict: 'target_value,target_type' });
}

/**
 * Broadcast a new scam report to all connected AGC users via Realtime.
 * Also syncs with Supabase database so reports persist permanently.
 */
export function broadcastScamReport(entity: {
  targetValue: string;
  targetType: 'phone' | 'bank_account';
  riskLevel: string;
  reportsCount: number;
  accountName?: string;
  bankName?: string;
  flags: { date: string; reason: string; flagged_by: string }[];
}) {
  const ch = supabase.channel('agc_scam_reports_live', {
    config: { broadcast: { self: true } },
  });
  ch.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      ch.send({
        type: 'broadcast',
        event: 'new_scam_report',
        payload: entity,
      });
      // Unsubscribe after sending
      setTimeout(() => ch.unsubscribe(), 2000);
    }
  });
}

// ─── Live Artisan Stations & Workshop Hub ─────────────────────────────────────

export async function fetchLiveArtisanStations(limit = 100) {
  return supabase
    .from('artisan_stations')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
}

export async function createArtisanStationInDb(station: {
  station_name: string;
  category: string;
  category_label?: string;
  location: string;
  workshop_address?: string;
  about?: string;
  avatar?: string;
  is_approved?: boolean;
  registration_fee_paid?: boolean;
  operating_hours?: Record<string, unknown>;
}) {
  return supabase.from('artisan_stations').insert(station).select().maybeSingle();
}

// ─── Live Merchant Store Subscriptions ────────────────────────────────────────

export async function fetchLiveStoreSubscriptions(limit = 100) {
  return supabase
    .from('store_subscriptions')
    .select('*')
    .eq('is_active', true)
    .order('registered_at', { ascending: false })
    .limit(limit);
}

export async function createStoreSubscriptionInDb(sub: {
  store_name: string;
  description?: string;
  category?: string;
  tier: string;
  items_limit: number;
  is_active: boolean;
  payment_method?: string;
}) {
  return supabase.from('store_subscriptions').insert(sub).select().maybeSingle();
}

// ─── Multiplayer X/O Game Matches (Supabase Postgres + Realtime) ──────────────

const XO_FALLBACK_PREFIX = '__agc_sys_xo_';
let gameMatchesTableStatus: 'unknown' | 'available' | 'missing' = 'unknown';

function isMissingGameMatchesError(err: any): boolean {
  const code = String(err?.code || '');
  const msg = String(err?.message || '').toLowerCase();
  return (
    code === 'PGRST205' ||
    code === '42P01' ||
    msg.includes('game_matches') && (msg.includes('schema cache') || msg.includes('does not exist'))
  );
}

function rowToXoGame(row: any): TicTacToeGameState | null {
  if (!row) return null;
  if (row.state && typeof row.state === 'object' && row.state.id) {
    return row.state as TicTacToeGameState;
  }
  if (row.flags?.game && typeof row.flags.game === 'object' && row.flags.game.id) {
    return row.flags.game as TicTacToeGameState;
  }
  return null;
}

export async function upsertXoGameInSupabase(
  game: TicTacToeGameState
): Promise<{ ok: boolean; game: TicTacToeGameState; error?: string }> {
  if (!isSupabaseConfigured) {
    return { ok: false, game, error: 'Supabase is not configured' };
  }

  if (gameMatchesTableStatus !== 'missing') {
    const row = {
      id: game.id,
      chat_id: game.chatId,
      game_type: game.gameType || 'xo',
      challenger_id: game.challengerId || null,
      challenger_phone: game.challengerPhone,
      challenger_name: game.challengerName,
      opponent_phone: game.opponentPhone || null,
      opponent_name: game.opponentName || null,
      mode: game.mode,
      bet_amount: Number(game.betAmount || 0),
      currency: game.currency || 'NGN',
      status: game.status,
      current_turn: game.currentTurn,
      board: game.board,
      state: game,
      created_at: game.createdAt || new Date().toISOString(),
      updated_at: game.updatedAt || new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('game_matches')
      .upsert(row, { onConflict: 'id' })
      .select('state')
      .maybeSingle();

    if (!error) {
      gameMatchesTableStatus = 'available';
      return { ok: true, game: rowToXoGame(data) || game };
    }
    if (!isMissingGameMatchesError(error)) {
      return { ok: false, game, error: error.message };
    }
    gameMatchesTableStatus = 'missing';
  }

  // Automatic fallback to existing scam_reports Realtime table if game_matches migration hasn't been run yet
  const { data: fbData, error: fbError } = await supabase
    .from('scam_reports')
    .upsert(
      {
        target_value: `${XO_FALLBACK_PREFIX}${game.id}`,
        target_type: 'phone',
        risk_level: 'verified_clean',
        reports_count: 0,
        account_name: game.chatId,
        bank_name: 'AGC_GAME_MATCH',
        flags: { game, updatedAt: game.updatedAt || new Date().toISOString() },
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'target_value,target_type' }
    )
    .select('flags')
    .maybeSingle();

  if (fbError) {
    return { ok: false, game, error: fbError.message };
  }
  return { ok: true, game: rowToXoGame(fbData) || game };
}

export async function fetchXoGameByIdFromSupabase(
  gameId: string
): Promise<TicTacToeGameState | null> {
  if (!isSupabaseConfigured || !gameId) return null;

  if (gameMatchesTableStatus !== 'missing') {
    const { data, error } = await supabase
      .from('game_matches')
      .select('state')
      .eq('id', gameId)
      .maybeSingle();

    if (!error) {
      gameMatchesTableStatus = 'available';
      return rowToXoGame(data);
    }
    if (!isMissingGameMatchesError(error)) {
      return null;
    }
    gameMatchesTableStatus = 'missing';
  }

  const { data: fbData } = await supabase
    .from('scam_reports')
    .select('flags')
    .eq('target_value', `${XO_FALLBACK_PREFIX}${gameId}`)
    .eq('target_type', 'phone')
    .maybeSingle();

  return rowToXoGame(fbData);
}

export async function fetchXoGamesForChatFromSupabase(
  chatId: string
): Promise<TicTacToeGameState[]> {
  if (!isSupabaseConfigured || !chatId) return [];

  if (gameMatchesTableStatus !== 'missing') {
    const { data, error } = await supabase
      .from('game_matches')
      .select('state')
      .eq('chat_id', chatId)
      .order('updated_at', { ascending: true })
      .limit(40);

    if (!error) {
      gameMatchesTableStatus = 'available';
      return (data || []).map(rowToXoGame).filter((g): g is TicTacToeGameState => Boolean(g));
    }
    if (!isMissingGameMatchesError(error)) {
      return [];
    }
    gameMatchesTableStatus = 'missing';
  }

  const { data: fbRows } = await supabase
    .from('scam_reports')
    .select('flags')
    .eq('account_name', chatId)
    .eq('bank_name', 'AGC_GAME_MATCH')
    .like('target_value', `${XO_FALLBACK_PREFIX}%`)
    .order('updated_at', { ascending: true })
    .limit(40);

  return (fbRows || []).map(rowToXoGame).filter((g): g is TicTacToeGameState => Boolean(g));
}

export function subscribeToXoGamesInChat(
  chatId: string,
  onGame: (game: TicTacToeGameState) => void
) {
  const channel = supabase.channel(`xo_match_${chatId}`, {
    config: { broadcast: { self: false } },
  });

  if (gameMatchesTableStatus !== 'missing') {
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'game_matches', filter: `chat_id=eq.${chatId}` },
      (payload) => {
        const game = rowToXoGame(payload.new);
        if (game) onGame(game);
      }
    );
  }

  channel
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'scam_reports', filter: `account_name=eq.${chatId}` },
      (payload) => {
        const row = payload.new as any;
        if (row?.target_value?.startsWith(XO_FALLBACK_PREFIX)) {
          const game = rowToXoGame(row);
          if (game) onGame(game);
        }
      }
    )
    .on('broadcast', { event: 'xo_game_update' }, ({ payload }: any) => {
      if (payload?.game) onGame(payload.game as TicTacToeGameState);
    })
    .subscribe();

  return channel;
}


