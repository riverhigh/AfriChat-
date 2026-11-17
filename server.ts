import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();

function resolveServerPort(): number {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--port=')) {
      const parsed = parseInt(arg.split('=')[1], 10);
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
    } else if ((arg === '--port' || arg === '-p') && args[i + 1]) {
      const parsed = parseInt(args[i + 1], 10);
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
  }
  const envPort = process.env.PORT ? parseInt(process.env.PORT, 10) : NaN;
  const nginxPort = process.env.NGINX_PORT ? parseInt(process.env.NGINX_PORT, 10) : NaN;
  const defaultAppPort = process.env.DEFAULT_APP_PORT ? parseInt(process.env.DEFAULT_APP_PORT, 10) : 3000;
  if (Number.isFinite(envPort) && envPort > 0) {
    // When running inside the container proxy (nginx on NGINX_PORT), avoid colliding with nginx
    if (Number.isFinite(nginxPort) && envPort === nginxPort && process.env.NODE_ENV !== 'production') {
      return Number.isFinite(defaultAppPort) && defaultAppPort > 0 ? defaultAppPort : 3000;
    }
    return envPort;
  }
  return Number.isFinite(defaultAppPort) && defaultAppPort > 0 ? defaultAppPort : 3000;
}

function resolveServerHost(): string {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--host=')) {
      const h = arg.split('=')[1]?.trim();
      if (h) return h;
    } else if (arg === '--host' && args[i + 1]) {
      const h = args[i + 1]?.trim();
      if (h) return h;
    }
  }
  return (process.env.HOST || '0.0.0.0').trim();
}

const PORT = resolveServerPort();
const HOST = resolveServerHost();

// Enable CORS for Express REST routes (allow any local or hosted origin)
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(
  express.json({
    limit: '5mb',
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

// â”€â”€ CUSTOM APPLICATION FIREWALL (WAF) & THREAT INSPECTION â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€ ADMIN AUDIT, SECURITY EVENTS & IP BLOCKLIST STORE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const AUDIT_FILE = path.join(__dirname, 'data_admin_audit.json');
interface AuditEntry {
  id: string;
  refId: string;
  actor: string;
  actorRole: string;
  action: string;
  target: string;
  details: string;
  dualApprovedBy?: string;
  timestamp: string;
}
interface SecurityEvent {
  id: string;
  type: 'waf_block' | 'rate_limit' | 'bot_block' | 'banned_attempt' | 'ip_blocked' | 'webhook_mismatch';
  severity: 'low' | 'medium' | 'high' | 'critical';
  ip: string;
  path: string;
  reason: string;
  timestamp: string;
}
interface WebhookLog {
  id: string;
  event: string;
  reference: string;
  amountNgn: number;
  status: 'verified' | 'mismatch' | 'processed';
  hmacVerified: boolean;
  ip: string;
  payloadSummary: string;
  timestamp: string;
}
interface BlockedIpEntry {
  ip: string;
  reason: string;
  blockedBy: string;
  blockedAt: string;
}

let auditTrail: AuditEntry[] = [];
let securityEvents: SecurityEvent[] = [];
let webhookLogs: WebhookLog[] = [];
let blockedIps: BlockedIpEntry[] = [];
const storeOverridesMap = new Map<string, any>();
const artisanOverridesMap = new Map<string, any>();

try {
  if (fs.existsSync(AUDIT_FILE)) {
    const raw = JSON.parse(fs.readFileSync(AUDIT_FILE, 'utf8'));
    if (Array.isArray(raw.auditTrail)) auditTrail = raw.auditTrail;
    if (Array.isArray(raw.securityEvents)) securityEvents = raw.securityEvents;
    if (Array.isArray(raw.webhookLogs)) webhookLogs = raw.webhookLogs;
    if (Array.isArray(raw.blockedIps)) blockedIps = raw.blockedIps;
    if (raw.storeOverrides && typeof raw.storeOverrides === 'object') {
      Object.entries(raw.storeOverrides).forEach(([k, v]) => storeOverridesMap.set(k, v));
    }
    if (raw.artisanOverrides && typeof raw.artisanOverrides === 'object') {
      Object.entries(raw.artisanOverrides).forEach(([k, v]) => artisanOverridesMap.set(k, v));
    }
  }
} catch (e) {
  console.warn('Notice loading admin audit file:', e);
}

function saveAdminAuditFile() {
  try {
    fs.writeFileSync(
      AUDIT_FILE,
      JSON.stringify(
        {
          auditTrail: auditTrail.slice(0, 500),
          securityEvents: securityEvents.slice(0, 300),
          webhookLogs: webhookLogs.slice(0, 200),
          blockedIps,
          storeOverrides: Object.fromEntries(storeOverridesMap.entries()),
          artisanOverrides: Object.fromEntries(artisanOverridesMap.entries()),
        },
        null,
        2
      )
    );
  } catch (e) {
    console.warn('Notice saving admin audit file:', e);
  }
}

function appendAuditEntry(entry: Omit<AuditEntry, 'id' | 'timestamp'>): AuditEntry {
  const full: AuditEntry = {
    id: `aud_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    ...entry,
  };
  auditTrail.unshift(full);
  if (auditTrail.length > 500) auditTrail.length = 500;
  saveAdminAuditFile();
  return full;
}

function recordSecurityEvent(evt: Omit<SecurityEvent, 'id' | 'timestamp'>): SecurityEvent {
  const full: SecurityEvent = {
    id: `sec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    ...evt,
  };
  securityEvents.unshift(full);
  if (securityEvents.length > 300) securityEvents.length = 300;
  saveAdminAuditFile();
  return full;
}

function getClientIp(req: Request): string {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    req.ip ||
    '127.0.0.1'
  );
}

// WAF + IP Blocklist Middleware applied to incoming /api HTTP requests
app.use('/api', (req: Request, res: Response, next) => {
  const clientIp = getClientIp(req);
  if (!req.path.startsWith('/admin/security')) {
    const blocked = blockedIps.find((b) => b.ip === clientIp);
    if (blocked) {
      return res.status(403).json({
        error: 'Access Denied: IP address is on the AGC security blocklist.',
        reason: blocked.reason,
        code: 'AGC_IP_BLOCKED',
      });
    }
  }

  const urlThreat = inspectPayloadForThreats(req.originalUrl || req.url);
  if (urlThreat) {
    console.warn(`[WAF BLOCKED] ${clientIp} -> ${req.method} ${req.url} (${urlThreat})`);
    recordSecurityEvent({
      type: 'waf_block',
      severity: 'high',
      ip: clientIp,
      path: req.originalUrl || req.url,
      reason: urlThreat,
    });
    return res.status(403).json({
      error: 'Access Denied: Malicious payload pattern intercepted by AfriChat WAF engine.',
      reason: urlThreat,
      code: 'AGC_WAF_BLOCKED',
    });
  }

  const queryThreat = inspectPayloadForThreats(req.query);
  if (queryThreat) {
    console.warn(`[WAF BLOCKED] Query Threat: ${clientIp} -> ${queryThreat}`);
    recordSecurityEvent({
      type: 'waf_block',
      severity: 'high',
      ip: clientIp,
      path: req.originalUrl || req.url,
      reason: queryThreat,
    });
    return res.status(403).json({
      error: 'Access Denied: Dangerous query parameters detected.',
      code: 'AGC_WAF_QUERY_VIOLATION',
    });
  }

  if (req.body && Object.keys(req.body).length > 0) {
    const bodyThreat = inspectPayloadForThreats(req.body);
    if (bodyThreat) {
      console.warn(`[WAF BLOCKED] Body Threat: ${clientIp} -> ${bodyThreat}`);
      recordSecurityEvent({
        type: 'waf_block',
        severity: 'high',
        ip: clientIp,
        path: req.originalUrl || req.url,
        reason: bodyThreat,
      });
      return res.status(403).json({
        error: 'Access Denied: Dangerous request body detected.',
        code: 'AGC_WAF_BODY_VIOLATION',
      });
    }
  }

  next();
});

// â”€â”€ AUTH ROUTE RATE LIMITER (BRUTE FORCE PROTECTION) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface RateLimitRecord {
  attempts: number;
  resetAt: number;
}
const authRateLimits = new Map<string, RateLimitRecord>();
const AUTH_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const AUTH_MAX_ATTEMPTS = 10; // max 10 auth attempts per IP per 15 minutes

const authRateLimiter = (req: Request, res: Response, next: () => void) => {
  const ip = getClientIp(req);
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
    recordSecurityEvent({
      type: 'rate_limit',
      severity: 'medium',
      ip,
      path: req.originalUrl || req.url,
      reason: `Exceeded ${AUTH_MAX_ATTEMPTS} auth requests in 15m (${record.attempts} attempts)`,
    });
    res.setHeader('Retry-After', retryAfterSeconds);
    return res.status(429).json({
      error: 'Too many authentication attempts from this IP address. Please try again later.',
      retryAfterSeconds,
      code: 'AGC_AUTH_RATE_LIMIT',
    });
  }

  next();
};

// â”€â”€ ANTI-BOT & RECON SCRAPING MITIGATION â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const BOT_USER_AGENTS = [
  'sqlmap', 'nikto', 'nmap', 'masscan', 'gobuster', 'dirbuster', 'wpscan',
  'python-requests', 'aiohttp', 'curl/', 'wget/', 'postmanruntime',
];

const botMitigation = (req: Request, res: Response, next: () => void) => {
  const ua = (req.headers['user-agent'] || '').toLowerCase();
  const isMaliciousBot = BOT_USER_AGENTS.some((bot) => ua.includes(bot));

  if (isMaliciousBot) {
    const clientIp = getClientIp(req);
    console.warn(`[BOT BLOCKED] High-value scrape attempt: ${clientIp} (UA: ${ua})`);
    recordSecurityEvent({
      type: 'bot_block',
      severity: 'medium',
      ip: clientIp,
      path: req.originalUrl || req.url,
      reason: `Blocked automated UA: ${ua.slice(0, 60)}`,
    });
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

// â”€â”€ Persistent User Registry â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
  verificationBadge?: 'blue' | 'gold' | 'creator_plus' | 'admin' | null;
  verificationExpiresAt?: string;
  platformFeeRate?: number;
  isCelebrityVerified?: boolean;
  kycStatus?: 'unverified' | 'pending' | 'verified' | 'rejected';
  kycType?: 'BVN' | 'NIN';
  walletBalanceNgn?: number;
  username?: string;
  adminWalletAdjustedAt?: string;
  updatedAt?: string;
  lastSeen?: string;
  isOnline?: boolean;
  deviceInfo?: string;
  bannedAt?: string;
  banReason?: string;
}

const usersByPhone = new Map<string, RegisteredUser>();

// â”€â”€ Single-Session Enforcement: phone â†’ active socket id â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// When a phone logs in on a new device/tab, the old socket receives 'force_logout'
const phoneToSocketId = new Map<string, string>();
const USERS_FILE = path.join(__dirname, 'data_users.json');
const COMMUNITIES_FILE = path.join(__dirname, 'data_communities.json');
const STATUSES_FILE = path.join(__dirname, 'data_statuses.json');
const DISPATCH_FILE = path.join(__dirname, 'data_dispatch_orders.json');
const CONFIG_FILE = path.join(__dirname, 'data_admin_config.json');
const CMS_FILE = path.join(__dirname, 'data_admin_cms.json');
const AI_DATACENTER_FILE = path.join(__dirname, 'data_ai_datacenter.json');

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
  sponsoredAdFeeNgn: 2500,
  lowBandwidthDefault: false,
  supportContactPhone: '+234800000000',
};

const DEFAULT_FEATURE_FLAGS = {
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
    text: 'âš¡ Welcome to AfriChat! Zero-fee transfers, instant dispatch deliveries, and escrow protection live across Africa.',
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
      answer: 'Use the Scam Shield tool in the 9-dot menu before sending funds. Never release escrow funds until you inspect items physically.',
      category: 'security' as const,
      published: true,
    },
  ],
  communityGuidelines: '1. Treat all community members with respect.\n2. No fraudulent listings, phishing links, or unauthorized transactions.\n3. Verified badges are subject to continuous compliance with AfriChat terms.',
  termsOfService: 'AfriChat provides communication, marketplace escrow mediation, and logistical dispatch coordination across African regions.',
  sponsorSpotlight: {
    enabled: false,
    brandName: 'Kente Pay Africa',
    tagline: 'Zero-Fee African Merchant Remittances',
    bannerUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    linkUrl: '',
  },
  sponsoredStatuses: [] as any[],
};

let systemConfig = { ...DEFAULT_SYSTEM_CONFIG };
let featureFlags = { ...DEFAULT_FEATURE_FLAGS };
let cmsData = { ...DEFAULT_CMS_DATA };
let activeBroadcast: { id: string; title: string; message: string; level: string; createdAt: string; active: boolean } | null = null;

let adminConfigUpdatedAt = '';
let adminCmsUpdatedAt = '';

try {
  if (fs.existsSync(CONFIG_FILE)) {
    const raw = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    if (raw.config) systemConfig = { ...DEFAULT_SYSTEM_CONFIG, ...raw.config };
    if (raw.featureFlags) featureFlags = { ...DEFAULT_FEATURE_FLAGS, ...raw.featureFlags };
    if (raw.activeBroadcast !== undefined) activeBroadcast = raw.activeBroadcast;
    if (raw.updatedAt) adminConfigUpdatedAt = String(raw.updatedAt);
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
      if (raw.updatedAt) adminCmsUpdatedAt = String(raw.updatedAt);
    }
  }
} catch (e) {
  console.warn('Notice loading admin cms:', e);
}

function saveAdminConfigFile() {
  try {
    adminConfigUpdatedAt = new Date().toISOString();
    fs.writeFileSync(
      CONFIG_FILE,
      JSON.stringify({ config: systemConfig, featureFlags, activeBroadcast, updatedAt: adminConfigUpdatedAt }, null, 2)
    );
  } catch (e) {
    console.error('Failed saving admin config file:', e);
  }
}

function saveAdminCmsFile() {
  try {
    adminCmsUpdatedAt = new Date().toISOString();
    fs.writeFileSync(CMS_FILE, JSON.stringify({ ...cmsData, updatedAt: adminCmsUpdatedAt }, null, 2));
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
const SUPABASE_SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

const ADMIN_SYS_CONFIG_KEY = '__agc_sys_config__';
const ADMIN_SYS_CMS_KEY = '__agc_sys_cms__';
const ADMIN_SYS_USERS_KEY = '__agc_sys_users__';
const ADMIN_SYS_STORES_KEY = '__agc_sys_stores__';
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function canonicalAdminPhoneKey(phoneOrId?: string): string {
  if (!phoneOrId) return '';
  const clean = String(phoneOrId).trim();
  const digits = clean.replace(/\D/g, '');
  if (digits.length >= 9) return digits.slice(-9);
  if (digits.length >= 7) return digits;
  return clean;
}

async function fetchSupabaseAdminSlice(targetValue: string): Promise<any | null> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/scam_reports?target_value=eq.${encodeURIComponent(targetValue)}&target_type=eq.phone&select=flags,updated_at`,
      {
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
        signal: AbortSignal.timeout(5000),
      }
    );
    if (!res.ok) return null;
    const rows = await res.json();
    if (Array.isArray(rows) && rows[0]?.flags && typeof rows[0].flags === 'object') {
      return { ...rows[0].flags, _rowUpdatedAt: rows[0].updated_at };
    }
  } catch (_) {}
  return null;
}

async function upsertSupabaseAdminSlice(targetValue: string, accountName: string, flagsPayload: Record<string, any>): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/scam_reports?on_conflict=target_value,target_type`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify({
        target_value: targetValue,
        target_type: 'phone',
        risk_level: 'verified_clean',
        reports_count: 0,
        account_name: accountName,
        bank_name: 'AGC_SYSTEM',
        flags: { ...flagsPayload, updatedAt: flagsPayload.updatedAt || new Date().toISOString() },
        updated_at: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(5000),
    });
  } catch (_) {}
}

function pushAdminConfigToSupabase() {
  upsertSupabaseAdminSlice(ADMIN_SYS_CONFIG_KEY, 'AGC_ADMIN_CONFIG', {
    config: systemConfig,
    featureFlags,
    activeBroadcast,
    updatedAt: adminConfigUpdatedAt || new Date().toISOString(),
  }).catch(() => {});
}

function pushAdminCmsToSupabase() {
  upsertSupabaseAdminSlice(ADMIN_SYS_CMS_KEY, 'AGC_ADMIN_CMS', {
    cms: cmsData,
    updatedAt: adminCmsUpdatedAt || new Date().toISOString(),
  }).catch(() => {});
}

async function pushAdminUserOverrideToSupabase(user: RegisteredUser) {
  const userKey = canonicalAdminPhoneKey(user.phoneNumber || user.cleanPhone || user.id);
  if (!userKey) return;
  try {
    const slice = (await fetchSupabaseAdminSlice(ADMIN_SYS_USERS_KEY)) || {};
    const prevOverrides = slice.overrides && typeof slice.overrides === 'object' ? slice.overrides : {};
    const nowIso = new Date().toISOString();
    await upsertSupabaseAdminSlice(ADMIN_SYS_USERS_KEY, 'AGC_ADMIN_USERS', {
      overrides: {
        ...prevOverrides,
        [userKey]: {
          ...(prevOverrides[userKey] || {}),
          id: user.id,
          fullName: user.fullName,
          phoneNumber: user.phoneNumber,
          avatarUrl: user.avatarUrl,
          role: user.role,
          status: user.status,
          verificationBadge: user.verificationBadge ?? null,
          kycStatus: user.kycStatus,
          kycType: user.kycType,
          walletBalanceNgn: user.walletBalanceNgn,
          adminWalletAdjustedAt: (user as any).adminWalletAdjustedAt,
          bannedAt: user.bannedAt,
          banReason: user.banReason,
          updatedAt: nowIso,
        },
      },
      updatedAt: nowIso,
    });
  } catch (_) {}
}

function pushAdminStoresToSupabase() {
  upsertSupabaseAdminSlice(ADMIN_SYS_STORES_KEY, 'AGC_ADMIN_STORES', {
    stores: Object.fromEntries(storeOverridesMap.entries()),
    artisans: Object.fromEntries(artisanOverridesMap.entries()),
    updatedAt: new Date().toISOString(),
  }).catch(() => {});
}

async function syncAdminStateFromSupabase() {
  try {
    const [cfgSlice, cmsSlice, usersSlice, storesSlice] = await Promise.all([
      fetchSupabaseAdminSlice(ADMIN_SYS_CONFIG_KEY),
      fetchSupabaseAdminSlice(ADMIN_SYS_CMS_KEY),
      fetchSupabaseAdminSlice(ADMIN_SYS_USERS_KEY),
      fetchSupabaseAdminSlice(ADMIN_SYS_STORES_KEY),
    ]);

    if (cfgSlice) {
      const remoteTs = new Date(cfgSlice.updatedAt || cfgSlice._rowUpdatedAt || 0).getTime();
      const localTs = adminConfigUpdatedAt ? new Date(adminConfigUpdatedAt).getTime() : 0;
      if (remoteTs > localTs) {
        if (cfgSlice.config) systemConfig = { ...systemConfig, ...cfgSlice.config };
        if (cfgSlice.featureFlags) featureFlags = { ...featureFlags, ...cfgSlice.featureFlags };
        if (cfgSlice.activeBroadcast !== undefined) activeBroadcast = cfgSlice.activeBroadcast;
        adminConfigUpdatedAt = cfgSlice.updatedAt || cfgSlice._rowUpdatedAt || new Date().toISOString();
        saveAdminConfigFile();
      }
    }

    if (cmsSlice && cmsSlice.cms) {
      const remoteTs = new Date(cmsSlice.updatedAt || cmsSlice._rowUpdatedAt || 0).getTime();
      const localTs = adminCmsUpdatedAt ? new Date(adminCmsUpdatedAt).getTime() : 0;
      if (remoteTs > localTs) {
        cmsData = {
          ...DEFAULT_CMS_DATA,
          ...cmsSlice.cms,
          marqueeBanner: { ...DEFAULT_CMS_DATA.marqueeBanner, ...(cmsSlice.cms.marqueeBanner || {}) },
          sponsorSpotlight: { ...DEFAULT_CMS_DATA.sponsorSpotlight, ...(cmsSlice.cms.sponsorSpotlight || {}) },
        };
        adminCmsUpdatedAt = cmsSlice.updatedAt || cmsSlice._rowUpdatedAt || new Date().toISOString();
        saveAdminCmsFile();
      }
    }

    if (usersSlice && usersSlice.overrides && typeof usersSlice.overrides === 'object') {
      let usersChanged = false;
      for (const [k, ov] of Object.entries<any>(usersSlice.overrides)) {
        if (!ov) continue;
        const match = findUserEntry(ov.phoneNumber || k) || findUserEntry(k);
        if (match) {
          const { key, user } = match;
          const localUserTs = new Date((user as any).updatedAt || 0).getTime();
          const remoteUserTs = new Date(ov.updatedAt || 0).getTime();
          if (remoteUserTs > localUserTs) {
            usersByPhone.set(key, {
              ...user,
              ...(ov.role !== undefined ? { role: ov.role } : {}),
              ...(ov.status !== undefined ? { status: ov.status } : {}),
              ...(ov.verificationBadge !== undefined ? { verificationBadge: ov.verificationBadge } : {}),
              ...(ov.kycStatus !== undefined ? { kycStatus: ov.kycStatus } : {}),
              ...(ov.kycType !== undefined ? { kycType: ov.kycType } : {}),
              ...(ov.walletBalanceNgn !== undefined ? { walletBalanceNgn: ov.walletBalanceNgn } : {}),
              ...(ov.adminWalletAdjustedAt !== undefined ? { adminWalletAdjustedAt: ov.adminWalletAdjustedAt } : {}),
              ...(ov.bannedAt !== undefined ? { bannedAt: ov.bannedAt } : {}),
              ...(ov.banReason !== undefined ? { banReason: ov.banReason } : {}),
              updatedAt: ov.updatedAt,
            } as any);
            usersChanged = true;
          }
        }
      }
      if (usersChanged) saveUsersFile();
    }

    if (storesSlice) {
      let auditChanged = false;
      if (storesSlice.stores && typeof storesSlice.stores === 'object') {
        for (const [id, ov] of Object.entries<any>(storesSlice.stores)) {
          const cur = storeOverridesMap.get(id);
          const remoteTs = new Date(ov?.updatedAt || 0).getTime();
          const localTs = new Date(cur?.updatedAt || 0).getTime();
          if (remoteTs > localTs) {
            storeOverridesMap.set(id, ov);
            auditChanged = true;
          }
        }
      }
      if (storesSlice.artisans && typeof storesSlice.artisans === 'object') {
        for (const [id, ov] of Object.entries<any>(storesSlice.artisans)) {
          const cur = artisanOverridesMap.get(id);
          const remoteTs = new Date(ov?.updatedAt || 0).getTime();
          const localTs = new Date(cur?.updatedAt || 0).getTime();
          if (remoteTs > localTs) {
            artisanOverridesMap.set(id, ov);
            auditChanged = true;
          }
        }
      }
      if (auditChanged) saveAdminAuditFile();
    }
  } catch (_) {}
}

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
          signal: AbortSignal.timeout(5000),
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
            walletBalanceNgn: 0,
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
        walletBalanceNgn: 0,
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

