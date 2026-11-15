import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Enable CORS for Express REST routes (allow any local or hosted origin)
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json({ limit: '5mb' }));

// ── CUSTOM APPLICATION FIREWALL (WAF) & THREAT INSPECTION ──────────────────
const SQLI_REGEX = /(union\s+select|select\s+.*\s+from|insert\s+into|drop\s+table|update\s+.*\s+set|delete\s+from|sleep\(\d+\)|benchmark\(|waitfor\s+delay|;\s*--|\/\*|\*\/|;\s*drop|'\s*or\s*['\d]=['\d])/i;
const XSS_REGEX = /(<script.*?>|javascript:|onload\s*=|onerror\s*=|onmouseover\s*=|eval\(|<iframe|<svg.*?onload)/i;
const PATH_TRAVERSAL_REGEX = /(\.\.[\/\\]|%2e%2e%2f|%2e%2e\/|\.\.%2f|\/etc\/passwd|win\.ini)/i;

function inspectPayloadForThreats(target: any): string | null {
  if (!target) return null;
  const str = typeof target === 'string' ? target : JSON.stringify(target);
  if (SQLI_REGEX.test(str)) return 'SQL Injection attempt detected';
  if (XSS_REGEX.test(str)) return 'XSS payload detected';
  if (PATH_TRAVERSAL_REGEX.test(str)) return 'Path traversal attempt detected';
  return null;
}

// WAF Middleware applied to incoming /api HTTP requests
app.use('/api', (req: Request, res: Response, next) => {
  const urlThreat = inspectPayloadForThreats(req.originalUrl || req.url);
  if (urlThreat) {
    console.warn(`[WAF BLOCKED] ${req.ip} -> ${req.method} ${req.url} (${urlThreat})`);
    return res.status(403).json({
      error: 'Access Denied: Malicious payload pattern intercepted by AfriChat WAF engine.',
      reason: urlThreat,
      code: 'AGC_WAF_BLOCKED',
    });
  }

  const queryThreat = inspectPayloadForThreats(req.query);
  if (queryThreat) {
    console.warn(`[WAF BLOCKED] Query Threat: ${req.ip} -> ${queryThreat}`);
    return res.status(403).json({
      error: 'Access Denied: Dangerous query parameters detected.',
      code: 'AGC_WAF_QUERY_VIOLATION',
    });
  }

  if (req.body && Object.keys(req.body).length > 0) {
    const bodyThreat = inspectPayloadForThreats(req.body);
    if (bodyThreat) {
      console.warn(`[WAF BLOCKED] Body Threat: ${req.ip} -> ${bodyThreat}`);
      return res.status(403).json({
        error: 'Access Denied: Dangerous request body detected.',
        code: 'AGC_WAF_BODY_VIOLATION',
      });
    }
  }

  next();
});

// ── AUTH ROUTE RATE LIMITER (BRUTE FORCE PROTECTION) ───────────────────────
interface RateLimitRecord {
  attempts: number;
  resetAt: number;
}
const authRateLimits = new Map<string, RateLimitRecord>();
const AUTH_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const AUTH_MAX_ATTEMPTS = 10; // max 10 auth attempts per IP per 15 minutes

const authRateLimiter = (req: Request, res: Response, next: () => void) => {
  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || req.ip || '127.0.0.1';
  const now = Date.now();
  let record = authRateLimits.get(ip);

  if (!record || now > record.resetAt) {
    record = { attempts: 1, resetAt: now + AUTH_WINDOW_MS };
    authRateLimits.set(ip, record);
    return next();
  }

  record.attempts += 1;
  if (record.attempts > AUTH_MAX_ATTEMPTS) {
    const retryAfterSeconds = Math.ceil((record.resetAt - now) / 1000);
    console.warn(`[RATE LIMIT EXCEEDED] Auth IP: ${ip} (Attempts: ${record.attempts})`);
    res.setHeader('Retry-After', retryAfterSeconds);
    return res.status(429).json({
      error: 'Too many authentication attempts from this IP address. Please try again later.',
      retryAfterSeconds,
      code: 'AGC_AUTH_RATE_LIMIT',
    });
  }

  next();
};

// ── ANTI-BOT & RECON SCRAPING MITIGATION ────────────────────────────────────
const BOT_USER_AGENTS = [
  'sqlmap', 'nikto', 'nmap', 'masscan', 'gobuster', 'dirbuster', 'wpscan',
  'python-requests', 'aiohttp', 'curl/', 'wget/', 'postmanruntime',
];

const botMitigation = (req: Request, res: Response, next: () => void) => {
  const ua = (req.headers['user-agent'] || '').toLowerCase();
  const isMaliciousBot = BOT_USER_AGENTS.some((bot) => ua.includes(bot));

  if (isMaliciousBot) {
    console.warn(`[BOT BLOCKED] High-value scrape attempt: ${req.ip} (UA: ${ua})`);
    return res.status(403).json({
      error: 'Direct automated scraping prohibited on this endpoint.',
      code: 'AGC_BOT_RECON_BLOCKED',
    });
  }
  next();
};

// Apply rate limiter and bot protection to user registration and auth lookup routes
app.use('/api/users/register', authRateLimiter, botMitigation);
app.use('/api/users/check-phone', authRateLimiter);
app.use('/api/users/check-username', authRateLimiter);
app.use('/api/users', botMitigation);

// Basic health check route
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'AGC Real-Time Live Gateway',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    port: PORT,
  });
});

// Helper to normalize and produce matching phone variants (handles 080... vs 23480... vs last 9 digits)
function getPhoneVariants(rawPhone?: string): string[] {
  if (!rawPhone) return [];
  const clean = rawPhone.replace(/\D/g, '');
  if (!clean) return [];
  const variants = new Set<string>();
  variants.add(clean);
  if (clean.startsWith('0') && clean.length === 11) {
    variants.add('234' + clean.slice(1));
  } else if (clean.startsWith('234') && clean.length === 13) {
    variants.add('0' + clean.slice(3));
  }
  if (clean.length >= 9) {
    variants.add(clean.slice(-9));
  }
  if (clean.length >= 10) {
    variants.add(clean.slice(-10));
  }
  return Array.from(variants);
}

// ── Persistent User Registry ────────────────────────────────────────────────
interface RegisteredUser {
  id: string;
  fullName: string;
  phoneNumber: string;
  cleanPhone: string;
  avatarUrl?: string;
  about?: string;
  registeredAt: string;
  role?: string;
  status?: 'active' | 'suspended' | 'flagged' | 'banned';
  verificationBadge?: 'blue' | 'gold' | 'creator_plus' | null;
  walletBalanceNgn?: number;
  lastSeen?: string;
  isOnline?: boolean;
  deviceInfo?: string;
  bannedAt?: string;
  banReason?: string;
}

const usersByPhone = new Map<string, RegisteredUser>();

// ── Single-Session Enforcement: phone → active socket id ──────────────────────
// When a phone logs in on a new device/tab, the old socket receives 'force_logout'
const phoneToSocketId = new Map<string, string>();
const USERS_FILE = path.join(__dirname, 'data_users.json');
const COMMUNITIES_FILE = path.join(__dirname, 'data_communities.json');
const STATUSES_FILE = path.join(__dirname, 'data_statuses.json');
const DISPATCH_FILE = path.join(__dirname, 'data_dispatch_orders.json');
const CONFIG_FILE = path.join(__dirname, 'data_admin_config.json');
const CMS_FILE = path.join(__dirname, 'data_admin_cms.json');

