import { createClient } from '@supabase/supabase-js';
import type { UserProfile } from '../types';

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
    fullName: (row.full_name as string) || 'AfriChat User',
    about: (row.bio as string) || (row.about as string) || 'Available · AfriChat User',
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

export async function fetchProducts(category?: string, search?: string) {
  let query = supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (category && category !== 'all') {
    query = query.eq('category', category);
  }
  if (search) {
    query = query.ilike('title', `%${search}%`);
  }
  return query;
}

// ─── Service Providers ────────────────────────────────────────────────────────

export async function fetchServiceProviders(category?: string) {
  let query = supabase
    .from('service_providers')
    .select('*')
    .eq('is_active', true)
    .order('rating', { ascending: false });

  if (category && category !== 'all') {
    query = query.eq('category', category);
  }
  return query;
}

// ─── Escrow Orders ────────────────────────────────────────────────────────────

export async function fetchEscrowOrders(userId: string) {
  return supabase
    .from('escrow_orders')
    .select('*')
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .order('created_at', { ascending: false });
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

export async function fetchCourses(category?: string, search?: string) {
  let query = supabase
    .from('courses')
    .select(`
      *,
      tutor_profiles!tutor_id(tutor_name, user_id,
        profiles!user_id(avatar_url, is_phone_verified)
      )
    `)
    .eq('is_published', true)
    .order('enrolled_students_count', { ascending: false });

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