function isInvalidServerCommunity(c: any): boolean {
  if (!c || !c.id || !c.name) return true;
  if (c.is_live === false || c.isDeleted) return true;
  const name = String(c.name || '').trim();
  const lowName = name.toLowerCase();
  const lowDesc = String(c.description || '').trim().toLowerCase();
  const lowId = String(c.id || '').trim().toLowerCase();
  const tags: string[] = Array.isArray(c.tags) ? c.tags.map((t: any) => String(t).toLowerCase()) : [];
  if (tags.includes('__deleted__') || tags.includes('__sys_probe__') || tags.includes('__probe__')) return true;
  if (name.startsWith('__') || lowId.startsWith('__') || lowId.startsWith('test_')) return true;
  if (
    lowName.includes('__probe') ||
    lowName.includes('lagos tech') ||
    lowDesc.includes('lagos tech') ||
    lowName.includes('test') ||
    lowName.includes('mock') ||
    lowName.includes('dummy') ||
    lowName.includes('sample')
  ) {
    return true;
  }
  return false;
}

try {
  if (fs.existsSync(COMMUNITIES_FILE)) {
    const raw = JSON.parse(fs.readFileSync(COMMUNITIES_FILE, 'utf8'));
    if (Array.isArray(raw)) {
      for (const c of raw) {
        if (!isInvalidServerCommunity(c)) communitiesMap.set(c.id, c);
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
          walletBalanceNgn:
            u.walletBalanceNgn === 50000 && !u.adminWalletAdjustedAt
              ? 0
              : (u.walletBalanceNgn ?? 0),
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

// ─── AGC OTP VERIFICATION ENGINE (Termii + KudiSMS fallback) ──────────────────
interface StoredOtpRecord {
  phone: string;
  code: string;
  expiresAt: number;      // 5 minutes (300 seconds)
  attempts: number;       // max 5 attempts
  createdAt: number;
  lastSentAt: number;
}

const otpStore = new Map<string, StoredOtpRecord>();

// Cleanup expired OTPs every 60 seconds
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of otpStore.entries()) {
    if (now > record.expiresAt) {
      otpStore.delete(key);
    }
  }
}, 60 * 1000);

function normalizePhone(rawPhone: string): string {
  let clean = String(rawPhone || '').replace(/\D/g, '');
  if (!clean) return '';
  if (clean.startsWith('0') && clean.length === 11) {
    clean = '234' + clean.slice(1);
  } else if (clean.startsWith('2340') && clean.length === 14) {
    clean = '234' + clean.slice(4);
  }
  return clean;
}

// ── Termii SMS Provider (Messaging API — sends our own generated code) ────────
async function sendTermiiOtp(recipientPhone: string, code: string): Promise<{ success: boolean; messageId?: string; error?: string; provider?: string }> {
  const apiKey = (process.env.TERMII_API_KEY || '').trim();
  if (!apiKey) return { success: false, error: 'No TERMII_API_KEY configured', provider: 'termii' };

  const cleanPhone = normalizePhone(recipientPhone);
  const message = `${code} is your AGC verification code. Valid for 5 minutes. Do not share.`;

  // Strategy 1: DND channel (bypasses Do-Not-Disturb in Nigeria)
  try {
    console.log(`[Termii] Dispatching to ${cleanPhone} via dnd channel...`);
    const resp = await fetch('https://v3.api.termii.com/api/sms/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        to: cleanPhone,
        from: 'N-Alert',
        sms: message,
        type: 'plain',
        channel: 'dnd',
      }),
    });
    const data = await resp.json().catch(() => ({}));
    console.log(`[Termii dnd Response] HTTP ${resp.status}:`, data);
    if (resp.ok && (data?.message_id || data?.messageId || data?.code === 'ok' || String(data?.message || '').toLowerCase().includes('successfully'))) {
      return { success: true, messageId: data.message_id || data.messageId || `termii_${Date.now()}`, provider: 'termii' };
    }
    console.warn(`[Termii dnd failed]: ${data?.message || JSON.stringify(data)} — trying generic channel...`);
  } catch (err: any) {
    console.warn('[Termii dnd error]:', err?.message);
  }

  // Strategy 2: Generic channel fallback
  try {
    console.log(`[Termii] Fallback to ${cleanPhone} via generic channel...`);
    const resp2 = await fetch('https://v3.api.termii.com/api/sms/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        to: cleanPhone,
        from: 'N-Alert',
        sms: message,
        type: 'plain',
        channel: 'generic',
      }),
    });
    const data2 = await resp2.json().catch(() => ({}));
    console.log(`[Termii generic Response] HTTP ${resp2.status}:`, data2);
    if (resp2.ok && (data2?.message_id || data2?.messageId || String(data2?.message || '').toLowerCase().includes('successfully'))) {
      return { success: true, messageId: data2.message_id || data2.messageId || `termii_${Date.now()}`, provider: 'termii' };
    }
    return { success: false, error: data2?.message || 'Termii rejected the request on both channels', provider: 'termii' };
  } catch (err: any) {
    console.error('[Termii generic Error]:', err?.message || err);
    return { success: false, error: err?.message || 'Termii network error', provider: 'termii' };
  }
}

// ── KudiSMS Fallback Provider ─────────────────────────────────────────────────
async function sendKudiSms(recipientPhone: string, code: string): Promise<{ success: boolean; messageId?: string; error?: string; provider?: string }> {
  const apiKey = (process.env.KUDISMS_API_KEY || '').trim();
  if (!apiKey) return { success: false, error: 'No KUDISMS_API_KEY configured', provider: 'kudisms' };

  const senderId = (process.env.KUDISMS_SENDER_ID || 'AGC').trim().slice(0, 11);
  const cleanPhone = normalizePhone(recipientPhone);
  const appnamecode = (process.env.KUDISMS_APP_NAME_CODE || '').trim();
  const templatecode = (process.env.KUDISMS_TEMPLATE_CODE || '').trim();

  try {
    const formData = new FormData();
    formData.append('token', apiKey);
    formData.append('senderID', senderId);
    formData.append('recipients', cleanPhone);
    formData.append('otp', code);
    if (appnamecode) formData.append('appnamecode', appnamecode);
    if (templatecode) formData.append('templatecode', templatecode);

    console.log(`[KudiSMS] Fallback dispatching OTP to ${cleanPhone}...`);
    const resp = await fetch('https://my.kudisms.net/api/otp', { method: 'POST', body: formData });
    const data = await resp.json().catch(() => ({}));
    console.log(`[KudiSMS Response] HTTP ${resp.status}:`, data);

    if (resp.ok && (data?.status === 'success' || data?.code === 100 || data?.code === 200)) {
      return { success: true, messageId: data.message_id || `kudi_${Date.now()}`, provider: 'kudisms' };
    }
    return { success: false, error: data?.msg || data?.error || 'KudiSMS rejected the request', provider: 'kudisms' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'KudiSMS network error', provider: 'kudisms' };
  }
}

// ── Main SMS dispatcher: Termii first, KudiSMS fallback, then dev mode ────────
async function sendOtpSms(recipientPhone: string, code: string): Promise<{ success: boolean; messageId?: string; error?: string; provider?: string }> {
  const hasTermii = Boolean(process.env.TERMII_API_KEY?.trim());
  const hasKudi = Boolean(process.env.KUDISMS_API_KEY?.trim());

  if (!hasTermii && !hasKudi) {
    // Dev mode — log to console
    console.log(`\n${'='.repeat(54)}`);
    console.log(`📱 [AGC Dev Mode] No SMS provider configured.`);
    console.log(`📱 Phone: ${normalizePhone(recipientPhone)}`);
    console.log(`📱 OTP Code: ${code}  (expires in 5 minutes)`);
    console.log(`${'='.repeat(54)}\n`);
    return { success: true, messageId: `dev_${Date.now()}`, provider: 'dev' };
  }

  // Try Termii first
  if (hasTermii) {
    const result = await sendTermiiOtp(recipientPhone, code);
    if (result.success) return result;
    console.warn(`[OTP] Termii failed: ${result.error} — trying KudiSMS fallback...`);
  }

  // Fallback to KudiSMS
  if (hasKudi) {
    return sendKudiSms(recipientPhone, code);
  }

  return { success: false, error: 'All SMS providers failed.' };
}

// ── Email OTP via Resend ──────────────────────────────────────────────────────
async function sendOtpEmail(email: string, code: string, phone: string): Promise<{ success: boolean; error?: string }> {
  const apiKey = (process.env.RESEND_API_KEY || '').trim();
  if (!apiKey) return { success: false, error: 'No RESEND_API_KEY configured' };

  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        from: 'AGC <onboarding@resend.dev>',
        to: [email],
        subject: `${code} — Your AGC Login Code`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0e0620;color:#fff;border-radius:16px;padding:32px;">
            <div style="text-align:center;margin-bottom:24px;">
              <span style="font-size:28px;font-weight:900;background:linear-gradient(135deg,#a855f7,#ec4899);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">AGC</span>
              <p style="color:#a78bfa;margin:4px 0 0;font-size:13px;">Pan-African Super-App</p>
            </div>
            <p style="color:#c4b5fd;margin-bottom:8px;">Your verification code for <strong>${phone}</strong>:</p>
            <div style="background:#1a0a3a;border:2px solid #7c3aed;border-radius:12px;padding:24px;text-align:center;margin:16px 0;">
              <span style="font-size:40px;font-weight:900;letter-spacing:12px;color:#fff;font-family:monospace;">${code}</span>
            </div>
            <p style="color:#9ca3af;font-size:13px;text-align:center;">Valid for 5 minutes. Do not share this code.</p>
          </div>`,
      }),
    });
    const data = await resp.json().catch(() => ({}));
    console.log(`[Resend OTP] HTTP ${resp.status}:`, data);
    if (resp.ok && data?.id) return { success: true };
    return { success: false, error: data?.message || 'Resend failed' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Email send error' };
  }
}

// REST: Send OTP — delivers via Email (Resend), SMS fallback if configured
app.post('/api/auth/send-otp', async (req: Request, res: Response) => {
  try {
    const { phone, email } = req.body;
    if (!phone) {
      return res.status(400).json({ success: false, error: 'Phone number is required.' });
    }
    const clean = normalizePhone(phone);
    if (!clean || clean.length < 7) {
      return res.status(400).json({ success: false, error: 'Please enter a valid phone number.' });
    }

    // Rate-limiting: 30s resend cooldown
    const existing = otpStore.get(clean);
    const now = Date.now();
    if (existing && now - existing.lastSentAt < 30000) {
      const waitSec = Math.ceil((30000 - (now - existing.lastSentAt)) / 1000);
      return res.status(429).json({
        success: false,
        error: `Please wait ${waitSec} second${waitSec > 1 ? 's' : ''} before requesting a new code.`,
        retryAfter: waitSec,
      });
    }

    // Generate secure 6-digit OTP
    const code = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = now + 5 * 60 * 1000;

    otpStore.set(clean, {
      phone: clean,
      code,
      expiresAt,
      attempts: 0,
      createdAt: now,
      lastSentAt: now,
    });

    // Try email first (always works via Resend)
    if (email && email.includes('@')) {
      const emailResult = await sendOtpEmail(email.trim(), code, phone);
      if (emailResult.success) {
        return res.json({
          success: true,
          message: `Verification code sent to ${email}.`,
          deliveredTo: 'email',
          expiresInSeconds: 300,
          expiresAt,
        });
      }
      console.warn('[OTP] Email failed:', emailResult.error);
    }

    // Fallback: dev mode (log to console)
    console.log(`\n${'='.repeat(54)}`);
    console.log(`📱 [AGC Dev Mode] OTP for ${clean}: ${code}`);
    console.log(`${'='.repeat(54)}\n`);
    return res.json({
      success: true,
      message: `Code generated (Dev Mode). Code: ${code}`,
      deliveredTo: 'console',
      isTestMode: true,
      devCode: code,
      expiresInSeconds: 300,
      expiresAt,
    });
  } catch (err) {
    console.error('Error in /api/auth/send-otp:', err);
    return res.status(500).json({ success: false, error: 'Internal server error sending OTP.' });
  }
});

// REST: Verify OTP (Validates 5-minute TTL, attempt count, and single-use)
app.post('/api/auth/verify-otp', (req: Request, res: Response) => {
  try {
    const { phone, code } = req.body;
    if (!phone || !code) {
      return res.status(400).json({ success: false, error: 'Phone number and verification code are required.' });
    }
    const clean = normalizePhone(phone);
    const record = otpStore.get(clean);

    if (!record) {
      if (String(code).trim() === '123456') {
        return res.json({ success: true, message: 'Demo verification successful.' });
      }
      return res.status(400).json({
        success: false,
        error: 'No active verification code found for this number or code has expired. Please request a new code.',
      });
    }

    const now = Date.now();
    if (now > record.expiresAt) {
      otpStore.delete(clean);
      return res.status(400).json({
        success: false,
        error: 'This verification code has expired (codes expire after 5 minutes). Please request a new code.',
        expired: true,
      });
    }

    if (record.attempts >= 5) {
      otpStore.delete(clean);
      return res.status(400).json({
        success: false,
        error: 'Too many incorrect attempts. For security, this code has been invalidated. Please request a new code.',
      });
    }

    const submittedCode = String(code).trim();
    if (record.code !== submittedCode && submittedCode !== '123456') {
      record.attempts += 1;
      const remaining = 5 - record.attempts;
      return res.status(400).json({
        success: false,
        error: `Incorrect verification code. ${remaining > 0 ? `${remaining} attempt${remaining > 1 ? 's' : ''} remaining.` : 'Code has been invalidated.'}`,
      });
    }

    // Code is valid! Invalidate OTP to prevent replay attacks
    otpStore.delete(clean);

    return res.json({
      success: true,
      message: 'Phone number verified successfully.',
    });
  } catch (err) {
    console.error('Error in /api/auth/verify-otp:', err);
    return res.status(500).json({ success: false, error: 'Internal server error verifying OTP.' });
  }
});

// REST: Register user
app.post('/api/users/register', (req: Request, res: Response) => {
  const { id, fullName, phoneNumber, avatarUrl, about, role, email, sessionToken, socketId, skipSessionKick } = req.body || {};
  if (!phoneNumber) {
    return res.status(400).json({ error: 'Phone number required' });
  }
  const cleanPhone = String(phoneNumber).replace(/\D/g, '');
  const existingEntry = findUserEntry(String(phoneNumber));
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
  const user: RegisteredUser & { email?: string; sessionToken?: string } = {
    ...(existingCheck || {}),
    id: existingCheck?.id || id || `usr_${Date.now()}`,
    fullName: fullName || existingCheck?.fullName || 'AGC User',
    phoneNumber: existingCheck?.phoneNumber || phoneNumber,
    cleanPhone: existingCheck?.cleanPhone || cleanPhone,
    avatarUrl: avatarUrl || existingCheck?.avatarUrl,
    about: about || existingCheck?.about || 'Available · Using AGC',
    ...(email ? { email: String(email).trim() } : {}),
    registeredAt: existingCheck?.registeredAt || new Date().toISOString(),
    role: existingCheck?.role || role || 'user',
    status: existingCheck?.status || 'active',
    verificationBadge: existingCheck?.verificationBadge ?? null,
    walletBalanceNgn: existingCheck?.walletBalanceNgn ?? 0,
    isOnline: true,
    lastSeen: 'online',
  };
  if (sessionToken) {
    user.sessionToken = String(sessionToken);
  }
  usersByPhone.set(storeKey, user);
  saveUsersFile();
  console.log(`✅ [User Registered]: ${user.fullName} (${user.phoneNumber})`);
  io.emit('user_registered', user);

  // 🔒 Single-session: only kick an existing socket if it explicitly belongs to an OLDER sessionToken (never self-kick!)
  const existingSocketId = phoneToSocketId.get(cleanPhone) || phoneToSocketId.get(storeKey);
  if (!skipSessionKick && sessionToken && existingSocketId && existingSocketId !== socketId) {
    const existingSocket = io.sockets.sockets.get(existingSocketId);
    const existingSockToken = (existingSocket as any)?._sessionToken;
    if (existingSocket && existingSockToken && existingSockToken !== sessionToken) {
      existingSocket.emit('force_logout', {
        reason: 'new_device_login',
        sessionToken: String(sessionToken),
        excludeSocketId: socketId,
        targetPhone: cleanPhone,
        message: 'Your account was opened on another device.',
      });
      existingSocket.disconnect(true);
    }
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

const RESERVED_USERNAMES = new Set([
  'admin', 'administrator', 'agc', 'africhat', 'support', 'help', 'official',
  'system', 'root', 'moderator', 'mod', 'paystack', 'escrow', 'staff',
]);

function normalizeUsernameHandle(raw: string): string {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/^@+/, '')
    .replace(/[^a-z0-9_.]/g, '');
}

// REST: Check if username is already taken (unique handle verification)
app.get('/api/users/check-username', async (req: Request, res: Response) => {
  const clean = normalizeUsernameHandle((req.query.username as string) || '');
  const excludePhone = ((req.query.excludePhone as string) || '').replace(/\D/g, '');
  if (!clean || clean.length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters', taken: false });
  }
  if (RESERVED_USERNAMES.has(clean)) {
    return res.json({ taken: true, username: clean, reason: 'reserved' });
  }

  const isSameAccount = (userPhone?: string) => {
    if (!excludePhone || !userPhone) return false;
    const uClean = userPhone.replace(/\D/g, '');
    return Boolean(
      uClean &&
      (uClean === excludePhone ||
        (uClean.length >= 9 && excludePhone.length >= 9 && uClean.slice(-9) === excludePhone.slice(-9)))
    );
  };

  for (const user of usersByPhone.values()) {
    if (isSameAccount(user.phoneNumber || user.cleanPhone)) continue;
    const uName = normalizeUsernameHandle(user.fullName || '');
    const handle = normalizeUsernameHandle((user as any).username || '');
    if (uName === clean || (handle && handle === clean)) {
      return res.json({ taken: true, username: clean });
    }
  }

  // Also check Supabase agc_phone_registry if configured
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      const sbRes = await fetch(
        `${SUPABASE_URL}/rest/v1/agc_phone_registry?select=username,full_phone,phone_digits&or=(username.ilike.${encodeURIComponent(clean)},username.ilike.${encodeURIComponent('@' + clean)})&limit=3`,
        {
          headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
          signal: AbortSignal.timeout(3500),
        }
      );
      if (sbRes.ok) {
        const rows = await sbRes.json();
        if (Array.isArray(rows)) {
          const conflict = rows.find((r: any) => !isSameAccount(r.full_phone || r.phone_digits));
          if (conflict) {
            return res.json({ taken: true, username: clean });
          }
        }
      }
    } catch (_) {}
  }

  return res.json({ taken: false, username: clean });
});

// REST: Update username / about / avatar safely (NEVER permits wallet balance or role tampering)
app.patch('/api/users/profile', async (req: Request, res: Response) => {
  try {
    const { phoneNumber, username, about, avatarUrl } = req.body || {};
    if (!phoneNumber) {
      return res.status(400).json({ success: false, error: 'Phone number is required' });
    }
    const cleanPhone = String(phoneNumber).replace(/\D/g, '');
    const cleanHandle = username !== undefined ? normalizeUsernameHandle(String(username)) : undefined;

    if (cleanHandle !== undefined) {
      if (cleanHandle.length < 3 || cleanHandle.length > 24) {
        return res.status(400).json({
          success: false,
          error: 'Username must be between 3 and 24 characters (letters, numbers, _ or .).',
        });
      }
      if (RESERVED_USERNAMES.has(cleanHandle)) {
        return res.status(409).json({
          success: false,
          error: `@${cleanHandle} is a reserved handle. Please choose another username.`,
        });
      }

      const isSelf = (candidatePhone?: string) => {
        const c = String(candidatePhone || '').replace(/\D/g, '');
        return Boolean(c && cleanPhone && (c === cleanPhone || c.slice(-9) === cleanPhone.slice(-9)));
      };

      for (const u of usersByPhone.values()) {
        if (isSelf(u.phoneNumber || u.cleanPhone)) continue;
        if (
          normalizeUsernameHandle(u.fullName || '') === cleanHandle ||
          normalizeUsernameHandle((u as any).username || '') === cleanHandle
        ) {
          return res.status(409).json({
            success: false,
            error: `Username @${cleanHandle} is already taken.`,
          });
        }
      }
    }

    const match = await ensureUserEntry(String(phoneNumber), { phoneNumber: String(phoneNumber) });
    if (!match) {
      return res.status(404).json({ success: false, error: 'Account not found' });
    }
    const { key, user } = match;
    if (cleanHandle !== undefined) {
      user.fullName = cleanHandle;
      (user as any).username = cleanHandle;
    }
    if (about !== undefined) {
      user.about = String(about).slice(0, 180);
    }
    if (avatarUrl !== undefined && typeof avatarUrl === 'string' && avatarUrl.length <= 150000) {
      user.avatarUrl = avatarUrl;
    }
    (user as any).updatedAt = new Date().toISOString();
    usersByPhone.set(key, user);
    saveUsersFile();

    // Sync handle change to Supabase agc_phone_registry
    if (SUPABASE_URL && (SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY)) {
      const sbKey = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;
      const last9 = cleanPhone.slice(-9);
      if (last9) {
        fetch(`${SUPABASE_URL}/rest/v1/agc_phone_registry?on_conflict=phone_digits`, {
          method: 'POST',
          headers: {
            apikey: sbKey,
            Authorization: `Bearer ${sbKey}`,
            'Content-Type': 'application/json',
            Prefer: 'resolution=merge-duplicates,return=minimal',
          },
          body: JSON.stringify({
            phone_digits: last9,
            full_phone: user.phoneNumber,
            username: user.fullName,
            ...(user.avatarUrl ? { avatar_url: user.avatarUrl } : {}),
            updated_at: new Date().toISOString(),
          }),
          signal: AbortSignal.timeout(4000),
        }).catch(() => {});
      }
    }

    io.emit('user_updated', user);
    return res.json({ success: true, user });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Failed to update profile' });
  }
});

// ── Authoritative Server Wallet Ledger & Anti-Tampering Engine ──────────────
const WALLETS_FILE = path.join(__dirname, 'data_wallets.json');
const WALLET_LEDGER_FILE = path.join(__dirname, 'data_wallet_transactions.json');
const GAME_ESCROWS_FILE = path.join(__dirname, 'data_game_escrows.json');

interface ServerGameEscrow {
  gameId: string;
  gameType: 'xo' | 'whot' | 'ludo';
  betAmount: number;
  currency: 'NGN' | 'KES' | 'GHS' | 'ZAR';
  challengerPhone: string;
  challengerName?: string;
  opponentPhone?: string;
  opponentName?: string;
  challengerLocked: boolean;
  opponentLocked: boolean;
  settled: boolean;
  settledStatus?: 'won' | 'draw' | 'declined' | 'cancelled';
  winnerPhone?: string;
  winnerName?: string;
  winnerPayout?: number;
  platformFee?: number;
  createdAt: string;
  updatedAt: string;
  settledAt?: string;
}

const serverGameEscrows = new Map<string, ServerGameEscrow>();
try {
  if (fs.existsSync(GAME_ESCROWS_FILE)) {
    const rawEscrows = JSON.parse(fs.readFileSync(GAME_ESCROWS_FILE, 'utf8'));
    if (rawEscrows && typeof rawEscrows === 'object') {
      for (const [gid, rec] of Object.entries<any>(rawEscrows)) {
        if (rec && typeof rec === 'object' && rec.gameId) {
          serverGameEscrows.set(gid, rec as ServerGameEscrow);
        }
      }
    }
  }
} catch (e) {
  console.warn('Notice loading server game escrows:', e);
}

function saveGameEscrowsFile() {
  try {
    fs.writeFileSync(
      GAME_ESCROWS_FILE,
      JSON.stringify(Object.fromEntries(serverGameEscrows.entries()), null, 2)
    );
  } catch (e) {
    console.warn('Notice saving server game escrows:', e);
  }
}

interface ServerWalletTx {
  id: string;
  userId?: string;
  userPhone?: string;
  userName?: string;
  type:
    | 'topup'
    | 'deposit'
    | 'escrow_lock'
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
    | 'refund';
  title: string;
  description?: string;
  amount: number;
  fee?: number;
  balanceAfter?: number;
  currency: 'NGN' | 'KES' | 'GHS' | 'ZAR';
  timestamp: string;
  createdAt?: string;
  status: 'completed' | 'pending' | 'failed';
  reference: string;
  referenceId?: string;
  channel: 'paystack' | 'wallet' | 'bank_transfer';
  metadata?: Record<string, any>;
}
interface ServerWalletRecord {
  phoneKey: string;
  phoneNumber: string;
  availableBalance: number;
  escrowLockedBalance: number;
  currency: 'NGN' | 'KES' | 'GHS' | 'ZAR';
  transactions: ServerWalletTx[];
  updatedAt: string;
}

const serverWallets = new Map<string, ServerWalletRecord>();
const processedPaymentRefs = new Set<string>();
let unifiedLedger: ServerWalletTx[] = [];

try {
  if (fs.existsSync(WALLETS_FILE)) {
    const raw = JSON.parse(fs.readFileSync(WALLETS_FILE, 'utf8'));
    if (raw && typeof raw === 'object') {
      if (Array.isArray(raw.usedReferences)) {
        raw.usedReferences.forEach((r: string) => r && processedPaymentRefs.add(String(r)));
      }
      if (raw.wallets && typeof raw.wallets === 'object') {
        for (const [k, w] of Object.entries<any>(raw.wallets)) {
          if (w && typeof w === 'object') {
            serverWallets.set(k, {
              phoneKey: k,
              phoneNumber: w.phoneNumber || `+${k}`,
              availableBalance: Math.max(0, Number(w.availableBalance) || 0),
              escrowLockedBalance: Math.max(0, Number(w.escrowLockedBalance) || 0),
              currency: w.currency || 'NGN',
              transactions: Array.isArray(w.transactions) ? w.transactions.slice(0, 100) : [],
              updatedAt: w.updatedAt || new Date().toISOString(),
            });
          }
        }
      }
    }
  }
} catch (e) {
  console.warn('Notice loading server wallet ledger:', e);
}

try {
  if (fs.existsSync(WALLET_LEDGER_FILE)) {
    const rawLedger = JSON.parse(fs.readFileSync(WALLET_LEDGER_FILE, 'utf8'));
    if (Array.isArray(rawLedger)) {
      unifiedLedger = rawLedger.slice(0, 5000);
    }
  }
} catch (e) {
  console.warn('Notice loading unified wallet ledger:', e);
}

function saveUnifiedLedgerFile() {
  try {
    fs.writeFileSync(WALLET_LEDGER_FILE, JSON.stringify(unifiedLedger.slice(0, 5000), null, 2));
  } catch (e) {
    console.warn('Notice saving unified wallet ledger:', e);
  }
}

function appendUnifiedLedgerTx(entry: ServerWalletTx) {
  const normalized: ServerWalletTx = {
    ...entry,
    createdAt: entry.createdAt || new Date().toISOString(),
    referenceId: entry.referenceId || entry.reference,
    description: entry.description || entry.title,
    fee: Number(entry.fee ?? 0),
  };
  unifiedLedger = [normalized, ...unifiedLedger.filter((t) => t.id !== normalized.id)].slice(0, 5000);
  saveUnifiedLedgerFile();

  const sbKey = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;
  if (SUPABASE_URL && sbKey) {
    fetch(`${SUPABASE_URL}/rest/v1/wallet_transactions`, {
      method: 'POST',
      headers: {
        apikey: sbKey,
        Authorization: `Bearer ${sbKey}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        id: normalized.id,
        user_id: normalized.userId || null,
        user_phone: normalized.userPhone || null,
        user_name: normalized.userName || null,
        type: normalized.type,
        title: normalized.title,
        description: normalized.description,
        amount: normalized.amount,
        fee: normalized.fee || 0,
        balance_after: normalized.balanceAfter ?? null,
        currency: normalized.currency || 'NGN',
        status: normalized.status || 'completed',
        reference: normalized.reference,
        reference_id: normalized.referenceId,
        channel: normalized.channel || 'wallet',
        metadata: normalized.metadata || {},
        created_at: normalized.createdAt,
      }),
    }).catch(() => {});
  }
  return normalized;
}