const DEFAULT_SYSTEM_CONFIG = {
  maintenanceMode: false,
  maintenanceMessage: 'AfriChat is undergoing scheduled system upgrades. We will be back shortly.',
  allowNewRegistrations: true,
  requirePhoneOtp: false,
  defaultCurrency: 'NGN',
  dispatchCommissionPercent: 5,
  escrowCommissionPercent: 1.5,
  artisanCommissionPercent: 2,
  creatorCommissionPercent: 5,
  minTransferAmountNgn: 100,
  maxDailyTransferNgn: 5000000,
  delayedSendHoldDurationMins: 15,
  lowBandwidthDefault: false,
  supportContactPhone: '+234800000000',
};

const DEFAULT_FEATURE_FLAGS = {
  wallet: true,
  p2pTransfers: true,
  escrow: true,
  delayedSend: true,
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

const DEFAULT_CMS_DATA = {
  announcements: [
    {
      id: 'ann_welcome',
      title: 'Welcome to AfriChat Super-App',
      content: 'Experience secure African remittances, peer-to-peer escrow, and on-demand local dispatch.',
      level: 'info' as const,
      audience: 'all' as const,
      actionUrl: '',
      active: true,
      createdAt: new Date().toISOString(),
    },
  ],
  marqueeBanner: {
    enabled: true,
    text: '⚡ Welcome to AfriChat! Zero-fee transfers, instant dispatch deliveries, and escrow protection live across Africa.',
    speed: 'normal' as const,
    backgroundColor: '#7c3aed',
    textColor: '#ffffff',
  },
  faqArticles: [
    {
      id: 'faq_escrow',
      question: 'How does Balogun Escrow Protection work?',
      answer: 'When you purchase goods or book an artisan, your payment is held securely in an encrypted vault until you confirm satisfactory delivery.',
      category: 'escrow' as const,
      published: true,
    },
    {
      id: 'faq_dispatch',
      question: 'How do PickkR and Gokada dispatch deliveries work?',
      answer: 'Our dispatch system matches nearby verified riders. A 5% platform fee guarantees insurance and GPS parcel tracking.',
      category: 'dispatch' as const,
      published: true,
    },
    {
      id: 'faq_safety',
      question: 'How do I avoid scammers on P2P payments?',
      answer: 'Use the Scam Shield tool in the 3-dot menu before sending funds. Never release escrow funds until you inspect items physically.',
      category: 'security' as const,
      published: true,
    },
  ],
  communityGuidelines: '1. Treat all community members with respect.\n2. No fraudulent listings, phishing links, or unauthorized transactions.\n3. Verified badges are subject to continuous compliance with AfriChat terms.',
  termsOfService: 'AfriChat provides communication, marketplace escrow mediation, and logistical dispatch coordination across African regions.',
  sponsorSpotlight: {
    enabled: true,
    brandName: 'Kente Pay Africa',
    tagline: 'Zero-Fee African Merchant Remittances',
    bannerUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    linkUrl: '',
  },
};

let systemConfig = { ...DEFAULT_SYSTEM_CONFIG };
let featureFlags = { ...DEFAULT_FEATURE_FLAGS };
let cmsData = { ...DEFAULT_CMS_DATA };
let activeBroadcast: { id: string; title: string; message: string; level: string; createdAt: string; active: boolean } | null = null;

try {
  if (fs.existsSync(CONFIG_FILE)) {
    const raw = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    if (raw.config) systemConfig = { ...DEFAULT_SYSTEM_CONFIG, ...raw.config };
    if (raw.featureFlags) featureFlags = { ...DEFAULT_FEATURE_FLAGS, ...raw.featureFlags };
    if (raw.activeBroadcast !== undefined) activeBroadcast = raw.activeBroadcast;
  }
} catch (e) {
  console.warn('Notice loading admin config:', e);
}

try {
  if (fs.existsSync(CMS_FILE)) {
    const raw = JSON.parse(fs.readFileSync(CMS_FILE, 'utf8'));
    if (raw) {
      cmsData = {
        ...DEFAULT_CMS_DATA,
        ...raw,
        marqueeBanner: { ...DEFAULT_CMS_DATA.marqueeBanner, ...(raw.marqueeBanner || {}) },
        sponsorSpotlight: { ...DEFAULT_CMS_DATA.sponsorSpotlight, ...(raw.sponsorSpotlight || {}) },
      };
    }
  }
} catch (e) {
  console.warn('Notice loading admin cms:', e);
}

function saveAdminConfigFile() {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify({ config: systemConfig, featureFlags, activeBroadcast }, null, 2));
  } catch (e) {
    console.error('Failed saving admin config file:', e);
  }
}

function saveAdminCmsFile() {
  try {
    fs.writeFileSync(CMS_FILE, JSON.stringify(cmsData, null, 2));
  } catch (e) {
    console.error('Failed saving admin cms file:', e);
  }
}

const DEFAULT_SUPABASE_URL = 'https://sejiretcywvqbzbqalbg.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_Ja5dvS5_c3JjrpsTI_hq_w_L7birCR1';

const envSupabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
const SUPABASE_URL =
  envSupabaseUrl && envSupabaseUrl.includes('supabase.co') && !envSupabaseUrl.includes('your-project-id')
    ? envSupabaseUrl
    : DEFAULT_SUPABASE_URL;

const envSupabaseKey = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim();
const SUPABASE_ANON_KEY =
  envSupabaseKey && !envSupabaseKey.includes('your-anon-key')
    ? envSupabaseKey
    : DEFAULT_SUPABASE_ANON_KEY;

function findUserEntry(phoneOrId: string): { key: string; user: RegisteredUser } | null {
  const decoded = decodeURIComponent(phoneOrId || '').trim();
  if (!decoded) return null;
  const clean = decoded.replace(/\D/g, '');
  if (clean && usersByPhone.has(clean)) {
    return { key: clean, user: usersByPhone.get(clean)! };
  }
  const variants = getPhoneVariants(decoded);
  for (const [k, u] of usersByPhone.entries()) {
    if (u.id === decoded || u.phoneNumber === decoded || u.cleanPhone === clean) {
      return { key: k, user: u };
    }
    if (clean && (k.endsWith(clean) || clean.endsWith(k) || variants.includes(k))) {
      return { key: k, user: u };
    }
  }
  return null;
}

let lastSupabaseUsersSyncAt = 0;
let supabaseUsersSyncPromise: Promise<void> | null = null;

