import { supabase, isSupabaseConfigured } from './supabase';

export const ADMIN_SYS_CONFIG_KEY = '__agc_sys_config__';
export const ADMIN_SYS_CMS_KEY = '__agc_sys_cms__';
export const ADMIN_SYS_USERS_KEY = '__agc_sys_users__';
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

export async function safeJsonFetch(url: string, options?: RequestInit): Promise<any | null> {
  try {
    const res = await fetch(url, options);
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