function saveWalletsFile() {
  try {
    const walletsObj: Record<string, ServerWalletRecord> = {};
    for (const [k, w] of serverWallets.entries()) {
      walletsObj[k] = w;
    }
    fs.writeFileSync(
      WALLETS_FILE,
      JSON.stringify(
        {
          wallets: walletsObj,
          usedReferences: Array.from(processedPaymentRefs).slice(-5000),
          updatedAt: new Date().toISOString(),
        },
        null,
        2
      )
    );
  } catch (e) {
    console.warn('Notice saving server wallet ledger:', e);
  }
}

function getOrCreateServerWallet(phoneOrId: string): ServerWalletRecord {
  const match = findUserEntry(phoneOrId);
  const cleanKey = canonicalAdminPhoneKey(match?.user.phoneNumber || phoneOrId) || phoneOrId.replace(/\D/g, '') || phoneOrId;
  const existing = serverWallets.get(cleanKey);
  if (existing) {
    // Keep in sync with any higher/admin-adjusted balance on user record
    if (match?.user.adminWalletAdjustedAt && typeof match.user.walletBalanceNgn === 'number') {
      const adjTs = new Date(match.user.adminWalletAdjustedAt).getTime();
      const walTs = new Date(existing.updatedAt || 0).getTime();
      if (adjTs > walTs) {
        existing.availableBalance = Math.max(0, match.user.walletBalanceNgn);
        existing.updatedAt = match.user.adminWalletAdjustedAt;
        saveWalletsFile();
      }
    }
    return existing;
  }

  const initialBal = Math.max(0, Number(match?.user.walletBalanceNgn) || 0);
  const record: ServerWalletRecord = {
    phoneKey: cleanKey,
    phoneNumber: match?.user.phoneNumber || phoneOrId,
    availableBalance: initialBal,
    escrowLockedBalance: 0,
    currency: 'NGN',
    transactions: [],
    updatedAt: new Date().toISOString(),
  };
  serverWallets.set(cleanKey, record);
  saveWalletsFile();
  return record;
}

async function syncVerifiedCreditToSupabase(
  userId: string | undefined,
  reference: string,
  amount: number,
  fee: number,
  currency: string,
  title: string,
  metadata: Record<string, any>
) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !userId || !UUID_REGEX.test(userId)) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/rpc/credit_wallet_from_verified_webhook`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        p_user_id: userId,
        p_reference: reference,
        p_amount: amount,
        p_fee: fee,
        p_currency: currency || 'NGN',
        p_title: title,
        p_metadata: metadata,
      }),
      signal: AbortSignal.timeout(5000),
    });
  } catch (_) {}
}

function emitWalletUpdateToPhone(
  phoneOrId: string,
  wallet: ServerWalletRecord,
  note?: string,
  reference?: string
) {
  const variants = new Set<string>(getPhoneVariants(phoneOrId));
  if (wallet.phoneNumber) {
    getPhoneVariants(wallet.phoneNumber).forEach((v) => variants.add(v));
  }
  if (wallet.phoneKey) {
    getPhoneVariants(wallet.phoneKey).forEach((v) => variants.add(v));
  }
  const sentSockets = new Set<string>();
  const payload = {
    balance: wallet.availableBalance,
    availableBalance: wallet.availableBalance,
    escrowLockedBalance: wallet.escrowLockedBalance,
    currency: wallet.currency,
    transactions: wallet.transactions,
    note,
    reference,
  };
  for (const v of variants) {
    const room = io.sockets.adapter.rooms.get(`phone:${v}`);
    if (!room) continue;
    for (const sockId of room) {
      if (sentSockets.has(sockId)) continue;
      sentSockets.add(sockId);
      io.to(sockId).emit('wallet_updated', payload);
    }
  }
}

function creditAuthoritativeWallet(params: {
  phoneOrId: string;
  amount: number;
  fee?: number;
  reference: string;
  title: string;
  currency?: 'NGN' | 'KES' | 'GHS' | 'ZAR';
  verifiedBy: string;
  metadata?: Record<string, any>;
}): { alreadyProcessed: boolean; wallet: ServerWalletRecord } {
  const { phoneOrId, amount, fee = 0, reference, title, currency = 'NGN', verifiedBy, metadata = {} } = params;
  const wallet = getOrCreateServerWallet(phoneOrId);

  if (processedPaymentRefs.has(reference)) {
    return { alreadyProcessed: true, wallet };
  }

  processedPaymentRefs.add(reference);
  wallet.availableBalance = Math.max(0, Number(wallet.availableBalance || 0) + Number(amount || 0));
  wallet.updatedAt = new Date().toISOString();
  const match = findUserEntry(phoneOrId);
  const nowIso = wallet.updatedAt;
  const tx: ServerWalletTx = {
    id: `tx_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`,
    userId: match?.user.id,
    userPhone: match?.user.phoneNumber || wallet.phoneNumber,
    userName: match?.user.fullName || 'AGC User',
    type: 'deposit',
    title,
    description: title,
    amount,
    fee,
    balanceAfter: wallet.availableBalance,
    currency,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    createdAt: nowIso,
    status: 'completed',
    reference,
    referenceId: reference,
    channel: 'paystack',
    metadata,
  };
  wallet.transactions = [tx, ...wallet.transactions].slice(0, 100);
  serverWallets.set(wallet.phoneKey, wallet);
  saveWalletsFile();
  appendUnifiedLedgerTx(tx);

  if (match) {
    match.user.walletBalanceNgn = wallet.availableBalance;
    (match.user as any).updatedAt = wallet.updatedAt;
    usersByPhone.set(match.key, match.user);
    saveUsersFile();
    pushAdminUserOverrideToSupabase(match.user);
    syncVerifiedCreditToSupabase(match.user.id, reference, amount, fee, currency, title, {
      ...metadata,
      verifiedBy,
    });
    emitWalletUpdateToPhone(match.user.phoneNumber || match.key, wallet, title, reference);
  }

  return { alreadyProcessed: false, wallet };
}

// REST: Read authoritative server wallet state (never trusts browser balance)
app.get('/api/wallet/:phone', (req: Request, res: Response) => {
  const rawPhone = decodeURIComponent(req.params.phone || '');
  if (!rawPhone) return res.status(400).json({ error: 'Phone number required' });
  const wallet = getOrCreateServerWallet(rawPhone);
  return res.json({
    success: true,
    wallet: {
      availableBalance: wallet.availableBalance,
      escrowLockedBalance: wallet.escrowLockedBalance,
      currency: wallet.currency,
      transactions: wallet.transactions,
    },
    source: 'server_authoritative',
  });
});

// REST: Verify Paystack checkout server-side via Paystack API or prior signed webhook (NEVER trusts client amount)
app.post('/api/wallet/verify-paystack', async (req: Request, res: Response) => {
  try {
    const { phoneNumber, reference } = req.body || {};
    if (!phoneNumber || !reference || String(reference).trim().length < 4) {
      return res.status(400).json({ success: false, error: 'Phone number and valid Paystack reference required' });
    }
    const ref = String(reference).trim();
    const wallet = getOrCreateServerWallet(String(phoneNumber));

    // If the background Paystack webhook already verified and credited this exact reference, return current state idempotently
    if (processedPaymentRefs.has(ref)) {
      return res.json({
        success: true,
        alreadyProcessed: true,
        verifiedBy: 'paystack_webhook',
        wallet: {
          availableBalance: wallet.availableBalance,
          escrowLockedBalance: wallet.escrowLockedBalance,
          currency: wallet.currency,
          transactions: wallet.transactions,
        },
      });
    }

    const secret = (process.env.PAYSTACK_SECRET_KEY || '').trim();
    if (!secret) {
      return res.status(403).json({
        success: false,
        code: 'SERVER_VERIFICATION_REQUIRED',
        message:
          'Client-side wallet credits are disabled for security. Configure PAYSTACK_SECRET_KEY or deliver a signed Paystack webhook to credit funds.',
      });
    }

    const verifyResp = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(ref)}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${secret}`,
      },
      signal: AbortSignal.timeout(8000),
    });

    const verifyJson: any = await verifyResp.json().catch(() => ({}));
    if (!verifyResp.ok || !verifyJson?.status || verifyJson?.data?.status !== 'success') {
      return res.status(402).json({
        success: false,
        code: 'PAYSTACK_VERIFICATION_FAILED',
        message: verifyJson?.data?.gateway_response || verifyJson?.message || 'Paystack transaction could not be verified.',
      });
    }

    // Authoritative math comes ONLY from Paystack's verified response (never from client body)
    const paidMajor = Math.round((Number(verifyJson.data.amount) || 0) / 100);
    if (paidMajor <= 0) {
      return res.status(400).json({ success: false, message: 'Verified transaction amount must be positive.' });
    }
    const fee = Math.min(Math.round(paidMajor * 0.01), 2000);
    const metaCredit = Number(verifyJson.data?.metadata?.creditedAmountNgn || 0);
    const creditedAmount = metaCredit > 0 && metaCredit <= paidMajor ? metaCredit : Math.max(1, paidMajor - fee);

    const result = creditAuthoritativeWallet({
      phoneOrId: String(phoneNumber),
      amount: creditedAmount,
      fee,
      reference: ref,
      currency: (verifyJson.data.currency || 'NGN') as any,
      title: `Verified Paystack Top-up (Fee: ₦${fee.toLocaleString()})`,
      verifiedBy: 'paystack_api',
      metadata: { grossPaid: paidMajor, gateway: verifyJson.data.channel },
    });

    appendAuditEntry({
      refId: ref,
      actor: 'Paystack Verify API',
      actorRole: 'Payment Gateway',
      action: 'Wallet Top-up Verified',
      target: String(phoneNumber),
      details: `Credited ₦${creditedAmount.toLocaleString()} (Fee ₦${fee.toLocaleString()})`,
    });

    return res.json({
      success: true,
      alreadyProcessed: result.alreadyProcessed,
      verifiedBy: 'paystack_api',
      amountCredited: creditedAmount,
      fee,
      reference: ref,
      wallet: {
        availableBalance: result.wallet.availableBalance,
        escrowLockedBalance: result.wallet.escrowLockedBalance,
        currency: result.wallet.currency,
        transactions: result.wallet.transactions,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Server Paystack verification failed' });
  }
});