async function syncUsersFromSupabase(force = false): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return;
  const now = Date.now();
  if (!force && now - lastSupabaseUsersSyncAt < 5000) return;
  if (supabaseUsersSyncPromise) return supabaseUsersSyncPromise;

  supabaseUsersSyncPromise = (async () => {
    try {
      const fetchRegistry = (url: string, key: string) =>
        fetch(`${url}/rest/v1/agc_phone_registry?select=*`, {
          headers: {
            apikey: key,
            Authorization: `Bearer ${key}`,
          },
        });

      let res = await fetchRegistry(SUPABASE_URL, SUPABASE_ANON_KEY);
      if (!res.ok && (SUPABASE_URL !== DEFAULT_SUPABASE_URL || SUPABASE_ANON_KEY !== DEFAULT_SUPABASE_ANON_KEY)) {
        res = await fetchRegistry(DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY);
      }
      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        console.warn(`Notice: Supabase user sync returned HTTP ${res.status}: ${errText}`);
        return;
      }
      const rows = await res.json();
      if (!Array.isArray(rows)) {
        console.warn('Notice: Supabase user sync returned non-array payload');
        return;
      }

      let changed = false;
      for (const row of rows) {
        const rawPhone = (row.full_phone || '').trim() || (row.phone_digits ? `+234${String(row.phone_digits).replace(/^0+/, '')}` : '');
        const clean = rawPhone.replace(/\D/g, '') || String(row.phone_digits || '').replace(/\D/g, '');
        if (!clean) continue;

        const match = findUserEntry(rawPhone) || (row.phone_digits ? findUserEntry(String(row.phone_digits)) : null);
        if (match) {
          const { key, user } = match;
          let rowChanged = false;
          if ((!user.fullName || user.fullName === 'AGC User' || user.fullName === 'User') && row.username) {
            user.fullName = row.username;
            rowChanged = true;
          }
          if (!user.avatarUrl && row.avatar_url) {
            user.avatarUrl = row.avatar_url;
            rowChanged = true;
          }
          if (!user.registeredAt && row.registered_at) {
            user.registeredAt = row.registered_at;
            rowChanged = true;
          }
          if (rowChanged) {
            usersByPhone.set(key, user);
            changed = true;
          }
        } else {
          const newUser: RegisteredUser = {
            id: `usr_${row.phone_digits || clean}`,
            fullName: row.username || 'Registered User',
            phoneNumber: rawPhone.startsWith('+') ? rawPhone : `+${clean}`,
            cleanPhone: clean,
            avatarUrl:
              row.avatar_url ||
              `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(row.username || clean)}`,
            about: 'Available · Using AGC',
            registeredAt: row.registered_at || new Date().toISOString(),
            role: 'user',
            status: 'active',
            verificationBadge: null,
            walletBalanceNgn: 50000,
            isOnline: false,
            lastSeen: row.updated_at || row.registered_at || undefined,
          };
          usersByPhone.set(clean, newUser);
          changed = true;
        }
      }
      lastSupabaseUsersSyncAt = Date.now();
      if (changed) {
        saveUsersFile();
      }
    } catch (e) {
      console.warn('Notice syncing users from Supabase:', e);
    } finally {
      supabaseUsersSyncPromise = null;
    }
  })();

  return supabaseUsersSyncPromise;
}

async function ensureUserEntry(
  phoneOrId: string,
  hints?: { phoneNumber?: string; fullName?: string; avatarUrl?: string }
): Promise<{ key: string; user: RegisteredUser } | null> {
  let match = findUserEntry(phoneOrId);
  if (!match && hints?.phoneNumber) {
    match = findUserEntry(hints.phoneNumber);
  }
  if (!match) {
    await syncUsersFromSupabase(true);
    match = findUserEntry(phoneOrId) || (hints?.phoneNumber ? findUserEntry(hints.phoneNumber) : null);
  }
  if (!match) {
    const candidatePhone = hints?.phoneNumber || decodeURIComponent(phoneOrId || '').trim();
    const clean = candidatePhone.replace(/\D/g, '');
    if (clean.length >= 7) {
      const formattedPhone = candidatePhone.startsWith('+') ? candidatePhone : `+${clean}`;
      const created: RegisteredUser = {
        id: phoneOrId.startsWith('usr_') ? phoneOrId : `usr_${clean}`,
        fullName: hints?.fullName || 'Registered User',
        phoneNumber: formattedPhone,
        cleanPhone: clean,
        avatarUrl: hints?.avatarUrl || `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(clean)}`,
        about: 'Available · Using AGC',
        registeredAt: new Date().toISOString(),
        role: 'user',
        status: 'active',
        verificationBadge: null,
        walletBalanceNgn: 50000,
        isOnline: false,
      };
      usersByPhone.set(clean, created);
      saveUsersFile();
      return { key: clean, user: created };
    }
  }
  return match;
}
const communitiesMap = new Map<string, any>();
const statusesMap = new Map<string, any>();
const dispatchOrdersMap = new Map<string, any>();

const INITIAL_DISPATCH_ORDERS: any[] = [];

try {
  if (fs.existsSync(DISPATCH_FILE)) {
    const raw = JSON.parse(fs.readFileSync(DISPATCH_FILE, 'utf8'));
    if (Array.isArray(raw)) {
      for (const d of raw) {
        // Filter out any legacy mock dispatch items
        if (d.id && !d.id.startsWith('disp_gokada_') && !d.id.startsWith('disp_pickkr_')) {
          dispatchOrdersMap.set(d.id, d);
        }
      }
    }
  }
} catch (e) {
  console.warn('Notice loading dispatch orders:', e);
}

function saveDispatchFile() {
  try {
    fs.writeFileSync(DISPATCH_FILE, JSON.stringify(Array.from(dispatchOrdersMap.values()), null, 2));
  } catch (e) {
    console.warn('Notice saving dispatch registry:', e);
  }
}

try {
  if (fs.existsSync(STATUSES_FILE)) {
    const raw = JSON.parse(fs.readFileSync(STATUSES_FILE, 'utf8'));
    if (Array.isArray(raw)) {
      const now = Date.now();
      for (const s of raw) {
        if (s.id && (!s.expiresAt || new Date(s.expiresAt).getTime() > now)) {
          statusesMap.set(s.id, s);
        }
      }
    }
  }
} catch (e) {
  console.warn('Notice loading local statuses registry:', e);
}

function saveStatusesFile() {
  try {
    fs.writeFileSync(STATUSES_FILE, JSON.stringify(Array.from(statusesMap.values()), null, 2));
  } catch (e) {
    console.warn('Notice saving statuses registry:', e);
  }
}

try {
  if (fs.existsSync(COMMUNITIES_FILE)) {
    const raw = JSON.parse(fs.readFileSync(COMMUNITIES_FILE, 'utf8'));
    if (Array.isArray(raw)) {
      for (const c of raw) {
        if (c.id) communitiesMap.set(c.id, c);
      }
    }
  }
} catch (e) {
  console.warn('Notice loading local communities registry:', e);
}

function saveCommunitiesFile() {
  try {
    fs.writeFileSync(COMMUNITIES_FILE, JSON.stringify(Array.from(communitiesMap.values()), null, 2));
  } catch (e) {
    console.warn('Notice saving communities registry:', e);
  }
}

try {
  if (fs.existsSync(USERS_FILE)) {
    const raw = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    if (Array.isArray(raw)) {
      for (const u of raw) {
        const derivedClean = (u.cleanPhone || u.phoneNumber || '').replace(/\D/g, '');
        if (!derivedClean) continue;
        const normalized: RegisteredUser = {
          ...u,
          cleanPhone: derivedClean,
          phoneNumber: u.phoneNumber || `+${derivedClean}`,
          status: u.status || 'active',
          role: u.role || 'user',
          verificationBadge: u.verificationBadge ?? null,
          walletBalanceNgn: u.walletBalanceNgn ?? 50000,
          registeredAt: u.registeredAt || u.createdAt || new Date().toISOString(),
        };
        const existing = findUserEntry(normalized.phoneNumber) || findUserEntry(derivedClean);
        if (existing) {
          usersByPhone.set(existing.key, { ...existing.user, ...normalized });
        } else {
          usersByPhone.set(derivedClean, normalized);
        }
      }
    }
  }
} catch (e) {
  console.warn('Notice loading local users registry:', e);
}

