import { supabase, isSupabaseConfigured } from './supabase';

export const ADMIN_SYS_CONFIG_KEY = '__agc_sys_config__';
export const ADMIN_SYS_CMS_KEY = '__agc_sys_cms__';
export const ADMIN_SYS_USERS_KEY = '__agc_sys_users__';
export const ADMIN_SYS_USER_DIRECTORY_KEY = '__agc_sys_user_directory__';
export const ADMIN_SYS_STORES_KEY = '__agc_sys_stores__';
export const ADMIN_SYS_AI_KEY = '__agc_sys_ai_datacenter__';
export const ADMIN_SYS_PROFS_KEY = '__agc_sys_professionals__';
export const ADMIN_SYS_ESCROWS_KEY = '__agc_sys_escrows__';

export function canonicalAdminUserKey(phoneOrId?: string): string {
  if (!phoneOrId) return '';
  const clean = String(phoneOrId).trim();
  const digits = clean.replace(/\D/g, '');
  if (digits.length >= 9) return digits.slice(-9);
  if (digits.length >= 7) return digits;
  return clean;
}

export const DEFAULT_ADMIN_KEY = 'fba230fada7e45ac2bf946fda50c0547d46d4300e2a6d8419e5bca9a2172c440';

export function getAdminApiKey(): string {
  try {
    return (
      localStorage.getItem('AGC_admin_api_key') ||
      sessionStorage.getItem('AGC_admin_api_key') ||
      DEFAULT_ADMIN_KEY
    );
  } catch (_) {
    return DEFAULT_ADMIN_KEY;
  }
}

export function setAdminApiKey(key: string): void {
  try {
    localStorage.setItem('AGC_admin_api_key', key.trim());
    sessionStorage.setItem('AGC_admin_api_key', key.trim());
  } catch (_) {}
}

export function getAdminHeaders(extraHeaders?: HeadersInit): Record<string, string> {
  const key = getAdminApiKey();
  const base: Record<string, string> = key ? { 'x-admin-key': key } : {};
  if (!extraHeaders) return base;
  if (extraHeaders instanceof Headers) {
    extraHeaders.forEach((val, k) => {
      base[k] = val;
    });
    return base;
  }
  if (Array.isArray(extraHeaders)) {
    extraHeaders.forEach(([k, v]) => {
      base[k] = v;
    });
    return base;
  }
  return { ...base, ...(extraHeaders as Record<string, string>) };
}

export async function safeJsonFetch(url: string, options?: RequestInit): Promise<any | null> {
  try {
    const adminKey = getAdminApiKey();
    const headers = new Headers(options?.headers || {});
    if (adminKey && !headers.has('x-admin-key')) {
      headers.set('x-admin-key', adminKey);
    }
    const res = await fetch(url, { ...options, headers });
    if (!res.ok) return null;
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    if (!ct.includes('application/json')) return null;
    return await res.json();
  } catch (_) {
    return null;
  }
}

export async function fetchSupabaseAdminSlice<T = any>(key: string): Promise<T | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase
      .from('scam_reports')
      .select('flags, updated_at')
      .eq('target_value', key)
      .eq('target_type', 'phone')
      .maybeSingle();
    if (error || !data || !data.flags || typeof data.flags !== 'object') return null;
    return {
      ...(data.flags as any),
      _rowUpdatedAt: data.updated_at,
    } as T;
  } catch (_) {
    return null;
  }
}

export async function saveSupabaseAdminSlice(
  key: string,
  accountName: string,
  payload: Record<string, any>
): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const { error } = await supabase.from('scam_reports').upsert(
      {
        target_value: key,
        target_type: 'phone',
        risk_level: 'verified_clean',
        reports_count: 0,
        account_name: accountName,
        bank_name: 'AGC_SYSTEM',
        flags: {
          ...payload,
          updatedAt: payload.updatedAt || new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'target_value,target_type' }
    );
    return !error;
  } catch (_) {
    return false;
  }
}