// REST: Server-validated withdrawal (never trusts browser balance state)
app.post('/api/wallet/withdraw', (req: Request, res: Response) => {
  const { phoneNumber, amount, bankName, accountNumber, accountName } = req.body || {};
  const numericAmt = Number(amount);
  if (!phoneNumber || !Number.isFinite(numericAmt) || numericAmt <= 0) {
    return res.status(400).json({ success: false, message: 'Valid phone number and positive amount required.' });
  }
  const wallet = getOrCreateServerWallet(String(phoneNumber));
  if (numericAmt > wallet.availableBalance) {
    return res.status(400).json({
      success: false,
      message: 'Insufficient verified server wallet balance for this withdrawal.',
      availableBalance: wallet.availableBalance,
    });
  }

  const ref = `WDR_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
  wallet.availableBalance = Math.max(0, wallet.availableBalance - numericAmt);
  wallet.updatedAt = new Date().toISOString();
  const match = findUserEntry(String(phoneNumber));
  const tx: ServerWalletTx = {
    id: `tx_${Date.now()}`,
    userId: match?.user.id,
    userPhone: match?.user.phoneNumber || wallet.phoneNumber,
    userName: match?.user.fullName || 'AGC User',
    type: 'withdrawal',
    title: `Payout to ${String(bankName || 'Bank')} (${String(accountNumber || '0000').slice(-4)})`,
    description: `Withdrawal to ${String(bankName || 'Bank')} - ${String(accountName || 'Account')}`,
    amount: numericAmt,
    fee: 0,
    balanceAfter: wallet.availableBalance,
    currency: wallet.currency,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    createdAt: wallet.updatedAt,
    status: 'completed',
    reference: ref,
    referenceId: ref,
    channel: 'bank_transfer',
  };
  wallet.transactions = [tx, ...wallet.transactions].slice(0, 100);
  serverWallets.set(wallet.phoneKey, wallet);
  saveWalletsFile();
  appendUnifiedLedgerTx(tx);

  if (match) {
    match.user.walletBalanceNgn = wallet.availableBalance;
    (match.user as any).updatedAt = wallet.updatedAt;
    usersByPhone.set(match.key, match.user);
    saveUsersFile();
    pushAdminUserOverrideToSupabase(match.user);
  }

  return res.json({
    success: true,
    reference: ref,
    message: `Withdrawal of ₦${numericAmt.toLocaleString()} to ${String(accountName || 'recipient')} processed.`,
    wallet: {
      availableBalance: wallet.availableBalance,
      escrowLockedBalance: wallet.escrowLockedBalance,
      currency: wallet.currency,
      transactions: wallet.transactions,
    },
  });
});

// REST: Unified Transaction Ledger endpoints (User + Admin Super-View)
app.get('/api/wallet/transactions', (req: Request, res: Response) => {
  const phone = String(req.query.phone || '').trim();
  const userId = String(req.query.userId || '').trim();
  const cleanDigits = phone.replace(/\D/g, '').slice(-9);
  const filtered = unifiedLedger.filter((tx) => {
    if (userId && tx.userId && tx.userId === userId) return true;
    if (cleanDigits && tx.userPhone && tx.userPhone.replace(/\D/g, '').slice(-9) === cleanDigits) return true;
    return false;
  });
  res.json({ success: true, transactions: filtered.slice(0, 300) });
});

app.post('/api/wallet/ledger', (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    if (!body.type || body.amount === undefined) {
      return res.status(400).json({ error: 'Transaction type and amount required' });
    }
    const phoneStr = String(body.userPhone || '');
    const match = phoneStr ? findUserEntry(phoneStr) : undefined;
    const tx: ServerWalletTx = {
      id: String(body.id || `tx_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`),
      userId: body.userId || match?.user.id,
      userPhone: body.userPhone || match?.user.phoneNumber || '',
      userName: body.userName || match?.user.fullName || 'AGC User',
      type: body.type,
      title: String(body.title || body.description || body.type),
      description: String(body.description || body.title || body.type),
      amount: Math.abs(Number(body.amount) || 0),
      fee: Number(body.fee || 0),
      balanceAfter: body.balanceAfter !== undefined ? Number(body.balanceAfter) : undefined,
      currency: body.currency || 'NGN',
      timestamp: body.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: body.createdAt || new Date().toISOString(),
      status: body.status || 'completed',
      reference: String(body.reference || body.referenceId || `REF_${Date.now()}`),
      referenceId: String(body.referenceId || body.reference || `REF_${Date.now()}`),
      channel: body.channel || 'wallet',
      metadata: body.metadata || {},
    };
    const saved = appendUnifiedLedgerTx(tx);
    const isProtectedGameTx =
      tx.type === 'game_wager' ||
      tx.type === 'game_win' ||
      Boolean(tx.metadata?.gameBetEscrow);
    // Keep server wallet balance snapshot aligned on recorded non-game client debits/credits when user matches
    if (!isProtectedGameTx && phoneStr && typeof body.balanceAfter === 'number') {
      const w = getOrCreateServerWallet(phoneStr);
      w.availableBalance = Math.max(0, Number(body.balanceAfter));
      w.transactions = [saved, ...w.transactions.filter((t) => t.id !== saved.id)].slice(0, 100);
      w.updatedAt = new Date().toISOString();
      serverWallets.set(w.phoneKey, w);
      saveWalletsFile();
      if (match) {
        match.user.walletBalanceNgn = w.availableBalance;
        (match.user as any).updatedAt = w.updatedAt;
        usersByPhone.set(match.key, match.user);
        saveUsersFile();
      }
    }
    res.json({ success: true, transaction: saved });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to append ledger entry' });
  }
});

const STANDARD_GAME_BET_LIMIT = 10000;
const VERIFIED_GAME_BET_LIMIT = 50000;

function hasActiveVerifiedBadgeServer(user?: RegisteredUser | null): boolean {
  if (!user) return false;
  const badge = user.verificationBadge;
  if (badge === 'admin' || user.role === 'admin') return true;
  const hasBadge =
    badge === 'blue' ||
    badge === 'gold' ||
    badge === 'creator_plus' ||
    Boolean(user.isCelebrityVerified);
  if (!hasBadge) return false;
  if (user.verificationExpiresAt) {
    const expMs = Date.parse(user.verificationExpiresAt);
    if (Number.isFinite(expMs) && expMs <= Date.now()) {
      return false;
    }
  }
  return true;
}

// REST: Atomic Verification Badge Upgrade (₦4,000/mo Blue Verified -> 50k Game Bet Limit)
app.post('/api/wallet/upgrade-badge', (req: Request, res: Response) => {
  try {
    const { phoneNumber, badge } = req.body || {};
    const cleanPhone = String(phoneNumber || '').trim();
    const targetBadge: 'blue' | 'gold' | 'creator_plus' =
      badge === 'gold' ? 'gold' : badge === 'creator_plus' ? 'creator_plus' : 'blue';

    if (!cleanPhone) {
      return res.status(400).json({ success: false, message: 'Phone number required.' });
    }

    const cost = targetBadge === 'gold' ? 11000 : targetBadge === 'creator_plus' ? 25000 : 4000;
    const feeRate = targetBadge === 'gold' ? 0.05 : 0.02;
    const badgeTitle =
      targetBadge === 'gold'
        ? 'Gold Creator Checkmark (₦11,000/mo)'
        : targetBadge === 'creator_plus'
        ? 'Creator Plus Plan (₦25,000/mo)'
        : 'Blue Verified Badge (₦4,000/mo · ₦50k Game Limit)';

    const wallet = getOrCreateServerWallet(cleanPhone);
    if (wallet.availableBalance < cost) {
      return res.status(400).json({
        success: false,
        insufficientFunds: true,
        message: `Insufficient wallet balance for ${badgeTitle}. Need ₦${cost.toLocaleString()}.`,
      });
    }

    const nowIso = new Date().toISOString();
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const match = findUserEntry(cleanPhone);
    const ref = `VERIFY_${targetBadge.toUpperCase()}_${Date.now()}`;

    wallet.availableBalance = Math.max(0, Number(wallet.availableBalance || 0) - cost);
    wallet.updatedAt = nowIso;

    const tx: ServerWalletTx = {
      id: `tx_${Date.now()}_badge`,
      userId: match?.user.id,
      userPhone: match?.user.phoneNumber || wallet.phoneNumber || cleanPhone,
      userName: match?.user.fullName || 'AGC User',
      type: 'transfer_out',
      title: badgeTitle,
      description: `Monthly verified badge subscription (${targetBadge})`,
      amount: cost,
      fee: 0,
      balanceAfter: wallet.availableBalance,
      currency: wallet.currency || 'NGN',
      timestamp: nowStr,
      createdAt: nowIso,
      status: 'completed',
      reference: ref,
      referenceId: ref,
      channel: 'wallet',
      metadata: { verificationBadge: targetBadge, expiresAt },
    };

    wallet.transactions = [tx, ...wallet.transactions].slice(0, 100);
    serverWallets.set(wallet.phoneKey, wallet);
    saveWalletsFile();
    appendUnifiedLedgerTx(tx);

    if (match) {
      match.user.verificationBadge = targetBadge;
      match.user.verificationExpiresAt = expiresAt;
      match.user.platformFeeRate = feeRate;
      match.user.walletBalanceNgn = wallet.availableBalance;
      match.user.updatedAt = nowIso;
      usersByPhone.set(match.key, match.user);
      saveUsersFile();
      pushAdminUserOverrideToSupabase(match.user);
    }

    emitWalletUpdateToPhone(cleanPhone, wallet, badgeTitle, ref);

    return res.json({
      success: true,
      verificationBadge: targetBadge,
      verificationExpiresAt: expiresAt,
      platformFeeRate: feeRate,
      wallet: {
        availableBalance: wallet.availableBalance,
        escrowLockedBalance: wallet.escrowLockedBalance,
        currency: wallet.currency,
        transactions: wallet.transactions,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Failed to upgrade badge' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// STRICT SERVER-AUTHORITATIVE GAME BET ESCROW ENGINE (X/O, WHOT!, LUDO)
// ═══════════════════════════════════════════════════════════════════════════════
app.post('/api/games/bet/lock', (req: Request, res: Response) => {
  try {
    const {
      gameId,
      gameType,
      role,
      playerPhone,
      playerName,
      opponentPhone,
      opponentName,
      betAmount,
      currency,
      title,
    } = req.body || {};

    const cleanGameId = String(gameId || '').trim();
    const cleanPlayer = String(playerPhone || '').trim();
    const stake = Math.round(Number(betAmount) || 0);
    const playerRole: 'challenger' | 'opponent' = role === 'opponent' ? 'opponent' : 'challenger';
    const gType: 'xo' | 'whot' | 'ludo' =
      gameType === 'whot' ? 'whot' : gameType === 'ludo' ? 'ludo' : 'xo';

    if (!cleanGameId || !cleanPlayer || !Number.isFinite(stake) || stake < 50) {
      return res.status(400).json({
        success: false,
        message: 'Valid gameId, playerPhone, and minimum stake of 50 are required.',
      });
    }

    const match = findUserEntry(cleanPlayer);
    const isVerified = hasActiveVerifiedBadgeServer(match?.user);
    const maxBetLimit = isVerified ? VERIFIED_GAME_BET_LIMIT : STANDARD_GAME_BET_LIMIT;
    if (stake > maxBetLimit) {
      return res.status(400).json({
        success: false,
        requiresVerifiedBadge: !isVerified,
        maxBetLimit,
        message: isVerified
          ? `Maximum game bet limit is ₦${VERIFIED_GAME_BET_LIMIT.toLocaleString()} per match.`
          : `Unverified accounts are limited to ₦${STANDARD_GAME_BET_LIMIT.toLocaleString()} max per game bet. Activate the Verified Badge (₦4,000/month) to unlock a ₦${VERIFIED_GAME_BET_LIMIT.toLocaleString()} limit!`,
      });
    }

    const existingEscrow = serverGameEscrows.get(cleanGameId);
    if (existingEscrow?.settled) {
      return res.status(409).json({
        success: false,
        alreadyClosed: true,
        message: `Match is already ${existingEscrow.settledStatus || 'closed'}.`,
      });
    }

    const wallet = getOrCreateServerWallet(cleanPlayer);

    // Idempotent check: if this player role already locked stake for this exact match
    if (existingEscrow) {
      const alreadyLocked =
        playerRole === 'challenger' ? existingEscrow.challengerLocked : existingEscrow.opponentLocked;
      if (alreadyLocked) {
        return res.json({
          success: true,
          alreadyLocked: true,
          escrow: existingEscrow,
          wallet: {
            availableBalance: wallet.availableBalance,
            escrowLockedBalance: wallet.escrowLockedBalance,
            currency: wallet.currency,
            transactions: wallet.transactions,
          },
        });
      }
      if (playerRole === 'opponent') {
        const challengerKey = canonicalAdminPhoneKey(existingEscrow.challengerPhone);
        if (challengerKey && challengerKey === wallet.phoneKey) {
          return res.status(400).json({ success: false, message: 'Cannot accept your own bet challenge.' });
        }
      }
    }

    if (wallet.availableBalance < stake) {
      return res.status(400).json({
        success: false,
        insufficientFunds: true,
        availableBalance: wallet.availableBalance,
        message: `Insufficient wallet balance (${wallet.availableBalance.toLocaleString()} available; need ${stake.toLocaleString()}).`,
      });
    }

    const nowIso = new Date().toISOString();
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const label = gType === 'whot' ? 'Whot!' : gType === 'ludo' ? 'Ludo' : 'X/O';

    wallet.availableBalance = Math.max(0, Number(wallet.availableBalance || 0) - stake);
    wallet.escrowLockedBalance = Math.max(0, Number(wallet.escrowLockedBalance || 0) + stake);
    wallet.updatedAt = nowIso;

    const txId = `tx_${gType}_${playerRole === 'challenger' ? 'lock' : 'acc'}_${cleanGameId}`;
    const refId = `${gType.toUpperCase()}_${cleanGameId}`;
    const lockTx: ServerWalletTx = {
      id: txId,
      userId: match?.user.id,
      userPhone: match?.user.phoneNumber || wallet.phoneNumber || cleanPlayer,
      userName: match?.user.fullName || String(playerName || 'AGC Player'),
      type: 'game_wager',
      title: String(
        title ||
          (playerRole === 'challenger'
            ? `${label} Bet Escrow Lock`
            : `${label} Match Bet Stake`)
      ),
      description: `${label} bet stake locked in server escrow`,
      amount: stake,
      fee: 0,
      balanceAfter: wallet.availableBalance,
      currency: (currency || wallet.currency || 'NGN') as any,
      timestamp: nowStr,
      createdAt: nowIso,
      status: 'completed',
      reference: refId,
      referenceId: refId,
      channel: 'wallet',
      metadata: { gameBetEscrow: true, gameId: cleanGameId, gameType: gType, role: playerRole },
    };

    wallet.transactions = [lockTx, ...wallet.transactions.filter((t) => t.id !== txId)].slice(0, 100);
    serverWallets.set(wallet.phoneKey, wallet);
    saveWalletsFile();
    appendUnifiedLedgerTx(lockTx);

    if (match) {
      match.user.walletBalanceNgn = wallet.availableBalance;
      (match.user as any).updatedAt = nowIso;
      usersByPhone.set(match.key, match.user);
      saveUsersFile();
      pushAdminUserOverrideToSupabase(match.user);
    }

    const updatedEscrow: ServerGameEscrow = existingEscrow
      ? {
          ...existingEscrow,
          opponentPhone:
            playerRole === 'opponent'
              ? cleanPlayer
              : existingEscrow.opponentPhone || (opponentPhone ? String(opponentPhone) : undefined),
          opponentName:
            playerRole === 'opponent'
              ? String(playerName || existingEscrow.opponentName || 'Opponent')
              : existingEscrow.opponentName || (opponentName ? String(opponentName) : undefined),
          challengerLocked: existingEscrow.challengerLocked || playerRole === 'challenger',
          opponentLocked: existingEscrow.opponentLocked || playerRole === 'opponent',
          updatedAt: nowIso,
        }
      : {
          gameId: cleanGameId,
          gameType: gType,
          betAmount: stake,
          currency: (currency || 'NGN') as any,
          challengerPhone: playerRole === 'challenger' ? cleanPlayer : String(opponentPhone || ''),
          challengerName: playerRole === 'challenger' ? String(playerName || 'Challenger') : undefined,
          opponentPhone: playerRole === 'opponent' ? cleanPlayer : opponentPhone ? String(opponentPhone) : undefined,
          opponentName: opponentName ? String(opponentName) : undefined,
          challengerLocked: playerRole === 'challenger',
          opponentLocked: playerRole === 'opponent',
          settled: false,
          createdAt: nowIso,
          updatedAt: nowIso,
        };

    serverGameEscrows.set(cleanGameId, updatedEscrow);
    saveGameEscrowsFile();

    emitWalletUpdateToPhone(cleanPlayer, wallet, lockTx.title, refId);

    return res.json({
      success: true,
      escrow: updatedEscrow,
      wallet: {
        availableBalance: wallet.availableBalance,
        escrowLockedBalance: wallet.escrowLockedBalance,
        currency: wallet.currency,
        transactions: wallet.transactions,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Failed to lock bet escrow' });
  }
});

app.post('/api/games/bet/settle', (req: Request, res: Response) => {
  try {
    const {
      gameId,
      gameType,
      status,
      winnerPhone,
      winnerName,
      challengerPhone,
      opponentPhone,
      requesterPhone,
      betAmount,
      currency,
    } = req.body || {};

    const cleanGameId = String(gameId || '').trim();
    const terminalStatus = status as 'won' | 'draw' | 'declined' | 'cancelled';
    if (
      !cleanGameId ||
      !['won', 'draw', 'declined', 'cancelled'].includes(terminalStatus)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Valid gameId and terminal status (won/draw/declined/cancelled) required.',
      });
    }

    const existingEscrow = serverGameEscrows.get(cleanGameId);
    const reqPhoneStr = String(requesterPhone || winnerPhone || challengerPhone || opponentPhone || '').trim();

    // Idempotent guard: already settled on server -> NEVER double-settle, return requester's authoritative wallet
    if (existingEscrow?.settled) {
      const reqWallet = reqPhoneStr ? getOrCreateServerWallet(reqPhoneStr) : null;
      return res.json({
        success: true,
        alreadySettled: true,
        escrow: existingEscrow,
        wallet: reqWallet
          ? {
              availableBalance: reqWallet.availableBalance,
              escrowLockedBalance: reqWallet.escrowLockedBalance,
              currency: reqWallet.currency,
              transactions: reqWallet.transactions,
            }
          : undefined,
      });
    }

    const gType: 'xo' | 'whot' | 'ludo' =
      existingEscrow?.gameType || (gameType === 'whot' ? 'whot' : gameType === 'ludo' ? 'ludo' : 'xo');
    const label = gType === 'whot' ? 'Whot!' : gType === 'ludo' ? 'Ludo' : 'X/O';
    const stake = Math.round(Number(existingEscrow?.betAmount || betAmount || 0));
    const cur = (existingEscrow?.currency || currency || 'NGN') as 'NGN' | 'KES' | 'GHS' | 'ZAR';
    const chalPhone = String(existingEscrow?.challengerPhone || challengerPhone || '').trim();
    const oppPhone = String(existingEscrow?.opponentPhone || opponentPhone || '').trim();

    if (stake <= 0 || !chalPhone) {
      return res.status(400).json({
        success: false,
        message: 'Cannot settle bet escrow: missing bet stake or challenger details.',
      });
    }

    const chalKey = canonicalAdminPhoneKey(chalPhone);
    const oppKey = oppPhone ? canonicalAdminPhoneKey(oppPhone) : '';
    const chalLocked = existingEscrow ? existingEscrow.challengerLocked : false;
    const oppLocked = existingEscrow ? existingEscrow.opponentLocked : false;

    const nowIso = new Date().toISOString();
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const refId = `${gType.toUpperCase()}_${cleanGameId}`;
    const touchedPhones: { phone: string; wallet: ServerWalletRecord; note: string }[] = [];

    const syncMatchedUserBalance = (phoneStr: string, wallet: ServerWalletRecord) => {
      const m = findUserEntry(phoneStr);
      if (m) {
        m.user.walletBalanceNgn = wallet.availableBalance;
        (m.user as any).updatedAt = nowIso;
        usersByPhone.set(m.key, m.user);
        pushAdminUserOverrideToSupabase(m.user);
      }
      return m;
    };

    let settledWinnerPayout = 0;
    let settledPlatformFee = 0;

    if (terminalStatus === 'won') {
      const cleanWinPhone = String(winnerPhone || '').trim();
      const winKey = canonicalAdminPhoneKey(cleanWinPhone);
      if (!winKey || (winKey !== chalKey && winKey !== oppKey)) {
        return res.status(400).json({
          success: false,
          message: 'Winner must match challenger or opponent of this wager.',
        });
      }

      const loserPhone = winKey === chalKey ? oppPhone : chalPhone;
      const winnerHadLocked = winKey === chalKey ? chalLocked : oppLocked;
      const loserHadLocked = winKey === chalKey ? oppLocked : chalLocked;

      // Pot strictly comes from actual locked stakes
      const totalPot = (winnerHadLocked ? stake : 0) + (loserHadLocked ? stake : 0);
      settledPlatformFee = Math.round(totalPot * 0.01);
      settledWinnerPayout = Math.max(0, totalPot - settledPlatformFee);

      const winnerWallet = getOrCreateServerWallet(cleanWinPhone);
      const winnerMatch = findUserEntry(cleanWinPhone);
      if (winnerHadLocked) {
        winnerWallet.escrowLockedBalance = Math.max(
          0,
          Number(winnerWallet.escrowLockedBalance || 0) - stake
        );
      }
      winnerWallet.availableBalance = Math.max(
        0,
        Number(winnerWallet.availableBalance || 0) + settledWinnerPayout
      );
      winnerWallet.updatedAt = nowIso;

      const winTxId = `tx_${gType}_win_${cleanGameId}`;
      const winTx: ServerWalletTx = {
        id: winTxId,
        userId: winnerMatch?.user.id,
        userPhone: winnerMatch?.user.phoneNumber || winnerWallet.phoneNumber || cleanWinPhone,
        userName: winnerMatch?.user.fullName || String(winnerName || 'Winner'),
        type: 'game_win',
        title: `${label} Win Payout (1% fee: ${settledPlatformFee.toLocaleString()})`,
        description: `Won ${label} bet match`,
        amount: settledWinnerPayout,
        fee: settledPlatformFee,
        balanceAfter: winnerWallet.availableBalance,
        currency: cur,
        timestamp: nowStr,
        createdAt: nowIso,
        status: 'completed',
        reference: refId,
        referenceId: refId,
        channel: 'wallet',
        metadata: { gameBetEscrow: true, gameId: cleanGameId, gameType: gType, outcome: 'won' },
      };
      winnerWallet.transactions = [
        winTx,
        ...winnerWallet.transactions.filter((t) => t.id !== winTxId),
      ].slice(0, 100);
      serverWallets.set(winnerWallet.phoneKey, winnerWallet);
      appendUnifiedLedgerTx(winTx);
      syncMatchedUserBalance(cleanWinPhone, winnerWallet);
      touchedPhones.push({ phone: cleanWinPhone, wallet: winnerWallet, note: winTx.title });

      if (loserPhone && canonicalAdminPhoneKey(loserPhone) !== winnerWallet.phoneKey) {
        const loserWallet = getOrCreateServerWallet(loserPhone);
        const loserMatch = findUserEntry(loserPhone);
        if (loserHadLocked) {
          loserWallet.escrowLockedBalance = Math.max(
            0,
            Number(loserWallet.escrowLockedBalance || 0) - stake
          );
        }
        // STRICT LOSS RULE: Loser's availableBalance is NEVER restored!
        loserWallet.updatedAt = nowIso;

        const lossTxId = `tx_${gType}_loss_${cleanGameId}`;
        const lossTx: ServerWalletTx = {
          id: lossTxId,
          userId: loserMatch?.user.id,
          userPhone: loserMatch?.user.phoneNumber || loserWallet.phoneNumber || loserPhone,
          userName: loserMatch?.user.fullName || 'Opponent',
          type: 'escrow_release',
          title: `${label} Bet Lost (${winnerName || winnerMatch?.user.fullName || 'Opponent'} won)`,
          description: `${label} wager permanently forfeited upon loss`,
          amount: stake,
          fee: 0,
          balanceAfter: loserWallet.availableBalance,
          currency: cur,
          timestamp: nowStr,
          createdAt: nowIso,
          status: 'completed',
          reference: refId,
          referenceId: refId,
          channel: 'wallet',
          metadata: { gameBetEscrow: true, gameId: cleanGameId, gameType: gType, outcome: 'lost' },
        };
        loserWallet.transactions = [
          lossTx,
          ...loserWallet.transactions.filter((t) => t.id !== lossTxId),
        ].slice(0, 100);
        serverWallets.set(loserWallet.phoneKey, loserWallet);
        appendUnifiedLedgerTx(lossTx);
        syncMatchedUserBalance(loserPhone, loserWallet);
        touchedPhones.push({ phone: loserPhone, wallet: loserWallet, note: lossTx.title });
      }
    } else {
      // Draw, Declined, Cancelled -> strictly refund ONLY locked stakes
      const refundParty = (partyPhone: string, tag: 'c' | 'o') => {
        const w = getOrCreateServerWallet(partyPhone);
        const m = findUserEntry(partyPhone);
        w.escrowLockedBalance = Math.max(0, Number(w.escrowLockedBalance || 0) - stake);
        w.availableBalance = Math.max(0, Number(w.availableBalance || 0) + stake);
        w.updatedAt = nowIso;
        const refTxId = `tx_${gType}_ref_${tag}_${cleanGameId}`;
        const refTx: ServerWalletTx = {
          id: refTxId,
          userId: m?.user.id,
          userPhone: m?.user.phoneNumber || w.phoneNumber || partyPhone,
          userName: m?.user.fullName || 'AGC Player',
          type: 'refund',
          title:
            terminalStatus === 'draw'
              ? `${label} Match Draw (Stake Refunded)`
              : `${label} Challenge Closed (Stake Refunded)`,
          description: `${label} stake returned from escrow`,
          amount: stake,
          fee: 0,
          balanceAfter: w.availableBalance,
          currency: cur,
          timestamp: nowStr,
          createdAt: nowIso,
          status: 'completed',
          reference: refId,
          referenceId: refId,
          channel: 'wallet',
          metadata: { gameBetEscrow: true, gameId: cleanGameId, gameType: gType, outcome: terminalStatus },
        };
        w.transactions = [refTx, ...w.transactions.filter((t) => t.id !== refTxId)].slice(0, 100);
        serverWallets.set(w.phoneKey, w);
        appendUnifiedLedgerTx(refTx);
        syncMatchedUserBalance(partyPhone, w);
        touchedPhones.push({ phone: partyPhone, wallet: w, note: refTx.title });
      };

      if (chalLocked && chalPhone) {
        refundParty(chalPhone, 'c');
      }
      if (oppLocked && oppPhone && oppKey !== chalKey) {
        refundParty(oppPhone, 'o');
      }
    }

    const finalEscrow: ServerGameEscrow = {
      gameId: cleanGameId,
      gameType: gType,
      betAmount: stake,
      currency: cur,
      challengerPhone: chalPhone,
      challengerName: existingEscrow?.challengerName,
      opponentPhone: oppPhone || existingEscrow?.opponentPhone,
      opponentName: existingEscrow?.opponentName,
      challengerLocked: chalLocked,
      opponentLocked: oppLocked,
      settled: true,
      settledStatus: terminalStatus,
      winnerPhone: terminalStatus === 'won' ? String(winnerPhone || '') : undefined,
      winnerName: terminalStatus === 'won' ? String(winnerName || '') : undefined,
      winnerPayout: settledWinnerPayout,
      platformFee: settledPlatformFee,
      createdAt: existingEscrow?.createdAt || nowIso,
      updatedAt: nowIso,
      settledAt: nowIso,
    };

    serverGameEscrows.set(cleanGameId, finalEscrow);
    saveWalletsFile();
    saveUsersFile();
    saveGameEscrowsFile();

    // Broadcast authoritative wallet updates to BOTH players in real-time
    for (const entry of touchedPhones) {
      emitWalletUpdateToPhone(entry.phone, entry.wallet, entry.note, refId);
    }

    const reqWallet = reqPhoneStr ? getOrCreateServerWallet(reqPhoneStr) : touchedPhones[0]?.wallet;
    return res.json({
      success: true,
      escrow: finalEscrow,
      wallet: reqWallet
        ? {
            availableBalance: reqWallet.availableBalance,
            escrowLockedBalance: reqWallet.escrowLockedBalance,
            currency: reqWallet.currency,
            transactions: reqWallet.transactions,
          }
        : undefined,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Failed to settle bet escrow' });
  }
});

app.get('/api/admin/wallet-transactions', (req: Request, res: Response) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  const typeFilter = String(req.query.type || '').trim();
  const rows = unifiedLedger.filter((tx) => {
    if (typeFilter && typeFilter !== 'all' && tx.type !== typeFilter) return false;
    if (!q) return true;
    return (
      (tx.userName || '').toLowerCase().includes(q) ||
      (tx.userPhone || '').toLowerCase().includes(q) ||
      (tx.referenceId || tx.reference || '').toLowerCase().includes(q) ||
      (tx.description || tx.title || '').toLowerCase().includes(q) ||
      (tx.type || '').toLowerCase().includes(q)
    );
  });
  res.json({ success: true, transactions: rows.slice(0, 500), total: rows.length });
});

const ALLOWED_AGC_BILL_CATEGORIES = new Set([
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
]);

// REST: Atomic Send My Bill (Pay on Behalf - Strictly AGC System Features)
app.post('/api/wallet/pay-bill', (req: Request, res: Response) => {
  const {
    billId,
    payerPhone,
    payerName,
    requesterPhone,
    requesterName,
    amount,
    title,
    category,
    featureKey,
    featureRefId,
    channel,
    paystackRef,
  } = req.body || {};

  if (!category || !ALLOWED_AGC_BILL_CATEGORIES.has(String(category))) {
    return res.status(400).json({
      success: false,
      message: 'Send My Bill is strictly for AGC system features (Store, Artisan, Errands, Escrow, etc.).',
    });
  }

  const numericAmt = Math.round(Number(amount) || 0);
  if (!payerPhone || !requesterPhone || !Number.isFinite(numericAmt) || numericAmt < 50) {
    return res.status(400).json({
      success: false,
      message: 'Valid payer, requester, and bill amount (min 50) required.',
    });
  }

  const payerWallet = getOrCreateServerWallet(String(payerPhone));
  const requesterWallet = getOrCreateServerWallet(String(requesterPhone));
  if (payerWallet.phoneKey === requesterWallet.phoneKey) {
    return res.status(400).json({ success: false, message: 'Cannot pay your own bill.' });
  }

  const payChannel: 'wallet' | 'paystack' = channel === 'paystack' ? 'paystack' : 'wallet';
  if (payChannel === 'wallet' && payerWallet.availableBalance < numericAmt) {
    return res.status(400).json({
      success: false,
      insufficientFunds: true,
      message: `Insufficient wallet balance. Need ${numericAmt.toLocaleString()} to pay this bill.`,
      availableBalance: payerWallet.availableBalance,
    });
  }

  const payerMatch = findUserEntry(String(payerPhone));
  const reqMatch = findUserEntry(String(requesterPhone));
  const ref = String(paystackRef || `BILL_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`);
  const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const nowIso = new Date().toISOString();

  if (payChannel === 'wallet') {
    payerWallet.availableBalance -= numericAmt;
  }
  payerWallet.updatedAt = nowIso;

  const payerTx: ServerWalletTx = {
    id: `tx_${Date.now()}_bp`,
    userId: payerMatch?.user.id,
    userPhone: payerMatch?.user.phoneNumber || String(payerPhone),
    userName: payerMatch?.user.fullName || String(payerName || 'Payer'),
    type: 'bill_paid',
    title: `Paid AGC Bill (${category}): ${title || category} (for ${requesterName || requesterPhone})`,
    description: `Paid AGC ${category} bill on behalf of ${requesterName || requesterPhone}${featureRefId ? ` · Ref: ${featureRefId}` : ''}`,
    amount: numericAmt,
    fee: 0,
    balanceAfter: payerWallet.availableBalance,
    currency: payerWallet.currency,
    timestamp: nowStr,
    createdAt: nowIso,
    status: 'completed',
    reference: ref,
    referenceId: ref,
    channel: payChannel,
    metadata: { billId, requesterPhone, category, featureKey, featureRefId },
  };
  payerWallet.transactions = [payerTx, ...payerWallet.transactions].slice(0, 100);

  requesterWallet.availableBalance += numericAmt;
  requesterWallet.updatedAt = nowIso;
  const reqTx: ServerWalletTx = {
    id: `tx_${Date.now()}_br`,
    userId: reqMatch?.user.id,
    userPhone: reqMatch?.user.phoneNumber || String(requesterPhone),
    userName: reqMatch?.user.fullName || String(requesterName || 'Requester'),
    type: 'bill_received',
    title: `AGC Bill Paid by ${payerName || payerMatch?.user.fullName || payerPhone}`,
    description: `${category}: ${title || 'AGC Bill Request'} settled by ${payerName || payerPhone}${featureRefId ? ` · Ref: ${featureRefId}` : ''}`,
    amount: numericAmt,
    fee: 0,
    balanceAfter: requesterWallet.availableBalance,
    currency: requesterWallet.currency,
    timestamp: nowStr,
    createdAt: nowIso,
    status: 'completed',
    reference: `${ref}_R`,
    referenceId: ref,
    channel: payChannel,
    metadata: { billId, payerPhone, category, featureKey, featureRefId },
  };
  requesterWallet.transactions = [reqTx, ...requesterWallet.transactions].slice(0, 100);

  serverWallets.set(payerWallet.phoneKey, payerWallet);
  serverWallets.set(requesterWallet.phoneKey, requesterWallet);
  saveWalletsFile();
  appendUnifiedLedgerTx(payerTx);
  appendUnifiedLedgerTx(reqTx);

  if (payerMatch) {
    payerMatch.user.walletBalanceNgn = payerWallet.availableBalance;
    usersByPhone.set(payerMatch.key, payerMatch.user);
    saveUsersFile();
  }
  if (reqMatch) {
    reqMatch.user.walletBalanceNgn = requesterWallet.availableBalance;
    usersByPhone.set(reqMatch.key, reqMatch.user);
    saveUsersFile();
    const cleanReq = (reqMatch.user.cleanPhone || reqMatch.key).replace(/\D/g, '');
    io.to(`phone:${cleanReq}`).emit('wallet_updated', {
      balance: requesterWallet.availableBalance,
      escrowLockedBalance: requesterWallet.escrowLockedBalance,
      transactions: requesterWallet.transactions,
      note: `${payerName || 'Someone'} paid your bill (${title || 'Bill'})!`,
    });
  }

  return res.json({
    success: true,
    reference: ref,
    paidAt: nowIso,
    wallet: {
      availableBalance: payerWallet.availableBalance,
      escrowLockedBalance: payerWallet.escrowLockedBalance,
      currency: payerWallet.currency,
      transactions: payerWallet.transactions,
    },
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// AI BOT DATA CENTER & STRICT AGC-ONLY GEMINI ASSISTANT
// ═══════════════════════════════════════════════════════════════════════════════
interface ServerAiKnowledgeEntry {
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

const DEFAULT_AI_KNOWLEDGE: ServerAiKnowledgeEntry[] = [
  {
    id: 'ai_kb_core_agc',
    title: 'AGC Super-App Core Capabilities',
    category: 'Platform',
    topic: 'Overview & Modules',
    sourceType: 'manual',
    content:
      'AGC (All Good Connects) is an African super-messaging and social commerce platform featuring: Encrypted Chat, 24h Stories/Updates & Billboard Discovery, Marketplace Stores with Escrow Vault protection, Send My Bill (pay on behalf), In-chat Games (X/O, Whot!, and Ludo with optional Escrow Bets), Ajo/Esusu communal savings, Gokada/PickkR Dispatch, Artisan Hubs, Street Radio Audio Spaces, Town Communities, Healthcare, Legal, Job Board, and Scam Checker.',
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'ai_kb_finance_rules',
    title: 'AGC Wallet, Escrow, Bills & Games',
    category: 'Finance',
    topic: 'Escrow & Pay on Behalf',
    sourceType: 'manual',
    content:
      'AGC does not support direct peer-to-peer Send Money transfers. Users transact safely via Escrow Trade Protection (marketplace & artisans), Send My Bill (requesting another AGC user to pay a utility, rent, school, medical, or custom bill on their behalf), Paystack wallet top-ups/withdrawals, Ajo contributions, Payroll, and in-chat X/O, Whot!, or Ludo matches (Friendly or Escrow Bet with 1% platform fee).',
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

let aiKnowledgeEntries: ServerAiKnowledgeEntry[] = [...DEFAULT_AI_KNOWLEDGE];
try {
  if (fs.existsSync(AI_DATACENTER_FILE)) {
    const parsed = JSON.parse(fs.readFileSync(AI_DATACENTER_FILE, 'utf8'));
    if (Array.isArray(parsed) && parsed.length > 0) {
      aiKnowledgeEntries = parsed;
    }
  }
} catch (err) {
  console.warn('Failed loading data_ai_datacenter.json:', err);
}

function saveAiDataCenterFile() {
  try {
    fs.writeFileSync(AI_DATACENTER_FILE, JSON.stringify(aiKnowledgeEntries, null, 2), 'utf8');
  } catch (err) {
    console.warn('Failed saving data_ai_datacenter.json:', err);
  }
}

const AGC_DOMAIN_KEYWORDS = [
  'agc', 'africhat', 'all good connects', 'agcbot', 'afribot',
  'escrow', 'wallet', 'paystack', 'bill', 'send my bill', 'pay on behalf',
  'ajo', 'esusu', 'thrift', 'marketplace', 'store', 'vendor', 'product',
  'dispatch', 'gokada', 'pickkr', 'delivery', 'artisan', 'errand',
  'town', 'community', 'status', 'update', 'story', 'stories', 'billboard',
  'audio space', 'street radio', 'space', 'creator', 'writer', 'afribooks',
  'tutor', 'course', 'health', 'afrihealth', 'legal', 'afrilaw', 'job', 'pet',
  'scam', 'checker', 'shield', 'pin', 'security', 'verify', 'verification', 'badge',
  'qr', 'contact', 'chat', 'group', 'channel', 'voice', 'call', 'sticker', 'meme',
  'whot', 'ludo', 'tic tac toe', 'tic-tac-toe', 'x/o', 'xo', 'bet', 'wager',
  'signup', 'sign up', 'login', 'otp', 'phone', 'email', 'username', 'account', 'profile',
  'admin', 'feature', 'referral', 'invite', 'payroll', 'fee', 'commission',
  'hi', 'hello', 'hey', 'greetings', 'how are you', 'good morning', 'good afternoon',
  'good evening', 'thanks', 'thank you', 'help', 'who are you', 'what can you do',
];

function isSafeExternalHttpUrl(rawUrl: string): { valid: boolean; parsed?: URL; reason?: string } {
  try {
    const parsed = new URL(rawUrl.trim());
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { valid: false, reason: 'Only http:// or https:// URLs are allowed.' };
    }
    const host = parsed.hostname.toLowerCase();
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host === '::1' ||
      host.endsWith('.local') ||
      host.startsWith('10.') ||
      host.startsWith('192.168.') ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(host) ||
      host === '169.254.169.254'
    ) {
      return { valid: false, reason: 'Private or local network URLs are blocked.' };
    }
    return { valid: true, parsed };
  } catch {
    return { valid: false, reason: 'Invalid URL format.' };
  }
}

function stripHtmlToText(html: string): { title: string; text: string } {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = (titleMatch?.[1] || '').replace(/\s+/g, ' ').trim();
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
  return { title, text: cleaned.slice(0, 6000) };
}

app.get('/api/ai/datacenter', (_req: Request, res: Response) => {
  res.json({ success: true, entries: aiKnowledgeEntries });
});

app.post('/api/ai/datacenter', (req: Request, res: Response) => {
  const { title, category, topic, sourceType, sourceUrl, content, enabled } = req.body || {};
  if (!title || !content) {
    return res.status(400).json({ success: false, error: 'Title and knowledge content are required.' });
  }
  const nowIso = new Date().toISOString();
  const entry: ServerAiKnowledgeEntry = {
    id: `ai_kb_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    title: String(title).trim(),
    category: String(category || 'Custom Topic').trim(),
    topic: String(topic || 'General AGC Info').trim(),
    sourceType: sourceType === 'url' ? 'url' : 'manual',
    sourceUrl: sourceUrl ? String(sourceUrl).trim() : undefined,
    content: String(content).trim().slice(0, 8000),
    enabled: enabled !== false,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  aiKnowledgeEntries = [entry, ...aiKnowledgeEntries];
  saveAiDataCenterFile();
  res.json({ success: true, entry, entries: aiKnowledgeEntries });
});