function saveUsersFile() {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(Array.from(usersByPhone.values()), null, 2));
  } catch (e) {
    console.warn('Notice saving users registry:', e);
  }
}

// REST: Register user
app.post('/api/users/register', (req: Request, res: Response) => {
  const { id, fullName, phoneNumber, avatarUrl, about, role } = req.body;
  if (!phoneNumber) {
    return res.status(400).json({ error: 'Phone number required' });
  }
  const cleanPhone = phoneNumber.replace(/\D/g, '');
  const existingEntry = findUserEntry(phoneNumber);
  const existingCheck = existingEntry?.user || usersByPhone.get(cleanPhone);
  const storeKey = existingEntry?.key || cleanPhone;

  if (existingCheck && existingCheck.status === 'banned') {
    return res.status(403).json({
      error: 'This phone number has been permanently banned from registration.',
      code: 'AGC_USER_BANNED',
      banned: true,
    });
  }
  if (!existingCheck && !systemConfig.allowNewRegistrations) {
    return res.status(403).json({
      error: 'New registrations are currently paused by the administrator.',
      code: 'REGISTRATIONS_DISABLED',
    });
  }
  const user: RegisteredUser = {
    ...(existingCheck || {}),
    id: existingCheck?.id || id || `usr_${Date.now()}`,
    fullName: fullName || existingCheck?.fullName || 'AGC User',
    phoneNumber: existingCheck?.phoneNumber || phoneNumber,
    cleanPhone: existingCheck?.cleanPhone || cleanPhone,
    avatarUrl: avatarUrl || existingCheck?.avatarUrl,
    about: about || existingCheck?.about || 'Available · Using AGC',
    registeredAt: existingCheck?.registeredAt || new Date().toISOString(),
    role: existingCheck?.role || role || 'user',
    status: existingCheck?.status || 'active',
    verificationBadge: existingCheck?.verificationBadge ?? null,
    walletBalanceNgn: existingCheck?.walletBalanceNgn ?? 50000,
    isOnline: true,
    lastSeen: 'online',
  };
  usersByPhone.set(storeKey, user);
  saveUsersFile();
  console.log(`✅ [User Registered]: ${user.fullName} (${user.phoneNumber})`);
  io.emit('user_registered', user);

  // 🔒 Single-session: kick any existing socket for this phone
  const { sessionToken } = req.body;
  const existingSocketId = phoneToSocketId.get(cleanPhone);
  if (existingSocketId) {
    const existingSocket = io.sockets.sockets.get(existingSocketId);
    if (existingSocket) {
      existingSocket.emit('force_logout', {
        reason: 'new_device_login',
        message: 'Your account was opened on another device.',
      });
      existingSocket.disconnect(true);
    }
  }
  // Store session token for validation
  if (sessionToken) {
    (user as any).sessionToken = sessionToken;
    usersByPhone.set(storeKey, user);
  }

  res.json({ success: true, user, alreadyRegistered: Boolean(existingCheck) });
});

// REST: Check if phone is already registered (for duplicate-number guard)
app.get('/api/users/check-phone', (req: Request, res: Response) => {
  const rawPhone = (req.query.phone as string || '');
  const clean = rawPhone.replace(/\D/g, '');
  if (!clean) return res.status(400).json({ error: 'Phone required' });
  let existing = usersByPhone.get(clean);
  if (!existing) {
    for (const [phone, u] of usersByPhone.entries()) {
      if (phone.endsWith(clean) || clean.endsWith(phone)) {
        existing = u;
        break;
      }
    }
  }
  if (existing) {
    if (existing.status === 'banned') {
      return res.status(403).json({
        banned: true,
        error: 'This account has been permanently banned from the network.',
        banReason: existing.banReason || 'Violation of terms',
      });
    }
    return res.json({
      registered: true,
      name: existing.fullName,
      avatarUrl: existing.avatarUrl,
      status: existing.status,
      sessionToken: (existing as any).sessionToken,
    });
  }
  return res.json({ registered: false });
});

// REST: Check if username is already taken (unique handle verification)
app.get('/api/users/check-username', (req: Request, res: Response) => {
  const rawUsername = (req.query.username as string || '').trim().toLowerCase().replace(/^@/, '');
  if (!rawUsername) return res.status(400).json({ error: 'Username required' });
  for (const user of usersByPhone.values()) {
    const uName = (user.fullName || '').toLowerCase().replace(/^@/, '').trim();
    if (uName === rawUsername) {
      return res.json({ taken: true, username: rawUsername });
    }
  }
  return res.json({ taken: false, username: rawUsername });
});

// REST: User lookup by phone number
app.get('/api/users/lookup', (req: Request, res: Response) => {
  const rawQuery = (req.query.phone as string || '');
  const query = rawQuery.replace(/\D/g, '');
  if (!query) {
    return res.status(400).json({ found: false, error: 'Phone query required' });
  }
  let foundUser: RegisteredUser | undefined = usersByPhone.get(query);
  if (!foundUser) {
    for (const [phone, u] of usersByPhone.entries()) {
      if (phone.endsWith(query) || query.endsWith(phone)) {
        foundUser = u;
        break;
      }
    }
  }
  if (foundUser) {
    res.json({ found: true, user: foundUser });
  } else {
    res.json({ found: false });
  }
});

// REST: List all registered users (synced live with Supabase registry)
app.get('/api/users', async (_req: Request, res: Response) => {
  await syncUsersFromSupabase();
  res.json({ users: Array.from(usersByPhone.values()) });
});

// REST: Communities endpoints
app.get('/api/communities', (_req: Request, res: Response) => {
  res.json({ communities: Array.from(communitiesMap.values()) });
});

app.post('/api/communities', (req: Request, res: Response) => {
  const comm = req.body;
  if (!comm || !comm.id) return res.status(400).json({ error: 'Community data required' });
  communitiesMap.set(comm.id, comm);
  saveCommunitiesFile();
  io.emit('community_created', comm);
  res.json({ success: true, community: comm });
});

// REST: Resend Email Endpoint
app.post('/api/email/send', async (req: Request, res: Response) => {
  try {
    const { to, subject, html, text, from } = req.body;
    if (!to || !subject) {
      return res.status(400).json({ error: 'Recipient (to) and subject required' });
    }
    const recipients = Array.isArray(to) ? to : [to];
    const apiKey = process.env.RESEND_API_KEY || '';
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: from || 'onboarding@resend.dev',
        to: recipients,
        subject,
        html: html || `<p>${text || subject}</p>`,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json(data);
    }
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error dispatching email' });
  }
});

app.get('/api/statuses', (_req: Request, res: Response) => {
  const now = Date.now();
  const list = Array.from(statusesMap.values()).filter(
    (s: any) => !s.expiresAt || new Date(s.expiresAt).getTime() > now
  );
  res.json(list);
});

app.post('/api/statuses', (req: Request, res: Response) => {
  const st = req.body;
  if (!st || !st.id) return res.status(400).json({ error: 'Status data required' });
  statusesMap.set(st.id, st);
  saveStatusesFile();
  io.emit('new_status', { status: st });
  res.json({ success: true, status: st });
});