export async function upsertSupabaseDirectoryUser(user: {
  id?: string;
  phoneNumber?: string;
  fullName?: string;
  username?: string;
  avatarUrl?: string;
  about?: string;
  email?: string;
  createdAt?: string;
}): Promise<boolean> {
  const userKey = canonicalAdminUserKey(user.phoneNumber || user.id);
  if (!userKey || !isSupabaseConfigured || !user.phoneNumber) return false;
  try {
    const existingSlice = (await fetchSupabaseAdminSlice<{ users?: Record<string, any> }>(ADMIN_SYS_USER_DIRECTORY_KEY)) || {};
    const prevUsers = existingSlice.users && typeof existingSlice.users === 'object' ? existingSlice.users : {};
    const prevUser = prevUsers[userKey] || {};
    const nowIso = new Date().toISOString();
    const safeAvatar =
      user.avatarUrl && (!user.avatarUrl.startsWith('data:') || user.avatarUrl.length <= 24000)
        ? user.avatarUrl
        : prevUser.avatarUrl;
    const incomingName = (user.fullName || user.username || '').trim();
    const isGeneric = !incomingName || incomingName === 'AGC User' || incomingName === 'User' || incomingName === 'Registered User';
    const nextName = !isGeneric ? incomingName : (prevUser.fullName || incomingName || 'Registered User');

    const nextUsers = {
      ...prevUsers,
      [userKey]: {
        ...prevUser,
        id: prevUser.id || user.id || `usr_${user.phoneNumber.replace(/\D/g, '') || userKey}`,
        phoneNumber: prevUser.phoneNumber || user.phoneNumber,
        fullName: nextName,
        username: user.username || prevUser.username || nextName,
        ...(safeAvatar ? { avatarUrl: safeAvatar } : {}),
        ...(user.about ? { about: user.about } : {}),
        ...(user.email ? { email: user.email } : {}),
        registeredAt: prevUser.registeredAt || user.createdAt || nowIso,
        updatedAt: nowIso,
      },
    };
    return await saveSupabaseAdminSlice(ADMIN_SYS_USER_DIRECTORY_KEY, 'AGC_USER_DIRECTORY', {
      users: nextUsers,
      updatedAt: nowIso,
    });
  } catch (_) {
    return false;
  }
}

function normalizeCandidatePhone(raw?: string): string {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length < 7) return '';
  if (digits.startsWith('234') && digits.length >= 13) return `+${digits}`;
  if (digits.startsWith('0') && digits.length === 11) return `+234${digits.slice(1)}`;
  if (digits.length === 9) return `+234${digits}`;
  return `+${digits}`;
}