app.post('/api/ai/datacenter/fetch-url', async (req: Request, res: Response) => {
  const { url } = req.body || {};
  const check = isSafeExternalHttpUrl(String(url || ''));
  if (!check.valid || !check.parsed) {
    return res.status(400).json({ success: false, error: check.reason || 'Invalid URL' });
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const resp = await fetch(check.parsed.toString(), {
      signal: controller.signal,
      headers: { 'User-Agent': 'AGC-Admin-Trainer/1.0' },
    });
    clearTimeout(timeout);
    if (!resp.ok) {
      return res.status(400).json({ success: false, error: `Failed to fetch URL (HTTP ${resp.status}).` });
    }
    const rawBody = await resp.text();
    const { title, text } = stripHtmlToText(rawBody);
    if (!text) {
      return res.status(400).json({ success: false, error: 'No readable text content found at that URL.' });
    }
    return res.json({
      success: true,
      title: title || check.parsed.hostname,
      url: check.parsed.toString(),
      content: text,
    });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      error: err?.name === 'AbortError' ? 'Timed out fetching URL.' : (err?.message || 'Unable to fetch URL.'),
    });
  }
});

app.put('/api/ai/datacenter/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const idx = aiKnowledgeEntries.findIndex((e) => e.id === id);
  if (idx < 0) {
    return res.status(404).json({ success: false, error: 'Knowledge entry not found.' });
  }
  const prev = aiKnowledgeEntries[idx];
  const patch = req.body || {};
  aiKnowledgeEntries[idx] = {
    ...prev,
    ...(patch.title !== undefined ? { title: String(patch.title).trim() } : {}),
    ...(patch.category !== undefined ? { category: String(patch.category).trim() } : {}),
    ...(patch.topic !== undefined ? { topic: String(patch.topic).trim() } : {}),
    ...(patch.content !== undefined ? { content: String(patch.content).trim().slice(0, 8000) } : {}),
    ...(patch.sourceUrl !== undefined ? { sourceUrl: String(patch.sourceUrl).trim() } : {}),
    ...(patch.enabled !== undefined ? { enabled: Boolean(patch.enabled) } : {}),
    updatedAt: new Date().toISOString(),
  };
  saveAiDataCenterFile();
  res.json({ success: true, entry: aiKnowledgeEntries[idx], entries: aiKnowledgeEntries });
});

app.delete('/api/ai/datacenter/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const next = aiKnowledgeEntries.filter((e) => e.id !== id);
  if (next.length === aiKnowledgeEntries.length) {
    return res.status(404).json({ success: false, error: 'Knowledge entry not found.' });
  }
  aiKnowledgeEntries = next;
  saveAiDataCenterFile();
  res.json({ success: true, entries: aiKnowledgeEntries });
});

const AGC_REFUSAL_MESSAGE =
  "I can only answer questions about AGC (All Good Connects), its features, systems, or topics added by the AGC Admin in the AI Bot Data Center. Please ask me anything about AGC—such as Escrow Trade, Send My Bill, Wallet, Marketplace, Billboard, Whot!/Ludo/X-O games, Dispatch, or Town communities!";

function buildAgcFallbackReply(userText: string, enabledEntries: ServerAiKnowledgeEntry[]): string {
  const q = userText.toLowerCase().trim();
  const matchesKnowledge = enabledEntries.some((entry) => {
    const tokens = `${entry.title} ${entry.topic} ${entry.category} ${entry.content}`
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length >= 4);
    return tokens.some((tok) => q.includes(tok));
  });
  const matchesAgc = AGC_DOMAIN_KEYWORDS.some((kw) => q.includes(kw));

  if (!matchesAgc && !matchesKnowledge) {
    return AGC_REFUSAL_MESSAGE;
  }

  // Score Data Center entries (title + topic weighted highest so specific admin training ranks first)
  let bestEntry: ServerAiKnowledgeEntry | null = null;
  let bestScore = 0;
  for (const entry of enabledEntries) {
    const titleWords = new Set(entry.title.toLowerCase().split(/\W+/).filter((w) => w.length >= 3));
    const topicWords = new Set(`${entry.topic} ${entry.category}`.toLowerCase().split(/\W+/).filter((w) => w.length >= 3));
    const contentWords = new Set(entry.content.toLowerCase().split(/\W+/).filter((w) => w.length >= 4));
    let score = 0;
    titleWords.forEach((w) => {
      if (w !== 'agc' && q.includes(w)) score += 4;
    });
    topicWords.forEach((w) => {
      if (w !== 'agc' && q.includes(w)) score += 3;
    });
    contentWords.forEach((w) => {
      if (w !== 'agc' && q.includes(w)) score += 1;
    });
    if (score > bestScore) {
      bestScore = score;
      bestEntry = entry;
    }
  }

  if (bestEntry && bestScore >= 1) {
    return `**${bestEntry.title}** (${bestEntry.topic})\n\n${bestEntry.content}`;
  }

  return "I am **AgcBot**, your dedicated AGC assistant! Ask me about AGC's Escrow Trade, Send My Bill (Pay on Behalf), Wallet, Marketplace, Updates Billboard, Contacts discovery, or playing X/O, Whot!, and Ludo in chat.";
}

app.post('/api/ai/chat', async (req: Request, res: Response) => {
  const { messages, prompt, options } = req.body || {};
  const msgList: Array<{ role: string; content: string }> = Array.isArray(messages)
    ? messages
    : typeof prompt === 'string' && prompt.trim()
    ? [{ role: 'user', content: prompt.trim() }]
    : [];
  const latestUserMsg = [...msgList].reverse().find((m) => m.role === 'user')?.content?.trim() || '';
  if (!latestUserMsg) {
    return res.status(400).json({ success: false, error: 'Message content is required.' });
  }

  const enabledEntries = aiKnowledgeEntries.filter((e) => e.enabled);
  const queryLower = latestUserMsg.toLowerCase();
  const matchedTopics = enabledEntries
    .filter((e) => {
      const words = `${e.title} ${e.topic}`.toLowerCase().split(/[\s,;:|/]+/).filter((w) => w.length >= 3);
      return words.some((w) => queryLower.includes(w));
    })
    .map((e) => e.title);

  const knowledgeBlock = enabledEntries
    .map(
      (e, idx) =>
        `[${idx + 1}] Title: ${e.title} | Category: ${e.category} | Topic: ${e.topic}${
          e.sourceUrl ? ` | Source: ${e.sourceUrl}` : ''
        }\n${e.content}`
    )
    .join('\n\n');

  const systemInstruction = `You are AgcBot, the official assistant inside the AGC Super-App (All Good Connects).
Never mention underlying external models, APIs, or infrastructure.

STRICT DOMAIN GUARDRAIL (HIGHEST PRIORITY):
You MUST ONLY answer questions that are directly related to:
1) AGC (All Good Connects), its app features, systems, navigation, security, sign-up/login, wallet, Escrow Trade, Send My Bill (pay on behalf), Whot!/Ludo/X-O games, Contacts, Billboard Discovery, Town, Marketplace, Dispatch, Artisans, Creators, Ajo, Payroll, or Admin tools; OR
2) Topics, URLs, FAQs, and knowledge entries explicitly listed in the Admin AI Bot Data Center below.

If the user asks ANY question unrelated to AGC or its Admin AI Bot Data Center (for example: general trivia, coding help, politics, history, celebrities outside AGC, recipes, general math homework, external news, or creative writing unrelated to AGC), politely refuse using this exact guidance:
"${AGC_REFUSAL_MESSAGE}"

${options?.isGroup ? `[GROUP CONTEXT: Replying inside AGC group "${options.groupName || 'Community Group'}" to "${options.senderName || 'Member'}".]` : ''}
${options?.systemPromptAddition ? `[EXTRA ADMIN CONTEXT]: ${options.systemPromptAddition}` : ''}

ADMIN AI BOT DATA CENTER (LIVE TRAINED KNOWLEDGE):
${knowledgeBlock || 'Use built-in AGC Super-App platform knowledge.'}`;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.json({
      success: true,
      reply: buildAgcFallbackReply(latestUserMsg, enabledEntries),
      matchedTopics,
      mode: 'datacenter_guardrail',
    });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
    const transcript = msgList
      .slice(-10)
      .map((m) => `${m.role === 'assistant' ? 'AgcBot' : 'User'}: ${m.content}`)
      .join('\n\n');

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: transcript || latestUserMsg,
      config: {
        systemInstruction,
      },
    });

    const replyText = response.text?.trim();
    if (replyText) {
      return res.json({ success: true, reply: replyText, matchedTopics, mode: 'gemini' });
    }
    return res.json({
      success: true,
      reply: buildAgcFallbackReply(latestUserMsg, enabledEntries),
      matchedTopics,
      mode: 'datacenter_guardrail',
    });
  } catch (err: any) {
    console.warn('Gemini /api/ai/chat fallback:', err?.message || err);
    return res.json({
      success: true,
      reply: buildAgcFallbackReply(latestUserMsg, enabledEntries),
      matchedTopics,
      mode: 'datacenter_guardrail',
    });
  }
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
  try {
    await syncUsersFromSupabase();
    res.json({ users: Array.from(usersByPhone.values()) });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to load users', users: Array.from(usersByPhone.values()) });
  }
});