// ── REST: LIVE DISPATCH ORDERS WITH 5% PLATFORM FEE ──────────────────────────
const RIDER_POOL = [
  { name: 'Tunde Balogun (Gokada Express)', phone: '+2348039988112', plate: 'GKD-481-APP' },
  { name: 'Ibrahim Musa (AGC Swift Rider)', phone: '+2348128392011', plate: 'GKD-912-LG' },
  { name: 'Chukwuma Eze (City Cargo Van)', phone: '+2348067711200', plate: 'PCK-334-IKJ' },
  { name: 'Femi Adeleke (FastTrack Dispatch)', phone: '+2348154432198', plate: 'GKD-105-VI' },
  { name: 'Babatunde Alao (Gokada Elite)', phone: '+2348038884921', plate: 'GKD-782-IKJ' },
  { name: 'Oluwaseun PickkR Hub #12', phone: '+2348091122334', plate: 'PCK-504-OYO' },
];

app.get('/api/dispatch/orders', (_req: Request, res: Response) => {
  const orders = Array.from(dispatchOrdersMap.values()).sort((a: any, b: any) => {
    const tA = new Date(a.createdAt).getTime() || 0;
    const tB = new Date(b.createdAt).getTime() || 0;
    return tB - tA;
  });
  res.json({ success: true, orders });
});

app.post('/api/dispatch/orders', (req: Request, res: Response) => {
  try {
    const body = req.body;
    if (!body) return res.status(400).json({ error: 'Order data required' });

    const baseFee = Number(body.estimatedFee) || (body.vehicleType === 'van' ? 6500 : 2400);
    // Live Admin-configurable Dispatch Platform commission
    const dispatchRate = (Number(systemConfig.dispatchCommissionPercent ?? 5) || 0) / 100;
    const platformFee = Math.round(baseFee * dispatchRate);
    const totalFee = baseFee + platformFee;

    const provider = body.provider || (body.vehicleType === 'van' ? 'pickkr' : 'gokada');
    const prefix = provider === 'gokada' ? 'GKD' : 'PCK';
    const trackingCode = `AGC-${prefix}-${Math.floor(10000 + Math.random() * 90000)}`;

    const randomRider = RIDER_POOL[Math.floor(Math.random() * RIDER_POOL.length)];

    const newOrder = {
      id: body.id || `disp_${Date.now()}`,
      trackingCode: body.trackingCode || trackingCode,
      provider,
      senderAddress: body.senderAddress || 'Shop 14, Balogun Ultra-Modern Complex, Lagos Island',
      senderPhone: body.senderPhone || '+2348031234567',
      recipientName: body.recipientName || 'Recipient',
      recipientPhone: body.recipientPhone || '+2348000000000',
      recipientAddress: body.recipientAddress || 'Lagos, Nigeria',
      packageDescription: body.packageDescription || 'Parcel package',
      vehicleType: body.vehicleType || 'bike',
      estimatedFee: baseFee,
      platformFee,
      totalFee,
      currency: body.currency || 'NGN',
      status: 'rider_assigned',
      riderName: body.riderName || randomRider.name,
      riderPhone: body.riderPhone || randomRider.phone,
      riderPlate: body.riderPlate || randomRider.plate,
      createdAt: body.createdAt || new Date().toISOString(),
    };

    dispatchOrdersMap.set(newOrder.id, newOrder);
    saveDispatchFile();

    io.emit('dispatch_order_created', newOrder);

    // Live automatic progress simulation for active delivery tracking
    setTimeout(() => {
      const existing = dispatchOrdersMap.get(newOrder.id);
      if (existing && existing.status === 'rider_assigned') {
        existing.status = 'in_transit';
        dispatchOrdersMap.set(existing.id, existing);
        saveDispatchFile();
        io.emit('dispatch_status_updated', { id: existing.id, status: 'in_transit', order: existing });
      }
    }, 15000);

    setTimeout(() => {
      const existing = dispatchOrdersMap.get(newOrder.id);
      if (existing && existing.status === 'in_transit') {
        existing.status = 'delivered';
        dispatchOrdersMap.set(existing.id, existing);
        saveDispatchFile();
        io.emit('dispatch_status_updated', { id: existing.id, status: 'delivered', order: existing });
      }
    }, 45000);

    res.json({ success: true, order: newOrder });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create dispatch order' });
  }
});

app.patch('/api/dispatch/orders/:id/status', (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;
  const order = dispatchOrdersMap.get(id);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  order.status = status;
  dispatchOrdersMap.set(id, order);
  saveDispatchFile();
  io.emit('dispatch_status_updated', { id, status, order });
  res.json({ success: true, order });
});

// ── REST: LIVE ADMIN TELEMETRY & COMMAND API ────────────────────────────────
app.get('/api/admin/metrics', async (_req: Request, res: Response) => {
  await syncUsersFromSupabase();
  const allOrders = Array.from(dispatchOrdersMap.values());
  const totalVolumeNgn = allOrders.reduce((acc, o: any) => acc + (Number(o.totalFee) || Number(o.estimatedFee) || 0), 0);
  const totalCommissionNgn = allOrders.reduce((acc, o: any) => acc + (Number(o.platformFee) || Math.round((Number(o.estimatedFee) || 0) * 0.05)), 0);
  const activeDeliveriesCount = allOrders.filter((o: any) => o.status !== 'delivered').length;
  const completedDeliveriesCount = allOrders.filter((o: any) => o.status === 'delivered').length;

  const onlineList = Array.from(onlineUsers.values());
  const registeredUsersList = Array.from(usersByPhone.values());

  const activeStatusesCount = Array.from(statusesMap.values()).filter(
    (s: any) => !s.expiresAt || new Date(s.expiresAt).getTime() > Date.now()
  ).length;

  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    serverMemoryMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    onlineUsersCount: onlineUsers.size,
    onlineUsers: onlineList,
    registeredUsersCount: usersByPhone.size,
    registeredUsers: registeredUsersList,
    communitiesCount: communitiesMap.size,
    communities: Array.from(communitiesMap.values()),
    activeStatusesCount,
    dispatch: {
      totalOrdersCount: allOrders.length,
      activeDeliveriesCount,
      completedDeliveriesCount,
      totalVolumeNgn,
      totalCommissionNgn,
      orders: allOrders,
    },
    systemStatus: 'healthy',
    config: systemConfig,
    featureFlags,
    cms: cmsData,
    activeBroadcast,
  });
});

// Admin System Config: GET & POST
app.get('/api/admin/config', (_req: Request, res: Response) => {
  res.json({
    success: true,
    config: systemConfig,
    featureFlags,
    cms: cmsData,
    activeBroadcast,
  });
});

app.post('/api/admin/config', (req: Request, res: Response) => {
  const updates = req.body && typeof req.body === 'object' ? req.body : {};
  systemConfig = { ...systemConfig, ...updates };
  saveAdminConfigFile();
  io.emit('admin_config_updated', systemConfig);
  res.json({ success: true, config: systemConfig });
});

// Admin Feature Toggles: POST
app.post('/api/admin/features', (req: Request, res: Response) => {
  const updates = req.body && typeof req.body === 'object' ? req.body : {};
  featureFlags = { ...featureFlags, ...updates };
  saveAdminConfigFile();
  io.emit('admin_features_updated', featureFlags);
  res.json({ success: true, featureFlags });
});