export async function fetchSupabaseAllDiscoveredUsers(): Promise<any[]> {
  if (!isSupabaseConfigured) return [];
  const byKey = new Map<string, any>();

  const mergeEntry = (entry: any) => {
    if (!entry) return;
    const phone = String(entry.phoneNumber || entry.full_phone || '').trim();
    const key = canonicalAdminUserKey(phone || entry.phone_digits || entry.id);
    if (!key || key === 'banks' || key.length < 7) return;
    const prev = byKey.get(key);
    const incName = String(entry.fullName || entry.username || '').trim();
    const isIncGeneric = !incName || incName === 'AGC User' || incName === 'User' || incName === 'Registered User';
    if (prev) {
      byKey.set(key, {
        ...prev,
        id: prev.id || entry.id || `usr_${key}`,
        phoneNumber: prev.phoneNumber || phone,
        fullName: !isIncGeneric ? incName : (prev.fullName || incName || 'Registered User'),
        username: entry.username || prev.username,
        avatarUrl:
          entry.avatarUrl && !String(entry.avatarUrl).includes('dicebear.com')
            ? entry.avatarUrl
            : (prev.avatarUrl || entry.avatarUrl),
        about: entry.about || prev.about,
        email: entry.email || prev.email,
        registeredAt: prev.registeredAt || entry.registeredAt,
        updatedAt: entry.updatedAt || prev.updatedAt,
        lastSeen: entry.lastSeen || prev.lastSeen || entry.updatedAt || prev.updatedAt || prev.registeredAt,
      });
    } else {
      byKey.set(key, {
        id: entry.id || `usr_${phone.replace(/\D/g, '') || key}`,
        phoneNumber: phone || normalizeCandidatePhone(key),
        fullName: incName || 'Registered User',
        username: entry.username || incName || undefined,
        avatarUrl: entry.avatarUrl,
        about: entry.about,
        email: entry.email,
        registeredAt: entry.registeredAt,
        updatedAt: entry.updatedAt,
        lastSeen: entry.lastSeen || entry.updatedAt || entry.registeredAt,
      });
    }
  };

  try {
    const [regRes, dirSlice, chatBackupsRes, contactReqRes, walletsSlice] = await Promise.all([
      supabase.from('agc_phone_registry').select('*').then((r) => r, () => null),
      fetchSupabaseAdminSlice<{ users?: Record<string, any> }>(ADMIN_SYS_USER_DIRECTORY_KEY),
      supabase
        .from('scam_reports')
        .select('target_value, flags, updated_at')
        .like('target_value', '__agc_sys_chats_%')
        .then((r) => r, () => null),
      supabase
        .from('contact_requests')
        .select('from_phone, from_name, from_avatar, to_phone, created_at')
        .then((r) => r, () => null),
      fetchSupabaseAdminSlice<{ wallets?: Record<string, any> }>('__agc_sys_wallets__'),
    ]);

    if (regRes && !regRes.error && Array.isArray(regRes.data)) {
      regRes.data.forEach((row: any) => {
        const phoneStr = row.full_phone || normalizeCandidatePhone(row.phone_digits);
        mergeEntry({
          id: `usr_${row.phone_digits || phoneStr.replace(/\D/g, '')}`,
          phoneNumber: phoneStr,
          fullName: row.username || 'Registered User',
          username: row.username,
          avatarUrl: row.avatar_url,
          registeredAt: row.registered_at,
          updatedAt: row.updated_at,
        });
      });
    }

    if (dirSlice?.users && typeof dirSlice.users === 'object') {
      Object.values(dirSlice.users).forEach((u: any) => mergeEntry(u));
    }

    const candidatePhones = new Map<string, string>();
    const addCandidate = (rawPhone?: string) => {
      const full = normalizeCandidatePhone(rawPhone);
      const k = canonicalAdminUserKey(full);
      if (k && k.length >= 7 && !byKey.has(k) && !candidatePhones.has(k)) {
        candidatePhones.set(k, full);
      }
    };

    if (chatBackupsRes && !chatBackupsRes.error && Array.isArray(chatBackupsRes.data)) {
      chatBackupsRes.data.forEach((row: any) => {
        const suffix = String(row.target_value || '').replace('__agc_sys_chats_', '');
        const snapProfile = row.flags?.accountSnapshot?.userProfile;
        if (snapProfile && (snapProfile.phoneNumber || suffix)) {
          mergeEntry({
            id: snapProfile.id || `usr_${(snapProfile.phoneNumber || suffix).replace(/\D/g, '')}`,
            phoneNumber: snapProfile.phoneNumber || normalizeCandidatePhone(suffix),
            fullName: snapProfile.fullName || snapProfile.username || 'Registered User',
            username: snapProfile.username || snapProfile.fullName,
            avatarUrl: snapProfile.avatarUrl,
            about: snapProfile.about,
            email: snapProfile.email,
            registeredAt: snapProfile.createdAt || row.updated_at,
            updatedAt: row.updated_at,
            lastSeen: row.updated_at || snapProfile.lastSeen,
          });
        } else if (suffix) {
          addCandidate(suffix);
        }

        if (Array.isArray(row.flags?.chats)) {
          row.flags.chats.forEach((c: any) => {
            if (!c || c.isGroup || c.isChannel || c.id === 'chat_afribot_ai' || String(c.id || '').startsWith('dm_self_')) return;
            const p = c.phoneNumber || c.phone;
            if (p && !String(p).includes('BOT')) addCandidate(p);
          });
        }
      });
    }

    if (contactReqRes && !contactReqRes.error && Array.isArray(contactReqRes.data)) {
      contactReqRes.data.forEach((cr: any) => {
        if (cr.from_phone) {
          if (cr.from_name && cr.from_name !== 'AGC User') {
            mergeEntry({
              phoneNumber: cr.from_phone,
              fullName: cr.from_name,
              avatarUrl: cr.from_avatar,
              registeredAt: cr.created_at,
            });
          } else {
            addCandidate(cr.from_phone);
          }
        }
        if (cr.to_phone) addCandidate(cr.to_phone);
      });
    }

    if (walletsSlice?.wallets && typeof walletsSlice.wallets === 'object') {
      Object.entries(walletsSlice.wallets).forEach(([wk, w]: [string, any]) => {
        if (wk === 'banks' || w?.phoneKey === 'banks') return;
        addCandidate(w?.phoneNumber || wk);
      });
    }

    // Resolve any remaining candidate phones via SECURITY DEFINER RPC check_phone_registered
    if (candidatePhones.size > 0) {
      await Promise.all(
        Array.from(candidatePhones.entries()).map(async ([last9, fullPhone]) => {
          try {
            const { data } = await supabase.rpc('check_phone_registered', {
              p_phone: fullPhone,
              p_last9: last9,
            });
            if (data && data.registered) {
              mergeEntry({
                id: `usr_${fullPhone.replace(/\D/g, '') || last9}`,
                phoneNumber: fullPhone,
                fullName: data.username || 'Registered User',
                username: data.username || undefined,
                avatarUrl: data.avatar_url || undefined,
              });
            }
          } catch (_) {}
        })
      );
    }
  } catch (_) {}

  return Array.from(byKey.values());
}