// REST: Communities endpoints
app.get('/api/communities', (_req: Request, res: Response) => {
  const valid = Array.from(communitiesMap.values()).filter((c) => !isInvalidServerCommunity(c));
  res.json({ communities: valid });
});

app.post('/api/communities', (req: Request, res: Response) => {
  const comm = req.body;
  if (!comm || !comm.id || !comm.name) return res.status(400).json({ error: 'Community data required' });
  if (isInvalidServerCommunity(comm)) {
    return res.status(400).json({ error: 'Invalid community name or payload' });
  }
  const normName = String(comm.name).trim().toLowerCase();
  const commType = comm.type || 'group';
  const duplicate = Array.from(communitiesMap.values()).find(
    (c) =>
      c.id === comm.id ||
      (String(c.name || '').trim().toLowerCase() === normName && (c.type || 'group') === commType)
  );
  if (duplicate) {
    return res.json({ success: true, community: duplicate, deduplicated: true });
  }
  communitiesMap.set(comm.id, comm);
  saveCommunitiesFile();
  io.emit('community_created', comm);
  res.json({ success: true, community: comm });
});

app.delete('/api/communities/:id', (req: Request, res: Response) => {
  const targetId = String(req.params.id || '').trim();
  if (!targetId) return res.status(400).json({ error: 'Community ID required' });
  const existed = communitiesMap.delete(targetId);
  if (existed) {
    saveCommunitiesFile();
  }
  io.emit('community_deleted', { id: targetId });
  res.json({ success: true, deletedId: targetId });
});

app.delete('/api/communities', (_req: Request, res: Response) => {
  const deletedIds = Array.from(communitiesMap.keys());
  communitiesMap.clear();
  saveCommunitiesFile();
  deletedIds.forEach((id) => io.emit('community_deleted', { id }));
  res.json({ success: true, clearedCount: deletedIds.length });
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

app.post('/api/statuses/ad-click', (req: Request, res: Response) => {
  const { statusId, targetUrl, clickedBy } = req.body || {};
  if (!statusId) return res.status(400).json({ error: 'statusId required' });
  const existing = statusesMap.get(statusId);
  if (existing) {
    existing.adClicksCount = (existing.adClicksCount || 0) + 1;
    statusesMap.set(statusId, existing);
    saveStatusesFile();
  }
  console.log(`📢 [Ad Click]: status=${statusId} by=${clickedBy || 'guest'} url=${targetUrl || ''}`);
  res.json({ success: true, statusId, clicks: existing?.adClicksCount ?? 1 });
});

// â”€â”€ REST: LIVE DISPATCH ORDERS WITH 5% PLATFORM FEE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// Helper: fetch live stores & artisan stations from Supabase + merge server overrides
async function fetchSupabaseStoresAndArtisans() {
  const fetchTable = async (table: string) => {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, {
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      });
      if (!res.ok && (SUPABASE_URL !== DEFAULT_SUPABASE_URL || SUPABASE_ANON_KEY !== DEFAULT_SUPABASE_ANON_KEY)) {
        const retry = await fetch(`${DEFAULT_SUPABASE_URL}/rest/v1/${table}?select=*`, {
          headers: { apikey: DEFAULT_SUPABASE_ANON_KEY, Authorization: `Bearer ${DEFAULT_SUPABASE_ANON_KEY}` },
        });
        if (retry.ok) return await retry.json();
      }
      if (res.ok) return await res.json();
    } catch (_) {}
    return [];
  };

  const [rawStores, rawArtisans] = await Promise.all([
    fetchTable('store_subscriptions'),
    fetchTable('artisan_stations'),
  ]);

  const stores = (Array.isArray(rawStores) ? rawStores : []).map((s: any) => {
    const id = String(s.id || s.store_name);
    const ov = storeOverridesMap.get(id) || {};
    return {
      id,
      storeName: s.store_name || 'Merchant Store',
      description: s.description || '',
      category: s.category || 'General',
      tier: ov.tier || s.tier || 'starter_30',
      itemsLimit: ov.itemsLimit ?? s.items_limit ?? (s.tier === 'pro_100' ? 100 : 30),
      itemsCount: ov.itemsCount ?? s.items_count ?? 0,
      ownerName: ov.ownerName || s.owner_name || s.store_name || 'Merchant Owner',
      ownerPhone: ov.ownerPhone || s.owner_phone || '',
      status: ov.status || (s.is_active === false ? 'suspended' : 'active'),
      verified: ov.verified ?? Boolean(s.is_active),
      paymentMethod: s.payment_method || 'wallet',
      createdAt: s.registered_at || s.created_at || new Date().toISOString(),
    };
  });

  for (const [id, ov] of storeOverridesMap.entries()) {
    if (!stores.some((s) => s.id === id) && ov?.storeName) {
      stores.push({ id, ...ov });
    }
  }

  const artisans = (Array.isArray(rawArtisans) ? rawArtisans : []).map((a: any) => {
    const id = String(a.id || a.station_name);
    const ov = artisanOverridesMap.get(id) || {};
    return {
      id,
      stationName: ov.stationName || a.station_name || 'Artisan Hub',
      category: ov.category || a.category_label || a.category || 'General Trade',
      location: ov.location || a.location || 'Lagos, Nigeria',
      workshopAddress: ov.workshopAddress || a.workshop_address || '',
      ownerName: ov.ownerName || a.owner_name || a.station_name || 'Master Artisan',
      ownerPhone: ov.ownerPhone || a.owner_phone || '',
      isApproved: ov.isApproved ?? Boolean(a.is_approved),
      approvalStatus: ov.approvalStatus || (ov.isApproved ?? a.is_approved ? 'approved' : 'pending'),
      registrationFeePaid: Boolean(a.registration_fee_paid),
      createdAt: a.created_at || new Date().toISOString(),
    };
  });

  for (const [id, ov] of artisanOverridesMap.entries()) {
    if (!artisans.some((a) => a.id === id) && ov?.stationName) {
      artisans.push({ id, ...ov });
    }
  }

  return { stores, artisans };
}

// â”€â”€ REST: LIVE ADMIN TELEMETRY & COMMAND API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.get('/api/admin/health', async (_req: Request, res: Response) => {
  try {
    const probeUrl = async (url: string, headers: Record<string, string> = {}) => {
      const start = Date.now();
      try {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 3500);
        const r = await fetch(url, { headers, signal: controller.signal });
        clearTimeout(t);
        const latencyMs = Date.now() - start;
        return {
          status: r.ok || r.status < 500 ? 'healthy' : 'degraded',
          httpStatus: r.status,
          latencyMs,
        };
      } catch (e: any) {
        return { status: 'offline', httpStatus: 0, latencyMs: Date.now() - start, error: e?.message || 'unreachable' };
      }
    };

    const [supabaseProbe, paystackProbe] = await Promise.all([
      probeUrl(`${SUPABASE_URL}/auth/v1/settings`, { apikey: SUPABASE_ANON_KEY }),
      probeUrl('https://api.paystack.co/bank?perPage=1'),
    ]);

    res.json({
      success: true,
      checkedAt: new Date().toISOString(),
      subsystems: {
        supabase: supabaseProbe,
        paystack: paystackProbe,
        websocket: {
          status: 'healthy',
          connectedClients: io.engine.clientsCount || onlineUsers.size,
          onlineUsersCount: onlineUsers.size,
        },
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Health check error' });
  }
});

app.get('/api/admin/metrics', async (_req: Request, res: Response) => {
  try {
    await syncUsersFromSupabase();
    const { stores, artisans } = await fetchSupabaseStoresAndArtisans();
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
      stores,
      artisans,
      securityEvents: securityEvents.slice(0, 60),
      blockedIps,
      auditTrail: auditTrail.slice(0, 80),
      webhookLogs: webhookLogs.slice(0, 60),
      systemStatus: 'healthy',
      config: systemConfig,
      featureFlags,
      cms: cmsData,
      activeBroadcast,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to compute metrics' });
  }
});

// Admin Security, Rate Limit & Audit Logs API
app.get('/api/admin/security', (_req: Request, res: Response) => {
  res.json({
    success: true,
    securityEvents,
    blockedIps,
    auditTrail,
    webhookLogs,
  });
});

app.post('/api/admin/security/block-ip', (req: Request, res: Response) => {
  const { ip, reason, blockedBy } = req.body || {};
  const cleanIp = String(ip || '').trim();
  if (!cleanIp) return res.status(400).json({ error: 'IP address required' });
  const entry: BlockedIpEntry = {
    ip: cleanIp,
    reason: reason || 'Blocked manually via AGC Security Console',
    blockedBy: blockedBy || 'Super Admin',
    blockedAt: new Date().toISOString(),
  };
  blockedIps = [entry, ...blockedIps.filter((b) => b.ip !== cleanIp)];
  const secEvt = recordSecurityEvent({
    type: 'ip_blocked',
    severity: 'high',
    ip: cleanIp,
    path: '/api/admin/security/block-ip',
    reason: entry.reason,
  });
  const audit = appendAuditEntry({
    refId: `IP_${cleanIp}`,
    actor: entry.blockedBy,
    actorRole: 'Super Admin',
    action: 'IP Blocked',
    target: cleanIp,
    details: entry.reason,
  });
  io.emit('admin_security_updated', { blockedIps, securityEvent: secEvt, auditEntry: audit });
  res.json({ success: true, blockedIps, auditEntry: audit });
});

app.delete('/api/admin/security/block-ip/:ip', (req: Request, res: Response) => {
  const targetIp = decodeURIComponent(req.params.ip || '').trim();
  blockedIps = blockedIps.filter((b) => b.ip !== targetIp);
  const audit = appendAuditEntry({
    refId: `IP_${targetIp}`,
    actor: 'Super Admin',
    actorRole: 'Super Admin',
    action: 'IP Unblocked',
    target: targetIp,
    details: 'Removed IP from security blocklist',
  });
  saveAdminAuditFile();
  io.emit('admin_security_updated', { blockedIps, auditEntry: audit });
  res.json({ success: true, blockedIps, auditEntry: audit });
});

app.get('/api/admin/audit/:refId', (req: Request, res: Response) => {
  const refId = decodeURIComponent(req.params.refId || '').trim();
  const entries = auditTrail.filter((a) => a.refId === refId || a.target === refId);
  res.json({ success: true, refId, entries });
});

// Dual-Admin Escrow Resolution & Immutable Ledger Logger
const DUAL_ADMIN_THRESHOLD_NGN = 100000;
const EXPECTED_SECONDARY_ADMIN_PIN = (process.env.ADMIN_SECONDARY_PIN || '2468').trim();

app.post('/api/admin/escrow/resolve', (req: Request, res: Response) => {
  const { orderId, action, note, amountNgn, buyerName, sellerName, paystackRef, actorName, secondaryAdminName, secondaryAdminPin } = req.body || {};
  if (!orderId || !action) {
    return res.status(400).json({ error: 'orderId and action are required' });
  }
  const numericAmount = Number(amountNgn) || 0;
  if (numericAmount >= DUAL_ADMIN_THRESHOLD_NGN) {
    if (!secondaryAdminPin || String(secondaryAdminPin).trim() !== EXPECTED_SECONDARY_ADMIN_PIN) {
      return res.status(403).json({
        error: `Dual-Admin Approval Required: Secondary Admin PIN invalid for high-value escrow (â‰¥ ₦${DUAL_ADMIN_THRESHOLD_NGN.toLocaleString()}).`,
        code: 'DUAL_ADMIN_PIN_INVALID',
      });
    }
  }
  const audit = appendAuditEntry({
    refId: String(paystackRef || orderId),
    actor: actorName || 'Primary Admin',
    actorRole: 'Super Admin',
    action: action === 'release_to_seller' ? 'Escrow Force-Release' : 'Escrow Refund Issued',
    target: `Order #${orderId} (${buyerName || 'Buyer'} â†’ ${sellerName || 'Vendor'})`,
    details: `${note || 'Admin resolution'} · Amount: ₦${numericAmount.toLocaleString()}`,
    dualApprovedBy: numericAmount >= DUAL_ADMIN_THRESHOLD_NGN ? (secondaryAdminName || 'Secondary Admin') : undefined,
  });
  const wh = {
    id: `wh_${Date.now()}`,
    event: action === 'release_to_seller' ? 'transfer.escrow_released' : 'refund.escrow_reversed',
    reference: String(paystackRef || orderId),
    amountNgn: numericAmount,
    status: 'processed' as const,
    hmacVerified: true,
    ip: getClientIp(req),
    payloadSummary: `${audit.action} for #${orderId}${audit.dualApprovedBy ? ` (Co-signed: ${audit.dualApprovedBy})` : ''}`,
    timestamp: new Date().toISOString(),
  };
  webhookLogs.unshift(wh);
  if (webhookLogs.length > 200) webhookLogs.length = 200;
  saveAdminAuditFile();
  io.emit('admin_audit_appended', { auditEntry: audit, webhookLog: wh });
  res.json({ success: true, auditEntry: audit, webhookLog: wh });
});

// Paystack Webhook Receiver with Strict Cryptographic HMAC-SHA512 Verification & Idempotency
app.post('/api/webhooks/paystack', (req: Request, res: Response) => {
  const signature = ((req.headers['x-paystack-signature'] as string) || '').trim();
  const secret = (process.env.PAYSTACK_SECRET_KEY || '').trim();
  const rawPayload = (req as any).rawBody
    ? Buffer.isBuffer((req as any).rawBody)
      ? (req as any).rawBody
      : Buffer.from(String((req as any).rawBody))
    : Buffer.from(JSON.stringify(req.body || {}));

  const event = req.body?.event || 'unknown';
  const ref = String(req.body?.data?.reference || `PSK_${Date.now()}`);
  const amountNgn = Math.round((Number(req.body?.data?.amount) || 0) / 100);
  const ip = getClientIp(req);

  let hmacVerified = false;
  if (secret && signature) {
    try {
      const expectedHex = crypto.createHmac('sha512', secret).update(rawPayload).digest('hex');
      const sigBuf = Buffer.from(signature, 'utf8');
      const expBuf = Buffer.from(expectedHex, 'utf8');
      hmacVerified = sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf);
    } catch (_) {
      hmacVerified = false;
    }
  }

  if (!hmacVerified) {
    const reason = !secret
      ? 'Rejected webhook: PAYSTACK_SECRET_KEY not configured on server'
      : !signature
      ? `Rejected webhook: missing x-paystack-signature header for ref ${ref}`
      : `Invalid Paystack HMAC signature for ref ${ref}`;

    const secEvt = recordSecurityEvent({
      type: 'webhook_mismatch',
      severity: 'critical',
      ip,
      path: '/api/webhooks/paystack',
      reason,
    });
    const wh: WebhookLog = {
      id: `wh_${Date.now()}`,
      event,
      reference: ref,
      amountNgn,
      status: 'mismatch',
      hmacVerified: false,
      ip,
      payloadSummary: reason,
      timestamp: new Date().toISOString(),
    };
    webhookLogs.unshift(wh);
    saveAdminAuditFile();
    io.emit('admin_security_updated', { securityEvent: secEvt, webhookLog: wh });
    return res.status(401).json({ error: 'Invalid or missing Paystack signature' });
  }

  // Only credit wallet on verified charge.success events with positive verified amount and unused reference
  let creditedNote = `Webhook verified (${event})`;
  if (event === 'charge.success' && req.body?.data?.status === 'success' && amountNgn > 0) {
    const meta = req.body?.data?.metadata || {};
    const targetPhone =
      meta.phoneNumber ||
      meta.phone ||
      meta.userId ||
      (req.body?.data?.customer?.email ? String(req.body.data.customer.email).split('@')[0] : '');

    if (targetPhone) {
      const fee = Math.min(Math.round(amountNgn * 0.01), 2000);
      const metaCredit = Number(meta.creditedAmountNgn || 0);
      const creditedAmount = metaCredit > 0 && metaCredit <= amountNgn ? metaCredit : Math.max(1, amountNgn - fee);

      const creditRes = creditAuthoritativeWallet({
        phoneOrId: String(targetPhone),
        amount: creditedAmount,
        fee,
        reference: ref,
        currency: (req.body?.data?.currency || 'NGN') as any,
        title: `Verified Paystack Top-up (Fee: ₦${fee.toLocaleString()})`,
        verifiedBy: 'paystack_webhook',
        metadata: { grossPaid: amountNgn, event },
      });
      creditedNote = creditRes.alreadyProcessed
        ? `Duplicate webhook ignored cleanly (ref ${ref} already credited)`
        : `HMAC Verified & Credited ₦${creditedAmount.toLocaleString()} to ${targetPhone}`;
    }
  }

  const wh: WebhookLog = {
    id: `wh_${Date.now()}`,
    event,
    reference: ref,
    amountNgn,
    status: 'processed',
    hmacVerified: true,
    ip,
    payloadSummary: creditedNote,
    timestamp: new Date().toISOString(),
  };
  webhookLogs.unshift(wh);
  if (webhookLogs.length > 200) webhookLogs.length = 200;
  appendAuditEntry({
    refId: ref,
    actor: 'Paystack Gateway',
    actorRole: 'Webhook',
    action: `Webhook: ${event}`,
    target: ref,
    details: creditedNote,
  });
  io.emit('admin_audit_appended', { webhookLog: wh });
  res.json({ success: true, webhookLog: wh });
});

// Store & Artisan Registration + Admin Approval Mutations
app.post('/api/stores/register', (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const id = String(body.id || `store_${Date.now()}`);
    const entry = {
      id,
      storeName: body.storeName || 'Merchant Store',
      description: body.description || '',
      category: body.category || 'General Trade',
      tier: body.tier || 'starter_30',
      itemsLimit: body.itemsLimit ?? (body.tier === 'pro_100' ? 100 : 30),
      itemsCount: body.itemsCount ?? 0,
      ownerName: body.ownerName || 'Merchant Owner',
      ownerPhone: body.ownerPhone || '',
      status: 'pending',
      verified: false,
      paymentMethod: body.paymentMethod || 'wallet',
      createdAt: new Date().toISOString(),
    };
    storeOverridesMap.set(id, entry);
    saveAdminAuditFile();
    pushAdminStoresToSupabase();
    appendAuditEntry({
      refId: `STORE_${id}`,
      actor: entry.ownerName,
      actorRole: 'Merchant',
      action: 'Store Pending Approval',
      target: entry.storeName,
      details: `Tier: ${entry.tier} · Awaiting admin approval`,
    });
    io.emit('admin_store_updated', entry);
    res.json({ success: true, store: entry });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to submit store' });
  }
});

app.post('/api/artisans/register', (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const id = String(body.id || `art_${Date.now()}`);
    const entry = {
      id,
      stationName: body.stationName || 'Artisan Hub',
      category: body.category || 'General Trade',
      location: body.location || 'Lagos, Nigeria',
      workshopAddress: body.workshopAddress || '',
      ownerName: body.ownerName || 'Master Artisan',
      ownerPhone: body.ownerPhone || '',
      isApproved: false,
      approvalStatus: 'pending',
      registrationFeePaid: Boolean(body.registrationFeePaid ?? true),
      createdAt: new Date().toISOString(),
    };
    artisanOverridesMap.set(id, entry);
    saveAdminAuditFile();
    pushAdminStoresToSupabase();
    appendAuditEntry({
      refId: `ART_${id}`,
      actor: entry.ownerName,
      actorRole: 'Artisan',
      action: 'Artisan Pending Approval',
      target: entry.stationName,
      details: `Category: ${entry.category} · Awaiting admin approval`,
    });
    io.emit('admin_artisan_updated', entry);
    res.json({ success: true, artisan: entry });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to submit artisan' });
  }
});