// Admin CMS Content: POST
app.post('/api/admin/cms', (req: Request, res: Response) => {
  const updates = req.body && typeof req.body === 'object' ? req.body : {};
  cmsData = {
    ...cmsData,
    ...updates,
    marqueeBanner: updates.marqueeBanner
      ? { ...cmsData.marqueeBanner, ...updates.marqueeBanner }
      : cmsData.marqueeBanner,
    sponsorSpotlight: updates.sponsorSpotlight
      ? { ...cmsData.sponsorSpotlight, ...updates.sponsorSpotlight }
      : cmsData.sponsorSpotlight,
  };
  saveAdminCmsFile();
  io.emit('admin_cms_updated', cmsData);
  res.json({ success: true, cms: cmsData });
});

app.patch('/api/admin/users/:phone/badge', async (req: Request, res: Response) => {
  const { phone } = req.params;
  const { verificationBadge, role, status, walletBalanceNgn, phoneNumber, fullName, avatarUrl } = req.body;
  const match = await ensureUserEntry(phone, { phoneNumber, fullName, avatarUrl });
  if (match) {
    const { key, user } = match;
    if (verificationBadge !== undefined) user.verificationBadge = verificationBadge;
    if (role !== undefined) user.role = role;
    if (status !== undefined) user.status = status;
    if (walletBalanceNgn !== undefined) user.walletBalanceNgn = walletBalanceNgn;
    usersByPhone.set(key, user);
    saveUsersFile();
    io.emit('user_updated', user);
    return res.json({ success: true, user });
  }
  res.status(404).json({ error: 'User not found' });
});

app.patch('/api/admin/users/:phone/status', async (req: Request, res: Response) => {
  const { phone } = req.params;
  const { status, verificationBadge, role, walletBalanceNgn, reason, phoneNumber, fullName, avatarUrl } = req.body;
  const match = await ensureUserEntry(phone, { phoneNumber, fullName, avatarUrl });
  if (match) {
    const { key, user } = match;
    const cleanKey = user.cleanPhone || key;
    if (status !== undefined) {
      user.status = status;
      if (status === 'banned') {
        user.bannedAt = new Date().toISOString();
        user.banReason = reason || 'Account permanently banned by platform administrator.';
        user.isOnline = false;
        io.to(`phone:${cleanKey}`).emit('account_banned', {
          banned: true,
          reason: user.banReason,
          bannedAt: user.bannedAt,
        });
        const sockId = phoneToSocketId.get(cleanKey);
        if (sockId) {
          const s = io.sockets.sockets.get(sockId);
          if (s) {
            s.emit('account_banned', { banned: true, reason: user.banReason, bannedAt: user.bannedAt });
            s.disconnect(true);
          }
        }
      } else if (status === 'active') {
        delete user.bannedAt;
        delete user.banReason;
      }
    }
    if (verificationBadge !== undefined) user.verificationBadge = verificationBadge;
    if (role !== undefined) user.role = role;
    if (walletBalanceNgn !== undefined) user.walletBalanceNgn = walletBalanceNgn;
    usersByPhone.set(key, user);
    saveUsersFile();
    io.emit('user_updated', user);
    return res.json({ success: true, user });
  }
  res.status(404).json({ error: 'User not found' });
});

// Admin Permanent Ban Endpoint
app.post('/api/admin/users/:phone/ban', async (req: Request, res: Response) => {
  const { phone } = req.params;
  const { reason, phoneNumber, fullName, avatarUrl } = req.body;
  const match = await ensureUserEntry(phone, { phoneNumber, fullName, avatarUrl });
  if (match) {
    const { key, user } = match;
    const cleanKey = user.cleanPhone || key;
    user.status = 'banned';
    user.bannedAt = new Date().toISOString();
    user.banReason = reason || 'Permanently blocked by administrator for policy violation.';
    user.isOnline = false;
    usersByPhone.set(key, user);
    saveUsersFile();

    // Kick and lock out socket
    io.to(`phone:${cleanKey}`).emit('account_banned', {
      banned: true,
      reason: user.banReason,
      bannedAt: user.bannedAt,
    });
    const sockId = phoneToSocketId.get(cleanKey);
    if (sockId) {
      const s = io.sockets.sockets.get(sockId);
      if (s) {
        s.emit('account_banned', { banned: true, reason: user.banReason, bannedAt: user.bannedAt });
        s.disconnect(true);
      }
    }

    io.emit('user_updated', user);
    console.log(`🚫 [USER BANNED PERMANENTLY]: ${user.fullName} (${user.phoneNumber})`);
    return res.json({ success: true, user });
  }
  res.status(404).json({ error: 'User not found' });
});

// Admin Unban / Restore Endpoint
app.post('/api/admin/users/:phone/unban', async (req: Request, res: Response) => {
  const { phone } = req.params;
  const match = await ensureUserEntry(phone, req.body);
  if (match) {
    const { key, user } = match;
    user.status = 'active';
    delete user.bannedAt;
    delete user.banReason;
    usersByPhone.set(key, user);
    saveUsersFile();
    io.emit('user_updated', user);
    console.log(`✅ [USER UNBANNED]: ${user.fullName} (${user.phoneNumber})`);
    return res.json({ success: true, user });
  }
  res.status(404).json({ error: 'User not found' });
});

// Admin Wallet Direct Adjuster
app.post('/api/admin/users/:phone/adjust-wallet', async (req: Request, res: Response) => {
  const { phone } = req.params;
  const { newBalance, deltaNgn, note, phoneNumber, fullName, avatarUrl } = req.body;
  const match = await ensureUserEntry(phone, { phoneNumber, fullName, avatarUrl });
  if (match) {
    const { key, user } = match;
    const cleanKey = user.cleanPhone || key;
    let balance = user.walletBalanceNgn || 0;
    if (newBalance !== undefined) {
      balance = Math.max(0, Number(newBalance));
    } else if (deltaNgn !== undefined) {
      balance = Math.max(0, balance + Number(deltaNgn));
    }
    user.walletBalanceNgn = balance;
    usersByPhone.set(key, user);
    saveUsersFile();
    io.emit('user_updated', user);
    io.to(`phone:${cleanKey}`).emit('wallet_updated', {
      balance,
      note: note || 'Adjusted by administrator',
    });
    return res.json({ success: true, user, balance });
  }
  res.status(404).json({ error: 'User not found' });
});

// Admin Force Terminate / Kick Session
app.post('/api/admin/users/:phone/kick', (req: Request, res: Response) => {
  const { phone } = req.params;
  const match = findUserEntry(phone);
  const clean = match?.user.cleanPhone || phone.replace(/\D/g, '');
  const sockId = phoneToSocketId.get(clean);
  if (sockId) {
    const s = io.sockets.sockets.get(sockId);
    if (s) {
      s.emit('force_logout', { reason: 'admin_kick', message: 'Your session was terminated by an administrator.' });
      s.disconnect(true);
    }
  }
  return res.json({ success: true, message: 'Session terminated' });
});