export async function upsertSupabaseAdminUserOverride(
  phoneOrId: string,
  patch: Record<string, any>
): Promise<boolean> {
  const userKey = canonicalAdminUserKey(phoneOrId);
  if (!userKey || !isSupabaseConfigured) return false;
  try {
    const existingSlice = (await fetchSupabaseAdminSlice<{ overrides?: Record<string, any> }>(ADMIN_SYS_USERS_KEY)) || {};
    const prevOverrides = existingSlice.overrides && typeof existingSlice.overrides === 'object'
      ? existingSlice.overrides
      : {};
    const prevUser = prevOverrides[userKey] || {};
    const nowIso = new Date().toISOString();
    const nextOverrides = {
      ...prevOverrides,
      [userKey]: {
        ...prevUser,
        ...patch,
        updatedAt: nowIso,
      },
    };
    return await saveSupabaseAdminSlice(ADMIN_SYS_USERS_KEY, 'AGC_ADMIN_USERS', {
      overrides: nextOverrides,
      updatedAt: nowIso,
    });
  } catch (_) {
    return false;
  }
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function upsertSupabaseAdminStoreOverride(
  storeId: string,
  patch: Record<string, any>
): Promise<boolean> {
  if (!storeId || !isSupabaseConfigured) return false;
  try {
    const existingSlice = (await fetchSupabaseAdminSlice<{ stores?: Record<string, any>; artisans?: Record<string, any> }>(ADMIN_SYS_STORES_KEY)) || {};
    const prevStores = existingSlice.stores && typeof existingSlice.stores === 'object' ? existingSlice.stores : {};
    const prevArtisans = existingSlice.artisans && typeof existingSlice.artisans === 'object' ? existingSlice.artisans : {};
    const nowIso = new Date().toISOString();
    const nextStores = {
      ...prevStores,
      [storeId]: {
        ...(prevStores[storeId] || {}),
        ...patch,
        id: storeId,
        updatedAt: nowIso,
      },
    };
    const ok = await saveSupabaseAdminSlice(ADMIN_SYS_STORES_KEY, 'AGC_ADMIN_STORES', {
      stores: nextStores,
      artisans: prevArtisans,
      updatedAt: nowIso,
    });

    if (UUID_REGEX.test(storeId)) {
      const dbPatch: Record<string, any> = {};
      if (patch.tier !== undefined) {
        dbPatch.tier = patch.tier;
        dbPatch.items_limit = patch.itemsLimit ?? (patch.tier === 'pro_100' ? 100 : 30);
      }
      if (patch.status !== undefined) {
        dbPatch.is_active = patch.status === 'active';
      }
      if (Object.keys(dbPatch).length > 0) {
        await supabase.from('store_subscriptions').update(dbPatch).eq('id', storeId);
      }
    }
    return ok;
  } catch (_) {
    return false;
  }
}

export async function upsertSupabaseAdminArtisanOverride(
  artisanId: string,
  patch: Record<string, any>
): Promise<boolean> {
  if (!artisanId || !isSupabaseConfigured) return false;
  try {
    const existingSlice = (await fetchSupabaseAdminSlice<{ stores?: Record<string, any>; artisans?: Record<string, any> }>(ADMIN_SYS_STORES_KEY)) || {};
    const prevStores = existingSlice.stores && typeof existingSlice.stores === 'object' ? existingSlice.stores : {};
    const prevArtisans = existingSlice.artisans && typeof existingSlice.artisans === 'object' ? existingSlice.artisans : {};
    const nowIso = new Date().toISOString();
    const nextArtisans = {
      ...prevArtisans,
      [artisanId]: {
        ...(prevArtisans[artisanId] || {}),
        ...patch,
        id: artisanId,
        updatedAt: nowIso,
      },
    };
    const ok = await saveSupabaseAdminSlice(ADMIN_SYS_STORES_KEY, 'AGC_ADMIN_STORES', {
      stores: prevStores,
      artisans: nextArtisans,
      updatedAt: nowIso,
    });

    if (UUID_REGEX.test(artisanId) && patch.isApproved !== undefined) {
      await supabase
        .from('artisan_stations')
        .update({ is_approved: Boolean(patch.isApproved) })
        .eq('id', artisanId);
    }
    return ok;
  } catch (_) {
    return false;
  }
}