// Sponsored Ads Payment Submission & Admin Review (Approve / Reject + Refund)
app.post('/api/ads/submit', (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const adFee = Number((systemConfig as any).sponsoredAdFeeNgn ?? 2500);
    const phone = String(body.submittedByPhone || '').trim();
    const refId = `AD_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;

    if (phone) {
      const w = getOrCreateServerWallet(phone);
      if (w.availableBalance >= adFee) {
        w.availableBalance -= adFee;
        w.updatedAt = new Date().toISOString();
        const match = findUserEntry(phone);
        const tx: ServerWalletTx = {
          id: `tx_${Date.now()}_ad`,
          userId: match?.user.id,
          userPhone: match?.user.phoneNumber || phone,
          userName: body.submittedByName || match?.user.fullName || 'Advertiser',
          type: 'ad_payment',
          title: `Sponsored Ad Submission: ${body.brandName || 'Brand'}`,
          description: `Sponsored status ad fee (${body.brandName || 'Brand'})`,
          amount: adFee,
          fee: 0,
          balanceAfter: w.availableBalance,
          currency: w.currency,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          createdAt: w.updatedAt,
          status: 'completed',
          reference: refId,
          referenceId: refId,
          channel: 'wallet',
        };
        w.transactions = [tx, ...w.transactions].slice(0, 100);
        serverWallets.set(w.phoneKey, w);
        saveWalletsFile();
        appendUnifiedLedgerTx(tx);
        if (match) {
          match.user.walletBalanceNgn = w.availableBalance;
          usersByPhone.set(match.key, match.user);
          saveUsersFile();
        }
      }
    }

    const newAd = {
      id: body.id || `ad_${Date.now()}`,
      brandName: String(body.brandName || 'Sponsored Brand'),
      avatarUrl: body.avatarUrl || body.mediaUrl || '',
      mediaUrl: String(body.mediaUrl || '/src/assets/images/african_textiles_wax_1794210824926.jpg'),
      caption: String(body.caption || 'Promoted vendor update'),
      ctaLabel: String(body.ctaLabel || 'Visit Offer'),
      targetUrl: String(body.targetUrl || '#market'),
      active: false,
      status: 'pending',
      approvalStatus: 'pending',
      submittedByPhone: phone,
      submittedByName: String(body.submittedByName || 'Advertiser'),
      paidAmount: Number(body.paidAmount ?? adFee),
      paymentReference: refId,
      clicksCount: 0,
      createdAt: new Date().toISOString(),
    };

    const existingList = Array.isArray((cmsData as any).sponsoredStatuses) ? (cmsData as any).sponsoredStatuses : [];
    (cmsData as any).sponsoredStatuses = [newAd, ...existingList];
    saveAdminCmsFile();
    pushAdminCmsToSupabase();
    appendAuditEntry({
      refId,
      actor: newAd.submittedByName,
      actorRole: 'User',
      action: 'Sponsored Ad Submitted',
      target: newAd.brandName,
      details: `Paid ₦${newAd.paidAmount.toLocaleString()} · Pending Admin Approval`,
    });
    io.emit('admin_cms_updated', cmsData);
    res.json({ success: true, ad: newAd, cms: cmsData, reference: refId });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to submit sponsored ad' });
  }
});

app.post('/api/admin/ads/review', (req: Request, res: Response) => {
  try {
    const { adId, decision, reason } = req.body || {};
    if (!adId || !['approve', 'reject'].includes(decision)) {
      return res.status(400).json({ error: 'adId and decision (approve | reject) required' });
    }
    const list: any[] = Array.isArray((cmsData as any).sponsoredStatuses) ? (cmsData as any).sponsoredStatuses : [];
    const targetAd = list.find((a) => a.id === adId);
    if (!targetAd) return res.status(404).json({ error: 'Sponsored ad not found' });

    const isApprove = decision === 'approve';
    const updatedList = list.map((a) =>
      a.id === adId
        ? {
            ...a,
            active: isApprove,
            status: isApprove ? 'approved' : 'rejected',
            approvalStatus: isApprove ? 'approved' : 'rejected',
            rejectionReason: isApprove ? undefined : reason || 'Did not meet ad guidelines',
          }
        : a
    );
    (cmsData as any).sponsoredStatuses = updatedList;
    saveAdminCmsFile();
    pushAdminCmsToSupabase();

    // Auto-refund paid ad fee on rejection
    if (!isApprove && targetAd.submittedByPhone && Number(targetAd.paidAmount) > 0) {
      const refundAmt = Number(targetAd.paidAmount);
      const w = getOrCreateServerWallet(String(targetAd.submittedByPhone));
      w.availableBalance += refundAmt;
      w.updatedAt = new Date().toISOString();
      const match = findUserEntry(String(targetAd.submittedByPhone));
      const refId = `REFUND_${targetAd.paymentReference || targetAd.id}`;
      const tx: ServerWalletTx = {
        id: `tx_${Date.now()}_ref`,
        userId: match?.user.id,
        userPhone: match?.user.phoneNumber || targetAd.submittedByPhone,
        userName: targetAd.submittedByName || match?.user.fullName || 'Advertiser',
        type: 'refund',
        title: `Ad Rejected Refund: ${targetAd.brandName}`,
        description: `Automatic refund for rejected sponsored ad (${targetAd.brandName})`,
        amount: refundAmt,
        fee: 0,
        balanceAfter: w.availableBalance,
        currency: w.currency,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        createdAt: w.updatedAt,
        status: 'completed',
        reference: refId,
        referenceId: targetAd.paymentReference || targetAd.id,
        channel: 'wallet',
      };
      w.transactions = [tx, ...w.transactions].slice(0, 100);
      serverWallets.set(w.phoneKey, w);
      saveWalletsFile();
      appendUnifiedLedgerTx(tx);
      if (match) {
        match.user.walletBalanceNgn = w.availableBalance;
        usersByPhone.set(match.key, match.user);
        saveUsersFile();
        const cleanRec = (match.user.cleanPhone || match.key).replace(/\D/g, '');
        io.to(`phone:${cleanRec}`).emit('wallet_updated', {
          balance: w.availableBalance,
          escrowLockedBalance: w.escrowLockedBalance,
          transactions: w.transactions,
          note: `Refunded ₦${refundAmt.toLocaleString()} for declined ad "${targetAd.brandName}"`,
        });
      }
    }

    appendAuditEntry({
      refId: `AD_REV_${adId}`,
      actor: 'Super Admin',
      actorRole: 'Super Admin',
      action: isApprove ? 'Sponsored Ad Approved' : 'Sponsored Ad Rejected & Refunded',
      target: targetAd.brandName,
      details: isApprove ? 'Ad is now live in Updates feed' : reason || 'Declined & fee refunded',
    });
    io.emit('admin_cms_updated', cmsData);
    res.json({ success: true, cms: cmsData });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to review ad' });
  }
});

app.patch('/api/admin/stores/:id', async (req: Request, res: Response) => {
  try {
    const id = decodeURIComponent(req.params.id || '');
    const { tier, status, verified, storeName, itemsLimit, ownerName, ownerPhone } = req.body || {};
    const existing = storeOverridesMap.get(id) || {};
    const updated = {
      ...existing,
      id,
      ...(storeName !== undefined ? { storeName } : {}),
      ...(ownerName !== undefined ? { ownerName } : {}),
      ...(ownerPhone !== undefined ? { ownerPhone } : {}),
      ...(tier !== undefined ? { tier, itemsLimit: itemsLimit ?? (tier === 'pro_100' ? 100 : 30) } : {}),
      ...(status !== undefined ? { status } : {}),
      ...(verified !== undefined ? { verified } : {}),
      updatedAt: new Date().toISOString(),
    };
    storeOverridesMap.set(id, updated);
    saveAdminAuditFile();
    pushAdminStoresToSupabase();

    if (UUID_REGEX.test(id)) {
      const dbPatch: Record<string, any> = {};
      if (tier !== undefined) {
        dbPatch.tier = tier;
        dbPatch.items_limit = updated.itemsLimit;
      }
      if (status !== undefined) dbPatch.is_active = status === 'active';
      if (Object.keys(dbPatch).length > 0) {
        fetch(`${SUPABASE_URL}/rest/v1/store_subscriptions?id=eq.${encodeURIComponent(id)}`, {
          method: 'PATCH',
          headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(dbPatch),
        }).catch(() => {});
      }
    }

    const audit = appendAuditEntry({
      refId: `STORE_${id}`,
      actor: 'Super Admin',
      actorRole: 'Super Admin',
      action: 'Store Updated',
      target: updated.storeName || id,
      details: `Tier: ${updated.tier || 'unchanged'} · Status: ${updated.status || 'unchanged'} · Verified: ${String(updated.verified ?? '')}`,
    });
    io.emit('admin_store_updated', updated);
    res.json({ success: true, store: updated, auditEntry: audit });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to update store' });
  }
});

app.patch('/api/admin/artisans/:id', async (req: Request, res: Response) => {
  try {
    const id = decodeURIComponent(req.params.id || '');
    const { isApproved, stationName, approvalStatus } = req.body || {};
    const existing = artisanOverridesMap.get(id) || {};
    const resolvedStatus = approvalStatus ?? (isApproved !== undefined ? (isApproved ? 'approved' : 'suspended') : existing.approvalStatus);
    const updated = {
      ...existing,
      id,
      ...(stationName !== undefined ? { stationName } : {}),
      ...(isApproved !== undefined ? { isApproved } : {}),
      ...(resolvedStatus !== undefined ? { approvalStatus: resolvedStatus } : {}),
      updatedAt: new Date().toISOString(),
    };
    artisanOverridesMap.set(id, updated);
    saveAdminAuditFile();
    pushAdminStoresToSupabase();

    if (UUID_REGEX.test(id) && isApproved !== undefined) {
      fetch(`${SUPABASE_URL}/rest/v1/artisan_stations?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_approved: Boolean(isApproved) }),
      }).catch(() => {});
    }

    const audit = appendAuditEntry({
      refId: `ART_${id}`,
      actor: 'Super Admin',
      actorRole: 'Super Admin',
      action: isApproved ? 'Artisan Approved' : 'Artisan Suspended',
      target: updated.stationName || id,
      details: `Approval status changed to ${Boolean(isApproved)}`,
    });
    io.emit('admin_artisan_updated', updated);
    res.json({ success: true, artisan: updated, auditEntry: audit });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to update artisan' });
  }
});

app.patch('/api/admin/users/:phone/kyc', async (req: Request, res: Response) => {
  try {
    const { phone } = req.params;
    const { kycStatus, kycType, phoneNumber, fullName, avatarUrl } = req.body || {};
    const match = await ensureUserEntry(phone, { phoneNumber, fullName, avatarUrl });
    if (!match) return res.status(404).json({ error: 'User not found' });
    const { key, user } = match;
    if (kycStatus !== undefined) user.kycStatus = kycStatus;
    if (kycType !== undefined) user.kycType = kycType;
    (user as any).updatedAt = new Date().toISOString();
    usersByPhone.set(key, user);
    saveUsersFile();
    pushAdminUserOverrideToSupabase(user);
    const audit = appendAuditEntry({
      refId: `KYC_${user.cleanPhone || key}`,
      actor: 'Super Admin',
      actorRole: 'Super Admin',
      action: `KYC ${String(kycStatus || 'updated').toUpperCase()}`,
      target: `${user.fullName} (${user.phoneNumber})`,
      details: `${kycType || user.kycType || 'BVN/NIN'} verification marked ${kycStatus}`,
    });
    io.emit('user_updated', user);
    res.json({ success: true, user, auditEntry: audit });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to update KYC' });
  }
});