app.post('/api/admin/broadcast', (req: Request, res: Response) => {
  const { title, message, level } = req.body;
  if (!title || !message) return res.status(400).json({ error: 'Title and message required' });
  const broadcast = {
    id: `bc_${Date.now()}`,
    title,
    message,
    level: level || 'info',
    createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    active: true,
  };
  activeBroadcast = broadcast;
  saveAdminConfigFile();
  io.emit('system_broadcast', broadcast);
  res.json({ success: true, broadcast });
});

app.delete('/api/admin/broadcast', (_req: Request, res: Response) => {
  activeBroadcast = null;
  saveAdminConfigFile();
  io.emit('system_broadcast_cleared');
  res.json({ success: true });
});

// Create raw HTTP server to handle both Express REST and WebSocket upgrades
const httpServer = createServer(app);

// Initialize Socket.io instance with permissive cross-origin policies
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 30000,
  pingInterval: 15000,
});

// Connected users mapping: socket.id -> userId
const onlineUsers = new Map<string, { userId: string; userName: string; avatar?: string }>();

// Real-Time Socket Connection Handlers
io.on('connection', (socket: Socket) => {
  console.log(`⚡ [Socket Connected]: ${socket.id}`);

  // Immediately push authoritative live admin config, feature flags, CMS, broadcast, and user directory
  socket.emit('admin_config_updated', systemConfig);
  socket.emit('admin_features_updated', featureFlags);
  socket.emit('admin_cms_updated', cmsData);
  socket.emit('admin_users_snapshot', Array.from(usersByPhone.values()));
  if (activeBroadcast) {
    socket.emit('system_broadcast', activeBroadcast);
  }
  syncUsersFromSupabase().then(() => {
    socket.emit('admin_users_snapshot', Array.from(usersByPhone.values()));
  }).catch(() => {});

  // User presence registration
  socket.on('user_online', (userData: { userId: string; userName: string; avatar?: string; phoneNumber?: string; role?: string; deviceInfo?: string }) => {
    onlineUsers.set(socket.id, {
      userId: userData.userId,
      userName: userData.userName,
      avatar: userData.avatar,
    });
    if (userData?.phoneNumber) {
      const clean = userData.phoneNumber.replace(/\D/g, '');
      const existingMatch = findUserEntry(userData.phoneNumber) || findUserEntry(clean);
      const storeKey = existingMatch?.key || clean;
      (socket as any)._userCleanPhone = storeKey;
      phoneToSocketId.set(clean, socket.id);
      if (storeKey !== clean) phoneToSocketId.set(storeKey, socket.id);
      socket.join(`phone:${clean}`);
      if (storeKey !== clean) socket.join(`phone:${storeKey}`);

      const existing = existingMatch?.user || usersByPhone.get(clean);
      if (existing) {
        if (existing.status === 'banned') {
          console.warn(`🚫 [BANNED USER ATTEMPT]: ${existing.fullName} (${clean}) rejected.`);
          socket.emit('account_banned', {
            banned: true,
            reason: existing.banReason || 'Your account is permanently banned.',
            bannedAt: existing.bannedAt || new Date().toISOString(),
          });
          socket.disconnect(true);
          return;
        }
        existing.isOnline = true;
        existing.lastSeen = 'online';
        if (userData.userName && (!existing.fullName || existing.fullName === 'AGC User' || existing.fullName === 'User')) {
          existing.fullName = userData.userName;
        }
        if (userData.avatar) existing.avatarUrl = userData.avatar;
        if (!existing.role && userData.role) existing.role = userData.role;
        if (userData.deviceInfo) existing.deviceInfo = userData.deviceInfo;
        usersByPhone.set(storeKey, existing);
        saveUsersFile();
        io.emit('user_updated', existing);
      } else {
        const createdUser: RegisteredUser = {
          id: userData.userId || `usr_${Date.now()}`,
          fullName: userData.userName || 'AGC User',
          phoneNumber: userData.phoneNumber,
          cleanPhone: clean,
          avatarUrl: userData.avatar,
          registeredAt: new Date().toISOString(),
          role: userData.role || 'user',
          status: 'active',
          verificationBadge: null,
          walletBalanceNgn: 50000,
          isOnline: true,
          lastSeen: 'online',
          deviceInfo: userData.deviceInfo,
        };
        usersByPhone.set(storeKey, createdUser);
        saveUsersFile();
        io.emit('user_registered', createdUser);
      }
    }
    io.emit('presence_update', Array.from(onlineUsers.values()));
  });

  // User registration event
  socket.on('register_user', (userData: any) => {
    if (!userData?.phoneNumber) return;
    const clean = userData.phoneNumber.replace(/\D/g, '');
    const existingMatch = findUserEntry(userData.phoneNumber) || findUserEntry(clean);
    const storeKey = existingMatch?.key || clean;
    const existing = existingMatch?.user;
    const reg: RegisteredUser = {
      ...(existing || {}),
      id: existing?.id || userData.id || `usr_${Date.now()}`,
      fullName: userData.fullName || userData.name || existing?.fullName || 'AGC User',
      phoneNumber: existing?.phoneNumber || userData.phoneNumber,
      cleanPhone: existing?.cleanPhone || clean,
      avatarUrl: userData.avatarUrl || userData.avatar || existing?.avatarUrl,
      about: userData.about || existing?.about || 'Available · Using AGC',
      registeredAt: existing?.registeredAt || new Date().toISOString(),
      role: existing?.role || userData.role || 'user',
      status: existing?.status || 'active',
      verificationBadge: existing?.verificationBadge ?? null,
      walletBalanceNgn: existing?.walletBalanceNgn ?? 50000,
      isOnline: true,
      lastSeen: 'online',
    };
    usersByPhone.set(storeKey, reg);
    saveUsersFile();
    socket.join(`phone:${clean}`);
    io.emit(existing ? 'user_updated' : 'user_registered', reg);
  });

  // Town Communities Broadcast
  socket.on('create_community', (comm: any) => {
    if (comm && comm.id) {
      communitiesMap.set(comm.id, comm);
      saveCommunitiesFile();
      io.emit('community_created', comm);
    }
  });

  // 1. Join Chat Conversation Room (1-on-1 or Group)
  socket.on('join_chat', (chatId: string) => {
    socket.join(`chat:${chatId}`);
    console.log(`👤 Socket ${socket.id} joined room chat:${chatId}`);
  });

  // Leave Chat Room
  socket.on('leave_chat', (chatId: string) => {
    socket.leave(`chat:${chatId}`);
  });

  // 1c. Live Group Creation Relay
  socket.on('create_group', (payload: { chat: any; memberPhones: string[] }) => {
    const { chat, memberPhones } = payload;
    if (chat && Array.isArray(memberPhones)) {
      memberPhones.forEach((phone: string) => {
        const variants = getPhoneVariants(phone);
        variants.forEach((v) => {
          socket.to(`phone:${v}`).emit('group_created', { chat });
        });
      });
    }
  });

  // 2. Live Chat Message Broadcast
  socket.on('send_message', (payload: { chatId: string; message: any; targetPhone?: string; memberPhones?: string[]; chat?: any }) => {
    const { chatId, message, targetPhone, memberPhones, chat } = payload;

    // Derive target phone if not explicitly provided
    let finalTarget = targetPhone ? targetPhone.replace(/\D/g, '') : '';
    if (!finalTarget && chatId.startsWith('dm_')) {
      const senderPhone = (socket as any)._agcPhone || (message?.senderPhone || '').replace(/\D/g, '');
      const parts = chatId.replace('dm_', '').split('_');
      finalTarget = parts.find((p: string) => p !== senderPhone) || '';
    }

    // Broadcast to everyone else in this chat room
    socket.to(`chat:${chatId}`).emit('new_message', { chatId, message, targetPhone: finalTarget, chat, isGroup: Boolean(chatId.startsWith('group_')) });

    // Also broadcast to target user's phone channel so incoming messages update their chat list
    if (finalTarget) {
      const targetVariants = getPhoneVariants(finalTarget);
      targetVariants.forEach((v) => {
        socket.to(`phone:${v}`).emit('new_message', { chatId, message, targetPhone: finalTarget, chat });
      });
    }

    // If it is a group with member phones, broadcast to all members' personal phone channels
    if (Array.isArray(memberPhones) && memberPhones.length > 0) {
      const senderPhone = (socket as any)._agcPhone || (message?.senderPhone || '').replace(/\D/g, '');
      memberPhones.forEach((phone: string) => {
        const variants = getPhoneVariants(phone);
        variants.forEach((v) => {
          if (v !== senderPhone) {
            socket.to(`phone:${v}`).emit('new_message', { chatId, message, isGroup: true, chat });
          }
        });
      });
    }

    // If it's a town community, broadcast to everyone
    if (chatId.startsWith('town_comm_')) {
      socket.broadcast.emit('new_message', { chatId, message, chat });
    }
  });

  // 2b. Live 24h Status (Stories) Handlers
  socket.on('post_status', (payload: any) => {
    const status = payload?.status || payload;
    if (status?.id) {
      statusesMap.set(status.id, status);
      saveStatusesFile();
      socket.broadcast.emit('new_status', { status });
    }
  });

  socket.on('view_status', (payload: { statusId: string; viewer: any }) => {
    if (payload?.statusId) {
      const s = statusesMap.get(payload.statusId);
      if (s) {
        s.viewsCount = (s.viewsCount || 0) + 1;
        s.viewers = s.viewers || [];
        if (payload.viewer && !s.viewers.some((v: any) => v.id === payload.viewer.id)) {
          s.viewers.push(payload.viewer);
        }
        statusesMap.set(payload.statusId, s);
        saveStatusesFile();
      }
      io.emit('status_viewed', payload);
    }
  });

  socket.on('like_status', (payload: { statusId: string; liked: boolean; likerId: string; likerName?: string }) => {
    if (payload?.statusId) {
      const s = statusesMap.get(payload.statusId);
      if (s) {
        s.likesCount = payload.liked ? (s.likesCount || 0) + 1 : Math.max(0, (s.likesCount || 0) - 1);
        statusesMap.set(payload.statusId, s);
        saveStatusesFile();
      }
      io.emit('status_liked', payload);
    }
  });

  // 3. Typing Indicator
  socket.on('typing', (payload: { chatId: string; userName: string; isTyping: boolean }) => {
    const { chatId, userName, isTyping } = payload;
    socket.to(`chat:${chatId}`).emit('user_typing', { chatId, userName, isTyping });
  });

  // 4. Live Audio Spaces / Street Radio
  socket.on('join_space', (payload: { spaceId: string; user: { id: string; name: string; avatar?: string } }) => {
    const { spaceId, user } = payload;
    socket.join(`space:${spaceId}`);
    console.log(`📻 User ${user.name} joined space:${spaceId}`);
    io.to(`space:${spaceId}`).emit('space_user_joined', { spaceId, user, socketId: socket.id });
  });

  socket.on('leave_space', (payload: { spaceId: string; userId: string }) => {
    const { spaceId, userId } = payload;
    socket.leave(`space:${spaceId}`);
    io.to(`space:${spaceId}`).emit('space_user_left', { spaceId, userId, socketId: socket.id });
  });

  socket.on('space_speaking', (payload: { spaceId: string; userId: string; isSpeaking: boolean }) => {
    const { spaceId, userId, isSpeaking } = payload;
    socket.to(`space:${spaceId}`).emit('space_speaker_active', { userId, isSpeaking });
  });

  // 5. Direct Phone Calling Relay
  socket.on('phone_call_signal', (payload: { targetPhone: string; data: any; event?: string }) => {
    const cleanTarget = payload.targetPhone.replace(/\D/g, '');
    const eventName = payload.event || 'incoming_call';
    io.to(`phone:${cleanTarget}`).emit(eventName, payload.data);
  });

  socket.on('register_phone', (payload: string | { phone: string; sessionToken?: string }) => {
    const rawPhone = typeof payload === 'string' ? payload : payload.phone;
    const clean = (rawPhone || '').replace(/\D/g, '');
    if (!clean) return;

    const variants = getPhoneVariants(clean);
    variants.forEach((v) => {
      socket.join(`phone:${v}`);
    });
    (socket as any)._agcPhone = clean;
    console.log(`📱 [Phone Registered]: ${clean} (joined ${variants.length} variant rooms) → socket ${socket.id}`);
  });

  // 6. WebRTC Call Room Signaling Relay
  socket.on('join_call_room', (roomId: string) => {
    socket.join(`call:${roomId}`);
  });

  socket.on('call_signal', (payload: { roomId: string; event: string; data: any }) => {
    socket.to(`call:${payload.roomId}`).emit('call_signal', payload);
  });

  // 7. Live Courier Dispatch Handlers
  socket.on('dispatch_order_create', (payload: any) => {
    if (payload?.id) {
      dispatchOrdersMap.set(payload.id, payload);
      saveDispatchFile();
      socket.broadcast.emit('dispatch_order_created', payload);
    }
  });

  socket.on('dispatch_status_update', (payload: { id: string; status: string }) => {
    if (payload?.id && dispatchOrdersMap.has(payload.id)) {
      const ord = dispatchOrdersMap.get(payload.id);
      ord.status = payload.status;
      dispatchOrdersMap.set(payload.id, ord);
      saveDispatchFile();
      io.emit('dispatch_status_updated', { id: ord.id, status: ord.status, order: ord });
    }
  });

  // Disconnect handler
  socket.on('disconnect', () => {
    onlineUsers.delete(socket.id);
    io.emit('presence_update', Array.from(onlineUsers.values()));

    const clean = (socket as any)._userCleanPhone || (socket as any)._agcPhone;
    if (clean && usersByPhone.has(clean)) {
      const u = usersByPhone.get(clean);
      if (u) {
        u.isOnline = false;
        u.lastSeen = new Date().toISOString();
        usersByPhone.set(clean, u);
        saveUsersFile();
        io.emit('user_updated', u);
      }
    }

    // Clean up phone→socket mapping if this socket was the active one
    const agcPhone = (socket as any)._agcPhone;
    if (agcPhone && phoneToSocketId.get(agcPhone) === socket.id) {
      phoneToSocketId.delete(agcPhone);
    }
    console.log(`🔌 [Socket Disconnected]: ${socket.id}`);
  });
});

// Start listening with Vite middleware in dev or static dist in production
async function startServer() {
  await syncUsersFromSupabase(true);
  setInterval(() => {
    syncUsersFromSupabase().catch(() => {});
  }, 30000);

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 AGC Live Gateway running on http://0.0.0.0:${PORT}`);
    console.log(`📡 WebSocket & User Registry ready (${usersByPhone.size} users loaded)`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

export { app, httpServer, io };