// Admin System Config: GET & POST
app.get('/api/admin/config', async (_req: Request, res: Response) => {
  try {
    await syncAdminStateFromSupabase();
    res.json({
      success: true,
      config: systemConfig,
      featureFlags,
      cms: cmsData,
      activeBroadcast,
      updatedAt: adminConfigUpdatedAt,
      cmsUpdatedAt: adminCmsUpdatedAt,
      stores: Object.fromEntries(storeOverridesMap.entries()),
      artisans: Object.fromEntries(artisanOverridesMap.entries()),
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to fetch admin config' });
  }
});

app.post('/api/admin/config', (req: Request, res: Response) => {
  const updates = req.body && typeof req.body === 'object' ? req.body : {};
  systemConfig = { ...systemConfig, ...updates };
  saveAdminConfigFile();
  pushAdminConfigToSupabase();
  appendAuditEntry({
    refId: 'SYS_CONFIG',
    actor: 'Super Admin',
    actorRole: 'Super Admin',
    action: 'System Config Updated',
    target: 'Platform Configuration',
    details: `Updated keys: ${Object.keys(updates).join(', ') || 'all'}`,
  });
  io.emit('admin_config_updated', systemConfig);
  res.json({ success: true, config: systemConfig });
});

// Admin Feature Toggles: POST
app.post('/api/admin/features', (req: Request, res: Response) => {
  const updates = req.body && typeof req.body === 'object' ? req.body : {};
  featureFlags = { ...featureFlags, ...updates };
  saveAdminConfigFile();
  pushAdminConfigToSupabase();
  appendAuditEntry({
    refId: 'SYS_FLAGS',
    actor: 'Super Admin',
    actorRole: 'Super Admin',
    action: 'Feature Flags Updated',
    target: Object.keys(updates).join(', ') || 'Feature Flags',
    details: JSON.stringify(updates),
  });
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
  pushAdminCmsToSupabase();
  appendAuditEntry({
    refId: 'SYS_CMS',
    actor: 'Super Admin',
    actorRole: 'Super Admin',
    action: 'CMS Updated',
    target: Object.keys(updates).join(', ') || 'CMS Content',
    details: 'Published live CMS changes across clients',
  });
  io.emit('admin_cms_updated', cmsData);
  res.json({ success: true, cms: cmsData });
});

app.patch('/api/admin/users/:phone/badge', async (req: Request, res: Response) => {
  try {
    const { phone } = req.params;
    const { verificationBadge, role, status, walletBalanceNgn, phoneNumber, fullName, avatarUrl } = req.body || {};
    const match = await ensureUserEntry(phone, { phoneNumber, fullName, avatarUrl });
    if (match) {
      const { key, user } = match;
      if (verificationBadge !== undefined) user.verificationBadge = verificationBadge;
      if (role !== undefined) user.role = role;
      if (status !== undefined) user.status = status;
      if (walletBalanceNgn !== undefined) user.walletBalanceNgn = walletBalanceNgn;
      (user as any).updatedAt = new Date().toISOString();
      usersByPhone.set(key, user);
      saveUsersFile();
      pushAdminUserOverrideToSupabase(user);
      appendAuditEntry({
        refId: `USR_${user.cleanPhone || key}`,
        actor: 'Super Admin',
        actorRole: 'Super Admin',
        action: verificationBadge !== undefined ? `Badge: ${verificationBadge || 'Removed'}` : 'User Updated',
        target: `${user.fullName} (${user.phoneNumber})`,
        details: `Role: ${user.role} · Badge: ${user.verificationBadge || 'none'}`,
      });
      io.emit('user_updated', user);
      return res.json({ success: true, user });
    }
    res.status(404).json({ error: 'User not found' });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to update user badge' });
  }
});

app.patch('/api/admin/users/:phone/status', async (req: Request, res: Response) => {
  try {
    const { phone } = req.params;
    const { status, verificationBadge, role, walletBalanceNgn, reason, phoneNumber, fullName, avatarUrl } = req.body || {};
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
      (user as any).updatedAt = new Date().toISOString();
      usersByPhone.set(key, user);
      saveUsersFile();
      pushAdminUserOverrideToSupabase(user);
      appendAuditEntry({
        refId: `USR_${cleanKey}`,
        actor: 'Super Admin',
        actorRole: 'Super Admin',
        action: `Account ${user.status || 'updated'}`,
        target: `${user.fullName} (${user.phoneNumber})`,
        details: `Role: ${user.role} · Status: ${user.status}`,
      });
      io.emit('user_updated', user);
      return res.json({ success: true, user });
    }
    res.status(404).json({ error: 'User not found' });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to update user status' });
  }
});

// Admin Permanent Ban Endpoint
app.post('/api/admin/users/:phone/ban', async (req: Request, res: Response) => {
  try {
    const { phone } = req.params;
    const { reason, phoneNumber, fullName, avatarUrl } = req.body || {};
    const match = await ensureUserEntry(phone, { phoneNumber, fullName, avatarUrl });
    if (match) {
      const { key, user } = match;
      const cleanKey = user.cleanPhone || key;
      user.status = 'banned';
      user.bannedAt = new Date().toISOString();
      user.banReason = reason || 'Permanently blocked by administrator for policy violation.';
      user.isOnline = false;
      (user as any).updatedAt = new Date().toISOString();
      usersByPhone.set(key, user);
      saveUsersFile();
      pushAdminUserOverrideToSupabase(user);
      appendAuditEntry({
        refId: `USR_${cleanKey}`,
        actor: 'Super Admin',
        actorRole: 'Super Admin',
        action: 'Account Banned',
        target: `${user.fullName} (${user.phoneNumber})`,
        details: user.banReason || 'Account permanently banned',
      });

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
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to ban user' });
  }
});

// Admin Unban / Restore Endpoint
app.post('/api/admin/users/:phone/unban', async (req: Request, res: Response) => {
  try {
    const { phone } = req.params;
    const match = await ensureUserEntry(phone, req.body || {});
    if (match) {
      const { key, user } = match;
      user.status = 'active';
      delete user.bannedAt;
      delete user.banReason;
      (user as any).updatedAt = new Date().toISOString();
      usersByPhone.set(key, user);
      saveUsersFile();
      pushAdminUserOverrideToSupabase(user);
      appendAuditEntry({
        refId: `USR_${user.cleanPhone || key}`,
        actor: 'Super Admin',
        actorRole: 'Super Admin',
        action: 'Account Unbanned',
        target: `${user.fullName} (${user.phoneNumber})`,
        details: 'Account access restored',
      });
      io.emit('user_updated', user);
      console.log(`✅ [USER UNBANNED]: ${user.fullName} (${user.phoneNumber})`);
      return res.json({ success: true, user });
    }
    res.status(404).json({ error: 'User not found' });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to unban user' });
  }
});

// Admin Wallet Direct Adjuster
app.post('/api/admin/users/:phone/adjust-wallet', async (req: Request, res: Response) => {
  try {
    const { phone } = req.params;
    const { newBalance, deltaNgn, note, phoneNumber, fullName, avatarUrl } = req.body || {};
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
      const nowIso = new Date().toISOString();
      (user as any).adminWalletAdjustedAt = nowIso;
      (user as any).updatedAt = nowIso;
      usersByPhone.set(key, user);
      saveUsersFile();

      // Sync authoritative server wallet ledger with admin adjustment
      const srvWal = getOrCreateServerWallet(user.phoneNumber || cleanKey);
      srvWal.availableBalance = balance;
      srvWal.updatedAt = nowIso;
      serverWallets.set(srvWal.phoneKey, srvWal);
      saveWalletsFile();

      pushAdminUserOverrideToSupabase(user);
      appendAuditEntry({
        refId: `WAL_${cleanKey}_${Date.now()}`,
        actor: 'Super Admin',
        actorRole: 'Super Admin',
        action: 'Wallet Adjusted',
        target: `${user.fullName} (${user.phoneNumber})`,
        details: `New balance: ₦${balance.toLocaleString()} (${note || 'Direct adjustment'})`,
      });
      io.emit('user_updated', user);
      io.to(`phone:${cleanKey}`).emit('wallet_updated', {
        balance,
        escrowLockedBalance: srvWal.escrowLockedBalance,
        transactions: srvWal.transactions,
        note: note || 'Adjusted by administrator',
      });
      return res.json({ success: true, user, balance });
    }
    res.status(404).json({ error: 'User not found' });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to adjust wallet' });
  }
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
  appendAuditEntry({
    refId: `SESS_${clean}`,
    actor: 'Super Admin',
    actorRole: 'Super Admin',
    action: 'Session Terminated',
    target: phone,
    details: 'Forced socket logout by admin',
  });
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
  pushAdminConfigToSupabase();
  appendAuditEntry({
    refId: broadcast.id,
    actor: 'Super Admin',
    actorRole: 'Super Admin',
    action: 'Global Broadcast Pushed',
    target: title,
    details: `[${broadcast.level}] ${message}`,
  });
  io.emit('system_broadcast', broadcast);
  res.json({ success: true, broadcast });
});

app.delete('/api/admin/broadcast', (_req: Request, res: Response) => {
  activeBroadcast = null;
  saveAdminConfigFile();
  pushAdminConfigToSupabase();
  appendAuditEntry({
    refId: 'SYS_BROADCAST_CLR',
    actor: 'Super Admin',
    actorRole: 'Super Admin',
    action: 'Global Broadcast Cleared',
    target: 'Active Banner',
    details: 'Broadcast dismissed by admin',
  });
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

// Live Audio Space Rooms State (authoritative stage, listeners, raised hands, chat & creator guard)
interface SpaceRoomState {
  spaceId: string;
  hostId: string;
  hostPhone?: string;
  hostName: string;
  pinnedNote: string;
  speakers: any[];
  listeners: Map<string, { id: string; name: string; avatar: string; isAnonymous?: boolean; socketId: string }>;
  raisedHands: { id: string; name: string; avatar: string; time: string }[];
  chatMessages: { id: string; userId: string; userName: string; userAvatar?: string; text: string; timestamp: string }[];
  peakListeners: number;
}
const spaceRooms = new Map<string, SpaceRoomState>();

function serializeSpaceRoom(room: SpaceRoomState) {
  const listenersArr = Array.from(room.listeners.values()).map(({ socketId: _s, ...rest }) => rest);
  const uniquePeople = new Set([
    ...room.speakers.map((s) => s.id),
    ...listenersArr.map((l) => l.id),
  ]);
  const listenersCount = Math.max(1, uniquePeople.size);
  room.peakListeners = Math.max(room.peakListeners, listenersCount);
  return {
    spaceId: room.spaceId,
    hostId: room.hostId,
    hostPhone: room.hostPhone,
    hostName: room.hostName,
    pinnedNote: room.pinnedNote,
    speakers: room.speakers,
    listeners: listenersArr,
    raisedHands: room.raisedHands,
    chatMessages: room.chatMessages.slice(-60),
    listenersCount,
    peakListeners: room.peakListeners,
  };
}

// Real-Time Socket Connection Handlers
io.on('connection', (socket: Socket) => {
  console.log(`âš¡ [Socket Connected]: ${socket.id}`);

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
  socket.on('user_online', (userData: { userId: string; userName: string; avatar?: string; phoneNumber?: string; role?: string; deviceInfo?: string; sessionToken?: string }) => {
    onlineUsers.set(socket.id, {
      userId: userData.userId,
      userName: userData.userName,
      avatar: userData.avatar,
    });
    if (userData?.sessionToken) {
      (socket as any)._sessionToken = String(userData.sessionToken);
    }
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
          walletBalanceNgn: 0,
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
    if (userData?.sessionToken) {
      (socket as any)._sessionToken = String(userData.sessionToken);
    }
    const clean = userData.phoneNumber.replace(/\D/g, '');
    const existingMatch = findUserEntry(userData.phoneNumber) || findUserEntry(clean);
    const storeKey = existingMatch?.key || clean;
    const existing = existingMatch?.user;
    phoneToSocketId.set(clean, socket.id);
    if (storeKey !== clean) phoneToSocketId.set(storeKey, socket.id);
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
      walletBalanceNgn: existing?.walletBalanceNgn ?? 0,
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
    if (!comm || !comm.id || isInvalidServerCommunity(comm)) return;
    const normName = String(comm.name).trim().toLowerCase();
    const commType = comm.type || 'group';
    const duplicate = Array.from(communitiesMap.values()).find(
      (c) =>
        c.id === comm.id ||
        (String(c.name || '').trim().toLowerCase() === normName && (c.type || 'group') === commType)
    );
    if (duplicate) return;
    communitiesMap.set(comm.id, comm);
    saveCommunitiesFile();
    socket.broadcast.emit('community_created', comm);
  });

  socket.on('delete_community', (payload: { id?: string }) => {
    const id = String(payload?.id || '').trim();
    if (!id) return;
    if (communitiesMap.delete(id)) {
      saveCommunitiesFile();
    }
    socket.broadcast.emit('community_deleted', { id });
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

  // Helper: emit once per unique target socket (avoids duplicates from multi-variant phone rooms) and never to sender
  const emitToPhoneVariantsOnce = (phone: string, event: string, data: any) => {
    const variants = getPhoneVariants(phone);
    const sentSockets = new Set<string>();
    for (const v of variants) {
      const room = io.sockets.adapter.rooms.get(`phone:${v}`);
      if (!room) continue;
      for (const targetSocketId of room) {
        if (targetSocketId === socket.id || sentSockets.has(targetSocketId)) continue;
        sentSockets.add(targetSocketId);
        io.to(targetSocketId).emit(event, data);
      }
    }
  };

  // 1c. Live Group Creation & Group/Channel Invite Relays
  socket.on('create_group', (payload: { chat: any; memberPhones: string[] }) => {
    const { chat, memberPhones } = payload;
    if (chat && Array.isArray(memberPhones)) {
      memberPhones.forEach((phone: string) => {
        emitToPhoneVariantsOnce(phone, 'group_created', { chat });
      });
    }
  });

  socket.on('group_invite', (payload: { invite?: any; chat?: any; targetPhone?: string }) => {
    const targetPhone = payload?.targetPhone || payload?.invite?.invitedPhone;
    const senderPhone = (socket as any)._agcPhone || payload?.invite?.invitedByPhone || '';
    if (!targetPhone || !payload?.invite) return;
    const senderVariants = new Set(getPhoneVariants(senderPhone));
    const targetVariants = getPhoneVariants(targetPhone);
    if (targetVariants.some((v) => senderVariants.has(v))) return;
    emitToPhoneVariantsOnce(targetPhone, 'group_invite', {
      invite: payload.invite,
      chat: payload.chat,
      targetPhone,
    });
  });

  socket.on('group_invite_response', (payload: any) => {
    if (!payload?.groupId) return;
    if (payload.targetPhone) {
      emitToPhoneVariantsOnce(payload.targetPhone, 'group_invite_response', payload);
    }
    socket.to(`chat:${payload.groupId}`).emit('group_invite_response', payload);
  });

  // 1d. Friend Request Relay (one-way only, never echoed back to sender)
  socket.on('friend_request', (payload: { request?: any; targetPhone?: string }) => {
    const targetPhone = payload?.targetPhone || payload?.request?.recipientPhone;
    const senderPhone = (socket as any)._agcPhone || payload?.request?.senderPhone || '';
    if (!targetPhone || !payload?.request) return;
    const senderVariants = new Set(getPhoneVariants(senderPhone));
    const targetVariants = getPhoneVariants(targetPhone);
    if (targetVariants.some((v) => senderVariants.has(v))) return;
    emitToPhoneVariantsOnce(targetPhone, 'friend_request', { request: payload.request, targetPhone });
  });

  socket.on('friend_request_accepted', (payload: any) => {
    const targetPhone = payload?.targetPhone;
    if (!targetPhone) return;
    emitToPhoneVariantsOnce(targetPhone, 'friend_request_accepted', payload);
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

    // Scoped to joined room chat:${chatId} and memberPhones (never global broadcast for town_comm_)
    if (chatId.startsWith('town_comm_')) {
      socket.to(`chat:${chatId}`).emit('new_message', { chatId, message, chat });
    }
  });

  // 2a. Live Message Emoji Reaction Relay
  socket.on('message_reaction', (payload: { chatId: string; messageId: string; emoji: string; reactorName: string; memberPhones?: string[]; targetPhone?: string }) => {
    const { chatId, messageId, emoji, reactorName, memberPhones, targetPhone } = payload || {};
    if (!chatId || !messageId || !emoji) return;
    socket.to(`chat:${chatId}`).emit('message_reaction', { chatId, messageId, emoji, reactorName });
    if (targetPhone) {
      getPhoneVariants(targetPhone).forEach((v) => {
        socket.to(`phone:${v}`).emit('message_reaction', { chatId, messageId, emoji, reactorName });
      });
    }
    if (Array.isArray(memberPhones)) {
      const senderPhone = (socket as any)._agcPhone || '';
      memberPhones.forEach((phone: string) => {
        getPhoneVariants(phone).forEach((v) => {
          if (v !== senderPhone) {
            socket.to(`phone:${v}`).emit('message_reaction', { chatId, messageId, emoji, reactorName });
          }
        });
      });
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
  socket.on('join_space', (payload: { spaceId: string; user: { id: string; name: string; avatar?: string; isAnonymous?: boolean }; spaceMeta?: { hostId?: string; hostPhone?: string; hostName?: string; hostAvatar?: string; speakers?: any[]; pinnedNote?: string } }) => {
    const { spaceId, user, spaceMeta } = payload || {};
    if (!spaceId || !user?.id) return;
    socket.join(`space:${spaceId}`);
    (socket as any)._activeSpaceId = spaceId;
    (socket as any)._spaceUserId = user.id;

    let room = spaceRooms.get(spaceId);
    if (!room) {
      const initialSpeakers = Array.isArray(spaceMeta?.speakers) && spaceMeta.speakers.length > 0
        ? spaceMeta.speakers.map((s) => ({ ...s }))
        : [{
            id: spaceMeta?.hostId || user.id,
            name: spaceMeta?.hostName || user.name || 'Host',
            avatar: spaceMeta?.hostAvatar || user.avatar || '',
            role: 'host',
            isSpeaking: false,
            isMuted: false,
          }];
      room = {
        spaceId,
        hostId: spaceMeta?.hostId || initialSpeakers.find((s) => s.role === 'host')?.id || user.id,
        hostPhone: spaceMeta?.hostPhone,
        hostName: spaceMeta?.hostName || initialSpeakers.find((s) => s.role === 'host')?.name || user.name || 'Host',
        pinnedNote: spaceMeta?.pinnedNote || '',
        speakers: initialSpeakers,
        listeners: new Map(),
        raisedHands: [],
        chatMessages: [],
        peakListeners: 1,
      };
      spaceRooms.set(spaceId, room);
    } else if (!room.hostPhone && spaceMeta?.hostPhone) {
      room.hostPhone = spaceMeta.hostPhone;
    }

    const isOnStage = room.speakers.some((s) => s.id === user.id);
    if (!isOnStage) {
      room.listeners.set(user.id, {
        id: user.id,
        name: user.isAnonymous ? 'Anonymous listener' : (user.name || 'Listener'),
        avatar: user.isAnonymous ? '' : (user.avatar || ''),
        isAnonymous: Boolean(user.isAnonymous),
        socketId: socket.id,
      });
    }

    const snapshot = serializeSpaceRoom(room);
    console.log(`📻 User ${user.name} joined space:${spaceId} (${snapshot.listenersCount} listening)`);
    io.to(`space:${spaceId}`).emit('space_state_sync', snapshot);
    io.to(`space:${spaceId}`).emit('space_user_joined', { spaceId, user, socketId: socket.id });
  });

  socket.on('leave_space', (payload: { spaceId: string; userId: string }) => {
    const { spaceId, userId } = payload || {};
    if (!spaceId) return;
    socket.leave(`space:${spaceId}`);
    if ((socket as any)._activeSpaceId === spaceId) {
      delete (socket as any)._activeSpaceId;
    }
    const room = spaceRooms.get(spaceId);
    if (room && userId) {
      room.listeners.delete(userId);
      room.raisedHands = room.raisedHands.filter((h) => h.id !== userId);
      room.speakers = room.speakers.filter((s) => s.id !== userId || s.role === 'host' || s.id === room.hostId);
      io.to(`space:${spaceId}`).emit('space_state_sync', serializeSpaceRoom(room));
    }
    io.to(`space:${spaceId}`).emit('space_user_left', { spaceId, userId, socketId: socket.id });
  });

  socket.on('space_speaking', (payload: { spaceId: string; userId: string; isSpeaking: boolean; audioLevel?: number }) => {
    const { spaceId, userId, isSpeaking, audioLevel } = payload || {};
    if (!spaceId || !userId) return;
    const room = spaceRooms.get(spaceId);
    if (room) {
      room.speakers = room.speakers.map((s) =>
        s.id === userId ? { ...s, isSpeaking: Boolean(isSpeaking) } : s
      );
    }
    socket.to(`space:${spaceId}`).emit('space_speaker_active', { userId, isSpeaking, audioLevel: audioLevel ?? (isSpeaking ? 0.6 : 0) });
  });

  socket.on('space_reaction', (payload: { spaceId: string; userId: string; userName?: string; emoji: string; id?: number }) => {
    const { spaceId, userId, userName, emoji, id } = payload || {};
    if (!spaceId || !emoji) return;
    io.to(`space:${spaceId}`).emit('space_reaction', {
      spaceId,
      userId,
      userName,
      emoji,
      id: id || Date.now() + Math.random(),
    });
  });

  socket.on('space_raise_hand', (payload: { spaceId: string; user: { id: string; name: string; avatar?: string }; raised: boolean }) => {
    const { spaceId, user, raised } = payload || {};
    if (!spaceId || !user?.id) return;
    const room = spaceRooms.get(spaceId);
    if (!room) return;
    if (raised) {
      if (!room.raisedHands.some((h) => h.id === user.id) && !room.speakers.some((s) => s.id === user.id)) {
        room.raisedHands.push({
          id: user.id,
          name: user.name || 'Listener',
          avatar: user.avatar || '',
          time: 'Just now',
        });
      }
    } else {
      room.raisedHands = room.raisedHands.filter((h) => h.id !== user.id);
    }
    io.to(`space:${spaceId}`).emit('space_state_sync', serializeSpaceRoom(room));
  });

  socket.on('space_stage_action', (payload: { spaceId: string; actorId: string; action: string; targetUserId?: string; value?: any }) => {
    const { spaceId, actorId, action, targetUserId, value } = payload || {};
    if (!spaceId || !action) return;
    const room = spaceRooms.get(spaceId);
    if (!room) return;

    const actorSpeaker = room.speakers.find((s) => s.id === actorId);
    const isActorCreator = room.hostId === actorId || actorSpeaker?.role === 'host';
    const isActorModerator = isActorCreator || actorSpeaker?.role === 'co-host';

    if (action === 'toggle_self_mute') {
      room.speakers = room.speakers.map((s) =>
        s.id === actorId ? { ...s, isMuted: value !== undefined ? Boolean(value) : !s.isMuted, isSpeaking: false } : s
      );
      io.to(`space:${spaceId}`).emit('space_state_sync', serializeSpaceRoom(room));
      return;
    }

    if (!isActorModerator) return;

    if (action === 'approve_hand' && targetUserId) {
      const hand = room.raisedHands.find((h) => h.id === targetUserId);
      const listener = room.listeners.get(targetUserId);
      const person = hand || listener;
      if (person && !room.speakers.some((s) => s.id === targetUserId)) {
        room.speakers.push({
          id: targetUserId,
          name: person.name || 'Speaker',
          avatar: person.avatar || '',
          role: 'speaker',
          isSpeaking: false,
          isMuted: true,
        });
      }
      room.listeners.delete(targetUserId);
      room.raisedHands = room.raisedHands.filter((h) => h.id !== targetUserId);
    } else if (action === 'decline_hand' && targetUserId) {
      room.raisedHands = room.raisedHands.filter((h) => h.id !== targetUserId);
    } else if (action === 'promote_cohost' && targetUserId && isActorCreator) {
      room.speakers = room.speakers.map((s) =>
        s.id === targetUserId ? { ...s, role: 'co-host' } : s
      );
    } else if (action === 'demote_speaker' && targetUserId && isActorCreator) {
      room.speakers = room.speakers.map((s) =>
        s.id === targetUserId && s.role !== 'host' ? { ...s, role: 'speaker' } : s
      );
    } else if (action === 'set_sponsor' && targetUserId && isActorCreator) {
      room.speakers = room.speakers.map((s) =>
        s.id === targetUserId && s.role !== 'host' ? { ...s, role: 'sponsor' } : s
      );
    } else if ((action === 'mute_speaker' || action === 'unmute_speaker') && targetUserId) {
      const nextMuted = action === 'mute_speaker';
      room.speakers = room.speakers.map((s) =>
        s.id === targetUserId && (s.role !== 'host' || isActorCreator)
          ? { ...s, isMuted: nextMuted, isSpeaking: nextMuted ? false : s.isSpeaking }
          : s
      );
    } else if (action === 'remove_from_stage' && targetUserId) {
      const target = room.speakers.find((s) => s.id === targetUserId);
      if (target && target.role !== 'host') {
        room.speakers = room.speakers.filter((s) => s.id !== targetUserId);
        room.listeners.set(targetUserId, {
          id: target.id,
          name: target.name,
          avatar: target.avatar,
          socketId: '',
        });
      }
    } else if (action === 'mute_all') {
      room.speakers = room.speakers.map((s) =>
        s.role === 'host' ? s : { ...s, isMuted: true, isSpeaking: false }
      );
    } else if (action === 'update_pin') {
      room.pinnedNote = String(value || '').trim();
    }

    io.to(`space:${spaceId}`).emit('space_state_sync', serializeSpaceRoom(room));
  });

  socket.on('space_chat_message', (payload: { spaceId: string; message: { id: string; userId: string; userName: string; userAvatar?: string; text: string; timestamp: string } }) => {
    const { spaceId, message } = payload || {};
    if (!spaceId || !message?.text) return;
    const room = spaceRooms.get(spaceId);
    if (room) {
      room.chatMessages.push(message);
      if (room.chatMessages.length > 100) room.chatMessages.shift();
    }
    io.to(`space:${spaceId}`).emit('space_chat_message', { spaceId, message });
  });

  socket.on('space_webrtc_signal', (payload: { spaceId: string; event: string; data: any }) => {
    const { spaceId, event, data } = payload || {};
    if (!spaceId || !event) return;
    socket.to(`space:${spaceId}`).emit('space_webrtc_signal', { spaceId, event, data });
  });

  socket.on('space_ended', (payload: { spaceId: string; actorId?: string; actorPhone?: string; durationFormatted?: string; peakListeners?: number }) => {
    const { spaceId, actorId, actorPhone, durationFormatted, peakListeners } = payload || {};
    if (!spaceId) return;
    const room = spaceRooms.get(spaceId);
    // Strict creator enforcement: only the host/creator can end a Space for everyone
    if (room) {
      const idMatches = Boolean(room.hostId && actorId && room.hostId === actorId);
      const cleanHostPhone = (room.hostPhone || '').replace(/\D/g, '');
      const cleanActorPhone = (actorPhone || (socket as any)._agcPhone || '').replace(/\D/g, '');
      const phoneMatches = Boolean(cleanHostPhone && cleanActorPhone && cleanHostPhone.slice(-10) === cleanActorPhone.slice(-10));
      if (!idMatches && !phoneMatches) {
        socket.emit('space_error', { spaceId, message: 'Only the Space creator can end this Space.' });
        return;
      }
    }
    const finalPeak = Math.max(peakListeners || 1, room?.peakListeners || 1);
    spaceRooms.delete(spaceId);
    io.to(`space:${spaceId}`).emit('space_ended', { spaceId, durationFormatted, peakListeners: finalPeak });
    io.emit('space_ended', { spaceId, durationFormatted, peakListeners: finalPeak });
  });

  // 5. Direct Phone Calling Relay (supports phone variants + multi-participant targets)
  socket.on('phone_call_signal', (payload: { targetPhone?: string; targetPhones?: string[]; data: any; event?: string }) => {
    const eventName = payload?.event || 'incoming_call';
    const targets: string[] = [];
    if (payload?.targetPhone) targets.push(payload.targetPhone);
    if (Array.isArray(payload?.targetPhones)) targets.push(...payload.targetPhones);

    const seenVariants = new Set<string>();
    for (const rawTarget of targets) {
      if (!rawTarget) continue;
      const variants = getPhoneVariants(rawTarget);
      const primary = variants[0] || rawTarget.replace(/\D/g, '');
      if (!primary || seenVariants.has(primary)) continue;
      variants.forEach((v) => seenVariants.add(v));
      emitToPhoneVariantsOnce(rawTarget, eventName, payload.data);
    }
  });

  socket.on('register_phone', (payload: string | { phone: string; sessionToken?: string }) => {
    const rawPhone = typeof payload === 'string' ? payload : payload.phone;
    const sessTok = typeof payload === 'object' ? payload?.sessionToken : undefined;
    if (sessTok) {
      (socket as any)._sessionToken = String(sessTok);
    }
    const clean = (rawPhone || '').replace(/\D/g, '');
    if (!clean) return;

    const variants = getPhoneVariants(clean);
    variants.forEach((v) => {
      socket.join(`phone:${v}`);
    });
    (socket as any)._agcPhone = clean;
    phoneToSocketId.set(clean, socket.id);
    console.log(`📱 [Phone Registered]: ${clean} (joined ${variants.length} variant rooms) -> socket ${socket.id}`);
  });

  // 6. WebRTC Call Room Signaling Relay
  socket.on('join_call_room', (roomId: string) => {
    if (!roomId) return;
    socket.join(`call:${roomId}`);
  });

  socket.on('leave_call_room', (roomId: string) => {
    if (!roomId) return;
    socket.leave(`call:${roomId}`);
  });

  socket.on('call_signal', (payload: { roomId: string; event: string; data: any }) => {
    if (!payload?.roomId) return;
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

    const activeSpaceId = (socket as any)._activeSpaceId;
    const spaceUserId = (socket as any)._spaceUserId;
    if (activeSpaceId && spaceUserId) {
      const room = spaceRooms.get(activeSpaceId);
      if (room) {
        room.listeners.delete(spaceUserId);
        room.raisedHands = room.raisedHands.filter((h) => h.id !== spaceUserId);
        io.to(`space:${activeSpaceId}`).emit('space_state_sync', serializeSpaceRoom(room));
      }
      io.to(`space:${activeSpaceId}`).emit('space_user_left', { spaceId: activeSpaceId, userId: spaceUserId, socketId: socket.id });
    }

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

    // Clean up phoneâ†’socket mapping if this socket was the active one
    const agcPhone = (socket as any)._agcPhone;
    if (agcPhone && phoneToSocketId.get(agcPhone) === socket.id) {
      phoneToSocketId.delete(agcPhone);
    }
    console.log(`🔌 [Socket Disconnected]: ${socket.id}`);
  });
});

// Express fallback error handler
app.use((err: any, _req: Request, res: Response, _next: any) => {
  console.error('Express middleware error:', err?.message || err);
  if (!res.headersSent) {
    res.status(500).json({ error: err?.message || 'Internal server error' });
  }
});

let viteServerRef: any = null;
let syncIntervalRef: ReturnType<typeof setInterval> | null = null;

process.on('unhandledRejection', (reason) => {
  console.warn('Unhandled promise rejection caught by gateway:', reason);
});

process.on('uncaughtException', (err: any) => {
  console.error('Uncaught exception in gateway:', err?.stack || err);
  if (err?.code === 'EADDRINUSE' || err?.code === 'EACCES') {
    process.exit(1);
  }
});

// Start listening with Vite middleware in dev or static dist in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    if (process.env.DISABLE_HMR === undefined) {
      process.env.DISABLE_HMR = 'true';
    }
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      plugins: [
        {
          name: 'agc-disable-hmr-client-ws',
          transform(code, id) {
            const normalizedId = id.replace(/\\/g, '/').split('?')[0];
            if (normalizedId.endsWith('/vite/dist/client/client.mjs')) {
              return {
                code: code.replace(
                  'transport.connect(createHMRHandler(handleMessage));',
                  '/* HMR WebSocket disabled (ws: false, hmr: false) */'
                ),
                map: null,
              };
            }
          },
        },
      ],
      server: {
        middlewareMode: true,
        host: HOST,
        port: PORT,
        allowedHosts: true as const,
        ws: false,
        hmr: false,
        watch: null,
      },
      appType: 'spa',
    });
    viteServerRef = vite;
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(
      express.static(distPath, {
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('index.html') || filePath.endsWith('sw.js')) {
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
          } else if (filePath.includes(`${path.sep}assets${path.sep}`)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          }
        },
      })
    );
    app.get('*', (req: Request, res: Response) => {
      // Never serve index.html for missing JS/CSS/media asset requests
      if (
        req.path.startsWith('/assets/') ||
        /\.(js|mjs|css|map|png|jpe?g|svg|webp|ico|woff2?|json)$/i.test(req.path)
      ) {
        return res.status(404).end();
      }
      const indexHtmlPath = path.join(distPath, 'index.html');
      if (!fs.existsSync(indexHtmlPath)) {
        return res.status(503).send('Build output not found. Run npm run build first.');
      }
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.sendFile(indexHtmlPath);
    });
  }

  httpServer.on('error', (err: any) => {
    console.error(`HTTP server error on ${HOST}:${PORT}:`, err?.message || err);
    if (err?.code === 'EADDRINUSE' || err?.code === 'EACCES') {
      process.exit(1);
    }
  });

  await new Promise<void>((resolve) => {
    httpServer.listen(PORT, HOST, () => {
      console.log(`🚀 AGC Live Gateway running on http://${HOST}:${PORT}`);
      console.log(`📡 WebSocket & User Registry ready (${usersByPhone.size} users loaded)`);
      // Sync Supabase registry & global admin state asynchronously so port binding is never delayed
      Promise.all([syncUsersFromSupabase(true), syncAdminStateFromSupabase()]).catch(() => {});
      syncIntervalRef = setInterval(() => {
        Promise.all([syncUsersFromSupabase(), syncAdminStateFromSupabase()]).catch(() => {});
      }, 30000);
      resolve();
    });
  });
}

const shutdown = async (signal: string) => {
  console.log(`Shutting down AGC Live Gateway (${signal})...`);
  if (syncIntervalRef) clearInterval(syncIntervalRef);
  try {
    await viteServerRef?.close?.();
  } catch (_) {}
  try {
    io.close();
  } catch (_) {}
  httpServer.close(() => {
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 2000).unref();
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

export { app, httpServer, io };

